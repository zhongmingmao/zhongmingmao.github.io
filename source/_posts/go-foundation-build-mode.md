---
title: Go - Build Mode
mathjax: false
date: 2022-12-18 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-package-management.png
categories:
  - Go
tags:
  - Go
  - Cloud Native
---

# 构建过程

> 确定包版本 + 编译包 + 链接目标文件（编译后得到的）

<!-- more -->

# 构建模式

| Mode             | Desc                    |
| ---------------- | ----------------------- |
| GOPATH           | 不关注依赖版本          |
| Vendor - 1.5     | `Reproducible Build`    |
| Go Module - 1.11 | `Dependency Management` |

## GOPATH

1. Go 首次开源时，内置了 `GOPATH` 的构建模式
2. Go 编译器可以在本地 GOPATH 下`搜索` Go 程序依赖的`第三方包`
   - 如果存在，则使用这个本地包进行编译；如果不存在，则会报编译错误

```go main.go
package main

import "github.com/sirupsen/logrus"

func main() {
	logrus.Println("hello, gopath mode")
}
```

> 无法找到依赖包而构建失败

```
$ go version
go version go1.10.8 linux/amd64

$ echo $GOROOT
/home/zhongmingmao/.asdf/installs/golang/1.10.8/go

$ echo $GOPATH
/home/zhongmingmao/workspace/go

$ tree
.
└── main.go

$ go build main.go
main.go:3:8: cannot find package "github.com/sirupsen/logrus" in any of:
	/home/zhongmingmao/.asdf/installs/golang/1.10.8/go/src/github.com/sirupsen/logrus (from $GOROOT)
	/home/zhongmingmao/workspace/go/src/github.com/sirupsen/logrus (from $GOPATH)
```

> 搜索规则

1. Go 程序需要导入 `github.com/user/repo` 这个包路径，假设 GOPATH 为 `PathA:PathB`
2. 在 GOPATH 构建模式下，Go 编译器在编译 Go 程序时，会从下列路径搜索第三方包
   - `PathA/src/github.com/user/repo`
   - `PathB/src/github.com/user/repo`

> `GOPATH` 默认值为 `$HOME/go`

> 可以通过 `go get` 命令将缺失的`第三方包`下载到 `GOPATH` 配置的目录下，并确保`间接依赖`也存在

```
$ go get github.com/sirupsen/logrus

$ du -sh /home/zhongmingmao/workspace/go/src/github.com/sirupsen/logrus
1.7M	/home/zhongmingmao/workspace/go/src/github.com/sirupsen/logrus
```

> `go get ` 下载的包只是当前时刻各个依赖的`最新主线版本`，无法保证 `Reproducible Build`
> 如果依赖包引入了不兼容的代码，Go 程序将编译失败

1. 在 GOPATH 构建模式下，Go 编译器实际上并没有关注 Go 项目所依赖的第三方包的`版本`
2. Go 核心开发团队因此引入了 `vendor` 机制

## Vendor

1. `Go  1.5` 引入了 `vendor` 机制
2. vendor 机制的本质：在 Go 项目的 vendor 目录下，`缓存`项目的`所有依赖包`
3. Go 编译器会`优先`感知和使用 `vendor` 目录下缓存的第三方版本，而不是 `GOPATH`
4. 将 `vendor 目录`和`项目源码`一并提交到代码仓库后，可以实现 `Reproducible build`

```
$ tree -LF 4 .
./
├── main.go
└── vendor/
    ├── github.com/
    │   └── sirupsen/
    │       └── logrus/
    └── golang.org/
        └── x/
            └── sys/
```

> ` Go 项目`必须要位于 `GOPATH/src` 的目录下，才能`开启 vendor 机制`
> 如果不满足该路径要求，Go 编译器会`忽略` Go 项目下的 vendor 目录

> `vendor` 机制虽然解决了 `Reproducible Build` 的问题，但`开发体验欠佳`

1. Go 项目必须放在 `GOPATH/src` 下
2. `庞大`的 vendor 目录需要提交到代码仓库
3. 需要`手工管理` vendor 目录下的 Go 依赖包

> 因此，Go 核心团队将 Go 构建的重点转移到如何解决`包依赖管理`上

## Go Module

1. 从 `Go 1.11` 开始，引入了 `Go Module` 构建模式，并在 `Go 1.16` 成为`默认`的构建模式
2. 一个 `Go Module` 是一个 `Go 包的集合`
   - `Module` 是有`版本`的，因此 Module 下的`包`也是有版本的
   - Module 和这些包组成一个`独立的版本单元`，一起`打包`、`发布`、`分发`
3. 在 Go Module 模式下，通常`一个代码仓库`对应`一个 Go Module`
   - 一个 Go Module 的顶级目录下会放置一个 `go.mod` 文件，`一一对应`
4. `go.mod` 文件所在的顶层目录也被称为 `Module 的根目录`
   - Module 根目录以及它的子目录的`所有 Go 包`都`归属`于这个 `Go Module`
   - 这个 Module 也被称为 `Main Module`

### 101

```go main.go
package main

import "github.com/sirupsen/logrus"

func main() {
	logrus.Println("hello, gomodule mode")
}
```

> 通过 `go mod init` 创建 `go.mod` 文件，将当前项目变成一个 Go Module
> Go 项目可以在`任意路径`，不一定要在 `GOPATH/src`

> `go.mod` 文件的第一行声明了 `module path`，最后一行为 Go 版本指示符

```
$ tree .
.
└── main.go

$ go mod init github.com/zhongmingmao/gomodule
go: creating new go.mod: module github.com/zhongmingmao/gomodule
go: to add module requirements and sums:
	go mod tidy
	
$ tree .
.
├── go.mod
└── main.go

$ cat go.mod
module github.com/zhongmingmao/gomodule

go 1.21.2
```

1. 通过 `go mod tidy` 自动更新当前 Go Module 的`依赖`和`校验和`
2. `扫描 Go 源码`，自动找出项目依赖的`外部 Go Module`，下载`直接依赖`和`间接依赖`并更新本地的 `go.mod`
3. 可以通过 `$GOPROXY` 来`加速`第三方依赖（`Go Module`）的下载
4. 下载的依赖会被放置在本地 Module 缓存路径，默认为 `$GOPATH[0]/pkg/mod`
   - 从 `Go 1.15` 开始，可以通过 `GOMODCACHE` 来自定义 `Module` 的`缓存路径`
5. `go.sum` 存放特定版本的 Module `内容`的哈希值 - `安全措施`
   - 如果某个 Module 的特定版本需要被`再次下载`，需要先通过`校验和校验`
   - 推荐将 `go.mod` 和 `go.sum` 一并提交到代码仓库

```
$ echo $GOPROXY
https://goproxy.cn

$ go env GOMODCACHE
/Users/zhongmingmao/workspace/go/pkg/mod

$ go mod tidy
go: finding module for package github.com/sirupsen/logrus
go: downloading github.com/sirupsen/logrus v1.9.3
go: found github.com/sirupsen/logrus in github.com/sirupsen/logrus v1.9.3
go: downloading golang.org/x/sys v0.0.0-20220715151400-c0bba94af5f8
go: downloading github.com/stretchr/testify v1.7.0

$ tree .
.
├── go.mod
├── go.sum
└── main.go

$ cat go.mod
module github.com/zhongmingmao/gomodule

go 1.21.2

require github.com/sirupsen/logrus v1.9.3

require golang.org/x/sys v0.0.0-20220715151400-c0bba94af5f8 // indirect

$ cat go.sum
github.com/davecgh/go-spew v1.1.0/go.mod h1:J7Y8YcW2NihsgmVo/mv3lAwl/skON4iLHjSsI+c5H38=
github.com/davecgh/go-spew v1.1.1 h1:vj9j/u1bqnvCEfJOwUhtlOARqs3+rkHYY13jYWTU97c=
github.com/davecgh/go-spew v1.1.1/go.mod h1:J7Y8YcW2NihsgmVo/mv3lAwl/skON4iLHjSsI+c5H38=
github.com/pmezard/go-difflib v1.0.0 h1:4DBwDE0NGyQoBHbLQYPwSUPoCMWR5BEzIk/f1lZbAQM=
github.com/pmezard/go-difflib v1.0.0/go.mod h1:iKH77koFhYxTK1pcRnkKkqfTogsbg7gZNVY4sRDYZ/4=
github.com/sirupsen/logrus v1.9.3 h1:dueUQJ1C2q9oE3F7wvmSGAaVtTmUizReu6fjN8uqzbQ=
github.com/sirupsen/logrus v1.9.3/go.mod h1:naHLuLoDiP4jHNo9R0sCBMtWGeIprob74mVsIT4qYEQ=
github.com/stretchr/objx v0.1.0/go.mod h1:HFkY916IF+rwdDfMAkV7OtwuqBVzrE8GR6GFx+wExME=
github.com/stretchr/testify v1.7.0 h1:nwc3DEeHmmLAfoZucVR881uASk0Mfjw8xYJ99tb5CcY=
github.com/stretchr/testify v1.7.0/go.mod h1:6Fq8oRcR53rry900zMqJjRRixrwX3KX962/h/Wwjteg=
golang.org/x/sys v0.0.0-20220715151400-c0bba94af5f8 h1:0A+M6Uqn+Eje4kHMK80dtF3JCXC4ykBgQG4Fe06QRhQ=
golang.org/x/sys v0.0.0-20220715151400-c0bba94af5f8/go.mod h1:oPkhp1MJrh7nUepCBck5+mAzfO9JrbApNNgaTdGDITg=
gopkg.in/check.v1 v0.0.0-20161208181325-20d25e280405/go.mod h1:Co6ibVJAznAaIkqp8huTwlJQCZ016jof/cbN4VW5Yz0=
gopkg.in/yaml.v3 v3.0.0-20200313102051-9f266ea9e77c h1:dUUwHk2QECo/6vqA44rthZ8ie2QXMNeKRTHCNY2nXvo=
gopkg.in/yaml.v3 v3.0.0-20200313102051-9f266ea9e77c/go.mod h1:K4uyk7z7BCEPqu6E+C64Yfv1cQ7kz7rIZviUmN+EgEM=
```

> 执行 `go build`
>
> 1. 读取 `go.mod` 中的依赖及版本信息
> 2. 在`本地 Module 缓存路径`找到对应`版本`的`依赖`，执行`编译`和`链接`

```
$ go build

$ tree .
.
├── go.mod
├── go.sum
├── gomodule
└── main.go

$ ./gomodule
INFO[0000] hello, gomodule mode
```

### 工作原理

#### 语义导入版本

> Semantic Import Versioning

![image-20231010155254543](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231010155254543.png)

1. 在 Go Module 构建模式下，版本号：`vX.Y.Z`
2. `Go 命令`和 `go.mod` 文件都使用上述符合`语义版本规范`的版本号来描述 `Go Module 版本`
3. 借助`语义版本规范`
   - Go 命令可以确定同一个 Module 的两个版本`发布的先后次序`，以及`是否兼容`
4. 兼容性
   - 主版本号的不同版本是相互不兼容的
   - 在主版本号相同的情况下，次版本号都是向后兼容次版本号小的版本
   - 补丁版本号不影响兼容性
5. 如果同一个包的新旧版本是`兼容`的，那么它们的 `import path` 是`相同`的
   - `logrus v1.8.1` 和 `logrus v1.7.0` 是兼容的，都是 `v1` 版本
   - `import path` 都为 `import "github.com/sirupsen/logrus"`
6. 将`主版本号`引入到 `import path` 中 - `语义导入版本`（Go 创新）
   - 发布 `logrus v2.0.0`
   - `import path` 为 `import "github.com/sirupsen/logrus/v2"`
7. `v0.y.z`
   - `v0.y.z` 用于项目初始开发阶段的版本号，API 是不稳定的
   - Go Module 将 `v0` 和 `v1` 做`同等对待`，降低开发人员的`心智负担`

> 通过在 `import path` 中引入`主版本号`的方式，来区别`同一个包`的`不兼容版本`

```go
import (
	"github.com/sirupsen/logrus"
	logv2 "github.com/sirupsen/logrus/v2"
)
```

#### 最小版本选择

> Minimal Version Selection

> Go 选出`符合整体要求的最小版本`，即 `v1.3.0`，有助于实现 `Reproducible Build`

![image-20231010161858593](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231010161858593.png)

## 切换

1. `Go 1.11` 引入 Go Module 构建模式
   - 此时，`GOPATH` 构建模式和 `Go Module` 构建模式`各自独立工作`，可以通过环境变量 `GO111MODULE` 来切换
2. `Go 1.16`，Go Module 构建模式成为了`默认`构建模式
   - 后续版本可能会`彻底移除` GOPATH 构建模式，`Go Module` 构建模式将成为 Go `唯一的标准构建模式`

![image-20231010163133647](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231010163133647.png)
