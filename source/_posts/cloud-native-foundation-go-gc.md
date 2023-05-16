---
title: Cloud Native Foundation - Go GC
mathjax: false
date: 2022-10-10 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/v2-7ed5d9802d90c6b65cb02a212bb65068_720w.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go
tags:
  - Cloud Native
  - Go
---

# Heap 管理

![image-20230514212659625](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20230514212659625.png)

1. `Allocator` （向 `OS` 申请）初始化`连续内存块`作为 Heap
2. `Mutator` 申请内存，Allocator 从 Heap 中`未分配`的区域中分割小的内存块
3. 用`链表`将`已分配`内存连接起来
4. 内存块`元数据`：大小、是否使用、下一个内存块的地址
5. `Collector` 会扫描 Heap，将不再被使用的内存设置为 `unused`

![image-20230514213210668](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20230514213210668.png)

<!-- more -->

# 内存分配

## TCMalloc

> TC = `Thread Caching`

![image-20230514214147853](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20230514214147853.png)

1. page：内存`页`，大小为 `8k`，`Go` 与 `OS` 之间的`内存申请`和`内存释放`，都是以 page 为单位的
2. span：内存`块`，一个或者多个`连续`的 page 组成一个 span
3. sizeclass：空间规格，每个 `span` 都带有一个 sizeclass，标记着`该 span 中的 page 该如何使用`
   - sizeclass - `8`，`16`，`32`，`48`，`64`，`80` ...
4. object：对象，用来存储一个变量数据的内存空间
   - span 在`初始化`时，会被切割成一堆`等大`的 object
   - 如果 object 的大小为 16B，Span list 1 中的 span 为 8k，该 span 中的 page 会被初始化为 8k/16B =  512 Object
   - 所谓`内存分配`，即`对象分配`
5. 对象分配流程
   - 小对象（`0 ~ 256KB`）- `32 pages`
     - `ThreadCache` -> `CentralCache` -> `HeapPage`
     - ThreadCache：大部分时候缓存都是足够的
     - CentralCache + HeapPage：`无系统调用` + `无锁分配`，分配效率非常高效
   - 中对象（`256KB ~ 1MB`）- `32 ~ 128 pages`
     - 直接在 `HeapPage` 中选择适当的大小即可
   - 大对象（`> 1MB`）
     - 从 `Large span set ` 选择合适数量的 page 组成 span，用来存储数据

## Go

> 从 TCMalloc 衍生，做了`增强`

![image-20230516230507671](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20230516230507671.png)

1. `mcache`
   - sizeclass：`1 ~ 66`，每个 class `两个 span` - 134
     - 增强（减少扫描，加快 GC）：一个存`指针`，一个存`直接引用`（存直接引用的 span `无需 GC`）
   - Span 大小为 `8KB`，按照 Span class 大小切分
2. `mcentral`
   - 当 Span 内的所有内存都被占用，没有剩余空间继续分配对象，mcache 会向 mcentral 申请 1 个 Span
   - 如果 mcentral 没有符合条件的 Span，mcentral 会向 mheap 申请 Span
3. `mheap`
   - 当 mheap 没有足够的内存时，mheap 会向 OS 申请内存
   - mheap 将 Span 组织成`树`结构，然后将 Span 分配到 `heapArena` 进行管理

# 内存回收

> `mark-sweep`（利用`三色标记`算法，从 `GC Root` 开始`遍历扫描`所有引用的对象），会发生短暂`STW`

## GC 结构

> 描述 span 的结构体
> `allocBits`：记录 Span 中每块内存的`分配情况`（分配时标记）
> `gcmarkBits`：记录 Span 中每块内存的`引用情况`（Mark 阶段会更新）

> 对照 allocBits 和 gcmarkBits：`已分配 + 未引用`

![image-20230516233144666](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20230516233144666.png)

## GC 流程

> `Go GC` 的大部分处理是和`用户代码`是`并行`的（≈ Java 中的`CMS`）

![image-20230517000823453](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20230517000823453.png)

## 三色标记

> 白色：`垃圾`；黑色：`活跃`；灰色：`待定`

> `递归`：一开始`全是白色`，最后直到`没有灰色`

![image-20230516234749790](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20230516234749790.png)

> 对于`黑色`对象，如果在 `Mark 阶段`发生了`写操作`，写屏障会在真正赋值前将新对象标记为`灰色`

> `Mark 阶段`，新分配的对象会被标记为`黑色`再返回

## 触发机制

1. `内存分配量`：阈值 = 上次 GC 内存分配量 * `内存增长率`（`GOGC`，默认 `100`），即每当内存`扩大一倍`启动 GC
2. `定时`：默认 `2 分钟`
3. `手动`：`runtime.GC()`
