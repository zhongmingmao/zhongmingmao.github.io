---
title: JVM进阶 -- MAT
date: 2019-01-10 23:18:43
categories:
    - JVM
tags:
    - JVM
---

## 概念

### Shallow Heap + Retained Heap

#### Shallow Heap
Shallow heap is the **memory consumed by one object**. An object needs 32 or 64 bits (depending on the OS architecture) per reference, 4 bytes per Integer, 8 bytes per Long, etc. Depending on the heap dump format the size may be adjusted (e.g. aligned to 8, etc...) to model better the real consumption of the VM.

#### Retained Set
Retained set of X is the set of objects which would be removed by GC when X is garbage collected.

#### Retained Heap
Retained heap of X is the **sum of shallow sizes of all objects in the retained set of X**, i.e. memory kept alive by X.
Generally speaking, shallow heap of an object is its size in the heap and retained size of the same object is the **amount of heap memory that will be freed when the object is garbage collected**.

<!-- more -->

<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/advanced/jvm-advanced-mat-shallow-retained.png" />
The **Minimum Retained Size** gives a good (under)estimation of the retained size which is calculated ways **faster** than the exact retained size of a set of objects. It only depends on the number of objects in the **inspected set**, not the number of objects in the heap dump.

### Dominator Tree
Memory Analyzer provides a dominator tree of the object graph. The transformation of the object reference graph into a dominator tree allows you to easily identify the **biggest chunks of retained memory** and the **keep-alive dependencies among objects**.

#### Dominate
An object x dominates an object y if **every path** in the **object graph** from the start (or the root) node to y **must** go through x.

#### Immediate Dominator
The immediate dominator x of some object y is the dominator **closest** to the object y.

#### Properties
1. The objects belonging to the **sub-tree** of x (i.e. the objects dominated by x) represent the **retained set** of x.
2. If x is the immediate dominator of y , then the immediate dominator of x also dominates y , and so on.
3. The edges in the dominator tree **do not directly** correspond to object references from the object graph.

<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/advanced/jvm-advanced-mat-dominator-tree.png" />
A dominator tree is built out of the object graph. In the dominator tree each object is the **immediate dominator** of its **children**, so dependencies between the objects are easily identified.

## Overview
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/advanced/jvm-advanced-mat-overview.png" />

## Dominator Tree

### No Grouping(Objects)
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/advanced/jvm-advanced-mat-dominator-tree-object.png" />

### Group By Class
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/advanced/jvm-advanced-mat-dominator-tree-class.png" />

### Group By Class Loader
纬度：组件
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/advanced/jvm-advanced-mat-dominator-tree-classloader.png" />

### Group By Package
纬度：自身编写的代码
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/advanced/jvm-advanced-mat-dominator-tree-package.png" />

### Path To GC Roots
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/advanced/jvm-advanced-mat-dominator-tree-path-to-root.png" />
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/advanced/jvm-advanced-mat-dominator-tree-path-to-root-1.png" />


## Histogram
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/advanced/jvm-advanced-mat-histogram.png" />
MAT默认按**Shallow Heap**倒排，手动选择按**Retained Heap**倒排，排第一的是**Ehcache**的**OnHeapStore**类

### List objects
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/advanced/jvm-advanced-mat-histogram-object-incoming-ref.png" />
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/advanced/jvm-advanced-mat-histogram-object-incoming-ref-1.png" />

### Immediate Dominator
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/advanced/jvm-advanced-mat-histogram-immediate-dominator.png" />
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/advanced/jvm-advanced-mat-histogram-immediate-dominator-1.png" />

### Merge Shortest Path To GC Roots
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/advanced/jvm-advanced-mat-histogram-path-to-root.png" />
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/advanced/jvm-advanced-mat-histogram-path-to-root-1.png" />


## 参考资料
1. [Shallow vs. Retained Heap](https://help.eclipse.org/neon/index.jsp?topic=%2Forg.eclipse.mat.ui.help%2Fconcepts%2Fshallowretainedheap.html)
2. [Dominator Tree](https://help.eclipse.org/neon/index.jsp?topic=%2Forg.eclipse.mat.ui.help%2Fconcepts%2Fdominatortree.html)

<!-- indicate-the-source -->
