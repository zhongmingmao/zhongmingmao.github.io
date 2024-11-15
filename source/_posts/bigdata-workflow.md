---
title: Big Data - Workflow
mathjax: true
date: 2024-09-12 00:06:25
cover: https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/bigdata-1692816749106.png
categories:
  - Big Data
tags:
  - Big Data
---

# Workflow

1. 将多种不同的处理模块连接在一起，最后得出一个 **DAG**，称为一个 **Workflow System**
2. 在 Workflow System 中，有对应的**设计模式**

<!-- more -->

# Copier Pattern

![image-20241115180556242](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241115180556242.png)

1. 将单个数据处理模块中的数据，**完整地复制**到两个或更多的数据处理模块中，然后再由不同的数据处理模块进行处理
2. 适用场景 - 需要对**同一个数据集**采取**多种不同的数据处理转换** - 多个数据处理模块可以**并行处理**

# Filter Pattern

![image-20241115181640173](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241115181640173.png)

1. **过滤**掉不符合特定条件的数据
2. 在数据集通过 Filter 后，数据集会缩减到只剩下符合条件的数据
3. 适用场景 - 需要针对一个数据集中**某些特定的数据**采取数据处理

# Splitter Pattern

![image-20241115182233071](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241115182233071.png)

1. 将数据集中的数据分类为**不同的类别**来进行分别处理
2. 分离模式**不会过滤**任何数据，只是将原来的数据集**分组**

> **同样的数据**，可以被划分到**不同的数据处理模块**

![image-20241115182641088](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241115182641088.png)

# Joiner Pattern

![image-20241115182804592](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241115182804592.png)

1. 将多个**不同的数据集**转换集中在一起，成为一个**总数据集**
2. 然后将总数据集放在**一个工作流**中进行处理
