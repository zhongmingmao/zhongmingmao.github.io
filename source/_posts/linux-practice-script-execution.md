---
title: Linux使用 -- 执行脚本方式
mathjax: false
date: 2019-10-16 16:13:58
categories:
    - Linux
    - Practice
tags:
    - Linux
    - Linux Practice
---

## 2.sh
```bash
#!/bin/bash

# demo 2.sh
cd /tmp
pwd
```

## 执行方式

### 子进程
#### bash ./filename.sh
在当前终端下面产生一个**bash子进程**，bash子进程再去解释`filename.sh`（不需要`x`权限）
```
[root@localhost ~]# ll 2.sh
-rw-r--r--. 1 root root 37 10月 16 16:30 2.sh

[root@localhost ~]# bash 2.sh
/tmp

[root@localhost ~]# pwd
/root
```

<!-- more -->

#### ./filename.sh
同样产生一个**子进程**，但使用的是`Sha-Bang`（即`#!`）来解释`filename.sh`
```
[root@localhost ~]# ./2.sh
-bash: ./2.sh: 权限不够

[root@localhost ~]# chmod u+x 2.sh

[root@localhost ~]# ./2.sh
/tmp

[root@localhost ~]# pwd
/root
```

### 当前进程

#### source ./filename.sh
在**当前进程**解释`filename.sh`
```
[root@localhost ~]# source ./2.sh
/tmp

[root@localhost tmp]# pwd
/tmp
```

#### . ./filename.sh
同`source`方式
```
[root@localhost ~]# . 2.sh
/tmp

[root@localhost tmp]# pwd
/tmp
```

## 内建命令
1. 内建命令**不需要创建子进程**（如cd、pwd等）
2. 内建命令**对当前Shell生效**