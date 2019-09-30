---
title: Java性能 -- 命令行工具
mathjax: false
date: 2019-09-04 19:48:26
categories:
    - Java
    - Performance
tags:
    - Java
    - Java Performance
---

## free
```
$ free -m
             total       used       free     shared    buffers     cached
Mem:         15948      15261        687        304         37       6343
-/+ buffers/cache:       8880       7068
Swap:            0          0          0
```

<!-- more -->

1. `Mem`是从**操作系统**的角度来看的
    - 总共有15948M物理内存，其中15261M被使用了，还有687可用，`15948 = 15261 + 687`
    - 有若干线程共享了304M物理内存，已经被弃用（值总为0）
    - buffer / cached ：为了**提高IO性能**，由OS管理
        - A buffer is something that has yet to be **"written"** to disk.
        - A cache is something that has been **"read"** from the disk and stored for later use.
        - buffer和cached占用的内存可以**被快速回收**
2. `-/+ buffers/cache`是从**应用程序**的角度来看的
    - 应用程序认为系统被用掉了8880M物理内存，还剩下7068M物理内存
    - `8880 ≈ (15261 - 37 - 6343 = 8881)`
    - `7068 ≈ (687 + 37 + 6343 = 7067)`


## vmstat
```
$ vmstat -S M 1 5
procs -----------memory---------- ---swap-- -----io---- --system-- -----cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
 2  0      0    295      1   5684    0    0     8    23    1    2  5  1 93  0  0
 0  0      0    295      1   5684    0    0     0     0 11326 25112  6  5 90  0  0
 0  0      0    295      1   5685    0    0     0     0 10855 24065  2  2 96  0  0
 0  0      0    294      1   5686    0    0     0     4 11756 25472  4  2 94  0  0
 0  0      0    294      1   5686    0    0     0     0 10208 22726  4  4 91  0  0

$ free -m
             total       used       free     shared    buffers     cached
Mem:         15948      15655        293       5362          1       5687
-/+ buffers/cache:       9966       5981
Swap:            0          0          0
```

1. vmstat是一款指定采样周期和次数的**功能性监控工具**，可以用来监控进程上下文切换的情况
2. procs
    - r: The number of **runnable** processes (**running** or **waiting** for run time)
    - b: The number of processes in **uninterruptible sleep**
3. memory
    - swpd: the amount of **virtual** memory used
    - free: the amount of **idle** memory
    - buff: the amount of memory used as **buffers**
    - cache: the amount of memory used as **cache**
4. swap
    - si: Amount of memory **swapped in from disk** (/s)
    - so: Amount of memory **swapped to** disk (/s)
5. io
    - bi: Blocks **received** from a block device (blocks/s)
    - bo: Blocks **sent** to a block device (blocks/s)
6. system
    - in: The number of **interrupts** per second, including the clock
    - cs: The number of **context switches** per second
7. cpu
    - us: Time spent running **non-kernel code**
    - sy: Time spent running **kernel code**
    - id: Time spent idle, this **includes IO-wait time**
    - wa: Time spent waiting for IO, **included in idle**
    - st: Time stolen from a virtual machine

## pidstat
1. pidstat可以监测到**具体线程的上下文切换**，pidstat是**sysstat**中的一个组件
2. 常用参数
    - `-u`: Report **CPU utilization**
    - `-r`: Report **page faults** and **memory utilization**
    - `-d`: Report **I/O statistics**
    - `-w`: Report **task switching activity**
    - `-t`: Also display **statistics for threads** associated with selected tasks
    - `-p { pid [,...] | SELF | ALL }`: Select tasks (processes) for which statistics are to be reported

### CPU使用率
```
$ pidstat -u -p 4256 1 3
Linux 2.6.32-696.el6.x86_64 (XXXX) 	2019年XX月XX日 	_x86_64_	(32 CPU)

22时59分32秒       PID    %usr %system  %guest    %CPU   CPU  Command
22时59分33秒      4256   71.00   13.00    0.00   84.00     1  java
22时59分34秒      4256   60.00   10.00    0.00   70.00     1  java
22时59分35秒      4256   76.24   12.87    0.00   89.11     1  java
平均时间:      4256   69.10   11.96    0.00   81.06     -  java

$ pidstat -u -I -p 4256 1 3
Linux 2.6.32-696.el6.x86_64 (XXXX) 	2019年XX月XX日 	_x86_64_	(32 CPU)

23时06分18秒       PID    %usr %system  %guest    %CPU   CPU  Command
23时06分19秒      4256   69.31   12.87    0.00    2.63     1  java
23时06分20秒      4256   69.00   12.00    0.00    2.57     1  java
23时06分21秒      4256   62.00   12.00    0.00    2.34     1  java
平均时间:      4256   66.78   12.29    0.00    2.51     -  java
```
1. %usr
    - Percentage of CPU used by the task while executing at the **user level** (**application**)
    - Note that this field does **NOT include time spent running a virtual processor**
2. %system
    - Percentage of CPU used by the task while executing at the **system level** (**kernel**)
3. %guest
    - Percentage of CPU spent by the task in virtual machine (running a **virtual processor**)
4. %CPU
    - **Total percentage** of CPU time used by the task
    - In an **SMP** environment, the task's CPU usage will be **divided** by the **total number of CPU's** if option **-I** has been entered on the command line
5. CPU
    - **Processor number** to which the task is attached

### 页错误 + 内存使用率
```
$ pidstat -r -p 4256 1 3
23时11分26秒       PID  minflt/s  majflt/s     VSZ    RSS   %MEM  Command
23时11分27秒      4256   2132.00      0.00 22427892 5172756   7.84  java
23时11分28秒      4256   1623.00      0.00 22427892 5172728   7.84  java
23时11分29秒      4256   1942.00      0.00 22427892 5172728   7.84  java
平均时间:      4256   1899.00      0.00 22427892 5172737   7.84  java
```
1. minflt/s
    - Total number of **minor faults** the task has made per second, those which have **not required loading a memory page from disk**
2. majflt/s
    - Total number of **major faults** the task has made per second, those which have **required loading a memory page from disk**
3. VSZ
    - Virtual Size: The **virtual memory** usage of entire task in **kilobytes**
4. RSS
    - Resident Set Size: The **non-swapped physical memory** used by the task in **kilobytes**

### IO统计
```
$ pidstat -d -p 4256 1 3
23时24分59秒       PID   kB_rd/s   kB_wr/s kB_ccwr/s  Command
23时25分00秒      4256      0.00    408.00      0.00  java
23时25分01秒      4256      0.00    356.44      0.00  java
23时25分02秒      4256      0.00    375.76      0.00  java
平均时间:      4256      0.00    380.00      0.00  java
```
1. kB_rd/s
    - Number of **kilobytes** the task has caused to be **read from disk** per second
2. kB_wr/s
    - Number of **kilobytes** the task has caused, or shall cause to be **written to disk** per second
3. kB_ccwr/s
    - Number of **kilobytes** whose **writing to disk** has been **cancelled** by the task
    - This may occur when the task **truncates some dirty pagecache**
        - In this case, some IO which another task has been accounted for will **not be happening**

### 进程上下文切换
```
$ pidstat -w -p 4256 1 3
22时54分33秒       PID   cswch/s nvcswch/s  Command
22时54分34秒      4256      0.00      0.00  java
22时54分35秒      4256      0.00      0.00  java
22时54分36秒      4256      0.00      0.00  java
平均时间:      4256      0.00      0.00  java
```
1. cswch/s
    - Total number of **voluntary context switches** the task made per second
    - A voluntary context switch occurs when a task blocks because it **requires a resource that is unavailable**
2. nvcswch/s
    - Total number of **non voluntary context switches** the task made per second
    - A involuntary context switch takes place when a task executes for the duration of its **time slice** and then is **forced to relinquish** the processor

### 线程上下文切换
```
$ pidstat -w -t -p 4256 | head -n 10

23时32分03秒      TGID       TID   cswch/s nvcswch/s  Command
23时32分03秒      4256         -      0.00      0.00  java
23时32分03秒         -      4256      0.00      0.00  |__java
23时32分03秒         -      4259      0.00      0.00  |__java
23时32分03秒         -      4306      0.04      0.01  |__java
23时32分03秒         -      4307      0.04      0.01  |__java
23时32分03秒         -      4308      0.04      0.01  |__java
23时32分03秒         -      4315      0.04      0.01  |__java
```

## jstack
jstack可以查看**线程堆栈**的运行情况，可以结合`pidstat -t -p PID`来查看具体线程的**状态**
```
$ sudo /usr/local/java/bin/jstack -F 5850
Thread 5853: (state = BLOCKED)
 - java.lang.Object.wait(long) @bci=0 (Interpreted frame)
 - java.lang.Object.wait() @bci=2, line=503 (Interpreted frame)
 - xx.xx.xx.service.client.proxy.Provider.start() @bci=889, line=208 (Interpreted frame)
 - xx.xx.xx.xx.xx.main(java.lang.String[]) @bci=368, line=90 (Interpreted frame)
```
