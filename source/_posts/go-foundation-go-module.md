---
title: Go - Go Module
mathjax: false
date: 2022-12-19 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/gomodule.png
categories:
  - Go
tags:
  - Go
  - Cloud Native
---

# 添加依赖

> github.com/google/uuid

```go main.go
package main

import (
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

func main() {
	logrus.Println("hello, gomodule mode")
	logrus.Println(uuid.NewString())
}
```

<!-- more -->

> `go.mod` 里的 `require` 字段中，没有任何 Module 提供了包 github.com/google/uuid

```
$ go build
main.go:4:2: no required module provides package github.com/google/uuid; to add it:
	go get github.com/google/uuid
```

> 手动 `go get`，下载依赖到`本地 Module 缓存`，并更新 `go.mod`

```
$ go env GOMODCACHE
/Users/zhongmingmao/workspace/go/pkg/mod

$ go get github.com/google/uuid
go: downloading github.com/google/uuid v1.3.1
go: added github.com/google/uuid v1.3.1

$ du -sh /Users/zhongmingmao/workspace/go/pkg/mod/github.com/google/uuid@v1.3.1
140K	/Users/zhongmingmao/workspace/go/pkg/mod/github.com/google/uuid@v1.3.1

$ cat go.mod
module github.com/zhongmingmao/gomodule

go 1.21.2

require github.com/sirupsen/logrus v1.9.3

require (
	github.com/google/uuid v1.3.1 // indirect
	golang.org/x/sys v0.0.0-20220715151400-c0bba94af5f8 // indirect
)
```

> 执行 `go mod tidy` ，可以`自动分析`源码中的`依赖变化`，识别并下载`新增依赖`

```
$ go mod tidy
go: finding module for package github.com/google/uuid
go: found github.com/google/uuid in github.com/google/uuid v1.3.1

$ cat go.mod
module github.com/zhongmingmao/gomodule

go 1.21.2

require (
	github.com/google/uuid v1.3.1
	github.com/sirupsen/logrus v1.9.3
)

require golang.org/x/sys v0.0.0-20220715151400-c0bba94af5f8 // indirect
```

> 构建并执行

```
$ go build

$ ./gomodule
INFO[0000] hello, gomodule mode
INFO[0000] a8ae99d7-d2f2-4f37-96f5-352cf205a336
```

# 更改版本

> 语义版本导入

## v1.Y.Z

> 当依赖的主版本号为 `0` 或者 `1` 时，对应的 `import path` 不需要增加主版本号

> 列出 `Go Module` 的版本列表

```
$ go list
github.com/zhongmingmao/gomodule

$ go list -m -versions github.com/sirupsen/logrus
github.com/sirupsen/logrus v0.1.0 v0.1.1 v0.2.0 v0.3.0 v0.4.0 v0.4.1 v0.5.0 v0.5.1 v0.6.0 v0.6.1 v0.6.2 v0.6.3 v0.6.4 v0.6.5 v0.6.6 v0.7.0 v0.7.1 v0.7.2 v0.7.3 v0.8.0 v0.8.1 v0.8.2 v0.8.3 v0.8.4 v0.8.5 v0.8.6 v0.8.7 v0.9.0 v0.10.0 v0.11.0 v0.11.1 v0.11.2 v0.11.3 v0.11.4 v0.11.5 v1.0.0 v1.0.1 v1.0.3 v1.0.4 v1.0.5 v1.0.6 v1.1.0 v1.1.1 v1.2.0 v1.3.0 v1.4.0 v1.4.1 v1.4.2 v1.5.0 v1.6.0 v1.7.0 v1.7.1 v1.8.0 v1.8.1 v1.8.2 v1.8.3 v1.9.0 v1.9.1 v1.9.2 v1.9.3
```

> 通过 `go get ` 降级为某个`兼容版本` v1.8.0

```
$ go get github.com/sirupsen/logrus@v1.8.0
go: downloading github.com/sirupsen/logrus v1.8.0
go: downloading github.com/magefile/mage v1.10.0
go: downloading github.com/stretchr/testify v1.2.2
go: added github.com/magefile/mage v1.10.0
go: downgraded github.com/sirupsen/logrus v1.9.3 => v1.8.0

$ cat go.mod
module github.com/zhongmingmao/gomodule

go 1.21.2

require (
	github.com/google/uuid v1.3.1
	github.com/sirupsen/logrus v1.8.0
)

require (
	github.com/magefile/mage v1.10.0 // indirect
	golang.org/x/sys v0.0.0-20220715151400-c0bba94af5f8 // indirect
)

$ cat go.sum | grep logrus
github.com/sirupsen/logrus v1.8.0 h1:nfhvjKcUMhBMVqbKHJlk5RPrrfYr/NMo3692g0dwfWU=
github.com/sirupsen/logrus v1.8.0/go.mod h1:4GuYW9TZmE769R5STWrRakJc4UqQ3+QQ95fyz7ENv1A=
github.com/sirupsen/logrus v1.9.3 h1:dueUQJ1C2q9oE3F7wvmSGAaVtTmUizReu6fjN8uqzbQ=
github.com/sirupsen/logrus v1.9.3/go.mod h1:naHLuLoDiP4jHNo9R0sCBMtWGeIprob74mVsIT4qYEQ=

$ go build

$ ./gomodule
INFO[0000] hello, gomodule mode
INFO[0000] f7825699-04ca-42a7-8d34-acb0c96c47d5
```

> 通过 `go mod edit` 来继续降级为另一个`兼容版本` v1.7.0

```
$ go mod edit -require=github.com/sirupsen/logrus@v1.7.0

$ cat go.mod
module github.com/zhongmingmao/gomodule

go 1.21.2

require (
	github.com/google/uuid v1.3.1
	github.com/sirupsen/logrus v1.7.0
)

require (
	github.com/magefile/mage v1.10.0 // indirect
	golang.org/x/sys v0.0.0-20220715151400-c0bba94af5f8 // indirect
)

$ go mod tidy
go: downloading github.com/sirupsen/logrus v1.7.0

$ cat go.sum | grep logrus
github.com/sirupsen/logrus v1.7.0 h1:ShrD1U9pZB12TX0cVy0DtePoCH97K8EtX+mg7ZARUtM=
github.com/sirupsen/logrus v1.7.0/go.mod h1:yWOB1SBYBC5VeMP7gHvWumXLIWorT60ONWic61uBYv0=

$ go build

$ ./gomodule
INFO[0000] hello, gomodule mode
INFO[0000] dcf1b908-7a9a-471e-b532-f886bd0f379e
```

> 通过 `go get ` 升级为某个`兼容版本` v1.7.1

```
$ go get github.com/sirupsen/logrus@v1.7.1
go: downloading github.com/sirupsen/logrus v1.7.1
go: added github.com/magefile/mage v1.10.0
go: upgraded github.com/sirupsen/logrus v1.7.0 => v1.7.1

$ cat go.mod
module github.com/zhongmingmao/gomodule

go 1.21.2

require (
	github.com/google/uuid v1.3.1
	github.com/sirupsen/logrus v1.7.1
)

require (
	github.com/magefile/mage v1.10.0 // indirect
	golang.org/x/sys v0.0.0-20220715151400-c0bba94af5f8 // indirect
)

$ cat go.sum | grep logrus
github.com/sirupsen/logrus v1.7.0 h1:ShrD1U9pZB12TX0cVy0DtePoCH97K8EtX+mg7ZARUtM=
github.com/sirupsen/logrus v1.7.0/go.mod h1:yWOB1SBYBC5VeMP7gHvWumXLIWorT60ONWic61uBYv0=
github.com/sirupsen/logrus v1.7.1 h1:rsizeFmZP+GYwyb4V6t6qpG7ZNWzA2bvgW/yC2xHCcg=
github.com/sirupsen/logrus v1.7.1/go.mod h1:4GuYW9TZmE769R5STWrRakJc4UqQ3+QQ95fyz7ENv1A=

$ go build

$ ./gomodule
INFO[0000] hello, gomodule mode
INFO[0000] 413d0dbb-5f8f-4ce5-89fc-8adcdd7dbf28
```

## vX.Y.Z

> 如果要为 Go 项目添加`主版本大于 1` 的依赖，`import path` 需要加上`主版本号`

```go main.go
package main

import (
	_ "github.com/go-redis/redis/v7"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

func main() {
	logrus.Println("hello, gomodule mode")
	logrus.Println(uuid.NewString())
}
```

> 选择 go-redis `最新`的 v7 版本 v7.4.1

```
$ go mod init github.com/zhongmingmao/gomodule
go: creating new go.mod: module github.com/zhongmingmao/gomodule
go: to add module requirements and sums:
	go mod tidy
	
$ go mod tidy
go: finding module for package github.com/sirupsen/logrus
go: finding module for package github.com/go-redis/redis/v7
go: finding module for package github.com/google/uuid
go: downloading github.com/go-redis/redis v6.15.9+incompatible
go: downloading github.com/go-redis/redis/v7 v7.4.1
go: found github.com/go-redis/redis/v7 in github.com/go-redis/redis/v7 v7.4.1
go: found github.com/google/uuid in github.com/google/uuid v1.3.1
go: found github.com/sirupsen/logrus in github.com/sirupsen/logrus v1.9.3
go: downloading github.com/onsi/ginkgo v1.10.1
go: downloading github.com/onsi/gomega v1.7.0
go: downloading github.com/hpcloud/tail v1.0.0
go: downloading gopkg.in/yaml.v2 v2.2.4
go: downloading golang.org/x/net v0.0.0-20190923162816-aa69164e4478
go: downloading gopkg.in/fsnotify.v1 v1.4.7
go: downloading golang.org/x/text v0.3.2

$ cat go.mod
module github.com/zhongmingmao/gomodule

go 1.21.2

require (
	github.com/go-redis/redis/v7 v7.4.1
	github.com/google/uuid v1.3.1
	github.com/sirupsen/logrus v1.9.3
)

require golang.org/x/sys v0.0.0-20220715151400-c0bba94af5f8 // indirect
```

> 升级到一个`不兼容`的版本 v8，需要修改 `import path`

```go main.go
package main

import (
	_ "github.com/go-redis/redis/v8"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

func main() {
	logrus.Println("hello, gomodule mode")
	logrus.Println(uuid.NewString())
}
```

```
$ go mod tidy
go: finding module for package github.com/go-redis/redis/v8
go: found github.com/go-redis/redis/v8 in github.com/go-redis/redis/v8 v8.11.5

$ cat go.mod
module github.com/zhongmingmao/gomodule

go 1.21.2

require (
	github.com/go-redis/redis/v8 v8.11.5
	github.com/google/uuid v1.3.1
	github.com/sirupsen/logrus v1.9.3
)

require (
	github.com/cespare/xxhash/v2 v2.1.2 // indirect
	github.com/dgryski/go-rendezvous v0.0.0-20200823014737-9f7001d12a5f // indirect
	golang.org/x/sys v0.0.0-20220715151400-c0bba94af5f8 // indirect
)

$ cat go.sum| grep redis
github.com/go-redis/redis/v8 v8.11.5 h1:AcZZR7igkdvfVmQTPnu9WE37LRrO/YrBH5zWyjDC0oI=
github.com/go-redis/redis/v8 v8.11.5/go.mod h1:gREzHqY1hg6oD9ngVRbLStwAWKhA0FEgq8Jd4h5lpwo=
```

# 移除依赖

> 注释代码

```go main.go
package main

import (
	// _ "github.com/go-redis/redis/v8"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

func main() {
	logrus.Println("hello, gomodule mode")
	logrus.Println(uuid.NewString())
}
```

> 依然依赖 redis - `go build 不会自动清空多余的依赖项`

```
$ go build

$ ./gomodule
INFO[0000] hello, gomodule mode
INFO[0000] 35566587-7b11-4715-ab00-94ebf29ec43c

$ cat go.mod
module github.com/zhongmingmao/gomodule

go 1.21.2

require (
	github.com/go-redis/redis/v8 v8.11.5
	github.com/google/uuid v1.3.1
	github.com/sirupsen/logrus v1.9.3
)

require (
	github.com/cespare/xxhash/v2 v2.1.2 // indirect
	github.com/dgryski/go-rendezvous v0.0.0-20200823014737-9f7001d12a5f // indirect
	golang.org/x/sys v0.0.0-20220715151400-c0bba94af5f8 // indirect
)

$ go list -m all | grep redis
github.com/go-redis/redis/v8 v8.11.5
```

> `go mod tidy` - 自动分析源码依赖，将`不再使用`的依赖从 `go.mod` 和 `go.sum` 中`移除`

```
$ go mod tidy

$ cat go.mod
module github.com/zhongmingmao/gomodule

go 1.21.2

require (
	github.com/google/uuid v1.3.1
	github.com/sirupsen/logrus v1.9.3
)

require golang.org/x/sys v0.0.0-20220715151400-c0bba94af5f8 // indirect
```

# 借用 vendor

1. vendor 机制是 Go Module 构建机制的一个`补充`
   - 适用场景：不方便访问外部网络，且对构建性能敏感的环境
2. GOPATH vs Go Module
   - 在 `GOPATH` 构建模式下，`vendor` 需要`手动管理`
   - 在 `Go Module` 构建模式下，可以通过命令`快速`建立和更新 vendor，`维护成本很低`

> 建立 vendor - 建立了一份`项目依赖包`的`副本`，通过 `vendor/modules.txt` 记录信息

```
$ tree .
.
├── go.mod
├── go.sum
└── main.go

$ go mod vendor

$ tree -LF 3 .
./
├── go.mod
├── go.sum
├── main.go
└── vendor/
    ├── github.com/
    │   ├── google/
    │   └── sirupsen/
    ├── golang.org/
    │   └── x/
    └── modules.txt
    
$ du -sh vendor
7.9M	vendor

$ cat vendor/modules.txt
# github.com/google/uuid v1.3.1
## explicit
github.com/google/uuid
# github.com/sirupsen/logrus v1.9.3
## explicit; go 1.13
github.com/sirupsen/logrus
# golang.org/x/sys v0.0.0-20220715151400-c0bba94af5f8
## explicit; go 1.17
golang.org/x/sys/internal/unsafeheader
golang.org/x/sys/unix
golang.org/x/sys/windows
```

> 基于 `vendor` 构建（默认是基于 `Module 本地缓存`构建）
> `Go 1.14` ，如果 Go 项目的顶层目录中存在 `vendor 目录`，优先基于 `vendor` 构建，除非指定 `-mod` 参数

```
$ go version
go version go1.21.2 darwin/arm64

$ go build -mod=vendor

$ ./gomodule
INFO[0000] hello, gomodule mode
INFO[0000] 6f36a59f-d696-45e4-a194-f10a6b5a9bee

$ rm -rf ./vendor/golang.org

$ go build
vendor/github.com/sirupsen/logrus/terminal_check_bsd.go:6:8: cannot find module providing package golang.org/x/sys/unix: import lookup disabled by -mod=vendor
	(Go version in go.mod is at least 1.14 and vendor directory exists.)
	
$ go build -mod=mod

$ ./gomodule
INFO[0000] hello, gomodule mode
INFO[0000] 6174371d-9560-4f1e-9add-7dd3a21ed5e3
```

