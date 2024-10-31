---
title: Python - Decorator
mathjax: true
date: 2024-08-30 00:06:25
cover: https://python-1253868755.cos.ap-guangzhou.myqcloud.com/python-decorator.jpeg
categories:
  - Python
tags:
  - Python
---

# 函数

> 在 Python 中，**函数**是**一等公民**，函数是**对象**，可以将函数赋予**变量**

> 将函数**赋值给变量**

```python
def func(message):
    print('Got a message: {}'.format(message))


send_message = func  # assign the function to a variable

print(type(func))  # <class 'function'>
print(type(send_message))  # <class 'function'>
send_message('hello world')  # call the function
```

<!-- more -->

> 将函数当成**函数参数**传递给另一个函数

```python
def get_message(message):
    return 'Got a message: ' + message


def root_call(func, message):  # func is a reference to the function get_message
    print(type(func))  # <class 'function'>
    print(func(message))


root_call(get_message, 'hello world')  # pass the function get_message as an argument to root_call
```

> 嵌套函数

```python
def func(message):
    def get_message(msg):
        print('Got a message: {}'.format(msg))

    return get_message(message)


func('hello world')  # Got a message: hello world
```

> 函数可以**返回函数对象** - 闭包

```python
def func_closure():
    def get_message(message):
        print('Got a message: {}'.format(message))

    return get_message  # return the inner function


send_message = func_closure()
print(type(send_message))  # <class 'function'>
send_message('hello world')
```

# 函数装饰器

> 朴素版本

```python
def my_decorator(func):
    def wrapper():
        print('wrapper of decorator')
        func()  # func is function passed as argument

    return wrapper  # return wrapper as a decorated function


def greet():
    print('hello world')


greet = my_decorator(greet)
greet()
```

> 优雅版本 - **@** 是**语法糖**，相当于 `greet=my_decorator(greet)`，提高代码可读性

```python
def my_decorator(func):
    def wrapper():
        print('wrapper of decorator')
        func()  # func is function passed as argument

    return wrapper  # return wrapper as a decorated function


@my_decorator
def greet():
    print('hello world')


greet()
```

> **带有参数**的装饰器

1. 将 `*args` 和 `**kwargs` 作为装饰器内部函数 wrapper() 的**函数参数**
2. `*args` 和 `**kwargs`  - 表示**接受任意数量和类型的参数**

```python
def my_decorator(func):
    def wrapper(*args, **kwargs):
        print('wrapper of decorator')
        func(*args, **kwargs)

    return wrapper


@my_decorator
def greet(message):
    print(message)


@my_decorator
def celebrate(name, message):
    print(f'{name} is celebrating {message}')


greet('hello world')
celebrate('David', 'his birthday')
```

> **带有自定义参数**的装饰器

```python
def repeat(num):
    def my_decorator(func):
        def wrapper(*args, **kwargs):
            for i in range(num):
                print('wrapper of decorator')
                func(*args, **kwargs)

        return wrapper

    return my_decorator


@repeat(4)
def greet(message):
    print(message)


greet('hello world')
```

> greet() 函数被装饰后，函数的**元信息**变了

```python
print(greet.__name__)  # wrapper

help(greet)
# Output:
# Help on function wrapper in module __main__:
#
# wrapper(*args, **kwargs)
```

> 使用内置的装饰器 **@functools.wraps**  - **保留**原函数的元信息 - 将原函数的元信息**拷贝**到对应的**装饰器函数**里面

```python
import functools


def my_decorator(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        print('wrapper of decorator')
        func(*args, **kwargs)

    return wrapper


@my_decorator
def greet(message):
    print(message)


print(greet.__name__)  # greet
help(greet)
# Output:
# Help on function greet in module __main__:
#
# greet(message)
```

# 类装饰器

> 类装饰器主要依赖于函数 `__call__()`，每调用类的实例时，函数 `__call__()` 都会被执行一次

```python
class Count:
    def __init__(self, func):  # Accepts the function to be decorated
        print(func.__name__)  # example
        self.func = func
        self.num_calls = 0

    def __call__(self, *args, **kwargs):
        self.num_calls += 1
        print('num of calls is: {}'.format(self.num_calls))
        return self.func(*args, **kwargs)


@Count
def example():
    print("hello world")


example()
# Output:
# example
# num of calls is: 1
# hello world
```

# 嵌套装饰器

```python
@decorator1
@decorator2
@decorator3
def func():
    ...
```

> 执行顺序为**从里到外**

```python
decorator1(decorator2(decorator3(func)))
```

```python
import functools


def my_decorator1(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        print('execute decorator1')
        func(*args, **kwargs)

    return wrapper


def my_decorator2(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        print('execute decorator2')
        func(*args, **kwargs)

    return wrapper


@my_decorator1
@my_decorator2
def greet(message):
    print(message)


greet('hello world')
# Output:
# execute decorator1
# execute decorator2
# hello world
```

# 样例

## 身份认证

```python
import functools


def authenticate(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        request = args[0]
        if check_user_logged_in(request):
            return func(*args, **kwargs)  # Call the original function if the user is logged in
        else:
            raise Exception('Authentication failed')

    return wrapper


def check_user_logged_in(request):
    pass


@authenticate
def post_comment(request, **kwargs):
    pass
```

## 日志记录

```python
import time
import functools
from time import sleep


def log_execution_time(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        res = func(*args, **kwargs)
        end = time.perf_counter()
        print('{} took {} ms'.format(func.__name__, (end - start) * 1000))
        return res

    return wrapper


@log_execution_time
def calculate_similarity(items):
    sleep(1)


calculate_similarity([])
```

## 输入检查

```python
import functools


def validation_check(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        ...  # check the input parameters


@validation_check
def neural_network_training(param1, param2, **kwargs):
    ...
```

## 缓存

> **@lru_cache** 会缓存进程中的**函数参数**和结果，当缓存满了以后，会删除 **least recenly used** 数据

```python
from functools import lru_cache


@lru_cache
def check(param1, param2, **kwargs) -> bool:
    ...
```

# 小结

1. 类似于 **Spring AOP**
2. **横切面逻辑**可以基于**函数**或者**类**（本质也是基于 `__call__()` 函数，但可以通过**类属性**记录更多信息）
3. 装饰器 - 通过**装饰器函数**来修改原函数的一些**功能**，而不需要修改原函数代码，相当于一种**增强**

> Decorators is to modify the **behavior** of the function through a wrapper so we don’t have to actually modify the function.
