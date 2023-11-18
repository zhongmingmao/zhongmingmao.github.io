---
title: Go - receiver
mathjax: false
date: 2023-01-10 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-receiver.webp
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 影响

```go
func (t T) M1() <=> F1(t T)
func (t *T) M2() <=> F2(t *T)
```

| Method | Desc                                      |
| ------ | ----------------------------------------- |
| M1     | 基于`值拷贝`，传递的是 T 类型实例的`副本` |
| M2     | 基于`值拷贝`，传递的是 T 类型实例的`指针` |

<!-- more -->

```go
type T struct {
	a int
}

func (t T) M1() {
	t.a = -1
}

func (t *T) M2() {
	t.a += 1
}

func main() {
	var t T
	println(t.a) // 0

	t.M1()
	println(t.a) // 0

	t.M2()
	println(t.a) // 1

	p := &t

	p.M1()
	println(t.a) // 1

	p.M2()
	println(t.a) // 2
}
```

# 方法集合

> 方法集合决定了`接口实现`：用来判断一个类型`是否实现`了接口类型的`唯一手段`

```go
type Interface interface {
	M1()
	M2()
}

type T struct{}

func (t T) M1()  {}
func (t *T) M2() {}

func main() {
	var i Interface

	var p *T
	var t T

	i = p
	i = t
	//	cannot use t (type T) as type Interface in assignment:
	//		T does not implement Interface (M2 method has pointer receiver)
}
```

1. `任何`一个类型都有属于该类型的方法集合，对于`没有定义方法`的类型（如 int），对应的是`空方法集合`
2. `接口类型`只会列出`代表`接口的方法列表，而`不会具体定义`某个方法
   - 接口类型的方法集合就是它`方法列表`中的`所有方法`

> `*T` 类型的方法集合，包含所有以 `*T` 或者 `T` 为 receiver 参数类型的方法

> `T` 类型的方法集合，仅包含所有以 `T` 为 receiver 参数类型的方法

```go
func main() {

	var n int
	dumpMethodSet(n)
	dumpMethodSet(&n)

	var t T
	dumpMethodSet(t)
	dumpMethodSet(&t)
}

type T struct{}

func (T) M1() {}
func (T) M2() {}

func (*T) M3() {}
func (*T) M4() {}

func dumpMethodSet(i interface{}) {
	dumpType := reflect.TypeOf(i)

	if dumpType == nil {
		fmt.Printf("there is no type info for %v\n", i)
		return
	}

	n := dumpType.NumMethod()
	if n == 0 {
		fmt.Printf("no methods found for '%T'\n", i)
		return
	}

	fmt.Printf("Method set for '%T' (type %v):\n", i, dumpType)
	for i := 0; i < n; i++ {
		fmt.Printf("- %v\n", dumpType.Method(i).Name)
	}
	fmt.Println()
}

// Output:
//	no methods found for 'int'
//	no methods found for '*int'
//	Method set for 'main.T' (type main.T):
//	- M1
//	- M2
//
//	Method set for '*main.T' (type *main.T):
//	- M1
//	- M2
//	- M3
//	- M4
```

> T 类型的方法集合仅有 M1，而 Interface 的方法集合有 M1 和 M2，所以不匹配

```go
type Interface interface {
	M1()
	M2()
}

type T struct{}

func (t T) M1()  {}
func (t *T) M2() {}

func dumpMethodSet(i interface{}) {
	dumpType := reflect.TypeOf(i)

	if dumpType == nil {
		fmt.Printf("there is no type info for %v\n", i)
		return
	}

	n := dumpType.NumMethod()
	if n == 0 {
		fmt.Printf("no methods found for '%T'\n", i)
		return
	}

	fmt.Printf("Method set for '%T' (type %v):\n", i, dumpType)
	for i := 0; i < n; i++ {
		fmt.Printf("- %v\n", dumpType.Method(i).Name)
	}
	fmt.Println()
}

func main() {
	var i Interface

	var p *T
	var t T

	dumpMethodSet(i)
	dumpMethodSet(p)
	dumpMethodSet(t)

	i = p
	// i = t
	//	cannot use t (type T) as type Interface in assignment:
	//		T does not implement Interface (M2 method has pointer receiver)
}

// Output:
//	there is no type info for <nil>
//	Method set for '*main.T' (type *main.T):
//	- M1
//	- M2
//
//	Method set for 'main.T' (type main.T):
//	- M1
```

> 如果类型 T 的方法集合与接口类型 I 的方法集合`相同`或者是其`超集`，那么类型 T `实现`了接口 I

# 原则

## 第一原则

> 如果 Method 需要对 receiver 参数代表的类型实例进行`修改`，并`反映`到`原类型实例`上，选择 `*T`

```go
type T struct {
	a int
}

func (t T) M1() {
	t.a = 11
}

func (t *T) M2() {
	t.a = 12
}

func main() {
	var t T
	println(t.a) // 0
	t.M1()
	println(t.a) // 0
	t.M2()       // 编译器提供的语法糖，自动转换为(&t).M2()
	println(t.a) // 12

	var p = &T{}
	println(p.a) // 0
	p.M1()       // 编译器提供的语法糖，自动转换为(*p).M1()
	println(p.a) // 0
	p.M2()
	println(p.a) // 12
}
```

> `T` 类型实例或者 `*T` 类型实例，都可以调用所有 receiver 为 `T` 或者 `*T` 的 Method - `语法糖`

## 第二原则

1. 当`不需要`在 Method 中对类型实例进行`修改`时，一般会选择 `T` 类型 - 缩窄`接触面`
2. 如果 `receiver` 参数类型的 `size 较大`，基于`值拷贝`传递，会导致较大的`性能开销`，可以选择 `*T` 类型

## 第三原则

> 往往是`首要考虑`的原则 - `全局设计`

1. `*T` 的方法集合`包含`了 `T` 的方法集合
2. 如果 `T` 类型需要`实现某个接口`，那么就需要使用 `T` 作为 receiver 参数的类型

