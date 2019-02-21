---
title: Java核心 -- Exception + Error
date: 2019-02-21 00:18:15
categories:
    - Java Core
tags:
    - Java Core
---

## 继承关系
<img src="https://java-core-1253868755.cos.ap-guangzhou.myqcloud.com/java-core-exception.png" />

<!-- more -->

## 概念
1. Exception：程序正常运行中，可以**预料**的意外情况，可能并且应该被捕获，进行相关处理
    - Checked Exception：源代码显式捕获处理，**编译期检查**，设计初衷为**从异常情况中恢复**
    - Unchecked Exception（RuntimeException）：**可以编码避免的逻辑错误**，不会在编译期强制要求
2. Error：在正常情况下，不太可能出现，绝大部分的Error都会导致程序处于**不可恢复**的状态

## ClassNotFoundException
```
Thrown when an application tries to load in a class through its string name using:
    The forName method in class Class.
    The findSystemClass method in class ClassLoader.
    The loadClass method in class ClassLoader.
but no definition for the class with the specified name could be found.
```
找不到`.class`文件

## NoClassDefFoundError
```
Thrown if the Java Virtual Machine or a ClassLoader instance tries to load in the definition of a class
(as part of a normal method call or as part of creating a new instance using the new expression) and no definition of the class could be found.
The searched-for class definition existed when the currently executing class was compiled, but the definition can no longer be found.
```
能找到`.class`文件，但`ClassLoader`尝试加载类的定义时却找不到该类的定义

## 最佳实践

### 反例1
```java
try {
    // 业务代码
    Thread.sleep(1000L);
} catch (Exception e) {
    // 忽略
}
```
1. 不要捕获通用异常`Exception`，应该捕获**特定异常**`InterruptedException`
    - 不要捕获`Throwable`或`Error`，否则很难保证能够正常处理`OutOfMemoryError`
2. 不要**生吞异常**，出现故障后**难以诊断**

### 反例2
```java
try {
    // 业务代码
} catch (IOException e) {
    // Prints this throwable and its backtrace to the standard error stream.
    e.printStackTrace();
}
```
1. 在复杂的生产环境中，`stderr`不是一个合适的输出选项，很难判断输出到哪里去了
2. 最佳实践：使用产品日志，输出到**日志系统**

### Throw early, catch late

#### Throw early
```java
public static void main(String[] args) throws FileNotFoundException {
    readFile(null);
}

private static void readFile(String fileName) throws FileNotFoundException {
    InputStream in = new FileInputStream(fileName);
}

// 异常信息不直观
Exception in thread "main" java.lang.NullPointerException
	at java.io.FileInputStream.<init>(FileInputStream.java:130)
	at java.io.FileInputStream.<init>(FileInputStream.java:93)
	at me.zhongmingmao.Main.readFile(Main.java:14)
	at me.zhongmingmao.Main.main(Main.java:9)
```
```java
public static void main(String[] args) throws FileNotFoundException {
    readFile(null);
}

private static void readFile(String fileName) throws FileNotFoundException {
    Objects.requireNonNull(fileName);
    InputStream in = new FileInputStream(fileName);
}

// 使用Throw early，异常信息比较直观
Exception in thread "main" java.lang.NullPointerException
	at java.util.Objects.requireNonNull(Objects.java:203)
	at me.zhongmingmao.Main.readFile(Main.java:14)
	at me.zhongmingmao.Main.main(Main.java:10)
```

#### Catch late
捕获异常后，如果实在不知道如何处理，可以保留**原有异常的cause信息**，直接**再抛出**或者**构建新的异常**抛出

### 自定义异常
1. 是否定义成`Checked Exception`，`Checked Exception`的设计初衷是为了**从异常情况中恢复**
    - 我们作为异常的设计者，是有充足的信息对异常进行分类的，是否满足`Checked Exception`的设计初衷
2. 在保证**诊断信息**足够的同时，也需要避免包含**敏感信息**（例如用户信息），可能会导致潜在的**安全问题**

## 性能开销
1. `try-catch`会产生额外的性能开销，往往会影响JVM对代码进行优化
    - 尽量**仅捕获有必要的代码块**，尽量不要使用大`try-catch`块
    - 不要使用`try-catch`来**控制代码流程**，比常规的条件语句（if/else，switch）要低效
2. 每实例化一个`Exception`，都需要对当时的**栈**进行**快照**，这是一个**比较重的操作**
    - 当服务吞吐量下降时，可以考虑检查发生最频繁的`Exception`

<!-- indicate-the-source -->
