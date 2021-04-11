---
title: 大数据 -- MapReduce
mathjax: false
date: 2019-06-20 22:03:53
categories:
    - Big Data
    - MapReduce
tags:
    - Big Data
    - MapReduce
---

## 时间线
<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-timeline.png" width=1000/>

<!-- more -->

### 石器时代
1. 石器时代：MapReduce诞生之前的时期
2. 数据的大规模处理问题早已存在，但数据的大规模处理技术还处于彷徨阶段
    - 每个公司或个人都可能有自己的一套工具处理数据，但没有提炼抽象出一个系统的方法

### 青铜时代
1. 2003年，MapReduce的诞生标志了超大规模数据处理的第一次革命
2. 论文：《MapReduce: Simplified Data Processing on Large Clusters》
    - Jeff Dean和Sanjay Ghemawat从纷繁复杂的业务逻辑中，抽象出通用的编程模型：Map和Reduce
3. 后来的Hadoop是对GFS、BigTable、MapReduce的开源实现

### 蒸汽机时代
1. 从2016年开始，Google在新员工的培训中把MapReduce替换成内部称为**FlumeJava**的数据处理技术
2. FlumeJava不等同于Apache Flume，这标志着青铜时代的终结，同时标志着蒸汽机时代的开始
3. Google FlumeJava对应的开源版本为**Apache Beam**

## MapReduce的缺点

### 高昂的维护成本
1. 使用MapReduce，需要严格地遵循分步的Map和Reduce步骤
2. 当构造复杂的处理架构时，往往需要**协调**多个Map和多个Reduce任务
3. 但是每一步的MapReduce都有可能出错，为了处理这些异常，很多人开始设计自己的**协调系统**，大大**增加整个系统的复杂度**
4. 真实的商业MapReduce场景**极端复杂**
    - 在应用过程中，每个MapReduce任务都可能出错，都需要重试和异常处理的机制
    - 而协调这些子MapReduce的任务往往需要与业务逻辑**紧密耦合**的状态机

### 时间性能差
1. MapReduce性能优化配置非常复杂，Google关于MapReduce的性能优化手册有500多页
2. Google曾在2007年到2012年做过对1PB数据的大规模排序实验，用来测试MapReduce的性能
    - 2007年为12小时，2012年为0.5小时，Google花了5年的时间才不断优化了一个MapReduce流程的效率
