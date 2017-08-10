---
title: 并发 - JUC - CountDownLatch - 源码剖析
date: 2016-08-16 00:06:25
categories:
    - 网易这两年
    - 并发
tags:
    - 网易这两年
    - 并发
    - JUC
    - AQS
---

{% note info %}
本文将通过剖析`CountDownLatch`的源码来介绍其实现原理
代码托管在https://github.com/zhongmingmao/concurrent_demo
关于`ReentrantLock`的基本内容请参考「并发 - JUC - ReentrantLock - 源码剖析」，本文不在赘述
{% endnote %}

<!-- more -->

# 使用场景
常用于：`n`个线程统一`阻塞`在某个`CountDownLatch`上，等待`m`个线程`并发消耗完CountDownLatch`，然后`n`个线程统一通过`CountDownLatch`，继续执行后续代码

## 代码
```Java
public class CountDownLatchDemo {
    private static final int THREAD_COUNT = 4;
    
    public static void main(String[] args) throws InterruptedException {
        CountDownLatch countDownLatch = new CountDownLatch(THREAD_COUNT);
        ExecutorService mPool = Executors.newFixedThreadPool(THREAD_COUNT);
        
        IntStream.range(0, THREAD_COUNT).forEach(value ->
                mPool.submit(() -> {
                    doTask();
                    log("finished!");
                    countDownLatch.countDown(); // state-1
                }));
        
        ExecutorService nPool = Executors.newFixedThreadPool(THREAD_COUNT);
        IntStream.range(0, THREAD_COUNT).forEach(value ->
                nPool.submit(() -> {
                    try {
                        countDownLatch.await(); // 等待state减少到0
                        log("started!");
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                }));
        
        mPool.shutdown();
        nPool.shutdown();
    
        /*
         输出：
            pool-1-thread-2 finished!
            pool-1-thread-3 finished!
            pool-1-thread-4 finished!
            pool-2-thread-2 started!
            pool-2-thread-3 started!
            pool-2-thread-1 started!
            pool-2-thread-4 started!
         */
    }
    
    private static void doTask() {
        try {
            TimeUnit.SECONDS.sleep(2);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }
    
    private static void log(final String msg) {
        System.out.println(String.format("%s %s", Thread.currentThread().getName(), msg));
    }
}
```

# 源码分析

## Sync
```Java
// CountDownLatch静态内部类，Sync是在CountDownLatch的静态内部类，继承自AQS
private static final class Sync extends AbstractQueuedSynchronizer {    
    Sync(int count) {
        // 用AQS中的state属性表示CountDownLatch的count属性
        setState(count);
    }
}
```

## 核心结构与构造函数
```Java
public class CountDownLatch {
    // 只有一个Sync属性，CountDownLatch的核心方法托管给Sync执行
    private final Sync sync;
}
```
```Java
public CountDownLatch(int count) {
    // count不能为负值
    if (count < 0) throw new IllegalArgumentException("count < 0");
    this.sync = new Sync(count);
}
```

## await
```Java
// From CountDownLatch
// 如果state为0，立即返回，无需等待
// 如果state大于0，线程阻塞，除非：调用countDown()将state减少到0，或者被其他线程中断
// 如果进入await()方法时已经设置了中断标志或者阻塞过程中被其他线程中断，将抛出InterruptedException
public void await() throws InterruptedException {
    // 实际调用AQS.acquireSharedInterruptibly
    // 请求共享锁，中断时抛出InterruptedException
    sync.acquireSharedInterruptibly(1);
}
```

### acquireSharedInterruptibly
```Java
// From AQS
// 请求共享锁，中断时抛出InterruptedException
public final void acquireSharedInterruptibly(int arg) throws InterruptedException {
    if (Thread.interrupted())
        // 进入acquireSharedInterruptibly方法前，线程已被中断，则直接抛出InterruptedException
        throw new InterruptedException();
    if (tryAcquireShared(arg) < 0) // (getState() == 0) ? 1 : -1
        // state != 0时继续执行doAcquireSharedInterruptibly
        // 请求共享锁，中断时抛出InterruptedException
        doAcquireSharedInterruptibly(arg);
}
```

#### tryAcquireShared
```Java
// From AQS
protected int tryAcquireShared(int acquires) {
    return (getState() == 0) ? 1 : -1;
}
```

#### doAcquireSharedInterruptibly
```Java
// From AQS
// 请求共享锁，中断时抛出InterruptedException
private void doAcquireSharedInterruptibly(int arg) throws InterruptedException {
    // 以自旋的方式进入同步队列，节点处于共享模式
    // 更详细的分析请参照博文：「并发 - JUC - ReentrantLock - 源码剖析」
    final Node node = addWaiter(Node.SHARED);
    boolean failed = true;
    try {
        for (;;) {
            final Node p = node.predecessor(); // 前驱节点
            if (p == head) { 
                // 执行到这里说明当前节点的前驱节点为同步队列的头结点，即head<->node
                int r = tryAcquireShared(arg); // (getState() == 0) ? 1 : -1
                if (r >= 0) {
                    // 执行到这里说明node.prev==head，state==0，r==1
                    setHeadAndPropagate(node, r);
                    p.next = null;
                    failed = false;
                    return;
                }
            }
            // 如果当前节点的前驱节点不是头节点，或者state!=0，则尝试挂起线程并等待被唤醒或被中断
            if (shouldParkAfterFailedAcquire(p, node) && parkAndCheckInterrupt())
                // 因被中断而退出休眠状态的逻辑比较简单，直接抛出InterruptedException，执行cancelAcquire取消请求锁
                throw new InterruptedException();
        }
    } finally {
        if (failed)
            // 更详细的分析请参照博文：「并发 - JUC - ReentrantLock - 源码剖析」
            cancelAcquire(node);
    }
}
```

##### setHeadAndPropagate
```Java
// From AQS
// 执行到这里时node.prev==head，propagate==1
// 更新同步队列头结点为当前节点，并以自旋的方式唤醒头结点的后继节点的关联线程
private void setHeadAndPropagate(Node node, int propagate) {
    Node h = head;
    setHead(node);
    // propagate==1
    if (propagate > 0 || h == null || h.waitStatus < 0 || (h = head) == null || h.waitStatus < 0) {
        Node s = node.next;
        if (s == null || s.isShared())
            // 如果后继节点不为null且其处于共享模式，则进行唤醒传播（以自旋的方式唤醒头结点的后继节点的关联线程）
            // doReleaseShared的代码将在分析countDown详细分析，这里暂时跳过
            doReleaseShared();
    }
}
```
```Java
// From AQS
private void setHead(Node node) {
    head = node;
    node.thread = null;
    node.prev = null;
}
```

## countDown
```Java
public void countDown() {
    sync.releaseShared(1);
}
```

### releaseShared
```Java
public final boolean releaseShared(int arg) {
    if (tryReleaseShared(arg)) {
        // 当前线程执行自旋减1成功，且刚好是1->0，唤醒同步队列中节点的关联线程
        doReleaseShared();
        return true;
    }
    return false;
}
```

#### tryReleaseShared
```Java
// 自旋减1，如果刚好是1->0，则唤醒节点的关联线程
protected boolean tryReleaseShared(int releases) {
  for (;;) {
      int c = getState();
      if (c == 0)
          // 当前state已经为0，直接返回false，表示无需唤醒同步队列节点的关联线程
          return false;
      int nextc = c-1;
      if (compareAndSetState(c, nextc))
            // 刚好1->0，返回true，表示需要唤醒同步队列节点的关联线程
            return nextc == 0;
  }
}
```

#### doReleaseShared
```Java
// From AQS
// 执行到这里时state==0
// 通过自旋的方式唤醒头结点的后继节点的关联线程
private void doReleaseShared() {
    for (;;) {
        Node h = head;
        // h==null，说明此时同步队列为空，没有后继节点可供唤醒
        // h==tail，有两种情况，但都没有唤醒节点可供唤醒
        //      1. head==tail==new Node()，同步队列的tail为null时入队，初始化的空节点new Node()，具体代码请看AQS.enq()
        //      2. 同步队列尾节点被唤醒，此时head==tail，具体代码请看AQS.doAcquireSharedInterruptibly
        if (h != null && h != tail) {
            int ws = h.waitStatus;
            if (ws == Node.SIGNAL) {
                if (!compareAndSetWaitStatus(h, Node.SIGNAL, 0))
                    // 由下面if (h == head)的分析，可能存在多个线程并发地执行doReleaseShared
                    // 因此这里的CAS操作就有可能会失败，进入下一轮唤醒竞争
                    continue;
                // 头节点的等待状态为SIGNAL，且成功CAS更新为0，唤醒头结点的后继节点
                unparkSuccessor(h);
            } else if (ws == 0 && !compareAndSetWaitStatus(h, 0, Node.PROPAGATE))
                // 由下面if (h == head)的分析，可能存在多个线程并发地执行doReleaseShared
                // 因此这里的CAS操作就有可能会失败，进入下一轮唤醒竞争
                continue;
        }
        
        // h==head则结束自旋：
        // 
        // 为了解释清楚，假设目前同步队列的排队情况为：
        // head:null <-> node1:t1 <-> node2:t2 <-> node3:t3 <-> node4:t4
        // 
        // 当前线程触发了unparkSuccessor，即唤醒了t1，
        // t1会触发setHead来更新head
        // 1. 假若t1的setHead发生在当前线程的if (h == head)之后，则当前线程退出自旋，由t1去尝试唤醒t2
        // 2. 假若t1的setHead发生在当前线程的if (h == head)之前，则当前线程会继续自旋，这会导致当前线程与t1竞争去唤醒t2
        // 两种情况总结：
        // 1. 当前线程发现其他线程修改了head，那么我们通过"竞争"（CAS）来加速唤醒；
        // 2. 当前线程没有发现其他线程修改了head，当前线程认为反正我已经唤醒了一个线程，那么让这个线程自己去唤醒后继节点，当前线程先退出
        // 
        // 以此类推，当前的线程最多苟且到最后一轮竞争，即当前线程、t1、t2和t3竞争去唤醒t4
        // 在t4唤醒后，因为t4没有后继节点了，因此当前线程t1、t2、t3和t4在下一轮唤醒竞争中都会结束自旋
        // 这个过程不涉及线程的挂起与恢复，仅仅是通过CAS+自旋来达到快速唤醒阻塞在await()上线程的目的，
        // JUC代码的套路很深，上面说法纯属个人理解，如有错误，还望指正
        if (h == head)
            break;
    }
}
```

# 逻辑示意图
经过了上面的源码分析，下面将通过一段代码，简单回顾上面的过程

## 代码
```Java
/**
 * 简述CountDownLatch的工作过程
 */
public class CountDownLatchProcedure {
    
    private static final int THREAD_COUNT = 4;
    
    private static CountDownLatch countDownLatch = new CountDownLatch(THREAD_COUNT);
    
    private static Runnable awaitRunnable = () -> {
        try {
            log("start!");
            countDownLatch.await();
            log("continue!");
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    };
    
    public static void main(String[] args) {
        IntStream.range(0, THREAD_COUNT).forEach(i -> {
            new Thread(awaitRunnable, String.format("t%s", i + 1)).start();
            try {
                TimeUnit.SECONDS.sleep(1);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        });
        
        IntStream.range(0, THREAD_COUNT).forEach(i -> countDownLatch.countDown());
        
        /*
         输出：
        t1 start!
        t2 start!
        t3 start!
        t4 start!
        t1 continue!
        t2 continue!
        t4 continue!
        t3 continue!
         */
    }
    
    private static void log(final String msg) {
        System.out.println(String.format("%s %s", Thread.currentThread().getName(), msg));
    }
}
```

## 逻辑示意图
![count_down_latch_procedure.png](http://otr5jjzeu.bkt.clouddn.com/count_down_latch_procedure.png)

<!-- indicate-the-source -->


