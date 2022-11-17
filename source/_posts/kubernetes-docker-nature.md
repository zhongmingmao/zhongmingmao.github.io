---
title: Kubernetes - Docker Nature
mathjax: false
date: 2022-09-16 00:06:25
cover: https://kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/docker/docker-geek.jpeg
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

# 本质

> 容器，是一个特殊的**隔离**环境，能够让进程只看到这个环境内的**有限**信息，不能对外界环境施加影响
> 隔离的原因：**系统安全**
> 隔离的实现：**namespace + cgroup + chroot(rootfs)**

<!-- more -->

# Container vs VM

> 容器并不是直接运行在 Docker 上，Docker 只是**辅助建立隔离环境**，让容器基于 Linux 运行

![](https://kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/docker/container-vm.jpeg)

> VM 虚拟化出来的是**硬件**，需要在上面再安装一个 **Guest OS** 才能运行应用程序，会消耗大量的**系统资源**

> 容器则直接利用了下层的计算机硬件和操作系统，非常轻量级，但多个容器共用 **OS Kernel**，隔离程度不如 VM

|           | 实现方式                     | 优势                         | 劣势               |
| --------- | ---------------------------- | ---------------------------- | ------------------ |
| VM        | 虚拟化硬件                   | 隔离程度非常高               | 资源消耗大，启动慢 |
| Container | 直接利用下层的硬件和操作系统 | 资源利用率高<br />运行速度快 | 隔离程度较低       |

