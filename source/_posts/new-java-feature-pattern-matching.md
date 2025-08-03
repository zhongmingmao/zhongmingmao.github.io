---
title: New Java Feature - Pattern Matching
mathjax: true
date: 2025-01-10 00:06:25
cover: https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/java-pattern-matching.png
categories:
  - Java
  - Feature
tags:
  - Java
  - Java Feature
---

# 概述

1. Java **模式匹配**是一个**新型**的、而且还在**持续快速演进**的领域
2. **类型匹配**是**模式匹配**的一个**规范**，在 **JDK 16** 正式发布
3. 一个模式是**匹配谓词**和**匹配变量**的组合
   - **匹配谓词**用来确定**模式**和**目标**是否**匹配**
   - 在模式和目标**匹配**的情况下，**匹配变量**是从**匹配目标**里**提取**出来的**一个或者多个变量**
4. 对于**类型匹配**来说，**匹配谓词**用来**指定模式**的**数据类型**，而**匹配变量**就是**属于该类型**的**数据变量**
   - 对于**类型匹配**来说，**匹配变量只有一个**

<!-- more -->

# 模式

```java
static boolean isSquare(Shape shape) {
    if (shape instanceof Rectangle) {
        Rectangle rect = (Rectangle) shape;
        return (rect.length == rect.width);
    }

    return (shape instanceof Square);
}
```

> 模式拆分 - **类型判断 + 类型转换** - 增加出错概率

1. **类型判断**语句 - 匹配谓词
2. **类型转换**语句
3. **声明**一个**新的本地变量**，即匹配变量，来承载转换后的数据

# 类型匹配

```java
if (shape instanceof Rectangle rect) {
    return (rect.length == rect.width);
}
```

![image-20250803234618210](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250803234618210.png)

> 使用**类型匹配**的代码，只有**匹配谓词**和**本地变量**两部分，并且在**同一个语句**里

![image-20250803234809565](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250803234809565.png)

1. 如果目标变量是一个长方形的实例，那么这个目标变量就会被赋值给一个本地的长方形变量，即匹配变量，否则不会被赋值
2. Java 编译器**不允许使用**没有赋值的匹配变量

![image-20250803235537533](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250803235537533.png)

![image-20250803235730105](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250803235730105.png)

> 使用**匹配变量**的条件语句 **else** 分支并没有声明这个匹配变量 - **作用域** - 类型匹配的关键

# 匹配变量的作用域

> 只有**明确匹配**，才能**使用**

1. 匹配变量的作用域，就是**目标变量**可以**被确认匹配**的范围
   - 如果在一个范围内，**无法确认**目标变量**是否被匹配**，或者目标变量**不能被匹配**，都**不能使用**目标变量
2. 编译器角度 - 在一个范围里，如果**编译器**能够确定匹配变量**已经被赋值**，那么它就可以在这个范围内使用
   - 如果编译器**无法确定**匹配变量**是否被赋值**，或者确定**没有被赋值**，那么它就不能在这个范围内使用

## Case 1

```java
public static boolean isSquare(Shape shape) {
  if (shape instanceof Rectangle rectangle) {
    // rectangle is in scope
    return rectangle.length == rectangle.width;
  }

  // rectangle is out of scope
  return shape instanceof Square;
}
```

## Case 2

```java
public static boolean isSquare(Shape shape) {
  if (!(shape instanceof Rectangle rectangle)) {
    // rectangle is out of scope
    return shape instanceof Square;
  }
  // rectangle is in scope
  return rectangle.length == rectangle.width;
}
```

## Case 3

```java
public static boolean isSquare(Shape shape) {
  return shape instanceof Square
      || shape instanceof Rectangle rectangle && rectangle.length == rectangle.width;
}
```

## Case 4

> 类型不匹配，才能进行下一步运算，即编译器**明确知道**匹配变量**没有被赋值**

![image-20250804001605767](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250804001605767.png)

## Case 5

> **&** 运算符两侧的表达式**都要参与计算** - 无论左侧的类型匹配与否，右侧的匹配变量都要使用 - 违反了匹配变量的作用域原则 - 编译器**无法确认**匹配变量**是否被赋值**

![image-20250804001843882](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250804001843882.png)

# Case 6

1. 定义了一个**静态变量**，它**和匹配变量同名**
2. 在**匹配变量**的**作用域**内，除非特殊处理，否则这个**静态变量**就被**遮掩**住了 - **影子变量** - **Shadowed Variable**

![image-20250804002405846](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250804002405846.png)

# 性能提升

> **20%**

```
Benchmark                 Mode  Cnt          Score          Error  Units
PatternBench.useCast     thrpt   15  263559326.599 ± 78815341.366  ops/s
PatternBench.usePattern  thrpt   15  313458467.044 ±  2666412.767  ops/s
```

