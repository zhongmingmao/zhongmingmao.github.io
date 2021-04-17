---
title: Linux使用 -- ls VS du
mathjax: false
date: 2019-10-13 09:53:38
categories:
    - Linux
    - Practice
tags:
    - Linux
    - Linux Practice
---

## du
**estimate file space usage**

## 非空洞文件
```
[root@localhost dd]# dd if=/dev/zero bs=4M count=10 of=afile
记录了10+0 的读入
记录了10+0 的写出
41943040字节(42 MB)已复制，0.0569579 秒，736 MB/秒
[root@localhost dd]# ls -lh afile
-rw-r--r--. 1 root root 40M 12月 16 20:55 afile
[root@localhost dd]# du -sh afile
40M	afile
```

<!-- more -->

## 空洞文件
```
[root@localhost dd]# dd if=/dev/zero bs=4M count=10 seek=20 of=bfile
记录了10+0 的读入
记录了10+0 的写出
41943040字节(42 MB)已复制，0.0357481 秒，1.2 GB/秒
[root@localhost dd]# ls -lh bfile
-rw-r--r--. 1 root root 120M 12月 16 20:58 bfile
[root@localhost dd]# du -sh bfile
40M	bfile
```
空洞文件常用于**虚拟化**，下图为在虚拟机上执行df命令
```
[root@localhost dd]# df -h
文件系统                 容量  已用  可用 已用% 挂载点
devtmpfs                 475M     0  475M    0% /dev
tmpfs                    487M     0  487M    0% /dev/shm
tmpfs                    487M  7.7M  479M    2% /run
tmpfs                    487M     0  487M    0% /sys/fs/cgroup
/dev/mapper/centos-root   17G  1.6G   16G    9% /
/dev/sda1               1014M  137M  878M   14% /boot
tmpfs                     98M     0   98M    0% /run/user/0
```
虚拟机在宿主机上实际占用的磁盘空间
```
➜ du -sh centos7.vmwarevm
1.8G	centos7.vmwarevm
```

## 参考资料
[Linux实战技能100讲](https://time.geekbang.org/course/intro/100029601)