---
title: 数学 -- 保证不输钱
mathjax: true
date: 2020-01-05 22:02:14
categories:
    - Math
tags:
    - Math
---

问题抽象一下：假设有n个坑，第$i$个坑投注了$X_i$，倍率为$Y_i$，怎样设置倍率才能保证不亏钱？

推导过程如下：

假设某场第$k$个坑赔最少，最少赔付记为$min = (X_k \times Y_k)$

则$(X_k \times Y_k) \leq (X_l \times Y_l) \quad l \in \[1,n\]$

易得$\frac{X_k \times Y_k}{Y_l} \leq X_l \quad l \in \[1,n\]$

而收入为$(\sum_{i=1}^n{X_i}) \geq (\sum_{i=1}^n{\frac{X_k \times Y_k}{Y_i}}) = (\sum_{i=1}^n{\frac{1}{Y_i}}) \times (X_k \times Y_k) = (\sum_{i=1}^n{\frac{1}{Y_i}}) \times min$

而不亏钱，只要保证$(\sum_{i=1}^n{X_i}) \geq min$即可，而由上易知，$(\sum_{i=1}^n{\frac{1}{Y_i}}) \geq 1$为不亏钱的充分条件

回到某同事预设的倍率：`[5, 5, 5, 5, 10, 15, 25, 45]`，$(\sum_{i=1}^n{\frac{1}{Y_i}}) = (\frac{1}{5}+\frac{1}{5}+\frac{1}{5}+\frac{1}{5}+\frac{1}{10}+\frac{1}{15}+\frac{1}{25}+\frac{1}{45}) \approx 1.029 \geq 1$

理论上按这个预设倍率是不会亏钱的

<!-- more -->