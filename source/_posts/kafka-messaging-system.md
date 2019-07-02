---
title: Kafka -- 消息引擎系统
mathjax: false
date: 2019-06-18 08:15:26
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

## 术语
1. Apache Kafka是一款开源的**消息引擎系统**
2. 消息队列：给人某种暗示，仿佛Kafka是利用**队列**实现的
3. 消息中间件：过度强调中间件，而不能清晰地表达实际解决的问题

<!-- more -->

## 解决的问题
1. 系统A发送消息给消息引擎系统，系统B从消息引擎系统中读取A发送的消息
2. 消息引擎传输的对象是消息
3. 如何传输消息属于消息引擎设计机制的一部分

## 消息格式
1. 成熟解决方案：CSV、XML、JSON
2. 序列化框架：Google Protocol Buffer、Facebook Thrift
3. Kafka：纯二进制的字节序列

## 消息引擎模型
1. 点对点模型
    - 即消息队列模型，系统A发送的消息只能被系统B接收，其他任何系统不能读取A发送的消息
2. 发布订阅模型
    - 主题（Topic）、发布者（Publisher）、订阅者（Subscriber）
    - 多个发布者可以向相同的主题发送消息，多个订阅者可以接收相同主题的消息
3. Kafka同时支持上面两种消息引擎模型

## JMS
1. JMS：Java Message Service
2. JMS也支持上面的两种消息引擎模型
3. JMS并非传输协议，而是一组API
4. JMS非常出名，很多主流的消息引擎系统都支持JMS规范
    - ActiveMQ、RabbitMQ、IBM WebSphere MQ、Apache Kafka（并未完全遵照）

## 优点
1. **削峰填谷**
2. **解耦**
