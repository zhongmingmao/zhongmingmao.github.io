---
title: Linux性能 -- CPU -- 上下文切换
mathjax: false
date: 2020-03-02 17:25:02
categories:
    - Linux
    - Performance
tags:
    - Linux
    - Linux Performance
---

# CPU 上下文

1. CPU 上下文
   - CPU 在运行任何任务前，必须的依赖环境
2. **CPU 寄存器**
   - CPU 内置的容量小、但速度极快的内存
3. **程序计数器**
   - 存储 CPU 正在执行的指令位置、或者即将执行的下一条指令位置

# CPU 上下文切换

1. 切换过程
   - 先把前一个任务的 CPU 上下文（也就是 CPU 寄存器和程序计数器）保存起来
   - 然后加载新任务的上下文到这些寄存器和程序计数器
   - 最后再跳转到程序计数器所指的新位置，运行新任务
2. 保存下来的上下文，会存储在**系统内核**中，并在任务重新调度执行时再次加载进来

<!-- more -->

# CPU特权等级 & 进程运行空间 & 系统调用

![linux-performance-ring.png](https://linux-performance-1253868755.cos.ap-guangzhou.myqcloud.com/linux-performance-ring.png)

1. **进程的运行空间**分为**内核空间**和**用户空间**
   - 内核空间（Ring 0）
     - 具有最高权限，可以直接访问所有资源
   - 用户空间（Ring 3）
     - 只能访问受限资源，不能直接访问内存等硬件设备，必须通过**系统调用**陷入到内核中，才能访问这些特权资源
2. 进程在**用户空间**运行时，被成为**进程的用户态**；而**陷入内核空间**的时候，被称为**进程的内核态**
   - 从用户态到内核态的转变，需要通过**系统调用**来完成
3. **系统调用**的过程会发生 **CPU 上下文的切换**
   - **一次系统调用，发生了两次 CPU 上下文切换**
   - CPU 寄存器里原来用户态的指令位置，需要先保存起来。接着，为了执行内核态代码，CPU 寄存器需要更新为内核态指令的新位置。最后才是跳转到内核态运行内核任务
   - 而系统调用结束后，CPU 寄存器需要恢复原来保存的用户态，然后再切换到用户空间，继续运行进程
4. 在**系统调用**过程中，不会涉及到**虚拟内存**等**进程用户态的资源**，也**不会切换进程**
   - **系统调用**过程中一直是**同一个进程**在运行
     - 系统调用过程通常称为**特权模式切换**，而不是上下文切换
     - 系统调用过程中，CPU 的上下文切换还是**无法避免**的

# CPU 上下文切换的分类

任务分类：**进程**、**线程**、**中断**

## 进程上下文切换

### 进程上下文切换 VS 系统调用

1. 进程是由内核来管理和调度的，**进程的切换只能发生在内核态**
   - 进程的上下文不仅包括**用户空间**的资源（虚拟内存、栈、全局变量），还包括**内核空间**的状态（内核堆栈、寄存器）
2. **进程的上下文切换**比**系统调用**多了一步（**用户态资源**：虚拟内存等）
   - 在保存当前进程的内核状态和 CPU 寄存器之前，需要先把该进程的虚拟内存、栈等保存下来（**用户态**）
   - 而加载了下一进程的内核态后，还需要刷新进程的虚拟内存和用户栈
3. 保存上下文和恢复上下文的过程并不是免费的，需要**内核在 CPU 上运行**才能完成
   - 每次上下文切换都需要**几十纳秒**到**数微秒**的 CPU 时间 -- 相当**可观**



![linux-performance-cs.png](https://linux-performance-1253868755.cos.ap-guangzhou.myqcloud.com/linux-performance-cs.png)

### 进程切换

1. Linux 为**每个 CPU** 都维护了一个**就绪队列**，将**活跃进程**（即**正在运行**和**正在等待 CPU** 的进程）按照优先级和等待 CPU 的时间排序
   - 选择**优先级最高**和**等待 CPU 时间最长**的进程
2. 进程调度的场景
   - 进程**执行完成**，释放之前使用的CPU，此时再从 CPU 的就绪队列中，拿一个新的进程来运行
   - 当某个进程的**时间片耗尽**，会被系统**挂起**，切换到正在等待 CPU 的进程运行 -- 非自愿上下文切换
   - 进程在**系统资源不足**（如内存不足），进程也会被**挂起**，并由系统调度其它进程运行 -- 自愿上下文切换
   - 进程通过**sleep** 方法将自己**主动挂起**
   - 当有**优先级更高**的进程运行时，当前进程可能会被**挂起**
   - 发生**硬件中断**时，**CPU 上的进程会被中断挂起，转而执行内核中的中断服务程序**

## 线程上下文切换

1. **线程**是**调度**的基本单位，**进程**则是**资源拥有**的基本单位
   - 内核中的任务调度，实际的调度对象是线程
   - 进程只是给线程提供了**虚拟内存**、**全局变量**等资源
   - 等价理解
     - 当进程只有一个线程时，进程等于线程
     - 当进程有多个线程时，这些线程会共享相同的**虚拟内存**和**全局变量**等资源
       - 这些资源在同进程内线程上下文切换时是**不需要修改**的
     - 线程也有自己的私有数据，如**栈**和**寄存器**
       - 在上下文切换时**需要保存**
2. 切换场景
   - 前后两个线程属于**不同进程**，此时资源不共享，切换过程等同于**进程上下文切换**
   - 前后两个线程属于**同一个进程**，此时**虚拟内存**是共享的
     - 只需要切换**线程的私有数据**、**寄存器**等不共享的数据
3. **同进程内的线程切换**，要比多进程间的切换消耗更少的资源
   - 多线程替代多进程的一个优势：适用于需要**频繁切换**的场景

## 中断上下文切换

1. 为了快速响应硬件的事件，**中断处理会打断进程的正常调度和执行**，转而调用中断处理程序，**响应设备事件**
   - 打断其他进程时，就需要将进程当前的状态保存下来
2. 与进程上下文不同，**中断上下文切换并不涉及到进程的用户态**
   - 即便中断过程打断了一个正处在用户态的进程，也不需要保存和恢复这个进程的虚拟内存、全局变量等用户态资源
   - **中断上下文**，其实只包括**内核态**中断服务程序执行所必需的状态，包括 CPU 寄存器、内核堆栈、硬件中断参数等
3. **对同一个 CPU 来说，中断处理比进程拥有更高的优先级**，所以**中断上下文切**换并不会与**进程上下文切换**同时发生

## 小结

| 切换类型       | 特点                                                         |
| -------------- | ------------------------------------------------------------ |
| 系统调用       | 1. 同一进程内执行，不切换进程<br>2. 不涉及进程用户态资源（虚拟内存等） |
| 进程上下文切换 | 用户态资源 + 内核态资源                                      |
| 线程上下文切换 | 1. 同进程；共享数据无需切换<br>2. 不同进程：等同于进程上下文切换 |
| 中断上下文切换 | 1. 更高优先级<br>2. 不涉及进程用户态                         |

# 工具

| 工具                 | 用途                                                         |
| -------------------- | ------------------------------------------------------------ |
| **vmstat**           | 常用的系统性能分析工具<br>主要用来分析系统的内存使用情况<br>常用来分析 **CPU 上下文切换**和**中断**的次数 |
| **pidstat**          | vmstat提供系统总体的上下文切换情况，通过**pidstat -w**查看每个进程的详细情况 |
| **/proc/interrupts** | **/proc**是 Linux 的一个**虚拟文件系统**，用于**内核空间**和**用户空间**之间的通信<br>/proc/interrupts提供一个**只读**的中断使用情况 |
| **sysbench**         | 多线程的基准测试工具，用来评估不同系统参数下的数据库负载情况<br>可以用来模拟**上下文切换过多**的情况 |

## vmstat

```
root@ubuntu:~# vmstat 5 3
procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
 1  0      0 2687000 143792 818280    0    0    15    50  116  140  7  2 91  0  0
 0  0      0 2687000 143796 818280    0    0     0     4  165  210  0  0 100  0  0
 0  0      0 2687000 143800 818284    0    0     0     5  164  206  0  0 100  0  0
```

1. **cs**（context switch）：每秒上下文切换的次数
2. **in**（interrupt）：每秒中断的次数
3. **r**（Running or Runnable）：**就绪队列**的长度，正在运行和等待 CPU 的进程数
4. **b**（Blocked）：处于不可中断睡眠状态的进程数

## pidstat -w

```
root@ubuntu:~# pidstat -w 5
Linux 5.4.0-62-generic (ubuntu) 	02/03/21 	_x86_64_	(2 CPU)

02:19:42      UID       PID   cswch/s nvcswch/s  Command
02:19:47        0        10      8.96      0.00  ksoftirqd/0
02:19:47        0        11     20.92      0.00  rcu_sched
02:19:47        0        12      0.20      0.00  migration/0
02:19:47        0        17      0.20      0.00  migration/1
02:19:47        0       208      0.20      0.00  irq/16-vmwgfx
02:19:47        0       333      0.20      0.00  kworker/1:1H-kblockd
02:19:47        0       356      0.40      0.00  kworker/0:1H-kblockd
02:19:47        0       419      0.60      0.40  jbd2/dm-0-8
02:19:47        0       491      0.60      0.00  systemd-journal
02:19:47        0       694      1.20      0.00  multipathd
02:19:47        0       743     11.16      0.00  vmtoolsd
02:19:47     1000      4491      1.39      0.00  sshd
02:19:47     1000      4594      0.40      0.00  sshd
02:19:47        0      8089      1.79      1.79  watch
02:19:47        0      8180      0.20      0.00  mpstat
02:19:47        0     29689      8.57      0.00  kworker/u256:2-events_power_efficient
02:19:47        0     31207      7.97      0.20  kworker/1:0-events
02:19:47        0     32230     34.46      8.17  kworker/0:0-pm
02:19:47        0     32532      0.20      0.00  kworker/u256:1-events_unbound
02:19:47        0     34059      1.00      0.00  kworker/0:2-mpt_poll_0
02:19:47        0     34155      0.20      0.00  pidstat
```

**cswch/s**

> Total number of voluntary context switches the task made per second.  
>
> A voluntary context switch occurs when a task blocks because it **requires a resource that is unavailable**.

> 自愿上下文切换，进程无法获得所需资源导致的上下文切换，如 IO、内存等系统资源不足时

**nvcswch/s**

> Total  number  of non voluntary context switches the task made per second.  
>
> A involuntary context switch takes place when a task **executes for the duration of its time slice and then is forced to relinquish the processor**.

> 非自愿上下文切换，进程由于时间片已到等原因，被系统强制调度，进而发生的上下文切换
>
> 如大量进程都在争抢 CPU 时，很容易发生非自愿上下文切换

# 案例

## 系统空闲

空闲时，**cs**为137，**in**为113，**r** 和**b**都是0

```
root@ubuntu:~# vmstat 1 1
procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
 0  0      0 2686684 144920 818968    0    0    13    46  113  137  6  2 92  0  0
```

## 多线程调度（模拟）

```
root@ubuntu:~# sysbench --threads=10 --max-time=300 threads run
WARNING: --max-time is deprecated, use --time instead
sysbench 1.0.18 (using system LuaJIT 2.1.0-beta3)

Running the test with following options:
Number of threads: 10
Initializing random number generator from current time


Initializing worker threads...

Threads started!
```

## vmstat

1. 指标
   - **cs**从137上升到**123,150**
   - **r** 就绪队列的长度达到**8**，远超 CPU 个数，会导致大量的 CPU 竞争
   - **us + sy = 100**，CPU 使用率达到了100%，**sy** 高达**96**，说明 CPU 主要被**内核**占用
   - **in**从113上升到**8,147**
2. 小结
   - 系统的**就绪队列**（正在运行和等待 CPU）过长，导致了大量的**上下文切换**，而上下文切换又导致了**系统 CPU 的占用率**升高

```
root@ubuntu:~# vmstat 1
procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
 7  0      0 2673072 145324 823228    0    0     0     0 7580 118394  4 96  0  0  0
 8  0      0 2670552 145324 823228    0    0     0     0 8147 123150  5 95  1  0  0
```

## pidstat -w -u

sysbench使用率为199%，但cswch比较小，主要是pidstat默认显示进程的指标数据

```
root@ubuntu:~# pidstat -w -u 1 1
Linux 5.4.0-62-generic (ubuntu) 	02/03/21 	_x86_64_	(2 CPU)

03:01:55      UID       PID    %usr %system  %guest   %wait    %CPU   CPU  Command
03:01:56        0       491    1.00    0.00    0.00    0.00    1.00     0  systemd-journal
03:01:56        0     38285    9.00  190.00    0.00    0.00  199.00     1  sysbench
03:01:56        0     38362    0.00    1.00    0.00    0.00    1.00     1  pidstat

03:01:55      UID       PID   cswch/s nvcswch/s  Command
03:01:56        0        10     10.00      0.00  ksoftirqd/0
03:01:56        0        11     27.00      0.00  rcu_sched
03:01:56        0        18      2.00      0.00  ksoftirqd/1
03:01:56        0       208      2.00      0.00  irq/16-vmwgfx
03:01:56        0       491      2.00      3.00  systemd-journal
03:01:56        0       694      2.00      0.00  multipathd
03:01:56        0       743     11.00      0.00  vmtoolsd
03:01:56        0     31207      8.00      0.00  kworker/1:0-mm_percpu_wq
03:01:56        0     38319     44.00      0.00  kworker/0:0-events
03:01:56        0     38340      7.00      0.00  kworker/u256:0-events_power_efficient
03:01:56        0     38362      1.00      1.00  pidstat
```

## pidstat -w -u -t

__sysbench线程的%wait和nvcswch/s都很高，在争抢 CPU

```
root@ubuntu:~# pidstat -w -u -t 1 1
Linux 5.4.0-62-generic (ubuntu) 	02/03/21 	_x86_64_	(2 CPU)

03:03:04      UID      TGID       TID    %usr %system  %guest   %wait    %CPU   CPU  Command
03:03:05        0     31207         -    0.00    0.98    0.00    0.00    0.98     1  kworker/1:0-mm_percpu_wq
03:03:05        0         -     31207    0.00    0.98    0.00    0.00    0.98     1  |__kworker/1:0-mm_percpu_wq
03:03:05        0     38285         -    7.84  181.37    0.00    0.00  189.22     1  sysbench
03:03:05        0         -     38286    0.98   17.65    0.00   60.78   18.63     1  |__sysbench
03:03:05        0         -     38287    0.00   18.63    0.00   54.90   18.63     0  |__sysbench
03:03:05        0         -     38288    0.00   18.63    0.00   60.78   18.63     0  |__sysbench
03:03:05        0         -     38289    0.98   16.67    0.00   47.06   17.65     1  |__sysbench
03:03:05        0         -     38290    0.98   19.61    0.00   56.86   20.59     0  |__sysbench
03:03:05        0         -     38291    0.00   19.61    0.00   59.80   19.61     0  |__sysbench
03:03:05        0         -     38292    0.98   18.63    0.00   64.71   19.61     0  |__sysbench
03:03:05        0         -     38293    0.98   17.65    0.00   32.35   18.63     1  |__sysbench
03:03:05        0         -     38294    0.00   17.65    0.00   63.73   17.65     0  |__sysbench
03:03:05        0         -     38295    0.98   16.67    0.00   62.75   17.65     0  |__sysbench
03:03:05        0     38394         -    0.98    0.98    0.00    0.00    1.96     1  pidstat
03:03:05        0         -     38394    0.98    0.98    0.00    0.00    1.96     1  |__pidstat

03:03:04      UID      TGID       TID   cswch/s nvcswch/s  Command
03:03:05        0        10         -      7.84      0.00  ksoftirqd/0
03:03:05        0         -        10      7.84      0.00  |__ksoftirqd/0
03:03:05        0        11         -     16.67      0.00  rcu_sched
03:03:05        0         -        11     16.67      0.00  |__rcu_sched
03:03:05        0        18         -      3.92      0.00  ksoftirqd/1
03:03:05        0         -        18      3.92      0.00  |__ksoftirqd/1
03:03:05        0       208         -      0.98      0.00  irq/16-vmwgfx
03:03:05        0         -       208      0.98      0.00  |__irq/16-vmwgfx
03:03:05        0       694         -      0.98      0.00  multipathd
03:03:05        0         -       694      0.98      0.00  |__multipathd
03:03:05        0         -       698      0.98      0.00  |__multipathd
03:03:05        0       743         -     12.75      0.00  vmtoolsd
03:03:05        0         -       743     12.75      0.00  |__vmtoolsd
03:03:05        0         -       769      0.98      0.00  |__HangDetector
03:03:05        0     31207         -      3.92      0.00  kworker/1:0-mm_percpu_wq
03:03:05        0         -     31207      3.92      0.00  |__kworker/1:0-mm_percpu_wq
03:03:05        0     37864         -     43.14      0.98  kworker/0:2-events
03:03:05        0         -     37864     43.14      0.98  |__kworker/0:2-events
03:03:05        0         -     38286   1619.61  10933.33  |__sysbench
03:03:05        0         -     38287   1710.78  12132.35  |__sysbench
03:03:05        0         -     38288   1490.20   6037.25  |__sysbench
03:03:05        0         -     38289   2418.63   5999.02  |__sysbench
03:03:05        0         -     38290   1464.71  12793.14  |__sysbench
03:03:05        0         -     38291   1267.65  13917.65  |__sysbench
03:03:05        0         -     38292    737.25  12780.39  |__sysbench
03:03:05        0         -     38293   3509.80   5676.47  |__sysbench
03:03:05        0         -     38294   1344.12   7692.16  |__sysbench
03:03:05        0         -     38295   1077.45   9229.41  |__sysbench
03:03:05        0     38319         -      1.96      0.00  kworker/0:0-events
03:03:05        0         -     38319      1.96      0.00  |__kworker/0:0-events
03:03:05        0     38340         -      4.90      0.00  kworker/u256:0-events_power_efficient
03:03:05        0         -     38340      4.90      0.00  |__kworker/u256:0-events_power_efficient
03:03:05        0     38394         -      0.98      3.92  pidstat
03:03:05        0         -     38394      0.98      3.92  |__pidstat
```

## /proc/interrupts

1. **中断**只发生在**内核态**，pidstat只是一个进程的性能分析工具，并不提供任何关于中断的详细信息
2. 变化速度最快的是 **RES**（重调度中断）
   - **唤醒空闲状态的 CPU 来调度新的任务运行**
   - 在多处理器系统（**SMP**）中，调度器用来分散任务到不同 CPU 的机制
     - 通常也被称为**处理器间中断**（Inter-Processor Interrupts，**IPI**）

```
root@ubuntu:~# watch -d cat /proc/interrupts
            CPU0       CPU1
...
 RES:    3836812    3200375   Rescheduling interrupts
...
```

## 小结

1. 上下文切换多少次算正常
   - 取决于系统本身的 CPU 性能（**几百~一万**）
   - 超过**一万次**或者切换次数出现**数量级**的增长，可能出现了性能问题
2. 根据上下文切换的类型，做具体分析
   - **自愿上下文切换**变多，进程都在**等待资源**，有可能发生 IO 等问题
   - **非自愿上下文切换**变多，进程都在被**强制调度**，都在争抢 CPU，**CPU 成为了瓶颈**
   - **中断**次数变多，CPU 被中断处理程序占用，通过**/proc/interrupts**来分析具体的中断类型

