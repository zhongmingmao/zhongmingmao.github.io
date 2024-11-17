---
title: Big Data - Lambda
mathjax: true
date: 2024-09-15 00:06:25
cover: https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/bigdata-lambda.webp
categories:
  - Big Data
tags:
  - Big Data
---

# Architecture

![image-20241117154711119](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241117154711119.png)

<!-- more -->

## Batch Layer

1. Batch Layer 存储管理**主数据集**（**不可变**数据集）和预先批处理好计算好的**视图**
2. Batch Layer 使用可处理大量数据的分布式处理系统**预先计算**结果
   - 通过处理**所有**的已有历史数据来实现数据的**准确性**
   - 基于**完整的数据集**来**重新计算**，能够**修复任何错误**，然后更新现有的数据视图
   - 输出通常存储在**只读数据库**中，更新则**完全取代**现有的预先计算好的视图

## Speed Layer

1. Speed Layer 会**实时处理**新来的大数据
2. Speed Layer 通过提供**最新数据**的**实时视图**来**最小化延迟**
   - Speed Layer 生成的数据视图可能不如 Batch Layer 最终生成的视图那么**准确**和**完整**
   - 在收到数据后**立即可用**，而当**同样的数据**被 Batch Layer 处理完成后，在 Speed Layer 的数据可以被**替换**掉
3. 本质上，Speed Layer 弥补了 Batch Layer 所导致的数据视图**滞后**

## Serving Layer

1. 所有在 Batch Layer 和 Speed Layer 处理完的结果都输出存储在 Serving Layer 中
2. Serving Layer 通过返回 **Batch Layer** 预先计算的数据视图或从 **Speed Layer** 处理构建好的数据视图来响应查询

# Query

> 通过 Batch Layer 兼顾了**数据的完整性**，通过 Speed Layer **弥补**了 Batch Layer 的**高延迟性** - 实时性

![image-20241117164236990](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241117164236990.png)

# Twitter

> 利用 Twitter4J 实时抓取的 Twitter 推文，利用 Apache Kafka 将数据实时推送给 Batch Layer 和 Speed Layer

![image-20241117164648687](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241117164648687.png)
