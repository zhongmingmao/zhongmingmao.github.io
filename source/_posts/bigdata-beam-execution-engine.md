---
title: Beam - Execution Engine
mathjax: true
date: 2024-10-01 00:06:25
cover: https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/flink-runner-beam-language-portability.png
categories:
  - Big Data
  - Beam
tags:
  - Big Data
  - Beam
---

# Pipeline

1. 读取输入数据到 PCollection
2. 对读进来的 PCollection 进行 Transform，得到另一个 PCollection
3. 输出结果 PCollection

<!-- more -->

```java
// Start by defining the options for the pipeline.
PipelineOptions options = PipelineOptionsFactory.create();

// Then create the pipeline.
Pipeline pipeline = Pipeline.create(options);

PCollection<String> lines = pipeline.apply(
  "ReadLines", TextIO.read().from("gs://some/inputData.txt"));

PCollection<String> filteredLines = lines.apply(new FilterLines());

filteredLines.apply("WriteMyFile", TextIO.write().to("gs://some/outputData.txt"));

pipeline.run().waitUntilFinish();
```

1. 任何一个 Beam 程序都需要先创建一个 Pipeline 实例 - 用来表达 Pipeline 类型
2. 二进制程序可以**动态**包含**多个 Pipeline 实例**
   - 每个 Pipeline 实例都是**独立**的，封装了要进行操作的**数据**，以及要进行操作 **Transform**
3. Beam 是**延迟运行**的
   - 在 **Pipeline.run** 之前，只是构建了 Beam 所需要的数据处理 **DAG** 用来**优化和分配计算资源**，未开始计算
   - pipeline.run().waitUntilFinish() - 数据真正开始被处理
4. Pipeline 可以通过 PipelineOption **动态选择计算引擎**

# TestPipeline

> TestPipeline 是一种特殊的 Pipeline，能够在**单机**上运行**小规模**的数据集

```java
Pipeline p = TestPipeline.create();

PCollection<String> input = p.apply(Create.of(WORDS)).setCoder(StringUtf8Coder.of());

PCollection<String> output = input.apply(new CountWords());

PAssert.that(output).containsInAnyOrder(COUNTS_ARRAY);

p.run();
```

# PipelineOptions

1. Beam 把**应用层的数据处理业务逻辑**与**底层的运算引擎**分离
2. 无需修改 Pipeline 代码，就可以在**本地**、**Spark**、**Flink** 上运行 - **PipelineOptions**
3. **SparkPipelineOptions** / **FlinkPipelineOptions**

```java
options = PipelineOptionsFactory.as(SparkPipelineOptions.class);
Pipeline pipeline = Pipeline.create(options);
```

1. 通常一个 **PipelineOption** 是用 **PipelineOptionsFactory** 来创建的
   - PipelineOptionsFactory.as(Class)
   - PipelineOptionsFactory.create()
2. 更常见的创建方法是从**命令行**中读取参数来创建 **PipelineOption**
   - PipelineOptionsFactory#fromArgs(String[])

```java
public static void main(String[] args) {
     PipelineOptions options = PipelineOptionsFactory.fromArgs(args).create();
     Pipeline p = Pipeline.create(options);
}
```

# Direct

1. 在**本地运行测试**或者**调试**时使用的运行模式
2. 在 Direct 模式时，Beam 会在**单机**上用**多线程**来**模拟分布式**的**并行**处理

> Maven

```xml
<dependency>
    <groupId>org.apache.beam</groupId>
    <artifactId>beam-runners-direct-java</artifactId>
    <version>2.60.0</version>
    <scope>test</scope>
</dependency>
```

> 根据**命令行参数**选择生成不同的 **PipelineOptions** 子类

```java
PipelineOptions options =
       PipelineOptionsFactory.fromArgs(args).create();
```

```
$ mvn compile exec:java -Dexec.mainClass=YourMainClass \
     -Dexec.args="--runner=DirectRunner" -Pdirect-runner
```

> 显式使用 DirectRunner

```java
PipelineOptions options = PipelineOptionsFactory.create();
options.setRunner(DirectRunner.class);
// 或者这样
options = PipelineOptionsFactory.as(DirectRunner.class);
Pipeline pipeline = Pipeline.create(options);
```

# Spark

1. **SparkRunner** 在**执行 Beam 程序**时，与**原生的 Spark 程序**一样
2. SparkRunner 为在 Spark 上运行 Beam Pipeline 提供了以下功能
   - **Batch Pipeline** + **Streaming Pipeline**
   - 与**原生 RDD 和 DStream** 一样的**容错保证**
   - 与**原生 Spark** 一样的**安全性能**
   - 可以使用 Spark 的数据回报系统
   - 使用 Spark Broadcast 实现 Beam side-input
3. **≥ Spark 2.2**

> Maven

```xml
<dependency>
  <groupId>org.apache.beam</groupId>
  <artifactId>beam-runners-spark</artifactId>
  <version>2.13.0</version>
</dependency>
<dependency>
  <groupId>org.apache.spark</groupId>
  <artifactId>spark-core_2.10</artifactId>
  <version>${spark.version}</version>
</dependency>
<dependency>
  <groupId>org.apache.spark</groupId>
  <artifactId>spark-streaming_2.10</artifactId>
  <version>${spark.version}</version>
</dependency>
```

> 命令行参数

```
$ mvn exec:java -Dexec.mainClass=YourMainClass \
    -Pspark-runner \
    -Dexec.args="--runner=SparkRunner \
      --sparkMaster=<spark master url>"
```

> 在 **Spark 独立集群**上运行

```
$ spark-submit --class YourMainClass --master spark://HOST:PORT target/...jar --runner=SparkRunner
```

# Flink

1. FlinkRunner 用来在 **Flink** 上运行 **Beam Pipeline**
   - 可选的**计算集群** - 如 Yarn / **Kubernetes** / Mesos / 本地
2. FlinkRunner 适合大规模且连续的数据处理问题
3. FlinkRunner 提供的功能
   - 以 **Streaming** 为**中心**，支持**流处理**和**批处理**
   - 与**原生 Flink** 一样的**容错性**，同样支持 **exactly-once** 处理语义
   - 可以自定义**内存管理模型**
   - 与 Apache **Hadoop** 生态整合比较好

> Maven

```xml
<dependency>
  <groupId>org.apache.beam</groupId>
  <artifactId>beam-runners-flink-1.6</artifactId>
  <version>2.13.0</version>
</dependency>
```

> 命令行参数

```
$ mvn exec:java -Dexec.mainClass=YourMainClass \
    -Pflink-runner \
    -Dexec.args="--runner=FlinkRunner \
      --flinkMaster=<flink master url>"
```

