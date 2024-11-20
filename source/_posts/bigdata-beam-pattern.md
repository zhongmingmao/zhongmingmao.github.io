---
title: Beam - Pattern
mathjax: true
date: 2024-09-29 00:06:25
cover: https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/bigdata-beam-pattern.webp
categories:
  - Big Data
  - Beam
tags:
  - Big Data
  - Beam
---

# Copier Pattern

> 每个**数据处理模块**的**输入**都是**相同**的，并且每个**数据处理模块**都可以**单独**并且**同步**地运行处理

![b226e637e8cba5f7c3ef938684526373](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/b226e637e8cba5f7c3ef938684526373.webp)

<!-- more -->

```java
PCollection<Video> videoDataCollection = ...;

//  生成高画质视频
PCollection<Video> highResolutionVideoCollection = videoDataCollection.apply("highResolutionTransform", ParDo.of(new DoFn<Video, Video>(){
  @ProcessElement
  public void processElement(ProcessContext c) {
    c.output(generateHighResolution(c.element()));
  }
}));

//  生成低画质视频
PCollection<Video> lowResolutionVideoCollection = videoDataCollection.apply("lowResolutionTransform", ParDo.of(new DoFn<Video, Video>(){
  @ProcessElement
  public void processElement(ProcessContext c) {
    c.output(generateLowResolution(c.element()));
  }
}));

// 生成GIF动画
PCollection<Image> gifCollection = videoDataCollection.apply("gifTransform", ParDo.of(new DoFn<Video, Image>(){
  @ProcessElement
  public void processElement(ProcessContext c) {
    c.output(generateGIF(c.element()));
  }
}));

//  生成视频字幕
PCollection<Caption> captionCollection = videoDataCollection.apply("captionTransform", ParDo.of(new DoFn<Video, Caption>(){
  @ProcessElement
  public void processElement(ProcessContext c) {
    c.output(generateCaption(c.element()));
  }
}));

//   分析视频
PCollection<Report> videoAnalysisCollection = videoDataCollection.apply("videoAnalysisTransform", ParDo.of(new DoFn<Video, Report>(){
  @ProcessElement
  public void processElement(ProcessContext c) {
    c.output(analyzeVideo(c.element()));
  }
}));
```

# Filter Pattern

> 一个数据处理模块将输入的数据集过滤，留下**符合条件**的数据，然后传输到下一个数据处理模块进行单独处理

![47498fc9b2d41c59ffb286d84c4f220f](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/47498fc9b2d41c59ffb286d84c4f220f.webp)

```java
PCollection<User> userCollection = ...;

PCollection<User> diamondUserCollection = userCollection.apply("filterDiamondUserTransform", ParDo.of(new DoFn<User, User>(){
  @ProcessElement
  public void processElement(ProcessContext c) {
    if (isDiamondUser(c.element()) {
      c.output(c.element());
    }
  }
}));

PCollection<User> notifiedUserCollection = userCollection.apply("notifyUserTransform", ParDo.of(new DoFn<User, User>(){
  @ProcessElement
  public void processElement(ProcessContext c) {
    if (notifyUser(c.element()) {
      c.output(c.element());
    }
  }
}));
```

# Splitter Pattern

> 与 Filter Pattern 不同，不会丢弃任何数据，而是将数据**分组**处理

![c5d84c2aab2e02cc6e1d2e9f7c40e185](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/c5d84c2aab2e02cc6e1d2e9f7c40e185.webp)

> 使用 **side input/side output** 技术，把用户群组定义成不同的 PCollection

```java
// 首先定义每一个output的tag
final TupleTag<User> fiveStarMembershipTag = new TupleTag<User>(){};
final TupleTag<User> goldenMembershipTag = new TupleTag<User>(){};
final TupleTag<User> diamondMembershipTag = new TupleTag<User>(){};

PCollection<User> userCollection = ...;

PCollectionTuple mixedCollection =
    userCollection.apply(ParDo
        .of(new DoFn<User, User>() {
          @ProcessElement
          public void processElement(ProcessContext c) {
            if (isFiveStartMember(c.element())) {
              c.output(c.element());
            } else if (isGoldenMember(c.element())) {
              c.output(goldenMembershipTag, c.element());
            } else if (isDiamondMember(c.element())) {
    c.output(diamondMembershipTag, c.element());
  }
          }
        })
        .withOutputTags(fiveStarMembershipTag,
                        TupleTagList.of(goldenMembershipTag).and(diamondMembershipTag)));

// 分离出不同的用户群组
mixedCollection.get(fiveStarMembershipTag).apply(...);

mixedCollection.get(goldenMembershipTag).apply(...);

mixedCollection.get(diamondMembershipTag).apply(...);
```

# Joiner Pattern

> 将多个不同的数据集合成一个总数据集，一并进行处理

![1c4bc9aaebc908633da174ba847999ed](https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/1c4bc9aaebc908633da174ba847999ed.jpg)

```java
PCollectionList<Image> collectionList = PCollectionList.of(internalImages).and(thirdPartyImages);
PCollection<Image> mergedCollectionWithFlatten = collectionList
    .apply(Flatten.<Image>pCollections());

mergedCollectionWithFlatten.apply(...);
```

1. 使用 Beam **合并**多个 PCollection 时，用到了 Beam 自带的 **Flatten Transform**
2. **Flatten** Transform - 把来自多个 PCollection **类型一致**的元素**融合**到一个 PCollection 中

