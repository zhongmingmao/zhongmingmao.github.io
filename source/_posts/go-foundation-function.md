---
title: Go - Function
mathjax: false
date: 2023-01-05 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-func.webp
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 声明

![image-20231111162657319](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231111162657319.png)

<!-- more -->

1. 关键字 `func`
   - Go 函数声明必须以关键字 func 开始
2. 函数名
   - 在`同一个 Go 包`中，函数名应该是`唯一`的
   - 遵循 Go 标识符的`导出`规则
3. 参数列表
   - Go 函数支持`变长参数`，即`一个形式参数`对应`多个实际参数`
4. 返回值列表
   - 支持`具名返回值`，比较少用
5. 函数体
   - 可选，如果`没有函数体`，说明该函数可能在 `Go 语言之外`实现的
   - 可能使用`汇编语言`，然后通过链接器将实现与声明中的函数名链接在一起

# 类比

> 将`函数声明`等价转换为`变量声明`的形式 - 声明一个类型为`函数类型`的变量

![image-20231111163953587](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231111163953587.png)

| Key        | Value                                             |
| ---------- | ------------------------------------------------- |
| 变量名     | 函数名                                            |
| `函数签名` | 参数列表 + 返回值列表                             |
| `函数类型` | func + 参数列表 + 返回值列表<br />func + 函数签名 |

1. `函数签名`：决定两个函数类型`是否相同`
2. 在表述`函数类型`时，通常会`省略`函数签名`参数列表中的参数名`，以及返回值列表中的`返回值变量名`

```go
// 函数类型，只关注入参和出参
func (io.Writer, string, ...interface{}) (int, error)
```

> 相同的函数签名，相同的函数类型

```go
func (a, b int) (res []string, err error)
func (c, d int) (r []string, e error)

// 函数签名
(int, int) ([]string, error)

// 函数类型
func(int, int) ([]string, error)
```

> 每个`函数声明`所定义的函数，仅仅是对应`函数类型`的一个`实例`

# 字面量

```go
package main

import "fmt"

type T struct {
}

func main() {
	s := T{}       // 复合类型字面量
	f := func() {} // 函数类型字面量，由函数类型和函数体组成，也称为匿名函数

	fmt.Printf("%T\n", s) // main.T
	fmt.Printf("%T\n", f) // func()
}
```

> 在 Go 中，在大部分时候，还是会通过`函数声明`来声明一个特定`函数类型`的实例

```go
// 本质上是声明了一个函数类型为 func(int, int) int 的变量 sum
func sum(a, b int) int {
	return a + b
}
```

# 参数

1. 函数列表中的`参数`，是函数声明的，用于函数体实现的`局部变量`
2. 在`函数声明`阶段，称为`形式参数`；在`函数调用`阶段，传入的参数称为`实际参数`
3. 在实际调用函数时，`实际参数`会传递给函数，并且与`形式参数`逐一`绑定`
   - `编译器`会根据各个形式参数的`类型`和`数量`，来检查实际参数的类型和数量，是否`匹配`
   - 如果不匹配，编译器会报错

![image-20231111170620385](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231111170620385.png)

## 值传递

> 函数参数传递采用的是`值传递`的方式，将`实际参数`在内存中的表示，`逐位拷贝`（Bitwise Copy）到`形式参数`中

| 类型                     | 拷贝     | 描述                                                 |
| ------------------------ | -------- | ---------------------------------------------------- |
| `int`、`array`、`struct` | `深`拷贝 | 内存表示为`数据本身`，值传递开销与`数据大小`成`正比` |
| `string`、`slice`、`map` | `浅`拷贝 | 内存表示为`数据的描述符`，值传递开销`固定`           |

## 例外

> 简单的值传递不能满足需求，`编译器`需要介入

### 接口类型

> 编译器将传递的实际参数`赋值`给对应的接口类型形式参数

### 变长参数

> 变长参数是通过`切片`来实现的

```go
package main

import "fmt"

func myAppend(sl []int, elems ...int) []int {
	fmt.Printf("%T\n", elems) // []int

	if len(sl) == 0 {
		return sl
	}

	sl = append(sl, elems...)
	return sl
}

func main() {
	sl := []int{1, 2, 3}
	sl = myAppend(sl)
	fmt.Println(sl) // [1 2 3]

	sl = myAppend(sl, 4, 5, 6)
	fmt.Println(sl) // [1 2 3 4 5 6]
}
```

# 多返回值

> Go 的`错误处理机制`很大程度上是建立在`多返回值`的机制上

```go
func foo()
func foo() error
func foo() (int, string, error)
func foo() (i int, s string, e error) // 具名返回值
```

## 具名返回值

1. 支持`具名返回值`（Named return value），可以像`函数体`中声明的`局部变量`一样，在函数体内使用
2. 具名返回值仅应用于`特定场景`
   - 在函数中使用 `defer`，并且还在 defer 函数中`修改包裹函数的返回值`
   - 当函数`返回值较多`时，使用具名返回值可以`增强可读性`

```go time/format.go
func parseNanoseconds(value string, nbytes int) (ns int, rangeErrString string, err error) {
	if value[0] != '.' {
		err = errBad
		return
	}
	if ns, err = atoi(value[1:nbytes]); err != nil {
		return
	}
	if ns < 0 || 1e9 <= ns {
		rangeErrString = "fractional second"
		return
	}
	// We need nanoseconds, which means scaling by the number
	// of missing digits in the format, maximum length 10. If it's
	// longer than 10, we won't scale.
	scaleDigits := 10 - nbytes
	for i := 0; i < scaleDigits; i++ {
		ns *= 10
	}
	return
}
```

# 一等公民

> 具有极大的`灵活性`

1. 如果一门编程语言对某种`语言元素`的创建和使用`没有限制`，可以像对待`值`一样对待这种语言元素
2. 可以`存储在变量`中，可以作为`参数`传递给`函数`，可以在`函数内部`创建并作为`返回值`从函数返回

## 特征

### 变量

```go
var (
	// 创建匿名函数并赋值给 myFprintf 变量
	myFprintf = func(w io.Writer, format string, args ...interface{}) (int, error) {
		return fmt.Fprintf(w, format, args...)
	}
)

func main() {
	fmt.Printf("%T\n", myFprintf)                     // func(io.Writer, string, ...interface {}) (int, error)
	_, _ = myFprintf(os.Stdout, "Hello, %s!\n", "Go") // Hello, Go!
}
```

### 返回值

```go
package main

func setup(task string) func() {
	println("init", task)

	// 函数内创建匿名函数，并作为返回值返回
	return func() {
		println("clean up", task) // 闭包，引用了包裹函数的变量 task
	}
}

func main() {
	// 常用于单元测试
	cleanup := setup("opa")
	defer cleanup()

	println("do something")
}

// Output:
//	init opa
//	do something
//	clean up opa
```

1. `闭包`本质上是一个`匿名函数`（函数字面量），可以引用它的`包裹函数`中定义的`变量`
2. 这些变量在`包裹函数`和`匿名函数`之间`共享`
3. Go 的`闭包特性`是建立在`函数是一等公民`的基础上

### 参数

```go time/sleep.go
// AfterFunc waits for the duration to elapse and then calls f
// in its own goroutine. It returns a Timer that can
// be used to cancel the call using its Stop method.
func AfterFunc(d Duration, f func()) *Timer {
	t := &Timer{
		r: runtimeTimer{
			when: when(d),
			f:    goFunc,
			arg:  f,
		},
	}
	startTimer(&t.r)
	return t
}
```

### 类型

> 每个`函数声明`定义的函数，仅仅只是对应的`函数类型`的一个`实例`

> 基于`函数类型`来自定义类型

```go net/http/server.go
// The HandlerFunc type is an adapter to allow the use of
// ordinary functions as HTTP handlers. If f is a function
// with the appropriate signature, HandlerFunc(f) is a
// Handler that calls f.
type HandlerFunc func(ResponseWriter, *Request)
```

```go sort/genzfunc.go
type visitFunc func(ast.Node) ast.Visitor
```

## 应用

### 函数类型

> 函数是`一等公民`，拥有对应的`类型`，可以被`显式转型`（前提是`底层类型`要一致）

```go
// greeting 是一个函数，它的类型是 func(http.ResponseWriter, *http.Request)
func greeting(w http.ResponseWriter, r *http.Request) {
	_, _ = fmt.Fprintf(w, "Hello World!")
}

func main() {
	// 能够通过编译器检查，主要是因为 HandlerFunc 的底层类型与 greeting 函数的类型是一致的
	fmt.Printf("%T\n", greeting) // func(http.ResponseWriter, *http.Request)

	// cannot use greeting (type func(http.ResponseWriter, *http.Request)) as type http.Handler in argument to http.ListenAndServe:
	//	func(http.ResponseWriter, *http.Request) does not implement http.Handler (missing ServeHTTP method)
	//_ = http.ListenAndServe(":18088", greeting)

	// 将 greeting 函数显式转型为 http.HandlerFunc 类型（实现了 Handler 接口）
	_ = http.ListenAndServe(":18088", http.HandlerFunc(greeting))
}
```

```go net/http/server.go
func ListenAndServe(addr string, handler Handler) error {
	server := &Server{Addr: addr, Handler: handler}
	return server.ListenAndServe()
}

type Handler interface {
	ServeHTTP(ResponseWriter, *Request)
}

// 基于函数类型定义的新类型，其底层类型为函数类型 func(ResponseWriter, *Request)
type HandlerFunc func(ResponseWriter, *Request)

// HandlerFunc 实现了 Handler 接口
func (f HandlerFunc) ServeHTTP(w ResponseWriter, r *Request) {
	f(w, r)
}
```

### 闭包

> `简化函数调用`，闭包是函数内部创建的`匿名函数`，可以访问`包裹函数`的`参数`和`局部变量`

```go
func times(x, y int) int {
	return x * y
}

func main() {
	times(2, 5)
	times(3, 5)
	times(4, 5)
}
```

> 通过`闭包`简化函数调用，`减少参数的重复输入`

```go
func times(x, y int) int {
	return x * y
}

func partialTimes(x int) func(int) int {
	// 匿名函数
	return func(y int) int {
		return times(x, y) // 闭包，使用了包裹函数的参数
	}
}

func main() {
	timesFive := partialTimes(5)

	println(timesFive(2)) // 10
	println(timesFive(3)) // 15
	println(timesFive(4)) // 20
}
```

