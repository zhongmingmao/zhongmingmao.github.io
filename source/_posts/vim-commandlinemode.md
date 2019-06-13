---
title: Vim -- 命令行模式
date: 2015-11-10 00:06:25
categories:
    - Tool
    - Vim
tags:
    - Vim
---

{% note info %}
本文将介绍`Vim`中的`命令行模式`
{% endnote %}

<!-- more -->

# 基础

## 8种模式
1. 普通模式：Vim的自然放松状态，也是Vim的默认模式；操作符和动作命令结合在一起；操作 = 操作符 + 动作命令
2. 插入模式：与Sublime Text默认模式类似
3. 插入-普通模式：这是普通模式的一个特例，让我们从插入模式执行一次普通模式命令，然后回归插入模式，按键为`<C-o>`
4. 替换模式：与插入模式的区别：在替换模式中输入会替换文档中的已有文本
5. 虚拟替换模式（推荐）：制表符当成一组空格进行处理，假设制表符列宽为8，输入的前7个字符时，每个字符会被插入到制表符之前，当输入第8个字符时，该字符会替换制表符
6. 可视模式：允许我们选中一块文本区域并在其上进行操作；面向字符（v）、面向行（`SHIFT+v`）、面向列（`<C-v>`）
7. 选择模式：与Word和Sublime Text的操作模式类似，当选中一段文本后，再输入任何可见字符，选择的文本会被删除
8. 命令行模式：行编辑器ex是vi的先祖，vim支持Ex命令

## 模式切换
<img src="https://vim-1253868755.cos.ap-guangzhou.myqcloud.com/practical/vim_mode_switch.png" width="500">

## 常用Ex命令
操作缓冲区文本的常用Ex命令（完整列表:h ex-cmd-index）
[range]：连续的行
```
# 行号：{start},{end}{command}
:1p ➔ 打印第一行
:2,5p ➔ 打印第2-5行
:$p ➔ 打印最后一行
:1,$p ➔ 打印全部
:.,$p ➔ 打印当前行到最后一行
:%p ➔ 打印全部

# 位置标记
'm ➔ 包含位置标记m的行
'< ➔ 高亮选区首行
'> ➔ 高亮选区最后一行
:'<,'> ➔ 高亮选区的范围

# 查找模式
:/<html>/,/<\/html>/p ➔ 打印第一个<html>标签和第一个</html>标签之间的内容

# 位置偏移
{address}+n ➔ {address}可以为行号，位置标记，查找模式
```
global：可以是[range]范围内非连续的行

| Ex命令 | 用途 |
| --- | --- |
| :[range]delete [x] | 删除指定范围内的行[到寄存器 x 中] |
| :[range]yank [x] | 复制指定范围的行[到寄存器 x 中] |
| :[line]put [x] | 在指定行后粘贴寄存器 x 中的内容 |
| :[range]copy {address} | 把指定范围内的行拷贝到 {address} 所指定的行之下 |
| :[range]move {address} | 把指定范围内的行移动到 {address} 所指定的行之下 |
| :[range]join | 连接指定范围内的行 |
| :[range]normal {commands} | 对指定范围内的每一行执行普通模式命令 {commands} |
| :[range]substitute/{pattern}/ {string}/[flags] | 把指定范围内出现{pattern}的地方替换为{string} |
| :[range]global/{pattern}/[cmd] | 对指定范围内匹配{pattern}的所有行,在其上执行 Ex 命令{cmd}  |

## Ex命令 vs 普通模式
普通模式一般操作当前字符或当前行，适合"本地"操作
EX命令，可以在任意位置执行，拥有在多行上同时执行的能力，可以远距离操作

# 使用样例

##  复制（:co[py]==:t）和移动(:m[ove])行
<img src="https://vim-1253868755.cos.ap-guangzhou.myqcloud.com/practical/command_mode_copy&move.gif" width="500">

## :normal - 代码行尾添加分号 和 注释代码
在普通模式时介绍过，可以使用`命令.`重复修改，但不适用于有很多行的代码
`:nomal`：将`强大表现力的Vim普通模式命令`和`具有大范围影响力的Ex命令`结合在一起
`Ex命令`结合`命令.`能节省很多按键操作
注释代码（`:%normal i//`）：在执行指定的普通模式命令之前，Vim 会先把光标移动到该行的行首
<img src="https://vim-1253868755.cos.ap-guangzhou.myqcloud.com/practical/command_mode_;comment.gif" width="500">

## 遍历缓冲区列表
同时打开多个文件，会形成缓冲区列表，`bn[ext]`打开下一个缓冲文件，`bp[revious]`打开上一个缓冲文件。
`@:`：重复执行上次Ex命令；
`@@`：重复执行`@:`
`<C-o>`：回退到上一个缓冲文件
<img src="https://vim-1253868755.cos.ap-guangzhou.myqcloud.com/practical/command_mode_@@_bn_bp.gif" width="500">

## Ex命令自动补全
针对zsh的vim配置：`set wildmenu` `set wildmode=full`
正向查找：`<Tab>`，`<Right>`，`<C-n>`
反向查找：`<S-Tab>`，`<Left>`，`<C-p>`
<img src="https://vim-1253868755.cos.ap-guangzhou.myqcloud.com/practical/command_mode_auto_complete.gif" width="500">

## 替换单词
`<C-r><C-w>`：复制光标下的单词并把它插入到命令行中
<img src="https://vim-1253868755.cos.ap-guangzhou.myqcloud.com/practical/command_mode_CrCw.gif" width="500">

## 命令行窗口

命令行模式适用于从头开始构建命令，但在命令行模式中编辑命令的能力有限，而且不能利用历史命令（Ex命令或查找命令），命令行窗口能弥补这两个短处
命令行窗口就像一个常规的Vim缓冲区，只不过内容是命令历史，允许我们使用Vim完整的区分模式的编辑能力来修改历史命令，并可以在活动窗口的上下文中执行命令
```
q: ➔ 打开Ex命令历史的命令行窗口
q/ ➔ 打开查找命令历史的命令行窗口
<C-f> ➔ 从命令行模式切换到命令行窗口，保存原先输入
:q ➔ 退出命令行窗口
<CR> ➔ 在活动窗口上下文执行命令并退出命令行窗口
```

演示例子中，将:w，:%p，:!python3 %在命令行窗口中合成一个命令并执行
<img src="https://vim-1253868755.cos.ap-guangzhou.myqcloud.com/practical/command_mode_cmdwin.gif" width="500">

## 运行Shell命令

`%`：代表当前文件
调用外部命令
```
:shell ➔ 启动一个shell（输入exit返回Vim）
!{cmd} ➔ 在shell中执行{cmd}
:read !{cmd} ➔ 在shell中执行{cmd}，并把其标准输出插入到光标下方
:[range]write !{cmd} ➔ 在shell中执行{cmd}，以[range]作为其标准输入
:[range]!{filter} ➔ 使用外部程序{filter}过滤执行的[range]
    [range]所指定的内容会传递给{cmd}作为标准输入，然后又会用{cmd}的输出覆盖[range]内原本的内容
```

把缓冲区内容作为标准输入和标准输出
<img src="https://vim-1253868755.cos.ap-guangzhou.myqcloud.com/practical/command_mode_shell_in_out.gif" width="500">

过滤缓冲区内容（依据第`2`个字段进行排序）
`:2,$!sort -t ',' -k2`
`!{motion}` ➔ 切换到`命令行`模式，命令行上预设为`.,{motion}!`，即当前行移动`{motion}`的区域
<img src="https://vim-1253868755.cos.ap-guangzhou.myqcloud.com/practical/command_mode_shell_filter.gif" width="500">

<!-- indicate-the-source -->
