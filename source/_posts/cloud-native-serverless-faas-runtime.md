---
title: FaaS - Runtime
mathjax: false
date: 2023-02-12 00:06:25
cover: https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/faas-runtime.png
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

1. 一般的编程语言都有自身的运行时，运行时的主要职责是可以让`代码和机器交互`，进而实现业务逻辑
2. 函数计算运行时
   - 能够让`函数`在`机器`或者`容器`中执行起来，实现业务逻辑的`执行环境`
   - 通常由特定语言构建的`框架`构成
3. `函数计算运行时`依赖于`语言运行时`
4. 函数计算运行时的本质：让函数在容器中执行起来的`代码框架`

<!-- more -->

![image-20240327194438760](https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240327194438760.png)

1. 在`函数实例`初始化时，`函数计算运行时`一般会由一个`初始化进程`加载起来
2. 然后`函数计算运行时`就可以准备接收请求
3. 当请求到达后，业务代码会被对应的`语言运行时`中加载进来处理请求

> `Runtime` 是一个`特定语言`环境下的`服务框架`环境

1. 该服务将以一个`进程`的形态运行在`用户容器`中，并与用户代码相关联
2. 该服务启动后，会一直等待请求的到来，一旦请求到达后，Runtime 会`关联`业务代码去执行（`并发`）

# 原理

## 语言类型

### 编译型语言

1. C/C++/Go，在编译时将所有用到的静态依赖、源码一起打包，编译完后可以直接运行
2. Java，经过编译产生的字节码需要 JVM 再次将其转换为机器码，同时具有编译型和解释型的特性
   - 通常需要将所有依赖包打包成一个 jar 包或者 war 包，符合编译型语言的风格
3. 在开发函数时，需要`强依赖`平台提供的包
   - 需要将业务代码和运行时生成一个完整的二进制文件、jar 包或者 war 包

### 解释型语言

1. Python/Node.js，只需要通过解释器执行，可以做到业务代码与依赖`分离`

## Go Runtime

> 对于编译型语言，用户代码需要与运行时`一起编译`，云厂商一般会将编译型语言的运行时`开源`

![image-20240402151522386](https://serverless-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240402151522386.png)

### 获取请求

1. FaaS 平台提前将 `RUNTIME_API` 写到`环境变量`里
2. Runtime 会通过初始化客户端对象 runtimeAPIClient，从该`接口`中获得到请求

### 关联 UserHandler

1. UserHandler 在 Go Runtime 中
   - 是通过`反射机制`获取的，并将 UserHandler 封装到一个`统一格式`的结构体 `Handler` 中
2. 再将 `Handler` 作为 `Function` 结构体类型的一个`属性`进行赋值

### 调用 UserHandler

>  在获取`请求`和 `UserHandler` 后，可以使用上一步创建的 Function 对象去执行请求

## Python Runtime

> 运行时作为一个容器进程，不断地等待请求的到来，其`生命周期`和`函数容器实例`是保持一致的

```
root@s-62c8e50b-80f87072536d411b8914:/code# ps -ef
UID        PID  PPID  C STIME TTY          TIME CMD
user100+     1     0  0 02:16 pts/0    00:00:00 /var/fc/runtime/rloader
user100+     4     1  0 02:31 pts/0    00:00:00 /var/fc/lang/python3/bin/python3 -W ignore /var/fc/runtime/python3/bootstrap.py
root         6     0  0 02:31 ?        00:00:00 /bin/sh -c cd /code > /dev/null 2>&1 && COLUMNS=167; export COLUMNS; LINES=27; export LINES; TERM=xterm-256color; expor
root         7     6  0 02:31 ?        00:00:00 /bin/sh -c cd /code > /dev/null 2>&1 && COLUMNS=167; export COLUMNS; LINES=27; export LINES; TERM=xterm-256color; expor
root         8     7  0 02:31 ?        00:00:00 /usr/bin/script -q -c /bin/bash /dev/null
root         9     8  0 02:31 pts/0    00:00:00 sh -c /bin/bash
root        10     9  0 02:31 pts/0    00:00:00 /bin/bash
```

1. 1 号进程为函数实例启动的初始进程
2. 4 号进程是通过 1 号进程 `Fork` 出来的，即 `Python Runtime`
3. `bootstrap.py` 为 Python Runtime 的入口

> 核心流程

```python
def main():
    ......
    try:
        _init_log() # 日志初始化
        ...
        _set_global_concurrent_params() # 设置全局并发参数
        fc_api_addr = os.environ['FC_RUNTIME_API']
        fc_runtime_client = FcRuntimeClient(fc_api_addr) # 创建runtime client
        _sanitize_envs()
    except Exception as e:
        ...
        return
    # 等待请求
    ....
    while True:
        try:
            if global_concurrent_limit == 1:
                request = fc_runtime_client.wait_for_invocation()
            else:
                request = fc_runtime_client.wait_for_invocation_unblock()
            ...
            handler = FCHandler(request, fc_runtime_client) # 获取函数入口函数
            if global_concurrent_limit == 1:
                handler.handle_request() # 执行业务逻辑
            else:
                # 如果是多并发执行，则通过线程启动执行任务
                from threading import Thread
                Thread(target=handler.handle_request).start()
        except Exception as e:
             ...
```

1. 服务初始化
   - 日志初始化、设置并发模式下的全局参数
   - 通过环境变量 `FC_RUNTIME_API` 对应的服务地址，构造之后获取请求的`客户端`
2. 获取请求
   - 使得客户端不断获取请求信息
3. 根据请求信息执行用户代码
   - 在多并发情况下，`Python` 使用`线程`，而 `Go` 使用的是`协程`

