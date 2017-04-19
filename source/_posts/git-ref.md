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
本文主要介绍`常见的引用`（commit对象及其祖先的的引用，branch引用，HEAD引用等）和`提交区间`
`commit对象`，`tag对象`的内容请参照「Git++ - 对象」
{% endnote %}

<!-- more -->

# 引用

## commit对象引用

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

## commit对象祖先的引用
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

## branch引用
`update-ref`：更新`引用`
```
$ git log --oneline --decorate --graph --all
* 5a08236 (HEAD -> master) C5
* c532bf8 C4
| * c8910d8 (dev) C3
| * 0a95c28 C2
|/
* 8ce5c36 C1
* 0b2693b C0

$ git update-ref refs/heads/master HEAD~ # update master(5a08236->c532bf8)

$ git log --oneline --decorate --graph --all
* c532bf8 (HEAD -> master) C4
| * c8910d8 (dev) C3
| * 0a95c28 C2
|/
* 8ce5c36 C1
* 0b2693b C0

$ cat .git/refs/heads/master
c532bf878fe12373239698279c8ec797d51235ad

$ git update-ref refs/heads/test dev # create a new branch test on dev(c8910d8)

$ git log --oneline --decorate --graph --all
* c532bf8 (HEAD -> master) C4
| * c8910d8 (test, dev) C3
| * 0a95c28 C2
|/
* 8ce5c36 C1
* 0b2693b C0

$ cat .git/refs/heads/dev
c8910d8b249e4530edfe7c4fc410078da66a187d

$ cat .git/refs/heads/test
c8910d8b249e4530edfe7c4fc410078da66a187d
```

## HEAD引用
`symbolic-ref`：读取、修改或删除`symbolic引用`（`符号引用`）
```
$ git log --oneline --decorate --graph --all
* 5a08236 (HEAD -> master) C5
* c532bf8 C4
| * c8910d8 (test, dev) C3
| * 0a95c28 C2
|/
* 8ce5c36 C1
* 0b2693b C0

$ git symbolic-ref HEA
refs/heads/master

$ cat .git/HEAD
ref: refs/heads/master

$ git symbolic-ref HEAD refs/heads/dev # switch to branch dev

$ cat .git/HEAD
ref: refs/heads/dev

$ git log --oneline --decorate --graph --all
* 5a08236 (master) C5
* c532bf8 C4
| * c8910d8 (HEAD -> dev, test) C3
| * 0a95c28 C2
|/
* 8ce5c36 C1
* 0b2693b C0
```

## HEAD引用历史
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

## tag引用

### lightweight tag引用
```
$ git log --oneline --decorate --graph --all
* 5a08236 (HEAD -> master) C5
* c532bf8 C4
| * c8910d8 (test, dev) C3
| * 0a95c28 C2
|/
* 8ce5c36 C1
* 0b2693b C0

$ git update-ref refs/tags/v1.0 HEAD~ # create lightweight tag

$ git log --oneline --decorate --graph --all
* 5a08236 (HEAD -> master) C5
* c532bf8 (tag: v1.0) C4
| * c8910d8 (test, dev) C3
| * 0a95c28 C2
|/
* 8ce5c36 C1
* 0b2693b C0

$ cat .git/refs/tags/v1.0 # point to a commit object directly
c532bf878fe12373239698279c8ec797d51235ad

$ git cat-file -t c532bf878fe12373239698279c8ec797d51235ad
commit
```
### annotated tag引用
```
$ git log --oneline --decorate --graph --all
* 5a08236 (HEAD -> master) C5
* c532bf8 (tag: v1.0) C4
| * c8910d8 (test, dev) C3
| * 0a95c28 C2
|/
* 8ce5c36 C1
* 0b2693b C0

$ git tag -a v2.0 -m 'tag v2.0' # ceeate annotated tag

$ git log --oneline --decorate --graph --all
* 5a08236 (HEAD -> master, tag: v2.0) C5
* c532bf8 (tag: v1.0) C4
| * c8910d8 (test, dev) C3
| * 0a95c28 C2
|/
* 8ce5c36 C1
* 0b2693b C0

$ cat .git/refs/tags/v2.0 # point to a tag object
9c335494f9fb322d93add8c274f0ef1a632920ea

$ git cat-file -t 9c335494f9fb322d93add8c274f0ef1a632920ea
tag

$ git cat-file -p 9c335494f9fb322d93add8c274f0ef1a632920ea
object 5a0823659a16f3e6aa7caa0a6fc1ee3bebf4112c
type commit
tag v2.0
tagger zhongmingmao <zhongmingmao@yeah.net> 1492609041 +0800
tag v2.0

$ git cat-file -t 5a0823659a16f3e6aa7caa0a6fc1ee3bebf4112c # point to a commit object
commit
```
 
## remote引用
`remote引用`在本地仓库是只读的，`git commit`不会更新`remote引用`，更新发生在`git fetch`和`git pull`执行时
```
$ git remote add hzmajia https://github.com/hzmajia/hzmajia.github.io

$ git remote -v
hzmajia	https://github.com/hzmajia/hzmajia.github.io (fetch)
hzmajia	https://github.com/hzmajia/hzmajia.github.io (push)

$ git fetch hzmajia
warning: no common commits
remote: Counting objects: 145, done.
remote: Compressing objects: 100% (119/119), done.
remote: Total 145 (delta 15), reused 140 (delta 10), pack-reused 0
Receiving objects: 100% (145/145), 531.53 KiB | 496.00 KiB/s, done.
Resolving deltas: 100% (15/15), done.
From https://github.com/hzmajia/hzmajia.github.io
 * [new branch]      blog_source -> hzmajia/blog_source
 * [new branch]      master     -> hzmajia/master

$ git checkout -b hzmajia_master hzmajia/master
Branch hzmajia_master set up to track remote branch master from hzmajia.
Switched to a new branch 'hzmajia_master'

$ cat .git/refs/remotes/hzmajia/master
bce4632694ed70ae303ea2433930afa910f8e800

$ cat .git/refs/heads/hzmajia_master
bce4632694ed70ae303ea2433930afa910f8e800

$ git log --oneline --decorate --graph hzmajia_master
* bce4632 (HEAD -> hzmajia_master, hzmajia/master) Update docs

$ cn=C0 && touch $cn && git add . && git commit -m $cn
[hzmajia_master b6b0e1e] C0
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 C0

$ cat .git/refs/remotes/hzmajia/master # change nothing
bce4632694ed70ae303ea2433930afa910f8e800

$ cat .git/refs/heads/hzmajia_master
b6b0e1e7df4cd830cc399bc201911b632460f7b3

$ git log --oneline --decorate --graph hzmajia_master
* b6b0e1e (HEAD -> hzmajia_master) C0
* bce4632 (hzmajia/master) Update docs
```

### remote引用规格
1. `fetch = +<src>:<dst>`
    - `+`在不能`Fast-Forward Merge`的情况下也强制更新引用
    - `<src>`：`远程版本库中`的引用
    - `<dst>`：`远程引用在本地所对应的位置`
2. `push = +<src>:<dst>`
    - `+`在不能`Fast-Forward Merge`的情况下也强制更新引用
    - `<src>`：`本地版本库中`的引用
    - `<dst>`：`远程版本库中`的引用
  
```
$ git init
Initialized empty Git repository in /home/zhongmingmao/demo/.git/

$ git remote add remote_ref https://github.com/hzmajia/remote_ref.git

$ git remote -v
remote_ref	https://github.com/hzmajia/remote_ref.git (fetch)
remote_ref	https://github.com/hzmajia/remote_ref.git (push)

$ cat .git/config
[core]
	repositoryformatversion = 0
	filemode = true
	bare = false
	logallrefupdates = true
[remote "remote_ref"]
	url = https://github.com/hzmajia/remote_ref.git
	fetch = +refs/heads/*:refs/remotes/remote_ref/*
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


