---
title: Java并发 -- Condition
date: 2019-05-07 09:37:48
categories:
    - Java
    - Concurrent
tags:
    - Java
    - Java Concurrent
---

## Condition
1. Condition实现了管程模型中的_**条件变量**_
2. Java内置的管程（**synchronized**）只有**一个条件变量**，而**Lock&Condition**实现的管程支持**多个条件变量**
3. 在很多并发场景下，支持多个条件变量能够让并发程序的**可读性更好**，也**更容易实现**

<!-- more -->

## 阻塞队列
```java
// 下列三对操作的语义是相同的
// Condition.await()        Object.wait()
// Condition.signal()       Object.notify()
// Condition.signalAll()    Object.notifyAll()
public class BlockedQueue<T> {
    private static final int MAX_SIZE = 10;
    // 可重入锁
    private final Lock lock = new ReentrantLock();
    // 条件变量：队列不满
    private final Condition notFull = lock.newCondition();
    // 条件变量：队列不空
    private final Condition notEmpty = lock.newCondition();
    // 队列实际存储：栈
    private final Stack<T> stack = new Stack<>();

    // 入队
    public void enq(T t) {
        // 先获得互斥锁，类似于管程中的入口
        lock.lock();
        try {
            while (stack.size() >= MAX_SIZE) {
                // 队列已满，等待队列不满，才可入队
                notFull.await();
            }
            // 入队后，通知队列不空，可出队
            stack.push(t);
            notEmpty.signalAll();
        } catch (InterruptedException ignored) {
        } finally {
            lock.unlock();
        }
    }

    // 出队
    public T deq() {
        // 先获得互斥锁，类似于管程中的入口
        lock.lock();
        try {
            while (stack.isEmpty()) {
                // 队列已空，等待队列不空，才可出队
                notEmpty.await();
            }
            // 出队后，通知队列不满，可入队
            T pop = stack.pop();
            notFull.signalAll();
            return pop;
        } catch (InterruptedException ignored) {
        } finally {
            lock.unlock();
        }
        return null;
    }
}
```
1. 一个阻塞队列，需要两个条件变量，一个是**队列不空**（空队列不允许出队），一个是**队列不满**（队列已满不允许入队）
2. Lock&Condition实现的管程，线程等待和通知需要调用_**await/signal/signalAll**_
3. Java内置的管程（synchronized），线程等待和通知需要调用_**wait/notify/notifyAll**_

## 同步 + 异步
1. 区别：_**调用方是否需要等待结果**_
2. **异步调用**：调用方创建一个子线程，在子线程中执行方法调用
3. **异步方法**：在方法实现的时候，创建一个新的线程执行逻辑，主线程直接return

## Dubbo
在TCP协议层面，发送完RPC请求后，系统线程是不会等待RPC的响应结果的，需要RPC框架完成**异步转同步**的操作

### DubboInvoker
```java
protected Result doInvoke(final Invocation invocation) throws Throwable {
    ...
    return (Result) currentClient
                .request(inv, timeout) // 发送RPC请求，默认返回DefaultFuture
                .get(); // 等待RPC返回结果
}
```

### DefaultFuture
当RPC返回结果之前，阻塞调用线程，让调用线程等待；当RPC返回结果后，唤醒调用线程，让调用线程重新执行
```java
// 锁和条件变量
private final Lock lock = new ReentrantLock();
private final Condition done = lock.newCondition();
// RPC结果
private volatile Response response;
// 回调
private volatile ResponseCallback callback;
```

#### get
```java
// RPC结果是否已经返回
public boolean isDone() {
    return response != null;
}

// 调用方通过该方法等待RPC结果
public Object get(int timeout) throws RemotingException {
    ...
    if (!isDone()) {
        long start = System.currentTimeMillis();
        lock.lock();
        try {
            while (!isDone()) {
                done.await(timeout, TimeUnit.MILLISECONDS);
                if (isDone() || System.currentTimeMillis() - start > timeout) {
                    break;
                }
            }
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        } finally {
            lock.unlock();
        }
        ...
    }
    return returnFromResponse();
}
```
#### doReceived
```java
// RPC结果返回时调用该方法
private void doReceived(Response res) {
    lock.lock();
    try {
        response = res;
        if (done != null) {
            done.signalAll();
        }
    } finally {
        lock.unlock();
    }
    if (callback != null) {
        invokeCallback(callback);
    }
}
```

<!-- indicate-the-source -->

## 参考资料
[Java并发编程实战](https://time.geekbang.org/column/intro/100023901)
