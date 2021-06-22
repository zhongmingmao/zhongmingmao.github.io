---
title: Kubernetes -- 应用开发视角
mathjax: false
date: 2021-06-22 10:45:47
categories:
    - Cloud Native
    - Kubernetes
tags:
    - Cloud Native
    - Kubernetes
---

# 云原生架构

## Cloud Native App

> **Applications** adopting the principles of **Microservices** packaged as **Containers** orchestracted by **Platforms** running on top of **Cloud infrastructure**, developed using practices such as **Continous Delivery** and **DevOps**.

## 云演进史

![](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210622110028983.png)

<!-- more -->

# Kubernetes

## 目标

 Kubernetes本质上是为了**简化微服务的开发和部署**，解决微服务的**公共关注点**

![image-20210622111530201](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210622111530201.png)

## 架构

![image-20210622111821371](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210622111821371.png)

1. 架构模式：**Master-Slave**
2. Node可以是**物理机**也可以是**虚拟机**
3. Master（为保证**HA**，Master也是**多节点**部署，但真正做**调度决策**的只有一个Master节点，因此涉及到**选主**）
   - **etcd**（**单独部署**）
     - 基于**KV**的**分布式存储**，底层采用**Raft**协议，保存Kubernetes的状态数据
   - **API Server**
     - 对外提供操作和获取Kubernetes集群资源的API，**唯一可以操作etcd的组件** -- 被Google和RedHat紧紧把控
   - **Scheduler**
     - Kubernetes集群的**大脑**，用于**调度决策**（如决定Pod分布在哪些Node上）
   - **Controller Manager**
     - Kubernetes**集群状态的协调者**
     - 观察集群目前的**实际状态**，对比**etcd中的预期状态**，如果不一致则进行**调谐**，达到**最终一致**（支持**Self Healing**）
4. Worker
   - **Container Runtime**
     - **下载镜像** + **运行容器**
   - **Pod**
     - **对容器的包装**
     - Kubernetes的**基本调度单位**
   - **kubelet**
     - 负责管理Worker节点上的组件，相当于一个**Agent**角色
     - 与Master节点上的API Server进行交互，**接收指令，执行操作**（如启停Pod，返回状态数据等）
     - Scheduler vs kubelet
       - **Scheduler：整个Kubernetes集群的大脑**
       - **kubelet：每个Worker节点上的小脑**
   - **kube-proxy**
     - 负责对Pod进行**IP寻址**和**负载均衡**，实现Service和服务发现抽象的关键，底层操作**iptables**规则
5. 操作Kubernetes集群的方式
   - kubectl、dashboard、sdks
6. 网络
   - **Overlay**网络（内部，**覆盖网络**）：**Pod之间通信**
   - Load Balander（外部）

## 基本概念

### Cluster

Node可以是**虚拟机**也可以是**物理机**，Node可以**按需添加**，Kubernetes是一个**超大型计算机**（所有Node的总和）

![image-20210622115458107](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210622115458107.png)

### Container

Container的本质是宿主机上的一个**进程**

![image-20210622115756179](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210622115756179.png)

### Pod

1. Pod（豌豆荚）是Kubernetes的**基本调度单位**，Pod里可以有一个或多个容器（**共享**Pod的**文件系统**和**网络**）
2. Kubernetes没有直接调度容器的原因
   - 需要**辅助容器**的场景（**Sidecar**）
   - **不与具体的容器技术绑定**，考虑替换成不同的容器技术

![image-20210622115919448](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210622115919448.png)

### 发布 & 服务

#### ReplicaSet

![image-20210622122414844](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210622122414844.png)

#### Service

1. Pod是不固定的，可能会重启，因此IP会发生变化
2. Service屏蔽了应用的**IP寻址**和**负载均衡**的细节，直接通过**服务名**访问服务

![image-20210622122630934](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210622122630934.png)

#### Deployment

ReplicaSet是基本的发布机制，Deployment是**高级的发布机制**（支持金丝雀发布、蓝绿发布等）

![image-20210622123059313](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210622123059313.png)

#### Rolling Update

![image-20210622123429625](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210622123429625.png)

#### 小结

Service是**服务间相互路由寻址**的概念

![image-20210622123707068](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210622123707068.png)

### ConfigMap & Secret



![image-20210622124040831](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210622124040831.png)

### DaemonSet

![image-20210622124256870](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210622124256870.png)

### PersistentVolume & PersistentVolumeClaims

![image-20210622124445579](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210622124445579.png)

![image-20210622124436167](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210622124436167.png)



### StatefulSet

1. **StatefulSet：有状态应用**
2. **ReplicaSet：无状态应用**

### Label & Selector

Label用于给Kubernetes资源**打标签**，Selector是通过Label**查询定位**Kubernetes资源的机制

![image-20210622124847890](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210622124847890.png)

### Namespace

Namespace是Kubernetes的**逻辑隔离**机制

![image-20210622125127499](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210622125127499.png)

### Probe

1. **Readiness** Probe（**就绪**探针）：判断**Pod**是否可以**接入流量**
2. **Liveness** Probe（**活跃**探针）：判断**Pod**是否**存活**

### 小结

| 概念                                    | 概念                                    |
| --------------------------------------- | --------------------------------------- |
| Cluster                                 | 超大计算机抽象，由节点组成              |
| Container                               | 应用居住和运行在容器中                  |
| Pod                                     | Kubernetes基本调度单位                  |
| ReplicaSet                              | 创建和管理Pod，支持无状态应用           |
| Service                                 | 应用Pods的访问点，屏蔽IP寻址和负载均衡  |
| Deployment                              | 管理ReplicaSet，支持滚动等高级发布机制  |
| ConfigMap/Secrets                       | 应用配置，Secret敏感数据配置            |
| DaemonSet                               | 保证每个节点有且仅有一个Pod，常见于监控 |
| StatefulSet                             | 类似 ReplicaSet，但支持有状态应用       |
| Job                                     | 运行一次就结束的任务                    |
| CronJob                                 | 周期性运行的任务                        |
| Volume                                  | 可装载磁盘文件存储                      |
| PersisentVolume/ PersistentVolumeClaims | 超大磁盘存储抽象和分配机制              |
| Label/Selector                          | 资源打标签和定位机制                    |
| Namespace                               | 资源逻辑隔离机制                        |
| Readiness Probe                         | 就绪探针，流量接入Pod判断依据           |
| Liveness Probe                          | 存活探针，是否kill Pod的判断依据        |

## 网络

### 节点网络 & Pod网络

![image-20210622130201306](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210622130201306.png)

1. 节点网络
   - 保证Kubernetes**节点之间**能够正常的做IP寻址和通信
   - 节点网络空间：**10.100.0.1/24**
2. Pod网络
   - **Pod网络构建在节点网络之上**（**覆盖网络**），用于保证**Pod之间**能够正常的做IP寻址和通信
   - Pod内部有一个或多个容器，这些容器**共享网络栈**（类似于**虚拟网卡**），容器之间通过**localhost**进行访问
   - **Pod的网络栈**由**Pause**容器创建
   - 实现Pod网络
     - 在每个节点上创建**虚拟网桥**（类似于**虚拟交换机**），并管理这些虚拟网桥的地址空间和分配
     - **修改路由器的路由规则**，使得不同节点上的Pod可以通信
     - 一个节点上的Pod都会挂在对应的虚拟网桥（cbr0）上，并获得IP地址
   - Pod网络空间：**10.0.0.0/14**
   - Pod A（10.0.1.2）访问Pod B（10.0.2.2）
     - Pod A的veth0（10.0.1.2）将请求转发到本节点的cbr0（10.0.1.1）
     - cbr0（10.0.1.1）发现10.0.2.2不在本节点，向上转发到eth0（10.100.0.2）
     - eth0（10.100.0.2）无法解析10.0.2.2，向上转发给router（10.100.0.1）
     - router（10.100.0.1）检查路由表，发现10.0.2.2命中第二条路由规则，转发给eth0（10.100.0.3）
     - eth0（10.100.0.3）认出该请求是可以由cbr0（10.0.2.1）处理，转发给cbr0（10.0.2.1）
     - cbr0（10.0.2.1）认出该请求对应Pod B，转发给veth0（10.0.2.2）

### Service网络

1. Service：**屏蔽Pod的地址变化** + 对Pod以**负载均衡**（**Service Name**）的方式访问
2. **Service网络**（没有具体的虚拟网络设备）是在**Pod网络**（有具体的虚拟网络设备）之上构建的网络

![image-20210622150448796](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210622150448796.png)

#### 用户空间代理模式

![image-20210622153850068](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210622153850068.png)

1. Kube-proxy工作在**用户空间代理模式**时，直接承担**请求转发**的职责
2. **服务注册发现**
   - Kubernetes发布一个Service，名称为service-test
     - Kubernetes为该Service分配一个Cluster IP（10.3.241.152），地址空间为10.3.240.0/20
     - 相关信息会通过**API Server**记录在**etcd**，后续Pod如果有变动，etcd中的信息也会变动
   -  Worker节点的kube-proxy会**监听**API Server上这些Service的信息变动，并且将信息**同步到netfilter**
     - 告知netfilter要对相关的IP进行包过滤，并**转发给kube-proxy**
3. **服务调用**
   -  通过本地的**DNS**（DNS同样也会监听Service的变化）查询这个Service的Cluster IP（10.3.241.152）
   - 将请求转发到本地Pod的veth0（10.0.2.3），veth0通过cbr0向eth0转发，转发过程中会**被netfilter截获**
   - netfilter将目标地址为10.3.241.152的请求转发给kube-proxy
   - kube-proxy会依据**负载均衡策略**选择一个Pod（10.0.2.2），然后通过eth0向10.0.2.2发送请求
4. 特点
   - 版本 ≤ Kubernetes **1.2**
   - netfilter（**内核空间**）转发请求到kube-proxy（**用户空间**），存在**开销**

#### iptables/ipvs模式

1. 性能更高，版本 ≥ Kubernetes **1.8**
2. kube-proxy的职责：将信息**同步**给netfilter

![image-20210622173549083](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210622173549083.png)

### NodePort vs LoadBalancer vs Ingress

1. 外部网络一般可以访问到节点网络，**Pod网络和Service网络属于Kubernetes的内部网络**
2. **Service通过kube-proxy暴露在节点网络上**
   - kube-proxy在节点上暴露一个**监听转发服务**，相当于在**节点网络**和**Service网络**之间搭了一座**桥**

![image-20210622174246300](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210622174246300.png)

NodePort：将Service暴露在**节点网络**上

![image-20210622175323420](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210622175323420.png)

Load Balancer：具有公网IP + 负载均衡 -- 付费

![image-20210622175511637](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210622175511637.png)

![image-20210622175724139](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210622175724139.png)

### 小结

|              | 作用                                               | 实现                                   |
| ------------ | -------------------------------------------------- | -------------------------------------- |
| 节点网络     | Master/Worker节点之间网络互通                      | 路由器、交换机、网卡                   |
| Pod网络      | Pod之间互通                                        | 虚拟网卡、虚拟网桥、路由器             |
| Service网络  | 屏蔽Pod地址变化 + 负载均衡                         | kube-proxy、netfilter、API Server、DNS |
| NodePort     | 将Service暴露在节点网络                            | kube-proxy、netfilter                  |
| LoadBalancer | 将Service暴露在公网上 + 负载均衡                   | 公有云LB + NodePort                    |
| Ingress      | 反向路由、安全、日志监控<br />类似于反向代理、网关 | Nginx、Envoy、Traefik、Faraday         |

# 参考资料

1. [Spring Boot与Kubernetes云原生微服务实践](https://time.geekbang.org/course/intro/100031401)
