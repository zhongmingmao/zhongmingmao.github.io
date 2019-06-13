---
title: Java并发 -- 等待-通知机制
date: 2019-04-22 18:20:59
categories:
    - Java Concurrent
tags:
    - Java Concurrent
---

## 循环等待
1. 在《Java并发 -- 死锁》中，通过破坏**占用且等待**条件来规避死锁，核心代码如下
    - `while (!allocator.apply(this, target)) {}`
2. 如果apply()操作的时间非常短，并且并发不大，该方案还能应付
3. 一旦apply()操作比较耗时，或者并发比较大，该方案就不适用了
    - 因为这可能需要循环上万次才能获得锁，非常_**消耗CPU**_
4. 最好的方案：_**等待-通知**_
    - 当线程要求的条件不满足，则线程**阻塞**自己，进入**等待**状态
    - 当线程要求的条件满足后，通知等待的线程，重新开始执行
    - 线程阻塞能够避免因循环等待而消耗CPU的问题
5. Java语言原生支持**等待-通知机制**
    - 线程**首先获取互斥锁**，当线程要求的条件**不满足**时，**释放互斥锁**，进入等待状态
    - 当要求的条件满足时，通知等待的线程，**重新获取互斥锁**

<!-- more -->

## 等待-通知机制
Java语言原生支持的等待-通知机制：**`synchronized + wait + notify/notifyAll`**

### wait
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-synchronized-wait.png" width=800/>

1. **每个互斥锁有两个独立的等待队列**，如上图所示，等待队列L和等待队列R
1. 左边有一个**等待队列**（等待队列L），_**在同一时刻，只允许一个线程进入synchronized保护的临界区**_
2. 当已经有一个线程进入synchronized保护的临界区后，其他线程就只能进入等待队列L进行等待
3. 当一个线程**进入临界区后**，由于某些条件**不满足**，需要进入**等待**状态，可以调用wait()方法
4. 当调用wait()方法后，当前线程就会被**阻塞**，并且进入到**右边的等待队列**（等待队列R）
    - 线程在进入等待队列R的同时，会**释放持有的互斥锁**，其他线程就有机会获得锁，并进入临界区
4. 关键点：_**sleep不会释放互斥锁**_

### notify/notifyAll
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-synchronized-notify.png" width=800/>

1. 当线程要求的条件满足时，可以通过`notify/notifyAll`来通知等待的线程
2. 当条件满足时调用notify()，会通知等待队列R（**将等待队列L中第1个节点移到等待队列R**）中的线程，告知它_**条件曾经满足**_
    - _**notify()只能保证在通知的时间点，条件是满足的**_
    - 而**被通知线程的执行时间点**与**通知时间点**基本上**不会重合**，当线程执行的时候，条件很可能已经不满足了
3. 被通知的线程如果想要**重新执行**，仍然需要先获取到**互斥锁**
    - 因为曾经获取到的锁在调用wait()时已经**释放**了
4. 关键点：_**执行notify/notifyAll并不会释放互斥锁，在synchronized代码块结束后才真正的释放互斥锁**_

#### 编码范式
```java
while (条件不满足) {
    wait();
}
```
1. 可以解决**条件曾经满足**的问题
2. 当wait()返回时，条件有可能已经改变了，需要重新检验条件是否满足，如果不满足，继续wait()

#### notifyAll
1. _**尽量使用notifyAll()**_
2. notify()：会**随机**地通知等待队列R中的**一个**线程
    - 隐含动作：先将等待队列L的**第一个节点**移动到等待队列R
3. notifyAll()：会通知等待队列R中的**所有**线程
    - 隐含动作：先将等待队列L的**所有节点**移动到等待队列R（待确定是否正确）
4. notify()的风险：_**可能导致某些线程永远不会被通知到**_
    - 假设有资源A、B、C、D，线程1~4都对应**同一个**互斥锁L
    - 线程1申请到了AB，线程2申请到了CD
    - 此时线程3申请AB，会进入互斥锁L的等待队列L，线程4申请CD，也会进入互斥锁L的等待队列L
    - 线程1归还AB，通过notify()来通知互斥锁L的等待队列R中的线程，假设为线程4（先被移动到等待队列R）
    - 但线程4申请的是CD，不满足条件，执行wait()，而真正该被唤醒的线程3就再也没有机会被唤醒了

### 等待队列
1. wait/notify/notifyAll操作的等待队列都是_**互斥锁的等待队列**_
2. 如果synchronized锁定的是this，那么对应的一定是this.wait()/this.notify()/this.notifyAll()
3. 如果synchronized锁定的是target，那么对应的一定是target.wait()/target.notify()/target.notifyAll()
4. 上面这3个方法能够被调用的前提是**已经获取了相应的互斥锁**，都必须在synchronized内部被调用
5. 如果在synchronized外部调用，或者锁定的是this，而调用的是target.wait()，JVM会抛出IllegalMonitorStateException

```java
public class IllegalMonitorStateExceptionTest {
    private Object lockA = new Object();
    private Object lockB = new Object();

    @Test
    public void test1() throws InterruptedException {
        // java.lang.IllegalMonitorStateException
        lockA.wait();
    }

    @Test
    public void test2() throws InterruptedException {
        synchronized (lockA) {
            // java.lang.IllegalMonitorStateException
            lockB.wait();
        }
    }
}
```

## 转账实例

### Allocator
```java
public class Allocator {

    private static class Holder {
        private static Allocator allocator = new Allocator();
    }

    public static Allocator getInstance() {
        return Holder.allocator;
    }

    private Allocator() {
    }

    private List<Object> als = new ArrayList<>();

    // 一次性申请所有资源
    public synchronized void apply(Object from, Object to) {
        // 编程范式
        while (als.contains(from) || als.contains(to)) {
            try {
                wait(); // this，单例
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
        als.add(from);
        als.add(to);
    }

    // 归还资源
    public synchronized void free(Object from, Object to) {
        als.remove(from);
        als.remove(to);
        notifyAll(); // this，单例
    }
}
```

### Account
```java
public class Account {
    // 必须是单例，因为要分配和释放资源
    private Allocator allocator = Allocator.getInstance();
    // 账户余额
    private int balance;

    // 转账
    public void transfer(Account target, int amt) {
        // 一次性申请转出账户和转入账户
        allocator.apply(this, target);

        try {
            // 锁定转出账户
            synchronized (this) {
                // 锁定转入账户
                synchronized (target) {
                    if (balance > amt) {
                        balance -= amt;
                        target.balance += amt;
                    }
                }
            }
        } finally {
            allocator.free(this, target);
        }
    }
}
```

<!-- indicate-the-source -->
