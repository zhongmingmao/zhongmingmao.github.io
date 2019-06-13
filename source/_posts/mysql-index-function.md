---
title: MySQL -- 索引上的函数
date: 2019-02-12 13:25:33
categories:
    - MySQL
tags:
    - MySQL
---

## 结论先行
如果对**索引字段**做**函数**操作，可能会**破坏索引值的有序性**，因此**优化器**会决定**放弃**走**树搜索**功能

## 条件字段函数操作

### 交易日志表
```sql
CREATE TABLE `tradelog` (
    `id` INT(11) NOT NULL,
    `tradeid` VARCHAR(32) DEFAULT NULL,
    `operator` INT(11) DEFAULT NULL,
    `t_modified` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `tradeid` (`tradeid`),
    KEY `t_modified` (`t_modified`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

<!-- more -->

```sql
-- 94608000 = 3 * 365 * 24 * 3600
-- t_modified : 2016-01-01 00:00:00 ~ 2019-01-01 00:00:00
DELIMITER ;;
CREATE PROCEDURE tdata()
BEGIN
    DECLARE i INT;
    SET i=0;
    WHILE i<1000000 DO
        INSERT INTO tradelog VALUES (i,i,i,FROM_UNIXTIME(UNIX_TIMESTAMP('2016-01-01 00:00:00')+FLOOR(0+(RAND()*94608000))));
        SET i=i+1;
    END WHILE;
END;;
DELIMITER ;

CALL tdata();
```

### month函数
```sql
SELECT COUNT(*) FROM tradelog WHERE MONTH(t_modified)=7;
```

#### explain
```sql
mysql> EXPLAIN SELECT COUNT(*) FROM tradelog WHERE MONTH(t_modified)=7\G;
*************************** 1. row ***************************
           id: 1
  select_type: SIMPLE
        table: tradelog
   partitions: NULL
         type: index
possible_keys: NULL
          key: t_modified
      key_len: 6
          ref: NULL
         rows: 998838
     filtered: 100.00
        Extra: Using where; Using index
```
1. `key=t_modified`：优化器选择了遍历二级索引`t_modified`
2. `type=index`：表示**全索引扫描**（二级索引）
3. `rows=998,838≈1,000,000`：说明这条语句基本**扫描**了整个二级索引`t_modified`
4. `Using index`：表示使用了**覆盖索引**（**无需回表**）
5. 在索引字段`t_modified`上加上`MONTH`函数，导致了**全索引扫描**，无法使用**树搜索**功能

#### slowlog
`Rows_examined=1,000,000`，佐证了**全索引扫描**
```sql
# Time: 2019-02-12T14:25:07.158350+08:00
# User@Host: root[root] @ localhost []  Id:    13
# Query_time: 0.208787  Lock_time: 0.000162 Rows_sent: 1  Rows_examined: 1000000
SET timestamp=1549952707;
SELECT COUNT(*) FROM tradelog WHERE MONTH(t_modified)=7;
```

#### 分析
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-index-function-month.png" width=600/>

1. `WHERE t_modified='2018-07-01'`，InnoDB会按照绿色箭头的路线找到结果（树搜索）
    - 这源于B+树的特性：**同一层兄弟节点的有序性**
2. `WHERE MONTH(t_modified)=7`，在树的第一层就不知道如何操作，因此**优化器放弃了树搜索功能**
    - 优化器可以选择遍历**聚簇索引**，或者遍历**二级索引**`t_modified`
    - 优化器在对比索引大小后发现，二级索引`t_modified`更小，最终选择了遍历二级索引`t_modified`

### 优化方案
```sql
mysql> SELECT COUNT(*) FROM tradelog WHERE
    -> (t_modified >= '2016-7-1' AND t_modified<'2016-8-1') OR
    -> (t_modified >= '2017-7-1' AND t_modified<'2017-8-1') OR
    -> (t_modified >= '2018-7-1' AND t_modified<'2018-8-1');
```

#### explain
```sql
mysql> EXPLAIN SELECT COUNT(*) FROM tradelog WHERE
    -> (t_modified >= '2016-7-1' AND t_modified<'2016-8-1') OR
    -> (t_modified >= '2017-7-1' AND t_modified<'2017-8-1') OR
    -> (t_modified >= '2018-7-1' AND t_modified<'2018-8-1')\G;
*************************** 1. row ***************************
           id: 1
  select_type: SIMPLE
        table: tradelog
   partitions: NULL
         type: range
possible_keys: t_modified
          key: t_modified
      key_len: 6
          ref: NULL
         rows: 180940
     filtered: 100.00
        Extra: Using where; Using index
```
1. `type=range`：表示**索引范围扫描**（二级索引）
2. `rows=180,940 < 998,838`，扫描行数**远小于**上面使用`MONTH`函数的情况

#### slowlog
`Rows_examined=84,704 < 1,000,000`，`Query_time`也仅为使用`MONTH`函数情况的**25%**
```sql
# Time: 2019-02-12T14:56:51.727672+08:00
# User@Host: root[root] @ localhost []  Id:    13
# Query_time: 0.051701  Lock_time: 0.000239 Rows_sent: 1  Rows_examined: 84704
SET timestamp=1549954611;
SELECT COUNT(*) FROM tradelog WHERE (t_modified >= '2016-7-1' AND t_modified<'2016-8-1') OR (t_modified >= '2017-7-1' AND t_modified<'2017-8-1') OR (t_modified >= '2018-7-1' AND t_modified<'2018-8-1');
```

### id+1
```sql
mysql> explain select * from tradelog where id+1 = 1000000\G;
*************************** 1. row ***************************
           id: 1
  select_type: SIMPLE
        table: tradelog
   partitions: NULL
         type: ALL
possible_keys: NULL
          key: NULL
      key_len: NULL
          ref: NULL
         rows: 998838
     filtered: 100.00
        Extra: Using where

mysql> EXPLAIN SELECT * FROM tradelog WHERE id = 999999\G;
*************************** 1. row ***************************
           id: 1
  select_type: SIMPLE
        table: tradelog
   partitions: NULL
         type: const
possible_keys: PRIMARY
          key: PRIMARY
      key_len: 4
          ref: const
         rows: 1
     filtered: 100.00
        Extra: NULL
```
1. 优化器会偷懒，依然认为`id+1=1,000,000`是应用在索引字段上的函数，因此采用的是**全表扫描**
2. 而`id=999,999`会走**聚簇索引**的**树搜索**，`const`表示这是**常量**操作（最多只会有一行记录匹配）

## 隐式类型转换

### 字符串 -> 数字
在MySQL中，如果字符串和数字做比较，会先**将字符串转换为数字**
```sql
mysql> SELECT '10' > 9;
+----------+
| '10' > 9 |
+----------+
|        1 |
+----------+
```

### tradeid

#### explain
```sql
mysql> EXPLAIN SELECT * FROM tradelog WHERE tradeid=625912\G;
*************************** 1. row ***************************
           id: 1
  select_type: SIMPLE
        table: tradelog
   partitions: NULL
         type: ALL
possible_keys: tradeid
          key: NULL
      key_len: NULL
          ref: NULL
         rows: 998838
     filtered: 10.00
        Extra: Using where
```
1. `type=ALL`：表示**全表扫描**
2. `rows=998,838≈1,000,000`
3. 等价于`SELECT * FROM tradelog WHERE CAST(tradid AS SIGNED INT)=625912;`
    - 隐式的类型转换，导致会在索引字段上做函数操作，优化器会放弃走树搜索的功能

#### slowlog
`Rows_examined`依然为`1,000,000`
```sql
# Time: 2019-02-12T15:30:09.033772+08:00
# User@Host: root[root] @ localhost []  Id:    13
# Query_time: 0.312170  Lock_time: 0.000114 Rows_sent: 1  Rows_examined: 1000000
SET timestamp=1549956609;
SELECT * FROM tradelog WHERE tradeid=625912;
```

### id

#### explain
```sql
mysql> EXPLAIN SELECT * FROM tradelog WHERE id='625912'\G;
*************************** 1. row ***************************
           id: 1
  select_type: SIMPLE
        table: tradelog
   partitions: NULL
         type: const
possible_keys: PRIMARY
          key: PRIMARY
      key_len: 4
          ref: const
         rows: 1
     filtered: 100.00
        Extra: NULL
```
1. `type=const`：表示**常量操作**
2. `key=PRIMARY`：走**聚簇索引**的树搜索功能
3. `rows=1`：只需要扫描一行
4. 等价于`SELECT * FROM tradelog WHERE id=CAST('625912' AS SIGNED INT);`
    - 只是在**输入参数**上做隐式类型转换，在索引字段上并没有做函数操作，依然可以走**聚簇索引**的树搜索功能

#### slowlog
`Rows_examined=1`，只需要扫描一行
```sql
# Time: 2019-02-12T15:45:38.222760+08:00
# User@Host: root[root] @ localhost []  Id:    13
# Query_time: 0.000476  Lock_time: 0.000210 Rows_sent: 1  Rows_examined: 1
SET timestamp=1549957538;
SELECT * FROM tradelog WHERE id='625912';
```

## 隐式字符编码转换

### 交易详情表
```sql
-- tradelog的编码为utf8mb4，trade_detail的编码为utf8
CREATE TABLE `trade_detail` (
    `id` INT(11) NOT NULL,
    `tradeid` VARCHAR(32) DEFAULT NULL,
    `trade_step` INT(11) DEFAULT NULL,
    `step_info` VARCHAR(32) DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `tradeid` (`tradeid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```
```sql
INSERT INTO tradelog VALUES (1, 'aaaaaaaa', 1000, NOW());
INSERT INTO tradelog VALUES (2, 'aaaaaaab', 1000, NOW());
insert into tradelog VALUES (3, 'aaaaaaac', 1000, NOW());

INSERT INTO trade_detail VALUES (1, 'aaaaaaaa', 1, 'add');
INSERT INTO trade_detail VALUES (2, 'aaaaaaaa', 2, 'update');
INSERT INTO trade_detail VALUES (3, 'aaaaaaaa', 3, 'commit');
INSERT INTO trade_detail VALUES (4, 'aaaaaaab', 1, 'add');
INSERT INTO trade_detail VALUES (5, 'aaaaaaab', 2, 'update');
INSERT INTO trade_detail VALUES (6, 'aaaaaaab', 3, 'update again');
INSERT INTO trade_detail VALUES (7, 'aaaaaaab', 4, 'commit');
INSERT INTO trade_detail VALUES (8, 'aaaaaaac', 1, 'add');
INSERT INTO trade_detail VALUES (9, 'aaaaaaac', 2, 'update');
INSERT INTO trade_detail VALUES (10, 'aaaaaaac', 3, 'update again');
INSERT INTO trade_detail VALUES (11, 'aaaaaaac', 4, 'commit');
```

### 函数作用于二级索引

#### explain
```sql
mysql> EXPLAIN SELECT d.* FROM tradelog l, trade_detail d WHERE d.tradeid=l.tradeid AND l.id=2;
+----+-------------+-------+------------+-------+-----------------+---------+---------+-------+------+----------+-------------+
| id | select_type | table | partitions | type  | possible_keys   | key     | key_len | ref   | rows | filtered | Extra       |
+----+-------------+-------+------------+-------+-----------------+---------+---------+-------+------+----------+-------------+
|  1 | SIMPLE      | l     | NULL       | const | PRIMARY,tradeid | PRIMARY | 4       | const |    1 |   100.00 | NULL        |
|  1 | SIMPLE      | d     | NULL       | ALL   | NULL            | NULL    | NULL    | NULL  |   11 |   100.00 | Using where |
+----+-------------+-------+------------+-------+-----------------+---------+---------+-------+------+----------+-------------+
```
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-index-function-char-encode.png" width=500/>

1. `tradelog`称为**驱动表**，`trade_detail`称为**被驱动表**，`tradeid`为**关联字段**。驱动原则：_**小表驱动大表**_
2. 优化器会先在`tradelog`表上查找`id=2`的行，使用了`tradelog`的聚簇索引，只扫描了一行，取出`tradeid='aaaaaaab'`
3. 然后到`trade_detail`表上查找`tradeid='aaaaaaab'`的行，但没有选择**二级索引**`tradeid`，而选择了**全表扫描**
    - `type=ALL`，不符合预期，本希望走二级索引`tradeid`的树搜索功能
    - 原因：两个表的**字符集不相同**
        - `tradelog`的编码为`utf8mb4`，`trade_detail`的编码为`utf8`，
        - `utf8mb4`是`utf8`的超集，详见[mysql中utf8和utf8mb4区别](https://www.cnblogs.com/beyang/p/7580814.html)
        -  `d.tradeid=l.tradeid`时，需要先**将`utf8`字符串转换成`utf8mb4`字符串**
        - 因此，被驱动表`trade_detail`里面的`tradeid`字段需要先转换成`utf8mb4`类型，再跟L2进行比较
    - 等价于`SELECT * FROM trade_detail WHERE CONVERT(traideid USING utf8mb4)=$L2.tradeid.value;`
        - 隐式的**字符编码转换**，导致会在二级索引`tradeid`上做函数操作，优化器会放弃走**树搜索**的功能

#### slowlog
```sql
# Time: 2019-02-12T16:45:14.841502+08:00
# User@Host: root[root] @ localhost []  Id:    13
# Query_time: 0.000470  Lock_time: 0.000202 Rows_sent: 4  Rows_examined: 11
SET timestamp=1549961114;
SELECT d.* FROM tradelog l, trade_detail d WHERE d.tradeid=l.tradeid AND l.id=2;
```

### 函数作用于输入参数

#### explain
```sql
mysql> EXPLAIN SELECT l.* FROM tradelog l, trade_detail d WHERE d.tradeid=l.tradeid AND d.id=4;
+----+-------------+-------+------------+-------+---------------+---------+---------+-------+------+----------+-------+
| id | select_type | table | partitions | type  | possible_keys | key     | key_len | ref   | rows | filtered | Extra |
+----+-------------+-------+------------+-------+---------------+---------+---------+-------+------+----------+-------+
|  1 | SIMPLE      | d     | NULL       | const | PRIMARY       | PRIMARY | 4       | const |    1 |   100.00 | NULL  |
|  1 | SIMPLE      | l     | NULL       | ref   | tradeid       | tradeid | 131     | const |    1 |   100.00 | NULL  |
+----+-------------+-------+------------+-------+---------------+---------+---------+-------+------+----------+-------+
```
1. `trade_detail`称为**驱动表**，`tradelog`称为**被驱动表**，`tradeid`为**关联字段**
2. 被驱动表`tradelog`的编码为`utf8mb4`，驱动表`trade_detail`的编码为`utf8`
    - 等价于`SELECT * FROM tradelog WHERE traideid = CONVERT($R4.tradeid.value USING utf8mb4);`
    - 函数是用在**输入参数**上的，并非二级索引`tradeid`上，因此可以用**树搜索**功能（`key=tradeid`和`rows=1`）
    - `type=ref`：**Join语句中被驱动表索引引用的查询**

#### slowlog
```sql
# Time: 2019-02-12T17:31:50.553151+08:00
# User@Host: root[root] @ localhost []  Id:    13
# Query_time: 0.004090  Lock_time: 0.001874 Rows_sent: 1  Rows_examined: 1
SET timestamp=1549963910;
SELECT l.* FROM tradelog l, trade_detail d WHERE d.tradeid=l.tradeid AND d.id=4;
```

### 优化方案
1. 常用：将`trade_detail.tradeid`的字符串编码修改为`utf8mb4`
    - `ALTER TABLE trade_detail MODIFY tradeid VARCHAR(32) CHARACTER SET utf8mb4 DEFAULT NULL;`
2. 修改SQL（场景：数据量较大或暂不支持该DDL）
    - 主动把`l.tradeid`转换为`utf8`，避免了**被驱动表上的隐式字符编码转换**
    - `SELECT d.* FROM tradelog l, trade_detail d WHERE d.tradeid=CONVERT(l.tradeid USING utf8) AND l.id=2;`

```sql
mysql> EXPLAIN SELECT d.* FROM tradelog l, trade_detail d WHERE d.tradeid=CONVERT(l.tradeid USING utf8) AND l.id=2;
+----+-------------+-------+------------+-------+---------------+---------+---------+-------+------+----------+-------+
| id | select_type | table | partitions | type  | possible_keys | key     | key_len | ref   | rows | filtered | Extra |
+----+-------------+-------+------------+-------+---------------+---------+---------+-------+------+----------+-------+
|  1 | SIMPLE      | l     | NULL       | const | PRIMARY       | PRIMARY | 4       | const |    1 |   100.00 | NULL  |
|  1 | SIMPLE      | d     | NULL       | ref   | tradeid       | tradeid | 99      | const |    4 |   100.00 | NULL  |
+----+-------------+-------+------------+-------+---------------+---------+---------+-------+------+----------+-------+
```
```sql
# Time: 2019-02-12T17:50:29.844772+08:00
# User@Host: root[root] @ localhost []  Id:    13
# Query_time: 0.000504  Lock_time: 0.000206 Rows_sent: 4  Rows_examined: 4
SET timestamp=1549965029;
SELECT d.* FROM tradelog l, trade_detail d WHERE d.tradeid=CONVERT(l.tradeid USING utf8) AND l.id=2;
```

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
