---
title: Kubernetes -- 架构 & 设计思想
mathjax: false
date: 2021-06-08 13:14:15
categories:
    - Cloud Native
    - Kubernetes
tags:
    - Cloud Native
    - Kubernetes
---

# 容器

1. 本质：由**Linux Namespace**、**Linux Cgroups**和**rootfs**三种技术构建出来的**进程的隔离环境**
2. 容器的视图
   - **静态**视图（**Container Image**）：一组联合挂载在`/var/lib/docker/aufs/mnt`上的**rootfs**
   - **动态**视图（**Container Runtime**）：由**Namespace+Cgroups**构成的隔离环境
3. 开发人员并不关心Container Runtime的差异，因为**承载容器信息进行传递**的，是**Container Image**

<!-- more -->

# Kubernetes

## 架构

![image-20210608152908509](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210608152908509.png)

1. 角色：**Master**（**控制**节点）、**Node**（**计算**节点）
2. Master
   - kube-**apiserver**：负责**API服务**，整个集群的**持久化数据**，由kube-apiserver处理后保存在**Etcd**中
   - kube-**scheduler**：负责**调度**
   - kube-**controller-manager**：负责**容器编排**
3. Node：**kubelet**，为最**核心**的组件
   - **CRI**，Container Runtime Interface
     - 主要负责与**Container Runtime**打交道
     - 只要Container Runtime能够运行**标准的Container Image**，就可以通过CRI接入到Kubernetes
     - Kubernetes并没有把Docker作为整体架构的核心，而**Docker**仅仅只是最底层的**Container Runtime的实现**
   - **OCI**，Open Container Initiative
     - 具体的Container Runtime（如Docker）与**底层的Linux**进行交互
     - OCI请求 --> Linux的系统调用（如Namespace、Cgroups等）
   - 通过**gRPC**协议与**Device Plugin**进行交互
     - Device Plugin：用来管理GPU（机器学习）等**宿主机上的物理设备**
   - **CNI**，Container **Networking** Interface
     - 调用网络插件来为容器**配置网络**
   - **CSI**，Container **Storage** Interface
     - 调用存储插件来为容器**配置持久化网络**

## 设计思想

1. Pod
   - Pod是Kubernetes中最基础的一个对象
   - Pod里面的容器**共享**同一个Network Namespace、同一组数据卷，从而达到**高效率交换信息**的目的
2. Service
   - 容器的IP地址等信息是不固定，**给Pod绑定一个Service**，Service声明的IP地址等信息是终生不变的
   - Service的主要作用：**作为Pod的代理入口**，代替Pod对外暴露一个固定的网络地址
3. **声明式API**
   - 通过一个**编排对象**（如Pod、Job、CronJob等），来描述你试图管理的应用
   - 为编排对象定义一些**服务对象**（如Service、Secret、Horizontal Pod Autoscaler等），会负责具体的**平台级**功能
   - 编排对象和服务对象都是Kubernetes的**API Object**

![image-20210608165018972](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210608165018972.png)

# 参考资料

[深入剖析Kubernetes](https://time.geekbang.org/column/intro/100015201)
