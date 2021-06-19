---
title: 声明式API -- 基本概念
mathjax: false
date: 2021-06-19 16:47:42
categories:
    - Cloud Native
    - Kubernetes
tags:
    - Cloud Native
    - Kubernetes
---

# 命令式 vs 声明式

## 命令式

```
# kubectl create -f nginx.yaml
# kubectl replace -f nginx.yaml
```

## 声明式

```
# kubectl apply -f nginx.yaml
```

1. 所谓声明式，即只需要提交一个**定义好的API对象**来**声明所期待的状态**即可
2. 声明式API允许**多个API写端**，以**PATCH**的方式对API对象进行修改，而无需关心**本地原始YAML文件**的内容
  - 声明式API最主要的能力：_**PATCH API**_
3. 声明式API是**Kubernetes编排能力赖以生存的核心**所在

## 本质区别

|                | kubectl replace                              | kubectl apply                                            |
| -------------- | ------------------------------------------------ | ------------------------------------------------------------ |
| 执行过程       | 使用**新API对象**替换旧API对象                   | 执行对旧API对象的**PATCH**操作<br />类似：kubectl **set image**、kubectl **edit** |
| kube-apiserver | **一次只能处理一个写请求**，否则可能产生**冲突** | **一次能处理多个写请求**，具备**Merge**能力                  |


# Kubernetes编程范式
> 使用**控制器模式**，与Kubernetes里**API对象**的『增、删、改、查』进行**协作**，进而**完成用户业务逻辑**的编写

<!-- more -->

# Istio

> Istio是基于**Kubernetes**的**微服务治理框架**

## 架构

1. **Envoy**是一个**高性能的C++网络代理**，以**Sidecar容器**的方式运行在每个被治理的应用Pod中
2. Pod里**所有的容器都共享同一个Network Namespace**
   - **Envoy容器**可以通过配置Pod里的**iptables**规则，**接管整个Pod的进出流量**
3. Control Plane里的**Pilot**组件，能够通过**调用每个Envoy容器的API**来对**Envoy代理**进行配置，从而实现**微服务治理**
4. **对Envoy容器的部署**和**对Envoy代理的配置**，对用户和应用来说是**透明**的 -- 借助于Kubernetes的**Dynamic Admission Control**

![](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210619184705818.png)

## Initializer -- Dynamic Admission Control

> **Admission**（**编译**进APIServer）：当一个API对象被**提交给APIServer后**，被**Kubernetes正式处理前**的一些**初始化**工作

### myapp-pod.yaml

Pod里目前只有一个用户容器（**myapp-container**）

```yaml myapp-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-pod
  labels:
    app: myapp
spec:
  containers:
    - name: myapp-container
      image: busybox
      command:
        - sh
        - '-c'
        - echo Hello Kubernetes! && sleep 3600
```

Istio的任务：myapp-pod.yaml被提交给Kubernetes后，对应的API对象里会**自动加上Envoy容器的配置**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-pod
  labels:
    app: myapp
spec:
  containers:
    - name: myapp-container
      image: busybox
      command:
        - sh
        - '-c'
        - echo Hello Kubernetes! && sleep 3600
    - name: envoy
      image: 'lyft/envoy:845747b88f102c0fd262ab234308e9e22f693a1'
      command:
        - /usr/local/bin/envoy
      ...
```

### envoy-initializer -- 容器定义

1. 首先，将**Envoy容器本身的定义**，以**ConfigMap**的方式保存在Kubernetes中
2. ConfigMap的**data**字段是**一个Pod对象的一部分定义**
3. Initializer控制器的任务
   - 把Envoy相关的字段**自动添加**到用户提交的Pod的API对象里
   - 但用户提交的Pod里本来就有**containers**字段和**volumes**字段 -- **PATCH API**（**声明式API最主要的能力**）

```yaml envoy-initializer.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: envoy-initializer
data:
  config: |
    containers:
      - name: envoy
        image: lyft/envoy:845747db88f102c0fd262ab234308e9e22f693a1
        command: ["/usr/local/bin/envoy"]
        args:
          - "--concurrency 4"
          - "--config-path /etc/envoy/envoy.json"
          - "--mode serve"
        ports:
          - containerPort: 80
            protocol: TCP
        resources:
          limits:
            cpu: "1000m"
            memory: "512Mi"
          requests:
            cpu: "100m"
            memory: "64Mi"
        volumeMounts:
          - name: envoy-conf
            mountPath: /etc/envoy
    volumes:
      - name: envoy-conf
        configMap:
          name: envoy
```

### envoy-initializer:0.0.1 -- 控制器

1. **envoy-initializer:0.0.1**为**自定义控制器**
2. **控制循环**：不断获取**实际状态**，然后与**期望状态**对比，以此作为依据来决定下一步的操作
3. Initializer控制器：实际状态（**用户新创建的Pod**），期望状态（**该Pod里被添加了Envoy容器的定义**）

```go
for {
  // 获取新创建的Pod
  pod := client.GetLatestPod()
  // 该Pod里是否已经添加过Envoy容器
  if !isInitialized(pod) {
    // 还没添加Envoy容器，则修改该Pod的API对象，往Pod里合并envoy-initializer这个ConfigMap的data字段
    doSomething(pod)
  }
}
```

```go
func doSomething(pod) {
  cm := client.Get(ConfigMap, "envoy-initializer")

  newPod := Pod{}
  newPod.Spec.Containers = cm.Containers
  newPod.Spec.Volumes = cm.Volumes

  // 生成patch数据
  patchBytes := strategicpatch.CreateTwoWayMergePatch(pod, newPod)

  // 发起PATCH请求，修改这个pod对象
  client.Patch(pod.Name, patchBytes)
}
```

### 将Initializer作为Pod部署

```yaml envoy-initializer-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  labels:
    app: envoy-initializer
  name: envoy-initializer
spec:
  containers:
    - name: envoy-initializer
      image: 'envoy-initializer:0.0.1'
      imagePullPolicy: Always
```

### 配置需要进行Initialize的资源

#### envoy-config

Kubernetes要对所有的Pod进行Initialize操作，名称为**envoy**-initializer（**envoy**.initializer.kubernetes.io）

```yaml envoy-config.yaml
apiVersion: admissionregistration.k8s.io/v1alpha1
kind: InitializerConfiguration
metadata:
  name: envoy-config
initializers:
  - name: envoy.initializer.kubernetes.io # name必须至少包含2个'.'
    rules:
      - apiGroups:
          - '' # Core Api Group
        apiVersions:
          - v1
        resources:
          - pods
```

#### metadata.initializers

1. 一旦该**InitializerConfiguration**被创建，所有**新创建的Pod**的**metadata.initializers.pending**上会出现该**Initializer**的名字
2. 该Initializer会借助Pod的**metadata.initializers.pending**来判断该Pod有没有执行过自己所负责的初始化操作（`isInitialized()`）
3. 当Initializer完成了初始化操作后，要**负责清除**掉**metadata.initializers.pending**标志

```yaml
apiVersion: v1
kind: Pod
metadata:
  initializers:
    pending:
      - name: envoy.initializer.kubernetes.io
  name: myapp-pod
  labels:
    app: myapp
...
```

#### metadata.annotations

在Pod的Annotation**声明使用了某个Initializer**，如使用了**envoy-initializer**

```yaml
apiVersion: v1
kind: Pod
metadata
  annotations:
    "initializer.kubernetes.io/envoy": "true"
    ...
```

# 参考资料

1. [深入剖析Kubernetes](https://time.geekbang.org/column/intro/100015201)
