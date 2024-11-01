---
title: Python - Coroutine
mathjax: true
date: 2024-09-02 00:06:25
cover: https://python-1253868755.cos.ap-guangzhou.myqcloud.com/python-coroutine.png
categories:
  - Python
tags:
  - Python
---

# 基础

1. 协程是实现**并发编程**的一种方式
2. 多**线程**/多**进程**模型，是解决并发问题的经典模式
   - **C10K** - 线程/进程上下文切换占用大量资源
3. Nginx **Event loop**
   - 启动一个**统一**的调度器，让调度器来**决定**一个时刻去运行哪个任务
   - 节省了多线程中**启动线程**、**管理线程**、**同步锁**等各种开销
   - 相比于 Apache，用更低的资源支持更多的并发连接
4. **Callback hell** - JavaScript
   - 继承了 **Event loop** 的优越性，同时还提供 **async / await** 语法糖，解决了**执行性**和**可读性**共存的难题
   - **协程**开始崭露头角，尝试使用 **Node.js** 实现后端
5. Python 3.7 提供基于 **asyncio** 的 **async / await** 方法

<!-- more -->

# 同步

> 简单实现

```python
import time


def crawl_page(url):
    print('crawling {}'.format(url))
    sleep_time = int(url.split('_')[-1])
    time.sleep(sleep_time)
    print('OK {}'.format(url))


def main(urls):
    for url in urls:
        crawl_page(url)


main(['url_1', 'url_2', 'url_3', 'url_4'])
```

> async / await - 用**异步**接口实现了**同步**

```python
import asyncio


async def crawl_page(url):
    print('crawling {}'.format(url))
    sleep_time = int(url.split('_')[-1])
    await asyncio.sleep(sleep_time)
    print('OK {}'.format(url))


async def main(urls):
    for url in urls:
        c = crawl_page(url)
        print(type(c))  # <class 'coroutine'>, won't be executed
        await c  # execute coroutine


asyncio.run(main(['url_1', 'url_2', 'url_3', 'url_4']))
```

1. **asyncio** - 包含了大部分实现协程所需的魔法工具
2. **async** - 声明**异步函数**
   - **调用异步函数**，可以得到一个**协程对象**（coroutine object）
3. 协程**执行**
   - 通过 **await** 调用
     - 与 Python 正常执行是一样的，即程序会**阻塞**在这里
     - 进入被调用的协程函数，执行完毕后再继续
   - **asyncio.create_task** - 创建任务
   - **asyncio.run** 触发运行
     - 从 Python 3.7 引入，简化 Python **协程编程**，不必理会 **Event loop** 的定义和使用
     - 编码规范 - **asyncio.run(main())** 作为主程序的**入口函数**，在程序运行周期内，**只调用一次** asyncio.run

# 并发

> asyncio.**create_task**

```python
import asyncio


async def crawl_page(url):
    print('crawling {}'.format(url))
    sleep_time = int(url.split('_')[-1])
    await asyncio.sleep(sleep_time)
    print('OK {}'.format(url))


async def main(urls):
    tasks = [asyncio.create_task(crawl_page(url)) for url in urls]
    for task in tasks:  # wait for all tasks to complete
        await task  # task is a coroutine object


asyncio.run(main(['url_1', 'url_2', 'url_3', 'url_4']))
```

> asyncio.**gather**

```python
import asyncio


async def crawl_page(url):
    print('crawling {}'.format(url))
    sleep_time = int(url.split('_')[-1])
    await asyncio.sleep(sleep_time)
    print('OK {}'.format(url))


async def main(urls):
    tasks = [asyncio.create_task(crawl_page(url)) for url in urls]
    await asyncio.gather(*tasks)  # Return a future aggregating results from the given coroutines/futures


asyncio.run(main(['url_1', 'url_2', 'url_3', 'url_4']))
```

1. `*tasks` 为**解包列表**，将**列表**变成**函数的参数**
2. `**dict` 为**解包字典**，将字典变成**函数的参数**

# 协程运行时

```python
import asyncio


async def worker_1():
    print('worker_1 start')
    await asyncio.sleep(1)
    print('worker_1 done')


async def worker_2():
    print('worker_2 start')
    await asyncio.sleep(2)
    print('worker_2 done')


async def main():
    print('before await')
    await worker_1()
    print('awaited worker_1')
    await worker_2()
    print('awaited worker_2')


asyncio.run(main())

# Output:
# before await
# worker_1 start
# worker_1 done
# awaited worker_1
# worker_2 start
# worker_2 done
# awaited worker_2
```

```python
import asyncio


async def worker_1():
    print('worker_1 start')
    await asyncio.sleep(1)
    print('worker_1 done')


async def worker_2():
    print('worker_2 start')
    await asyncio.sleep(2)
    print('worker_2 done')


async def main():
    task1 = asyncio.create_task(worker_1())
    task2 = asyncio.create_task(worker_2())
    print('before await')
    await task1
    print('awaited worker_1')
    await task2
    print('awaited worker_2')


asyncio.run(main())

# Output:
# before await
# worker_1 start
# worker_2 start
# worker_1 done
# awaited worker_1
# worker_2 done
# awaited worker_2
```

> 详细过程

1. **asyncio.run(main())** - 程序进入 main() 函数，**事件循环**开启
2. **asyncio.create_task** - task1 和 task2 被创建，**进入事件循环，等待运行**
3. **await task1**
   - 用户选择从当前的**主任务**切出，**事件调度器**开始调度 worker_1
   - worker_1 开始运行，直到运行到 `await asyncio.sleep(1)`，**从当前任务切出**
   - 事件调度器开始调度 worker_2
4. worker_2 开始运行，直到运行到 `await asyncio.sleep(2)`，**从当前任务切出**
5. 所有事件的运行时间，都在 **1ms ~ 10 ms** 之间，此时，事件调度器**暂停调度**
6. 1 秒后，worker_1 的 sleep 完成，事件调度器将**控制权**重新传给 task1，在 task1 完成后，从**事件循环**中退出
7. `await task1` 完成，事件调度器将**控制权**传给**主任务**，然后主任务会在 `await task2` 继续等待
8. 2 秒后，worker_2 的 sleep 完成，事件调度器将**控制权**重新传给 task2，在 task2 完成后，从**事件循环**中退出
9. 主任务输出 `awaited worker_2`，协程**全任务**结束，**事件循环结束**

> 异常 + 超时限制

```python
import asyncio


async def worker_1():
    await asyncio.sleep(1)
    return 1


async def worker_2():
    await asyncio.sleep(2)
    return 2 / 0


async def worker_3():
    await asyncio.sleep(3)
    return 3


async def main():
    task_1 = asyncio.create_task(worker_1())
    task_2 = asyncio.create_task(worker_2())
    task_3 = asyncio.create_task(worker_3())

    await asyncio.sleep(2)
    task_3.cancel()

    res = await asyncio.gather(task_1, task_2, task_3, return_exceptions=True)
    print(res)  # [1, ZeroDivisionError('division by zero'), CancelledError()]


asyncio.run(main())
```

1. `return_exceptions=False` - 错误会完整地抛出到**执行层**，需要 **try except** 捕捉
2. 其它还**未被执行的任务**会被全部取**消掉**

# 生产者消费者

```python
import asyncio
import random


async def consumer(queue, identity):
    while True:
        val = await queue.get()
        print('{} get a val: {}'.format(identity, val))
        await asyncio.sleep(1)


async def producer(queue, identity):
    for i in range(5):
        val = random.randint(1, 10)
        await queue.put(val)
        print('{} put a val: {}'.format(identity, val))
        await asyncio.sleep(1)


async def main():
    queue = asyncio.Queue()  # golang channel like

    consumer_1 = asyncio.create_task(consumer(queue, 'consumer_1'))
    consumer_2 = asyncio.create_task(consumer(queue, 'consumer_2'))

    producer_1 = asyncio.create_task(producer(queue, 'producer_1'))
    producer_2 = asyncio.create_task(producer(queue, 'producer_2'))

    await asyncio.sleep(10)
    consumer_1.cancel()
    consumer_2.cancel()

    await asyncio.gather(consumer_1, consumer_2, producer_1, producer_2, return_exceptions=True)


asyncio.run(main())
```

# 小结

1. 协程 vs 线程
   - 协程为**单线程**
   - 协程由用户决定，在哪里交出**控制权**，切换到下一个任务
2. 协程的写法更**简洁清晰**
   - async / await + create_task - 完全胜任中小级别的并发需求
3. 需要深刻理解**事件循环**
