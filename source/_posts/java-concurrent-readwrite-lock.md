---
title: Java并发 -- ReadWriteLock
date: 2019-05-09 12:40:47
categories:
    - Java
    - Concurrent
tags:
    - Java
    - Java Concurrent
---

## 读多写少
1. 理论上，利用**管程**和**信号量**可以解决所有并发问题，但JUC提供了很多工具类，_**细分场景优化性能，提升易用性**_
2. 针对**读多写少**的并发场景，JUC提供了**读写锁**，即ReadWriteLock

<!-- more -->

## 读写锁
1. 读写锁是一种广泛使用的**通用技术**，并非Java所特有
2. 所有读写锁都遵守3条基本原则
    - 允许**多个线程同时读**共享变量 -- 与互斥锁的重要区别
    - 只允许**一个线程写**共享变量
    - 如果一个写线程正常执行写操作，此时禁止读线程读取共享变量

## 缓存
```java
public class Cache<K, V> {
    private final Map<K, V> map = new HashMap<>();
    private final ReadWriteLock readWriteLock = new ReentrantReadWriteLock();
    // 读锁
    private final Lock readLock = readWriteLock.readLock();
    // 写锁
    private final Lock writeLock = readWriteLock.writeLock();

    // 读缓存 -- 懒加载
    public V get(K key) {
        V v = null;
        // 读缓存
        readLock.lock(); // 1
        try {
            v = map.get(key); // 2
        } finally {
            readLock.unlock(); // 3
        }
        // 缓存中存在，直接返回
        if (v != null) { // 4
            return v;
        }
        // 缓存中不存在，查询数据库
        writeLock.lock(); // 5
        try {
            // 再次验证，其他线程可能已经查询过数据库了
            // 避免在高并发场景下重复查询数据库的问题
            v = map.get(key); // 6
            if (v == null) { // 7
                // 查询数据库
                v = loadFromDb(key);
                map.put(key, v);
            }
        } finally {
            writeLock.unlock();
        }
        return v;
    }

    private V loadFromDb(K key) {
        return null;
    }

    // 写缓存
    public V put(K key, V value) {
        writeLock.lock();
        try {
            return map.put(key, value);
        } finally {
            writeLock.unlock();
        }
    }
}
```

### 锁升级
ReadWriteLock不支持锁升级（**读锁升级为写锁**），readLock还没有释放，因此无法获取writeLock，这会导致_**线程阻塞**_
```java
readLock.lock();
try {
    V v = map.get(key);
    if (v == null) {
        writeLock.lock();
        try {
            map.put(key, loadFromDb(key));
        } finally {
            writeLock.unlock();
        }
    }
} finally {
    readLock.unlock();
}
```

### 锁降级
```java
readLock.lock();
if (!cacheValid) {
    // 因为不允许读锁升级为写锁，先释放读锁
    readLock.unlock();
    writeLock.lock();
    try {
        if (!cacheValid) {
            cacheValid = true;
        }
        // 释放写锁前，允许降级为读锁！！
        readLock.lock(); // 1
    } finally {
        writeLock.unlock();
    }
}

// 此时仍然持有读锁
try {
    // 使用数据
} finally {
    readLock.unlock();
}
```

## 小结
1. 读写锁类似于ReentrantLock（**可重入**），支持**公平**模式和**非公平**模式
2. 读锁和写锁都实现了java.util.concurrent.locks.Lock接口
2. 但只有写锁支持条件变量，**读锁是不支持条件变量的**，读锁调用newCondition，会抛出UnsupportedOperationException

<!-- indicate-the-source -->

## 参考资料
[Java并发编程实战](https://time.geekbang.org/column/intro/100023901)