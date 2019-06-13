---
title: Java并发 -- 原子类
date: 2019-05-13 17:10:09
categories:
    - Java
    - Concurrent
tags:
    - Java
    - Java Concurrent
---

## add
```java
private long count = 0;

public void add() {
    int idx = 0;
    while (idx++ < 10_000) {
        count += 1;
    }
}
```
1. add()方法不是线程安全的，主要原因是count的**可见性**和count+=1的**原子性**
2. 可见性的问题可以用**volatile**来解决，原子性的问题一般采用**互斥锁**来解决

<!-- more -->

## 无锁方案
```java
private AtomicLong atomicCount = new AtomicLong(0);

public void atomicAdd() {
    int idx = 0;
    while (idx++ < 10_000) {
        atomicCount.getAndIncrement();
    }
}
```
1. 无锁方案相对于互斥锁方案，最大的好处是_**性能**_
2. 互斥锁方案为了保证互斥性，需要执行**加锁、解锁**操作，而加锁、解锁操作本身会消耗性能
    - 拿不到锁的线程会进入**阻塞**状态，进而触发**线程切换**，线程切换对性能的消耗也很大
3. 无锁方案则完全没有加锁、解锁的性能消耗，同时能保证**互斥性**

### 实现原理
1. CPU为了解决并发问题，提供了**CAS**（Compare And Swap）指令
2. CAS指令包含三个参数：共享变量的内存地址A，用于比较的值B、共享变量的新值C
3. _**只有当内存地址A处的值等于B时，才能将内存地址A处的值更新为新值C**_
4. CAS指令是一条**CPU指令**，本身能保**证原子性**

### 自旋
```java
public class SimulatedCAS {
    private volatile int count;

    public void addOne() {
        // 自旋
        int newValue;
        do {
            newValue = count + 1; // 1
        } while (count != cas(count, newValue)); // 2
    }

    // 模拟实现CAS
    private synchronized int cas(int expect, int newValue) {
        // 读取当前count的值
        int curValue = count;
        // 比较 当前count的值 是否等于 期望值
        if (curValue == expect) {
            count = newValue;
        }
        // 返回旧值
        return curValue;
    }
}
```
1. 使用CAS解决并发问题，一般都会伴随着**自旋**（循环尝试）
2. 首先计算newValue=count+1，如果count!=cas(count, newValue)
    - 说明线程执行完代码1之后，在执行代码2之前，count的值被其他线程更新过，此时采用**自旋**（循环尝试）
3. 通过**CAS+自旋**实现的无锁方案，完全没有加锁、解锁操作，不会阻塞线程，相对于互斥锁方案来说，性能提升了很多

### ABA问题
1. 上面的count==cas(count, newValue)，并不能说明执行完代码1之后，在执行代码2之前，count的值没有被其他线程更新过
2. 假设count原本为A，线程T1在执行完代码1之后，执行代码2之前，线程T2将count更新为B，之后又被T3更新回A

### count+=1 原子化
```java
// AtomicLong
public final long getAndIncrement() {
    // this和valueOffset这两个参数可以唯一确定共享变量的内存地址
    return unsafe.getAndAddLong(this, valueOffset, 1L);
}

// Unsafe
public final long getAndAddLong(Object o, long offset, long delta) {
    long v;
    do {
        // 读取内存中的值
        v = getLongVolatile(o, offset);
    } while (!compareAndSwapLong(o, offset, v, v + delta));
    return v;
}

public native long getLongVolatile(Object o, long offset);

// 原子性地将变量更新为x，条件是内存中的值等于expected，更新成功则返回true
// compareAndSwapLong的语义和CAS指令的语义的差别，仅仅只是返回值不同而已
public final native boolean compareAndSwapLong(Object o, long offset, long expected, long x);
```

## 原子类
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-atomic.png" width=1000/>


### 原子化的基本类型
相关实现有AtomicBoolean、AtomicInteger和AtomicLong
```java
getAndIncrement() // 原子化 i++
getAndDecrement() // 原子化的 i--
incrementAndGet() // 原子化的 ++i
decrementAndGet() // 原子化的 --i
// 当前值 +=delta，返回 += 前的值
getAndAdd(delta)
// 当前值 +=delta，返回 += 后的值
addAndGet(delta)
// CAS操作，返回是否成功
compareAndSet(expect, update)

// 以下四个方法
// 新值可以通过传入func函数来计算
getAndUpdate(func)
updateAndGet(func)
getAndAccumulate(x,func)
accumulateAndGet(x,func)
```

### 原子化的对象引用类型
1. 相关实现有AtomicReference、AtomicStampedReference和AtomicMarkableReference，可以实现**对象引用的原子化更新**
2. 对象引用的更新需要重点关注**ABA问题**，而**AtomicStampedReference**和**AtomicMarkableReference**可以解决ABA问题

#### AtomicStampedReference
```java
public boolean compareAndSet(V   expectedReference,
                             V   newReference,
                             int expectedStamp,
                             int newStamp)
```
1. 通过增加一个**版本号**即可解决ABA问题
2. 每次执行CAS操作时，附加再更新一个版本号，只要保证版本号是**递增**的，即使A->B->A，版本号也不会回退

#### AtomicMarkableReference
将版本号简化成一个**Boolean值**
```java
public boolean compareAndSet(V       expectedReference,
                             V       newReference,
                             boolean expectedMark,
                             boolean newMark)
```

### 原子化的数组
1. 相关实现有AtomicIntegerArray、AtomicLongArray和AtomicReferenceArray
2. 利用这些原子类，可以原子化地更新数组里面的每一个**元素**

### 原子化的对象属性更新器
1. 相关实现有AtomicIntegerFieldUpdater、AtomicLongFieldUpdater和AtomicReferenceFieldUpdater
2. 利用这些原子类，都可以原子化地更新对象的属性，这三个方法都是利用**反射机制**实现的
3. 对象属性必须是**volatile**类型，只有这样才能保证**可见性**
    - 如果对象属性不是volatile类型的，newUpdater会抛出IllegalArgumentException

```java
// AtomicLongFieldUpdater
public static <U> AtomicLongFieldUpdater<U> newUpdater(Class<U> tclass, String fieldName);
// AtomicLongFieldUpdater#CASUpdater
public final boolean compareAndSet(T obj, long expect, long update)
// AtomicLongFieldUpdater#LockedUpdater
public final boolean compareAndSet(T obj, long expect, long update)
```

### 原子化的累加器
1. 相关实现有DoubleAccumulator、DoubleAdder、LongAccumulator和LongAdder
2. 这几个原子类仅仅用来执行累加操作，相比于原子化的基本数据类型，**速度更快**，但不支持**compareAndSet**
3. 如果仅仅需要累加操作，使用原子化的累加器的性能会更好

## 小结
1. 无锁方案相对于互斥锁方案，性能更好，不会出现死锁问题，但可能出现**饥饿**和**活锁**问题（由于**自旋**）
2. Java提供的原子类只能够解决一些**简单**的原子性问题
    - 所有原子类的方法都是针对**单个共享变量**的，如果需要解决多个变量的原子性问题，还是要采用**互斥锁**的方案

<!-- indicate-the-source -->
