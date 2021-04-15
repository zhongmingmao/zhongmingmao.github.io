---
title: JVM进阶 -- 浅谈字段访问优化
date: 2019-01-06 12:02:53
categories:
    - Java
    - JVM
    - Advanced
tags:
    - Java
    - JVM
---

## 概念
在实际中，Java程序中的对象或许**本身就是逃逸**的，或许因为**方法内联不够彻底**而被即时编译器**当成是逃逸**的，这两种情况都将
导致即时编译器**无法进行标量替换**，这时，针对对象字段访问的优化显得更为重要。

```java
static int bar(Foo o, int x) {
    o.a = x;
    return o.a;
}
```

<!-- more -->

1. 对象o是传入参数，**不属于逃逸分析的范围**（JVM中的逃逸分析针对的是**新建对象**）
2. 该方法会将所传入的int型参数x的值存储至实例字段Foo.a中，然后再读取并返回同一字段的值
3. 这段代码涉及**两次**内存访问操作：存储和读取实例字段Foo.a
4. 代码可以手工优化成如下

```java
static int bar(Foo o, int x) {
    o.a = x;
    return x;
}
```
即时编译器也能作出类似的**自动优化**

## 字段读取优化
1. 即时编译器会优化**实例字段**和**静态字段**的访问，以**减少总的内存访问次数**
2. 即时编译器将**沿着控制流**，缓存各个字段**存储节点**将要存储的值，或者字段**读取节点**所得到的值
    - 当即时编译器**遇到对同一字段的读取节点**时，如果缓存值还没有失效，那么将读取节点**替换**为该缓存值
    - 当即时编译器**遇到对同一字段的存储节点**时，会**更新**所缓存的值
        - 当即时编译器遇到**可能更新**字段的节点时，它会采取**保守**的策略，**舍弃所有的缓存值**
        - **方法调用节点**：在即时编译器看来，方法调用会执行**未知代码**
        - **内存屏障节点**：其他线程可能异步更新了字段

### 样例1
```java
static int bar(Foo o, int x) {
    int y = o.a + x;
    return o.a + y;
}
```
实例字段Foo.a被读取两次，即时编译器会将第一次读取的值缓存起来，并且**替换**第二次的字段读取操作，以**节省**一次内存访问
```java
static int bar(Foo o, int x) {
    int t = o.a;
    int y = t + x;
    return t + y;
}
```

### 样例2
```java
static int bar(Foo o, int x) {
    o.a = 1;
    if (o.a >= 0)
        return x;
    else
        return -x;
}
```
字段读取节点被替换成一个**常量**，进一步触发更多的优化
```java
static int bar(Foo o, int x) {
    o.a = 1;
    return x;
}
```

### 样例3
```java
class Foo {
    boolean a;
    void bar() {
        a = true;
        while (a) {}
    }
    void whatever() { a = false; }
}
```
即时编译器会将while循环中读取实例字段a的操作**直接替换为常量true**
```java
void bar() {
    a = true;
    while (true) {}
}
// 生成的机器码将陷入这一死循环中
0x066b: mov    r11,QWORD PTR [r15+0x70] // 安全点测试
0x066f: test   DWORD PTR [r11],eax      // 安全点测试
0x0672: jmp    0x066b                   // while (true)
```
1. 可以通过**volatile**关键字标记实例字段a，以**强制**对a的读取
2. 实际上，即时编译器将**在volatile字段访问前后插入内存屏障节点**
    - 这些**内存屏障节点**将**阻止**即时编译器**将屏障之前所缓存的值用于屏障之后的读取节点之上**
    - 在X86_64平台上，volatile字段读取前后的内存屏障都是no-op
        - 在**即时编译过程中的屏障节点**，还是会**阻止即时编译器的字段读取优化**
        - 强制在循环中使用**内存读取指令**访问实例字段Foo.a的最新值
3. 同理，**加解锁操作同样也会阻止即时编译器的字段读取优化**

## 字段存储优化
如果一个字段先后被存储了两次，而且这**两次存储之间没有对第一次存储内容读取**，那么即时编译器将**消除**第一个字段存储

### 样例1
```java
class Foo {
    int a = 0;
    void bar() {
        a = 1;
        a = 2;
    }
}
```
即时编译器将消除bar方法的冗余存储
```java
void bar() {
    a = 2;
}
```

### 样例2
即便在某个字段的两个存储操作之间读取该字段，即时编译器也可能在**字段读取优化**的帮助下，将第一个存储操作当作**冗余存储**
场景：例如两个存储操作之间隔着许多代码，又或者因为**方法内联**的原因，将两个存储操作纳入到同一编译单元里（如构造器中字段的初始化以及随后的更新）
```java
class Foo {
    int a = 0;
    void bar() {
        a = 1;
        int t = a;
        a = t + 2;
    }
}
// 优化为
class Foo {
    int a = 0;
    void bar() {
        a = 1;
        int t = 1;
        a = t + 2;
    }
}
// 进一步优化为
class Foo {
    int a = 0;
    void bar() {
        a = 3;
    }
}
```
如果所存储的字段被标记为**volatile**，那么即时编译器也_**不能消除冗余存储**_

## 死代码消除

### 样例1
```java
int bar(int x, int y) {
    int t = x*y;
    t = x+y;
    return t;
}
```
没有节点依赖于t的第一个值`x*y`，因此该乘法运算将被消除
```java
int bar(int x, int y) {
    return x+y;
}
```

### 样例2
```java
int bar(boolean f, int x, int y) {
    int t = x*y;
    if (f)
        t = x+y;
    return t;
}
```
部分程序路径上有冗余存储（f=true），该路径上的乘法运算将会被消除
```java
int bar(boolean f, int x, int y) {
    int t;
    if (f)
        t = x+y;
    else
        t = x*y;
    return t;
}
```

### 样例3
```java
int bar(int x) {
    if (false)
        return x;
    else
        return -x;
}
```
不可达分支指的是任何程序路径都不可达到的分支，即时编译器将**消除不可达分支**
```java
int bar(int x) {
    return -x;
}
```

## 参考资料
[深入拆解Java虚拟机](https://time.geekbang.org/column/intro/100010301)

<!-- indicate-the-source -->
