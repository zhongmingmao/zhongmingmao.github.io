---
title: Kubernetes - CSI
mathjax: false
date: 2022-12-09 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/k8s-csi.jpeg
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
---

# 运行时存储

> 运行时存储：`镜像只读层` + `容器读写层`（`写`性能不高）

![image-20230729181341627](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230729181341627.png)

1. 容器启动后，运行时所需`文件系统`的性能直接影响容器性能
2. 早期 Docker 使用 `DeviceMapper` 作为容器运行时的`存储驱动`，因为 `OverlayFS` 尚未合并进 `Linux Kernel`
3. 目前 `Docker` 和 `containerd` 都默认以 `OverlayFS` 作为`运行时存储驱动`
4. OverlayFS 的`性能很好`，与操作`主机`文件的性能几乎一致，比 `DeviceMapper` 优 `20%`

<!-- more -->

# CSI

## 分类

> 以`插件`的形式来实现对不同存储的支持和扩展

| Plugin                                     | Desc                                                         |
| ------------------------------------------ | ------------------------------------------------------------ |
| in-tree                                    | 代码`耦合`在 Kubernetes 中，社区不再接受新的 in-tree 存储插件 |
| out-of-tree - `FlexVolume` - `Native Call` | Kubernetes 通过调用 Node 的`本地可执行文件`与`存储插件`进行交互<br />FlexVolume 插件需要 Node 用 `root` 权限安装`插件驱动`<br />执行模式跟 `CNI` 非常类似 |
| out-of-tree - `CSI` - `RPC`                | CSI 通过 `RPC` 与`存储驱动`进行交互                          |

## 插件

> `创建`存储卷 - `kube-controller-manager` - `provisioner` - CSI
> `使用`存储卷 - pod on node - `kubelet` - CSI - attach + mount

1. `kube-controller-manager`
   - kube-controller-manager 模块用于`感知 CSI 驱动存在`
   - Kubernetes 的`主控模块`通过 `Unix domain socket`（并`不是 CSI 驱动`）或其它方式进行直接交互
   - Kubernetes 的`主控模块`只`与 Kubernetes 相关的 API` 进行交互
   - 如果 `CSI 驱动`有`依赖 Kubernetes API` 的操作
     - 需要在 CSI 驱动里通过 Kubernetes 的 API 来触发相关的 API 操作
2. `kubelet`
   - kubelet 模块用于`与 CSI 驱动进行交互`
   - kubelet 通过 `Unix domain socket` 向 `CSI 驱动`发起 `CSI 调用`，再发起 `mount` 卷和 `umount` 卷
   - kubelet 通过`插件注册`机制`发现 CSI 驱动`以及`用于与 CSI 驱动交互`的 `Unix domain socket`
   - 所有部署在 Kubernetes 集群中的 `CSI 驱动`都要通过 `kubelet` 的`插件注册机制`来注册自己

## 驱动

> external-`attacher` / external-`provisioner` / external-`resizer` / external-`snapshotter` / node-driver-register / CSI driver

> CSI 插件 = `存储控制器` + `存储代理`（DaemonSet）

![image-20230729185935326](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230729185935326.png)

# 临时存储

> 常用的临时存储为 `emptyDir`

> `容器运行时存储`基于 `OverlayFS`，而`写性能`非常低，写数据应该要`外挂存储`，最常用是 `host + emptyDir`

1. 卷一开始为`空`
2. 与 Pod 的生命周期`紧绑定`，当 `Pod` 从 Node 上`删除`时，emptyDir 中的`数据`也会被`永久删除`
   - `kubelet syncPod` 中的 `makePodDataDirs`
3. 当 `Pod` 中的`容器` 原地`重启`时，emptyDir 的`数据`并`不会丢失`
4. 支持`本地磁盘`、`网络存储`、`内存`
   - `emptyDir.medium: Memory` - Kubernetes 会为容器安装 `tmpfs`
   - 此时数据存储在`内存`中
     - 如果 `Node 重启`，内存数据会被`清除`
     - 而如果数据存储在`磁盘`上，`Node 重启`，数据依然`存在`
   - `tmpfs` 的内存也会计入容器的使用内存总量，受 `Cgroups` 限制
5. 设计初衷：给应用充当`缓存`空间，或者存储中间数据，用于快速恢复
6. emptyDir 的空间位于`系统根盘`，被`所有容器共享`，在`磁盘使用率较高`时会触发 `Pod Eviction`

```yaml emptydir.yaml
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
          volumeMounts:
          - mountPath: /cache
            name: cache-volume
      volumes:
      - name: cache-volume
        emptyDir: {}
```

```
$ k apply -f emptydir.yaml
deployment.apps/nginx-deployment created

$ k get po
NAME                               READY   STATUS    RESTARTS   AGE
centos-67dd9d8678-bxxdv            1/1     Running   0          3h27m
nginx                              1/1     Running   0          2d18h
nginx-deployment-9b44bf4b5-7h2t4   1/1     Running   0          12s

$ sudo crictl ps
CONTAINER           IMAGE               CREATED              STATE               NAME                        ATTEMPT             POD ID              POD
fa15a037579fc       ff78c7a65ec2b       About a minute ago   Running             nginx                       0                   af4992aeefc57       nginx-deployment-9b44bf4b5-7h2t4
...
```

> Container - `sudo crictl inspect fa15a037579fc`

> 使用的是 `Node 上的 ext4 文件系统`，并不是容器运行时的存储（`OverlayFS`）

```json
{
  "status":{
     "mounts":[
        {
           "containerPath":"/cache",
           "hostPath":"/var/lib/kubelet/pods/8af6e32d-537e-4760-b654-bf1dd416cf7b/volumes/kubernetes.io~empty-dir/cache-volume",
           "propagation":"PROPAGATION_PRIVATE",
           "readonly":false,
           "selinuxRelabel":false
        }
     ]
  },
  "info":{
     "config":{
        "mounts":[
           {
              "container_path":"/cache",
              "host_path":"/var/lib/kubelet/pods/8af6e32d-537e-4760-b654-bf1dd416cf7b/volumes/kubernetes.io~empty-dir/cache-volume"
           }
        ]
     },
     "mounts":[
        {
           "destination":"/cache",
           "type":"bind",
           "source":"/var/lib/kubelet/pods/8af6e32d-537e-4760-b654-bf1dd416cf7b/volumes/kubernetes.io~empty-dir/cache-volume",
           "options":[
              "rbind",
              "rprivate",
              "rw"
           ]
        }
     ]
  }
}
```

```
$ sudo ls -ld /var/lib/kubelet/pods/8af6e32d-537e-4760-b654-bf1dd416cf7b/volumes/kubernetes.io~empty-dir/cache-volume
drwxrwxrwx 2 root root 4096 Jul 29 12:01 /var/lib/kubelet/pods/8af6e32d-537e-4760-b654-bf1dd416cf7b/volumes/kubernetes.io~empty-dir/cache-volume

$ df -Th
Filesystem                        Type      Size  Used Avail Use% Mounted on
udev                              devtmpfs  5.8G     0  5.8G   0% /dev
tmpfs                             tmpfs     1.2G  4.2M  1.2G   1% /run
/dev/mapper/ubuntu--vg-ubuntu--lv ext4       30G   14G   15G  49% /
tmpfs                             tmpfs     5.9G     0  5.9G   0% /dev/shm
tmpfs                             tmpfs     5.0M     0  5.0M   0% /run/lock
tmpfs                             tmpfs     5.9G     0  5.9G   0% /sys/fs/cgroup
/dev/nvme0n1p2                    ext4      2.0G  206M  1.6G  12% /boot
/dev/nvme0n1p1                    vfat      1.1G  6.4M  1.1G   1% /boot/efi
/dev/loop0                        squashfs   58M   58M     0 100% /snap/core20/1614
/dev/loop1                        squashfs   62M   62M     0 100% /snap/lxd/22761
tmpfs                             tmpfs     1.2G     0  1.2G   0% /run/user/1000
/dev/loop3                        squashfs   47M   47M     0 100% /snap/snapd/19459
/dev/loop4                        squashfs   60M   60M     0 100% /snap/core20/1977
/dev/loop5                        squashfs   92M   92M     0 100% /snap/lxd/24065
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/d115ca9d37d81b888613d87c251a5b73715e6e6c87797aa2da640a1568fe7abf/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/d69c146236495ec545f49398a47a96ebd9c3d7a6f27c3232ca22020a23f3566c/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/95fb6fc590c286b0a1dfec49b152927ede0de6267ce495ae6a3f85246e875813/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/1165bab25ae21f44b2e53542ad53ba0fcd09d8cd3926a2e5b06eac9c2aaa58e3/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/bc8c16a440f5c7e02fbdf04084f7084995f95d028fa791f0702d1c14724e4f5b/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/88103cf807ae5cc2639f792c6fa0b2ce2098f2bd3b00db946ad6208069249c81/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/a732a1530dd185a58a84ca866ebc4d082049f5ecfb079f42bfb4e4db0672a7d2/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/ecddecbd8bb0be0bbadc17c37b4ea684badc89bf88daae1920ffbbbd3363ec21/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/7d6e14cf214eb0436a77a72f94030819255bdce7abb177549a078fa436d6e899/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/14994dea79206eef6dca3caf2528e786aed6c882b1e03acdbac1d551c67f8909/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/704b36894705f2aabb5d3802c2071e4ea14cc2963006bd3426f1b7ce6e8b0cde/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/a31bfee878b49c68c28b36ff9fe4a7e5510639337bdff0c830dc5d37f6b87377/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/6cdce974ca5b8f5c2abc51b7cc2880df73192d440d52a964906c5437ca7eabb0/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/cb07c78e242382171ac035d9b888454f71bb393e788f7feaa7ee13d4ead5cb34/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/869afd4133b4f1415f95ab3949e26c0bd92d38034316f257c9d493889370b75b/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/68a89759992ad245f0e50af8aeca3105a709d191f82e6256fe15eec4dd9c580a/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/af4992aeefc579d7286148c31ce9a6d69592d2819c059f63db4273dc25f4a28b/shm

$ sudo crictl pods
POD ID              CREATED             STATE               NAME                                       NAMESPACE           ATTEMPT             RUNTIME
af4992aeefc57       17 minutes ago      Ready               nginx-deployment-9b44bf4b5-7h2t4           default             0                   (default)
...

$ ll /run/containerd/io.containerd.grpc.v1.cri/sandboxes/af4992aeefc579d7286148c31ce9a6d69592d2819c059f63db4273dc25f4a28b/shm
total 0
```

> 删除 Pod

```
$ k delete -f emptydir.yaml
deployment.apps "nginx-deployment" deleted

$ k get po
NAME                      READY   STATUS    RESTARTS   AGE
centos-67dd9d8678-bxxdv   1/1     Running   0          3h48m
nginx                     1/1     Running   0          2d18h

$ df -Th
Filesystem                        Type      Size  Used Avail Use% Mounted on
udev                              devtmpfs  5.8G     0  5.8G   0% /dev
tmpfs                             tmpfs     1.2G  4.0M  1.2G   1% /run
/dev/mapper/ubuntu--vg-ubuntu--lv ext4       30G   14G   15G  49% /
tmpfs                             tmpfs     5.9G     0  5.9G   0% /dev/shm
tmpfs                             tmpfs     5.0M     0  5.0M   0% /run/lock
tmpfs                             tmpfs     5.9G     0  5.9G   0% /sys/fs/cgroup
/dev/nvme0n1p2                    ext4      2.0G  206M  1.6G  12% /boot
/dev/nvme0n1p1                    vfat      1.1G  6.4M  1.1G   1% /boot/efi
/dev/loop0                        squashfs   58M   58M     0 100% /snap/core20/1614
/dev/loop1                        squashfs   62M   62M     0 100% /snap/lxd/22761
tmpfs                             tmpfs     1.2G     0  1.2G   0% /run/user/1000
/dev/loop3                        squashfs   47M   47M     0 100% /snap/snapd/19459
/dev/loop4                        squashfs   60M   60M     0 100% /snap/core20/1977
/dev/loop5                        squashfs   92M   92M     0 100% /snap/lxd/24065
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/d115ca9d37d81b888613d87c251a5b73715e6e6c87797aa2da640a1568fe7abf/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/d69c146236495ec545f49398a47a96ebd9c3d7a6f27c3232ca22020a23f3566c/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/95fb6fc590c286b0a1dfec49b152927ede0de6267ce495ae6a3f85246e875813/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/1165bab25ae21f44b2e53542ad53ba0fcd09d8cd3926a2e5b06eac9c2aaa58e3/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/bc8c16a440f5c7e02fbdf04084f7084995f95d028fa791f0702d1c14724e4f5b/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/88103cf807ae5cc2639f792c6fa0b2ce2098f2bd3b00db946ad6208069249c81/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/a732a1530dd185a58a84ca866ebc4d082049f5ecfb079f42bfb4e4db0672a7d2/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/ecddecbd8bb0be0bbadc17c37b4ea684badc89bf88daae1920ffbbbd3363ec21/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/7d6e14cf214eb0436a77a72f94030819255bdce7abb177549a078fa436d6e899/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/14994dea79206eef6dca3caf2528e786aed6c882b1e03acdbac1d551c67f8909/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/704b36894705f2aabb5d3802c2071e4ea14cc2963006bd3426f1b7ce6e8b0cde/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/a31bfee878b49c68c28b36ff9fe4a7e5510639337bdff0c830dc5d37f6b87377/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/6cdce974ca5b8f5c2abc51b7cc2880df73192d440d52a964906c5437ca7eabb0/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/cb07c78e242382171ac035d9b888454f71bb393e788f7feaa7ee13d4ead5cb34/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/869afd4133b4f1415f95ab3949e26c0bd92d38034316f257c9d493889370b75b/shm
shm                               tmpfs      64M     0   64M   0% /run/containerd/io.containerd.grpc.v1.cri/sandboxes/68a89759992ad245f0e50af8aeca3105a709d191f82e6256fe15eec4dd9c580a/shm

$ sudo ls -ld /var/lib/kubelet/pods/8af6e32d-537e-4760-b654-bf1dd416cf7b/volumes/kubernetes.io~empty-dir/cache-volume
ls: cannot access '/var/lib/kubelet/pods/8af6e32d-537e-4760-b654-bf1dd416cf7b/volumes/kubernetes.io~empty-dir/cache-volume': No such file or directory
```

# 半持久化存储

> 常用的半持久化存储为 `hostPath`，一般`不推荐`使用

1. hostPath 将 `Node 文件系统`上的文件或者目录`挂载`到指定的 Pod 中
2. 场景：获取 Node 的`系统信息`
   - 日志采集 - `/var/log/pods`
   - `/proc`
3. 支持类型：`目录`、`字符设备`、`块设备`
4. 几点注意
   - 使用同一目录的 Pod 可能会调度到不同的 Node，目录中的内容可能是不同的
   - Kubernetes 在`调度`时无法顾及 `hostPath` 使用的资源
   - `Pod` 被`删除`后，hostPath 上的数据一般会`遗留`在 Node 上，`占用磁盘空间`

> PV

```yaml pv.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: task-pv-volume
  labels:
    type: local
spec:
  storageClassName: manual
  capacity:
    storage: 100Mi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: "/mnt/data"
```

> PV 一般由集群管理员创建

```
$ sudo mkdir /mnt/data

$ sudo sh -c "echo 'Hello from Kubernetes storage' > /mnt/data/index.html"

$ k get pv
No resources found

$ k apply -f pv.yaml
persistentvolume/task-pv-volume created

$ k get pv -owide
NAME             CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS      CLAIM   STORAGECLASS   REASON   AGE   VOLUMEMODE
task-pv-volume   100Mi      RWO            Retain           Available           manual                  20s   Filesystem
```

> PVC - 用户申请

```yaml pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: task-pv-claim
spec:
  storageClassName: manual
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Mi
```

```
$ k apply -f pvc.yaml
persistentvolumeclaim/task-pv-claim created

$ k get pvc -owide
NAME            STATUS   VOLUME           CAPACITY   ACCESS MODES   STORAGECLASS   AGE     VOLUMEMODE
task-pv-claim   Bound    task-pv-volume   100Mi      RWO            manual         2m40s   Filesystem

$ k get pv
NAME             CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                   STORAGECLASS   REASON   AGE
task-pv-volume   100Mi      RWO            Retain           Bound    default/task-pv-claim   manual                  3m32s
```

> Pod - 从 PVC 挂载卷

```yaml pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: task-pv-pod
spec:
  volumes:
    - name: task-pv-storage
      persistentVolumeClaim:
        claimName: task-pv-claim
  containers:
    - name: task-pv-container
      image: nginx
      ports:
        - containerPort: 80
          name: "http-server"
      volumeMounts:
        - mountPath: "/usr/share/nginx/html"
          name: task-pv-storage
```

```
$ k apply -f pod.yaml
pod/task-pv-pod created

$ k get po -owide
NAME                      READY   STATUS    RESTARTS   AGE     IP               NODE      NOMINATED NODE   READINESS GATES
centos-67dd9d8678-bxxdv   1/1     Running   0          4h13m   192.168.185.20   mac-k8s   <none>           <none>
nginx                     1/1     Running   0          2d19h   192.168.185.16   mac-k8s   <none>           <none>
task-pv-pod               1/1     Running   0          56s     192.168.185.22   mac-k8s   <none>           <none>

$ ip r
default via 192.168.191.2 dev ens160 proto dhcp src 192.168.191.153 metric 100
172.17.0.0/16 dev docker0 proto kernel scope link src 172.17.0.1 linkdown
blackhole 192.168.185.0/26 proto 80
192.168.185.8 dev calia19a798b8fd scope link
192.168.185.9 dev calice2f12042d3 scope link
192.168.185.10 dev calic53d7952249 scope link
192.168.185.11 dev calicb368f46996 scope link
192.168.185.12 dev cali07e441e0d79 scope link
192.168.185.13 dev cali9ecb9fbd866 scope link
192.168.185.16 dev calic440f455693 scope link
192.168.185.20 dev calica4914fdab0 scope link
192.168.185.22 dev calie85a22d69f1 scope link
192.168.191.0/24 dev ens160 proto kernel scope link src 192.168.191.153
192.168.191.2 dev ens160 proto dhcp scope link src 192.168.191.153 metric 100

$ curl 192.168.185.22
Hello from Kubernetes storage
```

> 修改 hostPath 里面的资源

```
$ k exec -it task-pv-pod -- bash
root@task-pv-pod:/# echo 'hello go' > /usr/share/nginx/html/index.html
root@task-pv-pod:/#
exit

$ curl 192.168.185.22
hello go

$ cat /mnt/data/index.html
hello go

$ k delete -f pod.yaml -f pvc.yaml -f pv.yaml
pod "task-pv-pod" deleted
persistentvolumeclaim "task-pv-claim" deleted
persistentvolume "task-pv-volume" deleted

$ cat /mnt/data/index.html
hello go
```

# 持久化存储

> 引入了 `StorageClass`、`PersistentVolumeClaim`、`PersistentVolume` 
> 将`存储`独立于 `Pod 的生命周期`来进行管理

> 支持主流的`块存储`和`文件存储`，大体可分为`网络存储`和`本地存储`

## StorageClass

> 用于指示`存储类型`

```
$ k api-resources --api-group='storage.k8s.io'
NAME                   SHORTNAMES   APIVERSION               NAMESPACED   KIND
csidrivers                          storage.k8s.io/v1        false        CSIDriver
csinodes                            storage.k8s.io/v1        false        CSINode
csistoragecapacities                storage.k8s.io/v1beta1   true         CSIStorageCapacity
storageclasses         sc           storage.k8s.io/v1        false        StorageClass
volumeattachments                   storage.k8s.io/v1        false        VolumeAttachment

$ k get sc -A
NAME                  PROVISIONER               RECLAIMPOLICY   VOLUMEBINDINGMODE      ALLOWVOLUMEEXPANSION   AGE
localdev-nfs-common   nfs-localdev-nfs-common   Retain          WaitForFirstConsumer   false                  26d
```

```yaml localdev-nfs-common
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  annotations:
    k8s.kuboard.cn/storageType: nfs_client_provisioner
  creationTimestamp: "2022-07-03T05:56:58Z"
  name: localdev-nfs-common
  resourceVersion: "574432"
  uid: 7915a5fa-606f-4d08-8498-3db67aaf9c61
parameters:
  archiveOnDelete: "false"
provisioner: nfs-localdev-nfs-common
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
```

```
$ get deployments.apps -n kube-system | grep nfs
eip-nfs-localdev-nfs-common   1/1     1            1           26d
```

## PersistentVolumeClaim

> 由`用户`创建，代表用户`对存储需求的声明`；存储卷的`访问模式`必须与`存储类型`一致

| AccessMode            | Desc                                         |
| --------------------- | -------------------------------------------- |
| `ReadWriteOnce` - RWO | 该卷只能在`1 个 Node` 上被 Mount，`可读可写` |
| `ReadOnlyMany` - ROX  | 该卷只能在`N 个 Node` 上被 Mount，`只读`     |
| `ReadWriteMany` - RWX | 该卷只能在`N 个 Node` 上被 Mount，`可读可写` |

## PersistentVolume

> `静态` - 由集群管理员`提前创建`
> `动态` - 根据 PVC 的申请需求`动态创建`

## 对象关系

> 1. `用户`创建 `PVC` 来`申请`存储
> 2. `控制器`通过 `PVC` 的 `StorageClass` 和`请求大小`，到`存储后端`创建 `PV`
>    - StorageClass 对应 `Provisioner`，Provisioner 也是一个 Controller
> 3. `Pod` 通过指定 `PVC` 来`引用`存储

![image-20230729211158482](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230729211158482.png)

## 最佳实践

> `本地` = `集群内部`

1. 不同`介质类型`的磁盘，需要设置不同的 `StorageClass`（需要设置磁盘介质的类型）
2. 在`本地存储`的 PV `静态`部署模式下，每个`物理磁盘`都尽量只创建`一个 PV`
   - 如果划分多个`分区`来提供多个本地存储 PV，会产生 `IO 竞争`
3. `本地存储`需要配合`磁盘检测`
   - 在集群部署`规模化`后，每个集群的`本地存储 PV` 可能会超过几万个，`磁盘损坏`是`频发事件`
4. 对于提供`本地存储`节点的`磁盘管理`，需要做到`灵活管理`和`自动化`

## Exclusive / Static

> 场景：`高 IOPS`

> `先创建 PV`
>
> 1. Node 上架时携带了硬盘，一旦注册到 Kubernetes，会有 provisioner 扫描 Node 的信息，并自动创建 PV
> 2. 当用户使用 Pod 时，里面会携带 PVC 的定义
> 3. 当 Pod 知道要调度到某个 Node 时，会建立对应 PVC 和 PV 的绑定

![image-20230729213606940](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230729213606940.png)

## Shared / Dynamic

> 场景：需要`大空间`，借助 `LVM`，非独占（可能会有 `IO 竞争`）

> `先创建 PVC，然后动态创建 PV`
>
> 1. `CSI 驱动` 需要`汇报` Node 上相关存储的资源信息，以便于调度
> 2. 不同厂家的机器，汇报方式也不同
> 3. 如何`汇报` Node 的存储信息，以及如何让 Node 的存储信息应用于`调度`，目前`没有统一的方案`

![image-20230729220257698](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230729220257698.png)
