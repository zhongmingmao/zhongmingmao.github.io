---
title: Python - GC
mathjax: true
date: 2024-09-06 00:06:25
cover: https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241101191222475.png
categories:
  - Python
tags:
  - Python
---

# 计数引用

1. Python 中**一切皆对象**，**变量**的本质是**对像的指针**
2. 当一个对象的**引用计数**（指针数）为 **0** 时，说明该对象**不可达**，成为**垃圾**，需要被**回收**

<!-- more -->

![image-20241101192238370](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241101192238370.png)

1. 调用函数 `func()`，创建列表 a 后，**内存占用**迅速增加，在函数调用结束后，内存恢复正常
2. 函数内部声明的列表 a 是**局部变量**，在**函数返回**后，局部变量的引用会**被注销**
   - 列表 a 所指向的对象的**引用数**为 **0**，Python 会执行 **GC**，回收内存

> 全局变量 - **global**

![image-20241101192826413](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241101192826413.png)

> 将生成的列表返回，在主程序中接收

![image-20241101193003971](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241101193003971.png)

# 内部实现

```python
import sys

a = []

print(sys.getrefcount(a))  # 2 = a + getrefcount


def func(a):
    print(sys.getrefcount(a))  # 4 = a + getrefcount + func call stack + func args


func(a)

print(sys.getrefcount(a))  # 2 = a + getrefcount
```

1. `sys.getrefcount` 本身也会**引入一次计数**
2. 在**函数调用**发生的时候，会产生两次额外的引用 - **函数栈** + **函数参数**

```python
import sys

a = []
print(sys.getrefcount(a))  # 2

b = a
print(sys.getrefcount(a))  # 3

c = b
d = b
e = c
f = e
g = d
print(sys.getrefcount(a))  # 8
```

# 手动 GC

```python
import gc
import os
import psutil


def show_memory_info(hint):
    pid = os.getpid()
    p = psutil.Process(pid)

    info = p.memory_full_info()
    memory = info.uss / 1024. / 1024
    print('{} memory used: {} MB'.format(hint, memory))


show_memory_info('initial')
a = [i for i in range(10_000_000)]
show_memory_info('after a created')

del a  # delete reference to the list
gc.collect()  # force garbage collection, clear unreferenced memory, but not always work

show_memory_info('finish')
# print(a)  # NameError: name 'a' is not defined
```

1. del - 删除对象的**引用**
2. **gc.collect()** - 清除没有引用的对象，手动启动 GC，类似于 Java System.gc()

# 循环引用

![image-20241101212829158](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241101212829158.png)

> 手动 GC

![image-20241101213131272](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241101213131272.png)

# GC 算法

1. Python 使用**标记清除**和**分代回收**算法，来启用针对**循环引用**的自动 GC
2. 对于一个**有向图**，从某一个节点出发**遍历**，标记所经过的所有节点
   - 在遍历结束后，所有未被标记的节点，称为**不可达节点** - 可被回收
   - **遍历全图**，非常浪费性能
     - 在 Python GC 中，使用**双向链表**维护一个数据结构
     - 并且只考虑**容器类**的对象，只有容器类的对象才有可能产生**循环引用**
3. Python 将所有对象分为 3 代
   - 刚刚创立的对象为第 0 代
   - 经历过 1 次 GC 后**依然存活**的对象，会一次从上一代挪到**下一代**
   - 每一代启动 GC 的**阈值**，是可以单独设置的
     - 当**新增对象**减去**删除对象**达到对应的阈值，则会对这一代对象启动 GC
   - 思想
     - 新生对象更可能被回收，存活更久的对象有更高的概率继续存活 - 节省计算量，提升性能

![](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241101191222475.png)

# 内存泄露

> **show_refs()** - 生成清晰的**引用关系图**

```python
import objgraph

a = [1, 2, 3]
b = [4, 5, 6]

a.append(b)
b.append(a)

objgraph.show_refs([a])
```

![objgraph-x5nfjjls](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/objgraph-x5nfjjls.png)

> **show_backrefs()** - 推荐 

![objgraph-1kp9o2tt](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/objgraph-1kp9o2tt.png)

# 小结

1. GC 是 Python **自带**的机制，用于自动释放不再使用的内存空间
2. **引用计数**是最简单的实现，遇到**循环计数**时，需要通过**不可达判定**，来确定是否可以回收
3. Python 的**自动 GC 算法**包括**标记清除**和**分代回收**，主要针对**循环引用**的 GC

