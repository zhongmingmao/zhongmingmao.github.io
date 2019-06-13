---
title: Java并发 -- 线程生命周期
date: 2019-04-28 13:03:45
categories:
    - Java
    - Concurrent
tags:
    - Java
    - Java Concurrent
---

## 通用的线程生命周期
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-thread-life-cycle-common.png" width=800/>


<!-- more -->
1. **初始状态**
    - 线程已经被创建，但还不允许分配CPU执行
    - 该状态属于**编程语言**所特有，仅仅在编程语言层面被创建，在操作系统层面，真正的线程还没有创建
2. **可运行状态**
    - 线程可以分配CPU执行，该状态下真正的操作系统线程已经被创建
3. **运行状态**
    - 当有空闲的CPU时，操作系统会将其分配给处于**可运行状态**的线程，被分配到CPU的线程的状态就转换为**运行状态**
4. **休眠状态**
    - 处于**运行状态**的线程如果调用一个**阻塞的API**或者**等待某个事件**，那么线程状态就会切换为**休眠状态**
    - 切换为休眠状态的同时会**释放CPU使用权**，_**处于休眠状态的线程永远没有机会获得CPU使用权**_
    - 当等待的事件出现后，线程就会从休眠状态切换到**可运行状态**
5. **终止状态**
    - 线程**执行完**或者**出现异常**就会进入**终止状态**，处于终止状态的线程不会切换到其它状态
    - 进入终止状态意味着线程生命周期的**结束**

### 简化合并
1. 通用的线程生命周期里的5种状态在不同的编程语言会有**简化合并**
2. Java把**可运行状态**和**运行状态**合并了
    - 这两个状态对操作系统调度层是有价值的，但**JVM把线程调度交给了操作系统处理**，JVM并不关心这两个状态
3. JVM同时也细化了**休眠状态**


## Java线程的生命周期
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-thread-life-cycle-java.png" width=800/>

1. Java线程的状态可以参照代码`java.lang.Thread.State`
2. 在操作系统层，Java线程状态的**BLOCKED、WAITING、TIMED_WAITING**都是**休眠状态**，永远无法获得CPU的使用权
3. BLOCKED、WAITING、TIMED_WAITING可以理解为导致线程**进入休眠状态**的三个**原因**

### RUNNABLE + BLOCKED
1. 唯一场景：**线程等待synchronized的隐式锁**
2. synchronized修饰的方法（代码块）在同一时刻只允许一个线程执行，其它线程只能等待（**RUNNABLE -> BLOCKED**）
3. 当等待的线程获得synchronized隐式锁时，**BLOCKED -> RUNNABLE**

#### 阻塞式API
1. 在**操作系统**层面，操作系统线程调用**阻塞式API**，会转换到_**休眠状态**_
2. 在**JVM**层面，Java线程调用**阻塞式API**，Java线程的状态会_**保持RUNNABLE**_
    - _**JVM层面并不关心操作系统调度相关的状态**_
    - 在JVM看来，等待**CPU使用权**（操作系统层面为**可执行状态**）和等待**IO**（操作系统层面为**休眠状态**）没有区别
        - 都是在等待某个资源，所以都归入RUNNABLE状态

### RUNNABLE + WAITING
1. 获得synchronized隐式锁的线程，调用无参数的`Object.wait()`方法
2. 调用无参数的`Thread.join()`方法，join是一种**线程同步**的方式
    - 有线程A，当线程B调用A.join()时，线程B会等待线程A执行完，线程B的状态切换：**RUNNABLE -> WAITING**
    - 当线程A执行完后，线程B的状态切换：**WAITING -> RUNNABLE**
3. 调用`LockSupport.park()`方法，**当前线程会阻塞**，线程状态切换：**RUNNABLE -> WAITING**
    - 调用`LockSupport.unpark(Thread thread)`方法可以唤醒**目标线程**
    - 目标线程的状态切换：**WAITING -> RUNNABLE**

### RUNNABLE + TIMED_WAITING
1. 调用**带超时参数**的`Thread.sleep(long millis)`方法
2. 获得synchronized隐式锁的线程，调用**带超时参数**的`Object.wait(long timeout)`方法
3. 调用**带超时参数**的`Thread.join(long millis)`方法
4. 调用**带超时参数**的`LockSupport.parkNanos(Object blocker, long nanos)`方法
5. 调用**带超时参数**的`LockSupport.parkUntil(long deadline)`方法

### NEW + RUNNABLE
```java
// 方式1
class MyThread extends Thread {
    @Override
    public void run() {
        super.run();
    }
}
Thread myThread = new MyThread();

// 方式2
class Runner implements Runnable {
    @Override
    public void run() {
        // task code
    }
}
Thread thread = new Thread(new Runner());
```
1. Java刚创建出来的Thread对象就是处于NEW状态，创建Thread对象的两种方式：继承Thread + 实现Runnable
2. NEW状态的线程，_**不会被操作系统调度**_，所以不会执行，调用线程对象的start()方法：**NEW -> RUNNABLE**

### RUNNABLE + TERMINATED
当线程**执行完**run()方法后，会自动切换到TERMINATED状态；在执行run()方法的过程中**抛出异常**，也会导致线程终止

#### stop() + interrupt()
1. stop()方法会**直接杀死线程**，不给线程喘息的机会
    - 如果线程持有ReentrantLock锁，被stop()的线程**不会自动调用**ReentrantLock.unlock()去释放锁
    - 类似的方法还有suspend()和resume()
2. interrupt()方法仅仅**通知线程**，收到通知的线程可以选择**无视**这个通知，继续选择执行后续操作
3. 被interrupt的线程，收到通知的两种方式：_**InterruptedException**_ + _**主动检测**_
4. **InterruptedException**
    - 当线程A处于**WAITING**或**TIMED_WAITING**状态时，其它线程调用A.interrupt()方法时
        - 会使线程A返回**RUNNABLE**状态，同时线程A的代码会触发InterruptedException异常
        - Thread.sleep(long millis)、Thread.join()、Object.wait()的方法签名都有throw InterruptedException
    - 当线程A处于**RUNNABLE**状态时，并且阻塞在java.nio.channels.InterruptibleChannel上时
        - 如果其它线程调用A.interrupt()方法，线程A会触发java.nio.channels.ClosedByInterruptException
    - 当线程A处于**RUNNABLE**状态时，并且阻塞在java.nio.channels.Selector上时
        - 如果其它线程调用A.interrupt()方法，线程A会立即返回
    - **线程中断状态**
        - 线程A抛出InterruptedException后，会_**重置线程中断状态**_
5. **主动检测**
    - 当线程A处于**RUNNABLE**状态，并且**没有阻塞**在某个IO操作上，此时需要依赖线程A**主动检测**自己的中断状态
        - 如果其它线程调用A.interrupt()方法，那么线程A可以通过isInterrupted()方法来检测自己是否被中断了

```java
Thread th = Thread.currentThread();
while (true) {
    if (th.isInterrupted()) {
        // 死循环，永远无法break
        break;
    }
    try {
        Thread.sleep(100);
    } catch (InterruptedException e) {
        // 抛出InterruptedException会重置线程中断状态，导致死循环
        // 正确的做法是重新设置中断标志位
        th.interrupt();
    }
}
```

<!-- indicate-the-source -->
