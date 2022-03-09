---
title: Cloud Native Foundation - Go Thread Scheduling
mathjax: false
date: 2022-02-08 00:06:25
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go
tags:
  - Cloud Native
  - Go
---

# 进程 & 线程

1. **进程**：**资源分配**的基本单位
2. **线程**：**调度**的基本单位
3. 在**内核**视角，**线程与进程无本质差别**，在 Linux 中都是以**`task_struct`**进行描述
   - glibc 中的 pthread 库提供了 `Native POSIX Thread Library` 支持
   - **Native POSIX Thread Library** (**NPTL**)
     - is an **implementation** of the **POSIX Threads specification** for the **Linux** operating system.
4. 子进程通过 `fork` 的方式产生，基于**父子关系**形成**进程树**，Linux 中的初始进程一般为`systemd`

```
$ pmap 1
1:   /lib/systemd/systemd --system --deserialize 37
```

![image-20220207213038762](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20220207213038762.png)

<!-- more -->

# Linux 进程内存

![image-20220207221016045](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20220207221016045.png)

## 虚拟地址

> https://ggirjau.com/text-data-bss-heap-stack-and-where-in-memory-are-stored-variables-of-c-program/

| Segment   | Desc                                                         |
| --------- | ------------------------------------------------------------ |
| **.text** | contains **executable instructions**                         |
| **.data** | contains any **global** or **static** variables which have a **pre-defined value** and can be modified |
|           | The values for these variables are **initially stored** within the **read-only** memory (typically within *.text*) and are **copied into** the *.data* segment during the **start-up** routine of the program |
| **.bss**  | Named after an ancient assembler operator that stood for "block started by symbol" |
|           | Data in this segment is **initialized by the kernel to arithmetic 0 before the program starts executing** |
|           | Uninitialized data starts at the end of the data segment and contains all **global** variables and **static** variables that are **initialized to zero** or **do not have explicit initialization in source code**. |
| **Heap**  | Heap is the segment where **dynamic memory allocation** usually takes place. |
|           | The heap area begins at the end of the BSS segment and **grows to larger addresses** from there. |
|           | The Heap area is **shared by all shared libraries and dynamically loaded modules in a process**. |
| **Stack** | The stack area contains the program stack, a **LIFO** structure, typically located in the higher parts of memory. |
|           | A "**stack pointer**" register tracks the top of the stack; it is adjusted each time a value is "pushed" onto the stack. |
|           | The set of values pushed for one **function call** is termed a "**stack frame**". A stack frame consists at minimum of a **return address**. **Automatic variables** are also allocated on the stack.<br />方法中的**本地变量**会分配到**栈**上 |
|           | The stack area traditionally adjoined the heap area and they **grew towards each other**; when the stack pointer met the heap pointer, free memory was exhausted. |
|           | On the standard PC **x86** architecture the **stack grows toward address zero**, meaning that more recent items, deeper in the call chain, are at numerically lower addresses and closer to the heap. |

```c .data initialized data
int debug_sesion = 1;
char string[] = "Hello World";

void foo (void)
{
    static int reset_cnt = 5;
    ...
```

```c .bss uninitialized data
static int i;
```

### Go 样例

> Go 不支持静态变量，Go 代码本身编译后在 *.data* 和 *.bss* 没有值（里面实际存储的是 Go Runtime 的值）

```go main.go
package main

const name = "zhongmingmao"

func main() {
}
```

```
$ go build main.go 

$ size main
   text    data     bss     dec     hex filename
 785799   10904  121752  918455   e03b7 main
 
$ objdump -x main
...
Sections:
Idx Name          Size      VMA               LMA               File off  Algn
  0 .text         000515b0  0000000000401000  0000000000401000  00001000  2**4
...
  8 .data         00001e90  00000000004c2c20  00000000004c2c20  000c2c20  2**5
                  CONTENTS, ALLOC, LOAD, DATA
  9 .bss          0001b470  00000000004c4ac0  00000000004c4ac0  000c4ac0  2**5
                  ALLOC
....
```

## 多级页表

1. 页表的作用：虚拟地址与物理地址的**映射**关系
2. 单级页表相当于一一映射，本身就非常浪费内存，为了**节省内存**，发展出了多级页表（常见为**4级**）
3. 寻址：**多级索引 + 页内偏移**

```
$ getconf PAGE_SIZE
4096
```

# CPU 访问内存

1. MMU: **Memory Management Unit**
2. TLB: **Translation Lookaside Buffer**，用于**缓存虚拟地址和物理地址的映射关系**
   - **TLB 在 CPU 内部，比 L1 Cache 都要快**
   - 注意区分 JVM 中的 TLAB（Thread Local Allocation Buffer）
3. 过程（缓存模式：**Cache-Aside**）
   - 第一次访问，CPU 把虚拟地址交给 MMU，MMU 去物理内存中查找多级页表，得到实际的物理地址
   -  然后将虚拟地址与物理地址的映射关系缓存到 TLB
   - 对于同一个虚拟地址的后续访问，将直接访问 TLB

![image-20220207234249516](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20220207234249516.png)

![image-20220207235521793](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20220207235521793.png)

# 切换开销

|                      | 内核参与（系统调用） | 虚拟地址空间切换 |
| -------------------- | -------------------- | ---------------- |
| 进程                 | Y                    | Y                |
| 线程                 | Y                    | N                |
| 用户线程 - goroutine | N                    | N                |

## 进程

1. 直接开销
   - 切换 **PGD**
   - 刷新 **TLB**
   - 切换**硬件上下文**（即：进程恢复前，必须装入**寄存器**的数据）
   - 切换**内核态堆栈**
   - **系统调度器**的代码执行
2. 间接开销
   - 新切入的进程，由于 **CPU 缓存失效**，导致该进程**直接访问内存**的操作变多

## 线程

1. **线程本质上只是一批共享资源的进程，线程切换本质上依然需要内核（系统调用）进行进程切换**
2. **共享 => 节省**
   - 进程内的所有线程共享虚拟地址空间 -- 即*mm*，线程切换相比进程切换，主要**节省了虚拟地址空间的切换**，开销小很多

## 用户线程

> 应用程序在用户空间创建的可执行单元（**goroutine**），创建销毁**完全在用户态**完成，无需切换，**无需内核参与（系统调用）**

![image-20220208002033001](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20220208002033001.png)

# GMP 模型

> Go 基于 GMP 模型实现用户态线程

## 概要

![image-20220208225332764](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20220208225332764.png)

| Component         | Desc                                                         |
| ----------------- | ------------------------------------------------------------ |
| **G : Goroutine** | **goroutine**<br />每个 goroutine 都有自己的**栈空间**和和**定时器**，初始化的栈空间在 **2K** 左右，后续可能增长 |
| **M : Machine**   | 抽象化代表**内核线程**，记录内核线程栈信息<br />当 goroutine 调度到线程时，**使用该 goroutine 自身的栈信息**<br />任何运行中的 goroutine 会与某个**内核态**的线程绑定 |
| **P : Processor** | 代表**调度器**，负责**调度 goroutine**<br />维护一个**本地 goroutine 队列**，M 从 P 上获取 goroutine 并执行，同时还负责部分内存的管理 |

> KSE: Kernel Scheduling Entity -- 轻量级进程

![image-20220208232451974](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20220208232451974.png)

## 细节

![image-20220208232657730](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20220208232657730.png)

### P 状态

| State         | Desc                                        |
| ------------- | ------------------------------------------- |
| **_Pidle**    | 没有运行用户代码或者调度逻辑，执行队列为空  |
| **_Prunning** | 被 M 持有，并且正在执行用户代码或者调度逻辑 |
| **_Psyscall** | 没有执行用户代码，当前线程**陷入系统调用**  |
| _Pgcstop      | 被 M 持有，当前 P 由于 GC 被停止            |
| _Pdead        | 不再被使用                                  |

### G 状态

| State          | Desc                                                         |
| -------------- | ------------------------------------------------------------ |
| _Gidle         | 刚被分配还未初始化，值为0，为创建 goroutine 后的默认值       |
| **_Grunnable** | 没有执行代码，没有栈的所有权，存储在执行队列中（LRQ 或者 GRQ） |
| **_Grunning**  | 正在执行代码，拥有栈的所有权                                 |
| **_Gsyscall**  | **正在执行系统调用，拥有栈的所有权，与 P 脱离，与 M 绑定**<br />**系统调用结束后会被分配到执行队列** |
| **_Gwaiting**  | 被阻塞的 goroutine，阻塞在某个 channel 的发送或者接收队列    |
| **_Gdead**     | 当前 goroutine 未被使用，没有执行代码，分布在 gFree<br />1. 可能是一个**刚初始化**的 goroutine<br />2. 也可能是**刚执行完**的 goroutine |
| _Gcopystac     | 栈正在被拷贝，没有执行代码，不在执行队列上，执行权在         |
| _Gscan         | GC 正在扫描栈空间，没有执行代码，可以与其他状态同时存在      |

### G 位置

1. 进程都有一个全局的 G 队列
2. 每个 P 拥有一个本地执行队列 LRQ
3. 不在执行队列（LRQ 或者 GRQ）中的 G
   - 处于 channel 阻塞态的 G 被放在 sudog
   - 脱离 P 绑定在 M 上的 G，例如系统调用
   - 为了**复用**，执行结束后进入  **P 的 gFree 列表**中的 G

### 创建 G

1. 创建过程
   - 从 P 的 gFree 列表中查找空闲的 goroutine
   - 如果不存在空闲的 goroutine，会创建一个栈大小足够的新结构体
2. 将函数传入的参数移到 goroutine 的栈上
3. 更新 goroutine 调度相关的属性，更新状态为 _Grunnable
4. 返回的 goroutine 会存储到全局变量 allgs 中

### G -> Q

1. 首先尝试将 G 放入对应的 LRQ
2. 如果 LRQ 已经满了（256），会把 LRQ 中的一部分 G 和待加入的 G 一起放到 GRQ

### P

1. 为了保证公平，当 GRQ 中有 G，首先以一定的概率（1/61）尝试从 GRQ 中获取 G，获取失败再尝试从 LRQ 中获取
2. 如果还是失败，则随机从其他 P 对应的 LRQ 中获取 G

### M & P

1. 默认情况下，**P 的数量 = CPU 个数**，可以通过 `GOMAXPROCS` 修改，上限为**256**
2. **M** 的数量为**内核线程数量**，**M ＞ P**，上限为**10,000**
3. P 的数量在调度器初始化的 procresize 中控制
4. 当调度器进行调度，唤醒 P 的时候，**会尝试获取 idle m**，如果获取不到，则**创建新的 M（内核线程）**
   - 因为 M 可能陷入**系统调用**，而系统调用可能是**阻塞**的，如 IO，此时 **CPU 是空闲的**
   - 创建新的 M 与 P 关联，可以让更多的 G 被调度，**充分利用 CPU**
