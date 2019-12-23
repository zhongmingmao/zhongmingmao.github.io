---
title: Linux使用 -- 变量
mathjax: false
date: 2019-10-18 09:50:54
categories:
    - Linux
    - Practice
tags:
    - Linux
    - Linux Practice
---

## 命名规则
1. **字母**、**数字**、**下划线**
2. 不以字母开头

## 赋值
1. 基本概念
    - Shell变量是**弱类型**的变量
2. 方式
    - 变量名=变量值
      - `a=123`，等号左右不能出现**空格**
    - 使用let为变量赋值
      - `let a=10+20`，Shell是**解释性**语言，尽量**不要进行运算**
    - 将命令赋值给变量
      - `l=ls`
    - 将命令结果赋值给变量，使用`$()`或者\`\`
      - `letc=$(ls -l /etc)`
    - 变量值有空格等特殊字符可以包含在`""`或者`''`中
      - `a='hello world'`

<!-- more -->

```
[root@localhost ~]# a=123
[root@localhost ~]# a =123
-bash: a: 未找到命令
[root@localhost ~]# a = 123
-bash: a: 未找到命令
[root@localhost ~]# a= 123
-bash: 123: 未找到命令
```
```
[root@localhost ~]# l=ls
[root@localhost ~]# $l
anaconda-ks.cfg  a.sh  a.txt  b.txt  combine.sh  error.txt  ls.txt
```
```
[root@localhost ~]# cmd1=`ls /root`
[root@localhost ~]# echo $cmd1
anaconda-ks.cfg a.sh a.txt b.txt combine.sh error.txt ls.txt

[root@localhost ~]# cmd2=$(ls /root)
[root@localhost ~]# echo $cmd2
anaconda-ks.cfg a.sh a.txt b.txt combine.sh error.txt ls.txt
```
```
[root@localhost ~]# string1=hello bash
[root@localhost ~]# echo $string1
hello
[root@localhost ~]# string1='hello bash'
[root@localhost ~]# echo $string1
hello bash
[root@localhost ~]# string2="I'm bash"
[root@localhost ~]# echo $string2
I'm bash
[root@localhost ~]# string3='Hello "zhongmingmao"'
[root@localhost ~]# echo $string3
Hello "zhongmingmao"
```

## 引用
1. `${变量名}`是对变量的引用 -- 最正式的用法
2. `echo ${变量名}`查看变量的值
3. `${变量名}`在部分情况下可以省略为`$变量名`

```
[root@localhost ~]# string1='hello bash'
[root@localhost ~]# echo $string1
hello bash
[root@localhost ~]# echo ${string1}
hello bash
[root@localhost ~]# echo $string123

[root@localhost ~]# echo ${string1}23
hello bash23
```

## 作用范围
1. 默认作用范围
    - **当前Shell**
2. 变量导出
    - **export**
3. 变量的删除
    - **unset**

```
[root@localhost ~]# a=1
[root@localhost ~]# bash # 进入子进程
[root@localhost ~]# echo $a

[root@localhost ~]# a=2
[root@localhost ~]# exit
[root@localhost ~]# echo $a
1
```
```
[root@localhost ~]# b='hello subshell'
[root@localhost ~]# vim subshell.sh
[root@localhost ~]# cat subshell.sh
#!/bin/bash

# demo subshell

echo $b
[root@localhost ~]# chmod u+x subshell.sh
[root@localhost ~]# bash subshell.sh

[root@localhost ~]# ./subshell.sh

[root@localhost ~]# source ./subshell.sh
hello subshell
[root@localhost ~]# . ./subshell.sh
hello subshell
```
```
[root@localhost ~]# export b='hello subshell'
[root@localhost ~]# ./subshell.sh
hello subshell
[root@localhost ~]# bash ./subshell.sh
hello subshell
```
```
[root@localhost ~]# unset b
[root@localhost ~]# echo $b

[root@localhost ~]#
```

## 系统环境变量
1. 环境变量：每个Shell打开都可以获得到的变量
    - 命令：`env`、`set`（更详细）
    - `$PATH`
    - `PS1`
    - `$?`（上一条命令是否正常执行）、`$$`（PID）、`$0`（执行的文件名）
2. 位置变量
    - `$1`、`$2`...`$n`

### $PATH
$PATH被**export**过，对**子Shell**生效，但对平行Shell不生效

#### Session A
```
[root@localhost ~]# cat 5.sh
#!/bin/bash

echo 'hello bash'
du -sh
[root@localhost ~]# chmod u+x 5.sh
[root@localhost ~]# echo $PATH
/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/root/bin
[root@localhost ~]# ./5.sh
hello bash
80K	.
[root@localhost ~]# 5.sh
bash: 5.sh: 未找到命令
[root@localhost ~]# PATH=$PATH:/root
[root@localhost ~]# echo $PATH
/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/root/bin:/root
[root@localhost ~]# 5.sh
hello bash
80K	.
[root@localhost ~]# which 5.sh
/root/5.sh
[root@localhost ~]# bash # 进入子进程
[root@localhost ~]# echo $PATH # PATH依然有效
/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/root/bin:/root
[root@localhost ~]# 5.sh
hello bash
80K	.
```

#### Session B
```
[root@localhost ~]# echo $PATH
/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/root/bin
```

### $PS1
```
[root@localhost ~]# echo $PS1
[\u@\h \W]\$
```

### $?、$$、$0
```
[root@localhost ~]# ifconfig > /dev/null
[root@localhost ~]# echo $?
0
[root@localhost ~]# ifconfig nonn1 > /dev/null
nonn1: error fetching interface information: Device not found
[root@localhost ~]# echo $?
1
```
```
[root@localhost ~]# echo $$
3143
[root@localhost ~]# bash # 进入子进程
[root@localhost ~]# echo $$
3227
[root@localhost ~]# ps -f
UID         PID   PPID  C STIME TTY          TIME CMD
root       3143   3139  0 19:05 pts/1    00:00:00 -bash
root       3227   3143  0 19:24 pts/1    00:00:00 bash
root       3238   3227  0 19:24 pts/1    00:00:00 ps -f
```
```
[root@localhost ~]# echo $0
bash
[root@localhost ~]# cat 6.sh
#!/bin/bash

echo $$
echo $0
[root@localhost ~]# chmod u+x 6.sh
[root@localhost ~]# bash 6.sh
3243
6.sh
[root@localhost ~]# . 6.sh
3227
bash
```

### $1、$n
```
[root@localhost ~]# cat 7.sh
#!/bin/bash

# $1 $2 ${10}
echo $1
echo $2
echo ${2-X} # 参数替换
[root@localhost ~]# chmod u+x 7.sh
[root@localhost ~]# ./7.sh -a -b
-a
-b
-b
[root@localhost ~]# ./7.sh -a
-a

X
```

## 环境变量配置文件
1. /etc/profile
2. /etc/bashrc -- **nologin** shell
3. /etc/profile.d/
4. ~/.bash_profile
5. ~/.bash_rc -- **nologin** shell

```
[root@localhost ~]# head -n 1 /etc/profile
echo /etc/profile
[root@localhost ~]# head -n 1 /etc/bashrc
echo /etc/bashrc
[root@localhost ~]# head -n 1 ~/.bashrc
echo ~/.bashrc
[root@localhost ~]# head -n 1 ~/.bash_profile
echo ~/.bash_profile

[root@localhost ~]# su - root
上一次登录：一 10月 18 19:05:34 CST 2019从 192.168.206.1pts/1 上
/etc/profile
/root/.bash_profile
/root/.bashrc
/etc/bashrc

[root@localhost ~]# su root
/root/.bashrc
/etc/bashrc

[root@localhost ~]# bash
/root/.bashrc
/etc/bashrc

[root@localhost ~]# source /etc/profile
/etc/profile
[root@localhost ~]# source /etc/bashrc
/etc/bashrc
```

## 数组
```
[root@localhost ~]# IPTS=( 10.0.0.1 10.0.0.2 10.0.0.3 )
[root@localhost ~]# echo $IPTS # 只会显示第一个元素
10.0.0.1
[root@localhost ~]# echo ${IPTS[@]}
10.0.0.1 10.0.0.2 10.0.0.3
[root@localhost ~]# echo ${#IPTS[@]}
3
[root@localhost ~]# echo ${IPTS[1]}
10.0.0.2
```