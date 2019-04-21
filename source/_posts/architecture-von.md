---
title: 架构 -- 冯·诺伊曼体系结构
date: 2019-04-19 12:29:59
categories:
    Architecture
tags:
    Architecture
---

## 目标与组件
1. 目标：_**解决一切可以用计算解决的问题**_
2. 组件：**中央处理器**、**存储**、**输入输出设备**

<!-- more -->

## 组件

### 存储
1. 存储负责存放计算涉及的相关数据，作为计算的输入参数和输出结果
2. 从**中央处理器**的角度，存储可以分为两类
    - 一类是**内置存储**，通过**常规的处理器指令**可以**直接**访问，例如寄存器、内存和主板上的ROM
    - 一类是**外置存储**，中央处理器本身并不能直接读写其中的数据
3. 冯·诺伊曼体系结构中涉及的存储指的是_**内置存储**_

### 输入输出设备
1. 输入输出设备是计算机**开放性**的体现，大大地**拓展**了计算机的能力
2. 每个设备通过一个**端口**与中央处理器连接，通过这个端口，中央处理器可以和设备进行_**数据交换**_
3. 数据交换涉及的**数据格式**由**设备定义**，中央处理器并不能理解，但这不影响设备的接入
4. 设备数据交换的发起方（**设备使用方**）通常**理解并可以解释**所接收的数据含义
    - 设备厂商或操作系统厂商通常会提供设备相关的**驱动程序**，把**设备数据交换的细节**隐藏起来
    - 设备的使用方只需要调用相关的**接口函数**就可以操作设备

### 中央处理器
1. 中央处理器负责程序（指令序列）的执行，指令序列存放在存储
2. 计算机加电启动后，中央处理器会从一个**固定的存储地址**开始执行
3. 中央处理器支持的指令分类：**计算类**、**IO类**、**指令跳转类**

## 实现目标
1. 目标：解决一切可以用计算解决的问题
2. 需求的变化点：要解决的问题是五花八门的，需要以一种**稳定且可扩展的架构**来支持这种变化
3. 需求的稳定点：电脑的核心能力是固定的，即_**计算**_

### 实现计算
1. 电脑的核心能力是**计算**
2. 计算：_对一个数据（输入）进行变换，变为另一个数据（输出）_，对应数学中的函数：`y=F(x)`
    - x和y都是数据，可能是一个简单的数值，也可能是文本、图片和视频等
    - 无论逻辑含义为何，物理上都可以用一段**连续的字节**来表达
    - x和y物理上存放在**存储**上

#### 具体计算的表达
1. 逻辑上来看，无论多么复杂的自定义函数，都是**内置函数、循环和条件分支、子函数**的**组合**定义
2. 对于任意的具体计算来说，都可以用**一组指令序列**来表达，并且以指令序列的形式存放在**存储**里面
    - 因此，存储不仅存放计算所要操作的数据，也存放"计算"本身
    - 只是存储里面存放的计算只是数据，需要中央处理器**理解并执行**这些数据背后的计算行为，才能变成真正意义的计算

#### CPU + 存储
中央处理器+存储，就能够支持**任意复杂**的计算了
<img src="https://architecture-1253868755.cos.ap-guangzhou.myqcloud.com/architecture-von-cpu-storage.png" width=600/>

### 实现IO
<img src="https://architecture-1253868755.cos.ap-guangzhou.myqcloud.com/architecture-von-cpu-storage-io.png" width=600/>
1. 交互，抽象来看就是输入输出，对电脑来说，输入输出可能是千变外化的
2. 除了纯正的**计算能力**之外，中央处理器还需要具备**IO能力**
3. 此时，电脑可以看成：**中央处理器 + 存储 + 一系列的输入输出设备**

#### 解决的根本问题
1. 输入输出设备从根本上解决的是电脑_**无限扩展的能力**_
2. 输入输出设备和电脑是**完全异构**的，输入输出设备对电脑来说只是实现了某项能力的_**黑盒子**_
3. 可以只是一个原始的数字化元器件，也可以是另一台冯.诺依曼架构的电脑，还可以是完全**异构**的电脑（GPU电脑）

## 小结
1. 架构的第一步是**需求分析**，关键是要抓住需求的**稳定点**和**变化点**
    - 需求的**稳定点**，往往是系统的_**核心价值点**_
    - 需求的**变化点**，往往需要去做相应的_**开放性设计**_
2. 对于电脑而言
    - 需求的稳定点：计算能力（中央处理器的指令集，可以单独演进）
    - 需求的变化点：具体计算的多样性（存储中的指令序列），交互的多样性（外部设备与中央处理器的数据交换协议）

<!-- indicate-the-source -->