---
title: Kafka -- 内部原理
date: 2019-03-26 22:10:06
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

## 群组成员关系
1. Kakfa使用ZooKeeper来维护集群成员的信息
2. 每个Broker都有一个**唯一的ID**，这个ID可以在**配置文件**里面指定，也可以**自动生成**
3. 在Broker启动的时候，通过创建**临时节点**把自己的ID注册到ZooKeeper
4. Kakfa组件订阅ZooKeeper的`/brokers/ids`路径，当有Broker加入集群或者退出集群时，Kafka组件能获得**通知**
5. 如果要启动另一个具有**相同ID**的Broker，会得到一个错误，这个Broker会尝试进行注册，但会失败
6. 在Broker停机，出现网络分区或者长时间垃圾回收停顿时，Broker会从ZooKeeper上_**断开连接**_
    - 此时，Broker在启动时创建的**临时节点**会从ZooKeeper上自动移除（ZooKeeper特性）
    - 订阅Broker列表的Kafka组件会被告知该Broker已经被移除
7. 在关闭Broker时，它对应的临时节点也会消失，不过它的ID会继续存在于其他数据结构中
    - 例如，主题的副本列表里可能会包含这些ID
8. 在完全关闭了一个Broker之后，如果使用**相同的ID**启动另一个全新的Broker
    - 该Broker会立即加入集群，并拥有与旧Broker**相同**的**分区**和**主题**

<!-- more -->

```
[zk: localhost:12181(CONNECTED) 5] ls /brokers/ids
[1, 2, 3]
[zk: localhost:12181(CONNECTED) 6] get /brokers/ids/1
{"listener_security_protocol_map":{"PLAINTEXT":"PLAINTEXT"},"endpoints":["PLAINTEXT://kafka1:9092"],"jmx_port":-1,"host":"kafka1","timestamp":"1553847899655","port":9092,"version":4}
cZxid = 0x100000042
ctime = Fri Mar 29 16:24:59 CST 2019
mZxid = 0x100000042
mtime = Fri Mar 29 16:24:59 CST 2019
pZxid = 0x100000042
cversion = 0
dataVersion = 0
aclVersion = 0
ephemeralOwner = 0x200025dc7770001
dataLength = 182
numChildren = 0
```

## 控制器
1. 控制器其实就是一个Broker，除了具备普通Broker的一般功能之外，还负责_**分区首领的选举**_
2. 集群里**第一个启动**的Broker通过在ZooKeeper里创建一个**临时节点**`/controller`让自己成为控制器
    - 其他Broker在启动时也会尝试创建这个临时节点，但会收到**节点已经存在**的异常
3. 其他Broker在`/controller`节点上创建`watch`对象，可以收到这个节点的变更通知
    - 可以确保集群里在某一时刻只有一个控制器存在
4. 如果控制器被关闭或者与ZooKeeper断开连接，ZooKeeper上的`/controller`节点就会消失
    - 集群里的其他Broker通过`watch`对象会得到控制器节点消失的通知，并尝试让自己成为新的控制器
    - 第一个在ZooKeeper里成功创建`/controller`节点的Broker就会成为新的控制器
    - 其他Broker会收到**节点已存在**的异常，然后在新的`/controller`节点上创建`watch`对象
    - 每个新选举出来的控制器通过ZooKeeper的**条件递增操作**获得一个**全新的且数值更大**的`controller epoch`
    - 其他Broker知道当前`controller epoch`后，如果收到包含**较旧**`epoch`的消息，会直接忽略
5. 当控制器发现一个普通Broker已经离开集群（观察ZooKeeper路径：`/brokers/ids`）
    - 那些**失去首领的分区**需要一个**新的分区首领**（这些分区的首领恰好是这个Broker）
    - 控制器遍历这些分区，并确定谁应该成为新首领（分区副本列表里的**下一个**副本）
    - 然后向所有**包含新分区首领的Broker**或者**现有跟随者的Broker**发送请求
        - 请求的内容包括：**谁是新的分区首领**，**谁是分区跟随者**
        - 随后**新的分区首领**开始**处理来自生产者和消费者的请求**
        - 而**跟随者**开始从**新的分区首领**那里**复制消息**
6. 当控制器发现一个新的Broker加入集群时，它会使用`Broker ID`来检查新加入的Broker是否包含**现有分区的副本**
    - 如果有，控制器就把变更通知发送给新加入的Broker和其他Broker
    - 新Broker上的副本开始从分区首领那里复制消息
7. 简而言之，Kakfa使用ZooKeeper的**临时节点**来选举控制器，并在Broker加入集群或者退出集群时通知控制器
    - 控制器负责在Broker加入或离开集群时进行_**分区首领选举**_
    - 控制器使用`epoch`来避免**脑裂**，脑裂指的是两个节点同时认为自己是当前的控制器

```
[zk: localhost:12181(CONNECTED) 10] get /controller
{"version":1,"brokerid":1,"timestamp":"1553847900310"}
cZxid = 0x100000046
ctime = Fri Mar 29 16:25:00 CST 2019
mZxid = 0x100000046
mtime = Fri Mar 29 16:25:00 CST 2019
pZxid = 0x100000046
cversion = 0
dataVersion = 0
aclVersion = 0
ephemeralOwner = 0x200025dc7770001
dataLength = 54
numChildren = 0
```

## 复制
1. 复制功能是Kafka架构的**核心**，在**个别节点**失效时仍能保证Kafka的**可用性**和**持久性**
2. Kafka使用**主题**来组织数据，每个主题被分为若干个**分区**，每个分区有多个**副本**（主题 -> 分区 -> 副本）
3. 每个Broker可以保存多个属于不同主题和不同分区的副本

### 副本类型

#### 首领副本
1. 每个分区都有一个**首领副本**
2. 为了保证**一致性**，所有**生产者请求**和**消费者请求**都会经过**首领副本**
3. 首领的另一个任务：弄清楚哪个**跟随者的状态**与自己的状态是一致的
4. 跟随者为了保持与首领的状态一致，在有新消息到达时尝试从首领那里**复制**消息，但也有可能同步失败
    - 例如网络拥塞导致变慢，Broker发生崩溃导致复制滞后，直到重启Broker后复制才会继续

#### 跟随者副本
1. 跟随者副本：**首领副本以外的副本**
2. 跟随者副本**不处理**来自客户端的请求
    - 唯一的任务：从**首领副本**那里**复制**消息，保持与首领副本**状态一致**
3. 如果首领副本发生崩溃，其中的一个跟随者副本就会被**晋升**为新的首领副本
4. 跟随者为了与首领保持同步，跟随者向首领发送**获取数据**的请求
    - 这种请求与**消费者为了读取消息而发送的请求**是一样的
    - 请求消息里面包含了跟随者想要获取消息的**偏移量**（偏移量总是**有序**的）
    - 首领将响应消息发送给跟随者
5. 一个跟随者依次请求消息1、消息2和消息3，在收到这3个请求的响应之前，跟随者是不会发送第4个请求
    - 如果跟随者请求了消息4，那么首领就会知道它已经收到了前面3个请求的响应
6. _**通过查看每个跟随者请求的最新偏移量，首领就会知道每个跟随者复制的进度**_
7. 跟随者会被首领认为**不同步**的情况
    - 跟随者在10S内**没有请求任何消息**（_**可能死亡**_）
    - 虽然跟随者在请求消息，但在10S内**没有请求到首领最新的数据**（_**滞后**_）
8. 同步的跟随者：_**持续请求得到的最新消息**_
    - 在首领发生失效时，只有同步的跟随者才有可能被选为**新首领**
9. `replica.lag.time.max.ms`：正常的跟随者允许的不活跃时间，默认10S

### 首选首领
1. 除了**当前首领**之外，每个分区都有一个_**首选首领**_
    - 首选首领：_创建主题时指定的首领_
2. 默认情况下，`auto.leader.rebalance.enable=true`
    - Kafka会检查首选首领是不是当前首领，如果不是并且该首选首领是**同步**的
    - 那么就会触发**首领选举**，让首选首领成为当前首领
3. 找到首选首领
    - 从分区的副本清单里可以很容易找到首选首领，清单里的**第一个**副本一般就是首选首领
        - 不管当前首领是哪一个副本，都不会改变这一事实
    - 如果是手动进行副本分配，第一个指定的副本就是首选首领，_**要确保首选首领被传播到其他Broker**_
        - 避免让包含了首选首领的Broker负载过重，而其他Broker却无法为它们分担负载

## 处理请求

### 概述
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/definitive-guide/kafka-handle-request-procedure.png" width=500/>

1. Broker的大部分工作就是处理**客户端、分区副本和控制器**发送给**分区首领**的请求
2. Kafka提供了一个**基于TCP的二进制协议**，指定了**请求消息的格式**以及Broker如何对请求做出响应
    - 客户端发起连接并发送请求，Broker处理请求并做出响应
3. Broker按照**请求到达的顺序**来处理它们
    - 这种顺序保证让Kafka具有了消息队列的特性，同时保证保存的消息也是有序的
4. 所有请求消息都包含一个**标准消息头**
    - `Request type`（即 API Key）
    - `Request version`（Broker可以处理不同版本的客户端请求，并依据客户端版本做出不同的响应）
    - `Correlation ID`一个具有**唯一性**的数字，用于**标识请求消息**，同时也会出现在响应消息和错误日志里
5. Broker会在它所监听的每一个端口上运行一个`Acceptor`线程
    - 这个线程会创建一个**连接**，并把它交给`Processor`线程去处理
    - `Processor`线程（网络线程）的数量是可配置的
    - 网络线程负责从客户端获取请求消息，把它们放进**请求队列**，然后从**响应队列**获取响应消息，把它们发送给客户端
6. 请求消息被放到请求队列后，IO线程会负责处理他们，主要的请求类型如下
    - **生产请求**：生产者发送的请求，它包含客户端要写入Broker的消息
    - **获取请求**：在**消费者**和**跟随者副本**需要从Broker读取消息时发送的请求
7. 生产请求和获取请求都必须发送给分区的**首领副本**
    - 如果Broker收到一个针对特定分区的请求，而该分区的首领副本在另一个Broker上
        - 那么发送请求的客户端会收到一个**非分区首领**的错误响应
    - 客户端要自己负责把**生产请求**和**获取请求**发送到正确的Broker上
        - 客户端通过发送**元数据请求**来确定分区的首领副本在哪个Broker上

### 生产请求
1.  生产者配置参数`acks`：指定了需要多少个Broker确认才可以认为一个消息的写入是成功的
    - `acks=1`：只要**分区首领**收到消息就认为写入成功
    - `acks=all`：需要**所有同步的副本**收到消息才算写入成功
    - `acks=0`：生产者把消息发出去之后，完全不需要等待Broker的响应
2. 包含首领副本的Broker在收到生产请求时，会做一些验证动作
    - 发送数据的用户是否有对主题的**写入权限**
    - 请求里包含的acks值是否有效（0、1或all）
    - 如果`acks=all`，判断是否有足够多的同步副本保证消息已经被安全写入
3. 随后，消息会被写入**本地磁盘**
    - 在`Linux`系统上，消息会被写到**文件系统缓存**里，并不保证它们何时会被刷新到磁盘上
    - Kafka不会一直等待数据被写到磁盘上（Kafka依赖**复制功能**来保证消息的**持久性**）
4. 在消息被**写入分区首领之后**，Broker开始检查`acks`的配置参数
    - 如果`acks`被设为0或者1，Broker立即返回响应
    - 如果`acks`被设为all，那么请求会被保存在一个叫做**炼狱**的**缓冲区**里
        - 直到分区首领发现**所有跟随者副本**都复制了消息，响应才会被返回给客户端

### 获取请求
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/definitive-guide/kafka-consume-min-size.png" width=600/>

1. 客户端发送获取请求，向Broker请求主题分区里具有**特定偏移量**的消息
2. 获取请求需要先到达指定的**分区首领**上，然后客户端通过**查询元数据**来确保请求的路由是正确的
3. 分区首领在收到获取请求时，分区首领首先会检查获取请求是否有效（例如指定的偏移量在分区上是否存在）
4. 如果请求的偏移量存在，Broker将按照**客户端指定的数量上限**从分区里读取消息，再把消息返回给客户端
5. 客户端除了可以设置Broker返回数据的上限外，还可以设置**下限**
    - 如果把下限设置为10KB，相当于告诉Broker：等到有10KB数据的时候再把他们发送给我
    - 在主题消息的流量不是很大的情况下，可以减少**CPU开销**和**网络开销**
    - Kafka也不会让客户端一直等待Broker积累数据
        - 客户端定义一个**超时时间**，告诉Broker：如果无法在X毫秒内积累满足要求的数据量，就把当前数据返回给我

#### 零复制
1. Kafka使用**零复制**技术向客户端发送消息
2. Kafka直接把消息从**Linux文件系统缓存**里发送到**网络通道**，而不需要经过任何中间缓冲区
    - 这是Kafka与其他大部分数据库系统不一样的地方
    - 其他数据库在将数据发送给客户端之前会先把它们保存在本地缓存里
4. 这项技术**避免了字节复制**，**不需要管理内存缓冲区**，从而获得**更好的性能**

#### 高水位
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/definitive-guide/kafka-consume-isr.png" width=600/>

1. 并不是所有保存在**分区首领**上的数据都可以被客户端读取
2. 分区首领知道每个消息会被复制到哪个副本上，_**在消息还没有被写入所有同步副本之前，是不会发送给消费者的**_
    - 尝试获取这些消息的请求会得到**空响应**而不是错误
3. 还没有被足够多的副本复制的消息被认为是**不安全**的
    - 如果分区首领发生崩溃，另一个跟随者副本成为新首领，那么有些消息就可能会_**丢失**_
    - 如果允许消费者读取这些消息，可能会_**破坏一致性**_
    - 一个消费者读取并处理了这样的一个消息，但另外一个消费者发现这个消息其实并不存在
    - 所以会等到**所有同步副本**复制了这些消息，才允许消费者读取它们
    - 这就意味着，如果Broker间的**消息复制**因为某些原因变慢了
        - 那么消息到达消费者的时间就会随之变长（因为需要先等待消息复制完毕）
    - 参数`replica.lag.time.max.ms`，默认值为10S
        - 指定了副本在复制消息时可被允许的最大延时时间
        - 如果超过了该时间，跟随者会被分区首领认为是**不同步**的，会被移出`ISR`
4. 消费者只能看到已经复制到`ISR`(in-sync replica)的消息

### 元数据请求
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/definitive-guide/kafka-client-route.png" width=500/>

1. 元数据请求包含了客户端感兴趣的**主题列表**
2. 服务端的响应消息包含：这些主题所包含的分区，每个分区都有哪些副本，以及哪个分区副本是首领
3. 元数据请求可以发送给任意一个Broker，因为所有的Broker都缓存了这些信息
4. 一般情况下，客户端会把这些信息缓存起来，并直接往目标Broker发送生产请求和获取请求
5. 客户端需要不定时通过元数据请求刷新这些信息，刷新间隔由参数`metadata.max.age.ms`（默认为5分钟）控制
6. 如果客户端收到**非分区首领**的错误，客户端会在尝试重新发送请求之前先刷新元数据

### 其他请求
1. 客户端在网络上使用的是**通用二进制协议**
    - Kakfa内置了Java客户端，但也有其他语言实现的客户端，如C，Python和Go
    - 这些客户端就是使用这个二进制协议与Broker通信的
2. Broker之间也使用同样的通信协议，它们之间的请求发生在Kafka内部，客户端不应该使用这些请求
    - 例如当一个新分区首领被选举出来，控制器会发送`LeaderAndIsr`请求给新分区首领和跟随者
    - 新分区首领：可以开始接收和处理来自客户端的请求
    - 跟随者：开始跟随新分区首领
3. 协议在持续演化
    - 随着客户端功能的不断增加，需要改进协议来满足需求
    - 修改已有请求类型来增加新功能

## 物理存储
1. Kafka的**基本存储单元**是**分区**
    - _**一个分区只能属于一个Broker**_
    - _**一个分区只能属于一个磁盘**_
2. 因此，分区的大小受到**单个挂载点可用空间**的限制，一个挂载点由单个磁盘或多个磁盘组成
3. 在配置Kafka时，`log.dirs`指定了一个用于存储分区的目录列表

### 分区分配

#### Broker间分配分区
1. 假设有6个Broker，打算创建一个包含10个分区的主题，并且复制系数为3，那么Kafka就会有30个分区副本
2. 在进行分区分配的时候，要达到如下目标
    - 在Broker间**平均分布**分区副本，保证每个Broker可以分到5个副本
    - **每个分区的每个副本分布到不同的Broker上**
        - 假设分区0的首领副本在Broker 2上
        - 那么可以把跟随者副本放在Broker 3和Broker 4上
        - 但不能放在Broker 2上，也不能两个都放在Broker 3上
    - 如果Broker指定了机架信息，那么尽可能把每个分区的副本分配到不同机架的Broker上
        - 保证在一个机架不可用时不会导致整体的分区不可用
3. 分配策略
    - 先**随机选择**一个Broker（假设是4），然后使用**轮询**的方式给每个Broker分配分区来确定**分区首领**的位置
        - 分区0的首领副本会在Broker 4，分区1的首领副本会在Broker 5，分区2的首领副本会在Broker 0，以此类推
    - 然后从分区首领开始，依次分配**跟随者副本**
        - 如果分区0的首领在Broker 4，那么它的第一个跟随者会在Broker 5，第二个跟随者会在Broker 0
        - 如果分区1的首领在Broker 5，那么它的第一个跟随者会在Broker 0，第二个跟随者会在Broker 1
    - 如果设置了机架信息，那就不是按照数字顺序来选择Broker，而是按照**交替机架**的方式来选择Broker
        - 假设Broker 0\~2放置在同一个机架上，Broker 3\~5放置在另一个机架上
        - 不是按照0\~5的顺序来选择Broker，而是按照0、3、1、4、2、5的顺序选择
        - 这样每个相邻的Broker都在不同的机架上
        - 在机架下线时依然能保证**可用性**

#### Broker内分配分区
1. 为分区首领和跟随者副本选好的Broker后，接下来需要决定这些分区使用哪个目录（`log.dirs`）
2. _**一个分区只能属于某一个目录**_
3. 规则：计算每个目录里的**分区数量**，新的分区总是被添加到**数量最少**的那个目录里

#### 小结
1. 在Broker间分配分区时并没有考虑**可用空间**和**工作负载**的问题
2. 在为分区分配到磁盘上时会考虑**分区数量**，但也不会考虑**分区大小**

### 文件管理
1. Kafka的一个基本特性：**保留数据**
2. Kafka不会一直保留数据，也不会等到所有消费者都读取消息之后才删除消息
3. Kafka为每个主题配置了数据保留期限
    - 数据被删除之前可以保留多长**时间**
    - 清理数据之前可以保留数据量的**大小**
4. 由于在一个大文件里查找和删除消息是很费时间的，也很容易出错，因此把分区分成若干个**片段**
    - 默认情况下，每个片段包含**1GB**或**一周**的数据，以**较小**的那个为准
    - 在Broker往分区写入数据时，如果达到片段上限，就关闭当前文件，并打开一个新文件
    - 当前**正在写入数据的片段**叫作**活跃片段**，_**活跃片段永远不会被删除**_
        - 如果你要保留1天数据，但活跃片段里包含5天的数据，那么这些数据会被保留5天
        - 因为在片段被关闭之前这些数据是无法被删除的
5. Broker会为分区里的**每个片段**打开一个**文件句柄**，哪怕片段时不活跃的
    - 这样会导致打开过多的文件句柄，操作系统必须根据实际情况做一些调优

### 文件格式
1. Kafka的**消息**和**偏移量**保存在文件中
2. _**磁盘上的数据格式 == 生产者发送过来的消息格式 == 发送给消费者的消息格式**_
    - Kafka可以使用**零复制**技术给消费者发送消息
    - 避免了对生产者已经压缩过的消息进行**解压**和**再压缩**
3. 消息里还包含了**消息大小**、**校验和**、**消息格式版本号**、**压缩算法**（`Snappy`、`GZip`和`LZ4`）和**时间戳**
    - 时间戳可以是生产者发送消息的时间，也可以是消息到达Broker的时间，可配置的
4. 可以用`DumpLogSegments`工具来查看日志片段的内容

```
$ kafka-run-class kafka.tools.DumpLogSegments --files 00000000000000000000.log
Dumping 00000000000000000000.log
Starting offset: 0
baseOffset: 0 lastOffset: 0 count: 1 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 0 CreateTime: 1553172809994 isvalid: true size: 98 magic: 2 compresscodec: NONE crc: 898077232
baseOffset: 1 lastOffset: 2 count: 2 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 98 CreateTime: 1553172813953 isvalid: true size: 76 magic: 2 compresscodec: NONE crc: 4107488416
baseOffset: 3 lastOffset: 3 count: 1 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 174 CreateTime: 1553172817170 isvalid: true size: 79 magic: 2 compresscodec: NONE crc: 1335719899
baseOffset: 4 lastOffset: 4 count: 1 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 253 CreateTime: 1553172846668 isvalid: true size: 69 magic: 2 compresscodec: NONE crc: 4157562046
baseOffset: 5 lastOffset: 5 count: 1 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 322 CreateTime: 1553172857356 isvalid: true size: 79 magic: 2 compresscodec: NONE crc: 3694331330
baseOffset: 6 lastOffset: 6 count: 1 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 401 CreateTime: 1553219688039 isvalid: true size: 73 magic: 2 compresscodec: NONE crc: 3459522042
baseOffset: 7 lastOffset: 7 count: 1 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 474 CreateTime: 1553219691963 isvalid: true size: 80 magic: 2 compresscodec: NONE crc: 2634324074
baseOffset: 8 lastOffset: 8 count: 1 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 554 CreateTime: 1553219762539 isvalid: true size: 71 magic: 2 compresscodec: NONE crc: 950257936
baseOffset: 9 lastOffset: 9 count: 1 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 625 CreateTime: 1553429752873 isvalid: true size: 92 magic: 2 compresscodec: NONE crc: 1719404601
baseOffset: 10 lastOffset: 10 count: 1 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 717 CreateTime: 1553435686204 isvalid: true size: 92 magic: 2 compresscodec: NONE crc: 1667790229
baseOffset: 11 lastOffset: 11 count: 1 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 809 CreateTime: 1553435686355 isvalid: true size: 92 magic: 2 compresscodec: NONE crc: 1615137336
```

#### 消息压缩
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/definitive-guide/kafka-compressed-message.png" width=800/>

1. 如果生产者发送的是**压缩过**的消息，那么**同一批次**的消息会被压缩在一起，然后被当做**包装消息**进行发送
    - Broker收到这样的消息后，会直接把它发送给消费者
2. 消费者在解压这个消息后，会看到**整个批次**的消息，它们都有自己的时间戳和偏移量
3. 如果**生产者**使用了**压缩功能**（**极力推荐**）
    - _**如果发送的批次越大，那么在网络传输和磁盘存储方面会获得越好的压缩性能**_
    - 同时意味着如果修改了消费者使用的消息格式，那么网络传输和磁盘存储的格式也要随之修改
        - 而且Broker要知道如何处理包含这两种消息格式的文件

### 索引
1. 消费者可以从Kafka的**任意可用偏移量位置**开始读取消息
2. 假设消费者要读取从偏移量100开始的1MB消息
    - 那么Broker必须**立即定位**到偏移量100（可以是分区的任意一个片段），然后从这个位置读取消息
3. 为了帮助Broker**快速地定位**到指定的偏移量，_**Kafka为每个分区维护了一个索引**_
    - _**索引结构：偏移量 -> 日志片段名（file） + 偏移量在日志片段中的位置（pos）**_
4. 索引也被分成**片段**，在**删除消息**时，也可以**删除相应的索引**
5. **Kafka不维护索引的校验和**
    - 如果索引出现损坏，Kafka会通过**重新读取消息并生成索引**，因此**删除索引**是**绝对安全**的

### 清理
1. 一般情况下，Kafka会根据设置的时间保留数据，把超过时效的旧数据删除
2. 早于保留时间的旧事件会被删除，**为每个键保留最新的值**，从而达到清理的效果

#### 工作原理
1. 每个日志片段都可以分为以下两部分
    - **干净的部分**：这些消息之前被清理过，**每个键只有一个对应的值**，这个值是上一次清理时保留下来的
    - **污浊的部分**：这些消息是在上一次清理**之后**写入的
2. 如果Kafka在启动时启用了清理功能（`log.cleaner.enable=true`）
    - 每个Broker会启动**一个清理管理线程**和**多个清理线程**，它们负责执行清理任务
    - 这些线程会优先选择**污浊率较高**（污浊消息占分区总大小的比例）的分区进行清理
3. 为了清理分区，清理线程会读取分区的**污浊部分**，并在内存里创建一个**map**
    - map里的每个元素包含了**消息键的散列值**和**消息的偏移量**，即`<hash(key),offset>`
    - 消息键的散列值为**16 Bytes**，消息的偏移量为**8 Bytes**
    - 如果要清理一个1GB的日志片段，并假设每个消息为1KB，那么这个日志片段包含100W个消息
        - 但最多只需要24MB就可以清理这个片段（在键的散列值不重复的情况）
4. 在配置Kafka时可以对map使用的内存大小进行配置
    - 每个清理线程都有自己的map，而上面的这个参数指定的是**所有清理线程**可使用的内存总大小
    - 如果为map分配了1GB的内存，并使用5个清理线程，每个线程可以使用200MB内存来创建自己的map
5. Kafka不要求分区的整个污浊部分来适应这个map的大小，但要求**至少一个完整的日志片段**必须符合
    - 如果不符合，那么Kafka就会报错，要么分配更多的内存，要么减少清理线程的数量
6. 如果只有少部分片段完全符合，Kafka将从**最旧**的片段开始清理，等待下一次再清理剩余的部分

<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/definitive-guide/kafka-clean-log-before-after.png" width=400/>


#### 删除事件
1. 为了**彻底**把一个键从系统里删除，客户端必须发送一个包含该键且**值为null**的消息
2. 清理线程发现该消息时，会先进行常规的清理，只保留值为null的消息
3. 该消息（**墓碑消息**）会被保留一段时间（可配置）
    - 在这期间，消费者可以看到这个墓碑消息，并且发现它的值已经被删除了
    - 这段时间过后，清理线程会移除这个墓碑信息，这个键也将从Kafka分区里消失
    - 重要的是要留给消费者足够多的时间，让它们能够看到墓碑消息

<!-- indicate-the-source -->
