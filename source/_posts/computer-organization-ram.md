---
title: 计算机组成 -- 内存
mathjax: false
date: 2020-01-28 00:52:44
categories:
    - Computer Basics
    - Computer Organization
tags:
    - Computer Basics
    - Computer Organization
---

## 程序装载
1. 在Linux或Windows下，**程序并不能直接访问物理内存**
2. 内存需要被分成**固定大小的页**，然后通过**虚拟**内存地址到**物理**内存地址的**地址转换**，才能到达实际存放数据的物理内存位置
   - **程序看到的内存地址，都是虚拟内存地址**

<!-- more -->

## 地址转换

### 简单页表
1. **页表**（Page Table，**一一映射**）：<**虚拟**内存的页, **物理**内存的页>
2. **页表**：把一个**内存地址**分成**页号**（Directory）和**偏移量**（Offset）两部分
   - 前面的**高位**，是内存地址的**页号**；后面的**低位**，是内存地址的**偏移量**
   - 页表只需要保留**虚拟内存地址的页号**和**物理内存地址的页号**之间的**映射**关系即可
3. **同一个页里面的内存**，在**物理**层面是**连续**的
   - 对于**32位**的内存地址，**4KB**大小的页，需要保留**20位**的高位，**12位**的低位
4. 内存地址转换步骤
   - 把**虚拟内存地址**，切分成**页号**和**偏移量**
   - 从**页表**里面，查询出**虚拟页号**对应的**物理页号**
   - 直接拿到**物理页号**，加上前面的**偏移量**，得到**物理内存地址**

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-ram-page-table.jpg" width=700/>

#### 空间问题
1. **32位**的内存地址空间，页表一共需要记录**2^20**个到物理页号的映射关系
2. 一个**页号**是**完整**的32位的**4 Bytes**，一个页表就需要**4MB**的空间（2^20 * 4 Bytes = **4MB**）
3. 每一个**进程**，都有属于自己**独立的虚拟内存地址空间**，每个进程都需要这样的一个**页表** -- 占用的内存空间非常大
   - **32位**的内存地址空间只能支持**4GB**的内存，现在大多都是**64位**的计算机和操作系统

### 多级页表
1. 其实没有必要存下2^20个物理页表，大部分进程所占用的内存是有限的，需要的页也自然是**有限**的
   - 只需要去存那些**用到**的页之间的映射关系 -- **多级页表**
2. 整个进程的内存地址空间，通常是**两头实、中间空**
   - **栈**：内存地址**从顶向下**，不断分配占用
   - **堆**：内存地址**从底向下**，不断分配占用
   - **虚拟**内存占用的地址空间，通常是**两段连续的空间**
     - **多级页表**特别适合这样的内存地址分布！！

#### 4级的多级页表
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-ram-multi-level-page-table.jpg" width=1000/>

1. 同样一个虚拟内存地址，**偏移量**的部分和上面的简单页表是一样的，但原先的**页号**部分，**拆分**成了4部分
2. 对应的，**一个进程会有一个4级页表**
   - 先通过**4级页表索引**，找到**4级页表**里对应的**条目**
   - 这个条目里存放的是一个**3级页表所在的位置**
   - **4级页表**里面的每一个**条目**，都对应着一张**3级页表**，因此可能会有**多张3级页表**
3. 找到对应的**3级页表**之后，再用**3级页表索引**去**3级页表**找到对应的条目（指向一个**2级页表**）
4. **2级页表**里，可以用**2级页表索引**指向一个**1级页表**
5. 最后一层的**1级页表**里面的条目，对应的数据内容就是**物理页号**了
6. 拿到物理页号后，可以用**页号+偏移量**的方式，来获取最终的**物理内存地址**
7. 因为实际的虚拟内存空间通常是**连续**的，可能只需要**很少的2级页表**，甚至只需要**1张3级页表**即可
8. **多级页表**类似于一个**多叉树**的数据结构，因此常常称之为**页表树**（Page Table Tree）
   - 因为**虚拟**内地址分布的**连续性**，树的**第一层节点**的指针，很多是**空**的，即不需要对应的**子树**
     - 不需要子树，也就是不需要对应的**2级**、**3级**的页表
   - 找到**最终的物理页号**，相当于通过特定的访问路径，走到树最底层的**叶子节点**

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-ram-page-table-tree.jpg" width=700/>

#### 空间对比
1. **多级页表**
   - 如果每一级都用**5个bit**来表示，那么每一张某1级的**页表**，只需要**2^5=32**个条目
     - 如果每个条目都还是**4 Bytes**，一共需要**128 Bytes**
   - 一个**填满的1级索引表**，对应**32个Page（4KB）**，即**128KB**的大小
   - 一个**填满的2级索引表**，对应**32个1级索引表**，即**4MB**的大小
2. 如果一个进程占用了**8MB**的内存空间，分成了**2个4MB的连续空间**，一共需要**2个独立的、填满的2级索引表**
   - 意味着：**64个1级索引表**、**2个独立的3级索引表**、**1个4级索引表**
   - 总共需要**69**个索引表，大概需要**128Bytes * 69 ≈ 9KB**的空间，相比于4MB，只有_**1/464**_

#### 小结
1. 多级页表节省了存储空间，但却带来了时间上的开销，是一种『**以时间换空间**』的策略
2. 原本进行一次**地址转换**，只需要访问一次内存就能找到物理页号，就能计算出物理内存地址
3. 但用了4级页表，就需要**访问4次内存**，才能找到物理页号
4. **访问内存比访问Cache要慢很多！！**

## 性能 + 安全
1. **性能**
   - **机器指令**里面的内存地址都是**虚拟内存地址**，每一个**进程**，都有一个**独立的虚拟内存地址空间**
   - 通过**地址转换**来获得最终的**实际物理地址**
   - 每一个**指令**都是放在**内存**里面，每一条**数据**都存放在**内存**里面
     - 因此**地址转换**是一个**非常高频**的动作，地址转换的**性能**至关重要
2. **安全**
   - 因为所有**指令**和**数据**都存放在**内存**里面，就不得不考虑**内存安全**问题
   - 如果有人修改了内存里面的内容，CPU就可能会执行**计划之外的指令**
     - **破坏**服务器里面的数据、获取服务器里面的**敏感**信息

## TLB -- 加速地址转换
1. **多级页表**（**空间换时间**）：节约了存储空间，但却带来了时间上的开销
2. 程序所需要使用的指令，都**顺序存放**在**虚拟内存**里面（**空间**局部性）；指令也是一条条**顺序执行**的（**时间**局部性）
   - 因此**对于指令地址的访问**，存在**空间**局部性和**时间**局部性 -- **缓存**！！
3. 计算机工程师专门在CPU里面存放了一块**缓存芯片**，称为**TLB**（Translation-Lookaside Buffer，**地址变换高速缓冲**）
   - TLB里面存放了之前已经进行过地址转换的查询结果
4. TLB与**CPU Cache**类似
   - 可以分为**指令TLB（ITLB）**和**数据TLB（DTLB）**
   - 可以根据**大小**对它进行**分级**，变成**L1、L2 TLB**
   - 需要用**脏标记位**，来实现**写回**这样的缓存策略
5. 为了**性能**，整个的**内存转换**过程也需要由**硬件**来执行
   - 在CPU芯片里面，封装了**内存管理单元**（MMU，Memory Management Unit）芯片，用来完成地址转换
   - 和TLB的**访问**和**交互**，都是由MMU控制的

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-ram-tlb-mmu.jpg" width=700/>

## 安全性 + 内存保护
对于**内存管理**，计算机也有一些**最底层的安全保护机制**，这些机制统称为**内存保护**（Memory Protection）

### 可执行空间保护
1. 对于一个进程使用的内存，只把其中的**指令**部分设置成**可执行**的
2. 其实无论是指令还是数据，在CPU看来，都是**二进制**的数据
   - 直接把数据部分拿给CPU，如果这些数据解码后，也能变成一条**合理**的指令，其实是可执行的
3. 对于进程里内存空间的**执行权限**进行控制，可以使得CPU只能执行**指定区域**的代码
   - 对于数据区域的内容，即使找到了其他漏洞想要加载成指令来执行，也会因为没有权限而被阻挡掉

### 地址空间布局随机化
1. 内存层面的安全保护**核心**策略：**在可能有漏洞的情况下进行安全预防**
2. 核心问题
   - 其他的人、进程、程序，会去修改掉特定进程的指令和数据，然后，让当前进程去执行这些指令和数据，造成破坏
   - 如果要想修改这些指令和数据，需要知道这些指令和数据所在的**位置**才行
3. 原先一个**进程的内存布局**空间是**固定**的，任何第三方很容易就知道指令、程序栈、数据、堆的**位置**
   - 地址空间布局随机化：让这些区域的位置**不再固定**，在内存空间**随机**去分配这些进程里不同部分所在的内存空间地址
   - 如果随便做点修改，程序只会**Crash**掉，而不会去执行计划之外的代码

## 参考资料
[深入浅出计算机组成原理](https://time.geekbang.org/column/intro/100026001)
