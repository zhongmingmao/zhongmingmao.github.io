---
title: Kafka -- 提交位移
mathjax: false
date: 2019-09-03 15:42:05
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

## 消费位移
1. Consumer的**消费位移**，记录了Consumer要消费的**下一条消息**的位移
2. 假设一个分区中有10条消息，位移分别为0到9
    - 某个Consumer消费了5条消息，实际消费了位移0到4的5条消息，此时Consumer的位移为5，指向下一条消息的位移
3. Consumer需要向Kafka汇报自己的位移数据，这个汇报过程就是**提交位移**
    - Consumer能够**同时消费多个分区**的数据，所以位移的提交实际上是在**分区粒度**上进行的
    - _**Consumer需要为分配给它的每个分区提交各自的位移数据**_
4. 提交位移主要是为了**表征Consumer的消费进度**
    - 当Consumer发生故障重启后，能够从Kafka中读取之前提交的位移值，然后从相应的位移处**继续消费**
5. 位移提交的**语义**
    - 如果提交了位移X，那么Kafka会认为位移值**小于**X的消息都已经被**成功消费**了

<!-- more -->

## 灵活
1. 位移提交非常灵活，可以提交**任何位移值**，但要承担相应的后果
2. 假设Consumer消费了位移为0~9的10条消息
    - 如果提交的位移为20，位移位于10~19的消息可能会**丢失**
    - 如果提交的位移为5，位移位于5~9的消息可能会被**重复消费**
3. 位移提交的语义保障由应用程序保证，Kafka只会**无脑**地接受
4. 位移提交的方式
    - 从**用户角度**来看，分为**自动提交**和**手动提交**
    - 从**Consumer端**来看，分为**同步提交**和**异步提交**

## 自动提交
1. 自动提交：Kafka Consumer在后台默默地提交位移
2. 参数`enable.auto.commit`，默认值为**true**，启用自动提交
3. 参数`auto.commit.interval.ms`，默认值为**5秒**，Kafka每5秒会自动提交一次位移
4. Kafka会保证在开始调用poll方法时，提交**上次**poll返回的所有消息
    - poll方法的逻辑：先提交上一批消息的位移，再处理下一批消息，因此能够保证_**消息不丢失**_
5. 自动提交可能会出现_**重复消费**_
    - Consumer每5秒提交一次位移，若提交位移后3秒发生**Rebalance**，所有Consumer从上次提交的位移处继续消费

```java
Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("group.id", "test");
props.put("enable.auto.commit", "true");
props.put("auto.commit.interval.ms", "2000");
props.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
props.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);
consumer.subscribe(Arrays.asList("foo", "bar"));
while (true) {
    ConsumerRecords<String, String> records = consumer.poll(100);
    for (ConsumerRecord<String, String> record : records)
        System.out.printf("offset = %d, key = %s, value = %s%n", record.offset(), record.key(), record.value());
}
```

## 手动提交
1. `enable.auto.commit=false`
2. `KafkaConsumer#commitSync()`
    - 提交`KafkaConsumer#poll()`返回的最新位移
    - **同步**操作，一直等待，直到位移被成功提交才会返回
    - 需要处理完poll方法返回的**所有消息**后，才提交位移，否则会出现**消息丢失**
    - Consumer处于**阻塞**状态，直到远端的Broker返回提交结果，才会结束
    - 因为应用程序而非资源限制而导致的阻塞都可能是**系统的瓶颈**，会影响整个应用程序的**TPS**
3. `KafkaConsumer#commitAsync()`
    - **异步**操作，立即返回，不会阻塞，不会影响Consumer应用的TPS，Kafka也提供了**回调**函数
    - **`commitAsync`不能代替`commitSync`**，因为`commitAsync`_**不会自动重试**_
        - 如果异步提交后再重试，提交的位移值很可能已经**过期**，因此异步提交的重试是**没有意义**的
4. 手动提交需要组合`commitSync`和`commitAsync`，达到最优效果
    - 利用`commitSync`的**自动重试**来规避**瞬时**错误，如网络瞬时抖动、Broker端的GC等
    - 利用`commitAsync`的**非阻塞性**，保证Consumer应用的**TPS**

```java
// 同步提交
while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(1));
    process(records); // 处理消息
    try {
        consumer.commitSync();
    } catch (CommitFailedException e) {
        handle(e); // 处理提交失败异常
    }
}
```
```java
// 异步提交
while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(1));
    process(records); // 处理消息
    consumer.commitAsync((offsets, exception) -> {
        if (exception != null)
            handle(exception);
    });
}
```
```java
// 同步提交 + 异步提交
try {
    while (true) {
        ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(1));
        process(records); // 处理消息
        commitAysnc(); // 使用异步提交规避阻塞
    }
} catch (Exception e) {
    handle(e); // 处理异常
} finally {
    try {
        consumer.commitSync(); // 最后一次（异常/应用关闭）提交使用同步阻塞式提交
    } finally {
        consumer.close();
    }
}
```

## 精细化提交
1. 上面的位移提交方式，都是提交**poll**方法返回的**所有消息的位移**，即提交**最新一条消息**的位移
2. 精细化提交
    - `commitSync(Map<TopicPartition, OffsetAndMetadata> offsets)`
    - `commitAsync(Map<TopicPartition, OffsetAndMetadata> offsets, OffsetCommitCallback callback)`

```java
Map<TopicPartition, OffsetAndMetadata> offsets = new HashMap<>();
int count = 0;
while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(1));
    for (ConsumerRecord<String, String> record : records) {
        process(record);  // 处理消息
        // 消费位移是下一条消息的位移，所以+1
        offsets.put(new TopicPartition(record.topic(), record.partition()),
                new OffsetAndMetadata(record.offset() + 1));
        if (count % 100 == 0) {
            // 精细化提交
            consumer.commitAsync(offsets, null); // 回调处理逻辑是 null
        }
        count++;
    }
}
```

## 参考资料
[Kafka核心技术与实战](https://time.geekbang.org/column/intro/100029201)