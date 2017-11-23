---
title: 并发 - JUC - FutureTask - 源码剖析
date: 2016-08-24 00:06:25
categories:
    - Concurrent
    - JUC
tags:
    - Netease
    - Concurrent
    - JUC
---

{% note info %}
本文将通过剖析`FutureTask`的源码来介绍其实现原理
{% endnote %}

<!-- more -->

# 基础

## Runnable + Callable
```java
@FunctionalInterface
public interface Runnable {
    public abstract void run();
}
```
```java
// Callable相对于Runnable，允许返回运行结果和抛出异常
@FunctionalInterface
public interface Callable<V> {
    V call() throws Exception;
}
```

## Future
```java
// Future接口代表异步计算的结果
public interface Future<V> {
    // 尝试取消执行任务
    // 如果任务已经完成、已经被取消或者或者由于某些原因不能被取消，返回false
    // 如果调用cancel时，任务还没有开始执行，那么任务不会被执行，返回true
    // 如果调用cancel时，任务已经开始执行但还没有执行完成，
    //        需要依据参数mayInterruptIfRunning是否中断执行任务的线程，返回true
    // 如果cancel返回后，后续调用isDone会始终返回true
    // 如果cancel返回true，后续调用isCancelled会始终返回true
    boolean cancel(boolean mayInterruptIfRunning)

    // 如果任务正常完成之前被取消，返回true
    boolean isCancelled();

    // 如果任务完成，返回true；任务完成包括：正常完成、发生异常或被取消
    boolean isDone();

    // 等待任务执行完成，然后获取执行结果，如果任务还没完成则会阻塞等到任务执行完成
    // 如果任务被取消，则会抛出CancellationException
    // 如果任务执行过程中发生异常，则会抛出ExecutionException
    // 如果任务阻塞等待过程中被中断，则会抛出InterruptedException
    V get() throws InterruptedException, ExecutionException;

    // get()的超时版本，区别：
    // 如果阻塞等待过程中超时，则会抛出TimeoutException
    V get(long timeout, TimeUnit unit)
        throws InterruptedException, ExecutionException, TimeoutException;
}
```

## FutureTask
```java
// FutureTask实现RunnableFuture接口
public class FutureTask<V> implements RunnableFuture<V>
```
```java
// RunnableFuture接口继承自Runnable接口和Future接口
public interface RunnableFuture<V> extends Runnable, Future<V> {
    void run();
}
```

# 源码分析

## 核心结构
```java
public class FutureTask<V> implements RunnableFuture<V> {
    // 底层实际调用的callable，执行完成后置为null
    private Callable<V> callable;
    // get()方法返回的结果或抛出的异常
    private Object outcome;
    // 执行callable的线程
    private volatile Thread runner;
    // 等待线程链表
    private volatile WaitNode waiters;

    // 任务的运行状态，初始状态为NEW
    private volatile int state;

    // 初始状态
    // 表示任务还未被执行
    private static final int NEW          = 0;

    // 中间状态
    // 表示任务已经执行完成或任务执行过程中发生了异常，
    // 但任务的执行结果或者异常原因还没有保存到outcome
    // state>COMPLETING表示任务已经执行完成：正常执行完成、发生异常或被取消
    // NEW -> COMPLETING
    private static final int COMPLETING   = 1;
    // 终态
    // 表示任务已经执行完成并且任务的执行结果已经保存到outcome
    // NEW -> COMPLETING -> NORMAL
    private static final int NORMAL       = 2;
    // 终态
    // 表示任务执行过程中发生了异常并且异常原因已经保存到outcome
    // NEW -> COMPLETING -> EXCEPTIONAL
    private static final int EXCEPTIONAL  = 3;

    // 终态
    // 表示任务还没开始执行或者任务已经开始执行但还没有执行完成时，用户调用了cancel(false)
    // NEW -> CANCELLED
    private static final int CANCELLED    = 4;

    // 中间状态
    // 表示任务还没开始执行或者任务已经开始执行但还没有执行完成时，用户调用了cancel(true)
    // 中断执行任务的线程之前
    // NEW -> INTERRUPTING
    private static final int INTERRUPTING = 5;
    // 终态
    // 表示任务还没开始执行或者任务已经开始执行但还没有执行完成时，用户调用了cancel(true)
    // 中断执行任务的线程之后
    // NEW -> INTERRUPTING -> INTERRUPTED
    private static final int INTERRUPTED  = 6;
}
```
```java
// 等待线程链表的节点
static final class WaitNode {
    volatile Thread thread;
    volatile WaitNode next; // 下一节点
    WaitNode() {
        thread = Thread.currentThread();
    }
}
```
运行状态转换图
![futuretask_state.png](http://otr5jjzeu.bkt.clouddn.com/futuretask_state.png)


## 构造函数
```java
public FutureTask(Callable<V> callable) {
    if (callable == null)
        throw new NullPointerException();
    this.callable = callable;
    this.state = NEW; // 初始状态为NEW
}

public FutureTask(Runnable runnable, V result) {
    // 将Runnable适配成Callable
    this.callable = Executors.callable(runnable, result);
    this.state = NEW; // 初始状态为NEW
}
```

### callable
```java
// From Executors
public static <T> Callable<T> callable(Runnable task, T result) {
    if (task == null)
        throw new NullPointerException();
    return new RunnableAdapter<T>(task, result); // 适配器模式
}
```

### RunnableAdapter
```java
// From Executors
static final class RunnableAdapter<T> implements Callable<T> {
    final Runnable task;
    final T result;
    RunnableAdapter(Runnable task, T result) {
        this.task = task;
        this.result = result;
    }
    public T call() {
        task.run(); // 只是简单地调用Runnable.run()方法
        return result;
    }
}
```

## isCancelled
```java
public boolean isCancelled() {
    // cancel(false) -> CANCELLED
    // cancel(true) -> INTERRUPTING / INTERRUPTED
    return state >= CANCELLED;
}
```

## isDone
```java
public boolean isDone() {
    // state >= COMPLETING
    return state != NEW;
}
```

## run
```java
public void run() {
    // 1. 任务的运行状态不为NEW，说明任务已经开始执行但没有执行完成或者任务已经完成（正常完成、发生异常或者被取消）
    // 2. 任务的运行状态为NEW，以CAS的方式将runner设置为当前线程，并发时只有一个线程能成功，失败的线程直接返回
    if (state != NEW ||
            !UNSAFE.compareAndSwapObject(this, runnerOffset, null, Thread.currentThread()))
        return;

    // 代码执行到这里说明任务的运行状态为NEW，且成功以CAS的方式设置runner为当前线程
    try {
        Callable<V> c = callable;
        if (c != null && state == NEW) {
            // callable不为null且任务的运行状态为NEW，执行任务
            V result;
            boolean ran; // 任务是否正常完成
            try {
                result = c.call(); // 执行任务
                ran = true; // 任务正常完成
            } catch (Throwable ex) {
                result = null;
                ran = false;
                // 任务执行过程中抛出异常，完成任务运行状态转移，保存异常原因，唤醒等待线程
                setException(ex);
            }
            if (ran)
                // 任务正常完成，完成任务运行状态转移，保存任务执行结果，唤醒等待线程
                set(result);
        }
    } finally {
        // runner不为null时，其他线程无法调用run()
        // 将runner重置为null，允许其他线程调用run()
        runner = null;
        int s = state; // 获取最新的任务运行状态
        if (s >= INTERRUPTING) // INTERRUPTING或者INTERRUPTED
            // 自旋等待运行状态设置为INTERRUPTED
            handlePossibleCancellationInterrupt(s);
    }
}
```

### setException
```java
// 任务运行状态转移：NEW -> COMPLETING -> EXCEPTIONAL
// 异常原因保存在outcome
// 唤醒等待线程链表中节点的对应线程
protected void setException(Throwable t) {
    if (UNSAFE.compareAndSwapInt(this, stateOffset, NEW, COMPLETING)) {
        // 任务运行状态转移：NEW -> COMPLETING
        outcome = t; // 异常原因保存在outcome
        // 任务运行状态转移：COMPLETING -> EXCEPTIONAL
        UNSAFE.putOrderedInt(this, stateOffset, EXCEPTIONAL);
        // 唤醒等待线程链表中所有节点的对应线程
        finishCompletion();
    }
}
```

### set
```java
// 任务运行状态转移：NEW -> COMPLETING -> NORMAL
// 任务的执行结果保存在outcome
// 唤醒等待线程链表中节点的对应线程
protected void set(V v) {
    if (UNSAFE.compareAndSwapInt(this, stateOffset, NEW, COMPLETING)) {
        // 任务运行状态转移：NEW -> COMPLETING
        outcome = v; // 任务的执行结果保存在outcome
        // 任务运行状态转移：COMPLETING -> NORMAL
        UNSAFE.putOrderedInt(this, stateOffset, NORMAL);
        // 唤醒等待线程链表中所有节点的对应线程
        finishCompletion();
    }
}
```

### finishCompletion
```java
// 唤醒等待线程链表中所有节点的对应线程
private void finishCompletion() {
    for (WaitNode q; (q = waiters) != null;) {
       if (UNSAFE.compareAndSwapObject(this, waitersOffset, q, null)) {
            for (;;) {
                Thread t = q.thread;
                if (t != null) {
                    q.thread = null;
                    LockSupport.unpark(t); // 唤醒线程
                }
                WaitNode next = q.next;
                if (next == null)
                    break; // 到达尾节点
                q.next = null; // 断开后继节点连接，加速垃圾回收
                q = next;
            }
            break;
        }
    }
    done(); // 在FutureTask中，done是一个空方法
    callable = null; // 加快垃圾回收，减少内存占用
}

protected void done() { }
```

### handlePossibleCancellationInterrupt
```java
// 自旋等待运行状态设置为INTERRUPTED
private void handlePossibleCancellationInterrupt(int s) {
    if (s == INTERRUPTING)
      while (state == INTERRUPTING)
          Thread.yield();

}
```

## cancel
```java
public boolean cancel(boolean mayInterruptIfRunning) {
    // 1. 任务的运行状态不为NEW，说明任务已经开始执行但没有执行完成或者任务已经完成（正常完成、发生异常或者被取消）
    //    直接返回false，无法取消
    // 2. 任务的运行状态为NEW，以CAS的方式完成任务的运行状态转移：
    //    NEW -> (mayInterruptIfRunning ? INTERRUPTING : CANCELLED)
    //    并发时只有一个线程能成功，失败的线程直接返回false
    if (!(state == NEW &&
            UNSAFE.compareAndSwapInt(this, stateOffset, NEW,
                mayInterruptIfRunning ? INTERRUPTING : CANCELLED)))
        return false;

    // 代码执行到这里说明任务的运行状态为NEW，且成功以CAS的方式完成任务的运行状态转移
    try {
        if (mayInterruptIfRunning) {
            // 允许中断执行任务的线程
            try {
                Thread t = runner;
                if (t != null)
                    t.interrupt(); // 中断线程
            } finally {
                // 任务运行状态转移：INTERRUPTING -> INTERRUPTED
                UNSAFE.putOrderedInt(this, stateOffset, INTERRUPTED);
            }
        }
    } finally {
        // 唤醒等待线程链表中所有节点的对应线程
        finishCompletion();
    }
    return true;
}
```

## get
```java
public V get() throws InterruptedException, ExecutionException {
    int s = state;
    if (s <= COMPLETING) // NEW或者COMPLETING
        // NEW：表示任务还未被执行
        // COMPLETING：表示任务已经执行完成或任务执行过程中发生了异常，
        //             但任务的执行结果或者异常原因还没有保存到outcome
        // 阻塞等待，超时或运行状态到达终态时，返回对应的运行状态
        s = awaitDone(false, 0L);
    // 依据不同的任务运行状态做相应的处理：返回执行结果或抛出异常
    return report(s);
}
```

### awaitDone
```java
// 阻塞等待，超时或运行状态到达终态时，返回对应的运行状态
// 代码逻辑十分巧妙！！
private int awaitDone(boolean timed, long nanos) throws InterruptedException {
    // 等待截止时间，无限时等待时为0
    final long deadline = timed ? System.nanoTime() + nanos : 0L;
    WaitNode q = null; // 等待节点
    boolean queued = false; // 是否已经排队

    for (;;) { // 自旋
        if (Thread.interrupted()) {
            // 线程被中断，此时当前线程有可能已经在链表中等待，移除节点并抛出InterruptedException
            removeWaiter(q);
            throw new InterruptedException();
        }

        int s = state; // 当前运行状态

        if (s > COMPLETING) {
            // state>COMPLETING表示任务已经执行完成：正常执行完成、发生异常或被取消
            // 此时依据s能唯一确定终态，归纳为下面2种情况，可以直接返回s
            //   1. NORMAL(2)、EXCEPTIONAL(3)、CANCELLED(4)和INTERRUPTED(6)为终态
            //   2. INTERRUPTING(5)的终态为INTERRUPTED(6)
            // 如果已经创建等待节点，则置空该等待节点的线程信息
            if (q != null)
                q.thread = null;
            return s;
        }

        else if (s == COMPLETING)
            // COMPLETING表示任务已经执行完成或任务执行过程中发生了异常
            // 但任务的执行结果或者异常原因还没有保存到outcome
            // 由上面的分析可知，从COMPLETING->NORMAL或COMPLETING->EXCEPTIONAL是非常短暂的过程
            // 另外，report(NORMAL)和report(EXCEPTIONAL)逻辑是不一样的，需要明确知道运行状态会怎样转移
            // 因此这里也无需进入等待节点链表等待，让出CPU资源，继续自旋，进入下一循环，暂不考虑超时
            Thread.yield();

        else if (q == null)
            // 执行到这里说明state为NEW（非终态）且当前线程对应的等待节点尚未创建，创建等待节点
            q = new WaitNode();

        else if (!queued)
            // 执行到这里说明tate为NEW（非终态）且当前线程对应的等待节点已经创建，但尚未加入到等待节点链表
            queued = UNSAFE.compareAndSwapObject(this, waitersOffset, q.next = waiters, q);

        else if (timed) {
            // 执行到这里说明tate为NEW（非终态）且当前线程对应的等待节点已经加入到等待节点链表，考虑超时
            nanos = deadline - System.nanoTime();
            if (nanos <= 0L) {
                // 超时，删除对应节点，并返回任务当前的运行状态
                removeWaiter(q);
                return state;
            }
            // 限时阻塞等待，直到被唤醒或中断
            // 如果由于中断而退出休眠状态，进入下一循环会抛出InterruptedException
            LockSupport.parkNanos(this, nanos);
        }

        else
            // 执行到这里说明tate为NEW（非终态）且当前线程对应的等待节点已经加入到等待节点链表，不考虑超时
            // 不限时阻塞等待，与parkNanos非常类似
            LockSupport.park(this);
    }
}
```

### report
```java
// 依据不同的任务运行状态做相应的处理：返回执行结果或抛出异常
private V report(int s) throws ExecutionException {
    Object x = outcome;

    // NORMAL
    // 任务正常执行完成，返回任务执行结果
    if (s == NORMAL)
        return (V)x;

    // CANCELLED / INTERRUPTING / INTERRUPTED
    // 任务被取消，抛出CancellationException
    if (s >= CANCELLED)
        throw new CancellationException();

    // EXCEPTIONAL
    // 执行过程中抛出异常，将异常原因封装成ExecutionException后抛出
    throw new ExecutionException((Throwable)x);
}
```

<!-- indicate-the-source -->
