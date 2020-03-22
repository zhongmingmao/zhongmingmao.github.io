---
title: 计算机组成 -- 性能
mathjax: true
date: 2020-01-02 18:33:52
categories:
    - Computer Basics
    - Computer Organization
tags:
    - Computer Basics
    - Computer Organization
---

## 性能指标
1. **响应时间**（Response time）、**执行时间**（Execution time）
    - 执行一个程序，需要花多少时间
2. **吞吐率**（Throughput）、**带宽**（Bandwidth）
    - 单位时间范围内，能处理多少数据或执行多少指令，可以通过多核、集群等方式来提升吞吐率
3. **性能 =  1/响应时间**

<!-- more -->

## CPU时钟
1. time命令
   - real time
     - Wall Clock Time/Elapsed Time，运行程序整个过程中流逝掉的时间
   - user time
     - 在**用户态**运行指令的时间
   - sys time
     - 在**操作系统内核**里运行指令的时间
2. 程序实际花费的CPU执行时间：**CPU time = user time + sys time**
3. 程序实际占用的CPU time一般比Elapsed Time**少**（单核情况下）

```shell
$ time seq 1000000 | wc -l
1000000

real	0m0.024s
user	0m0.018s
sys	0m0.005s
```
1. 程序实际花了0.024s，CPU time只有`0.018s+0.005s=0.023s`
2. 如果在一台多核或多CPU的机器上运行，seq和wc可能会被分配到两个CPU上
   - user和sys是两个CPU相加的，而real是现实时钟里走过的时间
   - 极端情况下（两个命令完全并行），`user + sys ≈ real × 2`

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-performance-cpu-time-elapsed-time.jpg" width=1000/>

### 时钟周期时间
```
CPU time = 时钟周期时间（Clock Cycle） × CPU时钟周期数（CPU Cycles）
         = 时钟周期时间（Clock Cycle） × 指令数 × 每条指令的平均周期数（Cycles Per Instruction，CPI）
```
1. CPU主频 -- 2.8GHz
    - 代表CPU能够识别出来的**最小时间间隔**
    - CPU内部，存在一个晶体振荡器，简称**晶振**
    - 时钟周期时间为`1/2.8GHz`
2. 提升性能的方向
   - **缩短时钟周期时间**
     - 提升主频（超频或换CPU）
   - **降低CPI**
     - 流水线技术（Pipeline）
   - **减少指令数**
     - 编译器的挑战