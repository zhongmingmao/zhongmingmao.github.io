---
title: Linux使用 -- 管道 + 重定向
mathjax: false
date: 2019-10-17 17:25:02
categories:
    - Linux
    - Practice
tags:
    - Linux
    - Linux Practice
---

## 管道
1. **管道**是**进程通信**的方式
    - **信号**也是进程通信的方式，例如`kill -9 pid`是让进程处于某种**运行状态**
2. **匿名管道**（管道符`|`）是Shell编程经常用到的**通信**工具
3. 管道符是`|`，将前一个命令执行的结果传递给后面的命令
    - `;`只是隔开多条命令，顺序执行，**命令之间没有任何关系**

<!-- more -->

### Session A
```
$ cat | tail -f | ps -f
UID         PID   PPID  C STIME TTY          TIME CMD
root       2348   2344  0 16:12 pts/1    00:00:00 -bash
root       2971   2348  0 19:13 pts/1    00:00:00 cat
root       2972   2348  0 19:13 pts/1    00:00:00 tail -f
root       2973   2348  0 19:13 pts/1    00:00:00 ps -f

```
1. cat的本质：将文本内容作为输入，与终端建立连接
2. 管道符`|`给两边的**外部命令**分别创建了对应的**子进程**，对应pid为2971、2972、2973（已结束）
    - 如果子进程是Shell脚本，称为**子Shell**（如果使用了cd、pwd等内建命令，作用范围仅限于子Shell之内）

### Session B
2971的1和2972的2建立了连接，即**前一个命令的标准输出**与**后一个命令的标准输入**建立了连接
```
[root@localhost ~]# ls -l /proc/2971/fd
总用量 0
lrwx------. 1 root root 64 10月 17 19:18 0 -> /dev/pts/1
l-wx------. 1 root root 64 10月 17 19:18 1 -> pipe:[53011]
lrwx------. 1 root root 64 10月 17 19:13 2 -> /dev/pts/1

[root@localhost ~]# ls -l /proc/2972/fd
总用量 0
lr-x------. 1 root root 64 10月 17 19:18 0 -> pipe:[53011]
l-wx------. 1 root root 64 10月 17 19:18 1 -> pipe:[53013]
lrwx------. 1 root root 64 10月 17 19:13 2 -> /dev/pts/1

[root@localhost ~]# ls -l /proc/2973/fd
ls: 无法访问/proc/2973/fd: 没有那个文件或目录
```

## 重定向
1. 重定向的本质：将**进程的输入和输出**与**文件**建立连接
2. 进程运行时会默认打开**标准输入**（fd=**0**），**标准输出**（fd=**1**）、**错误输出**（fd=**2**）
3. 输入重定向：`<`
    - `read var < /path/to/file`
4. 输出重定向：`>`（覆盖）、`>>`（追加）、`2>`（**错误**重定向）、`&>`（**全部**重定向）
    - `echo 123 > /path/to/file`
5. 输入重定向 + 输出重定向 -- 常用于在Shell中**生成配置文件**
    - `cat > /path/to/file <<EOF`

### 输入重定向
```
[root@localhost ~]# wc -l
123
456 # 输入CTRL+D
2

[root@localhost ~]# wc -l < /etc/passwd
20
```
```
[root@localhost ~]# read var
123
[root@localhost ~]# echo $var
123

[root@localhost ~]# echo 123 > a.txt
[root@localhost ~]# read var2 < a.txt
[root@localhost ~]# echo $var2
123
```

### 输出重定向
```
[root@localhost ~]# echo $var2 > b.txt
[root@localhost ~]# cat b.txt
123

[root@localhost ~]# echo $var2 >> b.txt
[root@localhost ~]# cat b.txt
123
123
```
```
[root@localhost ~]# nocmd
-bash: nocmd: 未找到命令
[root@localhost ~]# nocmd 2> error.txt
[root@localhost ~]# cat error.txt
-bash: nocmd: 未找到命令

[root@localhost ~]# ls &> ls.txt
[root@localhost ~]# cat ls.txt
anaconda-ks.cfg
a.txt
b.txt
error.txt
ls.txt
```

### 组合使用（生成配置文件）
```
[root@localhost ~]# cat combine.sh
#!/bin/bash

cat > /root/a.sh <<EOF
echo "hello bash"
EOF
```
```
[root@localhost ~]# bash combine.sh
[root@localhost ~]# cat a.sh
echo "hello bash"
```
