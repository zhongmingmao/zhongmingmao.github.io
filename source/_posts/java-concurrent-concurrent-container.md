---
title: Java并发 -- 并发容器
date: 2019-05-12 12:47:21
categories:
    - Java Concurrent
tags:
    - Java Concurrent
---

## 同步容器
1. Java 1.5之前提供的**同步容器**虽然也能保证**线程安全**，但**性能很差**
2. Java中的容器主要分为四大类，分别为List、Map、Set和Queue，并不是所有的Java容器都是线程安全的
3. 将**非线程安全**的容器变成**线程安全**的容器的简单方案：**synchronized**
    - 把非线程安全的容器封装在对象内部，然后控制好**访问路径**即可

<!-- more -->

### 线程安全的ArrayList
```java
public class SafeArrayList<T> {
    private List<T> list = new ArrayList<>();

    public synchronized T get(int idx) {
        return list.get(idx);
    }

    public synchronized void add(int idx, T t) {
        list.add(idx, t);
    }

    public synchronized boolean addIfNotExist(T t) {
        if (!list.contains(t)) {
            list.add(t);
            return true;
        }
        return false;
    }
}
```

### Collections.synchronized
```java
Collections.synchronizedList(new ArrayList());
Collections.synchronizedSet(new HashSet());
Collections.synchronizedMap(new HashMap());
```

### 组合操作存在竟态条件问题
1. 上面的addIfNotExist就包含**组合操作**
2. 组合操作往往隐藏着**竟态条件问题**，即便每个操作都能保证原子性，也不能保证组合操作的原子性
3. 用迭代器遍历同步容器也存在竟态条件问题，因为_**组合操作不具备原子性**_

```java
// 存在竟态条件问题
List<Object> list = Collections.synchronizedList(new ArrayList<>());
Iterator<Object> iterator = list.iterator();
while (iterator.hasNext()) {
    process(iterator.next());
}

// 并发安全，先锁住list再执行遍历操作
List<Object> list = Collections.synchronizedList(new ArrayList<>());
synchronized (list) {
    Iterator<Object> iterator = list.iterator();
    while (iterator.hasNext()) {
        process(iterator.next());
    }
}
```
## 并发容器
1. Java在1.5之前所谓的**线程安全**容器，主要指的是**同步容器**
2. 同步容器最大的问题是**性能差**，所有方法都用**synchronized**来保证互斥，**串行度太高**
3. 在Java 1.5提供了性能更高的容器，称为**并发容器**

### 分类
并发容器数量众多，但依旧可以分成四大类：List、Map、Set和Queue
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-concurrent-container.png" width=1000/>

### List
1. List里面只有一个实现类就是**CopyOnWriteArrayList**
2. CopyOnWrite即在执行**写操作**的时候会将共享变量**重新复制**一份出来，这样的好处是**读操作**是**完全无锁**的
3. CopyOnWriteArrayList内部维护一个**数组**，成员变量array指向这个内部数组，所有的读操作都是基于array进行的
4. 如果在遍历array的同时，还有一个写操作
    - 会将array复制一份，然后在新复制的数组上执行写操作，执行完之后再将array指向这个新的数组
5. **因此读写是并行的， 遍历操作一直都是基于原array执行的，而写操作则是基于新array执行的**
6. 应用场景：仅适用于**写操作非常少**的场景，而且能够容忍**读写的短暂不一致**
7. CopyOnWriteArrayList的迭代器是**只读**的，不支持增删改，因为对**快照**进行增删改是没有意义的

<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-concurrent-copyonwritearraylist-iteration.png" width=800/>
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-concurrent-copyonwritearraylist-add.png" width=800/>

### Map
1. Map接口的两个实现：ConcurrentHashMap和ConcurrentSkipListMap
2. ConcurrentHashMap的key是**无序**的，而ConcurrentSkipListMap的key是**有序**的
3. ConcurrentSkipListMap里面的SkipList本身是一种数据结构，翻译成**跳表**
    - 跳表执行插入、删除和查询操作的平均复杂度为**O(log n)**
    - 理论上**与并发线程数无关**，适用于**并发度非常高**的情况（ConcurrentHashMap的性能也不能满足要求）

| 集合类 | Key | Value | 线程安全 |
| ---- | ---- | ---- | ---- |
| HashMap | _**允许为null**_ | _**允许为null**_ | 否 |
| TreeMap | 不允许为null | _**允许为null**_ | 否 |
| HashTable | 不允许为null | 不允许为null | 是 |
| ConcurrentHashMap | 不允许为null | 不允许为null | 是 |
| ConcurrentSkipListMap | 不允许为null | 不允许为null | 是 |

### Set
1. Set接口的两个实现：CopyOnWriteArraySet和ConcurrentSkipListSet
2. 原理与CopyOnWriteArrayList和ConcurrentSkipListMap类似

### Queue
1. JUC中的Queue类的并发容器是最复杂的，可以从两个维度分类，**阻塞/非阻塞**、**单端/双端**
2. 阻塞/非阻塞：阻塞指的是当队列已满时，入队操作阻塞；当队列已空时，出队操作阻塞
3. 单端/双端：单端指的是只能队尾入队，队首出队；双端指的是队首队尾皆可出队入队
4. 在JUC中，阻塞队列用**Blocking**关键字标识，单端队列用**Queue**标识，双端队列用**Qeque**标识

#### 单端阻塞队列
1. 其实现包括
    - ArrayBlockingQueue
    - LinkedBlockingQueue
    - SynchronousQueue
    - LinkedTransferQueue
    - PriorityBlockingQueue
    - DelayQueue
2. 内部一般都会持有一个**队列**
    - 该队列可以是**数组**（ArrayBlockingQueue）
    - 也可以是**链表**（LinkedBlockingQueue）
    - 甚至**不持有**队列（SynchronousQueue），_**生产者线程的入队操作必须等待消费者线程都出队操作**_
3. LinkedTransferQueue融合了LinkedBlockingQueue和SynchronousQueue的功能，性能比LinkedBlockingQueue更好
4. PriorityBlockingQueue支持按**优先级**出队
5. DelayQueue支持**延时**队列

<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-single-ended-blocking-queue.png" width=800/>

#### 双端阻塞队列
其实现是LinkedBlockingDeque
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-double-ended-blocking-queue.png" width=800/>

#### 单端非阻塞队列
其实现是ConcurrentLinkedQueue

#### 双端非阻塞队列
其实现是ConcurrentLinkedDeque

#### 是否有界
1. 使用队列时，要格外注意队列是否支持**有界**
2. 实际工作中，一般不建议使用**无界**的队列，因为有可能会导致_**OOM**_
3. 上面提到的Queue，只有**ArrayBlockingQueue**和**LinkedBlockingQueue**是支持有界的

<!-- indicate-the-source -->
