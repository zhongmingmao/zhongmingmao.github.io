---
title: Beam - Pipeline Test
mathjax: true
date: 2024-09-30 00:06:25
cover: https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/bigdata-beam-pipeline-test.png
categories:
  - Big Data
  - Beam
tags:
  - Big Data
  - Beam
---

# Context

1. 设计好的 Pipeline 通常需要放在**分布式环境**下执行，具体每一步的 **Transform** 都会被分配到**任意机器**上执行
2. 如果 Pipeline **运行出错**，则需要定位到**具体机器**，再到上面去做**调试**是**不现实**的
3. 另一种办法，读取一些**样本数据集**，再运行整个 Pipeline 去验证哪一步逻辑出错 - **费时费力**
4. 正式将 Pipeline 放在分布式环境上运行之前，需要先**完整地测试整个 Pipeline 逻辑**

<!-- more -->

# Solution

1. Beam 提供了一套**完整的测试 SDK**
   - 可以在开发 Pipeline 的同时，能够实现对一个 **Transform** 逻辑的**单元测试**
   - 也可以对**整个 Pipeline** 的 **End-to-End** 测试
2. 在 Beam 所支持的各种 Runners 中，有一个 **DirectRunner**
   - DirectRunner 即**本地机器**，整个 **Pipeline** 会放在**本地机器**上运行
3. **DoFnTester** - 让用户传入一个**自定义函数**来进行测试 - **UDF** - User Defined Function
   - DoFnTester 接收的对象是用户继承实现的 **DoFn**
4. 不应该将 **DoFn** 当成一个**单元**来进行测试
   - 在 Beam 中，**数据转换**的逻辑都是被抽象成 **Transform**，而不是 Transform 里面的 **ParDo** 的**具体实现**
   - 一个简单的 **Transform** 可以用一个 **ParDo** 来表示
5. 每个 **Runner** 具体**怎么运行**这些 **ParDo**，对用户来说应该是**透明**的
   - 从 Beam **2.4.0** 后，**DoFnTester** 被标记为 **Deprecated**，推荐使用 **TestPipeline**

# Unit

1. 创建 **TestPipeline** 实例
2. 创建一个静态的、用于测试的**输入数据集**
3. 使用 **Create Transform** 来创建一个 **PCollection** 作为**输入数据集**
4. 在测试数据集上调用业务实现的 Transform 并将结果保存在一个 PCollection 上
5. 使用 **PAssert** 类的相关函数来验证输出的 PCollection **是否符合预期**

> 继承 **DoFn** 类来实现一个产生偶数的 **Transform**，输入和输出的数据类型都是 **Integer**

```java
static class EvenNumberFn extends DoFn<Integer, Integer> {
 @ProcessElement
 public void processElement(@Element Integer in, OutputReceiver<Integer> out) {
   if (in % 2 == 0) {
     out.output(in);
   }
 }
}
```

> 创建 **TestPipeline** 实例

```java
...
Pipeline p = TestPipeline.create();
...
```

> 创建**静态输入数据集**

```java
...
static final List<Integer> INPUTS = Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
...
```

> 使用 **Create Transform** 创建 **PCollection**
> Create Transform - 将 **Java Collection** 的数据转换成 Beam 的数据抽象 **PCollection**

```java
...
PCollection<Integer> input = p.apply(Create.of(INPUTS)).setCoder(VarIntCoder.of());
...
```

> 调用**业务 Transform** 的处理逻辑

```java
...
PCollection<String> output = input.apply(ParDo.of(new EvenNumberFn()));
...
```

> 验证输出结果 - **PAssert**

```java
...
PAssert.that(output).containsInAnyOrder(2, 4, 6, 8, 10);
...
```

> 运行 TestPipeline - PAssert 必须在 TestPipeline.run 之前

```java
final class TestClass {
    static final List<Integer> INPUTS = Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);

    public void testFn() {
      Pipeline p = TestPipeline.create();
      PCollection<Integer> input = p.apply(Create.of(INPUTS)).setCoder(VarIntCoder.of());
      PCollection<String> output = input.apply(ParDo.of(new EvenNumberFn()));
      PAssert.that(output).containsInAnyOrder(2, 4, 6, 8, 10);
      p.run();
    }
}
```

# End-to-End

1. 现实应用中，一般都是**多步骤** Pipeline，可能会涉及到**多个输入数据集**，也可能会有**多个输出**
2. 在 Beam 中，**端到端的测试**与 **Transform 的单元测试**非常相似
   - 唯一不同点，需要为**所有的输入数据集**创建**测试集**，而不仅仅只针对一个 Transform
   - 对于 Pipeline 中每个应用到 **Write Transform** 的地方，都需要用到 **PAssert** 来验证数据集

> 步骤

1. 创建 **TestPipeline** 实例
2. 对于**多步骤** Pipeline 的**每个输入数据源**，创建**相对应**的**静态测试数据集**
3. 使用 **Create Transform**，将**所有的静态测试数据集**转换成 **PCollection** 作为**输入数据集**
4. 按照**真实**的 Pipeline 逻辑，调用**所有的 Transforms** 操作
5. 在 Pipeline 中所有应用到 **Write Transform** 的地方，都使用 **PAssert** 来替换 Write Transform
   - 并验证输出的结果**是否符合预期**

