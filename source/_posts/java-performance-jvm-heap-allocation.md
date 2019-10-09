---
title: Java性能 -- JVM堆内存分配
mathjax: false
date: 2019-09-13 22:11:03
categories:
    - Java
    - Performance
tags:
    - Java
    - Java Performance
    - JVM
---

## JVM内存分配性能问题
1. JVM内存分配不合理最直接的表现就是**频繁的GC**，这会导致**上下文切换**，从而**降低系统的吞吐量**，**增加系统的响应时间**

## 对象在堆中的生命周期
1. 在JVM内存模型的堆中，堆被划分为**新生代**和**老年代**
    - 新生代又被进一步划分为**Eden区**和**Survivor区**，Survivor区由**From Survivor**和**To Survivor**组成
2. 当创建一个对象时，对象会被**优先分配**到新生代的**Eden区**
    - 此时JVM会给对象定义一个**对象年轻计数器**（`-XX:MaxTenuringThreshold`）
3. 当Eden空间不足时，JVM将执行新生代的垃圾回收（**Minor GC**）
    - JVM会把存活的对象转移到Survivor中，并且对象年龄+1
    - 对象在Survivor中同样也会经历Minor GC，每经历一次Minor GC，对象年龄都会+1
4. 如果分配的对象超过了`-XX:PetenureSizeThreshold`，对象会**直接被分配到老年代**

<!-- more -->

## 查看JVM堆内存分配
1. 在默认不配置JVM堆内存大小的情况下，JVM根据默认值来配置当前内存大小
2. 在JDK 1.7中，默认情况下**新生代**和**老年代**的比例是**1:2**，可以通过`–XX:NewRatio`来配置
    - 新生代中的**Eden**:**From Survivor**:**To Survivor**的比例是**8:1:1**，可以通过`-XX:SurvivorRatio`来配置
3. 若在JDK 1.7中开启了`-XX:+UseAdaptiveSizePolicy`，JVM会**动态调整**JVM**堆中各个区域的大小**以及**进入老年代的年龄**
    - 此时`–XX:NewRatio`和`-XX:SurvivorRatio`将会失效，而JDK 1.8是默认开启`-XX:+UseAdaptiveSizePolicy`
    - 在JDK 1.8中，**不要随意关闭**`-XX:+UseAdaptiveSizePolicy`，除非对堆内存的划分有明确的规划
    - 每次**GC后**都会**重新计算**Eden、From Survivor、To Survivor的大小
        - 计算依据是**GC过程**中统计的**GC时间**、**吞吐量**、**内存占用量**

```
$ java -XX:+PrintFlagsFinal -version | grep HeapSize
    uintx ErgoHeapSizeLimit                         = 0               {product}
    uintx HeapSizePerGCThread                       = 87241520        {product}
    uintx InitialHeapSize                          := 261304192       {product}
    uintx LargePageHeapSizeThreshold                = 134217728       {product}
    uintx MaxHeapSize                              := 4181721088      {product}
java version "1.7.0_67"
Java(TM) SE Runtime Environment (build 1.7.0_67-b01)
Java HotSpot(TM) 64-Bit Server VM (build 24.65-b04, mixed mode)
```
```
$ jmap -heap 10773
Attaching to process ID 10773, please wait...
Debugger attached successfully.
Server compiler detected.
JVM version is 24.65-b04

using thread-local object allocation.
Garbage-First (G1) GC with 12 thread(s)

Heap Configuration:
   MinHeapFreeRatio = 40
   MaxHeapFreeRatio = 70
   MaxHeapSize      = 268435456 (256.0MB)
   NewSize          = 1363144 (1.2999954223632812MB)
   MaxNewSize       = 17592186044415 MB
   OldSize          = 5452592 (5.1999969482421875MB)
   NewRatio         = 2
   SurvivorRatio    = 8
   PermSize         = 134217728 (128.0MB)
   MaxPermSize      = 134217728 (128.0MB)
   G1HeapRegionSize = 4194304 (4.0MB)

Heap Usage:
G1 Heap:
   regions  = 64
   capacity = 268435456 (256.0MB)
   used     = 89813712 (85.65303039550781MB)
   free     = 178621744 (170.3469696044922MB)
   33.45821499824524% used
G1 Young Generation:
Eden Space:
   regions  = 11
   capacity = 163577856 (156.0MB)
   used     = 46137344 (44.0MB)
   free     = 117440512 (112.0MB)
   28.205128205128204% used
Survivor Space:
   regions  = 1
   capacity = 4194304 (4.0MB)
   used     = 4194304 (4.0MB)
   free     = 0 (0.0MB)
   100.0% used
G1 Old Generation:
   regions  = 11
   capacity = 100663296 (96.0MB)
   used     = 39482064 (37.65303039550781MB)
   free     = 61181232 (58.34696960449219MB)
   39.221906661987305% used
Perm Generation:
   capacity = 134217728 (128.0MB)
   used     = 41068592 (39.16606140136719MB)
   free     = 93149136 (88.83393859863281MB)
   30.598485469818115% used

16298 interned Strings occupying 1462984 bytes.
```