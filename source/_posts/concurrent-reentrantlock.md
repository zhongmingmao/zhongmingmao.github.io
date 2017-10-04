---
title: 并发 - JUC - ReentrantLock - 源码剖析
date: 2016-08-09 00:06:25
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
本文将通过剖析`ReentrantLock`的源码来介绍其实现原理（关于`Condition`的内容，后面会单独成文）
代码托管在https://github.com/zhongmingmao/concurrent_demo
关于`CAS`的内容请参考「并发 - Unsafe类的简单使用」，本文不再赘述
关于`LockSupport`的内容请参考「并发 - JUC - LockSupport - 源码剖析」，本文不再赘述
原创不易，转载请注明出处：http://zhongmingmao.me/2016/08/09/concurrent-reentrantlock/
{% endnote %}

<!-- more -->

# 基础

## Lock接口
`ReentrantLock`实现了`java.util.concurrent.locks.Lock`，其中定义了`lock()`、`tryLock()`、`unlock()`等核心方法
```Java
public interface Lock {
    // 加锁
    void lock();
    // 可中断获取锁（synchronized获取锁进入阻塞时是无法响应中断）
    void lockInterruptibly() throws InterruptedException;
    // 尝试获取锁，非阻塞
    boolean tryLock();
    // 尝试获取锁，等待若干时间
    boolean tryLock(long time, TimeUnit unit) throws InterruptedException;
    // 解锁
    void unlock();
    // 与该Lock绑定的Condition实例
    // 当前线程获取锁后，才能调用Condition.await()，调用后，当前线程将自动释放锁
    // 本文不关注Condition的内容
    Condition newCondition();
}
```

## AbstractQueuedSynchronizer

### 概述

`AbstractQueuedSynchronizer`简称`AQS`，是`JUC`中一个`基础组件`，用来构建`同步工具`，例如本文的主题`ReentrantLock`，下图是一些使用了`AQS`的`同步工具`
![reentrantlock_aqs.png](http://otr5jjzeu.bkt.clouddn.com/reentrantlock_aqs.png)

### 核心结构
```Java
// AQS中存在两种队列：同步队列（sync queue）和条件队列（condition queue）
// 本文仅关注同步队列，不关注条件队列
// 同步队列实际上由Node构成的的双向非循环链表
public abstract class AbstractQueuedLongSynchronizer extends AbstractOwnableSynchronizer implements java.io.Serializable {
    // 同步队列的"头节点"，如果不为null，其等待状态（waitStatus）不为CANCELLED
    private transient volatile Node head;
    // 同步队列的尾节点
    private transient volatile Node tail;
    // 同步状态（synchronization state），代表锁的状态，
    // 0表示锁没有线程被持有，大于0（AQS支持可重入锁）表示被线程持有
    private volatile long state;
}

public abstract class AbstractOwnableSynchronizer implements java.io.Serializable {
    // 采用独占模式进行同步时，持有独占锁的线程
    private transient Thread exclusiveOwnerThread;
}
```

## Node
`Node`用于`包装线程`，是`同步队列`中的节点
```Java
static final class Node {
    // 本文不关注该模式
    static final Node SHARED = new Node();
    // 节点处于独占模式
    static final Node EXCLUSIVE = null;

    // 理解节点的等待状态（waitStatus）非常重要，附带源码注释帮助理解
    /**
     * This node is cancelled due to timeout or interrupt.
     * Nodes never leave this state. In particular,
     * a thread with cancelled node never again blocks.
     */
    // 由于超时或中断而导致当前线程（对应同步队列中的一个节点）被取消
    // CANCELLED是终态
    // 被取消了的节点对应的线程永远不会阻塞，放弃竞争锁
    static final int CANCELLED =  1;
    /**
     * The successor of this node is (or will soon be) blocked (via park),
     * so the current node must unpark its successor when it releases or cancels.
     * To avoid races, acquire methods must first indicate they need a signal,
     * then retry the atomic acquire, and then, on failure, block.
     */
    // 当前节点的后继节点通过park操作被阻塞（或将要被阻塞）
    // 因此当前节点在它们释放锁或被取消的时候，需要通过unpark操作唤醒它的后继节点
    // 为了避免竞争（依据等待状态进行筛选，无需全部唤醒），
    // 执行竞争锁的方法（acquire methods）的线程首先需要表明它们需要被唤醒，
    // 如果竞争锁失败，它们就会被阻塞，等待被唤醒
    // 是否需要被唤醒，其实是记录在当前节点的前驱节点的等待状态中
    // 因此SIGNAL表示后继节点需要被唤醒，这一点非常重要！！
    static final int SIGNAL    = -1;
    // 本文不关注该状态
    static final int CONDITION = -2;
    // 本文不关注该状态
    static final int PROPAGATE = -3;

    /**
     * Status field, taking on only the values:
     *      CANCELLED / SIGNAL / CONDITION / PROPAGATE / 0
     * Non-negative values mean that a node doesn't need to signal
     * So, most code doesn't need to check for particular values, just for sign.
     * The field is initialized to 0 for normal sync nodes, and CONDITION for condition nodes.
     */
    // 等待状态，只能为CANCELLED、SIGNAL、CONDITION、PROPAGATE或0
    // 非负值（CANCELLED和0）表示节点关联的线程不需要被唤醒
    // 同步队列中节点的等待状态初始化为0，条件队列中节点的等待状态初始化为CONDITION（本文不关心条件队列）
    volatile int waitStatus;

    // 同步队列中的前驱节点
    volatile Node prev;
    // 同步队列中的后继节点
    volatile Node next;
    // 请求锁的线程
    volatile Thread thread;
    // 条件队列的后继节点，本文不关注
    Node nextWaiter;
}
```

## 同步队列
在介绍了`AQS的核心结构`和节点`Node`以后，可以很容易得出`同步队列的结构图`如下
![reentrantlock_aqs_sync_queue_1.png](http://otr5jjzeu.bkt.clouddn.com/reentrantlock_aqs_sync_queue_1.png)

## 公平锁与非公平锁
`ReentrantLock`支持`公平锁`和`非公平锁`，锁的管理分别由`FairSync`和`NonfairSync`来具体控制，

### ReentrantLock构造函数
```Java
// Sync为抽象类，进行锁的管理，两个实现类为FairSync（公平锁）和NonfairSync（非公平锁）
private final Sync sync;

// 默认构造函数，创建非公平锁NonfairSync
public ReentrantLock() {
    sync = new NonfairSync();
}
// 构造函数，依据参数，选择公平锁FairSync还是非公平锁NonfairSync
public ReentrantLock(boolean fair) {
   sync = fair ? new FairSync() : new NonfairSync();
}
```

### UML
![reentrantlock_fair_nonfair_uml.png](http://otr5jjzeu.bkt.clouddn.com/reentrantlock_fair_nonfair_uml.png)
`FairSync`和`NonfairSync`是`AQS`的实现类，`ReentrantLock`通过`FairSync`实现公平策略和通过`NonfairSync`实现非公平策略

# 源码分析 - 非公平锁

## ReentrantLock.lock
```Java
// From ReentrantLock
public void lock() {
    // 采用非公平锁时，实际调用的是NonfairSync.lock()
    sync.lock();
}
```

### NonfairSync.lock
```Java
// From NonfairSync
// 首先尝试快速抢占独占锁，如果失败，则回退到正常的独占锁请求流程
final void lock() {
    // 一开始就立马尝试通过CAS操作获取独占锁，具有抢占性质，
    // 非公平，不考虑是否已经有其他线程在排队等待独占锁
    // 这是与公平锁的区别1
    if (compareAndSetState(0, 1))
        // 并发情况下，最多只有一个线程能CAS更新成功，即持有独占锁，记录持有独占锁的线程（即当前线程）
        // 如果线程能CAS更新失败，说明同步状态的预期值不是0，独占锁已经被其他线程持有
        // compareAndSetState(0,n)其实就是尝试抢占锁，下面分析不再重复说明这一点
        setExclusiveOwnerThread(Thread.currentThread());
    else
        // 快速抢占独占锁失败，则回退到正常的独占锁请求流程，有可能会挂起当前线程
        // 请求独占锁，不响应中断
        acquire(1);
}
```
```Java
// From AbstractOwnableSynchronizer
// 记录持有独占锁的线程
protected final void setExclusiveOwnerThread(Thread thread) {
    exclusiveOwnerThread = thread;
}
```

### AQS.acquire
`AQS`即`AbstractQueuedSynchronizer`的简称，下面分析不再重复说明这一点
`acquire(int arg)`是正常的独占锁请求流程
```Java
// From AQS
// 请求独占锁，不响应中断
// 至少调用一次tryAcquire来尝试获得独占锁，tryAcquire有公平和非公平的两种策略，这里先关注非公平策略
// tryAcquire成功则直接返回，否则进入同步队列进行排队
public final void acquire(int arg) {
    if (!tryAcquire(arg) && // 实际调用Sync.nonfairTryAcquire，非公平策略
            // addWaiter：进入同步队列并返回节点（包装了当前线程）
            // acquireQueued：节点就会进入一个"自旋"过程，待条件满足时尝试获取锁，如果成功则从同步队列退出，并结束自旋
            //     如果退出休眠状态是由于中断导致的，返回true，正常情况下应该返回false
            acquireQueued(addWaiter(Node.EXCLUSIVE), arg))
      // 由于中断而退出休眠状态，则自我中断，设置中断标志
      selfInterrupt();
}
```
```Java
// From AQS
// 当前线程自我中断，设置中断标志
static void selfInterrupt() {
    Thread.currentThread().interrupt();
}
```

#### Sync.nonfairTryAcquire
```Java
// From Sync
// 非公平策略tryAcquire
// 如果当前线程能成功获得独占锁，返回true，否则返回false，具体逻辑如下：
// 1. 直接尝试通过CAS操作获取独占锁（非公平），如果获取成功，直接返回true
// 2. 直接获取独占锁失败，判断是否是锁重入，如果是返回true
// 3. 上述两种情况都不是，返回false
final boolean nonfairTryAcquire(int acquires) {
    final Thread current = Thread.currentThread();
    int c = getState();
    // 同步状态为0，说明当前没有线程持有独占锁
    if (c == 0) {
        // 不考虑是否有线程在排队等待独占锁，直接尝试通过CAS操作抢占锁，不公平
        // 这是与公平锁的区别2
        if (compareAndSetState(0, acquires)) {
            // 仅有一个线程能CAS更新成功，获得独占锁
            setExclusiveOwnerThread(current);
            return true;
        }
    }
    // 如果同步状态不为0，说明独占锁已被占用，判断当前线程是否是独占锁的持有者
    else if (current == getExclusiveOwnerThread()) {
        // 如果当前线程是独占锁的持有者，采取可重入逻辑
        // 因为是独占锁，只有一个线程能进入到该代码块
        int nextc = c + acquires;
        if (nextc < 0)
            throw new Error("Maximum lock count exceeded");
        setState(nextc);
        return true;
    }
    // 独占锁被其他线程占用
    // 执行后续逻辑acquireQueued(addWaiter(Node.EXCLUSIVE), arg))，入队+自旋
    return false;
}
```

#### AQS.addWaiter
`tryAcquire`失败后（**`即独占锁被其他线程持有`**），首先调用`addWaiter`，进行入队
```Java
// From AQS
// 尝试获取锁失败后，封装当前线程成一个节点，并进行入队（同步队列）操作，并返回刚刚创建的节点
// 首先尝试快速版本的入队操作，失败后再进行完整版本的入队操作
// 快速版本：CAS竞争入队
// 完整版本：head与tail的懒初始化 + 自旋CAS竞争入队
private Node addWaiter(Node mode) {
    // 将当前线程封装成节点，节点处于独占模式
    Node node = new Node(Thread.currentThread(), mode);

    // ========== 快速版本的入队操作，假设当前队列不为空，直接CAS竞争入队
    Node pred = tail; // 暂存同步队列的尾节点
    if (pred != null) { // 队列不为空
        // 首先将刚刚获取的尾节点设置为当前节点的前驱节点
        // 在并发时，此时尾节点有可能已经不是pred，下面的CAS操作就会失败
        node.prev = pred;
        if (compareAndSetTail(pred, node)) {
            // 在并发时，只有一个线程能入队成功，将尾节点的后继节点设置为当前节点，形成双向链表
            pred.next = node;
            return node;
        }
        // 并发更新CAS失败的节点，将执行完整版的入队操作enq(node)
    }

    // ========== 完整版本的入队操作，进行head与tail的懒初始化 + 通过自旋进行CAS竞争入队操作
    // 完整版本 = 自旋的快速版本 + head与tail的懒初始化
    enq(node);
    return node;
}
```
```Java
// From AQS
// 当 队列为空时 或 CAS入队失败 采用完整版的入队操作
// 进行head与tail的懒初始化 + 通过自旋进行CAS竞争入队操作
private Node enq(final Node node) {
    for (;;) { // 自旋，不响应中断
        Node t = tail; // 获取最新的尾节点，在并发情况下，有可能需要进行多次循环
        if (t == null) { // 第1次入队，tail和head均为null，队列为空
            if (compareAndSetHead(new Node()))
                // 在并发时，最多只有一个线程能成功设置head，
                // 其他线程失败后直接接着下一个循环，进入else分支，不会直接return，这点很重要！！
                // head与tail是懒初始化
                // 同步队列的"头节点"的等待状态此时为0，thread为null
                tail = head;
        } else {  // 队列不为空，往队列尾部添加当前节点node
            node.prev = t; // 将本次循环获取的尾节点设置为当前节点的前驱节点
            if (compareAndSetTail(t, node)) {
                // 在并发时，只有一个线程能入队成功，将尾节点的后继节点指向当前节点，形成双向链表
                t.next = node;
                // enq方法返回的是t，而非node，这是与快速版本的另一个区别，主要用于条件队列，本文不关注
                return t;
            }
            // 并发更新CAS失败的节点，将进入下一循环，参与下一轮的CAS竞争
        }
    }
}
```
`addWaiter`逻辑示意图：
![reentrantlock_aqs_addWaiter.png](http://otr5jjzeu.bkt.clouddn.com/reentrantlock_aqs_addWaiter.png)

#### AQS.acquireQueued
`acquireQueued(final Node node, int arg)`是非公平锁的`lock`执行路径上**`最为重要的的方法`**！！
`addWaiter`之后，当前线程对相应的节点已经成功地添加到`同步队列`的`"队尾"`
```Java
// From AQS
// 当前线程进入一个自旋过程，待条件满足时会尝试获取独占锁，如果成功获取独占锁则从同步队列退出，并结束自旋
final boolean acquireQueued(final Node node, int arg) {
    boolean failed = true;
    try {
        boolean interrupted = false;
        for (;;) { // 自旋，不响应中断
            final Node p = node.predecessor(); // 当前节点的前驱节点
            // 当前驱节点为head时，而head中不包含线程信息，
            // head的后继节点才是同步队列中是第1个拥有线程信息的节点
            // 尝试获得独占锁，符合同步队列"FIFO"的特性
            if (p == head && tryAcquire(arg)) {
                // 当前线程对应的节点为head的后继节点并且当前线程成功持有独占锁
                // 将head更新为当前线程对应的节点，并且去除无用的线程信息和前驱节点信息，但仍然需要保留等待状态信息
                setHead(node);
                // head已经被更新，p作为旧head，无需保持后继节点属性，加快旧head的垃圾回收
                p.next = null;
                failed = false;
                // 唯一的return语句，表明当前线程会一直自旋（可能会被挂起）
                // 直到当前节点成为head的后继节点并成功持有独占锁
                return interrupted;
            }
            // 如果不满足条件：当前线程对应的节点是head的后继节点，并且当前线程成功持有独占锁，那么就要考虑挂起当前线程
            // shouldParkAfterFailedAcquire是判断能否安全地挂起当前线程
            // 安全的意思是指前驱节点（包括head节点）的等待状态为SIGNAL
            // 如果能够安全地挂起当前线程，就挂起线程并等待唤醒或中断（退出休眠状态）
            // 被唤醒或中断后，进入下一轮循环，有可能再次挂起线程
            if (shouldParkAfterFailedAcquire(p, node) &&
                // 挂起当前线程，进入休眠状态，并判断退出休眠状态的原因是不是由于中断导致的
                parkAndCheckInterrupt())
                interrupted = true; // 由于中断导致退出休眠状态
        }
    } finally {
        if (failed)
            // 代码实际上不会执行到这里
            // 个人理解：只是为了与doAcquireInterruptibly和doAcquireNanos等方法的代码风格保持一致
            cancelAcquire(node);
    }
}
```
```Java
// From AQS
// 将head更新为当前线程对应的节点，并且去除无用的线程信息和前驱节点信息，但仍然需要保留等待状态信息
private void setHead(Node node) {
    head = node;
    node.thread = null; // 线程信息已经保存在exclusiveOwnerThread中，无需在节点中保留
    node.prev = null; // 同步队列是双向非循环链表，head节点无需前驱节点信息，加快旧head的回收
}
```

##### AQS.shouldParkAfterFailedAcquire
```Java
// From AQS
// 当前线程不持有独占锁，判断能否安全地挂起线程
// 在本文仅需关注等待状态的3个可能值：CANCELLED(1)、SIGNAL(-1)、0
private static boolean shouldParkAfterFailedAcquire(Node pred, Node node) {
    // pred记为前驱节点，node记为当前节点
    int ws = pred.waitStatus; // 前驱节点的等待状态
    if (ws == Node.SIGNAL) // SIGNAL(-1)
        // 前驱节点的等待状态为SIGNAL
        // 表明前驱节点对应的线程在释放锁或被中断的时候会唤醒当前节点对应的线程，可以安全挂起当前线程
        return true;
    if (ws > 0) { // CANCELLED(1)
        // 唤醒的操作是由前驱节点完成的，而前驱节点的状态为CANCELLED时，是不会唤醒当前线程的
        // 因此直接挂起当前线程是不安全的，需要将当前节点的前驱节点设置非CANCELLED的节点
        // 从前驱节点往前遍历，直到找到等待状态不是CANCELLED的节点为止，并将当前节点的前驱节点属性指向"新的前驱节点"
        do {
            node.prev = pred = pred.prev;
        } while (pred.waitStatus > 0);
        // 找到"新的前驱节点"后，将"新的前驱节点"的后继节点设置为当前节点，为了保证双向链表，这会导致跳过一堆CANCELLED节点
        pred.next = node;
    } else { // 0
        // 个人理解，前驱节点的等待状态为0，有两种情况
        // 情况1：
        //   第1次进入时，前驱节点（包括head）的等待状态为0
        //   参照上面的addWaiter方法可知，节点入队时的等待状态为0
        //   CAS设置前驱节点的等待状态为SIGNAL，下个循环即可直接离开，进入线程挂起操作
        // 情况2：下面这段注释比较难理解，需要结合unlock的代码来理解
        //   unlock操作会唤醒head的后继节点对应的线程，而被唤醒的线程会参与竞争独占锁（tryAcquire）
        //   另外非公平锁的lock操作具有抢占性质，一开始就会通过compareAndSetState(0,acquires)来竞争独占锁
        //   从而在unlock与lock存在并发时，有可能导致被unlock操作唤醒的线程T竞争独占锁失败，那么就要考虑是否能够安全地再次挂起线程T
        //   而在unlock的执行路径上会将head的waitstatus在unlock时会被CAS设置成0，显然是不能安全地挂起线程T
        //   因此需要重新将head的waitstatus重新设置为SIGNAL，从而保证等待状态的语义一致性
        // Doug Lea大神的代码套路太深，后面还需多次阅读
        compareAndSetWaitStatus(pred, ws, Node.SIGNAL);
    }
    // 前驱节点的等待状态不为SIGNAL时，直接挂起当前线程是不安全的，因为当前线程需要前驱节点对应的线程唤醒，因此直接返回false，等待下一循环
    // 下一循环有可能成为head的后继节点并持有独占锁成功，省去了挂起/唤醒操作，这是自旋可能带来的好处，但实际上发生概率不高
    return false;
}
```

##### AQS.parkAndCheckInterrupt
```Java
// From AQS
// 挂起当前线程，进入休眠状态，在退出休眠状态后，返回当前线程是否由于中断而退出休眠状态
private final boolean parkAndCheckInterrupt() {
    // 将当前线程挂起，进入休眠状态，等待被唤醒或中断
    LockSupport.park(this);
    // 退出休眠状态的3种情况，其中两种为：其他线程unpark当前线程；其他线程中断当前线程
    // 通过获取当前线程的中断标志来判断当前线程是否由于中断而导致退出休眠状态的
    // Thread.interrupted()：判断当前线程是否被中断并重置当前线程的中断状态
    // 重置当前线程的中断状态是因为在acquireQueued方法中是一个"自旋过程"，需要在每次循环中获取准确的值
    return Thread.interrupted();
}
```


## ReentrantLock.unlock
```Java
// From ReentrantLock
public void unlock() {
    // lock实际是acquire(1)，unlock实际是relase(1)
    // 因此lock与unlock应该配对出现
    sync.release(1);
}
```
```Java
// From AQS
// 释放独占锁
public final boolean release(int arg) {
    if (tryRelease(arg)) { // 实际调用的Sync.tryRelease
        Node h = head;
        if (h != null && h.waitStatus != 0)
            // 如果head的等待状态不为0，正常情况下为SIGNAL，唤醒head的后继节点
            unparkSuccessor(h);
        return true;
    }
    return false;
}
```

### Sync.tryRelease
```Java
// From Sync
// 尝试释放锁
protected final boolean tryRelease(int releases) {
    int c = getState() - releases;
    if (Thread.currentThread() != getExclusiveOwnerThread())
        // 仅允许持有独占锁的线程释放锁
        throw new IllegalMonitorStateException();
    boolean free = false;
    if (c == 0) {
        // 锁是可重入的，当同步状态为0，表示可以释放锁
        free = true;
        // 重置独占锁的持有者为null，表示当前没有线程持有独占锁
        setExclusiveOwnerThread(null);
    }
    setState(c);
    return free;
}
```

### AQS.unparkSuccessor
```Java
// From AQS
// 唤醒后继节点
private void unparkSuccessor(Node node) {
    int ws = node.waitStatus;
    if (ws < 0)
        // 如果当前节点的等待状态为SIGNAL（本文仅关注CANCELLED、SIGNAL和0），CAS更新为0
        // 表示当前节点不再有唤醒后继节点对应线程的义务，因为现在已经在执行唤醒操作
        // 如果被唤醒的后继节点对应的线程参与竞争锁失败，shouldParkAfterFailedAcquire会将前驱节点的waitStatus重置为SIGNAL
        // 从而可以再次安全地挂起线程
        compareAndSetWaitStatus(node, ws, 0);

    // s为待唤醒的节点，表示离当前节点最近且等待状态不为CANCELLED的"后继节点"
    // 在正常情况下，s为当前节点的后继节点
    Node s = node.next;
    // 如果s为null或者s的等待状态为CANCELLED，需要跳过，往后遍历
    if (s == null || s.waitStatus > 0) {
        s = null;
        // 从尾节点开始向当前节点遍历，获取离当前节点最近且等待状态不为CANCELLED的节点
        for (Node t = tail; t != null && t != node; t = t.prev)
            if (t.waitStatus <= 0)
                s = t;
    }
    if (s != null)
        // 唤醒线程
        LockSupport.unpark(s.thread);
}
```
到这里并没有会产生`取消`节点（等待状态为`CANCELLED`）的代码，暂时不考虑`CANCELLED`的节点状态，结合前面的`lock`代码，`unlock`的逻辑示意图如下
![reentrantlock_aqs_unlock.png](http://otr5jjzeu.bkt.clouddn.com/reentrantlock_aqs_unlock.png)


# 源码分析 - 公平锁
分析了`非公平锁`的`lock`和`unlock`源码后，再分析`公平锁`就比较简单了
`unlock`的实现在`AQS.release(int arg)`中，没有公平与否的差异，主要差异在`lock`操作，下面关注`lock`操作的差异

## ReentrantLock.lock
```Java
// From FairSync
final void lock() {
    // 非公平锁会首先执行compareAndSetState(0,1)来尝试抢占锁，失败后才会执行acquire(1)
    // 公平锁直接执行acquire(1)，即正常的独占锁请求流程
    acquire(1);
}
```
```Java
// From AQS
public final void acquire(int arg) {
    // tryAcquire有公平策略和非公平策略，上面已经分析过了非公平策略，这里关注公平策略
    if (!tryAcquire(arg) &&
        acquireQueued(addWaiter(Node.EXCLUSIVE), arg))
        selfInterrupt();
}
```
```Java
// From FairSync
// 公平策略的tryAcquire
protected final boolean tryAcquire(int acquires) {
    final Thread current = Thread.currentThread();
    int c = getState();
    if (c == 0) {
        // 非公平锁没有hasQueuedPredecessors判断
        // 公平锁首先会进行hasQueuedPredecessors判断，查询是否有线程比当前线程等待了更长时间
        if (!hasQueuedPredecessors() &&
            compareAndSetState(0, acquires)) {
            setExclusiveOwnerThread(current);
            return true;
        }
    } else if (current == getExclusiveOwnerThread()) {
        int nextc = c + acquires;
        if (nextc < 0)
            throw new Error("Maximum lock count exceeded");
        setState(nextc);
        return true;
    }
    return false;
}
```
```Java
// From AQS
// 查询是否有线程比当前线程等待了更长时间
// 如果当前线程对应的节点之前是否存在有效节点（即非head），返回true
// 如果当前线程是head的后继节点或队列为空，返回false
public final boolean hasQueuedPredecessors() {
   Node t = tail;
   Node h = head;
   Node s;
   return h != t && // 队列不为空
        // head的后继节点的关联线程不是当前线程
        ((s = h.next) == null || s.thread != Thread.currentThread());
}
```

# 源码分析 - CANCELLED
上面的逻辑示意图中，选择性地忽略节点等待状态为`CANCELLED`的情况，
下面将关注产生等待状态为`CANCELLED`的代码及其运行过程，
由上面的源码分析可知，产生`CANCELLED`的原因有两个：**`中断`**或**`超时`**，
因此下面关注两个代表性的方法：
`lockInterruptibly`（中断） + `tryLock(long timeout,TimeUnit unit)`（超时），
下面分析均以`非公平锁`为例

## ReentrantLock.lockInterruptibly
`lock`是不响应中断的，`lockInterruptibly`是可以**`响应中断`**的
```Java
// From ReentrantLock
public void lockInterruptibly() throws InterruptedException {
    // 实际调用的是AQS.acquireInterruptibly
    sync.acquireInterruptibly(1);
}
```

### AQS.acquireInterruptibly
```Java
// From AQS
public final void acquireInterruptibly(int arg) throws InterruptedException {
    if (Thread.interrupted())
        // 在尝试获取锁之前，当前线程被中断，直接抛出InterruptedException
        // 此时尚未入队，因此除了抛出异常，无需其他操作
        throw new InterruptedException();
    if (!tryAcquire(arg))
        // 获取锁失败后，当前线程并未持有锁
        doAcquireInterruptibly(arg);
}
```
```Java
// From AQS
// 代码结构acquireQueued非常类似，仅标注差异的地方
private void doAcquireInterruptibly(int arg) throws InterruptedException {
    // 首先进行入队操作
    final Node node = addWaiter(Node.EXCLUSIVE);
    boolean failed = true;
    try {
        for (;;) { // 自旋，可响应中断，抛出InterruptedException异常
            final Node p = node.predecessor();
            if (p == head && tryAcquire(arg)) {
                setHead(node);
                p.next = null;
                failed = false;
                return;
            }
            if (shouldParkAfterFailedAcquire(p, node) && parkAndCheckInterrupt())
                // 如果是由于中断而退出休眠状态，直接抛出异常
                // failed为true，会执行cancelAcquire，取消请求锁
                throw new InterruptedException();
        }
    } finally {
        if (failed)
            // 当前线程取消请求锁，此时当前线程对应的节点已经入队
            cancelAcquire(node);
    }
}
```

### AQS.cancelAcquire
这是`lockInterruptibly`执行路径上**`最为重要的方法`**！！
```Java
// From AQS
// 取消请求锁
private void cancelAcquire(Node node) {
    if (node == null)
        return; // 防御性编程
    node.thread = null; // 清除当前线程对应节点的线程信息

    // 跳过同步队列中等待状态为CANCELLED的前驱节点
    // pred是从当前线程对应节点往前搜索第一个等待状态不是CANCELLED的节点N，节点N具有唤醒后继节点的能力
    Node pred = node.prev;
    while (pred.waitStatus > 0)
        node.prev = pred = pred.prev;

    // 用于后面代码CAS更新pread的next属性时的期望值
    Node predNext = pred.next;

    // 将当前线程对应节点的等待状态置为CANCELLED
    node.waitStatus = Node.CANCELLED;

    if (node == tail && compareAndSetTail(node, pred)) {
        // 当前线程对应节点为尾节点，且将尾节点成功地CAS设置为原尾节点的前驱节点，这时需要清空新尾节点的后继节点属性（置为null）
        compareAndSetNext(pred, predNext, null);
    } else {
        // 如果当前节点不是尾节点或者CAS更新队尾为pred失败（有可能addWaiter新增节点到队尾，当前节点不再是尾节点）
        // 执行到这里表明当前节点必然有后继节点，需要结合等待状态串联当前节点的"前驱节点"和"后继节点"
        int ws;

        if (pred != head &&
            ((ws = pred.waitStatus) == Node.SIGNAL || (ws <= 0 && compareAndSetWaitStatus(pred, ws, Node.SIGNAL))) &&
            pred.thread != null) {
            // 三个逻辑条件比较难理解，具体分析请参照else分支，概括起来就是：
            // pred不是head + pred具有唤醒后继节点的能力 + pred此刻尚未在执行ancelAcquire或尚未成为新的head
            // 如果此时后继节点的同步状态不为CANCELLED，尝试串联有意义的"前驱节点"和"后继节点"
            // 如果此时后继节点的同步状态为CANCELLED，当前节点对应的线程无需任何操作，因为后继节点对应线程会做同样的尝试
            Node next = node.next;
            if (next != null && next.waitStatus <= 0)
                // 后继节点的同步状态不为CANCELLED，说明等待被唤醒
                // 将pred的后继节点设置为当前节点的后继节点，即pred->next
                compareAndSetNext(pred, predNext, next);
        } else {
            // 1. 如果pred是head，可以直接唤醒node的后继节点
            // 2. 如果pred不是head + pred已经不具有唤醒后继节点的能力，直接唤醒node的后继节点（可以跳过CANCELLED节点）
            //    2.1 pred.waitStatus == Node.SIGNAL && !compareAndSetWaitStatus(pred, ws, Node.SIGNAL)
            //    2.2 pred.waitStatus == 0 or Node.CANCELLED
            // 3. 如果pred不是head + pred具有唤醒后继节点的能力 + pred此刻已经在执行ancelAcquire或已经成为新的head，直接唤醒node的后继节点
            //    3.1 pred.waitStatus == Node.SIGNAL
            //    3.2 pred.waitStatus == 0 && compareAndSetWaitStatus(pred, ws, Node.SIGNAL)
            unparkSuccessor(node);
        }

        node.next = node; // 加快垃圾回收
    }
}
```

## ReentrantLock.tryLock(long timeout,TimeUnit unit)
```Java
// From AQS
// 实际调用的是sync.tryAcquireNanos(1, unit.toNanos(timeout))
public boolean tryLock(long timeout, TimeUnit unit) throws InterruptedException {
   return sync.tryAcquireNanos(1, unit.toNanos(timeout));
}
```

### AQS.tryAcquireNanos
```Java
// From AQS
public final boolean tryAcquireNanos(int arg, long nanosTimeout) throws InterruptedException {
    if (Thread.interrupted())
        throw new InterruptedException();
    return tryAcquire(arg)
                || doAcquireNanos(arg, nanosTimeout); // 获取锁失败后，当前线程并未持有锁
}
```
```Java
// From AQS
// 代码结构doAcquireInterruptibly非常类似，仅标注差异的地方
private boolean doAcquireNanos(int arg, long nanosTimeout) throws InterruptedException {
    if (nanosTimeout <= 0L)
        // nanosTimeout为非正值，不合法
        // 此时尚未入队，无需其他操作，直接返回false
        return false;
    // 绝对时间
    final long deadline = System.nanoTime() + nanosTimeout;
    // 进入同步队列进行排队等待锁
    final Node node = addWaiter(Node.EXCLUSIVE);
    boolean failed = true;
    try {
        for (;;) { // 自旋，可响应中断，抛出InterruptedException；超时会取消请求并返回false
            final Node p = node.predecessor();
            if (p == head && tryAcquire(arg)) {
                setHead(node);
                p.next = null;
                failed = false;
                return true;
            }
            nanosTimeout = deadline - System.nanoTime();
            if (nanosTimeout <= 0L)
                // 超时会执行cancelAcquire来取消请求锁，然后返回false
                return false;
            if (shouldParkAfterFailedAcquire(p, node) &&
                // 距离超时的时间大于spinForTimeoutThreshold时，挂起线程一段时间后自动退出休眠状态
                // 前面lock执行路径上的acquireQueued方法和lockInterruptibly执行路径上的doAcquireInterruptibly方法都是调用parkAndCheckInterrupt，休眠直到被唤醒或被中断
                // tryLock(long timeout,TimeUnit unit)的执行路径上是依据距离超时时间的多少进行限时休眠，自动唤醒
                // 离超时时间仅剩1000纳秒时，采用自旋，不再挂起线程
                nanosTimeout > spinForTimeoutThreshold)
                LockSupport.parkNanos(this, nanosTimeout);
            if (Thread.interrupted())
                // 线程如果被中断，执行cancelAcquire来取消请求锁，然后抛出InterruptedException
                throw new InterruptedException();
        }
    } finally {
        if (failed)
            cancelAcquire(node);
    }
}
```

## 逻辑示意图
已经分析了产生`CANCELLED`节点的代码，以`中断`产生`CANCELLED`节点为例，下面是有`CANCELLED`节点参与的逻辑示意图

### 代码
```Java
/**
 * Debug查看lockInterruptibly的时同步队列的变化过程
 */
public class LockInterruptiblyDemo {
    static ReentrantLock lock = new ReentrantLock();
    static Runnable task = () -> {
        try {
            System.out.println(String.format("%s acquire lock...", Thread.currentThread().getName()));
            lock.lockInterruptibly();
            System.out.println(String.format("%s hold lock", Thread.currentThread().getName()));
        } catch (InterruptedException e) {
            System.out.println(String.format("%s interrupted", Thread.currentThread().getName()));
        } finally {
            // never unlock
        }
    };

    public static void main(String[] args) throws InterruptedException {
        Thread t0 = new Thread(task, "t0");
        Thread t1 = new Thread(task, "t1");
        Thread t2 = new Thread(task, "t2");
        Thread t3 = new Thread(task, "t3");
        Thread t4 = new Thread(task, "t4");

        // 确保t0持有锁，排队顺序为t1->t2->t3
        t0.start();
        sleepForAwhile();
        t1.start();
        sleepForAwhile();
        t2.start();
        sleepForAwhile();
        t3.start();
        sleepForAwhile();

        // 中断尾节点
        t3.interrupt();
        sleepForAwhile();

        // t4加入排队
        t4.start();
        sleepForAwhile();

        // 中断非尾节点、非head的后继节点
        t2.interrupt();
        sleepForAwhile();

        // 中断head的后继节点
        t1.interrupt();
    }

    private static void sleepForAwhile() throws InterruptedException {
        TimeUnit.SECONDS.sleep(1);
    }
}
```

### 逻辑示意图
![reentrantlock_aqs_lockInterruptibly.png](http://otr5jjzeu.bkt.clouddn.com/reentrantlock_aqs_lockInterruptibly.png)

<!-- indicate-the-source -->
