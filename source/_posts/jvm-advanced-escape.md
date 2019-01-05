---
title: JVM进阶 -- 浅谈逃逸分析
date: 2019-01-05 21:21:51
categories:
    - JVM
tags:
    - JVM
---

## 概念
1. 在JVM**即时编译**语境下，逃逸分析将判断**新建的对象是否逃逸**
2. 即时编译器判断对象是否逃逸的依据
    - 对象是否被存入**堆**中（**静态字段**或者**堆中对象的实例字段**）
        - 堆是**线程共享**的，其他线程可以获得该对象的引用
    - 对象是否被传入**未知代码**
        - JVM即时编译是**以方法为单位**的
        - 对于方法中**未被内联的方法调用**，即时编译器会将其当做未知代码
        - _**方法调用的调用者以及参数是逃逸的**_
3. 注：方法内联可以简单理解，在即时编译过程中遇到方法调用时
    - **将目标方法的方法体纳入到编译范围之中，并取代原方法调用的优化手段**

<!-- more -->

## foreach
语法糖
```java
public void forEach(ArrayList<Object> list, Consumer<Object> f) {
    for (Object obj : list) {
        f.accept(obj);
    }
}
```

等价代码
```java
public void forEach(ArrayList<Object> list, Consumer<Object> f) {
    Iterator<Object> iter = list.iterator();
    while (iter.hasNext()) {
        Object obj = iter.next();
        f.accept(obj);
    }
}
```

迭代器：ArrayList$Itr
```java
public class ArrayList ... {
    public Iterator<E> iterator() {
        return new Itr();
    }
    private class Itr implements Iterator<E> {
        int cursor;       // index of next element to return
        int lastRet = -1; // index of last element returned; -1 if no such
        int expectedModCount = modCount;
        ...
        public boolean hasNext() {
            return cursor != size;
        }
        @SuppressWarnings("unchecked")
        public E next() {
            checkForComodification();
            int i = cursor;
            if (i >= size)
                throw new NoSuchElementException();
            Object[] elementData = ArrayList.this.elementData;
            if (i >= elementData.length)
                throw new ConcurrentModificationException();
            cursor = i + 1;
            return (E) elementData[lastRet = i];
        }
        ...
        final void checkForComodification() {
            if (modCount != expectedModCount)
                throw new ConcurrentModificationException();
        }
    }
}
```

假设即时编译器能够对上面这些方法都能**内联**：ArrayList$Itr()，hasNext()，next()，checkForComodification()，<br/>可以得到类似的伪代码
```java
public void forEach(ArrayList<Object> list, Consumer<Object> f) {
    Itr iter = new Itr; // new指令，分配内存空间，但未初始化，这里不是Java中的构造器调用
    iter.cursor = 0;
    iter.lastRet = -1;
    iter.expectedModCount = list.modCount;
    while (iter.cursor < list.size) {
        if (list.modCount != iter.expectedModCount)
            throw new ConcurrentModificationException();
        int i = iter.cursor;
        if (i >= list.size)
            throw new NoSuchElementException();
        Object[] elementData = list.elementData;
        if (i >= elementData.length)
            throw new ConcurrentModificationException();
        iter.cursor = i + 1;
        iter.lastRet = i;
        Object obj = elementData[i];
        f.accept(obj);
    }
}
```
伪代码中的ArrayList$Itr实例**既没有被存入任何字段之中**，**也没有作为任何方法调用的调用者或参数**，可以断定该实例**不逃逸**

## 基于逃逸分析的优化
即时编译器可以根据**逃逸分析的结果**进行如锁消除、栈上分配以及标量替换等优化

### 锁消除
1. 如果即时编译器能够**证明锁对象不逃逸**，那么对该锁对象的加锁、解锁操作时没有意义的
    - 其他线程并不能获得该锁对象，也就不可能对该锁对象加锁
    - 这种情况下，即时编译器可以消除对该不逃逸锁对象的加锁、解锁操作
2. 传统编译器仅需证明锁对象不逃逸出线程，即可以进行锁消除
    - 由于JVM**即时编译的限制**（**方法为单位**），上述条件被强化为**证明锁对象不逃逸出该编译的方法**
3. 锁消除的例子：`synchronized(new Object()){}`
4. 对于`synchronized(escapedObject){}`，由于其他线程可能对该逃逸了的对象escapedObject进行加锁操作
    - 从而构造了两个线程之间的happens-before关系
    - 因此即时编译器至少需要为这段代码生成一条刷新缓存的内存屏障指令
5. 实际上，**基于逃逸分析的锁消除并不多见**
    - 开发人员不会对方法中的新建对象进行加锁操作

### 栈上分配
1. JVM的对象都在堆上分配，而堆上的内容对任何线程都是可见的
    - 同时，JVM需要对所分配的堆内存进行管理，并且在对象不再被引用时回收其占据的内存
2. 如果逃逸分析能够证明某些**新建的对象不逃逸**，那么JVM完全可以将其分配在栈上
    - 在new语句所在的**方法退出**时，通过**弹出当前方法的栈帧**来**自动回收**所分配的内存空间
    - 这样便无须借助垃圾回收器来处理不再被引用的对象
    - 但由于之前大部分代码的假设是：对象只能堆分配
        - 因此**HotSpot没有采用栈上分配，而是使用了标量替换**

### 标量替换
1. 标量：**仅能存储一个值的变量**，例如Java代码中的局部变量
2. 聚合量：可以同时存储多个值，例如Java对象
3. 标量替换：**将原本对对象字段的访问，替换成对一个个局部变量的访问**
    - 如下所示，原本需要在内存中**连续分布的对象**，被**拆分成一个个单独的字段**
        - 这些字段即可以存储在**栈**上，也可以存储在**寄存器**中（不占用内存）
    - 该对象的**对象头信息直接消失**，不再被保存至内存中
4. 由于**对象没有被实际分配**，因此和栈上分配一样，同样可以**减轻垃圾回收的压力**
5. 与栈上分配相比
    - 标量替换**对字段的内存连续性没有要求**
    - 字段可以**直接维护在寄存器**中，无需浪费任何内存空间

```java
public void forEach(ArrayList<Object> list, Consumer<Object> f) {
    // Itr iter = new Itr; // 经过标量替换后该分配无意义，可以被优化掉
    int cursor = 0;     // 标量替换
    int lastRet = -1;   // 标量替换
    int expectedModCount = list.modCount; // 标量替换
    while (cursor < list.size) {
    if (list.modCount != expectedModCount)
        throw new ConcurrentModificationException();
    int i = cursor;
    if (i >= list.size)
        throw new NoSuchElementException();
    Object[] elementData = list.elementData;
    if (i >= elementData.length)
        throw new ConcurrentModificationException();
    cursor = i + 1;
    lastRet = i;
    Object obj = elementData[i];
        f.accept(obj);
    }
}
```

<!-- indicate-the-source -->
