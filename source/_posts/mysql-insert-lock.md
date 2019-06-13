---
title: MySQL -- INSERT语句的锁
date: 2019-03-16 09:04:10
categories:
    - MySQL
tags:
    - MySQL
---

## INSERT...SELECT

### 表初始化
```sql
CREATE TABLE `t` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `c` INT(11) DEFAULT NULL,
  `d` INT(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `c` (`c`)
) ENGINE=InnoDB;

INSERT INTO t VALUES (null,1,1);
INSERT INTO t VALUES (null,2,2);
INSERT INTO t VALUES (null,3,3);
INSERT INTO t VALUES (null,4,4);

CREATE TABLE t2 LIKE t;
```

<!-- more -->

### 操作序列
| 时刻 | session A | session B |
| ---- | ---- | ---- |
| T1 | | BEGIN; |
| T2 | | INSERT INTO t2(c,d) SELECT c,d FROM t; |
| T3 | INSERT INTO t VALUES (-1,-1,-1);<br/>(Blocked) | |

```sql
-- T3时刻
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| PRIMARY      | RECORD      | X,GAP             | S                  |
+--------------+-------------+-------------------+--------------------+
```
1. T2时刻，session B会在表t加上`PRIMARY:Next-Key Lock:(-∞,1]`
2. 如果没有锁的话，就可能会出现session B的**INSERT语句先执行**，但对应的**binlog后写入**的情况
    - `binlog_format=STATEMENT`，binlog里面的语句序列如下
        - `INSERT INTO t VALUES (-1,-1,-1)`
        - `INSERT INTO t2(c,d) SELECT c,d FROM t`
    - 这个语句传到备库执行，就会把id=-1这一行也会写到t2，_**主备不一致**_

## INSERT循环写入

### 非循环写入
```sql
mysql> EXPLAIN INSERT INTO t2(c,d) (SELECT c+1,d FROM t FORCE INDEX(c) ORDER BY c DESC LIMIT 1);
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+-------+
| id | select_type | table | partitions | type  | possible_keys | key  | key_len | ref  | rows | filtered | Extra |
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+-------+
|  1 | INSERT      | t2    | NULL       | ALL   | NULL          | NULL | NULL    | NULL | NULL |     NULL | NULL  |
|  1 | SIMPLE      | t     | NULL       | index | NULL          | c    | 5       | NULL |    1 |   100.00 | NULL  |
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+-------+

# Time: 2019-03-15T04:55:55.315664Z
# User@Host: root[root] @ localhost []  Id:     2
# Query_time: 0.003300  Lock_time: 0.000424 Rows_sent: 0  Rows_examined: 1
SET timestamp=1552625755;
INSERT INTO t2(c,d) (SELECT c+1,d FROM t FORCE INDEX(c) ORDER BY c DESC LIMIT 1);
```
1. 加锁范围为在表t上`c:Next-Key Lock:(3,4]`+`c:Next-Key Lock:(4,+∞]`
2. 执行流程比较简单，从表t中按索引c倒序扫描第一行，拿到结果后写入到表t2，整个语句的扫描行数为1

### 循环写入
```sql
-- MySQL 5.7上执行
mysql> EXPLAIN INSERT INTO t(c,d) (SELECT c+1,d FROM t FORCE INDEX(c) ORDER BY c DESC LIMIT 1);
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+-----------------+
| id | select_type | table | partitions | type  | possible_keys | key  | key_len | ref  | rows | filtered | Extra           |
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+-----------------+
|  1 | INSERT      | t     | NULL       | ALL   | NULL          | NULL | NULL    | NULL | NULL |     NULL | NULL            |
|  1 | SIMPLE      | t     | NULL       | index | NULL          | c    | 5       | NULL |    1 |   100.00 | Using temporary |
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+-----------------+

mysql> SHOW STATUS LIKE '%Innodb_rows_read%';
+------------------+-------+
| Variable_name    | Value |
+------------------+-------+
| Innodb_rows_read | 13    |
+------------------+-------+

mysql> INSERT INTO t(c,d) (SELECT c+1,d FROM t FORCE INDEX(c) ORDER BY c DESC LIMIT 1);
Query OK, 1 row affected (0.00 sec)
Records: 1  Duplicates: 0  Warnings: 0

mysql> SHOW STATUS LIKE '%Innodb_rows_read%';
+------------------+-------+
| Variable_name    | Value |
+------------------+-------+
| Innodb_rows_read | 17    |
+------------------+-------+

# Time: 2019-03-15T05:10:38.603323Z
# User@Host: root[root] @ localhost []  Id:     2
# Query_time: 0.004470  Lock_time: 0.000184 Rows_sent: 0  Rows_examined: 5
SET timestamp=1552626638;
INSERT INTO t(c,d) (SELECT c+1,d FROM t FORCE INDEX(c) ORDER BY c DESC LIMIT 1);
```
1. `Using temporary`表示用到了**临时表**，执行过程中，需要把表t的内容读出来，写入临时表
2. 实际上，`EXPLAIN`结果里的`rows=1`是因为受到了`LIMIT 1`的影响
3. 语句执行前后，`Innodb_rows_read`的值增加了4，因为临时表默认使用的是**Memory引擎**
    - 这4行数据查的是表t，即对表t做了**全表扫描**
4. 执行流程
    - 创建临时表，表里有两个字段`c`和`d`
    - 按照索引c扫描表t，依次取出c=4,3,2,1，然后**回表**，读到c和d的值写入临时表
        - 此时，`Rows_examined=4`
    - 由于有`LIMIT 1`，所以只会取临时表的第一行，再插入到表t
        - 此时，`Rows_examined=5`
5. 该语句会导致在表t上做**全表扫描**，并且会给索引c上的所有间隙都加上`Share Next-Key Lock`
    - 在这个语句执行期间，其它事务不能在这个表上插入数据
6. 需要临时表的原因
    - 一边遍历数据，一边更新数据
    - 如果读出来的数据直接写回原表，可能在遍历过程中，读到刚刚插入的记录
    - 新插入的记录如果参与计算逻辑，就会与原语义不符

#### 优化方案
```sql
CREATE TEMPORARY TABLE temp_t(c INT,d INT) ENGINE=Memory;
-- Rows_examined=1
INSERT INTO temp_t (SELECT c+1, d FROM t FORCE INDEX(c) ORDER BY c DESC LIMIT 1);
-- Rows_examined=1
INSERT INTO t(c,d) SELECT * FROM temp_t;
DROP TABLE temp_t;
```

## INSERT唯一键冲突
| 时刻 | session A | session B |
| ---- | ---- | ---- |
| T0 | SELECT * FROM t; | |
| T1 | INSERT INTO t VALUES (10,10,10); | |
| T2 | BEGIN; | |
| T3 | INSERT INTO t VALUES (11,10,10);<br/>(Duplicate entry '10' for key 'c') | |
| T4 | | INSERT INTO t VALUES (12,9,9);<br/>(Blocked) |

```sql
-- T0时刻
mysql> SELECT * FROM t;
+----+------+------+
| id | c    | d    |
+----+------+------+
|  1 |    1 |    1 |
|  2 |    2 |    2 |
|  3 |    3 |    3 |
|  4 |    4 |    4 |
|  5 |    5 |    4 |
+----+------+------+

mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| c            | RECORD      | X,GAP             | S                  |
+--------------+-------------+-------------------+--------------------+
```
1. session A要执行的INSERT语句，发生唯一键冲突，并不是简单地报错返回，还需要在**冲突的索引**上加锁
2. 一个`Next-Key Lock`由它的**右边界**定义的，即是`c:Shared Next-Key Lock:(5,10]`

## INSERT死锁
| 时刻 | session A | session B | session C |
| ---- | ---- | ---- | ---- |
| T0 | TRUNCATE t; | | |
| T1 | BEGIN;<br/>INSERT INTO t VALUES (null,5,5); | | |
| T2 | | INSERT INTO t VALUES (null,5,5); | INSERT INTO t VALUES (null,5,5); |
| T3 | ROLLBACK; | | Deadlock found |

<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-insert-dead-lock.jpg" width=800/>


1. 在T1时刻，session A执行`INSERT`语句，在索引`c=5`上加上**行锁**（索引c是**唯一索引**，可以退化为**行锁**）
2. 在T2时刻，session B和session C执行相同的`INSERT`语句，发现**唯一键冲突**，_等待加上**读锁**_
3. 在T3时刻，session A执行`ROLLBACK`语句，session B和session C都试图继续插入执行操作，都要加上**写锁**
    - 但两个session都要等待对方的**读锁**，所以就出现了死锁

## INSERT INTO...ON DUPLICATE KEY
```sql
TRUNCATE T;
INSERT INTO t VALUES (1,1,1),(2,2,2);

-- 如果有多个列违反唯一性约束，按照索引的顺序，修改跟第一个索引冲突的行
-- 2 rows affected，insert和update都认为自己成功了，update计数加1，insert计数也加1
INSERT INTO t VALUES (2,1,100) ON DUPLICATE KEY UPDATE d=100;
Query OK, 2 rows affected (0.01 sec)
Records: 2  Duplicates: 0  Warnings: 0

mysql> SELECT * FROM t;
+----+------+------+
| id | c    | d    |
+----+------+------+
|  1 |    1 |    1 |
|  2 |    2 |  100 |
+----+------+------+
```

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
