---
title: Java并发 -- Guava RateLimiter
date: 2019-05-27 10:05:05
categories:
    - Java Concurrent
tags:
    - Java Concurrent
---

## RateLimiter
```java
// 限流器流速：2请求/秒
RateLimiter limiter = RateLimiter.create(2.0);
ExecutorService pool = Executors.newFixedThreadPool(1);
final long[] prev = {System.nanoTime()};
for (int i = 0; i < 20; i++) {
    // 限流器限流
    limiter.acquire();
    pool.execute(() -> {
        long cur = System.nanoTime();
        System.out.println((cur - prev[0]) / 1000_000);
        prev[0] = cur;
    });
}
// 输出
//  499
//  499
//  497
//  502
//  496
```

<!-- more -->

## 令牌桶算法
1. Guava RateLimiter采用的是**令牌桶算法**，核心思想：_**通过限流器的前提是拿到令牌**_
2. **令牌桶算法**
    - 令牌以**固定的速率**添加到令牌桶中，假设限流的速率为r/s，则令牌每1/r秒会添加一个
    - 假设令牌桶的容量是b，如果令牌桶已满，则新的令牌会被**丢弃**
        - b是burst的简写，意义是限流器**允许的最大突发流量**
        - 例如b=10，且令牌桶中的令牌已满，此时限流器允许10个请求同时通过限流器，这只是突发流量
    - 请求能通过限流器的前提是**令牌桶中有令牌**

### 生产者-消费者
1. 一个生产者定时向阻塞队列中添加令牌，消费者线程从阻塞队列中获得令牌，才允许通过限流器
2. 用生产者-消费者实现限流器的方案仅适用于并发量不大的场景，但实际情况是使用限流器的场景大部分都是**高并发**场景
3. 主要问题是**定时器**，在**高并发**场景下，当系统压力已经临近**极限**的时候，定时器的**精度误差**会非常大
    - 另外定时器本身也会创建**调度线程**，也会对系统的性能产生影响

### Guava
1. Guava实现令牌桶算法：_**记录并动态计算下一令牌发放的时间**_
2. 假设令牌桶的容量为b=1，限流速率为r=1/s

#### 简要分析

##### Case 1
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-guava-token-bucket-c1s1.png" width=800/>
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-guava-token-bucket-c1s2.png" width=800/>
1. 当前令牌桶中没有令牌，下一令牌的发放时间在第3秒，而在第2秒的时候线程T1请求令牌
2. 线程T1需要等待1秒，由于原本在第3秒发放的令牌已经被线程T1**预占**了，下一个令牌发放的时间也需要增加1秒

##### Case 2
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-guava-token-bucket-c2s1.png" width=800/>
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-guava-token-bucket-c2s2.png" width=800/>
1. 假设T1在预占第3秒的令牌后，马上又有一个线程T2请求令牌
2. 由于下一个令牌产生的时间是第4秒，所以线程T2需要等待2秒才能获得令牌
3. 由于T2预占了第4秒的令牌，所以下一令牌产生的时间还要增加1秒

##### Case 3
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-guava-token-bucket-c3s1.png" width=800/>
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-guava-token-bucket-c3s2.png" width=800/>
1. 假设在线程T1请求令牌之后的5秒，也就是第7秒，线程T3请求令牌
2. 由于在第5秒已经产生了一个令牌，此时线程T3可以直接拿到令牌，无需等待
3. 在第7秒，实际上限流器能产生3个令牌，分别在第5、6、7秒各产生一个令牌
    - 但由于令牌桶的容量为1，所以第6、7秒产生的令牌丢弃了（也可以认为丢弃的是第5、6秒产生的令牌）
4. 因此，下一个令牌的产生时间应该是第8秒

#### 代码实现
```java
public class SimpleLimiter {
    // 令牌发放间隔
    private static final long INTERVAL = 1000_000_000;
    // 下一令牌发放时间
    private long next = System.nanoTime();

    // 预占令牌，返回能够获取令牌的时间
    private synchronized long reserve(long now) {
        if (now > next) {
            // 请求时间在下一令牌产生时间之后
            // 重新计算下一令牌产生时间
            next = now;
        }
        // 能够获取令牌的时间
        long at = next;
        // 更新下一个令牌产生的时间
        next += INTERVAL;
        // 返回线程需要等待的时间
        return Math.max(at, 0L);
    }

    // 申请令牌
    public void acquire() {
        long now = System.nanoTime();
        // 预占令牌
        long at = reserve(now);
        long waitTime = Math.max(at - now, 0);
        if (waitTime > 0) {
            try {
                TimeUnit.NANOSECONDS.sleep(waitTime);
            } catch (InterruptedException ignored) {
            }
        }
    }
}
```

## 小结
1. 经典的限流算法有两个：一个是**令牌桶算法**（Token Bucket），另一个是**漏桶算法**（Leaky Bucket）
2. 令牌桶算法：定时向令牌桶发放令牌，请求能够从令牌桶中拿到令牌，然后才能通过限流器
3. 漏桶算法：请求就像水一样注入漏桶，漏桶会按照一定的速率自动将水漏掉
    - 只有漏桶里还能注入水的时候，请求才能通过限流器
4. 令牌桶算法和漏桶算法很像一个硬币的正反面

<!-- indicate-the-source -->
