---
title: 大数据 -- 热销榜
mathjax: false
date: 2019-06-24 09:26:43
categories:
    - Big Data
tags:
    - Big Data
---

## 简化问题
1. 某电商网站销售10亿件商品，已经跟踪了网站的销售记录，格式：`<product_id, timestamp>`
2. 整个交易记录有1000亿行，TB级别，如何根据销售记录去统计销量前10的商品

## 小规模经典算法
1. 统计每个商品的销量：可以用**哈希表**来解决， 这是一个`O(n)`的算法，n=1000亿
2. 找出销量前10：可以用**Top K**算法，时间复杂度也是`O(n)`
3. 大规模会面临的问题：**内存占用**、**磁盘IO延时**

<!-- more -->

## 大规模分布式解决方案

### 统计销量
假如有1000台机器，每台机器一次可以处理1W条销售记录，对于单台机器来说，处理规模减少，可以回归到用传统算法解决

<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-hot-list-distributed-count.jpg" width=1000/>

### 销量前K
1. 需要把分散在各个机器上的产品销量汇总出来，例如把所有product_id=1的销量全部叠加
2. K=1时
    - 每台机器把所有product_id相同的销量（分散在不同的机器）叠加在一起，再找出自己机器上销量Top 1的商品
    - 对于每台机器而言，输出的就是最终排名Top 1的商品候选者

<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-hot-list-distributed-topk.jpg" width=1000/>

### 结果汇总

<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-hot-list-distributed-summary.jpg" width=1000/>
