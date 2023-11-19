---
title: Go - interface
mathjax: false
date: 2023-01-12 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-interface.webp
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 概述

> 接口类型是由 `type` 和 `interface` 关键字定义的一组`方法集合`（唯一确定所代表的接口）
> 称为`方法`，而非函数，更多是从这个接口的`实现者`的角度考虑的

```go
type MyInterface interface {
	M1(int) error
	M2(io.Writer, ...string)
}
```

<!-- more -->

> 方法的参数列表中的`形参名`和返回值列表中的`具名返回值`，都`不作为`区分两个方法的凭据

```go
// 等价
type MyInterface interface {
	M1(a int) error
	M2(w io.Writer, args ...string)
}
```

> 在接口类型中声明的`方法`必须是`具名`的，且`方法名`在这个接口类型的`方法集合`中是`唯一`的

> `类型嵌入`：在 Go `1.14` 开始，`接口类型`允许嵌入不同`接口类型`的`方法集合`存在`交集`
> 但需要`方法名`和`函数签名`也要`保持一致`，否则会`编译报错`

```go
type I1 interface {
	M1()
}

type I2 interface {
	M1()
	M2()
}

type I3 interface {
	I1
	I2

	M3()
}
```

```go
type I1 interface {
	M1()
}

type I2 interface {
	M1(string)
	M2()
}

type I3 interface {
	I1
	I2 // duplicate method M1

	M3()
}
```

> 在`接口类型`的方法集合中放入`首字母小写`的`非导出方法`也是`合法`的 - `极少使用`
> 如果接口类型的方法集合中包含`非导出方法`，那么这个`接口类型自身`通常也是`非导出`的，仅限于`包内使用`

```go context/context.go
type canceler interface {
	cancel(removeFromParent bool, err error)
	Done() <-chan struct{}
}
```

> `空`接口类型 - 方法集合为空
> 通常不需要`显式`定义空接口类型，而是直接使用 `interface{}` 的类型字面量

```go
type EmptyInterface interface{}
```

> 接口类型被`定义`后，可以用于`声明`变量，称为`接口类型变量`，如果`没有显式赋予初值`，默认值为 `nil`

```go
var err error   // err 是一个 error 接口类型的实例变量
var r io.Reader // r 是一个 io.Reader 接口类型的实例变量

fmt.Printf("%#v\n", err) // <nil>
fmt.Printf("%#v\n", r)   // <nil>
```

1. 类型 T `实现`接口类型 I
   - 类型 T 的`方法集合`是接口类型 I 的`方法集合`的`等价集合`或者`超集`
2. 此时，类型 T 的变量可以作为`合法的右值`赋值给接口类型 I 的变量

> `任何类型`都`实现`了`空接口类型`的方法集合（`空`），即可以将任何类型的值作为右值，赋值给空接口类型的变量

```go
var i interface{} = 15 // ok
i = "hello"            // ok

type T struct{}
var t T
i = t  // ok
i = &t // ok
```

# 类型断言

> 按 T 为接口类型和非接口类型，`语义`是不一样的

1. .(`非接口类型`)
   - 将一个接口类型变量`还原`成一个具体的实现类
2. .(`接口类型`)
   - 判断是否`实现`了接口

## 非接口类型

> 语义：断言存储在`接口类型变量 i` 中的值的类型为 T

> 如果断言失败，则 ok 为 `false`，而 v 为类型 T 的`零值`

```go
// i 为接口类型变量，T 为非接口类型且 T 是想要还原的类型
v, ok := i.(T)
```

```go
// 一旦断言失败，就会 panic，不推荐
v := i.(T)
```

```go
var a int64 = 13
var i interface{} = a // i 为空接口类型变量

v1, ok := i.(int64)
fmt.Printf("%v, %T, %v\n", v1, v1, ok) // 13, int64, true

v2, ok := i.(string)
fmt.Printf("%v, %T, %v\n", v2, v2, ok) // , string, false

v3 := i.(int64)
fmt.Printf("%v, %T\n", v3, v3) // 13, int64

v4 := i.([]int) // panic: interface conversion: interface {} is int64, not []int
fmt.Printf("%v, %T\n", v4, v4)
```

## 接口类型

> 语义：断言 i 的值`实现`了接口类型 T

> 如果断言成功，v 的类型为 i 的值的类型（`更广`），并非 T
> 如果断言失败，v 的类型为 T（`更窄`），值为 nil

```go
// T 为接口类型
v, ok := i.(T)
```

```go
type I interface {
	M()
}

type T int

func (T) M() {
	println("T's M")
}

func main() {
	var t T
	var i interface{} = t

	v1, ok := i.(I) // 断言成功，v1 的类型依然是 T
	if !ok {
		panic("the interface value is not of type I")
	}

	v1.M()                 // T's M
	fmt.Printf("%T\n", v1) // main.T

	i = int64(13)
	v2, ok := i.(I)                // 断言失败，v2 的类型为 I，值为 nil
	fmt.Printf("%T, %v\n", v2, ok) // <nil>, false
	v2 = 13                        // v2 的类型为 I，但 13 为 int 并没有实现 I 接口，所以编译错误
	//	cannot use 13 (type int) as type I in assignment:
	//		int does not implement I (missing M method)
}
```

> `type switch` 是`接口类型`的`类型断言`的变种

```go
type Animal interface {
	shout() string
}

type Dog struct{}

func (d Dog) shout() string {
	return "Woof!"
}

type Cat struct{}

func (c Cat) shout() string {
	return "Meow!"
}

func main() {
	var animal Animal = Dog{}

	switch a := animal.(type) { // type switch
	case nil:
		fmt.Println("nil", a)
	case Dog, Cat:
		fmt.Println(reflect.TypeOf(a), a.shout()) // main.Dog Woof!
	default:
		fmt.Println("unknown")
	}
}
```

# 小接口

> 接口类型的背后，是通过把类型的`行为`抽象成`契约`，降低双方的`耦合`程度

1. `隐式契约`，自动生效
   - 接口类型和实现者之间的关系是隐式的，`无需显式声明 implements`
   - 实现者只需要实现接口`方法集合`中的全部方法，立即生效
2. 使用`小契约`
   - 尽量定义`小接口`，方法个数控制在 `1~3`
   - 接口越大，抽象程度只会越弱

```go builtin/builtin.go
type error interface {
	Error() string
}
```

```go io/io.go
type Reader interface {
	Read(p []byte) (n int, err error)
}
```

```go net/http/server.go
type Handler interface {
	ServeHTTP(ResponseWriter, *Request)
}

type ResponseWriter interface {
	Header() Header
	Write([]byte) (int, error)
	WriteHeader(statusCode int)
}
```

![image-20231119151233381](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231119151233381.png)

## 优势

1. 接口越小（`方法集合`小），`抽象程度`越高（对应的`集合空间`就越大），极限情况为 `interface{}`
2. 易于`实现`和`测试`
3. `职责单一`，易于`复用组合`
   - Go 推崇基于`接口`的`组合`思想
   - 通过`嵌入`其它已有的接口类型的方式来构建新的接口类型

## 步骤

1. 不管接口大小，先抽象出接口
   - 针对`问题领域`，面向`接口`进行`抽象`
2. 将大接口`拆分`为小接口
3. 关注接口的`单一职责`



