---
title: Kubernetes - NFS
mathjax: false
date: 2022-10-31 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/9853fe56.webp
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Kubernetes
---

# 架构

![image-20230626234118622](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230626234118622.png)

<!-- more -->

# 搭建

## Server

```
$ sudo apt install nfs-kernel-server
```

> 配置 - /etc/exports

```
/tmp/nfs 192.168.191.0/24(rw,sync,no_subtree_check,no_root_squash,insecure)
```

> 让配置生效

```
$ sudo exportfs -ra

$ sudo exportfs -v
/tmp/nfs      	192.168.191.0/24(sync,wdelay,hide,no_subtree_check,sec=sys,rw,insecure,no_root_squash,no_all_squash)
```

> 启动 NFS Server

```
$ sudo systemctl start nfs-server

$ sudo systemctl enable nfs-server

$ sudo systemctl status nfs-server
● nfs-server.service - NFS server and services
     Loaded: loaded (/lib/systemd/system/nfs-server.service; enabled; vendor preset: enabled)
    Drop-In: /run/systemd/generator/nfs-server.service.d
             └─order-with-mounts.conf
     Active: active (exited) since Mon 2022-06-26 15:41:48 UTC; 8min ago
   Main PID: 355749 (code=exited, status=0/SUCCESS)
        CPU: 3ms

Jun 26 15:41:48 mac-worker systemd[1]: Starting NFS server and services...
Jun 26 15:41:48 mac-worker exportfs[355748]: exportfs: can't open /etc/exports for reading
Jun 26 15:41:48 mac-worker systemd[1]: Finished NFS server and services.
```

> 检查 NFS 的网络挂载情况

```
$ showmount -e 127.1
Export list for 127.1:
/tmp/nfs 192.168.191.0/24
```

## Client

```
$ sudo apt install nfs-common

$ k get no -owide
NAME         STATUS   ROLES                  AGE   VERSION   INTERNAL-IP       EXTERNAL-IP   OS-IMAGE             KERNEL-VERSION      CONTAINER-RUNTIME
mac-master   Ready    control-plane,master   9d    v1.23.3   192.168.191.144   <none>        Ubuntu 22.04.2 LTS   5.15.0-75-generic   docker://24.0.2
mac-worker   Ready    <none>                 9d    v1.23.3   192.168.191.146   <none>        Ubuntu 22.04.2 LTS   5.15.0-75-generic   docker://20.10.24

$ showmount -e 192.168.191.146
Export list for 192.168.191.146:
/tmp/nfs 192.168.191.0/24
```

> 挂载 NFS Server 的共享目录

```
$ mkdir -p /tmp/test

$ sudo mount -t nfs 192.168.191.146:/tmp/nfs /tmp/test

$ touch /tmp/test/x.yml
```

> 回到 NFS Server

```
$ ls /tmp/nfs/
x.yml
```

# 静态存储卷

> `手工创建`的 PV 称为`静态存储卷`，PV 的`大小很难精确控制`，容易出现`空间不足`或者`空间浪费`的情况

## PersistentVolume

> NFS 支持多个 Node 访问同一个共享目录，因此访问模式采用 `ReadWriteMany`

> /tmp/nfs/1g-pv 目录需`提前创建`

```yaml nfs-pv.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-1g-pv

spec:
  storageClassName: nfs
  accessModes:
  - ReadWriteMany
  capacity:
    storage: 1Gi
  nfs:
    server: 192.168.191.146
    path: /tmp/nfs/1g-pv
```

```
$ k apply -f nfs-pv.yaml
persistentvolume/nfs-1g-pv created

$ k get pv -owide
NAME          CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS      CLAIM                 STORAGECLASS   REASON   AGE     VOLUMEMODE
nfs-1g-pv     1Gi        RWX            Retain           Available                         nfs                     35s     Filesystem
```

## PersistentVolumeClaim

```yaml nfs-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-1g-pvc

spec:
  storageClassName: nfs
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 1Gi
```

```
$ k apply -f nfs-pvc.yaml
persistentvolumeclaim/nfs-1g-pvc created

$ k get pvc -owide
NAME          STATUS   VOLUME        CAPACITY   ACCESS MODES   STORAGECLASS   AGE     VOLUMEMODE
nfs-1g-pvc    Bound    nfs-1g-pv     1Gi        RWX            nfs            25s     Filesystem

$ k get pv -owide
NAME          CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                 STORAGECLASS   REASON   AGE     VOLUMEMODE
nfs-1g-pv     1Gi        RWX            Retain           Bound    default/nfs-1g-pvc    nfs                     5m2s    Filesystem
```

## Pod

> 每个 Node 上已经安装了 NFS 客户端，Kubernetes 会`自动执行` NFS 的挂载动作

```yaml nfs-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: nfs-pod

spec:
  volumes:
  - name: nfs-pvc-vol
    persistentVolumeClaim:
      claimName: nfs-1g-pvc
  containers:
  - name: nfs-container
    image: nginx:alpine
    ports:
    - containerPort: 80
    volumeMounts:
    - name: nfs-pvc-vol
      mountPath: /tmp
```

![image-20230627002318860](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230627002318860.png)

```
$ k apply -f nfs-pod.yaml
pod/nfs-pod created

$ k get po -owide
NAME                                READY   STATUS    RESTARTS       AGE     IP           NODE         NOMINATED NODE   READINESS GATES
nfs-pod                             1/1     Running   0              27s     10.10.1.57   mac-worker   <none>           <none>

$ k exec -it nfs-pod -- sh
/ # echo 'zhongmingmao' > /tmp/name.txt
/ # cat /tmp/name.txt
zhongmingmao
/ # exit
```

> 回到 NFS Server

```
$ cat /tmp/nfs/1g-pv/name.txt
zhongmingmao
```

> 重建 Pod，数据已被持久化

```
$ k delete -f nfs-pod.yaml
pod "nfs-pod" deleted

$ k apply -f nfs-pod.yaml
pod/nfs-pod created

$  k exec -it nfs-pod -- cat /tmp/name.txt
zhongmingmao
```

# 动态存储卷

> 用 `StorageClass` 绑定一个 `Provisioner`（能够`自动`管理存储、创建 PV 的应用）

> Kubernetes 中的`每一类存储设备`都有相应的 `Provisioner` 对象

## 部署

> 部署 NFS Provisioner，参照：https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner/tree/master/deploy

```yaml deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nfs-client-provisioner
  labels:
    app: nfs-client-provisioner
  # replace with namespace where provisioner is deployed
  namespace: kube-system
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: nfs-client-provisioner
  template:
    metadata:
      labels:
        app: nfs-client-provisioner
    spec:
      serviceAccountName: nfs-client-provisioner
      containers:
        - name: nfs-client-provisioner
          image: registry.k8s.io/sig-storage/nfs-subdir-external-provisioner:v4.0.2
          volumeMounts:
            - name: nfs-client-root
              mountPath: /persistentvolumes
          env:
            - name: PROVISIONER_NAME
              value: k8s-sigs.io/nfs-subdir-external-provisioner
            - name: NFS_SERVER
              value: 192.168.191.146
            - name: NFS_PATH
              value: /tmp/nfs
      volumes:
        - name: nfs-client-root
          nfs:
            server: 192.168.191.146
            path: /tmp/nfs
```

```
$ k apply -f rbac.yaml
$ k apply -f class.yaml
$ k apply -f deployment.yaml

$ k get deployments.apps -n kube-system
NAME                     READY   UP-TO-DATE   AVAILABLE   AGE
coredns                  2/2     2            2           9d
nfs-client-provisioner   1/1     1            1           64s

$ k get po -n kube-system -l app=nfs-client-provisioner
NAME                                      READY   STATUS    RESTARTS   AGE
nfs-client-provisioner-5bf9b668b7-4xstd   1/1     Running   0          90s
```

## 使用

> 不再需要手工定义 PV，只需要在 `PVC` 里指定 `StorageClass` 对象，StorageClass 对象再关联到 `Provisioner`

```
$ k api-resources --api-group='storage.k8s.io'
NAME                   SHORTNAMES   APIVERSION               NAMESPACED   KIND
csidrivers                          storage.k8s.io/v1        false        CSIDriver
csinodes                            storage.k8s.io/v1        false        CSINode
csistoragecapacities                storage.k8s.io/v1beta1   true         CSIStorageCapacity
storageclasses         sc           storage.k8s.io/v1        false        StorageClass
volumeattachments                   storage.k8s.io/v1        false        VolumeAttachment
```

```yaml nfs-sc.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-client-retained

provisioner: k8s-sigs.io/nfs-subdir-external-provisioner
parameters:
  onDelete: "retain"
```

```
$ k apply -f nfs-sc.yaml
storageclass.storage.k8s.io/nfs-client-retained created

$ k get sc -owide
NAME                  PROVISIONER                                   RECLAIMPOLICY   VOLUMEBINDINGMODE   ALLOWVOLUMEEXPANSION   AGE
nfs-client            k8s-sigs.io/nfs-subdir-external-provisioner   Delete          Immediate           false                  12m
nfs-client-retained   k8s-sigs.io/nfs-subdir-external-provisioner   Delete          Immediate           false                  59s
```

> 定义 PVC，使用默认的 StorageClass nfs-client 向 Kubernetes 申请 10MB 存储空间

```yaml nfs-dyn-10m-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-dyn-10m-pvc

spec:
  storageClassName: nfs-client
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 10Mi
```

```
$ k apply -f nfs-dyn-10m-pvc.yaml
persistentvolumeclaim/nfs-dyn-10m-pvc created

$ k get pvc -owide
NAME              STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE   VOLUMEMODE
host-5m-pvc       Bound    host-10m-pv                                10Mi       RWO            host-test      8h    Filesystem
nfs-1g-pvc        Bound    nfs-1g-pv                                  1Gi        RWX            nfs            66m   Filesystem
nfs-dyn-10m-pvc   Bound    pvc-adac3f28-ebf8-412b-bd88-ac963a65c8b5   10Mi       RWX            nfs-client     92s   Filesystem

$ k get pv -owide
NAME                                       CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                     STORAGECLASS   REASON   AGE    VOLUMEMODE
host-10m-pv                                10Mi       RWO            Retain           Bound    default/host-5m-pvc       host-test               8h     Filesystem
nfs-1g-pv                                  1Gi        RWX            Retain           Bound    default/nfs-1g-pvc        nfs                     71m    Filesystem
pvc-adac3f28-ebf8-412b-bd88-ac963a65c8b5   10Mi       RWX            Delete           Bound    default/nfs-dyn-10m-pvc   nfs-client              108s   Filesystem
```

> 回到 NFS Server

```
$ ls /tmp/nfs
1g-pv  default-nfs-dyn-10m-pvc-pvc-adac3f28-ebf8-412b-bd88-ac963a65c8b5  x.yml
```

> Pod 使用 PVC

```yaml nfs-dyn-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: nfs-dyn-pod

spec:
  volumes:
  - name: nfs-dyn-10m-vol
    persistentVolumeClaim:
      claimName: nfs-dyn-10m-pvc
  containers:
  - name: nfs-dyn-container
    image: nginx:alpine
    ports:
    - containerPort: 80
    volumeMounts:
    - name: nfs-dyn-10m-vol
      mountPath: /tmp
```

![image-20230627012509756](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230627012509756.png)

```
$ k apply -f nfs-dyn-pod.yaml
pod/nfs-dyn-pod created

$ k get pod
NAME                                READY   STATUS    RESTARTS       AGE
nfs-dyn-pod                         1/1     Running   0              17s

$ k exec -it nfs-dyn-pod -- sh
/ # echo 'zhongmingmao' > /tmp/name.txt
/ # cat /tmp/name.txt
zhongmingmao
/ # exit

$ k exec -it nfs-dyn-pod -- cat /tmp/name.txt
zhongmingmao
```

> 回到 NFS Server

```
$ cat /tmp/nfs/default-nfs-dyn-10m-pvc-pvc-adac3f28-ebf8-412b-bd88-ac963a65c8b5/name.txt
zhongmingmao
```

> 重建 Pod

```
$ k delete -f nfs-pod.yaml
pod "nfs-pod" deleted

$ k get pvc -owide
NAME              STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE   VOLUMEMODE
host-5m-pvc       Bound    host-10m-pv                                10Mi       RWO            host-test      8h    Filesystem
nfs-1g-pvc        Bound    nfs-1g-pv                                  1Gi        RWX            nfs            76m   Filesystem
nfs-dyn-10m-pvc   Bound    pvc-adac3f28-ebf8-412b-bd88-ac963a65c8b5   10Mi       RWX            nfs-client     11m   Filesystem

$ k get pv -owide
NAME                                       CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                     STORAGECLASS   REASON   AGE   VOLUMEMODE
host-10m-pv                                10Mi       RWO            Retain           Bound    default/host-5m-pvc       host-test               8h    Filesystem
nfs-1g-pv                                  1Gi        RWX            Retain           Bound    default/nfs-1g-pvc        nfs                     81m   Filesystem
pvc-adac3f28-ebf8-412b-bd88-ac963a65c8b5   10Mi       RWX            Delete           Bound    default/nfs-dyn-10m-pvc   nfs-client              11m   Filesystem

$ k apply -f nfs-pod.yaml
pod/nfs-pod created

$ k exec -it nfs-dyn-pod -- cat /tmp/name.txt
zhongmingmao
```









