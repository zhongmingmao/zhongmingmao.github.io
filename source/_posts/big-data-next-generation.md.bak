---
title: 大数据 -- 下一代数据处理技术
mathjax: false
date: 2019-06-21 15:09:13
categories:
    - Big Data
tags:
    - Big Data
---

## MapReduce
1. 2014年之前，MapReduce是数据处理的默认标准，其主要缺点：_**维护成本高**、**时间性能不足**_
2. 2008年，FlumeJava诞生于Google西雅图研发中心，成为Google内部的数据处理新宠
3. 假设在2008年，已知MapReduce的主要问题，应该如何设计下一代大规模数据处理技术？

<!-- more -->

## 让多步骤数据处理易于维护
1. 维护协调多个步骤的数据处理在业务中非常常见，但复杂的数据处理在MapReduce中的维护成本很高
2. 可以利用**有向无环图**（DAG，Directed Acyclic Graph）来抽象表达
3. DAG能为多步骤的数据处理依赖关系，建立很好的模型

### DAG
<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-next-generation-dag-tomato-egg.png" width=500/>

1. 如果用MapReduce实现，图中的每个箭头都会是一个独立的Map或者Reduce
    - 为了协调那么多的Map和Reduce，需要做很多检查，系统将不堪重负
2. 如果采用DAG建模
    - 每一个**节点**都可以被抽象表达成一种通用的**数据集**
    - 每一条**边**都可以被抽象表达成一种通用的**数据变换**
    - 可以用数据集和数据变换描述一个极为宏大复杂的数据处理流程，而不会迷失在依赖关系中

## 简单配置 + 性能自动优化
1. MapReduce的配置过于复杂，以至于错误的配置最终导致数据处理任务的效率低下
2. 得益于上一步使用DAG对数据处理进行了高度抽象，这也成为了自动化性能优化的一个突破口
3. 理想情况下，计算引擎要能够自动发现红框中的两条数据处理流程是重复的，并进行合并处理
4. 另一种自动的优化：**计算资源的自动弹性分配**，在数据处理开始前，需要有一个自动优化的步骤和能力

<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-next-generation-dag-tomato-egg-burdock.jpg" width=600/>

## 解耦：数据描述 + 计算引擎
<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-next-generation-data-engine-client.png" width=400/>

1. 除了**DAG表达**需要**数据处理描述语言**和**计算引擎**协商一致外，其他的实现都是灵活可拓展的
2. 例如，数据描述可以用Python描述，由业务团队使用，计算引擎用C++实现，可以由数据底层架构团队维护并且高度优化
3. 例如，数据描述在本地写，计算引擎在云端执行

## 统一的编程模型：批处理 + 流处理
1. 批处理处理的是**有界离散**的数据，而流处理处理的是**无界连续**的数据
2. MapReduce的一个局限是它是为了批处理而设计的，不善于流处理
    - 即便是后面的Apache Storm、Apache Flink也有类似的问题
    - Apache Flink进行批处理时用的是DataSet，而进行流处理时用的是DataStream
3. 真正的业务系统，批处理和流处理常常是**混合共生**的，或者**频繁变换**的
    - 因此在设计数据处理框架时，需要有更高层级的数据抽象
    - 不管批处理还是流处理，都用**统一的数据结构**表示，也需要**统一的编程API**
    - 即使业务需求改变，开发者也不需要频繁修改代码

## 异常处理 + 数据监控
1. 在一个复杂的数据处理系统中，难的并不是开发系统，而是**异常处理**
    - 一个Google内部调研中表明，在大规模的数据处理系统中，90%的时间都花在了异常处理上
2. 在数据处理系统，数据就是金钱，不能丢失
    - 因此需要设计一套具备基本的数据监控能力，对数据处理的每一步提供自动监控的平台

## 小结
<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-next-generation.png" width=800/>
