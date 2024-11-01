---
title: Python - With
mathjax: true
date: 2024-09-07 00:06:25
cover: https://python-1253868755.cos.ap-guangzhou.myqcloud.com/python-with.webp
categories:
  - Python
tags:
  - Python
---

# 场景

> 资源是**有限**的，使用过后需要**释放**，否则会造成**资源泄露**

## File

```python
for x in range(10_000_000):
    f = open('test.txt', 'w')  # OSError: [Errno 24] Too many open files
    f.write('hello')
```

<!-- more -->

> context manager 帮助**自动分配并释放资源** - with 语句

```python
for x in range(10_000_000):
    with open('test.txt', 'w') as f:  # This will open and close the file 10_000_000 times
        f.write('hello')
```

> try - finally

```python
f = open('test.txt', 'w')
try:
    f.write('hello')
finally:
    f.close()  # close the file even if an exception occurs
```

## Lock

> try - finally

```python
import threading

some_lock = threading.Lock()
some_lock.acquire()
try:
    ...
finally:
    some_lock.release()
```

> with

```python
import threading

some_lock = threading.Lock()
with some_lock:  # releases the lock when the block is exited
    ...
```

# 实现

## 类

> 基于**类**的上下文管理器

![image-20241102012321875](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241102012321875.png)

> 发生异常

![image-20241102012631995](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241102012631995.png)

## 生成器

> 基于**生成器**的上下文管理器

![image-20241102013504099](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241102013504099.png)

1. 使用 **contextlib.contextmanager** 来定义基于**生成器**的上下文管理器，用来支持 **with** 语句
2. **file_manager()** 函数是一个**生成器**
   - 执行 **with** 语句时，便会打开文件，并返回文件对象
   - 当 with 语句执行完毕后，执行 **finally block** 中关闭文件操作

## 选择

1. 基于**类**的上下文管理器和基于**生成器**的上下文管理器，两者在**功能**上是**一致**的
2. 基于**类**的上下文管理器**更加弹性**，适用于**大型系统**
3. 基于**生成器**的上下文管理器**更加灵活**，适用于**中小型程序**

