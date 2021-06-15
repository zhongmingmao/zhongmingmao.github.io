---
title: Linux性能 -- CPU -- 使用率
mathjax: false
date: 2020-03-03 17:25:02
categories:
    - Linux
    - Performance
tags:
    - Linux
    - Linux Performance
---

# 节拍率（HZ）
1. 为了维护CPU时间，Linux 通过事先定义的节拍率（内核中表示为HZ）
   - 触发**时间中断**，并使用全局变量`Jiffies`记录开机以来的节拍数
2. 节拍率 HZ 是内核的可配选项，可设置为100、250、1000等
3. HZ=250，表示每秒触发250次时间中断，每发生一次时间中断，Jiffies值+1
4. 节拍率 HZ 是内核选项，用户空间程序不能直接访问
    - 为了方便用户空间程序，内核提供了一个空户空间节拍率`USER_HZ`，固定为**100**，即**10ms**

```
root@ubuntu:~# grep 'CONFIG_HZ=' /boot/config-$(uname -r)
CONFIG_HZ=250
```

<!-- more -->

# /proc/stat & CPU使用率
1. Linux 通过 `/proc` 虚拟文件系统，向**用户空间**提供**系统内部状态**的信息
2. `/proc/stat` 提供的是系统的 CPU 和任务统计信息

```bash
# 后面10列表示不同场景下 CPU 的累计节拍数，单位是USER_HZ，即10ms，即不同场景下的 CPU 时间
root@ubuntu:~# cat /proc/stat | grep ^cpu
cpu  268111 3860 260337 5877915 1346 0 3292 0 0 0
cpu0 141550 1700 118958 2937433 738 0 2282 0 0 0
cpu1 126560 2160 141378 2940481 607 0 1010 0 0 0
```

1. **user(us)**
   - 用户态 CPU 时间，**不包括 nice 时间**，但**包括 guest 时间**
2. **nice(ni)**
   - 低优先级用户态 CPU 时间，进程的 nice 值被调整为`1~19`之间的 CPU 时间
   - nice 可取值范围为`-20~19`，**数值越大，优先级反而越低**
3. **system(sys)**
   - 内核态 CPU 时间
4. **idle(id)**
   - 空闲时间，不**包括 iowait 时间**
5. **iowait(wa)**
   - 等待 IO 的 CPU 时间
6. **irq(hi)**
   - 处理**硬中断**的 CPU 时间
7. **softirq(si)**
   - 处理**软中断**的 CPU 时间
8. **steal(st)**
   - 当系统运行在虚拟机中的时候，**被其它虚拟机占用的 CPU 时间**
9. **guest(guest)**
   - 通过虚拟化运行其它操作系统的时间，即**运行虚拟机的 CPU 时间**
10. **guest_nice(gnice)**
   - 以低优先级运行虚拟机的时间

![linux-performance-usage-1.png](https://linux-performance-1253868755.cos.ap-guangzhou.myqcloud.com/linux-performance-usage-1.png)

但`/proc/stat`记录的是**开机以来**的节拍数累加器，需要取某段时间的差值

![linux-performance-usage-2.png](https://linux-performance-1253868755.cos.ap-guangzhou.myqcloud.com/linux-performance-usage-2.png)

`/proc/[pid]/stat`为每个进程的运行情况提供了统计数据

性能分析工具给出的都是间隔一段时间的平均使用率，使用多个工具对比分析时，要保证使用**相同的间隔时间**

# 工具
| 工具 | 用途 | 备注 |
| --- | --- | --- |
| top | 显示系统总体的 CPU 和内存使用情况，以及各个进程的资源使用情况 | 刷新频率：3秒<br>无法区分用户态CPU和内核态CPU |
| pidstat | 可以分析每个进程的CPU使用情况 | |
| ps | 显示每个进程的资源使用情况 | |
| gdb | GDB调试会中断程序运行，不允许在线上执行，适用于在性能分析的后期 | |
| perf | 以**性能事件采样**为基础<br>不仅可以分析系统的各种事件和内核性能<br>还可以用来分析指定应用程序的性能问题 | [async-profiler](https://github.com/jvm-profiling-tools/async-profiler) |

## top
```
root@ubuntu:~# top 1
top - 03:40:16 up  9:38,  5 users,  load average: 0.14, 0.10, 0.09
Tasks: 229 total,   1 running, 228 sleeping,   0 stopped,   0 zombie
%Cpu0  :  0.3 us,  0.3 sy,  0.0 ni, 99.3 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
%Cpu1  :  0.0 us,  0.0 sy,  0.0 ni,100.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
MiB Mem :   3907.9 total,   1905.6 free,    328.2 used,   1674.2 buff/cache
MiB Swap:   1906.0 total,   1906.0 free,      0.0 used.   3287.6 avail Mem

    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
  60013 root      20   0       0      0      0 I   0.7   0.0   0:26.81 kworker/1:3-mm_percpu_wq
  62553 root      20   0       0      0      0 I   0.7   0.0   0:28.21 kworker/0:1-events
     11 root      20   0       0      0      0 I   0.3   0.0   0:23.42 rcu_sched
    743 root      20   0  234988   7088   5948 S   0.3   0.2   1:39.64 vmtoolsd
  64047 root      20   0    8168   3976   3212 R   0.3   0.1   0:00.03 top
      1 root      20   0  103340  13092   8556 S   0.0   0.3   0:09.56 systemd
```
1. 每个进程都有`%CPU`列，表示进程的 CPU 使用率，它是**用户态和内核态CPU使用率的总和**
   - 进程**用户空间**使用的CPU
   - 通过**系统调用**执行的**内核空间**CPU
   - 在**就绪队列等待运行**的CPU
   - 在虚拟化环境中，包括**运行虚拟机**占用的CPU
2. **top 并没有细分进程的用户态CPU和内核态CPU**，可以借助 pidstat

## pidstat
```
root@ubuntu:~# pidstat 1 2
Linux 5.4.0-62-generic (ubuntu) 	02/04/21 	_x86_64_	(2 CPU)

03:48:10      UID       PID    %usr %system  %guest   %wait    %CPU   CPU  Command
03:48:11        0       491    0.00    0.99    0.00    0.00    0.99     0  systemd-journal
03:48:11        0     64068    0.00    0.99    0.00    0.00    0.99     0  kworker/0:2-events
03:48:11        0     64251    0.00    0.99    0.00    0.00    0.99     0  pidstat

03:48:11      UID       PID    %usr %system  %guest   %wait    %CPU   CPU  Command
03:48:12        0        11    0.00    1.00    0.00    0.00    1.00     1  rcu_sched
03:48:12        0       743    1.00    0.00    0.00    0.00    1.00     0  vmtoolsd
03:48:12     1000      4381    0.00    1.00    0.00    0.00    1.00     0  sshd
03:48:12        0     60013    0.00    1.00    0.00    0.00    1.00     1  kworker/1:3-events
03:48:12        0     64068    0.00    1.00    0.00    0.00    1.00     0  kworker/0:2-events
03:48:12        0     64251    0.00    1.00    0.00    0.00    1.00     0  pidstat

Average:      UID       PID    %usr %system  %guest   %wait    %CPU   CPU  Command
Average:        0        11    0.00    0.50    0.00    0.00    0.50     -  rcu_sched
Average:        0       491    0.00    0.50    0.00    0.00    0.50     -  systemd-journal
Average:        0       743    0.50    0.00    0.00    0.00    0.50     -  vmtoolsd
Average:     1000      4381    0.00    0.50    0.00    0.00    0.50     -  sshd
Average:        0     60013    0.00    0.50    0.00    0.00    0.50     -  kworker/1:3-events
Average:        0     64068    0.00    1.00    0.00    0.00    1.00     -  kworker/0:2-events
Average:        0     64251    0.00    1.00    0.00    0.00    1.00     -  pidstat
```
1. 用户态CPU使用率（%usr）
2. 内核态CPU使用率（%system）
3. 运行虚拟机CPU使用率（%guest）
4. **等待CPU使用率（%wait）**
5. 总的CPU使用率（%CPU）

## ps
```
root@ubuntu:~# ps -aux | head -n 5
USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root           1  0.0  0.3 103492 13092 ?        Ss   Feb03   0:09 /sbin/init maybe-ubiquity
root           2  0.0  0.0      0     0 ?        S    Feb03   0:00 [kthreadd]
root           3  0.0  0.0      0     0 ?        I<   Feb03   0:00 [rcu_gp]
root           4  0.0  0.0      0     0 ?        I<   Feb03   0:00 [rcu_par_gp]
```

## perf

### perf top
实时显示**占用CPU时钟最多的函数或者指令**，用于查找**热点函数**，但不能保存数据，因此不能用于离线分析
```
root@ubuntu:~# perf top
Samples: 2K of event 'cpu-clock:pppH', 4000 Hz, Event count (approx.): 367790608 lost: 0/0 drop: 0/0
Overhead  Shared Object             Symbol
  14.08%  [kernel]                  [k] vmware_sched_clock
   8.56%  [kernel]                  [k] finish_task_switch
...
   1.26%  perf                      [.] deliver_event
   1.12%  libc-2.31.so              [.] getdelim
   1.10%  perf                      [.] perf_evsel__parse_sample
   1.08%  [kernel]                  [k] update_iter
   0.96%  perf                      [.] __symbols__insert.constprop.0
   0.92%  libc-2.31.so              [.] 0x000000000009af0f
...
```
1. 2K个CPU时钟事件，总事件数为370655906
2. 指标
    - Overhead
      - 该符号的性能事件在所有采样中的**比例**
    - Shared
      - 该函数或者指令所在的**动态共享对象**，如**内核**、**进程名**、**动态链接库名**，**内核模块**等
    - Object
      - **动态共享对象的类型**
      - `[.]`表示**用户空间**的可执行程序或者动态链接库
      - `[k]`表示**内核空间**
    - Symbol
      - 符号名，即**函数名**，当函数名未知时，用**16进制的地址**来表示
3. 参数`-g`：可以开启**调用关系**采样

### perf record & perf report
```
root@ubuntu:~# perf record
^C[ perf record: Woken up 5 times to write data ]
[ perf record: Captured and wrote 1.374 MB perf.data (24699 samples) ]

root@ubuntu:~# du -sh perf.data
1.4M	perf.data

root@ubuntu:~# perf report
Samples: 24K of event 'cpu-clock:pppH', Event count (approx.): 6174750000
Overhead  Command          Shared Object            Symbol
  98.79%  swapper          [kernel.kallsyms]        [k] native_safe_halt
   0.20%  kworker/0:2-eve  [kernel.kallsyms]        [k] vmware_sched_clock
   0.16%  swapper          [kernel.kallsyms]        [k] __softirqentry_text_start
   0.15%  swapper          [kernel.kallsyms]        [k] __lock_text_start
   0.14%  kworker/1:1-mm_  [kernel.kallsyms]        [k] vmware_sched_clock
```

# 小结
1. **用户CPU和Nice CPU高**
    - 说明**用户态**进程占用了较多的CPU，应该着重排查进程的性能问题
2. **系统CPU高**
    - 说明**内核态**占用了较多的CPU，应该着重排查**内核线程**或者**系统调用**的性能问题
3. **IO等待CPU高**
    - 说明等待IO的时间比较长，应该着重排查系统存储是不是出现了IO问题
4. **软中断**和**硬中断**高
   - 说明软中断和硬中断的处理程序占用较多的CPU，应该着重排查内核中的**中断服务程序**
