---
title: Java Feature - Record
mathjax: true
date: 2024-10-10 00:06:25
cover: https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/java-feature-record.webp
categories:
  - Java
  - Feature
tags:
  - Java
  - Java Feature
---

# 概述

1. **Record** 在 **JDK 16** 正式发布
2. Record 用来表示**不可变数据**的**透明载体**

<!-- more -->

# OOP

> 封装 + 继承 + 多态

```java
public interface Shape {
  double getArea();
}
```

```java
public class Circle implements Shape {

  private double radius;

  @Override
  public double getArea() {
    return Math.PI * radius * radius;
  }

  public void setRadius(double radius) {
    this.radius = radius;
  }

  public double getRadius() {
    return radius;
  }
}
```

> 同步方法 - 吞吐量大幅下降

```java
public class Circle implements Shape {

  private double radius;

  @Override
  public synchronized double getArea() {
    return Math.PI * radius * radius;
  }

  public synchronized void setRadius(double radius) {
    this.radius = radius;
  }

  public synchronized double getRadius() {
    return radius;
  }
}
```

> 不可变对象 + 公开不可变属性 - 一旦实例化，就不允许修改对象属性

```java
public class Circle implements Shape {

  public final double radius;

  public Circle(double radius) {
    this.radius = radius;
  }

  @Override
  public double getArea() {
    return Math.PI * radius * radius;
  }
}
```

1. **公开**的**只读变量** - 通过 **final** 修饰
2. 公开的只读变量，只在**公开的构造方法**中**赋值** - 对象**初始化**
3. 公开的只读变量，**替换**了**公开**的**只读方法**

# Record

> **record** 关键字是 **class** 关键字的一种**特殊表现形式**，用来标识**档案类**

```java
// Circle instance is immutable
// radius is private final field, but it is accessible via the public method radius()
public record Circle(double radius) implements Shape {

  @Override
  public double getArea() {
    return Math.PI * radius * radius;
  }

  public static void main(String[] args) {
    Circle circle = new Circle(10.0);
    double v = circle.radius();
  }
}
```

# 改进

![image-20241203193408738](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241203193408738.png)

1. 比较两个实例是否相等，需要重写 **equals** 和 **hashCode** - 难以**正确编写**
2. 档案类**内置**了**缺省**的 equals、hashCode、toString 的实现
   - 减少代码数量 + 提高编码效率 + 减少编码错误 + 提高编码质量

# 不可变数据

> Java 档案类是一种特殊形式的 Java 类

1. 如果一个 Java 类一旦**实例化**就**不能再修改**，那么它表述的数据为**不可变数据**
2. 档案类**不支持 extends**，隐含的**父类**为 **java.lang.Record**，因此无法通过修改父类来影响档案类的行为
3. 档案类是 **final** 的，**不支持子类**，也**不能是抽象类**，因此无法通过修改子类来改变档案类的行为
4. 档案类中声明的变量是**不可变的变量**
5. 档案类**不能声明可变的变量**，也不能支持**实例初始化**的方法
   - 只能使用**档案类形式**的**构造函数**，避免**额外的初始化**对**可变性**的影响
6. 档案类**不能声明 native 方法**，否则打开了**修改不可变变量**的**后门**

# 透明载体

1. 档案类内置了方法的**缺省**实现（可**替换**） - 构造方法、equals、hashCode、toString、不可变数据的读取方法
2. 除了**构造方法**，其它的替换方法都可以使用 **Override** 注解来标注
3. 透明载体 - 档案类承载有**缺省实现**的方法，**直接使用**或者**替换**

```java
public record RecordCircle(double radius) implements Shape {

  public RecordCircle(double radius) {
    this.radius = radius;
  }

  @Override
  public double getArea() {
    return Math.PI * radius * radius;
  }

  @Override
  public boolean equals(Object obj) {
    if (this == obj) {
      return true;
    }
    if (obj instanceof RecordCircle other) {
      return other.radius == this.radius;
    }
    return false;
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.radius);
  }

  @Override
  public String toString() {
    return String.format("RecordCircle[radius=%f]", this.radius);
  }

  @Override
  public double radius() {
    return this.radius;
  }
}
```

## 构造方法

> 要在构造方法中对档案类**声明的变量**添加必要的**检查**
> **compact constructor** - 构造函数自动声明参数和自动赋值

![image-20241204101815378](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241204101815378.png)

## equals + hashCode

> 如果采用档案类的**缺省**实现，**equals** 和 **hashCode** 方法的行为**可能无法预测**
> 数组没有重写 equals 和 hashCode

```java
jshell> record Password(byte[] password) {};
|  created record Password

jshell> Password p1 = new Password("123456".getBytes());
p1 ==> Password[password=[B@433c675d]
|  created variable p1 : Password

jshell> Password p2 = new Password("123456".getBytes());
p2 ==> Password[password=[B@1a6c5a9e]
|  created variable p2 : Password

jshell> p1.equals(p2)
$5 ==> false
|  created scratch variable $5 : boolean
```

> String 重写 equals 和 hashCode

```java
jshell> record Password(String password) {};
|  created record Password

jshell> Password p1 = new Password("123456");
p1 ==> Password[password=123456]
|  created variable p1 : Password

jshell> Password p2 = new Password("123456");
p2 ==> Password[password=123456]
|  created variable p2 : Password

jshell> p1.equals(p2)
$5 ==> true
|  created scratch variable $5 : boolean
```

## 不推荐重写

> **不可变数据的读取方法** - 可能会打破实例状态，导致行为不可预测

```
jshell> record Number(int x) {
   ...>     public int x() {
   ...>         return x > 0 ? x : (-1)*x;
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

