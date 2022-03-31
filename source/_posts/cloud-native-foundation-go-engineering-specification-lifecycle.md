---
title: Go Engineering - Specification - Life Cycle
mathjax: false
date: 2022-03-27 01:06:25
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
---

# 生命周期管理

![9a290c28b0c238dd69e24dcc9f5c7ea3](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/9a290c28b0c238dd69e24dcc9f5c7ea3.webp)

<!-- more -->

# 研发模式

## 瀑布模式

> 按照**预先规划**好的研发阶段来推进研发进度，**串行**执行（在每个阶段**完美完成**后，才会进入到下一阶段）

![7ccc702a02cf24e2295cc50a506e6289](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/7ccc702a02cf24e2295cc50a506e6289.webp)

## 迭代模式

1. **研发任务**被切成一系列轮次，每一个**轮次**是一个**迭代**，每一次迭代都是**从设计到实现的完整过程**
2. 不要求每个阶段的任务都做到最完美，先把**主要功能**搭建起来，然后再通过客户的反馈信息**不断完善**
3. 缺点：比较专注于**开发过程**，很少从**项目管理**的视角去加速和优化项目开发过程

## 敏捷模式

1. 将一个大的需求分成多个、**可分阶段完成**的**小迭代**，在开发过程中，**软件一直处于可用状态！**
2. 敏捷模式需要**高频**地开发、构建、测试、发布和部署，进而催生了 **CICD** 技术

# CICD

> CICD 通过**自动化**的手段，快速执行代码检查、测试、构建、部署等任务，解决**敏捷模式**带来的弊端

1. CI：Continuous **Integration**
   - 频繁地将开发者的代码**合并到主干**上
   - 流程
     - 开发人员完成代码开发，push 到 git 仓库
     - CI 工具对代码进行扫描、单元测试和构建，并将结果反馈给开发者
     - CI 通过后会将代码合并到主干
   - CI 可以让问题在开发阶段暴露，CI 执行很频繁，需要**自动化工具**支撑
2. CD：Continuous **Delivery**
   - 使得软件在**较短循环**中**可靠发布**的软件方法
   - **持续交付在 CI 的基础上**，将构建后的产物自动部署到目标环境中
     - 目标环境一般为**测试环境**、**预发环境**，直接发布到生产环境，存在风险，需要评估
3. CD：Continuous **Deployment**
   - **持续部署在持续交付的基础上**，将经过**充分测试**的代码自动部署到**生产环境**
   - 持续部署强调的是**自动化部署**，是**交付的最高阶段**
4. CICD 强调的是**持续性**，能够支持频繁地集成、交付和部署，离不开自动化工具的支持
   - **CI** 的核心是**代码**，**持续交付**的核心是**可交付的产物**，**持续部署**的核心是**自动部署**

![963b9983543de3d66379567ba491d7d0](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/963b9983543de3d66379567ba491d7d0.webp)

# DevOps

> DevOps 是一组过程、方法和系统的统称（而 **CICD 只是软件构建和发布的技术**，CICD 技术的成熟，加速了 DevOps 的落地），用于促进 **RD**、**Ops** 和 **QA** 之间的**沟通**、**协作**和**整合**

![c81a361fb98500cec8c866f465f14679](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/c81a361fb98500cec8c866f465f14679.webp)

## AIOps

1. AIOps 通过搜集**海量的运维数据**，并利用**机器学习**算法，智能**定位并修复**故障
2. AIOps 在**自动化**的基础上，增加了**智能化**

## ChatOps

1. 在一个聊天工具中，发送一条命令给 ChatBot 机器人，然后 ChatBot 会执行预定义的操作
1. RD、Ops、QA 通过@机器人来触发任务，机器人会通过 API 接口调用的方式对接不同的系统，完成不同的任务
3. 优势：利用 **ChatBot** 机器人让团队成员与各种辅助工具连接在一起，以**沟通驱动**的方式完成工作

![292372572f1fa8cae9a44891bd233a6e](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/292372572f1fa8cae9a44891bd233a6e.webp)

## GitOps

> 实现**云原生**的持续交付模型

1. GitOps 是一种**持续交付**的方式
2. 核心思想
   - 将应用系统的**声明式基础架构（YAML）**和应用程序存放在 Git 版本库中
   - 将 **Git** 作为交付流水线的**核心**，每个开发人员都可以提交 **PR**，并使用 Git 来加速和简化 **K8S** 的应用程序部署和运维任务
3. **通过 Git，RD 可以将精力聚焦在功能开发，而不是 Ops**
4. 核心优点
   - 当使用 Git 变更代码时，GitOps 可以自动将变更应用到程序的基础架构
   - 整个流程是自动化的，部署时间更短
   - Git 代码是可追溯的，部署的应用可能够稳定回滚
5. 关键概念
   - **声明性容器编排**
     - 通过 **K8S YAML** 格式的资源定义文件，来定义如何部署应用
   - **不可变基础设施**
     - 基础设施中的每个组件都是可以自动部署，组件在部署完成后，不能发生变更
     - 如果需要发生变更，则**重新部署一个新的组件**，K8S Pod 就是一个不可变基础设施
   - **连续同步**
     - **不断查看 Git 仓库，将任何状态更改反映到 K8S 集群中**
     - 流程
       - RD 开发完代码后推送到 Git 仓库，触发 CI 流程，CI 流程通过编译构建出 Docker 镜像，并将镜像推送到 Docker 镜像仓库中
       - Push 动作会触发一个 **Push 事件**，通过 **webhook** 的形式通知到 Config Updater 服务
       - Config Updater 服务会从镜像仓库下载镜像，**并更新 Git 仓库中的 K8S YAML 文件**
       - GitOps 的 Deploy Operator 服务检测到 YAML 文件的变动，会重新从 Git 仓库提取变更的文件，并将镜像部署到 K8S 集群
       - Config Updater 和 Deploy Operator 需要自研开发

![2f1b427674e7da60668b2af42cf7338d](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/2f1b427674e7da60668b2af42cf7338d.webp)

## NoOps

> 无运维，完全自动化的运维，为运维的终极形态，与 DevOps 类似，更多是一种**理念**，需要很多技术和手段来支撑

1. 不再需要 RD、Ops 和 QA 的协同，把 Micro-service、Low-code、Serverless 全都结合起来，RD 只需要聚焦业务开发，所有维护都交由**云厂商**来完成
2. GitOps、AIOps 可以减少运维，Serverless 可以免运维
