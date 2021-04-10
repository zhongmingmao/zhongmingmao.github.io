---
title: Kafka -- 消费者组
mathjax: false
date: 2019-08-22 17:14:58
categories:
    - Middleware
    - MQ
    - Kafka
tags:
    - Middleware
    - MQ
    - Kafka
    - Stream
    - Consumer Group
    - Rebalance
---

## 消费者组
1. 消费者组（Consumer Group）是Kafka提供的**可扩展**且具有**容错性**的**消费者机制**
2. 一个消费者组内可以有多个消费者或消费者实例（进程/线程），它们共享一个**Group ID**（字符串）
    - 组内的**所有消费者**协调在一起来消费订阅主题的**所有分区**
    - 每个分区只能由同一个消费者组内的一个Consumer实例来消费，Consumer实例对分区有**所有权**

<!-- more -->

## 消息引擎模型
1. 两种模型：**点对点模型**（消息队列）、**发布订阅模型**
    - 点对点模型（传统的消息队列模型）
        - 缺陷/特性：消息一旦被消费、就会从队列中被删除，而且只能被下游的一个Consumer消费
        - **伸缩性很差**，下游的多个Consumer需要**抢占**共享消息队列中的消息
    - 发布订阅模型
        - 缺陷：**伸缩性不高**，每个订阅者都必须订阅主题的所有分区（**全量订阅**）
2. **Consumer Group**
    - 当Consumer Group订阅了多个主题之后
    - 组内的每个Consumer实例不要求一定要订阅主题的所有分区，只会消费**部分分区**的消息
    - Consumer Group之间**彼此独立**，互不影响，它们能够订阅相同主题而互不干涉
    - Kafka使用Consumer Group机制实现了传统消息引擎系统的两种模型
        - 如果所有Consumer实例都属于**同一个**Consumer Group，实现的是**点对点**模型
        - 如果所有Consumer实例都属于**不同**的Consumer Group，实现的是**发布订阅**模型

## Consumer实例数量
1. 理想情况下，_**Consumer实例的数量 == 该Consumer Group订阅主题的分区总数**_
2. 假设一个Consumer Group订阅了3个主题，分别为A（1分区）、B（2分区）、C（3分区），应该设置6个Consumer实例
    - 如果只有3个实例，每个实例大约消费2个分区
    - 如果有8个实例，有两个实例**不会被分配到任何分区**，永远处于**空闲状态**，**浪费资源**

## 位移管理
1. 位移可类比为`Map<TopicPartition, Long>`，TopicPartition代表一个分区，Long代表位移的类型
2. 老版本的Consumer Group把**位移**保存在**Zookeeper**中
    - Apache Zookeeper是一个**分布式的协调服务框架**，Kafka**重度依赖**ZK实现各种各样的协调管理
    - 好处：减少Kafka Broker端的状态保存开销，**节点无状态**，可以自由扩缩容，实现**超强的伸缩性**
    - 但ZK这类框架并**不适合进行频繁的写更新**，而Consumer Group的位移更新却是一个非常频繁的操作
        - _**大吞吐量的写操作会极大地拖慢ZK集群的性能**_
    - 因此，将Consumer位移保存在ZK中是不合适的做法
3. 在新版本的Consumer Group中，重新设计了Consumer Group的**位移管理方式**（内部主题：**`__consumer_offsets`**）

## 重平衡
1. Rebalance本质上是一种**协议**，规定了一个Consumer Group下所有的Consumer如何达成一致来**分配分区**
2. Rebalance的触发条件
    - 组内**消费者数**发生变更
    - 订阅**主题数**发生变更
        - Consumer Group可以使用**正则表达式**的方式订阅主题
    - 订阅主题的**分区数**发生变更
        - Kafka当前**只允许增加**一个主题的分区数
3. Rebalance发生时，Group下**所有的Consumer实例**都会协调在一起共同参与
    - Kafka尽量保证提供**最公平**的分配策略，即每个Consumer实例能够得到较为平均的分区数
4. 缺陷
    - Rebalance过程**对Consumer Group消费过程有极大的影响**
        - 在Rebalance过程中，所有Consumer实例都会**停止消费**，等待Rebalance完成
    - **所有Consumer实例共同参与，全部重新分配所有分区**
        - 更高效的分配方案：**尽量少改动**，这样可以**复用**已经建立的**TCP连接**
    - Rebalance的过程可能会**持续很久**

## 参考资料
[Kafka核心技术与实战](https://time.geekbang.org/column/intro/100029201)