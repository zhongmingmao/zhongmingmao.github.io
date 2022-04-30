---
title: Go Engineering - Foundation - Linting
mathjax: false
date: 2022-04-30 01:06:25
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
---

# golangci-lint 优点

1. **速度快**
   - 基于 gometalinter 开发，平均速度比 gometalinter 快 **5** 倍
   - **并行检查代码** + **复用 go build 缓存** + **缓存分析结果**
2. **可配置**
   - 支持 **YAML** 格式的配置文件
3. **IDE 集成**
   - VS Code + **Goland**
4. **Linter 聚合器**
   - 集成了很多 Linter，**无需单独安装**，并且支持自定义 Linter
5. **最小误报数**
   - **调整**了所**集成**的 Linter 的**默认设置**，大幅减少误报
6. **良好的输出**
   - 检查出问题的**源码文件**、**行号**和**错误行内容**
   - 不符合检查规则的**原因**
   - **报错的 Linter**
7. **更迭速度快**
   - 不断有新的 Linter 被集成进来
   - 使用者：Google、Facebook、Istio、Red Hat OpenShift 等

<!-- more -->

![image-20220430180918913](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220430180918913.png)

# golangci-lint 命令

![image-20220430204620327](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220430204620327.png)

## cache

```
$ golangci-lint cache status
Dir: /Users/zhongmingmao/Library/Caches/golangci-lint
Size: 1.9MiB

$ golangci-lint cache clean

$ golangci-lint cache status
Dir: /Users/zhongmingmao/Library/Caches/golangci-lint
Size: 64B
```

## config

```
$ golangci-lint config path                       
.golangci.yaml
```

## linters

```
$ golangci-lint linters
Enabled by your configuration linters:
asciicheck: Simple linter to check that your code does not contain non-ASCII identifiers [fast: true, auto-fix: false]
...

Disabled by your configuration linters:
containedctx: containedctx is a linter that detects struct contained context.Context field [fast: true, auto-fix: false]
...
```

# golangci-lint 配置

> 同时在**命令行选项**和**配置文件**中被指定，如果是 **`bool/string/int`**，则命令行选项**覆盖**配置文件，如果是 **`slice`**，则**合并**

## 命令行选项

![c3bf2e21acc3fa10fcbd88876fb1e252](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/c3bf2e21acc3fa10fcbd88876fb1e252.webp)

![7a54b69e561c3c2f6f83ca1907cbdfbf](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/7a54b69e561c3c2f6f83ca1907cbdfbf.webp)

## 配置文件

> 默认的配置文件名：`.golangci.yaml`、`.golangci.toml`、`.golangci.json`

> 常用配置

```yaml .golangci.yaml
run:
  skip-dirs: # 设置要忽略的目录
    - util
    - .*~
    - api/swagger/docs
  skip-files: # 设置不需要检查的go源码文件，支持正则匹配，这里建议包括：_test.go
    - ".*\\.my\\.go$"
    - _test.go
linters-settings:
  errcheck:
    check-type-assertions: true # 这里建议设置为true，如果确实不需要检查，可以写成`num, _ := strconv.Atoi(numStr)`
    check-blank: false
  gci:
    # 将以`github.com/marmotedu/iam`开头的包放在第三方包后面
    local-prefixes: github.com/marmotedu/iam
  godox:
    keywords: # 建议设置为BUG、FIXME、OPTIMIZE、HACK
      - BUG
      - FIXME
      - OPTIMIZE
      - HACK
  goimports:
    # 设置哪些包放在第三方包后面，可以设置多个包，逗号隔开
    local-prefixes: github.com/marmotedu/iam
  gomoddirectives: # 设置允许在go.mod中replace的包
    replace-local: true
    replace-allow-list:
      - github.com/coreos/etcd
      - google.golang.org/grpc
      - github.com/marmotedu/api
      - github.com/marmotedu/component-base
      - github.com/marmotedu/marmotedu-sdk-go
  gomodguard: # 下面是根据需要选择可以使用的包和版本，建议设置
    allowed:
      modules:
        - gorm.io/gorm
        - gorm.io/driver/mysql
        - k8s.io/klog
      domains: # List of allowed module domains
        - google.golang.org
        - gopkg.in
        - golang.org
        - github.com
        - go.uber.org
    blocked:
      modules:
        - github.com/pkg/errors:
            recommendations:
              - github.com/marmotedu/errors
            reason: "`github.com/marmotedu/errors` is the log package used by marmotedu projects."
      versions:
        - github.com/MakeNowJust/heredoc:
            version: "> 2.0.9"
            reason: "use the latest version"
      local_replace_directives: false
  lll:
    line-length: 240 # 这里可以设置为240，240一般是够用的
  importas: # 设置包的alias，根据需要设置
    jwt: github.com/appleboy/gin-jwt/v2         
    metav1: github.com/marmotedu/component-base/pkg/meta/v1
```

> 建议按需启用 linters

```yaml .golangci.yaml
linters: 
  disable-all: true  
  enable: # enable下列出 <期望的所有linters>
    - typecheck
    - ... 
```

```
$ ./scripts/print_enable_linters.sh    
    - asciicheck
    - bidichk
    - bodyclose
    - containedctx
    - contextcheck
    - ...
```

> 查看当前配置下启用和禁用了哪些 linter

```
$ golangci-lint help linters
Enabled by default linters:
deadcode: Finds unused code [fast: false, auto-fix: false]
...

Disabled by default linters:
asciicheck: Simple linter to check that your code does not contain non-ASCII identifiers [fast: true, auto-fix: false]
...

Linters presets:
bugs: asciicheck, bidichk, bodyclose, contextcheck, durationcheck, errcheck, errchkjson, errorlint, exhaustive, exportloopref, gosec, govet, makezero, nilerr, noctx, rowserrcheck, scopelint, sqlclosecheck, staticcheck, typecheck
...
```

# 常规用法

> 对当前目录以及子目录下的所有 Go 文件进行 Linting

```
$ golangci-lint run

$ golangci-lint run ./...
```

> 对指定的 Go 文件或者指定目录下的 Go 文件（dir1下目录为**非递归**）进行 Linting

```
$ golangci-lint run dir1 dir2/... dir3/file1.go
```

> 根据指定配置文件，进行 Linting

```
$ golangci-lint run -c .golangci.yaml ./...
```

> 运行指定的 linter，默认会从当前目录向上递归查找配置文件，`--no-config` 可以预防读到**未知**的配置文件

```
$ golangci-lint run --no-config --disable-all -E errcheck ./...
```

> 禁止运行指定的 linter

```
$ golangci-lint run --no-config -D godot,errcheck
```

# 减少误报

1. 在**命令行**中添加 **`-e`** 参数，或者在**配置文件**的 **`issues.exclude`** 部分设置要排除的检查错误
2. 忽略指定目录下的所有 Go 文件或者指定的 Go 文件
   -  **`run.skip-dirs`**、**`run.skip-files`** 、 **`issues.exclude-rules`** 
3. 通过在 Go 源码文件中添加 **`//nolint `** 注释，来忽略指定的代码行
   - golangci-lint 设置了很多 linters，不同位置的 nolint 标记效果也会不一样

> 忽略某一行所有 linter 的检查

```go
var bad_name int //nolint
```

> 忽略某一行指定 linter 的检查，可以指定多个 linter，`,` 分隔

```go
var bad_name int //nolint:golint,unused
```

> 忽略某个代码块的检查

```go
//nolint
func allIssuesInThisFunctionAreExcluded() *string {
  // ...
}

//nolint:govet
var (
  a int
  b int
)
```

> 忽略某个文件的指定 linter 检查

```go
//nolint:unparam
package pkg
...
```

> 如果启用了 nolintlint，需要在 `//nolint` 后面添加原因`// xxxx `

```go
import "crypto/md5" //nolint:gosec // this is not used in a secure application

func hash(data []byte) []byte {
	return md5.New().Sum(data) //nolint:gosec // this result is not used in a secure application
}
```

> 是`//nolint`，而不是`// nolint`，依据 Go 规范，需要**程序读取**的注释//后面**不应该有空格**

# 经验技巧

## 降低修改压力

> 第一次使用 golangci-lint 检查代码，会有很多错误

1. 按**目录**检查代码并修改
2. 只检查**新增**代码：`golangci-lint run --new-from-rev=HEAD~1`

## 提高修改效率

1. 按**文件**修改，减少文件切换次数

```
$ golangci-lint run ./... | grep pkg/storage/redis_cluster.go
pkg/storage/redis_cluster.go:16:2: "github.com/go-redis/redis/v7" imported but not used (typecheck)
pkg/storage/redis_cluster.go:82:28: undeclared name: `redis` (typecheck)
pkg/storage/redis_cluster.go:86:14: undeclared name: `redis` (typecheck)
...
```

## 适当增大 `linters-setting.lll.line-length`

1. 默认为 **80**，建议修改为 **120** 或者 **240**

## 使用集成的 linter

> 每个 linter 都有两个属性：`fast` 和 `auto-fix`

1. **fast**
   - 为 true 时，说明该 linter 可以**缓存类型信息**（第一次执行），支持**快速检查**
2. **auto-fix**
   - 为 true 时，说明该 linter 支持**自动修复发现的错误**

> 尽可能多的使用 linter，如果时间和精力允许，建议打开 golangci-lint 提供的**所有 linter**

## 其他

1. 每次**修改代码**后，都要执行 `golangci-lint` -- 及时修正 + 减轻后续的修改压力
2. 在**根目录**放一个**通用**的 golangci-lint 配置文件

