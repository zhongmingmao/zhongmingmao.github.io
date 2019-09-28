---
title: Java性能 -- 线程池大小
mathjax: false
date: 2019-08-31 10:57:40
categories:
    - Java
    - Performance
tags:
    - Java
    - Java Performance
    - Thread Pool
---

## 线程池原理
1. 在**Hotspot** JVM的线程模型中，Java线程被**一对一**映射为**内核线程**
    - Java使用线程执行程序时，需要创建一个内核线程，当该Java线程被终止时，这个内核线程也会被回收
    - Java线程的创建和销毁将会消耗一定的计算机资源，从而增加系统的性能开销
    - 大量创建线程也会给系统带来性能问题，线程会抢占内存和CPU资源，可能会发生内存溢出、CPU超负载等问题
2. 线程池：即可以**提高线程复用**，也可以**固定最大线程数**，防止无限制地创建线程
    - 当程序提交一个任务需要一个线程时，会去线程池查找是否有**空闲**的线程
    - 如果有，则直接使用线程池中的线程工作，如果没有，则判断当前已创建的线程数是否超过**最大线程数**
    - 如果未超过，则创建新线程，如果已经超过，则进行**排队等待**或者直接**抛出异常**

<!-- more -->

## 线程池框架Executor
1. Java最开始提供了**ThreadPool**来实现线程池，为了更好地实现**用户级的线程调度**，Java提供了一套**Executor**框架
2. Executor框架包括了**ScheduledThreadPoolExecutor**和**ThreadPoolExecutor**两个**核心**线程池，**核心原理一样**
    - ScheduledThreadPoolExecutor用来**定时**执行任务，ThreadPoolExecutor用来执行被提交的任务

### Executors
1. Executors利用**工厂模式**实现了4种类型的ThreadPoolExecutor
2. **不推荐使用**Executors，因为会忽略很多线程池的参数设置，容易导致**无法调优**，产生**性能问题**或者**资源浪费**
3. 推荐使用ThreadPoolExecutor自定义参数配置

| 类型 | 特性 |
| --- | --- |
| newCachedThreadPool | 线程池大小**不固定**，可灵活回收空闲线程，若无可回收，则新建线程 |
| newFixedThreadPool | 线程池大小**固定**，当有新任务提交，线程池中如果有空闲线程，则立即执行，<br/>否则新的任务会被**缓存**在一个**任务队列**中，等待线程池释放空闲线程 |
| newScheduledThreadPool | 定时线程池，支持**定时**或者**周期性**地执行任务 |
| newSingleThreadExecutor | 只创建一个线程，保证所有任务按照指定顺序（**FIFO**/**LIFO**/**优先级**）执行 |

### ThreadPoolExecutor
```java
// 构造函数
public ThreadPoolExecutor(int corePoolSize, // 线程池的核心线程数
                          int maximumPoolSize, // 线程池的最大线程数
                          long keepAliveTime, // 当线程数大于核心线程数时，多余的空闲线程存活的最长时间
                          TimeUnit unit, // 时间单位
                          BlockingQueue<Runnable> workQueue, // 任务队列，用来存储等待执行的任务
                          ThreadFactory threadFactory, // 线程工厂，用来创建线程，用默认即可
                          RejectedExecutionHandler handler // 拒绝策略，当提交的任务过多而不能及时处理时，可以定制拒绝策略 
                          ) 
```
1. 在创建完线程池之后，默认情况下，线程池**并没有任何线程**，等到有任务来才创建线程去执行任务
    - 如果调用**prestartAllCoreThreads**或者**prestartCoreThread**，可以提前创建等于**核心线程数**的线程数量，称为**预热**
2. 当创建的线程数**等于corePoolSize**，提交的任务会被加入到设置的**阻塞队列**中
3. 当阻塞队列**满**了，会创建线程执行任务，直到线程池中的数量**等于maximumPoolSize**
4. 当线程数**等于maximumPoolSize**，新提交的任务无法加入到阻塞队列，也无法创建**非核心**线程**直接执行**
    - 如果没有为线程池设置拒绝策略，线程池会抛出**RejectedExecutionException**，拒绝接受该任务
5. 当线程数**超过corePoolSize**，在某些线程处理完任务后，如果等待keepAliveTime后仍然**空闲**，那么该线程将会被**回收**
    - 回收线程时，**不会区分**是核心线程还是非核心线程，直到线程池中线程的数量等于corePoolSize，回收过程才会停止
6. 默认情况下，当线程数**小于等于corePoolSize**时，是不会触发回收过程的，因此_**非核心业务线程池的空闲线程会长期存在**_
    - 可以通过**allowCoreThreadTimeOut**方法设置：包括核心线程在内的**所有线程**，在空闲keepAliveTime后会被回收

线程池的线程分配流程

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-threadpool-submit.png" width=1000/>

## 计算线程数量
多线程执行的任务类型分为**CPU密集型**和**IO密集型**

### CPU密集型
1. 该类型任务的消耗主要是CPU资源，可以将线程数设置为**N（CPU核心数）+1**
2. +1是为了防止线程偶发的缺页中断，或者其他原因导致的**任务暂停**而带来的影响，+1能够更充分地利用CPU的空闲时间

### IO密集型
1. 该类型任务在运行时，系统会用大部分的时间来处理**IO交互**
2. 线程在处理IO的时间段内是**不会占用**CPU来处理，此时可以将CPU交出给其他线程使用，可以先设置为**2N**

### 通用场景
```
线程数 = N * (1+ WT/ST)

N = CPU核数
WT = 线程等待时间
ST= 线程运行时间
```
可以根据业务场景，先简单地选择**N+1**或者**2N**，然后进行**压测**，最后依据压测结果进行调整
