---
title: Git++ - 重写提交历史
date: 2017-04-17 13:17:03
categories:
    - Git++
tags:
    - Git++
---

{% note danger %}
本文将通过介绍通过`rebase`和`filter-branch`重写提交历史，但两者都会`新建`提交对象，`谨慎使用`，尤其是提交历史已共享的情况下
{% endnote %}

<!-- more -->

# 交互式rebase
`git rebase -i`，基于某个提交对象开始，通过交互的方式，依次进行rebase
Rebase的内容请参照「Git++ - 分支」
```
$ git log --oneline --decorate --graph --all
* 3b1df9b (HEAD -> master) C4
* bed6252 C3
* 2b17907 C2
* 4c02e18 C1
* b71fde1 C0

$ git rebase -i HEAD~3 # rebase onto (4c02e18 C1)
reword 2b17907 C2 # edited
reword bed6252 C3 # edited
pick 3b1df9b C4
# Rebase 4c02e18..3b1df9b onto 4c02e18 (3 command(s))
#
# Commands:
# p, pick = use commit
# r, reword = use commit, but edit the commit message
# e, edit = use commit, but stop for amending
# s, squash = use commit, but meld into previous commit
# f, fixup = like "squash", but discard this commit's log message
# x, exec = run command (the rest of the line) using shell
# d, drop = remove commit

# git log --oneline --decorate --graph --all
* b9fd388 (HEAD -> master) C4 # pick
* 85f9b7c C3 Rebase # reword
* e9c0fc9 C2 Rebase # reword
* 4c02e18 C1
* b71fde1 C0
```

# 重排序提交历史
```
$ git log --oneline --decorate --graph --all
* 3b1df9b (HEAD -> master) C4
* bed6252 C3
* 2b17907 C2
* 4c02e18 C1
* b71fde1 C0

$ git rebase -i HEAD~3
pick bed6252 C3 # reorder commit
pick 2b17907 C2 # reorder commit
pick 3b1df9b C4

$ git log --oneline --decorate --graph --all
* 9eaefb4 (HEAD -> master) C4
* 6619b76 C2
* 76da537 C3
* 4c02e18 C1
* b71fde1 C0
```

# 压缩提交历史
```
$ git log --oneline --decorate --graph --all
* 3b1df9b (HEAD -> master) C4
* bed6252 C3
* 2b17907 C2
* 4c02e18 C1
* b71fde1 C0

$ git rebase -i HEAD~3
pick 2b17907 C2
squash bed6252 C3 # meld into previous commit
squash 3b1df9b C4 # meld into previous commit

$ git log --oneline --decorate --graph --all
* 59e3d09 (HEAD -> master) C2+C3+C4
* 4c02e18 C1
* b71fde1 C0
```

# 拆分提交
`git reset HEAD^`：reset `HEAD`和`index`，Reset的内容请参照「Git++ - Reset」
```
$ git log --oneline --decorate --graph --all
* dbd7f9d (HEAD -> master) C4
* c0264a4 C2+C3
* 4c02e18 C1
* b71fde1 C0

$ git rebase -i HEAD~2
edit c0264a4 C2+C3
pick dbd7f9d C4

$ ➦ c0264a4 >R> gst # oh_my_zsh theme(agnoster) : '>R>' means interactive rebase status
interactive rebase in progress; onto 4c02e18
Last command done (1 command done):
   edit c0264a4 C2+C3
Next command to do (1 remaining command):
   pick dbd7f9d C4

$ ➦ c0264a4 >R> git reset HEAD^ # git reset --mixed HEAD^ , reset HEAD and index

$ ➦ 4c02e18 >R> gst -s
?? C2
?? C3

$ ➦ 4c02e18 >R> git add C2 && git commit -m 'C2'

$ ➦ 45fa04d >R> git add C3 && git commit -m 'C3'

$ ➦ a1560a7 >R> git rebase --continue

$ git log --oneline --decorate --graph --all
* d636f99 (HEAD -> master) C4
* a1560a7 C3
* 45fa04d C2
* 4c02e18 C1
* b71fde1 C0
```

# 移除文件
{% note danger %}
`filter-branch`会大量`重写提交历史`，`谨慎使用`
{% endnote %}
`--tree-filter`：checkout当前分支（所有分支，`--all`）的每一个提交，执行命令后，重新提交，但`原始的提交历史依旧存在`
```
$ git log --oneline --decorate --graph --all
* ed0bdf0 (HEAD -> master) C6
| * 935d3f9 (dev) C5
|/
* 2fd6776 C4
* 8955126 C3
* cd003e0 C2
* 41189ae C1
* 6cde1e5 passwd.txt

$ ls
C1  C2  C3  C4  C6  passwd.txt

$ git checkout dev && ls && git checkout master
C1  C2  C3  C4  C5  passwd.txt

$ git filter-branch --tree-filter 'rm -f passwd.txt' HEAD # --all all branches
Rewrite ed0bdf061439ea1471b3e5f89473dfa2f5b9e252 (3/6) (1 seconds passed, remaining 1 predicted)
Ref 'refs/heads/master' was rewritten

$ git log --oneline --decorate --graph --all
* 7857432 (HEAD -> master) C6
* 4b2f01b C4
* 0ff4616 C3
* 62f16b3 C2
* a2d3ffd C1
* 6cb9305 passwd.txt
* ed0bdf0 (refs/original/refs/heads/master) C6
| * 935d3f9 (dev) C5
|/
* 2fd6776 C4
* 8955126 C3
* cd003e0 C2
* 41189ae C1
* 6cde1e5 passwd.txt

$ ls
C1  C2  C3  C4  C6

$ git checkout dev && ls && git checkout master
C1  C2  C3  C4  C5  passwd.txt

$ git checkout ed0bdf0 # 'detached HEAD' state

$ ➦ ed0bdf0 ls
C1  C2  C3  C4  C6  passwd.txt
```

# 修改邮箱
公司项目和GitHub使用的邮箱通常是不一样的，提交历史中可能会存在错误的邮箱
```
$ git log --pretty=format:'%h %an %ae'
824f10e zhongmingmao zhongmingmao@yeah.net
4ce87b1 localuser localuser@gmail.com
ff7fea3 zhongmingmao zhongmingmao@yeah.net

$ git filter-branch --commit-filter '
        if [ "$GIT_AUTHOR_NAME" = "localuser" ];
        then
                GIT_AUTHOR_NAME=zhongmingmao;
                GIT_AUTHOR_EMAIL=zhongmingmao@yeah.net;
                git commit-tree "$@";
        else
                git commit-tree "$@";
        fi' HEAD
Rewrite 824f10e80dac8f1c4854671de6aba2e703b74d29 (3/3) (0 seconds passed, remaining 0 predicted)
Ref 'refs/heads/master' was rewritten

$ git log --pretty=format:'%h %an %ae'
314d84f zhongmingmao zhongmingmao@yeah.net
750e781 zhongmingmao zhongmingmao@yeah.net
ff7fea3 zhongmingmao zhongmingmao@yeah.net
```

<!-- indicate-the-source -->
