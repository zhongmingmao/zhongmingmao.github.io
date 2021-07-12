---
title: 应用编排与管理 -- DaemonSet
mathjax: false
date: 2021-07-12 09:06:08
categories:
	- Cloud Native
	- Kubernetes
	- Alibaba
tags:
	- Cloud Native
	- Kubernetes
	- Alibaba
---

# 作用

1. 保证集群内每一个或者一些**节点**都运行一组相同的 Pod
2. 跟踪集群节点状态，保证**新加入的节点**自动创建对应的 Pod
3. 跟踪集群节点状态，保证**移除的节点**删除对应的 Pod
4. 跟踪 Pod 状态，保证每个节点 Pod 处于**运行状态**

<!-- more -->

# 实践

## YAML 文件

```yaml ds.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd-elasticsearch
  namespace: kube-system
  labels:
    k8s-app: fluentd-logging
spec:
  selector:
    matchLabels:
      name: fluentd-elasticsearch
  template: # Pod Template
    metadata:
      labels:
        name: fluentd-elasticsearch
    spec:
      containers:
        - name: fluentd-elasticsearch
          image: 'fluent/fluentd:v1.4-1'
```

## 查看 Node

```
$ kubectl get nodes
NAME       STATUS   ROLES    AGE   VERSION
minikube   Ready    master   10h   v1.15.5
```

## 查看 DaemonSet

```
$ kubectl apply -f ds.yaml
daemonset.apps/fluentd-elasticsearch created

$ kubectl get ds -n kube-system
NAME                    DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR                 AGE
fluentd-elasticsearch   1         1         1       1            1           <none>                        3m58s
kube-proxy              1         1         1       1            1           beta.kubernetes.io/os=linux   10h

$ kubectl get ds -n kube-system fluentd-elasticsearch -o yaml | head -n 15
apiVersion: extensions/v1beta1
kind: DaemonSet
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"apps/v1","kind":"DaemonSet","metadata":{"annotations":{},"labels":{"k8s-app":"fluentd-logging"},"name":"fluentd-elasticsearch","namespace":"kube-system"},"spec":{"selector":{"matchLabels":{"name":"fluentd-elasticsearch"}},"template":{"metadata":{"labels":{"name":"fluentd-elasticsearch"}},"spec":{"containers":[{"image":"fluent/fluentd:v1.4-1","name":"fluentd-elasticsearch"}]}}}}
  creationTimestamp: "2021-07-12T02:51:12Z"
  generation: 1
  labels:
    k8s-app: fluentd-logging
  name: fluentd-elasticsearch
  namespace: kube-system
  resourceVersion: "8703"
  selfLink: /apis/extensions/v1beta1/namespaces/kube-system/daemonsets/fluentd-elasticsearch
  uid: 4b3c030f-8f45-4f74-87c6-1c21899ebc31
```

| Key           | Value                        |
| ------------- | ---------------------------- |
| DESIRED       | 需要的 Pod 个数              |
| CURRENT       | 当前已存在的 Pod 数          |
| READY         | 就绪的 Pod 数                |
| UP-TO-DATE    | 到达预期版本的 Pod 数        |
| AVAILABLE     | 可用的 Pod 数                |
| NODE SELECTOR | 节点选择标签（筛选部分节点） |

## 查看 Pod

Pod 的 OwnerReference 为 DaemonSet

```
$ kubectl get pods -n kube-system
NAME                               READY   STATUS    RESTARTS   AGE
coredns-6967fb4995-n2pk4           1/1     Running   2          10h
etcd-minikube                      1/1     Running   1          10h
fluentd-elasticsearch-z4b9x        1/1     Running   0          4m25s
kube-apiserver-minikube            1/1     Running   1          10h
kube-controller-manager-minikube   1/1     Running   1          10h
kube-proxy-tjgc7                   1/1     Running   1          10h
kube-scheduler-minikube            1/1     Running   1          10h
storage-provisioner                1/1     Running   2          10h

$ kubectl get pods -n kube-system fluentd-elasticsearch-z4b9x -o yaml | head -n 21
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: "2021-07-12T02:51:12Z"
  generateName: fluentd-elasticsearch-
  labels:
    controller-revision-hash: 5fd669cccc
    name: fluentd-elasticsearch
    pod-template-generation: "1"
  name: fluentd-elasticsearch-z4b9x
  namespace: kube-system
  ownerReferences:
  - apiVersion: apps/v1
    blockOwnerDeletion: true
    controller: true
    kind: DaemonSet
    name: fluentd-elasticsearch
    uid: 4b3c030f-8f45-4f74-87c6-1c21899ebc31
  resourceVersion: "8702"
  selfLink: /api/v1/namespaces/kube-system/pods/fluentd-elasticsearch-z4b9x
  uid: b2b3ed75-31f9-43f5-b247-92fcb7894741
```

## 更新 DaemonSet

1. **RollingUpdate**（默认）：当 DaemonSet 模板更新后，**老 Pod 会先被删除**，然后再去创建新的 Pod，配合健康检查做滚动更新
2. **OnDelete**：当 DaemonSet 模板更新后，只有手动删除某个对应的 Pod，此节点 Pod 才会被更新

```
$ kubectl set image ds/fluentd-elasticsearch fluentd-elasticsearch=fluent/fluentd:v1.4 -n kube-system
daemonset.extensions/fluentd-elasticsearch image updated

$ kubectl describe ds -n kube-system fluentd-elasticsearch
Name:           fluentd-elasticsearch
Selector:       name=fluentd-elasticsearch
Node-Selector:  <none>
Labels:         k8s-app=fluentd-logging
Annotations:    deprecated.daemonset.template.generation: 2
                kubectl.kubernetes.io/last-applied-configuration:
                  {"apiVersion":"apps/v1","kind":"DaemonSet","metadata":{"annotations":{},"labels":{"k8s-app":"fluentd-logging"},"name":"fluentd-elasticsear...
Desired Number of Nodes Scheduled: 1
Current Number of Nodes Scheduled: 1
Number of Nodes Scheduled with Up-to-date Pods: 1
Number of Nodes Scheduled with Available Pods: 1
Number of Nodes Misscheduled: 0
Pods Status:  1 Running / 0 Waiting / 0 Succeeded / 0 Failed
Pod Template:
  Labels:  name=fluentd-elasticsearch
  Containers:
   fluentd-elasticsearch:
    Image:        fluent/fluentd:v1.4
    Port:         <none>
    Host Port:    <none>
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
Events:
  Type    Reason            Age    From                  Message
  ----    ------            ----   ----                  -------
  Normal  SuccessfulCreate  24m    daemonset-controller  Created pod: fluentd-elasticsearch-z4b9x
  Normal  SuccessfulDelete  2m24s  daemonset-controller  Deleted pod: fluentd-elasticsearch-z4b9x
  Normal  SuccessfulCreate  2m12s  daemonset-controller  Created pod: fluentd-elasticsearch-dwmdt
  
$ kubectl get pods -n kube-system fluentd-elasticsearch-dwmdt -o yaml | head -n 21
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: "2021-07-12T03:13:27Z"
  generateName: fluentd-elasticsearch-
  labels:
    controller-revision-hash: f86bfc847
    name: fluentd-elasticsearch
    pod-template-generation: "2"
  name: fluentd-elasticsearch-dwmdt
  namespace: kube-system
  ownerReferences:
  - apiVersion: apps/v1
    blockOwnerDeletion: true
    controller: true
    kind: DaemonSet
    name: fluentd-elasticsearch
    uid: 4b3c030f-8f45-4f74-87c6-1c21899ebc31
  resourceVersion: "9692"
  selfLink: /api/v1/namespaces/kube-system/pods/fluentd-elasticsearch-dwmdt
  uid: 8ea753ea-2ed3-4d8a-b950-c31ec6847ecd
```

#  架构设计

## 管理模式

纠正：跟踪 Pod 状态，而非跟踪 Job 状态

![image-20210712111948819](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210712111948819.png)

## DaemonSet Controller

1. 纠正：不是 Job Controller，而是 DaemonSet Controller
2. DaemonSet Controller 需要 Watch 节点状态（通过 API Server 传递到 Etcd）
3. 当节点状态发生变化时，会通过一个内存 MQ 传递消息，DaemonSet Controller 会 Watch 到这一状态
4. DaemonSet Controller 会查看各个节点上是否都有对应的 Pod，没有则创建，有则对比版本

![image-20210712112415859](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210712112415859.png)

# 参考资料

1. [CNCF × Alibaba 云原生技术公开课](https://edu.aliyun.com/course/1651)