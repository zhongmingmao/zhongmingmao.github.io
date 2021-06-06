---
title: 容器基础 -- Namespace & Cgroups
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

![](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210606170550449.png)

1. Hypervisor
   - 通过**硬件虚拟化**，模拟出一个操作系统所需要的各种硬件，然后在虚拟的硬件上安装Guest OS
   - 对应用进程的隔离环境负责
   - 额外的资源消耗和占用
     - 使用**虚拟化技术**作为**应用沙盒**，必须由Hypervisor来负责创建VM，该VM是真实存在的且里面运行一个完整的Guest OS
2. Docker Engine
   - 『轻量级』虚拟化
   - 不存在真正的『Docker容器』运行在宿主机里面，Docker只是在创建进程时，加上各种不同的**Namespace参数**
   - 真正对隔离环境负责的是**宿主机操作系统**，而非Docker Engine
   - 容器化后的用户应用，依然还是宿主机上的普通进程
   - 相对于VM的优势：**敏捷 + 高性能**
   - 基于Linux Namespace劣势：**隔离不彻底**
     - 多个容器之间使用的还是**同一个宿主机的操作系统内核**
       - 低版本的Linux宿主机不能运行高版本的Linux容器
       - 容器给应用暴露出来的**攻击面**是很大的 -- Seccomp（对容器内部发起的系统调用做过滤拦截，影响容器性能）
     - 在Linux内核中，很多资源和对象是不能被Namespace化的，如时间

<!-- more -->

# Namespace -- 隔离

1. Namespace：**PID、Mount、UTS、IPC、Network、User**
2. 容器是特殊的进程：创建容器进程时，指定了一组Namespace参数，这样容器只能看到当前Namespace所限定的资源

## PID Namespace
```
$ docker run -it busybox /bin/sh
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

# Cgroups -- 限制

1. Linux Cgroups：Linux **Control** Group，限制一个进程组能够使用的资源**上限**
2. Cgroups给用户暴露出来的操作接口是**文件系统**：`/sys/fs/cgroup`

```
$ uname -a
Linux ubuntu 5.11.0-16-generic #17-Ubuntu SMP Wed Apr 14 20:12:43 UTC 2021 x86_64 x86_64 x86_64 GNU/Linux

$ mount -t cgroup
cgroup on /sys/fs/cgroup/systemd type cgroup (rw,nosuid,nodev,noexec,relatime,xattr,name=systemd)
cgroup on /sys/fs/cgroup/pids type cgroup (rw,nosuid,nodev,noexec,relatime,pids)
cgroup on /sys/fs/cgroup/blkio type cgroup (rw,nosuid,nodev,noexec,relatime,blkio)
cgroup on /sys/fs/cgroup/net_cls,net_prio type cgroup (rw,nosuid,nodev,noexec,relatime,net_cls,net_prio)
cgroup on /sys/fs/cgroup/perf_event type cgroup (rw,nosuid,nodev,noexec,relatime,perf_event)
cgroup on /sys/fs/cgroup/cpuset type cgroup (rw,nosuid,nodev,noexec,relatime,cpuset)
cgroup on /sys/fs/cgroup/cpu,cpuacct type cgroup (rw,nosuid,nodev,noexec,relatime,cpu,cpuacct)
cgroup on /sys/fs/cgroup/rdma type cgroup (rw,nosuid,nodev,noexec,relatime,rdma)
cgroup on /sys/fs/cgroup/devices type cgroup (rw,nosuid,nodev,noexec,relatime,devices)
cgroup on /sys/fs/cgroup/hugetlb type cgroup (rw,nosuid,nodev,noexec,relatime,hugetlb)
cgroup on /sys/fs/cgroup/freezer type cgroup (rw,nosuid,nodev,noexec,relatime,freezer)
cgroup on /sys/fs/cgroup/memory type cgroup (rw,nosuid,nodev,noexec,relatime,memory)
```

```
$ ls /sys/fs/cgroup/cpu
cgroup.clone_children  cpuacct.usage             cpuacct.usage_percpu_user  cpu.cfs_quota_us     dev-mqueue.mount  notify_on_release              sys-kernel-debug.mount    user.slice
cgroup.procs           cpuacct.usage_all         cpuacct.usage_sys          cpu.shares           docker            release_agent                  sys-kernel-tracing.mount
cgroup.sane_behavior   cpuacct.usage_percpu      cpuacct.usage_user         cpu.stat             init.scope        sys-fs-fuse-connections.mount  system.slice
cpuacct.stat           cpuacct.usage_percpu_sys  cpu.cfs_period_us          dev-hugepages.mount  -.mount           sys-kernel-config.mount        tasks

$ cat /sys/fs/cgroup/cpu/cpu.cfs_period_us
100000

$ cat /sys/fs/cgroup/cpu/cpu.cfs_quota_us
-1
```

```
$ ls /sys/fs/cgroup/cpu/docker
292508432a113bb76557632bf8a10f54f0417a28824dbbafdfa13179c8101940  cpuacct.stat       cpuacct.usage_percpu       cpuacct.usage_sys   cpu.cfs_quota_us  cpu.uclamp.max     tasks
cgroup.clone_children                                             cpuacct.usage      cpuacct.usage_percpu_sys   cpuacct.usage_user  cpu.shares        cpu.uclamp.min
cgroup.procs                                                      cpuacct.usage_all  cpuacct.usage_percpu_user  cpu.cfs_period_us   cpu.stat          notify_on_release

$ cat /sys/fs/cgroup/cpu/docker/cpu.cfs_period_us
100000

$ cat /sys/fs/cgroup/cpu/docker/cpu.cfs_quota_us
-1

$ pwd
/sys/fs/cgroup/cpu/docker

$ docker ps -a
CONTAINER ID   IMAGE     COMMAND     CREATED             STATUS             PORTS     NAMES
292508432a11   busybox   "/bin/sh"   About an hour ago   Up About an hour             optimistic_kare

$ ls 292508432a113bb76557632bf8a10f54f0417a28824dbbafdfa13179c8101940
cgroup.clone_children  cpuacct.stat   cpuacct.usage_all     cpuacct.usage_percpu_sys   cpuacct.usage_sys   cpu.cfs_period_us  cpu.shares  cpu.uclamp.max  notify_on_release
cgroup.procs           cpuacct.usage  cpuacct.usage_percpu  cpuacct.usage_percpu_user  cpuacct.usage_user  cpu.cfs_quota_us   cpu.stat    cpu.uclamp.min  tasks

$ cat 292508432a113bb76557632bf8a10f54f0417a28824dbbafdfa13179c8101940/cpu.cfs_period_us
100000

$ cat 292508432a113bb76557632bf8a10f54f0417a28824dbbafdfa13179c8101940/cpu.cfs_quota_us
-1

$ cat 292508432a113bb76557632bf8a10f54f0417a28824dbbafdfa13179c8101940/tasks
3354

$ ps -p 3354
    PID TTY          TIME CMD
   3354 pts/0    00:00:00 sh
```

## 样例

```zsh
$ pwd
/sys/fs/cgroup/cpu

# container是一个控制组（操作系统会自动生成子系统对应的资源限制文件）
$ mkdir container

$ ls container/
cgroup.clone_children  cpuacct.stat   cpuacct.usage_all     cpuacct.usage_percpu_sys   cpuacct.usage_sys   cpu.cfs_period_us  cpu.shares  cpu.uclamp.max  notify_on_release
cgroup.procs           cpuacct.usage  cpuacct.usage_percpu  cpuacct.usage_percpu_user  cpuacct.usage_user  cpu.cfs_quota_us   cpu.stat    cpu.uclamp.min  tasks

# 100000us = 100ms
$ cat container/cpu.cfs_period_us
100000

# -1表示没有任何限制
$ cat container/cpu.cfs_quota_us
-1

$ wc -l container/tasks
0 container/tasks
```

在宿主机上执行命令（死循环，CPU到100%）

```
$while : ; do : ; done &
[1] 5548
```

```
$ top
top - 09:48:34 up  1:23,  3 users,  load average: 0.89, 0.37, 0.14
Tasks: 227 total,   2 running, 225 sleeping,   0 stopped,   0 zombie
%Cpu(s):  0.2 us, 14.3 sy, 35.9 ni, 49.4 id,  0.0 wa,  0.0 hi,  0.2 si,  0.0 st
MiB Mem :   3894.3 total,   2393.3 free,    422.8 used,   1078.1 buff/cache
MiB Swap:   3894.0 total,   3894.0 free,      0.0 used.   3233.4 avail Mem

    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
   5548 zhongmi+  25   5   10436   1604      0 R 100.0   0.0   2:13.66 zsh
```

增加限制：每100ms的时间里，被控制组（container）限制的进程（5548）只能使用20ms的CPU时间

```
$ echo 20000 > /sys/fs/cgroup/cpu/container/cpu.cfs_quota_us
$ echo 5548 > /sys/fs/cgroup/cpu/container/tasks
```

```
$ top
top - 09:54:10 up  1:28,  3 users,  load average: 0.43, 0.65, 0.35
Tasks: 227 total,   2 running, 225 sleeping,   0 stopped,   0 zombie
%Cpu(s):  0.2 us,  3.3 sy,  7.9 ni, 88.6 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
MiB Mem :   3894.3 total,   2392.1 free,    422.8 used,   1079.5 buff/cache
MiB Swap:   3894.0 total,   3894.0 free,      0.0 used.   3233.5 avail Mem

    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
   5548 zhongmi+  25   5   10436   1604      0 R  19.9   0.0   7:06.09 zsh
```

手动指定参数

```
$ docker run -it --cpu-period=100000 --cpu-quota=40000 ubuntu /bin/bash
root@d8a95ec5fa4e:/#
```

```
$ cat /sys/fs/cgroup/cpu/docker/d8a95ec5fa4ead5a1eeafefb106ea82b7d9644e7e09c4b6dc54c491855740c83/cpu.cfs_period_us
100000
$ cat /sys/fs/cgroup/cpu/docker/d8a95ec5fa4ead5a1eeafefb106ea82b7d9644e7e09c4b6dc54c491855740c83/cpu.cfs_quota_us
40000
```

## /proc

1. `/proc`：记录当前**内核运行状态**的一系列特殊文件（top指令查看系统信息的主要数据来源）
2. 在容器里面执行top指令，显示的是**宿主机**的数据，而不是当前容器的数据
   - 根本原因：`/proc`文件系统不了解**Cgroups**限制的存在

# 单进程模型

1. 容器是『单进程』模型
2. 容器的本质是一个进程
   - 用户的应用进程实际上是容器里面PID为1的进程，也是其它后续创建的所有进程的父进程
   - 在一个容器内，无法同时运行两个不同的应用
     - 除非能找到一个**公共**的PID为1的程序充当两个不同应用的父进程（如systemd、supervisord）
3. 容器设计：希望**容器**与**应用**能够**同生命周期**，有利于**容器编排**

# 参考资料

[深入剖析Kubernetes](https://time.geekbang.org/column/intro/100015201)
