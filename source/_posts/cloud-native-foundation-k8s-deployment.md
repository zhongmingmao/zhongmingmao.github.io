---
title: Kubernetes - Deployment
mathjax: false
date: 2022-10-25 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/Kubernetes-Deployments-Rolling-Update-Configuration.webp
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Kubernetes
---

# API

```
$ k api-resources --api-group=apps
NAME                  SHORTNAMES   APIVERSION   NAMESPACED   KIND
controllerrevisions                apps/v1      true         ControllerRevision
daemonsets            ds           apps/v1      true         DaemonSet
deployments           deploy       apps/v1      true         Deployment
replicasets           rs           apps/v1      true         ReplicaSet
statefulsets          sts          apps/v1      true         StatefulSet
```

<!-- more -->

# YAML

```
$ k create deployment nginx-deploy --image=nginx:alpine --dry-run=client -oyaml
apiVersion: apps/v1
kind: Deployment
metadata:
  creationTimestamp: null
  labels:
    app: nginx-deploy
  name: nginx-deploy
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx-deploy
  strategy: {}
  template:
    metadata:
      creationTimestamp: null
      labels:
        app: nginx-deploy
    spec:
      containers:
      - image: nginx:alpine
        name: nginx
        resources: {}
status: {}
```

1. `replicas`
   - 副本数
2. `selector`
   - `筛选`出要被 Deployment 管理的 Pod 对象
   - matchLabels
     - 定义了 Pod 对象应该携带的 Label，必须和 template.labels `完全相同`
     - 否则 Deployment 就会`找不到`要控制的 Pod 对象，`kube-apiserver` 会告知 YAML `格式校验错误`，无法创建

> Job 中的 Pod 一般不会被其它对象使用；而 Deployment 中的 Pod 有可能会被其它对象引用来管理，例如 `Service`

> Deployment 和 Pod 是一种`松散`的组织关系，Deployment `并不实际持有` Pod，通过 `Label` 实现`松耦合`

![image-20230617221909139](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230617221909139.png)

# 使用

```yaml nginx-deploy.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deploy
  labels:
    app: nginx-deploy

spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx-deploy
  template:
    metadata:
      labels:
        app: nginx-deploy
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
```

```
$ k apply -f nginx-deploy.yml
deployment.apps/nginx-deploy created

$ k get deployments.apps -owide
NAME           READY   UP-TO-DATE   AVAILABLE   AGE   CONTAINERS   IMAGES         SELECTOR
nginx-deploy   2/2     2            2           23s   nginx        nginx:alpine   app=nginx-deploy

$ k get rs
NAME                      DESIRED   CURRENT   READY   AGE
nginx-deploy-5db48f768c   2         2         2       51s

$ k get po -owide
NAME                            READY   STATUS    RESTARTS   AGE   IP           NODE         NOMINATED NODE   READINESS GATES
nginx-deploy-5db48f768c-84f4q   1/1     Running   0          66s   10.10.1.33   mac-worker   <none>           <none>
nginx-deploy-5db48f768c-bmqwj   1/1     Running   0          66s   10.10.1.32   mac-worker   <none>           <none>
```

> 删除 Pod

```
$ k delete po nginx-deploy-5db48f768c-84f4q
pod "nginx-deploy-5db48f768c-84f4q" deleted

$ k get po
NAME                            READY   STATUS    RESTARTS   AGE
nginx-deploy-5db48f768c-4pd6w   1/1     Running   0          20s
nginx-deploy-5db48f768c-bmqwj   1/1     Running   0          3m55s

$ k get rs -w
NAME                      DESIRED   CURRENT   READY   AGE
nginx-deploy-5db48f768c   2         2         2       2m41s
nginx-deploy-5db48f768c   2         1         1       3m35s
nginx-deploy-5db48f768c   2         2         1       3m35s
nginx-deploy-5db48f768c   2         2         2       3m36s

$ k get po -w
NAME                            READY   STATUS    RESTARTS   AGE
nginx-deploy-5db48f768c-84f4q   1/1     Running   0          2m54s
nginx-deploy-5db48f768c-bmqwj   1/1     Running   0          2m54s
nginx-deploy-5db48f768c-84f4q   1/1     Terminating   0          3m35s
nginx-deploy-5db48f768c-4pd6w   0/1     Pending       0          0s
nginx-deploy-5db48f768c-4pd6w   0/1     Pending       0          0s
nginx-deploy-5db48f768c-4pd6w   0/1     ContainerCreating   0          0s
nginx-deploy-5db48f768c-84f4q   0/1     Terminating         0          3m36s
nginx-deploy-5db48f768c-84f4q   0/1     Terminating         0          3m36s
nginx-deploy-5db48f768c-84f4q   0/1     Terminating         0          3m36s
nginx-deploy-5db48f768c-4pd6w   1/1     Running             0          1s

$ k describe rs nginx-deploy-5db48f768c
Name:           nginx-deploy-5db48f768c
Namespace:      default
Selector:       app=nginx-deploy,pod-template-hash=5db48f768c
Labels:         app=nginx-deploy
                pod-template-hash=5db48f768c
Annotations:    deployment.kubernetes.io/desired-replicas: 2
                deployment.kubernetes.io/max-replicas: 3
                deployment.kubernetes.io/revision: 1
Controlled By:  Deployment/nginx-deploy
Replicas:       2 current / 2 desired
Pods Status:    2 Running / 0 Waiting / 0 Succeeded / 0 Failed
Pod Template:
  Labels:  app=nginx-deploy
           pod-template-hash=5db48f768c
  Containers:
   nginx:
    Image:        nginx:alpine
    Port:         <none>
    Host Port:    <none>
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
Events:
  Type    Reason            Age    From                   Message
  ----    ------            ----   ----                   -------
  Normal  SuccessfulCreate  4m47s  replicaset-controller  Created pod: nginx-deploy-5db48f768c-bmqwj
  Normal  SuccessfulCreate  4m47s  replicaset-controller  Created pod: nginx-deploy-5db48f768c-84f4q
  Normal  SuccessfulCreate  72s    replicaset-controller  Created pod: nginx-deploy-5db48f768c-4pd6w
  
$ k describe po nginx-deploy-5db48f768c-4pd6w
Name:         nginx-deploy-5db48f768c-4pd6w
Namespace:    default
Priority:     0
Node:         mac-worker/192.168.191.146
Start Time:   Sat, 17 Jun 2022 15:16:34 +0000
Labels:       app=nginx-deploy
              pod-template-hash=5db48f768c
Annotations:  <none>
Status:       Running
IP:           10.10.1.34
IPs:
  IP:           10.10.1.34
Controlled By:  ReplicaSet/nginx-deploy-5db48f768c
Containers:
  nginx:
    Container ID:   docker://1c1f2b9f0654e6e59a7eafec6097281727060ef4dce355d87897391e1bd8e6ae
    Image:          nginx:alpine
    Image ID:       docker-pullable://nginx@sha256:2d194184b067db3598771b4cf326cfe6ad5051937ba1132b8b7d4b0184e0d0a6
    Port:           <none>
    Host Port:      <none>
    State:          Running
      Started:      Sat, 17 Jun 2022 15:16:34 +0000
    Ready:          True
    Restart Count:  0
    Environment:    <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-g2pr6 (ro)
Conditions:
  Type              Status
  Initialized       True
  Ready             True
  ContainersReady   True
  PodScheduled      True
Volumes:
  kube-api-access-g2pr6:
    Type:                    Projected (a volume that contains injected data from multiple sources)
    TokenExpirationSeconds:  3607
    ConfigMapName:           kube-root-ca.crt
    ConfigMapOptional:       <nil>
    DownwardAPI:             true
QoS Class:                   BestEffort
Node-Selectors:              <none>
Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:
  Type    Reason     Age    From               Message
  ----    ------     ----   ----               -------
  Normal  Scheduled  4m17s  default-scheduler  Successfully assigned default/nginx-deploy-5db48f768c-4pd6w to mac-worker
  Normal  Pulled     4m17s  kubelet            Container image "nginx:alpine" already present on machine
  Normal  Created    4m17s  kubelet            Created container nginx
  Normal  Started    4m17s  kubelet            Started container nginx
```

> 手动扩容

```
$ k scale --replicas=3 deployment nginx-deploy
deployment.apps/nginx-deploy scaled

$ k get po -l app=nginx-deploy
NAME                            READY   STATUS    RESTARTS   AGE
nginx-deploy-5db48f768c-4pd6w   1/1     Running   0          10m
nginx-deploy-5db48f768c-88k88   1/1     Running   0          31s
nginx-deploy-5db48f768c-bmqwj   1/1     Running   0          14m

$ k get rs -w
NAME                      DESIRED   CURRENT   READY   AGE
nginx-deploy-5db48f768c   2         2         2       13m
nginx-deploy-5db48f768c   3         2         2       14m
nginx-deploy-5db48f768c   3         2         2       14m
nginx-deploy-5db48f768c   3         3         2       14m
nginx-deploy-5db48f768c   3         3         3       14m

$ k get po -w
NAME                            READY   STATUS    RESTARTS   AGE
nginx-deploy-5db48f768c-4pd6w   1/1     Running   0          10m
nginx-deploy-5db48f768c-bmqwj   1/1     Running   0          13m
nginx-deploy-5db48f768c-88k88   0/1     Pending   0          0s
nginx-deploy-5db48f768c-88k88   0/1     Pending   0          0s
nginx-deploy-5db48f768c-88k88   0/1     ContainerCreating   0          0s
nginx-deploy-5db48f768c-88k88   1/1     Running             0          1s

$ k describe rs nginx-deploy-5db48f768c
Name:           nginx-deploy-5db48f768c
Namespace:      default
Selector:       app=nginx-deploy,pod-template-hash=5db48f768c
Labels:         app=nginx-deploy
                pod-template-hash=5db48f768c
Annotations:    deployment.kubernetes.io/desired-replicas: 3
                deployment.kubernetes.io/max-replicas: 4
                deployment.kubernetes.io/revision: 1
Controlled By:  Deployment/nginx-deploy
Replicas:       3 current / 3 desired
Pods Status:    3 Running / 0 Waiting / 0 Succeeded / 0 Failed
Pod Template:
  Labels:  app=nginx-deploy
           pod-template-hash=5db48f768c
  Containers:
   nginx:
    Image:        nginx:alpine
    Port:         <none>
    Host Port:    <none>
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
Events:
  Type    Reason            Age   From                   Message
  ----    ------            ----  ----                   -------
  Normal  SuccessfulCreate  16m   replicaset-controller  Created pod: nginx-deploy-5db48f768c-bmqwj
  Normal  SuccessfulCreate  16m   replicaset-controller  Created pod: nginx-deploy-5db48f768c-84f4q
  Normal  SuccessfulCreate  12m   replicaset-controller  Created pod: nginx-deploy-5db48f768c-4pd6w
  Normal  SuccessfulCreate  2m4s  replicaset-controller  Created pod: nginx-deploy-5db48f768c-88k88

$ k describe deployments.apps nginx-deploy
Name:                   nginx-deploy
Namespace:              default
CreationTimestamp:      Sat, 17 Jun 2022 15:12:59 +0000
Labels:                 app=nginx-deploy
Annotations:            deployment.kubernetes.io/revision: 1
Selector:               app=nginx-deploy
Replicas:               3 desired | 3 updated | 3 total | 3 available | 0 unavailable
StrategyType:           RollingUpdate
MinReadySeconds:        0
RollingUpdateStrategy:  25% max unavailable, 25% max surge
Pod Template:
  Labels:  app=nginx-deploy
  Containers:
   nginx:
    Image:        nginx:alpine
    Port:         <none>
    Host Port:    <none>
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
Conditions:
  Type           Status  Reason
  ----           ------  ------
  Progressing    True    NewReplicaSetAvailable
  Available      True    MinimumReplicasAvailable
OldReplicaSets:  <none>
NewReplicaSet:   nginx-deploy-5db48f768c (3/3 replicas created)
Events:
  Type    Reason             Age   From                   Message
  ----    ------             ----  ----                   -------
  Normal  ScalingReplicaSet  15m   deployment-controller  Scaled up replica set nginx-deploy-5db48f768c to 2
  Normal  ScalingReplicaSet  80s   deployment-controller  Scaled up replica set nginx-deploy-5db48f768c to 3
```

> 滚动更新：修改 `Pod Template`，产生新的 `Hash` 值，对应新的 `ReplicaSet`

```
$ k apply -f nginx-deploy.yml
deployment.apps/nginx-deploy configured

$ k get rs -w
NAME                      DESIRED   CURRENT   READY   AGE
nginx-deploy-5db48f768c   3         3         3       21m
nginx-deploy-5db48f768c   2         3         3       21m
nginx-deploy-5db48f768c   2         3         3       21m
nginx-deploy-676b7b47d4   1         0         0       0s
nginx-deploy-5db48f768c   2         2         2       21m
nginx-deploy-676b7b47d4   1         0         0       0s
nginx-deploy-676b7b47d4   1         1         0       0s
nginx-deploy-676b7b47d4   1         1         1       1s
nginx-deploy-5db48f768c   1         2         2       21m
nginx-deploy-5db48f768c   1         2         2       21m
nginx-deploy-676b7b47d4   2         1         1       1s
nginx-deploy-5db48f768c   1         1         1       21m
nginx-deploy-676b7b47d4   2         1         1       1s
nginx-deploy-676b7b47d4   2         2         1       1s
nginx-deploy-676b7b47d4   2         2         2       2s
nginx-deploy-5db48f768c   0         1         1       21m
nginx-deploy-5db48f768c   0         1         1       21m
nginx-deploy-5db48f768c   0         0         0       21m

$ k get po -w
NAME                            READY   STATUS    RESTARTS   AGE
nginx-deploy-5db48f768c-4pd6w   1/1     Running   0          17m
nginx-deploy-5db48f768c-88k88   1/1     Running   0          7m23s
nginx-deploy-5db48f768c-bmqwj   1/1     Running   0          21m
nginx-deploy-5db48f768c-88k88   1/1     Terminating   0          7m33s
nginx-deploy-676b7b47d4-4wfw7   0/1     Pending       0          0s
nginx-deploy-676b7b47d4-4wfw7   0/1     Pending       0          0s
nginx-deploy-676b7b47d4-4wfw7   0/1     ContainerCreating   0          0s
nginx-deploy-5db48f768c-88k88   0/1     Terminating         0          7m33s
nginx-deploy-5db48f768c-88k88   0/1     Terminating         0          7m33s
nginx-deploy-5db48f768c-88k88   0/1     Terminating         0          7m33s
nginx-deploy-676b7b47d4-4wfw7   1/1     Running             0          1s
nginx-deploy-5db48f768c-4pd6w   1/1     Terminating         0          17m
nginx-deploy-676b7b47d4-bcmqb   0/1     Pending             0          0s
nginx-deploy-676b7b47d4-bcmqb   0/1     Pending             0          0s
nginx-deploy-676b7b47d4-bcmqb   0/1     ContainerCreating   0          0s
nginx-deploy-676b7b47d4-bcmqb   1/1     Running             0          1s
nginx-deploy-5db48f768c-4pd6w   0/1     Terminating         0          18m
nginx-deploy-5db48f768c-bmqwj   1/1     Terminating         0          21m
nginx-deploy-5db48f768c-4pd6w   0/1     Terminating         0          18m
nginx-deploy-5db48f768c-4pd6w   0/1     Terminating         0          18m
nginx-deploy-5db48f768c-bmqwj   0/1     Terminating         0          21m
nginx-deploy-5db48f768c-bmqwj   0/1     Terminating         0          21m
nginx-deploy-5db48f768c-bmqwj   0/1     Terminating         0          21m

$ k describe deployments.apps nginx-deploy
Name:                   nginx-deploy
Namespace:              default
CreationTimestamp:      Sat, 17 Jun 2022 15:12:59 +0000
Labels:                 app=nginx-deploy
Annotations:            deployment.kubernetes.io/revision: 2
Selector:               app=nginx-deploy
Replicas:               2 desired | 2 updated | 2 total | 2 available | 0 unavailable
StrategyType:           RollingUpdate
MinReadySeconds:        0
RollingUpdateStrategy:  25% max unavailable, 25% max surge
Pod Template:
  Labels:  app=nginx-deploy
  Containers:
   nginx:
    Image:        nginx:alpine
    Port:         <none>
    Host Port:    <none>
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
Conditions:
  Type           Status  Reason
  ----           ------  ------
  Available      True    MinimumReplicasAvailable
  Progressing    True    NewReplicaSetAvailable
OldReplicaSets:  <none>
NewReplicaSet:   nginx-deploy-676b7b47d4 (2/2 replicas created)
Events:
  Type    Reason             Age   From                   Message
  ----    ------             ----  ----                   -------
  Normal  ScalingReplicaSet  23m   deployment-controller  Scaled up replica set nginx-deploy-5db48f768c to 2
  Normal  ScalingReplicaSet  9m7s  deployment-controller  Scaled up replica set nginx-deploy-5db48f768c to 3
  Normal  ScalingReplicaSet  94s   deployment-controller  Scaled down replica set nginx-deploy-5db48f768c to 2
  Normal  ScalingReplicaSet  94s   deployment-controller  Scaled up replica set nginx-deploy-676b7b47d4 to 1
  Normal  ScalingReplicaSet  93s   deployment-controller  Scaled down replica set nginx-deploy-5db48f768c to 1
  Normal  ScalingReplicaSet  93s   deployment-controller  Scaled up replica set nginx-deploy-676b7b47d4 to 2
  Normal  ScalingReplicaSet  92s   deployment-controller  Scaled down replica set nginx-deploy-5db48f768c to 0
```

![](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/Kubernetes-Deployments-Rolling-Update-Configuration.webp)
