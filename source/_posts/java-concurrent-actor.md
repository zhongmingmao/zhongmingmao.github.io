---
title: Java并发 -- Actor模型
mathjax: false
date: 2019-06-04 12:18:34
categories:
    - Java
    - Concurrent
tags:
    - Java
    - Java Concurrent
    - Actor
    - Akka
---

## Actor模型
1. Actor模型在本质上是一种**计算模型**，基本的计算单元称为Actor，在Actor模型中，所有的计算都在Actor中执行
2. 在面向对象编程里，一切都是对象，在Actor模型里，**一切都是Actor**，并且Actor之间是**完全隔离**的，不会共享任何变量
3. Java本身并不支持Actor模型，如果需要在Java里使用Actor模型，需要借助第三方类库，比较完备的是**Akka**

<!-- more -->

## Hello Actor
```java
public class HelloActor extends UntypedAbstractActor {
    // 该Actor在收到消息message后，会打印Hello message
    @Override
    public void onReceive(Object message) throws Throwable {
        System.out.printf("Hello %s%n", message);
    }

    public static void main(String[] args) {
        // 创建Actor系统，Actor不能脱离ActorSystem存在
        ActorSystem system = ActorSystem.create("HelloSystem");
        // 创建HelloActor
        ActorRef actorRef = system.actorOf(Props.create(HelloActor.class));
        // 发送消息给HelloActor
        actorRef.tell("Actor", ActorRef.noSender());
    }
}
```

## 消息 VS 对象方法
1. Actor模型是**完全异步**的，而对象方法调用是**同步**的
    - Actor内部的工作模式可类比成_**只有一个消费者线程的生产者-消费者模式**_
    - 在Actor模型中，发送消息仅仅是把消息发生出去而已，接收消息的Actor在接收到消息后，也不会立马处理
2. 并发计算 + **分布式计算**
    - 调用对象方法，需要持有对象的引用，并且所有的对象都必须在同一个进程中
    - 在Actor中发送消息，只需要知道对方的地址即可
        - 发送消息和接收消息的Actor可以不在一个进程中，也可以不在同一台机器上
        - 因此Actor模型不但适用于并发计算，也适用于分布式计算

## Actor的规范定义
1. Actor是一种**基础的计算单元**，具体来讲包括三部分能力
    - **处理能力**：处理接收到的消息
    - **存储能力**：Actor可以存储自己的内部状态，并且内部状态在不同Actor之间是绝对隔绝的
    - **通信能力**：Actor可以和其它Actor之间通信
2. 当一个Actor接收到一条消息后，该Actor可以执行三种操作
    - 创建更多的Actor
        - 最终会呈现出一个**树状**结构
    - 发消息给其它Actor
    - 确定如何处理**下一条**消息
        - Actor具备存储能力，有自己的内部状态，可以将Actor看作一个_**状态机**_
        - 可以把Actor处理消息看作触发状态机的状态变化
        - 在Actor模型里，由于是**单线程**处理的，所以在确定下一条消息如何处理是**不存在竟态条件问题**的

## 累加器
```java
public class CounterActor extends UntypedAbstractActor {
    private int counter = 0;

    @Override
    public void onReceive(Object message) throws Throwable {
        if (message instanceof Number) {
            counter += ((Number) message).intValue();
        } else {
            System.out.println(counter);
        }
    }

    // 没有锁，也没有CAS，但程序是线程安全的
    public static void main(String[] args) throws InterruptedException {
        ActorSystem system = ActorSystem.create("CounterSystem");
        ExecutorService pool = Executors.newFixedThreadPool(4);
        ActorRef actorRef = system.actorOf(Props.create(CounterActor.class));
        // 生成4*100_000个消息
        for (int i = 0; i < 4; i++) {
            pool.execute(() -> {
                for (int j = 0; j < 100_000; j++) {
                    actorRef.tell(1, ActorRef.noSender());
                }
            });
        }
        pool.shutdown();
        // 等待actorRef处理完所有消息
        TimeUnit.SECONDS.sleep(5);
        // 打印结果
        actorRef.tell("", ActorRef.noSender()); // 400_000
    }
}
```

## 小结
1. Actor模型是**异步**模型
    - 不保证消息百分百送达
    - 不保证消息送达的顺序与发送的顺序是一致的
    - 不保证消息会被百分百处理
2. 实现Actor模型的厂商都在尝试解决上面三个问题，但解决得并不完美，所以使用Actor模型是有**成本**的
