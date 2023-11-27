---
title: Go - 1.17
mathjax: false
date: 2023-01-19 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-1.17.png
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 语法特性

## 切片 -> 数组指针

> `数组切片化`，转换后，数组将成为切片的`底层数组`

```go
a := [3]int{11, 12, 13}
sl := a[:]
sl[1] += 10
fmt.Printf("%T, %v\n", sl, sl) // []int, [11 22 13]
```

<!-- more -->

> 在 Go `1.17` 之前，不支持将`切片`转换为`数组`类型，仅可以通过 `unsafe` 包以`不安全`的方式实现转换
> `unsafe` 包的`安全性`没有得到`编译器`和`运行时`的`保证`，尽量不要使用

```go
sl := []int{11, 12, 13}
var p = (*[3]int)(unsafe.Pointer(&sl[0]))
p[1] += 10
fmt.Printf("%v\n", sl) // [11 22 13]
```

> 从 Go 1.17 开始，支持从`切片`转换为`数组类型指针`

```go
sl := []int{11, 12, 13}
var p = (*[3]int)(sl)
p[1] += 10
fmt.Printf("%v\n", sl) // [11 22 13]
```

> Go 会通过`运行时`而非`编译器`去对转换代码进行检查，如果发现`越界`行为，触发运行时 `panic`
> 检查原则：`转换后的数组长度不能大于原切片的长度（len）` - 为了防止数组`越界`

```go
sl := []int{11, 12, 13}

var p1 = (*[4]int)(sl)     // panic: runtime error: cannot convert slice with length 3 to pointer to array with length 4
var p2 = (*[3]int)(sl[:1]) // panic: runtime error: cannot convert slice with length 1 to pointer to array with length 3
```

```go
sl := []int{11, 12, 13}

fmt.Printf("%v\n", *(*[0]int)(sl)) // []
fmt.Printf("%v\n", *(*[1]int)(sl)) // [11]
fmt.Printf("%v\n", *(*[2]int)(sl)) // [11 12]
fmt.Printf("%v\n", *(*[3]int)(sl)) // [11 12 13]
fmt.Printf("%v\n", *(*[4]int)(sl)) // panic: runtime error: cannot convert slice with length 3 to pointer to array with length 4
```

> `nil 切片`或者 cap 为 0 的`空切片`，都可以被转换为 `*[0]int`

```go
var s1 []int                      // nil slice
fmt.Printf("%T\n", (*[0]int)(s1)) // *[0]int

var s2 = []int{}                  // empty slice
fmt.Printf("%T\n", (*[0]int)(s2)) // *[0]int
```

# Go Module

1. `complete` module graph
   - 在 Go 1.17 之前，某个 Module 的依赖图由该 Module 的`直接依赖`以及`所有间接依赖`组成
   - 无论某个间接依赖是否真正为原 Module 的构建做出贡献，Go 命令在解决依赖时都会读取`每个依赖`的 `go.mod`
2. `pruned` module graph
   - 从 Go 1.17 开始，在 `complete` module graph 的基础上，`裁剪`那些`对构建完全没有贡献`的`间接依赖`
   - 使用 `pruned` module graph 进行`构建`，Go 命令不会去获取`不相关`的依赖关系，`节省时间`

![image-20231127225220973](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231127225220973.png)

> Go 1.17 之前建立的 Go Module
> 在 go.mod 经过 `go mod tidy` 后， `require` 仅保留的都是 main module 的`直接依赖`（没有间接依赖）

```
module example.com/lazy

go 1.15

require example.com/a v0.1.0 // 核心

replace (
	example.com/a v0.1.0 => ./a
	example.com/b v0.1.0 => ./b
	example.com/c v0.1.0 => ./c1
	example.com/c v0.2.0 => ./c2
)
```

```
$ go mod graph
example.com/lazy example.com/a@v0.1.0
example.com/a@v0.1.0 example.com/b@v0.1.0
example.com/a@v0.1.0 example.com/c@v0.1.0
```

> 移除 `example.com/c v0.1.0 => ./c1`，构建失败

```
$ go build
go: example.com/a@v0.1.0 requires
	example.com/c@v0.1.0: missing go.sum entry; to add it:
	go mod download example.com/c
go: example.com/a@v0.1.0 requires
	example.com/c@v0.1.0: missing go.sum entry; to add it:
	go mod download example.com/c
```

> 修改 go.mod，将 `go 1.15` 修改为 `go 1.17`，执行 `go mod tidy` 重新构建 `go.mod`，新增记录了`间接依赖`

```
module example.com/lazy

go 1.17

require example.com/a v0.1.0

require example.com/b v0.1.0 // indirect

replace (
	example.com/a v0.1.0 => ./a
	example.com/b v0.1.0 => ./b
	example.com/c v0.1.0 => ./c1
	example.com/c v0.2.0 => ./c2
)
```

> 移除 `example.com/c v0.1.0 => ./c1`，构建成功

1. module c 并没有为 main module 的构建提供`代码级贡献`，Go 命令将其从 main module 的依赖图中`裁剪`了
2. 副作用：`go.mod` 的 `size 变大`
   - 从 Go `1.17` 开始，每次调用 `go mod tidy`，都会对 main module 的依赖做一次`深度扫描`
   - 并将 main module 的`所有直接和间接依赖`都记录在 `go.mod`，并存放在不同的 `require` 块中

> go `install` golang.org/x/exp/cmd/txtar@`latest`

