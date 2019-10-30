---
title: Kafka -- 重设消费者组位移
mathjax: false
date: 2019-09-26 19:42:21
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
1. Kafka和传统的消息引擎在设计上有很大的区别，Kafka消费者读取消息是可以**重演**的
2. 像RabbitMQ和ActiveMQ等传统消息中间件，处理和响应消息的方式是**破坏性**
    - 一旦消息被成功处理，就会从Broker上被**删除**
3. Kafka是基于**日志**结构（Log-based）的消息引擎
    - 消费者在消费消息时，仅仅是从磁盘文件中读取数据而已，是**只读**操作，因为消费者**不会删除**消息数据
    - 同时，由于位移数据是由消费者控制的，因此能够很容易地修改位移值，实现**重复消费**历史数据的功能
4. Kafka Or 传统消息中间件
    - 传统消息中间件：消息处理逻辑非常复杂，处理代价高、又**不关心消息之间的顺序**
    - Kafka：需要**较高的吞吐量**、但**每条消息的处理时间很短**，又**关心消息的顺序**

<!-- more -->

## 重设位移策略
1. **位移**维度
    - 直接把消费者的位移值重设成给定的位移值
2. **时间**维度
    - 给定一个时间，让消费者把位移调整成**大于该时间的最小位移**

| 维度 | 策略 | 含义 |
| --- | --- | --- |
| 位移维度 | **Earliest** | 把位移调整到**当前最早**位移处 |
| | **Latest** | 把位移调整到**当前最新**位移处 |
| | **Current** | 把位移调整到**当前最新提交**位移处 |
| | **Specified-Offset** | 把位移调整成**指定位移** |
| | **Shift-By-N** | 把位移调整成到**当前位移+N**处（N可以是**负值**） |
| 时间维度 | **DateTime** | 把位移调整到**大于给定时间的最小位移**处 |
| | **Duration** | 把位移调整到**距离当前时间指定间隔的位移**处 |

1. **Earliest**
    - **最早位移不一定是0**，在生产环境中，很久远的消息会被Kafka**自动删除**
    - 如果想要**重新消费主题的所有消息**，可以使用Earliest策略
2. **Latest**
    - 如果想要**跳过所有历史消息**，打算从最新的消息处开始消费，可以使用Latest策略
3. **Specified-Offset**
    - 典型使用场景：消费者程序在处理某条**错误消息**时，可以**手动跳过**此消息的处理
4. **Duration**
    - 格式为`PnDTnHnMnS`，**D**、**H**、**M**、**S**分别代表天、小时、分钟、秒
    - 如果想将位移调回到15分钟前，可以指定**`PT0H15M0S`**

## 重设位移方式

### 消费者API
```java
// org.apache.kafka.clients.consumer.Consumer
void seek(TopicPartition partition, long offset);
void seekToBeginning(Collection<TopicPartition> partitions);
void seekToEnd(Collection<TopicPartition> partitions);
```
1. 每次调用`seek`方法**只能重设一个分区的位移**
2. `seekToBeginning`和`seekToEnd`可以一次性重设多个分区

#### Earliest
```java
Properties consumerProperties = new Properties();
// 禁止自动提交位移
consumerProperties.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
consumerProperties.put(ConsumerConfig.GROUP_ID_CONFIG, "zhongmingmao");
consumerProperties.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
consumerProperties.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
consumerProperties.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
consumerProperties.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");

String topic = "zhongmingmao";  // 要重设位移的Kafka主题
try (final KafkaConsumer<String, String> consumer = new KafkaConsumer<>(consumerProperties)) {
    consumer.subscribe(Collections.singleton(topic));
    // 调用consumer.poll(0)，不要调用consumer.poll(Duration.ofSecond(0))
    consumer.poll(0);
    // 一次性构造主题的所有分区对象
    consumer.seekToBeginning(consumer.partitionsFor(topic).stream().map(
            partitionInfo -> new TopicPartition(topic, partitionInfo.partition())).collect(Collectors.toList()));
}
```

#### Latest
```java
consumer.seekToEnd(consumer.partitionsFor(topic).stream().map(
        partitionInfo -> new TopicPartition(topic, partitionInfo.partition())).collect(Collectors.toList()));
```

#### Current
```java
consumer.partitionsFor(topic).stream().map(
        info -> new TopicPartition(topic, info.partition())).forEach(
        tp -> {
            // 通过committed方法获取分区当前提交的最新位移
            long committedOffset = consumer.committed(tp).offset();
            consumer.seek(tp, committedOffset);
        });
```

#### Specified-Offset
```java
long targetOffset = 1234L;
for (PartitionInfo info : consumer.partitionsFor(topic)) {
    TopicPartition tp = new TopicPartition(topic, info.partition());
    consumer.seek(tp, targetOffset);
}
```

#### Shift-By-N
```java
for (PartitionInfo info : consumer.partitionsFor(topic)) {
    TopicPartition tp = new TopicPartition(topic, info.partition());
    // 假设向前跳123条消息
    long targetOffset = consumer.committed(tp).offset() + 123L;
    consumer.seek(tp, targetOffset);
}
```

#### DateTime
```java
long ts = LocalDateTime.of(2019, 6, 20, 20, 0)
        .toInstant(ZoneOffset.ofHours(8)).toEpochMilli();
// 查找对应的位移值
Map<TopicPartition, Long> timeToSearch =
        consumer.partitionsFor(topic).stream().map(info ->
                new TopicPartition(topic, info.partition()))
                .collect(Collectors.toMap(Function.identity(), tp -> ts));

// offsetsForTimes
for (Map.Entry<TopicPartition, OffsetAndTimestamp> entry : consumer.offsetsForTimes(timeToSearch).entrySet()) {
    consumer.seek(entry.getKey(), entry.getValue().offset());
}
```

#### Duration
```java
Map<TopicPartition, Long> timeToSearch = consumer.partitionsFor(topic).stream().map(
        info -> new TopicPartition(topic, info.partition()))
        .collect(Collectors.toMap(Function.identity(), tp -> System.currentTimeMillis() - 30 * 1000 * 60));

for (Map.Entry<TopicPartition, OffsetAndTimestamp> entry : consumer.offsetsForTimes(timeToSearch).entrySet()) {
    consumer.seek(entry.getKey(), entry.getValue().offset());
}
```

### 命令行工具
从Kafka **0.11**版本开始引入

#### Earliest
`--to-earliest`
```
$ kafka-consumer-groups --bootstrap-server localhost:9092 --group test-group --reset-offsets --all-topics --to-earliest --execute
```

#### Latest
`--to-latest`
```
$ kafka-consumer-groups --bootstrap-server localhost:9092 --group test-group --reset-offsets --all-topics --to-latest --execute
```

#### Current
`--to-current`
```
$ kafka-consumer-groups --bootstrap-server localhost:9092 --group test-group --reset-offsets --all-topics --to-current --execute
```

#### Specified-Offset
`--to-offset`
```
$ kafka-consumer-groups --bootstrap-server localhost:9092 --group test-group --reset-offsets --all-topics --to-offset <offset> --execute
```

#### Shift-By-N
`--shift-by`
```
$ kafka-consumer-groups --bootstrap-server localhost:9092 --group test-group --reset-offsets --shift-by <offset_N> --execute
```

#### DateTime
`--to-datetime`
```
$ kafka-consumer-groups --bootstrap-server localhost:9092 --group test-group --reset-offsets --to-datetime 2019-09-26T00:00:00.000 --execute
```

#### Duration
`--by-duration`
```
$ kafka-consumer-groups --bootstrap-server localhost:9092 --group test-group --reset-offsets --by-duration PT0H30M0S --execute
```