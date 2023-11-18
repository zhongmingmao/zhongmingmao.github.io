---
title: Go - Type Embedding
mathjax: false
date: 2023-01-11 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231118185447664.png
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 类型嵌入

> 在一个类型的定义中嵌入其它类型

## 接口

> 语义：`方法集合并入`

> 接口类型声明了由一个`方法集合`代表的接口

```go
type E interface {
	M1()
	M2()
}

type I interface {
	M1()
	M2()
	M3()
}
```

<!-- more -->

> 完全`等价`：类型嵌入，新接口类型将嵌入的接口类型的方法集合，`并入`到自身的`方法集合`中 - `接口组合`

```go
type E interface {
	M1()
	M2()
}

type I interface {
	E
	M3()
}
```

> Go 标准库

```go io/io.go
type Reader interface {
	Read(p []byte) (n int, err error)
}

type Writer interface {
	Write(p []byte) (n int, err error)
}

type Closer interface {
	Close() error
}
```

```go io/io.go
type ReadWriter interface {
	Reader
	Writer
}

type ReadCloser interface {
	Reader
	Closer
}

type WriteCloser interface {
	Writer
	Closer
}

type ReadWriteCloser interface {
	Reader
	Writer
	Closer
}
```

> 在 Go `1.14` 之前：接口类型嵌入的接口类型的方法集合不能有`交集`，且嵌入的方法名字不能与新接口的其它方法`重名`

```go
package main

type I1 interface {
	M1()
}

type I2 interface {
	M1()
	M2()
}

type I3 interface {
	I1
	I2 //  duplicate method M1
}

type I4 interface {
	I2
	M2() // duplicate method M2
}

func main() {
}
```

> 从 Go `1.14 ` 开始，移除了上述约束

> `接口类型只能嵌入接口类型`

## 结构体

### Embedded Field

```go
type T1 int
type t2 struct {
	n int
	m int
}

type I interface {
	M1()
}

type S1 struct {
	T1  // 字段名为 T1，类型为 T1
	*t2 // 字段名为 t2，类型为 *t2
	I   // 字段名为 I，类型为 I

	a int
	b string
}
```

> 用法

```go
type MyInt int

func (n *MyInt) Add(m int) {
	*n += MyInt(m)
}

type t struct {
	a int
	b int
}

type S struct {
	*MyInt
	t
	io.Reader // 字段名为 Reader，类型为 io.Reader

	s string
	n int
}

func main() {
	m := MyInt(17)
	r := strings.NewReader("hello, go")
	s := S{
		MyInt:  &m,
		t:      t{a: 1, b: 2},
		Reader: r,

		s: "demo",
	}

	sl := make([]byte, len("hello, go"))
	_, _ = s.Reader.Read(sl)
	fmt.Println(string(sl)) // hello, go

	s.MyInt.Add(5)
	fmt.Println(*s.MyInt) // 22
}
```

### 约束

> 嵌入字段类型的`底层类型`不能为`指针`类型

```go
type MyInt *int

type S struct {
	MyInt // embedded type cannot be a pointer
}
```

> 嵌入字段的`名字`在结构体定义必须`唯一`，即同一个结构体中无法容纳`名字相同`的嵌入字段

```go
package a

type T struct {
}
```

```go
package b

type T struct {
}
```

```go
package main

type S struct {
	a.T
	b.T // duplicate field T
}
```

### 继承

> 实际为`组合`（代理）

```go
func main() {
	m := MyInt(17)
	r := strings.NewReader("hello, go")
	s := S{
		MyInt:  &m,
		t:      t{a: 1, b: 2},
		Reader: r,

		s: "demo",
	}

	sl := make([]byte, len("hello, go"))
	_, _ = s.Read(sl)       // s.Reader.Read(sl) -> s.Read(sl)
	fmt.Println(string(sl)) // hello, go

	s.Add(5)              // s.MyInt.Add(5) -> s.Add(5)
	fmt.Println(*s.MyInt) // 22
}
```

1. 通过结构体类型 S 的变量 s 调用 Read 方法
   - Go 发现结构体类型 S 自身并没有定义 Read 方法
   - Go 会查看 S 的`嵌入字段`对应的类型是否定义了 Read 方法
   - `s.Read` 会被`转换`为 `s.Reader.Read`
2. 嵌入字段 Reader 的 Read 方法被`提升`为 S 的方法，放入到了 S 的方法集合

```go
func main() {
	m := MyInt(17)
	r := strings.NewReader("hello, go")
	s := S{
		MyInt:  &m,
		t:      t{a: 1, b: 2},
		Reader: r,

		s: "demo",
	}

	sl := make([]byte, len("hello, go"))
	_, _ = s.Read(sl)       // s.Reader.Read(sl) -> s.Read(sl)
	fmt.Println(string(sl)) // hello, go

	s.Add(5)              // s.MyInt.Add(5) -> s.Add(5)
	fmt.Println(*s.MyInt) // 22

	printMethods(s)
}

func printMethods(i interface{}) {
	fmt.Println("== Methods ==")
	dump := reflect.TypeOf(i)
	for i := 0; i < dump.NumMethod(); i++ {
		fmt.Printf("%s\n", dump.Method(i).Name)
	}
}

// Output:
//	== Methods ==
//	Add
//	Read
```

> 实际为`组合`（`delegate`），S 只是一个`代理`

![image-20231118204707781](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231118204707781.png)

### 方法集合

> 结构体类型可以嵌入任意`自定义类型`或者`接口类型`

#### 接口

> 嵌入的接口类型的方法集合`并入`结构体类型 `T` 的方法集合（`*T` 类型的方法集合包含 `T` 类型的方法集合）

```go
type I interface {
	M1()
	M2()
}

type T struct {
	I
}

func (T) M3() {}

func dumpMethodSet(i interface{}) {
	fmt.Printf("== Methods of %T ==\n", i)
	dump := reflect.TypeOf(i)
	for i := 0; i < dump.NumMethod(); i++ {
		fmt.Printf("%s\n", dump.Method(i).Name)
	}
}

func main() {
	var t T
	var p *T

	dumpMethodSet(t)
	dumpMethodSet(p)
}

// Output:
//	== Methods of main.T ==
//	M1
//	M2
//	M3
//	== Methods of *main.T ==
//	M1
//	M2
//	M3
```

> 当`结构体`嵌入多个`接口类型`的方法集合存在`交集`时，`可能`会`编译报错`
> PS：接口类型嵌入接口类型，如果存在交集，从 Go 1.14 开始，不再编译报错

```go
type E1 interface {
	M1()
	M2()
	M3()
}

type E2 interface {
	M1()
	M2()
	M4()
}

type T struct {
	E1
	E2
}

func main() {
	t := T{}
	// t.M1() // ambiguous selector t.M1
	// t.M2() // ambiguous selector t.M2

	t.M4() // compile pass
}
```

1. 嵌入其它类型的结构体类型本身是一个`代理`
2. 在调用实例所代理的方法时，Go 会首先查看结构体`自身`是否实现了该方法
   - 如果实现了，Go 会`优先`使用结构体自身实现的方法
   - 如果没有实现，会查找结构体中`嵌入字段`的方法集合中，是否包含了该方法
3. 如果多个嵌入字段都包含了`同名方法`，即方法集合存在`交集`，此时`编译器`将`无法确定`使用哪个方法
4. 解决方案
   - 消除接口类型的方法集合存在`交集`的情况
   - 在结构体类型中新增`自身`的实现，让编译器优先选择结构体的实现

```go
type E1 interface {
	M1()
	M2()
	M3()
}

type E2 interface {
	M1()
	M2()
	M4()
}

type T struct {
	E1
	E2
}

func (T) M1() {
	fmt.Println("T.M1")
}
func (T) M2() {
	fmt.Println("T.M2")
}

func main() {
	t := T{}
	t.M1() // T.M1
	t.M2() // T.M2
}
```

> 简化`单元测试`的编写：结构体类型也是其内部嵌入的接口类型的一个`实现`

```go employee.go
package employee

type Result struct {
	Count int
}

func (r Result) Int() int {
	return r.Count
}

type Rows []struct{}

type Stmt interface {
	Close() error
	NumInput() int
	Exec(stmt string, args ...string) (Result, error)
	Query(args []string) (Rows, error)
}

// MaleCount 只使用了 Exec 方法
func MaleCount(s Stmt) (int, error) {
	result, err := s.Exec("select count(*) from employee_tab where gender=?", "1")
	if err != nil {
		return 0, err
	}

	return result.Count, nil
}
```

```go employee_test.go
package employee

import "testing"

// fakeStmtForMaleCount 实现了 Stmt 接口
type fakeStmtForMaleCount struct {
	Stmt
}

// Exec 实现了 Stmt 接口的 Exec 方法，优先选择
func (fakeStmtForMaleCount) Exec(stmt string, args ...string) (Result, error) {
	return Result{Count: 5}, nil
}

func TestEmployeeMaleCount(t *testing.T) {
	f := fakeStmtForMaleCount{}
	count, _ := MaleCount(f)
	if count != 5 {
		t.Errorf("MaleCount(f) = %d; want 5", count)
		return
	}
}
```

#### 结构体

```go
type T1 struct{}

func (T1) T1M1()   {}
func (*T1) PT1M2() {}

type T2 struct{}

func (T2) T2M1()   {}
func (*T2) PT2M2() {}

type T struct {
	T1
	*T2
}

func dumpMethodSet(i interface{}) {
	fmt.Printf("== Methods of %T ==\n", i)
	dump := reflect.TypeOf(i)
	for i := 0; i < dump.NumMethod(); i++ {
		fmt.Printf("%s\n", dump.Method(i).Name)
	}
	fmt.Println()
}

func main() {
	t := T{
		T1: T1{},
		T2: &T2{},
	}

	dumpMethodSet(t.T1)  // T1 的方法集合 = T1M1
	dumpMethodSet(&t.T1) // *T1 的方法集合 = T1M1 + PT1M2

	dumpMethodSet(*t.T2) // T2 的方法集合 = T2M1
	dumpMethodSet(t.T2)  // *T2 的方法集合 = T2M1 + PT2M2

	dumpMethodSet(t)  // T 的方法集合 = T1 的方法集合 + *T2 的方法集合 = (T1M1) + (T2M1 + PT2M2)
	dumpMethodSet(&t) // *T 的方法集合 = *T1 的方法集合 + *T2 的方法集合 = (T1M1 + PT1M2) + (T2M1 + PT2M2)
}

// Output:
//	== Methods of main.T1 ==
//	T1M1
//
//	== Methods of *main.T1 ==
//	PT1M2
//	T1M1
//
//	== Methods of main.T2 ==
//	T2M1
//
//	== Methods of *main.T2 ==
//	PT2M2
//	T2M1
//
//	== Methods of main.T ==
//	PT2M2
//	T1M1
//	T2M1
//
//	== Methods of *main.T ==
//	PT1M2
//	PT2M2
//	T1M1
//	T2M1
```

1. 结构体类型的方法集合`包含`嵌入的`接口类型`的方法集合
2. 当结构体类型 T 包含嵌入字段 E 时，`*T` 的方法集合要包含的是 `*E` 的方法集合（范围`更广`）

# 类型定义

## defined

> 通过`类型声明`语法声明的类型都被称为 `defined` 类型，新定义的 defined 类型与原 defined 类型为`不同类型`

```go
type I interface {
	M1()
	M2()
}

type T int

type NI I // 基于已存在的接口类型 I 创建新的 defined 接口类型
type NT T // 基于已存在的类型 T 创建新的 defined 类型
```

> 基于`接口类型`创建的 defined 接口类型的方法集合与原接口类型的方法集合`完全一致`

> `无隐式继承`：基于自定义`非接口类型`的 defined 类型的方法集合为`空`

```go
type T struct{}

func (t T) M1()  {}
func (t *T) M2() {}

// T1 不会继承 T 的方法，符合 T1 和 T 是不同类型的语义
type T1 T

func dumpMethodSet(i interface{}) {
	fmt.Printf("== Methods of %T ==\n", i)
	dump := reflect.TypeOf(i)
	for i := 0; i < dump.NumMethod(); i++ {
		fmt.Printf("%s\n", dump.Method(i).Name)
	}
}

func main() {
	var t T
	var pt *T
	var t1 T1
	var pt1 *T1

	dumpMethodSet(t) // M1
	dumpMethodSet(t1)

	dumpMethodSet(pt) // M1 + M2
	dumpMethodSet(pt1)
}

// Output:
//	== Methods of main.T ==
//	M1
//	== Methods of main.T1 ==
//	== Methods of *main.T ==
//	M1
//	M2
//	== Methods of *main.T1 ==
```

## alias

> 无论原类型是接口类型还是非接口类型，类型别名与原类型拥有`完全相同`的方法集合

```go
type T struct{}

func (t T) M1()  {}
func (t *T) M2() {}

type T1 = T

func dumpMethodSet(i interface{}) {
	fmt.Printf("== Methods of %T ==\n", i)
	dump := reflect.TypeOf(i)
	for i := 0; i < dump.NumMethod(); i++ {
		fmt.Printf("%s\n", dump.Method(i).Name)
	}
}

func main() {
	var t T
	var pt *T
	var t1 T1
	var pt1 *T1

	dumpMethodSet(t)  // M1
	dumpMethodSet(t1) // M1

	dumpMethodSet(pt)  // M1 + M2
	dumpMethodSet(pt1) // M1 + M2
}

// Output:
//	== Methods of main.T ==
//	M1
//	== Methods of main.T ==
//	M1
//	== Methods of *main.T ==
//	M1
//	M2
//	== Methods of *main.T ==
//	M1
//	M2
```

## 小结

> 是否继承

|            | defined | alias |
| ---------- | ------- | ----- |
| 接口类型   | Y       | Y     |
| 非接口类型 | `N`     | Y     |

1. 基于`非接口类型`的 `defined` 类型创建的新 defined 类型`不会继承`原类型的方法集合 - `符合语义`
2. 通过 `alias` 定义的新类型和原类型拥有`相同`的方法集合
