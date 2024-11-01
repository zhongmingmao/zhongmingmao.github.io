---
title: Python - GIL
mathjax: true
date: 2024-09-05 00:06:25
cover: https://python-1253868755.cos.ap-guangzhou.myqcloud.com/python-gil.jpg
categories:
  - Python
tags:
  - Python
---

# Cpu bound

> 单线程 - 2.555494917

```python
import time


def CountDown(n):
    while n > 0:
        n -= 1


start = time.perf_counter()
n = 100_000_000
CountDown(n)
end = time.perf_counter()
print(f"Time elapsed: {end - start} seconds")  # Time elapsed: 2.555494917 seconds
```

<!-- more -->

> 多线程 - 2.477930167

```python
import time
from threading import Thread


def CountDown(n):
    while n > 0:
        n -= 1


start = time.perf_counter()

n = 100_000_000
t1 = Thread(target=CountDown, args=[n // 2])
t2 = Thread(target=CountDown, args=[n // 2])
t1.start()
t2.start()
t1.join()
t2.join()

end = time.perf_counter()
print(f"Time elapsed: {end - start} seconds")  # Time elapsed: 2.477930167 seconds
```

# GIL

> **引用计数**导致的 **race condition**

1. Python 线程，封装了底层的 **OS 线程**，完全受 OS 管理，与 C++ 线程本质上是不同的抽象，但底层是一样的
2. GIL 是最流行的 Python 解释器 **CPython** 中的一个技术术语 - **全局解释器锁**，本质上是类似 OS 的 **Mutex**
   - 每个 Python 线程，在 CPython 解释器中执行时，都会锁住自己的线程，阻止其它线程执行
   - CPython **轮流执行** Python 线程 - 交错执行，模拟并行
   - CPython 使用**引用计数**来管理内存
     - 所有 Python 脚本中创建的实例，都会有一个引用计数，记录有多少**指针**指向它
     - 当引用计数为 **0** 时，**自动释放内存**

```python
import sys

a = []
b = a
print(sys.getrefcount(a))  # 3 = a + b + getrefcount
```

1. 如果没有 GIL，可能会有两个 Python 线程**同时引用**了 a，造成**引用计数**的 **race condition** - 最终只增加 **1**
2. 内存被**污染**
   - 第一个 Python 线程结束时，会把引用技术减少 1，此时已达到**释放内存**的条件
   - 第二个 Python 线程再尝试访问 a 时，就找不到有效的内存了

> **CPython** 引入 **GIL** 的主要原因

1. 为了**规避**类似**内存管理**的复杂 **race condition** 问题
2. CPython 大量使用了 **C 语言库**，大部分都不是**原生线程安全**的

> 工作过程

![image-20241101182601764](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241101182601764.png)

1. Python 线程**轮流执行**，每个 Python 线程在开始执行前，都会**锁住** GIL，以**阻止**其它 Python 线程执行
2. 每个 Python 线程在执行完一段后（如遇到 **IO 阻塞**），会**释放** GIL ，允许别的线程开始利用资源
3. CPython 解释器会**轮询**检查 GIL 的锁住情况，每隔一段时间，CPython 会**强制**当前 Python线程去**释放** GIL

![image-20241101183303352](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241101183303352.png)

> 每个 Python 线程都是一个**循环**的封装 - **周期性检查**

```python
for (;;) {
    if (--ticker < 0) {
        ticker = check_interval;
    
        /* Give another thread a chance */
        PyThread_release_lock(interpreter_lock);
    
        /* Other threads may run now */
        PyThread_acquire_lock(interpreter_lock, 1);
    }

    bytecode = *next_instr++;
    switch (bytecode) {
        /* execute the next instruction ... */ 
    }
}
```

# 线程安全

> **GIL ≠ 线程安全**，因为可以**抢占**，不保证**原子性**

1. GIL 在**同一个时刻**，仅允许**一个 Python 线程**运行，但不会保证执行单元的**原子性**
2. 为了避免 Python 线程**饿死**，还提供了 **check interval** 的**抢占机制**

![image-20241101185258666](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241101185258666.png)

1. `n += 1` 并非线程安全，字节码对应**多个指令**（与 **JVM Class** 非常类似）
2. 多个指令是有可能**在中间被打断**的

> GIL 的设计，是为了方便 **CPython 解释器层面**的编写者，而非 **Python 应用层面**的程序员 - 用 **Lock** 等工具来保证线程安全

```python
import threading

n = 0
lock = threading.Lock()


def foo():
    global n
    with lock:
        n += 1
```

# 绕过

1. Python 如果不需要 **CPython 解释器**来执行，将不再受 **GIL** 限制
2. 很多**高性能**的应用场景都已经有了大量 **C 实现**的 Python 库，不受 GIL 影响 - 如 NumPy 的矩阵运算
3. 在大部分应用情况下，**不需要过多考虑 GIL**
   - 如果**多线程计算**成为**性能瓶颈**，一般都已经有 **Python 库**来解决这个问题
4. 思路
   - 绕过 **CPython**，使用 **JPython** 等其它实现
   - 将**关键性能代码**在 **C++/Rust** 中实现（不受 **GIL** 限制），然后提供给 Python 的调用接口
