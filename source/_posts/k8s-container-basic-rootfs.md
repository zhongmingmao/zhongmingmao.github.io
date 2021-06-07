---
title: 容器基础 -- rootfs
mathjax: false
date: 2021-06-07 18:29:45
categories:
    - Cloud Native
    - Kubernetes
tags:
    - Cloud Native
    - Kubernetes
---

# 环境

```
# cat /etc/issue
Ubuntu 16.04.7 LTS \n \l

# uname -a
Linux ubuntu1604 4.4.0-186-generic #216-Ubuntu SMP Wed Jul 1 05:34:05 UTC 2020 x86_64 x86_64 x86_64 GNU/Linux

# docker --version
Docker version 18.03.1-ce, build 9ee9f40
```

```
# grep aufs /proc/filesystems
nodev	aufs

# cat /etc/docker/daemon.json
{
  "storage-driver": "aufs"
}

# docker info | grep 'Storage Driver'
Storage Driver: aufs
```

<!-- more -->

# Mount Namespace

创建子进程时开启Namespace

```c
#define _GNU_SOURCE
#include <sys/mount.h> 
#include <sys/types.h>
#include <sys/wait.h>
#include <stdio.h>
#include <sched.h>
#include <signal.h>
#include <unistd.h>
#define STACK_SIZE (1024 * 1024)
static char container_stack[STACK_SIZE];
char* const container_args[] = {
  "/bin/bash",
  NULL
};
 
int container_main(void* arg)
{  
  printf("Container - inside the container!\n");
  // 执行/bin/bash，运行在Mount Namespace的隔离环境中
  execv(container_args[0], container_args);
  printf("Something's wrong!\n");
  return 1;
}
 
int main()
{
  printf("Parent - start a container!\n");
  // CLONE_NEWNS：启动Mount Namespace
  int container_pid = clone(container_main, container_stack+STACK_SIZE, CLONE_NEWNS | SIGCHLD , NULL);
  waitpid(container_pid, NULL, 0);
  printf("Parent - container stopped!\n");
  return 0;
}
```

编译执行，看到的`/tmp`目录与宿主机一致
原因：**Mount Namespace**修改的是**容器进程对文件系统挂载点的认知**，需要伴随着挂载动作发生，进程的视图才会改变

```
# ls /tmp/
systemd-private-e426c58873ae4ca781fac2988fb1db7b-systemd-timesyncd.service-vsbWSE  vmware-root

# gcc -o ns ns.c

# ./ns
Parent - start a container!
Container - inside the container!

# ls /tmp/
systemd-private-e426c58873ae4ca781fac2988fb1db7b-systemd-timesyncd.service-vsbWSE  vmware-root
```

启动Mount Namespace + 重新挂载`/tmp`目录

```c
int container_main(void* arg)
{
  printf("Container - inside the container!\n");
  // 以tmpfs格式，重新挂载/tmp目录
  mount("none", "/tmp", "tmpfs", 0, "");
  execv(container_args[0], container_args);
  printf("Something's wrong!\n");
  return 1;
}
```

```
# ls /tmp/
systemd-private-e426c58873ae4ca781fac2988fb1db7b-systemd-timesyncd.service-vsbWSE  vmware-root

# gcc -o ns ns.c

# ./ns
Parent - start a container!
Container - inside the container!

# ls /tmp/ | wc -l
0
```

# chroot

> chroot -- change root file system，改变进程的根目录
> Mount Namespace是基于对chroot的不断改良才被发明出来的，是Linux的第一个Namespace

`$HOME/test`作为`/bin/bash`进程的根目录，被chroot的进程，不会感受到自己的根目录已经被修改

```
# pwd
/root

# tree
.
├── ns
├── ns.c
└── test
    ├── bin
    │   ├── bash
    │   └── ls
    ├── lib
    │   └── x86_64-linux-gnu
    │       ├── libc.so.6
    │       ├── libdl.so.2
    │       ├── libpcre.so.3
    │       ├── libpthread.so.0
    │       ├── libselinux.so.1
    │       └── libtinfo.so.5
    └── lib64
        └── ld-linux-x86-64.so.2

# ls /
bin  boot  dev  etc  home  initrd.img  initrd.img.old  lib  lib64  lost+found  media  mnt  opt  proc  root  run  sbin  snap  srv  sys  tmp  usr  var  vmlinuz  vmlinuz.old

# chroot $HOME/test /bin/bash

bash-4.3# ls /
bin  lib  lib64
```

# rootfs - 容器镜像

1. 挂载在容器**根目录**上，用来为容器进程提供**隔离后执行环境的文件系统**，即**rootfs**（容器镜像）
2. rootfs只是操作系统所包含的**文件**、**配置**和**目录**，并不包含操作系统的**内核**
   - 在Linux中，这两部分是分开存放的，操作系统只有在**开机启动**时才会加载指定版本的内核镜像
   - 同一台机器上的所有容器，都**共享宿主机操作系统的内核**

# 容器进程

1. 启用**Linux Namespace**配置
2. 设置指定的**Cgroups**参数
3. 切换进程的根目录（**Change Root**）
   - 系统调用优先级：pivot_root > chroot

# Union File System

## 定义

功能：将多个不同位置的目录**联合挂载**到同一个目录下

```
# tree
.
├── A
│   ├── a
│   └── x
├── B
│   ├── b
│   └── x
└── C
```

```
# mount -t aufs -o dirs=./A:./B none ./C

# tree
.
├── A
│   ├── a
│   └── x
├── B
│   ├── b
│   └── x
└── C
    ├── a
    ├── b
    └── x
```

## Docker & AuFS

> AuFS：Another UnionFS、Alternative UnionFS、Advanced UnionFS

### 拉取镜像

镜像为ubuntu操作系统的rootfs，内容为ubuntu操作系统所有的文件和目录，**分层**

```
# docker pull ubuntu
Using default tag: latest
latest: Pulling from library/ubuntu
345e3491a907: Pull complete
57671312ef6f: Pull complete
5e9250ddb7d0: Pull complete
Digest: sha256:adf73ca014822ad8237623d388cedf4d5346aa72c270c5acc01431cc93e18e2d
Status: Downloaded newer image for ubuntu:latest
```
镜像**只读层**
```
# ll /var/lib/docker/aufs/diff
total 20
drwx------  5 root root 4096 Jun  7 16:48 ./
drwx------  5 root root 4096 Jun  6 23:47 ../
drwxr-xr-x  3 root root 4096 Jun  7 16:48 08c5295ce91a073d1e6d7b6050a28e3f87132270114935d028f6534b5728370b/
drwxr-xr-x 17 root root 4096 Jun  7 16:48 5ca9eeca21a96f0cefff1648b23d9b98e31ed3ca2c2954807b4dcf6756242a17/
drwxr-xr-x  5 root root 4096 Jun  7 16:48 8ca42f2d821bdcdb493baa315e0fd8d39a8da7e26f1ad6ae4d1830c9657ad0b8/

# ll /var/lib/docker/aufs/mnt/
total 20
drwx------ 5 root root 4096 Jun  7 16:48 ./
drwx------ 5 root root 4096 Jun  6 23:47 ../
drwxr-xr-x 2 root root 4096 Jun  7 16:48 08c5295ce91a073d1e6d7b6050a28e3f87132270114935d028f6534b5728370b/
drwxr-xr-x 2 root root 4096 Jun  7 16:48 5ca9eeca21a96f0cefff1648b23d9b98e31ed3ca2c2954807b4dcf6756242a17/
drwxr-xr-x 2 root root 4096 Jun  7 16:48 8ca42f2d821bdcdb493baa315e0fd8d39a8da7e26f1ad6ae4d1830c9657ad0b8/
```

```
# ls /var/lib/docker/aufs/diff/08c5295ce91a073d1e6d7b6050a28e3f87132270114935d028f6534b5728370b/
run

# ls /var/lib/docker/aufs/diff/5ca9eeca21a96f0cefff1648b23d9b98e31ed3ca2c2954807b4dcf6756242a17/
bin  boot  dev  etc  home  lib  lib32  lib64  libx32  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var

# ls /var/lib/docker/aufs/diff/8ca42f2d821bdcdb493baa315e0fd8d39a8da7e26f1ad6ae4d1830c9657ad0b8/
etc  usr  var
```

```
# docker image inspect ubuntu
...
        "RootFS": {
            "Type": "layers",
            "Layers": [
                "sha256:ccdbb80308cc5ef43b605ac28fac29c6a597f89f5a169bbedbb8dec29c987439",
                "sha256:63c99163f47292f80f9d24c5b475751dbad6dc795596e935c5c7f1c73dc08107",
                "sha256:2f140462f3bcf8cf3752461e27dfd4b3531f266fa10cda716166bd3a78a19103"
            ]
        },
...
```

### 启动容器

```
# docker run -d ubuntu:latest sleep 3600
ddd409ee15c47a7772c28e81a83cba68c3286bd4db3e43008ef0c15d4520f3f6
```
多了**可读写层**和**init层**
```
# ll /var/lib/docker/aufs/diff
total 28
drwx------  7 root root 4096 Jun  7 18:15 ./
drwx------  5 root root 4096 Jun  6 23:47 ../
drwxr-xr-x  3 root root 4096 Jun  7 16:48 08c5295ce91a073d1e6d7b6050a28e3f87132270114935d028f6534b5728370b/
drwxr-xr-x 17 root root 4096 Jun  7 16:48 5ca9eeca21a96f0cefff1648b23d9b98e31ed3ca2c2954807b4dcf6756242a17/
drwxr-xr-x  5 root root 4096 Jun  7 16:48 8ca42f2d821bdcdb493baa315e0fd8d39a8da7e26f1ad6ae4d1830c9657ad0b8/
drwxr-xr-x  4 root root 4096 Jun  7 18:15 b46db21771ae4d1852cbac4dfd9d0bb859b4ec18f8fb224aa2fbddd4abad2a16/
drwxr-xr-x  6 root root 4096 Jun  7 18:15 b46db21771ae4d1852cbac4dfd9d0bb859b4ec18f8fb224aa2fbddd4abad2a16-init/

# ll /var/lib/docker/aufs/mnt/
total 28
drwx------  7 root root 4096 Jun  7 18:15 ./
drwx------  5 root root 4096 Jun  6 23:47 ../
drwxr-xr-x  2 root root 4096 Jun  7 16:48 08c5295ce91a073d1e6d7b6050a28e3f87132270114935d028f6534b5728370b/
drwxr-xr-x  2 root root 4096 Jun  7 16:48 5ca9eeca21a96f0cefff1648b23d9b98e31ed3ca2c2954807b4dcf6756242a17/
drwxr-xr-x  2 root root 4096 Jun  7 16:48 8ca42f2d821bdcdb493baa315e0fd8d39a8da7e26f1ad6ae4d1830c9657ad0b8/
drwxr-xr-x 27 root root 4096 Jun  7 18:15 b46db21771ae4d1852cbac4dfd9d0bb859b4ec18f8fb224aa2fbddd4abad2a16/
drwxr-xr-x  2 root root 4096 Jun  7 18:15 b46db21771ae4d1852cbac4dfd9d0bb859b4ec18f8fb224aa2fbddd4abad2a16-init/
```

### 联合挂载

查看AuFS的挂载信息，找到目录对应的AuFS的内部ID（即si=63c6fc48d3766f67）

```
# cat /proc/mounts | grep aufs
none /var/lib/docker/aufs/mnt/b46db21771ae4d1852cbac4dfd9d0bb859b4ec18f8fb224aa2fbddd4abad2a16 aufs rw,relatime,si=63c6fc48d3766f67,dio,dirperm1 0 0
```

通过si，查看被**联合挂载**在一起的各个层的信息

```
# cat /sys/fs/aufs/si_63c6fc48d3766f67/br[0-9]*
/var/lib/docker/aufs/diff/b46db21771ae4d1852cbac4dfd9d0bb859b4ec18f8fb224aa2fbddd4abad2a16=rw
/var/lib/docker/aufs/diff/b46db21771ae4d1852cbac4dfd9d0bb859b4ec18f8fb224aa2fbddd4abad2a16-init=ro+wh
/var/lib/docker/aufs/diff/08c5295ce91a073d1e6d7b6050a28e3f87132270114935d028f6534b5728370b=ro+wh
/var/lib/docker/aufs/diff/8ca42f2d821bdcdb493baa315e0fd8d39a8da7e26f1ad6ae4d1830c9657ad0b8=ro+wh
/var/lib/docker/aufs/diff/5ca9eeca21a96f0cefff1648b23d9b98e31ed3ca2c2954807b4dcf6756242a17=ro+wh
```

镜像的层都是放置在`/var/lib/docker/aufs/diff`，然后被联合挂载在`/var/lib/docker/aufs/mnt`

### 结构

#### 只读层

1. rootfs最下面的三层，对应ubuntu:latest镜像的三层，挂载方式为只读（ro+wh = readonly+whiteout）

```
# ls /var/lib/docker/aufs/diff/08c5295ce91a073d1e6d7b6050a28e3f87132270114935d028f6534b5728370b
run

# ls /var/lib/docker/aufs/diff/8ca42f2d821bdcdb493baa315e0fd8d39a8da7e26f1ad6ae4d1830c9657ad0b8
etc  usr  var

# ls /var/lib/docker/aufs/diff/5ca9eeca21a96f0cefff1648b23d9b98e31ed3ca2c2954807b4dcf6756242a17
bin  boot  dev  etc  home  lib  lib32  lib64  libx32  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
```

#### 可读写层

1. rootfs最上面的一层（b46db21771ae4d18），挂载访问为rw，即read write
2. 在没有写入文件之前，该目录为空；一旦在容器里做了写操作，修改产生的内容会以增量的方式出现在这个层中
3. 删除操作：AuFS会在可读写层创建一个whiteout文件，把只读层里的文件遮挡起来
4. 删除只读层里名为foo的文件，会在可读写层创建名为.wh.foo的文件，当这两层被联合挂载后，foo文件被.wh.foo文件遮挡
5. 作用：专门用来存放修改rootfs后产生的增量，可以通过docker commit和push指令来保存和上传修改后的可读写层

```
# ls /var/lib/docker/aufs/diff/b46db21771ae4d1852cbac4dfd9d0bb859b4ec18f8fb224aa2fbddd4abad2a16 | wc -l
0
```

#### init层

1. init层是Docker项目单独生成的一个内部层，专门用来存放/etc/hosts、/etc/resolv.conf等信息
2. 这些文件的修改往往只对当前的容器有效，并不希望执行docker commit时，把这些信息连同可读写层一起提交
3. 修改这些文件后，一个单独的层挂载出来，用户执行docker commit只会提交可读写层

```
# tree /var/lib/docker/aufs/diff/b46db21771ae4d1852cbac4dfd9d0bb859b4ec18f8fb224aa2fbddd4abad2a16-init
/var/lib/docker/aufs/diff/b46db21771ae4d1852cbac4dfd9d0bb859b4ec18f8fb224aa2fbddd4abad2a16-init
├── dev
│   ├── console
│   ├── pts
│   └── shm
└── etc
    ├── hostname
    ├── hosts
    ├── mtab -> /proc/mounts
    └── resolv.conf
```

