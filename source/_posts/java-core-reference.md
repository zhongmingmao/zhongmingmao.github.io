---
title: Java核心 -- 引用
date: 2019-04-24 08:14:44
categories:
    - Java Core
tags:
    - Java Core
---

## 强引用、软引用、弱引用、幻象引用
主要差别：对象不同的**可达性**（reachable）和对**垃圾收集**的影响

### 强引用 - Strong
1. 最常见的**普通对象引用**，只要还有强引用指向一个对象，就表明该对象还存活，垃圾收集器不会处理这种对象
2. 一个普通的对象，如果没有其他的引用关系，一旦超过了引用的作用域或者显式地将强引用赋值为null，就有可能被收集

### 软引用 - Soft
1. 软引用是一种相对于强引用**弱化**一些的引用，可以让对象**豁免一些垃圾收集**（内存不足）
2. 只有当JVM认为**内存不足**时，才会去试图回收软引用指向的对象
3. JVM会确保在抛出OutOfMemoryError之前，清理软引用指向的对象，软引用通常用来实现**内存敏感的缓存**

<!-- more -->

### 弱引用 - Weak
1. 弱引用**不能使对象豁免垃圾收集**，仅仅只是提供一种**访问在弱引用状态下对象**的途径
2. 弱引用可以用来构建一种**没有特定约束的关系**，例如维护一种**非强制性的映射关系**
    - 如果试图获取时对象还在，就使用它，否则重新实例化
3. 弱引用也是很多**缓存**实现的选择

### 虚引用 - Phantom
1. **不能通过虚引用访问到对象**，虚引用仅仅只是提供一种机制：_**确保对象被finalize以后执行某些事情**_
2. 可以利用虚引用**监控对象的创建和销毁**

## 可达性状态
<img src="https://java-core-1253868755.cos.ap-guangzhou.myqcloud.com/java-core-reference-flow.png" width=600/>

1. 强可达（Strongly Reachable）
    - 当一个对象可以有一个或多个线程**可以不通过各种引用访问到**的情况
    - 例如，新创建一个对象，那么创建该对象的线程对它就是强可达
2. 软可达（Softly Reachable）
    - 只能通过**软引用**才能访问到对象的状态
3. 弱可达（Weakly Reachable）
    - 无法通过**强引用**或者**软引用**访问，只能通过**弱引用**访问时对象的状态
    - 这是十分**临近finalize**的时机，当**弱引用被清除**时，就符合finalize的条件了
4. 虚可达（Phantom Reachable）
    - 没有强引用、软引用和弱引用关联
    - 对象被**finalize**过，只有**虚引用**指向该对象
5. 不可达（UnReachable）
    - 意味着对象可以被**清除**了

## Reference
1. 所有的引用类型，都是`java.lang.ref.Reference`的子类，提供`T get()`方法
    - The object to which this reference refers, or null if this reference object has been cleared
2. 除了**虚引用**（get()永远返回null），如果对象还没有被**销毁**，都可以通过get()获取**原对象**
    - _**利用软引用和弱引用，可以将访问到的对象，重新指向强引用，即人为的改变对象的可达性状态**_
    - 因此垃圾收集器会存在**二次确认**的问题，以保证处于**弱引用状态**的对象，没有改变为强引用

## ReferenceQueue
```java
Object counter = new Object();
ReferenceQueue referenceQueue = new ReferenceQueue();
PhantomReference<Object> p = new PhantomReference<>(counter, referenceQueue);
counter = null;
System.gc();
try {
    // 限时阻塞
    Reference<Object> reference = referenceQueue.remove(1000L);
    if (reference != null) {
        // do something
    }
} catch (Exception e) {
}
```
1. 创建各种引用关系并**关联到相应对象**时，可以选择是否需要**关联到引用队列**
2. JVM会在**特定时机**将引用enqueue到引用队列里
3. 我们可以从引用队列里获取引用（remove方法）后进行后续逻辑
4. 尤其对于**虚引用**，get方法只会返回null，如果再不关联引用队列，基本没什么意义了
5. 利用引用队列，可以在对象处于**相应状态**时，执行后续的处理逻辑
    - 对于**虚引用**来说，相应的状态指的是对象被**finalize**后，处于**虚可达**状态

## PrintReferenceGC

```java
// -XX:+PrintGCDetails -XX:+PrintGCTimeStamps -XX:+PrintReferenceGC
1.926: [GC (Allocation Failure) 1.929: [SoftReference, 0 refs, 0.0000249 secs]1.929: [WeakReference, 439 refs, 0.0000364 secs]1.929: [FinalReference, 1187 refs, 0.0017734 secs]1.931: [PhantomReference, 0 refs, 0 refs, 0.0000126 secs]1.931: [JNI Weak Reference, 0.0000120 secs][PSYoungGen: 33280K->3068K(38400K)] 33280K->3140K(125952K), 0.0059535 secs] [Times: user=0.01 sys=0.01, real=0.00 secs]
```

<!-- indicate-the-source -->
