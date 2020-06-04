---
title: 计算机组成 -- CISC + RISC
mathjax: false
date: 2020-01-22 13:40:05
categories:
    - Computer Basics
    - Computer Organization
tags:
    - Computer Basics
    - Computer Organization
---

## 历史
1. 在**早期**，所有的CPU都是**CISC**
2. 实际的计算机设计和制造会严格受到**硬件层面**的限制，当时的**计算很慢**，**存储空间很小**
   - 为了让计算机能够尽量多地工作，每个**字节**乃至每个**比特**都特别重要
3. CPU指令集的设计，需要仔细考虑**硬件限制**，为了**性能**考虑，很多功能都**直接通过硬件电路**来完成
4. 为了**少用内存**，**指令长度**也是**可变**的
   - **常用**的指令要**短**一些，**不常用**的指令要**长**一些
   - 用**尽量少的内存空间**，存储**尽量多的指令**
5. 计算机的性能越来越好，存储的空间也越来越大，**70年代末**，**RISC**出现
   - CPU运行程序，**80%的运行代码都在使用20%的简单指令**

<!-- more -->

## 对比

| CISC | RISC |
| --- | --- |
| 以**硬件**为中心的指令集设计 | 以**软件**为中心的指令集设计 |
| 通过**硬件**实现各类程序指令 | 通过**编译器**实现**简单指令组合**，完成**复杂功能** |
| 更**高效**地使用内存和寄存器 -- 一开始都是CISC，硬件资源非常珍贵 | 需要**更大**的内存和寄存器，并**更频繁**地使用 |
| **可变**的指令集，支持**更复杂**的指令长度 | **简单**、**定长**的指令 |
| **大量**指令数 | **少量**指令数 |

1. CISC的缺点
   - 在硬件层面，如果想要支持更多的**复杂指令**，CPU里面的**电路**就要更复杂，**设计**起来更困难
   - 更复杂的电路，在**散热**和**功耗**层面，也会面临更大的挑战
   - 在软件层面，支持更多的复杂指令，**编译器的优化**变得更困难
2. 在RISC架构里面，CPU选择把指令精简到**20%的简单指令**，原先复杂指令，通过**简单指令组合**来实现，让**软件实现硬件的功能**
   - 这样，CPU的**整个硬件设计变得简单**，在**硬件层面提升性能**变得更加容易
3. RISC的CPU里完成指令的电路变简单了，可以腾出更多**空间**来存放**通用寄存器**
   - 因为**RISC**完成**同样的功能**，执行的**指令数要比CISC多**
   - 如果需要反复从**内存**里面**读取指令或者数据**到**寄存器**，那么**很多时间都会花在访问内存**上
   - 所以，RISC架构的CPU往往会有**更多的通用寄存器**
4. RISC的CPU也可以把**更多的晶体管**，用来实现更好的**分支预测**等优化功能，进一步提升**CPU实际的执行效率**
5. **程序的CPU执行时间 = 指令数 × CPI × Clock Cycle Time**
   - **CISC**架构，是通过优化**指令数**，来减少CPU的执行时间
   - **RISC**架构，是通过优化**CPI**，来减少CPU的执行时间
     - 因为指令比较**简单**，需要的时钟周期就比较少
6. 因为RISC降低了CPU硬件的设计和开发**难度**
   - 从**80年代**开始，大部分新的CPU都开始采用RISC架构，如**IBM的PowerPC**、**SUN的SPARC**

## 微指令架构
1. x86架构所面临的种种问题，都来自于一个最重要的考量，即**指令集的向前兼容性**
   - x86在商业上太成功，所以市场上有大量的**Intel CPU**，围绕这些CPU，又有大量系统软件（如**操作系统**、**编译器**）
   - 这些**系统软件**只支持x86的指令集，在这些系统软件上，又有各种各样的**应用软件**
   - 如果Intel要放弃x86的架构和指令集，开发一个RISC架构的CPU，面临的第一个问题：所有的软件都是**不兼容**的
     - 安腾处理器：Intel想要在CPU进入**64位**时代的时候，**丢掉x86的历史包袱**，推出了全新的**IA-64**架构
     - 但因为不兼容x86的指令集，遭遇了重大的失败
   - AMD，在Intel研发安腾的时候，推出了**兼容32位x86指令集的64位架构**，即**AMD64**
     - x86下的64位指令集**x86-64**，并不是Intel发明的，而是AMD
2. Intel在开发安腾处理器的同时，也在不断地**借鉴**其它**RISC**处理器的设计思想
   - 核心问题：**始终向前兼容x86的指令集**
     - 思路：在**不修改指令集**的情况下，**让CISC风格的指令集，用RISC的形式在CPU里面运行**
     - 在**Pentium Pro**时代，Intel开始在处理器里引入**微指令架构**（Micro-Instructions/Micro-Ops）
3. 在微指令架构的CPU里面，**编译器**编译出来的**机器码**和**汇编代码**并没有发生什么变化
   - 但在**指令译码**阶段，指令译码器翻译出来的，不再是某一条CPU指令，指令译码器会把**一条机器码**，翻译成**多条微指令**
   - 微指令不再是CISC风格，而是变成了**固定长度的RISC风格**，这些RISC风格的微指令，会被放到一个**微指令缓冲区**里
   - 然后再从微指令缓冲区里面，**分发**到后面的**超标量**并且是**乱序执行**的**流水线架构**
     - 这个流水线架构接受的不是复杂的指令，而是**精简的指令**
   - 在**微指令架构**里，**指令译码器**相当于一个**适配器**
     - 这个适配器，**填平**了**CISC**和**RISC**之间的**指令差异**
     - 但这样的指令译码器**更复杂**：需要把**CISC指令**译码成**RISC指令**，意味着更**复杂的电路**和**更长的译码时间**
     - 本来**通过RISC提升的性能**，又有一部分浪费在**指令译码**上
   - **RISC优于CISC**是基于一个假设：程序实际运行过程中，**80%运行的代码使用20%的常用指令**
     - 这意味着CPU里执行的指令有**很强的局部性**，对于很强局部性的问题，常见的解决方案是使用**缓存**
     - 因此，Intel在CPU里面加了一层**L0 Cache**，保存的是指令译码器把**CISC指令**翻译成**RISC微指令**的结果
     - 在大部分情况下， CPU都可以从**L0 Cache**里面**直接**拿到**译码结果**，而不需要让译码器去进行实际的译码操作
       - 好处：**优化性能** + **减少功耗**
4. 从Pentium Pro开始，Intel处理器**不再是一个纯粹的CISC处理器**了，同时**融合**了大量**RISC**类型的处理器设计
   - 由于Intel本身**在CPU层面做了大量的优化**（乱序执行、分支预测等），x86的CPU在**功耗**上始终**远远超过RISC架构的ARM**

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-%20cisc-risc-micro-ops.jpg" width=1000/>

## ARM
1. ARM：Advanced **RISC** Machines
2. 现在的**CISC**和**RISC**的分界已经比较**模糊**
   - Intel和AMD的CPU，都是采用译码成**RISC风格的微指令**来运行的
   - ARM的芯片，一条指令同样需要**多个时钟周期**，也有**乱序执行**和**多发射**
3. ARM在**移动端**战胜Intel的原因
   - **功耗优先**的设计
     - 在移动设备上，功耗是一个远比性能更重要的指标
     - ARM的CPU，**主频更低**，**晶体管更少**，**高速缓存更小**，**乱序执行的能力更弱**，这些都是为了功耗所做的**妥协**
   - **低价**
     - ARM只进行**CPU设计**，然后把对应的知识产权**授权**出去，让其它厂商来生产ARM架构的CPU
     - 甚至允许厂商（**苹果、三星、华为**）基于ARM架构和指令集，设计属于自己的CPU，ARM只收取对应的**专利授权费用**
     - 多个厂商之间的**竞争**，使得ARM的芯片在市场上的价格很**便宜**
       - 虽然ARM芯片的**出货量**远大于Intel，但**收入**和**利润**却比不上Intel