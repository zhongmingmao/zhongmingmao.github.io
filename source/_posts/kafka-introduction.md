---
title: Kafka读书笔记 -- 初识Kafka
date: 2018-10-05 23:29:21
categories:
  - Kafka
tags:
  - Kafka
---

## 相关概念
1. Kafka一般被称为『分布式提交日志』或者『分布式流平台』
2. 文件系统或数据库提交日志用来提供所有事务的持久记录，通过重放这些日志可以重建系统的状态
  - Kafka的数据是按照一定顺序持久化保存的，可以按需读取
3. Kafka的数据分布在整个系统里，具备数据故障保护和性能伸缩能力

<!-- more -->

### 消息和批次
1. Kafka的数据单元被称为消息
2. 消息由**字节数组**组成，消息里的数据没有特别的格式或者含义
3. 消息可以有一个可选的**元数据**，就是键，键也是一个**字节数组**，同样没有特殊含义
  - 消息以**一种可控的方式写入不同的分区**时，会用到键
  - 例如为键生成一个一致性散列值，然后使用散列值对主题分区数进行取模，为消息选取分区，从而保证具有相同键的消息总是被写入到相同的分区
4. 为了提高效率，消息被**分批**写入Kafka，**批次就是一组消息**，这些消息**属于同一个主题和分区**
  - 如果每个消息都单独穿行于网络，会导致大量的网络开销，把消息分成批次传输可以减少网络开销
  - 不过，这需要在**时间延迟**和**吞吐量**之间做出权衡：批次越大，单位时间内处理的消息就会越多，耽搁消息的传输时间就会越长
  - 批次数据会被**压缩**，这样可以提升数据的传输和存储能力，但要做更多的计算处理

### 模式
1. 对于Kafka来说，消息不过是晦涩难懂的字节数组
2. 依据应用程序的需求，**消息模式** 有许多可用的选项
3. 像JSON和XML这些简单的系统，不仅易用，而且可读性好；但是**缺乏强类型的处理能力**，不同版本之间的**兼容性也不好**
4. Kafka的许多开发者喜欢使用**Apache Avro**，它最初是为了Hadoop开发的一款序列化框架
  - Avro提供了一种**紧凑的序列化格式**，**模式和消息体是分开的，当模式发生变化时，不需要重新生成代码**
  - Avro还支持**强类型**和**模式进化**，其版本既向前兼容，也向后兼容
5. **数据格式的一致性**对于Kafka来说很重要，它**消除了消息读写操作之间的耦合性**
  - 如果读写操作紧密地耦合在一起，消息订阅者需要升级应用程序才能同时处理新旧两种数据格式
  - 在消息订阅者升级之后，消息发布者才能跟着升级，以便使用新的数据格式
  - 新的应用程序如果需要使用数据，就要和消息发布者发生耦合，导致开发者需要做很多繁杂的工作
6. 定义良好的格式，并把它们存放在**公共仓库**，可以方便我们理解**Kafka的消息结构**

### 主题和分区
1. Kafka的消息通过**主题**进行分类，主题类似于数据库的表，或者文件系统里的文件夹
2. **主题可以被分为若干个分区，一个分区就是一个提交日志**
3. 消息以**追加**的方式写入分区，然后以**FIFO**的顺序读取
4. 由于一个主题一般包含几个分区，因此**无法在整个主题范围内保证消息的顺序**，但可以保证消息在单个分区内的顺序
5. Kafka通过分区来实现**数据冗余**和**伸缩性**
  - **分区可以分布在不同的服务器上，因此一个主题可以横跨多个服务器**
6. 很多时候，会把一个**主题的数据**看成一个**流**，不管它有多少个分区
  - **流是一组从生产者移动到消费者的数据**

![topic.png](http://pg67n0yz6.bkt.clouddn.com/topic.png?imageView2/2/w/500)

### 生产者和消费者
1. 生产者**创建消息**
  - 一般情况下，一个消息会被发布到特定的主题上
  - 默认情况下，**生产者把消息均匀地分布到主题的所有分区上**，而并不关心特定消息会被写到哪个分区
  - 在特定情况下，生产者会把消息直接写到指定的分区，这通常听过**消息键**和**分区器**来实现的
    - 分区器为键生成一个散列值，并将其映射（例如取模）到指定的分区上
    - 这样可以保证包含同一个键的消息会被写到同一个分区上
2. 消费者**读取消息**
  - 消费者**订阅一个或多个主题**，并**按照消息生成的顺序读取**它们
  - 消费者通过检查消息的**偏移量**来区分已经读取过的消息
    - 偏移量是另一种**元数据**，它是一个**不断递增**的整数值，**在创建消息时，Kafka会把偏移量添加到消息里**
    - **在给定的分区里，每个消息的偏移量都是唯一的**
    - 消费者把**每个分区最后读取的消息偏移量**保存在Zookeeper或Kafka上，如果消费者关闭或重启，它的读取状态不会丢失
  - 消费者是**消费者群组**的一部分，会有一个或者多个消费者共同读取一个主题
    - **群组保证每个分区只能被一个消费者使用**
    - 消费者与分区之间的映射通常被称为**『消费者对分区的所有权关系』**
    - 如果一个消费者失效，群组里的其它消费者可以接管失效消费者的工作

![consumer.png](http://pg67n0yz6.bkt.clouddn.com/consumer.png?imageView2/2/w/500)

### Broker和集群
1. 一个**独立的Kafka服务器**被称为**Broker**
2. Broker接收来自生产者的消息，**为消息设置偏移量，并提交消息到磁盘保存**
3. Broker为消费者提供服务，对**读取分区的请求**作出响应，返回已经提交到磁盘上的消息
4. Broker是集群的组成部分，每个集群都有一个Broker同时充当**集群控制器**的角色（自动从集群的活跃成员中选举出来）
  - 控制器负责管理工作：**将分区分配给Broker**+**监控Broker**
5. 在集群中，**一个分区从属于一个Broker**，该Broker被称为**分区的首领**
  - **一个分区可以分配给多个Broker，这个时候就会发生分区复制**
  - 这种复制机制为分区提供了**消息冗余**
6. 如果有一个Broker失效，其它Broker可以接管领导权，相关的消费者和生产者都需要**重新连接**到新的首领

![partition_replication.png](http://pg67n0yz6.bkt.clouddn.com/partition_replication.png?imageView2/2/w/600)

#### 保留消息
1. 保留消息是Kafka的一个重要特性
2. 默认的消息保留策略
  - 要么保留**一段时间**，要么保留到消息达到**一定大小的字节数**
  - 当消息数量达到这些上限时，旧消息就会过期并被删除
3. **主题** 可以配置自己的保留策略，可以将消息保留到不再使用它们为止

### 多集群
1. 使用多集群的原因
  - 数据类型分离
  - 安全需求隔离
  - 多数据中心（灾难恢复）
2. **Kafka的消息复制机制只能在单个集群里进行**，不能在多个集群之间进行
  - Kafka提供了一个叫作**MirrorMaker**的工具，可以用它来**实现集群间的消息复制**
  - MirrorMaker的核心组件包含一个**生产者**和一个**消费者**，两者之间**通过一个队列相连**
  - **消费者从一个集群读取消息，生产者把消息发送到另一个集群上**

![multi_data_center.png](http://pg67n0yz6.bkt.clouddn.com/multi_data_center.png?imageView2/2/w/600)

## 选择Kafka的原因
1. **多个生产者**
  - Kafka可以无缝地支持多个生产者，不管客户端在使用单个主题还是多个主题
  - 非常适合用来从多个前端系统收集数据，并以**统一的格式**对外提供数据
2. **多个消费者**。
  - Kafka也支持**多个消费者**从**单独的消息流**上读取数据，而且**消费者之间互不影响**
  - **其它队列系统的消息一旦被一个客户端读取，其它客户端旧无法再读取它**（例如RabbitMQ）
  - 多个消费者可以组成一个**群组**，它们**共享一个消息流**，并保证**整个群组对每个给定的消息只处理一次**
3. 基于**磁盘**的数据存储
  - Kafka支持消费者**非实时**地读取消息，这归功于Kafka的数据保留策略
  - 消息被提交到磁盘，依据设置的保留规则进行保存
  - 每个**主题**可以设置单独的保留策略
  - 消费者可能会因为处理速度慢或突发的流量高峰导致无法及时读取消息，而**持久化数据可以保证数据不会丢失**
  - 消费者可以被关闭，但消息会继续保留再Kafka里，消费者可以从上次中断的地方继续处理消息
4. 伸缩性
  - 为了能够轻松处理大量数据，Kafka从一开始就被设计成一个具有**灵活伸缩性**的系统
5. 高性能
  - 通过横向扩展生产者、消费者和Broker，Kafka可以轻松处理巨大的信息流
  - 在处理大量数据的同时，它还能保证**亚秒级**的消息延迟

<!-- indicate-the-source -->