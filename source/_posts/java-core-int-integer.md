---
title: Java核心 -- int + Integer
date: 2019-05-04 22:30:18
categories:
    - Java
    - Core
tags:
    - Java
    - Java Core
---

## 包装类
1. Integer是int对应的**包装类**，里面有一个int类型的字段存储数据，并提供了基本的操作
2. 在Java 5，引入了**自动装箱**和**自动拆箱**（boxing/unboxing），Java可以根据上下文，自动进行转换
3. 在Java 5，还引入了**值缓存**（静态工厂方法valueOf），默认缓存范围为**-128 ~ 127**
    - Boolean，缓存**Boolean.TRUE/Boolean.FALSE**
    - Short，缓存**-128 ~ 127**
    - Byte，数值有限，**全部缓存**
    - Character，缓存**\u0000 ~ \u007F**

<!-- more -->

## 自动装箱 + 自动拆箱
```java
Integer integer = 1;
int unboxing = integer++;
```
```
1: invokestatic     // Method java/lang/Integer.valueOf:(I)Ljava/lang/Integer;
8: invokevirtual    // Method java/lang/Integer.intValue:()I
11: iconst_1
12: iadd
13: invokestatic    // Method java/lang/Integer.valueOf:(I)Ljava/lang/Integer;
21: invokevirtual   // Method java/lang/Integer.intValue:()I
```
1. 自动装箱和自动拆箱是一种**语法糖**，发生在**编译阶段**（生成**一致的字节码**）
2. javac自动把**装箱**转换为**Integer.valueOf**（可以利用**值缓存**机制），把**拆箱**转换为**Integer.intValue**
3. 在**性能敏感**的场合，要尽量避免无意中的自动装箱和自动拆箱；但在大多数产品代码里，还是以**开发效率**优先

### 线程安全的计数器

#### 原子类实现
```java
// 简单明了
public class Counter {
    private final AtomicLong counter = new AtomicLong();

    public void increase() {
        counter.incrementAndGet();
    }
}
```

#### 原始类型实现
```java
// 复杂
public class CompactCounter {
    private volatile long counter;
    private static final AtomicLongFieldUpdater<CompactCounter> UPDATER =
            AtomicLongFieldUpdater.newUpdater(CompactCounter.class, "counter");

    public void increase() {
        UPDATER.incrementAndGet(this);
    }
}
```

## 不变类
```java
private final int value;
```

## BYTES
```java
// Integer
@Native public static final int SIZE = 32;
public static final int BYTES = SIZE / Byte.SIZE;

// Byte
public static final int SIZE = 8;
```

## 原始类型的线程安全
1. 原始类型的变量，需要使用并发相关手段，才能保证线程安全
2. 如果有线程安全的计算需要，优先考虑**AtomicInteger、AtomicLong**等线程安全类
3. 部分比较宽的数据类型，如**float、double**，都**不能保证更新操作的原子性**（可能读到只更新了一半数据位的数值）

## 局限性
1. 原始类型与Java泛型不能配合使用
    - Java的泛型是**伪泛型**，属于**编译期的技巧**（_**类型擦除+强制转换**_）
    - 原始类型无法转换为Object，因此无法与泛型配合使用
2. 无法高效表达数据
    - **原始类型数组**，在内存里是一段**连续的内存**
    - **引用类型数组**，存储的是引用，实际的对象分散在堆里，导致**低效的数据操作**，也**无法充分利用CPU缓存**

<!-- indicate-the-source -->
