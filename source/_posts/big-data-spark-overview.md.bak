---
title: 大数据 -- Spark概述
mathjax: false
date: 2019-07-05 09:39:17
categories:
    - Big Data
    - Spark
tags:
    - Big Data
    - Spark
---

## MapReduce
1. MapReduce通过简单的Map和Reduce抽象提供了一个编程模型
    - 可以在一个由上百台机器组成的集群上并发处理大规模的数据集，并**隐藏**具体的计算细节
    - **各种各样的复杂数据处理都可以分解为Map或Reduce的基本元素**
2. 复杂的数据处理可以被分解为由多个Job（一个Mapper + 一个Reducer）组成的**有向无环图**（DAG）
    - 然后每个Mapper和Reducer在Hadoop集群上执行，就可以得到结果

<!-- more -->

### 缺陷
1. **高昂的维护成本**
2. **时间性能达不到用户的预期**
3. **抽象层次低**，大量的**底层逻辑**都需要开发者手工完成
    - 类似于用汇编语言去编写一个复杂的游戏
4. **只提供Map和Reduce两个操作**
    - 很多实际的数据处理场景并不适合用MapReduce模型来描述
    - 实现复杂的操作很有技巧性，同时会让整个工程变得**庞大且难以维护**
    - 如两个数据集的Join操作是很基本且常用的功能
        - 但如果使用MapReduce模型，需要对两个数据集进行一次Map和Reduce才能得到结果
        - 维护一个多任务协调的状态机**成本很高**，并且**可扩展性很差**
5. 在Hadoop中，每个Job的计算结果都会存储在**HDFS**中，所以每一步都会进行**硬盘**的读取和写入，大大增加了**系统延迟**
    - 因此，MapReduce对于**迭代算法**的处理性能很差，很耗资源，因为迭代的每一步都要对HDFS进行读写
6. **只支持批数据处理，欠缺对流数据处理的支持**

## Spark的优势
1. Spark最基本的数据抽象叫作**弹性分布式数据集**（Resilient Distributed Dataset，**RDD**）
    - RDD代表一个**可以被分区的只读数据集**，RDD内部可以有很多**分区**，每个分区又可以有大量的**数据记录**
2. RDD是Spark最基本的数据结构，Spark定义了很多对RDD的操作
    - 对RDD的任何操作都可以像**函数式编程**中操作内存中的集合一样直观简便，使得实现数据处理的代码非常简短高效
3. Spark提供了很多对RDD的操作，如Map、Filter、flatMap、groupByKey、Union等，**极大地提升了对各种复杂场景的支持**
    - 开发者不用再绞尽脑汁地挖掘MapReduce模型的潜力，也不用维护复杂的MapReduce状态机
4. 相对于Hadoop的MapReduce会将中间数据存放到硬盘中，Spark会把**中间数据缓存在内存**中，加快了处理速度
    - Spark可以把迭代过程中每一步的计算结果都缓存在内存中，所以**非常适用于迭代算法**
    - Spark**第一次**启动时需要把数据载入内存，之后的迭代可以直接在内存里利用中间结果进行计算，后期的迭代速度很快
    - 在当今**机器学习**和**人工智能**大热的环境下，**Spark无疑是更好的数据处理引擎**
5. 在任务级别上，**Spark的并行机制是多线程模型，而MapReduce是多进程模型**
    - 多进程模型便于细粒度地控制每个任务占用的资源，但会消耗较多的启动时间
    - Spark同一节点上的任务以**多线程**的方式运行在**同一个JVM进程**中
        - **更快的启动速度，更高的CPU利用率、更好的内存共享**

<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-spark-hadoop-compare.png" width=1000/>

## 与Hadoop的关系
1. **Spark并不是一个完全替代Hadoop的全新工具**
2. Hadoop生态
    - **数据存储层**：分布式文件系统HDFS、分布式数据库HBase
    - **数据处理层**：进行数据处理的MapReduce、负责集群和资源管理的YARN
    - **数据访问层**：Hive、Pig、Mahout
3. 从狭义上来看，_**Spark只是MapReduce的替代方案**_
    - 大部分应用场景中，Spark还需要依赖HDFS和HBase来存储数据，依赖YARN来管理集群和资源
    - Spark不一定依附于Hadoop才能生存，它可以运行在Apache Mesos、Kubernetes等云平台

## Spark生态
<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-spark.jpg" width=800/>

1. Spark作为**通用的数据处理平台**，有5个主要的扩展库
    - 支持结构化数据的**Spark SQL**
    - 处理实时数据的**Spark Streaming**
    - 用于机器学习的**MLib**
    - 用于图计算的**GraphX**
    - 用于统计分析的**SparkR**
2. 扩展库与Spark核心API高度整合，使得Spark平台可以广泛地应用在不同的数据处理场景中
