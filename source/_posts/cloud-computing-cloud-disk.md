---
title: Cloud Computing - Cloud disk
mathjax: false
date: 2022-10-13 00:06:25
cover: https://cloud-computing-1253868755.cos.ap-guangzhou.myqcloud.com/940e9395-cloud-storage.jpg
categories:
  - Cloud Computing
  - IaaS
tags:
  - Cloud Computing
  - IaaS
---

# 概念

1. 云硬盘：`云虚拟机`可以`挂载`和`使用`的硬盘（`系统盘` + `数据盘`）
2. 将`云端磁盘服务`称为`块存储`（Block Storage），与 `Linux` 中的`块设备`相对应，可以`格式化`并`施加文件系统`
3. `数据持久化` （非易失性存储）：最少`三副本`，高可用，极少发生数据丢失
   - 但`不能完全依赖`云硬盘的可靠性，应该进行`额外的备份`
4. 云硬盘和传统硬盘的`核心差异`：绝大多数的云硬盘都是`远程`的 -- `计算存储分离`
   - 在云端，虚拟机的硬盘大概率不在宿主机上，而是在`专用`的`磁盘服务器阵列`中
   - 通过云数据中心`内部`的`特有 IO 线路`进行连接
   - IO 优化实例
     - 对`云虚拟机`和`云硬盘`之间的`网络传输`，进行了`软硬件`层面的优化，进而充分发挥所挂载磁盘的性能

<!-- more -->

# 性能

> 性能指标：`IOPS`、吞吐量、访问延时等

> 最终性能受`存储介质`和`容量大小`共同影响

## 等级

> `存储介质`

### 基于 `HDD`

> `性能一般`，最高 IOPS 大概在`数百`左右，但`成本低`

### 基于 `SSD / HDD`

> IOPS 在`数千`左右，通常为`默认选项`，综合发挥 `SSD` 的`性能优势`和 `HDD` 的`容量优势`

### 基于 `SSD`

> IOPS 能够`上万`，有非常稳定的 IO 能力，用来承载`关键业务`或者数据库等 `IO 密集型应用`

### 基于 `高性能 SSD`

> IOPS 能够突破`十万`，用于满足最为苛刻的`性能场景`

> `软硬结合`：通过采用最新一代的`企业级闪存硬件`，配合自研或者改进的`底层传输协议`和`虚拟化技术`来提供服务

## 容量

> 容量与性能`正相关`，云硬盘的容量越大，其性能越高，直到达到这个`等级的上限`（底层设计：云上磁盘`能力共享`）

# 实战

```
$ lsblk
NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
vda    253:0    0   40G  0 disk
└─vda1 253:1    0   40G  0 part /
vdb    253:16   0  200G  0 disk /var/lib/container

$ df -hT -x tmpfs -x devtmpfs
Filesystem     Type  Size  Used Avail Use% Mounted on
/dev/vda1      ext4   40G   19G   19G  50% /
/dev/vdb       ext4  194G   82G  103G  45% /var/lib/container
```

> `混合硬盘`：4K 随机读取的平均 IOPS 为 `2482.90`

```
$ sudo fio --name=mytest1 --filename=~/testfile1 --rw=randread --refill_buffers --bs=4k --size=1G -runtime=10 -direct=1 -iodepth=128 -ioengine=libaio
mytest1: (g=0): rw=randread, bs=(R) 4096B-4096B, (W) 4096B-4096B, (T) 4096B-4096B, ioengine=libaio, iodepth=128
fio-3.7
Starting 1 process
mytest1: Laying out IO file (1 file / 1024MiB)
Jobs: 1 (f=1): [r(1)][100.0%][r=9116KiB/s,w=0KiB/s][r=2279,w=0 IOPS][eta 00m:00s]
mytest1: (groupid=0, jobs=1): err= 0: pid=1997265: Tue May 23 18:31:07 2023
   read: IOPS=2482, BW=9932KiB/s (10.2MB/s)(97.5MiB/10051msec)
    slat (usec): min=2, max=14929, avg=30.88, stdev=505.11
    clat (usec): min=782, max=141437, avg=51507.71, stdev=18769.10
     lat (usec): min=787, max=144280, avg=51538.67, stdev=18817.84
    clat percentiles (msec):
     |  1.00th=[    5],  5.00th=[    5], 10.00th=[    7], 20.00th=[   51],
     | 30.00th=[   51], 40.00th=[   51], 50.00th=[   60], 60.00th=[   60],
     | 70.00th=[   60], 80.00th=[   60], 90.00th=[   60], 95.00th=[   61],
     | 99.00th=[  120], 99.50th=[  129], 99.90th=[  136], 99.95th=[  140],
     | 99.99th=[  142]
   bw (  KiB/s): min= 7248, max=28848, per=100.00%, avg=9931.60, stdev=4483.52, samples=20
   iops        : min= 1812, max= 7212, avg=2482.90, stdev=1120.88, samples=20
  lat (usec)   : 1000=0.03%
  lat (msec)   : 2=0.05%, 4=0.12%, 10=10.87%, 20=0.09%, 50=0.61%
  lat (msec)   : 100=86.80%, 250=1.43%
  cpu          : usr=0.48%, sys=1.20%, ctx=21100, majf=0, minf=160
  IO depths    : 1=0.1%, 2=0.1%, 4=0.1%, 8=0.1%, 16=0.1%, 32=0.1%, >=64=99.7%
     submit    : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.0%, >=64=0.0%
     complete  : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.0%, >=64=0.1%
     issued rwts: total=24956,0,0,0 short=0,0,0,0 dropped=0,0,0,0
     latency   : target=0, window=0, percentile=100.00%, depth=128

Run status group 0 (all jobs):
   READ: bw=9932KiB/s (10.2MB/s), 9932KiB/s-9932KiB/s (10.2MB/s-10.2MB/s), io=97.5MiB (102MB), run=10051-10051msec

Disk stats (read/write):
  vda: ios=24875/436, merge=0/65, ticks=1251660/24442, in_queue=1276102, util=99.08%
```

>`SSD`：4K 随机读取的平均 IOPS 为 `13056.70`

```
sudo sudo fio --name=mytest2 --filename=/var/lib/container/testfile2 --rw=randread --refill_buffers --bs=4k --size=1G -runtime=10 -direct=1 -iodepth=128 -ioengine=libaio
mytest2: (g=0): rw=randread, bs=(R) 4096B-4096B, (W) 4096B-4096B, (T) 4096B-4096B, ioengine=libaio, iodepth=128
fio-3.7
Starting 1 process
mytest2: Laying out IO file (1 file / 1024MiB)
Jobs: 1 (f=1): [r(1)][100.0%][r=46.1MiB/s,w=0KiB/s][r=11.8k,w=0 IOPS][eta 00m:00s]
mytest2: (groupid=0, jobs=1): err= 0: pid=2093375: Tue May 23 19:17:29 2023
   read: IOPS=13.1k, BW=50.0MiB/s (53.5MB/s)(511MiB/10012msec)
    slat (usec): min=2, max=7689, avg= 3.75, stdev=42.73
    clat (usec): min=203, max=74270, avg=9797.93, stdev=3405.61
     lat (usec): min=206, max=74274, avg=9801.74, stdev=3406.05
    clat percentiles (usec):
     |  1.00th=[ 2671],  5.00th=[ 2835], 10.00th=[ 3818], 20.00th=[ 9896],
     | 30.00th=[10159], 40.00th=[10159], 50.00th=[10159], 60.00th=[10159],
     | 70.00th=[10290], 80.00th=[10290], 90.00th=[11076], 95.00th=[17695],
     | 99.00th=[17957], 99.50th=[18220], 99.90th=[27657], 99.95th=[29754],
     | 99.99th=[50070]
   bw (  KiB/s): min=47080, max=136616, per=100.00%, avg=52226.80, stdev=20017.80, samples=20
   iops        : min=11770, max=34154, avg=13056.70, stdev=5004.45, samples=20
  lat (usec)   : 250=0.01%, 500=0.07%, 750=0.03%, 1000=0.03%
  lat (msec)   : 2=0.20%, 4=10.17%, 10=12.51%, 20=76.82%, 50=0.17%
  lat (msec)   : 100=0.01%
  cpu          : usr=2.24%, sys=6.65%, ctx=116917, majf=0, minf=162
  IO depths    : 1=0.1%, 2=0.1%, 4=0.1%, 8=0.1%, 16=0.1%, 32=0.1%, >=64=100.0%
     submit    : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.0%, >=64=0.0%
     complete  : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.0%, >=64=0.1%
     issued rwts: total=130695,0,0,0 short=0,0,0,0 dropped=0,0,0,0
     latency   : target=0, window=0, percentile=100.00%, depth=128

Run status group 0 (all jobs):
   READ: bw=50.0MiB/s (53.5MB/s), 50.0MiB/s-50.0MiB/s (53.5MB/s-53.5MB/s), io=511MiB (535MB), run=10012-10012msec

Disk stats (read/write):
  vdb: ios=130567/10, merge=0/48, ticks=1277887/62, in_queue=1277949, util=99.23%
```

# 本地磁盘

1. 选择了`带有本地磁盘的机型`，在启动后，对应的本地磁盘会被`自动挂载`
2. 本地磁盘一般为
   - `高性能`的 `NVMe SSD`
   - `高吞吐`的 `先进 HDD`
3. 优缺点
   - 优点：`离计算单元（宿主）更近` + `没有三副本的负担` + `价格相对便宜`
   - 缺点：本地磁盘本质上为`易失性存储`（数据可能`损坏`或者`丢失`，不如云硬盘可靠）





