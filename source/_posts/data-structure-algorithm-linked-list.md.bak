---
title: 数据结构与算法 -- 链表
mathjax: false
date: 2019-08-06 23:33:43
categories:
    - Data Structure & Algorithm
tags:
    - Data Structure
    - Algorithm
    - LinkedList
---

## 链表

### 单链表
1. 数组需要一块**连续**的内存空间来存储，而链表并不需要，而是通过**指针**将一组零散的内存块串联起来
2. 为了将所有结点串起来，每个链表的结点除了存储**数据**之外，还需要记录**下一个结点的地址**
    - 将记录下个结点地址的指针称为**后继指针next**
3. 有两个结点比较特殊，分别是第一个结点和第二个结点，习惯性地称为**头结点**和**尾结点**
    - 头结点用来记录链表的基地址
    - 尾结点的指针指向的不是下一个结点，而是指向一个空地址**NULL**，表示这是链表上的最后一个结点

<!-- more -->

#### 插入 + 删除
1. 数组的插入和删除操作，为了保持内存数据的**连续性**，需要做大量的**数据搬移**，时间复杂度为**`O(n)`**
2. 链表的插入和删除操作，并不需要为了保持内存的连续性而搬移结点，因为链表的存储空间本身就不是连续的
    - 因此在链表中插入和删除一个数据是非常快速的，只需要考虑**相邻结点的指针变化**，时间复杂度为**`O(1)`**

#### 随机访问
1. 链表中的数据并非连续存储，无法像数组那样，根据**首地址**和**下标**，通过**寻址公式**直接计算出对应的内存地址
2. 而是需要根据指针一个结点一个结点地**依次遍历**，直到找到相应的结点，时间复杂度为**`O(n)`**

### 循环链表
1. 循环链表是一种**特殊的单链表**，单链表的尾结点指向空地址NULL，而循环链表的**尾结点指针指向链表的头结点**
2. 与单链表相比，循环链表的优点是从链尾到链头比较方便，当要处理的数据具有**环型结构**特点时，适合采用循环链表

### 双向链表
1. 单向链表只有一个方向，结点只有一个**后继指针next**指向后面的结点
2. 双向链表支持两个方向，每个结点除了有**后继指针next**指向后面的结点，还有**前驱结点prev**指向前面的结点
3. 双向链表需要额外的空间来储存**后继结点**和**前驱结点**的地址，比单链表占用更多的内存空间，但支持**双向遍历**，**更加灵活**
4. 双向链表**查找前驱结点**的时间复杂度为`O(1)`，在某些场景下，双向链表的插入和删除操作要比单链表简单高效
5. 在实际的软件开发中，虽然双向链表占用更多的内存，但还是比单链表有**更广的应用**，体现了**空间换时间**的设计思想

#### 插入 + 删除
1. 删除结点中“值等于某个给定值”的结点
    - 不管单链表还是双向链表，都需要从头结点开始一个一个依次**遍历对比**，直到找到的值等于给定值的结点
    - 单纯的删除操作的时间复杂度为`O(1)`，但遍历查找的时间复杂度为`O(n)`，因此总的时间复杂度为`O(1)`
2. 删除给定指针指向的结点
    - 此时已经找到要删除的结点，但删除某个结点需要知道其**前驱结点**，而单链表并不支持直接获取前驱结点
        - 所以，单链表为了找到前驱结点，还是需要从头结点开始**遍历**链表
        - 而双向链表中的结点已经保存了前驱结点的指针，不需要像单链表那样遍历
    - 在这种场景下，使用单链表的时间复杂度为`O(n)`，而使用双向链表的时间复杂度为`O(1)`
3. 同理，在链表中某个指定结点的**前面**插入一个结点，使用双向链表的时间复杂度为`O(1)`，而使用单链表的时间复杂度`O(1)`

#### 查找
1. 对于一个**有序链表**，双向链表**按值查询**的效率也要比单链表要高一些
2. 可以记录上次查找的位置，每次查询时，根据情况决定往前查找还是往后查找，平均只需要查找**一半**的数据

## 对比数组

### 时间复杂度
| 操作 | 数组 | 链表 |
| ---- | ---- | ---- |
| 插入/删除 | O(n) | O(1) |
| 随机访问 | O(1) | O(n) |

### CPU缓存
1. 数组使用**连续**的内存空间，可以利用**CPU的缓存机制**，预读数组中的数据，**访问效率更高**
2. 链表在内存中并不是连续存储，对CPU缓存**不友好**，没办法有效预读

### 固定大小
1. 数组的缺点是大小固定，一经声明就要占用**整块连续**内存空间
    - 如果声明**过大**，系统就没有足够的连续内存空间来分配，导致**内存不足**
    - 如果声明**过小**，就有可能出现不够用的情况，这时只能再申请一个更大的内存空间，把原数组**拷贝**过去，**非常耗时**
2. 链表本身没有大小的限制，**天然支持动态扩容**，这是与数组最大的区别
3. 如果程序对内存大小非常敏感，数组会是更优的选择

## LRU缓存
1. 维护一个**有序单链表**，越靠近尾部的结点是越早之前访问的，当有一个新的数据被访问时，从链表头开始遍历**链表**
2. 如果此数据之前已经被缓存在链表中，遍历得到这个数据对应的结点，并将其从原来的位置删除，然后再插入到链表的头部
3. 如果此数据没有缓存在链表中，分为两种情况
    - 如果此时缓存未满，则将此结点直接插入到链表头部
    - 如果此时缓存已满，则将链表尾结点删除，并将新结点插入到链表头部
4. 不管缓存有没有满，都需要**遍历**链表，时间复杂度为**`O(n)`**

## 技巧

### 哨兵

#### 插入
单链表中，在结点p后插入一个新节点
```java
// p有可能为null，例如空链表时，p == head == null
newNode.setNext(p.getNext());
p.setNext(newNode);
```

如果要插入**第一个结点**（空链表），上面代码就不通用了，需要**特殊处理**，head表示链表头结点
```java
if (head == null) {
    head = newNode;
}
```

#### 删除
单链表中，删除结点p的后继结点
```java
// p.getNext()有可能为null，例如链表只有一个结点时，p == head
p.setNext(p.getNext().getNext());
```

如果要删除**最后一个结点**（链表中只有一个结点），上面代码也不通用了，需要**特殊处理**
```java
if (head.getNext() == null) {
    head = null;
}
```

#### 哨兵
1. 针对链表的插入和删除操作，需要对**插入第一个节点**和**删除最后一个结点**的情况进行**特殊处理**，**不简洁且容易出错**
2. 哨兵用于解决**边界问题**，不直接参与业务逻辑
3. 引入**哨兵结点**（不存储数据），不管链表是不是为空，**head指针都会一直指向哨兵结点**，有哨兵结点的链表叫作**带头链表**
4. 引入哨兵结点后，可以**统一**代码实现

### 边界条件
1. 链表为**空**
2. 链表只包含**1个结点**
3. 链表只包含**2个结点**
4. 处理**头结点**和**尾结点**

## 常见链表操作
```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Node<T> {
    private T data;
    private Node<T> next;
}
```

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MyLinkedList<T> {
    // 哨兵结点
    private Node<T> head = new Node<>();
}
```

### 单链表反转
```java
public void reverse() {
    Node<T> prev = head;
    Node<T> cur = head.getNext();
    Node<T> next;
    while (cur != null) {
        // 先保留next
        next = cur.getNext();

        if (cur == head.getNext()) {
            // 第一个结点
            cur.setNext(null);
        } else {
            cur.setNext(prev);
        }

        if (next == null) {
            // 最后一个结点
            head.setNext(cur);
        }

        prev = cur;
        cur = next;
    }
}
```

### 检测链表中的环
```java
public boolean existRing() {
    Node<T> fast = head;
    Node<T> slow = head;

    while (fast != null && fast.getNext() != null) {
        fast = fast.getNext().getNext();
        slow = slow.getNext();
        if (slow == fast) {
            return true;
        }
    }
    return false;
}
```

### 合并两个有序链表
```java
public static <T extends Comparable> MyLinkedList<T> merge(MyLinkedList<T> l1, MyLinkedList<T> l2) {
    Node<T> head = new Node<>();
    Node<T> cur = head;
    Node<T> cur1 = l1.getHead().getNext();
    Node<T> cur2 = l2.getHead().getNext();

    while (cur1 != null || cur2 != null) {
        // 遍历完l1，只能遍历l2
        if (cur1 == null) {
            cur.setNext(cur2);
            cur = cur.getNext();
            cur2 = cur2.getNext();
            continue;
        }
        // 遍历完l2，只能遍历l1
        if (cur2 == null) {
            cur.setNext(cur1);
            cur = cur.getNext();
            cur1 = cur1.getNext();
            continue;
        }
        // l1和l2均未遍历完，比较大小
        if (cur1.getData().compareTo(cur2.getData()) < 0) {
            cur.setNext(cur1);
            cur = cur.getNext();
            cur1 = cur1.getNext();
        } else {
            cur.setNext(cur2);
            cur = cur.getNext();
            cur2 = cur2.getNext();
        }
    }

    return new MyLinkedList<>(head);
}
```

### 删除链表倒数第n个结点
```java
public MyLinkedList<T> deleteItemReverse(int n) {
    if (n <= 0) {
        return this;
    }

    // 先拉开差距
    Node<T> first = head;
    Node<T> second = head;
    for (int i = 0; i < n; i++) {
        second = second.getNext();
        if (second == null) {
            // 链表不够n格结点
            return this;
        }
    }

    // 遍历到尾结点
    while (second.getNext() != null) {
        first = first.getNext();
        second = second.getNext();
    }

    // 删除
    first.setNext(first.getNext().getNext());
    return this;
}
```

### 查找链表的中间结点
```java
public T findMiddle() {
    Node<T> fast = head;
    Node<T> slow = head;

    while (fast != null && fast.getNext() != null) {
        fast = fast.getNext().getNext();
        slow = slow.getNext();
    }

    return slow.getData();
}
```
