---
title: Java并发 -- CompletionService
date: 2019-05-16 07:56:20
categories:
    - Java
    - Concurrent
tags:
    - Java
    - Java Concurrent
---

## 场景
```java
// 从3个电商询价，保存到数据库，串行执行，性能很慢
int p1 = getPriceByS1();
save(p1);
int p2 = getPriceByS2();
save(p2);
int p3 = getPriceByS3();
save(p3);
```

<!-- more -->

## ThreadPoolExecutor + Future
```java
ExecutorService pool = Executors.newFixedThreadPool(3);
Future<Integer> f1 = pool.submit(() -> getPriceByS1());
Future<Integer> f2 = pool.submit(() -> getPriceByS2());
Future<Integer> f3 = pool.submit(() -> getPriceByS3());

int p1 = f1.get(); // 阻塞，如果f2.get()很快，但f1.get()很慢，依旧需要等待
pool.execute(() -> save(p1));
int p2 = f2.get();
pool.execute(() -> save(p2));
int p3 = f3.get();
pool.execute(() -> save(p3));
```

## BlockingQueue
```java
ExecutorService pool = Executors.newFixedThreadPool(3);
Future<Integer> f1 = pool.submit(() -> getPriceByS1());
Future<Integer> f2 = pool.submit(() -> getPriceByS2());
Future<Integer> f3 = pool.submit(() -> getPriceByS3());

BlockingQueue<Integer> queue = new LinkedBlockingQueue<>();
pool.execute(() -> {
    try {
        // 先执行完先入队
        queue.put(f1.get());
    } catch (Exception ignored) {
    }
});

pool.execute(() -> {
    try {
        queue.put(f2.get());
    } catch (Exception ignored) {
    }
});

pool.execute(() -> {
    try {
        queue.put(f3.get());
    } catch (Exception ignored) {
    }
});

for (int i = 0; i < 3; i++) {
    int price = queue.take();
    pool.execute(() -> save(price));
}
```

## CompletionService
1. CompletionService的实现原理：内部维护了一个**阻塞队列**，把任务执行结果的**Future对象**加入到阻塞队列中
2. CompletionService的实现类是ExecutorCompletionService

### 构造函数
```java
// 默认使用无界的LinkedBlockingQueue
public ExecutorCompletionService(Executor executor);
public ExecutorCompletionService(Executor executor, BlockingQueue<Future<V>> completionQueue);
```

### 简单使用
```java
ExecutorService pool = Executors.newFixedThreadPool(3);
CompletionService service = new ExecutorCompletionService(pool);
// 异步执行
pool.submit(() -> getPriceByS1());
pool.submit(() -> getPriceByS2());
pool.submit(() -> getPriceByS3());
for (int i = 0; i < 3; i++) {
    // take会阻塞线程，先执行完先消费
    Object price = service.take().get();
    pool.execute(() -> {
        try {
            save((Integer) price);
        } catch (Exception ignored) {
        }
    });
}
```

### take + poll
```java
// 如果阻塞队列为空，线程阻塞
public Future<V> take() throws InterruptedException;
// 如果阻塞队列为空，返回null
public Future<V> poll();
// 等待一段时间，阻塞队列依然为空，返回null
public Future<V> poll(long timeout, TimeUnit unit) throws InterruptedException;
```

### Forking Cluster
支持**并行**地调用多个查询服务，只要有一个成功返回结果，整个服务就可以返回了，利用CompletionService可以实现
```java
ExecutorService pool = Executors.newFixedThreadPool(3);
CompletionService<Integer> service = new ExecutorCompletionService<>(pool);
List<Future<Integer>> futures = new ArrayList<>(3);

futures.add(service.submit(() -> geoCoderByS1()));
futures.add(service.submit(() -> geoCoderByS2()));
futures.add(service.submit(() -> geoCoderByS3()));

try {
    // 获取第一个返回（take会阻塞）
    Integer price = service.take().get();
} catch (Exception ignored) {
    // 取消所有任务
    for (Future<Integer> future : futures) {
        future.cancel(true);
    }
}
```

## 小结
1. CompletionService的应用场景：_**批量提交异步任务**_
2. CompletionService将线程池**Executor**和阻塞队列**BlockingQueue**融合在一起，使得批量异步任务的管理更简单
3. CompletionService能够让异步任务的执行结果有序化，**先执行完的先进入阻塞队列**，避免无谓的等待

<!-- indicate-the-source -->
