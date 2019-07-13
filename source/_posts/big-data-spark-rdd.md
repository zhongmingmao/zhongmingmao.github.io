---
title: 大数据 -- Spark RDD
mathjax: false
date: 2019-07-06 23:31:07
categories:
    - Big Data
    - Spark
tags:
    - Big Data
    - Spark
    - RDD
---

## 新的数据抽象模型
1. 传统的MapReduce框架运行缓慢
    - 有向无环图的**中间计算结果**需要写入**硬盘**来防止运行结果丢失
    - 每次调用中间计算结果都需要重新进行一次硬盘的读取
        - 反复对硬盘进行**读写**操作以及潜在的**数据复制**和**序列化**操作大大地提高了计算的延迟
2. RDD是一个基于**分布式内存**的数据抽象，不仅支持基于**工作集**的应用，同时具有**数据流**模型的特点

<!-- more -->

## RDD的定义
RDD表示**已被分区**、**不可变的**、并能够被**并行操作**的数据集合

### 分区
1. 分区代表**同一个RDD包含的数据被存储在系统的不同节点中**，这是RDD可以**被并行处理的前提**
2. 逻辑上，可以认为RDD是一个大数组，数组中的每个元素代表一个分区
3. 在物理存储中，每个分区指向一个存放在内存或硬盘中的**数据块**，数据块是独立的，可以被存放在系统的不同节点
4. _**RDD只是抽象意义的数据集合，分区内部并不会存储具体的数据**_
5. RDD中的每个分区都存有它在该RDD中的index，通过**RDD的ID**和**分区的index**可以唯一确定对应的**数据块编号**
    - 从而通过**底层存储层的接口**提取到数据进行处理
6. 在集群中，各个节点上的数据会**尽可能地放在内存**中，只有当内存没有空间时才会存入硬盘，**最大化地减少硬盘读写的开销**
7. **RDD内部存储的数据是只读的**，但可以修改并行计算单元的划分结构，即**可以修改分区的数量**

<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-spark-rdd-partition.jpg" width=1000/>

### 不可变性
1. 不可变性代表**每个RDD都是只读的**，它**所包含的分区信息不可以被改变**
2. 已有的RDD不可以被改变，只能对现有的RDD进行**转换**操作，得到**新的RDD**作为**中间计算结果**
3. 对于中间结果的RDD，只需记录该RDD是通过哪个RDD进行转换操作得来的，即**依赖关系**，而**不必立刻去具体存储进行计算**
    - 有助于**提升Spark的计算效率**，并且**使错误恢复更加容易**
4. **容错特性**
    - 对于有N步的计算模型，如果记载第N步输出RDD的节点发生故障，数据丢失
    - 可以从第N-1步的RDD出发，再次计算，**无需重复整个N步计算过程**
    - 这种容错特性也是RDD为什么是一个**弹性**的数据集的原因

```java
// 读入文本文件data.txt，创建第一个RDD lines，每个元素是一行文本
lines = sc.textFile("data.txt")

// 调用map函数去映射产生第二个RDD lineLengths，每个元素代表每一行简单文本的字数
lineLengths = lines.map(lambda s: len(s))

// 调用reduce函数去得到第三个RDD totalLength，只有一个元素，代表整个文本的总字数
totalLength = lineLengths.reduce(lambda a, b: a + b)
```

### 并行操作
由于单个RDD的**分区**特性，使得RDD**天然支持并行操作**，即不同节点上的数据可以被分别处理，然后产生一个新的RDD

## RDD的结构
<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-spark-rdd-structure.png" width=800/>

1. SparkContext是**所有Spark功能的入口**，它代表了与Spark节点的连接，用来创建RDD对象以及在节点中的广播变量
    - 一个线程只有一个SparkContext
2. Partitions代表RDD中**数据的逻辑结构**，每个Partition都会映射到某个节点内存或硬盘的一个**数据块**
3. Partitioner决定了RDD的**分区方式**，目前有两种主流的分区方式：**Hash** partitioner、**Range** partitioner

### 依赖关系
1. Dependencies是RDD中最重要的组件之一
2. Spark不需要将每个中间计算结果进行数据复制以防止数据丢失，因为每一步产生的RDD里面都会存储它的依赖关系
3. Spark支持两种依赖关系：**窄依赖**（Narrow Dependency）、**宽依赖**（Wide Dependency）
    - 窄依赖：父RDD的分区可以**一一对应**到子RDD的分区
        - 窄依赖允许子RDD的每个分区可以被**并行处理**产生
    - 宽依赖：**父RDD的分区可以被多个子RDD的分区使用**
        - 宽依赖_**必须等父RDD的所有分区都被计算好之后才能开始处理**_
4. 区分窄依赖和宽依赖的原因
    - 窄依赖可以支持在**同一个节点**上**链式**执行多条命令，而宽依赖需要**所有的父分区**都是**可用**的
    - **窄依赖的失效恢复更有效**，因为只需要重新计算丢失的父分区即可，而宽依赖涉及到RDD各级的父分区

#### 窄依赖
<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-spark-rdd-narrow-dependency.jpg" width=800/>

#### 宽依赖
<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-spark-rdd-wide-dependency.jpg" width=800/>

### 检查点
1. 基于RDD的依赖关系，如果任意一个RDD在相应的节点丢失，只需要从上一步的RDD出发再次计算，就能恢复该RDD
    - 如果一个RDD的**依赖链比较长**，而且**中间又有多个RDD出现故障**的话，进行恢复可能会非常耗费**时间**和**计算资源**
    - 检查点的引入，就是为了优化这些情况下的数据恢复
2. 在计算过程中，对于一些计算过程**比较耗时**的RDD
    - 可以将它**缓存至硬盘或HDFS**中
    - 标记这个RDD被检查点处理过，并**清空**它的**所有依赖关系**，同时给它新建一个依赖于**CheckpointRDD**的依赖关系
    - **CheckpointRDD可以用来从硬盘中读取RDD并生成新的分区信息**
3. 当某个子RDD需要错误恢复时，回溯至该RDD，发现它被检查点记录过
    - 就可以**直接去硬盘中读取该RDD**，而无需再往前回溯计算

### 存储级别
1. 存储级别是一个枚举类型，用来记录**RDD持久化**时的存储级别
    - MEMORY_ONLY：只缓存在内存中，如果内存空间不够则不缓存多出来的部分，**默认值**
    - MEMORY_AND_DISK：缓存在内存中，如果空间不够则缓存在硬盘中
    - DISK_ONLY：只缓存在硬盘中
    - MEMORY_ONLY_2、MEMORY_AND_DISK_2：与上面功能相同，只不过每个分区在集群的两个节点上建立副本
2. Spark相比于Hadoop在性能上的提升，可以随时把计算好的RDD缓存在内存中，大幅减少磁盘读写的开销

### 迭代函数
1. 迭代函数（Iterator）和计算函数（Compute）用来表示**RDD怎样通过父RDD计算得到的**
2. 迭代函数首先会判断**缓存**中是否有想要计算的RDD
    - 如果有就直接读取，如果没有就查找想要计算的RDD是否被**检查点**处理过，如果有，就直接读取
    - 如果没有就调用**计算函数**向上**递归**，查找**父RDD**进行计算

## RDD的数据操作
1. RDD的数据操作分为两种：**转换**（Transformation）和**动作**（Action）
2. 转换：把一个RDD转换为另一个RDD
3. 动作：通过计算返回一个结果

### 转换

#### Map
把一个RDD中的所有数据通过一个函数，映射成一个新的RDD，任何原RDD中的元素在新RDD中都**有且只有一个**元素与之对应
```java
rdd = sc.parallelize(["b", "a", "c"])
rdd2 = rdd.map(lambda x: (x, 1)) // [('b', 1), ('a', 1), ('c', 1)]
```

#### Filter
选择原RDD里所有数据中满足特定条件的数据，去返回一个新的RDD
```java
rdd = sc.parallelize([1, 2, 3, 4, 5])
rdd2 = rdd.filter(lambda x: x % 2 == 0) // [2, 4]
```

#### mapPartitions
1. mapPartitions是map的变种，
    - map的输入函数是应用于RDD中每个**元素**
    - mapPartitions的输入函数式应用于RDD的每个**分区**，将每个分区中的内容作为整体来处理

```java
// 创建了两个分区的RDD，mapPartitions的输入函数是对每个分区内的元素求和，1+2=3，3+4=7
rdd = sc.parallelize([1, 2, 3, 4], 2)
def f(iterator): yield sum(iterator)
rdd2 = rdd.mapPartitions(f) // [3, 7]
```

#### groupByKey
```java
rdd = sc.parallelize([("a", 1), ("b", 1), ("a", 2)])
rdd.groupByKey().collect()
//"a" [1, 2]
//"b" [1]
```

### 动作

#### collect
1. RDD中的collect操作与函数式编程中的collect类似，会以**数组**的形式，返回RDD的**所有元素**
2. collect操作只有在数组所含的数据量较小的时候使用，如果数据量较大，会占用JVM内存，导致**内存溢出**

```java
rdd = sc.parallelize(["b", "a", "c"])
rdd.map(lambda x: (x, 1)).collect() // [('b', 1), ('a', 1), ('c', 1)]
```

#### reduce
reduce操作与MapReduce中的reduce类似，会把RDD中的元素根据一个输入函数聚合起来
```python
from operator import add
sc.parallelize([1, 2, 3, 4, 5]).reduce(add)  // 15
```

#### count
count操作会返回RDD中元素的个数
```java
sc.parallelize([2, 3, 4]).count() // 3
```

#### countByKey
countByKey操作仅适用于**键值对**类型的RDD，返回具有每个Key计数的<Key,Count>的map
```java
rdd = sc.parallelize([("a", 1), ("b", 1), ("a", 1)])
sorted(rdd.countByKey().items()) // [('a', 2), ('b', 1)]
```

### 区别
1. 所有**转换操作**都很懒，只是**生成新的RDD**，并且**记录依赖关系**，但Spark**不会立刻计算**出新RDD中各个分区的数值
2. 直到遇到一个**动作**时，**数据才会被计算，并且输出结果给Driver**
3. 这种**惰性求值**的方式可以让Spark的运算更加**高效**和**快速**

### 操作流程
1. Spark在每次**转换**操作时，使用新产生的RDD来**记录计算逻辑**，这样把作用在RDD上的所有计算逻辑串连起来形成一个**链条**
2. 当对RDD执行**动作**时，Spark会从计算链的**最后一个RDD开始**，依次从上一个RDD获取数据并执行计算逻辑，最后输出结果

## RDD的持久化（缓存）
1. 每当对一个RDD调用新的**动作**操作时，整个RDD都会**从头开始**运算
2. 如果某个RDD会被反复重用的话，每次都从头计算是非常低效的，应该对**多次使用的RDD**进行一个**持久化**操作
3. Spark的**persist**和**cache**（默认：**MEMORY_ONLY**）方法支持将RDD的数据缓存至**内存**或**硬盘**中
    - 当下次对**同一个RDD**进行**动作**操作时，可以**直接读取**RDD的结果，大幅提高Spark的计算效率
4. 在缓存RDD时，它**所有的依赖关系**也会被一并存下来，所以**持久化RDD**有_**自动的容错机制**_
    - 如果RDD的任一分区丢失了，通过使用**原先创建它的转换操作**，它将被**自动重算**

```java
rdd = sc.parallelize([1, 2, 3, 4, 5])
rdd1 = rdd.map(lambda x: x+5)
rdd2 = rdd1.filter(lambda x: x % 2 == 0)
// 后续对rdd2进行了多个不同的动作操作，先执行persist操作
rdd2.persist()
// 无论是count还是first，Spark都不需要从头开始计算
count = rdd2.count() // 3
first = rdd2.first() // 6
rdd2.unpersist()
```
