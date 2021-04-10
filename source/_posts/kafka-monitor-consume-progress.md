---
title: Kafka -- 监控消费进度
mathjax: false
date: 2019-09-12 15:20:35
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

## Consumer Lag
1. Consumer Lag（滞后程度）：**消费者当前落后于生产者的程度**
2. Lag的单位是**消息数**，一般是在**主题**的级别上讨论Lag，但Kafka是在**分区**的级别上**监控**Lag，因此需要手动汇总
3. 对于消费者而言，Lag是**最重要**的监控指标，直接反应了一个消费者的运行情况
    - 一个正常工作的消费者，它的Lag值应该很小，甚至**接近于0**，**滞后程度很小**
    - 如果Lag很大，表明消费者无法跟上生产者的速度，Lag会越来越大
        - 极有可能导致消费者消费的数据已经不在**操作系统的页缓存**中了，这些数据会失去享有**Zero Copy**技术的资格
        - 这样消费者不得不从**磁盘**读取这些数据，这将**进一步拉大**与生产者的差距
        - 马太效应：_**Lag原本就很大的消费者会越来越慢，Lag也会也来越大**_

<!-- more -->

## 监控Lag

### Kafka自带命令
1. `kafka-consumer-groups`是Kafka提供的**最直接**的监控消费者消费进度的工具
    - 也能监控**独立消费者**的Lag，独立消费者是没有使用**消费者组机制**的消费者程序，也要配置`group.id`
    - **消费者组**要调用`KafkaConsumer.subscribe`，**独立消费者**要调用`KafkaConsumer.assign`**直接消费指定分区**
2. 输出信息
    - 消费者组、主题、分区、消费者实例ID、消费者连接Broker的主机名、消费者的CLIENT-ID信息
    - **CURRENT-OFFSET**：消费者组当前最新消费消息的位移值
    - **LOG-END-OFFSET**：每个分区当前最新生产的消息的位移值
    - **LAG**：LOG-END-OFFSET和CURRENT-OFFSET的**差值**

```
$ kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group zhongmingmao

GROUP           TOPIC           PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG             CONSUMER-ID                                     HOST            CLIENT-ID
zhongmingmao    zhongmingmao    1          5               5               0               consumer-1-24d9f1a8-662a-4d20-a360-26a12ddb0902 /192.168.2.1    consumer-1
zhongmingmao    zhongmingmao    0          5               5               0               consumer-1-24d9f1a8-662a-4d20-a360-26a12ddb0902 /192.168.2.1    consumer-1
zhongmingmao    zhongmingmao    4          6               6               0               consumer-1-24d9f1a8-662a-4d20-a360-26a12ddb0902 /192.168.2.1    consumer-1
zhongmingmao    zhongmingmao    3          6               6               0               consumer-1-24d9f1a8-662a-4d20-a360-26a12ddb0902 /192.168.2.1    consumer-1
zhongmingmao    zhongmingmao    2          6               6               0               consumer-1-24d9f1a8-662a-4d20-a360-26a12ddb0902 /192.168.2.1    consumer-1

$ kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group zhongmingmao

Consumer group 'zhongmingmao' has no active members.

GROUP           TOPIC           PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG             CONSUMER-ID     HOST            CLIENT-ID
zhongmingmao    zhongmingmao    1          5               5               0               -               -               -
zhongmingmao    zhongmingmao    0          5               5               0               -               -               -
zhongmingmao    zhongmingmao    4          6               6               0               -               -               -
zhongmingmao    zhongmingmao    3          6               6               0               -               -               -
zhongmingmao    zhongmingmao    2          6               6               0               -               -               -
```

### Kafka Java Consumer API
```java
private Map<TopicPartition, Long> lagOf(String groupId, String bootstrapServers) throws TimeoutException {
    Properties props = new Properties();
    props.put(CommonClientConfigs.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
    try (AdminClient client = AdminClient.create(props)) {
        // 获取给定消费者组的最新消费消息的位移
        ListConsumerGroupOffsetsResult result = client.listConsumerGroupOffsets(groupId);
        try {
            Map<TopicPartition, OffsetAndMetadata> consumedOffsets = result.partitionsToOffsetAndMetadata().get(10, TimeUnit.SECONDS);
            props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false); // 禁止自动提交位移
            props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
            props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
            props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
            try (final KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props)) {
                // 获取订阅分区的最新消息位移
                Map<TopicPartition, Long> endOffsets = consumer.endOffsets(consumedOffsets.keySet());
                return endOffsets.entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey,
                        // 计算Lag
                        entry -> entry.getValue() - consumedOffsets.get(entry.getKey()).offset()));
            }
        } catch (InterruptedException e) {
            // 处理中断异常
            Thread.currentThread().interrupt();
            return Collections.emptyMap();
        } catch (ExecutionException e) {
            return Collections.emptyMap();
        } catch (TimeoutException e) {
            throw new TimeoutException("Timed out when getting lag for consumer group " + groupId);
        }
    }
}

@Test
public void getLagTest() throws TimeoutException {
    lagOf("zhongmingmao", "localhost:9092")
            .forEach((topicPartition, lag) -> log.info("partition: {}, lag: {}", topicPartition, lag));
}
```
```
partition: zhongmingmao-1, lag: 0
partition: zhongmingmao-0, lag: 0
partition: zhongmingmao-4, lag: 0
partition: zhongmingmao-3, lag: 0
partition: zhongmingmao-2, lag: 0
```

### Kafka JMX 监控指标
1. 上面的两种方式，都可以很方便地查询到给定消费者组的Lag信息
2. 但在实际监控场景中，往往需要借助现成的**监控框架**（如**Zabbix/Grafana**）
    - 此时可以选择Kafka默认提供的**JMX监控指标**来监控消费者的Lag值
3. **消费者**提供了`kafka.consumer:type=consumer-fetch-manager-metrics,client-id="{client-id}"`的JMX指标
    - `records-lag-max`和`records-lead-min`分别代表此**消费者**在**测试窗口时间**内曾经达到的**最大Lag值**和**最小Lead值**
    - Lead：消费者**最新消费消息的位移**与**当前分区第一条消息位移**的差值，_**Lag越大，Lead越小**_
    - 一旦监测到**Lead**越来越小，甚至**快接近于0**，预示着消费者端要**丢消息**了
    - Kafka消息是有**留存时间**的，默认是**1周**，如果消费者程序足够慢，慢到它要消费的数据快被Kafka**删除**
        - 一旦出现消息被删除，从而导致消费者程序**重新调整位移值**的情况，可能产生两个后果
        - 一个是消费者**从头消费一遍**数据
        - 另一个是消费者从**最新的消息位移处**开始消费，之前**没来得及消费的消息**全部被**跳过**，造成**丢消息的假象**
    - Lag值从100W增加到200W，远不如Lead值从200减少到100重要，实际生产环境中，要**同时监控Lag值和Lead值**
4. **消费者**还在**分区级别**提供了额外的JMX指标，用于**单独监控**分区级别的Lag和Lead值
    - `kafka.consumer:type=consumer-fetch-manager-metrics,client-id="{client-id}",topic="{topic}",partition="{partition}"`
    - 多了`records-lag-avg`和`records-lead-avg`，可以计算**平均**的Lag值和Lead值，经常使用

<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-consumer-jmx-lag-lead.png" width=1000/>
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-consumer-jmx-partition-lag-lead.png" width=1000/>

## 参考资料
[Kafka核心技术与实战](https://time.geekbang.org/column/intro/100029201)