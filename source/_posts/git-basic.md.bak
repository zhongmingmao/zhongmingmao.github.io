---
title: Git -- 有趣的命令
date: 2017-04-14 13:35:57
categories:
    - Tool
    - Git
tags:
    - Tool
    - Git
---

{% note info %} 本文主要介绍一些我在日常开发中觉得比较有趣的Git`基础命令`
{% endnote %}

<!-- more -->

# 差异对比
日常开发中，差异对比是执行比较频繁的命令
`HEAD`一般指向当前分支的最后一次`Commit`，下面三种是我最常用的差异对比

## git diff
尚未暂存的`Working Tree`与`HEAD`的差异

## git diff --cached
`Index`与`HEAD`的差异
注 ： 别名`git diff --staged`

## git diff HEAD
尚未暂存的`Working Tree` + `Index`与`HEAD`的差异

## 操作实例
```
$ gst -sb
## master

$ ls
README.md

$ echo 'Hello' >> README.md

$ gst -sb
## master
 M README.md

$ git diff
diff --git a/README.md b/README.md
index e69de29..e965047 100644
--- a/README.md
+++ b/README.md
@@ -0,0 +1 @@
+Hello

$ git diff --cached # Stdout print nothing

$ git diff HEAD
diff --git a/README.md b/README.md
index e69de29..e965047 100644
--- a/README.md
+++ b/README.md
@@ -0,0 +1 @@
+Hello

-------------------
$ git add README.md
-------------------

$ gst -sb
## master
M  README.md

$ git diff # Stdout print nothing

$ git diff --cached
diff --git a/README.md b/README.md
index e69de29..e965047 100644
--- a/README.md
+++ b/README.md
@@ -0,0 +1 @@
+Hello

$ git diff HEAD
diff --git a/README.md b/README.md
index e69de29..e965047 100644
--- a/README.md
+++ b/README.md
@@ -0,0 +1 @@
+Hello
```

# 移除版本控制
{% note warning %} `git rm`只会将文件或目录从版本控制中移除，但并不会从以前的提交记录中移除文件或目录
{% endnote %}

## git rm
从`Working Tree`和`Index`中移除
必须进行`up-to-date`检查，如果文件或目录在`Working Tree`或`Index`中的状态与`HEAD`不一致，则执行失败
```
$ gst -sb
## master

$ ls
README.md

$ git rm README.md
rm 'README.md'

$ gst -sb
## master
D  README.md

$ ls # Stdout print nothing

-------------------------------------------------
$ git reset --hard HEAD # Reset HEAD , danger ops
HEAD is now at 03e27f0 init commit
-------------------------------------------------

$ echo 'Hello' > README.md

$ gst -sb
## master
 M README.md

$ git rm README.md
error: the following file has local modifications:
    README.md
(use --cached to keep the file, or -f to force removal)

$ git add README.md

$ gst -sb
## master
M  README.md

$ git rm README.md
error: the following file has local modifications:
    README.md
(use --cached to keep the file, or -f to force removal)

```


## git rm -f
`强制`从`Working Tree`和`Index`中移除，不进行`up-to-date`检查
```
$ gst -sb
## master

$ ls
README.md

$ echo 'Hello' > README.md

$ git add README.md

$ gst -sb
## master
M  README.md

$ git rm -f README.md
rm 'README.md'

$ gst -sb
## master
D  README.md

$ ls # Stdout print nothing
```

## git rm --cached
只从`Index`中移除，保留`Working Tree`中的文件状态
```
$ gst -sb
## master

$ ls
README.md

$ echo 'Hello' > README.md

$ git add README.md

$ gst -sb
## master
M  README.md

$ git rm --cached README.md
rm 'README.md'

$ gst -sb # README从Index删除，但保留在Working Tree中
## master
D  README.md
?? README.md

$ cat README.md
Hello
```

# 重命名
```
$ gst
On branch master
nothing to commit, working tree clean

$ ls
README.md  src

$ find README.md src
README.md
src
src/Hello.java
src/World.java

$ git mv README.md README.md.bak

$ git mv src src.bak

$ git -sb
## master
R  README.md -> README.md.bak
R  src/Hello.java -> src.bak/Hello.java
R  src/World.java -> src.bak/World.java
```

# 查看提交历史

## 常规查看（最常用）
`--graph`：图形化显示分支提交历史
`--oneline`：一个提交显示一行
`--decorate`：显示分支引用
```
$ git log --graph --oneline --decorate
* 807adc2 (HEAD -> master) C8
* 537a716 C7
*   a272a81 M1
|\
| * c94d37d (topic) C4
| * 25737e7 C3
* | 78dd014 C6
* | 92ad9ff C5
|/
* c110877 C2
* 3847d71 C1
```

## 格式化显示
`%h`：Commit对象的简短哈希串
`%t`：Tree对象的简短哈希串
`%p`：父Commit对象的简短哈希串
`%an`：作者名字
`%ae`：作者邮件
`%ad`：修订日期
`%s`：Commit Message
```
$ git log --pretty=format:"%h %t %p %an %s" --graph
* 807adc2 bf5ac3a 537a716 zhongmingmao C8
* 537a716 f2e0d63 a272a81 zhongmingmao C7
*   a272a81 525cbc2 78dd014 c94d37d zhongmingmao M1
|\
| * c94d37d 99248a5 25737e7 zhongmingmao C4
| * 25737e7 cc4ec62 c110877 zhongmingmao C3
* | 78dd014 a2622d9 92ad9ff zhongmingmao C6
* | 92ad9ff 771d565 c110877 zhongmingmao C5
|/
* c110877 e7b3299 3847d71 zhongmingmao C2
* 3847d71 fd092f0  zhongmingmao C1
```

## 提交历史搜索
`--grep`：搜索提交说明
`--author`：匹配作者
`--committer`：匹配提交者
`--after`：时间起点
`--before`：时间终点
`--`：特定路径
```
# 查找条件
$ git log --oneline --decorate --graph --grep=C --author=zhongmingmao  --committer=zhongmingmao \
--after=2017-01-01 --before=2018-01-01 -- .
* 807adc2 (HEAD -> master) C8
* 537a716 C7
* c94d37d (topic) C4
* 25737e7 C3
| * 78dd014 C6
| * 92ad9ff C5
|/
* c110877 C2
* 3847d71 C1
```

# 撤销操作

## 撤销`Commit`

{% note warning %}`git commit --amend `会重新生成新的Commit对象
{% endnote %}

### 修改提交日志
```
$ git log --oneline --decorate --graph
* d12ae38 (HEAD -> master) add README.md

$ gst
On branch master
nothing to commit, working tree clean

$ git commit --amend -m 'amend commit msg' # Create new commit object
[master 4e4145a] amend commit msg
 Date: Fri Apr 14 19:39:45 2017 +0800
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 README.md

$ git log --oneline --decorate --graph
* 4e4145a (HEAD -> master) amend commit msg
```

### 合并修改+修改提交日志
```
$ git log --oneline --decorate --graph
* 9c9ab11 (HEAD -> master) C2
* e1fbcea C1

$ gst -sb
## master
A  C3

$ git commit --amend -m 'C3' # Create new commit object , merge last commit(C2)
[master de41093] C3
 Date: Fri Apr 14 19:48:58 2017 +0800
 2 files changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 C2
 create mode 100644 C3

$ git log --oneline --decorate --graph
* de41093 (HEAD -> master) C3
* e1fbcea C1
```

## 撤销`Index`的修改
{% note info %}`git reset HEAD` == `git reset --mixed HEAD`，用`HEAD`覆盖`Index`
{% endnote %}
```
$ gst -sb
## master
MM C3

$ git diff
diff --git a/C3 b/C3
index f70f10e..35d242b 100644
--- a/C3
+++ b/C3
@@ -1 +1,2 @@
 A
+B

$ git diff --cached
diff --git a/C3 b/C3
index e69de29..f70f10e 100644
--- a/C3
+++ b/C3
@@ -0,0 +1 @@
+A

$ git diff HEAD
diff --git a/C3 b/C3
index e69de29..35d242b 100644
--- a/C3
+++ b/C3
@@ -0,0 +1,2 @@
+A
+B

$ git reset HEAD C3 # Just reset Index , Not Working Tree
Unstaged changes after reset:
M	C3

$ gst -sb
## master
 M C3

$ git diff
diff --git a/C3 b/C3
index e69de29..35d242b 100644
--- a/C3
+++ b/C3
@@ -0,0 +1,2 @@
+A
+B
```

## 撤销`Working Tree`的修改
{% note info %}`git checkout --`，用`Index`覆盖`Working Tree`
{% endnote %}
```
$ gst -sb
## master
MM C3

$ git diff
diff --git a/C3 b/C3
index f70f10e..35d242b 100644
--- a/C3
+++ b/C3
@@ -1 +1,2 @@
 A
+B

$ git checkout -- C3

$ gst -sb
## master
M  C3

$ git diff # Stdout print nothing
```

## 撤销`Index`和`Working Tree`的修改
{% note danger %}`git reset --hard HEAD`，`git checkout HEAD [filename]`是**危险操作**，将会丢失上次Commit后的所有修改，用`HEAD`覆盖`Index`和`Working Tree`
{% endnote %}
```
$ git log --oneline --decorate --graph
de41093 (HEAD -> master) C3
* e1fbcea C1

$ gst -sb
## master
MM C3

$ git reset --hard HEAD
HEAD is now at de41093 C3

$ gst
On branch master
nothing to commit, working tree clean
```

```
$ gst -sb
## master
MM C3

$ git checkout HEAD C3

$ gst
On branch master
nothing to commit, working tree clean
```

<!-- indicate-the-source -->
