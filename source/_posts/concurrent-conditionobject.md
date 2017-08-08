---
title: 并发 - JUC - ConditionObject - 源码剖析
date: 2016-08-12 00:06:25
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
本文将通过剖析与`ReentrantLock`密切相关的`ConditionObject`的源码来介绍其实现原理
代码托管在https://github.com/zhongmingmao/concurrent_demo
关于`ReentrantLock`的基本内容请参考「并发 - JUC - ReentrantLock - 源码剖析」，本文不在赘述
{% endnote %}

<!-- more -->

# 基础

## 使用场景
`Condition`常用于**`生产者-消费者`**的场景，例如`ArrayBlockingQueue`，`JUC`框架也有很多地方使用了`Condition`，如下图所示
![condition_usages.png](http://otr5jjzeu.bkt.clouddn.com/condition_usages.png)

## 生产者-消费者
```Java
/**
 * 利用Condition实现生产者-消费者
 * @author zhongmingmao zhongmingmao0625@gmail.com
 */
public class ProducerAndConsumer {
    
    static class Buffer {
        // 缓冲区大小
        private static final int BUFFER_LENGTH = 5;
        
        // 非公平锁
        private final Lock lock = new ReentrantLock();
        private final Condition notEmpty = lock.newCondition();
        private final Condition notFull = lock.newCondition();
        
        // 缓冲区
        private final Object[] buffer = new Object[BUFFER_LENGTH];
        
        int produceIndex;
        int consumeIndex;
        int count;
        
        public void produce() throws InterruptedException {
            while (true) {
                lock.lock();
                try {
                    while (count == BUFFER_LENGTH) {
                        System.out.println("buffer is full , need to consume");
                        notFull.await();  // 缓存区已满，需要等待消费者消费后，唤醒生产者才能继续生产
                    }
                    buffer[produceIndex++] = new Object();
                    produceIndex %= BUFFER_LENGTH;
                    ++count;
                    System.out.println(String.format("produce buffer[%s] , buffer size : %s",
                            (BUFFER_LENGTH + produceIndex - 1) % BUFFER_LENGTH, count));
                    notEmpty.signal(); // 已经生产，唤醒消费者去消费
                } finally {
                    lock.unlock();
                    TimeUnit.MILLISECONDS.sleep(new Random().nextInt(1000)); // 模拟生产耗时，并让消费者能获得锁
                }
            }
        }
        
        public void consume() throws InterruptedException {
            while (true) {
                lock.lock();
                try {
                    while (count == 0) {
                        System.out.println("buffer is full , need to produce");
                        notEmpty.await(); // 缓存区为空，需要等待生产者生产完成后，唤醒消费者
                    }
                    Object x = buffer[consumeIndex++];
                    consumeIndex %= BUFFER_LENGTH;
                    --count;
                    System.out.println(String.format("consume buffer[%s] , buffer size : %s",
                            (BUFFER_LENGTH + consumeIndex - 1) % BUFFER_LENGTH, count));
                    notFull.signal(); // 已经消费，唤醒生产者去生产
                } finally {
                    lock.unlock();
                    TimeUnit.MILLISECONDS.sleep(new Random().nextInt(1000)); // 模拟消费耗时，并让生产者能获得锁
                }
            }
        }
    }
    
    public static void main(String[] args) throws InterruptedException {
        Buffer buffer = new Buffer();
        
        ExecutorService pool = Executors.newFixedThreadPool(2);
        pool.submit(() -> { // 生产者线程
            try {
                buffer.produce();
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        });
        
        pool.submit(() -> { // 消费者线程
            try {
                buffer.consume();
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        });
        
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
    }
}
```

## Condition接口
```Java
public interface Condition {
    // 使当前线程进入等待状态直到被signal或中断，相当于synchronized等待唤醒机制中的wait()方法
    void await() throws InterruptedException;
    // 使当前线程进入等待状态直到被signal，不响应中断
    void awaitUninterruptibly();
    // 使当前线程进入等待状态直到被signal、或被中断、或超时（相对时间）
    long awaitNanos(long nanosTimeout) throws InterruptedException;
    // 与awaitNanos类似，可以指明时间单位
    boolean await(long time, TimeUnit unit) throws InterruptedException;
    // 与awaitNanos类似，只是采用的是绝对时间
    boolean awaitUntil(Date deadline) throws InterruptedException;
    // 唤醒一个等待在Condition上的线程，必须首先持有与Condition相关联的锁，相当于notify()
    void signal();
    // 与signal类似，相当于notifyAll()
    void signalAll();
}
```
一个很关键的地方：`Condition`的实现类在重写`Condition`的`所有方法`都建议`先持有与Condition关联的锁`，`AQS`中的`ConditionObject`就满足这一点，因此调用`ConditionObject`方法是`线程安全`的，下面分析不再重复这一点

## ConditionObject

### 实例化
在`生产者-消费者`的代码里面，`newCondition()`的实际创建`ConditionObject`对象
```Java
// From ReentrantLock
public Condition newCondition() {
    return sync.newCondition();
}
```
```Java
// From Sync
final ConditionObject newCondition() {
    return new ConditionObject();
}
```

### 核心结构
```Java
public class ConditionObject implements Condition, java.io.Serializable {
    // 条件队列（condition queue）的头结点
    private transient Node firstWaiter;
    // 条件队列的尾节点
    private transient Node lastWaiter;
    
    // 中断模式：需要重新设置中断状态
    private static final int REINTERRUPT =  1;
    // 中断模式：需要抛出InterruptedException异常
    private static final int THROW_IE    = -1;
}
```
下面先回顾`Node`的定义
```Java
static final class Node {
    // 本文不关注该模式
    static final Node SHARED = new Node();
    // 节点处于独占模式
    static final Node EXCLUSIVE = null;
    
    // 由于超时或中断而导致当前线程被取消
    // CANCELLED是终态
    // 被取消了的节点对应的线程永远不会阻塞，放弃竞争锁
    static final int CANCELLED =  1;

    // 当前节点的后继节点通过park操作被阻塞（或将要被阻塞）
    // 因此当前节点在它们释放锁或被取消的时候，需要通过unpark操作唤醒它的后继节点
    // 为了避免竞争（依据等待状态进行筛选，无需全部唤醒），
    // 执行竞争锁的方法（acquire methods）的线程首先需要表明它们需要被唤醒，
    // 如果竞争锁失败，它们就会被阻塞，等待被唤醒
    // 是否需要被唤醒，其实是记录在当前节点的前驱节点的等待状态中
    // 因此SIGNAL表示后继节点需要被唤醒，这一点非常重要！！
    static final int SIGNAL    = -1;
    /**
     * This node is currently on a condition queue.
     * It will not be used as a sync queue node
     * until transferred, at which time the status
     * will be set to 0. (Use of this value here has
     * nothing to do with the other uses of the
     * field, but simplifies mechanics.
     */
    // 当前节点处于条件队列
    // 在当前节点转移到同步队列之前，同步队列不会使用当前节点
    // 在当前节点转移到同步队列的时候，等待状态会被设置为0
    static final int CONDITION = -2;
    // 本文不关注该状态
    static final int PROPAGATE = -3;
    
    // 等待状态，只能为CANCELLED、SIGNAL、CONDITION、PROPAGATE或0
    volatile int waitStatus;
    
    // 同步队列中的前驱节点
    volatile Node prev;
    // 同步队列中的后继节点
    volatile Node next;
    // 请求锁的线程
    volatile Thread thread;
    // 条件队列的后继节点
    Node nextWaiter;
}
```
由此可见，`条件队列`仅有`Node nextWaiter`，是`单向队列`
`条件队列`中节点的`等待状态`只有3种：`CANCELLED`（需要从条件队列中移除）和`CONDITION`（等待被转移）和0（在`transferAfterCancelledWait`或`transferForSignal`中设置，后面详细分析）
`AQS`只能拥有`1个同步队列`，但可以拥有`多个条件队列`

### 同步队列与条件队列
`条件队列`与`同步队列`的关系大致如下：
![aqs_condition_queue.png](http://otr5jjzeu.bkt.clouddn.com/aqs_condition_queue.png)
简单说明（后面源码分析将详细介绍）：
1. `ReentrantLock.newCondition()`创建一个新的`ConditionObject`实例，每个`ConditionObject`拥有`firstWaiter`属性和`lastWaiter`属性，对应一个`条件队列`
2. `ConditionObject.await()`会将`当前线程`包装成`节点`后加入到`对应的条件队列`，然后`阻塞`，`等待转移`
3. `ConditionObject.signal()`会将`对应的条件队列中的节点`（从头结点开始往后遍历筛选）转移到`AQS同步队列的队尾`，`等待获得锁`，获得锁后，上面的`await()`方法返回，继续执行

# 源码分析

## await
`await()`方法的分析在本文中是最复杂的
```Java
// From ConditionObject
// 如果线程在阻塞阶段
public final void await() throws InterruptedException {
    if (Thread.interrupted())
        // 线程被中断则直接抛出InterruptedException，可响应中断
        throw new InterruptedException();
    // 创建新节点并加入条件队列的队尾
    Node node = addConditionWaiter();
    // 完全释放独占锁（锁是可重入的）并尝试唤醒同步队列头结点的后继节点，并返回释放锁之前的同步状态
    int savedState = fullyRelease(node);
    int interruptMode = 0;
    // 判断节点是否已经转移到同步队列
    while (!isOnSyncQueue(node)) {
        // 节点还在条件队列中，挂起当前线程，等待被唤醒或被中断
        LockSupport.park(this);
        // 执行到这里的有3种情况：
        // 1. ConditionObject.signal -> 节点从条件队列转移到同步队列（前驱节点等待状态为SIGNAL） -> 被前驱节点唤醒（unpark）
        // 2. ConditionObject.signal -> 节点从条件队列转移到同步队列（前驱节点等待状态为CANCELLED） -> 直接唤醒（unpark）
        // 3. 当前线程被中断（interrupt）
    
        // checkInterruptWhileWaiting的3种返回值：
        // 1. 当前线程没有被中断，返回0
        // 2. 如果线程中断发生在ConditionObject.signal()启动之前，执行入队操作，返回THROW_IE
        // 3. 如果线程中断发生在ConditionObject.signal()启动之后，自旋等待入队操作完成，返回REINTERRUPT
        if ((interruptMode = checkInterruptWhileWaiting(node)) != 0)
            // 由于中断而导致退出休眠状态，则退出循环
            break;
    }
    
    // fullyRelease已经释放了锁，下面会等待锁，与包裹await()方法的unlock()方法配对
    // 执行到这里，说明线程被中断（被中断也会完成节点转移，下面会详细分析）或者节点转移成功，所以此时节点已经转移到了同步队列
    if (acquireQueued(node, savedState) // acquireQueued是通过自旋来等待锁，并且返回是否被中断
            && interruptMode != THROW_IE) // 执行第二个条件判断，说明已经获得锁并且当前线程被中断了，但中断标志被重置了   
        // 执行到这里，说明interruptMode为0或REINTERRUPT，显然REINTERRUPT，对于下面的语句是没有意义的，因此仅需考虑0的情况
        // interruptMode=0说明上面的while循环没有被中断，而在acquireQueued被中断了，且中断标志被重置了，因此需要将interruptMode设置为REINTERRUPT
        interruptMode = REINTERRUPT;
    if (node.nextWaiter != null)
        // 执行到这里的场景是：由于中断发生在signal之前，没有重置node.nextWaiter为null，
        // 而acquireQueued会将当前节点的等待状态置为CANCELLED，因此需要清理条件队列中的CANCELLED节点
        unlinkCancelledWaiters();
    if (interruptMode != 0)
        // 当线程在await()中退出休眠状态，依据不同的中断模式，向调用方报告线程中断情况
        // ConditionObject.signal方法启动之前中断了当前线程，往外抛出InterruptedException异常
        // ConditionObject.signal方法启动之后中断了当前线程，重置线程的中断状态
        reportInterruptAfterWait(interruptMode);
}
```

### addConditionWaiter
```Java
// From ConditionObject
private Node addConditionWaiter() {
    Node t = lastWaiter;
    
    if (t != null && t.waitStatus != Node.CONDITION) {
        // 如果条件队列尾节点的等待状态是CANCELLED，从头结点开始遍历条件队列，并移除CANCELLED节点
        unlinkCancelledWaiters();
        // 获取最新的条件队列尾节点
        t = lastWaiter;
    }
    // 创建新节点，等待状态为CONDITION
    Node node = new Node(Thread.currentThread(), Node.CONDITION);
    if (t == null)
        // 队列为空，将firstWaiter指向刚创建的节点
        firstWaiter = node;
    else
        // 队列不为空，原队尾的后继节点设置为刚创建的节点
        t.nextWaiter = node;
    // 更新队尾为刚创建的节点
    lastWaiter = node;
    return node;
}
```
#### unlinkCancelledWaiters
```Java
// From ConditionObject
// 从头结点开始遍历条件队列，并移除CANCELLED节点
// 很巧妙的代码
private void unlinkCancelledWaiters() {
    Node t = firstWaiter; // 从头结点开始迭代，t用于迭代
    Node trail = null; // 遍历过程中，用于记录最近的已遍历的CONDITION节点，初始值为null
    while (t != null) {
        Node next = t.nextWaiter; // t在条件队列中的后继节点
        if (t.waitStatus != Node.CONDITION) {
            // t的等待状态为CANCELLED，首先需要断开t与t的后继节点的连接
            t.nextWaiter = null;
            if (trail == null)
                // trail等于null，头结点到当前遍历节点都是CANCELLED节点，
                // 直接将头结点设置为当前遍历节点的后继节点
                firstWaiter = next;
            else
                // trail不为null，即存在最近的已遍历的CONDITION节点，
                // 将trail的后继节点设置为当前遍历节点的后继节点，
                // 这将跳过trail（不包括）到当前遍历节点（）包括，因为这些节点都明确是CANCELLED节点
                trail.nextWaiter = next;
            if (next == null)
                // next=null，说明t是原尾节点，
                // 而进入到这里的前提是当前遍历节点（既原尾节点为CANCELLED节点）
                // 直接将尾节点更新为trail（最近的已遍历的CONDITION节点）
                lastWaiter = trail;
        }
        else
            // trail用于记录最近的已遍历的CONDITION节点
            trail = t;
        // t是迭代节点，往后迭代
        t = next;
    }
}
```
逻辑示意图如下：
![aqs_condition_queue_unlink_cancelled_waiters.png](http://otr5jjzeu.bkt.clouddn.com/aqs_condition_queue_unlink_cancelled_waiters.png)

### fullyRelease
```Java
// From AQS
// 完全释放独占锁（锁是可重入的）并尝试唤醒同步队列头结点的后继节点，并返回释放锁之前的同步状态
final int fullyRelease(Node node) {
    boolean failed = true;
    try {
        // 释放锁之前的同步状态
        int savedState = getState();
        // 尝试释放锁并唤醒同步队列头节点的后续节点
        // 释放锁调用的tryRelease方法必须首先要持有锁
        // 说明了ConditionObject.await()方法必须要先持有ConditionObject对应的锁
        if (release(savedState)) {
            failed = false;
            // 成功释放锁
            return savedState;
        } else {
            throw new IllegalMonitorStateException();
        }
    } finally {
        if (failed)
            // 释放锁失败，将节点的等待状态置为CANCELLED，等待移除
            // 执行到这里的前提是fullyRelease中的savedState与tryRelease中的getState()不一致，
            // 即执行fullyRelease的过程中AQS的同步状态发生了变更
            // 能修改了同步状态的，仅有两个方法：setState和compareAndSetState
            // 在JDK1.8.0_121，ReentrantLock的代码中调用setState之前都需要持有独占锁，而ConditionObject.await()已经持有了独占锁
            // 在JDK1.8.0_121，ReentrantLock的代码中调用compareAndSetState的预期值都是0，显然这tryRelease的getState()依旧保留这非0状态
            // 所以个人认为不会执行到这里，如有错误，还望指正
            node.waitStatus = Node.CANCELLED;
    }
}
```
```Java
// From AQS
// 更详细的分析请参照博文：「并发 - JUC - ReentrantLock - 源码剖析」
public final boolean release(int arg) {
    if (tryRelease(arg)) { // 尝试释放锁
        Node h = head;
        if (h != null && h.waitStatus != 0)
            unparkSuccessor(h);
        return true;
    }
    return false;
}
```
```Java
// From Sync
protected final boolean tryRelease(int releases) {
    int c = getState() - releases;
    if (Thread.currentThread() != getExclusiveOwnerThread())
        // 只有持有独占锁的线程才能释放锁
        throw new IllegalMonitorStateException();
    boolean free = false;
    if (c == 0) {
        free = true;
        setExclusiveOwnerThread(null);
    }
    setState(c);
    return free; // fullyRelease实际执行到这里的时候，锁已经完全释放了
}
```

### isOnSyncQueue
```Java
// From AQS
// 判断节点是否已经转移到同步队列
// ConditionObject.signal()会将节点从条件队列转移到同步队列
final boolean isOnSyncQueue(Node node) {
    if (node.waitStatus == Node.CONDITION || node.prev == null)
        // 1. 节点加入条件队列时，等待状态为CONDITION，在节点转移过程中，会将等待状态设置为0，
        //    所以如果节点的等待状态为CONDITION，说明节点一定还在条件队列中；
        // 2. 转移过程中会首先设置节点的同步队列前驱节点属性，
        //    如果节点的同步队列前驱节点属性为null，说明节点一定还在条件队列中，
        //    另外需要注意的是，即使节点拥有了同步队列的前驱节点也不能说明节点已经转移到了同步队列中，
        //    因为有可能compareAndSetTail失败，那么同步队列的原尾节点的后继节点依旧为null，而不是node
        //    此时node还只是单方面的连接到同步队列，同步队列中没有任何节点将其作为前驱节点或后继节点
        //    更详细的分析请参照博文：「并发 - JUC - ReentrantLock - 源码剖析」
        return false;
    if (node.next != null)
        // 如果节点拥有了同步队列的后继节点，那么节点一定已经转移到了同步队列中
        // 更详细的分析请参照博文：「并发 - JUC - ReentrantLock - 源码剖析」
        return true;

    // 从同步队列的尾节点向前遍历，看能否找到节点node
    // 由于队是在队尾，因此大部分情况下，当前节点不会离同步队列队尾太远，效率较高
    return findNodeFromTail(node);
}
```

#### findNodeFromTail
```Java
// From AQS
// 从同步队列的尾节点向前遍历，看能否找到节点node
private boolean findNodeFromTail(Node node) {
    Node t = tail; // 从同步队列尾节点开始遍历
    for (;;) {
        if (t == node)
            return true;
        if (t == null) 
            // t.next为head，即同步队列头结点
            return false;
        t = t.prev;
    }
}
```

### checkInterruptWhileWaiting
```Java
// From ConditionObject
// 当前线程没有被中断，返回0
// 如果线程中断发生在ConditionObject.signal()启动之前，执行入队操作，返回THROW_IE
// 如果线程中断发生在ConditionObject.signal()启动之后，自旋等待入队操作完成，返回REINTERRUPT
private int checkInterruptWhileWaiting(Node node) {
    return Thread.interrupted() ? // 返回线程是否被中断，并重置中断状态
                    (transferAfterCancelledWait(node) ? THROW_IE : REINTERRUPT) : 
                    0; // 没有被线程没有被中断，返回0
}
```

#### transferAfterCancelledWait
```Java
// From AQS
// 如果线程中断发生在ConditionObject.signal()启动之前，执行入队操作，返回true，对应THROW_IE
// 如果线程中断发生在ConditionObject.signal()启动之前，自旋等待入队操作完成，返回false，对应REINTERRUPT
final boolean transferAfterCancelledWait(Node node) {
    if (compareAndSetWaitStatus(node, Node.CONDITION, 0)) {
        // CAS成功地将节点的等待状态从CONDITION置为0，则进入同步队列
        // 执行到这里，说明是ConditionObject.signal（实际上是transferForSignal）尚未被调用
        // 因为ConditionObject.signal在将节点转移到同步节点时也会执行同样的CAS操作
        // 如果signal执行CAS成功了，就不会执行到这里
        
        // 这会导致transferForSignal不会继续执行转移操作，因此这里要完成transferForSignal本该完成的工作（节点转移）
        // 自旋进入同步队列
        enq(node); 
        return true;
    }

    // 执行到这里是因为ConditionObject.signal已经将节点的等待状态置为0，导致上面的CAS操作失败
    // 说明中断是发生在ConditionObject.signal启动之后，这时节点转移可能还没有完成（这个概率很低）
    // 出现这种情况，就通过自旋来等待转移操作完成（即便发生中断，依旧会转移节点）
    while (!isOnSyncQueue(node))
        Thread.yield(); // 尝试让出CPU资源，但不会让出锁资源
    return false; 
}
```

### reportInterruptAfterWait
```Java
// From ConditionObject
// 当线程在await()中退出休眠状态，依据不同的中断模式，向调用方报告线程中断情况
// 如果中断模式是THROW_IE时，则抛出InterruptedException异常
// 如果中断模式是REINTERRUPT时，则执行线程自我中断，重置中断状态
private void reportInterruptAfterWait(int interruptMode) throws InterruptedException {
    if (interruptMode == THROW_IE)
        throw new InterruptedException();
    else if (interruptMode == REINTERRUPT)
        selfInterrupt();
}
```

## signal
有一点需要说明，`ConditionObject.signal`**`不总是`**直接唤醒线程，而是首先将节点从`条件队列`转移到`同步队列`，
如果`被转移的节点`在同步队列中的**`前驱节点没有被取消`**，那么`被转移的节点`在`同步队列`中`等待锁`，
如果`被转移的节点`在同步队列中的**`前驱节点被取消`**了，才会`直接唤醒被转移节点`的关联线程，这点比较重要，不要认为signal就是直接唤醒
```Java
// From ConditionObject
// 从条件队列头节点开始遍历，找出第一个需要转移的节点，并转移到同步队列
public final void signal() {
    if (!isHeldExclusively()) // 当前线程是否持有独占锁
        // 说明调用ConditionObject.signal()方法之前必须先持有与ConditionObject关联的独占锁
        throw new IllegalMonitorStateException();
    Node first = firstWaiter;
    if (first != null) 
        // 条件队列不为空时，从条件队列头节点开始遍历，找出第一个需要转移的节点，并转移到同步队列
        doSignal(first);
}
```

### isHeldExclusively
```Java
// From Sync
protected final boolean isHeldExclusively() {
    return getExclusiveOwnerThread() == Thread.currentThread();
}
```

### doSignal
```Java
// From ConditionObject
// 从条件队列头节点开始遍历，找出第一个需要转移的节点，并转移到同步队列
private void doSignal(Node first) {
    do {
        if ( (firstWaiter = first.nextWaiter) == null)
            // 如果条件队列的头结点为null，条件队列的尾节点必为null
            lastWaiter = null;
        // first将要被转移到同步队列，需要从条件队列中断开
        first.nextWaiter = null;
    } while (
        // 没有成功转移有效节点并且未达到条件队列尾节点，继续循环
        !transferForSignal(first) && (first = firstWaiter) != null);
}
```

#### transferForSignal
```Java
// From AQS
// 将节点从条件队列转移到同步队列，转移成功且没有被中断则返回true，因中断而取消则返回false
// 即成功转移有效节点返回true，否则返回false
final boolean transferForSignal(Node node) {
    // 转移节点之前首先将其等待状态设置为0
    // 这与ReentrantLock.lock()竞争锁失败时，封装成节点并准备进入同步队列的场景保持一致
    // 那时节点的等待状态也是0，因此当前节点准备进入同步队列前，等待状态也设置为0
    if (!compareAndSetWaitStatus(node, Node.CONDITION, 0))
        // 如果CAS失败，有两种情况
        // 1. 节点的等待状态为CANCELLED：节点的关联线程已经被唤醒，但节点依然会被转移到同步队列中（transferAfterCancelledWait），
        //    随后等待状态也被设置为CANCELLED，直接返回false，进行下一循环
        // 2. 节点的等待状态为0：在transferForSignal被调用前，线程因中断而退出休眠状态，继续执行await()后半段代码
        //    这会通过transferAfterCancelledWait来校验中断发生在transferForSignal之前还是transferForSignal之后
        //    如果是之前，那么此时的预期值为0，CAS会失败，直接返回false， 
        //    transferAfterCancelledWait()方法会在中断产生时完成节点转移工作，进入下一循环
        return false;
    
    // 节点自旋进入同步队列，并返回前驱节点
    // 更详细的分析请参照博文：「并发 - JUC - ReentrantLock - 源码剖析」
    Node p = enq(node);
    int ws = p.waitStatus; // 前驱节点的等待状态

    // 1. ws>0，说明前驱节点的等待状态为CANCELLED，放弃竞争锁，直接唤醒当前节点
    // 2. 如果ws<=0，则统一将前驱节点跟新为SIGNAL，表示当前驱节点取消时，能够唤醒当前节点，当前节点可以被安全地挂起
    //    如果CAS更新失败，则直接唤醒当前节点
    // 简单概括起来就是如果前驱节点取消了，就直接唤醒当前节点
    if (ws > 0 || !compareAndSetWaitStatus(p, ws, Node.SIGNAL))
        LockSupport.unpark(node.thread); // 线程被唤醒后会继续执行await()的后半段代码
    return true;
}
```

## awaitUninterruptibly
前面分析的`await()`方法是`响应中断`的，本节介绍的`waitUninterruptibly()`是`不响应中断`的
```Java
// From ConditionObject
// 与await()方法类似，仅标注不一样的地方
public final void awaitUninterruptibly() {
    Node node = addConditionWaiter();
    int savedState = fullyRelease(node);
    boolean interrupted = false;
    while (!isOnSyncQueue(node)) {
        LockSupport.park(this);
        if (Thread.interrupted())
            // 如果曾经由于中断而退出休眠状态，而标记被中断
            interrupted = true;
    }
    if (acquireQueued(node, savedState) || interrupted)
        selfInterrupt(); // 在节点转移过程中，如果曾经被中断，则重新设置中断标志
}
```

## await(long time,TimeUnit unit)
前面分析的`await()`方法是`不限时等待`的，本节介绍的`await(long time,TimeUnit unit)`是`限时等待`的
```Java
// From ConditionObject
// 与await()方法类似，仅标注不一样的地方
public final boolean await(long time, TimeUnit unit) throws InterruptedException {
    // 剩余的等待时长（纳秒）
    long nanosTimeout = unit.toNanos(time);
    if (Thread.interrupted())
        throw new InterruptedException();
    Node node = addConditionWaiter();
    int savedState = fullyRelease(node);
    // 超时的绝对时间
    final long deadline = System.nanoTime() + nanosTimeout;
    // 标注是否超时
    boolean timedout = false;
    int interruptMode = 0;
    while (!isOnSyncQueue(node)) {
        if (nanosTimeout <= 0L) {
            // 剩余的等待时长为非正值，说明超时了，则执行transferAfterCancelledWait并取消等待
            // transferAfterCancelledWait如果返回true，说明节点转移成功
            // transferAfterCancelledWait如果返回false，说明在超时发生前，ConditionObject.signal已经触发，可以归纳为没有超时
            timedout = transferAfterCancelledWait(node);
            break;
        }
        // 当剩余的等待时长不小于1000纳秒时，这选择限时挂起线程，线程在nanosTimeout会自动唤醒（假如期间没有被中断）
        // 当剩余的等待时长小于1000纳秒时，选择自旋，不挂起线程
        if (nanosTimeout >= spinForTimeoutThreshold)
            LockSupport.parkNanos(this, nanosTimeout);
        if ((interruptMode = checkInterruptWhileWaiting(node)) != 0)
            break;
        // 更新剩余的等待时长
        nanosTimeout = deadline - System.nanoTime();
    }
    if (acquireQueued(node, savedState) && interruptMode != THROW_IE)
        interruptMode = REINTERRUPT;
    if (node.nextWaiter != null)
        unlinkCancelledWaiters();
    if (interruptMode != 0)
        reportInterruptAfterWait(interruptMode);
    return !timedout; // 返回是否await等待超时
}
```

<!-- indicate-the-source -->

