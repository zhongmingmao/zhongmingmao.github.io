---
title: Python - List + Tuple
mathjax: true
date: 2024-08-18 00:06:25
cover: https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/python-list-tuple.webp
categories:
  - Python
tags:
  - Python
---

# 基础

> 列表和元组都是可以放置**任意数据类型**的**有序集合** - 绝大多数编程语言，集合的数据类型必须**一致**

```python
l = [1, 2, 'hello', 'world']
t = ('json', 22)
```

<!-- more -->

> **列表**是**动态**的（**mutable**），而**元组**是**静态**的（**immutable**）

```python
l = [1, 2, 3, 4]  # mutable
l[3] = 40
print(l)  # [1, 2, 3, 40]

t = (1, 2, 3, 4)  # immutable
# t[3] = 40  # TypeError: 'tuple' object does not support item assignment
```

> 为元组追加新元素，只能**新建**元组

```python
t1 = (1, 2, 3, 4)
t2 = t1 + (5,)
print(t2)  # (1, 2, 3, 4, 5)
```

> 为列表追加新元素，可以直接追加到**列表末尾**

```python
l = [1, 2, 3, 4]
l.append(5)
print(l)  # [1, 2, 3, 4, 5]
```

> 列表和元组都支持**负数索引**，其中 **-1** 表示**最后一个**元素

```python
l = [1, 2, 3, 4]
print(l[-1])  # 4

t = (1, 2, 3, 4)
print(t[-1])  # 4
```

> 列表和元组均都支持**切片**操作 - **左闭右开**

```json
l = [1, 2, 3, 4]
print(l[1:3])  # [2, 3]

t = (1, 2, 3, 4)
print(t[1:3])  # (2, 3)
```

> 列表和元组均支持**随意嵌套**

```python
l = [[1, 2, 3], [4, 5]]
t = ((1, 2, 3), (4, 5, 6))
```

> 列表和元组可以通过 **list()** 和 **tuple()** 函数相互转换

```python
t = list((1, 2, 3))
print(t)  # [1, 2, 3]

t = tuple([1, 2, 3])
print(t)  # (1, 2, 3)
```

> 常用内置函数

```python
l = [3, 2, 3, 7, 8, 1]

print(l.count(3))  # 2
print(l.index(7))  # 3

l.reverse()
print(l)  # [1, 8, 7, 3, 2, 3]

l.sort()
print(l)  # [1, 2, 3, 3, 7, 8]
```

```python
t = (3, 2, 3, 7, 8, 1)

print(t.count(3))  # 2
print(t.index(7))  # 3

# t.reverse()  # AttributeError: 'tuple' object has no attribute 'reverse'
# t.sort()  # AttributeError: 'tuple' object has no attribute 'sort'

print(list(reversed(t)))  # [1, 8, 7, 3, 2, 3]
print(sorted(t))  # [1, 2, 3, 3, 7, 8]
```

| Built-in                     | Desc                                                         |
| ---------------------------- | ------------------------------------------------------------ |
| count(item)                  | 统计列表或元组中 item 出现的次数                             |
| index(item)                  | 返回列表或元组中 item 第一次出现的索引                       |
| list.reverse() / list.sort() | 列表的**原地**倒转和排序，而 元组是 immutable 的，不支持原地操作 |
| **reversed()**               | 对列表或者元组进行倒转，返回一个**倒转后的迭代器**，可以再使用 list() 转换为列表 |
| **sorted()**                 | 对列表或者元组进行排序，返回一个**排序后的新列表**           |

# 存储

```python
l = [1, 2, 3]
print(l.__sizeof__())  # 64

t = (1, 2, 3)
print(t.__sizeof__())  # 48
```

1. 存储同样的元素，列表比元组多 **16 字节**
2. 由于列表是**动态**的，需要存储**指针**，来指向对应的元素，**8 字节**
3. 由于列表是**可变**的，需要额外存储**已经分配**的长度大小（追踪列表空间的使用情况），**8 字节**

```python
l = []
print(l.__sizeof__())  # 40

l.append(1)
print(l.__sizeof__())  # 72 - (72-40)/8=4

l.append(2)
print(l.__sizeof__())  # 72

l.append(3)
print(l.__sizeof__())  # 72

l.append(4)
print(l.__sizeof__())  # 72

l.append(5)
print(l.__sizeof__())  # 104 - (104-72)/8=4
```

1. 为了减少每次增加操作的空间分配开销，每次分配空间都会额外多分配一些 - **over-allocating**
2. 增加删除的时间复杂度均为 **O(1)**
3. 元组长度大小固定，元素不可变，所以**存储空间固定**

# 性能

1. 元组比列表更轻量级，总体上来说，元组的性能速度要略优于列表
2. 对于一些**静态变量**，如元组，如果它不被使用并占用空间不大时，Python 会**暂时缓存**这部分内存
   - 下次再创建**同样大小**的元组，Python 不需要再向 OS 申请内存，加快 Python 程序运行速度

> 初始化一个相同元素的列表和元组，元组的**初始化速度**，比列表快 5 倍

```
python3 -m timeit 'x=(1,2,3,4,5,6)'
50000000 loops, best of 5: 5.6 nsec per loop

python3 -m timeit 'x=[1,2,3,4,5,6]'
10000000 loops, best of 5: 29 nsec per loop
```

> 对于**索引**操作，列表与元组的速度差不多

```
python3 -m timeit -s 'x=[1,2,3,4,5,6]' 'y=x[3]'
20000000 loops, best of 5: 13.5 nsec per loop

python3 -m timeit -s 'x=(1,2,3,4,5,6)' 'y=x[3]'
20000000 loops, best of 5: 13.5 nsec per loop
```



