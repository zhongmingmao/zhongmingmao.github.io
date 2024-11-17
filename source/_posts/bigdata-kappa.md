---
title: Big Data - Kappa
mathjax: true
date: 2024-09-16 00:06:25
cover: https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/bigdata-kappa.jpeg
categories:
  - Big Data
tags:
  - Big Data
---

# Lambda

## 概述

![image-20241117181045851](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241117181045851.png)

<!-- more -->

1. Lambda 架构结合了**批处理**和**流处理**的架构思想
2. 将进入系统的大规模数据**同时**送入两套架构层中，即 **Batch Layer** 和 **Speed Layer**
3. 同时产生两套数据结果并存入 **Serving Layer** 中

## 优点

1. Batch Layer 有很好的**容错性**，同时由于保存着**所有的历史记录**，使得产生的数据具有很好的**准确性**
2. Speed Layer 可以**及时处理**流入的数据，具有**低延迟性**
3. 最终 Serving Layer 将两套数据**结合**，并生成一个完整的数据视图提供给用户
4. Lambda 架构也具有很好的**灵活性**，可以将不同**开源组件**嵌入到该架构中

## 不足

1. 使用 Lambda 架构，需要维护**两个复杂的分布式系统**，并保证它们**逻辑**上产生**相同的结果**输出到 Serving Layer
2. 在**分布式框架**中进行**编程**是**非常复杂**的，尤其需要对**不同的框架**进行**专门的优化** -- 高昂的维护成本
3. 维护 Lambda 架构的复杂性 -- **同时维护两套系统架构**
   - 方向 - 改进其中一层的架构，让其具有另一层架构的特性

# Kappa

## 架构

> Apache Kafka 具有**永久保存数据日志**的功能，基于该特性，可以让 **Speed Layer** 重新处理**历史数据**

![image-20241117195928256](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241117195928256.png)

1. 部署 Apache Kafka，设置数据日志的**保留期** - 希望**重新处理**的历史数据的时间区间
2. 如果需要**改进**现有的**逻辑算法**，则表示需要对**历史数据**进行**重新处理**
   - 将 Apache Kafka 的 **Log Offset** 重置为 **0**，重新计算保留好的历史数据，生成一个**新的数据视图**
3. 当新的数据视图处理过的数据进度**赶上**了旧的数据视图，则可以**切换**到新的数据视图中进行**读取**
4. 与 Lambda 架构不同的是，Kappa 架构**移除**了 **Batch Layer** 的体系结构，**只保留了 Speed Layer**
   - 只需要在**业务逻辑改变**或者**代码更改**的时候进行数据的重新处理

## 不足

1. 只保留了 Speed Layer 而缺少 Batch Layer，在 Speed Layer 上处理大规模数据可能会有**数据更新出错**的情况
   - 需要**花费更多的时间**在**异常处理**上
2. Kappa 架构的**批处理**和**流处理**都放在了 **Speed Layer** 上，使用**同一套代码**来处理**算法逻辑**
   - 所以，Kappa 架构不适合于**批处理**和**流处理**的**代码逻辑不一致**的场景

