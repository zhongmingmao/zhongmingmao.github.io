---
title: 大数据 -- Spark + Flink
mathjax: false
date: 2019-07-12 09:06:06
categories:
    - Big Data
    - Spark
tags:
    - Big Data
    - Spark
    - Flink
---

## Spark的缺点
1. Spark流处理（Spark Streaming、Structured Streaming）的**实时性不够**，无法应对一些对实时性要求很高的流处理场景
2. 根本原因：Spark的流处理是基于**微批处理**思想，**把流处理看成批处理的一种特殊形式**
    - 每次接收到一个**时间间隔**的数据才会去处理，所以天生就很难在实时性上有所提升
3. 在Spark 2.3中提出了连续处理模型，但现在只支持有限的功能，并不能在大项目中使用

<!-- more -->

## Apache Flink
Apache Flink采用了**基于操作符（Operator）的连续流模型**，可以做到**微秒级**的延迟

### 核心模型
1. Flink中最核心的数据结构是**Stream**，代表**一个运行在多个分区上的并行流**，在Stream上同样可以进行各种**转换**操作
2. 与Spark的RDD不同的是，Stream代表一个**数据流**而不是静态数据的集合
3. Stream所包含的数据会随着时间增长而变化，而且Stream上的转换操作都是**逐条**进行的
    - 这种处理模式决定了Flink会比Spark Streaming有**更低的流处理延迟性**
4. 当一个Flink程序被执行的时候，会被映射成**Streaming Dataflow**
    - Streaming Dataflow包括**Stream**和**Operator**
    - 转换操作符**把一个或多个Stream转换成多个Stream**
    - 每个Dataflow都有一个**输入数据源**（Source）和一个**输出数据源**（Sink）
    - 与Spark的RDD转换图类似，Streaming Dataflow也会被组合成一个**有向无环图**去执行
5. 在Flink中，程序天生是**并行**和**分布式**的
    - 一个Stream可以包含多个**分区**（Stream Partitions）
    - 一个操作符可以被分成多个**操作符子任务**，每个子任务可以在不同的**线程**或者不同的**机器节点**中独立执行
6. Stream在操作符之间传输数据的形式有两种：一对一、重新分布
    - **一对一**
        - Stream维护着分区以及元素的顺序，与RDD的窄依赖类似
    - **重新分布**
        - Stream中数据的分区会发生改变
        - 操作符的每个子任务把数据发送到不同的目标子任务

<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-flink-streaming-dataflow.jpg" width=800/>
<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-flink-streaming-dataflow-map.jpg" width=800/>

### 架构
<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-flink-architecture.png" width=1000/>

1. 四层：存储层、部署层、核心引擎层、API和库
2. **存储层**：Flink兼容多种文件系统如HDFS、Amazon S3，多种数据库如HBase、MongoDB，多种数据流Kafka、Flume
3. **部署层**：Flink不仅支持本地运行，还能在独立集群或者在被YARN或Mesos管理的集群上运行，也能部署在云端
4. **核心处理引擎**：所有高级的API及应用库都会被翻译成**包含Stream和Operator的Streaming Dataflow**来执行
5. **API和库**：核心API是DataSet API和DataStream API
    - **DataSet**：代表有界的数据集，用来做**批处理**
    - **DataStream**：代表流数据，用来做**流处理**
    - 在内部，DataSet是用DataStream来表示，_**静态的有界数据页可以被看作特殊的流数据**_
    - DataSet和DataStream可以无缝切换，_**Flink的核心是DataStream**_
    - DataSet和DataStream支持各种基本的转换操作，如map、filter、count、groupBy等
    - 在DataSet和DataStream之上，有更高层次的Table API，类似于Spark SQL，是关系型的API
        - **Table API同样统一了Flink的批处理和流处理**

## 对比

### 相同点
1. 都基于**内存计算**
2. 都有**统一的批处理和流处理API**，都支持**类似SQL的编程接口**
3. 都支持很多相同的转换操作，编程都是用类似于**Scala Collection API**的函数式编程模式
4. 都有**完善的错误恢复机制**
5. 都支持**Exactly Once的语义一致性**

### 不同点

#### 流处理
1. **延迟性**
    - Spark基于**微批量处理**
        - 把流数据看成一个个小的批处理数据块分别处理，所以延迟性只能做到**秒级**
    - Flink基于**事件**处理，每当有新的数据输入都会立刻处理，是**真正的流式处理**，支持**毫秒级**计算
2. **窗口操作**
    - Spark只支持基于**时间**的窗口操作（处理时间或事件时间）
    - Flink支持的窗口操作则**非常灵活**，不仅支持时间窗口，还支持基于数据本身的窗口，开发者可以自定义窗口操作

#### SQL功能
1. Spark和Flink分别提供了**Spark SQL**和**Table API**，来提供SQL交互支持
2. 相比较而言，**Spark对SQL支持更好**，相应的优化、扩展和性能更好

#### 迭代计算
1. **Spark对机器学习的支持很好**，因为可以**在内存中缓存中间计算结果**来加速机器学习算法的运行
2. 但大部分机器学习算法其实是一个**有环的数据流**，在Spark中，却是用**无环有向图**来表示的
3. Flink支持在运行时间中的**有环数据流**，从而可以更加有效地对机器学习算法进行运算

#### 生态
1. **Spark的社区更加活跃**，Flink诞生较晚，各种库的功能不如Spark全面

## 小结
1. 适用场景
    - Spark
        - 数据量非常大且逻辑复杂的批数据处理，并且对计算效率有较高要求（如推荐系统）
        - 基于历史数据的交互式查询，要求响应较快
        - 基于实时数据流的数据处理，延迟性要求在**数百毫秒到数秒**之间
    - Flink
        - 适用于**延迟非常低**的实时数据处理场景（如实时日志报表系统）
2. 思想
    - Spark：_**用批处理去模拟流处理**_
    - Flink：_**用流处理去模拟批处理**_，扩展性更好
