---
title: 并发 - JUC - LockSupport - 源码剖析
date: 2016-08-07 00:06:25
categories:
    - Concurrent
    - JUC
tags:
    - Concurrent
    - JUC
---

{% note info %}
本文将剖析`LockSupport`的源码及其实现原理，在博文末尾再补充`线程中断`的内容
代码托管在https://github.com/zhongmingmao/concurrent_demo
关于`Unsafe`类的内容请参考「并发 - Unsafe类的简单使用」，本文不再赘述
{% endnote %}

<!-- more -->

# 源码分析

## UML
<img src="https://concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/locksupport_uml.png" width="500">

## 实例域
```java
public class LockSupport {
    private static final sun.misc.Unsafe UNSAFE;
    private static final long parkBlockerOffset;
    static {
        try {
            // 获取Unsafe实例
            UNSAFE = sun.misc.Unsafe.getUnsafe();
            Class<?> tk = Thread.class;
            // 获取java.lang.Thread中parkBlocker实例域在Thread对象内存布局中的偏移量
            // 详细请参考博文「并发 - Unsafe类的简单使用」，不再赘述
            parkBlockerOffset = UNSAFE.objectFieldOffset(tk.getDeclaredField("parkBlocker"));
        } catch (Exception ex) { throw new Error(ex); }
    }
}
```
```java
public class Thread implements Runnable {
    // 提供给java.util.concurrent.locks.LockSupport调用
    volatile Object parkBlocker;
}
```
## 构造函数
```java
// 私有构造函数，无法实例化
private LockSupport() {}
```

## park函数

### park()
```java
public static void park() {
    // 当前线程进入无限期的等待状态（WAITING状态），除非许可证可用（最近调用过unpark）
    // 如果许可证可用，那么立即返回，比wait()/notify()/notifyAll()灵活！！
    // 退出WAITING状态的3种情况
    //   1. 其他线程unpark当前线程
    //   2. 其他线程中断当前线程
    //   3. 该调用毫无理由地返回（这个不是很理解）
    UNSAFE.park(false, 0L);
}
```

### park(Object blocker)
```java
public static void park(Object blocker) {
    // 获取当前线程
    Thread t = Thread.currentThread();
    // 设置当前线程的实例域parkBlocker
    setBlocker(t, blocker);
    // 当前线程进入无限期的等待状态（WAITING状态），与park()函数一致
    UNSAFE.park(false, 0L);
    // 执行到这里线程已经退出WAITING状态，需要重置当前线程的实例域parkBlocker
    // 如果不重置，同一线程下次调用getBlocker时，会返回上一次park(Object blocker)设置的blocker，不符合逻辑
    setBlocker(t, null);
}
```
```java
private static void setBlocker(Thread t, Object arg) {
    UNSAFE.putObject(t, parkBlockerOffset, arg);
}
```
```java
public static Object getBlocker(Thread t) {
    if (t == null)
        throw new NullPointerException();
    return UNSAFE.getObjectVolatile(t, parkBlockerOffset);
}
```

### parkNanos(Object blocker,long nanos)
```java
// 与上面parkpark(Object blocker)类似，只是最多等待nanos纳秒(相对时间)
// 当前线程进入限时等待状态（TIMED_WAITING状态）
public static void parkNanos(Object blocker, long nanos) {
    if (nanos > 0) {
        Thread t = Thread.currentThread();
        setBlocker(t, blocker);
        // 退出TIMED_WAITING状态的4种情况
        //    1. 其他线程unpark当前线程
        //    2. 其他线程中断当前线程
        //    3. 等待超时（相对时间）
        //    4. 该调用毫无理由地返回（这个不是很理解）
        UNSAFE.park(false, nanos);
        setBlocker(t, null);
    }
}
```

### parkUntil(Object blocker,long deadline)
```java
// 与上面parkpark(Object blocker)类似，只是最多等待到deadline（Uninx时间戳，单位毫秒，绝对时间）
// 当前线程进入限时等待状态（TIMED_WAITING状态）
public static void parkUntil(Object blocker, long deadline) {
    Thread t = Thread.currentThread();
    setBlocker(t, blocker);
    // 退出TIMED_WAITING状态的4种情况
    //    1. 其他线程unpark当前线程
    //    2. 其他线程中断当前线程
    //    3. 等待超时（相对时间）
    //    4. 该调用毫无理由地返回（这个不是很理解）
    UNSAFE.park(true, deadline);
    setBlocker(t, null);
}
```

## unpark函数

### unpark(Thread thread)
```java
// 如果给定线程的许可尚不可用，则使其可用：
//  1. 如果线程等待在park/parkNanos/parkUntil上，则解除其等待状态；
//  2. 否则保证下一次调用park/parkNanos/parkUntil的线程不会进入等待状态
//        比wait()/notify()/notifyAll()灵活，wait()必须在notify()/notifyAll()之前触发
//
// 如果给定的线程尚未启动，无法保证unpark操作有效果
public static void unpark(Thread thread) {
    if (thread != null)
        UNSAFE.unpark(thread);
}
```

# 使用样例

## wait/notify + park/unpark
`park/unpark`相对于`wait/notify`更灵活

### wait/notify
```java
/**
 * 验证notify()/notifyAll()必须在wait()之后
 */
public class WaitAndNotify {
    private static Object LOCK = new Object();

    private static Thread waitThread = new Thread(() -> {
        try {
            synchronized (LOCK) {
                log("before LOCK.wait()");
                LOCK.wait();
                log("after LOCK.wait()");
            }
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }, "waitThread");

    private static Thread notifyThread = new Thread(() -> {
        synchronized (LOCK) {
            log("before LOCK.notifyAll()");
            LOCK.notifyAll();
            log("after LOCK.notifyAll()");
        }
    }, "notifyThread");

    private static void log(String message) {
        System.out.println(String.format("%s : %s",
                Thread.currentThread().getName(),
                message));
    }

    public static void main(String[] args) throws InterruptedException {
        notifyThread.start();
        TimeUnit.MILLISECONDS.sleep(100);
        // notifyAll发生在wait之前，waitThread一直等待被唤醒
        waitThread.start();
        /*
        输出：
        notifyThread : before LOCK.notifyAll()
        notifyThread : after LOCK.notifyAll()
        waitThread : before LOCK.wait()
         */
    }
}
```

### park/unpark
```java
/**
 * 验证unpark(Thread thread)可以在park(Object blocker)前面（前提：被park的线程需要在执行unpark操作之前启动）
 */
public class ParkAndUnpark {
    private static Object BLOCKER = new Object();

    private static Thread parkThread = new Thread(() -> {
        try {
            TimeUnit.SECONDS.sleep(1); // 休眠1秒，确保unparkThread执行完
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        log("before LockSupport.park(BLOCKER)");
        LockSupport.park(BLOCKER);
        log("after LockSupport.park(BLOCKER)");
    }, "parkThread");

    private static Thread unparkThread = new Thread(() -> {
        log("before LockSupport.unpark(parkThread)");
        LockSupport.unpark(parkThread);
        log("after LockSupport.unpark(parkThread)");
    }, "unparkThread");

    private static void log(String message) {
        System.out.println(String.format("%s : %s",
                Thread.currentThread().getName(),
                message));
    }

    public static void main(String[] args) {
        parkThread.start();// parkThread必须要先启动，否则无法确保LockSupport.unpark(parkThread)能让许可证有效
        unparkThread.start();
        /*
        输出：
        unparkThread : before LockSupport.unpark(parkThread)
        unparkThread : after LockSupport.unpark(parkThread)
        parkThread : before LockSupport.park(BLOCKER)
        parkThread : after LockSupport.park(BLOCKER)
         */
    }
}
```

## 中断响应
```java
/**
 * 验证park能响应中断
 */
public class InterruptPark {
    private static Object BLOCKER = new Object();

    private static Thread parkThread = new Thread(() -> {
        log("before LockSupport.park(BLOCKER)");
        LockSupport.park(BLOCKER);
        log("after LockSupport.park(BLOCKER)");
    }, "parkThread");

    private static Thread interruptThread = new Thread(() -> {
        log("before parkThread.interrupt()");
        parkThread.interrupt();
        log("after parkThread.interrupt()");
    }, "interruptThread");

    private static void log(String message) {
        System.out.println(String.format("%s : %s",
                Thread.currentThread().getName(),
                message));
    }

    public static void main(String[] args) throws InterruptedException {
        parkThread.start();
        TimeUnit.SECONDS.sleep(1);
        interruptThread.start();
        /*
        输出：
        parkThread : before LockSupport.park(BLOCKER)
        interruptThread : before parkThread.interrupt()
        interruptThread : after parkThread.interrupt()
        parkThread : after LockSupport.park(BLOCKER)
         */
    }
}
```

# 再谈中断
之前的博文没有详细地讨论过`中断`，这里补充一下

## Thread中断
Thread提供了5个关于中断的方法
public方法
```java
private volatile Interruptible blocker;
private final Object blockerLock = new Object();
// 实例方法
// 中断线程，仅仅设置中断状态
//
// 1. 对于存活线程
//    1.1. 如果线程因为调用Object.wait、Thread.sleep和Thread.join而进入
//         WAITING或TIMED_WAITING状态，重置中断状态并抛出InterruptedException
//    1.2. 否则只会设置中断状态
// 2. 对于非存活线程
//    2.1 中断一个非存活的线程，不会有任何影响
public void interrupt() {
    if (this != Thread.currentThread())
        // 除了线程自中断，都需要检查访问权限
        checkAccess();

    synchronized (blockerLock) {
        Interruptible b = blocker;
        if (b != null) {
            interrupt0(); // 仅仅设置中断状态
            b.interrupt(this);
            return;
        }
    }
    interrupt0(); // 仅仅设置中断状态
}
// 实例方法，判断某个线程是否被中断，不重置中断状态
public boolean isInterrupted() {
    return isInterrupted(false);
}
// 类方法，判断当前线程是否被中断，重置中断状态
public static boolean interrupted() {
   return currentThread().isInterrupted(true);
}
```
private方法
```java
// 仅仅设置中断状态
private native void interrupt0();
// 线程是否被中断，依据ClearInterrupted是否重置中断状态
private native boolean isInterrupted(boolean ClearInterrupted);
```

## interrupt sleep
```java
/**
 * 验证因sleep而进入TIMED_WAITING状态的线程被中断时，会抛出InterruptedException并重置中断状态
 */
public class InterruptSleep {
    private static Thread sleepThread = new Thread(() -> {
        try {
            log("before TimeUnit.SECONDS.sleep(10)");
            TimeUnit.SECONDS.sleep(10);
            log("after TimeUnit.SECONDS.sleep(10)");
        } catch (InterruptedException e) {
            log("interrupted when sleeping!!");
            // 抛出InterruptedException异常并重置中断状态
            log(String.format("interrupt status [%s]", Thread.currentThread().isInterrupted()));
        }

    }, "sleepThread");

    private static Thread interruptThread = new Thread(() -> {
        log("before sleepThread.interrupt()");
        sleepThread.interrupt();
        log("after sleepThread.interrupt()");
    }, "interruptThread");

    private static void log(String message) {
        System.out.println(String.format("%s : %s",
                Thread.currentThread().getName(),
                message));
    }

    public static void main(String[] args) throws InterruptedException {
        sleepThread.start();
        TimeUnit.MILLISECONDS.sleep(100);
        interruptThread.start();
        /*
        输出：
        sleepThread : before TimeUnit.SECONDS.sleep(10)
        interruptThread : before sleepThread.interrupt()
        interruptThread : after sleepThread.interrupt()
        sleepThread : interrupted when sleeping!!
        sleepThread : interrupt status [false]
         */
    }
}
```

## interrupt running
```java
/**
 * 验证中断一个处于RUNNABLE状态的线程，只会设置中断状态，而不会抛出InterruptedException
 */
public class InterruptRunning {
    private static Thread runningThread = new Thread(() -> {
        boolean hasPrintInterruptStatus = false;
        while (true) {
            if (!hasPrintInterruptStatus && Thread.currentThread().isInterrupted()) {
                log("interrupted when running!!");
                // 设置中断状态，但不会抛出InterruptedException
                log(String.format("interrupt status [%s]", Thread.currentThread().isInterrupted()));
                hasPrintInterruptStatus = true;
            }
        }
    }, "runningThread");

    private static Thread interruptThread = new Thread(() -> {
        log("before runningThread.interrupt()");
        runningThread.interrupt();
        log("after runningThread.interrupt()");
    }, "interruptThread");

    private static void log(String message) {
        System.out.println(String.format("%s : %s",
                Thread.currentThread().getName(),
                message));
    }

    public static void main(String[] args) throws InterruptedException {
        runningThread.start();
        TimeUnit.MILLISECONDS.sleep(100);
        interruptThread.start();
        /*
        输出：
        interruptThread : before runningThread.interrupt()
        interruptThread : after runningThread.interrupt()
        runningThread : interrupted when running!!
        runningThread : interrupt status [true]
         */
    }
}
```

## interrupt synchronized
`synchronized`关键字**`无法响应中断`**，要么获得锁，要么一直等待
后续博文介绍的`ReentrantLock比synchronized灵活`，能够响应中断
```java
/**
 * 验证因synchronized而进入阻塞状态的线程是无法响应中断的，线程要么获得锁，要么一直等待
 */
public class InterruptSynchronized {
    private static Object LOCK = new Object();

    private static Thread holdLockThread = new Thread(() -> {
        log("hold LOCK forever!!");
        synchronized (LOCK) {
            while (true) {
                Thread.yield(); // 只会尝试让出CPU资源，但不会释放锁资源
            }
        }
    }, "holdLockThread");

    private static Thread acquireLockThread = new Thread(() -> {
        log("try to acquire LOCK");
        synchronized (LOCK) {
            log("hold LOCK successfully!!");
        }
    }, "acquireLockThread");

    private static Thread interruptThread = new Thread(() -> {
        log(" interrupt acquireLockThread!!");
        acquireLockThread.interrupt();
    }, "interruptThread");

    private static void log(String message) {
        System.out.println(String.format("%s : %s",
                Thread.currentThread().getName(),
                message));
    }

    public static void main(String[] args) throws InterruptedException {
        holdLockThread.start();
        TimeUnit.SECONDS.sleep(1); // 确保holdLockThread持有锁
        acquireLockThread.start(); // 尝试获得锁，进入阻塞状态
        TimeUnit.MILLISECONDS.sleep(100); // 确保acquireLockThread进入阻塞状态
        interruptThread.start(); // 尝试中断在处于阻塞状态的acquireLockThread，acquireLockThread并不会响应中断
        /*
        输出：
        holdLockThread : hold LOCK forever!!
        acquireLockThread : try to acquire LOCK
        interruptThread :  interrupt acquireLockThread!!
         */
    }
}
```
<!-- indicate-the-source -->
