---
title: MySQL -- 数据可靠性
date: 2019-02-21 13:14:06
categories:
    - Storage
    - MySQL
tags:
    - Storage
    - MySQL
---

## binlog的写入机制
1. 事务在执行过程中，先把日志写到`binlog cache`，事务**提交**时，再把`binlog cache`写到`binlog file`
2. 一个事务的binlog是**不能被拆开**的，不论事务多大，也要确保**一次性写入**
3. 系统会给**每个线程**分配一块内存`binlog cache`，由参数`binlog_cache_size`控制
    - 如果超过了`binlog_cache_size`，需要**暂存到磁盘**
4. 事务提交时，执行器把`binlog cache`里面的**完整事务**写入到`binlog file`，并**清空**`binlog cache`

```sql
-- 2097152 Bytes = 2 MB
mysql> SHOW VARIABLES LIKE '%binlog_cache_size%';
+-----------------------+----------------------+
| Variable_name         | Value                |
+-----------------------+----------------------+
| binlog_cache_size     | 2097152              |
| max_binlog_cache_size | 18446744073709547520 |
+-----------------------+----------------------+
```

<!-- more -->

### 写入过程
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-binlog-write.png" width=800/>

1. 每个线程都有自己的`binlog cache`，但共用一份`binlog file`
2. `write`：把日志写入到**文件系统的page cache**，但并没有将数据持久化到磁盘，**速度比较快**
3. `fsync`：将数据持久化到磁盘，`fsync`才会占用磁盘的**IOPS**

### sync_binlog
```sql
mysql> SHOW VARIABLES LIKE '%sync_binlog%';
+---------------+-------+
| Variable_name | Value |
+---------------+-------+
| sync_binlog   | 0     |
+---------------+-------+
```
1. `sync_binlog=0`，每次提交事务都只`write`，不`fsync`
2. `sync_binlog=1`，每次提交事务都会执行`fsync`
3. `sync_binlog=N`，每次提交事务都会`write`，但累计N个事务后才`fsync`
    - 一般为`(100 ~ 1,000)`，可以**提高性能**
    - 如果主机**断电**，会**丢失最近的N个事务的binlog**

## redolog的写入机制
1. 事务在执行过程中，生成的`redolog`需要先写到`redolog buffer`
2. `redolog buffer`里面的内容，并不需要**每次**生成后都直接持久化到磁盘
    - 如果事务执行期间，MySQL异常重启，那么这部分日志丢失了
    - 由于事务**没有提交**，所以这时的日志丢失不会有什么影响
3. 在事务还未提交时，`redolog buffer`中的**部分日志**也是有可能**持久化到磁盘**的

### redolog的状态
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-redolog-status.png" width=500/>

1. 红色部分：存在于`redolog buffer`中，物理上存在于**MySQL进程的内存**
2. 黄色部分：写到磁盘（`write`），但没有持久化（`fsync`），物理上存在于**文件系统的page cache**
3. 绿色部分：持久化到磁盘，物理上存在于`hard disk`
4. 日志写到`redolog buffer`是很快的，`write`到`FS page cache`也比较快，但`fsync`到磁盘的速度就会慢很多

### redolog的写入策略

#### 事务提交
```sql
mysql> show variables like '%innodb_flush_log_at_trx_commit%';
+--------------------------------+-------+
| Variable_name                  | Value |
+--------------------------------+-------+
| innodb_flush_log_at_trx_commit | 2     |
+--------------------------------+-------+
```
1. `innodb_flush_log_at_trx_commit=0`
    - 每次事务提交时都只是将`redolog`写入到`redolog buffer`（**红色部分**）
    - `redolog`只存在内存中，MySQL本身异常重启也会丢失数据，**风险太大**
2. `innodb_flush_log_at_trx_commit=1`
    - 每次事务提交时都将`redolog`持久化到磁盘（**绿色部分**）
    - 两阶段提交：`redolog prepare` -> `写binlog` -> `redolog commit`
    - `redolog prepare`需要持久化一次，因为崩溃恢复依赖于**prepare**的`redolog`和`binlog`
    - `redolog commit`就不需要持久化（`fsync`）了，只需要`write`到`FS page cache`即可
    - **双1配置**：一个事务完整提交前，需要**2次刷盘**：`redolog prepare` + `binlog`
        - 优化：**组提交**
3. `innodb_flush_log_at_trx_commit=2`
    - 每次事务提交时都将`redolog`写入到`FS page cache`（**黄色部分**）

#### 后台刷新
1. 后台线程：每隔**1秒**，就会将`redolog buffer`中的日志，调用`write`写入到`FS page cache`，再调用`fsync`持久化到磁盘
2. 事务执行期间的`redolog`是直接写到`redolog buffer`，这些`redolog`也会被后台线程一起持久化到磁盘
    - 即一个**未提交**的事务的`redolog`也是有可能已经持久化到磁盘的

#### 事务未提交
```sql
-- 16777216 Bytes = 16 MB
mysql> SHOW VARIABLES LIKE '%innodb_log_buffer_size%';
+------------------------+----------+
| Variable_name          | Value    |
+------------------------+----------+
| innodb_log_buffer_size | 16777216 |
+------------------------+----------+
```
1. 当`redolog buffer`占用的空间即将达到`innodb_log_buffer_size`的**一半**时，后台线程会**主动写盘**
    - 由于事务尚未提交，因此这个写盘动作是在`write`，不会调用`fsync`，停留在`FS page cache`
2. 在**并行事务提交**时，顺带将**未提交事务**的`redolog buffer`持久化到磁盘
    - 事务A执行到一半，有部分`redolog`在`redolog buffer`
    - 事务B提交，且`innodb_flush_log_at_trx_commit=1`，事务B要把`redolog buffer`里面的日志**全部**持久化到磁盘
    - 这时会带上事务A在`redolog buffer`里的日志一起持久化到磁盘

### 组提交

#### LSN
1. `LSN`：log sequence number
2. `LSN`是**单调递增**的，对应`redolog`的**写入点**
    - 每次写入长度为length的`redolog`，`LSN`就会加上length
3. `LSN`也会写入到**数据页**中，用来**确保数据页不会被多次执行重复的`redolog`**

#### 样例
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-redolog-group-commit.png" width=500/>

1. 三个**并发事务**处于`prepare`阶段：`tx1`、`tx2`、`tx3`
    - 都完成写入`redolog buffer`和**持久化到磁盘**的过程
    - 对应的`LSN`为`50`、`120`、`160`
2. `tx1`第一个到达，被选为组`leader`
3. 等`trx1`要开始**写盘**的时候，组内已经有3个事务，`LSN`变成了`160`
4. `trx1`带着`LSN=160`去写盘，等`trx1`返回时，所有`LSN<160`的`redolog`都已经持久化到磁盘
    - `trx2`和`trx3`可以**直接返回**

#### 小结
1. 一次组提交里面，组员越多，节省磁盘的IOPS的效果越好
2. 在**并发更新**场景下，第1个事务写完`redolog buffer`后，接下来的`fsync`越晚调用，节省磁盘的IOPS的效果越好

#### binlog组提交
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-2-phase-commit.png" width=500/>

`写binlog`其实分两步：`binlog cache -> (write) -> binlog file` + `binlog file -> (fsync) -> disk`
MySQL为了让组提交效果更好，延后了`fsync`执行时机，两阶段提交细化如下
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-2-phase-commit-opt.png" width=500/>

`binlog`也可以支持**组提交**了，但第3步执行很快，导致了`binlog`的组提交效果不如`redolog`的组提交效果

**参数**
```sql
mysql> SHOW VARIABLES LIKE '%binlog_group_commit_sync%';
+-----------------------------------------+-------+
| Variable_name                           | Value |
+-----------------------------------------+-------+
| binlog_group_commit_sync_delay          | 0     |
| binlog_group_commit_sync_no_delay_count | 0     |
+-----------------------------------------+-------+
```
1. `binlog_group_commit_sync_delay`：延迟多少**微秒**才调用`fsync`
2. `binlog_group_commit_sync_no_delay_count`：累计多少次之后才调用`fsync`
3. 两者关系：**或**，但当`binlog_group_commit_sync_delay=0`时，`binlog_group_commit_sync_no_delay_count`无效

## WAL性能
1. `redolog`和`binlog`都是**顺序写**
2. **组提交机制**：可以大幅降低磁盘的**IOPS消耗**

## MySQL的IO瓶颈
1. 设置`binlog_group_commit_sync_delay`和`binlog_group_commit_sync_no_delay_count`
    - **故意等待**，利用**组提交**减少**IOPS**消耗，同时可能会**增加语句的响应时间**，但**没有丢数据风险**
2. `sync_binlog=N(100~1,000)`
    - 主机**断电**会丢失`binlog`日志
3. `innodb_flush_log_at_trx_commit=2`
    - 主机**断电**会丢失数据
    - `2`和`0`的**性能接近**，但设置为`0`（数据仅在`redolog buffer`），在MySQL**异常重启**时也会丢失数据

## crash-safe的保证
1. 如果客户端收到**事务成功**的消息，事务就一定持久化了的
2. 如果客户端收到**事务失败**（主键冲突、回滚等）的消息，事务一定是失败的
3. 如果客户端收到**执行异常**的消息，应用需要**重连**后通过**查询**当前状态来继续后续的逻辑
    - 数据库只需要保证内部（**数据与日志之间**，**主从之间**）一致即可

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
