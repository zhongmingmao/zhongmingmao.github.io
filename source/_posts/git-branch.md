---
title: Git -- 分支
date: 2017-04-15 13:35:44
categories:
    - Tool
    - Git
tags:
    - Tool
    - Git
---

{% note info %} 本文主要介绍一些我在日常开发中与`Git分支`相关的一些操作，通过实例阐述一些基本分支概念
{% endnote %}

<!-- more -->
# 分支的本质

Git分支的本质仅仅只是指向`Commit对象`的`可变指针`

{% note info %} master分支并非一个特殊分支
{% endnote %}

# Merge

## Fast-Forward Merge
当前分支（`HEAD`）指向的`Commit对象`是`待被合并分支`所指向`Commit对象`的**`上游`**，只需要简单地`向前移动HEAD指针`
```
$ git log --oneline --decorate --graph --all
* c4292f7 (hotfix) C4
| * bebf901 (dev) C3
|/
* b17415c (HEAD -> master) C2
* 425fa18 C1
* 1f62295 C0

$ git merge hotfix
Updating b17415c..c4292f7
Fast-forward
 C4 | 0
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 C4

$ git log --oneline --decorate --graph --all
* c4292f7 (HEAD -> master, hotfix) C4 # Master just move forward to hotfix
| * bebf901 (dev) C3
|/
* b17415c C2
* 425fa18 C1
* 1f62295 C0
```

## Recursive Merge
`非上游`时，寻找`最近共同祖先`，做`三方合并`，新建一个`Commit对象`
```
$ git log --oneline --decorate --graph --all
* be69c83 (dev) C5
* bebf901 C3
| * c4292f7 (HEAD -> master) C4 # Merge dev , can not be fast forward
|/
* b17415c C2
* 425fa18 C1
* 1f62295 C0

$ git merge dev  -m 'M1'
Merge made by the 'recursive' strategy. # Recursive merge , create new commit object M1
 C3 | 0
 C5 | 0
 2 files changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 C3
 create mode 100644 C5

$ git log --oneline --decorate --graph --all
*   3226137 (HEAD -> master) M1
|\
| * be69c83 (dev) C5
| * bebf901 C3
* | c4292f7 C4
|/
* b17415c C2
* 425fa18 C1
* 1f62295 C0
```

# Remote Branch
{% note info %} `origin`与`master`一样，并`无特殊含义`，仅仅是Git的默认名称
{% endnote %}

## origin
`origin`：`Remote Repository`的引用
`origin/master`：`Remote Branch`的引用
`master`：`Local Branch`的引用
```
$ git clone https://github.com/hzmajia/demo.git
Cloning into 'demo'...
remote: Counting objects: 3, done.
remote: Total 3 (delta 0), reused 3 (delta 0), pack-reused 0
Unpacking objects: 100% (3/3), done.
Checking connectivity... done.

$ gst
On branch master
Your branch is up-to-date with 'origin/master'. # master auto track origin/master
nothing to commit, working directory clean

$ git log --decorate --graph --oneline
* 7118626 (HEAD -> master, origin/master, origin/HEAD) Add README.md

$ cn=C1 && touch $cn && git add . && git commit -m $cn # master move forward
[master 0b2eae6] C1
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 C1

$ gst
On branch master
Your branch is ahead of 'origin/master' by 1 commit. # master track origin/master
  (use "git push" to publish your local commits)
nothing to commit, working directory clean

$ git log --decorate --graph --oneline
* 0b2eae6 (HEAD -> master) C1
* 7118626 (origin/master, origin/HEAD) Add README.md
```

## git fetch
{% note info %} git fetch仅仅抓取Remote Repository的数据到本地数据库(包括移动相关指针），但并`不会自动合并`数据
{% endnote %}
```
$ git remote -v # Show remote repository
repA	https://github.com/hzmajia/repA.git (fetch)
repA	https://github.com/hzmajia/repA.git (push)
repB	https://github.com/hzmajia/repB.git (fetch)
repB	https://github.com/hzmajia/repB.git (push)

$ git log --decorate --graph --oneline
* 4f8de53 (HEAD -> master, repB/master, repA/master) C1 # All up-to-date By Now
* 51ce03d C0

$ git fetch repA
remote: Counting objects: 2, done.
remote: Compressing objects: 100% (2/2), done.
remote: Total 2 (delta 0), reused 2 (delta 0), pack-reused 0
Unpacking objects: 100% (2/2), done.
From https://github.com/hzmajia/repA
   4f8de53..262e1d5  master     -> repA/master

$ git log --decorate --graph --oneline --all
* 262e1d5 (repA/master) C3 # Move forward , repA/master , local read only
* 4f8de53 (HEAD -> master, repB/master) C1
* 51ce03d C0

$ git fetch repB
remote: Counting objects: 2, done.
remote: Compressing objects: 100% (2/2), done.
remote: Total 2 (delta 0), reused 2 (delta 0), pack-reused 0
Unpacking objects: 100% (2/2), done.
From https://github.com/hzmajia/repB
   4f8de53..54824f8  master     -> repB/master

$ git log --decorate --graph --oneline --all
* 54824f8 (repB/master) C4 # Move forward , repB/master , local read only
| * 262e1d5 (repA/master) C3
|/
* 4f8de53 (HEAD -> master) C1
* 51ce03d C0
```

## track remote branch
{% note info %} 本地分支可以跟踪远程分支，被跟踪的远程分支是本地分支的上游分支（`upstream branch`）
{% endnote %}

### git clone
master自动跟踪repo_name/master
```
$ git clone https://github.com/hzmajia/repA.git
Cloning into 'repA'...
remote: Counting objects: 7, done.
remote: Compressing objects: 100% (5/5), done.
remote: Total 7 (delta 1), reused 6 (delta 0), pack-reused 0
Unpacking objects: 100% (7/7), done.
Checking connectivity... done.

$ git branch -vv # Show upstream branch
* master 262e1d5 [origin/master] C3
```

### git checkout
`-b`：从远程分支创建新分支，`分支名自定义`，并跟踪该远程分支
`--track`：从远程分支创建新分支，`分支名与远程分支一致`，并跟踪该远程分支
```
$ git remote -v
origin	https://github.com/hzmajia/repA.git (fetch)
origin	https://github.com/hzmajia/repA.git (push)

$ git checkout -b branchA origin/master # branchA track origin/master
Branch branchA set up to track remote branch master from origin.
Switched to a new branch 'branchA'

$ git branch -vv
* branchA 262e1d5 [origin/master] C3
  master  262e1d5 [origin/master] C3

$ git checkout --track origin/dev # dev track origin/dev
Branch dev set up to track remote branch dev from origin.
Switched to a new branch 'dev'

$ git branch -vv
  branchA 262e1d5 [origin/master] C3
* dev     262e1d5 [origin/dev] C3
  master  262e1d5 [origin/master] C3
```

### git brach -u
`-u`：修改当前分支的跟踪分支（上游分支）
```
$ gst
On branch dev
Your branch is up-to-date with 'origin/dev'.
nothing to commit, working directory clean

$ git branch -vv
  branchA 262e1d5 [origin/master] C3
* dev     262e1d5 [origin/dev] C3
  master  262e1d5 [origin/master] C3

$ git branch -u origin/master # update upstream branch
Branch dev set up to track remote branch master from origin.

$ git branch -vv
  branchA 262e1d5 [origin/master] C3
* dev     262e1d5 [origin/master] C3
  master  262e1d5 [origin/master] C3
```

## git pull
{% note warning %} 查找当前分支的上游分支，从远程仓库`拉取数据并尝试合并`，推荐使用**`git fetch`+`git merge`**
{% endnote %}
```
$ git branch -vv
* master 7e00be3 [origin/master] C6

$ git branch test

$ git branch -vv
* master 7e00be3 [origin/master] C6
  test   7e00be3 C6

$ git remote -v
origin	https://github.com/hzmajia/repA.git (fetch)
origin	https://github.com/hzmajia/repA.git (push)

$ git log --oneline --graph --decorate --all
* 7e00be3 (HEAD -> master, origin/master, origin/HEAD, test) C6
* 8a1ed87 C5
* 262e1d5 (origin/dev) C3
* 4f8de53 C1
* 51ce03d C0

$ git pull
remote: Counting objects: 2, done. # Fetch data
remote: Compressing objects: 100% (1/1), done.
remote: Total 2 (delta 1), reused 2 (delta 1), pack-reused 0
Unpacking objects: 100% (2/2), done.
From https://github.com/hzmajia/repA
   7e00be3..ae121e2  master     -> origin/master
Updating 7e00be3..ae121e2 # Master auto merge origin/master , test do nothing
Fast-forward
 C7 | 0
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 C7

$ git log --oneline --graph --decorate --all
* ae121e2 (HEAD -> master, origin/master, origin/HEAD) C7
* 7e00be3 (test) C6
* 8a1ed87 C5
* 262e1d5 (origin/dev) C3
* 4f8de53 C1
* 51ce03d C0
```

# Rebase
{% note danger %} `谨慎使用`，适用于尚未push的Commit，rebase`会丢弃现有Commit`，新建Commit，从而使得提交历史更加整洁，我在实际开发中比较少使用，真实记录开发中的提交历史
{% endnote %}

## 原理
`A rebase B`：寻找两者的`最近共同祖先C`，将C到A的一系列Commit按次序应用到B上，生成一系列新的Commit，`对应的Commit Message不变`
```
$ git log --oneline --graph --decorate --all
* 360950a (HEAD -> master) C6
* 7567dc8 C5
| * 7dd1dde (dev) C4
| * 72fec7e C3
|/
* b77035b C2
* 8e4fa74 C1
* e43aa3d C0

$ git rebase dev # create new commit objects 8e15506 0ed259f
First, rewinding head to replay your work on top of it...
Applying: C5
Applying: C6

$ git log --oneline --graph --decorate --all
* 0ed259f (HEAD -> master) C6 # 360950a...0ed259f
* 8e15506 C5 # 7567dc8...8e15506
* 7dd1dde (dev) C4
* 72fec7e C3
* b77035b C2
* 8e4fa74 C1
* e43aa3d C0
```

## 错误样例
{% note danger %} 下例中因为对`已push的Commit`进行rebase，产生了两个C4，令人很疑惑。这是因为rebase默认生成新的Commit，但Commit Message是一致的
{% endnote %}
```
$ git log --oneline --graph --decorate --all
*   b91c74e (HEAD -> master) C6
|\
| * 35cc8be (dev) C5
* | e196df0 C4
|/
* 0e127f0 (origin/master) C1

$ git push origin master
Counting objects: 6, done.
Compressing objects: 100% (6/6), done.
Writing objects: 100% (6/6), 545 bytes | 0 bytes/s, done.
Total 6 (delta 2), reused 0 (delta 0)
remote: Resolving deltas: 100% (2/2), done.
To https://github.com/hzmajia/demo.git
   0e127f0..b91c74e  master -> master

$ git log --oneline --graph --decorate --all
*   b91c74e (HEAD -> master, origin/master) C6
|\
| * 35cc8be (dev) C5
* | e196df0 C4
|/
* 0e127f0 C1

$ git reset --hard HEAD^
HEAD is now at e196df0 C4

$ git log --oneline --graph --decorate --all
*   b91c74e (origin/master) C6
|\
| * 35cc8be (dev) C5
* | e196df0 (HEAD -> master) C4
|/
* 0e127f0 C1

$ git rebase dev # rebase pushed commit , generate 2 C4 in log !!!
First, rewinding head to replay your work on top of it...
Applying: C4

$ git log --oneline --graph --decorate --all
* 4a785d4 (HEAD -> master) C4
| *   b91c74e (origin/master) C6
| |\
| |/
|/|
* | 35cc8be (dev) C5
| * e196df0 C4
|/
* 0e127f0 C1


$ git pull
Merge made by the 'recursive' strategy.

$ git log --oneline --graph --decorate --all
*   a6637b9 (HEAD -> master) Merge branch 'master' of https://github.com/hzmajia/demo
|\
| *   b91c74e (origin/master) C6
| |\
| * | e196df0 C4
* | | 4a785d4 C4
| |/
|/|
* | 35cc8be (dev) C5
|/
* 0e127f0 C1
```

<!-- indicate-the-source -->
