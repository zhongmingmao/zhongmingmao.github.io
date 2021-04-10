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

## top
```
$ top -v
	top: procps version 3.2.8
usage:	top -hv | -abcHimMsS -d delay -n iterations [-u user | -U user] -p pid [,pid ...]

$ top
top - 09:08:28 up 36 days, 13:19,  1 user,  load average: 0.31, 0.16, 0.11
Tasks: 274 total,   1 running, 273 sleeping,   0 stopped,   0 zombie
Cpu(s):  2.5%us,  1.6%sy,  0.0%ni, 95.9%id,  0.0%wa,  0.0%hi,  0.0%si,  0.0%st
Mem:  16331512k total, 16141616k used,   189896k free,     5372k buffers
Swap:        0k total,        0k used,        0k free,  7526888k cached

  PID USER      PR  NI  VIRT  RES  SHR S %CPU %MEM    TIME+   PPID RUSER     UID GROUP    TTY      P SWAP   TIME CODE DATA nFLT nDRT WCHAN     Flags    COMMAND
21862 dc        20   0 5113m 551m 5096 S  0.0  3.5  25:34.77     1 dc        555 dc       ?        4    0  25:34    4 4.8g  13k    0 futex_wai ..4.2... java
12692 dc        20   0 5109m 513m 5792 S  0.2  3.2  19:54.09     1 dc        555 dc       ?        2    0  19:54    4 4.8g  30k    0 futex_wai ..4.2... java
20299 dc        20   0 5054m 508m 2644 S  0.0  3.2 179:37.25     1 dc        555 dc       ?        4    0 179:37    4 4.8g  65k    0 futex_wai ..4.2... java
...
```

1. top命令可以实时显示正在执行进程的**CPU使用率**、**内存使用率**以及**系统负载**等信息
    - 上半部分显示的是**系统的统计信息**，下半部分显示的是**进程的使用率统计信息**
2. 系统的统计信息
    - Cpu
        - %us：用户空间占用CPU百分比
        - %sy：内核空间占用CPU百分比
        - %ni：用户进程空间内**改变过优先级**的进程占用CPU百分比
        - %id：**空闲**CPU百分比
        - %wa：**等待输入输出**的CPU时间百分比
        - %hi：**硬件中断**占用百分比
        - %si：**软中断**占用百分比
        - %st：**虚拟机**占用百分比
3. 进程的使用率统计信息
    - **PID**: Process Id
        - The task's unique process ID, which periodically wraps, though never restarting at zero.
    - **PPID**: Parent Process Pid
        - The process ID of a task's parent.
    - **RUSER**: Real User Name
        - The real user name of the task's owner.
    - **UID**: User Id
        - The effective user ID of the task's owner.
    - **USER**: User Name
        - The effective user name of the task's owner.
    - **GROUP**: Group Name
        - The effective group name of the task's owner.
    - **TTY**: Controlling Tty
        - The name of the controlling terminal. This is usually the device (serial port, pty, etc.) from which the process was started, and which it uses for input or output. However, a task **need not be associated with a terminal**, in which case you'll see **`'?'`** displayed.
    - **%CPU**: CPU usage
        - The task's share of the elapsed CPU time since the last screen update, expressed as a percentage of total CPU time.
        - In a true SMP environment, if 'Irix mode' is Off, top will operate in 'Solaris mode' where a task's cpu usage will be divided by the total number of CPUs. You toggle 'Irix/Solaris' modes with the 'I' interactive command.
    - **S**: Process Status
        - The status of the task which can be one of
            - `'D' = uninterruptible sleep`
            - `'R' = running`
            - `'S' = sleeping`
            - `'T' = traced or stopped`
            - `'Z' = zombie`
        - Tasks shown as **running** should be more properly thought of as **`ready to run`**
            - their task_struct is simply represented on the Linux **run-queue**.
            - Even without a true SMP machine, you may see numerous tasks in this state depending on top's **delay interval** and **nice value**.
    - **P**: Last used CPU (SMP)
        - A number representing the last used processor. In a true SMP environment this will likely change frequently since the kernel intentionally uses weak affinity. Also, the very act of running top may break this weak affinity and cause more processes to change CPUs more often (because of the extra demand for cpu time).
    - **PR**: Priority
        - The priority of the task.
    - **NI**: Nice value
        - The nice value of the task.
        - A **negative nice value** means **higher priority**, whereas a **positive nice value** means **lower priority**.
        - **Zero** in this field simply means **priority will not be adjusted** in determining a task's dispatchability.
    - **TIME**: CPU Time
        - Total CPU time the task has used since it started.
    - **TIME+**: CPU Time, hundredths
        - The same as 'TIME', but reflecting more granularity through **hundredths of a second**.
    - **%MEM**: Memory usage (RES)
        - A task's currently used share of **available physical memory**.
    - **RES**: Resident size (kb)
        - The **non-swapped physical memory** a task has used.
        - _**RES = CODE + DATA**_.
    - **CODE**: Code size (kb)
        - The amount of **physical memory** devoted to **executable code**, also known as the **`'text resident set'`** size or **TRS**.
    - **DATA**: Data+Stack size (kb)
        - The amount of **physical memory** devoted to **other than executable code**, also known as the **`'data resident set'`** size or **DRS**.
    - **SWAP**: Swapped size (kb)
        - Per-process swap values are now taken from **/proc/#/status VmSwap field**.
    - **VIRT**: Virtual Image (kb)
        - The **total amount of virtual memory** used by the task.
        - It includes all **code**, **data** and **shared libraries** plus **pages that have been swapped out**.
    - **SHR**: Shared Mem size (kb)
        - The **amount of shared memory** used by a task.
        - It simply reflects memory that could be potentially shared with other processes.
    - **nFLT**: Page Fault count
        - The number of **major page faults** that have occurred for a task. A page fault occurs when a process attempts to **read from or write to a virtual page that is not currently present in its address space**. A major page fault is when **disk access** is involved in making that page available.
    - **nDRT**: Dirty Pages count
        - The number of pages that have been modified since they were last written to disk. **Dirty pages must be written to disk before the corresponding physical memory location can be used for some other virtual page**.
    - **WCHAN**: Sleeping in Function
        - Depending on the availability of the kernel link map ('System.map'), this field will show the name or the address of the **kernel function** in which the task is currently sleeping. Running tasks will display a dash ('-') in this column.
    - **Flags**: Task Flags
        - This column represents the task's current scheduling flags which are expressed in hexadecimal notation and with zeros suppressed.
    - **COMMAND**: Command line or Program name
4. 常用选项
    - **-a : Sort by memory usage**
        - This switch makes top to sort the processes by **allocated memory**
    - **-d : Delay time** interval as: **-d ss.tt** (seconds.tenths)
        - Specifies the delay between screen updates, and overrides the corresponding value in one's personal configuration file or the startup default.
        - Later this can be changed with the **`'d'`** or **`'s'`** **interactive commands**.
    - **-H : Threads** toggle
        - When this toggle is On, all **individual threads** will be displayed. Otherwise, top displays **a summation of all threads in a process**.
    - **-M : Detect memory units**
        - Show memory units (**k/M/G**) and display floating point values in the memory summary.
    - **-n : Number of iterations** limit as: **-n number**
        - Specifies the **maximum number of iterations**, or frames, top should produce before ending
    - **-p : Monitor PIDs** as: **-pN1 -pN2** ... or **-pN1, N2 [,...]**
        - Monitor only processes with specified process IDs. This option can be given up to **20** times, or you can provide a **comma** delimited list with up to 20 pids. **Co-mingling** both approaches is **permitted**.
        - This is a command-line option only. And should you wish to **return to normal operation**, it is not necessary to quit and and restart top -- just issue the **'=' interactive command**.
4. 交互命令
    - **`P`**： 根据**CPU**资源使用大小进行排序
    - **`M`**： 根据**内存**资源使用大小进行排序
    - `T`： 根据进程使用**CPU的累积时间**排序
    - `N`： 按PID由高到低排列
    - `r`： 修改进程的nice值(优先级)。优先级默认为10，正值使优先级降低，反之则提高的优先级
    - `S`： 累计模式（把已完成或退出的子进程占用的CPU时间累计到**父进程**的TIME+ ）
    - `W`： 将当前设置写入~/.toprc文件，下次启动自动调用toprc文件的设置
    - `<`： 向前翻页
    - `>`： 向后翻页
    - `1`： 显示每个CPU的详细情况

```
Help for Interactive Commands - procps version 3.2.8
Window 1:Def: Cumulative mode Off.  System: Delay 3.0 secs; Secure mode Off.

  Z,B       Global: 'Z' change color mappings; 'B' disable/enable bold
  l,t,m     Toggle Summaries: 'l' load avg; 't' task/cpu stats; 'm' mem info
  1,I       Toggle SMP view: '1' single/separate states; 'I' Irix/Solaris mode

  f,o     . Fields/Columns: 'f' add or remove; 'o' change display order
  F or O  . Select sort field
  <,>     . Move sort field: '<' next col left; '>' next col right
  R,H     . Toggle: 'R' normal/reverse sort; 'H' show threads
  c,i,S   . Toggle: 'c' cmd name/line; 'i' idle tasks; 'S' cumulative time
  x,y     . Toggle highlights: 'x' sort field; 'y' running tasks
  z,b     . Toggle: 'z' color/mono; 'b' bold/reverse (only if 'x' or 'y')
  u       . Show specific user only
  n or #  . Set maximum tasks displayed

  k,r       Manipulate tasks: 'k' kill; 'r' renice
  d or s    Set update interval
  W         Write configuration file
  q         Quit
          ( commands shown with '.' require a visible task display window )
Press 'h' or '?' for help with Windows,
any other key to continue
```

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

## jstat
```
$ jstat -options
-class
-compiler
-gc
-gccapacity
-gccause
-gcnew
-gcnewcapacity
-gcold
-gcoldcapacity
-gcpermcapacity
-gcutil
-printcompilation
```
1. class
    - 显示**类加载**的相关信息
2. compiler
    - 显示**JIT编译**的相关信息
3. gc
    - 显示和GC相关的堆信息    
4. gccapacity
    - 显示各个代的容量以及使用情况
5. gccause
    - 显示垃圾回收的相关信息，同时显示最后一次或当前正在发生的垃圾回收的诱因
6. gcnew
    - 显示新生代信息
7. gcnewcapacity
    - 显示新生代的大小和使用情况
8. gcold
    - 显示老年代和永久代的信息
9. gcoldcapacity
    - 显示老年代的大小
10. gcpermcapacity
    - 显示永久代的大小
11. _**gcutil**_
    - 显示垃圾收集信息
12. printcompilation
    - 输出JIT编译的方法信息

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

## jmap
可以通过`jamp -heap`查看堆内存的**初始化配置信息**以及堆内存的**使用情况**
```
$ jmap -heap 23594
Attaching to process ID 23594, please wait...
Debugger attached successfully.
Server compiler detected.
JVM version is 24.65-b04

using thread-local object allocation.
Garbage-First (G1) GC with 12 thread(s)

Heap Configuration:
   MinHeapFreeRatio = 40
   MaxHeapFreeRatio = 70
   MaxHeapSize      = 268435456 (256.0MB)
   NewSize          = 1363144 (1.2999954223632812MB)
   MaxNewSize       = 17592186044415 MB
   OldSize          = 5452592 (5.1999969482421875MB)
   NewRatio         = 2
   SurvivorRatio    = 8
   PermSize         = 134217728 (128.0MB)
   MaxPermSize      = 134217728 (128.0MB)
   G1HeapRegionSize = 4194304 (4.0MB)

Heap Usage:
G1 Heap:
   regions  = 64
   capacity = 268435456 (256.0MB)
   used     = 159804896 (152.40182495117188MB)
   free     = 108630560 (103.59817504882812MB)
   59.531962871551514% used
G1 Young Generation:
Eden Space:
   regions  = 27
   capacity = 163577856 (156.0MB)
   used     = 113246208 (108.0MB)
   free     = 50331648 (48.0MB)
   69.23076923076923% used
Survivor Space:
   regions  = 1
   capacity = 4194304 (4.0MB)
   used     = 4194304 (4.0MB)
   free     = 0 (0.0MB)
   100.0% used
G1 Old Generation:
   regions  = 12
   capacity = 100663296 (96.0MB)
   used     = 42364384 (40.401824951171875MB)
   free     = 58298912 (55.598175048828125MB)
   42.08523432413737% used
Perm Generation:
   capacity = 134217728 (128.0MB)
   used     = 43099600 (41.10298156738281MB)
   free     = 91118128 (86.89701843261719MB)
   32.11170434951782% used

16133 interned Strings occupying 1421648 bytes.
```

可以通过`jamp -histo[:live]`查看堆内存中的**对象数目、大小统计直方图**，live只统计**存活对象**
```
$ jmap -histo -F 23594 | head
Attaching to process ID 23594, please wait...
Debugger attached successfully.
Server compiler detected.
JVM version is 24.65-b04
Iterating over heap. This may take a while...
Object Histogram:

num 	  #instances	#bytes	Class description
--------------------------------------------------------------------------
1:		9547	24873832	int[]
2:		78517	11010880	* ConstMethodKlass
3:		78517	10062240	* MethodKlass
4:		7196	8222752	* ConstantPoolKlass
5:		187123	7484920	java.util.HashMap$EntryIterator
6:		43559	6833504	char[]
Heap traversal took 33.612 seconds.
```

可以通过`jmap -dump:format=b,file=/tmp/heap.hprof`把**堆内存的使用情况**dump到文件中，随后通过**MAT**工具进行分析
```
$ jmap -dump:format=b,file=/tmp/wall.hprof -F 23594
Attaching to process ID 23594, please wait...
Debugger attached successfully.
Server compiler detected.
JVM version is 24.65-b04
Dumping heap to /tmp/wall.hprof ...
Heap dump file created

$ du -sh /tmp/wall.hprof
231M	/tmp/wall.hprof
```

## 参考资料
[Java性能调优实战](https://time.geekbang.org/column/intro/100028001)