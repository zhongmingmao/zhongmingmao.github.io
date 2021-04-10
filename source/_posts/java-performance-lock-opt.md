---
title: Java性能 -- Lock优化
mathjax: false
date: 2019-08-18 19:33:42
categories:
    - Java
    - Performance
tags:
    - Java
    - Java Performance
    - synchronized
    - Lock
    - ReentrantReadWriteLock
    - StampedLock
---

## Lock / synchronized
Lock锁的基本操作是通过**乐观锁**实现的，由于Lock锁也会在**阻塞**时被**挂起**，依然属于**悲观锁**

| | synchronized | Lock |
| --- | --- | --- |
| 实现方式 | JVM层实现 | Java底层代码实现 |
| 锁的获取 | JVM隐式获取 | lock() / tryLock() / tryLock(timeout, unit) / lockInterruptibly() |
| 锁的释放 | JVM隐式释放 | unlock() |
| 锁的类型 | 非公平锁、可重入 | 非公平锁/公平锁、可重入 |
| 锁的状态 | 不可中断 | 可中断 |
| 锁的性能 | 高并发下会升级为**重量级锁** | **更稳定** |

<!-- more -->

## 实现原理
1. Lock锁是基于Java实现的锁，Lock是一个接口
    - 常见的实现类：**ReentrantLock、ReentrantReadWriteLock**，都是依赖**AbstractQueuedSynchronizer**（AQS）实现
2. AQS中包含了一个**基于链表实现的等待队列**（即**CLH**队列），用于存储所有**阻塞的线程**
3. AQS中有一个**state**变量，该变量对ReentrantLock来说表示**加锁状态**
4. AQS中的**CLH**队列的所有操作均通过**CAS**操作实现的

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-lock-aqs-clh-cas.jpg" width=600/>

## 锁分离优化

### ReentrantReadWriteLock
1. ReentrantLock是一个**独占锁**，同一时间只允许一个线程访问
2. ReentrantReadWriteLock允许多个读线程同时访问，但不允许写线程和读线程、写线程和写线程同时访问
    - ReentrantReadWriteLock内部维护了两把锁，一把用于读操作的**ReadLock**，一把用于写操作的**WriteLock**
3. ReentrantReadWriteLock如何保证**共享资源的原子性**？ReentrantReadWriteLock也是基于**AQS**实现的
    - 自定义同步器（继承AQS）需要在**同步状态state**上维护**多个读线程**和**一个写线程**的状态
    - ReentrantReadWriteLock利用了**高低位**，来实现**一个整型控制两种状态**的功能
        - 将**同步状态state**切分为两部分，**高16位表示读**，**低16位表示写**

#### 获取写锁
1. 一个线程尝试获取**写锁**时，会先判断同步状态state是否为0
    - 如果state为0，说明暂时没有其他线程获取锁
    - 如果state不为0，说明其它线程获取了锁
3. 当state不为0时，会再去判断同步状态state的低16位（**w**）是否为0
    - 如果w为0，说明其它线程获取了**读锁**，此时直接进入**CLH**队列进行**阻塞等待**（因为读锁与写锁**互斥**）
    - 如果w不为0，说明有线程获取了**写锁**，此时要判断是不是**当前线程**获取了写锁
        - 如果不是，进入**CLH**队列进行**阻塞等待**
        - 如果是，就应该判断当前线程获取写锁是否超过最大次数，如果超过，抛出异常，否则更新同步状态state

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-lock-rrw-w.jpg" width=600/>

#### 获取读锁
1. 一个线程尝试获取**读锁**时，同样会先判断同步状态state是否为0
    - 如果state为0，说明暂时没有其他线程获取锁，此时需要判断是否需要**阻塞**
        - 如果需要阻塞，则进入**CLH**队列进行阻塞等待
        - 如果不需要阻塞，则CAS更新state为**读状态**
    - 如果state不为0，说明其它线程获取了锁
2. 当state不为0时，会同步判断同步状态state的低16位
    - 如果存在**写锁**，直接进入**CLH**阻塞队列
    - 反之，判断当前线程是否应该被阻塞，如果不应该被阻塞则尝试CAS同步状态，获取成功更新同步锁为读状态

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-lock-rrw-r.jpg" width=600/>

### StampedLock
1. ReentrantReadWriteLock被很好地应用在**读多写少**的并发场景中，但会存在**写线程饥饿**的问题
    - Java 8引入**StampedLock**解决了这个问题
2. **StampedLock不是基于AQS实现的**，但实现原理与AQS类似，都是基于**队列**和**锁状态**
3. StampedLock有三种模式：**写**、**悲观读**、**乐观读**，StampedLock在**获取锁**时会返回一个**票据stamp**
4. 一个写线程获取**写锁**的过程中，首先是通过**writeLock**获取一个票据stamp（表示**锁的版本**）
    - WriteLock是一个**独占锁**，同时只能有一个线程可以获取WriteLock
    - 当一个线程获取WriteLock后，其他请求的线程必须**等待**
        - 当没有其他线程持有读锁或者写锁时才可以获得WriteLock
5. 一个读线程获取**读锁**的过程中，首先会通过**tryOptimisticRead**获取一个票据stamp
    - 如果**当前没有线程持有写锁**，会返回一个**非0的stamp**
    - 然后调用**validate**验证之前调用tryOptimisticRead返回的stamp在**当前是否有其他线程持有了写锁**
        - 如果是，那么validate返回**0**，升级为**悲观锁**
6. 相对于ReentrantReadWriteLock，StampedLock**获取读锁**只使用了**与或**操作进行校验，**不涉及CAS操作**
    - 即使第一次乐观锁获取失败，也会马上升级为悲观锁，可以避免一直进行CAS操作而带来的**CPU性能消耗**问题
7. 但StampedLock并**没有被广泛使用**，有几个主要原因
    - StampedLock的功能仅仅只是**ReadWriteLock的子集**
    - StampedLock**不支持重入！！**
    - StampedLock的**悲观读锁、写锁都不支持条件变量**（不符合**管程模型**）

```java
public class Point {
    private double x, y;
    private final StampedLock lock = new StampedLock();

    public void move(double deltaX, double deltaY) {
        // 获取写锁
        long stamp = lock.writeLock();
        try {
            x += deltaX;
            y += deltaY;
        } finally {
            // 释放写锁
            lock.unlockWrite(stamp);
        }
    }

    double distanceFromOrigin() {
        // 乐观读
        long stamp = lock.tryOptimisticRead();
        // 拷贝变量
        double currentX = x, currentY = y;
        // 判断读期间是否有写操作
        if (!lock.validate(stamp)) {
            // 升级为悲观读
            stamp = lock.readLock();
            try {
                currentX = x;
                currentY = y;
            } finally {
                lock.unlockRead(stamp);
            }
        }
        return Math.sqrt(currentX * currentX + currentY + currentY);
    }
}
```

## 小结
1. 不管使用**synchronized同步锁**还是**Lock同步锁**，只要存在**锁竞争**就会产生**线程阻塞**，导致**线程频繁切换**，增加**性能消耗**
2. 优化锁的关键：**降低锁竞争**
    - synchronized同步锁：**减少锁粒度**、**减少锁占用时间**
    - Lock同步锁：**锁分离**

## 参考资料
[Java性能调优实战](https://time.geekbang.org/column/intro/100028001)
