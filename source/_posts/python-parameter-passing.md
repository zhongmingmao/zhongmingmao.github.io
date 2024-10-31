---
title: Python - Parameter Passing
mathjax: true
date: 2024-08-29 00:06:25
cover: https://python-1253868755.cos.ap-guangzhou.myqcloud.com/python-parameter-passing.webp
categories:
  - Python
tags:
  - Python
---

# 值传递 vs 引用传递

1. 值传递 - 拷贝参数的值，然后传递给函数里面的新变量，原变量和新变量之间互相独立，互不影响
2. 引用传递 - 把参数的引用传递给新变量，原变量和新变量会指向**同一块内存地址**
   - 如果改变其中任何一个变量的值，另一个变量的值也会随之变化

<!-- more -->

# 变量赋值

```python
a = 1  # a points to 1 object
b = a  # b points to the same object as a
a = a + 1  # int is immutable, so a points to a new object

print(a)  # 2
print(b)  # 1
```

1. 简单的赋值 b=a，不表示重新创建新对象，而是让同一个对象被多个变量指向或者引用
2. 指向同一个对象，并不意味着两个变量绑定，如果给其中一个变量重新赋值，不会影响其它变量的值

```python
l1 = [1, 2, 3]  # l1 is a reference to the list [1, 2, 3]
l2 = l1  # l2 is a reference to the list [1, 2, 3] as well

l1.append(4)  # list is mutable, so won't create a new list, but will modify the existing list
print(l1)  # [1, 2, 3, 4]
print(l2)  # [1, 2, 3, 4]
```

> Python 里面的变量是可以删除的，但**对象是无法被删除**的

```python
l = [1, 2, 3]

del l  # delete the variable l, but not the list [1, 2, 3]
print(l)  # NameError: name 'l' is not defined
```

1. Python Runtime，其自带的 **GC** 会**跟踪**每个对象的引用
2. 如果对象**没有被引用**，就会**被回收**

> 小结 - 与 Java 非常类似

1. 变量的赋值，只是表示让变量**指向**某个对象，并不代表**拷贝**对象给变量，而**一个对象**，可以被**多个变量**所指向
2. **可变**对象（列表、字典和集合等）的改变，会影响**所有**指向该对象的变量
3. **不可变**对象（字符串、整型、元组等），所有指向该变量的值总是一样的，**不会改变**
   - 但通过某些操作（**+=**）更新不可变对象的值时，会返回一个**新对象**
4. 变量可以被删除，但**对象无法被删除**（只能等待被 **GC** 回收）

# 参数传递

> Remember that arguments are **passed by assignment** in Python. Since assignment just **creates references to objects**, there’s **no alias** between an argument name in the **caller** and **callee**, and so no call-by-reference per Se.

1. Python 的参数传递是**赋值传递**（passed by assignment），或者叫做对象的**引用传递**（pass by object reference）
2. Python 里**所有的数据类型**都是**对象** - Java 还保留**原生类型**
   - 所以在**参数传递**时，只是让新变量和原变量**指向相同的对象**而已，不存在**值传递**或者**引用传递**一说
3. 指向不是一个具体的内存地址，而是指向一个**具体的对象**

```python
def my_func(b):  # b points to 1 object as well
    print(id(b))  # 4348501864
    print(b)  # 1
    b = 2  # create a new object 2 and b points to it, a is still pointing to 1 object
    print(b)  # 2


a = 1  # a points to 1 object
print(id(a))  # 4348501864
my_func(a)
print(a)  # 1
```

> 当**可变对象**当作参数传入函数时，改变可变对象的值，会影响**所有**指向它的变量

```python
def my_func(l):  # l is a reference to the list
    l.append(4)  # list is mutable, so it will change the original list


l1 = [1, 2, 3]
my_func(l1)
print(l1)  # [1, 2, 3, 4]
```

> 另一个 Case

```python
def my_func(l):  # l is a reference to the list
    print(l)  # [1, 2, 3]
    l = l + [4]  # creates a new list [1, 2, 3, 4]
    print(l)  # [1, 2, 3, 4]


l1 = [1, 2, 3]
my_func(l1)
print(l1)  # [1, 2, 3]
```

