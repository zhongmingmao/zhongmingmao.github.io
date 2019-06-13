---
title: Java并发 -- Fork + Join
date: 2019-05-17 10:00:40
categories:
    - Java Concurrent
tags:
    - Java Concurrent
---

## 任务视角
1. 线程池+Future：**简单并行任务**
2. CompletableFuture：**聚合任务**
3. CompletionService：**批量并行任务**
4. Fork/Join：_**分治**_

<!-- more -->

## 分治任务模型
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-divide.png" width=800/>

1. 分治任务模型分为两个阶段：任务分解 + 结果合并
2. **任务分解**：将任务迭代地分解为子任务，直至子任务可以**直接计算**出结果
    - 任务和分解后的子任务具有**相似性**（算法相同，只是计算的数据规模不同，往往采用**递归**算法）
3. **结果合并**：逐层合并子任务的执行结果，直至获得最终结果

## Fork/Join

### 概述
1. Fork/Join是**并行计算**的框架，主要用来支持分治任务模型，Fork对应任务分解，Join对应结果合并
2. Fork/Join框架包含两部分：分治任务**ForkJoinTask** + 分治任务线程池**ForkJoinPool**
    - 类似于Runnable + ThreadPoolExecutor
3. ForkJoinTask最核心的方法是**fork**和**join**
    - fork：异步地执行一个子任务
    - join：阻塞当前线程，等待子任务的执行结果
4. ForkJoinTask有两个子类：RecursiveAction + RecursiveTask
    - Recursive：通过**递归**的方式来处理分治任务
    - RecursiveAction.compute：没有返回值
    - RecursiveTask.compute：有返回值

### 简单使用
```java
// 递归任务
@AllArgsConstructor
class Fibonacci extends RecursiveTask<Integer> {
    private final int n;

    @Override
    protected Integer compute() {
        if (n <= 1) {
            return n;
        }
        // 创建子任务
        Fibonacci f1 = new Fibonacci(n - 1);
        f1.fork();
        Fibonacci f2 = new Fibonacci(n - 2);
        f2.fork();
        // 等待子任务结果并合并
        return f1.join() + f2.join();
    }
}

// 创建分治任务线程池
ForkJoinPool pool = new ForkJoinPool(4);
// 创建分治任务
Fibonacci fibonacci = new Fibonacci(30);
// 启动分治任务
System.out.println(pool.invoke(fibonacci)); // 832040
```

### ForkJoinPool的工作原理
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-fork-join-pool.png" width=800/>

1. Fork/Join并行计算的核心组件是ForkJoinPool
2. ThreadPoolExecutor本质上是**生产者-消费者**模式的实现
    - 内部有一个**任务队列**，该任务队列是生产者和消费者通信的媒介
    - ThreadPoolExecutor可以有**多个工作线程**，但这些工作线程都_**共享一个任务队列**_
3. ForkJoinPool本质上也是**生产者-消费者**模式的实现，但更加**智能**
    - ThreadPoolExecutor内部只有一个任务队列，而ForkJoinPool内部有**多个任务队列**
    - 当通过invoke或submit**提交任务**时，ForkJoinPool会根据一定的**路由规则**把任务提交到一个任务队列
        - 如果任务在执行过程中**创建子任务**，那么该子任务被会提交到**工作线程对应的任务队列**中
    - ForkJoinPool支持**任务窃取**，如果工作线程空闲了，那么它会窃取其他任务队列里的任务
    - ForkJoinPool的任务队列是_**双端队列**_
        - 工作线程**正常获取任务**和**窃取任务**分别从任务队列**不同的端**消费，避免不必要的数据竞争

## 统计单词数量
```java
@AllArgsConstructor
class MapReduce extends RecursiveTask<Map<String, Long>> {
    private String[] fc;
    private int start;
    private int end;

    @Override
    protected Map<String, Long> compute() {
        if (end - start == 1) {
            return calc(fc[start]);
        } else {
            int mid = (start + end) / 2;
            // 前半部分数据fork一个递归任务
            MapReduce mr1 = new MapReduce(fc, start, mid);
            mr1.fork();
            // 后半部分数据在当前任务中递归处理
            MapReduce mr2 = new MapReduce(fc, mid, end);
            // 计算子任务，返回合并的结果
            return merge(mr2.compute(), mr1.join());
        }
    }

    // 统计单词数量
    private Map<String, Long> calc(String line) {
        Map<String, Long> result = new HashMap<>();
        String[] words = line.split("\\s+");
        for (String word : words) {
            if (result.containsKey(word)) {
                result.put(word, result.get(word) + 1);
            } else {
                result.put(word, 1L);
            }
        }
        return result;
    }

    // 合并结果
    private Map<String, Long> merge(Map<String, Long> r1, Map<String, Long> r2) {
        Map<String, Long> result = new HashMap<>(r1);
        r2.forEach((word, count) -> {
            if (result.containsKey(word)) {
                result.put(word, result.get(word) + count);
            } else {
                result.put(word, count);
            }
        });
        return result;
    }
}

String[] fc = {"hello world",
        "hello me",
        "hello fork",
        "hello join",
        "fork join in world"};
ForkJoinPool pool = new ForkJoinPool(3);
MapReduce mapReduce = new MapReduce(fc, 0, fc.length);
Map<String, Long> result = pool.invoke(mapReduce);
result.forEach((word, count) -> System.out.println(word + " : " + count));
```

## 小结
1. Fork/Join并行计算框架主要解决的是**分治任务**，分治的核心思想是_**分而治之**_
2. Fork/Join并行计算框架的核心组件是**ForkJoinPool**，支持**任务窃取**，让所有线程的工作量基本**均衡**
3. Java 1.8提供的**Stream API**里的并行流是以ForkJoinPool为基础的
    - 默认情况下，所有并行流计算都**共享一个ForkJoinPool**，该共享的ForkJoinPool的线程数是**CPU核数**
    - 如果存在**IO密集型**的并行流计算，那可能会因为一个很慢的IO计算而影响整个系统的**性能**
    - 因此，建议_**用不同的ForkJoinPool执行不同类型的计算任务**_

<!-- indicate-the-source -->
