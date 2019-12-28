---
title: Linux使用 -- Shell
mathjax: false
date: 2019-10-19 11:43:08
categories:
    - Linux
    - Practice
tags:
    - Linux
    - Linux Practice
---

## 转义 + 引用
1. 特殊字符
    - 一个字符不仅有**字面意义**，还有**元意**（meta-meaning）
    - 如`# ; \ " '`
2. 转义
    - `\n \r \t`
    - `\$ \" \\`
3. 引用
    - `"`：**不完全引用**，解析里面的**变量**
    - `'`：**完全引用**，不做任何解析
    - `：运行**命令**

<!-- more -->

```
[root@localhost ~]# echo "$a"

[root@localhost ~]# echo "\$a"
$a
[root@localhost ~]# echo " abc"x"edf "
 abcxedf
[root@localhost ~]# echo " abc\"x\"edf "
 abc"x"edf
```

```
[root@localhost ~]# var1=123
[root@localhost ~]# echo "$var1"
123
[root@localhost ~]# echo '$var'
$var
```

## 运算符
1. 赋值运算符
    - **=**赋值运算符，用于**算数赋值**和**字符串赋值**
    - 使用**unset**取消为变量的赋值
    - **=**还可以作为**测试运算符**
2. 算术运算符
    - `+ - * / ** %`
    - 使用**expr**进行运算，`expr 4 + 5`，只支持**整数**
3. 数字常量
    - `let "变量名=变量值"`
    - 变量值使用**0**开头为八进制
    - 变量值使用**0x**开头为十六进制
4. **双圆括号**（let命令的简化）
    - `(( a=10 ))`
    - `(( a++ ))`
    - `echo $(( 10+20 ))`

```
[root@localhost ~]# expr 4 + 5
9
[root@localhost ~]# expr 4 +5
expr: 语法错误
[root@localhost ~]# expr 4 + 5.0
expr: 非整数参数
[root@localhost ~]# num=`expr 4 + 5`
[root@localhost ~]# echo $num
9
```
```bash
[root@localhost ~]# (( a=4+5 ))
[root@localhost ~]# echo $a
9
# 默认是字符串赋值
[root@localhost ~]# b=4+5
[root@localhost ~]# echo $b
4+5
[root@localhost ~]# (( a++ ))
[root@localhost ~]# echo $a
10
[root@localhost ~]# (( a++ ))
[root@localhost ~]# echo $a
11
```

## 特殊字符

### 引号
1. `'`：完全引用
2. `"`：不完全引用
3. `：执行命令

### 括号
1. **圆括号**：`()`、`(())`、`$()`
   - 单独使用圆括号会产生一个子Shell`(xyz=123)`
   - 数组初始化`IPS=(ip1 ip2 ip3)`
   - 数字常量：`(())`（**let**命令的简写）
   - 运行指令：`$()`
2. **方括号**：`[]`（**test**命令的简写）、`[[]]`
    - 单独使用方括号是测试（**test**）或**数组元素**功能
    - 两个方括号表示**测试表达式**
3. **尖括号**：`< >`
    - 比较符号
    - 重定向符号
4. **花括号**：`{}`
    - 输出范围：`echo {0..9}`
    - 文件复制：`cp /etc/passwd{,.bak}`

```bash
# 产生一个子Shell
[root@localhost ~]# ( abc=123 )
[root@localhost ~]# echo $abc

[root@localhost ~]# ipt=(ip1 ip2 ip3)
[root@localhost ~]# echo ${ipt[@]}
ip1 ip2 ip3
[root@localhost ~]# echo ${#ipt[@]}
3
[root@localhost ~]# echo $(( 10+20 ))
30
[root@localhost ~]# l=$(ls)
[root@localhost ~]# echo $l
10.sh 11.sh 12.sh 13.sh 15.sh 5.sh 6.sh 7.sh 8.sh a.mp4 anaconda-ks.cfg a.sh a.txt b.mp4 b.txt c.mp4 combine.sh error.txt ls.txt subshell.sh
```
```
[root@localhost ~]# [ 5 -gt 4 ]
[root@localhost ~]# echo $?
0
[root@localhost ~]# [ 5 -gt 6 ]
[root@localhost ~]# echo $?
1
[root@localhost ~]# [[ 5 > 4 ]]
[root@localhost ~]# echo $?
0
[root@localhost ~]# [[ 5 < 6 ]]
[root@localhost ~]# echo $?
0
```
```
[root@localhost ~]# echo {0..9}
0 1 2 3 4 5 6 7 8 9
[root@localhost ~]# cp -v /etc/passwd{,.bak}
"/etc/passwd" -> "/etc/passwd.bak"
```

### 运算符号和逻辑符号
1. 算术运算符：`+ - * / %`
2. 比较运算符：`> < =`
3. 逻辑运算符：`&& || !`

```
[root@localhost ~]# (( 5 > 4 ))
[root@localhost ~]# echo $?
0
[root@localhost ~]# (( 5 < 4 ))
[root@localhost ~]# echo $?
1
[root@localhost ~]# (( 5 > 4 && 6 > 5 ))
[root@localhost ~]# echo $?
0
[root@localhost ~]# (( 5 > 4 && 6 < 5 ))
[root@localhost ~]# echo $?
1
[root@localhost ~]# (( 5 > 4 || 6 < 5 ))
[root@localhost ~]# echo $?
0
[root@localhost ~]# (( ! 5 > 4 ))
[root@localhost ~]# echo $?
1
```

### 转义符号
1. 普通字符 -> 具有不同的功能：`\n`
2. 特殊字符 -> 当做普通字符：`\'`

### 其它符号
1. `#`：注释符
2. `;`：命令分隔符
    - **case**语句的分隔符要转义**`;;`**
3. `:`：**空命令**
4. `.`和`source`命令相同
5. `~`：家目录
6. `-`：上一次访问的目录
7. `,`：分隔目录
8. `*`：通配符
9. `?`：条件测试或通配符
10. `$`：取值符号
11. `|`：管道符
12. `&`：后台运行
13. `_`：**空格**

```
[root@localhost ~]# ifdown ens33 ; ifup ens33
成功断开设备 "ens33"。
连接已成功激活（D-Bus 活动路径：/org/freedesktop/NetworkManager/ActiveConnection/3）
```
```
[root@localhost ~]# grep -A10 case /etc/bashrc | head -n 10
    case $TERM in
    xterm*|vte*)
      if [ -e /etc/sysconfig/bash-prompt-xterm ]; then
          PROMPT_COMMAND=/etc/sysconfig/bash-prompt-xterm
      elif [ "${VTE_VERSION:-0}" -ge 3405 ]; then
          PROMPT_COMMAND="__vte_prompt_command"
      else
          PROMPT_COMMAND='printf "\033]0;%s@%s:%s\007" "${USER}" "${HOSTNAME%%.*}" "${PWD/#$HOME/~}"'
      fi
      ;;
```
```bash
# 永远为true，常用于死循环的占位符
[root@localhost ~]# :
[root@localhost ~]# echo $?
0
```
```
[root@localhost ~]# cd /tmp/
[root@localhost tmp]# cd -
/root
[root@localhost ~]# cd -
/tmp
```
```
[root@localhost tmp]# echo {0..9}
0 1 2 3 4 5 6 7 8 9
[root@localhost tmp]# echo { 0..9 }
{ 0..9 }
```

## 测试

### 退出
1. exit 10返回10给Shell，返回值**非0**表示**不正常退出**
2. `$?`：判断当前Shell**前一个进程**是否正常退出

```
[root@localhost ~]# cat 8.sh
#!/bin/bash

pwd
exit 127
[root@localhost ~]# bash 8.sh
/root
[root@localhost ~]# echo $?
127
```

### test
1. test命令用于**检查文件**或者**比较值**
2. test可以做以下测试
    - **文件**测试
    - **整数比较**测试
    - **字符串**测试
3. test命令可以简化为`[]`
4. `[]`的**扩展写法**是`[[]]`，支持`&& || < >`

```
$ man test
...
-z STRING
        the length of STRING is zero
STRING1 = STRING2
        the strings are equal
STRING1 != STRING2
        the strings are not equal

...

INTEGER1 -eq INTEGER2
        INTEGER1 is equal to INTEGER2
INTEGER1 -ge INTEGER2
        INTEGER1 is greater than or equal to INTEGER2
INTEGER1 -gt INTEGER2
        INTEGER1 is greater than INTEGER2
INTEGER1 -le INTEGER2
        INTEGER1 is less than or equal to INTEGER2
INTEGER1 -lt INTEGER2
        INTEGER1 is less than INTEGER2
INTEGER1 -ne INTEGER2
        INTEGER1 is not equal to INTEGER2

...

-d FILE
        FILE exists and is a directory
-e FILE
        FILE exists
-f FILE
        FILE exists and is a regular file
-x FILE
        FILE exists and execute (or search) permission is granted
...
```
```
[root@localhost ~]# test -f /etc/passwd
[root@localhost ~]# echo $?
0
[root@localhost ~]# test -f /etc/passwd1
[root@localhost ~]# echo $?
1
[root@localhost ~]# [ -d /etc ]
[root@localhost ~]# echo $?
0
[root@localhost ~]# [ -e /etc ]
[root@localhost ~]# echo $?
0
[root@localhost ~]# [ -e /etc/passwd ]
[root@localhost ~]# echo $?
0
[root@localhost ~]# [ 5 -gt 4 ]
[root@localhost ~]# echo $?
0
[root@localhost ~]# [[ 5 > 4 ]]
[root@localhost ~]# echo $?
0
[root@localhost ~]# [ "abc" = "abc" ]
[root@localhost ~]# echo $?
0
[root@localhost ~]# [ "abc" = "ABC" ]
[root@localhost ~]# echo $?
1
```

## 判断 + 分支

### if-then
```
[root@localhost ~]# [ $UID = 0 ]
[root@localhost ~]# echo $?
0
[root@localhost ~]# [ $USER = root ]
[root@localhost ~]# echo $?
0
[root@localhost ~]# if [ $UID = 0 ]; then
> echo 'root user'
> fi
root user
[root@localhost ~]# su - zhongmingmao
[zhongmingmao@localhost ~]$ if [ $UID = 0 ]; then echo 'root user'; fi
[zhongmingmao@localhost ~]$ if pwd
> then
>     echo 'pwd running'
> fi
/home/zhongmingmao
pwd running
[zhongmingmao@localhost ~]$ if abc; then     echo 'abc running'; fi
-bash: abc: command not found
[zhongmingmao@localhost ~]$ abc
-bash: abc: command not found
[zhongmingmao@localhost ~]$ echo $?
127
```

### if-then-else
```
[root@localhost ~]# cat 9.sh
#!/bin/bash

if [ $UID = 0 ]; then
    echo 'root user'
else
    echo 'other user'
fi
[root@localhost ~]# bash 9.sh
root user
[root@localhost ~]# cp 9.sh /tmp/
[root@localhost ~]# su - zhongmingmao
[zhongmingmao@localhost ~]$ bash /tmp/9.sh
other user
```

### if-elif-else
```
[root@localhost ~]# cat 10.sh
#!/bin/bash

if [ $USER = root ]; then
    echo 'root user'
elif [ $USER = zhongmingmao ]; then
    echo 'zhongmingmao user'
else
    echo 'other user'
fi
[root@localhost ~]# bash 10.sh
root user
[root@localhost ~]# cp 10.sh /tmp/
[root@localhost ~]# su - zhongmingmao
[zhongmingmao@localhost ~]$ bash /tmp/10.sh
zhongmingmao user
[zhongmingmao@localhost ~]$ su - zhongmingwu
Password:
[zhongmingwu@localhost ~]$ bash /tmp/10.sh
other user
```

### 嵌套if
```
[root@localhost ~]# cat 11.sh
#!/bin/bash

if [ $UID = 0 ]; then
    echo 'please run'
    if [ -e /tmp/10.sh ]; then
        bash /tmp/10.sh
    fi
else
    echo 'please switch to root'
fi
[root@localhost ~]# bash 11.sh
please run
root user
```

### case
```
[root@localhost ~]# cat 12.sh
#!/bin/bash

case "$1" in
    "start")
        echo $0 start...
        ;;
    "stop")
        echo $0 stop...
        ;;
    "restart"|"reload")
        echo $0 restart...
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|reload}"
        ;;
esac
[root@localhost ~]# bash 12.sh start
12.sh start...
[root@localhost ~]# bash 12.sh stop
12.sh stop...
[root@localhost ~]# bash 12.sh restart
12.sh restart...
[root@localhost ~]# bash 12.sh reload
12.sh restart...
[root@localhost ~]# bash 12.sh aaa
Usage: 12.sh {start|stop|restart|reload}
[root@localhost ~]# bash 12.sh
Usage: 12.sh {start|stop|restart|reload}
```

## 循环

### for
1. 遍历**命令的执行结果**
    - 使用**反引号**或`$()`执行命令，命令的结果当做列表进行处理
2. 遍历**变量**和**文件内容**
    - 列表中包含多个变量，变量用**空格**分隔
    - 对文本处理，要用文本查看命令取出文本内容
      - 默认**逐行处理**，如果文本出现**空格**会当做**多行**处理
3. C语言风格（常用于**awk**）
    - Shell**不擅长做数值计算**

```
[root@localhost ~]# echo {1..9}
1 2 3 4 5 6 7 8 9
[root@localhost ~]# for i in {1..9}
> do
>     echo $i
> done
1
2
3
4
5
6
7
8
9
```
```
[root@localhost ~]# touch a.mp3 b.mp3 c.mp3
[root@localhost ~]# for filename in `ls *.mp3`
> do
>     mv $filename $(basename $filename .mp3).mp4
> done
[root@localhost ~]# ls *.mp4
a.mp4  b.mp4  c.mp4
```
```
[root@localhost ~]# for (( i=1; i<=10; i++ ))
> do
>     echo $i
> done
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
```

### while + until
```
[root@localhost ~]# a=1
[root@localhost ~]# while [ $a -lt 10 ]
> do
>     echo $a
>     (( a++ ))
> done
1
2
3
4
5
6
7
8
9
```
```bash
# 死循环
[root@localhost ~]# while :
> do
>     echo `date`
> done
2019年 10月 19日 星期六 20:50:50 CST
2019年 10月 19日 星期六 20:50:50 CST
```
```
[root@localhost ~]# until :; do     echo `date`; done
[root@localhost ~]#
```

### 位置参数
1. `$0`：脚本名称
2. `$1...${10}`：具体的位置参数
3. **`$*`**、**`$@`**：所有的位置参数
4. **`$#`**：位置参数的数量

```
[root@localhost ~]# cat 13.sh
#!/bin/bash

for pos in $*
do
    if [ "$pos" = "help" ]; then
        echo $pos $pos
    fi
done
[root@localhost ~]# bash 13.sh
[root@localhost ~]# bash 13.sh a
[root@localhost ~]# bash 13.sh a help
help help
[root@localhost ~]# bash 13.sh help b
help help
```
```
[root@localhost ~]# cat 13.sh
#!/bin/bash

while [ $# -gt 0 ]
do
    if [ "$1" == "help" ]; then
        echo $1 $1
    fi
    shift # 参数左移
done
[root@localhost ~]# bash 13.sh a
[root@localhost ~]# bash 13.sh a help
help help
[root@localhost ~]# bash 13.sh help b
help help
```

## 函数

### 自定义函数
```
[root@localhost ~]# function cdls() {
> cd /var
> ls
> }
[root@localhost ~]# cdls
14.sh  cache  db     games   kerberos  local  log   nis  preserve  spool  yp
adm    crash  empty  gopher  lib       lock   mail  opt  run       tmp
[root@localhost var]# cdls2() {
> cd /tmp/
> ls
> }
[root@localhost var]# cdls2
10.sh                                                                    vmware-root_700-2730627996
9.sh                                                                     vmware-root_701-3979708482
a.txt                                                                    vmware-root_703-3988031936
date.txt                                                                 vmware-root_704-2990744159
hello.txt                                                                vmware-root_705-4256479617
systemd-private-111840b59ff9417c8b178c56e9ab231b-chronyd.service-daldqM  vmware-root_708-2998936538
vmware-root_694-2688619536                                               vmware-root_709-4248287236
vmware-root_696-2722173465                                               vmware-root_714-2965382611
vmware-root_698-2730496923                                               vmware-root_718-2957190230
vmware-root_699-3979839557                                               yum_save_tx.2019-12-18.17-51.rs2rU4.yumtx
[root@localhost tmp]# unset cdls cdls2
[root@localhost tmp]# cdls
-bash: cdls: 未找到命令
[root@localhost tmp]# cdls2
-bash: cdls2: 未找到命令
```
```
[root@localhost tmp]# cdls() {
> cd $1
> ls
> }
[root@localhost tmp]# cdls /var/
14.sh  cache  db     games   kerberos  local  log   nis  preserve  spool  yp
adm    crash  empty  gopher  lib       lock   mail  opt  run       tmp
```
**local变量**是在**函数作用范围内**的变量，为了避免函数内外**同名变量**的影响
```
[root@localhost ~]# cat 14.sh
#!/bin/bash

checkpid() {
    local i # i很常见，设置为local变量
    for i in $*
    do
        [ -d "/proc/$i" ] && echo $i
    done
}
[root@localhost ~]# source 14.sh
[root@localhost ~]# checkpid 1
1
[root@localhost ~]# checkpid 1 2
1
2
[root@localhost ~]# checkpid 1 2 65534
1
2
```

### 系统脚本
`/etc/init.d/functions`
```
[root@localhost ~]# grep -A9 'echo_success()' /etc/init.d/functions
echo_success() {
    [ "$BOOTUP" = "color" ] && $MOVE_TO_COL
    echo -n "["
    [ "$BOOTUP" = "color" ] && $SETCOLOR_SUCCESS
    echo -n $"  OK  "
    [ "$BOOTUP" = "color" ] && $SETCOLOR_NORMAL
    echo -n "]"
    echo -ne "\r"
    return 0
}
[root@localhost ~]# source /etc/init.d/functions
[root@localhost ~]# echo_success
[root@localhost ~]#                                        [  确定  ]
```
`/etc/profile`
```
[root@localhost ~]# grep -A10 'pathmunge ()' /etc/profile
pathmunge () {
    case ":${PATH}:" in
        *:"$1":*)
            ;;
        *)
            if [ "$2" = "after" ] ; then
                PATH=$PATH:$1
            else
                PATH=$1:$PATH
            fi
    esac
```
`~/.bash_profile` -> `~/.bashrc`
```
[root@localhost ~]# cat ~/.bash_profile
echo ~/.bash_profile
# .bash_profile

# Get the aliases and functions
if [ -f ~/.bashrc ]; then
    . ~/.bashrc
fi

# User specific environment and startup programs

PATH=$PATH:$HOME/bin

export PATH
```
`~/.bashrc` -> `/etc/bashrc`
```
[root@localhost ~]# cat ~/.bashrc
echo ~/.bashrc
# .bashrc

# User specific aliases and functions

alias rm='rm -i'
alias cp='cp -i' 
alias mv='mv -i'

# Source global definitions
if [ -f /etc/bashrc ]; then
    . /etc/bashrc
fi
```