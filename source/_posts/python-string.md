---
title: Python - String
mathjax: true
date: 2024-08-20 00:06:25
cover: https://python-1253868755.cos.ap-guangzhou.myqcloud.com/python-string.png
categories:
  - Python
tags:
  - Python
---

# 基础

> 字符串是由**独立字符**组成的一个序列，通常包含在 `'...'`、`"..."`、`"""...""" ` 中

```python
name = 'jason'
city = "guangzhou"
desc = """I'm a software engineer"""
```

<!-- more -->

```python
s1 = 'rust'
s2 = "rust"
s3 = """rust"""
print(s1 == s2 == s3)  # True
```

> 便于在**字符串**中，**内嵌**带**引号**的字符串

```python
s = "I'm a string"
print(s)  # I'm a string
```

> `"""..."""` 常用于**多行字符串**，如**函数注释**

![image-20241029184612149](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241029184612149.png)

> Python 支持**转义字符**

![b7a296ab8d26664e03a076fa50d5b152](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/b7a296ab8d26664e03a076fa50d5b152.webp)

```python
s = 'a\nb\tc'
print(s)
# a
# b	c
```

# 操作

> 字符串相当于一个由**单个字符**组成的**数组**，同样支持**索引**、**切片**和**遍历**等操作

```python
name = 'jason'

print(name[0])  # j
print(name[1:3])  # as
```

> **遍历**字符串中的**每个字符**

```python
name = 'jason'

for char in name:
    print(char)

# j
# a
# s
# o
# n
```

> 字符串是 **immutable** 的

```python
s = 'rust'
s[0] = 'R'  # TypeError: 'str' object does not support item assignment
```

> 只能**创建**新的字符串 - Python 暂无可变的字符串类型，时间复杂度往往为 **O(N)** - 性能会持续迭代优化
> Java **StringBuilder** 是**可变**的字符串类型，无需创建新的字符串，时间复杂度为 **O(1)**

```python
s = 'rust'

s = 'R' + s[1:]  # create a new string
print(s)  # Rust

s = s.replace('R', 'r')  # create a new string
print(s)  # rust
```

> str1 += str2 - **原地扩充**

```python
s = ''
for i in range(0, 100000):
    s += str(i)  # O(n)
```

1. 老版本 Python - **O(N^2)** = O(1) + O(2) + … + O(N)
2. Python 2.5+，针对 str1 += str2
   - 首先检测 str1 是否还有**其它引用**，如果没有，则会尝试**原地扩充**字符串 **Buffer** 的大小 - **O(N)**

> **string.join(iterable)** - 把**每个元素**按照**指定的格式**连接起来

```python
l = []
for i in range(0, 100000):
    l.append(str(i))
s = ','.join(l)
```

> **string.split(separator)** - 将字符串按照 **separator** 分割成子字符串，并返回一个分割后字符串组成的**列表**

```python
path = 'hive://ads/training_table'
namespace = path.split('//')[1].split('/')[0]  # ads
table = path.split('//')[1].split('/')[1]  # training_table
```

> strip

| Method             | Desc                    |
| ------------------ | ----------------------- |
| string.strip(str)  | 去掉首尾的 str 字符串   |
| string.lstrip(str) | 只去掉开头的 str 字符串 |
| string.rstrip(str) | 只去掉尾部的 str 字符串 |

# 格式化

1. 使用一个字符串作为**模板**，其中会有**格式符**
2. 格式符为后续真实值**预留位置**，呈现真实值应该呈现的**格式**

> **string.format(args)** -- 最新的字符串格式化函数与规范（**推荐**） - Java 中**模板字符串**

```python
uid = 1
name = 'jason'
print('no data available for person with uid: {}, name: {}'.format(uid, name))
```

> 早期 Python 版本，通常使用 **%**

```python
uid = 1
name = 'jason'
print('no data available for person with uid: {}, name: {}'.format(uid, name))
print('no data available for person with uid: %s, name: %s' % (uid, name))
```

