---
title: Kubernetes -- 集群搭建 & 应用容器化
mathjax: false
date: 2021-06-09 18:06:46
categories:
    - Cloud Native
    - Kubernetes
tags:
    - Cloud Native
    - Kubernetes
---

# kubeadm

## 安装

```
$ apt-get install kubeadm
```

## 步骤

```
# 创建一个Master节点
$ kubeadm init

# 将一个Worker节点加入到当前集群中
$ kubeadm join <Master节点的IP和端口>
```

## 工作原理

> 直接容器化kubelet会面临很多问题，所以把kubelet直接运行在宿主机上，然后使用容器部署其它的Kubernetes组件

<!-- more -->

## 工作流程

### kubeadm init

#### Preflight Checks

> 进行一系列的检查工作，确保该机器可以用来部署Kubernetes

1. Linux内核版本 ≥ 3.10
2. Linux Cgroups模块可用
3. 机器的hostname标准（符合标准的DNS命名）
4. kubeadm与kubelet的版本匹配
5. 机器上已经安装了Kubernetes的二进制文件
6. Kubernetes的工作端口（10250/10251/10252）没有被占用
7. ip、mount等Linux指令存在
8. Docker已经安装

#### 生成证书

1. 生成Kubernetes**对外提供服务**所需的各种证书和对应的目录
2. Kubernetes对外提供服务，除非专门开启不安全模式，否则都要通过**HTTPS**才能访问kube-apiserver
3. 证书文件
   - kubeadm为Kubernetes生成的证书文件存放在Master节点的`/etc/kubernetes/pki`，对应文件：`ca.crt`和`ca.key`
   - 使用**kubectl**获取容器日志等streaming操作时，需要通过**kube-apiserver**向**kubelet**发起请求，该连接必须是安全的
     - 对应文件：`apiserver-kubelet-client.crt`和`apiserver-kubelet-client.key`
4. 手动拷贝现有证书到`/etc/kubernetes/pki/ca.{crt,key}`，kubeadm将跳过证书生成的步骤

#### 生成其它组件访问kube-apiserver所需的配置文件

1. 记录信息：**Master节点的服务器地址、监听端口、证书目录**等信息
2. 对应的客户端（如scheduler、kubelet等），可以直接加载相应的文件，使用里面的信息与kube-apiserver建立安全连接

```
$ ls /etc/kubernetes/
admin.conf  controller-manager.conf  kubelet.conf  scheduler.conf
```

#### 为Master组件生成Pod配置文件

1. kube-apiserver、kube-controller-manager、kube-scheduler被使用Pod的方式部署
2. Kubernetes支持一种特殊的容器启动方法 -- **Static Pod**
   - 把要部署的Pod的**YAML**文件放在一个指定的目录（`/etc/kubernetes/manifests`）中
   - 当该机器上的**kubelet**启动时，会自动检查该目录，加载所有Pod YAML，然后在这台机器上启动它们
     - **kubelet**地位非常高，是一个**完全独立的组件**，其它的Master组件，更像是**辅助性**的系统容器
3. Master容器启动后，kubeadm检查Master组件的健康情况：`localhost:6443/healthz`

```
$ ls /etc/kubernetes/manifests/
etcd.yaml  kube-apiserver.yaml  kube-controller-manager.yaml  kube-scheduler.yaml
```

#### 生成bootstrap token

1. 持有**bootstrap token**，任何一个安装了**kubelet**和**kubeadm**的节点，都可以通过**kubeadm join**加入到集群中
2. 然后kubeadm会将Master的重要信息，通过**ConfigMap**（**cluster-info**）的方式保存在**Etcd**中，用于部署Worker节点

#### 安装默认插件

1. 必须插件：**kube-proxy**（服务发现） + **DNS**
2. 两个插件都是**容器镜像**，kubeadm使用Kubernetes客户端创建两个**Pod**即可

### kubeadm join

1. 持有**bootstrap token**，可以在任意一台安装了**kubelet**和**kubeadm**的机器上执行**kubeadm join**
2. 需要bootstrap token的原因
   - 任何一台机器想要成为Kubernetes集群中的一个节点，必须**在kube-apiserver上注册**
     - 要与kube-apiserver打交道，必须获得相应的**CA文件**
   - **kubeadm**通过**bootstrap token**访问**kube-apiserver**，从而拿到保存在**ConfigMap**中的**cluster-info**
     - cluster-info包含kube-apiserver的地址、端口和**证书**
   - 通过cluster-info，**kubelet**可以通过**安全模式**连接到**kube-apiserver**

## 部署参数

```
$ kubeadm init --config kubeadm.yaml
```

## 生产环境

> kubeadm目前还不能用于生产环境，主要是因为不能一键部署一个**高可用**（Master、Etcd组件都应该是**多节点**）的Kubernetes集群

# 集群搭建

## 操作系统

```
# # uname -a
Linux ubuntu 4.15.0-144-generic #148-Ubuntu SMP Sat May 8 02:33:43 UTC 2021 x86_64 x86_64 x86_64 GNU/Linux

# cat /etc/issue
Ubuntu 18.04.5 LTS \n \l
```

## 集群环境

|      | Master        | Worker 1      | Worker 2      |
| ---- | ------------- | ------------- | ------------- |
| IP   | 172.16.155.10 | 172.16.155.11 | 172.16.155.12 |

## 安装Docker

> Master + Worker

```
# apt-get update

# apt-get install docker.io

# docker --version
Docker version 20.10.2, build 20.10.2-0ubuntu1~18.04.2

# systemctl enable docker
```

## 安装kubeadm、kubelet、kubectl

> Master + Worker

```
# apt-get update && apt-get install -y apt-transport-https

# curl https://mirrors.aliyun.com/kubernetes/apt/doc/apt-key.gpg | apt-key add -
OK

# cat <<EOF >/etc/apt/sources.list.d/kubernetes.list
> deb https://mirrors.aliyun.com/kubernetes/apt/ kubernetes-xenial main
> EOF

# apt-get update

# apt-get install -y kubelet kubeadm kubectl

# kubeadm version
kubeadm version: &version.Info{Major:"1", Minor:"21", GitVersion:"v1.21.1", GitCommit:"5e58841cce77d4bc13713ad2b91fa0d961e69192", GitTreeState:"clean", BuildDate:"2021-05-12T14:17:27Z", GoVersion:"go1.16.4", Compiler:"gc", Platform:"linux/amd64"}

# kubelet --version
Kubernetes v1.21.1

# kubectl version
Client Version: version.Info{Major:"1", Minor:"21", GitVersion:"v1.21.1", GitCommit:"5e58841cce77d4bc13713ad2b91fa0d961e69192", GitTreeState:"clean", BuildDate:"2021-05-12T14:18:45Z", GoVersion:"go1.16.4", Compiler:"gc", Platform:"linux/amd64"}
```

## 关闭SWAP

> Master + Worker

```
# swapon --show
NAME      TYPE SIZE USED PRIO
/swap.img file 3.8G   0B   -2

# cat /etc/fstab | grep -v '^#'
/dev/disk/by-id/dm-uuid-LVM-wuHaeeo8gINW99laMJ9x5sDf0TnGSt0YndDZGtyPo3qjwR4dmCx42yXoAA6fTxJA / ext4 defaults 0 0
/dev/disk/by-uuid/178c41cc-5a9e-4f56-abcb-1f330fe482bc /boot ext4 defaults 0 0
/swap.img	none	swap	sw	0	0
```

注释第三行后重启

```
# swapon --show | wc -l
0

# rm -rf /swap.img
```

## 修改机器名

> Master + Worker

```
# hostnamectl set-hostname master
```

```
# hostnamectl set-hostname worker-1
```

```
# hostnamectl set-hostname worker-2
```

## 初始化Master节点

> Master

### 初始化命令

```
# kubeadm init
[init] Using Kubernetes version: v1.21.2
[preflight] Running pre-flight checks
	[WARNING IsDockerSystemdCheck]: detected "cgroupfs" as the Docker cgroup driver. The recommended driver is "systemd". Please follow the guide at https://kubernetes.io/docs/setup/cri/
[preflight] Pulling images required for setting up a Kubernetes cluster
[preflight] This might take a minute or two, depending on the speed of your internet connection
[preflight] You can also perform this action in beforehand using 'kubeadm config images pull'
[certs] Using certificateDir folder "/etc/kubernetes/pki"
[certs] Generating "ca" certificate and key
[certs] Generating "apiserver" certificate and key
[certs] apiserver serving cert is signed for DNS names [kubernetes kubernetes.default kubernetes.default.svc kubernetes.default.svc.cluster.local master] and IPs [10.96.0.1 172.16.155.10]
[certs] Generating "apiserver-kubelet-client" certificate and key
[certs] Generating "front-proxy-ca" certificate and key
[certs] Generating "front-proxy-client" certificate and key
[certs] Generating "etcd/ca" certificate and key
[certs] Generating "etcd/server" certificate and key
[certs] etcd/server serving cert is signed for DNS names [localhost master] and IPs [172.16.155.10 127.0.0.1 ::1]
[certs] Generating "etcd/peer" certificate and key
[certs] etcd/peer serving cert is signed for DNS names [localhost master] and IPs [172.16.155.10 127.0.0.1 ::1]
[certs] Generating "etcd/healthcheck-client" certificate and key
[certs] Generating "apiserver-etcd-client" certificate and key
[certs] Generating "sa" key and public key
[kubeconfig] Using kubeconfig folder "/etc/kubernetes"
[kubeconfig] Writing "admin.conf" kubeconfig file
[kubeconfig] Writing "kubelet.conf" kubeconfig file
[kubeconfig] Writing "controller-manager.conf" kubeconfig file
[kubeconfig] Writing "scheduler.conf" kubeconfig file
[kubelet-start] Writing kubelet environment file with flags to file "/var/lib/kubelet/kubeadm-flags.env"
[kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
[kubelet-start] Starting the kubelet
[control-plane] Using manifest folder "/etc/kubernetes/manifests"
[control-plane] Creating static Pod manifest for "kube-apiserver"
[control-plane] Creating static Pod manifest for "kube-controller-manager"
[control-plane] Creating static Pod manifest for "kube-scheduler"
[etcd] Creating static Pod manifest for local etcd in "/etc/kubernetes/manifests"
[wait-control-plane] Waiting for the kubelet to boot up the control plane as static Pods from directory "/etc/kubernetes/manifests". This can take up to 4m0s
[apiclient] All control plane components are healthy after 15.503873 seconds
[upload-config] Storing the configuration used in ConfigMap "kubeadm-config" in the "kube-system" Namespace
[kubelet] Creating a ConfigMap "kubelet-config-1.21" in namespace kube-system with the configuration for the kubelets in the cluster
[upload-certs] Skipping phase. Please see --upload-certs
[mark-control-plane] Marking the node master as control-plane by adding the labels: [node-role.kubernetes.io/master(deprecated) node-role.kubernetes.io/control-plane node.kubernetes.io/exclude-from-external-load-balancers]
[mark-control-plane] Marking the node master as control-plane by adding the taints [node-role.kubernetes.io/master:NoSchedule]
[bootstrap-token] Using token: iu9xto.mdex6vkt8296vfgf
[bootstrap-token] Configuring bootstrap tokens, cluster-info ConfigMap, RBAC Roles
[bootstrap-token] configured RBAC rules to allow Node Bootstrap tokens to get nodes
[bootstrap-token] configured RBAC rules to allow Node Bootstrap tokens to post CSRs in order for nodes to get long term certificate credentials
[bootstrap-token] configured RBAC rules to allow the csrapprover controller automatically approve CSRs from a Node Bootstrap Token
[bootstrap-token] configured RBAC rules to allow certificate rotation for all node client certificates in the cluster
[bootstrap-token] Creating the "cluster-info" ConfigMap in the "kube-public" namespace
[kubelet-finalize] Updating "/etc/kubernetes/kubelet.conf" to point to a rotatable kubelet client certificate and key
[addons] Applied essential addon: CoreDNS
[addons] Applied essential addon: kube-proxy

Your Kubernetes control-plane has initialized successfully!

To start using your cluster, you need to run the following as a regular user:

  mkdir -p $HOME/.kube
  sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
  sudo chown $(id -u):$(id -g) $HOME/.kube/config

Alternatively, if you are the root user, you can run:

  export KUBECONFIG=/etc/kubernetes/admin.conf

You should now deploy a pod network to the cluster.
Run "kubectl apply -f [podnetwork].yaml" with one of the options listed at:
  https://kubernetes.io/docs/concepts/cluster-administration/addons/

Then you can join any number of worker nodes by running the following on each as root:

kubeadm join 172.16.155.10:6443 --token iu9xto.mdex6vkt8296vfgf \
	--discovery-token-ca-cert-hash sha256:f711d139e579ee3fbf2294ccd02dc1727261705b8a6c0e5eb681766dd32266bc
```

```
# kubeadm token create --print-join-command
kubeadm join 172.16.155.10:6443 --token i1vo0v.n4cdvjdci05s8jzj --discovery-token-ca-cert-hash sha256:f711d139e579ee3fbf2294ccd02dc1727261705b8a6c0e5eb681766dd32266bc
```

```
# ls /var/lib/kubelet
config.yaml  cpu_manager_state  device-plugins  kubeadm-flags.env  pki  plugins  plugins_registry  pod-resources  pods

# tree /etc/kubernetes/
/etc/kubernetes/
├── admin.conf
├── controller-manager.conf
├── kubelet.conf
├── manifests
│   ├── etcd.yaml
│   ├── kube-apiserver.yaml
│   ├── kube-controller-manager.yaml
│   └── kube-scheduler.yaml
├── pki
│   ├── apiserver.crt
│   ├── apiserver-etcd-client.crt
│   ├── apiserver-etcd-client.key
│   ├── apiserver.key
│   ├── apiserver-kubelet-client.crt
│   ├── apiserver-kubelet-client.key
│   ├── ca.crt
│   ├── ca.key
│   ├── etcd
│   │   ├── ca.crt
│   │   ├── ca.key
│   │   ├── healthcheck-client.crt
│   │   ├── healthcheck-client.key
│   │   ├── peer.crt
│   │   ├── peer.key
│   │   ├── server.crt
│   │   └── server.key
│   ├── front-proxy-ca.crt
│   ├── front-proxy-ca.key
│   ├── front-proxy-client.crt
│   ├── front-proxy-client.key
│   ├── sa.key
│   └── sa.pub
└── scheduler.conf
```

### 配置kubectl

1. Kubernetes集群默认是需要**加密访问**的
2. `admin.conf`为Kubernetes集群的**安全配置文件**，kubectl默认会使用`$HOME/.kube/`目录下的授信信息访问Kubernetes集群

```
# mkdir -p $HOME/.kube

# cp -i /etc/kubernetes/admin.conf $HOME/.kube/config

# chown $(id -u):$(id -g) $HOME/.kube/config
```

### 查看Node状态

> container runtime network not ready: NetworkReady=false reason:NetworkPluginNotReady message:docker: **network plugin is not ready: cni config uninitialized**

```
# kubectl get nodes
NAME     STATUS     ROLES                  AGE     VERSION
master   NotReady   control-plane,master   3m45s   v1.21.1
```

```
# kubectl describe node master
Name:               master
Roles:              control-plane,master
Labels:             beta.kubernetes.io/arch=amd64
                    beta.kubernetes.io/os=linux
                    kubernetes.io/arch=amd64
                    kubernetes.io/hostname=master
                    kubernetes.io/os=linux
                    node-role.kubernetes.io/control-plane=
                    node-role.kubernetes.io/master=
                    node.kubernetes.io/exclude-from-external-load-balancers=
Annotations:        kubeadm.alpha.kubernetes.io/cri-socket: /var/run/dockershim.sock
                    node.alpha.kubernetes.io/ttl: 0
                    volumes.kubernetes.io/controller-managed-attach-detach: true
CreationTimestamp:  Thu, 17 Jun 2021 03:54:54 +0000
Taints:             node-role.kubernetes.io/master:NoSchedule
                    node.kubernetes.io/not-ready:NoSchedule
Unschedulable:      false
Lease:
  HolderIdentity:  master
  AcquireTime:     <unset>
  RenewTime:       Thu, 17 Jun 2021 03:58:49 +0000
Conditions:
  Type             Status  LastHeartbeatTime                 LastTransitionTime                Reason                       Message
  ----             ------  -----------------                 ------------------                ------                       -------
  MemoryPressure   False   Thu, 17 Jun 2021 03:55:09 +0000   Thu, 17 Jun 2021 03:54:50 +0000   KubeletHasSufficientMemory   kubelet has sufficient memory available
  DiskPressure     False   Thu, 17 Jun 2021 03:55:09 +0000   Thu, 17 Jun 2021 03:54:50 +0000   KubeletHasNoDiskPressure     kubelet has no disk pressure
  PIDPressure      False   Thu, 17 Jun 2021 03:55:09 +0000   Thu, 17 Jun 2021 03:54:50 +0000   KubeletHasSufficientPID      kubelet has sufficient PID available
  Ready            False   Thu, 17 Jun 2021 03:55:09 +0000   Thu, 17 Jun 2021 03:54:50 +0000   KubeletNotReady              container runtime network not ready: NetworkReady=false reason:NetworkPluginNotReady message:docker: network plugin is not ready: cni config uninitialized
Addresses:
  InternalIP:  172.16.155.10
  Hostname:    master
Capacity:
  cpu:                2
  ephemeral-storage:  19475088Ki
  hugepages-1Gi:      0
  hugepages-2Mi:      0
  memory:             4015816Ki
  pods:               110
Allocatable:
  cpu:                2
  ephemeral-storage:  17948241072
  hugepages-1Gi:      0
  hugepages-2Mi:      0
  memory:             3913416Ki
  pods:               110
System Info:
  Machine ID:                 dc90a271f5e740f8862195956da9eefc
  System UUID:                96184D56-E479-2E14-5C46-331A8CB645BB
  Boot ID:                    55176940-dd9c-4f4e-9989-f224b4df425d
  Kernel Version:             4.15.0-144-generic
  OS Image:                   Ubuntu 18.04.5 LTS
  Operating System:           linux
  Architecture:               amd64
  Container Runtime Version:  docker://20.10.2
  Kubelet Version:            v1.21.1
  Kube-Proxy Version:         v1.21.1
Non-terminated Pods:          (5 in total)
  Namespace                   Name                              CPU Requests  CPU Limits  Memory Requests  Memory Limits  Age
  ---------                   ----                              ------------  ----------  ---------------  -------------  ---
  kube-system                 etcd-master                       100m (5%)     0 (0%)      100Mi (2%)       0 (0%)         3m57s
  kube-system                 kube-apiserver-master             250m (12%)    0 (0%)      0 (0%)           0 (0%)         4m
  kube-system                 kube-controller-manager-master    200m (10%)    0 (0%)      0 (0%)           0 (0%)         3m57s
  kube-system                 kube-proxy-wtl6h                  0 (0%)        0 (0%)      0 (0%)           0 (0%)         3m52s
  kube-system                 kube-scheduler-master             100m (5%)     0 (0%)      0 (0%)           0 (0%)         3m57s
Allocated resources:
  (Total limits may be over 100 percent, i.e., overcommitted.)
  Resource           Requests    Limits
  --------           --------    ------
  cpu                650m (32%)  0 (0%)
  memory             100Mi (2%)  0 (0%)
  ephemeral-storage  100Mi (0%)  0 (0%)
  hugepages-1Gi      0 (0%)      0 (0%)
  hugepages-2Mi      0 (0%)      0 (0%)
Events:
  Type    Reason                   Age                  From        Message
  ----    ------                   ----                 ----        -------
  Normal  NodeHasSufficientMemory  4m8s (x6 over 4m9s)  kubelet     Node master status is now: NodeHasSufficientMemory
  Normal  NodeHasNoDiskPressure    4m8s (x5 over 4m9s)  kubelet     Node master status is now: NodeHasNoDiskPressure
  Normal  NodeHasSufficientPID     4m8s (x5 over 4m9s)  kubelet     Node master status is now: NodeHasSufficientPID
  Normal  Starting                 3m57s                kubelet     Starting kubelet.
  Normal  NodeHasSufficientMemory  3m57s                kubelet     Node master status is now: NodeHasSufficientMemory
  Normal  NodeHasNoDiskPressure    3m57s                kubelet     Node master status is now: NodeHasNoDiskPressure
  Normal  NodeHasSufficientPID     3m57s                kubelet     Node master status is now: NodeHasSufficientPID
  Normal  NodeAllocatableEnforced  3m57s                kubelet     Updated Node Allocatable limit across pods
  Normal  Starting                 3m51s                kube-proxy  Starting kube-proxy.
```

### 查看系统Pod状态

`kube-system`是Kubernetes预留的**系统Pod的工作空间**（不是Linux Namespace），由于尚未部署网络插件，CoreDNS状态为**Pending**

```
# kubectl get pods -n kube-system
NAME                             READY   STATUS    RESTARTS   AGE
coredns-558bd4d5db-5fp2q         0/1     Pending   0          5m44s
coredns-558bd4d5db-kh8db         0/1     Pending   0          5m44s
etcd-master                      1/1     Running   0          5m49s
kube-apiserver-master            1/1     Running   0          5m52s
kube-controller-manager-master   1/1     Running   0          5m49s
kube-proxy-wtl6h                 1/1     Running   0          5m44s
kube-scheduler-master            1/1     Running   0          5m49s
```

### 部署网络插件（Weave）

```
# kubectl apply -f "https://cloud.weave.works/k8s/net?k8s-version=$(kubectl version | base64 | tr -d '\n')"
serviceaccount/weave-net created
clusterrole.rbac.authorization.k8s.io/weave-net created
clusterrolebinding.rbac.authorization.k8s.io/weave-net created
role.rbac.authorization.k8s.io/weave-net created
rolebinding.rbac.authorization.k8s.io/weave-net created
daemonset.apps/weave-net created
```

1. 所有系统的Pod都成功启动，weave-net-5w7j5的Pod是**容器网络**在Mster节点上的**控制组件**
2. Kubernetes支持**容器网络插件**，使用**CNI**（事实标准）的通用接口

```
# kubectl get pods -n kube-system
NAME                             READY   STATUS    RESTARTS   AGE
coredns-558bd4d5db-5fp2q         1/1     Running   0          7m41s
coredns-558bd4d5db-kh8db         1/1     Running   0          7m41s
etcd-master                      1/1     Running   0          7m46s
kube-apiserver-master            1/1     Running   0          7m49s
kube-controller-manager-master   1/1     Running   0          7m46s
kube-proxy-wtl6h                 1/1     Running   0          7m41s
kube-scheduler-master            1/1     Running   0          7m46s
weave-net-kqj8j                  2/2     Running   1          97s
```

## Worker节点加入到集群

> Worker

1. Worker节点与Master节点都运行着kubelet组件
2. 在kubelet启动后，**Master**节点还会**自动运行Pod**（kube-apiserver、kube-scheduler、kube-controller-manger）

### kubeadm join

```
# kubeadm join 172.16.155.10:6443 --token p9njhv.n8ucpc2rkpis7kxu --discovery-token-ca-cert-hash sha256:f711d139e579ee3fbf2294ccd02dc1727261705b8a6c0e5eb681766dd32266bc
[preflight] Running pre-flight checks
	[WARNING IsDockerSystemdCheck]: detected "cgroupfs" as the Docker cgroup driver. The recommended driver is "systemd". Please follow the guide at https://kubernetes.io/docs/setup/cri/
[preflight] Reading configuration from the cluster...
[preflight] FYI: You can look at this config file with 'kubectl -n kube-system get cm kubeadm-config -o yaml'
[kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
[kubelet-start] Writing kubelet environment file with flags to file "/var/lib/kubelet/kubeadm-flags.env"
[kubelet-start] Starting the kubelet
[kubelet-start] Waiting for the kubelet to perform the TLS Bootstrap...

This node has joined the cluster:
* Certificate signing request was sent to apiserver and a response was received.
* The Kubelet was informed of the new secure connection details.

Run 'kubectl get nodes' on the control-plane to see this node join the cluster.
```

#### /var/lib/kubelet/config.yaml
kind: **KubeletConfiguration**
```
# cat /var/lib/kubelet/config.yaml
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
cgroupDriver: cgroupfs
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

Worker与Master上的`/etc/kubernetes/pki/ca.crt`完全一致
```
root@master:~# md5sum /etc/kubernetes/pki/ca.crt
635804b8f65abe2177ca50dfbf6599e2  /etc/kubernetes/pki/ca.crt

root@worker-1:~# md5sum /etc/kubernetes/pki/ca.crt
635804b8f65abe2177ca50dfbf6599e2  /etc/kubernetes/pki/ca.crt

root@worker-2:~# md5sum /etc/kubernetes/pki/ca.crt
635804b8f65abe2177ca50dfbf6599e2  /etc/kubernetes/pki/ca.crt
```

Worker节点没有需要启动的Static Pod
```
root@master:~# ls /etc/kubernetes/manifests
etcd.yaml  kube-apiserver.yaml  kube-controller-manager.yaml  kube-scheduler.yaml

root@worker-1:~# ls /etc/kubernetes/manifests | wc -l
0

root@worker-2:~# ls /etc/kubernetes/manifests | wc -l
0
```

### 在Master上查看节点状态

```
root@master:~# kubectl get nodes
NAME       STATUS   ROLES                  AGE     VERSION
master     Ready    control-plane,master   27m     v1.21.1
worker-1   Ready    <none>                 3m55s   v1.21.1
worker-2   Ready    <none>                 88s     v1.21.1
```

## Taint/Toleration

> 默认情况下，Master节点是不允许运行用户Pod的，通过**Taint/Toleration**可以调整Master执行Pod的策略
> 某个**节点**被加上了一个**Taint**，那么所有Pod就不能在该节点上运行，除非个别**Pod**声明自己能容忍（**Toleration**）这个Taint
> 概括：**节点声明Taint，Pod容忍（Toleration）Taint**，其实就是一个『**软路由/匹配**』的过程

为节点打上Taint（NoSchedule只会在**调度新Pod**时产生作用，不会影响已经在node1上运行的Pod）

```
$ kubectl taint nodes node1 foo=bar:NoSchedule
```

在Pod的.yaml文件的spec部分，加入tolerations

```yaml
apiVersion: v1
kind: Pod
...
spec:
  tolerations:
  - key: "foo"
    operator: "Equal"
    value: "bar"
    effect: "NoSchedule"
```

查看Master节点的Taint字段（Key为node-role.kubernetes.io/master，没有Value，Effect为NoSchedule，Equal -> Exists）

```
# kubectl describe node master | grep Taints
Taints:             node-role.kubernetes.io/master:NoSchedule
```

该Pod能容忍所有以`node-role.kubernetes.io/master`为键的Taint，因此该Pod可以运行在Master节点上

```
apiVersion: v1
kind: Pod
...
spec:
  tolerations:
  - key: "node-role.kubernetes.io/master"
    operator: "Exists"
    effect: "NoSchedule"
```

如果需要单节点的Kubernetes，**删除Taint**才是正确的选择，移除所有以`node-role.kubernetes.io/master`为键的Taint

```
$ kubectl taint nodes --all node-role.kubernetes.io/master-
```

## 容器持久化存储

1. 通过**Volume**可以把宿主机上的目录或者文件挂载进容器的Mount Namespace中，从而达到容器和宿主机共享这些目录的目的
2. 容器特征：**无状态**
   - 在机器A上启动一个容器，是无法看到机器B上的容器在它们的数据卷写入的文件
3. 容器持久化存储
   - 存储插件会在容器里挂载一个基于网络或者其它机制的**远程数据卷**
   - 在容器里面创建的文件，保存在**远程存储服务器**上，或者以**分布式**的方式保存在**多个节点**上，**与宿主机没有绑定关系**

### Rook

1. Rook是基于**Ceph**的Kubernetes存储插件
2. Rook支持**水平扩展**、**迁移**、**灾难备份**、**监控**等大量的**企业级功能**，是一个完整的、**生产级可用**的容器存储插件
3. **Rook巧妙地依赖了Kubernetes提供的编排能力**，合理使用了Operator、CRD等重要扩展特性
4. Rook是目前社区中基于Kubernetes构建的**最完善最成熟**的容器存储插件

```
# kubectl taint nodes --all node-role.kubernetes.io/master-
node/master untainted
taint "node-role.kubernetes.io/master" not found
taint "node-role.kubernetes.io/master" not found
```

```
# kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/cluster/examples/kubernetes/ceph/common.yaml
namespace/rook-ceph created
clusterrolebinding.rbac.authorization.k8s.io/rook-ceph-object-bucket created
serviceaccount/rook-ceph-admission-controller created
clusterrole.rbac.authorization.k8s.io/rook-ceph-admission-controller-role created
clusterrolebinding.rbac.authorization.k8s.io/rook-ceph-admission-controller-rolebinding created
clusterrole.rbac.authorization.k8s.io/rook-ceph-cluster-mgmt created
role.rbac.authorization.k8s.io/rook-ceph-system created
clusterrole.rbac.authorization.k8s.io/rook-ceph-global created
clusterrole.rbac.authorization.k8s.io/rook-ceph-mgr-cluster created
clusterrole.rbac.authorization.k8s.io/rook-ceph-object-bucket created
serviceaccount/rook-ceph-system created
rolebinding.rbac.authorization.k8s.io/rook-ceph-system created
clusterrolebinding.rbac.authorization.k8s.io/rook-ceph-global created
serviceaccount/rook-ceph-osd created
serviceaccount/rook-ceph-mgr created
serviceaccount/rook-ceph-cmd-reporter created
role.rbac.authorization.k8s.io/rook-ceph-osd created
clusterrole.rbac.authorization.k8s.io/rook-ceph-osd created
clusterrole.rbac.authorization.k8s.io/rook-ceph-mgr-system created
role.rbac.authorization.k8s.io/rook-ceph-mgr created
role.rbac.authorization.k8s.io/rook-ceph-cmd-reporter created
rolebinding.rbac.authorization.k8s.io/rook-ceph-cluster-mgmt created
rolebinding.rbac.authorization.k8s.io/rook-ceph-osd created
rolebinding.rbac.authorization.k8s.io/rook-ceph-mgr created
rolebinding.rbac.authorization.k8s.io/rook-ceph-mgr-system created
clusterrolebinding.rbac.authorization.k8s.io/rook-ceph-mgr-cluster created
clusterrolebinding.rbac.authorization.k8s.io/rook-ceph-osd created
rolebinding.rbac.authorization.k8s.io/rook-ceph-cmd-reporter created
Warning: policy/v1beta1 PodSecurityPolicy is deprecated in v1.21+, unavailable in v1.25+
podsecuritypolicy.policy/00-rook-privileged created
clusterrole.rbac.authorization.k8s.io/psp:rook created
clusterrolebinding.rbac.authorization.k8s.io/rook-ceph-system-psp created
rolebinding.rbac.authorization.k8s.io/rook-ceph-default-psp created
rolebinding.rbac.authorization.k8s.io/rook-ceph-osd-psp created
rolebinding.rbac.authorization.k8s.io/rook-ceph-mgr-psp created
rolebinding.rbac.authorization.k8s.io/rook-ceph-cmd-reporter-psp created
serviceaccount/rook-csi-cephfs-plugin-sa created
serviceaccount/rook-csi-cephfs-provisioner-sa created
role.rbac.authorization.k8s.io/cephfs-external-provisioner-cfg created
rolebinding.rbac.authorization.k8s.io/cephfs-csi-provisioner-role-cfg created
clusterrole.rbac.authorization.k8s.io/cephfs-csi-nodeplugin created
clusterrole.rbac.authorization.k8s.io/cephfs-external-provisioner-runner created
clusterrolebinding.rbac.authorization.k8s.io/rook-csi-cephfs-plugin-sa-psp created
clusterrolebinding.rbac.authorization.k8s.io/rook-csi-cephfs-provisioner-sa-psp created
clusterrolebinding.rbac.authorization.k8s.io/cephfs-csi-nodeplugin created
clusterrolebinding.rbac.authorization.k8s.io/cephfs-csi-provisioner-role created
serviceaccount/rook-csi-rbd-plugin-sa created
serviceaccount/rook-csi-rbd-provisioner-sa created
role.rbac.authorization.k8s.io/rbd-external-provisioner-cfg created
rolebinding.rbac.authorization.k8s.io/rbd-csi-provisioner-role-cfg created
clusterrole.rbac.authorization.k8s.io/rbd-csi-nodeplugin created
clusterrole.rbac.authorization.k8s.io/rbd-external-provisioner-runner created
clusterrolebinding.rbac.authorization.k8s.io/rook-csi-rbd-plugin-sa-psp created
clusterrolebinding.rbac.authorization.k8s.io/rook-csi-rbd-provisioner-sa-psp created
clusterrolebinding.rbac.authorization.k8s.io/rbd-csi-nodeplugin created
clusterrolebinding.rbac.authorization.k8s.io/rbd-csi-provisioner-role created
```

```
# kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/cluster/examples/kubernetes/ceph/operator.yaml
configmap/rook-ceph-operator-config created
deployment.apps/rook-ceph-operator created
```

```
# kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/cluster/examples/kubernetes/ceph/crds.yaml
customresourcedefinition.apiextensions.k8s.io/cephblockpools.ceph.rook.io created
customresourcedefinition.apiextensions.k8s.io/cephclients.ceph.rook.io created
customresourcedefinition.apiextensions.k8s.io/cephclusters.ceph.rook.io created
customresourcedefinition.apiextensions.k8s.io/cephfilesystemmirrors.ceph.rook.io created
customresourcedefinition.apiextensions.k8s.io/cephfilesystems.ceph.rook.io created
customresourcedefinition.apiextensions.k8s.io/cephnfses.ceph.rook.io created
customresourcedefinition.apiextensions.k8s.io/cephobjectrealms.ceph.rook.io created
customresourcedefinition.apiextensions.k8s.io/cephobjectstores.ceph.rook.io created
customresourcedefinition.apiextensions.k8s.io/cephobjectstoreusers.ceph.rook.io created
customresourcedefinition.apiextensions.k8s.io/cephobjectzonegroups.ceph.rook.io created
customresourcedefinition.apiextensions.k8s.io/cephobjectzones.ceph.rook.io created
customresourcedefinition.apiextensions.k8s.io/cephrbdmirrors.ceph.rook.io created
customresourcedefinition.apiextensions.k8s.io/objectbucketclaims.objectbucket.io created
customresourcedefinition.apiextensions.k8s.io/objectbuckets.objectbucket.io created
customresourcedefinition.apiextensions.k8s.io/volumereplicationclasses.replication.storage.openshift.io created
customresourcedefinition.apiextensions.k8s.io/volumereplications.replication.storage.openshift.io created
customresourcedefinition.apiextensions.k8s.io/volumes.rook.io created
```

```
# kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/cluster/examples/kubernetes/ceph/cluster.yaml
cephcluster.ceph.rook.io/rook-ceph created
```

```
# kubectl get pods --all-namespaces
NAMESPACE     NAME                                                READY   STATUS      RESTARTS   AGE
kube-system   coredns-558bd4d5db-5fp2q                            1/1     Running     0          71m
kube-system   coredns-558bd4d5db-kh8db                            1/1     Running     0          71m
kube-system   etcd-master                                         1/1     Running     0          71m
kube-system   kube-apiserver-master                               1/1     Running     0          71m
kube-system   kube-controller-manager-master                      1/1     Running     0          71m
kube-system   kube-proxy-5f2nh                                    1/1     Running     0          47m
kube-system   kube-proxy-jmc66                                    1/1     Running     0          44m
kube-system   kube-proxy-wtl6h                                    1/1     Running     0          71m
kube-system   kube-scheduler-master                               1/1     Running     0          71m
kube-system   weave-net-7v66z                                     2/2     Running     1          44m
kube-system   weave-net-gqm8l                                     2/2     Running     1          47m
kube-system   weave-net-kqj8j                                     2/2     Running     1          65m
rook-ceph     csi-cephfsplugin-6wjpz                              3/3     Running     0          34m
rook-ceph     csi-cephfsplugin-8fz2q                              3/3     Running     0          11m
rook-ceph     csi-cephfsplugin-dr479                              3/3     Running     0          34m
rook-ceph     csi-cephfsplugin-provisioner-775dcbbc86-bb7r7       6/6     Running     0          34m
rook-ceph     csi-cephfsplugin-provisioner-775dcbbc86-stx6j       6/6     Running     0          34m
rook-ceph     csi-rbdplugin-f4vh2                                 3/3     Running     0          35m
rook-ceph     csi-rbdplugin-provisioner-5868bd8b55-krt57          6/6     Running     0          34m
rook-ceph     csi-rbdplugin-provisioner-5868bd8b55-mpjzg          6/6     Running     0          34m
rook-ceph     csi-rbdplugin-t76w7                                 3/3     Running     0          35m
rook-ceph     csi-rbdplugin-xpmb2                                 3/3     Running     0          11m
rook-ceph     rook-ceph-crashcollector-master-7c7c6b974-xc2dq     1/1     Running     0          7m57s
rook-ceph     rook-ceph-crashcollector-worker-1-7f7dbb4cd-fcqk4   1/1     Running     0          7m50s
rook-ceph     rook-ceph-crashcollector-worker-2-f594fb54f-gnrwk   1/1     Running     0          7m50s
rook-ceph     rook-ceph-mgr-a-bcd4d588-tt4g9                      1/1     Running     0          7m57s
rook-ceph     rook-ceph-mon-a-7598d86b7d-f8qsf                    1/1     Running     0          11m
rook-ceph     rook-ceph-mon-b-6f9dd5f6cc-v2v4c                    1/1     Running     0          11m
rook-ceph     rook-ceph-mon-c-b9b76dbc5-2gkhc                     1/1     Running     0          10m
rook-ceph     rook-ceph-operator-75c6d6bbfc-pm6gh                 1/1     Running     0          39m
rook-ceph     rook-ceph-osd-prepare-master-h2svr                  0/1     Completed   0          2m38s
rook-ceph     rook-ceph-osd-prepare-worker-1-ncgdk                0/1     Completed   0          2m36s
rook-ceph     rook-ceph-osd-prepare-worker-2-6tf6p                0/1     Completed   0          2m34s
```

# 容器化

## 基本概念

1. Kubernetes不推荐使用**命令行**的方式直接运行容器，而是推荐使用**YAML**文件的格式
   - **版本化**管理YAML文件，降低开发人员和运维人员的**沟通成本**
   - **声明式API**（kubectl apply YAML），后期尽量不再使用Docker命令
1. 保证开发与部署环境的**一致性**
   - **应用本身 ==> 容器镜像**
   - **部署参数 ==> YAML文件**
2. 一个**YAML文件**，对应到Kubernetes中的一个**API Object**
3. **Pod**：Kubernetes中的应用，**一个应用**，可以由**多个容器**组成
4. **Deployment**：定义**多副本Pod**的对象，当Pod**定义**发生变化时，对每个副本进行**滚动更新**
5. **控制器模式**：使用一种API Object（Deployment）**管理**另一种API Object（Pod）
6. **Metadata**：元数据，从Kubernetes里找到该对象的主要依据，最主要用到的字段为**Labels**（KV格式）
7. API Object的定义：**Metadata**（元数据，格式基本一致） + **Spec**（描述表达的功能）

## nginx-deployment.yaml

1. Labels：Deployment把正在运行的，携带`app: nginx`标签的Pod识别为**被管理对象**，并确保这些Pod的总数严格等于4
   - Label Selector ==> `spec.selector.matchLabels`
2. Annotations
   - 与Labels的格式和层级完全相同
   - **内部信息**：Kubernetes组件本身对这些信息感兴趣，大多数Annotations是在**Kubernetes运行时自动加到API Object**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 4
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

## 应用YAML文件

```
# kubectl apply -f nginx-deployment.yaml
deployment.apps/nginx-deployment created
```

## 查看Deployment

```
# kubectl get deployments
NAME               READY   UP-TO-DATE   AVAILABLE   AGE
nginx-deployment   4/4     4            4           46s
```

## 查看Pod列表

```
# kubectl get pods
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-746fbb99df-5gpv6   1/1     Running   0          51s
nginx-deployment-746fbb99df-8vwkf   1/1     Running   0          51s
nginx-deployment-746fbb99df-jcp6c   1/1     Running   0          51s
nginx-deployment-746fbb99df-x7zc4   1/1     Running   0          51s

# kubectl get pods -l app=nginx
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-746fbb99df-5gpv6   1/1     Running   0          74s
nginx-deployment-746fbb99df-8vwkf   1/1     Running   0          74s
nginx-deployment-746fbb99df-jcp6c   1/1     Running   0          74s
nginx-deployment-746fbb99df-x7zc4   1/1     Running   0          74s
```

## 查看Pod详情

1. Namespace:    default
2. Node:         worker-1/172.16.155.11
3. Controlled By:  ReplicaSet/nginx-deployment-746fbb99df
4. Container ID:   docker://e12fcf41371e1332c7baddf89f68eae627b033c4f61d2472b1c0897fe4f0557e

```
# kubectl describe pod nginx-deployment-746fbb99df-5gpv6
Name:         nginx-deployment-746fbb99df-5gpv6
Namespace:    default
Priority:     0
Node:         worker-1/172.16.155.11
Start Time:   Thu, 17 Jun 2021 06:08:30 +0000
Labels:       app=nginx
              pod-template-hash=746fbb99df
Annotations:  <none>
Status:       Running
IP:           10.44.0.5
IPs:
  IP:           10.44.0.5
Controlled By:  ReplicaSet/nginx-deployment-746fbb99df
Containers:
  nginx:
    Container ID:   docker://e12fcf41371e1332c7baddf89f68eae627b033c4f61d2472b1c0897fe4f0557e
    Image:          nginx:1.7.9
    Image ID:       docker-pullable://nginx@sha256:e3456c851a152494c3e4ff5fcc26f240206abac0c9d794affb40e0714846c451
    Port:           <none>
    Host Port:      <none>
    State:          Running
      Started:      Thu, 17 Jun 2021 06:08:58 +0000
    Ready:          True
    Restart Count:  0
    Environment:    <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-qfc55 (ro)
Conditions:
  Type              Status
  Initialized       True
  Ready             True
  ContainersReady   True
  PodScheduled      True
Volumes:
  kube-api-access-qfc55:
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
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  115s  default-scheduler  Successfully assigned default/nginx-deployment-746fbb99df-5gpv6 to worker-1
  Normal  Pulling    113s  kubelet            Pulling image "nginx:1.7.9"
  Normal  Pulled     88s   kubelet            Successfully pulled image "nginx:1.7.9" in 24.967209413s
  Normal  Created    87s   kubelet            Created container nginx
  Normal  Started    87s   kubelet            Started container nginx
```

## 查看worker-1上的运行中Docker容器

```
root@worker-1:~# docker ps | grep nginx
e12fcf41371e   nginx                                              "nginx -g 'daemon of…"   3 minutes ago       Up 3 minutes                 k8s_nginx_nginx-deployment-746fbb99df-5gpv6_default_ddd40c6d-3ac0-41ea-95df-59cc70d47b20_0
6f476f443421   k8s.gcr.io/pause:3.4.1                             "/pause"                 3 minutes ago       Up 3 minutes                 k8s_POD_nginx-deployment-746fbb99df-5gpv6_default_ddd40c6d-3ac0-41ea-95df-59cc70d47b20_0
```

## 升级Nginx

Nginx：1.7.9 -> 1.8

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 4
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
          image: 'nginx:1.8'
```

滚动更新

```
# kubectl apply -f nginx-deployment.yaml
deployment.apps/nginx-deployment configured

# kubectl get pods
NAME                                READY   STATUS              RESTARTS   AGE
nginx-deployment-746fbb99df-5gpv6   1/1     Running             0          4m33s
nginx-deployment-746fbb99df-8vwkf   1/1     Running             0          4m33s
nginx-deployment-746fbb99df-x7zc4   1/1     Running             0          4m33s
nginx-deployment-7cd7fc4dbf-fzlkp   0/1     ContainerCreating   0          4s
nginx-deployment-7cd7fc4dbf-tjmbg   0/1     ContainerCreating   0          4s

# kubectl get pods
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-7cd7fc4dbf-fzlkp   1/1     Running   0          91s
nginx-deployment-7cd7fc4dbf-stdbk   1/1     Running   0          57s
nginx-deployment-7cd7fc4dbf-tjmbg   1/1     Running   0          91s
nginx-deployment-7cd7fc4dbf-tnx8g   1/1     Running   0          54s
```

## Volume

> 在Kubernetes中，Volume是属于Pod对象的一部分

1. `emptyDir`等同于Docker的**隐式Volume参数**
2. Kubernetes会**主动**在宿主机上创建一个**临时目录**，然后这个目录将来会被**`bind mount`**到容器所声明的Volume目录上
   - 原因：Kubernetes**不想依赖**Docker创建的那个_data目录
3. Kubernetes也支持**显式**的Volume定义，即**hostPath**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 4
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
          image: 'nginx:1.8'
          volumeMounts:
            - mountPath: /usr/share/nginx/html
              name: nginx-vol
      volumes:
        - name: nginx-vol
          emptyDir: {}
```

```yaml
...
      volumes:
        - name: nginx-vol
          hostPath:
            path: /var/data
```

```
# kubectl apply -f nginx-deployment.yaml
deployment.apps/nginx-deployment configured

# kubectl get pods
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-75f76dcfd9-2zddq   1/1     Running   0          36s
nginx-deployment-75f76dcfd9-hqtf8   1/1     Running   0          34s
nginx-deployment-75f76dcfd9-np5m7   1/1     Running   0          34s
nginx-deployment-75f76dcfd9-vnth7   1/1     Running   0          37s
```

Type:       EmptyDir (**a temporary directory that shares a pod's lifetime**)

```
# kubectl describe pod nginx-deployment-75f76dcfd9-2zddq
Name:         nginx-deployment-75f76dcfd9-2zddq
Namespace:    default
Priority:     0
Node:         master/172.16.155.10
Start Time:   Thu, 17 Jun 2021 06:16:16 +0000
Labels:       app=nginx
              pod-template-hash=75f76dcfd9
Annotations:  <none>
Status:       Running
IP:           10.32.0.9
IPs:
  IP:           10.32.0.9
Controlled By:  ReplicaSet/nginx-deployment-75f76dcfd9
Containers:
  nginx:
    Container ID:   docker://3e0d33d9be2be59e604e57746076ad4a5714a4addcd6e5380ecc1f9a6cb32980
    Image:          nginx:1.8
    Image ID:       docker-pullable://nginx@sha256:c97ee70c4048fe79765f7c2ec0931957c2898f47400128f4f3640d0ae5d60d10
    Port:           <none>
    Host Port:      <none>
    State:          Running
      Started:      Thu, 17 Jun 2021 06:16:18 +0000
    Ready:          True
    Restart Count:  0
    Environment:    <none>
    Mounts:
      /usr/share/nginx/html from nginx-vol (rw)
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-r4b4k (ro)
Conditions:
  Type              Status
  Initialized       True
  Ready             True
  ContainersReady   True
  PodScheduled      True
Volumes:
  nginx-vol:
    Type:       EmptyDir (a temporary directory that shares a pod's lifetime)
    Medium:
    SizeLimit:  <unset>
  kube-api-access-r4b4k:
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
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  73s   default-scheduler  Successfully assigned default/nginx-deployment-75f76dcfd9-2zddq to master
  Normal  Pulled     72s   kubelet            Container image "nginx:1.8" already present on machine
  Normal  Created    72s   kubelet            Created container nginx
  Normal  Started    71s   kubelet            Started container nginx
```

## kubectl exec

```
# kubectl exec -it nginx-deployment-75f76dcfd9-2zddq -- /bin/bash
root@nginx-deployment-75f76dcfd9-2zddq:/# ls /usr/share/nginx/html | wc -l
0
```

## nginx-service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
  labels:
    app: nginx
spec:
  selector:
    app: nginx
  ports:
    - name: nginx-port
      protocol: TCP
      port: 80
      nodePort: 32600
      targetPort: 80
  type: NodePort
```

```
# kubectl apply -f nginx-service.yaml
service/nginx-service created

# kubectl get services -o wide
NAME            TYPE        CLUSTER-IP    EXTERNAL-IP   PORT(S)        AGE    SELECTOR
kubernetes      ClusterIP   10.96.0.1     <none>        443/TCP        145m   <none>
nginx-service   NodePort    10.109.88.7   <none>        80:32600/TCP   13s    app=nginx
```

```
# curl http://10.109.88.7
<html>
<head><title>403 Forbidden</title></head>
<body bgcolor="white">
<center><h1>403 Forbidden</h1></center>
<hr><center>nginx/1.8.1</center>
</body>
</html>
```

```
# curl http://172.16.155.10:32600
<html>
<head><title>403 Forbidden</title></head>
<body bgcolor="white">
<center><h1>403 Forbidden</h1></center>
<hr><center>nginx/1.8.1</center>
</body>
</html>

# curl http://172.16.155.11:32600
<html>
<head><title>403 Forbidden</title></head>
<body bgcolor="white">
<center><h1>403 Forbidden</h1></center>
<hr><center>nginx/1.8.1</center>
</body>
</html>

# curl http://172.16.155.12:32600
<html>
<head><title>403 Forbidden</title></head>
<body bgcolor="white">
<center><h1>403 Forbidden</h1></center>
<hr><center>nginx/1.8.1</center>
</body>
</html>
```

## kubectl delete

```
# kubectl get pods
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-75f76dcfd9-2zddq   1/1     Running   0          5m45s
nginx-deployment-75f76dcfd9-hqtf8   1/1     Running   0          5m43s
nginx-deployment-75f76dcfd9-np5m7   1/1     Running   0          5m43s
nginx-deployment-75f76dcfd9-vnth7   1/1     Running   0          5m46s

# kubectl get deployments
NAME               READY   UP-TO-DATE   AVAILABLE   AGE
nginx-deployment   4/4     4            4           13m

# kubectl get services -o wide
NAME            TYPE        CLUSTER-IP    EXTERNAL-IP   PORT(S)        AGE     SELECTOR
kubernetes      ClusterIP   10.96.0.1     <none>        443/TCP        147m    <none>
nginx-service   NodePort    10.109.88.7   <none>        80:32600/TCP   2m16s   app=nginx
```

```
# kubectl delete -f nginx-service.yaml
service "nginx-service" deleted

# kubectl delete -f nginx-deployment.yaml
deployment.apps "nginx-deployment" deleted
```

```
# kubectl get pods
No resources found in default namespace.

# kubectl get deployments
No resources found in default namespace.

# kubectl get services -o wide
NAME         TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE    SELECTOR
kubernetes   ClusterIP   10.96.0.1    <none>        443/TCP   148m   <none>
```

# 参考资料

1. [深入剖析Kubernetes](https://time.geekbang.org/column/intro/100015201)
2. [Kubernetes实践一（安装篇）](https://www.jianshu.com/p/a73c33283de8)
3. [Integrating Kubernetes via the Addon](https://www.weave.works/docs/net/latest/kubernetes/kube-addon/)
4. [Ubuntu 18.04 下关闭 swap 的操作](https://liangxinhui.tech/2020/04/16/ubuntu-swap-config/)

