---
title: Go - Generics
mathjax: false
date: 2023-01-21 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-generics.webp
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---



# 泛型概念

> 将`算法`与`类型`解耦，实现算法更广泛的`复用`

# 实现方向

1. 拖慢`程序员`
   - 不实现泛型，不会引入复杂性
   - 但需要程序员花费精力重复实现`同逻辑但不同类型`的函数或者方法
2. 拖慢`编译器` -- C++/Go
   - 类似 `C++` 的泛型实现方案，通过增加编译器的负担为每个类型实例生成一份`单独`的泛型函数的实现
   - 产生大量的代码，且大部分是多余的
3. 拖慢`执行性能` -- Java
   - 类似 `Java` 的泛型实现方案，即`伪泛型`，通过隐式的`装箱`和`拆箱`操作消除类型的差异
   - 虽然节省了空间，但代码执行效率低

<!-- more -->

# 泛型设计

## 类型系统

> `静态强类型`：C++/Java/Go；动态强类型：Python；动态弱类型：JavaScript

1. Go 为强类型语言，而 JavaScript 为弱类型语言，Go 的`类型强度`高于 JavaScript
2. Go 和 Python 都有较高的类型强度，但`类型检查`的时机不同
   - `Go` 是在`编译期`，而 `Python` 则在`运行期`
   - 如果`类型检查`是发生在`运行期`，则为`动态类型语言`
3. `动态类型`不仅仅表现在`变量的类型`可以更改，在 OOP 的编程语言中，`类的定义`也可以`动态修改`
4. 动态类型的优点
   - 动态类型有更好的`灵活性`，可以在`运行时`修改`变量的类型`和`类的定义`，容易实现`热更新`
   - 编写方便，适用于`小规模脚本`
5. 动态类型的缺点
   - `代码晦涩，难以维护`
     - 一般没有类型标注，即便有类型标注，也可以在运行时修改
   - `性能差`
     - 因为在`编译期`缺少类型提示，编译器无法为对象安排合理的`内存布局`
     - 因此 Python 和 JavaScript 的对象布局比 Java/C++ 等静态类型语言会`更复杂`，且带来`性能下降`

> Python 为`动态强类型`语言，运行时报错

```python
>>> a = 1
>>> a + "hello"
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
TypeError: unsupported operand type(s) for +: 'int' and 'str'
>>>
>>> a = "hello"
>>> a + " world"
'hello world'
```

```python
>>> class A():
...   pass
...
>>> A.a = 1
>>> a = A()
>>> a.a
1
```

> Go 为`静态强类型`语言，编译报错

```go
var a = 1
a = "hello" // cannot use "hello" (untyped string constant) as int value in assignment
fmt.Println(a)
```

## CPP

```cpp
#include <iostream>

using namespace std;

template<typename T>

class Stack {
private:
    int _size;
    int _top;
    T *_array;

public:
    explicit Stack(int n) {
        _size = n;
        _top = 0;
        _array = new T[_size];
    }

    void push(T t) {
        if (_top < _size) {
            _array[_top++] = t;
        }
    }

    T pop() {
        if (_top > 0) {
            return _array[--_top];
        }
        return T();
    }
};

int main() {
    Stack<int> iStack(3);
    iStack.push(1);
    iStack.push(2);
    cout << iStack.pop() + iStack.pop() << endl; // 3

    Stack<string> sStack(3);
    sStack.push("World!");
    sStack.push("Hello ");
    cout << sStack.pop() + sStack.pop() << endl; // Hello World!
    return 0;
}
```

1. 在 C++ 中，泛型类型被翻译成机器码的时候，`创建`了不同的类型 - `真泛型`
2. 使用类型得到`新类型`
   - `泛型声明`：输入参数是类型，返回值也是类型的`函数`

## Java

1. 库分发：将源码先翻译成字节码，然后将字节码打包成 jar 包，然后在网络上进行分发
2. Java 的泛型设计采用的是`泛型擦除`的方式来实现 - `伪泛型`

```java
ArrayList<Integer> a = new ArrayList<>();
ArrayList<String> b = new ArrayList<>();
System.out.println(a.getClass() == b.getClass()); // true
```

```java
// java: name clash: sayHello(java.util.ArrayList<java.lang.Integer>) and sayHello(java.util.ArrayList<java.lang.String>) have the same erasure
public static void sayHello(ArrayList<String> list) {}

public static void sayHello(ArrayList<Integer> list) {}
```

# Type Set

## 概念

1. 每个`类型`都有一个 type set
2. `非接口`类型的类型的 type set 中`仅包含其自身`
   - 例如非接口类型 `T`，其 type set 中唯一的元素为 `{T}`
3. 对于一个普通的`接口`类型来说，其 type set 是`无限集合`
   - 所有`实现`了该接口类型`所有`方法的类型，都是该集合的一个`元素`
   - 此接口类型`自身`也是 type set 的一个`元素`
4. 空接口类型 `interface{}` 的 type set 中包含了`所有`可能的类型

## 表述

1. 当类型 T 是接口类型 I 的 type set 的`元素`时，类型 T `实现`了 接口 I
2. 使用`嵌入`接口类型`组合`而成的接口类型，其 type set 为其所有嵌入的接口类型的 type set 的`交集`

```go
type E1 interface {
	Method1()
}

type E2 interface {
	Method2()
}

type MyInterface3 interface {
	E1
	E2

	MyMethod3()
}
```

> MyInterface3 的 type set 为 E1、E2 和 `type E3 interface { MyMethod3() }` 的 type set 的`交集`

# 基本语法

## 类型参数

> Type parameter

1. 类型参数是在`函数声明`、`方法声明`的 receiver 部分、`类型定义`的类型参数列表，声明的（`非限定`）类型名称
2. 类型参数在声明中充当一个`未知类型`的占位符，在泛型函数或者泛型类型`实例化`时，类型参数会被一个类型实参`替换`

> 普通函数

```go
func Foo(x, y aType, z bType)
```

> 泛型函数

```go
// [...] 类型参数列表，不支持变长类型参数
// 类型参数列表中声明的类型参数，可以作为函数普通参数列表中的形参类型
// A 和 B 的类型要到泛型函数具化时才能确定
// 类型参数的名字一般是单个大写字母
func GenericFoo[A aConstraint, B bConstraint](x, y A, z B)
```

## 约束

> Constraint - `type set` + `方法集合`

1. `约束`规定一个`类型参数`必须满足的条件要求
2. 如果某个类型满足了某个约束规定的`所有`条件要求，则该类型是这个约束修饰的类型形参的一个`合法`的类型实参

> 使用 `interface` 类型来定义约束

```go
package main

type I interface {
	~int | ~int32 // 声明可用作类型实参的类型列表
	M()           // 声明接口的方法集合
}

type T1 struct{}

func (T1) M() {}

type T2 int

func (T2) M() {}

func foo[C I](c C) {}

func main() {
	var t2 T2
	foo[T2](t2) // ok
	foo(t2)     // ok

	var t1 T1
	foo[T1](t1) // T1 does not implement I
	foo(t1)     // T1 does not implement I

	// Cannot use T1 as the type I
	// Type does not implement constraint 'I' because type is not included in type set ('~int', '~int32')
}
```

> 建议：将做`约束`的接口类型和做`方法集合`的接口类型`分开定义`

## 泛型函数

> 与 `C++` 类似

> `Instantiation`

```go
func Sort[Elem interface{ Less(y Elem) bool }](list []Elem) {}

type book struct{}

func (x book) Less(y book) bool {
	return true
}

func main() {
	var books []book

	Sort[book](books) // 显式传入类型实参
	Sort(books)       // 编译器推导类型实参 - Argument type inference
}
```

> 具化 - `Instantiation`

1. `Sort[book]`，发现要排序的对象类型为 `book`
2. 检查 book 类型是否满足`约束`要求，即是否实现约定定义中的 Less 方法
   - 如果满足，将其作为类型实参`替换` Sort 函数中的类型形参，即 `Sort[book]`
   - 如果不满足，则`编译报错`
3. 将泛型函数 Sort `具化`为一个`新函数`，其函数原型为 `func([]book)`
   - `booksort := Sort[book]`

> 调用 - `Invocation`

1. 调用具化后的`泛型函数`，与普通的函数调用没有区别
2. 即 `booksort(books)`
   - 只需要检查传入的函数实参 books 的类型与 booksort 的函数原型中的形参类型 `[]book` 是否匹配

> 过程

```
Sort[book](books)

具化：booksort := Sort[book]
调用：booksort(books)
```

## 泛型类型

```go
// 带有类型参数的类型定义
type Vector[T any] []T // any 代表没有任何约束
```

```go builtin/builtin.go
// any is an alias for interface{} and is equivalent to interface{} in all ways.
type any = interface{}
```

> 同样遵循顺序：`先具化，再使用`

```go
type Vector[T any] []T

func (v Vector[T]) Dump() {
	fmt.Printf("%#v\n", v)
}

func main() {
	var iv = Vector[int]{1, 2, 3} // 具化后的类型为 Vector[int]，底层类型为 []int
	var sv Vector[string]         // 具化后的类型为 Vector[string]，底层类型为 []string

	fmt.Printf("%T\n", iv) // main.Vector[int]
	fmt.Printf("%T\n", sv) // main.Vector[string]

	sv = []string{"a", "b", "c"}
	iv.Dump() // main.Vector[int]{1, 2, 3}
	sv.Dump() // main.Vector[string]{"a", "b", "c"}
}
```

# 泛型性能

> 与 `C++` 类似，以牺牲`编译效率` 为代价

1. Go 泛型没有拖慢程序员的`开发效率`，也没有拖慢`运行效率`
2. Go 1.18 `编译器`的性能比 Go 1.17 `下降 15%`，将在 Go 1.19 得到改善，抵消 Go 泛型带来的影响

# 使用建议

## 适用

1. `容器类`：函数的操作元素的类型为 `slice`、`map`、`channel` 等特定类型
2. `通用`数据结构（如链表、二叉树），即像 slice 和 map 一样，但 Go 又没有提供原生支持的类型
3. 使用`类型参数`替代接口类型，避免进行`类型断言`，并且可以在`编译`阶段进行全面的`类型静态检查`

## 不适用

> 对某一类型的值的`全部操作`，都只是在那个值上`调用一个方法`，应该使用`接口类型`，而非`参数类型`

```go io/io.go
type Reader interface {
	Read(p []byte) (n int, err error)
}
```

```go
func ReadAll[reader io.Reader](r reader) ([]byte, error) // 错误用法，使得代码更复杂
func ReadAll(r io.Reader) ([]byte, error) // 正确用法
```

> 当不同类型使用一个共同的方法，且该方法的`实现`对所有类型`都相同`，应该使用`类型参数`，否则不能使用，如 Sort

> 在多次编写`完全相同`的样板代码，差异仅仅是`类型`，可以考虑使用`类型参数`，否则不要急于使用类型参数

