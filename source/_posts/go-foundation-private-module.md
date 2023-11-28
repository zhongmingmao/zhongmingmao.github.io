---
title: Go - Private Module
mathjax: false
date: 2023-01-20 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-modules.jpeg
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 导入本地 Module

> 借助 `go.mod` 的 `replace` 指示符

```
require github.com/user/b v1.0.0

replace github.com/user/b v1.0.0 => 本地源码路径
```

> 优化方案：`Go workspace`

<!-- more -->

# Private Module

## 公网

> 对 `private module` 的拉取，不会走 `GOPROXY` 代理服务，也不会去 `GOSUMDB` 服务器做 Go 包的 `hash` 值校验

![image-20231128001851118](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231128001851118.png)

## 内网

> 更主流

![image-20231128002328792](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231128002328792.png)

### 方案 1

> `in-hourse goproxy` 类似于 `nexus`

![image-20231128002600991](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231128002600991.png)

### 方案 2

> 推荐

![image-20231128003112046](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231128003112046.png)

1. Go 命令默认会对所有通过 `goproxy` 拉取到的 `Go Module`，进行 `sum 校验`（默认到 `sum.golang.org`）
2. 为了`跳过` sum 验证，需要将 `private module` 填到 `GONOSUMDB` 中

# 实践

## GOPROXY

> 编译

```
$ mkdir goproxy
$ cd goproxy/
$ git clone https://github.com/goproxyio/goproxy
$ cd goproxy/

$ make
$ tree bin
bin
└── goproxy
```

> 缓存

```
$ mkdir /home/zhongmingmao/goproxy/goproxy/bin/cache
```

> 启动

```
$ ./bin/goproxy -listen=0.0.0.0:8081 -cacheDir=/home/zhongmingmao/goproxy/goproxy/bin/cache -proxy https://goproxy.io
goproxy.io: ProxyHost https://goproxy.io
```

> 验证

```shell
$ export GOPROXY=http://mac-dev:8081,direct

$ go get github.com/pkg/errors
```

```
goproxy.io: ------ --- /github.com/pkg/errors/@v/list [proxy]
goproxy.io: ------ --- /github.com/pkg/@v/list [proxy]
goproxy.io: ------ --- /github.com/@v/list [proxy]
goproxy.io: 1.070s 404 /github.com/pkg/@v/list
goproxy.io: 1.132s 404 /github.com/@v/list
goproxy.io: 1.151s 200 /github.com/pkg/errors/@v/list
```

```
$ tree /home/zhongmingmao/goproxy/goproxy/bin/cache
/home/zhongmingmao/goproxy/goproxy/bin/cache
└── pkg
    └── mod
        └── cache
            └── download
                └── github.com
                    └── pkg
                        └── errors
                            └── @v
                                └── list
```

## 方案

> 自定义`包导入路径`并将其映射到内部的 `vcs` 仓库（Version Control Software）

![image-20231128181506848](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231128181506848.png)

![image-20231128181708576](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231128181708576.png)



