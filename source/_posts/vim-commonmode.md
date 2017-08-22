---
title: Vim小记 - 普通模式
date: 2015-11-04 00:06:25
categories:
    - Vim
tags:
    - Netease
    - Vim
---

{% note info %}
本文将介绍`Vim`中的`普通模式`
{% endnote %}

<!-- more -->

# 基础

## 概念
`普通模式（normal mode）`是Vim的`自然放松`状态，也是Vim的`默认模式`
`其他文本编辑器`大部分时间都处于类似Vim`插入模式`的状态中
普通模式之所以强大，主要由于它可以把`操作符`和`动作命令`结合在一起：**`操作 = 操作符 + 动作命令`**

```
:h operator
The motion commands can be used after an operator command, 
to have the command operate on the text that was moved over.
That is the text between the cursor position before and after the motion.
Operators are generally used to delete or change text.
```
	
## 语法规则
`{operator}{motion}`
`{operator}{operator}`（`motion`默认为`当前行`）

## 操作符待决模式
该模式在`调用操作符时被激活`，`只接受动作命令`的状态
```
gg=G

gg：命名空间命令（普通模式的一个扩充），表示移动到首行
=：操作符，表示缩进，激活操作符待决模式
G：动作命令，表示到尾行
```

# 使用样例

## 撤销命令 u
该命令会`撤销最新的修改`
在插入模式中使用光标键（`<Up>`，`<Down>`，`<Left>`，`<Right>`），会产生新的`撤销块`
![common_mode_u.gif](http://ouxz9b8l3.bkt.clouddn.com/common_mode_u.gif)

## 删除一个单词（包括空格） daw
![common_mode_daw.gif](http://ouxz9b8l3.bkt.clouddn.com/common_mode_daw.gif)

## 数字加减 <C-a> <C-x>
`{number}<C-a>`：正向查找第一个数字，并`加`number
`{number}<C-x>`：正向查找第一个数字，并`减`number
`0`开头的数字为`8`进制；`0x`开头的数字为`16`进制

![common_mode_CaCx.gif](http://ouxz9b8l3.bkt.clouddn.com/common_mode_CaCx.gif)

## 作用于当前行{operator}{operator} ： >>，gUU(gUgU)，dd
![common_mode_opertor_opertor.gif](http://ouxz9b8l3.bkt.clouddn.com/common_mode_opertor_opertor.gif)
<!-- indicate-the-source -->


