---
title: Python - Iterator + Generator
mathjax: true
date: 2024-09-01 00:06:25
cover: https://python-1253868755.cos.ap-guangzhou.myqcloud.com/python-iterator-generator.webp
categories:
  - Python
tags:
  - Python
---

# 迭代器

1. Python 中一切皆对象，对象的抽象就是类，对象的**集合**为**容器**（列表、元组、字典、集合）
2. **所有的容器**都是可迭代的（**iterable**）
3. 迭代器（**iterator**）提供了一个 **next** 的方法
   - 得到容器的**下一个对象**，或者得到一个 **StopIteration** 的错误
4. **可迭代对象**，通过 **iter()** 函数返回一个迭代器（**iterator**），再通过 **next()** 函数实现遍历
   - `for in` 语句**隐式化**了该**迭代过程**

<!-- more -->

> 判断一个对象是否可迭代 - **iter(obj)** 或者 **isinstance(obj, Iterable)**

```python
from typing import Iterable


def is_iterable(param):
    try:
        iter(param)
        return True
    except TypeError:
        return False


params = [
    1234,  # False
    '1234',  # True
    [1, 2, 3, 4],  # True
    set([1, 2, 3, 4]),  # True
    {1: 1, 2: 2, 3: 3, 4: 4},  # True
    (1, 2, 3, 4)  # True
]

for param in params:
    print('{} is iterable? {}'.format(param, is_iterable(param)))
    print('{} is iterable? {}'.format(param, isinstance(param, Iterable)))
```

# 生成器

1. 生成器在很多**常用语言**中，并没有对应的**模型**
2. 生成器是**懒人版本的迭代器**

![image-20241031180924200](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241031180924200.png)

1. 在 Python 中，生成器的写法为使用**小括号** - `(i for i in range(100_000_000))`
2. **生成器**不会像**迭代器**那样占用**大量内存**，只有在**被使用时才会调用**
3. 生成器在**初始化**的过程中，**不需要运行一次生成操作**，开销更小

> 无限生成

![image-20241031182147089](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241031182147089.png)

1. 程序运行到 **yield** 时，程序会**暂停**在这里，然后**跳出**，跳到 **next()** 函数，后续的表达式 `i ** k` 即 **next()** 函数的**返回值**
2. 每当 **next(gen)** 函数被调用时，**暂停**的程序**恢复**，从 yield **向下继续执行**
   - **局部变量** i 并**没有被清除掉**，而是会**继续累加**
3. **迭代器**是一个**有限集合**，而**生成器**是一个**无限集合**

> 给定一个 list 和指定数字，寻找数字在 list 中的位置

> 常规版本

```Python
def index_normal(l, target):
    result = []
    for i, num in enumerate(l):
        if num == target:
            result.append(i)
    return result


print(index_normal([1, 6, 2, 4, 5, 2, 8, 6, 3, 2], 2))  # [2, 5, 9]
```

> 生成器版本 - 用**更少、更清晰的代码**实现**相同**的功能 - 少用**魔术体操**，反而增加阅读难度

```python
def index_generator(l, target): # 返回一个生成器，方法体为生成逻辑
    for i, num in enumerate(l):
        if num == target:
            yield i


generator = index_generator([1, 6, 2, 4, 5, 2, 8, 6, 3, 2], 2)
print(type(generator))  # <class 'generator'>
print(list(generator))  # [2, 5, 9]
```

> 给定两个序列，判定第一个是不是第二个的**子序列**

> 优雅版本

```python
def is_subsequence(a, b):
    b = iter(b)
    print(type(b))  # <class 'list_iterator'>
    return all(i in b for i in a)


print(is_subsequence([1, 3, 5], [1, 2, 3, 4, 5]))  # True
print(is_subsequence([1, 4, 3], [1, 2, 3, 4, 5]))  # False
```

> 详细版本

```python
def is_subsequence(a, b):
    b = iter(b)
    print(b)  # <list_iterator object at 0x1027967c8>

    gen = (i for i in a)
    print(gen)  # <generator object is_subsequence.<locals>.<genexpr> at 0x1026badc8>

    for i in gen:
        print(i)

    gen = ((i in b) for i in a)
    print(gen)  # <generator object is_subsequence.<locals>.<genexpr> at 0x1027d6748>

    for i in gen:
        print(i)  # True or False

    return all(((i in b) for i in a))


print(is_subsequence([1, 3, 5], [1, 2, 3, 4, 5]))
print(is_subsequence([1, 4, 3], [1, 2, 3, 4, 5]))
```

> **(i in b)**

```python
while True:
    val = next(b)
    if val == i:
        yield True
```

> **all()** - 判断一个迭代器的元素是否**全部**为 **True**

# 小结

> 容器、可迭代对象、迭代器、生成器

1. **容器**是**可迭代**对象，可迭代对象调用 **iter()** 函数，可以得到一个迭代器
   - 迭代器通过 **next()**  函数来得到**下一个元素**，所以支持**遍历**
2. **生成器**是一个**特殊的迭代器**
   - 使用**生成器**，可以使得代码更**清晰**，降低**内存占用**
