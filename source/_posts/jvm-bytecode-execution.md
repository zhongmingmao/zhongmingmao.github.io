---
title: 字节码 - JVM字节码执行过程
date: 2016-07-06 00:06:25
categories:
    - JVM
tags:
    - Netease
    - JVM
---

{% note info %}
本文将通过是实例简单介绍`JVM字节码`基于`栈`的执行过程
{% endnote %}

<!-- more -->
# Stack Frame
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/stack_frame.png" width="500">

1. 一个方法`从调用到执行完成`，对应着一个栈帧（`Stack Frame`）在虚拟机栈（`VM Stack`）里面`从入栈到出栈`的过程
2. 在`编译`成`字节码`期间，栈帧需要多大的局部变量表（`Local Variable Table`），多深的操作数栈（`Operand Stack`）都已经完全确定，并且写入到`方法表的Code`属性中
3. 在`活动线程`中，只有位于`栈顶的栈帧`才是有效的，称为`当前栈帧`，与这个栈帧关联的方法称为`当前方法`
4. 局部变量表
    - 用于存放`方法参数`和`方法内部定义的局部变量`
    - 方法表中的`locals`属性记录了`局部变量表的最大容量`
    - 局部变量表的存储单元为`32-bit的slot`，`boolean`、`byte`、`char`、`short`、`int`、`float`等会占用一个`slot`，`long`和`double`会占用两个`slot`
    - 如果执行的是`实例方法`，那么`第0个slot`默认存储`this`
    - 为了`节省栈帧空间`，`slot是可重用`的
5. 操作数栈
    - 方法表中的`stack`属性记录了`操作数栈的最大深度`
    - 操作数栈可以容纳任意的`Java`数据类型，`32-bit`数据类型所占用的栈容量为`1`，`64-bit`数据类型所以占用的栈容量为`2`

# 代码
```java
package me.zhongmingmao.test;
public class BytecodeExecution {
    public int calc() {
        int a = 100;
        int b = 200;
        int c = 300;
        return (a + b) * c;
    }
}
```

# 字节码
```
# javap -v
public int calc();
    descriptor: ()I
    flags: ACC_PUBLIC
    Code:
        stack=2, locals=4, args_size=1
            0: bipush        100
            2: istore_1
            3: sipush        200
            6: istore_2
            7: sipush        300
            10: istore_3
            11: iload_1
            12: iload_2
            13: iadd
            14: iload_3
            15: imul
            16: ireturn
        LocalVariableTable:
            Start  Length  Slot  Name   Signature
                0      17     0  this   Lme/zhongmingmao/test/BytecodeExecution;
                3      14     1     a   I
                7      10     2     b   I
               11       6     3     c   I
```

1. `stack=2`，这个在分析下面`16个JVM字节码指令`的运行过程后就能验证这是正确的，从`Java源代码`是无法直观的得出这个值
2. `locals=4`，从`Java源代码`可以看出，`calc()`只定义了`a`、`b`、`c`三个局部变量，而`calc()`又是`实例方法`，局部变量表`第1个slot`默认会有记录`this`，因此能得出`locals=4`（在这里slot没有进行复用）
3. 在`JVM字节码`中的`LocalVariableTable`属性，很清晰表述了`局部变量表`的布局，其中需要注意的是`Start`指的是局部变量`生命周期开始的字节码偏移量`，`Length`指的是`作用范围覆盖的长度`，而并非变量本身的长度
4. `args_size=1`，`实例方法`默认会传入`this`，因此`args_size=1`

# 执行过程

## bipush 100
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/bytecode_execution_1.png" width="500">

## istore_1
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/bytecode_execution_2.png" width="500">

## iload_1
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/bytecode_execution_3_1.png" width="500">

## iload_2
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/bytecode_execution_4.png" width="500">

## iadd
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/bytecode_execution_5.png" width="500">

## iload_3
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/bytecode_execution_6.png" width="500">

## imul
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/bytecode_execution_7.png" width="500">

## ireturn
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/bytecode_execution_8.png" width="500">

<!-- indicate-the-source -->
