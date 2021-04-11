---
title: 大数据 -- CAP定理
mathjax: false
date: 2019-07-02 13:03:20
categories:
    - Big Data
tags:
    - Big Data
    - CAP
---

## CAP定理
1. 在任意的分布式系统中，一致性、可用性、分区容错性最多只能同时存在**两个**属性
2. 一致性（Consistency）、可用性（Availability）、分区容错性（Partition-tolerance）

<!-- more -->

### C：一致性
1. 这里的一致性指的是**线性一致性**（Linearizability Consistency）
2. 在线性一致性的保证下，所有分布式环境的操作都像跟在**单机**上操作
3. 下图中，Server A、B、C的状态**一直是一致**的
    - 在同一个分布式系统上完成操作A和操作B
    - 操作A作用在系统上的时候，系统状态为状态A，操作B作用在系统上的时候，系统状态为状态B
    - 操作A在操作B之前发生，并且操作A成功了，那么系统状态B**必须**比系统状态A更新

<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-cap-consistency.jpg" width=600/>

### A：可用性
1. 可用性：在分布式系统中，任意**非故障**的服务器都必须响应客户的请求
2. 当系统满足可用性时，不管出现什么状况（除非所有服务器全部崩溃），都能返回消息

<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-cap-availability.jpg" width=600/>

### P：分区容错性
1. 在一个分布式系统里，如果出现故障，可能会导致部分节点之间无法连通，造成整个网络被分成几块区域，发生了分区错误
2. 下图中，如果需要的数据只在Server A中保存，当系统出现分区错误，无法直接连接Server A，无法获取数据
    - 分区容错：即使出现这样的错误，系统也能容忍，也必须能够返回消息
3. 分区容错性：**系统允许网络丢失从一个节点发送到另一个节点的任意多条消息**
4. P本质：_**发生网络分区后，无论后面网络分区是否会恢复，分离出来的子系统都可以正常运行**_
5. 在现代网络通信中，节点出现故障或者网络出现丢包的情况**时常发生**
    - 如果没有分区容错性，也就是系统不允许这些节点之间的通讯出现任何错误，那很多系统就不能再继续工作了
    - 因此在大部分情况，系统设计会_**保留P，在C和A之间二选一**_

<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-cap-partition-tolerance.jpg" width=600/>

### CP + AP + CA
1. CP系统：Google BigTable、HBase、MongoDB、Redis、MemCacheDB，这些**存储**架构都放弃了高可用性
2. AP系统：Amazon Dynamo及其衍生存储系统Apache Cassandra
3. CA系统：**Kafka Replication**

## Kafka Replication
1. Kafka在0.8版本，引入了Replication的概念
    - 通过将数据复制到不同的节点上，从而增强了数据在系统中的**持久性**（Durability）和**可用性**（Availability）
2. 在Kafka Replication的系统设计中，所有的数据日志存储是设计在**同一个数据中心**里面的，**出现网络分区的可能性很小**
3. P属性：当任意节点断开后，系统还可以正常的运行
    - 对于整个Kafka系统来说，P属性是要保留的
    - 对于Kafka Replication来说，如果**领导者**挂了，再多的副本都无法运行了，所以_**Kafka Replication没有保留P属性**_

### 具体架构
1. 在Kafka数据副本（Data Replication）的设计中，先通过Zookeeper选举出一个**领导者节点**（Leader）
2. 领导者节点负责维护一组被称作**同步数据副本**（In-Sync-Replica）的节点，所有的数据写入都必须在这个领导者节点中记录

#### 场景1
1. 有三台服务器，一台被选为作为领导者节点，另外两台服务器用来保存数据副本，分别是Replication1和Replication2
2. 用户想写入一个数据D
    - 用户发请求到领导者节点想写入数据D
    - 领导者节点收到请求后先在**本地**保存，然后也同时发消息通知Replication1和Replication2
    - Replication1和Replication2收到消息后也进行保存并回复领导者节点写入成功
    - 领导者节点记录Replication1和Replication2都是**健康**的，并回复用户写入成功
3. 往后用户想查询写入的数据，无论是领导者节点还是Replication1和Replication2都可以返回正确同步的结果

<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-cap-kafka-case-1.jpg" width=600/>

#### 场景2
1. 假设出现了**网络分区**，领导者节点和Replication1无法通信
2. 用户想写入一个数据D
    - 用户发请求到领导者节点想写入数据D
    - 领导者节点收到请求后先在**本地**保存，然后也同时发消息通知Replication1和Replication2
    - 只有Replication2收到消息，进行保存并回复领导者节点写入成功
    - 领导者节点记录Replication2是**健康**的，并回复用户写入成功
3. 红色的部分是领导者节点的**本地日志**，记录着**哪些数据同步副本是健康**的

<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-cap-kafka-case-2.jpg" width=600/>

#### 场景3
1. 领导者节点和Replication1/2都无法通信，**Apache Kafka允许系统只有一个节点工作**，即领导者节点
2. 用户想写入一个数据D
    - 用户发请求到领导者节点想写入数据D
    - 领导者节点收到请求后先在**本地**保存，然后也同时发消息通知Replication1和Replication2
    - 没有任何副本回复领导者节点写入成功
    - 领导者节点记录没有副本是**健康**的，并回复用户写入成功
3. 在最坏情况下，领导者节点也挂了，Zookeeper会重新去寻找健康的服务器节点来当选新的领导者节点

<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-cap-kafka-case-3.jpg" width=600/>
