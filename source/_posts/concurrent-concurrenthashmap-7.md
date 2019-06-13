---
title: Java并发 -- ConcurrentHashMap
date: 2016-08-23 00:06:25
categories:
    - Java
    - Concurrent
tags:
    - Java
    - Java Concurrent
    - JUC
---

{% note info %}
本文将通过剖析`JDK1.7 ConcurrentHashMap`的源码来介绍其实现原理
{% endnote %}

<!-- more -->

# 基础
1. `Hashtable`，`Collections.synchronizedMap(map)`是`全局`上锁，在`JDK1.7`中，`ConcurrentHashMap`采用了**`锁分离`**的技术（`分段锁`），允许`多个操作并发`地进行
2. `ConcurrentHashMap`采用`Segment`将整体切分成不同的部分，每个部分拥有`独立的锁`，如果方法仅`需要单独的部分`，则可以`并发`地执行；如果方法需要跨`Segment`，需要按顺序锁定所有段的锁，然后按`逆序`释放锁
3. `ConcurrentHashMap`允许多个`读操作并发`进行，`读操作并不需要加锁`


# 源码分析

## 核心结构

### ConcurrentHashMap
```java
// ConcurrentHashMap类似于一张大的Hash表，将数据切分成一段一段，每段数据由Segment负责管理
public class ConcurrentHashMap<K, V> extends AbstractMap<K, V>
                                implements ConcurrentMap<K, V>, Serializable {
    static final int DEFAULT_INITIAL_CAPACITY = 16;
    static final float DEFAULT_LOAD_FACTOR = 0.75f;
    static final int DEFAULT_CONCURRENCY_LEVEL = 16;
    static final int MAXIMUM_CAPACITY = 1 << 30;
    static final int MIN_SEGMENT_TABLE_CAPACITY = 2;
    static final int MAX_SEGMENTS = 1 << 16;
    static final int RETRIES_BEFORE_LOCK = 2;

    private transient final int hashSeed = randomHashSeed(this);
    final int segmentMask;
    final int segmentShift;
    final Segment<K,V>[] segments;
    transient Set<K> keySet;
    transient Set<Map.Entry<K,V>> entrySet;
    transient Collection<V> values;
}
```

### Segment
```java
// Segment继承自ReentrantLock，相当于一把可重入锁，本文中会称之为段
// Segment与HashMap的结构非常类似，数组+链表结构
// Segment是实现ConcurrentHashMap锁分离技术的核心
static final class Segment<K,V> extends ReentrantLock implements Serializable {
    static final int MAX_SCAN_RETRIES = Runtime.getRuntime().availableProcessors() > 1 ? 64 : 1;
    transient volatile HashEntry<K,V>[] table;
    transient int count;
    transient int modCount;
    transient int threshold;
    final float loadFactor;
}
```

### HashEntry
```java
// HashEntry用于存储的实际键值对信息，本文中会称之为节点
static final class HashEntry<K,V> {
    final int hash;
    final K key;
    volatile V value;
    volatile HashEntry<K,V> next;
}
```

## 构造函数
```java
public ConcurrentHashMap() {
    this(DEFAULT_INITIAL_CAPACITY, DEFAULT_LOAD_FACTOR, DEFAULT_CONCURRENCY_LEVEL);
}
public ConcurrentHashMap(int initialCapacity) {
    this(initialCapacity, DEFAULT_LOAD_FACTOR, DEFAULT_CONCURRENCY_LEVEL);
}
public ConcurrentHashMap(int initialCapacity, float loadFactor) {
    this(initialCapacity, loadFactor, DEFAULT_CONCURRENCY_LEVEL);
}
public ConcurrentHashMap(Map<? extends K, ? extends V> m) {
    this(Math.max((int) (m.size() / DEFAULT_LOAD_FACTOR) + 1, DEFAULT_INITIAL_CAPACITY),
           DEFAULT_LOAD_FACTOR, DEFAULT_CONCURRENCY_LEVEL);
    putAll(m);
}

public ConcurrentHashMap(int initialCapacity, float loadFactor, int concurrencyLevel) {
    // 默认值：initialCapacity=16, loadFactor=0.75f, concurrencyLevel=16
    if (!(loadFactor > 0) || initialCapacity < 0 || concurrencyLevel <= 0)
        throw new IllegalArgumentException();

    if (concurrencyLevel > MAX_SEGMENTS) // 在大多数机器上，MAX_SEGMENTS=64
        concurrencyLevel = MAX_SEGMENTS;

    int sshift = 0;
    int ssize = 1;
    // ssize为segments的长度，为刚好不小于concurrencyLevel的正数，且为2的sshift次幂，即
    // 2^(sshift-1) < concurrencyLevel <= 2^sshift = ssize
    // 例如当concurrencyLevel=15时，有2^3 < 15 <= 2^4，因此sshift=4，ssize=16
    while (ssize < concurrencyLevel) {
        ++sshift;
        ssize <<= 1;
    }
    this.segmentShift = 32 - sshift;
    this.segmentMask = ssize - 1;

    if (initialCapacity > MAXIMUM_CAPACITY)
        initialCapacity = MAXIMUM_CAPACITY;
    int c = initialCapacity / ssize;
    if (c * ssize < initialCapacity)
        ++c;
    // 默认情况下，c=1
    int cap = MIN_SEGMENT_TABLE_CAPACITY; // MIN_SEGMENT_TABLE_CAPACITY=2
    // cap表示每个人Segment的容量(即table[]数组的长度)，Segment的容量必须是2的n次幂，最小值为2，满足2个条件：
    // 1. (cap * ssize) >= (c * ssize) >= initialCapacity
    // 2. cap = 2^n , n >= 1
    // 确定cap，保证ConcurrentHashMap能容纳所有元素
    while (cap < c)
        cap <<= 1;

    // 创建第一个Segment
    // threshold = (int)(cap * loadFactor)
    // table = (HashEntry<K,V>[])new HashEntry[cap]
    Segment<K,V> s0 = new Segment<K,V>(loadFactor, (int)(cap * loadFactor),
                                            (HashEntry<K,V>[])new HashEntry[cap]);
    // 创建segments
    Segment<K,V>[] ss = (Segment<K,V>[])new Segment[ssize];
    UNSAFE.putOrderedObject(ss, SBASE, s0); // segments[0]=s0
    this.segments = ss;
}
```

执行`默认构造器`后，`ConcurrentHashMap的内存布局`如下图所示
<img src="https://concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/chm7_constructer.png" width="500">

## put(K key,V value)
```java
// From ConcurrentHashMap
public V put(K key, V value) {
    Segment<K,V> s;
    if (value == null)
        throw new NullPointerException();
    int hash = hash(key); // 计算key的hash值
    int j = (hash >>> segmentShift) & segmentMask; // 获取段索引j，用于segments[j]
    // UNSAFE.getObject不具有volatile语义，需要在ensureSegment方法中用volatile语义进行再次检验
    if ((s = (Segment<K,V>)UNSAFE.getObject(segments, (j << SSHIFT) + SBASE)) == null)
        // segments[j]尚未初始化，采用自旋+CAS的方式进行初始化，最后返回已经初始化的segments[j]
        s = ensureSegment(j);

    // 委托给Segment执行实际的put操作
    return s.put(key, hash, value, false);
}
```

### ensureSegment
```java
// From ConcurrentHashMap
// 返回segments[k]，如果segments[k]尚未初始化，采用自旋+CAS的方式进行初始化
private Segment<K,V> ensureSegment(int k) {
    final Segment<K,V>[] ss = this.segments;
    long u = (k << SSHIFT) + SBASE; // segments[k]的偏移量
    Segment<K,V> seg;
    // segments[k]，volatile读
    if ((seg = (Segment<K,V>)UNSAFE.getObjectVolatile(ss, u)) == null) {
        // segments[k]尚未初始化，采用segments[0]作为原型来初始化segments[k]
        Segment<K,V> proto = ss[0];
        int cap = proto.table.length;
        float lf = proto.loadFactor;
        int threshold = (int)(cap * lf);
        HashEntry<K,V>[] tab = (HashEntry<K,V>[])new HashEntry[cap];
        // segments[k]，volatile读
        // 如果尚未初始化，才创建Segment，在竞争激烈时能减少开销
        if ((seg = (Segment<K,V>)UNSAFE.getObjectVolatile(ss, u)) == null) {
            Segment<K,V> s = new Segment<K,V>(lf, threshold, tab);
            // 通过自旋+CAS设置segments[k]，直到segments[k]完成初始化
            // 每次循环判断用volatile语义读取segments[k]
            while ((seg = (Segment<K,V>)UNSAFE.getObjectVolatile(ss, u)) == null) {
                if (UNSAFE.compareAndSwapObject(ss, u, null, seg = s))
                    // 并发时，只有一个线程能竞争成功，直接退出循环，
                    // 其他竞争失败的线程也会在下一次循环判断时直接退出
                    // 因此只要segments[k]初始化，并发的线程都能很快退出自旋
                    // 没有采用锁进行阻塞，而是只采用自旋+CAS，性能要更好
                    break;
            }
        }
    }
    return seg;
}
```

### put(K key,int hash,V value,boolean onlyIfAbsent)
```java
// From Segment
// put操作的核心代码
final V put(K key, int hash, V value, boolean onlyIfAbsent) {
    HashEntry<K,V> node = tryLock() ? // 尝试抢占锁，Segment<K,V> extends ReentrantLock
                      null : // 成功抢占锁
                      // 抢占锁失败
                      // scanAndLockForPut首先会定位节点，并尝试多次抢占锁，
                      // 当抢占锁失败达到一定次数（默认64次）后，进入阻塞lock
                      scanAndLockForPut(key, hash, value);

    // 执行到这里，当前线程已经持有锁！
    V oldValue;
    try {
        // table是volatile变量，禁止指令重排序，tab为局部变量，允许使用指令重排序来优化
        HashEntry<K,V>[] tab = table;
        int index = (tab.length - 1) & hash;
        HashEntry<K,V> first = entryAt(tab, index); // 链表头结点，tab[index]
        for (HashEntry<K,V> e = first;;) { // 自旋
            if (e != null) {
                K k;
                if ((k = e.key) == key || (e.hash == hash && key.equals(k))) { // 命中
                    oldValue = e.value;
                    if (!onlyIfAbsent) {
                        // put更新value，putIfAbsent直接返回
                        e.value = value;
                        ++modCount;
                    }
                    break;
                }
                e = e.next;
            }
            else { // 链表为空或已经遍历到了链表尾部依然没有命中，则新建节点并成为链表新的头结点
                if (node != null)
                    // 更新node的后继节点为链表原头结点
                    node.setNext(first);
                else
                    // 新建节点node，并将node的后继节设置为链表原头结点
                    node = new HashEntry<K,V>(hash, key, value, first);
                int c = count + 1;
                if (c > threshold && tab.length < MAXIMUM_CAPACITY)
                    // 节点数超过阈值threshold，进行rehash
                    rehash(node);
                else
                    // 节点数未超过阈值，将节点设置为链表头节点
                    setEntryAt(tab, index, node);
                ++modCount; // 修改次数
                count = c; // 节点数量
                oldValue = null;
                break;
            }
        }
    } finally {
        unlock();
    }
    return oldValue;
}
```

#### scanAndLockForPut
```java
// From Segment
// tryLock失败后会执行scanAndLockForPut
// 遍历链表，直到查找对应节点，如果没有对应节点就创建一个新节点，然后进入自旋tryLock
// 自旋tryLock有次数限制，达到次数（默认64次）后进入阻塞lock
// 在达到次数之前，如果发现链表头结点被修改了，则重新遍历链表并重新自旋tryLock
// 上述过程中有可能会预先创建节点，这是为了避免在持有锁的期间再创建节点，提高性能，起到预热的作用
// 如果没有命中，返回一个新节点；如果命中，返回null，返回时当前线程已经持有锁
private HashEntry<K,V> scanAndLockForPut(K key, int hash, V value) {
    // first为链表头结点：table[(tab.length - 1) & h)]
    HashEntry<K,V> first = entryForHash(this, hash);
    HashEntry<K,V> e = first; // e为迭代节点，从链表头结点开始
    HashEntry<K,V> node = null; // 新节点
    // 当retries=-1时，遍历链表，查找节点
    // 当retries>=0时，尝试获取锁
    int retries = -1;
    while (!tryLock()) { // 获取锁失败，自旋tryLock，一定次数后阻塞lock
        HashEntry<K,V> f;
        if (retries < 0) { // 遍历链表，直到遍历结束或命中
            if (e == null) {
                if (node == null)
                    // 创建一个新的节点
                    node = new HashEntry<K,V>(hash, key, value, null);
                retries = 0; // 遍历结束，准备开始有限次tryLock
            }
            else if (key.equals(e.key))
                retries = 0; // 命中，结束遍历，准备开始有限次tryLock
            else
                e = e.next; // 尚未命中且遍历尚未结束，继续遍历
            }
        else if (++retries > MAX_SCAN_RETRIES) { // 大多数机器上，MAX_SCAN_RETRIES=64
            // 超过最大重试次数（默认64次），采用lock()，阻塞线程，直到获得锁后退出循环
            lock();
            // 当前线程被唤醒后，持有锁，退出循环
            break;
        }
        // 因为新节点会作为链表新的头结点，在并发时链表的头结点可能会发生变化
        else if ((retries & 1) == 0 && (f = entryForHash(this, hash)) != first) {
            e = first = f;
            retries = -1; // 重新遍历链表，查找节点，并重新自旋tryLock
        }
    }
    return node;
}

// 单核为1，多核为64
static final int MAX_SCAN_RETRIES = Runtime.getRuntime().availableProcessors() > 1 ? 64 : 1;
```

##### entryForHash
```java
// From ConcurrentHashMap
// 获取链表头节点：table[(tab.length - 1) & h)]
static final <K,V> HashEntry<K,V> entryForHash(Segment<K,V> seg, int h) {
    HashEntry<K,V>[] tab;
    return (seg == null || (tab = seg.table) == null) ? null :
        // table[(tab.length - 1) & h)]，volatile读
        (HashEntry<K,V>) UNSAFE.getObjectVolatile(tab, ((long)(((tab.length - 1) & h)) << TSHIFT) + TBASE);
}
```

#### entryAt
```java
// From ConcurrentHashMap
// tab[i]，volatile读
static final <K,V> HashEntry<K,V> entryAt(HashEntry<K,V>[] tab, int i) {
    return (tab == null) ? null :
        // tab[i]不具有volatile语义，所以这里采用getObjectVolatile
        (HashEntry<K,V>) UNSAFE.getObjectVolatile(tab, ((long)i << TSHIFT) + TBASE);
}
```

#### setNext
```java
// From HashEntry
final void setNext(HashEntry<K,V> n) {
    // 更新后继节点，延时写
    // 因为在Segment中，执行setNext都必须先持有锁
    // 当前线程持有锁，持有锁期间的修改无需让其他线程知道
    // 而在锁释放时，会自动写入主内存，因此采用延时写，这样能提高性能！！
    // 否则直接更新next，而next是volatile变量，会采用volatile写，反而增加开销
    UNSAFE.putOrderedObject(this, nextOffset, n);
}
```

#### setEntryAt
```java
// From Segment
static final <K,V> void setEntryAt(HashEntry<K,V>[] tab, int i, HashEntry<K,V> e) {
    // 更新链表头结点，延时写
    // 延时写的原因与setNext类似，不再赘述
    UNSAFE.putOrderedObject(tab, ((long)i << TSHIFT) + TBASE, e);
}
```

#### rehash
```java
// From Segment
// 重建Segment
private void rehash(HashEntry<K,V> node) {
    HashEntry<K,V>[] oldTable = table;
    int oldCapacity = oldTable.length;
    int newCapacity = oldCapacity << 1; // 扩容两倍
    threshold = (int)(newCapacity * loadFactor);
    HashEntry<K,V>[] newTable = (HashEntry<K,V>[]) new HashEntry[newCapacity];
    int sizeMask = newCapacity - 1;
    for (int i = 0; i < oldCapacity ; i++) { // 遍历旧链表
        HashEntry<K,V> e = oldTable[i]; // 链表头结点
        if (e != null) {
            HashEntry<K,V> next = e.next; // 链表头结点的后继节点
            int idx = e.hash & sizeMask;
            if (next == null)
                // 链表只有一个节点
                newTable[idx] = e;
            else {
                HashEntry<K,V> lastRun = e;
                int lastIdx = idx;
                for (HashEntry<K,V> last = next; last != null; last = last.next) {
                    int k = last.hash & sizeMask;
                    if (k != lastIdx) {
                        lastIdx = k;
                        lastRun = last;
                    }
                }
                // 遍历一遍链表，计算lastIdx和lastRun
                // lastRun和其之后的所有节点的新索引都是lastIdx
                // 直接设置newTable[lastIdx]=lastRun，减少重建工作
                newTable[lastIdx] = lastRun;

                // 重建lastRun之前的节点
                for (HashEntry<K,V> p = e; p != lastRun; p = p.next) {
                    V v = p.value;
                    int h = p.hash;
                    int k = h & sizeMask;
                    HashEntry<K,V> n = newTable[k];
                    // 新建节点，而非修改原先节点的next属性，
                    // 这就保证了如果有其他线程在遍历原先的链表（如get操作），不会对其造成影响
                    newTable[k] = new HashEntry<K,V>(h, p.key, v, n);
                }
            }
        }
    }
    int nodeIndex = node.hash & sizeMask; // 增加新节点
    node.setNext(newTable[nodeIndex]);
    newTable[nodeIndex] = node;
    table = newTable;
}
```

### 逻辑示意图
```java
public static void main(String[] args) {
    ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();
    map.put("zhongmingmao", 1);
}
```
<img src="https://concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/chm7_put.png" width="500">

## remove(Object key)
```java
// From ConcurrentHashMap
public V remove(Object key) {
    int hash = hash(key);
    Segment<K,V> s = segmentForHash(hash); // segments[((h >>> segmentShift) & segmentMask)]
    // 委托给Segment执行实际的remove操作
    return s == null ? null : s.remove(key, hash, null);
}
```

### segmentForHash
```java
// From ConcurrentHashMap
private Segment<K,V> segmentForHash(int h) {
    long u = (((h >>> segmentShift) & segmentMask) << SSHIFT) + SBASE;
    // segments[((h >>> segmentShift) & segmentMask)]，volatile读
    return (Segment<K,V>) UNSAFE.getObjectVolatile(segments, u);
}
```

### remove(Object key, int hash, Object value)
```java
// From Segment
// remove操作的核心操作
final V remove(Object key, int hash, Object value) {
    if (!tryLock())
        scanAndLock(key, hash);

    // 执行到这里，当前线程已经持有锁！
    V oldValue = null;
    try {
        HashEntry<K,V>[] tab = table;
        int index = (tab.length - 1) & hash;
        HashEntry<K,V> e = entryAt(tab, index); // 迭代节点，从链表头结点开始
        HashEntry<K,V> pred = null; // e的"前驱节点"
        while (e != null) {
            K k;
            HashEntry<K,V> next = e.next;
            if ((k = e.key) == key || (e.hash == hash && key.equals(k))) {
                V v = e.value;
                if (value == null || value == v || value.equals(v)) { // 命中
                    if (pred == null)
                        // 待删除的节点是链表头结点，直接设置待删除节点的后继节点为新的头结点
                        // 即 tab[index] = next
                        setEntryAt(tab, index, next);
                    else
                        // 待删除的节点不是链表头结点，直接更新"前驱节点"的后继节点为待删除节点的后继节点
                        pred.setNext(next);
                    ++modCount; // 修改次数
                    --count; // 节点数量
                    oldValue = v;
                }
                break;
            }
            pred = e;
            e = next;
        }
    } finally {
        unlock();
    }
    return oldValue;
}
```

#### scanAndLock
```java
// From Segment
// 与scanAndLockForPut非常类似，只是少了创建节点而已，不再赘述
private void scanAndLock(Object key, int hash) {
    HashEntry<K,V> first = entryForHash(this, hash);
    HashEntry<K,V> e = first;
    int retries = -1;
    while (!tryLock()) {
        HashEntry<K,V> f;
        if (retries < 0) {
            if (e == null || key.equals(e.key))
            retries = 0;
            else
            e = e.next;
        }
        else if (++retries > MAX_SCAN_RETRIES) {
            lock();
            break;
        }
        else if ((retries & 1) == 0 && (f = entryForHash(this, hash)) != first) {
            e = first = f;
            retries = -1;
        }
    }
}
```

## get(Object key)
```java
// From ConcurrentHashMap
// 代码非常简单，需要注意的是，get操作不需要先持有锁的！！
// 在put操作中我们知道，新节点时在链表头，并未修改原节点next属性，不影响get操作中遍历
// 另外put操作中假如触发rehash，根据上面分析可知，新旧链表是可以同时存在的，也同样不影响get操作中遍历
// 在remove操作中，最极端的情况是，remove线程要删除的节点的后继节点即为get线程要查询的节点，
// 哪怕remove线程和get线程同时位于待删除的节点，但由于remove线程仅仅修改"前驱节点"的next属性，并不影响get操作中遍历
// 因此在ConcurrentHashMap中的get操作并不是"完全实时"的！！
public V get(Object key) {
    Segment<K,V> s;
    HashEntry<K,V>[] tab;
    int h = hash(key);
    long u = (((h >>> segmentShift) & segmentMask) << SSHIFT) + SBASE;
    if ((s = (Segment<K,V>)UNSAFE.getObjectVolatile(segments, u)) != null
                                                        && (tab = s.table) != null) {
        for (HashEntry<K,V> e = (HashEntry<K,V>) UNSAFE.getObjectVolatile
                            (tab, ((long)(((tab.length - 1) & h)) << TSHIFT) + TBASE);
                        e != null;
                        e = e.next) {
            K k;
            if ((k = e.key) == key || (e.hash == h && key.equals(k)))
                return e.value;
        }
    }
    return null;
}
```

## clear()
```java
// From ConcurrentHashMap
public void clear() {
    final Segment<K,V>[] segments = this.segments;
    // 遍历segments，逐个加锁解锁，但不会一次性锁定整个ConcurrentHashMap（所有Segment）
    for (int j = 0; j < segments.length; ++j) {
        Segment<K,V> s = segmentAt(segments, j); // segments[j]
        if (s != null)
            s.clear();
    }
}
```

### segmentAt
```java
// From ConcurrentHashMap
static final <K,V> Segment<K,V> segmentAt(Segment<K,V>[] ss, int j) {
    long u = (j << SSHIFT) + SBASE;
    // ss[j]，volatile读
    return ss == null ? null : (Segment<K,V>) UNSAFE.getObjectVolatile(ss, u);
}
```

### clear
```java
// From Segment
// 对整个Segment进行操作，自旋获得锁的可能性不大，放弃自旋tryLock，直接lock
final void clear() {
    lock();
    try {
        HashEntry<K,V>[] tab = table;
        for (int i = 0; i < tab.length ; i++)
            setEntryAt(tab, i, null); // tab[i] = null，置空链表
        ++modCount;
        count = 0; // 节点数量置为0
    } finally {
        unlock();
    }
}
```

## size()
```java
// From ConcurrentHashMap
// 先尝试若干次无锁比较，如果都失败，升级为持有所有Segment的锁，锁定整个ConcurrentHashMap
public int size() {
    final Segment<K,V>[] segments = this.segments;
    int size;
    boolean overflow; // 是否溢出
    long sum;         // 修改次数
    long last = 0L;   // 上次的修改次数
    int retries = -1;
    try {
        for (;;) {
            if (retries++ == RETRIES_BEFORE_LOCK) { // 默认RETRIES_BEFORE_LOCK=2
                // 失败若干次后，升级为持有所有Segment的锁，锁定整个ConcurrentHashMap
                for (int j = 0; j < segments.length; ++j)
                    ensureSegment(j).lock();
            }
            sum = 0L;
            size = 0;
            overflow = false;
            for (int j = 0; j < segments.length; ++j) {
                Segment<K,V> seg = segmentAt(segments, j); // segments[j]
                if (seg != null) {
                    sum += seg.modCount;
                    int c = seg.count;
                    if (c < 0 || (size += c) < 0)
                        overflow = true;
                }
            }
            if (sum == last)
                // 只有前后两次的修改次数一致，才退出循环，执行finally
                break;
            last = sum;
        }
    } finally {
        if (retries > RETRIES_BEFORE_LOCK) { // 代表曾经上锁，需要释放锁
            for (int j = 0; j < segments.length; ++j)
                segmentAt(segments, j).unlock();
        }
    }

    // 溢出就返回Integer.MAX_VALUE，感觉有点奇怪
    return overflow ? Integer.MAX_VALUE : size;
}
```


<!-- indicate-the-source -->
