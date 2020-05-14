---
title: 计算机组成 -- MESI协议
mathjax: false
date: 2020-01-27 02:10:35
categories:
    - Computer Basics
    - Computer Organization
tags:
    - Computer Basics
    - Computer Organization
---

## 缓存一致性问题
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-cache-coherence-1.jpg" width=800/>

<!-- more -->

1. iPhone降价了，要把iPhone最新的价格更新到**主内存**里，为了性能问题，采用**写回**策略
   - 先把数据写入到**L2 Cache**里，然后把Cache Block标记为**脏**的
   - 此时数据其实没有被同步到**L3 Cache**或**主内存**里
     - 1号核心希望在这个Cache Block要**被交换**出去的时候，数据才写入到主内存里
2. 此时2号核心尝试从内存里读取iPhone的价格，就会读取一个错误的价格
   - **缓存一致性**问题：1号核心和2号核心的缓存，此时是**不一致**的
3. **同步**机制能够达到的目标
   - **写传播**（Write **Propagation**）
     - 在一个CPU核心里面的Cache数据更新，必须能够**传播**到其他对应节点的**Cache Line**里
   - **事务串行化**（Transaction Serialization）
     - 在一个CPU核心里面的读取和写入，在**其他节点**看起来，**顺序是一样**的

### 事务串行化
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-cache-coherence-2.jpg" width=800/>

1. 1号核心先把iPhone的价格改成5000，差不多时间，2号核心把iPhone的价格改成6000，这两个修改会传播到3号核心和4号核心
2. 3号核心先收到2号核心的写传播，再收到1号核心的写传播；4号核心刚好相反
   - 虽然**写传播**做到了，但各个Cache里面的数据，是**不一致**的
3. 事务串行化：从1号到4号核心，都应该看到**相同顺序的数据变化**
   - 事务串行化的应用场景：**缓存一致性**、**数据库**
4. 要在**CPU Cache**里做到事务串行化，需要做到两点
   - 一个CPU核心对于数据的操作，需要**同步**通信给其他CPU核心
   - 如果两个核心里有**同一个数据的Cache**，那么对于这个Cache数据的更新，需要有一个『**锁**』的机制

## 总线嗅探
1. 要解决**缓存一致性**问题，首先要解决的是**多个CPU核心之间的数据传播问题**
2. 常见的解决方案：**总线嗅探**（Bus Snooping）
   - 本质：把所有读写请求都通过**总线广播**给所有的CPU核心，各个CPU核心去**嗅探**这些请求，再根据**本地的情况**进行**响应**
3. **总线**是一种特别适合通过**广播**来进行数据传输的机制
4. 总线嗅探是**Intel CPU**进行**缓存一致性处理**的解决方案
5. 基于总线嗅探机制，可以分成很多种不同的**缓存一致性协议**，最常用的就是**MESI**协议（在**Pentium**时代，被引入到Intel CPU）

## MESI协议

### 写失效协议 -- Write Invalidate
1. **只有一个CPU核心负责写入数据**，其他核心，只是同步读取到这个写入
2. 在这个CPU核心写入Cache之后，会去**广播一个失效请求**告诉所有其他的CPU核心
3. 其他的CPU核心，只是去判断自己是否也有一个失效版本的Cache Block，然后把这个也**标记成失效**即可

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-write-invalidate.png" width=600/>

### 写广播协议 -- Write Broadcast
1. 把一个**写入请求广播**到所有的CPU核心，**同时更新**各个核心里的Cache
2. 优点：实现简单
3. 缺点：**占用更多的总线带宽**
   - **写失效**只需要告诉其他的CPU核心，哪一个内存地址的缓存失效了
   - **写广播**还需要把**对应的数据**传输给其他CPU核心

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-write-broadcast.png" width=600/>

### MESI协议
1. MESI协议，是一种**写失效**（Write **Invalidate**）协议
2. MESI协议，来自于对**Cache Line**的四个不同的**标记**
   - **M**：已修改（**Modified**） -- **脏**
     - **脏**：Cache Block里面的内容已经**更新**过，但还没有写回到主内存里面
   - **E**：独占（**Exclusive**） -- **干净**
   - **S**：共享（**Shared**） -- **干净**
   - **I**：已失效（**Invalidated**） -- **脏**
     - Cache Block里面的数据已经失效，**不可以相信**这个Cache Block里面的数据
3. 无论是**独占**状态还是**共享**状态，缓存里面的数据都是**干净**的
   - **干净**：Cache Block里面的数据和主内存里的数据是**一致**的
   - **独占**：对应的Cache Line只加载到了**当前CPU核**所拥有的Cache里
     - 此时，如果要向独占的Cache Block写入数据，可以**自由地写入**数据，而不需要告知其他CPU核心
   - **共享**：在**独占**状态下，如果收到一个来自于**总线**的**读取**对应缓存的请求，就会变成**共享**状态
     - 另一个CPU核心，也把对应的Cache Block，从内存加载到自己的Cache里
     - 在**共享**状态下，**同样的数据**在**多个CPU核心**的Cache里都有
       - 如果想要更新Cache里面的数据，不能直接修改
       - 需要先向所有的其他CPU核心**广播**一个请求，要求先把其他CPU核心里面的Cache，都变成**无效**状态
       - 然后再更新当前Cache里面的数据
     - 这个广播操作，一般叫作**RFO**（Request For **Ownership**），即获取当前对应Cache Block数据的**所有权**
   - 机制有点类似于**读写锁**
4. 整个MESI的状态，可以用一个**有限状态机**表示它的状态流转
   - 对于不同状态**触发的事件操作**，可能来自于**当前CPU核心**，也可能来自**总线里其他CPU核心广播出来的信号**

<!-- <img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-mesi-state-machine.jpg" width=800/> -->