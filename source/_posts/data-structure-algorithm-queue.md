---
title: 数据结构与算法 -- 队列
mathjax: false
date: 2019-08-14 20:04:26
categories:
    - Data Structure & Algorithm
tags:
    - Data Structure
    - Algorithm
    - Queue
---

## 简介
1. 栈支持两个基本操作：**入栈**（push）、**出栈**（pop）
2. 队列支持两个基本操作：**入队**（enqueue）、**出队**（dequeue）
3. 队列和栈都是**操作受限的线性表**
4. 用**数组**实现的队列叫作**顺序队列**，用**链表**实现的队列叫作**链式队列**

<!-- more -->

## 顺序队列
```java
public class ArrayQueue<T> {
    private Object[] items;
    private int n;
    private int head = 0;
    private int tail = 0;

    public ArrayQueue(int capacity) {
        items = new Object[capacity];
        n = capacity;
    }

    // 入队
    public boolean enqueue(T t) {
        if (tail == n) {
            // 队列已满
            return false;
        }
        items[tail++] = t;
        return true;
    }

    // 出队
    public T dequeue() {
        if (head == tail) {
            // 队列为空
            return null;
        }
        return (T) items[head++];
    }
}
```
存在的问题：随着不停地入队，tail会到达n，即使数组中还有空闲空间，也无法往队列中添加数据，可以优化enqueue

### 优化enqueue
```java
// 入队
public boolean enqueue(T t) {
    if (tail == n) {
        if (head == 0) {
            // 整个队列已满，只能扩容
            return false;
        }
        // 数据搬移
        System.arraycopy(items, head, items, 0, tail - head);
        tail -= head;
        head = 0;
    }
    items[tail++] = t;
    return true;
}
```
依然有数据搬移的动作，可以采用循环队列

### 循环队列
循环队列体现出**取模**的思想
```java
public class CircularQueue<T> {
    private Object[] items;
    private int n;
    private int head;
    private int tail;

    public CircularQueue(int capacity) {
        // 预留一个位置给tail
        int realSize = capacity + 1;
        items = new Object[realSize];
        this.n = realSize;
    }

    // 入队
    public boolean enqueue(T t) {
        if ((tail + 1) % n == head) {
            // 队列已满
            return false;
        }
        items[tail] = t;
        tail = (tail + 1) % n;
        return true;
    }

    // 出队
    public T dequeue() {
        if (head == tail) {
            // 队列为空
            return null;
        }
        T t = (T) items[head];
        head = (head + 1) % n;
        return t;
    }
}
```

## 链式队列
```java
@Data
public class Node<T> {
    private T data;
    private Node<T> next;
}
```
```java
public class LinkedQueue<T> {
    private Node<T> head = new Node<>();
    private Node<T> tail = head;

    // 入队
    private boolean enqueue(T t) {
        Node<T> node = new Node<>();
        tail.setData(t);
        tail.setNext(node);
        tail = node;
        return true;
    }

    // 出队
    public T dequeue() {
        if (head == tail) {
            // 队列为空
            return null;
        }
        T data = head.getData();
        head = head.getNext();
        return data;
    }
}
```

## 阻塞队列
1. 阻塞队列
    - 在队列为**空**时，从**队头**取数据会被阻塞，直到队列中有数据
    - 在队列已**满**时，往**队尾**插入数据会被阻塞，直到队列中有空闲位置
2. 使用阻塞队列，可以很容易地实现**生产者-消费者**模型，有效地**协调**生产和消费的速度

## 并发队列
1. 并发队列：_**线程安全的队列**_
2. 最简单的实现方式是直接在enqueue和dequeue方法上**加锁**，但锁粒度太大会是**降低并发度**
3. **基于数组的循环队列**，利用**CAS**原子操作，可以非常高效地实现并发队列，例如**Disruptor**
