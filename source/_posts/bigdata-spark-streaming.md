---
title: Spark - Streaming
mathjax: true
date: 2024-09-20 00:06:25
cover: https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/bigdata-spark-streaming.webp
categories:
  - Big Data
  - Spark
tags:
  - Big Data
  - Spark
---

# 流处理

1. Spark SQL 中的 **DataFrame** API 和 **DataSet** API 都是基于**批处理**模式对**静态数据**进行处理
2. 在 **2013**，Spark 的**流处理组件** Spark Streaming 发布，现在的 Spark Streaming 已经**非常成熟**，应用非常广泛

<!-- more -->

# 原理

1. Spark Streaming 的原理与**微积分**的思想很类似
   - 微分是无限细分，而积分是对无限细分的每一段进行求和
   - 本质 - 将**一个连续的问题**转换成了**无限个离散的问题**
2. 流处理的数据是一系列**连续不断变化**，且**无边界**的，永远**无法预测**下一秒的数据
3. Spark Streaming 用**时间片**拆分了**无限**的数据流
   - 然后对每个**数据片**用类似于**批处理**的方法进行处理，输出的数据也是**分块**的

![image-20241118165318271](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241118165318271.png)

1. Spark Streaming 提供一个对于**流数据**的抽象 **DStream**
2. DStream 可以由 **Kafka**、**Flume** 或者 **HDFS** 的流数据生成，也可以由别的 **DStream** 经过各种**转换**操作得到
3. 底层 DStream 由**多个序列化的 RDD** 构成，按**时间片**（如一秒）切分成的每个**数据单位**都是一个 **RDD**
4. Spark 核心引擎将对 **DStream** 的 **Transformation** 操作变为针对 Spark 中对 **RDD** 的 **Transformation** 操作
   - 将 RDD 经过操作变成**中间结果**保存在**内存**中
5. Spark SQL 中的 **DataFrame** 和 **DataSet** 同样基于 **RDD** - Spark **最基础的数据抽象** - Java Primitive Type
   - 无论是 DataFrame、DataSet、DStream，都具有 **RDD** 的**不可变性**、**分区性**和**容错性**等特性
6. Spark 是一个**高度统一**的平台
   - 所有的**高级 API** 都具有**相同的性质**，相互之间很容易**转化**
   - 野心 - 用一套工具**统一**所有数据处理的场景
7. Spark Streaming 将**底层细节**封装起来，对开发者来说，只需要操作 **DStream** 即可

# DStream

> 一个连续的 RDD 序列，每个 RDD 代表一个**时间窗口**的输入数据流

![image-20241118171041623](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241118171041623.png)

> 对 **DStream** 的**转换**操作，将对它所包含的每一个 **RDD** 进行**同样**的**转换**操作

```scala
sc = SparkContext(master, appName)
ssc = StreamingContext(sc, 1)
lines = sc.socketTextStream("localhost", 9999)
words = lines.flatMap(lambda line: line.split(" "))
```

1. 创建一个 lines DStream，监听来自本机 9999 端口的数据流，每一个**数据**代表**一行文本**
2. 对 lines 进行 flatMap 操作，把每一个**文本行**拆分成**词语**
3. 本质上，对一个 **DStream** 进行 flatMap 操作
   - 就是对它里面的**每一个 RDD** 进行 flatMap 操作，**生成一系列新的 RDD**，构成一个**新的 DStream**

![image-20241118171920714](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241118171920714.png)

> **RDD** 支持的所有的**转换**操作，**DStream** 都支持，但 DStream 还支持一些特有操作，如**滑动窗口操作**

## 滑动窗口

1. 任何 **Spark Streaming 程序**都需要首先创建一个 **StreamingContext** 对象，是**所有 Streaming 操作**的入口
   - 可以通过 StreamingContext **创建 DStream**
2. StreamingContext 中最重要的参数是**批处理的时间间隔**，即把**流数据**细分成**数据块**的**粒度**
   - 该时间间隔决定了**流处理**的**延迟性** - 需要根据**需求**和**资源**来衡量间隔的**长度**
3. 滑动窗口 - **每隔一段时间**，统计**过去某个时间段内**的数据
   - 每隔 10 秒，输出过去 60 秒内排名前十的热点词
4. 滑动窗口的基本参数
   - **窗口长度**（window length） - 每次统计的数据的**时间跨度**
   - **滑动间隔**（sliding interval）- 每次统计的**时间间隔**
5. 由于 **Spark Streaming** 流处理的**最小时间单位**为 **StreamingContext** 的**时间间隔**
   - 因此**滑动窗口**的两个参数都是 **StreamingContext 时间间隔**的**整数倍**

![image-20241118174046684](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241118174046684.png)

> 最基本的滑动窗口操作是 **window**，返回一个新的 **DStream**，其中的 **RDD** 代表**一段时间窗口**内的数据

```scala
windowed_words = words.window(60, 10)
```

1. windowed_words 代表的是热词统计所需要的 DStream
2. 里面每一个**数据块**都包含**过去 60 秒内**的词语，这样的数据块**每 10 秒生成一个**

# 优缺点

## 优点

1. 底层**基于 RDD 实现**，能复用 RDD 的**优良特性**（如数据容错性、运行速度等）
2. Spark Streaming 是 **Spark 生态**的一部分，可以与 **Spark 核心引擎**、**Spark SQL**、**MLlib** 等**无缝衔接**

## 缺点

1. Spark Streaming 的主要缺点是**实时计算延迟较高**，一般在**秒级**
   - 因为 Spark Streaming **不支持太小的批处理的时间间隔**
2. Spark Streaming 是一个**准实时系统** - Apache **Storm** 可以做到**毫秒级**
