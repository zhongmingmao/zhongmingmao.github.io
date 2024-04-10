---
title: FaaS - WebIDE
mathjax: false
date: 2023-02-14 00:06:25
cover: https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/webide.jpeg
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

# 架构

![image-20240410011658451](https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240410011658451.png)

<!-- more -->

## 组成

1. 蓝色部分
   - WebIDE `客户端`的核心
   - Run `VS Code` on any machine anywhere and access it in the `browser`
2. 绿色部分
   - 将 WebIDE `与 FaaS 结合`的核心
3. 橘色部分
   - `Serverless` 形态下的必备`支撑`服务

## 过程

1. 用户在 VS Code 的前端页面向后端发出函数在线编辑的请求
   - 服务端，即 `FaaS` 的 `Controller` 在接收到请求并验证权限后，再转给 VS Code Server `容器实例`
2. VS Code Server 容器实例会`获取用户代码`，然后再加载 FaaS 的`资源调度系统`
   - 根据目前 Container Pool 中的资源现状，动态扩缩容 WebIDE Pod 资源
3. VS Code Server 根据用户请求，会调用 `Serverless Extension BE`
   - 基于此时语言的环境，执行操作，并将执行结果返回给 Client 端

## 注意

1. 可以将 Serverless Extension `插件`提前集成在 VS Code Server 的镜像中
2. FaaS Runtime 依据原来函数计算执行的架构来部署即可
   - 可以将各语言运行时打包成一个镜像，然后以`动态挂载`的方式加载
   - 也可以集成在一个`大镜像`中
3. 健康检测主要是监听 `VS Code Server` 的状态
   - 网页版的服务都在服务端运行
   - 界面 Client 和后台 Server 是有`心跳关联`的
   - 心跳检测：按照一定的逻辑判断`页面是否不再使用`，以便于通知资源调度服务，`释放`后端的容器实例

## 功能

1. 基于一个可视化在线编辑软件的基础
2. 增加了 FaaS 的`插件`功能
3. 通过集成`运行时环境依赖`和`弹性伸缩`的能力
4. 提供用户在线`编辑`、`调试`、`部署`、`运行`函数的能力

# Serverless Extension

1. 云厂商基于 WebIDE，并通过开发插件 `Extension` 的方式`集成`了函数平台的`常用功能`
2. 云厂商的 VS Code 插件底层实现都集成了自身的 `CLI` 和 `SDK`
3. 云厂商的插件放在了 Visual Studio Marketplace
4. 插件只是一个`客户端`，具体功能由函数计算平台的 CLI 和 SDK 来实现
   - 端的 UI 层逻辑，集成在 VS Code 中
   - CLI 和 SDK 的集成，用于真正执行相关命令，在服务端容器中执行
5. 可以将 CLI、SDK、Serverless Extension、VS Code Server 打包在一起

![image-20240410220943662](https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240410220943662.png)

# 环境依赖

> 根据编程语言的不同特性，FaaS 需要针对不同语言制作不同的 Runtime

![image-20240410221159346](https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240410221159346.png)

# 弹性伸缩

1. 可以通过 KEDA、Prometheus、HPA、Metrics 来支撑 WebIDE 在 Kubernetes 环境下的动态扩缩容
2. `KEDA` 可以支持 `0-1` 之间的切换
3. 健康监测
   - 在 VS Code Server 中存在两个进程
     - `Server` 进程负责和前端页面进行`交互` - 一般采用 `WebSocket` 协议
     - `Status` 管理进程负责`状态管理上报`
   - WebIDE 前端和 Server 超过一定时间没有响应
     - 不会立马回收 VS Code Server 容器实例，而是会`重试连接`一定次数
     - 当连接成功，则继续使用该`容器实例`
     - 如果重试连接失败，则将容器实例`标记`为不可用状态，定期执行清理 - `0`
