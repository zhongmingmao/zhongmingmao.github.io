---
title: MySQL -- 从库并行复制
date: 2019-02-25 23:02:50
categories:
    - MySQL
tags:
    - MySQL
---

## 主从复制
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-master-slave-replication-parallel.png" width=500/>


<!-- more -->

1. 第一个黑色箭头：客户端写入主库，第二个黑色箭头：从库上`sql_thread`执行`relaylog`，前者的并发度大于后者
2. 在主库上，影响并发度的原因是**锁**，InnoDB支持**行锁**，对业务并发度的支持还算比较友好
3. 如果在从库上采用**单线程**（MySQL 5.6之前）更新`DATA`的话，有可能导致从库应用`relaylog`不够快，造成主从延迟

## 多线程模型
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-slave-replication-multi-thread.png" width=500/>

1. `coordinator`就是原来的`sql_thread`，但不会再直接应用`relaylog`后更新`DATA`，只负责**读取`relaylog`**和**分发事务**
2. 真正更新日志的是`worker`线程，数量由参数`slave_parallel_workers`控制

```sql
mysql> SHOW VARIABLES LIKE '%slave_parallel_workers%';
+------------------------+-------+
| Variable_name          | Value |
+------------------------+-------+
| slave_parallel_workers | 4     |
+------------------------+-------+
```

### 分发原则
1. **不能造成更新覆盖**，更新同一行的两个事务，必须被分到同一个`worker`中
2. **同一个事务不能被拆开**，必须放到同一个`worker`中

## 并行复制策略

### MySQL 5.5

#### 按表分发策略
1. 基本思路：如果两个事务更新的是不同的表，那么就可以并行
2. 如果有**跨表的事务**，还是需要将两张表放在一起考虑

##### 具体逻辑
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-slave-parallel-replication-by-table.png" width=500/>

1. 每个`worker`线程对应一个`hash`表，用于保存当前正在这个`worker`的执行队列里的事务所涉及的表
    - `key`为**库名.表名**，`value`是一个数字，表示队列中有多少事务修改这个表
2. 在有事务分配给`worker`时，事务里面涉及到的表会被加到对应的`hash`表中
3. `worker`执行完成后，这个表会从`hash`表中去掉
4. `hash_table_1`表示：现在`worker_1`的**待执行事务队列**中，有4个事务涉及到`db1.t1`，有1个事务涉及到`db2.t2`
5. `hash_table_2`表示：现在`worker_2`的**待执行事务队列**中，有1个事务涉及到`db1.t3`
6. 现在`coordinator`从`relaylog`中读入一个事务`T`，该事务修改的行涉及到`db1.t1`和`db1.t3`
7. 分配流程
    - 事务`T`涉及到修改`db1.t1`，而`worker_1`的队列中有事务在修改`db1.t1`，事务`T`与`worker_1`是冲突的
    - 按照上面的逻辑，事务`T`与`worker_2`也是冲突的
    - 事务`T`与**多于1**个`worker`冲突，`coordinator`线程进入**等待**
    - 每个`worker`继续执行，同时会修改`hash_table`
        - 假设`hash_table_2`里涉及到修改`db1.t3`先执行完，`hash_table_2`会把`db1.t3`去掉
    - `coordinator`发现跟事务`T`冲突的只有`worker_1`，因此直接将事务`T`分配给`worker_1`
    - `coordinator`继续读取下一个`relaylog`，继续分发事务

##### 冲突关系
1. 如果事务与所有`worker`**都不冲突**，`coordinator`线程就会把该事务分发给**最空闲**的`worker`
2. 如果事务跟**多于1个**`worker`冲突，`coordinator`线程就会进入**等待**状态，直到和该事务存在冲突关系的`worker`**只剩下一个**
3. 如果事务只跟**1个**`worker`冲突，`coordinator`线程就会把该事务分发给该`worker`

##### 小结
1. 适用于在**多个表负载均匀**的场景
2. 如果碰到**热点表**，有可能**退化为单线程复制**

#### 按行分发策略
1. 核心思路：如果两个事务没有更新**相同的行**，它们是可以在从库上**并行执行**的
2. 要求：`binlog`必须采用`ROW`格式
3. 事务`T`与`worker`是否**冲突**的判断依据：修改**同一行**
4. 为每个`worker`分配一个`hash`表，`key`为**库名+表名+唯一键的值**

##### 唯一键
```sql
CREATE TABLE `t1` (
  `id` INT(11) NOT NULL,
  `a` INT(11) DEFAULT NULL,
  `b` INT(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `a` (`a`)
) ENGINE=InnoDB;

INSERT INTO t1 VALUES (1,1,1),(2,2,2),(3,3,3),(4,4,4),(5,5,5);
```

| session A | session B |
| ---- | ---- |
| UPDATE t1 SET a=6 WHERE id=1; | |
| | UPDATE t1 SET a=1 WHERE id=2; |

1. 如果两个事务被分发到不同的`worker`，`session B`的事务有可能先执行，报唯一键冲突错误
2. 因此基于按行分发的策略，事务`hash`还需要考虑唯一键，`key`为**库名+表名+索引a的名字+a的值**
3. `coordinator`在执行`UPDATE t SET a=1 WHERE id=2`的`binlog`时，hash表的内容
    - `key=hash_func(db1+t1+"PRIMARY"+2), value=2`
        - `value=2`：修改前后的行id值不变，出现了2次
    - `key=hash_func(db1+t1+"a"+2), value=1`
        - 影响到`a=2`的行
    - `key=hash_func(db1+t1+"a"+1), value=1`
        - 影响到`a=1`的行
4. 相对于按表分发的策略，按行分发的策略在决定线程分发的时候，需要**消耗更多的计算资源**

#### 对比
1. 按表分发或按行分发的约束
    - 能够从`binlog`解析出表名，主键值和唯一索引的值，因此必须采用`ROW`格式的`binlog`
    - 表**必须有主键**，因为**隐含主键**是不会在`binlog`中体现
    - **不能有外键**，因为**级联更新的行**是不会记录在`binlog`中，这样冲突检测是不准确的
2. 按行分发策略的并发度更高
3. 如果操作很多行的大事务，按行分发策略的问题
    - **耗费内存**：如果要删除100W行数据，hash表就要记录100W个记录
    - **耗费CPU**：解析`binlog`，然后计算`hash`值
    - 优化：设置**行数阈值**，当单个事务超过设置的行数阈值，就退化为**单线程**模式，退化过程
        - `coordinator`暂时先`hold`住这个事务
        - 等待**所有**`worker`都**执行完成**，变成了空队列
        - `coordinator`直接执行这个事务
        - 恢复并行模式

### MySQL 5.6
1. MySQL 5.6版本，支持粒度为**按库分发**的并行复制
2. 在决定分发策略的`hash`表里，`key`为**数据库名**
3. 该策略的并行效果，取决于压力模型，如果各个DB的压力均匀，效果会很好
4. 相比于**按表分发**和**按行分发**，该策略的两个优势
    - 构造`hash`值很快，只需要**数据库名**，并且一个实例上DB数不会很多
    - 不要求`binlog`的格式，因为`STATEMENT`格式的`binlog`也很容易拿到**数据库名**
5. 如果主库上只有一个DB或者不同DB的热点不同，也起不到并行的效果

### MariaDB
1. MariaDB的并行复制策略利用了`redolog`的**组提交**（group commit）
    - 能够在**同一组里提交的事务**，一定**不会修改同一行**
    - 在**主库**上可以**并行执行**的事务，在**从库**上也一定可以**并行执行**的
2. 具体做法
    - 在一组里面提交的事务，有一个相同的`commit_id`，下一组就是`commit_id+1`
    - `commit_id`直接写到`binlog`里面
    - 传到**从库**应用的时候，相同`commit_id`的事务可以分发到多个`worker`上执行
    - 这一组全部执行完成后，`coordinator`再去取下一批
3. MariaDB目标：**模拟主库的并发行为**
    - 问题：并没有真正的模拟主库并发度，在主库上，一组事务在`commit`的时候，下一组事务可以同时处于**执行中**的状态

#### 主库并发事务
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-mariadb-master-trx.png" width=500/>

1. 在主库上，在`trx1`、`trx2`和`trx3`提交的时候，`trx4`、`trx5`和`trx6`是在执行
2. 在第一组事务提交完成后，下一组事务很快就会进入`commit`状态

#### 从库并发复制
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-mariadb-slave-trx.png" width=500/>

1. 在从库上，必须等第一组事务**完全执行**完成后，第二组事务才能开始执行，与主库相比，**吞吐量是下降的**
2. 并且很容易**被大事务拖后腿**
    - 假设`trx2`是一个**超大事务**，`trx1`和`trx3`执行完成后，只能等`trx2`完全执行完成，下一组才能开始执行
    - 这段期间，只有一个`worker`线程在工作，是对资源的浪费

### MySQL 5.7
1. `slave_parallel_type=DATABASE`，使用MySQL 5.6的**按库分发**的并行复制策略
2. `slave_parallel_type=LOGICAL_CLOCK`，使用类似MariaDB的策略，但针对**并行度**做了优化

```sql
mysql> SHOW VARIABLES LIKE '%slave_parallel_type%';
+---------------------+----------+
| Variable_name       | Value    |
+---------------------+----------+
| slave_parallel_type | DATABASE |
+---------------------+----------+
```

#### LOGICAL_CLOCK
1. 并不是所有处于**执行状态**的事务都可以并行的
    - 因为里面可能包括由于**锁冲突**而处于**锁等待状态**的事务
    - 如果这些事务在从库上被分配到不同的`worker`，会出现**主从不一致**的情况
2. MariaDB的并行复制策略：所有处于`redolog commit`状态都事务是可以并行的
    - 事务处于`redolog commit`状态，表示已经**通过了锁冲突的检验**了
3. MySQL 5.7的并行复制策略
    - 同时处于`redolog prepare fsync`状态的事务，在从库执行时是可以并行的
    - 处于`redolog prepare fsync`状态和`redolog commit`状态之间的事务，在从库上执行时也是可以并行的
4. `binlog_group_commit_sync_delay`和`binlog_group_commit_sync_no_delay_count`
    - 故意拉长`binlog`从`write`到`fsync`的时间，以此来减少`binlog`的写盘次数
    - 在MySQL 5.7，可以制造更多同时处于`redolog prepare fsync`阶段的事务，增加从库复制的并行度
    - 故意**让主库提交慢些**，**让从库执行快些**

只要达到`redolog prepare fsync`阶段，就已经表示事务已经通过了**锁冲突的检验**了
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-2-phase-commit-opt.png" width=400/>


## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
