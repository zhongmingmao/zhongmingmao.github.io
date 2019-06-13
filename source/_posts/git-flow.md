---
title: Git -- Git Flow
date: 2017-04-20 00:00:01
categories:
    - Tool
    - Git
tags:
    - Tool
    - Git
---

{% note info %}
主要介绍`Git Flow`中`Feature`分支、`Release`分支、`Hotfix`分支的流程
{% endnote %}

<!-- more -->

# Git Flow
<img src="https://git-1253868755.cos.ap-guangzhou.myqcloud.com/pro/git-flow.png" width="500">

# 初始化仓库
`git flow init`：初始化仓库，支持`GitFlow分支模型`
```
$ git clone https://github.com/hzmajia/gitflow-example.git
Cloning into 'gitflow-example'...
warning: You appear to have cloned an empty repository.
Checking connectivity... done.

$ cd gitflow-example && git flow init
No branches exist yet. Base branches must be created now.
Branch name for production releases: [master]
Branch name for "next release" development: [develop]
How to name your supporting branch prefixes?
Feature branches? [feature/]
Bugfix branches? [bugfix/]
Release branches? [release/]
Hotfix branches? [hotfix/]
Support branches? [support/]
Version tag prefix? []
Hooks and filters directory? [/home/zhongmingmao/gitflow-example/.git/hooks]

$ git branch -vv
* develop 378941f Initial commit
  master  378941f [origin/master: gone] Initial commit

$ git push origin develop
Counting objects: 2, done.
Writing objects: 100% (2/2), 163 bytes | 0 bytes/s, done.
Total 2 (delta 0), reused 0 (delta 0)
To https://github.com/hzmajia/gitflow-example.git
 * [new branch]      develop -> develop

$ git checkout master
Switched to branch 'master'
Your branch is based on 'origin/master', but the upstream is gone.
  (use "git branch --unset-upstream" to fixup)

$ git push -u origin master
Total 0 (delta 0), reused 0 (delta 0)
To https://github.com/hzmajia/gitflow-example.git
 * [new branch]      master -> master
Branch master set up to track remote branch master from origin.

$ git branch -vv
  develop 378941f Initial commit
* master  378941f [origin/master] Initial commit

$ git log --oneline --decorate --graph --all
* 378941f (HEAD -> master, origin/master, origin/develop, develop) Initial commit
```

# Feature分支
`git flow feature`：Feature分支列表
`git flow feature start`：新建一个Feature分支
`git flow publish`：将Feature分支推送到远程仓库，并设为`上游分支`
`git flow feature finish`：完成一个Feature分支，一般是`merge request`或`pull request`的接受者执行
```
$ git flow feature start featureA
Switched to a new branch 'feature/featureA'
Summary of actions:
- A new branch 'feature/featureA' was created, based on 'develop'
- You are now on branch 'feature/featureA'
Now, start committing on your feature. When done, use:
     git flow feature finish featureA

$ git branch -vv
  develop          378941f Initial commit
* feature/featureA 378941f Initial commit
  master           378941f [origin/master] Initial commit

$ git flow feature
* featureA

$ git flow publish featureA
Total 0 (delta 0), reused 0 (delta 0)
To https://github.com/hzmajia/gitflow-example.git
 * [new branch]      feature/featureA -> feature/featureA
Branch feature/featureA set up to track remote branch feature/featureA from origin.
Already on 'feature/featureA'
Your branch is up-to-date with 'origin/feature/featureA'.
Summary of actions:
- The remote branch 'feature/featureA' was created or updated
- The local branch 'feature/featureA' was configured to track the remote branch
- You are now on branch 'feature/featureA'

$ git branch -vv
  develop          378941f Initial commit
* feature/featureA 378941f [origin/feature/featureA] Initial commit
  master           378941f [origin/master] Initial commit

$ touch featureA && git add . && git commit -m 'featureA'
[feature/featureA 6e6605d] featureA
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 featureA

$ git branch -vv
  develop          378941f Initial commit
* feature/featureA 6e6605d [origin/feature/featureA: ahead 1] featureA
  master           378941f [origin/master] Initial commit

$ git push origin feature/featureA # git flow publish featureA
Counting objects: 3, done.
Writing objects: 100% (3/3), 235 bytes | 0 bytes/s, done.
Total 3 (delta 0), reused 0 (delta 0)
To https://github.com/hzmajia/gitflow-example.git
   378941f..6e6605d  feature/featureA -> feature/featureA

$ git log --oneline --decorate --graph --all
* 6e6605d (HEAD -> feature/featureA, origin/feature/featureA) featureA
* 378941f (origin/master, origin/develop, master, develop) Initial commit

$ git flow feature finish featureA
Switched to branch 'develop'
Updating 378941f..6e6605d
Fast-forward
 featureA | 0
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 featureA
To https://github.com/hzmajia/gitflow-example.git
 - [deleted]         feature/featureA
Deleted branch feature/featureA (was 6e6605d).
Summary of actions:
- The feature branch 'feature/featureA' was merged into 'develop'
- Feature branch 'feature/featureA' has been locally deleted; it has been remotely deleted from 'origin'
- You are now on branch 'develop'

$ git fetch origin

$ git branch -vv
* develop 6e6605d featureA
  master  378941f [origin/master] Initial commit

$ ls
featureA
```

# Release分支
`git flow release`：Release分支列表
`git flow release start`：新建一个Release分支
`git flow publish`：将Release分支推送到远程仓库，并设为`上游分支`
`git flow release finish`：完成一个Release分支，一般是`merge request`或`pull request`的接受者执行
```
$ git flow release start releaseA
Branches 'develop' and 'origin/develop' have diverged.
And local branch 'develop' is ahead of 'origin/develop'.
Switched to a new branch 'release/releaseA'
Summary of actions:
- A new branch 'release/releaseA' was created, based on 'develop'
- You are now on branch 'release/releaseA'
Follow-up actions:
- Bump the version number now!
- Start committing last-minute fixes in preparing your release
- When done, run:
     git flow release finish 'releaseA'

$ git push -u origin develop
Counting objects: 3, done.
Writing objects: 100% (3/3), 235 bytes | 0 bytes/s, done.
Total 3 (delta 0), reused 0 (delta 0)
To https://github.com/hzmajia/gitflow-example.git
   378941f..6e6605d  develop -> develop
Branch develop set up to track remote branch develop from origin.

$ git branch -vv
  develop          6e6605d [origin/develop] featureA
  master           378941f [origin/master] Initial commit
* release/releaseA 6e6605d featureA

$ git flow release
* releaseA

$ git flow publish releaseA
Total 0 (delta 0), reused 0 (delta 0)
To https://github.com/hzmajia/gitflow-example.git
 * [new branch]      release/releaseA -> release/releaseA
Branch release/releaseA set up to track remote branch release/releaseA from origin.
Already on 'release/releaseA'
Your branch is up-to-date with 'origin/release/releaseA'.
Summary of actions:
- The remote branch 'release/releaseA' was created or updated
- The local branch 'release/releaseA' was configured to track the remote branch
- You are now on branch 'release/releaseA'

$ git branch -vv
  develop          6e6605d [origin/develop] featureA
  master           378941f [origin/master] Initial commit
* release/releaseA 6e6605d [origin/release/releaseA] featureA

$ touch releaseA && git add . && git commit -m 'releaseA'
[release/releaseA f993ec4] releaseA
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 releaseA

$ git flow publish releaseA # git push origin release/releaseA
Counting objects: 2, done.
Compressing objects: 100% (2/2), done.
Writing objects: 100% (2/2), 237 bytes | 0 bytes/s, done.
Total 2 (delta 0), reused 0 (delta 0)
To https://github.com/hzmajia/gitflow-example.git
   6e6605d..f993ec4  release/releaseA -> release/releaseA
Branch release/releaseA set up to track remote branch release/releaseA from origin.
Already on 'release/releaseA'
Your branch is up-to-date with 'origin/release/releaseA'.
Summary of actions:
- The remote branch 'release/releaseA' was created or updated
- The local branch 'release/releaseA' was configured to track the remote branch
- You are now on branch 'release/releaseA'

$ git log --oneline --decorate --graph --all
* f993ec4 (HEAD -> release/releaseA, origin/release/releaseA) releaseA
* 6e6605d (origin/develop, develop) featureA
* 378941f (origin/master, master) Initial commit

$ git flow release finish releaseA
Switched to branch 'master'
Your branch is up-to-date with 'origin/master'.
Merge made by the 'recursive' strategy.
 featureA | 0
 releaseA | 0
 2 files changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 featureA
 create mode 100644 releaseA
Switched to branch 'develop'
Your branch is up-to-date with 'origin/develop'.
Merge made by the 'recursive' strategy.
 releaseA | 0
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 releaseA
To https://github.com/hzmajia/gitflow-example.git
 - [deleted]         release/releaseA
Deleted branch release/releaseA (was f993ec4).
Summary of actions:
- Release branch 'release/releaseA' has been merged into 'master'
- The release was tagged 'releaseA'
- Release tag 'releaseA' has been back-merged into 'develop'
- Release branch 'release/releaseA' has been locally deleted; it has been remotely deleted from 'origin'
- You are now on branch 'develop'

$ git branch -vv
* develop 269c207 [origin/develop: ahead 3] Merge tag 'releaseA' into develop
  master  4944ec5 [origin/master: ahead 3] Merge branch 'release/releaseA'

$ git push origin master
Counting objects: 3, done.
Compressing objects: 100% (3/3), done.
Writing objects: 100% (3/3), 372 bytes | 0 bytes/s, done.
Total 3 (delta 1), reused 0 (delta 0)
remote: Resolving deltas: 100% (1/1), done.
To https://github.com/hzmajia/gitflow-example.git
   378941f..4944ec5  master -> master

$ git push origin develop
Counting objects: 1, done.
Writing objects: 100% (1/1), 238 bytes | 0 bytes/s, done.
Total 1 (delta 0), reused 0 (delta 0)
To https://github.com/hzmajia/gitflow-example.git
   6e6605d..269c207  develop -> develop

$ git branch -vv
* develop 269c207 [origin/develop] Merge tag 'releaseA' into develop
  master  4944ec5 [origin/master] Merge branch 'release/releaseA'

$ ls
featureA  releaseA
```

# Hotfix分支
`git flow hotfix`：Hotfix分支列表
`git flow hotfix start`：新建一个Hotfix分支
`git flow publish`：将Hotfix分支推送到远程仓库，并设为`上游分支`
`git flow hotfix finish`：完成一个Hotfix分支，一般是`merge request`或`pull request`的接受者执行
```
$ git flow hotfix start hotfixA
Switched to a new branch 'hotfix/hotfixA'
Summary of actions:
- A new branch 'hotfix/hotfixA' was created, based on 'master'
- You are now on branch 'hotfix/hotfixA'
Follow-up actions:
- Start committing your hot fixes
- Bump the version number now!
- When done, run:
     git flow hotfix finish 'hotfixA'

$ git branch -vv
  develop        269c207 [origin/develop] Merge tag 'releaseA' into develop
* hotfix/hotfixA 4944ec5 Merge branch 'release/releaseA'
  master         4944ec5 [origin/master] Merge branch 'release/releaseA'

$ git flow hotfix
* hotfixA

$ git flow publish hotfixA
Total 0 (delta 0), reused 0 (delta 0)
To https://github.com/hzmajia/gitflow-example.git
 * [new branch]      hotfix/hotfixA -> hotfix/hotfixA
Branch hotfix/hotfixA set up to track remote branch hotfix/hotfixA from origin.
Already on 'hotfix/hotfixA'
Your branch is up-to-date with 'origin/hotfix/hotfixA'.
Summary of actions:
- The remote branch 'hotfix/hotfixA' was created or updated
- The local branch 'hotfix/hotfixA' was configured to track the remote branch
- You are now on branch 'hotfix/hotfixA'

$ git branch -vv
  develop        269c207 [origin/develop] Merge tag 'releaseA' into develop
* hotfix/hotfixA 4944ec5 [origin/hotfix/hotfixA] Merge branch 'release/releaseA'
  master         4944ec5 [origin/master] Merge branch 'release/releaseA'

$ touch hotfixA && git add . && git commit -m 'hotfixA'
[hotfix/hotfixA e17d475] hotfixA
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 hotfixA

$ git flow publish hotfixA
Counting objects: 2, done.
Compressing objects: 100% (2/2), done.
Writing objects: 100% (2/2), 249 bytes | 0 bytes/s, done.
Total 2 (delta 0), reused 0 (delta 0)
To https://github.com/hzmajia/gitflow-example.git
   4944ec5..e17d475  hotfix/hotfixA -> hotfix/hotfixA
Branch hotfix/hotfixA set up to track remote branch hotfix/hotfixA from origin.
Already on 'hotfix/hotfixA'
Your branch is up-to-date with 'origin/hotfix/hotfixA'.
Summary of actions:
- The remote branch 'hotfix/hotfixA' was created or updated
- The local branch 'hotfix/hotfixA' was configured to track the remote branch
- You are now on branch 'hotfix/hotfixA'

$ git log --oneline --decorate --graph --all
* e17d475 (HEAD -> hotfix/hotfixA, origin/hotfix/hotfixA) hotfixA
| *   269c207 (origin/develop, develop) Merge tag 'releaseA' into develop
| |\
| |/
|/|
* |   4944ec5 (tag: releaseA, origin/master, master) Merge branch 'release/releaseA'
|\ \
| * | f993ec4 releaseA
| |/
| * 6e6605d featureA
|/
* 378941f Initial commit

$ git flow hotfix finish hotfixA
Switched to branch 'master'
Your branch is up-to-date with 'origin/master'.
Merge made by the 'recursive' strategy.
 hotfixA | 0
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 hotfixA
Switched to branch 'develop'
Your branch is up-to-date with 'origin/develop'.
Merge made by the 'recursive' strategy.
 hotfixA | 0
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 hotfixA
To https://github.com/hzmajia/gitflow-example.git
 - [deleted]         hotfix/hotfixA
Deleted branch hotfix/hotfixA (was e17d475).
Summary of actions:
- Hotfix branch 'hotfix/hotfixA' has been merged into 'master'
- The hotfix was tagged 'hotfixA'
- Hotfix tag 'hotfixA' has been back-merged into 'develop'
- Hotfix branch 'hotfix/hotfixA' has been locally deleted; it has been remotely deleted from 'origin'
- You are now on branch 'develop'

$ git branch -vv
* develop c293bc1 [origin/develop: ahead 3] Merge tag 'hotfixA' into develop
  master  87bca9d [origin/master: ahead 2] Merge branch 'hotfix/hotfixA'

$ git push origin master
Counting objects: 3, done.
Compressing objects: 100% (3/3), done.
Writing objects: 100% (3/3), 338 bytes | 0 bytes/s, done.
Total 3 (delta 1), reused 0 (delta 0)
remote: Resolving deltas: 100% (1/1), done.
To https://github.com/hzmajia/gitflow-example.git
   4944ec5..87bca9d  master -> master

$ git push origin master
Counting objects: 1, done.
Writing objects: 100% (1/1), 238 bytes | 0 bytes/s, done.
Total 1 (delta 0), reused 0 (delta 0)
To https://github.com/hzmajia/gitflow-example.git
   269c207..c293bc1  develop -> develop

$ git log --oneline --decorate --graph --all
*   c293bc1 (HEAD -> develop, origin/develop) Merge tag 'hotfixA' into develop
|\
| *   87bca9d (tag: hotfixA, origin/master, master) Merge branch 'hotfix/hotfixA'
| |\
| | * e17d475 hotfixA
| |/
* |   269c207 Merge tag 'releaseA' into develop
|\ \
| |/
| *   4944ec5 (tag: releaseA) Merge branch 'release/releaseA'
| |\
| | * f993ec4 releaseA
| |/
|/|
* | 6e6605d featureA
|/
* 378941f Initial commit
```



<!-- indicate-the-source -->
