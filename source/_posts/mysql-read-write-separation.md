---
title: MySQL -- 读写分离
date: 2019-03-02 20:36:03
categories:
    - MySQL
tags:
    - MySQL
---

## 读写分离架构

### 客户端直连
<img src="	https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-read-write-separation-basic.png" width=800/>


<!-- more -->

### Proxy
<img src="	https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-read-write-separation-proxy.png" width=800/>


### 对比
1. 客户端直连
    - 少了一层`Proxy`转发，查询性能稍微好一点
    - 整体架构简单，排查问题方便
    - 需要了解**后端部署细节**，在出现主从切换、库迁移时，客户端有感知，需要调整数据库连接信息
        - 一般伴随着一个负责管理后端的组件，例如`ZooKeeper`
2. Proxy -- **发展趋势**
    - 对客户端友好，客户端不需要关注后端细节，但后端维护成本较高
    - `Proxy`也需要**高可用**架构，带Proxy的整体架构相对复杂

### 过期读
由于**主从延迟**，主库上执行完一个更新事务后，立马在从库上执行查询，有可能读到刚刚的事务更新之前的状态

## 解决方案

### 强制走主库
1. 将查询请求做**分类**
    - 必须要拿到最新结果的请求，强制将其发送到主库上
    - 可以读到旧数据的请求，将其发到从库上
2. 如果完全不能接受过期读，例如金融类业务，相当于放弃读写分离，所有的读写压力都在主库上

### SLEEP
1. 主库更新后，读从库之前先`SLEEP`一下，类似于`SELECT SLEEP(1)`
    - 基于的假设：大多数主从延时在1秒内
2. 卖家发布商品后，用`Ajax`直接把客户端输入的内容作为“新的商品”显示在页面上，而非真正的做数据库查询
    - 等卖家再次刷新页面，其实主从已经同步完成了，也达到了`SLEEP`的效果
3. `SLEEP`方案解决了类似场景下的过期读问题，但存在**不精确**的问题
    - 如果主从延时只有0.5秒，也会等到1秒
    - 如果主从延迟超过了1秒，依然会出现**过期读**的问题

### 判断主从无延迟
1. `SLOW SLAVE STATUS`.`Seconds_Behind_Master`
    - 每次在从库执行查询请求前，先判断`Seconds_Behind_Master`是否等于`0`
    - `Seconds_Behind_Master=0`才能执行查询请求
    - `Seconds_Behind_Master`的精度为**秒**，如果需要更高精度，可以考虑对比**位点**和`GTID`
2. 位点
    - `Master_Log_File`和`Read_Master_Log_Pos`，表示**读到的主库的最新位点**
    - `Relay_Master_Log_File`和`Exec_Master_Log_Pos`，表示**从库执行的最新位点**
    - `Master_Log_File=Relay_Master_Log_File`和`Read_Master_Log_Pos=Exec_Master_Log_Pos`
        - 表示接收到的日志已经**同步完成**
3. `GTID`
    - `Auto_Position=1`，表示**主从关系**使用了`GTID`协议
    - `Retrieved_Gtid_Set`，表示从库**收到**的所有日志的`GTID`集合
    - `Executed_Gtid_Set`，表示从库所有**已经执行完成**的`GTID`集合

```sql
mysql> SHOW SLAVE STATUS\G;
*************************** 1. row ***************************
               Slave_IO_State: Waiting for master to send event
              Master_Log_File: master-bin.000003
          Read_Master_Log_Pos: 484
               Relay_Log_File: relay-bin.000003
                Relay_Log_Pos: 699
        Relay_Master_Log_File: master-bin.000003
          Exec_Master_Log_Pos: 484
        Seconds_Behind_Master: 0
                  Master_UUID: b0bda503-3cf1-11e9-8c3a-0242ac110002
      Slave_SQL_Running_State: Slave has read all relay log; waiting for more updates
           Retrieved_Gtid_Set: b0bda503-3cf1-11e9-8c3a-0242ac110002:1-6
            Executed_Gtid_Set: b0bda503-3cf1-11e9-8c3a-0242ac110002:1-6,ba0b2f12-3cf1-11e9-9c40-0242ac110003:1-5
                Auto_Position: 1
```

#### 不精确
1. `binlog`在主从之间的状态
    - 主库执行完成，写入`binlog`，反馈给客户端
    - `binlog`被主库发送到从库，从库收到
    - 从库执行`binlog`（应用`relaylog`）
2. 上面判断的**主从无延迟**：_**从库收到的日志都执行完成了**_
    - 并没有考虑这部分日志：客户端已经收到提交确认，但从库还未收到

<img src="	https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-read-write-separation-no-delay.png" width=800/>

1. 主库上执行完成了3个事务：`trx1`、`trx2`和`trx3`
2. `trx1`和`trx2`已经传到从库，并且已经执行完成了
3. `trx3`在主库执行完成后，并且已经回复给客户端，但还未传到从库中
4. 如果此时在从库上执行查询请求，按上面的逻辑，从库已经**没有同步延迟**了，但还是查不到`trx3`的变更，出现了**过期读**

### SEMI-SYNC

#### SEMI-SYNC设计
1. 事务提交到时候，主库把`binlog`发给从库
2. 从库收到`binlog`后，发回给主库一个`ACK`，表示收到了
3. 主库收到这个`ACK`以后，才能给客户端返回事务完成的确认

#### 小结
1. 启用了`SEMI-SYNC`
    - 所有给客户端发送过确认的事务，都确保了**某一个从库**已经收到了这个日志
2. `SEMI-SYNC`+位点的方案，只针对**一主一从**的场景是成立的
    - 在**一主多从**的场景里，主库只要等到一个从库的`ACK`，就开始给客户端返回确认
    - 如果对刚刚响应了`ACK`的从库执行查询请求（+判断**主从无延迟**），能够确保读到最新的数据，否则可能是**过期读**
3. 如果在业务高峰期，主库的位点或者GTID集合更新很快，从库可能一直跟不上主库，导致从库迟迟无法响应查询请求
    - 在出现**持续延迟**的情况下，可能会出现**过度等待**（判断**主从无延迟**）的情况

### 等主库位点
```sql
SELECT MASTER_POS_WAIT(file, pos[, timeout]);
```
1. 在**从库**上执行
2. 参数`file`和`pos`指的是**主库**上的文件名和位置
3. `timeout`单位为秒
4. 返回正整数，表示从**命令开始执行**，到应用完`file`和`pos`，总共**执行了多少事务**
    - 如果在执行期间，从库的同步线程发生异常，返回NULL
    - 如果等待超过`timeout`秒，返回`-1`
    - 如果刚开始执行的时候，发现**已经执行**过这个位置，返回`0`

#### 样例
先在`MySQL A`执行`trx1`，然后在`MySQL B`执行查询请求
<img src=" https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-read-write-separation-wait-pos.png" width=800/>

1. 事务`trx1`更新完成后，马上执行`SHOW MASTER STATUS`，得到当前主库执行到的`File`和`Position`
2. 选择一个从库执行查询语句
3. 在该从库上先执行`SELECT MASTER_POS_WAIT(File, Position, 1)`
4. 如果返回值`>=0`，则直接在这个从库上执行查询语句
5. 否则，在主库上执行查询语句
    - 一种退化机制，针对**主从延时不可控**的场景

```sql
-- MySQL A
mysql> SHOW MASTER STATUS;
+-------------------+----------+--------------+------------------+------------------------------------------+
| File              | Position | Binlog_Do_DB | Binlog_Ignore_DB | Executed_Gtid_Set                        |
+-------------------+----------+--------------+------------------+------------------------------------------+
| master-bin.000003 |      643 |              |                  | b0bda503-3cf1-11e9-8c3a-0242ac110002:1-7 |
+-------------------+----------+--------------+------------------+------------------------------------------+

-- MySQL B
mysql> SELECT MASTER_POS_WAIT('master-bin.000003',643,1);
+--------------------------------------------+
| MASTER_POS_WAIT('master-bin.000003',643,1) |
+--------------------------------------------+
|                                          0 |
+--------------------------------------------+
```

### 等GTID
```sql
-- 等待，直到这个库执行的事务中包含传入的gtid_set，返回0
-- 超时返回1
SELECT WAIT_FOR_EXECUTED_GTID_SET(gtid_set, 1);
```

#### 样例
<img src=" https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-read-write-separation-wait-gtid.png" width=800/>

1. 从MySQL 5.7.6开始，允许在执行完**更新类事务**后，把这个事务的`GTID`返回给客户端
2. 事务`trx1`更新完成后，从返回结果中直接获取`trx1`的`GTID`，记为`gtid1`
3. 选择一个从库执行查询语句
4. 在该从库上先执行`SELECT WAIT_FOR_EXECUTED_GTID_SET(gtid1, 1)`
5. 如果返回`0`，则直接在这个从库上执行查询语句
6. 否则，在主库上执行查询语句

```sql
-- MySQL A
mysql> SHOW MASTER STATUS;
+-------------------+----------+--------------+------------------+------------------------------------------+
| File              | Position | Binlog_Do_DB | Binlog_Ignore_DB | Executed_Gtid_Set                        |
+-------------------+----------+--------------+------------------+------------------------------------------+
| master-bin.000003 |      643 |              |                  | b0bda503-3cf1-11e9-8c3a-0242ac110002:1-7 |
+-------------------+----------+--------------+------------------+------------------------------------------+

-- MySQL B
mysql> SELECT WAIT_FOR_EXECUTED_GTID_SET('b0bda503-3cf1-11e9-8c3a-0242ac110002:1-7',1);
+--------------------------------------------------------------------------+
| WAIT_FOR_EXECUTED_GTID_SET('b0bda503-3cf1-11e9-8c3a-0242ac110002:1-7',1) |
+--------------------------------------------------------------------------+
|                                                                        0 |
+--------------------------------------------------------------------------+
```

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
