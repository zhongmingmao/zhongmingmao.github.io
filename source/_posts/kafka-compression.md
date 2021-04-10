---
title: Kafka -- 压缩
mathjax: false
date: 2019-08-02 21:33:13
categories:
    - Middleware
    - MQ
    - Kafka
tags:
    - Middleware
    - MQ
    - Kafka
    - Stream
    - Compression
---

## 压缩的目的
时间换空间，用**CPU时间**去换**磁盘空间**或**网络IO传输量**

## 消息层次
1. **消息集合**（Message Set）和**消息**
2. 一个消息集合中包含若干条**日志项**（Record Item），而日志项用于封装消息
3. Kafka底层的消息日志由一系列消息集合日志项组成
4. Kafka不会直接操作具体的消息，而是在**消息集合**这个层面上进行写入操作

<!-- more -->

## 消息格式
1. 目前Kafka共有两大类消息格式，社区分别称之为**V1**版本和**V2**版本（在0.11.0.0引入）
2. V2版本主要针对V1版本的一些弊端进行了优化
3. 优化1：把消息的公共部分**抽取**到外层消息集合里面
    - 在V1版本中，每条消息都需要执行CRC校验，但在某些情况下，消息的CRC值会发生变化
        - Broker端可能对消息的**时间戳**字段进行更新，重新计算后的CRC值也会相应更新
        - Broker端在执行**消息格式转换**时（兼容老版本客户端），也会带来CRC值的变化
    - 因此没必要对每条消息都执行CRC校验，浪费**空间**和**时间**
    - 在V2版本中，消息的CRC校验被移到了消息集合这一层
4. 优化2：对**整个消息集合**进行压缩
    - 在V1版本中，对**多条消息**进行压缩，然后保存到**外层消息的消息体字段**中

<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-compression-v1-v2.png" width=1000/>

## 压缩的时机
在Kafka中，压缩可能发生在两个地方：**生产者**、**Broker**

### 生产者
```java
Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("acks", "all");
props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");
// 开启GZIP压缩
// Producer启动后，生产的每个消息集合都会经过GZIP压缩，能够很好地节省网络传输带宽和Kafka Broker端的磁盘占用
props.put("compression.type", "gzip");

Producer<String, String> producer = new KafkaProducer<>(props);
```

### Broker
大部分情况下，Broker从Producer接收到消息后，仅仅只是**原封不动**地保存，而不会对其进行任何修改，但存在例外情况

#### 不同的压缩算法
1. Producer采用GZIP压缩算法，Broker采用Snappy压缩算法
2. Broker接收到GZIP压缩消息后，只能解压后使用Snappy压缩算法**重新压缩**一遍
3. Broker端也有`compression.type`参数，默认值是**producer**，表示Broker端会**尊重**Producer端使用的压缩算法
    - 一旦Broker端设置了不同的`compression.type`，可能会发生预料之外的压缩/解压缩操作，导致**CPU使用率飙升**

#### 消息格式转换
1. 消息格式转换主要是为了兼容**老版本的消费者程序**，在一个Kafka集群中通常同时保存**多种版本的消息格式**（V1/V2）
    - Broker端会对新版本消息执行向老版本格式的转换，该过程中会涉及消息的**解压缩**和**重新压缩**
2. 消息格式转换对性能的影响很大，除了增加额外的压缩和解压缩操作之外，还会让Kafka丧失引以为傲的**Zero Copy**特性
    - Zero Copy：数据在**磁盘**和**网络**进行传输时，**避免昂贵的内核态数据拷贝**，从而实现快速的数据传输
3. 因此，**尽量保证消息格式的统一**

## 解压缩的时机

### Consumer
1. 通常来说**解压缩**发生在**消费者**
2. _**Producer压缩，Broker保持、Consumer解压缩**_
3. Kafka会将启用的压缩算法封装进**消息集合**中，当Consumer读取到消息集合时，会知道这些消息使用了哪一种压缩算法

### Broker
1. 与消息格式转换时发生的解压缩是不同的场景（主要为了兼容老版本的消费者）
2. 每个压缩过的消息集合**在Broker端写入时**都要发生解压缩操作，目的是为了对消息执行**各种验证**（主要影响CPU使用率）

## 压缩算法对比
1. Kafka 2.1.0之前，Kafka支持三种压缩算法：**GZIP**、**Snappy**、**LZ4**，从2.1.0开始正式支持**zstd**算法
    - zstd是Facebook开源的压缩算法，能够提供**超高的压缩比**
2. 评估一个压缩算法的优劣，主要有两个指标：**压缩比**、**压缩/解压缩吞吐量**
3. 从下面的Benchmarks可以看出
    - _**zstd具有最高的压缩比**，**LZ4具有最高的吞吐量**_
4. 在Kafka的实际使用中
    - 吞吐量：_**LZ4**_ > Snappy > _**zstd**_ > GZIP
    - 压缩比：_**zstd**_ > _**LZ4**_ > GZIP > Snappy
5. 物理资源
    - 带宽：由于Snappy的压缩比最低，因此占用的网络带宽最大
    - CPU：各个压缩算法差不多，在**压缩**时**Snappy**使用更多的CPU，在**解压缩**时**GZIP**使用更多的CPU
6. **带宽资源比CPU资源和磁盘资源更吃紧**（千兆网络是标配），_**首先排除Snappy，其次排除GZIP，剩下在LZ4和zstd中选择**_
    - 如果客户端的CPU资源充足，强烈建议开启**zstd**压缩，可以**极大地节省网络带宽**

[Benchmarks](https://github.com/facebook/zstd)

| Compressor name | Ratio | Compression | Decompress |
| ---- | ---- | ---- | ---- |
| _**zstd**_ 1.4.0 -1 | _**2.884**_ | 530 MB/s | 1360 MB/s |
| zlib 1.2.11 -1 | 2.743 | 110 MB/s | 440 MB/s |
| brotli 1.0.7 -0 | 2.701 | 430 MB/s | 470 MB/s |
| quicklz 1.5.0 -1 | 2.238 | 600 MB/s | 800 MB/s |
| lzo1x 2.09 -1 | 2.106 | 680 MB/s | 950 MB/s |
| _**lz4**_ 1.8.3 | 2.101 | _**800 MB/s**_ | _**4220 MB/s**_ |
| snappy 1.1.4 | 2.073 | 580 MB/s | 2020 MB/s |
| lzf 3.6 -1 | 2.077 | 440 MB/s | 930 MB/s |

## 参考资料
[Kafka核心技术与实战](https://time.geekbang.org/column/intro/100029201)
