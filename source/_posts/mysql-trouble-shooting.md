---
title: MySQL -- 故障诊断
date: 2019-03-03 15:30:19
categories:
    - MySQL
tags:
    - MySQL
---

## SELECT 1
`SELECT 1`只能说明数据库**进程还在**，但不能说明数据库没有问题
```sql
-- innodb_thread_concurrency表示并发线程数量
mysql> SHOW VARIABLES LIKE '%innodb_thread_concurrency%';
+---------------------------+-------+
| Variable_name             | Value |
+---------------------------+-------+
| innodb_thread_concurrency | 16    |
+---------------------------+-------+
```

<!-- more -->

### 表初始化
```sql
-- innodb_thread_concurrency默认为0，表示不限制并发线程数量，建议设置范围64~128
SET GLOBAL innodb_thread_concurrency=3;

CREATE TABLE `t` (
    `id` INT(11) NOT NULL,
    `c` INT(11) DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB;

INSERT INTO t VALUES (1,1);
```

### 操作序列
| session A | session B | session C | session D |
| ---- | ---- | ---- | ---- |
| SELECT SLEEP(100) FROM t; | SELECT SLEEP(100) FROM t; | SELECT SLEEP(100) FROM t; | |
| | | | SELECT 1;<br/>(Query OK)|
| | | | SELECT * FROM t;<br/>(Blocked)|

并发线程达到**上限**3后，InnoDB在接收新请求时，会进入**等待**状态

### 并发连接 VS 并发查询
1. `SHOW PROCESSLIST`可能会看到几千个连接，指的是**并发连接**；而**当前正在执行**的语句，才是**并发查询**
2. 并发连接达到几千影响并不大，无非就是多占用一些内存，
    - **并发查询**太大才是**CPU杀手**，因此才需要设置`innodb_thread_concurrency`
3. _**在线程进入锁等待后，并发线程的计数将会减一**_
    - 等待**行锁**或**间隙锁**的线程**不属于并发线程**，因为这些线程**不会再消耗CPU**
4. `SELECT SLEEP(100) FROM t`是在真正地执行查询，所以还是要算并发线程

## 查询判断
1. 在系统库（`mysql`）里建一个表，命名为`health_check`，里面只放一行数据，然后**定期查询**
    - `SELECT * FROM mysql.health_check`
    - 可以检测出由于**并发线程过多**而导致数据库不可用的情况
2. 但该方法无法检测**磁盘空间满**的情况
    - 更新事务需要写`binlog`，而一旦`binlog`所在**磁盘的空间占用率**达到率100%
    - 所有的**更新语句**和**事务的commit语句**都会被**阻塞**
    - 但此时系统还是可以**正常地读取数据**的

## 更新判断
1. `UPDATE mysql.health_check SET t_modified=now()`
2. 主库和从库都需要进行**节点的可用性检测**，从库的可用性检测也是需要写`binlog`的
3. 一般会把A和B的主从关系设计为`Master-Master`结构，在从库B上执行的检测命令，也会发回主库A
4. 如果主库A和从库B都使用**相同的更新命令**，可能会出现**行冲突**（无法区分谁更新的），导致**主从同步停止**
    - 为了主从之间的更新不产生冲突，在`mysql.health_check`上存入**多行**数据，`server_id`为主键
    - MySQL规定主库和从库的`server_id`必须**不同**，从而保证主从各自的检测命令不会发生冲突

```sql
CREATE TABLE `health_check` (
    `id` INT(11) NOT NULL,
    `t_modified` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- 检测命令
INSERT INTO mysql.health_check (id, t_modified) VALUES (@@server_id, now()) ON DUPLICATE KEY UPDATE t_modified=now();
```

### 判定慢
1. 所有的检测都需要一个**超时时间N**，执行一个`UPDATE`语句，如果超过N秒后不返回，会认为系统不可用
2. 假设一个日志盘的**IO利用率**已经是100%，整个系统响应非常慢，已经准备做主从切换了
    - IO利用率为100%，表示系统的IO在正常工作，每个请求都是**有机会**得到IO资源的
    - 而检测使用的`UPDATE`命令，需要的资源是很少的
        - 可能在N秒内返回给检测系统，检测系统**误认为**系统是正常的
3. 表现：业务系统上正常的SQL执行很慢，但DBA在HA系统上看到的却是系统处于可用状态
4. 根本原因：都是基于**外部检测**（定时轮询），天然存在**随机性**的问题

## 内部统计

### redolog
```sql
mysql> SELECT * FROM performance_schema.file_summary_by_event_name WHERE EVENT_NAME='wait/io/file/innodb/innodb_log_file'\G;
*************************** 1. row ***************************
               EVENT_NAME: wait/io/file/innodb/innodb_log_file
               COUNT_STAR: 233
           SUM_TIMER_WAIT: 132552328013
           MIN_TIMER_WAIT: 1665048
           AVG_TIMER_WAIT: 568893997
           MAX_TIMER_WAIT: 86702766780
               COUNT_READ: 8
           SUM_TIMER_READ: 87079515796
           MIN_TIMER_READ: 2300200
           AVG_TIMER_READ: 10884939289
           MAX_TIMER_READ: 86702766780
 SUM_NUMBER_OF_BYTES_READ: 70656
              COUNT_WRITE: 114
          SUM_TIMER_WRITE: 8780811305
          MIN_TIMER_WRITE: 10705576
          AVG_TIMER_WRITE: 77024423
          MAX_TIMER_WRITE: 679922054
SUM_NUMBER_OF_BYTES_WRITE: 92160
               COUNT_MISC: 111
           SUM_TIMER_MISC: 36692000912
           MIN_TIMER_MISC: 1665048
           AVG_TIMER_MISC: 330558403
           MAX_TIMER_MISC: 18323439204
```
1. `EVENT_NAME`：统计的类型，这里为`redolog`
2. 第1组：`COUNT_STAR`~`MAX_TIMER_WAIT`，所有IO类型的统计，单位为皮秒，`1 PS = 10^-12 S`
3. 第2组：`COUNT_READ`~`SUM_NUMBER_OF_BYTES_READ`，读操作的统计
    - `SUM_NUMBER_OF_BYTES_READ`：总共从`redolog`读取了多少**字节**
4. 第3组：`COUNT_WRITE`~`SUM_NUMBER_OF_BYTES_WRITE`，写操作的统计
5. 第4组：`COUNT_MISC`~`MAX_TIMER_MISC`，其它类型数据的统计
    - 在`redolog`里，可以理解为对`fsync`的统计

### binlog
```sql
mysql> SELECT * FROM performance_schema.file_summary_by_event_name WHERE EVENT_NAME='wait/io/file/sql/binlog'\G;
*************************** 1. row ***************************
               EVENT_NAME: wait/io/file/sql/binlog
               COUNT_STAR: 27
           SUM_TIMER_WAIT: 3003083244
           MIN_TIMER_WAIT: 0
           AVG_TIMER_WAIT: 111225058
           MAX_TIMER_WAIT: 1100158206
               COUNT_READ: 4
           SUM_TIMER_READ: 1283933427
           MIN_TIMER_READ: 3404667
           AVG_TIMER_READ: 320983264
           MAX_TIMER_READ: 1100158206
 SUM_NUMBER_OF_BYTES_READ: 10248
              COUNT_WRITE: 5
          SUM_TIMER_WRITE: 597349326
          MIN_TIMER_WRITE: 18148578
          AVG_TIMER_WRITE: 119469791
          MAX_TIMER_WRITE: 421662276
SUM_NUMBER_OF_BYTES_WRITE: 896
               COUNT_MISC: 18
           SUM_TIMER_MISC: 1121800491
           MIN_TIMER_MISC: 0
           AVG_TIMER_MISC: 62322064
           MAX_TIMER_MISC: 188882778
```

### 性能损耗
如果打开所有的`performance_schema`，性能大概会下降`10%`左右，建议只打开所需要的项
```sql
UPDATE setup_instruments SET ENABLED='YES', TIMED='YES' WHERE NAME LIKE '%wait/io/file/innodb/innodb_log_file%';
```

### 故障诊断
假设已经开启了`redolog`和`binlog`的统计信息功能，可以通过`MAX_TIMER`来判断数据库是否有问题
```sql
-- 单次IO超过200ms
SELECT EVENT_NAME,MAX_TIMER_WAIT FROM performance_schema.file_summary_by_event_name WHERE EVENT_NAME IN ('wait/io/file/innodb/innodb_log_file','wait/io/file/sql/binlog') AND MAX_TIMER_WAIT>200*1000000000;
```

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
