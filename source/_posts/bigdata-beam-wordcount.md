---
title: Beam - WordCount
mathjax: true
date: 2024-10-02 00:06:25
cover: https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/simple-wordcount-pipeline.png
categories:
  - Big Data
  - Beam
tags:
  - Big Data
  - Beam
---

# 步骤

1. 用 **Pipeline IO** 读取文本
1. 用 **Transform** 对文本进行分词和词频统计
1. 用 **Pipeline IO** 输出结果
1. 将所有步骤打包成一个 **Pipeline**

<!-- more -->

![c6b63574f6005aaa4a6aba366b0a5dcd](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/c6b63574f6005aaa4a6aba366b0a5dcd.jpg)

# 创建 Pipeline

> **默认**情况下，将采用 **DirectRunner** 在本地运行

```java
PipelineOptions options = PipelineOptionsFactory.create();
```

> 一个 Pipeline 实例会构建数据处理的 **DAG**，以及这个 DAG 所需要的 **Transform**

```java
Pipeline p = Pipeline.create(options);
```

# 应用 Transform

> TextIO.Read - 读取外部文件，生成一个 PCollection，包含所有文本行，每个元素都是文本中的一行

```java
    String filepattern =
        "file:///Users/zhongmingmao/workspace/java/hello-beam/corpus/shakespeare.txt";
    PCollection<String> lines = p.apply(TextIO.read().from(filepattern));
```

> 分词

```java
    PCollection<String> words =
        lines.apply(
            "ExtractWords",
            FlatMapElements.into(TypeDescriptors.strings())
                .via((String word) -> Arrays.asList(word.split("[^\\p{L}]+"))));
```

> Count Transform - 把任意一个 PCollection 转换成 **Key-Value** 组合
> **Key** 为原来 PCollection 中**非重复**的元素，**Value** 为元素出现的次数

```java
PCollection<KV<String, Long>> counts = words.apply(Count.<String>perElement());
```

> 将 Key-Value 组成的 PCollection 转换成输出格式

```java
    PCollection<String> formatted =
        counts.apply(
            "FormatResults",
            MapElements.into(TypeDescriptors.strings())
                .via(
                    (KV<String, Long> wordCount) ->
                        wordCount.getKey() + ": " + wordCount.getValue()));
```

> TextIO.Write - 把最终的 PCollection 写进文本，**每个元素**都会被写成文本文件中**独立的一行**

```java
formatted.apply(TextIO.write().to("/tmp/wordcounts"));
```

# 运行 Pipeline

> Pipeline.run - 把 Pipeline 所包含的 Transform **优化**并放到执行的 Runner 上执行 - 默认**异步**执行

```java
p.run().waitUntilFinish();
```

# 代码优化

## 独立 DoFn

> 提高：可读性 + 复用性 + 可测试性

### ExtractWordsFn

```java
import org.apache.beam.sdk.metrics.Counter;
import org.apache.beam.sdk.metrics.Distribution;
import org.apache.beam.sdk.metrics.Metrics;
import org.apache.beam.sdk.transforms.DoFn;

public class ExtractWordsFn extends DoFn<String, String> {

  private final Counter emptyLines = Metrics.counter(ExtractWordsFn.class, "emptyLines");
  private final Distribution lineLenDist =
      Metrics.distribution(ExtractWordsFn.class, "lineLenDistro");

  @DoFn.ProcessElement
  public void processElement(@DoFn.Element String element, OutputReceiver<String> receiver) {
    lineLenDist.update(element.length());
    if (element.trim().isEmpty()) {
      emptyLines.inc();
    }

    // Split the line into words.
    String[] words = element.split("[^\\p{L}]+", -1);
    // Output each word encountered into the output PCollection.
    for (String word : words) {
      if (!word.isEmpty()) {
        receiver.output(word);
      }
    }
  }
}
```

### FormatAsTextFn

```java
import org.apache.beam.sdk.transforms.DoFn;
import org.apache.beam.sdk.values.KV;

public class FormatAsTextFn extends DoFn<KV<String, Long>, String> {

  @DoFn.ProcessElement
  public void processElement(
      @DoFn.Element KV<String, Long> wordCount, DoFn.OutputReceiver<String> receiver) {
    receiver.output(wordCount.getKey() + ": " + wordCount.getValue());
  }
}
```

## PTransform

> PTransform - 整合一些**相关联**的 Transform
> 输入输出类型 - 一连串 Transform 的**最初输入**和**最终输出**

```java
import org.apache.beam.sdk.transforms.Count;
import org.apache.beam.sdk.transforms.PTransform;
import org.apache.beam.sdk.transforms.ParDo;
import org.apache.beam.sdk.values.KV;
import org.apache.beam.sdk.values.PCollection;

public class CountWords extends PTransform<PCollection<String>, PCollection<KV<String, Long>>> {

  @Override
  public PCollection<KV<String, Long>> expand(PCollection<String> lines) {
    // Convert lines of text into individual words.
    PCollection<String> words = lines.apply(ParDo.of(new ExtractWordsFn()));

    // Count the number of times each word occurs.
    PCollection<KV<String, Long>> wordCounts = words.apply(Count.perElement());
    return wordCounts;
  }
}
```

## 参数化 PipelineOptions

```java
import org.apache.beam.sdk.options.Description;
import org.apache.beam.sdk.options.PipelineOptions;
import org.apache.beam.sdk.options.Validation;

public interface WordCountOptions extends PipelineOptions {

  @Description("Path of the file to read from")
  @Validation.Required
  String getInputFile();

  void setInputFile(String value);

  @Description("Path of the file to write to")
  @Validation.Required
  String getOutput();

  void setOutput(String value);
}
```

> main

```java
  public static void main(String[] args) {
    WordCountOptions options =
        PipelineOptionsFactory.fromArgs(args).withValidation().as(WordCountOptions.class);
    Pipeline p = Pipeline.create(options);

    p.apply("ReadLines", TextIO.read().from(options.getInputFile()))
        .apply(new CountWords())
        .apply(ParDo.of(new FormatAsTextFn()))
        .apply("WriteCounts", TextIO.write().to(options.getOutput()));

    p.run().waitUntilFinish();
  }
```

## 单元测试

> 将**数据处理操作**封装成 **DoFn** 和 **PTransform** - 可以独立测试

```java
public class ExtractWordsFnTest {

  @Test
  public void testExtractWordsFn() throws Exception {
    // Use DoFnTester to test the ExtractWordsFn DoFn.
    DoFnTester<String, String> extractWordsFn = DoFnTester.of(new ExtractWordsFn());

    Assert.assertThat(
        extractWordsFn.processBundle(" some  input  words "),
        CoreMatchers.hasItems("some", "input", "words"));
    Assert.assertThat(extractWordsFn.processBundle(" "), CoreMatchers.hasItems());
    Assert.assertThat(
        extractWordsFn.processBundle(" some ", " input", " words"),
        CoreMatchers.hasItems("some", "input", "words"));
  }
}
```



