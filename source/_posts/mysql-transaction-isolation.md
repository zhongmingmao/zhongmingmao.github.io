---
title: MySQL -- 事务隔离
date: 2019-01-16 22:36:07
categories:
    - MySQL
tags:
    - MySQL
---

## 概念
1. 事务：保证一组数据库操作，要么**全部成功**，要么**全部失败**
2. 在MySQL中，事务支持是在**存储引擎**层实现的
    - MyISAM不支持事务
    - InnoDB支持事务

## 隔离性与隔离级别

<!-- more -->

1. 事务特性：**ACID**（Atomicity、Consistency、Isolation、Durability）
2. 如果多个**事务并发执行**时，就可能会出现**脏读**、**不可重复读**、**幻读**（phantom read）等问题
    - 解决方案：**隔离级别**
    - 隔离级别越高，效率就会越低
3. SQL标准的事务隔离级别
    - **READ-UNCOMMITTED**
        - 一个事务还未提交时，它所做的变更能被别的事务看到
    - **READ-COMMITTED**
        - 一个事务提交之后，它所做的变更才会被其他事务看到
    - **REPEATABLE-READ**
        - 一个事务在执行过程中所看到的数据，总是跟这个事务在启动时看到的数据是一致的
        - 同样，在RR隔离级别下，未提交的变更对其他事务也是不可见的
    - **SERIALIZABLE**
        - 对同一行记录，写会加写锁，读会加读锁，锁级别是**行锁**
        - 当出现读写锁冲突时，后访问的事务必须等前一个事务执行完成，才能继续执行
3. 默认隔离级别
    - Oracle：READ-COMMITTED
    - MySQL：REPEATABLE-READ

```sql
mysql> SHOW VARIABLES LIKE '%isolation%';
+---------------+-----------------+
| Variable_name | Value           |
+---------------+-----------------+
| tx_isolation  | REPEATABLE-READ |
+---------------+-----------------+
```

### 样例
```sql
mysql> create table T(c int) engine=InnoDB;
insert into T(c) values(1);
```
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-isolation-level-example.png" width=350/>

| 隔离级别 | V1 | V2 | V3 | 备注 |
| ---- | ---- | ---- | ---- | ---- |
| READ-UNCOMMITTED | 2 | 2 | 2 | |
| READ-COMMITTED | 1 | 2 | 2 | |
| REPEATABLE-READ | 1 | 1 | 2 | |
| SERIALIZABLE | 1 | 1 | 2 | 事务B在执行『1->2』时被锁住，等事务A提交后才能继续执行 |

### 实现
1. 在实现上，数据库里面会创建一个**视图**（read-view），访问的时候会以视图的逻辑结果为准
2. REPEATABLE-READ的视图是在**事务启动时**创建的，整个事务存在期间都用这个视图
    - 事务启动：begin后的第一个**DML**语句，**begin语句本身不会开启事务**
3. READ-COMMITTED的视图在**每个SQL语句开始执行时**创建的
4. READ-UNCOMMITTED**没有视图概念**，直接返回**记录上的最新值**（**内存**，InnoDB Buffer Pool）
5. SERIALIZABLE则直接用**加锁**（行锁）的方式来避免并行访问

## RR隔离的实现
实际上，每条记录在**更新**的时候都会同时（**在redolog和binlog提交之前**）记录一条**回滚操作**
记录上的最新值，通过回滚操作，都可以得到前一个状态的值

### 多版本
变更记录：1->2->3->4
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-read-view.png" width=500/>
1. 当前值为4，但在查询这条记录的时候，**不同时刻启动的事务会有不同的视图**
2. 在视图A、B和C，这一个记录的值分别是1、2和4
3. 同一条记录在系统中可以存在多个版本，这就是**MVCC**（**多版本并发控制**）
4. 对于视图A，要得到1，必须**将当前值依次执行图中的所有回滚操作**
    - 这会存在一定的**性能开销**
    - 这里的视图是**逻辑视图**，**并不是快照**
    - 这里的视图是InnoDB（**存储引擎层**）的read-view，也不是Server层都VIEW（虚表）
5. 即使此时有另外一个事务正在将4改成5，这个事务跟视图A、B和C所对应的事务并不冲突

### 删除回滚段
1. **当没有事务需要用到这些回滚段时**，回滚段就会被删除
2. 不被事务所需要的回滚段：**比系统中最早视图还要早的回滚段**

### 长事务
1. 长事务意味着系统里面存在**很老的事务视图**
2. 长事务随时可能访问数据库里面的任何数据，在这个事务提交之前，它**可能用到的回滚段都必须保留**
    - 因此这会导致**占用大量的存储空间**
    - <= MySQL5.5，回滚段跟数据字典一起放在**ibdata**文件里，即使长事务最终提交，回滚段被清理，**文件也不会变小**
3. RC隔离级别一般不会导致回滚段过长的问题

```sql
# 查询持续时间超过60s的事务
mysql> select * from information_schema.innodb_trx where TIME_TO_SEC(timediff(now(),trx_started))>60;
```

## 事务的启动方式
1. 启动方式
    - 显式启动事务，**begin(start transaction) + commit/rollback**
    - **set autocommit=0 + commit/rollback**
        - set autocommit=0：关闭自动提交
        - 一些客户端框架会在默认连接成功后执行set autocommit=0，导致**接下来的查询都在事务中**
        - 如果是**长连接**，就会导致**意外的长事务**
2. 推荐方式
    - _**set autocommit=1 + begin(start transaction) + commit/rollback**_
    - set autocommit=1 + begin(start transaction) + (commit and chain)/(rollback and chain)
        - 适用于频繁使用事务的业务
        - 省去再次执行begin语句的开销
        - 从程序开发的角度能够明确地知道每个语句是否处于事务中

## 避免长事务的方案

### 应用开发端
1. 确保**set autocommit=1**，可以通过**general_log**来确认
2. 确认程序中是否有**不必要的只读事务**
3. 业务连接数据库的时候，预估**每个语句执行的最长时间**（**max_execution_time**）

```sql
mysql> SHOW VARIABLES LIKE '%general_log%';
+------------------+-----------------------------------------------+
| Variable_name    | Value                                         |
+------------------+-----------------------------------------------+
| general_log      | OFF                                           |
| general_log_file | /data_db3/mysql/3323/data/ym_DB_12_100071.log |
+------------------+-----------------------------------------------+
```
```sql
# Introduced 5.7.8
# 0 -> disable
mysql> SHOW VARIABLES LIKE '%max_execution_time%';
+--------------------+-------+
| Variable_name      | Value |
+--------------------+-------+
| max_execution_time | 0     |
+--------------------+-------+
```

### 数据库端
1. 监控**information_schema.innodb_trx**，设置长事务阈值，告警或者Kill（工具：pt-kill）
2. 在业务功能的测试阶段要求输出所有的general_log，分析日志行为并提前发现问题

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
