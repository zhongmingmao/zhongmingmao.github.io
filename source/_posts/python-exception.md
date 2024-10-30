---
title: Python - Exception
mathjax: true
date: 2024-08-23 00:06:25
cover: https://python-1253868755.cos.ap-guangzhou.myqcloud.com/python-exception.png
categories:
  - Python
tags:
  - Python
---

# 错误 vs 异常

> **语法**错误，无法被识别与执行

```python
name = 'x'
if name is not None  # SyntaxError: invalid syntax
    print(name)
```

<!-- more -->

> **异常** - 语法正确，可以被执行，但在**执行过程中**遇到错误，**抛出异常**，并**终止程序**

```python
# 10 / 0  # ZeroDivisionError: division by zero
# order * 2  # NameError: name 'order' is not defined
# 1 + [1, 2]  # TypeError: unsupported operand type(s) for +: 'int' and 'list'
```

# 处理异常

> try-except
> except block 只接受与它**相匹配**的异常类型并执行

```python
try:
    s = input('please enter two numbers separated by comma: ')
    num1 = int(s.split(',')[0].strip())
    num2 = int(s.split(',')[1].strip())
except ValueError as err:
    print('Value Error: {}'.format(err))
```

> 在 except block 中加入**多种异常的类型**

```python
try:
    s = input('please enter two numbers separated by comma: ')
    num1 = int(s.split(',')[0].strip())
    num2 = int(s.split(',')[1].strip())
except (ValueError, IndexError) as err:
    print('Error: {}'.format(err))
```

```python
try:
    s = input('please enter two numbers separated by comma: ')
    num1 = int(s.split(',')[0].strip())
    num2 = int(s.split(',')[1].strip())
except ValueError as err:
    print('Value Error: {}'.format(err))
except IndexError as err:
    print('Index Error: {}'.format(err))
```

> 很难覆盖所有的异常类型，在最后的一个 except block，声明其处理的异常类型为 **Exception**
> **Exception** - 是其它所有**非系统异常**的**基类**

```python
try:
    s = input('please enter two numbers separated by comma: ')
    num1 = int(s.split(',')[0].strip())
    num2 = int(s.split(',')[1].strip())
except ValueError as err:
    print('Value Error: {}'.format(err))
except IndexError as err:
    print('Index Error: {}'.format(err))
except Exception as err:
    print('Other Error: {}'.format(err))
```

> 在 except 后**省略异常类型**，表示与**任意异常**（包括**系统异常**和**非系统异**常等）匹配 - **不推荐**（过于**宽泛**）

```python
try:
    s = input('please enter two numbers separated by comma: ')
    num1 = int(s.split(',')[0].strip())
    num2 = int(s.split(',')[1].strip())
except ValueError as err:
    print('Value Error: {}'.format(err))
except IndexError as err:
    print('Index Error: {}'.format(err))
except:  # too broad exception
    print('Other Error')
```

> **多个** except 声明的异常类型与实际相匹配，只有**最前面**的 except block 会被执行

> **finally** - 无论发生什么情况，finally block 中的语句**都会被执行**，即便在 try 和 except 中使用了 **return** 语句

```python
import sys

f = None
try:
    f = open('params.json', 'r')
    print(f.read())
except OSError as err:
    print(f"Error: {err}")
except:
    print("Unexpected error: ", sys.exc_info()[0])
finally:  # always executed
    f.close()
```

> **with open** 会在最后**自动关闭文件**，更加**简洁**

# 自定义异常

```python
class MyInputError(Exception):
    """
    Exception raised when there are errors in input
    """

    def __init__(self, value):  # Constructor
        self.value = value

    def __str__(self):  # __str__ is to print() the value
        return "{} is invalid input".format(repr(self.value))


try:
    raise MyInputError(1)
except MyInputError as err:
    print('error: {}'.format(err))  # error: 1 is invalid input
```
