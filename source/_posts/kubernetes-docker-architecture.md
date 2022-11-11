---
title: Kubernetes - Docker Architecture
mathjax: false
date: 2022-09-15 00:06:25
cover: https://kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/docker/docker.png
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

# Architecture

> 核心是 Docker daemon

![](https://docs.docker.com/engine/images/architecture.svg)

<!-- more -->

# Flow

```shell
$ docker run hello-world
Unable to find image 'hello-world:latest' locally
latest: Pulling from library/hello-world
2db29710123e: Pull complete
Digest: sha256:faa03e786c97f07ef34423fccceeec2398ec8a5759259f94d99078f264e9d7af
Status: Downloaded newer image for hello-world:latest

Hello from Docker!
This message shows that your installation appears to be working correctly.

To generate this message, Docker took the following steps:
 1. The Docker client contacted the Docker daemon.
 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.
    (amd64)
 3. The Docker daemon created a new container from that image which runs the
    executable that produces the output you are currently reading.
 4. The Docker daemon streamed that output to the Docker client, which sent it
    to your terminal.

To try something more ambitious, you can run an Ubuntu container with:
 $ docker run -it ubuntu bash

Share images, automate workflows, and more with a free Docker ID:
 https://hub.docker.com/

For more examples and ideas, visit:
 https://docs.docker.com/get-started/
```

