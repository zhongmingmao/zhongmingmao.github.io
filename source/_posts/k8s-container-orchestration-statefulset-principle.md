---
title: 容器编排 -- StatefulSet（原理）
mathjax: false
date: 2021-06-17 08:17:08
categories:
    - Cloud Native
    - Kubernetes
tags:
    - Cloud Native
    - Kubernetes
---

# 背景

1. Deployment的短板：Deployment认为一个应用的所有Pod，是**完全一样**的
2. 有状态应用（**Stateful** Application）
   - 实例之间有**不对等**的关系 -- **拓扑**
   - 实例对**外部数据**有依赖关系 -- **存储**
3. StatefulSet
   - Kubernetes**在Deployment的基础上**，扩展出对有状态应用的初步支持
   - StatefulSet是Kubernetes在**作业编排**的集大成者

# 状态抽象

1. 分类
   - **拓扑**状态：应用的多个实例之间是**不完全对等**的关系
   - **存储**状态：应用的多个实例分别**绑定了不同的存储数据**
2. 核心功能：通过某种方式**记录**状态，然后在Pod被**重新创建**时，能够为新Pod**恢复**这些状态

# 设计思想

1. StatefulSet是一种**特殊的Deployment**，独特之处：**为每个Pod编号**（代表创建顺序、网络标识等）
2. **编号 + Headless Service ==> 拓扑状态**
3. **编号 + Headless Service + PV/PVC ==> 存储状态**

<!-- more -->

# 拓扑状态

1. StatefulSet控制器使用**Pod模板**创建Pod时，对它们进行**编号**，并且按编号**顺序**逐一完成创建工作
2. StatefulSet控制器进行『**调谐**』时，会严格按照Pod编号的**顺序**，逐一完成这些操作
3. 通过**Headless Service**的方式，StatefulSet为**每个Pod**创建一个**固定并且稳定的DNS记录**，来作为它的**访问入口**

## Service

> Services：用来将一组Pod暴露给外界访问的一种机制

### 访问方式

1. **VIP**（Virtual IP）：访问Service的VIP，Service会把请求**转发**到该Service所代理的某个Pod上
2. **DNS**：访问`my-svc.my-namespace.svc.cluster.local`，可以访问到Service（`my-svc`）所代理的某个Pod
   - **Normal Service**
     - 访问`my-svc.my-namespace.svc.cluster.local`解析到的是`my-svc`的VIP（需要**转发**请求）
   - _**Headless Service**_
     - 访问`my-svc.my-namespace.svc.cluster.local`解析到的是`my-svc`代理的某个Pod的IP，并不需要分配一个VIP

## svc.yaml

1. clusterIP为None，该Service被创建后不会被分配一个VIP（Headless），以**DNS**的方式暴露它所代理（Label Selector）的Pod
2. Headless Service创建之后，它**所代理的所有Pod的IP**，都会**被绑定一个DNS记录**
   - Pod的**唯一可解释**身份：**`<pod-name>.<svc-name>.<namespace>`**.`svc.cluster.local`

```yaml svc.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
  labels:
    app: nginx
spec:
  ports:
    - port: 80
      name: web
  clusterIP: None
  selector:
    app: nginx
```

## statefulset.yaml

> `serviceName: nginx`：StatefulSet控制器在执行控制循环时，会使用`nginx`（**Headless Service**）来**保证Pod的可解释身份**

```yaml statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web
spec:
  serviceName: nginx
  replicas: 2
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
          image: 'nginx:1.9.1'
          ports:
            - containerPort: 80
              name: web
```

## 创建Headless Service

```
# kubectl apply -f svc.yaml
service/nginx created

# kubectl get service nginx
NAME    TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE
nginx   ClusterIP   None         <none>        80/TCP    17s
```

## 创建StatefulSet

```
# kubectl apply -f statefulset.yaml
statefulset.apps/web created
```

1. StatefulSet给它所管理的所有Pod的命名进行编号，编号规则为`-`，编号从**0**开始，**Pod的创建**严格按照**编号顺序**进行
2. web-0进入到**Running**状态并且细分状态（**Conditions**）成为**Ready**之前，web-1一直处于**Pending**状态

```
# kubectl get pods -w -l app=nginx
NAME    READY   STATUS    RESTARTS   AGE
web-0   0/1     Pending   0          0s
web-0   0/1     Pending   0          0s
web-0   0/1     ContainerCreating   0          0s
web-0   1/1     Running             0          31s
web-1   0/1     Pending             0          0s
web-1   0/1     Pending             0          0s
web-1   0/1     ContainerCreating   0          0s
web-1   1/1     Running             0          2s

# kubectl describe statefulset web
Name:               web
Namespace:          default
CreationTimestamp:  Thu, 17 Jun 2021 08:15:06 +0000
Selector:           app=nginx
Labels:             <none>
Annotations:        <none>
Replicas:           2 desired | 2 total
Update Strategy:    RollingUpdate
  Partition:        0
Pods Status:        2 Running / 0 Waiting / 0 Succeeded / 0 Failed
Pod Template:
  Labels:  app=nginx
  Containers:
   nginx:
    Image:        nginx:1.9.1
    Port:         80/TCP
    Host Port:    0/TCP
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
Volume Claims:    <none>
Events:
  Type    Reason            Age    From                    Message
  ----    ------            ----   ----                    -------
  Normal  SuccessfulCreate  3m27s  statefulset-controller  create Pod web-0 in StatefulSet web successful
  Normal  SuccessfulCreate  2m56s  statefulset-controller  create Pod web-1 in StatefulSet web successful
```

```
# kubectl get statefulset web
NAME   READY   AGE
web    2/2     56s
```

Pod的hostname与Pod的名字一致

```
# kubectl get pods
NAME    READY   STATUS    RESTARTS   AGE
web-0   1/1     Running   0          13m
web-1   1/1     Running   0          13m

# kubectl exec web-0 -- sh -c 'hostname'
web-0

# kubectl exec web-1 -- sh -c 'hostname'
web-1
```

## 访问Headless Service

Pod是**有状态**的，`web-0.nginx.default`对应IP为10.32.0.7，`web-1.nginx.default`对应IP为10.32.0.8

```
# kubectl run -i --tty --image busybox dns-test --restart=Never --rm /bin/sh
/ # nslookup web-0.nginx.default.svc.cluster.local
Server:		10.96.0.10
Address:	10.96.0.10:53
Name:	web-0.nginx.default.svc.cluster.local
Address: 10.32.0.7

/ # nslookup web-1.nginx.default.svc.cluster.local
Server:		10.96.0.10
Address:	10.96.0.10:53
Name:	web-1.nginx.default.svc.cluster.local
Address: 10.32.0.8
```

## 删除Pod

1. Pod删除后，Kubernetes会按照**原先编号**的顺序创建出2个新的Pod，并**分配了一样的网络身份**，保证了**Pod网络标识的稳定性**
2. Kubernetes成功地将**Pod的拓扑状态**，按照Pod的『**名字-编号**』的方式固定下来
   - Pod的拓扑状态，在**StatefulSet的整个生命周期**里都会**保持不变**（不管对应Pod删除或者重建）
3. Kubernetes为每个Pod提供了**固定且唯一的访问入口**（Pod对应的**DNS**记录）

```
# kubectl delete pod -l app=nginx
pod "web-0" deleted
pod "web-1" deleted

# kubectl get pod -w -l app=nginx
NAME    READY   STATUS    RESTARTS   AGE
web-0   1/1     Running   0          33m
web-1   1/1     Running   0          33m
web-0   1/1     Terminating   0          34m
web-1   1/1     Terminating   0          33m
web-1   0/1     Terminating   0          33m
web-0   0/1     Terminating   0          34m
web-1   0/1     Terminating   0          33m
web-1   0/1     Terminating   0          33m
web-0   0/1     Terminating   0          34m
web-0   0/1     Terminating   0          34m
web-0   0/1     Pending       0          0s
web-0   0/1     Pending       0          0s
web-0   0/1     ContainerCreating   0          0s
web-0   1/1     Running             0          3s
web-1   0/1     Pending             0          0s
web-1   0/1     Pending             0          0s
web-1   0/1     ContainerCreating   0          0s
web-1   1/1     Running             0          2s

# kubectl get pods
NAME    READY   STATUS    RESTARTS   AGE
web-0   1/1     Running   0          75s
web-1   1/1     Running   0          72s
```

`web-0.nginx.default.svc.cluster.local`本身不会变，但**解析到的Pod的IP并不是固定的**，因此访问**Stateful应用**，应该使用**域名**

```
# kubectl run -i --tty --image busybox dns-test --restart=Never --rm /bin/sh
/ # nslookup web-0.nginx.default.svc.cluster.local
Server:		10.96.0.10
Address:	10.96.0.10:53
Name:	web-0.nginx.default.svc.cluster.local
Address: 10.32.0.7

/ # nslookup web-1.nginx.default.svc.cluster.local
Server:		10.96.0.10
Address:	10.96.0.10:53
Name:	web-1.nginx.default.svc.cluster.local
Address: 10.32.0.8
```

# 存储状态

## PV & PVC

> **Persistent Volume**（PV） + **Persistent Volume Claim**（PVC）：降低用户声明和使用**持久化Volume**的门槛
> PVC和PV ≈ **接口**和**实现**，职责分离，避免向开发者暴露过多的存储系统细节而带来的安全隐患

### 定义PVC

> 在PVC对象里，不需要任何关于Volume**细节**的字段，只有**描述性**的属性和定义

```yaml 开发人员
kind: PersistentVolumeClaim
apiVersion: v1
metadata:
  name: pv-claim
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

### Pod使用PVC

> 声明Volume类型为**persistentVolumeClaim**，并指定PVC的名字，完全不必关心Volume本身的定义
> 创建PVC后，Kubernetes会**自动**为它**绑定**一个**符合条件**的PV

```yaml 开发人员
apiVersion: v1
kind: Pod
metadata:
  name: pv-pod
spec:
  containers:
    - name: pv-container
      image: nginx
      ports:
        - containerPort: 80
          name: http-server
      volumeMounts:
        - mountPath: /usr/share/nginx/html
          name: pv-storage
  volumes:
    - name: pv-storage
      persistentVolumeClaim:
        claimName: pv-claim
```

### 定义PV

> PV容量为10GiB，Kubernetes会将该PV对象绑定到前面的PVC对象（需要1GiB）

```yaml 运维人员
kind: PersistentVolume
apiVersion: v1
metadata:
  name: pv-volume
  labels:
    type: local
spec:
  capacity:
    storage: 10Gi
  rbd:
    monitors:
      - '10.16.154.78:6789'
      - '10.16.154.82:6789'
      - '10.16.154.83:6789'
    pool: kube
    image: foo
    fsType: ext4
    readOnly: true
    user: admin
    keyring: /etc/ceph/keyring
    imageformat: '2'
    imagefeatures: layering
```

## statefulset.yaml

1. **volumeClaimTemplates**：凡是被StatefulSet管理的Pod，都会声明一个**对应的PVC**（**编号与Pod一致**）
2. 自动创建的PVC，与PV绑定成功后，进入**Bound**状态（该Pod可以**挂载并使用**这个PV）
3. **PVC是一种特殊的Volume**，而PVC具体是什么类型的Volume，需要与某个PV绑定后才知道 -- **动态绑定**

```yaml statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web
spec:
  serviceName: nginx
  replicas: 2
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
          image: 'nginx:1.9.1'
          ports:
            - containerPort: 80
              name: web
          volumeMounts:
            - name: www
              mountPath: /usr/share/nginx/html
  volumeClaimTemplates:
    - metadata:
        name: www
      spec:
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: 1Gi
```

由于本环境目前暂未创建符合条件的PV，无法建立绑定，因此PVC的状态一直为**Pending**

```
# kubectl apply -f svc.yaml
service/nginx created

# kubectl apply -f statefulset.yaml
statefulset.apps/web created

# kubectl get pvc -l app=nginx
NAME        STATUS    VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS   AGE
www-web-0   Pending                                                     18s
```

成功建立绑定后，PVC的命名规则：**`<pvc.name>-<statefulset.name>-<编号>`**

```
# kubectl get pvc -l app=nginx
NAME        STATUS    VOLUME                                     CAPACITY   ACCESSMODES   AGE
www-web-0   Bound     pvc-15c268c7-b507-11e6-932f-42010a800002   1Gi        RWO           48s
www-web-1   Bound     pvc-15c79307-b507-11e6-932f-42010a800002   1Gi        RWO           48s
```

## 删除Pod

1. 删除Pod后，该**Pod对应的PVC和PV并不会被删除**，该**Pod对应的Volume已经写入的数据，依然会存储在远程存储服务**
2. StatefulSet发现Pod消失后，会重新创建一个新的**同名Pod**，该新Pod对象的定义里，依然使用**同名PVC**
3. 新Pod被创建出来后，Kubernetes为其查找**同名PVC**
   - 直接找到旧Pod遗留下来的**同名PVC**，进而找到跟这个PVC绑定的PV
   - 新Pod可以挂载旧Pod对应的Volume，并且获取到保存在Volume里的数据

## 小结

1. StatefulSet控制器**直接管理**的是**Pod**
2. Kubernetes通过**Headless Service**，为这些**有编号的Pod**，在**DNS服务器**中生成带有**同样编号的DNS记录**
3. StatefulSet为每个Pod分配并创建一个**同样编号的PVC**

# 参考资料

1. [深入剖析Kubernetes](https://time.geekbang.org/column/intro/100015201)
