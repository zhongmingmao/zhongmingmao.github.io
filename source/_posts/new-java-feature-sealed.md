---
title: New Java Feature - Sealed
mathjax: true
date: 2025-01-09 00:06:25
cover: https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/new-java-feature-sealed.webp
categories:
  - Java
  - Feature
tags:
  - Java
  - Java Feature
---

# 无法穷举

> 判断一个形状是不是正方形

![image-20250803175034811](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250803175034811.png)

<!-- more -->

1. 上述判断 - 一个形状的对象是不是一个正方形的实例
2. 一个形状的对象即使不是一个正方形的实例，也可能是一个正方形
   - 很多形状的特殊形式就是正方形 - 长方形、菱形、梯形、多边形等 - **无法穷举**
3. 通过 instanceof 并不能正确判断一个形状是否为正方形

> 问题根源 - **无限制的扩展性**

![image-20250803180025703](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250803180025703.png)

# 限制扩展性

1. **OOP** 的最佳实践之一，就是把**可扩展性**限制在可以**预测**和**控制**的范围内，而不是**无限**的扩展性
2. **继承**的**安全缺陷**
   - 一个可扩展的类，**子类**和**父类**可能会**相互影响**，从而导致**不可预知**的行为
   - 涉及**敏感信息**的类，增加可扩展性不一定是个优先选项，要尽量避免父类或者子类的影响
3. 在设计 API 时，需要反复思考
   - 一个**类**，有没有**真实的可扩展需求**，能不能使用 **final** 修饰符
   - 一个**方法**，子类有没有**重写的必要性**，能不能使用 **final** 修饰符
4. **限制**住**不可预测**的**可扩展性**，是实现**安全代码**、**健壮代码**的一个重要目标
5. 在 **JDK 17** 之前，**限制可扩展性**只有两个方法 - 使用**私有类**或者 **final** 修饰符
   - 私有类不是公开接口，只能内部使用，而 final 修饰符则彻底放弃了可扩展性
   - 要么**全开放**，要么**全封闭**，可扩展性只能在**两个极端**游走
   - **全封闭**彻底没有了**可扩展性**，而**全开放**又面临固有的**安全缺陷**
6. 在 JDK 17 后，使用 **sealed** 修饰的类就是**封闭类**，使用 **sealed** 修饰的接口就是**封闭接口**
   - 封闭类和封闭接口**限制**可以**扩展**或**实现**他们的其它类或接口
7. 通过把**可扩展性**的**限制**放在**可以预测和控制的范围内**，封闭类和封闭接口打开了**全封闭**和**全开放**两个极端之间的**中间地带**

# 声明封闭类

1. 类型分类
   - 被扩展的**父类** - **封闭类**
   - 扩展而来的**子类** - **许可类**
2. **封闭类的声明**使用 **sealed** 类修饰符，然后在所有的 **extends** 和 **implements** 语句之后，使用 **permits** 指定**允许扩展该封闭类的子类**

> Sealed class **permits** clause must contain **all subclasses**

![image-20250803223017727](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250803223017727.png)

![image-20250803223109732](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250803223109732.png)

> All **sealed class subclasses** must either be **final**, **sealed** or **non-sealed**

![image-20250803223220232](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250803223220232.png)

1. 由 **permits** 关键字指定**许可子类**（permitted subclasses）必须和**封闭类**处在同一个模块（**module**）或者包空间（**package**）里
2. 如果**封闭类**和**许可类**是在**同一个模块**里，那么他们可以处在**不同的包空间**里
3. 如果**许可子类**和**封闭类**在**同一个源代码文件**里，**封闭类**可以不使用 **permits** 语句
   - **Java 编译器**将**检索源文件**，在**编译期**为**封闭类**添加上**许可子类**

# 声明许可类

> 许可类的声明需要满足以下三个条件

1. **许可类**必须和**封闭类**处于同一个模块（**module**）或者包空间（**package**）里，即在**编译**时，**封闭类**必须**可以访问**它的**许可类**
2. **许可类**必须是**封闭类**的**直接扩展类**
3. 许可类必须声明**是否继续保持封闭** - All **sealed class subclasses** must either be **final**, **sealed** or **non-sealed**

| Key        | Value      | Desc                 |
| ---------- | ---------- | -------------------- |
| final      | **终极类** | 关闭扩展性           |
| sealed     | **封闭类** | 延续受限制的扩展性   |
| non-sealed | **解封类** | 支持不受限制的扩展性 |

> **Sealed class** must have **subclasses**

![image-20250803225351599](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250803225351599.png)

1. **许可类**必须是**封闭类**的**直接扩展**，因此**许可类不具备传递性**
2. ColoredCircle 是 Circle 的子类，但 Circle 是**解封类**，不是 Shape 封闭类的直接扩展，因此 **ColoredCircle 不是 Shape 的许可类**

# 案例回顾

> 如何判断一个形状是不是正方形

1. 将形状类定义为**封闭类**
   - Sealed class **permits** clause must **contain all subclasses**
   - 此时，所有形状的**子类**是可以**穷举**的
   - 然后需找可以用来表示正方形的**许可类**
2. Shape 是一个**封闭类**，本质上一个**扩展性受限**的类，因此我们能**穷举**所有扩展性

# 优先级

> 可扩展性的限定方法 - **优先级由高到低**

1. 使用**私有类**
2. 使用 **final** 修饰符
3. 使用 **sealed** 修饰符
4. **不受限制**的扩展性 - 不推荐 - 失控

