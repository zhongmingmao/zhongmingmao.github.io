---
title: Python - IO
mathjax: true
date: 2024-08-21 00:06:25
cover: https://python-1253868755.cos.ap-guangzhou.myqcloud.com/python-io.webp
categories:
  - Python
tags:
  - Python
---

# 基础

```python
name = input('your name:')
gender = input('you are a boy? (y/n)')

welcome_str = 'Welcome to the matrix {prefix} {name}.'
welcome_dic = {
    'prefix': 'Mr.' if gender == 'y' else 'Mrs.',
    'name': name
}

print('authorizing...')
print(welcome_str.format(**welcome_dic))
```

<!-- more -->

1. input() 函数暂停程序运行，等待键盘输入，直到回车被按下
   - 函数的参数为提示语，输入的类型永远都是**字符串**（string）
2. print() 函数则接受字符串、数字、字典、列表和自定义类

> input() 的输入类型为 **string**

```python
a = input()  # 1
b = input()  # 2

print('a + b = {}'.format(a + b))  # a + b = 12
print('kind of a is {}, kind of b is {}'.format(type(a),
                                                type(b)))  # kind of a is <class 'str'>, kind of b is <class 'str'>
print('a + b = {}'.format(int(a) + int(b)))  # a + b = 3
```

1. 使用**强制转换**时，要加上 **try-except**
2. Python 对 **int** 类型**没有最大限制**，对 **float** 类型依然有**精度限制**

# 文件

1. open() 函数拿到文件的**指针**（句柄）
2. **r** 表示读取，**w** 表示写入，**rw** 表示读写，**a** 表示**追加**
3. **read()**，读取文件的**全部内容**到**内存**中
4. **readline()**，每次读取一行
5. **write()**，将参数中的字符串输出到文件
6. **with** - 类似于 Java **try-with-resources**
   - **open()** 函数对应于 **close()** 函数
   - 使用 **with** 语句，不需要**显式调用** close() - **自动调用**
7. 所有的 **IO** 都应该进行**错误处理**

```python
with open('in.txt', 'r') as fin:  # close file automatically
    text = fin.read()  # read all content in `in.txt` to `text`

with open('out.txt', 'w') as fout:  # close file automatically=
    for word, freq in word_and_freq:
        fout.write('{} {}\n'.format(word, freq))  # write `word` and `freq` to `out.txt`
```

# JSON

```python
import json

params = {
    'symbol': '123456',
    'type': 'limit',
    'price': 123.4,
    'amount': 23
}

params_str = json.dumps(params)
# <class 'str'>
print('type of params_str = {}, params_str = {}'.format(type(params_str), params))

original_params = json.loads(params_str)
# <class 'dict'>
print('type of original_params = {}, original_params = {}'.format(type(original_params), original_params))
```

1. **json.dumps()** 函数，接受 Python 的**基本数据类型**，将其序列化为 **string**
2. **json.loads()** 函数，接受一个 **string**，将其反序列化为 Python 的**基本数据类型**

> File + JSON

```json
import json

params = {
    'symbol': '123456',
    'type': 'limit',
    'price': 123.4,
    'amount': 23
}

with open('params.json', 'w') as fout:
    params_str = json.dump(params, fout)

with open('params.json', 'r') as fin:
    original_params = json.load(fin)
```

