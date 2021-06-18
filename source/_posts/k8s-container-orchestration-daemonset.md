---
title: 容器编排 -- DaemonSet
mathjax: false
date: 2021-06-18 01:35:19
categories:
    - Cloud Native
    - Kubernetes
tags:
    - Cloud Native
    - Kubernetes
---

# Daemon Pod

## 特征

1. 运行在Kubernetes集群的**每个Node**上
2. 每个Node**有且仅有一个**Daemon Pod
3. 新Node加入Kubernetes集群，Daemon Pod会**自动**在新Node上**被创建**
4. 旧Node被删除后，上面的Daemon Pod也会被回收

## 场景

1. 网络插件的Agent组件
2. 存储插件的Agent组件
3. 监控组件 + 日志组件

# 工作原理

1. 循环控制：**遍历所有Node**，根据Node上是否有被管理Pod的情况，来决定是否需要**创建**或者**删除**Pod
2. DaemonSet在创建每个Pod时，做了两件额外的事情
   - **自动**给这个Pod加上一个**nodeAffinity**，来保证该Pod只会在**指定节点**上启动
   - **自动**给这个Pod加上一个**Toleration**，从而忽略Node上的**unschedulable污点**

<!-- more -->

## API Object

1. 该DaemonSet管理的是一个fluentd-elasticsearch镜像的Pod
2. fluentd-elasticsearch：通过fluentd将Docker容器里的日志转发到ElasticSearch
3. DaemonSet与Deployment非常类似，只是**DaemonSet没有replicas字段**

```yaml fluentd-elasticsearch.yaml
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
  template:
    metadata:
      labels:
        name: fluentd-elasticsearch
    spec:
      tolerations:
        - key: node-role.kubernetes.io/master
          effect: NoSchedule
      containers:
        - name: fluentd-elasticsearch
          image: 'k8s.gcr.io/fluentd-elasticsearch:1.20'
          resources:
            limits:
              memory: 200Mi
            requests:
              cpu: 100m
              memory: 200Mi
          volumeMounts:
            - name: varlog
              mountPath: /var/log
            - name: varlibdockercontainers
              mountPath: /var/lib/docker/containers
              readOnly: true
      terminationGracePeriodSeconds: 30
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
        - name: varlibdockercontainers
          hostPath:
            path: /var/lib/docker/containers
```

## Node : Daemon Pod =  1 : 1

1. DaemonSet控制器，首先从**Etcd**获取**所有的Node列表**
2. 然后遍历所有的Node，检查当前的Node有是否携带`name=fluentd-elasticsearch`标签（**spec.selector**）的Pod**在运行**
3. 检查结果
   - 没有这种Pod，要在这个Node上创建 -- **如何创建？**
   - 有这种Pod，但数量大于1，要在Node上删除多余的Pod -- 调用Kubernetes API即可
   - 有这种Pod，数量等于1，Node正常

### Affinity

1. spec.affinity：与**调度**相关
2. nodeAffinity
   - requiredDuringSchedulingIgnoredDuringExecution：该nodeAffinity在**每次调度**的时候都予以考虑
   - 该Pod将来只允许运行在`metadata.name=node-geektime`的Node上
3. DaemonSet控制器在**创建Pod**时，**自动**为这个Pod对象**加上nodeAffinity定义**
   - 需要**绑定的Node名称**，就是**当前正在遍历**的Node
   - DaemonSet并不需要修改用户提交的YAML文件里的**Pod模板**
     - 而是在向Kubernetes**发起请求之前**，直接修改**根据模板生成的Pod对象**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: with-node-affinity
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: metadata.name
                operator: In
                values:
                  - node-geektime
```

### Toleration

1. DaemonSet还会给Daemon Pod**自动**添加另一个与**调度**相关的字段 -- **tolerations**
2. 含义：Daemon Pod会**容忍**（**Toleration**）某些Node的**污点**（**Taint**，是一种特殊的Label）
3. 容忍所有被标记为**unschedulable**污点的Node，容忍的效果是**允许调度**
4. 在正常情况下，被标记了**unschedulable**污点的Node，是**不会有任何Pod被调度上去**的（effect: NoSchedule）
   - DaemonSet自动给被管理的Pod加上这个特殊的Toleration，使得Daemon Pod可以**忽略这个限制**
   - 继而保证每个Node都会被调度一个Daemon Pod（如果Node有故障，Daemon Pod会启动失败，DaemonSet会**重试**）

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: with-toleration
spec:
  tolerations:
    - key: node.kubernetes.io/unschedulable
      operator: Exists
      effect: NoSchedule
```

1. 当一个Node的网络插件尚未安装时，该Node会被自动加上`node.kubernetes.io/network-unavailable`污点
2. 如果DaemonSet管理的是网络插件的Agent Pod，对应的Pod模板需要容忍`node.kubernetes.io/network-unavailable`污点
3. 通过**Toleration**，调度器在调度该Daemon Pod时会**忽略**当前Node上的**Taint**，进而可以成功地调度到当前Node上

```yaml
...
template:
  metadata:
    labels:
      name: network-plugin-agent
  spec:
    tolerations:
      - key: node.kubernetes.io/network-unavailable
        operator: Exists
        effect: NoSchedule
```

1. 可以在DaemonSet的**Pod模板**里添加更多的Toleration
2. 默认情况下Kubernetes集群不允许用户在Master节点部署Pod，Master节点默认携带**node-role.kubernetes.io/master**污点

```yaml
tolerations:
  - key: node-role.kubernetes.io/master
    effect: NoSchedule
```

# 实践

## 创建DaemonSet

DaemonSet一般都会加上**resources**字段，用于限制CPU和内存的使用，防止DaemonSet占用过多的**宿主机**资源

```
# kubectl apply -f fluentd-elasticsearch.yaml
daemonset.apps/fluentd-elasticsearch created
```

## 查看Daemon Pod

有N个节点，就会有N个fluentd-elasticsearch Pod在运行

```
# kubectl get pod -n kube-system -l name=fluentd-elasticsearch
NAME                          READY   STATUS    RESTARTS   AGE
fluentd-elasticsearch-c9rtj   1/1     Running   0          4m44s
fluentd-elasticsearch-nlnjh   1/1     Running   0          4m44s
fluentd-elasticsearch-ph2ld   1/1     Running   0          4m44s
```

## 查看DaemonSet

1. 简写：DaemonSet（**ds**）、Deployment（**deploy**）
2. DaemonSet与Deployment类似，有DESIRED、CURRENT等多个状态字段，同样支持**版本管理**

```
# kubectl get ds -n kube-system fluentd-elasticsearch
NAME                    DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
fluentd-elasticsearch   3         3         3       3            3           <none>          5m2s
```

```
# kubectl rollout history daemonset fluentd-elasticsearch -n kube-system
daemonset.apps/fluentd-elasticsearch
REVISION  CHANGE-CAUSE
1         <none>
```

## 升级版本

`--record`：自动记录到DaemonSet的**rollout history**

```
# kubectl set image ds/fluentd-elasticsearch fluentd-elasticsearch=k8s.gcr.io/fluentd-elasticsearch:v2.2.0 --record -n=kube-system
daemonset.apps/fluentd-elasticsearch image updated
```

滚动更新过程

```
# kubectl rollout status ds/fluentd-elasticsearch -n kube-system
Waiting for daemon set "fluentd-elasticsearch" rollout to finish: 1 out of 3 new pods have been updated...
Waiting for daemon set "fluentd-elasticsearch" rollout to finish: 2 out of 3 new pods have been updated...
Waiting for daemon set "fluentd-elasticsearch" rollout to finish: 2 out of 3 new pods have been updated...
Waiting for daemon set "fluentd-elasticsearch" rollout to finish: 2 out of 3 new pods have been updated...
Waiting for daemon set "fluentd-elasticsearch" rollout to finish: 2 of 3 updated pods are available...
daemon set "fluentd-elasticsearch" successfully rolled out
```

rollout history

```
# kubectl rollout history daemonset fluentd-elasticsearch -n kube-system
daemonset.apps/fluentd-elasticsearch
REVISION  CHANGE-CAUSE
1         <none>
2         kubectl set image ds/fluentd-elasticsearch fluentd-elasticsearch=k8s.gcr.io/fluentd-elasticsearch:v2.2.0 --record=true --namespace=kube-system
```

## 版本回滚

1. **Deployment**：一个版本对应一个**ReplicaSet**对象
2. DaemonSet控制器直接操作的是Pod：**ControllerRevision**（**通用**的版本管理对象）

```
# kubectl get controllerrevision -n kube-system -l name=fluentd-elasticsearch
NAME                               CONTROLLER                             REVISION   AGE
fluentd-elasticsearch-7464ccb7c    daemonset.apps/fluentd-elasticsearch   2          7m34s
fluentd-elasticsearch-76fd8fd678   daemonset.apps/fluentd-elasticsearch   1          16m
```

1. **Data**：保存了该版本对应的**完整的DaemonSet对象**
2. **Annotations**：保存了创建该ControllerRevision对象所使用的命令

```
# kubectl describe controllerrevision fluentd-elasticsearch-7464ccb7c -n kube-system
Name:         fluentd-elasticsearch-7464ccb7c
Namespace:    kube-system
Labels:       controller-revision-hash=7464ccb7c
              name=fluentd-elasticsearch
Annotations:  deprecated.daemonset.template.generation: 2
              kubernetes.io/change-cause:
                kubectl set image ds/fluentd-elasticsearch fluentd-elasticsearch=k8s.gcr.io/fluentd-elasticsearch:v2.2.0 --record=true --namespace=kube-sy...
API Version:  apps/v1
Data:
  Spec:
    Template:
      $patch:  replace
      Metadata:
        Creation Timestamp:  <nil>
        Labels:
          Name:  fluentd-elasticsearch
      Spec:
        Containers:
          Image:              k8s.gcr.io/fluentd-elasticsearch:v2.2.0
          Image Pull Policy:  IfNotPresent
          Name:               fluentd-elasticsearch
          Resources:
            Limits:
              Memory:  200Mi
            Requests:
              Cpu:                     100m
              Memory:                  200Mi
          Termination Message Path:    /dev/termination-log
          Termination Message Policy:  File
          Volume Mounts:
            Mount Path:  /var/log
            Name:        varlog
            Mount Path:  /var/lib/docker/containers
            Name:        varlibdockercontainers
            Read Only:   true
        Dns Policy:      ClusterFirst
        Restart Policy:  Always
        Scheduler Name:  default-scheduler
        Security Context:
        Termination Grace Period Seconds:  30
        Tolerations:
          Effect:  NoSchedule
          Key:     node-role.kubernetes.io/master
        Volumes:
          Host Path:
            Path:  /var/log
            Type:
          Name:    varlog
          Host Path:
            Path:  /var/lib/docker/containers
            Type:
          Name:    varlibdockercontainers
Kind:              ControllerRevision
Metadata:
  Creation Timestamp:  2021-06-18T08:56:08Z
  Managed Fields:
    API Version:  apps/v1
    Fields Type:  FieldsV1
    fieldsV1:
      f:data:
      f:metadata:
        f:annotations:
          .:
          f:deprecated.daemonset.template.generation:
          f:kubectl.kubernetes.io/last-applied-configuration:
          f:kubernetes.io/change-cause:
        f:labels:
          .:
          f:controller-revision-hash:
          f:name:
        f:ownerReferences:
          .:
          k:{"uid":"b0769f40-8fc5-4e23-97be-f235f6981320"}:
            .:
            f:apiVersion:
            f:blockOwnerDeletion:
            f:controller:
            f:kind:
            f:name:
            f:uid:
      f:revision:
    Manager:    kube-controller-manager
    Operation:  Update
    Time:       2021-06-18T08:56:08Z
  Owner References:
    API Version:           apps/v1
    Block Owner Deletion:  true
    Controller:            true
    Kind:                  DaemonSet
    Name:                  fluentd-elasticsearch
    UID:                   b0769f40-8fc5-4e23-97be-f235f6981320
  Resource Version:        167173
  UID:                     e85e6763-79e1-45ac-9da1-81a9922c395f
Revision:                  2
Events:                    <none>
```

1. 将DaemonSet回滚到**Revision=1**的状态：读取**Revision=1**的ControllerRevision对象保存的**Data**字段（完整的DaemonSet对象）
2. 等价于：`kubectl apply -f  旧DaemonSet对象`，创建出**Revision=3**的ControllerRevision对象

```
# kubectl rollout undo daemonset fluentd-elasticsearch --to-revision=1 -n kube-system
daemonset.apps/fluentd-elasticsearch rolled back
```

```
# kubectl rollout history daemonset fluentd-elasticsearch -n kube-system
daemonset.apps/fluentd-elasticsearch
REVISION  CHANGE-CAUSE
2         kubectl set image ds/fluentd-elasticsearch fluentd-elasticsearch=k8s.gcr.io/fluentd-elasticsearch:v2.2.0 --record=true --namespace=kube-system
3         <none>

# kubectl get controllerrevision -n kube-system -l name=fluentd-elasticsearch
NAME                               CONTROLLER                             REVISION   AGE
fluentd-elasticsearch-7464ccb7c    daemonset.apps/fluentd-elasticsearch   2          17m
fluentd-elasticsearch-76fd8fd678   daemonset.apps/fluentd-elasticsearch   3          26m
```



# 参考资料

1. [深入剖析Kubernetes](https://time.geekbang.org/column/intro/100015201)
