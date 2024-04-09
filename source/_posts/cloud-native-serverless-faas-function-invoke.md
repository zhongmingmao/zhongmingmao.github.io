---
title: FaaS - Function Invoke
mathjax: false
date: 2023-02-13 00:06:25
cover: https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/faas-function-invoke.jpeg
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

# 函数拆分

1. 成本
   - 云函数的收费：`调用次数`、`公网流量`、`占用资源时间`（最贵）
2. 复用
   - `组件化`
3. 性能
   - 对于`非串行`的功能，拆分成多个函数可以提高`并发性`

<!-- more -->

# 调用方式

> 同步、异步、编排（具有调度和管理的语义）

![image-20240409121245256](https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240409121245256.png)

## 同步

> 需要注意调用`延迟`和`超时`带来的`费用成本`

### 直接调用

> 使用云厂商提供的 SDK，调用指定的函数，实现直接调用

```python
import fc2
client = fc2.Client(
               endpoint='<Your Endpoint>',
               accessKeyID='<Your AccessKeyID>',
               accessKeySecret='<Your AccessKeySecret>')

// 同步调用
client.invoke_function('service_name', 'function_name')
```

### 网关调用

1. 通过 API 网关调用函数，借助 API 网关来达到限流等功能
2. 两个`功能模块`之间的调用，可以选择`网关调用`，而`业务内部`的函数调用，选择`直接调用`

### 借助触发器

1. 在 FaaS 平台构建好`函数`和`HTTP 触发器`，在自身平台通过 `HTTP 请求`来使用函数计算

## 异步

### 直接异步调用

1. 通过 SDK 调用，指定是否为异步调用
2. 函数会`立马返回`，不会关心被调用函数的执行情况，由`平台保证`可靠地执行
3. 优劣
   - 优点 - 增大并发 + 节省成本
   - 确定 - 不实时

```python
// 异步调用函数。
client.invoke_function('service_name', 'function_name', headers = {'x-fc-invocation-type': 'Async'})
```

### 异步策略配置

1. 云厂商让用户快速实现对函数的处理结果、异常等方面的`再次处理`而提供的能力
2. 配置最大重试次数
3. 依据成功或者失败，调用其它云函数、消息队列等

### 借助介质触发

> 函数计算 -> `胶水语言`

![image-20240410000327474](https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240410000327474.png)

## 编排

> Serverless 工作流适合用于解决复杂、执行流程长、有状态、多步骤的、并发聚合的业务流程

![image-20240410000921150](https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240410000921150.png)

1. Serverless 工作流，可以通过`顺序`、`分支`、`并行`的方式来协调一个或多个分布式任务
   - 分布式任务可以是`函数`、`服务`、`应用`等形式
2. 适用场景
   - `长`流程
   - `事务型`业务流程
   - `并发型`业务流程
   - 需要`状态全链路检测`的场景
     - Serverless 工作流配备了可观测、执行记录等`可视化`功能
