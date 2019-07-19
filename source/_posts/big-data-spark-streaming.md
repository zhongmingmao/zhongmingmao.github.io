---
title: 大数据 -- Spark Streaming
mathjax: false
date: 2019-07-08 19:27:57
categories:
    - Big Data
    - Spark
    - Spark Streaming
tags:
    - Big Data
    - Spark
    - Spark Streaming
---

## 原理
1. Spark Streaming的原理与**微积分**的思想很类似，本质上是将一个**连续**的问题转换成无限个**离散**的问题
2. Spark Streaming用**时间片**拆分了无限的数据流，然后对每个数据片采用类似**批处理**的方法进行处理
3. Spark Streaming提供了对**流数据的抽象DStream**
    - DStream可以由来自**Kafka、Flume、HDFS**的流数据生成，也可以由别的DStream经过各种**转换**得到
4. 底层DStream是由很多**序列化的RDD**构成，按时间片切分成的每一个数据单位都是一个RDD
    - Spark核心引擎对DStream的Transformation操作 -> Spark中对RDD的Transformation操作
    - 将RDD经过操作变成**中间结果**保存在**内存**中
5. DataFrame和DataSet都是基于RDD的，因此**RDD是Spark最基本的数据抽象**，类似于Java中的基本数据类型
    - 因此，无论DataFrame、DataSet，还是DStream，都具有RDD的**不可变性、分区性和容错性**
6. Spark是一个**高度统一的平台**，所有高级API都具有相同的性质，它们之间很容易地相互转换
    - Spark的野心：**用一套工具统一所有数据处理的场景**

<!-- more -->

<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-spark-streaming.png" width=800/>

## DStream

### 内部形式
DStream的内部形式是一个**连续的RDD序列**，每个RDD代表一个**时间窗口**的输入数据流

<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-spark-streaming-dstream.png" width=800/>

### 转换
```java
sc = SparkContext(master, appName)
ssc = StreamingContext(sc, 1)
lines = sc.socketTextStream("localhost", 9999)
words = lines.flatMap(lambda line: line.split(" "))
```
1. 创建一个lines的DStream，去监听来自本机9999端口的数据流，每个数据代表一行文本
2. 然后对lines进行flatMap的转换操作，把每一个文本行拆分成词语
3. 对一个DStream进行flatMap操作
    - 本质上就是对它里面的**每一个**RDD进行flatMap操作，生成一系列新的RDD，构成一个新的代表词语的DStream
4. RDD支持的所有转换操作，DStream都支持，DStream还支持一些特有操作，如**滑动窗口**操作

<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-spark-streaming-dstream-transformation.png" width=800/>

### 滑动窗口
1. 任何Spark Streaming的程序都要先创建一个StreamingContext对象，它是所有Streaming操作的**入口**
2. StreamingContext中最重要的参数是**批处理的时间间隔**，即把流数据细分成数据块的**粒度**，决定了**流处理的延迟性**
3. 样例：每隔10秒输出过去60秒内排名前十的热点词
4. 滑动窗口操作的两个基本参数
    - **窗口长度**（window length）：每次统计的数据的时间跨度
    - **滑动间隔**（sliding interval）：每次统计的时间间隔
5. Spark Streaming流处理的**最小时间单位**是StreamingContext的时间间隔，窗口长度和滑动间隔是时间间隔的整数倍
6. 最基本的滑动窗口操作是**window**，可以返回一个新的DStream，该DStream中的每个RDD代表一段时间窗口内的数据

```java
// 每一个数据块都包含过去60秒的词语，这样的数据块会每10秒钟生成一个
windowed_words = words.window(60, 10)
```

<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-spark-streaming-dstream-window.png" width=800/>

## 优缺点
1. 优点
    - 底层是**基于RDD实现**的，能体现RDD的优良特性
        - **数据容错性**：如果RDD的某些分区丢失了，可以通过依赖信息重新计算恢复
        - **运算速度**：同样可以通过**persist**方法将数据流存放在**内存**中，在需要多次**迭代计算**时，速度优势明显
    - Spark Streaming是**Spark生态的一部分**，可以与Spark的核心引擎、Spark SQL、MLib等**无缝衔接**
        - 对Spark Streaming实时处理出来的中间数据，可以立即在程序中无缝进行批处理、交互式查询等操作
        - 这大大增强了Spark Streaming的优势和功能，使得基于Spark Streaming的应用程序的**扩展性很好**
2. 缺点
    - 主要缺点是**实时计算延迟较高**，一般在**秒**级别，这是因为Spark Streaming**不支持太小的批处理的时间间隔**
    - Spark Streaming是一个**准实时**系统，而**Storm**的延迟可以做到**毫秒**级
