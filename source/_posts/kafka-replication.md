---
title: Kafka -- 副本
mathjax: false
date: 2019-09-14 18:33:30
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

## 副本机制的优点
1. 提供**数据冗余**
    - 即使系统部分组件失效，系统依然能够继续运转，增加了**整体可用性**和**数据持久性**
2. 提供**高伸缩性**
    - 支持**横向扩展**，能够通过增加机器的方式来提升读性能，进而提高**读操作吞吐量**
3. 改善**数据局部性**
    - 允许将数据放入与用户**地理位置相近**的地方，从而**降低系统延时**
4. **Kafka**只能享受副本机制提供**数据冗余**实现的**高可用性**和**高持久性**

<!-- more -->

## 副本定义
1. Kafka主题划分为若干个分区，副本的概念上是在**分区层级**下定义的，**每个分区配置若干个副本**
2. 副本：本质上是一个_**只能追加写消息的提交日志**_
    - **同一个分区下的所有副本保存有相同的消息序列**，这些副本**分散保存在不同的Broker**上，提高了**数据可用性**
3. 实际生产环境中，每台Broker都可能保存有各个主题不同分区的不同副本

<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-replication-def.png" width=600/>

## 副本角色
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-replication-role.png" width=800/>

1. Kafka采用基于领导者（**Leader-based**）的副本机制
    - 副本分为两类：**领导者副本**（Leader Replica）和**追随者副本**（Follower Replica）
        - 每个分区在**创建**时都要**选举**一个副本，称为领导者副本，其余的副本自动称为追随者副本
    - **追随者副本是不对外提供服务**的，**所有的读写请求**都必须发往**领导者副本**所在的Broker，由该Broker负责处理
        - 追随者副本的任务：从领导者副本**异步拉取消息**，并写入到自己的**提交日志**中，从而实现与领导者副本的**同步**
        - 所以Kafka无法提供**读操作横向扩展**和**改善局部性**
    - 当领导者副本所在的Broker挂了，Kafka依托于**ZK**提供的**监控功能**能够**实时感知**，并立即开启新一轮的领导者选举
        - 从追随者副本中选择一个作为新的领导者，**老Leader**副本重启后，也只能作为**追随者副本**加入到集群中
2. Leader-based副本机制的好处
    - 方便实现**`Read-your-writes`**
        - Read-your-writes：使用生产者API向Kafka成功写入消息后，马上使用消费者API去读取刚才生产的消息
        - 如果允许追随者副本对外提供服务，由于副本同步是**异步**的，客户端可能看不到最新写入的消息
    - 方便实现**单调读**`Monotonic Reads`
        - 单调读：对于一个消费者用户而言，在**多次消费**消息时，不会看到某条消息一会存在一会不存在

## **ISR**(In-Sync Replicas)
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-replication-isr.png" width=600/>

1. ISR中的副本都是**与Leader同步的副本**，不在ISR中的追随者副本就被认为与Leader不同步
2. **Leader副本天然在ISR中**，某些特殊情况下，ISR只有Leader副本
3. 上图中的2个Follower都有可能与Leader不同步，也都有可能与Leader同步
    - 参照标准是Broker端参数**`replica.lag.time.max.ms`**，而不是相差的消息数
    - `replica.lag.time.max.ms`：Follower副本能够落后Leader副本的最长时间间隔，默认**10秒**
4. Follower副本同步的速度**持续慢于**Leader副本的消息写入速度
    - 在`replica.lag.time.max.ms`后，Follower副本就会被认为与Leader副本不同步
    - 此时，Kafka会**自动收缩ISR**，将该Follower副本踢出ISR
    - 如果该Follower副本后面慢慢追上Leader的进度，它能够**重新**被加回ISR，因此ISR是一个**动态调整**的集合

## Unclean Leader Election
1. 如果**ISR为空**，说明Leader副本也挂了，Kafka需要重新选举一个新的Leader
2. Kafka把**所有不在ISR中的存活副本**都称为**非同步副本**
3. 通常来说，**非同步副本落后Leader太多**，如果选择非同步副本作为新Leader，可能会出现**数据丢失**
4. 选举**非同步副本**的过程称为**Unclean Leader Election**，Broker端参数`unclean.leader.election.enable`
5. **A Or C**
    - **开启**Unclean Leader Election可能会造成**数据丢失**（C），但提高了**可用性**（A）
    - **关闭**Unclean Leader Election维护了**数据一致性**（C），但牺牲了**可用性**（A）
        - 强烈**推荐**关闭Unclean Leader Election

## 参考资料
[Kafka核心技术与实战](https://time.geekbang.org/column/intro/100029201)