---
title: Python - Metaclass
mathjax: true
date: 2024-08-31 00:06:25
cover: https://python-1253868755.cos.ap-guangzhou.myqcloud.com/python-metaclass.png
categories:
  - Python
tags:
  - Python
---

# 超越变形

> YAMLObject 的一个**超越变形**能力，即的**任意子类**支持**序列化**和**反序列化**

```python
import yaml


class Monster(yaml.YAMLObject):
    yaml_tag = u'!Monster'

    def __init__(self, name, hp, ac, attacks):
        self.name = name
        self.hp = hp
        self.ac = ac
        self.attacks = attacks

    def __repr__(self):
        return "%s(name=%r, hp=%r, ac=%r, attacks=%r)" % (
            self.__class__.__name__, self.name, self.hp, self.ac,
            self.attacks)


yaml.load("""
--- !Monster
name: Cave spider
hp: [2,6]    # 2d6
ac: 16
attacks: [BITE, HURT]
""")

Monster(name='Cave spider', hp=[2, 6], ac=16, attacks=['BITE', 'HURT'])

print yaml.dump(Monster(
    name='Cave lizard', hp=[3, 6], ac=16, attacks=['BITE', 'HURT']))
```

<!-- more -->

1. 调用**统一**的 **yaml.load()**，可以将**任意**一个 **YAML** 序列载入为一个 **Python Object**
2. 调用**统一**的 **yaml.dump()**，能将一个 **YAMLObject 子类**序列化
3. 对于 **load()** 和 **dump()** 的用户来说，完全**不需要提前知道**任何类型信息 - **超动态配置**
4. 对于 YAML 的使用者，只需要简单地继承 **yaml.YAMLObject** 即可，让 Python Object 具有序列化和反序列化能力
5. YAML **动态**的序列化和反序列化功能是用 **Metaclass** 实现的

# Load

> 需要一个**全局注册器**，让 YAML 知道，序列化文本中的 `!Monster` 需要载入成 Monster 这个 **Python 类型**

```yaml
registry = {}


def add_constructor(target_class):
    registry[target_class.yaml_tag] = target_class


add_constructor(Monster)
```

1. 建立一个全局变量 **registry**，把所有需要反序列化的 YAMLObject 都注册进去，如 Monster 类
2. 缺点 - 每增加一个可反序列化的类后，都需要**手动注册** -- 此时可以借助 **Metaclass**

> Metaclass

```python
class YAMLObjectMetaclass(type):
    def __init__(cls, name, bases, kwds):
        super(YAMLObjectMetaclass, cls).__init__(name, bases, kwds)
        if 'yaml_tag' in kwds and kwds['yaml_tag'] is not None:
            cls.yaml_loader.add_constructor(cls.yaml_tag, cls.from_yaml)

    pass


class YAMLObject(metaclass=YAMLObjectMetaclass):
    yaml_loader = Loader
    pass
```

1. YAMLObject 将 **metaclass** 声明为 YAMLObjectMetaclass

2. 在 YAMLObjectMetaclass 中的核心 - `cls.yaml_loader.add_constructor(cls.yaml_tag, cls.from_yaml)`

   - YAML 应用 metaclass，**拦截了所有 YAMLObject 子类的定义**
   - 用户在**定义任何 YAMLObject 子类**时，Python 会**强行插入**代码
   - 所以 YAML 使用者，无需去**手动注册**了，只管定义即可

   # Metaclass

   > Python 语言的**底层实现** - Metaclass 能够**拦截 Python 类的定义**

   > 所有 Python 的**用户定义类**，都是 **type** 这个类的**实例**
   > **类本身是 type 类的实例** - 与 Java 中的 Class 类似

   ```python
   class MyClass:
       pass
   
   
   instance = MyClass()
   
   print(type(instance))  # <class '__main__.MyClass'>
   print(type(MyClass))  # <class 'type'>
   ```

   > 用户自定义类，不过是 **type** 类的 `__call__` **运算符重载**
   > 在**定义**一个**类**的语句**结束**时，真正发生的是 Python 调用 **type** 的 `__call__` 运算符

   ```python
   class MyClass:
       data = 1
   
   # 真正执行 - type 的 __call__ 运算符重载
   # class = type(classname, superclasses, attributedict)
   # class = type('MyClass', (object,), {'data':1})
   ```

   > 进一步调用：new + init

   ```python
   # type.__new__(typeclass, classname, superclasses, attributedict)
   # type.__init__(class, classname, superclasses, attributedict)
   ```

   > 代码验证

   ```python
   class MyClass:
       data = 1
   
   
   instance = MyClass()
   print(MyClass, instance)  # <class '__main__.MyClass'> <__main__.MyClass object at 0x104e0e488>
   print(instance.data)  # 1
   
   MyClass = type('MyClass', (), {'data': 1})
   instance = MyClass()
   print(MyClass, instance)  # <class '__main__.MyClass'> <__main__.MyClass object at 0x104e0e6c8>
   print(instance.data)  # 1
   ```

   > **metaclass** 是 **type** 的**子类**，通过**替换** type 的 `__call__` 运算符重载机制，实现**超越变形**

   1. 一个类型 **MyClass** 的 **metaclass** 设置为 **MyMeta**
   2. MyClass **不再**由原生的 **type** 创建，而是会调用 MyMeta 的 `__call__` **运算符重载**

   ```python
   class = type(classname, superclasses, attributedict) 
   # to
   class = MyMeta(classname, superclasses, attributedict)
   ```

   # 风险

   1. metaclass 会**扭曲变形**正常的 Python **类型模型**，如使用不慎，会有**极大风险**
   2. metaclass 一般用于**开发框架**层面，在应用层面 metaclass 不是一个很好的选择
