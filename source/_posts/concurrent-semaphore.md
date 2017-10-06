---
title: 并发 - JUC - Semaphore - 源码剖析
date: 2016-08-19 00:06:25
categories:
    - Concurrent
    - JUC
tags:
    - Netease
    - Concurrent
    - JUC
    - AQS
---

{% note info %}
本文将通过剖析`Semaphore`的源码来介绍其实现原理
关于`CountDownLatch`的基本内容请参考「并发 - JUC - CountDownLatch - 源码剖析」，本文不再赘述
{% endnote %}

<!-- more -->

# 基础
1. `Semaphore`与`CountDownLatch`非常类似，都是基于`AQS`的`共享模式`，`CountDownLatch`可以大致理解为`简化版的Semaphore`
2. `CountDownLatch.await`等待的是`state=0`，`Semaphore.acquire`（如果需要等待）等待的是`Semaphore.release`
3. `Semaphore`与`CountDownLatch`的源码非常类似，因此有些共通或类似的代码不再重复分析

# 源码分析

## 构造函数
```java
// 与ReentrantLock非常类似，默认是非公平策略
// permits：允许颁发的许可
public Semaphore(int permits) {
    sync = new NonfairSync(permits);
}

public Semaphore(int permits, boolean fair) {
    sync = fair ? new FairSync(permits) : new NonfairSync(permits);
}
```

## acquireUninterruptibly
```java
// From Semaphore
// acquire方法列表，实现都非常类似，本文仅分析acquireUninterruptibly
public void acquire() throws InterruptedException
public void acquire(int permits) throws InterruptedException
public void acquireUninterruptibly()
public void acquireUninterruptibly(int permits)
```
```java
// From Semaphore
// 请求一个许可，不响应中断
public void acquireUninterruptibly() {
    sync.acquireShared(1);
}
```

### acquireShared
```java
// From AQS
public final void acquireShared(int arg) {
    // 自旋获取许可，满足特定条件后退出自旋
    if (tryAcquireShared(arg) < 0)
        // 有排队更久的线程或剩余可颁发的许可需要不满足需求，进入同步队列等待
        doAcquireShared(arg);
}
```

#### tryAcquireShared
```java
// From FairSync
// 公平策略
// 请求共享锁，剩余可颁发的许可满足需求并且并发抢占（CAS）许可成功，才算持有共享锁
// 自旋获取许可，退出自旋需要满足3个条件之一：
// 1. 有排队更久的线程（需要进入同步队列进行等待）
// 2. 剩余可颁发的许可不满足需求（需要进入同步队列进行等待）
// 3. 剩余可颁发的许可满足需求并且并发抢占（CAS）许可成功
protected int tryAcquireShared(int acquires) {
    for (;;) {
        // 与非公平策略的唯一区别是：先判断是否有排队时间更久的线程，如果有，退出自旋，进入同步队列
        if (hasQueuedPredecessors())
            return -1; // 有排队更久的线程（需要进入同步队列进行等待）
        int available = getState(); // 剩余可颁发的许可
        int remaining = available - acquires;
        if (remaining < 0 || compareAndSetState(available, remaining))
            // 1. available < acquires ➔ 剩余可颁发的许可不满足需求（需要进入同步队列进行等待）
            // 2. available >= acquires && compareAndSetState(available, remaining)
            //                      ➔ 剩余可颁发的许可满足需求并且并发抢占（CAS）许可成功
            return remaining;
    }
}
// From AQS
public final boolean hasQueuedPredecessors() {
    Node t = tail;
    Node h = head;
    Node s;
    return h != t && ((s = h.next) == null || s.thread != Thread.currentThread());
}
```
```java
// From NonfairSync
// 非公平策略
protected int tryAcquireShared(int acquires) {
    return nonfairTryAcquireShared(acquires);
}
// From AQS
final int nonfairTryAcquireShared(int acquires) {
    for (;;) {
        // 与公平策略比较，仅仅少了hasQueuedPredecessors的判断
        int available = getState();
        int remaining = available - acquires;
        if (remaining < 0 || compareAndSetState(available, remaining))
            return remaining;
    }
}
```

#### doAcquireShared
```java
// From AQS
// 这段代码与「并发 - JUC - CountDownLatch - 源码剖析」中分析的doAcquireSharedInterruptibly类似，不再赘述
// 请求共享锁，以广播的方式唤醒线程，被唤醒的线程竞争许可，竞争失败则进行休眠，等待下一轮唤醒
private void doAcquireShared(int arg) {
    final Node node = addWaiter(Node.SHARED);
    boolean failed = true;
    try {
        boolean interrupted = false;
        for (;;) {
            final Node p = node.predecessor();
            if (p == head) {
                // 1. CountDownLatch中持有共享锁的条件：state==0。而在CountDownLatch中，state一旦为0，
                //    则不会再改变，因此，被唤醒的线程必然会持有共享锁
                // 2. Semaphore中中持有共享锁的条件：剩余可颁发的许可满足需求并且并发抢占（CAS）许可成功。
                //    而许可是有限的，因此所以被唤醒的线程不一定会持有共享锁，将再次休眠
                int r = tryAcquireShared(arg);
                if (r >= 0) { // 持有共享锁
                    setHeadAndPropagate(node, r);
                    p.next = null;
                    if (interrupted)
                        selfInterrupt();
                    failed = false;
                    return;
                }
            }
            if (shouldParkAfterFailedAcquire(p, node) && parkAndCheckInterrupt())
                interrupted = true;
        }
    } finally {
        if (failed)
            cancelAcquire(node);
    }
}
```

## release
```java
// From Semaphore
public void release() {
    sync.releaseShared(1);
}
```

### releaseShared
```java
// From AQS
public final boolean releaseShared(int arg) {
    // 以自旋的方式返回许可
    if (tryReleaseShared(arg)) {
        // 以广播的方式唤醒线程
        doReleaseShared();
        return true;
    }
    return false;
}
```

#### tryReleaseShared
```java
// From Semaphore
// 以自旋的方式返回许可
// 自旋state+releases，直到CAS成功或溢出
protected final boolean tryReleaseShared(int releases) {
    for (;;) {
        int current = getState();
        int next = current + releases;
        if (next < current) // 溢出
            throw new Error("Maximum permit count exceeded");
        if (compareAndSetState(current, next))
            return true;
    }
}
```
现在回顾下`CountDownLatch`中`tryReleaseShared`的具体实现，没有用到参数`releases`，直接采用"`-1`"
```java
// From CountDownLatch
// 自旋state-1，如果刚好是1->0，返回true
protected boolean tryReleaseShared(int releases) {
    for (;;) {
        int c = getState();
        if (c == 0)
            return false;
        int nextc = c-1;
        if (compareAndSetState(c, nextc))
            return nextc == 0;
    }
}
```

#### doReleaseShared
```java
// From AQS
// 这段代码在博文「并发 - JUC - CountDownLatch - 源码剖析」已经分析过了，非常晦涩，不再赘述
// 以广播的方式唤醒线程
private void doReleaseShared() {
    for (;;) {
        Node h = head;
        if (h != null && h != tail) {
        int ws = h.waitStatus;
        if (ws == Node.SIGNAL) {
            if (!compareAndSetWaitStatus(h, Node.SIGNAL, 0))
                continue;
            unparkSuccessor(h);
        }
        else if (ws == 0 && !compareAndSetWaitStatus(h, 0, Node.PROPAGATE))
            continue;
        }
        if (h == head)
            break;
    }
}
```

<!-- indicate-the-source -->
