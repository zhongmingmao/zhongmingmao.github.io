---
title: MySQL -- 自增ID耗尽
date: 2019-03-19 23:23:29
categories:
    - Storage
    - MySQL
tags:
    - Storage
    - MySQL
---

## 显示定义ID
表定义的自增值ID达到上限后，在申请下一个ID时，得到的值保持不变
```sql
-- (2^32-1) = 4,294,967,295
-- 建议使用 BIGINT UNSIGNED
CREATE TABLE t (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY) AUTO_INCREMENT=4294967295;
INSERT INTO t VALUES (null);

-- AUTO_INCREMENT没有改变
mysql> SHOW CREATE TABLE t;
+-------+------------------------------------------------------+
| Table | Create Table                                         |
+-------+------------------------------------------------------+
| t     | CREATE TABLE `t` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4294967295 DEFAULT CHARSET=utf8 |
+-------+------------------------------------------------------+

mysql> INSERT INTO t VALUES (null);
ERROR 1062 (23000): Duplicate entry '4294967295' for key 'PRIMARY'
```

<!-- more -->

## InnoDB row_id
1. 如果创建的InnoDB表没有指定主键，那么InnoDB会创建一个不可见的，长度为**6 Bytes**的`row_id`
2. InnoDB维护一个全局的`dict_sys.row_id`值，**所有无主键的InnoDB表**，每插入一行数据
    - 都将当前的`dict_sys.row_id`值作为要插入数据的`row_id`，然后把`dict_sys.row_id`的值+1
3. 代码实现上，row_id是一个`8 Bytes`的`BIGINT UNSIGNED`
    - 但InnoDB设计时，给`row_id`只保留了`6 Bytes`的空间，写到数据表时只会存放最后的`6 Bytes`
    - `row_id`的取值范围：`0 ~ 2^48-1`
    - 达到上限后，下一个值就是0
4. 在InnoDB里面，申请到`row_id=N`后，就将这行数据写入表中
    - 如果表中已经有`row_id=N`的行，新写入的行就会**覆盖**原有的行
5. 推荐**显示创建**自增主键
    - 表自增ID达到上限后，再插入数据时会报**主键冲突**的错误，影响的是_**可用性**_
    - 而覆盖数据，意味着**数据丢失**，影响的是_**可靠性**_
    - 一般来说，_**可靠性优于可用性**_

## XID
1. `redolog`和`binlog`相配合的时候，有一个共同的字段`XID`，_**对应一个事务**_
2. 生成逻辑
    - MySQL内部维护一个全局变量`global_query_id`
    - 每次执行语句的时候将`global_query_id`赋值给`Query_id`，然后`global_query_id`+1
    - 如果当前语句是这个**事务执行的第一条语句**，把`Query_id`赋值给这个事务的`XID`
3. `global_query_id`是一个**纯内存变量**，**重启之后清零**
    - 因此，在同一个数据库实例中，**不同事务的`XID`也有可能是相同的**
    - MySQL**重启**之后，会**重新生成新的`binlog`**
        - 保证：_**同一个binlog文件里，XID是唯一的**_
    - `global_query_id`达到上限后，就会继续从**0**开始计数
        - 因此**理论**上，同一个`binlog`还是会出现相同的`XID`，只是**概率极低**
4. `global_query_id`是`8 Bytes`，上限为`2^64-1`
    - 执行一个事务，假设`XID`是A
    - 接下来执行`2^64`次查询语句，让`global_query_id`回到A
    - 再启动一个事务，这个事务的`XID`也是A

## InnoDB trx_id
1. `XID`是由**Server层**维护的
2. InnoDB内部使用的是`trx_id`，为的是能够在**InnoDB事务**和**Server层**之间做关联
3. InnoDB内部维护一个`max_trx_id`的**全局变量**
    - 每次需要申请一个新的`trx_id`，就获得`max_trx_id`的当前值，然后`max_trx_id`+1
4. InnoDB**数据可见性**的核心思想
    - 每一行数据都记录了更新它的`trx_id`
    - 当一个事务读到一行数据的时候，判断数据可见性的方法
        - 事务的**一致性视图**和这行数据的`trx_id`做对比
5. 对于正在执行的事务，可以通过`information_schema.innodb_trx`看到事务的`trx_id`

### 操作序列
| 时刻 | session A | session B |
| ---- | ---- | ---- |
| T1 | BEGIN;<br/>SELECT * FROM t LIMIT 1; | |
| T2 | | USE information_schema;<br/>SELECT trx_id,trx_mysql_thread_id FROM innodb_trx; |
| T3 | INSERT INTO t VALUES (null); | |
| T4 | | SELECT trx_id,trx_mysql_thread_id FROM innodb_trx; |

```sql
-- T2时刻
mysql> SELECT trx_id,trx_mysql_thread_id FROM innodb_trx;
+-----------------+---------------------+
| trx_id          | trx_mysql_thread_id |
+-----------------+---------------------+
| 281479812572992 |                  30 |
+-----------------+---------------------+

-- T4时刻
mysql> SELECT trx_id,trx_mysql_thread_id FROM innodb_trx;
+-----------------+---------------------+
| trx_id          | trx_mysql_thread_id |
+-----------------+---------------------+
| 7417540         |                  30 |
+-----------------+---------------------+

mysql> SHOW PROCESSLIST;
+----+-----------------+-----------+--------------------+---------+--------+------------------------+------------------+
| Id | User            | Host      | db                 | Command | Time   | State                  | Info             |
+----+-----------------+-----------+--------------------+---------+--------+------------------------+------------------+
|  4 | event_scheduler | localhost | NULL               | Daemon  | 344051 | Waiting on empty queue | NULL             |
| 30 | root            | localhost | test               | Sleep   |    274 |                        | NULL             |
| 31 | root            | localhost | information_schema | Query   |      0 | starting               | SHOW PROCESSLIST |
+----+-----------------+-----------+--------------------+---------+--------+------------------------+------------------+
```
1. `trx_mysql_thread_id=30`就是线程ID，即session A所在的线程
2. T1时刻，`trx_id`的值其实为**0**，而很大的值只是为了**显示**用的（区别于普通的读写事务）
3. T2时刻，`trx_id`是一个很大的数字，因为在T1时刻，session A并未涉及更新操作，是一个**只读事务**
    - 对于**只读事务**，InnoDB**不会分配`trx_id`**
4. session A在T3时刻执行`INSERT`语句时，InnoDB才**真正分配`trx_id`**

#### 只读事务
1. 在上面的T2时刻，很大的`trx_id`是由系统**临时计算**出来的
    - 把**当前事务的`trx`变量的指针地址转成整数**，再加上`2^48`
2. 同一个只读事务在执行期间，它的指针地址是不会变的
    - 不论是在`innodb_trx`还是`innodb_locks`表里，同一个只读事务查出来的`trx_id`都是一样的
3. 如果有多个**并行**的只读事务，每个事务的trx变量的指针地址肯定是不同的
    - 不同的并发只读事务，查出来的trx_id是不同的
4. 加上`2^48`的目的：保证只读事务显示的`trx_id`值比较大，用于**区别普通的读写事务**
5. `trx_id`与`row_id`的逻辑类似，定义长度为`8 Bytes`
    - 在理论上，可能会出现一个**读写事务**与一个**只读事务**显示的**trx_id相同**的情况
    - 但**概率极低**，并且没有什么实质危害
6. 只读事务不分配`trx_id`的好处
    - 可以减少**事务视图里面活跃数组的大小**
        - 当前正在运行的**只读事务**，是**不影响数据的可见性判断**
        - 因此，在创建事务的一致性视图时，只需要拷贝**读写事务**的`trx_id`
    - 可以减少`trx_id`的申请次数
        - 在InnoDB里，即使只执行一条普通的`SELECT`语句，在执行过程中，也要对应一个**只读事务**
        - 如果普通查询语句不申请`trx_id`，就可以**大大减少并发事务申请`trx_id`的锁冲突**
        - 由于只读事务不分配`trx_id`，`trx_id`的增加速度会**变慢**
7. `max_trx_id`会**持久化存储**，重启不会重置为0，只有到达`2^48-1`的上限后，才会重置为0

## thread_id
1. `SHOW PROCESSLIST`的第一列就是`thread_id`
2. 系统保存了一个环境变量`thread_id_counter`
    - **每新建一个连接**，就将`thread_id_counter`赋值给这个新连接的线程变量
3. `thread_id_counter`定义为`4 Bytes`，因此达到`2^32-1`后就会重置为0
    - 但不会在`SHOW PROCESSLIST`里面看到两个**相同的thread_id**
    - 因为MySQL设计了一个**唯一数组**的逻辑，给新线程分配thread_id，逻辑代码如下

```cpp
do {
    new_id= thread_id_counter++;
} while (!thread_ids.insert_unique(new_id).second);
```

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
