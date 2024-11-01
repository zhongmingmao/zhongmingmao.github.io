---
title: Python - Futures
mathjax: true
date: 2024-09-03 00:06:25
cover: https://python-1253868755.cos.ap-guangzhou.myqcloud.com/python-futures.webp
categories:
  - Python
tags:
  - Python
---

# 并行 vs 并发

1. 并发（**Concurrency**） - 在某个特定的时刻，只允许有一个操作发生，线程和任务之间会相互切换，**交替运行**
2. 并行（**Parallelism**） - 在**同一时刻**，有多个操作**同时进行**
3. Python 中有两种并发形式 - **threading** + **asyncio**

<!-- more -->

> threading

1. 操作系统知道每个**线程**的所有信息，在适当的时候做**线程切换**
2. 优点 - 代码**易于编写**，程序员不需要做任何切换操作
3. 缺点 - 容易出现 **race condition**

> asyncio

1. 主程序想要切换任务时，**必须得到此任务可以切换的通知**
2. 避免了 **race condition** 的情况

> 场景

1. **并发**通常用于 **IO 密集**的场景 - **Web 应用**
2. **并行**通常用于 **CPU 密集**的场景 - **MapReduce**

# 线程池 vs 进程池

> 大部分时间是浪费在 **IO 等待**上

![image-20241101140013655](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241101140013655.png)

> 多线程（**并发**） - 16.8s -> 3.5s

![image-20241101141145372](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241101141145372.png)

```python
   with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        executor.map(download_one, sites)
```

1. 创建一个**线程池**，总共 5 个线程
   - 线程数**并非越多越好** - 线程的创建、维护和删除都会存在一定的**开销**
2. `executor.map` - 与内置的 `map` 类似，表示对 sites 中的每一个元素，**并发**地调用函数

> 多线程（**并行**） - 3.5s -> 2.1s

![image-20241101141914896](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241101141914896.png)

```python
    with concurrent.futures.ProcessPoolExecutor() as executor:
        executor.map(download_one, sites)
```

1. 创建**进程池**，使用多个进程**并行**地执行程序
2. 一般省略 **max_workers** 参数，默认为 **CPU 数**

# Futures

1. **Futures** 模块，位于 **concurrent.futures** 和 **asyncio** 中，表示**带有延迟**的操作
2. Futures 会将处于**等待状态**的操作包裹起来放到队列中
   - 这些操作的**状态**可以随时查询，操作的结果或异常，可以在操作完成后获取
3. 一般不需要去考虑如何创建 Futures，而是考虑怎么调度这些 Futures 的执行
   - 当执行 `executor.submit(func)` 时，会安排里面的 func 函数执行，并返回创建好的 Future 实例

![image-20241101144312958](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241101144312958.png)

| Method                | Desc                                                         |
| --------------------- | ------------------------------------------------------------ |
| done()                | Return True if the future is done - non-blocking             |
| add_done_callback(fn) | Add a callback to be run when the future becomes done        |
| result()              | Return the result this future represents                     |
| as_completed          | An iterator over the given futures that yields each as it completes |

![image-20241101144710533](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241101144710533.png)

1. `executor.submit` 将任务放进 future 队列，**等待执行**
2. `as_completed` 在 future **完成后**输出结果
   - future 列表中每个 future 完成的顺序，与在列表中的**顺序并一定完全一致**
   - 取决于**系统调度**和**每个 future 的执行时间** - 有一定的**随机性**

# GIL

1. 在**同一时刻**，Python 主程序只允许有**一个线程**执行

2. Python 的**并发**，是通过**切换多线程**完成的

3. GIL - **全局解释器锁**

   - Python 的**解释器**并不是**线程安全**的
   - 为了解决由此带来的 **race condition** 问题，Python 便引入了**全局解释器锁**
     - **在同一时刻，只允许一个线程执行**
   - 在执行 **IO** 操作时，如果一个线程被**阻塞**了，则 GIL 也会被**释放**，从而让**另一个线程**能够**继续执行**

   
