---
title: Kafka --  控制器
mathjax: false
date: 2019-09-18 18:22:52
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

## 控制器
1. **控制器**（Controller）是Kafka的**核心组件**，主要作用是在**ZK**的帮助下**管理和协调整个Kafka集群**
2. 集群中**任一**Broker都能充当控制器的角色，但在运行过程中，**只能有一个Broker成为控制器**，行使管理和协调的职责

```
[zk: localhost:2181(CONNECTED) 1] get /controller
{"version":1,"brokerid":0,"timestamp":"1571311742367"}
cZxid = 0xd68
ctime = Thu Oct 17 19:29:02 CST 2019
mZxid = 0xd68
mtime = Thu Oct 17 19:29:02 CST 2019
pZxid = 0xd68
cversion = 0
dataVersion = 0
aclVersion = 0
ephemeralOwner = 0x1000209974b0000
dataLength = 54
numChildren = 0
```

<!-- more -->

## Zookeeper
1. Kafka控制器**重度依赖**ZK
2. ZK是一个提供**高可靠性的分布式协调服务**框架
3. ZK使用类似于**文件系统**的树形结构，**根目录**以`/`开始，结构上的每个节点称为**znode**，用来保存一些**元数据协调信息**
4. 如果以znode的**持久性**来划分，znode可以分为**持久性znode**和**临时znode**
    - 持久性znode不会因为ZK集群重启而消失
    - 临时znode则会**与创建该znode的ZK会话绑定**，一旦**会话结束**，该节点会被**自动删除**
5. ZK赋予客户端**监控znode变更**的能力，即所谓的**Watch通知**功能
    - 一旦znode节点被**创建**、**删除**、**子节点数量发生变化**，**znode所存的数据本身发生变更**
    - ZK会通过节点变更监听器（**ChangeHandler**）的方式**显式通知**客户端
6. ZK被用来实现**集群成员管理**、**分布式锁**、**领导者选举**等功能，**Kafka控制器**大量使用**Watch**功能实现**对集群的协调管理**

kafka在ZK中创建的znode
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-controller-znode.png" width=1000/>

## `/controller`节点
1. Broker在启动时，会尝试去ZK创建`/controller`节点
2. **第一个**成功创建`/controller`节点的Broker会被指定为为**控制器**

## 控制器的职责
1. **主题管理**
    - 完成对Kafka主题的**创建**、**删除**以及**分区增加**的操作
    - 执行`kafka-topics`时，大部分的后台工作都是由控制器完成的
2. **分区重分配**
    - 分区重分配主要是指`kafka-reassign-partitions`脚本提供的**对已有主题分区进行细粒度的分配功能**
3. **Preferred领导者选举**
    - Preferred领导者选举主要是Kafka为了**避免部分Broker负载过重**而提供的一种**换Leader**的方案
4. **集群成员管理**
    - 自动检测**新增Broker**、**Broker主动关闭**、**Broker宕机**
    - 自动检测依赖于**Watch**功能和**ZK临时节点**组合实现的
        - 控制器会利用Watch机制检查ZK的`/brokers/ids`节点下的**子节点数量变更**
        - 当有新Broker启动后，它会在`/brokers/ids/`下创建专属的**临时znode节点**
            - 一旦创建完毕，ZK会通过Watch机制将消息通知**推送**给**控制器**，控制器能够自动感知这个变化
        - 当Broker**宕机**或者**主动关闭**后，该Broker与ZK的**会话结束**，这个znode会被**自动删除**
            - ZK的Watch机制会将这一变更**推送**给**控制器**
5. **数据服务**
    - 向**其它Broker**提供数据服务，控制器上保存了**最全的集群元数据信息**
    - 其它Broker会**定期**接收**控制器**发来的**元数据更新请求**，从而更新其**内存**中的缓存数据

## 控制器保存的数据
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-controller-data.png" width=1000/>

1. 所有**主题信息**，包括具体的分区信息、比如领导者副本是谁，ISR集合有哪些副本
2. 所有**Broker信息**，包括哪些运行中的Broker，哪些正在关闭的Broker
3. 所有**涉及运维任务的分区**，包括当前正在进行**Preferred领导者选举**以及**分区重分配**的分区列表
4. 上述这些数据在**ZK**中也保存了一份，每当控制器**初始化**时，都会从ZK上读取对应的元数据并填充到自己的**缓存**中
    - 有了这些数据，控制器就能对**其它Broker**提供数据服务了
    - 控制器通过向其它Broker**发送请求**的方式将这些数据**同步**到其它Broker上

## 控制器故障转移
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-controller-failover.jpg" width=1000/>

1. 故障转移
    - 当运行中的控制器突然**宕机**或者**意外终止**时，Kafka能**快速感知**并立即启用备用控制器来**代替**之前失败的控制器
    - 该过程称为**FailOver**，该过程是**自动完成**的
2. 一开始，Broker 0是控制器，当Broker 0宕机后，ZK通过Watch机制感知到并**删除了`/controller`临时节点**
3. 然后，所有**存活的Broker**开始竞选新的控制器，Broker 3最终赢得了选举，成功地在ZK上重建了`/controller`临时节点
4. 之后，Broker 3会**从ZK中读取集群元数据信息**，并**初始化到自己的缓存**中，至此控制器的FailOver完成

## 控制器内部设计原理
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-controller-design.png" width=1000/>

1. 在Kafka 0.11之前，控制器的设计是相当繁琐的，导致很多Bug无法修复
2. 控制器是**多线程**的设计，会在内部创建很多个线程
    - 控制器需要为每个Broker都创建一个对应的**Socket连接**，然后再创建一个**专属的线程**，用于向这些Broker发送请求
    - 控制器连接ZK的会话，也会创建**单独的线程**来处理**Watch机制的通知回调**
    - 控制器还会为**主题删除**创建额外的**IO线程**
3. 这些线程还会访问**共享**的控制器缓存数据，**多线程**访问**共享可变数据**是维持线程安全的最大难题
    - 为了保护**数据安全性**，控制器在代码中大量使用**ReentrantLock**同步机制，进一步**拖慢**整个控制器的**处理速度**
4. 社区在0.11版本**重构了控制器的底层设计**，把多线程的方案改成了**单线程+事件队列**的方案
    - 引进了**事件处理器**，统一处理各种**控制器事件**
    - 控制器将原来执行的操作全部建模成**独立的事件**，发送到专属的**事件队列**中，供事件处理器消费
    - 单线程：控制器只是把**缓存状态变更方面的工作**委托给了这个线程而已
    - 优点：控制器缓存中保存的状态只被一个线程处理，因此不需要**重量级的线程同步机制**来维护线程安全
5. 针对控制器的第二个改进：将之前同步操作ZK全部换成**异步操作**
    - ZK本身的API提供了**同步写**和**异步写**两种方式
    - 之前控制器操作ZK时使用的是**同步API**，**性能很差**
        - **当有大量主题分区发生变更时，ZK容易成为系统的瓶颈**
6. Kafka从2.2开始，将**控制器发送的请求**和**普通数据类的请求**分开，实现控制器请求**单独处理**的逻辑
    - 之前Broker对接收到的所有请求都**一视同仁**，不会区别对待
    - 如果删除了某个主题，那么控制器会给主题的所有副本所在的Broker发送StopReplica请求
    - 如果此时Broker上有大量Produce请求堆积，那么StopReplica请求只能**排队**
    - 既然主题都要被删除了，继续处理Produce请求就显得很没有意义

## 参考资料
[Kafka核心技术与实战](https://time.geekbang.org/column/intro/100029201)
