---
title: Cloud Native Foundation -- Go Memory Management
mathjax: false
date: 2022-02-12 00:06:25
categories:
  - Cloud Native
  - Cloud Native Foundation
  - GO
tags:
  - Cloud Native
  - GO
---

# 堆内存管理

## Linux 进程

![image-20220207221016045](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20220207221016045.png)

<!-- more -->

## 管理过程

1. Allocator 的职责：通过**系统调用**向 **OS** 申请内存（**MB/GB**）；响应 Mutator（即应用） 的内存申请（**KB**）
2. Collector：交还给 Allocator，再由 Allocator 决定是否释放并归还给 OS

![image-20220209233237928](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20220209233237928.png)

![image-20220209233405928](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20220209233405928.png)

1. 初始化**连续内存块**为**堆**
2. 在内存申请的时候，Allocator 从堆内存的**未分配区域**分割小内存块
3. 用**链表**将**已分配内存**连接起来
4. 需要信息描述每个内存块的**元数据**（**对象头**）：大小、是否使用、下一个内存块的地址

> Example: *Ruby allocates memory from the memory allocator, which in turn allocates from the kernel*

![ruby_memory_alloc_interactions](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/ruby_memory_alloc_interactions.png)

## 面临挑战

1. 内存分配需要**系统调用**，在频繁分配内存的时候，系统性能较低
   - C 的每次 `malloc` 是需要**系统调用**的
   - Java 的 Allocator 可以直接一次性申请大内存，然后在**用户态**再慢慢分配
2. **多线程**共享相同的内存空间，同时申请内存，需要**加锁**，或者采用类似 JVM 中的 **TLAB** 来缓解竞争
3. 经过不断地内存分配和回收，**内存碎片**会比较严重，**内存使用率低**

# TCMalloc

![image-20220212153356342](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20220212153356342.png)

1. **Thread Cache ≈ JVM TLAB**
2. Go **预先申请**的大内存，会先放在 **PageHeap**
3. 下一级向上一级别申请内存的时候，上一级都是按**一定规格**分配，**减少加锁的频率**
4. Page：内存页，**8K**；Go 与 OS 之间的内存申请和释放，都是以 Page 为单位
5. Span：**连续**内存块，**Span N = Page × N**
6. **Size Class**
   - 应用申请内存的大小规格，单位 Byte
     - 每个 Span 都有属性 Size Class，Span 内部的的 Page 会按照 Size Class 被**预先格式化**
   - 举例
     - 如针对 Size Class = 8，对应的 Page 会被切分成1024份
     - 如果此时应用申请 **≤** 8（**最佳适配**原则）的内存空间，会分配上面被切分的1024份之一
7. Object：对象，用来存储一个变量数据的内存空间
   - 分配流程
     - 小对象：**0 ~ 256KB**
       - **ThreadCache -> CentralCache -> HeapPage**，大部分情况下 ThreadCache 是足够的，不需要加锁
     - 中对象：**258KB ~ 1MB**
       - 直接在 **HeapPage** 中选择适当大小即可
     - 大对象：**＞ 1MB**
       - 从 **Large Span Set** 中**选择合适数量的 Page 来组成 Span**

# Go

> 与 Java 不同的是，Go 在大部分情况，不需要 GC 调优，相对于 Java，在 GC 方面比较省心

## 内存分配

![image-20220212162357641](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20220212162357641.png)

1. Go 的内存分配机制是从 TCMalloc 衍生，两者都是来自于 Google
2. 增强 1（加快 **GC 效率**，利用**栈上分配**）：**Span Class** 为 **134** 个，**Size Class** 为 **67** 个
   - 一个 Size Class 对应两个 Span Class，一个存**指针**，一个存**直接引用**
     - 存**直接引用**的 Span 无需 **GC 扫描** -- 栈上分配
     - 指针：指针本质上是存放变量地址的一个**变量**，逻辑上是**独立**的，可以被改变，分配在**堆**上，**GC 是针对堆的**
     - 直接引用：是一个**别名**，逻辑上是**不独立**的，具有依附性，分配在**栈**上
3. 增强 2（加快**分配效率**）：Span Class 也维护了两个 **Span 列表**，**Empty** 和 **Non Empty**
   - Empty 语义：是否有**可分配**空间，true = 没有
   - Empty：Span 双向链表，包括**没有空闲对象**的 Span 和 mcache 中的 Span
     - 当 Empty 中的 Span 被释放时，Span 将被移动到 Non Empty
   - Non Empty：**有空闲对象**的 Span 双向链表
     - 从 mcentral 请求新 Span，先尝试从 Non Empty 获取 Span 并移动到 Empty
     - 如果 mcentral 没有可用的 Span，则 mcentral 向 mheap 申请新页
4. 增强 3：mheap 中的 Span 是按**树**来组织的（TCMalloc#PageHeap是按**链表**来组织的）
   - **free**：空闲 + 不是来自于 GC
   - **scav**：来自于 GC

## 内存回收

> Go 使用的 GC 算法是 **Mark-Sweep**，会存在 **STW**

### mspan

1. **bitmap**
   - **allocBits**：记录每块内存的**分配**情况
   - **gcmarkBits**：记录每块内存的**引用**情况
2. 标记结束后进行回收，回收时，**将 allocBits 指向 gcmarkBits**
   - 标记阶段：活跃标记为1，不活跃标记为0
   - 标记过则继续存在，未进行标记则进行回收
3. **回收对象：Span 中的元素**

![image-20220212184724384](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20220212184724384.png)

![image-20220212184734842](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20220212184734842.png)

### GC 过程

> 类似于 JVM 的 **CMS**

#### 三色标记

> 白色：垃圾
> 黑色：存活 + 所有孩子已经扫描
> **灰色**：存活 + 还有孩子未扫描

![image-20220212200920341](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20220212200920341.png)

1. **图遍历**
   - GC 开始时，认为所有 Object 都是白色（即垃圾）
   - 从 Root 区开始遍历，被触达的 Object 置为灰色
   - 遍历所有灰色 Object， 将他们内部引用的变量置为灰色（加入**灰色队列**），然后将自己置为黑色（已经完成扫描工作）
   - 最终只会剩下两种颜色，**黑色（存活）或白色（垃圾）**
2. **并发**标记
   - 对于**黑色** Object，如果在标记期间发生了**写**操作，**写屏障**会在真正赋值前将新对象标记为**灰色**（重新入队，再次扫描确认）
   - **新分配**的 Object，会先标记为**黑色**再返回

#### 详细过程

> Go GC 的大部分处理是和**用户代码**是**并发**的

1. **Mark**
   - **Mark Prepare**
     - STW：初始化 GC 任务，包括开启写屏障、**统计 Root 对象的数量**
   - **GC Drains**
     - 并发：扫描所有 Root 对象（全局指针和 G 栈上的指针），将其加入到**灰色队列**，并循环处理灰色队列的对象，直到灰色队列为空 -- **图遍历**
2. **Mark Termination**
   - STW：完成标记工作，**重新扫描**全局指针和 G 栈
3. **Sweep**
   - 并发：按照标记结果回收所有白色 Object
4. **Sweep Termination**
   - 对未清扫的 Span 进行清扫，只有完成上一轮 GC 的清理工作后才可以开始新一轮的 GC

简单类比

|      | Go                   | Java CMS         |
| ---- | -------------------- | ---------------- |
| STW  | **Mark Prepare**     | Initial Mark     |
|      | GC Drains            | Concurrent Mark  |
| STW  | **Mark Termination** | Final Remark     |
|      | Sweep                | Concurrent Sweep |
|      | Sweep Termination    | Concurrent Reset |

### 触发机制

1. 内存分配量达到**阈值**
   - **每次内存分配**都会检查当前内存分配量是否已经达到阈值，达到则启动 GC
   - 阈值 = **上次 GC 内存分配量 * 内存增长率**（默认是100%，由 `GOGC` 控制） -- 类似于 Ruby GC
2. **定期**触发：默认**2分钟**
3. **手动**触发：`runtime.GC()` -- 类似于 Java `System.gc()`
