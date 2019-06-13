---
title: MySQL -- JOIN优化
date: 2019-03-11 09:43:14
categories:
    - Storage
    - MySQL
tags:
    - Storage
    - MySQL
mathjax: true
---

## 表初始化
```sql
CREATE TABLE t1(id INT PRIMARY KEY, a INT, b INT, INDEX(a));
CREATE TABLE t2 LIKE t1;

DROP PROCEDURE idata;
DELIMITER ;;
CREATE PROCEDURE idata()
BEGIN
    DECLARE i INT;
    SET i=1;
    WHILE (i <= 1000) DO
        INSERT INTO t1 VALUES (i,1001-i,i);
        SET i=i+1;
    END WHILE;

    SET i=1;
    WHILE (i <= 1000000) DO
        INSERT INTO t2 VALUES (i,i,i);
        SET i=i+1;
    END WHILE;
END;;
DELIMITER ;

CALL idata();
```

<!-- more -->

## Multi-Range Read
MRR的目的：尽量使用**顺序读盘**

### 回表
```sql
SELECT * FROM t1 WHERE a>=1 AND a<=100;
```
如果随着a递增的顺序进行查询的话，id的值会变成随机的，就会出现**随机访问**，**性能相对较差**
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-join-opt-back-to-table.jpg" width=600/>


### MRR
1. 根据索引a，定位到满足条件的记录，将id的值放入`read_rnd_buffer`中
2. 将`read_rnd_buffer`中的id进行**递增排序**
3. 排序后的id值，依次到主键索引中查找
4. 如果`read_rnd_buffer`满，先执行完第2步和第3步，然后清空`read_rnd_buffer`，继续遍历索引a

```sql
-- 默认值为256KB
-- 8388608 Bytes = 8 MB
mysql> SHOW VARIABLES LIKE '%read_rnd_buffer_size%';
+----------------------+---------+
| Variable_name        | Value   |
+----------------------+---------+
| read_rnd_buffer_size | 8388608 |
+----------------------+---------+

-- mrr_cost_based=on：现在的优化器基于消耗的考虑，更倾向于不使用MRR
mysql> SHOW VARIABLES LIKE '%optimizer_switch%'\G;
*************************** 1. row ***************************
Variable_name: optimizer_switch
        Value: index_merge=on,index_merge_union=on,index_merge_sort_union=on,index_merge_intersection=on,engine_condition_pushdown=on,index_condition_pushdown=on,mrr=on,mrr_cost_based=on,block_nested_loop=on,batched_key_access=off,materialization=on,semijoin=on,loosescan=on,firstmatch=on,duplicateweedout=on,subquery_materialization_cost_based=on,use_index_extensions=on,condition_fanout_filter=on,derived_merge=on,use_invisible_indexes=off

-- 稳定启动MRR优化
SET optimizer_switch='mrr_cost_based=off';
```

#### 执行流程
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-join-opt-back-to-table-mrr.jpg" width=600/>


#### EXPLAIN
```sql
mysql> SET optimizer_switch='mrr_cost_based=on';
Query OK, 0 rows affected (0.00 sec)

-- 优化器没有选择MRR
mysql> EXPLAIN SELECT * FROM t1 WHERE a>=1 AND a<=100;
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+-----------------------+
| id | select_type | table | partitions | type  | possible_keys | key  | key_len | ref  | rows | filtered | Extra                 |
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+-----------------------+
|  1 | SIMPLE      | t1    | NULL       | range | a             | a    | 5       | NULL |  100 |   100.00 | Using index condition |
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+-----------------------+
1 row in set, 1 warning (0.00 sec)

mysql> SET optimizer_switch='mrr_cost_based=off';
Query OK, 0 rows affected (0.00 sec)

-- 优化器选择了MRR
mysql> EXPLAIN SELECT * FROM t1 WHERE a>=1 AND a<=100;
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+----------------------------------+
| id | select_type | table | partitions | type  | possible_keys | key  | key_len | ref  | rows | filtered | Extra                            |
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+----------------------------------+
|  1 | SIMPLE      | t1    | NULL       | range | a             | a    | 5       | NULL |  100 |   100.00 | Using index condition; Using MRR |
+----+-------------+-------+------------+-------+---------------+------+---------+------+------+----------+----------------------------------+
```

#### 小结
MRR提升性能的核心：能够在索引a上做**范围查询**，得到**足够多的主键**，完成**排序**后再回表，体现出**顺序性**的优势

## NLJ优化

### NLJ算法
从驱动表t1，一行行地取出a的值，再到被驱动表t2去join，此时**没有利用到MRR的优势**
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-join-nlj.jpg" width=600/>


### BKA优化
`Batched Key Access`，是MySQL 5.6引入的对`Index Nested-Loop Join`（`NLJ`）的优化
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-join-opt-bka.jpg" width=600/>

1. `BKA`优化的思路：**复用`join_buffer`**
2. 在`BNL`算法中，利用了`join_buffer`来暂存驱动表的数据，但在`NLJ`里面并没有利用到`join_buffer`
3. 在`join_buffer`中放入的数据为P1~P100，表示只会取**查询所需要的字段**
    - 如果`join_buffer`放不下P1~P100，就会将这100行数据**分成多段**执行

### 启用
```sql
-- BKA算法依赖于MRR
SET optimizer_switch='mrr=on,mrr_cost_based=off,batched_key_access=on';
```

## BNL优化

### 性能问题
1. 使用`BNL`算法，可能会**对被驱动表做多次扫描**，如果被驱动表是一个**大的冷数据表**，首先**IO压力会增大**
2. Buffer Pool的LRU算法
    - 第一次从磁盘读入内存的数据页，会先放在`old`区
    - 如果1s后这个数据页不再被访问，就不会被移动到LRU链表头部，对Buffer Pool的命中率影响不大
3. 如果一个使用了BNL算法的Join语句，多次扫描一个冷表
    - 如果**冷表不大**，能够**完全放入old区**
        - 再次扫描冷表的时候，会把冷表的数据页移到LRU链表头部，**不属于期望的晋升**
    - 如果**冷表很大**，_**业务正常访问的数据页，可能没有机会进入young区**_
        - 一个正常访问的数据页，要进入young区，需要隔1S后再次被访问
        - 由于Join语句在循环读磁盘和淘汰内存页，进入old区的数据页，很有可能在1S内被淘汰
        - 正常业务访问的数据页也**一并被冲掉**，影响正常业务的内存命中率
4. 大表Join虽然对IO有影响，但在语句执行结束后，对IO的影响也就结束了
    - 但**对Buffer Pool的影响是持续性的**，需要依靠后续的查询请求慢慢恢复内存命中率
    - 为了减少这种影响，可以考虑适当地增大`join_buffer_size`，减少对被驱动表的扫描次数
5. 小结
    - 可能会多次扫描**被驱动表**，占用磁盘**IO资源**
    - 判断Join条件需要执行$M\*N$次对比，如果是大表会占用非常多的**CPU资源**
    - 可能会导致Buffer Pool的**热数据被淘汰**和**正常的业务数据无法成为热数据**，进而影响**内存命中率**
6. 如果优化器选择了`BNL`算法，就需要做优化
    - 给被驱动表**Join字段**加索引，把`BNL`算法转换成`BKA`算法
    - 临时表

### 不适合建索引
t2中需要参与Join的只有2000行，并且为一个**低频语句**，为此在t2.b上建索引是比较浪费的
```sql
SELECT * FROM t1 JOIN t2 ON (t1.b=t2.b) WHERE t2.b>=1 AND t2.b<=2000;
```

#### 采用BNL
1. 取出t1的所有字段，存入`join_buffer`（无序数组），完全放得下
2. 扫描t2，取出每一行数据跟`join_buffer`中的数据进行对比
    - 如果不满足`t1.b=t2.b`，则跳过
    - 如果**满足**`t1.b=t2.b`，_**再判断是否满足其它条件**_，如果满足就作为结果集的一部分返回，否则跳过
3. 等值判断的次数为1000*100W=**10亿**，计算量很大

```sql
-- 使用BNL算法
mysql> EXPLAIN SELECT * FROM t1 JOIN t2 ON (t1.b=t2.b) WHERE t2.b>=1 AND t2.b<=2000;
+----+-------------+-------+------------+------+---------------+------+---------+------+--------+----------+----------------------------------------------------+
| id | select_type | table | partitions | type | possible_keys | key  | key_len | ref  | rows   | filtered | Extra                                              |
+----+-------------+-------+------------+------+---------------+------+---------+------+--------+----------+----------------------------------------------------+
|  1 | SIMPLE      | t1    | NULL       | ALL  | NULL          | NULL | NULL    | NULL |   1000 |   100.00 | Using where                                        |
|  1 | SIMPLE      | t2    | NULL       | ALL  | NULL          | NULL | NULL    | NULL | 998414 |     1.11 | Using where; Using join buffer (Block Nested Loop) |
+----+-------------+-------+------------+------+---------------+------+---------+------+--------+----------+----------------------------------------------------+

-- 执行耗时为75S，非常久！
mysql> SELECT * FROM t1 JOIN t2 ON (t1.b=t2.b) WHERE t2.b>=1 AND t2.b<=2000;
...
|  999 |    2 |  999 |  999 |  999 |  999 |
| 1000 |    1 | 1000 | 1000 | 1000 | 1000 |
+------+------+------+------+------+------+
1000 rows in set (1 min 15.29 sec)

# Time: 2019-03-11T12:04:49.066846Z
# User@Host: root[root] @ localhost []  Id:     8
# Query_time: 75.288703  Lock_time: 0.000174 Rows_sent: 1000  Rows_examined: 1001000
SET timestamp=1552305889;
SELECT * FROM t1 JOIN t2 ON (t1.b=t2.b) WHERE t2.b>=1 AND t2.b<=2000;
```

#### 临时表

##### 思路
1. 把t2中满足条件的数据先放到临时表tmp_t中
2. 为了让join使用`BKA`算法，给临时表tmp_t的字段b加上索引
3. 让表t1和tmp_t做join操作

##### 执行过程
```sql
CREATE TEMPORARY TABLE temp_t (id INT PRIMARY KEY, a INT, b INT, INDEX(b)) ENGINE=InnoDB;
INSERT INTO temp_t SELECT * FROM t2 WHERE b>=1 AND b<=2000;

# Time: 2019-03-11T12:20:01.810030Z
# User@Host: root[root] @ localhost []  Id:     8
# Query_time: 0.624821  Lock_time: 0.002347 Rows_sent: 0  Rows_examined: 1000000
SET timestamp=1552306801;
INSERT INTO temp_t SELECT * FROM t2 WHERE b>=1 AND b<=2000;

-- 采用NLJ算法，如果batched_key_access=on，将采用BKA优化
mysql> EXPLAIN SELECT * FROM t1 JOIN temp_t ON (t1.b=temp_t.b);
+----+-------------+--------+------------+------+---------------+------+---------+-----------+------+----------+-------------+
| id | select_type | table  | partitions | type | possible_keys | key  | key_len | ref       | rows | filtered | Extra       |
+----+-------------+--------+------------+------+---------------+------+---------+-----------+------+----------+-------------+
|  1 | SIMPLE      | t1     | NULL       | ALL  | NULL          | NULL | NULL    | NULL      | 1000 |   100.00 | Using where |
|  1 | SIMPLE      | temp_t | NULL       | ref  | b             | b    | 5       | test.t1.b |    1 |   100.00 | NULL        |
+----+-------------+--------+------------+------+---------------+------+---------+-----------+------+----------+-------------+

-- 执行耗时为20ms，提升很大
mysql> SELECT * FROM t1 JOIN temp_t ON (t1.b=temp_t.b);
...
|  999 |    2 |  999 |  999 |  999 |  999 |
| 1000 |    1 | 1000 | 1000 | 1000 | 1000 |
+------+------+------+------+------+------+
1000 rows in set (0.02 sec)

# Time: 2019-03-11T12:20:11.041259Z
# User@Host: root[root] @ localhost []  Id:     8
# Query_time: 0.012139  Lock_time: 0.000187 Rows_sent: 1000  Rows_examined: 2000
SET timestamp=1552306811;
SELECT * FROM t1 JOIN temp_t ON (t1.b=temp_t.b);
```
1. 执行`INSERT`语句构造tmp_t表并插入数据的过程中，对t2做了**全表扫描**，扫描行数为100W
2. JOIN语句先扫描t1，扫描行数为1000，在JOIN的比较过程中，做了1000次**带索引的查询**

#### Hash Join
1. 如果`join_buffer`维护的不是一个无序数组，而是一个**哈希表**，那只需要100W次哈希查找即可
2. MySQL目前不支持`Hash Join`，业务端可以自己实现`Hash Join`
    - `SELECT * FROM t1`
        - 取t1的全部1000行数据，在业务端存入一个hash结构（如`java.util.HashMap`）
    - `SELECT * FROM t2 WHERE b>=1 AND b<=2000`，获取t2中满足条件的2000行数据
    - 把这2000行数据，一行行地到hash结构去匹配，将满足匹配条件的行数据，作为结果集的一行

## 小结
1. `BKA`是MySQL**内置支持**的，_**推荐使用**_
2. `BNL`算法**效率低**，建议都尽量换成`BKA`算法，优化的方向是**给被驱动表的关联字段加上索引**
3. 基于**临时表**的改进方案，对于能够**提前过滤出小数据的JOIN语句**来说，效果还是很明显的
4. MySQL目前还不支持`Hash Join`

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
