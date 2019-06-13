---
title: MySQL -- 幻读
date: 2019-02-14 09:39:48
categories:
    - Storage
    - MySQL
tags:
    - Storage
    - MySQL
---

## 表初始化
```sql
CREATE TABLE `t` (
    `id` INT(11) NOT NULL,
    `c` INT(11) DEFAULT NULL,
    `d` INT(11) DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `c` (`c`)
) ENGINE=InnoDB;

INSERT INTO t VALUES (0,0,0),(5,5,5),(10,10,10),(15,15,15),(20,20,20),(25,25,25);
```

<!-- more -->

## 定义与问题

### 定义
1. 幻读：在同一个事务内，前后两次查询**同一范围**的时候，后一次查询看到了前一次查询没有看到的行
    - 幻读专指_**新插入的行**_
2. 在**RR**隔离级别下，**普通查询是快照读**，是看不到其他事务插入的数据的
    - _幻读仅在**当前读**时才会出现_

### 解决思路

#### 只有行锁
假设`SELECT * FROM t WHERE d=5 FOR UPDATE;`只会在`id=5`这一行上加`X Lock`，执行时序如下：

| 时刻 | session A | session B | session C |
| ---- | ---- | ---- | ---- |
| T1 | BEGIN;<br/>SELECT * FROM t WHERE d=5 FOR UPDATE;<br/>result:(5,5,5) | | |
| T2 | | UPDATE t SET d=5 WHERE id=0;<br/>UPDATE t SET c=5 WHERE id=0; | |
| T3 | SELECT * FROM t WHERE d=5 FOR UPDATE;<br/>result:(0,5,5),(5,5,5) | | |
| T4 | | | INSERT INTO t VALUES (1,1,5);<br/>UPDATE t SET c=5 WHERE id=1; |
| T5 | SELECT * FROM t WHERE d=5 FOR UPDATE;<br/>result:(0,5,5),(1,1,5),(5,5,5) | | |
| T6 | COMMIT; | | |

1. `T1`返回`id=5`这1行
2. `T3`返回`id=0`和`id=5`这2行
    - `id=0`不是幻读，因为不是新插入的行
3. `T5`返回`id=0`、`id=1`和`id=5`的这三行
    - `id=1`是**幻读**，因为这是**新插入的行**
    - 显然只有行锁（**RC**）是无法解决幻读问题的

#### 幻读的问题

##### 破坏语义
1. session A在`T1`时刻声明：锁住所有`d=5`的行，不允许其他事务进行读写操作
2. session B在`T2`时刻修改了`id=0,d=5`这一行
3. session C在`T4`时刻修改了`id=1,d=5`这一行

##### 破坏数据一致性

###### 数据

| 时刻 | session A | session B | session C |
| ---- | ---- | ---- | ---- |
| T1 | BEGIN;<br/>SELECT * FROM t WHERE d=5 FOR UPDATE;<br/>UPDATE t SET d=100 WHERE d=5; | | |
| T2 | | UPDATE t SET d=5 WHERE id=0;<br/>UPDATE t SET c=5 WHERE id=0; | |
| T3 | SELECT * FROM t WHERE d=5 FOR UPDATE; | | |
| T4 | | | INSERT INTO t VALUES (1,1,5);<br/>UPDATE t SET c=5 WHERE id=1; |
| T5 | SELECT * FROM t WHERE d=5 FOR UPDATE; | | |
| T6 | COMMIT; | | |

1. `UPDATE`与`SELECT...FOR UPDATE`的加锁语义一致（`X Lock`）
2. `T1`时刻，`id=5`这一行变成了`(5,5,100)`，在`T6`时刻才正式提交
3. `T2`时刻，`id=0`这一行变成了`(0,5,5)`
4. `T4`时刻，新插入了一行`(1,5,5)`

###### binlog
1. T2时刻，session B事务提交，写入两条语句
2. T4时刻，session C事务提交，写入两条语句
3. T6时刻，session A事务提交，写入`UPDATE t SET d=100 WHERE d=5;`

```sql
UPDATE t SET d=5 WHERE id=0; -- (0,0,5)
UPDATE t SET c=5 WHERE id=0; -- (0,5,5)

INSERT INTO t VALUES (1,1,5); -- (1,1,5)
UPDATE t SET c=5 WHERE id=1; -- (1,5,5)

UPDATE t SET d=100 WHERE d=5; -- 所有d=5的行，d改成100
```
1. 该binlog如果在备库上执行，最终结果为`(0,5,100)`，`(1,5,100)`，`(5,5,100)`，`id=0`和`id=1`这两行数据会与主库不一致
2. 原因：`SELECT * FROM t WHERE d=5 FOR UPDATE;`只给`id=5`这一行`X Lock `

#### 加强行锁
增强为：扫描过程中**所有**碰到的行，都加上`X Lock`，执行序列如下

| 时刻 | session A | session B | session C |
| ---- | ---- | ---- | ---- |
| T1 | BEGIN;<br/>SELECT * FROM t WHERE d=5 FOR UPDATE;<br/>UPDATE t SET d=100 WHERE d=5; | | |
| T2 | | UPDATE t SET d=5 WHERE id=0;(blocked)<br/>UPDATE t SET c=5 WHERE id=0; | |
| T3 | SELECT * FROM t WHERE d=5 FOR UPDATE; | | |
| T4 | | | INSERT INTO t VALUES (1,1,5);<br/>UPDATE t SET c=5 WHERE id=1; |
| T5 | SELECT * FROM t WHERE d=5 FOR UPDATE; | | |
| T6 | COMMIT; | | |

1. session A把**所有的行**都加了`X Lock`，因此session B在执行第一个update语句时被锁住了
    - 需要等到`T6`时刻，session A提交之后，session B才能继续执行
2. 对于`id=0`这一行，在数据库中的最终结果还是`(0,5,5)`

**binlog**
```sql
INSERT INTO t VALUES (1,1,5); -- (1,1,5)
UPDATE t SET c=5 WHERE id=1; -- (1,5,5)

UPDATE t SET d=100 WHERE d=5; -- 所有d=5的行，d改成100

UPDATE t SET d=5 WHERE id=0; -- (0,0,5)
UPDATE t SET c=5 WHERE id=0; -- (0,5,5)
```
1. `id=0`这一行的最终结果也是`(0,5,5)`，因此`id=0`这一行的数据是一致的
2. 对于`id=1`这一行数据而言，在数据库端的结果为`(1,5,5)`，而根据binlog的执行结果是`(1,5,100)`，数据不一致
    - 并且依然存在**幻读**
3. 原因：只能给加锁时存在的行加`X Lock`
    - 在`T3`时刻，在给所有的行加`X Lock`时，此时`id=1`这一行还不存在，因此也就加不上`X Lock`了
    - 即使在**所有的记录**都加上了`X Lock`，依旧**阻止不了插入新纪录**

## 解决方案

### Gap Lock
1. 产生幻读的原因：行锁只能锁住行，新插入记录这个动作，要更新的是记录之间的**间隙**
2. 为了解决幻读，InnoDB引入了新的锁：**间隙锁**（**Gap Lock**）

表初始化，插入了6个记录，产生了7个间隙
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-phantom-gap.png" width=500/>

1. `SELECT * FROM t WHERE d=5 FOR UPDATE;`
    - 给已有的6个记录加上`X Lock`，同时还会加上7个`Gap Lock`，这样就确保**无法再插入新纪录**
2. 上锁实体
    - **数据行**
    - **数据行之间的间隙**

### 冲突关系

#### 行锁
行锁的冲突关系（跟行锁有冲突关系的是**另一个行锁**）

| | S Lock | X Lock |
| ---- | ---- | ---- |
| S Lock | 兼容 | 冲突 |
| X Lock | 冲突 | 冲突 |

#### 间隙锁
跟**间隙锁**存在冲突关系的是_**往这个间隙插入一个记录的操作**_，_**间隙锁之间不会相互冲突**_

| session A | session B |
| ---- | ---- |
| BEGIN;<br/>SELECT * FROM t WHERE c=7 LOCK IN SHARE MODE; | |
| | BEGIN;<br/>SELECT * FROM t WHERE c=7 FOR UPDATE; |

1. **session B并不会被阻塞**，因为表t里面并没有`c=7`的记录
    - 因此session A加的是**间隙锁**`(5,10)`，而session B也是在这个间隙加间隙锁
    - 两个session有共同的目标： 保护这个间隙，不允许插入值，但两者之间不冲突

### Next-Key Lock
1. 间隙锁和行锁合称`Next-Key Lock`，每个`Next-Key Lock`都是**左开右闭**区间
2. `SELECT * FROM t WHERE d=5 FOR UPDATE;`形成了7个`Next-Key Lock`，分别是
    - `(-∞,0],(0,5],(5,10],(10,15],(15,20],(20,25],(25,+supremum]`
    - `+supremum`：InnoDB给每一个索引加的一个**不存在的最大值supremum**
3. 约定：`Gap Lock`为**左开右开**区间，`Next-Key Lock`为**左开右闭**区间

#### 可能死锁
```sql
-- 并发执行
-- 死锁并不是大问题，回滚重试即可
BEGIN;
SELECT * FROM t WHERE id=N FOR UPDATE;

-- 如果行不存在
INSERT INTO t VALUES (N,N,N);
-- 如果行存在
UPDATE t SET d=N SET id=N;

COMMIT;
```

| session A | session B |
| --- | ---- |
| BEGIN;<br/>SELECT * FROM t WHERE id=9 FOR UPDATE; | |
| | BEGIN;<br/>SELECT * FROM t WHERE id=9 FOR UPDATE; |
| | INSERT INTO t VALUES (9,9,9);(blocked) |
| INSERT INTO t VALUES (9,9,9);(Deadlock fund) | |

1. session A执行`SELECT * FROM t WHERE id=9 FOR UPDATE;`，`id=9`这一行不存在，会加上**间隙锁**`(5,10)`
2. session B执行`SELECT * FROM t WHERE id=9 FOR UPDATE;`，间隙锁之间不冲突，同样会加上**间隙锁**`(5,10)`
3. session B试图插入一行`(9,9,9)`，被session A的间隙锁阻塞
4. session A试图插入一行`(9,9,9)`，被session B的间隙锁阻塞，两个session相互等待，形成**死锁**
    - InnoDB的**死锁检测**很快就会发现死锁，并让session A的insert语句**报错返回**
5. 解决方案：假如**只有一个唯一索引**，可以用`INSERT ... ON DUPLICATE KEY UPDATE`来替代

### 小结
1. 引入`Gap Lock`，会导致同样的语句**锁住更大的范围**，_**影响并发度**_
2. `Gap Lock`是在**RR**隔离级别下才生效的（在**RC**隔离级别是没有`Gap Lock`的）
3. 解决**数据与日志不一致**的另一个方案：RC + binlog_format=row
    - 如果**RC**（没有`Gap Lock`，锁范围更小）隔离级别够用，业务并不需要可重复读的保证，可以选择RC

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
