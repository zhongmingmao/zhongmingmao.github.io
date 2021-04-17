---
title: 计算机组成 -- 电路
mathjax: false
date: 2020-01-12 00:23:39
categories:
    - Computer Basics
    - Computer Organization
tags:
    - Computer Basics
    - Computer Organization
---

## 电报机
1. 电报机的本质：**蜂鸣器** + **电线** + **按钮开关**
2. 蜂鸣器装在接收方，开关留在发送方，双方通过电线连在一起

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-circuit-telegraph.jpg" width=600/>

<!-- more -->

## 继电器
1. 电线的线路越长，电线的电阻越大，当电阻很大，而电压不够时，即使按下开关，蜂鸣器也不会响的
2. **继电器**（Relay）：为了实现**接力传输信号**
3. 中继：不断地通过新的电源**重新放大**已经**开始衰减**的原有信号
    - 中间所有小电报站都使用『**螺旋线圈+磁性开关**』的方式，来替代**蜂鸣器+普通开关**
    - 只在电报的**始发**和**终点**用普通开关和蜂鸣器
    - 这样就可以将长距离的电报线路，拆成一个个小的电报线路，接力传输电报信号
4. 继电器别名：**电驿**，驿站的驿

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-circuit-relay.jpg" width=600/>

## 二进制
1. 有了继电器后，输入端通过开关的『开』和『关』表示1和0，输出端也能表示1和0
    - 输出端的作用，不仅仅是通过一个蜂鸣器或者灯泡，提供一个供人观察的输出信号
    - 还可以通过『螺旋线圈+磁性开关』，使得输出也有『开』和『关』两种状态，表示1和0，作为**后续线路的输入信号**
2. 与（AND）
    - 在输入端的电路上，提供**串联**的两个开关，只有两个开关都打开，电路才接通，输出的开关才能接通
3. 或（OR）
    - 在输入端的电路上，提供**两条独立的线路**到输出端
    - 两条线路上各有一个开关，任意一个开关打开了，到输出端的电路都是接通的
4. 非（NOT） -- **反相器**
    - 把『螺旋线圈+磁性开关』的组合，从**默认关闭**（只有通电才打开），换成**默认打开**（只有通电才关闭）

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-circuit-inverter.jpg" width=600/>

## 参考资料
[深入浅出计算机组成原理](https://time.geekbang.org/column/intro/100026001)