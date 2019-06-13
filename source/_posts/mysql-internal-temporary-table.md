---
title: MySQL -- 内部临时表
date: 2019-03-13 09:12:45
categories:
    - MySQL
tags:
    - MySQL
---

## UNION
UNION语义：取两个子查询结果的**并集**，重复的行只保留一行

### 表初始化
```sql
CREATE TABLE t1(id INT PRIMARY KEY, a INT, b INT, INDEX(a));
DELIMITER ;;
CREATE PROCEDURE idata()
BEGIN
    DECLARE i INT;

    SET i=1;
    WHILE (i<= 1000) DO
        INSERT INTO t1 VALUES (i,i,i);
        SET i=i+1;
    END WHILE;
END;;
DELIMITER ;
CALL idata();
```

<!-- more -->

### 执行语句
```sql
(SELECT 1000 AS f) UNION (SELECT id FROM t1 ORDER BY id DESC LIMIT 2);

mysql> EXPLAIN (SELECT 1000 AS f) UNION (SELECT id FROM t1 ORDER BY id DESC LIMIT 2);
+----+--------------+------------+------------+-------+---------------+---------+---------+------+------+----------+----------------------------------+
| id | select_type  | table      | partitions | type  | possible_keys | key     | key_len | ref  | rows | filtered | Extra                            |
+----+--------------+------------+------------+-------+---------------+---------+---------+------+------+----------+----------------------------------+
|  1 | PRIMARY      | NULL       | NULL       | NULL  | NULL          | NULL    | NULL    | NULL | NULL |     NULL | No tables used                   |
|  2 | UNION        | t1         | NULL       | index | NULL          | PRIMARY | 4       | NULL |    2 |   100.00 | Backward index scan; Using index |
| NULL | UNION RESULT | <union1,2> | NULL       | ALL   | NULL          | NULL    | NULL    | NULL | NULL |     NULL | Using temporary                  |
+----+--------------+------------+------------+-------+---------------+---------+---------+------+------+----------+----------------------------------+
```
1. 第二行的`Key=PRIMARY`，说明第二个子查询用到了索引id
2. 第三行的Extra字段为`Using temporary`
    - 表示在对子查询的结果做`UNION RESULT`的时候，使用了**临时表**

### UNION RESULT
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-union-procedure.jpg" width=800/>

1. 创建一个**内存临时表**，这个内存临时表只有一个整型字段f，并且f为**主键**
2. 执行第一个子查询，得到1000，并存入内存临时表中
3. 执行第二个子查询
    - 拿到第一行id=1000，试图插入到内存临时表，但由于1000这个值已经存在于内存临时表
        - **违反唯一性约束**，插入失败，继续执行
    - 拿到第二行id=999，插入内存临时表成功
4. 从内存临时表中按行取出数据，返回结果，并**删除内存临时表**，结果中包含id=1000和id=999两行
5. 内存临时表起到了**暂存数据**的作用，还用到了内存临时表主键id的**唯一性约束**，实现UNION的语义

### UNION ALL
`UNION ALL`没有**去重**的语义，一次执行子查询，得到的结果直接发给客户端，**不需要内存临时表**
```sql
mysql> EXPLAIN (SELECT 1000 AS f) UNION ALL (SELECT id FROM t1 ORDER BY id DESC LIMIT 2);
+----+-------------+-------+------------+-------+---------------+---------+---------+------+------+----------+----------------------------------+
| id | select_type | table | partitions | type  | possible_keys | key     | key_len | ref  | rows | filtered | Extra                            |
+----+-------------+-------+------------+-------+---------------+---------+---------+------+------+----------+----------------------------------+
|  1 | PRIMARY     | NULL  | NULL       | NULL  | NULL          | NULL    | NULL    | NULL | NULL |     NULL | No tables used                   |
|  2 | UNION       | t1    | NULL       | index | NULL          | PRIMARY | 4       | NULL |    2 |   100.00 | Backward index scan; Using index |
+----+-------------+-------+------------+-------+---------------+---------+---------+------+------+----------+----------------------------------+
```

## GROUP BY

### 内存充足
```sql
-- 16777216 Bytes = 16 MB
mysql> SHOW VARIABLES like '%tmp_table_size%';
+----------------+----------+
| Variable_name  | Value    |
+----------------+----------+
| tmp_table_size | 16777216 |
+----------------+----------+
```

#### 执行语句
```sql
-- MySQL 5.6上执行
mysql> EXPLAIN SELECT id%10 AS m, COUNT(*) AS c FROM t1 GROUP BY m;
+----+-------------+-------+-------+---------------+------+---------+------+------+----------------------------------------------+
| id | select_type | table | type  | possible_keys | key  | key_len | ref  | rows | Extra                                        |
+----+-------------+-------+-------+---------------+------+---------+------+------+----------------------------------------------+
|  1 | SIMPLE      | t1    | index | PRIMARY,a     | a    | 5       | NULL | 1000 | Using index; Using temporary; Using filesort |
+----+-------------+-------+-------+---------------+------+---------+------+------+----------------------------------------------+

mysql> SELECT id%10 AS m, COUNT(*) AS c FROM t1 GROUP BY m;
+------+-----+
| m    | c   |
+------+-----+
|    0 | 100 |
|    1 | 100 |
|    2 | 100 |
|    3 | 100 |
|    4 | 100 |
|    5 | 100 |
|    6 | 100 |
|    7 | 100 |
|    8 | 100 |
|    9 | 100 |
+------+-----+
```
1. `Using index`：表示使用了**覆盖索引**，选择了索引a，不需要回表
2. `Using temporary`：表示使用了**临时表**
3. `Using filesort`：表示需要**排序**

#### 执行过程
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-group-by-temporary-table.jpg" width=800/>

1. 创建**内存临时表**，表里有两个字段m和c，m为主键
2. 扫描t1的索引a，依次取出叶子节点上的id值，计算id%10，记为x
    - 如果内存临时表中没有主键为x的行，插入一行记录`(x,1)`
    - 如果内存临时表中有主键为x的行，将x这一行的c值加1
3. 遍历完成后，再根据字段m做排序，得到结果集返回给客户端

#### 排序过程
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-group-by-temporary-table-sort.jpg" width=800/>


#### ORDER BY NULL
```sql
-- 跳过最后的排序阶段，直接从临时表中取回数据
mysql> EXPLAIN SELECT id%10 AS m, COUNT(*) AS c FROM t1 GROUP BY m ORDER BY NULL;
+----+-------------+-------+-------+---------------+------+---------+------+------+------------------------------+
| id | select_type | table | type  | possible_keys | key  | key_len | ref  | rows | Extra                        |
+----+-------------+-------+-------+---------------+------+---------+------+------+------------------------------+
|  1 | SIMPLE      | t1    | index | PRIMARY,a     | a    | 5       | NULL | 1000 | Using index; Using temporary |
+----+-------------+-------+-------+---------------+------+---------+------+------+------------------------------+

-- t1中的数据是从1开始的
mysql> SELECT id%10 AS m, COUNT(*) AS c FROM t1 GROUP BY m ORDER BY NULL;
+------+-----+
| m    | c   |
+------+-----+
|    1 | 100 |
|    2 | 100 |
|    3 | 100 |
|    4 | 100 |
|    5 | 100 |
|    6 | 100 |
|    7 | 100 |
|    8 | 100 |
|    9 | 100 |
|    0 | 100 |
+------+-----+
```

### 内存不足
```sql
SET tmp_table_size=1024;
```

#### 执行语句
```sql
-- 内存临时表的上限为1024 Bytes，但内存临时表不能完全放下100行数据，内存临时表会转成磁盘临时表，默认采用InnoDB引擎
-- 如果t1很大，这个查询需要的磁盘临时表就会占用大量的磁盘空间
mysql> SELECT id%100 AS m, count(*) AS c FROM t1 GROUP BY m ORDER BY NULL LIMIT 10;
+------+----+
| m    | c  |
+------+----+
|    1 | 10 |
|    2 | 10 |
|    3 | 10 |
|    4 | 10 |
|    5 | 10 |
|    6 | 10 |
|    7 | 10 |
|    8 | 10 |
|    9 | 10 |
|   10 | 10 |
+------+----+
```

#### 优化方案

##### 优化索引
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-group-by-opt-index.jpg" width=800/>

1. 不论使用内存临时表还是磁盘临时表，`GROUP BY`都需要构造一个带**唯一索引**的表，_**执行代价较高**_
2. 需要临时表的原因：每一行的`id%100`是无序的，因此需要临时表，来记录并统计结果
3. 如果可以确保输入的数据是有序的，那么计算`GROUP BY`时，只需要**从左到右顺序扫描**，依次累加即可
    - 当碰到第一个1的时候，已经累积了X个0，结果集里的第一行为`(0,X)`
    - 当碰到第一个2的时候，已经累积了Y个1，结果集里的第一行为`(1,Y)`
    - 整个过程不需要**临时表**，也不需要**排序**

```sql
-- MySQL 5.7上执行
ALTER TABLE t1 ADD COLUMN z INT GENERATED ALWAYS AS(id % 100), ADD INDEX(z);

-- 使用了覆盖索引，不需要临时表，也不需要排序
mysql> EXPLAIN SELECT z, COUNT(*) AS c FROM t1 GROUP BY z;
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+-------------+
| id | select_type | table | partitions | type  | possible_keys | key  | key_len | ref  | rows | filtered | Extra       |
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+-------------+
|  1 | SIMPLE      | t1    | NULL       | index | z             | z    | 5       | NULL | 1000 |   100.00 | Using index |
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+-------------+
```

##### 直接排序
1. 一个`GROUP BY`语句需要放到临时表的数据量**特别大**，还是按照先放在内存临时表，再退化成磁盘临时表
2. **可以直接用磁盘临时表的形式**，在`GROUP BY`语句中`SQL_BIG_RESULT`（告诉优化器涉及的数据量很大）
3. 磁盘临时表原本采用B+树存储，**存储效率还不如数组**，优化器看到`SQL_BIG_RESULT`，**会直接用数组存储**
    - 即放弃使用临时表，_**直接进入排序阶段**_

###### 执行过程
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-group-by-opt-direct-sort.jpg" width=800/>

```sql
-- 没有再使用临时表，而是直接使用了排序算法
mysql> EXPLAIN SELECT SQL_BIG_RESULT id%100 AS m, COUNT(*) AS c FROM t1 GROUP BY m;
+----+-------------+-------+-------+---------------+------+---------+------+------+-----------------------------+
| id | select_type | table | type  | possible_keys | key  | key_len | ref  | rows | Extra                       |
+----+-------------+-------+-------+---------------+------+---------+------+------+-----------------------------+
|  1 | SIMPLE      | t1    | index | PRIMARY,a     | a    | 5       | NULL | 1000 | Using index; Using filesort |
+----+-------------+-------+-------+---------------+------+---------+------+------+-----------------------------+
```
1. 初始化`sort_buffer`，确定放入一个整型字段，记为m
2. 扫描t1的索引a，依次取出里面的id值，将id%100的值放入`sort_buffer`
3. 扫描完成后，对`sort_buffer`的字段m做排序（sort_buffer内存不够时，会利用**磁盘临时文件**辅助排序）
4. 排序完成后，得到一个有序数组，遍历有序数组，得到每个值出现的次数（类似上面优化索引的方式）

### 对比DISTINCT
```sql
-- 标准SQL，SELECT部分添加一个聚合函数COUNT(*)
SELECT a,COUNT(*) FROM t GROUP BY a ORDER BY NULL;
-- 非标准SQL
SELECT a FROM t GROUP BY a ORDER BY NULL;

SELECT DISTINCT a FROM t;
```
1. 标准SQL：按照字段a分组，计算每组a出现的次数
2. 非标准SQL：没有了`COUNT(*)`，不再需要执行计算总数的逻辑
    - 按照字段a分组，相同的a的值只返回一行，与`DISTINCT`语义一致
3. 如果不需要执行**聚合函数**，`DISTINCT`和`GROUP BY`的语义、执行流程和执行性能是相同的
    - 创建一个**临时表**，临时表有一个字段a，并且在这个字段a上创建一个**唯一索引**
    - 遍历表t，依次取出数据插入临时表中
        - 如果发现唯一键冲突，就跳过
        - 否则插入成功
    - 遍历完成后，将临时表作为结果集返回给客户端

## 小结
1. 用到内部临时表的场景
    - 如果语句执行过程中可以一边读数据，一边得到结果，是不需要额外内存的
    - 否则需要额外内存来保存中间结果
2. `join_buffer`是**无序数组**，`sort_buffer`是**有序数组**，临时表是**二维表结构**
3. 如果执行逻辑需要用到**二维表特性**，就会优先考虑使用**临时表**
4. 如果对`GROUP BY`语句的结果没有明确的排序要求，加上`ORDER BY NULL`（MySQL 5.6）
5. 尽量让`GROUP BY`过程**用上索引**，**确认EXPLAIN结果没有`Using temporary`和`Using filesort`**
6. 如果`GROUP BY`需要统计的数据量不大，尽量使用**内存临时表**（可以适当调大`tmp_table_size`）
7. 如果数据量实在**太大**，使用`SQL_BIG_RESULT`来告诉优化器**直接使用排序算法**（跳过临时表）

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
