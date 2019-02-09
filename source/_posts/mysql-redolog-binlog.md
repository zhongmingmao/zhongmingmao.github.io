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
mysql> CREATE TABLE T (id INT PRIMARY KEY, c INT);

mysql> UPDATE T SET c=c+1 WHERE id=2;
```

## 执行过程

<!-- more -->

<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-architecture.png" width=500/>

1. 通过连接器，客户端与MySQL建立连接
2. update语句会把**T表上的所有查询缓存清空**
3. 分析器会通过词法分析和语法分析识别这是一条更新语句
4. 优化器会决定使用id这个索引（聚簇索引）
5. 执行器负责具体执行，找到匹配的一行，然后更新
6. 更新过程中还会涉及**redolog**（重做日志）和**binlog**（归档日志）的操作

## redolog -- InnoDB
1. 如果每次更新操作都需要**直接写入磁盘**（在磁盘中找到相关的记录并更新），整个过程的**IO成本**和**查找成本**都很高
2. 针对这种情况，MySQL采用的是**WAL**技术（**Write-Ahead Logging**）：_**先写日志，再写磁盘**_
3. 当有一条记录需要更新的时候，InnoDB会先把记录写到**redolog**（redolog buffer），并**更新内存**（buffer pool）
    - InnoDB会在适当的时候（例如系统空闲），将这个操作记录到磁盘里面（**刷脏页**）
4. InnoDB的redolog是**固定大小**的，如果每个日志文件大小为1GB，4个日志文件为一组
    - redolog的总大小为4GB，_**循环写**_
    - write pos是**当前记录的位置**，一边写一边后移，写到3号文件末尾后就回到0号文件开头
        - redolog是**顺序写**，数据文件是**随机写**
    - checkpoint是**当前要擦除的位置**，**擦除记录前需要先把对应的数据落盘**（更新内存页，等待刷脏页）
    - write pos到checkpoint之间的部分可以用来**记录新的操作**
        - 如果write pos赶上了checkpoint，说明redolog已**满**，不能再执行新的更新操作，需要先推进checkpoint
        - **只要write pos未赶上checkpoint，就可以执行新的更新操作**
    - checkpoint到write pos之间的部分**等待落盘**（先更新内存页，然后等待刷脏页）
        - 如果checkpoint赶上了write pos，说明redolog已**空**
5. 有了redolog之后，InnoDB能保证数据库即使发生**异常重启**，**之前提交的记录都不会丢失**，达到**crash-safe**
6. 如果redolog太小，会导致很快被写满，然后就不得不强行刷redolog，这样**WAL**机制的能力就无法发挥出来
    - 如果磁盘能达到几TB，那么可以将redolog设置4个一组，每个日志文件大小为1GB

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

### 数据落盘
1. redolog并**没有记录数据页的完整记录**，只是记录**数据页的变更**，因此redolog本身并**没有直接更新磁盘页的能力**
2. MySQL实例正常运行，在**内存中的数据页**被修改后，跟**磁盘上的数据页**不一致，称为**脏页**
    - 最终的**数据落盘**，指的是**把内存中的数据页覆盖磁盘上的数据页**，这个过程**与redolog无关**
3. 在崩溃恢复的场景，InnoDB如果判断是下面的`2.a`场景
    - 就会**读取磁盘上对应的数据页到内存**中，然后**应用redolog**，更新内存页
    - 更新完成后，这个内存页就变成了脏页，等待被刷到磁盘上

### redolog buffer
```sql
BEGIN;
INSERT INTO t1;
INSERT INTO t2;
COMMIT;
```
1. redolog buffer用于存放redolog
2. 执行完第一个`INSERT`后，内存中（**buffer pool**）的数据页被修改了，另外**redolog buffer**也写入了日志
3. `COMMIT`：真正把日志写到redolog（ib_logfileX）
4. 自动开启事务的SQL语句**隐式**包含上述过程

## binlog -- Server
1. **redolog是InnoDB特有的日志，binlog属于Server层日志**
2. 有两份日志的历史原因
    - 一开始并没有InnoDB，采用的是MyISAM，但**MyISAM没有crash-safe的能力**，**binlog日志只能用于归档**
    - InnoDB是以插件的形式引入MySQL的，**为了实现crash-safe**，InnoDB采用了**redolog**的方案
3. binlog一开始的设计就是**不支持崩溃恢复**（原库）的，如果不考虑搭建从库等操作，**binlog是可以关闭的**（sql_log_bin）
4. redolog vs binlog
    - redolog是InnoDB特有的，binlog是MySQL的Server层实现的，所有层都可以使用
    - redolog是**物理日志**，记录某个**数据页**上做了什么**修改**
        - binlog是**逻辑日志**，记录某个**语句的原始逻辑**
        - 逻辑日志：**提供给别的引擎用**，是大家都能理解的逻辑，例如**搭建从库**
        - 物理日志：**只能内部使用**，其他引擎无法共享内部的物理格式
    - redolog是**循环写**，**空间固定**，**不能持久保存**，没有**归档**功能
        - binlog是**追加写**，**空间不受限制**，有**归档**功能
    - redolog主要用于**crash-safe**，原库恢复
        - binlog主要用于恢复成**临时库**（从库）
    - 崩溃恢复的过程**不写binlog**（可能需要**读binlog**，如果binlog有打开，一般都会打开）
        - 用binlog恢复实例（从库），需要**写redolog**
5. _**redolog支持事务的持久性，undolog支持事务的隔离性**_
6. redolog对应用开发来说是**透明**的
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
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-innodb-update-procedure-1.jpg" width=500/>

1. 执行器先通过InnoDB获取id=2这一行，id是主键，InnoDB可以通过**聚簇索引**找到这一行
    - 如果**id=2这一行所在的数据页**本来就在内存（**InnoDB Buffer Pool**）中，直接返回给执行器
    - 否则先从磁盘读入内存，然后再返回
2. 执行器拿到InnoDB返回的行数据，进行**+1**操作，得到新的一行数据，再调用InnoDB的引擎接口写入这行数据
3. InnoDB首先将这行新数据**更新到内存**（**InnoDB Buffer Pool**）中，同时将这个更新操作**记录到redolog**（物理记录）
    - 更新到内存中，在**事务提交后，后续的查询就可以直接在内存中读取该数据页**，但此时的数据可能**还没有真正落盘**
        - 但在**事务提交前，其他事务是无法看到这个内存修改的**
        - 而在**事务提交后，说明已经成功写入了redolog，可崩溃恢复，不会丢数据，因此可以直接读内存的数据**
    - 刚更新的内存是不会删除的，除非内存不够用，在数据从内存删除之前，系统会保证它们已经落盘
    - 此时redolog处于**prepare**状态（**prepare标签**），然后告诉执行器执行完成，**随时可以提交事务**
        - 对其他事务来说，刚刚修改的内存是**不可见**的
4. 执行器生成这个操作的**binlog**（**逻辑记录**）并写入磁盘
    - **binlog写成功事务就算成功**，可以提交事务
        - 哪怕崩溃恢复，也会恢复binlog写成功的事务（此时对应的redolog处于prepare状态）
    - **binlog如果没写成功就回滚**，回滚会**写redolog**，打上**rollback标签**，binlog则会直接丢弃
        - 如果binlog不丢弃，则会传播到从库
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
    2 -> write by commit, flush by second

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
        - _**崩溃恢复完全依赖于redolog（原库），恢复临时库完全依赖于binlog**_
    - 按照上面的两种顺序，都会导致redolog和binlog逻辑上的不一致
        - 假设原库crash后执行**原库恢复**+执行**临时库恢复**，恢复出来的数据是不一致的（主从不一致）
3. 恢复清醒：两阶段提交（假设是**双1**的配置）
    - redolog prepare + binlog成功，**提交事务**，崩溃恢复后也会继续提交事务（redolog commit），逻辑一致
    - redolog prepare + binlog失败，**回滚事务**，崩溃恢复后也会继续回滚事务（redolog rollback），逻辑一致
        - 一个事务的binlog是有**固定格式**的
        - redolog与binlog是通过**事务id**（**XID**）进行**关联**的
        - 此时binglog中没有对应的记录，事务记录是不完整的
    - 崩溃恢复后是会从**checkpoint**开始往后主动刷数据
4. 采用非双1的配置，在极端环境下会出现redolog与binlog**不一致**的情况
    - **优先保证redolog**，先原库崩溃恢复，再处理从库（原库可以在崩溃恢复后，重新做一次**全量备份**，重建从库）

#### redolog->binlog
1. 反证：事务的**持久性**问题
2. 对InnoDB而言，redolog有commit标签，代表这个事务不能再回滚
3. 假若后续的binlog写失败了，此时**数据**与**binlog**是不一致的，**主从也不一致**

#### 只有binlog
binlog是**逻辑日志**，没有记录数据页的更新细节，_**没有能力恢复数据页**_

#### 只有redolog
1. 如果仅从**崩溃恢复**的角度来说，**binlog是可以关掉的**
    - 因为**崩溃恢复是redolog的功能**
    - 此时没有两阶段提交，但系统依然是**crash-safe**的
2. 但线上一般都会打开binlog，binlog有着redolog无法替代的功能
    - 首先是**归档**功能，redolog是循环写，起不到归档的作用
    - _**binlog复制：MySQL高可用的基础**_
        - **主从复制**
        - 异构系统（如数据分析系统）会**消费MySQL的binlog**来更新自己的数据

## 崩溃恢复

### 判断逻辑
1. 如果redolog里面的事务是**完整**的，即已经有了**commit标签**，那么**直接提交**
2. 如果redolog里面的事务只有**prepare**标签，则需要判断**事务对应的binlog是否存在并完整**
    - a. 如果**是**，则**提交事务**
    - b. 如果**否**，则**回滚事务**

### redolog与binlog关联
1. redolog和binlog有一个**共同的数据字段**：**XID**
2. 崩溃恢复时，会按顺序扫描redolog
    - 如果碰到既有prepare标签又有commit标签的redolog，就直接提交
    - 如果碰到只有prepare标签但没有commit标签的redolog，就拿着对应的XID去binlog找对应的事务
        - 后续需要校验事务对应的binlog的完整性

### binlog的完整性
1. binlog格式
    - statement格式，最后会有`COMMMIT;`
    - row格式，最后会有一个`XID Event`
2. 从MySQL 5.6.2开始，引入了**binlog-checksum**，用于验证binlog内容的正确性
    - binlog可能由于**磁盘原因**，在**日志中间**出错，MySQL可以通过校验checksum来发现

## 异常重启

### 时刻A
1. 对应上面`2.b`的情况
1. **redolog还未提交，binlog还未写**，在崩溃恢复时，事务会**回滚**
2. 由于binlog还没写，也**不会传到备库**

### 时刻B
1. 对应上面的`2.a`的情况，崩溃恢复过程中事务会被提交
2. 此时binlog已经写入了，之后会被**从库**或**临时库**使用
    - 因此**主库**也需要提交这个事务，保证**主从一致**

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
