---
title: Beam - Pipeline
mathjax: true
date: 2024-09-27 00:06:25
cover: https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/bigdata-beam-pipeline.webp
categories:
  - Big Data
  - Beam
tags:
  - Big Data
  - Beam
---

# 创建

1. 在 Beam 中，所有的**数据处理逻辑**都会被抽象成 **Pipeline** 来运行
2. **Pipeline** 是对**数据处理逻辑**的一个**封装**
   - 包括一整套流程 - **读取**数据集、将数据集**转换**成想要的结果、**输出**结果数据集

<!-- more -->

> 创建 Pipeline

```java
PipelineOptions options = PipelineOptionsFactory.create();
Pipeline p = Pipeline.create(options);
```

# 应用

![image-20241120172621481](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241120172621481.png)

1. **PCollection** 具有**不可变性**
   - 一个 PCollection 一旦生成，就不能在**增加**或者**删除**里面的元素了
2. 在 Beam 中，每次 **PCollection** 经过一个 **Transform** 之后，Pipeline 都会**创建一个新的 PCollection**
   - 新创建的 PCollection 又成为**下一个 Transform 的输入**
   - 原先的 PCollection **不会有任何改变**
3. 对**同一个 PCollection** 可以应用**多种不同的 Transform**

![eeb81605c09e4a6cc684176ef0a9c9ef](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/eeb81605c09e4a6cc684176ef0a9c9ef.jpg)

# 处理模型

1. **Pipeline** 的**底层思想**依然是 **MapReduce**
2. 在**分布式**环境下，整个 Pipeline 会启动 **N 个 Workers** 来**同时**处理 **PCollection**
3. 在具体处理某个特定 **Transform** 时
   - **Pipeline** 会将这个 Transform 的**输入数据集 PCollection 中的元素**分割成**不同的 Bundle**
   - 并将这些 Bundle 分发到**不同的 Worker** 来处理
4. Pipeline 具体会分配**多少个 Worker**，以及将一个 **PCollection** 分割成**多少个 Bundle** 都是**随机**的
   - Pipeline 会尽可能地让整个处理流程达到**完美并行** - Embarrassingly Parallel
5. 在**多步骤**的 Transforms 中，一个 **Bundle** 通过一个 Transform 产生出来的**结果**作为下一个 Transform 的**输入**
6. 每一个 **Bundle** 在一个 **Worker** 上经过 **Transform** 逻辑后，也会产生一个**新的不可变的 Bundle**
7. 具有**关联性**的 **Bundle**，必须在**同一个 Worker** 上处理

> 第一个 Transform 将元素的数值减 1；第二个 Transform 对元素的数值求平方
> 总共产生 6 个不可变的 Bundle，Bundle1~Bundle3 的整个过程都必须放在 Worker1 上完成，因为具有**关联性**

![574e866c6609c6551083d55ff534cffd](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/574e866c6609c6551083d55ff534cffd.webp)

# 错误处理

> **单个 Transform** 上的错误处理

1. 如果某一个 **Bundle** 里面的**元素**因为**任意原因**导致处理失败，则**整个 Bundle 里面的元素**都必须**重新处理**
2. 重新处理的 Bundle 不一定要在**原来**的 Worker 上执行，可能会**转移**到其它 Worker

> **多步骤 Transform** 上的错误处理

1. 如果处理的一个 Bundle **元素**发生了错误
2. 则**这个元素所在的整个 Bundle** 以及**与这个 Bundle 有关联的所有 Bundle** 都必须**重新处理**

![939e3cf386d5ae416dd878743d98be25](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/939e3cf386d5ae416dd878743d98be25.jpg)
