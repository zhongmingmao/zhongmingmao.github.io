---
title: FaaS - Advanced Attributes
mathjax: false
date: 2023-02-08 00:06:25
cover: https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/what-is-faas.png
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

# 公共能力

1. 将函数依赖的公共库提炼到`层`，以减少部署、更新时的代码包体积
2. 对于支持层功能的运行时，函数计算会将特定的目录添加到运行时语言的依赖包搜索路径中
3. 对于`自定义层`，需要将所有内容打包到一个`压缩包`，并上传到函数计算平台
   - 函数计算运行时会将层的内容`解压`并部署到特定的目录
4. 层功能的好处
   - 函数`程序包更小`
   - 避免在制作函数 zip 包和依赖项过程中出现未知的`错误`
   - 可以在多个函数中引入使用，减少不必要的`存储资源浪费`

<!-- more -->

![image-20240315121828521](https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240315121828521.png)

1. 上传层之后，函数计算会将层的 zip 包上传到`对象存储`
2. 当调用函数执行时，会从对象存储中下载层的 zip 包并解压到特定目录
3. 应用程序只需要访问特定目录，就能读取层的依赖和公共代码

> 注意：`后序`的层会`覆盖`相同目录下的文件

# 快速迭代

> 标准运行时 / 自定义镜像

1. 函数计算系统初始化执行环境之前，会扮演该函数的服务角色，获得临时用户名和密码并拉取镜像
2. 镜像拉取成功后，会根据指定的启动命令、参数和端口，启动自定义的 HTTP Server
   - 该 HTTP Server 会`接管`函数计算系统所有请求的调用

> 调用方式不同：`事件函数` / `HTTP 函数`

![image-20240315122705414](https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240315122705414.png)

1. 在创建函数之前，需要基于自身业务实现一个 HTTP Server，并将其打包成镜像，上传到镜像仓库，供函数计算使用
   - 建议基于 `HTTP` 和`事件`的触发方式，实现相应的接口功能
   - 需要根据接口协议规范，实现请求 Header 和 Body 中值的解析和处理
   - 上传镜像时，需要指定容器的启动命令 Command、参数 Args、监听端口 Port
   - 推荐实现一个 Healthz 函数，用于健康监测
2. 创建一个函数，只需要设置函数运行相关的基本属性，再`关联`上一步构建的`镜像`即可
3. 根据业务场景，选择合适的触发方式来请求函数计算平台
4. 通过 HTTP 触发器进行请求
   - 自定义镜像是 HTTP Server 的形式
   - 如果是首次启动，函数计算平台会从镜像仓库拉取自定义镜像，并启动容器
5. 函数计算服务控制器会将收到的请求，调度到对应的 HTTP Server，由 HTTP Server `接管`后续的服务处理

# 流量切换

> 函数计算支持为发布的函数版本创建`别名`（指向特定`版本`的`指针`），可以设置主版本和新版本的`流量比例`

![image-20240315194554646](https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240315194554646.png)

# 削峰容灾

> 通过 MQ，先引入突增的流量，然后通过后端调度系统调度给云函数处理

![image-20240315195503752](https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240315195503752.png)

> 云厂商一般都做了`同步重试`和`异步延时重试`的策略
> 针对异步信息：引入`递增重试机制`和`容灾队列`

![image-20240315200434628](https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240315200434628.png)
