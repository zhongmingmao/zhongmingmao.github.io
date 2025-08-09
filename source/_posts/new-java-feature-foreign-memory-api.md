---
title: New Java Feature - Foreign Memory API
mathjax: true
date: 2025-01-16 00:06:25
cover: https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/Java-Foreign-Function-and-Memory-API.png
categories:
  - Java
  - Feature
tags:
  - Java
  - Java Feature
---

# 概述

1. 在讨论**代码性能**的时候，**内存的使用效率**是一个绕不开的话题 - **Flink/Netty**
2. 为了避免 JVM GC **不可预测的行为**以及**额外的性能开销**，一般倾向于使用 **JVM 之外的内存**来存储和管理数据 - **堆外数据** - **off-heap data**
3. 使用**堆外存储**最常用的办法，是使用 **ByteBuffer** 来分配直接存储空间 - **direct buffer**
   - JVM 会**尽最大努力**直接在 **direct buffer** 上执行 **IO** 操作，避免数据在**本地**和 **JVM** 之间的拷贝
4. **频繁的内存拷贝**是**性能**的**主要障碍**之一
   - 为了**极致的性能**，应用程序通常会尽量**避免内存的拷贝**
   - 理想的情况下，**一份数据只需要一份内存空间** - 即**零拷贝**

<!-- more -->

# ByteBuffer

> 使用 ByteBuffer 来分配直接存储空间

```java
public static ByteBuffer allocateDirect(int capacity);
```

1. ByteBuffer 所在的 Java 包是 **java.nio**，ByteBuffer 的**设计初衷**是用于**非阻塞编程**
2. ByteBuffer 是**异步编程**和**非阻塞编程**的核心类，几乎所有的 Java 异步模式或者非阻塞模式的代码，都要直接或者间接地使用 ByteBuffer 来管理数据
3. **非阻塞**和**异步编程模式**的出现，起始于对**阻塞式文件描述符**（包括**网络套接字**）**读取性能**的不满
   - 诞生于 **2002** 年的 **ByteBuffer**，其最初的设想也主要是用来解决当时**文件描述符的读写性能**

> 站在现在的视角重新审视该类的设计，会发现两个主要**缺陷**

1. 缺陷 1 - 没有**资源释放**的接口
   - 一旦一个 **ByteBuffer 实例化**，它**占用内存的释放**，会**完全依赖** **JVM GC**
   - 使用 direct buffer 的应用，往往需要把所有**潜在的性能**都挤压出来
   - 而依赖于 **JVM GC** 的资源回收方式，并不能满足像 **Netty** 这样的类库的理想需求
2. 缺陷 2 - **存储空间尺寸的限制**
   - ByteBuffer 的存储空间的大小，是使用 Java 的 **int** 来表示的，最多只有 **2G** - 一个无意带来的缺陷
   - 在**网络编程**的环境下，这并不是一个问题，可是**超过 2G 的文件**，一定会**越来越多**
   - **2G** 以上的文件，**映射**到 **ByteBuffer** 上的时候，就会出现**文件过大**的问题

> 合理的改进 - **重造轮子** - 外部内存接口

# 外部内存接口

1. 外部内存接口沿袭了 ByteBuffer 的**设计思路**，但使用了**全新的接口布局**
2. 分配一段外部内存，并且存放 4 个字母 A

```java
try (ResourceScope scope = ResourceScope.newConfinedScope()) {
    MemorySegment segment = MemorySegment.allocateNative(4, scope);
    for (int i = 0; i < 4; i++) {
        MemoryAccess.setByteAtOffset(segment, i, (byte)'A');
    }
}
```

1. **ResourceScope** 定义了**内存资源**的**生命周期管理机制**，实现了 **AutoCloseable** 接口，可以使用 **try-with-resource** 来**及时释放**掉它管理的**内存** - 缺陷 1
2. **MemorySegment** 用于定义和模拟一段**连续的内存区域**，而 **MemoryAccess** 用于定义对 **MemorySegment** 执行**读写操作**
   - 在外部内存接口的设计里，把**对象表达**和**对象操作**，拆分成两个类
   - 这两类的**寻址数据类型**，使用的是 **long** - 缺陷 2

