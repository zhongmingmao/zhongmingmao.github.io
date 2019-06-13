---
title: Java并发 -- CompletableFuture
date: 2019-05-15 08:27:11
categories:
    - Java Concurrent
tags:
    - Java Concurrent
---

## 泡茶烧水
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-completable-future-tea.png" width=800/>


<!-- more -->

```java
CompletableFuture<Void> f1 = CompletableFuture.runAsync(() -> {
    System.out.println("T1: 洗水壶");
    sleep(1, TimeUnit.SECONDS);
    System.out.println("T1: 烧开水");
    sleep(15, TimeUnit.SECONDS);
});

CompletableFuture<String> f2 = CompletableFuture.supplyAsync(() -> {
    System.out.println("T2: 洗茶壶");
    sleep(1, TimeUnit.SECONDS);
    System.out.println("T2: 洗茶杯");
    sleep(2, TimeUnit.SECONDS);
    System.out.println("T2: 拿茶叶");
    sleep(1, TimeUnit.SECONDS);
    return "龙井";
});

CompletableFuture<String> f3 = f1.thenCombine(f2, (__, tea) -> {
    System.out.println("T3: 拿到茶叶: " + tea);
    System.out.println("T3: 泡茶");
    return "上茶: " + tea;
});

System.out.println(f3.join());
```

## 创建CompletableFuture对象
```java
// 默认线程池，采用公共的ForkJoinPool线程池，线程数为CPU核数
// 如果所有的CompletableFuture共享同一个线程池，一旦有任务有慢IO操作，会导致其他线程饥饿，影响系统性能
// 所以，应该根据不同的业务类型创建不同的线程池，避免相互干扰
public static CompletableFuture<Void> runAsync(Runnable runnable);
// Runnable.run没有返回值，Supplier.get有返回值
public static <U> CompletableFuture<U> supplyAsync(Supplier<U> supplier);

// 指定线程池
public static CompletableFuture<Void> runAsync(Runnable runnable, Executor executor);
public static <U> CompletableFuture<U> supplyAsync(Supplier<U> supplier, Executor executor);

// 创建完CompletableFuture对象之后，会自动地异步执行Runnable.run或者Supplier.get
```

## CompletionStage
```
// CompletionStage接口可以清晰地描述任务之间的时序关系，例如串行关系、并行关系和汇聚关系（AND、OR）等
// CompletionStage接口也可以方便地描述异常处理
public class CompletableFuture<T> implements Future<T>, CompletionStage<T>
```

### 串行关系
```java
public <U> CompletableFuture<U> thenApply(Function<? super T,? extends U> fn);
public <U> CompletionStage<U> thenApplyAsync(Function<? super T,? extends U> fn);
public <U> CompletionStage<U> thenApplyAsync(Function<? super T,? extends U> fn, Executor executor);

public CompletableFuture<Void> thenAccept(Consumer<? super T> action);
public CompletionStage<Void> thenAcceptAsync(Consumer<? super T> action);
public CompletionStage<Void> thenAcceptAsync(Consumer<? super T> action, Executor executor);

public CompletableFuture<Void> thenRun(Runnable action);
public CompletionStage<Void> thenRunAsync(Runnable action);
public CompletionStage<Void> thenRunAsync(Runnable action, Executor executor);

// 新建一个子流程，最终结果与thenApply相同
public <U> CompletableFuture<U> thenCompose(Function<? super T, ? extends CompletionStage<U>> fn);
public <U> CompletionStage<U> thenComposeAsync(Function<? super T, ? extends CompletionStage<U>> fn);
public <U> CompletionStage<U> thenComposeAsync(Function<? super T, ? extends CompletionStage<U>> fn, Executor executor);
```
```java
// supplyAsync会启动一个异步流程，步骤1、2、3是串行执行的
CompletableFuture<String> f = CompletableFuture
        .supplyAsync(() -> "Hello World") // 1
        .thenApply(s -> s + " QQ") // 2
        .thenApply(String::toUpperCase); // 3
System.out.println(f.join()); // HELLO WORLD QQ
```

### AND 汇聚关系
```java
public <U,V> CompletionStage<V> thenCombine (CompletionStage<? extends U> other, BiFunction<? super T,? super U,? extends V> fn);
public <U,V> CompletionStage<V> thenCombineAsync(CompletionStage<? extends U> other, BiFunction<? super T,? super U,? extends V> fn);
public <U,V> CompletionStage<V> thenCombineAsync(CompletionStage<? extends U> other, BiFunction<? super T,? super U,? extends V> fn, Executor executor);

public <U> CompletionStage<Void> thenAcceptBoth(CompletionStage<? extends U> other, BiConsumer<? super T, ? super U> action);
public <U> CompletionStage<Void> thenAcceptBothAsync(CompletionStage<? extends U> other, BiConsumer<? super T, ? super U> action);
public <U> CompletionStage<Void> thenAcceptBothAsync(CompletionStage<? extends U> other, BiConsumer<? super T, ? super U> action, Executor executor);

public CompletionStage<Void> runAfterBoth(CompletionStage<?> other, Runnable action);
public CompletionStage<Void> runAfterBothAsync(CompletionStage<?> other, Runnable action);
public CompletionStage<Void> runAfterBothAsync(CompletionStage<?> other, Runnable action, Executor executor);
```

### OR 汇聚关系
```java
public <U> CompletionStage<U> applyToEither(CompletionStage<? extends T> other, Function<? super T, U> fn);
public <U> CompletionStage<U> applyToEitherAsync(CompletionStage<? extends T> other, Function<? super T, U> fn);
public <U> CompletionStage<U> applyToEitherAsync(CompletionStage<? extends T> other, Function<? super T, U> fn, Executor executor);

public CompletionStage<Void> acceptEither(CompletionStage<? extends T> other, Consumer<? super T> action);
public CompletionStage<Void> acceptEitherAsync(CompletionStage<? extends T> other, Consumer<? super T> action);
public CompletionStage<Void> acceptEitherAsync(CompletionStage<? extends T> other, Consumer<? super T> action, Executor executor);

public CompletionStage<Void> runAfterEither(CompletionStage<?> other, Runnable action);
public CompletionStage<Void> runAfterEitherAsync(CompletionStage<?> other, Runnable action);
public CompletionStage<Void> runAfterEitherAsync(CompletionStage<?> other, Runnable action, Executor executor);
```
```java
CompletableFuture<String> f1 = CompletableFuture.supplyAsync(() -> {
    int t = getRandom();
    System.out.println("f1 need " + t);
    sleep(t, TimeUnit.SECONDS);
    System.out.println("f1 done");
    return "f1 takes " + String.valueOf(t);
});

CompletableFuture<String> f2 = CompletableFuture.supplyAsync(() -> {
    int t = getRandom();
    System.out.println("f2 need " + t);
    sleep(t, TimeUnit.SECONDS);
    System.out.println("f2 done");
    return "f2 takes " + String.valueOf(t);
});

CompletableFuture<String> f3 = f1.applyToEither(f2, s -> s);
f3.join();

// f1 need 9
// f2 need 1
// f2 done
```

### 异常处理
```java
public CompletionStage<T> exceptionally(Function<Throwable, ? extends T> fn);

public CompletionStage<T> whenComplete(BiConsumer<? super T, ? super Throwable> action);
public CompletionStage<T> whenCompleteAsync(BiConsumer<? super T, ? super Throwable> action);
public CompletionStage<T> whenCompleteAsync(BiConsumer<? super T, ? super Throwable> action, Executor executor);

public <U> CompletionStage<U> handle(BiFunction<? super T, Throwable, ? extends U> fn);
public <U> CompletionStage<U> handleAsync(BiFunction<? super T, Throwable, ? extends U> fn);
public <U> CompletionStage<U> handleAsync(BiFunction<? super T, Throwable, ? extends U> fn, Executor executor);
```
```java
CompletableFuture<Integer> f = CompletableFuture
        .supplyAsync(() -> 1 / 0)
        .thenApply(i -> i * 10)
        .exceptionally(t -> 0) // 类似于catch{}
        .whenComplete((i, t) -> { // 类似于finally，whenComplete不支持返回结果，handle支持返回结果
        });

System.out.println(f.join()); // 0
```

<!-- indicate-the-source -->
