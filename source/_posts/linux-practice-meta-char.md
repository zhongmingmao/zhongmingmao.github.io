---
title: Linux使用 -- 元字符
mathjax: false
date: 2019-10-21 14:41:55
categories:
    - Linux
    - Practice
tags:
    - Linux
    - Linux Practice
---

## 元字符
1. `.`：匹配除**换行符**外的任意单个字符
2. `*`：匹配任意一个跟在它**前面**的字符
    - 作为**通配符**（`*`、`?`）时是可以**单独使用**的，但作为**元字符**时必须与**前面的字符**一起使用
3. `[]`：匹配方括号中字符类中的任意一个
4. `^`：匹配开头
5. `$`：匹配结尾
6. `\`：转义后面的特殊字符

## 扩展元字符
1. `+`：匹配前面的正则表达式出现**至少一次**
2. `?`：匹配前面的正则表达式出现**零次或一次**
3. `|`：匹配它前面或后面的正则表达式

<!-- more -->

## grep
```
[root@localhost ~]# grep password /root/anaconda-ks.cfg
# Root password

[root@localhost ~]# grep pass.... /root/anaconda-ks.cfg
auth --enableshadow --passalgo=sha512
# Root password

[root@localhost ~]# grep pass....$ /root/anaconda-ks.cfg
# Root password

[root@localhost ~]# grep pass.* /root/anaconda-ks.cfg
auth --enableshadow --passalgo=sha512
# Root password

[root@localhost ~]# grep pass.*$ /root/anaconda-ks.cfg
auth --enableshadow --passalgo=sha512
# Root password

[root@localhost ~]# grep ^# /root/anaconda-ks.cfg
#version=DEVEL
# System authorization information
# Use CDROM installation media
# Use graphical install
# Run the Setup Agent on first boot
# Keyboard layouts
# System language
# Network information
# Root password
# System services
# System timezone
# System bootloader configuration
# Partition clearing information

[root@localhost ~]# grep '\.' /root/anaconda-ks.cfg
lang en_US.UTF-8
network  --hostname=localhost.localdomain
rootpw --iscrypted $6$ynKum27gNnySda5k$gDx0Wm4.9kU7rDTmkQTfHmyKAp9z/tRgAp/DOoZ5t2k1tda0p/JK/dLG5gGfkEZJJLGHZ1DPjPOFwKPyUNpQ4.
```

## find
```
[root@localhost ~]# cd /etc/
[root@localhost etc]# find passwd
passwd
[root@localhost etc]# ls passwd*
passwd  passwd-  passwd.bak
[root@localhost etc]# find /etc -name passwd
/etc/passwd
/etc/pam.d/passwd
[root@localhost etc]# find /etc -name 'pass*'
/etc/openldap/certs/password
/etc/passwd-
/etc/passwd
/etc/selinux/targeted/active/modules/100/passenger
/etc/pam.d/passwd
/etc/pam.d/password-auth-ac
/etc/pam.d/password-auth
/etc/passwd.bak
[root@localhost etc]# find /etc -regex .*wd
/etc/passwd
/etc/security/opasswd
/etc/pam.d/passwd
[root@localhost etc]# find /etc -regex .etc.*wd
/etc/passwd
/etc/security/opasswd
/etc/pam.d/passwd
[root@localhost etc]# find /etc -type f -regex .*wd
/etc/passwd
/etc/security/opasswd
/etc/pam.d/passwd
```
```
[root@localhost ~]# touch /tmp/{1..9}.txt
[root@localhost ~]# ls /tmp/*.txt
/tmp/1.txt  /tmp/3.txt  /tmp/5.txt  /tmp/7.txt  /tmp/9.txt
/tmp/2.txt  /tmp/4.txt  /tmp/6.txt  /tmp/8.txt
[root@localhost ~]# cd /tmp/
[root@localhost tmp]# find *.txt
1.txt
2.txt
3.txt
4.txt
5.txt
6.txt
7.txt
8.txt
9.txt
[root@localhost tmp]# find *.txt -exec rm -v {} \;
已删除"1.txt"
已删除"2.txt"
已删除"3.txt"
已删除"4.txt"
已删除"5.txt"
已删除"6.txt"
已删除"7.txt"
已删除"8.txt"
已删除"9.txt"
```

## atime ctime mtime

1. **atime**(access time)：文件**访问**时间
2. **ctime**(change time)：文件**inode**变化的时间
3. **mtime**(modify time)：文件**data block**变化的时间

```
[root@localhost ~]# echo 123 > filea
[root@localhost ~]# stat filea
  文件："filea"
  大小：4         	块：8          IO 块：4096   普通文件
设备：fd00h/64768d	Inode：33639131    硬链接：1
权限：(0644/-rw-r--r--)  Uid：(    0/    root)   Gid：(    0/    root)
环境：unconfined_u:object_r:admin_home_t:s0
最近访问：2019-10-21 18:07:29.947289146 +0800
最近更改：2019-10-21 18:07:29.947289146 +0800
最近改动：2019-10-21 18:07:29.947289146 +0800
创建时间：-

[root@localhost ~]# LANG=C stat filea
  File: ‘filea’
  Size: 4         	Blocks: 8          IO Block: 4096   regular file
Device: fd00h/64768d	Inode: 33639131    Links: 1
Access: (0644/-rw-r--r--)  Uid: (    0/    root)   Gid: (    0/    root)
Context: unconfined_u:object_r:admin_home_t:s0
Access: 2019-10-21 18:07:29.947289146 +0800
Modify: 2019-10-21 18:07:29.947289146 +0800
Change: 2019-10-21 18:07:29.947289146 +0800
 Birth: -

[root@localhost ~]# cat filea
123
[root@localhost ~]# LANG=C stat filea
  File: ‘filea’
  Size: 4         	Blocks: 8          IO Block: 4096   regular file
Device: fd00h/64768d	Inode: 33639131    Links: 1
Access: (0644/-rw-r--r--)  Uid: (    0/    root)   Gid: (    0/    root)
Context: unconfined_u:object_r:admin_home_t:s0
Access: 2019-10-21 18:08:33.795681820 +0800
Modify: 2019-10-21 18:07:29.947289146 +0800
Change: 2019-10-21 18:07:29.947289146 +0800
 Birth: -

[root@localhost ~]# touch  filea
[root@localhost ~]# LANG=C stat filea
  File: ‘filea’
  Size: 4         	Blocks: 8          IO Block: 4096   regular file
Device: fd00h/64768d	Inode: 33639131    Links: 1
Access: (0644/-rw-r--r--)  Uid: (    0/    root)   Gid: (    0/    root)
Context: unconfined_u:object_r:admin_home_t:s0
Access: 2019-10-21 18:08:46.922164691 +0800
Modify: 2019-10-21 18:08:46.922164691 +0800
Change: 2019-10-21 18:08:46.922164691 +0800
 Birth: -

[root@localhost ~]# chmod 755 filea
[root@localhost ~]# LANG=C stat filea
  File: ‘filea’
  Size: 4         	Blocks: 8          IO Block: 4096   regular file
Device: fd00h/64768d	Inode: 33639131    Links: 1
Access: (0755/-rwxr-xr-x)  Uid: (    0/    root)   Gid: (    0/    root)
Context: unconfined_u:object_r:admin_home_t:s0
Access: 2019-10-21 18:08:46.922164691 +0800
Modify: 2019-10-21 18:08:46.922164691 +0800
Change: 2019-10-21 18:09:09.367990500 +0800
 Birth: -

[root@localhost ~]# echo 123456 >> filea
[root@localhost ~]# LANG=C stat filea
  File: ‘filea’
  Size: 11        	Blocks: 8          IO Block: 4096   regular file
Device: fd00h/64768d	Inode: 33639131    Links: 1
Access: (0755/-rwxr-xr-x)  Uid: (    0/    root)   Gid: (    0/    root)
Context: unconfined_u:object_r:admin_home_t:s0
Access: 2019-10-21 18:08:46.922164691 +0800
Modify: 2019-10-21 18:09:32.947855914 +0800
Change: 2019-10-21 18:09:32.947855914 +0800
 Birth: -
```