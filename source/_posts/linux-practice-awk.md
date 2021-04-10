---
title: Linux使用 -- awk
mathjax: false
date: 2019-10-23 13:05:42
categories:
    - Linux
    - Practice
tags:
    - Linux
    - Linux Practice
---

## awk sed
1. awk更像是**脚本语言**
2. awk：用于**比较规范**的文本处理，用于**统计**数量并输出指定字段
3. sed：用于将**不规范**的文本，处理为**比较规范**的文本

<!-- more -->

## 控制流程
1. 输入数据前例程**`BEGIN{}`**
2. 主输入循环**`{}`**
3. 所有文件读取完成例程**`END{}`**

## 记录和字段
1. **每行**称为AWK的**记录**
2. 使用**分隔符**（可以**自定义**，默认是**空格**和**制表符**）分隔开的单词称为**字段**

### 字段的引用
1. `$1 $2 ... $n`：表示每一个字段
2. `-F`：自定义分隔符，可以使用正则表达式

```
[root@localhost ~]# awk -F"'" '/^menu/{print $2}' /boot/grub2/grub.cfg
CentOS Linux (3.10.0-1062.el7.x86_64) 7 (Core)
CentOS Linux (0-rescue-6a299ef164734d338007f5e88cee6be0) 7 (Core)

[root@localhost ~]# awk -F"'" '/^menu/{print x++,$2}' /boot/grub2/grub.cfg
0 CentOS Linux (3.10.0-1062.el7.x86_64) 7 (Core)
1 CentOS Linux (0-rescue-6a299ef164734d338007f5e88cee6be0) 7 (Core)
```

## 表达式
1. 赋值操作符
    - `var1 = 'name'`
    - `var2 = 'hello' 'world'`
    - `var3 = $1`
    - `++ -- += -= *= /= %= ^=`
2. 算数操作符
    - `+ - * / % ^`
3. 系统变量
    - `FS`和`OFS`：**字段分隔符**，`OFS`表示输出的字段分隔符
    - `RS`：**记录分隔符**（默认是**换行符**）
    - `NR`和`FNR`：行数
    - `NF`：字段数量，最后一个字段内容可以用`$NF`取出
4. 关系操作符
    - `< > <= >= == != ~ !~`
5. 布尔操作符
    - `&& || !`

```
[root@localhost ~]# head -5 /etc/passwd
root:x:0:0:root:/root:/bin/bash
bin:x:1:1:bin:/bin:/sbin/nologin
daemon:x:2:2:daemon:/sbin:/sbin/nologin
adm:x:3:4:adm:/var/adm:/sbin/nologin
lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin

[root@localhost ~]# head -5 /etc/passwd | awk -F':' '{print $1}'
root
bin
daemon
adm
lp

[root@localhost ~]# head -5 /etc/passwd | awk 'BEGIN{FS=":"}{print $1}'
root
bin
daemon
adm
lp

[root@localhost ~]# head -5 /etc/passwd | awk 'BEGIN{FS=":"}{print $1,$2}'
root x
bin x
daemon x
adm x
lp x

[root@localhost ~]# head -5 /etc/passwd | awk 'BEGIN{FS=":";OFS="-"}{print $1,$2}'
root-x
bin-x
daemon-x
adm-x
lp-x

[root@localhost ~]# head -5 /etc/passwd | awk 'BEGIN{RS=":"}{print $0}' | head -5
root
x
0
0
root
```
```
[root@localhost ~]# head -5 /etc/passwd | awk '{print NR,$0}'
1 root:x:0:0:root:/root:/bin/bash
2 bin:x:1:1:bin:/bin:/sbin/nologin
3 daemon:x:2:2:daemon:/sbin:/sbin/nologin
4 adm:x:3:4:adm:/var/adm:/sbin/nologin
5 lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin

[root@localhost ~]# head -5 /etc/passwd | awk '{print FNR,$0}'
1 root:x:0:0:root:/root:/bin/bash
2 bin:x:1:1:bin:/bin:/sbin/nologin
3 daemon:x:2:2:daemon:/sbin:/sbin/nologin
4 adm:x:3:4:adm:/var/adm:/sbin/nologin
5 lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin

[root@localhost ~]# awk '{print FNR,$0}' /etc/hosts /etc/hosts
1 127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
2 ::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
1 127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
2 ::1         localhost localhost.localdomain localhost6 localhost6.localdomain6

[root@localhost ~]# awk '{print NR,$0}' /etc/hosts /etc/hosts
1 127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
2 ::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
3 127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
4 ::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
```
```
[root@localhost ~]# head -5 /etc/passwd | awk 'BEGIN{FS=":"}{print NF}'
7
7
7
7
7

[root@localhost ~]# head -5 /etc/passwd | awk 'BEGIN{FS=":"}{print $NF}'
/bin/bash
/sbin/nologin
/sbin/nologin
/sbin/nologin
/sbin/nologin
```

## 条件和循环

### 条件
```
if(表达式)
    {awk语句}
[else
    {awk语句}
]
```
```
[root@localhost ~]# cat kpi.txt
user1 70 72 74 76 74 72
user2 80 82 84 82 80 78
user3 60 61 62 63 64 65
user4 90 89 88 87 86 85
user5 45 60 63 62 61 50
[root@localhost ~]# awk '{if($2>=80) print $1}' kpi.txt
user2
user4
[root@localhost ~]# awk '{if($2>=80) {print $1;print $2}}' kpi.txt
user2
80
user4
90
```

### 循环
```
while(表达式)
    {awk语句}

do{
    awk语句
}while(表达式)

for(初始值;循环判断条件;累加)
    {awk语句}
```
```
[root@localhost ~]# cat kpi.txt
user1 70 72 74 76 74 72
user2 80 82 84 82 80 78
user3 60 61 62 63 64 65
user4 90 89 88 87 86 85
user5 45 60 63 62 61 50
[root@localhost ~]# awk '{sum=0; for(i=2;i<=NF;i++) sum+=$i; print $1,sum/(NF-1)}' kpi.txt
user1 73
user2 81
user3 62.5
user4 87.5
user5 56.8333
```

## 数组

### 数组的定义
1. 数组：一组有某种关联的数据（变量），通过下标依次访问
2. `数组名[下标]=值`
    - 下标可以使用**数字**，也可以使用**字符串**

### 数组的遍历
1. `for (变量 in 数组名)`
   - 使用`数组名[变量]`的方式依次对每个数组的元素进行操作

### 删除数组
1. `delete 数组名`
2. `delete 数组名[下标]`

### 命令行参数数组
1. **ARGC**
2. **ARGV**

### 样例
```
[root@localhost ~]# cat kpi.txt
user1 70 72 74 76 74 72
user2 80 82 84 82 80 78
user3 60 61 62 63 64 65
user4 90 89 88 87 86 85
user5 45 60 63 62 61 50
[root@localhost ~]# awk '{sum=0; for(i=2;i<=NF;i++) sum+=$i; avg[$1]=sum/(NF-1)} END{for(user in avg) print user,avg[user]}' kpi.txt
user1 73
user2 81
user3 62.5
user4 87.5
user5 56.8333
[root@localhost ~]# awk '{sum=0; for(i=2;i<=NF;i++) sum+=$i; avg[$1]=sum/(NF-1)} END{for(user in avg) sum2+=avg[user]; print sum2/NR}' kpi.txt
72.1667
```
```
[root@localhost ~]# cat avg.awk
{sum=0; for(i=2;i<=NF;i++) sum+=$i; avg[$1]=sum/(NF-1)} END{for(user in avg) sum2+=avg[user]; print sum2/NR}

[root@localhost ~]# awk -f avg.awk kpi.txt
72.1667
```
```
[root@localhost ~]# cat arg.awk
BEGIN {
    for (x=0;x<ARGC;x++)
        print ARGV[x]
    print ARGC
}

[root@localhost ~]# awk -f arg.awk  11 22 33
awk
11
22
33
4
```
```
[root@localhost ~]# cat result.awk
{
sum = 0;
for (i=2; i<=NF; i++)
    sum += $i
avg[$1] = sum/(NF-1)

if (avg[$1] >= 80)
    letter="S"
else if (avg[$1] >= 70)
    letter="A"
else if (avg[$1] >= 60)
    letter="B"
else
    letter="C"

print $1,avg[$1],letter
letter_all[letter]++
}

END {
for (user in avg)
    sum_all += avg[user]
avg_all =  sum_all/NR
print "avg all",avg_all

for (user in avg)
    if (avg[user] > avg_all)
        above++
    else
        below++

print "above",above
print "below",below

for (l in letter_all)
    print l,letter_all[l]
}

[root@localhost ~]# awk -f result.awk kpi.txt
user1 73 A
user2 81 S
user3 62.5 B
user4 87.5 S
user5 56.8333 C
avg all 72.1667
above 3
below 2
A 1
B 1
C 1
S 2
```

## 函数

### 算术函数
1. `sin() cos()`
2. `int()`
3. `rand() srand()`

```
[root@localhost ~]# awk 'BEGIN{pi=3.14;print int(pi)}'
3
[root@localhost ~]# awk 'BEGIN{print rand()}'
0.237788
[root@localhost ~]# awk 'BEGIN{print rand()}'
0.237788
[root@localhost ~]# awk 'BEGIN{srand();print rand()}'
0.41332
[root@localhost ~]# awk 'BEGIN{srand();print rand()}'
0.388034
```

### 字符串函数
1. `gsub(r,s,t)`
2. `index(s,t)`
3. `length(s)`
4. `match(s,r)`
5. `split(s,a,sep)`
6. `sub(r,s,t)`
7. `substr(s,p,n)`

### 自定义函数
```
function 函数名 (参数) {
    awk语句
    return awk变量
}
```
```
[root@localhost ~]# awk 'function a() {return 0} BEGIN{print a()}'
0
[root@localhost ~]# awk 'function double(str) {return str str} BEGIN{print double("hello awk")}'
hello awkhello awk
```

## 参考资料
[Linux实战技能100讲](https://time.geekbang.org/course/intro/100029601)