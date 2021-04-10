---
title: Kafka -- Java消费者管理TCP连接
mathjax: false
date: 2019-09-10 10:03:46
categories:
    - Middleware
    - MQ
    - Kafka
tags:
    - Middleware
    - MQ
    - Kafka
    - Stream
    - TCP
---

## 创建TCP连接
1. 消费者端的主要程序入口是KafkaConsumer，但**构建KafkaConsumer实例不会创建任何TCP连接**
    - 构建**KafkaProducer**实例时，会在后台默默地启动一个**Sender**线程，Sender线程负责**Socket**连接的创建
    - 在Java构造函数中启动线程，会造成**this指针逃逸**，是一个**隐患**
2. 消费者的TCP连接是在调用**`KafkaConsumer.poll`**方法时被创建的，poll方法内部有3个时机可以创建TCP连接

<!-- more -->

### 发起FindCoordinator请求时
1. 消费者组有个组件叫作**协调者**（Coordinator）
    - 驻留在**Broker**端的内存中，负责消费者组的**组成员管理**和各个消费者的**位移提交管理**
2. 当消费者程序**首次**启动调用poll方法时，需要向**Kafka集群**（集群中的**任意**Broker）发送FindCoordinator请求
    - 社区优化：消费者程序会向集群中**当前负载最小**的那台Broker发送请求
    - **单向**负载评估（**非最优解**）：消费者连接的所有Broker中，谁的**待发送**请求最少，谁的负载就越小

### 连接Coordinator时
1. Broker处理完FindCoordinator请求后，会返回对应的响应结果，显式地告诉消费者哪个Broker是**真正的Coordinator**
2. 消费者向真正的Coordinator所在的Broker发起Socket连接
3. 成功接入Coordinator后，Coordinator开启**组协调**操作（加入组、等待组分配、心跳请求处理、位移获取和提交）

### 消费数据时
1. 消费者会为每个要消费的分区创建与该分区**领导者副本**所在Broker的Socket连接
2. 假设消费者要消费5个分区的数据，这5个分区各自的领导者副本分布在4台Broker上
    - 那么消费者在消费时会创建与这4台Broker的Socket连接

## TCP连接数

### 日志详解
>[2019-05-27 10:00:54,142] DEBUG [Consumer clientId=consumer-1, groupId=test] **Initiating connection to node localhost:9092** (**id: -1** rack: null) using address localhost/127.0.0.1 (org.apache.kafka.clients.NetworkClient:944)

消费者程序创建的**第一个TCP连接**，该Socket用于发送**FindCoordinator**请求
此时消费者对要连接的Kafka集群**一无所知**，因此它连接的Broker节点的ID为**-1**，表示不知道要连接的Broker的任何信息

---

>[2019-05-27 10:00:54,188] DEBUG [Consumer clientId=consumer-1, groupId=test] **Sending metadata request** MetadataRequestData(topics=[MetadataRequestTopic(name='t4')], allowAutoTopicCreation=true, includeClusterAuthorizedOperations=false, includeTopicAuthorizedOperations=false) to node localhost:9092 (id: -1 rack: null) (org.apache.kafka.clients.NetworkClient:1097)

消费者**复用**刚刚创建的Socket连接，向Kafka集群发送**元数据请求**以获取**整个集群的信息**

---

>[2019-05-27 10:00:54,188] TRACE [Consumer clientId=consumer-1, groupId=test] **Sending FIND_COORDINATOR** {key=test,key_type=0} with correlation id 0 to **node -1** (org.apache.kafka.clients.NetworkClient:496)

消费者程序开始发送**FindCoordinator**请求给第一步中连接的Broker，即**localhost:9092**（nodeId为**-1**）

---

>[2019-05-27 10:00:54,203] TRACE [Consumer clientId=consumer-1, groupId=test] **Completed receive from node -1 for FIND_COORDINATOR** with correlation id 0, received {throttle_time_ms=0,error_code=0,error_message=null, **node_id=2,host=localhost,port=9094**} (org.apache.kafka.clients.NetworkClient:837)

十几毫秒后，消费者程序成功地获悉**Coordinator所在的Broker**，即**node_id=2,host=localhost,port=9094**

---

>[2019-05-27 10:00:54,204] DEBUG [Consumer clientId=consumer-1, groupId=test] **Initiating connection to node localhost:9094** (**id: 2147483645** rack: null) using address localhost/127.0.0.1 (org.apache.kafka.clients.NetworkClient:944)

消费者此时已经知道**协调者Broker的连接信息**了，发起第二个Socket连接，创建连向**localhost:9094**的TCP连接
只有连接了Coordinator，消费者才能正常地开启**消费组的各种功能**以及**后续的消息消费**
此时的id是由`Integer.MAX_VALUE`减去**Coordinator所在的Broker的Id**计算出来的，即`2147483647 - 2 = 2147483645`
这种节点ID的标记方式是Kafka社区**特意为之**，目的是要让**组协调请求**和**真正的数据获取请求**使用_**不同的Socket连接**_

---

>[2019-05-27 10:00:54,237] DEBUG [Consumer clientId=consumer-1, groupId=test] **Initiating connection to node localhost:9094** (**id: 2** rack: null) using address localhost/127.0.0.1 (org.apache.kafka.clients.NetworkClient:944)

>[2019-05-27 10:00:54,237] DEBUG [Consumer clientId=consumer-1, groupId=test] **Initiating connection to node localhost:9092** (**id: 0** rack: null) using address localhost/127.0.0.1 (org.apache.kafka.clients.NetworkClient:944)

>[2019-05-27 10:00:54,238] DEBUG [Consumer clientId=consumer-1, groupId=test] **Initiating connection to node localhost:9093** (**id: 1** rack: null) using address localhost/127.0.0.1 (org.apache.kafka.clients.NetworkClient:944)

消费者又分别创建了**新的TCP连接**，主要用于**实际的消息获取**

### 3类TCP连接
1. **确定协调者**和**获取集群元数据**
2. **连接协调者**，令其执行组成员管理操作
3. 执行**实际的消息获取**

## 关闭TCP连接
1. 与生产者类似，消费者关闭Socket分为**主动关闭**和**Kafka自动关闭**
    - **主动关闭**
        - 手动调用**KafkaConsumer.close**或者执行**kill**（-2/-9）命令
    - **自动关闭**
        - 消费端参数**`connection.max.idle.ms`**，默认是**9分钟**
        - 如果使用**循环**的方式来调用**poll**方法来消费消息，上面的**所有请求**都会**定期**发送到Broker，达到**长连接**的效果
2. 当**第三类TCP连接成功创建**后，消费者程序就会**废弃第一类TCP连接**，之后**定期请求元数据**，会改用第三类TCP连接
    - 第一类TCP连接会在后台被默默关闭，运行一段时间的消费者只会有后面两类TCP连接存在

## 参考资料
[Kafka核心技术与实战](https://time.geekbang.org/column/intro/100029201)