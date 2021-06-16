---
title: 容器编排 -- Deployment
mathjax: false
date: 2021-06-16 01:13:31
categories:
    - Cloud Native
    - Kubernetes
tags:
    - Cloud Native
    - Kubernetes
---

# 基本概念

1. Deployment实现了**Pod的水平伸缩**（horizontal scaling out/in） -- **滚动更新**（rolling update）
2. 滚动更新依赖于**ReplicaSet**
3. _**Deployment控制ReplicaSet（版本），ReplicaSet控制Pod（副本数）！！**_

# ReplicaSet

1. ReplicaSet的定义是Deployment的一个**子集**
2. **Deployment控制器实际操纵对象是ReplicaSet，而非Pod**，Deployment所管理的Pod的ownerReference为ReplicaSet

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: nginx-set
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: 'nginx:1.7.9'
```

<!-- more -->

# Deployment

```yaml nginx-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
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

1. Deployment、ReplicaSet、Pod三者的关系 -- **层层控制**
2. **ReplicaSet**通过控制器模式，保证系统中**Pod的个数**永远等于指定的个数
3. **Deployment**通过控制器模式，来操作**ReplicaSet的数量和属性**，进而实现两个**编排**动作：**水平伸缩**和**滚动更新**
4. 水平伸缩：Deployment控制器修改它所控制的ReplicaSet的Pod副本个数即可，**ReplicaSet会执行具体的增删Pod操作**

![](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210616104959307.png)

# 水平伸缩 + 滚动更新

## 创建Deployment

> \-\-record：记录每次操作所执行的命令

```
# kubectl apply -f nginx-deployment.yaml --record
deployment.apps/nginx-deployment created
```

## 查看Deployment -- 实时状态

```
# kubectl rollout status deployment/nginx-deployment
Waiting for deployment "nginx-deployment" rollout to finish: 0 of 3 updated replicas are available...
Waiting for deployment "nginx-deployment" rollout to finish: 1 of 3 updated replicas are available...
Waiting for deployment "nginx-deployment" rollout to finish: 2 of 3 updated replicas are available...
deployment "nginx-deployment" successfully rolled out
```

## 查看Deployment -- 当前状态

1. **READY**：CURRENT / DESIRED
   - **DESIRED**：期望的Pod副本数，即**spec.replicas**
   - **CURRENT**：当前处于**Running**状态的Pod数
2. **UP-TO-DATE**：当前处于**最新版本**（Pod对象的Spec部分与Deployment的Pod模板定义**完全一致**）的Pod数
3. **AVAILABLE**：当前**可用**（**Running状态 + 最新版本 + 健康检查正确**）的Pod数，**AVAILABLE是用户期待的最终状态**

```
# kubectl get deployments
NAME               READY   UP-TO-DATE   AVAILABLE   AGE
nginx-deployment   3/3     3            3           6s
```

## 查看Deployment -- 所控制的ReplicaSet

1. 用户提交Deployment对象后，Deployment控制器会创建一个Pod副本数为3的ReplicaSet
2. 5d59d67564为**pod-template-hash**（随机字符串），该随机字符串会加到ReplicaSet所控制的所有Pod的标签里，避免混淆
3. Deployment只是在ReplicaSet的基础上，添加了**UP-TO-DATE**字段

```
# kubectl get rs
NAME                          DESIRED   CURRENT   READY   AGE
nginx-deployment-5d59d67564   3         3         3       13m

# kubectl get pods
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-5d59d67564-2vh6v   1/1     Running   0          17m
nginx-deployment-5d59d67564-fkf98   1/1     Running   0          17m
nginx-deployment-5d59d67564-fw7wc   1/1     Running   0          17m
```

## 滚动更新

### kubectl edit

> 原理：把**API Object**的内容下载到**本地文件**，修改完后再提交到Kubernetes

### 升级Nginx

> 1.7.9 -> 1.9.1

```
# kubectl edit deployment/nginx-deployment
...
    spec:
      containers:
      - image: nginx:1.7.9
...
```

```
# kubectl rollout status deployment/nginx-deployment
Waiting for deployment "nginx-deployment" rollout to finish: 1 out of 3 new replicas have been updated...
Waiting for deployment "nginx-deployment" rollout to finish: 1 out of 3 new replicas have been updated...
Waiting for deployment "nginx-deployment" rollout to finish: 1 out of 3 new replicas have been updated...
Waiting for deployment "nginx-deployment" rollout to finish: 2 out of 3 new replicas have been updated...
Waiting for deployment "nginx-deployment" rollout to finish: 2 out of 3 new replicas have been updated...
Waiting for deployment "nginx-deployment" rollout to finish: 2 out of 3 new replicas have been updated...
Waiting for deployment "nginx-deployment" rollout to finish: 1 old replicas are pending termination...
Waiting for deployment "nginx-deployment" rollout to finish: 1 old replicas are pending termination...
deployment "nginx-deployment" successfully rolled out
```

```
# kubectl describe deployment nginx-deployment
...
OldReplicaSets:  <none>
NewReplicaSet:   nginx-deployment-69c44dfb78 (3/3 replicas created)
Events:
  Type    Reason             Age   From                   Message
  ----    ------             ----  ----                   -------
  Normal  ScalingReplicaSet  26m   deployment-controller  Scaled up replica set nginx-deployment-5d59d67564 to 3
  Normal  ScalingReplicaSet  57s   deployment-controller  Scaled up replica set nginx-deployment-69c44dfb78 to 1
  Normal  ScalingReplicaSet  55s   deployment-controller  Scaled down replica set nginx-deployment-5d59d67564 to 2
  Normal  ScalingReplicaSet  55s   deployment-controller  Scaled up replica set nginx-deployment-69c44dfb78 to 2
  Normal  ScalingReplicaSet  52s   deployment-controller  Scaled down replica set nginx-deployment-5d59d67564 to 1
  Normal  ScalingReplicaSet  52s   deployment-controller  Scaled up replica set nginx-deployment-69c44dfb78 to 3
  Normal  ScalingReplicaSet  50s   deployment-controller  Scaled down replica set nginx-deployment-5d59d67564 to 0
```

```
# kubectl get rs
NAME                          DESIRED   CURRENT   READY   AGE
nginx-deployment-5d59d67564   0         0         0       28m
nginx-deployment-69c44dfb78   3         3         3       2m44s
```

1. 修改Deployment的Pod定义后，Deployment控制器会使用修改后的Pod模板，创建一个新的ReplicaSet（69c44dfb78）
2. 水平伸缩：旧（3） ==> **新（1）** ==> 旧（2） ==> **新（2）** ==> 旧（1） ==> **新（3）** ==> 旧（0）
1. Deployment控制器实际控制的是**ReplicaSet的数量和属性**，一个**应用版本**对应一个**ReplicaSet**
   - 而某个版本应用的**Pod数量**，则由**ReplicaSet控制器**来保证

![](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210616171229994.png)

### 水平扩展

只是Pod数量的增减，不会新建ReplicaSet

```
# kubectl scale deployment nginx-deployment --replicas=4
deployment.apps/nginx-deployment scaled

# kubectl rollout status deployment/nginx-deployment
Waiting for deployment "nginx-deployment" rollout to finish: 3 of 4 updated replicas are available...
deployment "nginx-deployment" successfully rolled out

# kubectl get rs
NAME                          DESIRED   CURRENT   READY   AGE
nginx-deployment-5d59d67564   0         0         0       58m
nginx-deployment-69c44dfb78   4         4         4       32m

# kubectl describe deployment nginx-deployment
...
OldReplicaSets:  <none>
NewReplicaSet:   nginx-deployment-69c44dfb78 (4/4 replicas created)
Events:
  Type    Reason             Age   From                   Message
  ----    ------             ----  ----                   -------
  Normal  ScalingReplicaSet  58m   deployment-controller  Scaled up replica set nginx-deployment-5d59d67564 to 3
  Normal  ScalingReplicaSet  33m   deployment-controller  Scaled up replica set nginx-deployment-69c44dfb78 to 1
  Normal  ScalingReplicaSet  33m   deployment-controller  Scaled down replica set nginx-deployment-5d59d67564 to 2
  Normal  ScalingReplicaSet  33m   deployment-controller  Scaled up replica set nginx-deployment-69c44dfb78 to 2
  Normal  ScalingReplicaSet  33m   deployment-controller  Scaled down replica set nginx-deployment-5d59d67564 to 1
  Normal  ScalingReplicaSet  33m   deployment-controller  Scaled up replica set nginx-deployment-69c44dfb78 to 3
  Normal  ScalingReplicaSet  33m   deployment-controller  Scaled down replica set nginx-deployment-5d59d67564 to 0
  Normal  ScalingReplicaSet  60s   deployment-controller  Scaled up replica set nginx-deployment-69c44dfb78 to 4
```

### 版本回滚

1. 新Pod有问题，滚动更新会停止，允许开发人员和运维人员介入（使用Pod的**Health Check**，而不是简单依赖容器的Running状态）
2. Deployment控制器为了保证**服务的连续性**
   - 在任何时间窗口内，只有指定比例的Pod处于**离线状态** -- 默认为**DESIRED**值的**25%**
   - 在任何时间窗口内，只有指定比例的**新Pod**被创建出来 -- 默认为**DESIRED**值的**25%**
   - RollingUpdateStrategy
     - **maxSurge**：一次滚动中，Deployment控制器**可以创建的新Pod数**，可以用百分比形式
     - **maxUnavailable**：一次滚动中，Deployment控制器**可以删除的旧Pod数**，可以用百分比形式
3. 命令
   - kubectl set image：直接修改**Deployment**所使用的镜像
   - kubectl rollout undo：把整个**Deployment**回滚到**上一版本**
   - kubectl rollout history：查看每次**Deployment**变更对应的版本

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
...
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 1
```

修改为错误的镜像版本（nginx:1.91）

```
# kubectl set image deployment/nginx-deployment nginx=nginx:1.91
deployment.apps/nginx-deployment image updated
```

1. 新ReplicaSet（停止水平扩展）：创建了两个新Pod，状态为Running（CURRENT=2），但并没有进入Ready状态
2. 旧ReplicaSet（停止水平收缩）：删除了一个旧Pod

```
# kubectl get rs
NAME                          DESIRED   CURRENT   READY   AGE
nginx-deployment-5d59d67564   0         0         0       68m
nginx-deployment-69c44dfb78   3         3         3       42m
nginx-deployment-d645d84b6    2         2         0       24s

# kubectl describe deployment nginx-deployment
...
OldReplicaSets:  <none>
NewReplicaSet:   nginx-deployment-69c44dfb78 (4/4 replicas created)
Events:
  Type    Reason             Age                  From                   Message
  ----    ------             ----                 ----                   -------
  Normal  ScalingReplicaSet  49m                  deployment-controller  Scaled up replica set nginx-deployment-69c44dfb78 to 1
  Normal  ScalingReplicaSet  49m                  deployment-controller  Scaled down replica set nginx-deployment-5d59d67564 to 2
  Normal  ScalingReplicaSet  49m                  deployment-controller  Scaled up replica set nginx-deployment-69c44dfb78 to 2
  Normal  ScalingReplicaSet  49m                  deployment-controller  Scaled down replica set nginx-deployment-5d59d67564 to 1
  Normal  ScalingReplicaSet  49m                  deployment-controller  Scaled up replica set nginx-deployment-69c44dfb78 to 3
  Normal  ScalingReplicaSet  49m                  deployment-controller  Scaled down replica set nginx-deployment-5d59d67564 to 0
  Normal  ScalingReplicaSet  7m25s                deployment-controller  Scaled up replica set nginx-deployment-d645d84b6 to 1
  Normal  ScalingReplicaSet  7m25s                deployment-controller  Scaled down replica set nginx-deployment-69c44dfb78 to 3
  Normal  ScalingReplicaSet  7m25s                deployment-controller  Scaled up replica set nginx-deployment-d645d84b6 to 2
```

回滚到上一版本（旧ReplicaSet扩展为4个，新ReplicaSet收缩为0个）

```
# kubectl rollout undo deployment/nginx-deployment
deployment.apps/nginx-deployment rolled back

# kubectl get rs
NAME                          DESIRED   CURRENT   READY   AGE
nginx-deployment-5d59d67564   0         0         0       72m
nginx-deployment-69c44dfb78   4         4         4       46m
nginx-deployment-d645d84b6    0         0         0       4m54s

# kubectl describe deployment nginx-deployment
...
OldReplicaSets:  <none>
NewReplicaSet:   nginx-deployment-69c44dfb78 (4/4 replicas created)
Events:
  Type    Reason             Age                  From                   Message
  ----    ------             ----                 ----                   -------
  Normal  ScalingReplicaSet  49m                  deployment-controller  Scaled up replica set nginx-deployment-69c44dfb78 to 1
  Normal  ScalingReplicaSet  49m                  deployment-controller  Scaled down replica set nginx-deployment-5d59d67564 to 2
  Normal  ScalingReplicaSet  49m                  deployment-controller  Scaled up replica set nginx-deployment-69c44dfb78 to 2
  Normal  ScalingReplicaSet  49m                  deployment-controller  Scaled down replica set nginx-deployment-5d59d67564 to 1
  Normal  ScalingReplicaSet  49m                  deployment-controller  Scaled up replica set nginx-deployment-69c44dfb78 to 3
  Normal  ScalingReplicaSet  49m                  deployment-controller  Scaled down replica set nginx-deployment-5d59d67564 to 0
  Normal  ScalingReplicaSet  7m25s                deployment-controller  Scaled up replica set nginx-deployment-d645d84b6 to 1
  Normal  ScalingReplicaSet  7m25s                deployment-controller  Scaled down replica set nginx-deployment-69c44dfb78 to 3
  Normal  ScalingReplicaSet  7m25s                deployment-controller  Scaled up replica set nginx-deployment-d645d84b6 to 2
  Normal  ScalingReplicaSet  2m36s (x2 over 17m)  deployment-controller  Scaled up replica set nginx-deployment-69c44dfb78 to 4
  Normal  ScalingReplicaSet  2m36s                deployment-controller  Scaled down replica set nginx-deployment-d645d84b6 to 0
```

回滚到特定历史版本

```
# kubectl rollout history deployment/nginx-deployment
deployment.apps/nginx-deployment
REVISION  CHANGE-CAUSE
1         kubectl apply --filename=nginx-deployment.yaml --record=true
7         kubectl apply --filename=nginx-deployment.yaml --record=true
8         kubectl apply --filename=nginx-deployment.yaml --record=true

# kubectl rollout history deployment/nginx-deployment --revision=1
deployment.apps/nginx-deployment with revision #1
Pod Template:
  Labels:	app=nginx
	pod-template-hash=5d59d67564
  Annotations:	kubernetes.io/change-cause: kubectl apply --filename=nginx-deployment.yaml --record=true
  Containers:
   nginx:
    Image:	nginx:1.7.9
    Port:	80/TCP
    Host Port:	0/TCP
    Environment:	<none>
    Mounts:	<none>
  Volumes:	<none>

# kubectl get rs
NAME                          DESIRED   CURRENT   READY   AGE
nginx-deployment-5d59d67564   0         0         0       83m
nginx-deployment-69c44dfb78   4         4         4       57m
nginx-deployment-d645d84b6    0         0         0       15m

# kubectl rollout undo deployment/nginx-deployment --to-revision=1
deployment.apps/nginx-deployment rolled back

# kubectl get rs
NAME                          DESIRED   CURRENT   READY   AGE
nginx-deployment-5d59d67564   4         4         4       85m
nginx-deployment-69c44dfb78   0         0         0       60m
nginx-deployment-d645d84b6    0         0         0       18m
```

## 减少ReplicaSet对象

1. 默认情况下，每次对Deployment进行一次更新操作，都会生成一个新的ReplicaSet对象
2. 合并（暂停 & 恢复）
   - 对Deployment的多次更新操作，最终生成一个ReplicaSet对象
   - 命令
     - kubectl rollout pause：让Deployment进入暂停状态，对Deployment的所有修改，都不会触发滚动更新
     - kubectl rollout resume：恢复Deployment，生成一个ReplicaSet对象
3. 历史版本
   - Deployment.spec.revisionHistoryLimit：Kubernetes为Deployment保留的历史版本数

# 参考资料

1. [深入剖析Kubernetes](https://time.geekbang.org/column/intro/100015201)