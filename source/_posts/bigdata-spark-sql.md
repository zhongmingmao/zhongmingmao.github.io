---
title: Spark - SQL
mathjax: true
date: 2024-09-19 00:06:25
cover: https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/bigdata-spark-sql.webp
categories:
  - Big Data
  - Spark
tags:
  - Big Data
  - Spark
---

# 历史

## Hive

1. 一开始，**Hadoop/MapReduce** 在企业生产中大量使用，在 **HDFS** 上积累了大量数据
2. **MapReduce** 对于开发者而言**使用难度**较大，大部分开发人员最熟悉的还是**传统的关系型数据库**
3. 为了方便大多数开发人员使用 Hadoop，诞生了 **Hive**
4. Hive 提供类似 **SQL** 的编程接口，**HQL** 经过**语法解析**、**逻辑计划**、**物理计划**转化成 **MapReduce** 程序执行
   - 使得开发人员很容易对 **HDFS** 上存储的数据进行**查询**和**分析**

<!-- more -->

## Shark

1. 在 Spark 刚问世时，Spark 团队开发了 **Shark** 来支持用 **SQL** 来查询 **Spark** 的数据
2. Shark 的本质是 **Hive**，Shark 修改了 Hive 的**内存管理模块**，大幅优化了**运行速度**
3. Shark **依赖**于 Hive，严重影响了 Spark 的发展，Spark 要定义一个**统一的技术栈**和**完整的生态**
4. 依赖于 Hive 还会制约 Spark 各个组件的**相互集成**，Spark 无法利用 Spark 的特性进行**深度优化**
5. 2014 年 7 月 1 日，Spark 团队将 **Shark** 交给 **Hive** 进行管理，即 **Hive on Spark**，转而开发 **Spark SQL**

![image-20241118100607648](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241118100607648.png)

## Spark SQL

1. Spark SQL 摒弃了 Shark 的执行引擎，换成**重新开发的执行引擎**
2. Spark SQL 不仅将**关系型数据库的处理模式**和 **Spark 的函数式编程**相结合
   - 还兼容多种数据格式 - Hive、RDD、JSON 文件、CSV 文件等
3. Spark SQL 大大加快了 Spark 生态的发展

# 架构

![image-20241118101250721](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241118101250721.png)

1. Spark SQL 本质上是一个 **Library**，运行在 **Spark** 的**核心执行引擎**之上
2. Spark SQL 提供类似于 **SQL** 的操作接口
   - 允许**数据仓库应用**直接获取数据
   - 允许使用者通过**命令行**操作来**交互**地查询数据
   - 还提供两个 API - **DataFrame** API + **DataSet** API
     - **Java**、**Python** 和 **Scala** 应用程序可以通过这两个 API 来读取和写入 RDD
3. 应用程序还可以**直接操作** RDD
4. 使用 Spark SQL，开发者会觉得好像在操作一个**关系型数据库**一样，而不是在操作 **RDD**
5. 与基本的 **Spark RDD API** 不同，Spark SQL 的接口提供了关于**数据结构**和**正在执行的计算**的更多信息
   - 在内部，Spark SQL 使用这些**额外的信息**来执行**额外的优化**
6. Spark SQL 支持**多种交互方式**，但在**计算结果**时均使用**相同的执行引擎**，可以在不同 API 之间**来回切换**

## DataSet

1. DataSet 即**数据集**，是 **Spark 1.6** 新引入的接口
2. 与 RDD 类似，DataSet 也是**不可变分布式的数据单元**
   - 既有与 RDD 类似的各类**转换**和**动作**函数的定义
   - 还享受 Spark SQL **优化过的执行引擎**，使得**数据搜索效率更高**
3. DataSet 支持的**转换**和**动作**与 RDD 类似 - map、filter、count 等
4. 与 RDD 类似，DataSet 上的**转换**操作**不会被立即执行**
   - 先**生成新的 DataSet**，只有遇到**动作**操作，才会把之前的转换操作**一并执行**，生成结果
5. DataSet 的内部结构包含了**逻辑计划**，即**生成该数据集所需要的运算**
   - 当**动作**操作执行时，Spark SQL 的**查询优化器**会**优化该逻辑计划**
   - 并生成一个可以**分布式执行**、包含**分区信息**的**物理计划**

> DataSet vs RDD

1. **DataSet API** 是 **Spark SQL** 的一个组件，DataSet 具有**关系型**数据库表中的**特性**
2. DataSet 所描述的数据都被组织到**有名字的列**中，就像关系型数据库中的**表**一样

![image-20241118103637661](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241118103637661.png)

1. **RDD** 以 People 为类型参数，但 Spark 框架本身**并不了解** People 类的**内部结构**，所有操作都以 People 为**单位**
2. **DataSet** 提供详细的**结构信息**和每列的**数据类型**
   - DataSet 为 Spark SQL 提供了**数据表**的 **Schema** 信息，使得 DataSet API 的**执行效率更高**
   - 由于 DataSet 存储了每列的数据类型，在**程序编译**时可以执行**类型检测**

## DataFrame

1. DataFrame 是一种**特殊的 DataSet**
   - DataFrame 也是**关系型数据库**中**表**一样的**结构化存储机制**，也是**分布式不可变**的数据结构
2. 但 DataFrame 的**每一列并不存储类型信息**，所以在**编译过程**并不能发现**类型错误**
   - DataFrame 每一**行**的**类型**固定为 **Row**，可以被当作 **DataSet[Row]** 来处理
   - 必须要通过**解析**才能获取到**各列的值** - 类似于某些 JSON 库的处理
     - DataSet - people.name
     - DataFrame - `people.get As [String]("name")`

## RDD / DataFrame / DataSet

|                  | RDD    | DataFrame               | DataSet                |
| ---------------- | ------ | ----------------------- | ---------------------- |
| 不可变性         | Yes    | Yes                     | Yes                    |
| 分区             | Yes    | Yes                     | Yes                    |
| Schema           | No     | Yes                     | Yes                    |
| 查询优化器       | No     | Yes                     | Yes                    |
| API 级别         | 低     | 高（底层基于 RDD 实现） | 高（DataFrame 的拓展） |
| 是否存储类型     | Yes    | No                      | Yes                    |
| 何时检测语法错误 | 编译时 | 编译时                  | 编译时                 |
| 何时检测分析错误 | 编译时 | 运行时                  | 编译时                 |

### 历史

1. **RDD API** 在 **Spark 1.x** 中就已经存在，是整个 Spark 框架的基石
2. 为了方便熟悉**关系型数据**和 **SQL** 的开发人员使用，在 RDD 的基础上，Spark 创建了 **DataFrame** API
3. 从 **Spark 1.6** 开始，引入了 **DataSet**，在 **DataFrame** 的基础上，新增了对数据的每一列的**数据类型**的限制
4. 在 **Spark 2.0** 中，**DataFrame** 和 **DataSet** 被**统一**，DataFrame 作为 **DataSet[Row]** 存在
   - 在**弱类型**的语言中，如 **Python** 中的 **DataFrame API** 依然存在
   - 在**强类型**的语言中，如 **Java** 中的 **DataFrame API** 已经不复存在

### 不可变性 + 分区

1. DataFrame 和 DataSet 都是**基于 RDD**，都拥有 RDD 的基本特性
2. 可以通过简单的 API 在 DataFrame 或 DataSet 与 RDD 之间进行**无缝切换**

### 性能

1. DataFrame 和 DataSet 的性能要比 RDD 更好
2. Spark 程序运行时，Spark SQL 中的**查询优化器**会对语句进行**分析**，并生成**优化过的 RDD** 在底层执行

![image-20241118153550196](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241118153550196.png)

### 错误检测

1. **RDD** 和 **DataSet** 都是**类型安全**的，而 DataFrame 并**不是类型安全**的（并不存储每一列的信息）
2. 使用 **DataFrame** API 时，可以选择一个并**不存在的列**，该错误只有在代码被**执行时**才会抛出
   - 使用 **DataSet** API，在**编译时**就能检测到这个错误

# 小结

1. DataFrame 和 DataSet 是 Spark SQL 提供的基于 **RDD** 的**结构化数据抽象**
   - 既有 RDD **不可变**、**分区**、**存储依赖关系**等特性
   - 又拥有类似于**关系型数据库**的**结构化信息**
2. 基于 DataFrame 和 DataSet API 开发的程序会被**自动优化**
   - 无需开发人员操作**底层**的 **RDD API** 来进行**手动优化**，大大提升开发效率
3. **RDD API** 对于**非结构化**的数据处理有独特的优势，并且更方便做**底层**操作
