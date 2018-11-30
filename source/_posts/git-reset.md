---
title: Git++ - Reset
date: 2017-04-17 13:17:28
categories:
    - Git++
tags:
    - Netease
    - Git++
---

{% note info %}
本文主要介绍通过`reset`如何将` HEAD重置到特定的状态`
{% endnote %}

<!-- more -->

# 常见工作流程
<img src="https://git-1253868755.cos.ap-guangzhou.myqcloud.com/pro/normal_workflow.png" width="500">

## 三个区域
`HEAD`：存储在`.git`目录，`上一次提交对象`，下一次提交对象的`父提交对象`
`Index`：存储在`.git`目录，`暂存区域`，用于下一次提交
`Working Directory`：实际的文件

## Working Directory->Index->HEAD
### v1 : touch file.txt
`git init`后尚未有commit，此时`master指向不明确`
```
$ git init

$ touch file.txt

$ gst -sb
## Initial commit on master
?? file.txt
```
<img src="https://git-1253868755.cos.ap-guangzhou.myqcloud.com/pro/touch_file.png" width="500">

### v1 : git add
```
$ git add file.txt

$ gst -sb
## Initial commit on master
A  file.txt
```
<img src="https://git-1253868755.cos.ap-guangzhou.myqcloud.com/pro/git_add_v1.png" width="500">

### v1 : git commit
```
$ git commit -m 'file.txt v1'
[master (root-commit) a5c8857] file.txt v1
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 file.txt

$ gst
On branch master
nothing to commit, working directory clean

$ git branch -vv
* master a5c8857 file.txt v1
```
<img src="https://git-1253868755.cos.ap-guangzhou.myqcloud.com/pro/git_commit_v1.png" width="500">

### v2 : edit file.txt
```
$ echo 'v2' > file.txt

$ gst -sb
## master
 M file.txt

$ git diff # changes between Index and working directory
diff --git a/file.txt b/file.txt
Index e69de29..8c1384d 100644
--- a/file.txt
+++ b/file.txt
@@ -0,0 +1 @@
+v2

$ git diff --cacheed # changes between the Index and your last commit , same for now
```
<img src="https://git-1253868755.cos.ap-guangzhou.myqcloud.com/pro/edit_file_v2.png" width="500">

### v2 : git add
```
$ git add file.txt

$ gst -sb
## master
M  file.txt
```
<img src="https://git-1253868755.cos.ap-guangzhou.myqcloud.com/pro/git_add_v2.png" width="500">

### v2 : git commit
```
$ git commit -m 'file.txt v2'
[master 7806e5f] file.txt v2
 1 file changed, 1 insertion(+)

$ gst -sb
On branch master
nothing to commit, working directory clean

$ git branch -vv
* master 7806e5f file.txt v2
```
<img src="https://git-1253868755.cos.ap-guangzhou.myqcloud.com/pro/git_commit_v2.png" width="500">

## HEAD->Index->Working Directory

### git checkout
1. checkout的**`本质是checkout提交对象`**，将`HEAD`指向分支引用，分支引用再指向该提交对象
2. 将`HEAD`的内容填充`Index`
3. 将`Index`的内容填充`Working Directory`

### git clone
1. 从`origin/master`建立分支`master`，将`HEAD`指向master（一般情况下）
2. 将`HEAD`的内容填充`Index`
3. 将`Index`的内容填充`Working Directory`

# reset
{% note info %}
`reset`可以直接操纵`HEAD`、`Index`、`Working Directory`的状态
{% endnote %}
## 提交历史
```
$ git log --oneline --decorate --graph --all
* 5ed53e1 (HEAD -> master) file.txt v3
* 7806e5f file.txt v2
* a5c8857 file.txt v1
```
<img src="https://git-1253868755.cos.ap-guangzhou.myqcloud.com/pro/git_commit_v3.png" width="500">

## git reset `--soft`
`--soft`：仅移动HEAD的指向，不会改变`Index`和`Working Directory`的内容
```
$ git reset --soft HEAD~

$ gst -sb
## master
M  file.txt

$ git diff # Index on 5ed53e1 , Working Directory on 5ed53e1 , nothing printed

$ git diff --cached # HEAD on 7806e5f , Index on 5ed53e1
diff --git a/file.txt b/file.txt
index 8c1384d..29ef827 100644
--- a/file.txt
+++ b/file.txt
@@ -1 +1 @@
-v2
+v3
```
<img src="https://git-1253868755.cos.ap-guangzhou.myqcloud.com/pro/git_reset_soft.png" width="500">

## git reset `--mixed`
`--mixed`：是reset的`默认行为`，移动HEAD的指向，改变`Index`的内容，但不会改变`Working Directory`的内容
`reset` == `reset --mixed`
```
$ git branch -vv
* master 7806e5f file.txt v2

$ git reflog
7806e5f HEAD@{0}: reset: moving to HEAD~
5ed53e1 HEAD@{1}: commit: file.txt v3
7806e5f HEAD@{2}: commit: file.txt v2
a5c8857 HEAD@{3}: commit (initial): file.txt v1

$ git reset --hard HEAD@{1}
HEAD is now at 5ed53e1 file.txt v3

$ git reset HEAD~
Unstaged changes after reset:
M	file.txt

$ git diff # Index on 7806e5f , Working Directory on 5ed53e1
diff --git a/file.txt b/file.txt
index 8c1384d..29ef827 100644
--- a/file.txt
+++ b/file.txt
@@ -1 +1 @@
-v2
+v3

$ git diff --cached # HEAD on 7806e5f , Index on 7806e5f , nothing printed
```
<img src="https://git-1253868755.cos.ap-guangzhou.myqcloud.com/pro/git_reset_mixed.png" width="500">

## git reset `--hard`
{% note danger %}
`--hard`**直接覆盖**未提交的修改，谨慎使用，可以先`stash`起来（Stash的内容请参照「Git++ - Stash」）
{% endnote %}
```
$ git branch -vv
* master 7806e5f file.txt v2

$ git reflog
7806e5f HEAD@{0}: reset: moving to HEAD~
5ed53e1 HEAD@{1}: reset: moving to HEAD@{1}
7806e5f HEAD@{2}: reset: moving to HEAD~
5ed53e1 HEAD@{3}: commit: file.txt v3
7806e5f HEAD@{4}: commit: file.txt v2
a5c8857 HEAD@{5}: commit (initial): file.txt v1

$ git reset --hard HEAD@{3}
HEAD is now at 5ed53e1 file.txt v3

# git reset --hard HEAD~
HEAD is now at 7806e5f file.txt v2

$ gst
On branch master
nothing to commit, working directory clean

$ git diff # Index on 7806e5f , Working Directory on 7806e5f , nothing printed

$ git diff --cached # HEAD on 7806e5f , Index on 7806e5f , nothing printed
```
<img src="https://git-1253868755.cos.ap-guangzhou.myqcloud.com/pro/git_reset_hard.png" width="500">

## git reset file
`git reset $ref $file`：不移动HEAD，只更新`Index`
等效于：`get reset $ref -- $file`
```
$ git branch -vv
* master 7806e5f file.txt v2

$ git reset --hard 5ed53e1
HEAD is now at 5ed53e1 file.txt v3

$ git reset HEAD~ file.txt # just update Index
Unstaged changes after reset:
M	file.txt

$ gst -sb
## master
MM file.txt

$ git diff # Index on 7806e5f , Working Directory on 5ed53e1
diff --git a/file.txt b/file.txt
index 8c1384d..29ef827 100644
--- a/file.txt
+++ b/file.txt
@@ -1 +1 @@
-v2
+v3

$ git diff --cached # HEAD on 5ed53e1 , Index on 7806e5f
diff --git a/file.txt b/file.txt
index 29ef827..8c1384d 100644
--- a/file.txt
+++ b/file.txt
@@ -1 +1 @@
-v3
+v2
```
<img src="https://git-1253868755.cos.ap-guangzhou.myqcloud.com/pro/git_reset_file.png" width="500">

## 压缩提交
`交互式rebase`也能压缩提交，相关内容请参照「Git++ - 重写提交历史」，如果压缩的提交数量较大，选择`reset --soft`更便捷
```
$ git reset --hard 5ed53e1
HEAD is now at 5ed53e1 file.txt v3

$ git reset --soft HEAD~2

$ git branch -v
* master a5c8857 file.txt v1

$ gst -sb
## master
M  file.txt

$ git diff --cached
diff --git a/file.txt b/file.txt
index e69de29..29ef827 100644
--- a/file.txt
+++ b/file.txt
@@ -0,0 +1 @@
+v3

$ git commit -m 'file.txt v2+v3'
[master 0896cad] file.txt v2+v3
 1 file changed, 1 insertion(+)

$ git log --oneline --decorate --graph --all
* 0896cad (HEAD -> master) file.txt v2+v3
* a5c8857 file.txt v1
```
<img src="https://git-1253868755.cos.ap-guangzhou.myqcloud.com/pro/compress_commit.png" width="500">

# checkout vs reset

## checkout更安全
`checkout`会进行`冲突检查`并`尝试简单合并`，`reset --hard`直接`全面替换`
```
$ git branch -vv
* branchA 3c38e92 b.txt
  branchB 3c38e92 b.txt

$ gst -sb
## branchA
A  a1.txt
?? a2.txt

$ git checkout branchB # a1.txt is staged , auto merge
A	a1.txt
Switched to branch 'branchB'

$ gst -sb
## branchB
A  a1.txt
?? a2.txt

$ git checkout branchA
A	a1.txt
Switched to branch 'branchA'

$ git reset --hard branchB # update HEAD , Index , Working Directory
HEAD is now at 3c38e92 b.txt

$ gst -sb # a1.txt is lost!
## branchA
?? a2.txt
```
```
$ git log --oneline --decorate --graph --all
* a823c74 (dev) dev
* 50a172e (HEAD -> master) init commit

$ echo 'master' > file

$ git diff dev # conflict!!
diff --git a/file b/file
index 38f8e88..1f7391f 100644
--- a/file
+++ b/file
@@ -1 +1 @@
-dev
+master

$ git checkout dev # check conflict
error: Your local changes to the following files would be overwritten by checkout:
	file
Please, commit your changes or stash them before you can switch branches.
Aborting

$ git reset --hard dev # no conflict check
HEAD is now at a823c74 dev

$ cat file
dev
```

## checkout不影响原先分支的指向
`checkout`只是移动`HEAD`，并尝试修改`Index`和`Working Directory`的内容，但不会影响`原先分支的指向`
**`reset`实际上不会移动`HEAD`的指向（`HEAD`->`分支引用`->`提交对象`，为了行文方便，上文将提`分支指向`的变动简单地归结为`HEAD`的移动），但会使得`分支指向不同的提交对象`**
```
$ git log --oneline --decorate --graph --all
* 7f73c2a (HEAD -> dev) echo dev > file
* af4c251 (master) init commit

$ cat .git/HEAD
ref: refs/heads/dev

$ git branch -vv
* dev    7f73c2a echo dev > file
  master af4c251 init commit

$ git checkout master
Switched to branch 'master'

$ cat .git/HEAD
ref: refs/heads/master

$ git branch -vv
  dev    7f73c2a echo dev > file
* master af4c251 init commit # nothing changed

-------------------------------
$ git reset dev
Unstaged changes after reset:
M	file

$ cat .git/HEAD
ref: refs/heads/master

$ git branch -vv
  dev    7f73c2a echo dev > file
* master 7f73c2a echo dev > file # change to 7f73c2a(dev)
```

## ckeout file会更新Working Directory
`checkout $ref $file`：不会移动`HEAD`和`分支指向`，会更新`Index`和`Working Directory`
`reset $ref $file`：不会移动`HEAD`和`分支指向`，也不会更新`Working Directory`，只会会更新`Index`
```
$ git branch -vv
  dev    6bdc578 b.txt
* master 61779da a.txt

$ git checkout dev b.txt # HEAD not changed , update Index and Working Directory

$ gst -sb
## master
A  b.txt

$ git branch -vv
  dev    6bdc578 b.txt
* master 61779da a.txt

$ git reset --hard master
On branch master
nothing to commit, working directory clean

$ git reset dev b.txt # HEAD and Working Directory not changed , update Index

$ git branch -vv
  dev    6bdc578 b.txt
* master 61779da a.txt

$ gst -sb
## master
AD b.txt

$ git diff # Index has b.txt , Working has no b.txt -> delete file
diff --git a/b.txt b/b.txt
deleted file mode 100644
index e69de29..0000000

$ git diff --cached # HEAD has no b.txt , Index has b.txt -> new file
diff --git a/b.txt b/b.txt
new file mode 100644
index 0000000..e69de29
```





<!-- indicate-the-source -->
