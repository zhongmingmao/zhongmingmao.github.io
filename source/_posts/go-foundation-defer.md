---
title: Go - defer
mathjax: false
date: 2023-01-08 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-defer.png
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# defer

1. `defer` 是 Go 提供的一种`延迟调用`机制，defer 的运作离不开`函数`
   - 只有`函数`或者`方法`内部才能使用 `defer`
   - defer 关键字后只能接受`函数`或者`方法`，被称为 `deferred 函数`
     - defer 将 deferred 函数`注册`到其所在的 `goroutine` 中，用于存放 deferred 函数的`栈数据结构`
     - 这些 deferred 函数将在执行 defer 的函数`退出前`，按 `LIFO` 的顺序被`调度`
2. `无论`执行到函数体尾部成功返回，还是在某个错误处理分支显式 return，或者出现 panic
   - 已经存储到 `deferred 函数栈`中的函数，`都会`被调度执行 - `收尾`

<!-- more -->

![image-20231112143950063](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231112143950063.png)

```go
package main

import "sync"

type Closable interface {
	Close()
}

type Resource struct {
}

func (r *Resource) Close() {
}

func OpenResource() *Resource {
	return &Resource{}
}

func main() {
	var mutex sync.Mutex
	mutex.Lock()
	defer mutex.Unlock()

	r1 := OpenResource()
	defer r1.Close()

	r2 := OpenResource()
	defer r2.Close()

	r3 := OpenResource()
	defer r3.Close()
}
```

# 经验

> defer 支持`任意`的`自定义`函数和方法，`返回值`会在 deferred 函数被调度执行时被`自动丢弃`
> defer 支持`部分内置函数`，可以使用一个包裹的`匿名函数`来解决

```go
package main

func bar() (int, int) {
	return 1, 2
}

func foo() {
	var cn chan int
	var sl []int
	var m = make(map[string]int, 10)
	m["a"] = 1
	m["b"] = 2
	var c = complex(1.0, -1.4)

	var sl1 []int

	defer bar()

	defer close(cn)
	defer copy(sl1, sl)
	defer delete(m, "a")
	defer print(1)
	defer println(1)
	defer panic(1)  // ok, but defer should not call panic() directly
	defer recover() // ok, but defer should not call recover() directly

	defer append(sl, 11)  // defer discards result of append(sl, 11)
	defer cap(sl)         // defer discards result of cap(sl)
	defer complex(2, -2)  // defer discards result of complex(2, -2)
	defer imag(c)         // defer discards result of imag(c)
	defer len(sl)         // defer discards result of len(sl)
	defer make([]int, 10) // defer discards result of make([]int, 10)
	defer new(*int)       // defer discards result of new(*int)
	defer real(c)         // defer discards result of real(c)
}

func main() {
	foo()
}
```

```go
package main

func bar() (int, int) {
	return 1, 2
}

func foo() {
	var cn chan int
	var sl []int
	var m = make(map[string]int, 10)
	m["a"] = 1
	m["b"] = 2
	var c = complex(1.0, -1.4)

	var sl1 []int

	defer bar()

	defer close(cn)
	defer copy(sl1, sl)
	defer delete(m, "a")
	defer print(1)
	defer println(1)
	defer panic(1)  // ok, but defer should not call panic() directly
	defer recover() // ok, but defer should not call recover() directly

	defer func() {
		_ = append(sl, 11)
	}()

	defer func() {
		_ = cap(sl)
	}()

	defer func() {
		_ = complex(2, -2)
	}()

	defer func() {
		_ = imag(c)
	}()

	defer func() {
		_ = len(sl)
	}()

	defer func() {
		_ = make([]int, 10)
	}()

	defer func() {
		_ = new(*int)
	}()

	defer func() {
		_ = real(c)
	}()
}

func main() {
	foo()
}
```

> defer 关键字后面的表达式，是在将 deferred 函数`注册`到 deferred 函数栈的时候进行`求值`

```go
func foo() {
	for i := 0; i < 3; i++ {
		defer fmt.Println(i) // 将 fmt.Println 注册到 deferred 函数栈时对 i 求值
	}
}

func main() {
	foo()
}

// Output:
// 	2
// 	1
// 	0
```

```go
func foo() {
	for i := 0; i < 3; i++ {
		defer func(n int) { // 将匿名函数注册到 deferred 函数栈时，对匿名函数的参数进行求值
			fmt.Println(n)
		}(i)
	}
}

func main() {
	foo()
}

// Output:
// 	2
// 	1
// 	0
```

```go
func foo() {
	for i := 0; i < 3; i++ {
		defer func() { // 将匿名函数 func(){...} 注册到 deferred 函数栈，调度执行时以闭包的方式访问包裹函数的变量 i
			fmt.Println(i) // Loop variables captured by 'func' literals in 'defer' statements might have unexpected values
		}()
	}
}

func main() {
	foo()
}

// Output:
// 	3
// 	3
// 	3
```

> 性能损耗 - Go `1.13` 之前性能开销较大，从 1.13 版本开始，对 defer 性能进行了多次优化，目前性能开销`很小`

```go
package main

import "testing"

func sum(max int) int {
	total := 0
	for i := 0; i < max; i++ {
		total += i
	}
	return total
}

func fooWithDefer() {
	defer func() {
		sum(1 << 4)
	}()
}

func fooWithoutDefer() {
	sum(1 << 4)
}

func BenchmarkFooWithDefer(b *testing.B) {
	for i := 0; i < b.N; i++ {
		fooWithDefer()
	}
}

func BenchmarkFooWithoutDefer(b *testing.B) {
	for i := 0; i < b.N; i++ {
		fooWithoutDefer()
	}
}
```

```
$ go version
go version go1.12.17 linux/amd64

$ go test -bench . defer_test.go
goos: linux
goarch: amd64
BenchmarkFooWithDefer-8      	30000000	        43.7 ns/op
BenchmarkFooWithoutDefer-8   	100000000	        10.1 ns/op
PASS
ok  	command-line-arguments	2.380s
```

```
$ go version
go version go1.21.4 linux/amd64

$ go test -bench . defer_test.go
goos: linux
goarch: amd64
cpu: Intel(R) Core(TM) i5-10210U CPU @ 1.60GHz
BenchmarkFooWithDefer-8      	165030348	         7.245 ns/op
BenchmarkFooWithoutDefer-8   	217873730	         5.482 ns/op
PASS
ok  	command-line-arguments	3.687s
```