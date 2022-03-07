---
title: Docker Foundation - Namespace + Cgroup
mathjax: false
date: 2022-03-07 00:06:25
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
   - 由于被隔离的进程独立于宿主机和其它被隔离的进程，因此称为**容器**
2. 演变历史
   - 最早基于 **LXC** -- a linux container **runtime**
   - 0.7：去除 LXC，转而使用自研的 `Libcontainer`
   - 1.11：使用 **`runC`** 和 **`containerd `**
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
     - **Cgroup（由 Google 开源） + Namespace**
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

```
# ls -l /proc/1/ns
total 0
lrwxrwxrwx 1 root root 0 Mar  1 15:31 cgroup -> 'cgroup:[4026531835]'
lrwxrwxrwx 1 root root 0 Mar  1 15:31 ipc -> 'ipc:[4026531839]'
lrwxrwxrwx 1 root root 0 Feb 28 23:36 mnt -> 'mnt:[4026531840]'
lrwxrwxrwx 1 root root 0 Mar  1 15:31 net -> 'net:[4026531992]'
lrwxrwxrwx 1 root root 0 Feb 28 15:40 pid -> 'pid:[4026531836]'
lrwxrwxrwx 1 root root 0 Mar  1 15:31 pid_for_children -> 'pid:[4026531836]'
lrwxrwxrwx 1 root root 0 Mar  1 15:31 time -> 'time:[4026531834]'
lrwxrwxrwx 1 root root 0 Mar  1 15:31 time_for_children -> 'time:[4026531834]'
lrwxrwxrwx 1 root root 0 Mar  1 15:31 user -> 'user:[4026531837]'
lrwxrwxrwx 1 root root 0 Mar  1 15:31 uts -> 'uts:[4026531838]'
```

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

```
# ip a show docker0                         
3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default 
    link/ether 02:42:58:a4:13:33 brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
       valid_lft forever preferred_lft forever
    inet6 fe80::42:58ff:fea4:1333/64 scope link 
       valid_lft forever preferred_lft forever
```

> container 中的 eth0@if13 与宿主机上的 docker0 连接在一起

```
# docker run -it --rm busybox ip a show eth0
12: eth0@if13: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1500 qdisc noqueue 
    link/ether 02:42:ac:11:00:02 brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.2/16 brd 172.17.255.255 scope global eth0
       valid_lft forever preferred_lft forever
```

## 操作

> container id: afde0a1ff737, pid@host: 1771

```
# docker run -it --rm centos bash
[root@8a213344c62b /]#

# docker inspect --format '{{.State.Pid}}' 8a213344c62b            
1771
```

```
# lsns            
        NS TYPE   NPROCS   PID USER             COMMAND
4026531834 time      227     1 root             /sbin/init
4026531835 cgroup    227     1 root             /sbin/init
4026531836 pid       226     1 root             /sbin/init
4026531837 user      227     1 root             /sbin/init
4026531838 uts       223     1 root             /sbin/init
4026531839 ipc       226     1 root             /sbin/init
4026531840 mnt       219     1 root             /sbin/init
......
```

```
# ls -l /proc/1771/ns 
total 0
lrwxrwxrwx 1 root root 0 Mar  1 16:06 cgroup -> 'cgroup:[4026531835]'
lrwxrwxrwx 1 root root 0 Mar  1 16:06 ipc -> 'ipc:[4026532646]'
lrwxrwxrwx 1 root root 0 Mar  1 16:06 mnt -> 'mnt:[4026532644]'
lrwxrwxrwx 1 root root 0 Mar  1 16:04 net -> 'net:[4026532649]'
lrwxrwxrwx 1 root root 0 Mar  1 16:06 pid -> 'pid:[4026532647]'
lrwxrwxrwx 1 root root 0 Mar  1 16:07 pid_for_children -> 'pid:[4026532647]'
lrwxrwxrwx 1 root root 0 Mar  1 16:06 time -> 'time:[4026531834]'
lrwxrwxrwx 1 root root 0 Mar  1 16:07 time_for_children -> 'time:[4026531834]'
lrwxrwxrwx 1 root root 0 Mar  1 16:06 user -> 'user:[4026531837]'
lrwxrwxrwx 1 root root 0 Mar  1 16:06 uts -> 'uts:[4026532645]'
```

> `nsenter` 是常用**调试**命令，适用场景：container 本身没有太多可用命令

```
# nsenter -t 1771 -n ip a show eth0
4: eth0@if5: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default 
    link/ether 02:42:ac:11:00:02 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.17.0.2/16 brd 172.17.255.255 scope global eth0
       valid_lft forever preferred_lft forever

# docker exec 8a213344c62b ip a show eth0  
4: eth0@if5: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default 
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

1. Cgroup 本身需要一个 `driver` 去实现（通过控制**文件**去实现功能），**systemd 在启动时会加载该文件系统**
2. **systemd**
   - 当操作系统使用 systemd 作为 init system 时，初始化进程会生成一个**根 cgroup 目录**并作为 cgroup 管理器
   - systemd 与 cgroup 紧密结合，并且为每个 systemd unit 分配 cgroup
3. **Docker**
   - Docker 默认使用 **cgroupfs** 作为 cgroup driver
4. 问题
   - 在 **systemd** 作为 init system 的系统中，默认**并存两套 cgroup driver**，管理**混乱**
   - 因此，kubelet 会默认 `--cgroup-driver=systemd`

## 子系统

> 资源分类：可压缩资源（cpu等）、不可压缩资源（memory等）

| 子系统     | 描述                                                         |
| ---------- | ------------------------------------------------------------ |
| blkio      | 设置限制每个块设备的输入输出控制                             |
| **cpu**    | 控制一个进程可以使用多少 CPU                                 |
| cpuacct    | 产生 cgroup 任务的 CPU 资源报告                              |
| **cpuset** | **绑核**：如果是多核 CPU，为 cgroup 任务分配**单独**的 CPU 和内存 |
| devices    | 允许或者拒绝 cgroup 任务对设备的访问                         |
| freezer    | 暂停和恢复 cgroup 任务                                       |
| **memory** | 设置每个 cgroup 的内存限制以及产生内存资源报告               |
| net_cls    | 标记每个网络包以供 cgroup 方便使用                           |
| ns         | 命名空间                                                     |
| pid        | 进程标识                                                     |

### cpu

| 配置项            | 描述                                                         |
| ----------------- | ------------------------------------------------------------ |
| cpu.shares        | 可出让的能获得 CPU 使用时间的**相对值**                      |
| cpu.cfs_period_us | 配置时间周期长度，单位为**微秒**                             |
| cpu.cfs_quota_us  | 配置当前 cgroup 在 cfs_period_us 时间内最多能使用的 CPU 时间数，单位是**微秒** |
| cpu.stat          | cgroup 内的进程使用 CPU 的时间统计                           |
|                   | nr_periods：经过 cpu.cfs_period_us 的时间周期数量            |
|                   | nr_throttled：在经过的周期内，进程因为在指定的时间周期内用光了配额时间而受到限制的次数 |
|                   | throttled_time：cgroup 中的进程被限制使用 CPU 的总用时，单位**纳秒** |

```
# pwd
/sys/fs/cgroup

# ll
total 0
dr-xr-xr-x 11 root root  0 Mar  1 15:56 blkio
lrwxrwxrwx  1 root root 11 Mar  1 15:56 cpu -> cpu,cpuacct
lrwxrwxrwx  1 root root 11 Mar  1 15:56 cpuacct -> cpu,cpuacct
dr-xr-xr-x 11 root root  0 Mar  1 15:56 cpu,cpuacct
dr-xr-xr-x  3 root root  0 Mar  1 15:56 cpuset
dr-xr-xr-x 11 root root  0 Mar  1 15:56 devices
dr-xr-xr-x  4 root root  0 Mar  1 15:56 freezer
dr-xr-xr-x  3 root root  0 Mar  1 15:56 hugetlb
dr-xr-xr-x 11 root root  0 Mar  1 15:56 memory
lrwxrwxrwx  1 root root 16 Mar  1 15:56 net_cls -> net_cls,net_prio
dr-xr-xr-x  3 root root  0 Mar  1 15:56 net_cls,net_prio
lrwxrwxrwx  1 root root 16 Mar  1 15:56 net_prio -> net_cls,net_prio
dr-xr-xr-x  3 root root  0 Mar  1 15:56 perf_event
dr-xr-xr-x 11 root root  0 Mar  1 15:56 pids
dr-xr-xr-x  2 root root  0 Mar  1 15:56 rdma
dr-xr-xr-x 12 root root  0 Mar  1 15:56 systemd
dr-xr-xr-x 11 root root  0 Mar  1 15:56 unified

# ls cpu
cgroup.clone_children  cpuacct.usage             cpuacct.usage_percpu_user  cpu.cfs_quota_us     dev-mqueue.mount   sys-fs-fuse-connections.mount  system.slice
cgroup.procs           cpuacct.usage_all         cpuacct.usage_sys          cpu.shares           docker             sys-kernel-config.mount        tasks
cgroup.sane_behavior   cpuacct.usage_percpu      cpuacct.usage_user         cpu.stat             notify_on_release  sys-kernel-debug.mount         user.slice
cpuacct.stat           cpuacct.usage_percpu_sys  cpu.cfs_period_us          dev-hugepages.mount  release_agent      sys-kernel-tracing.mount
```

#### shares

```
# cat cpu/cpu.shares 
1024

# cat cpu/docker/cpu.shares 
1024

# cat cpu/system.slice/cpu.shares 
1024
```

![image-20220307221824803](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20220307221824803.png)

#### 流量控制

> cfs_period_us 和 cfs_quota_us 控制进程使用 CPU 的绝对值
> cfs_period_us 的视角是**单个 CPU**

```
# cat cpu/cpu.cfs_period_us      
100000

# cat cpu/cpu.cfs_quota_us 
-1
```

![image-20220307222351051](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20220307222351051.png)

#### 样例

```
# cd cpu && mkdir cpudemo && ls cpudemo
cgroup.clone_children  cpuacct.usage         cpuacct.usage_percpu_sys   cpuacct.usage_user  cpu.shares      cpu.uclamp.min
cgroup.procs           cpuacct.usage_all     cpuacct.usage_percpu_user  cpu.cfs_period_us   cpu.stat        notify_on_release
cpuacct.stat           cpuacct.usage_percpu  cpuacct.usage_sys          cpu.cfs_quota_us    cpu.uclamp.max  tasks
```

```go busy_loop.go
package main

func main() {
        go func() {
                for {
                }
        }()
        for {
        }
}
```

```
# lscpu | grep 'CPU(s):'
CPU(s):                          2
NUMA node0 CPU(s):               0,1

# top
...
    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND                                                                                       
  66313 root      20   0  702368    964    680 R 199.0   0.0   0:19.53 busy_loop 
```

```
# echo 66313 > /sys/fs/cgroup/cpu/cpudemo/cgroup.procs

# cat /sys/fs/cgroup/cpu/cpudemo/cpu.cfs_period_us
100000

# cat /sys/fs/cgroup/cpu/cpudemo/cpu.cfs_quota_us 
-1

# echo 100000 >  /sys/fs/cgroup/cpu/cpudemo/cpu.cfs_quota_us

# top
...
    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND                                                                                       
  66313 root      20   0  702368    964    680 R 100.0   0.0  11:26.79 busy_loop 
```

```
# echo 10000 >  /sys/fs/cgroup/cpu/cpudemo/cpu.cfs_quota_us 

# top
...
    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND                                                                                       
  66313 root      20   0  702368    964    680 R   9.9   0.0  13:05.55 busy_loop
```

```
# cat /sys/fs/cgroup/cpu/cpudemo/cpu.stat
nr_periods 6432
nr_throttled 6431
throttled_time 1088304303102
```

### cpuacct

> 容器技术是一系列技术的组合，**Linux 本身是没有容器的概念的**，因此容器内部执行 top 命令，看到的是宿主机的内容

| 配置项        | 描述                                                         |
| ------------- | ------------------------------------------------------------ |
| cpuacct.usage | 包含该 cgroup 及其子 cgroup 下进程使用 CPU 的时间，单位纳秒  |
| cpuacct.stat  | 包含该 cgroup 及其子 cgroup 下进程使用 CPU 的时间，以及用户态和内核态的时间 |

```
# ls /sys/fs/cgroup/cpu/cpudemo/cpuacct.*
/sys/fs/cgroup/cpu/cpudemo/cpuacct.stat       /sys/fs/cgroup/cpu/cpudemo/cpuacct.usage_percpu       /sys/fs/cgroup/cpu/cpudemo/cpuacct.usage_sys
/sys/fs/cgroup/cpu/cpudemo/cpuacct.usage      /sys/fs/cgroup/cpu/cpudemo/cpuacct.usage_percpu_sys   /sys/fs/cgroup/cpu/cpudemo/cpuacct.usage_user
/sys/fs/cgroup/cpu/cpudemo/cpuacct.usage_all  /sys/fs/cgroup/cpu/cpudemo/cpuacct.usage_percpu_user

# cat /sys/fs/cgroup/cpu/cpudemo/cpuacct.stat                                    
user 68598
system 228

# cat /sys/fs/cgroup/cpu/cpudemo/cpuacct.usage                                       
645376450311
```

### memory

| 配置项                     | 描述                                                         |
| -------------------------- | ------------------------------------------------------------ |
| memory.usage_in_bytes      | cgroup 下进程使用的内存，包含 cgroup 及其子 cgroup 下的进程使用的内存 |
| memory.max_usage_in_bytes  | cgroup 下进程使用内存的最大值，包含子 cgroup 的内存使用量    |
| memory.limit_in_bytes      | 设置 cgroup 下进程最多能使用的内存， -1 = 不限制             |
| memory.soft_limit_in_bytes | 这个限制并不会阻止进程使用超过限额的内存，只是在系统内存足够时，会优先回收超过限额的内存 |
| memory.oom_control         | 设置是否在 cgroup 中使用 OOM Killer，默认为使用              |

