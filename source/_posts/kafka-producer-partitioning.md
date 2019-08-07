---
title: Kafka -- 生产者消息分区机制
mathjax: false
date: 2019-07-24 13:20:21
categories:
    - Middleware
    - MQ
    - Kafka
tags:
    - Middleware
    - MQ
    - Kafka
    - Stream
    - Producer
    - Load Balance
---

## 分区概念
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-producer-partitioning-topic.png" width=800/>

<!-- more -->

1. 主题是承载真实数据的**逻辑容器**，主题之下分为若干个分区，Kafka的消息组织方式为三级结构：**主题、分区、消息**
2. 主题下的每条消息只会保存在某个分区中，而不会在多个分区中被保存多份
3. 分区的作用是提供**负载均衡**的能力，实现系统的**高伸缩性**
    - 不同的分区能够被放置在不同的机器节点上，而数据读写操作的粒度也是分区
    - 每个机器节点都能独立地执行各自分区的读写请求处理，还可以通过添加新的机器节点来增加整体系统的吞吐量
4. 分区在不同的分布式系统有不同的叫法，但分区的思想都是类似的
    - Kafka -- **Partition**
    - MongoDB、Elasticsearch -- **Shard**
    - HBase -- **Region**

## 分区策略
1. 分区策略：**决定生产者将消息发送到哪个分区的算法**，Kafka提供了默认的分区策略，也支持自定义的分区策略
2. 自定义的分区策略，需要**显式**地配置生产者端的参数**partitioner.class**
3. 实现接口：org.apache.kafka.clients.producer.Partitioner
    - 消息数据：topic、key、keyBytes、value、valueBytes
    - 集群数据：cluster

```java
public interface Partitioner extends Configurable, Closeable {

    /**
     * Compute the partition for the given record.
     *
     * @param topic The topic name
     * @param key The key to partition on (or null if no key)
     * @param keyBytes The serialized key to partition on( or null if no key)
     * @param value The value to partition on or null
     * @param valueBytes The serialized value to partition on or null
     * @param cluster The current cluster metadata
     */
    public int partition(String topic, Object key, byte[] keyBytes, Object value, byte[] valueBytes, Cluster cluster);

    /**
     * This is called when partitioner is closed.
     */
    public void close();

}
```

### 轮询策略
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-producer-partitioning-strategy-round-robin.png" width=800/>

1. 轮询策略是Kafka Java生产者的**默认分区策略**
2. 轮询策略的**负载均衡表现非常优秀**，总能保证消息**最大限度**地被平均分配到所有分区上，默认情况下它是最合理的分区策略

### 随机策略
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-producer-partitioning-strategy-randomness.png" width=800/>

从实际表现来看，随机策略要逊于轮询策略，**如果追求数据的均匀分布，建议使用轮询策略**
```java
@Override
public int partition(String topic, Object key, byte[] keyBytes, Object value, byte[] valueBytes, Cluster cluster) {
    // 获取Topic的分区数量
    Integer partitionCount = cluster.partitionCountForTopic(topic);
    return ThreadLocalRandom.current().nextInt(partitionCount);
}
```

### 按消息键保序策略
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-producer-partitioning-strategy-key-ordering.png" width=800/>

1. Kafka允许为每条消息定义**消息键**，简称为Key
2. Key可以是一个有明确业务含义的字符串：客户代码、部门编号、业务ID、用来表征消息的元数据等
3. 一旦消息被定义了Key，可以保证**同一个Key的所有消息都进入到相同的分区里**
    - 由于每个分区下的消息处理都是**顺序**的，所以这个策略被称为**按消息键保序策略**
4. Kafka Java生产者的默认分区策略
    - 如果**指定了Key**，采用**按消息键保序策略**
    - 如果**没有指定Key**，采用**轮询策略**

```java
@Override
public int partition(String topic, Object key, byte[] keyBytes, Object value, byte[] valueBytes, Cluster cluster) {
    // 获取Topic的分区数量
    Integer partitionCount = cluster.partitionCountForTopic(topic);
    return Math.abs(key.hashCode() % partitionCount);
}
```

### 基于地理位置的分区策略
```java
@Override
public int partition(String topic, Object key, byte[] keyBytes, Object value, byte[] valueBytes, Cluster cluster) {
    List<PartitionInfo> partitionInfos = cluster.partitionsForTopic(topic);
    return partitionInfos.stream()
            .filter(partitionInfo -> isSouth(partitionInfo.leader().host()))
            .map(PartitionInfo::partition)
            .findAny().get();
}
```
