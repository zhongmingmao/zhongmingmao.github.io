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
-- sesson B Blocked
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
-- sesson B Blocked
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| PRIMARY      | RECORD      | X,GAP             | X                  |
+--------------+-------------+-------------------+--------------------+

-- sesson C Blocked 1
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| PRIMARY      | RECORD      | X                 | X                  |
+--------------+-------------+-------------------+--------------------+

-- sesson C Blocked 2
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
-- sesson B Blocked
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| PRIMARY      | RECORD      | X,GAP             | X                  |
+--------------+-------------+-------------------+--------------------+

-- sesson C Blocked
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

-- sesson B Blocked
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
-- sesson B Blocked
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

-- sesson B Blocked
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

## RR与RC
1. RR隔离级别
    - 遵守**两阶段**协议，所有**加锁的资源**都是在事务**提交**或**回滚**时才释放
2. RC隔离级别
    - 执行过程加上的**行锁**，在**语句执行完成后**，就要把**“不满足条件的行”上的行锁直接释放**，无需等待事务提交或回滚
    - **锁范围更小**，**锁定时间更短**，这是很多业务选择RC的一个原因

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
