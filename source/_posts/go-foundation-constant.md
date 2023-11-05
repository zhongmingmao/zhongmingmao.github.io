---
title: Go - Constant
mathjax: false
date: 2022-12-29 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-constant.png
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 原生

## 概述

1. Go 常量是一种在`源码编译`期间被创建的语法元素
   - 该元素的值可以像变量那么被`初始化`，但`初始化表达式`必须在`编译期`可以`求值`
2. Go 常量一旦`声明`并被`初始化`，它的值在整个程序的`生命周期`内便`保持不变`
   - 在`并发设计`时不需要考虑`常量访问`的`同步`
   - 并且被创建并初始化后的常量可以作为其它常量的初始化表达式的一部分

<!-- more -->

> Go 引入 `const` 关键字声明常量，与 `var` 类似

```go
const Pi float64 = 3.14159265358979323846

const (
	size    int64 = 1024
	i, j, s       = 1, 2, "str"
)
```

> Go 常量的类型仅限于`基本`数据类型：`数值类型`、`字符串类型`、`布尔类型`

## C

> C 语言`原生不支持`常量

1. 在 C 语言中，`字面值`担负着`常量`的角色
2. 为了不让`字面值`以`魔数`的形式分布于源码各处，早期 C 语言的常用实践是使用`宏`（`macro`），即`宏定义常量`
3. 使用`宏定义常量`一直是 C 编码中的`主流风格`，即便后续的 `C 标准`中提供了 `const` 关键字

```c
#define FILE_MAX_LEN 0x100
#define PI 3.14159265358979323846
#define GO_SLOGAN "less is more"
```

> 宏定义常量的问题 - 预编译阶段 `宏替换`

1. 宏定义常量仅仅只是一种在`预编译阶段`进行`替换`的`字面值`，继承了`宏替换`的`复杂性`和`易错性`
2. 另外还有`类型不安全`、无法在`调试`时通过`宏名字`输出`常量的值`等问题

> C const

1. const 关键字修饰的标识符本质上依旧是`变量`

## Go

1. Go `原生`提供的用 `const` 定义的常量
2. 整合了  C 语言中的三种常量形式：`宏定义常量`、`const` 修饰的`只读变量`、`枚举常量`
   - Go 仅通过 `const + iota` 来`统一实现`
3. Go 常量是`类型安全`的，并且`对编译器优化友好`

# 创新

## 无类型常量

> 即便两个类型拥有`相同的底层类型`，但仍然是不同的数据类型，不能相互比较或者混在一个表达式中进行计算

```go
type MyInt int

const n MyInt = 13
const m int = n + 5 // cannot use n + 5 (constant 18 of type MyInt) as int value in constant declaration

func main() {
	var a int = 5
	fmt.Println(a + n) // invalid operation: a + n (mismatched types int and MyInt)
}
```

> 显式转型

```go
type MyInt int

const n MyInt = 13
const m int = int(n) + 5

func main() {
	var a int = 5
	fmt.Println(a + int(n))
}
```

> 无类型常量 - 无类型常量也有`默认类型`，依据`初始值`来决定

```go
type MyInt int

const n = 13 // untyped constant

func main() {
	fmt.Printf("n: %T\n", n) // n: int

	var a MyInt = 5
	fmt.Println(a + n) // 将 n 转换为 MyInt 类型，再与 a 相加，MyInt 的底层类型是 int，所以可以相加
}
```

## 隐式转型

1. 对于 `untyped constant` 参与的表达式求值
   - `编译器`根据上下文的类型信息，将 untyped constant `自动转换`为相应的类型后，再参与求值计算 - `隐式`进行
2. 由于隐式转型的对象是一个`常量`，因此不会引发`类型安全`问题，Go `编译器`会保证`转型安全性`

> 如果 Go 编译器在做隐式转换时，发现无法将常量转换为目标类型，Go 编译器也会报错

```go
const m = 1333333333

func main() {
	var k int8 = 1
	k + m // m (untyped int constant 1333333333) overflows int8
}
```

> `简化代码`：无类型常量 + 常量隐式转型

## 实现枚举

> Go 常量`应用最广泛`的领域

1. Go `原生不支持`枚举类型，可以通过是使用 `const 代码块`定义的`常量集合`来实现枚举
2. Go 的设计者在语言设计之初，就希望将`枚举类型`和`常量`合而为一，无需再单独提供枚举类型
   - 但造成的缺陷是，枚举仅仅支持`基本类型`
3. Go 将 `C 枚举类型特性`移植到了`Go 常量特性`，并进行了`改良`

### C

> 在 C 语言中，枚举是一个`命名`的`整型常数`的集合

> 如果没有`显式`给枚举常量`赋初始值`，那么枚举类型的第一个常量值就是 `0`，后续常量的值再依次 `+1`

```c
enum Weekday {
    SUNDAY,
    MONDAY,
    TUESDAY,
    WEDNESDAY,
    THURSDAY,
    FRIDAY,
    SATURDAY
};


int main() {
    enum Weekday today = SATURDAY;
    printf("%d\n", today); // 6
}
```

### Go

> Go 没有直接继承 C 的枚举特性

1. `自动重复上一非空行`
2. 引入 const 块中的`行偏移量指示器 iota`

> Go const 语法提供了机制：`隐式重复前一个非空表达式`

```go
const (
	Apple, Banana     = 11, 22
	Strawberry, Grape // 使用上一行的初始化表达式
	Peer, Watermelon  // 使用上一行的初始化表达式
)

func main() {
	fmt.Println(Apple, Banana)     // 11 22
	fmt.Println(Strawberry, Grape) // 11 22
	fmt.Println(Peer, Watermelon)  // 11 22
}
```

> iota

1. `iota` 是 Go 的一个`预定义标识符`
   - 表示的是 `const 声明块`（包括`单行声明`）中，每个常量所处`位置`在块中的`偏移量`（从 `0` 开始）
2. 每一行中 `iota` 自身也是一个 `untyped constant` - 会发生`隐式转型`

```go
const (
	mutexLocked           = 1 << iota // 1
	mutexWoken                        // 2
	mutexStarving                     // 4
	mutexWaiterShift      = iota      // 3
	starvationThresholdNs = 1e6       // 1000000
)

func main() {
	fmt.Println(mutexLocked)           // 1
	fmt.Println(mutexWoken)            // 2
	fmt.Println(mutexStarving)         // 4
	fmt.Println(mutexWaiterShift)      // 3
	fmt.Println(starvationThresholdNs) // 1e+06
}
```

> 位于同一行的 `iota` 即便出现多次，多个 `iota` 的值也是一样的

```go
const (
	Apple, Banana     = iota, iota + 10 // 0, 10 (iota = 0)
	Strawberry, Peach                   // 1, 11 (iota = 1)
	Pear, Orange                        // 2, 12 (iota = 2)
)
```

> 跳过 `iota = 0`

```go
const (
	_           = iota
	IPV6_V6ONLY // 1
	SO_MAX_CONN // 2
	SO_ERROR    // 3
)
```

> 跳过某几个值

```go
const (
	_    = iota
	Pin1 // 1
	Pin2 // 2
	Pin3 // 3
	_
	_
	Pin6 // 6，Pin6 会重复 Pin3（向上首个不为空的常量标识符），即 iota
)
```

> `iota` 降低了枚举的维护成本

> 传统

```go
const (
	Black  = 1
	Red    = 2
	Yellow = 3
)

// 按字母序，新增 Blue

const (
	Black  = 1
	Blue   = 2 // insert
	Red    = 3 // 2 -> 3
	Yellow = 4 // 3 -> 4
)
```

> iota

```go
const (
	_      = iota
	Black  // 1
	Red    // 2
	Yellow // 3
)

// 按字母序，新增 Blue

const (
	_      = iota
	Black  // 1
	Blood  // 2
	Red    // 3
	Yellow // 4
)
```

> 每个 `const` 代码块的 `iota` 是`独立变化`的（`iota` 的生命周期为 `const 代码块`）

```go
const single = iota // 0, iota = 0

const (
	a = iota + 1 // 1, iota = 0

	b // 2, iota = 1

	c // 3, iota = 2
)

const (
	i = iota << 1 // 0, iota = 0

	j // 2, iota = 1
	k // 4, iota = 2
)
```

