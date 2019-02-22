---
title: MySQL -- 主从一致
date: 2019-02-22 11:14:31
categories:
    - MySQL
tags:
    - MySQL
---

## 主从切换
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-master-slave-switch.png" width=500/>

<!-- more -->

1. 在状态1，客户端的读写都是直接访问节点A，节点B是节点A的从库
    - 只是将节点A的更新都同步过来，在节点B本地执行，保持一致
2. 在状态1，虽然节点B没有被直接访问，但依然建议设置成`readonly`模式
    - 运营类的查询语句会在从库上执行，设置成`readonly`模式能够防止一些误操作
    - 防止切换逻辑有Bug，例如出现**双写**，造成主**从不一致**
    - 可以通过`readonly`状态来判断节点的**角色**
3. 在状态1，节点B设置为`readonly`模式，同样能与节点A保持同步更新
    - `readonly`设置对**超级权限用户**是无效的，而节点B中用于**同步更新**的线程，就拥有超级权限

## 主从同步
在节点A执行update语句，然后同步到节点B
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-master-slave-replication.png" width=600/>
1. 从库B与主库A之间维持一个**长连接**，主库A内部有一个专门用于服务于从库B长连接的线程
2. 在从库B上执行`CHANGE MASTER`命令，设置主库A的信息
    - `IP`、`PORT`、`USER`、`PASSWORD`
    - 从**哪个位置**（**文件名** + **日志偏移量**）开始请求`binlog`
3. 在从库B上执行`START SLAVE`命令，这时从库B会启动两个线程：`io_thread` + `sql_thread`
    - `io_thread`：负责与主库A**建立连接**
4. 主库A校验完`USER`和`PASSWORD`后，按照从库B传过来的**位置信息**，从本地读取`binlog`，发送给从库B
5. 从库B拿到`binlog`后，写到本地文件，即**中转日志**（`relaylog`）
6. `sql_thread`读取`relaylog`，解析出日志里的命令，然后执行

## binlog

### 格式
1. STATEMENT
2. ROW
3. MIXED = STATEMENT + ROW

### 表初始化
```sql
CREATE TABLE `t` (
  `id` INT(11) NOT NULL,
  `a` INT(11) DEFAULT NULL,
  `t_modified` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `a` (`a`),
  KEY `t_modified`(`t_modified`)
) ENGINE=InnoDB;

INSERT INTO t VALUES (1,1,'2018-11-13');
INSERT INTO t VALUES (2,2,'2018-11-12');
INSERT INTO t VALUES (3,3,'2018-11-11');
INSERT INTO t VALUES (4,4,'2018-11-10');
INSERT INTO t VALUES (5,5,'2018-11-09');
```

### STATEMENT
```sql
SET binlog_format='STATEMENT';
-- mysql -c启动
DELETE FROM t /*comment*/  WHERE a>=4 AND T_MODIFIED<='2018-11-10' LIMIT 1;
```
```sql
mysql > SHOW BINLOG EVENTS IN 'binlog.000014';
| binlog.000014 | 6814 | Anonymous_Gtid |         1 |        6889 | SET @@SESSION.GTID_NEXT= 'ANONYMOUS'
| binlog.000014 | 6889 | Query          |         1 |        6979 | BEGIN
| binlog.000014 | 6979 | Query          |         1 |        7138 | use `test`; DELETE FROM t /*comment*/  WHERE a>=4 AND T_MODIFIED<='2018-11-10' LIMIT 1
| binlog.000014 | 7138 | Xid            |         1 |        7169 | COMMIT /* xid=73 */
```
1. `BEGIN`与`COMMIT`对应，包装成一个事务，`xid=73`是**事务ID**
2. `use test;`是**自动添加**的，保证日志在从库上执行时，能找到正确的库
3. `STATEMENT`格式的`binlog`记录的是**SQL原文**

#### SHOW WARNINGS
```sql
mysql> SHOW WARNINGS;
+-------+------+--------------------------------------------------------------------------------------------------------------------------------+
| Level | Code | Message                                                                                                                        |
+-------+------+--------------------------------------------------------------------------------------------------------------------------------+
| Note  | 1592 | Unsafe statement written to the binary log using statement format since BINLOG_FORMAT = STATEMENT.                             |
|       |      | The statement is unsafe because it uses a LIMIT clause. This is unsafe because the set of rows included cannot be predicted.   |
+-------+------+--------------------------------------------------------------------------------------------------------------------------------+

mysql> EXPLAIN DELETE FROM t /*comment*/  WHERE a>=4 AND T_MODIFIED<='2018-11-10' LIMIT 1;
+----+-------------+-------+------------+-------+---------------+------+---------+-------+------+----------+-------------+
| id | select_type | table | partitions | type  | possible_keys | key  | key_len | ref   | rows | filtered | Extra       |
+----+-------------+-------+------------+-------+---------------+------+---------+-------+------+----------+-------------+
|  1 | DELETE      | t     | NULL       | range | a,t_modified  | a    | 5       | const |    1 |   100.00 | Using where |
+----+-------------+-------+------------+-------+---------------+------+---------+-------+------+----------+-------------+
```
1. `Unsafe`的原因：`DELETE` + `LIMIT`，可能会导致**主从不一致**
2. 如果`DELETE`语句使用的是索引`a`，那么删除的是`a=4`这一行
3. 如果`DELETE`语句使用的是索引`t_modified`，那么删除的是`t_modified='2018-11-09'`这一行，即`a=5`这一行
4. 当`binlog_format=STATEMENT`，`binlog`记录的只是**SQL原文**，可能会导致**主从不一致**

### ROW
```sql
SET binlog_format='ROW';
-- mysql -c启动
DELETE FROM t /*comment*/  WHERE a>=4 AND T_MODIFIED<='2018-11-10' LIMIT 1;
```
```sql
mysql > SHOW BINLOG EVENTS IN 'binlog.000014';
| binlog.000014 | 12010 | Anonymous_Gtid |         1 |       12085 | SET @@SESSION.GTID_NEXT= 'ANONYMOUS'
| binlog.000014 | 12085 | Query          |         1 |       12168 | BEGIN
| binlog.000014 | 12168 | Table_map      |         1 |       12218 | table_id: 72 (test.t)
| binlog.000014 | 12218 | Delete_rows    |         1 |       12266 | table_id: 72 flags: STMT_END_F
| binlog.000014 | 12266 | Xid            |         1 |       12297 | COMMIT /* xid=102 */
```
1. `ROW`格式的`binlog`并没有记录**SQL原文**，而是替换成了两个`Event`：`Table_map` + `Delete_rows`
    - `Table_map Event`：说明要操作的是`test.t`
    - `Delete_rows Event`：定义**删除**行为
2. 查看更详细的信息需要借助`mysqlbinlog`命令，从`12010`开始解析日志

#### mysqlbinlog
```
$ mysqlbinlog -vv ./binlog.000014 --start-position=12010;
/*!50530 SET @@SESSION.PSEUDO_SLAVE_MODE=1*/;
/*!50003 SET @OLD_COMPLETION_TYPE=@@COMPLETION_TYPE,COMPLETION_TYPE=0*/;
DELIMITER /*!*/;
# at 4
#190221 13:29:32 server id 1  end_log_pos 124 CRC32 0xe3d095e4 	Start: binlog v 4, server v 8.0.12 created 190221 13:29:32 at startup
# Warning: this binlog is either in use or was not closed properly.
ROLLBACK/*!*/;
BINLOG '
PDduXA8BAAAAeAAAAHwAAAABAAQAOC4wLjEyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAA8N25cEwANAAgAAAAABAAEAAAAYAAEGggAAAAICAgCAAAACgoKKioAEjQA
CgHkldDj
'/*!*/;
# at 12010
#190222 16:35:19 server id 1  end_log_pos 12085 CRC32 0xfab19774 	Anonymous_GTID	last_committed=39	sequence_number=40	rbr_only=yes	original_committed_timestamp=1550824519718005	immediate_commit_timestamp=1550824519718005	transaction_length=287
/*!50718 SET TRANSACTION ISOLATION LEVEL READ COMMITTED*//*!*/;
# original_commit_timestamp=1550824519718005 (2019-02-22 16:35:19.718005 CST)
# immediate_commit_timestamp=1550824519718005 (2019-02-22 16:35:19.718005 CST)
/*!80001 SET @@session.original_commit_timestamp=1550824519718005*//*!*/;
SET @@SESSION.GTID_NEXT= 'ANONYMOUS'/*!*/;
# at 12085
#190222 16:35:19 server id 1  end_log_pos 12168 CRC32 0x322f1087 	Query	thread_id=12	exec_time=0	error_code=0
SET TIMESTAMP=1550824519/*!*/;
SET @@session.pseudo_thread_id=12/*!*/;
SET @@session.foreign_key_checks=1, @@session.sql_auto_is_null=0, @@session.unique_checks=1, @@session.autocommit=1/*!*/;
SET @@session.sql_mode=1168113696/*!*/;
SET @@session.auto_increment_increment=1, @@session.auto_increment_offset=1/*!*/;
/*!\C utf8mb4 *//*!*/;
SET @@session.character_set_client=255,@@session.collation_connection=255,@@session.collation_server=33/*!*/;
SET @@session.time_zone='SYSTEM'/*!*/;
SET @@session.lc_time_names=0/*!*/;
SET @@session.collation_database=DEFAULT/*!*/;
/*!80005 SET @@session.default_collation_for_utf8mb4=255*//*!*/;
BEGIN
/*!*/;
# at 12168
#190222 16:35:19 server id 1  end_log_pos 12218 CRC32 0x7cb9c355 	Table_map: `test`.`t` mapped to number 72
# at 12218
#190222 16:35:19 server id 1  end_log_pos 12266 CRC32 0x155fe45e 	Delete_rows: table id 72 flags: STMT_END_F

BINLOG '
R7RvXBMBAAAAMgAAALovAAAAAEgAAAAAAAEABHRlc3QAAXQAAwMDEQEAAgEBAFXDuXw=
R7RvXCABAAAAMAAAAOovAAAAAEgAAAAAAAEAAgAD/wAEAAAABAAAAFvlrwBe5F8V
'/*!*/;
### DELETE FROM `test`.`t`
### WHERE
###   @1=4 /* INT meta=0 nullable=0 is_null=0 */
###   @2=4 /* INT meta=0 nullable=1 is_null=0 */
###   @3=1541779200 /* TIMESTAMP(0) meta=0 nullable=0 is_null=0 */
# at 12266
#190222 16:35:19 server id 1  end_log_pos 12297 CRC32 0x4d1336cc 	Xid = 102
COMMIT/*!*/;
SET @@SESSION.GTID_NEXT= 'AUTOMATIC' /* added by mysqlbinlog */ /*!*/;
DELIMITER ;
# End of log file
/*!50003 SET COMPLETION_TYPE=@OLD_COMPLETION_TYPE*/;
/*!50530 SET @@SESSION.PSEUDO_SLAVE_MODE=0*/;
```
1. `server id 1`：事务在`server_id=1`的库上执行
2. 每个`Event`都有`CRC32`值，控制参数`binlog_checksum`
3. `Table_map Event`会map到一个数字，代表一张要打开的表
    - 如果要操作多张表，会有多个`Table_map Event`
4. `@1=4,@2=4,@3=1541779200`：详细记录**各个字段的值**
5. `binlog_row_image`
    - `FULL`：记录**所有字段**的值
    - `MINIMAL`：记录**必要**的信息，这里只会记录`id=4`
6. 当`binlog_format=ROW`，传到从库的执行时会删除`id=4`的行，不会主从不一致

```sql
mysql> SHOW VARIABLES LIKE '%binlog_checksum%';
+-----------------+-------+
| Variable_name   | Value |
+-----------------+-------+
| binlog_checksum | CRC32 |
+-----------------+-------+

mysql> SHOW VARIABLES LIKE '%binlog_row_image%';
+------------------+-------+
| Variable_name    | Value |
+------------------+-------+
| binlog_row_image | FULL  |
+------------------+-------+
```

### MIXED
1. `STATEMENT`：可能导致**主从不一致**
2. `ROW`：非常**占用空间**和**耗费IO资源**
3. `MIXED`是一个折中方案
    - MySQL自行判断SQL语句是否有可能导致**主从不一致**
    - 如果有可能则采用`ROW`格式，否则采用`STATEMENT`格式
4. 线上配置最少是`MIXED`，更严格是`ROW`（**推荐**，可用于**恢复数据**）

#### now
```sql
SET binlog_format='MIXED';
INSERT INTO t VALUES (10,10, NOW());
```
```sql
-- 采用的是STATEMENT格式
mysql > SHOW BINLOG EVENTS IN 'binlog.000014';
| binlog.000014 | 14314 | Anonymous_Gtid |         1 |       14389 | SET @@SESSION.GTID_NEXT= 'ANONYMOUS'
| binlog.000014 | 14389 | Query          |         1 |       14479 | BEGIN
| binlog.000014 | 14479 | Query          |         1 |       14599 | use `test`; INSERT INTO t VALUES (10,10, NOW())
| binlog.000014 | 14599 | Xid            |         1 |       14630 | COMMIT /* xid=116 */
```
```sql
$ mysqlbinlog -vv ./binlog.000014 --start-position=14479 --stop-position=14599;
/*!50530 SET @@SESSION.PSEUDO_SLAVE_MODE=1*/;
/*!50003 SET @OLD_COMPLETION_TYPE=@@COMPLETION_TYPE,COMPLETION_TYPE=0*/;
DELIMITER /*!*/;
# at 4
#190221 13:29:32 server id 1  end_log_pos 124 CRC32 0xe3d095e4 	Start: binlog v 4, server v 8.0.12 created 190221 13:29:32 at startup
# Warning: this binlog is either in use or was not closed properly.
ROLLBACK/*!*/;
BINLOG '
PDduXA8BAAAAeAAAAHwAAAABAAQAOC4wLjEyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAA8N25cEwANAAgAAAAABAAEAAAAYAAEGggAAAAICAgCAAAACgoKKioAEjQA
CgHkldDj
'/*!*/;
# at 14479
#190222 17:39:17 server id 1  end_log_pos 14599 CRC32 0xcbe6d9c4 	Query	thread_id=12	exec_time=0	error_code=0
use `test`/*!*/;
SET TIMESTAMP=1550828357/*!*/;
SET @@session.pseudo_thread_id=12/*!*/;
SET @@session.foreign_key_checks=1, @@session.sql_auto_is_null=0, @@session.unique_checks=1, @@session.autocommit=1/*!*/;
SET @@session.sql_mode=1168113696/*!*/;
SET @@session.auto_increment_increment=1, @@session.auto_increment_offset=1/*!*/;
/*!\C utf8mb4 *//*!*/;
SET @@session.character_set_client=255,@@session.collation_connection=255,@@session.collation_server=33/*!*/;
SET @@session.time_zone='SYSTEM'/*!*/;
SET @@session.lc_time_names=0/*!*/;
SET @@session.collation_database=DEFAULT/*!*/;
/*!80005 SET @@session.default_collation_for_utf8mb4=255*//*!*/;
INSERT INTO t VALUES (10,10, NOW())
/*!*/;
SET @@SESSION.GTID_NEXT= 'AUTOMATIC' /* added by mysqlbinlog */ /*!*/;
DELIMITER ;
# End of log file
/*!50003 SET COMPLETION_TYPE=@OLD_COMPLETION_TYPE*/;
/*!50530 SET @@SESSION.PSEUDO_SLAVE_MODE=0*/;
```
记录`binlog`时，执行了`SET TIMESTAMP`命令，约定了后续`now()`函数的返回值，因此确保了**主从一致**

## 恢复数据

### DELETE
1. 即便执行的是`DELETE`语句，`ROW`格式（`binlog_row_image=FULL`）的`binlog`也会保存被删除的**整行数据**
2. 当发现误删数据后，可以直接将`binlog`中的`DELETE`换成`INSERT`即可

### INSERT
1. 与`DELETE`类似，能**精确定位**到误插入的数据
2. 将`INSERT`换成`DELETE`即可

### UPDATE
1. 针对`UPDATE`语句，`ROW`格式的`binlog`记录的是**修改前后的整行数据**
2. 如果是误更新，只需要将这个`EVENT`前后的两行信息**对调**一下，再到数据库执行即可

### 标准做法
用`mysqlbinlog`先**解析**出来，然后把**整个解析结果**发个MySQL执行
```
$ mysqlbinlog binlog.000014 --start-position=14314 --stop-position=14599 | mysql -h127.0.0.1 -P13000 -u$user -p$pwd;
```

## 循环复制
线上常用为`Master-Master`结构，节点A与节点B为**互为主从**关系（在切换过程中无需修改主从关系）
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-master-master-switch.png" width=500/>
1. `log_slave_updates=ON`，从库执行完`relaylog`后也会生成`binlog`
2. 从节点A更新的事务，`binlog`记录的都是节点A的`server id`
3. 传到节点B执行以后，节点B生成的`binlog`的`server id`依然是节点A的`server id`
4. 再传回到节点A，节点A判断到这个`server id`与自己相同，就不会再处理该日志，解决**循环复制**的问题

```sql
mysql> SHOW VARIABLES LIKE '%log_slave%';
+-------------------+-------+
| Variable_name     | Value |
+-------------------+-------+
| log_slave_updates | ON    |
+-------------------+-------+
```

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
