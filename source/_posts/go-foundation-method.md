---
title: Go - Method
mathjax: false
date: 2023-01-09 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-method.jpeg
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# OOP

1. Go 并不支持 `OOP` 的语法元素（类、对象、继承等），但仍支持`方法`（Method）
2. Go 引入 Method 并非为了实现 OOP 编程范式，而是出自 Go 的`组合`设计哲学下`类型系统`实现层面的需要

> `Method` 本质上是一个以 `receiver` 参数作为`第 1 个参数`的 `Function`（Go `编译器`协助转换）

<!-- more -->

# 形式

> `receiver` 参数是 `Method` 和 `Type` 之间的纽带

![image-20231116163922726](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231116163922726.png)

> `ListenAndServeTLS` 归属于 `*Server` 类型，而非 `Server` 类型

# receiver

> `Method` 必须`归属`于某个 `Type`，即 `receiver` 参数的`类型`

```go
func (receiver *T或T) MethodName(参数列表) (返回值列表) {
  // 方法体
}
```

1. 无论 receiver 参数的类型是 `*T` 还是 `T`，receiver 参数的`基类型`都为 `T`
   - 如果 receiver 的类型为 `T`，则这个 `Method` 是类型 `T` 的一个方法
   - 如果 receiver 的类型为 `*T`，则这个 `Method` 是类型 `*T` 的一个方法
2. 每个 Method 只能有`一个` receiver 参数，Go 不支持`多个` receiver 参数或者`变长` receiver 参数

## 作用域

> `receiver` 、`参数`、`返回值`的作用域：`函数` or `方法`对应的`显式代码块`

> receiver 部分的参数名不能与方法参数列表中的`形参名`，以及`具名返回值`中的变量名存在冲突

```go
type T struct {
}

func (t T) M(t string) { // duplicate argument t
}
```

> 如果在方法体中，没有用到 receiver 参数，可以`省略` receiver 的参数名 - `不常用`

```go
type T struct {
}

func (_ T) M1(t string) {
	fmt.Println(t)
}

func (T) M2(t string) {
	fmt.Println(t)
}
```

> receiver 参数的`基类型`本身不能为`指针`类型或者`接口`类型

```go
type MyInt *int

func (m MyInt) Inc() { // invalid receiver type MyInt (MyInt is a pointer type)
}
```

```go
type Reader interface {
	Read(p []byte) (n int, err error)
}

type MyReader io.Reader

func (r MyReader) Read() { // invalid receiver type MyReader (MyReader is an interface type)
}
```

> `Method 声明`要与 `receiver` 参数的`基类型声明`放在`同一个包`内

1. 不能为`原生类型`添加 Method
2. 不能跨越 Go 包为其他包的类型声明新方法

```go
func (i int) Foo() string { // cannot define new methods on non-local type int
	return fmt.Sprintf("%d", i)
}
```

```go
import "net/http"

func (s http.Server) Foo() { // undefined: http
}
```

# 使用

> receiver 参数的`基类型`为 T，即 receiver 参数`绑定`到 T 上，可以通过 `*T` 或者 `T` 的变量实例调用该方法

```go
type T struct {
}

func (t T) M(n int) {
}

func main() {
	var t T
	fmt.Printf("%T\n", t) // main.T
	t.M(1)                // ok

	p := &T{}
	fmt.Printf("%T\n", p) // *main.T
	p.M(2)                // ok
}
```

# 本质

```go
type T struct {
	a int
}

func (t T) Get() int {
	return t.a
}

func (t *T) Set(a int) int {
	t.a = a
	return t.a
}
```

> 将 receiver 参数以`第 1 个参数`的身份并入方法的参数列表中，可以`等价转换`为普通函数

```go
func Get(t T) int {
	return t.a
}

func Set(t *T, a int) int {
	t.a = a
	return t.a
}
```

> `方法类型`为经过`等价转换`后的普通函数的`函数类型`，但这种等价转换是由`编译器`在编译和生成代码时`自动完成`的

> 方法表达式 - `Method Expression` - 类似于 Java 的`反射`

```go
func main() {
	var t T
	t.Get()
	t.Set(1)

	// Method Expression
	T.Get(t)        // 类型 T 只能调用 T 的方法集合中的方法
	(*T).Set(&t, 1) // 类型 *T 只能调用 *T 的方法集合中的方法
}
```

> 本质：以 `receiver` 参数作为`第 1 个参数`的`普通函数`

```go
func main() {
	var t T

	f1 := (*T).Set
	f2 := T.Get

	fmt.Printf("%T\n", f1) // func(*main.T, int) int
	fmt.Printf("%T\n", f2) // func(main.T) int

	f1(&t, 3)
	fmt.Println(f2(t)) // 3
}
```

# 实践

```go
type field struct {
	name string
}

func (p *field) print() {
	fmt.Println(p.name)
}

func main() {
	data1 := []*field{{"one"}, {"two"}, {"three"}}
	for _, v := range data1 {
		go v.print()
	}
	// Output:
	//	three
	//	two
	//	one

	data2 := []field{{"four"}, {"five"}, {"six"}}
	for _, v := range data2 {
		go v.print()
	}
	// Output:
	//	six
	//	six
	//	six

	time.Sleep(3 * time.Second)
}
```

> 等价转换

```go
func main() {
	data1 := []*field{{"one"}, {"two"}, {"three"}}
	for _, v := range data1 {
		go (*field).print(v) // 值拷贝的是每个元素的地址
	}
	// Output:
	// 	one
	// 	two
	// 	three

	data2 := []field{{"four"}, {"five"}, {"six"}}
	for _, v := range data2 { // 循环变量复用
		fmt.Printf("%p = %v\n", &v, v)
		go (*field).print(&v) // 值拷贝的是 v 的地址，而 v 的地址是不变的，但值是迭代变化的
	}
	// Output:
	//	0x14000010270 = {four}
	//	0x14000010270 = {five}
	//	0x14000010270 = {six}
	// 	six
	// 	six
	// 	six

	time.Sleep(3 * time.Second)
}
```

> 修改：将 `receiver` 类型从 `*field` 改为 `field`

```go
type field struct {
	name string
}

func (p field) print() {
	fmt.Println(p.name)
}

func main() {
	data1 := []*field{{"one"}, {"two"}, {"three"}}
	for _, v := range data1 {
		go v.print()
		// go field.print(*v) // 等价转换，无需取址
	}
	// Output:
	//	one
	//	two
	//	three

	data2 := []field{{"four"}, {"five"}, {"six"}}
	for _, v := range data2 {
		go v.print()
		// go field.print(v) // 等价转换，无需取址
	}
	// Output:
	//  four
	//  five
	//  six

	time.Sleep(3 * time.Second)
}
```

> 由于`循环变量`是`复用`的，要警惕出现 `&{循环变量}` 的场景
