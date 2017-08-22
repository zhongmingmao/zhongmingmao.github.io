---
title: Git++ - 合并
date: 2017-04-18 00:28:16
categories:
    - Git++
tags:
    - Netease
    - Git++
---

{% note info %}
本文主要介绍`合并中断`，`查看冲突`，`冲突相关的提交`，`撤销合并`
{% endnote %}

<!-- more -->

# 中断合并
`git merge --abort`：当出现冲突时，`放弃当前合并`，尝试恢复到`合并前的状态`
```
$ git branch -v
  dev    43b3f7b echo dev > file
* master 3f112d7 echo master > file

$ git diff dev # conflict exists
diff --git a/file b/file
index 38f8e88..1f7391f 100644
--- a/file
+++ b/file
@@ -1 +1 @@
-dev
+master

$ git merge dev
Auto-merging file
CONFLICT (content): Merge conflict in file
Automatic merge failed; fix conflicts and then commit the result.

$ gst
On branch master
You have unmerged paths.
  (fix conflicts and run "git commit")
Unmerged paths:
  (use "git add <file>..." to mark resolution)
	both modified:   file
no changes added to commit (use "git add" and/or "git commit -a")

$ git merge --abort

$ gst
On branch master
nothing to commit, working directory clean
```

# 查看冲突
1. `git ls-files -u`：显示`unmerged`的文件，有三个版本
    - `Stage 1`：共同的祖先版本
    - `Stage 2`：自身版本
    - `Stage 3`：MERGE_HEAD版本（将要被合并的版本）
2. `git diff --base`：等效于`git diff`
3. `git diff --ours`：突出ours，等效于`git diff HEAD`
4. `git diff --theirs`：突出theirs，等效于`git diff MERGE_HEAD`

```
$ git branch -v
  dev    43b3f7b echo dev > file
* master 3f112d7 echo master > file

$ git merge dev
Auto-merging file
CONFLICT (content): Merge conflict in file
Automatic merge failed; fix conflicts and then commit the result.

$ gst -sb
## master
UU file

$ git ls-files -u 
100644 e69de29bb2d1d6434b8b29ae775ad8c2e48c5391 1 file
100644 1f7391f92b6a3792204e07e99f71f643cc35e7e1 2 file
100644 38f8e886e1a6d733aa9bfa7282568f83c133ecd6 3 file

$ git show :1:file

$ git show :2:file
master

$ git show :3:file
dev

$ git diff --base
* Unmerged path file
diff --git a/file b/file
index e69de29..0010ca6 100644
--- a/file
+++ b/file
@@ -0,0 +1,5 @@
+<<<<<<< HEAD
+master
+=======
+dev
+>>>>>>> dev

$ git diff --ours
* Unmerged path file
diff --git a/file b/file
index 1f7391f..0010ca6 100644
--- a/file
+++ b/file
@@ -1 +1,5 @@
+<<<<<<< HEAD
 master # highlight
+=======
+dev
+>>>>>>> dev

$ git diff --theirs
* Unmerged path file
diff --git a/file b/file
index 38f8e88..0010ca6 100644
--- a/file
+++ b/file
@@ -1 +1,5 @@
+<<<<<<< HEAD
+master
+=======
 dev # highlight
+>>>>>>> dev
```

# 冲突来源
`git log --merge`：显示`与冲突相关的提交`
```
$ git log --oneline --decorate --graph --all
* f14595d (HEAD -> master) add c.txt
* b69a9be echo master > a.txt
| * 4ffcc97 (dev) add b.txt
| * 6f197c8 echo dev > a.txt
|/
* 51c144f add a.txt

$ git log --oneline --left-right master...dev # see 「Git++ - 引用和提交区间」
< f14595d add c.txt
< b69a9be echo master > a.txt
> 4ffcc97 add b.txt
> 6f197c8 echo dev > a.txt

$ git diff master..dev # conflict exists
diff --git a/a.txt b/a.txt
index 1f7391f..38f8e88 100644
--- a/a.txt
+++ b/a.txt
@@ -1 +1 @@
-master
+dev
diff --git a/b.txt b/b.txt
new file mode 100644
index 0000000..e69de29
diff --git a/c.txt b/c.txt
deleted file mode 100644
index e69de29..0000000

$ git merge dev
Auto-merging a.txt
CONFLICT (content): Merge conflict in a.txt
Recorded preimage for 'a.txt'
Automatic merge failed; fix conflicts and then commit the result.

$ git log --left-right --oneline --merge -p
< b69a9be echo master > a.txt
diff --git a/a.txt b/a.txt
index e69de29..1f7391f 100644
--- a/a.txt
+++ b/a.txt
@@ -0,0 +1 @@
+master
> 6f197c8 echo dev > a.txt
diff --git a/a.txt b/a.txt
index e69de29..38f8e88 100644
--- a/a.txt
+++ b/a.txt
@@ -0,0 +1 @@
+dev
```

# 撤销合并
{% note warning %}
将要介绍`reset`和`revert`这两种方式来`撤销已提交的合并`，请`谨慎使用`，适用于`尚未共享的提交`
{% endnote %}

## reset `--hard`
{% note info %}
相关内容请参照「Git++ - Reset」
{% endnote %}
```
$ git log --oneline --decorate --graph --all
*   7a18228 (HEAD -> master) M1
|\
| * c446a31 (dev) C3
| * 8e12eb6 C2
* | bc8551b C5
* | 220958f C4
|/
* 4d8ef47 C1
* 0c1d26b C0

$ git reset --hard HEAD~
HEAD is now at bc8551b C5

$ git log --oneline --decorate --graph --all
* bc8551b (HEAD -> master) C5
* 220958f C4
| * c446a31 (dev) C3
| * 8e12eb6 C2
|/
* 4d8ef47 C1
* 0c1d26b C0
```

## revert
{% note warning %}
当提交对象是`普通提交对象`C1时，新建提交对象C2，还原C1的修改
当提交对象是`合并提交对象`是C1，新建提交对象C2，`保留其中一个父提交对象`P1，还原`其他父提交对象`的修改
`revert后再次merge`，有可能出现`Already up-to-date`，因为在当前提交对象能回溯到相关的提交。如果想再次合并之前放弃掉的父提交对象的修改，可以再次执行`revert`或直接`reset --hard`
{% endnote %}
`revert -m`：保留父提交对象，`1`代表第一父提交对象，`2`代表第二提交对象
```
$ git log --oneline --decorate --graph --all
*   f16d507 (HEAD -> master) M1
|\
| * c446a31 (dev) C3
| * 8e12eb6 C2
* | bc8551b C5
* | 220958f C4
|/
* 4d8ef47 C1
* 0c1d26b C0

$ ls 
C0  C1  C4  C5

$ git revert -m 1 HEAD # keep C5 , give up C3
[master bc96ef3] Revert "M1" -m 1
 2 files changed, 0 insertions(+), 0 deletions(-)
 delete mode 100644 C2
 delete mode 100644 C3

$ git log --oneline --decorate --graph --all
* bc96ef3 (HEAD -> master) Revert "M1" -m 1
*   f16d507 M1
|\
| * c446a31 (dev) C3
| * 8e12eb6 C2
* | bc8551b C5
* | 220958f C4
|/
* 4d8ef47 C1
* 0c1d26b C0

$ ls # as same as C5
C0  C1  C4  C5

$ git merge dev # can track C2 C3
Already up-to-date.
```
`dev`上新增提交`C6`，`master merge dev`不会出现`C2`和`C3`，因为本质是`bc96ef3 merge 105cf17`
```
$ git checkout dev
Switched to branch 'dev'

$ cn=C6 && touch $cn && git add . && git commit -m $cn
[dev 105cf17] C6
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 C6
 
$ git checkout master
Switched to branch 'master'

$ git merge dev -m 'M2'
Merge made by the 'recursive' strategy.
 C6 | 0
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 C6
 
$ git log --oneline --decorate --graph --all
*   f58ffc1 (HEAD -> master) M2
|\
| * 105cf17 (dev) C6
* | bc96ef3 Revert "M1" -m 1
* |   f16d507 M1
|\ \
| |/
| * c446a31 C3
| * 8e12eb6 C2
* | bc8551b C5
* | 220958f C4
|/
* 4d8ef47 C1
* 0c1d26b C0

$ ls # C2 C3 lost!!
C0  C1  C4  C5  C6
```
如果想再次复现`C2`和`C3`的修改，可以`revert bc96ef3`或者`reset --hard f16d507`，注意这些提交对象应该都是`没有被共享`的
```
$ git reset --hard HEAD^^
HEAD is now at f16d507 M1

$ git merge dev -m 'M2'
Merge made by the 'recursive' strategy.
 C6 | 0
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 C6
 
$ git log --oneline --decorate --graph --all
*   ea0507c (HEAD -> master) M2
|\
| * 105cf17 (dev) C6
* |   f16d507 M1
|\ \
| |/
| * c446a31 C3
| * 8e12eb6 C2
* | bc8551b C5
* | 220958f C4
|/
* 4d8ef47 C1
* 0c1d26b C0

$ ls
C0  C1  C2  C3  C4  C5  C6
```



<!-- more -->
<!-- indicate-the-source -->


