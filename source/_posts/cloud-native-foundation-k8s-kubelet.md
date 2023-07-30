---
title: Kubernetes - Kubelet
mathjax: false
date: 2022-12-06 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/kubernetes-architecture.webp
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
---

# 架构

> 每个 `Node` 上运行一个 `Kubelet` 服务进程，默认监听 `10250` 端口

![image-20230726223546086](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230726223546086.png)

<!-- more -->

1. 接收并执行 `Master` 的指令
2. 管理 Pod 以及 Pod 中的容器
3. 在 API Server 注册 Node 信息，定期向 Master 汇报 Node 的资源使用情况
   - 通过 `cAdvisor` 监控 Node 和容器的资源
   - `cAdvisor` 通过 `Cgroups` 收集并上报容器的`资源用量`

# Node 管理

> Node `自注册` + Node `状态更新`

1. `自注册模式`：Kubelet 通过启动参数 `--register-node` 来确定是否向 `API Server` 注册
2. Kubelet `没有选择`自注册模式
   - 用户需要`自己配置` Node 资源信息
   - 告知 Kubelet 集群上的 API Server 的位置
3. Kubelet `选择`自注册模式
   - Kubelet `定时`向 `API Server` 发送 Node 信息
   - API Server 在接收到 Node 信息后，转存到 `etcd`

# Pod 管理

> `syncLoop` - Kubelet 本身也是`控制器模式`

> computePodActions - 比对 `Pod Manifest` 和`实际 Pod` 的`差异`，来决定 Action

> `PLEG` - Pod Lifecycle `Event` Generator - 上报给 `API Server` - relist 间隔 `1 秒`执行 1 次

![image-20230726224202345](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230726224202345.png)

> 获取 Pod 清单的 4 种方式

| Type | Method          | Desc                                                         |
| ---- | --------------- | ------------------------------------------------------------ |
| Pull | `File`          | `20 秒`检查一次<br />启动参数 `--config` 指定的配置目录下的文件<br />默认为 `/etc/kubernetes/manifests` |
| Pull | `HTTP Endpoint` | `20 秒`检查一次<br />启动参数 `--manifest-url` 设置          |
| Push | `API Server`    | 通过 `API Server` 监听 `etcd` 目录，同步 Pod 清单            |
| Push | `HTTP Server`   | Kubelet 监听 HTTP 请求，并响应简单的 API 以提交新的 Pod 清单 |

# Pod 启动流程

![image-20230726231845153](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230726231845153.png)

> `CSI -> CRI -> CNI`
> WaitForAttachAndMount -- `CSI`

![image-20230726232153080](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230726232153080.png)

> pause - `SandBox Container` - Sleep `Indefinitely` - 非常`巧妙`和`优雅`的设计

1. 同一个 Pod 内的多个容器共享某些资源，`SandBox Container` 作为`底座` 
   - `不消耗 CPU 资源，且极度稳定`
2. `Init Container` 和`主 Container`在运行时就需要`网络就绪`的前提
   - 将 `Network Namespace` 关联到 `SandBox Container`，即便`主 Container` Crash，Pod 网络依然是`稳定`的

```
$ k get po
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-6799fc88d8-hnc4t   1/1     Running   0          8s

$ docker ps | grep nginx-deployment-6799fc88d8-hnc4t
b0a5c9f75cde   nginx                                               "/docker-entrypoint.…"   About a minute ago   Up About a minute             k8s_nginx_nginx-deployment-6799fc88d8-hnc4t_default_609b3480-9295-436f-8eae-d3035ba6d245_0
9a49744d3877   registry.aliyuncs.com/google_containers/pause:3.5   "/pause"                 About a minute ago   Up About a minute             k8s_POD_nginx-deployment-6799fc88d8-hnc4t_default_609b3480-9295-436f-8eae-d3035ba6d245_0
```
