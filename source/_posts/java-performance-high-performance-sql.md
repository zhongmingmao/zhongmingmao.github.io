---
title: Java性能 -- 高性能SQL
mathjax: false
date: 2019-09-24 21:41:31
categories:
    - Java
    - Performance
tags:
    - Java
    - Java Performance
    - MySQL
---

## 慢SQL诱因
1. **无索引**、**索引失效**
2. **锁等待**
    - **InnoDB**支持**行锁**，**MyISAM**支持**表锁**
    - InnoDB支持行锁更适合**高并发**场景，但行锁有可能会**升级为表锁**
        - 一种情况是在**批量更新**时
        - 行锁是基于**索引**加的锁，如果在**更新**操作时，**条件索引失效**，那么行锁会升级为表锁
    - 基于**表锁**的数据库操作，会导致**SQL阻塞等待**，影响执行速度
        - 在**写大于读**的情况下，不建议使用MyISAM
    - 行锁相对于表锁，虽然粒度更细，并发能力提升，但也带来了新的问题，那就是**死锁**
3. **不恰当的SQL**
    - `SELECT *`
    - `SELECT COUNT(*)`
    - **大表**中使用`LIMIT M,N`
    - 对**非索引字段**进行**排序**

<!-- more -->

## SQL诊断

### EXPLAIN
1. **id**：每个执行计划都有一个id，如果是一个联合查询，会有多个id
2. **select_type**
    - **SIMPLE**：普通查询，即没有联合查询、子查询
    - **PRIMARY**：主查询
    - **UNION**：UNION中后面的查询
    - **SUBQUERY**：子查询
3. **table**：当前执行计划查询的表，如果表有别名，则显示别名
4. **partitions**：分区表信息
5. **type**
    - 从表中**查询到行**所执行的方式
    - 由好到坏：_**`system > const > eq_ref > ref > range > index > ALL`**_
    - **system/const**
        - 表中只有**一行**数据匹配，**根据索引查询一次**就能找到对应的数据
    - **eq_ref**
        - 使用**唯一索引**扫描，常见于**多表连接**中使用**主键**和**唯一索引**作为**关联条件**
    - **ref**
        - 使用**非唯一索引**扫描，还可见于**唯一索引最左原则**匹配扫描
    - **range**
        - **索引范围扫描**，如`<`、`>`、`between`等操作
    - **index**
        - **索引全表扫描**，遍历整个索引树
    - **ALL**
        - **全表扫描**，遍历全表来找到对应的行
6. **possible_keys**：可能使用到的索引
7. **key**：实际使用到的索引
8. **key_len**：当前使用的索引的长度，单位**Byte**
9. **ref**：关联id等信息
10. **rows**：查找到记录所**扫描**的行数
11. **filtered**：查找到所需记录占总扫描记录数的**比例**
12. **Extra**：额外信息

### Show Profile
1. 通过**EXPLAIN**分析执行计划，仅仅停留在分析SQL的**外部执行情况**
    - 如果需要深入**MySQL内核**，从执行线程的状态和时间来分析，就需要选择**Profile**
2. Profile除了可以分析**执行线程**的**状态**和**时间**
    - 还支持查询在**ALL、CPU、MEMORY、BLOCK IO、CONTEXT SWITCHES**上所消耗的时间
3. MySQL是从**5.0.37**才开始支持`Show Profile`
4. `Show Profile`只显示最新发给服务器的SQL语句，默认记录**最新15条**
    - 可以设置`profiling_history_size`，最大值为**100**

```
SHOW PROFILE [type [, type] ... ]
[FOR QUERY n]
[LIMIT row_count [OFFSET offset]]

type参数：
| ALL：显示所有开销信息
| BLOCK IO：阻塞的输入输出次数
| CONTEXT SWITCHES：上下文切换相关开销信息
| CPU：显示CPU的相关开销信息 
| IPC：接收和发送消息的相关开销信息
| MEMORY：显示内存相关的开销，目前无用
| PAGE FAULTS：显示页面错误相关开销信息
| SOURCE：列出相应操作对应的函数名及其在源码中的调用位置(行数) 
| SWAPS：显示swap交换次数的相关开销信息
```

```sql
mysql> select @@version;
+------------+
| @@version  |
+------------+
| 5.6.37-log |
+------------+

mysql> select @@have_profiling;
+------------------+
| @@have_profiling |
+------------------+
| YES              |
+------------------+

mysql> select @@profiling_history_size;
+--------------------------+
| @@profiling_history_size |
+--------------------------+
|                       15 |
+--------------------------+

mysql> select @@profiling;
+-------------+
| @@profiling |
+-------------+
|           0 |
+-------------+

mysql> set profiling = 1;

mysql> select @@profiling;
+-------------+
| @@profiling |
+-------------+
|           1 |
+-------------+

mysql> show profiles;
+----------+------------+---------------------------+
| Query_ID | Duration   | Query                     |
+----------+------------+---------------------------+
|        1 | 0.03954925 | SELECT @@profiling        |
|        2 | 0.01086300 | SELECT COUNT(1) FROM XXXX |
+----------+------------+---------------------------+

mysql> show profile for query 2;
+----------------------+----------+
| Status               | Duration |
+----------------------+----------+
| starting             | 0.000032 |
| checking permissions | 0.000007 |
| Opening tables       | 0.000012 |
| init                 | 0.000009 |
| System lock          | 0.000009 |
| optimizing           | 0.000014 |
| statistics           | 0.000013 |
| preparing            | 0.000012 |
| executing            | 0.000008 |
| Sending data         | 0.010665 |
| end                  | 0.000009 |
| query end            | 0.000008 |
| closing tables       | 0.000038 |
| freeing items        | 0.000016 |
| cleaning up          | 0.000012 |
+----------------------+----------+
```

## SQL优化

### 优化分页查询
1. 经常使用`LIMIT M,N`+`ORDER BY`来实现分页查询
    - 在**没有任何索引条件支持**的情况下，需要做**大量的文件排序**操作（**file sort**），**性能很差**
    - 即便有对应的索引，也只是在刚开始时效率比较理想，**越往后，性能越差**
        - 使用`LIMIT M,N`时，**偏移量M越大**，数据库**检索的数据也会越多**
        - 例如`LIMIT 10000,10`，数据库需要检索10010条记录，但最后只返回10条记录
2. 优化方案：**子查询** + **覆盖索引**

```sql
-- 使用了索引，扫描了100010行
mysql> explain select * from prop_action_reward order by create_time limit 100000,10;
+----+-------------+--------------------+-------+---------------+-----------------+---------+------+--------+-------+
| id | select_type | table              | type  | possible_keys | key             | key_len | ref  | rows   | Extra |
+----+-------------+--------------------+-------+---------------+-----------------+---------+------+--------+-------+
|  1 | SIMPLE      | prop_action_reward | index | NULL          | idx_create_time | 5       | NULL | 100010 | NULL  |
+----+-------------+--------------------+-------+---------------+-----------------+---------+------+--------+-------+

-- 耗费了0.19S，性能不太理想
mysql> select * from prop_action_reward order by create_time limit 100000,10;
....
10 rows in set (0.19 sec)

-- 查询获取到的100010条记录都返回给客户端了，耗时主要集中在Sending data阶段
mysql> show profile for query 21;
+----------------------+----------+
| Status               | Duration |
+----------------------+----------+
| starting             | 0.000037 |
| checking permissions | 0.000007 |
| Opening tables       | 0.000016 |
| init                 | 0.000028 |
| System lock          | 0.000008 |
| optimizing           | 0.000006 |
| statistics           | 0.000010 |
| preparing            | 0.000011 |
| Sorting result       | 0.000005 |
| executing            | 0.000004 |
| Sending data         | 0.192705 |
| end                  | 0.000018 |
| query end            | 0.000008 |
| closing tables       | 0.000010 |
| freeing items        | 0.000029 |
| cleaning up          | 0.000085 |
+----------------------+----------+
```

```sql
-- 子查询用到了覆盖索引（Using index），无需回表
mysql> explain select * from prop_action_reward where id > (select id from prop_action_reward order by create_time limit 100000,1) limit 10;
+----+-------------+--------------------+-------+---------------+-----------------+---------+------+----------+-------------+
| id | select_type | table              | type  | possible_keys | key             | key_len | ref  | rows     | Extra       |
+----+-------------+--------------------+-------+---------------+-----------------+---------+------+----------+-------------+
|  1 | PRIMARY     | prop_action_reward | range | PRIMARY       | PRIMARY         | 8       | NULL | 47244120 | Using where |
|  2 | SUBQUERY    | prop_action_reward | index | NULL          | idx_create_time | 5       | NULL | 94488240 | Using index |
+----+-------------+--------------------+-------+---------------+-----------------+---------+------+----------+-------------+

-- 耗费了0.03S，提升很大
mysql> select * from prop_action_reward where id > (select id from prop_action_reward order by create_time limit 100000,1) limit 10;
...
10 rows in set (0.03 sec)

-- 只会返回10条记录给客户端，所以快很多
mysql> show profile for query 24;
+----------------------+----------+
| Status               | Duration |
+----------------------+----------+
| starting             | 0.000064 |
| checking permissions | 0.000007 |
| checking permissions | 0.000007 |
| Opening tables       | 0.000019 |
| init                 | 0.000030 |
| System lock          | 0.000009 |
| optimizing           | 0.000008 |
| statistics           | 0.000022 |
| optimizing           | 0.000007 |
| statistics           | 0.000011 |
| preparing            | 0.000015 |
| Sorting result       | 0.000005 |
| executing            | 0.000004 |
| Sending data         | 0.028916 |
| preparing            | 0.000013 |
| executing            | 0.000005 |
| Sending data         | 0.000055 |
| end                  | 0.000006 |
| query end            | 0.000007 |
| closing tables       | 0.000009 |
| freeing items        | 0.000022 |
| cleaning up          | 0.000013 |
+----------------------+----------+
```

### 优化SLECT COUNT(*)
1. COUNT()是一个**聚合**函数，用来统计**行数**或**某一列的行数量**（不包括NULL值）
2. 常用的是`COUNT(*)`和`COUNT(1)`，两者没有本质区别，在**InnoDB**，都会利用**主键列**实现行数的统计
3. 通常**没有任何查询条件**下的`COUNT(*)`，**MyISAM的查询速度要明显快于InnoDB**
    - 这是因为MyISAM记录了**整个表的行数**，无需遍历计算，直接获取即可，而InnoDB需要扫描表来统计具体的行数
    - 如果带上查询条件，MyISAM和InnoDB都需要扫描表来进行行数的统计
4. 优化方案
    - 使用**近似值**，借助`EXPLAIN`中的`rows`
    - 增加**汇总统计**，使用汇总统计表或缓存

### 优化SLECT *
1. 尽量使用**覆盖索引**

## 记录慢SQL
```sql
mysql> show variables like '%slow_query%';
+---------------------+-----------------------------------------------------+
| Variable_name       | Value                                               |
+---------------------+-----------------------------------------------------+
| slow_query_log      | ON                                                  |
| slow_query_log_file | /data_db3/mysql/3323/slowlog/slowlog_2019102209.log |
+---------------------+-----------------------------------------------------+

mysql> show variables like 'long_query_time';
+-----------------+----------+
| Variable_name   | Value    |
+-----------------+----------+
| long_query_time | 1.000000 |
+-----------------+----------+
```

## 参考资料
[Java性能调优实战](https://time.geekbang.org/column/intro/100028001)
