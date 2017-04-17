---
title: Git++ - 引用和提交区间
date: 2017-04-15 18:25:33
categories:
    - 网易这两年
    - Git++
tags:
    - 网易这两年
    - Git++
---

{% note info %}
本文主要介绍`提交对象的引用`、`提交对象祖先的引用`，`HEAD的引用历史`，`提交历史区间`
{% endnote %}

<!-- more -->

# 提交对象引用
`git show`：显示Git对象信息
```
$ git log --oneline --decorate --graph --all
* 4f6c14f (HEAD -> master) add README.md

$ git show --oneline -s 4f6c14f
4f6c14f add README.md

$ git show --oneline -s HEAD
4f6c14f add README.md

$ git show --oneline -s master
4f6c14f add README.md
```

# 提交对象祖先的引用
{% note info %}
在`Fast Forward Merge`中，`只有一个`父提交对象，`第一父提交对象`
在`Recursive Merge`中，合并操作发生时的当前分支所指向的提交对象是`第一父提交对象`，被合并的分支所指向的提交对象是`第二父提交对象`
{% endnote %}
`HEAD^`：HEAD的第一父提交对象
`HEAD^1`：HEAD的第一父提交对象
`HEAD^2`：HEAD的第二父提交对象
`HEAD^^`：HEAD的第一父提交对象的第一父提交对象
`HEAD~`：HEAD的第一父提交对象
`HEAD~2`：HEAD的第一父提交对象的第一父提交对象
`HEAD^2~2`：HEAD的第二父提交对象的第一父提交对象的第一父提交对象（你懂的）
```
$ git log --oneline --decorate --graph --all
*   85a939e (HEAD -> master) M1
|\
| * 187060b (dev) C3
| * 451ee07 C2
* | a13db3c C5
* | ab4285a C4
|/
* 4f543bb C1
* f9d0737 C0

$ git show --oneline -s HEAD^
a13db3c C5

$ git show --oneline -s HEAD^1
a13db3c C5

$ git show --oneline -s HEAD^2
187060b C3

$ git show --oneline -s HEAD^^
ab4285a C4

$ git show --oneline -s HEAD~
a13db3c C5

$ git show --oneline -s HEAD~2
ab4285a C4

$ git show --oneline -s HEAD^2~2
4f543bb C1
```

# HEAD引用历史
{% note warning %}
`git reflog`只存在于本地仓库，记录本地仓库的操作历史
{% endnote %}
`reflog`记录`HEAD`的引用历史，常用于本地`reset --hard`（Reset的内容请参照「Git++ - Reset」）后的回滚操作
```
$ git log --oneline --graph --decorate --all
* a13db3c (HEAD -> master) C5
* ab4285a C4
| * 187060b (dev) C3
| * 451ee07 C2
|/
* 4f543bb C1
* f9d0737 C0

$ git reset --hard HEAD^
HEAD is now at ab4285a C4

$ git log --oneline --graph --decorate --all
* ab4285a (HEAD -> master) C4 # can not find C5
| * 187060b (dev) C3
| * 451ee07 C2
|/
* 4f543bb C1
* f9d0737 C0

$ git reflog # git log -g --oneline
ab4285a HEAD@{0}: reset: moving to HEAD^
a13db3c HEAD@{1}: reset: moving to HEAD^
85a939e HEAD@{2}: merge dev: Merge made by the 'recursive' strategy.
a13db3c HEAD@{3}: reset: moving to HEAD@{1}
ab4285a HEAD@{4}: reset: moving to HEAD^
a13db3c HEAD@{5}: commit: C5
ab4285a HEAD@{6}: commit: C4
4f543bb HEAD@{7}: checkout: moving from dev to master
187060b HEAD@{8}: commit: C3
451ee07 HEAD@{9}: commit: C2
4f543bb HEAD@{10}: checkout: moving from master to dev
4f543bb HEAD@{11}: commit: C1
f9d0737 HEAD@{12}: commit (initial): C0

$ git show --oneline -s HEAD@{5}
a13db3c C5

$ git reset --hard HEAD@{5}
HEAD is now at a13db3c C5

$ git log --oneline --graph --decorate --all
* a13db3c (HEAD -> master) C5
* ab4285a C4
| * 187060b (dev) C3
| * 451ee07 C2
|/
* 4f543bb C1
* f9d0737 C0
```

# 提交区间

## 双点..（最常用）
`branchA..branchB`：在branchB中但不在branchA中提交历史
等效于：`^branchA branchB`或`branchB --not branchA`

```
$ git log --oneline --graph --decorate --all
* a13db3c (HEAD -> master) C5
* ab4285a C4
| * 187060b (dev) C3
| * 451ee07 C2
|/
* 4f543bb C1
* f9d0737 C0

$ git log --oneline --decorate master..dev
187060b (dev) C3
451ee07 C2 

$ git log --oneline --decorate ^master dev
187060b (dev) C3
451ee07 C2

$ git log --oneline --decorate dev --not master
187060b (dev) C3
451ee07 C2

$ git log --oneline --decorate dev..master
a13db3c (HEAD -> master) C5
ab4285a C4
```

## 三点...
`branchA...branchB`：branchA的branchB提交历史的`差集`
```
$ git log --oneline --graph --decorate --all
* a13db3c (HEAD -> master) C5
* ab4285a C4
| * 187060b (dev) C3
| * 451ee07 C2
|/
* 4f543bb C1
* f9d0737 C0

$ git log --oneline --decorate --left-right master...dev
> a13db3c (HEAD -> master) C5
> ab4285a C4
< 187060b (dev) C3
< 451ee07 C2

$ git log --oneline --decorate --left-right dev...master
> a13db3c (HEAD -> master) C5
> ab4285a C4
< 187060b (dev) C3
< 451ee07 C2
```











<!-- indicate-the-source -->


