---
title: Java并发 -- 线程池
date: 2019-05-14 11:30:04
categories:
    - Java Concurrent
tags:
    - Java Concurrent
---

## 创建线程
1. 创建普通对象，只是在JVM的**堆里**分配一块内存而已
2. 创建线程，需要调用**操作系统内核的API**，然后操作系统需要为线程分配一系列资源，成本很高
    - 线程是一个**重量级对象**，应该避免频繁创建和销毁，采用**线程池**方案

<!-- more -->

## 一般的池化资源
```java
// 假设Java线程池采用一般意义上池化资源的设计方法
class ThreadPool {
    // 获取空闲线程
    Thread acquire() {
    }
    // 释放线程
    void release(Thread t) {
    }
}
// 期望的使用
ThreadPool pool；
Thread T1 = pool.acquire();
// 传入Runnable对象
T1.execute(() -> {
    // 具体业务逻辑
});
```

## 生产者-消费者模式
业界线程池的设计，普遍采用**生产者-消费者模式**，线程池的使用方是生产者，线程池本身是消费者
```java
public class MyThreadPool {
    // 工作线程负责消费任务并执行任务
    class WorkerThread extends Thread {
        @Override
        public void run() {
            // 循环取任务并执行
            while (true) {
                Runnable task = null;
                try {
                    task = workQueue.take();
                } catch (InterruptedException e) {
                }
                task.run();
            }
        }
    }

    // 利用阻塞队列实现生产者-消费者模式
    private BlockingQueue<Runnable> workQueue;
    // 内部保存工作线程
    List<WorkerThread> threads = new ArrayList<>();

    public MyThreadPool(int poolSize, BlockingQueue<Runnable> workQueue) {
        this.workQueue = workQueue;
        for (int i = 0; i < poolSize; i++) {
            WorkerThread work = new WorkerThread();
            work.start();
            threads.add(work);
        }
    }

    // 提交任务
    public void execute(Runnable command) throws InterruptedException {
        workQueue.put(command);
    }

    public static void main(String[] args) throws InterruptedException {
        // 创建有界阻塞队列
        BlockingQueue<Runnable> workQueue = new LinkedBlockingQueue<>(2);
        // 创建线程池
        MyThreadPool pool = new MyThreadPool(10, workQueue);
        // 提交任务
        pool.execute(() -> {
            System.out.println("hello");
        });
    }
}
```

## Java线程池

### ThreadPoolExecutor
```java
public ThreadPoolExecutor(int corePoolSize,
                          int maximumPoolSize,
                          long keepAliveTime,
                          TimeUnit unit,
                          BlockingQueue<Runnable> workQueue,
                          ThreadFactory threadFactory,
                          RejectedExecutionHandler handler)

// 让所有线程都支持超时，如果线程池很闲，那么将撤销所有线程
public void allowCoreThreadTimeOut(boolean value)
```
1. corePoolSize：线程池保有的**最小**线程数
2. maximumPoolSize：线程池创建的**最大**线程数
3. keepAliveTime & unit
    - 如果一个线程空闲了keepAliveTime & unit，并且线程池的线程数大于corePoolSize，那么这个空闲的线程就要被**回收**
4. workQueue：工作队列
5. threadFactory：自定义如何创建线程
6. handler
    - 线程池中的所有线程都很忙碌，并且工作队列也满了（工作队列是**有界**队列），此时提交任务，线程池会**拒绝接收**
    - CallerRunsPolicy：提交任务的线程自己去执行该任务
    - AbortPolicy：默认的拒绝策略，抛出RejectedExecutionException
    - DiscardPolicy：直接丢弃任务，不会抛出任何异常
    - DiscardOldestPolicy：丢弃最老的任务，然后把新任务加入到工作队列中

### Executors
1. 不建议使用Executors，因为Executors提供的很多默认方法使用的是**无界队列**LinkedBlockingQueue
2. 在高负载的情况下，无界队列容易导致**OOM**，而OOM会导致所有请求都无法处理
3. 因此强烈建议使用**有界队列**

### 拒绝策略
1. 使用**有界队列**，当任务过多时，线程池会触发**拒绝策略**
2. 线程池默认的拒绝策略会抛出RejectedExecutionException，这是一个**运行时异常**，开发时很容易忽略
3. 如果线程池处理的任务非常重要，可以自定义拒绝策略

### 异常处理
1. 使用ThreadPoolExecutor.execute()方法提交任务时，如果任务在执行过程中出现**运行时异常**
    - 会导致执行任务的线程**终止**，并且**无法获得任何通知**
2. 因此最稳妥的方法还是**捕获所有异常**并处理

```java
try {
    // 业务逻辑
} catch (RuntimeException x) {
    // 按需处理
} catch (Throwable x) {
    // 按需处理
}
```

<!-- indicate-the-source -->
