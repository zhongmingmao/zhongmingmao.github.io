---
title: New Java Feature - Flow
mathjax: true
date: 2025-01-15 00:06:25
cover: https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/java-flow.webp
categories:
  - Java
  - Feature
tags:
  - Java
  - Java Feature
---

# 指令式编程

> 最常用的**代码控制**模式

```java
System.out.println("Hello, World!");
```

1. **通过代码发布指令**，然后等待指令的**执行**以及指令执行带来的**状态变化**
2. 并且根据目前的状态，来确定**下一次**要发布的指令，并且用**代码**把**下一个指令**表示出来

<!-- more -->

> 指令式编程模型关注的重点在于**控制状态**

```java
try {
    Digest messageDigest = Digest.of("SHA-256");
    byte[] digestValue =
            messageDigest.digest("Hello, world!".getBytes());
} catch (NoSuchAlgorithmException ex) {
    System.out.println("Unsupported algorithm: SHA-256");
}
```

1. 首先调用 Digest.of 方法，得到一个 Digest 实例
2. 然后调用该实例的方法 Digest.digest 获得一个返回值
3. 第一个方法执行完成后，获得了第一个方法执行后的**状态**，第二个方法才能接着执行

> 这种**顺序执行**的模式，逻辑简单直接

1. 常用于**精确控制**
2. 该模式在**通用编程语言设计**和一般的**应用程序开发**中，占据着**压倒性的优势**

> 缺陷

1. 该模式需要**维护和同步状态**
2. 如果**状态数量大**，就要将大的代码块**分解**成小的代码块 - 代码**更容易理解**并且**更容易维护**
3. 更大的问题来自于 - **状态同步**需要的**顺序执行**
   - Digest.of - 效率很高，执行很快；而 Digest.digest - 效率欠佳，毫秒级甚至是秒级的
   - 在要求**低延迟高并发**的环境下，**等待** Digest.digest 调用的返回结果，并不是一个很好的选择
   - **阻塞**在方法的调用上，增加了系统的**延迟**，降低了系统能够支持的**吞吐量** - **Node.js**

> 优化方向 - 使用**非阻塞**的**异步编程**

# 声明式编程

1. **非阻塞**的**异步编程**，并不是可以通过**编程语言**或者**标准类库**就能得到的
2. 支持非阻塞的异步编程，需要**大幅度地更改代码**，转换代码编写的思维习惯 - **回调函数**
3. 当试图使用**回调函数**时，编写代码的**思路**和**模型**都会产生巨大的变化
   - **指令式**编程 - 控制**状态** - 告诉计算机**该怎么做**
   - **声明式**编程 - 控制**目标** - 告诉计算机**要做什么**

> 如果执行成功，则执行 onSuccess 回调函数，否则，继续执行 onFailure 回调函数

```java
public abstract sealed class Digest {

  public static void of(
      String algorithm, Consumer<Digest> onSuccess, Consumer<Integer> onFailure) {}

  public abstract void digest(
      byte[] message, Consumer<byte[]> onSuccess, Consumer<Integer> onFailure);
}
```

1. 有了**回调函数**的设计，代码的**实现方式**就放开了**管制**
2. 无论是回调函数的**实现**，还是回调函数的**调用**，都可以**自由选择**是采用**异步**的模式，还是**同步**的模式
3. 回调函数的天生**缺陷** - 即 **Callback Hell** - 回调堆挤
   - 通常需要布置**多个小任务**，才能完成**一个大任务**，
   - 这些小任务可能是有**因果关系**的任务，此时需要小任务的**配合**，或者**按顺序执行**

> Callback Hell - 两个回调函数的使用，就会**堆积**起来 - 如果回调函数的嵌套增多，**可读性差**，维护难度加大

```java
Digest.of("SHA-256",
    md -> {
        System.out.println("SHA-256 is not supported");
        md.digest("Hello, world!".getBytes(),
            values -> {
                System.out.println("SHA-256 is available");
            },
            errorCode -> {
                System.out.println("SHA-256 is not available");
            });
    },
    errorCode -> {
        System.out.println("Unsupported algorithm: SHA-256");
    });
```

1. 回调函数带来的**形式上的堆积**还可以**克服**，但这种**形式上的堆积**带来了**逻辑上的堆积**那几乎**不可承受**
2. **逻辑上的堆积**，意味着代码的**深度耦合**
   - 深度耦合，意味着**代码维护困难**
   - 深度嵌套里的一点点代码修改，都可能通过嵌套**层层朝上传递**，最后牵动**全局**
3. 使用**回调函数**的**声明式编程模型**有着严重的**场景适用问题**
   - 通常只使用**回调函数**解决**性能影响最大**的模块，而大部分的代码，依然使用传统的，顺序执行的**指令式模型**
4. 业界试图改善**回调函数**的**使用困境**，其中**最为出色**且**影响最大**的是**反应式编程**

# 反应式编程

> 数据流 + 变化传递

1. 反应式编程的基本逻辑，仍然是告诉计算机**要做什么**
2. 但关注点转移到了**数据的变化**和**变化的传递**上 - 转移到了对**数据变化**的**反应**上
3. 反应式编程的核心 - **数据流**和**变化传递**
4. 从数据的**流向角度**来看，数据有两种基本的形式 - **数据的输入**和**数据的输出**
   - 并衍生出三种过程 - **最初的来源**、**数据的传递**、**最终的结局**

## 数据的输出

> 在 Java 的**反应式编程模型**的设计里，数据的输出使用**只有一个参数**的 **Flow.Publisher** 来表示

```java
@FunctionalInterface
public static interface Publisher<T> {
    public void subscribe(Subscriber<? super T> subscriber);
}
```

1. 在 Flow.Publisher 的接口设计里，**泛型 T** 表示的是**数据类型**
2. **数据输出的对象**，使用 **Flow.Subscriber** 来表示
3. 数据的发布者通过**授权**订阅者，来实现数据从发布者到订阅者的**传递**
4. **一个**数据的**发布者**，可以有**多个**数据的**订阅者**
5. 订阅的接口，安排在了 Flow.Publisher 接口
   - 订阅者的**订阅行为**，是由数据的**发布者**发起的，而不是订阅者发起的
6. **数据最初的来源**，就是一种形式的**数据输出**
   - 它只有**数据输出**这个传递方向，而**不能接收数据的输入**

> **数据最初来源**的例子

```java
SubmissionPublisher<byte[]> publisher = new SubmissionPublisher<>();
```

## 数据的输入

> 在 Java 的**反应式编程模型**的设计里，数据的输入用**只有一个参数**的 **Flow.Subscriber** 来表示 - 即**订阅者**

```java
public static interface Subscriber<T> {
    public void onSubscribe(Subscription subscription);

    public void onNext(T item);

    public void onError(Throwable throwable);

    public void onComplete();
}
```

> 在 Flow.Subscriber 的接口设计里，**泛型 T** 表示的是**数据类型**
> 其中定义了 4 种**任务**，分别规定了在 4 种情形下的**反应**

| Task               | Reaction    |
| ------------------ | ----------- |
| 接收到**订阅邀请** | onSubscribe |
| 接收到**数据**     | onNext      |
| 遇到**错误**       | onError     |
| **数据传输完毕**   | onComplete  |

1. **数据最终的结局**，就是一种形式的**数据输入**
2. 它只有**数据输入**这个**传递方向**，而不能产生数据的**输出**

> **数据最终结果**的例子

```java
import java.util.concurrent.Flow;
import java.util.function.Consumer;

public class Destination<T> implements Flow.Subscriber<T> {

  private Flow.Subscription subscription;
  private final Consumer<T> consumer;

  public Destination(Consumer<T> consumer) {
    this.consumer = consumer;
  }

  @Override
  public void onSubscribe(Flow.Subscription subscription) {
    this.subscription = subscription;
    subscription.request(1);
  }

  @Override
  public void onNext(T item) {
    subscription.request(1);
    consumer.accept(item);
  }

  @Override
  public void onError(Throwable throwable) {
    throwable.printStackTrace();
  }

  @Override
  public void onComplete() {
    System.out.println("Done");
  }
}
```

## 数据的控制

1. Flow.Subscriber 和 Flow.Publisher **没有直接联系**，取而代之的是一个中间代理 **Flow.Subscription**
2. Flow.Subscription **管理控制**着 Flow.Publisher 和 Flow.Subscriber 之间的**连接**以及**数据的传递**

> 在 Java 的**反应式编程模型**里，数据的**传递控制**从**数据**和**数据的变化**中**分离**了出来
> 这样的分离，对于**降低功能之间的耦合**意义重大

```java
public static interface Subscription {
    public void request(long n);
    public void cancel();
}
```

1. request - 表示**订阅者希望接收的数据数量**
2. cancel - 表示**订阅者希望取消订阅**

![image-20250806182432660](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250806182432660.png)



## 数据的传递

1. 除了**最初的来源**和**最终的结局**，数据表现还有一个过程，就是**数据的传递**
2. 数据的传递这个过程，既包括**接收输入数据**，也包括**发送输出数据**
3. 在数据传递这个环节，**数据的内容**可能会发生变化，**数据的数量**也可能会发生变化
   - **过滤**掉一部分的数据，或者**修改**输入的数据，甚至替**换掉**输入的数据

> 在 Java 的**反应式编程模型**的设计里，该过程由 **Flow.Processor** 表示
> Flow.Processor 是一个扩展了 **Flow.Publisher** 和 **Flow.Subscriber** 的接口
> Flow.Processor 有两个数据类型，**泛型 T** 表述**输入数据**的类型，**泛型 R** 表述**输出数据**的类型

```java
public static interface Processor<T,R> extends Subscriber<T>, Publisher<R> {
}
```

> 使用**泛型**来表示**输入数据**和**输出数据**的类型
> 然后使用一个 **Function** 函数，表示怎么处理**接收**到的数据，并且输出处理的结果

```java
public class Transform<T, R> extends SubmissionPublisher<R>
        implements Flow.Processor<T, R> {
    private Function<T, R> transform;
    private Flow.Subscription subscription;
    
    public Transform(Function<T, R> transform) {
        super();
        this.transform = transform;
    }
    
    @Override
    public void onSubscribe(Flow.Subscription subscription) {
        this.subscription = subscription;
        subscription.request(1);
    }
    
    @Override
    public void onNext(T item) {
        submit(transform.apply(item));
        subscription.request(1);
    }
    
    @Override
    public void onError(Throwable throwable) {
        closeExceptionally(throwable);
    }
    
    @Override
    public void onComplete() {
        close();
    }
}
```

## 过程的串联

> 数据的表述方式分为**输入**和**输出**两种基本的形式，还衍生出**三种过程**，能够很方便地**串联**起来

```java
private static void transform(byte[] message,
          Function<byte[], byte[]> transformFunction) {
    SubmissionPublisher<byte[]> publisher =
            new SubmissionPublisher<>();

    // Create the transform processor
    Transform<byte[], byte[]> messageDigest =
            new Transform<>(transformFunction);

    // Create subscriber for the processor
    Destination<byte[]> subscriber = new Destination<>(
            values -> System.out.println(
                    "Got it: " + Utilities.toHexString(values)));

    // Chain processor and subscriber
    publisher.subscribe(messageDigest);
    messageDigest.subscribe(subscriber);
    publisher.submit(message);

    // Close the submission publisher.
    publisher.close();
}
```

1. 串联的形式，**解耦**了不同环节的**串联**，而且每个环节的代码可以换个场景**复用**
2. 支持**过程的串联**，是反应式编程模型强大的最大动力之一
3. 像 Scala，甚至把**过程串联**提升到**编程语言**的层面来支持
   - 极大地提高了**编码效率**和代码的**美观程度**

> 解决问题
>
> 1. 解决**顺序执行**的模式带来的**延迟**效果
> 2. 解决**回调函数**带来的**堆挤**问题

```java
Returned<Digest> rt = Digest.of("SHA-256");
switch (rt) {
    case Returned.ReturnValue rv -> {
        // Get the returned value
        if (rv.returnValue() instanceof Digest d) {
            // Call the transform method for the message digest.
            transform("Hello, World!".getBytes(), d::digest);

            // Wait for completion
            Thread.sleep(20000);
        } else {  // unlikely
            System.out.println("Implementation error: SHA-256");
        }
    }
    case Returned.ErrorCode ec ->
            System.out.println("Unsupported algorithm: SHA-256");
}
```

1. 没有类似于**回调函数**一样的**堆挤**现象 - 依赖于**过程串联**
2. Java 的**反应式编程模型**里的**过程串联**和**数据控制**的设计，以及**数据输入**和**数据输出**的**分离** - 降低**代码耦合**
3. Digest.digest 方法可以**直接使用**，为了能够使用反应式编程模型，无需修改 Digest 代码
   - 只需把 Digest 原来的设计和实现，恰当地放到**反应式编程模型**里来，就能实现**异步非阻塞**
4. 与**回调函数**一样，反应式编程既能支持**同步阻塞**的模式，也能够支持**异步非阻塞**的模式
   - **接口实现**是异步非阻塞模式的，那么**接口调用**，也是异步非阻塞的
   - 反应式编程模型的**主要使用场景**，主要还是**异步非阻塞**模式

## 缺陷与对策

1. 最要命的缺陷 - **错误很难排查**，这是**异步编程**的通病
2. 反应式编程模型的**解耦设计**，加剧了**错误排查**的难度，会严重影响**开发效率**，降低代码的**可维护性**

> 协程 - **Fiber**

```java
try {
    Digest messageDigest = Digest.of("SHA-256");
    byte[] digestValue =
            messageDigest.digest("Hello, world!".getBytes());
} catch (NoSuchAlgorithmException ex) {
    System.out.println("Unsupported algorithm: SHA-256");
}
```

1. 在 Java 的**指令式编程模型**里，上述代码要在一个**线程**里执行
   - 在每个方法**返回之前**，线程都会处于**等待**状态
   - 而**线程的等待**，是造成**资源浪费**的最大因素
2. **协程**的处理方式，是**消除了线程的等待**
   - 如果**调用阻塞**，就会把**CPU 资源**切换出去，执行其它操作
   - 这样会节省大量的**计算资源**，使得系统在阻塞的模式下，**支持大规模的并发**
3. 如果**指令式编程模型**能够通过**协程**的方式支持**大规模的并发** - 可以颠覆现有**高并发架构**的新技术







