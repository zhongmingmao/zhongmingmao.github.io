---
title: Java并发 -- 生产者-消费者模式
date: 2019-05-26 19:07:12
categories:
    - Java
    - Concurrent
tags:
    - Java
    - Java Concurrent
---

## 生产者-消费者模式
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-producer-consumer.png" width=800/>


<!-- more -->

1. 生产者-消费者模式的核心是一个_**任务队列**_
    - 生产者线程生产任务，并将任务添加到任务队列中，消费者线程从任务队列中获取任务并执行
2. 从**架构设计**的角度来看，生产者-消费者模式有一个很重要的优点：_**解耦**_
3. 生产者-消费者模式另一个重要的优点是**支持异步**，并且能够**平衡**生产者和消费者的**速度差异**（任务队列）

## 支持批量执行
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-dynamic-sampling-batch-insert.png" width=800/>

1. 往数据库INSERT 1000条数据，有两种方案
    - 第一种方案：用1000个线程并发执行，每个线程INSERT一条数据
    - 第二种方案（更优）：用1个线程，执行一个批量的SQL，一次性把1000条数据INSERT进去
2. 将原来直接INSERT数据到数据库的线程作为生产者线程，而生产者线程只需将数据添加到任务队列
    - 然后消费者线程负责将任务从任务队列中批量取出并批量执行

```java
// 任务队列
private BlockingQueue<Task> queue = new LinkedBlockingQueue<>(2000);

// 启动5个消费者线程，执行批量任务
public void start() {
    ExecutorService pool = Executors.newFixedThreadPool(5);
    for (int i = 0; i < 5; i++) {
        pool.execute(() -> {
            try {
                while (true) {
                    // 获取批量任务
                    List<Task> tasks = pollTasks();
                    // 执行批量任务
                    execTasks(tasks);
                }
            } catch (InterruptedException ignored) {
            }
        });
    }
}

// 从任务队列中获取批量任务
private List<Task> pollTasks() throws InterruptedException {
    List<Task> tasks = new LinkedList<>();
    // 阻塞式获取一个任务
    // 首先采用阻塞式的方式，如果任务队列中没有任务，能够避免无谓的循环
    Task task = queue.take();
    while (task != null) {
        tasks.add(task);
        // 非阻塞式获取一个任务
        task = queue.poll();
    }
    return tasks;
}

// 批量执行任务
private void execTasks(List<Task> tasks) {
}
```

## 支持分阶段提交
1. 写文件如果同步刷盘性能会很慢，对于不是很重要的数据，往往采用**异步刷盘**的方式
2. 异步刷盘的时机
    - ERROR级别的日志需要立即刷盘
    - 数据累积到500条需要立即刷盘
    - 存在未刷盘数据，且5秒钟内未曾刷盘，需要立即刷盘
3. 该日志组件的异步刷盘本质上是一种**分阶段提交**

```java
public class Logger {
    // 批量异步刷新的数量
    private static final int FLUSH_BATCH_SIZE = 500;
    // 任务队列
    private final BlockingQueue<LogMsg> queue = new LinkedBlockingQueue<>();
    // 只需要一个线程写日志
    private ExecutorService pool = Executors.newFixedThreadPool(1);

    // 启动写日志线程
    public void start() throws IOException {
        File file = File.createTempFile("test", ".log");
        FileWriter writer = new FileWriter(file);
        pool.execute(() -> {
            // 未刷盘日志数量
            int curIdx = 0;
            long preFlushTime = System.currentTimeMillis();
            while (true) {
                try {
                    LogMsg logMsg = queue.poll(5, TimeUnit.SECONDS);
                    // 写日志
                    if (logMsg != null) {
                        writer.write(logMsg.toString());
                        ++curIdx;
                    }
                    // 如果不存在未刷盘数据，则无需刷盘
                    if (curIdx <= 0) {
                        continue;
                    }
                    // 异步刷盘规则
                    if (logMsg != null && logMsg.getLevel() == LEVEL.ERROR ||
                            curIdx == FLUSH_BATCH_SIZE ||
                            System.currentTimeMillis() - preFlushTime > 5_000) {
                        writer.flush();
                        curIdx = 0;
                        preFlushTime = System.currentTimeMillis();
                    }
                } catch (InterruptedException | IOException ignored) {
                } finally {
                    try {
                        writer.flush();
                        writer.close();
                    } catch (IOException ignored) {
                    }
                }
            }
        });
    }

    private void info(@NonNull String msg) throws InterruptedException {
        queue.put(new LogMsg(LEVEL.INFO, msg));
    }

    private void error(@NonNull String msg) throws InterruptedException {
        queue.put(new LogMsg(LEVEL.ERROR, msg));
    }
}

@Data
@AllArgsConstructor
class LogMsg {
    private LEVEL level;
    private String msg;
}

enum LEVEL {
    INFO, ERROR
}
```

<!-- indicate-the-source -->

## 参考资料
[Java并发编程实战](https://time.geekbang.org/column/intro/100023901)