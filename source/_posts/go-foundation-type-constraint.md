---
title: Go - Type Constraint
mathjax: false
date: 2023-01-25 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-constraint.webp
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 限制

1. 对泛型函数的类型参数以及泛型函数中的实现代码`设置限制`
   - 泛型函数的调用者只能传递`满足限制条件`的类型实参
   - 泛型函数内部也只能以类型参数允许的方式使用这些类型实参值
2. 在 Go 中，使用类型参数`约束`来表达这种限制条件
   - 函数`普通参数`在函数实现中可以表现出来的性质与可以参与的运算由`参数类型`限制
   - 泛型函数的`类型参数`由`约束`来限制

![image-20231209103602436](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231209103602436.png)

<!-- more -->

# 内置约束

## any

> 最宽松的约束

1. 无论是`泛型函数`还是`泛型类型`，其所有的`类型参数声明`中都必须`显式包含约束`
2. 可以使用`空接口类型`来表达`所有类型`

```go
func foo[T interface{}](sl []T) {}

func bar[T1 interface{}, T2 interface{}](t1 T1, t2 T2) {}
```

> 空接口类型的不足：使得声明变得`冗长`、`复杂`、`语义不清`

```go builtin/builtin.go
// any is an alias for interface{} and is equivalent to interface{} in all ways.
type any = interface{}
```

> any 约束的类型参数意味着可以接受`所有类型`作为类型实参，而在函数体内，可以执行

1. 声明变量
2. 同类型赋值
3. 将变量传给其它函数或者从函数返回
4. 取变量地址
5. 转换或者赋值给 interface{} 类型变量
6. 用在 type switch 或者 type assertion 中
7. 作为复合类型中的元素类型
8. 传递给预定义的函数，如 new

```go
func foo[T1, T2 any](t1 T1, t2 T2) T1 {
	var a T1 // 声明变量
	var b T2

	a, b = t1, t2 // 同类型赋值
	_, _ = a, b

	f := func(t T1) T1 { return t }
	a = f(a) // 将变量传给其它函数并从函数返回

	p := &a // 取变量地址
	_ = p

	var i interface{} = a // 转换或者赋值给 interface{} 类型变量
	_ = i

	sl := make([]T1, 0, 10) // 作为复合类型中元素类型
	sl = append(sl, a)

	j, ok := i.(T1) // type assertion
	_, _ = j, ok

	switch i.(type) { // type switch
	case T1:
		_ = i.(T1) // type assertion
	case T2:
		_ = i.(T2) // type assertion
	}

	c := new(T1) // 传递给预定义函数
	_ = c

	return a // 从函数返回
}
```

> any 约束不支持`比较`

```go
func foo[T1, T2 any](t1 T1, t2 T2) T1 {
	var a T1
	if a == t1 { // invalid operation: a == t1 (incomparable types in type set)
	}
	if a != t1 { // invalid operation: a != t1 (incomparable types in type set)
	}
	return a
}
```

## comparable

> 编译器会在`编译期间`判断某个类型是否实现了 comparable 接口

```go builtin/builtin.go
// comparable is an interface that is implemented by all comparable types
// (booleans, numbers, strings, pointers, channels, arrays of comparable types,
// structs whose fields are all comparable types).
// The comparable interface may only be used as a type parameter constraint,
// not as the type of a variable.
type comparable interface{ comparable }
```

> booleans, numbers, strings, pointers, channels, 
> `arrays` of comparable types, `structs` whose fields are all comparable types

```go
type foo struct {
	a int
	s string
}

type bar struct {
	a  int
	sl []string
}

func compare[T comparable](t T) T {
	var a T
	if a == t {
	}
	if a != t {
	}
	return a
}

func main() {
	compare(true)
	compare(3)
	compare(3.14)
	compare(3 + 4i)
	compare("go")
	var p *int
	compare(p)
	compare(make(chan int))
	compare([3]int{1, 2, 3})
	compare([]int{1, 2, 3}) // []int does not implement comparable
	compare(foo{})
	compare(bar{}) // bar does not implement comparable
}
```

> not as the type of a variable

```go
var i comparable = 5 // cannot use type comparable outside a type constraint: interface is (or embeds) comparable
```

# 自定义约束

> Go 泛型使用 `interface` 语法来定义`约束`，凡是`接口类型`均可作为`类型参数`的`约束`

```go
func Stringify[T fmt.Stringer](s []T) (ret []string) {
	for _, v := range s {
		ret = append(ret, v.String())
	}
	return
}

type MyString string

func (s MyString) String() string {
	return string(s)
}

func main() {
	sl := Stringify([]MyString{"Hello", "World"})
	fmt.Println(sl) // [Hello World]
}
```

```go fmt/print.go
type Stringer interface {
	String() string
}
```

1. 类型参数 T 的实参必须`实现` fmt.Stringer 接口的所有方法
2. 泛型函数的实现代码中，声明的 T 类型实例 v 仅被允许调用 fmt.Stringer 的 String 方法

> 只处理`非零值`的元素，编译报错

```go
func Stringify[T fmt.Stringer](s []T) (ret []string) {
	var zero T // zero value of T
	for _, v := range s {
		if v == zero { // invalid operation: v == zero (incomparable types in type set)
			continue
		}
		ret = append(ret, v.String())
	}
	return
}
```

> 通过 type embedding 扩充`约束`语义，`内嵌` comparable

```go
package main

import "fmt"

type Stringer interface {
	comparable   // type embedding
	fmt.Stringer // type embedding
}

func Stringify[T Stringer](s []T) (ret []string) {
	var zero T // zero value of T
	for _, v := range s {
		if v == zero { // ok
			continue
		}
		ret = append(ret, v.String())
	}
	return
}

type MyString string

func (s MyString) String() string {
	return string(s)
}

func main() {
	sl := Stringify([]MyString{"Hello", "", "World", ""})
	fmt.Println(sl) // [Hello World]
}
```

> 增加对`排序`的支持，编译报错，Go 不支持`运算符重载`

```go
func Stringify[T Stringer](s []T, max T) (ret []string) {
	var zero T // zero value of T
	for _, v := range s {
		if v == zero || v >= max { // invalid operation: v >= max (type parameter T is not comparable with >=)
			continue
		}
		ret = append(ret, v.String())
	}
	return
}
```

> Go 支持在`接口类型`中放入`类型元素`（type element）信息，之前只有`方法元素`

```go
package main

import "fmt"

type ordered interface {
	// 以列表中的类型为底层类型的类型都满足 ordered 约束
	~int | ~int8 | ~int16 | ~int32 | ~int64 |
		~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 | ~uintptr |
		~float32 | ~float64 |
		~string
}

type Stringer interface {
	ordered      // 包含类型元素，仅能被作为约束，内嵌到其它接口
	comparable   // type embedding
	fmt.Stringer // type embedding
}

func Stringify[T Stringer](s []T, max T) (ret []string) {
	var zero T // zero value of T
	for _, v := range s {
		if v == zero || v >= max { // ok
			continue
		}
		ret = append(ret, v.String())
	}
	return
}

type MyString string

func (s MyString) String() string {
	return string(s)
}

func main() {
	sl := Stringify([]MyString{"Hello", "", "World", ""}, MyString("World"))
	fmt.Println(sl) // [Hello]
}
```

# 约束定义

> `type` 仅代表自身；`~type` 代表以该类型为`底层类型`的所有类型

![image-20231209143945841](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231209143945841.png)

```go
type Ia interface {
	int | string // 仅代表 int 和 string
}

type Ib interface {
	~int | ~string // 代表以 int 和 string 为底层类型的类型
}
```

![image-20231209144616103](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231209144616103.png)

> `union elements` 中`不能包含`带有`方法元素`的接口类型，也不能包含`预定义`的`约束`类型，如 comparable

```go
type A interface {
}

type B interface {
	A | comparable // cannot use comparable in union
	M2()
}

type C interface {
	A | B // cannot use main.B in union (main.B contains methods)
}
```

> 接口分类：一旦包含了`类型元素`，只能用于`约束`

1. 基本接口类型 - `无`类型元素
   - 其`自身`和其`嵌入`的接口类型都只包含`方法元素`，而不包含`类型元素`
   - 可以当成`常规接口类型`使用，也可以作为`泛型类型参数`的`约束`
2. 非基本接口类型 - `有`类型元素
   - `直接`或者`间接`（type embedding）包含了`类型元素`的接口类型
   - 仅可用作`泛型类型参数`的`约束`，或者被`嵌入`到其它`仅作为约束`的接口类型中

| 类型元素 | 用途            |
| -------- | --------------- |
| 无       | 常规接口 + 约束 |
| `有`     | `约束`          |

```go
type BasicInterface interface { // 基本接口类型
	M1()
}

type NonBasicInterface interface { // 非基本接口类型
	BasicInterface
	~int | ~string // 包含类型元素
}

type MyString string

func (MyString) M1() {}

func foo[T BasicInterface](t T) {} // 基本接口类型作为约束

func bar[T NonBasicInterface](t T) {} // 非基本接口类型作为约束

func main() {
	var s = MyString("hello")

	var bi BasicInterface = s // ok，基本接口类型支持常规用法
	bi.M1()
	foo(s)

	var nbi NonBasicInterface = s // cannot use type NonBasicInterface outside a type constraint: interface contains type constraints
	nbi.M1()
	bar(s)
}
```

1. `基本接口类型`仅包含`方法元素`
   - 可以基于`方法集合`来确定一个类型`是否实现`了接口
   - 判断是否可以作为`类型实参`传递给`约束`下的`类型形参`
2. `非基本接口类型`，既有`方法元素`，也有`类型元素`
   - 借助`类型集合`（type set）来判断类型实参`是否满足约束`

> 类型集合只是`重新解释`了`类型实现接口`的判断规则

> 类型集合并非一个`运行时`概念，因此无法通过`运行时反射`来查看某个接口类型的类型集合

# 类型集合

> 接口类型的`类型集合`中的元素可以满足以该接口类型作为`类型约束`
> 可以将集合中的元素作为`类型实参`传递给该接口类型`约束`的`类型参数`

1. 每个`类型`都有一个`类型集合`
2. `非接口类型`的类型集合仅包含其`自身`
3. 用于定义`约束`的`接口类型`的类型集合
   - `空接口类型`的类型集合是一个`无限集合`，该集合中的元素为所有的`非接口类型`
   - `非空接口类型`的类型集合为其定义中的`接口元素`的`类型集合交集`

![image-20231210110217812](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231210110217812.png)

> 接口元素：其它嵌入接口类型、方法元素、类型元素

| 接口元素         | 类型集合                                                     |
| ---------------- | ------------------------------------------------------------ |
| 其它嵌入接口类型 | 该嵌入接口类型的类型集合                                     |
| 方法元素         | 该方法的类型集合                                             |
| 类型元素         | 该类型元素所表示的所有类型组成的集合<br />如果为 `~T` 形式，该集合中还包含所有以 T 为`底层类型`的类型 |

> 一个方法的类型集合为`实现`了该方法的`非接口类型`的集合，也是一个`无限集合`
> 包含多个方法的常规接口类型的类型集合，为这些方法元素的类型集合的`交集`

![image-20231210111517445](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231210111517445.png)

## 样例

```go
type Intf1 interface {
	~int | string
	F1()
	F2()
}

type Intf2 interface {
	~int | ~float64
}

type I interface {
	Intf1
	M1()
	M2()
	int | ~string | Intf2
}
```

> 接口类型 I 由 4 个接口元素组成：Intf1、M1、M2、Union element（int | ~string | Intf2）

1. Intf1
   - Intf1 是接口类型 I 的一个嵌入接口，其自身由 3 个接口元素组成，其类型集合为这 3 个接口元素的交集
   - Intf1 的类型集合
     - {以 int 为底层类型的所有类型或者 string 类型，并且实现了 F1 和 F2 方法的所有类型}
     - 由于不可能为 string 新增方法 F1 和 F2
     - {以 int 为底层类型并且实现了 F1 和 F2 方法的所有类型}
2. M1 / M2
   - 方法的类型集合由所有`实现`该方法的类型组成
   - M1 的类型集合：{实现了 M1 的所有类型}
   - M2 的类型集合：{实现了 M2 的所有类型}
3. int | ~string | Intf2
   - 类型集合为 int、~string、Intf2 类型集合的`并集`
     - int 的类型集合：int
     - ~string 的类型集合：以 string 为底层类型的所有类型
     - Intf2 的类型集合：以 int 或者 float64 为底层类型的所有类型
   - int | ~string | Intf2 的类型集合：{以 int、string、float64 为底层类型的所有类型或者 int 类型}

> I 的类型集合：{以 int 为底层类型，并且实现了 F1、F2、M1、M2 的所有类型}

```go
func foo[T I](t T) {}

type MyInt int

func (MyInt) F1() {}

func (MyInt) F2() {}

func (MyInt) M1() {}

func (MyInt) M2() {}

func main() {
	var a int = 11
	foo(a)         // int does not implement I (missing F1 method)
	foo(MyInt(11)) // ok
}
```

# 语法糖

```go
type I interface { // 独立于泛型函数外面定义
	~int | ~string
}

func foo[T I](t T)                           {}
func bar[T interface{ ~int | ~string }](t T) {} // 以接口类型字面量作为约束
```

> 如果`约束`对应的`接口类型`中仅有`一个接口元素`，且该元素为`类型元素`时，可进一步简化

```go
func bar[T ~int | ~string](t T) {}
```

```go
func bar[T interface{T1 | T2 ... | Tn}](t T)

// 等价于

func bar[T T1 | T2 ... | Tn](t T)
```

> 定义`仅包含一个类型参数`的`泛型类型`时，如果约束仅有一个 `*int` 类型元素，会报错

```go
// undefined: T
// int (type) is not an expression
type MyStruct [T * int]struct{}

// 编译器会理解为一个类型声明：MyStruct 为新类型的名字，底层类型为 [T * int]struct{}
```

> 解决方案

```go
// 完整形式
type MyStruct[T interface{ *int }] struct{}

// 加一个逗号
type MyStruct[T *int,] struct{}
```

# 类型推断

```go
func DoubleDefined[S ~[]E, E ~int | ~string](s S) S { return s }
```

1. 在大多数情况下，可以根据`函数实参`推断出`类型实参`
2. 光靠函数实参的推断，是无法完全推断出 DoubleDefined 的所有类型实参
   - DoubleDefined 的类型参数 E 并未在常规参数列表中用来声明参数
   - `函数实参`推断仅能推断出类型参数 S 的`类型实参`，而无法推断出 E 的类型实参
3. Go 支持`约束类型推断`，即基于一个已知的`类型实参`来推断其它`类型参数`的类型

> 函数实参 -> 类型实参 S -> 类型实参 E
