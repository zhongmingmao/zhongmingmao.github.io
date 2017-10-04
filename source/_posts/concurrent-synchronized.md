---
title: 并发 - synchronized与锁优化
date: 2016-08-01 00:06:25
categories:
    - Concurrent
tags:
    - Netease
    - Concurrent
    - JVM
---

{% note info %}
本文主要介绍`synchronized 概述`以及`synchronized 锁优化`
代码托管在https://github.com/zhongmingmao/concurrent_demo
{% endnote %}

<!-- more -->

# synchronized 概述

## Mark Word
关于`对象的内存布局`，请参考「对象内存布局 - Instrumentation + sa-jdi 实例分析」，这里不再赘述
`Mark Word`是`synchronized`锁机制的`核心数据结构`，[markOop.hpp](http://hg.openjdk.java.net/jdk8/jdk8/hotspot/file/87ee5ee27509/src/share/vm/oops/markOop.hpp)的代码注释如下（仅仅列出`32-bit`）：
```java
//  32 bits:
//  --------
//             hash:25 ------------>| age:4    biased_lock:1 lock:2 (normal object)
//             JavaThread*:23 epoch:2 age:4    biased_lock:1 lock:2 (biased object)
//             size:32 ------------------------------------------>| (CMS free block)
//             PromotedObject*:29 ---------->| promo_bits:3 ----->| (CMS promoted object)

//    [JavaThread* | epoch | age | 1 | 01]       lock is biased toward given thread
//    [0           | epoch | age | 1 | 01]       lock is anonymously biased

//    [ptr             | 00]  locked             ptr points to real header on stack
//    [header      | 0 | 01]  unlocked           regular object header
//    [ptr             | 10]  monitor            inflated lock (header is wapped out)
//    [ptr             | 11]  marked             used by markSweep to mark an object
//                                               not valid at any other time
```
在`32-bit JVM`的`Mark Word`与`锁状态`对应如下
![mark_word.png](http://otr5jjzeu.bkt.clouddn.com/mark_word.png)

## monitor
`重量级锁`也就是常说的`对象锁`，锁标志位为`10`，其中的指针指向的`monitor对象`（也称为`管程`或`对象监视器`）的起始地址，每个`Java对象`都存在一个`monitor对象`与之关联
在`Hotspot JVM`中，`monitor`由`ObjectMonitor`实现，主要数据结构如下（代码：[objectMonitor.hpp](http://hg.openjdk.java.net/jdk8/jdk8/hotspot/file/87ee5ee27509/src/share/vm/runtime/objectMonitor.hpp)）
```CPP
ObjectMonitor() {
    _header       = NULL;
    _count        = 0; // 重入次数
    _waiters      = 0,
    _recursions   = 0;
    _object       = NULL;
    _owner        = NULL; // 获得锁的线程
    _WaitSet      = NULL; // 调用wait()方法被阻塞的线程
    _WaitSetLock  = 0 ;
    _Responsible  = NULL ;
    _succ         = NULL ;
    _cxq          = NULL ;
    FreeNext      = NULL ;
    _EntryList    = NULL ; // Contention List中那些有资格成为候选人的线程被移到Entry List
    _SpinFreq     = 0 ;
    _SpinClock    = 0 ;
    OwnerIsThread = 0 ;
    _previous_owner_tid = 0;
}
```
简要分析：
1. 每一`等待锁的线程`都会被封装成`ObjectWaiter`对象，`_WaitSet`和`_EntryList`保存`ObjectWaiter`对象
2. `_owner`指向持有`ObjectMonitor`对象的线程
3. 当`多个线程`同时访问一段`同步代码`时，首先会进入`_EntryList`
4. 当线程A`竞争ObjectMonitor成功`后，把`ObjectMonitor`的`_owner`设置为线程A，`_count加1`
5. 如果线程A（已经获得对象锁）调用`wait()`（等待被唤醒，然后重新进入`_EntryList`），那么线程A将释放当前持有的`ObjectMonitor`（相对地，`sleep()不会释放锁`），把`ObjectMonitor`的`_owner`设置为`null`，`_count减1`

扩展阅读：
1. 详细的`线程状态转换过程`，请参考[深入JVM锁机制1-synchronized](http://blog.csdn.net/chen77716/article/details/6618779)
2. Hotspot JVM`源码`解读，请参考[OpenJDK9 Hotspot : synchronized 浅析](https://segmentfault.com/a/1190000008532548)

## JVM字节码

### 同步块

#### 代码
```java
public class SyncBlock {
    private int i;

    public void increase() {
        synchronized (this) {
            i++;
        }
    }
}
```

#### 字节码
```
public void increase();
    descriptor: ()V
    flags: ACC_PUBLIC
    Code:
        stack=3, locals=3, args_size=1
            0: aload_0
            1: dup
            2: astore_1
            3: monitorenter // 进入同步方法
            4: aload_0
            5: dup
            6: getfield #2  // Field i:I // i++ start
            9: iconst_1
            10: iadd
            11: putfield #2 // Field i:I // i++ end 总共有4个指令，说明++操作不具有原子性
            14: aload_1
            15: monitorexit // 正常退出同步方法
            16: goto 24
            19: astore_2
            20: aload_1
            21: monitorexit // 异常退出同步方法
            22: aload_2
            23: athrow
            24: return
        Exception table:
            from    to  target type
               4    16    19   any # 进入异常处理流程，第2个monitorexit保证在出现异常时，monitorenter与monitorexit成对出现
              19    22    19   any
        LocalVariableTable:
            Start  Length  Slot  Name   Signature
                0      25     0  this   Lme/zhongmingmao/_synchronized/SyncBlock;
```
1. 在JVM字节码可知，同步块的实现是使用了`monitorenter`和`monitorexit`
2. 当执行`monitorenter`时，当前线程尝试获取`monitor的持有权`，当`monitor`的`_count`为`0`时，可以成功取得monitor的持有权，并将`_count置为1`（`重入时加1`），若其他线程已经持有`monitor`的持有权，那么当前线程将被`阻塞`
3. 当执行`monitorexit`时，当前线程释放`monitor的持有权`，将当`monitor`的`_count`减`1`
4. 为保证`异常情况`下，`monitorenter`与`monitorexit`成对执行，采用`2个monitorexit`指令

### 同步方法

#### 代码
```java
public class SyncMethod {
    private int i;

    public synchronized void increase() {
        i++;
    }
}
```

#### 字节码
```
public synchronized void increase();
    descriptor: ()V
    flags: ACC_PUBLIC, ACC_SYNCHRONIZED // ACC_SYNCHRONIZED指明为同步方法
    Code:
        stack=3, locals=1, args_size=1
            0: aload_0
            1: dup
            2: getfield #2  // Field i:I
            5: iconst_1
            6: iadd
            7: putfield #2  // Field i:I
            10: return
        LocalVariableTable:
            Start  Length  Slot  Name   Signature
                0      11     0  this   Lme/zhongmingmao/_synchronized/SyncMethod;
```
1. 当方法调用时，首先会检查方法是否有`ACC_SYNCHRONIZED`标志，如果设置了，则尝试“竞争”`monitor`的持有权（如果持有成功，其他线程如果想持有，会被阻塞），然后再执行方法
2. 如果同步方法在执行期间抛出了异常，且方法内部无法处理，当前线程所持有的`monitor`将在异常抛到同步方法之外时`自动释放`

# synchronized 锁优化
早期Java版本，`synchronized`属于`重量级锁`，因为`monitor`依赖`操作系统的互斥操作`，操作系统实现`线程切换`需要从`用户态切换到核心态`，成本比较高

## 乐观 - 偏向锁
在**`无竞争`**的场合，之前获得锁的线程再次获得锁时，会判断是否偏向锁指向当前线程，如果是，该线程`不用做任何同步`操作，省去大量有关锁申请的操作，进而提升性能

### Mark Word

#### 代码
```java
// JVM Args : -XX:+UseBiasedLocking -XX:BiasedLockingStartupDelay=0 -Djol.tryWithSudo=true
public class BiasedLockingMarkWorld {
    static class A {
    }

    public static void main(String[] args) throws InterruptedException {
        Layouter layouter = new HotSpotLayouter(new X86_32_DataModel());

        final A a = new A();

        ClassLayout layout = ClassLayout.parseInstance(a, layouter);
        out.println("**** Fresh object");
        out.println(layout.toPrintable());

        synchronized (a) {
            out.println("**** With the lock");
            out.println(layout.toPrintable());
        }

        out.println("**** After the lock");
        out.println(layout.toPrintable());
    }
}
```

#### 运行结果
```
**** Fresh object
me.zhongmingmao._synchronized.BiasedLockingMarkWorld$A object internals:
 OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
      0     4        (object header)                           05 00 00 00 (00000101 00000000 00000000 00000000) (5)
      4     4        (object header)                           00 00 00 00 (00000000 00000000 00000000 00000000) (0)
      8     8        (loss due to the next object alignment)
Instance size: 16 bytes
Space losses: 0 bytes internal + 8 bytes external = 8 bytes total

**** With the lock
me.zhongmingmao._synchronized.BiasedLockingMarkWorld$A object internals:
 OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
      0     4        (object header)                           05 38 00 09 (00000101 00111000 00000000 00001001) (151009285)
      4     4        (object header)                           d6 7f 00 00 (11010110 01111111 00000000 00000000) (32726)
      8     8        (loss due to the next object alignment)
Instance size: 16 bytes
Space losses: 0 bytes internal + 8 bytes external = 8 bytes total

**** After the lock
me.zhongmingmao._synchronized.BiasedLockingMarkWorld$A object internals:
 OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
      0     4        (object header)                           05 38 00 09 (00000101 00111000 00000000 00001001) (151009285)
      4     4        (object header)                           d6 7f 00 00 (11010110 01111111 00000000 00000000) (32726)
      8     8        (loss due to the next object alignment)
Instance size: 16 bytes
Space losses: 0 bytes internal + 8 bytes external = 8 bytes total
```
1. `Intel`是`小端模式`，因此`Fresh object`时的`低8bit`为`00000101`，处于`偏向锁`模式，但此时尚未有现在持有对象a的`monitor`，因此没有数据
2. `With the lock`阶段和`After the lock`阶段的`Mark Word`一致，均处于`偏向锁`模式，且有`指向栈中锁记录的指针`，没有竞争的情况下，说明退出同步块后，依然保留偏向锁的的信息

### 性能对比

#### 代码
```java
// JVM Args : -XX:BiasedLockingStartupDelay=10000
// JVM Args : -XX:BiasedLockingStartupDelay=0
public class BiasedLockingSpeedTest {
    static Number number = new Number();

    public static void main(String[] args) {
        long start = System.currentTimeMillis();
        long i = 0;
        while (i++ < 1000000000L) {
            number.increase();
        }
        System.out.println(String.format("%sms", System.currentTimeMillis() - start));
    }

    static class Number {
        int i;

        public synchronized void increase() {
            i++;
        }
    }
}
```

#### 运行结果
```
# JVM Args : -XX:BiasedLockingStartupDelay=10000
29274ms

# JVM Args : -XX:BiasedLockingStartupDelay=0
3048ms
```

| 偏向锁 | 轻量级锁 |
| --- | --- |
| 3048ms | 29274ms |

1. `BiasedLockingStartupDelay`：系统刚启动时，一般数据竞争比较激烈，启用偏向锁反而会`降低性能`，因此一般是系统启动一段时间后才启用偏向锁，默认`4秒`
2. 由运行结果可见，在`无竞争`的情况下，`偏向锁的性能提升`还是很明显的（实际是`偏向锁`与`轻量级锁`的对比）

## 乐观 - 轻量级锁
1. 如果`偏向锁失败`，那么系统就会进行`轻量级锁`的操作，尝试`在应用层面解决线程同步问题`，而不触发操作系统的互斥操作（`重量级锁`）
2. 轻量级锁是为了`减少多线程进入互斥的几率`，`并非要替代互斥`
3. 利用CPU原语`Compare-And-Swap`（`CAS`），具体过程请参考[深入理解Java虚拟机（第2版）](https://book.douban.com/subject/24722612/)

### Mark Word

#### 代码
```java
// JVM Args : -Djol.tryWithSudo=true
public class ThinLockingMarkWord {
    static class A {
    }

    public static void main(String[] args) throws InterruptedException {
        Layouter layouter = new HotSpotLayouter(new X86_32_DataModel());

        final A a = new A();

        ClassLayout layout = ClassLayout.parseInstance(a, layouter);
        out.println("**** Fresh object");
        out.println(layout.toPrintable());

        synchronized (a) {
            out.println("**** With the lock");
            out.println(layout.toPrintable());
        }

        out.println("**** After the lock");
        out.println(layout.toPrintable());
    }
}
```

#### 运行结果
```
**** Fresh object
me.zhongmingmao._synchronized.ThinLockingMarkWord$A object internals:
 OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
      0     4        (object header)                           01 00 00 00 (00000001 00000000 00000000 00000000) (1)
      4     4        (object header)                           00 00 00 00 (00000000 00000000 00000000 00000000) (0)
      8     8        (loss due to the next object alignment)
Instance size: 16 bytes
Space losses: 0 bytes internal + 8 bytes external = 8 bytes total

**** With the lock
me.zhongmingmao._synchronized.ThinLockingMarkWord$A object internals:
 OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
      0     4        (object header)                           c0 18 5a 00 (11000000 00011000 01011010 00000000) (5904576)
      4     4        (object header)                           00 70 00 00 (00000000 01110000 00000000 00000000) (28672)
      8     8        (loss due to the next object alignment)
Instance size: 16 bytes
Space losses: 0 bytes internal + 8 bytes external = 8 bytes total

**** After the lock
me.zhongmingmao._synchronized.ThinLockingMarkWord$A object internals:
 OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
      0     4        (object header)                           01 00 00 00 (00000001 00000000 00000000 00000000) (1)
      4     4        (object header)                           00 00 00 00 (00000000 00000000 00000000 00000000) (0)
      8     8        (loss due to the next object alignment)
Instance size: 16 bytes
Space losses: 0 bytes internal + 8 bytes external = 8 bytes total
```
1. `Fresh objectd`阶段的`锁标志位`为`01`，`是否偏向锁`标志位为`0`，表示处于`无锁状态`
2. `With the lock`阶段的`锁标志位`为`00`，表示处于`轻量级锁`（因为系统刚启动时`还不支持偏向锁`，因此直接进入`轻量级锁`）
3. `After the lock`阶段的`锁标志位`恢复`01`，`是否偏向锁`标志位为`0`，表示恢复`无锁状态`，没有偏向锁信息

### 性能对比

#### 代码
```java
/**
 * 重量级锁的性能测试
 */
public class FatLockingSpeedTest {
    static Number number = new Number();
    static final int THREAD_COUNT = 2;
    static CountDownLatch countDownLatch = new CountDownLatch(1000000000);


    public static void main(String[] args) throws InterruptedException {
        long start = System.currentTimeMillis();
        for (int i = 0; i < THREAD_COUNT; i++) {
            new Thread(new Task()).start();
        }
        countDownLatch.await();
        System.out.println(String.format("%sms", System.currentTimeMillis() - start));
    }

    static class Number {
        int i;

        public synchronized void increase() {
            i++;
            countDownLatch.countDown();
        }
    }

    static class Task implements Runnable {

        @Override
        public void run() {
            while (countDownLatch.getCount() > 0) {
                number.increase();
            }
        }
    }
}
```

#### 运行结果
```
57383ms
```
结合上面的测试，性能对比如下

| 偏向锁 | 轻量级锁 | 重量级锁 |
| --- | --- | --- |
| 3048ms | 29274ms | 57383ms |

测试对比可能不是很严谨，只为了**大致**说明`偏向锁`、`轻量级锁`和`重量级锁`之间的性能差异



## 乐观 - 自旋锁
1. 如果`轻量级锁`失败，可能直接升级为`重量级锁`，也可能尝试尝试`自旋锁`
2. 乐观地认为线程线程可以`很快获得锁`，可以让线程自旋（`空循环`），并不直接采用操作系统的互斥操作
3. 如果`自旋成功`，可以`避免操作系统的互斥操作`
4. 如果`自旋失败`，依然会升级为`重量级锁`

## 悲观 - 重量级锁

### Mark Word

#### 代码
```java
// JVM Args : -Djol.tryWithSudo=true
public class FatLockingMarkWord {
    static class A {
    }

    public static void main(String[] args) throws Exception {
        Layouter layouter = new HotSpotLayouter(new X86_32_DataModel());

        final A a = new A();

        ClassLayout layout = ClassLayout.parseInstance(a, layouter);

        out.println("**** Fresh object");
        out.println(layout.toPrintable());

        Thread t = new Thread(() -> {
            synchronized (a) {
                try {
                    TimeUnit.SECONDS.sleep(10);
                } catch (InterruptedException e) {
                    return;
                }
            }
        });

        t.start();

        TimeUnit.SECONDS.sleep(1);

        out.println("**** Before the lock");
        out.println(layout.toPrintable());

        synchronized (a) {
            out.println("**** With the lock");
            out.println(layout.toPrintable());
        }

        out.println("**** After the lock");
        out.println(layout.toPrintable());

        System.gc();

        out.println("**** After System.gc()");
        out.println(layout.toPrintable());
    }
}
```

#### 运行结果
```
**** Fresh object
me.zhongmingmao._synchronized.FatLockingMarkWord$A object internals:
 OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
      0     4        (object header)                           01 00 00 00 (00000001 00000000 00000000 00000000) (1)
      4     4        (object header)                           00 00 00 00 (00000000 00000000 00000000 00000000) (0)
      8     8        (loss due to the next object alignment)
Instance size: 16 bytes
Space losses: 0 bytes internal + 8 bytes external = 8 bytes total

**** Before the lock
me.zhongmingmao._synchronized.FatLockingMarkWord$A object internals:
 OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
      0     4        (object header)                           40 b8 c2 03 (01000000 10111000 11000010 00000011) (63092800)
      4     4        (object header)                           00 70 00 00 (00000000 01110000 00000000 00000000) (28672)
      8     8        (loss due to the next object alignment)
Instance size: 16 bytes
Space losses: 0 bytes internal + 8 bytes external = 8 bytes total

**** With the lock
me.zhongmingmao._synchronized.FatLockingMarkWord$A object internals:
 OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
      0     4        (object header)                           2a a9 82 45 (00101010 10101001 10000010 01000101) (1166190890)
      4     4        (object header)                           a6 7f 00 00 (10100110 01111111 00000000 00000000) (32678)
      8     8        (loss due to the next object alignment)
Instance size: 16 bytes
Space losses: 0 bytes internal + 8 bytes external = 8 bytes total

**** After the lock
me.zhongmingmao._synchronized.FatLockingMarkWord$A object internals:
 OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
      0     4        (object header)                           2a a9 82 45 (00101010 10101001 10000010 01000101) (1166190890)
      4     4        (object header)                           a6 7f 00 00 (10100110 01111111 00000000 00000000) (32678)
      8     8        (loss due to the next object alignment)
Instance size: 16 bytes
Space losses: 0 bytes internal + 8 bytes external = 8 bytes total

**** After System.gc()
me.zhongmingmao._synchronized.FatLockingMarkWord$A object internals:
 OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
      0     4        (object header)                           09 00 00 00 (00001001 00000000 00000000 00000000) (9)
      4     4        (object header)                           00 00 00 00 (00000000 00000000 00000000 00000000) (0)
      8     8        (loss due to the next object alignment)
Instance size: 16 bytes
Space losses: 0 bytes internal + 8 bytes external = 8 bytes total
```
对Mark Word的分析与上述类似，不过多赘述
1. `Fresh object`阶段，`锁标志位`为`01`，`是否偏向锁标志位`为`0`，处于`无锁状态`
2. `Before the lock`阶段，`锁标志位`为`00`，处于`轻量级锁`
3. `With the lock`阶段，`锁标志位`为`10`，膨胀为`重量级锁`
4. `After the lock`阶段，依旧为`重量级锁`，不会自动降级
5. `After System.gc()`阶段，恢复为`无锁状态`，GC年龄变为`1`

### Object.wait()
调用`Object.wait()`方法会让`轻量级锁`升级为`重量级锁`

#### 代码
```java
// JVM Args : -Djol.tryWithSudo=true
public class FatLockingWaitMarkWord {
    static Object object = new Object();

    public static void main(String[] args) throws InterruptedException {
        Layouter layouter = new HotSpotLayouter(new X86_32_DataModel());
        ClassLayout layout = ClassLayout.parseInstance(object, layouter);
        new Thread(() -> {
            try {
                synchronized (object) {
                    System.out.println("**** Before wait");
                    System.out.println(layout.toPrintable());
                    object.wait();
                    System.out.println("**** After wait");
                    System.out.println(layout.toPrintable());
                }
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }).start();
        TimeUnit.SECONDS.sleep(10);
        synchronized (object) {
            object.notifyAll();
        }
    }
}
```

#### 运行结果
```
**** Before wait
java.lang.Object object internals:
 OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
      0     4        (object header)                           48 98 c9 05 (01001000 10011000 11001001 00000101) (97097800)
      4     4        (object header)                           00 70 00 00 (00000000 01110000 00000000 00000000) (28672)
      8     8        (loss due to the next object alignment)
Instance size: 16 bytes
Space losses: 0 bytes internal + 8 bytes external = 8 bytes total

**** After wait
java.lang.Object object internals:
 OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
      0     4        (object header)                           0a b0 81 55 (00001010 10110000 10000001 01010101) (1434562570)
      4     4        (object header)                           c0 7f 00 00 (11000000 01111111 00000000 00000000) (32704)
      8     8        (loss due to the next object alignment)
Instance size: 16 bytes
Space losses: 0 bytes internal + 8 bytes external = 8 bytes total
```
1. `Before wait`阶段，`锁标志位`为`00`，处于`轻量级锁`
2. `After wait`阶段，`锁标志位`为`10`，处于`重量级锁`

<!-- indicate-the-source -->
