---
title: MySQL -- 问题排查
date: 2019-02-13 14:02:09
categories:
    - MySQL
tags:
    - MySQL
---

## 表初始化
```sql
CREATE TABLE `t` (
    `id` INT(11) NOT NULL,
    `c` INT(11) DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB;

DELIMITER ;;
CREATE PROCEDURE idata()
BEGIN
    DECLARE i INT;
    SET i=1;
    WHILE (i<=100000) DO
        INSERT INTO t VALUES (i,i);
        SET i=i+1;
    END WHILE;
END;;
DELIMITER ;

CALL idata();
```

<!-- more -->

## 查询长时间等待
大概率是表`t`被锁住了，通过`SHOW PROCESSLIST;`查看语句处于什么状态
```sql
SELECT * FROM t WHERE id=1;
```

### 等MDL

#### 执行时序
| session A | session B |
| ---- | ---- |
| LOCK TABLE t WRITE; | |
| | SELECT * FROM t WHERE id=1; |

1. session A通过`LOCK TABLE`命令持有表`t`的**MDL写锁**
2. session B执行DML，需要先持有表`t`的**MDL读锁**，从而进入阻塞状态

#### 语句状态
session B的线程ID为33，状态为等待MDL：`Waiting for table metadata lock`
```sql
mysql> SHOW PROCESSLIST;
+----+-----------------+-----------+------+---------+-------+---------------------------------+----------------------------+
| Id | User            | Host      | db   | Command | Time  | State                           | Info                       |
+----+-----------------+-----------+------+---------+-------+---------------------------------+----------------------------+
|  4 | event_scheduler | localhost | NULL | Daemon  | 21668 | Waiting on empty queue          | NULL                       |
| 30 | root            | localhost | test | Query   |    33 | Waiting for table metadata lock | SELECT * FROM t WHERE id=1 |
| 31 | root            | localhost | test | Sleep   |    41 |                                 | NULL                       |
| 33 | root            | localhost | NULL | Query   |     0 | starting                        | SHOW PROCESSLIST           |
+----+-----------------+-----------+------+---------+-------+---------------------------------+----------------------------+

-- 设置成`ON`，会有10%左右的性能损失
mysql> SHOW VARIABLES LIKE 'performance_schema';
+--------------------+-------+
| Variable_name      | Value |
+--------------------+-------+
| performance_schema | ON    |
+--------------------+-------+
```

#### 锁信息
`blocking_pid=31`阻塞`waiting_pid=30`，应该采用`KILL 31`
```sql
mysql> SELECT * FROM sys.schema_table_lock_waits\G;
*************************** 1. row ***************************
               object_schema: test
                 object_name: t
           waiting_thread_id: 69
                 waiting_pid: 30
             waiting_account: root@localhost
           waiting_lock_type: SHARED_READ
       waiting_lock_duration: TRANSACTION
               waiting_query: SELECT * FROM t WHERE id=1
          waiting_query_secs: 404
 waiting_query_rows_affected: 0
 waiting_query_rows_examined: 0
          blocking_thread_id: 70
                blocking_pid: 31
            blocking_account: root@localhost
          blocking_lock_type: SHARED_NO_READ_WRITE
      blocking_lock_duration: TRANSACTION
     sql_kill_blocking_query: KILL QUERY 31
sql_kill_blocking_connection: KILL 31
```

### 等flush

#### flush tables
```sql
-- Closes all open tables, forces all tables in use to be closed, and flushes the prepared statement cache.
FLUSH TABLES t WITH READ LOCK;
FLUSH TABLES WITH READ LOCK;
```

#### 执行时序
| 时刻 | session A | session B | session C | session D |
| ---- | ---- | ---- | ---- |
| T1 | SELECT SLEEP(1) FROM t; | | | |
| T2 | | | | SHOW PROCESSLIST; |
| T3 | | FLUSH TABLES t; | | |
| T4 | | | | SHOW PROCESSLIST; |
| T5 | | | SELECT * FROM t WEHERE id=1; | |
| T6 | | | | SHOW PROCESSLIST; |

1. session A：执行10W秒，在这期间表`t`会被session A**一直打开**
2. session B：需要等待session A的查询结束后才能执行flush命令，被阻塞
3. session C：在session B中的flush命令还未执行完成时发起查询操作，会**被flush命令阻塞**

#### 语句状态
```sql
-- T2时刻
mysql> SHOW PROCESSLIST;
+----+-----------------+-----------+------+---------+-------+------------------------+------------------------+
| Id | User            | Host      | db   | Command | Time  | State                  | Info                   |
+----+-----------------+-----------+------+---------+-------+------------------------+------------------------+
|  4 | event_scheduler | localhost | NULL | Daemon  | 26199 | Waiting on empty queue | NULL                   |
| 30 | root            | localhost | test | Sleep   |   434 |                        | NULL                   |
| 33 | root            | localhost | test | Sleep   |   430 |                        | NULL                   |
| 34 | root            | localhost | test | Query   |     6 | User sleep             | SELECT SLEEP(1) FROM t |
| 35 | root            | localhost | test | Query   |     0 | starting               | SHOW PROCESSLIST       |
+----+-----------------+-----------+------+---------+-------+------------------------+------------------------+

-- T4时刻
mysql> SHOW PROCESSLIST;
+----+-----------------+-----------+------+---------+-------+-------------------------+------------------------+
| Id | User            | Host      | db   | Command | Time  | State                   | Info                   |
+----+-----------------+-----------+------+---------+-------+-------------------------+------------------------+
|  4 | event_scheduler | localhost | NULL | Daemon  | 26210 | Waiting on empty queue  | NULL                   |
| 30 | root            | localhost | test | Query   |     3 | Waiting for table flush | FLUSH TABLES t         |
| 33 | root            | localhost | test | Sleep   |   441 |                         | NULL                   |
| 34 | root            | localhost | test | Query   |    17 | User sleep              | SELECT SLEEP(1) FROM t |
| 35 | root            | localhost | test | Query   |     0 | starting                | SHOW PROCESSLIST       |
+----+-----------------+-----------+------+---------+-------+-------------------------+------------------------+

-- T6时刻
mysql> SHOW PROCESSLIST;
+----+-----------------+-----------+------+---------+-------+-------------------------+----------------------------+
| Id | User            | Host      | db   | Command | Time  | State                   | Info                       |
+----+-----------------+-----------+------+---------+-------+-------------------------+----------------------------+
|  4 | event_scheduler | localhost | NULL | Daemon  | 26232 | Waiting on empty queue  | NULL                       |
| 30 | root            | localhost | test | Query   |    25 | Waiting for table flush | FLUSH TABLES t             |
| 33 | root            | localhost | test | Query   |     3 | Waiting for table flush | SELECT * FROM t WHERE id=1 |
| 34 | root            | localhost | test | Query   |    39 | User sleep              | SELECT SLEEP(1) FROM t     |
| 35 | root            | localhost | test | Query   |     0 | starting                | SHOW PROCESSLIST           |
+----+-----------------+-----------+------+---------+-------+-------------------------+----------------------------+
```

### 等行锁

#### 执行时序
session A持有`id=1`这行记录的**X Lock**，session B尝试获取`id=1`这行记录的**S Lock**，被**阻塞**

| session A | session B |
| ---- | ---- |
| BEGIN; | |
| UPDATE t SET c=c+1 WHERE id=1; | |
| | SELECT * FROM t WHERE id=1 LOCK IN SHARE MODE; |

#### 语句状态
```sql
mysql> SHOW PROCESSLIST;
+----+-----------------+-----------+------+---------+-------+------------------------+-----------------------------------------------+
| Id | User            | Host      | db   | Command | Time  | State                  | Info                                          |
+----+-----------------+-----------+------+---------+-------+------------------------+-----------------------------------------------+
|  4 | event_scheduler | localhost | NULL | Daemon  | 26456 | Waiting on empty queue | NULL                                          |
| 30 | root            | localhost | test | Query   |     7 | statistics             | SELECT * FROM t WHERE id=1 LOCK IN SHARE MODE |
| 33 | root            | localhost | test | Sleep   |   227 |                        | NULL                                          |
| 34 | root            | localhost | test | Sleep   |    14 |                        | NULL                                          |
| 35 | root            | localhost | test | Query   |     0 | starting               | SHOW PROCESSLIST                              |
+----+-----------------+-----------+------+---------+-------+------------------------+-----------------------------------------------+
```

#### 锁信息
```sql
mysql> SELECT * FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`'\G;
*************************** 1. row ***************************
                wait_started: 2019-02-13 20:52:55
                    wait_age: 00:00:18
               wait_age_secs: 18
                locked_table: `test`.`t`
         locked_table_schema: test
           locked_table_name: t
      locked_table_partition: NULL
   locked_table_subpartition: NULL
                locked_index: PRIMARY
                 locked_type: RECORD
              waiting_trx_id: 281479630179024
         waiting_trx_started: 2019-02-13 20:52:55
             waiting_trx_age: 00:00:18
     waiting_trx_rows_locked: 1
   waiting_trx_rows_modified: 0
                 waiting_pid: 30
               waiting_query: SELECT * FROM t WHERE id=1 LOCK IN SHARE MODE
             waiting_lock_id: 281479630179024:22:5:2
           waiting_lock_mode: S
             blocking_trx_id: 4401915
                blocking_pid: 34
              blocking_query: NULL
            blocking_lock_id: 4401915:22:5:2
          blocking_lock_mode: X
        blocking_trx_started: 2019-02-13 20:52:48
            blocking_trx_age: 00:00:25
    blocking_trx_rows_locked: 1
  blocking_trx_rows_modified: 1
     sql_kill_blocking_query: KILL QUERY 34
sql_kill_blocking_connection: KILL 34
```
1. `locked_index`：**PRIMARY**，加锁的对象是**聚簇索引**
2. `locked_type`：**RECORD**，锁类型是**行锁**
3. `waiting_lock_mode`：**S**，预期的加锁模式是**S Lock**
4. `blocking_pid=16`阻塞`waiting_pid=30`
5. `blocking_lock_mode`：**X**，目前持有**X Lock**
6. `KILL QUERY 34`：停止正在执行的语句，但不会释放锁
7. `KILL 34`：断开连接，会**释放锁**

## 查询慢

### 无索引
字段`c`没有索引，因此只能走聚簇索引扫描，即**全部扫描**
```sql
SELECT * FROM t WHERE c=50000 LIMIT 1;
```

#### explain
`type=ALL`+`rows=100,464`：**全表扫描**
```sql
mysql> EXPLAIN SELECT * FROM t WHERE c=50000 LIMIT 1;
+----+-------------+-------+------------+------+---------------+------+---------+------+--------+----------+-------------+
| id | select_type | table | partitions | type | possible_keys | key  | key_len | ref  | rows   | filtered | Extra       |
+----+-------------+-------+------------+------+---------------+------+---------+------+--------+----------+-------------+
|  1 | SIMPLE      | t     | NULL       | ALL  | NULL          | NULL | NULL    | NULL | 100464 |    10.00 | Using where |
+----+-------------+-------+------------+------+---------------+------+---------+------+--------+----------+-------------+
```

#### slowlog
```sql
# Time: 2019-02-13T17:29:39.646343+08:00
# User@Host: root[root] @ localhost []  Id:    29
# Query_time: 0.013134  Lock_time: 0.000239 Rows_sent: 1  Rows_examined: 50000
SET timestamp=1550050179;
SELECT * FROM t WHERE c=50000 LIMIT 1;
```
1. `Rows_examined=50,000`，扫描**聚簇索引**，直到找到第1个满足条件的行
2. `Query_time`为13ms，不算慢，但这是`O(N)`的查询
    - _**坏查询不一定是慢查询**_

### undolog过多

#### 存储过程
```sql
DELIMITER ;;
CREATE PROCEDURE udata()
BEGIN
    DECLARE i INT;
    SET i=1;
    WHILE (i<=1000000) DO
        UPDATE t SET c=c+1 WHERE id=1;
        SET i=i+1;
    END WHILE;
END;;
DELIMITER ;
```

#### 执行时序
| 时刻 | session A | session B |
| ---- | ---- | ---- |
| T1 | START TRANSACTION WITH CONSISTENT SNAPSHOT; | |
| T2 | SELECT * FROM t WHERE id=1;（返回1，很慢） | |
| T3 | | CALL udata(); |
| T4 | SELECT * FROM t WHERE id=1;（返回1，较慢） | |
| T5 | SELECT * FROM t WHERE id=1 LOCK IN SHARE MODE;（返回1,000,001，很快） | |

#### 执行结果
```sql
-- T4时刻，快照读（一致性读）
mysql> SELECT * FROM t WHERE id=1;
+----+------+
| id | c    |
+----+------+
|  1 |    1 |
+----+------+
1 row in set (0.99 sec)

-- T5时刻，当前读
mysql> SELECT * FROM t WHERE id=1 LOCK IN SHARE MODE;
+----+---------+
| id | c       |
+----+---------+
|  1 | 1000001 |
+----+---------+
1 row in set (0.00 sec)
```

#### undolog
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-troubleshoot-undolog.png" width=500/>

1. session B执行完100W次更新操作后，会生成100W个undolog
2. `T4`时刻采用的是**快照读**（一致性读），需要从行的当前版本往回依次应用100W个undolog，返回1
2. `T5`时刻采用的是**当前读**，直接返回当前版本，速度很快，返回1,000,001

#### slowlog
`T4`时刻的`Query_time`为`T5`时刻的4024倍
```sql
-- T3时刻
# Time: 2019-02-13T21:17:33.758542+08:00
# User@Host: root[root] @ localhost []  Id:    34
# Query_time: 0.998028  Lock_time: 0.000093 Rows_sent: 1  Rows_examined: 1
SET timestamp=1550063853;
SELECT * FROM t WHERE id=1;

-- T5时刻
# Time: 2019-02-13T21:18:07.613083+08:00
# User@Host: root[root] @ localhost []  Id:    34
# Query_time: 0.000248  Lock_time: 0.000100 Rows_sent: 1  Rows_examined: 1
SET timestamp=1550063887;
SELECT * FROM t WHERE id=1 LOCK IN SHARE MODE;
```

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
