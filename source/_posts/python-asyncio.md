---
title: Python - Async IO
mathjax: true
date: 2024-09-04 00:06:25
cover: https://python-1253868755.cos.ap-guangzhou.myqcloud.com/python-asyncio.webp
categories:
  - Python
tags:
  - Python
---

# 线程局限

1. 多线程在运行过程中容易被**打断**，有可能会出现 **race condition** 的情况
2. **线程切换**本身存在**开销**，不能无限增加**线程数**

<!-- more -->

# Sync vs Async

1. Sync - 操作**顺序执行**，前面**阻塞**后面
2. Async - 不同操作间可以**交替执行**，如果其中一个操作**被阻塞**了，程序**不会等待**，而是会找出**可执行的操作**继续执行

# 原理

> **CSP** - Communicating sequential processes

1. **asyncio** 与 Python 程序一样，都是**单线程**的
2. **asyncio** 只有一个**主线程**，但可以进行**多个不同的任务**（特殊的 **Future** 对象），这些不同的任务被 **Event loop** 控制
3. 假设任务只有两个状态 - **预备**状态 / **等待**状态
   - **预备**状态 - 任务目前**空闲**，随时准备运行
   - **等待**状态 - 任务已经**运行**，但在**等待外部操作**完成（如 IO）
4. Event loop 维护**两个任务列表**，分别对应**预备**状态和**等待**状态
   - **选取**预备状态的一个任务（与任务的等待时长、占用资源等相关），使其**运行**，直到该任务将**控制权**交还给 Event loop 为止
     - 当任务将控制权**交还**给 Event loop 时，Event loop 会根据其**是否完成**，将任务放到**预备状态列表**或者**等待状态列表**
   - 然后**遍历**等待状态列表的任务，查看是否完成
     - 如果**完成**，将其放到**预备状态**的列表
     - 如果**未完成**，继续放在**等待状态**的列表
   - 原先在**预备**状态列表的任务**位置仍旧不变**，是因为它们还**未运行**
5. asyncio 的**任务运行时**不会被外部的一些因素**打断**，因此不会出现 **race condition**，无需担心**线程安全**的问题 - **CSP**
   - 在 **IO 密集**的场景下，**asyncio** 比**多线程**的**运行效率更高**
     - 因为 **asyncio** 内部**任务切换的开销**，远低于**线程切换的开销**
   - 并且 asyncio 可以开启非常多的**任务数量** - 类似于 Goroutine

# 用法

![image-20241101170155588](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241101170155588.png)

1. `async with` 是 asyncio 的最新写法 - 表示该语句/函数是 **non-blocking**
2. 如果任务执行的过程中**需要等待**，则将该任务放入**等待状态列表**中，然后继续执行**预备状态列表**中的任务
3. **asyncio.run** 是 asyncio 的 **root call**，表示拿到 Event loop，运行任务，直到结束，最后关闭该 Event loop

```python
    tasks = [asyncio.create_task(download_one(site)) for site in sites]
    await asyncio.gather(*tasks)
```

1. `asyncio.create_task(coro)` 表示对**协程** coro 创建一个**任务**（特殊的 **Future** 对象），安排其执行
2. `asyncio.gather` 表示在 Event loop 中运行所有任务

# 缺陷

1. 要发挥 asyncio 的能力，需要对应的 **Python 库**支持
   - requests 不支持 asyncio，而 **aiohttp** 支持
2. 使用 **asyncio**，在**任务调度**方面有更大的**自主权**，但**容易出错**

# 多线程 vs Async IO

> asyncio 是**单线程**，但其内部的 **Event loop** 机制，可以**并发**地运行**多个不同的任务**，且比多线程**更自主**

```python
if io_bound:
    if io_slow:
        print('Use Asyncio')
    else:
        print('Use multi-threading')
else if cpu_bound:
    print('Use multi-processing')
```

1. 对于 **CPU 密集**型任务，使用**多线程**是**无效**的 - 由于 **GIL** 的限制 - 请使用**多进程**
   - Python **多线程**的本质 - 多个线程**互相切换**，但由于 **GIL** 的限制，在**同一时刻**仍然**只允许一个线程**运行
     - 使用**多线程**和使用**单一主线程**，对于 **CPU** 密集型任务来说，本质上来说**没有区别**
     - 反而在很多情况下，因为线程切换带来的额外损耗会降低程序性能
   - 使用**多进程**，是**允许多个进程间并行**的，能提高程序性能
2. 对于 **IO 密集**型任务，如果想要加速，优先选择**多线程**或者 **asyncio**，因为瓶颈在 IO 上，而非 CPU 上
   - 使用**多进程**也行，但**完全没有必要**
   - asyncio 可以支持比多线程更多的**连接数**
