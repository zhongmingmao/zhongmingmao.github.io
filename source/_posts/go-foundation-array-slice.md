---
title: Go - Array + Slice
mathjax: false
date: 2022-12-30 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/gophslice.svg
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 数组

## 逻辑定义

> Go 数组：一个`长度固定`，由`同构类型元素`组成的`连续序列`

```go
// 声明了一个数组变量 arr，其类型为 [5]int，其中元素的类型为 int，数组的长度为 5
var arr [5]int = [5]int{1, 2, 3, 4, 5}
fmt.Println(arr) // [1 2 3 4 5]
```

1. 数组元素的类型可以为`任意` Go 原生类型或者自定义类型
2. 数组的`长度`必须在`声明`数组变量时提供
   - Go 编译器需要在`编译阶段`就知道数组类型的长度（整型数字字面值 or 常量表达式）

<!-- more -->

> 如果两个数组类型的`元素类型 T` 和`数组长度 N` 都是一样的，那么两个`数组类型`是`等价`的

```go
func f(arr [5]int) {
}

func main() {
	var arr1 [5]int
	var arr2 [6]int
	var arr3 [5]string

	fmt.Printf("%T\n", arr1) // [5]int
	fmt.Printf("%T\n", arr2) // [6]int
	fmt.Printf("%T\n", arr3) // [5]string

	f(arr1)
	f(arr2) // cannot use arr2 (variable of type [6]int) as [5]int value in argument to f
	f(arr3) // cannot use arr3 (variable of type [5]string) as [5]int value in argument to f
}
```

## 内存表示

> Go `编译器`会为 Go 数组分配一整块可容纳所有元素的`连续`内存

![image-20231105170259094](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231105170259094.png)

## 数组长度

> 通过 `len` 函数获取一个数组变量的`长度`（元素数量），通过 `unsafe.SizeOf` 函数获取一个数组变量的`总大小 `

```go
arr := [5]int{1, 2, 3, 4, 5}
fmt.Printf("len: %v\n", len(arr))            // len: 5
fmt.Printf("size: %v\n", unsafe.Sizeof(arr)) // size: 40，在 64 bit 平台，int 为 8 Bytes
```

## 初始化

> 声明一个数组变量时，如果`不进行显式初始化`，那么数组中的元素值就是对应的`类型零值`

```go
var arr [5]int
fmt.Printf("len: %v, arr: %#v\n", len(arr), arr) // len: 5, arr: [5]int{0, 0, 0, 0, 0}

var sl []int
fmt.Printf("len: %v, sl: %#v\n", len(sl), sl) // len: 0, sl: []int(nil)
```

> 忽略数组长度，用 `...` 代替，Go `编译器`会根据数组初始化元素的个数，`自动计算`出数组长度

```go
var arr1 [5]int = [5]int{1, 2, 3, 4, 5}
var arr2 = [5]int{1, 2, 3, 4, 5}
var arr3 = [...]int{1, 2, 3, 4, 5} // 编译器自动计算

fmt.Printf("arr1 len: %v, type: %T\n", len(arr1), arr1) // arr1 len: 5, type: [5]int
fmt.Printf("arr2 len: %v, type: %T\n", len(arr2), arr2) // arr2 len: 5, type: [5]int
fmt.Printf("arr3 len: %v, type: %T\n", len(arr3), arr3) // arr3 len: 5, type: [5]int
```

> 对`稀疏数组`进行`显式初始化`，可以通过使用`下标赋值`的方式来简化代码

```go
var arr = [...]int{
  7: 39,
  9: 76,
}

fmt.Printf("%#v\n", arr)                                                       // [10]int{0, 0, 0, 0, 0, 0, 0, 39, 0, 76}
fmt.Printf("type: %T, len: %v, size: %v\n", arr, len(arr), unsafe.Sizeof(arr)) // type: [10]int, len: 10, size: 80
```

## 数组访问

> 通过`下标`（从 `0` 开始）访问元素，非常`高效`，不存在 `Go Runtime` 带来的`额外开销`

```go
var arr = [6]int{1, 2, 3, 4, 5, 6}
fmt.Println(arr[0], arr[5]) // 1 6
fmt.Println(arr[-1])        // invalid argument: index -1 (constant of type int) must not be negative
fmt.Println(arr[6])         // invalid argument: index 6 out of bounds [0:6]
```

## 多维数组

> 递归

```go
var mArr [2][3][4]int
```

![marr](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/marr.png)

1. 数组类型变量是一个`整体`，即一个数组变量表示的是整个数组

2. 在 C 语言中，`数组变量`可视为`指向数组第 1 个元素的指针`

3. 无论是参与`迭代`，或者作为实际`参数`传给一个`函数`或者`方法`

   - Go `传递数组`的方式都是纯粹的`值拷贝`，这会带来较大的`内存拷贝开销`

4. 避免`数组值拷贝`带来的`性能损耗`

   - 类 C：可以通过使用`指针` 的方式，来向`函数`传递数组

   - `切片`

# 切片

>  Go 中`最常用`的`同构`复合类型

## 数组缺陷

1. `固定`的元素个数
2. `值传递`的`开销`较大

## 长度

> 无需在声明时指定长度，切片的长度是`动态`的，随着切片中元素的个数的变化而变化

```go
var nums = []int{1, 2, 3, 4, 5, 6}
fmt.Printf("len: %v, cap: %v\n", len(nums), cap(nums)) // len: 6, cap: 6

nums = append(nums, 7)
fmt.Printf("len: %v, cap: %v\n", len(nums), cap(nums)) // len: 7, cap: 12
```

## 实现原理

> 切片在运行时其实是一个`三元组`结构

```go
type slice struct {
	array unsafe.Pointer
	len   int
	cap   int
}
```

| Field | Desc                                        |
| ----- | ------------------------------------------- |
| array | 指向`底层数组`的指针                        |
| len   | 切片的`长度`，即切片`当前元素的个数`        |
| cap   | 切片的`容量`，即`底层数组的长度`，cap ≥ len |

> Go `编译器`会`自动`为每个`新建的切片`，建立一个`底层数组`，默认`底层数组长度`与`切片初始元素个数`相同

![slice](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/slice.png)

## 创建切片

### make

> 通过 `make` 函数来创建切片，并指定`底层数组`的`长度`

```go
s := make([]byte, 6, 10)
fmt.Printf("%#v\n", s)                          // []byte{0x0, 0x0, 0x0, 0x0, 0x0, 0x0}
fmt.Printf("len: %d cap: %d\n", len(s), cap(s)) // len: 6 cap: 10
```

> 如果在 `make` 函数中没有指定 `cap` 参数，那么 `cap == len`

```go
s := make([]byte, 6)
fmt.Printf("%#v\n", s)                          // []byte{0x0, 0x0, 0x0, 0x0, 0x0, 0x0}
fmt.Printf("len: %d cap: %d\n", len(s), cap(s)) // len: 6 cap: 6
```

### from array

> 数组切片化：`array[low:high:max]`，`max` 的`默认值`为数组的`长度`，规则为`左闭右开`

```go
arr := [10]int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
sl := arr[3:7:9]

fmt.Printf("%#v\n", sl)                           // []int{4, 5, 6, 7}
fmt.Printf("len: %d cap: %d\n", len(sl), cap(sl)) // len: 4 cap: 6
```

> 切片 sl 的底层数组为 arr，修改切片 sl 中的元素将直接影响数组 arr

```go
sl[0] += 10
fmt.Printf("%#v\n", sl)  // []int{14, 5, 6, 7}
fmt.Printf("%#v\n", arr) // [10]int{1, 2, 3, 14, 5, 6, 7, 8, 9, 10}
```

1. 在 Go 中，`数组`更多承担`底层存储空间`的角色，`切片`为数组的`描述符`
2. 因此，切片在`函数参数传递`时可以避免较大的`性能开销`，传递的大小的`固定`的（`三元组`）

> 可以在`同一个`底层数组上建立多个切片（`共享`同一个底层数组）

```go
arr := [10]int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}

sl1 := arr[3:7:9]
sl2 := arr[1:4]

sl1[1] += 20
sl2[2] += 10

fmt.Printf("%#v\n", sl1) // []int{14, 25, 6, 7}
fmt.Printf("%#v\n", sl2) // []int{2, 3, 14}
fmt.Printf("%#v\n", arr) // [10]int{1, 2, 3, 14, 25, 6, 7, 8, 9, 10}
```

![image-20231105200719669](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231105200719669.png)

### from slice

> 原理与 from array 一样，共享`同一个底层数组`

```go
arr := [10]int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}

sl1 := arr[3:7:8]
sl2 := sl1[1:3] // max 的默认值为 sl1 的 max

fmt.Printf("len: %d, cap: %d, sl1: %#v\n", len(sl1), cap(sl1), sl1) // len: 4, cap: 5, sl1: []int{4, 5, 6, 7}
fmt.Printf("len: %d, cap: %d, sl2: %#v\n", len(sl2), cap(sl2), sl2) // len: 2, cap: 4, sl2: []int{5, 6}

sl1[2] += 10
sl2[0] += 20

fmt.Printf("%#v\n", sl1) // []int{4, 25, 16, 7}
fmt.Printf("%#v\n", sl2) // []int{25, 16}
fmt.Printf("%#v\n", arr) // [10]int{1, 2, 3, 4, 25, 16, 7, 8, 9, 10}
```

## 动态扩容

> 通过 `append` 操作向切片追加数据时
> 如果 `len == cap`，则 `Go Runtime` 会对这个切片做`动态扩容`（`重新分配底层数组`）

```go
var sl []int
fmt.Printf("len: %d, cap: %d, v: %#v\n", len(sl), cap(sl), sl) // len: 0, cap: 0, v: []int(nil)

sl = append(sl, 1)
fmt.Printf("len: %d, cap: %d\n", len(sl), cap(sl)) // len: 1, cap: 1

sl = append(sl, 2)
fmt.Printf("len: %d, cap: %d\n", len(sl), cap(sl)) // len: 2, cap: 2

sl = append(sl, 3)
fmt.Printf("len: %d, cap: %d\n", len(sl), cap(sl)) // len: 3, cap: 4

sl = append(sl, 4)
fmt.Printf("len: %d, cap: %d\n", len(sl), cap(sl)) // len: 4, cap: 4

sl = append(sl, 5)
fmt.Printf("len: %d, cap: %d\n", len(sl), cap(sl)) // len: 5, cap: 8
```

> 扩容系数为 `2`，新数组建立后，append 会把旧数组中的数据`拷贝`到新数组，旧数组会被 `GC` 掉

> 自动扩容 -> 解除绑定

```go
u := [...]int{1, 2, 3, 4, 5}
fmt.Println(u) // [1 2 3 4 5]

s := u[1:3]
fmt.Printf("len: %d, cap: %d, s: %#v\n", len(s), cap(s), s) // len: 2, cap: 4, s: []int{2, 3}

s = append(s, 14)
fmt.Printf("len: %d, cap: %d, s: %#v\n", len(s), cap(s), s) // len: 3, cap: 4, s: []int{2, 3, 14}

s = append(s, 15)
fmt.Printf("len: %d, cap: %d, s: %#v\n", len(s), cap(s), s) // len: 4, cap: 4, s: []int{2, 3, 14, 15}

s = append(s, 16)                                           // new array is created
fmt.Printf("len: %d, cap: %d, s: %#v\n", len(s), cap(s), s) // len: 5, cap: 8, s: []int{2, 3, 14, 15, 16}

s[0] = 12
fmt.Printf("len: %d, cap: %d, s: %#v\n", len(s), cap(s), s) // len: 5, cap: 8, s: []int{12, 3, 14, 15, 16}
fmt.Println(u)                                              // [1 2 3 14 15]
```

# 对比

> 大多数场合，使用`切片`替代数组

1. 切片作为数组的`描述符`，非常`轻量`
   - 无论绑定的底层数组多大，传递切片的`开销`都是`恒定可控`的
2. 切片 ＞ 数组指针
   - 切片支持`下标访问`、`边界溢出校验`、`动态扩容`等
   - 指针本身在 Go 是`受限`的，如不支持指针的`算术`运算
