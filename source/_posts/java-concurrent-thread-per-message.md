---
title: Java并发 -- Thread-Per-Message模式
date: 2019-05-23 10:22:30
categories:
    - Java
    - Concurrent
tags:
    - Java
    - Java Concurrent
---

## 概述
Thread-Per-Message模式：为每个任务分配一个**独立**的线程

<!-- more -->

## Thread
```java
// 处理请求
try (ServerSocketChannel ssc = ServerSocketChannel.open().bind(new InetSocketAddress(8080))) {
    while (true) {
        // 接收请求
        SocketChannel sc = ssc.accept();
        // 每个请求都创建一个线程
        new Thread(() -> {
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
        }).start();
    }
}
```
1. Java中的线程是一个重量级的对象，创建成本很高（创建过程比较**耗时** + 线程占用的**内存**也较大）
2. 所以在Java中为每个请求创建一个新的线程并**不适合高并发**场景
3. 语言、工具和框架本身是帮助我们更敏捷地实现方案的
    - 而Thread-Per-Message模式是最简单的**分工**方案，只是Java无法有效支持
4. Java线程和操作系统线程是**一一对应**的，Java将Java线程的调度权完全委托给操作系统
    - 操作系统在线程调度方面非常成熟、稳定和可靠，但创建线程的**成本**很高
    - 为此，JUC提供了线程池等工具类
5. 业界还有另外一种解决方案，叫作_**轻量级线程**_
    - 在Go语言，Lua语言里的**协程**，本质上是一种轻量级线程
    - 轻量级线程的创建成本很低，基本上和创建一个普通对象的成本类似
        - 创建速度和内存占用相比操作系统线程**至少有一个数量级**的提升
        - 因此，基于轻量级线程实现Thread-Per-Message模式是没有问题的
    - OpenJdk的[**Loom**](https://wiki.openjdk.java.net/display/loom/Main)项目，是为了解决Java语言的轻量级线程问题，Loom项目中的轻量级线程叫作**Fiber**
6. Thread-Per-Message模式在Java领域并不知名
    - 根本原因：Java线程是一个**重量级对象**，线程的创建成本太高，在高并发领域，**基本不具备可行性**
    - _**Java在未来一定会提供轻量级线程**_

<!-- indicate-the-source -->
