---
title: 计算机组成 -- Disruptor
mathjax: false
date: 2020-02-05 00:07:50
categories:
    - Computer Basics
    - Computer Organization
tags:
    - Computer Basics
    - Computer Organization
---

## 缓存行填充

### 缓存行大小
```
$ sysctl -a | grep -E 'cacheline|cachesize'
hw.cachesize: 17179869184 32768 262144 6291456 0 0 0 0 0 0
hw.cachelinesize: 64
hw.l1icachesize: 32768
hw.l1dcachesize: 32768
hw.l2cachesize: 262144
hw.l3cachesize: 6291456
```

<!-- more -->

### RingBufferPad
```java
abstract class RingBufferPad
{
    protected long p1, p2, p3, p4, p5, p6, p7;
}
```
1. 变量p1~p7本身没有实际意义，只能用于**缓存行填充**，为了尽可能地用上**CPU Cache**
2. 访问CPU里的**L1 Cache**或者**L2 Cache**，访问延时是**内存**的**1/15**乃至**1/100**（内存的访问速度，是远远慢于CPU Cache的）
   - 因此，为了追求极限性能，需要尽可能地从**CPU Cache**里面读取数据
3. **CPU Cache**装载内存里面的数据，不是一个个字段加载的，而是加载一整个**缓存行**
   - 64位的Intel CPU，缓存行通常是**64 Bytes**，一个long类型的数据需要8 Bytes，因此会一下子加载8个long类型的数据
   - 遍历数组元素速度很快，后面连续7次的数据访问都会命中CPU Cache，不需要重新从内存里面去读取数据

### 缓存失效
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-disruptor-cache-invalid.jpg" width=800/>

1. CPU在加载数据的时候，会把这个数据从**内存**加载到**CPU Cache**里面
2. 此时，CPU Cache里面除了这个数据，还会加载这个数据**前后定义**的其他变量
3. Disruptor是一个**多线程**的服务器框架，在这个数据前后定义的其他变量，可能会被多个不同的线程去更新数据，读取数据
   - 这些写入和读取请求，可能会来自于**不同的CPU Core**
   - 为了保证数据的**同步更新**，不得不把CPU Cache里面的数据，**重新写回**到内存里面或者**重新**从内存里面**加载**
   - CPU Cache的**写回**和**加载**，都是以整个**Cache Line**作为单位的
4. 如果常量的缓存失效，当再次读取这个值的时候，需要重新从**内存**读取，读取速度会大大**变慢**


### 缓存行填充
```java
abstract class RingBufferPad
{
    protected long p1, p2, p3, p4, p5, p6, p7;
}

abstract class RingBufferFields<E> extends RingBufferPad
{
    ...
    private final long indexMask;
    private final Object[] entries;
    protected final int bufferSize;
    protected final Sequencer sequencer;
    ...
}

public final class RingBuffer<E> extends RingBufferFields<E> implements Cursored, EventSequencer<E>, EventSink<E>
{
    ...
    protected long p1, p2, p3, p4, p5, p6, p7;
    ...
}
```

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-disruptor-cache-line-padding.jpg" width=1000/>

1. Disruptor在RingBufferFields里面定义的变量前后分别定义了7个long类型的变量
   - 前面7个**继承**自RingBufferPad，后面7个直接**定义**在RingBuffer类中
   - 这14个变量**没有任何实际用途**，既不会去**读**，也不会去**写**
2. RingBufferFields里面定义的变量都是`final`的，第一次写入之后就不会再进行修改
   - 一旦被加载到CPU Cache之后，只要被**频繁地读取访问**，就**不会被换出CPU Cache**
   - 无论在内存的什么位置，这些**变量所在的Cache Line**都不会有任何**写更新**的请求

## 空间局部性 + 分支预测
1. Disruptor整个框架是一个高速的**生产者-消费者**模型下的**队列**
   - 生产者不停地往队列里面生产新的需要处理的任务
   - 消费者不停地从队列里面处理掉这些任务
2. 要实现一个**队列**，最合适的数据结构应该是**链表**，如Java中的**LinkedBlockingQueue**
3. Disruptor并没有使用LinkedBlockingQueue，而是使用了**RingBuffer**的数据结构
   - **RingBuffer**的底层实现是一个**固定长度的数组**
   - 比起链表形式的实现，数组的数据在内存里面会存在**空间局部性**
     - 数组的连续多个元素会一并加载到CPU Cache里面，所以访问遍历的速度会更快
     - **链表**里面的各个节点的数据，**多半不会出现在相邻的内存空间**
   - 数据的遍历访问还有一个很大的优势，就是CPU层面的**分支预测**会很**准确**
     - 可以更有效地利用CPU里面的**多级流水线**

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-disruptor-producer-consumer.jpg" width=800/>
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-disruptor-queue.jpg" width=800/>

## CAS -> 无锁

### 缓慢的锁
1. Disruptor作为一个高性能的生产者-消费者队列系统，一个核心的设计：通过**RingBuffer**实现一个**无锁队列**
2. Java里面的LinkedBlockingQueue，比起Disruptor的RingBuffer要**慢**很多，主要原因
   - **链表**的数据在内存里面的布局对于**高速缓存**并**不友好**
   - LinkedBlockingQueue对于**锁**的依赖
     - 一般来说消费者比生产者快（不然队列会**堆积**），因为大部分时候，队列是**空**的，生产者和消费者一样会产生**竞争**
3. LinkedBlockingQueue的锁机制是通过**ReentrantLock**，需要**JVM**进行**裁决**
   - 锁的争夺，会把没有拿到锁的线程**挂起等待**，也需要进行一次**上下文切换**
   - 上下文切换的过程，需要把**当前执行线程的寄存器**等信息，保存到**内存中的线程栈**里面
     - 意味：已经加载到**高速缓存**里面的指令或者数据，又回到**主内存**里面，进一步拖慢性能

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-disruptor-queue-lock-contention.jpg" width=800/>

### RingBuffer
1. 加锁很慢，所以Disruptor的解决方案是**无锁**（没有**操作系统**层面的锁）
2. Disruptor利用了一个**CPU硬件支持的指令**，称之为**CAS**（Compare And Swap）
3. Disruptor的RingBuffer创建一个**Sequence**对象，用来指向当前的RingBuffer的**头**和**尾**
   - 头和尾的标识，不是通过一个指针来实现的，而是通过一个**序号**
4. RingBuffer在进行生产者和消费者之间的资源协调，采用的是**对比序号**的方式
   - 当生产者想要往队列里面加入新数据的时候，会把当前生产者的Sequence的序号，加上需要加入的新数据的数量
   - 然后和实际的消费者所在的位置进行对比，看下队列里是不是有足够的空间加入这些数据
     - 而不是直接**覆盖**掉消费者还没处理完的数据
5. CAS指令，既不是基础库里的一个**函数**，也不是操作系统里面实现的一个**系统调用**，而是一个**CPU硬件支持的机器指令**
   - 在Intel CPU上，为`cmpxchg`指令：`compxchg [ax] (隐式参数，EAX累加器), [bx] (源操作数地址), [cx] (目标操作数地址)`
   - 第一个操作数不在指令里面出现，是一个隐式的操作数，即**EAX累加寄存器**里面的值
   - 第二个操作数就是源操作数，指令会对比这个操作数和上面EAX累加寄存器里面的值
   - 伪代码：`IF [ax]== [bx] THEN [ZF] = 1, [bx] = [cx] ELSE [ZF] = 0, [ax] = [bx]`
   - 单个指令是**原子**的，意味着使用CAS操作的时候，**不需要单独进行加锁**，直接调用即可

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-disruptor-ringbuffer-lock-free.jpg" width=800/>

```java Sequence
public long addAndGet(final long increment)
{
    long currentValue;
    long newValue;

    // 如果CAS操作没有成功，会不断等待重试
    do
    {
        currentValue = get();
        newValue = currentValue + increment;
    }
    while (!compareAndSet(currentValue, newValue));

    return newValue;
}

public boolean compareAndSet(final long expectedValue, final long newValue)
{
    // 调用CAS指令
    return UNSAFE.compareAndSwapLong(this, VALUE_OFFSET, expectedValue, newValue);
}
```

### Benchmark
```java
public class LockBenchmark {

    private static final long MAX = 500_000_000L;

    private static void runIncrement() {
        long counter = 0;
        long start = System.currentTimeMillis();
        while (counter < MAX) {
            counter++;
        }
        long end = System.currentTimeMillis();
        System.out.println("Time spent is " + (end - start) + "ms without lock");
    }

    private static void runIncrementWithLock() {
        Lock lock = new ReentrantLock();
        long counter = 0;
        long start = System.currentTimeMillis();
        while (counter < MAX) {
            if (lock.tryLock()) {
                counter++;
                lock.unlock();
            }
        }
        long end = System.currentTimeMillis();
        System.out.println("Time spent is " + (end - start) + "ms with lock");
    }

    private static void runIncrementAtomic() {
        AtomicLong counter = new AtomicLong(0);
        long start = System.currentTimeMillis();
        while (counter.incrementAndGet() < MAX) {
        }
        long end = System.currentTimeMillis();
        System.out.println("Time spent is " + (end - start) + "ms with cas");
    }

    public static void main(String[] args) {
        runIncrement();
        runIncrementWithLock();
        runIncrementAtomic();

        // Time spent is 153ms without lock
        // Time spent is 7801ms with lock
        // Time spent is 3164ms with cas
        // 7801 / 153 ≈ 51
        // 3164 / 153 ≈ 21   
    }
}
```