---
title: MySQL -- RR隔离与RC隔离
date: 2019-01-28 09:35:04
categories:
    - MySQL
tags:
    - MySQL
---

## 视图
1. **虚拟表** -- 本文不关心
    - 在调用的时候执行**查询语句**并生成执行结果
    - SQL语句：`CREATE VIEW`
2. InnoDB在实现**MVCC**时用到的**一致性读视图**（consistent read view）
    - 用于支持**RC**和**RR**隔离级别的实现
    - **没有对应的物理结构**
    - 主要作用：在事务执行期间，事务能看到怎样的数据

<!-- more -->

## 快照
1. 在**RR**隔离级别下，事务在启动的时候保存了一个**快照**，快照是基于**整库**的
2. 在InnoDB，每个事务都有一个**唯一的事务ID**（**transaction id**）
    - 在**事务开始**的时候向InnoDB的**事务系统**申请的，**按申请的顺序严格递增**
3. 每行数据都有**多个版本**，每次事务**更新数据**的时候，都会生成一个**新的数据版本**
    - 事务会把自己的**transaction id**赋值给这个数据版本的事务ID，记为`row trx_id`
        - **每个数据版本都有对应的row trx_id**
    - 同时也要**逻辑保留**旧的数据版本，通过新的数据版本和`undolog`可以**计算**出旧的数据版本

### 多版本
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-innodb-row-multi-version.png" width=500/>
1. 虚线框是同一行记录的4个版本
2. 当前最新版本为V4，k=22，是被`transaction id`为25的事务所更新的，因此它的`row trx_id`为25
3. 虚线箭头就是`undolog`，而V1、V2和V3并**不是物理真实存在**的
    - 每次需要的时候根据**当前最新版本**与`undolog`计算出来的
    - 例如当需要V2时，就通过V4依次执行U3和U2算出来的

### 创建快照
1. RR的定义：在事务启动时，能够看到**所有已经提交的事务结果**
    - 在该事务后续的执行过程中，其他事务的更新对该事务是不可见的
    - 在事务启动时，事务**只认可在该事务启动之前提交的数据版本**
2. 在实现上，InnoDB会为每个事务构造一个**视图数组**，用来保存在这个事务启动的瞬间，所有处于**活跃状态**的事务ID
    - 活跃的定义：**启动了但尚未提交**
3. 低水位与高水位
    - **低水位**：视图数组里面**最小的事务ID**
    - **高水位**：当前系统中**已经创建过最大事务ID+1**，一般就是当前事务的`transaction id`
4. 当前事务的**一致性读视图**的组成部分：**视图数组**和**高水位**
5. 获取事务的视图数组和高水位在**事务系统的锁保护**下进行，可以认为是**原子**操作，期间**不能创建事务**
6. InnoDB利用了数据的**Multi-Version**的特性，实现**快照的秒级创建**
    - **快照 = 一致性读视图 = 视图数组+高水位**

## 事务启动
1. `BEGIN/START TRANSACTION`：事务**并未立马启动**，在执行到后续的第一个**一致性读**语句，事务才真正开始
2. `START TRANSACTION WITH CONSISTENT SNAPSHOT;`：事务**立马启动**

## 样例分析

### 表初始化
```sql
# 建表
CREATE TABLE `t` (
    `id` INT(11) NOT NULL,
    `k` INT(11) DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB;

# 表初始化
INSERT INTO t (id, k) VALUES (1,1), (2,2);
```

### 样例1

#### 事务执行流程
事务ABC的执行流程（**autocommit=1**）

| 事务A | 事务B | 事务C |
| ---- | ---- | ---- |
| START TRANSACTION WITH CONSISTENT SNAPSHOT; | | |
| | START TRANSACTION WITH CONSISTENT SNAPSHOT; | |
| | | UPDATE t SET k=k+1 WHERE id=1; |
| | UPDATE t SET k=k+1 WHERE id=1; | |
| | SELECT k FROM t WHERE id=1; | |
| SELECT k FROM t WHERE id=1; | | |
| COMMIT; | | |
| | COMMIT; | |

#### 事务A的查询

##### 假设
1. 事务A开始前，系统里只有一个活跃事务ID是99
2. 事务ABC的事务ID分别是100，101和102，且当前系统只有这4个事务
3. 事务ABC开始前，`(1,1)`这一行数据的`row trx_id`是90
4. 视图数组
    - 事务A：`[99,100]`
    - 事务B：`[99,100,101]`
    - 事务C：`[99,100,101,102]`
5. 低水位与高水位
    - 事务A：`99`和`100`
    - 事务B：`99`和`101`
    - 事务C：`99`和`102`

##### 查询逻辑
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-innodb-trx-session-a.png" width=500/>
1. 第一个有效更新是事务C，采用**当前读**，读取当前最新版本`(1,1)`，改成`(1,2)`
    - 此时最新版本的`row trx_id`为102，90那个版本成为历史版本
    - 由于**autocommit=1**，事务C在执行完更新后会立马**释放**id=1的**行锁**
2. 第二个有效更新是事务B，采用**当前读**，读取当前最新版本`(1,2)`，改成`(1,3)`
    - 此时最新版本的`row trx_id`为101，102那个版本成为历史版本
3. 事务A查询时，由于事务B还未提交，当前最新版本为`(1,3)`，对事务A是不可见的，否则就了**脏读**了，读取过程如下
    - 事务A的视图数组为`[99,100]`，读数据都是从**当前最新版本**开始读
    - 首先找到当前最新版本`(1,3)`，判断`row trx_id`为101，比事务A的视图数组的高水位（100）大，**不可见**
    - 接着寻找**上一历史版本**，判断`row trx_id`为102，同样比事务A的视图数组的高水位（100）大，**不可见**
    - 再往前寻找，找到版本`(1,1)`，判断`row trx_id`为90，比事务A的视图数组的低水位（99）小，**可见**
    - 所以事务A的查询结果为1
4. **一致性读**：事务A不论在什么时候查询，看到的数据都是**一致**的，哪怕同一行数据同时会被其他事务更新

##### 时间视角
1. 一个**数据版本**，对于一个**事务视图**来说，除了该事务本身的更新总是可见以外，还有下面3种情况
    - 如果版本对应的事务未提交，不可见
    - 如果版本对应的事务已提交，但是是在视图创建之后提交的，不可见
    - **如果版本对应的事务已提交，并且是在视图创建之前提交的，可见**
2. 归纳：_**一个事务只承认自身更新的数据版本以及视图创建之前已经提交的数据版本**_
3. 应用规则进行分析
    - 事务A的**一致性读视图**是在事务A启动时生成的，在事务A查询时
    - 此时`(1,3)`的数据版本尚未提交，不可见
    - 此时`(1,2)`的数据版本虽然提交了，但是是在事务A的**一致性读视图**创建之后提交的，不可见
    - 此时`(1,1)`的数据版本是在事务A的**一致性读视图**创建之前提交的，可见

#### 更新逻辑
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-innodb-trx-session-b.png" width=500/>
1. 如果在事务B执行更新之前查询一次，采用的是**一致性读**，查询结果也为1
2. 如果事务B要执行更新操作，是**不能在历史版本上更新**
    - 否则事务C的更新就会**丢失**，或者需要采取分支策略来兼容（增加复杂度）
3. 因此更新数据需要先进行**当前读**（current read），再写入数据
    - _**当前读：总是读取已经提交的最新版本**_
    - **当前读伴随着加锁**（更新操作为**X Lock模式的当前读**）
    - 如果当前事务在执行当前读时，其他事务在这之前已经执行了更新操作，但尚未提交（**持有行锁**），当前事务被阻塞
4. 事务B的`SET k=k+1`操作是在最新版`(1,2)`上进行的，更新后生成新的数据版本`(1,3)`，对应的`row trx_id`为101
5. 事务B在进行后续的查询时，发现最新的数据版本为`101`，与自己的版本号**一致**，认可该数据版本，查询结果为3

#### 当前读
```sql
# 查询语句
## 读锁（S锁，共享锁）
SELECT k FROM t WHERE id=1 LOCK IN SHARE MODE;
## 写锁（X锁，排他锁）
SELECT k FROM t WHERE id=1 FOR UPDATE;

# 更新语句，首先采用（X锁的）当前读
```

### 样例2

#### 事务执行流程
事务ABC'的执行流程

| 事务A | 事务B | 事务C' |
| ---- | ---- | ---- |
| START TRANSACTION WITH CONSISTENT SNAPSHOT; | | |
| | START TRANSACTION WITH CONSISTENT SNAPSHOT; | |
| | | START TRANSACTION WITH CONSISTENT SNAPSHOT; |
| | | UPDATE t SET k=k+1 WHERE id=1; |
| | UPDATE t SET k=k+1 WHERE id=1; | |
| | SELECT k FROM t WHERE id=1; | |
| | | COMMIT; |
| SELECT k FROM t WHERE id=1; | | |
| COMMIT; | | |
| | COMMIT; | |

<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-innodb-trx-session-b-lock-wait.png" width=500/>

1. 事务C'没有自动提交，依然持有当前最新版本版本`(1,2)`上的**写锁**（X Lock）
2. 事务B执行更新语句，采用的是**当前读**（X Lock模式），会被阻塞，必须等事务C'释放这把写锁后，才能继续执行

### 样例3
```sql
# 建表
CREATE TABLE `t` (
    `id` INT(11) NOT NULL,
    `c` INT(11) DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB;

# 表初始化
INSERT INTO t (id, c) VALUES (1,1),(2,2),(3,3),(4,4);
```

#### 事务执行顺序1
| session A | session B |
| ---- | ---- |
| BEGIN; | |
| SELECT * FROM T; | |
| | UPDATE t SET c=c+1 |
| UPDATE t SET c=0 WHERE id=c; | |
| SELECT * FROM T; | |

#### 事务执行顺序2
| session A | session B' |
| ---- | ---- |
| | BEGIN; |
| | SELECT * FROM T; |
| BEGIN; | |
| SELECT * FROM T; | |
| | UPDATE t SET c=c+1; |
| | COMMIT; |
| UPDATE t SET c=0 WHERE id=c; | |
| SELECT * FROM T; | |

#### session A视角
```sql
mysql> BEGIN;
Query OK, 0 rows affected (0.00 sec)

mysql> SELECT * FROM t;
+----+------+
| id | c    |
+----+------+
|  1 |    1 |
|  2 |    2 |
|  3 |    3 |
|  4 |    4 |
+----+------+
4 rows in set (0.00 sec)

mysql> UPDATE t SET c=0 WHERE id=c;
Query OK, 0 rows affected (0.01 sec)
Rows matched: 0  Changed: 0  Warnings: 0

# 没有修改成功，因为update时采用当前读，基于最新的数据版本（已被其他事务修改并提交）
mysql> SELECT * FROM t;
+----+------+
| id | c    |
+----+------+
|  1 |    1 |
|  2 |    2 |
|  3 |    3 |
|  4 |    4 |
+----+------+
4 rows in set (0.00 sec)
```

## RR与RC

### RR
1. RR的实现核心为**一致性读**（consistent read）
2. 事务更新数据的时候，只能用**当前读**（current read）
3. 如果当前的记录的行锁被其他事务占用的话，就需要进入**锁等待**
4. 在RR隔离级别下，只需要在事务**启动**时创建一致性读视图，之后事务里的其他查询都共用这个一致性读视图
5. 对于RR，查询只承认**事务启动前**就已经提交的数据
6. **表结构不支持RR，只支持当前读**
    - 因为表结构没有对应的行数据，也没有row trx_id

### RC
1. 在RC隔离级别下，每个**语句执行前**都会**重新计算**出一个新的一致性读视图
2. 在RC隔离级别下，再来考虑样例1，事务A与事务B的查询语句的结果
3. `START TRANSACTION WITH CONSISTENT SNAPSHOT`的原意：创建一个**持续整个事务**的**一致性视图**
    - 在RC隔离级别下，一致性读视图会被**重新计算**，等同于普通的`START TRANSACTION`
4. 事务A的查询语句的一致性读视图是在执行这个语句时才创建的
    - 数据版本`(1,3)`未提交，不可见
    - 数据版本`(1,2)`提交了，并且在事务A**当前的一致性读视图**创建之前提交的，**可见**
    - 因此事务A的查询结果为2
5. 事务B的查询结果为3
6. 对于RC，查询只承认**语句启动前**就已经提交的数据

<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-innodb-trx-rc.png" width=500/>

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
