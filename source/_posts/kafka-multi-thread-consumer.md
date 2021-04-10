---
title: Kafka -- 多线程消费者
mathjax: false
date: 2019-09-08 09:55:31
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

## Kafka Java Consumer设计原理
1. Kafka Java Consumer从Kafka 0.10.1.0开始，KafkaConsumer变成了**双线程**设计，即**用户主线程**和**心跳线程**
    - 用户主线程：启动Consumer应用程序main方法的那个线程
    - 心跳线程：只负责定期给对应的Broker机器发送心跳请求，以标识消费者应用的存活性
2. 引入心跳线程的另一个目的
    - 将心跳频率和主线程调用KafkaConsumer.poll方法的频率分开，解耦**真实的消息处理逻辑**和**消费组成员存活性管理**
3. 虽然有了心跳线程，但实际的消息获取逻辑依然是在用户主线程中完成
    - 因此在**消费消息**的这个层面，依然可以安全地认为KafkaConsumer是**单线程的设计**
4. 老版本Consumer是**多线程**的架构
    - 每个Consumer实例在内部为**所有订阅的主题分区**创建对应的**消息获取线程**，即Fetcher线程
5. 老版本Consumer同时也是**阻塞式**的，Consumer实例启动后，内部会创建很多阻塞式的消息获取迭代器
    - 但在很多场景下，Consumer端有**非阻塞**需求，如在**流处理**应用中执行**过滤**、**分组**等操作就不能是阻塞式的
    - 基于这个原因，社区为新版本Consumer设计了**单线程+轮询**的机制，该机制能较好地实现非阻塞的消息获取
6. 单线程的设计**简化**了Consumer端的设计
    - Consumer获取到消息后，处理消息的逻辑是否采用多线程，完全由使用者决定
7. 不论使用哪一种编程语言，单线程的设计都比较容易实现
    - 并不是所有的编程语言都能很好地支持多线程，而单线程设计的Consumer更容易**移植**到其他语言上

<!-- more -->

## 多线程方案
1. KafkaConsumer是**线程不安全**的
2. 不能多线程共享一个KafkaConsumer实例，否则会抛出**ConcurrentModificationException**
3. 但KafkaConsumer.wakeup()是线程安全的

### 方案1
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-multi-thread-consumer-1.png" width=1000>

1. 消费者程序启动多个线程，**每个线程维护专属的KafkaConsumer实例**，负责完整的消息获取、消息处理流程
2. 优点
    - **实现简单**，比较符合目前使用Consumer API的习惯
    - 多个线程之间**没有任何交互**，省去了很多保障线程安全方面的开销
    - Kafka主题中的**每个分区**都能保证**只被一个线程处理**，容易实现**分区内的消息消费顺序**
3. 缺点
    - 每个线程都维护自己的KafkaConsumer实例，必然会占用**更多的系统资源**，如内存、TCP连接等
    - 能使用的线程数**受限**于Consumer**订阅主题的总分区数**
    - 每个线程**完整**地执行消息获取和消息处理逻辑
        - 一旦消息处理逻辑很重，消息处理速度很慢，很容易出现**不必要的Rebalance**，引发整个消费者组的**消费停滞**

```java
public class KafkaConsumerRunner implements Runnable {
    private final AtomicBoolean closed = new AtomicBoolean(false);
    private final KafkaConsumer consumer = new KafkaConsumer(new Properties());

    @Override
    public void run() {
        try {
            consumer.subscribe(Collections.singletonList("topic"));
            while (!closed.get()) {
                ConsumerRecords records = consumer.poll(Duration.ofMillis(10000));
                //  执行消息处理逻辑
            }
        } catch (WakeupException e) {
            // Ignore exception if closing
            if (!closed.get()) {
                throw e;
            }
        } finally {
            consumer.close();
        }
    }

    // Shutdown hook which can be called from a separate thread
    public void shutdown() {
        closed.set(true);
        consumer.wakeup();
    }
}
```

### 方案2
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-multi-thread-consumer-2.png" width=1000>

1. 消费者程序使用单个或多个线程获取消息，同时创建多个消费线程执行消息处理逻辑
    - 获取消息的线程可以是一个，也可以是多个，**每个线程维护专属的KafkaConsumer实例**
    - 处理消息则由**特定的线程池**来做，从而实现**消息获取**和**消息处理**的**真正解耦**
2. 优点
    - 把任务切分成**消息获取**和**消息处理**两部分，分别由不同的线程来处理
    - 相对于方案1，方案2最大的优势是它的**高伸缩性**
        - 可以独立地调节消息获取的线程数，以及消息处理的线程数，不必考虑两者之间是否相互影响
3. 缺点
    - **实现难度大**，因为要分别管理两组线程
    - 消息获取和消息处理解耦，**无法保证分区内的消费顺序**
    - 两组线程，使得**整个消息消费链路被拉长**，最终导致**正确位移提交会变得异常困难**，可能会出现消息的**重复消费**

```java
private final KafkaConsumer<String, String> consumer;
private ExecutorService executors;
...

private int workerNum = 10;
executors = new ThreadPoolExecutor(
    workerNum, workerNum, 0L, TimeUnit.MILLISECONDS,
	new ArrayBlockingQueue<>(1000), 
	new ThreadPoolExecutor.CallerRunsPolicy());

...
while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(1));
    for (final ConsumerRecord record : records) {
        // 由专门的线程池负责处理具体的消息
        executors.submit(new Worker(record));
    }
}
...
```

## 参考资料
[Kafka核心技术与实战](https://time.geekbang.org/column/intro/100029201)