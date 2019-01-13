---
title: 并发 - JUC - CountDownLatch - 源码剖析
date: 2016-08-16 00:06:25
categories:
    - Concurrent
    - JUC
tags:
    - Concurrent
    - JUC
    - AQS
---

{% note info %}
本文将通过剖析`CountDownLatch`的源码来介绍其实现原理
代码托管在https://github.com/zhongmingmao/concurrent_demo
关于`ReentrantLock`的基本内容请参考「并发 - JUC - ReentrantLock - 源码剖析」，本文不再赘述
{% endnote %}

<!-- more -->

# 使用场景
常用于：`n`个线程统一`阻塞`在某个`CountDownLatch`上，等待`m`个线程`并发消耗完CountDownLatch`，然后`n`个线程统一通过`CountDownLatch`，继续执行后续代码

## 代码
```java
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
         pool-1-thread-3 finished!
         pool-1-thread-1 finished!
         pool-1-thread-2 finished!
         pool-1-thread-4 finished!
         pool-2-thread-2 started!
         pool-2-thread-3 started!
         pool-2-thread-4 started!
         pool-2-thread-1 started!
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
```java
// Sync是在CountDownLatch的静态内部类，继承自AQS
private static final class Sync extends AbstractQueuedSynchronizer {
    Sync(int count) {
        // 用AQS中的state属性表示CountDownLatch的count属性
        setState(count);
    }
}
```

## 核心结构与构造函数
```java
public class CountDownLatch {
    // 只有一个Sync属性，CountDownLatch的核心方法托管给Sync执行
    private final Sync sync;
}
```
```java
public CountDownLatch(int count) {
    // count不能为负值
    if (count < 0) throw new IllegalArgumentException("count < 0");
    this.sync = new Sync(count);
}
```

## await
```java
// From CountDownLatch
// 1. 如果state==0，立即返回，无需等待
// 2. 如果state>0，线程阻塞，直到发生：
//    2.1 调用countDown()将state减少到0
//    2.2 被其他线程中断
public void await() throws InterruptedException {
    // 实际调用AQS.acquireSharedInterruptibly
    // 请求共享锁，中断时抛出InterruptedException
    sync.acquireSharedInterruptibly(1);
}
```

### acquireSharedInterruptibly
```java
// From AQS
// 请求共享锁，中断时抛出InterruptedException
public final void acquireSharedInterruptibly(int arg) throws InterruptedException {
    if (Thread.interrupted())
        // 首先判断线程已被中断，如果是则直接抛出InterruptedException
        throw new InterruptedException();
    if (tryAcquireShared(arg) < 0) // (getState() == 0) ? 1 : -1
        // state==0时，直接返回
        // state!=0时，其实就是state>0，继续执行
        // 请求共享锁，中断时抛出InterruptedException
        doAcquireSharedInterruptibly(arg);
}
```

#### tryAcquireShared
```java
// From AQS
// 请求共享锁，只要state==0，即持有共享锁
protected int tryAcquireShared(int acquires) {
    return (getState() == 0) ? 1 : -1;
}
```

#### doAcquireSharedInterruptibly
```java
// From AQS
// 请求共享锁，中断时抛出InterruptedException
private void doAcquireSharedInterruptibly(int arg) throws InterruptedException {
    // 以自旋的方式进入同步队列，节点处于共享模式
    // CountDownLatch采用的是AQS的共享模式，而ReentrantLock采用的是AQS的独占模式
    // 关于ReentrantLock的更详细分析请参照博文：「并发 - JUC - ReentrantLock - 源码剖析」
    final Node node = addWaiter(Node.SHARED); // node.isShared()永远为true！！
    boolean failed = true;
    try {
        for (;;) {
            final Node p = node.predecessor(); // 前驱节点
            if (p == head) { // 当前节点的前驱节点为同步队列的头结点，即head<->node
                int r = tryAcquireShared(arg); // (getState() == 0) ? 1 : -1
                if (r >= 0) { // 持有共享锁
                    // 执行到这里说明node.prev==head，state==0，r==1
                    // 即state已经被消耗完了，尝试以广播的方式唤醒同步队列中的线程
                    setHeadAndPropagate(node, r); // 核心代码，看下面详细分析
                    p.next = null;
                    failed = false;
                    return;
                }
            }
            // 如果当前节点的前驱节点不是头节点，或者state!=0，则尝试挂起线程并等待被唤醒或被中断
            if (shouldParkAfterFailedAcquire(p, node) && parkAndCheckInterrupt())
                // doAcquireSharedInterruptibly是响应中断的，因此如果被中断而退出休眠状态的逻辑比较简单
                // 直接抛出InterruptedException，执行cancelAcquire取消请求锁
                throw new InterruptedException();
        }
    } finally {
        if (failed)
            // 更详细的分析请参照博文：「并发 - JUC - ReentrantLock - 源码剖析」
            cancelAcquire(node);
    }
}
```

#### addWaiter
```java
// From AQS
private Node addWaiter(Node mode) {
    Node node = new Node(Thread.currentThread(), mode); // 关注这一行
    Node pred = tail;
    if (pred != null) {
        node.prev = pred;
        if (compareAndSetTail(pred, node)) {
            pred.next = node;
            return node;
        }
    }
    enq(node);
    return node;
}
```

#### Node构造函数
```java
// From AQS.Node
Node(Thread thread, Node mode) {
    // 在CountDownLatch中，this.nextWaiter == mode == Node.SHARED
    // node.isShared()实际执行的是：nextWaiter == SHARED，必然为true
    // 因此在setHeadAndPropagate必然会执行doReleaseShared()
    this.nextWaiter = mode;
    this.thread = thread;
}
```

##### setHeadAndPropagate
```java
// From AQS
// 在AQS中，执行setHeadAndPropagate必然满足2个条件
// 1. node.prev==head
// 2. propagate==1
// 更新同步队列头结点为当前节点，并以自旋的方式唤醒头结点的后继节点的关联线程
private void setHeadAndPropagate(Node node, int propagate) {
    Node h = head;
    setHead(node);
    // propagate==1，必然满足propagate>0，因此暂不关心后续条件判断
    if (propagate > 0 || h == null || h.waitStatus < 0 || (h = head) == null || h.waitStatus < 0) {
        Node s = node.next;
        if (s == null || s.isShared()) // s == null || nextWaiter == SHARED
            // s.isShared()必然为true，因此只需考虑s==null
            // setHead(node)已经将head设置为node，因此s=head.next!=null表示同步队列有可供唤醒的线程，以广播的方式唤醒线程
            // doReleaseShared的代码将在分析countDown()时进行详细分析，这里暂时跳过
            doReleaseShared(); // 核心代码，很晦涩！！
    }
}
```
```java
// From AQS
private void setHead(Node node) {
    head = node;
    node.thread = null;
    node.prev = null;
}
```

## countDown
```java
public void countDown() {
    sync.releaseShared(1);
}
```

### releaseShared
```java
// From AQS
public final boolean releaseShared(int arg) {
    if (tryReleaseShared(arg)) {
        // // 自旋state-1，如果刚好是1->0，以广播的方式唤醒线程
        doReleaseShared();
        return true;
    }
    return false;
}
```

#### tryReleaseShared
```java
// 自旋state-1，如果刚好是1->0，返回true，以广播的方式唤醒线程
protected boolean tryReleaseShared(int releases) {
  for (;;) {
      int c = getState();
      // 如果当前state已经为0，直接返回false，
      // 表示state早已消耗完毕，无需再次唤醒同步队列节点的关联线程（唤醒进行中或已经完全唤醒所有线程）
      if (c == 0)
          return false;
      // 自旋state-1，直到成功
      int nextc = c-1;
      if (compareAndSetState(c, nextc))
            // 刚好1->0，返回true，表示state恰好消耗完毕，需要唤醒同步队列节点的关联线程
            // 否则返回false，表示state尚未消耗完，无需唤醒同步队列节点的关联线程
            return nextc == 0;
  }
}
```

#### doReleaseShared
`doReleaseShared`是本文分析中**`最晦涩`**的代码
在开始分析`doReleaseShared`之前，先分析概况一下`AQS`的`独占模式`与`共享模式`的区别（个人理解，如有错误，还望指正）

场景：
假若当前`同步队列`的排队情况为`[head:null] <-> [node1:t1] <-> [node2:t2] <-> [node3:t3] <-> [node4:t4]`，且没有新的线程排队

区别1：
1. `独占模式`：`AQS`的`state`是`线程独占`的，例如`ReentrantLock.lock()`、`ReentrantLock.unLock()`
2. `共享模式`：`AQS`的`state`是`线程共享`的，例如`Countdownlatch.countDown()`

区别2：
1. `独占模式`：`线程自身任务优先`。线程c唤醒线程t1，线程t1必须先执行完本身任务以后在唤醒线程t2，以此类推
2. `共享模式`：`唤醒其他线程优先`（唤醒其他线程的前提：当前线程已经获得`共享锁`，`CountDownLatch`的共享锁和`Semaphore`的共享锁含义是不一样的）。线程c唤醒线程t1，线程c和线程t1首先竞争着唤醒t2（c也有可能直接退出，不参与竞争），再去执行本身任务，以此类推


```java
// From AQS
// 以广播的方式唤醒线程，核心代码
private void doReleaseShared() {
    for (;;) {
        Node h = head;
        // 1. h==null，说明此时同步队列为空，没有后继节点，也就没有线程可供唤醒
        // 2. h!=null && h==tail，有2种情况，但都没有可供唤醒的节点
        //      2.1. head==tail==new Node()，同步队列的tail为null时入队，初始化的空节点new Node()，具体代码请看AQS.enq()
        //      2.2 同步队列尾节点被唤醒，此时head==tail，具体代码请看AQS.doAcquireSharedInterruptibly
        if (h != null && h != tail) { // 同步队列非空 + head!=tail ➔ 有可供唤醒的线程
            int ws = h.waitStatus;
            if (ws == Node.SIGNAL) {
                if (!compareAndSetWaitStatus(h, Node.SIGNAL, 0))
                    // 由下面 if(h==head) 的分析，可能存在多个线程并发地执行doReleaseShared
                    // 因此这里的CAS操作就有可能会失败，进入下一轮唤醒竞争
                    continue;
                // 并发时只有一个线程能CAS操作成功，head.waitStatus:Node.SIGNAL->0，则唤醒头结点的后继节点
                unparkSuccessor(h);
            } else if (ws == 0 && !compareAndSetWaitStatus(h, 0, Node.PROPAGATE))
                // 由下面 if(h==head) 的分析，可能存在多个线程并发地执行doReleaseShared
                // 因此这里的CAS操作就有可能会失败，进入下一轮唤醒竞争

                // 当参与唤醒竞争的线程很多时，很有可能会导致ws=PROPAGATE
                // 而ws=PROPAGATE又会导致线程会参与判断是否继续参与唤醒竞争
                // 大多数参与唤醒竞争线程会发现h==head，退出唤醒竞争
                continue;
        }

        // 执行到这里，说明必然已经有线程已经执行了unparkSuccessor(h)！！
        // 即下一轮唤醒竞争必然开始
        // 下一步就是要判断当前线程是否要参与下一轮的唤醒竞争

        // h==head则结束自旋：
        //
        // ===== 理解1：
        // 为了解释清楚，假设目前同步队列的排队情况为：
        // [head:null] <-> [node1:t1] <-> [node2:t2] <-> [node3:t3] <-> [node4:t4]
        //
        // 当前线程c触发了unparkSuccessor，即唤醒了t1，
        // t1会触发setHead来更新head，开启新一轮的唤醒竞争
        // 1. 假若 t1的setHead 发生在 当前线程c的if(h==head) 之后，则当前线程c退出下一轮的唤醒竞争，由t1去尝试唤醒t2
        // 2. 假若 t1的setHead 发生在 当前线程c的if(h==head) 之前，则当前线程c继续参与下一轮的唤醒竞争，这会导致当前线程c与t1竞争去唤醒t2
        // 两种情况总结：
        // 1. 当前线程c发现其他线程修改了head，那么我们通过"竞争"（CAS）来加速唤醒；
        // 2. 当前线程c没有发现其他线程修改了head，当前线程c认为反正已经唤醒了一个线程（可能是其他线程唤醒的），
        //    那么让这个被唤醒线程继续去唤醒其他线程，当前线程c可以"安心地退出"
        //
        // 以此类推，当前的线程c最多苟且到最后一轮竞争，即当前线程、t1、t2和t3竞争去唤醒t4
        // 在t4唤醒后，因为t4没有后继节点了，因此当前线程t1、t2、t3和t4在下一轮唤醒竞争中都会结束自旋
        //
        // ===== 理解2：
        // 这段代码非常晦涩，尝试换另外一个角度来理解，如有错误，还望指正
        // head的值其实就是标识一轮并发唤醒竞争！！
        // 1. head.waitStatus的初始值必然为SIGNAL，因此在并发时，必然只有一个线程A能将等待状态由 SIGNAL CAS更新为 0，
        //    该线程A会唤醒其他线程B
        // 2. 被唤醒的线程B会首先执行setHead
        //    2.1 因此如果最后h!=head，说明新一轮的唤醒竞争已经开始，当前线程c已经觉察到，因此继续参与竞争，加快唤醒
        //    2.2 因此如果最后h==head，说明新一轮的唤醒竞争尚未开始，而被唤醒的线程B必然会开启新一轮的唤醒竞争，而当前线程c可以安心退出唤醒竞选
        //
        // JUC代码的套路很深，上面说法纯属个人理解，如有错误，还望指正
        if (h == head)
            break;
    }
}
```

# 逻辑示意图
经过了上面的源码分析，下面将通过一段代码，简单回顾上面的过程

## 代码
```java
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
<img src="https://concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/count_down_latch_procedure.png" width="500">

<!-- indicate-the-source -->
