---
title: 并发 - JUC - ArrayBlockingQueue - 源码剖析
date: 2016-08-25 00:06:25
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
本文将通过剖析`ArrayBlockingQueue`的源码来介绍其实现原理
关于`ReentrantLock`的基本内容请参考「并发 - JUC - ReentrantLock - 源码剖析」，本文不再赘述
关于`ConditionObject`的基本内容请参考「并发 - JUC - ConditionObject - 源码剖析」，本文不再赘述
{% endnote %}

<!-- more -->

# 基础
`ArrayBlockingQueue`是基于`数组`实现的`有界阻塞`队列
`ArrayBlockingQueue`是通过`ReentrantLock`和`ConditionObject`来实现同步的，相关内容请参考博文「并发 - JUC - ReentrantLock - 源码剖析」和「并发 - JUC - ConditionObject - 源码剖析」

# 源码分析

## 核心结构
```Java
public class ArrayBlockingQueue<E> extends AbstractQueue<E> implements BlockingQueue<E>, java.io.Serializable {
    // 定长数组，final修饰，一旦初始化，长度不再变化
    final Object[] items;
    // 下一次 take/poll/peek/remove 操作的索引位置
    int takeIndex;
    // 下一次 put/offer/add 操作的索引位置
    int putIndex;
    // 队列中元素的数量
    int count;
    
    // 所有操作共用同一个可重复锁
    final ReentrantLock lock;
    // 出队条件
    private final Condition notEmpty;
    // 入队条件
    private final Condition notFull;
```

## 构造函数
```Java
public ArrayBlockingQueue(int capacity) {
    this(capacity, false); // 默认是非公平锁
}

public ArrayBlockingQueue(int capacity, boolean fair) {
    if (capacity <= 0)
        throw new IllegalArgumentException();
    this.items = new Object[capacity];
    lock = new ReentrantLock(fair);
    // notEmpty和notFull基于同一把锁lock
    notEmpty = lock.newCondition();
    notFull =  lock.newCondition();
}

public ArrayBlockingQueue(int capacity, boolean fair, Collection<? extends E> c) {
    this(capacity, fair);
    final ReentrantLock lock = this.lock;
    // 这里加锁是为了保证内存可见性，而不是为了互斥
    // 释放锁的时候会自动写入主内存
    lock.lock();
    try {
        int i = 0;
        try {
            for (E e : c) {
                // e为null则抛出NullPointerException，然后释放锁
                checkNotNull(e);
                items[i++] = e;
            }
        } catch (ArrayIndexOutOfBoundsException ex) {
            // 空间不够则抛出IllegalArgumentException，然后释放锁
            throw new IllegalArgumentException();
        }
        count = i;
        putIndex = (i == capacity) ? 0 : i;
    } finally {
        lock.unlock();
    }
}
```

### 逻辑示意图
```Java
public static void main(String[] args) {
    ArrayBlockingQueue queue = new ArrayBlockingQueue(10, false,
                        Arrays.asList("zhong", "ming", "mao"));
}
```
![arrayblockingqueue_constructer.png](http://otr5jjzeu.bkt.clouddn.com/arrayblockingqueue_constructer.png)

## add(E e)
```Java
// 入队操作列表，都比较类似，仅仅分析add(E e)
// 如果立即可行且不超过队列容量，将指定元素插入到队列尾部，成功时返回true，队列已满时抛出IllegalStateException
public boolean add(E e)
// 如果立即可行且不超过队列容量，将指定元素插入到队列尾部，成功时返回true，队列已满时返回false
public boolean offer(E e)
// 与offer(E e)类似，只是在队列已满时，允许在一段时间内等待可用空间
public boolean offer(E e, long timeout, TimeUnit unit)
// 将指定元素插入到队列尾部，如果队列已满，则不限时等待可用空间，被中断时抛出InterruptedException
public void put(E e) throws InterruptedException
```
```Java
// From ArrayBlockingQueue
public boolean add(E e) {
    // 调用直接父类AbstractQueue的add(E e)方法
    return super.add(e);
}
```

### AbstractQueue.add
```Java
// From AbstractQueue
// 队列未满时，入队成功并返回true；队列已满时，抛出IllegalStateException
public boolean add(E e) {
    if (offer(e))
        // 队列未满时，入队成功并返回true
        return true;
    else
        // 队列已满时，抛出IllegalStateException
        throw new IllegalStateException("Queue full");
}
```

### offer(E e)
```Java
// From ArrayBlockingQueue
// 队列未满时，入队成功并返回true；队列已满时，入队失败并返回false
public boolean offer(E e) {
    checkNotNull(e);
    final ReentrantLock lock = this.lock;
    lock.lock();
    try {
        if (count == items.length)
            // 队列已满，返回false
            return false;
        else {
            // 队列未满，入队并唤醒线程，返回true
            enqueue(e);
            return true;
        }
    } finally {
        lock.unlock();
    }
}
```
```Java
private static void checkNotNull(Object v) {
    if (v == null)
        throw new NullPointerException();
}
```

### enqueue
```Java
// From ArrayBlockingQueue
// 入队并唤醒线程，需要先持有锁
private void enqueue(E x) {
    final Object[] items = this.items;
    items[putIndex] = x; // 入队
    if (++putIndex == items.length)
        putIndex = 0; // 重置putIndex
    count++;
    // 唤醒等待notEmpty的线程，需要先持有锁
    notEmpty.signal(); 
}
```

## poll()
```Java
// 入队操作列表，都比较类似，仅仅分析poll()
// 获取并移除队列头部，如果队列为空，返回null
public E poll()
// 与poll()类似，只是在队列为空时，允许在一段时间内等待可用元素
public E poll(long timeout, TimeUnit unit) throws InterruptedException
// 从队列中移除指定元素（如果存在）
public boolean remove(Object o)
// 与poll()类似，只是允许在队列为空时，不限时等待可用元素，被中断时抛出InterruptedException
public E take() throws InterruptedException
```
```Java
// From ArrayBlockingQueue
public E poll() {
    final ReentrantLock lock = this.lock;
    lock.lock();
    try {
        return (count == 0) ? 
                        null : // 队列为空时直接返回null，不等待
                        dequeue(); // 队列不为空时，获取队列头部，并唤醒线程
    } finally {
        lock.unlock();
    }
}
```

### dequeue
```Java
// From ArrayBlockingQueue
// 获取队列头部，并唤醒线程
private E dequeue() {
    final Object[] items = this.items;
    @SuppressWarnings("unchecked")
    E x = (E) items[takeIndex]; // 暂存出队元素
    items[takeIndex] = null; // 置空数组对准备出队元素的引用
    if (++takeIndex == items.length)
        takeIndex = 0; // 重置takeIndex
    count--;
    if (itrs != null)
        itrs.elementDequeued();
    notFull.signal(); // 唤醒等待notFull的线程，需要先持有锁
    return x; // 返回出队元素
}
```

<!-- indicate-the-source -->


