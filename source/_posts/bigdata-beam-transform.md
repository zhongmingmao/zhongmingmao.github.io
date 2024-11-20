---
title: Beam - Transform
mathjax: true
date: 2024-09-26 00:06:25
cover: https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/bigdata-beam-transform.png
categories:
  - Big Data
  - Beam
tags:
  - Big Data
  - Beam
---

# DAG

> Transform 是 Beam 中**数据处理**的**最基本单元**

![image-20241120160357180](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241120160357180.png)

<!-- more -->

1. Beam 把**数据转换**抽象成**有向图**
2. 反直觉 - **PCollection** 是有向图中的**边**，而 **Transform** 是有向图中的**节点**
   - 区分**节点**和**边**的关键是看一个 **Transform** 是不是有一个**多余**的**输入**和**输出**
   - 每个 **Transform** 都可能有**大于一个**的**输入 PCollection**，也可能输出**大于一个**的**输出 PCollection**

# Apply

> Beam 中的 **PCollection** 有一个抽象的成员函数 **Apply**，使用任何一个 **Transform** 时，都需要调用 Apply

```java
final_collection = input_collection.apply(Transform1)
.apply(Transform2)
.apply(Transform3)
```

![image-20241120161250556](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241120161250556.png)

# Transform

## 概述

1. ParDo - **Parallel** Do - 表达的是很**通用**的**并行**处理数据操作
2. GroupByKey - 把一个 Key/Value 的数据集按照 Key **归并**

> 可以用 **ParDo** 实现 **GroupByKey**

1. 简单实现 - 放一个全局的哈希表，然后在 ParDo 中把一个个的元素插入到该**哈希表**中
2. 可能不可用，面对大规模数据时，可能无法放进一个**内存哈希表**
3. 而且，**PCollection** 会把**计算**分发到**不同的机器**上执行

## ParDo

> 在实际应用中，**80%** 的数据处理流水使用**基本**的 ParDo 和 DoFn

1. 在编写 ParDo 时，**输入**是一个 PCollection 中的**单个元素**，而**输出**可以是 **0 个**、**1 个**、**多个元素**
2. 只需要考虑好**怎么处理一个元素**，其余事项，Beam 会在**框架层面**进行**优化**和**并行**
3. 使用 ParDo 时，需要继承它提供的 **DoFn** 类
   - 可以将 DoFn 看作 ParDo 的**一部分**，ParDo 和 DoFn 是一个**有机整体** 

```java
static class UpperCaseFn extends DoFn<String, String> {
  @ProcessElement
  public void processElement(@Element String word, OutputReceiver<String> out) {
    out.output(word.toUpperCase());
  }
}

PCollection<String> upperCaseWords = words.apply(
    ParDo
    .of(new UpperCaseFn())); 
```

> 编程界面

```java
pcollection.apply(ParDo.of(new DoFn()))
```

### Filter

> 挑出符合条件的元素

```java
@ProcessElement
public void processElement(@Element T input, OutputReceiver<T> out) {
    if (IsNeeded(input)) {
      out.output(input);
    }
  }
```

### Format

> 对数据集进行格式转换

```java
@ProcessElement
  public void processElement(@Element String csvLine, OutputReceiver<tf.Example> out) {
    out.output(ConvertToTfExample(csvLine));
  }
```

### Extract

> 提取数据集中的特定值（属性）

```java
@ProcessElement
  public void processElement(@Element Item item, OutputReceiver<Integer> out) {
    out.output(item.price());
  }
```

## Stateful Transform

> **Statefullness** - side input/side output

1. 简单场景都是**无状态**的
   - 每个 DoFn 的 processElement 函数中，**输出只依赖于输入**
   - 对应的 **DoFn** 类不需要维持一个**成员变量**
2. **无状态的 DoFn** 能保证**最大的并行运算能力**
   - 因为 DoFn 的 processElement 可以分发到**不同的机器**或者**不同的进程**
3. 如果 processElement 的运行需要另外的信息 - **有状态的 DoFn**

```java
static class FindUserNameFn extends DoFn<String, String> {
  @ProcessElement
  public void processElement(@Element String userId, OutputReceiver<String> out) {
    out.output(database.FindUserName(userId));
  }

  Database database;
}
```

1. 因为有了**共享状态**（数据库连接），在使用**有状态的 DoFn** 时，需要格外注意 Beam 的**并行特性**
2. Beam 不仅仅会把**处理函数**分发到**不同线程和进程**，也会分发到**不同的机器**上执行
   - 当共享数据库的读取操作时，很容易引发数据库的 **QPS** 过高

> 需要共享的状态来自于另一些 Beam 的数据处理的中间结果 - **side input/side output**

```java
PCollectionView<Integer> mediumSpending = ...;

PCollection<String> usersBelowMediumSpending =
  userIds.apply(ParDo
      .of(new DoFn<String, String>() {
          @ProcessElement
          public void processElement(@Element String userId, OutputReceiver<String> out, ProcessContext c) {
            int medium = c.sideInput(mediumSpending);
            if (findSpending(userId) <= medium) {
              out.output(userId);
            }
          }
      }).withSideInputs(mediumSpending)
  );
```

1. 需要根据之前处理得到的结果，即用户中位数消费数据，找到消费低于该中位数的用户
2. 可以通过 **side input** 把这个中位数传递进 **DoFn** 中，然后可以在 **ProcessContext** 中取出该 side input 

# 优化

> Beam 中的数据操作都是 **lazy execution**

```java
Pcollection1 = pcollection2.apply(Transform)
```

1. 真正的计算**完全没有被执行**
2. 仅仅只是让 Beam 知道用户的**计算意图**，需要让 Beam 构建数据处理的 **DAG**
3. 然后 Beam 的**处理优化器**会对处理操作进行**优化**

![image-20241120165851206](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241120165851206.png)

1. 没必要**过度优化** DoFn 代码，希望在**一个 DoFn** 中就把所有计算都做了
2. 可以用**分步**的 DoFn 将**计算意图**表达出来，然后交给 Beam 的**优化器**去**合并操作**

