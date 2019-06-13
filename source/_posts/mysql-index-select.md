---
title: MySQL -- 索引选择
date: 2019-01-30 09:53:16
categories:
    - MySQL
tags:
    - MySQL
---

## 优化器
1. 优化器的重要职责：_**选择索引**_
    - 目的是寻找**最优**的执行方案
    - 大多数时候，优化器都能找到正确的索引
2. 在数据库里面，决定**执行代价**的因素
    - _**扫描行数**_ -- 本文关注点
    - 是否使用**临时表**
    - 是否**排序**
3. MySQL在真正开始执行语句之前，并不能精确地知道满足条件的记录有多少
    - 只能根据**统计信息**（**索引的区分度**）来**估算**记录数
    - **基数越大（不同的值越多），索引的区分度越好**
4. 统计信息中索引的基数是**不准确**的

<!-- more -->

```sql
mysql> SHOW INDEX FROM t;
+-------+------------+----------+--------------+-------------+-----------+-------------+----------+--------+------+------------+---------+---------------+---------+
| Table | Non_unique | Key_name | Seq_in_index | Column_name | Collation | Cardinality | Sub_part | Packed | Null | Index_type | Comment | Index_comment | Visible |
+-------+------------+----------+--------------+-------------+-----------+-------------+----------+--------+------+------------+---------+---------------+---------+
| t     |          0 | PRIMARY  |            1 | id          | A         |      100256 |     NULL |   NULL |      | BTREE      |         |               | YES     |
| t     |          1 | a        |            1 | a           | A         |      100512 |     NULL |   NULL | YES  | BTREE      |         |               | YES     |
| t     |          1 | b        |            1 | b           | A         |      100512 |     NULL |   NULL | YES  | BTREE      |         |               | YES     |
+-------+------------+----------+--------------+-------------+-----------+-------------+----------+--------+------+------------+---------+---------------+---------+
```

### 基数统计
1. 方法：_**采样统计**_
2. 基数：InnoDB默认选择**N**个数据页，统计这些页上的不同值，得到一个**平均值**，然后再乘以**索引的页面数**
3. 当数据表**变更的数据行**超过**1/M**时，会**自动触发**索引的采样统计
4. 索引统计信息的存储，参数控制`innodb_stats_persistent`
    - ON：持久化存储统计信息，N=20，M=10
    - OFF：统计信息只会存储在内存中，N=8，M=16
5. 手动触发索引的采样统计：_**`ANALYZE TABLE t;`**_
    - 使用场景：当explain预估的rows与实际情况差距较大时

```sql
mysql> SHOW VARIABLES LIKE '%innodb_stats_persistent%';
+--------------------------------------+-------+
| Variable_name                        | Value |
+--------------------------------------+-------+
| innodb_stats_persistent              | ON    |
| innodb_stats_persistent_sample_pages | 20    |
+--------------------------------------+-------+
```

## 表初始化

### 建表
```sql
CREATE TABLE `t` (
    `id` INT(11) NOT NULL,
    `a` INT(11) DEFAULT NULL,
    `b` INT(11) DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `a` (`a`),
    KEY `b` (`b`)
) ENGINE=InnoDB;
```

### 表初始化
```sql
# 存储过程
DELIMITER //
CREATE PROCEDURE idata()
BEGIN
    DECLARE i INT;
    SET i=1;
    WHILE (i <= 100000) DO
        INSERT INTO t VALUES (i, i, i);
    SET i=i+1;
    END WHILE;
END//
DELIMITER ;

# 调用存储过程
CALL idata();
```

### 索引树
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-index-select.png" width=600/>


## 查询

### 常规查询
选择索引`a`，预估的扫描行数为`10001`
```sql
mysql> EXPLAIN SELECT * FROM t WHERE a BETWEEN 10000 AND 20000;
+----+-------------+-------+------------+-------+---------------+------+---------+------+-------+----------+-----------------------+
| id | select_type | table | partitions | type  | possible_keys | key  | key_len | ref  | rows  | filtered | Extra                 |
+----+-------------+-------+------------+-------+---------------+------+---------+------+-------+----------+-----------------------+
|  1 | SIMPLE      | t     | NULL       | range | a             | a    | 5       | NULL | 10001 |   100.00 | Using index condition |
+----+-------------+-------+------------+-------+---------------+------+---------+------+-------+----------+-----------------------+
```

### 索引选择异常
```sql
# 返回空集合
mysql> EXPLAIN SELECT * FROM t WHERE (a BETWEEN 1 AND 1000) AND (b BETWEEN 50000 AND 100000) ORDER BY b LIMIT 1;
+----+-------------+-------+------------+-------+---------------+------+---------+------+-------+----------+------------------------------------+
| id | select_type | table | partitions | type  | possible_keys | key  | key_len | ref  | rows  | filtered | Extra                              |
+----+-------------+-------+------------+-------+---------------+------+---------+------+-------+----------+------------------------------------+
|  1 | SIMPLE      | t     | NULL       | range | a,b           | b    | 5       | NULL | 50128 |     1.00 | Using index condition; Using where |
+----+-------------+-------+------------+-------+---------------+------+---------+------+-------+----------+------------------------------------+

mysql> SELECT * FROM t WHERE (a BETWEEN 1 AND 1000) AND (b BETWEEN 50000 AND 100000) ORDER BY b LIMIT 1;
Empty set (0.07 sec)

# Time: 2019-01-30T11:32:31.335272Z
# User@Host: root[root] @ localhost []  Id:     8
# Query_time: 0.046896  Lock_time: 0.000141 Rows_sent: 0  Rows_examined: 50001
SET timestamp=1548847951;
SELECT * FROM t WHERE (a BETWEEN 1 AND 1000) AND (b BETWEEN 50000 AND 100000) ORDER BY b LIMIT 1;
```
1. 如果使用索引`a`进行查询
    - 扫描索引`a`的前1000个值，取得对应的id，再到**聚簇索引**上查出每一行，然后根据字段b来过滤，需要扫描1000行
2. 如果使用索引`b`进行查询
    - 扫描索引`b`的最后50001个值，与上面的过程类似，需要扫描50001行
    - 优化器的异常选择，预估的扫描行数依然**不准确**
    - 之前优化器选择索引`b`，是认为使用索引b能够**避免排序**，所以即使扫描行数多，也认为代价较小
        - `Extra`没有`Using filesort`

### force index
代码不优雅
```sql
mysql> EXPLAIN SELECT * FROM t FORCE INDEX(a) WHERE (a BETWEEN 1 AND 1000) AND (b BETWEEN 50000 AND 100000) ORDER BY b LIMIT 1;
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+----------------------------------------------------+
| id | select_type | table | partitions | type  | possible_keys | key  | key_len | ref  | rows | filtered | Extra                                              |
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+----------------------------------------------------+
|  1 | SIMPLE      | t     | NULL       | range | a             | a    | 5       | NULL | 1000 |    11.11 | Using index condition; Using where; Using filesort |
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+----------------------------------------------------+

mysql> SELECT * FROM t FORCE INDEX(a) WHERE (a BETWEEN 1 AND 1000) AND (b BETWEEN 50000 AND 100000) ORDER BY b LIMIT 1;
Empty set (0.00 sec)

# Time: 2019-01-30T11:32:45.938128Z
# User@Host: root[root] @ localhost []  Id:     8
# Query_time: 0.001304  Lock_time: 0.000148 Rows_sent: 0  Rows_examined: 1000
SET timestamp=1548847965;
SELECT * FROM t FORCE INDEX(a) WHERE (a BETWEEN 1 AND 1000) AND (b BETWEEN 50000 AND 100000) ORDER BY b LIMIT 1;
```

### order by b,a
不通用
```sql
mysql> EXPLAIN SELECT * FROM t WHERE (a BETWEEN 1 AND 1000) AND (b BETWEEN 50000 AND 100000) ORDER BY b,a LIMIT 1;
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+----------------------------------------------------+
| id | select_type | table | partitions | type  | possible_keys | key  | key_len | ref  | rows | filtered | Extra                                              |
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+----------------------------------------------------+
|  1 | SIMPLE      | t     | NULL       | range | a,b           | a    | 5       | NULL | 1000 |    50.00 | Using index condition; Using where; Using filesort |
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+----------------------------------------------------+

mysql> SELECT * FROM t WHERE (a BETWEEN 1 AND 1000) AND (b BETWEEN 50000 AND 100000) ORDER BY b,a LIMIT 1;
Empty set (0.01 sec)

# Time: 2019-01-30T13:53:18.233163Z
# User@Host: root[root] @ localhost []  Id:     8
# Query_time: 0.000609  Lock_time: 0.000191 Rows_sent: 1  Rows_examined: 0
SET timestamp=1548856398;
EXPLAIN SELECT * FROM t WHERE (a BETWEEN 1 AND 1000) AND (b BETWEEN 50000 AND 100000) ORDER BY b,a LIMIT 1;
```
1. `order by b,a`要求按照b,a排序，那**扫描行数**成为了影响优化器**决策的主要条件**，此时会选择只需扫描1000行的索引`a`
2. 但这并非通用优化手段，只是恰好`order by b limit 1`和`order by b,a limit 1`都是返回b中最小的一行，语义一致而已

### limit 100
不通用
```sql
mysql> EXPLAIN SELECT * FROM (SELECT * FROM t WHERE (a BETWEEN 1 AND 1000) AND (b BETWEEN 50000 AND 100000) ORDER BY b LIMIT 100) alias LIMIT 1;
+----+-------------+------------+------------+-------+---------------+------+---------+------+------+----------+----------------------------------------------------+
| id | select_type | table      | partitions | type  | possible_keys | key  | key_len | ref  | rows | filtered | Extra                                              |
+----+-------------+------------+------------+-------+---------------+------+---------+------+------+----------+----------------------------------------------------+
|  1 | PRIMARY     | <derived2> | NULL       | ALL   | NULL          | NULL | NULL    | NULL |  100 |   100.00 | NULL                                               |
|  2 | DERIVED     | t          | NULL       | range | a,b           | a    | 5       | NULL | 1000 |    50.00 | Using index condition; Using where; Using filesort |
+----+-------------+------------+------------+-------+---------------+------+---------+------+------+----------+----------------------------------------------------+
```
`limit 100`：根据数据特征来**诱导**优化器，让优化器意识到使用索引`b`的**代价很高**，同样不具有通用性

### 其他办法
1. **新建一个更合适的索引**
2. **删除误用的索引**

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
