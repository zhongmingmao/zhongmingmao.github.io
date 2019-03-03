---
title: MySQL -- RR的行锁
date: 2019-02-15 00:22:33
categories:
    - MySQL
tags:
    - MySQL
---

## 本文环境
```sql
mysql> SELECT VERSION();
+-----------+
| version() |
+-----------+
| 8.0.12    |
+-----------+

mysql> SHOW VARIABLES LIKE '%transaction_isolation%';
+-----------------------+-----------------+
| Variable_name         | Value           |
+-----------------------+-----------------+
| transaction_isolation | REPEATABLE-READ |
+-----------------------+-----------------+
```

<!-- more -->

## 加锁规则
1. 基本原则
    - 加锁的**基本单位**是`Next-Key Lock`
    - 遍历过程中**被访问到的对象**才有可能被加锁
2. 等值查询的优化
    - 如果遍历的是**唯一索引**（聚簇索引）且能**等值命中**，`Next-Key Lock`会降级为`Row Lock`
    - 向**右**遍历到**第一个不满足等值条件**的时候，`Next-Key Lock`会降级为`Gap Lock`
3. bug
    - 在**唯一索引**（聚簇索引）上的**范围查询**，会访问到**不满足条件的第一个值**为止

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

## 唯一索引

### 等值查询 -- 不命中降级
`Next-Key Lock`降级为`Gap Lock`

| session A | session B | session C |
| ---- | ---- | ---- |
| BEGIN;<br/>UPDATE t SET d=d+1 WHERE id=7; | | |
| | INSERT INTO t VALUES(1,1,1);<br/>(Query OK) | |
| | INSERT INTO t VALUES(8,8,8);<br/>(Blocked) | |
| | | UPDATE t SET d=d+1 WHERE id=5;<br/>(Query OK) |
| | | UPDATE t SET d=d+1 WHERE id=10;<br/>(Query OK) |

```sql
-- sission B Blocked
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| PRIMARY      | RECORD      | X,GAP             | X,GAP              |
+--------------+-------------+-------------------+--------------------+
```
session A持有的锁：`PRIMARY:Gap Lock:(5,10)`

### 范围查询 -- 起点降级
`Next-Key Lock`降级为`Row Lock`

| session A | session B | session C |
| ---- | ---- | ---- |
| BEGIN;<br/>SELECT * FROM t WHERE id>=10 AND id<11 FOR UPDATE; | | |
| | INSERT INTO t VALUES (8,8,8);<br/>(Query OK) | |
| | INSERT INTO t VALUES (13,13,13);<br/>(Blocked) | |
| | | UPDATE t SET d=d+1 WHERE id=10;<br/>(Blocked) |
| | | UPDATE t SET d=d+1 WHERE id=15;<br/>(Blocked) |

```sql
-- sission B Blocked
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| PRIMARY      | RECORD      | X,GAP             | X                  |
+--------------+-------------+-------------------+--------------------+

-- sission C Blocked 1
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| PRIMARY      | RECORD      | X                 | X                  |
+--------------+-------------+-------------------+--------------------+

-- sission C Blocked 2
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| PRIMARY      | RECORD      | X                 | X                  |
+--------------+-------------+-------------------+--------------------+
```
条件会拆分成`=10`（`Row Lock`）和`>10 & <11`，session A持有的锁：：`PRIMARY:X Lock:10`+`PRIMARY:Next-Key Lock:(10,15]`

### 范围查询 -- 尾点延伸
直到遍历到**第一个不满足的值**为止

| session A | session B | session C |
| ---- | ---- | ---- |
| BEGIN;<br/>SELECT * FROM t WHERE id>10 AND id<=15 FOR UPDATE; | | |
| | INSERT INTO t VALUES (16,16,16);<br/>(Blocked) | |
| | | UPDATE t SET d=d+1 WHERE id=20;<br/>(Blocked) |

```sql
-- sission B Blocked
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| PRIMARY      | RECORD      | X,GAP             | X                  |
+--------------+-------------+-------------------+--------------------+

-- sission C Blocked
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| PRIMARY      | RECORD      | X                 | X                  |
+--------------+-------------+-------------------+--------------------+
```
session A持有的锁：`PRIMARY:Next-Key Lock:(10,15]`+`PRIMARY:Next-Key Lock:(15,20]`

## 非唯一索引

### 等值查询 -- LOCK IN SHARE MODE
| session A | session B | session C |
| ---- | ---- | ---- |
| BEGIN;<br/>SELECT id FROM t WHERE c=5 LOCK IN SHARE MODE; | | |
| | INSERT INTO t VALUES (7,7,7);<br/>(Blocked) | |
| | | UPDATE t SET d=d+1 WHERE id=5;<br/>(Query OK) |
| | | UPDATE t SET d=d+1 WHERE c=10;<br/>(Query OK) |

```sql
-- Using index：覆盖索引
mysql> EXPLAIN SELECT id FROM t WHERE c=5 LOCK IN SHARE MODE;
+----+-------------+-------+------------+------+---------------+------+---------+-------+------+----------+-------------+
| id | select_type | table | partitions | type | possible_keys | key  | key_len | ref   | rows | filtered | Extra       |
+----+-------------+-------+------------+------+---------------+------+---------+-------+------+----------+-------------+
|  1 | SIMPLE      | t     | NULL       | ref  | c             | c    | 5       | const |    1 |   100.00 | Using index |
+----+-------------+-------+------------+------+---------------+------+---------+-------+------+----------+-------------+

-- sission B Blocked
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| c            | RECORD      | X,GAP             | S,GAP              |
+--------------+-------------+-------------------+--------------------+
```
session A持有的锁：`c:Next-Key Lock:(0,5]`+`c:Gap Lock:(5,10)`

### 等值查询 -- FOR UPDATE
`LOCK IN SHARE MODE`只会锁住**覆盖索引**，而`FOR UPDATE`会同时给**聚簇索引**上**满足条件的行**加上**X Lock**

| session A | session B |
| ---- | ---- |
| BEGIN;<br/>SELECT id FROM t WHERE c=5 FOR UPDATE; | |
| | UPDATE t SET d=d+1 WHERE id=5;<br/>(Blocked) |

```sql
-- sission B Blocked
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| PRIMARY      | RECORD      | X                 | X                  |
+--------------+-------------+-------------------+--------------------+
```
session A持有的锁：`c:Next-Key Lock:(0,5]`+`c:Gap Lock:(5,10)`+`PRIMARY:X Lock:5`

### 等值查询 -- 绕过覆盖索引
无法利用覆盖索引，就必须**回表**，与上面`FOR UPDATE`的情况一致

| session A | session B |
| ---- | ---- |
| BEGIN;<br/>SELECT d FROM t WHERE c=5 LOCK IN SHARE MODE | |
| | UPDATE t SET d=d+1 WHERE id=5;<br/>(Blocked) |

```sql
-- Extra=NULL：绕过覆盖索引，需要回表
mysql> EXPLAIN SELECT d FROM t WHERE c=5 LOCK IN SHARE MODE;
+----+-------------+-------+------------+------+---------------+------+---------+-------+------+----------+-------+
| id | select_type | table | partitions | type | possible_keys | key  | key_len | ref   | rows | filtered | Extra |
+----+-------------+-------+------------+------+---------------+------+---------+-------+------+----------+-------+
|  1 | SIMPLE      | t     | NULL       | ref  | c             | c    | 5       | const |    1 |   100.00 | NULL  |
+----+-------------+-------+------------+------+---------------+------+---------+-------+------+----------+-------+

-- sission B Blocked
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| PRIMARY      | RECORD      | X                 | S                  |
+--------------+-------------+-------------------+--------------------+
```
session A持有的锁：`c:Next-Key Lock:(0,5]`+`c:Gap Lock:(5,10)`+`PRIMARY:S Lock:5`

### 等值查询 -- 相同的值
```sql
-- c=10有两行，两行之间也存在Gap
INSERT INTO t VALUES (30,10,30);
```
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-locking-rule-index-c.png" width=500/>
`DELETE`语句的加锁逻辑与`SELECT...FOR UPDTAE`是类似的

| session A | session B | session C |
| ---- | ---- | ---- |
| BEGIN;<br/>DELETE FROM t WHERE c=10; | | |
| | INSERT INTO t VALUES (12,12,12);<br/>(Blocked) | |
| | | UPDATE t SET d=d+1 WHERE c=5;<br/>(Query OK) |
| | | UPDATE t SET d=d+1 WHERE c=15;<br/>(Query OK) |
| | | UPDATE t SET d=d+1 WHERE id=5;<br/>(Query OK) |
| | | UPDATE t SET d=d+1 WHERE id=15;<br/>(Query OK) |
| | | UPDATE t SET d=d+1 WHERE id=10;<br/>(Blocked) |
| | | UPDATE t SET d=d+1 WHERE id=30;<br/>(Blocked) |

```sql
-- session B Blocked
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| c            | RECORD      | X,GAP             | X,GAP              |
+--------------+-------------+-------------------+--------------------+

-- session C Blocked 1
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| PRIMARY      | RECORD      | X                 | X                  |
+--------------+-------------+-------------------+--------------------+

-- session C Blocked 2
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| PRIMARY      | RECORD      | X                 | X                  |
+--------------+-------------+-------------------+--------------------+
```
session A在二级索引c上的加锁效果如下所示
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-locking-rule-secondary-index-eq.png" width=500/>
session A持有的锁
- `c:Next-Key Lock:((c=5,id=5),(c=10,id=10)]`+`c:Gap Lock:((c=10,id=10),(c=15,id=15))`
- `PRIMARY:X Lock:10`+`PRIMARY:X Lock:30`

### 等值查询 -- LIMIT
```sql
-- 与上面“相同的值”一样
INSERT INTO t VALUES (30,10,30);
```

| session A | session B | session C |
| ---- | ---- | ---- |
| BEGIN;<br/>DELETE FROM t WHERE c=10 LIMIT 2; | | |
| | INSERT INTO t VALUES (12,12,12);<br/>(Query OK) | |
| | | UPDATE t SET d=d+1 WHERE id=10;<br/>(Blocked) |
| | | UPDATE t SET d=d+1 WHERE id=30;<br/>(Blocked) |

```sql
-- session C Blocked 1
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| PRIMARY      | RECORD      | X                 | X                  |
+--------------+-------------+-------------------+--------------------+

-- session C Blocked 2
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| PRIMARY      | RECORD      | X                 | X                  |
+--------------+-------------+-------------------+--------------------+
```

在遍历到`(c=10,id=30)`这一行记录后，已经有两行记录满足条件，**循环结束**，session A在二级索引c上的加锁效果如下所示
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-locking-rule-limit.png" width=500/>
session A持有的锁
- `c:Next-Key Lock:((c=5,id=5),(c=10,id=10)]`+`c:Next-Key Lock:((c=10,id=10),(c=10,id=30)]`
- `PRIMARY:X Lock:10`+`PRIMARY:X Lock:30`

因此在删除数据时，尽量加上`LIMIT`，可以**控制删除数据的条数**，也可以**减少加锁的范围**

### 等值查询 -- Gap Lock死锁
| session A | session B |
| ---- | ---- |
| BEGIN;<br/>SELECT id FROM t WHERE c=10 LOCK IN SHARE MODE; | |
| | UPDATE t SET d=d+1 WHERE c=10;<br/>(Blocked) |
| INSERT INTO t values (8,8,8); | |
| | ERROR 1213 (40001): Deadlock found when trying to get lock; try restarting transaction |

由于二级索引`c`是**非唯一索引**，因此没法降级为**行锁**
session A持有的锁
- `c:Next-Key Lock:(5,10]`+`c:Next-Key Lock:(10,15]`
- `PRIMARY:S Lock:10`

session B首先尝试持有`c:Next-Key Lock:(5,10]`，分**两阶段**
- `c:Gap Lock:(5,10)`，加锁成功
- `c:X Lock:10`，加锁失败，被阻塞，session B被session A阻塞

session A尝试插入`(8,8,8)`，被session B的`c:Gap Lock:(5,10)`阻塞，系统检测到死锁并回滚session B

```sql
-- session B Blocked
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| c            | RECORD      | X                 | S                  |
+--------------+-------------+-------------------+--------------------+
```

### 范围查询
| session A | session B | session C |
| ---- | ---- | ---- |
| BEGIN;<br/>SELECT * FROM t WHERE c>=10 AND c<11 FOR UPDATE; | | |
| | INSERT INTO t VALUES (8,8,8);<br/>(Blocked) | |
| | | UPDATE t SET d=d+1 WHERE id=10;<br/>(Blocked)|
| | | UPDATE t SET d=d+1 WHERE c=15;<br/>(Blocked)|

```sql
-- session B Blocked
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| c            | RECORD      | X,GAP             | X                  |
+--------------+-------------+-------------------+--------------------+

-- session C Blocked 1
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| PRIMARY      | RECORD      | X                 | X                  |
+--------------+-------------+-------------------+--------------------+

-- session C Blocked 2
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| c            | RECORD      | X                 | X                  |
+--------------+-------------+-------------------+--------------------+
```
由于二级索引`c`是**非唯一索引**，因此没法降级为**行锁**
session A持有的锁
- `c:Next-Key Lock:(5,10]`+`c:Next-Key Lock:(10,15]`
- `PRIMARY:X Lock:10`

## ORDE BY DESC
| session A | session B |
| ---- | ---- |
| BEGIN;<br/>SELECT * FROM t WHERE c>=15 AND c <=20 ORDER BY c DESC LOCK IN SHARE MODE; | |
| | INSERT INTO t VALUES (6,6,6);<br/>(Blocked) |
| | INSERT INTO t VALUES (21,21,21);<br/>(Blocked) |
| | UPDATE t SET d=d+1 WHERE id=10;<br/>(Query OK) |
| | UPDATE t SET d=d+1 WHERE id=25;<br/>(Query OK) |
| | UPDATE t SET d=d+1 WHERE id=15;<br/>(Blocked) |
| | UPDATE t SET d=d+1 WHERE id=20;<br/>(Blocked) |

```sql
-- session B Blocked 1
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| c            | RECORD      | X,GAP             | S                  |
+--------------+-------------+-------------------+--------------------+

-- session B Blocked 2
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| c            | RECORD      | X,GAP             | S,GAP              |
+--------------+-------------+-------------------+--------------------+

-- session B Blocked 3
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| PRIMARY      | RECORD      | X                 | S                  |
+--------------+-------------+-------------------+--------------------+

-- session B Blocked 4
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| PRIMARY      | RECORD      | X                 | S                  |
+--------------+-------------+-------------------+--------------------+
```
1. `ORDE BY DESC`，首先找到第一个满足`c=20`的行，session A持有锁：`c:Next-Key Lock:(15,20]`
2. 由于二级索引`c`是**非唯一索引**，继续向**右**遍历，session A持有锁：`c:Gap Key Lock:(20,25)`
3. 向**左**遍历，`c=15`，session A持有锁：`c:Next-Key Lock:(10,15]`
4. 继续向**左**遍历，`c=10`，session A持有锁：`c:Next-Key Lock:(5,10]`
5. 上述过程中，满足条件的主键为`id=15`和`id=20`，session A持有**聚簇索引**上对应行的`S Lock`
6. 总结，session A持有的锁
    - `c:Next-Key Lock:(5,10]`+`c:Next-Key Lock:(10,15]`+`c:Next-Key Lock:(15,20]`+`c:Gap Key Lock:(20,25)`
    - `PRIMARY:S Lock:15`+`PRIMARY:S Lock:20`

## 等值 VS 遍历
```sql
BEGIN;
SELECT * FROM t WHERE id>9 AND id<12 ORDER BY id DESC FOR UPDATE;
```
1. 利用上面的加锁规则，加锁范围如下
    - `PRIMARY:Next-Key Lock:(0,5]`
    - `PRIMARY:Next-Key Lock:(5,10]`
    - `PRIMARY:Gap Lock:(10,15)`
2. 加锁动作是发生在语句执行过程中
    - `ORDER BY DESC`，优化器必须先找到**第一个id<12的值**
    - 这个过程是通过**索引树的搜索过程**得到的，其实是在引擎内部查找`id=12`
    - 只是最终没找到，而找到了`(10,15)`这个间隙
    - 然后**向左遍历**，在这个遍历过程，就不是等值查询了
3. 在执行过程中，通过**树搜索**的方式定位记录的过程，用的是**等值查询**

## IN
```sql
BEGIN;
SELECT id FROM t WHERE c IN (5,20,10) LOCK IN SHARE MODE;

-- Using index：使用了覆盖索引
-- key=c：使用了索引c
-- rows=3：三个值都是通过树搜索定位的
mysql> EXPLAIN SELECT id FROM t WHERE c IN (5,20,10) LOCK IN SHARE MODE;
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+--------------------------+
| id | select_type | table | partitions | type  | possible_keys | key  | key_len | ref  | rows | filtered | Extra                    |
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+--------------------------+
|  1 | SIMPLE      | t     | NULL       | range | c             | c    | 5       | NULL |    3 |   100.00 | Using where; Using index |
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+--------------------------+
```
1. 查找`c=5`
    - `c:Next-Key Lock:(0,5]`+`c:Gap Lock:(5,10)`
2. 查找`c=10`
    - `c:Next-Key Lock:(5,10]`+`c:Gap Lock:(10,15)`
3. 查找`c=20`
    - `c:Next-Key Lock:(15,20]`+`c:Gap Lock:(20,25)`
4. 锁是在执行过程中是**一个一个**加的

### ORDER BY DESC
```sql
BEGIN;
SELECT id FROM t WHERE c IN (5,20,10) ORDER BY c DESC FOR UPDATE;

mysql> EXPLAIN SELECT id FROM t WHERE c IN (5,20,10) ORDER BY c DESC FOR UPDATE;
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+-----------------------------------------------+
| id | select_type | table | partitions | type  | possible_keys | key  | key_len | ref  | rows | filtered | Extra                                         |
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+-----------------------------------------------+
|  1 | SIMPLE      | t     | NULL       | range | c             | c    | 5       | NULL |    3 |   100.00 | Using where; Backward index scan; Using index |
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+-----------------------------------------------+
```
1. `ORDER BY DESC`：先锁`c=20`，再锁`c=10`，最后锁`c=5`
2. **加锁资源相同**，但**加锁顺序相反**，如果语句是并发执行的，可能会出现**死锁**

## 死锁
| session A | session B |
| ---- | ---- |
| BEGIN; | |
| SELECT id FROM t WHERE c=5 LOCK IN SHARE MODE; | |
| | BEGIN; |
| | SELECT id FROM t WHERE c=20 FOR UPDATE; |
| SELECT id FROM t WHERE c=20 LOCK IN SHARE MODE; | |
| | SELECT id FROM t WHERE c=5 FOR UPDATE; |
| Deadlock found when trying to get lock; try restarting transaction | |

MySQL只保留**最后一个死锁的现场**，并且这个现场还不完备
```sql
mysql> SHOW ENGINE INNODB STATUS\G;
------------------------
LATEST DETECTED DEADLOCK
------------------------
2019-03-03 20:49:40 0x700006a43000
*** (1) TRANSACTION:
TRANSACTION 281479811602240, ACTIVE 35 sec starting index read
mysql tables in use 1, locked 1
LOCK WAIT 4 lock struct(s), heap size 1136, 3 row lock(s)
MySQL thread id 15, OS thread handle 123145414946816, query id 283 localhost root Sending data
SELECT id FROM t WHERE c=20 LOCK IN SHARE MODE
*** (1) WAITING FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 77 page no 5 n bits 80 index c of table `test`.`t` trx id 281479811602240 lock mode S waiting
Record lock, heap no 6 PHYSICAL RECORD: n_fields 2; compact format; info bits 0
 0: len 4; hex 80000014; asc     ;;
 1: len 4; hex 80000014; asc     ;;

*** (2) TRANSACTION:
TRANSACTION 6407220, ACTIVE 25 sec starting index read, thread declared inside InnoDB 5000
mysql tables in use 1, locked 1
5 lock struct(s), heap size 1136, 4 row lock(s)
MySQL thread id 16, OS thread handle 123145413734400, query id 284 localhost root Sending data
SELECT id FROM t WHERE c=5 FOR UPDATE
*** (2) HOLDS THE LOCK(S):
RECORD LOCKS space id 77 page no 5 n bits 80 index c of table `test`.`t` trx id 6407220 lock_mode X
Record lock, heap no 6 PHYSICAL RECORD: n_fields 2; compact format; info bits 0
 0: len 4; hex 80000014; asc     ;;
 1: len 4; hex 80000014; asc     ;;

*** (2) WAITING FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 77 page no 5 n bits 80 index c of table `test`.`t` trx id 6407220 lock_mode X waiting
Record lock, heap no 3 PHYSICAL RECORD: n_fields 2; compact format; info bits 0
 0: len 4; hex 80000005; asc     ;;
 1: len 4; hex 80000005; asc     ;;

*** WE ROLL BACK TRANSACTION (1)
```
1. `(1) TRANSACTION`：第一个事务的信息
2. `(2) TRANSACTION`：第二个事务的信息
3. `WE ROLL BACK TRANSACTION (1)`：最终的处理结果是回滚第一个事务

### 第一个事务
```sql
SELECT id FROM t WHERE c=20 LOCK IN SHARE MODE
*** (1) WAITING FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 77 page no 5 n bits 80 index c of table `test`.`t` trx id 281479811602240 lock mode S waiting
Record lock, heap no 6 PHYSICAL RECORD: n_fields 2; compact format; info bits 0
 0: len 4; hex 80000014; asc     ;;
 1: len 4; hex 80000014; asc     ;;
```
1. `(1) WAITING FOR THIS LOCK TO BE GRANTED`：表示第一个事务在等待的锁的信息
2. `index c of table test.t`：表示等待表`t`的索引`c`上的锁
3. `lock mode S waiting`：表示正在执行的语句要加一个`S Lock`，当前状态为**等待中**
4. `Record lock`：表示这是一个**记录锁**（行数）
5. `n_fields 2`：表示这个记录有2列（二级索引），即字段`c`和主键字段`id`
6. `0: len 4; hex 80000014; asc     ;;`：第一个字段`c`
    - `asc`：表示接下来要打印值里面的**可打印字符**，20不是可打印字符，因此显示**空格**
7. `1: len 4; hex 80000014; asc     ;;`：第二个字段`id`
8. 第一个事务在等待`(c=20,id=20)`这一行的行锁
9. 但并没有打印出第一个事务本身所占有的锁，可以通过第二个事务反向推导出来

### 第二个事务
```sql
SELECT id FROM t WHERE c=5 FOR UPDATE
*** (2) HOLDS THE LOCK(S):
RECORD LOCKS space id 77 page no 5 n bits 80 index c of table `test`.`t` trx id 6407220 lock_mode X
Record lock, heap no 6 PHYSICAL RECORD: n_fields 2; compact format; info bits 0
 0: len 4; hex 80000014; asc     ;;
 1: len 4; hex 80000014; asc     ;;

 *** (2) WAITING FOR THIS LOCK TO BE GRANTED:
 RECORD LOCKS space id 77 page no 5 n bits 80 index c of table `test`.`t` trx id 6407220 lock_mode X waiting
 Record lock, heap no 3 PHYSICAL RECORD: n_fields 2; compact format; info bits 0
  0: len 4; hex 80000005; asc     ;;
  1: len 4; hex 80000005; asc     ;;
```
1. `(2) HOLDS THE LOCK(S)`：表示第二个事务持有的锁的信息
2. `index c of table test.t`：表示锁是加在表`t`的索引`c`上
3. `0: len 4; hex 80000014; asc     ;;`+`1: len 4; hex 80000014; asc     ;;`
    - 第二个事务持有`(c=20,id=20)`这一行的行锁（`X Lock`）
4. `(2) WAITING FOR THIS LOCK TO BE GRANTED`
    - 第二个事务等待`(c=5,id=5)`只一行的行锁

### 小结
1. 锁是**一个一个**加的，为了避免死锁，对**同一组资源**，尽量按照**相同的顺序**访问
2. 在发生死锁的时候，`FOR UPDATE`占用的资源更多，**回滚成本更大**，因此选择回滚`LOCK IN SHARE MODE`

## 锁等待
| 时刻 | session A | session B |
| ---- | ---- | ---- |
| T1 | BEGIN; | |
| T2 | SELECT * FROM t WHERE id>10 AND id<=15 FOR UPDATE; | |
| T3 | | DELETE FROM t WHERE id=10;<br/>(Query OK) |
| T4 | | INSERT INTO t VALUES (10,10,10);<br/>(Blocked) |

```sql
-- session B Blocked
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| PRIMARY      | RECORD      | X,GAP             | X                  |
+--------------+-------------+-------------------+--------------------+

mysql> SHOW ENGINE INNODB STATUS\G;
------------
TRANSACTIONS
------------
---TRANSACTION 6407254, ACTIVE 3 sec inserting
mysql tables in use 1, locked 1
LOCK WAIT 2 lock struct(s), heap size 1136, 1 row lock(s)
MySQL thread id 16, OS thread handle 123145413734400, query id 319 localhost root update
INSERT INTO t VALUES (10,10,10)
------- TRX HAS BEEN WAITING 3 SEC FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 78 page no 4 n bits 80 index PRIMARY of table `test`.`t` trx id 6407254 lock_mode X locks gap before rec insert intention waiting
Record lock, heap no 5 PHYSICAL RECORD: n_fields 5; compact format; info bits 0
 0: len 4; hex 8000000f; asc     ;;
 1: len 6; hex 00000061c44a; asc    a J;;
 2: len 7; hex 810000008f0137; asc       7;;
 3: len 4; hex 8000000f; asc     ;;
 4: len 4; hex 8000000f; asc     ;;
```
1. 时刻`T2`，session A持有的锁如下
    - `PRIMARY:Next-Key Lock:(10,15]`+`PRIMARY:Next-Key Lock:(15,20]`
2. 因此在时刻`T3`，session B能直接删除`id=10`这一行
3. `index PRIMARY of table test.t`：语句被锁住是因为表`t`的主键上的某一个锁
4. `lock_mode X locks gap before rec insert intention waiting`
    - `insert intention`：表示当前线程准备插入一个记录，是一个**插入意向锁**
    - `gap before rec`：表示这是一个`Gap Lock`，而不是`Record Lock`
5. `n_fields 5`：表示这一记录有5列（聚簇索引）
    - `0: len 4; hex 8000000f; asc     ;;`：表示主键`id`字段，即`id=15`
        - 因此`gap before rec`里面的`rec`指的就是`id=15`这一行
        - 又因为`id=10`这一行已经不存在了，因此这个`gap`就是`(5,15)`
    - `1: len 6; hex 00000061c44a; asc    a J;;`：表示6字节的**事务ID**
    - `2: len 7; hex 810000008f0137; asc       7;;`：表示7字节的**回滚段信息**
    - `3: len 4; hex 8000000f; asc     ;;`：表示字段`c`
    - `4: len 4; hex 8000000f; asc     ;;`：表示字段`d`
6. 原来session A持有的`PRIMARY:Next-Key Lock:(10,15]`膨胀成了`PRIMARY:Next-Key Lock:(5,15]`
    - **间隙的本质**：由间隙**右边的记录**来定义的

## Gap Lock
| session A | session B |
| ---- | ---- |
| BEGIN; | |
| SELECT c FROM t WHERE c>5 LOCK IN SHARE MODE; | |
| | UPDATE t SET c=1 WHERE c=5;<br/>(Query OK) |
| | UPDATE t SET c=5 WHERE c=1;<br/>(Blocked) |

```sql
-- session B Blocked
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| c            | RECORD      | X,GAP             | S                  |
| c            | RECORD      | X,GAP             | S                  |
+--------------+-------------+-------------------+--------------------+

mysql> show engine innodb status\G;
------------
TRANSACTIONS
------------
---TRANSACTION 6407282, ACTIVE 5 sec updating or deleting
mysql tables in use 1, locked 1
LOCK WAIT 5 lock struct(s), heap size 1136, 4 row lock(s), undo log entries 1
MySQL thread id 16, OS thread handle 123145413734400, query id 337 localhost root updating
UPDATE t SET c=5 WHERE c=1
------- TRX HAS BEEN WAITING 5 SEC FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 79 page no 5 n bits 80 index c of table `test`.`t` trx id 6407282 lock_mode X locks gap before rec insert intention waiting
Record lock, heap no 4 PHYSICAL RECORD: n_fields 2; compact format; info bits 0
 0: len 4; hex 8000000a; asc     ;;
 1: len 4; hex 8000000a; asc     ;;
```
1. session A持有的锁如下
    - `c:Next-Key Lock:(5,10]`
    - `c:Next-Key Lock:(10,15]`
    - `c:Next-Key Lock:(15,20]`
    - `c:Next-Key Lock:(20,25]`
    - `c:Next-Key Lock:(25,supremum]`
2. 依据`c>5`查找到的第一个记录是`c=10`，因此不包含`c:Next-Key Lock:(0,5]`
3. `UPDATE t SET c=1 WHERE c=5`等价于两步
    - 插入`(c=1,id=5)`这个记录
    - 删除`(c=5,id=5)`这个记录
4. 执行完上面两步，session A持有的`c:Next-Key Lock:(5,10]`会膨胀为`c:Next-Key Lock:(1,10]`
5. `UPDATE t SET c=5 WHERE c=1`等价于两步
    - 插入`(c=5,id=5)`这个记录
    - 删除`(c=1,id=5)`这个记录
6. 在试图执行第一步的时候，会被session A持有的`c:Next-Key Lock:(1,10]`所阻塞

## RR与RC
1. RR隔离级别
    - 遵守**两阶段**协议，所有**加锁的资源**都是在事务**提交**或**回滚**时才释放
2. RC隔离级别
    - 执行过程加上的**行锁**，在**语句执行完成后**，就要把**“不满足条件的行”上的行锁直接释放**，无需等待事务提交或回滚
    - **锁范围更小**，**锁定时间更短**，这是很多业务选择RC的一个原因

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
