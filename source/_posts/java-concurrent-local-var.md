---
title: Java并发 -- 局部变量
date: 2019-04-30 11:07:31
categories:
    - Java Concurrent
tags:
    - Java Concurrent
---

## 斐波那契数列
```java
int[] fibonacci(int n) {
    // 创建结果数组
    int[] r = new int[n];
    // 初始化第一、第二个数
    r[0] = r[1] = 1; // ①
    // 计算 2..n
    for (int i = 2; i < n; i++) {
        r[i] = r[i - 2] + r[i - 1];
    }
    return r;
}
```

<!-- more -->

## 方法调用过程
```java
int a = 7；
int[] b = fibonacci(a);
int[] c = b;
```
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-local-var-call-process.png" width=800/>
1. 当调用fibonacci(a)的时候，CPU需要先找到方法fibonacci()的地址，然后跳转到这个地址去执行代码
2. 最后CPU执行完fibonacci()方法之后，要能够返回，需要找到调用fibonacci()方法的下一条语句的地址
3. 即int[] c = b;然后跳转到这个地址去执行

### 栈寄存器
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-local-var-call-stack.png" width=800/>
1. CPU支持一种**栈结构**，与**方法调用**相关，称为**调用栈**，Java虽然靠JVM解释执行，但方法调用也是利用**栈结构**来解决的
2. 有三个方法A、B、C，调用关系为A->B->C，在运行时会构建出类似上图的调用栈
3. 每个方法在调用栈里都有自己的**独立空间**，称为**栈帧**，每个**栈帧**都有**对应方法所需要的参数**和**返回地址**
4. 当**调用**方法时，会**创建**新的栈帧，并**压入**调用栈，当方法**返回**时，对应的栈帧会被**自动弹出**，即_**栈帧与方法是同生共死的**_

## 局部变量
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-local-var-storage.png" width=800/>
1. 局部变量的作用域是**方法内部**，所以**局部变量**应该与方法同生共死，另外调用栈的**栈帧**和方法也是同生共死的
2. 因此，_**局部变量是放在调用栈的栈帧里的**_

## 调用栈与线程
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-local-var-call-stack-thread.png" width=800/>
1. 每个线程都有_**独立的调用栈**_
2. 局部变量保存在线程各自独立的调用栈里（栈帧），不会在线程间共享，因此_**局部变量没有并发问题**_

## 线程封闭
1. 局部变量的思路是解决并发问题的一个重要技术：**线程间不共享**，更专业的名词叫**线程封闭**：_仅在**单线程**内访问数据_
2. **数据库连接池**
    - 通过线程封闭技术，保证一个Connection一旦被一个线程获取之后，在这个线程关闭Connection之前
    - 不会再分配给其他线程，从而保证了Connection不会有并发问题

<!-- indicate-the-source -->
