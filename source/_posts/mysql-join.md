---
title: MySQL -- JOIN
date: 2019-03-10 18:37:05
categories:
    - MySQL
tags:
    - MySQL
mathjax: true
---

## 表初始化
```sql
CREATE TABLE `t2` (
    `id` INT(11) NOT NULL,
    `a` INT(11) DEFAULT NULL,
    `b` INT(11) DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `a` (`a`)
) ENGINE=InnoDB;

DROP PROCEDURE IF EXISTS idata;
DELIMITER ;;
CREATE PROCEDURE idata()
BEGIN
  DECLARE i INT;
  SET i=1;
  WHILE (i <= 1000) DO
    INSERT INTO t2 VALUES (i,i,i);
    SET i=i+1;
  END WHILE;
END;;
DELIMITER ;
CALL idata();

CREATE TABLE t1 LIKE t2;
INSERT INTO t1 (SELECT * FROM t2 WHERE id<=100);
```

<!-- more -->

## Index Nested-Loop Join
```sql
-- 使用JOIN，优化器可能会选择t1或t2作为驱动表
-- 使用STRAIGHT_JOIN，使用固定的连接关系，t1为驱动表，t2为被驱动表
SELECT * FROM t1 STRAIGHT_JOIN t2 ON (t1.a=t2.a);

mysql> EXPLAIN SELECT * FROM t1 STRAIGHT_JOIN t2 ON (t1.a=t2.a);
+----+-------------+-------+------------+------+---------------+------+---------+-----------+------+----------+-------------+
| id | select_type | table | partitions | type | possible_keys | key  | key_len | ref       | rows | filtered | Extra       |
+----+-------------+-------+------------+------+---------------+------+---------+-----------+------+----------+-------------+
|  1 | SIMPLE      | t1    | NULL       | ALL  | a             | NULL | NULL    | NULL      |  100 |   100.00 | Using where |
|  1 | SIMPLE      | t2    | NULL       | ref  | a             | a    | 5       | test.t1.a |    1 |   100.00 | NULL        |
+----+-------------+-------+------------+------+---------------+------+---------+-----------+------+----------+-------------+
```

### 执行过程
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-join-nlj.jpg" width=600/>
1. 从t1读取一行数据R
2. 从R中取出字段a，然后到t2去查找
3. 取出t2中满足条件的行，与R组成一行，作为结果集的一部分
4. 重复上面步骤，直至遍历t1完毕

### 扫描行数
1. 对驱动表t1做**全表扫描**，需要扫描100行
2. 对每一行R，根据字段a去t2查找，走的是树**搜索过程**
    - 构造的数据都是一一对应，总共扫描100行
3. 因此，整个执行流程，总扫描行数为200行

```sql
# Time: 2019-03-10T11:06:13.271095Z
# User@Host: root[root] @ localhost []  Id:     8
# Query_time: 0.001391  Lock_time: 0.000135 Rows_sent: 100  Rows_examined: 200
SET timestamp=1552215973;
SELECT * FROM t1 STRAIGHT_JOIN t2 ON (t1.a=t2.a);
```

### 不使用Join
1. 执行`SELECT * FROM t1`，扫描100行
2. 循环遍历100行数据
    - 从每一行R中取出字段a的值`$R.a`
    - 执行`SELECT * FROM t2 WHERE a=$R.a`
    - 把返回的结果和R构成结果集的一行
3. 对比Join
    - 同样扫描了200行，但总共**执行了101条语句**，客户端还需要**自己拼接**SQL语句和结果

### 选择驱动表
1. 上面的查询语句，**驱动表走全部扫描**，**被驱动表走树搜索**
2. 假设被驱动表的行数为M
    - 每次在被驱动表上查一行数据，需要先搜索**辅助索引a**，再搜索**主键索引**
    - 因此，在被驱动表上查一行的时间复杂度是 $2\*\log_2 M$
3. 假设驱动表的行数为N，需要扫描驱动表N行
4. 整个执行过程，时间复杂度为 $N + N\*2\*\log_2 M$
    - N对扫描行数的影响更大，因此选择**小表做驱动表**

## Simple Nested-Loop Join
```sql
SELECT * FROM t1 STRAIGHT_JOIN t2 ON (t1.a=t2.b);
```
1. 被驱动表t2的字段b上**没有索引**，因此每次到t2去做匹配的时候，都要做一次**全表扫描**
2. 按照上面的算法，时间复杂度为 $N + N\*M$，总扫描行数为100,100次（**10W**）
    - 假如t1和t2都是10W行数据，那么总扫描次数为10,000,100,000次（**100亿**）
    - 因此，MySQL本身没有使用`Simple Nested-Loop Join`算法

## Block Nested-Loop Join
针对场景：**被驱动表上没有可用的索引**

### join_buffer充足

#### 执行过程
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-join-blj.jpg" width=600/>
1. 把t1的数据读入线程内存`join_buffer`，执行的是`SELECT *`，因此会把整个t1读入`join_buffer`
2. 扫描t2，把t2中的每一行取出来，与`join_buffer`中的数据做对比
    - 如果满足join条件的行，作为结果集的一部分返回

```sql
-- 默认为256KB
-- 4194304 Bytes == 4 MB
mysql> SHOW VARIABLES LIKE '%join_buffer_size%';
+------------------+---------+
| Variable_name    | Value   |
+------------------+---------+
| join_buffer_size | 4194304 |
+------------------+---------+
```

#### EXPLAIN
```sql
mysql> EXPLAIN SELECT * FROM t1 STRAIGHT_JOIN t2 ON (t1.a=t2.b);
+----+-------------+-------+------------+------+---------------+------+---------+------+------+----------+----------------------------------------------------+
| id | select_type | table | partitions | type | possible_keys | key  | key_len | ref  | rows | filtered | Extra                                              |
+----+-------------+-------+------------+------+---------------+------+---------+------+------+----------+----------------------------------------------------+
|  1 | SIMPLE      | t1    | NULL       | ALL  | a             | NULL | NULL    | NULL |  100 |   100.00 | NULL                                               |
|  1 | SIMPLE      | t2    | NULL       | ALL  | NULL          | NULL | NULL    | NULL | 1000 |    10.00 | Using where; Using join buffer (Block Nested Loop) |
+----+-------------+-------+------------+------+---------------+------+---------+------+------+----------+----------------------------------------------------+

# Time: 2019-03-10T12:19:57.245356Z
# User@Host: root[root] @ localhost []  Id:     8
# Query_time: 0.010132  Lock_time: 0.000192 Rows_sent: 100  Rows_examined: 1100
SET timestamp=1552220397;
SELECT * FROM t1 STRAIGHT_JOIN t2 ON (t1.a=t2.b);
```
1. 整个过程中，对t1和t2都做了一次**全表扫描**，总扫描行数为**1100**
2. 由于`join_buffer`是**以无序数组**的方式组织的，因此对t2的每一行数据，都需要做100次判断
    - 因此，在内存中的总判断次数为100,000次
3. `Simple Nested-Loop Join`的扫描行数也是100,000次，**时间复杂度是一样的**
    - 但`Block Nested-Loop Join`的100,000次判断是**内存操作**，**速度会快很多**
    - `Simple Nested-Loop Join`可能会涉及**磁盘操作**

#### 选择驱动表
1. 假设小表的行数为N，大表的行数为M
2. 两个表都要做一次**全表扫描**，总扫描行数为`M+N`
3. 内存中的判断次数是`M*N`
4. 此时，选择大表还是小表作为驱动表，_**没有任何差异**_

### join_buffer不足
```sql
-- 放不下t1的所有数据，采取分段放的策略
SET join_buffer_size=1200;

# Time: 2019-03-10T12:30:32.194726Z
# User@Host: root[root] @ localhost []  Id:     8
# Query_time: 0.009459  Lock_time: 0.000559 Rows_sent: 100  Rows_examined: 2100
SET timestamp=1552221032;
SELECT * FROM t1 STRAIGHT_JOIN t2 ON (t1.a=t2.b);
```

#### 执行过程
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-join-blj-not-enough.jpg" width=600/>
1. 扫描t1，顺序读取数据行放入`join_buffer`，放完第88行后`join_buffer`满，继续第2步
2. 扫描t2，把t2中的每一行取出来，跟`join_buffer`中的数据做对比
    - 如果满足join条件的行，作为结果集的一部分返回
3. 清空`join_buffer`（为了**复用**，体现**Block**的核心思想）
4. 继续扫描t1，顺序取最后12行数据加入`join_buffer`，继续执行第2步

#### 性能
1. 由于t1被分成了两次加入`join_buffer`，导致t2会被扫描两次，因此总扫描行数为**2100**
2. 但是内存的判断次数还是不变的，依然是100,000次

#### 选择驱动表
1. 假设驱动表的数据行数为N，需要分K段才能完成算法流程，被驱动表的数据行数为M
    - K并非常数，N越大K越大，定义：$K=N\*\lambda, \lambda \in (0,1]$
    - 在`join_buffer_size`固定且t1和2表类似的情况下，$\lambda$是常量
2. 扫描行数为 $N + \lambda\*N\*M$
    - 减少N比减少M，扫描的行数会更小
    - 因此选择**小表当驱动表**
3. 内存判断次数为 $N\*M$（**无需考虑**）
4. 如果要减少$\lambda$的值，可以加大`join_buffer_size`的值，一次性放入的行越多，分段就越少

## 小表
```sql
-- 恢复为默认值256KB
SET join_buffer_size=262144;
```

### 过滤行数

#### t1为驱动表
```sql
mysql> EXPLAIN SELECT * FROM t1 STRAIGHT_JOIN t2 ON (t1.b=t2.b) WHERE t2.id<=50;
+----+-------------+-------+------------+-------+---------------+---------+---------+------+------+----------+----------------------------------------------------+
| id | select_type | table | partitions | type  | possible_keys | key     | key_len | ref  | rows | filtered | Extra                                              |
+----+-------------+-------+------------+-------+---------------+---------+---------+------+------+----------+----------------------------------------------------+
|  1 | SIMPLE      | t1    | NULL       | ALL   | NULL          | NULL    | NULL    | NULL |  100 |   100.00 | NULL                                               |
|  1 | SIMPLE      | t2    | NULL       | range | PRIMARY       | PRIMARY | 4       | NULL |   50 |    10.00 | Using where; Using join buffer (Block Nested Loop) |
+----+-------------+-------+------------+-------+---------------+---------+---------+------+------+----------+----------------------------------------------------+

# Time: 2019-03-10T13:15:50.346563Z
# User@Host: root[root] @ localhost []  Id:     8
# Query_time: 0.001006  Lock_time: 0.000162 Rows_sent: 50  Rows_examined: 150
SET timestamp=1552223750;
SELECT * FROM t1 STRAIGHT_JOIN t2 ON (t1.b=t2.b) WHERE t2.id<=50;
```

#### t2为驱动表
`join_buffer`只需要放入t2的前50行，因此**t2的前50行**相对于**t1的所有行**来说是一个**更小的表**
```sql
mysql> EXPLAIN SELECT * FROM t2 STRAIGHT_JOIN t1 ON (t1.b=t2.b) WHERE t2.id<=50;
+----+-------------+-------+------------+-------+---------------+---------+---------+------+------+----------+----------------------------------------------------+
| id | select_type | table | partitions | type  | possible_keys | key     | key_len | ref  | rows | filtered | Extra                                              |
+----+-------------+-------+------------+-------+---------------+---------+---------+------+------+----------+----------------------------------------------------+
|  1 | SIMPLE      | t2    | NULL       | range | PRIMARY       | PRIMARY | 4       | NULL |   50 |   100.00 | Using where                                        |
|  1 | SIMPLE      | t1    | NULL       | ALL   | NULL          | NULL    | NULL    | NULL |  100 |    10.00 | Using where; Using join buffer (Block Nested Loop) |
+----+-------------+-------+------------+-------+---------------+---------+---------+------+------+----------+----------------------------------------------------+

# Time: 2019-03-10T13:18:26.656339Z
# User@Host: root[root] @ localhost []  Id:     8
# Query_time: 0.000965  Lock_time: 0.000150 Rows_sent: 50  Rows_examined: 150
SET timestamp=1552223906;
SELECT * FROM t2 STRAIGHT_JOIN t1 ON (t1.b=t2.b) WHERE t2.id<=50;
```

#### 优化器选择
```sql
-- 选择t2作为驱动表
mysql> EXPLAIN SELECT * FROM t1 JOIN t2 ON (t1.b=t2.b) WHERE t2.id<=50;
+----+-------------+-------+------------+-------+---------------+---------+---------+------+------+----------+----------------------------------------------------+
| id | select_type | table | partitions | type  | possible_keys | key     | key_len | ref  | rows | filtered | Extra                                              |
+----+-------------+-------+------------+-------+---------------+---------+---------+------+------+----------+----------------------------------------------------+
|  1 | SIMPLE      | t2    | NULL       | range | PRIMARY       | PRIMARY | 4       | NULL |   50 |   100.00 | Using where                                        |
|  1 | SIMPLE      | t1    | NULL       | ALL   | NULL          | NULL    | NULL    | NULL |  100 |    10.00 | Using where; Using join buffer (Block Nested Loop) |
+----+-------------+-------+------------+-------+---------------+---------+---------+------+------+----------+----------------------------------------------------+
```

### 列数量

#### t1为驱动表
t1只查字段b，如果将t1放入`join_buffer`，只需要放入字段b的值
```sql
mysql> EXPLAIN SELECT t1.b,t2.* FROM t1 STRAIGHT_JOIN t2 ON (t1.b=t2.b) WHERE t2.id<=100;
+----+-------------+-------+------------+-------+---------------+---------+---------+------+------+----------+----------------------------------------------------+
| id | select_type | table | partitions | type  | possible_keys | key     | key_len | ref  | rows | filtered | Extra                                              |
+----+-------------+-------+------------+-------+---------------+---------+---------+------+------+----------+----------------------------------------------------+
|  1 | SIMPLE      | t1    | NULL       | ALL   | NULL          | NULL    | NULL    | NULL |  100 |   100.00 | NULL                                               |
|  1 | SIMPLE      | t2    | NULL       | range | PRIMARY       | PRIMARY | 4       | NULL |  100 |    10.00 | Using where; Using join buffer (Block Nested Loop) |
+----+-------------+-------+------------+-------+---------------+---------+---------+------+------+----------+----------------------------------------------------+

# Time: 2019-03-10T13:23:55.558748Z
# User@Host: root[root] @ localhost []  Id:     8
# Query_time: 0.002742  Lock_time: 0.000123 Rows_sent: 100  Rows_examined: 200
SET timestamp=1552224235;
SELECT t1.b,t2.* FROM t1 STRAIGHT_JOIN t2 ON (t1.b=t2.b) WHERE t2.id<=100;
```

#### t2为驱动表
t2要查所有的字段，如果将t2放入`join_buffer`，要放入三个字段`id`、`a`和`b`，因此t1是**更小的表**
```sql
mysql> EXPLAIN SELECT t1.b,t2.* FROM t2 STRAIGHT_JOIN t1 on (t1.b=t2.b) WHERE t2.id<=100;
+----+-------------+-------+------------+-------+---------------+---------+---------+------+------+----------+----------------------------------------------------+
| id | select_type | table | partitions | type  | possible_keys | key     | key_len | ref  | rows | filtered | Extra                                              |
+----+-------------+-------+------------+-------+---------------+---------+---------+------+------+----------+----------------------------------------------------+
|  1 | SIMPLE      | t2    | NULL       | range | PRIMARY       | PRIMARY | 4       | NULL |  100 |   100.00 | Using where                                        |
|  1 | SIMPLE      | t1    | NULL       | ALL   | NULL          | NULL    | NULL    | NULL |  100 |    10.00 | Using where; Using join buffer (Block Nested Loop) |
+----+-------------+-------+------------+-------+---------------+---------+---------+------+------+----------+----------------------------------------------------+

# Time: 2019-03-10T13:24:51.561116Z
# User@Host: root[root] @ localhost []  Id:     8
# Query_time: 0.002680  Lock_time: 0.000907 Rows_sent: 100  Rows_examined: 200
SET timestamp=1552224291;
SELECT t1.b,t2.* FROM t2 STRAIGHT_JOIN t1 on (t1.b=t2.b) WHERE t2.id<=100;
```

#### 优化器选择
```sql
-- 但优化器依然选择了t2作为驱动表
mysql> EXPLAIN SELECT t1.b,t2.* FROM t2 JOIN t1 on (t1.b=t2.b) WHERE t2.id<=100;
+----+-------------+-------+------------+-------+---------------+---------+---------+------+------+----------+----------------------------------------------------+
| id | select_type | table | partitions | type  | possible_keys | key     | key_len | ref  | rows | filtered | Extra                                              |
+----+-------------+-------+------------+-------+---------------+---------+---------+------+------+----------+----------------------------------------------------+
|  1 | SIMPLE      | t2    | NULL       | range | PRIMARY       | PRIMARY | 4       | NULL |  100 |   100.00 | Using where                                        |
|  1 | SIMPLE      | t1    | NULL       | ALL   | NULL          | NULL    | NULL    | NULL |  100 |    10.00 | Using where; Using join buffer (Block Nested Loop) |
+----+-------------+-------+------------+-------+---------------+---------+---------+------+------+----------+----------------------------------------------------+
```

### 小结
选择驱动表时，应该是**按照各自的条件过滤**，然后**计算参与join的各个字段的总数据量**，数量量小的表，才是小表

## 常见问题
1. 能否可以使用Join
    - 如果使用`Index Nested-Loop Join`，即**用上了被驱动表上的索引**，其实**问题不大**
    - 如果使用`Block Nested-Loop Join`，**扫描行数可能会过多**，**尽量避免使用**，通过`EXPLAIN`确认
2. 选择小表还是大表作为驱动表
    - 如果使用`Index Nested-Loop Join`，选择**小表**作为驱动表
    - 如果使用`Block Nested-Loop Join`
        - `join_buffer`充足时，**没有区别**
        - `join_buffer`不足时（更常见），选择**小表**作为驱动表
    - 结论：**选择小表做驱动表**

<!-- indicate-the-source -->
