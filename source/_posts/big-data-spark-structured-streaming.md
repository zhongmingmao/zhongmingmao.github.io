---
title: 大数据 -- Structured Streaming
mathjax: false
date: 2019-07-09 23:45:31
categories:
    - Big Data
    - Spark
    - Structured Streaming
tags:
    - Big Data
    - Spark
    - Spark Streaming
    - Structured Streaming
---

## 概述
1. 2016年，Spark在其2.0版本中推出了**结构化流处理**的模块Structured Streaming
2. Structured Streaming是**基于Spark SQL引擎**实现的
    - 依靠Structured Streaming，在开发者眼里**流数据和静态数据没有区别**，完全可以像批处理静态数据那样去处理流数据
    - 随着流数据的持续输入，Spark SQL引擎会持续地处理新数据，并且更新计算结果

<!-- more -->

## Structured Streaming模型
1. 流数据处理最基本的问题：**对不断更新的无边界数据建模**
2. Spark Streaming：把流数据按**一定的时间间隔**分割成许多小的数据块进行**批处理**
3. Structured Streaming
    - 把数据看成一个**无边界的关系型数据表**，每个数据都是表中的一行，不断会有新的数据行被添加到表里
    - 可以对表做任何类似**批处理**的查询，Spark会不断对新加入的数据进行处理，并更新计算结果
4. 与Spark Streaming类似，Structured Streaming也是将输入的数据流按照**时间间隔**划分成数据段
    - 每一秒都会把新输入的数据添加到表中，Spark也会每秒更新输出结果
    - 输出结果也是**表**的形式，输出表可以写入**硬盘**或者**HDFS**
5. Structured Streaming的三种输出模式
    - **完全模式**（Complete Mode）：整个更新过的输出表都被写入外部存储
    - **附加模式**（Append Mode）：上一次触发之后**新增加**的行才会被写入外部存储，老数据有改动不适合该模式
    - **更新模式**（Update Mode）：上一次触发之后**被更新**的行才会被写入外部存储
6. Structured Streaming并**不会完全存储输入数据**
    - 每个时间间隔都会读取最新的输入，进行处理，更新输出表，然后把这次的输入**删除**
    - Structured Streaming**只会存储更新输出表所需要的信息**
7. Structured Streaming在根据**事件时间**处理数据十分方便
    - **事件时间**：事件发生的时间，是数据本身的属性
    - **处理时间**：Spark接收到数据的时间
8. 在Structured Streaming模型中，每个数据都是输入数据表中的一行，那么**事件时间**就是行中的**一列**
    - 依靠DataFrame API提供的类似**SQL**的接口，很方便地执行基于**时间窗口**的查询

<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-spark-structured-streaming.jpg" width=800/>

## Streaming DataFrame API
1. 在Structured Streaming发布之后，DataFrame即可以代表静态的**有边界数据**，也可以代表**无边界数据**
2. 之前对**静态DataFrame**的各种操作同样适用于**流式DataFrame**

### 创建DataFrame
1. SparkSession.readStream返回的DataStreamReader可以用于创建**流DataFrame**
2. 支持多种类型的数据流作为输入，例如**file、Kafka、socket**等

```
socketDataFrame = spark
   .readStream
   .format("socket"）
   .option("host", "localhost")
   .option("port", 9999)
   .load()
```

### 基本的查询操作
流DataFrame和静态DataFrame一样，不仅支持**类似SQL的查询操作**，还**支持RDD的转换操作**
```java
df = // 该DataFrame代表学生的数据流，schema是 {name:string, age:number, height:number, grade:string}
df.select("name").where("age > 10") // 返回年龄大于10岁的学生名字列表
df.groupBy("grade").count() // 返回每个年级学生的人数
df.sort_values(["age"], ascending=False).head(100) // 返回100个年龄最大的学生
```

可以通过isStreaming函数来判断一个DataFrame是否代表流数据
```java
df.isStreaming()
```

基于**事件时间**的时间窗口操作
```java
words = // 该DataFrame代表词语的数据流，schema是 {timestamp:Timestamp, word:String}

// 基于词语的生成时间，创建一个窗口长度为1分钟，滑动间隔为10秒钟的window
// 然后，把输入的词语根据window和词语本身聚合起来，并统计每个window内每个词语的数量
// 最后，根据词语的数量进行排序，只返回前10的词语
windowedCounts = words.groupBy(
   window(words.timestamp, "1 minute", "10 seconds"),
   words.word
).count()
.sort(desc("count"))
.limit(10)
```

### 输出结果流
Dataset.writeStream返回的DataStreamWriter支持多种写入位置，例如file、Kafka、console和内存等
```java
query = wordCounts
   .writeStream
   .outputMode("complete")
   .format("csv")
   .option("path", "path/to/destination/dir")
   .start()

query.awaitTermination()
```

## 对比Spark Streaming
综合来说，**Structured Streaming是比Spark Streaming更好的流处理工具**

### 易用性和性能
1. Spark Streaming提供的DStream API与RDD API很类似，都是相对**比较底层的API**
2. 编写Spark Streaming程序时，本质上是要去**构造RDD的DAG执行图**，然后**通过Spark Engine运行**
    - 开发者的**任务很重**，需要想办法去提高程序的处理效率
    - 一个好的数据处理框架，开发者只需要**专注于业务逻辑**，而不用操心配置、优化等繁琐事项
3. Structured Streaming提供的**DataFrame API**是一个**相对高级的API**
    - 大部分开发者都很熟悉**关系型数据库**和**SQL**
    - 这样的数据抽象可以让开发者**用一套统一的方案去处理批处理和流处理**，而无需关心具体的执行细节
    - DataFrame API是在**Spark SQL**的引擎上执行的，Spark SQL有很多优化，所以Structured Streaming的程序**性能很好**

### 实时性
1. Spark Streaming是**准实时**的，能做到的最小延迟在**1秒**左右
2. Structured Streaming采用的也是**微批处理**思想，但能做到更小的时间间隔，最小延迟在**100毫秒**左右
3. 在Spark 2.3中，Structured Streaming引入了**连续处理**模式，可以做到真正的**毫秒级延迟**

### 对事件时间的支持
1. Structured Streaming**对基于事件时间的处理有很好的支持**
2. Spark Streaming是把数据按接收到的时间（即**处理时间**）切分成一个个RDD进行批处理
    - 很难基于数据本身的产生时间（即**事件时间**）进行处理
    - 如果某个数据的处理时间和事件时间**不一致**的话，很容易出现问题
