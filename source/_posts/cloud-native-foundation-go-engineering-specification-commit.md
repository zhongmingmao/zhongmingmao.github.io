---

title: Go Engineering - Specification - Commit
mathjax: false
date: 2022-03-19 01:06:25
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
---

# 规范化的优势

> 优势：Commit Message 可读性更好 + 自动化

1. **清晰**地知道每个 Commit 的变更内容
2. 基于 Commit Message 进行**过滤查找**：`git log --oneline --grep "^feat|^fix|^perf"`
3. 基于 Commit Message 生成 **Change Log**
4. 基于 Commit Message 触发 **CICD** 流程
5. 确定**语义化版本**的版本号
   - **fix** 类型映射为 **PATCH** 版本
   - **feat** 类型映射为 **MINOR** 版本
   - 带有 **BREAKING CHANGE** 的 Commit 映射为 **MAJOR** 版本

<!-- more -->

# Angular 规范

1. Angular 格式清晰，使用**最为广泛**；Angular 规范是一种**语义化**的提交规范
2. Commit Message 是**语义化**的
   - Commit Message 都会被归为一个有意义的**类型**，用来说明本次 Commit 的类型
3. Commit Message 是**规范化**的
   - Commit Message 遵循**预先定义**好的规范，可以被开发者和工具**识别**

## 样例

![e227e4976406daaa039438feb5affefe](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/e227e4976406daaa039438feb5affefe.png)

![da69572c5605556b8144eb4ee281c4cb](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/da69572c5605556b8144eb4ee281c4cb.png)

## 规范

> Commit Message 组成部分：**Header**（必须）、**Body** 和 **Footer**

```
<type>[optional scope]: <subject>
// 空行
[optional body]
// 空行
[optional footer(s)]
```

### Header

> 只有一行，对 Commit 的**高度概括**

#### type

> Commit 的类型

1. **Development**
   - **项目管理类**的变更，不会影响最终用户和生产环境的代码，如 CICD 流程、构建方式等修改，可**免测发布**
2. **Production**
   - 会影响最终用户和生产环境的代码，在提交前需做好**充分测试**

![89c618a7415c0c38b09d86d7f882a427](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/89c618a7415c0c38b09d86d7f882a427.png)

![3509bd169ce285f59fbcfa6ebea75aa7](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/3509bd169ce285f59fbcfa6ebea75aa7.png)

#### scope

> Commit 的影响范围（名词），不同的项目会有不同的 scope，**scope 不适合设置太具体的值**（预先规划 + 文档化）
> Could be anything specifying place of the commit **change** (users, db, poll)

#### subject

> Commit 的简短描述：**小写**的动词开头，使用**现在时**，结尾**不能加英文句号**
> Concise description of the changes. Imperative, lower case and no final dot

### Body

> 可以分成多行，格式相对自由，对 Commit 的**详细描述**
> 以**动词**开头，使用**现在时**，必须包含**修改的动机** + **相对于上一版本的改动点**
> Motivation for the change and contrast this with previous behavior

### Footer

> 用来说明本次 Commit 导致的**后果**：不兼容的改动、**关闭的 issue 列表**
> Information about Breaking Changes and reference issues that this commit closes

```
BREAKING CHANGE: <breaking change summary>
// 空行
<breaking change description + migration instructions>
// 空行
// 空行
Fixes #<issue number>
```

#### 不兼容的改动

> 在 Footer 部分，以 BREAKING CHANGE 开头，后面跟上不兼容改动的摘要，Footer 其他部分说明变动的描述、变动理由和迁移方法

```
BREAKING CHANGE: isolate scope bindings definition has changed and
    the inject option for the directive controller injection was removed.

    To migrate the code follow the example below:

    Before:

    scope: {
      myAttr: 'attribute',
    }

    After:

    scope: {
      myAttr: '@',
    }
    The removed `inject` wasn't generaly useful for directives so there should be no code using it.
```

#### 关闭的 issue 列表

> 关闭的 Bug 需要在 Footer 部分**新建一行**，并以 **Closes** 开头列出

```
Closes #123, #432, #886
```

### Revert Commit

> 如果当前 Commit 还原了先前的 Commit，应该以 **revert:** 开头，后跟**还原的 Commit 的 Header**
> Body 必须写成：`This reverts commit <hash>`，hash 为要还原的 Commit 的 SHA 值

```
revert: feat(iam-apiserver): add 'Host' option

This reverts commit 079360c7cfc830ea8a6e13f4c8b8114febc9b48a.
```

# Commit

## 提交命令

> 为了更好地遵循 Angular 规范，直接使用 `git commit` 或者 **`git commit -a`**，不要使用 `git commit -m`

## 提交频率

> **下班前**固定提交一次，并确保本地未提交的代码**延期不超过 1 天**

## 重写历史

### git rebase

> **合并提交**：新的 Commit 合并到主干时，只保留 **2~3** 个 Commit

```
# git checkout -b feature/user
Switched to a new branch 'feature/user'
```

```
# git log --oneline
8b65509 (HEAD -> feature/user) docs(doc): add 4.txt
e5e2d23 docs(doc): add 3.txt
bd25713 docs(doc): add 2.txt
9db04ee docs(doc): add 1.txt
```

> git rebase -i 9db04ee -> **需要合并的 Commit 中最旧的 Commit 的父 Commit**

![image-20220323004902341](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220323004902341.png)

![image-20220323005022255](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220323005022255.png)

> git log -> 新的 Commit

![image-20220323005127606](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220323005127606.png)

### git reset

> 如果有太多 Commit 需要合并，可以先撤销过去的 Commit，再新建一个 Commit
> **不推荐**，比较**粗暴**，需要整理一遍之前提交的 Commit Message

```
# git reset HEAD~3
# git add .
# git commit -am "feat(user): add user resource"
```

## 修改 Message

>`git commit --amend` --> 修改**最近一次** Commit 的 Message
>`git rebase -i` --> 修改**某次** Commit 的 Message

### `git commit --amend`

```
# git log --oneline 
a4e0df3 (HEAD -> master) feat(core): add 2.txt
2cd0477 feat(core): add 1.txt
```

```
# git commit --amend 
[master 2dd0c67] feat(user): add 2.txt
 Date: Wed Mar 23 09:26:53 2022 +0800
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 2.txt
```

> 生成新的 Commit

```
# git log --oneline 
2dd0c67 (HEAD -> master) feat(user): add 2.txt
2cd0477 feat(core): add 1.txt
```

### `git rebase -i`

> `git rebase -i <father commit ID>`
> 在实际开发中，**使用频率比较高**

```
# git log --oneline
c34a349 (HEAD -> master) feat(core): add 4
a445771 feat(core): add 3
5e6b61b feat(core): add 2
89d921c feat(core): add 1
```

```
# git rebase -i 5e6b61b       
[detached HEAD 76f075f] feat(core): change 3
 Date: Wed Mar 23 09:37:50 2022 +0800
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 3
Successfully rebased and updated refs/heads/master.
```

![image-20220323094129619](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220323094129619.png)

![image-20220323094306298](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220323094306298.png)

```
# git log --oneline
645ce6d (HEAD -> master) feat(core): add 4
76f075f feat(core): change 3
5e6b61b feat(core): add 2
89d921c feat(core): add 1
```

### 注意

1. Commit Message 是 Commit 数据结构中的一个属性，**如果 Commit Message 变更，则 Commit Id 一定会发生变化**
   - `git commit --amend`：只会变更**最近一次**的 Commit Id
   - `git rebase -i`：会变更**父 Commit Id 之后**所有提交的 Commit Id
2. 如果当前分支有未 Commit 的代码，先执行 `git stash` 将工作状态进行暂存，后续再通过 `git stash pop` 恢复之前的工作状态

# 自动化

![87cd05c48ac90ec93c379b568a6006be](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/87cd05c48ac90ec93c379b568a6006be.png)

| Tool              | Desc                                                         |
| ----------------- | ------------------------------------------------------------ |
| **commitizen-go** | Command line utility to standardize git commit messages, golang version. |
| **commit-msg**    | A Git hook automatically invoked by `git commit`<br />commit-msg 调用 go-gitlint 来进行检查 |
| **go-gitlint**    | Go lint your commit messages!<br />检查历史提交的 Commit Message 是否符合 Angular 规范，可以集成到 CI 中 |
| **gsemver**       | gsemver is a command line tool developed in Go (Golang) that uses git commit convention to automate the generation of your next version compliant with semver 2.0.0 spec. |
| **git-chglog**    | CHANGELOG generator implemented in Go (Golang). *Anytime, anywhere, Write your CHANGELOG.* |

