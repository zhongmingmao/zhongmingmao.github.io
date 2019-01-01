---
title: JVM基础 -- 浅谈synchronized
date: 2018-12-31 00:17:24
categories:
    - JVM
tags:
    - JVM
---

## 抽象算法

### synchronized代码块
```java
public void foo(Object lock) {
    synchronized (lock) {
        lock.hashCode();
    }
}
```

<!-- more -->

```
public void foo(java.lang.Object);
  descriptor: (Ljava/lang/Object;)V
  flags: ACC_PUBLIC
  Code:
    stack=2, locals=4, args_size=2
       0: aload_1
       1: dup
       2: astore_2
       3: monitorenter
       4: aload_1
       5: invokevirtual #2                  // Method java/lang/Object.hashCode:()I
       8: pop
       9: aload_2
      10: monitorexit
      11: goto          19
      14: astore_3
      15: aload_2
      16: monitorexit
      17: aload_3
      18: athrow
      19: return
    Exception table:
       from    to  target type
           4    11    14   any
          14    17    14   any
```
1. monitorenter指令和monitorexit指令均会消耗操作数栈上的一个**引用类型**元素，作为所要加锁解锁的**锁对象**
2. 上面的字节码包含一个monitorenter指令和多个monitorexit指令
    - JVM需要保证所获得的锁在**正常执行路径**以及**异常执行路径**上都能够被**解锁**
    - 具体的执行路径请参照**Exception table**

### 实例方法 + 静态方法
```java
public synchronized void eoo(Object lock) {
    lock.hashCode();
}
```

```
public synchronized void eoo(java.lang.Object);
  descriptor: (Ljava/lang/Object;)V
  flags: ACC_PUBLIC, ACC_SYNCHRONIZED
  Code:
    stack=1, locals=2, args_size=2
       0: aload_1
       1: invokevirtual #2                  // Method java/lang/Object.hashCode:()I
       4: pop
       5: return
```
1. 字节码中方法的访问标记（flags）包括**ACC_SYNCHRONIZED**
2. 进入该方法时，JVM需要执行monitorenter操作
3. 不管正常返回还是向调用者抛出异常，JVM均需要执行monitorexit操作
4. 这里的monitorenter操作和monitorexit操作**所对应的锁对象是隐式**的
    - 对于**实例方法**来说，锁对象为**this**
    - 对于**静态方法**来说，锁对象为**所在类的Class实例**

### monitorenter + monitorexit
1. 抽象理解：每个**锁对象**拥有一个**锁计数器**和**指向持有该锁的线程的指针**
2. 当执行monitorenter时，如果锁对象的计数器为0
    - 那么说明锁对象还没有被其他线程所持有
    - JVM会将锁对象的持有线程设置为当前线程，并将计数器+1
3. 当执行monitorenter时，如果锁对象的计数器不为0
    - 如果锁对象的持有线程是当前线程，那么JVM会将其计数器+1
    - 否则需要等待，直到持有该锁对象的线程释放该锁
4. 当执行monitorexit时，JVM则需要将该锁对象的计数器-1
    - 当计数器减为0时，那么代表该锁已经被释放掉了
5. 采用计数器的方式，是为了允许同一个线程重复获取同一把锁，**可重入**


## 锁优化

### 对象状态图
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/basic/jvm-basic-synchronized.gif" width=800/>

针对**一个对象的整个生命周期**，锁升级是**单向不可逆**：偏向锁 -> 轻量级锁 -> 重量级锁

### 重量级锁
1. 重量级锁是JVM中最为基础的锁实现
    - JVM会阻塞加锁失败的线程，并在目标锁被释放掉的时候，唤醒这些线程
    - Java线程的**阻塞**和**唤醒**，都依赖于**操作系统**完成
    - 涉及系统调用，需要从操作系统的**用户态切换至内核态**，**开销很大**
    - 每个**Java对象**都存在一个与之关联的**monitor对象**
2. 为了尽量避免昂贵的线程阻塞和唤醒操作，采用**自旋**
    - 自旋：在处理器上**空跑**并且**轮询锁是否被释放**
    - 线程会进入自旋的两种情况（**睡前醒后**）
        - 线程即将**进入阻塞状态之前**
        - 线程**被唤醒后竞争不到锁**
    - 与线程阻塞相比，自旋可能会**浪费大量的处理器资源**
        - JVM采取的是**自适应自旋**
        - 根据以往**自旋等待时间**是否能够获得锁来动态调整自旋的时间（循环次数）
    - 自旋还会带来**不公平锁**
        - 处于阻塞状态的线程，没有办法立即竞争被释放的锁
        - 而处于自旋状态的线程，则很有可能优先获得这把锁

### 轻量级锁
1. 场景：**多个线程在不同的时间段请求同一把锁，没有锁竞争**
2. JVM采用轻量级锁，可以避免**避免重量级锁的阻塞和唤醒**

#### 加锁
1. 如果锁对象标记字段的最后两位为**01**（**无锁或偏向锁**）
2. JVM会在**当前栈帧**中建立一个名为**锁记录**（Lock Record）的内存空间
    - 用于存储锁对象当前的标记字段（Mark Word）的拷贝，叫作**Displaced Mark Word**
3. 拷贝锁对象的标记字段到锁记录中，见下图：轻量级锁CAS操作之前
4. JVM使用**CAS操作**
    - 将**锁对象的标记字段更新为指向锁记录的指针**
    - 将**锁记录里面的owner指针指向锁对象**
5. 如果CAS更新成功，那么当前线程**拥有**了该锁对象的**锁**，并将锁对象标记字段的锁标志位设置为**00**
    - 此时该锁对象处于轻量级锁的状态，见下图：轻量级锁CAS操作之后
6. 如果CAS更新失败，检查**锁对象的标记字段**是否指向**当前线程的栈帧**
    - 如果是，说明**锁重入**，继续执行同步代码
    - 如果不是，说明出现多线程竞争，膨胀为**重量级锁**
        - 锁标记位变为**10**，锁对象的标记字段存储的是**指向monitor对象的指针**
        - **后面等待锁的线程进入阻塞状态，当前线程则尝试使用自旋来获取锁**

轻量级锁CAS操作之前
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/basic/jvm-basic-synchronized-lightweight-before-cas.png" width=400/>

轻量级锁CAS操作之后
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/basic/jvm-basic-synchronized-lightweight-after-cas.png" width=300/>

#### 解锁
1. JVM通过**CAS操作**，**把线程中的Displaced Mark Word复制回锁对象的标记字段**
2. 如果CAS更新成功，同步过程结束
3. 如果CAS更新失败，说明其他线程尝试获取过该锁（**现已膨胀**），在释放锁的同时，**唤醒被挂起的线程**

### 偏向锁
1. 在**无多线程竞争**的情况下，仍然需要**尽量减少不必要的轻量级锁的执行路径**
    - 轻量级锁的获取和释放**依赖多次CAS原子指令**
    - 由此引入了偏向锁
2. 偏向锁乐观地认为：**从始至终只有一个线程请求某一把锁**
    - 只需要在置换ThreadID时需要依赖一次CAS操作
    - 一旦出现多线程**竞争**，必须**撤销**偏向锁
    - 轻量级锁是为了在**线程交替执行**同步块时提高性能
    - 偏向锁是为了在**只有一个线程执行**同步块时进一步提高性能

#### 加锁
1. 偏向锁只会在**第1次**加锁时采用CAS操作
2. 如果锁对象的标记字段最后三位为**101**，即**可偏向状态**
3. 锁对象处于**未偏向**状态（Thread ID == 0）
    - 那么JVM会通过**CAS操作**，将**当前线程的ID**记录在该**锁对象的标记字段**中
    - 如果CAS成功，则认为当前线程获得该锁对象的偏向锁
    - 如果CAS失败，说明另外一个线程抢先获取了偏向锁
        - 此时需要**撤销偏向锁**，使得锁对象进入**轻量级锁**状态
4. 锁对象处于**已偏向**状态（Thread ID != 0）
    - 检测：**标记字段中的线程ID == 当前线程的ID？**
    - 如果是，说明**锁重入**，直接返回
    - 如果不是，说明该锁对象目前偏向于其他线程，需要**撤销偏向锁**
    - 一个线程执行完同步代码后，**不会将标记字段的线程ID清空**，最小化开销

#### 撤销
1. 偏向锁只有遇到**其他线程尝试竞争偏向锁**时，持有偏向锁的线程才会释放锁，**线程本身不会主动释放偏向锁**
2. 偏向锁的撤销，需要等待**全局安全点**，暂停拥有偏向锁的线程，判断**锁对象当前是否处于被锁定的状态**
    - 如果是，撤销偏向锁后升级为**轻量级锁**的状态
    - 如果不是，撤销偏向锁后恢复为**无锁**状态
3. 如果某个类的总撤销数超过-XX:BiasedLockingBulkRevokeThreshold=40
    - Threshold of number of revocations per type to **permanently** revoke biases of all objects in the heap of that type
    - JVM会**撤销该类实例的偏向锁**，并且在之后的加锁过程中直接为该类实例设置为**轻量级锁**

## 参考资料
1. https://wiki.openjdk.java.net/display/HotSpot/Synchronization
2. http://stas-blogspot.blogspot.com/2011/07/most-complete-list-of-xx-options-for.html
3. https://www.cnblogs.com/paddix/p/5405678.html

<!-- indicate-the-source -->
