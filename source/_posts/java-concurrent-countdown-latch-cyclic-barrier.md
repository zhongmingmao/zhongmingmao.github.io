---
title: Java并发 -- CountDownLatch + CyclicBarrier
date: 2019-05-11 09:07:18
categories:
    - Java
    - Concurrent
tags:
    - Java
    - Java Concurrent
---

## 对账系统
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-reconciliation-system.png" width=800/>


<!-- more -->

```java
// 存在未对账订单
while (existUnreconciledOrders()) {
    // 查询未对账订单
    pOrder = getPOrder();
    // 查询派送订单
    dOrder = getDOrder();
    // 执行对账操作
    Order diff = check(pOrder, dOrder);
    // 将差异写入差异库
    save(diff);
}
```

## 性能瓶颈
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-reconciliation-system-single-thread.png" width=800/>

getPOrder()和getDOrder()最为耗时，并且两个操作没有先后顺序的依赖，可以**并行处理**

## 简单并行 - join
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-reconciliation-system-multi-thread-join.png" width=800/>

```java
// 存在未对账订单
// 存在未对账订单
while (existUnreconciledOrders()) {
    // 查询未对账订单
    Thread t1 = new Thread(() -> {
        pOrder = getPOrder();
    });
    t1.start();

    // 查询派送订单
    Thread t2 = new Thread(() -> {
        dOrder = getDOrder();
    });
    t2.start();

    // 等待t1和t2结束
    t1.join();
    t2.join();

    // 执行对账操作
    Order diff = check(pOrder, dOrder);
    // 将差异写入差异库
    save(diff);
}
```
while循环里每次都会创建新的线程，而创建线程是一个**耗时**的操作，可以考虑**线程池**来优化

## 线程池
```java
Executor executor = Executors.newFixedThreadPool(2);
// 存在未对账订单
while (existUnreconciledOrders()) {
    // 查询未对账订单
    executor.execute(() -> {
        pOrder = getPOrder();
    });

    // 查询派送订单
    executor.execute(() -> {
        dOrder = getDOrder();
    });

    // 采用线程池方案，线程根本就不会退出，join()已经失效
    // 如何实现等待？？

    // 执行对账操作
    Order diff = check(pOrder, dOrder);
    // 将差异写入差异库
    save(diff);
}
```
1. 实现等待的简单方案：**计数器** + **管程**
2. 计数器的初始值为2，当执行完getPOrder()或getDOrder()后，计数器减1，主线程会等待计数器等于0
3. 等待计数器等于0其实是一个**条件变量**，可以利用**管程**来实现，在JUC中提供了类似的工具类_**CountDownLatch**_

## CountDownLatch
```java
Executor executor = Executors.newFixedThreadPool(2);
// 存在未对账订单
while (existUnreconciledOrders()) {
    // 计数器初始化为2
    CountDownLatch latch = new CountDownLatch(2);
    // 查询未对账订单
    executor.execute(() -> {
        pOrder = getPOrder();
        latch.countDown();
    });

    // 查询派送订单
    executor.execute(() -> {
        dOrder = getDOrder();
        latch.countDown();
    });

    // 等待两个查询操作结束
    latch.await();

    // 执行对账操作
    Order diff = check(pOrder, dOrder);
    // 将差异写入差异库
    save(diff);
}
```
1. 此时， getPOrder()和getDOrder()两个查询操作是并行的，但两个查询操作和对账操作check和save还是串行的
2. 实际上，在执行对账操作的时候，可以同时去执行下一轮的查询操作，达到_**完全的并行**_

## 完全并行
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-reconciliation-system-multi-fully-parallel.png" width=800/>

1. 两次查询操作能够和对账操作并行，对账操作还依赖于查询操作的结果，类似于_**生产者-消费者**_
    - 两次查询操作是生产者，对账操作是消费者
2. 既然是生产者-消费者模型，就需要用到**队列**，用来保存生产者生成的数据，而消费者从这个队列消费数据
3. 针对对账系统，可以设计两个队列，这两个队列之间的元素是有**一一对应**的关系
    - 订单查询操作将订单查询结果插入到**订单队列**
    - 派送单查询操作将派送单插入到**派送单队列**
4. 用双队列实现**完全的并行**
    - 线程T1执行订单查询工作，线程T2执行派送单查询工作，当T1和T2各自生产完1条数据后，通知线程T3执行对账
    - 隐藏条件：T1和T2工作的**相互等待**，步调要一致
5. 实现方案
    - 计数器初始化为2，线程T1和线程T2生产完1条数据后都将计数器减1
        - 如果计数器**大于0**，则线程T1或者T2**等待**
        - 如果计数器**等于0**，则**通知**线程T3，并**唤醒**等待的线程T1或者T2，与此同时，将计数器**重置**为2
    - JUC提供了类似的工具类_**CyclicBarrier**_

<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-reconciliation-system-multi-double-queue.png" width=800/>

<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-reconciliation-system-multi-sync.png" width=800/>


## CyclicBarrier
```java
// 订单队列
private Vector<Order> pos;
// 派送单队列
private Vector<Order> dos;
// 执行回调的线程池
private Executor executor = Executors.newFixedThreadPool(1);

// 传入回调函数
private final CyclicBarrier barrier = new CyclicBarrier(2, () -> {
    executor.execute(this::check);
});

// 回调函数
private void check() {
    Order p = pos.remove(0);
    Order d = dos.remove(0);
    // 执行对账操作
    Order diff = check(p, d);
    // 差异写入差异库
    save(diff);
}

// 两个查询操作
private void getOrders() {
    Thread t1 = new Thread(() -> {
        // 循环查询订单库
        while (existUnreconciledOrders()) {
            pos.add(getDOrder());
            try {
                // 等待
                barrier.await();
            } catch (InterruptedException | BrokenBarrierException e) {
                e.printStackTrace();
            }
        }
    });
    t1.start();

    Thread t2 = new Thread(() -> {
        // 循环查询派单库
        while (existUnreconciledOrders()) {
            dos.add(getDOrder());
            try {
                // 等待
                barrier.await();
            } catch (InterruptedException | BrokenBarrierException e) {
                e.printStackTrace();
            }
        }
    });
    t2.start();
}
```

### 回调线程池
```java
int index = --count;
if (index == 0) {  // tripped
    boolean ranAction = false;
    try {
        final Runnable command = barrierCommand;
        if (command != null)
            command.run(); // 调用回调函数
        ranAction = true;
        nextGeneration(); // 唤醒等待的线程
        return 0;
    } finally {
        if (!ranAction)
            breakBarrier(); // 唤醒等待的线程
    }
}
```
1. CyclicBarrier是**同步调用回调函数**后才**唤醒**等待的线程的，如果不采用回调线程池，**无法提升性能**
2. 遇到回调函数时，需要考虑执行回调的线程是哪一个
    - 执行CyclicBarrier的回调函数线程是将CyclicBarrier**内部计数器减到0**的那个线程

## 小结
1. CountDownLatch：主要用来解决**一个线程等待多个线程**的场景
2. CyclicBarrier：主要用来解决**一组线程之间互相等待**的场景
3. CountDownLatch的计数器不能循环利用，一旦计数器减到0，再有线程调用await()，该线程会**直接通过**
4. CyclicBarrier的计数器是可以**循环利用**的，具备**自动重置**的功能，还支持设置**回调函数**

<!-- indicate-the-source -->

## 参考资料
[Java并发编程实战](https://time.geekbang.org/column/intro/100023901)
