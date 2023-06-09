---
title: Cloud Computing - Container
mathjax: false
date: 2022-10-20 00:06:25
cover: https://cloud-computing-1253868755.cos.ap-guangzhou.myqcloud.com/Xoriant-Modern-Container-Orchestration-Platform.png
categories:
  - Cloud Computing
  - PaaS
tags:
  - Cloud Computing
  - PaaS
---

# 历史

> `相辅相成`：云`承载`着容器的运行，容器生态`驱动`着云的发展

1. 初期的首要目标：Docker 容器在云上能够`顺畅运行`
   - 帮助用户创建底层`虚拟机集群`，免去用户自己手动管理虚拟机的麻烦
2. 随着容器应用的复杂化，`容器编排`成为了用户最迫切的需求
   - `Kubernetes` 赢得了编排框架大战，成为了`事实标准`

<!-- more -->

# 自建 vs 托管

1. 由于云端的`多租户`特性，云平台会统一提供和托管 `Master` 节点，降低运维成本
   - 只需要创建 `Worker` 节点，并为之付费即可
2. Kubernetes 的`抽象设计`非常出色，能够支持大量灵活的`扩展`
   - 云厂商会让尽量多的 IaaS 和 PaaS 功能组件，渗透到 Kubernetes 的体系中
   - `Cloud Service Operator`
     - 通过云服务来`扩展` Kubernetes 的能力，并反过来使用 Kubernetes 来`管理`这些云服务
     - 成熟：`容器和云一体化架构`
3. `多集群`
   - 降低了建立 Kubernetes 集群的`门槛`，如果业务关联较小，可以为不同的业务创建单独的 Kubernetes 集群

# 全托管

> 容器服务实例，无需关心`底层基础设施`

1. 适合场景：只有一个`容器镜像`，且为`无状态`，只想尽快在云上运行起来
2. 优势：简便易行、成本低、速度快，且无需关注底层的`虚拟机`和`集群`，绕开复杂的`编排系统`，只关注 Pod 本身运行

