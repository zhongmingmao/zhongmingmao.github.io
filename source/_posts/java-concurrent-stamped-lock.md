---
title: Java并发 -- StampedLock
date: 2019-05-10 17:11:26
categories:
    - Java
    - Concurrent
tags:
    - Java
    - Java Concurrent
---

## StampedLock VS ReadWriteLock
1. StampedLock同样适用于**读多写少**的场景，性能比ReadWriteLock好
2. ReadWriteLock支持两种模式：**写锁**、**读锁**
3. StampedLock支持三种模式：**写锁**、**悲观读锁**、_**乐观读**_（关键）
    - StampedLock的**写锁、悲观读锁**的语义和ReadWriteLock的**写锁、读锁**的语义非常**类似**
        - 允许多个线程同时获取悲观读锁，只允许一个线程获取写锁，写锁和悲观读锁是**互斥**的
    - 但StampedLock里的写锁和悲观读锁加锁成功之后，都会返回一个**stamp**，然后解锁的时候需要传入这个stmap

<!-- more -->

```java
public class StampedLockExample {
    private final StampedLock stampedLock = new StampedLock();

    @Test
    // 悲观读锁
    public void pessimisticReadLockTest() {
        long stamp = stampedLock.readLock();
        try {
            // 业务逻辑
        } finally {
            stampedLock.unlockRead(stamp);
        }
    }

    @Test
    // 写锁
    public void writeLockTest() {
        long stamp = stampedLock.writeLock();
        try {
            // 业务逻辑
        } finally {
            stampedLock.unlockWrite(stamp);
        }
    }
}
```

## 乐观读
1. StampedLock的性能比ReadWriteLock要好的关键是StampedLock支持**乐观读**的方式
2. ReadWriteLock支持多个线程同时读，但当多个线程同时读的时候，所有写操作都会被阻塞
3. StampedLock提供的乐观读，是**允许一个线程获取写锁**的，并不是所有的写操作都会被阻塞
4. 乐观读这个操作是**无锁**的，相对于ReadWriteLock的读锁，乐观读的性能要更好一点

```java
public class Point {
    private int x, y;
    private final StampedLock stampedLock = new StampedLock();

    // 计算到原点的距离
    public double distanceFromOrigin() {
        // 乐观锁（无锁算法，共享变量x和y读入方法局部变量时，x和y有可能被其他线程修改）
        long stamp = stampedLock.tryOptimisticRead();
        // 读入局部变量，读的过程中，数据可能被修改
        int curX = x;
        int curY = y;
        // 判断执行读操作期间，是否存在写操作，如果存在，validate会返回false
        if (!stampedLock.validate(stamp)) {
            // 升级为悲观读锁
            // 如果不升级，有可能反复执行乐观读，浪费大量CPU
            stamp = stampedLock.readLock();
            try {
                curX = x;
                curY = y;
            } finally {
                // 释放悲观读锁
                stampedLock.unlockRead(stamp);
            }
        }
        return Math.sqrt(curX * curX + curY * curY);
    }
}
```

## 数据库的乐观锁
```sql
-- 假设version=9
SELECT id,...,version FROM product_doc WHERE id=777;

-- version类似于StampedLock的stamp
UPDATE product_doc SET version=version+1,... WHERE id=777 AND version=9;
```

## 注意事项
1. StampedLock的功能仅仅是ReadWriteLock的_**子集**_
2. StampedLock在命名上并没有增加Reentrant关键字，_**不支持重入**_
3. StampedLock的**悲观读锁、写锁**都不支持**条件变量**
4. 假设线程阻塞在StampedLock的**readLock**或者**writeLock**上
    - 如果此时调用该阻塞线程的**interrupt**，会导致_**CPU飙升**_
5. 使用StampedLock**不要调用中断操作**
    - 如果需要支持中断功能，使用**可中断**的**readLockInterruptibly**或**writeLockInterruptibly**

```java
StampedLock lock = new StampedLock();
Thread t1 = new Thread(() -> {
    // 获取写锁
    lock.writeLock();
    // 永远阻塞，不释放写锁
    LockSupport.park();
});
t1.start();
// 保证t1获得写锁
TimeUnit.SECONDS.sleep(1);

Thread t2 = new Thread(() -> {
    // 阻塞在悲观读锁
    lock.readLock();
});
t2.start();
// 保证t2阻塞在悲观读锁
TimeUnit.SECONDS.sleep(1);

// 导致t2所在的CPU飙升
t2.interrupt();
t2.join();
```

<!-- indicate-the-source -->
