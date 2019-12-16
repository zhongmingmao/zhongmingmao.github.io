---
title: Linux使用 -- 守护进程
mathjax: false
date: 2019-10-12 19:10:04
categories:
    - Linux
    - Practice
tags:
    - Linux
    - Linux Practice
---

## nohup & VS 守护进程
1. **nohup**命令使得进程忽略**hangup**（挂起）信号
2. 守护进程
    - 不需要**终端**就能启动
    - 输出会打印到特定的文件中
    - 守护进程占用的目录是**根目录**

<!-- more -->

## nohup &
### Session A
```
[root@localhost ~]# tail -f /var/log/messages
Dec 16 06:39:44 localhost NetworkManager[758]: <info>  [1576496384.0844] dhcp4 (ens33):   nameserver '192.168.206.2'
Dec 16 06:39:44 localhost NetworkManager[758]: <info>  [1576496384.0844] dhcp4 (ens33):   domain name 'localdomain'
Dec 16 06:39:44 localhost NetworkManager[758]: <info>  [1576496384.0844] dhcp4 (ens33): state changed bound -> bound
Dec 16 06:39:44 localhost dbus[687]: [system] Activating via systemd: service name='org.freedesktop.nm_dispatcher' unit='dbus-org.freedesktop.nm-dispatcher.service'
Dec 16 06:39:44 localhost systemd: Starting Network Manager Script Dispatcher Service...
Dec 16 06:39:44 localhost dhclient[13173]: bound to 192.168.206.134 -- renewal in 805 seconds.
Dec 16 06:39:44 localhost dbus[687]: [system] Successfully activated service 'org.freedesktop.nm_dispatcher'
Dec 16 06:39:44 localhost systemd: Started Network Manager Script Dispatcher Service.
Dec 16 06:39:44 localhost nm-dispatcher: req:1 'dhcp4-change' [ens33]: new request (3 scripts)
Dec 16 06:39:44 localhost nm-dispatcher: req:1 'dhcp4-change' [ens33]: start running ordered scripts...
```

### Session B
tail命令的进程ID为13864，父进程ID为1824
```
[root@localhost ~]# ps -ef | grep tail
root      13864   1824  0 06:47 pts/0    00:00:00 tail -f /var/log/messages
root      13885  13869  0 06:48 pts/1    00:00:00 grep --color=auto tail
```
关闭Session A，tail命令为Session A终端的子进程，也会被关闭
```
[root@localhost ~]# ps -ef | grep tail
root      13892  13869  0 06:51 pts/1    00:00:00 grep --color=auto tail
```

### Session C
```
[root@localhost ~]# nohup tail -f /var/log/messages &
[1] 13935
[root@localhost ~]# nohup: 忽略输入并把输出追加到"nohup.out"

[root@localhost ~]# pwd
/root
[root@localhost ~]# cat nohup.out
Dec 16 06:53:09 localhost NetworkManager[758]: <info>  [1576497189.5907] dhcp4 (ens33): state changed bound -> bound
Dec 16 06:53:09 localhost dbus[687]: [system] Activating via systemd: service name='org.freedesktop.nm_dispatcher' unit='dbus-org.freedesktop.nm-dispatcher.service'
Dec 16 06:53:09 localhost systemd: Starting Network Manager Script Dispatcher Service...
Dec 16 06:53:09 localhost dhclient[13173]: bound to 192.168.206.134 -- renewal in 855 seconds.
Dec 16 06:53:09 localhost dbus[687]: [system] Successfully activated service 'org.freedesktop.nm_dispatcher'
Dec 16 06:53:09 localhost systemd: Started Network Manager Script Dispatcher Service.
Dec 16 06:53:09 localhost nm-dispatcher: req:1 'dhcp4-change' [ens33]: new request (3 scripts)
Dec 16 06:53:09 localhost nm-dispatcher: req:1 'dhcp4-change' [ens33]: start running ordered scripts...
Dec 16 06:53:53 localhost systemd: Started Session 15 of user root.
Dec 16 06:53:53 localhost systemd-logind: New session 15 of user root.
```
查看Session C终端下的进程情况，tail命令的进程ID为13935，父进程ID为13920
```
[root@localhost ~]# ps -ef | grep tail
root      13935  13920  0 06:54 pts/0    00:00:00 tail -f /var/log/messages
root      13938  13920  0 06:55 pts/0    00:00:00 grep --color=auto tail
[root@localhost ~]# ps
   PID TTY          TIME CMD
 13920 pts/0    00:00:00 bash
 13935 pts/0    00:00:00 tail
 13939 pts/0    00:00:00 ps
```

### Session B
关闭Session C，对应的bash进程13920被Kill，tail命令对应的进程13935成为了**孤儿进程**，会**1号**进程**收留**
```
[root@localhost ~]# ps -ef | grep tail
root      13935      1  0 06:54 ?        00:00:00 tail -f /var/log/messages
root      13942  13869  0 06:59 pts/1    00:00:00 grep --color=auto tail
```
进入**proc**目录，查看**cwd**和**fd**
```bash
[root@localhost ~]# cd /proc/13935/

[root@localhost 13935]# ls -l cwd
lrwxrwxrwx. 1 root root 0 12月 16 07:55 cwd -> /root

# 禁用标准输入
[root@localhost 13935]# ls -l fd
总用量 0
l-wx------. 1 root root 64 12月 16 07:55 0 -> /dev/null
l-wx------. 1 root root 64 12月 16 07:55 1 -> /root/nohup.out
l-wx------. 1 root root 64 12月 16 06:55 2 -> /root/nohup.out
lr-x------. 1 root root 64 12月 16 07:55 3 -> /var/log/messages
lr-x------. 1 root root 64 12月 16 07:55 4 -> anon_inode:inotify
```

## 守护进程sshd
```bash
[root@localhost 13935]# ps -ef | grep sshd
root       1027      1  0 12月15 ?      00:00:00 /usr/sbin/sshd -D
root      13865   1027  0 06:47 ?        00:00:00 sshd: root@pts/1
root      14081  13869  0 07:58 pts/1    00:00:00 grep --color=auto sshd

[root@localhost 13935]# cd /proc/1027

# 占用的目录是根目录
[root@localhost 1027]# ls -l cwd
lrwxrwxrwx. 1 root root 0 12月 16 07:59 cwd -> /

[root@localhost 1027]# ls -l fd
总用量 0
lr-x------. 1 root root 64 12月 16 06:14 0 -> /dev/null
lrwx------. 1 root root 64 12月 16 06:14 1 -> socket:[20381]
lrwx------. 1 root root 64 12月 16 06:14 2 -> socket:[20381]
lrwx------. 1 root root 64 12月 16 06:14 3 -> socket:[20529]
lrwx------. 1 root root 64 12月 16 06:14 4 -> socket:[20538]
```