---
title: Java Feature - Type Matching
mathjax: true
date: 2024-10-12 00:06:25
cover: https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/java-feature-pattern-matching.webp
categories:
  - Java
  - Feature
tags:
  - Java
  - Java Feature
---

# 模式匹配

> 匹配谓词 + 匹配变量

1. Java **模式匹配**是一个**新型**的、还在**持续快速演进**的领域
2. **类型匹配**是**模式匹配**的一个**规范**，在 **JDK 16** 正式发布
3. 一个**模式**是**匹配谓词**和**匹配变量**的组合
   - **匹配谓词**用来确定模式和目标**是否匹配**
   - 在**模式和目标匹配**的情况下，**匹配变量**是从**匹配目标**中**提取**出来的**一个或多个变量**
4. 对**类型匹配**来说
   - **匹配谓词**用来**指定模式的数据类型**
   - **匹配变量**数属于该**类型**的**数据变量** - 只有**一个**

<!-- more -->

# 类型转换

> 生产力低下 - 类型**判断** + 类型**转换**

![image-20241205102453610](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241205102453610.png)

1. **类型判断**语句，即**匹配谓词** - `shape instanceof Rectangle`
2. **类型转换**语句，使用类型转换运算符 - `(Rectangle) shape`
3. 声明一个新的**本地变量**，即**匹配变量**，来**承载**类型转换后的数据 - `Rectangle rectangle =`

# 类型匹配

![image-20241205104143126](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241205104143126.png)

> 都在**同一个语句**中，只有**匹配谓词**和**本地变量**两部分

![d9882c077deb68b2675f68c5794840d1](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/d9882c077deb68b2675f68c5794840d1.jpg)

> 避免误用 - **编译器**不会允许使用**没有赋值**的**匹配变量**

![image-20241205104903129](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241205104903129.png)

# 作用域

> 匹配变量的作用域

![image-20241205105347888](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241205105347888.png)

1. 匹配变量的作用域，即**目标变量**可以**被确认匹配的范围**
   - 如果在一个范围内，**无法确认**目标变量**是否被匹配**，或者目标变量**不能被匹配**，都**不能使用**匹配变量
2. **编译器**视角 - **明确被赋值** - 才能**使用**
   - 在一个范围内，如果编译器能够确定**匹配变量已经被赋值**，那么它可以在这个范围内使用
   - 如果编译器**无法确定**匹配变量是否被赋值，或者**确定没有被赋值**，则不能在这个范围内使用

> 确认匹配

```java
  public static boolean isSquare(Shape shape) {
    if (shape instanceof Rectangle rectangle) {
      // rectangle is in scope here
      return rectangle.length() == rectangle.width();
    }
    // rectangle is out of scope here
    return shape instanceof Square;
  }
```

> 确认不匹配

```java
  public static boolean isSquare(Shape shape) {
    if (!(shape instanceof Rectangle rectangle)) {
      // rectangle is out of scope here
      return shape instanceof Square;
    }

    // rectangle is in scope here
    return rectangle.length() == rectangle.width();
  }
```

> 紧凑方式

```java
  public static boolean isSquare(Shape shape) {
    return shape instanceof Square
        || (shape instanceof Rectangle rectangle && rectangle.length() == rectangle.width());
  }
```

```java
  public static boolean isSquare(Shape shape) {
    return shape instanceof Square
        || (!(shape instanceof Rectangle rectangle) || rectangle.length() == rectangle.width());
  }
```

> 位运算两侧的运算都要执行，不存在逻辑关系，**无法保证一定类型匹配**，编译器**无法确定**类型一定匹配

![image-20241205112303425](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241205112303425.png)

> Shadowed Variable

![image-20241205112557541](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241205112557541.png)

![image-20241205112951576](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241205112951576.png)
