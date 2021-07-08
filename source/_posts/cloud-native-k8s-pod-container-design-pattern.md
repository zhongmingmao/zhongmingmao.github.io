---
title: Kubernetes -- Pod + 容器设计模式
mathjax: false
date: 2021-07-08 09:47:56
categories:
	- Cloud Native
	- Kubernetes
	- Alibaba
tags:
	- Cloud Native
	- Kubernetes
	- Alibaba
---

# 基本概念

## 容器 ► Pod  ► Kubernetes

1. 容器：一个**视图被隔离、资源受限制**的**进程**
   - 容器 **PID=1** 的进程为**应用本身**（**管理容器 = 管理应用**）
2. Pod：**进程组**
3. Kubernetes：**操作系统**
   - 容器镜像：**软件安装包**

## 进程组

1. **容器是单进程模型**（**容器 == 应用 == 进程**，只能管理 PID=1 的进程，并不是说容器内只能运行一个进程）
   - 容器内 PID=1 的进程为应用进程，本身不具备**进程管理能力**
   - 如果将 PID=1 的进程改为 systemd，导致：**管理容器 = 管理systemd != 管理应用**
2. 因此需要引入 Pod

<!-- more -->

![image-20210708215958861](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210708215958861.png)

## 原子调度单位

**紧密协作**：必须**部署在同一台机器**上并**共享某些信息**

![image-20210708220525758](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210708220525758.png)

## 关系

1. **亲密关系 -- 调度解决**
   - 两个应用（Pod）需要运行在**同一台宿主机**上
2. **超亲密关系 -- Pod 解决**
   - 会发生直接的**文件交换**
   - 使用 localhost 或者 Socket 文件进行**本地通信**
   - 会发生非常频繁的 RPC 调用
   - 会共享某些 Linux Namespace

# 实现机制

## 解决的问题

1. 让 Pod 里的多个容器之间最高效地**共享**资源和数据
2. 容器之间原本是被 **Linux Namespace** 和 **cgroups** 隔离开的

## 共享网络

Infra Container 会**第一个启动**，单独更新某一个镜像不会导致 Pod 重建或重启

![image-20210708222415286](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210708222415286.png)

## 共享存储

Volume 的定义是 **Pod 级别**的

![image-20210708222906152](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210708222906152.png)

# 容器设计模式 -- Sidecar

## InitContainer

![image-20210708223728196](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210708223728196.png)

## Sidecar

1. 通过在 Pod 里定义**专门容器**，来执行主业务容器需要的**辅助**工作（日志收集、应用监控等）
2. 将辅助功能与主业务容器**解耦**，实现**独立发布**和**能力重用**

### 日志收集容器

![image-20210708224328159](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210708224328159.png)

### 代理容器

![image-20210708224419289](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210708224419289.png)

### 适配器容器

![image-20210708224527972](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210708224527972.png)

# 参考资料

1. [CNCF × Alibaba 云原生技术公开课](https://edu.aliyun.com/course/1651)