---
title: MySQL -- 主从切换
date: 2019-02-27 01:10:39
categories:
    - Storage
    - MySQL
tags:
    - Storage
    - MySQL
---

## 一主多从
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-master-multi-slave.png" width=500/>


<!-- more -->

1. 虚线箭头为**主从关系**，`A`和`A'`互为主从，`B`、`C`、`D`指向主库`A`
2. 一主多从的设置，一般用于**读写分离**，主库负责**所有的写入**和**一部分读**，其它读请求由从库分担

## 主库故障切换
`A'`成为新的主库，`B`、`C`、`D`指向主库`A'`
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-master-crash-switch.png" width=500/>


## 基于位点的切换
`B`原先是`A`的从库，本地记录的也是`A`的位点，但**相同的日志**，`A`的位点与`A'`的位点是**不同**的
```sql
-- 节点B设置为节点A'的从库
CHANGE MASTER TO
MASTER_HOST=$host_name
MASTER_PORT=$port
MASTER_USER=$user_name
MASTER_PASSWORD=$password
MASTER_LOG_FILE=$master_log_name
MASTER_LOG_POS=$master_log_pos
```

### 寻找位点
1. _**很难精确，只能大概获取一个位置**_
2. 由于在切换过程中**不能丢数据**，在寻找位点的时候，总是找一个**稍微往前的位点**，跳过那些已经在`B`执行过的事务

#### 常规步骤
1. 等待新主库`A'`将所有`relaylog`全部执行完
2. 在`A'`上执行`SHOW MASTER STATUS`，得到`A'`上最新的`File`和`Position`
3. 获取原主库`A`发生故障的时刻`T`
4. 使用`mysqlbinlog`解析`A'`的`File`，得到时刻`T`的位点

```sql
-- end_log_pos=123，表示在时刻T，A'写入新binlog的位置，作为B的CHANGE MASTER TO命令的MASTER_LOG_POS参数
$ mysqlbinlog /var/lib/mysql/slave-bin.000009 --start-datetime='2019-02-26 17:44:00' --stop-datetime='2019-02-26 17:45:00' | grep end_log_pos
#190226 17:42:01 server id 2  end_log_pos 123 CRC32 0x5b852e9b 	Start: binlog v 4, server v 5.7.25-log created 190226 17:42:01 at startup
```

#### 位点不精确
1. 假设在时刻`T`，原主库`A`已经执行完成了一个`INSERT`语句，插入一行记录`R`
    - 并且已经将`binlog`传给`A'`和B，然后原主库`A`掉电
2. 在`B`上，由于已经同步了`binlog`，`R`这一行是已经存在的
3. 在新主库`A'`上，`R`这一行也是存在的，日志写在了`123`这个位置之后
4. 在`B`上执行`CHANGE MASTER TO`，执行`A'`的`File`文件的`123`位置
    - 就会把插入`R`这一行数据的`binlog`又同步到`B`去执行
    - `B`的同步线程会报**重复主键**错误，然后停止同步

##### 跳过错误
方式1：主动跳过一个事务，需要**持续观察**，每次碰到这些错误，就执行一次跳过命令
```sql
SET GLOBAL sql_slave_skip_counter=1;
START SLAVE;
```
方式1：设置`slave_skip_errors=1032,1062`，`1032`错误是删除数据时**找不到行**，`1062`错误是插入数据时报**唯一键冲突**
在**主从切换过程**中，直接跳过`1032`和`1062`是**无损**的，等主从间的同步关系建立完成后，需要将`slave_skip_errors`恢复为`OFF`

```sql
mysql> SHOW VARIABLES LIKE '%slave_skip_errors%';
+-------------------+-------+
| Variable_name     | Value |
+-------------------+-------+
| slave_skip_errors | OFF   |
+-------------------+-------+
```

## 基于GTID的切换
1. GTID: Global Transaction Identifier，**全局事务ID**
2. 在事务**提交**时生成，是事务的唯一标识，组成`GTID = server_uuid:gno`
    - `server_uuid`是实例第一次**启动**时自动生成的，是一个**全局唯一** 的值
    - `gno`是一个整数，初始值为`1`，每次**提交事务**时分配，`+1`
3. 官方定义：`GTID = source_id:transaction_id`
    - `source_id`即`server_uuid`
    - `transaction_id`容易造成误解
        - `transaction_id`一般指事务ID，是在事务**执行过程**中分配的，即使事务**回滚**了，事务ID也会**递增**
        - 而`gno`只有在事务**提交**时才会分配，因此`GTID`往往是**连续**的
4. 开启`GTID`模式，添加启动参数`gtid_mode=ON`和`enforce_gtid_consistency=ON`
5. 在`GTID`模式下，每个事务都会跟一个`GTID`一一对应，生成`GTID`的方式由参数`gtid_next`（Session）控制
6. 每个MySQL实例都维护了一个`GTID`集合，用于表示：_**实例执行过的所有事务**_

### gtid_next
1. `gtid_next=AUTOMATIC`，MySQL会将`server_uuid:gno`分配给该事务
    - 记录`binlog`时，会先记录一行`SET @@SESSION.GTID_NEXT=server_uuid:gno`，将该`GTID`加入到本实例的`GTID`集合
2. `gtid_next=UUID:NUMBER`，通过`SET @@SESSION.GTID_NEXT=current_gtid`执行
    - 如果`current_gtid`已经**存在**于实例的`GTID`集合中，那么接下来执行的这个事务会直接被系统**忽略**
    - 如果`current_gtid`并**没有存在**于实例的`GTID`集合中，那么接下来执行的这个事务会被分配为`current_gtid`
    - `current_gtid`只能给**一个事务**使用，如果执行下一个事务，需要把`gtid_next`设置成另一个`GTID`或者`AUTOMATIC`

```sql
-- gtid_next=AUTOMATIC
mysql> SHOW BINLOG EVENTS IN 'master-bin.000003';
+-------------------+-----+----------------+-----------+-------------+--------------------------------------------------------------------------------------------------------------------------------------------+
| Log_name          | Pos | Event_type     | Server_id | End_log_pos | Info                                                                                                                                       |
+-------------------+-----+----------------+-----------+-------------+--------------------------------------------------------------------------------------------------------------------------------------------+
| master-bin.000003 |   4 | Format_desc    |         1 |         123 | Server ver: 5.7.25-log, Binlog ver: 4                                                                                                      |
| master-bin.000003 | 123 | Previous_gtids |         1 |         194 | b8502fe3-3b4a-11e9-9562-0242ac110002:1-5                                                                                                   |
| master-bin.000003 | 194 | Gtid           |         1 |         259 | SET @@SESSION.GTID_NEXT= 'b8502fe3-3b4a-11e9-9562-0242ac110002:6'                                                                          |
| master-bin.000003 | 259 | Query          |         1 |         484 | GRANT REPLICATION SLAVE ON *.* TO 'replication'@'%' IDENTIFIED WITH 'mysql_native_password' AS '*6BB4837EB74329105EE4568DDA7DC67ED2CA2AD9' |
| master-bin.000003 | 484 | Gtid           |         1 |         549 | SET @@SESSION.GTID_NEXT= 'b8502fe3-3b4a-11e9-9562-0242ac110002:7'                                                                          |
| master-bin.000003 | 549 | Query          |         1 |         643 | CREATE DATABASE test                                                                                                                       |
+-------------------+-----+----------------+-----------+-------------+--------------------------------------------------------------------------------------------------------------------------------------------+
```

### 表初始化
```sql
CREATE TABLE `t` (
  `id` INT(11) NOT NULL,
  `c` INT(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

INSERT INTO t VALUES (1,1);
```

#### 对应的binlog
```sql
mysql> SHOW MASTER STATUS;
+-------------------+----------+--------------+------------------+-------------------------------------------+
| File              | Position | Binlog_Do_DB | Binlog_Ignore_DB | Executed_Gtid_Set                         |
+-------------------+----------+--------------+------------------+-------------------------------------------+
| master-bin.000004 |      877 |              |                  | b8502fe3-3b4a-11e9-9562-0242ac110002:1-12 |
+-------------------+----------+--------------+------------------+-------------------------------------------+

mysql> SHOW BINLOG EVENTS IN 'master-bin.000004';
+-------------------+-----+----------------+-----------+-------------+--------------------------------------------------------------------+
| Log_name          | Pos | Event_type     | Server_id | End_log_pos | Info                                                               |
+-------------------+-----+----------------+-----------+-------------+--------------------------------------------------------------------+
| master-bin.000004 |   4 | Format_desc    |         1 |         123 | Server ver: 5.7.25-log, Binlog ver: 4                              |
| master-bin.000004 | 123 | Previous_gtids |         1 |         194 | b8502fe3-3b4a-11e9-9562-0242ac110002:1-9                           |
| master-bin.000004 | 194 | Gtid           |         1 |         259 | SET @@SESSION.GTID_NEXT= 'b8502fe3-3b4a-11e9-9562-0242ac110002:10' |
| master-bin.000004 | 259 | Query          |         1 |         373 | use `test`; DROP TABLE `t` /* generated by server */               |
| master-bin.000004 | 373 | Gtid           |         1 |         438 | SET @@SESSION.GTID_NEXT= 'b8502fe3-3b4a-11e9-9562-0242ac110002:11' |
| master-bin.000004 | 438 | Query          |         1 |         620 | use `test`; CREATE TABLE `t` (
  `id` INT(11) NOT NULL,
  `c` INT(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB |
| master-bin.000004 | 620 | Gtid           |         1 |         685 | SET @@SESSION.GTID_NEXT= 'b8502fe3-3b4a-11e9-9562-0242ac110002:12' |
| master-bin.000004 | 685 | Query          |         1 |         757 | BEGIN                                                              |
| master-bin.000004 | 757 | Table_map      |         1 |         802 | table_id: 109 (test.t)                                             |
| master-bin.000004 | 802 | Write_rows     |         1 |         846 | table_id: 109 flags: STMT_END_F                                    |
| master-bin.000004 | 846 | Xid            |         1 |         877 | COMMIT /* xid=27 */                                                |
+-------------------+-----+----------------+-----------+-------------+--------------------------------------------------------------------+
```
1. 事务`BEGIN`之前有一条`SET @@SESSION.GTID_NEXT`
2. 如果实例X有从库Z，那么将`CREATE TABLE`和`INSERT`语句的`binlog`同步到从库Z执行
    - 执行事务之前，会先执行两个`SET`命令，这样两个`GTID`就会被加入到从库Z的`GTID`集合

#### 主键冲突
1. 如果实例X是实例Y的从库，之前实例Y上执行`INSERT INTO t VALUES (1,1)`
    - 对应的`GTID`为`aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee:12`
    - 实例X需要同步该事务过来执行，会报**主键冲突**的错误，实例X的同步线程停止，处理方法如下

```sql
-- 实例X提交一个空事务，将该GTID加到实例X的GTID集合中
SET gtid_next='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee:12';
BEGIN;
COMMIT;
-- 实例X的Executed_Gtid_Set已经包含了aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee:12
mysql> SHOW MASTER STATUS;
+-------------------+----------+--------------+------------------+------------------------------------------------------------------------------------+
| File              | Position | Binlog_Do_DB | Binlog_Ignore_DB | Executed_Gtid_Set                                                                  |
+-------------------+----------+--------------+------------------+------------------------------------------------------------------------------------+
| master-bin.000004 |     1087 |              |                  | aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee:12,b8502fe3-3b4a-11e9-9562-0242ac110002:1-12  |
+-------------------+----------+--------------+------------------+------------------------------------------------------------------------------------+

-- 恢复GTID的默认分配行为
SET gtid_next=AUTOMATIC;

-- 实例X还是会继续执行实例Y传过来的事务
-- 但由于实例X的GTID集合已经包含了aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee:12，因此实例X会直接跳过该事务
START SLAVE;
```

### 主从切换
```
CHANGE MASTER TO
MASTER_HOST=$host_name
MASTER_PORT=$port
MASTER_USER=$user_name
MASTER_PASSWORD=$password
master_auto_position=1
```
1. `master_auto_position=1`：主从关系使用的是`GTID`协议，不再需要指定`MASTER_LOG_FILE`和`MASTER_LOG_POS`
2. 实例`A'`的`GTID`集合记为`set_a`，实例`B`的`GTID`集合记为`set_b`
3. 实例`B`执行`START SLAVE`，取`binlog`的逻辑如下

#### START SLAVE
1. 实例`B`指定新主库`A'`，基于**主从协议**建立连接
2. 实例`B`把`set_b`发送给`A'`
3. 实例`A'`计算出`seb_a`和`set_b`的`GTID`差集（存在于`set_a`，但不存在于`set_b`的`GTID`集合）
    - 判断实例`A'`本地是否包含了**差集需要的所有`binlog`事务**
    - 如果**没有全部包含**，说明实例`A'`已经把实例`B`所需要的`binlog`删除掉了，直接返回错误
    - 如果**全部包含**，实例`A'`从自己的`binlog`文件里面，找到第1个不在`set_b`的事务，发送给实例`B`
        - 然后从该事务开始，往后读文件，按顺序读取`binlog`，发给实例`B`去执行

#### 位点 VS GTID
1. 基于`GTID`的主从关系里面，系统认为只要**建立了主从关系**，就必须保证**主库发给从库的日志是完整**的
2. 如果实例`B`需要的日志已经不存在了，那么实例`A'`就拒绝将日志发送给实例`B`
3. 基于**位点**的协议，是由**从库决定**的，从库指定哪个位点，主库就发送什么位点，不做**日志完整性**的判断
4. 基于`GTID`的协议，主从切换**不再需要找位点**，而找位点的工作在实例`A'`内部**自动完成**

#### 日志格式
1. 切换前
    - 实例`B`的`GTID`集合：`server_uuid_of_A:1-N`
2. 新主库`A'`自己生成的`binlog`对应的`GTID`集合：`server_uuid_of_A':1-M`
3. 切换后
    - 实例`B`的`GTID`集合：`server_uuid_of_A:1-N,server_uuid_of_A':1-M`

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
