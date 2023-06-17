---
title: Kubernetes - Kubeadm
mathjax: false
date: 2022-10-24 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/7f93bb49-1080x675.jpg
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Kubernetes
---

# 架构

![image-20230617102945905](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230617102945905.png)

<!-- more -->

# 准备

> 修改主机名，Kubernetes 使用`主机名`来区分集群中的节点，`不能重名`

|        | hostname   | ip              |
| ------ | ---------- | --------------- |
| master | mac-master | 192.168.191.144 |
| worker | mac-worker | 192.168.191.146 |

```
$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: ens160: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 00:0c:29:7d:be:74 brd ff:ff:ff:ff:ff:ff
    altname enp2s0
    inet 192.168.191.144/24 metric 100 brd 192.168.191.255 scope global dynamic ens160
       valid_lft 1078sec preferred_lft 1078sec
    inet6 fe80::20c:29ff:fe7d:be74/64 scope link
       valid_lft forever preferred_lft forever
3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default
    link/ether 02:42:ad:af:55:35 brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
       valid_lft forever preferred_lft forever

$ hostname
mac-master
```

```
$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: ens160: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 00:0c:29:45:49:19 brd ff:ff:ff:ff:ff:ff
    altname enp2s0
    inet 192.168.191.146/24 metric 100 brd 192.168.191.255 scope global dynamic ens160
       valid_lft 1052sec preferred_lft 1052sec
    inet6 fe80::20c:29ff:fe45:4919/64 scope link
       valid_lft forever preferred_lft forever
3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default
    link/ether 02:42:32:30:e1:cd brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
       valid_lft forever preferred_lft forever
       
$ hostname
mac-worker
```

> 采用 `Docker` 作为 `CRI`， 并修改 Docker 的 `Cgroup Driver` 为 `systemd`，并重启 Docker 守护进程

```
$ cat <<EOF | sudo tee /etc/docker/daemon.json
{
  "exec-opts": ["native.cgroupdriver=systemd"],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m"
  },
  "storage-driver": "overlay2"
}
EOF

$ sudo systemctl enable docker
$ sudo systemctl daemon-reload
$ sudo systemctl restart docker
```

```
$ docker version
Client: Docker Engine - Community
 Version:           20.10.24
 API version:       1.41
 Go version:        go1.19.7
 Git commit:        297e128
 Built:             Tue Apr  4 18:28:36 2023
 OS/Arch:           linux/arm64
 Context:           default
 Experimental:      true

Server: Docker Engine - Community
 Engine:
  Version:          20.10.24
  API version:      1.41 (minimum version 1.12)
  Go version:       go1.19.7
  Git commit:       5d6db84
  Built:            Tue Apr  4 18:26:56 2023
  OS/Arch:          linux/arm64
  Experimental:     false
 containerd:
  Version:          1.6.21
  GitCommit:        3dce8eb055cbb6872793272b4f20ed16117344f8
 runc:
  Version:          1.1.7
  GitCommit:        v1.1.7-0-g860f061
 docker-init:
  Version:          0.19.0
  GitCommit:        de40ad0
```

> 修改 `iptables` 配置，启动 `br_netfilter` 模块，让 `Kubernetes` 能够`检查和转发网络流量`

```
$ cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
br_netfilter
EOF

$ cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.ip_forward=1 # better than modify /etc/sysctl.conf
EOF

$ sudo sysctl --system
...
* Applying /etc/sysctl.d/k8s.conf ...
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.ip_forward = 1 # better than modify /etc/sysctl.conf
* Applying /etc/sysctl.conf ...
...
```

> 修改 `/etc/fstab`，关闭 `swap` 分区，提升 Kubernetes `性能`

```
$ sudo swapoff -a
$ sudo sed -ri '/\sswap\s/s/^#?/#/' /etc/fstab
```

> 重启系统

# Kubeadm

> 使用阿里云的源

```
$ sudo apt install -y apt-transport-https ca-certificates curl

$ curl https://mirrors.aliyun.com/kubernetes/apt/doc/apt-key.gpg | sudo apt-key add -

$ cat <<EOF | sudo tee /etc/apt/sources.list.d/kubernetes.list
deb https://mirrors.aliyun.com/kubernetes/apt/ kubernetes-xenial main
EOF

$ sudo apt update
```

> 安装 `kubeadm`、`kubelet` 和 `kubectl`

```
$ sudo apt install -y kubeadm=1.23.3-00 kubelet=1.23.3-00 kubectl=1.23.3-00

$ kubeadm version
kubeadm version: &version.Info{Major:"1", Minor:"23", GitVersion:"v1.23.3", GitCommit:"816c97ab8cff8a1c72eccca1026f7820e93e0d25", GitTreeState:"clean", BuildDate:"2022-01-25T21:24:08Z", GoVersion:"go1.17.6", Compiler:"gc", Platform:"linux/arm64"}

$ kubectl version --client
Client Version: version.Info{Major:"1", Minor:"23", GitVersion:"v1.23.3", GitCommit:"816c97ab8cff8a1c72eccca1026f7820e93e0d25", GitTreeState:"clean", BuildDate:"2022-01-25T21:25:17Z", GoVersion:"go1.17.6", Compiler:"gc", Platform:"linux/arm64"}

$ sudo apt-mark hold kubeadm kubelet kubectl
```

# 镜像

```
$ kubeadm config images list --kubernetes-version v1.23.3
k8s.gcr.io/kube-apiserver:v1.23.3
k8s.gcr.io/kube-controller-manager:v1.23.3
k8s.gcr.io/kube-scheduler:v1.23.3
k8s.gcr.io/kube-proxy:v1.23.3
k8s.gcr.io/pause:3.6
k8s.gcr.io/etcd:3.5.1-0
k8s.gcr.io/coredns/coredns:v1.8.6

$ dils
REPOSITORY                           TAG       IMAGE ID       CREATED         SIZE
k8s.gcr.io/kube-apiserver            v1.23.3   8e7422f73cf3   16 months ago   132MB
k8s.gcr.io/kube-controller-manager   v1.23.3   3e63a2140741   16 months ago   122MB
k8s.gcr.io/kube-proxy                v1.23.3   d36a89daa194   16 months ago   109MB
k8s.gcr.io/kube-scheduler            v1.23.3   4bad79a8953b   16 months ago   53MB
k8s.gcr.io/etcd                      3.5.1-0   1040f7790951   19 months ago   132MB
k8s.gcr.io/coredns/coredns           v1.8.6    edaa71f2aee8   20 months ago   46.8MB
k8s.gcr.io/pause                     3.6       7d46a07936af   22 months ago   484kB
```

# Master

| 参数                            | 描述                                                         |
| ------------------------------- | ------------------------------------------------------------ |
| `--pod-network-cidr`            | Specify range of IP addresses for the pod network. <br />If set, the control plane will automatically allocate CIDRs for every node. |
| `--apiserver-advertise-address` | The IP address the API Server will advertise it's listening on. <br />If not set the default network interface will be used. |
| `--kubernetes-version`          | Choose a specific Kubernetes version for the control plane. (default "stable-1") |

```
$ sudo kubeadm init \
    --pod-network-cidr=10.10.0.0/16 \
    --apiserver-advertise-address=192.168.191.144 \
    --kubernetes-version=v1.23.3
[init] Using Kubernetes version: v1.23.3
[preflight] Running pre-flight checks
[preflight] Pulling images required for setting up a Kubernetes cluster
[preflight] This might take a minute or two, depending on the speed of your internet connection
[preflight] You can also perform this action in beforehand using 'kubeadm config images pull'
[certs] Using certificateDir folder "/etc/kubernetes/pki"
[certs] Generating "ca" certificate and key
[certs] Generating "apiserver" certificate and key
[certs] apiserver serving cert is signed for DNS names [kubernetes kubernetes.default kubernetes.default.svc kubernetes.default.svc.cluster.local mac-master] and IPs [10.96.0.1 192.168.191.144]
[certs] Generating "apiserver-kubelet-client" certificate and key
[certs] Generating "front-proxy-ca" certificate and key
[certs] Generating "front-proxy-client" certificate and key
[certs] Generating "etcd/ca" certificate and key
[certs] Generating "etcd/server" certificate and key
[certs] etcd/server serving cert is signed for DNS names [localhost mac-master] and IPs [192.168.191.144 127.0.0.1 ::1]
[certs] Generating "etcd/peer" certificate and key
[certs] etcd/peer serving cert is signed for DNS names [localhost mac-master] and IPs [192.168.191.144 127.0.0.1 ::1]
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
[apiclient] All control plane components are healthy after 4.003370 seconds
[upload-config] Storing the configuration used in ConfigMap "kubeadm-config" in the "kube-system" Namespace
[kubelet] Creating a ConfigMap "kubelet-config-1.23" in namespace kube-system with the configuration for the kubelets in the cluster
NOTE: The "kubelet-config-1.23" naming of the kubelet ConfigMap is deprecated. Once the UnversionedKubeletConfigMap feature gate graduates to Beta the default name will become just "kubelet-config". Kubeadm upgrade will handle this transition transparently.
[upload-certs] Skipping phase. Please see --upload-certs
[mark-control-plane] Marking the node mac-master as control-plane by adding the labels: [node-role.kubernetes.io/master(deprecated) node-role.kubernetes.io/control-plane node.kubernetes.io/exclude-from-external-load-balancers]
[mark-control-plane] Marking the node mac-master as control-plane by adding the taints [node-role.kubernetes.io/master:NoSchedule]
[bootstrap-token] Using token: nawjbe.tn41eyo5t8gloqgw
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

kubeadm join 192.168.191.144:6443 --token nawjbe.tn41eyo5t8gloqgw \
	--discovery-token-ca-cert-hash sha256:bb3dd37a78ac4c06c43fb38a03a897903ba803c7d211dc465d61bebd9c716411
```

> 由于目前`缺少网络插件`，集群的`内部网络`尚未正常工作，所以 `Master` 节点处于 `NotReady` 状态

```
$ k version
Client Version: version.Info{Major:"1", Minor:"23", GitVersion:"v1.23.3", GitCommit:"816c97ab8cff8a1c72eccca1026f7820e93e0d25", GitTreeState:"clean", BuildDate:"2022-01-25T21:25:17Z", GoVersion:"go1.17.6", Compiler:"gc", Platform:"linux/arm64"}
Server Version: version.Info{Major:"1", Minor:"23", GitVersion:"v1.23.3", GitCommit:"816c97ab8cff8a1c72eccca1026f7820e93e0d25", GitTreeState:"clean", BuildDate:"2022-01-25T21:19:12Z", GoVersion:"go1.17.6", Compiler:"gc", Platform:"linux/arm64"}

$ k get no -owide
NAME         STATUS     ROLES                  AGE   VERSION   INTERNAL-IP       EXTERNAL-IP   OS-IMAGE             KERNEL-VERSION      CONTAINER-RUNTIME
mac-master   NotReady   control-plane,master   13m   v1.23.3   192.168.191.144   <none>        Ubuntu 22.04.2 LTS   5.15.0-75-generic   docker://20.10.24
```

> `CRI` 在这个版本，使用的还是 `kubelet` 中的 `dockershim`

```
$ k describe no mac-master
Name:               mac-master
Roles:              control-plane,master
Labels:             beta.kubernetes.io/arch=arm64
                    beta.kubernetes.io/os=linux
                    kubernetes.io/arch=arm64
                    kubernetes.io/hostname=mac-master
                    kubernetes.io/os=linux
                    node-role.kubernetes.io/control-plane=
                    node-role.kubernetes.io/master=
                    node.kubernetes.io/exclude-from-external-load-balancers=
Annotations:        kubeadm.alpha.kubernetes.io/cri-socket: /var/run/dockershim.sock
                    node.alpha.kubernetes.io/ttl: 0
                    volumes.kubernetes.io/controller-managed-attach-detach: true
CreationTimestamp:  Sat, 17 Jun 2022 08:56:06 +0000
Taints:             node-role.kubernetes.io/master:NoSchedule
                    node.kubernetes.io/not-ready:NoSchedule
Unschedulable:      false
Lease:
  HolderIdentity:  mac-master
  AcquireTime:     <unset>
  RenewTime:       Sat, 17 Jun 2022 09:13:33 +0000
Conditions:
  Type             Status  LastHeartbeatTime                 LastTransitionTime                Reason                       Message
  ----             ------  -----------------                 ------------------                ------                       -------
  MemoryPressure   False   Sat, 17 Jun 2022 09:11:33 +0000   Sat, 17 Jun 2022 08:56:04 +0000   KubeletHasSufficientMemory   kubelet has sufficient memory available
  DiskPressure     False   Sat, 17 Jun 2022 09:11:33 +0000   Sat, 17 Jun 2022 08:56:04 +0000   KubeletHasNoDiskPressure     kubelet has no disk pressure
  PIDPressure      False   Sat, 17 Jun 2022 09:11:33 +0000   Sat, 17 Jun 2022 08:56:04 +0000   KubeletHasSufficientPID      kubelet has sufficient PID available
  Ready            False   Sat, 17 Jun 2022 09:11:33 +0000   Sat, 17 Jun 2022 08:56:04 +0000   KubeletNotReady              container runtime network not ready: NetworkReady=false reason:NetworkPluginNotReady message:docker: network plugin is not ready: cni config uninitialized
Addresses:
  InternalIP:  192.168.191.144
  Hostname:    mac-master
Capacity:
  cpu:                2
  ephemeral-storage:  10218772Ki
  hugepages-1Gi:      0
  hugepages-2Mi:      0
  hugepages-32Mi:     0
  hugepages-64Ki:     0
  memory:             4005812Ki
  pods:               110
Allocatable:
  cpu:                2
  ephemeral-storage:  9417620260
  hugepages-1Gi:      0
  hugepages-2Mi:      0
  hugepages-32Mi:     0
  hugepages-64Ki:     0
  memory:             3903412Ki
  pods:               110
System Info:
  Machine ID:                 672d5357bef84a6cb30d0311906a8196
  System UUID:                f4844d56-2a2e-5f28-7680-c77f427dbe74
  Boot ID:                    cfde4e7a-e55c-4ee3-9c45-92511c5a78b0
  Kernel Version:             5.15.0-75-generic
  OS Image:                   Ubuntu 22.04.2 LTS
  Operating System:           linux
  Architecture:               arm64
  Container Runtime Version:  docker://20.10.24
  Kubelet Version:            v1.23.3
  Kube-Proxy Version:         v1.23.3
PodCIDR:                      10.10.0.0/24
PodCIDRs:                     10.10.0.0/24
Non-terminated Pods:          (5 in total)
  Namespace                   Name                                  CPU Requests  CPU Limits  Memory Requests  Memory Limits  Age
  ---------                   ----                                  ------------  ----------  ---------------  -------------  ---
  kube-system                 etcd-mac-master                       100m (5%)     0 (0%)      100Mi (2%)       0 (0%)         17m
  kube-system                 kube-apiserver-mac-master             250m (12%)    0 (0%)      0 (0%)           0 (0%)         17m
  kube-system                 kube-controller-manager-mac-master    200m (10%)    0 (0%)      0 (0%)           0 (0%)         17m
  kube-system                 kube-proxy-j2qrp                      0 (0%)        0 (0%)      0 (0%)           0 (0%)         17m
  kube-system                 kube-scheduler-mac-master             100m (5%)     0 (0%)      0 (0%)           0 (0%)         17m
Allocated resources:
  (Total limits may be over 100 percent, i.e., overcommitted.)
  Resource           Requests    Limits
  --------           --------    ------
  cpu                650m (32%)  0 (0%)
  memory             100Mi (2%)  0 (0%)
  ephemeral-storage  0 (0%)      0 (0%)
  hugepages-1Gi      0 (0%)      0 (0%)
  hugepages-2Mi      0 (0%)      0 (0%)
  hugepages-32Mi     0 (0%)      0 (0%)
  hugepages-64Ki     0 (0%)      0 (0%)
Events:
  Type    Reason                   Age                From        Message
  ----    ------                   ----               ----        -------
  Normal  Starting                 17m                kube-proxy
  Normal  Starting                 17m                kubelet     Starting kubelet.
  Normal  NodeHasSufficientMemory  17m (x4 over 17m)  kubelet     Node mac-master status is now: NodeHasSufficientMemory
  Normal  NodeHasNoDiskPressure    17m (x3 over 17m)  kubelet     Node mac-master status is now: NodeHasNoDiskPressure
  Normal  NodeHasSufficientPID     17m (x3 over 17m)  kubelet     Node mac-master status is now: NodeHasSufficientPID
  Normal  NodeAllocatableEnforced  17m                kubelet     Updated Node Allocatable limit across pods
  Normal  Starting                 17m                kubelet     Starting kubelet.
  Normal  NodeAllocatableEnforced  17m                kubelet     Updated Node Allocatable limit across pods
  Normal  NodeHasSufficientMemory  17m                kubelet     Node mac-master status is now: NodeHasSufficientMemory
  Normal  NodeHasNoDiskPressure    17m                kubelet     Node mac-master status is now: NodeHasNoDiskPressure
  Normal  NodeHasSufficientPID     17m                kubelet     Node mac-master status is now: NodeHasSufficientPID
```

> 安装 `Flannel` 网络插件，使用 Kubernetes 的网段地址（`--pod-network-cidr`）

```yaml kube-flannel.yml
  net-conf.json: |
    {
      "Network": "10.10.0.0/16",
      "Backend": {
        "Type": "vxlan"
      }
    }
```

```
$ k apply -f kube-flannel.yml
namespace/kube-flannel created
serviceaccount/flannel created
clusterrole.rbac.authorization.k8s.io/flannel created
clusterrolebinding.rbac.authorization.k8s.io/flannel created
configmap/kube-flannel-cfg created
daemonset.apps/kube-flannel-ds created

$ k get no
NAME         STATUS   ROLES                  AGE   VERSION
mac-master   Ready    control-plane,master   36m   v1.23.3
```

```
$ k describe no mac-master
Name:               mac-master
Roles:              control-plane,master
Labels:             beta.kubernetes.io/arch=arm64
                    beta.kubernetes.io/os=linux
                    kubernetes.io/arch=arm64
                    kubernetes.io/hostname=mac-master
                    kubernetes.io/os=linux
                    node-role.kubernetes.io/control-plane=
                    node-role.kubernetes.io/master=
                    node.kubernetes.io/exclude-from-external-load-balancers=
Annotations:        flannel.alpha.coreos.com/backend-data: {"VNI":1,"VtepMAC":"ee:61:5e:ff:69:8a"}
                    flannel.alpha.coreos.com/backend-type: vxlan
                    flannel.alpha.coreos.com/kube-subnet-manager: true
                    flannel.alpha.coreos.com/public-ip: 192.168.191.144
                    kubeadm.alpha.kubernetes.io/cri-socket: /var/run/dockershim.sock
                    node.alpha.kubernetes.io/ttl: 0
                    volumes.kubernetes.io/controller-managed-attach-detach: true
CreationTimestamp:  Sat, 17 Jun 2022 08:56:06 +0000
Taints:             node-role.kubernetes.io/master:NoSchedule
Unschedulable:      false
Lease:
  HolderIdentity:  mac-master
  AcquireTime:     <unset>
  RenewTime:       Sat, 17 Jun 2022 09:34:30 +0000
Conditions:
  Type                 Status  LastHeartbeatTime                 LastTransitionTime                Reason                       Message
  ----                 ------  -----------------                 ------------------                ------                       -------
  NetworkUnavailable   False   Sat, 17 Jun 2022 09:31:50 +0000   Sat, 17 Jun 2022 09:31:50 +0000   FlannelIsUp                  Flannel is running on this node
  MemoryPressure       False   Sat, 17 Jun 2022 09:32:11 +0000   Sat, 17 Jun 2022 08:56:04 +0000   KubeletHasSufficientMemory   kubelet has sufficient memory available
  DiskPressure         False   Sat, 17 Jun 2022 09:32:11 +0000   Sat, 17 Jun 2022 08:56:04 +0000   KubeletHasNoDiskPressure     kubelet has no disk pressure
  PIDPressure          False   Sat, 17 Jun 2022 09:32:11 +0000   Sat, 17 Jun 2022 08:56:04 +0000   KubeletHasSufficientPID      kubelet has sufficient PID available
  Ready                True    Sat, 17 Jun 2022 09:32:11 +0000   Sat, 17 Jun 2022 09:32:01 +0000   KubeletReady                 kubelet is posting ready status. AppArmor enabled
Addresses:
  InternalIP:  192.168.191.144
  Hostname:    mac-master
Capacity:
  cpu:                2
  ephemeral-storage:  10218772Ki
  hugepages-1Gi:      0
  hugepages-2Mi:      0
  hugepages-32Mi:     0
  hugepages-64Ki:     0
  memory:             4005812Ki
  pods:               110
Allocatable:
  cpu:                2
  ephemeral-storage:  9417620260
  hugepages-1Gi:      0
  hugepages-2Mi:      0
  hugepages-32Mi:     0
  hugepages-64Ki:     0
  memory:             3903412Ki
  pods:               110
System Info:
  Machine ID:                 672d5357bef84a6cb30d0311906a8196
  System UUID:                f4844d56-2a2e-5f28-7680-c77f427dbe74
  Boot ID:                    cfde4e7a-e55c-4ee3-9c45-92511c5a78b0
  Kernel Version:             5.15.0-75-generic
  OS Image:                   Ubuntu 22.04.2 LTS
  Operating System:           linux
  Architecture:               arm64
  Container Runtime Version:  docker://20.10.24
  Kubelet Version:            v1.23.3
  Kube-Proxy Version:         v1.23.3
PodCIDR:                      10.10.0.0/24
PodCIDRs:                     10.10.0.0/24
Non-terminated Pods:          (8 in total)
  Namespace                   Name                                  CPU Requests  CPU Limits  Memory Requests  Memory Limits  Age
  ---------                   ----                                  ------------  ----------  ---------------  -------------  ---
  kube-flannel                kube-flannel-ds-n785t                 100m (5%)     0 (0%)      50Mi (1%)        0 (0%)         3m7s
  kube-system                 coredns-64897985d-7mxbc               100m (5%)     0 (0%)      70Mi (1%)        170Mi (4%)     38m
  kube-system                 coredns-64897985d-8kk4g               100m (5%)     0 (0%)      70Mi (1%)        170Mi (4%)     38m
  kube-system                 etcd-mac-master                       100m (5%)     0 (0%)      100Mi (2%)       0 (0%)         38m
  kube-system                 kube-apiserver-mac-master             250m (12%)    0 (0%)      0 (0%)           0 (0%)         38m
  kube-system                 kube-controller-manager-mac-master    200m (10%)    0 (0%)      0 (0%)           0 (0%)         38m
  kube-system                 kube-proxy-j2qrp                      0 (0%)        0 (0%)      0 (0%)           0 (0%)         38m
  kube-system                 kube-scheduler-mac-master             100m (5%)     0 (0%)      0 (0%)           0 (0%)         38m
Allocated resources:
  (Total limits may be over 100 percent, i.e., overcommitted.)
  Resource           Requests    Limits
  --------           --------    ------
  cpu                950m (47%)  0 (0%)
  memory             290Mi (7%)  340Mi (8%)
  ephemeral-storage  0 (0%)      0 (0%)
  hugepages-1Gi      0 (0%)      0 (0%)
  hugepages-2Mi      0 (0%)      0 (0%)
  hugepages-32Mi     0 (0%)      0 (0%)
  hugepages-64Ki     0 (0%)      0 (0%)
Events:
  Type    Reason                   Age                From        Message
  ----    ------                   ----               ----        -------
  Normal  Starting                 38m                kube-proxy
  Normal  Starting                 38m                kubelet     Starting kubelet.
  Normal  NodeHasSufficientMemory  38m (x4 over 38m)  kubelet     Node mac-master status is now: NodeHasSufficientMemory
  Normal  NodeHasNoDiskPressure    38m (x3 over 38m)  kubelet     Node mac-master status is now: NodeHasNoDiskPressure
  Normal  NodeHasSufficientPID     38m (x3 over 38m)  kubelet     Node mac-master status is now: NodeHasSufficientPID
  Normal  NodeAllocatableEnforced  38m                kubelet     Updated Node Allocatable limit across pods
  Normal  Starting                 38m                kubelet     Starting kubelet.
  Normal  NodeAllocatableEnforced  38m                kubelet     Updated Node Allocatable limit across pods
  Normal  NodeHasSufficientMemory  38m                kubelet     Node mac-master status is now: NodeHasSufficientMemory
  Normal  NodeHasNoDiskPressure    38m                kubelet     Node mac-master status is now: NodeHasNoDiskPressure
  Normal  NodeHasSufficientPID     38m                kubelet     Node mac-master status is now: NodeHasSufficientPID
  Normal  NodeReady                2m39s              kubelet     Node mac-master status is now: NodeReady
```

# Worker

> Worker 连接 Master，拉取镜像，安装网络插件，最后将 Worker 加入到集群

```
$ sudo kubeadm join 192.168.191.144:6443 --token nawjbe.tn41eyo5t8gloqgw \
        --discovery-token-ca-cert-hash sha256:bb3dd37a78ac4c06c43fb38a03a897903ba803c7d211dc465d61bebd9c716411
[preflight] Running pre-flight checks
[preflight] Reading configuration from the cluster...
[preflight] FYI: You can look at this config file with 'kubectl -n kube-system get cm kubeadm-config -o yaml'
W0617 09:38:59.996636    6375 utils.go:69] The recommended value for "resolvConf" in "KubeletConfiguration" is: /run/systemd/resolve/resolv.conf; the provided value is: /run/systemd/resolve/resolv.conf
[kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
[kubelet-start] Writing kubelet environment file with flags to file "/var/lib/kubelet/kubeadm-flags.env"
[kubelet-start] Starting the kubelet
[kubelet-start] Waiting for the kubelet to perform the TLS Bootstrap...

This node has joined the cluster:
* Certificate signing request was sent to apiserver and a response was received.
* The Kubelet was informed of the new secure connection details.

Run 'kubectl get nodes' on the control-plane to see this node join the cluster.
```

> 下列操作在 Master

```
$ k get cm -n kube-system kubeadm-config -oyaml
apiVersion: v1
data:
  ClusterConfiguration: |
    apiServer:
      extraArgs:
        authorization-mode: Node,RBAC
      timeoutForControlPlane: 4m0s
    apiVersion: kubeadm.k8s.io/v1beta3
    certificatesDir: /etc/kubernetes/pki
    clusterName: kubernetes
    controllerManager: {}
    dns: {}
    etcd:
      local:
        dataDir: /var/lib/etcd
    imageRepository: k8s.gcr.io
    kind: ClusterConfiguration
    kubernetesVersion: v1.23.3
    networking:
      dnsDomain: cluster.local
      podSubnet: 10.10.0.0/16
      serviceSubnet: 10.96.0.0/12
    scheduler: {}
kind: ConfigMap
metadata:
  creationTimestamp: "2022-06-17T08:56:07Z"
  name: kubeadm-config
  namespace: kube-system
  resourceVersion: "202"
  uid: 74a0539d-3fa9-4368-a2fb-df100ae10a75
```

```
$ k get no -owide
NAME         STATUS   ROLES                  AGE     VERSION   INTERNAL-IP       EXTERNAL-IP   OS-IMAGE             KERNEL-VERSION      CONTAINER-RUNTIME
mac-master   Ready    control-plane,master   47m     v1.23.3   192.168.191.144   <none>        Ubuntu 22.04.2 LTS   5.15.0-75-generic   docker://20.10.24
mac-worker   Ready    <none>                 4m52s   v1.23.3   192.168.191.146   <none>        Ubuntu 22.04.2 LTS   5.15.0-75-generic   docker://20.10.24

$ k run nginx --image=nginx:alpine
pod/nginx created

$ k get po -owide
NAME    READY   STATUS    RESTARTS   AGE   IP          NODE         NOMINATED NODE   READINESS GATES
nginx   1/1     Running   0          59s   10.10.1.2   mac-worker   <none>           <none>

$ curl -sI 10.10.1.2
HTTP/1.1 200 OK
Server: nginx/1.25.1
Date: Sat, 17 Jun 2022 09:46:11 GMT
Content-Type: text/html
Content-Length: 615
Last-Modified: Tue, 13 Jun 2022 17:34:28 GMT
Connection: keep-alive
ETag: "6488a8a4-267"
Accept-Ranges: bytes

$ k delete po nginx
pod "nginx" deleted
```

# Lens

![image-20230617184045653](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230617184045653.png)
