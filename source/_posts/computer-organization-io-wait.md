---
title: 计算机组成 -- IO_WAIT
mathjax: false
date: 2020-01-31 09:35:27
categories:
    - Computer Basics
    - Computer Organization
tags:
    - Computer Basics
    - Computer Organization
---

## IO性能
1. 硬盘厂商的性能报告：**响应时间**（Response Time）、**数据传输率**（Data Transfer Rate）
2. HDD硬盘一般用的是**SATA 3.0**的接口；SSD硬盘通常会用两种接口，一部分用**SATA 3.0**接口，另一部分用**PCI Express**接口
3. **数据传输率**
   - SATA 3.0接口的带宽是**6Gb/s ≈ 768MB/s**
     - 日常用的HDD硬盘的数据传输率，一般在**200MB/s**
     - SATA 3.0接口的SSD的数据传输率差不多是**500MB/s**
   - PCI Express接口的SSD，读取时的数据传输率能到**2GB/s**，写入时的数据传输率也能有**1.2GB/s**，大致是HDD的**10倍**
4. **响应时间**
   - 程序发起一个硬盘的**读取或写入**请求，直到请求返回的时间
   - SSD的响应时间大致在**几十微秒**这个级别，HDD的响应时间大致在**十几毫秒**这个级别，相差**几十倍**到**几百倍**
5. **IOPS**
   - 每秒读写的次数，相对于响应时间，更关注IOPS这个性能指标
   - 在**顺序**读写和**随机**读写的情况下，硬盘的性能是完全不同的
6. **IOPS**和**DTR**才是IO性能的**核心指标**
   - 在实际的应用开发当中，对于数据的访问，更多的是**随机读写**，而不是顺序读写
   - 因此**随机读写的IOPS**才是IO性能的核心指标

<!-- more -->

## 定位IO_WAIT
1. IOPS：**HDD**为**100**，**SSD**为**20,000**
2. CPU的主频通常在**2GHz**以上，即每秒可以做**20亿**次操作 -- **性能瓶颈在IO上**

### top
```
top - 12:45:53 up 455 days, 23:33,  0 users,  load average: 7.64, 7.20, 6.37
Tasks:   5 total,   1 running,   4 sleeping,   0 stopped,   0 zombie
Cpu(s):  9.4%us,  4.3%sy,  0.0%ni, 85.5%id,  0.1%wa,  0.0%hi,  0.7%si,  0.0%st
Mem:  131889644k total, 125159508k used,  6730136k free,   510392k buffers
Swap:        0k total,        0k used,        0k free, 21547136k cached

   PID USER      PR  NI  VIRT  RES  SHR S %CPU %MEM    TIME+  COMMAND
    19 dc        20   0 25.2g 8.7g 9.8m S 55.6  6.9   2258:13 java
     1 dc        20   0  108m 3208 2520 S  0.0  0.0   0:00.04 bash
    20 dc        20   0  121m 3840 2976 S  0.0  0.0   0:00.01 spk.log.rotate
110109 dc        20   0  108m 3676 2920 S  0.0  0.0   0:00.09 bash
110127 dc        20   0 17060 2028 1756 R  0.0  0.0   0:00.01 top
```

### iostat
```
avg-cpu:  %user   %nice %system %iowait  %steal   %idle
           0.28    0.00    0.42    0.01    0.00   99.29

Device:            tps    kB_read/s    kB_wrtn/s    kB_read    kB_wrtn
sda               0.61        12.89         7.65     197091     116954
sdb               0.01         0.17         0.00       2588          0
dm-0              0.56        12.09         7.51     184966     114886
dm-1              0.01         0.14         0.00       2204          0
```
1. **tps** -- IOPS
    - Indicate the number of transfers per second that were issued to the device.
    - A transfer is an I/O request to the device.
    - Multiple logical requests can be combined into a  single  I/O request to the device.
    - A transfer is of indeterminate size.
2. **kB_read/s** -- DTR
   - Indicate the amount of data read from the device expressed in a number of blocks (kilobytes, megabytes) per second.
   - Blocks are equivalent to sectors and therefore have a size of 512 bytes.
3. **kB_wrtn/s** -- DTR
   - Indicate the amount of data written to the device expressed in a number of blocks (kilobytes, megabytes) per second.

### iotop
```
Total DISK READ :	0.00 B/s | Total DISK WRITE :            0.00 B/s
Actual DISK READ:	0.00 B/s | Actual DISK WRITE:            0.00 B/s
   TID  PRIO  USER     DISK READ  DISK WRITE  SWAPIN     IO>    COMMAND
     1 be/4 root        0.00 B/s    0.00 B/s  0.00 %  0.00 % systemd --switched-root --system --deserialize 22
     2 be/4 root        0.00 B/s    0.00 B/s  0.00 %  0.00 % [kthreadd]
     4 be/0 root        0.00 B/s    0.00 B/s  0.00 %  0.00 % [kworker/0:0H]
     6 be/4 root        0.00 B/s    0.00 B/s  0.00 %  0.00 % [ksoftirqd/0]
     7 rt/4 root        0.00 B/s    0.00 B/s  0.00 %  0.00 % [migration/0]
```

## stress
通过**stress**命令，来**模拟**一个**高IO负载**的场景
```
-d, --hdd N
    spawn N workers spinning on write()/unlink()
```
```
$ stress -d 2
stress: info: [1832] dispatching hogs: 0 cpu, 0 io, 0 vm, 2 hdd
```

### top
```
top - 01:54:07 up 7 min,  3 users,  load average: 1.23, 0.35, 0.14
Tasks: 110 total,   1 running, 109 sleeping,   0 stopped,   0 zombie
%Cpu(s):  0.0 us, 47.6 sy,  0.0 ni,  0.0 id, 47.3 wa,  0.0 hi,  5.1 si,  0.0 st
KiB Mem :   995748 total,    77876 free,   174772 used,   743100 buff/cache
KiB Swap:  2097148 total,  2097148 free,        0 used.   665188 avail Mem

   PID USER      PR  NI    VIRT    RES    SHR S %CPU %MEM     TIME+ COMMAND
  1834 root      20   0    8212   1124     32 D 17.9  0.1   0:06.67 stress
  1833 root      20   0    8212   1124     32 D 16.6  0.1   0:06.58 stress
```

### iostat
```
avg-cpu:  %user   %nice %system %iowait  %steal   %idle
           1.07    0.00   10.87    2.89    0.00   85.17

Device:            tps    kB_read/s    kB_wrtn/s    kB_read    kB_wrtn
sda             179.72       265.56     86124.95     125565   40723320
sdb               0.19         5.47         0.00       2588          0
dm-0            177.67       239.89     86292.78     113431   40802680
dm-1              0.19         4.66         0.00       2204          0
```

### iotop
```
Total DISK READ :	0.00 0.00 BTotal DISK WRITE :          669.38 M/s
Actual DISK READ:	0.00 0.00 BActual DISK WRITE:          664.20 M/s
   TID  PRIO  USER     DISK READ  DISK WRITE  SWAPIN     IO>    COMMAND
  1834 be/4 root        0.00 B/s  409.76 M/s  0.00 % 73.72 % stress -d 256:
  1835 be/4 root        0.00 B/s    0.00 B/s  0.00 % 54.33 % [kworker/u256:0]
  1833 be/4 root        0.00 B/s  218.48 M/s  0.00 % 53.71 % stress -d 256:
     1 be/4 root        0.00 B/s    0.00 B/s  0.00 %  0.00 % systemd --switched-root --system --deserialize 22
     2 be/4 root        0.00 B/s    0.00 B/s  0.00 %  0.00 % [kthreadd]
     3 be/4 root        0.00 B/s    0.00 B/s  0.00 %  0.00 % [kworker/0:0]
```