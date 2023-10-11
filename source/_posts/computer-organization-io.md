---
title: 计算机组成 -- IO设备
mathjax: false
date: 2020-01-30 19:42:07
categories:
    - Computer Basics
    - Computer Organization
tags:
    - Computer Basics
    - Computer Organization
---

## 接口 + 设备 -- 适配器模式
1. 大部分的输入输出设备，都有两个组成部分，一个是**接口**，另一个是**实际的IO设备**
2. 硬件设备并不是直接接入到总线上和CPU通信的，而是通过接口，**用接口连接到总线上**，再通过总线和CPU通信
3. 串行接口、USB接口等都是计算机**主板上内置的各个接口**，实际使用的硬件设备，都需要插入到这些接口上，才能和CPU通信
4. **接口本身是一块电路板**，CPU不需要和实际的硬件设备打交道，**只需要和这个接口电路板打交道**
   - 设备里面的三类寄存器（**状态寄存器**、**命令寄存器**、**数据寄存器**），都在**接口电路**上，而不在实际的设备上
5. 除了内置在主板上的接口外，有些**接口可以集成在设备**上 -- **IDE**（**Integrated** Device Electronics）硬盘
   - 设备的接口电路直接在设备上，只需要通过一个**线缆**，把集成了接口的设备连接到主板上即可
6. **接口和设备分离**：各种输入输出设备的制造商，根据**接口的控制协议**，来设计各种外设
7. Windows设备管理器
   - **Devices**：着重**实际的IO设备本身**
   - **Controllers**：着重输入输出设备接口里面的**控制电路**
   - **Adaptors**：着重接口作为一个**适配器**后面可以插上不同的实际设备

<!-- more -->

## CPU控制IO设备
1. 无论是内置在主板上的接口，还是集成在设备上的接口，除了三类**寄存器**之外，还有对应的**控制电路**
2. 通过这个控制电路，CPU可以向这个接口电路板**传输信号**，来控制实际的硬件
3. 三类寄存器（以打印机为例）
   - **数据**寄存器
     - CPU向IO设备写入需要传输的数据
   - **命令**寄存器
     - CPU发送一个命令，告诉打印机，要进行打印工作
     - 此时打印机里面的**控制电路**会做两个动作
       - 设置**状态寄存器**里面的状态为**not-ready**
       - 实际操作打印机进行打印
   - **状态**寄存器
     - 告诉CPU，现在设备已经在工作了，此时如果CPU再发送数据或者命令过来，打印机是不会响应的
     - 直到前面的工作完成，状态寄存器重新变成**ready**状态，CPU才能发送下一个字符和命令
   - 实际情况，打印机不会只有数据寄存器，还会有**数据缓冲区**
     - CPU是不会真地一个一个字符交给打印机打印，而是一次性把**整个文档**传输到打印机的**内存**或者**数据缓冲区**里面

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-io-ctrl.jpg" width=800/>

## MMIO + PMIO

### MMIO
1. **CPU和IO设备通信**，一样是通过**CPU支持的机器指令**来执行的
2. MIPS的机器指令分类，并没有一种专门和IO设备通信的指令类型，MIPS的CPU是使用**内存地址**来和IO设备进行通信
   - 计算机会把**IO设备的各个寄存器**，以及**IO设备内部的内存地址**，都**映射**到**主内存地址空间**来
   - 主内存的地址空间里，会给不同的IO设备**预留**一段一段的内存地址
3. CPU想要和这些IO设备进行通信时，就会通过**地址线**往这些地址发送数据；对应的数据信息，则是通过**数据线**来发送
   - IO设备会**监控地址线**
   - 在CPU往自己地址发送数据的时候，会把对应**数据线**里面传输过来的数据，**接入**到设备里面的**寄存器**和**内存**里面
4. 上面的方式称为**内存映射IO**（Memory-Mapped I/O，**MMIO**）

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-io-mmio.jpg" width=800/>

### PMIO
1. **MIPS**的CPU很简单，所以**只有MMIO**；但Intel X86架构的计算机，可以设计**专门和IO设备通信的指令**，即**in**指令和**out**指令
2. Intel CPU也支持MMIO，但还可以通过特定的指令，来支持**端口映射IO**（Port-Mapped IO，**PMIO**）
   - PMIO和MMIO的核心区别，PMIO里面访问的设备地址，不再是内存地址空间里面，而是一个**专门的端口**
   - 端口：**和CPU通信的一个抽象概念**

### 小结
1. 无论是**PMIO**还是**MMIO**，CPU都会传送一条**二进制**的数据给到IO设备的对应**地址**
2. **设备本身的接口电路**，再去**解码**这个数据
   - 解码后的数据，会变成一条**设备支持的指令**，再去通过**控制电路**去操作实际的硬件设备
3. 对于CPU而言，并不需要去关心设备本身能够支持哪些操作，只需要在总线上传输一条条数据即可 -- **Command模式**

## 参考资料
[深入浅出计算机组成原理](https://time.geekbang.org/column/intro/100026001)