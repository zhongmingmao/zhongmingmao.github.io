---
title: MySQL -- KILL + 客户端
date: 2019-03-06 22:40:20
categories:
    - MySQL
tags:
    - MySQL
---

## KILL
1. `KILL QUERY THREAD_ID`
    - 终止这个线程中正在执行的语句
2. `KILL [ CONNECTION ] THREAD_ID`
    - 断开这个线程的连接，如果该线程有语句在执行，先停止正在执行的语句

<!-- more -->

## 锁等待

### 表初始化
```sql
CREATE TABLE `t` (
  `id` INT(11) NOT NULL,
  `c` INT(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

INSERT INTO t VALUES (1,1);
```

### 操作次序
| session A | session B | session C |
| ---- | ---- | ---- |
| BEGIN; | | |
| UPDATE t SET c=c+1 WHERE id=1; | | |
| | UPDATE t SET c=c+2 WHERE id=1;<br/>(Blocked) | |
| | | SHOW PROCESSLIST; |
| | | KILL QUERY 24; |
| | ERROR 1317 (70100): Query execution was interrupted | |

```sql
mysql> SHOW PROCESSLIST;
+----+-----------------+-----------+------+---------+--------+------------------------+-------------------------------+
| Id | User            | Host      | db   | Command | Time   | State                  | Info                          |
+----+-----------------+-----------+------+---------+--------+------------------------+-------------------------------+
|  4 | event_scheduler | localhost | NULL | Daemon  | 472733 | Waiting on empty queue | NULL                          |
| 21 | root            | localhost | test | Sleep   |    130 |                        | NULL                          |
| 23 | root            | localhost | test | Query   |      0 | starting               | show processlist              |
| 24 | root            | localhost | test | Query   |      5 | updating               | UPDATE t SET c=c+2 WHERE id=1 |
+----+-----------------+-----------+------+---------+--------+------------------------+-------------------------------+
```

### KILL QUERY
1. 对表进行**增删改查**操作时，会在表上加**MDL读锁**
2. `KILL QUERY`并不是马上停止，而是告诉线程这条语句已经**不需要再继续执行**，可以开始执行停止的逻辑
    - 类似于Linux的`kill -N pid`命令，并不是让进程直接停止
    - 而是给进程发一个信号，然后让进程处理这个信号，进入终止逻辑
3. MySQL的具体动作
    - 把`session B`的线程状态改成`THD:KILL_QUERY`(将变量`killed`赋值为`THD:KILL_QUERY`)
    - 给`session B`的执行线程发一个**信号**
        - `session B`原本处于锁等待状态
        - 如果只是修改线程状态，线程B是**不知道这个状态的变化**的，还会继续等待
        - 发信号的目的：让`session B`退出等待，来处理`THD:KILL_QUERY`状态
4. 隐含逻辑
    - 一个语句在执行过程中会有多处**埋点**，在这些**埋点**的地方会判断线程状态
        - 如果发现线程状态为`THD:KILL_QUERY`，才开始进入**语句终止**的逻辑
    - 如果处于等待状态，必须是一个**可以被唤醒的等待**，否则根本不会执行到埋点处
    - 语句从**开始进入**终止逻辑，到**完全完成**终止逻辑，是有个过程的

## 并发线程数
```sql
SET GLOBAL innodb_thread_concurrency=2;
```

### 操作序列
| session A | session B | session C | session D | session E |
| ---- | ---- | ---- | ---- | ---- |
| SELECT SLEEP(100) FROM t; | SELECT SLEEP(100) FROM t; | | | |
| | | SELECT * FROM t;<br/>(Blocked) | | |
| | | | SHOW PROCESSLIST;<br/>(1st) | |
| | | | KILL QUERY 28;<br/>(无效) | |
| | | | | KILL 28; |
| | | | ERROR 2013 (HY000): Lost connection to MySQL server during query | |
| | | | SHOW PROCESSLIST;<br/>(2nd) | |

```sql
-- 1st
mysql> SHOW PROCESSLIST;
+----+-----------------+-----------+------+---------+--------+------------------------+--------------------------+
| Id | User            | Host      | db   | Command | Time   | State                  | Info                     |
+----+-----------------+-----------+------+---------+--------+------------------------+--------------------------+
|  4 | event_scheduler | localhost | NULL | Daemon  | 477650 | Waiting on empty queue | NULL                     |
| 21 | root            | localhost | test | Query   |     12 | User sleep             | SELECT SLEEP(100) FROM t |
| 24 | root            | localhost | test | Query   |      8 | User sleep             | SELECT SLEEP(100) FROM t |
| 26 | root            | localhost | test | Sleep   |    291 |                        | NULL                     |
| 27 | root            | localhost | test | Query   |      0 | starting               | SHOW PROCESSLIST         |
| 28 | root            | localhost | test | Query   |      5 | Sending data           | SELECT * FROM t          |
+----+-----------------+-----------+------+---------+--------+------------------------+--------------------------+

-- 2nd
mysql> SHOW PROCESSLIST;
+----+-----------------+-----------+------+---------+--------+------------------------+--------------------------+
| Id | User            | Host      | db   | Command | Time   | State                  | Info                     |
+----+-----------------+-----------+------+---------+--------+------------------------+--------------------------+
|  4 | event_scheduler | localhost | NULL | Daemon  | 477667 | Waiting on empty queue | NULL                     |
| 21 | root            | localhost | test | Query   |     29 | User sleep             | SELECT SLEEP(100) FROM t |
| 24 | root            | localhost | test | Query   |     25 | User sleep             | SELECT SLEEP(100) FROM t |
| 26 | root            | localhost | test | Sleep   |      4 |                        | NULL                     |
| 27 | root            | localhost | test | Query   |      0 | starting               | SHOW PROCESSLIST         |
| 28 | root            | localhost | test | Killed  |     22 | Sending data           | SELECT * FROM t          |
+----+-----------------+-----------+------+---------+--------+------------------------+--------------------------+
```

### KILL QUERY / CONNECTION
1. `session C`执行的时候被堵住了，`session D`执行`KILL QUERY`没啥效果
    - 等行锁时，使用的是`pthread_cond_timedwait`函数，这个等待状态是**可以被唤醒**的
    - 本例中，28号线程的等待逻辑为
        - 每**10ms**判断下能否进入InnoDB执行，如果不行，调用`nanosleep`函数进入`SLEEP`状态
    - 虽然28号线程的状态被设置成了`THD:KILL_QUERY`，但在等待进入InnoDB的循环过程中
        - 并**没有去判断线程的状态**，因此根本不会进入**终止逻辑**阶段
2. `session E`执行`KILL CONNECTION`，断开`session C`的连接，`Command`列变成了`Killed`
    - 表示**客户端**虽然**断开了连接**，但实际上**服务端**上这条语句还是在**执行中**
    - 把28号线程的状态设置为`THD:KILL_CONNECTION`，然后**关闭**12号线程的**网络连接**
        - `session C`会收到断开连接的提示
3. SHOW PROCESSLIST
    - 如果一个线程的状态为`THD:KILL_CONNECTION`，`Command`列会显示为`Killed`
    - 28号线程只有满足进入InnoDB的条件后，`session C`的查询语句将继续执行
        - 才有可能判断到线程状态是否已经变成了`KILL_QUERY`或者`KILL_CONNECTION`
        - 再进入终止逻辑阶段

## KILL无效的情况
1. 线程没有执行到**判断线程状态**的逻辑
    - innodb_thread_concurrency过小
    - 例如IO压力过大，读写IO的函数一直没有返回，导致不能及时判断线程的状态
2. **终止逻辑耗时较长**，`SHOW PROCESSLIST`显示为`Command=Killed`
    - **超大事务执行期间被KILL**
        - 回滚操作需要**对事务执行期间生成的所有新数据版本做回收操作**，耗时很长
    - **大查询回滚**
        - 查询过程中生成了**较大的临时文件**，恰好此时**文件系统压力较大**
        - 删除临时文件需要等待IO资源，导致耗时较长
    - **DDL执行到最后阶段被KILL**
        - 需要删除中间过程的**临时文件**，可能受**IO资源**影响，耗时比较久

## CTRL + C
1. 在客户端的操作**只能影响到客户端的线程**
2. 客户端与服务端只能通过**网络交互**，因此是**不可能直接操作服务端线程**的
3. MySQL是**停等协议**，在这个线程执行的语句还没有返回的时候，再往该连接发命令是没有用的
    - 实际上，执行`CTRL + C`，MySQL是**另起一个连接**，然后发送一个`KILL QUERY`命令

## mysql -A
```sql
$ mysql -uroot -Dtest
Reading table information for completion of table and column names
You can turn off this feature to get a quicker startup with -A
```
1. MySQL客户端默认会提供一个本地库名和表名**补全**的功能，在客户端连接成功后，会多执行以下操作
    - `SHOW DATABASES;` -> `USE test;` -> `SHOW TABLES;`
    - 目的：用于构建一个**本地的哈希表**
2. 当表很多的时候，会表现得慢，但这是**客户端慢**，而非**连接慢**或者**服务端慢**

## mysql --quick
1. MySQL客户端发送请求后，接收服务端返回结果的两种方式
    - **使用本地缓存**，在本地开辟一片内存，先把结果存起来，对应API为`mysql_store_result`
        - MySQL客户端默认行为，即不加参数`--quick`
    - **不使用本地缓存**，读一个处理一个，对应API为`mysql_use_result`
        - 如果**客户端本地处理得慢**，会导致**服务端发送结果被阻塞**，导致服务端变慢
2. 使用`--quick`的效果
    - `-A`参数，**跳过表名自动补全功能**
    - `mysql_store_result`需要申请**本地内存**来缓存结果
        - 如果查询结果太大，可能会**影响客户端本地机器的性能**
    - 不会把执行命令记录到本地的**命令历史文件**
3. `--quick`的目的是为了让**客户端更快**，但有可能会**降低服务端性能**

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
