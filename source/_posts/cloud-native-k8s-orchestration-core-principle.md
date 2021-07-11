---
title: 应用编排与管理 -- 核心原理
mathjax: false
date: 2021-07-11 10:23:04
categories:
	- Cloud Native
	- Kubernetes
	- Alibaba
tags:
	- Cloud Native
	- Kubernetes
	- Alibaba
---

# 资源元信息

## Kubernetes资源对象

1. Spec（**specification**）：**期望的状态**
2. Status：**观测到的状态**
3. Metadata：**元数据**
   - Labels：**识别**资源
   - Annotations：**描述**资源
   - OwnerReference：描述多个资源之间的**相互关系**

## Labels

1. **标识型**的 **KV** 元数据
   - 标签名包含**域名前缀**：用来描述打标签的系统和工具
2. 作用
   - 用于**筛选资源**
   - 唯一的**组合资源**的方法
3. 可以使用 **Selector** 来查询（类**SQL**）

<!-- more -->

## Selector

| Pod  | Tie   | Env  |
| ---- | ----- | ---- |
| pod1 | front | dev  |
| pod2 | back  | prod |
| pod3 | front | test |
| pod4 | back  | gray |

1. **相等型**
   - 可以包含多个相等条件，多个相等条件之间是**逻辑与**的关系，如`Tie=front, Env=dev`命中 pod1
2. **集合型**
   - `Env in (test, gray)`：命中 pod3 和 pod4
   - `Tie notin (front, back)`：无命中
3. 其他
   - `release`：存在 release 标签
   - `!release`：不存在 release 标签
4. 相等型和集合型的 Selector 同样可以通过**`,`**来连接（关系：**逻辑与**）

## Annotations

1. Key:Value
2. 作用
   - 一般是**系统或者工具**用来存储资源的**非标志性**信息
   - 扩展资源的 **spec/status** 的描述
3. 特点
   - 一般**比 Label 更大**
   - 可以包含**特殊字符**
   - **结构化、非结构化**

## OwnerReference

![image-20210709175553707](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210709175553707.png)

## 实践

### YAML

```yaml pod1.yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod1
  labels:
    Tie: front
    Env: dev
spec:
  containers:
    - image: 'nginx:1.21.1'
      name: nginx
```

```yaml pod2.yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod2
  labels:
    Tie: back
    Env: prod
spec:
  containers:
    - image: 'nginx:1.21.1'
      name: nginx
```

```yaml pod3.yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod3
  labels:
    Tie: front
    Env: test
spec:
  containers:
    - image: 'nginx:1.21.1'
      name: nginx
```

```yaml pod4.yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod4
  labels:
    Tie: back
    Env: gray
spec:
  containers:
    - image: 'nginx:1.21.1'
      name: nginx
```

```yaml rs.yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: rs1
spec:
  replicas: 2
  selector:
    matchLabels:
      Env: prod
  template:
    metadata:
      labels:
        Env: prod
    spec:
      containers:
        - name: nginx
          image: 'nginx:1.21.1'
```

### 操作

#### Labels

```
$ kubectl get pods
No resources found.
```

```
$ kubectl apply -f pod1.yaml
pod/pod1 created

$ kubectl apply -f pod2.yaml
pod/pod2 created
```

```
$ kubectl get pods --show-labels
NAME   READY   STATUS    RESTARTS   AGE   LABELS
pod1   1/1     Running   0          66s   Env=dev,Tie=front
pod2   1/1     Running   0          63s   Env=prod,Tie=back
```

```
$ kubectl get pods pod1 -o yaml | head
apiVersion: v1
kind: Pod
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"v1","kind":"Pod","metadata":{"annotations":{},"labels":{"Env":"dev","Tie":"front"},"name":"pod1","namespace":"default"},"spec":{"containers":[{"image":"nginx:1.21.1","name":"nginx"}]}}
  creationTimestamp: "2021-07-11T07:43:40Z"
  labels:
    Env: dev
    Tie: front
```

```
$ kubectl label pods pod1 Env=test
error: 'Env' already has a value (dev), and --overwrite is false

$ kubectl get pods pod1 --show-labels
NAME   READY   STATUS    RESTARTS   AGE     LABELS
pod1   1/1     Running   0          5m18s   Env=dev,Tie=front

$ kubectl label pods pod1 Env=test --overwrite
pod/pod1 labeled

$ kubectl get pods pod1 --show-labels
NAME   READY   STATUS    RESTARTS   AGE     LABELS
pod1   1/1     Running   0          5m32s   Env=test,Tie=front

$ kubectl label pods pod1 Env-
pod/pod1 labeled

$ kubectl get pods pod1 --show-labels
NAME   READY   STATUS    RESTARTS   AGE     LABELS
pod1   1/1     Running   0          6m54s   Tie=front

$ kubectl label pods pod1 Env=dev
pod/pod1 labeled

$ kubectl apply -f pod3.yaml
pod/pod3 created

$ kubectl apply -f pod4.yaml
pod/pod4 created

$ kubectl get pods --show-labels
NAME   READY   STATUS    RESTARTS   AGE     LABELS
pod1   1/1     Running   0          9m20s   Env=dev,Tie=front
pod2   1/1     Running   0          9m17s   Env=prod,Tie=back
pod3   1/1     Running   0          17s     Env=test,Tie=front
pod4   1/1     Running   0          14s     Env=gray,Tie=back
```

```
$ kubectl get pods --show-labels -l Tie=front
NAME   READY   STATUS    RESTARTS   AGE     LABELS
pod1   1/1     Running   0          12m     Env=dev,Tie=front
pod3   1/1     Running   0          3m52s   Env=test,Tie=front

$ kubectl get pods --show-labels -l Tie=front,Env=dev
NAME   READY   STATUS    RESTARTS   AGE   LABELS
pod1   1/1     Running   0          13m   Env=dev,Tie=front

$ kubectl get pods --show-labels -l 'Env in (dev,test)'
NAME   READY   STATUS    RESTARTS   AGE     LABELS
pod1   1/1     Running   0          14m     Env=dev,Tie=front
pod3   1/1     Running   0          5m35s   Env=test,Tie=front

$ kubectl get pods --show-labels -l 'Env notin (dev,test)'
NAME   READY   STATUS    RESTARTS   AGE     LABELS
pod2   1/1     Running   0          15m     Env=prod,Tie=back
pod4   1/1     Running   0          6m15s   Env=gray,Tie=back

$ kubectl get pods --show-labels -l 'Env'
NAME   READY   STATUS    RESTARTS   AGE     LABELS
pod1   1/1     Running   0          15m     Env=dev,Tie=front
pod2   1/1     Running   0          15m     Env=prod,Tie=back
pod3   1/1     Running   0          6m39s   Env=test,Tie=front
pod4   1/1     Running   0          6m36s   Env=gray,Tie=back

$ kubectl get pods --show-labels -l '!Env'
No resources found.
```

#### Annotations

kubectl.kubernetes.io/last-applied-configuration

```
$ kubectl annotate pods pod1 my-annotate='zhongmingmao'
pod/pod1 annotated

$ kubectl get pods pod1 -o yaml | head -n 11
apiVersion: v1
kind: Pod
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"v1","kind":"Pod","metadata":{"annotations":{},"labels":{"Env":"dev","Tie":"front"},"name":"pod1","namespace":"default"},"spec":{"containers":[{"image":"nginx:1.21.1","name":"nginx"}]}}
    my-annotate: zhongmingmao
  creationTimestamp: "2021-07-11T07:43:40Z"
  labels:
    Env: dev
    Tie: front


```

```json
{
  "apiVersion": "v1",
  "kind": "Pod",
  "metadata": {
    "annotations": {},
    "labels": {
      "Env": "dev",
      "Tie": "front"
    },
    "name": "pod1",
    "namespace": "default"
  },
  "spec": {
    "containers": [
      {
        "image": "nginx:1.21.1",
        "name": "nginx"
      }
    ]
  }
}
```

#### OwnerReference

**generation: 1，observedGeneration: 1**

```
$ kubectl apply -f rs.yaml
replicaset.apps/rs1 created

$ kubectl get rs rs1 -o yaml
apiVersion: extensions/v1beta1
kind: ReplicaSet
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"apps/v1","kind":"ReplicaSet","metadata":{"annotations":{},"name":"rs1","namespace":"default"},"spec":{"replicas":2,"selector":{"matchLabels":{"Env":"prod"}},"template":{"metadata":{"labels":{"Env":"prod"}},"spec":{"containers":[{"image":"nginx:1.21.1","name":"nginx"}]}}}}
  creationTimestamp: "2021-07-11T08:15:25Z"
  generation: 1
  name: rs1
  namespace: default
  resourceVersion: "4851"
  selfLink: /apis/extensions/v1beta1/namespaces/default/replicasets/rs1
  uid: 207573cc-f015-4299-99ba-5ed2070cafbd
spec:
  replicas: 2
  selector:
    matchLabels:
      Env: prod
  template:
    metadata:
      creationTimestamp: null
      labels:
        Env: prod
    spec:
      containers:
      - image: nginx:1.21.1
        imagePullPolicy: IfNotPresent
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
  availableReplicas: 2
  fullyLabeledReplicas: 2
  observedGeneration: 1
  readyReplicas: 2
  replicas: 2
```

原本已经有一个 Env=prod 的 Pod，ReplicaSet会再创建一个Pod（rs1-bf69l），保证replicas=2，pod1也被rs1**控制**了

```
$ kubectl get pods --show-labels
NAME        READY   STATUS    RESTARTS   AGE    LABELS
pod1        1/1     Running   0          35m    Env=dev,Tie=front
pod2        1/1     Running   0          35m    Env=prod,Tie=back
pod3        1/1     Running   0          26m    Env=test,Tie=front
pod4        1/1     Running   0          26m    Env=gray,Tie=back
rs1-bf69l   1/1     Running   0          4m2s   Env=prod

$ kubectl get pods rs1-bf69l -o yaml | head -n 16
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: "2021-07-11T08:15:25Z"
  generateName: rs1-
  labels:
    Env: prod
  name: rs1-bf69l
  namespace: default
  ownerReferences:
  - apiVersion: apps/v1
    blockOwnerDeletion: true
    controller: true
    kind: ReplicaSet
    name: rs1
    uid: 207573cc-f015-4299-99ba-5ed2070cafbd

$ kubectl get pods pod2 -o yaml | head -n 19
apiVersion: v1
kind: Pod
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"v1","kind":"Pod","metadata":{"annotations":{},"labels":{"Env":"prod","Tie":"back"},"name":"pod2","namespace":"default"},"spec":{"containers":[{"image":"nginx:1.21.1","name":"nginx"}]}}
  creationTimestamp: "2021-07-11T07:43:43Z"
  labels:
    Env: prod
    Tie: back
  name: pod2
  namespace: default
  ownerReferences:
  - apiVersion: apps/v1
    blockOwnerDeletion: true
    controller: true
    kind: ReplicaSet
    name: rs1
    uid: 207573cc-f015-4299-99ba-5ed2070cafbd
    
$ kubectl get pods pod1 -o yaml | head -n 16
apiVersion: v1
kind: Pod
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"v1","kind":"Pod","metadata":{"annotations":{},"labels":{"Env":"dev","Tie":"front"},"name":"pod1","namespace":"default"},"spec":{"containers":[{"image":"nginx:1.21.1","name":"nginx"}]}}
    my-annotate: zhongmingmao
  creationTimestamp: "2021-07-11T07:43:40Z"
  labels:
    Env: dev
    Tie: front
  name: pod1
  namespace: default
  resourceVersion: "4270"
  selfLink: /api/v1/namespaces/default/pods/pod1
  uid: b2afe81d-630c-4455-b60e-fe82a52898ce
```

# 控制器模式

## 控制循环

1. 逻辑组件（各自独立运行）：控制器（**Controller**）、被控制的系统（**System**）、能够**观测**被控制系统的传感器（**Sensor**） 
2. 过程
   - 外界通过修改资源 spec 来控制资源
   - 控制器比较资源 spec 和 status，从而计算一个 diff
     - diff：最后用来会决定对系统执行什么样的控制操作
   - 控制器会使得系统产生新的输出，并被 Sensor 以资源 status 的形式上报

![image-20210710182325761](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210710182325761.png)

## Sensor

1. Reflector：获取资源数据
   - List：用来在 **Controller 重启**以及 **Watch 中断**的情况下，进行系统资源的**全量**更新
   - Watch：在**多次 List 之间**进行**增量**的资源更新
2. Reflector在获取新资源数据后，会在 Delta 队列中塞入一个 Delta 记录
   - Delta 记录：**资源对象 + 事件类型**
   - Delta 队列中可以保证**同一个资源对象在Delta队列中仅有一条记录**，避免Reflector重新 List 和 Watch 时产生的重复对象
3. Informer不断地从 Delta 队列中弹出 Delta 记录，然后将资源对象交给Indexer，最后把事件交给Event Handling Callback
   - Indexer会把资源记录在一个**缓存**中，默认用资源的**命名空间**来做**索引**的，并且可以多个Controller所**共享**

![image-20210711145216571](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210711145216571.png)

## Controller

1. Controller：**Event Handling Callback + Worker**
2. Event Handling Callback：关注资源的新增、更新和删除的事件，并根据控制器的逻辑决定是否需要处理
3. 对于需要处理的事件，会把**事件关联资源的命名空间以及名字**塞入到一个工作队列中，由后续 Worker 池中的一个 Worker 来处理
   - 工作队列会对存储的对象进行去重，避免多个 Worker 处理同一个资源
4. Worker 在处理资源对象时，一般需要用资源的名字来**重新获取**最新的资源数据，用来创建或者更新资源对象、调用其他外部服务等
   - 如果 Worker 处理失败，一般情况下会把资源的名字重新加入到工作队列中，方便后续重试

![image-20210711150816206](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210711150816206.png)

## 样例 -- 扩容

1. ReplicaSet：一个用来描述**无状态应用的扩缩容行为**的资源
2. 本例中，Reflector会 Watch 到 ReplicaSet 和 Pod 两种资源的变化，产生两个 Delta 记录

![image-20210711152427548](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210711152427548.png)

### Delta 1

1. ReplicaSet发生变化后，在 Delta 队列中增加 Delta 1（**Object=rsA, Type=Updated**）
2. Informer
   - 一方面， 通过 Indexer 把**新的ReplicaSet**更新到缓存中，并使用 nsA 作为索引
   - 另一方面，调用 Update Handler
     - RS Controller 发现ReplicaSet发生变化后，会把字符串**nsA/rsA** 加入到工作队列
     - Worker 池中的一个 Worker 从工作队列中取到**nsA/rsA**的 Key，然后通过 Indexer 从缓存中取得最新的ReplicaSet
     - Worker 通过比较ReplicaSet的**spec(3)**和**status(2)**，发现该ReplicaSet需要扩容
     - 因此Worker 创建一个 Pod（Ownereference为 rsA）
     - 然后Reflector会 Watch 到 Pod 的新增事件，往Delta队列增加Delta 2（**Object=pod3,Type=Added**）

![image-20210711152128032](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210711152128032.png)

### Delta 2

1. 接上，增加Delta 2（**Object=pod3,Type=Added**）
2. Informer
   - 一方面，通过 Indexer 把 pod3 记录到缓存中
   - 另一方面，调用 Add Handler
     - 通过检查pod3的Ownereference找到对应的ReplicaSet，并将 nsA/rsA 的 Key 加入到工作队列
     - Worker 在得到 nsA/rsA 后，通过 Indexer 从缓存中获得新的rsA记录，并得到由rsA所有创建的 Pod
     - 由于 rsA 的 staus（所创建的 Pod 的数量）不是最新的，更新 rsA的staus，使得 rsA 的**spec(3)** 和 **status(3)**达成一致

![image-20210711152149482](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210711152149482.png)

## 声明式 API

![image-20210711143934721](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210711143934721.png)

## 小结

![image-20210711144016246](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210711144016246.png)

# 参考资料

1. [CNCF × Alibaba 云原生技术公开课](https://edu.aliyun.com/course/1651)