---
title: Vim小记 - 文件
date: 2015-11-12 00:06:25
categories:
    - 网易这两年
    - Vim
tags:
    - 网易这两年
    - Vim
---

{% note info %}
本文将介绍`Vim`中的`文件`
{% endnote %}

<!-- more -->

# 基础

## 文件、缓冲区和编辑会话
文件：存储在磁盘上
缓冲区：存在于内存中
编辑会话：执行一次vim命令，默认显示第一个文件的缓冲区，其他文件的缓冲区为后台缓冲区

## 缓冲区列表
一次编辑会话可以在多个缓冲区上工作，这多个缓冲区就是缓冲区列表
```
# 展示缓冲区列表
:ls：列出所有被载入到内存中的缓冲区列表
    -：非活动的缓冲区
    a：激活的缓冲区
    h：隐藏的缓冲区
    =：只读的缓冲区
    +：已经修改但尚未写入磁盘的缓冲区
    #：轮换缓冲区，通过<C-^>切换成当前缓冲区
    %：当前缓冲区，通过<C-^>把当前缓冲区切换成轮换缓冲区
    <C-^>：#与%切换

# 遍历缓冲区列表
bp[rev]：上一个缓冲区
bn[ext]：下一个缓冲区
bf[irst]：第一个缓冲区
bl[ast]：最后一个缓冲区
b[uffer] {N}：直接跳转到第{N}个缓冲区，例如:b 3
b[uffer] {bufferName}：{bufferName}是足以唯一标识某一缓冲区的字符序列，可以结合<Tab>自动补全，例如:b c，:b c.txt

# 删除缓冲区（缓冲区编号自动分配，删除缓冲区操作用得很少）
# 删除特定缓冲区 
bd[elete] {N1} {N2} {N3}：删除第{N1}，{N2}，{N3}个缓冲区
bd[elete] {bufferName1} {bufferName2} {bufferName3}，删除标识符为{bufferName1}，{bufferName2}，{bufferName3}的缓冲区
# 删除连续缓冲区
N1,N2 bd[elete]：删除第{N1}到{N2}个缓冲区

# 内置的缓冲区列表缺乏灵活性
```

## 参数列表
vi：记录在启动时作为参数传递给vim的文件列表，例如vi *，参数列表就是当前目录的所有文件
```
:args
[a.txt] b.txt c.txt d.txt e.txt // a.txt为活动文件（即当前可见的缓冲区）

vim：可以在任意时刻改变参数列表的内容，即按你的需求把一组匹配的文件加入到缓冲区列表，相当于一个workspace

:args {fileName1} {fileName2}
    {fileName1}和{fileName2}是具体的文件名
:args {glob1} {glob2}
    {glob1}和{glob2}是Glob模式
    *：匹配0个或多个字符，不递归子目录
    **：匹配0个或多个字符，递归子目录
:args {shellCmd1} {shellCmd2} 
    {shellCmd1} 和 {shellCmd2} 是Shell命令的标准输出
    例如:args cat fileName 
```

## 窗口
缓冲区的显示区域，与缓冲区是多对多的关系
**创建分割窗口**

| 命令 | 用途 |
| --- | --- |
| `<C-w>s` or sp[lit]   | 水平切分当前窗口，新窗口仍显示当前缓冲区 |
| `<C-w>v` or vs[plit]  | 垂直切分当前窗口，新窗口仍显示当前缓冲区 |
| sp[lit] {fileName}  | 水平切分当前窗口，并在新窗口中载入{fileName} |
| vs[plit] {fileName} | 垂直切分当前窗口，并在新窗口中载入{fileName} |

**在窗口间切换**

| 命令 | 用途 |
| --- | --- |
| `<C-w>w`              | 在窗口间循环切换 |
| `<C-w>h`              | 切换到左边的窗口 |
| `<C-w>j`              | 切换到下边的窗口 |
| `<C-w>k`              | 切换到右边的窗口 |
| `<C-w>l`              | 切换到右边的窗口 |

**关闭窗口**

| 命令 | 用途 |
| --- | --- |
| `<C-w>c` or `clo[se]`   | 关闭活动窗口 |
| `<C-w>o` or `on[ly]`    | 只保留活动窗口，关闭其他所有窗口 |

**改变窗口大小**

`<C-w>=`：使所有窗口等宽、等高
`<C-w>_`：最大化活动窗口的高度
`<C-w>|`：最大化活动窗口的宽度
`[N]<C-w>_`：把活动窗口的高度设为[N]行
`[N]<C-w>|`：把活动窗口的宽设为[N]行

## 标签页
可以容纳一系列窗口的容器，类似于Linux的虚拟桌面
**新建标签页**

| 命令 | 用途 |
| --- | --- |
| :tabe[dit] {fileName}       | 在新标签页中打开{fileName}，{fileName}为空，则打开一个空缓冲区 |
| `<C-w>T`                      | 把当前窗口移动到一个新标签页 |

**关闭标签页**

| 命令 | 用途 |
| --- | --- |
| :tabc[lose]                 | 关闭当前标签页及其中的所有窗口 |
| :tabo[nly]                  | 只保留活动标签页，关闭所有其他标签页 |

**切换标签页**

| 命令 | 用途 |
| --- | --- |
| :tabnext {N} or {N}gt       | 切换到编号为{N}的标签页，{N}为空，则切换到下一标签页|
| :tabp[revious] {N} or {N}gT | 切换到上{N}个标签页，{N}为空，则切换到上一标签页 |

**移动标签页**

| 命令 | 用途 |
| --- | --- |
| :tabm[ove] [N]              | [N]为0，当前标签页会被移到开头，[N]为空，当前标签页被移到结尾 | 

`argsdo {ExCmd}`和`bufdo {ExCmd}`：在当前编辑会话中的所有缓冲区上执行`Ex`命令
使用`argsdo`或`bufdo`，请设置`set hidden`
默认情况下，vim不会允许我们从一个改动过但未保存（即缓冲区状态为`+`）的缓冲区切换到其他缓冲区，设置set hidden，相当于：
`:first :{ExCmd} :bnext! :{ExCmd}`


# 使用样例

## 文件路径
```Zsh
app.js
index.html
app/
    controllers/
		Mailer.js
		Main.js
		Navigation.js
	models/
		User.js
	views/
		Home.js
		Main.js
		Settings.js
lib/
	framework.js
	theme.css
```


## 使用参数列表筛选所有的js文件
```
args **/**js
args find . -name '*js'
```
![file_args.gif](http://ouxz9b8l3.bkt.clouddn.com/file_args.gif)

## 窗口的使用
![file_win.gif](http://ouxz9b8l3.bkt.clouddn.com/file_win.gif)

## 标签的使用
![file_tag.gif](http://ouxz9b8l3.bkt.clouddn.com/file_tag.gif)

## :edit命令打开文件
vim的工作目录：执行vim命令的当前目录
相对路径：接受相对工作目录的文件路径
`:edit %<Tab>`：`%`代表活动缓冲区的完整文件路径
`:edit %h<Tab>`：与`:edit %<Tab>`类似，但去除文件名，保留路径中的其他部分
![file_edit.gif](http://ouxz9b8l3.bkt.clouddn.com/file_edit.gif)

## :find命令查找并打开文件
path变量值是:find命令查找的范围，默认值为`.,/usr/include`,
`set path+=./**`：可以将工作目录的所有递归子目录加入到查找的范围
![file_find.gif](http://ouxz9b8l3.bkt.clouddn.com/file_find.gif)

## 保存在不存在的目录
`:!mkdir -p %:h`：创建活动缓冲区的完整路径对应的目录（去除文件名）
![file_mkdir.gif](http://ouxz9b8l3.bkt.clouddn.com/file_mkdir.gif)

## 使用超级管理员权限保存只读权限的文件
`:w !sudo tee % > /dev/null`:使用超级管理员权限保存只读文件
`w !{cmd}`：把当前活动缓冲区的内容作为命令{cmd}的标准输入
`sudo tee % > /dev/null`：使用超级管理员的权限，执行`tee`命令，`%`代表当前活动缓冲区的完整路径，即将`tee`的标准输入（缓冲区内容）覆盖缓存区对应的文件,并且`tee`命令的标准输出不显示（`/dev/null`）
因为要输入密码，所以该例子不显示按键
![file_tee.gif](http://ouxz9b8l3.bkt.clouddn.com/file_tee.gif)

<!-- indicate-the-source -->


