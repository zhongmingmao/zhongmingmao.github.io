---
title: Kubernetes - Dockerfile
mathjax: false
date: 2022-09-19 00:06:25
cover: https://kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/docker/docker-02.webp
categories:
  - Kubernetes
  - Docker
tags:
  - Cloud Native
  - Kubernetes
  - Docker
  - Container
  - Architecture
---

# Image

> 镜像由多层 **Layer** 组成，Layer 是一组**只读不可修改**的文件，Layer 可以在镜像间**共享**
> **Image = Layer + Union FS**

![](https://kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/docker/docker-layer.png)

<!-- more -->

```shell
$ docker inspect nginx:alpine
...
        "RootFS": {
            "Type": "layers",
            "Layers": [
                "sha256:e5e13b0c77cbb769548077189c3da2f0a764ceca06af49d8d558e759f5c232bd",
                "sha256:07099189e7ec257e501d9625507b55e0ea32c330e38c90d8533b3fa2a7a97069",
                "sha256:fcf860bf48b4e20f24f44ba02115dc9f23eef6d41d69e9a050889bf25104e12a",
                "sha256:6636f46e559dffe6373b200c359773488f201ed2153507fb8d8fe3f04fdf477e",
                "sha256:9365b1fffb04e52b8f6abf1c8737ba4da02e134c1d8550e0ace4cb562d12f070",
                "sha256:bd502c2dee4c0bc2cf334c7d289e5a14ededd6c9c361137d128d3c12e4babf5d"
            ]
        },
...
```

> Docker 镜像遵循 **OCI** 标准，能被其他容器技术（如 Kata、Kubernetes）识别并运行

# Dockerfile

> 记录一系列的构建指令，**每个指令都会生成一个  Layer** -- 不要**滥用**构建指令

## Quick start

```dockerfile Dockerfile.busybox
FROM busybox
CMD echo "hello docker"
```

```
$ docker build -f Dockerfile.busybox .
Sending build context to Docker daemon  2.048kB
Step 1/2 : FROM busybox
latest: Pulling from library/busybox
405fecb6a2fa: Pull complete
Digest: sha256:fcd85228d7a25feb59f101ac3a955d27c80df4ad824d65f5757a954831450185
Status: Downloaded newer image for busybox:latest
 ---> 9d5226e6ce3f
Step 2/2 : CMD echo "hello docker"
 ---> Running in 85d2ffa3a54f
Removing intermediate container 85d2ffa3a54f
 ---> 36b1ca4f0ea6
Successfully built 36b1ca4f0ea6
```

```shell
$ docker images
REPOSITORY   TAG       IMAGE ID       CREATED          SIZE
<none>       <none>    36b1ca4f0ea6   45 seconds ago   1.24MB
```

```shell
$ docker history 36b1ca4f0ea6
IMAGE          CREATED        CREATED BY                                      SIZE      COMMENT
36b1ca4f0ea6   9 hours ago    /bin/sh -c #(nop)  CMD ["/bin/sh" "-c" "echo…   0B
9d5226e6ce3f   13 hours ago   /bin/sh -c #(nop)  CMD ["sh"]                   0B
<missing>      13 hours ago   /bin/sh -c #(nop) ADD file:36d9f497f679d5673…   1.24MB
```

```shell
$ docker inspect 36b1ca4f0ea6
...
        "RootFS": {
            "Type": "layers",
            "Layers": [
                "sha256:40cf597a9181e86497f4121c604f9f0ab208950a98ca21db883f26b0a548a2eb"
            ]
        },
...
```

```shell
$ docker run --rm 36b1ca4f0ea6
hello docker
```

## Best practic

### FROM

| 关注点      | 基础镜像                 |
| ----------- | ------------------------ |
| 安全 + 大小 | Alpine                   |
| 稳定        | Ubuntu / Debian / CentOS |

### COPY

> 源文件必须在**构建上下文**的路径里面，不能随意指定文件

### RUN

> 可以执行**任意的 Shell 命令**

> 对于超长的 RUN 指令，可以结合 COPY 命令

```dockerfile
COPY setup.sh  /tmp/
RUN cd /tmp && chmod +x setup.sh \
    && ./setup.sh && rm setup.sh
```

### ARG + ENV

|          | ARG   | ENV  |
| -------- | ----- | ---- |
| 镜像构建 | Y     | Y    |
| 容器运行 | **N** | Y    |

### EXPOSE

> 用来声明容器**对外服务**的端口号

```dockerfile
EXPOSE 443     # 默认是tcp协议
EXPOSE 53/udp
```

# docker build

> docker 是客户端，真正构建镜像的是 **docker daemon**

> docker 客户端只能**把构建上下文目录打包上传**，这样 docker daemon 就能获取到打包上传的文件 -- **.dockerignore**

![](https://docs.docker.com/engine/images/architecture.svg)

