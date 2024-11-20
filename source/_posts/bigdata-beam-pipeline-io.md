---
title: Beam - Pipeline IO
mathjax: true
date: 2024-09-28 00:06:25
cover: https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/bigdata-beam-pipeline-io.webp
categories:
  - Big Data
  - Beam
tags:
  - Big Data
  - Beam
---

# 读取数据集

1. 一个**输入数据集**的**读取**通常是通过 **Read Transform** 来完成
2. Read Transform 从**外部源**读取数据 - 本地文件、数据库、OSS、MQ
3. Read Transform 返回一个 **PCollection**，该 PCollection 可以作为一个**输入数据集**，应用在各种 **Transform** 上
4. Pipeline **没有限制**调用 Read Transform 的**时机**
   - 可以在 Pipeline 最开始的时候调用
   - 也可以在经过 N 个步骤的 Transforms 后再调用它来读取另外的数据集

<!-- more -->

> 本地文件

```java
PCollection<String> inputs = p.apply(TextIO.read().from(filepath));
```

1. Beam 支持从**多个文件路径**中读取数据集，文件名匹配规则与 **Linux glob** 一样
2. glob 操作符的匹配规则最终要和所使用的**底层文件系统**挂钩

> 从**不同的外部源**读取**同一类型**的数据来**统一**作为输入数据集 - 利用 flatten 操作将数据集合并

```java
PCollection<String> input1 = p.apply(TextIO.read().from(filepath1);
PCollection<String> input2 = p.apply(TextIO.read().from(filepath2);
PCollection<String> input3 = p.apply(TextIO.read().from(filepath3);
PCollectionList<String> collections = PCollectionList.of(input1).and(input2).and(input3);
PCollection<String> inputs = collections.apply(Flatten.<String>pCollections());
```

# 输出数据集

1. 将**结果数据集**输出到目的地址的操作可以通过 **Write Transform** 来完成
2. **Write Transform** 会将**结果数据集**输出到**外部源**
3. 主要 **Read Transform** 能够支持的外部源，**Write Transform** 都支持
4. 在 **Pipeline** 中，Write Transform 可以在**任意步骤**将结果集输出
   - 可以将**多步骤**的 Transform 中产生的**任何中间结果**输出

> 本地文件

```java
output.apply(TextIO.write().to(filepath/output).withSuffix(".csv"));
```

1. 当输出结果**超过一定大小**时，Beam 会将输出的结果**分块**并写入到 output00、output01 中
2. 可以使用 **withSuffix** 来指定**文件格式**

# IO 连接器

1. 在 Beam 中，**Read Transform** 和 **Write Transform** 都是 **IO Connector** 的实现类
2. Beam **原生支持**的 **IO Connector** 已经能覆盖大部分应用场景
   - 基于**文件读取输出**的 **FileIO** 和 **TFRecordIO**
   - 基于**流处理**的 **KafkaIO** 和 **PubsubIO**
   - 基于**数据库**的 **JdbcIO** 和 **RedisIO**

## 自定义

1. 自定义的 IO Connector **不需要非常通用**，满足业务需求即可
2. 实现自定义的 IO Connector，主要是要实现 Read Transform 和 Write Transform 的操作

### 自定义读取操作

> 有界数据

1. 用 **ParDo** 和 **GroupByKey** 来模拟读取数据的逻辑 - **官方推荐**
   - 将**读操作**看作是 **ParDo** 和 **GroupByKey** 的**多步骤 Transforms**
2. 继承 **BoundedSource** 抽象类去实现一个子类来实现读取逻辑

> 无界数据

1. 必须继承 **UnboundedSource** 抽象类实现一个子类去实现读取逻辑

> Source

1. 无论是 **BoundedSource** 抽象类还是 **UnboundedSource** 抽象类，都继承了 **Source** 抽象类
2. 为了能够在**分布式**环境下处理数据，**Source** 抽象类必须是**可序列化**的 - **Serializable**

#### 多文件路径

> 用户提供一个 glob 文件路径，从相应的存储系统中读取数据

1. 获取**文件路径** ParDo
   - 从用户输入的 glob 文件路径中生成一个 PCollection 的**中间结果**
   - PCollection 中的每个字符串都对应一个**具体的文件路径**
2. 读取数据集 ParDo
   - 从上一步得到的 PCollection，从每个**具体的文件路径**读取**文件内容**
   - 生成一个总的 PCollection 保存所有数据

#### NoSQL

> NoSQL 允许按照**键范围**来**并行**读取数据集

1. 确定**键范围** ParDo
   - 从用户输入的读取数据的键值生成一个 PCollection，用于保存可以有效并行读取的键范围
2. 读取数据集 ParDo
   - 从给定 PCollection 的键范围，读取**相应**的数据，并生成一个总的 PCollection 来保存所有数据

#### SQL

1. 从关系型数据库中查询结果通常都是通过一个 **SQL Query** 来读取数据 - 只需要一个 ParDo
2. 在 ParDo 中建立与数据库的连接并执行 Query，将返回的结果保存在一个 PCollection 中

### 自定义写入操作

1. 只需要**一个 ParDo** 里面调用相应文件系统的**写操作 API** 来完成数据集的输出
2. 如果**输出数据集**要写入到**文件** - Beam 提供基于**文件操作**的 **FileBasedSink** 抽象类 - **TextSink**
   - 要自定义 FileBasedSink 类，必须实现 **Serializable** 接口，保证输出操作可以在**分布式环境**下运行
3. 自定义的类必须具有**不可变性** - Immutability
   - 私有字段，必须被声明为 **final**
   - 如果**类变量**需要**被修改**，每次修改前必须先进行**深拷贝**，保证**原有的数据不可变**

