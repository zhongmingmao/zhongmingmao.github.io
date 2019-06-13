---
title: MySQL -- 短连接 + 慢查询
date: 2019-02-20 16:11:17
categories:
    - Storage
    - MySQL
tags:
    - Storage
    - MySQL
---

## 短连接
1. 短连接模式：连接到数据库后，执行**很少的SQL**后就断开，下次需要的时候再重连
2. 在**业务高峰**期，会出现连接数突然暴涨的情况
    - MySQL建立连接的**成本非常昂贵**
    - 成本：TCP/IP三次握手 + 登录权限判断 + 获取连接的数据读写权限

<!-- more -->

### max_connections
1. `max_connections`：MySQL实例同时存在的连接数上限
2. 当连接数超过`max_connections`，系统会**拒绝**接下来的连接请求，返回：`Too many connections`
    - 当连接被拒绝，从业务角度来看是**数据库不可用**
3. 如果机器**负载较高**，处理现有请求的时间会变长，每个连接**保持的时间**也会变长
    - 如果再有新建连接的话，很容易触发`max_connections`的限制
4. `max_connections`的目的是**保护MySQL**的
    - 如果把`max_connections`设置得过大，更多的连接就会进来，导致系统负载会进一步加大
    - 大量的资源会耗费在**权限验证**等逻辑上，而已经**拿到连接的线程**会抢不到CPU资源去执行业务SQL

```sql
mysql> SHOW VARIABLES LIKE '%max_connections%';
+-----------------+-------+
| Variable_name   | Value |
+-----------------+-------+
| max_connections | 2000  |
+-----------------+-------+
```

### 清理Sleep状态的连接
`KILL CONNECTION`：主动踢除**不需要保持**的连接（与`wait_timeout`的效果一样）

| 时刻 | sission A | session B | session C |
| ---- | ---- | ---- | ---- |
| T | BEGIN;<br/>INSERT INTO t VALUES (1,1); | SELECT * FROM t WHERE id=1; | |
| T+30s | | | SHOW PROCESSLIST;<br/>KILL CONNECTION |

1. 踢除`Sleep`状态的连接是**有损**的
2. 如果断开sission A的连接，会**回滚事务**
3. 如果断开sission B的连接，没有任何影响
    - 优先断开**事务外空闲**的连接
    - 再考虑断开**事务内空闲**的连接

#### 事务外空闲
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-short-conn-trx-idle-1.png" width=500/>

`trx_mysql_thread_id`：`id=4`的线程还处在事务中
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-short-conn-trx-idle-2.png" width=500/>


#### KILL CONNECTION
1. 服务端执行`KILL CONNECTION id`，如果连接在此前处于`Sleep`状态，客户端是**不会立马知道**
2. 客户端如果发起**下一个请求**，报错`ERROR 2006 (HY000): MySQL server has gone away`
    - 因此，客户端（应用层）需要有**重连机制**

### 减少连接过程的消耗
1. 数据库**跳过权限验证阶段** -- _**风险极高**_
    - 重启数据库，启动参数`--skip-grant-tables`
    - 跳过**所有**的权限验证阶段（**连接过程**+**语句执行过程**）
2. 从MySQL 8.0开始，启用`--skip-grant-tables`参数，默认会启用`--skip-networking`（**本地客户端**）

## 慢查询

### 索引没有设计好

#### 古老方案
1. `Online DDL` -- `ALTER TABLE`
2. 主库A，备库B
3. 在备库B上执行`SET sql_log_bin=OFF`（**不写binlog**），`ALTER TABLE`加上索引
4. 执行**主备切换**，变成主库B，备库A
5. 在备库A上执行`SET sql_log_bin=OFF`（**不写binlog**），`ALTER TABLE`加上索引

#### 工具
gh-ost

### 语句没写好
```sql
-- Since MySQL 5.7
INSERT INTO query_rewrite.rewrite_rules (pattern, replacement, pattern_database)
    VALUES ("SELECT * FROM t WHERE id + 1 = ?", "SELECT * FROM t WHERE id = ? - 1", "test");

CALL query_rewrite.flush_rewrite_rules();
```

### MySQL选错索引
1. `FORCE INDEX`
2. `query_rewrite` + `FORCE INDEX`

### 预先发现问题
1. 测试环境配置：`slow_query_log=ON`+`long_query_time=0`
2. SQL Review，留意`Rows_examined`是否与预期的一致
3. 工具：`pt-query-digest`

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
