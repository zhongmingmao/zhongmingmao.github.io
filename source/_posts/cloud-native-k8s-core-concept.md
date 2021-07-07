---
title: Kubernetes -- 核心概念
mathjax: false
date: 2021-07-07 20:39:29
categories:
	- Cloud Native
	- Kubernetes
	- Alibaba
tags:
	- Cloud Native
	- Kubernetes
	- Alibaba
---

# 核心功能

1. Kubernetes是**工业级**容器编排平台，源于希腊语，意为『**舵手**』、『**飞行员**』
2. Kubernetes是**自动化**的容器编排平台：**部署**、**弹性**、**管理**
3. 核心功能
   - **服务发现与负载均衡**
   - **容器自动装箱**（调度）
   - **存储编排**
   - **自动容器恢复**
   - **自动发布与回滚**
   - **配置与密文管理**
   - **批量执行**（Job）
   - **水平伸缩**（弹性）

<!-- more -->

## 调度

**Placement**（红色容器）：调度器观察正在被调度容器的大小，为其寻找一个能满足其资源需求的节点

![image-20210707205557763](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210707205557763.png)

![image-20210707205717525](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210707205717525.png)

## 自动恢复

 将失败节点上的容器**迁移**到健康节点

![image-20210707210151990](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210707210151990.png)

![image-20210707210223683](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210707210223683.png)

## 水平伸缩

![image-20210707210457129](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210707210457129.png)

![image-20210707210536576](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210707210536576.png)

# 架构

![image-20210707210838844](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210707210838844.png)

## Master

![image-20210707210910037](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210707210910037.png)

| 组件       | 职责                                                         | 扩展性       |
| ---------- | ------------------------------------------------------------ | ------------ |
| API Server | 用来处理 API 操作<br />Kubernetes中所有组件都会与 API Server 进行连接<br />组件与组件之间一般不进行独立的连接，依赖于 API Server 进行消息的传送 | **水平扩展** |
| Controller | 用来完成**集群状态**的管理（如自动恢复、水平扩张等）         | **热备**     |
| Scheduler  | 用来完成调度操作                                             | **热备**     |
| etcd       | 分布式存储系统，用来存储 **API Server** 所需要的元数据<br />本身为**高可用系统**，可以保证 Master 组件的高可用性 |              |

## Node

1. Node：真正运行**业务负载**（以 **Pod** 形式运行）
2. 组件
   - **Kubelet**（最核心）：通过 API Server 接收到 **Pod 的目标运行状态**，提交到Contrainer Runtime
   - Contrainer Runtime：在 OS 中创建容器运行所需要的运行环境，并把容器运行起来
   - Storage Plugin + Network Plugin
   - Kube-proxy：通过 **iptables** 组建 **Kubernetes 自身的 Network**

![image-20210707210928299](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210707210928299.png)

## 交互过程

1.  用户通过 UI/CLI 提交一个 Pod 给 API Server
2. API Server 将信息写入到 etcd
3. Scheduler 通过 API Server的 Watch/Notification 机制得到该信息：有一个 Pod 需要被调度
4. Scheduler 根据自身的内存状态做出一次调度决策，然后向 API Server 汇报：该 Pod 需要被调度到某个 Node 上
5. API Server 接收到汇报后，会将相关信息写入到 etcd
6. API Server 会通知相应 Node 进行 Pod 的真正启动执行
7. 相应 Node 的 Kubelet 组件会得到通知，Kubelet 会调用 Container  runtime 来真正启动和配置容器和容器的运行环境

![image-20210707213634383](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210707213634383.png)

# 核心概念 + API

## 核心概念

### Pod

共享的网络环境：容器之间可以通过 **localhost** 来互相访问

![image-20210707214939753](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210707214939753.png)

### Volume

![image-20210707215224395](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210707215224395.png)

### Deployment

![image-20210707215409543](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210707215409543.png)

### Service

![image-20210707215610447](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210707215610447.png)

### Namespaces

![image-20210707215817551](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210707215817551.png)

## API

### 基础知识

![image-20210707220222994](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210707220222994.png)

### Label

1. 一组 Key:Value
2. 可以被 Selector 所查询：Select color=red
3. **资源集合**的默认表达形式：例如 Service 对应的一组 Pod

![image-20210707220539241](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210707220539241.png)

# 实践

## 启动 MiniKube

```
$ minikube start --driver=virtualbox --kubernetes-version=1.15.5
😄  minikube v1.18.1 on Darwin 10.12.6
✨  Using the virtualbox driver based on user configuration
👍  Starting control plane node minikube in cluster minikube
🔥  Creating virtualbox VM (CPUs=2, Memory=4000MB, Disk=20000MB) ...
    > kubelet.sha1: 41 B / 41 B [----------------------------] 100.00% ? p/s 0s
    > kubectl.sha1: 41 B / 41 B [----------------------------] 100.00% ? p/s 0s
    > kubeadm.sha1: 41 B / 41 B [----------------------------] 100.00% ? p/s 0s
    > kubeadm: 38.33 MiB / 38.33 MiB [---------------] 100.00% 2.29 MiB p/s 17s
    > kubectl: 41.00 MiB / 41.00 MiB [---------------] 100.00% 1.87 MiB p/s 22s
    > kubelet: 114.14 MiB / 114.14 MiB [-------------] 100.00% 3.56 MiB p/s 32s

    ▪ Generating certificates and keys ...
    ▪ Booting up control plane ...
    ▪ Configuring RBAC rules ...
🔎  Verifying Kubernetes components...
    ▪ Using image registry.cn-hangzhou.aliyuncs.com/google_containers/storage-provisioner:v4 (global image repository)
🌟  Enabled addons: storage-provisioner, default-storageclass
🏄  Done! kubectl is now configured to use "minikube" cluster and "default" namespace by default
```

```
$ kubectl get pods -A
NAMESPACE     NAME                               READY   STATUS    RESTARTS   AGE
kube-system   coredns-6967fb4995-txg76           1/1     Running   1          2m25s
kube-system   etcd-minikube                      1/1     Running   0          83s
kube-system   kube-apiserver-minikube            1/1     Running   0          102s
kube-system   kube-controller-manager-minikube   1/1     Running   0          92s
kube-system   kube-proxy-qmkjk                   1/1     Running   0          2m26s
kube-system   kube-scheduler-minikube            1/1     Running   0          103s
kube-system   storage-provisioner                1/1     Running   1          2m40s
```

```
$ minikube status
minikube
type: Control Plane
host: Running
kubelet: Running
apiserver: Running
kubeconfig: Configured
timeToStop: Nonexistent
```

```
$ kubectl get nodes
NAME       STATUS   ROLES    AGE     VERSION
minikube   Ready    master   3m27s   v1.15.5
```

```
$ kubectl get deployments
No resources found.

$ kubectl get --watch deployments
```

## YAML 文件

```yaml deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  selector:
    matchLabels:
      app: nginx
  replicas: 2 # tells deployment to run 2 pods matching the template
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:1.14.2
          ports:
            - containerPort: 80
```

```yaml deployment-update.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  selector:
    matchLabels:
      app: nginx
  replicas: 2
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:1.16.1 # Update the version of nginx from 1.14.2 to 1.16.1
          ports:
            - containerPort: 80
```

```yaml deployment-scale.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  selector:
    matchLabels:
      app: nginx
  replicas: 4 # Update the replicas from 2 to 4
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:1.14.2
          ports:
            - containerPort: 80
```

## 提交

```
$ kubectl apply -f deployment.yaml
deployment.apps/nginx-deployment created
```

```
$ kubectl get --watch deployments
NAME               READY   UP-TO-DATE   AVAILABLE   AGE
nginx-deployment   0/2   0     0     0s
nginx-deployment   0/2   0     0     0s
nginx-deployment   0/2   0     0     0s
nginx-deployment   0/2   2     0     0s
nginx-deployment   1/2   2     1     100s
nginx-deployment   2/2   2     2     107s
```

>deployment.kubernetes.io/revision: **1**
>NewReplicaSet:   nginx-deployment-**7fd6966748** (2/2 replicas created)

```
$ kubectl describe deployment nginx-deployment
Name:                   nginx-deployment
Namespace:              default
CreationTimestamp:      Wed, 07 Jul 2021 23:37:59 +0800
Labels:                 <none>
Annotations:            deployment.kubernetes.io/revision: 1
                        kubectl.kubernetes.io/last-applied-configuration:
                          {"apiVersion":"apps/v1","kind":"Deployment","metadata":{"annotations":{},"name":"nginx-deployment","namespace":"default"},"spec":{"replica...
Selector:               app=nginx
Replicas:               2 desired | 2 updated | 2 total | 2 available | 0 unavailable
StrategyType:           RollingUpdate
MinReadySeconds:        0
RollingUpdateStrategy:  25% max unavailable, 25% max surge
Pod Template:
  Labels:  app=nginx
  Containers:
   nginx:
    Image:        nginx:1.14.2
    Port:         80/TCP
    Host Port:    0/TCP
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
Conditions:
  Type           Status  Reason
  ----           ------  ------
  Available      True    MinimumReplicasAvailable
  Progressing    True    NewReplicaSetAvailable
OldReplicaSets:  <none>
NewReplicaSet:   nginx-deployment-7fd6966748 (2/2 replicas created)
Events:
  Type    Reason             Age    From                   Message
  ----    ------             ----   ----                   -------
  Normal  ScalingReplicaSet  7m57s  deployment-controller  Scaled up replica set nginx-deployment-7fd6966748 to 2
```

## 升级

```
$ kubectl apply -f deployment-update.yaml
deployment.apps/nginx-deployment configured
```

```
$ kubectl get --watch deployments
NAME               READY   UP-TO-DATE   AVAILABLE   AGE
nginx-deployment   0/2   0     0     0s
nginx-deployment   0/2   0     0     0s
nginx-deployment   0/2   0     0     0s
nginx-deployment   0/2   2     0     0s
nginx-deployment   1/2   2     1     100s
nginx-deployment   2/2   2     2     107s
nginx-deployment   2/2   2     2     9m22s
nginx-deployment   2/2   2     2     9m22s
nginx-deployment   2/2   0     2     9m22s
nginx-deployment   2/2   1     2     9m22s
nginx-deployment   3/2   1     3     9m46s
nginx-deployment   2/2   1     2     9m46s
nginx-deployment   2/2   2     2     9m46s
nginx-deployment   3/2   2     3     9m47s
nginx-deployment   2/2   2     2     9m47s
```

> deployment.kubernetes.io/revision: **2**
> NewReplicaSet:   nginx-deployment-**6f9d665859** (2/2 replicas created)

```
$ kubectl describe deployment nginx-deployment
Name:                   nginx-deployment
Namespace:              default
CreationTimestamp:      Wed, 07 Jul 2021 23:37:59 +0800
Labels:                 <none>
Annotations:            deployment.kubernetes.io/revision: 2
                        kubectl.kubernetes.io/last-applied-configuration:
                          {"apiVersion":"apps/v1","kind":"Deployment","metadata":{"annotations":{},"name":"nginx-deployment","namespace":"default"},"spec":{"replica...
Selector:               app=nginx
Replicas:               2 desired | 2 updated | 2 total | 2 available | 0 unavailable
StrategyType:           RollingUpdate
MinReadySeconds:        0
RollingUpdateStrategy:  25% max unavailable, 25% max surge
Pod Template:
  Labels:  app=nginx
  Containers:
   nginx:
    Image:        nginx:1.16.1
    Port:         80/TCP
    Host Port:    0/TCP
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
Conditions:
  Type           Status  Reason
  ----           ------  ------
  Available      True    MinimumReplicasAvailable
  Progressing    True    NewReplicaSetAvailable
OldReplicaSets:  <none>
NewReplicaSet:   nginx-deployment-6f9d665859 (2/2 replicas created)
Events:
  Type    Reason             Age   From                   Message
  ----    ------             ----  ----                   -------
  Normal  ScalingReplicaSet  10m   deployment-controller  Scaled up replica set nginx-deployment-7fd6966748 to 2
  Normal  ScalingReplicaSet  58s   deployment-controller  Scaled up replica set nginx-deployment-6f9d665859 to 1
  Normal  ScalingReplicaSet  34s   deployment-controller  Scaled down replica set nginx-deployment-7fd6966748 to 1
  Normal  ScalingReplicaSet  34s   deployment-controller  Scaled up replica set nginx-deployment-6f9d665859 to 2
  Normal  ScalingReplicaSet  33s   deployment-controller  Scaled down replica set nginx-deployment-7fd6966748 to 0
```

## 扩容

```
$ kubectl apply -f deployment-scale.yaml
deployment.apps/nginx-deployment configured
```

```
$ kubectl get --watch deployments
NAME               READY   UP-TO-DATE   AVAILABLE   AGE
nginx-deployment   0/2   0     0     0s
nginx-deployment   0/2   0     0     0s
nginx-deployment   0/2   0     0     0s
nginx-deployment   0/2   2     0     0s
nginx-deployment   1/2   2     1     100s
nginx-deployment   2/2   2     2     107s
nginx-deployment   2/2   2     2     9m22s
nginx-deployment   2/2   2     2     9m22s
nginx-deployment   2/2   0     2     9m22s
nginx-deployment   2/2   1     2     9m22s
nginx-deployment   3/2   1     3     9m46s
nginx-deployment   2/2   1     2     9m46s
nginx-deployment   2/2   2     2     9m46s
nginx-deployment   3/2   2     3     9m47s
nginx-deployment   2/2   2     2     9m47s
nginx-deployment   2/4   2     2     12m
nginx-deployment   2/4   2     2     12m
nginx-deployment   2/4   0     2     12m
nginx-deployment   2/4   0     2     12m
nginx-deployment   2/4   1     2     12m
nginx-deployment   2/4   1     2     12m
nginx-deployment   2/4   1     2     12m
nginx-deployment   2/4   2     2     12m
nginx-deployment   2/4   2     2     12m
nginx-deployment   3/4   2     3     12m
nginx-deployment   4/4   2     4     12m
nginx-deployment   4/4   2     4     12m
nginx-deployment   4/4   2     4     12m
nginx-deployment   3/4   2     3     12m
nginx-deployment   4/4   3     4     12m
nginx-deployment   4/4   3     4     12m
nginx-deployment   4/4   3     4     12m
nginx-deployment   3/4   3     3     12m
nginx-deployment   3/4   4     3     12m
nginx-deployment   4/4   4     4     12m
nginx-deployment   4/4   4     4     12m
nginx-deployment   3/4   4     3     12m
nginx-deployment   4/4   4     4     12m
```

> deployment.kubernetes.io/revision: **3**
> NewReplicaSet:   nginx-deployment-**7fd6966748** (4/4 replicas created)

```
$ kubectl describe deployment nginx-deployment
Name:                   nginx-deployment
Namespace:              default
CreationTimestamp:      Wed, 07 Jul 2021 23:37:59 +0800
Labels:                 <none>
Annotations:            deployment.kubernetes.io/revision: 3
                        kubectl.kubernetes.io/last-applied-configuration:
                          {"apiVersion":"apps/v1","kind":"Deployment","metadata":{"annotations":{},"name":"nginx-deployment","namespace":"default"},"spec":{"replica...
Selector:               app=nginx
Replicas:               4 desired | 4 updated | 4 total | 4 available | 0 unavailable
StrategyType:           RollingUpdate
MinReadySeconds:        0
RollingUpdateStrategy:  25% max unavailable, 25% max surge
Pod Template:
  Labels:  app=nginx
  Containers:
   nginx:
    Image:        nginx:1.14.2
    Port:         80/TCP
    Host Port:    0/TCP
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
Conditions:
  Type           Status  Reason
  ----           ------  ------
  Available      True    MinimumReplicasAvailable
  Progressing    True    NewReplicaSetAvailable
OldReplicaSets:  <none>
NewReplicaSet:   nginx-deployment-7fd6966748 (4/4 replicas created)
Events:
  Type    Reason             Age                From                   Message
  ----    ------             ----               ----                   -------
  Normal  ScalingReplicaSet  4m38s              deployment-controller  Scaled up replica set nginx-deployment-6f9d665859 to 1
  Normal  ScalingReplicaSet  4m14s              deployment-controller  Scaled down replica set nginx-deployment-7fd6966748 to 1
  Normal  ScalingReplicaSet  4m14s              deployment-controller  Scaled up replica set nginx-deployment-6f9d665859 to 2
  Normal  ScalingReplicaSet  4m13s              deployment-controller  Scaled down replica set nginx-deployment-7fd6966748 to 0
  Normal  ScalingReplicaSet  94s (x2 over 14m)  deployment-controller  Scaled up replica set nginx-deployment-7fd6966748 to 2
  Normal  ScalingReplicaSet  94s                deployment-controller  Scaled up replica set nginx-deployment-6f9d665859 to 4
  Normal  ScalingReplicaSet  94s                deployment-controller  Scaled up replica set nginx-deployment-7fd6966748 to 1
  Normal  ScalingReplicaSet  94s                deployment-controller  Scaled down replica set nginx-deployment-6f9d665859 to 3
  Normal  ScalingReplicaSet  92s                deployment-controller  Scaled down replica set nginx-deployment-6f9d665859 to 2
  Normal  ScalingReplicaSet  90s (x4 over 92s)  deployment-controller  (combined from similar events): Scaled down replica set nginx-deployment-6f9d665859 to 0
```

## 删除

```
$ kubectl delete deployment nginx-deployment
deployment.extensions "nginx-deployment" deleted
```

```
$ kubectl get deployments
No resources found.
```

# 参考资料

1. [CNCF × Alibaba 云原生技术公开课](https://edu.aliyun.com/course/1651)
2. [minikube start](https://minikube.sigs.k8s.io/docs/start/)
3. [Minikube - Kubernetes本地实验环境](https://developer.aliyun.com/article/221687)