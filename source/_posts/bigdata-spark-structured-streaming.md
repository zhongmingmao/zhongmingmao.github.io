---
title: Spark - Structured Streaming
mathjax: true
date: 2024-09-21 00:06:25
cover: https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/bigdata-spark-structured-streaming.jpg
categories:
  - Big Data
  - Spark
tags:
  - Big Data
  - Spark
---

# 背景

1. Spark Streaming 将**无边界的流数据**抽象成 **DStream**
   - 按特定的时间间隔，把**数据流**分割成一个个 **RDD** 进行**批处理**
   - **DStream** API 与 **RDD** API **高度相似**，拥有 RDD 的各种性质
2. DataSet/DataFrame
   - DataSet/DataFrame 是**高级 API**，提供类似于 **SQL** 的查询接口，方便熟悉**关系型数据库**的开发人员使用
   - **Spark SQL 执行引擎**会**自动优化 DataSet/DataFrame 程序**
     - 用 **RDD API** 开发的程序本质上需要开发人员**手工构造 RDD 的 DAG 执行图**，依赖于**手工优化**
3. 如果拥有 **DataSet/DataFrame API** 的**流处理**模块
   - 无需去用**相对底层**的 **DStream API** 去处理**无边界数据**，大大提升**开发效率**
4. 在 **2016** 年，**Spark 2.0** 中推出**结构化流处理**的模块 - **Structured Streaming**
   - Structured Streaming 基于 **Spark SQL** 引擎实现
   - 在开发视角，**流数据**和**静态数据**没有区别，可以像**批处理静态数据**那样处理**流数据**
   - 随着**流数据**的**持续输入**，Spark SQL 引擎会**持续地处理**新数据，并更新计算结果

<!-- more -->

# 模型

1. 流数据处理最基本的问题是**如何对不断更新的无边界数据建模**
2. **Spark Streaming**
   - 把**流数据**按一定的**时间间隔**分割成许多个小的**数据块**进行**批处理**
3. **Structured Streaming**
   - 把数据看成一个**无边界**的**关系型数据库表**
   - 每一个**数据**都是表中的**一行**，不断会有**新的数据行**被添加到表中
   - 可以对该表做任何**类似批处理**的**查询**，Spark 会**不断**对新加入的数据进行**处理**，并更新计算结果

![image-20241118184008593](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241118184008593.png)

1. 与 Spark Streaming 类似，**Structured Streaming** 也是将输入的数据按照**时间间隔**（例如 1 秒）划分为**数据段**
2. 每一秒都会把新输入的数据**添加到表**中，Spark 也会每秒**更新输出结果**
   - 输出结果也是**表**的形式，输出表可以写入到**硬盘**或者 **HDFS**

> Structured Streaming 的三种**输出模式**

| Mode                         | Desc                                                         |
| ---------------------------- | ------------------------------------------------------------ |
| 完全模式 - **Complete** Mode | **整个**更新过的输出表被写入外部存储                         |
| 附加模式 - **Append** Mode   | 上次触发后**新增的行**才会被写入到外部存储<br />如果**老数据有改动**则不适合该模式 |
| 更新模式 - **Update** Mode   | 上次触发后**被更新的行**才会被写入外部存储                   |

> Structured Streaming 并**不会完全存储输入数据**

1. **每个时间间隔**，Structured Streaming 都会**读取最新的输入**，进行处理并更新输出表，然后**删除这次输入**
2. Structured Streaming 只会存储更新**输出表所需要**的信息

> Structured Streaming 模型根据事件时间（**Event Time**）处理数据时十分方便

1. 事件时间指的是**事件发生**的时间，是数据**本身**的属性；处理时间是 Spark **接收数据**的时间
2. 在 Structured Streaming 模型中，每个**数据**是输入数据表中的**一行**，那么**事件时间**就是行中的**一列**
3. 依靠 **DataSet/DataFrame API** 提供的类似于 **SQL** 的接口 - 很方便地执行**基于时间窗口**的**查询**

# Streaming DataFrame API

> 在 **Structured Streaming** 发布后，**DataFrame** 即可以代表**静态的有边界数据**，也可以代表**无边界数据**

## 创建 DataFrame

```scala
socketDataFrame = spark
   .readStream
   .format("socket"）
   .option("host", "localhost")
   .option("port", 9999)
   .load()
```

1. `SparkSession.readStream()` 返回的 **DataStreamReader** 可以用于创建 **Streaming DataFrame**
2. 支持多种类型的数据流作为输入，如 **File**、**Kafka**、**Socket** 等

## 查询操作

> **Streaming DataFrame** 与 **Static DataFrame** 都支持 **SQL** 查询（select、where），也支持 **RDD** 转换操作

```scala
df = … // 这个DataFrame代表学校学生的数据流，schema是{name: string, age: number, height: number, grade: string}
df.select("name").where("age > 10") // 返回年龄大于10岁的学生名字列表
df.groupBy("grade").count() // 返回每个年级学生的人数
df.sort_values([‘age’], ascending=False).head(100) // 返回100个年龄最大的学生 
```

> 通过 **isStreaming** 函数判断一个 DataFrame 是否代表流数据

```scala
df.isStreaming()
```

> 基于**事件时间**的时间窗口操作 - 在 **Spark Streaming** 中的热词统计是基于**处理时间**

```scala
words = ...  # 这个DataFrame代表词语的数据流，schema是 { timestamp: Timestamp, word: String}

windowedCounts = words.groupBy(
   window(words.timestamp, "1 minute", "10 seconds"),
   words.word
).count()
.sort(desc("count"))
.limit(10)
```

1. 基于**词语的生成时间**（而非 Spark 的处理时间），创建一个窗口长度为 1 分钟，滑动间隔为 10 秒的窗口
2. 把输入的词语表根据窗口和词语本身聚合起来，并统计每个窗口内词语的数量，在根据词语数量倒排 Top 10

## 输出结果流

1. 当经过各种 **SQL** 查询操作后，创建好**代表最终结果**的 **DataFrame**
2. 下一步开始对**输入数据流**的处理，并**持续输出结果**

```scala
query = wordCounts
   .writeStream
   .outputMode("complete")
   .format("csv")
   .option("path", "path/to/destination/dir")
   .start()

query.awaitTermination()
```

1. 通过 `Dataset.writeStream()` 返回的 **DataStreamWriter** 对象去输出结果
2. 支持多种写入位置，如 File、Kafka、Console、内存等

# Structured Streaming vs Spark Streaming

> 综合来说，**Structured Streaming** 是比 Spark Streaming 更好的流处理工具

## 易用性 + 性能

1. **Spark Streaming** 提供的 **DStream API** 与 **RDD API** 非常类似，**相对底层**

   - 编写 **Spark Streaming** 程序时，本质上是去**构造 RDD 的 DAG 执行图**，然后通过 **Spark Engine** 运行

   - 开发者**心智负担**比较重，需要想办法去**提高程序的处理效率**

   - 对于一个**好的框架**来说，开发者只需要**专注于业务逻辑**上，无需担心配置和优化等**繁杂**事项

2. **Structured Streaming** 提供的 **DataFrame API** 是一个**相对高级**的 API

   - **统一的数据抽象**可以用一套**统一的方案**去处理**批处理**和**流处理**，而无需关心具体的**执行细节**
   - 而且 **DataFrame API** 是在 **Spark SQL 执行引擎**上执行 ，有非常多的**优化功能** - 所以**性能更佳**

## 实时性

1. **Spark Streaming** 是**准实时**的，可以做到的**最小延迟**在 **1 秒**左右
2. 虽然 **Structured Streaming** 也是类似的**微批处理**思想
   - 每过一个**时间间隔**，就去拿**最新的数据**加入到**输入数据表**并**更新结果**
   - 但相比于 Spark Streaming，**更接近于实时处理**，可以做到**更小的时间间隔**，最小延迟在 **100 毫秒**左右
   - 从 **Spark 2.3** 开始，Structured Streaming 引入了**连续处理**的模式，可以做到真正的**毫秒级延迟**

## 事件时间

> Spark Streaming - 处理时间
> Structured Streaming - 处理时间 or **事件时间**

1. **Structured Streaming** 对基于**事件时间**的处理有很好的支持
2. 而 **Spark Streaming** 是将数据按照**接收到的时间**切分成一个个 **RDD** 来进行**批处理**的
   - 很难基于数据本身的**事件时间**进行处理，如果某个数据的处理时间与事件时间**不一致**，很**容易出问题**
