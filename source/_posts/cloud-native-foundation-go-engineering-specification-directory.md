---
title: Go Engineering - Specification - Directory
mathjax: false
date: 2022-03-27 00:06:25
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
---

# 平铺式

> 主要用在 **Go 包（框架、库）**中，相对来说比较**简单**，如 [glog](https://github.com/golang/glog)

```
# ls
LICENSE      README.md    glog.go      glog_file.go glog_test.go go.mod
```

# 结构化

> 主要用在 **Go 应用**中，相对来说比较**复杂**，事实规范：[project-layout](https://github.com/golang-standards/project-layout)

<!-- more -->

```
├── api
│   ├── openapi
│   └── swagger
├── build
│   ├── ci
│   ├── docker
│   │   ├── iam-apiserver
│   │   ├── iam-authz-server
│   │   └── iam-pump
│   ├── package
├── CHANGELOG
├── cmd
│   ├── iam-apiserver
│   │   └── apiserver.go
│   ├── iam-authz-server
│   │   └── authzserver.go
│   ├── iamctl
│   │   └── iamctl.go
│   └── iam-pump
│       └── pump.go
├── configs
├── CONTRIBUTING.md
├── deployments
├── docs
│   ├── devel
│   │   ├── en-US
│   │   └── zh-CN
│   ├── guide
│   │   ├── en-US
│   │   └── zh-CN
│   ├── images
│   └── README.md
├── examples
├── githooks
├── go.mod
├── go.sum
├── init
├── internal
│   ├── apiserver
│   │   ├── api
│   │   │   └── v1
│   │   │       └── user
│   │   ├── apiserver.go
│   │   ├── options
│   │   ├── service
│   │   ├── store
│   │   │   ├── mysql
│   │   │   ├── fake
│   │   └── testing
│   ├── authzserver
│   │   ├── api
│   │   │   └── v1
│   │   │       └── authorize
│   │   ├── options
│   │   ├── store
│   │   └── testing
│   ├── iamctl
│   │   ├── cmd
│   │   │   ├── completion
│   │   │   ├── user
│   │   └── util
│   ├── pkg
│   │   ├── code
│   │   ├── options
│   │   ├── server
│   │   ├── util
│   │   └── validation
├── LICENSE
├── Makefile
├── _output
│   ├── platforms
│   │   └── linux
│   │       └── amd64
├── pkg
│   ├── util
│   │   └── genutil
├── README.md
├── scripts
│   ├── lib
│   ├── make-rules
├── test
│   ├── testdata
├── third_party
│   └── forked
└── tools
```

![0f494d5c9f706a7564d4d7280093e81f](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/0f494d5c9f706a7564d4d7280093e81f.webp)

## Go 应用

### 开发相关

#### /web

1. 前端代码存放目录，主要用来存放 Web 静态资源、服务端模板、单页应用

#### /cmd

1. 一个项目有很多组件，可以将**组件的 main 函数**所在的文件夹统一放在 /cmd 目录
2. 每个**组件的目录名**应该与**预期的可执行文件名**一致
3. 保证 `/cmd/<组件>` 目录下不要存放太多代码
   - 如果代码**可以复用**，应该位于 `/pkg` 目录
   - 如果代码**不可复用**，应该位于 `/internal` 目录

```
# ls cmd/
gendocs  geniamdocs  genman  genswaggertypedocs  genyaml  iam-apiserver  iam-authz-server  iamctl  iam-pump

# ls cmd/iam-apiserver/
apiserver.go
```

#### /internal

1. 存放**私有**应用和库代码
2. 在引入其他项目 internal 下的包时，会在**编译时报错**
3. 建议
   - /internal/apiserver：存放真实的应用代码，这些应用的共享代码存放在 /internal/pkg
   - /internal/pkg：存放项目内可共享，项目外不共享的包，提供一些比较**基础**和**通用**的功能
   - 一开始将所有的共享代码都放在 /internal/pkg 下，当共享代码做好了**对外开放的准备**后，再转存到 /pkg

```
An import of a path containing the element “internal” is disallowed if the importing code is outside the tree rooted at the parent of the "internal" directory.
```

```
├── apiserver 			# 应用
│   ├── api
│   │   └── v1 			# HTTP API 接口的具体实现，主要用来串流程（轻量级）
│   │       └── user
│   ├── options 		# 应用的 command flag
│   ├── config 			# 根据命令行参数创建应用配置
│   ├── service 		# 存放应用复杂业务处理代码
│   │   └── user.go
│   ├── store 			# 持久化
│   │   ├── mysql
│   │   │   └── user.go
│   │   ├── fake
│   └── testing
├── authzserver 		# 应用
│   ├── api
│   │   └── v1
│   ├── options
│   ├── store
│   └── testing
├── iamctl          # 对于大型项目，一般都会有一个客户端工具
│   ├── cmd
│   │   ├── cmd.go
│   │   ├── info
└── pkg             # 内部共享包
    ├── code        # 业务 Code
    ├── middleware  # HTTP 处理链
    ├── options
    └── validation  # 通用的验证函数
```

#### /pkg

1. 存放**可以被外部应用使用**的代码库，其他项目可以直接通过 **import** 导入，将代码库放在该目录要**慎重**

#### /vendor

1. **项目依赖**，可以通过 `go mod vendor` 创建，**如果是一个 Go 库，不要提交 vendor 包**

#### /third_party

1. 外部帮助工具，分支代码或者其他第三方应用（如 Swagger UI ）
2. `/third_party/forked/xxx`，与 upstream 保持同步

### 测试相关

#### /test

1. 存放其他外部测试应用和测试数据
2. Go 会忽略以 `.` 和 `_` 开头的目录或者文件

### 部署相关

#### /configs

1. 存放**配置文件模板**或者**默认配置**
2. 配置中不能携带**敏感信息**，可以用**占位符**来替代

```yaml
apiVersion: v1    
user:    
  username: ${CONFIG_USER_USERNAME}
  password: ${CONFIG_USER_PASSWORD}
```

#### /deployments

1. 用来存放 **IaaS**、**PaaS** 系统和**容器编排部署**的配置和模板
   - **Docker-Compose**、**Kubernetes/Helm**、**Mesos**、**Terraform**、**Bosh**
2. 用 Kubernetes 部署的项目，目录名可能为 deploy -- **容器化是大势所趋**

#### /init

1. 主要用于**非容器化部署**的项目，存放**初始化系统**（systemd 等）和**进程管理配置文件**（unit 文件等）

## 项目管理

### /Makefile

1. Makefile 是**很老但仍然优秀**的**项目管理工具**
2. Makefile 通常用来：**静态代码检查**、**单元测试**、**编译**等
3. make 默认操作（推荐）：**`gen -> format -> lint -> test -> build`**

### /scripts

1. 存放脚本文件，用来实现**构建**、**安装**、**分析**等不同功能
2. shell 中的函数名，建议采用**语义化**的命名方式（在 Kubernetes 中大量采用），如：`iam::log::info`

| 目录                | 描述                                                         |
| ------------------- | ------------------------------------------------------------ |
| /scripts/make-rules | 存放 makefile 文件，实现 /Makefile 中的各个功能（为了保持 /Makefile 的简洁） |
| /scripts/lib        | shell 库，是 shell 脚本的一些通用功能，可以抽象成库          |
| /scripts/install    | 自动化部署                                                   |

### /build

1. 存放安装包和 CI 相关的文件

| 目录           | 描述                                                         |
| -------------- | ------------------------------------------------------------ |
| /build/package | 存放容器（**Docker**）、系统（**deb, rpm, pkg**）的包配置和脚本 |
| /build/ci      | 存放 CI（travis）的配置文件和脚本                            |
| /build/docker  | 存放子项目各个组件的 Dockerfile                              |

### /tools

1. 存放项目的支持工具（可导入来自于 /pkg 和 /internal 的代码）

### /githooks

1. Git 钩子

### /assets

1. 项目使用到的其他资源：图片、CSS、JS等

### /website

1. 项目网站相关的数据

## 文档

### /README.md

1. 包含项目的介绍、功能、快速安装、使用指引、开发指引和详细的文档链接
2. README 可以**规范化**，通过工具或者脚本生成

### /docs

1. 设计文档、开发文档、用户文档等
2. /docs/devel/{en-US,zh-CN}
3. /docs/guide/{en-US,zh-CN}
4. /docs/images

### /CONTRIBUTING.md

1. 对于开源就绪的项目，需要 /CONTRIBUTING.md
2. 用途：规范协同流程 + 降低第三方开发者贡献代码的难度

### /api

1. 存放当前项目**对外**提供的**各种不同类型**的 API 接口定义文件
2. API 类型：**protobuf、thrift、http、openapi、swagger**

```
├── openapi/
│   └── README.md
└── swagger/
    ├── docs/
    ├── README.md
    └── swagger.yaml
```

### /LICENSE

1. 版本文件可以是**私有**的，也可以是**开源**的
2. 自动化
   - **addlicense**：将 **LICENSE 头**添加到源码文件或者其他文件
   - **glice**：检查对开源代码的**引用**

### /CHANGELOG

1. 记录更新记录，自动化： **Angular 规范 + git-chglog**

### /examples

1. 示例代码，降低使用者的上手门槛

## 不建议的目录

> 不符合 Go 的设计哲学

| 目录       | 描述                                                         |
| ---------- | ------------------------------------------------------------ |
| **/src/**  | Java 中有 src 目录，默认情况下，Go 项目都会被放置在 `$GOPATH/src` 目录下 |
| **/model** | **按功能拆分**是 Go 的设计哲学，因此不要将类型定义统一放到 /model 目录 |
| **xxs/**   | 统一使用**单数**！                                           |

## 建议

1. 对于小型项目，优先考虑：**cmd、pkg、internal**，其他目录按需创建
2. 空目录无法提交到 Git 仓库，可以使用 **.keep** 文件

```
├── cmd
├── internal
├── pkg
└── README.md
```

