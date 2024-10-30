---
title: Python - Condition + Loop
mathjax: true
date: 2024-08-22 00:06:25
cover: https://python-1253868755.cos.ap-guangzhou.myqcloud.com/python-condition-loop.png
categories:
  - Python
tags:
  - Python
---

# 条件

> 不能在条件语句中加括号，**必须**在条件末尾加上 **:**

```python
x = int(input("Enter a number: "))

if x < 0:
    y = -x
else:
    y = x

print(f"The absolute value of {x} is {y}.")
```

<!-- more -->

> Python 不支持 **switch** 语句 - **elif** - 顺序执行

```python
x = int(input("Enter a number: "))

if x == 0:
    print('red')
elif x == 1:
    print('yellow')
else:
    print('green')
```

> 省略用法 - 除了 **Boolean** 类型的数据，判断条件最好是**显性**的

![949742df36600c086c31e399ce515f45](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/949742df36600c086c31e399ce515f45.webp)

# 循环

> for + while

```python
l = [1, 2, 3, 4]
for e in l:
    print(e)
```

> 只要**数据结构**是 **Iterable** 的（如列表、集合等），都可以通过 **for** 进行**遍历**

```python
for item in <iterable>:
    ...
```

> 字典本身只有 **Key** 是**可迭代**的 - **values()** 返回字典的**值**的集合，**items()** 返回**键值对**的集合

```python
d = {'language': 'rust', 'version': '1.0.0'}

for k in d:  # same as d.keys()
    print(k)  # language, version

print(type(d.keys()))  # <class 'dict_keys'>
for key in d.keys():
    print(key)

print(type(d.values()))  # <class 'dict_values'>
for value in d.values():
    print(value)

print(type(d.items()))  # <class 'dict_items'>
for item in d.items():
    print(type(item))  # <class 'tuple'>

for i, item in enumerate(d.items()):
    print(type(i))  # <class 'int'>
    print(type(item))  # <class 'tuple'>
```

> 通过集合中的**索引**来遍历元素
> **enumerate()** - 同时返回**索引**和**元素**

```python
l = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

for index in range(0, len(l)):
    print(l[index])

for i, e in enumerate(range(0, len(l))):
    if i < 5:
        print(i, e)
```

> while - 当 condition 满足时，一直重复循环内部的操作
> 很多时候，for 和 while 可以互相转换

```python
while condition:
    ....
```

```python
l = [1, 2, 3, 4]
index = 0
while index < len(l):
    print(l[index])
    index += 1
```

> 效率问题

```python
i = 0
print(type(i))  # <class 'int'>  is immutable
while i < 1000000:
    i += 1  # call by python interpreter

for _ in range(0, 1000000):  # performance is better than while loop
    pass
```

1. **range()** -- **直接**由 **C** 语言编写，速度非常快
2. while 中的 **i += 1**，是通过 Python 的**解释器**，**间接**调用底层的 C 语言
   - 涉及到**对象**的**创建**和**删除**
   - i 是**整型**，是 **immutable**，所以 i += 1 相当于 **i =  new int(i+1)**
3. 因此，**for** 循环的**性能更优**

# 混合

```python
expression1 if condition else expression2 for item in iterable
```

> 等同于嵌套结构

```python
for item in iterable:
    if condition:
        expression1
    else:
        expression2
```

> 没有 else 语句

```python
expression for item in iterable if condition
```

$$
y=2\times|x| + 5
$$

```python
x = [1, 2, 3, 4, 5]
y = [(v * 2 + 5) if v > 0 else (-v * 2 + 5) for v in x]
```

```python
text = ' Today,  is, Sunday'
text_list = [s.strip() for s in text.split(',') if len(s.strip()) > 3]
print(text_list)  # ['Today', 'Sunday']
```

> 给定列表 x 和 y，返回 x 和 y 中所有元素对组成的元组，相等情况除外

```python
x = [1, 2, 3]
y = [3, 4, 5]

z = [(xx, yy) for xx in x for yy in y if xx != yy]
print(z)  # [(1, 3), (1, 4), (1, 5), (2, 3), (2, 4), (2, 5), (3, 4), (3, 5)]
```

