---
title: Linux使用 -- ext4（inode + datablock）
mathjax: false
date: 2019-10-14 22:00:35
categories:
    - Linux
    - Practice
tags:
    - Linux
    - Linux Practice
    - ext4
    - File System
---

## 基本结构
1. 超级块
    - 在ext4文件系统**最开头**的部分
    - 记录了整个文件系统中所包含的文件的**元数据**，`df`命令读取的就是超级块中的内容，所以**执行很快**
2. 超级块副本
3. **inode**
    - 记录每个文件的**大小**（非实际大小，用于`ls`命令）、权限、编号等信息，但**文件名**是记录在**父目录的inode**中
    - **文件**的`r`权限，是读取**文件内容**；而**目录**的`r`权限，是读取**目录下的文件名称**
4. **datablock**
    - 记录**数据**，inode和datablock是**链式**结构
    - `ls`统计的是**inode**里面的文件大小，而`du`统计的是文件**datablock**的总大小

```
[root@localhost ~]# ls -li anaconda-ks.cfg
33574978 -rw-------. 1 root root 1260 12月 15 19:25 anaconda-ks.cfg
```

<!-- more -->

## ext4
```
[root@localhost sdb1]# df -Th
文件系统                类型      容量  已用  可用 已用% 挂载点
devtmpfs                devtmpfs  475M     0  475M    0% /dev
tmpfs                   tmpfs     487M     0  487M    0% /dev/shm
tmpfs                   tmpfs     487M  7.7M  479M    2% /run
tmpfs                   tmpfs     487M     0  487M    0% /sys/fs/cgroup
/dev/mapper/centos-root xfs        17G  1.4G   16G    9% /
/dev/sda1               xfs      1014M  137M  878M   14% /boot
tmpfs                   tmpfs      98M     0   98M    0% /run/user/0
/dev/sdb1               ext4      991M  2.6M  922M    1% /mnt/sdb1

[root@localhost sdb1]# pwd
/mnt/sdb1
```

## touch
文件大小为0（此时**只有inode**，**没有datablock**），inode编号为12
```
[root@localhost sdb1]# touch afile

[root@localhost sdb1]# ls -li afile
12 -rw-r--r--. 1 root root 0 12月 18 18:12 afile

[root@localhost sdb1]# du -sh afile
0	afile
```
`ls`命令是4字节（包含换行符），`du`命令是4K（ext4中的默认**数据块**大小是**4K**），因此如果存储很多**小文件**，存储空间的开销也会很大，因此会有专门针对小文件的**网络文件系统**
```
[root@localhost sdb1]# echo 123 > afile

[root@localhost sdb1]# ls -li afile
12 -rw-r--r--. 1 root root 4 12月 18 19:13 afile

[root@localhost sdb1]# du -sh afile
4.0K	afile
```

## cp
afile和afile2的**inode**编号是不一样的（**datablock**也是不一样的），所以修改afile不会影响到afile2
```
[root@localhost sdb1]# cp afile afile2

[root@localhost sdb1]# ls -li afile afile2
12 -rw-r--r--. 1 root root 4 12月 18 19:13 afile
13 -rw-r--r--. 1 root root 4 12月 18 19:35 afile2
```

## mv
afile2改名为afile3，但**inode**编号没有发生改变（对应的datablock也没有发生变化），实际修改的是`/mnt/sdb1`目录的**datablock**（文件名和inode的**对应关系**），因此在**同一个分区内**mv大文件也非常快（因为inode和datablock是由分区内的文件系统**统一管理**的）
```
[root@localhost sdb1]# mv afile2 afile3

[root@localhost sdb1]# ls -li afile*
12 -rw-r--r--. 1 root root 4 12月 18 19:13 afile
13 -rw-r--r--. 1 root root 4 12月 18 19:35 afile3

[root@localhost sdb1]# pwd
/mnt/sdb1

[root@localhost sdb1]# dd if=/dev/zero bs=4M count=256 of=./bigfile
dd: 写入"./bigfile" 出错: 设备上没有空间
记录了244+0 的读入
记录了243+0 的写出
1019617280字节(1.0 GB)已复制，9.29186 秒，110 MB/秒

[root@localhost sdb1]# time mv bigfile bigfile2
real	0m0.029s
user	0m0.002s
sys	0m0.017s

[root@localhost sdb1]# time mv bigfile2 /tmp
real	0m1.723s
user	0m0.026s
sys	0m1.109s
```

## vim
```bash
# 写入123
[root@localhost sdb1]# vim afile4
[root@localhost sdb1]# ls -li afile4
15 -rw-r--r--. 1 root root 4 12月 19 23:05 afile4

# 追加456，会修改inode
[root@localhost sdb1]# vim afile4
[root@localhost sdb1]# ls -li afile4
16 -rw-r--r--. 1 root root 8 12月 19 23:06 afile4

# echo追加789，不会修改inode，只会修改datablock
[root@localhost sdb1]# echo 789 >> afile4
[root@localhost sdb1]# ls -li afile4
16 -rw-r--r--. 1 root root 12 12月 19 23:08 afile4
```
```bash
# Session A，追加aaa
[root@localhost sdb1]# vim afile4

# Session B
[root@localhost sdb1]# ls -li .afile4.swp  afile4
16 -rw-r--r--. 1 root root    12 12月 19 23:08 afile4
14 -rw-r--r--. 1 root root 12288 12月 19 23:10 .afile4.swp

# Session A，wq退出vim，16和14消失，变成了15！！
[root@localhost sdb1]# ls -li afile4
15 -rw-r--r--. 1 root root 16 12月 19 23:12 afile4
```

## rm
rm的本质：使得**inode**与**文件名**的**链接断开**，时间复杂度为`O(1)`
```bash
[root@localhost sdb1]# rm afile4
rm：是否删除普通文件 "afile4"？y

[root@localhost sdb1]# dd if=/dev/zero bs=4M count=256 of=./bigfile
dd: 写入"./bigfile" 出错: 设备上没有空间
记录了244+0 的读入
记录了243+0 的写出
1019617280字节(1.0 GB)已复制，1.13283 秒，900 MB/秒

[root@localhost sdb1]# time rm -f bigfile
real	0m0.086s
user	0m0.000s
sys	0m0.085s
```

## ln
ln的本质：使得更多的文件名指向inode
```bash
# 1表示有一个文件名与该inode建立了链接
[root@localhost sdb1]# ls -li afile
12 -rw-r--r--. 1 root root 4 12月 18 19:13 afile
```

### 硬链接（不能跨文件系统/分区）
```bash
# 2表示afile和bfile都与同一个inode建立了链接，也称为硬链接（inode相同！！）
[root@localhost sdb1]# ln afile bfile
[root@localhost sdb1]# ls -li afile bfile
12 -rw-r--r--. 2 root root 4 12月 18 19:13 afile
12 -rw-r--r--. 2 root root 4 12月 18 19:13 bfile

[root@localhost sdb1]# cat afile
123
[root@localhost sdb1]# cat bfile
123
[root@localhost sdb1]# echo 456 >> afile
[root@localhost sdb1]# cat bfile
123
456

# 只是解除bfile和inode的链接关系！！
[root@localhost sdb1]# rm bfile
rm：是否删除普通文件 "bfile"？y
[root@localhost sdb1]# ls -li afile
12 -rw-r--r--. 1 root root 8 12月 19 23:29 afile

# 文件名和inode的链接关系是存在父目录的datablock中，因此不会占用更多的磁盘空间！！

# 硬链接是不能跨越文件系统的！！因为inode是维护在文件系统中的
# 可以考虑采用软链接
[root@localhost sdb1]# ln afile /tmp/bfile
ln: 无法创建硬链接"/tmp/bfile" => "afile": 无效的跨设备连接
```

### 软链接（符号链接，可以跨文件系统/分区）
```bash
[root@localhost sdb1]# ls -li afile
12 -rw-r--r--. 1 root root 4 12月 19 23:37 afile
[root@localhost sdb1]# ln -s afile aafile

# inode不一样，aafile的datablock记录了目标文件的绝对路径或相对路径！！
# 类型为l，为符号链接，权限为777
[root@localhost sdb1]# ls -li afile aafile
14 lrwxrwxrwx. 1 root root 5 12月 19 23:41 aafile -> afile
12 -rw-r--r--. 1 root root 4 12月 19 23:37 afile

# 对链接文件做权限设置是无效的，都会传递给对应的目标文件！！
[root@localhost sdb1]# chmod u-x aafile
[root@localhost sdb1]# ls -li afile aafile
14 lrwxrwxrwx. 1 root root 5 12月 19 23:41 aafile -> afile
12 -rw-r--r--. 1 root root 4 12月 19 23:37 afile
[root@localhost sdb1]# chmod u+x aafile
[root@localhost sdb1]# ls -li afile aafile
14 lrwxrwxrwx. 1 root root 5 12月 19 23:41 aafile -> afile
12 -rwxr--r--. 1 root root 4 12月 19 23:37 afile
```

## facl
```bash
[root@localhost sdb1]# ls -li afile
12 -rw-r--r--. 1 root root 4 12月 19 23:37 afile
[root@localhost sdb1]# getfacl afile
# file: afile
# owner: root
# group: root
user::rw-
group::r--
other::r--

[root@localhost sdb1]# setfacl -m u:zhongmingmao:r afile
[root@localhost sdb1]# getfacl afile
# file: afile
# owner: root
# group: root
user::rw-
user:zhongmingmao:r--
group::r--
mask::r--
other::r--
# 权限中的+表示有facl权限
[root@localhost sdb1]# ls -li afile
12 -rw-r--r--+ 1 root root 4 12月 19 23:37 afile

[root@localhost sdb1]# setfacl -m g:zhongmingmao:rwx afile
[root@localhost sdb1]# getfacl afile
# file: afile
# owner: root
# group: root
user::rw-
user:zhongmingmao:r--
group::r--
group:zhongmingmao:rwx
mask::rwx
other::r--

# 回收facl权限
[root@localhost sdb1]# setfacl -x g:zhongmingmao afile
[root@localhost sdb1]# getfacl afile
# file: afile
# owner: root
# group: root
user::rw-
user:zhongmingmao:r--
group::r--
mask::r--
other::r--
```