---
title: MySQL -- 锁
date: 2019-01-25 18:43:15
categories:
    - MySQL
tags:
    - MySQL
---

## 全局锁
1. 全局锁：对整个**数据库实例**加锁
2. 加**全局读锁**：`FLUSH TABLES WITH READ LOCK`，阻塞其他线程的下列语句
    - **数据更新语句**（增删改）
    - **数据定义语句**（建表、修改表结构）
    - **更新类事务的提交语句**
3. 主动解锁：`UNLOCK TABLES`
3. 典型使用场景：**全库逻辑备份**
    - 把整库每个表都**SELECT**出来，然后存成**文本**
4. 缺点
    - 如果在**主库**上执行**逻辑备份**，备份期间**不能执行更新操作**，导致**业务停摆**
    - 如果在**备库**上执行**逻辑备份**，备份期间从库**不能执行由主库同步过来的binlog**，导致**主从延时**
5. 备份加全局锁的必要性
    - 保证**全局视图**是**逻辑一致**的

<!-- more -->

### mysqldump
1. `--single-transaction`
    - 导数据之前**启动一个事务**，确保拿到_**一致性视图**_
    - 由于**MVCC**的支持，在这个过程中是可以**正常更新数据**的
2. 需要**存储引擎**支持_**RR的事务隔离级别**_
    - MyISAM不支持事务，如果备份过程中有更新，总是能取到最新的数据，破坏了备份的一致性
    - 因此MyISAM只能依赖于`FLUSH TABLES WITH READ LOCK`，不能使用`--single-transaction`
3. 针对**全库逻辑备份**的场景，`--single-transaction`只适用于**所有的表都使用了事务引擎的库**
    - 如果有的表使用了不支持事务的存储引擎，那么只能依赖于`FLUSH TABLES WITH READ LOCK`
    - 这是MyISAM被InnoDB替代的一个重要原因
4. 在逻辑备份时，如果全部库**都使用InnoDB**，建议使用`--single-transaction`参数，对应用更加友好

#### 逻辑备份 + DDL
在**备库**用`--single-transaction`做**逻辑备份**的过程中，由**主库的binlog**传来了一个针对小表`t1`的**DDL**语句

##### 备份关键语句
```
# 备份过程中的关键语句
Q1:SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
Q2:START TRANSACTION WITH CONSISTENT SNAPSHOT;
/* other tables */
Q3:SAVEPOINT sp;
/* 时刻 1 */
Q4:SHOW CREATE TABLE `t1`;
/* 时刻 2 */
Q5:SELECT * FROM `t1`;
/* 时刻 3 */
Q6:ROLLBACK TO SAVEPOINT sp;
/* 时刻 4 */
/* other tables */
```
1. 备份开始时，为了确保**RR**的隔离级别，再设置一次（Q1）
2. 启动事务，用`WITH CONSISTENT SNAPSHOT`确保可以得到一个**一致性视图**（Q2）
3. 设置一个保存点（Q3）
4. `SHOW CREATE TABLE`是为了拿到**表结构**（Q4）
5. `SELECT * FROM`是正式**导数据**（Q5）
6. `ROLLBACK TO SAVEPOINT`的作用是**释放t1的MDL锁**（Q6）

##### DDL到达时刻
1. 时刻1：备份拿到的是**DDL后**的表结构
    - 现象为**无影响**
2. 时刻2：Q5执行时，报异常：`Table definition has changed, please retry transaction`
    - 现象为**mysqldump终止**
3. 在时刻2~时刻3之间（**导数据期间**）：mysqldump占据着t1的**MDL读锁**，因此**binlog会被阻塞**，直到Q6结束
    - 现象为**主从延时**
4. 时刻4：mysqldump释放**MDL读锁**，备份拿到的是**DDL前**的表结构
    - 现象为**无影响**

### readonly
1. `SET GLOBAL READONLY=true`也能让全库进入只读状态，推荐使用`FLUSH TABLES WITH READ LOCK`
2. 在有些系统中，`readonly`的值会被用来做其他逻辑，因此修改`global`变量的方式**影响面会比较大**
3. 异常处理机制不同
    - 执行`FLUSH TABLES WITH READ LOCK`命令后，客户端发生异常，MySQL会**自动释放全局锁**
    - 执行`SET GLOBAL READONLY=true`命令后，客户端发生异常，MySQL会**一直保持readonly状态**

## 表级锁

### 表锁
1. 表锁：`LOCK TABLES ... READ/WRITE`
2. 解锁
    - 主动解锁：`UNLOCK TABLES`
    - 自动解锁：客户端发生异常，断开连接
3. `LOCK TABLES`除了会限制**其他线程**的读写外，也会限制**本线程**接下来的操作
    - 线程A执行`LOCK TABLES t1 READ, t2 WRITE`，在线程A执行`UNLOCK TABLES`之前
    - 其他线程允许的操作：**读t1**
    - 线程A允许的操作：**读t1**，**读写t2**，同样_**不允许写t1**_
4. InnoDB支持**行锁**，所以一般不使用`LOCK TABLES`来进行并发控制

### 元数据锁（MDL）
1. MDL是**隐式使用**的，在**访问一个表**的时候会被**自动加上**
2. MDL的作用：**保证读写的正确性**，从**MySQL 5.5**引入
    - _**防止DDL与DML的并发冲突**_
3. MDL读锁 + MDL写锁
    - 对一个表做**增删改查**操作（**DML**）的时候，加**MDL读锁**
    - 对**表结构**做**变更**操作（**DDL**）的时候，加**MDL写锁**
    - 关系
        - **读锁之间不互斥**：多线程可以并发对同一张表进行增删改查
        - **读写锁之间，写锁之间互斥**：用于保证变更表结构操作的安全性

#### 加字段的问题
<img src='https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-lock-add-column.jpg' width=450/>
1. session A先启动，对表t加上一个**MDL读锁**
2. session B需要的也是**MDL读锁**，不互斥，可以正常执行
3. session C需要的是**MDL写锁**，session A的事务**还未提交**，**持有的MDL读锁还未释放**，session C会被阻塞
4. session D只需要申请**MDL读锁**，但同样会**被session C阻塞**
    - 所有对表的增删改查都需要先**申请MDL读锁**，此时表现为**完全不可读写**
    - 如果该表上的**查询比较频繁**，而且**客户端**恰好有**重试机制**（超时后再起一个session去请求）
        - 那么**数据库的线程**很快就会被**占满**
5. 事务中的**MDL锁**，在**语句开始执行时申请**，但会等到**整个事务提交后再释放**

#### 解决办法
1. 首先要解决**长事务**的影响，因为只要事务不提交，就会一直占用相关的MDL锁
    - `INFORMATION_SCHEMA.INNODB_TRX`中的`trx_started`字段
    - 在做**DDL**变更之前，首先**确认是否长事务在执行**，如果有则先**kill**掉这个长事务
2. 如果需要执行DDL的表是**热点表**，**请求很频繁**，kill长事务未必管用，因为很快就会有新的请求
    - `ALTER TALE`语句设定**等待时间**，就算拿不到**MDL写锁**也不至于**长时间阻塞后面的业务语句**
    - 目前`MariaDB`和`AliSQL`支持该功能

```sql
ALTER TABLE T [WAIT [n]|NO_WAIT] ADD f INT
```

### 关系
1. 线程A在MyISAM表上更新一行数据，那么会加**MDL读锁**和**表的写锁**
2. 线程B在同一个MyISAM表上更新另外一行数据，那么也会加**MDL读锁**和**表的写锁**
    - 线程B加**MDL读锁**成功，但加**表的写锁**失败
    - 表现：线程B被线程A阻塞
3. 引申：如果有多种锁，必须**全部锁不互斥**才能**并行**，只要有一个锁互斥，就得等

## 行锁
1. MySQL的行锁是在**存储引擎层**实现的
2. MyISAM不支持行锁，而InnoDB支持行锁，这是InnoDB替代MyISAM的一个重要原因

### 两阶段锁
id为表t的主键，事务B的update语句会被阻塞，直到事务A执行commit之后，事务B才能继续执行
<img src='https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-innodb-two-phase-commit.jpg' width=450/>
1. 两阶段锁
    - 在InnoDB事务中，行锁是在**需要的时候**加上
    - 但并不是在不需要了就立刻释放，而是要等待**事务结束**后才释放
2. 如果事务需要**锁定多行**，要就把最可能**造成锁冲突**和**影响并发度**的锁尽可能**往后放**

#### 电影票业务
1. 顾客A在电影院B购买电影票，涉及以下操作（同一事务）
    - update：从顾客A的账户余额中扣除电影票价
    - update：给电影院B的账户余额增加电影票价
    - insert：记录一条交易日志
2. 假设此时顾客C也要在电影院B买票的，两个事务冲突的部分就是第2个语句（同一个电影院账户）
    - 所有操作所需要的行锁都是在事务结束的时候才会释放
    - 将第2个语句放在最后，能最大程度地**减少事务之间的锁等待**，**提升并发度**

### 死锁
假设电影院做活动，在活动开始的时候，CPU消耗接近100%，但整个库每秒执行不到100个事务
<img src='https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-innodb-dead-lock.jpg' width=450/>
1. 事务A在等待事务B释放id=2的行锁，事务B在等待事务A释放id=1的行锁，导致**死锁**
2. 当出现死锁后，有2种处理策略
    - **等待**，直至超时（不推荐）
        - **业务有损**：业务会出现大量超时
    - **死锁检测**（推荐）
        - **业务无损**：业务设计不会将死锁当成严重错误，当出现死锁时可采取：_**事务回滚+业务重试**_

#### 等待
1. 由参数`innodb_lock_wait_timeout`控制（MySQL 5.7.15引入）
2. 默认是50s，对于**在线服务**来说是无法接受的
3. 但也**不能设置成很小的值**，因为如果实际上并不是死锁，只是简单的锁等待，会出现很多**误伤**

#### 死锁检测（推荐）    
1. 发现死锁后，**主动回滚锁链条中的某一事务**，让其他事务继续执行
    - 需要设置参数`innodb_deadlock_detect`
2. 触发死锁检测：**要加锁访问的行上有锁**
    - **一致性读不会加锁**
3. 死锁检测并**不需要扫描所有事务**
    - 某个时刻，事务等待状态为：事务B等待事务A，事务D等待事务C
    - 新来事务E，事务E需要等待D，那么只会判断事务CDE是否会形成死锁
4. CPU消耗高
    - 每个新来的线程发现自己**要加锁访问的行上有锁**
        - 会去判断会不会**由于自己的加入而导致死锁**，总体时间复杂度为**`O(N^2)`**
    - 假设有1000个并发线程，最坏情况下死锁检测的操作量级为100W（1000^2）
5. 解决方法
    - 如果业务能确保一定不会出现死锁，可以**临时关闭死锁检测**，但存在一定的风险（超时）
    - 控制并发度，如果并发下降，那么死锁检测的成本就会降低，这需要在**数据库服务端**实现
        - 如果有**中间件**，可以在中间件实现
        - 如果能修改**MySQL源码**，可以在MySQL内部实现
    - 设计上的优化
        - 将一行改成**逻辑上的多行**来**减少锁冲突**

```sql
mysql> SHOW VARIABLES LIKE '%innodb_deadlock_detect%';
+------------------------+-------+
| Variable_name          | Value |
+------------------------+-------+
| innodb_deadlock_detect | ON    |
+------------------------+-------+

mysql> SHOW VARIABLES LIKE '%innodb_lock_wait_timeout%';
+--------------------------+-------+
| Variable_name            | Value |
+--------------------------+-------+
| innodb_lock_wait_timeout | 30    |
+--------------------------+-------+
```

### 更新无锁引字段
```sql
# name字段没有索引
UPDATE t SET t.name='abc' WHERE t.name='cde'
```
InnoDB内部会根据**聚簇索引**，_**逐行扫描，逐行加锁，事务提交后统一释放锁**_

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
