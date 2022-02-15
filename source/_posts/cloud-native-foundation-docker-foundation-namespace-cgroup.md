---
title: Docker Foundation - Namespace + Cgroup
mathjax: false
date: 2022-02-15 00:06:25
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

# 概要

1. 基于 Linux Kernel 的 **Cgroup**、**Namespace**、**Union FS** 等技术，对**进程**进行**封装隔离**，属于 **OS**  层面的**虚拟化技术**
   - 由于被隔离的进程独立于宿主和其它被隔离的进程，因此称为**容器**
2. 演变历史
   - 最早基于 **LXC** -- a linux container **runtime**
   - 0.7：去除 LXC，转而使用自研的 `Libcontainer`
   - 1.11：使用 `runC` 和 `Containerd`
3. **Docker** 在容器的基础上，进行了进一步的封装，**极大地简化了容器的创建和维护**

<!-- more -->

# Docker vs VM

> Docker Engine 是一个 **Daemon** 进程，启动一个容器的时候，相当于执行了一次进程的 **Fork** 操作

![image-20220213140203038](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20220213140203038.png)

|            | Container | VM      |
| ---------- | --------- | ------- |
| 启动时间   | 秒级      | 分钟级  |
| 硬盘使用   | MB 级别   | GB 级别 |
| 性能       | 接近原生  | 弱于    |
| 单机支持量 | 上千      | 几十    |

# 容器标准

1. **OCI** -- Open Container Initiative
   - K8S 的主要贡献：**标准化**
   - 后期 Docker 公司不得不让步，兼容 OCI 标准
2. 核心规范：**Image  + Runtime**
   - **Image** Specification
     - Docker 公司的主要贡献：基于 **Union FS**，创造了 **Image**，解决了**容器分发**的问题
     - 如何通过构建系统打包、生成镜像清单（Manifest）、文件系统序列化文件、镜像配置
   - **Runtime** Specification
     - **Cgroup（由Google开源） + Namespace**
     - 文件系统如何解压到硬盘、Runtime 运行

# Namespace

> 隔离性

## 概念

1. Linux Namespace 是一种 Linux Kernel 提供的**资源隔离**方案
2. Kernel 为进程分配不同的 Namespace，**不同的 Namespace 下的进程互不干扰**
3. Linux 进程在运行时都会归属于某个 Namespace

```c Struct: Linux Process 
struct task_struct {
  ...
  /* namespaces */
  struct nsproxy *nsproxy;
  ...
}
```

```c Struct: Namespace
struct nsproxy {
	atomic_t count;
	struct uts_namespace *uts_ns;
	struct ipc_namespace *ipc_ns;
	struct mnt_namespace *mnt_ns;
	struct pid_namespace *pid_ns_for_children;
	struct net *net_ns;
}
```

## 场景

1. **clone**
   - `int clone(int (*fn)(void *), void *child_stack, int flags, void *arg)`
   - 1 号进程一般是 `systemd`，会有**默认**的 Namespace
   - **创建新进程**时，可以通过  `flags`  指定需要新建的 Namespace
     - CLONE_NEWCGROUP
     - CLONE_NEWIPC
     - CLONE_NEWNET
     - CLONE_NEWNS
     - CLONE_NEWPID
     - CLONE_NEWUSER
     - CLONE_NEWUTS
2. **setns**
   - `int setns(int fd, int nstype)`
   - 让调用进程**加入已经存在的 Namespace 中**
3. **unshare**
   - `int unshare(int flags)`
   - 让调用进程**移动到新的 Namespace 中**
   - *Run a program with some namespaces **unshared from the parent**.*

## 分类

> **systemd Namespace** 一般就是**主机 Namespace**

![image-20220213165420070](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20220213165420070.png)

| Type    | Resource                       | Kernel |
| ------- | ------------------------------ | ------ |
| PID     | 进程                           | 2.6.14 |
| Network | 网络设备、网络协议栈、网络端口 | 2.6.29 |
| IPC     | System V IPC 和 POSIX 消息队列 | 2.6.19 |
| Mount   | 挂载点                         | 2.4.19 |
| UTS     | **主机名、域名**               | 2.6.19 |
| USR     | 用户、用户组                   | 3.8    |

1. **pid namespace**
   - **不同用户的进程**是通过 pid namespace 进行隔离，不同 namespace 中可以有**相同**的 pid
   - 每个 namespace 中的 pid 可以相互隔离
2. **net namespace**
   - 网络隔离通过 net namespace 实现
     - 每个 net namespace 有独立的 **network devices、ip addresses、ip routing tables、/proc/net**等
   - Docker 默认采用 **veth**（**Virtual** Ethernet devices） 的方式
     - 将 container 中的**虚拟网卡**同 host 上的一个 **docker bridge:docker0** 连接在一起
3. **ipc namespace**
   - container 中的进程交互采用的还是 Linux 进程交互的方法：信号量、消息队列、共享内存等
   - container 的进程间交互实际上还是 **host 上具有相同 pid namespace** 中的进程间交互
     - 在 ipc 资源申请时加入 **pid** namespace 的信息
     - 每个 ipc 资源有一个唯一的32位ID
4. **mnt namespace**
   - 允许不同 namespace 的进程看到不同的**文件结构**
5. **uts namespace**
   - UTS -- **UNIX Time-sharing System**
   - 允许每个 container 拥有独立的 **hostname** 和 **domain name**
     - 使其在网络上被视为一个**独立的节点**而非 host 上的一个进程
6. **user namespace**
   - 每个 container 可以有不同的 user 和 group id
   - 在 container 内部用 **container 内部的用户**执行程序而非 host 上的用户

```shell host
$ ip a show docker0      
8: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default 
    link/ether 02:42:13:26:ff:24 brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
       valid_lft forever preferred_lft forever
    inet6 fe80::42:13ff:fe26:ff24/64 scope link 
       valid_lft forever preferred_lft forever
```

> container 中的 eth0@if109 与宿主机上的 docker0 连接在一起

```shell container
$ docker exec 26d6093bb719 ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
108: eth0@if109: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default 
    link/ether 02:42:ac:11:00:02 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.17.0.2/16 brd 172.17.255.255 scope global eth0
       valid_lft forever preferred_lft forever
```

## 操作

```
$ docker run -it --rm centos bash
```

> container id: 09ac15393c37, pid@host: 364627

```
$ docker ps | grep centos
09ac15393c37    centos    "bash"    7 minutes ago    Up 7 minutes    goofy_sanderson

$ docker inspect --format "{{.State.Pid}}" 09ac15393c37            
364627
```

```
$ lsns 
        NS TYPE   NPROCS     PID USER  COMMAND
4026531835 cgroup     82    1757 xxx /lib/systemd/systemd --user
4026531836 pid        74    1757 xxx /lib/systemd/systemd --user
4026531837 user       82    1757 xxx /lib/systemd/systemd --user
4026531838 uts        74    1757 xxx /lib/systemd/systemd --user
4026531839 ipc        74    1757 xxx /lib/systemd/systemd --user
4026531840 mnt        73    1757 xxx /lib/systemd/systemd --user
4026532008 net        74    1757 xxx /lib/systemd/systemd --user
...
```

```
$ sudo ls -l /proc/364627/ns
total 0
lrwxrwxrwx 1 root root 0 Feb 15 22:36 cgroup -> 'cgroup:[4026531835]'
lrwxrwxrwx 1 root root 0 Feb 15 22:36 ipc -> 'ipc:[4026535866]'
lrwxrwxrwx 1 root root 0 Feb 15 22:36 mnt -> 'mnt:[4026535864]'
lrwxrwxrwx 1 root root 0 Feb 15 22:36 net -> 'net:[4026535869]'
lrwxrwxrwx 1 root root 0 Feb 15 22:36 pid -> 'pid:[4026535867]'
lrwxrwxrwx 1 root root 0 Feb 15 22:37 pid_for_children -> 'pid:[4026535867]'
lrwxrwxrwx 1 root root 0 Feb 15 22:37 time -> 'time:[4026531834]'
lrwxrwxrwx 1 root root 0 Feb 15 22:37 time_for_children -> 'time:[4026531834]'
lrwxrwxrwx 1 root root 0 Feb 15 22:36 user -> 'user:[4026531837]'
lrwxrwxrwx 1 root root 0 Feb 15 22:36 uts -> 'uts:[4026535865]'
```

> `nsenter` 是常用**调试**命令，场景：container 本身没有太多可用命令

```
$ sudo nsenter -t 364627 -n ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
110: eth0@if111: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default 
    link/ether 02:42:ac:11:00:02 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.17.0.2/16 brd 172.17.255.255 scope global eth0
       valid_lft forever preferred_lft forever

$ docker exec 09ac15393c37 ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
110: eth0@if111: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default 
    link/ether 02:42:ac:11:00:02 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.17.0.2/16 brd 172.17.255.255 scope global eth0
       valid_lft forever preferred_lft forever
```

# Cgroup

> 可配额

## 概念

1. Cgroup（Control Group）：Linux 下对一个或者一组进程进行**资源控制**的机制
   - 资源分类：CPU 使用时间、内存、磁盘 IO 等
2. 不同资源的具体管理工作由相应的 **Cgroup 子系统**来实现
3. 针对不同类型的资源限制，只需要将**限制策略**在不同的**子系统**上进行**关联**即可
4. Cgroup 在不同的系统资源管理子系统中以**层级树**的方式来组织管理
   - 每个 Cgroup 可以包含其他子 Cgroup，**子 Cgroup 受到 父 Cgroup 设置的资源限制**

## Cgroup Driver

![image-20220215231448648](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20220215231448648.png)

1. Cgroup 本身需要一个 `driver` 去实现（通过控制**文件**去实现功能），systemd 在启动时会加载该文件系统
2. **systemd**
   - 当操作系统使用 systemd 作为 init system 时，初始化进程会生成一个根 cgroup 目录并作为 cgroup 管理器
   - systemd 与 cgroup 紧密结合，并且为每个 systemd unit 分配 cgroup
3. **Docker**
   - Docker 默认使用 cgroupfs 作为 cgroup driver
4. 问题
   - 在 **systemd** 作为 init system 的系统中，默认**并存两套 cgroup driver**，管理**混乱**
   - 因此，kubelet 会默认 `--cgroup-driver=systemd`

## TODO

> Cgroup 子系统的详细内容，后续补充

