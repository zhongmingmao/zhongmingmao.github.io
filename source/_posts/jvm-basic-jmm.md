---
title: JVM基础 -- Java内存模型
date: 2018-12-30 10:06:39
categories:
    - Java
    - JVM
    - Baisc
tags:
    - Java
    - JVM
---

## JIT的重排序

### Java代码
```java
public class JMM {
    private int a = 0;
    private int b = 0;

    public void method1() {
        int r2 = a; // A1
        b = 1; // A2
    }

    public void method2() {
        int r1 = b; // B1
        a = 2; // B2
    }
}
```

- 单线程，method1->method2，**(r1,r2)=(1,0)**
- 单线程，method2->method1，**(r1,r2)=(0,2)**
- 多线程，没有重排序，A1->B1->A2->B2，**(r1,r2)=(0,0)**
- 多线程，重排序，A2->B1->B2->A1，**(r1,r2)=(1,2)**

<!-- more -->

### As-If-Serial
1. 在**单线程**情况下，要给程序造成一个**顺序执行**的假象
    - 即经过**重排序的执行结果**要与**顺序执行的结果**保持一致
2. 如果两个操作之间存在**数据依赖**，那么即时编译器（和处理器）**不能调整它们之间的顺序**

## happens-before
1. Java 5引入了明确定义的**Java内存模型**，其中最为重要的是**happens-before**关系
    - happens-before关系用来描述**两个操作的内存可见性**
    - **如果操作X happens-before 操作Y，那么X的结果对于Y可见**
2. 线程**内**的happens-before
    - 在**同一个线程**中，**字节码的先后顺序（program order）也暗含了happens-before关系**
    - 在程序控制流路径中**靠前的字节码happens-before靠后的字节码**
    - 但**不意味着前者一定在后者之前执行**，实际上，如果**后者没有数据依赖于前者**，它们可能会被**重排序**
3. 线程**间**的happens-before
    - 解锁操作happens-before之后（**时钟顺序**）对**同一把锁**的加锁操作
    - volatile字段的写操作happens-before之后（**时钟顺序**）对同一字段的读操作
    - 线程的启动操作（Thread.start()）happens-before该线程的第一个操作
    - 线程的最后一个操作happens-before它的终止事件
        - 其他线程通过Thread.isAlive()或者Thread.join()判断该线程是否终止
    - 线程对其他线程的中断操作happens-before被中断线程所收到的中断事件
        - 被中断线程的InterruptedException，
        - 第三个线程针对被中断线程的Thread.interrupted()或者thread.isInterrupted()调用
    - 构造器中的最后一个操作happens-before析构器的第一个操作
4. happens-before具有**传递性**
5. 上面的代码除了默认的线程内happens-before关系外，没有定义任何其他的happens-before关系
    - 拥有happens-before关系的两对赋值操作之间**没有任何数据依赖**
    - 因此，即时编译器、处理器都可以对其进行重排序
    - 可以在程序中加入happens-before关系来解决，例如将a或b设置为volatile字段

```java
public class JMMVolatile {
    private int a = 0;
    private volatile int b = 0;

    public void method1() {
        int r2 = a; // A1
        b = 1; // A2
    }

    public void method2() {
        int r1 = b; // B1
        a = 2; // B2
    }
}
```
1. A1 happens-before A2，B1 happens-before B2
2. A2 happens-before B1
3. 依据传递性，A1 happens-before B2
    - 因此r2不可能为2
4. **没有标记为volatile，在同一线程中，A1和A2存在happens-before关系，但没有数据依赖，因此可以重排序**
5. 一旦**标记了volatile**，即时编译器和CPU需要考虑多线程happens-before关系，因此就**不能自由重排序**了
6. 解决类似问题的关键：**构造一个跨线程的happens-before关系**
    - **操作X happens-before 操作Y，使得操作X之前的字节码结果对操作Y之后的字节码可见**

## JMM的底层实现
1. JMM是通过**内存屏障**（memory barrier）来**禁止即时编译器的重排序**的
2. 对于**即时编译器**来说，会**针对每个happens-before关系**，向正在编译的目标方法中插入相应的内存屏障
    - 内存屏障类型：读读、读写、写读和写写
    - 这些内存屏障会**限制即时编译器的重排序操作**
3. 对于volatile字段，即时编译器将在**volatile字段的读写操作前后**各插入一些内存屏障，这些内存屏障
    - 既**不允许**volatile字段**写操作之前的内存访问被重排序至其之后**
    - 也**不允许**volatile字段**读操作之后的内存访问被重排序至其之前**
4. 即时编译器将根据具体的底层体系架构，将这些**内存屏障都替换成具体的cpu指令**
    - 在X86_64架构上，其他内存屏障都是空操作，只有**写读**内存屏障需要被替换成具体指令
    - 在**X86_64**架构上，只有volatile字段**写操作之后的写读内存屏障**需要用具体的指令来替代
        - 具体指令的效果：**强制刷新处理器的写缓存，使得当前线程写入的volatile字段的值，同步至主内存中**
        - 写缓存：在碰到内存写操作的时，处理器并不会等待该指令结束，而是直接开始下一指令，并且依赖写缓存将更改的数据同步到主内存中
        - **内存写操作同时会无效化其他处理器所持有的、指向同一内存地址的缓存行，因此其他处理器能够立即见到该volatile字段的最新值**
5. 对于**即时编译器**来说，内存屏障将**限制**它所能做的**重排序优化**
6. 对于**处理器**来说，内存屏障会导致**刷新缓存**操作

## 锁与volatile字段

### 锁
1. 在**解锁**时，JVM同样需要**强制刷新缓存**，使得当前线程所修改的内存对其他线程可见
2. 锁操作的happens-before规则针对的同一把锁，如果编译器能够证明锁仅被同一线程持有，那么久可以移除相应的加锁解锁操作
    - 因此也不会再强制刷新缓存，例如即时编译后的`synchronized(new Object()){}`等同于空操作

### volatile字段
1. volatile字段是一种**轻量级的，不保证原子性的同步，性能往往优于锁操作**
2. 频繁地访问volatile字段也会因为不断地**强制刷新缓存而严重影响程序的性能**
3. 在X86_64平台上，只有volatile字段的写操作会强制刷新缓存
4. 理想情况下，对volatile字段的使用应当是**读多写少**，并且应当**只有一个线程进行写操作**
5. volatile字段的**每次访问**均需要**直接从内存中读写**

<!-- indicate-the-source -->
