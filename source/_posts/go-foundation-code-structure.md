---
title: Go - Code Structure
mathjax: false
date: 2022-12-16 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go04.png
categories:
  - Go
tags:
  - Go
  - Cloud Native
---

# 源文件

1. `Go 源文件`使用`全小写字母`形式的`短小单词`命名，并以 `.go` 扩展名结尾
   - 如果使用多个单词，将多个单词`直接连接`起来，而不使用其它分隔符
   - 即 `helloworld.go`，而非 `hello_world.go`
2. 尽量不要使用`两个以上单词组合`作为文件名，否则很难辨认

<!-- more -->

# Hello, World

```go
package main

import "fmt"

func main() {
	fmt.Println("Hello, World!")
}
```

```
$ tree
.
└── main.go

$ go build main.go

$ tree
.
├── main
└── main.go

$ ./main
Hello, World!
```

# 程序结构

```go
package main
```

1. `package` 是 Go 语言的`基本组成单位`，通常使用`单个小写单词`命名
2. 整个 Go 程序`仅允许存在一个 main 包`

```go main.go
import "fmt"

func main() {
	fmt.Println("Hello, World!")
}
```

1. 当运行一个`可执行`的 Go 程序时，`入口函数`都为 `main` 函数
2. `import "fmt"` - 包路径
   - 导入 `fmt` 包的`包路径`
   - 导入 `Go 标准库下的 fmt 目录下的包`
3. `fmt.Println` - 将字符串输出到`标准输出` - 包名
   - `Println` 函数位于 `Go 标准库`的 `fmt 包`中
   - `首字母大写`的标识符为 `Exported`，对`包外`代码可见，否则为仅`包内`可见
   - main 函数中的 fmt 是一个`限定标识符`（Qualified identifier）
4. `gofmt` - 标准 Go 代码风格使用 `TAB` 而不是空格来实现`缩进`

> import - `包路径`（唯一），函数内使用 - `包名`（不唯一）

```
$ ls  ~/.asdf/installs/golang/1.21.2/go/src/fmt
doc.go  errors.go  errors_test.go  example_test.go  export_test.go  fmt_test.go  format.go  gostringer_example_test.go  print.go  scan.go  scan_test.go  state_test.go  stringer_example_test.go  stringer_test.go

$ grep 'package '  ~/.asdf/installs/golang/1.21.2/go/src/fmt/*
~/.asdf/installs/golang/1.21.2/go/src/fmt/doc.go:and the package does not protect against them.
~/.asdf/installs/golang/1.21.2/go/src/fmt/doc.go:print routine, the fmt package reformats the error message
~/.asdf/installs/golang/1.21.2/go/src/fmt/doc.go:package fmt
~/.asdf/installs/golang/1.21.2/go/src/fmt/errors.go:package fmt
~/.asdf/installs/golang/1.21.2/go/src/fmt/errors_test.go:package fmt_test
~/.asdf/installs/golang/1.21.2/go/src/fmt/example_test.go:package fmt_test
~/.asdf/installs/golang/1.21.2/go/src/fmt/example_test.go:// rather than its value. The examples are not exhaustive; see the package comment
~/.asdf/installs/golang/1.21.2/go/src/fmt/export_test.go:package fmt
~/.asdf/installs/golang/1.21.2/go/src/fmt/fmt_test.go:package fmt_test
~/.asdf/installs/golang/1.21.2/go/src/fmt/format.go:package fmt
~/.asdf/installs/golang/1.21.2/go/src/fmt/gostringer_example_test.go:package fmt_test
~/.asdf/installs/golang/1.21.2/go/src/fmt/print.go:package fmt
~/.asdf/installs/golang/1.21.2/go/src/fmt/scan.go:package fmt
~/.asdf/installs/golang/1.21.2/go/src/fmt/scan.go:	// for the operation being performed; see the package documentation
~/.asdf/installs/golang/1.21.2/go/src/fmt/scan.go:	// performed; see the package documentation for more information.
~/.asdf/installs/golang/1.21.2/go/src/fmt/scan.go:// to avoid depending on package unicode.
~/.asdf/installs/golang/1.21.2/go/src/fmt/scan_test.go:package fmt_test
~/.asdf/installs/golang/1.21.2/go/src/fmt/state_test.go:package fmt_test
~/.asdf/installs/golang/1.21.2/go/src/fmt/stringer_example_test.go:package fmt_test
~/.asdf/installs/golang/1.21.2/go/src/fmt/stringer_test.go:package fmt_test
```

> `无法导入 main 包`，会编译报错 - `package main is not in std`

```go hello.go
package hello

import "main"
```

```
$ go build hello.go
hello.go:3:8: package main is not in std (~/.asdf/installs/golang/1.21.2/go/src/main)
```

> `Go 源文件`本身采用 `Unicode 字符集`，并采用 `UTF-8 字符编码`
> 与`编译`后的程序所运行环境所使用的`字符集`和`字符编码`是`一致`的

> 结尾标识符 - `;`

1. Go 语言规范，使用 `;` 作为结尾标识符
2. 大多数 `;` 是`可选`的，但在源码`编译`时，Go 编译器会`自动插入`这些被省略的 `;`

# Go Module

> Go 是一种`编译型语言`：将源码编译生成`可执行的二进制文件`，并运行在没有安装 Go 的环境中

> 依赖第三方库：fasthttp 和 zap

```go main.go
package main

import (
	"github.com/valyala/fasthttp"
	"go.uber.org/zap"
)

var logger *zap.Logger

func init() {
	logger, _ = zap.NewProduction()
}

func fastHTTPHandler(ctx *fasthttp.RequestCtx) {
	logger.Info("hello, go module", zap.ByteString("uri", ctx.RequestURI()))
}

func main() {
	fasthttp.ListenAndServe(":8081", fastHTTPHandler)
}
```

> 直接 go build，编译失败，提示缺少 go.mod 文件

> `Go Module` 是从 `Go 1.11` 正式引入的，用于解决 Go 项目复杂的`依赖`问题
> 从 `Go 1.16` 开始，成为`默认`的`包依赖管理机制`和`源码构建机制`

```
$ tree
.
└── main.go

$ go build main.go
main.go:4:2: no required module provides package github.com/valyala/fasthttp: go.mod file not found in current directory or any parent directory; see 'go help modules'
main.go:5:2: no required module provides package go.uber.org/zap: go.mod file not found in current directory or any parent directory; see 'go help modules'
```

> go.mod 存储了 `Go Module` 对`第三方依赖`的全部信息

```
$ go mod init github.com/zhongmingmao/hello-go
go: creating new go.mod: module github.com/zhongmingmao/hello-go
go: to add module requirements and sums:
	go mod tidy
	
$ tree
.
├── go.mod
└── main.go

$ cat go.mod
module github.com/zhongmingmao/hello-go

go 1.21.2
```

> `Module 是 Package 的集合` - 这些 Package 和 Module 一起`发布`和`分发`

> go.mod 所在的目录被称为`所声明的 Module` 的`根目录`

```go go.mod
module github.com/zhongmingmao/hello-go

go 1.21.2
```

1. `module path` - github.com/zhongmingmao/hello-go
2. module 隐含 `Namespace` 的概念
   - module 下每个 `package` 的 `import path`，都是由 `module path` 和 `package 所在的子目录`构成的
   - 即 `import path = module path + subdir`

> 再次执行 go build，编译依然失败

```
$ go build main.go
main.go:4:2: no required module provides package github.com/valyala/fasthttp; to add it:
	go get github.com/valyala/fasthttp
main.go:5:2: no required module provides package go.uber.org/zap; to add it:
	go get go.uber.org/zap
	
$ go get github.com/valyala/fasthttp
go: added github.com/andybalholm/brotli v1.0.5
go: added github.com/klauspost/compress v1.16.3
go: added github.com/valyala/bytebufferpool v1.0.0
go: added github.com/valyala/fasthttp v1.50.0

$ tree
.
├── go.mod
├── go.sum
└── main.go

$ cat go.mod
module github.com/zhongmingmao/hello-go

go 1.21.2

require (
	github.com/andybalholm/brotli v1.0.5 // indirect
	github.com/klauspost/compress v1.16.3 // indirect
	github.com/valyala/bytebufferpool v1.0.0 // indirect
	github.com/valyala/fasthttp v1.50.0 // indirect
)

$ cat go.sum
github.com/andybalholm/brotli v1.0.5 h1:8uQZIdzKmjc/iuPu7O2ioW48L81FgatrcpfFmiq/cCs=
github.com/andybalholm/brotli v1.0.5/go.mod h1:fO7iG3H7G2nSZ7m0zPUDn85XEX2GTukHGRSepvi9Eig=
github.com/klauspost/compress v1.16.3 h1:XuJt9zzcnaz6a16/OU53ZjWp/v7/42WcR5t2a0PcNQY=
github.com/klauspost/compress v1.16.3/go.mod h1:ntbaceVETuRiXiv4DpjP66DpAtAGkEQskQzEyD//IeE=
github.com/valyala/bytebufferpool v1.0.0 h1:GqA5TC/0021Y/b9FG4Oi9Mr3q7XYx6KllzawFIhcdPw=
github.com/valyala/bytebufferpool v1.0.0/go.mod h1:6bBcMArwyJ5K/AmCkWv1jt77kVWyCJ6HpOuEn7z0Csc=
github.com/valyala/fasthttp v1.50.0 h1:H7fweIlBm0rXLs2q0XbalvJ6r0CUPFWK3/bB4N13e9M=
github.com/valyala/fasthttp v1.50.0/go.mod h1:k2zXd82h/7UZc3VOdJ2WaUqt1uZ/XpXAfE9i+HBC3lA=

$ go build main.go
main.go:5:2: no required module provides package go.uber.org/zap; to add it:
	go get go.uber.org/zap
```

> 自动添加依赖
>
> 1. go.mod 记录了`直接依赖`和`间接依赖`的包的信息
> 2. go.sum 记录了`直接依赖`和`间接依赖`的包的相关版本的哈希值，用于`构建时校验本地包的真实性`

```
$ go mod tidy
go: finding module for package go.uber.org/zap
go: found go.uber.org/zap in go.uber.org/zap v1.26.0

$ cat go.mod
module github.com/zhongmingmao/hello-go

go 1.21.2

require (
	github.com/valyala/fasthttp v1.50.0
	go.uber.org/zap v1.26.0
)

require (
	github.com/andybalholm/brotli v1.0.5 // indirect
	github.com/klauspost/compress v1.16.3 // indirect
	github.com/valyala/bytebufferpool v1.0.0 // indirect
	go.uber.org/multierr v1.10.0 // indirect
)

$ cat go.sum
github.com/andybalholm/brotli v1.0.5 h1:8uQZIdzKmjc/iuPu7O2ioW48L81FgatrcpfFmiq/cCs=
github.com/andybalholm/brotli v1.0.5/go.mod h1:fO7iG3H7G2nSZ7m0zPUDn85XEX2GTukHGRSepvi9Eig=
github.com/davecgh/go-spew v1.1.1 h1:vj9j/u1bqnvCEfJOwUhtlOARqs3+rkHYY13jYWTU97c=
github.com/davecgh/go-spew v1.1.1/go.mod h1:J7Y8YcW2NihsgmVo/mv3lAwl/skON4iLHjSsI+c5H38=
github.com/klauspost/compress v1.16.3 h1:XuJt9zzcnaz6a16/OU53ZjWp/v7/42WcR5t2a0PcNQY=
github.com/klauspost/compress v1.16.3/go.mod h1:ntbaceVETuRiXiv4DpjP66DpAtAGkEQskQzEyD//IeE=
github.com/pmezard/go-difflib v1.0.0 h1:4DBwDE0NGyQoBHbLQYPwSUPoCMWR5BEzIk/f1lZbAQM=
github.com/pmezard/go-difflib v1.0.0/go.mod h1:iKH77koFhYxTK1pcRnkKkqfTogsbg7gZNVY4sRDYZ/4=
github.com/stretchr/testify v1.8.1 h1:w7B6lhMri9wdJUVmEZPGGhZzrYTPvgJArz7wNPgYKsk=
github.com/stretchr/testify v1.8.1/go.mod h1:w2LPCIKwWwSfY2zedu0+kehJoqGctiVI29o6fzry7u4=
github.com/valyala/bytebufferpool v1.0.0 h1:GqA5TC/0021Y/b9FG4Oi9Mr3q7XYx6KllzawFIhcdPw=
github.com/valyala/bytebufferpool v1.0.0/go.mod h1:6bBcMArwyJ5K/AmCkWv1jt77kVWyCJ6HpOuEn7z0Csc=
github.com/valyala/fasthttp v1.50.0 h1:H7fweIlBm0rXLs2q0XbalvJ6r0CUPFWK3/bB4N13e9M=
github.com/valyala/fasthttp v1.50.0/go.mod h1:k2zXd82h/7UZc3VOdJ2WaUqt1uZ/XpXAfE9i+HBC3lA=
go.uber.org/goleak v1.2.0 h1:xqgm/S+aQvhWFTtR0XK3Jvg7z8kGV8P4X14IzwN3Eqk=
go.uber.org/goleak v1.2.0/go.mod h1:XJYK+MuIchqpmGmUSAzotztawfKvYLUIgg7guXrwVUo=
go.uber.org/multierr v1.10.0 h1:S0h4aNzvfcFsC3dRF1jLoaov7oRaKqRGC/pUEJ2yvPQ=
go.uber.org/multierr v1.10.0/go.mod h1:20+QtiLqy0Nd6FdQB9TLXag12DsQkrbs3htMFfDN80Y=
go.uber.org/zap v1.26.0 h1:sI7k6L95XOKS281NhVKOFCUNIvv9e0w4BF8N3u+tCRo=
go.uber.org/zap v1.26.0/go.mod h1:dtElttAiwGvoJ/vj4IwHBS/gXsEu/pZ50mUIRWuG0so=
gopkg.in/yaml.v3 v3.0.1 h1:fxVm/GzAzEWqLHuvctI91KS9hhNmmWOoWu0XTYJS7CA=
gopkg.in/yaml.v3 v3.0.1/go.mod h1:K4uyk7z7BCEPqu6E+C64Yfv1cQ7kz7rIZviUmN+EgEM=
```

> 再次执行 go build，编译成功

```
$ go build main.go

$ ./main
{"level":"info","ts":1696845822.6850991,"caller":"hello-go/main.go:15","msg":"hello, go module","uri":"/health"}

$ curl http://127.0.0.1:8081/health
```
