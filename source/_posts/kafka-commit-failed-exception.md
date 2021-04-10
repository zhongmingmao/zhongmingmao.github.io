---
title: Kafka -- CommitFailedException
mathjax: false
date: 2019-09-06 17:57:04
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

## CommitFailedException
1. CommitFailedException是Consumer客户端在**提交位移**时出现的**不可恢复**的严重异常
2. 如果异常是**可恢复的瞬时错误**，提交位移的API方法是支持**自动错误重试**的，如**commitSync**方法

<!-- more -->

## 解释
> Commit cannot be completed since the **group has already rebalanced and assigned the partitions to another member**. This means that the time between subsequent calls to poll() was longer than the configured max.poll.interval.ms, which typically implies that the poll loop is spending too much time message processing. You can address this either by **increasing** the **max.poll.interval.ms** or by **reducing** the maximum size of batches returned in poll() with **max.poll.records**.

## 场景

### 场景1
```java
Properties props = new Properties();
props.put("max.poll.interval.ms", 5000);
consumer.subscribe(Arrays.asList("test-topic"));
 
while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(1));
    Thread.sleep(6000L);
    consumer.commitSync();
}
```
1. **消息处理的总时间超过预设的`max.poll.interval.ms`**时，Consumer端会抛出CommitFailedException
2. 解决方案
    - **缩短单条消息处理的时间**
    - **增加`max.poll.interval.ms`**
        - 使用**0.10.1.0**之前的客户端API，需要使用`session.timeout.ms`参数
        - `session.timeout.ms`还有其他含义，`max.poll.interval.ms`是从`session.timeout.ms`剥离出来的参数
    - **减少`max.poll.records`**
    - **使用多线程来加速消费**
        - 多线程如何**提交位移**是很容易出错的

### 场景2
1. Kafka Java Consumer端提供了一个名为**Standalone Consumer**的独立消费者
    - 它**没有消费者组的概念**，每个独立消费者实例都**独立工作**，彼此之间毫无联系
2. 独立消费者的**位移提交机制**和消费者组是**一样**的，也**必须指定group.id**才能提交位移
3. 如果同时出现了设置**相同group.id**的**消费者组**程序和**独立消费者**程序
    - 当**独立消费者**程序**手动提交位移**时，会抛出CommitFailedException，表明它不是消费者组内**合法**的成员

## 参考资料
[Kafka核心技术与实战](https://time.geekbang.org/column/intro/100029201)