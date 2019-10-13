---
title: Kafka -- 处理请求
mathjax: false
date: 2019-09-15 09:44:40
categories:
    - Middleware
    - MQ
    - Kafka
tags:
    - Middleware
    - MQ
    - Kafka
    - Stream
---

## 请求协议
1. Kafka自定义了一组请求协议，用于实现各种各样的交互操作
    - **PRODUCE**请求用于生产消息，**FETCH**请求用于消费消息，**METADATA**请求用于请求Kafka集群元数据信息
2. Kafka 2.3总共定义了**45**种请求格式，所有请求都通过**TCP**网络以**Socket**的方式进行通讯

<!-- more -->

## 处理请求方案

### 顺序处理
实现简单，但**吞吐量太差**，只适用于请求发送**非常不频繁**的场景
```java
while (true) {
    Request request = accept(connection);
    handle(request);
}
```

### 单独线程处理
为每个请求都**创建一个新的线程异步处理**，完全异步，但**开销极大**，只适用于请求发送**频率很低**的场景
```java
while (true) {
    Request request = accept(connection);
    Thread thread = new Thread(() -> { handle(request); });
    thread.start();
}
```

### Reactor模式
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-process-request-reactor.png" width=1000>

1. Reactor模式是**事件驱动**架构的一种实现方式，特别适合应用于处理多个客户端**并发**向服务器端发起请求的场景
2. 多个客户端会发送请求给**Reactor**，Reactor有个**请求分发线程Acceptor**，将不同的请求下发到多个**工作线程**中处理
3. **Acceptor**线程只用于请求分发，不涉及具体的逻辑处理，非常**轻量级**，有**很高的吞吐量**
    - 工作线程可以根据实际业务处理需要任意增减，从而**动态调节系统负载能力**

#### Kafka
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-process-request-reactor-kafka.png" width=1000>

1. Broker端有一个**SocketServer**组件，类似于Reactor模式中的**Dispatcher**
    - 也有对应的**Acceptor线程**和一个工作线程池（即**网络线程池**，参数设置`num.network.threads`，默认值为**3**）
2. Acceptor线程采用**轮询**的方式将入站请求**公平**地发到所有网络线程中
    - 实现简单，**避免了请求处理的倾斜**，有利于实现**较为公平**的请求处理调度

<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-process-request-reactor-kafka-io-pool.png" width=1000>

1. 当**网络线程**拿到请求后，并不是自己处理，而是将请求放入到一个**共享请求队列**中
2. Broker端还有一个**IO线程池**，负责从共享请求队列中取出请求，执行**真正的处理**
    - 如果是**PRODUCE**请求，将消息写入到**底层的磁盘日志**中
    - 如果是**FETCH**请求，则从**磁盘**或**页缓存**中读取消息
3. IO线程池中的线程才是执行请求逻辑的线程，参数`num.io.threads`，默认值为**8**
4. 当**IO线程**处理完请求后，会将**生成的响应**发送到**网络线程池的响应队列**中
    - 然后由**对应的网络线程**负责将Response返回给客户端
5. **请求队列**是所有网络线程**共享**的，而**响应队列**是每个网络线程**专属**的
    - Purgatory组件用于_**缓存延时请求**_
    - 如`acks=all`的**PRODUCE**请求，必须等待**ISR中所有副本**都接收消息后才能返回
        - 此时处理该请求的IO线程必须等待其他Broker的写入结果，当请求不能处理时，就会**暂存**在Purgatory中
        - 等到条件满足后，IO线程会继续处理该请求，并将Response放入**对应**网络线程的响应队列中
6. Kafka将PRODUCE、FETCH这类请求称为**数据类请求**，把LeaderAndIsr、StopReplica这类请求称为**控制类请求**
    - 在**Kafka 2.3**，正式实现了**数据类请求**和**控制类请求**的**分离**（**完全拷贝**一套组件，实现两类请求的分离）