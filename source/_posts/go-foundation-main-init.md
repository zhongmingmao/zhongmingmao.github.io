---
title: Go - Main + Init
mathjax: false
date: 2022-12-20 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/goinit.png
categories:
  - Go
tags:
  - Go
  - Cloud Native
---

# main.main

> `main 包`中的 `main 函数` - 所有`可执行程序`的`用户层`执行逻辑的`入口函数`

```go
package main

// 无参数 + 无返回值
func main() {
  // 用户层执行逻辑
}
```

<!-- more -->

> 可执行程序的 `main 包必须定义 main 函数`，否则会编译报错
> function main is undeclared in the main package

```go main.go
package main
```

```
$ go build main.go
# command-line-arguments
runtime.main_main·f: function main is undeclared in the main package
```

1. 在启动了多个 `goroutine` 的 Go 应用中，`main.main` 将在 Go 应用的`主 goroutine` 中执行
2. `main.main` 函数`返回`意味着整个 Go 程序`结束`
3. 除了 `main 包`外，其它包也可以拥有自己的 `main 函数`
   - 但依据 Go 的`可见性`规则，`非 main 包`中的 `main 函数`仅限于`包内使用`

```go
package pkg1

import "fmt"

func Main() {
	main()
}

// 仅在包内可见
func main() {
	fmt.Println("main func for pkg1")
}
```

# init

> `Go 包`的初始化函数

```go
// 无参数 + 无返回值
func init() {
	// 包初始化逻辑
}
```

1. 如果 `main 包依赖的包`中定义了 `init 函数`，或者 `main 包自身`定义了 `init 函数`
   - Go 程序在`包初始化`的时候，会先自动调用 init 函数，都发生在 main 函数执行前
2. `不能显式调用 init 函数`，否则会编译报错

```go main.go
package main

import "fmt"

func init() {
	fmt.Println("init invoked")
}

func main() {
	init()
}
```

```
$ go build main.go
# command-line-arguments
./main.go:10:2: undefined: init
```

1. `Go 包`可以拥有`多个 init 函数`，每个组成 Go 包的 `Go 源文件`中，也可以定义`多个 init 函数`
2. 在初始化包时，Go 会按照一定的次序，`串行调用`这个包的 init 函数
   - `先传递给 Go 编译器`的源文件中的 init 函数，会先被执行
   - 同一个源文件中的多个 init 函数，会按`声明顺序`依次执行

## 初始化顺序

1. `Go 包`是`程序封装`的基本单元
   - 每个 Go 包可以理解为是一个`自治`，`封装良好`，对外部`暴露有限接口`的基本单元
2. 一个 Go 程序由一组 Go 包组成，程序的初始化 = Go 包的初始化

> `DFS`

![go-pkg-init](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-pkg-init.png)

```
$ tree go101
go101
├── go.mod
├── main.go
├── pkg1
│   └── pkg1.go
├── pkg2
│   └── pkg2.go
└── pkg3
    └── pkg3.go
```

1. main 包依赖 pkg1 包和 pkg2 包
2. pkg1 包和 pkg2 包依赖 pkg3 包（只会被初始化 1 次）

> `空导入`的方式可以触发`包的初始化`

```go main.go
package main

import (
	"fmt"
	_ "github.com/zhongmingmao/go101/pkg1"
	_ "github.com/zhongmingmao/go101/pkg2"
)

var (
	_  = constInitCheck()
	v1 = variableInit("v1")
	v2 = variableInit("v2")
)

const (
	c1 = "c1"
	c2 = "c2"
)

func constInitCheck() string {
	if c1 != "" {
		fmt.Println("main: const c1 has been initialized")
	}
	if c2 != "" {
		fmt.Println("main: const c2 has been initialized")
	}
	return ""
}

func variableInit(name string) string {
	fmt.Printf("main: var %s has been initialized\n", name)
	return name
}

func init() {
	fmt.Println("main: first init func invoked")
}

func init() {
	fmt.Println("main: second init func invoked")
}

func main() {
	fmt.Println("main: main func invoked")
}
```

> 一个被多个包依赖的包仅会`初始化 1 次`

```
$ go build

$ ./go101
pkg3: const c1 has been initialized
pkg3: const c2 has been initialized
pkg3: var v1 has been initialized
pkg3: var v2 has been initialized
pkg3: first init func invoked
pkg3: second init func invoked
pkg1: const c1 has been initialized
pkg1: const c2 has been initialized
pkg1: var v1 has been initialized
pkg1: var v2 has been initialized
pkg1: first init func invoked
pkg1: second init func invoked
pkg2: const c1 has been initialized
pkg2: const c2 has been initialized
pkg2: var v1 has been initialized
pkg2: var v2 has been initialized
pkg2: first init func invoked
pkg2: second init func invoked
main: const c1 has been initialized
main: const c2 has been initialized
main: var v1 has been initialized
main: var v2 has been initialized
main: first init func invoked
main: second init func invoked
main: main func invoked
```

> Go 包初始化顺序

1. 依赖包`之间`按照`深度优先`的次序进行初始化
2. 依赖包`之内`按照`常量`、`变量`、`init 函数`的顺序进行初始化
3. 依赖包`之内`的`多个 init 函数`按照`声明次序`进行自动调用

## 用途

### 重置包级变量值

> 负责对包内部以及暴露到外部的包级数据（主要是`包级变量`）的初始状态进行`检查`

> flag 包定定义了一个 Exported 包级变量 CommandLine
> flag 包初始化时，包级变量 CommandLine 在 init 函数之前就被初始化了

```go flag.go
package flag

var CommandLine = NewFlagSet(os.Args[0], ExitOnError)

// CommandLine.Usage 被赋值了 defaultUsage
func NewFlagSet(name string, errorHandling ErrorHandling) *FlagSet {
	f := &FlagSet{
		name:          name,
		errorHandling: errorHandling,
	}
	f.Usage = f.defaultUsage
	return f
}

func (f *FlagSet) defaultUsage() {
	if f.name == "" {
		fmt.Fprintf(f.Output(), "Usage:\n")
	} else {
		fmt.Fprintf(f.Output(), "Usage of %s:\n", f.name)
	}
	f.PrintDefaults()
}
```

> flag 包的 init 函数提供了用户可以重置 CommandLine 的 Usage 字段的能力

```go
func init() {
	CommandLine.Usage = commandLineUsage
}

func commandLineUsage() {
	Usage()
}

var Usage = func() {
	fmt.Fprintf(CommandLine.Output(), "Usage of %s:\n", os.Args[0])
	PrintDefaults()
}
```

### 包级变量的复杂初始化

1. 有些包级变量需要一个比较复杂的初始化过程
2. 包级变量的`类型零值`（每个 `Go 类型`都有具有一个`零值定义`）或者简单初始化表达式不能满足需求

> http 包在 init 函数中，根据环境变量 GODEBUG，动态调整包级变量的初始化值

```go h2_bundle.go
var (
	http2VerboseLogs    bool
	http2logFrameWrites bool
	http2logFrameReads  bool
	http2inTests        bool
)

func init() {
	e := os.Getenv("GODEBUG")
	if strings.Contains(e, "http2debug=1") {
		http2VerboseLogs = true
	}
	if strings.Contains(e, "http2debug=2") {
		http2VerboseLogs = true
		http2logFrameWrites = true
		http2logFrameReads = true
	}
}
```

### 注册模式

> 以`空导入`的方式导入 `github.com/lib/pq`，main 函数中没有使用 pq 包的内容，但却可以访问 pq

```go
package main

import (
	"database/sql"
	_ "github.com/lib/pq"
)

func main() {
	db, err := sql.Open("postgres", "user=postgres password=postgres dbname=postgres sslmode=disable")
	if err != nil {
		return
	}

	_, err = db.Query("SELECT * FROM users")
	if err != nil {
		return
	}
}
```

> 原因在于 pq 包的 init 函数中

```go conn.go
func init() {
	sql.Register("postgres", &Driver{})
}
```

1. 空导入会触发依赖`包的初始化`（会执行 `init` 函数）
2. 通过在 init 函数中注册自身实现的模式，有效地降低了 Go 包对外的直接暴露
   - 尤其是`包级变量`的暴露，避免了外部通过包级变量对`包状态`的改动
3. 从 database/sql 包来看，注册模式实际上是`工厂模式`的实现，sql.Open 对应为`工厂方法`





