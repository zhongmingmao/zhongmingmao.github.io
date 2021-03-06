---
title: 计算机组成 -- 虚拟机
mathjax: false
date: 2020-01-23 17:49:32
categories:
    - Computer Basics
    - Computer Organization
tags:
    - Computer Basics
    - Computer Organization
---

## 解释型虚拟机
1. 要**模拟**一个计算机系统，最简单的办法，就是**兼容**这个计算机系统的**指令集**
2. 开发一个应用程序，运行在操作系统上，该应用程序可以**识别**想要模拟的计算机系统的**程序格式**和**指令**，然后一条条去**解释执行**
3. 原先的操作系统称为**宿主机**（Host），有能力模拟指令执行的软件称为**模拟器**（Emulator）
   - 实际运行在模拟器上被虚拟出来的系统，称为**客户机**（Guest VM）
4. 这种方式和运行Java程序的**JVM**比较类似，只不过JVM运行的是**Java中间代码（字节码）**，而不是一个特定的计算机系统的**指令**
5. 真实的应用案例：**Android模拟器**、**游戏模拟器**
6. 优势
   - 模拟的系统可以**跨硬件**
   - Android用的是**ARM CPU**，开发机用的是**Intel X86 CPU**，两边的CPU**指令集**是**不一样**的，但一样可以正常运行
7. 劣势
   - **无法做到精确模拟**
     - 很多老旧的硬件的程序运行，需要依赖**特定的电路**乃至**电路特有的时钟频率**，很难通过**软件**做到100%模拟
   - **性能很差**
     - 并不是直接把指令交给CPU去执行，而是要经过各种**解释**和**翻译**的工作
     - 编译优化：Java的**JIT**
       - 把本来**解释执行**的指令，编译成Host可以**直接运行**的指令

<!-- more -->

## 全虚拟化
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-vm-full-virtualization.jpg" width=1000/>

1. **全虚拟化**：在现有的物理服务器的硬件和操作系统上，运行一个**完整**的，**不需要做任何修改**的客户机操作系统（Guest OS）
2. **虚拟机监视器**（Virtual Machine Manager，Hypervisor）是一个**中间层**
   - 运行的虚拟机直接和虚拟机监视器打交道，把整个**硬件特性**（CPU指令集、IO操作、中断等）都映射到虚拟机环境中
3. 根据实际的指令如何落到硬件去**实际执行**的方式，可以划分为**Type-1**型虚拟机和**Type-2**型虚拟机

### Type-2 -- 个人电脑
1. 在Type-2型虚拟机里，虚拟机监视器好像一个**运行在操作系统上的软件**
   - 客户机的操作系统，把最终到硬件的所有指令，都发送给虚拟机监视器
   - 而虚拟机监视器，又会把这些指令交给宿主机的操作系统去执行
2. Type-2型虚拟机，常用于**个人电脑**

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-vm-full-virtualization-type2.png" width=1000/>

### Type-1 -- 数据中心
1. 在**数据中心**里面用的虚拟机，通常叫作Type-1型虚拟机
   - 客户机的指令交给虚拟机监视器后，不再需要通过宿主机操作系统才能调用硬件，而是可以**直接由虚拟机监视器去调用硬件**
2. 在数据中心里，并不需要在Intel x86上运行一个ARM程序，而是直接在x86上虚拟一个x86硬件的计算机和操作系统
   - 因此并不需要做什么翻译工作，**直接往下传递执行**即可，指令的**执行效率**也会**很高**
3. 在Type-1型虚拟机里，虚拟机监视器并不是在一个操作系统之上的应用层程序，而是**嵌入到操作系统内核**里面的一部分
   - 无论是**KVM**、**XEN**、**Hyper-V**（Windows 10），都是**系统级程序**
4. Type-1型虚拟机的虚拟机监视器需要**直接和硬件打交道**，因为它需要包含能够直接操作硬件的**驱动程序**
   - 因此Type-1型的虚拟机监视器**更大一些**，同时**兼容性**也不如Type-2型
   - 但由于Type-1型一般部署在数据中心，**硬件**完全是**统一可控**的

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-vm-full-virtualization-type1.png" width=1000/>

## Docker
1. Type-1型虚拟机相对于Type-2型虚拟机已经没有什么硬件损耗了，但依然存在**资源浪费**
   - 在实际的物理机上，可能同时运行多个虚拟机，而**每个虚拟机**都运行了一个**单独的操作系统**
   - 多运行一个操作系统，意味这要**多消耗硬件资源**（CPU、内存、磁盘空间等）
   - 实际需要的未必是一个完整的、独立的、全虚拟化的虚拟机，例如我们可能只需要独立的计算资源
2. 在服务器端开发中，应用程序一般都是运行在**Linux内核**上
   - 通过Docker，不再需要在操作系统上再跑一个操作系统
     - 而是通过**容器编排工具**（如**Kubernetes**），能够进行各个应用之间的**环境和资源隔离**即可
   - Docker没有再单独运行一个客户机操作系统，而是直接运行在**宿主机操作系统的内核之上**
3. Docker严格来说不能算是一种虚拟化技术，只能算是一种**资源隔离**的技术

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-vm-docker.png" width=800/>

## 参考资料
[深入浅出计算机组成原理](https://time.geekbang.org/column/intro/100026001)