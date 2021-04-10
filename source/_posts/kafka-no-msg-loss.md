---
title: Kafka -- 无消息丢失
mathjax: false
date: 2019-08-09 18:18:55
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

## 持久化保证
1. Kafka只对**已提交的消息**做**有限度的持久化保证**
2. **已提交的消息**
    - 当Kafka的**若干个Broker**成功地**接收**到一条消息并**写入到日志文件**后，会告诉生产者这条消息已经成功提交
3. **有限度的持久化保证**
    - Kafka不保证在任何情况下都能做到不丢失消息，例如机房着火等极端情况

<!-- more -->

## 消息丢失

### 生产者丢失
1. 目前Kafka Producer是**异步**发送消息的，`Producer.send(record)`立即返回，但不能认为消息已经发送成功
2. 丢失场景：网络抖动，导致消息没有到达Broker；消息太大，超过Broker的承受能力，Broker拒收
3. 解决方案：Producer永远要使用带有**回调通知**的发送API，即**`Producer.send(record, callback)`**
    - callback能够准确地告知Producer消息是不是真的提交成功，一旦出现消息提交失败，可以进行针对性的处理

### 消费者丢失
1. Consumer端丢失数据主要体现在**Consumer端要消费的消息不见了**
2. Consumer程序有**位移**的概念，表示**该Consumer当前消费到Topic分区的位置**
3. 丢失原因：Consumer接收一批消息后，在未处理完所有消息之前，就直接更新位移
4. 解决方案：**先消费消息，再更新位移**
    - 这种方式能最大限度地保证消息不丢失，但带来了**重复消息**的问题，因此Consumer需要支持**幂等**
5. 如果采用**多线程异步处理消息**，Consumer程序要关闭自动提交位移，由应用程序**手动提交位移**

<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-loss-msg-consumer.png" width=600/>

## 最佳实践

### Producer
1. 使用带有**回调**的发送API：`Producer.send(record, callback)`
2. `acks = all`，表示**所有Broker**都要接收到，该消息才算是**已提交**
3. 将`retries`设置为一个**较大的值**，Producer**自动重试**的次数

### Broker
1. `unclean.leader.election.enable = false`，控制哪些Broker有资格竞选分区Leader
    - 如果一个落后很多的Broker也能参与竞选并且成为新的Leader，必然会造成**消息丢失**
2. `replication.factor >= 3`，将消息多保存几份副本，目前防止消息丢失的主要机制是**冗余**
3. `min.insync.replicas > 1`，消息至少被写入多少个**副本**才算已提交，生产环境中不能使用默认值1
4. `replication.factor > min.insync.replicas`，如果两者相等，只要有一个副本宕机，整个**分区**就无法正常工作了
    - 应该在**不降低可用性**的基础上，改善消息的持久性，防止数据丢失
    - 推荐设置为**`replication.factor = min.insync.replicas + 1`**

### Consumer
1. `enable.auto.commit = false`，确保消息消费完再手动提交

## 参考资料
[Kafka核心技术与实战](https://time.geekbang.org/column/intro/100029201)
