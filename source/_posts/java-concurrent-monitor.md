---
title: Java并发 -- 管程
date: 2019-04-27 08:46:02
categories:
    - Java Concurrent
tags:
    - Java Concurrent
---

## 概述
1. Java语言在1.5之前，唯一提供的**并发原语**是**管程**
2. 在Java 1.5提供的JUC包中，也是以**管程**技术为基础的
3. _**管程是一把解决并发问题的万能钥匙**_

<!-- more -->

## 管程
1. 在Java 1.5之前，仅仅提供synchronized关键字和wait/notify/notifyAll方法
2. Java采用的是**管程**技术，synchronized关键字以及wait/notify/notifyAll方法都是**管程的组成部分**
3. **管程和信号量是等价的**（即用管程能实现信号量，用信号量也能实现管程），但管程**更容易使用**，所以Java选择了管程
4. **Monitor**，在**Java**领域会翻译成**监视器**，在**操作系统**领域会翻译成**管程**
5. 管程：_**管理共享变量以及对共享变量的操作过程，让它们支持并发**_
    - 对应Java领域：管理类的**成员变量**和**成员方法**，让这个类是**线程安全**的

## MESA模型
1. 在管程的发展史上，先后出现了三种不同的管程模型，分别是：Hasen模型、Hoare模型和MESA模型
2. 现在广泛应用的是**MESA**模型，Java管程的实现也参考了MESA模型
3. 管程可以解决并发领域的两大**核心**问题：_**互斥+同步**_
    - **互斥**：在同一时刻**只允许一个线程**访问共享资源
    - **同步**：线程之间如何**通信**、**协作**

### 互斥
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-monitor-exclusive.png" width=800/>
1. 管程解决互斥问题的思路：将**共享变量以及对共享变量的操作**统一封装起来
2. 管程X将共享变量queue和相关的操作enq()和deq()都封装起来
3. 线程A和线程B如果想要访问共享变量queue，只能通过调用管程X提供的enq()和deq()方法来实现
4. enq()和deq()保持互斥性，只允许一个线程进入管程X
5. **管程模型与面向对象高度契合**

### 同步
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-monitor-sync.png" width=800/>
1. 在管程模型里，共享变量和对共享变量的操作是被封装起来的，最外层的框是代表封装的意思
    - 框的上面只有一个入口，并且在入口旁边还有一个_**入口等待队列**_
    - 当多个线程同时试图进入管程内部时，只允许一个线程进入，其他线程就在**入口等待队列**中等待
2. 管程里还引入了**条件变量**的概念，_**每个条件变量都对应一个等待队列**_
    - 条件变量和其对应等待队列的作用：**线程同步**

#### 实例：出队入队
```java
// 下列三对操作的语义是相同的
// Condition.await()        Object.wait()
// Condition.signal()       Object.notify()
// Condition.signalAll()    Object.notifyAll()
public class BlockedQueue<T> {
    private static final int MAX_SIZE = 10;
    // 可重入锁
    private final Lock lock = new ReentrantLock();
    // 条件变量：队列不满
    private final Condition notFull = lock.newCondition();
    // 条件变量：队列不空
    private final Condition notEmpty = lock.newCondition();
    // 队列实际存储：栈
    private final Stack<T> stack = new Stack<>();

    // 入队
    public void enq(T t) {
        // 先获得互斥锁，类似于管程中的入口
        lock.lock();
        try {
            while (stack.size() >= MAX_SIZE) {
                // 队列已满，等待队列不满，才可入队
                notFull.await();
            }
            // 入队后，通知队列不空，可出队
            stack.push(t);
            notEmpty.signalAll();
        } catch (InterruptedException ignored) {
        } finally {
            lock.unlock();
        }
    }

    // 出队
    public T deq() {
        // 先获得互斥锁，类似于管程中的入口
        lock.lock();
        try {
            while (stack.isEmpty()) {
                // 队列已空，等待队列不空，才可出队
                notEmpty.await();
            }
            // 出队后，通知队列不满，可入队
            T pop = stack.pop();
            notFull.signalAll();
            return pop;
        } catch (InterruptedException ignored) {
        } finally {
            lock.unlock();
        }
        return null;
    }
}
```
1. 假设线程T1执行出队操作，执行出队操作的前提条件是队列不空，而**队列不空**就是管程里的**条件变量**
2. 如果线程T1进入管程后恰巧发现队列为空，就会到**队列不空这个条件变量的等待队列**里等待
3. 当线程T1**进入条件变量的等待队列后**，是**允许其他线程进入管程**的
4. 再假设线程T2执行入队操作，执行成功后，队列不空这个条件对于线程T1来说是已经满足了的，线程T2会通知线程T1
5. 当线程T1得到通知后，会从**等待队列**里面出来，但**不能马上执行**，需要重新进入到**入口等待队列**

### 编程范式
1. 对于**MESA管程**，有一个编程范式：`while(条件不满足){wait();}`，这是MESA管程**特有**的
2. Hasen模型、Hoare模型和MESA模型的**核心**区别：_**当条件满足时，如何通知相关线程**_
3. 管程要求同一时刻只允许一个线程执行，当线程T2的操作使线程T1等待的条件满足时
    - **Hasen模型**：要求notify()放在**代码的最后**，这样T2通知完T1后，T2也就结束了，然后T1再执行
        - 缺点：**不灵活**
    - **Hoare模型**：T2通知完T1后，T2阻塞，T1马上执行，等T1执行完，再唤醒T2
        - 缺点：相比Hasen模型模型，**多了一次阻塞唤醒操作**
    - **MESA模型**：T2通知完T1后，T2接着执行，T1不会立即执行，仅仅是从**条件变量的等待队列**进入到**入口等待队列**
        - 优点：notify()不用放在代码的最后，也没有多余的唤醒阻塞操作
        - 缺点：当T1再次执行的时候，**曾经满足的条件可能已经不满足了**，所以才有上面特有的编程范式

## notify的使用场景
1. 一般情况下，_**尽量使用notifyAll()**_
2. 满足3个条件，也可以使用notify()
    - 所有等待线程拥有**相同的等待条件**
    - 所有等待线程**被唤醒后执行相同的操作**
    - **只需要唤醒一个线程**

## Java的管程实现
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-monitor-built-in-synchronized.png" width=800/>
1. Java参考了MESA模型，语言内置的管程（synchronized）对MESA模型进行了**精简**
2. 在MESA模型中，条件变量可以有多个，_**但Java语言内置的管程只有一个条件变量**_
3. Java内置的管程方案（synchronized）使用很简单
    - synchronized关键字修饰的代码块，在**编译期**会自动生成相关加锁和解锁的代码，但**仅支持一个条件变量**
4. JUC包实现的管程**支持多个条件变量**（例如ReentrantLock），但需要开发人员手动进行加锁和解锁操作

<!-- indicate-the-source -->
