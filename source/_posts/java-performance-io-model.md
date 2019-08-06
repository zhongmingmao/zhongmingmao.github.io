---
title: Java性能 -- IO模型
mathjax: false
date: 2019-07-22 12:54:37
categories:
    - Java
    - Performance
tags:
    - Java
    - Java Performance
    - IO
    - NIO
    - AIO
    - epoll
---

## 什么是IO
1. IO是机器获取和交换信息的主要渠道，而**流**是完成IO操作的主要方式
2. 在计算机中，流是一种**信息的转换**
3. 流是**有序**的
    - 把机器或者应用程序接收外界的信息称为**输入流**（InputStream）
    - 从机器或者应用程序向外输出的信息称为**输出流**（OutputStream）
4. 流可以被看作一种**数据的载体**，通过它可以实现数据的**交换**和**传输**

<!-- more -->

## Java IO
1. Java IO主要在java.io下，有四个基本类：**InputStream**、**OutputStream**、**Reader**、**Writer**，分别用于处理**字节流**和**字符流**
2. 字符到字节必须经过**转码**，该过程**非常耗时**，如果不知道**编码类型**就很容易出现**乱码**问题
    - 因此IO流提供了**直接操作字符的接口**，方便对**字符**进行**流操作**

### 字节流
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-io-byte-stream.jpg" width=800/>

1. 字节流的抽象类：**InputStream/OutputStream**
2. 文件的读写操作：FileInputStream/FileOutputStream
3. 数组的读写操作：ByteArrayInputStream/ByteArrayOutputStream
4. 普通字符串的读写操作：BufferedInputStream/BufferedOutputStream

### 字符流
字符流的抽象类：**Reader/Writer**

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-io-char-stream.jpg" width=800/>

## 传统IO的性能问题
1. IO操作分为磁盘IO操作和网络IO操作
2. **磁盘IO操作**：从磁盘读取数据源输入到内存，之后将读取的信息持久化输出到物理磁盘上
3. **网络IO操作**：从网络中读取信息输入到内存，最终将信息输出到网络中

### 多次内存复制
输入操作在操作系统中的具体流程

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-io-multi-copy.jpg" width=800/>

1. JVM发出read**系统调用**，向内核发起读请求
2. 内核向硬件发出读指令，并等待**读就绪**
3. 内核把将要读取的数据**复制**到指定的**内核缓存**中
4. 操作系统内核将数据**复制**到**用户空间缓冲区**，然后read系统调用返回
5. 数据先从**外部设备**复制到**内核空间**，再从**内核空间**复制到**用户空间**，发生了**两次内存复制**
    - 导致不必要的**数据拷贝**和**上下文切换**，**降低了IO性能**

### 阻塞
1. 在传统IO中，InputStream的read()是一个**while循环操作**，会**一直等待数据读取**，直到数据就绪才会返回
    - 如果没有数据就绪，读取操作将会一直被**挂起**，用户线程将处于**阻塞**状态
2. 在发生**大量**连接请求时，需要创建大量监听线程，一旦这些线程发生阻塞，就会**不断地抢夺CPU资源**
    - _**导致大量的CPU上下文切换，增加系统的性能开销**_

## 优化IO操作
1. 面对上面两个性能问题，不仅**编程语言**进行了优化，在**操作系统**层面也进行了优化
2. JDK 1.4发布了java.nio包，NIO的发布优化了**内存复制**以及**阻塞**导致的严重性能问题
3. JDK 1.7发布了NIO2，从**操作系统**层面实现**异步IO**

### 使用缓冲区 -- 优化读写流操作
1. 在传统IO中，提出**基于流的IO实现**，即InputStream和OutputStream，这种基于流的实现是以**字节**为单位处理数据
2. NIO与传统IO不同，它是基于**块**（Block）的，以**块**为单位处理数据
3. NIO中最为重要的两个组件是**缓冲区**（Buffer）和**通道**（Channel）
    - Buffer是一块**连续的内存块**，是NIO**读写数据的中转地**
    - Channel表示**缓冲数据的源头或目的地**，用于**读取**缓冲或者**写入**缓冲，是**访问缓冲的接口**
4. 传统IO与NIO的最大区别：_**传统IO面向流，NIO面向Buffer**_
    - Buffer可以将文件**一次性读入**内存再做后续处理，传统IO是**边度边处理**数据
    - 传统IO后来也使用了**缓冲块**，如BufferedInputStream，但仍然**不能和NIO相媲美**
5. 使用NIO替代传统IO，可以**立竿见影地提升系统的整体性能**

### 使用DirectBuffer -- 减少内存复制
1. NIO的Buffer除了做了**缓冲区优化**之外，还提供了**直接访问物理内存**的类：DirectBuffer
2. _**普通的Buffer分配的是JVM堆内存，而DirectBuffer是直接分配物理内存**_
3. 输出数据到外部设备
    - 普通Buffer：从用户空间复制到内核空间，再复制到外部设备
    - DirectBuffer：**简化为从内核空间复制到外部设备**，减少了数据拷贝
4. DirectBuffer申请的是非JVM堆内存，_**创建和销毁的代价很高**_
5. DirectBuffer申请的内存并**不直接由JVM负责GC**
    - 在DirectBuffer包装类被回收时，会通过**Java Reference机制**来释放该内存块

### 避免阻塞
1. NIO常被称为Non-Block IO，即**非阻塞IO**，这体现了NIO的特点
2. **传统IO即使使用了缓冲块，依然存在阻塞问题**
    - 线程池线程数有限，一旦发生**大量并发请求**，超过最大数量的线程就只能**等待**，直到线程池中有**空闲的线程**可以被复用
    - 对Socket的输入流进行读取时，会一直**阻塞**，直到发生其中一种情况：**有数据可读**、**连接释放**、**空指针或IO异常**
3. **阻塞问题是传统IO的最大弊端**，NIO通过**通道**和**多路复用器**这两个组件实现了**非阻塞**

#### 通道（Channel）
1. 传统IO的数据读写是从**用户空间**到**内核空间**来回复制，内核空间的数据是通过**操作系统层面的IO接口**从磁盘或网络读写的
2. 最开始，在应用程序调用操作系统IO接口时，**由CPU完成分配**，问题：**发生大量IO请求时，非常消耗CPU**
3. 后来，操作系统引入**DMA**（Direct memory access）
    - **内核空间与磁盘之间的存取完全由DMA负责**
    - 但依然需要向CPU申请权限，且需求借助DMA总线来完成数据的复制操作，如果**DMA总线过多**，会造成**总线冲突**
4. **Channel有自己的处理器**：可以完成**内核空间**和**磁盘**之间的IO操作
5. 在NIO中，数据的读写都需要通过Channel，Channel是**双向**的，所以**读写可以同时进行**

#### 多路复用器（Selector）
1. Selector是Java NIO编程的基础，用于_**检查一个或多个NIO Channel的状态是否处于可读、可写**_
2. Selector是基于**事件驱动**实现的
    - 在Selector中**注册accept、read监听事件**，Selector会不断**轮询**注册在其上的Channel
    - 如果某个Channel上面发生**监听事件**，该Channel就处于**就绪**状态，然后进行IO操作
3. **一个线程使用一个Selector**，通过**轮询**的方式，可以**监听多个Channel上的事件**
4. 可以在**注册Channel**时设置该Channel为**非阻塞**
    - 当Channel上**没有IO操作**时，线程**不会一直等待**，而是会**不断轮询所有Channel**，从而**避免发生阻塞**
5. 目前操作系统的IO多路复用机制都使用了**epoll**
    - 相比于传统的select机制，epoll没有**最大连接句柄1024**的限制
    - 所以Selector理论上可以轮询成千上万的客户端

## AIO
1. JDK 1.7中，Java发布了NIO2，即**AIO**
2. AIO实现了**真正意义上的异步IO**，直接将IO操作交给操作系统进行异步处理
3. 但很多通信框架依然使用NIO，这是因为**异步IO模型在Linux内核中没有实现**
