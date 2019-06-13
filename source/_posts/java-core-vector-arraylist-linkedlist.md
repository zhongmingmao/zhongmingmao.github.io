---
title: Java核心 -- Vector + ArrayList + LinkedList
date: 2019-05-06 17:25:39
categories:
    - Java
    - Core
tags:
    - Java
    - Java Core
---

## 概述
1. Vector、ArrayList、LinkedList都实现了**java.util.List**接口，即**有序集合**
2. Vector是Java早期提供的**线程安全**的**动态数组**，同步有一定的**额外开销**
    - Vector内部使用**对象数组**来保存数据，可以**自动扩容**（创建新的数组，拷贝原有数组的数据）
3. ArrayList是**应用更加广泛**的**动态数组**，本身并不是线程安全的，性能比Vector要好很多
    - Vector的自动扩容是增加1倍，而ArrayList的自动扩容是增加**50%**
4. LinkedList是**双向链表**，不是线程安全的，也不需要动态调整容量

<!-- more -->

## 适用场景
1. Vector和ArrayList都是**动态数组**，其内部元素是以**数组**的形式存储的，非常适合**随机访问**的场合
    - 除了在**尾部**插入和删除元素，性能都比较差，因为要移动后续所有的元素
2. LinkedList进行元素的插入和删除操作会高效很多，但随机访问性能要比动态数组差

## 集合
<img src="https://java-core-1253868755.cos.ap-guangzhou.myqcloud.com/java-core-collection.png" width=800/>

1. 容器包括**集合**和**Map**，_**Map并不是真正的集合**_
2. List：**有序结合**
3. Set：不允许重复元素（equals判断）
4. Queue/Deque：标准队列，支持**FIFO**或者**LIFO**
5. 每种集合的**通用逻辑**，都被抽象到相应的抽象类之中，例如**AbstractList、AbstractSet、AbstractQueue**
6. 集合并不是完全孤立的，例如LinkedList既是List，也是Deque
7. TreeSet实际是利用TreeMap实现的，HashSet实际是利用HashMap实现的

## TreeSet、HashSet、LinkedHashSet
1. TreeSet：支持**自然顺序**访问，但添加、删除和包含等操作相对低效（`O(log(n))`）
2. HashSet：利用**哈希**算法，如果哈希散列正常，可以提供`O(1)`的添加、删除和包含等操作，但**不保证有序**
3. LinkedHashSet
    - 内部构建了一个**记录插入顺序的双向链表**，因此提供了**按照插入顺序遍历**的能力
    - 同时也提供了`O(1)`的添加、删除和包含等操作，但性能略低于HashSet，因为需要额外维护双向链表

## Collections.synchronized
```java
public static <T> Collection<T> synchronizedCollection(Collection<T> c)
public static <T> List<T> synchronizedList(List<T> list)
public static <T> Set<T> synchronizedSet(Set<T> s)
```
1. 将每个基本方法都通过**synchronized**添加基本的同步支持
2. 通过这些方法创建的线程安全集合，都符合**fail-fast**，当发生意外的**并发修改**时，会抛出ConcurrentModificationException

<!-- indicate-the-source -->
