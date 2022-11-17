---
title: Kubernetes - Containerization
mathjax: false
date: 2022-09-18 00:06:25
cover: https://kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/docker/docker-01.png.webp
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

# 镜像

> **只读**：依赖的文件系统、依赖库、环境变量、启动参数等

![docker-image](https://kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/docker/docker-container.jpeg)

> 核心解决的问题：**应用分发**

<!-- more -->

# 应用容器化

> 应用不再直接与 OS 打交道，而是**封装成镜像，再交给容器环境去运行**

![](https://docs.docker.com/engine/images/architecture.svg)

# 常用命令

## 镜像

| 命令          | 作用                   |
| ------------- | ---------------------- |
| docker pull   | 从远端仓库拉取镜像     |
| docker images | 列出当前本地已有的镜像 |
| docker rmi    | 删除不再使用的镜像     |

## 容器

```shell
$ docker run -h srv --rm alpine hostname
srv
```

```shell
$ docker run -d nginx:alpine
6376e2649ef2d4a6073b977fcc4408f7a3f21b6f32775b42be85711b989dd6ce

$ docker run -d --name redis_srv redis
2a79d491ecb3108b07df7d369dfe8abc6ac314efc2054951ef7b77e0deba0584

$ docker run -it --name ubuntu ubuntu sh
# cat /etc/os-release
PRETTY_NAME="Ubuntu 22.04.1 LTS"
NAME="Ubuntu"
VERSION_ID="22.04"
VERSION="22.04.1 LTS (Jammy Jellyfish)"
VERSION_CODENAME=jammy
ID=ubuntu
ID_LIKE=debian
HOME_URL="https://www.ubuntu.com/"
SUPPORT_URL="https://help.ubuntu.com/"
BUG_REPORT_URL="https://bugs.launchpad.net/ubuntu/"
PRIVACY_POLICY_URL="https://www.ubuntu.com/legal/terms-and-policies/privacy-policy"
UBUNTU_CODENAME=jammy
```

```shell
$ docker ps -a
CONTAINER ID   IMAGE          COMMAND                  CREATED              STATUS              PORTS      NAMES
5c90257e989c   ubuntu         "sh"                     About a minute ago   Up About a minute              ubuntu
2a79d491ecb3   redis          "docker-entrypoint.s…"   About a minute ago   Up About a minute   6379/tcp   redis_srv
6376e2649ef2   nginx:alpine   "/docker-entrypoint.…"   2 minutes ago        Up 2 minutes        80/tcp     trusting_blackwell
```

```shell
$ docker exec -it redis_srv sh
# cat /etc/os-release
PRETTY_NAME="Debian GNU/Linux 11 (bullseye)"
NAME="Debian GNU/Linux"
VERSION_ID="11"
VERSION="11 (bullseye)"
VERSION_CODENAME=bullseye
ID=debian
HOME_URL="https://www.debian.org/"
SUPPORT_URL="https://www.debian.org/support"
BUG_REPORT_URL="https://bugs.debian.org/"
```

```
$ docker stop 5c 2a 63
5c
2a
63

$ docker rm 5c 2a 63
5c
2a
63
```

| 命令         | 作用                   | 参数                                   |
| ------------ | ---------------------- | -------------------------------------- |
| docker run   | 从镜像启动容器         | `-it`：开启一个交互式操作的 Shell      |
|              |                        | `-d`：让容器在后台运行                 |
|              |                        | `--name`：为容器起一个名字             |
|              |                        | `--rm`：不保存容器，运行完毕后自动清除 |
| docker ps    | 列出正在运行的容器     | `-a`：列出所有容器，包括已经停止的容器 |
| docker exec  | 在容器内执行另一个程序 |                                        |
| docker stop  | 强制停止容器           |                                        |
| docker start | 再次启动已经停止的容器 |                                        |
| docker rm    | 彻底删除容器           |                                        |

