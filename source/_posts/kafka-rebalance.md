---
title: Kafka -- 重平衡
mathjax: false
date: 2019-09-16 08:59:36
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

## 触发重平衡
1. **组成员数量**发生变化 -- **最常见**
2. **订阅主题数量**发生变化
2. **订阅主题的分区数**发生变化

<!-- more -->

## 通知
1. 重平衡过程是通过**消费者的心跳线程**通知到其它消费者实例的
2. Kafka Java消费者需要**定期**地发送心跳请求到Broker端的协调者，表明它还活着
3. 在Kafka **0.10.1.0**之前，**发送心跳请求**是在消费者**主线程**完成的，即调用`poll`方法的那个线程
    - 弊端
        - **消息处理**逻辑是也在**主线程**完成的
        - 一旦消息处理消耗了很长时间，心跳请求将无法及时发送给协调者，导致协调者**误以为消费者已死**
    - 从Kafka 0.10.1.0开始，社区引入了**单独的心跳线程**
4. **重平衡的通知机制**是通过**心跳线程**来完成的
    - 当协调者决定开启新一轮重平衡后，会将`REBALANCE_IN_PROGRESS`封装进**心跳请求的响应**中
    - 当消费者实例发现心跳响应中包含`REBALANCE_IN_PROGRESS`，就知道重平衡要开始了，这是重平衡的通知机制
5. `heartbeat.interval.ms`的真正作用是控制**重平衡通知的频率**

## 消费者组状态机
| 状态 | 描述 |
| --- | --- |
| **Empty** | 组内**没有任何成员**，但消费者组可能**存在已提交的位移数据**，而且这些位移**尚未过期** |
| **Dead** | 组内**没有任何成员**，但**组的元数据已经在协调者端被移除**，协调者组件保存着当前向它注册过的所有组信息 |
| **PreparingRebalance** | 消费者组**准备开启**重平衡，此时所有成员都要**重新请求加入消费者组** |
| **CompletingRebalance** | 消费者组下**所有成员已经加入**，各个成员正在**等待分配方案**<br/>该状态在老版本中称为**AwaitingSync**，与CompetingRebalance是等价的 |
| **Stable** | 消费者组的**稳定状态**，该状态表明重平衡**已经完成**，组内各成员都能够**正常消费数据**了 |

<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-rebalance-consumer-group-state-machine.png" width=1000>

1. 一个消费者组最开始是**Empty**状态，当重平衡过程开启后，会被置于**PreparingRebalance**状态等待成员加入
    - 之后变更到**CompletingRebalance**状态等待分配方案，最后流转到**Stable**状态完成重平衡
2. 当有新成员加入或已有成员退出时，消费者组的状态从**Stable**直接跳到**PreparingRebalance**状态
    - 所有现存成员都必须**重新申请加入组**
3. 当所有成员都退出组后，消费者组状态变更为**Empty**
    - Kafka**定期自动删除过期位移**的条件是消费者组要处于**Empty**状态
    - `Removed ✘✘✘ expired offsets in ✘✘✘ milliseconds`

## 重平衡流程
重平衡流程需要**消费者端**和**协调者组件**共同参与才能完成

### 消费者端
1. 在消费者端，重平衡分为两个步骤：**加入组**、**等待领导者消费者（Leader Consumer）分配方案**
    - 分别对应两类特定的请求：**JoinGroup请求**、**SyncGroup请求**
2. 当组内成员加入组时，会向协调者发送JoinGroup请求
    - 在JoinGroup请求中，每个成员都要将自己**订阅的主题**上报，这样协调者就能收集所有成员的订阅信息
    - 一旦收集了**全部**成员的JoinGroup请求后，协调者会从这些成员中选择一个担任这个消费者组的**领导者**
        - 通常请求下，**第一个**发送JoinGroup请求的成员会自动成为领导者
        - 这里的领导者与**领导者副本**不是一个概念，这里的领导者是**具体的消费者实例**
    - 消费者领导者的职责：**收集所有成员的订阅信息**，然后根据这些信息，_**制定具体的分区消费分配方案**_
    - 选出领导者后协调者会把**消费者组订阅信息**封装进JoinGroup请求的响应体中，返回给领导者，**由领导者统一分配**
3. **领导者**向协调者发送**SyncGroup请求**，将刚刚做出的**分配方案**发给协调者
    - 其它成员也会向协调者发送SyncGroup请求，只不过请求体中并没有实际的内容
    - 让协调者接收分配方案，然后统一以**SyncGroup响应**的方式分发给所有成员

#### JoinGroup
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-rebalance-consumer-join-group.png" width=1000>

1. **JoinGroup**请求的主要作用是_**将组成员订阅信息发送给领导者消费者**_
2. 待领导者**制定好分配方案**后，重平衡流程进入到**SyncGroup**请求阶段

#### SyncGroup
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-rebalance-consumer-sync-group.png" width=1000>

1. **SyncGroup**请求的主要作用是_**让协调者把领导者制定的分配方案下发给各个组内成员**_
2. 当所有成员都**成功接收到分配方案**后，消费者组进入**Stable**状态，即开始正常的消费工作

### Broker端

#### 新成员加入组
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-rebalance-broker-join-group.png" width=1000>

1. 新成员加入组指的是消费者组处于**Stable**状态后，有新成员加入，而不是全新启动一个消费者组
2. 当协调者收到新的**JoinGroup**请求后，会通过**心跳请求响应**的方式通知组内现有的所有成员，**强制它们开启新一轮重平衡**

#### 组成员主动离组
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-rebalance-broker-leave-group.png" width=1000>

1. 主动离组：消费者实例所在的线程或者进程调用**close()**方法**主动**通知协调者它要退出，即**LeaveGroup**请求
2. 协调者收到**LeaveGroup**请求后，依然会以**心跳响应**的方式通知其它成员

#### 组成员崩溃离组
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-rebalance-broker-crash-leave-group.png" width=1000>

1. 崩溃离组：消费者实例出现**严重故障**，突然宕机导致的离组
2. 主动离组，协调者能**马上感知**并处理；崩溃离组，协调者需要**等待一段时间**才能感知到，参数`session.timeout.ms`

#### 重平衡时协调者对组内成员提出位移的处理
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-rebalance-broker-commit-offset.png" width=1000>

1. 正常情况下，每个组内成员都会**定期**汇报位移给协调者
2. 当重平衡开启时，协调者会给予成员一段**缓冲时间**
    - 要求每个成员必须在这段缓冲时间内**快速上报位移信息**，然后再开启正常的**JoinGroup/SyncGroup**请求