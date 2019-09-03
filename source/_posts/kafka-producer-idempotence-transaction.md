---
title: Kafka -- 幂等性生产者 + 事务生产者
mathjax: false
date: 2019-08-19 22:29:07
categories:
    - Middleware
    - MQ
    - Kafka
tags:
    - Middleware
    - MQ
    - Kafka
    - Stream
    - Idempotence
---

## 消息交付可靠性保障
1. 消息交付可靠性保障：Kafka对Producer和Consumer要处理的消息所提供的承诺
2. 常见的承诺
    - 最多一次（at most once）：消息可能会丢失，但绝不会被重复发送
    - **至少一次**（at least once）：消息不会丢失，但有可能被重复发送
    - 精确一次（exactly once）：消息不会丢失，也不会被重复发送
3. Kafka默认提供的交付可靠性保障：_**至少一次**_
    - 只有Broker成功**提交**消息且Producer接到Broker的应答才会认为该消息成功发送
    - 如果Broker成功提交消息，但Broker的应答没有成功送回Producer端，Producer只能选择**重试**
4. 最多一次
    - Kafka也可以提供**最多一次**交付可靠性保证，只需要让**Producer禁止重试**即可，但大部分场景下并不希望出现消息丢失
5. **精确一次**
    - 消息不会丢失，也不会被重复处理，即使Producer端重复发送了相同的消息，Broker端也能自动去重
    - 两种机制：**幂等性**、**事务**

<!-- more -->

## 幂等性
1. 幂等原是数学中的概念：某些操作或者函数能够被执行多次，但每次得到的结果都是**不变**的
    - 幂等操作：乘1，取整函数；非幂等操作：加1
2. 计算机领域
    - 在**命令式**编程语言（如C）中，如果一个子程序是幂等的，那它必然**不能修改系统状态**
    - 在**函数式**编程语言（如Scala、Haskell）中，很多**纯函数**天然就是幂等的，不执行任何的Side Effect
3. 幂等性的好处：可以**安全地重试**任何幂等性操作

## 幂等性Producer
1. 在Kafka中，**Producer默认不是幂等的**，在**0.11.0.0**版本引入了幂等性Producer
2. **默认情况下**，Producer向Broker发送数据时，可能会出现同一条消息被发送多次，导致**消息重复**
3. 升级为幂等性Producer
    - `props.put("enable.idempotence", true)`或
    - `props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true)`
4. 基本原理
    - **空间换时间**，在Broker端多保存一些字段
    - 当Producer发送了具有相同字段值的消息后，Broker能够自动发现这些重复消息，然后默默**丢弃**
5. **作用范围**
    - 幂等性Producer只能保证**单分区**上的幂等性
        - 即只能保证某个主题上的一个分区上不出现重复消息，无法实现多个分区的幂等性
    - 幂等性Producer只能实现**单会话**上的幂等性，不能实现跨会话的幂等性
        - 会话：**Producer进程的一次运行**，如果重启Producer进程，将丢失幂等性保证
    - 如果要实现**多分区**或者**多会话**的消息无重复，可以采用**事务Producer**

## 事务
1. 数据库事务提供了**ACID**的安全性保障：**Atomicity**、**Consistency**、**Isolation**、**Durability**
2. Kafka在**0.11**版本开始提供了对事务的支持，目前主要在**Read Committed**的隔离级别上做事情
    - 保证**多条消息原子性地写入目标分区**，同时也保证**Consumer只能看到事务成功提交的消息**

## 事务Producer
1. 事务Producer能够保证**一批消息原子性地写入多个分区**，这批消息要么**全部写入成功**，要么**全部写入失败**
2. **事务Producer允许进程重启**，Producer重启后，Kafka依然保证它们发送的消息的**精确一次**处理
3. 升级为事务Producer
    - `props.put("enable.idempotence", true)`
    - `props.put("transactional.id", "my-transactional-id")`
4. record1和record2会被当作一个事务统一提交到Kafka，要么全部提交成功，要么全部写入失败
5. 即使写入失败，Kafka也会把它们写入到**底层日志**中，即Consumer还是会看到这些消息
6. 因此在Consumer端，读取事务Producer发送的消息，需要设置**isolation.level**参数
    - **read_uncommitted**
        - 默认值，Consumer能够读取到Kafka写入的**任何消息**，不论事务Producer提交事务还是终止事务
    - **read_committed**
        - Consumer只会读取到**事务Producer成功提交事务写入的消息**，也能读取到**非事务Producer写入的所有消息**

```java
producer.initTransactions();
try {
    producer.beginTransaction();
    producer.send(new ProducerRecord<>(TOPIC, KEY, VALUE + 1));
    producer.send(new ProducerRecord<>(TOPIC, KEY, VALUE + 2));
    //
    producer.commitTransaction();
} catch (KafkaException e) {
    producer.abortTransaction();
}
```

## 小结
1. 幂等性Producer和事务Producer都是Kafka社区为了实现**精确一次**处理语义所提供的工具，只是**作用范围**不同而已
2. 幂等性Producer只能保证**单分区、单会话**上的消息幂等性；而事务Producer能够保证**跨分区、跨会话**的幂等性
3. 事务Producer与幂等性Producer相比，**性能更差**
