---
title: Java并发 -- Lock + Condition
date: 2019-05-05 09:07:32
categories:
    - Java Concurrent
tags:
    - Java Concurrent
---

## 管程
1. 并发领域的两大核心问题：**互斥** + **同步**
2. 互斥：同一时刻只允许一个线程访问共享资源
3. 同步：线程之间的通信和协作
4. JUC通过Lock和Condition两个接口**实现管程**，其中**Lock**用于解决**互斥**问题，而**Condition**用于解决**同步**问题

<!-- more -->

## 再造管程的理由
1. Java语言对管程的原生实现：**synchronized**
2. 在Java 1.5中，synchronized的**性能**不如JUC中的Lock，在Java 1.6中，synchronized做了很多的性能优化
3. 再造管程的**核心理由**：synchronized无法**破坏不可抢占条件**（死锁的条件之一）
    - synchronized在申请资源的时候，如果申请不到，线程**直接进入阻塞状态**，也**不会释放线程已经占有的资源**
    - 更合理的情况：占用部分资源的线程如果进一步申请其它资源的时，如果申请不到，可以**主动释放**它所占有的资源
4. 解决方案
    - **能够响应中断**
        - synchronized：持有锁A的线程在尝试获取锁B失败，进入**阻塞**状态，如果发生**死锁**，将**没有机会唤醒**阻塞线程
        - 如果处于阻塞状态的线程能够响应中断信号，那阻塞线程就有机会释放曾经持有的锁A
    - **支持超时**
        - 如果线程在一段时间内没有获得锁，不是进入阻塞状态，而是**返回一个错误**
        - 那么该线程也有机会释放曾经持有的锁
    - **非阻塞地获取锁**
        - 如果尝试获取锁失败，不是进入阻塞状态，而是**直接返回**，那么该线程也有机会释放曾经持有的锁

```java
// java.util.concurrent.locks.Lock接口
// 能够响应中断
void lockInterruptibly() throws InterruptedException;
// 支持超时（同时也能够响应中断）
boolean tryLock(long time, TimeUnit unit) throws InterruptedException;
// 非阻塞地获取锁
boolean tryLock();
```

## 保证可见性
```java
public class Counter {
    private final Lock lock = new ReentrantLock();
    private int value;

    public void addOne() {
        // 获取锁
        lock.lock();
        try {
            // 可见性：线程T1执行value++，后续的线程T2能看到正确的结果
            value++;
        } finally {
            // 释放锁
            lock.unlock();
        }
    }
}
```
```java
// ReentrantLock的伪代码
public class SimpleLock {
    // 利用了volatile相关的Happens-Before规则
    private volatile int state;

    // 加锁
    public void lock() {
        // 读取state
        state = 1;
    }

    // 解锁
    public void unlock() {
        // 读取state
        state = 0;
    }
}
```
1. Java多线程的**可见性**是通过**Happens-Before**规则来保证的
    - synchronized的可见性保证：synchronized的解锁Happens-Before于后续对这个锁的加锁
    - JUC中Lock的可见性保证：_**利用了volatile相关的Happens-Before规则**_
2. ReentrantLock内部持有一个**volatile**的成员变量state，加锁和解锁时都会**读写state**
    - 执行value++之**前**，执行**lock**，会**读写**volatile变量state
    - 执行value++之**后**，执行**unlock**，会**读写**volatile变量state
    - 相关的Happens-Before规则
        - **顺序性规则**
            - 对于线程T1，`value++` Happens-Before `unlock()`
            - 对于线程T2，`lock()` Happens-Before `读取value`
        - **volatile变量规则**
            - 对于线程T1，unlock()会执行`state=1`
            - 对于线程T2，lock()会先**读取state**
            - volatile变量的写操作 Happens-Before volatile变量的读操作
            - 因此**线程T1的unlock** Happens-Before **线程T2的lock**，与synchronized非常类似
        - 传递性规则：线程T1的value++ Happens-Before 线程T2的lock()

## 可重入锁
```java
public class X {
    private final Lock lock = new ReentrantLock();
    private int value;

    private int get() {
        lock.lock(); // 2
        try {
            return value;
        } finally {
            lock.unlock();
        }
    }

    public void addOne() {
        lock.lock();
        try {
            value = get() + 1; // 1
        } finally {
            lock.unlock();
        }
    }
}
```
1. 可重入锁：线程可以_**重复获取同一把锁**_
2. 执行路径：addOne -> get，在执行到2时，如果锁是可重入的，那么线程会再次加锁成功，否则会被阻塞

## 公平锁和非公平锁
```java
// java.util.concurrent.locks.ReentrantLock
public ReentrantLock() {
    // 默认非公平锁
    sync = new NonfairSync();
}
public ReentrantLock(boolean fair) {
    sync = fair ? new FairSync() : new NonfairSync();
}
```
1. 在管程模型中，每把锁都对应着一个_**入口等待队列**_
2. 如果一个线程没有获得锁，就会进入入口等待队列，当有线程释放锁的时候，需要从入口等待队列中唤醒一个等待的线程
3. 唤醒策略：如果是**公平锁**，唤醒**等待时间最长**的线程，如果是非公平锁，随机唤醒

## 锁的最佳实践
1. 永远只在**更新对象的成员变量**时加锁
2. 永远只在**访问可变的成员变量**时加锁
3. 永远不在**调用其它对象的方法**时加锁，因为调用其它对象的方法是**不安全**的（对其它对象的方法不了解）
    - 可能有Thread.sleep()，也有可能有慢IO，这会**严重影响性能**
    - 甚至还会加锁，这有可能导致**死锁**
4. 减少锁的**持有时间**
5. 减少**锁粒度**

<!-- indicate-the-source -->
