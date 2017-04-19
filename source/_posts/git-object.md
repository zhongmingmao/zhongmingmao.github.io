---
title: Git++ - 对象
date: 2017-04-19 15:12:31
categories:
    - 网易这两年
    - Git++
tags:
    - 网易这两年
    - Git++
---

{% note info %}
TBC
{% endnote %}

<!-- more -->

# .git核心

1. `.git/HEAD`：一般情况下，`指向分支引用`；如果`直接指向提交对象`，将处于`detached HEAD`状态
2. `.git/index`：`暂存区`信息
3. `.git/objects`：`Git对象`数据
4. `.git/refs`：`引用`信息，包括`分支引用`，`标签引用`等

```
$ git log --oneline --decorate --graph --all
* ae432e4 (HEAD -> master) echo master > file
* daa44e8 add file

$ ls .git
branches  COMMIT_EDITMSG  config  description  HEAD  hooks  index  info  logs  objects  ORIG_HEAD  refs  rr-cache

$ cat .git/HEAD
ref: refs/heads/master

$ cat .git/refs/heads/master
ae432e46c21f45991f18eeac8586da367134bff7

$ git checkout HEAD~
Note: checking out 'HEAD~'.
You are in 'detached HEAD' state. You can look around, make experimental
changes and commit them, and you can discard any commits you make in this
state without impacting any branches by performing another checkout.
If you want to create a new branch to retain commits you create, you may
do so (now or later) by using -b with the checkout command again. Example:
  git checkout -b <new-branch-name>
HEAD is now at daa44e8... add file

$ ➦ daa44e8 cat .git/HEAD # ref a commit object , not a branch ref -> 'detached HEAD' state
daa44e833989e82b1f41d12fea5dd391b163bce6

$ ➦ daa44e8 cat .git/refs/heads/master
ae432e46c21f45991f18eeac8586da367134bff7

$ ➦ daa44e8 git checkout master
Previous HEAD position was daa44e8... add file
Switched to branch 'master'

$ $ cat .git/HEAD
ref: refs/heads/master

$ ls .git/objects
08  1f  ae  da  df  e6  info  pack
```

# blob对象
1. `blob对象`：存储**`实际的文件内容`**
2. `hash-object -w`：计算`object ID`，并写入`object database`（即`.git/objects`）
3. `cat-file -p`：显示`Git对象信息`
4. `cat-file -t`：显示`Git对象类型`

```
$ git init
Initialized empty Git repository in /home/zhongmingmao/demo/.git/

$ find .git/objects
.git/objects
.git/objects/info
.git/objects/pack

$ find .git/objects -type f # no objects , stdout printed nothing

$ echo 'zhongmingmao' | git hash-object -w --stdin # write blob object to object database
b98963d686f67040f88c58be271b1ef7541d5ec0

$ git cat-file -p b98963d686f67040f88c58be271b1ef7541d5ec0
zhongmingmao

$ git cat-file -t b98963d686f67040f88c58be271b1ef7541d5ec0
blob

$ echo 'v1' > zhongmingmao.txt

$ git hash-object -w zhongmingmao.txt
626799f0f85326a8c1fc522db584e86cdfccd51f

$ echo 'v2' > zhongmingmao.txt

$ git hash-object -w zhongmingmao.txt
8c1384d825dbbe41309b7dc18ee7991a9085c46e

$ find .git/objects -type f
.git/objects/b9/8963d686f67040f88c58be271b1ef7541d5ec0
.git/objects/62/6799f0f85326a8c1fc522db584e86cdfccd51f
.git/objects/8c/1384d825dbbe41309b7dc18ee7991a9085c46e

$ git cat-file -p 626799f0f85326a8c1fc522db584e86cdfccd51
v1

$ git cat-file -p 8c1384d825dbbe41309b7dc18ee7991a9085c46e
v2

$ git cat-file -t 8c1384d825dbbe41309b7dc18ee7991a9085c46e
blob
```

# tree对象
1. `tree对象`：主要用于**`组织多个文件`**，类似于`目录的作用`
2. `$branch^{tree}`：`分支引用的commit对象`所指向的`tree对象`
3. `update-index`：将文件内容注册到`index`
    - `--add`：将不存在于`index`的文件添加到`index`
    - `--cacheinfo`：将`object database`（`.git/objects`）的文件添加到`index`
4. `write-tree`：将`index`的当前内容创建一个`tree`对象，相当于`保存快照`
5. `read-tree --prefix`：将一个已存在的`tree`对象写入`index`，指定`子目录前缀`

创建第1个tree对象`904970`
```
$ git init
Initialized empty Git repository in /home/zhongmingmao/demo/.git/

$ echo 'v1' > zhongmingmao.txt

$ git hash-object -w zhongmingmao.txt

$ find .git/objects -type f
.git/objects/62/6799f0f85326a8c1fc522db584e86cdfccd51f

$ gst -sb
## Initial commit on master
?? zhongmingmao.txt

# add zhongmingmao.txt(v1) to index from git object database
$ git update-index --add --cacheinfo 100644 626799f0f85326a8c1fc522db584e86cdfccd51f zhongmingmao.txt

$ gst -sb
## Initial commit on master
A  zhongmingmao.txt

$ find .git/objects -type f
.git/objects/62/6799f0f85326a8c1fc522db584e86cdfccd51f

$ git write-tree # create tree object from index
904970fc7917a1f77fff8280298cb54da4bd89c2

$ find .git/objects -type f
.git/objects/62/6799f0f85326a8c1fc522db584e86cdfccd51f
.git/objects/90/4970fc7917a1f77fff8280298cb54da4bd89c2

$ git cat-file -p 904970fc7917a1f77fff8280298cb54da4bd89c2
100644 blob 626799f0f85326a8c1fc522db584e86cdfccd51f zhongmingmao.txt

$ git cat-file -t 904970fc7917a1f77fff8280298cb54da4bd89c2
tree
```
创建第2个tree对象`dec4f9`
```
$ echo 'v2' > zhongmingmao.txt

$ gst -sb
## Initial commit on master
AM zhongmingmao.txt

# replace zhongmingmao.txt(v2) of zhongmingmao(v1) in index from working directory
$ git update-index zhongmingmao.txt 

$ gst -sb
## Initial commit on master
A  zhongmingmao.txt

$ touch README.md

$ git update-index --add README.md # add README.md to index from working diectory

$ gst -sb
## Initial commit on master
A  README.md
A  zhongmingmao.txt

$ git write-tree
dec4f9365e77576c0a95cd1938a50e71a9f7a6b6

$ git cat-file -p dec4f9365e77576c0a95cd1938a50e71a9f7a6b6
100644 blob e69de29bb2d1d6434b8b29ae775ad8c2e48c5391 README.md
100644 blob 8c1384d825dbbe41309b7dc18ee7991a9085c46e zhongmingmao.txt

$ git cat-file -p 8c1384d825dbbe41309b7dc18ee7991a9085c46e
v2
```
创建第3个tree对象`aff674`
```
$ git read-tree --prefix=v1 904970fc7917a1f77fff8280298cb54da4bd89c2 # read tree(904970) to index as subdir 'v1'

$ gst -sb
## Initial commit on master
A  README.md
AD v1/zhongmingmao.txt
A  zhongmingmao.txt

$ git write-tree
aff6742443246bc0e9df32727ce0e5ee27de3b1c

$ git cat-file -p aff6742443246bc0e9df32727ce0e5ee27de3b1c
100644 blob e69de29bb2d1d6434b8b29ae775ad8c2e48c5391 README.md
040000 tree 904970fc7917a1f77fff8280298cb54da4bd89c2 v1
100644 blob 8c1384d825dbbe41309b7dc18ee7991a9085c46e zhongmingmao.txt

$ git checkout -- v1

$ gst -sb
## Initial commit on master
A  README.md
A  v1/zhongmingmao.txt
A  zhongmingmao.txt

$ ls *
README.md  zhongmingmao.txt
v1:
zhongmingmao.txt

$ cat zhongmingmao.txt
v2

$ cat v1/zhongmingmao.txt
v1

$ git commit -m 'init commit'
[master (root-commit) bd32670] init commit
 3 files changed, 2 insertions(+)
 create mode 100644 README.md
 create mode 100644 v1/zhongmingmao.txt
 create mode 100644 zhongmingmao.txt

$ git cat-file -p master^{tree}
100644 blob e69de29bb2d1d6434b8b29ae775ad8c2e48c5391 README.md
040000 tree 904970fc7917a1f77fff8280298cb54da4bd89c2 v1
100644 blob 8c1384d825dbbe41309b7dc18ee7991a9085c46e zhongmingmao.txt

$ git cat-file -p HEAD^{tree}
100644 blob e69de29bb2d1d6434b8b29ae775ad8c2e48c5391 README.md
040000 tree 904970fc7917a1f77fff8280298cb54da4bd89c2 v1
100644 blob 8c1384d825dbbe41309b7dc18ee7991a9085c46e zhongmingmao.txt

$ git cat-file -p bd32670^{tree}
100644 blob e69de29bb2d1d6434b8b29ae775ad8c2e48c5391 README.md
040000 tree 904970fc7917a1f77fff8280298cb54da4bd89c2 v1
100644 blob 8c1384d825dbbe41309b7dc18ee7991a9085c46e zhongmingmao.txt
```
![tree_object](http://oojmieb1c.bkt.clouddn.com/tree_object.png?imageMogr2/auto-orient/thumbnail/400x/blur/1x0/quality/75|watermark/2/text/QHpob25nbWluZ21hbw==/font/Y291cmllciBuZXc=/fontsize/320/fill/IzAwMDAwMA==/dissolve/100/gravity/SouthEast/dx/10/dy/10|imageslim)


# commit对象
1. `commit`对象，指向一个`tree`对象，相当于一个`快照`
2. `commit-tree $tree_object -p $commit_object`：创建提交对象

依次创建3个`tree`对象：`90497`，`dec4f9`，`aff674`
```
$ git init
Initialized empty Git repository in /home/zhongmingmao/demo/.git/

$ echo 'v1' > zhongmingmao.txt

$ git hash-object -w zhongmingmao.txt
626799f0f85326a8c1fc522db584e86cdfccd51f

$ git update-index --add --cacheinfo 100644 626799f0f85326a8c1fc522db584e86cdfccd51f zhongmingmao.txt

$ git write-tree
904970fc7917a1f77fff8280298cb54da4bd89c2

$ echo 'v2' > zhongmingmao.txt

$ git update-index zhongmingmao.txt

$ touch README.md

$ git update-index --add README.md

$  git write-tree
dec4f9365e77576c0a95cd1938a50e71a9f7a6b6

$ git read-tree --prefix=v1 904970fc7917a1f77fff8280298cb54da4bd89c2

$ git checkout -- v1

$ git write-tree
aff6742443246bc0e9df32727ce0e5ee27de3b1c

$ gst -sb
## Initial commit on master
A  README.md
A  v1/zhongmingmao.txt
A  zhongmingmao.txt
```
创建第1个`commit`对象`63dacd`，关于`.git/HEAD`和`.git/refs/heads/master`属于`Git引用`的内容，后续补充
```
$ git commit-tree 904970 -m '1st commit'
63dacdf39138700e82649e7ead745e2a9322d926

$ git cat-file -p 63dacd
tree 904970fc7917a1f77fff8280298cb54da4bd89c2
author zhongmingmao <zhongmingmao@yeah.net> 1492596559 +0800
committer zhongmingmao <zhongmingmao@yeah.net> 1492596559 +0800
1st commit

$ gst -sb
## Initial commit on master
A  README.md
A  v1/zhongmingmao.t

$ cat .git/HEAD
ref: refs/heads/master

$ echo '63dacdf39138700e82649e7ead745e2a9322d926' > .git/refs/heads/master

$ gst -sb
## master
A  README.md
A  v1/zhongmingmao.txt
M  zhongmingmao.txt

$ git diff --cached zhongmingmao.txt
diff --git a/zhongmingmao.txt b/zhongmingmao.txt
index 626799f..8c1384d 100644
--- a/zhongmingmao.txt
+++ b/zhongmingmao.txt
@@ -1 +1 @@
-v1
+v2

$ git log --oneline --decorate --graph --all
* 63dacdf (HEAD -> master) 1st commit
```
创建第2个`commit`对象`1eb9faf`
```
$ git commit-tree dec4f9 -p 63dacdf -m '2nd commit'
1eb9faf3eff1ae9018a223a0a74b9e86ad7f5523

$ echo '1eb9faf3eff1ae9018a223a0a74b9e86ad7f5523' > .git/refs/heads/master

$ gst -sb
## master
A  v1/zhongmingmao.txt

$ git log --oneline --decorate --graph --all
* 1eb9faf (HEAD -> master) 2nd commit
* 63dacdf 1st commit
```
创建第3个`commit`对象`5fbdcc4`
```
$ git commit-tree aff674 -p 1eb9faf -m '3rd commit'
5fbdcc4c76301f9a1c80bdd44ba1c18c1410dc21

$ echo '5fbdcc4c76301f9a1c80bdd44ba1c18c1410dc21' > .git/refs/heads/master

$ gst
On branch master
nothing to commit, working directory clean

$ git log --oneline --decorate --graph --all
* 5fbdcc4 (HEAD -> master) 3rd commit
* 1eb9faf 2nd commit
* 63dacdf 1st commit

$ git cat-file -p 5fbdcc4
tree aff6742443246bc0e9df32727ce0e5ee27de3b1c
parent 1eb9faf3eff1ae9018a223a0a74b9e86ad7f5523
author zhongmingmao <zhongmingmao@yeah.net> 1492597186 +0800
committer zhongmingmao <zhongmingmao@yeah.net> 1492597186 +0800
3rd commit
```
![commit_object](http://oojmieb1c.bkt.clouddn.com/commit_object.png?imageMogr2/auto-orient/thumbnail/501x/blur/1x0/quality/75|watermark/2/text/QHpob25nbWluZ21hbw==/font/Y291cmllciBuZXc=/fontsize/320/fill/IzAwMDAwMA==/dissolve/100/gravity/SouthEast/dx/10/dy/10|imageslim)

# tag对象
{% note info %}
只有`annotated tag`才会创建`tag`对象，`lightweight tag`直接指向`commit`对象
{% endnote %}

## lightweight tag
```
$ git log --oneline --decorate --graph --all
* 5fbdcc4 (HEAD -> master) 3rd commit
* 1eb9faf 2nd commit
* 63dacdf 1st commit

$ git tag v1.0 1eb9faf # just point to a commit object directly , no tag object

$ git log --oneline --decorate --graph --all
* 5fbdcc4 (HEAD -> master) 3rd commit
* 1eb9faf (tag: v1.0) 2nd commit
* 63dacdf 1st commit

$ git show --oneline -s v1.0
1eb9faf 2nd commit

$ cat .git/refs/tags/v1.0
1eb9faf3eff1ae9018a223a0a74b9e86ad7f5523

$ git cat-file -t 1eb9faf3eff1ae9018a223a0a74b9e86ad7f5523
commit 
```

## annotated tag
```
$ git log --oneline --decorate --graph --all
* 5fbdcc4 (HEAD -> master) 3rd commit
* 1eb9faf (tag: v1.0) 2nd commit
* 63dacdf 1st commit

$ git tag -a v2.0 -m 'tag 2.0' # create a annotated tag object which point to a commit object

$ git log --oneline --decorate --graph --all
* 5fbdcc4 (HEAD -> master, tag: v2.0) 3rd commit
* 1eb9faf (tag: v1.0) 2nd commit
* 63dacdf 1st commit

$ git show --oneline -s v2.0
tag v2.0
tag 2.0
5fbdcc4 3rd commit

$ cat .git/refs/tags/v2.0
8a4e71ed97d18b9ad3a83850eef09a2c651e0e01

$ git cat-file -p 8a4e71ed97d18b9ad3a83850eef09a2c651e0e01
object 5fbdcc4c76301f9a1c80bdd44ba1c18c1410dc21
type commit
tag v2.0
tagger zhongmingmao <zhongmingmao@yeah.net> 1492599543 +0800
tag 2.0

$ git cat-file -t 8a4e71ed97d18b9ad3a83850eef09a2c651e0e01
tag

$ git cat-file -t 5fbdcc4c76301f9a1c80bdd44ba1c18c1410dc21
commit
```
![tag_object](http://oojmieb1c.bkt.clouddn.com/tag_object.png?imageMogr2/auto-orient/thumbnail/500x/blur/1x0/quality/75|watermark/2/text/QHpob25nbWluZ21hbw==/font/Y291cmllciBuZXc=/fontsize/320/fill/IzAwMDAwMA==/dissolve/100/gravity/SouthEast/dx/10/dy/10|imageslim)

<!-- indicate-the-source -->


