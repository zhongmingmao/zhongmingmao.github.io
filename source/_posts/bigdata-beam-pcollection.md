---
title: Beam - PCollection
mathjax: true
date: 2024-09-25 00:06:25
cover: https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/bigdata-beam-pcollection.png
categories:
  - Big Data
  - Beam
tags:
  - Big Data
  - Beam
---

# 数据抽象

> **Spark RDD**

1. 不同的技术系统有不同的**数据结构**， 如在 C++  中有 vector、unordered_map
2. 几乎**所有**的 Beam 数据都能表达为 PCollection
3. PCollection - **Parallel Collection** - 可**并行计算**的数据集，与 Spark **RDD** 非常类似
4. 在一个**分布式计算系统**中，需要为用户隐藏实现细节，包括**数据**是怎样**表达**和**存储**的
   - 数据可能来自于**内存**的数据，也可能来自于**外部文件**，或者来自于 **MySQL** 数据库
   - 如果没有一个**统一的数据抽象**的话，开发者需要不停地修改代码，无法专注于业务逻辑

<!-- more -->

# Coder

> 将**数据类型**进行**序列化**和**反序列化**，便于在**网络**上**传输**

1. 需要为 PCollection 的**元素**编写 **Coder**
2. Coder 的作用与 Beam 的本质紧密相关
   - **计算流程**最终会运行在一个**分布式系统**
   - 所有的数据都可能在**网络**上的计算机之间**相互传递**
   - Coder 就是告诉 Beam 如何将**数据类型**进行**序列化**和**反序列化**，以便于**在网络上传输**
3. Coder 需要注册进**全局**的 **CoderRegistry**
   - 为自定义的数据类型建立与 Coder 的**对应关系**，无需每次都手动指定

# 无序

1. PCollection 的**无序**特性与**分布式**本质有关
2. 一旦**一个 PCollection** 被分配到**不同的机器**上执行
   - 为了保证最大的**吞吐量**，不同机器都是**独立运行**的
   - 因此**执行顺序**无从得知

# 无固定大小

1. Beam 要统一**批处理**和**流处理**，所以要统一表达**有界数据**和**无界数据**，因此 **PCollection** 并**没有限制容量**
2. 一个 **PCollection** 可以是**有界**的，也可以是**无界**的
   - 一个**无界的 PCollection** 表达了一个**无限大小的数据集**
3. 一个 PCollection 是否有界，往往取决于它是**如何产生**的
   - 从**批处理**的数据源（一个文件、一个数据库）中读取，就会产生**有界的 PCollection**
   - 从**流式**或者**持续更新的数据库**中读取，如 pub/sub 或者 Kafka，会产生一个**无界的 PCollection**
4. PCollection 的**有界**和**无界**特性会影响到 Beam 的**数据处理方式**
   - 一个**批处理作业**往往处理**有界的 PCollection**，而**无界的 PCollection** 需要**流式作业**来连续处理
5. Beam 也是用 **Window** 来分割**持续更新**的**无界数据**，一个**流数据**可以被持续地拆分成不同的小块

# 不可变性

1. PCollection 不提供任何**修改它所承载数据**的方式
2. 修改一个 PCollection 的唯一方式去 **Transform**
3. Beam 的 PCollection 都是**延迟执行**的 - **deferred execution**

```java
PCollection<T1> p1 = ...;
PCollection<T2> p2 = doSomeWork(p1);
```

1. p2 这个 PCollection 仅仅会**记录**下自己是由 doSomeWork 这个操作计算而来的，和计算自己所需要的数据 p1
2. 运算操作的最终结果，仅仅只是生成一个 **DAG**，即**执行计划** - execution plan
   - **DAG** 是**框架**能够**自动优化执行计划**的核心
3. PCollection 下的**数据不可变性**是因为改变本身**毫无意义**
   - 由于 Beam 的**分布式**本质，想要去修改一个 PCollection 的**底层表达数据**，需要在**多个机器**上查找











