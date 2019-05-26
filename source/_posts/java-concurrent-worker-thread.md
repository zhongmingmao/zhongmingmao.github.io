---
title: Java并发 -- Worker Thread模式
date: 2019-05-24 12:32:53
categories:
    - Java Concurrent
tags:
    - Java Concurrent
---

## Worker Thread模式
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-worker-thread.png" width=800/>
1. Worker Thread模式可以类比现实世界里车间的工作模式，Worker Thread对应车间里的工人（人数确定）
2. 用**阻塞队列**做任务池，然后创建**固定数量的线程**消费阻塞队列中的任务 -- 这就是Java中的**线程池**方案

<!-- more -->

## echo服务
```java
private ExecutorService pool = Executors.newFixedThreadPool(500);

public void handle() throws IOException {
    // 处理请求
    try (ServerSocketChannel ssc = ServerSocketChannel.open().bind(new InetSocketAddress(8080))) {
        while (true) {
            // 接收请求
            SocketChannel sc = ssc.accept();
            // 将请求处理任务提交给线程池
            pool.execute(() -> {
                try {
                    // 读Socket
                    ByteBuffer rb = ByteBuffer.allocateDirect(1024);
                    sc.read(rb);
                    TimeUnit.SECONDS.sleep(1);
                    // 写Socket
                    ByteBuffer wb = (ByteBuffer) rb.flip();
                    sc.write(wb);
                    sc.close();
                } catch (IOException | InterruptedException ignored) {
                }
            });
        }
    } finally {
        pool.shutdown();
    }
}
```

## 正确地创建线程池
1. Java线程池既能避免无限制地**创建线程**导致OOM，也能避免无限制地**接收任务**导致OOM（**有界队列**）
2. 当请求量大于有界队列的容量时，应该合理地拒绝请求，在创建线程池时，应该清晰地指明**拒绝策略**
3. 为了便于调试和诊断问题，在实际工作中应该给线程赋予一个**业务相关的命名**

```java
private ExecutorService pool = new ThreadPoolExecutor(50, 500, 60L, TimeUnit.SECONDS,
        new LinkedBlockingQueue<>(2000), // 有界队列
        runnable -> new Thread(runnable, "echo-" + runnable.hashCode()), // ThreadFactory
        new ThreadPoolExecutor.CallerRunsPolicy()); // 拒绝策略
```

## 避免线程死锁
1. 如果提交到**相同线程池**的任务不是相互独立的，而是有**依赖**关系的，有可能会导致线程**死锁**
2. 通用解决方案：**为不同的任务创建不同的线程池**，提交到**相同线程池**中的任务一定是**相互独立**的
3. 下图中第一阶段的任务会等待第二阶段的子任务完成

<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-worker-thread-dead-lock.png" width=800/>
```java
// L1、L2阶段共用线程池
ExecutorService pool = Executors.newFixedThreadPool(2);
CountDownLatch l1 = new CountDownLatch(2);
for (int i = 0; i < 2; i++) {
    System.out.println("L1");
    pool.execute(() -> {
        CountDownLatch l2 = new CountDownLatch(2);
        for (int j = 0; j < 2; j++) {
            pool.execute(() -> {
                System.out.println("L2");
                l2.countDown();
            });
        }
        try {
            // 线程池中的2个线程都阻塞在l2.await()，没有多余线程去执行L2阶段的任务（在线程池的任务队列中等待）
            l2.await(); // line 28
        } catch (InterruptedException ignored) {
        }
        l1.countDown();
    });
}
l1.await();
// 输出
//  L1
//  L1
```

### jstack
```java
// 阻塞在l2.await()
"pool-1-thread-2" #11 prio=5 os_prio=31 tid=0x00007f934e8f5000 nid=0x4303 waiting on condition [0x000070000792d000]
   java.lang.Thread.State: WAITING (parking)
	at sun.misc.Unsafe.park(Native Method)
	- parking to wait for  <0x000000079609bd58> (a java.util.concurrent.CountDownLatch$Sync)
	at java.util.concurrent.locks.LockSupport.park(LockSupport.java:175)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer.parkAndCheckInterrupt(AbstractQueuedSynchronizer.java:836)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer.doAcquireSharedInterruptibly(AbstractQueuedSynchronizer.java:997)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer.acquireSharedInterruptibly(AbstractQueuedSynchronizer.java:1304)
	at java.util.concurrent.CountDownLatch.await(CountDownLatch.java:231)
	at time.geek.worker.thread.DeadLock.lambda$deadLockTest$1(DeadLock.java:28)
	at time.geek.worker.thread.DeadLock$$Lambda$1/1221555852.run(Unknown Source)
	at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1149)
	at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:624)
	at java.lang.Thread.run(Thread.java:748)

// 阻塞在l2.await()
"pool-1-thread-1" #10 prio=5 os_prio=31 tid=0x00007f9350142800 nid=0x3c03 waiting on condition [0x000070000782a000]
   java.lang.Thread.State: WAITING (parking)
	at sun.misc.Unsafe.park(Native Method)
	- parking to wait for  <0x0000000795ff56a8> (a java.util.concurrent.CountDownLatch$Sync)
	at java.util.concurrent.locks.LockSupport.park(LockSupport.java:175)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer.parkAndCheckInterrupt(AbstractQueuedSynchronizer.java:836)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer.doAcquireSharedInterruptibly(AbstractQueuedSynchronizer.java:997)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer.acquireSharedInterruptibly(AbstractQueuedSynchronizer.java:1304)
	at java.util.concurrent.CountDownLatch.await(CountDownLatch.java:231)
	at time.geek.worker.thread.DeadLock.lambda$deadLockTest$1(DeadLock.java:28)
	at time.geek.worker.thread.DeadLock$$Lambda$1/1221555852.run(Unknown Source)
	at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1149)
	at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:624)
	at java.lang.Thread.run(Thread.java:748)
```

## 对比Thread-Per-Message模式
1. Thread-Per-Message模式：主线程直接创建子线程，主子线程之间可以直接通信
2. Worker Thread模式：主线程提交任务到线程池，但主线程并不关心任务被哪个线程执行
    - 能够避免线程频繁创建、销毁的问题，并且能够限制线程的最大数量
    - Java利用Worker Thread模式来实现线程池

<!-- indicate-the-source -->
