---
title: Cloud Native Foundation - Docker
mathjax: false
date: 2022-10-16 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/Docker-build.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Docker
tags:
  - Cloud Native
  - Cloud Native Foundation
  - Container
  - Docker
---

# 历史

1. 基于 Linux 的 `Namespace` 、`Cgroup`和 `Union FS`，对`进程`进行`封装隔离`，属于 `OS` 层的`虚拟化`技术
2. Docker 最初的实现是基于 `LXC`
   - 从 `0.7` 以后开始移除 LXC，而使用自研的 `Libcontainer`
   - 从 `1.11` 开始，使用 `runC` 和 `Containerd`
3. Docker 在`容器`的基础上，进行进一步的封装，`极大地简化容器的创建和维护`

<!-- more -->

# Docker vs VM

![image-20230523210544180](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20230523210544180.png)

| 特性 | Docker         | VM     |
| ---- | -------------- | ------ |
| 启动 | 秒级           | 分钟级 |
| 磁盘 | MB             | GB     |
| 性能 | 接近原生       | 弱于   |
| 数量 | 单机上千个容器 | 几十个 |

# 容器标准

> `OCI` - Open Container Initiative

| Key                          | Value                    |
| ---------------------------- | ------------------------ |
| `Image` Specification        | 如何`打包`               |
| `Runtime` Specification      | 如何`解压`应用包并`运行` |
| `Distribution` Specification | 如何`分发镜像`           |

# 主要特性

> 隔离性（`Namespace`）、可配额（`CGroup`）、便携性（`Union FS`）、安全性

## Namespace

> Linux Namespace 是 `Linux Kernel` 提供的`资源隔离`方案
> Linux 为进程分配不同的 Namespace（不同 Namespace 下的进程`互不干扰`）

> Linux Kernel 中相关的数据结构

![image-20230523225636574](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20230523225636574.png)

> Linux 对 Namespace 的操作方法

> Linux 上 pid 为 1 号的进程，本身会分配`默认的 Namespace`

| 操作方法  | 描述                                                  |
| --------- | ----------------------------------------------------- |
| `clone`   | 在`创建新进程`时，可以指定`新建`的 Namespace 类型     |
| `setns`   | 让调用进程`加入`某个已经存在的 Namespace -- `nsenter` |
| `unshare` | 将调用进程`移动`到`新`的 Namespace 下                 |

```
$ sudo lsns -t pid
        NS TYPE NPROCS     PID USER  COMMAND
4026531836 pid     349       1 root  /sbin/init splash
```

> 分类

| Namespace 类型                      | 隔离资源                         | 描述                                                         |
| ----------------------------------- | -------------------------------- | ------------------------------------------------------------ |
| `IPC`                               | System V IPC 和 POSIX 消息队列   | 容器中的进程交互还是采用 Linux 常见的 IPC<br />容器的进程间交互实际是宿主上具有`相同 pid namespace` 中的进程间交互 |
| `Network`                           | 网络设备、网络协议栈、网络端口等 | 每个 net namespace 有独立的`网络设备`<br />Docker 默认采用 `veth` 的方式将容器中的`虚拟网卡`与宿主机上的 `docker0` 桥接在一起 |
| `PID`                               | 进程                             | 不同用户的进程通过 pid namesapce 隔离<br />不同 pid namespace 中可以有`相同的 pid` |
| `Mount`                             | 挂载点                           | 允许不同 namespace 的进程看到不同的`文件结构`                |
| `UTS`<br />UNIX Time-sharing System | 主机名 + 域名                    | 允许每个容器拥有独立的 `hostname` 和 `domain main`<br />使其在网络上被当作一个`独立的节点`，而非 host 上的一个进程 |
| `USR`                               | 用户 + 用户组                    | 允许容器有不同的 `user` 和 `group id`<br />在容器内部使用`容器内部的用户`执行程序，而非 host 上的用户 |

![image-20230523222758697](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20230523222758697.png)

> 查看当前系统的 namespace：`lsns`

```
$ lsns -t pid
        NS TYPE NPROCS     PID USER  COMMAND
4026531836 pid     107   22040 xxxxx /lib/systemd/systemd --user
4026532946 pid       4 2043129 xxxxx java -jar lib/sonar-application-9.2.4.50792.jar
```

> 查看进程的 namespace

```
$ ls -la /proc/2043129/ns
total 0
dr-x--x--x 2 xxxxx xxxxx 0 May 18 13:44 .
dr-xr-xr-x 9 xxxxx xxxxx 0 May 18 13:44 ..
lrwxrwxrwx 1 xxxxx xxxxx 0 May 23 22:45 cgroup -> 'cgroup:[4026533029]'
lrwxrwxrwx 1 xxxxx xxxxx 0 May 23 22:42 ipc -> 'ipc:[4026532945]'
lrwxrwxrwx 1 xxxxx xxxxx 0 May 23 22:43 mnt -> 'mnt:[4026532943]'
lrwxrwxrwx 1 xxxxx xxxxx 0 May 18 13:44 net -> 'net:[4026532947]'
lrwxrwxrwx 1 xxxxx xxxxx 0 May 23 22:43 pid -> 'pid:[4026532946]'
lrwxrwxrwx 1 xxxxx xxxxx 0 May 23 22:45 pid_for_children -> 'pid:[4026532946]'
lrwxrwxrwx 1 xxxxx xxxxx 0 May 23 22:45 time -> 'time:[4026531834]'
lrwxrwxrwx 1 xxxxx xxxxx 0 May 23 22:45 time_for_children -> 'time:[4026531834]'
lrwxrwxrwx 1 xxxxx xxxxx 0 May 23 22:42 user -> 'user:[4026531837]'
lrwxrwxrwx 1 xxxxx xxxxx 0 May 23 22:42 uts -> 'uts:[4026532944]'
```

> 进入 namespace 并运行命令：`nsenter` -- 常用

```
$ sudo nsenter -t 2043129 -n ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
162: eth0@if163: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:ac:19:00:02 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.25.0.2/16 brd 172.25.255.255 scope global eth0
       valid_lft forever preferred_lft forever
```

> 样例 1：Docker 容器

```
$ docker ps
CONTAINER ID   IMAGE                    COMMAND                  CREATED       STATUS      PORTS                                         NAMES
1654738b86ae   sonarqube:community      "/opt/sonarqube/bin/…"   5 weeks ago   Up 5 days   0.0.0.0:9000->9000/tcp, :::9000->9000/tcp     sonar-sonarqube-1

$ lsns -t net
        NS TYPE NPROCS     PID USER     NETNSID NSFS                           COMMAND
4026531840 net     107   22040 xxxxx unassigned                                /lib/systemd/systemd --user
4026532947 net       4 2043129 xxxxx          3 /run/docker/netns/f039a5128af9 java -jar lib/sonar-application-9.2.4.50792.jar

$ docker exec 16 ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
162: eth0@if163: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1500 qdisc noqueue state UP
    link/ether 02:42:ac:19:00:02 brd ff:ff:ff:ff:ff:ff
    inet 172.25.0.2/16 brd 172.25.255.255 scope global eth0
       valid_lft forever preferred_lft forever
       
$ docker inspect 16 | grep Pid
            "Pid": 2043129,
            "PidMode": "",
            "PidsLimit": null,

$ sudo nsenter -t 2043129 -n ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
162: eth0@if163: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:ac:19:00:02 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.25.0.2/16 brd 172.25.255.255 scope global eth0
       valid_lft forever preferred_lft forever
```

> 样例 2：在`新`的 network namespace 中运行 sleep，在该 net namespace 所看到的网络配置，与宿主不一致

```
$ sudo unshare -fn sleep 600

$ ps -ef | grep sleep
root     2162506 2161352  0 22:58 pts/0    00:00:00 sudo unshare -fn sleep 600
root     2162507 2162506  0 22:58 pts/1    00:00:00 sudo unshare -fn sleep 600
root     2162508 2162507  0 22:58 pts/1    00:00:00 unshare -fn sleep 600
root     2162509 2162508  0 22:58 pts/1    00:00:00 sleep 600

$ sudo lsns -t net
        NS TYPE NPROCS     PID USER     NETNSID NSFS                           COMMAND
4026533030 net       2 2162508 root  unassigned                                unshare -fn sleep 600

$ sudo nsenter -t 2162508 -n ip a
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
```

## Cgroup

1. Cgroup（Control Group）是 Linux 对`一个或者一组`进程进行`资源控制和监控`的机制
2. 常见资源：`CPU 使用时间`、`内存`、`磁盘 IO`
3. 不同资源的具体管理工作由相应的 `Cgroup 子系统`来实现
4. 针对不同类型的资源限制，只需要将`限制策略`在不同的 `Cgroup 子系统`上进行`关联`即可
5. 采用`层级树`（可`递归嵌套`）的方式来组织管理：`子 Cgroup 受父 Cgroup 的限制`

| Cgroup 子系统 | 资源限额                                                |
| ------------- | ------------------------------------------------------- |
| `blkio`       | 限制每个`块设备`的输入输出控制                          |
| `CPU`         | 使用`调度程序`为 cgroup 任务`提供 CPU 的访问`           |
| `cpuacct`     | 产生 cgroup 任务的 `CPU 资源报告`                       |
| `cpuset`      | 如果是`多核 CPU`，为 cgroup 任务分配`单独的 CPU 和内存` |
| `memory`      | 设置每个 cgroup 的`内存限制` + 产生内存资源报告         |

### Cgroup Driver

> 当 OS 使用 `systemd` 作为 init system 时，会初始化进程生成一个`根 Cgroup 目录结构`并作为 `Cgroup 管理器`
> systemd 与 Cgroup 紧密结合，并且为每个 systemd unit 分配 Cgroup

> `cgroupfs`：Docker 默认使用 cgroupfs 作为 Cgroup Driver

> 在 `systemd` 作为 `init system` 的系统中，默认并存在着`两套 Cgroup Driver`，容易`发生冲突`

![image-20230524080051674](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20230524080051674.png)

### CPU

> `相对值`
> cpu.`shares` - 可出让的能获得CPU使用时间的`相对值`，默认为 `1024`

![image-20230524080801421](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20230524080801421.png)

> `绝对值`
> cpu.cfs_period_us / cpu.cfs_quota_us
> `cfs_period_us` - 配置时间周期长度，单位为 us（微秒），默认为 `100_000`
> `cfs_quota_us` - 配置在 cfs_period_us 时间内最多能使用的 CPU 时间数，单位为 us，默认为 `-1`（不限制）

![image-20230524081122220](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20230524081122220.png)

| Others         | Desc                                                         |
| -------------- | ------------------------------------------------------------ |
| cpu.stat       | Cgroup 内的进程使用的 CPU 时间统计                           |
| nr_periods     | 经过 cfs_period_us 的时间周期数量                            |
| nr_throttled   | 在经过的周期内，有多少次因为进程在指定的时间周期内`用完了配额时间`而受到了限制 |
| throttled_time | Cgroup 中的进程被限制使用 CPU 的总用时，单位为 ns （纳秒）   |

> Linux CFS 调度器：`Completely Fair Scheduler` ，完全公平调度器

> 主要思想：维护为任务提供`处理器时间`的平衡，分配给某个任务的时间事情失衡时，应该给失衡的任务分配处理器时间

> 通过 `vruntime` 来实现`平衡`：vruntime = `实际运行时间 * 1024 / 进程权重`
> `优先级越高，其 vruntime 跑得越慢`，处于`红黑树（以 vruntime 为顺序）的左侧`，进而获得`更多的实际运行时间`

![image-20230524082814753](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20230524082814753.png)

### cpuacct

> 用于统计 Cgroup 及其子 Cgroup 下进程的 CPU 的使用情况

| Key           | Desc                                                         |
| ------------- | ------------------------------------------------------------ |
| cpuacct.usage | 包含该 Cgroup 及其子 Cgroup 下进程`使用 CPU 的时间`，单位 ns |
| cpuacct.stat  | 包含该 Cgroup 及其子 Cgroup 下进程`使用 CPU 的时间`，以及用户态和内核态的时间 |

```
$ cat /sys/fs/cgroup/cpu.stat
usage_usec 1330383788000
user_usec 852027688000
system_usec 478356100000
nr_periods 0
nr_throttled 0
throttled_usec 0
nr_bursts 0
burst_usec 0
```

### Memory

> K8S 使用了 `limit_in_bytes`，并没有使用 `soft_limit_in_bytes`

| Key                        | Desc                                                         |
| -------------------------- | ------------------------------------------------------------ |
| memory.usage_in_bytes      | Cgroup 下进程使用的内存，包含 Cgroup 及其子 Cgroup 下进程使用的内存 |
| memory.max_usage_in_bytes  | Cgroup 下进程使用的内存的最大值，包含子 Cgroup 的内存使用量  |
| memory.`limit_in_bytes`    | 设置 Cgroup 下进程最多使用的内存，`-1` 表示不限制            |
| memory.soft_limit_in_bytes | 该限制`不会阻止`进程使用超过限额的内存<br />只是在系统内存足够时，会`优先回收超过限额的内存`，使其向限定值靠拢 |
| memory.oom_control         | 设置是否在 Cgroup 中使用 `OOM Killer`，默认使用              |

## Union FS

1. 将`不同目录`挂载到`同一个虚拟文件系统`下的文件系统
2. 支持为每一个`成员目录`设定`权限`：`readonly`、`readwrite`、`whiteout-able `
3. 文件系统`分层`，对 `readonly` 权限的成员目录可以进行`逻辑上的修改`

> 容器镜像

![image-20230525210045498](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20230525210045498.png)

> Docker 文件系统

1. `bootfs`
   - Bootloader - 引导加载 Kernel
   - 当 `Kernel` 被加载到`内存`后 `umount` bootfs
2. `rootfs`
   - 标准目录和文件：`/dev`、`/proc`、`/bin`、`/etc`
   - 对于不同的 Linux 发行版，`bootfs 基本一致`，但 `rootfs 会有差异`

![image-20230525211057426](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20230525211057426.png)

> Docker 启动

1. Linux 启动
   - 在 Linux 启动后，先将 `rootfs` 设置为 `readonly`，经过一系列检查后，将其切换为 `readwrite`
2. Docker 启动
   - 先将 `rootfs` 以 `readonly` 的方式进行加载并检查
   - 借助 `union mount` 的方式将一个 `readwrite` 的文件系统挂载在 `readonly` 的 `rootfs` 之上
   - 如果继续向上叠加文件系统，需要将文件系统设定为 `readonly`
   - 运行时：`一组 readonly` + `一个 readwrite`

![image-20230525211852430](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20230525211852430.png)

> 写操作：对容器`可写层`的操作依赖`存储驱动`提供的`写时复制`和`用时分配`机制

1. `写时复制`
   - 一个镜像可以被多个容器使用，在内存和磁盘只有`一份拷贝`
   - 当需要对镜像的文件进行修改，该文件会从镜像的`只读`文件系统`复制`到`容器的可写层`
   - 不同容器对文件的修改，`相互独立`，互不影响
2. `用时分配`
   - 当一个文件`被创建`出来后，才会分配空间

> 容器存储驱动

| Driver        | Docker                 | Containerd |
| ------------- | ---------------------- | ---------- |
| AUFS          | Ubuntu / Debian        | NO         |
| `OverlayFS`   | YES                    | YES        |
| Device Mapper | YES                    | YES        |
| Btrfs         | Ubuntu / Debian / SLES | YES        |
| ZFS           | YES                    | NO         |

> OverlayFS：也是一种 `Union FS`，只有两层，`lower`（`镜像只读层`） 和 `upper`（`容器可写层`）

![image-20230525213759498](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20230525213759498.png)

```
$ mkdir upper lower merged work

$ echo "from lower" > lower/in_lower.txt
$ echo "from upper" > upper/in_upper.txt
$ echo "from lower" > lower/in_both.txt
$ echo "from upper" > upper/in_both.txt

$ sudo mount -t overlay overlay -o lowerdir=`pwd`/lower,upperdir=`pwd`/upper,workdir=`pwd`/work `pwd`/merged

$ df -h
Filesystem                         Size  Used Avail Use% Mounted on
overlay                            9.8G  3.3G  6.0G  36% /home/zhongmingmao/merged

$ cat merged/in_both.txt
from upper
```

```
$ docker inspect b109ffda8096
...
"GraphDriver": {
            "Data": {
                "LowerDir": "/var/lib/docker/overlay2/a78d4910eea485bb84ce2c6549d91dcfb6b8f33478962d7a00350833a74cfc6f-init/diff:/var/lib/docker/overlay2/cf1809d2363ee0477578d32ffe2bc1bfae195c7b125f1b5bfafc42bdd0e3bbe8/diff",
                "MergedDir": "/var/lib/docker/overlay2/a78d4910eea485bb84ce2c6549d91dcfb6b8f33478962d7a00350833a74cfc6f/merged",
                "UpperDir": "/var/lib/docker/overlay2/a78d4910eea485bb84ce2c6549d91dcfb6b8f33478962d7a00350833a74cfc6f/diff",
                "WorkDir": "/var/lib/docker/overlay2/a78d4910eea485bb84ce2c6549d91dcfb6b8f33478962d7a00350833a74cfc6f/work"
            },
            "Name": "overlay2"
        }
...
```

# 引擎架构

> `shim` 的父进程是 `systemd`，因此 `Containerd` 本身重启，不会影响到正在运行的容器

![image-20230525220904107](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20230525220904107.png)

```
$ docker inspect --format='{{.State.Pid}}' bc67c9067dff
2230740

$ ps -ef | grep 2230740
root     2230740 2230718  0 22:18 pts/0    00:00:00 nginx: master process nginx -g daemon off;
systemd+ 2230784 2230740  0 22:18 pts/0    00:00:00 nginx: worker process
systemd+ 2230785 2230740  0 22:18 pts/0    00:00:00 nginx: worker process
systemd+ 2230786 2230740  0 22:18 pts/0    00:00:00 nginx: worker process
systemd+ 2230787 2230740  0 22:18 pts/0    00:00:00 nginx: worker process
systemd+ 2230788 2230740  0 22:18 pts/0    00:00:00 nginx: worker process
systemd+ 2230789 2230740  0 22:18 pts/0    00:00:00 nginx: worker process
systemd+ 2230790 2230740  0 22:18 pts/0    00:00:00 nginx: worker process
systemd+ 2230791 2230740  0 22:18 pts/0    00:00:00 nginx: worker process

$ ps -ef | grep 2230718
root     2230718       1  0 22:18 ?        00:00:00 /usr/bin/containerd-shim-runc-v2 -namespace moby -id bc67c9067dff58ca5194c26fca987e9acce0cf81b44820defeacbbff79970664 -address /run/containerd/containerd.sock
root     2230740 2230718  0 22:18 pts/0    00:00:00 nginx: master process nginx -g daemon off;
```

# 容器网络

> `Bridge`：Docker 在`宿主`上创建了 `docker0 网桥`，通过 `veth pair` 来连接宿主上的每一个 `EndPoint`

| 场景 |        模式 | 描述                                                |
| ---- | ----------: | --------------------------------------------------- |
| 单机 |      `Null` | 将容器放入独立的网络空间，但不做任何网络配置        |
|      |      `Host` | 复用`主机网络`                                      |
|      | `Container` | 复用`其他容器的网络`                                |
|      |    `Bridge` | 使用 `Linux 网桥`和 `iptables` 提供`容器互联`<br /> |
| 跨机 |  `Underlay` | 使用`现有底层网络`，为每个容器配置可路由的 IP       |
|      |   `Overlay` | 通过`网络封包`实现                                  |

## 单机

### Bridge + NAT

> `默认`模式

> `MASQUERADE`：自动获取`网卡`的 `IP` 地址，然后做 `SNAT`

![image-20230525225314217](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20230525225314217.png)

1. 为主机 eth0 分配 IP 192.168.0.101
2. 启动 docker daemon，查看 iptables - `SNAT`
   - `-A POSTROUTING -s 172.17.0.0/16 ! -o docker0 -j MASQUERADE`
3. 在主机上启动容器：`docker run -d --name nginx -p 8080:80 nginx`，Docker 会以`标准模式`配置网络
   - 创建 `veth pair`
   - 将 `veth pair` 的一端连接到 `docker0` 网桥，另一端设置为`容器命名空间`的 `eth0`
   - 为容器命名空间的 `eth0` 分配 ip
   - 主机上的 iptables - `DNAT`
     - `-A DOCKER ! -i docker0 -p tcp -m tcp --dport 8080 -j DNAT --to-destination 172.17.0.2:80`

```
$ sudo iptables-save -t nat
*nat
:PREROUTING ACCEPT [0:0]
:INPUT ACCEPT [0:0]
:OUTPUT ACCEPT [0:0]
:POSTROUTING ACCEPT [0:0]
:DOCKER - [0:0]
-A PREROUTING -m addrtype --dst-type LOCAL -j DOCKER
-A OUTPUT ! -d 127.0.0.0/8 -m addrtype --dst-type LOCAL -j DOCKER
-A POSTROUTING -s 172.17.0.0/16 ! -o docker0 -j MASQUERADE
-A DOCKER -i docker0 -j RETURN
COMMIT
```

```
$ docker run -d --name nginx -p 8080:80 nginx
3371dc54c9c79c3601dd61295ed2089de42a22f99a7b08c8b1686d93eca2f465

$ docker inspect --format='{{.NetworkSettings.Networks.bridge.IPAddress}}' 3371dc54c9c7
172.17.0.2
```

```
$ sudo iptables-save -t nat
*nat
:PREROUTING ACCEPT [0:0]
:INPUT ACCEPT [0:0]
:OUTPUT ACCEPT [0:0]
:POSTROUTING ACCEPT [0:0]
:DOCKER - [0:0]
-A PREROUTING -m addrtype --dst-type LOCAL -j DOCKER
-A OUTPUT ! -d 127.0.0.0/8 -m addrtype --dst-type LOCAL -j DOCKER
-A POSTROUTING -s 172.17.0.0/16 ! -o docker0 -j MASQUERADE
-A POSTROUTING -s 172.17.0.2/32 -d 172.17.0.2/32 -p tcp -m tcp --dport 80 -j MASQUERADE
-A DOCKER -i docker0 -j RETURN
-A DOCKER ! -i docker0 -p tcp -m tcp --dport 8080 -j DNAT --to-destination 172.17.0.2:80
COMMIT
```

```
$ brctl show
bridge name	bridge id		STP enabled	interfaces
docker0		8000.024286655820	no		veth5624eea

$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: ens160: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 00:0c:29:d4:3d:1d brd ff:ff:ff:ff:ff:ff
    altname enp2s0
    inet 192.168.191.133/24 metric 100 brd 192.168.191.255 scope global dynamic ens160
       valid_lft 1258sec preferred_lft 1258sec
    inet6 fe80::20c:29ff:fed4:3d1d/64 scope link
       valid_lft forever preferred_lft forever
4: docker0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:86:65:58:20 brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
       valid_lft forever preferred_lft forever
    inet6 fe80::42:86ff:fe65:5820/64 scope link
       valid_lft forever preferred_lft forever
14: veth5624eea@if13: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master docker0 state UP group default
    link/ether a2:5c:e1:91:b7:15 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet6 fe80::a05c:e1ff:fe91:b715/64 scope link
       valid_lft forever preferred_lft forever

$ docker inspect --format='{{.State.Pid}}' 3371dc54c9c7
21184

$ sudo nsenter -t 21184 -n ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
13: eth0@if14: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:ac:11:00:02 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.17.0.2/16 brd 172.17.255.255 scope global eth0
       valid_lft forever preferred_lft forever
       
$ sudo nsenter -t 21184 -n ip r
default via 172.17.0.1 dev eth0
172.17.0.0/16 dev eth0 proto kernel scope link src 172.17.0.2

$ curl -v -s -o /dev/null 127.1:8080
*   Trying 127.0.0.1:8080...
* Connected to 127.0.0.1 (127.0.0.1) port 8080 (#0)
> GET / HTTP/1.1
> Host: 127.0.0.1:8080
> User-Agent: curl/7.81.0
> Accept: */*
>
* Mark bundle as not supporting multiuse
< HTTP/1.1 200 OK
< Server: nginx/1.25.0
< Date: Fri, 26 May 2023 13:04:29 GMT
< Content-Type: text/html
< Content-Length: 615
< Last-Modified: Tue, 23 May 2023 15:08:20 GMT
< Connection: keep-alive
< ETag: "646cd6e4-267"
< Accept-Ranges: bytes
<
{ [615 bytes data]
* Connection #0 to host 127.0.0.1 left intact
```

### Null

> `空实现`，容器启动后可以通过命令为容器配置网络

```
$ docker run --network=none -d nginx
96c7f5d8306ee0ed9aef3127dfe49cf3dad234d5daf7144cb1805715f318703d

$ docker inspect --format='{{.State.Pid}}' 96c7f5d8306e
22394

$ sudo nsenter -t 22394 -n ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
```

> 链接 net namespace

```
$ export pid=22394

$ sudo ls -l /proc/$pid/ns/net
lrwxrwxrwx 1 root root 0 May 26 13:16 /proc/22394/ns/net -> 'net:[4026532644]'

$ sudo ip netns list

$ sudo ln -s /proc/$pid/ns/net /var/run/netns/$pid

$ sudo ip netns list
22394
```

> 查看主机上的 docker0 网桥

```
$ brctl show
bridge name	bridge id		STP enabled	interfaces
docker0		8000.024286655820	no		

$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: ens160: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 00:0c:29:d4:3d:1d brd ff:ff:ff:ff:ff:ff
    altname enp2s0
    inet 192.168.191.133/24 metric 100 brd 192.168.191.255 scope global dynamic ens160
       valid_lft 1757sec preferred_lft 1757sec
    inet6 fe80::20c:29ff:fed4:3d1d/64 scope link
       valid_lft forever preferred_lft forever
4: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default
    link/ether 02:42:86:65:58:20 brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
       valid_lft forever preferred_lft forever
    inet6 fe80::42:86ff:fe65:5820/64 scope link
       valid_lft forever preferred_lft forever
```

> 创建 `veth pair`

```
$ sudo ip link add A type veth peer name B
```

```
$ sudo brctl addif docker0 A
$ sudo ip link set A up

$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: ens160: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 00:0c:29:d4:3d:1d brd ff:ff:ff:ff:ff:ff
    altname enp2s0
    inet 192.168.191.133/24 metric 100 brd 192.168.191.255 scope global dynamic ens160
       valid_lft 1617sec preferred_lft 1617sec
    inet6 fe80::20c:29ff:fed4:3d1d/64 scope link
       valid_lft forever preferred_lft forever
4: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default
    link/ether 02:42:86:65:58:20 brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
       valid_lft forever preferred_lft forever
    inet6 fe80::42:86ff:fe65:5820/64 scope link
       valid_lft forever preferred_lft forever
15: B@A: <BROADCAST,MULTICAST> mtu 1500 qdisc noop state DOWN group default qlen 1000
    link/ether b2:b3:84:21:6b:36 brd ff:ff:ff:ff:ff:ff
16: A@B: <NO-CARRIER,BROADCAST,MULTICAST,UP,M-DOWN> mtu 1500 qdisc noqueue state LOWERLAYERDOWN group default qlen 1000
    link/ether 42:c0:90:f4:47:97 brd ff:ff:ff:ff:ff:ff

$ brctl show
bridge name	bridge id		STP enabled	interfaces
docker0		8000.024286655820	no		A
```

```
$ SETIP=172.17.0.10
$ SETMASK=16
$ GATEWAY=172.17.0.1

$ sudo ip link set B netns $pid
$ sudo ip netns exec $pid ip link set dev B name eth0
$ sudo ip netns exec $pid ip link set eth0 up
$ sudo ip netns exec $pid ip addr add $SETIP/$SETMASK dev eth0
$ sudo ip netns exec $pid ip route add default via $GATEWAY
```

```
$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: ens160: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 00:0c:29:d4:3d:1d brd ff:ff:ff:ff:ff:ff
    altname enp2s0
    inet 192.168.191.133/24 metric 100 brd 192.168.191.255 scope global dynamic ens160
       valid_lft 1382sec preferred_lft 1382sec
    inet6 fe80::20c:29ff:fed4:3d1d/64 scope link
       valid_lft forever preferred_lft forever
4: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default
    link/ether 02:42:86:65:58:20 brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
       valid_lft forever preferred_lft forever
    inet6 fe80::42:86ff:fe65:5820/64 scope link
       valid_lft forever preferred_lft forever
16: A@if15: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 42:c0:90:f4:47:97 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet6 fe80::40c0:90ff:fef4:4797/64 scope link
       valid_lft forever preferred_lft forever
       
$ sudo nsenter -t $pid -n ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
15: eth0@if16: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether b2:b3:84:21:6b:36 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.17.0.10/16 scope global eth0
       valid_lft forever preferred_lft forever
```

```
$ curl -v -s -o /dev/null 172.17.0.10
*   Trying 172.17.0.10:80...
* Connected to 172.17.0.10 (172.17.0.10) port 80 (#0)
> GET / HTTP/1.1
> Host: 172.17.0.10
> User-Agent: curl/7.81.0
> Accept: */*
>
* Mark bundle as not supporting multiuse
< HTTP/1.1 200 OK
< Server: nginx/1.25.0
< Date: Fri, 26 May 2023 13:39:29 GMT
< Content-Type: text/html
< Content-Length: 615
< Last-Modified: Tue, 23 May 2023 15:08:20 GMT
< Connection: keep-alive
< ETag: "646cd6e4-267"
< Accept-Ranges: bytes
<
{ [615 bytes data]
* Connection #0 to host 172.17.0.10 left intact
```

## 跨机

### Underlay

> 容器网络依托于`主机的物理网络`

![image-20230527135555514](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20230527135555514.png)

1. 采用 Linux 网桥设备（`sbrctl`），通过`物理网络`连通容器
2. 创建新的网桥设备 mydr0
3. 将`主机`加入到`网桥`
4. 把`主机网卡的地址`配置到`网桥`，并把`默认路由规则`转移到网桥 mydr0
5. 启动容器
6. 创建 `veth pair`，把一个 peer 添加到`网桥 mydr0`
7. 配置容器把 veth 的另一个 peer 分配给`容器网卡`

### Overlay

> Docker `Overlay` 网络驱动`原生支持`多主机网络，本质是`封包`和`解包`的过程，有一定的`开销`

> `Libnetwork` 是一个`内置`的基于 `VXLAN` 的网络驱动

![image-20230527140555581](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20230527140555581.png)

#### Flannel

> `同一主机`的 Pod 可以使用`网桥`进行通信，`不同主机`的 Pod 将通过 `flanneld` 将其流量封装在 `UDP` 数据包中

![image-20230527141402433](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20230527141402433.png)

# Dockerfile

> 应用进程必须是`无状态`的

## Build Context

1. 运行 `docker build` 时，`当前目录`被称为构建上下文
2. 默认查找`当前目录`的 `Dockerfile` 作为构建输入，`docker build –f ./Dockerfile .`
3. 当运行 `docker build` 时，首先会把 `Build Context` 传输给 `docker daemon`
   - 如果将没用的文件包含在 Build Context 中，会导致`传输时间过长`，需要`更多的构建资源`，构建出的`镜像大`等问题
   - 可以通过 `.dockerignore` 来排除某些文件

```
$ docker build -f Dockerfile -t "xxx/yyy/zzz:0.0.1" .
[+] Building 1.5s (10/10) FINISHED
 => [internal] load build definition from Dockerfile                                                             0.0s
 => => transferring dockerfile: 759B                                                                             0.0s
 => [internal] load .dockerignore                                                                                0.0s
 => => transferring context: 2B                                                                                  0.0s
 => [internal] load metadata for xxx/yyy/base:1.0.0                                                              0.4s
 => [auth] yyy/base:pull token for xxx                                                                           0.0s
 => [internal] load build context                                                                                1.0s
 => => transferring context: 151.91MB                                                                            1.0s
 => [1/4] FROM xxx/yyy/base:1.0.0@sha256:0680efe067d6c17586cb628ea9f6675                                         0.0s
 => CACHED [2/4] WORKDIR /home/aaa/local                                                                         0.0s
 => CACHED [3/4] COPY binaries/promtool-linux64/promtool /home/aaa/local/promtool                                0.0s
 => CACHED [4/4] COPY target/zzz-*-exec.jar /home/aaa/local/zzz.jar                                              0.0s
 => exporting to image                                                                                           0.0s
 => => exporting layers                                                                                          0.0s
 => => writing image sha256:77a3fa3f601d7492d3fc86f508159080df81c751b080ff800661fb198c13c099                     0.0s
 => => naming to xxx/yyy/zzz:0.0.1                                                                               0.0s
```

## Build Cache

> 构建容器镜像时，Docker `依次`读取 Dockerfile 中的指令，并`按顺序依次执行`构建指令

1. 通常 Docker 简单判断 Dockerfile 中的`指令`和`镜像`
2. 针对 `ADD` 和 `COPY` 指令，Docker 会判断该`镜像层`中`每一个文件的内容`并生成一个 `checksum`
3. 其他指令，Docker 简单比较与现存镜像中`指令字符串`是否一致
4. 当某一层 Cache 失效后，`后续指令`都重新构建镜像
   - 最佳实践：`稳定`的层位于 Dockerfile 的`前面`，可以最大化地利用 Cache（`构建`+`拉取`）

## Multi-stage build

> 有效减少`镜像层级`：`COPY --from`

```dockerfile
# stage 1
FROM golang:1.16-alpine AS build
RUN apk add --no-cache git
RUN go get github.com/golang/dep/cmd/dep
COPY Gopkg.lock Gopkg.toml /go/src/project/ WORKDIR /go/src/project/
RUN dep ensure -vendor-only
COPY . /go/src/project/
RUN go build -o /bin/project # only need '/bin/project'

# stage 2
FROM scratch
COPY --from=build /bin/project /bin/project ENTRYPOINT ["/bin/project"]
CMD ["--help"]
```

## 常用指令

| 指令   | 描述           | 格式                                                         |
| ------ | -------------- | ------------------------------------------------------------ |
| FROM   | 推荐 `alpine`  | `FROM [--platform=<platform>] <image>[@<digest>] [AS <name>]` |
| LABELS | 按标签组织项目 | `LABEL multi.label1="value1" multi.label2="value2"`<br />`docker images -f label=multi.label1="value1"` |
| RUN    | 执行命令       | `RUN apt-get update && apt-get install`                      |
| CMD    | 应用的运行命令 | `CMD ["executable", "param1", "param2"...]`                  |
| EXPOSE | 发布端口       | `EXPOSE <port> [<port>/<protocol>...]`                       |
| ENV    | 设置环境变量   | `ENV <key>=<value> ...`                                      |

### ADD

> 从源地址（`文件`、`目录`、`URL`）复制文件到目标路径：`ADD [--chown=<user>:<group>] <src>... <dest>`

1. 支持 Go 风格的通配符，`ADD check* /testdir/`
2. src 如果是`文件`，则必须包含在 `Build Context` 中
3. src 如果是`URL`
   - 如果 dest 结尾有 `/`，那么 dest 是`目标文件夹`；如果 dest 结尾没有 `/`，那么 dest 是`目标文件名`
   - 尽量使用 `curl` 或者 `wget` 来替代
4. src 如果是一个`目录`，则`所有文件`都会被复制到 dest
5. src 如果是一个`本地压缩文件`，则会同时完成`解压`操作
6. dest 如果`不存在`，则会`自动创建目录`

### COPY

> 从源地址复制文件到目标路径：`COPY [--chown=<user>:<group>] <src>... <dest>`

1. 只支持`本地文件的复制`，不支持 URL
2. `不解压文件`
3. 可用于 `Multi-stage build`，即 `COPY --from`

> 语义更清晰，复制`本地文件`时，`优先使用 COPY`

### ENTRYPOINT

> 定义可以执行的容器镜像`入口命令`

1. docker run
   - 参数`追加`模式：`ENTRYPOINT ["executable", "param1", "param2"] `
   - 参数`替换`模式：`ENTRYPOINT command param1 param2`
2. `替换` Dockerfile 中定义的 ENTRYPOINT
   - docker run `–entrypoint`
3. 最佳实践：通过 `ENTRYPOINT` 定义`主命令`，通过 `CMD` 定义`主要参数`

```dockerfile
ENTRYPOINT ["s3cmd"]
CMD ["--help"]
```

### VOLUME

> 将指定目录定义为`外挂存储卷`，Dockerfile 中在`该指令后`对该`同一目录`的修改都是`无效`的

```dockerfile
VOLUME ["/data"]
```

> 等价于 `docker run –v /data`

```
$ docker run -d --name nginx -p 8080:80 -v /data nginx
64e8ba804b7dbe0503e65736e66447b5a30137a744f5daf97f6c7e5a4772758f

$ docker inspect 64e8ba804b7d
...
  "Mounts": [
      {
          "Type": "volume",
          "Name": "49231693971eca4c050c3ae564da163418448da945e1a8ccfd11a12c7fb91c26",
          "Source": "/var/lib/docker/volumes/49231693971eca4c050c3ae564da163418448da945e1a8ccfd11a12c7fb91c26/_data",
          "Destination": "/data",
          "Driver": "local",
          "Mode": "",
          "RW": true,
          "Propagation": ""
      }
  ],
...

$ docker volume ls
DRIVER    VOLUME NAME
local     49231693971eca4c050c3ae564da163418448da945e1a8ccfd11a12c7fb91c26
```

### USER

> 切换运行镜像的用户和用户组（容器应用以 `non-root` 运行，容器内访问会`受限`）

```dockerfile
USER <user>[:<group>]
```

### WORKDIR

> 切换`工作目录`

## 最佳实践

1. 不安装`无效软件包`
2. 简化`同时运行的进程数`，在理想情况下，只有 `1 个进程`
   - 如果运行`多进程`，选择合理的`初始化进程`（具备`管理子进程`的能力）
3. `镜像层最少化`
   - 最新的 Docker 只有 `RUN`、`COPY`、`ADD` 才会`创建新层`，其它指令只会创建`临时层`，并不会增加`镜像大小`
   - `多条 RUN 指令`通过 `&&` 来连接成一条指令集
   - 借助 `Multi-stage build`
4. 将`变更频率低`的指令`优先构建`（位于`镜像底层`，可以更有效地利用 `Build Cache`）
5. 每个文件`单独复制`，确保某个文件变更时，只影响该文件对应的缓存

# 多进程

> 选择适当的 `init 进程`（`ENTRYPOINT 进程`：具备`管理子进程`的能力）

1. 需要捕获 `SIGTERM` 信号并完成`子进程`的`优雅终止`
2. 负责`清理`退出的子进程，避免`僵尸进程`
