---
title: Go - nil
mathjax: false
date: 2023-01-13 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-nil.png
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 接口类型

## 静态特性

> `接口类型变量`具有`静态类型`

> 在`编译`阶段保证灵活性的`安全`

```go
func main() {
	var err error = 1 // err 的静态类型为 error
	//	cannot use 1 (type int) as type error in assignment:
	//		int does not implement error (missing Error method)
}
```

1. 编译器会在`编译阶段`对所有`接口类型变量`的`赋值操作`进行`类型检查`
2. 如果右值的类型没有实现接口`方法集合`中的`所有方法`，会`编译报错`

<!-- more -->

## 动态特性

> `接口类型变量`在`运行时`存储了右值的`真实类型信息`（即接口类型变量的`动态类型`）

> 拥有与`动态语言`相近的`灵活性`

```go
var err error
err = errors.New("this is an error")
fmt.Printf("%T\n", err) // *errors.errorString
```

```go errors/errors.go
func New(text string) error {
	return &errorString{text}
}
```

# Duck Typing

1. 接口类型变量在`运行时`可以被赋值为不同的`动态类型变量`
   - 每次赋值后，接口类型变量中`存储`的`动态类型信息`都会发生变化
2. Duck Typing
   - 某类型所表现出来的`特性`，并非由其`基因`决定的，而是由类型所表现出来的`行为`决定的

```go
package main

import "fmt"

type Human interface {
	Run()
}

type Man struct{}

func (m Man) Run() {
	println("man run")
}

type Woman struct{}

func (w Woman) Run() {
	println("woman run")
}

func HumanRun(h Human) {
	// 接口类型变量 h 中会存储的动态类型信息
	fmt.Printf("%T\n", h)
	h.Run() // 根据实际的动态类型，调用对应的方法
}

func main() {
	// Man 和 Woman 都是 Duck Type，本身没啥联系，只是都实现了 Run 方法，满足 Human 接口
	animals := []Human{new(Man), new(Woman)}
	for _, human := range animals {
		HumanRun(human)
	}
	// Output:
	//	*main.Man
	//	man run
	//	*main.Woman
	//	woman run
}
```

# nil != nil

```go
type MyError struct {
	error // type embedding
}

var ErrBad = MyError{
	error: errors.New("bad thing happened"),
}

func bad() bool {
	return false
}

func returnsError() error {
	var p *MyError = nil
	if bad() {
		p = &ErrBad
	}

	// === 等价
	var e error         // 非空接口类型
	e = (*MyError)(nil) // 已经有 MyError 类型，tab 不为空，data 为空
	println(e)          // (0x1003ba488,0x0)
	// ===

	return p
}

func main() {
	err := returnsError()
	println(err) // (0x1003ba488,0x0) != (0x0,0x0)

	if err != nil {
		fmt.Printf("error occur: %+v\n", err) // error occur: <nil>
		return
	}
	fmt.Println("no error")
}
```

# 内部表示

> 在`运行时`层面，接口类型变量有`两种`内部表示（用于不同的接口类型变量）

```go runtime/runtime2.go
type eface struct {
	_type *_type
	data  unsafe.Pointer
}

type iface struct {
	tab  *itab
	data unsafe.Pointer
}
```

> data ：指向当前赋值给该接口类型变量的`动态类型变量的值`

| Runtime                   | Desc                                                         |
| ------------------------- | ------------------------------------------------------------ |
| `eface` - empty interface | 用于表示没有方法的`空接口类型`变量，即 `interface{}` 类型变量 |
| `iface`                   | 用于表示拥有方法的接口类型变量                               |

1. `tab` 和 `_type` 可以统一看作`动态类型的信息`
2. Go 中`每种类型`都会有`唯一`的 `_type` 信息，无论是`内置原生类型`，还是`自定义类型`

   - Go `运行时`会为程序内的`全部类型`建立`只读的共享 _type 信息表`

   - 拥有`相同动态类型`的同类接口变量的 `_type/tab` 信息是相同的
3. `data` 指向一个`动态分配`的内存空间（存储赋值给接口类型变量的`动态类型变量的值`）
4. `未显式初始化`的`接口类型变量`的值为 `nil`，即对应的 `_type/tab` 和 `data` 都为 `nil`

## eface

> `_type`：接口类型变量的`动态类型的信息`

```go runtime/type.go
type _type struct {
	size       uintptr
	ptrdata    uintptr // size of memory prefix holding all pointers
	hash       uint32
	tflag      tflag
	align      uint8
	fieldAlign uint8
	kind       uint8
	// function for comparing objects of this type
	// (ptr to object A, ptr to object B) -> ==?
	equal func(unsafe.Pointer, unsafe.Pointer) bool
	// gcdata stores the GC type data for the garbage collector.
	// If the KindGCProg bit is set in kind, gcdata is a GC program.
	// Otherwise it is a ptrmask bitmap. See mbitmap.go for details.
	gcdata    *byte
	str       nameOff
	ptrToThis typeOff
}
```

```go
package main

type T struct {
	n int
	s string
}

func main() {
	var t = T{
		n: 17,
		s: "hello, interface",
	}

	var ei interface{} = t // Go 运行时使用 eface 结构表示 ei
}
```

> `_type` 指向`动态类型` T 的`类型信息`，而 `data` 指向`动态类型` T 的`实例`

![image-20231119175801429](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231119175801429.png)

## iface

> 除了需要存储`动态类型信息`，还需要存储`接口本身的信息`，因此需要一个额外的结构体 `itab`

```go runtime/runtime2.go
type itab struct {
	inter *interfacetype
	_type *_type
	hash  uint32 // copy of _type.hash. Used for type switches.
	_     [4]byte
	fun   [1]uintptr // variable sized. fun[0]==0 means _type does not implement inter.
}
```

> `inter`：存储`接口类型自身的信息`

```go runtime/type.go
type interfacetype struct {
	typ     _type	// 类型信息
	pkgpath name	// 包路径名
	mhdr    []imethod	// 由接口方法集合组成的切片
}
```

> `_type`：存储该接口类型变量的`动态类型的信息`，与 eface 的语义一致

> `fun`：动态类型`已实现`的接口方法的`调用地址`数组

```go
package main

type NonEmptyInterface interface {
	M1()
	M2()
}

type T struct {
	n int
	s string
}

func (t T) M1() {}
func (t T) M2() {}

func main() {
	var t = T{
		n: 18,
		s: "hello, interface",
	}

	var i NonEmptyInterface = t // Go 运行时使用 iface 结构表示 i
}
```

![image-20231119180642209](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231119180642209.png)

# 等值比较

> 判断两个接口类型变量是否相同

1. 只需要判断 `_type/tab`  是否相同，以及 `data` 指针指向的内存空间所存储的`数据值`是否相同
2. 并非 data 指针的值相同，类似与 Java 的 `equals`

> 在`编译`阶段，编译器会根据要输出的`参数的类型`将 `println` 替换为`特定函数`

```go runtime/print.go
func printeface(e eface) {
	print("(", e._type, ",", e.data, ")")
}

func printiface(i iface) {
	print("(", i.tab, ",", i.data, ")")
}
```

## nil

```go
// nil 接口变量
var i interface{} // 空接口类型，采用 eface 结构
var err error     // 非空接口类型，采用 iface 结构

println(i)   // (0x0,0x0)
println(err) // (0x0,0x0)

println(i == nil)   // true
println(err == nil) // true
println(i == err)   // true
```

## 空接口

> 只有 `_type` 和 `data` 所指`数据内容`一致的情况下，才是`相等`的

```go
var eif1 interface{} // 空接口类型
var eif2 interface{} // 空接口类型
var n, m int = 17, 18

fmt.Printf("%p\n", &n) // 0x140000a6000
fmt.Printf("%p\n", &m) // 0x140000a6008

eif1 = n
eif2 = m

// _type 相同，但 data 指向的值不同
println(eif1)         // (0x1023a68e0,0x1400011ff30)
println(eif2)         // (0x1023a68e0,0x1400011ff28)
println(eif1 == eif2) // false

// _type 相同，并且 data 指向的值也相同，即便 data 指针的值不同
eif2 = 17             // 17 默认为 int
println(eif1)         // (0x1023a68e0,0x1400011ff30)
println(eif2)         // (0x1023a68e0,0x10239ab58)
println(eif1 == eif2) // true

// _type 不同，即便 data 指向的值相同
eif2 = int64(17)
println(eif1)         // (0x1023a68e0,0x1400011ff30)
println(eif2)         // (0x1023a69a0,0x10239ab58)
println(eif1 == eif2) // false
```

> Go 在创建 eface 时一般会为 data `重新分配`内存空间
> 将动态类型变量的值`复制`到这块内存空间，并将 data 指针`指向`这块内存空间

## 非空接口

> 只有 `tab` 和 `data` 所指`数据内容`一致的情况下，才是`相等`的

```go
type T int

func (t T) Error() string {
	return "bad things happened"
}

func main() {
	var err1 error // 非空接口类型
	var err2 error // 非空接口类型

	// tab 不为空，data 为空，不能与 nil(0x0,0x0) 相等
	err1 = (*T)(nil)
	println(err1)        // (0x104462478,0x0)
	println(err1 == nil) // false

	err1 = T(5)
	err2 = T(6)
	println(err1)         // (0x1044624b8,0x1044396f8)
	println(err2)         // (0x1044624b8,0x104439700)
	println(err1 == err2) // false

	err2 = fmt.Errorf("%d\n", 5)
	println(err1)         // (0x1044624b8,0x1044396f8)
	println(err2)         // (0x1044623f8,0x14000110220)
	println(err1 == err2) // false
}
```

## 空接口 vs 非空接口

>  `eface._type` 和 `iface.itab._type` 进行比较

```go
type T int

func (t T) Error() string {
	return "bad things happened"
}

func main() {
	var eif interface{} = T(5) // 空接口类型变量
	var err error = T(5)       // 非空接口类型变量

	println(eif)        // (0x104308e60,0x1042fe070)
	println(err)        // (0x104316b38,0x1042fe070)
	println(eif == err) // true

	err = T(6)
	println(eif)        // (0x104308e60,0x1042fe070)
	println(err)        // (0x104316b38,0x1042fe078)
	println(eif == err) // false
}
```

# boxing

> 装箱：将一个`值类型`转换成`引用类型`

> Go `接口类型`的装箱：创建 `eface` 或者 `iface` 的过程

```go main.go
package main

import "fmt"

type NonEmptyInterface interface {
	M1()
	M2()
}

type T struct {
	n int
	s string
}

func (T) M1() {}
func (T) M2() {}

func main() {
	var t = T{
		n: 17,
		s: "hello, interface",
	}

	var ei interface{}
	ei = t // boxing
	fmt.Println(ei)

	var i NonEmptyInterface
	i = t // boxing
	fmt.Println(i)
}
```

> 输出`汇编`代码

```
$ go tool compile -S main.go > main.s
```

>ei = t - `runtime.convT2E`
>将`任意类型`转换为一个 `eface`

```
	0x001c 00028 (main.go:25)	MOVD	$17, R0
	0x0020 00032 (main.go:25)	MOVD	R0, ""..autotmp_15-24(SP)
	0x0024 00036 (main.go:25)	MOVD	$go.string."hello, interface"(SB), R1
	0x002c 00044 (main.go:25)	MOVD	R1, ""..autotmp_15-16(SP)
	0x0030 00048 (main.go:25)	MOVD	$16, R2
	0x0034 00052 (main.go:25)	MOVD	R2, ""..autotmp_15-8(SP)
	0x0038 00056 (main.go:25)	MOVD	$type."".T(SB), R3
	0x0040 00064 (main.go:25)	MOVD	R3, 8(RSP)
	0x0044 00068 (main.go:25)	MOVD	$""..autotmp_15-24(SP), R3
	0x0048 00072 (main.go:25)	MOVD	R3, 16(RSP)
	0x004c 00076 (main.go:25)	PCDATA	$1, ZR
	0x004c 00076 (main.go:25)	CALL	runtime.convT2E(SB)
```

```go runtime/iface.go
func convT2E(t *_type, elem unsafe.Pointer) (e eface) {
	if raceenabled {
		raceReadObjectPC(t, elem, getcallerpc(), funcPC(convT2E))
	}
	if msanenabled {
		msanread(elem, t.size)
	}
	x := mallocgc(t.size, t, true)
	// TODO: We allocate a zeroed object only to overwrite it with actual data.
	// Figure out how to avoid zeroing. Also below in convT2Eslice, convT2I, convT2Islice.
	typedmemmove(t, x, elem)
	e._type = t
	e.data = x
	return
}
```

> i = t - `runtime.convT2I`
> 将任意类型转换为一个 `iface`

```
	0x0098 00152 (main.go:29)	MOVD	$17, R0
	0x009c 00156 (main.go:29)	MOVD	R0, ""..autotmp_15-24(SP)
	0x00a0 00160 (main.go:29)	MOVD	$go.string."hello, interface"(SB), R0
	0x00a8 00168 (main.go:29)	MOVD	R0, ""..autotmp_15-16(SP)
	0x00ac 00172 (main.go:29)	MOVD	$16, R0
	0x00b0 00176 (main.go:29)	MOVD	R0, ""..autotmp_15-8(SP)
	0x00b4 00180 (main.go:29)	MOVD	$go.itab."".T,"".NonEmptyInterface(SB), R0
	0x00bc 00188 (main.go:29)	MOVD	R0, 8(RSP)
	0x00c0 00192 (main.go:29)	MOVD	$""..autotmp_15-24(SP), R0
	0x00c4 00196 (main.go:29)	MOVD	R0, 16(RSP)
	0x00c8 00200 (main.go:29)	CALL	runtime.convT2I(SB)
```

```go runtime/iface.go
func convT2I(tab *itab, elem unsafe.Pointer) (i iface) {
	t := tab._type
	if raceenabled {
		raceReadObjectPC(t, elem, getcallerpc(), funcPC(convT2I))
	}
	if msanenabled {
		msanread(elem, t.size)
	}
	x := mallocgc(t.size, t, true)
	typedmemmove(t, x, elem)
	i.tab = tab
	i.data = x
	return
}
```

> 实现逻辑

1. 根据传入的类型信息（`convT2E` 的 `_type` 和 `convT2I` 的 `tab._type`）分配一块内存空间
   - 类型信息依赖于`编译器`的工作，因此 Go 是一门`运行时`和`编译器`紧密协作的一门语言
2. 并将 `elem` 指向的数据`拷贝`到新分配的内存空间
3. 最后传入的类型信息作为返回值结构体中的类型信息，返回值结构体中的 data 指向新分配的内存空间

> 经过装箱后，存放在新分配的内存空间中的数据与原变量`没有关系`了

```go
var n int = 61
var ei interface{} = n

fmt.Printf("%p\n", &n) // 0x14000130008
println(ei)            // (0x1045c28e0,0x1400012bf48)

n = 62
if i, ok := ei.(int); ok {
  println(i) // 61
}
```

> 装箱是一个有`性能损耗`的操作，Go 也在不断地对装箱操作进行`性能优化`

