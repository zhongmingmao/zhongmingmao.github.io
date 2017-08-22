---
title: 并发 - JUC - CyclicBarrier - 源码剖析
date: 2016-08-18 00:06:25
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
本文将通过剖析`CyclicBarrier`的源码来介绍其实现原理
代码托管在https://github.com/zhongmingmao/concurrent_demo
关于`ReentrantLock`的基本内容请参考「并发 - JUC - ReentrantLock - 源码剖析」，本文不在赘述
关于`ConditionObject`的基本内容请参考「并发 - JUC - ConditionObject - 源码剖析」，本文不在赘述
{% endnote %}

<!-- more -->

# 基础
`CyclicBarrier`可以大致理解为`可重复的CountDownLatch`；
但`CountDownLatch`是基于`AQS的共享模式`（相关内容请参考「并发 - JUC - CountDownLatch - 源码剖析」）；
而`CyclicBarrier`基于`ReentrantLock`和`ConditionObject`，相关内容请参考「并发 - JUC - ReentrantLock - 源码剖析」和「并发 - JUC - ConditionObject - 源码剖析」

# 源码分析

## 核心结构
```Java
public class CyclicBarrier {
    // CyclicBarrier是可重复使用的，Generation标识一代
    private static class Generation {
        // CyclicBarrier是否处于broken状态，初始值为false
        boolean broken = false; 
    }
    // lock用于控制进入CyclicBarrier
    private final ReentrantLock lock = new ReentrantLock();
    // CyclicBarrier基于Condition
    // 越过CyclicBarrier的条件：一定数量（parties）的线程到达了CyclicBarrier
    private final Condition trip = lock.newCondition();
    // 参与的线程数
    private final int parties;
    // 在越过CyclicBarrier之前要执行的动作
    private final Runnable barrierCommand;
    // 当前代
    private Generation generation = new Generation();
    // 还未到达CyclicBarrier的线程数
    private int count;
    
    public CyclicBarrier(int parties) {
        this(parties, null);
    }
    
    public CyclicBarrier(int parties, Runnable barrierAction) {
        if (parties <= 0) throw new IllegalArgumentException();
        this.parties = parties;
        this.count = parties; // count初始值为parties
        this.barrierCommand = barrierAction;
    }
```

## nextGeneration
```Java
// 唤醒当代所有线程，并开启新一代
// 因为需要调用trip.signalAll()，所以需要先持有lock
// 触发时机：最后一个线程到达CyclicBarrier或调用reset()
private void nextGeneration() {
    trip.signalAll();
    count = parties; // 重置count为parties
    generation = new Generation();
}
```

## breakBarrier
```Java
// 标记当代已经被打破，并唤醒当代所有线程
// 因为需要调用trip.signalAll()，所以需要先持有lock
private void breakBarrier() {
    generation.broken = true;
    count = parties; // 重置count为parties
    trip.signalAll();
}
```

## reset
```Java
// 重置CyclicBarrier为初始化状态：标记当代已经被打破 + 唤醒当代所有线程 + 并开启新一代
// 需要先持有lock
public void reset() {
    final ReentrantLock lock = this.lock;
    lock.lock();
    try {
        breakBarrier();   
        nextGeneration(); 
    } finally {
        lock.unlock();
    }
}
```

## getNumberWaiting
```Java
// 已经到达CyclicBarrier的线程数：parties-count = 参与的线程数-还未到达CyclicBarrier的线程数
public int getNumberWaiting() {
    final ReentrantLock lock = this.lock;
    lock.lock();
    try {
        return parties - count;
    } finally {
        lock.unlock();
    }
}
```

## isBroken
```Java
// CyclicBarrier是否处于broken状态
public boolean isBroken() {
    final ReentrantLock lock = this.lock;
    lock.lock();
    try {
        return generation.broken;
    } finally {
        lock.unlock();
    }
}
```

## await(long timeout,TimeUnit unit)
```Java
public int await(long timeout, TimeUnit unit) throws InterruptedException,BrokenBarrierException,TimeoutException {
    return dowait(true, unit.toNanos(timeout));
}
```

### dowait(boolean timed,long nanos)
**核心代码**
```Java
private int dowait(boolean timed, long nanos) throws InterruptedException, BrokenBarrierException,TimeoutException {
    final ReentrantLock lock = this.lock;
    lock.lock(); // 首先持有锁lock
    try {
        final Generation g = generation; // 当前代
        
        if (g.broken)
            // 如果CyclicBarrier处于broken状态，直接抛出BrokenBarrierException
            throw new BrokenBarrierException();
        
        if (Thread.interrupted()) {
            // 如果线程被中断，则标记当代已经被打破，并唤醒当代所有线程，最后抛出InterruptedException
            breakBarrier();
            throw new InterruptedException();
        }
        
        // 当前线程调用了await，已经到达了CyclicBarrier，count代表还未到达CyclicBarrier的线程数，因此需要--count
        // index表示当前线程到达CyclicBarrier，还未到达CyclicBarrier的线程数
        int index = --count;
        if (index == 0) { // index==0，说明最后一个线程到达了CyclicBarrier
            boolean ranAction = false; // 执行barrierCommand是否有抛出异常，初始值为false
            try {
                // barrierCommand：最后一个到达CyclicBarrier后，在越过CyclicBarrier之前要执行的动作
                final Runnable command = barrierCommand;
                if (command != null)
                    command.run();
                // 执行到这里，说明无需执行command或执行command的时候没有抛出异常   
                ranAction = true; 
                // 唤醒当代所有线程，并开启新一代
                nextGeneration();
                return 0; // 正常返回
            } finally {
                if (!ranAction)
                    // ranAction=false，说明执行barrierCommand的时候发生了异常
                    // 需要标记当代已经被打破，并唤醒当代所有线程，被唤醒的线程抛出BrokenBarrierException
                    breakBarrier();
            }
        }
        
        // 执行到这里，说明当前线程不是最后一个到达CyclicBarrier，自旋等待直到下面几种情况发生：
        // 1. 最后一个线程到达CyclicBarrier后，唤醒当代的所有线程
        // 2. CyclicBarrier处于broken状态
        // 3. 当前线程被中断
        // 4. 超时
        for (;;) { // 自旋
            try {
                if (!timed)
                    trip.await(); // 不限时等待
                else if (nanos > 0L)
                    nanos = trip.awaitNanos(nanos); // nanos == deadline - System.nanoTime()
            } catch (InterruptedException ie) {
                // Condition.awaitNanos()或Condition.await()阻塞的过程中被中断
                if (g == generation && ! g.broken) {
                    // g == generation：判断有开启新一代，true表示没有
                    // 如果没有开启新一代且当前代没有被标记为已打破，则标记当代已经被打破，并唤醒当代所有线程，最后抛出InterruptedException
                    breakBarrier();
                    throw ie;
                } else {
                    // 执行到这里有两种情况
                    // 1. g != generation，说明已经开启了新的一代，而能对generation赋值的方法只有nextGeneration()，
                    //    而能调用的nextGeneration()只有dowait(boolean timed,long nanos)和reset()：
                    //    - dowait(boolean timed,long nanos)中是由于最后一个线程到达了CyclicBarrier而触发nextGeneration()，
                    //      就是当前线程被中断的时候，最后一个线程也到达了CyclicBarrier，因此无需再抛出InterruptedException，这里设置中断状态即可
                    //    - reset()，即当前线程被中断的时候，其他线程触发了reset()，会将CyclicBarrier置为broken状态
                    //      应该由后续代码抛出BrokenBarrierException，这里设置中断状态
                    // 2. g.broken == true，能对generation.broken赋值的方法只有breakBarrier()，
                    //    说明CyclicBarrier处于broken状态，应该由后续代码抛出BrokenBarrierException，这里设置中断状态即可
                    Thread.currentThread().interrupt();
                }
            }
            
            if (g.broken)
                // 当前线程由于被唤醒或被中断而退出休眠状态后，检查CyclicBarrier是否处于broken状态，如果是抛出CyclicBarrier
                throw new BrokenBarrierException();
            
            if (g != generation)
                // 根据上述分析，执行到这里说明最后线程达到了CyclicBarrier，可以退出自旋
                return index;
            
            // 执行到这里说明g.broken==false && g==generation，因此考虑超时限制
            if (timed && nanos <= 0L) {
                // 如果超时了，标记当代已经被打破，并唤醒当代所有线程，最后抛出TimeoutException
                breakBarrier();
                throw new TimeoutException();
            }
        }
    } finally {
        lock.unlock(); // 最终释放锁
    }
}
```

# 常见场景

## 正常流程
```Java
/**
 * CyclicBarrier正常流程
 */
public class CyclicBarrierNormal {
    private static final int THREAD_COUNT = 3;
    
    private static CyclicBarrier barrier = new CyclicBarrier(THREAD_COUNT, () -> {
        log("run barrierCommand");
    });
    
    private static Runnable awaitRunnable = () -> {
        try {
            log("before barrier.await()");
            barrier.await();
            log("after barrier.await()");
        } catch (InterruptedException | BrokenBarrierException e) {
            log(e.getClass().getCanonicalName());
        }
    };
    
    public static void main(String[] args) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(THREAD_COUNT);
        IntStream.range(0, THREAD_COUNT).forEach(value -> {
            pool.submit(awaitRunnable);
        });
        pool.shutdown();
        /*
        输出：
        pool-1-thread-1 before barrier.await()
        pool-1-thread-3 before barrier.await()
        pool-1-thread-2 before barrier.await()
        pool-1-thread-2 run barrierCommand
        pool-1-thread-1 after barrier.await()
        pool-1-thread-3 after barrier.await()
        pool-1-thread-2 after barrier.await()
         */
    }
    
    private static void log(final String msg) {
        System.out.println(String.format("%s %s", Thread.currentThread().getName(), msg));
    }
}
```

## barrierCommand抛出异常
```Java
/**
 * 验证barrierCommand抛出异常的场景
 */
public class CyclicBarrierCommandException {
    private static final int THREAD_COUNT = 3;
    
    private static CyclicBarrier barrier = new CyclicBarrier(THREAD_COUNT, () -> {
        // 最后一个到达barrier的线程后会先执行barrierCommand
        // barrierCommand抛出异常，最后一个线程唤醒其他所有线程，并抛出InterruptedException
        // 其他线程被唤醒后抛出BrokenBarrierException
        log("run barrierCommand , throw BarrierCommandException");
        throw new RuntimeException("BarrierCommandException");
    });
    
    private static Runnable awaitRunnable = () -> {
        try {
            log("before barrier.await()");
            barrier.await();
            log("after barrier.await()");
        } catch (InterruptedException | BrokenBarrierException e) {
            log(e.getClass().getCanonicalName());
        }
    };
    
    public static void main(String[] args) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(THREAD_COUNT);
        IntStream.range(0, THREAD_COUNT).forEach(value -> {
            pool.submit(awaitRunnable);
        });
        pool.shutdown();
        pool.awaitTermination(10, TimeUnit.SECONDS);
    
        // 此时barrier处于broken状态，调用await()会直接抛出BrokenBarrierException
        new Thread(awaitRunnable, "t1").start();
        TimeUnit.MILLISECONDS.sleep(100);
        // 重置barrier到初始状态
        barrier.reset();
        new Thread(awaitRunnable, "t2").start(); // 不会抛出异常
        /*
        输出：
        pool-1-thread-1 before barrier.await()
        pool-1-thread-2 before barrier.await()
        pool-1-thread-3 before barrier.await()
        pool-1-thread-3 run barrierCommand , throw BarrierCommandException
        pool-1-thread-1 java.util.concurrent.BrokenBarrierException
        pool-1-thread-2 java.util.concurrent.BrokenBarrierException
        t1 before barrier.await()
        t1 java.util.concurrent.BrokenBarrierException
        t2 before barrier.await()
         */
    }
    
    private static void log(final String msg) {
        System.out.println(String.format("%s %s", Thread.currentThread().getName(), msg));
    }
}
```

## await()前被中断
```Java
/**
 * 验证await()前被中断线程的场景
 */
public class CyclicBarrierInterruptBeforeAwait {
    private static final int THREAD_COUNT = 3;
    private static final String SELF_INTERRUPT_THREAD_NAME = "selfInterruptThread";
    
    private static CyclicBarrier barrier = new CyclicBarrier(THREAD_COUNT, () -> {
        log("run barrierCommand");
    });
    
    private static Runnable awaitRunnable = () -> {
        try {
            if (SELF_INTERRUPT_THREAD_NAME.equals(Thread.currentThread().getName())) {
                Thread.currentThread().interrupt();
                log("self interrupt");
            }
            // 设置了中断,await()方法会标记当代已经被打破，并唤醒当代所有线程，最后抛出InterruptedException
            // 被唤醒的线程会抛出BrokenBarrierException
            log("before barrier.await()");
            barrier.await();
            log("after barrier.await()");
        } catch (InterruptedException | BrokenBarrierException e) {
            log(e.getClass().getCanonicalName());
        }
    };
    
    public static void main(String[] args) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(THREAD_COUNT);
        IntStream.range(0, THREAD_COUNT - 1).forEach(value -> {
            pool.submit(awaitRunnable);
        });
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        
        new Thread(awaitRunnable, SELF_INTERRUPT_THREAD_NAME).start();
        /*
        输出：
        pool-1-thread-2 before barrier.await()
        pool-1-thread-1 before barrier.await()
        selfInterruptThread self interrupt
        selfInterruptThread before barrier.await()
        selfInterruptThread java.lang.InterruptedException
        pool-1-thread-2 java.util.concurrent.BrokenBarrierException
        pool-1-thread-1 java.util.concurrent.BrokenBarrierException
         */
    }
    
    private static void log(final String msg) {
        System.out.println(String.format("%s %s", Thread.currentThread().getName(), msg));
    }
}
```

## await()后被中断
```Java
/**
 * 验证await()后中断线程的场景
 */
public class CyclicBarrierInterruptAfterAwait {
    private static final int THREAD_COUNT = 4;
    
    private static CyclicBarrier barrier = new CyclicBarrier(THREAD_COUNT, () -> {
        log("run barrierCommand");
    });
    
    private static Runnable awaitRunnable = () -> {
        try {
            log("before barrier.await()");
            barrier.await();
            log("after barrier.await()");
        } catch (InterruptedException | BrokenBarrierException e) {
            log(e.getClass().getCanonicalName());
        }
    };
    
    public static void main(String[] args) throws InterruptedException {
        Thread t1 = new Thread(awaitRunnable, "t1");
        Thread t2 = new Thread(awaitRunnable, "t2");
        Thread t3 = new Thread(awaitRunnable, "t3");
        
        t1.start();
        t2.start();
        t3.start();
        TimeUnit.MILLISECONDS.sleep(100);
        // t3被中断，唤醒其他线程，最后抛出InterruptedException
        // 被唤醒的线程抛出BrokenBarrierException
        t3.interrupt();
        /*
        输出：
        t1 before barrier.await()
        t3 before barrier.await()
        t2 before barrier.await()
        t2 java.util.concurrent.BrokenBarrierException
        t1 java.util.concurrent.BrokenBarrierException
        t3 java.lang.InterruptedException
         */
    }
    
    private static void log(final String msg) {
        System.out.println(String.format("%s %s", Thread.currentThread().getName(), msg));
    }
}
```

## reset
```Java
/**
 * 验证还有未到达线程时，触发Reset的场景
 */
public class CyclicBarrierReset {
    private static final int THREAD_COUNT = 3;
    
    private static CyclicBarrier barrier = new CyclicBarrier(THREAD_COUNT, () -> {
        log("run barrierCommand");
    });
    
    private static Runnable awaitRunnable = () -> {
        try {
            log("before barrier.await()");
            barrier.await();
            log("after barrier.await()");
        } catch (InterruptedException | BrokenBarrierException e) {
            log(e.getClass().getCanonicalName());
        }
    };
    
    public static void main(String[] args) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(THREAD_COUNT);
        IntStream.range(0, THREAD_COUNT - 1).forEach(value -> {
            pool.submit(awaitRunnable);
        });
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        
        // reset : 标记当代已经被打破 + 唤醒当代所有线程 + 并开启新一代
        // 被唤醒的线程将抛出BrokenBarrierException
        barrier.reset();
        /*
        输出：
        pool-1-thread-2 before barrier.await()
        pool-1-thread-1 before barrier.await()
        pool-1-thread-2 java.util.concurrent.BrokenBarrierException
        pool-1-thread-1 java.util.concurrent.BrokenBarrierException
         */
    }
    
    private static void log(final String msg) {
        System.out.println(String.format("%s %s", Thread.currentThread().getName(), msg));
    }
}
```

## 超时
```Java
/**
 * 验证超时的场景
 */
public class CyclicBarrierTimeoutException {
    private static final String TIMED_AWAITED_THREAD = "timed_awaited_thread";
    private static final int THREAD_COUNT = 4;
    
    private static CyclicBarrier barrier = new CyclicBarrier(THREAD_COUNT);
    
    private static Runnable awaitRunnable = () -> {
        try {
            log("before barrier.await()");
            if (TIMED_AWAITED_THREAD.equals(Thread.currentThread().getName())) {
                // 超时会标记当代已经被打破，并唤醒当代所有线程，最终抛出TimeoutException
                // 被唤醒的线程抛出BrokenBarrierException
                barrier.await(5, TimeUnit.SECONDS);
            } else {
                barrier.await();
            }
            
            log("after barrier.await()");
        } catch (InterruptedException | BrokenBarrierException | TimeoutException e) {
            log(e.getClass().getCanonicalName());
        }
    };
    
    public static void main(String[] args) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(THREAD_COUNT);
        IntStream.range(0, THREAD_COUNT - 2).forEach(value -> {
            pool.submit(awaitRunnable);
        });
        pool.shutdown();
        new Thread(awaitRunnable, TIMED_AWAITED_THREAD).start();
        /*
        输出：
        pool-1-thread-2 before barrier.await()
        pool-1-thread-1 before barrier.await()
        timed_awaited_thread before barrier.await()
        timed_awaited_thread java.util.concurrent.TimeoutException
        pool-1-thread-2 java.util.concurrent.BrokenBarrierException
        pool-1-thread-1 java.util.concurrent.BrokenBarrierException
         */
    }
    
    private static void log(final String msg) {
        System.out.println(String.format("%s %s", Thread.currentThread().getName(), msg));
    }
}
```

<!-- indicate-the-source -->


