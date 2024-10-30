---
title: Python - Compare + Copy
mathjax: true
date: 2024-08-28 00:06:25
cover: https://python-1253868755.cos.ap-guangzhou.myqcloud.com/python-copy.png
categories:
  - Python
tags:
  - Python
---

## == vs is

1. **==** 比较对象之间的**值**是否相等，类似于 Java 中的 **equals**
2. **is** 比较的是对象的**身份标识**是否相等，即是否为**同一个对象**，是否**指向同一个内存地址**，类似于 Java 中的 **==**
   - **is None** or **is not None**
3. 在 Python 中，每个对象的身份标识，都能通过 **id(object)** 函数获得，**is** 比较的是对象之间的 **ID** 是否相等
   - 类似于 Java 对象的 **HashCode**
4. 在实际工作中，**== 更常用**，一般关心的是两个变量的**值**，而非**内部存储地址**

<!-- more -->

```python
a = 10  # allocate memory for 10
b = 10  # point to the same memory location as a

print(a == b)  # True

print(id(a))  # 4376158344
print(id(b))  # 4376158344
print(a is b)  # True
```

1. a is b 为 True，仅适用于 **-5 ~ 256** 范围内的数字
2. 出于**性能**考虑，Python 内部会对 **-5 ~ 256** 的整型维持一个**数组**，起到一个**缓存**的作用 - 与 Java 的设计类似

> 性能差异

1. is 的速度效率，一般要优于 ==

   - **is 操作符不能被重载**，Python 无需去寻找是否有其它地方重载了该操作符，仅仅比较两个变量的 ID 而已

2. a == b，相当于执行 `a.__eq__(b)`

   - Python 大部分的数据类型都会去重载 `__eq__` 函数，内部的处理通常会**更复杂**一些
   - 如对于列表，`__eq__` 函数会去**遍历**列表中的元素，比较它们的**顺序**和**值**是否相等
   - **递归遍历**对象的所有值，并**逐一比较**


> 比较结果不是一直不变的

```python
t1 = (1, 2, [3, 4])
t2 = (1, 2, [3, 4])
print(t1 == t2)  # True

old_t1_id = id(t1)
old_t1_id_x = id(t1[-1])
t1[-1].append(5)  # address of t1 and t1[-1] is not changed
new_t1_id = id(t1)
new_t1_id_x = id(t1[-1])

print(t1 == t2)  # False
print(old_t1_id == new_t1_id)  # True
print(old_t1_id_x == new_t1_id_x)  # True
```

# 浅拷贝 vs 深拷贝

> 常见**浅拷贝** - 使用**数据类型**本身的**构造函数**

```python
l1 = [1, 2, 3]
l2 = list(l1)  # l2 is a shallow copy of l1

print(l1 == l2)  # True
print(l1 is l2)  # False
```

```python
s1 = {1, 2, 3}
s2 = set(s1)  # s2 is a shallow copy of s1

print(s1 == s2)  # True
print(s1 is s2)  # False
```

> **copy.copy()** - 适用于**任何数据类型** - **浅拷贝**

```python
import copy

l1 = [1, 2, 3]
l2 = copy.copy(l1)  # shallow copy

print(l1 == l2)  # True
print(l1 is l2)  # False
```

> 对于元组，**tuple()** 或者**切片**操作符 '**:**' **不会创建浅拷贝**，而是会返回**一个指向相同元组的引用** - 与 Go Slice 有点类似

```python
t1 = (1, 2, 3)
t2 = tuple(t1)  # point to the same object for performance, because t1 is immutable

print(t1 == t2)  # True
print(t1 is t2)  # True
```

1. **浅拷贝**，即重新分配一块内存，创建一个新的对象，里面的元素是**原对象中子对象的引用**
2. 如果原对象中的**子对象**是**可变**，可能会有**副作用**

```python
l1 = [[1, 2], (30, 40)]
l2 = list(l1)  # l2 is a shallow copy of l1

l1.append(100)
print(l1)  # [[1, 2], (30, 40), 100]
print(l2)  # [[1, 2], (30, 40)]

l1[0].append(3)
print(l1)  # [[1, 2, 3], (30, 40), 100]
print(l2)  # [[1, 2, 3], (30, 40)]

l1[1] += (50, 60)  # tuple is immutable, so it will create a new tuple and assign it to l1[1]
print(l1)  # [[1, 2, 3], (30, 40, 50, 60), 100]
print(l2)  # [[1, 2, 3], (30, 40)]
```

> **深拷贝** - 即重新分配一块内存，创建一个新的对象，并且将原对象中的元素，以**递归**的方式，创建新的子对象拷贝到新对象中
> 新对象与原对象**没有任何关联** - **copy.deepcopy()**

```python
import copy

l1 = [[1, 2], (30, 40)]
l2 = copy.deepcopy(l1)  # l2 is a deep copy of l1

l1.append(100)
print(l1)  # [[1, 2], (30, 40), 100]
print(l2)  # [[1, 2], (30, 40)]

l1[0].append(3)
print(l1)  # [[1, 2, 3], (30, 40), 100]
print(l2)  # [[1, 2], (30, 40)]
```

> 如果被拷贝对象中，存在**指向自身**的引用，程序容易陷入**无限循环**

```python
import copy

x = [1]
x.append(x)  # x references itself, infinite recursion
print(x)  # [1, [...]]

y = copy.deepcopy(x)
print(y)  # [1, [...]]
```

1. 程序并没有出现 **stack overflow**
2. 原因 - deepcopy 函数会维护一个**字典**，记录**已经拷贝**的对象和其 ID
   - 如果字典中已经存储了将要拷贝的对象，则直接返回
   - **提高效率**并**防止无限递归**的发生

![image-20241031014341666](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241031014341666.png)
