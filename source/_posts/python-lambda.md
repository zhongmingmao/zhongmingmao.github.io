---
title: Python - Lambda
mathjax: true
date: 2024-08-25 00:06:25
cover: https://python-1253868755.cos.ap-guangzhou.myqcloud.com/python-lambda.png
categories:
  - Python
tags:
  - Python
---

# 基础

> **匿名函数**的关键字为 **lambda**

```python
lambda argument1, argument2,... argumentN : expression
```

```python
square = lambda x: x ** 2

print(type(square))  # <class 'function'>
print(square(5))  # 25
```

<!-- more -->

1. **lambda** 是一个表达式（**expression**），而非一个语句（**statement**）
   - 表达式 - 用一系列公式去**表达**
   - 语句 - **完成某些功能**
2. lambda 可以用在**列表内部**，而常规函数 **def** 不能
3. lambda 可以用作**函数参数**，而常规函数 **def** 不能
4. 常规函数 **def** 必须通过其**函数名**被调用，因此必须**首先被定义**
   - **lambda** 是一个**表达式**，返回的**函数对象**不需要名字，即**匿名函数**
5. **lambda** 的主体只有**一行**的**简单表达式**，并不能扩展成**多行**的代码块
   - **lambda** 专注于**简单**任务，而常规函数 **def** 负责更**复杂**的多行逻辑

```python
y = [(lambda x: x * x)(x) for x in range(10)]
print(y)  # [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]
```

```python
l = [(1, 20), (3, 0), (9, 10), (2, -1)]

l.sort(key=lambda x: x[1])  # sort by second element
print(l)  # [(2, -1), (3, 0), (9, 10), (1, 20)]
```

> lambda  - 简化代码**复杂度**，提高代码**可读性**

```python
squared = map(lambda x: x ** 2, [1, 2, 3, 4, 5])
for e in squared:
    print(e)  # 1 4 9 16 25
```

# 函数式编程

1. 函数式编程，即代码中的**每一块**都是不可变的（**immutable**），都由纯函数（**pure function**）的形式组成
2. 纯函数 - 函数本身**相互独立**，**互不影响**，对于**相同的输入**，总会得到**相同的输出**，并且**没有任何副作用**
3. 优点 - **纯函数**和**不可变性**使得程序**更加健壮**，并且更加**易于调试和测试**
4. 缺点 - **限制多 + 难写**
5. Python 并非一门函数式编程语言，而 **Scala** 是，Python 仅提供一些**函数式编程的特性**

## map

> map(function, iterable) - 对 iterable 中的每个元素，都应用 function 函数，最后返回一个可遍历的**集合**

```python
l = [1, 2, 3, 4, 5]
l = map(lambda x: x * 2, l)
print(type(l))  # <class 'map'>
print(list(l))  # [2, 4, 6, 8, 10]

s = (1, 2, 3, 4, 5)
s = map(lambda x: x * 2, s)
print(type(s))  # <class 'map'>
print(tuple(s))  # (2, 4, 6, 8, 10)
```

> **map** / for / **list comprehension**
> map() **最快**，因为直接由 **C** 语言编写，运行时不需要通过 Python 解释器**间接调用**，并且内部做了**诸多优化**

```
$ python3 -m timeit -s 'xs=range(1000000)' 'map(lambda x: x*2, xs)'
5000000 loops, best of 5: 77.3 nsec per loop

$ python3 -m timeit -s 'xs=range(1000000)' '[x * 2 for x in xs]'
10 loops, best of 5: 30.7 msec per loop

$ python3 -m timeit -s 'xs=range(1000000)' 'l = []' 'for i in xs: l.append(i * 2)'
5 loops, best of 5: 42 msec per loop
```

## filter

> filter(function, iterable) - 对 iterable 中的每个元素，都使用 function 判断，并返回 True 或者 False
> 将返回 **True** 的元素组成一个新的**可遍历**的**集合**

```python
l = [1, 2, 3, 4, 5]
l = filter(lambda x: x % 2 == 0, l)
print(type(l))  # <class 'filter'>
print(list(l))  # [2, 4]
```

## reduce

> reduce(function, iterable) - 对集合进行一些**累积**操作
> 对 iterable 中的**每个元素**以及**上一次调用后的结果**，应用 function 进行计算，最后返回一个**单独的数值**

```python
from functools import reduce

l = [1, 2, 3, 4, 5]
sum = reduce(lambda x, y: x + y, l)
print(type(sum))  # <class 'int'>
print(sum)  # 15
```



