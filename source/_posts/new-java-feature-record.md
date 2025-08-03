---
title: New Java Feature - Record
mathjax: true
date: 2025-01-08 00:06:25
cover: https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/new-java-feature-record.png
categories:
  - Java
  - Feature
tags:
  - Java
  - Java Feature
---

# 概述

1. JDK 16
2. Java 档案类是用来表示**不可变数据**的**透明载体**

<!-- more -->

# OOP

> 封装 + 继承 + 多态

![image-20250802180031165](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250802180031165.png)

> 接口不是多线程安全的 - 将 **Public** 方法设置成**同步方法** - 开销很大

![image-20250802180405992](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250802180405992.png)

> 更优方案 - 即使不使用线程同步，也能做到多线程安全 - **不可变对象**

![image-20250802181021877](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250802181021877.png)

1. 天生的多线程安全 - 类对象一旦实例化就不能再修改
2. 简化代码 - 删除读取半径的方法，直接公开半径这个变量 - 与 Go 类似
   - Circle 一直可以用半径来表达，所以并没有带来**违反封装原则**的**实质性后果**

> 进一步简化

![image-20250802181639191](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250802181639191.png)

1. 使用**公开的只读变量** - 使用 **final** 修饰符来表明只读变量
2. **公开的只读变量**，只在在**公开的构造方法**中**赋值** - 解决对象的**初始化问题**
3. 公开的只读变量，**替换掉了读取的方法** - 减少代码量

# 声明档案类

> Java 档案类是用来表示**不可变数据**的**透明载体**

![image-20250803162105113](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250803162105113.png)

1. **record** 关键字是 **class** 关键字的一种**特殊表现形式**，用来标识档案类
2. record 关键字可以使用与 class 关键字差不多一样的**类修饰符** - public/static
3. 类标识符 Circle 后，用**小括号**括起来的**参数** - 类似于一个**构造方法**
4. 在大括号里，档案类的**实现代码** - 变量的声明没有了，构造方法也没有了
5. 类标识符声明后面的**小括号**里的**参数**，就是**等价**的**不可变变量**
   - 在档案类中，这样的**不可变变量**是**私有的变量**，不可以直接读取
   - 但可以通过**等价的方法**来调用，**变量的标识符**就是**等价方法的标识符**
6. 档案类表示的**不可变数据**，除了**构造方法**之外，并**没有**给不可变变量**赋值**的方法

# 意料之外的改进

> 档案类内置了**缺省**的 **equals** 方法、**hashCode** 方法以及 **toString** 方法的实现 - 提高编码效率

![image-20250803164015892](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250803164015892.png)

1. 如果需要比较两个**实例**是不是**相等**的，需要重写 **equals** 和 **hashCode** 方法 - **代码安全**的**重灾区**
2. 如果需要把实例转换为肉眼可以阅读的信息，需要重写 **toString** 方法

# 不可变的数据

> 为了强化**不可变**的原则，避免 **OOP** 的陷阱，档案类还做了如下**限制**

1. Java 档案类**不支持扩展子句**，用户不能定制它的父类 - **java.lang.Record**
   - **父类不能定制**，意味着不能通过**修改父类**来影响 Java 档案类的**行为**
2. Java 档案类是一个 **final 类**，不支持**子类**，也不能是**抽象类**
   - **没有子类**，意味着不能通过**修改子类**来改变 Java 档案类的**行为**
3. Java 档案类声明的变量是**不可变的变量**
   - 一旦**实例化**就不能再修改
4. Java 档案类不能声明**可变的变量**，也不能支持**实例初始化**的**方法**
   - 保证了只能使用**档案类形式**的**构造方法**，避免**额外的初始化**对**可变性**的影响
5. Java 档案类不能声明 **native 方法**
   - 如果运行 native 方法，意味着打开了**修改不可变变量**的**后门**

> 除了上述的**限制**，Java **档案类**与**普通类**的用法是**一样**的

# 透明的载体

> 透明载体 - 档案类承载有**缺省实现**的方法，这些方法可以**直接使用**，也可以**替换**掉

1. Java 档案类内置了下列方法的**缺省实现**
   - **构造**方法、**equals** 方法、**hashCode** 方法、**toString** 方法、**不可变数据**的**读取**方法
2. 可以使用缺省的实现，也可以替换掉缺省的实现
   - 除了**构造方法**，其它的替换方法都可以使用 **Override** 注解来标注

```java
public record Circle(double radius) implements Shape {

  public Circle(double radius) {
    this.radius = radius;
  }

  @Override
  public double getArea() {
    return Math.PI * radius * radius;
  }

  @Override
  public boolean equals(Object o) {
    if (o == null || getClass() != o.getClass()) return false;
    Circle circle = (Circle) o;
    return Double.compare(radius, circle.radius) == 0;
  }

  @Override
  public int hashCode() {
    return Objects.hashCode(radius);
  }

  @Override
  public String toString() {
    return "Circle{radius=%s}".formatted(radius);
  }

  @Override
  public double radius() {
    return radius;
  }
}
```

# 重写构造函数

> 最常见的替换，是要在**构造方法**里对构造类声明的**变量**添加**必要的检查**

```java
public record Circle(double radius) implements Shape {

  public Circle {
    if (radius < 0) throw new IllegalArgumentException("radius cannot be negative");
  }

  @Override
  public double getArea() {
    return Math.PI * radius * radius;
  }
}
```

1. 构造方法的**声明没有参数**，也没有**给实例变量赋值**的语句
2. 为了**简化代码**，Java **编译**的时候，会**补充**上去

![image-20250803170938824](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250803170938824.png)

> Convert **canonical** constructor to **compact** form

![image-20250803171111940](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250803171111940.png)

# 重写 equals 方法

1. 如果**缺省**的 **equals** 方法和 **hashCode** 方法**不能正常工作**或者**存在安全问题**，就需要**替换**掉
2. 如果声明的**不可变变量**没有重写 **equals** 方法和 **hashCode** 方法 - **行为可能不可预测**

> 不可变的变量是一个**数组** - 数组变量**没有重写 equals 方法**

```java
jshell> record Password(byte[] password) {};
|  created record Password

jshell> Password pA = new Password("123456".getBytes());
pA ==> Password[password=[B@3f49dace]
|  created variable pA : Password

jshell> Password pB = new Password("123456".getBytes());
pB ==> Password[password=[B@490ab905]
|  created variable pB : Password

jshell> pA.equals(pB);
$5 ==> false
|  created scratch variable $5 : boolean
```

> java.lang.String - 重写了 equals 方法

```java
jshell> record Password(String password) {};
|  created record Password

jshell> Password pA = new Password("123456");
pA ==> Password[password=123456]
|  created variable pA : Password

jshell> Password pB = new Password("123456");
pB ==> Password[password=123456]
|  created variable pB : Password

jshell> pA.equals(pB);
$5 ==> true
|  created scratch variable $5 : boolean
```

> 一般情况下，**equals** 方法和 **hashCode** 方法是**成双成对**的

# 不推荐的重写

1. 通常不建议重写**不可变数据**的**读取**方法
2. 可能变更缺省的不可变数值，**打破实例的状态**，造成很多**无法预料**的后果

> **容易出错 + 难以调试**

```java
jshell> record Number(int x) {
   ...>     public int x() {
   ...>         return x > 0 ? x : (-1) * x;
   ...>     }
   ...> }
|  created record Number

jshell> Number n = new Number(-1);
n ==> Number[x=-1]
|  created variable n : Number

jshell> n.x();
$3 ==> 1
|  created scratch variable $3 : int

jshell> Number m = new Number(n.x());
m ==> Number[x=1]
|  created variable m : Number

jshell> m.equals(n);
$5 ==> false
|  created scratch variable $5 : boolean
```

