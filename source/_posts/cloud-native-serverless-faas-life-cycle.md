---
title: FaaS - Life Cycle
mathjax: false
date: 2023-02-06 00:06:25
cover: https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240302141413852.png
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

# Serverless

## 概述

1. Serverless 是一种`架构设计理念`，并非一个具体的编程框架、类库或者工具
2. Serverless = `FaaS` + `BaaS`
3. `构建`和`运行`不需要`服务器管理`的应用程序
   - 描述一种`更细粒度`的`部署模型`
   - 将应用程序打包上传到 Serverless 平台，然后根据`实际需求`，执行、扩展和计费
4. Serverless 能够实现`业务`和`基础设施`的`分离`
   - 通过多种`服务器无感知`技术，将`基础设施`抽象成各种`开箱即用`的`服务`
   - 以 `API` 接口的方式提供给用户`按需调用`，真正做到`按需伸缩`、`按量收费`

<!-- more -->

![image-20240302140835700](https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240302140835700.png)

## 场景

> 形成了以`函数计算`、`弹性应用`、`容器服务`为核心的产品形态

1. 函数计算 - 面向`函数`
   - 用户只需关注函数层级的代码，用于解决轻量型、无状态、有时效的任务
2. Serverless 应用托管 - 面向`应用`
   - 应用只需要关注应用本身
   - 与微服务结合，融合应用治理、可观测
   - 降低了新应用的构建成本，老应用的适配改造成本
3. Serverless 应用服务 - 面向`容器`
   - 在不改变当前 `kubernetes` 的前提下，由于不再需要关注 `Node`，降低了维护成本

# FaaS Life Cycle

## 用户视角

![image-20240303171301917](https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240303171301917.png)

### 开发

![image-20240303172917723](https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240303172917723.png)

> 当有事件触发函数执行时，会先从 handler 方法开始执行

![image-20240303173301028](https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240303173301028.png)

### 上传

> 上传方式

1. 前端界面提交并保存
2. ZIP 包
   - 前端界面上传
   - 函数计算 API / SDK
   - CLI
   - 对象存储

### 执行

> 利用 API / SDK 调用、在前端界面手动点击、通过触发器来触发

1. FaaS 可以通过`事件触发器`打通众多的上下游服务，当触发源服务发出请求时，函数就会响应运行
2. HTTP 触发器
   - 当用户访问 HTTP 触发器的 URL 时，会向指定的云函数发出 HTTP 处理请求
   - 随后平台会启动一个`函数实例`来对请求进行处理

> 创建 HTTP 触发器

![image-20240303174744851](https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240303174744851.png)

![image-20240303174851089](https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240303174851089.png)

> 触发

```
$ curl https://aqaffnza1t67m.cfc-execute.bj.baidubce.com/hello/faas
Hello FaaS
```

> 只需关注开发的代码本身，无需关注环境的部署和维护

> FaaS 的最大特点：`弹性扩缩容` + 缩容至 `0` 的能力，如果没有调用函数，FaaS 是没有任何实例在计费的

1. 当创建上传函数后，并没有产生计费，只有产生`调用量`才会开始计费
2. 当流量达到一个阈值后，系统会`自动扩容`；当流量变小时，系统会`自动缩容`

## 平台视角

1. 事件的请求，首先会到达`路由服务`，路由服务在`缓存 Cache` 中查看是否有`准备就绪的实例`
2. 如果有就绪的实例，即`热启动`，直接使用该实例执行函数即可
3. 如果没有就绪的实例，即`冷启动` - 类似于 `Loading Cache`
   - 函数计算引擎会启动容器的初始化流程
     - 下载函数的代码包或者镜像
     - 准备网络环境
     - 加载 Runtime
   - 执行函数
   - 将实例信息放入到 Route Cache 中（下次请求过来时，可以进入热启动流程）
     - 执行完毕后，实例会保留一定时间（1 ~ 2 分钟），随后被回收

### 开发态

![image-20240304120849606](https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240304120849606.png)

1. 上传代码到 FaaS 平台后，后端服务会将代码包上传到`对象存储`中
   - 并将函数相关信息（函数代码链接、Runtime 信息、运行内存、超时时间等）存储起来
2. 再次修改函数相关信息，或者在线编写函数代码时，FaaS 平台会将存储好的代码和附属信息读取出来
3. 云厂商只支持`解释性`语言的`在线调试`和`编译`
   - 对于`编译型`语言，需要下载到`本地`进行开发（部分云厂商支持`端云联调`）

### 运行态

> 依据是否为`第一次请求`，分为`冷启动`和`热启动`；根据`流量大小`，会进行`动态扩缩容`

![image-20240304121546310](https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240304121546310.png)

#### 流量转发

> 热启动 / 冷启动

1. 当 `Route` 接收到请求后，首先会在自己的 `Cache` 里查看是否已经存在对应的函数实例信息
2. 如果有，根据信息，直接在 `Instance pool` 中获取执行实例，此时请求将以`热启动`的方式被执行
   - 当函数实例执行完成后，容器实例会保留 1~2 分钟
   - 如果此时触发执行函数，则无需新增实例和执行函数 Runtime 的挂载，直接`复用`，响应速度快很多
3. 如果没有，则会通过 `Activator` 来创建并申请一个实例，执行本次请求，随后将实例信息存储到 `Route Cache` 中 
   - 操作
     - 实例调度
     - 容器创建
     - 下载并解压代码
     - 准备函数执行环境
     - 挂载用户代码
     - VPC 网络准备
     - 初始化运行时和用户代码
   - 耗时主要因素
     - 不同语言的冷启动时间不同
     - 代码包大小
     - 容器创建速度和 VPC 网络的准备（主要取决于`云厂商`）
   - 用户优化方向
     - 精简代码包
     - 用`预热`请求的方式来确保代码实例`常驻`在容器池中
     - 选择冷启动时间较少的语言
     - 尽量选择较大的`内存`

#### 动态扩缩容

1. 扩缩容算法包含 `Node` 级别和 `Pod` 级别的扩缩容
2. `Node` 和 `Pod` 一般会监控自定义的指标，如果指标有变化，会进行相应的扩缩容操作
3. Kubernetes HPA
   - 通过安装 `metrics-server`，提供 HPA 和基础资源监控的能力
   - 对 CPU 和 Memory 等指标进行监控，保证其维持在可控的范围内
4. Node
   - 一般会根据 Node 的`整体使用率`，来判断 Node 数量是否需要扩容
   - 一旦需要扩缩容，会向 `Scheduler` 发送扩缩容请求，Scheduler 调用相关接口执行操作

#### Runtime

1. Runtime 是为函数提供`运行框架`，并真正执行函数的`进程`
2. 云厂商一般将不同语言的执行环境打包为`基础镜像`，也可以支持运行`自定义 Docker 镜像`
3. `解析型`语言
   - 通常开放一个 `handler` 的接口给开发者实现具体的业务逻辑
   - 当第一次请求到来时，运行时会通过`动态加载`的方式来调用业务实现的 `handler`
4. `编译型`语言
   - 引入 FaaS 平台提供的`代码库`，基于一套现成的`框架`来开发业务代码

