---
title: Kafka -- “发行版”
mathjax: false
date: 2019-06-29 14:54:22
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

## Kafka Connect
> Kafka Connect, an open source component of Kafka, is a framework for connecting Kafka with external systems such as databases, key-value stores, search indexes, and file systems.

> Using Kafka Connect you can use existing connector implementations for common data sources and sinks to move data into and out of Kafka.

<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-connect.png" width=1000/>

<!-- more -->

## Apache Kafka
1. Apache Kafka是最正宗的Kafka，被称为社区版Kafka，是其他发行版的基础
2. 优点：**开发人数最多，版本迭代速度最快，社区响应度高**
3. 缺点：**仅仅提供最基础的组件，没有提供任何监控框架或工具，缺失高级功能**
4. 应用场景：仅仅需要一个消息引擎系统或者简单的流处理应用场景，同时需要对系统有较大的把控度

## Confluent Kafka
1. 2014年，Kafka的3个创始人离开LinkedIn创办了Confluent公司，专注于提供基于Kafka的企业级流处理解决方案
2. Confluent公司主要从事商业化Kafka工具开发，并在此基础上发布了Confluent Kafka
3. Confluent Kafka提供了一些Apache Kafka没有的高级特性，例如**跨数据中心备份**、**Schema注册中心**、**集群监控工具**
4. Confluent Kafka分为免费版和企业版
    - 免费版：与Apache Kafka非常类似，但包含**Schema注册中心**和**REST Proxy**两大功能，免费版还包含更多的**连接器**
        - Schema注册中心：集中管理Kafka的**消息格式**以实现数据**前向/后向兼容**
        - REST Proxy：用开放HTTP接口的方式允许你通过网络访问Kafka的各种功能
    - 企业版：
        - **跨数据中心备份**
        - **集群监控**
5. 缺点：Confluent暂无发展国内业务的计划，相关的资料和技术支持都比较欠缺，Confluent Kafka在国内的普及率比较低
6. 应用场景：需要用到Kafka的高级特性

## Cloudera/Hortonworks Kafka
1. Cloudera提供的**CDH**和Hortonworks提供的**HDP**是非常著名的**大数据平台**，里面集成了目前主流的大数据框架
2. CDH和HDP都集成了Apache Kafka，简称为CDH Kafka和HDP Kafka
3. 2018年10月，Cloudera和Hortonworks宣布合并
4. CDH/HDP Kafka天然集成了Apache Kafka
5. 优点：通过便捷化的界面操作将Kafka的安装、运维、管理、监控**全部统一**在控制台
6. 缺点：降低对Kafka集群的**掌控程度**，演进速度较慢
7. 应用场景：需要快速地搭建消息引擎系统，或者需要搭建的是多框架构成的数据平台，且Kafka只是其中一个组件

## 参考资料
[Kafka核心技术与实战](https://time.geekbang.org/column/intro/100029201)
