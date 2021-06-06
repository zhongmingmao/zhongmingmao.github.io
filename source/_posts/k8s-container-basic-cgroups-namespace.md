---
title: 容器基础 -- Cgroups & Namespace
mathjax: false
date: 2021-06-06 14:20:43
categories:
    - Cloud Native
    - Kubernetes
tags:
    - Cloud Native
    - Kubernetes
---

# VM vs Container

![image-20210606164536704](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210606164536704.png)

1. Hypervisor
   - 通过**硬件虚拟化**，模拟出一个操作系统所需要的各种硬件，然后在虚拟的硬件上安装Guest OS
2. Docker Engine
   - 『轻量级』虚拟化
   - 不存在真正的『Docker容器』运行在宿主机里面，Docker只是在创建进程时，加上各种不同的**Namespace参数**

<!-- more -->

# 核心功能

1. 通过约束和修改进程的**动态**表现，从而为其创造出一个**边界**
2. Linux容器
   - **Cgroups** -- **制造约束**
   - **Namespace** -- **修改进程视图**

# Namespace
1. Namespace：**PID、Mount、UTS、IPC、Network、User**
2. 容器是特殊的进程：创建容器进程时，指定了一组Namespace参数，这样容器只能看到当前Namespace所限定的资源

## PID Namespace
```
➜  ~ docker run -it busybox /bin/sh
/ # ps
PID   USER     TIME  COMMAND
    1 root      0:00 /bin/sh
    9 root      0:00 ps
```
Linux创建新进程（系统调用为`clone()`）的一个可选参数`CLONE_NEWPID`
```c
int pid = clone(main_function, stack_size, SIGCHLD, NULL);

// 新创建的进程会看到一个全新的进程空间，看到的pid为1
// 在宿主机真实的进程空间里，该进程的pid为真实数值
// 容器里的应用进程，看不到宿主机里真正的进程空间，也看不到其它PID Namespace里的具体情况
int pid = clone(main_function, stack_size, CLONE_NEWPID | SIGCHLD, NULL);
```

# 参考资料
[深入剖析Kubernetes](https://time.geekbang.org/column/intro/100015201)
