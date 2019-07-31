---
title: Kafka -- 集群参数
mathjax: false
date: 2019-07-19 13:12:41
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

## Broker参数

### 存储
1. log.dir：表示**单个**路径
2. log.dirs：表示**多个**路径，**推荐使用**
    - `/home/kafka1,/home/kafka2,/home/kafka3`
    - 线上生产环境中一定要为log.dirs配置多个路径，格式为**CSV**，**逗号分隔**
    - 建议把不同的路径**挂载**到不同的**物理磁盘**上
        - **提升读写性能**，比起单块硬盘，多块物理磁盘同时读写数据有**更高的吞吐量**
        - 能够实现**故障转移**（Failover），从Kafka 1.1引入，坏掉的磁盘上的数据会自动地转移到其他正常的磁盘上

<!-- more -->

### Zookeeper
1. Zookeeper是一个**分布式协调框架**，负责协调管理并保存**Kafka集群的所有元数据信息**
    - 集群有哪些Broker在运行，创建了哪些Topic，每个Topic有多少分区、分区的Leader副本在哪些机器上
2. zookeeper.connect，CSV格式，`zk1:2181,zk2:2181,zk3:2181`
3. Zookeeper地chroot，只需写**一次**，`zk1:2181,zk2:2181,zk3:2181/kafka1`和`zk1:2181,zk2:2181,zk3:2181/kafka2`

### 连接
1. listeners
    - 监听器，告知外部连接者通过什么协议来访问指定主机名和端口开放的Kafka服务
    - 逗号分隔的三元组，格式：`<协议名称，主机名，端口号>`
        - 协议名称可能是标准的名字，如PLAINTEXT表示明文传输，SSL表示使用SSL或者TLS加密传输
        - 协议名称也可能是自定义的，如`CONTROLLER://localhost:9092`
            - 如果使用自定义的协议名称，需要通过`listener.security.protocol.map`来说明底层使用的**安全协议**
            - listener.security.protocol.map=CONTROLLER:PLAINTEXT
        - **主机名推荐使用域名，而非IP**
2. advertised.listeners
    - 对外发布的监听器
3. host.name/port
    - 已过期参数，无需设置

### Topic
1. auto.create.topics.enable
    - 是否允许自动创建Topic，建议设置为**false**
    - 在线上环境，每个部门被分配的Topic应该由运维部门严格把控
2. unclean.leader.election.enable
    - 是否允许Unclean Leader选举，建议设置为**false**
    - Kafka的分区有多个副本，这些副本中只能有一个副本对外提供服务，即**Leader副本**
    - 并不是所有副本都有资格竞选Leader，_**只有保存数据比较多的副本才有资格竞选Leader**_
    - 如果保存数据比较多的副本挂了，该参数发挥作用
        - 设置为false，坚决不让落后太多的副本竞选Leader，后果就是这个**分区不可用**了，因为没有Leader
        - 设置为true，允许从落后太多的副本中选举出一个Leader，后果就是**数据有可能丢失**
3. auto.leader.rebalance.enable
    - 是否允许**定期**进行Leader选举，建议设置为**false**
    - 与上一参数最大的不同是，它不是选Leader，而是_**换Leader**_
    - 换Leader的**代价很高**，并且本质上**没有任何性能收益**
        - 原本向A发送请求的所有客户端都要切换成向B发送请求

### 数据留存
1. log.retention.{hours|minutes|ms}
    - 控制**一条消息**可以被保存多长时间，优先级：ms > minutes > hours，推荐使用**hours**
2. log.retention.bytes
    - 指定Broker为消息保存的**总磁盘容量大小**，默认值为**-1**，表示**不限制**
    - 应用场景：在云上构建多租户的Kafka集群，每个租户只能使用100GB的磁盘空间，避免租户恶意使用过多的磁盘空间
3. message.max.bytes
    - 控制Broker能够接收的**最大消息大小**
    - 默认值为1000012，小于1MB，实际场景中，消息突破1MB的场景很常见，所以线上环境一般会设置一个比较大的值

## Topic参数
如果同时设置了Topic级别参数和全局Broker参数，Topic级别参数会**覆盖**全局Broker参数的值

### 数据留存
retention.ms、retention.bytes、message.max.bytes

```bash
# 创建Topic时进行设置，保存最近半年的交易数据，单个消息很大，但也不会超过5MB
$ kafka-topics --bootstrap-server localhost:9092 --create --topic transaction --partitions 1 --replication-factor 1 --config retention.ms=15552000000 --config max.message.bytes=5242880

# 修改Topic级别参数，将消息的最大大小修改为10MB
# 推荐使用kafka-configs，社区未来很有可能统一使用kafka-configs来调整Topic级别参数
$ kafka-configs --zookeeper localhost:2181 --entity-type topics --entity-name transaction --alter --add-config max.message.bytes=10485760
```

## JVM参数
1. Kafka服务端代码是用**Scala**语言编写的，最终要编译成**Class文件**在**JVM**上运行
2. 不推荐将Kafka运行在Java 6或Java 7的环境上，Kafka从**2.0.0**开始，正式摒弃**对Java 7的支持**
3. 将JVM的堆大小设置为**6GB**，这是业界比较公认的合理值，默认的1GB太小
    - Kafka Broker在与客户端交互时，会在JVM堆上创建大量的**ByteBuffer**实例
4. 垃圾收集器
    - Java 7
        - 如果Broker所在机器的**CPU资源非常充裕**，建议使用**CMS收集器**，-XX:+UseCurrentMarkSweepGC
        - 否则使用**吞吐量收集器**，-XX:+UseParallelGC
    - Java 8
        - 使用**G1收集器**，在没有任何调优的情况下，**G1的表现要优于CMS**
        - 主要体现在**更少的Full GC**，**更少的调整参数**

```bash
$ export KAFKA_HEAP_OPTS=--Xms6g  --Xmx6g
$ export KAFKA_JVM_PERFORMANCE_OPTS= -server -XX:+UseG1GC -XX:MaxGCPauseMillis=20 -XX:InitiatingHeapOccupancyPercent=35 -XX:+ExplicitGCInvokesConcurrent -Djava.awt.headless=true
$ kafka-server-start config/server.properties
```

## OS参数
1. 文件描述符限制
    - `ulimit -n`，文件描述符系统资源**并没有很昂贵**，设置成一个很大的值也是合理的
2. 文件系统类型
    - **日志型文件系统**：ext3、ext4、XFS，**XFS的性能强于ext4**，所以生产环境最好使用**XFS**
3. Swappiness
    - 不建议将Swap空间设置为0
        - 因为一旦设置为0，当物理内存耗尽时，操作系统会触发**OOM Killer**
        - OOM Killer会**随机**挑选一个进程然后kill掉，**不会给出任何预警**
    - 可以将Swap空间设置为很小的值，例如1
        - 当开始使用Swap空间时，至少能够观测到Broker**性能急剧下降**，留有**调优**和**诊断**问题的时间
4. Flush落盘时间
    - 向Kafka发送数据并不需要等到数据被写入磁盘才会认为成功，只需被写入到操作系统的**页缓存**（Page Cache）即可
    - 随后操作系统根据**LRU算法**会**定期**将页缓存上的**脏数据**落盘到物理磁盘上
    - Flush落盘时间默认是**5秒**，如果页缓存中的数据在写入到磁盘之前，机器宕机了，会造成**数据丢失**
    - 但Kafka在**软件层面**已经提供了**多副本的冗余机制**，因此**适当地调大**Flush落盘时间是个合理的做法
