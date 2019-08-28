---
title: Kafka -- 拦截器
mathjax: false
date: 2019-08-13 17:56:01
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

## 设计思路
1. 基本思想：允许应用程序在不修改逻辑的情况下，动态地实现一组**可插拔**的事件处理逻辑链
2. 拦截器能够在主业务操作的前后多个时间点上插入对应的拦截逻辑
3. 以配置**拦截器类**的方式**动态**插入到应用程序中，可以快速地切换不同的拦截器，而不影响主程序逻辑

<!-- more -->

## Kafka拦截器
1. Kafka拦截器自**0.10.0.0**版本被引入后并未得到太多的实际应用
2. Kafka拦截器分为**生产者拦截器**和**消费者拦截器**
    - **生产者拦截器**：允许在**发送消息前**以及**消息提交成功后**植入拦截逻辑
    - **消费者拦截器**：允许在**消费消息前**以及**提交位移后**植入拦截逻辑
3. Kafka拦截器支持**链式调用**，Kafka会按照**添加顺序**依次执行拦截器逻辑
4. Kafka拦截器通过参数`interceptor.classes`来配置（生产者和消费者一致）
    - 指定拦截器类时需要使用**全限定名**

```java
Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("key.serializer", StringSerializer.class.getName());
props.put("value.serializer", StringSerializer.class.getName());
List<String> interceptors = Lists.newArrayList();
interceptors.add(AddTimeStampInterceptor.class.getCanonicalName());
interceptors.add(UpdateCounterInterceptor.class.getCanonicalName());
props.put(ProducerConfig.INTERCEPTOR_CLASSES_CONFIG, interceptors);
producer = new KafkaProducer<>(props);
```

### 生产者拦截器
```java
public interface ProducerInterceptor<K, V> extends Configurable {
    // 消息发送之前
    public ProducerRecord<K, V> onSend(ProducerRecord<K, V> record);

    // 消息成功提交或发送失败之后，onAcknowledgement要早于callback
    // onAcknowledgement和onSend不是在同一个线程中被调用，需要保证线程安全
    // onAcknowledgement在Producer发送的主路径中，避免嵌入太重的逻辑，否则会影响TPS
    public void onAcknowledgement(RecordMetadata metadata, Exception exception);
}
```

### 消费者拦截器
```java
public interface ConsumerInterceptor<K, V> extends Configurable {
    // 消息返回给Consumer之前（即开始正式处理消息之前）
    public ConsumerRecords<K, V> onConsume(ConsumerRecords<K, V> records);

    // Consumer提交位移之后
    public void onCommit(Map<TopicPartition, OffsetAndMetadata> offsets);
}
```

## 案例：端到端延时
1. Kafka默认提供的监控指标都是针对单个**客户端**或者**Broker**，缺少**消息维度**的监控
2. 如何**追踪**一条消息在**集群间的流转路径**
3. 如何**监控**一条消息从生产到消费的**端到端延时**

### 生产者拦截器
```java
public class AvgLatencyProducerInterceptor implements ProducerInterceptor<String, String> {

    private Jedis jedis;

    @Override
    public ProducerRecord<String, String> onSend(ProducerRecord<String, String> record) {
        jedis.incr("totalSentMessage");
        return record;
    }

    @Override
    public void onAcknowledgement(RecordMetadata metadata, Exception exception) {
    }

    @Override
    public void close() {
    }

    @Override
    public void configure(Map<String, ?> configs) {
    }
}
```

### 消费者拦截器
```java
public class AvgLatencyConsumerInterceptor implements ConsumerInterceptor<String, String> {

    private Jedis jedis;

    @Override
    public ConsumerRecords<String, String> onConsume(ConsumerRecords<String, String> records) {
        AtomicLong latency = new AtomicLong(0L);
        records.forEach(record -> latency.addAndGet(System.currentTimeMillis() - record.timestamp()));
        jedis.incrBy("totalLatency", latency.get());
        long totalLatency = Long.parseLong(jedis.get("totalLatency"));
        long totalSentMessage = Long.parseLong(jedis.get("totalSentMessage"));
        jedis.set("avgLatency", String.valueOf(totalLatency / totalSentMessage));
        return records;
    }

    @Override
    public void onCommit(Map<TopicPartition, OffsetAndMetadata> offsets) {
    }

    @Override
    public void close() {
    }

    @Override
    public void configure(Map<String, ?> configs) {
    }
}
```
