---
title: Python - Module
mathjax: true
date: 2024-08-27 00:06:25
cover: https://python-1253868755.cos.ap-guangzhou.myqcloud.com/python-module.webp
categories:
  - Python
tags:
  - Python
---

# 简单模块化

1. 把函数、类、常量拆分到**不同的文件**，但放置在**同一个文件夹**中
2. 使用 `from your_file import function_name, class_name` 的方式进行调用

<!-- more -->

```
$ tree
.
├── main.py
└── utils.py

$ cat utils.py
def get_sum(a, b):
    return a + b
    
$ cat main.py
from utils import get_sum

print(get_sum(1, 2))  # 3

$ python main.py
3
```

# 项目模块化

1. **相对的绝对路径** - 从**项目的根目录**开始追溯
2. 所有的**模块调用**，都要通过**项目根目录**来 **import**

![image-20241030233425019](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241030233425019.png)

```
$ tree
.
├── proto
│   └── mat.py
├── src
│   └── main.py
└── utils
    └── mat_mul.py

$ cd src/

$ python main.py
Traceback (most recent call last):
  File "/Users/zhongmingmao/workspace/python/python-101/src/main.py", line 3, in <module>
    from proto.mat import Matrix
ModuleNotFoundError: No module named 'proto'
```

> Python 解释器在遇到 **import** 时，会在一个**特定的列表**中寻找模块 - **sys.path**

1. Python 可以通过 **Virtualenv** 创建一个全新的 Python 运行环境
2. 对于每个项目，最好有一个**独立的运行环境**来保持**包**和**模块**的纯净性

# Main

> Python 是脚本语言，**不需要显式提供** main() 函数入口

1. **import** 在导入文件时，会自动把所有**暴露在外面**的代码**全部执行一遍**
2. `__name__` 是 Python 的**魔术内置参数**，本质上**模块对象**的一个**属性**
   - 使用 **import A** 语句时，`__name__` 会被赋值为 A 的名字，自然就不等于 `__main__` 了

> 使用 `if __name__ == '__main__'` **避免被 import 时执行**，但又能**单独执行**

![image-20241031000620502](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241031000620502.png)

![image-20241031000758987](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241031000758987.png)
