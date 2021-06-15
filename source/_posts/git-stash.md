---
title: Git -- Stash
date: 2017-04-16 13:16:27
categories:
    - Tool
    - Git
tags:
    - Tool
    - Git
---

{% note info %}
本文主要介绍`stash`操作，常用于储藏`未完成的工作`，以免将`脏状态`保存为一个提交
{% endnote %}

<!-- more -->

# git stash
`git stash`：储藏`working directory`和`index`的当前状态（不包括`untracked`文件）
`git stash apply`：仅应用`working directory`的修改，不应用`index`的修改
`git stash list`：stash列表
`git stash drop`：删除stash
```
$ gst -sb
## master
M  a.txt
 M b.txt

$ git stash list # Stdout print nothing

$ git stash # save working directory and index state
Saved working directory and index state WIP on master: 2e5960b add a.txt b.txt
HEAD is now at 2e5960b add a.txt b.txt

$ gst
On branch master
nothing to commit, working directory clean

$ git checkout -b dev

$ git stash list
stash@{0}: WIP on master: 2e5960b add a.txt b.txt

$ git stash apply # default apply stash@{0}

$ gst -sb # only apply working directory
## dev
 M a.txt
 M b.txt

$ git stash drop stash@{0}
Dropped stash@{0} (8ec72e0160fd187bcc90ddcc7066b9b6c22f350c)

$ git stash list # Stdout print nothing

```

# git stash apply `--index`
`git stash apply --index`：应用`working directory`和`index`的修改
```
$ gst -sb
## dev
M  a.txt
 M b.txt

$ git stash
Saved working directory and index state WIP on dev: 2e5960b add a.txt b.txt
HEAD is now at 2e5960b add a.txt b.txt

$ gst
On branch dev
nothing to commit, working directory clean

$ git stash apply --index # apply working directory and index

$ gst -sb
## dev
M  a.txt
 M b.txt
```

# git stash `--keep-index`
`git stash --keep-index`：仅储藏`working directory`的修改，不储藏`index`的修改
```
$ gst -sb
## dev
M  a.txt
 M b.txt

$ git stash --keep-index
Saved working directory and index state WIP on dev: 2e5960b add a.txt b.txt
HEAD is now at 2e5960b add a.txt b.txt

$ gst -sb
## dev
M  a.txt

$ git stash apply

$ gst -sb
## dev
M  a.txt
 M b.txt
```

# git stash -u
`git stash -u`：储藏`untracked`文件
```
$ gst -sb
## dev
M  a.txt
 M b.txt
?? c.txt

$ git stash
Saved working directory and index state WIP on dev: 2e5960b add a.txt b.txt
HEAD is now at 2e5960b add a.txt b.txt

$ gst -sb
## dev
?? c.txt

$ git stash apply

$ gst -sb
## dev
 M a.txt
 M b.txt
?? c.txt

$ git stash -u
Saved working directory and index state WIP on dev: 2e5960b add a.txt b.txt
HEAD is now at 2e5960b add a.txt b.txt

$ gst
On branch dev
nothing to commit, working directory clean
```
<!-- indicate-the-source -->
