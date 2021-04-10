---
title: Kafka -- 避免重平衡
mathjax: false
date: 2019-09-01 14:18:18
categories:
    - Middleware
    - MQ
    - Kafka
tags:
    - Middleware
    - MQ
    - Kafka
    - Stream
    - Rebalance
---

## 概念
1. Rebalance是让Consumer Group下所有的Consumer实例**就如何消费订阅主题的所有分区达成共识**的过程
2. 在Rebalance过程中，**所有Consumer实例共同参与**，在**协调者**组件的帮助下，完成**订阅主题分区的分配**
3. 整个Rebalance过程中，所有Consumer实例都**不能消费任何消息**，因此对Consumer的**TPS**影响很大

<!-- more -->

## 协调者
1. 协调者，即**Coordinator**，负责为Consumer Group执行**Rebalance**以及提供**位移管理**和**组成员管理**等
2. Consumer端应用程序在提交位移时，其实是向**Coordinator所在的Broker提交位移**
3. Consumer应用启动时，也是向Coordinator所在的Broker发送各种请求
    - 然后由Coordinator负责执行**消费组的注册**、**成员管理记录**等**元数据管理**操作
4. 所有Broker在启动时，都会创建和开启相应的Coordinator组件，**所有Broker都有各自的Coordinator组件**
5. 内部位移主题`__consumer_offsets`记录了**为Consumer Group服务的Coordinator在哪一台Broker上**
6. 为某个Consumer Group确定Coordinator所在的Broker，有两个步骤
    - 确定由**位移主题的哪个分区**来保存该Consumer Group数据
        - `partitionId = Math.abs(groupId.hashCode() % offsetsTopicPartitionCount`
        - offsetsTopicPartitionCount默认为**50**
    - 找出该分区**Leader**副本所在的Broker，该Broker即为对应的Coordinator

## 弊端
1. Rebalance**影响Consumer端TPS**
2. Rebalance**很慢**
3. Rebalance**效率不高**
    - 每次Rebalance，Consumer Group下**所有成员**都需要参与，而且**不考虑局部性原理**，_**之前的分配方案都不会被保留**_
    - 为了解决这个问题，社区于0.11.0.0版本推出**StickyAssignor**，即**粘性**的分区分配策略
        - 粘性指的是每次Rebalance，都**尽可能地保留之前的分配方案**，尽量实现分区分配的**最小改动**
        - 但该策略存在一些**Bug**，而且需要升级到0.11.0.0才能使用，实际生产环境中**用得不多**
4. 影响Consumer端TPS + 慢属于**无解**，因此尽量_**减少不必要的Rebalance**_

## 发生时机
1. **组成员数量**发生变化 -- 最常见
    - Consumer实例增加：一般是基于**增加TPS**或者**提高伸缩性**的需要，属于**计划内**的操作，**不属于不必要的Rebalance**
    - Consumer实例**减少**：在某些情况下Consumer实例会被Coordinator**错误**地认为已停止而被踢出Consumer Group
2. **订阅主题数量**发生变化
    - 一般是**运维主动操作**，很难避免
3. **订阅主题的分区数量**发生变化
    - 一般是**运维主动操作**，很难避免

## 实例减少

### Consumer端参数
1. 当Consumer Group完成Rebalance后，每个Consumer实例都会**定期**地向**Coordinator**发送**心跳**
2. 如果某个Consumer实例不能及时地发送心跳
    - Coordinator会认为该Consumer已死，并将其从Consumer Group中移除，开启新一轮的Rebalance
3. Consumer端有一个参数`session.timeout.ms`，默认值为**10秒**
    - 如果Coordinator在10秒内没有收到Consumer Group下某个Consumer实例的心跳，就会认为该Consumer已死
4. Consumer端还有另一个参数`heartbeat.interval.ms`，默认值为**3秒**
    - 设置得越小，Consumer实例发送心跳的频率就会越高，会额外消耗**带宽资源**，但能更快地知道是否开启Rebalance
    - Coordinator通过将**REBALANCE_NEEDED标志**封装进**心跳响应**中，来通知Consumer实例开启Rebalance
5. Consumer端还有另一个参数`max.poll.interval.ms`，默认值为**5分钟**
    - 该参数用于控制Consumer**实际消费能力**对Rebalance的影响，限定了Consumer端两次调用**poll**方法的最大时间间隔
    - Consumer如果在5分钟内**无法消费完**poll方法返回的消息，就会**主动发起离开组的请求**，开启新一轮的Rebalance

### 非必要的Rebalance
1. Consumer**未及时发送心跳**，导致被踢出Consumer Group而引发的Rebalance
    - 生产配置：`session.timeout.ms=6000` + `heartbeat.interval.ms=2000`
        - `session.timeout.ms=6000`：为了让Coordinator能够更快地定位已经挂掉的Consumer
    - `session.timeout.ms > 3 * heartbeat.interval.ms`
2. Consumer**消费时间过长**，主动发起离开组的请求而引发的Rebalance
    - 如果消费逻辑很重（如DB操作），可以将`max.poll.interval.ms`设置得大一点
3. 关注Consumer端的**GC**表现，频繁的**Full GC**会引起**非预期的Rebalance**

## 参考资料
[Kafka核心技术与实战](https://time.geekbang.org/column/intro/100029201)