---
title: Java并发 -- Disruptor
date: 2019-05-31 15:49:44
categories:
    - Java Concurrent
tags:
    - Java Concurrent
    - Disruptor
---

## 有界队列
1. JUC中的有界队列ArrayBlockingQueue和LinkedBlockingQueue，都是基于**ReentrantLock**
2. 在高并发场景下，锁的效率并不高，Disruptor是一款**性能更高**的有界内存队列
3. Disruptor高性能的原因
    - 内存分配更合理，使用**RingBuffer**，数组元素在初始化时**一次性**全部创建
        - **提升缓存命中率**，对象循环利用，**避免频繁GC**
    - 能够**避免伪共享**，提升缓存利用率
    - 采用**无锁算法**，避免频繁加锁、解锁的性能消耗
    - 支持**批量消费**，消费者可以以无锁的方式消费多个消息

<!-- more -->

## 简单使用
```java
public class DisruptorExample {
    public static void main(String[] args) throws InterruptedException {
        // RingBuffer大小，必须是2的N次方
        int bufferSize = 1024;
        // 构建Disruptor
        Disruptor<LongEvent> disruptor = new Disruptor<>(LongEvent::new, bufferSize, DaemonThreadFactory.INSTANCE);
        // 注册事件处理器
        disruptor.handleEventsWith((event, sequence, endOfBatch) -> System.out.println("E: " + event));
        // 启动Disruptor
        disruptor.start();

        RingBuffer<LongEvent> ringBuffer = disruptor.getRingBuffer();
        // 生产Event
        ByteBuffer bb = ByteBuffer.allocate(8);
        for (long l = 0; true; l++) {
            bb.putLong(0, l);
            // 生产者生产消息
            ringBuffer.publishEvent((event, sequence, buffer) -> event.setValue(buffer.getLong(0)), bb);
            TimeUnit.SECONDS.sleep(1);
        }
    }
}

@Data
class LongEvent {
    private long value;
}
```
1. 在Disruptor中，生产者生产的对象和消费者消费的对象称为Event，使用Disruptor必须定义Event
2. 构建Disruptor对象需要传入EventFactory（LongEvent::new）
3. 消费Disruptor中的Event需要通过handleEventsWith方法注册一个事件处理器
4. 发布Event需要通过publishEvent方法

## 优点

### RingBuffer

#### 局部性原理
1. 在一段时间内程序的执行会限定在一个局部范围内，包括时间局部性和空间局部性
2. **时间局部性**
    - 程序中的某条**指令**一旦被执行，不久之后这条指令很可能被再次执行
    - 如果某条**数据**被访问，不久之后这条数据很可能被再次访问
3. **空间局部性**
    - 某块**内存**一旦被访问，不久之后这块内存**附近**的内存也有可能被访问
4. CPU缓存利用了程序的局部性原理
    - CPU从内存中加载数据X时，会将数据X及其**附近**的数据缓存在高速Cache中
5. 如果程序能够很好地体现出局部性原理，就能更好地利用CPU缓存，从而提升程序的性能

#### ArrayBlockingQueue
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-disruptor-array-blocking-queue.png" width=800/>
1. 生产者向ArrayBlockingQueue增加一个元素之前，都需要先创建对象E
2. 创建这些元素的时间基本上是**离散**的，所以这些元素的内存地址大概率也**不是连续**的

#### Disruptor
```java
// com.lmax.disruptor.RingBufferFields
for (int i = 0; i < bufferSize; i++)
{
    entries[BUFFER_PAD + i] = eventFactory.newInstance();
}
```
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-disruptor-ring-buffer.png" width=800/>
1. Disruptor内部的RingBuffer也是用数组实现的
2. 但这个数组中的所有元素在初始化时是**一次性**全部创建，所以这些元素的内存地址大概率是**连续**的
3. 如果数组中所有元素的内存地址是**连续**的，能够提升性能
    - 消费者线程在消费的时候，遵循**空间局部性原理**，消费完第1个元素，很快就会消费第2个元素
    - 而在消费第1个元素的时候，CPU会把内存中E1后面的数据也加载进高速Cache
    - 如果E1和E2是连续的，那么E2也就会被加载进高速Cache
    - 当消费第2个元素的时候，由于E2已经在高速Cache中了，不再需要从内存中加载，能大大提升性能
4. 另外在Disruptor中，生产者线程通过publishEvent发布Event时，并不是创建一个新的Event
    - 而是通过event.setValue来修改Event，即**循环利用**RingBuffer中的Event
    - 这样能避免频繁创建和销毁Event而导致的**GC问题**

### 避免伪共享

#### 伪共享
1. CPU缓存内部是按照**缓存行**（Cache Line）进行管理的，一个缓存行通常为**64 Bytes**
2. CPU从内存中加载数据X，会同时加载后面（64-size(X)）个字节的数据

##### ArrayBlockingQueue
```java
/** The queued items */
final Object[] items;
/** items index for next take, poll, peek or remove */
int takeIndex;
/** items index for next put, offer, or add */
int putIndex;
/** Number of elements in the queue */
int count;
```
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-disruptor-array-blocking-queue-false-sharing.png" width=800/>
1. 当CPU从内存中加载takeIndex时，会同时将putIndex和count都加载进高速Cache
2. 假设线程A运行在CPU-1上，执行入队操作，入队操作会修改putIndex
    - 而修改putIndex会导致CPU-2上putIndex所在的缓存行失效
3. 假设线程B运行在CPU-2上，执行出队操作，出队操作需要读取takeIndex
    - 但由于takeIndex所在的缓存行已经失效，所以CPU-2必须从**内存**中重新读取
4. 入队操作本身不会修改takeIndex，但由于takeIndex和putIndex共享同一个缓存行
    - 导致出队操作不能很好地利用Cache，这就是伪共享
5. 伪共享：由于**共享缓存行而导致缓存无效**的场景
6. ArrayBlockingQueue的入队操作和出队操作是用**锁**来保证互斥的，所以入队和出队不会同时发生
7. 如果允许入队和出队同时发生，可以采用**缓存行填充**，保证每个变量**独占一个缓存行**
    - 如果想让takeIndex独占一个缓存行，可以在takeIndex的前后各填充**56**个字节

##### Disruptor
```java
// 前：填充56字节
class LhsPadding
{
    protected long p1, p2, p3, p4, p5, p6, p7;
}

class Value extends LhsPadding
{
    protected volatile long value;
}

// 后：填充56字节
class RhsPadding extends Value
{
    protected long p9, p10, p11, p12, p13, p14, p15;
}

public class Sequence extends RhsPadding
{
}
```

##### Contended
1. Java 8引入了@sun.misc.Contended注解，能够轻松避免伪共享，需要设置JVM参数-XX:RestrictContended
2. 避免伪共享是以**牺牲内存**为代价的

### 无锁算法
1. ArrayBlockingQueue利用**管程**实现，生产和消费都需要**加锁**，实现简单，但**性能不太理想**
2. Disruptor采用的是**无锁**算法，实现复杂，核心操作是生产和消费，最复杂的是入队操作
3. 对于入队操作，不能覆盖没有消费的元素，对于出队操作，不能读取没有写入的元素
4. Disruptor中的RingBuffer维护了入队索引，但没有维护出队索引
    - 因为Disruptor支持多个消费者同时消费，每个消费者都会有一个出队索引
    - 所以RingBuffer的**出队索引**是所有消费者里**最小**的一个
5. 入队逻辑：_**如果没有足够的空余位置，就出让CPU使用权，然后重新计算，反之使用CAS设置入队索引**_

```java
// com.lmax.disruptor.MultiProducerSequencer
public long next(int n)
{
    if (n < 1)
    {
        throw new IllegalArgumentException("n must be > 0");
    }

    long current;
    long next;

    // 生产者获取n个写入位置
    do
    {
        // current相当于入队索引，表示上次生产到这里
        current = cursor.get();
        // 目标是再生产n个
        next = current + n;
        // 减掉一个循环
        long wrapPoint = next - bufferSize;
        // 获取上一次的最小消费位置
        long cachedGatingSequence = gatingSequenceCache.get();
        //  没有足够的空余位置
        if (wrapPoint > cachedGatingSequence || cachedGatingSequence > current)
        {
            // 重新计算所有消费者里面的最小值位置
            long gatingSequence = Util.getMinimumSequence(gatingSequences, current);
            // 仍然没有足够的空余位置，出让CPU使用权，重新执行下一循环
            if (wrapPoint > gatingSequence)
            {
                LockSupport.parkNanos(1); // TODO, should we spin based on the wait strategy?
                continue;
            }
            // 重新设置上一次的最小消费位置
            gatingSequenceCache.set(gatingSequence);
        }
        else if (cursor.compareAndSet(current, next))
        {
            // 获取写入位置成功，跳出循环
            break;
        }
    }
    while (true);

    return next;
}
```

<!-- indicate-the-source -->
