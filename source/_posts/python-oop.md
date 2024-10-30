---
title: Python - OOP
mathjax: true
date: 2024-08-26 00:06:25
cover: https://python-1253868755.cos.ap-guangzhou.myqcloud.com/python-oop.jpeg
categories:
  - Python
tags:
  - Python
---

# 命令式

1. Python 的命令式语言是**图灵完备**的 - 即理论上可以做到**其它任何语言**能够做到的**所有事情**
   - 仅依靠汇编语言的 MOV 指令，就能实现图灵完备编程
2. 传统的命令式语言有着无数**重复性代码**，虽然**函数**的诞生减缓了许多重复性
   - 但只有函数是不够的，需要把**更加抽象**的概念引入计算机才能**缓解** -- **OOP**

<!-- more -->

# 基本概念

```python
class Document():
    def __init__(self, title, author, context):
        print('init function called')
        self.title = title
        self.author = author
        self.__context = context  # __context is private

    def get_context_length(self):
        return len(self.__context)

    def intercept_context(self, length):
        self.__context = self.__context[:length]


harry_potter_book = Document('Harry Potter', 'J. K. Rowling',
                             '... Forever Do not believe any thing is capable of thinking independently ...')

print(harry_potter_book.title)
print(harry_potter_book.author)

print(harry_potter_book.get_context_length())
harry_potter_book.intercept_context(10)
print(harry_potter_book.get_context_length())

print(harry_potter_book.__context)  # AttributeError: 'Document' object has no attribute '__context'
```

| Concept       | Desc                                           |
| ------------- | ---------------------------------------------- |
| **class**     | 一群有着相同**属性**和**函数**的**对象的集合** |
| **object**    | 集合中的一个事物，**由 class 生成 object**     |
| **attribute** | 对象的某个**静态特征**                         |
| **method**    | 对象的某个**动态能力**                         |

1. `__init__` 表示**构造函数**，即一个**对象生成**时会被自动调用的函数
2. 属性以 `__` 开头，表示该属性是**私有属性**

# 常量

```python
class Document():
    WELCOME_STR = 'Welcome! The context for this book is {}.'

    def __init__(self, title, author, context):
        print('init function called')
        self.title = title
        self.author = author
        self.__context = context

    def get_context_length(self):
        return len(self.__context)

    @classmethod
    def create_empty_book(cls, title, author):
        return cls(title=title, author=author, context='nothing')

    @staticmethod
    def get_welcome(context):
        return Document.WELCOME_STR.format(context)


empty_book = Document.create_empty_book('What Every Man Thinks About Apart from Sex', 'Professor Sheridan Simove')

print(empty_book.get_context_length())  # 7
print(empty_book.get_welcome('indeed nothing'))  # Welcome! The context for this book is indeed nothing.
```

1. 在 Python 中，用**全大写**来表示**常量**
   - 在**类中**，使用 **self.WELCOME_STR**；在**类外**，使用 **Entity.WELCOME_STR**
2. **成员函数、类函数、静态函数** - 在 Java 中，类函数 ≈ 静态函数
   - **静态函数与类没有关联** - 第一个参数没有任何特殊性
   - **成员函数**的第一个参数 - **self** - 当前对象的引用
   - **类函数**的第一个参数 - **cls** - 类对象
3. 静态函数 - **@staticmethod** - **装饰器**
   - 一般用来处理**简单独立**的任务
4. 类函数 - **@classmethod**  - **装饰器**
   - 一般用来实现不同的 **init** 构造函数，类似于**工厂模式**

# 继承

1. 子类拥有父类的特征，同时拥有自己独特的特征
2. 特征 - 类的**属性**和**函数**

```python
class Entity:
    def __init__(self, object_type):
        print('parent class init called')
        self.object_type = object_type

    def get_context_length(self):
        raise Exception('get_context_length not implemented')

    def print_title(self):
        print(self.title)


class Document(Entity):
    def __init__(self, title, author, context):
        print('Document class init called')
        Entity.__init__(self, 'document')
        self.title = title
        self.author = author
        self.__context = context

    def get_context_length(self):
        return len(self.__context)


class Video(Entity):
    def __init__(self, title, author, video_length):
        print('Video class init called')
        Entity.__init__(self, 'video')
        self.title = title
        self.author = author
        self.__video_length = video_length

    def get_context_length(self):
        return self.__video_length


harry_potter_book = Document('Harry Potter(Book)', 'J. K. Rowling',
                             '... Forever Do not believe any thing is capable of thinking independently ...')
harry_potter_movie = Video('Harry Potter(Movie)', 'J. K. Rowling', 120)

print(harry_potter_book.object_type)  # document
print(harry_potter_movie.object_type)  # video

harry_potter_book.print_title()  # Harry Potter(Book)
harry_potter_movie.print_title()  # Harry Potter(Movie)

print(harry_potter_book.get_context_length())  # 77
print(harry_potter_movie.get_context_length())  # 120
```

1. 每个**类**都有**构造函数**
2. **继承类**在**生成对象**的时候，是**不会自动调用**父类的构造函数 - 与 Java 不同
   - 必须在 **init()** 函数中**显式调用**父类的构造函数
   - 执行顺序：**子类的构造函数 -> 父类的构造函数**

# 抽象类 + 抽象函数

> 与 Java 一致

```python
from abc import ABCMeta, abstractmethod


# ABC = Abstract Base Classes
class Entity(metaclass=ABCMeta):
    @abstractmethod
    def get_title(self):
        pass

    @abstractmethod
    def set_title(self, title):
        pass


class Document(Entity):
    def __init__(self):
        self.title = None

    # def get_title(self):
    #     return self.title

    def set_title(self, title):
        self.title = title


document = Document()  # TypeError: Can't instantiate abstract class Document with abstract methods get_title
document.set_title('Harry Potter')
print(document.get_title())  # Harry Potter

entity = Entity()  # TypeError: Can't instantiate abstract class Entity with abstract methods get_title, set_title
```

1. **抽象类**是一种特殊的类，**不能实例化**
2. **抽象函数**定义在**抽象类**中，子类**必须重写**抽象函数
   - 如果子类继承了抽象类，只要**没有完全实现**抽象函数，那该子类也是**抽象类**，同样**不能实例化**
3. 抽象函数使用 **@abstractmethod** 来表示
4. **自上而下** - 先定义好**规约**
