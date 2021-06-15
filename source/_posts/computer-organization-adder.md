---
title: 计算机组成 -- 加法器
mathjax: false
date: 2020-01-13 13:02:26
categories:
    - Computer Basics
    - Computer Organization
tags:
    - Computer Basics
    - Computer Organization
---

## 基本门电路
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-adder-gate-circuit.jpg" width=1000/>

1. 基本门电路：**输入都是两个单独的bit，输出是一个单独的bit**
2. 如果要对2个8bit的数字，计算**与或非**的简单逻辑（无进位），只需要连续摆放8个开关，来代表一个8bit数字
3. 这样的两组开关，从左到右，上下单个的位开关之间，都统一用『**与门**』或者『**或门**』连起来
   - 就能实现两个8bit数的**AND**运算或者**OR**运算

<!-- more -->

## 异或门 + 半加器

### 一bit加法
1. 个位
   - 输入的两位为`00`和`11`，对应的输出为`0`
   - 输入的两位为`10`和`01`，对应的输出为`1`
   - 上面两种关系都是**异或门**（XOR）的功能
   - **异或门是一个最简单的整数加法，所需要使用的基本门电路**
2. 进位
   - 输入的两位为`11`时，需要向**更左侧**的一位进行进位，对应一个**与门**
3. 通过一个**异或门**计算出**个位**，通过一个**与门**计算出**是否进位**
   - 把这两个门电路**打包**，叫作**半加器**（Half Adder）

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-adder-half-adder.jpg" width=1000/>

## 全加器
1. **半加器只能解决一bit加法的问题**，不能解决2bit或以上的加法（因为有**进位**信号）
2. 二进制加法的竖式，从右往左，第二列称为**二位**，第三列称为**四位**，第四列称为**八位**
3. 全加器：**两个半加器**和**一个或门**
   - 把两个半加器的**进位输出**，作为一个**或门**的输入
     - **只要两次加法中任何一次需要进位**，那么在二位上，就需要向左侧的四位进一位
     - 一共只有三个bit相加，即使都是1，也**最多只会进一位**

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-adder-full-adder.jpg" width=1000/>

### 8bit加法
1. 把8个全加器**串联**，个位全加器的进位信号作为二位全加器的输入信号，二位全加器的进位信号作为四位全加器的输入信号
2. 个位全加器只需要用到**一个半加器**，或者让**全加器的进位输入始终是0**，因为个位没有来自更右侧的进位
3. 最左侧的进位信号，表示的并不是再进一位，而是表示**加法是否溢出**
   - 该溢出信号可以输出到硬件中的其它标志位，让计算机知道计算结果是否溢出

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-adder-full-adder-8bit.jpg" width=1000/>

## 分层思想
**门电路 -> 半加器 -> 全加器 -> 加法器 -> ALU**

## 参考资料
[深入浅出计算机组成原理](https://time.geekbang.org/column/intro/100026001)