---
title: Spark - Overview
mathjax: true
date: 2024-09-17 00:06:25
cover: https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/bigdata-spark.png
categories:
  - Big Data
  - Spark
tags:
  - Big Data
  - Spark
  - MapReduce
---

# MapReduce

## 概述

1. MapReduce 通过简单的 **Map** 和 **Reduce** 的**抽象**提供了一个**编程模型**
   - 可以在一个由上百台机器组成的集群上**并发**处理大量的数据集，而把计算细节隐藏起来
2. 各种各样的**复杂数据处理**都可以分解为 **Map** 和 **Reduce** 的**基本元素**
   - 复杂的数据处理可以分解成由多个 **Job**（包含一个 **Mapper** 和一个 **Reducer**）组成的 **DAG**
   - 然后，将每个 **Mapper** 和 **Reducer** 放到 **Hadoop** 集群上执行，得到最终结果

<!-- more -->

## 不足

1. 高昂的**维护成本**
2. **时间性能**不达标
3. MapReduce 模型的**抽象层次低**
   - 大量的**底层逻辑**需要开发者**手工完成** - 用汇编语言开发游戏
4. 只提供 **Map** 和 **Reduce** 操作
   - 很多现实的数据处理场景并不适合用这个模型来描述
   - 实现**复杂的操作**需要**技巧**，让整个工程变得**庞大**且**难以维护**
   - 维护一个多任务协调的状态机**成本很高**，且**扩展性很差**
5. 在 **Hadoop** 中，每个 **Job** 的**计算结果**都会存储在 **HDFS** 文件存储系统中
   - **每一步计算**都要进行**硬盘的读取和写入**，大大增加了**系统的延迟**
6. MapReduce 对于**迭代算法**的**处理性能很差**，而且非常**耗资源**
   - 因为**迭代的每一步**都要对 **HDFS** 进行**读写**
7. MapReduce **只支持批处理**，缺乏对流处理的支持

# Spark

## 优点

1. Spark 最基本的**数据抽象**称为**弹性分布式数据集**（Resilient Distributed Dataset - **RDD**）
2. RDD 代表一个**可以被分区**的**只读数据集**
   - RDD 内有很多**分区**（**Partition**），分区内有大量的**数据记录**（**Record**）
3. RDD 是 Spark 最基本的数据结构
   - Spark 定义了很多对 RDD 的操作
   - 对 RDD 的任何操作都可以像**函数式编程**中**操作内存中的集合**一样直观简便 - 代码简短高效
4. Spark 提供了很多对 RDD 的操作
   - 如 Map、Filter、flatMap、groupByKey、Union 等，极大地提升了对各种Union的支持
   - 不再需要**挖掘 MapReduce 模型的潜力**，也不用**维护复杂的 MapReduce 状态机**
5. 相比于 Hadoop 的 MapReduce 会将**中间数据**存放在 **HDFS**（**硬盘**）中
   - Spark 会将**中间数据**缓存在**内存**中，减少由于**硬盘读写**而导致的**延迟**，大大**加快处理速度**
6. Spark 可以把**迭代过程**中的**每一步的计算结果**都缓存在**内存**中，非常适用于各类**迭代算法**
7. Spark **第一次启动**时需要将数据**载入到内存**，之后的**迭代**可以直接在**内存**里利用**中间结果**做**不落盘**的运算
   - 对于 **AI** 来说，Spark 是更好的**数据处理引擎**
8. 在**任务级别**上，**Spark** 的**并行机制**是**多线程模型**，而 **MapReduce** 是**多进程模型**
   - **多进程模型**便于**细粒度控制**每个**任务**占用的**资源**，但会**消耗更多的启动时间**
   - Spark **同一节点**上的**任务**是以**多线程**的方式运行在**同一个 JVM 进程**中
     - 更快的**启动时间**、更高的 **CPU 利用率**、更好的**内存共享**
9. Spark 对 MapReduce 进行了很多改进，使得**性能提升很大**

> Hadoop 为 **O(N)**，而 Spark 为 **O(1)**

![image-20241117215035247](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241117215035247.png)

## Hadoop

1. Spark 并不是**完全替代 Hadoop** 的全新工具
2. Hadoop 包含很多组件
   - 数据**存储**层 - 分布式文件存储系统 **HDFS**、分布式数据库存储 **HBase**
   - 数据**处理**层 - 进行数据处理的 **MapReduce**、负责集群和资源管理的 **YARN**
   - 数据**访问**层 - Hive、Pig、Mahout
3. 从侠义上来说，**Spark 只是 MapReduce 的替代方案**
   - 在大部分应用场景中，需要依赖 **HDFS** 和 **HBase** 来**存储数据**，依赖 **YARN** 来**管理集群和资源**
4. Spark 并非依附于 Hadoop，同样可以运行在 Kubernetes 等平台上
5. Spark 是**通用**的数据处理平台，有 5 个主要的扩展库，与 Spark Core 高度整合，广泛应用于多个场景
   - 支持**结构化数据**的 **Spark SQL**
   - 处理**实时数据**的 **Spark Streaming**
   - 用于**机器学习**的 **MLlib**
   - 用于**图计算**的 **GraphX**
   - 用于**统计分析**的 **SparkR**

![image-20241117221227214](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241117221227214.png)
