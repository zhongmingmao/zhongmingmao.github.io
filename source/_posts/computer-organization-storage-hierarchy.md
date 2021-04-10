---
title: 计算机组成 -- 存储层次结构
mathjax: false
date: 2020-01-24 09:11:29
categories:
    - Computer Basics
    - Computer Organization
tags:
    - Computer Basics
    - Computer Organization
---

## SRAM
1. CPU类比成计算机的大脑；而**正在思考的东西**，可以类比成CPU中的**寄存器**（Register）
   - 寄存器更像是CPU本身的一部分，存放**极其有限**的信息，但速度非常快，**和CPU同步**
2. **大脑中的记忆**，类比成**CPU Cache**（高速缓存）
   - CPU Cache使用的芯片是**SRAM**（**Static** Random-Access Memory，**静态随机存取存储器**）
3. **静态**：只要处于**通电**状态，里面的数据就能**保持存在**，而一旦断电，里面的数据就会丢失
4. 在SRAM里，**1个比特**的数据，需要**6~8个晶体管**
   - 所以SRAM的**存储密度不高**，同样的物理空间下，能够存储的数据有限
5. SRAM的**电路简单**，所以**访问速度非常快**
6. 在CPU里，通常会有**L1**、**L2**、**L3**这三层高速缓存
   - L1 Cache
     - 每个CPU核心都有一块**独占的L1 Cache**，通常分为**指令缓存**和**数据缓存**
     - **L1 Cache**通常**嵌在CPU核心的内部**
   - L2 Cache
     - L2 Cache同样是每个CPU核心都有，但往往**不在CPU核心的内部**，因此L2 Cache的访问速度会比L1 Cache**稍慢**
   - L3 Cache
     - L3 Cache通常是**多个CPU核心共用**的，**尺寸更大**，**访问速度更慢**
7. 简单类比
   - L1 Cache -- 短期记忆
   - L2/L3 Cache -- 长期记忆
   - 内存 -- 书架

```bash Mac OS
$ sysctl hw.l1icachesize # L1 instruction cache
hw.l1icachesize: 32768

$ sysctl hw.l1dcachesize # L1 data cache
hw.l1dcachesize: 32768
```

<!-- more -->

## DRAM
1. **内存**使用的芯片是**DRAM**（Dynamic Random Access Memory，**动态随机存取存储器**）
   - 相对于SRAM，**密度更大**，**容量更大**，**更便宜**
2. **动态**：DRAM需要**不断地刷新**，才能保持数据被存储起来
3. DRAM的**1个比特**，只需要**1个晶体管**和**1个电容**就能存储 -- **存储密度更大**
   - 但因为数据是存储在电容里面，**电容会不断漏电**，因此需要**定时刷新充电**，才能保证数据不丢失
4. DRAM的**数据访问电路**和**刷新电路**比SRAM**更复杂**，因此**访问延时**也更长

## 存储器的层次结构
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-storage-hierarchy-like.png" width=1000/>
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-storage-hierarchy.png" width=1000/>

1. CPU并不是直接和每一种存储器设备打交道，而是每一种存储器设备，都只和它**相邻**的存储器设备打交道
   - CPU Cache从内存加载而来，或者需要写回内存，并不会直接写回数据到硬盘
   - CPU Cache也不会直接从硬盘加载数据，而是先加载到内存，再从内存加载到CPU Cache中
2. 各个存储器只和**相邻**的一层存储打交道，并且一层层向下
   - 存储器的**容量逐层增大**，**访问速度逐层变慢**，**单位存储成本逐层下降**

### 价格 + 性能
| 存储器 | 硬件介质 | 单位成本（美元/MB） | 随机访问延时 | 说明 |
| --- | --- | --- | --- | --- |
| L1 Cache | SRAM | 7 | 1ns | |
| L2 Cache | SRAM | 7 | 4ns | 访问延时 **15×L1 Cache** |
| Memory | DRAM | 0.015 | 100ns | 访问延时 **15×SRAM**，价格 **1/40×SRAM** |
| Disk | SSD（NAND） | 0.0004 | 150μs | 访问延时 **1500×DRAM**，价格 **1/40×DRAM** |
| Disk | HDD | 0.00004 | 10ms | 访问延时 **70×SSD**，价格 **1/10×SSD** |

## 参考资料
[深入浅出计算机组成原理](https://time.geekbang.org/column/intro/100026001)