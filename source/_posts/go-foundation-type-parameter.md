---
title: Go - Type Parameter
mathjax: false
date: 2023-01-24 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-generics-01.webp
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 不支持

| Feature      | Desc                                                 |
| ------------ | ---------------------------------------------------- |
| 泛型特化     | 编写一个`泛型函数`针对某个具体类型的`特殊`版本       |
| 元编程       | 编写在`编译时`执行的代码来`生成`在`运行时`执行的代码 |
| 操作符方法   | 不能将`操作符`视为`方法`并自定义其实现               |
| 变长类型参数 |                                                      |

<!-- more -->

# 容器

## 重复代码

```go
func maxInt(sl []int) int {
	if len(sl) == 0 {
		panic("empty slice")
	}

	max := sl[0]
	for _, v := range sl[1:] {
		if v > max {
			max = v
		}
	}
	return max
}

func maxString(sl []string) string {
	if len(sl) == 0 {
		panic("empty slice")
	}

	max := sl[0]
	for _, v := range sl[1:] {
		if v > max {
			max = v
		}
	}
	return max
}
```

## any

```go
func maxAny(sl []any) any {
	if len(sl) == 0 {
		panic("empty slice")
	}

	max := sl[0]
	for _, v := range sl[1:] {
		switch v.(type) { // type switch
		case int:
			if v.(int) > max.(int) { // type assertion
				max = v
			}
		case string:
			if v.(string) > max.(string) {
				max = v
			}
		}
	}
	return max
}
```

```go builtin/builtin.go
// any is an alias for interface{} and is equivalent to interface{} in all ways.
type any = interface{}
```

> 缺陷

1. 基于 `type switch`，若要支持其它元素类型，需要`修改代码`，不符合`开闭原则`
2. 返回值为 `any`，调用者使用实际类型的值还需要通过 `type assertion` 转换
3. `any` 作为入参和返回值的元素类型，存在`装箱`和`拆箱`操作，存在`性能损耗`

```go
func BenchmarkMaxInt(b *testing.B) {
	sl := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 0}
	for i := 0; i < b.N; i++ {
		maxInt(sl)
	}
}

func BenchmarkMaxAny(b *testing.B) {
	sl := []any{1, 2, 3, 4, 5, 6, 7, 8, 9, 0}
	for i := 0; i < b.N; i++ {
		maxAny(sl)
	}
}
```

```
$ go test -v -bench .
goos: darwin
goarch: arm64
pkg: github.com/xxx/gc
BenchmarkMaxInt
BenchmarkMaxInt-10      296372949                4.052 ns/op
BenchmarkMaxAny
BenchmarkMaxAny-10      120496152                9.954 ns/op
PASS
ok      github.com/xxx/gc       3.822s
```

## 泛型

```go
type ordered interface {
	~int | ~int8 | ~int16 | ~int32 | ~int64 |
		~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 | ~uintptr |
		~float32 | ~float64 |
		~string
}

func maxGenerics[T ordered](sl []T) T {
	if len(sl) == 0 {
		panic("empty slice")
	}

	max := sl[0]
	for _, v := range sl[1:] {
		if v > max {
			max = v
		}
	}
	return max
}

type myString string

func main() {
	m := maxGenerics([]int{1, 2, 3, 4, 5})
	fmt.Printf("%T %v\n", m, m)                                              // int 5
	fmt.Println(maxGenerics([]int8{1, 2, 3, 4, 5}))                          // 5
	fmt.Println(maxGenerics([]myString{"11", "22", "44", "66", "77", "10"})) // 77
	fmt.Println(maxGenerics([]float64{1.1, 2.2, 3.3, 4.4, 5.5}))             // 5.5
}
```

> 性能要优于 any 版本

```
$ go test -v -bench .
goos: darwin
goarch: arm64
pkg: github.com/xxx/gc
BenchmarkMaxInt
BenchmarkMaxInt-10              293859739                4.052 ns/op
BenchmarkMaxAny
BenchmarkMaxAny-10              120446469                9.958 ns/op
BenchmarkMaxGenerics
BenchmarkMaxGenerics-10         214360436                5.602 ns/op
PASS
ok      github.com/xxx/gc       5.585s
```

# 类型参数

> Go 泛型方案的实质是对`类型参数`的支持

| Type                          | Desc                     |
| ----------------------------- | ------------------------ |
| `泛型函数` - generic function | 带有类型参数的函数       |
| `泛型类型` - generic type     | 带有类型参数的自定义类型 |
| `泛型方法` - generic method   | 与`泛型类型`绑定的的方法 |

## 泛型函数

> `[T ordered]` 为 Go 泛型的`类型参数列表`
> T 为类型参数，而 ordered 为`类型参数`的`类型约束`（type `constraint`）

```go
func maxGenerics[T ordered](sl []T) T {
	// ...
}
```

```go
func genericsFunc[T1 constraint1, ...Tn constraintN](ordinary parameters list) (return values list)
```

1. 函数一旦拥有`类型参数`，可以用该参数作为常规参数列表和返回值列表中修饰`参数`和`返回值`的类型
2. 类型参数的`名字`的`首字母`通常为`大写`，并且参数类型必须`具名`的
3. 在`同一个`类型参数列表中，类型参数的`名字`是`唯一`的

```go
func print[T any]() {} // ok

func print[any]() {} // syntax error: missing type constraint

func compare[T1 any, T1 comparable]() {} // T1 redeclared in this block
```

> 作用域（类型参数的`声明顺序`不会影响泛型函数的行为）

![image-20231204001928657](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231204001928657.png)

> 调用

1. 类型参数分为`类型形参`（type `parameter`）和`类型实参`（type `argument`）
2. 泛型函数中`声明`的类型参数为`类型形参`，实际`调用`泛型函数时`传递`（或者`编译器自动推导`）的类型为`类型实参`

```go
// 声明泛型函数：T 为类型形参
func maxGenerics[T ordered](sl []T) T

// 调用泛型函数：int8 为类型实参 - 显式传递
maxGenerics[int8]([]int8{1, 2, 3, 4, 5})

// 调用泛型函数：int 为类型实参 - 编译器自动推导
// 通过函数实参的类型来推断类型实参的类型
maxGenerics([]int{1, 2, 3, 4, 5})
```

![image-20231204173823411](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231204173823411.png)

> `自动推断`的前提：必须在函数的`参数列表`中使用了`类型形参`

```go
func foo[T comparable, E any](a int, s E) {}

func main() {
	foo[int](5, "hello")         // ok
	foo[int, string](5, "hello") // ok
	foo(5, "hello")              // cannot infer T
}
```

> 无法通过`返回值类型`来推断类型实参

```go
func foo[T any]() T {
	var t T
	return t
}

func main() {
	var a int = foo() // cannot infer T
	println(a)
}
```

### 调用过程

```go
maxGenerics([]int{1, 2, -4, -6, 7, 0})
```

![image-20231206220538145](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231206220538145.png)

1. Go 对泛型函数进行`实例化`（Instantiation）
   - 根据自动推断出的类型实参生成一个`新函数`
   - 在`编译阶段`完成，不会影响`运行时性能`
2. 然后调用新函数对输入的函数参数进行处理

```go
maxGenericsInt := maxGenerics[int]                                               // func([]int) int
fmt.Printf("%T %v\n", maxGenericsInt, maxGenericsInt([]int{1, 2, -4, -6, 7, 0})) // func([]int) int 7
```

> 使用`相同类型实参`对泛型函数进行调用，仅会`实例化一次`

## 泛型类型

> 在`类型声明`中带有`类型参数`的 Go 类型，一般形式如下

```go
type TypeName[T1 constraint1, ...Tn constraintN] TypeLiteral
```

```go
type ordered interface {
	~int | ~int8 | ~int16 | ~int32 | ~int64 |
		~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 | ~uintptr |
		~float32 | ~float64 |
		~string
}

type maximizableSlice[T ordered] struct {
	elems []T
}
```

> 类型参数的作用域

![image-20231208214912652](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231208214912652.png)

```go
type Set[T comparable] map[T]struct{}

type sliceFn[T any] struct {
	s   []T
	cmp func(T, T) bool
}

type node[K, V any] struct{}

type Map[K, V any] struct {
	root    *node[K, V]
	compare func(K, K) int
}

type element[T any] struct {
	next *element[T]
	val  T
}

type Number interface {
	~int | ~int8 | ~int16 | ~int32 | ~int64 |
		~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 | ~uintptr |
		~float32 | ~float64 |
		~complex64 | ~complex128
}

type NumericAbs[T Number] interface {
	Abs() T
}
```

> 泛型类型内部使用自身，注意`顺序`

```go
type P[T1, T2 any] struct {
	F *P[T1, T2] // OK
}

type P[T1, T2 any] struct {
	F *P[T2, T1] // 不符合泛型技术方案，但编译器并未报错
}
```

### 使用

```go
package main

import "fmt"

type ordered interface {
	~int | ~int8 | ~int16 | ~int32 | ~int64 |
		~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 | ~uintptr |
		~float32 | ~float64 |
		~string
}

type maximizableSlice[T ordered] struct {
	elems []T
}

func main() {
	sl := maximizableSlice[int]{
		elems: []int{1, 2, 3, 4, 5},
	}
	fmt.Printf("%T\n", sl) // main.maximizableSlice[int]
}
```

> `实例化`（Instantiation），根据传入的`类型实参`（int）生成一个`新类型`，并创建该类型的实例

```go
type maximizableIntSlice struct {
	elems []int
}
```

> 泛型类型尚`不`支持`自行推断`

```go
sl := maximizableSlice{ // cannot use generic type maximizableSlice[T ordered] without instantiation
  elems: []int{1, 2, 3, 4, 5},
}
```

### 类型别名

> 类型别名与其绑定的原类型`完全等价`，但仅限于原类型是一个`直接类型`，而非`泛型类型`

```go
type foo[T1 any, T2 comparable] struct {
	a T1
	b T2
}

type coo = foo[int, int] // ok，已经完成实例化

type bar = foo // cannot use generic type foo[T1 any, T2 comparable] without instantiation
```

> `泛型类型`只有在完成`实例化`后，才能用于`声明变量`，才能成为一个`直接类型`，才能被用于`类型别名`

```go
type fooInstantiation struct {
	a int
	b int
}
```

### 类型嵌入

> 可以在`泛型类型`定义中`嵌入普通类型`

```go
type Lockable[T any] struct {
	t T
	sync.Mutex
}

func (l *Lockable[T]) Get() T {
	defer l.Unlock()

	l.Lock()
	return l.t
}

func (l *Lockable[T]) Set(v T) {
	defer l.Unlock()

	l.Lock()
	l.t = v
}
```

> 可以将其它泛型类型`实例化`后的类型作为成员

```go
type Slice[T any] []T

func (s Slice[T]) String() string {
	if len(s) == 0 {
		return ""
	}

	var result = fmt.Sprintf("%v", s[0])
	for _, v := range s[1:] {
		result = fmt.Sprintf("%v, %v", result, v)
	}
	return result
}

type Lockable[T any] struct {
	sync.Mutex // type embedding
	Slice[int] // type embedding + generic type instantiation

	t T
}

func main() {
	n := Lockable[string]{
		t:     "hello",
		Slice: []int{1, 2, 3}, // 使用泛型类型名作为嵌入后的字段名
	}
	fmt.Println(n.String()) // 1, 2, 3
}
```

> 在普通类型定义中，可以使用`实例化`后的泛型类型作为成员

```go
type Slice[T any] []T

func (s Slice[T]) String() string {
	if len(s) == 0 {
		return ""
	}

	var result = fmt.Sprintf("%v", s[0])
	for _, v := range s[1:] {
		result = fmt.Sprintf("%v, %v", result, v)
	}
	return result
}

type Foo struct {
	Slice[int] // type embedding + generic type instantiation
}

func main() {
	f := Foo{
		Slice[int]{1, 2, 3, 4, 5},
	}
	fmt.Println(f.String()) // 1, 2, 3, 4, 5
}
```

> `类型嵌入`与`类型别名`类似，仅限于`实例化`后的`泛型类型`（成为`直接类型`，可以直接用于`声明变量`）

## 泛型方法

> `泛型类型`定义的方法称为`泛型方法`

```go
type ordered interface {
	~int | ~int8 | ~int16 | ~int32 | ~int64 |
		~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 | ~uintptr |
		~float32 | ~float64 |
		~string
}

type maximizableSlice[T ordered] struct {
	elems []T
}

func (sl *maximizableSlice[T]) max() T {
	if len(sl.elems) == 0 {
		panic("slice is empty")
	}

	max := sl.elems[0]
	for _, elem := range sl.elems[1:] {
		if elem > max {
			max = elem
		}
	}
	return max
}
```

> `泛型方法`自身`不支持类型参数`

```go
type ordered interface {
	~int | ~int8 | ~int16 | ~int32 | ~int64 |
	~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 | ~uintptr |
	~float32 | ~float64 |
	~string
}

type maximizableSlice[T ordered] struct {
	elems []T
}

func (sl *maximizableSlice[T]) max[E any](e E) T { // syntax error: method must have no type parameters
	if len(sl.elems) == 0 {
		panic("slice is empty")
	}

	max := sl.elems[0]
	for _, elem := range sl.elems[1:] {
		if elem > max {
			max = elem
		}
	}
	return max
}
```

> 在泛型方法中，receiver 的某个类型参数如果`没有使用`，可以标记为 `_`

```go
type foo[A comparable, B any] struct{}

func (foo[A, B]) M1() {} // ok

func (foo[A, _]) M2() {} // ok

func (foo[_, B]) M3() {} // ok

func (foo[_, _]) M4() {} // ok

func (foo[]) M5() {} // syntax error: unexpected ), expecting type
```

> 泛型方法中的 receiver 类型参数`名字`可以与泛型类型中的类型形参名不同，`位置`和`数量`对齐即可

```go
type foo[A comparable, B any] struct{}

func (foo[First, Second]) M1(a First, b Second) {} // ok
```

