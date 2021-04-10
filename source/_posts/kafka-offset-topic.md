---
title: Kafka -- 位移主题
mathjax: false
date: 2019-08-26 17:41:58
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

## ZooKeeper
1. 老版本Consumer的位移管理依托于**Apache ZooKeeper**，自动或手动地将位移数据提交到ZK中保存
2. 当Consumer重启后，能自动从ZK中读取位移数据，从而在上次消费截止的地方继续消费
3. 这种设计使得Kafka Broker不需要保存位移数据，减少了Broker端需要持有的**状态空间**，有利于实现**高伸缩性**
4. 但ZK并**不适用于高频的写操作**

<!-- more -->

## 位移主题
1. 将Consumer的位移数据作为**普通的Kafka消息**，提交到`__consumer_offsets`（保存Consumer的位移信息）
    - 提交过程需要实现**高持久性**，并需要支持**高频的写操作**
2. 位移主题是**普通的Kafka主题**，同时也是一个**内部主题**，交由Kafka管理即可
3. 位移主题的**消息格式由Kafka定义**，用户不能修改
    - 因此不能随意向位移主题写消息，一旦写入的消息不能满足格式，那Kafka内部无法成功解析，会造成**Broker崩溃**
    - Kafka Consumer有**API**来提交位移（即向位移主题写消息）

### 消息格式
1. 常用格式：**Key-Value**
    - Key为**消息键值**，Value为**消息体**，在Kafka中都是**字节数组**
    - Key
        - **`<Group ID, Topic, Partition>`**
    - Value
        - **Offset** + Other MetaData（时间戳等，这是为了执行各种各样的后续操作，例如删除过去位移信息等）
2. 用于**保存Consumer Group信息**的消息
    - 用来**注册**Consumer Group
3. 用于**删除Group过期位移**甚至**删除Group**的消息
    - 专属名词：**tombstone消息**，即**墓碑消息**，也称**delete mark**，主要特点是**消息体为null**
    - 一旦某个Consumer Group下**所有的Consumer实例都停止**，而且它们的**位移数据已被删除**
        - Kafka会向**位移主题的对应分区**写入tombstone消息，表明要**彻底删除**这个Consumer Group

### 创建位移主题
1. Kafka集群中的**第一个Consumer**程序启动时，会自动创建位移主题
    - Broker端参数：**offsets.topic.num.partitions=50**，Kafka会自动创建**50分区**的位移主题
    - Broker端参数：**offsets.topic.replication.factor=3**，Kafka会自动创建**3副本**的位移主题
2. 手动创建位移主题
    - 在Kafka集群尚未启动任何Consumer之前，使用Kafka API来创建
3. 推荐：采用Kafka的**自动创建**

### 提交位移
1. 自动提交位移
    - **enable.auto.commit=true**
    - Consumer在后台默默地**定期提交位移**，提交间隔由参数控制`auto.commit.interval.ms`
    - 缺点
        - 完全无法把控Consumer端的位移管理
            - 很多与Kafka集成的大数据框架都**禁用自动提交位移**的，如Spark、Flink等
        - 只要Consumer一直启动着，就会**无限期**地向位移主题写入消息
            - 假设Consumer当前消费了某个主题的最新一条消息，位移为100，之后该主题就没有产生任何新消息
            - 但由于设置了自动提交位移，位移主题会不停地写入位移=100，这就要求位移主题有特定的**消息删除策略**
2. 手动提交位移
    - **enable.auto.commit=false**
    - 需要应用程序手动提交位移

### 删除过期消息
1. 策略：**Compaction**（整理）
2. Kafka使用**Compact策略**来删除位移主题中的**过期消息**，避免该主题**无限期膨胀**
3. 过期消息：对于**同一个Key**的两条消息M1和M2，如果M1的发送时间早于M2，那么M1就是过期消息
4. Compact过程：扫描日志的**所有消息**，剔除过期的消息，然后把剩下的消息整理在一起
5. Kafka提供了**专门的后台线程**（**Log Cleaner**）来**定期巡检**待Compact的主题
    - 如果位移主题**无限期膨胀**，占用过多的磁盘空间，检查下Log Cleaner线程的状态

<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-offset-topic-compact.jpeg" width=800/>

## 参考资料
[Kafka核心技术与实战](https://time.geekbang.org/column/intro/100029201)
