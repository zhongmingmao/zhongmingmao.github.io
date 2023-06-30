---
title: Kubernetes - CNI
mathjax: false
date: 2022-11-06 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/1_XIgjBfIvDNBp80DgTV6SAA.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Kubernetes
---

# 网络模型

> Docker bridge

![image-20230630195837598](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230630195837598.png)

<!-- more -->

1. Docker 会创建一个名为 `docker0` 的虚拟网桥，默认网段为`172.17.0.0/16`
2. 每个容器上都会创建一个虚拟网卡对（`veth pair`）
   - 两个虚拟网卡分别连接容器和虚拟网桥，从而实现容器间的网络互通
3. Docker 的网络方案只局限在`单机环境`下工作，Kubernetes 的网络模型：`IP-per-pod`

> IP-per-pod

![image-20230630200919736](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230630200919736.png)

1. 集群内的每个 Pod 都会有`唯一`的 IP 地址
2. Pod 内的所有容器`共享`这个 IP 地址
3. 集群内的所有 Pod 都属于`同一个网段`
4. Pod 可以基于 IP 地址`直接访问`另一个 Pod，不需要做 `NAT`

# CNI

> Container Networking Interface

1. CNI 定义了一系列`通用接口`，开发者只需要遵循规范接入 Kubernetes
   - 为 Pod `创建虚拟网卡`、`分配 IP 地址`、`设置路由规则`，进而实现 Kubernetes 的 `IP-per-pod` 网络模型
2. 依据`实现技术`分类，CNI 插件可以分为 3 类
   - `Overlay`
     - 构建一个工作在`底层网络之上`的`逻辑网络`
     - 把原始的 Pod 网络数据包`封包`，再通过下层网络发送出去，到达目的地后再`拆包`
     - 对底层网络的要求低，`适应性强`，但有额外的传输成本，`性能较低`
   - `Route`
     - 同样也是在`底层网络之上`工作，但`没有封包和拆包`，而是使用`系统内置`的`路由功能`实现 Pod 的`跨主机通信`
     - `性能较高`，但对底层网络的`依赖性比较强`
   - `Underlay`
     - 直接使用`底层网络`实现 CNI，`Pod` 和`宿主`都在同一个网络里，两者是`平等`的
     - `性能最高`，但对底层的硬件和网络的`依赖性最强`

| CNI        | 性能 | 依赖性 |
| ---------- | ---- | ------ |
| `Overlay`  | 低   | 低     |
| `Route`    | 中   | 中     |
| `Underlay` | 强   | 强     |

> Flannel - 2015

1. 由 CoreOS 公司开发（后被 Redhat 收购）
2. 最早是一种 `Overlay` 模式的网络插件，基于 `UDP` 和 `VXLAN` 技术
3. 后来使用 `Host-Gateway` 技术支持了 `Route` 模式
4. `简单易用`，非常流行，但`性能较弱`，不建议在生产使用

> Calico - 2015

1. 支持 `Route` 模式的 CNI，使用 `BGP` 协议来维护`路由信息`
2. `性能比 Flannel 强`，支持`多种网络策略`，具备`数据加密`、`安全隔离`、`流量整形`等功能

> Cilium - 2018

1. 同时支持 `Overlay` 模式和 `Route` 模式
2. 深度使用了 `Linux eBPF` 技术，在`内核层次`操作网络数据，`性能很高`，可以灵活实现各种功能

# Flannel

> 默认为 `Overlay` 模式
> `本机通信`直接走 `cni0`，而`跨主机通信`会将`原始数据包`封装成 `VXLAN` 包再走`宿主机网卡`发送，有性能损失

> 创建 Nginx Deployment

```
$ k create deployment nginx-deploy --image=nginx:alpine --replicas=3
deployment.apps/nginx-deploy created

$ k get po -owide
NAME                            READY   STATUS    RESTARTS   AGE   IP            NODE         NOMINATED NODE   READINESS GATES
nginx-deploy-5db48f768c-8dzsw   1/1     Running   0          28s   10.10.0.19    mac-master   <none>           <none>
nginx-deploy-5db48f768c-f9ccz   1/1     Running   0          28s   10.10.1.133   mac-worker   <none>           <none>
nginx-deploy-5db48f768c-vv6dd   1/1     Running   0          28s   10.10.0.18    mac-master   <none>           <none>
```

> Flannel 默认使用基于 `VXLAN` 的 `Overlay` 模式，与 Docker 的网络结构非常类似

![k8s-flannel](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/k8s-flannel.png)

> Pod - eth0@if63

```
$ k exec nginx-deploy-5db48f768c-8dzsw -- ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: eth0@if63: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1450 qdisc noqueue state UP
    link/ether 4a:35:0f:25:05:32 brd ff:ff:ff:ff:ff:ff
    inet 10.10.0.19/24 brd 10.10.0.255 scope global eth0
       valid_lft forever preferred_lft forever
```

> mac-master - veth25155c69@if2

```
$ ip a
...
3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default
    link/ether 02:42:4d:b8:7c:92 brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
       valid_lft forever preferred_lft forever
...
4: flannel.1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UNKNOWN group default
    link/ether ee:61:5e:ff:69:8a brd ff:ff:ff:ff:ff:ff
    inet 10.10.0.0/32 scope global flannel.1
       valid_lft forever preferred_lft forever
    inet6 fe80::ec61:5eff:feff:698a/64 scope link
       valid_lft forever preferred_lft forever
...
5: cni0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UP group default qlen 1000
    link/ether 16:4c:b3:10:4b:a2 brd ff:ff:ff:ff:ff:ff
    inet 10.10.0.1/24 brd 10.10.0.255 scope global cni0
       valid_lft forever preferred_lft forever
    inet6 fe80::144c:b3ff:fe10:4ba2/64 scope link
       valid_lft forever preferred_lft forever
...
63: veth25155c69@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue master cni0 state UP group default
    link/ether 66:a2:8d:4c:99:f8 brd ff:ff:ff:ff:ff:ff link-netnsid 3
    inet6 fe80::64a2:8dff:fe4c:99f8/64 scope link
       valid_lft forever preferred_lft forever

$ brctl show
bridge name bridge id         STP enabled interfaces
cni0        8000.164cb3104ba2 no          veth25155c69
                                          veth2ff698b2
                                          vethcd663fc5
                                          vethfb59328d
docker0     8000.02424db87c92 no
```

> 另一个本机的 Pod

```
$ k exec nginx-deploy-5db48f768c-vv6dd -- ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: eth0@if62: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1450 qdisc noqueue state UP
    link/ether 22:9c:7e:84:c7:7c brd ff:ff:ff:ff:ff:ff
    inet 10.10.0.18/24 brd 10.10.0.255 scope global eth0
       valid_lft forever preferred_lft forever
```

```
$ ip a
...
62: vethfb59328d@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue master cni0 state UP group default
    link/ether be:83:0c:6c:00:22 brd ff:ff:ff:ff:ff:ff link-netnsid 2
    inet6 fe80::bc83:cff:fe6c:22/64 scope link
       valid_lft forever preferred_lft forever
...
```

> vethfb59328d 和 veth25155c69 都在 `cni0` 上，`本机`上的 Pod 可以`直接通信`

> `跨主机`的网络，关键点在于 `Node` 的`路由表`

```
$ route
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
default         _gateway        0.0.0.0         UG    100    0        0 ens160
10.10.0.0       0.0.0.0         255.255.255.0   U     0      0        0 cni0
10.10.1.0       10.10.1.0       255.255.255.0   UG    0      0        0 flannel.1
172.17.0.0      0.0.0.0         255.255.0.0     U     0      0        0 docker0
192.168.191.0   0.0.0.0         255.255.255.0   U     100    0        0 ens160
_gateway        0.0.0.0         255.255.255.255 UH    100    0        0 ens160
```

1. `10.10.0.0/24` 网段的数据，走 `cni0` 设备，即 `cni0 网桥`
2. `10.10.1.0/24` 网段的数据，走 `flannel.1` 设备，即 `Flannel Overlay`
3. `192.168.191.0/24` 网段的数据，走 `ens160` 设备，即`宿主上的网卡`

> 从 mac-master 的 Pod（10.10.0.18） 访问 mac-worker 的 Pod（10.10.1.133）
> 按照 mac-master 的路由表，需要让 `flannel.1` 来处理，这样就进入了 `Flannel Overlay` 的工作流程

> 此后，`Flannel Overlay` 需要决定如何将数据发到 mac-worker

```
$ ip neighbor | grep 10.10.1
10.10.1.0 dev flannel.1 lladdr 8e:7c:be:f7:20:ea PERMANENT

$ bridge fdb | grep flannel
8e:7c:be:f7:20:ea dev flannel.1 dst 192.168.191.146 self permanent

$ route
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
...
192.168.191.0   0.0.0.0         255.255.255.0   U     100    0        0 ens160
...
```

# Calico

> 支持 `Route` 模式，不使用 `cni0` 网桥，而是`创建路由规则`，将数据包`直接发送`到目标网卡

> https://projectcalico.docs.tigera.io/archive/v3.23/manifests/calico.yaml

```
$ k get po -n kube-system -owide
NAME                                       READY   STATUS    RESTARTS       AGE     IP                NODE         NOMINATED NODE   READINESS GATES
calico-kube-controllers-54756b744f-q526v   1/1     Running   0              6m16s   10.10.1.134       mac-worker   <none>           <none>
calico-node-5pbd8                          1/1     Running   0              22s     192.168.191.144   mac-master   <none>           <none>
calico-node-dklxx                          1/1     Running   0              6m16s   192.168.191.146   mac-worker   <none>           <none>
```

> 创建 Nginx Deployment，Calico 的 `IP 地址分配策略`与 Flannel 是不一样的

```
$ k create deployment nginx-deploy --image=nginx:alpine --replicas=3
deployment.apps/nginx-deploy created

$ k get po -owide
NAME                            READY   STATUS    RESTARTS   AGE   IP              NODE         NOMINATED NODE   READINESS GATES
nginx-deploy-5db48f768c-5pj2j   1/1     Running   0          25s   10.10.47.194    mac-master   <none>           <none>
nginx-deploy-5db48f768c-8dlkx   1/1     Running   0          25s   10.10.151.129   mac-worker   <none>           <none>
nginx-deploy-5db48f768c-lz6n9   1/1     Running   0          25s   10.10.47.193    mac-master   <none>           <none>
```

> Pod - cali37dcdb16aba@if4

```
$ k exec nginx-deploy-5db48f768c-5pj2j -- ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: tunl0@NONE: <NOARP> mtu 1480 qdisc noop state DOWN qlen 1000
    link/ipip 0.0.0.0 brd 0.0.0.0
4: eth0@if68: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1480 qdisc noqueue state UP
    link/ether 7e:c4:fb:61:34:c5 brd ff:ff:ff:ff:ff:ff
    inet 10.10.47.194/32 scope global eth0
       valid_lft forever preferred_lft forever

$ ip a
...
64: tunl0@NONE: <NOARP,UP,LOWER_UP> mtu 1480 qdisc noqueue state UNKNOWN group default qlen 1000
    link/ipip 0.0.0.0 brd 0.0.0.0
    inet 10.10.47.192/32 scope global tunl0
       valid_lft forever preferred_lft forever
...
68: cali37dcdb16aba@if4: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1480 qdisc noqueue state UP group default
    link/ether ee:ee:ee:ee:ee:ee brd ff:ff:ff:ff:ff:ff link-netnsid 3
    inet6 fe80::ecee:eeff:feee:eeee/64 scope link
       valid_lft forever preferred_lft forever
...

$ brctl show
bridge name bridge id         STP enabled interfaces
cni0        8000.164cb3104ba2 no          veth2ff698b2
                                          vethcd663fc5
docker0     8000.02424db87c92 no
```

> Calico 采用 `Route` 模式，在`宿主`上创建`路由规则`，让数据包`不经过 cni0 网桥`，直接跳到目标网卡

```
$ route
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
default         _gateway        0.0.0.0         UG    100    0        0 ens160
10.10.0.0       0.0.0.0         255.255.255.0   U     0      0        0 cni0
10.10.1.0       192.168.191.146 255.255.255.255 UGH   0      0        0 tunl0
10.10.1.0       10.10.1.0       255.255.255.0   UG    0      0        0 flannel.1
10.10.47.192    0.0.0.0         255.255.255.192 U     0      0        0 *
10.10.47.193    0.0.0.0         255.255.255.255 UH    0      0        0 cali74df2d48efd
10.10.47.194    0.0.0.0         255.255.255.255 UH    0      0        0 cali37dcdb16aba
10.10.151.128   192.168.191.146 255.255.255.192 UG    0      0        0 tunl0
172.17.0.0      0.0.0.0         255.255.0.0     U     0      0        0 docker0
192.168.191.0   0.0.0.0         255.255.255.0   U     100    0        0 ens160
_gateway        0.0.0.0         255.255.255.255 UH    100    0        0 ens160
```

> Pod 10.10.47.193 要访问 10.10.47.194，需要走 cali37dcdb16aba 设备，数据包`直接进入` 10.10.47.194，不需要经过网桥

![k8s-calico](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/k8s-calico.png)



