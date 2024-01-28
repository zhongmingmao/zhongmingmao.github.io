---
title: DevOps - Overview
mathjax: false
date: 2023-02-03 00:06:25
cover: https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/DevOps-Lifecycle.jpg
categories:
  - Cloud Native
  - DevOps
tags:
  - Cloud Native
  - Kubernetes
  - DevOps
---

#  演进过程

## 精益

1. 诞生于工业领域：用最少的时间和资源消耗，生产出高质量的产品

## 瀑布模式

1. `线性`的开发流程、将软件开发划分为一系列阶段

<!-- more -->

## 敏捷模式

> 误区：敏捷 = 管理

![586d0a09d56c8](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/586d0a09d56c8.jpg)

1. 敏捷是基于精益的思想
2. 将开发过程拆分成 N 个敏捷开发周期，`小步快跑`
3. 生命周期
   - 基于`迭代`的敏捷（`固定`的迭代周期）
   - 基于`流程`的敏捷（`不固定`的迭代周期）

> 运维不堪重负，建立部门墙，敏捷模式只关注`开发`，不关注运维

## DevOps

![image-20240125215855319](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240125215855319.png)

![image-20240125220420713](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240125220420713.png)

# 核心阶段

1. 版本控制
2. 持续集成 - 代码提交
3. 持续交付 - 测试环境
4. 持续部署 - 生产环境
5. 持续监控

## 源码管理

> SVN / Git

![image-20240123224306643](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240123224306643.png)

### Git Flow

> git `pull` = git `fetch` + git `merge`

![image-20240123224714016](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240123224714016.png)

### Git 高级用法

#### rebase

> 将一个分支的提交移动到另一个分支的`末尾`，使得提交历史更加`线性`和`整洁`

> 主要场景：
>
> 1. 更新本地分支以匹配远程分支，避免产生多余的 merge commit
> 2. 合并提交
> 3. 重新排列提交

![image-20240123225709112](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240123225709112.png)

```
$ git checkout feature
$ git rebase master
```

![image-20240123225839055](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240123225839055.png)

1. 从两个分支的`共同祖先`开始提取`待变基分支`（feature）上的修改
2. 然后将`待变基分支`（feature）指向`基分支`（master）的最新提交
3. 最后将刚才提取的修改应用到`基分支`的最新提交的后面

#### chery-pick

> 从一个分支中挑选一个或者多个提交应用到当前分支，无需合并整个分支

#### reset

> 用于撤回提交，将分支指针和工作目录恢复到指定的提交状态，模式：`--soft`、`--mixed`、`--hard`

#### stash

> 用于保存`当前工作目录`的`临时更改`，以便切换到其它分支，暂存未提交的更改，通过 stash pop 恢复

#### bisect

> 用于帮助定位引入错误或者问题的提交，通过`二分查找`的方式，快速定位有问题的提交

### Git 最佳实践

1. `主分支`保护
2. 强制 `Code Review`
3. 强制运行 `Pipeline`

## 持续集成

> CI

1. 在`代码提交`时自动触发构建
2. 包括：编译、单元测试、安全扫描、质量扫描、构建制品等
3. 工具：Jenkins、GitHub Action、GitLab CI 等

![image-20240123235347534](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240123235347534.png)

## 持续交付

> 一般会合并到 CI 中

1. 自动部署到`测试`环境
2. 运行`自动化测试`
3. 当持续交付过程出错时，可以立即找到对应的 Git 提交

![image-20240123235851337](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240123235851337.png)

## 持续部署

> CD

1. 自动部署到`生产环境`
2. 误区：`在 CI 中完成 CD`，职责不清
3. 工具：Argo CD、FluxCD、Harness、Spinnaker
4. 复杂的`发布策略`：分批发布、A/B Test、灰度、自动金丝雀发布

![image-20240124000421435](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240124000421435.png)

# 云原生 DevOps

![image-20240124000714357](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240124000714357.png)

> Docker in Docker，将 `Docker Socket` 挂载到 Pod 内是`不安全`的，因此使用 `Kaniko`

![image-20240124001737501](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240124001737501.png)

