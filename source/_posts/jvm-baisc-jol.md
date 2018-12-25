---
title: JVM基础 -- Java对象的内存布局
date: 2018-12-24 08:54:39
categories:
    - JVM
tags:
    - JVM
---

## 创建对象
1. new + 反射
    - 通过调用**构造器**来初始化实例字段
2. Object.clone + 反序列化
    - 通过直接**复制已有的数据**，来初始化新建对象的实例字段
3. Unsafe.allocateInstance
    - 不会初始化实例字段

```
// Foo foo = new Foo();对应的字节码
// new指令：请求内存
0: new              // class me/zhongmingmao/basic/jol/Foo
3: dup
// invokespecial指令：调用构造器
4: invokespecial    // Method "<init>":()V
```

<!-- more -->

## Java构造器

### 默认构造器
如果一个类**没有定义任何构造器**，那么Java编译器会自**动添加一个无参数的构造器**

#### Java代码
```java
// 未定义任何构造器
public class Foo {
    public static void main(String[] args) {
        Foo foo = new Foo();
    }
}
```

#### 字节码
```
// Foo类的构造器会调用父类Object的构造器
public me.zhongmingmao.basic.jol.Foo();
  descriptor: ()V
  flags: ACC_PUBLIC
  Code:
    stack=1, locals=1, args_size=1
       0: aload_0           // [this]
       1: invokespecial     // Method java/lang/Object."<init>":()V
       4: return
```

### 父类构造器
1. **子类的构造器需要调用父类的构造器**
2. 如果**父类存在无参数的构造器**，可以**隐式调用**，即Java编译器会自动添加对父类构造器的调用
3. 如果**父类没有无参数的构造器**，子类的构造器需要**显式调用**父类带参数的构造器，分两种
    - 直接的显式调用：super关键字调用父类构造器
    - 间接的显式调用：this关键字调用同一个类中的其他构造器
    - 不管直接的显式调用，还是间接的显式调用，都需要作为构造器的**第一个语句**，以便**优先初始化继承而来的父类字段**
4. 当我们调用一个构造器时，将**优先调用父类的构造器**，**直至Object类**
    - **这些构造器的调用者皆为同一对象，即通过new指令新建而来的对象**
5. 通过new指令新建出来的对象，它的内存其实**涵盖了所有父类中的实例字段**
    - 虽然子类无法访问**父类的私有实例字段**，或者子类的实例字段隐藏了**父类的同名实例字段**
    - 但**子类的实例依然会为父类的实例字段分配内存**

#### 隐式调用

##### Java代码
```java
public class A {
}

class B extends A {
}
```

##### 字节码
```
$ javap -v -p -c B
me.zhongmingmao.basic.jol.B();
  descriptor: ()V
  flags:
  Code:
    stack=1, locals=1, args_size=1
       0: aload_0           // [this]
       1: invokespecial     // Method me/zhongmingmao/basic/jol/A."<init>":()V
       4: return

$ javap -v -p -c A
public me.zhongmingmao.basic.jol.A();
  descriptor: ()V
  flags: ACC_PUBLIC
  Code:
    stack=1, locals=1, args_size=1
       0: aload_0           // [this]
       1: invokespecial     // Method java/lang/Object."<init>":()V
       4: return
```

#### 显式调用

##### Java代码
```java
public class C {
    public C(String name) {
    }
}

class D extends C {
    public D() {
        // 直接显式调用
        super("Hello");
    }

    public D(String name) {
        // 间接显式调用
        this();
    }
}
```

##### 字节码
```
$ javap -v -p -c D
public me.zhongmingmao.basic.jol.D();
  descriptor: ()V
  flags: ACC_PUBLIC
  Code:
    stack=2, locals=1, args_size=1
       0: aload_0
       1: ldc                   // String Hello
       // 直接显式调用
       3: invokespecial         // Method me/zhongmingmao/basic/jol/C."<init>":(Ljava/lang/String;)V
       6: return

public me.zhongmingmao.basic.jol.D(java.lang.String);
  descriptor: (Ljava/lang/String;)V
  flags: ACC_PUBLIC
  Code:
    stack=1, locals=2, args_size=2
       0: aload_0
       // 间接显式调用
       1: invokespecial         // Method "<init>":()V
       4: return
```

```
$ javap -v -p -c C
public me.zhongmingmao.basic.jol.C(java.lang.String);
  descriptor: (Ljava/lang/String;)V
  flags: ACC_PUBLIC
  Code:
    stack=1, locals=2, args_size=2
       0: aload_0
       1: invokespecial         // Method java/lang/Object."<init>":()V
       4: return
```

## 压缩指针+字节对齐

### 概念
1. Java对象头：**标记字段** + **类型指针**
    - 标记字段：用于存储JVM有关该**对象的运行数据**（_哈希码、GC信息和锁信息_）
    - 类型指针：指向该对象的类
2. Java引入基本类型的原因之一
    - 在64位JVM中，标记字段占用8Bytes，类型指针占用8Bytes，因此对象头占用16Bytes
    - 而Integer仅有一个int类型的私有字段，占用4Bytes，额外开销为400%
3. 为了尽量减少对象内存的使用量，在**64位**的JVM中引入**压缩指针**（-XX:+UseCompressedOops），作用于
    - 对象头中的类型指针
    - 引用类型的字段
    - 引用类型的数组

### 原理
1. 关闭指针压缩的时候，JVM按照**1字节寻址**；当开启指针压缩的时候，JVM按照**8字节寻址**
2. Java对象默认按**8字节对齐**（-XX:ObjectAlignmentInBytes），浪费掉的空间称为为**对象间的填充**
3. JVM中的**32位压缩指针**能寻址**2^35**个字节（即**32GB**）的地址空间，**超过32GB则会关闭压缩指针**
4. 在对**32位压缩指针**解引用时，将其**左移3位**，再加上一个**固定的偏移量**，便可以得到能够**寻址32GB地址空间的伪64位指针**
5. 可以通过配置-XX:ObjectAlignmentInBytes来进一步**提升寻址范围**
    - 但可能**增加对象间填充**，**导致压缩指针没有达到原本节省空间的效果**
6. 当**关闭了指针压缩**，JVM还是会进行**内存对齐**
7. 内存对齐不仅仅存在于**对象与对象之间**，也存在于**对象的字段之间**
    - 字段内存对齐的一个原因：让一个字段只会出现在同一个CPU缓存行，避免出现**伪共享**

## 字段重排序
1. JVM重新分配字段的先后顺序，以达到**内存对齐**的目的
2. JVM有三种排列方式（-XX:FieldsAllocationStyle，默认为1）
3. 规则
    - 如果**一个字段占据C个字节**，那么该字段的偏移量需要对齐**NC**（偏移量：字段地址与对象起始地址的差值）
    - **子类继承字段的偏移量，需要与父类对齐字段的偏移量保持一致**
    - JVM对齐子类字段的起始位置
        - 对于**开启了压缩指针64位虚拟机**来说，子类的第一个字段需要对齐至**4N**
        - 对于**关闭了压缩指针64位虚拟机**来说，子类的第一个字段需要对齐至**8N**
4. Java 8引入一个新的注解**@Contended**，用来解决对象字段之间的**伪共享**问题
    - JVM会让不同的@Contended字段处于独立的缓存行中，但同时也会导致**大量的空间被浪费**

## JOL
1. [对象内存布局 - JOL使用教程 1](http://zhongmingmao.me/2016/07/02/jvm-jol-tutorial-1/)
2. [对象内存布局 - JOL使用教程 2](http://zhongmingmao.me/2016/07/03/jvm-jol-tutorial-2/)
3. [对象内存布局 - JOL使用教程 3](http://zhongmingmao.me/2016/07/04/jvm-jol-tutorial-3/)

<!-- indicate-the-source -->
