---
title: Beam - Future
mathjax: true
date: 2024-10-05 00:06:25
cover: https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/flink-runner-beam-beam-vision.png
categories:
  - Big Data
  - Beam
tags:
  - Big Data
  - Beam
---

# 技术迭代

1. **2006**，Apache **Hadoop** 发布，基于 **MapReduce** 计算模型
2. 2009，**Spark** 计算框架在 加州伯克利大学诞生，于 **2010** 年**开源**，于 **2014** 年成为 **Apache 的顶级项目**
   - **Spark** 的数据**处理效率**远在 **Hadoop** 之上
3. **2014**，**Flink** 面世，**流批一体**，于 **2018** 年被阿里收购

<!-- more -->

# Apache Beam

1. Apache Beam 根据 Dataflow Model API 实现的，能完全胜任**批流一体**的任务
2. Apache Beam 有**中间的抽象转换层**，工程师无需学习新 **Runner** 的 API 的语法，减少**学习新技术的时间成本**
3. **Runner** 可以**专心**优化效率和迭代功能，而不必担心迁移

# Beam Runner

1. 迭代非常快 - 如 **Flink**
