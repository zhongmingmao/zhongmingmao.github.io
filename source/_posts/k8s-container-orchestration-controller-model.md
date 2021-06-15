---
title: 容器编排 -- 控制器模型
mathjax: false
date: 2021-06-15 09:00:00
categories:
    - Cloud Native
    - Kubernetes
tags:
    - Cloud Native
    - Kubernetes
---

# 控制器

> kube-controller-manager是**一系列控制器的集合**，每一种控制器都以**独有**的方式负责某种**编排功能**

```
# cd kubernetes/pkg/controller

# ls -d */
apis/                   cronjob/                endpoint/               history/                nodelifecycle/          replication/            storageversiongc/       util/
bootstrap/              daemon/                 endpointslice/          job/                    podautoscaler/          resourcequota/          testutil/               volume/
certificates/           deployment/             endpointslicemirroring/ namespace/              podgc/                  serviceaccount/         ttl/
clusterroleaggregation/ disruption/             garbagecollector/       nodeipam/               replicaset/             statefulset/            ttlafterfinished/
```

# 控制循环

1. X为**待编排**的对象，**实际状态**来源于**Kubernetes集群**，而**期望状态**一般来自于用户提交的**YAML文件**
2. 别名：**Reconcile、Reconcile Loop、Sync Loop、Control Loop**
3. _**控制器对象本身，负责定义被管理对象的期望状态！！**_
   - 被控制对象的定义，来源于**模板**，如Deployment.template与标准的Pod对象的API定义一致，称为**PodTemplate**

```go
for {
  实际状态 := 获取集群中对象 X 的实际状态（Actual State）
  期望状态 := 获取集群中对象 X 的期望状态（Desired State）
  if 实际状态 == 期望状态{
    什么都不做
  } else {
    执行编排动作，将实际状态调整为期望状态
  }
}
```

<!-- more -->

# Deployment

1. Deployment控制器从**Etcd**中获取到所有携带`app: nginx`标签的Pod，统计它们的数量 -- **实际状态**
2. Deployment对象的**Replicas**字段为**期望状态**
3. Deployment控制器**比较**实际状态和期望状态，确定创建Pod还是删除已有的Pod

```yaml nginx-deployment.yaml
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
          image: 'nginx:1.7.9'
          ports:
            - containerPort: 80
```

所有的API Object的**Metadata**都有**ownerReference**字段，用于保存**该API Object的拥有者**（Owner）

![](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210616001026814.png)

# 参考资料

1. [深入剖析Kubernetes](https://time.geekbang.org/column/intro/100015201)
