---
title: Go - Struct
mathjax: false
date: 2023-01-01 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-struct.webp
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 新类型

## 类型定义

> `Type Definition`，基于`已有类型`

```go
type T S // S 为任意的已定义类型，包括原生类型
```

> 新类型 `T1` 是基于原生类型 `int` 定义的新类型，而新类型 `T2` 则是基于刚定义的类型 `T1` 定义的新类型

```go
type T1 int
type T2 T1
```

### 底层类型

1. 如果一个新类型是基于某个`原生类型`定义的，那么该原生类型为新类型的`底层类型`（`Underlying Type`）
2. 如果一个新类型不是基于原生类型定义的，那么就就递归查找

```go
type T1 int // T1 的底层类型为 int
type T2 T1  // T2 基于 T1 创建，而 T1 的底层类型为 int，所以 T2 的底层类型也为 int
```

<!-- more -->

> 底层类型用来判断两个类型`本质`上是否相同（`identical`）

1. `本质相同`的两个类型，它们的变量可以通过`显式转型`进行`相互赋值`
2. `本质不同`的两个类型，变量之间都`无法显式转型`

```go
type T1 int
type T2 T1     // T2 与 T1 本质相同
type T3 string // T3 与 T1 本质不同，无法进行显式转型

func main() {
	var n1 T1
	var n2 T2 = 5
	n1 = T1(n2)
	fmt.Printf("%T %v\n", n1, n1) // main.T1 5
	fmt.Printf("%T %v\n", n2, n2) // main.T2 5

	var s T3 = "Hello"
	n1 = T1(s) // cannot convert s (type T3) to type T1
}
```

### 类型字面值

> 多用于自定义一个新的`复合类型`

```go
type M map[int]string
type S []string
```

> `块`式定义：`var`、`const`、`type`

```go
type (
	T1 int
	T2 T1
	T3 string
)
```

## 类型别名

> `Type Alias`，常用于：`渐进式重构` + `对包的二次封装`

```go
type T = S // T 与 S 完全等价，没有定义新类型，实际为同一种类型
```

```go
type T = string

func main() {
	var s string = "hello"
	var t T = s           // ok，同类型赋值
	fmt.Printf("%T\n", t) // string
}
```

# 定义 Struct

## 类型字面值

> `struct` 包裹`类型字面量`（由若干`字段`聚合而成）

```go
type T struct {
	Field1 T1
	Field2 T2
  ...
	FieldN TN
}
```

```go
type Book struct {
	Title   string
	Pages   int
	Indexes map[string]int
	_       []string // 不能被外部包引用，也无法在包内被访问，主要用于主动填充
}
```

## 空结构体

```go
type Empty struct{}

func main() {
	var s Empty
	fmt.Printf("%v\n", unsafe.Sizeof(s)) // 0，空结构体类型变量的内存占用为 0
}
```

> 基于空结构体类型`内存零开销`的特性，经常使用`空结构体`类型元素作为一种`事件`，进行 `goroutine` 之间的`通信`

```go
var c = make(chan Empty)
c <- Empty{}
```

## 依赖

```go
type Person struct {
	Name    string
	Phone   string
	Address string
}

type Book struct {
	Title  string
	Author Person
}

func main() {
	var book Book
	fmt.Println(book.Author.Phone) // ok
}
```

> 场景：定义包含结构体类型字段的结构体类型
> 嵌入字段（`Embedded Field`）或匿名字段：不提供字段名称，只使用类型 - `Type Embedding`

```go
type Person struct {
	Name    string
	Phone   string
	Address string
}

type Book struct {
	Title  string
	Person // Embedded Field
}

func main() {
	var book Book
	fmt.Println(book.Person.Phone) // 将类型名当作嵌入字段的名字
	fmt.Println(book.Phone)        // 语法糖：直接访问嵌入字段所属类型中的字段
}
```

## 递归

> 结构体`不支持`递归定义

### 自身递归

> 结构体类型 T 的`定义`中不能包含类型为 T 的字段

```go
type Node struct { // invalid recursive type Node
	left  Node
	right Node
}
```

### 多者递归

> `不同结构体`之间的`递归定义`，也是`不合法`的

```go
type A struct { // invalid recursive type A
	b B
}

type B struct {
	a A
}
```

### 合法

> 合法形式：`指针`、`切片`、`map 值`

```go
type T struct {
	t  *T           // ok
	st []T          // ok
	m  map[string]T // ok
}
```

# 声明 Struct

```go
type Book struct {
	Title string
}

var b1 Book
var b2 = Book{}
var b3 Book = Book{}

func main() {
	b4 := Book{}
	fmt.Println(b1, b2, b3, b4)
}
```

# 初始化 Struct

## 零值初始化

> 使用结构体的`零值`作为其初始值，`类型零值`即一个类型的`默认值`

> 当结构体类型变量中的`各个字段`的值`都是零值`，那么该结构体类型的变量处于`零值状态`

```go
type Book struct {
	Title string
}

var book Book // 零值，但不一定可用

func main() {
	fmt.Printf("%#v\n", book)        // main.Book{Title:""}
	fmt.Println(book.Title == "")    // true
	fmt.Println(unsafe.Sizeof(book)) // 16
}
```

> 践行`零值可用`的理念，可以`简化代码`和`改善开发者体验`

> C - Mutex 非零值可用

```c
#include <pthread.h>

int main() {
    pthread_mutex_t mutex; // 非零值可用

    pthread_mutex_init(&mutex, NULL); // 一定要先初始化，才能使用
    pthread_mutex_lock(&mutex);
    pthread_mutex_unlock(&mutex);
}
```

> Go - Mutex 零值可用，提升开发体验，无需对 Mutex 变量进行显式初始化

```go
package main

import "sync"

func main() {
	var mutex sync.Mutex // 零值可用

	mutex.Lock()
	mutex.Unlock()
}
```

```go
var b bytes.Buffer // 零值可用

b.Write([]byte("Hello World!"))
fmt.Println(b.String()) // Hello World!
```

## 复合字面量

> 按`顺序`依次给每个结构体`字段`赋值 - `不推荐`

```go
type Book struct {
	Title   string
	Pages   int
	Indexes map[string]int
}

var book = Book{"Go 101", 1 << 10, make(map[string]int)}
```

> `field:value` - `推荐`
> 未显式出现在复合字面值的结构体字段将采用它对应类型的`零值`

```go
type Book struct {
	Title   string
	Pages   int
	Indexes map[string]int
}

var book = Book{
	Title: "The Go Programming Language",
	Pages: 380,
	Indexes: map[string]int{
		"Introduction": 1,
		"Chapter 1":    12,
		"Chapter 2":    20,
		"Chapter 3":    34,
	},
}
```

```go
type Book struct {
	Title   string
	Pages   int
	Indexes map[string]int
}

var b1 = Book{
	Title: "The Go Programming Language",
	Pages: 380,
	Indexes: map[string]int{
		"Introduction": 1,
		"Chapter 1":    12,
		"Chapter 2":    20,
		"Chapter 3":    34,
	},
}

var b2 = Book{} // 类型零值

func main() {
	fmt.Printf("%#v\n", b2) // main.Book{Title:"", Pages:0, Indexes:map[string]int(nil)}
}
```

## new

> 比较少用

```go
type Book struct {
	Title   string
	Pages   int
	Indexes map[string]int
}

func main() {
	b1 := Book{}
	b2 := new(Book) // 返回指针

	// main.Book, 32, main.Book{Title:"", Pages:0, Indexes:map[string]int(nil)}
	fmt.Printf("%T, %d, %#v\n", b1, unsafe.Sizeof(b1), b1)

	// *main.Book, 8, 32, &main.Book{Title:"", Pages:0, Indexes:map[string]int(nil)}
	fmt.Printf("%T, %d, %d, %#v\n", b2, unsafe.Sizeof(b2), unsafe.Sizeof(*b2), b2)
}
```

## 构造函数

> 场景
>
> 1. 结构体类型中包含未导出字段，且该`未导出字段`为`零值不可用`
> 2. 结构体类型中的某些字段，需要`复杂的初始化逻辑`

```go time/sleep.go
type runtimeTimer struct { // 非零值可用
	pp       uintptr
	when     int64
	period   int64
	f        func(interface{}, uintptr)
	arg      interface{}
	seq      uintptr
	nextwhen int64
	status   uint32
}

type Timer struct {
	C <-chan Time
	r runtimeTimer // Unexported
}

// 构造函数
func NewTimer(d Duration) *Timer {
	c := make(chan Time, 1)
	t := &Timer{
		C: c,
		r: runtimeTimer{
			when: when(d),
			f:    sendTime,
			arg:  c,
		},
	}
	startTimer(&t.r)
	return t
}
```

> `NewT` 为结构体类型 `T` 的`专用构造函数`，参数列表通常与 T 中定义的`导出字段`相对应，返回 `T 指针类型`的变量

```go
func NewT(field1, field2, field3, ...) *T {
	...
}
```

# 内存布局

## 理想情况

> 结构体类型将其`字段`以`平铺`的方式存放在一个`连续`的内存块中

![image-20231109005416024](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231109005416024.png)

> 结构体类型 T 在内存中的布局`非常紧凑`，Go 为其分配的内存`都用来存储字段`，没有被 Go 编译器插入`额外字段`

```go
type T struct {
	F1 int64
	F2 int64
	F3 int64
}

func main() {
	var t T

	fmt.Printf("%v\n", unsafe.Sizeof(t)) // 24，结构体类型变量占用的内存大小

	fmt.Printf("%v\n", unsafe.Offsetof(t.F1)) // 0，结构体类型变量中字段 F1 的偏移量
	fmt.Printf("%v\n", unsafe.Offsetof(t.F2)) // 8，结构体类型变量中字段 F2 的偏移量
	fmt.Printf("%v\n", unsafe.Offsetof(t.F3)) // 16，结构体类型变量中字段 F3 的偏移量
}
```

## 真实情况

> 内存对齐 - `提高处理器存储数据的效率`

![image-20231109010148112](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231109010148112.png)

1. 对于基础数据类型，其变量的`内存地址值`必须是其`类型本身大小`的`整数倍`
   - `int64` 类型变量的内存地址，能被 8 整除
   - `uint16` 类型变量的内存地址，能被 2 整除
2. 对于结构体而言，其变量的`内存地址值`，满足 `N * min(最长字段长度, 系统对齐系数)` 即可
   - 但其每个`字段`的内存地址都需要`严格满足`内存对齐需求

> 对齐过程

```go
type T struct {
	b byte
	i int64
	u uint16
}

func main() {
	var ts [2]T
	var t0 = ts[0]

	fmt.Printf("%d\n", unsafe.Sizeof(t0.b)) // 1
	fmt.Printf("%d\n", unsafe.Sizeof(t0.i)) // 8
	fmt.Printf("%d\n", unsafe.Sizeof(t0.u)) // 2
	fmt.Printf("%d\n", unsafe.Sizeof(t0))   // 24

	fmt.Printf("%d\n", unsafe.Sizeof(ts)) // 48
}
```

![image-20231109011424825](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231109011424825.png)

> `字段顺序`会影响`整个结构体的大小`

```go
type T struct {
	b byte
	i int64
	u uint16
}

type S struct { // 小字段尽量靠前
	b byte
	u uint16
	i int64
}

func main() {
	fmt.Printf("%d\n", unsafe.Sizeof(T{})) // 24
	fmt.Printf("%d\n", unsafe.Sizeof(S{})) // 16
}
```

> `内存填充`一般由`编译器自动完成`，也可以做`主动填充`（通过 `_` 标识符来进行主动填充）

```go runtime/mstats.go
type mstats struct {
  ...
	// Add an uint32 for even number of size classes to align below fields
	// to 64 bits for atomic operations on 32 bit platforms.
	_ [1 - _NumSizeClasses%2]uint32
  ...
)
```





