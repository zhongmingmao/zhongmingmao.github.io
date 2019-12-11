---
title: Linux使用 -- 帮助命令
mathjax: false
date: 2019-10-11 13:01:08
categories:
    - Linux
    - Linux Practice
tags:
    - Linux
---

## man
1. Executable programs or shell commands
2. System calls (functions provided by the kernel)
3. Library calls (functions within program libraries)
4. Special files (usually found in /dev)
5. File formats and conventions eg /etc/passwd
6. Games
7. Miscellaneous (including macro packages and conventions), e.g. man(7), groff(7)
8. System administration commands (usually only for root)
9. Kernel routines [Non standard]

```
$ ls /usr/bin/passwd /etc/passwd
/etc/passwd  /usr/bin/passwd

$ man 1 passwd
$ man 5 passwd
$ man -a passwd
```

<!-- more -->

## help
1. shell（**命令解析器**）自带的命令称为**内部命令**，其它的是**外部命令**
2. 内部命令：`help cd`
3. 外部命令：`ls --help`

```
$ type cd
cd is a shell builtin

$ type ls
ls is aliased to `ls --color=auto'
```

## info
1. info比help更**详细**，`info ls`