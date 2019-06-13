---
title: Kafka -- 消费者
date: 2018-10-18 15:30:51
categories:
    - Middleware
    - MQ
    - Kafka
tags:
    - Middleware
    - MQ
    - Kafka
---

## 基本概念

### 消费者 + 消费者群组
1. _**消费者从属于消费者群组**_
2. 一个消费者群组里的消费者订阅的是**同一个主题**，每个消费者接收主题的**部分分区**的消息

#### 消费者横向扩展

##### 1个消费者
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/definitive-guide/consumer_topic_1.png" width="400">
1. 主题T1有4个分区，然后创建消费者C1，C1是消费者群组G1里唯一的消费者，C1订阅T1
2. 消费者C1将接收主题T1的**全部**4个分区的消息

<!-- more -->

##### 2个消费者
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/definitive-guide/consumer_topic_2.png" width="400">
1. 如果群组G1新增一个消费者C2，那么每个消费者将**分别从两个分区接收消息**
2. 假设C1接收分区0和分区2的消息，C2接收分区1和分区3的消息

##### 4个消费者
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/definitive-guide/consumer_topic_3.png" width="400">
如果群组G1有4个消费者，那么每个消费者可以分配到一个分区

##### 5个消费者
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/definitive-guide/consumer_topic_4.png" width="400">
如果群组G1有5个消费者，_**消费者数量超过主题的分区数量**_，那么有1个消费者就会被**闲置**，不会接收到任何消息

##### 总结
1. 往群组里增加消费者是**横向伸缩消费能力**的主要方式
2. 消费者经常会做一些**高延迟**的操作，比如把数据写到数据库或HDFS，或者使用数据进行比较耗时的计算
3. 有必要**为主题创建大量的分区**，在负载增长时可以加入更多的消费者，**减少消息堆积**
    - 不要让**消费者的数量超过主题分区的数量**，多余的消费者只会被**闲置**

#### 消费者群组横向扩展
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/definitive-guide/consumer_topic_5.png" width="400">
1. Kafka设计的主要目标之一，就是要让Kafka主题里的数据能够满足企业各种应用场景（**不同的消费者群组**）的需求
2. 在这些场景里，每个应用程序可以获取到**所有的消息**，而不只是其中的一部分
3. 只要保证每个应用程序有自己的消费者群组，就可以让它们获取到主题所有的消息
4. 不同于传统的消息系统，_**横向伸缩Kafka消费者和消费者群组并不会对性能造成负面影响**_

### 消费者群组 + 分区再均衡

#### 分区再均衡
1. 分区再均衡：_**分区的所有权从一个消费者转移到另一个消费者**_
2. 分区再均衡非常重要，它为消费者群组带来了**高可用性**和**伸缩性**（可以放心地添加或移除消费者）
3. 在分区再均衡期间，_**消费者无法读取消息**_，造成整个群组在一小段时间内**不可用**
4. 当分区被**重新分配**给另一个消费者时，消费者**当前的读取状态**会**丢失**
    - 它有可能需要去**刷新缓存**，在它重新恢复状态之前会**拖慢应用程序**

#### 心跳
1. 消费者通过向被指派为**群组协调器**的Broker发送**心跳**
    - 目的
        - 维持它们_**和群组的从属关系**_
        - 维持它们_**对分区的所有权关系**_
    - **不同的群组可以有不同的协调器**
2. 只要消费者以**正常的时间间隔**发送心跳，就被认为是**活跃**的，说明它还在读取分区里的消息
3. 消费者发送心跳的时机
    - **轮询消息**（为了获取消息）
    - **提交偏移量**
4. 如果消费者停止发送心跳的时间**足够长**，会话就会过期，群组协调器认为它已经**死亡**，就会触发一次**再均衡**
5. 如果一个消费者发生崩溃，并停止读取消息，群组协调器会等待几秒钟，确认它死亡了才会触发再均衡
    - 在这几秒的时间内，死掉的消费者不会读取分区里的消息
6. 在清理消费者时，消费者会**通知**群组协调器它**将要离开群组**，群组协调器会**立即**触发一次**再均衡**，尽量**降低处理停顿**

#### 分配分区
1. 当消费者要加入消费者群组时，它会向**群组协调器**发送一个`JoinGroup`的请求，**第一个**加入群组的消费者将成为**群主**
2. **群主**（消费者）从**群组协调器**（Broker）那里获得**成员列表**（消费者）
    - 列表中包含了**最近发送过心跳的消费者**，它们被认为是**活跃**的
    - _**群主负责给每个成员（消费者）分配分区**_
    - 实现`PartitionAssignor`接口的类来决定哪些分区应该被分配给哪个消费者
3. **群主**（消费者）分配分区完毕后，把**分区的分配情况**发送给**群组协调器**（Broker）
    - **群组协调器**（Broker）再把这些信息发送给**所有的消费者**
    - _**每个消费者只能看到自己的分配信息，只有群主知道消费者群组里所有消费者的分配信息**_
4. 这个过程会在每次**再均衡**时重复发生

## 创建消费者
```java
Properties properties = new Properties();
properties.put("bootstrap.servers", "localhost:9092");
properties.put("group.id", GROUP_ID);
properties.put("key.deserializer", StringDeserializer.class.getName());
properties.put("value.deserializer", StringDeserializer.class.getName());
Consumer<String, String> consumer = new KafkaConsumer<>(properties);
```

## 订阅主题
```java
// 订阅主题
// 支持正则表达式：如果创建新主题，并且主题的名字与正则表达式匹配，
//              就会触发一次再均衡，消费者就能读取新添加的主题
// consumer.subscribe("test.*");
consumer.subscribe(Collections.singletonList(TOPIC));
```

## 轮询
1. 消息轮询是消费者API的核心，通过一个简单的轮询向服务器请求数据
2. 一旦消费者订阅了主题，轮询就会处理**所有的细节**
    - **群组协调**、**分区再均衡**、**发送心跳**、**获取数据**
3. 线程安全
    - 在同一个群组里，无法让一个线程运行多个消费者，也无法让多个线程安全地共享一个消费者
    - 按照规则，_**一个消费者使用一个线程**_

```java
try {
    while (true) {
        // 消费者必须持续对Kafka进行轮询，否则会被认为已经死亡，它的分区就会被移交给群组里的其它消费者
        // 在消费者的缓冲区里没有可用数据时会发生阻塞
        // 返回一个记录列表，每条记录包含
        //  1. 记录所属主题的信息
        //  2. 记录所在分区的信息
        //  3. 记录在分区里的偏移量
        //  4. 记录的键值对
        // timeout参数指定多久之后可以返回，不管有没有可用的数据，0会立即返回
        ConsumerRecords<String, String> records = consumer.poll(100);
        records.forEach(record -> log.info("topic={}, partition={}, offset={}, key={}, value={}",
                record.topic(), record.partition(), record.offset(), record.key(), record.value()));
    }
} finally {
    // 网络连接和Socket也会随之关闭
    // 并且立即触发一次再均衡，而不是等待群组协调器发现它不再发送心跳并认定它已死亡
    //  因为那样需要更长的时间，导致整个群组在一段时间内无法读取消息
    consumer.close();
}
```

## 消费者的配置

### fetch.min.bytes
1. 该参数指定了消费者**单个数据请求**的最小字节数，默认值为`1`
2. Broker在收到消费者的数据请求时
    - 如果可用的数据量小于`fetch.min.bytes`指定的大小，那么它会等到有足够的可用数据时才会返回给消费者
    - 这样可以降低消费者和Broker的工作负载，因为在主题不是很活跃的时候，就不需要来回处理消息

### fetch.max.wait.ms
1. 如果`fetch.max.wait.ms`（默认值为500）被设为100ms，并且`fetch.min.bytes`被设为1MB
2. 那么Kafka在收到消费者的请求后，要么返回1MB数据，要么在100ms后返回所有可用的数据，**看哪个条件先得到满足**

### max.partition.fetch.bytes
1. 该参数指定了服务器从**每个分区**里返回给消费者的最大字节数，默认1MB
    - `Consumer.poll()`方法从**每个分区**里返回的数据不能超过`max.partition.fetch.bytes`
    - 如果单次`poll()`返回的数据太多，消费者需要更多时间来处理
        - 可能无法及时地进行下一次**轮询**（发送**心跳**）来避免**会话过期**，**触发再平衡**
        - 减少`max.partition.fetch.bytes`的值
        - 或者**延长会话过期时间**
2. 如果主题有20个分区和5个消费者，那么每个消费者需要至少4MB的可用内存来接收记录
    - 在为消费者分配内存时，可以适当地多分配些
    - 因为如果消费者群组里有消费者发生崩溃，剩下的消费者需要处理更多的分区
3. `max.partition.fetch.bytes`必须比`message.max.bytes`（Broker能够接收到最大消息的字节数）大
    - 否着消费者可能**无法读取**这些**大消息**，导致**消费者一直挂起重试**

### session.timeout.ms + heartbeat.interval.ms
1. `session.timeout.ms`指定了**消费者在被认为死亡之前可以与服务器断开连接的时间**，默认值为10000
    - 如果消费者没有在`session.timeout.ms`指定的时间内发送**心跳**给在**群组协调器**（Broker）
    - 就会被认为已经死亡，群组协调器就会触发**再均衡**
2. `heartbeat.interval.ms`指定了`poll()`方法向群组协调器**发送心跳的频率**，默认值为3000
    - 而`session.timeout.ms`指定了消费者**可以多久不发心跳**
3. `heartbeat.interval.ms`必须比`session.timeout.ms`小，一般是`session.timeout.ms`的**1/3**
4. 如果把`session.timeout.ms`值设置得**比默认值小**，可以**更快地检测和恢复崩溃的节点**
    - 不过长时间的轮询或者GC可能会导致**非预期的再均衡**
5. 如果把`session.timeout.ms`值设置得比默认值大，**可以减少意外的再均衡**
    - 不过检测节点崩溃需要更长的时间

### auto.offset.reset
1. 该参数指定了消费者在下列情况下该如何处理
    - 读取一个**没有偏移量**的分区（新加入消费者，还没有该消费者的消费记录）
    - **偏移量无效**（消费者长时间失效，包含偏移量的记录已经过时并被删除）
2. 默认值是**latest**：消费者从**最新**的记录开始读取数据
3. **earliest**：消费者从**起始位置**读取分区的记录

### enable.auto.commit + auto.commit.interval.ms
1. `enable.auto.commit`指定了消费者是否**自动提交偏移量**，默认值是true
    - 可能出现**重复数据**和**数据丢失**
2. `auto.commit.interval.ms`指定提交的**频率**，默认值为5000

### partition.assignment.strategy
1. 分区会被分配给消费群组里的消费者的策略
2. `Range`：把主题的若干**连续**的分区分配给消费者，默认值
3. `RoundRobin`：把主题的所有分区**逐个**分配给消费者

### client.id
1. 任意字符串，Broker用它来标识从客户端发过来的消息
2. 通常被用在日志、度量指标和配额里

### max.poll.records
1. 该参数用于控制单次调用`poll()`方法能够返回的消息数量，默认值为500

### receive.buffer.bytes + send.buffer.bytes
1. 设置socket在**读写数据**时用到的**TCP缓冲区**
    - 如果为**-1**，就使用**操作系统的默认值**
    - `receive.buffer.bytes`的默认值为`32KB`
    - `send.buffer.bytes`的默认值为`128KB`
2. 如果生产者或消费者与Broker处于不同的数据中心内，可以适当增大这些值

## 提交 + 偏移量
1. 每次调用`poll()`方法，总是返回由生产者写入Kafka但还没有被消费者读取过的记录
2. Kakfa不像其它JMS队列那样，_**Kafka不需要得到消费者的确认**_
3. 消费者可以使用Kafka来追踪消息在分区里的位置（偏移量）
4. 把**更新分区当前位置**的操作叫作**提交**
    - 消费者往一个叫作`__consumer_offsets`的特殊主题发送消息，消息里包含_**每个分区的偏移量**_
    - 如果**消费者发生崩溃**或者有**新的消费者加入群组**，就会触发**再均衡**
    - 完成再均衡之后，每个消费者可能**分配到新的分区**
        - 为了能继续之前的工作，消费者需要读取**每个分区最后一次提交的偏移量**，然后从偏移量指定的位置继续处理
5. 偏移量不相同
    - 如果提交的偏移量 **小于** 客户端处理的最后一个消息的偏移量
        - 那么处于**两个偏移量之间的消息**就会被_**重复处理**_
    - 如果提交的偏移量 **大于** 客户端处理的最后一个消息的偏移量
        - 那么处于**两个偏移量之间的消息**就会_**丢失**_

### 自动提交
1. 自动提交是基于**时间间隔**
2. 如果`enable.auto.commit`为true，那么每过`auto.commit.interval.ms`（默认5s）
    - 消费者就会自动把从`poll()`方法接收到的**最大偏移量**提交上去，_**不论客户端是否真的处理完**_
3. 自动提交也是在**轮询**里进行，消费者**每次轮询**时会**检查是否该提交偏移量**
    - 如果是，那就会提交`poll()`返回的**最大偏移量**

#### 问题
1. _**消息重复处理**_
    - 假设时刻`T`自动提交，在时刻`T+3`发生了再均衡，还没到时刻`T+5`
        - _客户端已经处理的部分消息没有被提交_
    - 再均衡之后，消费者还是会从最后一次提交的偏移量位置（时刻`T`）开始读取消息，消息会被重复处理
2. _**消息丢失**_
    - 假设时刻`T`自动提交，执行`poll()`拉回100条消息，在时刻`T+5`会再次提交
    - 但在时刻`T+5`，客户端只处理完了90条消息，在自动提交完成之后的那一刻该客户端崩溃，消息丢失
3. 每次调用轮询方法都会把上一次调用`poll()`返回的**最大偏移量**提交上去，_**并不关心哪些消息已经被处理过了**_
    - 所以在再次调用轮询之前最好确保**所有应该处理的消息**都已经处理完毕

### 同步提交
1. `enable.auto.commit=false`，让应用程序决定何时提交偏移量
2. 使用`commitAsync()`提交偏移量**最简单也最可靠**
    - 提交由`poll()`方法返回的**最大偏移量**，提交成功后立马返回，如果提交失败就会抛出异常
3. 如果发生**再均衡**，消息会被_**重复处理**_

```java
consumer.subscribe(Collections.singletonList(TOPIC));
try {
    while (true) {
        // 获取最新偏移量
        ConsumerRecords<String, String> records = consumer.poll(100);
        records.forEach(record -> {
            log.info("topic={}, partition={}, offset={}, key={}, value={}",
                    record.topic(), record.partition(), record.offset(), record.key(), record.value());
        });
        // 同步提交当前偏移量
        consumer.commitAsync();
    }
} finally {
    consumer.close();
}
```

### 异步提交
1. **同步提交**，在Broker对提交请求作出响应之前，应用程序会一直**阻塞**，_**限制应用程序的吞吐量**_
    - 可以通过**降低提交频率**来**提升吞吐量**，但如果发生再均衡，会增加重复消息的数量
2. 在**成功提交**或碰到**无法恢复的错误**之前，`commitSync()`会**一直重试**，但是`commitAsync()`不会
    - 不进行重试的原因：_**在它收到服务器响应的时候，可能有一个更大的偏移量已经提交成功**_
3. `commitAsync()`支持**回调**，在Broker作出响应时会执行回调（通常用于记录提交错误或生成度量指标）
    - 如果用**回调**来进行**重试**，一定要注意_**提交的顺序**_
    - 使用一个**单调递增的序列号**来维护**异步提交的顺序**
    - 在每次**提交偏移量之后**或者在**回调里提交偏移量时**递增序列号
    - 在进行重试前，先检查**回调的序列号**和**即将提交的偏移量**是否相等
        - 如果**相等**，说明没有新的提交，那么可以安全地进行**重试**
        - 如果**回调序列号比较大**，说明有一个新的提交已经发送出去了，应该**停止重试**

```java
consumer.subscribe(Collections.singletonList(TOPIC));
while (true) {
    ConsumerRecords<String, String> records = consumer.poll(100);
    for (ConsumerRecord<String, String> record : records) {
        log.info("topic={}, partition={}, offset={}, key={}, value={}",
                record.topic(), record.partition(), record.offset(),
                record.key(), record.value());
    }
    // 异步提交
    consumer.commitAsync((offsets, exception) -> {
        if (exception != null) {
            log.error("Commit failed for offsets " + offsets, exception);
        }
    });
}
```

### 组合提交（同步+异步）
1. 一般情况下，偶尔出现的提交失败，不进行重试不会有太大问题
2. 如果这是发生在**关闭消费者**或者**再均衡前**的**最后一次提交**，那么就要_**确保能够提交成功**_

```java
consumer.subscribe(Collections.singletonList(TOPIC));
try {
    while (true) {
        ConsumerRecords<String, String> records = consumer.poll(100);
        for (ConsumerRecord<String, String> record : records) {
            log.info("topic={}, partition={}, offset={}, key={}, value={}",
                    record.topic(), record.partition(), record.offset(),
                    record.key(), record.value());
        }
        // 异步提交，速度更快，如果这次提交失败，下一次提交很有可能会成功
        consumer.commitAsync((offsets, exception) -> {
            if (exception != null) {
                log.error("Commit failed for offsets " + offsets, exception);
            }
        });
    }
} catch (Exception e) {
    log.error("Unexpected error", e);
} finally {
    try {
        // 一直重试，直到提交成功或者发生无法恢复的错误
        consumer.commitSync();
    } finally {
        // 如果直接关闭消费者，就没有所谓的下一次提交了
        consumer.close();
    }
}
```

### 提交特定的偏移量
1. 提交偏移量的频率和处理消息批次的频率是一样的
2. `commitSync()`和`commitAsync()`，只会提交**最后一个偏移**，而此时该批次里的部分消息可能还没处理
3. 如果需要提交特定的偏移量，需要**跟踪所有分区的偏移量**

```java
consumer.subscribe(Collections.singletonList(TOPIC));
// 用于追踪偏移量的Map
Map<TopicPartition, OffsetAndMetadata> currentOffsets = Maps.newHashMap();
int count = 0;
while (true) {
    ConsumerRecords<String, String> records = consumer.poll(100);
    for (ConsumerRecord<String, String> record : records) {
        log.info("topic={}, partition={}, offset={}, key={}, value={}",
                record.topic(), record.partition(), record.offset(), record.key(), record.value());
        // 在读取每条记录后，使用期望处理的下一条记录的偏移量更新map里的偏移量
        // 下一次就从这里开始读取消息
        TopicPartition topicPartition = new TopicPartition(record.topic(), record.partition());
        OffsetAndMetadata offsetAndMetadata = new OffsetAndMetadata(record.offset() + 1, "no metadata");
        currentOffsets.put(topicPartition, offsetAndMetadata);
        if (count++ % 1000 == 0) {
            // 每处理1000条记录就提交一次偏移量
            // 提交特定偏移量时，仍然要处理可能发生的错误（虽然这里的OffsetCommitCallback虽然为null）
            consumer.commitAsync(currentOffsets, null);
        }
    }
}
```

## 再均衡监听器
1. 消费者在**退出消费者群组**和进行**分区再均衡**之前，会做一些清理工作
    - 在消费者**失去对一个分区的所有权之前**提交**最后一个已处理**记录的**偏移量**
    - 如果消费者准备了一个缓冲区用于处理偶发的事件，那么在失去分区所有权之前，需要处理在缓冲区累积下来的记录
    - 关闭文件句柄，数据库连接
2. 在为消费者**分配新分区**或者**移除旧分区**时，可以通过消费者API执行一些动作
    - 在调用`subscribe()`方法传进去一个`ConsumerRebalanceListener`实例
    - `onPartitionsRevoked`
        - 在**消费者停止读取消息之后**和**再均衡开始之前**被调用
        - 如果在这里提交偏移量，下一个接管分区的消费者就知道该从哪里开始读取
    - `onPartitionsAssigned`
        - 在**重新分配分区之后**和**消费者开始读取之前**被调用

```java
Map<TopicPartition, OffsetAndMetadata> currentOffsets = Maps.newHashMap();

class HandleRebalance implements ConsumerRebalanceListener {
    @Override
    public void onPartitionsRevoked(Collection<TopicPartition> partitions) {
        // 如果发生再均衡，需要提交的是最近处理过的偏移量，而不是批次中还在处理的最后一个偏移量
        consumer.commitSync(currentOffsets);
    }

    @Override
    public void onPartitionsAssigned(Collection<TopicPartition> partitions) {
    }
}

try {
    consumer.subscribe(Collections.singletonList("CustomerCountry"), new HandleRebalance());
    while (true) {
        ConsumerRecords<String, String> records = consumer.poll(100);
        for (ConsumerRecord<String, String> record : records) {
            log.info("topic={}, partition={}, offset={}, key={}, value={}",
                    record.topic(), record.partition(), record.offset(),
                    record.key(), record.value());
            // 在读取每条记录后，使用期望处理的下一条记录的偏移量更新map里的偏移量
            // 下一次就从这里开始读取消息
            currentOffsets.put(new TopicPartition(record.topic(), record.partition()),
                    new OffsetAndMetadata(record.offset() + 1, "no metadata"));
        }
        consumer.commitAsync(currentOffsets, null);
    }
} catch (WakeupException e) {
    // 忽略异常，正在关闭消费者
} catch (Exception e) {
    log.error("Unexpected error", e);
} finally {
    try {
        consumer.commitSync(currentOffsets);
    } finally {
        consumer.close();
        log.info("Close consumer successfully!");
    }
}
```

## 从特定偏移量开始处理记录
```java
// org.apache.kafka.clients.consumer.Consumer
// 从分区的起始位置开始读取消息
void seekToBeginning(Collection<TopicPartition> partitions);
// 直接跳到分区的末尾开始读取消息
void seekToEnd(Collection<TopicPartition> partitions);
// 直接跳到特定偏移量
void seek(TopicPartition partition, long offset);
```

```java
private void commitDbTransaction() {
}
private int getOffsetFromDB(TopicPartition partition) {
    return 0;
}
private void storeOffsetInDb(String topic, int partition, long offset) {
}
private void storeRecordInDb(ConsumerRecord<String, String> record) {
}
private void processRecord(ConsumerRecord<String, String> record) {
}

@Test
public void seekTest() {
    class SaveOffsetOnRebalance implements ConsumerRebalanceListener {
        @Override
        public void onPartitionsRevoked(Collection<TopicPartition> partitions) {
            commitDbTransaction();
        }

        @Override
        public void onPartitionsAssigned(Collection<TopicPartition> partitions) {
            partitions.forEach(partition -> consumer.seek(partition, getOffsetFromDB(partition)));
        }
    }
    consumer.subscribe(Collections.singletonList(TOPIC), new SaveOffsetOnRebalance());
    consumer.assignment().forEach(partition -> consumer.seek(partition, getOffsetFromDB(partition)));
    while (true) {
        ConsumerRecords<String, String> records = consumer.poll(100);
        records.forEach(record -> {
            processRecord(record);
            // 同一个事务
            storeRecordInDb(record);
            storeOffsetInDb(record.topic(), record.partition(), record.offset());
        });
        commitDbTransaction();
    }
}
```

## 退出
```java
// ShutdownHook运行在单独的线程里，所以退出循环最安全的方式是调用wakeup()
Runtime.getRuntime().addShutdownHook(new Thread() {
    @Override
    public void run() {
        // wakeup()是消费者唯一一个可以从其他线程里安全调用的方法
        // 调用wakeup()可以退出poll()，并抛出WakeupException
        //  WakeupException不需要处理，这只是跳出循环的一种方式
        // 在退出线程之前调用close()是很有必要的
        //  close()方法会提交任何还没有提交的东西，并向群组协调器发送消息，告知自己要离开群组
        //  接下来就会触发再均衡，不需要等待会话超时
        consumer.wakeup();
        try {
            // 主线程
            join();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }
});
try {
    // 循环，直到按下CTRL+C，关闭的钩子会在退出时进行清理
    while (true) {
        ConsumerRecords<String, String> records = consumer.poll(100);
        records.forEach(record -> {
            // process
        });
        consumer.assignment().forEach(partition -> {
        });
        consumer.commitSync();
    }
} catch (WakeupException e) {
    // ignore
} finally {
    // 退出之前，确保彻底关闭了消费者
    consumer.close();
}
```

## 反序列化器
1. 对于开发者而言
    - 必须明确写入主题的消息使用的是哪一种序列化器
    - 并确保每个主题里只包含能够被反序列化器解析的数据

### 自定义序列化器
1. 不推荐使用**自定义序列化器**和**自定义反序列化器**，它们把生产者和消费者**耦合**在一起，很**脆弱**，容易出错
2. 推荐使用标准的消息格式，如`JSON`、`Thrift`、`Protobuf`和`Avro`

```java
Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("group.id", GROUP_ID);
props.put("key.deserializer", StringDeserializer.class.getName());
// 自定义的反序列化器
props.put("value.deserializer", CustomerDeserializer.class);
Consumer<Object, Object> consumer = new KafkaConsumer<>(props);
consumer.subscribe(Collections.singletonList(TOPIC));
while (true) {
    ConsumerRecords<Object, Object> records = consumer.poll(100);
    records.forEach(record -> {
        // process
    });
}
```
```java
@Data
@AllArgsConstructor
class Customer {
    private int id;
    private String name;
}

class CustomerDeserializer implements Deserializer<Customer> {
    @Override
    public void configure(Map<String, ?> configs, boolean isKey) {
        // 不做任何配置
    }

    @Override
    public Customer deserialize(String topic, byte[] data) {
        try {
            if (data == null) {
                return null;
            }
            if (data.length < 8) {
                throw new SerializationException("Size of received is shorter than expected");
            }
            ByteBuffer buffer = ByteBuffer.wrap(data);
            int id = buffer.getInt();
            int nameSize = buffer.getInt();
            byte[] nameBytes = new byte[nameSize];
            buffer.get(nameBytes);
            String deserializedName = new String(nameBytes, StandardCharsets.UTF_8);
            return new Customer(id, deserializedName);
        } catch (Exception e) {
            // log
            return null;
        }
    }

    @Override
    public void close() {
    }
}
```

## 独立消费者
1. 场景
    - 只需要一个消费者从一个主题的**所有分区**或者某个**特定分区**读取数据
    - 此时不再需要**消费者群组**和**再均衡**
    - 只需要把主题或者分区分配给消费者，然后开始读取消息并提交偏移量
2. 这时不再需要订阅主题，取而代之的是**消费者为自己分配分区**
3. 一个消费者可以**订阅主题**（并加入消费者群组），或者为自己**分配分区**，但这两个动作是**互斥**的

```java
// 向集群请求主题可用的分区，如果只读取特定分区，跳过这一步
List<PartitionInfo> partitionInfoList = consumer.partitionsFor(TOPIC);
if (partitionInfoList != null) {
    List<TopicPartition> partitions = Lists.newArrayList();
    partitionInfoList.forEach(partitionInfo -> {
        partitions.add(new TopicPartition(partitionInfo.topic(), partitionInfo.partition()));
    });
    // 知道哪些分区后，调用assign()方法
    // 不会发生再均衡，也不需要手动查找分区
    // 但是如果主题增加了新的分区，消费者并不会收到通知
    //  因此需要周期性地调用consumer.partitionsFor()来检查是否有新分区加入
    //  要么在添加新分区后重启应用程序
    consumer.assign(partitions);
}
while (true) {
    ConsumerRecords<String, String> records = consumer.poll(100);
    records.forEach(record -> {
        // process
    });
    consumer.commitSync();
}
```

<!-- indicate-the-source -->
