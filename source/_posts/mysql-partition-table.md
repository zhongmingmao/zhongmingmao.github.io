---
title: MySQL -- 分区表
date: 2019-03-17 20:56:27
categories:
    - MySQL
tags:
    - MySQL
---

## 表初始化
```sql
CREATE TABLE `t` (
    `ftime` DATETIME NOT NULL,
    `c` int(11) DEFAULT NULL,
    KEY (`ftime`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 PARTITION BY RANGE (YEAR(ftime))
    (PARTITION p_2017 VALUES LESS THAN (2017) ENGINE = InnoDB,
    PARTITION p_2018 VALUES LESS THAN (2018) ENGINE = InnoDB,
    PARTITION p_2019 VALUES LESS THAN (2019) ENGINE = InnoDB,
    PARTITION p_others VALUES LESS THAN MAXVALUE ENGINE = InnoDB);

INSERT INTO t VALUES ('2017-4-1',1),('2018-4-1',1);

mysql> SYSTEM ls /usr/local/var/mysql/test
t#P#p_2017.ibd		t#P#p_2018.ibd		t#P#p_2019.ibd		t#P#p_others.ibd
```

<!-- more -->

1. 在表t中初始化插入两行记录，按照分区规则，分别落在`p_2018`和`p_2019`两个分区上
2. 包含4个ibd文件，_**每个分区对应一个ibd文件**_
    - 对于**Server层**来说，只是**1**个表
    - 对于**引擎层**来说，这是**4**个表

## 引擎层行为

### InnoDB
| session A | session B |
| ---- | ---- |
| BEGIN;<br/>SELECT * FROM t WHERE ftime='2017-05-01' FOR UPDATE; | |
| | INSERT INTO t VALUES ('2018-02-01',1);<br/>(Query OK)<br/>INSERT INTO t VALUES ('2017-12-01',1);<br/>(Blocked) |

```sql
mysql> SELECT locked_index,locked_type,waiting_lock_mode,blocking_lock_mode FROM sys.innodb_lock_waits WHERE locked_table='`test`.`t`';
+--------------+-------------+-------------------+--------------------+
| locked_index | locked_type | waiting_lock_mode | blocking_lock_mode |
+--------------+-------------+-------------------+--------------------+
| ftime        | RECORD      | X                 | X                  |
+--------------+-------------+-------------------+--------------------+


mysql> SHOW ENGINE INNODB STATUS\G;
INSERT INTO t VALUES ('2017-12-01',1)
------- TRX HAS BEEN WAITING 49 SEC FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 104 page no 5 n bits 72 index ftime of table `test`.`t` /* Partition `p_2018` */ trx id 7417349 lock_mode X insert intention waiting
Record lock, heap no 1 PHYSICAL RECORD: n_fields 1; compact format; info bits 0
 0: len 8; hex 73757072656d756d; asc supremum;;
```

对于普通表，session A持有的锁为`ftime:Next-Key Lock:('2017-4-1','2018-4-1']`
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-partition-table-common-gap-lock.jpg" width=800/>
但对于**引擎**来说，分区表的分区是**不同的表**，即`2017-4-1`的下一个记录是`p_2018`分区的`supremum`
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-partition-table-real-gap-lock.jpg" width=800/>

### MyISAM
| session A | session B | session C |
| ---- | ---- | ---- |
| ALTER TABLE t ENGINE=MyISAM;<br/>(MySQL 5.7) | | |
| UPDATE t SET c=SLEEP(100) WHERE ftime='2017-04-01'; | | |
| | SELECT * FROM t WHERE ftime='2018-4-1';<br/>(Query OK) | |
| | SELECT * FROM t WHERE ftime='2017-5-1';<br/>(Blocked) | SHOW PROCESSLIST; |

```sql
mysql> SHOW PROCESSLIST;
+----+------+-----------+------+---------+------+------------------------------+----------------------------------------------------+
| Id | User | Host      | db   | Command | Time | State                        | Info                                               |
+----+------+-----------+------+---------+------+------------------------------+----------------------------------------------------+
|  2 | root | localhost | test | Query   |   49 | User sleep                   | UPDATE t SET c=SLEEP(100) WHERE ftime='2017-04-01' |
|  3 | root | localhost | test | Query   |   27 | Waiting for table level lock | SELECT * FROM t WHERE ftime='2017-5-1'             |
|  4 | root | localhost | test | Query   |    0 | starting                     | SHOW PROCESSLIST                                   |
+----+------+-----------+------+---------+------+------------------------------+----------------------------------------------------+
```

1. 对于MyISAM引擎来说，分区表是4个表
2. MyISAM**只支持表锁**，_**MyISAM的表锁是在引擎层实现的**_，session A加的表锁，其实是锁在分区`p_2018`上

## 手工分表 VS 分区表
1. 手工分表的逻辑，找到所有需要更新的分表，然后依次更新，**在性能上**，与分区表并**没有实质的差别**
2. 分区表由**Server层**决定使用哪个分区，手工分表由**应用代码**决定使用哪一个分表

## 分区策略
1. 每当**第一次**访问一个分区表的时候，MySQL需要把**所有的分区**都访问一遍
    - 如果一个分区表的分区很多，比如超过了1000个
    - 在MySQL启动时，如果需要打开的文件超过了`open_files_limit`，就会报错
    - 实际只需要访问一个分区，但语句却无法执行（MyISAM才会如此，InnoDB采用本地分区策略）

<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-partition-table-over-open-files-limit.png" width=800/>

### MyISAM
1. MyISAM分区表使用的分区策略是**通用分区策略**（generic partitioning）
    - 每次访问分区都由**Server层**控制
2. 通用分区策略是MySQL一开始支持分区表时就存在的代码
    - 在文件管理和表管理的实现上很**粗糙**
    - 同时，还有比较严重的**性能问题**
3. 从MySQL 5.7.17开始，将MyISAM分区表标记为`Deprecated`
4. 从MySQL 8.0开始，不再允许创建MyISAM分区表了，只允许创建已经**实现了本地分区策略的引擎**
    - 目前只有`InnoDB`引擎和`NDB`引擎支持本地分区策略

### InnoDB
1. 从MySQL 5.7.9开始，InnoDB引擎引入了**本地分区表**（native partitioning）
    - 在**InnoDB内部**自己管理打开分区的行为

## Server层行为
从**Server层**来看，_**一个分区表就只是一个表**_

### 操作序列
| session A | session B | session C |
| ---- | ---- | ---- |
| BEGIN;<br/>SELECT * FROM t WHERE ftime='2018-04-01'; | | |
| | ALTER TABLE t TRUNCATE PARTITION p_2017;<br/>(Blocked) | |
| | | SHOW PROCESSLIST; |

```sql
-- session A持有整个表的MDL锁，导致session B被堵住
mysql> SHOW PROCESSLIST;
+----+-----------------+-----------+------+---------+--------+---------------------------------+-----------------------------------------+
| Id | User            | Host      | db   | Command | Time   | State                           | Info                                    |
+----+-----------------+-----------+------+---------+--------+---------------------------------+-----------------------------------------+
|  4 | event_scheduler | localhost | NULL | Daemon  | 137019 | Waiting on empty queue          | NULL                                    |
| 24 | root            | localhost | test | Sleep   |    126 |                                 | NULL                                    |
| 25 | root            | localhost | test | Query   |      0 | starting                        | SHOW PROCESSLIST                        |
| 26 | root            | localhost | test | Query   |      3 | Waiting for table metadata lock | ALTER TABLE t TRUNCATE PARTITION p_2017 |
+----+-----------------+-----------+------+---------+--------+---------------------------------+-----------------------------------------+
```

### 小结
1. MySQL在**第一次**打开分区表的时候，需要**访问所有的分区**
2. 在**Server层**，认为是**同一张表**，因此**所有分区共用同一个MDL锁**
3. 在**引擎层**，认为是**不同的表**，因此拿到**MDL锁**之后，根据分区规则，_**只访问必要的分区**_
    - 必要的分区需要根据SQL语句中的**WHERE条件**和**分区规则**来实现
    - `WHERE ftime='2018-4-1'`，必要分区是`p_2019`分区
    - `WHERE ftime>='2018-4-1'`，必要分区是`p_2019`分区和`p_others`分区
    - 如果查询语句的WHERE条件**没有分区Key**，就只能访问**所有分区**了

## 优势
1. _**对业务透明**_，_**方便清理历史数据**_
2. `DROP TABLE t DROP PARTITION`，与`DELETE`语句删除数据相比，**速度更快**，**对系统影响小**

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
