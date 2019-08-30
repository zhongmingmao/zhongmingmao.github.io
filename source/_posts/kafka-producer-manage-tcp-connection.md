---
title: Kafka -- 生产者管理TCP连接
mathjax: false
date: 2019-08-16 09:35:46
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

## 建立TCP连接

### 创建KafkaProducer实例
```java
Properties properties = new Properties();
properties.put("bootstrap.servers", "localhost:9092");
properties.put("key.serializer", StringSerializer.class.getName());
properties.put("value.serializer", StringSerializer.class.getName());
// try-with-resources
// 创建KafkaProducer实例时，会在后台创建并启动Sender线程，Sender线程开始运行时首先会创建与Broker的TCP连接
try (Producer<String, String> producer = new KafkaProducer<>(properties)) {
    ProducerRecord<String, String> record = new ProducerRecord<>(TOPIC, KEY, VALUE);
    Callback callback = (metadata, exception) -> {
    };
    producer.send(record, callback);
}
```

<!-- more -->

1. `bootstrap.servers`是Producer的核心参数之一，指定了Producer**启动**时要连接的Broker地址
2. 如果`bootstrap.servers`指定了1000个Broker，那么Producer启动时会首先创建与这1000个Broker的**TCP连接*8
3. 因此不建议把集群中所有的Broker信息都配置到`bootstrap.servers`中，通常配置**3~4台**足够
    - Producer一旦连接到集群中的**任意一台Broker**，就能拿到**整个集群**的Broker信息（**metadata request**）
4. 在创建KafkaProducer实例时启动Sender线程是**不合理**的
    - 在对象构造器中启动线程会造成**this指针逃逸**，理论上Sender线程能够观测到一个**尚未构造完成**的KafkaProducer实例
    - 在构造对象时创建线程是没有问题的，但最好不要同时启动线程

相关日志
```
Sender          - Starting Kafka producer I/O thread.
KafkaProducer   - Kafka producer started
NetworkClient   - Initialize connection to node localhost:9092 (id: -1 rack: null) for sending metadata request
NetworkClient   - Initiating connection to node localhost:9092 (id: -1 rack: null)
Selector        - Created socket with SO_RCVBUF = 326640, SO_SNDBUF = 146988, SO_TIMEOUT = 0 to node -1
NetworkClient   - Completed connection to node -1. Fetching API versions.
NetworkClient   - Initiating API versions fetch from node -1.
NetworkClient   - Sending metadata request (type=MetadataRequest, topics=zhongmingmao) to node localhost:9092 (id: -1 rack: null)
KafkaProducer   - Closing the Kafka producer with timeoutMillis = 9223372036854775807 ms.
NetworkClient   - Initiating connection to node 192.168.2.1:9092 (id: 0 rack: null)
Sender          - Beginning shutdown of Kafka producer I/O thread, sending remaining records.
Sender          - Shutdown of Kafka producer I/O thread has completed.
KafkaProducer   - Kafka producer has been closed
```

### 其他场景
1. 其他**可能**创建TCP连接的场景：**更新元数据后**，**消息发送时**
2. 当Producer更新了**集群的元数据**后，如果发现与某些Broker当前没有连接，那么Producer会创建一个TCP连接
    - 场景1
        - 当Producer尝试向**不存在的主题**发送消息时，Broker会告诉Producer这个主题不存在
        - 此时Producer会发送**metadata request**到**Kafka集群**，去尝试获取最新的元数据信息
            - 与**集群中所有的Broker**建立TCP连接
    - 场景2
        - Producer通过`metadata.max.age.ms`参数**定期**地去更新元数据信息，默认值300000，即**5分钟**
3. 当Producer要**发送消息**时，Producer发现与**目标Broker**（依赖**负载均衡**算法）还没有连接，也会创建一个TCP连接

## 关闭TCP连接
1. Producer端关闭TCP连接有两种方式：**用户主动关闭**、**Kafka自动关闭**
2. **用户主动关闭**
    - 广义的主动关闭，包括用户调用`kill -9`来杀掉Producer，最推荐的方式：`producer.close()`
3. **Kafka自动关闭**
    - Producer端参数`connections.max.idle.ms`，默认值540000，即**9分钟**
    - 如果9分钟内**没有任何请求**经过某个TCP连接，Kafka会主动把TCP连接关闭
    - `connections.max.idle.ms=-1`会**禁用**这种机制，TCP连接将成为**永久长连接**
        - Kafka创建的Socket连接都开启了**keepalive**
    - 关闭TCP连接的发起方是**Kafka客户端**，属于**被动关闭**的场景
        - 被动关闭的后果就是会产生大量的**CLOSE_WAIT**连接
        - _**Producer端或Client端没有机会显式地观测到此TCP连接已被中断**_
