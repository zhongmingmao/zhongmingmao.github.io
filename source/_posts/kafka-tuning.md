---
title: Kafka -- 调优
mathjax: false
date: 2019-09-30 18:47:22
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

## 调优目标
1. 主要目标：**高吞吐量**、**低延时**
2. **吞吐量**
    - 即**TPS**，指的是Broker端进程或Client端应用程序每秒能处理的**字节数**或**消息数**
3. **延时**，可以有两种理解
    - 从**Producer发送消息**到**Broker持久化**完成之间的时间间隔
    - **端到端的延时**，即从**Producer发送消息**到**Consumer成功消费该消息**的总时长

<!-- more -->

## 优化漏斗
优化漏斗是调优过程中的分层漏斗，层级越靠上，调优的效果越明显
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-tuning-funnel.png" width=800/>

### 操作系统层
1. `mount -o noatime`
    - 在**挂载**文件系统时禁用**atime**（Access Time）更新，记录的是**文件最后被访问的时间**
    - 记录**atime**需要操作系统访问**inode**资源，禁用atime可以**避免inode访问时间的写入操作**
2. 文件系统选择**ext4**、**XFS**、**ZFS**
3. 将**swappiness**设置成一个**很小的值**（1~10，默认是60），防止Linux的`OOM Killer`开启**随机杀掉**进程
    - **swappiness=0**，并不会禁止对swap的使用，只是**最大限度**地降低使用swap的可能性
        - 因为一旦设置为0，当物理内存耗尽时，操作系统会触发**OOM Killer**
        - OOM Killer会**随机**挑选一个进程然后kill掉，**不会给出任何预警**
    - swappiness=N，表示内存使用**`(100-N)%`**时，开始使用Swap
4. `ulimit -n`设置大一点，否则可能会出现**Too Many File Open**错误
5. `vm.max_map_count`也设置大一点（如655360，默认值65530）
    - 在一个主题数超多的机器上，可能会碰到**OutOfMemoryError：Map failed**错误
6. **页缓存大小**
    - 给Kafka预留的页缓存至少也要容纳一个**日志段**的大小（`log.segment.bytes`，默认值为**1GB**）
    - 消费者程序在**消费**时能**直接命中**页缓存，从而避免**昂贵的物理磁盘IO操作**

### JVM层
1. 堆大小，经验值为**6~8GB**
    - 如果需要精确调整，关注**Full GC后堆上存活对象的总大小**，然后将堆大小设置为该值的**1.5~2倍**
    - `jmap -histo:live <pid>`可以人为触发Full GC
2. 选择垃圾收集器
    - 推荐使用**G1**，主要原因是**优化难度比CMS小**
    - 如果使用G1后，频繁Full GC，配置`-XX:+PrintAdaptiveSizePolicy`，查看触发Full GC的原因
    - 使用G1的另一个问题是**大对象**，即`too many humongous allocations`
        - 大对象一般指的是**至少占用半个Region大小的对象**，大对象会被直接分配在**大对象区**
        - 可以适当增大`-XX:+G1HeapRegionSize=N`
3. _**尽量避免Full GC！！**_

### 框架层
尽量保持**客户端**版本和**Broker端**版本**一致**，否则可能会丧失很多**性能收益**，如**Zero Copy**
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-zero-copy.png" width=1000/>

### 应用程序层
1. **不要频繁创建**Producer和Consumer对象实例，构造这些对象的**开销很大**
2. **用完及时关闭**
    - Producer对象和Consumer对象会创建很多物理资源，如Socket连接、ByteBuffer缓冲区，很容易造成**资源泄露**
3. 合理利用**多线程**来改善性能，Kafka的Java Producer是线程安全的，而Java Consumer不是线程安全的

## 性能指标调优

### TPS != 1000 / Latency(ms)
1. 假设Kafka Producer以2ms的延时来发送消息，如果**每次都只发送一条消息**，那么`TPS=500`
2. 但如果Producer不是每次只发送一条消息，而是在发送前**等待一段时间**，然后**统一发送一批**消息
3. 如Producer每次发送前等待8ms，总共缓存了1000条消息，总延时累加到了10ms，但`TPS=100,000`
    - 虽然延时增加了4倍，但TPS却增加了200倍，这就是**批次化**或**微批次化**的优势
    - 用户一般愿意用**较小的延时增加**的代价，去换取**TPS的显著提升**，Kafka Producer就是采用了这样的思路
    - 基于的前提：**内存操作**（几百纳秒）和**网络IO操作**（毫秒甚至秒级）的时间量级不同

### 调优吞吐量
1. Broker端
    - 适当增加**`num.replica.fetchers`**（默认值为1），但**不用超过CPU核数**
        - 生产环境中，配置了`acks=all`的Producer程序吞吐量被拖累的首要因素，就是**副本同步性能**
    - 调优GC参数避免频繁Full GC
2. Producer端
    - 适当增加`batch.size`（默认值为16KB，可以增加到**512KB**或**1MB**）
        - 增加消息批次的**大小**
    - 适当增加`linger.ms`（默认值为0，可以增加到10~100）
        - 增加消息批次的**缓存时间**
    - 修改`compression.type`（默认值为none，可以修改为**lz4**或**zstd**，适配最好）
    - 修改`acks`（默认值为1，可以修改为**0**或**1**）
        - 优化的目标是吞吐量，不要开启`acks=all`（引入的**副本同步时间**通常是吞吐量的瓶颈）
    - 修改`retries`（修改为**0**）
        - 优化的目标是吞吐量，不要开启重试
    - 如果多线程共享同一个Producer，增加`buffer.memory`（默认为`32MB`）
        - `TimeoutException：Failed to allocate memory within the configured max blocking time`
3. Consumer端
    - 采用多Consumer进程或线程**同时消费**数据
    - 适当增加`fetch.min.bytes`（默认值为1Byte，可以修改为**1KB**或更大）

### 调优延时
1. Broker端
    - 适当增加`num.replica.fetchers`
2. Producer端
    - 设置`linger.ms=0`
    - 设置`compression.type=none`
        - 压缩会消耗CPU时间
    - 设置`acks=1`
3. Consumer端
    - 设置`fetch.min.bytes=1`

## 参考资料
[Kafka核心技术与实战](https://time.geekbang.org/column/intro/100029201)