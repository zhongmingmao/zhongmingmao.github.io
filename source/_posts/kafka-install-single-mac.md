---
title: Kafka -- 单节点安装与配置（Mac）
date: 2018-10-07 01:07:32
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

## 安装步骤

### Kafka与Zookeeper
Kafka使用`Zookeeper`保存集群的**元数据信息**和**消费者信息**

<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/definitive-guide/kafka_zookeeper.png" width="600">

<!-- more -->

### 安装Zookeeper和Kafka
```
$ brew install kafka
==> Installing dependencies for kafka: zookeeper
==> Caveats
==> zookeeper
To have launchd start zookeeper now and restart at login:
  brew services start zookeeper
Or, if you don't want/need a background service you can just run:
  zkServer start
==> kafka
To have launchd start kafka now and restart at login:
  brew services start kafka
Or, if you don't want/need a background service you can just run:
  zookeeper-server-start /usr/local/etc/kafka/zookeeper.properties & kafka-server-start /usr/local/etc/kafka/server.properties
```

### 启动Zookeeper和Kafka

#### 当前服务列表
```
$ brew services list
Name      Status  User         Plist
kafka     stopped
mysql     started zhongmingmao /Users/zhongmingmao/Library/LaunchAgents/homebrew.mxcl.mysql.plist
zookeeper stopped
```

#### 启动Zookeeper
```
$ brew services start zookeeper
==> Successfully started `zookeeper` (label: homebrew.mxcl.zookeeper)
```
#### 启动Kakfa
```
$ brew services start kafka
==> Successfully started `kafka` (label: homebrew.mxcl.kafka)
```

#### 当前服务列表
```
$ brew services list
Name      Status  User         Plist
kafka     started zhongmingmao /Users/zhongmingmao/Library/LaunchAgents/homebrew.mxcl.kafka.plist
mysql     started zhongmingmao /Users/zhongmingmao/Library/LaunchAgents/homebrew.mxcl.mysql.plist
zookeeper started zhongmingmao /Users/zhongmingmao/Library/LaunchAgents/homebrew.mxcl.zookeeper.plist
```

### 基本测试

#### 创建主题
```
$ kafka-topics --zookeeper localhost:2181 --create --replication-factor 1 --partitions 1 --topic zhongmingmao
Created topic "zhongmingmao".

$ kafka-topics --zookeeper localhost:2181 --list
__consumer_offsets
zhongmingmao

$ kafka-topics --zookeeper localhost:2181 --describe --topic zhongmingmao
Topic:zhongmingmao	PartitionCount:1	ReplicationFactor:1	Configs:
	Topic: zhongmingmao	Partition: 0	Leader: 0	Replicas: 0	Isr: 0
```

#### 发布消息
```
$ kafka-console-producer --broker-list localhost:9092 --topic zhongmingmao
>zhongmingmao
>is
>learning kafka
>
```

#### 读取消息
```
$ kafka-console-consumer --bootstrap-server localhost:9092 --topic zhongmingmao --from-beginning
zhongmingmao
is
learning kafka
```

## Broker配置

### 常规配置

#### broker.id
1. 每个Broker都需要一个标识符，使用`broker.id`来表示，默认为0，也可以被设置成任意整数
2. 这个值在**整个Kafka集群**里必须是**唯一**的
3. 建议把它们设置成**与机器名具有相关性**的整数

#### zookeeper.connect
1. 指定用来保存**Broker元数据的**Zookeeper地址
2. 例如 hostname1:port1/path,hostname2:port2/path,hostname3:port3/path
    - **/path** 是可选的Zookeeper路径，作为Kafka集群的**chroot**环境
    - 如果不指定，默认使用**根路径**
    - 如果指定的chroot不存在，Broker会在启动的时候创建它
    - 在Kafka集群里**使用chroot路径**是一种**最佳实践**

#### log.dirs
1. Kafka把**所有的消息**都保存在**磁盘**上，存放这些**日志片段**的目录是通过`log.dirs`指定的
2. 一组**逗号**分隔的**本地文件系统路径**
3. 如果指定了**多个路径**，那么Broker会依据**最少使用**原则，_**把同一个分区的日志片段保存在同一个路径下**_
    - Broker会往拥有**最少分区数目**的路径新增分区
    - 而不是往拥有**最少磁盘空间**的路径新增分区

#### num.recovery.threads.per.data.dir
> Specify the maximum number of threads that are used for log recovery for each data directory.

##### 处理时机
1. 服务器**正常启动**，用于打开每个分区的日志片段
2. 服务器**崩溃后重启**，用于检查和截断每个分区的日志片段
3. 服务器**正常关闭**，用于关闭日志片段

##### 多线程和单目录
1. 默认情况下，每个日志目录只使用一个线程
    - 这些线程只在服务器**启动**或者**关闭**时会用到，所以完全可以设置**大量的线程**来达到**并行操作**的目的
2. 所配置的数字对应的是`log.dirs`指定的**单个日志目录**
    - 如果`num.recovery.threads.per.data.dir=8`，`log.dirs=3`，那么总共需要24个线程

#### auto.create.topics.enable

##### 自动创建时机
1. 当一个**生产者**开始往主题**写入消息**时
2. 当一个**消费者**开始从主题**读取消息**时
3. 当任意一个客户端向主题发送**元数据请求**时

### 主题配置

#### num.partitions
1. 指定新创建的主题包含多少个分区
2. 如果启用了主题的**自动创建**功能（默认启用）
    - _**可以增加主题分区的个数，但不能减少分区的个数**_
    - 如果要让一个主题分区的个数少于`num.partitions`指定的值，需要**手动**创建该主题

##### 选定分区数量
1. **主题** 需要达到多大的吞吐量？100KB/S还是1GB/S?
2. 从**单个分区**读取数据的**最大吞吐量**是多少？
    - **每个分区**一般都会有**一个消费者**
    - 如果消费者将数据写入数据库的速度不会超过50MB/S
        - 那么一个分区读取数据的吞吐量不需要超过50MB/S
3. 通过类似的方法估算生产者向单个分区写入数据的吞吐量
    - 不过**生产者的速度一般比消费者快得多**，最好为生产者多估算一些吞吐量
4. 每个Broker包含的**分区个数**、**可用的磁盘空间**和**网络带宽**
5. 如果消息是按照不同的键写入分区的，那么为已有的主题新增分区就会很困难
6. _**单个Broker对分区个数是有限制的**_
    - 因为**分区越多**，**占用的内存越多**，完成**首领选举**需要的时间也越长
    - 如果已经估算出**主题的吞吐量**和**消费者的吞吐量**，用**主题吞吐量**除以**消费者吞吐量**算出分区的个数
    - 如果不知道这些信息，把**单个分区的大小**限制在**25GB**以内可以得到比较理想的效果

#### log.retention.{hours,minutes,ms}
1. 决定消息多久以后会被删除，_**默认一周**_，推荐使用`log.retention.ms`
2. 如果指定了不止一个参数，会优先使用具有**最小值**的那个参数
3. 根据时间保留数据是通过检查磁盘上**日志片段文件**的**最后修改时间**来实现的
    - 一般来说，最后修改时间指的是**日志片段的关闭时间**，也就是_**日志片段文件里最后一个消息的时间戳**_

#### log.retention.bytes
1. 通过保留的字节数来判断消息是否过期，作用在**每一个分区**上，**默认1GB**
2. 若同时指定了`log.retention.ms`和`log.retention.bytes`，只要**满足任意一个条件**，消息就会被删除

#### log.segment.bytes
1. 当消息到达Broker时，它们被追加到**分区的当前日志片段**上
2. 当**日志片段大小**达到了`log.segment.bytes`指定的上限（**默认1GB**）
    - _**当前日志片段就会被关闭（记录最后修改时间），一个新的日志片段就会被打开**_
    - _**如果一个日志片段被关闭，就开始等待过期**_
    - _**这个参数越小，就会越频繁地关闭和分配新文件，从而降低磁盘写入的整体效率**_
3. 如果主题的消息量不大，如何调整这个参数的大小变得尤为重要
    - 如果一个主题每天只接收100MB的消息，而`log.segment.bytes`采用默认值（1GB）
        - 那么需要10天的时间才能填满一个日志片段
    - _**日志片段在被关闭之前，消息是不会过期的**_
    - `log.retention.ms`采用默认值（7天），那么日志片段需要17天才会过期
        - **需要等到日志片段里的最后一个消息过期才能被删除**
4. **日志片段的大小** 会影响**使用时间戳获取偏移量**
    - 在使用**时间戳**获取**日志偏移量**时
        - Kafka会检查分区里**最后修改时间**大于指定时间戳的日志片段，返回该日志片段**开头**的偏移量
        - 例如某个分区有3个日志片段：S1:T1，S2:T2，S3:T3，T1.5会返回S2开头的偏移量
    - 对于使用**时间戳**获取**偏移量**的操作来说，_**日志片段越小，结果越准确**_

#### segment.ms
1. 指定多长时间之后日志片段会被关闭
2. `log.segment.bytes`和`segment.ms`不存在互斥关系，看哪个条件先得到满足
3. 默认情况下，`segment.ms`没有设定值，所以一般依据`log.segment.bytes`来关闭日志片段
4. 在使用**基于时间的日志片段**时，要着重考虑**并行关闭多个日志片段对磁盘性能的影响**

#### message.max.bytes
1. 限制**单个消息的大小**，**默认1MB**
2. 该参数指的是_**压缩后的消息大小**_
3. 值越大，那么**负责网络连接和请求的线程**就需要花越多的时间来处理这些请求
    - 而且还会**增加磁盘写入块的大小**，从而**影响IO吞吐量**
4. 如果**消费者客户端**设置的`fetch.message.max.bytes`比`message.max.bytes`小
    - 那么**消费者就无法读取比较大的消息**，导致出现**消费者被阻塞**的情况

## 硬件选择

### 磁盘吞吐量
1. 生产者客户端的性能直接受到**服务器端磁盘吞吐量**的影响
2. _**生产者生成的消息必须被提交到服务器保存**_

### 磁盘容量
1. 需要多大的**磁盘容量**取决于**需要保留的消息数量**
2. 在决定扩展Kafka集群规模时，存储容量是一个需要考虑的因素
  - 通过让**主题拥有多个分区**，**集群的总流量可以被均衡到整个集群**
  - 如果**单个Broker无法支持全部容量**，可以让**其它Broker提供可用的容量**
  - 存储容量的选择同时受到**集群复制策略**的影响

### 内存
1. _**磁盘性能影响生产者，内存影响消费者**_
2. 消费者读取的消息会直接存放在**系统的页面缓存**里，这比从磁盘上重新读取要快得多
3. 运行Kafka的JVM不需要太大的内存
    - 剩余的系统内存可以用作**页面缓存**，或者用来缓存正在使用中的日志片段
    - 不建议把Kafka与其它重要的应用程序部署在一起，因为需要**共享页面缓存**
        - 最终会导致**降低Kafka消费者的性能**

### 网络
1. **网络吞吐量**决定了Kafka能处理的**最大数据流量**，它和**磁盘存储**是制约Kafka扩展规模的主要因素
2. Kafka支持**多个消费者**，造成**流入和流出的网络流量不平衡**
3. **集群复制** 和**镜像**也会占用网络流量
    - 如果网络接口出现饱和，那么**集群的复制出现延时**就会在所难免，从而让集群不堪一击

### CPU
1. 与磁盘和内存相比，_**Kafka对计算处理能力的要求相对较低**_
2. 计算处理
    - 客户端为了优化**网络**和**磁盘空间**，会对消息进行**压缩**
    - 服务器需要对消息进行**批量解压**，**设置偏移量**，然后重新进行**批量压缩**，再保存在磁盘上

<!-- indicate-the-source -->
