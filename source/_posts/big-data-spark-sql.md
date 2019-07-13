---
title: 大数据 -- Spark SQL
mathjax: false
date: 2019-07-07 17:39:25
categories:
    - Big Data
    - Spark
    - Spark SQL
tags:
    - Big Data
    - Spark
    - Spark SQL
---

## 发展历史
1. 几年前，Hadoop/MapReduce在企业生产中大量使用，HDFS上积累了大量数据
2. 由于MapReduce对于开发者而言使用难度较大，大部分开发者最熟悉的还是传统的关系型数据库，Hive应运而生
3. Hive提供了类似**SQL**的编程接口，HQL语句经过语法解析、逻辑计划、物理计划转化成MapReduce程序执行
    - 使得开发人员很容易对HDFS上存储的数据进行查询和分析
4. Spark刚问世时，Spark团队也开发了**Shark**来支持用SQL语言来查询Spark的数据
    - **Shark的本质就是Hive**，它修改了Hive的内存管理模块，大幅优化了运行速度，是Hive的10~100倍
5. Shark对于Hive的依赖严重影响了Spark的发展，Spark想定义的是一个**统一的技术栈**和**完整的生态**
    - 依赖于Hive还制约了Spark各个组件的相互集成，Shark也无法利用Spark的特性进行深度优化
6. 2014年7月1日，Spark团队将Shark交给Hive管理，转而开发Spark SQL
7. Spark SQL放弃了Shark的执行引擎（将SQL语句转化为Spark RDD），重新开发新的执行引擎
8. Spark SQL不仅将**关系型数据库的处理模式**和**Spark的函数式编程**相结合，还兼容多种数据格式
    - 包括Hive、RDD、JSON文件、CSV文件等
9. Spark SQL的问世大大加快了Spark生态的发展

<!-- more -->

<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-spark-sql-history.png" width=1000/>

## Spark SQL的架构
<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-spark-sql-architecture.png" width=1000/>

1. Spark SQL本质上是一个库，运行在Spark的核心执行引擎之上
2. Spark SQL提供类似SQL的操作接口，允许**数据仓库应用程序**直接获取数据，允许使用者通过**命令行**操作来交互地查询数据
3. Spark SQL还提供了**DataFrame API**和**DataSet API**
    - Java、Python、Scala的应用程序可以通过这两个API来**读取和写入RDD**
4. 使用Spark SQL会让开发者觉得好像在操作一个关系型数据库一样，而不是在操作RDD，优于原生的RDD API
5. 与基本的Spark RDD API不同，Spark SQL提供的接口为Spark提供了关于**数据结构**和**正在执行的计算**的更多信息
    - 在内部，Spark SQL使用这些**额外的信息**来执行**额外的优化**
    - 虽然Spark SQL支持多种交互方式，但在**计算结果**时均**使用相同的执行引擎**

### DataSet
1. DataSet是**数据集**的意思，是在Spark 1.6新引入的接口
2. 与RDD类似，DataSet也是**不可变分布式的数据单元**
3. 有与RDD类似的各种**转换**和**动作**函数定义，**享受Spark SQL优化过的执行引擎**，使得数据搜索效率更高
4. DataSet上的**转换**操作也不会被立即执行，只是先生成新的DataSet
    - 只有当遇到**动作**操作，才会把之前的转换操作一并执行，生成结果
5. DataSet的内部结构包含了**逻辑计划**，即生成该数据集所需要的运算
6. 当**动作**操作执行时，Spark SQL的**查询优化器**会优化**逻辑计划**，并生成一个可以**分布式执行的、包含分区信息的物理计划**
7. DataSet和RDD的区别
    - DataSet API是Spark SQL的一个组件，DataSet也具有关系型数据库中**表**的特性
    - DataSet所描述的数据都被组织到**有名字的列**中，就如同**关系型数据库中的表**一样
    - RDD虽然以People为类型参数，但**Spark框架本身并不了解People类的内部结构**，所有操作都以People为单位执行
    - DataSet提供了数据表的**Schema**信息，这样的结构使得DataSet API的**执行效率更高**
    - 由于DataSet存储了每列的数据类型，因此，在程序**编译时**可以执行**类型检测**

<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-spark-sql-rdd-dataset.png" width=1000/>

### DataFrame
1. **DataFrame可以看作一种特殊的DataSet**，也是关系型数据库中表一样的结构化存储机制，也是分布式不可变的数据结构
2. DataFrame的**每一列并不存储类型信息**，所以在**编译时并不能发现类型错误**
3. DataFrame的每一行的类型固定为ROW，可以被当做DataSet[ROW]来处理，必须通过**解析**才能获取各列的值
4. 对于DataSet，用类似`people.name`来访问，对于DataFrame，用类似`people.get As [String]("name")`来访问

## RDD、DataFrame、DataSet
| | RDD | DataFrame | DataSet|
| ---- | ---- | ---- | ---- |
| 不可变性 | Y | Y | Y |
| 分区 | Y | Y | Y |
| Schema | N | Y | Y |
| 查询优化器 | N | Y | Y |
| API级别 | 低 | 高（底层基于RDD实现） | 高（DataFrame的扩展） |
| 是否存储类型 | Y | N | Y |
| 何时检测语法错误 | 编译时 | 编译时 | 编译时 |
| 何时检测分析错误 | 编译时 | 运行时 | 编译时 |

### 发展历史
1. RDD API在第一代Spark中就存在，是整个Spark框架的**基石**
2. 为了方便熟悉关系型数据库和SQL的开发者使用，在RDD的基础上，Spark创建了DataFrame API
3. DataSet最早被加入Spark SQL是在Spark 1.6，在**DataFrame的基础**上添加了对数据的每一列的类型的限制
4. 在Spark 2.0，DataFrame和DataSet**被统一**，DataFrame作为DataSet[ROW]存在
    - 在弱类型语言中，如Python，DataFrame API依然存在，但在Java中，DataFrame API已经没有了

### 不变性 + 分区
1. 由于DataFrame和DataSet都是基于RDD的，所以它们都**拥有RDD的基本特性**
2. 可以通过简单的API在DataFrame或DataSet与RDD之间进行**无缝切换**

### 性能
1. **DataFrame和DataSet的性能要比RDD更好**
2. Spark程序运行时，Spark SQL中的查询优化器会对语句进行分析，并生成**优化过的RDD**在底层执行
3. 场景：先对一堆数据进行GroupBy，再进行Filter，这**非常低效**，因为并不需要对所有数据都GroupBy
    - RDD API：只会**机械地按顺序执行**
    - DataFrame/DataSet API：Spark SQL的Catalyst优化器会将Filter操作和GroupBy操作**调换顺序**，从而**提高执行效率**

<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-spark-sql-dataframe-dataset-opt.png" width=800/>

### 错误检测
1. **RDD和DataSet都是类型安全的，而DataFrame并不是类型安全的**，因为DataFrame并不存储每一列的信息如名字和类型
2. 使用DataFrame API，可以选择一个**不存在的列**，只有在**运行时**才会被检测到，而使用DataSet API，在**编译时**就会被检测到

## 小结
1. DataFrame和DataSet是Spark SQL提供的_**基于RDD的结构化数据抽象**_
2. DataFrame和DataSet即具有**不可变、分区、存储依赖关系**等特性，又拥有类似关系型数据库的**结构化信息**
3. 基于DataFrame/DataSet开发出来的程序会被**自动优化**，开发者无需操作底层RDD API来进行手动优化，**大大提升开发效率**
4. 但使用RDD API对于**非结构化**的数据处理有独特的优势，例如文本**流数据**，而且使用RDD API做**底层的操作**更方便
