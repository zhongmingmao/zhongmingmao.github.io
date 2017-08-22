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
3. `Semaphore`与`CountDownLatch`的源码非常类似，因此有些共通或类似的代码不再重复分析，请先行阅读博文「并发 - JUC - CountDownLatch - 源码剖析」

# 源码分析

## 构造函数
```Java
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

```Java
// From Semaphore
// acquire方法列表，实现都非常类似，本文仅分析acquireUninterruptibly
public void acquire() throws InterruptedException
public void acquire(int permits) throws InterruptedException
public void acquireUninterruptibly()
public void acquireUninterruptibly(int permits)
```
```Java
// From Semaphore
// 请求一个许可，不响应中断
public void acquireUninterruptibly() {
    sync.acquireShared(1);
}
```

### acquireShared
```Java
// From AQS
public final void acquireShared(int arg) {
    // 自旋获取许可，满足特定条件后退出自旋
    if (tryAcquireShared(arg) < 0)
        // 有排队更久的线程或剩余可颁发的许可需要不满足需求，进入同步队列等待
        doAcquireShared(arg);
}
```

#### tryAcquireShared
```Java
// From FairSync
// 公平策略
// 自旋获取许可，退出自旋需要满足3个条件之一：
// 1. 有排队更久的线程
// 2. 剩余可颁发的许可不满足需求
// 3. 剩余可颁发的许可满足需求并且并发抢占（CAS）许可成功
protected int tryAcquireShared(int acquires) {
    for (;;) {
        // 与非公平策略的唯一区别是：先判断是否有排队时间更久的线程，如果有，退出自旋，进入同步队列
        if (hasQueuedPredecessors())
            return -1;
        int available = getState(); // 剩余可颁发的许可
        int remaining = available - acquires;
        if (remaining < 0 || compareAndSetState(available, remaining))
            // available < acquires ➔ 剩余可颁发的许可不满足需求
            // available >= acquires && compareAndSetState(available, remaining) ➔ 剩余可颁发的许可满足需求并且并发抢占（CAS）许可成功
            // 退出自旋，进入同步队列
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
```Java
// From NonfairSync
// 非公平策略
protected int tryAcquireShared(int acquires) {
    return nonfairTryAcquireShared(acquires);
}
// From AQS
final int nonfairTryAcquireShared(int acquires) {
    for (;;) {
        int available = getState();
        int remaining = available - acquires;
        if (remaining < 0 || compareAndSetState(available, remaining))
            return remaining;
    }
}
```

#### doAcquireShared
```Java
// From AQS
// 这段代码与「并发 - JUC - CountDownLatch - 源码剖析」中分析的doAcquireSharedInterruptibly类似，不再赘述
// 大致的作用：线程进入同步队列，以自旋的方式观察条件是否满足条件，如果满足，则退出自旋
private void doAcquireShared(int arg) {
    final Node node = addWaiter(Node.SHARED);
    boolean failed = true;
    try {
        boolean interrupted = false;
        for (;;) {
            final Node p = node.predecessor();
            if (p == head) {
                int r = tryAcquireShared(arg);
                if (r >= 0) {
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
```Java
// From Semaphore
public void release() {
    sync.releaseShared(1);
}
```

### releaseShared
```Java
// From AQS
public final boolean releaseShared(int arg) {
    // 以自旋的方式返回许可
    if (tryReleaseShared(arg)) {
        // 唤醒所有等待线程
        doReleaseShared();
        return true;
    }
    return false;
}
```

#### tryReleaseShared
```Java
// From Semaphore
// 以自旋的方式返回许可
protected final boolean tryReleaseShared(int releases) {
    for (;;) {
        int current = getState();
        int next = current + releases;
        if (next < current) // overflow
            throw new Error("Maximum permit count exceeded");
        if (compareAndSetState(current, next))
            return true;
    }
}
```
现在回顾下`CountDownLatch`中`tryReleaseShared`的具体实现，没有用到参数`releases`，直接采用"`-1`"
```Java
// From CountDownLatch
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
```Java
// From AQS
// 这段代码在博文「并发 - JUC - CountDownLatch - 源码剖析」已经分析过了，不再赘述
// 大致的作用：唤醒所有等待线程
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
            continue;】
        }
        if (h == head)
            break;
    }
}
```

<!-- indicate-the-source -->

