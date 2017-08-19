---
title: Vim小记 - 命令.
date: 2015-11-02 00:06:25
categories:
    - 网易这两年
    - Vim
tags:
    - 网易这两年
    - Vim
---

{% note info %}
本文将介绍`Vim`中的`命令.`
{% endnote %}

<!-- more -->

# 基础

## Vim启动命令
```Zsh
# 不加载配置文件，且不启用vi兼容模式
$ vim -u NONE -N
```

## Vim手册
```Zsh
$ man vim
-u {vimrc}      Use the commands in the file {vimrc} for initializations.  
                All the other initializations are skipped.  Use this to edit a special  kind  of  files. 
                It can also be used to skip all initializations by giving the name "NONE". 
                See ":help initialization" within vim for more details.
-N              No-compatible mode.  Reset the 'compatible' option.  This will make Vim behave a bit better,
                but less Vi compatible, even though a .vimrc file does not exist.
```

## 命令.作用
`命令.`会**`重复最近的一次修改`**

# 使用样例

## 普通模式

### 删除一个字符 x
![command_point_x.gif](http://ouxz9b8l3.bkt.clouddn.com/command_point_x.gif)

### 删除一行 dd
![command_point_dd.gif](http://ouxz9b8l3.bkt.clouddn.com/command_point_dd.gif)

### 缩进当前行到文档末尾 SHIFT + > + G
![command_point_x.gif](http://ouxz9b8l3.bkt.clouddn.com/command_point_>G.gif)

## 插入模式

### 添加分号 A + ';'
![command_point_A;.gif](http://ouxz9b8l3.bkt.clouddn.com/command_point_A;.gif)

### 行首添加字符串 I + 'start : ''
![command_point_Istart.gif](http://ouxz9b8l3.bkt.clouddn.com/command_point_Istart.gif)

### 增加一行 o + 'add line'
![command_point_add_line.gif](http://ouxz9b8l3.bkt.clouddn.com/command_point_add_line.gif)

### 截断到行尾 C
![command_point_trunc_line.gif](http://ouxz9b8l3.bkt.clouddn.com/command_point_trunc_line.gif)

### 代码添加空格 f+s空格+空格;
`f{char}`：查找字符
重复查找（推荐使用`n`和`N`，我们经常将`SHIFT`当成`取反`的意思，`N = SHIFT + n`）
`;`或者`n`：`前向`重复上次查找
`,`或者`N`：`反向`向重复上次查找
![command_point_add_codespace.gif](http://ouxz9b8l3.bkt.clouddn.com/command_point_add_codespace.gif)

### 选择性替换 *
![command_point_selectivity_replace.gif](http://ouxz9b8l3.bkt.clouddn.com/command_point_selectivity_replace.gif)

<!-- indicate-the-source -->


