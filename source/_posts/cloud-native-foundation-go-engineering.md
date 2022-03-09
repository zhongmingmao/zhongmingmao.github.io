---
title: Cloud Native Foundation - Go Engineering
mathjax: false
date: 2022-02-13 00:06:25
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go
tags:
  - Cloud Native
  - Go
---

# IO 模型

> **阻塞**：等待数据报文**就绪**；**同步**：等待内核**拷贝**数据

## 阻塞 + 同步

![image-20220214231605085](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20220214231605085.png)

<!-- more -->

## 非阻塞 + 同步

### 轮询

> **轮询**不是一个好的检查状态变更的方式，很难支撑高并发的场景

![image-20220214231832749](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20220214231832749.png)

### IO 多路复用

> Go select channel 也是借鉴于此

#### select / poll

> 在**用户态**将关心的 **fd 列表**（限制为 **1024**）发送给 kernel 

![image-20220214233325934](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20220214233325934.png)

#### epoll

1. 不需要传递 fd 列表：通过 `mmap`，**将用户态和内核态的内存共享**
2. **事件驱动**
   - `epoll_create`：初始化 `wq(wait queue)`、`rdlist(ready list)`、`rbr(red-black root)`
   - `epoll_ctl`：一个 socket **创建**后会加入到红黑树进行管理
   - `epoll_wait`：当 socket **尚未就绪**时，**用户线程会阻塞**
   - 当收到数据报文后，触发**中断**处理程序
     - 然后将对应的 **epitem（对应一个 socket）**移动到 `rdlist`，并且**唤醒**阻塞在该 socket 上的**用户进程**
3. 支持**高并发**

![image-20220214234248481](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20220214234248481.png)

## 非阻塞 + 异步

![image-20220214234038087](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20220214234038087.png)

# HTTP

1. **G 与 socket fd 绑定**
2. 当 socket fd 尚未就绪时，将对应的 G 设置为 `Gwaiting` 状态，将 CPU 时间让给其它 G
3. P 执行调度唤醒 G 时，会检查 fd 是否就绪，如果就绪则将 G 置为 `Grunnable` 并加入执行队列（LRQ 或者 GRQ）
4. G 被调度后处理 fd 数据

![image-20220215000220667](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20220215000220667.png)

## 源代码

```
$ tree
.
├── Dockerfile
├── Makefile
└── httpserver.go
```

```go httpserver.go
package main

import (
        "flag"
        "io"
        "log"
        "net/http"
        "net/http/pprof"

        "github.com/golang/glog"
)

func main() {
        if err := flag.Set("v", "4"); err != nil {
                return
        }
        glog.V(2).Info("Starting http server...")
        mux := http.NewServeMux()
        mux.HandleFunc("/healthz", healthz)
        mux.HandleFunc("/debug/pprof/", pprof.Index)
        mux.HandleFunc("/debug/pprof/profile", pprof.Profile)
        mux.HandleFunc("/debug/pprof/symbol", pprof.Symbol)
        mux.HandleFunc("/debug/pprof/trace", pprof.Trace)
        if err := http.ListenAndServe(":80", mux); err != nil {
                log.Fatal(err)
        }
}

func healthz(w http.ResponseWriter, r *http.Request) {
        if _, err := io.WriteString(w, "ok\n"); err != nil {
                glog.V(2).Info(err)
                return
        }
}
```

```makefile Makefile
export tag=v1.0

root:
        echo "root module"
        export REPO=github.com/zhongmingmao/go

build:
        echo "building httpserver binary"
        mkdir -p bin/amd64
        # cgo is disabled by default when cross-compiling
        CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o bin/amd64 .

release: build
        echo "building httpserver container"
        docker build -t zhongmingmao/httpserver:${tag} .

push: release
        echo "pushing zhongmingmao/httpserver"
        docker push zhongmingmao/httpserver:${tag}
```

```dockerfile Dockerfile
FROM ubuntu

ENV MY_SERVICE_PORT=80
LABEL multi.l1="v1" multi.l2="v2" other="v3"
ADD bin/amd64/httpserver /httpserver
EXPOSE 80
ENTRYPOINT /httpserver
```

## 模块

```
$ go mod init
go: creating new go.mod: module httpserver
go: to add module requirements and sums:
        go mod tidy
        
$ cat go.mod  
module httpserver

go 1.17
```

```
$ go mod tidy 
go: finding module for package github.com/golang/glog
go: found github.com/golang/glog in github.com/golang/glog v1.0.0

$ cat go.sum
github.com/golang/glog v1.0.0 h1:nfP3RFugxnNRyKgeWd4oI1nYvXpxrx8ck8ZrcizshdQ=
github.com/golang/glog v1.0.0/go.mod h1:EWib/APOK0SL3dFbYqvxE3UYd8E6s1ouQ7iEp/0LWV4=
```

```
$ tree
.
├── Dockerfile
├── Makefile
├── go.mod
├── go.sum
└── httpserver.go
```

## 构建

```
$ make
echo "root module"
root module
export REPO=github.com/zhongmingmao/go
```

```
$ make build
echo "building httpserver binary"
building httpserver binary
mkdir -p bin/amd64
# cgo is disabled by default when cross-compiling
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o bin/amd64 .

$ tree          
.
├── Dockerfile
├── Makefile
├── bin
│   └── amd64
│       └── httpserver
├── go.mod
├── go.sum
└── httpserver.go
```

```
$ make release
echo "building httpserver binary"
building httpserver binary
mkdir -p bin/amd64
# cgo is disabled by default when cross-compiling
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o bin/amd64 .
echo "building httpserver container"
building httpserver container
docker build -t zhongmingmao/httpserver:v1.0 .
[+] Building 2.1s (7/7) FINISHED
 => [internal] load build definition from Dockerfile                                                                          0.0s
 => => transferring dockerfile: 37B                                                                                           0.0s
 => [internal] load .dockerignore                                                                                             0.0s
 => => transferring context: 2B                                                                                               0.0s
 => [internal] load metadata for docker.io/library/ubuntu:latest                                                              1.5s
 => CACHED [1/2] FROM docker.io/library/ubuntu@sha256:626ffe58f6e7566e00254b638eb7e0f3b11d4da9675088f4781a50ae288f3322        0.0s
 => => resolve docker.io/library/ubuntu@sha256:626ffe58f6e7566e00254b638eb7e0f3b11d4da9675088f4781a50ae288f3322               0.0s
 => [internal] load build context                                                                                             0.2s
 => => transferring context: 7.18MB                                                                                           0.2s
 => [2/2] ADD bin/amd64/httpserver /httpserver                                                                                0.1s
 => exporting to image                                                                                                        0.1s
 => => exporting layers                                                                                                       0.1s
 => => writing image sha256:8888321aaf823469a6d9d56aefdce48f723a2a9061266a5684f7b1ad93231ed5                                  0.0s
 => => naming to docker.io/zhongmingmao/httpserver:v1.0                                                                       0.0s
 
$ docker images --filter 'label=multi.l1=v1' --filter 'label=multi.l2=v2' --filter 'label=other=v3'
REPOSITORY                TAG       IMAGE ID       CREATED          SIZE
zhongmingmao/httpserver   v1.0      e446f5f2b042   57 minutes ago   80MB
```

```
$ docker run -it --rm -p 8888:80 zhongmingmao/httpserver:v1.0
ERROR: logging before flag.Parse: I0215 08:52:31.904324       8 httpserver.go:17] Starting http server...

$ docker ps
CONTAINER ID   IMAGE                          COMMAND                  CREATED          STATUS          PORTS                  NAMES
a1ce23f6bd41   zhongmingmao/httpserver:v1.0   "/bin/sh -c /httpser…"   17 seconds ago   Up 15 seconds   0.0.0.0:8888->80/tcp   busy_heisenberg

$ docker exec -it a1ce23f6bd41 bash
root@a1ce23f6bd41:/# echo $MY_SERVICE_PORT
80
```

![image-20220215165641647](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20220215165641647.png)

