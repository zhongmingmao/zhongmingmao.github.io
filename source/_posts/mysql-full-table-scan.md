---
title: MySQL -- 全表扫描
date: 2019-03-08 23:51:17
categories:
    - Storage
    - MySQL
tags:
    - Storage
    - MySQL
---

## Server层
```sql
-- db1.t有200GB
mysql -h$host -P$port -u$user -p$pwd -e "select * from db1.t" > $target_file
```

### 查询数据
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-query-send-data.jpg" width=800/>


<!-- more -->

1. InnoDB的数据是保存在主键索引上，全表扫描实际上是直接扫描表t的主键索引
2. 获取一行，写到`net_buffer`中，默认为**16K**，控制参数为`net_buffer_length`
3. 重复获取行，直到**写满**`net_buffer`，然后调用网络接口发出去
4. 如果发送成功，就**清空**`net_buffer`，然后继续取下一行并写入`net_buffer`
5. 如果发送函数返回`EAGAIN`或者`WSAEWOULDBLOCK`，表示本地网络栈`socket send buffer`写满
    - 此时，进入等待，直到网络栈重新可写，再继续发送
6. 一个查询在发送数据的过程中，占用MySQL内部的内存最大为`net_buffer_length`，因此不会达到200G
7. `socket send buffer`也不可能达到200G，如果`socket send buffer`被写满，就会暂停读取数据

```sql
-- 16384 Bytes = 16 KB
mysql> SHOW VARIABLES LIKE '%net_buffer_length%';
+-------------------+-------+
| Variable_name     | Value |
+-------------------+-------+
| net_buffer_length | 16384 |
+-------------------+-------+
```

### Sending to client
1. MySQL是**边读边发**的，如果**客户端接收慢**，会导致MySQL服务端由于**结果发不出去**，**事务的执行时间变长**
2. 下图为MySQL客户端不读取`socket receive buffer`中的内容的场景
    - State为`Sending to client`，表示服务端的网络栈写满了
3. `mysql --quick`，会使用`mysql_use_result`方法，该方法会**读取一行处理一行**
    - 假设每读出一行数据后要处理的逻辑很慢，就会导致客户端要过很久才会去取下一行数据
    - 这时也会出现State为`Sending to client`的情况
    - 对于正常的线上业务，如果单个查询返回的结果不多，推荐使用`mysql_store_result`接口
    - 适当地调大`net_buffer_length`可能是个更优的解决方案

<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-client-do-not-receive.png" width=800/>


### Sending data

#### State切换
1. MySQL的**查询语句**在进入**执行阶段**后，首先把State设置为`Sending data`
2. 然后，发送执行结果的**列相关的信息**（**meta data**）给客户端
3. 再继续执行语句的流程，执行完成后，把State设置为**空字符串**
4. 因此State为`Sending data`不等同于**正在发送数据**

#### 样例
```sql
CREATE TABLE `t` (
    `id` int(11) NOT NULL,
    `c` int(11) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO t VALUES (1,1);
```

| session A | session B |
| ---- | ---- |
| BEGIN; | |
| SELECT * FROM t WHERE id=1 FOR UPDATE; | |
| | SELECT * FROM t LOCK IN SHARE MODE;<br/>(Blocked) |

```sql
mysql> SHOW PROCESSLIST;
+----+-----------------+-----------+------+---------+--------+------------------------+------------------------------------+
| Id | User            | Host      | db   | Command | Time   | State                  | Info                               |
+----+-----------------+-----------+------+---------+--------+------------------------+------------------------------------+
|  4 | event_scheduler | localhost | NULL | Daemon  | 713722 | Waiting on empty queue | NULL                               |
| 37 | root            | localhost | test | Sleep   |     35 |                        | NULL                               |
| 38 | root            | localhost | test | Query   |     15 | Sending data           | SELECT * FROM t LOCK IN SHARE MODE |
| 39 | root            | localhost | NULL | Query   |      0 | starting               | show processlist                   |
+----+-----------------+-----------+------+---------+--------+------------------------+------------------------------------+
```

## InnoDB层
1. 内存的数据页是在`Buffer Pool`中管理的
2. 作用：**加速更新**（WAL机制）+**加速查询**

### 内存命中率
1. `SHOW ENGINE INNODB STATUS`中的`Buffer pool hit rate 990 / 1000`，表示命中率为99%
2. `Buffer Pool`的大小由参数`innodb_buffer_pool_size`控制，一般设置为物理内存的`60%~80%`
3. `Buffer Pool`一般都会小于磁盘的数据量，InnoDB将采用`LRU`算法来淘汰数据页

```sql
-- 134217728 Bytes = 128 MB
mysql> SHOW VARIABLES LIKE '%innodb_buffer_pool_size%';
+-------------------------+-----------+
| Variable_name           | Value     |
+-------------------------+-----------+
| innodb_buffer_pool_size | 134217728 |
+-------------------------+-----------+
```

### 基本LRU
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-innodb-eliminate-strategy-lru.jpg" width=800/>

1. InnoDB采用的LRU算法，是基于**链表**实现的
2. State1，链表头部是P1，表示P1是最近**刚刚被访问过**的数据页
3. State2，有一个读请求访问P3，P3被移动到链表的最前面
4. State3，要访问的数据页不在链表中，所以需要在`Buffer Pool`中新申请一个数据页Px，加到链表头部
    - 但由于`Buffer Pool`已满，不能再申请新的数据页
    - 于是会清空链表末尾Pm这个数据页的内存，存入Px的内容，并且放到链表头部

### 冷数据全表扫描
1. 扫描一个200G的表，该表为历史数据表，平时没有什么业务访问它
2. 按照基本LRU算法，就会把当前Buffer Pool里面的数据**全部淘汰**，存入扫描过程中访问到的数据页
3. 此时，对外提供业务服务的库来说，**Buffer Pool的命中率会急剧下降**，**磁盘压力增加**，**SQL语句响应变慢**
4. 因此InnoDB采用了改进的LRU算法

### 改进LRU
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-innodb-eliminate-strategy-lru-opt.png" width=800/>

1. 在InnoDB的实现上，按照`5:3`的比例把整个LRU链表分成`young`区和`old`区
2. `LRU_old`指向old区的第一个位置，即靠近链表头部的`5/8`是`young`区，靠近链表尾部的`3/8`是`old`区
3. State1，要访问数据页P3，由于P3在young区，与基本的LRU算法一样，将其移动到链表头部，变为State2
4. 然后要访问一个不在当前链表的数据页，此时依然要淘汰数据页Pm，但新插入的数据页Px放在`LRU_old`
5. 处于old区的数据页，每次被访问的时候都需要做以下判断
    - 如果这个数据页在LRU链表中**存在的时间**超过了1S，就把它移动到链表头部，否则，位置不变
    - 存在时间的值由参数`innodb_old_blocks_time`控制
6. 该策略是为了处理类似**全表扫描**的操作而定制的
    - 扫描过程中，需要**新插入的数据页**，都被放到`old`区
    - **一个数据页会有多条记录**，因此**一个数据页会被访问多次**
        - 但由于是_**顺序扫描**_
        - 数据页的**第一次被访问**和**最后一次被访问**的时间间隔不会超过1S，因此还是会留在`old`区
    - 继续扫描，之前的数据页再也不会被访问到，因此也不会被移到`young`区，**最终很快被淘汰**
7. 该策略最大的收益是在扫描大表的过程中，虽然**用到了Buffer Pool，但对young区完全没有影响**
    - _**保证了Buffer Pool响应正常业务的查询命中率**_

```sql
-- 1000ms = 1s
mysql> SHOW VARIABLES LIKE '%innodb_old_blocks_time%';
+------------------------+-------+
| Variable_name          | Value |
+------------------------+-------+
| innodb_old_blocks_time | 1000  |
+------------------------+-------+
```

### INNODB STATUS
```sql
mysql> SHOW ENGINE INNODB STATUS\G;
----------------------
BUFFER POOL AND MEMORY
----------------------
-- 137428992 Bytes = 131.0625 MB
Total large memory allocated 137428992
Dictionary memory allocated 432277
-- innodb_buffer_pool_size = 134217728 / 16 / 1024 / 1024 = 8192
-- 6957 + 1223 = 8180 ≈ Buffer pool size
Buffer pool size   8191
Free buffers       6957
Database pages     1223
-- 1223 * 3 / 8 = 458.625 ≈ Old database pages
Old database pages 465
Modified db pages  0
Pending reads      0
Pending writes: LRU 0, flush list 0, single page 0
-- made young : old -> young
-- not young : young -> old
Pages made young 0, not young 0
0.00 youngs/s, 0.00 non-youngs/s
Pages read 1060, created 163, written 666
0.00 reads/s, 0.00 creates/s, 0.00 writes/s
No buffer pool page gets since the last printout
Pages read ahead 0.00/s, evicted without access 0.00/s, Random read ahead 0.00/s
LRU len: 1223, unzip_LRU len: 0
I/O sum[0]:cur[0], unzip sum[0]:cur[0]
```

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
