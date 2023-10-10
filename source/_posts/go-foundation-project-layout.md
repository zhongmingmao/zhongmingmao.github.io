---
title: Go - Project Layout
mathjax: false
date: 2022-12-17 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-project-layout-6848077.png
categories:
  - Go
tags:
  - Go
  - Cloud Native
---

# 演进历史

## Go 1.3

> 以 `all.bash` 为代表的`源码构建脚本`放在了 `src` 的`顶层目录`下

```
$ tree -LF 1 ./src
./src/
├── Make.dist
├── all.bash*
├── all.bat
├── all.rc*
├── clean.bash*
├── clean.bat
├── clean.rc*
├── cmd/
├── lib9/
├── libbio/
├── liblink/
├── make.bash*
├── make.bat
├── make.rc*
├── nacltest.bash*
├── pkg/
├── race.bash*
├── race.bat
├── run.bash*
├── run.bat
├── run.rc*
└── sudo.bash*
```

<!-- more -->

> `./src/cmd` 存放着 `Go 可执行文件`的相关目录，每个子目录都是一个 `Go 工具链命令`或`子命令`对应的可执行文件

```
$ tree -LF 1 ./src/cmd
./src/cmd/
├── 5a/
.....
├── 8l/
├── addr2line/
├── api/
├── cc/
├── cgo/
├── dist/
├── fix/
├── gc/
├── go/
├── gofmt/
├── ld/
├── nm/
├── objdump/
├── pack/
└── yacc/
```

> `./src/pkg` 存放着`运行时实现`和`标准库实现`
> 可以被 `./src/cmd` 下各程序所导入，也可以被其他 Go 程序所依赖并导入

```
$ tree -LF 1 ./src/pkg
./src/pkg/
├── archive/
├── bufio/
├── builtin/
├── bytes/
├── compress/
├── container/
├── crypto/
├── database/
├── debug/
├── encoding/
├── errors/
├── expvar/
├── flag/
├── fmt/
├── go/
├── hash/
├── html/
├── image/
├── index/
├── io/
├── log/
├── math/
├── mime/
├── net/
├── os/
├── path/
├── reflect/
├── regexp/
├── runtime/
├── sort/
├── strconv/
├── strings/
├── sync/
├── syscall/
├── testing/
├── text/
├── time/
├── unicode/
└── unsafe/
```

## Go 1.4 - Internal

> 为了`简化源码树层级`，删除 `pkg` 中间层目录，并引入 `internal` 目录

1. 删除 Go 源码树中 `src/pkg/xxx` 中 `pkg` 这一层级，直接使用 `src/xxx`
2. 引入 `internal` 包机制，增加 `internal` 目录
   - 一个 Go 项目里的 internal 目录下的 Go 包，只能被`本项目内部`的包导入
   - 项目外部是无法导入其它项目 internal 目录下的包

```
$ tree -LF 1 ./src
./src/
├── Make.dist
├── README.vendor
├── all.bash*
├── all.bat
├── all.rc*
├── archive/
├── arena/
├── bootstrap.bash*
├── bufio/
├── buildall.bash*
├── builtin/
├── bytes/
├── clean.bash*
├── clean.bat
├── clean.rc*
├── cmd/
├── cmp/
├── cmp.bash
├── compress/
├── container/
├── context/
├── crypto/
├── database/
├── debug/
├── embed/
├── encoding/
├── errors/
├── expvar/
├── flag/
├── fmt/
├── go/
├── go.mod
├── go.sum
├── hash/
├── html/
├── image/
├── index/
├── internal/
├── io/
├── log/
├── make.bash*
├── make.bat
├── make.rc*
├── maps/
├── math/
├── mime/
├── net/
├── os/
├── path/
├── plugin/
├── race.bash*
├── race.bat
├── reflect/
├── regexp/
├── run.bash*
├── run.bat
├── run.rc*
├── runtime/
├── slices/
├── sort/
├── strconv/
├── strings/
├── sync/
├── syscall/
├── testdata/
├── testing/
├── text/
├── time/
├── unicode/
├── unsafe/
└── vendor/
```

```
$ tree -LF 1 ./src/internal
./src/internal/
├── abi/
├── bisect/
├── buildcfg/
├── bytealg/
├── cfg/
├── coverage/
├── cpu/
├── dag/
├── diff/
├── fmtsort/
├── fuzz/
├── goarch/
├── godebug/
├── godebugs/
├── goexperiment/
├── goos/
├── goroot/
├── goversion/
├── intern/
├── itoa/
├── lazyregexp/
├── lazytemplate/
├── nettrace/
├── obscuretestdata/
├── oserror/
├── pkgbits/
├── platform/
├── poll/
├── profile/
├── race/
├── reflectlite/
├── safefilepath/
├── saferio/
├── singleflight/
├── syscall/
├── sysinfo/
├── testenv/
├── testlog/
├── testpty/
├── trace/
├── txtar/
├── types/
├── unsafeheader/
├── xcoff/
└── zstd/
```

## Go 1.6 - Vendor

> Go Vendor 使得 Go 项目第一次具有`可重现构建`（Reproducible Build）的能力
> 保证基于`同一源码`构建出的`可执行程序`是`等价`的

1. 为了解决 Go `包依赖版本管理`的问题，在 `Go 1.5` 增加了 `vendor 构建机制`
   - 即 Go 源码的`编译`可以不在 `GOPATH` 环境变量下面搜索依赖包的路径，而是在 `vendor` 目录下查找
2. `Go 1.6` 增加了 `vendor 目录`以支持 `vendor 构建`，但 vendor 目录并`没有实际性缓存`任何`第三方包`
3. `Go 1.7` 才真正在 vendor 目录下`缓存`其依赖的外部包
   - 主要是 `golang.org/x` 下的包，由 `Go 核心团队`维护，其更新速度不受 Go 版本发布周期影响

```
$ tree -LF 1 ./src/vendor
./src/vendor/
├── golang.org/
└── modules.txt

$ ./src/vendor/golang.org/x/
├── crypto/
├── net/
├── sys/
└── text/
```

## Go 1.13 - Module

1. 为了解决 `Go 包依赖版本管理`的问题，在 `Go 1.11` 中，引入了 `Go Module` 构建机制
   - 在项目中引入 `go.mod` 和 `go.sum`，明确项目所依赖的第三方包和版本
2. 项目的构建将彻底摆脱 `GOPATH` 的束缚，实现`精准`的`可重现构建`

> Go 1.13 的 go.mod，基于 Go 1.12 实现`自举`

```go src/go.mod
module std

go 1.12

require (
	golang.org/x/crypto v0.0.0-20190611184440-5c40567a22f8
	golang.org/x/net v0.0.0-20190813141303-74dc4d7220e7
	golang.org/x/sys v0.0.0-20190529130038-5219a1e1c5f8 // indirect
	golang.org/x/text v0.3.2 // indirect
)
```

> Go 自身所依赖的包在 `go.mod` 中都有对应的信息，而原本这些依赖包是`缓存`在 `vendor` 目录下

# 典型布局

> Go 项目通常分为：`可执行程序项目` / `库项目`

## 可执行程序项目

> 以构建`可执行程序`为目的的项目

```
$ tree exe-layout
exe-layout
├── cmd
│   ├── app1
│   │   └── main.go
│   └── app2
│       └── main.go
├── go.mod
├── go.sum
├── internal
│   ├── pkga
│   │   └── pkga.go
│   └── pkgb
│       └── pkgb.go
├── pkg1
│   └── pkg1.go
├── pkg2
│   └── pkg2.go
└── vendor
```

1. cmd
   - 存放项目要编译构建的`可执行文件`对应的 `main` 包的源文件
   - 如果需要构建`多个可执行文件`，每个可执行文件的 `main` 包要`单独放在一个子目录`
   - main 包应该很`简洁`
     - main 包：命令行参数解析、资源初始化、日志设施初始化、数据库连接初始化等
     - 然后将程序的`执行权限`交给更高级的执行控制对象
2. pkgN
   - 存放项目自身要使用，同样也是可执行文件对应 main 包所依赖的`库文件`
   - 同时，这些目录下的包可以被`外部项目`引用
3. go.mod + go.sum
   - Go `依赖管理`使用的配置文件，`Go 1.11` 引入了 `Go Module` 构建机制（官方推荐）
4. vendor
   - vendor 是 `Go 1.5` 引入的用于在项目本地`缓存特定版本依赖包`的机制
   - 在 Go Module 之前，基于 vendor 可以实现 `Reproducible Build`
   - vendor 是`可选`的，因为 Go Module 本身支持 `Reproducible Build`
     - Go Module 机制也保留了 vendor 目录
     - `go mod vendor` - 生成 vendor 下的依赖包
     - `go build -mod=vendor` - 基于 vendor 的构建
     - 一般仅保留项目`根目录`下的 vendor 目录

> Go 1.11 引入的 `Module` 是一组同属于一个`版本管理单元`的集合
> Go 支持在`一个项目`中存在`多个 Module`，比一定比例的代码重复引入更多的`复杂性`

```
$ tree multi-modules
multi-modules
├── go.mod
├── module1
│   └── go.mod
└── module2
    └── go.mod
```

> 推荐：`一个项目一个 Module`，可删除 cmd 目录

```
$ tree single-exe-layout
single-exe-layout
├── go.mod
├── internal
├── main.go
├── pkg1
├── pkg2
└── vendor
```

### 早期

> 深受 Go 1.4 之前的布局影响，将`可能暴露到外部`的 Go 包聚合在 `pkg` 目录下

```
$ tree early-exe-layout
early-exe-layout
├── cmd
│   ├── app1
│   │   └── main.go
│   └── app2
│       └── main.go
├── go.mod
├── go.sum
├── internal
│   ├── pkga
│   │   └── pkga.go
│   └── pkgb
│       └── pkgb.go
├── pkg
│   ├── pkg1
│   │   └── pkg1.go
│   └── pkg2
│       └── pkg2.go
└── vendor
```

## 库项目

> 仅对外暴露的 Go 包，在可执行程序项目的基础上移除 `cmd` 和 `vendor` 目录

```
$ tree lib-layout
lib-layout
├── go.mod
├── internal
│   ├── pkga
│   │   └── pkga.go
│   └── pkgb
│       └── pkgb.go
├── pkg1
│   └── pkg1.go
└── pkg2
    └── pkg2.go
```

1. 因为不需要构建可执行程序，移除了 `cmd` 目录
2. `vendor` 目录不再是可选目录
   - 对于库项目，并不推荐在项目中放置 vendor 目录去缓存库自身的第三方依赖
   - 库项目应仅通过 `go.mod` 文件`明确表达`所需依赖 - `声明式`
3. 库项目的初衷是为了对外部暴露 API，对于仅限于项目内部使用的包，应放在 internal 目录下

> 仅有一个包的库项目，feature1.go 和 feature2.go 同属于一个包

```
$ tree single-pkg-lib-layout/
single-pkg-lib-layout/
├── feature1.go
├── feature2.go
├── go.mod
└── internal
```
