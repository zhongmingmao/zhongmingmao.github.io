---
title: FaaS - Scaling
mathjax: false
date: 2023-02-10 00:06:25
cover: https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240318203921511.png
categories:
  - Cloud Native
  - Serverless
  - FaaS
tags:
  - Cloud Native
  - Kubernetes
  - Infrastructure
  - Architecture
  - Serverless
  - FaaS
---

# 概述

1. Serverless 的弹性扩缩容可以将实例缩容为 `0`，并根据请求量级`自动扩缩容`，从而有效地提升资源利用率
2. `极致动态扩缩容`是 `FaaS` 的`核心内涵`，是与 PaaS 平台的核心差异 - `降本增效`

<!-- more -->

# 调度形态

1. 开源的 Serverless 函数计算引擎核心，一般是基于 Kubernetes `HPA`
2. 云厂商一般有封装好的各种底座服务，可以基于底座服务来做封装
3. 云厂商`容器调度服务`，通常有两种调度形态
   - 基于 `Node` 调度
   - 基于`容器实例`的调度 - `Serverless`
4. 云厂商的`函数计算`通常是基于`容器服务`的底座

## Node 维度

![image-20240319133535831](https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240319133535831.png)

> 组件

1. `Scheduler`
   - 负责将请求打到指定的函数实例（Pod）上，同时负责为集群中的 Node 标记状态，记录到 `etcd`
2. `Local-Controller`
   - Node 上的本地控制器，负责管理 Node 上所有`函数实例`的`生命周期`，以 `DeamonSet` 形式存在
3. `AutoScaler`
   - 定期检测集群中 `Node` 和 `Pod` 的使用情况，并根据策略进行扩缩容
   - 在扩容时，向底层的 `PaaS` 平台`申请资源`
4. `Pod`
   - `Cold` 表示该 Pod `未被使用`
   - `Warm` 表示`正在被使用`或者处于`等待回收`的状态
5. `Node`
   - 状态：闲置、占用
   - 如果一个 Node 上`所有的 Pod` 都是 `cold`，该 `Node` 为`闲置`状态

> 过程

1. AutoScaler 会`定期检查`集群中所有 Node
2. 如果检测到 Node 处于一个需要扩容的状态，则根据策略（`完全自定义`）进行扩容
3. 在 Node 形态下，`Pod` 通常会作为`函数实例`的`通用状态`
   - 代码以及不同运行时以`挂载`的形式`注入`到容器内 - `DeamonSet`
4. AutoScaler 会在轮询时，根据 Warm Pod 的`闲置时间`将其`重置`为 Cold Pod
5. 在缩容时，理想情况下，AutoScaler 可以将 `Node` 缩容为 `0`
   - 但为了应对`突发流量`，会`预留`一部分 Buffer

> 缺点

1. 需要`管理 Node 调度`，还需要处理 Node 中 Pod 的安全隔离和使用
2. 可以通过`空 Pod` 来提前占用，`预加载`一部分 Pod

## Pod 维度

> 以 `Pod` 为`扩缩容单元`，可以更加`细粒度`地控制函数实例的数量

### HPA

> The HorizontalPodAutoscaler is implemented as a Kubernetes API resource and a controller. The resource determines the behavior of the controller. The horizontal pod autoscaling controller, running within the Kubernetes control plane, periodically adjusts the desired scale of its target (for example, a Deployment) to match observed metrics such as average CPU utilization, average memory utilization, or any other custom metric you specify.

1. `定期`从 Kubernetes `控制面`获取资源的各项`指标`数据（CPU 利用率、内存使用率等）
2. 根据指标数据将资源数量`控制`在一个目标范围内

> HPA 通过控制 Deployment 或者 RC 来实现对 Pod 实际数量的控制

![image-20240320104856175](https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240320104856175.png)

1. 在 Kubernetes 中，不同的 Metric 会由对应的 `Metric Server` 持续采集
2. HPA 会`定期`通过 Metric Server 的 API 或者聚合的 API Server 获取到这些 Metric 指标数据（CPU / Memory）
   - 然后根据`自定义的扩缩容规则`计算出 Pod 的`期望数量`
   - 最后，根据 Pod 当前的实际数量对 Deployment / RC 做出调整，使得 Pod 达到期望数量

> HPA 形态的扩缩容不能直接用于 Serverless

1. Serverless 语义下的动态扩缩容可以让服务缩容到 `0`，而 HPA 不能
2. HPA 是通过检测 `Pod` 的 `Metric` 来完成 Deployment 的扩缩容
   - 如果 Deployment 的副本缩容到 0，则 Metric 也变为 0，与 HPA 的机制有`根本冲突`

### Knative

> `从 0 到 1` 的扩缩容过程，需要`额外`的机制来支持

![image-20240320111718443](https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240320111718443.png)

#### 收集流量指标

1. 在 Knative 中，`Revision` 代表一个不变的、某一时刻的代码和 Configuration 的`快照`
2. 每个 `Revision` 会引用一个特定的`容器镜像`和运行它所需要的任何特定对象（如`环境变量`和`卷`）
   - 再通过 `Deployment` 控制函数实例（`User Pod`）的副本数
3. 每个 `User Pod` 中都有两个容器：`Queue Proxy` 和 `User Container`
4. `Queue Proxy`
   - 每个函数实例被创建时，都会被以 `Sidecar` 的方式将 `Queue Proxy` 注入
   - `Queue Proxy` 作为每个 `User Pod` 的`流量入口`，负责`限流`和`流量统计`的工作
   - `AutoScaler` 会`定时`收集 `Queue Proxy` 统计的流量数据，作为后续扩缩容的重要依据

#### 调整实例数量

1. 当收集到`流量`的指标后，AutoScaler 会通过改变实例 `Deployment` 来决定实例最终的个数
2. 简单算法 - 按照当前总并发`平均划分`到期望数量的实例上，使其符合设定的并发值
   - 当前总并发为 100，设定的并发值为 10，最终调整出来的实例数量为 100/10 = 10
3. 实际上，扩缩容的实例数量还会考虑系统负载和调度周期等因素

#### 从 0 到 1

1. Knative 专门引入 `Activator` 组件 - 用于`流量暂存`和`代理负载`
2. 当 AutoScaler 将函数实例缩容为 `0` 时，会控制 `Activator` 作为实例为 0 时的`流量接收入口`
3. `Activator` 在收到流量后，会将请求和信息暂时`缓存`，并`主动`告知 `AutoScaler` 进行`扩容`
   - 直到`成功扩容`出来函数实例，Activator 才会将缓存的流量`转发`到新生成的函数实例上

# 扩缩容模型

![image-20240321122235346](https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240321122235346.png)

