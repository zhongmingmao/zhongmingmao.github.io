---
title: Java并发 -- 互斥锁
date: 2019-04-17 12:46:35
categories:
    - Java Concurrent
tags:
    - Java Concurrent
---

## 解决什么问题
互斥锁解决了并发程序中的**原子性**问题

<!-- more -->

## 禁止CPU中断
1. 原子性：一个或多个操作在CPU执行的过程中**不被中断**的特性
2. 原子性问题点源头是**线程切换**，而操作系统依赖**CPU中断**来实现线程切换的
3. 单核时代，禁止CPU中断就能禁止线程切换
    - **同一时刻，只有一个线程执行**，禁止CPU中断，意味着操作系统不会重新调度线程，也就禁止了线程切换
    - 获得CPU使用权的线程可以**不间断**地执行
4. 多核时代
    - 同一时刻，有可能有两个线程同时在执行，一个线程执行在CPU1上，一个线程执行在CPU2上
    - 此时禁止CPU中断，只能保证CPU上的线程不间断执行，**但并不能保证同一时刻只有一个线程执行**
5. _**互斥：同一时刻只有一个线程执行**_
    - 如果能保证对**共享变量**的修改是**互斥**的，无论是单核CPU还是多核CPU，都能保证原子性

## 简易锁模型
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-atomic-simple-lock-model.png" width=1000/>
1. 临界区：一段需要**互斥**执行的代码
2. 线程在进入临界区之前，首先尝试加锁lock()
    - 如果成功，则进入临界区，此时该线程只有锁
    - 如果不成功就等待，直到持有锁的线程解锁
3. 持有锁的线程执行完临界区的代码后，执行解锁unlock()

## 锁和资源
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-atomic-improved-lock-model.png" width=1000/>

## synchronized
```java
public class X {
    // 修饰非静态方法
    synchronized void foo() {
        // 临界区
    }

    // 修饰静态方法
    synchronized static void bar() {
        // 临界区
    }

    // 修饰代码块
    Object obj = new Object();

    void baz() {
        synchronized (obj) {
            // 临界区
        }
    }
}
```
1. 锁是一种通用的技术方案，Java语言提供的锁实现：`synchronized`
2. Java编译器会在synchronized修饰的方法或代码块前后自动加上lock()和unlock()
    - lock()和unlock()一定是成对出现的
3. 当synchronized修饰**静态方法**时，锁定的是_**当前类的Class对象**_
4. 当synchronized修饰**实例方法**时，锁定的是_**当前实例对象this**_

## count += 1
```java
public class SafeCalc {
    private long value = 0L;

    public long get() {
        return value;
    }

    public synchronized void addOne() {
        value += 1;
    }
}
```
1. 原子性
    - synchronized修饰的临界区是**互斥**的
    - 因此无论是单核CPU还是多核CPU，只有一个线程能够执行addOne，能保证原子性
2. 可见性
    - 管程中锁的规则：对一个锁的**解锁**Happens-Before于后续对这个锁的**加锁**
    - 结合Happens-Before的**传递性**原则，易得下面的结论
    - _前一线程在临界区修改的共享变量（该操作在解锁之前），对后续进入临界区（该操作在加锁之后）的线程是**可见**的_
    - 因此，多个线程同时执行addOne，可以**保证可见性**，即假如有N个线程并发调用addOne，最终结果一定是N
3. get
    - 执行addOne方法后，value的值对get方法的可见性是**无法保证**的
    - 解决方案：get方法也用synchronized修饰

### 锁模型
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-atomic-improved-lock-model-count.png" width=1000/>
1. get()和addOne()都需要访问资源value，而资源value是用this这把锁来保护的
2. 线程要进入临界区get()和addOne()，必须先获得this这把锁，因此get()和addOne()也是**互斥**的

## 锁与受保护资源
受保护资源和锁之间的关联关系应该是`N:1`的关系

### 不同的锁
```java
public class SafeCalc {
    private static long value = 0L;

    public long get() {
        return value;
    }

    public synchronized static void addOne() {
        value += 1;
    }
}
```
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-atomic-count-two-lock.png" width=1000/>
1. 用两个锁（this和SafeCalc.class）保护同一个资源value（静态变量）
2. 临界区get()和addOne()是用两个锁来保护的，因此两个临界区没有**互斥**关系
3. 临界区addOne()对value的修改对临界区get()也没有**可见性**保证，因此会导致并发问题

<!-- indicate-the-source -->
