---
title: Kubernetes - Architectural principles
mathjax: false
date: 2022-12-01 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/BLOG-Kubernets-1024x536.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
---

# 主要功能

![image-20230527222605582](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230527222605582.png)

<!-- more -->

1.  基于`容器`的应用部署、维护和滚动升级
2. `服务发现`和`负载均衡`
3. `跨机器`和`跨地区`的集群调度
4. `自动伸缩`
5. `无状态`服务和`有状态`服务
6. `插件机制`保证扩展性

# 命令式 vs 声明式

> YAML

1. `命令式`关注：`如何做`
2. `声明式`关注：`做什么`

# 核心对象

> Kubernetes 的所有管理能力是构建在`对象抽象`的基础上

| 对象        | 描述                                                         |
| ----------- | ------------------------------------------------------------ |
| `Node`      | `计算节点`的抽象                                             |
| `Namespace` | `资源隔离`的基本单位                                         |
| `Pod`       | 用来描述`应用实例`，最为`核心`的对象                         |
| `Service`   | 如何将应用发布为`服务`，本质上是`负载均衡`和`域名服务`的`声明` |

# 核心架构

![image-20230527235207609](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230527235207609.png)

# 核心组件

> `Scheduler`关注`没有与 Node 绑定的 Pod`，完成调度后，会将信息写入 `etcd`，而 `kubelet` 会`监听`到

![image-20230528001919213](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230528001919213.png)

## Master

| 组件                 | 描述                                                         |
| -------------------- | ------------------------------------------------------------ |
| `API Server`         | API 网关                                                     |
| `Cluster Data Store` | `etcd`：`分布式 kv 存储`，K8S 将`所有 API 对象`持久存储在 `etcd` |
| `Controller Manager` | 处理集群日常任务的控制器：节点控制器、副本控制器等           |
| `Scheduler`          | 监控`新建的 Pods` 并将其分配给 Node                          |

## Worker

| 组件         | 描述                                                         |
| ------------ | ------------------------------------------------------------ |
| `Kubelet`    | 负责被调度该 Node 上的 `Pod` 的`生命周期管理`，执行任务并将 Pod 的状态`上报`给 Master<br />通过`容器运行时`来运行容器<br />`定期`对容器进行`健康探测` |
| `Kube-proxy` | 负责`节点网络`：在主机上维护网络规则并执行连接转发<br />负责对正在服务的 Pods 进行`负载均衡`  - Service |

## etcd

> etcd 是 `CoreOS` 基于 `Raft` 开发的`分布式 kv 存储`，可用于`服务发现`、`共享配置`以及`一致性保障`

1. 基本的 kv 存储
2. `监听`机制 - `watch`
3. key 的`过期`以及`续约`机制：用于`监控`和`服务发现`
4. 原子 `CAS` 和 `CAD`：用于`分布式锁`和 `Leader 选举`

![image-20230528021712591](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230528021712591.png)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  labels:
    app: web
spec:
  containers:
    - name: nginx
      image: nginx
      ports:
        - containerPort: 80
```

```
$ k -n kube-system get po
NAME                          READY   STATUS    RESTARTS   AGE
coredns-7f6cbbb7b8-2jx7p      1/1     Running   0          7h21m
coredns-7f6cbbb7b8-b59cb      1/1     Running   0          7h21m
etcd-k8s                      1/1     Running   0          7h21m
kube-apiserver-k8s            1/1     Running   0          7h21m
kube-controller-manager-k8s   1/1     Running   0          7h21m
kube-proxy-t5v9f              1/1     Running   0          7h21m
kube-scheduler-k8s            1/1     Running   0          7h21m

$ export ETCDCTL_API=3

$ sudo etcdctl --endpoints https://localhost:2379 --cert /etc/kubernetes/pki/etcd/server.crt --key /etc/kubernetes/pki/etcd/server.key --cacert /etc/kubernetes/pki/etcd/ca.crt get --keys-only --prefix /
/registry/apiextensions.k8s.io/customresourcedefinitions/apiservers.operator.tigera.io
/registry/apiextensions.k8s.io/customresourcedefinitions/bgpconfigurations.crd.projectcalico.org
...
/registry/pods/default/nginx
...

$ sudo etcdctl --endpoints https://localhost:2379 --cert /etc/kubernetes/pki/etcd/server.crt --key /etc/kubernetes/pki/etcd/server.key --cacert /etc/kubernetes/pki/etcd/ca.crt watch --prefix /registry/pods/default/nginx

```

```
$ k edit pods nginx
...
metadata:
  annotations:
    my.app: nginx
...
```

> 前一个窗口会得到一个`事件通知`

![image-20230529223051970](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230529223051970.png)

> API Server 是`唯一`与 etcd 通信的组件，`API Server 本身也提供 Watch 机制`，供 Kubelet 等其它组件使用

## API Server

> API Server 是 Kubernetes 中`最为核心`的组件之一

1. 提供`集群管理`的 `REST API` 接口：`认证`、`授权`、`准入`
2. 提供其他模块之间的数据交互和通信的`枢纽`
   - `只有 API Server 才能直接操作 ectd`：其他模块通过 API Server 查询或修改数据
3. API Server 提供 etcd 的`数据缓存`（减少集群对 etcd 的访问）

![image-20230529223604468](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230529223604468.png)

![image-20230529224212775](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230529224212775.png)

## Controller Manager

1. Controller Manager 是集群的`大脑`
2. `声明式`：确保系统的`真实状态`与用户定义的`期望状态`一致
3. Controller Manager 是`多个 Controller 的组合`
   - Controller 本质上是一个 `control loop`，负责`监听`其管控的对象，当对象发生变更时完成配置
4. `自动重试` + `最终一致性`
   - Controller 配置失败会触发自动重试，整个集群会在 Controller 不断重试的机制下确保最终一致性

> 基于 `watch` 机制
> 收到通知后，`生产者`将事件放入队列，`消费者`消费队列，如果处理失败，需要`重新放回`队列，进行重试

### 工作流程

> `生产者消费者模型`

![image-20230529225117328](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230529225117328.png)

### Informer

![image-20230529225928598](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230529225928598.png)

1. 定义任意的 `K8S 对象`，都只需要定义其`数据结构`，然后在 `API Server` 发布
   - 所有的对象访问都需要经过 `API Server`
2. API Server 提供 `List & Watch` 机制
   - Informer 在`启动`时，发起一个`长连接`到 API Server，然后 `List & Watch` 自身关注的对象
3. API Server 提供的是 `REST API`，返回给 Informer 的是 `String` 或者 `Protobuf` 的`序列化`数据
   - 需要借助 `Reflector` 通过`反射`进行`反序列化`成 `Go 对象`
4. `Delta FIFO Queue` 是一个 `Ring Buffer`
   - Informer 会从 Delta FIFO Queue 取出对象，然后放入 `Thread Safe Store`
   - 并且将对象的`变化事件`分配给对应的 Handler
     - Handler 再借助 `Indexer` 去 `Thread Safe Store` 获取上一步存储的对象 - 减少 API Server 的`访问压力`

> 任何的 `Controller` 都应该使用 `SharedInformer Framework`
> 所有的 API 对象会有一份`本地缓存`（Thread Safe Store），降低 API Server 的压力

> 由 `SharedInformer Framework` 来保证 `Thread Safe Store` 与 `API Server` 的`数据一致性`

> Controller 避免`频繁访问` API Server（应从 Thread Safe Store 读取），只有`更新对象`时，才需要与 API Server 有交互

### 各司其职

> 所有 Controller 只与 API Server 通信
> API Server 负责与 `etcd` 通信，所有 Controller 也会基于 API Server 的 `List & Watch`

![image-20230601225457858](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230601225457858.png)

> YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 1
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
          image: nginx
```

> Controller Manager

```
$ k get po -n kube-system -owide -l component=kube-controller-manager,tier=control-plane

NAME                              READY   STATUS    RESTARTS       AGE    IP                NODE      NOMINATED NODE   READINESS GATES
kube-controller-manager-mac-k8s   1/1     Running   3 (4d5h ago)   4d5h   192.168.191.138   mac-k8s   <none>           <none>

$ k logs kube-controller-manager-mac-k8s -n kube-system | grep nginx
I0530 02:17:02.860036       1 event.go:291] "Event occurred" object="default/nginx-deployment" kind="Deployment" apiVersion="apps/v1" type="Normal" reason="ScalingReplicaSet" message="Scaled up replica set nginx-deployment-6799fc88d8 to 1"
I0530 02:17:02.866669       1 event.go:291] "Event occurred" object="default/nginx-deployment-6799fc88d8" kind="ReplicaSet" apiVersion="apps/v1" type="Normal" reason="SuccessfulCreate" message="Created pod: nginx-deployment-6799fc88d8-j5rnt"
```

> Deployment

```
$ k get deployments.apps -owide
NAME               READY   UP-TO-DATE   AVAILABLE   AGE     CONTAINERS   IMAGES   SELECTOR
nginx-deployment   1/1     1            1           3m33s   nginx        nginx    app=nginx

$ k describe deployments.apps nginx-deployment
Name:                   nginx-deployment
Namespace:              default
CreationTimestamp:      Tue, 30 May 2022 02:17:02 +0000
Labels:                 <none>
Annotations:            deployment.kubernetes.io/revision: 1
Selector:               app=nginx
Replicas:               1 desired | 1 updated | 1 total | 1 available | 0 unavailable
StrategyType:           RollingUpdate
MinReadySeconds:        0
RollingUpdateStrategy:  25% max unavailable, 25% max surge
Pod Template:
  Labels:  app=nginx
  Containers:
   nginx:
    Image:        nginx
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
NewReplicaSet:   nginx-deployment-6799fc88d8 (1/1 replicas created)
Events:
  Type    Reason             Age    From                   Message
  ----    ------             ----   ----                   -------
  Normal  ScalingReplicaSet  6m55s  deployment-controller  Scaled up replica set nginx-deployment-6799fc88d8 to 1
```

> ReplicaSet

```
$ k describe replicasets.apps nginx-deployment-6799fc88d8
Name:           nginx-deployment-6799fc88d8
Namespace:      default
Selector:       app=nginx,pod-template-hash=6799fc88d8
Labels:         app=nginx
                pod-template-hash=6799fc88d8
Annotations:    deployment.kubernetes.io/desired-replicas: 1
                deployment.kubernetes.io/max-replicas: 2
                deployment.kubernetes.io/revision: 1
Controlled By:  Deployment/nginx-deployment
Replicas:       1 current / 1 desired
Pods Status:    1 Running / 0 Waiting / 0 Succeeded / 0 Failed
Pod Template:
  Labels:  app=nginx
           pod-template-hash=6799fc88d8
  Containers:
   nginx:
    Image:        nginx
    Port:         <none>
    Host Port:    <none>
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
Events:
  Type    Reason            Age   From                   Message
  ----    ------            ----  ----                   -------
  Normal  SuccessfulCreate  12m   replicaset-controller  Created pod: nginx-deployment-6799fc88d8-j5rnt

$ k get replicasets.apps nginx-deployment-6799fc88d8 -oyaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  annotations:
    deployment.kubernetes.io/desired-replicas: "1"
    deployment.kubernetes.io/max-replicas: "2"
    deployment.kubernetes.io/revision: "1"
  creationTimestamp: "2022-05-30T02:17:02Z"
  generation: 1
  labels:
    app: nginx
    pod-template-hash: 6799fc88d8
  name: nginx-deployment-6799fc88d8
  namespace: default
  ownerReferences:
  - apiVersion: apps/v1
    blockOwnerDeletion: true
    controller: true
    kind: Deployment
    name: nginx-deployment
    uid: eaafeaa4-02cb-441b-a8ae-59e2d16f0e45
  resourceVersion: "3710"
  uid: 591b0bf5-f1a0-4343-9624-b5706d1e7243
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
      pod-template-hash: 6799fc88d8
  template:
    metadata:
      creationTimestamp: null
      labels:
        app: nginx
        pod-template-hash: 6799fc88d8
    spec:
      containers:
      - image: nginx
        imagePullPolicy: Always
        name: nginx
        resources: {}
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
      dnsPolicy: ClusterFirst
      restartPolicy: Always
      schedulerName: default-scheduler
      securityContext: {}
      terminationGracePeriodSeconds: 30
status:
  availableReplicas: 1
  fullyLabeledReplicas: 1
  observedGeneration: 1
  readyReplicas: 1
  replicas: 1
```

> Pod
> nodeName 一开始为`空`，调度器会监听到，然后通过`调度策略`调度到某个 `Node`
> 该 Node 上的 kubelet 也会监听到调度到自己的 Pod

> kubelet 会尝试去构建 Pod，由于 Docker 的 `Network Manager` 比较厚重，K8S 一般是使用 `CNI`

> K8S 在启动容器的时候，`只会启动 Runtime`，网络配置则通过 `CNI` 去调用`网络插件` 来处理

```
$ k get po nginx-deployment-6799fc88d8-j5rnt -oyaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    cni.projectcalico.org/containerID: d2c650e2c20df38a6fce8d56e62a94155469b91cfa5aee741b08a62238d122d4
    cni.projectcalico.org/podIP: 192.168.185.8/32
    cni.projectcalico.org/podIPs: 192.168.185.8/32
  creationTimestamp: "2022-05-30T02:17:02Z"
  generateName: nginx-deployment-6799fc88d8-
  labels:
    app: nginx
    pod-template-hash: 6799fc88d8
  name: nginx-deployment-6799fc88d8-j5rnt
  namespace: default
  ownerReferences:
  - apiVersion: apps/v1
    blockOwnerDeletion: true
    controller: true
    kind: ReplicaSet
    name: nginx-deployment-6799fc88d8
    uid: 591b0bf5-f1a0-4343-9624-b5706d1e7243
  resourceVersion: "3709"
  uid: 84f898e7-8899-46c1-9028-9799fa1bd77c
spec:
  containers:
  - image: nginx
    imagePullPolicy: Always
    name: nginx
    resources: {}
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-l2vp5
      readOnly: true
  dnsPolicy: ClusterFirst
  enableServiceLinks: true
  nodeName: mac-k8s
  preemptionPolicy: PreemptLowerPriority
  priority: 0
  restartPolicy: Always
  schedulerName: default-scheduler
  securityContext: {}
  serviceAccount: default
  serviceAccountName: default
  terminationGracePeriodSeconds: 30
  tolerations:
  - effect: NoExecute
    key: node.kubernetes.io/not-ready
    operator: Exists
    tolerationSeconds: 300
  - effect: NoExecute
    key: node.kubernetes.io/unreachable
    operator: Exists
    tolerationSeconds: 300
  volumes:
  - name: kube-api-access-l2vp5
    projected:
      defaultMode: 420
      sources:
      - serviceAccountToken:
          expirationSeconds: 3607
          path: token
      - configMap:
          items:
          - key: ca.crt
            path: ca.crt
          name: kube-root-ca.crt
      - downwardAPI:
          items:
          - fieldRef:
              apiVersion: v1
              fieldPath: metadata.namespace
            path: namespace
status:
  conditions:
  - lastProbeTime: null
    lastTransitionTime: "2022-05-30T02:17:02Z"
    status: "True"
    type: Initialized
  - lastProbeTime: null
    lastTransitionTime: "2022-05-30T02:17:26Z"
    status: "True"
    type: Ready
  - lastProbeTime: null
    lastTransitionTime: "2022-05-30T02:17:26Z"
    status: "True"
    type: ContainersReady
  - lastProbeTime: null
    lastTransitionTime: "2022-05-30T02:17:02Z"
    status: "True"
    type: PodScheduled
  containerStatuses:
  - containerID: docker://57bac5f87cf75da4f2143868399bc030d1a036e19818c9d8958bb3e0d1b5a904
    image: nginx:latest
    imageID: docker-pullable://nginx@sha256:af296b188c7b7df99ba960ca614439c99cb7cf252ed7bbc23e90cfda59092305
    lastState: {}
    name: nginx
    ready: true
    restartCount: 0
    started: true
    state:
      running:
        startedAt: "2022-05-30T02:17:26Z"
  hostIP: 192.168.191.138
  phase: Running
  podIP: 192.168.185.8
  podIPs:
  - ip: 192.168.185.8
  qosClass: BestEffort
  startTime: "2022-05-30T02:17:02Z"

$ curl -sI 192.168.185.8
HTTP/1.1 200 OK
Server: nginx/1.25.0
Date: Tue, 30 May 2022 02:34:39 GMT
Content-Type: text/html
Content-Length: 615
Last-Modified: Tue, 23 May 2022 15:08:20 GMT
Connection: keep-alive
ETag: "646cd6e4-267"
Accept-Ranges: bytes
```

> 手动删除 Pod

```
$ k delete pod nginx-deployment-6799fc88d8-j5rnt
pod "nginx-deployment-6799fc88d8-j5rnt" deleted


$ k get pods -owide
NAME                                READY   STATUS    RESTARTS   AGE   IP              NODE      NOMINATED NODE   READINESS GATES
nginx-deployment-6799fc88d8-4ppnm   1/1     Running   0          25s   192.168.185.9   mac-k8s   <none>           <none>
```

> 增加副本数

```
$ k describe deployments.apps nginx-deployment
Name:                   nginx-deployment
Namespace:              default
CreationTimestamp:      Tue, 30 May 2022 02:15:32 +0000
Labels:                 <none>
Annotations:            deployment.kubernetes.io/revision: 1
Selector:               app=nginx
Replicas:               3 desired | 3 updated | 3 total | 3 available | 0 unavailable
StrategyType:           RollingUpdate
MinReadySeconds:        0
RollingUpdateStrategy:  25% max unavailable, 25% max surge
Pod Template:
  Labels:  app=nginx
  Containers:
   nginx:
    Image:        nginx
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
NewReplicaSet:   nginx-deployment-6799fc88d8 (3/3 replicas created)
Events:
  Type    Reason             Age   From                   Message
  ----    ------             ----  ----                   -------
  Normal  ScalingReplicaSet  6m5s  deployment-controller  Scaled up replica set nginx-deployment-6799fc88d8 to 1
  Normal  ScalingReplicaSet  100s  deployment-controller  Scaled up replica set nginx-deployment-6799fc88d8 to 3

$ k describe rs nginx-deployment-6799fc88d8
Name:           nginx-deployment-6799fc88d8
Namespace:      default
Selector:       app=nginx,pod-template-hash=6799fc88d8
Labels:         app=nginx
                pod-template-hash=6799fc88d8
Annotations:    deployment.kubernetes.io/desired-replicas: 3
                deployment.kubernetes.io/max-replicas: 4
                deployment.kubernetes.io/revision: 1
Controlled By:  Deployment/nginx-deployment
Replicas:       3 current / 3 desired
Pods Status:    3 Running / 0 Waiting / 0 Succeeded / 0 Failed
Pod Template:
  Labels:  app=nginx
           pod-template-hash=6799fc88d8
  Containers:
   nginx:
    Image:        nginx
    Port:         <none>
    Host Port:    <none>
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
Events:
  Type    Reason            Age    From                   Message
  ----    ------            ----   ----                   -------
  Normal  SuccessfulCreate  10m    replicaset-controller  Created pod: nginx-deployment-6799fc88d8-j5rnt
  Normal  SuccessfulCreate  9m5s   replicaset-controller  Created pod: nginx-deployment-6799fc88d8-4ppnm
  Normal  SuccessfulCreate  5m35s  replicaset-controller  Created pod: nginx-deployment-6799fc88d8-ltc2g
  Normal  SuccessfulCreate  5m35s  replicaset-controller  Created pod: nginx-deployment-6799fc88d8-rt8w2

$ k get po -owide
NAME                                READY   STATUS    RESTARTS   AGE     IP               NODE      NOMINATED NODE   READINESS GATES
nginx-deployment-6799fc88d8-4ppnm   1/1     Running   0          6m27s   192.168.185.9    mac-k8s   <none>           <none>
nginx-deployment-6799fc88d8-ltc2g   1/1     Running   0          2m57s   192.168.185.11   mac-k8s   <none>           <none>
nginx-deployment-6799fc88d8-rt8w2   1/1     Running   0          2m57s   192.168.185.10   mac-k8s   <none>           <none>
```

> Service：`负载均衡` + `高可用`，基于 `TCP`，没有流量的`精细控制`

```
$ k get po --show-labels
NAME                                READY   STATUS    RESTARTS   AGE   LABELS
nginx-deployment-6799fc88d8-4ppnm   1/1     Running   0          14m   app=nginx,pod-template-hash=6799fc88d8
nginx-deployment-6799fc88d8-ltc2g   1/1     Running   0          10m   app=nginx,pod-template-hash=6799fc88d8
nginx-deployment-6799fc88d8-rt8w2   1/1     Running   0          10m   app=nginx,pod-template-hash=6799fc88d8

$ k expose deployment nginx-deployment --selector app=nginx --port=80 --type=NodePort
service/nginx-deployment exposed

$ k get svc
NAME               TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
kubernetes         ClusterIP   10.96.0.1       <none>        443/TCP        40m
nginx-deployment   NodePort    10.105.14.129   <none>        80:31834/TCP   29s

$ curl -sI 10.105.14.129
HTTP/1.1 200 OK
Server: nginx/1.25.0
Date: Tue, 30 May 2022 02:30:01 GMT
Content-Type: text/html
Content-Length: 615
Last-Modified: Tue, 23 May 2022 15:08:20 GMT
Connection: keep-alive
ETag: "646cd6e4-267"
Accept-Ranges: bytes

$ k delete pod nginx-deployment-6799fc88d8-4ppnm
pod "nginx-deployment-6799fc88d8-4ppnm" deleted

$ curl -sI 10.105.14.129
HTTP/1.1 200 OK
Server: nginx/1.25.0
Date: Tue, 30 May 2022 02:32:28 GMT
Content-Type: text/html
Content-Length: 615
Last-Modified: Tue, 23 May 2022 15:08:20 GMT
Connection: keep-alive
ETag: "646cd6e4-267"
Accept-Ranges: bytes

$ curl -sI mac-k8s:31834
HTTP/1.1 200 OK
Server: nginx/1.25.0
Date: Tue, 30 May 2022 02:33:27 GMT
Content-Type: text/html
Content-Length: 615
Last-Modified: Tue, 23 May 2022 15:08:20 GMT
Connection: keep-alive
ETag: "646cd6e4-267"
Accept-Ranges: bytes
```

> 滚动更新，`maxSurge`：先创建新版本的最大比例，`maxUnavailable`：不可用的最大比例

> 滚动机制：计算 Template 的`字符串的散列值`
> 如 `nginx` -> `nginx:latest`，本质上为同一个镜像，但散列值不一样，因此`散列算法`要`前向兼容`

```yaml
spec:
	strategy:
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
    type: RollingUpdate
```

```
$ k edit deployments.apps nginx-deployment
deployment.apps/nginx-deployment edited

$ k get pods -owide
NAME                                READY   STATUS              RESTARTS   AGE     IP               NODE      NOMINATED NODE   READINESS GATES
nginx-deployment-55649fd747-csj2k   0/1     ContainerCreating   0          1s      <none>           mac-k8s   <none>           <none>
nginx-deployment-55649fd747-mtpm6   1/1     Running             0          25s     192.168.185.13   mac-k8s   <none>           <none>
nginx-deployment-6799fc88d8-k9hl4   1/1     Terminating         0          8m55s   192.168.185.12   mac-k8s   <none>           <none>
nginx-deployment-6799fc88d8-ltc2g   1/1     Running             0          21m     192.168.185.11   mac-k8s   <none>           <none>
nginx-deployment-6799fc88d8-rt8w2   1/1     Running             0          21m     192.168.185.10   mac-k8s   <none>           <none>

$ k get rs
NAME                          DESIRED   CURRENT   READY   AGE
nginx-deployment-55649fd747   3         3         3       117s
nginx-deployment-6799fc88d8   0         0         0       27m

$ k describe deployments.apps nginx-deployment
Name:                   nginx-deployment
Namespace:              default
CreationTimestamp:      Tue, 30 May 2022 02:15:32 +0000
Labels:                 <none>
Annotations:            deployment.kubernetes.io/revision: 2
Selector:               app=nginx
Replicas:               3 desired | 3 updated | 3 total | 3 available | 0 unavailable
StrategyType:           RollingUpdate
MinReadySeconds:        0
RollingUpdateStrategy:  25% max unavailable, 25% max surge
Pod Template:
  Labels:  app=nginx
  Containers:
   nginx:
    Image:        nginx:latest
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
NewReplicaSet:   nginx-deployment-55649fd747 (3/3 replicas created)
Events:
  Type    Reason             Age    From                   Message
  ----    ------             ----   ----                   -------
  Normal  ScalingReplicaSet  27m    deployment-controller  Scaled up replica set nginx-deployment-6799fc88d8 to 1
  Normal  ScalingReplicaSet  23m    deployment-controller  Scaled up replica set nginx-deployment-6799fc88d8 to 3
  Normal  ScalingReplicaSet  2m28s  deployment-controller  Scaled up replica set nginx-deployment-55649fd747 to 1
  Normal  ScalingReplicaSet  2m4s   deployment-controller  Scaled down replica set nginx-deployment-6799fc88d8 to 2
  Normal  ScalingReplicaSet  2m4s   deployment-controller  Scaled up replica set nginx-deployment-55649fd747 to 2
  Normal  ScalingReplicaSet  94s    deployment-controller  Scaled down replica set nginx-deployment-6799fc88d8 to 1
  Normal  ScalingReplicaSet  94s    deployment-controller  Scaled up replica set nginx-deployment-55649fd747 to 3
  Normal  ScalingReplicaSet  70s    deployment-controller  Scaled down replica set nginx-deployment-6799fc88d8 to 0
  
$ curl -sI 10.105.14.129
HTTP/1.1 200 OK
Server: nginx/1.25.0
Date: Sat, 03 Jun 2022 08:16:01 GMT
Content-Type: text/html
Content-Length: 615
Last-Modified: Tue, 23 May 2022 3 15:08:20 GMT
Connection: keep-alive
ETag: "646cd6e4-267"
Accept-Ranges: bytes
```

## Scheduler

> Scheduler 是`特殊的 Controller`

> 监控当前集群所有`未调度的 Pod`，并获取当前集群所有`节点`的`健康情况`和`资源使用情况`
> 为待调度的 Pod 选择`最佳`的计算节点，完成调度

![image-20230603163534863](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230603163534863.png)

> 调度阶段 - `Scoring` 是可扩展的

| 阶段       | 描述                                                   |
| ---------- | ------------------------------------------------------ |
| `Predict`  | 过滤`不能满足需求`的节点（资源不足、端口冲突等）       |
| `Priority` | 按`既定要素`为满足调度需求的节点`评分`，选择`最佳节点` |
| `Bind`     | 将计算节点与 Pod 绑定，完成调度                        |

## Kubelet

> K8S 的 `init system`

![image-20230603164731775](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230603164731775.png)

1. 从不同源获取 `Pod 清单`，并按需启动 Pod 的`核心组件`
   - 数据源：`本地文件目录`、`HTTP Server`、`K8S API Server`
2. 负责汇报当前`节点`的`资源信息`和`健康情况`
3. 负责 `Pod` 的`健康检查`和`状态汇报`

> Kubelet 进行了抽象

| 组件   | 抽象  |
| ------ | ----- |
| 运行时 | `CRI` |
| 网络   | `CNI` |
| 存储   | `CSI` |

## Kube-Proxy

![image-20230603165608327](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230603165608327.png)

1. 监控集群中发布的 `Service`，并完成`负载均衡`的配置
2. 每个 `Node` 上的 `Kube-Proxy` 都会配置`相同的负载均衡策略`
   - 使得整个集群的`服务发现`建立在`分布式负载均衡器`之上，`服务调用`无需经过`额外的网络跳转`
3. 负载均衡配置基于不同的`插件`实现
   - `userspace`
   - `OS 网络协议栈`不同的 `Hooks` 和`插件`：`iptables`、`ipvs`

# Add-ons

| Add-on                  | Desc                          |
| ----------------------- | ----------------------------- |
| `kube-dns`              | 负责为整个集群提供 `DNS` 服务 |
| `Ingress Controller`    | 为 `Service` 提供`外网入口`   |
| `MetricsServer`         | 提供`资源监控`                |
| `Dashboard`             | 提供 GUI                      |
| `Fluentd-Elasticsearch` | 提供集群日志采集、存储和查询  |

# kubectl

## 原理

> kubectl 将接收到的用户请求转化为 `REST` 请求，与 `API Server` 通信

```
$ k get ns default -v 9
I0603 09:08:59.761062  141446 loader.go:372] Config loaded from file:  /home/zhongmingmao/.kube/config
I0603 09:08:59.764914  141446 round_trippers.go:435] curl -v -XGET  -H "Accept: application/json;as=Table;v=v1;g=meta.k8s.io,application/json;as=Table;v=v1beta1;g=meta.k8s.io,application/json" -H "User-Agent: kubectl/v1.22.2 (linux/arm64) kubernetes/8b5a191" 'https://192.168.191.138:6443/api/v1/namespaces/default'
I0603 09:08:59.770927  141446 round_trippers.go:454] GET https://192.168.191.138:6443/api/v1/namespaces/default 200 OK in 5 milliseconds
I0603 09:08:59.770943  141446 round_trippers.go:460] Response Headers:
I0603 09:08:59.770947  141446 round_trippers.go:463]     Audit-Id: 701d086f-ab0d-43ae-9c79-b629691326f6
I0603 09:08:59.770949  141446 round_trippers.go:463]     Cache-Control: no-cache, private
I0603 09:08:59.770952  141446 round_trippers.go:463]     Content-Type: application/json
I0603 09:08:59.770955  141446 round_trippers.go:463]     X-Kubernetes-Pf-Flowschema-Uid: 2f005305-d15e-4252-bad1-edba0045f54d
I0603 09:08:59.770957  141446 round_trippers.go:463]     X-Kubernetes-Pf-Prioritylevel-Uid: e2605faa-93d6-4d86-9ed5-dfd861e777f6
I0603 09:08:59.770959  141446 round_trippers.go:463]     Content-Length: 1659
I0603 09:08:59.770965  141446 round_trippers.go:463]     Date: Sat, 03 Jun 2022 09:08:59 GMT
I0603 09:08:59.770987  141446 request.go:1181] Response Body: {"kind":"Table","apiVersion":"meta.k8s.io/v1","metadata":{"resourceVersion":"192"},"columnDefinitions":[{"name":"Name","type":"string","format":"name","description":"Name must be unique within a namespace. Is required when creating resources, although some resources may allow a client to request the generation of an appropriate name automatically. Name is primarily intended for creation idempotence and configuration definition. Cannot be updated. More info: http://kubernetes.io/docs/user-guide/identifiers#names","priority":0},{"name":"Status","type":"string","format":"","description":"The status of the namespace","priority":0},{"name":"Age","type":"string","format":"","description":"CreationTimestamp is a timestamp representing the server time when this object was created. It is not guaranteed to be set in happens-before order across separate operations. Clients may not set this value. It is represented in RFC3339 form and is in UTC.\n\nPopulated by the system. Read-only. Null for lists. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata","priority":0}],"rows":[{"cells":["default","Active","4d7h"],"object":{"kind":"PartialObjectMetadata","apiVersion":"meta.k8s.io/v1","metadata":{"name":"default","uid":"c3b0eddd-c1de-4ea6-87ac-079b96ea14a5","resourceVersion":"192","creationTimestamp":"2022-05-30T01:48:56Z","labels":{"kubernetes.io/metadata.name":"default"},"managedFields":[{"manager":"kube-apiserver","operation":"Update","apiVersion":"v1","time":"2022-05-30T01:48:56Z","fieldsType":"FieldsV1","fieldsV1":{"f:metadata":{"f:labels":{".":{},"f:kubernetes.io/metadata.name":{}}}}}]}}}]}
NAME      STATUS   AGE
default   Active   4d7h
```

> `Context` 是通过`组合`的方式：`user` + `cluster`

```yaml
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUMvakNDQWVhZ0F3SUJBZ0lCQURBTkJna3Foa2lHOXcwQkFRc0ZBREFWTVJNd0VRWURWUVFERXdwcmRXSmwKY201bGRHVnpNQjRYRFRJek1EVXpNREF4TkRnME9Wb1hEVE16TURVeU56QXhORGcwT1Zvd0ZURVRNQkVHQTFVRQpBeE1LYTNWaVpYSnVaWFJsY3pDQ0FTSXdEUVlKS29aSWh2Y05BUUVCQlFBRGdnRVBBRENDQVFvQ2dnRUJBTnRrCjIvRERGSXpuNmhoOVl6RFVmRzJDcXRlSzBzbTVGVkIyK0lXaXpCWk5ZVnNQbFpuN3NLL0NVYm4wdGJpUGpmUEoKUUJpUkxJZ3FCS1AydWRJanhjbUhqQ0hlSVFnOGswT3RnYXRCUTNzOEkwVVdhWW1QSXNQZWxwMllrZlkxK3Q3KwpQdUVsaHl1cE13eHJlSGFLQThTMG9Dd2NRT2g1L3piN290aXNrTDFlZzNZTWZaWjU1MWJKenBsc3hRdGdsdGp3CnBmcUU3UDBoQ2VTQkpwVmNGb1BXd3RNd2wvOVRvc1lKSC9TWU9kNnV0ZUllWFlEa1F6U3czZ2lkMHBkTitoS2EKemE2MEcvN2Q2a01aamUrQmRLMVFjenZpcE9zZWUvSHVDZklUNERtLzRiOFZuS1EwVU94QWZHRVg3UUdHcUlEMApOR0xSbXhXbVU4SnUraXFaaDkwQ0F3RUFBYU5aTUZjd0RnWURWUjBQQVFIL0JBUURBZ0trTUE4R0ExVWRFd0VCCi93UUZNQU1CQWY4d0hRWURWUjBPQkJZRUZEZStoM2orN1BDckZXSDZjUnE5QVFGcHpvMTZNQlVHQTFVZEVRUU8KTUF5Q0NtdDFZbVZ5Ym1WMFpYTXdEUVlKS29aSWh2Y05BUUVMQlFBRGdnRUJBRXZsWEJGRHRpQzJyK2VqSFBERgozeUxzbjA4Sjd1bENnN0xwMGJRaUxPZzIzZStjTTRzRnN0UVJadnFNYW1MU3l0U2hlZHAvVExFMnR0RlZOYnAvCkJlNVJiRGtuNWRFdFg5ejRva09IVTJ3ekFlaWZ5NnhCZEloYUdGZC9WT3B1SldBZ040aU9DVkRUQTA1OWNuTDMKSmJvVHJCNkRBdUo0a2JWNis5NGZkK001RXY1TVhiWXA2L2ExYTliMmVpWnNxbjM3djUvOWZlWU51Q3JYS0xGagprKzhvUWV0UGNEbW5TdkRrdUlteUZ0TGxjRjN1MGw1RmdwU2FQQnlWekJUckZQb25jTlcyV1ZkWWxLZ3ArWWFqCithT3JkRFNzbEVTY055R0hxTEkyS0RsTHIwWlBDQWtYSjFyRDcrenI5cFVEZC9LL1B5VFBlM3JaVWd3cjh2NjIKdFlJPQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    server: https://192.168.191.138:6443
  name: kubernetes
contexts:
- context:
    cluster: kubernetes
    user: kubernetes-admin
  name: kubernetes-admin@kubernetes
current-context: kubernetes-admin@kubernetes
kind: Config
preferences: {}
users:
- name: kubernetes-admin
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURJVENDQWdtZ0F3SUJBZ0lJVWVlRlYzZjRCdjR3RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TXpBMU16QXdNVFE0TkRsYUZ3MHlOREExTWprd01UUTROVEZhTURReApGekFWQmdOVkJBb1REbk41YzNSbGJUcHRZWE4wWlhKek1Sa3dGd1lEVlFRREV4QnJkV0psY201bGRHVnpMV0ZrCmJXbHVNSUlCSWpBTkJna3Foa2lHOXcwQkFRRUZBQU9DQVE4QU1JSUJDZ0tDQVFFQXZQOVpSS09yMWE5YjhKV2wKeWVtVzNKZVp6MGtKTXc1ZjN6UFN5dkdzbDZod3FLaDNKNXNKTTJrWXJMWUtKK25vbldmTjBCekwwclF5QTdScQpPSkJFKytsa0E2d3B4bzhOSnVITyttRHBwMnhhdHFmTWpFSEhseGV4UnlmTUUveDlDZmZsVHhPV1BUcFRqbGllCkZDQlhROTBPZmZwV3RENnM2Z2JVZXZMQzJTMStyMFJyMmhRWmE2bkxpQW9RdWhmZnJtTGJ2ZVJmblp0ZDVlS08KOUQ5SXAybmhjRE5PeWlIQWNoRlU3OW5id3JzRS9XRks5SVVtL3g1cU52WUFjS2pSUmpKSFJseUNENVdFTzBldgpYUGJjSXRZcnlHSDBBTWNkcXU5ZTc0WEFCTUNYa3VjbGs0UndkUEl1UHBMTHFJNnFTQWwvek0vdFJyQm1kL1V1ClRKbXE2d0lEQVFBQm8xWXdWREFPQmdOVkhROEJBZjhFQkFNQ0JhQXdFd1lEVlIwbEJBd3dDZ1lJS3dZQkJRVUgKQXdJd0RBWURWUjBUQVFIL0JBSXdBREFmQmdOVkhTTUVHREFXZ0JRM3ZvZDQvdXp3cXhWaCtuRWF2UUVCYWM2TgplakFOQmdrcWhraUc5dzBCQVFzRkFBT0NBUUVBdm1zQ3VXcWJ1ZlI2UHVFTUlrRXg5TDZFeU1zY2NhZzlqWER2CmNTY1hXNUVUSkllcW5ISmtzRVY4NEdCdDhlcGx0aGhUM1pFVUZvSURvR3FHNk1CVDFJdG5jaVlKRG5NUHZ5djAKWFBpVno4MFM3RFZhQjhwVjJvK3JjaFRmMHdSYVUvQWF4dWdtUWwzZHVUcEtYbU1DTThGQ3FpTVJYbm1veGJVUgpqTklsTGcwbjJzMXF0Tk1LVGRCSlB3dUVqdFJZMWVpU09GRGgwclFhYmZUc2dHa25SOGxCcHdDd28rWVdaMGs0CmlZaWtrT21ERnZsakZ6Z1VpcWpTRGdjRnNnUjlFWXZ1TGdtSHlJVnpxZG1NZURMandwL2NWM1VubGNoa3hsZEsKVDcyYWs5cnhzTGwrUFVGajlFZE92Y2tKanI0VFhZcWFJR2FwNWhyTDg1bEdNcTgyVXc9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    client-key-data: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFcEFJQkFBS0NBUUVBdlA5WlJLT3IxYTliOEpXbHllbVczSmVaejBrSk13NWYzelBTeXZHc2w2aHdxS2gzCko1c0pNMmtZckxZS0orbm9uV2ZOMEJ6TDByUXlBN1JxT0pCRSsrbGtBNndweG84Tkp1SE8rbURwcDJ4YXRxZk0KakVISGx4ZXhSeWZNRS94OUNmZmxUeE9XUFRwVGpsaWVGQ0JYUTkwT2ZmcFd0RDZzNmdiVWV2TEMyUzErcjBScgoyaFFaYTZuTGlBb1F1aGZmcm1MYnZlUmZuWnRkNWVLTzlEOUlwMm5oY0ROT3lpSEFjaEZVNzluYndyc0UvV0ZLCjlJVW0veDVxTnZZQWNLalJSakpIUmx5Q0Q1V0VPMGV2WFBiY0l0WXJ5R0gwQU1jZHF1OWU3NFhBQk1DWGt1Y2wKazRSd2RQSXVQcExMcUk2cVNBbC96TS90UnJCbWQvVXVUSm1xNndJREFRQUJBb0lCQURGR3BrQ21KOFFqMzJXLwpycVVST1JzMGo0Nmk3VG9aa2xlQWpJSUxOc09uMEErNU5LL24xU05KVUh5ZlRkQ1FST3pkUnFUdkRSbFhqLzYxClNFaU5ITjlOUDUxUmd1YlpIMFcyOUI4RnE0WFNVMmh5SVh1a0h1Uys4YUtxdHFPelhlcCticFFLZUU1b2FhYWcKWmo2N0crVit1aXVRWEpETUVvdEYwcHBudHZPbVhEUXBueE9EVHhwNkhmREdodERtdEkxb0FlSng3aXJlNFQ5Rwp3MWR1SHJDZWpuQWp5QTkwbmtnVEhNWWVSZHoxcmE4bVZqNzE5VnpYbWxyRFFYTkhDZzJFMFZ5b29GNGc4R29CCm1rTldLVTh6NUxqN05sVFEwbElsazlrbVZTZTE2V2g0MWR6dkRIbGxtdFZyVHdPWXZjNjdWY3UzVFE4Ly84bDcKbldwME9CRUNnWUVBKzlEL09nSmxoSnoyNnBTNG5mbWt3YTVUZ3NHVWJhSEttV1ZDeVBwUFNGZzRSeXNDc2U3NwpnaXV4UkxVK2F4aU9MTm5Jc1pmb1hZUzlVbXpacWFQRzRhVHhiT2RXY2RMUTdweThHZmJranVHcmlKb0FqRDZDCmFWYXRGN3k4VU5SNXg4eXZNcjgxWGRTYmdONUFuSUJ6QkZQVzFOV3VDcjVtQnE3c2tEUVpBZmtDZ1lFQXdDTXQKQW9xMmYyTGFtdWtYNUpnK3FHc3NoMG5rZzVrZ213ODVYSEJzcHFGT3B2TWhIa0RhWUtuZHBXTkVubXF3REY2UQp4Yi9aNVBWU3hGMElFS1ZhTVZ6N1N1ekk4MnBXeVlEWnNrelpwUU80d2x4a1F5Q0lwWHQzL1R4UUV3aGd6Y3A0ClJ1SDFmUVhiUURkSVpQV0FnSVY2U2lLTWwxUW0yZFp2eVVJZERRTUNnWUVBdGxxejZPdEJYdFpZVEtua1E2bzcKOEhId1Vka2pSbjBLZlNrQ1F3NVpDWmV4TVlCcEZEZHU5T1gxR2o5eDh4WTJKeTZURW1CaVNnN05GdnB5YVZHTAp2VzIzMDFoM2xqZkhTM1EvRjBKZVkwWHk5Um9vMldhUEEvOWJtN3YyVjBaMjVnUkl2eVFPWG1PUE5MUTk3OWRvCjh6SlBlWk0vMU5IcWlsNTBPejB1K3VrQ2dZQjVKM1VoVGpDSG9PRHhuNXVtVkczbUt6WjMxSnRZYy8xQWFWZ2wKTnVyOEkya0NFdnRHSldUT1lTNVhOSUkzVmxUT1orN29FdktsMGgrdm5HNFNlUUduY05jd1JxRHNCSmpYRlAydwoxWTdENDlYa0VQaFQ3N2JhaWtGK0dFTHh6VzJsTmsramVxWWVnTXZnOFRzZ0ZrSkNTR2gxU05YWU1vTVJCNHVUCm43SEwyd0tCZ1FDQlhCUWRlbWhhMmxMbDhhbEZ5Umd1dmJyOHJsbmVIc29RUEdOeEgwSVZNVVZPaWNnM1Y5bEoKZUNGdVl0dGxpRm5yRXppeHBsRTBzU1JZMzYxdkJtMzN3eXU5RXlmN2hBTy9TUTlsYWpUdDVMR0FZdkx3TDNvcgpGeFNEaFd1cVVTZGhqSGRLb0JTWXpjOEFXUkd2S2xrU0UyTjV0M2JRSFNZL2NBOUtsSDdSbEE9PQotLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLQo=
```

## 常用命令

> 资源列表

```
$ k api-resources
```

> get：查看对象
> `-oyaml`，YAML 详细信息；`-owide`，详细列表；`-w`，监听

```
$ k get po -oyaml -w
```

```
$ k label ns default a=b
namespace/default labeled

$ k get ns default -oyaml -w -v 9
I0603 10:41:40.955475  240520 loader.go:372] Config loaded from file:  /home/zhongmingmao/.kube/config
I0603 10:41:40.957875  240520 round_trippers.go:435] curl -v -XGET  -H "Accept: application/json" -H "User-Agent: kubectl/v1.22.2 (linux/arm64) kubernetes/8b5a191" 'https://192.168.191.138:6443/api/v1/namespaces/default'
I0603 10:41:40.962655  240520 round_trippers.go:454] GET https://192.168.191.138:6443/api/v1/namespaces/default 200 OK in 4 milliseconds
I0603 10:41:40.962670  240520 round_trippers.go:460] Response Headers:
I0603 10:41:40.962673  240520 round_trippers.go:463]     Date: Sat, 03 Jun 2022 10:41:40 GMT
I0603 10:41:40.962675  240520 round_trippers.go:463]     Audit-Id: c4eb9cfa-18e2-4c74-a5cb-aaa3fc9c7e1f
I0603 10:41:40.962677  240520 round_trippers.go:463]     Cache-Control: no-cache, private
I0603 10:41:40.962681  240520 round_trippers.go:463]     Content-Type: application/json
I0603 10:41:40.962682  240520 round_trippers.go:463]     X-Kubernetes-Pf-Flowschema-Uid: 2f005305-d15e-4252-bad1-edba0045f54d
I0603 10:41:40.962684  240520 round_trippers.go:463]     X-Kubernetes-Pf-Prioritylevel-Uid: e2605faa-93d6-4d86-9ed5-dfd861e777f6
I0603 10:41:40.962687  240520 round_trippers.go:463]     Content-Length: 520
I0603 10:41:40.962704  240520 request.go:1181] Response Body: {"kind":"Namespace","apiVersion":"v1","metadata":{"name":"default","uid":"c3b0eddd-c1de-4ea6-87ac-079b96ea14a5","resourceVersion":"192","creationTimestamp":"2022-05-30T01:48:56Z","labels":{"kubernetes.io/metadata.name":"default"},"managedFields":[{"manager":"kube-apiserver","operation":"Update","apiVersion":"v1","time":"2022-05-30T01:48:56Z","fieldsType":"FieldsV1","fieldsV1":{"f:metadata":{"f:labels":{".":{},"f:kubernetes.io/metadata.name":{}}}}}]},"spec":{"finalizers":["kubernetes"]},"status":{"phase":"Active"}}
apiVersion: v1
kind: Namespace
metadata:
  creationTimestamp: "2022-05-30T01:48:56Z"
  labels:
    kubernetes.io/metadata.name: default
  name: default
  resourceVersion: "192"
  uid: c3b0eddd-c1de-4ea6-87ac-079b96ea14a5
spec:
  finalizers:
  - kubernetes
status:
  phase: Active
I0603 10:41:40.962977  240520 round_trippers.go:435] curl -v -XGET  -H "Accept: application/json" -H "User-Agent: kubectl/v1.22.2 (linux/arm64) kubernetes/8b5a191" 'https://192.168.191.138:6443/api/v1/namespaces?fieldSelector=metadata.name%3Ddefault&resourceVersion=0&watch=true'
I0603 10:41:40.963578  240520 round_trippers.go:454] GET https://192.168.191.138:6443/api/v1/namespaces?fieldSelector=metadata.name%3Ddefault&resourceVersion=0&watch=true 200 OK in 0 milliseconds
I0603 10:41:40.963618  240520 round_trippers.go:460] Response Headers:
I0603 10:41:40.963661  240520 round_trippers.go:463]     Audit-Id: 97cf544f-fa33-46c5-a0df-c619a34471d0
I0603 10:41:40.963699  240520 round_trippers.go:463]     Cache-Control: no-cache, private
I0603 10:41:40.963768  240520 round_trippers.go:463]     Content-Type: application/json
I0603 10:41:40.963807  240520 round_trippers.go:463]     X-Kubernetes-Pf-Flowschema-Uid: 2f005305-d15e-4252-bad1-edba0045f54d
I0603 10:41:40.963839  240520 round_trippers.go:463]     X-Kubernetes-Pf-Prioritylevel-Uid: e2605faa-93d6-4d86-9ed5-dfd861e777f6
I0603 10:41:40.963868  240520 round_trippers.go:463]     Date: Sat, 03 Jun 2022 10:41:40 GMT

---
apiVersion: v1
kind: Namespace
metadata:
  creationTimestamp: "2022-05-30T01:48:56Z"
  labels:
    a: b
    kubernetes.io/metadata.name: default
  name: default
  resourceVersion: "17391"
  uid: c3b0eddd-c1de-4ea6-87ac-079b96ea14a5
spec:
  finalizers:
  - kubernetes
status:
  phase: Active
```

> describe：详细信息和相关 `Event`

```
$ k describe deployments.apps nginx-deployment
Name:                   nginx-deployment
Namespace:              default
CreationTimestamp:      Tue, 30 May 2022 02:21:16 +0000
Labels:                 <none>
Annotations:            deployment.kubernetes.io/revision: 1
Selector:               app=nginx
Replicas:               2 desired | 2 updated | 2 total | 2 available | 0 unavailable
StrategyType:           RollingUpdate
MinReadySeconds:        0
RollingUpdateStrategy:  25% max unavailable, 25% max surge
Pod Template:
  Labels:  app=nginx
  Containers:
   nginx:
    Image:        nginx
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
NewReplicaSet:   nginx-deployment-6799fc88d8 (2/2 replicas created)
Events:
  Type    Reason             Age   From                   Message
  ----    ------             ----  ----                   -------
  Normal  ScalingReplicaSet  29s   deployment-controller  Scaled down replica set nginx-deployment-6799fc88d8 to 2
```

> exec：进入容器进行 debug

```
$ k exec -it nginx-deployment-6799fc88d8-4ppnm -- sh
# cat /etc/issue
Debian GNU/Linux 11 \n \l
```

> logs：查看 pod 的 `stdout` 和 `stderr`

```
$ k logs --tail 10 nginx-deployment-6799fc88d8-4ppnm
2022/05/30 02:22:31 [notice] 1#1: nginx/1.25.0
2022/05/30 02:22:31 [notice] 1#1: built by gcc 10.2.1 20210110 (Debian 10.2.1-6)
2022/05/30 02:22:31 [notice] 1#1: OS: Linux 5.4.0-149-generic
2022/05/30 02:22:31 [notice] 1#1: getrlimit(RLIMIT_NOFILE): 1048576:1048576
2022/05/30 02:22:31 [notice] 1#1: start worker processes
2022/05/30 02:22:31 [notice] 1#1: start worker process 28
2022/05/30 02:22:31 [notice] 1#1: start worker process 29
2022/05/30 02:22:31 [notice] 1#1: start worker process 30
2022/05/30 02:22:31 [notice] 1#1: start worker process 31
192.168.191.138 - - [30/May/2022:02:23:06 +0000] "HEAD / HTTP/1.1" 200 0 "-" "curl/7.68.0" "-"
```

# 设计思想

> 云计算分类：`IaaS` -> `PaaS` -> `SaaS`

![image-20230603185756665](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230603185756665.png)

> K8S 生态系统

![image-20230603190354181](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230603190354181.png)

> 设计理念

1. `高可用`
   - 基于 `ReplicaSet` 和 `StatefulSet` 的`应用高可用`
   - Kubernetes `组件高可用`
2. `安全`
   - 基于 `TLS` 提供服务
   - `ServiceAccount`（内部） 和 `User`（外部）
   - 基于 `Namespace` 的隔离
   - `Secret`（加密）
   - `Taints`、`PodSecurityPolicies`、`NetworkPolicies`
3. `可移植`
   - 多种 `Arch` + `OS`
   - 基于`集群联邦`建立`混合云`
4. `弹性`
   - 基于`微服务`部署应用
   - `横向`扩缩容
   - `自动`扩缩容
5. `可扩展`
   - 基于 `CRD` 扩展
   - `插件化`的生态系统

> 分层架构 - 灵活的扩展性

![image-20230603192359946](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230603192359946.png)

1. 核心层 - `Nucleus: API and Execution`
   - Kubernetes 最核心的功能，`对外`提供 `API` 构建高层的应用，`对内`提供`插件式应用执行环境`
2. 应用层 - `Application Layer: Deployment and Routing`
   - `部署`：无状态应用（Deployment）、有状态应用（StatefulSet）、批处理任务（Job/CronJob）、集群应用
   - `路由`：服务发现、DNS 解析等
3. 管理层 - `Governance Layer: Automation and Policy Enforcement`
   - `系统度量`：基础设施、容器、网络
   - `自动化`：自动扩展、动态 Provision 等
   - `策略管理`：RBAC、Quota、PodSecurityPolicies、NetworkPolicies
4. 接口层：`Interface Layer: Client Libraries and Tools`
   - Kubectl、客户端 SDK、集群联邦
5. 生态系统：`Ecosystem` - 集群管理调度
   - 外部：日志、监控、配置管理、CI/CD、Workflow、FaaS、ChatOps 等
   - 内部：CRI、CNI、CVI、Image Registry、Cloud Provider、集群自身的配置和管理等

![image-20230603194559265](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230603194559265.png)

> API 设计原则

1. 所有 API 都应该是`声明式`的
2. API 对象是`彼此互补`而且是`可组合`的 - `高内聚` + `低耦合`
3. `高层 API` 以`操作意图`为`基础设计` - 满足业务需求
4. `低层 API` 根据`高层 API` 的`控制需要`设计
   - 低层 API 被高层 API 所使用，应以减少冗余，`提高重用性`为目的
5. `避免简单封装`，也应避免外部 API `无法显式知道的内部隐藏的机制`
6. API `操作复杂度`与`对象数量`成`正比`，API 操作复杂度不能超过 `O(N)`
7. API `对象状态`不能依赖于`网络连接状态` - 在分布式系统中，`网络断连`经常发生
8. 避免让`操作机制`依赖`全局状态` - 在分布式系统中，`强一致性`很难保证

![image-20230603201519821](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230603201519821.png)

> 架构设计原则

1. 只有 `API Server` 可以直接访问 `etcd`，其他服务必须通过 API Server 来访问集群状态
2. `单点故障`不应该影响`集群状态`
3. 在`没有新请求`的情况下，`所有组件`应该在`故障恢复`后继续执行`上次最后收到的请求`
4. `所有组件`都应该在`内存`中保持所需要的状态
   - API Server 将状态写入 etcd，而其它组件通过 API Server 进行 `List & Watch`
5. 优先使用`事件监听`而非轮询

> 引导原则

1. 目标：`Self-hosting`
   - 将`控制面`的`核心组件`（除了 `kubelet`，kubelet 被 `systemd` 管理）`容器化`
   - kubelet 相当于 K8S 的 `init system`
   - kubelet  会扫描 `staticPodPath` 里面的文件清单，kubelet 会在 `API Server` 将 Pod 定义补全并写入到 `etcd`
2. `减少依赖`
3. 通过`分层原则`来`管理依赖`

```
$ k get pod -n kube-system
NAME                              READY   STATUS    RESTARTS        AGE
coredns-7f6cbbb7b8-97knk          1/1     Running   0               4d11h
coredns-7f6cbbb7b8-rs667          1/1     Running   0               4d11h
etcd-mac-k8s                      1/1     Running   0               4d11h
kube-apiserver-mac-k8s            1/1     Running   0               4d11h
kube-controller-manager-mac-k8s   1/1     Running   3 (4d10h ago)   4d11h
kube-proxy-6cjvs                  1/1     Running   0               4d11h
kube-scheduler-mac-k8s            1/1     Running   3 (4d10h ago)   4d11h

$ ps -ef | grep kubelet
...
root        9094       1  6 07:59 ?        00:19:23 /usr/bin/kubelet --bootstrap-kubeconfig=/etc/kubernetes/bootstrap-kubelet.conf --kubeconfig=/etc/kubernetes/kubelet.conf --config=/var/lib/kubelet/config.yaml --network-plugin=cni --pod-infra-container-image=registry.aliyuncs.com/google_containers/pause:3.5
...
```

```yaml /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
authentication:
  anonymous:
    enabled: false
  webhook:
    cacheTTL: 0s
    enabled: true
  x509:
    clientCAFile: /etc/kubernetes/pki/ca.crt
authorization:
  mode: Webhook
  webhook:
    cacheAuthorizedTTL: 0s
    cacheUnauthorizedTTL: 0s
cgroupDriver: systemd
clusterDNS:
- 10.96.0.10
clusterDomain: cluster.local
cpuManagerReconcilePeriod: 0s
evictionPressureTransitionPeriod: 0s
fileCheckFrequency: 0s
healthzBindAddress: 127.0.0.1
healthzPort: 10248
httpCheckFrequency: 0s
imageMinimumGCAge: 0s
kind: KubeletConfiguration
logging: {}
memorySwap: {}
nodeStatusReportFrequency: 0s
nodeStatusUpdateFrequency: 0s
resolvConf: /run/systemd/resolve/resolv.conf
rotateCertificates: true
runtimeRequestTimeout: 0s
shutdownGracePeriod: 0s
shutdownGracePeriodCriticalPods: 0s
staticPodPath: /etc/kubernetes/manifests
streamingConnectionIdleTimeout: 0s
syncFrequency: 0s
volumeStatsAggPeriod: 0s
```

```
$ ls /etc/kubernetes/manifests
etcd.yaml  kube-apiserver.yaml  kube-controller-manager.yaml  kube-scheduler.yaml
```

# API 对象

> API 对象是 K8S 集群中的`管理操作单元`，API 对象有 4 类属性：`TypeMeta`、`MetaData`、`Spec`、`Status`

## 属性

> 通用属性：`TypeMeta + MetaData`，特有属性：`Spec + Status`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
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
          image: nginx
```

### TypeMeta

> K8S 对象的最基本定义，通过 `GKV` 模型定义一个`对象的类型`

```yaml
apiVersion: apps/v1
kind: Deployment
```

| GKV            | Desc                                                         |
| -------------- | ------------------------------------------------------------ |
| G = `Group`    | 将对象依据其`功能`归入不同的分组                             |
| K = `Kind`     | 对象的`基本类型`                                             |
| V =  `Version` | v1alpha1（Snapshot） -> v1alpha2（Snapshot） -> v1beta1（RC） -> `v1`（Release） |

```
$ k api-resources --api-group=''
NAME                     SHORTNAMES   APIVERSION   NAMESPACED   KIND
bindings                              v1           true         Binding
componentstatuses        cs           v1           false        ComponentStatus
configmaps               cm           v1           true         ConfigMap
endpoints                ep           v1           true         Endpoints
events                   ev           v1           true         Event
limitranges              limits       v1           true         LimitRange
namespaces               ns           v1           false        Namespace
nodes                    no           v1           false        Node
persistentvolumeclaims   pvc          v1           true         PersistentVolumeClaim
persistentvolumes        pv           v1           false        PersistentVolume
pods                     po           v1           true         Pod
podtemplates                          v1           true         PodTemplate
replicationcontrollers   rc           v1           true         ReplicationController
resourcequotas           quota        v1           true         ResourceQuota
secrets                               v1           true         Secret
serviceaccounts          sa           v1           true         ServiceAccount
services                 svc          v1           true         Service
```

```
$ k api-resources --api-group='apps'
NAME                  SHORTNAMES   APIVERSION   NAMESPACED   KIND
controllerrevisions                apps/v1      true         ControllerRevision
daemonsets            ds           apps/v1      true         DaemonSet
deployments           deploy       apps/v1      true         Deployment
replicasets           rs           apps/v1      true         ReplicaSet
statefulsets          sts          apps/v1      true         StatefulSet
```

```
$ k api-resources --api-group='batch'
NAME       SHORTNAMES   APIVERSION   NAMESPACED   KIND
cronjobs   cj           batch/v1     true         CronJob
jobs                    batch/v1     true         Job
```

### MetaData

> MetaData 中的通过  `Namespace` 和 `Name`  来`唯一`定义了某个`对象实例`
> 但 `Node` 是不区分 Namespace 的（`Non-Namespace Object`）

```yaml
metadata:
  annotations:
    c: d
    deployment.kubernetes.io/revision: "1"
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"apps/v1","kind":"Deployment","metadata":{"annotations":{},"name":"nginx-deployment","namespace":"default"},"spec":{"replicas":3,"selector":{"matchLabels":{"app":"nginx"}},"template":{"metadata":{"labels":{"app":"nginx"}},"spec":{"containers":[{"image":"nginx","name":"nginx"}]}}}}
  creationTimestamp: "2022-05-30T02:21:16Z"
  generation: 3
  labels:
    a: b
  name: nginx-deployment
  namespace: default
  resourceVersion: "37353"
  uid: b3560021-1183-472f-a4ea-c638c561e0e7
```

> `Label`：采用 `KV` 形式，一个对象可以有任意对标签，一般结合 `Selector` 来`过滤`查询

![image-20230603223151346](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230603223151346.png)

1. Label 是`识别 K8S 对象`的标签，以 `KV` 的方式附加在对象上
2. 长度限制：`key - 63 字节`，`value - 253 字节`
3. Label `不提供唯一性`
4. Label 定义好后，可以使用 `Label Selector` 来选择一组相同 Label 的对象
5. Label Selector
   - `相等`：`app=nginx`、`env!=production`
   - `集合`：`env in (production, qa)`
   - 多个 Label 之间是 `AND` 关系：`app=nginx,env=test`

> `Annotation`：采用 `KV` 形式，作为`属性扩展`，更多面向`系统管理员`和`开发人员`

1. Annotation 以 KV 的形式附加在对象上
2. 与 Label 的用途差异
   - Label 用于`标记`和`选择`对象
   - Annotation 用来记录一些`附加信息`（用来辅助`应用部署`、`安全策略`、`调度策略`等）

> `Finalizer`：是一个`资源锁`，不能被`物理删除`
> K8S 在接收到某个对象的`删除请求`时，如果 `Finalizer` 不为`空`则只对其做`逻辑删除`
> `逻辑删除`：更新对象的 `metadata.deletionTimestamp`

```
$ k run --image=nginx my-nginx --restart='Always'
pod/my-nginx created

$ k edit pod nginx
...
metadata:
  finalizers:
  - kubernetes
...

$ k delete po nginx
pod "nginx" deleted

$ k get po
NAME    READY   STATUS        RESTARTS   AGE
nginx   0/1     Terminating   0          5m26s

$ k get po nginx -oyaml
...
metadata:
  deletionTimestamp: "2022-05-30T02:29:18Z"
    finalizers:
    - kubernetes
...

$ k edit pod nginx
删除 finalizers

$ k get po
No resources found in default namespace.
```

> `ResourceVersion`：是一个`乐观锁`，每个对象在任意时刻都有 ResourceVersion，类似于 JVM 中的 `CAS` 机制

### Spec

> 对象的`期望状态`，由创建对象的`用户端`来定义

```yaml
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
          image: nginx
```

### Status

> 对象的`实际状态`，由对应的 `Controller` 收集实际状态并更新

```yaml
status:
  availableReplicas: 2
  conditions:
  - lastTransitionTime: "2022-05-30T02:22:32Z"
    lastUpdateTime: "2022-05-30T02:22:32Z"
    message: Deployment has minimum availability.
    reason: MinimumReplicasAvailable
    status: "True"
    type: Available
  - lastTransitionTime: "2022-05-30T02:21:16Z"
    lastUpdateTime: "2022-05-30T02:22:32Z"
    message: ReplicaSet "nginx-deployment-6799fc88d8" has successfully progressed.
    reason: NewReplicaSetAvailable
    status: "True"
    type: Progressing
  observedGeneration: 2
  readyReplicas: 2
  replicas: 2
  updatedReplicas: 2
```

## 对象

![image-20230603224732338](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230603224732338.png)

### Node

1. Node 是 Pod 真正运行的主机，可以是`物理机`，也可以是`虚拟机`
2. 每个 Node 至少要运行 `Container runtime`、`Kubelet`、`Kube-proxy`

### Namespace

1. Namespace 是对一组`资源`和`对象`的`抽象隔离`
2. 分类
   - Namespace Object：Pod、Service、Deployment 等
   - Non-Namespace Object：`Node`、`PV`

### Pod

1. Pod 是一组`紧密关联`的`容器集合`，是 K8S `调度的基本单位`
   - 共享 `Linux Namespace`：`PID`、`IPC`、`Network`（默认共享）、`UTS`
2. Pod 的设计理念
   - 支持多个容器在一个 Pod 中共享`网络`和`文件系统`，可以通过`进程间通信`和`文件共享`来组合完成服务
3. 同一个 Pod 中不同容器可以共享的资源
   - 共享`网络` Namespace（彼此通过 `Loopback` 地址访问，`sidecar`）
   - 通过挂载`存储卷`来共享`存储`
   - 共享 `Security Context`
4. 环境变量（应用与配置分离）
   - 直接设置值
   - 读取 `Pod Spec` 的属性
   - 从 `ConfigMap` 读取
   - 从 `Secret` 读取

> 直接设置值

```yaml
spec:
  containers:
    - name: nginx
      image: nginx
      env:
      - name: lang
        value: go
```

> 读取 `Pod Spec` 的属性

```yaml
spec:
  containers:
    - name: nginx
      image: nginx
      env:
      - name: lang
        valueFrom:
        	fieldRef:
        		apiVersion: v1
        		fieldPath: metadata.name
```

> 从 `ConfigMap` 读取

```yaml
spec:
  containers:
    - name: nginx
      image: nginx
      env:
      - name: lang
        valueFrom:
        	configMapKeyRef:
        		name: my-env
        		key: my-lang
```

> 从 `Secret` 读取

```yaml
spec:
  containers:
    - name: nginx
      image: nginx
      env:
      - name: lang
        valueFrom:
        	secretKeyRef:
        		name: my-secret
        		key: my-lang
```

```
$ k get cm
NAME               DATA   AGE
kube-root-ca.crt   1      4d13h

$ k get cm kube-root-ca.crt -oyaml
apiVersion: v1
data:
  ca.crt: |
    -----BEGIN CERTIFICATE-----
    MIIC/jCCAeagAwIBAgIBADANBgkqhkiG9w0BAQsFADAVMRMwEQYDVQQDEwprdWJl
    cm5ldGVzMB4XDTIzMDUzMDAxNDg0OVoXDTMzMDUyNzAxNDg0OVowFTETMBEGA1UE
    AxMKa3ViZXJuZXRlczCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBANtk
    2/DDFIzn6hh9YzDUfG2CqteK0sm5FVB2+IWizBZNYVsPlZn7sK/CUbn0tbiPjfPJ
    QBiRLIgqBKP2udIjxcmHjCHeIQg8k0OtgatBQ3s8I0UWaYmPIsPelp2YkfY1+t7+
    PuElhyupMwxreHaKA8S0oCwcQOh5/zb7otiskL1eg3YMfZZ551bJzplsxQtgltjw
    pfqE7P0hCeSBJpVcFoPWwtMwl/9TosYJH/SYOd6uteIeXYDkQzSw3gid0pdN+hKa
    za60G/7d6kMZje+BdK1QczvipOsee/HuCfIT4Dm/4b8VnKQ0UOxAfGEX7QGGqID0
    NGLRmxWmU8Ju+iqZh90CAwEAAaNZMFcwDgYDVR0PAQH/BAQDAgKkMA8GA1UdEwEB
    /wQFMAMBAf8wHQYDVR0OBBYEFDe+h3j+7PCrFWH6cRq9AQFpzo16MBUGA1UdEQQO
    MAyCCmt1YmVybmV0ZXMwDQYJKoZIhvcNAQELBQADggEBAEvlXBFDtiC2r+ejHPDF
    3yLsn08J7ulCg7Lp0bQiLOg23e+cM4sFstQRZvqMamLSytShedp/TLE2ttFVNbp/
    Be5RbDkn5dEtX9z4okOHU2wzAeify6xBdIhaGFd/VOpuJWAgN4iOCVDTA059cnL3
    JboTrB6DAuJ4kbV6+94fd+M5Ev5MXbYp6/a1a9b2eiZsqn37v5/9feYNuCrXKLFj
    k+8oQetPcDmnSvDkuImyFtLlcF3u0l5FgpSaPByVzBTrFPoncNW2WVdYlKgp+Yaj
    +aOrdDSslEScNyGHqLI2KDlLr0ZPCAkXJ1rD7+zr9pUDd/K/PyTPe3rZUgwr8v62
    tYI=
    -----END CERTIFICATE-----
kind: ConfigMap
metadata:
  annotations:
    kubernetes.io/description: Contains a CA bundle that can be used to verify the
      kube-apiserver when using internal endpoints such as the internal service IP
      or kubernetes.default.svc. No other usage is guaranteed across distributions
      of Kubernetes clusters.
  creationTimestamp: "2022-05-30T01:49:11Z"
  name: kube-root-ca.crt
  namespace: default
  resourceVersion: "375"
  uid: 6d397037-bb80-4f16-a2e5-ea9f9cb3da51
```

```
$ k get secrets
NAME                  TYPE                                  DATA   AGE
default-token-tcwxj   kubernetes.io/service-account-token   3      4d13h

$ k get secrets default-token-tcwxj -oyaml
apiVersion: v1
data:
  ca.crt: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUMvakNDQWVhZ0F3SUJBZ0lCQURBTkJna3Foa2lHOXcwQkFRc0ZBREFWTVJNd0VRWURWUVFERXdwcmRXSmwKY201bGRHVnpNQjRYRFRJek1EVXpNREF4TkRnME9Wb1hEVE16TURVeU56QXhORGcwT1Zvd0ZURVRNQkVHQTFVRQpBeE1LYTNWaVpYSnVaWFJsY3pDQ0FTSXdEUVlKS29aSWh2Y05BUUVCQlFBRGdnRVBBRENDQVFvQ2dnRUJBTnRrCjIvRERGSXpuNmhoOVl6RFVmRzJDcXRlSzBzbTVGVkIyK0lXaXpCWk5ZVnNQbFpuN3NLL0NVYm4wdGJpUGpmUEoKUUJpUkxJZ3FCS1AydWRJanhjbUhqQ0hlSVFnOGswT3RnYXRCUTNzOEkwVVdhWW1QSXNQZWxwMllrZlkxK3Q3KwpQdUVsaHl1cE13eHJlSGFLQThTMG9Dd2NRT2g1L3piN290aXNrTDFlZzNZTWZaWjU1MWJKenBsc3hRdGdsdGp3CnBmcUU3UDBoQ2VTQkpwVmNGb1BXd3RNd2wvOVRvc1lKSC9TWU9kNnV0ZUllWFlEa1F6U3czZ2lkMHBkTitoS2EKemE2MEcvN2Q2a01aamUrQmRLMVFjenZpcE9zZWUvSHVDZklUNERtLzRiOFZuS1EwVU94QWZHRVg3UUdHcUlEMApOR0xSbXhXbVU4SnUraXFaaDkwQ0F3RUFBYU5aTUZjd0RnWURWUjBQQVFIL0JBUURBZ0trTUE4R0ExVWRFd0VCCi93UUZNQU1CQWY4d0hRWURWUjBPQkJZRUZEZStoM2orN1BDckZXSDZjUnE5QVFGcHpvMTZNQlVHQTFVZEVRUU8KTUF5Q0NtdDFZbVZ5Ym1WMFpYTXdEUVlKS29aSWh2Y05BUUVMQlFBRGdnRUJBRXZsWEJGRHRpQzJyK2VqSFBERgozeUxzbjA4Sjd1bENnN0xwMGJRaUxPZzIzZStjTTRzRnN0UVJadnFNYW1MU3l0U2hlZHAvVExFMnR0RlZOYnAvCkJlNVJiRGtuNWRFdFg5ejRva09IVTJ3ekFlaWZ5NnhCZEloYUdGZC9WT3B1SldBZ040aU9DVkRUQTA1OWNuTDMKSmJvVHJCNkRBdUo0a2JWNis5NGZkK001RXY1TVhiWXA2L2ExYTliMmVpWnNxbjM3djUvOWZlWU51Q3JYS0xGagprKzhvUWV0UGNEbW5TdkRrdUlteUZ0TGxjRjN1MGw1RmdwU2FQQnlWekJUckZQb25jTlcyV1ZkWWxLZ3ArWWFqCithT3JkRFNzbEVTY055R0hxTEkyS0RsTHIwWlBDQWtYSjFyRDcrenI5cFVEZC9LL1B5VFBlM3JaVWd3cjh2NjIKdFlJPQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
  namespace: ZGVmYXVsdA==
  token: ZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNkluSjNTRXcwUm1GUlExSXlVVVZFWjFKa1VqZFJkelYyV1hCU1h6VjFWVTFyVTFaVWNtVTBkblJQVGtVaWZRLmV5SnBjM01pT2lKcmRXSmxjbTVsZEdWekwzTmxjblpwWTJWaFkyTnZkVzUwSWl3aWEzVmlaWEp1WlhSbGN5NXBieTl6WlhKMmFXTmxZV05qYjNWdWRDOXVZVzFsYzNCaFkyVWlPaUprWldaaGRXeDBJaXdpYTNWaVpYSnVaWFJsY3k1cGJ5OXpaWEoyYVdObFlXTmpiM1Z1ZEM5elpXTnlaWFF1Ym1GdFpTSTZJbVJsWm1GMWJIUXRkRzlyWlc0dGRHTjNlR29pTENKcmRXSmxjbTVsZEdWekxtbHZMM05sY25acFkyVmhZMk52ZFc1MEwzTmxjblpwWTJVdFlXTmpiM1Z1ZEM1dVlXMWxJam9pWkdWbVlYVnNkQ0lzSW10MVltVnlibVYwWlhNdWFXOHZjMlZ5ZG1salpXRmpZMjkxYm5RdmMyVnlkbWxqWlMxaFkyTnZkVzUwTG5WcFpDSTZJbU15TWpobU1tTXdMVFpsTjJFdE5HVmtNQzA1WkdSakxUQTROR05tWVRaalpqUm1ZaUlzSW5OMVlpSTZJbk41YzNSbGJUcHpaWEoyYVdObFlXTmpiM1Z1ZERwa1pXWmhkV3gwT21SbFptRjFiSFFpZlEuZzJwX2xYVURHYTNPOGxPenNRb19OTS1GN0FtREtrQ1A2bG96TDAyR081QzR1R1RoM0UyMTZLRExNZWZpUzVlV3p6b2lKZGs3LVZrczdyUFBvN0RjQkp5VUxJOEVqVko3UTlyZEl6MV83WU1tTkZSWUFjZkJWYks2RnhpME5yZlR6a0FMSWlaeTNQSS1KTVg3OGpNMFFoQktOTDh0YWdPY3YwRkJLR2R0ZnV4QlZIa3VpdW51b3NFNHprVml1anFxOG52WDNEaXJwZ1EtT2lQREZLckZCaHkzcDhhelE2ZUpaSUlFZjRQUm84cUdOaVp6WERNOGw3VEtYUmhCUU5hR2pERFJ2LXRjQ3dFelpMd3ZzcFVJeVR6WWZKZWZWaHU2d3VLN0NXR0FuY2hadHhfOGp0LVpUbzh3V2lmWG85UzUyLXlSY2d2QlNWb2g3dFpJUmlaZFJn
kind: Secret
metadata:
  annotations:
    kubernetes.io/service-account.name: default
    kubernetes.io/service-account.uid: c228f2c0-6e7a-4ed0-9ddc-084cfa6cf4fb
  creationTimestamp: "2022-05-30T01:49:12Z"
  name: default-token-tcwxj
  namespace: default
  resourceVersion: "409"
  uid: d08bd61f-4cbb-4060-bbec-9f3c902e9890
type: kubernetes.io/service-account-token
```

> 通过`存储卷`可以将`外挂存储`挂载到 Pod 内使用

1. `Volume`：定义 Pod 可以使用的`存储卷来源`
2. `VolumeMounts`：定义存储卷`如何 Mount` 到容器内部

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-volume
spec:
  containers:
    - image: nginx
      name: nginx
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      emptyDir: {}
```

```
$ k exec nginx-volume -- ls -d /data
/data
```

> 资源限制：通过 `Cgroups` 提供容器资源管理的功能，可以限制每个`容器`的 `CPU` 和`内存`使用

```
$ k set resources deployment nginx-deployment -c=nginx --limits=cpu=500m,memory=128Mi
deployment.apps/nginx-deployment resource requirements updated

$ k get deployments.apps nginx-deployment -oyaml
...
spec:
	...
  template:
    ...
    spec:
      containers:
      - image: nginx
        imagePullPolicy: Always
        name: nginx
        resources:
          limits:
            cpu: 500m
            memory: 128Mi
...
```

> 健康检查，探活方式：`Exec`、`TCP socket`、`HTTP`

> `StartupProbe` 类似于 `ReadinessProbe`，但检查`频率更低`

| 探针             | 描述                                                         |
| ---------------- | ------------------------------------------------------------ |
| `LivenessProbe`  | 探测应用是否处于`健康`状态，如果不健康则`删除`并`重新创建`容器 |
| `ReadinessProbe` | 探测应用是否`就绪`并且处于`正常服务`状态，如果不正常不会接收到 `K8S Service` 的`流量` |
| `StartupProbe`   | 探测应用是否`启动完成`<br />如果在 `failureThreshold × periodSeconds` 内未就绪，应用进程会被`重启` |

```
$ k get po nginx-deployment-6d8f8db69-ddsnb -oyaml
...
spec:
  containers:
  - image: nginx
    imagePullPolicy: Always
    livenessProbe:
      failureThreshold: 3
      httpGet:
        path: /
        port: 80
        scheme: HTTP
      initialDelaySeconds: 15
      periodSeconds: 10
      successThreshold: 1
      timeoutSeconds: 1
    name: nginx
    readinessProbe:
      failureThreshold: 3
      httpGet:
        path: /
        port: 80
        scheme: HTTP
      initialDelaySeconds: 5
      periodSeconds: 10
      successThreshold: 1
      timeoutSeconds: 1
...
```

### ConfigMap

1. ConfigMap 将`非机密性`的数据保存在 `KV` 中
2. Pod 将 ConfigMap 用作`环境变量`、`命令行参数`、`存储卷中的配置文件`
3. ConfigMap 将`配置信息`和`容器镜像`进行了`解耦`

### Secret

1. Secret 用来保存`敏感信息`：密码、密钥、认证凭证等
2. 优势：意图明显、避免重复、减少暴露机会

### SA

> User Account + Service Account

> 与 API Server 通信，需要进行`认证鉴权`

|          | User Account        | Service Account                                   |
| -------- | ------------------- | ------------------------------------------------- |
| 用途     | 为`人`提供账号标识  | 为`计算机进程`或者集群中运行的 `Pod` 提供账号标识 |
| 作用范围 | 与 Namespace `无关` | 与 Namespace `相关`                               |

### Service

![image-20230604011545130](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230604011545130.png)

1. Service 是`应用服务的抽象`，通过 `Label` 为应用提供`负载均衡`和`服务发现`
   - `匹配` Label 的 `Pod IP` 和 `Pod Port` 列表组成 `Endpoints`，
   - 由 `Kube-proxy` 负责将`服务 IP` 负载均衡到 `Endpoints` 上
2. 每个 Service 都会自动分配一个 `Cluster IP`（仅`集群内`可访问的虚拟地址） 和 `DNS 域名`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
spec:
  selector:
    app: nginx
  ports:
    - protocol: TCP
      port: 8078 # the port that this service should serve on
      targetPort: 80 # the container on each pod to connect to, can be a name (e.g. 'www') or a number (e.g. 80)
```

```
$ k get svc
NAME               TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)        AGE
kubernetes         ClusterIP   10.96.0.1        <none>        443/TCP        41m
nginx              ClusterIP   10.104.195.232   <none>        8078/TCP       27s
nginx-deployment   NodePort    10.105.14.129    <none>        80:31834/TCP   7m56s

$ curl -sI 10.104.195.232:8078
HTTP/1.1 200 OK
Server: nginx/1.25.0
Date: Tue, 30 May 2022 02:31:04 GMT
Content-Type: text/html
Content-Length: 615
Last-Modified: Tue, 23 May 2022 15:08:20 GMT
Connection: keep-alive
ETag: "646cd6e4-267"
Accept-Ranges: bytes
```

### ReplicaSet

1. Pod 只是`单个应用实例`的抽象，要构建`高可用`应用，需要构建`多个副本`来提供`同一个服务`
2. K8S 抽象出 ReplicaSet，每个 Pod 都会被当作一个`无状态`的成员进行管理
   - 允许用户定义`副本数`，K8S 保证用户期望的数量的 Pod 正常运行

### Deployment

1. Deployment 表示用户对 K8S 集群的`一次更新操作`
2. `滚动更新`
   - 创建一个新的 ReplicaSet
   - 然后逐渐将新 ReplicaSet 中的副本数增加到理想状态，将旧的 ReplicaSet 中的副本数减少到 0 

![image-20230604143501615](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230604143501615.png)

### StatefulSet

1. 对于 StatefulSet 中的 Pod，每个 Pod 挂载自己`独立的存储`
   - 如果一个 Pod 出现故障，从`其它节点`启动一个`同样名字`的 Pod
   - 需要挂载上`原来 Pod 的存储`，继续以它的状态提供服务
2. `高可用`
   - `Pod` 仍然可以通过`漂移到不同节点`提供`高可用`，而`存储`可以通过`外挂存储`来提供`高可靠性`
   - StatefulSet 只是将`确定的 Pod` 和`确定的存储`关联起来，保证`状态的连续性`
3. 适合 StatefulSet 的业务
   - 数据库服务：MySQL、PostgreSQL
   - 集群化管理服务：ZooKeeper、etcd
4. 与 Deployment 的差异
   - `身份标识`
     - StatefulSet Controller 为每个 Pod 编号，`序号从 0 开始`
   - `数据存储`
     - StatefulSet 允许用户定义 `volumeClaimTemplates`
     - 当 Pod 被`创建`的同时，K8S 会以 `volumeClaimTemplates` 中定义的模板创建存储卷，并挂载给 Pod
   - `升级策略`
     - `onDelete`、`滚动升级`、`分片升级`

![image-20230604144821831](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230604144821831.png)

### Job

1. Job 是 K8S 用来控制`批处理任务`的 API 对象
2. Job 管理的 Pod 根据用户的设置，把`任务完成`后`自动退出`
3. 成功完成的标志根据不同的 `spec.completions` 策略而不同
   - `单 Pod` 型任务：有一个 Pod 成功就标志完成
   - `定数`成功型任务：保证有 N 个任务全部成功
   - `工作队列`型任务：根据应用确认的`全局成功`而标志成功

![image-20230604145943889](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230604145943889.png)

### DaemonSet

1. DaemonSet 保证每个 `Node` 上都有一个此类 Pod 运行
2. Node 可能是`所有集群节点`，也可能是通过 `nodeSelector` 选定的一些特定集群节点

![image-20230604150318331](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230604150318331.png)

### PV + PVC

1. PersistentVolume 是集群中的一块存储卷
   - 可以由管理员`手动设置`
   - 当用户创建 `PersistentVolumeClaim` 时根据 `StorageClass` 来`动态设置`
2. `PV 和 PVC 与 Pod 的生命周期无关`
3. 对于不同的使用场景，需要设置`不同属性`（性能、访问模式等）的 `PV`

### CRD

> CRD：`CustomResourceDefinition`

1. CRD 类似于数据库的开放式表结构，允许用户`自定义 Schema`
   - 用户可以基于 CRD 定义一切需要的模型，满足不同业务的需求
2. 基于 CRD 构建的主流扩展应用：Istio、Knative
3. 基于 CRD 推出了 `Operator Mode` 和 `Operator SDK`
   - 极低的开发成本：`定义新对象` + `构建新对象的控制器`
