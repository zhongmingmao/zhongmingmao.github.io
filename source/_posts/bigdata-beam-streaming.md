---
title: Beam - Streaming
mathjax: true
date: 2024-10-04 00:06:25
cover: https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/bigdata-beam-streaming.jpg
categories:
  - Big Data
  - Beam
tags:
  - Big Data
  - Beam
---

# 有界数据 vs 无界数据

1. 在 Beam 中，可以用**同一个 Pipeline** 处理**有界数据**和**无界数据**
2. 无论是**有界数据**还是**无界数据**，在 Beam 中，都可以用**窗口**把数据按**时间**分割成一些**有限大小**的集合
   - 对于**无界**数据，**必须**使用**窗口**对数据进行**分割**，然后对每个窗口内的数据集进行处理

<!-- more -->

# 读取无界数据

> withLogAppendTime - 使用 Kafka 的 **log append time** 作为 PCollection 的时间戳

```java
    Pipeline pipeline = Pipeline.create();
    pipeline.apply(
        KafkaIO.<String, String>read()
            .withBootstrapServers("broker_1:9092,broker_2:9092")
            .withTopic("shakespeare") // use withTopics(List<String>) to read from multiple topics.
            .withKeyDeserializer(StringDeserializer.class)
            .withValueDeserializer(StringDeserializer.class)
            .withLogAppendTime());
```

# PCollection + Timestamp

1. 一般情况下，**窗口**的使用场景中，**时间戳**都是**原生**的
   - 从 Kafka 读取消息记录，每一条 **Kafka 消息**都有时间戳
2. Beam 允许**手动**给 PCollection 中的**元素**添加时间戳

```
2019-07-05:  HAMLET

2019-07-06: ACT I

2019-07-06:  SCENE I  Elsinore. A platform before the castle.

2019-07-07:   [FRANCISCO at his post. Enter to him BERNARDO]

2019-07-07: BERNARDO  Who's there?

2019-07-07: FRANCISCO  Nay, answer me: stand, and unfold yourself.
```

> outputWithTimestamp - 对每一个 PCollection 中的元素附上它所对应的时间戳

```java
static class ExtractTimestampFn extends DoFn<String, String> {
  @ProcessElement
  public void processElement(ProcessContext c) {
    String extractedLine = extractLine(c.element());
    Instant timestamp =
      new Instant(extractTimestamp(c.element());

    c.outputWithTimestamp(extractedLine, timestamp);
  }
}
```

# PCollection + Window

1. 在**无界数据**的应用场景中，时间戳往往是数据记录**自带**的
2. 在**有界数据**的应用场景中，时间戳往往需要**指定**的
3. PCollection 元素有了时间戳后，就能根据时间戳应用**窗口**对数据进行划分 - 固定、滑动、会话
4. 将特定的窗口应用到 PCollection 上，同样使用 PCollection 的 apply 方法

```java
PCollection<String> windowedWords = input
  .apply(Window.<String>into(
    FixedWindows.of(Duration.standardMinutes(options.getWindowSize()))));
```

# 复用 DoFn 和 PTransform

1. Beam 的 Transform **不区分**有界数据还是无界数据，可以**直接复用**
2. 应用了**窗口**后，Beam 的 **Transform** 是在每个**窗口内**进行数据处理

```java
PCollection<KV<String, Long>> wordCounts = windowedWords.apply(new WordCount.CountWords());
```

# 输出无界数据

> 输出结果也是**针对每个窗口**的

```java
pipeline.apply("Write to PubSub", PubsubIO.writeStrings().to(options.getOutputTopic()));
```

