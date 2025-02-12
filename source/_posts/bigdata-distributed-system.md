---
title: Big Data - Distributed System
mathjax: true
date: 2024-09-10 00:06:25
cover: https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241115122617632.png
categories:
  - Big Data
tags:
  - Big Data
---

# SLA

> Service-Level Agreement - 系统服务提供者对客户的一个**服务承诺**

## Availabilty

1. 可用性指的是系统服务能**正常运行**所占的**时间百分比**
2. 对许多系统来说，**99.99%** 可以被认为**高可用性** - 中断时间≈ **50 分钟/年**

<!-- more -->

## Accuracy

1. 是否允许某些数据**不准确**或者**丢失**，如果允许发生，用户可以接受的概率
2. 不同系统平台会用不同的指标去定义**准确性**，常用的是 **Error Rate**

$$
错误率=\frac{导致系统产生内部错误的有效请求数}{期间的有效请求总数}
$$

> Case

1. 以分钟为单位，每个月的 Error Rate 超过 5% 的时间少于 0.1%
2. 以 5 分钟为单位，Error Rate 不会超过 0.1%

> 评估系统准确性

1. **性能测试**
2. 查看**系统日志**

## Capacity

1. 系统容量通常指的是系统能够支持的**预期负载量**是多少，一般会以**每秒的请求数**为单位来表示
   - QPS - Queries Per Second
   - RPS - Requests Per Second
2. 定义 Capacity 的方式 - **Throttling** / **Performance Test** / **Log**

## Latency

1. 延迟指的是系统在**收到**用户的请求到**响应**这个请求之间的**时间间隔**
2. p95 / p99 - **percentile**

# Scalability

> Horizontal Scaling + Vertical Scaling

| Scaling    | Desc                           |
| ---------- | ------------------------------ |
| Horizontal | 在现有的系统中增加新的机器节点 |
| Vertical   | 升级现有机器的性能             |

1. 在大数据时代，数据规模越来越大，对**数据存储系统**的**扩展性**要求也越来越高
2. 传统的**关系型**数据库
   - 表与表之间的数据有**关联**，经常要进行 **Join** 操作
   - **所有数据**要存放在**单机**系统中，很难支持水平扩展
3. **NoSQL** 型数据库
   - **天生支持水平扩展** - MongoDB / Redis

# Consistency

1. 构成分布式系统的**机器节点的可用性**要低于**系统的可用性**
2. 如何保证系统中**不同的机器节点**在**同一时间**，接收到和输出的数据是**一致**的
3. 要保证分布式系统内的机器节点具有相同的信息，需要机器节点之间**定期同步**（可能**失败**）

> 一致性模型 - 强一致性很难实现，**最终一致性应用最广**

1. **强一致性** - Google Cloud Spanner
   - 系统中的某个数据被成功更新后，后续任何对该数据的读取操作都将得到更新后的值
   - 在任意时刻，同一系统**所有节点**中的数据是一样的
   - 只要某个数据的值发生更新，该数据的**副本**都要进行**同步**，保证该更新被**传播**到所有**备份数据库**中
   - 在该同步过程结束后，才允许读取该数据
   - 一般会**牺牲**一部分**延迟性**，并且对**全局时钟**的要求很高
2. **弱一致性**
   - 系统中的某个数据被更新后，后续对该数据的读取操作可能得到**更新后**的值，也可能是**更新前**的值
   - 但经过一段时间后，后续对该数据的读取都是更新后的值
3. **最终一致性** - AWS DynamoDB
   - 是弱一致性的特殊形式
   - **存储系统**保证，在没有新的更新的条件下，最终所有的访问都是更新后的值
   - 无需等到数据更新被所有节点同步就可以读取
     - 尽管**不同的进程**读**同一数据**可能会读到**不同的结果**
     - 最终所有的更新会按**时间顺序**同步到所有节点
   - 支持**异步读取**，**延迟比较小**

# Durability

> 数据持久性

1. 数据持久性意味着数据**一旦被成功存储**，就可以**一直使用**，即使系统中的节点下线、宕机或者数据损坏
2. 不同的**分布式数据库**拥有不同级别的持久性 - 节点级别 / 集群级别
3. 提高数据持久性的常规做法 - **数据复制**

> 消息持久性

1. 在分布式系统中，节点之间需要互相**发送消息**去**同步**以**保证一致性**
   - 对于重要的系统而言，通常不允许任何消息的丢失
2. 分布式系统中的消息通讯通常由**分布式消息服务**完成 - Kafka
   - 当消息服务的节点发生了错误，**已经发送的消息**仍然会在错误解决之后被处理
   - 如果一个**消息队列**声明了**持久性**，那么即使队列在消息发送之后掉线，仍然会在重新上线后收到该消息
