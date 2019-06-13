---
title: MySQL -- 基础架构
date: 2019-01-14 20:10:55
categories:
    - MySQL
tags:
    - MySQL
---

## 查询语句
```sql
mysql> select * from T where ID=10;
```

## 基本架构
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-architecture.png" width=400/>


<!-- more -->

1. 大体上，MySQL可以分为**Server层**和**存储引擎层**
2. Server层包括**连接器、查询缓存、分析器、优化器和执行器**等
    - 涵盖MySQL的**大多数核心服务功能**，以及**所有的内置函数**
    - 所有的**跨存储引擎的功能**都在这一层实现，例如存储过程、触发器和视图等
3. 存储引擎层负责**数据的存储和提取**，架构模式为**插件式**
    - 支持InnoDB、MyISAM和Memory等存储引擎
    - 最常用为**InnoDB**（Since 5.5.5，默认）

## 连接器
连接器负责跟客户端**建立连接、获取权限、维持和管理连接**，命令如下
```
$ mysql -h$host -P$port -u$user -p
```

### 权限
- mysql是客户端工具，用来与服务端建立连接
- 在完成TCP三次握手之后，连接器就要开始认证身份，即`-u`和`-p`
    - 如果账号密码不对，客户端会收到`Access denied for user`的错误
    - 如果账号密码认证通过，连接器会到**权限表**里查询拥有的权限
        - 之后在**这个连接里**的权限判断，都**依赖于此时读取的权限**
        - 因此即使用管理员账号对权限进行修改，也**不会影响到已经存在连接的权限**

### 连接
- 连接完成后，如果没有后续的动作，这个连接就会处于空闲状态
    - 可以通过`show processlist`命令查看，`Command=Sleep`表示是一个**空闲连接**
- 如果客户端太长时间没有动静，连接器会**自动将其断开**，有参数`wait_timeout`控制，默认为8小时
- 如果在连接被断开之后，客户端再次发送请求后，会收到错误
    - `Lost connection to MySQL server during query`
    - 如果需要继续，就需要**重新连接**，然后再执行请求
- 数据库层面的**长连接**和**短连接**
    - 长连接：在连接成功后，如果客户端持续有请求，则一直使用同一连接
        - 建立连接的过程比较复杂，推荐使用
    - 短连接：每次执行完很少的**几次查询**后就会断开连接，下次查询再重新建立连接
- 全部使用长连接后，MySQL的**占用内存**可能会**涨的很快**
    - 原因：MySQL在执行过程中**临时使用的内存**是在**连接对象**里面管理的，而这些资源在**连接断开**时才会**释放**
    - 如果长连接累计下来，可能会导致占用内存太大，因为**OOM**被系统强行Kill掉，表现为**MySQL异常重启**
    - 解决方案
        - 定期断开长连接。可以减少`wait_timeout`，或者在程序中判断是否执行过占用大内存的查询，然后断开连接
        - 从MySQL 5.7开始，可以在每次执行较大的操作后，执行`mysql_reset_connection`来**初始化**连接资源
            - 该过程不需要**重新建立连接**和**重新做权限校验**
            - 只是会将连接**恢复**到**刚刚创建完**时的状态

```
mysql> show processlist;
+---------+-------------+----------------------+-----------+---------+------+-------+------------------+
| Id      | User        | Host                 | db        | Command | Time | State | Info             |
+---------+-------------+----------------------+-----------+---------+------+-------+------------------+
| 5649500 | live_prop_r | 192.168.30.55:38764  | live_prop | Sleep   |  327 |       | NULL             |
| 5784362 | live_prop_r | 192.168.80.58:35068  | live_prop | Sleep   |  326 |       | NULL             |
| 5785680 | live_prop_r | 192.168.80.58:41968  | live_prop | Sleep   |  326 |       | NULL             |
| 5789440 | live_prop_r | 192.168.80.88:35896  | live_prop | Sleep   | 1030 |       | NULL             |
| 5790469 | live_prop_r | 192.168.85.200:56204 | live_prop | Query   |    0 | init  | show processlist |
+---------+-------------+----------------------+-----------+---------+------+-------+------------------+
```
```
# 连接过程中的等待时间
mysql> SHOW VARIABLES LIKE '%connect_timeout%';
+-----------------+-------+
| Variable_name   | Value |
+-----------------+-------+
| connect_timeout | 10    |
+-----------------+-------+

# 非交互式，连接完成后，使用过程中的等待时间
mysql> show variables like 'wait_timeout';
+---------------+-------+
| Variable_name | Value |
+---------------+-------+
| wait_timeout  | 3600  |
+---------------+-------+

# 交互式，连接完成后，使用过程中的等待时间
mysql> SHOW VARIABLES LIKE '%interactive_timeout%';
+---------------------+-------+
| Variable_name       | Value |
+---------------------+-------+
| interactive_timeout | 3600  |
+---------------------+-------+
```

## 查询缓存
- MySQL收到一个查询语句后，首先会查询缓存
- 之前执行过的语句及其结果可能会以`Key-Value`的形式，被直接缓存在内存中
    - Key：查询语句
    - Value：查询结果
- 如果能在缓存中找到这个Key，直接返回对应的Value
- 否则，就会继续执行后续的执行阶段，执行完成后，执行结果会被存入查询缓存中
- **查询缓存往往弊大于利**
    - 查询缓存的**失效非常频繁**，只要有一个对表的**更新**操作，这个表上的**所有查询缓存**都会被**清空**
    - 因此对**更新频繁**的场景来说，查询缓存的**命中率很低**
    - 查询缓存比较适合**读多写极少**的场景，例如系统配置表
- query_cache_type
    - A value of 0 or **OFF** prevents caching or retrieval of cached results
    - A value of 1 or **ON** enables caching except of those statements that begin with **SELECT SQL_NO_CACHE**
    - A value of 2 or **DEMAND** causes caching of only those statements that begin with **SELECT SQL_CACHE**
- MySQL 8.0删除掉了查询缓存这个功能

[Query Cache Configuration](https://dev.mysql.com/doc/refman/5.6/en/query-cache-configuration.html)
```
mysql> SHOW VARIABLES LIKE '%query_cache%';
+------------------------------+---------+
| Variable_name                | Value   |
+------------------------------+---------+
| have_query_cache             | YES     |
| query_cache_limit            | 1048576 |
| query_cache_min_res_unit     | 4096    |
| query_cache_size             | 0       |
| query_cache_type             | OFF     |
| query_cache_wlock_invalidate | OFF     |
+------------------------------+---------+
```

## 分析器
- 如果没有命中查询缓存，就要开始真正地执行语句
- 分析器首先会做**词法分析**
    - MySQL需要识别SQL语句里面的字符串是什么
    - 通过`select`关键字识别出这是一个查询语句
    - 将`T`识别成表名，将字符串`ID`识别成列名
- 分析器会接着做**语法分析**
    - 根据词法分析的结果，语法分析会根据**语法规则**，判断SQL是否满足MySQL语法
    - 如果不满足，将会收到错误`You have an error in your SQL syntax`错误

## 优化器
- 经过**分析器**，MySQL已经能理解要**做什么**，在开始执行之前，需要经过**优化器**的处理，达到**怎么做**
- 优化器会在表里存在多个索引的时候，选择使用哪个索引
- 优化器也会在多表关联的时候，决定各个表的连接顺序
- 优化器阶段完成后，语句的**执行方案**就已经能确定下来了，然后进入执行器阶段

## 执行器
- MySQL通过**分析器**能明白**做什么**，再通过**优化器**能明白**怎么做**，而**执行器**是负责语句的**具体执行**
- 首先会判断是否有**执行权限**，如果没有就会返回权限错误，`SELECT command denied to user`
    - 如果命中查询缓存，也会在查询缓存**返回**结果的时候，做权限验证
    - 优化器之前也会调用**precheck**做验证权限
- 如果有权限，那么将打开表继续执行
    - 打开表的时候，执行器会根据表的引擎定义，去**调用引擎提供的接口**
- 假设表T中，ID字段没有索引，执行器的执行流程如下
    - 调用InnoDB的引擎接口，获取表的第一行，判断ID是否为10
        - 如果不是则跳过，如果是则将这行存放在结果集中
    - 调用引擎接口获取下一行，重复上面的判断逻辑，直到获取到表的最后一行
    - 执行器将上面遍历过程中所有满足条件的行组成的记录集作为结果集返回给客户端
- **rows_examined**
    - 数据库的慢查询日志会有`rows_examined`字段
    - 在执行器每次调用引擎获取数据行的时候**累加**的（+1）
    - 有些场景，执行器调用一次，但在引擎内部则是扫描了很多行
        - 例如在InnoDB中，**一页有很多行数据**
    - 因此，**引擎扫描行数（引擎内部真正扫描的次数）跟rows_examined并不完全相同**

[The Slow Query Log](https://dev.mysql.com/doc/refman/5.6/en/slow-query-log.html)
```
mysql> SHOW VARIABLES LIKE '%slow_query%';
+---------------------+-----------------------------------------------------+
| Variable_name       | Value                                               |
+---------------------+-----------------------------------------------------+
| slow_query_log      | ON                                                  |
| slow_query_log_file | /data_db3/mysql/3323/slowlog/slowlog_2019011423.log |
+---------------------+-----------------------------------------------------+

SET GLOBAL log_timestamps = SYSTEM;
```

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
