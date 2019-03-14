---
title: MySQL -- 用户临时表
date: 2019-03-12 09:18:55
categories:
    - MySQL
tags:
    - MySQL
---

## 临时表 VS 内存表
1. 内存表，指的是使用`Memory`引擎的表，建表语法：`CREATE TABLE ... ENGINE=Memory`
    - _**所有数据都保存在内存中，系统重启时被清空，但表结构还在**_
2. 临时表，可以使用**各种引擎**
    - 如果使用的是`InnoDB`或者`MyISAM`引擎，数据需要写到磁盘上
    - 当然也可以使用`Memory`引擎

<!-- more -->

## 特征
| session A | session B |
| ---- | ---- |
| CREATE TEMPORARY TABLE t(c int) ENGINE=MyISAM;<br/>（创建临时表） | |
| | SHOW CREATE TABLE t;<br/>(Table 'test.t' doesn't exist) |
| CREATE TABLE t(id INT PRIMARY KEY) ENGINE=InnoDB;<br/>（创建普通表） | |
| SHOW CREATE TABLE t;<br/>（显示临时表） | |
| SHOW TABLES;<br/>（显示普通表） | |
| | INSERT INTO t VALUES (1); |
| | SELECT * FROM t;<br>(返回1) |
| SELECT * FROM t;<br/>(Empty set) | |

1. 建表语法：`CREATE TEMPORARY TABLE`
2. **临时表只能被创建它的session访问**，对其它线程是不可见的
3. **临时表可以与普通表同名**
4. 同一个session内有**同名**的临时表和普通表时，`SHOW CREATE`语句以及**增删改查**语句访问的是**临时表**
5. `SHOW TABLES`命令**不显示临时表**
6. 在**session结束**时，会**自动删除临时表**，临时表特别适用于**Join优化**的场景
    - 不同session的临时表可以**重名**，可以支持多个session并发执行Join优化
    - 无需担心数据的删除问题，临时表是**自动回收**的

## 跨库查询
将一个大表ht，按照字段f，拆分成1024个表，然后分布到32个数据库实例，每个实例32张表
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-sub-db-table.jpg" width=800/>
1. 选择分区Key的依据：**减少跨库查询和跨表查询**，如果大部分语句都会包含f的等值条件，就要用f做分区键
2. 在Proxy这一层解析完SQL语句后，就能确定将这条语句路由到哪一个分区表做查询
    - 例如`SELECT v FROM ht WHERE f=N;`，通过分表规则来确认需要的数据被放到哪一个分表上
3. 假如表上还有另外一个索引k，
    - 对于`SELECT v FROM ht WHERE k >= M ORDER BY t_modified DESC LIMIT 100;`
    - 没有用到字段f，只能到所有分区中去查找所有满足条件的行，然后再统一做`ORDER BY`操作
4. 两种实现思路
    - 在Proxy层的进程代码中实现排序
        - 优点：**处理速度快**
        - 缺点：**开发工作量大**，**对Proxy端压力较大**（内存不足和CPU瓶颈）
    - 从各个分库拿到数据，汇总到一个MySQL实例中的一个表，然后在**汇总表**上做逻辑操作

### 汇总表方案
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-sub-db-table-temporary-table.jpg" width=600/>
1. 在汇总库上创建一个临时表temp_ht，表里包含三个字段v、k和t_modified
2. 在各个分库上执行
3. `SELECT v,k,t_modified FROM ht_x WHERE k >= M ORDER BY t_modified DESC LIMIT 100;`
4. 把分库的执行结果插入到临时表temp_ht
5. 在temp_ht上执行
    - `SELECT v FROM temp_ht ORDER BY t_modified DESC LIMIT 100;`

## 重名
```sql
CREATE TEMPORARY TABLE temp_t(id INT PRIMARY KEY) ENGINE=InnoDB;

mysql> SELECT @@tmpdir;
+----------+
| @@tmpdir |
+----------+
| /tmp     |
+----------+

mysql> system ls -l /tmp
total 108
-rw-rw---- 1 mysql mysql  8556 Mar 12 05:00 #sql1_1_0.frm
-rw-rw---- 1 mysql mysql 98304 Mar 12 05:00 #sql1_1_0.ibd
```
1. 创建一个frm文件，用于保存**表结构定义**，放在**临时文件目录**
    - 前缀为`#sql{进程ID}_{线程ID}_{序号}`，后缀为`.frm`
2. 表中数据的存放
    - MySQL 5.6及之前，MySQL会在**临时文件目录**下创建一个**相同的前缀**，以`.ibd`为后缀
    - 从MySQL 5.7开始，MySQL引入了一个**临时文件表空间**，用来存放临时文件的数据，不再需要ibd
3. 从文件名的前缀规则可知，临时表和普通表的**存储是不一样**的，因此可以**重名**

### 磁盘存储
| session A | session B |
| ---- | ---- |
| CREATE TEMPORARY TABLE t1(id INT);<br/>// #sql1_2_0.frm | |
| CREATE TEMPORARY TABLE t2(id INT);<br/>// #sql1_2_1.frm | |
| | CREATE TEMPORARY TABLE t1(id INT);<br/>// #sql1_3_0.frm |

```sql
-- session A的线程ID为2，session B的线程ID为3
-- session A和session B创建的临时表，在磁盘上的文件是不会重名的
mysql> SHOW PROCESSLIST;
+----+------+-----------+------+---------+------+-------+------------------+
| Id | User | Host      | db   | Command | Time | State | Info             |
+----+------+-----------+------+---------+------+-------+------------------+
|  2 | root | localhost | test | Sleep   |  127 |       | NULL             |
|  3 | root | localhost | test | Query   |    0 | init  | SHOW PROCESSLIST |
+----+------+-----------+------+---------+------+-------+------------------+
```

### 内存区分
1. 每个表都有一个对应的`table_def_key`
2. 普通表的`table_def_key`：**库名 + 表名**
3. 临时表的`table_def_key`：**库名 + 表名 + server_id + thread_id**
    - session A和session B创建的临时表t1，**磁盘文件名不同**，**`table_def_key`也不同**，因此可以**并存**

### 实现
1. 每个线程都维护自己的**临时表链表**
2. 每次session内操作表的时候，先遍历链表，检查是否有**同名的临时表**（**临时表优先**）
3. 在session结束时，对链表里的每个临时表，执行删除表操作
    - `DROP TEMPORARY TABLE t1`
    - `binlog`中也记录了上面的删除命令

## 主备复制
写binlog，意味着备库需要

### binlog_format
```sql
CREATE TABLE t_normal(id INT PRIMARY KEY, c INT) ENGINE=InnoDB; -- Q1
CREATE TEMPORARY TABLE temp_t LIKE t_normal; -- Q2
INSERT INTO temp_t VALUES(1,1); -- Q3
INSERT INTO t_normal SELECT * FROM temp_t; -- Q4
```
1. `binlog_format=STATEMENT/MIXED`
    - 如果关于临时表的操作都不记录，那么记录到binlog的语句就只有Q1和Q4
    - 备库执行到Q4时会报错：表temp_t不存在
    - Q2会传到备库执行，备库的同步线程就会创建这个临时表
        - 主库在线程退出时，就会自动删除临时表
        - 但备库同步线程时**持续运行**的，因此需要为主库的binlog自动加上`DROP TEMPORARY TABLE`
2. `binlog_format=ROW`
    - 与临时表相关的语句，都不会记录到binlog
    - 记录Q4时，`write_row enent`里面记录的逻辑是：插入一行数据(1,1)
    - `DROP TABLE t_normal，temp_t`，binlog只能重写成
        - `DROP TABLE t_normal /* generated by server */`
        - 这是因为备库上并没有temp_t，需要重写后再传到备库去执行，才不会导致备库同步线程停止

### 同名临时表
实例S是实例M的备库

| 时刻 | M session A | M session B | S的应用日志线程 |
| ---- | ---- | ---- | ---- |
| T1 | CREATE TEMPORARY TABLE t1(id INT); | | |
| T2 | | | CREATE TEMPORARY TABLE t1(id INT); |
| T3 | | CREATE TEMPORARY TABLE t1(id INT); | |
| T4 | | | CREATE TEMPORARY TABLE t1(id INT); |

1. 主库上的两个session创建了同名的临时表t1，这两个语句都会被传到备库S上去执行
2. 但备库的应用日志线程是共用的（哪怕是多线程复制，两个语句也有可能被分配给同一个workder）
    - `CREATE TEMPORARY TABLE`可能会被先后执行两次
3. MySQL在记录binlog的时候，会把主库执行这个语句的**thread_id**写到binlog
    - 备库的应用线程就能知道每个语句的**主库thread_id**
        - 利用这个**thread_id**来构造临时表的`table_def_key`
    - session A的临时表t1，在备库上的`table_def_key`
        - 库名 + t1 + M的server_id + **session A的thread_id**
    - session B的临时表t2，在备库上的`table_def_key`
        - 库名 + t1 + M的server_id + **session B的thread_id**
    - 由于`table_def_key`是不同，所以两个表在备库的应用线程里面**不会冲突**

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->