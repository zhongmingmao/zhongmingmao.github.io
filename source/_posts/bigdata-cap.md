---
title: Big Data - CAP
mathjax: true
date: 2024-09-14 00:06:25
cover: https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/bigdata-cap.png
categories:
  - Big Data
tags:
  - Big Data
---

# CAP

> 在任意的分布式系统中，最多只能同时满足两个：**Consistency**、**Availability**、**Partition-tolerance**

![](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/bigdata-cap.png)

<!-- more -->

# Consistency

![image-20241116174059552](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241116174059552.png)

1. Consistency 指的是 **Linearizability Consistency**
2. 在 Linearizability Consistency 的保证下，所有分布式环境下的操作都像在**单机**上一样
3. **所有节点**的状态**一直**是**一致**的

# Availability

![image-20241116175420454](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241116175420454.png)

1. 在分布式系统中，任意**非故障**的节点都必须对客户的请求产生响应
2. 当系统满足 Availability 时，除非**所有节点全部崩溃**，不然都能返回消息 - **Netflix Eureka**

# Partition Tolerance

![image-20241116175709307](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241116175709307.png)

1. 在一个分布式系统中，如果出现了一些故障，可能会使得**部分节点之间无法连通**
2. 由于故障节点无法连通，造成整个网络会被分成**几块区域**
   - 从而使**数据分散**在这些**无法连通**的区域中的情况，从而发生了**分区错误**
3. 如上图，如果需要的数据只在 Sever A 中，当出现**分区错误**时，无法获取到数据
   - 如果能**分区容错**，既即便出现这种情况，**分布式系统**也能**容忍**，并能**返回消息**
4. Partition-tolerance
   - 分布式系统允许**网络丢失**从一个节点发送到另一个节点的**任意多条消息**
5. 在现代网络通信中，**节点故障**或者**网络丢包**会经常发生
   - 如果没有 Partition-tolerance，即分布式系统**不允许**这些**节点间的通信**出现**任何错误**
   - 如果不接受 Partition-tolerance，很多系统都**无法正常工作**了

> **Netflix Eureka** 为 **AP** 系统，并支持**最终一致性**，并非论文中的**线性一致性**

# AP vs CP

> 在大部分情况下，分布式系统的设计都会保留 **P**，而在 **C** 和 **A** 中二选一

| Type   | Distributed system                                 |
| ------ | -------------------------------------------------- |
| CP     | Google BigTable、Hbase、MongoDB、Redis、MemCacheDB |
| **AP** | Amazon Dynamo、Apache Cassandra、Netflix Eureka    |
| CA     | Apache **Kafka**                                   |

# Kafka Replication

> CA

1. Kafka Replication 通过将数据**复制**到不同的节点上，从而增强了数据在系统中的持久性（**Durability**）和可用性（**Availability**）
2. 在 Kafka Replication 的系统设计中，所有的**数据日志存储**是在**同一个数据中心**中 - 在同一个数据中心出现**网络分区**的概率非常低

> 架构设计

1. 先通过 **Zookeeper** 选举出一个 **Leader**
2. 该 Leader 负责维护一组被称为**同步数据副本**（In-sync-replica）的节点，所有的**数据写入**都必须在这个 **Leader** 中记录 - **ZAB** 协议

> 三台服务 - Leader + Replication1 + Replication2

![image-20241116182320378](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241116182320378.png)

> 出现网络分区 - Leader 与 Replication1 无法通讯

![image-20241116182506593](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241116182506593.png)

> 所有副本都无法通讯，Apache Kafka 允许只有 **Leader** 在工作

![image-20241116182634959](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241116182634959.png)

> 如果 Leader 挂了，则 Zookeeper 会重新选举

