---
title: Docker Foundation - Union FS
mathjax: false
date: 2022-03-08 00:06:25
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Container
  - Docker
tags:
  - Cloud Native
  - Container
  - Docker
---

# Union FS

> Docker 的创新在**文件系统**：通过**镜像**解决**容器分发**的问题

1. 将**不同目录**挂载到**同一个虚拟文件系统**下的文件系统
2. 支持为每一个**成员目录**（类似于 **Git Branch**）设定权限：`readonly`、`readwrite`、`whiteout-able`
3. 文件系统分层，对 `readonly` 权限的 Branch 可以**逻辑上**进行修改（**增量**、不影响 `readonly` 部分）
4. 用途
   - 将多个 Disk 挂在同一个目录下
   - 将一个 `readonly` 的 Branch 和一个 `writeable` 的 Branch 联合在一起

<!-- more -->

# Docker 镜像

> 层可以**复用**，增量分发

![image-20220308221506755](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20220308221506755.png)

```
# docker image inspect --format '{{.RootFS}}' centos:latest
{layers [sha256:74ddd0ec08fa43d09f32636ba91a0a3053b02cb4627c35051aff89f853606b59] }
```

# 镜像文件系统

1. bootfs
   - Bootloader **引导加载 kernel**
   - 当 kernel 被加载到内存后，**umount bootfs**
2. rootfs
   - rootfs：`/dev`、`/proc` 等**标准目录和文件**
3. 不同的 Linux 发行版，**bootfs 基本一致，而 rootfs 会有差异**，**容器关心的只是 kernel**

![image-20220308224259859](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20220308224259859.png)

# 容器运行态

> 容器是 Linux 上的一个进程，**没有 bootfs（复用宿主机的 kernel），只有 rootfs**
> 容器需要借助 **mnt namespace** 进行隔离，可见的是镜像的 **rootfs**

1. Linux
   - 在启动时，先将 **rootfs** 设置为 **readonly**，在进行一系列检查后，将其切换成 **readwrite** 供用户使用
2. Docker 启动
   - 初始化时，同样将 **rootfs** 以 **readonly** 的方式加载并检查
   - 然后利用 **Union FS** 的方式将一个 **readwrite** 文件系统挂载在 **readonly** 的 **rootfs** 之上
   - 再次将**下层的 FS** 设为 **readonly**，并向上叠加 -- **迭代**
   - 这样构成了 **container** 的运行态：**N 个 readonly FS 层 + 1 个 writeable FS 层**

![image-20220308225758225](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20220308225758225.png)

# 写操作

> 镜像是共享的，容器对**可写层**的操作依赖于**存储驱动**提供的**写时复制**和**用时分配**机制 -- 提高存储和内存资源的**利用率**

1. **写时复制**
   - 当需要修改镜像的文件时，从镜像的文件系统**复制**一份到容器的可写层进行修改，镜像里的文件不会改变
     - 同一个镜像可以对应多个容器，**对应的镜像文件只会有一份**，内容不同的是各自容器的可写层
     - 不同容器对文件的修改是**互不影响**的
2. **用时分配**：当一个文件**被创建**出来后，才会**分配**空间

# 容器存储驱动

> 主流：OverlayFS

![image-20220308231845539](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20220308231845539.png)

![image-20220308232731280](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20220308232731280.png)

# OverlayFS

1. OverlayFS 是一种 **Union FS**，属于**文件级**的存储驱动（`BtrFS` 和 `ZFS` 都是**块级别**的存储驱动）
2. Overlay 只有两层：**Lower** 层代表**镜像层**，**Upper** 层代表**容器可写层**

![image-20220308233522162](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20220308233522162.png)

> work 是临时工作目录，以 merged 为准

```
# mkdir upper lower merged work
# echo "from lower" > lower/in_lower.txt
# echo "from upper" > upper/in_upper.txt
# echo "from lower" > lower/in_both.txt
# echo "from upper" > upper/in_both.txt
# tree
.
├── lower
│   ├── in_both.txt
│   └── in_lower.txt
├── merged
├── upper
│   ├── in_both.txt
│   └── in_upper.txt
└── work

# mount -t overlay overlay -o lowerdir=`pwd`/lower,upperdir=`pwd`/upper,workdir=`pwd`/work `pwd`/merged
# tree
.
├── lower
│   ├── in_both.txt
│   └── in_lower.txt
├── merged
│   ├── in_both.txt
│   ├── in_lower.txt
│   └── in_upper.txt
├── upper
│   ├── in_both.txt
│   └── in_upper.txt
└── work
    └── work
    
# cat merged/in_lower.txt 
from lower

# cat merged/in_upper.txt 
from upper

# cat merged/in_both.txt 
from upper
```

```
# docker inspect --format '{{.GraphDriver.Name}}' 4201f70592fb
overlay2

# docker inspect --format '{{.GraphDriver.Data}}' 4201f70592fb
map[
  LowerDir:/var/lib/docker/overlay2/107d1c12b28e3fabb3e3786958511781538314871aa811d3c67167369ab34868-init/diff:/var/lib/docker/overlay2/f16880bc8754bf4782daa4849d0e2f41c56ec5c5e8bf8718efce67ca38a853de/diff 
  MergedDir:/var/lib/docker/overlay2/107d1c12b28e3fabb3e3786958511781538314871aa811d3c67167369ab34868/merged 
  UpperDir:/var/lib/docker/overlay2/107d1c12b28e3fabb3e3786958511781538314871aa811d3c67167369ab34868/diff 
  WorkDir:/var/lib/docker/overlay2/107d1c12b28e3fabb3e3786958511781538314871aa811d3c67167369ab34868/work
]

# ls /var/lib/docker/overlay2/107d1c12b28e3fabb3e3786958511781538314871aa811d3c67167369ab34868/merged 
bin  dev  etc  home  lib  lib64  lost+found  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
```

# OCI

> Open Container Initiative -- Google 主导

| Specification                  | Desc                             |
| ------------------------------ | -------------------------------- |
| **Image** Specification        | 定义应用如何打包                 |
| **Distribution** Specification | 定义如何分发容器镜像             |
| **Runtime** Specification      | 定义如何**解压**应用包并**运行** |

# Docker 引擎架构

> containerd 是一个单纯的 daemon，fork 出来的子进程的父进程是一个 **shim**（shim 的父进程是 systemd），这样 containerd 重启时不会影响其他进程

![image-20220309000951365](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20220309000951365.png)

> 6469 就是 shim

```
# docker inspect --format '{{.State.Pid}}' 4201f70592fb
6491

# ps -ef | grep 6491                                              
root        6491    6469  0 15:58 pts/0    00:00:00 bash

# ps -ef | grep 6469    
root        6469       1  0 15:58 ?        00:00:00 /usr/bin/containerd-shim-runc-v2 ...
root        6491    6469  0 15:58 pts/0    00:00:00 bash
```

> 容器内的 1 号进程，是 **EntryPoint** 进程，并非宿主机上的 systemd

```
docker exec -it 4201f70592fb ps -ef
UID          PID    PPID  C STIME TTY          TIME CMD
root           1       0  0 15:58 pts/0    00:00:00 bash
root          15       0  0 16:23 pts/1    00:00:00 ps -ef
```

