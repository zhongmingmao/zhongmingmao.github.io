---
title: Beam - Context
mathjax: true
date: 2024-09-23 00:06:25
cover: https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/bigdata-beam-context.webp
categories:
  - Big Data
  - Beam
tags:
  - Big Data
  - Beam
---

# MapReduce

## 架构思想

1. 提供一套**简洁的 API** 来表达工程师**数据处理**的逻辑
2. 在这套 API 底层嵌套一套**扩展性很强**的**容错系统**

<!-- more -->

## 计算模型

> Map

1. 计算模型从**输入源**中读取数据集合
2. 这些数据经过用户所写的逻辑后生成一个**临时的键值对数据集**
3. MapReduce 计算模型会将拥有**相同键**的数据集集中起来发送到下一阶段，即 **Shuffle** 阶段

> Reduce

1. 接收从 **Shuffle** 阶段发送过来的数据集
2. 在经过用户所写的逻辑后生成**零个或多个结果**

## 划时代意义

1. **Map** 和 **Reduce** 这两种**抽象**，其实可以**适用于非常多的应用场景**
2. MapReduce 的**容错系统**，可以让**数据处理逻辑**在**分布式环境**下有很好的**扩展性**（**Scalability**）

## 不足

1. 使用 MapReduce 来解决一个**工程问题**，往往会涉及**非常多的步骤**
2. 每次使用 MapReduce 时，都需要在分布式环境中**启动机器**来完成 **Map** 和 **Reduce** 步骤
3. 并且需要启动 **Master** 机器来**协调**两个步骤的**中间结果**，存在不少的**硬件资源开销**

# FlumeJava

1. 将**所有的数据**都抽象成名为 **PCollection** 的数据结构
   - 无论是从**内存**中读取的数据，还是在分布式环境下所读取的**文件**
2. **统一的抽象**，对于**测试代码中的逻辑**非常友好
   - MapReduce - 读取测试数据集 + 在分布式环境下运行 + 测试代码逻辑
   - **PCollection** - 在**内存**中读取数据然后跑测试文件
     - **同样的逻辑**，既可以在**分布式环境**下运行，也可以在**单机内存**中运行
3. FlumeJava 在 MapReduce 框架中 **Map** 和 **Reduce** 思想上，抽象出 4 个原始操作 - **Primitive Operation**
   - **parallelDo**、**groupByKey**、**combineValues**、**flatten**
   - 基于这 4 个 Primitive Operation 来表达任意 Map 和 Reduce 的逻辑
4. **Deferred Evaluation** - 用于**代码优化**
   - FlumeJava 框架为业务代码进行一次**静态遍历**，然后改造出一个**执行计划**的 **DAG**
   - **Execution Plan Dataflow Graph** - FlumeJava 会**自动优化代码**
5. FlumeJava 通过**输入数据集规模**，**预测输出结果的规模**，自行决定代码是放在**内存**中，还是在**分布式环境**中运行
6. 不足
   - FlumeJava **只支持批处理**，对于**无边界数据**是**不支持**的 - Google **Millwheel** 用于**流处理**
   - 统一框架 - **Dataflow Model**

# Apache Beam

1. Google 基于 **Dataflow Model** 思想推出了 **Cloud Dataflow**，但只能在 **Google 云平台**上使用
2. 在 2016 年，基于 **Dataflow Model** 思想开发出一套 SDK，并贡献给 Apache Software Foundation
3. **Beam = Batch + Streaming**，统一**批处理**和**流处理**

![bigdata-apache-beam](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/bigdata-apache-beam.webp)

1. 在实际的业务场景中，不可避免地需要对数据**同时**进行**批处理**和**流处理**
2. Apache Beam 提供了一套**统一的 API** 来处理这两种数据处理模式
   - **专注于数据处理的逻辑**上，而不是花时间在对两种数据处理模式的差异的维护上
3. 将**算法逻辑**与**底层运行环境**解耦
   - 通过 Beam 提供的 API 写好数据处理逻辑后
   - 处理逻辑可以**不做任何修改**，直接放到任何**支持 Beam API 的底层系统**上运行 - 类似于 **SQL**
   - 支持 Beam API 的底层系统 - **Runner** - Apache **Spark** / Apache **Flink**
4. 现阶段 Apache Beam 支持的语言 - **Java / Python / Golang**

![bigdata-apache-beam-language](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/bigdata-apache-beam-language.webp)

