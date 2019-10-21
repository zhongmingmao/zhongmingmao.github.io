---
title: Kafka -- 主题管理
mathjax: false
date: 2019-09-23 01:27:38
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

## 日常管理

### 创建主题
```
$ kafka-topics --bootstrap-server localhost:9092 --create --topic t1 --partitions 1 --replication-factor 1
```
1. 从Kafka **2.2**版本开始，推荐使用`--bootstrap-server`代替`--zookeeper`（标记为**已过期**）
2. 原因
    - 使用`--zookeeper`会绕过Kafka的**安全体系**，不受认证体系的约束
    - 使用`--bootstrap-server`与集群交互是**未来的趋势**

<!-- more -->

### 查询主题列表
```
$ kafka-topics --bootstrap-server localhost:9092 --list
__consumer_offsets
_schemas
t1
transaction
```

### 查询单个主题
```
$ kafka-topics --bootstrap-server localhost:9092 --describe --topic __consumer_offsets
Topic:__consumer_offsets	PartitionCount:50	ReplicationFactor:1	Configs:compression.type=producer,cleanup.policy=compact,segment.bytes=104857600
    Topic: __consumer_offsets	Partition: 0	Leader: 0	Replicas: 0	Isr: 0
    Topic: __consumer_offsets	Partition: 1	Leader: 0	Replicas: 0	Isr: 0
    ...
    Topic: __consumer_offsets	Partition: 48	Leader: 0	Replicas: 0	Isr: 0
    Topic: __consumer_offsets	Partition: 49	Leader: 0	Replicas: 0	Isr: 0
```

### 增加主题分区
Kafka目前**不允许减少某个主题的分区数**，指定的分区数一定要**比原有分区数大**，否则Kafka会抛出InvalidPartitionsException
```
$ kafka-topics --bootstrap-server localhost:9092 --alter --topic t1 --partitions 3

$ kafka-topics --bootstrap-server localhost:9092 --describe --topic t1
Topic:t1	PartitionCount:3	ReplicationFactor:1	Configs:segment.bytes=1073741824
	Topic: t1	Partition: 0	Leader: 0	Replicas: 0	Isr: 0
	Topic: t1	Partition: 1	Leader: 0	Replicas: 0	Isr: 0
	Topic: t1	Partition: 2	Leader: 0	Replicas: 0	Isr: 0

$ kafka-topics --bootstrap-server localhost:9092 --alter --topic t1 --partitions 2
Error while executing topic command : org.apache.kafka.common.errors.InvalidPartitionsException: Topic currently has 3 partitions, which is higher than the requested 2.
[2019-10-21 09:36:14,368] ERROR java.util.concurrent.ExecutionException: org.apache.kafka.common.errors.InvalidPartitionsException: Topic currently has 3 partitions, which is higher than the requested 2.
	at org.apache.kafka.common.internals.KafkaFutureImpl.wrapAndThrow(KafkaFutureImpl.java:45)
	at org.apache.kafka.common.internals.KafkaFutureImpl.access$000(KafkaFutureImpl.java:32)
	at org.apache.kafka.common.internals.KafkaFutureImpl$SingleWaiter.await(KafkaFutureImpl.java:89)
	at org.apache.kafka.common.internals.KafkaFutureImpl.get(KafkaFutureImpl.java:260)
	at kafka.admin.TopicCommand$AdminClientTopicService.alterTopic(TopicCommand.scala:215)
	at kafka.admin.TopicCommand$.main(TopicCommand.scala:62)
	at kafka.admin.TopicCommand.main(TopicCommand.scala)
Caused by: org.apache.kafka.common.errors.InvalidPartitionsException: Topic currently has 3 partitions, which is higher than the requested 2.
 (kafka.admin.TopicCommand$)
```

### 修改主题级别参数
`--bootstrap-server`是用来设置**动态参数**的，而**常规的主题级别参数**，还是使用`--zookeeper`
```java
$ kafka-configs --zookeeper localhost:2181 --entity-type topics --entity-name t1 --alter --add-config max.message.bytes=10485760
Completed Updating config for entity: topic 't1'.
```

### 变更副本数
使用`kafka-reassign-partitions`脚本**增加**主题的副本数，参照下文

### 修改主题限速
主要是指设置Leader副本和Follower副本使用的**带宽**，想要让某个主题的副本在执行**副本同步**机制时，不要消耗过多的带宽
需要修改Broker端参数**`leader.replication.throttled.rate`**和**`follower.replication.throttled.rate`**
如果某主题的副本分别在0、1、2、3多个Broker上，需要依次到Broker0、Broker1、Broker2、Broker3上执行这条命令
```
$ kafka-configs --zookeeper localhost:2181 --entity-type brokers --entity-name 0 --alter --add-config 'leader.replication.throttled.rate=104857600,follower.replication.throttled.rate=104857600'
Completed Updating config for entity: brokers '0'.
```
设置完上面两个参数后，需要为该主题设置要限速的副本，通配符`*`代表**所有副本**都设置限速
```
$ kafka-configs --zookeeper localhost:2181 --entity-type topics --entity-name t1 --alter --add-config 'leader.replication.throttled.replicas=*,follower.replication.throttled.replicas=*'
Completed Updating config for entity: topic 't1'.
```

### 主题分区迁移
使用`kafka-reassign-partitions`脚本对**主题各个分区的副本**进行调整，如把某些分区批量迁移到其它Broker上，参照下文

### 删除主题
删除操作是**异步**的，执行完命令后，主题仅仅被**标记为已删除**而已，Kafka会在**后台**默默开启主题删除操作
```
$ kafka-topics --bootstrap-server localhost:9092 --delete --topic t1
```

## 位移主题

### 副本数量
1. 在Kafka **0.11**之前，当Kafka**自动创建**`__consumer_offsets`时
    - 会综合考虑**当前运行的Broker台数**和Broker端参数**`offsets.topic.replication.factor`**，取两者中的**较小值**
    - 这违背了用户设置`offsets.topic.replication.factor`的初衷
2. 在Kafka **0.11**之后，Kafka会**严格遵守**`offsets.topic.replication.factor`的值
    - 如果当前运行的Broker数量小于`offsets.topic.replication.factor`，Kafka会**创建位移主题失败**，并抛出异常
3. 如果`__consumer_offsets`的副本值为1，可以**增加**到3

reassign.json -- 副本的配置
```json
{"version":1, "partitions":[
    {"topic":"__consumer_offsets","partition":0,"replicas":[0,1,2]}, 
    {"topic":"__consumer_offsets","partition":1,"replicas":[0,2,1]},
    {"topic":"__consumer_offsets","partition":2,"replicas":[1,0,2]},
    ...
    {"topic":"__consumer_offsets","partition":49,"replicas":[0,1,2]}
]}
```
```
$ kafka-reassign-partitions --zookeeper localhost:2181 --reassignment-json-file reassign.json --execute
Current partition replica assignment

{"version":1,"partitions":[{"topic":"__consumer_offsets","partition":22,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":30,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":8,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":21,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":4,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":27,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":7,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":9,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":46,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":25,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":35,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":41,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":33,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":23,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":49,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":47,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":16,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":28,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":31,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":36,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":42,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":3,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":18,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":37,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":15,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":24,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":38,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":17,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":48,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":19,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":11,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":13,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":2,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":43,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":6,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":14,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":20,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":0,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":44,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":39,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":12,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":45,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":1,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":5,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":26,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":29,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":34,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":10,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":32,"replicas":[0],"log_dirs":["any"]},{"topic":"__consumer_offsets","partition":40,"replicas":[0],"log_dirs":["any"]}]}

Save this to use as the --reassignment-json-file option during rollback
Successfully started reassignment of partitions.
```

### 查看消费者组提交的位移数据
**OffsetsMessageFormatter**
```
$ kafka-console-consumer --bootstrap-server localhost:9092 --topic __consumer_offsets --formatter "kafka.coordinator.group.GroupMetadataManager\$OffsetsMessageFormatter" --from-beginning
[console-consumer-40652,test,0]::OffsetAndMetadata(offset=2, leaderEpoch=Optional.empty, metadata=, commitTimestamp=1538842068384, expireTimestamp=Some(1539446868384))
[console-consumer-6657,test,0]::NULL
[console-consumer-66385,zhongmingmao,0]::OffsetAndMetadata(offset=5, leaderEpoch=Optional.empty, metadata=, commitTimestamp=1538999538770, expireTimestamp=Some(1539604338770))
[console-consumer-41615,test,0]::NULL
[zhongmingmao,zhongmingmao1,0]::NULL
[stock,stock,0]::NULL
[zhongmingmao,zhongmingmao,1]::OffsetAndMetadata(offset=5, leaderEpoch=Optional.empty, metadata=, commitTimestamp=1570536122165, expireTimestamp=None)
[zhongmingmao,zhongmingmao,0]::OffsetAndMetadata(offset=5, leaderEpoch=Optional.empty, metadata=, commitTimestamp=1570536122165, expireTimestamp=None)
[zhongmingmao,zhongmingmao,4]::OffsetAndMetadata(offset=6, leaderEpoch=Optional.empty, metadata=, commitTimestamp=1570536122165, expireTimestamp=None)
[zhongmingmao,zhongmingmao,3]::OffsetAndMetadata(offset=6, leaderEpoch=Optional.empty, metadata=, commitTimestamp=1570536122165, expireTimestamp=None)
[zhongmingmao,zhongmingmao,2]::OffsetAndMetadata(offset=6, leaderEpoch=Optional.empty, metadata=, commitTimestamp=1570536122165, expireTimestamp=None)
[console-consumer-29492,test,0]::OffsetAndMetadata(offset=5, leaderEpoch=Optional.empty, metadata=, commitTimestamp=1539220886461, expireTimestamp=Some(1539825686461))
[console-consumer-88677,test,0]::OffsetAndMetadata(offset=10, leaderEpoch=Optional.empty, metadata=, commitTimestamp=1539222370827, expireTimestamp=Some(1539827170827))
[bijection,bijection,0]::OffsetAndMetadata(offset=20, leaderEpoch=Optional.empty, metadata=, commitTimestamp=1553425113337, expireTimestamp=None)
[console-consumer-60394,zhongmingmao,0]::OffsetAndMetadata(offset=3, leaderEpoch=Optional.empty, metadata=, commitTimestamp=1538880245612, expireTimestamp=Some(1539485045612))
[console-consumer-40652,test,0]::NULL
[console-consumer-29492,test,0]::NULL
[console-consumer-88677,test,0]::NULL
[bijection,bijection,0]::NULL
[console-consumer-66385,zhongmingmao,0]::NULL
[console-consumer-60394,zhongmingmao,0]::NULL
[zhongmingmao,zhongmingmao,1]::NULL
[zhongmingmao,zhongmingmao,0]::NULL
[zhongmingmao,zhongmingmao,4]::NULL
[zhongmingmao,zhongmingmao,3]::NULL
[zhongmingmao,zhongmingmao,2]::NULL
```

### 读取位移主题消息，查看消费者组的状态信息
**GroupMetadataMessageFormatter**
```
$ kafka-console-consumer --bootstrap-server localhost:9092 --topic __consumer_offsets --formatter "kafka.coordinator.group.GroupMetadataManager\$GroupMetadataMessageFormatter" --from-beginning
console-consumer-40652::GroupMetadata(groupId=console-consumer-40652, generation=2, protocolType=Some(consumer), currentState=Empty, members=Map())
console-consumer-18364::GroupMetadata(groupId=console-consumer-18364, generation=1, protocolType=Some(consumer), currentState=Stable, members=Map(consumer-1-6aa558f4-7166-457e-9006-39a5843aa976 -> MemberMetadata(memberId=consumer-1-6aa558f4-7166-457e-9006-39a5843aa976, groupInstanceId=Some(null), clientId=consumer-1, clientHost=/127.0.0.1, sessionTimeoutMs=10000, rebalanceTimeoutMs=300000, supportedProtocols=List(range), )))
console-consumer-18364::GroupMetadata(groupId=console-consumer-18364, generation=2, protocolType=Some(consumer), currentState=Empty, members=Map())
console-consumer-6657::NULL
console-consumer-20884::NULL
console-consumer-60618::GroupMetadata(groupId=console-consumer-60618, generation=1, protocolType=Some(consumer), currentState=Stable, members=Map(consumer-1-da910be4-7520-4187-bb58-f1c060c48749 -> MemberMetadata(memberId=consumer-1-da910be4-7520-4187-bb58-f1c060c48749, groupInstanceId=Some(null), clientId=consumer-1, clientHost=/127.0.0.1, sessionTimeoutMs=10000, rebalanceTimeoutMs=300000, supportedProtocols=List(range), )))
console-consumer-60618::GroupMetadata(groupId=console-consumer-60618, generation=2, protocolType=Some(consumer), currentState=Empty, members=Map())
console-consumer-46196::GroupMetadata(groupId=console-consumer-46196, generation=1, protocolType=Some(consumer), currentState=Stable, members=Map(consumer-1-4091fa6c-3326-4e2c-b860-fe94350c9433 -> MemberMetadata(memberId=consumer-1-4091fa6c-3326-4e2c-b860-fe94350c9433, groupInstanceId=None, clientId=consumer-1, clientHost=/192.168.11.195, sessionTimeoutMs=10000, rebalanceTimeoutMs=300000, supportedProtocols=List(range), )))
console-consumer-46196::GroupMetadata(groupId=console-consumer-46196, generation=2, protocolType=Some(consumer), currentState=Empty, members=Map())
console-consumer-46196::NULL
console-consumer-66385::GroupMetadata(groupId=console-consumer-66385, generation=2, protocolType=Some(consumer), currentState=Empty, members=Map())
console-consumer-41615::NULL
stock::NULL
zhongmingmao::GroupMetadata(groupId=zhongmingmao, generation=11, protocolType=Some(consumer), currentState=Empty, members=Map())
console-consumer-82389::GroupMetadata(groupId=console-consumer-82389, generation=1, protocolType=Some(consumer), currentState=Stable, members=Map(consumer-1-354b4b29-df13-456c-80c5-6701e8900828 -> MemberMetadata(memberId=consumer-1-354b4b29-df13-456c-80c5-6701e8900828, groupInstanceId=Some(null), clientId=consumer-1, clientHost=/192.168.2.1, sessionTimeoutMs=10000, rebalanceTimeoutMs=300000, supportedProtocols=List(range), )))
console-consumer-82389::GroupMetadata(groupId=console-consumer-82389, generation=2, protocolType=Some(consumer), currentState=Empty, members=Map())
console-consumer-82389::NULL
console-consumer-37711::GroupMetadata(groupId=console-consumer-37711, generation=1, protocolType=Some(consumer), currentState=Stable, members=Map(consumer-1-b8bc1ccd-5388-4f07-bfcf-0a416c143572 -> MemberMetadata(memberId=consumer-1-b8bc1ccd-5388-4f07-bfcf-0a416c143572, groupInstanceId=Some(null), clientId=consumer-1, clientHost=/127.0.0.1, sessionTimeoutMs=10000, rebalanceTimeoutMs=300000, supportedProtocols=List(range), )))
console-consumer-37711::GroupMetadata(groupId=console-consumer-37711, generation=2, protocolType=Some(consumer), currentState=Empty, members=Map())
console-consumer-29492::GroupMetadata(groupId=console-consumer-29492, generation=2, protocolType=Some(consumer), currentState=Empty, members=Map())
console-consumer-88677::GroupMetadata(groupId=console-consumer-88677, generation=2, protocolType=Some(consumer), currentState=Empty, members=Map())
console-consumer-3420::GroupMetadata(groupId=console-consumer-3420, generation=1, protocolType=Some(consumer), currentState=Stable, members=Map(consumer-1-7e402ca2-5b9f-49a0-83e3-262443f148ca -> MemberMetadata(memberId=consumer-1-7e402ca2-5b9f-49a0-83e3-262443f148ca, groupInstanceId=Some(null), clientId=consumer-1, clientHost=/127.0.0.1, sessionTimeoutMs=10000, rebalanceTimeoutMs=300000, supportedProtocols=List(range), )))
console-consumer-3420::GroupMetadata(groupId=console-consumer-3420, generation=2, protocolType=Some(consumer), currentState=Empty, members=Map())
bijection::GroupMetadata(groupId=bijection, generation=2, protocolType=Some(consumer), currentState=Empty, members=Map())
console-consumer-37719::NULL
console-consumer-56242::NULL
console-consumer-51162::GroupMetadata(groupId=console-consumer-51162, generation=1, protocolType=Some(consumer), currentState=Stable, members=Map(consumer-1-0ae0c268-a22a-425b-be55-30393a02c0ad -> MemberMetadata(memberId=consumer-1-0ae0c268-a22a-425b-be55-30393a02c0ad, groupInstanceId=Some(null), clientId=consumer-1, clientHost=/192.168.2.1, sessionTimeoutMs=10000, rebalanceTimeoutMs=300000, supportedProtocols=List(range), )))
console-consumer-51162::GroupMetadata(groupId=console-consumer-51162, generation=2, protocolType=Some(consumer), currentState=Empty, members=Map())
console-consumer-51162::NULL
console-consumer-60394::GroupMetadata(groupId=console-consumer-60394, generation=2, protocolType=Some(consumer), currentState=Empty, members=Map())
console-consumer-40652::NULL
console-consumer-29492::NULL
console-consumer-88677::NULL
bijection::NULL
console-consumer-85955::GroupMetadata(groupId=console-consumer-85955, generation=1, protocolType=Some(consumer), currentState=Stable, members=Map(consumer-1-a127b884-0a3a-4fe0-a1ea-8bbee57c668a -> MemberMetadata(memberId=consumer-1-a127b884-0a3a-4fe0-a1ea-8bbee57c668a, groupInstanceId=Some(null), clientId=consumer-1, clientHost=/127.0.0.1, sessionTimeoutMs=10000, rebalanceTimeoutMs=300000, supportedProtocols=List(range), )))
console-consumer-85955::GroupMetadata(groupId=console-consumer-85955, generation=2, protocolType=Some(consumer), currentState=Empty, members=Map())
console-consumer-85955::NULL
console-consumer-54404::GroupMetadata(groupId=console-consumer-54404, generation=1, protocolType=Some(consumer), currentState=Stable, members=Map(consumer-1-5edfac05-7f42-4e4c-b906-b8e26149d527 -> MemberMetadata(memberId=consumer-1-5edfac05-7f42-4e4c-b906-b8e26149d527, groupInstanceId=Some(null), clientId=consumer-1, clientHost=/127.0.0.1, sessionTimeoutMs=10000, rebalanceTimeoutMs=300000, supportedProtocols=List(range), )))
console-consumer-54404::GroupMetadata(groupId=console-consumer-54404, generation=2, protocolType=Some(consumer), currentState=Empty, members=Map())
console-consumer-6483::GroupMetadata(groupId=console-consumer-6483, generation=1, protocolType=Some(consumer), currentState=Stable, members=Map(consumer-1-bfa8f79d-03db-43c5-b9bb-a168849e162e -> MemberMetadata(memberId=consumer-1-bfa8f79d-03db-43c5-b9bb-a168849e162e, groupInstanceId=Some(null), clientId=consumer-1, clientHost=/127.0.0.1, sessionTimeoutMs=10000, rebalanceTimeoutMs=300000, supportedProtocols=List(range), )))
console-consumer-6483::GroupMetadata(groupId=console-consumer-6483, generation=2, protocolType=Some(consumer), currentState=Empty, members=Map())
console-consumer-6483::NULL
console-consumer-66385::NULL
console-consumer-60394::NULL
zhongmingmao::NULL
console-consumer-49544::GroupMetadata(groupId=console-consumer-49544, generation=1, protocolType=Some(consumer), currentState=Stable, members=Map(consumer-1-5629e772-0ef1-4248-b9ed-42f997f54a4a -> MemberMetadata(memberId=consumer-1-5629e772-0ef1-4248-b9ed-42f997f54a4a, groupInstanceId=Some(null), clientId=consumer-1, clientHost=/127.0.0.1, sessionTimeoutMs=10000, rebalanceTimeoutMs=300000, supportedProtocols=List(range), )))
```