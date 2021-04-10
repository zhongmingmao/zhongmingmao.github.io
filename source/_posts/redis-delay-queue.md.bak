---
title: Redis -- 延时队列
mathjax: false
date: 2019-10-03 12:00:13
categories:
    - Storage
    - Redis
tags:
    - Storage
    - Redis
---

## 异步消息队列
Redis的**list**数据结构常用来作为**异步消息队列**使用，使用`rpush/lpush`操作**入队**，使用`lpop/rpop`来操作**出队**
<img src="https://redis-1253868755.cos.ap-guangzhou.myqcloud.com/redis-delay-queue-list.png" width=1000/>

<!-- more -->

```bash
> rpush my-queue apple banana pear
(integer) 3
> llen my-queue
(integer) 3
> lpop my-queue
"apple"
> llen my-queue
(integer) 2
> lpop my-queue
"banana"
> llen my-queue
(integer) 1
> lpop my-queue
"pear"
> llen my-queue
(integer) 0
> lpop my-queue
(nil)
```

## 空队列
1. 如果队列为空，客户端会陷入**pop的死循环**，**空轮询**不仅拉高了**客户端的CPU**，**Redis的QPS**也会被拉高
2. 如果空轮询的客户端有几十个，**Redis的慢查询**也会显著增加，可以尝试让客户端线程`sleep 1s`
3. 但睡眠会导致消息的**延迟增大**，可以使用**`blpop/brpop`**（blocking，**阻塞读**）
    - 阻塞读在队列没有数据时，会立即进入**休眠**状态，一旦有数据到来，会立即被**唤醒**，**消息延迟几乎为0**

## 空闲连接
1. 如果线程一直阻塞在那里，Redis的客户端连接就成了**闲置连接**
2. 闲置过久，**服务器**一般会**主动断开**连接，**减少闲置的资源占用**，此时`blpop/brpop`会**抛出异常**

## 锁冲突处理
1. 分布式锁**加锁失败**的处理策略
    - **直接抛出异常**，通知用户稍后重试
    - **sleep**后再重试
    - 将请求转移到**延时队列**，过一会重试
2. 抛出异常
    - 这种方式比较适合由**用户直接发起**的请求
3. sleep
    - sleep会**阻塞**当前的消息处理线程，从而导致队列的后续消息处理出现**延迟**
    - 如果**碰撞比较频繁**，sleep方案不合适
4. _**延时队列**_
    - 比较适合异步消息处理的场景，通过将当前冲突的请求转移到另一个队列**延后处理**来**避免冲突**

## 延时队列
1. 可以通过Redis的**zset**来实现延时队列
2. 将消息序列化成一个字符串作为zet的`value`，将该消息的**到期处理时间**作为`score`
3. 然后**多线程轮询**zset获取**到期的任务**进行处理
    - 多线程是为了保障**可用性**，但同时要考虑**并发安全**，确保**任务不能被多次执行**

```java
public class RedisDelayingQueue<T> {
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    private static class TaskItem<T> {
        private String id;
        private T msg;
    }

    private Type taskType = new TypeReference<TaskItem<T>>() {
    }.getType();

    private Jedis jedis;
    private String queueKey;

    public RedisDelayingQueue(Jedis jedis, String queueKey) {
        this.jedis = jedis;
        this.queueKey = queueKey;
    }

    public void delay(T msg) {
        TaskItem<T> task = new TaskItem<>(UUID.randomUUID().toString(), msg);
        jedis.zadd(queueKey, System.currentTimeMillis() + 5000, JSON.toJSONString(task));
    }

    public void loop() {
        // 可以进一步优化，通过Lua脚本将zrangeByScore和zrem统一挪到Redis服务端进行原子化操作，减少抢夺失败出现的资源浪费
        while (!Thread.interrupted()) {
            // 只取一条
            Set<String> values = jedis.zrangeByScore(queueKey, 0, System.currentTimeMillis(), 0, 1);
            if (values.isEmpty()) {
                try {
                    Thread.sleep(500);
                } catch (InterruptedException e) {
                    break;
                }
                continue;
            }
            String s = values.iterator().next();
            if (jedis.zrem(queueKey, s) > 0) {
                // zrem是多线程多进程争夺任务的关键
                TaskItem<T> task = JSON.parseObject(s, taskType);
                this.handleMsg(task.msg);
            }
        }
    }

    private void handleMsg(T msg) {
        try {
            System.out.println(msg);
        } catch (Throwable ignored) {
            // 一定要捕获异常，避免因为个别任务处理问题导致循环异常退出
        }
    }

    public static void main(String[] args) {
        final RedisDelayingQueue<String> queue = new RedisDelayingQueue<>(new Jedis("localhost", 16379), "q-demo");
        Thread producer = new Thread() {
            @Override
            public void run() {
                for (int i = 0; i < 10; i++) {
                    queue.delay("zhongmingmao" + i);
                }
            }

        };
        Thread consumer = new Thread() {
            @Override
            public void run() {
                queue.loop();
            }

        };

        producer.start();
        consumer.start();
        try {
            producer.join();
            Thread.sleep(6000);
            consumer.interrupt();
            consumer.join();
        } catch (InterruptedException ignored) {
        }
    }
}
```
