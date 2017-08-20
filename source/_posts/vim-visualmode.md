---
title: Vim小记 - 可视模式
date: 2015-11-07 00:06:25
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

## 可视模式
Vim的可视模式允许我们选中一块文本区域并在其上进行操作

## 语法规则
与普通模式的语法规则次序颠倒
普通模式的语法规则：`{operator}{motion}`
可视模式的语法规则：先选中选区，再触发可视命令；类似于典型文本编辑器的操作模式

## 选择模式
典型文本编辑器的操作模式：当选中一段文本后，再输入任何可见字符，选择的文本会被删除
可视模式和选择模式相互切换：`<C-g>`
```
:help Select-mode

8. Select mode                                          *Select* *Select-mode*
Select mode looks like Visual mode, but the commands accepted are quite different.  
This resembles the selection mode in Microsoft Windows.
When the 'showmode' option is set, "-- SELECT --" is shown in the last line.
```

## 可视模式的子模式
面向`字符`：任意字符范围，适用于操作单词或短语；触发命令：`v`
面向`行`：触发命令：`V = SHIFT + v`
操作`列块`：触发命令：`<C-v>`
`gv`：重选上次的高亮选区；前提是上次的高亮选区没有被删除

子模式间的切换图
![visual_mode_switch.png](http://ouxz9b8l3.bkt.clouddn.com/visual_mode_switch.png)

# 使用样例

## 切换选区活动端 o
高亮选区的范围由其两个对角的端点界定
![visual_mode-select_area.gif](http://ouxz9b8l3.bkt.clouddn.com/visual_mode-select_area.gif)

## 重复执行面向行的可视命令
使用`命令.`重复低高亮选区所做的修改，此修改会重复作用于相同范围的文本
下列例子采用Vim配置：`set shiftwidth=4 softtabstop=4 expandtab`
![visual_mode-line_point.gif](http://ouxz9b8l3.bkt.clouddn.com/visual_mode-line_point.gif)

## 操作符命令 vs 可视命令
1. 尽量使用操作符命令
	- 我们需要重复修改的时候，最好是使用`命令.`，而`命令.`与`操作符命令`（普通模式）结合得很好
	- `命令.`与可视命令（可视模式）有一些异常情况,具体参照下面的manual（:h visual-repeat）
2. 可视命令的应用场景
	- 一次性的修改任务
	- 需要修改的文本范围的结构很难用普通模式的动作命令表达
3. `vitU` vs `gUit`
	- `it`：表示`标签里面的内容`，文本对象，一种特殊的动作命令；`iw`也是一个文本对象，表示`一个单词`
	- vitU：两条命令，vit + U
	- gUit：单独的命令

```
:h visual-repeat

6. Repeating                                            *visual-repeat*
When repeating a Visual mode operator, the operator will be applied to the same amount 
of text as the last time:
- Linewise Visual mode: The same number of lines.
- Blockwise Visual mode: The same number of lines and columns.
- Normal Visual mode within one line: The same number of characters.
- Normal Visual mode with several lines: The same number of lines, in the last line the 
  same number of characters as in the last line the last time.
```
![visual_mode-commonORvisual.gif](http://ouxz9b8l3.bkt.clouddn.com/visual_mode-commonORvisual.gif)

## 使用面向块的可视模式处理表格（列）
![visual_mode-create_table.gif](http://ouxz9b8l3.bkt.clouddn.com/visual_mode-create_table.gif)

## 修改列文本
![visual_mode-batch_modify_col.gif](http://ouxz9b8l3.bkt.clouddn.com/visual_mode-batch_modify_col.gif)

## 在长短不一的高亮块后添加文本
`a`，`i`：在普通模式：切换至插入模式；在可视模式和操作符待决模式：当做一个文本对象的组成部分，如`viw`，`vit`，`daw`
`A`，`I`：在普通模式、可视模式和操作符待决模式：切换至插入模式
![visual_mode-uneq_len.gif](http://ouxz9b8l3.bkt.clouddn.com/visual_mode-uneq_len.gif)

<!-- indicate-the-source -->


