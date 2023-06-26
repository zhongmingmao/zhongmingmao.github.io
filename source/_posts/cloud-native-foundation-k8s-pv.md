---
title: Kubernetes - PersistentVolume
mathjax: false
date: 2022-10-30 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230625163632509.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Kubernetes
---

# 概述

## PersistentVolume

1. Pod 里的容器由镜像产生，镜像文件本身是只读的，进程要读写磁盘需要一个`临时的存储空间`
   - 一旦 Pod 销毁，临时存储会被`立即释放`，数据也就丢失了
2. PersistentVolume
   - 用来表示`持久存储设备`，隐藏了存储的底层实现
   - PersistentVolume 实际是一些`存储设备`和`文件系统`，如 Ceph、GlusterFS、NFS、本地磁盘
   - PersistentVolume 是属于`集群`的系统资源，是和 `Node 平级`的对象，`Pod 只有使用权`

<!-- more -->

## PersistentVolumeClaim + StorageClass

> PersistentVolumeClaim 和 StorageClass 是 Pod 与 PersistentVolume 之间的`中间层`

1. `Pod` 用 `PersistentVolumeClaim` 来向 Kubernetes `申请存储资源`
2. `bind`：一旦资源申请成功，Kubernetes 会把 `PV` 和 `PVC` 关联在一起
3. StorageClass 类似于 IngressClass，`抽象`了特定类型的存储系统
   - 在 PVC 和 PV 之间充当`协调人`的角色，`帮助 PVC 找到合适的 PV`

![image-20230625212036873](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230625212036873.png)

# HostPath

> `HostPath` 一般用于 `DaemonSet`，如 Fluentd 等

```
$ k api-resources --api-group=""
NAME                     SHORTNAMES   APIVERSION   NAMESPACED   KIND
...
persistentvolumeclaims   pvc          v1           true         PersistentVolumeClaim
persistentvolumes        pv           v1           false        PersistentVolume
...
```

## PersistentVolume

> 访问模式：由于`存储`是`系统级别`的概念，被限制的对象为 `Node`，而非 Pod

| Mode               | Desc                                                         |
| ------------------ | ------------------------------------------------------------ |
| `ReadWriteOnce`    | 存储卷可读可写，但只能被一个 `Node` 上的 Pod 挂载            |
| `ReadOnlyMany`     | 存储卷只读不可写，可以被任意 `Node` 上的 Pod 多次挂载        |
| `ReadWriteMany`    | 存储卷可读可写，可以被任意 `Node` 上的 Pod 多次挂载          |
| `ReadWriteOncePod` | Kubernetes 1.27<br />存储卷可读可写，但只能被一个 `Pod` 上的 Pod 挂载 |

```yaml pv.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: host-10m-pv

spec:
  storageClassName: host-test
  accessModes:
  - ReadWriteOnce
  capacity:
    storage: 10Mi
  hostPath:
    path: /tmp/host-10m-pv
```

```
$ k apply -f pv.yaml
persistentvolume/host-10m-pv created

$ k get pv -owide
NAME          CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS      CLAIM   STORAGECLASS   REASON   AGE   VOLUMEMODE
host-10m-pv   10Mi       RWO            Retain           Available           host-test               40s   Filesystem
```

## PersistentVolumeClaim

> Kubernetes 会根据 PVC 的描述，去找能够匹配 `StorageClass` 和 `Capacity` 等条件的 PV

```yaml pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: host-5m-pvc

spec:
  storageClassName: host-test
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 5Mi
```

> PVC 对象一旦创建成功，Kubernetes 会立即通过 StorageClass、resources 等条件在集群内`寻找并绑定`匹配的 PV

```
$ k apply -f pvc.yaml
persistentvolumeclaim/host-5m-pvc created

$ k get pvc -owide
NAME          STATUS   VOLUME        CAPACITY   ACCESS MODES   STORAGECLASS   AGE   VOLUMEMODE
host-5m-pvc   Bound    host-10m-pv   10Mi       RWO            host-test      70s   Filesystem

$ k get pv -owide
NAME          CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                 STORAGECLASS   REASON   AGE     VOLUMEMODE
host-10m-pv   10Mi       RWO            Retain           Bound    default/host-5m-pvc   host-test               4m58s   Filesystem
```

> 修改 PVC 的预期为 100Mi，PVC 会一直处于 `Pending` 状态（因为没有找到符合要求的 PV）

```
$ k get pvc -owide
NAME            STATUS    VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS   AGE   VOLUMEMODE
host-100m-pvc   Pending                                      host-test      4s    Filesystem

$ k get pv -owide
NAME          CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS      CLAIM   STORAGECLASS   REASON   AGE   VOLUMEMODE
host-10m-pv   10Mi       RWO            Retain           Available           host-test               22s   Filesystem
```

## Pod

```yaml nginx.yaml
apiVersion: v1
kind: Pod
metadata:
  name: host-pvc-pod

spec:
  volumes:
  - name: host-pvc-vol
    persistentVolumeClaim:
      claimName: host-5m-pvc
  containers:
  - name: nginx-pvc-pod
    image: nginx:alpine
    ports:
    - containerPort: 80
    volumeMounts:
    - name: host-pvc-vol
      mountPath: /tmp
```

![image-20230626175201216](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230626175201216.png)

```
$ k apply -f nginx.yaml
pod/host-pvc-pod created

$ k get po -owide
NAME                                READY   STATUS    RESTARTS      AGE   IP           NODE         NOMINATED NODE   READINESS GATES
host-pvc-pod                        1/1     Running   0             33s   10.10.1.55   mac-worker   <none>           <none>

$ k exec -it host-pvc-pod -- sh
/ # cd /tmp/
/tmp # echo zhongmingmao > name.txt
/tmp # cat name.txt
zhongmingmao
/tmp # exit

$ k get no -owide
NAME         STATUS   ROLES                  AGE   VERSION   INTERNAL-IP       EXTERNAL-IP   OS-IMAGE             KERNEL-VERSION      CONTAINER-RUNTIME
mac-master   Ready    control-plane,master   9d    v1.23.3   192.168.191.144   <none>        Ubuntu 22.04.2 LTS   5.15.0-75-generic   docker://24.0.2
mac-worker   Ready    <none>                 8d    v1.23.3   192.168.191.146   <none>        Ubuntu 22.04.2 LTS   5.15.0-75-generic   docker://20.10.24
```

> 登录 mac-worker

```
$ cat /tmp/host-10m-pv/name.txt
zhongmingmao
```

> 重建 Pod，当前集群只有一个 Worker 节点，能重新获取到之前的数据，实现了简单的`数据持久化`

```
$ k delete -f nginx.yaml
pod "host-pvc-pod" deleted

$ k apply -f nginx.yaml
pod/host-pvc-pod created

$ k exec -it host-pvc-pod -- cat /tmp/name.txt
zhongmingmao
```

> `emptyDir` 的生命周期与 `Pod` 相同（比容器长），`非持久化存储`，可以用作`缓存`

