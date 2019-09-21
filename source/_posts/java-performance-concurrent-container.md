---
title: Java性能 -- 并发容器
mathjax: false
date: 2019-08-30 09:26:40
categories:
    - Java
    - Performance
tags:
    - Java
    - Java Performance
    - HashTable
    - ConcurrentHashMap
    - ConcurrentSkipListMap
---

## 并发场景下的Map容器
1. 某电商系统需要统计销量TOP 10的商品，通常用**哈希表**来存储商品和销量的键值对，然后使用**排序**获取销量TOP 10的商品
2. 并发场景下不能使用HashMap
    - JDK **1.7**，在并发场景下使用HashMap会出现**死循环**，导致**CPU使用率居高不下**，而**扩容**是导致死循环的主要原因
    - JDK **1.8**，虽然修复了HashMap扩容导致的死循环问题，但在高并发场景下，依然会有**数据丢失**和**不准确**的情况
3. 为了保证Map容器的**线程安全**，Java实现了**HashTable**、**ConcurrentHashMap**、**ConcurrentSkipListMap**
    - HashTable、ConcurrentHashMap是**基于HashMap**实现的，适用于**小数据量**存取的场景
    - ConcurrentSkipListMap是**基于TreeMap**的设计原理实现的
        - ConcurrentSkipListMap是基于**跳表**实现的，而TreeMap是基于**红黑树**实现的
        - ConcurrentSkipListMap最大的特点是存取**平均时间复杂度**为`O(log(n))`，适用于**大数据量**存取的场景

<!-- more -->

### HashTable / ConcurrentHashMap
1. 在数据**不断地写入和删除**，且**不存在**数据**累积**以及数据**排序**的场景下，可以选用HashTable或者ConcurrentHashMap
2. HashTable使用**synchronized同步锁**修饰了put、get、remove等方法
    - 在**高并发**场景下，读写操作都会存在大量**锁竞争**，给系统带来**性能开销**
3. 相比于HashTable，ConcurrentHashMap在保证**线程安全**的基础上兼具了**更好的并发性能**
    - JDK 1.7中，ConcurrentHashMap使用了**分段锁Segment**减少了锁粒度，优化了锁的并发操作
    - JDK 1.8中，ConcurrentHashMap做了大量的改动，**摒弃了Segment的概念**
        - synchronized同步锁在JDK 1.6的性能已经得到了很大的提升
        - 在JDK 1.8中，**重启了synchronized同步锁**，通过synchronized实现**Node**作为锁粒度
        - put方法：没有哈希冲突时，使用**CAS**进行添加元素操作；有哈希冲突时，**通过synchronized将链表锁定**
4. 在统计销量TOP 10的场景下，首选ConcurrentHashMap
5. ConcurrentHashMap的**整体性能**要优于HashTable，但某些场景下ConcurrentHashMap不能替代HashTable
    - 例如**强一致性**的场景，ConcurrentHashMap的get、size等方法都**没有加锁**，ConcurrentHashMap是**弱一致性**的

### ConcurrentHashMap / ConcurrentSkipListMap
1. ConcurrentHashMap在**数据量比较大**的时候，**链表会转换为红黑树**
    - 红黑树在并发情况下，删除和插入过程有个**平衡**的过程，会涉及到**大量结点**，**竞争锁资源的代价相对较高**
    - 而**跳跃表**的操作针对**局部**，需要**锁住的结点少**，在并发场景下性能会更好一些
2. 在**非线程安全**的Map中，基于**红黑树**实现的**TreeMap**在**单线程**中的**性能表现**并不比跳跃表差
3. 因此
    - 在**非线程安全**的Map容器中，使用**TreeMap**来存取**大数据**
    - 在**线程安全**的Map容器中，使用**ConcurrentSkipListMap**来存取**大数据**

#### 跳跃表
1. 跳跃表是基于链表扩展实现的一种特殊链表，类似于**树**的实现
2. 跳跃表不仅实现了**横向链表**，还实现了**垂直方向**的**分层索引**
3. 一个跳跃表由若干层链表组成，每一层都实现了一个**有序链表索引**，只有**最底层包含所有数据**
    - 每一层由下往上依次通过一个指针**指向上层相同值的元素**，每层数据依次减少，到最顶层只会保留部分数据
4. 跳跃表利用了**空间换时间**的方法来提高查询效率，程序总是从**最顶层**开始查询访问，通过判断元素值来缩小查询范围

初始化的跳跃表
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-concurrent-container-skiplist-1.jpg" width=1000/>

查询Key值为9的结点
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-concurrent-container-skiplist-2.jpg" width=1000/>

1. 新增Key值为8的结点，首先**新增**一个结点（**CAS操作**）到**最底层**的链表中
2. 根据概率算出level值，再根据level值新建索引层，最后**链接**索引层的新结点（**CAS操作**）

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-concurrent-container-skiplist-3.jpg" width=1000/>

1. 删除Key值为7的结点，首先找到待删除结点，将其**value**值设置为**null**
2. 之后再向**待删除结点的next位置**新增一个**标记结点**，以便减少**并发冲突**
3. 然后让待删除结点的前驱结点直接越过本身指向的待删除结点，直接指向后继结点，中间要被删除的结点最终会被垃圾回收
4. 最后判断此次删除后是否导致某一索引层没有其他节点了，并视情况删除该层索引

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-concurrent-container-skiplist-4.jpg" width=1000/>

### 使用场景
1. HashTable：数据**强一致性**
2. ConcurrentHashMap：（大部分情况）数据**弱一致性**
3. ConcurrentSkipListMap：数据量在**千万**级别，且存在**大量的增删改**操作

## 并发场景下的List容器
1. ArrayList并非线程安全容器，Java提供了线程安全容器：**Vector**、**CopyOnWriteArrayList**
2. Vector是基于**synchronized同步锁**实现的线程安全，synchronized关键字几乎修饰了所有对外暴露的方法
    - 在**读远大于写**的操作场景下，Vector将会发生**大量锁竞争**，给系统带来**性能开销**
3. CopyOnWriteArrayList：**读操作无锁**，写操作通过**底层数组的新副本**来实现，是一种**读写分离**的并发策略

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-concurrent-container-cop-on-write-array-list.jpg" width=1000/>

## 小结
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-concurrent-container-summary.jpg" width=1000/>

## 参考资料
1. [老生常谈，HashMap的死循环](https://juejin.im/post/5a66a08d5188253dc3321da0)
