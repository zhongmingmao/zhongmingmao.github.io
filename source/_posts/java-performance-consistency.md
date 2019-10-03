---
title: Java性能 -- 并发一致性
mathjax: false
date: 2019-09-05 15:37:43
categories:
    - Java
    - Performance
tags:
    - Java
    - Java Performance
    - Consistency
---

## 背景
在并发编程中，Java是通过**共享内存**来实现共享变量操作的，所以在多线程编程中会涉及到**数据一致性**的问题
```java
public class Example {
    int x = 0;
    public void count() {
        x++;                    // 1
        System.out.println(x)   // 2
    }
}
```

<!-- more -->

1. 有两个线程分别执行count方法，x是共享变量
2. 可能出现3种结果：**`<1,1>`**，`<2,1>`，`<1,2>`

## Java内存模型
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-consistency-java-memory-model-1.jpg" width=800/>
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-consistency-java-memory-model-2.jpg" width=800/>

1. Java采用**共享内存**模型来实现多线程之间的信息交换和数据同步
2. 程序运行时，**局部变量**将会存放在**虚拟机栈**中，而**共享变量**将会被保存在**堆内存**中
3. 由于局部变量随线程的创建而创建，线程的销毁而销毁，Java栈数据并非线程共享，所以不需要关心数据的一致性
4. 共享变量存储在**堆内存**或**方法区**中，堆内存和方法区的数据是**线程共享**的
    - 堆内存中的共享变量在**被不同线程操作**时，会被**加载到线程的工作内存**中，即_**CPU中的高速缓存**_
    - CPU缓存可以分为L1缓存、L2缓存和L3缓存，每一级缓存中所存储的**全部数据**都是下一级缓存的**一部分**
    - 当CPU要**读取**一个缓存数据时，会依次从**L1缓存、L2缓存、L3缓存、内存**中查找
    - 如果是**单核CPU**运行多线程，多个线程同时访问进程中的共享数据，CPU将共享变量加载到高速缓存后
        - 不同线程在访问缓存数据时，都会**映射到相同的缓存位置**，即使发生**线程切换**，**缓存仍然有效**
    - 如果是**多核CPU**运行多线程，_**每个核都有一个L1缓存**_
        - 如果多个线程运行在不同的内核上访问共享变量时，每个内核的L1缓存都将会缓存一份共享变量
        - 假设线程A操作CPU从堆内存中获取一个缓存数据
            - 此时堆内存中的缓存数据值为0，该缓存数据会被加载到L1缓存中
            - 操作后，缓存数据的值变为了1，然后刷新到堆内存中
        - 在正好刷新到堆内存之前，另一个线程B将堆内存中为0的缓存数据加载到另一个内核的L1缓存中
            - 此时线程A将堆内存的数据刷新为1，而线程B实际拿到的缓存数据值为0
            - 此时，**内核缓存中的数据**和**堆内存的数据**就不一致了

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-consistency-1-1-seq.jpg" width=600/>

## 重排序
在**不影响运算结果**的前提下，编译器可能会**改变顺序代码的指令顺序**
```java
public class Example {
    int x = 0;
    boolean flag = false;
    // 线程1调用
    public void writer() {
        // 1和2可能会被重排序
        x = 1;                // 1
        flag = true;          // 2
    }
    // 线程2调用
    public void reader() {
        if (flag) {           // 3
             int r1 = x;      // 4
             System.out.println(r1==x)
        }
    }
    // 线程1和线程2并发执行，线程2中的变量值可能出现两种情况：r1=0或r1=1
}
```

## Happens-before 规则
1. **程序次序规则**
    - 在单线程中，代码的执行是有序的，虽然可能会存在指令重排序，但最终执行的结果和顺序执行的结果是一致的
2. **锁定规则**
    - 一个锁处于被线程锁定占用状态，只有当这个线程释放锁之后，其他线程才能再次获取锁
3. **volatile变量规则**
    - 如果一个线程正在写volatile变量，其他线程读取该变量会发生在写入之后
4. **线程启动规则**
    - Thread对象的**start()方法**先行发生于此线程的**其它每一个动作**
5. **线程终止规则**
    - **线程中的所有操作**都先行发生于**对此线程的中止检测**
6. **对象终结规则**
    - 一个对象的**初始化完成**先行发生于该对象**finalize()方法的开始**
7. **线程中断规则**
    - **对线程interrupt()方法的调用**先行发生于**被中断线程的代码检测到中断事件的发生**
8. **传递性**
    - 如果操作A happens-before 操作B，操作B happens-before 操作C，那么操作A happens-before 操作C

## 一致性等级

### 强一致性 - 全局锁
**所有读写操作都按全局时钟下的顺序执行**，任何时刻线程读取到的缓存数据都是一样的，**Hashtable**就是强一致性
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-consistency-level-strong.jpg" width=1000>

### 顺序一致性 - volatile
1. 多个线程的整体执行可能是无序的，但对于**单个线程**而言执行是**有序**的
2. 要保证任何一次读都能读到最近一次写的数据，**volatile**可以阻止指令重排序

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-consistency-level-seq.jpg" width=1000>

### 弱一致性 - 读写锁
不能保证任何一次读都能读到最近一次写入的数据，但能保证**最终**可以读到写入的数据，**读写锁**就是弱一致性