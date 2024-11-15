---
title: Big Data - Pub + Sub
mathjax: true
date: 2024-09-13 00:06:25
cover: https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/bigdata-pub-sub.png
categories:
  - Big Data
tags:
  - Big Data
---

# Concept

## Message

![image-20241115232326335](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241115232326335.png)

<!-- more -->

1. 在分布式架构中，各个组件（数据库、浏览器、服务端）需要相互沟通
   - 各个组件依靠通过**发送消息**相互通信
2. 消息可以是**任意格式**

## Message Queue

![image-20241115232620837](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241115232620837.png)

1. 消息队列在**发布订阅模式**中起到一个**持久化缓冲**（Durable Buffer）的作用

2. 消息的发送方可以发送**任意消息**到消息队列

3. 消息队列在接收到消息后将消息**保存**好

   - 直到消息的接收方确认已经从队列**消费**该消息，才会将该消息从消息队列中**删除**

   - 某些消息队列支持自定义消息的**保留时间** - Apache Kafka

# Pub-Sub

## 概述

![image-20241115233645431](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241115233645431.png)

1. 消息的发送方可以将消息**异步**地发送给一个系统中的不同组件，而无需知道接收方是谁
2. 发送方被称为 **Publisher**，而接收方被称为 **Subscriber**
3. 可以有任意多个 Publisher，也可以有任意多个 Subscriber

## 优点

1. **松耦合**
2. **高伸缩性** - 消息队列可以作为**独立的数据存储中心**而存在
3. **组件通信**更**简洁**

## 缺点

1. 无法保证 Publisher 发布的消息一定会送达 Subscriber

# Apache Kafka

![image-20241115234725455](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241115234725455.png)

1. 消息的发送方被称为 **Producer**，而消息的接收方被称为 **Consumer**，而消息队列被称为 **Topic**
2. 利用 **Log Offset** 机制来判断消息是否被接收方**消费**

