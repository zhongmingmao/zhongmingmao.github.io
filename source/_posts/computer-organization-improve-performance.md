---
title: 计算机组成 -- 提升性能
mathjax: false
date: 2020-01-03 13:07:49
categories:
    - Computer Basics
    - Computer Organization
tags:
    - Computer Basics
    - Computer Organization
---

## CPU的功耗
```
CPU time = 时钟周期时间（Clock Cycle Time） × CPU时钟周期数（CPU Cycles）
         = 时钟周期时间（Clock Cycle Time） × 指令数 × 每条指令的平均周期数（Cycles Per Instruction，CPI）
```
1. 80年代开始，CPU硬件工程师主要着力**提升CPU主频**，到功耗是CPU的**人体极限**
2. CPU，一般被叫做**超大规模集成电路**，这些电路，实际上都是一个个**晶体管**组合而成的
    - CPU计算，实际上是让晶体管里面的『开关』不断地去打开或关闭，来组合完成各种运算和功能
3. 如果要计算得快，有两个方向：**增加密度**（7nm制程）、**提升主频**，但这两者都会增加**功耗**，带来耗电和散热的问题
    - 密度 -> 晶体管数量
    - 主频 -> 开关频率
4. 如果功耗增加太多，会导致CPU散热跟不上，此时就需要**降低电压**（低压版CPU）

```
功耗 ≈ 1/2 × 负载电容 × 电压的平方 × 开关频率 × 晶体管数量
```

<!-- more -->

## 并行优化 -- 阿姆达尔定律
```
优化后的执行时间 = 受优化影响的执行时间 / 加速倍数 + 不受影响的执行时间
```
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-improve-performance-amdahl-low.jpg" width=1000/>

## 其它
1. 加速**大概率**事件（**CPU -> GPU -> TPU**）
2. 通过**流水线**提高性能
3. 通过**预测**提高性能（**分支和冒险**、**局部性原理**）
