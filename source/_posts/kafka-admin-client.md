---
title: Kafka -- KafkaAdminClient
mathjax: false
date: 2019-09-28 09:15:51
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

## 背景
1. 命令行脚本只能运行在控制台上，在应用程序、运维框架或者监控平台中集成它们，会非常困难
2. 很多命令行脚本都是通过连接**ZK**来提供服务的，这会存在潜在的问题，即绕过Kafka的安全设置
3. 运行这些命令行脚本需要使用Kafka内部的类实现，也就是Kafka**服务端**的代码
    - 社区是希望用户使用Kafka**客户端**代码，通过**现有的请求机制**来运维管理集群
4. 基于上述原因，社区于**0.11**版本正式推出**Java客户端版的KafkaAdminClient**

<!-- more -->

## 功能
1. **主题管理**
    - 主题的创建、删除、查询
2. **权限管理**
    - 具体权限的配置和删除
3. **配置参数管理**
    - Kafka各种资源（Broker、主题、用户、Client-Id等）的参数设置、查询
4. **副本日志管理**
    - 副本底层日志路径的变更和详情查询
5. **分区管理**
    - 创建额外的主题分区
6. **消息删除**
    - 删除指定位移之前的分区消息
7. **Delegation Token管理**
    - Delegation Token的创建、更新、过期、查询
8. **消费者组管理**
    - 消费者组的查询、位移查询和删除
9. **Preferred领导者选举**
    - 推选指定主题分区的Preferred Broker为领导者

## 工作原理
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-admin-client.png" width=1000/>

1. KafkaAdminClient是**双线程**设计
    - **前端主线程**
        - 负责将用户要执行的**操作**转换成对应的**请求**，然后将请求发送到后端IO线程的队列中
    - **后端IO线程**
        - 从队列中读取相应的请求，再发送到对应的Broker节点上，之后把执行结果保存起来，等待前端线程的获取
2. KafkaAdminClient在内部大量使用**生产者-消费者**模式将请求生成和处理解耦
3. 前端主线程会创建名为**Call**的请求对象实例，该实例有两个主要任务
    - **构建对应的请求对象**
        - 创建主题：CreateTopicsRequest
        - 查询消费者组位移：OffsetFetchRequest
    - **指定响应的回调逻辑**
        - 比如从Broker端接收到CreateTopicsResponse之后要执行的动作
4. 后端IO线程使用了3个队列来承载不同时期的请求对象，分别为**新请求队列**、**待发送请求队列**和**处理中请求队列**
    - 原因：**新请求队列的线程安全**是由Java的**Monitor锁**来保证的
        - 为了保证前端线程不会因为Monitor锁被**阻塞**，后端IO线程会**定期**地将**新请求队列**中的**所有Call实例**全部搬移到**待发送请求队列**中进行处理
    - **待发送请求队列**和**处理中请求队列**只由**后端IO线程**处理，因为**无需任何锁机制来保证线程安全**
    - 当后端IO线程在处理某个请求时，会**显式**地将请求保存在**处理中请求队列**
        - 一旦**处理完毕**，后端IO线程会自动调用Call对象中的**回调逻辑**完成最后的处理
    - 最后，后端IO线程会通知前端主线程说结果已经准备完毕，这样前端主线程就能够及时获取到执行操作的结果
        - KafkaAdminClient是使用了Object的**wait**和**notify**来实现**通知**机制
    - KafkaAdminClient并没有使用Java已有的队列去实现请求队列
        - 而是使用**ArrayList**和**HashMap**等简单容器，再配合**Monitor锁**来保证线程安全
    - 后端线程名称：**`kafka-admin-client-thread`**，可以用**`jstack`**去确认程序是否正常工作
        - 后端IO线程可能由于**未捕获某些异常**而意外挂掉

## 应用场景

### 创建主题
```java
Properties props = new Properties();
props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
props.put("request.timeout.ms", 600000);
String newTopicName = "test-topic";
try (AdminClient client = AdminClient.create(props)) {
    NewTopic newTopic = new NewTopic(newTopicName, 10, (short) 1);
    CreateTopicsResult result = client.createTopics(Collections.singletonList(newTopic));
    result.all().get(10, TimeUnit.SECONDS);
}
```

### 查询消费者组位移
```java
String groupId = "zhongmingmao";
try (AdminClient client = AdminClient.create(props)) {
    ListConsumerGroupOffsetsResult result = client.listConsumerGroupOffsets(groupId);
    Map<TopicPartition, OffsetAndMetadata> offsets = result.partitionsToOffsetAndMetadata().get(10, TimeUnit.SECONDS);
    System.out.println(offsets);
}
```

### 获取Broker磁盘占用
```java
try (AdminClient client = AdminClient.create(props)) {
    // 获取指定Broker上所有分区主题的日志路径信息
    DescribeLogDirsResult ret = client.describeLogDirs(Collections.singletonList(0)); // 指定Broker id
    long size = 0L;
    for (Map<String, DescribeLogDirsResponse.LogDirInfo> logDirInfoMap : ret.all().get().values()) {
        size += logDirInfoMap.values().stream().map(logDirInfo -> logDirInfo.replicaInfos).flatMap(
                topicPartitionReplicaInfoMap ->
                        topicPartitionReplicaInfoMap.values().stream().map(replicaInfo -> replicaInfo.size))
                .mapToLong(Long::longValue).sum();
    }
    System.out.println(size); // 264599218
}
```

## 参考资料
[Kafka核心技术与实战](https://time.geekbang.org/column/intro/100029201)