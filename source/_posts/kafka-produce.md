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

### 样例代码
```java
Properties kafkaProps = new Properties();
kafkaProps.put("bootstrap.servers", "localhost:9092");
kafkaProps.put("key.serializer", StringSerializer.class.getName());
kafkaProps.put("value.serializer", StringSerializer.class.getName());
KafkaProducer<String, String> producer = new KafkaProducer<>(kafkaProps);
```

## 发生消息

### 发送方式

#### 发送并忘记
1. 生产者把消息发送给服务器，但**并不关心是否正常到达**
2. Kafka是高可用的，而且生产者会**自动尝试重发**
3. 会丢失一些消息

#### 同步发送
1. 使用**send()** 方法发送消息，会返回一个**Future对象**，调用**get()** 方法进行**等待**

#### 异步发送
1. 调用**send()** 方法，并指定一个**Callback函数**，服务器在返回响应时调用该函数

## 生产者配置

## 序列化器
### 自定义序列化
### 使用Avro序列化
### 在Kafka使用Avro

## 分区


<!-- more -->
<!-- indicate-the-source -->
