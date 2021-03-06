---
title: 计算机组成 -- 局部性原理
mathjax: true
date: 2020-01-25 10:01:08
categories:
    - Computer Basics
    - Computer Organization
tags:
    - Computer Basics
    - Computer Organization
---

## 局部性原理
1. 局部性原理：**时间**局部性（**temporal** locality）+**空间**局部性（**spatial** locality）
2. **时间**局部性：如果一个数据被访问了，在**短时间**内还会被再次访问
3. **空间**局部性：如果一个数据被访问了，和它**相邻**的数据也很快会被访问

<!-- more -->

## 亚马逊的商品
假设：总共**6亿**商品，每件商品需要**4MB**的存储空间，总共需要**2400TB**的数据存储

### 存储成本
1. 如果**所有**数据都放在内存里面，需要**3600万美元**
   - **$3600 = \frac{2400TB}{1MB}×0.015$**
2. 如果只在内存里存放**前1%**的热门商品，其余的放在HDD上，存储成本可以下降为**45.6万美元**，即原来成本的**1.3%**
   - **$45.5 ≈ 3600 \times 0.01+3600 \times 0.99 \times \frac{0.00004}{0.015}$**

### 时间局部性
1. **时间**局部性：**LRU**（Least Recently Used）缓存算法
   - 热门商品被访问得多，就会始终被保存在内存里，而冷门商品被访问得少，就只存放在HDD硬盘上
   - 越是热门的商品，越容易在内存中找到，能更好地利用内存的**随机访问**性能
2. 假设日活为1亿，活跃用户每人每天访问100个商品，每秒访问的商品数量为**12万次**（**$\frac{10^{8} \times 100}{24 \times 3600 \times 10000}$**）
3. **缓存命中率**
  - 内存的**随机访问**请求需要**100ns**，极限情况下，内存可以支持**每秒1000W次**的随机访问
    - 使用24TB的内存，假设每根内存条8GB，即3000条内存，可以支持**每秒300亿次**访问
  - 如果数据**没有命中内存**，那么对应的数据请求需要访问到**HDD磁盘**
    - HDD硬盘的**随机访问**请求需要**10ms**，即只能支撑**每秒100次**的随机访问
    - 2400TB的数据，假设每块磁盘为4TB，有600块磁盘，就能支撑每秒**6万次**的随机访问
    - 如果所有的访问请求，都直接到了HDD磁盘，HDD磁盘是支撑不了这个压力（至少需要**50%**的缓存命中率）
    - 替代方案：添加**更多的HDD**、将HDD**替换成SSD**

## 参考资料
[深入浅出计算机组成原理](https://time.geekbang.org/column/intro/100026001)