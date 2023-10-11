---
title: Go - Variable
mathjax: false
date: 2022-12-22 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/govar.png
categories:
  - Go
tags:
  - Go
  - Cloud Native
---

# 内存边界

1. 在编程语言中，为了方便操作内存特定位置的数据，使用`变量`与`特定位置的内存`绑定
2. `编译器`或者`解析器`需要知道变量所能引用的`内存区域边界`
   - 动态语言
     - `解析器`可以在`运行时`通过`对变量赋值的分析`，自动确定变量的边界
     - 一个变量可以在运行时被赋予大小不同的边界
   - 静态语言
     - `编译器`必须`明确知道`一个变量的边界才允许使用该变量
     - 但编译器无法自动分析，因此`边界信息`必须由`开发者`提供 - `变量声明`
     - 在具体实现层面，`边界信息`由变量的`类型属性`赋予

<!-- more -->

# 变量声明

> Go 是静态语言，所有变量在使用前必须先进行`声明`
> 声明：告诉`编译器`该变量可以操作的`内存的边界信息`（由`变量类型信息`提供）

## 通用

> 变量声明形式与主流静态语言的差异 - 将`变量名`放在了`类型`前面（方便语法糖移除 `type`）

![image-20231011143133345](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231011143133345.png)

> 如果没有`显式`为变量赋予初值，Go `编译器`会为变量赋予`类型零值`

```go
var a int // a 的初值为 int 类型的零值 0
```

> Go 的每种`原生类型`都有其`默认值`，即`类型零值`
> 复合类型（`array`、`struct`）变量的类型零值为`组成元素`都为`零值`的结果

| 原生类型                                        | 类型零值 |
| ----------------------------------------------- | -------- |
| 整型                                            | 0        |
| 浮点                                            | 0.0      |
| 布尔                                            | FALSE    |
| 字符串                                          | `""`     |
| `pointer、interface、slice、channel、map、func` | nil      |

> 变量声明块

```go
var (
	a int    = 128
	b int8   = 6
	s string = "hello"
	c rune   = 'A' // rune in Go is a data type that stores codes that represent Unicode characters.
	t bool   = true
)
```

> 多变量声明

```go
var a, b, c int = 1, 2, 3
```

> 变量声明块 + 多变量声明

```go
var (
	a, b, c int  = 1, 2, 3
	d, e, f rune = 'C', 'D', 'E'
)
```

## 语法糖

### 省略类型信息

> 省去  type -  `var varName = initExpression`

```go
var a = 13
```

> 编译器会根据右侧变量初值`自动推导`变量的类型，并给变量赋予初值对应的默认类型

| Value    | Type         |
| -------- | ------------ |
| 整型值   | `int`        |
| 浮点值   | `float64`    |
| 复数值   | `complex128` |
| 布尔值   | `bool`       |
| 字符值   | `rune`       |
| 字符串值 | `string`     |

> 不使用默认类型，需要`显式`地为变量指定类型（`通用变量声明` or `显式类型转换`）

```go
var a int32 = 1
var b = int32(2) // 推荐
```

> 省略类型信息的语法糖仅适用于：`变量声明`的同时`显式赋予变量初值`

```go main.go
package main

var b

func main() {
}
```

```
$ go build
# github.com/zhongmingmao/go101
./main.go:3:6: syntax error: unexpected newline, expected type
```

> 结合多变量声明，可以`同时声明多个不同类型的变量`
> a 类型为 `int`，b 类型为 `rune`，c 类型为 `string`

```go
var a, b, c = 1, 'A', "abc"
```

### 短变量声明

> 省去 var 和 type - `varName := initExpression`

> 短变量声明中的变量类型也是由 Go 编译器`自动推导`出来的

```go
func main() {
	a := 1
	b := 'A'
	c := "Hello World"
}
```

> 短变量声明也支持多变量声明

```go
func main() {
	a, b, c := 1, 'A', "Hello World"
}
```

# 变量分类

## 包级变量

> 在`包级别`可见的变量，如果`包级变量`是 `Exported`，则为`全局变量`

> 包级变量`只能`使用 `var` 关键的变量声明形式，不能使用`短变量`声明形式

### 初始化

#### 饿汉

> 省略类型信息 - `var varName = initExpression`
> Go 编译器会自动根据 initExpression 结果值的类型，来确定 varName 的变量类型

```go $GOROOT/src/io/io.go
var ErrShortWrite = errors.New("short write")
var ErrShortBuffer = errors.New("short buffer")
var EOF = errors.New("EOF")
```

> 不使用默认类型，需要显式地为包级变量指定类型

```go
var a = 13
var b int32 = 17
var c float32 = 3.14

// 推荐，声明一致性
var e = 13
var d = int32(17)
var f = float32(3.14)

// 推荐
var (
	g = 13
	h = int32(17)
	i = float32(3.14)
)
```

####  饱汉

> 虽然没有显式初始化，但同样有类型零值

```go
var a int32
var f float64
```

### 声明聚类

> 将同一类的变量声明放在同一个 `var 变量声明块`中，提高`代码可读性`

```go $GOROOT/src/net/net.go
package net

// 饱汉
var (
	netGo  bool
	netCgo bool
)

// 饿汉
var (
	aLongTimeAgo = time.Unix(1, 0)
	noDeadline = time.Time{}
	noCancel   = (chan struct{})(nil)
)
```

### 就近原则

> 是否将包级变量的声明`全部`放在源文件的`头部`？

1. 就近原则：尽可能在靠近`第 1 次使用`变量的位置声明该变量
2. `变量作用域最小化`的一种实现手段

```go $GOROOT/src/net/http/request.go
var ErrNoCookie = errors.New("http: named cookie not present")

func (r *Request) Cookie(name string) (*Cookie, error) {
	for _, c := range readCookies(r.Header, name) {
		return c, nil
	}
	return nil, ErrNoCookie
}
```

> 一个包级变量在包内被`多次使用`，还是放在源文件`头部`声明比较合适

## 局部变量

> 在 Go `函数`或者`方法`体内声明的变量，仅在函数或方法体内可见

> 支持`短变量`声明形式，局部变量`特有`，也是`使用最多`的一种声明形式

### 初始化

#### 饱汉

> 延迟初始化，采用`通用`的变量声明形式

1. `省略类型信息声明`和`短变量声明`，均不支持变量的`延迟初始化`
   - 因为 Go `编译器`依赖`变量初值`，进行`自动推导`
2. 因此，与`包级变量`一样，如果是延迟初始化都只能采用通用的变量声明形式

```go
func main() {
	var err error
}
```

#### 饿汉

> 显式初始化，采用`短变量`声明形式

> `短变量`声明形式是局部变量`最常用`的声明形式

```go
func main() {
	a := 17
	b := 'A'
	c := "Hello World"
}
```

> 不使用默认类型，可以通过`类型转换`，保持`变量声明的一致性`

```go
func main() {
	a := int32(17)
	b := float32(3.14)
	c := []byte("Hello World")
}
```

### 分支控制

> 尽量在分支控制时使用`短变量`的声明形式

1. 分支控制是 Go 中`短变量`声明形式应用最广泛的场景
2. Go 程序，`很少单独声明`用于分支控制语句中的变量
   - 而是通过`短变量`声明形式，将它们与 `if`、`for` 等控制语句融合在一起
   - 在控制语句中`直接声明`用于控制语句代码块中的变量
3. `短变量声明 + 分支控制`，也很好地体现了`就近原则`，让变量的`作用域最小化`

```go $GOROOT/src/strings/strings.go
func LastIndexAny(s, chars string) int {
	if chars == "" {
		// Avoid scanning all of s.
		return -1
	}
	if len(s) == 1 {
		rc := rune(s[0])
		if rc >= utf8.RuneSelf {
			rc = utf8.RuneError
		}
		if IndexRune(chars, rc) >= 0 {
			return 0
		}
		return -1
	}
	if len(s) > 8 {
		if as, isASCII := makeASCIISet(chars); isASCII {
			for i := len(s) - 1; i >= 0; i-- {
				if as.contains(s[i]) {
					return i
				}
			}
			return -1
		}
	}
	if len(chars) == 1 {
		rc := rune(chars[0])
		if rc >= utf8.RuneSelf {
			rc = utf8.RuneError
		}
		for i := len(s); i > 0; {
			r, size := utf8.DecodeLastRuneInString(s[:i])
			i -= size
			if rc == r {
				return i
			}
		}
		return -1
	}
	for i := len(s); i > 0; {
		r, size := utf8.DecodeLastRuneInString(s[:i])
		i -= size
		if IndexRune(chars, r) >= 0 {
			return i
		}
	}
	return -1
}
```

###  声明聚类

1. `设计良好`的函数或方法，都追求`单一职责`，一般规模都不大
2. 因此，很少需要应用 `var 变量声明块`来聚类局部变量

```go $GOROOT/src/net/dial.go
func (r *Resolver) resolveAddrList(ctx context.Context, op, network, addr string, hint Addr) (addrList, error) {
...
	var (
		tcp      *TCPAddr
		udp      *UDPAddr
		ip       *IPAddr
		wildcard bool
	)
...
}
```

# 最佳实践

![image-20231011175314085](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231011175314085.png)
