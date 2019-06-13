---
title: MySQL -- 自增主键
date: 2019-03-15 12:57:29
categories:
    - MySQL
tags:
    - MySQL
---

## 自增不连续

### 表初始化
```sql
CREATE TABLE `t` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `c` INT(11) DEFAULT NULL,
  `d` INT(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `c` (`c`)
) ENGINE=InnoDB;
```

<!-- more -->

### 自增值
```sql
INSERT INTO t VALUES (null,1,1);

-- AUTO_INCREMENT=2，表示下一次插入数据时，如果需要自动生成自增值，会生成id=2
mysql> SHOW CREATE TABLE t;
+-------+---------------------------------------------+
| Table | Create Table                                |
+-------+---------------------------------------------+
| t     | CREATE TABLE `t` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `c` int(11) DEFAULT NULL,
  `d` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `c` (`c`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 |
+-------+---------------------------------------------+
```

#### 保存策略
1. MyISAM引擎的自增值是保存在**数据文件**
2. InnoDB引擎的自增值，是保存在**内存**里，到了MySQL 8.0，才有**自增值持久化**的能力
    - MySQL 5.7及之前的版本，自增值保存在内存里，并没有持久化
        - 每次重启后，第一次打开表时，都会去找自增值的最大值`max(id)`
        - 然后将`max(id)+1`作为这个表当前的自增值
        - 假如一个表当前数据行的最大id为10，`AUTO_INCREMENT=11`
        - 此时，删除id=10的行，`AUTO_INCREMENT`依然还是11
        - 如果马上重启实例，重启后这个表的`AUTO_INCREMENT`就会变成10
        - 即MySQL重启后可能会修改一个表的`AUTO_INCREMENT`值
    - 从MySQL 8.0开始，将自增值的变更记录在`redolog`，重启时依靠`redolog`恢复重启之前的值

#### 修改机制
1. 如果插入数据时id字段指定为0、null或未指定值，就会把这个表当前的`AUTO_INCREMENT`值填到自增字段
2. 如果插入数据时id字段指定了具体值，就直接使用语句里指定的值，但有可能会更新自增值
3. 某次要插入的值为X，当前的自增值为Y
    - 如果X<Y，那么这个表的自增值不变
    - 如果X>=Y，就需要把当前自增值修改为**新的自增值**
        - 从`auto_increment_offset`开始，以`auto_increment_increment`为步进
        - 持续叠加，直到找到**第一个大于**X的值，作为新的自增值

```sql
-- 采用双M架构是，auto_increment_increment设置为2，避免两个库生成的主键冲突
mysql> SELECT @@auto_increment_offset;
+-------------------------+
| @@auto_increment_offset |
+-------------------------+
|                       1 |
+-------------------------+

mysql> SELECT @@auto_increment_increment;
+----------------------------+
| @@auto_increment_increment |
+----------------------------+
|                          1 |
+----------------------------+
```

### 场景

#### 唯一键冲突
```sql
mysql> INSERT INTO t VALUES (null,1,1);
ERROR 1062 (23000): Duplicate entry '1' for key 'c'

-- id没有回退
mysql> SHOW CREATE TABLE t;
+-------+---------------------------------------------+
| Table | Create Table                                |
+-------+---------------------------------------------+
| t     | CREATE TABLE `t` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `c` int(11) DEFAULT NULL,
  `d` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `c` (`c`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 |
+-------+---------------------------------------------+

mysql> INSERT INTO t VALUES (null,2,2);
Query OK, 1 row affected (0.16 sec)

-- id不连续
mysql> SELECT * FROM t;
+----+------+------+
| id | c    | d    |
+----+------+------+
|  1 |    1 |    1 |
|  3 |    2 |    2 |
+----+------+------+
```
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-auto-increment-duplicate-entry.jpg" width=400/>

1. 执行器调用InnoDB引擎接口写入一行，传入的这一行的值为`(0,1,1)`
2. InnoDB发现用户没有指定自增id的值，获取表t当前的自增值为2
3. 将传入的这一行的值改为`(2,1,1)`
4. 将表的自增值改为3（_**在真正执行插入数据之前**_）
5. 继续执行插入数据的操作，由于已经存在于c=1的记录，所以报`Duplicate entry`错误
    - 表的自增值也**没有回退**

#### 事务回滚
```sql
INSERT INTO t VALUES (null,1,1);
BEGIN;
INSERT INTO t VALUES (null,2,2);
ROLLBACK;
INSERT INTO t VALUES (null,2,2);

-- id不连续
mysql> SELECT * FROM t;
+----+------+------+
| id | c    | d    |
+----+------+------+
|  1 |    1 |    1 |
|  3 |    2 |    2 |
+----+------+------+
```

## 不回退的原因
1. 主要原因是为了**提高性能**
2. 两个并行执行的事务，在申请自增值的时候，需要**加锁**，顺序申请
3. 假设事务A申请了id=2，事务B申请了id=3，此时表t当前的自增值为4
4. 事务B正确提交了，但事务A出现了唯一键冲突
5. 假设允许事务A把自增值回退，即回退到2
    - 此刻，**表里已经有id=3的行，但表t当前的自增值为2**
6. 接下来，继续执行的其它事务会申请到id=2，再申请id=3，在插入过程中就会**主键冲突**

### 解决思路
1. 每次申请id之前，先判断表里是否已经有这个id，如果存在，则跳过这个id
    - **成本太高**，因为需要到**主键索引**上查找
2. 把自增id的锁范围扩大，必须等到一个事务执行完成并提交后，下一个事务才能再申请自增id
    - **锁粒度太大，系统并发能力大大下降**
3. 上述两个办法都会导致**性能问题**，根本原因是允许自增值回退
    - **InnoDB放弃了自增值回退**，自增id**保证递增**的，但**不保证是连续**的

## 自增锁
1. 自增锁不是事务锁，每次申请完就马上释放，以便其它事务再申请
2. MySQL 5.0，自增锁的范围是**语句级别**
    - 一个语句申请了自增锁，需要等到语句结束后才会释放，_**影响并发度**_
3. MySQL 5.1.22，引入了一个新策略，新增参数`innodb_autoinc_lock_mode`，默认值为1
    - `innodb_autoinc_lock_mode=0`，表示采用之前MySQL 5.0的策略，**语句级别**
    - `innodb_autoinc_lock_mode=1`
        - 普通`INSERT`语句，自增锁在申请后**马上释放**，包括批量的`INSERT INTO...VALUES`
        - 类似`INSERT...SELECT`这样的**批量插入**（无法明确数量）的语句，还是**语句级别**
    - `innodb_autoinc_lock_mode=2`，所有的申请自增id的动作都是**申请后就释放锁**

```sql
-- MySQL 5.6
mysql> SELECT @@innodb_autoinc_lock_mode;
+----------------------------+
| @@innodb_autoinc_lock_mode |
+----------------------------+
|                          1 |
+----------------------------+
```

### INSERT...SELECT
默认配置下，`INSERT...SELECT`的自增锁是语句级别的，这是为了**数据的一致性**

#### 操作序列
假设session B是申请了自增值以后马上释放自增锁，并且`binglog_format=STATEMENT`

| session A | session B |
| ---- | ---- |
| INSERT INTO t VALUES (null,1,1); | |
| INSERT INTO t VALUES (null,2,2); | |
| INSERT INTO t VALUES (null,3,3); | |
| INSERT INTO t VALUES (null,4,4); | |
| | CREATE TABLE t2 LIKE t; |
| INSERT INTO t2 VALUES (null,5,5); | INSERT INTO t2(c,d) SELECT c,d FROM t; |

1. session B先插入两个记录`(1,1,1)`和`(2,2,2)`
2. 然后，session A来申请自增id得到id=3，插入`(3,5,5)`
3. 之后，session B继续执行，插入两条记录`(4,3,3)`和`(5,4,4)`
4. 两个session是同时执行插入命令的，binlog里面对表t2的更新日志只有两种情况
    - 要么先记session A的，要么先记session B的
    - 不论哪一种，这个binlog拿到备库去执行或者拿来恢复临时实例
    - 备库和临时实例里面，session B这个语句执行出来，生成的结果里面，id都是连续的，_**主备不一致**_

#### 解决思路
1. 让原库的批量插入语句，固定生成**连续的id值**，自增锁直到语句执行结束才释放
    - `innodb_autoinc_lock_mode=1`
2. binlog里面把插入数据的操作都**如实记录**下来，到备库执行的时候，不再依赖于自增主键去生成
    - `innodb_autoinc_lock_mode=2` + `binlog_format=ROW`
    - 从**并发插入的性能角度**考虑，**推荐使用**，既能提升并发度，又不会出现数据不一致

### 批量插入
1. 批量插入数据（**无法确定插入数量**），如果`innodb_autoinc_lock_mode=1`，自增锁为**语句级别**
    - `INSERT...SELECT`
    - `REPLACE...SELECT`
    - `LOAD DATA`
2. 普通批量插入：`INSERT INTO...VALUES`
    - 即使采用`innodb_autoinc_lock_mode=1`，也不会等语句执行完成后才释放锁
    - 因为这类语句在申请自增id时，可以**精确计算**出多少个id，然后一次性申请，申请完成后释放

### 批量申请id策略
1. 目的是为了减少申请次数，**提高并发插入的性能**
2. 语句执行过程中，第一次申请自增id，会分配1个
3. 1个用完以后，这个梗语句会第二次申请自增id，会分配2个
4. 依次类推，同一个语句去申请自增id，每次申请到点自增id个数都是上一次的**2倍**

```sql
INSERT INTO t VALUES (null,1,1);
INSERT INTO t VALUES (null,2,2);
INSERT INTO t VALUES (null,3,3);
INSERT INTO t VALUES (null,4,4);
CREATE TABLE t2 LIKE t;
-- 第一次申请id=1，第二次申请id=2~3，第三次申请id=4~7
INSERT INTO t2(c,d) SELECT c,d FROM t;
-- 实际插入为(8,5,5)
INSERT INTO t2 VALUES (null,5,5);

mysql> SELECT * FROM t2;
+----+------+------+
| id | c    | d    |
+----+------+------+
|  1 |    1 |    1 |
|  2 |    2 |    2 |
|  3 |    3 |    3 |
|  4 |    4 |    4 |
|  8 |    5 |    5 |
+----+------+------+
```

## binlog
自增ID的生成顺序，和binlog的写入顺序可能是不相同的
```sql
SET binlog_format=STATEMENT;
CREATE TABLE t (id INT AUTO_INCREMENT PRIMARY KEY);
INSERT INTO t VALUES (null);
```

```
BEGIN
$ mysqlbinlog -vv ./binlog.000027
/*!*/;
# at 15720
# at 15752
#190319 22:35:13 server id 1  end_log_pos 15752 CRC32 0xf118154f 	Intvar
SET INSERT_ID=1/*!*/;
#190319 22:35:13 server id 1  end_log_pos 15856 CRC32 0x40050594 	Query	thread_id=28	exec_time=0	error_code=0
SET TIMESTAMP=1553006113/*!*/;
INSERT INTO t VALUES (null)
```
1. `SET INSERT_ID=1`表示在同一个线程里下一次需要用到自增值的时候，固定用1
2. `SET INSERT_ID`语句是固定跟在`INSERT`语句之前的
3. 主库上语句A的id是1，语句B的id是2，写入binlog的顺序是先B后A，binlog如下
    - SET INSERT_ID=2
    - 语句B
    - SET INSERT_ID=1
    - 语句A
4. 在备库上语句B用到的`INSERT_ID`依然为2，_**与主库一致**_

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
