---
title: Big Data - Spark + Flink
mathjax: true
date: 2024-09-22 00:06:25
cover: https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/bigdata-spark-flink.jpeg
categories:
  - Big Data
  - Spark
tags:
  - Big Data
  - Spark
  - Flink
---

# Spark 实时性

1. 无论是 **Spark Streaming** 还是 **Structured Streaming**，Spark **流处理**的**实时性还不够**
   - 无法应对**实时性要求很高**的流处理场景
2. Spark 的**流处理**是基于**微批处理**的思想
   - 把流处理看做批处理的一种特殊形式，没接收到一个**时间间隔**的数据才会去处理
3. 虽然在 Spark 2.3 中提出**连续处理模型**，但只支持**有限的功能**，并不能在大项目中使用
4. 要在流处理的**实时性**提升，就不能继续用**微批处理**的模式，而是有数据数据就**立即处理**，不做等待
   - Apache **Flink** 采用了基于操作符（**Operator**）的**连续流模型**，可以做到**微秒级别**的延迟

<!-- more -->

# Flink

## 模型

1. Flink 中最核心的数据结构是 **Stream**，代表一个运行在**多个分区**上的**并行流**
2. 在 **Stream** 上可以进行各种**转换**（**Transformation**）操作
3. 与 Spark RDD 不同的是，**Stream** 代表一个**数据流**而不是**静态数据的集合**
   - **Stream** 所包含的数据随着**时间增长**而**变化**的
   - 而且 Stream 上的**转换**操作都是**逐条**进行的 - 每当有**新数据**进入，整个流程都会被**执行**并**更新**结果
   - Flink 比 Spark Streaming 有**更低的流处理延迟性**

> 当一个 Flink 程序被执行时，会被映射为 **Streaming Dataflow**

![image-20241118232520584](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241118232520584.png)

1. Streaming Dataflow 包括 **Stream** 和 **Operator**
2. 转换操作符（**Transformation Operator**）把**一个或多个 Stream** 转换成**多个 Stream**
3. 每个 Streaming Dataflow 都有一个输入数据源（**Source**）和一个输出数据源（**Sink**）
4. **Streaming Dataflow** 与 **Spark RDD DAG** 类似，会被组合成一个 **DAG** 去执行

> 在 **Flink** 中，程序天生就是**并行**和**分布式**的

1. 一个 **Stream** 可以包含**多个**分区（**Stream Partitions**）
2. 一个 **Operator** 可以被分成多个 **Operator 子任务**
   - 每一个子任务在**不同的线程**或者**不同的节点**上**独立执行**

![image-20241118233145416](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241118233145416.png)

> **Stream** 在 **Operator** 之间**传输数据**的形式有两种

1. **一对一**（One-to-one）
   - Stream 维护着**分区**和**元素**的**顺序**
   - **Map Operator** 的子任务**处理**的数据和 **Source** 的子任务**生产**的元素的数据相同
   - 与 **Spark RDD 窄依赖**非常类似
2. **重新分布**（Redistributing）
   - Stream 中数据的分区会发生**改变**
   - Operator 的每个子任务把数据发送到不同的**目标子任务**上

## 架构

![image-20241118234718318](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241118234718318.png)

1. 核心处理引擎是 **Distributed Streaming Dataflow**
   - 所有高级 API 和应用库都会被翻译成包含 **Stream** 和 **Operator** 的 **Streaming Dataflow**
2. Flink 提供两个核心的 API - **DataSet API** 和 **DataStream API**
   - 与 **Spark** 的 **DataSet** 和 **DataFrame** 非常类似
   - **DataSet** 代表**有界的数据集**，而 **DataStream** 代表**流数据**
   - **DataSet API** 用来做**批处理**，而 **DataStream API** 用来做**流处理**
3. 在 Flink 内部，**DataSet** 其实也是用 **Stream** 表示
   - **静态的有界数据**可以被看作**特殊的流数据** -- 刚好与 **Spark** 相反
   - **DataSet** 与 **DataStream** 可以**无缝切换** - Flink 的核心是 **DataStream**
4. **DataSet** 和 **DataStream** 都支持各种基本的**转换**操作 - map、filter、count、groupBy 等
5. Flink 是用 **Java** 开发的，对 Java 有原生的支持，也可以用 **Scala** 开发 Flink 程序
   - 在 **Flink 1.0** 后支持了 **Python**
6. **Flink DataStream** 的使用方法与 **Spark RDD** 类似
   - 把程序拆分成一系列的**转换**操作并**分布式**地执行
7. 在 **DataSet** 和 **DataStream** 之上，有更高层次的 **Table** API
   - **Flink Table API** 与 **Spark SQL** 的思想类似，是**关系型**的 API
   - 可以像操作 **SQL** 数据库表那样操作数据，而不需要通过操作 **DataStream/DataSet** 的方式进行数据处理
   - 更不需要**手动优化代码**的执行逻辑
   - 跟 **Spark SQL** 类似，**Flink Table API** 同样统一了 Flink 的**批处理**和**流处理**

# Flink vs Spark

> **Flink** 和 **Spark** 都支持**批处理**和**流处理**

## 相同点

1. 都是基于**内存**计算
2. 都有**统一**的**批处理**和**流处理**的 API，都支持类似 **SQL** 的编程接口
3. 都支持很多相同的**转换**操作，编程都是用类似 **Scala Collection API** 的**函数式编程**模式
4. 都有**完善的错误恢复机制**
5. 都支持 **Exactly once** 的**语义一致性**

## 差异点

### 流处理

> Flink

1. **Spark** 是基于**微批处理**
   - 把**流数据**看成一个个小的**批处理数据块**分别处理，**延迟性**只能做到**秒级**
   - Spark 只支持**基于时间**的**窗口**处理（**处理时间**或者**事件时间**）
2. **Flink** 是基于**每个事件**处理
   - 每当有新的数据输入都会**立刻处理**，是**真正的流式计算**，支持**毫秒级**计算
   - Flink 支持的窗口操作**非常灵活**，不仅支持**时间窗口**，还支持**基于数据本身的窗口**

### SQL

> Spark

1. Spark 和 Flink 分别提供 **Spark SQL** 和 **Table API** 提供 **SQL** 支持
2. **Spark 对 SQL 支持更好**，相应的**优化**、**扩展**和**性能**更好

### 迭代计算

> Flink

1. Spark 对**机器学习**的支持很好，可以在**内存**中**缓存中间计算结果**来**加速**机器学习算法的运行
2. 但大部分机器学习算法其实是个**有环的数据流**，在 **Spark** 中，却是用**无环图**来表示
3. **Flink** 支持在运行时间中的**有环数据流**，从而可以更有效地对机器学习算法进行运算

### 生态

> Spark

1. Spark 社区更活跃，各种扩展库也更全面

## 场景

### Spark

1. **数据量非常大**而且**逻辑复杂**的**批处理**，并且对**计算效率**有较高要求
2. 基于**历史数据**的**交互式查询**，要求**响应较快**
3. 基于**实时数据流**的数据处理，延迟性要求在**百毫秒**到**数秒**之间

### Flink

1. Flink 是为了**提升流处理**而创建的平台，适用于各种需要**非常低延迟**的**实时数据处理**场景 - 实时日志分析
2. Flink 是**用流处理去模拟批处理**的思想，比 Spark **用批处理去模拟流处理**的思想**扩展性更好**

