---
title: Python - Dict + Set
mathjax: true
date: 2024-08-19 00:06:25
cover: https://python-1253868755.cos.ap-guangzhou.myqcloud.com/python-dict.webp
categories:
  - Python
tags:
  - Python
---

# 基础

1. 字典是由 **kv** 对组成的元素的集合，在 Python **3.7+**，字典被确定为**有序**
2. 相比于列表和元组，字典的**性能更优**，对于**查找**、**添加**和**删除**操作，时间复杂度为 **O(1)**
3. 集合是一系列**唯一无序**的元素组合
4. 字典和集合，无论是 **Key** 还是 **Value**，都可以是**混合类型**

<!-- more -->

> 字典初始化

```python
d1 = {'name': 'jason', 'age': 20, 'gender': 'male'}
d2 = dict({'name': 'jason', 'age': 20, 'gender': 'male'})
d3 = dict([('name', 'jason'), ('age', 20), ('gender', 'male')])
d4 = dict(name='jason', age=20, gender='male')

print(d1 == d2)  # True
print(d2 == d3)  # True
print(d3 == d4)  # True
print(d1 == d2 == d3 == d4)  # True
```

> 集合初始化

```python
s1 = {1, 2, 3}
s2 = set([1, 2, 3])
print(s1 == s2)  # True
```

> 混合类型

```python
s = {1, 'hello', 5.0}
```

> 字典通过 **Key** 访问，如果**不存在**，则**抛出异常**

```json
d = {'name': 'jason', 'age': 20}
print(d['name'])  # jason
print(d['location'])  # KeyError: 'location'
```

> 可以通过 **get(key, default)** 函数来访问，如果**不存在**，则返回**默认值**

```json
d = {'name': 'jason', 'age': 20}
print(d.get('name'))  # jason
print(d.get('location', 'guangzhou'))  # guangzhou
```

> 集合**不支持索引操作**，集合本质上是一个**哈希表**，与列表不一样

```python
s = {1, 2, 3}
s[0]  # TypeError: 'set' object is not subscriptable
```

> 判断一个元素**是否在**一个集合或者字典中 - **value in dict / set**

```json
s = {1, 2, 3}
print(1 in s)  # True
print(10 in s)  # False

d = {'name': 'jason', 'age': 20}
print('name' in d)  # True
print('location' in d)  # False
```

> 字典和集合同样支持**增加**、**删除**、**更新**等操作
> set.pop() 删除集合中的**最后一个元素**，但集合本身是**无序**的，**随机删除**

```json
d = {'name': 'jason', 'age': 20}

d['location'] = 'guangzhou'  # insert a new key-value pair
print(d)  # {'name': 'jason', 'age': 20, 'location': 'guangzhou'}

d['location'] = 'beijing'  # update the value of key 'location'
print(d)  # {'name': 'jason', 'age': 20, 'location': 'beijing'}

d.pop('location')  # remove the key-value pair of 'location'
print(d)  # {'name': 'jason', 'age': 20}
```

```json
s = {1, 2, 3}

s.add(4)  # add element to set
print(s)  # {1, 2, 3, 4}

s.remove(2)  # remove element from set
print(s)  # {1, 3, 4}
```

> 根据字典的 Key 或者 Value，进行升序或者降序
> 返回一个**列表**，列表中的每个元素是由原字典的 **Key** 和 **Value** 组成的**元组**

```json
d = {'b': 1, 'a': 2, 'c': 10}

d_sorted_by_key = sorted(d.items(), key=lambda x: x[0])  # sort by key
print(d_sorted_by_key)  # [('a', 2), ('b', 1), ('c', 10)]

d_sorted_by_value = sorted(d.items(), key=lambda x: x[1])  # sort by value
print(d_sorted_by_value)  # [('b', 1), ('a', 2), ('c', 10)]
```

> 对于集合，直接调用 **sorted(set)**，返回一个**排序后的列表**

```python
s = {3, 4, 2, 1}

s_sorted = sorted(s)  # sorted(set) returns a new list
print(s_sorted)  # [1, 2, 3, 4]
```

# 性能

1. 字典和集合是进行过**性能高度优化**的数据结构，特别适用于**查找**、**添加**和**删除**操作
2. 字典的内部组成是**哈希表**，查找的时间复杂度为 **O(1)**
3. 集合是**高度优化**的**哈希表**，查找的时间复杂度也是 **O(1)**

# 原理

> 字典和集合的内部结构都是**哈希表**

1. 对于**字典**来说，哈希表存储了 **Hash**、**Key** 和 **Value** 3个元素
2. 对于**集合**来说，哈希表中没有 Key 和 Value，只有单一元素，在 Java 中，为 Hash、Key、null

## 哈希表

> 老版本 Python 的哈希表 - 随着哈希表的**扩张**，会变得越来越**稀疏** - 浪费**存储空间**

```
--+-------------------------------+
  | 哈希值(hash)  键(key)  值(value)
--+-------------------------------+
0 |    hash0      key0    value0
--+-------------------------------+
1 |    hash1      key1    value1
--+-------------------------------+
2 |    hash2      key2    value2
--+-------------------------------+
. |           ...
__+_______________________________+
```

> 为了提升**存储空间**的**利用率**，将**索引**与（**Hash、Key 和 Value**）单独**分开** - 类似于 **Java HashMap**

```
Indices
----------------------------------------------------
None | index | None | None | index | None | index ...
----------------------------------------------------

Entries
--------------------
hash0   key0  value0
---------------------
hash1   key1  value1
---------------------
hash2   key2  value2
---------------------
        ...
---------------------
```

## 插入

1. 每次向字典或者集合插入一个元素时，Python 会首先计算 key 的哈希值，即 **hash(key)**
2. 再与 **mask = PyDicMinSize-1** 进行**与操作**，计算该元素应该插入哈希表的位置 **index = hash(key) & mask**
3. 如果哈希表该位置是**空**的，则该元素会被**插入**其中
4. 如果哈希表此位置已被**占用**，Python 会比较两个元素的 **Hash** 和 **Key** 是否相等
   - 如果**都相等**，表明该**元素已经存在**，如果**值不同**，则**更新值**
   - 如果**有一个不相等**，表明发生**哈希冲突**，Python 会继续寻找哈希表中的**空余位置**，直到找到为止
     - 简单实现为**线性寻找**，即从该位置开始，**挨个**往后寻找空位

## 查找

1. 与插入类似，Python 根据 **index = hash(key) & mask** 找到**预期位置**
2. 比较**预期位置**中的 **Hash** 和 **Key** 是否**命中**
   - 如果**命中**，则**直接返回**
   - 如果**不命中**，则**继续查找**，直到**找到空位**或者**抛出异常**为止

## 删除

1. Python 会暂时对命中位置的元素，赋予一个**特殊值**，等到**重新调整**哈希表的大小时，再将其**删除**

## Rehashing

1. **哈希冲突**的发生，往往会**降低**字典和集合操作的**速度**
2. 为了保证**高效性**，字典和集合内的哈希表，往往会保证其至少留有 **1/3** 的**剩余空间**
   - 当剩余空间**小于 1/3** 时，Python 会重新获取到更大的内存空间，**扩充哈希表**
   - 哈希表内的**所有元素**都会被**重新排放**
3. 虽然**哈希冲突**和 **Rehashing**，都会导致速度减缓，但发生次数极少
   - 所以插入、查找和删除的**平均时间复杂度**依然为 **O(1)**





