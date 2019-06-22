---
title: Java性能 -- 字符串
mathjax: false
date: 2019-06-09 20:41:38
categories:
    - Java
    - Performance
tags:
    - Java
    - Java Performance
---

## 实现
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-string-impl.jpg" width=1000/>

<!-- more -->

1. 在Java 6以及之前的版本中，String对象是对char数组进行了封装实现的对象
    - 主要四个成员变量：char数组、偏移量offset、字符数量count、哈希值hash
    - String对象通过offset和count两个属性来定位char数组，获取字符串
        - 这样可以高效快速地共享数组对象，同时节省内存空间，但也有可能会导致**内存泄露**
2. Java 7/8，String类中不再有offset和count两个变量
    - 这样String对象占用的内存稍微少了一点
    - 另外，String.substring不再共享char[]，从而解决了使用该方法可能导致的内存泄露问题
3. 从Java 9开始，将char[]修改为byte[]，同时维护了一个新的属性coder，它是一个**编码格式**的标识
    - 一个char字符占用16位，2个字节，用一个char去存储**单字节编码**的字符会非常浪费
    - Java 9的String类为了节约内存空间，使用了占用8位，1个字节的byte数组来存放字符串
    - coder的作用：使用length()或者indexOf()
        - coder有两个默认值：0代表LATIN1，1代表UTF16

## 不可变性
1. String是final类，char[]也是被private final修饰，这样实现了String对象的**不可变性**
2. 好处
    - 保证了String对象的**安全性**
    - 保证了**hash属性不会频繁变更**，确保了唯一性，使得HashMap等容器得以实现相应的Key-Value缓存功能
    - 可以实现**字符串常量池**

## 创建字符串对象

### 字面值
1. `String s = "abc";`
2. JVM首先会检查该对象是否在字符串常量池中，如果在，就返回该对象引用，否则新的字符串将在常量池中被创建
3. 这种方式可以减少同一个值的字符串对象被重复创建，**节约内存**

### new
1. `String s = new String("abc");`
2. 首先，在**编译**类文件时，`"abc"`常量字符串将会放入到**常量结构**中，在**类加载**时，`"abc"`将会在**常量池**中创建
3. 其次，在调用new时，JVM会调用String的构造函数，同时将引用常量池中的`"abc"`字符串，在**堆内存**中创建一个String对象
4. 最后，s将引用刚刚创建的String对象

## 优化

### 拼接
1. `String s = "ab" + "cd" + "ef";`
    - 编译器优化：`String s = "ab" + "cd" + "ef";`
2. `String s = "abcdef"; for ( int i = 0; i < 1000 ; i++ ) { str = str +  i; }`
    - 编译器优化：采用**StringBuilder**进行字符串拼接
    - 但每次循环都会生成一个新的StringBuilder实例，同样也会降低系统性能
    - 因此做字符串拼接时，最好**显式**使用StringBuilder

### intern
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-string-memory.jpg" width=1000/>

1. 在**字符串常量**中，默认会将对象放入到**常量池**中
2. 在**字符串变量**中，对象是会创建在**堆内存**中，同时也会在**常量池**中创建一个字符串对象
    - 并将常量池中字符串对象的char[]引用赋值给堆内存对象中，并返回堆内存对象引用
3. 如果调用intern方法，会去查看字符串常量池中是否有等于该对象的字符串
    - 如果没有，就在常量池中新增该对象，并返回该对象引用
    - 如果有，就返回常量池中的字符串对象引用
    - 而堆内存中原有的对象由于没有引用指向它，将会被回收掉
4. 常量池的实现类似于一个**HashTable**，存量的数据越多，遍历的时间复杂度会增加


```java
// 1. 在类加载时，在常量池中创建一个字符串对象“abc”
// 2. 创建a变量时，会在堆内存中创建一个字符串对象，该对象的char[]引用会指向常量池中的字符串对象的char[]
//      在调用intern方法之后，会去常量池中查找是否有等于该字符串的对象，这里是有的，直接返回，刚创建的堆对象会被回收
// 3. 创建b变量的逻辑类似
String a = new String("abc").intern();
String b = new String("abc").intern();
System.out.println(a == b); // true
```

```java
String s1 = "abc"; // 常量池
String s2 = new String("abc"); // 堆内存
String s3 = s2.intern(); // 常量池
System.out.println(s1 == s2); // false
System.out.println(s2 == s3); // false
System.out.println(s1 == s3); // true
```

### split
1. split使用正则表达式实现了强大的分割功能，但_**正在表达式的性能非常不稳定**_
    - 使用不恰当会引起**回溯**问题，导致CPU居高不下
2. 所以应该谨慎使用split方法，可以考虑用indexOf来替代
