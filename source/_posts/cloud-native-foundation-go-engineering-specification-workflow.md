---
title: Go Engineering - Specification - Workflow
mathjax: false
date: 2022-03-27 00:06:25
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
---

# 集中式

> 在本地仓库的 **master** 分支开发，将修改后的代码 commit 到远程仓库，如有冲突先**本地解决**再提交

![](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/3174a9e1373ed2d6d14471164dcb13eb.webp)

<!-- more -->

![fbcc75ba5b91223f6bf243f0bc08bac7](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/fbcc75ba5b91223f6bf243f0bc08bac7.webp)

> 适合场景：团队人员少、开发不频繁、不需要同时维护多个版本的小项目

# 功能分支

![1c0b08a1c9032c87c35b85de6ca6820b](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/1c0b08a1c9032c87c35b85de6ca6820b.webp)

```
# git checkout -b feature/rate-limiting

# git add limit.go
# git commit -m "add rate limiting"

# git push origin feature/rate-limiting

# Github: Compare & pull request -> Create pull request

# Github: Code Review -> Merge pull request
```

## Merge PR

1. **Create a merge commit** -- **推荐**
   - 底层操作：`git merge --no-ff`
     - `With --no-ff, create a merge commit in all cases, even when the merge could instead be resolved as a fast-forward.`
   - feature 分支上的所有 commit 都会加到 master 分支，并且会**生成一个 merge commit**
   - 清晰地知道谁做了提交，做了哪些提交，方便**回溯**历史
2. **Squash and merge**
   - 底层操作：`git merge --squash`
     - `This allows you to create a single commit on top of the current branch whose effect is the same as merging another branch (or more in case of an octopus).`
   - 使该 PR 上的所有 commit 都**合成一个 commit**，然后加到 master 分支上，但原来的 **commit 历史会丢失**
   - 适用场景：开发人员提交的 commit 不符合规范，非常随意，在大型项目中，**不建议使用**
3. **Rebase and merge**
   - 底层操作：`git rebase`
   - 将 PR 上**所有 commit 历史**按照顺序**依次添加**到 master 的 HEAD
   - 如果不熟悉 Git 工作流，**不建议在 merge 时使用**

> 适用场景：开发团队相对固定、规模较小的项目

# Git Flow

> 非常成熟的方案，非开源方案中最常用的 Work Flow，具有严格的分支模型，master 和 develop 为常驻分支

![gitflow](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/gitflow.webp)

![fa611f83053afd77cf3ddf83561ba1d9](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/fa611f83053afd77cf3ddf83561ba1d9.webp)

> 适用场景：开发团队相对固定，规模较大的项目

# Forking

> 常用于开源项目，fork 操作是在个人远程仓库新建一份目标仓库的副本

![63419f767c61c9580861b59445b90fea](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/63419f767c61c9580861b59445b90fea.webp)

```
fork: marmotedu/gitflow-demo -> colin404fork/gitflow-demo
```

```
# git clone https://github.com/colin404fork/gitflow-demo
# cd gitflow-demo
# git remote add upstream https://github.com/marmotedu/gitflow-demo
# git remote set-url --push upstream no_push # Never push to upstream master
```

```
# git fetch upstream
# git checkout master
# git rebase upstream/master # 同步最新状态，与 upstream/master 一致
```

```
# git checkout -b feature/add-function

# coding...

# git fetch upstream
# git rebase upstream/master # 提交前再一次同步状态
# git add -> git commit
```

```
# 合并修改 commit
# git rebase -i origin/master              # 方式 1
# git reset HEAD~5 -> git add -> git comit # 方式 2

# 主动合并 commit
# git commit --fixup
# git rebase -i --autosquash
```

```
# git push -f origin feature/add-function
```

```
# 提 PR
```

