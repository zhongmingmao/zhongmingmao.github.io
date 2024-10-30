---
title: Python - Function
mathjax: true
date: 2024-08-24 00:06:25
cover: https://python-1253868755.cos.ap-guangzhou.myqcloud.com/python-function.png
categories:
  - Python
tags:
  - Python
---

# 基础

> **函数**为实现了某一功能的**代码片段**，可以**重复利用**
> 函数可以返回调用结果（**return** or **yield**），也可以不返回

```python
def name(param1, param2, ..., paramN):
    statements
    return/yield value # optional
```

<!-- more -->

1. 与**编译型语言**不同，**def** 是**可执行语句**，即**函数**直到**被调用前**，都是**不存在**的
2. 当调用函数时，**def** 语句才会**创建**一个新的**函数对象**，并赋予其**名字**

> 在**主程序**调用函数时，必须保证这个函数**已经定义过**，否则会报错

```python
my_func('hello world')  # NameError: name 'my_func' is not defined


def my_func(message):
    print('Got a message: {}'.format(message))
```

> 在**函数内部**调用其它函数，则没有定义顺序的限制
> **def** 是**可执行语句** - 函数在**调用之前**都**不存在**，只需保证调用时，所需的函数都**已经声明定义**即可

```python
def my_func(message):
    my_sub_func(message)  # Got a message: hello world


def my_sub_func(message):
    print('Got a message: {}'.format(message))


my_func('hello world')
```

> 函数可以设定**默认值**

```python
def func(param = 0):
    ...
```

> Python 是 **Dynamically Typed**，可以接受**任何**数据类型，同样适用于**函数参数**
> Python 不考虑输入的数据类型，而是将其交给**具体的代码**去**判断执行**
>
> 该行为是**多态**，在必要时，需要加上**类型检查**

```python
def my_sum(a, b):
    return a + b


print(my_sum(1, 2))  # 3
print(my_sum([1, 2], [3, 4]))  # [1, 2, 3, 4]
print(my_sum('Hello', 'World'))  # HelloWorld

print(my_sum(1, 'Hello'))  # TypeError: unsupported operand type(s) for +: 'int' and 'str'
```

> Python 支持**函数嵌套**

```python
def f1():
    print('hello')

    def f2():  # f2 is local to f1
        print('world')

    f2()


f1()
f2()  # NameError: name 'f2' is not defined
```

1. 函数嵌套可以**保证内部函数的隐私**
   - 内部函数只能被**外部函数**所调用和访问，**不会暴露**在全局作用域
2. 合理地使用函数嵌套，可以提高程序的**运行效率**

```python
def factorial(input):
    # validation check only once
    if not isinstance(input, int):
        raise Exception('input must be an integer.')
    if input < 0:
        raise Exception('input must be greater or equal to 0')

    def inner_factorial(input):
        if input <= 1:
            return 1
        return input * inner_factorial(input - 1)

    return inner_factorial(input)


print(factorial(5))
```

# 函数变量作用域

1. 在**函数内部**定义的变量，称为**局部变量**，只在函数内部有效
2. 一旦函数**执行完毕**，那么**局部变量**就会**被回收**
3. **全局变量**则是定义在**整个文件层次**上，可以在**文件内**的任何地方被访问

```python
MIN_VALUE = 1
MAX_VALUE = 10


def validation_check(value):
    MIN_VALUE += 1  # UnboundLocalError: local variable 'MIN_VALUE' referenced before assignment


validation_check(5)
```

> 不能在**函数内部**随意改变**全局变量**的值

1. Python **解析器**会默认**函数内部的变量**为**局部变量**
2. 如果要在函数内部改变全局变量的值，必须加上 **global** 声明
   - 显式告知 Python 解释器，函数内部的变量就是之前定义的全局变量

```python
MIN_VALUE = 1
MAX_VALUE = 10


def validation_check(value):
    global MIN_VALUE
    print(MIN_VALUE)  # 1
    MIN_VALUE += 1
    print(MIN_VALUE)  # 2


print(MIN_VALUE)  # 1
validation_check(5)
print(MIN_VALUE)  # 2
```

> 如果函数内部局部变量和全局变量**同名**的情况下，在函数内部，局部变量会**覆盖**全局全局变量

```python
MIN_VALUE = 1
MAX_VALUE = 10


def validation_check(value):
    MIN_VALUE = 101  # This is a local variable, shadowing the global variable
    print(MIN_VALUE)  # 101
    MIN_VALUE += 1
    print(MIN_VALUE)  # 102


print(MIN_VALUE)  # 1
validation_check(5)
print(MIN_VALUE)  # 1
```

> 对于**嵌套函数**来说，内部函数**可以访问**外部函数定义的变量，但**无法修改**，除非加上 **nonlocal** 关键字

```python
def outer():
    x = "local"

    def inner():
        nonlocal x  # nonlocal keyword is used to work with variables inside nested functions, where the variable should not belong to the inner function.
        x = 'nonlocal'
        print("inner:", x)  # inner: nonlocal

    inner()
    print("outer:", x)  # outer: nonlocal


outer()
```

> 如果没有 **nonlocal** 关键字，并且内部函数的变量与外部函数的变量**同名**，则会**覆盖**

```python
def outer():
    x = "local"

    def inner():
        x = 'nonlocal'  # x is a local variable of inner function, shadowing the outer x
        print("inner:", x)  # inner: nonlocal

    inner()
    print("outer:", x)  # outer: local


outer()
```

# 闭包

> **Closure** - 常与 **Decorator** 一起使用

1. 与**嵌套函数**类似，但**外部函数**返回的是一个**函数**，而不是一个具体的值
2. 返回的函数，可以被赋予一个变量，便于后续的执行调用

```python
def nth_power(exponent):
    def exponent_of(base):
        return base ** exponent

    return exponent_of  # return the function itself


square = nth_power(2)
cube = nth_power(3)

print(type(square))  # <class 'function'>
print(type(cube))  # <class 'function'>

print(square(2))  # 4
print(cube(3))  # 27
```

