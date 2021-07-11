---
title: 应用编排与管理 -- Deployment
mathjax: false
date: 2021-07-11 16:34:11
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

每个 Deployment 管理一组**相同**的应用 Pod（相同的一个**副本**）

![image-20210711201124489](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210711201124489.png)

<!-- more -->

# 实践

## YAML 文件

```yaml nginx-deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3 # 期望的 Pod 数量
  selector:   # Pod Selector
    matchLabels:
      app: nginx
  template:   # Pod Template
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:1.7.9
          ports:
          - containerPort: 80
```

## 查看 Deployment

```
$ kubectl get deployment
No resources found.

$ kubectl apply -f nginx-deployment.yaml
deployment.apps/nginx-deployment created

$ kubectl get deployment
NAME               READY   UP-TO-DATE   AVAILABLE   AGE
nginx-deployment   3/3     3            3           31s
```

| READY | UP-TO-DATE   | AVAILABLE     |
| ----- | ------------ | ------------- |
| 就绪  | 到达期望版本 | 运行中 + 可用 |

## 查看 Pod

```
$ kubectl get pod
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-5754944d6c-7hkj9   1/1     Running   0          3m9s
nginx-deployment-5754944d6c-p2dr9   1/1     Running   0          3m9s
nginx-deployment-5754944d6c-ptr42   1/1     Running   0          3m9s
```

5754944d6c 为 **pod-template-hash**，Pod 的 OwnerReference 为 **ReplicaSet**（对应 **Pod Template**）

```
kubectl get pod nginx-deployment-5754944d6c-7hkj9 -o yaml | head -n 17
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: "2021-07-11T12:26:59Z"
  generateName: nginx-deployment-5754944d6c-
  labels:
    app: nginx
    pod-template-hash: 5754944d6c
  name: nginx-deployment-5754944d6c-7hkj9
  namespace: default
  ownerReferences:
  - apiVersion: apps/v1
    blockOwnerDeletion: true
    controller: true
    kind: ReplicaSet
    name: nginx-deployment-5754944d6c
    uid: fe276bb5-8875-4c7d-b1b5-c07a98a84e16
```

## 更新镜像

**deployment.v1.apps=资源名.资源版本.资源组，nginx=container.name**

![image-20210711203620459](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210711203620459.png)

pod-template-hash：**5754944d6c -> 7448597cd5 -> 67fdfdb884**

```
$ kubectl set image deployment nginx-deployment nginx='nginx:1.9.1'
deployment.extensions/nginx-deployment image updated

$ kubectl get deployment nginx-deployment -o yaml
...
spec:
	...
  template:
    metadata:
      creationTimestamp: null
      labels:
        app: nginx
    spec:
      containers:
      - image: nginx:1.9.1
...

$ kubectl get deployment
NAME               READY   UP-TO-DATE   AVAILABLE   AGE
nginx-deployment   3/3     3            3           19m

$ kubectl get rs
NAME                          DESIRED   CURRENT   READY   AGE
nginx-deployment-5754944d6c   0         0         0       19m
nginx-deployment-7448597cd5   3         3         3       6m2s

$ kubectl get pods
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-7448597cd5-4g9f9   1/1     Running   0          5m43s
nginx-deployment-7448597cd5-khvhx   1/1     Running   0          6m6s
nginx-deployment-7448597cd5-pvt98   1/1     Running   0          5m44s

$ kubectl set image deployment nginx-deployment nginx='nginx:1.9.2'
deployment.extensions/nginx-deployment image updated

$ kubectl get rs
NAME                          DESIRED   CURRENT   READY   AGE
nginx-deployment-5754944d6c   0         0         0       23m
nginx-deployment-67fdfdb884   3         3         3       73s
nginx-deployment-7448597cd5   0         0         0       9m37s

$ kubectl get pods
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-67fdfdb884-2mgkf   1/1     Running   0          48s
nginx-deployment-67fdfdb884-pjppp   1/1     Running   0          95s
nginx-deployment-67fdfdb884-z2fqt   1/1     Running   0          49s
```

## 版本回滚

### 查看版本

```
$ kubectl rollout history deployment nginx-deployment
deployment.extensions/nginx-deployment
REVISION  CHANGE-CAUSE
1         <none>
2         <none>
3         <none>
```

| 1           | 2           | 3           |
| ----------- | ----------- | ----------- |
| nginx:1.7.9 | nginx:1.9.1 | nginx:1.9.2 |

### 回滚到上一版本（revision=2）

```
$ kubectl rollout undo deployment nginx-deployment
deployment.extensions/nginx-deployment rolled back

$ kubectl rollout history deployment nginx-deployment
deployment.extensions/nginx-deployment
REVISION  CHANGE-CAUSE
1         <none>
3         <none>
4         <none>

$ kubectl get deployment nginx-deployment -o yaml
...
      - image: nginx:1.9.1
...
```

| 1           | 3           | 4           |
| ----------- | ----------- | ----------- |
| nginx:1.7.9 | nginx:1.9.2 | nginx:1.9.1 |

### 回滚到特定版本（revision=3）

```
$ kubectl rollout undo deployment nginx-deployment --to-revision=3
deployment.extensions/nginx-deployment rolled back

$ kubectl get deployment nginx-deployment -o yaml
...
      - image: nginx:1.9.2
...

$ kubectl rollout history deployment nginx-deployment
deployment.extensions/nginx-deployment
REVISION  CHANGE-CAUSE
1         <none>
4         <none>
5         <none>
```

| 1           | 4           | 5           |
| ----------- | ----------- | ----------- |
| nginx:1.7.9 | nginx:1.9.1 | nginx:1.9.2 |

## 删除 Deployment

```
$ kubectl delete -f nginx-deployment.yaml
deployment.apps "nginx-deployment" deleted

$ kubectl get deployment
No resources found.
```

# Deployme Status

Processing：Deployment 正在**扩容**或者**发布**

![image-20210711210022275](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210711210022275.png)

## 查看 Node

```
$ kubectl get nodes
NAME       STATUS   ROLES    AGE   VERSION
minikube   Ready    master   56m   v1.15.5
```

## 创建 Deployment

```
$ kubectl apply -f nginx-deployment.yaml
deployment.apps/nginx-deployment created

$ kubectl get deployment nginx-deployment
NAME               READY   UP-TO-DATE   AVAILABLE   AGE
nginx-deployment   3/3     3            3           20s

$ kubectl get pod
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-5754944d6c-c7j2k   1/1     Running   0          28s
nginx-deployment-5754944d6c-j6dwk   1/1     Running   0          28s
nginx-deployment-5754944d6c-ptmbz   1/1     Running   0          28s
```

**spec.replicas = availableReplicas = readyReplicas = updatedReplicas = 3**

```
$ kubectl get deployment nginx-deployment -o yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  annotations:
    deployment.kubernetes.io/revision: "1"
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"apps/v1","kind":"Deployment","metadata":{"annotations":{},"labels":{"app":"nginx"},"name":"nginx-deployment","namespace":"default"},"spec":{"replicas":3,"selector":{"matchLabels":{"app":"nginx"}},"template":{"metadata":{"labels":{"app":"nginx"}},"spec":{"containers":[{"image":"nginx:1.7.9","name":"nginx","ports":[{"containerPort":80}]}]}}}}
  creationTimestamp: "2021-07-11T13:06:47Z"
  generation: 1
  labels:
    app: nginx
  name: nginx-deployment
  namespace: default
  resourceVersion: "3370"
  selfLink: /apis/extensions/v1beta1/namespaces/default/deployments/nginx-deployment
  uid: 3a4bbf35-df24-4be0-b91a-0c947d1f2f7e
spec:
  progressDeadlineSeconds: 600
  replicas: 3
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      app: nginx
  strategy:
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
    type: RollingUpdate
  template:
    metadata:
      creationTimestamp: null
      labels:
        app: nginx
    spec:
      containers:
      - image: nginx:1.7.9
        imagePullPolicy: IfNotPresent
        name: nginx
        ports:
        - containerPort: 80
          protocol: TCP
        resources: {}
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
      dnsPolicy: ClusterFirst
      restartPolicy: Always
      schedulerName: default-scheduler
      securityContext: {}
      terminationGracePeriodSeconds: 30
status:
  availableReplicas: 3
  conditions:
  - lastTransitionTime: "2021-07-11T13:06:49Z"
    lastUpdateTime: "2021-07-11T13:06:49Z"
    message: Deployment has minimum availability.
    reason: MinimumReplicasAvailable
    status: "True"
    type: Available
  - lastTransitionTime: "2021-07-11T13:06:47Z"
    lastUpdateTime: "2021-07-11T13:06:49Z"
    message: ReplicaSet "nginx-deployment-5754944d6c" has successfully progressed.
    reason: NewReplicaSetAvailable
    status: "True"
    type: Progressing
  observedGeneration: 1
  readyReplicas: 3
  replicas: 3
  updatedReplicas: 3
```

## 查看 Pod

```
$ kubectl get pods
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-5754944d6c-c7j2k   1/1     Running   0          5m48s
nginx-deployment-5754944d6c-j6dwk   1/1     Running   0          5m48s
nginx-deployment-5754944d6c-ptmbz   1/1     Running   0          5m48s
```

```
$ kubectl get pod nginx-deployment-5754944d6c-c7j2k -o yaml
...
  ownerReferences:
  - apiVersion: apps/v1
    blockOwnerDeletion: true
    controller: true
    kind: ReplicaSet
    name: nginx-deployment-5754944d6c
    uid: 9789dd3a-ee79-4488-bb2f-d9539909bbca
...
spec:
  containers:
  - image: nginx:1.7.9
...
status:
  conditions:
  - lastProbeTime: null
    lastTransitionTime: "2021-07-11T13:06:47Z"
    status: "True"
    type: Initialized
  - lastProbeTime: null
    lastTransitionTime: "2021-07-11T13:06:49Z"
    status: "True"
    type: Ready
  - lastProbeTime: null
    lastTransitionTime: "2021-07-11T13:06:49Z"
    status: "True"
    type: ContainersReady
  - lastProbeTime: null
    lastTransitionTime: "2021-07-11T13:06:47Z"
    status: "True"
    type: PodScheduled
...
```

## 更新升级

```
$ kubectl get rs
NAME                          DESIRED   CURRENT   READY   AGE
nginx-deployment-5754944d6c   3         3         3       9m22s

$ kubectl get pods
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-5754944d6c-c7j2k   1/1     Running   0          9m59s
nginx-deployment-5754944d6c-j6dwk   1/1     Running   0          9m59s
nginx-deployment-5754944d6c-ptmbz   1/1     Running   0          9m59s

$ kubectl set image deployment nginx-deployment nginx='nginx:1.9.1'
deployment.extensions/nginx-deployment image updated

$ kubectl get pods
NAME                                READY   STATUS        RESTARTS   AGE
nginx-deployment-5754944d6c-c7j2k   1/1     Terminating   0          10m
nginx-deployment-5754944d6c-j6dwk   1/1     Running       0          10m
nginx-deployment-5754944d6c-ptmbz   1/1     Running       0          10m
nginx-deployment-7448597cd5-gzq4j   0/1     Pending       0          0s
nginx-deployment-7448597cd5-qbhr4   1/1     Running       0          2s

$ kubectl get rs
NAME                          DESIRED   CURRENT   READY   AGE
nginx-deployment-5754944d6c   0         0         0       10m
nginx-deployment-7448597cd5   3         3         3       12s

$ kubectl get pods
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-7448597cd5-7jlvf   1/1     Running   0          60s
nginx-deployment-7448597cd5-gzq4j   1/1     Running   0          61s
nginx-deployment-7448597cd5-qbhr4   1/1     Running   0          63s

$ kubectl get pod nginx-deployment-7448597cd5-7jlvf  -o yaml
...
spec:
  containers:
  - image: nginx:1.9.1
    imagePullPolicy: IfNotPresent
    name: nginx
...
```

## revisionHistoryLimit

revisionHistoryLimit：保留历史版本的 ReplicaSet 的数量

```
$ kubectl get deployment nginx-deployment  -o yaml
...
spec:
  progressDeadlineSeconds: 600
  replicas: 3
  revisionHistoryLimit: 10
...

$ kubectl set image deployment nginx-deployment nginx='nginx:1.9.2'
deployment.extensions/nginx-deployment image updated

$ kubectl get rs
NAME                          DESIRED   CURRENT   READY   AGE
nginx-deployment-5754944d6c   0         0         0       16m
nginx-deployment-67fdfdb884   3         3         3       15s
nginx-deployment-7448597cd5   0         0         0       5m27s
```

将revisionHistoryLimit修改为1，只保留了1个历史版本（7448597cd5），而删除其余历史版本（5754944d6c）

```
$ kubectl edit deployment nginx-deployment
deployment.extensions/nginx-deployment edited

$ kubectl get rs
NAME                          DESIRED   CURRENT   READY   AGE
nginx-deployment-67fdfdb884   3         3         3       103s
nginx-deployment-7448597cd5   0         0         0       6m55s
```

# 架构设计

## 管理模式

![image-20210711212642987](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210711212642987.png)

## Deployment Controller

1. Deployment Controller关注 **Deployment** 和 **ReplicaSet** 的 Event
2. 判断 **Check Paused**：Paused=true，表示该 Deployment **不需要新的发布**，只需要做数量上的维持
   - Yes
     - Sync replicas：**同步到对应的ReplicaSet**
     - Update status：**更新 Deployment Status**
   - No
     - Create/Update/Delete ReplicaSet

![image-20210711212748506](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210711212748506.png)

## ReplicaSet Controller

1. 当 Deployment 分配 ReplicaSet 之后，ReplicaSet Controller会关注 **ReplicaSet** 和 **Pod** 的 Event
2. ReplicaSet Controller：**只管理副本数量**，进行扩容或者缩容

![image-20210711213553462](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210711213553462.png)

## 场景

### 扩容

![image-20210711214027978](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210711214027978.png)

### 发布

![image-20210711214121161](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210711214121161.png)

### 回滚

![image-20210711220514050](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210711220514050.png)

# 字段解析

```
$ kubectl get deployment nginx-deployment  -o yaml
...
spec:
  progressDeadlineSeconds: 600
  replicas: 3
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      app: nginx
  strategy:
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
    type: RollingUpdate
...
```

| Key                     | Value                                                   |
| ----------------------- | ------------------------------------------------------- |
| MinReadySeconds         | 判断 Pod 为 Available 的最小 Ready 时间                 |
| revisionHistoryLimit    | 保留历史ReplicaSet的数量                                |
| paused                  | 标识，Deployment 只做数量维持，不做新的发布             |
| progressDeadlineSeconds | Deployment 长时间处于 Processing 状态会被进入 Fail 状态 |
| maxUnavailable          | 滚动过程中最多有多少个 Pod 不可用                       |
| maxSurge                | 滚动过程中最多存在多少个 Pod 超过预期 Replicas 数量     |

# 参考资料

1. [CNCF × Alibaba 云原生技术公开课](https://edu.aliyun.com/course/1651)