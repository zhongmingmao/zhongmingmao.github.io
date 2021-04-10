---
title: Linux使用 -- 脚本控制
mathjax: false
date: 2019-10-20 22:06:03
categories:
    - Linux
    - Practice
tags:
    - Linux
    - Linux Practice
---

## 优先级控制
1. 使用**nice**和**renice**来调整脚本优先级
2. 避免出现不可控的**死循环**（导致**CPU占用过高**或**死机**）

<!-- more -->

### Fork炸弹
```bash
# 大部分限制对root无效
[root@localhost ~]# ulimit -a
core file size          (blocks, -c) 0
data seg size           (kbytes, -d) unlimited
scheduling priority             (-e) 0
file size               (blocks, -f) unlimited
pending signals                 (-i) 3795
max locked memory       (kbytes, -l) 64
max memory size         (kbytes, -m) unlimited
open files                      (-n) 1024
pipe size            (512 bytes, -p) 8
POSIX message queues     (bytes, -q) 819200
real-time priority              (-r) 0
stack size              (kbytes, -s) 8192
cpu time               (seconds, -t) unlimited
max user processes              (-u) 3795
virtual memory          (kbytes, -v) unlimited
file locks                      (-x) unlimited
```

#### Session A
```
[zhongmingmao@localhost ~]$ func() {
> func | func&
> }
[zhongmingmao@localhost ~]$ func
-bash: fork: retry: No child processes
-bash: fork: retry: No child processes
...
-bash: fork: Resource temporarily unavailable
-bash: fork: Resource temporarily unavailable
```

#### Session B
load很高
```
[root@localhost ~]# id zhongmingmao
uid=1000(zhongmingmao) gid=1000(zhongmingmao) 组=1000(zhongmingmao)
[root@localhost ~]# top -u 1000
top - 22:26:34 up  5:49,  3 users,  load average: 337.21, 175.05, 74.72
Tasks: 107 total,   1 running, 106 sleeping,   0 stopped,   0 zombie
%Cpu(s):  0.0 us,  0.3 sy,  0.0 ni, 99.7 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
KiB Mem :   995748 total,   840952 free,   105932 used,    48864 buff/cache
KiB Swap:  2097148 total,  2013948 free,    83200 used.   793856 avail Mem

   PID USER      PR  NI    VIRT    RES    SHR S %CPU %MEM     TIME+ COMMAND
  5012 zhongmi+  20   0  115580    820    800 S  0.0  0.1   0:00.05 bash

[root@localhost ~]# kill -9 5012
```

## 捕获信号
1. **kill**默认会发送**15**号信号给应用程序
2. **ctrl+c**发送**2**号信号给应用程序
3. **9号信号不可阻塞！！**

```
[root@localhost ~]# kill -l
 1) SIGHUP	 2) SIGINT	 3) SIGQUIT	 4) SIGILL	 5) SIGTRAP
 6) SIGABRT	 7) SIGBUS	 8) SIGFPE	 9) SIGKILL	10) SIGUSR1
11) SIGSEGV	12) SIGUSR2	13) SIGPIPE	14) SIGALRM	15) SIGTERM
16) SIGSTKFLT	17) SIGCHLD	18) SIGCONT	19) SIGSTOP	20) SIGTSTP
21) SIGTTIN	22) SIGTTOU	23) SIGURG	24) SIGXCPU	25) SIGXFSZ
26) SIGVTALRM	27) SIGPROF	28) SIGWINCH	29) SIGIO	30) SIGPWR
31) SIGSYS	34) SIGRTMIN	35) SIGRTMIN+1	36) SIGRTMIN+2	37) SIGRTMIN+3
38) SIGRTMIN+4	39) SIGRTMIN+5	40) SIGRTMIN+6	41) SIGRTMIN+7	42) SIGRTMIN+8
43) SIGRTMIN+9	44) SIGRTMIN+10	45) SIGRTMIN+11	46) SIGRTMIN+12	47) SIGRTMIN+13
48) SIGRTMIN+14	49) SIGRTMIN+15	50) SIGRTMAX-14	51) SIGRTMAX-13	52) SIGRTMAX-12
53) SIGRTMAX-11	54) SIGRTMAX-10	55) SIGRTMAX-9	56) SIGRTMAX-8	57) SIGRTMAX-7
58) SIGRTMAX-6	59) SIGRTMAX-5	60) SIGRTMAX-4	61) SIGRTMAX-3	62) SIGRTMAX-2
63) SIGRTMAX-1	64) SIGRTMAX
```
```
[root@localhost ~]# cat 15.sh
#!/bin/bash

trap "echo sig 15" 15
trap "echo sig 2" 2

echo $$

while :
do
    :
done
```

### Session A
```
[root@localhost ~]# bash 15.sh
17560
```

### Session B
```
[root@localhost ~]# kill 17560
```

### Session A
程序不会结束
```
[root@localhost ~]# bash 15.sh
17560
sig 15

```

### Session B
```
[root@localhost ~]# kill -9 17560
```

### Session A
程序结束
```
[root@localhost ~]# bash 15.sh
17560
sig 15
已杀死
```
ctrl+c也无法结束程序
```
[root@localhost ~]# bash 15.sh
17608
^Csig 2
```

## 参考资料
[Linux实战技能100讲](https://time.geekbang.org/course/intro/100029601)