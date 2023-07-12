---
title: Kubernetes - Cgroups
mathjax: false
date: 2022-11-08 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/FrbadS8XgAAtfvr.jpg
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
  - Linux
  - Container
---

# Namespace

> 隔离不完备

1. 在 Linux 内核中，有很多资源和对象是`不能被 Namespace 化`的，例如`时间`
2. 如果在`容器`中使用 `settimeofday(2)` 的系统调用，`整个宿主机`的时间都会被修改

<!-- more -->

# Cgroups

> 在 Linux 中，Cgroups 暴露给用户的操作接口是`文件系统`

```
$ mount -t cgroup
cgroup on /sys/fs/cgroup/systemd type cgroup (rw,nosuid,nodev,noexec,relatime,xattr,name=systemd)
cgroup on /sys/fs/cgroup/blkio type cgroup (rw,nosuid,nodev,noexec,relatime,blkio)
cgroup on /sys/fs/cgroup/cpu,cpuacct type cgroup (rw,nosuid,nodev,noexec,relatime,cpu,cpuacct)
cgroup on /sys/fs/cgroup/devices type cgroup (rw,nosuid,nodev,noexec,relatime,devices)
cgroup on /sys/fs/cgroup/net_cls,net_prio type cgroup (rw,nosuid,nodev,noexec,relatime,net_cls,net_prio)
cgroup on /sys/fs/cgroup/pids type cgroup (rw,nosuid,nodev,noexec,relatime,pids)
cgroup on /sys/fs/cgroup/perf_event type cgroup (rw,nosuid,nodev,noexec,relatime,perf_event)
cgroup on /sys/fs/cgroup/freezer type cgroup (rw,nosuid,nodev,noexec,relatime,freezer)
cgroup on /sys/fs/cgroup/rdma type cgroup (rw,nosuid,nodev,noexec,relatime,rdma)
cgroup on /sys/fs/cgroup/memory type cgroup (rw,nosuid,nodev,noexec,relatime,memory)
cgroup on /sys/fs/cgroup/hugetlb type cgroup (rw,nosuid,nodev,noexec,relatime,hugetlb)
cgroup on /sys/fs/cgroup/cpuset type cgroup (rw,nosuid,nodev,noexec,relatime,cpuset)

$ ls /sys/fs/cgroup/cpu
cgroup.clone_children  cpu.shares         cpuacct.usage_percpu       init.scope         tasks
cgroup.procs           cpu.stat           cpuacct.usage_percpu_sys   kubepods.slice     user.slice
cgroup.sane_behavior   cpuacct.stat       cpuacct.usage_percpu_user  notify_on_release
cpu.cfs_period_us      cpuacct.usage      cpuacct.usage_sys          release_agent
cpu.cfs_quota_us       cpuacct.usage_all  cpuacct.usage_user         system.slice
```

> 限制不完善

1. Linux 的 `/proc` 目录存储的是记录当前`内核运行状态`的一系列特殊文件（top 指令的数据来源）
2. 如果在容器内执行 top 指令，使用的是宿主上的数据
   - 原因：`/proc` 文件系统不了解 Cgroups 限制的存在

## Shell

> 创建一个 Cgroup，默认没有任何限制

```
$ sudo mkdir container

$ ls /sys/fs/cgroup/cpu/container
cgroup.clone_children  cpu.shares      cpuacct.stat          cpuacct.usage_percpu_sys   notify_on_release
cgroup.procs           cpu.stat        cpuacct.usage         cpuacct.usage_percpu_user  tasks
cpu.cfs_period_us      cpu.uclamp.max  cpuacct.usage_all     cpuacct.usage_sys
cpu.cfs_quota_us       cpu.uclamp.min  cpuacct.usage_percpu  cpuacct.usage_user

$ cat /sys/fs/cgroup/cpu/container/cpu.cfs_period_us
100000

$ cat /sys/fs/cgroup/cpu/container/cpu.cfs_quota_us
-1
```

> 运行计算密集的程序，可以吃满 CPU 到 100 %

```
$ while : ; do : ; done &
[1] 396244

$ top
top - 17:00:16 up  4:56,  3 users,  load average: 1.29, 0.80, 0.73
Tasks: 369 total,   3 running, 366 sleeping,   0 stopped,   0 zombie
%Cpu(s):  2.2 us, 10.7 sy, 14.8 ni, 71.9 id,  0.0 wa,  0.0 hi,  0.2 si,  0.0 st
MiB Mem :  11947.8 total,   4133.7 free,   1430.0 used,   6384.1 buff/cache
MiB Swap:      0.0 total,      0.0 free,      0.0 used.  10330.8 avail Mem

    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
 396244 zhongmi+  25   5   17948   7168   1024 R  99.0   0.1   0:31.63 zsh
```

> 新增限制，被该 Cgroup 限制的进程只能使用 20% 的 CPU 带宽

```
$ echo 20000 > /sys/fs/cgroup/cpu/container/cpu.cfs_quota_us
```

> 将进程加入到被限制列表，CPU 使用率会降到 20%

```
$ echo 396244 > /sys/fs/cgroup/cpu/container/tasks

$ top
top - 10:02:30 up  5:03,  3 users,  load average: 1.51, 1.34, 1.02
Tasks: 394 total,   2 running, 392 sleeping,   0 stopped,   0 zombie
%Cpu(s):  3.7 us,  2.8 sy,  3.8 ni, 89.4 id,  0.0 wa,  0.0 hi,  0.2 si,  0.0 st
MiB Mem :  11947.8 total,   4081.7 free,   1481.3 used,   6384.8 buff/cache
MiB Swap:      0.0 total,      0.0 free,      0.0 used.  10279.5 avail Mem

    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
 396244 zhongmi+  25   5   17948   7168   1024 R  20.3   0.1   6:45.82 zsh
```

## Docker

> 启动时设置 `cpu-period` 和 `cpu-quota`

```
$ docker run -it --cpu-period=100000 --cpu-quota=10000 ubuntu /bin/bash
root@685b0945f445:/#
```

> 查看对应的 Cgroup

```
$ ls /sys/fs/cgroup/cpu/system.slice/docker-685b0945f445ac9ee177ecea45560b1971c1ec6e5b4bd9886f725c55258ff30e.scope
cgroup.clone_children  cpu.shares      cpuacct.stat          cpuacct.usage_percpu_sys   notify_on_release
cgroup.procs           cpu.stat        cpuacct.usage         cpuacct.usage_percpu_user  tasks
cpu.cfs_period_us      cpu.uclamp.max  cpuacct.usage_all     cpuacct.usage_sys
cpu.cfs_quota_us       cpu.uclamp.min  cpuacct.usage_percpu  cpuacct.usage_user

$ cat /sys/fs/cgroup/cpu/system.slice/docker-685b0945f445ac9ee177ecea45560b1971c1ec6e5b4bd9886f725c55258ff30e.scope/cpu.cfs_period_us
100000

$ cat /sys/fs/cgroup/cpu/system.slice/docker-685b0945f445ac9ee177ecea45560b1971c1ec6e5b4bd9886f725c55258ff30e.scope/cpu.cfs_quota_us
10000
```

> 同样在容器内运行一个计算密集型的程序

```
$ docker run -it --cpu-period=100000 --cpu-quota=10000 ubuntu /bin/bash
root@685b0945f445:/# while : ; do : ; done

```

```
$ docker inspect --format='{{.State.Pid}}' 685b0945f445
383376

$ cat /sys/fs/cgroup/cpu/system.slice/docker-685b0945f445ac9ee177ecea45560b1971c1ec6e5b4bd9886f725c55258ff30e.scope/tasks
383376

$ top
top - 17:03:23 up  4:59,  5 users,  load average: 0.35, 0.65, 0.71
Tasks: 388 total,   3 running, 385 sleeping,   0 stopped,   0 zombie
%Cpu0  :  3.7 us,  3.1 sy,  0.0 ni, 92.9 id,  0.0 wa,  0.0 hi,  0.3 si,  0.0 st
%Cpu1  :  8.9 us,  2.3 sy,  0.0 ni, 88.1 id,  0.0 wa,  0.0 hi,  0.7 si,  0.0 st
%Cpu2  : 10.5 us,  2.4 sy,  0.0 ni, 87.1 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
%Cpu3  :  2.7 us,  1.0 sy,  0.0 ni, 96.0 id,  0.0 wa,  0.0 hi,  0.3 si,  0.0 st
MiB Mem :  11947.8 total,   4084.8 free,   1476.5 used,   6386.5 buff/cache
MiB Swap:      0.0 total,      0.0 free,      0.0 used.  10284.2 avail Mem

    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
 383376 root      20   0    4132   3384   2904 R  10.0   0.0   1:04.41 bash
```

> 在容器内执行 top ，与宿主机看到的视图相近

```
$ docker exec -it 685b0945f445 sh
# top
top - 17:04:05 up  5:00,  0 users,  load average: 0.87, 0.75, 0.74
Tasks:   3 total,   2 running,   1 sleeping,   0 stopped,   0 zombie
%Cpu0  :  5.0 us,  2.7 sy,  0.0 ni, 91.0 id,  0.0 wa,  0.0 hi,  1.3 si,  0.0 st
%Cpu1  :  9.4 us,  2.4 sy,  0.0 ni, 87.5 id,  0.0 wa,  0.0 hi,  0.7 si,  0.0 st
%Cpu2  :  9.1 us,  1.0 sy,  0.0 ni, 88.5 id,  0.7 wa,  0.0 hi,  0.7 si,  0.0 st
%Cpu3  :  2.7 us,  1.0 sy,  0.0 ni, 96.3 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
MiB Mem :  11947.8 total,   4084.4 free,   1476.7 used,   6386.8 buff/cache
MiB Swap:      0.0 total,      0.0 free,      0.0 used.  10284.0 avail Mem

    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
      1 root      20   0    4132   3384   2904 R  10.0   0.0   1:08.63 bash
```

