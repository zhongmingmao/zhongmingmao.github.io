---
title: Kafka -- 监控
mathjax: false
date: 2019-09-29 19:56:03
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

## 主机监控
1. 主机监控：监控Kafka集群Broker所在的节点机器的性能
2. 常见的主机监控指标
    - **机器负载**
    - **CPU使用率**
    - **内存使用率**，包括空闲内存和已使用内存
    - **磁盘IO使用率**，包括读使用率和写使用率
    - **网络IO使用率**
    - **TCP连接数**
    - **打开文件数**
    - **inode使用情况**

<!-- more -->

## JVM监控
1. 重点指标
    - Full GC发生频率和时长
    - 活跃对象大小
    - 应用线程总数
2. 设置堆大小
    - 经历一次**Full GC**后，堆上存活的活跃对象大小为S，可以安全地将**老年代**堆大小设置为**1.5S**或者**2S**
3. 从**0.9.0.0**版本开始，社区将默认的GC收集器设置为**G1**，而G1的**Full GC**是由**单线程**执行的，速度**非常慢**
    - 一旦发现Broker进程**频繁Full GC**，可以开启G1的**`-XX:+PrintAdaptiveSizePolicy`**，获知引发Full GC的**原因**

## 集群监控
1. 查看Broker进程是否启动，端口是否建立
    - 在容器化的Kafka环境，容器虽然启动成功，但由于网络配置有误，会出现进程已经启动但端口未成功监听的情形
2. 查看Broker端**关键日志**
    - Broker端服务器日志**server.log** -- 最重要
    - 控制器日志**controller.log**
    - 主题分区状态变更日志**state-change.log**
3. 查看Broker端**关键线程**的运行状态
    - 这些关键线程的**意外挂掉**，往往**无声无息**，但却影响巨大
    - **Log Compaction**线程，这类线程以`kafka-log-cleaner-thread`开头
        - 挂掉后，所有Compaction操作都会中断，导致Kafka内部的**位移主题**所占用的磁盘空间越来越大
    - **副本拉取消息**的线程，通常以`ReplicaFetcherThread`开头
        - 挂掉后，系统会表现为对应Follower副本不再从Leader副本拉取消息，Follower副本的**Lag**会越来越大
4. 查看Broker端**关键JMX指标**
    - **BytesIn/BytesOut**
        - `kafka.server:type=BrokerTopicMetrics,name=BytesInPerSec`
        - `kafka.server:type=BrokerTopicMetrics,name=BytesOutPerSec`
        - Broker端每秒入站和出站字节数，要确保这组值**不要接近网络带宽**，容易出现**网络丢包**的情形
    - **NetworkProcessorAvgIdlePercent**
        - `kafka.network:type=SocketServer,name=NetworkProcessorAvgIdlePercent`
        - **网络线程池平均的空闲比例**，要确保该值长期大于**30%**
    - **RequestHandlerAvgIdlePercent**
        - `kafka.server:type=KafkaRequestHandlerPool,name=RequestHandlerAvgIdlePercent`
        - **IO线程池平均的空闲比例**，要确保该值长期大于**30%**
    - **UnderReplicatedPartitions**
        - `kafka.server:type=ReplicaManager,name=UnderReplicatedPartitions`
        - 未充分备份的分区数，一般为0
            - 未充分备份，即**并非所有的Follower副本都和Leader副本保持同步**，此时可能会出现**数据丢失**
    - **ISRShrink/ISRExpand**
        - `kafka.server:type=ReplicaManager,name=IsrShrinksPerSec`
        - `kafka.server:type=ReplicaManager,name=IsrExpandsPerSec`
        - ISR收缩和扩容的频次指标
    - **ActiveControllerCount**
        - `kafka.controller:type=KafkaController,name=ActiveControllerCount`
        - 当前处于**激活状态**的控制器数量
            - 正常情况下，Controller所在Broker上的这个JMX指标值为1，其它Broker上这个值为0
            - 如果发现存在**多台Broker**上该值都是**1**时，通常表明集群中出现了**脑裂**，此时一定要查看**网络连通性**
            - 脑裂是**非常严重的分布式故障**，Kafka目前依托**ZK**来防止脑裂
            - 一旦出现脑裂，Kafka是**无法保证正常工作**的
5. 监控Kafka客户端
    - 首先要关心的是客户端所在机器与Kafka Broker机器之间的**网络往返时延**（**RTT**），可以借助**ping**命令
    - 生产者
        - 以`kafka-producer-network-thread`开头的线程，负责**实际消息发送**
        - 一旦该线程挂掉，Producer将无法正常工作，但Producer进程不会自动挂掉
    - 消费者
        - 关注以`kafka-coordinator-heartbeat-thread`开头的线程，心跳线程事关**Rebalance**
    - JMX
        - 生产者：`request-latency`，消息生产请求的延时，最直接表征Producer程序的**TPS**
        - 消费者：`records-lag`、`records-lead`，直接反应消费者的**消费进度**
        - 消费者组：`join rate`、`sync rate`，表征**Rebalance的频繁程度**

## 参考资料
[Kafka核心技术与实战](https://time.geekbang.org/column/intro/100029201)
