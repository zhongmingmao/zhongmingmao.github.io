---
title: Spark - RDD
mathjax: true
date: 2024-09-18 00:06:25
cover: https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/bigdata-spark-rdd.jpg
categories:
  - Big Data
  - Spark
tags:
  - Big Data
  - Spark
  - RDD
---

# 分布式内存

1. 传统的 **MapReduce** 框架**运行缓慢**，主要原因是 **DAG** 的**中间计算结果**需要写入**硬盘**来**防止运行结果丢失**
2. 每次调用中间计算结果都需要进行一次硬盘的读取
   - 反复对硬盘进行**读写**操作以及潜在的**数据复制**和**序列化**操作会大大地提高了**计算延迟**
3. 新的**分布式存储**方案 - 保持之前系统的稳定性、错误恢复和可扩展性，并**尽可能地减少硬盘 IO 操作**
   - RDD 是基于**分布式内存**的数据抽象，不仅支持基于**工作集**的应用，同时具有**数据流模型**的特点

<!-- more -->

# 定义

## 分区

1. 分区代表**同一个 RDD** 包含的数据被**存储**在系统的**不同节点**上，这是可以**被并行处理**的前提
2. 在**逻辑**上，可以认为 **RDD** 是一个**大数组**，数组中的每个**元素**代表一个**分区**（**Partition**）
3. 在**物理存储**中，每个**分区**指向一个存放在**内存**或者**硬盘**中的**数据块**（**Block**）
   - Block 是**独立**的，可以被存放在分布式系统中的**不同节点**
4. RDD 只是**抽象意义**的**数据集合**，分区内部并不会存储具体的数据

![image-20241117230114736](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241117230114736.png)

1. RDD 中的每个**分区**都有它在该 RDD 中的 **Index**
2. 通过 **RDD_ID** 和 **Partition_Index** 可以**唯一确定**对应 **Block** 的编号
   - 从而通过**底层存储层**的接口中提取到数据进行处理
3. 在集群中，各个节点的 **Block** 会**尽可能**地存放在**内存**中，只有在**内存不足**时，才会写入**硬盘**
   - 可以最大化地减少硬盘读写的开销
4. RDD **内部存储**的数据是**只读**的，但可以修改**并行计算单元**的**划分结构**，即**分区数量**

## 不可变

1. 不可变性代表每个 **RDD** 都是**只读**的，RDD 所包含的**分区信息**是**不可以被改变**的
2. 已有的 RDD 不可以被改变
   - 只能对现有的 RDD 进行**转换**（**Transformation**）操作，得到新的 RDD 作为**中间计算的结果**
   - **RDD** 与**函数式编程**的 **Collection** 很相似

```scala
lines = sc.textFile("data.txt")
lineLengths = lines.map(lambda s: len(s))
totalLength = lineLengths.reduce(lambda a, b: a + b)
```

1. 读入文本文件 data.txt，创建第一个 RDD lines，每一个**元素**就是**一行文本**
2. 调用 map 函数去映射产生第二个 RDD lineLengths，每一个**元素**代表每一行简单文本的**字数**
3. 调用 reduce 函数得到第三个 RDD totalLength，**只有一个元素**，代表整个文本的**总字数**

> 优势

1. 对于代表**中间结果**的 **RDD**，需要记录它是通过哪个 RDD 进行了哪些转换操作得到的，即**依赖关系**
   - 而**无需立即**去**具体存储**计算出的数据本身
2. 有助于提升 Spark 的**计算效率**，并且使得**错误恢复**更容易
   - 在一个有 N 步的计算模型中，如果记载第 **N** 步输出 RDD 的**节点**发生了**故障**，导致**数据丢失**
   - 可以从第 **N-1** 步的 RDD 出发，再次计算，**无需重复整个 N 步计算过程**
   - 这种**容错**机制，也是 RDD 为什么是 **Resilient** 的原因

## 并行计算

1. 由于单个 RDD 的**分区**特性，使得它天然支持**并行**操作
2. **不同节点**上的数据可以被**分别处理**，然后**产生一个新的 RDD**

# 结构

![image-20241117233647328](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241117233647328.png)

1. **SparkContext** 是**所有 Spark 功能的入口**
   - 代表了**与 Spark 节点的连接**，可以用来**创建 RDD 对象**，在节点中**广播变量**等
   - **一个线程**只有**一个 SparkContext**
2. **SparkConf** 是一些**参数配置信息**
3. **Partitions** 代表 RDD 中**数据的逻辑结构**
   - 每个 **Partition** 会映射到**某个节点**上**内存**或者**硬盘**的一个 **Block**
4. **Partitioner** 决定了 **RDD** 的**分区方式**，主流的分区方式有两种：**Hash partitioner** 和 **Range partitioner**
   - Hash - 对数据的 Key 进行**散列分区**
   - Range - 按照 Key 的排序进行**均匀分区**

## 依赖关系

1. **Dependencies** 是 RDD 中**最重要**的组件之一
2. Spark 不需要将**每个中间计算结果**进行**数据复制**以**防止数据丢失**
   - 每一步产生的 RDD 里都会存储它的**依赖关系**
   - 依赖关系 - 当前的 RDD 是通过哪个 RDD 经过哪个转换操作得到的
3. 窄依赖 vs 宽依赖
   - **窄依赖** - 允许子 RDD 的**每个分区**可以被**并行处理**产生
     - map - 一个父 RDD 分区里的数据不会分散到不同的子 RDD 分区
   - **宽依赖** - 必须等**父 RDD 的所有分区都被计算好**之后才能开始处理
     - groupBy - 一个父 RDD 分区里可能有多种 Key 的数据，因此可能被子 RDD 不同的分区所依赖
4. **同一节点 + 链式执行**
   - **窄依赖**可以支持**同一个节点**上**链式执行**多条命令，map -> filter
   - **宽依赖**需要**父 RDD 的所有分区**都是可用的，可能还需要调用类似 MapReduce 之类的操作进行**跨节点传递**
5. **失败恢复**
   - **窄依赖**的失败恢复**更有效**，因为只需要**重新计算丢失的父分区**即可
   - **宽依赖**，则牵涉 RDD 各级的**多个父分区**

### 窄依赖

> Narrow Dependency - 父 RDD 的分区可以**一一对应**到子 RDD 的分区

![image-20241117234852574](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241117234852574.png)

### 宽依赖

> Wide Dependency - **父 RDD 的每个分区可以被多个子 RDD 的分区使用**

![image-20241117235058972](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241117235058972.png)

## 检查点

> Checkpoint

1. 基于 RDD 的依赖关系，如果任意一个 RDD 在相应的节点丢失
   - 只需从**上一步的 RDD** 出发再次计算，便可恢复该 RDD
2. 如果一个 RDD 的**依赖链比较长**，而且中间有**多个 RDD 出现故障**，进行恢复会非常**耗费**时间和计算资源
   - 引入检查点，可以优化这些情况下的**数据恢复**
3. 很多**数据库系统**都有检查点机制
   - 在连续的 transaction 列表中记录某几个 transaction 后数据的**内容**，从而加快错误恢复
4. 在计算过程中，对于一些计算过程比较**耗时**的 RDD
   - 将它缓存至**硬盘**或者 **HDFS**，标记该 RDD 被检查点**处理过**，并且**清空**它的**所有依赖关系**
   - 同时，新建一个依赖于 **CheckpointRDD** 的依赖关系
     - **CheckpointRDD** 可以从**硬盘**中**读取 RDD** 和**生成新的分区信息**
5. 当某个子 RDD 需要错误恢复时，回溯到该 RDD，发现它被检查点**记录过**
   - 直接去**硬盘**读取该 **RDD**，而**无需再向前回溯计算**

## 存储级别

> Storage Level - **枚举**类型，用来记录 RDD **持久化**时的存储级别

| Storage Level                     | Desc                                                   |
| --------------------------------- | ------------------------------------------------------ |
| **MEMORY_ONLY - 默认值**          | 只缓存在内存中，如果内存不足则不缓存多出来的部分       |
| MEMORY_AND_DISK                   | 缓存在内存中，如果空间不够则缓存在硬盘中               |
| DISK_ONLY                         | 只缓存在硬盘中                                         |
| MEMORY_ONLY_2 / MEMORY_AND_DISK_2 | 同上，**每个分区**在集群中的**两个节点**上建立**副本** |

> 相对于 Hadoop，随时可以将**计算好的 RDD** 缓存在**内存**中，以便于下次计算时使用

## 迭代 + 计算

> Iterator + Compute - 表示 RDD 怎样通过**父 RDD** 计算得到的

1. **迭代函数**会首先判断**缓存**中是否有想要计算的 RDD，如果有则**直接读取**
2. 如果没有，则检查想要计算的 RDD 是否被**检查点**处理过，如果有则**直接读取**
3. 如果没有，就**调用计算函数向上递归**，查找父 RDD 进行计算

> **缓存 -> 检查点**

# 操作

## 转换 - Transformation

1. MapReduce 只支持 Map 和 Reduce 操作，而 Spark 支持大量的基本操作
2. 转换 - 将一个 RDD 转换为另一个 RDD

### Map

1. 将一个 RDD 中的所有数据通过一个函数，映射成一个新的 RDD
2. 任何原 RDD 中的元素在新 RDD 中都**有且只有一个**元素与之对应

```scala
rdd = sc.parallelize(["b", "a", "c"])
rdd2 = rdd.map(lambda x: (x, 1)) // [('b', 1), ('a', 1), ('c', 1)]
```

### Filter

> 选择原 RDD 里所有数据中**满足特定条件**的数据，返回一个新的 RDD

```scala
rdd = sc.parallelize([1, 2, 3, 4, 5])
rdd2 = rdd.filter(lambda x: x % 2 == 0) // [2, 4]
```

### MapPartitions

1. MapPartitions 是 Map 的变种
2. Map 的输入函数应用于 **RDD 中的每个元素**
3. MapPartitions 的输入函数应用于 **RDD 中的每个分区**，将**每个分区中的内容**作为**整体**来处理

```scala
rdd = sc.parallelize([1, 2, 3, 4], 2) // 创建一个有两个分区的 RDD
def f(iterator): yield sum(iterator) // 对分区内的元素求和，1+2=3 / 3+4=7
rdd2 = rdd.mapPartitions(f) // [3, 7]
```

### GroupByKey

1. 与 SQL 中的 groupBy 类似，将对象的集合**按照某个 Key 来归类**
2. 返回的 RDD 中的**每个 Key** 对应**一个序列**

```scala
rdd = sc.parallelize([("a", 1), ("b", 1), ("a", 2)])
rdd.groupByKey().collect()
//"a" [1, 2]
//"b" [1]
```

## 动作 - Action

> 动作 - 通过计算返回一个结果

### Collect

1. Collect 与**函数式编程**中的 Collect 类似，以**数组**的形式，返回 RDD 的**所有元素**
2. Collect 操作只有在**输出数组较小**时使用
   - 因为所有的数据都会载入到程序的**内存**中，如果**输出数组很大**，则会**占用大量 JVM 内存**，导致**内存溢出**

```scala
rdd = sc.parallelize(["b", "a", "c"])
rdd.map(lambda x: (x, 1)).collect() // [('b', 1), ('a', 1), ('c', 1)]
```

### Reduce

> 与 MapReduce 中的 Reduce 类似，将 RDD 中的元素根据一个**输入函数**聚合起来

```scala
from operator import add
sc.parallelize([1, 2, 3, 4, 5]).reduce(add)  // 15
```

### Count

> 返回 RDD 中元素的个数

```scala
sc.parallelize([2, 3, 4]).count() // 3
```

### CountByKey

> 仅适用于 **Key-Value Pair** 类型的 RDD，返回具有每个 Key 的计数的 Key-Count 字典

```scala
rdd = sc.parallelize([("a", 1), ("b", 1), ("a", 1)])
sorted(rdd.countByKey().items()) // [('a', 2), ('b', 1)]
```

## 惰性求值

1. 所有的**转换**操作都**很懒**，只是**生成新的 RDD**，并且**记录依赖关系**
2. Spark 并**不会立刻计算**出新 RDD 中各个分区的数值
   - 直到**遇到一个动作**时，**数据才会被计算**，并输出结果给 **Driver**
3. 惰性求值的设计可以让 Spark 的运算更加**高效**和**快速**

## 执行流程

1. Spark 在每次**转换**操作时，使用了**新产生的 RDD** 来**记录计算逻辑**
   - 把作用在 RDD 上的所有计算逻辑**串联**起来，形成一个**链条**
2. 当 RDD 进行**动作**操作时
   - Spark 会从**计算链**的**最后一个 RDD** 开始，依次从**上一个 RDD** 获取数据并执行计算逻辑，最后输出结果

# 持久化 - 缓存

> 类似于 Guava LoadingCache

1. 每当对 RDD 调用一个新的**动作**操作时，**整个 RDD** 都会**从头开始运算**
2. 如果某个 RDD 会被**反复重用**的话，每次都重头计算**非常低效** -- 进行**持久化**操作
3. Spark 的 **persist()** 和 **cache()** 方法支持将 **RDD 的数据**缓存值**内存**或**硬盘**中
   - 下次对**同一 RDD** 进行**动作**操作时，可以直接读取 RDD 的结果，大幅提高 Spark 的**计算效率**
4. 缓存 RDD 时，其**所有的依赖关系**也会被一并保存
   - 持久化的 RDD 有**自动的容错机制**
   - 如果 RDD 的**任一分区丢失**了，通过使用原先创建它的**转换**操作，会被**自动重算**
5. 持久化可以选择不同的**存储级别**，而 **cache()** 方法的默认值为 **MEMORY_ONLY**

```scala
rdd = sc.parallelize([1, 2, 3, 4, 5])
rdd1 = rdd.map(lambda x: x+5)
rdd2 = rdd1.filter(lambda x: x % 2 == 0)
rdd2.persist() // 等待第一次动作操作，将结果缓存在内存中
count = rdd2.count() // 3，第一次动作操作，从头开始计算，将结果存储下来
first = rdd2.first() // 6，不是第一次动作操作，无需从头开始计算，复用缓存结果
rdd2.unpersist()
```

> 持久化 vs Checkpoint

1. Checkpoint 是在 **Action** 后执行的，相当于**事务完成**后**备份结果**
   - 既然结果有了，之前的**计算过程**，即 **RDD 的依赖链**，也不需要了，**不必保存**
2. 持久化（persist or cache）只是保存**当前 RDD**，并不要求在 **Action** 后调用
   - 相当于**事务的计算过程**，还没有结果
   - 既然没有结果，当需要恢复、重新计算时就需要**重放计算过程**，自然就不能放弃之前的**依赖链**，需要**保存**
   - 需要恢复时，从**最初**或者**最近的 Checkpoint** 开始**重新计算**
