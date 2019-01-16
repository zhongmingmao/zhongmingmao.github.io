---
title: MySQL -- redolog + binlog
date: 2019-01-15 19:11:56
categories:
    - MySQL
tags:
    - MySQL
---

## 更新语句
```sql
mysql> create table T (id int primary key, c int);

mysql> update T set c=c+1 where id=2;
```

## 执行过程

<!-- more -->

<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-architecture.png" width=400/>

1. 通过连接器，客户端与MySQL建立连接
2. update语句会把**T表上的所有查询缓存清空**
3. 分析器会通过词法分析和语法分析识别这是一条更新语句
4. 优化器会决定使用id这个索引（主键索引）
5. 执行器负责具体执行，找到其中一行，然后更新
6. 更新过程中还会涉及**redolog**（重做日志）和**binlog**（归档日志）

## redolog - Store Engine
1. 如果每次更新操作都需要写入磁盘，即在磁盘中**找到并更新**相关的记录，整个过程的**IO成本**和**查找成本**都很高
2. 针对这种情况，MySQL采用的是**WAL**技术（**Write-Ahead Logging**）
    - **先写日志，再写磁盘**
3. 当有一条记录需要更新的时候，InnoDB会先把记录写到**redolog**，并**更新内存**，这时更新操作已经算完成
    - InnoDB会在适当（系统空闲）的时候，将这个操作记录到磁盘里面
    - 如果redolog写满，需要先将部分数据写入到磁盘，从而腾出空间
4. InnoDB的redolog是**固定大小**的，如果每个日志文件大小为1GB，4个日志文件为一组
    - redolog的总大小为4GB，**循环写**
    - write pos是**当前记录的位置**，一边写一边后移，写到3号文件末尾后就回到0号文件开头
        - redolog是**顺序写**，数据文件是**随机写**
    - checkpoint是**当前要擦除的位置**，**擦除记录前需要先把对应的数据落盘**
    - write pos到checkpoint之间的部分可以用来**记录新的操作**
        - 如果write pos赶上了checkpoint，说明redolog已**满**，不能再执行新的更新操作，需要先推进checkpoint
        - **只要write pos未赶上checkpoint，就可以执行新的更新操作**
    - checkpoint到write pos之间的部分**等待落盘**
        - 如果checkpoint赶上了write pos，说明redolog已**空**
5. 有了redolog之后，InnoDB能保证数据库即使发生**异常重启**，**之前提交的记录都不会丢失**，到达**crash-safe**

<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-innodb-redo-log.jpg" width=400/>

```sql
# innodb_log_file_size -> 单个redolog文件的大小
# 268435456 Bytes = 256 MB
mysql> SHOW VARIABLES LIKE '%innodb_log_file%';
+---------------------------+-----------+
| Variable_name             | Value     |
+---------------------------+-----------+
| innodb_log_file_size      | 268435456 |
| innodb_log_files_in_group | 3         |
+---------------------------+-----------+
```
```sql
# 这里的written是指写到磁盘缓存
# 0 -> Logs are written and flushed to disk once per second
# 1 -> Logs are written and flushed to disk at each transaction commit
# 2 -> Logs are written after each transaction commit and flushed to disk once per second
mysql> SHOW VARIABLES LIKE '%innodb_flush_log_at_trx_commit%';
+--------------------------------+-------+
| Variable_name                  | Value |
+--------------------------------+-------+
| innodb_flush_log_at_trx_commit | 2     |
+--------------------------------+-------+
```
[innodb_flush_log_at_trx_commit](https://dev.mysql.com/doc/refman/5.6/en/innodb-parameters.html#sysvar_innodb_flush_log_at_trx_commit)

## binlog - Server
1. **redolog是InnoDB特有的日志，binlog属于Server层日志**
2. 有两份日志的原因
    - 一开始并没有InnoDB，采用MyISAM，但**MyISAM没有crash-safe的能力**，**binlog日志只能用于归档**
    - InnoDB是以插件的形式引入MySQL的，**为了实现crash-safe**，InnoDB采用了**redolog**的方案
3. binlog一开始的设计就是**不支持崩溃恢复**（原库）的，如果不考虑搭建从库等操作，**binlog是可以关闭的**（sql_log_bin）
4. redolog vs binlog
    - redolog是InnoDB特有的，binlog是MySQL的Server层实现的，所有层都可以使用
    - redolog是**物理日志**，记录某个**数据页**上做了什么**修改**
        - binlog是**逻辑日志**，记录某个**语句的原始逻辑**
        - 逻辑日志：**提供给别的引擎用**，大家都能理解的逻辑，例如**搭建从库**
        - 物理日志：**只能内部使用**，其他引擎无法共享内部的物理格式
    - redolog是**循环写**，**空间固定**，**不能持久保存**
        - binlog是**追加写**，**空间不受限制**，有**归档**功能
    - redolog主要用于**crash-safe**，原库恢复
        - binlog主要用于恢复成**临时库**（从库）
    - 崩溃恢复的过程**不写binlog**（需要**读binlog**）
        - 用binlog恢复实例（从库），需要**写redolog**
5. _**redolog支持事务的持久性，undo log支持事务的隔离性**_
6. redo log对应用开发来说是**透明**的
7. binlog有两种模式
    - **statement格式**：SQL语句
    - **row格式**：行内容（记两条，更新前和更新后），**推荐**
        - 日志一样的可以用于**重放**

```sql
mysql> SHOW VARIABLES LIKE '%sql_log_bin%';
+---------------+-------+
| Variable_name | Value |
+---------------+-------+
| sql_log_bin   | ON    |
+---------------+-------+
```

## update 内部流程
浅色框在**InnoDB内部**执行，深色框在**执行器中**执行
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-innodb-update-procedure.png" width=400/>

1. 执行器先通过InnoDB获取id=2这一行，id是主键，InnoDB可以通过**主键索引**找到这一行
    - 如果**id=2这一行所在的数据页**本来就在内存（**InnoDB管理的内存**）中，直接返回给执行器
    - 否则先从磁盘读入内存，然后再返回
2. 执行器拿到InnoDB返回的行数据，进行**+1**操作，得到新的一行数据，再调用InnoDB的引擎接口写入这行数据
3. InnoDB首先将这行新数据**更新到内存**中，同时将这个更新操作**记录到redolog**（物理记录）
    - 更新到内存中，在**事务提交后，后续的查询就可以直接在内存中读取该数据页**，但此时的数据可能**还没有真正落盘**
        - 但在**事务提交前，其他事务是无法看到这个内存修改的**
        - 而在**事务提交后，说明已经成功写入了redolog，可崩溃恢复，不会丢数据，因此可以直接读内存的数据**
    - 刚更新的内存是不会删除的，除非内存不够用，在数据从内存删除之前，系统会保证它们已经落盘
    - 此时redolog处于**prepare**状态（**prepare标签**），然后告诉执行器执行完成，**随时可以提交事务**
        - 对其他事务来说，刚刚修改的内存是**不可见**的
4. 执行器生成这个操作的binlog（逻辑记录）并写入磁盘
    - **binlog写成功事务就算成功**，可以提交事务
        - 哪怕崩溃恢复，也会恢复binlog写成功的事务
    - **binlog如果没写成功就回滚**，回滚会**写redolog**，打上**rollback标签**，binlog则会直接丢弃
5. 执行器调用InnoDB的**提交事务**接口，InnoDB把刚刚写入的redolog改成**commit**状态，更新完成
    - redolog打上了**commit标签**
    - commit表示两个日志都生效了
    - commit完成后才会返回客户端

[sync_binlog](https://dev.mysql.com/doc/refman/5.6/en/replication-options-binary-log.html#sysvar_sync_binlog)

```sql
# 0 -> Disables synchronization of the binary log to disk by the MySQL server
#       Instead, the MySQL server relies on the operating system to flush the binary log to disk from time to time as it does for any other file
#       This setting provides the best performance    
# 1 -> Enables synchronization of the binary log to disk before transactions are committed
#       This is the safest setting but can have a negative impact on performance due to the increased number of disk writes
# N -> The binary log is synchronized to disk after N binary log commit groups have been collected
#       A higher value improves performance, but with an increased risk of data loss
mysql> SHOW VARIABLES LIKE '%sync_binlog%';
+---------------+-------+
| Variable_name | Value |
+---------------+-------+
| sync_binlog   | 0     |
+---------------+-------+

# 如果系统IO能扛得住，采用双1
For the greatest possible durability and consistency in a replication setup that uses InnoDB with transactions, use these settings:
sync_binlog=1.
innodb_flush_log_at_trx_commit=1.

# 实际中的线上环境可能会做一定的权衡，innodb_flush_log_at_trx_commit=2，sync_binlog=0
# 最多丢失1s的redolog，丢失部分binlog
```
```
# 归纳
innodb_flush_log_at_trx_commit
    0 -> write+flush by second
    1 -> write+flush by commit
    2 -> write by second, flush by second

sync_binlog
    0 -> rely on os
    1 -> 1 commit
    N -> N commit
```

### redolog的两阶段提交
1. 目的：为了让redolog和binlog的**逻辑一致**
2. 脑洞：假设不采用两阶段提交
    - 有两种顺序：redolog->binlog，或者binlog->redolog
    - 此时可以认为redolog和binlog**完全独立**
        - 崩溃恢复完全依赖于redolog，恢复临时库完全依赖于binlog
    - 按照上面的两种顺序，都会导致redolog和binlog逻辑上的不一致
        - 假设原库crash后执行**原库恢复**+执行**临时库恢复**，恢复出来的数据是不一致的
3. 恢复清醒：两阶段提交（假设是**双1**的配置）
    - redolog prepare + binlog成功，**提交事务**，崩溃恢复后也会继续提交事务（redolog commit），逻辑一致
    - redolog prepare + binlog失败，**回滚事务**，崩溃恢复后也会继续回滚事务（redolog rollback），逻辑一致
        - 一个事务的binlog是有**固定格式**的
        - redolog与binlog是通过**事务id**进行**关联**的
        - 此时binglog中没有对应的记录，事务记录是不完整的
    - 崩溃恢复后是会从**checkpoint**开始往后主动刷数据
4. 采用非双1的配置，在极端环境下会出现redolog与binlog**不一致**的情况
    - **优先保证redolog**，先原库崩溃恢复，再处理从库（原库可以在崩溃恢复后，重新做一次**全量备份**，重建从库）

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
