---
title: 计算机组成 -- 建立数据通路
mathjax: false
date: 2020-01-16 22:02:33
categories:
    - Computer Basics
    - Computer Organization
tags:
    - Computer Basics
    - Computer Organization
---

## 三种周期
### 指令周期
1. 执行一条指令的过程
   - **Fetch**（取得指令）
     - 从**PC寄存器**里面找到对应的**指令地址**，根据指令地址从**内存**里把具体的指令，**加载到指令寄存器**中
     - 然后把PC寄存器**自增**，便于未来执行下一条指令
   - **Decode**（指令译码）
     - 根据**指令寄存器**里面的指令，解析成要进行什么样的操作，是**R、I、J**中的哪一种指令
     - 具体要操作哪些**寄存器**、**数据**或者**内存地址**
   - **Execute**（执行指令）
     - **实际运行**对应的R、I、J这些特定的指令，进行**算术逻辑操作**、**数据传输**或者**直接的地址跳转**
   - 重复上面步骤
2. **指令周期**（Instruction Cycle）：**Fetch -> Decode -> Execute**

<!-- more -->

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-build-data-path-instruction-cycle.jpg" width=800/>

#### 涉及的组件
1. **取指令**的阶段，指令是放在**存储器**里的
2. 通过**PC寄存器**和**指令寄存器**取出指令的过程，是由**控制器**（Control Unit）操作的
3. 指令的**解码**过程，也是由**控制器**进行的
4. 一旦到了**执行指令**阶段，R、I型指令都是由**算术逻辑单元**（ALU）操作
    - 进行**算术操作**、**逻辑操作**的**R型**指令
    - 进行**数据传输**、**条件分支**的**I型**指令
5. 如果是**简单的无条件地址跳转**，可以直接在**控制器**里面完成，不需要用到运算器

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-build-data-path-instruction-cycle-component.jpg" width=800/>

### 机器周期
1. Machine Cycle：**机器周期**或者**CPU周期**
2. CPU内部的操作速度很快，但访问内存的速度却慢很多，每条指令都需要从内存里面加载而来
    - 一般把**从内存里读取一条指令的最短时间**，称为CPU周期

### 时钟周期
1. Clock Cycle：**时钟周期**（主频）

### 三者关系
1. 一个**CPU周期（机器周期）**，通常会由几个**时钟周期**累积起来
2. 对于一个**指令周期**来说，取出一条指令，然后执行它，至少需要**两个CPU周期**
    - 取出指令至少需要一个CPU周期，执行指令至少也需要一个CPU周期
      - **指令译码**只需要**组合逻辑电路**，**不需要一个完整的时钟周期** -- **时间很短**
    - 复杂的指令规则需要更多的CPU周期

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-build-data-path-cycle.jpg" width=1000/>

## 建立数据通路
1. **数据通路**就是处理器单元，由两类元件组成：**操作元件**、**存储元件**
2. **操作元件**
   - 也称为**组合逻辑元件**，即**ALU**
   - 功能：在特定的输入下，根据**组合电路**的逻辑，生成特定的输出
3. **存储元件**
   - 也叫**状态元件**，如计算过程中用到的寄存器，不论是**通用寄存器**还是**状态寄存器**，都是存储元件
4. 通过**数据总线**的方式，把操作元件和存储元件连接起来，就可以完成数据的**存储**、**处理**和**传输**了，**建立了数据通路**

### 控制器
1. 控制器只是机械地重复**Fetch -> Decode -> Execute**循环中的前两个步骤
   - 然后把在最后一个步骤通过**控制器**产生的**控制信号**，交给**ALU**去处理
2. **所有CPU支持的指令**，都会在**控制器**里面，被解析成不同的**输出信号** -- **电路非常复杂**
3. 运算器里的ALU和各种组合逻辑电路，可以认为是一个固定功能的电路
   - 控制器翻译出来的就是不同的**控制信号**
   - 这些控制信号，告诉**ALU**去做不同的计算
4. **指令译码器**将输入的**机器码**（机器指令），解析成不同的**操作码**和**操作数**，然后传输给**ALU**进行计算

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-build-data-path-controller.jpg" width=600/>

### 所需硬件电路
1. **ALU**
   - 一个**没有状态**的，**根据输入计算输出**的组合逻辑电路
2. **寄存器**
   - 一个能进行**状态读写**的电路元件
   - 这个电路能够**存储上一次的计算结果**
   - 常见实现：**锁存器**（Latch）、**D触发器**（Data/Delay Flip-flop）
3. 『**自动**』的电路
   - 按照固定的周期，不停地实现**PC寄存器**自增，自动去执行**Fetch -> Decode -> Execute**的步骤
   - **PC寄存器 = 程序计数器**
4. 『**译码**』的电路
   - 对**指令**进行**decode**
   - 拿到**内存地址**去**获取**对应的数据或者指令