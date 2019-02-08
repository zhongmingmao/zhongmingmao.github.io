---
title: MySQL -- 无过滤条件的count
date: 2019-02-07 17:21:50
categories:
    - MySQL
tags:
    - MySQL
---

## count(\*)

### 实现
1. **MyISAM**：将**表的总行数**存放在**磁盘**上，针对**无过滤条件**的查询可以**直接返回**
    - 如果有过滤条件的count(\*)，MyISAM也不能很快返回
2. **InnoDB**：从存储引擎**一行行**地读出数据，然后**累加计数**
    - 由于**MVCC**，在同一时刻，InnoDB应该返回多少行是**不确定**

<!-- more -->

#### 样例
假设表t有10000条记录

| session A | session B | session C |
| ---- | ---- | ---- |
| BEGIN; | | |
| SELECT COUNT(*) FROM t;（返回10000） | | |
| | | INSERT INTO t;（插入一行） |
| | BEGIN; | |
| | INSERT INTO t（插入一行）; | |
| SELECT COUNT(*) FROM t;（返回10000） | SELECT COUNT(*) FROM t;（返回10002）| SELECT COUNT(*) FROM T;（返回10001） |

1. 最后时刻三个会话同时查询t的总行数，拿到的结果却是不同的
2. InnoDB默认事务隔离级别是**RR**，通过**MVCC**实现
    - 每个事务都需要判断**每一行记录**是否**对自己可见**

### 优化
1. InnoDB是**索引组织表**
    - **聚簇索引树**：叶子节点是**数据**
    - **二级索引树**：叶子节点是**主键值**
2. 二级索引树**占用的空间**比聚簇索引树**小很多**
3. 优化器会在保证**逻辑正确**的前提下，遍历**最小**的索引树，尽量减少扫描的数据量
    - 针对无过滤条件的count操作，无论遍历哪一颗索引树，效果都是一样的
    - 优化器会为count(\*)选择**最优**的索引树

### show table status
```sql
mysql> SHOW TABLE STATUS\G;
*************************** 1. row ***************************
           Name: t
         Engine: InnoDB
        Version: 10
     Row_format: Dynamic
           Rows: 100256
 Avg_row_length: 47
    Data_length: 4734976
Max_data_length: 0
   Index_length: 5275648
      Data_free: 0
 Auto_increment: NULL
    Create_time: 2019-02-01 17:49:07
    Update_time: NULL
     Check_time: NULL
      Collation: utf8_general_ci
       Checksum: NULL
 Create_options:
        Comment:
```
`SHOW TABLE STATUS`同样通过**采样**来估算（非常不精确），误差能到`40%~50%`

## 维护计数

### 缓存

#### 方案
1. 用**Redis**来保存表的总行数（无过滤条件）
2. 这个表每插入一行，Redis计数+1，每删除一行，Redis计数-1

#### 缺点

##### 丢失更新
1. Redis可能会丢失更新
2. 解决方案：Redis异常重启后，到数据库执行一次count(\*)
    - 异常重启并不常见，这时全表扫描的成本是可以接受的

##### 逻辑不精确 -- 致命
1. 场景：显示**操作记录的总数**和**最近操作的100条记录**
2. Redis和MySQL是两个不同的存储系统，_**不支持分布式事务**_，因此无法拿到精确的**一致性视图**

**时序A**
session B在T3时刻，查到的100行结果里面有最新插入的记录，但Redis还没有+1，_**逻辑不一致**_

| 时刻 | session A | session B |
| ---- | ---- | ---- |
| T1 | | |
| T2 | 插入一行数据R; | |
| T3 | | 读取Redis计数;<br/>查询最近100条记录; |
| T4 | Redis计数+1; | |

**时序B**
session B在T3时刻，查到的100行结果里面没有最新插入的记录，但Redis已经+1，_**逻辑不一致**_

| 时刻 | session A | session B |
| ---- | ---- | ---- |
| T1 | | |
| T2 | Redis计数+1; | |
| T3 | | 读取Redis计数;<br/>查询最近100条记录; |
| T4 | 插入一行数据R; | |


### 数据库
1. 把计数值放到数据库单独的一张计数表C中
2. 利用InnoDB的**crash-safe**的特性，解决了**崩溃丢失**的问题
3. 利用InnoDB的**支持事务**的特性，解决了**一致性视图**的问题
4. session B在T3时刻，session A的事务还未提交，表C的计数值+1对自己不可见，_**逻辑一致**_

| 时刻 | session A | session B |
| ---- | ---- | ---- |
| T1 | | |
| T2 | BEGIN;<br/>表C中的计数值+1; | |
| T3 | | BEGIN;<br/>读表C计数值;<br/>查询最新100条记录;<br/>COMMIT; |
| T4 | 插入一行数据R;<br/>COMMIT; | |

## count的性能

### 语义
1. count()是一个**聚合**函数，对于返回的结果集，一行一行地进行判断
    - 如果count函数的参数值不是**NULL**，累计值+1，否则不加，最后返回累计值
2. **count(字段F)**
    - 字段F**有可能为NULL**
    - 表示返回满足条件的结果集里字段F**不为NULL**的总数
3. **count(主键ID)**、**count(1)**、**count(\*)**
    - _**不可能为NULL**_
    - 表示返回满足条件的结果集的总数
4. Server层要什么字段，InnoDB引擎就返回什么字段
    - count(\*)例外，_**不返回整行**_，只返回**空行**

### 性能对比

#### count(字段F)
1. 如果字段F定义为**不允许为NULL**，一行行地从记录里读出这个字段，判断通过后按行累加
    - 通过表结构判断该字段是**不可能为NULL**
2. 如果字段F定义为**允许NULL**，一行行地从记录里读出这个字段，判断通过后按行累加
    - 通过表结构判断该字段是**有可能为NULL**
    - 判断该字段值是否实际为NULL
3. 如果字段F上**没有二级索引**，只能**遍历整张表**（聚簇索引）
4. _**由于InnoDB必须返回字段F，因此优化器能做出的优化决策将减少**_
    - 例如不能选择**最优**的索引来遍历

#### count(主键ID)
1. InnoDB会**遍历整张表**（聚簇索引），把每一行的id值取出来，返回给Server层
2. Server层拿到id后，判断为不可能为NULL，然后按行累加
3. 优化器可能会选择**最优**的索引来遍历

#### count(1)
1. InnoDB引擎会**遍历整张表**（聚簇索引），但**不取值**
2. Server层对于返回的每一行，放一个数字1进去，判断是不可能为NULL，按行累加
3. count(1)比count(主键ID)快，因为count(主键ID)会涉及到两部分操作
    - _**解析数据行**_
    - _**拷贝字段值**_

#### count(\*)
1. count(\*)不会把所有值都取出来，而是专门做了优化，**不取值**，因为『\*』肯定不为NULL，按行累加
2. 不取值：InnoDB返回一个**空行**，告诉Server层**不是NULL，可以计数**

#### 效率排序
1. **count(字段F) < count(主键ID) < count(1) ≈ count(\*)**
2. **尽量使用count(\*)**

### 样例
```sql
mysql> SHOW CREATE TABLE prop_action_batch_reward\G;
*************************** 1. row ***************************
       Table: prop_action_batch_reward
Create Table: CREATE TABLE `prop_action_batch_reward` (
  `id` bigint(20) NOT NULL,
  `source` int(11) DEFAULT NULL,
  `serial_id` bigint(20) NOT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `user_ids` mediumtext,
  `serial_index` tinyint(4) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_serial_id_source_index` (`serial_id`,`source`,`serial_index`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8
```

#### count(字段F)

##### 无索引
user_ids上无索引，而InnoDB又必须返回user_ids字段，只能**遍历聚簇索引**
```sql
mysql> EXPLAIN SELECT COUNT(user_ids) FROM prop_action_batch_reward;
+----+-------------+--------------------------+------+---------------+------+---------+------+----------+-------+
| id | select_type | table                    | type | possible_keys | key  | key_len | ref  | rows     | Extra |
+----+-------------+--------------------------+------+---------------+------+---------+------+----------+-------+
|  1 | SIMPLE      | prop_action_batch_reward | ALL  | NULL          | NULL | NULL    | NULL | 16435876 | NULL  |
+----+-------------+--------------------------+------+---------------+------+---------+------+----------+-------+

mysql> SELECT COUNT(user_ids) FROM prop_action_batch_reward;
+-----------------+
| count(user_ids) |
+-----------------+
|        17689788 |
+-----------------+
1 row in set (10.93 sec)
```

##### 有索引
1. serial_id上有索引，可以遍历`uniq_serial_id_source_index`
2. 但由于InnoDB必须返回serial_id字段，因此不会遍历**逻辑结果等价**的更优选择`idx_create_time`
    - 如果选择`idx_create_time`，并且返回serial_id字段，这意味着必须**回表**

```sql
mysql> EXPLAIN SELECT COUNT(serial_id) FROM prop_action_batch_reward;
+----+-------------+--------------------------+-------+---------------+-----------------------------+---------+------+----------+-------------+
| id | select_type | table                    | type  | possible_keys | key                         | key_len | ref  | rows     | Extra       |
+----+-------------+--------------------------+-------+---------------+-----------------------------+---------+------+----------+-------------+
|  1 | SIMPLE      | prop_action_batch_reward | index | NULL          | uniq_serial_id_source_index | 15      | NULL | 16434890 | Using index |
+----+-------------+--------------------------+-------+---------------+-----------------------------+---------+------+----------+-------------+

mysql> SELECT COUNT(serial_id) FROM prop_action_batch_reward;
+------------------+
| count(serial_id) |
+------------------+
|         17705069 |
+------------------+
1 row in set (5.04 sec)
```

#### count(主键ID)
优化器选择了**最优**的索引`idx_create_time`来遍历，而非聚簇索引
```sql
mysql> EXPLAIN SELECT COUNT(id) FROM prop_action_batch_reward;
+----+-------------+--------------------------+-------+---------------+-----------------+---------+------+----------+-------------+
| id | select_type | table                    | type  | possible_keys | key             | key_len | ref  | rows     | Extra       |
+----+-------------+--------------------------+-------+---------------+-----------------+---------+------+----------+-------------+
|  1 | SIMPLE      | prop_action_batch_reward | index | NULL          | idx_create_time | 5       | NULL | 16436797 | Using index |
+----+-------------+--------------------------+-------+---------------+-----------------+---------+------+----------+-------------+

mysql> SELECT COUNT(id) FROM prop_action_batch_reward;
+-----------+
| count(id) |
+-----------+
|  17705383 |
+-----------+
1 row in set (4.54 sec)
```

#### count(1)
```sql
mysql> EXPLAIN SELECT COUNT(1) FROM prop_action_batch_reward;
+----+-------------+--------------------------+-------+---------------+-----------------+---------+------+----------+-------------+
| id | select_type | table                    | type  | possible_keys | key             | key_len | ref  | rows     | Extra       |
+----+-------------+--------------------------+-------+---------------+-----------------+---------+------+----------+-------------+
|  1 | SIMPLE      | prop_action_batch_reward | index | NULL          | idx_create_time | 5       | NULL | 16437220 | Using index |
+----+-------------+--------------------------+-------+---------------+-----------------+---------+------+----------+-------------+

mysql> SELECT COUNT(1) FROM prop_action_batch_reward;
+----------+
| count(1) |
+----------+
| 17705808 |
+----------+
1 row in set (4.12 sec)
```

#### count(\*)
```sql
mysql> EXPLAIN SELECT COUNT(*) FROM prop_action_batch_reward;
+----+-------------+--------------------------+-------+---------------+-----------------+---------+------+----------+-------------+
| id | select_type | table                    | type  | possible_keys | key             | key_len | ref  | rows     | Extra       |
+----+-------------+--------------------------+-------+---------------+-----------------+---------+------+----------+-------------+
|  1 | SIMPLE      | prop_action_batch_reward | index | NULL          | idx_create_time | 5       | NULL | 16437518 | Using index |
+----+-------------+--------------------------+-------+---------------+-----------------+---------+------+----------+-------------+

mysql> SELECT COUNT(*) FROM prop_action_batch_reward;
+----------+
| count(*) |
+----------+
| 17706074 |
+----------+
1 row in set (4.06 sec)
```

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
