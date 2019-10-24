---
title: Kafka -- 动态配置
mathjax: false
date: 2019-09-25 09:58:18
categories:
    - Middleware
    - MQ
    - Kafka
tags:
    - Middleware
    - MQ
    - Kafka
    - Stream
---

## 背景
1. Kafka安装目录的config路径下，有`server.properties`文件
    - 通常情况下，会指定`server.properties`来启动Broker
    - 如果要设置Broker端的任何参数，必须要显式修改`server.properties`，然后重启Broker，让参数生效
    - 但在生产环境，不能随意重启Broker，因此需要能够**动态**修改Broker端参数
2. 社区于**1.1.0**正式引入了**动态Broker参数**
    - 动态指的是修改参数后，无需重启Broker就能立即生效，而之前`server.properties`中配置的参数称为**静态参数**
3. 并非所有Broker端参数都可以动态调整的，官方文档中有`Dynamic Update Mode`一列
    - **read-only**
        - 与原来的参数行为一样，只有重启Broker，才能令修改生效
    - **per-broker**
        - **动态参数**，修改之后，只会在**对应的Broker**上生效
    - **cluster-wide**
        - **动态参数**，修改之后，会在**整个集群**范围内生效

<!-- more -->

## 使用场景
1. 动态调整Broker端各种**线程池大小**，实时应对**突发流量** -- 比较常用
2. 动态调整Broker端连接信息或安全配置信息
3. 动态更新SSL KeyStore有效期
4. 动态调整Broker端Compact操作性能
5. 实时变更JMX指标收集器（JMX Metrics Reporter）

## 保存机制
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-dynamic-config-znode.png" width=1000/>

1. Kafka将**动态Broker参数**保存在**ZK**中
2. `changes`节点用来**实时监测动态参数变更**的，**不会保存参数值**
3. `topics`节点用来保存Kafka**主题级别**参数的
4. `users`节点和`clients`节点用来**动态调整客户端配额**
    - 配额：限制连入集群的客户端的**吞吐量**或**使用的CPU资源**
5. `brokers`节点用来保存**动态Broker端参数**
    - `<default>`节点用来保存`cluster-wide`范围的动态参数
    - `broker_id`节点用来保存特定Broker的`per-broker`范围的动态参数
6. 参数优先级
    - _**`per-broker`参数 > `cluster-wide`参数 > static参数 > Kafka默认值**_
7. 下图中的**ephemeralOwner**字段都是`0x0`，表示这些znode都是**持久化节点**，即使ZK集群重启，动态参数也不会丢失

```
[zk: localhost:2181(CONNECTED) 21] ls /config
[changes, clients, brokers, topics, users]

[zk: localhost:2181(CONNECTED) 22] ls /config/brokers
[0, <default>]

[zk: localhost:2181(CONNECTED) 23] get /config/brokers/<default>
{"version":1,"config":{"unclean.leader.election.enable":"true"}}
cZxid = 0xe89
ctime = Thu Oct 24 09:28:50 CST 2019
mZxid = 0xe89
mtime = Thu Oct 24 09:28:50 CST 2019
pZxid = 0xe89
cversion = 0
dataVersion = 0
aclVersion = 0
ephemeralOwner = 0x0
dataLength = 64
numChildren = 0

[zk: localhost:2181(CONNECTED) 24] get /config/brokers/0
{"version":1,"config":{"leader.replication.throttled.rate":"104857600","follower.replication.throttled.rate":"104857600"}}
cZxid = 0xdef
ctime = Mon Oct 21 09:50:13 CST 2019
mZxid = 0xe07
mtime = Mon Oct 21 10:07:23 CST 2019
pZxid = 0xdef
cversion = 0
dataVersion = 1
aclVersion = 0
ephemeralOwner = 0x0
dataLength = 122
numChildren = 0
```

## 配置命令

### 设置cluster-wide参数
如果要设置`cluster-wide`范围的动态参数，需要显式指定**`entity-default`**
```
$ kafka-configs --bootstrap-server localhost:9092 --entity-type brokers --entity-default --alter --add-config unclean.leader.election.enable=true
Completed updating default config for brokers in the cluster,
```
查看配置是否成功，`sensitive=false`表明**要调整的参数不是敏感数据**
```
$ kafka-configs --bootstrap-server localhost:9092 --entity-type brokers --entity-default --describe
Default config for brokers in the cluster are:
  unclean.leader.election.enable=true sensitive=false synonyms={DYNAMIC_DEFAULT_BROKER_CONFIG:unclean.leader.election.enable=true}
```

### 设置per-broker参数
```
$ kafka-configs --bootstrap-server localhost:9092 --entity-type brokers --entity-name 0 --alter --add-config unclean.leader.election.enable=false,leader.replication.throttled.rate=104857600,follower.replication.throttled.rate=104857600
Completed updating config for broker: 0.
```
查看配置是否成功，重点关注
实际值：`unclean.leader.election.enable=false`
per-broker参数：`DYNAMIC_BROKER_CONFIG:unclean.leader.election.enable=false`
cluster-wide参数：`DYNAMIC_DEFAULT_BROKER_CONFIG:unclean.leader.election.enable=true`
Kafka默认值：`DEFAULT_CONFIG:unclean.leader.election.enable=false`
```
$ kafka-configs --bootstrap-server localhost:9092 --entity-type brokers --entity-name 0 --describe
Configs for broker 0 are:
  leader.replication.throttled.rate=null sensitive=true synonyms={DYNAMIC_BROKER_CONFIG:leader.replication.throttled.rate=null}
  follower.replication.throttled.rate=null sensitive=true synonyms={DYNAMIC_BROKER_CONFIG:follower.replication.throttled.rate=null}
  unclean.leader.election.enable=false sensitive=false synonyms={DYNAMIC_BROKER_CONFIG:unclean.leader.election.enable=false, DYNAMIC_DEFAULT_BROKER_CONFIG:unclean.leader.election.enable=true, DEFAULT_CONFIG:unclean.leader.election.enable=false}
```

### 删除cluster-wide参数
```
$ kafka-configs --bootstrap-server localhost:9092 --entity-type brokers --entity-default --alter --delete-config unclean.leader.election.enable
Completed updating default config for brokers in the cluster,

$ kafka-configs --bootstrap-server localhost:9092  --entity-type brokers --entity-default --describe
Default config for brokers in the cluster are:
```

### 删除per-broker参数
```
$ kafka-configs --bootstrap-server localhost:9092 --entity-type brokers --entity-name 0 --alter --delete-config unclean.leader.election.enable,leader.replication.throttled.rate,follower.replication.throttled.rate
Completed updating config for broker: 0.

$ kafka-configs --bootstrap-server localhost:9092  --entity-type brokers --entity-name 0 --describe
Configs for broker 0 are:
```

## 常用动态参数

1. log.retention.ms
    - 修改**日志留存时间**
2. num.io.threads、num.network.threads
    - 实现生产环境**动态按需扩容**
3. 与SSL相关：ssl.keystore.type、ssl.keystore.location、ssl.keystore.password 和 ssl.key.password
    - 允许动态实时调整这些参数后，可以创建那些**过期时间很短的SSL证书**
    - 每当调整这些参数后，Kafka底层会**重新配置Socket连接通道并更新Keystore**
    - 新的连接会使用新的Keystore，**阶段性地调整这些参数，有利于增加安全性**
4. num.replica.fetchers
    - **提高Follower拉取副本的速度**