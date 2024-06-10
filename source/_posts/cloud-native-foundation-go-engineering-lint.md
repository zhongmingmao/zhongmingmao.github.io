---
title: Go Engineering - Lint
mathjax: false
date: 2023-05-06 00:06:25
cover: https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/go-engineering-lint.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
  - CI
---

# golangci-lint

> 使用最多

<!-- more -->

# 优点

| Advantage     | Desc                                                         |
| ------------- | ------------------------------------------------------------ |
| 速度快        | 基于 gometalinter 开发，但比 gometalinter 快 5 倍<br />原因：`并行`检查 + 复用 go build `缓存` + 缓存分析结果 |
| 可配置        | 支持 YAML 格式的配置文件                                     |
| IDE 集成      | Goland / VS Code                                             |
| linter 聚合器 | 不需要单独安装                                               |
| 最少误报数    | 调整了所集成 linter 的默认配置，大幅度减少误报               |
| 良好的输出    | 颜色、行号等                                                 |
| 迭代快        | 不断有新的 linter 被集成到 golangci-lint 中                  |

# 选项

![image-20240610140744252](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240610140744252.png)

# 配置

> 同时出现 - 命令行选项 / 配置文件

1. bool/string/int - 命令行选项
2. slice - `合并`

## 命令行选项

> golangci-lint run -h

| Flag                        | Desc                                                         |
| --------------------------- | ------------------------------------------------------------ |
| --print-issued-lines        | Print lines of code with issue (default true)                |
| --print-linter-name         | Print linter name in issue line (default true)               |
| --timeout duration          | Timeout for total work (default 1m0s)                        |
| --tests                     | Analyze tests (*_test.go) (default true)                     |
| -c, --config PATH           | Read config from file path PATH                              |
| --no-config                 | Don't read config                                            |
| --skip-dirs strings         | Regexps of directories to skip                               |
| --skip-dirs-use-default     | Use or not use default excluded directories:<br />- (^\|/)vendor($\|/)<br />- (^\|/)third_party($\|/)<br />- (^\|/)testdata($\|/)<br />- (^\|/)examples($\|/)<br />- (^\|/)Godeps($\|/)<br />- (^\|/)builtin($\|/)<br />(default true) |
| --skip-files strings        | Regexps of files to skip                                     |
| -E, --enable strings        | Enable specific linter                                       |
| -D, --disable strings       | Disable specific linter                                      |
| --disable-all               | Disable all linters                                          |
| --fast                      | Run only fast linters from enabled linters set (first run won't be fast) |
| -e, --exclude strings       | Exclude issue by regexp                                      |
| --exclude-use-default       | Use or not use default excludes:<br />(default true)         |
| --exclude-case-sensitive    | If set to true exclude and exclude rules regular expressions are case sensitive |
| --max-issues-per-linter int | Maximum issues count per one linter. Set to 0 to disable (default 50) |
| --fix                       | Fix found issues (if it's supported by the linter)           |

![image-20240610143721210](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240610143721210.png)

![image-20240610143959301](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240610143959301.png)

## 配置文件

> .golangci.yaml / .golangci.toml / .golangci.json

```yaml
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

> 按需启用 linters

```yaml
linters: 
  disable-all: true  
  enable: # enable下列出 <期望的所有linters>
    - typecheck
    - ... 
```

# Linter

| Properties | Desc                           |
| ---------- | ------------------------------ |
| fast       | 可以缓存类型信息，支持快速检查 |
| auto-fix   | 支持自动修复发现的问题         |

# 实践

## 使用

> 对当前目录及子目录下的`所有 Go 文件`进行静态代码检查

```
$ golangci-lint run

$ golangci-lint run ./...
```

> 对指定的 Go 文件或者指定目录下的 Go 文件进行静态代码检查
> 不会检查 dir1 下子目录的 Go 文件，需要追加 `/...`

```
$ golangci-lint run dir1 dir2/... dir3/file1.go
```

> 根据指定配置文件，进行静态代码检查

```
$ golangci-lint run -c .golangci.yaml ./...
```

> 运行指定的 linter
> golangci-lint 可以在不指定任何配置文件的情况下运行，会运行`默认启用`的 linter
> golangci-lint 会从当前目录`逐层`往上寻找 .golangci.yaml / .golangci.toml / .golangci.json，直到`根`目录

```
$ golangci-lint run --no-config --disable-all -E errcheck ./...
```

> 禁止运行指定的 linter

```
$ golangci-lint run --no-config -D godot,errcheck
```

## 误报

1. 在命令行中添加 `-e` 参数，或者在配置文件的 `issues.exclude` 部分设置要排除的检查错误
   - 使用 `issues.exclude-rules` 来配置哪些文件忽略哪些 linter
2. 通过`run.skip-dirs`、`run.skip-files`和`issues.exclude-rules`忽略指定目录下的所有（或指定） Go 文件
3. 在 Go 源码文件中添加 `//nolint` 注释，来忽略指定的代码行
   - 在 `//nolint` 后添加原因 `// xxxx`
   - 使用 `//nolint`，而非 `// nolint`

> 忽略某一行`所有 linter` 的检查

```go
var bad_name int //nolint
```

> 忽略某一行指定 linter 的检查

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

> 忽略某个文件的指定 linter 检查 - 在 package 上添加 `//nolint` 注释

```go
//nolint:unparam
package pkg
...
```

