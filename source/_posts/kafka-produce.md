---
title: Kafka学习笔记 -- 写入数据
date: 2018-10-11 22:13:31
categories:
  - Kafka
tags:
  - Kafka
---

## 生产者概述

![producer_component.png](http://pg67n0yz6.bkt.clouddn.com/producer_component.png?imageView2/2/w/500)

1. 创建一个ProducerRecord对象，ProducerRecord对象包含**Topic**和**Value**，还可以指定**Key**或**Partition**
2. 在发送ProducerRecord对象时，生产者先将**Key**和**Partition**序列化成**字节数组**，以便于在网络上传输
3. 字节数组被传给**分区器**
  - 如果之前在ProducerRecord对象里指定了**Partition**，那么分区器就不会做任何事情，直接返回指定的分区
  - 如果没有指定分区，那么分区器会根据ProducerRecord对象的**Key**来**选择一个Partition**
  - 选择好分区后，生产者就知道该往哪个主题和分区发送这条记录
4. 这条记录会被添加到一个**记录批次**里，**一个批次内的所有消息** 都会被发送到**相同的Topic和Partition**上
  - 有一个单独的线程负责把这些记录批次发送到相应的Broker
5. 服务器在收到这些消息时会返回一个响应
  - 如果消息成功写入Kafka，就会返回一个RecordMetaData对象，它包含了**Topic和Partition信息**，以及**记录在分区里的偏移量**
  - 如果写入失败，就会返回一个错误
  - 生产者在收到错误之后会尝试重新发送消息，几次之后如果还是失败，就会返回错误信息

## 创建生产者

### 必选属性

#### bootstrap.servers
1. Broker的地址清单，**host:port**
2. 清单里不需要包含所有的Broker地址，**生产者会从给定的Broker里找到其它Broker的信息**
  - 建议**最少两个**，一旦其中一个宕机，生产者仍然能够连接到集群上

#### key.serializer
1. Broker希望接收到的消息的**Key**和**Value**都是**字节数组**
2. 生产者接口允许使用**参数化类型**，因此可以把**Java对象**作为Key和Value发送给Broker
3. key.serializer必须设置为一个实现了org.apache.kafka.common.serialization.Serializer接口的类
4. 生产者会通过${key.serializer}把**Key对象**序列化为字节数组
5. 默认提供
  - ByteArraySerializer
  - StringSerializer
  - IntegerSerializer
6. key.serializer是**必须设置**的！

#### value.serializer
1. 与key.serializer类似，value.serializer指定的类会把**Value**序列化
2. 如果**Key**和**Value**都是**字符串**，可以使用与key.serializer一样的序列化器
3. 如果**Key**是整数类型，而**Value**是字符串，那么需要使用不同的序列化器


```java
Properties kafkaProps = new Properties();
kafkaProps.put("bootstrap.servers", "localhost:9092");
kafkaProps.put("key.serializer", StringSerializer.class.getName());
kafkaProps.put("value.serializer", StringSerializer.class.getName());
KafkaProducer<String, String> producer = new KafkaProducer<>(kafkaProps);
```

## 发送消息

### 发送方式

#### 发送并忘记
1. 生产者把消息发送给服务器，但**并不关心是否正常到达**
2. Kafka是**高可用**的，而且生产者会**自动尝试重发**
3. 会**丢失**一些消息

#### 同步发送
```java
// Key对象和Value对象的类型必须与序列化器和生产者对象相匹配
ProducerRecord<String, String> record = new ProducerRecord<>("CustomerCountry", "Precision Products", "France");
try {
    // 消息被放入缓冲区，使用单独的线程发送到服务端端
    Future<RecordMetadata> future = producer.send(record);
    // 调用Future对象的get()方法等待Kafka响应，如果服务器返回错误，get()方法会抛出异常
    // 如果没有发生错误，会得到一个RecordMetadata对象，通过RecordMetadata对象可以获取消息的偏移量
    future.get();
} catch (Exception e) {
    e.printStackTrace();
}
```

KafkaProducer一般会发生两类错误
1. 可重试错误，可以通过重发消息来解决
  - **连接错误**，可以通过再次建立连接来解决
  - **No Leader 错误**，可以通过重新为分区选举领导来解决
  - KafkaProducer可以被配置成**自动重连**，如果在多次重试后扔无法解决问题，应用程序会收到一个重试异常
2. 无法通过重试解决的错误，例如消息太大，KafkaProducer不会进行任何重试，直接抛出异常

#### 异步发送
```java
ProducerRecord<String, String> record = new ProducerRecord<>("CustomerCountry", "Precision Products", "France");
try {
    Future<RecordMetadata> future = producer.send(record, (metadata, exception) -> {
        // 如果Kafka返回一个错误，onCompletion方法会抛出一个非空异常
        if (null != exception) {
            exception.printStackTrace();
        }
    });
    future.get();
} catch (Exception e) {
    e.printStackTrace();
}
```

## 生产者配置

### acks
1. acks参数指定了必须有多少个**分区副本**收到消息，生产者才会认为**消息写入是成功**的
2. **ack=0**。生产者在成功写入消息之前**不会等待**任何来自服务器的响应。
  - 如果当中出现问题，导致服务器没有收到消息，那么生产者无从得知，会造成**消息丢失**
  - 由于生产者不需要等待服务器的响应，所以可以以网络能够支持的最大速度发送消息，从而达到**很高的吞吐量**
3. **acks=1**。只要集群的**Leader节点**收到消息，生产者就会收到一个来自服务器的成功响应
  - 如果消息无法到达**Leader节点**（如首领节点崩溃，新的首领节点还没有被选举出来），生产者就会收到一个错误响应，为了避免数据丢失，生产者会**重发消息**
  - **如果一个没有收到消息的节点成为新首领，消息还是会丢失**
  - 此时的吞吐量取决于使用的是**同步发送**还是**异步发送**，吞吐量还受到**发送中消息数量的限制**（如，生产者在收到服务器响应之前可以发送多少个消息）
4. **acks=all**。只有当**所有参与复制的节点**全部都收到消息时，生产者才会收到一个来自服务器的成功响应
  - 这种模式是**最安全**的，可以保证不止一个服务器收到消息，就算有服务器发生崩溃，整个集群依然可以运行
  - **延时比acks=1更高**，因为要等待不止一个服务器节点接收消息

### buffer.memory
1. 该参数用来设置**生产者内缓冲区**的大小，生产者用缓冲区来缓冲要发送到服务器端消息
2. 如果应用程序发送消息的速度超过了发送到服务器端速度，会导致生产者空间不足
3. 这个时候，send()方法调用要么被**阻塞**，要么**抛出异常**，取决于如何设置block.on.buffer.full

### compression.type
1. **默认** 情况下，消息发送时**不会被压缩**
2. 该参数可以设置为 **snappy**、**gzip** 或者 **lz4**，指定了消息被发送给Broker之前使用哪一种压缩算法进行压缩
  - snappy压缩算法由Google发明，占用**较少的CPU**，却能提供**较好的性能**和相当**可观的压缩比**，适用于关注性能和网络带宽的场景
  - gzip压缩算法一般会占用**较多的CPU**，但会提供**更高的压缩比**，适用于网络带宽比较有限的场景
3. 使用压缩可以降低**网络传输开销**和**存储开销**，而这往往是向Kafka发送消息都瓶颈所在

### retries
1. 生产者从服务器收到的错误有可能是**临时性错误**（如分区找不到首领）
2. 在这种情况下，retries参数决定了生产者可以**重发消息的次数**，如果达到这个次数，生产者会**放弃重试并返回错误**
  - 默认情况下，生产者会在每次重试之间等待100ms，可以通过retry.backoff.ms参数来改变这个时间间隔
  - 可以先测试一下恢复一个崩溃节点需要多少时间，让总的重试时间比Kafka集群从崩溃中恢复的时间长，否着生产者会**过早地放弃重试**
3. 有些错误不是临时性错误，没办法通过重试来解决（例如消息太大）
4. 一般情况下，因为生产者会自动进行重试，所以没必要在代码逻辑处理那些可重试的错误
  - 只需要处理那些**不可重试的错误**或者**重试次数超过上限**的情况

### batch.size
1. 当有**多个消息**需要被发送到**同一个分区**时，生产者会把它们放在**同一个批次**里
  - 该参数指定了**一个批次可以使用多内存大小**，按照**字节数**计算
2. 当批次被填满，批次里的所有消息会被发送出去，**生产者不一定会等到批次被填满才发送**，半满设置只有一个消息的批次也有可能被发送
  - 如果把批次大小设置得很大，也不会造成延迟，只是会占用更多的内存
  - 如果设置太小，生产者需要频繁地发送消息，会增加一些额外的开销

### linger.ms
1. 该参数指定了生产者**在发送批次之前等待更多消息加入批次的时间**
2. KafkaProducer会在**批次填满**或者**linger.ms达到上限**时把批次发出去
3. 默认情况下，只要有可用的线程，生产者就会把消息发出去，就算批次里只有一个消息
4. 设置linger.ms，会**增加延迟**，但也会**提供吞吐量**（一次性发送更多的消息，单个消息的开销就变小了）

### client.id
任意字符串，服务器会用它来**识别消息的来源**，还可以用在日志和配额指标里

### max.in.flight.requests.per.connection
1. 该参数指定了生产者**在收到服务器响应之前可以发送多少消息**
2. 值越高，会占用越多的内存，不过也会提升吞吐量
3. 如果设为**1**，可以保证消息是**按照发送的顺序写入服务器**，即使发生重试

### timeout.ms、request.timeout.ms、metadata.fetch.timeout.ms
1. request.timeout.ms：指定了**生产者**在**发送数据**时等待服务器返回响应的时间
2. metadata.fetch.timeout.ms：指定了**生产者**在**获取元数据**时等待服务器返回响应的时间
  - 如果等待响应超时，那么生产者要么**重试**发送数据，要么返回一个**错误**（抛出异常或者执行回调）
4. timeout.ms指定了**Broker等待同步副本返回消息确认的时间**
  - 与acks的配置相匹配，如果在指定时间内没有收到同步副本的确认，那么Broker就会返回一个错误

### max.block.ms
1. 该参数指定了在调用send()方法或使用partitionsFor()方法获取元数据时**生产者的阻塞时间**
2. 当生产者的发送缓冲区已满，或者没有可用的元数据时，上面两个方法会阻塞
3. 在阻塞时间达到max.block.ms时，生产者就会抛出超时异常

### max.request.size
1. 该参数用于控制生产者发送的**请求大小**
2. 可以指**能发送到单个消息都最大值**，也可以指**单个请求里所有消息（一个批次，多个消息）总的大小**
3. Broker对可接收到消息最大值也有自己的限制（message.max.bytes），所以两边的配置最好可以**匹配**，避免生产者发送到消息被Broker拒绝

### receive.buffer.bytes、send.buffer.bytes
1. 这两个参数分别指定了**TCP Socket**接收和发送数据包的缓冲区大小
  - 如果都被设为-1，就使用操作系统的默认值
2. 如果生产者或消费者与Broker处于不同的数据中心，那么可以适当增大这些值

## 序列化器
### 自定义序列化
### 使用Avro序列化
### 在Kafka使用Avro

## 分区


<!-- more -->
<!-- indicate-the-source -->
