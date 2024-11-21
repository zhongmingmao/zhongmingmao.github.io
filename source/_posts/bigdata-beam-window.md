---
title: Beam - Window
mathjax: true
date: 2024-10-03 00:06:25
cover: https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/bigdata-beam-window.webp
categories:
  - Big Data
  - Beam
tags:
  - Big Data
  - Beam
---

# Window

1. 在 Beam 中，**Window** 将 **PCollection** 里的每个**元素**根据**时间戳**划分成不同的**有限数据集合**
2. 要将一些**聚合操作**应用在 PCollection 上时，或者对不同的 PCollection 进行 **Join** 操作
   - Beam 将这些操作应用在这些被 **Window** 划分好的**不同的数据集**上
3. 无论是**有界数据**还是**无界数据**，Beam 都会按**同样的规则**进行处理
4. 在用 **IO Connector** 读取**有界数据集**的过程中，**Read Transform** 会默认为**每个元素**分配一个**相同的时间戳**
   - 一般情况下，该时间戳为**运行 Pipeline 的时间**，即**处理时间** - **Processing Time**
   - Beam 会为该 Pipeline 默认分配一个**全局窗口** - **Global Window** - 从**无限小**到**无限大**的时间窗口

<!-- more -->

# Global Window

> 可以**显式**将一个**全局窗口**赋予一个**有界数据集**

```java
    PCollection<String> input = p.apply(TextIO.read().from(filepath));
    PCollection<String> batchInputs = input.apply(Window.<String>into(new GlobalWindows()));
```

1. 在处理**有界数据集**时，可以**不用显式**地分配一个**窗口**
2. 在处理**无界数据集**时，**必须显式**地分配一个**窗口**
   - 并且**不能是全局窗口**，否则运行 Pipeline 时会直接报错

# Fixed Window

1. **固定**窗口（**Fixed** Window）也称为**滚动**窗口（**Tumbling** Window）
2. Fixed Window 通常由一个**静态的窗口大小**来定义
3. 一个 PCollection 中的所有**元素**，会根据**自身的时间戳**被分配到相应的固定窗口中
4. 固定窗口本质上**不会重叠**在一起，PCollection 中的**每一个元素**只会落入**唯一一个窗口**

> **Window Transform**

```java
    PCollection<String> input =
        p.apply(KafkaIO.<Long, String>read()).apply(Values.<String>create());
    PCollection<String> fixedWindowedInputs =
        input.apply(Window.<String>into(FixedWindows.of(Duration.standardHours(1))));
```

# Sliding Window

1. 滑动窗口由一个**静态的窗口大小**和一个**滑动周期**来定义
2. Beam 对**滑动周期**的大小**没有做任何限制**
   - **滑动周期 ＜ 滑动窗口**，会有**部分重叠**，在一个 PCollection 中，**同一个元素**会被分配到**不同的滑动窗口**中
   - **滑动周期 = 滑动窗口**，降级为**固定窗口**

> Window Transform

```java
    PCollection<String> input =
        p.apply(KafkaIO.<Long, String>read()).apply(Values.<String>create());
    PCollection<String> slidingWindowedInputs =
        input.apply(
            Window.<String>into(
                SlidingWindows.of(Duration.standardHours(1)).every(Duration.standardMinutes(30))));
```

# Sessions Window

1. 会话窗口**没有一个固定的窗口长度**
2. 会话窗口主要用于记录**持续一段时间**的活动数据集
   - 在一个会话窗口中的数据集，将它里面所有的元素按照**时间戳**来排序
   - **任意相邻**的两个元素，它们的**时间戳相差**不会超过一个定义好的**静态间隔时间**（Gap Duration）

> 假设会话窗口的**静态时间间隔**为 5 分钟
> value1~value3 在第一个会话窗口，而 value4~value5 在第二个会话窗口

```java
(key1, value1, [7:44:00 AM，7:44:00 AM))
(key1, value2, [7:45:00 AM，7:45:00 AM))
(key1, value3, [7:49:00 AM，7:49:00 AM))
(key1, value4, [8:01:00 AM，8:01:00 AM))
(key1, value5, [8:02:00 AM，8:02:00 AM))
```

```java
    PCollection<String> input =
        p.apply(KafkaIO.<Long, String>read()).apply(Values.<String>create());
    PCollection<String> sessionWindowedInputs =
        input.apply(Window.<String>into(Sessions.withGapDuration(Duration.standardMinutes(5))));
```

