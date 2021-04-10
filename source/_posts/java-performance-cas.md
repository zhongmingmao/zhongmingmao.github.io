---
title: Java性能 --  CAS乐观锁
mathjax: true
date: 2019-08-20 21:59:21
categories:
    - Java
    - Performance
tags:
    - Java
    - Java Performance
    - CAS
---

## synchronized / Lock / CAS
1. synchronized和Lock实现的同步锁机制，都属于**悲观锁**，而**CAS**属于_**乐观锁**_
2. 悲观锁在**高并发**的场景下，激烈的锁竞争会造成**线程阻塞**，而大量阻塞线程会导致系统的**上下文切换**，增加系统的**性能开销**

<!-- more -->

## 乐观锁
1. 乐观锁：在操作共享资源时，总是抱着乐观的态度进行，认为自己能够完成操作
2. 但实际上，当多个线程同时操作一个共享资源时，只有一个线程会成功，**失败的线程不会被挂起**，仅仅只是返回
3. 乐观锁相比于悲观锁来说，不会带来**死锁、饥饿**等活性故障问题，线程间的相互影响也远远比悲观锁要小
    - 乐观锁**没有因竞争而造成的系统上下文切换**，所以在性能上更胜一筹

## 实现原理
1. CAS是实现乐观锁的核心算法，包含3个参数：V（需要更新的变量），E（预期值）、N（最新值）
2. 只有V等于E时，V才会被设置为N
3. 如果V不等于E了，说明其它线程已经更新了V，此时该线程不做操作，返回V的真实值

### CAS实现原子操作
AtomicInteger是基于CAS实现的一个线程安全的整型类，Unsafe调用CPU底层指令实现原子操作
```java
// java.util.concurrent.atomic.AtomicInteger
public final int getAndIncrement() {
    return unsafe.getAndAddInt(this, valueOffset, 1);
}

public final int getAndDecrement() {
    return unsafe.getAndAddInt(this, valueOffset, -1);
}
```
```java
// sun.misc.Unsafe
public final int getAndAddInt(Object o, long offset, int delta) {
    int v;
    do {
        v = getIntVolatile(o, offset);
    } while (!compareAndSwapInt(o, offset, v, v + delta));
    return v;
}

public native int     getIntVolatile(Object o, long offset);

public final native boolean compareAndSwapInt(Object o, long offset, int expected, int x);
```

### 处理器实现原子操作
1. CAS是调用**处理器底层指令**来实现原子操作的
2. 处理器和物理内存之间的通信速度要远低于处理器间的处理速度，所以处理器有自己的**内部缓存**（L1/L2/L3）
3. 服务器通常为多处理器，并且处理器是多核的，每个处理器维护了一块字节的缓存存，每个内核也维护了一块字节的缓存
    - 此时在多线程并发就会存在**缓存不一致**的问题，从而导致**数据不一致**
4. 处理器提供了**总线锁定**和**缓存锁定**两种机制来保证**复杂内存操作的原子性**
    - 总线锁定
        - 当处理器要操作一个**共享变量**时，会在**总线**上会发出一个**Lock信号**，此时其它处理器就不能操作共享变量了
        - 总线锁定在阻塞其他处理器获取该共享变量的操作请求时，也可能会导致**大量阻塞**，从而**增加系统的性能开销**
    - 缓存锁定（后来出现）
        - 当某个处理器对**缓存**中的共享变量进行了操作，就会**通知**其他处理器**放弃存储**或者**重新读取**该共享变量
        - 目前**最新的处理器**都支持缓存锁定机制

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-cas-cpu-cache.png" width=800/>

## 优化CAS乐观锁
1. 乐观锁在**并发性能**上要优于悲观锁
    - 但在**写大于读**的操作场景下，**CAS失败的可能性增大**，如果循环CAS，会**长时间占用CPU**
    - 例如上面的AtomicInteger#getAndIncrement
2. JDK 1.8中，提供了新的原子类**LongAdder**
    - LongAdder在**高并发**场景下会**比AtomicInteger和AtomicLong的性能更好**，代价是消耗**更多的内存空间**
        - 核心思想：_**空间换时间**_
        - 实现原理：**降低操作共享变量的并发数**
    - LongAdder内部由一个**base变量**和一个**cell[]数组**组成
        - 当只有一个写线程（**没有竞争**）
            - LongAdder会直接使用base变量作为原子操作变量，通过CAS操作修改base变量
        - 当有多个写线程（**存在竞争**）
            - 除了占用base变量的一个写线程外，其他写线程的value值会分散到cell数组中
            - 不同线程会命中到数组的不同槽中，各个线程只对自己槽中的value进行CAS操作
            - $value = base + \sum_{i=0}^n Cell[i]$
    - LongAdder在操作后的返回值只是一个**近似准确**的值，但最终返回的是一个准确的值
        - **LongAdder不适合实时性要求较高的场景**

## 性能对比
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-cas-benchmark.jpg" width=1000/>

1. **读大于写**，读写锁ReentrantReadWriteLock、读写锁StampedLock、乐观锁LongAdder的性能最好
2. **写大于读**，乐观锁的性能最好，其他四种锁的性能差不多
3. **读约等于写**，两种读写锁和乐观锁的性能要优于synchronized和Lock

## 小结
1. 乐观锁的常见使用场景：**数据库更新**
    - 为每条数据定义一个版本号，在更新前获取版本号，在更新数据时，再判断版本号是否被更新过，如果没有才更新数据
2. CAS乐观锁的使用比较**受限**，因为乐观锁_**只能保证单个变量操作的原子性**_
3. CAS乐观锁在**高并发写大于读**的场景下
    - 大部分线程的原子操作会失败，失败后的线程将不断重试CAS原子操作，导致**大量线程长时间占用CPU资源**
    - JDK 1.8中，新增了原子类**LongAdder**，采用**空间换时间**的思路解决了这个问题，但**实时性不高**

## 参考资料
[Java性能调优实战](https://time.geekbang.org/column/intro/100028001)
