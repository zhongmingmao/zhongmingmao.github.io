---
title: Java并发 -- 两阶段终止模式
date: 2019-05-25 20:44:40
categories:
    - Java Concurrent
tags:
    - Java Concurrent
---

## 两阶段终止模式
第一阶段线程T1向线程T2**发送终止指令**，第二阶段是线程T2**响应终止指令**
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-two-phase-stop.png" width=800/>


<!-- more -->

## Java线程生命周期
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-thread-life-cycle-java.png" width=800/>

1. Java线程进入终止状态的前提是线程进入RUNNABLE状态，而实际上线程可能处于休眠状态
2. 因为如果要终止处于休眠状态的线程，要先通过**interrupt**把线程的状态从休眠状态转换到RUNNABLE状态
3. RUNNABLE状态转换到终止状态，优雅的方式是让Java线程自己执行完run方法
    - 设置一个**标志位**，然后线程会在**合适的时机**检查这个标志位
        - 如果发现符合终止条件，就会自动退出run方法
    - 第二阶段：响应终止指令

## 终止监控操作
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-dynamic-sampling.png" width=800/>

1. 监控系统需要动态采集一些数据，监控系统发送采集指令给被监控系统的的监控代理
2. 监控代理接收到指令后，从监控目标收集数据，然后回传给监控系统
3. 处于性能的考虑，动态采集一般都会有终止操作

```java
public class Proxy {
    private boolean started = false;
    // 采集线程
    private Thread rptThread;

    // 启动采集线程
    public synchronized void start() {
        // 不允许同时启动多个采集线程
        if (started) {
            return;
        }
        started = true;
        rptThread = new Thread(() -> {
            // 第二阶段：响应终止指令
            while (!Thread.currentThread().isInterrupted()) {
                // 采集、回传
                report();
                try {
                    TimeUnit.SECONDS.sleep(2);
                } catch (InterruptedException ignored) {
                    // JVM的异常处理会清除线程的中断状态
                    // 重置线程中断状态
                    Thread.currentThread().interrupt();
                }
            }
            started = false;
        });
        rptThread.start();
    }

    // 终止采集功能
    public synchronized void stop() {
        // 第一阶段：发送终止指令
        // 将rptThread从休眠状态切换至RUNNABLE状态
        rptThread.interrupt();
    }

    private void report() {
    }
}
```

### 自定义线程终止标志位
很可能在run方法中调用了第三方类库提供的方法，但没办法保证第三方类库都正确地处理了线程的中断状态
```java
public class Proxy {
    // 线程终止状态
    private volatile boolean terminated = true;
    private boolean started = false;
    // 采集线程
    private Thread rptThread;

    // 启动采集线程
    public synchronized void start() {
        // 不允许同时启动多个采集线程
        if (started) {
            return;
        }
        started = true;
        terminated = false;
        rptThread = new Thread(() -> {
            // 第二阶段：响应终止指令
            while (!terminated) {
                // 采集、回传
                report();
                try {
                    TimeUnit.SECONDS.sleep(2);
                } catch (InterruptedException ignored) {
                    // JVM的异常处理会清除线程的中断状态
                    // 重置线程中断状态
                    Thread.currentThread().interrupt();
                }
            }
            started = false;
        });
        rptThread.start();
    }

    // 终止采集功能
    public synchronized void stop() {
        // 设置中断标志位
        terminated = true;
        // 第一阶段：发送终止指令
        // 将rptThread从休眠状态切换至RUNNABLE状态
        rptThread.interrupt();
    }

    private void report() {
    }
}
```

## 优雅地终止线程池
1. Java线程池是**生产者-消费者**模式的一种实现
    - 提交到线程池的任务，首先进入一个**阻塞队列**，然后线程池中的线程从阻塞队列中取出任务执行
2. shutdown()是一种很**保守**的关闭线程池的方法
    - 方法签名：`void shutdown();`
    - **拒绝接收新的任务**
    - 但会**等待**线程池中**正在执行**的任务和**已经进入阻塞队列**的任务都执行完后才关闭线程池
3. shutdownNow()相对**激进**
    - 方法签名：`List<Runnable> shutdownNow();`
    - **拒绝接收新的任务**
    - 会**中断**线程池中正在执行的任务（因此需要优雅地结束，并正确地处理线程中断）
    - 已经进入阻塞队列中的任务会被**剥夺**执行的机会，并且作为shutdownNow()的返回值返回

<!-- indicate-the-source -->
