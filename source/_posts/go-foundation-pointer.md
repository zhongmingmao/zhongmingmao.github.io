---
title: Go - Pointer
mathjax: false
date: 2023-01-26 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-pointer.webp
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 指针类型

1. 指针类型是`依托`某一类型而存在的
2. 对于某一类型 T，以 T 为`基类型`的指针类型为 `*T`
3. `unsafe.Pointer` 不需要基类型，用于表示一个`通用指针类型`
   - `任何指针类型`和 `unsafe.Pointer` 可以`相互显式转换`

```go
type T struct{}

func main() {
	var p *T
	var p1 = unsafe.Pointer(p) // 任意指针类型 -> unsafe.Pointer
	p = (*T)(p1)               // unsafe.Pointer -> 任意指针类型
}
```

<!-- more -->

> 如果`指针类型变量`没有被显式赋予初值，默认值为 `nil`

```go
type T struct{}

func main() {
	var p *T
	println(p == nil) // true
}
```

> 给指针类型变量赋值

```go
var a int = 13
var p *int = &a               // & 为取地址符号
fmt.Printf("%T, %v\n", p, *p) // *int, 13
```

> 如果类型`不匹配`（且不支持`显式转换`，除非用 `unsafe`），编译器会报错

```go
var b byte = 10
var p *int = &b // cannot use &b (value of type *byte) as type *int in variable declaration
```

# 内存分配

## 非指针

> 对于`非指针类型变量`，Go 在对应的内存单元中存放的是该变量的`值`

![image-20231210194709200](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231210194709200.png)

![image-20231210194834910](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231210194834910.png)

## 指针

> 对于`指针类型变量`，Go 在为其分配的内存单元中存储的是`地址`

![image-20231210195016125](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231210195016125.png)

> 指针类型变量的大小与`基类型大小`无关，而与`系统地址的表示长度`有关

```go
type foo struct {
	id   string
	age  int8
	addr string
}

func main() {
	var p1 *int
	var p2 *bool
	var p3 *byte
	var p4 *[20]int
	var p5 *foo
	var p6 unsafe.Pointer

	println(unsafe.Sizeof(p1)) // 8
	println(unsafe.Sizeof(p2)) // 8
	println(unsafe.Sizeof(p3)) // 8
	println(unsafe.Sizeof(p4)) // 8
	println(unsafe.Sizeof(p5)) // 8
	println(unsafe.Sizeof(p6)) // 8
}
```

```go unsafe/unsafe.go
func Sizeof(x ArbitraryType) uintptr
```

> 在 Go 中，`uintptr` 类型的大小就是`指针类型的大小`

```go builtin/builtin.go
// uintptr is an integer type that is large enough to hold the bit pattern of
// any pointer.
type uintptr uintptr
```

# 指针操作

## 解引用

> 可以通过指针`读取`或者`修改`其指向的内存单元所代表的`基类型变量`

```go
var a = 17
var p = &a
println(*p) // 17，* 表示解引用（dereference）
*p += 3
println(*p) // 20
```

![image-20231210200828028](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231210200828028.png)

## 地址

```go
fmt.Printf("%p\n", p) // 0x140000200a8
```

## 修改指向

```go
var a = 5
var b = 6

var p = &a
println(*p) // 5
p = &b      // 修改指向
println(*p) // 6
```

## 同一指向

> 多个指针变量可以指向同一个变量的内存单元

```go
var a = 5

var p1 = &a // 指向 a 所在的内存单元
var p2 = &a // 指向 a 所在的内存单元

*p1 += 5
println(*p2) // 10
```

# 二级指针

```go
a := 5
p1 := &a
println(*p1) // 5

b := 55
p2 := &b
println(*p2) // 55

pp := &p1
fmt.Printf("%T\n", pp) // **int
println(**pp)          // 5
pp = &p2
println(**pp) // 55
```

![image-20231210201918042](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231210201918042.png)

> 对二级指针解引用，得到的是一级指针

```go
a := 5
p1 := &a
println(*p1) // 5

b := 55
p2 := &b
println(*p2) // 55

pp := &p1
fmt.Printf("%T\n", pp) // **int

println(*pp == p1) // true
println(**pp == a) // true

pp = &p2
println(*pp == p2) // true
println(**pp == b) // true
```

> 场景：`跨函数`改变一个指针变量的`指向`

```go
func change(pp **int) {
	b := 55
	*pp = &b
}

func main() {
	a := 5
	p := &a
	println(*p) // 5
	change(&p)
	println(*p) // 55
}
```

![image-20231210202919978](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231210202919978.png)

# 主要用途

1. 在 Go `运行时`层面，尤其是`内存管理`和`垃圾回收`，只关心`指针`
2. Go 项目一般`比较少使用`指针
   - 因为 Go 提供了更灵活和高级的`复合类型`，并将使用指针的复杂性`隐藏`在`运行时`的实现层面
3. 指针的意义在于`可修改`
4. 指针的`传递开销`为 `O(1)`

# 使用限制

> Go 的目标之一是成为一门`安全`的编程语言

## 显式转换

> C

```c
#include <stdio.h>

int main() {
    int a = 0x12345678;
    int *p = &a;
    char *p1 = (char *) p; // ok, int * -> char *
    printf("%x\n", *p1); // 78
}
```

> Go

```go
func main() {
	a := 0x12345678
	pa := &a
	pb := (*byte)(pa) // cannot convert pa (variable of type *int) to type *byte
	fmt.Printf("0x%x\n", *pb)
}
```

> `unsafe` 编程需要开发者自己保证`内存安全`

```go
func main() {
	a := 0x12345678
	pa := &a
	pb := (*byte)(unsafe.Pointer(pa)) // 通过 unsafe.Pointer 桥接
	fmt.Printf("0x%x\n", *pb)         // 0x78
}
```

## 指针运算

> C

```c
int main() {
    int a[] = {1, 2, 3, 4, 5};
    int *p = &a[0];
    for (int i = 0; i < sizeof(a) / sizeof(a[0]); i++) {
        printf("%d\n", *(p++));
    }
}
```

> Go

```go
func main() {
	arr := [5]int{1, 2, 3, 4, 5}
	p := &arr[0]
	println(*p)
	p = p + 1 // cannot convert 1 (untyped int constant) to *int
	p++       // invalid operation: p++ (non-numeric type *int)
	println(*p)
}
```

> unsafe

```go
func main() {
	arr := [5]int{1, 2, 3, 4, 5}
	p := &arr[0]

	base := uintptr(unsafe.Pointer(p))
	size := unsafe.Sizeof(arr[0])

	var i uintptr
	for i = 0; i < uintptr(len(arr)); i++ {
		pi := (*int)(unsafe.Pointer(base + i*size)) // 编译器完全不介入，需要开发者明确告知编译器绝对的地址偏移量
		println(*pi)
	}
}
```

