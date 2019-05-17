---
title: Java并发 -- Future
date: 2019-05-14 18:18:11
categories:
    - Java Concurrent
tags:
    - Java Concurrent
---

## ThreadPoolExecutor
```java
// 无法获取任务的执行结果
public void execute(Runnable command);

// 可以获取任务的执行结果
// Runnable接口的run()方法没有返回值，返回的Future只能断言任务是否已经结束，类似于Thread.join()
public Future<?> submit(Runnable task)
// Callable接口的call()方法有返回值，可以通过调用返回的Future对象的get()方法获取任务的执行结果
public <T> Future<T> submit(Callable<T> task);
// 返回的Future对象f，f.get()的返回值就是传给submit方法的参数result
public <T> Future<T> submit(Runnable task, T result)
```

<!-- more -->

## Future
```java
// 取消任务
boolean cancel(boolean mayInterruptIfRunning);
// 判断任务是否已取消
boolean isCancelled();
// 判断任务是否已结束
boolean isDone();
// 获取任务执行结果
V get() throws InterruptedException, ExecutionException;
// 获取任务执行结果，支持超时
V get(long timeout, TimeUnit unit)
        throws InterruptedException, ExecutionException, TimeoutException;
```

```java
ExecutorService pool = Executors.newFixedThreadPool(1);
Result result1 = new Result();
Future<Result> future = pool.submit(new Task(result1), result1); // Task implements Runnable
Result result2 = future.get();
System.out.println(result1 == result2); // true
```

## FutureTask
```java
// 继承关系
// 实现了Runnable接口，可以将FutureTask对象作为任务提交给ThreadPoolExecutor，也可以被Thread执行
// 实现了Future接口，也能获取任务的执行结果
FutureTask<V> implements RunnableFuture<V>
RunnableFuture<V> extends Runnable, Future<V>
// 构造函数
public FutureTask(Callable<V> callable);
public FutureTask(Runnable runnable, V result);
```
```java
// 线程池
FutureTask<Integer> futureTask = new FutureTask<>(() -> 1 + 2);
ExecutorService pool = Executors.newCachedThreadPool();
pool.submit(futureTask);
System.out.println(futureTask.get()); // 3
```
```java
// 手动创建线程
FutureTask<Integer> futureTask = new FutureTask<>(() -> 1 + 2);
Thread thread = new Thread(futureTask);
thread.start();
System.out.println(futureTask.get()); // 3
```

## 烧水泡茶
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-future-tea.png" width=800/>
```java
// 创建两个FutureTask，ft1和ft2
// ft1完成洗水壶、烧开水、泡茶的任务
// ft2完成洗茶壶、洗茶杯、拿茶叶的任务
// ft1在执行泡茶前，需要等待ft2把茶叶拿来
public class Tea {
    public static void main(String[] args) throws ExecutionException, InterruptedException {
        FutureTask<String> ft2 = new FutureTask<>(new T2());
        FutureTask<String> ft1 = new FutureTask<>(new T1(ft2));
        Thread t1 = new Thread(ft1);
        t1.start();
        Thread t2 = new Thread(ft2);
        t2.start();
        System.out.println(ft1.get());
    }
}

@AllArgsConstructor
class T1 implements Callable<String> {
    private FutureTask<String> ft2;

    @Override
    public String call() throws Exception {
        System.out.println("T1: 洗水壶");
        TimeUnit.SECONDS.sleep(1);

        System.out.println("T1: 烧开水");
        TimeUnit.SECONDS.sleep(15);

        String tea = ft2.get();
        System.out.println("T1: 拿到茶叶 " + tea);
        TimeUnit.SECONDS.sleep(1);

        System.out.println("T1: 泡茶");
        return "上茶：" + tea;
    }
}

class T2 implements Callable<String> {
    @Override
    public String call() throws Exception {
        System.out.println("T2: 洗茶壶");
        TimeUnit.SECONDS.sleep(1);

        System.out.println("T2: 洗茶杯");
        TimeUnit.SECONDS.sleep(2);

        System.out.println("T2: 拿茶叶");
        TimeUnit.SECONDS.sleep(1);
        return "龙井";
    }
}
```


<!-- indicate-the-source -->
