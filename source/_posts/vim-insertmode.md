---
title: Vim小记 - 插入模式
date: 2015-11-05 00:06:25
categories:
    - 网易这两年
    - Vim
tags:
    - 网易这两年
    - Vim
---

{% note info %}
本文将介绍`Vim`中的`插入模式`
{% endnote %}

<!-- more -->

# 基础

## 插入模式
`i`：在当前字符的左边插入
`I`：在当前行首插入
`a`：在当前字符的右边插入
`A`：在当前行尾插入
`o`：在当前行下面插入一个新行
`O`：在当前行上面插入一个新行
`c{motion}`：删除 motion 命令跨过的字符，并且进入插入模式
    `c$`：删除从光标位置到行尾的字符并且进入插入模式
    `ct!`：删除从光标位置到下一个叹号（但不包括）
`cc`：剪切当前行并且进入插入模式
`C`：等同于`c$`
`s`：删除光标处字符，并进入插入模式
`S`：删除当前行并进入插入模式，等同于`cc`

## 插入-普通模式
这是普通模式的一个特例，让我们从插入模式执行一次普通模式命令，然后回归插入模式，按键为`<C-o>`

## 替换模式
与插入模式的区别：在替换模式中输入会替换文档中的已有文本
触发命令：`r`，`R`

## 虚拟替换模式（推荐）
把制表符当成一组空格进行处理
假设制表符列宽为8，输入的前7个字符时，每个字符会被插入到制表符之前，当输入第8个字符时，该字符会替换制表符
触发命令：`gr`，`gR`

# 使用样例

## 插入模式中撤销修改
`<C-h>`：删除前一个字符
`<C-w>`：删除前一个单词
`<C-u>`：删除至行首
![insert_mode-ChCwCu.gif](http://ouxz9b8l3.bkt.clouddn.com/insert_mode-ChCwCu.gif)

## 返回普通模式
切换到普通模式：`<Esc>`：不推荐，按键距离比较长；`<C-[>`：推荐，双手协作
切换到插入-普通模式：`<C-o>`
![insert_mode-EscC.gif](http://ouxz9b8l3.bkt.clouddn.com/insert_mode-EscC.gif)

## 粘贴寄存器中的文本
`<C-r>{register}`：将寄存器的内容插入到光标所在的位置，适合粘贴少量的几个单词
`<C-r><C-p>{register}`：按原义插入寄存器内的文本，减少因textwidth或者autoindent选项触发的不必要的换行或缩进，适合大量文本，但不推荐使用，推荐直接使用普通模式的粘贴命令
![insert_mode-Cr0.gif](http://ouxz9b8l3.bkt.clouddn.com/insert_mode-Cr0.gif)

## 表达式寄存器
大部分Vim寄存器保存的都是文本：删除及复制命令允许我们把文本保存到寄存器；粘贴命令允许我们把寄存器中的内容插入到文档里
表达式寄存器`<C-r>=`：执行一段Vim脚本，并返回结果
![insert_mode-Cr=.gif](http://ouxz9b8l3.bkt.clouddn.com/insert_mode-Cr=.gif)


## 插入特殊字符
`ga`：当前光标字符编码（十进制、十六进制、八进制）
`<C-v>{xxx}`：以十进制字符编码插入字符（最多三位）
`<C-v>u{xxxx}`：以十六进制字符编码插入字符（最多四位）
`<C-v>{nondigit}`：按原义插入非数字字符
`<C-k>{char}{char}`：插入以二合字母`{char1}{char2}`表示的字符，例如`<C-k>!=`表示为`≠`

`:h digraph-table`：查看具体的二合字母
![digraph-table.png](http://ouxz9b8l3.bkt.clouddn.com/digraph-table.png)
![insert_mode-CvCk.gif](http://ouxz9b8l3.bkt.clouddn.com/insert_mode-CvCk.gif)

## 替换模式
`r`，`R`：替换模式
`gr`，`gR`虚拟替换模式
为了显示`Tab键`，增加Vim配置:`set list`，`set listchars=tab:>-,trail:-`
![insert_mode-replace_mode.gif](http://ouxz9b8l3.bkt.clouddn.com/insert_mode-replace_mode.gif)

<!-- indicate-the-source -->


