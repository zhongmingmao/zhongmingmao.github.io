---
title: Linux使用 -- sar + iftop
mathjax: false
date: 2019-10-15 15:56:21
categories:
    - Linux
    - Practice
tags:
    - Linux
    - Linux Practice
---

## sar
```
yum install sysstat
```

### CPU
```
$ sar -u ALL 1 5
Linux 2.6.32-696.el6.x86_64 (xxx) 	2019年10月15日 	_x86_64_	(40 CPU)

17时25分50秒     CPU      %usr     %nice      %sys   %iowait    %steal      %irq     %soft    %guest     %idle
17时25分51秒     all     14.75      0.00      1.13      0.00      0.00      0.00      0.25      0.00     83.87
17时25分52秒     all     11.17      0.00      1.74      0.00      0.00      0.00      0.25      0.00     86.84
17时25分53秒     all     12.31      0.00      1.61      0.00      0.00      0.00      0.25      0.00     85.83
17时25分54秒     all     12.85      0.00      1.41      0.00      0.00      0.00      0.30      0.00     85.44
17时25分55秒     all     12.18      0.00      1.31      0.00      0.00      0.00      0.25      0.00     86.26
平均时间:     all     12.65      0.00      1.44      0.00      0.00      0.00      0.26      0.00     85.65
```

<!-- more -->

1. %user
    - Percentage of CPU utilization that occurred while executing at the user  level  (application).
    - Note that this field includes time spent running virtual processors.
2. %usr
    - Percentage  of  CPU utilization that occurred while executing at the user level (application).
    - Note that this field does **NOT include** time spent **running virtual processors**.
3. %nice
    - Percentage of CPU utilization that occurred while executing at the user level with nice priority.
4. %system
    - Percentage of CPU utilization that occurred while executing at the system level (kernel).
    - Note that this field includes time spent servicing hardware and software interrupts.
5. %sys
    - Percentage of CPU utilization that occurred while executing at the system level (kernel).
    - Note that this field does **NOT include** time spent **servicing hardware or software interrupts**.
6. %iowait
    - Percentage  of  time that the CPU or CPUs were _**idle during which the system had an outstanding disk I/O request**_.
7. %steal
    - Percentage of time spent in involuntary wait by the virtual CPU or CPUs while  the  hypervisor was servicing another virtual processor.
8. %irq
    - Percentage of time spent by the CPU or CPUs to service **hardware interrupts**.
9. %soft
    - Percentage of time spent by the CPU or CPUs to service **software interrupts**.
10. %guest
    - Percentage of time spent by the CPU or CPUs to **run a virtual processor**.
11. %gnice
    - Percentage of time spent by the CPU or CPUs to **run a niced guest**.
12. %idle
    - Percentage  of  time that the CPU or CPUs were _**idle and the system did not have an outstanding disk I/O request**_.

<img src="https://linux-practice-1253868755.cos.ap-guangzhou.myqcloud.com/linux-practice-sar-cpu.jpg"/>

### 内存
```
$ sar -r 1 5
Linux 2.6.32-696.el6.x86_64 (xxx) 	2019年10月15日 	_x86_64_	(40 CPU)

18时09分14秒 kbmemfree kbmemused  %memused kbbuffers  kbcached  kbcommit   %commit
18时09分15秒    404496  65578096     99.39    100240  10128668 100398588    121.89
18时09分16秒    439788  65542804     99.33    100260  10136372 100398984    121.89
18时09分17秒    435164  65547428     99.34    100360  10140920 100399712    121.89
18时09分18秒    418348  65564244     99.37    100404  10147072 100400992    121.90
18时09分19秒    414344  65568248     99.37    100464  10150912 100401388    121.90
平均时间:    422428  65560164     99.36    100346  10140789 100399933    121.89

$ free
             total       used       free     shared    buffers     cached
Mem:      65982592   65590372     392220    3777404     100700   10166360
-/+ buffers/cache:   55323312   10659280
Swap:     16383996     291572   16092424
```
1. kbmemfree
    - Amount of free memory available in kilobytes.
2. kbmemused
    - Amount of used memory in kilobytes (calculated as **total installed memory - kbmemfree - kbbuffers - kbcached - kbslab**).
3. %memused
    - Percentage of used memory.
4. kbbuffers
    - Amount of memory used as **buffers** by the **kernel** in kilobytes.
5. kbcached
    - Amount of memory used to **cache data** by the **kernel** in kilobytes.
6. kbcommit
    - Amount of memory in kilobytes needed for current **workload**.
    - This is an estimate of how much RAM/swap is needed to guarantee that there never is out of memory.
7. **%commit**
    - Percentage of memory needed for current workload in relation to the total amount of memory (RAM+swap).
    - This number may be greater than 100% because the kernel usually overcommits memory.
8. kbslab
    - Amount of memory in kilobytes used by the **kernel** to **cache** data structures for its own use.

### IO
```
$ sar -b 1 5
Linux 2.6.32-696.el6.x86_64 (xxx) 	2019年10月15日 	_x86_64_	(40 CPU)

18时21分42秒       tps      rtps      wtps   bread/s   bwrtn/s
18时21分43秒    107.07      1.01    106.06      8.08  26965.66
18时21分44秒    319.19      2.02    317.17     16.16 136614.14
18时21分45秒     34.00      0.00     34.00      0.00   2280.00
18时21分46秒     36.00      0.00     36.00      0.00   2736.00
18时21分47秒     36.63      0.99     35.64     15.84   2352.48
平均时间:    106.01      0.80    105.21      8.02  33935.07
```
1. tps
    - Total  number  of transfers per second that were issued to physical devices.  A transfer is an I/O request to a physical device. **Multiple logical requests can be combined into a single  I/O request to the device**.  A transfer is of indeterminate size.
2. rtps
    - Total number of read requests per second issued to physical devices.
3. wtps
    - Total number of write requests per second issued to physical devices.
4. bread/s
    - Total amount of data read from the devices in **blocks** per second.  Blocks are equivalent to **sectors** and therefore have a size of **512 bytes**.
5. bwrtn/s
    - Total amount of data written to devices in **blocks** per second.

### 设备
```
$ df -h
Filesystem            Size  Used Avail Use% Mounted on
/dev/sda2              99G  5.3G   89G   6% /
tmpfs                  32G  3.7G   28G  12% /dev/shm
/dev/sda1             477M   28M  425M   7% /boot
/dev/sda5             436G   71M  414G   1% /data
/dev/sdb1             3.7T  2.5T  1.1T  70% /data1

$ sar -dp 1 3
Linux 2.6.32-696.el6.x86_64 (xxx) 	2019年10月15日 	_x86_64_	(40 CPU)

16时51分55秒       DEV       tps  rd_sec/s  wr_sec/s  avgrq-sz  avgqu-sz     await     svctm     %util
16时51分56秒       sda      1.00      0.00    240.00    240.00      0.00      3.00      3.00      0.30
16时51分56秒       sdb     50.00      0.00   4312.00     86.24      0.01      0.10      0.08      0.40

16时51分56秒       DEV       tps  rd_sec/s  wr_sec/s  avgrq-sz  avgqu-sz     await     svctm     %util
16时51分57秒       sda      0.00      0.00      0.00      0.00      0.00      0.00      0.00      0.00
16时51分57秒       sdb     31.68      0.00   2099.01     66.25      0.00      0.03      0.03      0.10

16时51分57秒       DEV       tps  rd_sec/s  wr_sec/s  avgrq-sz  avgqu-sz     await     svctm     %util
16时51分58秒       sda      4.08      0.00    106.12     26.00      0.00      0.75      0.75      0.31
16时51分58秒       sdb     17.35      0.00   1102.04     63.53      0.00      0.06      0.06      0.10

平均时间:       DEV       tps  rd_sec/s  wr_sec/s  avgrq-sz  avgqu-sz     await     svctm     %util
平均时间:       sda      1.67      0.00    115.05     68.80      0.00      1.20      1.20      0.20
平均时间:       sdb     33.11      0.00   2512.37     75.88      0.00      0.07      0.06      0.20
```
1. tps
    - Indicate the number of transfers per second that were issued to the device. Multiple logical requests can be combined into a single I/O request to the device. A transfer is of indeterminate size.
2. rd_sec/s
    - Number of **sectors** read from the device. The size of a sector is **512** bytes.
3. wr_sec/s
    - Number of **sectors** written to the device. The size of a sector is **512** bytes.
4. avgrq-sz
    - The average size (in **sectors**) of the requests that were issued to the device.
5. avgqu-sz
    - The average queue **length** of the requests that were issued to the device.
6. await
    - The average time (in **milliseconds**) for I/O requests issued to the device to  be  served. This includes the time spent by the requests **in queue** and the time spent **servicing** them.
7. svctm
    - The average service time (in milliseconds) for I/O requests that were issued to the device.
    - Warning! Do not trust this field any more. This field will be removed in a future sysstat version.
8. %util
    - Percentage of elapsed time during which I/O requests were issued to the device (**bandwidth utilization** for the device).
    - Device saturation occurs when this value is close to 100%.

### 进程
```
$ sar -q 1 5
Linux 2.6.32-696.el6.x86_64 (xxx) 	2019年10月15日 	_x86_64_	(40 CPU)

18时32分20秒   runq-sz  plist-sz   ldavg-1   ldavg-5  ldavg-15
18时32分21秒        11     39947      1.42      2.59      3.96
18时32分22秒         6     39942      1.42      2.59      3.96
18时32分23秒         5     39943      1.42      2.59      3.96
18时32分24秒         4     39939      1.42      2.59      3.96
18时32分25秒         8     39939      3.79      3.06      4.10
平均时间:         7     39942      1.89      2.68      3.99
```
1. runq-sz
    - Run queue length (number of tasks waiting for runtime).
2. plist-sz
    - Number of tasks in the task list.
3. ldavg-1
    - System load average for the last minute.
    - The load average is calculated as the average number of **runnable** or **running** tasks (**R** state), and the number of tasks in **uninterruptible** sleep (**D** state) over the specified interval.
4. ldavg-5
    - System load average for the past 5 minutes.
5. ldavg-15
    - System load average for the past 15 minutes.

## iftop
```
yum install epel-release
yum install iftop
```

<img src="https://linux-practice-1253868755.cos.ap-guangzhou.myqcloud.com/linux-practice-iftop.jpg"/>

## 参考资料
[Linux实战技能100讲](https://time.geekbang.org/course/intro/100029601)