---
title: Java性能 -- HashMap
mathjax: false
date: 2019-07-18 15:30:45
categories:
    - Java
    - Performance
tags:
    - Java
    - Java Performance
    - HashMap
---

## 实现结构
1. HashMap是基于**哈希表**实现的，继承了AbstractMap并且实现了Map接口
2. HashMap根据**键的Hash值**来决定对应值的存储位置，通过这种索引方式，HashMap获取数据的速度会非常快
3. 当发生**哈希冲突**时，有3种常用的解决方法：**开放定址法**、**再哈希函数法**、**链地址法**
    - **开放定址法**
        - 当发生哈希冲突时，如果哈希表**未被填满**，说明在哈希表中必然还有空位置
        - 可以把Key存放到冲突位置后面的空位置上
        - 该方法存在很多问题，例如查找、扩容等，**不推荐**
    - **再哈希函数法**
        - 在同义词产生地址冲突时再计算另一个哈希函数地址，直到不再冲突
        - 这种方法不容易产生聚集，但却**增加了计算时间**
    - **链地址法**
        - HashMap综合考虑了所有因素，采用了链地址法来解决哈希冲突问题
        - 该方法采用了**数组（哈希表）+链表**的数据结构，当发生哈希冲突时，就用一个链表结构存储**相同Hash值**的数据

<!-- more -->

## 重要属性

### Node
HashMap是由一个**Node**数组构成的，每个Node包含一个Key-Value键值对
```java
transient Node<K,V>[] table;
```

Node类是HashMap的一个内部类，定义了一个next指针，指向具有**相同hash值**的Node对象，构成**链表**
```java
static class Node<K,V> implements Map.Entry<K,V> {
    final int hash;
    final K key;
    V value;
    Node<K,V> next;
}
```

### loadFactor + threshold

```java
int threshold;
final float loadFactor;
```
1. HashMap还有两个重要的属性：加载因子（**loadFactor**）和边界值（**threshold**）
2. loadFactor用来**间接设置Entry数组（哈希表）的内存空间大小**，默认值为**0.75**
3. 对于使用链表法的哈希表来说，查找一个元素的平均时间为`O(1+n)`，n为遍历链表的长度
    - 加载因子越大，对空间的利用越充分，链表的长度越长，查找效率越低
    - 加载因子太小，哈希表的数据将过于稀疏，对空间造成严重浪费
4. Entry数组的threshold是通过初始容量和loadFactor计算所得

## 优化

### 添加元素
根据key的hashCode()返回值，再通过hash()计算出hash值，再通过(n-1)&hash决定Node的存储位置
```java
public V put(K key, V value) {
    return putVal(hash(key), key, value, false, true);
}

static final int hash(Object key) {
    int h;
    // 尽量打乱hashCode真正参与运算的低16位
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}

// n代表哈希表的长度，一般为2的k次方，(n-1)&hash的计算得到的索引值总是位于table数组的索引之内
if ((p = tab[i = (n - 1) & hash]) == null)
    tab[i] = newNode(hash, key, value, null);
```

#### 流程
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-hashmap-put.jpg" width=1000/>

#### putVal
在JDK 1.8中，HashMap引入了**红黑树**数据结构来**提升链表的查询效率**（当链表的长度超过**8**，红黑树的查询效率比链表高）
当链表长度超过8，HashMap会将链表转换为红黑树，此时新增元素会存在**左旋**和**右旋**，因此**效率会降低**
```java
final V putVal(int hash, K key, V value, boolean onlyIfAbsent,
               boolean evict) {
    Node<K,V>[] tab; Node<K,V> p; int n, i;
    // 当table为null或者table的长度为0，即table尚未初始化，通过resize()初始化table
    if ((tab = table) == null || (n = tab.length) == 0)
        n = (tab = resize()).length;
    // 通过(n - 1)&hash计算出table的下标i，table[i]为链表的第一个元素，如果为null，则新建一个节点
    if ((p = tab[i = (n - 1) & hash]) == null)
        tab[i] = newNode(hash, key, value, null);
    else {
        Node<K,V> e; K k;
        if (p.hash == hash &&
            ((k = p.key) == key || (key != null && key.equals(k))))
            // 首节点为链表节点，key相同的条件：hash值相同 + 满足equals方法
            e = p;
        else if (p instanceof TreeNode)
            // 首节点为红黑树节点，新增元素也只能是红黑树节点
            e = ((TreeNode<K,V>)p).putTreeVal(this, tab, hash, key, value);
        else {
            // 首节点为链表节点，新增元素后，可能需要红黑树化
            for (int binCount = 0; ; ++binCount) {
                if ((e = p.next) == null) {
                    p.next = newNode(hash, key, value, null);
                    if (binCount >= TREEIFY_THRESHOLD - 1) // -1 for 1st
                        // 链表转换为红黑树
                        treeifyBin(tab, hash);
                    break;
                }
                if (e.hash == hash &&
                    ((k = e.key) == key || (key != null && key.equals(k))))
                    break;
                p = e;
            }
        }
        if (e != null) { // existing mapping for key
            V oldValue = e.value;
            if (!onlyIfAbsent || oldValue == null)
                e.value = value;
            afterNodeAccess(e);
            return oldValue;
        }
    }
    ++modCount;
    if (++size > threshold)
        resize();
    afterNodeInsertion(evict);
    return null;
}
```

### 获取元素
1. 当HashMap中只存在数组，而数组中没有Node链表时，是HashMap查询数据性能最好的时候
2. 一旦发生大量的哈希冲突，就会产生Node链表，这时每次查询都可能遍历Node链表，从而降低查询性能
    - 特别在**链表长度过长**的情况下，**性能将明显降低**，而**红黑树**能很好地解决了这个问题
    - 使得查询的平均时间复杂度降低到`O(log(n))`，链表越长，使用红黑树替换后的查询效率提升越明显
3. 也可以**重写Key的hashCode方法**，**降低哈希冲突**，从而减少链表的产生

### 扩容
1. HashMap也是**数组类型**的数据结构，也一样存在扩容的情况
2. JDK 1.7
    - 分别取出数组元素，一般该元素是**最后一个**放入链表的元素
    - 然后遍历以该元素为头的单向链表元素，依据每个被遍历元素的**hash值**计算其在新数组中的下标，然后进行交换
    - 将原来哈希冲突的单向链表**尾部**变成扩容后单向链表的**头部**
3. JDK 1.8
    - 扩容数组的长度是**2倍**的关系，假设初始tableSize=4要扩容到8，就是**0100**到**1000**的变化
    - 在扩容时，只需要判断**原来hash值与oldCap的按位与结果，重新分配索引**
        - `hash & oldCap == 0`，说明旧有的索引就能覆盖
        - `hash & oldCap == 1`，说明旧有的索引不能覆盖，索引需要+oldCap

```java
// JDK 1.8
if (oldTab != null) {
    for (int j = 0; j < oldCap; ++j) {
        Node<K,V> e;
        if ((e = oldTab[j]) != null) {
            oldTab[j] = null;
            if (e.next == null)
                // 链表只有一个节点，直接Hash
                newTab[e.hash & (newCap - 1)] = e;
            else if (e instanceof TreeNode)
                ((TreeNode<K,V>)e).split(this, newTab, j, oldCap);
            else { // preserve order
                // 链表有多个节点，需要遍历
                Node<K,V> loHead = null, loTail = null;
                Node<K,V> hiHead = null, hiTail = null;
                Node<K,V> next;
                do {
                    next = e.next;
                    // 与oldCap按位与为0，索引不变，依然为j
                    if ((e.hash & oldCap) == 0) {
                        if (loTail == null)
                            loHead = e;
                        else
                            loTail.next = e;
                        loTail = e;
                    }
                    // 与oldCap按位与为1，索引变成j+oldCap
                    else {
                        if (hiTail == null)
                            hiHead = e;
                        else
                            hiTail.next = e;
                        hiTail = e;
                    }
                } while ((e = next) != null);
                if (loTail != null) {
                    loTail.next = null;
                    newTab[j] = loHead;
                }
                if (hiTail != null) {
                    hiTail.next = null;
                    newTab[j + oldCap] = hiHead;
                }
            }
        }
    }
}
```

## 小结
1. HashMap通过**哈希表**的数据结构来存储**键值对**，好处：**查询效率高**
2. 如果**查询操作**比较频繁，可以适当**减小loadFactor**，如果对**内存利用率**要求比较高，可以适当**增加loadFactor**
3. 在预知存储数据量的情况下，可以**提前设置初始容量**（**初始容量 = 预知数据量 / 加载因子**）
    - 可以**减少resize()操作**，提高HashMap的效率
4. HashMap使用**数组+链表**方式实现**链地址法**，当有**哈希冲突**时，将**冲突的键值对**链成一个**链表**
5. 如果链表过长，查询数据的时间复杂度会增加，HashMap在JDK 1.8中使用**红黑树**来解决这个问题

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-hashmap.jpg" width=1000/>

## 参考资料
[Java性能调优实战](https://time.geekbang.org/column/intro/100028001)
