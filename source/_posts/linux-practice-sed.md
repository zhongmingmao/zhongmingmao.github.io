---
title: Linux使用 -- sed
mathjax: false
date: 2019-10-22 18:55:38
categories:
    - Linux
    - Practice
tags:
    - Linux
    - Linux Practice
---

## sed awk
1. `sed`：一般用于对文本内容做**替换**
2. `awk`：一般用于对文本内容进行**统计**、按**需要的格式**进行输出

<!-- more -->

## 替换指令

### 模式空间
1. 将文件以**行**为单位读取到内存（模式空间）
2. 使用sed的每个脚本对该行进行操作
3. 处理完成后输出该行

### 替换命令s
```
sed 's/old/new/' filename
sed -e 's/old/new/' -e 's/old/new/' filename ...
sed -i 's/old/new/' 's/old/new/' filename ...
```
带正则表达式的替换命令s
```
sed 's/正则表达式/new/' filename
sed -r 's/扩展正则表达式(+、？、|)/new/' filename
```

### 样例

#### 基本使用
```
[root@localhost ~]# echo a a a > afile
[root@localhost ~]# sed 's/a/aa/' afile
aa a a
[root@localhost ~]# sed 's///aa/' afile
sed：-e 表达式 #1，字符 5：“s”的未知选项
[root@localhost ~]# sed 's!/!aa!' afile
a a a
[root@localhost ~]# sed -e 's/a/aa/' -e 's/aa/bb/' afile
bb a a
[root@localhost ~]# sed 's/a/aa/;s/aa/bb/' afile
bb a a
[root@localhost ~]# cat afile
a a a
[root@localhost ~]# sed -i 's/a/aa/;s/aa/bb/' afile
[root@localhost ~]# cat afile
bb a a
```
```
[root@localhost ~]# head -5 /etc/passwd
root:x:0:0:root:/root:/bin/bash
bin:x:1:1:bin:/bin:/sbin/nologin
daemon:x:2:2:daemon:/sbin:/sbin/nologin
adm:x:3:4:adm:/var/adm:/sbin/nologin
lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin
[root@localhost ~]# head -5 /etc/passwd | sed 's/...//'
t:x:0:0:root:/root:/bin/bash
:x:1:1:bin:/bin:/sbin/nologin
mon:x:2:2:daemon:/sbin:/sbin/nologin
:x:3:4:adm:/var/adm:/sbin/nologin
x:4:7:lp:/var/spool/lpd:/sbin/nologin
[root@localhost ~]# head -5 /etc/passwd | sed 's/s*bin//'
root:x:0:0:root:/root://bash
:x:1:1:bin:/bin:/sbin/nologin
daemon:x:2:2:daemon:/:/sbin/nologin
adm:x:3:4:adm:/var/adm://nologin
lp:x:4:7:lp:/var/spool/lpd://nologin

[root@localhost ~]# grep root /etc/passwd
root:x:0:0:root:/root:/bin/bash
operator:x:11:0:operator:/root:/sbin/nologin
[root@localhost ~]# grep root /etc/passwd | sed 's/^root//'
:x:0:0:root:/root:/bin/bash
operator:x:11:0:operator:/root:/sbin/nologin
```

#### 扩展元字符
`+`、`?`、`|`是扩展元字符，所以需要`-r`参数，`()`也是扩展元字符
```
[root@localhost ~]# cat bfile
b
a
aa
aaa
ab
abb
abbb
[root@localhost ~]# sed 's/ab*/!/' bfile
b
!
!a
!aa
!
!
!
[root@localhost ~]# sed -r 's/ab+/!/' bfile
b
a
aa
aaa
!
!
!
[root@localhost ~]# sed -r 's/ab?/!/' bfile
b
!
!a
!aa
!
!b
!bb
[root@localhost ~]# sed -r 's/a|b/!/' bfile
!
!
!a
!aa
!b
!bb
!bbb
[root@localhost ~]# sed -r 's/(aa)|(bb)/!/' bfile
b
a
!
!a
ab
a!
a!b
```
`()`扩展元字符支持**回调**
```
[root@localhost ~]# cat cfile
axyzb
[root@localhost ~]# sed -r 's/(a.*b)/\1:\1/' cfile
axyzb:axyzb
```

#### 全局替换
```
[root@localhost ~]# head -5 /etc/passwd
root:x:0:0:root:/root:/bin/bash
bin:x:1:1:bin:/bin:/sbin/nologin
daemon:x:2:2:daemon:/sbin:/sbin/nologin
adm:x:3:4:adm:/var/adm:/sbin/nologin
lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin

[root@localhost ~]# head -5 /etc/passwd | sed 's/root/!!!!/'
!!!!:x:0:0:root:/root:/bin/bash
bin:x:1:1:bin:/bin:/sbin/nologin
daemon:x:2:2:daemon:/sbin:/sbin/nologin
adm:x:3:4:adm:/var/adm:/sbin/nologin
lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin

[root@localhost ~]# head -5 /etc/passwd | sed 's/root/!!!!/g'
!!!!:x:0:0:!!!!:/!!!!:/bin/bash
bin:x:1:1:bin:/bin:/sbin/nologin
daemon:x:2:2:daemon:/sbin:/sbin/nologin
adm:x:3:4:adm:/var/adm:/sbin/nologin
lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin

[root@localhost ~]# head -5 /etc/passwd | sed 's/root/!!!!/2'
root:x:0:0:!!!!:/root:/bin/bash
bin:x:1:1:bin:/bin:/sbin/nologin
daemon:x:2:2:daemon:/sbin:/sbin/nologin
adm:x:3:4:adm:/var/adm:/sbin/nologin
lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin
```

#### 标志位
1. `s/old/new/标志位`
2. `数字`：第几次出现才进行替换
3. `g`：每次出现都进行替换
4. `p`：打印**模式空间**的内容
   - `sed -n 'script' filename`阻止默认输出
5. `w file`：将**模式空间**的内容写入到文件

匹配成功的行，会被多打印一次
```
[root@localhost ~]# head -5 /etc/passwd | sed 's/root/!!!!/p'
!!!!:x:0:0:root:/root:/bin/bash
!!!!:x:0:0:root:/root:/bin/bash
bin:x:1:1:bin:/bin:/sbin/nologin
daemon:x:2:2:daemon:/sbin:/sbin/nologin
adm:x:3:4:adm:/var/adm:/sbin/nologin
lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin
```
只有匹配成功的行才会被打印
```
[root@localhost ~]# head -5 /etc/passwd | sed -n 's/root/!!!!/p'
!!!!:x:0:0:root:/root:/bin/bash
```
匹配成功的行被写入到另外的文件
```
[root@localhost ~]# head -5 /etc/passwd | sed -n 's/root/!!!!/w /tmp/a.txt'
[root@localhost ~]# cat /tmp/a.txt
!!!!:x:0:0:root:/root:/bin/bash
```

#### 寻址
1. 默认对**每行**进行操作，增加寻址后对**匹配的行**进行操作
2. `/正则表达式/s/old/new/g`
3. `行号s/old/new/g`
    - 行号可以是最后一行`$`
4. 可以使用**两个寻址符号**，也可以混合使用**行号**和**正则地址**

```
[root@localhost ~]# head -6 /etc/passwd
root:x:0:0:root:/root:/bin/bash
bin:x:1:1:bin:/bin:/sbin/nologin
daemon:x:2:2:daemon:/sbin:/sbin/nologin
adm:x:3:4:adm:/var/adm:/sbin/nologin
lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin
sync:x:5:0:sync:/sbin:/bin/sync
[root@localhost ~]# head -6 /etc/passwd | sed 's/adm/!/'
root:x:0:0:root:/root:/bin/bash
bin:x:1:1:bin:/bin:/sbin/nologin
daemon:x:2:2:daemon:/sbin:/sbin/nologin
!:x:3:4:adm:/var/adm:/sbin/nologin
lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin
sync:x:5:0:sync:/sbin:/bin/sync
```
```
[root@localhost ~]# head -6 /etc/passwd | sed '1s/adm/!/'
root:x:0:0:root:/root:/bin/bash
bin:x:1:1:bin:/bin:/sbin/nologin
daemon:x:2:2:daemon:/sbin:/sbin/nologin
adm:x:3:4:adm:/var/adm:/sbin/nologin
lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin
sync:x:5:0:sync:/sbin:/bin/sync
[root@localhost ~]# head -6 /etc/passwd | sed '1,3s/adm/!/'
root:x:0:0:root:/root:/bin/bash
bin:x:1:1:bin:/bin:/sbin/nologin
daemon:x:2:2:daemon:/sbin:/sbin/nologin
adm:x:3:4:adm:/var/adm:/sbin/nologin
lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin
sync:x:5:0:sync:/sbin:/bin/sync
[root@localhost ~]# head -6 /etc/passwd | sed '1,$s/adm/!/'
root:x:0:0:root:/root:/bin/bash
bin:x:1:1:bin:/bin:/sbin/nologin
daemon:x:2:2:daemon:/sbin:/sbin/nologin
!:x:3:4:adm:/var/adm:/sbin/nologin
lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin
sync:x:5:0:sync:/sbin:/bin/sync
```
```
[root@localhost ~]# head -6 /etc/passwd | sed '/root/s/bash/!/'
root:x:0:0:root:/root:/bin/!
bin:x:1:1:bin:/bin:/sbin/nologin
daemon:x:2:2:daemon:/sbin:/sbin/nologin
adm:x:3:4:adm:/var/adm:/sbin/nologin
lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin
sync:x:5:0:sync:/sbin:/bin/sync
[root@localhost ~]# head -6 /etc/passwd | sed '2s/nologin/!/'
root:x:0:0:root:/root:/bin/bash
bin:x:1:1:bin:/bin:/sbin/!
daemon:x:2:2:daemon:/sbin:/sbin/nologin
adm:x:3:4:adm:/var/adm:/sbin/nologin
lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin
sync:x:5:0:sync:/sbin:/bin/sync
[root@localhost ~]# head -6 /etc/passwd | sed '/^bin/s/nologin/!/'
root:x:0:0:root:/root:/bin/bash
bin:x:1:1:bin:/bin:/sbin/!
daemon:x:2:2:daemon:/sbin:/sbin/nologin
adm:x:3:4:adm:/var/adm:/sbin/nologin
lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin
sync:x:5:0:sync:/sbin:/bin/sync
```
```
[root@localhost ~]# head -6 /etc/passwd | sed '/^bin/,$s/nologin/!/'
root:x:0:0:root:/root:/bin/bash
bin:x:1:1:bin:/bin:/sbin/!
daemon:x:2:2:daemon:/sbin:/sbin/!
adm:x:3:4:adm:/var/adm:/sbin/!
lp:x:4:7:lp:/var/spool/lpd:/sbin/!
sync:x:5:0:sync:/sbin:/bin/sync
[root@localhost ~]# head -6 /etc/passwd | sed '/^bin/,$s/nologin/!/g'
root:x:0:0:root:/root:/bin/bash
bin:x:1:1:bin:/bin:/sbin/!
daemon:x:2:2:daemon:/sbin:/sbin/!
adm:x:3:4:adm:/var/adm:/sbin/!
lp:x:4:7:lp:/var/spool/lpd:/sbin/!
sync:x:5:0:sync:/sbin:/bin/sync
```

#### 分组
1. 寻址可以匹配**多条命令**
2. `/regular/{s/old/new/;s/old/new/}`

#### sed脚本文件
1. 可以将选项保存为文件，使用`-f`加载脚本文件
2. `sed -f sedscript filename`

## 其它指令

### 删除
1. `[寻址]d`
2. 删除**模式空间**的内容，改变脚本的**控制流**，读取新的输入行

```
[root@localhost ~]# cat bfile
b
a
aa
aaa
ab
abb
abbb
[root@localhost ~]# sed '/ab/d' bfile
b
a
aa
aaa
[root@localhost ~]# sed '/ab/d;s/a/!/' bfile
b
!
!a
!aa
[root@localhost ~]# sed '/ab/d;=' bfile
1
b
2
a
3
aa
4
aaa
```

### 追加 插入 更改
1. 追加命令`a`
2. 插入命令`i`
3. 更改命令`c`

```
[root@localhost ~]# cat bfile
b
a
aa
aaa
ab
abb
abbb
[root@localhost ~]# sed '/ab/i hello' bfile
b
a
aa
aaa
hello
ab
hello
abb
hello
abbb
[root@localhost ~]# sed '/ab/a hello' bfile
b
a
aa
aaa
ab
hello
abb
hello
abbb
hello
[root@localhost ~]# sed '/ab/c hello' bfile
b
a
aa
aaa
hello
hello
hello
```

### 读文件和写文件
1. 读文件命令`r`
2. 写文件命令`w`

```
[root@localhost ~]# cat bfile
b
a
aa
aaa
ab
abb
abbb
[root@localhost ~]# cat afile
bb a a
[root@localhost ~]# sed '/ab/r afile' bfile
b
a
aa
aaa
ab
bb a a
abb
bb a a
abbb
bb a a
```

### 打印
1. 打印命令p（直接将**匹配的行**输出，而替换命令的p标志位是将**替换后的模式空间**输出）

```
[root@localhost ~]# cat bfile
b
a
aa
aaa
ab
abb
abbb
[root@localhost ~]# sed '/ab/p' bfile
b
a
aa
aaa
ab
ab
abb
abb
abbb
abbb
[root@localhost ~]# sed -n '/ab/p' bfile
ab
abb
abbb
```

### 下一行
1. 下一行命令`n`
2. 打印行号命令`=`

### 退出
1. 退出命令`q`
2. 哪个效率更高？
    - `sed 10q filename` -- 效率更高
    - `sed -n 1,10p filename` -- 10行后的数据依然会被读入内存，只是不进行匹配

```
[root@localhost ~]# seq 1 1000000 > lines.txt
[root@localhost ~]# wc -l lines.txt
1000000 lines.txt

[root@localhost ~]# time sed -n '1,10p' lines.txt
1
2
3
4
5
6
7
8
9
10

real	0m0.080s
user	0m0.068s
sys	0m0.011s

[root@localhost ~]# time sed -n '10q' lines.txt

real	0m0.002s
user	0m0.002s
sys	0m0.000s
```

## 多行模式空间
1. 使用多行模式的场景
    - XML或JSON格式的配置文件，为多行出现
2. 多行模式处理命令
    - `N`：将下一行**追加**到模式空间
    - `P`：**打印**模式空间中第一个字符到**第一个换行符**
    - `D`：**删除**模式空间中第一个字符到**第一个换行符**
3. **在多行模式中，`.`可以匹配换行符**

```
[root@localhost ~]# cat dfile
hel
lo
[root@localhost ~]# sed 'N' dfile
hel
lo
[root@localhost ~]# sed 'N;s/hello/!!!/' dfile
hel
lo
[root@localhost ~]# sed 'N;s/hel\nlo/!!!/' dfile
!!!
[root@localhost ~]# sed 'N;s/hel.lo/!!!/' dfile
!!!
```

```
[root@localhost ~]# cat > b.txt << EOF
> hell
> o bash hel
> lo bash
> EOF
[root@localhost ~]# cat b.txt
hell
o bash hel
lo bash
[root@localhost ~]# sed 'N;s/\n//;s/hello bash/hello sed\n/;P;D' b.txt
hello sed
 hello sed

[root@localhost ~]#
```

### 保持空间
1. 保持空间是多行的一种操作方式
2. 将内存**暂存在保持空间**，便于做多行处理
3. **保持空间的初始内容是一个换行符**
4. 保持空间命令
   - `h`（覆盖）、`H`（追加）：模式空间 -> 保持空间
   - `g`（覆盖）、`G`（追加）：保持空间 -> 模式空间
   - `x`：保持空间 <-交换-> 模式空间

```
[root@localhost ~]# head -6 /etc/passwd
root:x:0:0:root:/root:/bin/bash
bin:x:1:1:bin:/bin:/sbin/nologin
daemon:x:2:2:daemon:/sbin:/sbin/nologin
adm:x:3:4:adm:/var/adm:/sbin/nologin
lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin
sync:x:5:0:sync:/sbin:/bin/sync
[root@localhost ~]# head -6 /etc/passwd | cat -n
     1	root:x:0:0:root:/root:/bin/bash
     2	bin:x:1:1:bin:/bin:/sbin/nologin
     3	daemon:x:2:2:daemon:/sbin:/sbin/nologin
     4	adm:x:3:4:adm:/var/adm:/sbin/nologin
     5	lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin
     6	sync:x:5:0:sync:/sbin:/bin/sync
[root@localhost ~]# head -6 /etc/passwd | cat -n | tac
     6	sync:x:5:0:sync:/sbin:/bin/sync
     5	lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin
     4	adm:x:3:4:adm:/var/adm:/sbin/nologin
     3	daemon:x:2:2:daemon:/sbin:/sbin/nologin
     2	bin:x:1:1:bin:/bin:/sbin/nologin
     1	root:x:0:0:root:/root:/bin/bash
```
```
[root@localhost ~]# cat -n /etc/passwd | head -6 | sed -n '1h;G;x;$p'
     5	lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin
     4	adm:x:3:4:adm:/var/adm:/sbin/nologin
     3	daemon:x:2:2:daemon:/sbin:/sbin/nologin
     2	bin:x:1:1:bin:/bin:/sbin/nologin
     1	root:x:0:0:root:/root:/bin/bash
     1	root:x:0:0:root:/root:/bin/bash
[root@localhost ~]# cat -n /etc/passwd | head -6 | sed -n '1h;1!G;x;$p'
     5	lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin
     4	adm:x:3:4:adm:/var/adm:/sbin/nologin
     3	daemon:x:2:2:daemon:/sbin:/sbin/nologin
     2	bin:x:1:1:bin:/bin:/sbin/nologin
     1	root:x:0:0:root:/root:/bin/bash
[root@localhost ~]# cat -n /etc/passwd | head -6 | sed -n '1h;1!G;$!x;$p'
     6	sync:x:5:0:sync:/sbin:/bin/sync
     5	lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin
     4	adm:x:3:4:adm:/var/adm:/sbin/nologin
     3	daemon:x:2:2:daemon:/sbin:/sbin/nologin
     2	bin:x:1:1:bin:/bin:/sbin/nologin
     1	root:x:0:0:root:/root:/bin/bash
```
按照保持空间的方式去思考！
```
[root@localhost ~]# cat -n /etc/passwd | head -6 | sed 'G;h'
     1	root:x:0:0:root:/root:/bin/bash

     2	bin:x:1:1:bin:/bin:/sbin/nologin
     1	root:x:0:0:root:/root:/bin/bash

     3	daemon:x:2:2:daemon:/sbin:/sbin/nologin
     2	bin:x:1:1:bin:/bin:/sbin/nologin
     1	root:x:0:0:root:/root:/bin/bash

     4	adm:x:3:4:adm:/var/adm:/sbin/nologin
     3	daemon:x:2:2:daemon:/sbin:/sbin/nologin
     2	bin:x:1:1:bin:/bin:/sbin/nologin
     1	root:x:0:0:root:/root:/bin/bash

     5	lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin
     4	adm:x:3:4:adm:/var/adm:/sbin/nologin
     3	daemon:x:2:2:daemon:/sbin:/sbin/nologin
     2	bin:x:1:1:bin:/bin:/sbin/nologin
     1	root:x:0:0:root:/root:/bin/bash

     6	sync:x:5:0:sync:/sbin:/bin/sync
     5	lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin
     4	adm:x:3:4:adm:/var/adm:/sbin/nologin
     3	daemon:x:2:2:daemon:/sbin:/sbin/nologin
     2	bin:x:1:1:bin:/bin:/sbin/nologin
     1	root:x:0:0:root:/root:/bin/bash

[root@localhost ~]# cat -n /etc/passwd | head -6 | sed -n 'G;h;$p'
     6	sync:x:5:0:sync:/sbin:/bin/sync
     5	lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin
     4	adm:x:3:4:adm:/var/adm:/sbin/nologin
     3	daemon:x:2:2:daemon:/sbin:/sbin/nologin
     2	bin:x:1:1:bin:/bin:/sbin/nologin
     1	root:x:0:0:root:/root:/bin/bash

[root@localhost ~]# cat -n /etc/passwd | head -6 | sed -n '1!G;h;$p'
     6	sync:x:5:0:sync:/sbin:/bin/sync
     5	lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin
     4	adm:x:3:4:adm:/var/adm:/sbin/nologin
     3	daemon:x:2:2:daemon:/sbin:/sbin/nologin
     2	bin:x:1:1:bin:/bin:/sbin/nologin
     1	root:x:0:0:root:/root:/bin/bash
[root@localhost ~]# cat -n /etc/passwd | head -6 | sed '1!G;h;$!d'
     6	sync:x:5:0:sync:/sbin:/bin/sync
     5	lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin
     4	adm:x:3:4:adm:/var/adm:/sbin/nologin
     3	daemon:x:2:2:daemon:/sbin:/sbin/nologin
     2	bin:x:1:1:bin:/bin:/sbin/nologin
     1	root:x:0:0:root:/root:/bin/bash
```

## 参考资料
[Linux实战技能100讲](https://time.geekbang.org/course/intro/100029601)