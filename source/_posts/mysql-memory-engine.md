---
title: MySQL -- Memory引擎
date: 2019-03-14 20:32:44
categories:
    - Storage
    - MySQL
tags:
    - Storage
    - MySQL
---

## 数据组织

### 表初始化
```sql
CREATE TABLE t1 (id INT PRIMARY KEY, c INT) ENGINE=Memory;
CREATE TABLE t2 (id INT PRIMARY KEY, c INT) ENGINE=InnoDB;
INSERT INTO t1 VALUES (1,1),(2,2),(3,3),(4,4),(5,5),(6,6),(7,7),(8,8),(9,9),(0,0);
INSERT INTO t2 VALUES (1,1),(2,2),(3,3),(4,4),(5,5),(6,6),(7,7),(8,8),(9,9),(0,0);
```

<!-- more -->

### 执行语句
```sql
-- 0在最后
mysql> SELECT * FROM t1;
+----+------+
| id | c    |
+----+------+
|  1 |    1 |
|  2 |    2 |
|  3 |    3 |
|  4 |    4 |
|  5 |    5 |
|  6 |    6 |
|  7 |    7 |
|  8 |    8 |
|  9 |    9 |
|  0 |    0 |
+----+------+

-- 0在最前
mysql> SELECT * FROM t2;
+----+------+
| id | c    |
+----+------+
|  0 |    0 |
|  1 |    1 |
|  2 |    2 |
|  3 |    3 |
|  4 |    4 |
|  5 |    5 |
|  6 |    6 |
|  7 |    7 |
|  8 |    8 |
|  9 |    9 |
+----+------+
```

### 组织形式
1. **索引组织表**（Index Organizied Table）：InnoDB引擎把数据放在主键索引上，其它索引上保存主键ID
2. **堆组织表**（Heap Organizied Table）：Memory引擎把数据**单独存放**，索引上保存**数据位置**

#### 索引组织表
t2的数据组织方式，主键索引上的值是**有序存储**的，执行`SELECT *`时，按叶子节点从左到右扫描
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-memory-engine-index-organizied.jpg" width=800/>


#### 堆组织表
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-memory-engine-heap-organizied.jpg" width=800/>

1. Memory引擎的数据和索引是**分开存储**的
    - 数据部分以**数组**的方式单独存放，主键索引（采用**哈希索引**）存的是**数据位置**
2. 在t1上执行`SELECT *`时，走的也是**全表扫描**，即**顺序扫描整个数组**，因此0是最后一个被读到的
3. t1的主键索引是**哈希索引**，如果是**范围查询**，需要走**全表扫描**，例如`SELECT * FROM t1 WHERE id<5`
4. Memory表也支持B-Tree索引

##### B-Tree索引
```sql
ALTER TABLE t1 ADD INDEX a_btree_index USING BTREE (id);
```
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-memory-engine-btree.jpg" width=800/>

```sql
-- 优化器选择了a_btree_index索引
mysql> EXPLAIN SELECT * FROM t1 WHERE id<5;
+----+-------------+-------+------------+-------+-----------------------+---------------+---------+------+------+----------+-------------+
| id | select_type | table | partitions | type  | possible_keys         | key           | key_len | ref  | rows | filtered | Extra       |
+----+-------------+-------+------------+-------+-----------------------+---------------+---------+------+------+----------+-------------+
|  1 | SIMPLE      | t1    | NULL       | range | PRIMARY,a_btree_index | a_btree_index | 4       | NULL |    6 |   100.00 | Using where |
+----+-------------+-------+------------+-------+-----------------------+---------------+---------+------+------+----------+-------------+

-- 0在最前面
mysql> SELECT * FROM t1 WHERE id<5;
+----+------+
| id | c    |
+----+------+
|  0 |    0 |
|  1 |    1 |
|  2 |    2 |
|  3 |    3 |
|  4 |    4 |
+----+------+

-- 强制走主键索引，为哈希索引，走全表扫描
mysql> SELECT * FROM t1 FORCE INDEX(PRIMARY) WHERE id<5;
+----+------+
| id | c    |
+----+------+
|  1 |    1 |
|  2 |    2 |
|  3 |    3 |
|  4 |    4 |
|  0 |    0 |
+----+------+
```

#### 对比
1. InnoDB的数据总是**有序存放**的，而内存表的数据是按照**写入顺序**存放的
2. 当数据文件有空洞时
    - InnoDB表在插入新数据时，为了保证数据的有序性，只能在**固定位置**写入新值
    - 而Memory表**只要找到空位**就可以插入新值
3. 数据位置发生变化时，InnoDB只需要修改**主键索引**，而Memory表需要修改**所有索引**
4. 数据查找
    - InnoDB表利用主键查找需要走一次索引查找，用辅助索引查找需要走两次索引查找
    - Memory表中所有索引的地位都是相同的
5. 变长数据类型
    - InnoDB表支持变长数据类型
    - Memory表不支持`BLOB`和`TEXT`类型
        - 即使定义了`VARCHAR(N)`，实际也会当做`CHAR(N)`，**固定长度**
        - 因此Memory表的**每行数据长度相同**
        - 每个数据被删除后，空出的位置可以被接下来要插入的数据复用

```sql
DELETE FROM t1 WHERE id=5;
INSERT INTO t1 VALUES (10,10);

mysql> SELECT * FROM t1;
+----+------+
| id | c    |
+----+------+
|  1 |    1 |
|  2 |    2 |
|  3 |    3 |
|  4 |    4 |
| 10 |   10 |
|  6 |    6 |
|  7 |    7 |
|  8 |    8 |
|  9 |    9 |
|  0 |    0 |
+----+------+
```

## 缺点
不推荐在**生产环境**使用Memory表

### 锁粒度
Memory表不支持行锁，**只支持表锁**（并不是MDL锁），**对并发访问的支持不够好**

| session A | session B | session C |
| ---- | ---- | ---- |
| UPDATE t1 SET id=SLEEP(50) WHERE id=1; | | |
| | SELECT * FROM t1 WHERE id=2;<br/>(Wait 50s) | |
| | | SHOW PROCESSLIST; |

```sql
mysql> SHOW PROCESSLIST;
+----+-----------------+-----------+------+---------+--------+------------------------------+---------------------------------------+
| Id | User            | Host      | db   | Command | Time   | State                        | Info                                  |
+----+-----------------+-----------+------+---------+--------+------------------------------+---------------------------------------+
|  4 | event_scheduler | localhost | NULL | Daemon  | 206928 | Waiting on empty queue       | NULL                                  |
| 21 | root            | localhost | test | Query   |     27 | User sleep                   | UPDATE t1 SET id=SLEEP(50) WHERE id=1 |
| 22 | root            | localhost | test | Query   |     16 | Waiting for table level lock | SELECT * FROM t1 WHERE id=2           |
| 23 | root            | localhost | test | Query   |      0 | starting                     | SHOW PROCESSLIST                      |
+----+-----------------+-----------+------+---------+--------+------------------------------+---------------------------------------+
```

### 数据持久化
数据库重启后，所有的Memory表都会被清空

#### Master-Slave架构
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-memory-engine-master-slave.jpg" width=600/>

1. 业务正常访问主库
2. 备库硬件升级，备库重启，内存表t1被清空
3. 备库重启后，应用日志线程执行一条`UPDATE t1`的语句，备库会报错，导致**主备同步停止**
4. 如果期间发生**主备切换**，客户端会看到t1的数据丢失了

#### Master-Master架构
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-memory-engine-master-master.jpg" width=600/>

1. MySQL知道重启后，Memory表的数据会丢失，所以担心主库重启后，会出现主备不一致
    - 在数据库重启之后，自动往binlog里面写一行`DELETE FROM t1`
2. 在备库重启时，备库binlog的`DELETE`语句会传到主库，然后**主库Memory表的内容被莫名其妙地删除了**

### 选择InnoDB
1. 如果表的更新量很大，那么**并发度**是一个很重要的参考指标，**InnoDB支持行锁**
2. 能放到Memory表的数据量都不大，InnoDB也有`Buffer Pool`，**读性能也不差**
3. 建议将**普通Memory表**替换成**InnoDB表**
4. 例外场景：在数据量可控，可以采用**内存临时表**，例如JOIN优化里面的临时表优化
    - `CREATE TEMPORARY TABLE ... ENGINE=Memory`

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
