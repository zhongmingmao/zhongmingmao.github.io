---
title: Go - Module Maintainer
mathjax: false
date: 2023-01-22 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-module-02.png
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 仓库布局

## 单模块

> `首选`：一个 `repo` 管理一个 `module`，一般情况下，`module path` 与`仓库地址`保持一致

```go go.mod
module github.com/zhongmingmao/srsm

go 1.18
```

<!-- more -->

> 如果对 `repo` 打 `tag`，该 tag 会成为 module 的`版本号`，对 repo 的版本管理即对 module 的版本管理

```
$ tree
.
├── LICENSE
├── go.mod
├── pkg1
│   └── pkg1.go
└── pkg2
    └── pkg2.go
```

1. 该 module 对应的`包导入路径`为
   - `github.com/zhongmingmao/srsm/pkg1` 和 `github.com/zhongmingmao/srsm/pkg2`
2. 如果 module 演进到了 2.x 版本，则`包导入路径`变更为 `github.com/zhongmingmao/srsm/v2/pkg1`

## 多模块

```
$ tree
.
├── LICENSE
├── module1
│   ├── go.mod
│   └── pkg1
│       └── pkg1.go
└── module2
    ├── go.mod
    └── pkg2
        └── pkg2.go
```

> module1 go.mod

```go go.mod
module github.com/zhongmingmao/srmm/module1

go 1.18
```

> module2 go.mod

```go go.mod
module github.com/zhongmingmao/srmm/module2

go 1.18
```

1. `包导入路径`变成
   - `github.com/zhongmingmao/srmm/module1/pkg1`
   - `github.com/zhongmingmao/srmm/module2/pkg2`
2. 通过打 `tag` 的方式发布某个 module 时，tag 的名字必须包含`子目录`名称
   - 如 `module1/v1.0.0` 发布的是 module1 的 v1.0.0 版本

# 发布模块

1. 采用`单模块`的管理方式，只需要给 repo 打上 tag 即可，即为 module 的版本
2. 采用`多模块`的管理方式，需要在 tag 中加上 module 的`子目录`名
3. 发布`非正式版`（alpha 或者 beta），使用方需要`显式升级`依赖

```
$ go get github.com/zhongmingmao/srsm
```

# 禁用版本

## 影响

> 演进到了 v1.0.1 版本

![image-20231202220022892](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231202220022892.png)

> 发布了一个异常的版本 v1.0.2

1. 此时，v1.0.2 版本还只存在于源仓库，在任何一个 GoProxy 上还没有这个版本的缓存
2. 如果没有`显式升级`，c1 和 c2 依赖的仍然是 v1.0.1，基于 Go Module 的`最小版本选择`（默认是`兼容`的）
3. 由于 v1.0.2 尚未被 GoProxy 缓存，因此在 GoProxy 开启的客户端，go list 只能查到 v1.0.1
4. 如果绕过 GoProxy（借助 `GONOPROXY`），go list 能查到更新的 v1.0.2 版本
   - 如果某个客户端，通过 get get 进行了`显式更新`，那么就会触发 GoProxy 对 v1.0.2 版本的缓存

![image-20231202220811524](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231202220811524.png)

> GoProxy 已经缓存了 v1.0.2 版本，此后其它客户端即便在 GoProxy 开启的情况下，依然能查到 v1.0.2，`危害开始传播`

![image-20231202221015407](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231202221015407.png)

## 修复

### 旧版重发

> 删除远程仓库的 Tag v1.0.2，本地 fix 问题，然后重新打 Tag v1.0.2 并推送到远程仓库

1. 如果所有的客户端，都直接通过源仓库而不是通过 GoProxy，执行 `go clean -modcache` 后，能解决问题
2. 但大部分情况下，客户端都开启了 GoProxy，无法解决
   - 一旦 GoProxy 上有缓存，不会`回源`，即便源仓库删除，GoProxy 也不会`同步删除`
   - GoProxy 的设计目标：尽可能地缓存更多的模块

![image-20231202222137326](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231202222137326.png)

### 发 patch 版本

![image-20231202222556847](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231202222556847.png)

1. c1 未显式更新，仍然依赖 v1.0.1（`兼容`），保持成功构建
2. c4 为新客户端，首次构建使用最新的 v1.0.3，能成功构建
3. c2 需要显式升级依赖到 v1.0.3，恢复成功构建

## 提示

### retract

> 从 Go `1.16` 开始，可以在 go.mod 中使用 `retract` 指示符，标记哪些版本`作废`

```go go.mod
module bitbucket.org/bigwhite/m1

go 1.17

retract v1.0.2
```

1. 放入 v1.0.3 发布，c2 查看是否有最新版本时，发现当前使用的 v1.0.2 被标记了 retract
2. 但 retract 仅仅只是一个`提示作用`，并不会影响 `go buid`（不会自动绕过 v1.0.2），除非`显式更新`为 v1.0.3

> `retract` 适合标记那些作废的 `minor` 和 `patch` 版本

### Deprecated

> 适用于作废 `major` 版本

```go go.mod
// Deprecated: use bitbucket.org/bigwhite/m1/v2 instead.
module bitbucket.org/bigwhite/m1

go 1.17
```

> `Deprecated` 同样仅用于`提示`，不会影响项目的`构建`

# 升级 major

> `语义化导入`：如果同一个包的新旧版本是`兼容`的，那么其`包导入路径`应该是`相同`的

> Go 采用将 `major` 版本作为`包导入路径`的一部分

```go
import (
	"bitbucket.org/bigwhite/m1/pkg1" // 导入 major 版本为 v0 或者 v1 的 module 下的 pkg1
	pkg1v2 "bitbucket.org/bigwhite/m1/v2/pkg1" // 导入 major 版本为 v2 的 module 下的 pkg1
)
```

1. 在同一个 `repo` 下，不同 `major` 的 module 是`完全不同`的，甚至可以`相互导入`
2. 不同 `major` 的代码是`不兼容`的，因此也要`分开维护`，通常是为`新 major` 建立`新分支`，即 `major branch`
   - 建立 `vN` 分支，并基于 vN 分支打 `vN.x.x` 的 tag，作为 `major 版本`的发布

> major: v2

1. 建立 v2 分支，并切换到 v2 分支上
2. 修改 go.mod 中的 `module path`，增加 v2 后缀
3. 如果 module `内部`包间有`互相导入`，在 `import path` 上也需要加上 v2 后缀
   - 否则会存在`高 major 代码`引用`低 major 代码`的情况，很容易被忽略
4. 此时
   - `v0/v1` module 在 main 分支上，`v2` module 在 v2 分支上
     - 也可以让 `main` 分支始终留给`最高 major`
   - 客户端需要在它依赖的 module 后进行`显式升级`
     - 即在 `import path` 上新增 v2 后缀，并针对`不兼容的代码`进行修改 

```go go.mod
module bitbucket.org/bigwhite/m1/v2

go 1.17
```



