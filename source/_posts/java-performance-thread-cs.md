---
title: Java性能 -- 线程上下文切换
mathjax: false
date: 2019-08-25 10:28:46
categories:
    - Java
    - Performance
tags:
    - Java
    - Java Performance
    - Context Switch
---

## 线程数量
1. 在并发程序中，并不是启动更多的线程就能让程序最大限度地并发执行
2. 线程数量设置太小，会导致程序不能充分地利用系统资源
3. 线程数量设置**太大**，可能带来资源的**过度竞争**，导致**上下文切换**，带来的额外的**系统开销**

<!-- more -->

## 上下文切换
1. 在单处理器时期，操作系统就能处理**多线程并发**任务，处理器给每个线程分配**CPU时间片**，线程在CPU时间片内执行任务
    - CPU时间片是CPU分配给每个线程执行的时间段，一般为**几十毫秒**
2. 时间片决定了一个线程可以**连续占用**处理器运行的时长
    - 当一个线程的时间片用完，或者因自身原因被迫暂停运行，此时另一个线程会被操作系统选中来占用处理器
    - **上下文切换**（Context Switch）：一个线程被**暂停剥夺**使用权，另一个线程被**选中开始**或者**继续运行**的过程
        - **切出**：一个线程被剥夺处理器的使用权而被暂停运行
        - **切入**：一个线程被选中占用处理器开始运行或者继续运行
        - 切出切入的过程中，操作系统需要保存和恢复相应的**进度信息**，这个进度信息就是_**上下文**_
3. 上下文的内容
    - **寄存器的存储内容**：CPU寄存器负责存储已经、正在和将要执行的任务
    - **程序计数器存储的指令内容**：程序计数器负责存储CPU正在执行的指令位置、即将执行的下一条指令的位置
4. 当CPU数量远远不止1个的情况下，操作系统将CPU轮流分配给线程任务，此时的上下文切换会变得更加**频繁**
    - 并且存在**跨CPU的上下文切换**，更加**昂贵**

## 切换诱因
1. 在操作系统中，上下文切换的类型可以分为**进程间**的上下文切换和**线程间**的上下文切换
2. 线程状态：NEW、RUNNABLE、RUNNING、BLOCKED、DEAD
    - Java线程状态：NEW、RUNNABLE、BLOCKED、WAITING、TIMED_WAITING、TERMINATED
4. 线程上下文切换：**RUNNING -> BLOCKED -> RUNNABLE -> 被调度器选中执行**
    - 一个线程从RUNNING状态转为BLOCKED状态，称为一个线程的**暂停**
        - 线程暂停被切出后，操作系统会保存相应的上下文
        - 以便该线程再次进入RUNNABLE状态时能够在之前执行进度的基础上继续执行
    - 一个线程从BLOCKED状态进入RUNNABLE状态，称为一个线程的**唤醒**
        - 此时线程将获取上次保存的上下文继续执行
5. 诱因：程序本身触发的**自发性上下文切换**、系统或虚拟机触发的**非自发性上下文切换**
    - 自发性上下文切换
        - _**sleep、wait、yield、join、park、synchronized、lock**_
    - 非自发性上下文切换
        - 线程被分配的**时间片用完**、**JVM垃圾回收**（**STW**、线程暂停）、线程**执行优先级**

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-cs-thread-life-cycle.jpg" width=1000/>

## 监控切换

### 样例代码
```java
public static void main(String[] args) {
    new MultiThreadTesterAbstract().start();
    new SerialThreadTesterAbstract().start();
    // multi thread take 5401ms
    // serial take 692ms
}

static abstract class AbstractTheadContextSwitchTester {
    static final int COUNT = 100_000_000;
    volatile int counter = 0;

    void increaseCounter() {
        counter++;
    }

    public abstract void start();
}

static class MultiThreadTesterAbstract extends AbstractTheadContextSwitchTester {

    @Override
    public void start() {
        Stopwatch stopwatch = Stopwatch.createStarted();
        Thread[] threads = new Thread[4];
        for (int i = 0; i < 4; i++) {
            threads[i] = new Thread(new Runnable() {
                @Override
                public void run() {
                    while (counter < COUNT) {
                        synchronized (this) {
                            if (counter < COUNT) {
                                increaseCounter();
                            }
                        }
                    }
                }
            });
            threads[i].start();
        }
        for (int i = 0; i < 4; i++) {
            try {
                threads[i].join();
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
        log.info("multi thread take {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
    }
}

static class SerialThreadTesterAbstract extends AbstractTheadContextSwitchTester {

    @Override
    public void start() {
        Stopwatch stopwatch = Stopwatch.createStarted();
        for (int i = 0; i < COUNT; i++) {
            increaseCounter();
        }
        log.info("serial take {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
    }
}
```
1. 串行的执行速度比并发执行的速度要快，因为线程的**上下文切换**导致了**额外的开销**
    - 使用synchronized关键字，导致了**资源竞争**，从而引起了上下文切换
    - 即使不使用synchronized关键字，并发的执行速度也无法超越串行的执行速度，因为多线程同样存在上下文切换
2. **Redis的设计很好地体现了单线程串行的优势**
    - 从**内存**中快速读取值，不用考虑**IO瓶颈**带来的**阻塞**问题

### 监控工具

#### vmstat
**cs**：系统的上下文切换频率
```
root@5d15480e8112:/# vmstat
procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
 3  0      0 693416  33588 951508    0    0    77   154  116  253  1  1 98  0  0
```

#### pidstat
```
-w  Report task switching activity (kernels 2.6.23 and later only).  The following values may be displayed:
    UID
         The real user identification number of the task being monitored.
    USER
         The name of the real user owning the task being monitored.
    PID
         The identification number of the task being monitored.
    cswch/s
         Total number of voluntary context switches the task made per second.  A voluntary context switch occurs when a task blocks because  it  requires  a
         resource that is unavailable.
    nvcswch/s
         Total  number  of  non  voluntary context switches the task made per second.  A involuntary context switch takes place when a task executes for the
         duration of its time slice and then is forced to relinquish the processor.
    Command
         The command name of the task.
```
```
root@5d15480e8112:/# pidstat -w -l -p 1 2 5
Linux 4.9.184-linuxkit (5d15480e8112) 	09/16/2019 	_x86_64_	(2 CPU)

07:28:03      UID       PID   cswch/s nvcswch/s  Command
07:28:05        0         1      0.00      0.00  /bin/bash
07:28:07        0         1      0.00      0.00  /bin/bash
07:28:09        0         1      0.00      0.00  /bin/bash
07:28:11        0         1      0.00      0.00  /bin/bash
07:28:13        0         1      0.00      0.00  /bin/bash
Average:        0         1      0.00      0.00  /bin/bash
```

## 切换的系统开销
1. 操作系统**保存和恢复上下文**
2. 调度器进行**线程调度**
3. 处理器**高速缓存重新加载**
4. 可能导致**整个高速缓存区被冲刷**，从而带来时间开销

## 竞争锁优化
1. 多线程对锁资源的竞争会引起上下文切换，锁竞争导致的线程阻塞越多，上下文切换就越频繁，系统的性能开销就越大
    - 在多线程编程中，锁本身不是性能开销的根源，_**锁竞争才是性能开销的根源**_
2. 锁优化归根到底是**减少竞争**

### 减少锁的持有时间
1. 锁的持有时间越长，意味着越多的线程在等待该竞争锁释放
2. 如果是**synchronized**同步锁资源，不仅带来了**线程间**的上下文切换，还有可能会带来**进程间**的上下文切换
3. 优化方法：将一些**与锁无关的代码移出同步代码块**，尤其是那些开销较大的操作以及可能被阻塞的操作

### 减少锁粒度

#### 锁分离
1. 读写锁实现了锁分离，由读锁和写锁两个锁实现，可以**共享读**，但**只有一个写**
    - 读写锁在多线程读写时，**读读不互斥**，读写互斥，写写互斥
    - 传统的独占锁在多线程读写时，**读读互斥**，读写互斥，写写互斥
2. 在**读远大于写**的多线程场景中，锁分离避免了高并发读情况下的资源竞争，从而**避免了上下文切换**

#### 锁分段
1. 在使用锁来保证**集合**或者**大对象**的原子性时，可以将锁对象进一步分解
2. Java 1.8之前的ConcurrentHashMap就是用了**锁分段**

### 非阻塞乐观锁代替竞争锁
1. **volatile**
    - volatile关键字的作用是保证**可见性**和**有序性**，volatile的读写操作**不会导致上下文切换**，**开销较小**
    - 由于volatile关键字**没有锁的排它性**，因此**不能保证**操作变量的**原子性**
2. CAS
    - CAS是一个**原子**的**if-then-act**操作
    - CAS是一个**无锁算法**实现，保障了对一个共享变量读写操作的**一致性**
    - **CAS不会导致上下文切换**，Java的**Atomic**包就使用了CAS算法来更新数据，而不需要额外加锁

### synchronized锁优化
1. 在JDK 1.6中，JVM将synchronized同步锁分为**偏向锁、轻量级锁、自旋锁、重量级锁**
2. JIT编译器在动态编译同步代码块时，也会通过**锁消除、锁粗化**的方式来优化synchronized同步锁

## wait/notify优化
可以通过Object对象的**wait、notify、notifyAll**来实现**线程间的通信**，例如生产者-消费者模型
```java
public class WaitNotifyTest {
    public static void main(String[] args) {
        Vector<Integer> pool = new Vector<>();
        Producer producer = new Producer(pool, 10);
        Consumer consumer = new Consumer(pool);
        new Thread(producer).start();
        new Thread(consumer).start();
    }
}

@AllArgsConstructor
class Producer implements Runnable {
    private final Vector<Integer> pool;
    private Integer size;

    @Override
    public void run() {
        for (; ; ) {
            try {
                produce((int) System.currentTimeMillis());
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }

    private void produce(int i) throws InterruptedException {
        while (pool.size() == size) {
            synchronized (pool) {
                pool.wait();
            }
        }
        synchronized (pool) {
            pool.add(i);
            pool.notifyAll();
        }
    }
}

@AllArgsConstructor
class Consumer implements Runnable {
    private final Vector<Integer> pool;

    @Override
    public void run() {
        for (; ; ) {
            try {
                consume();
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }

    private void consume() throws InterruptedException {
        synchronized (pool) {
            while (pool.isEmpty()) {
                pool.wait();
            }
        }
        synchronized (pool) {
            pool.remove(0);
            pool.notifyAll();
        }
    }
}
```
1. wait/notify的使用_**导致了较多的上下文切换**_
2. 消费者第一次申请到锁，却发现没有内容可消费，执行**wait**，这会导致**线程挂起**，进入**阻塞状态**，这是一次上下文切换
3. 当生产者获得锁并执行**notifyAll**之后，会**唤醒**处于阻塞状态的消费者线程，又会发生一次上下文切换
4. 被唤醒的线程在继续运行时，需要再次申请相应对象的内部锁，此时可能需要与其他新来的活跃线程**竞争**，导致上下文切换
5. 如果多个消费者线程同时被阻塞，用notifyAll将唤醒所有阻塞线程，但此时依然没有内容可消费
    - 因此**过早地唤醒**，也可能导致线程再次进入阻塞状态，从而引起不必要的上下文切换
6. 优化方法
    - 可以考虑使**用notify代替notifyAll**，减少上下文切换
    - 生产者执行完notify/notifyAll之后，**尽快释放内部锁**，避免被唤醒的线程再次等待该内部锁
    - 为了避免长时间等待，使用wait(long)，但线程**无法区分**其返回是由于**等待超时**还是**被通知线程唤醒**，增加上下文切换
    - 建议使用**Lock+Condition**代替synchronized+wait/notify/notifyAll，来实现等待通知

## 合理的线程池大小
1. _**线程池的线程数量不宜过大**_
2. 一旦线程池的工作线程总数超过系统所拥有的**处理器数量**，就会导致**过多的上下文切换**

## 协程：非阻塞等待
1. 协程比线程更加**轻量**，相比于由**操作系统内核**管理的**进程**和**线程**，协程完全由程序本身所控制，即在**用户态**执行
2. **协程避免了像线程切换那样产生的上下文切换**，在**性能**方面得到了**很大的提升**

## 减少GC频率
1. **GC会导致上下文切换**
2. 很多垃圾回收器在回收旧对象时会产生内存碎片，从而需要进行内存整理，该过程需要移动存活的对象
    - 而移动存活的对象意味着这些对象的内存地址会发生改变，因此在移动对象之前需要暂停线程，完成后再唤醒线程
3. 因此减少GC的频率能够有效的减少上下文切换

## 参考资料
[Java性能调优实战](https://time.geekbang.org/column/intro/100028001)