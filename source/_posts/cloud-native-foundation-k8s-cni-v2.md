---
title: Kubernetes - CNI
mathjax: false
date: 2022-12-08 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/cni-logo-card.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
---

# 网络分类

| Type         | Desc                                          |
| ------------ | --------------------------------------------- |
| `CNI`        | `Pod` 到 `Pod` 的网络，`Node` 到 `Pod` 的网络 |
| `kube-proxy` | 通过 `Service` 访问                           |
| `Ingress`    | `入站`流量                                    |

<!-- more -->

# 基础原则

1. 所有 `Pod` 能够不通过 `NAT` 就能互相访问
2. 所有 `Node` 能够不通过 `NAT` 就能互相访问
3. 容器内看到的 IP 地址和外部组件看到的`容器 IP` 是一样的

> 补充说明

1. 在 Kubernetes 集群，`IP 地址`是以 `Pod` 为单位进行分配的，每个 Pod 拥有一个独立的 IP 地址
2. 一个 Pod 内部的`所有容器`共享一个`网络栈`，即宿主上的一个 `Network Namespace`
3. Pod 内的`所有容器`能够通过 `localhost:port` 来连接对方
4. 在 Kubernetes 中，提供一个`轻量`的`通用`容器网络接口 `CNI`
   -  `Container Network Interface`，用来设置和删除`容器的网络连通性`
5. `Container Runtime` 通过 `CNI` 调用`网络插件`来完成`容器的网络设置`

# 插件分类

> 下面的 Plugin 均由 `ContainerNetworking` 组维护

> `IPAM -> Main -> Meta`

> `IPAM` - IP address allocation - 解决 `IP 分配`的问题

| Plugin       | Value                                                        |
| ------------ | ------------------------------------------------------------ |
| `dhcp`       | Runs a daemon on the host to make DHCP requests on behalf of the container |
| `host-local` | Maintains a local database of allocated IPs                  |
| `static`     | Allocate a single static IPv4/IPv6 address to container      |

> `Main` - interface-creating - 解决`网络互通`的问题

> 1. `容器`和`主机`的互通
> 2. `同一主机`的容器互通
> 3. `跨主机`的容器互通 - `CNI` 在原先容器网络的基础上的新增能力

| Plugin        | Desc                                                         |
| ------------- | ------------------------------------------------------------ |
| `bridge`      | Creates a bridge, adds the host and the container to it      |
| `ipvlan`      | Adds an ipvlan interface in the container                    |
| `loopback`    | Set the state of loopback interface to up                    |
| `macvlan`     | Creates a new MAC address, forwards all traffic to that to the container |
| `ptp`         | Creates a veth pair                                          |
| `vlan`        | Allocates a vlan device                                      |
| `host-device` | Move an already-existing device into a container             |
| `dummy`       | Creates a new Dummy device in the container                  |

> Meta - other plugins

| Plugin      | Desc                                                         |
| ----------- | ------------------------------------------------------------ |
| `tuning`    | Tweaks sysctl parameters of an existing interface            |
| `portmap`   | An iptables-based portmapping plugin. Maps ports from the host's address space to the container |
| `bandwidth` | Allows bandwidth-limiting through use of traffic control tbf (ingress/egress) |
| `sbr`       | A plugin that configures source based routing for an interface (from which it is chained) |
| `firewall`  | A firewall plugin which uses iptables or firewalld to add rules to allow traffic to/from the container |

# 运行机制

> `Container Runtime` 在`启动`时从 `CNI` 的配置目录读取 `JSON` 格式的配置文件（多个文件，按`字典序`选择第 1 个）

> `1 CNI  + N CSI`

![image-20230729103814030](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230729103814030.png)

> 关于容器网络管理，`Container Runtime` 一般需要配置两个参数：`--cni-bin-dir` 和 `--cni-conf-dir`

> 特殊情况：使用 `kubelet` 内置的 `Dockershim` 作为 `Container Runtime` 时
> 由 `kubelet` 来查找 `CNI` 插件，运行插件为容器设置网络，因此这两个参数应该设置为 `kubelet`

| Key        | Value            | Parameters       |
| ---------- | ---------------- | ---------------- |
| 配置文件   | `/etc/cni/net.d` | `--cni-conf-dir` |
| 可执行文件 | `/opt/cni/bin`   | `--cni-bin-dir`  |

> 配置文件

```
$ ll /etc/cni/net.d
total 8
-rw-r--r-- 1 root root  680 Jul 26 17:15 10-calico.conflist
-rw------- 1 root root 2733 Jul 26 17:18 calico-kubeconfig
```

> `ipam` - calico-ipam
> `main` - calico
> `meta` - bandwidth + portmap

```json /etc/cni/net.d/10-calico.conflist
{
   "name":"k8s-pod-network",
   "cniVersion":"0.3.1",
   "plugins":[
      {
         "container_settings":{
            "allow_ip_forwarding":false
         },
         "datastore_type":"kubernetes",
         "ipam":{
            "assign_ipv4":"true",
            "assign_ipv6":"false",
            "type":"calico-ipam"
         },
         "kubernetes":{
            "k8s_api_root":"https://10.96.0.1:443",
            "kubeconfig":"/etc/cni/net.d/calico-kubeconfig"
         },
         "log_file_max_age":30,
         "log_file_max_count":10,
         "log_file_max_size":100,
         "log_file_path":"/var/log/calico/cni/cni.log",
         "log_level":"Info",
         "mtu":0,
         "nodename_file_optional":false,
         "policy":{
            "type":"k8s"
         },
         "type":"calico"
      },
      {
         "capabilities":{
            "bandwidth":true
         },
         "type":"bandwidth"
      },
      {
         "capabilities":{
            "portMappings":true
         },
         "snat":true,
         "type":"portmap"
      }
   ]
}
```

> 编译好的`可执行`文件 - Kubernetes `调用 CNI 插件`，本质上是运行`本地的可执行文件`

```
$ ll /opt/cni/bin
total 245688
-rwxr-xr-x 1 root root  3885252 Jul 23 12:02 bandwidth
-rwxr-xr-x 1 root root  4241166 Jan 16  2023 bridge
-rwsr-xr-x 1 root root 59619577 Jul 23 12:02 calico
-rwsr-xr-x 1 root root 59619577 Jul 23 12:02 calico-ipam
-rwxr-xr-x 1 root root  9895211 Jan 16  2023 dhcp
-rwxr-xr-x 1 root root  3963159 Jan 16  2023 dummy
-rwxr-xr-x 1 root root  4275642 Jan 16  2023 firewall
-rwxr-xr-x 1 root root  2390464 Jul 23 12:02 flannel
-rwxr-xr-x 1 root root  3865536 Jan 16  2023 host-device
-rwxr-xr-x 1 root root  3413600 Jul 23 12:02 host-local
-rwsr-xr-x 1 root root 59619577 Jul 23 12:02 install
-rwxr-xr-x 1 root root  3968070 Jan 16  2023 ipvlan
-rwxr-xr-x 1 root root  3426012 Jul 23 12:02 loopback
-rwxr-xr-x 1 root root  3976826 Jan 16  2023 macvlan
-rwxr-xr-x 1 root root  3811556 Jul 23 12:02 portmap
-rwxr-xr-x 1 root root  4075754 Jan 16  2023 ptp
-rwxr-xr-x 1 root root  3505660 Jan 16  2023 sbr
-rwxr-xr-x 1 root root  2843609 Jan 16  2023 static
-rwxr-xr-x 1 root root  3602160 Jul 23 12:02 tuning
-rwxr-xr-x 1 root root  3966201 Jan 16  2023 vlan
-rwxr-xr-x 1 root root  3581314 Jan 16  2023 vrf
```

# 设计考量

1. Container Runtime 必须在`调用任何 CNI 插件之前`为容器创建一个新的 `Network Namespace`
   - `Network Namespace` 挂在 `SandBox`
   - Container Runtime 执行 `RunPodSandBox` 后，才去调用 CNI 插件
2. Container Runtime 必须要决定`容器`属于哪些`网络`，针对每个网络，哪些`插件`必须要执行
3. Container Runtime 必须加载`配置文件`，并确定`设置网络`时哪些`插件`必须被执行
4. 网络配置采用 `JSON` 格式
5. Container Runtime 必须按`顺序执行`配置文件里相应的`插件`
6. 在完成`容器生命周期`后，Container Runtime 必须按照与执行添加容器`相反的顺序`执行`CNI 插件`
   - 为了将容器与网络`断开连接`
7. Container Runtime 被`同一容器`调用时`不能并行`操作，但被`不同容器`调用时，`允许并行`操作
8. Container Runtime 针对`一个容器`必须按`顺序`执行 `ADD` 和 `DEL` 操作
   - ADD 对应 Container Runtime 的 `SetUpPodNetwork`，CNI 的 `AddNetwork`
   - ADD 后总是跟着相应的 DEL
   - DEL 可能跟着额外的 DEL，CNI 插件应该允许处理多个 DEL
9. `容器`必须由 `ContainerID` 来唯一标识
   - 需要`存储状态`的插件需要使用`网络名称`、`容器 ID`、`网络接口`组成的`主 Key` 来`索引`
10. Container Runtime 针对`同一网络`、`同一容器`、`同一网络接口`，不能连续调用`两次` ADD 命令
    - `1 ADD + N DEL`

> Container Runtime 通过`环境变量`的方式，将参数传递给 calico 的二进制可执行文件

# 主机网络

1. Kubernetes 需要`标准的 CNI 插件`，最低版本为 0.2.0
2. 网络插件除了支持设置和清理 `Pod` 的网络接口外，还需要支持 `iptables`
   - 如果 `kube-proxy` 工作在 `iptables` 模式，网络插件需要确保`容器流量`能使用 `iptables` 转发
   - 如果网络插件将容器连接到 `Linux 网桥`，需要将 `net.bridge.bridge-nf-call-iptables` 设置为 1
     - Linux 网桥上的数据包将`遍历 iptables 规则`
   - 如果网络插件不使用 Linux 网桥，应确保容器流量被正确设置了`路由`

# 数据链路

1. Container Runtime 调用 `CNI 插件`配置网络（`chain: ipam -> main -> meta`）
2. Container Runtime 将配置结果返回给 `kubelet`
3. `kubelet` 将相关信息上报给 `API Server`，此时通过 `get po -owide` 就能查看到对应的 `Pod IP` 信息

# 跨主机互通

> `跨主机互通`的 2 种方式

1. `Tunnel 模式`
   - 封包解包：`IPinIP`（IP + `IP`） / `VXLAN`（IP + `UDP`）
2. `动态路由`
   - Node 之间`交换路由信息`，最终 Node A 会知道 Node B 的路由信息，相当于有一个`全景地图`

# Plugin

> Flannel / Weave / Calico / Cilium，其中 `Calico` 和 `Cilium` 是`完整`的解决方案

## Flannel

> 基于 `Tunnel` 实现，封包解包的`性能开销`大致为 `10%`

> Flannel 本身`没有完备的生态`（如对 `NetworkPolicy` 的支持）

![image-20230729141652306](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230729141652306.png)

1. Flannel 由 CoreOS 开发，是 CNI 插件的早期入门产品，`简单易用`
2. Flannel 使用 Kubernetes 集群`现有的 etcd 集群`来存储其`状态信息`
   - 不需要提供专用的数据存储，只需要在每个 `Node` 上运行 `flanneld` 守护进程（`DaemonSet`）
3. 每个 `Node` 都被`分配一个子网`，为该 Node 上的 `Pod` 分配 IP 地址
4. `同一 Node`内的 Pod 可以使用`网桥`进行通信
   - 而`不同 Node`上的 Pod 将通过 `flanneld` 将其流量封装在 `UDP` 包中并`路由`到目的地 - `VXLAN`
5. 封装方式使用 `VXLAN`
   - 优点 - `性能良好`
   - 缺点 - `流量难以跟踪`

## Calico

### 概述

> `性能`更佳 + `功能`更全（`网络策略`）

1. 对于`同网段`通信，基于 `3 层`，Calico 使用 `BGP 路由协议`在 `Node` 之间`路由`数据包
   - `BGP` - 数据包在 Node 之间移动`不需要包装在额外的封装层`
2. 对于`跨网段`通信，基于 `IPinIP` 使用虚拟网卡设备 `tunl0`
   - 用一个 IP 数据包封装另一个 IP 数据包
   - `外层 IP 数据包头`的`源地址`为`隧道入口设备`的 IP 地址，`目标地址`为`隧道出口设备`的 IP 地址
3. `网络策略` - Calico 最受欢迎的功能之一
   - 使用 `ACLs` 和 `kube-proxy` 来创建 `iptables` 过滤规则，从而实现`隔离容器网络`的目的
4. Calico 可以与 `Istio` 集成
   - 在 `Service Mesh` 层和`网络基础结构`层上解释和实施集群中工作负载的策略
   - 即：可以配置`功能强大的规则`来描述 `Pod` 应该如何`发送和接收流量`，提高`安全性`和加强对网络环境的`控制`
5. Calico 是`完全分布式`的`横向扩展`结构，可以快速和平稳地扩展部署规模

> 社区提供的是`通用`方案，Pod 网络`不强绑定`底层基础网络，在底层基础网络默认是没法为 Pod 网络路由

> felix agent - 配置网络
> `BIRD` agent - `BGP` Daemon

![image-20230729150050500](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230729150050500.png)

### 初始化

> CNI 二进制文件和配置文件是`由 initContainer 从容器拷贝到主机上`

```
$ k get ds -A
NAMESPACE       NAME              DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR            AGE
calico-system   calico-node       1         1         1       1            1           kubernetes.io/os=linux   5d19h
calico-system   csi-node-driver   1         1         1       1            1           kubernetes.io/os=linux   5d19h
kube-system     kube-proxy        1         1         1       1            1           kubernetes.io/os=linux   5d19h

$ k get po -n calico-system
NAME                                       READY   STATUS    RESTARTS   AGE
calico-kube-controllers-6f6579ddff-sq7hz   1/1     Running   1          5d19h
calico-node-tsjrx                          1/1     Running   1          5d19h
calico-typha-64bcb7cddc-mgdnz              1/1     Running   1          5d19h
csi-node-driver-j62g7                      2/2     Running   2          5d19h
```

> DaemonSet - `k get ds -n calico-system calico-node -oyaml`

> `CALICO_NETWORKING_BACKEND` - 当前运行在 `bird` 模式

> The BIRD project aims to develop a fully functional `dynamic IP routing` daemon primarily targeted on (but not limited to) Linux, FreeBSD and other UNIX-like systems and distributed under the GNU General Public License.

> `BIRD` 是一个开源的 `BGP Deamon`，不同的 IDC 之间可以通过 BGP `交换路由信息`

```yaml calico-node
apiVersion: apps/v1
kind: DaemonSet
metadata:
  annotations:
    deprecated.daemonset.template.generation: "1"
  creationTimestamp: "2022-07-23T11:58:03Z"
  generation: 1
  name: calico-node
  namespace: calico-system
  ownerReferences:
  - apiVersion: operator.tigera.io/v1
    blockOwnerDeletion: true
    controller: true
    kind: Installation
    name: default
    uid: a7119daf-ab1a-4956-aff8-81e031c29f69
  resourceVersion: "4748"
  uid: c4123a23-c83b-4ace-89d3-9917de839e67
spec:
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      k8s-app: calico-node
  template:
    metadata:
      annotations:
        hash.operator.tigera.io/cni-config: 9f0a12e03c58671de56ed3876cb88f1c43cef5dc
        hash.operator.tigera.io/system: bb4746872201725da2dea19756c475aa67d9c1e9
        hash.operator.tigera.io/tigera-ca-private: dd84db09815307584549b186f41feb6a048625c9
      creationTimestamp: null
      labels:
        app.kubernetes.io/name: calico-node
        k8s-app: calico-node
    spec:
      containers:
      - env:
        - name: DATASTORE_TYPE
          value: kubernetes
        - name: WAIT_FOR_DATASTORE
          value: "true"
        - name: CLUSTER_TYPE
          value: k8s,operator,bgp
        - name: CALICO_DISABLE_FILE_LOGGING
          value: "false"
        - name: FELIX_DEFAULTENDPOINTTOHOSTACTION
          value: ACCEPT
        - name: FELIX_HEALTHENABLED
          value: "true"
        - name: FELIX_HEALTHPORT
          value: "9099"
        - name: NODENAME
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: spec.nodeName
        - name: NAMESPACE
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: metadata.namespace
        - name: FELIX_TYPHAK8SNAMESPACE
          value: calico-system
        - name: FELIX_TYPHAK8SSERVICENAME
          value: calico-typha
        - name: FELIX_TYPHACAFILE
          value: /etc/pki/tls/certs/tigera-ca-bundle.crt
        - name: FELIX_TYPHACERTFILE
          value: /node-certs/tls.crt
        - name: FELIX_TYPHAKEYFILE
          value: /node-certs/tls.key
        - name: FIPS_MODE_ENABLED
          value: "false"
        - name: FELIX_TYPHACN
          value: typha-server
        - name: CALICO_MANAGE_CNI
          value: "true"
        - name: CALICO_IPV4POOL_CIDR
          value: 192.168.0.0/16
        - name: CALICO_IPV4POOL_VXLAN
          value: CrossSubnet
        - name: CALICO_IPV4POOL_BLOCK_SIZE
          value: "26"
        - name: CALICO_IPV4POOL_NODE_SELECTOR
          value: all()
        - name: CALICO_IPV4POOL_DISABLE_BGP_EXPORT
          value: "false"
        - name: CALICO_NETWORKING_BACKEND
          value: bird
        - name: IP
          value: autodetect
        - name: IP_AUTODETECTION_METHOD
          value: first-found
        - name: IP6
          value: none
        - name: FELIX_IPV6SUPPORT
          value: "false"
        - name: KUBERNETES_SERVICE_HOST
          value: 10.96.0.1
        - name: KUBERNETES_SERVICE_PORT
          value: "443"
        image: docker.io/calico/node:v3.26.1
        imagePullPolicy: IfNotPresent
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/calico-node
              - -shutdown
        livenessProbe:
          failureThreshold: 3
          httpGet:
            host: localhost
            path: /liveness
            port: 9099
            scheme: HTTP
          periodSeconds: 10
          successThreshold: 1
          timeoutSeconds: 10
        name: calico-node
        readinessProbe:
          exec:
            command:
            - /bin/calico-node
            - -bird-ready
            - -felix-ready
          failureThreshold: 3
          periodSeconds: 10
          successThreshold: 1
          timeoutSeconds: 5
        resources: {}
        securityContext:
          allowPrivilegeEscalation: true
          capabilities:
            drop:
            - ALL
          privileged: true
          runAsGroup: 0
          runAsNonRoot: false
          runAsUser: 0
          seccompProfile:
            type: RuntimeDefault
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
        volumeMounts:
        - mountPath: /etc/pki/tls/certs
          name: tigera-ca-bundle
          readOnly: true
        - mountPath: /etc/pki/tls/cert.pem
          name: tigera-ca-bundle
          readOnly: true
          subPath: ca-bundle.crt
        - mountPath: /lib/modules
          name: lib-modules
          readOnly: true
        - mountPath: /run/xtables.lock
          name: xtables-lock
        - mountPath: /var/run/nodeagent
          name: policysync
        - mountPath: /node-certs
          name: node-certs
          readOnly: true
        - mountPath: /var/run/calico
          name: var-run-calico
        - mountPath: /var/lib/calico
          name: var-lib-calico
        - mountPath: /var/log/calico/cni
          name: cni-log-dir
        - mountPath: /host/etc/cni/net.d
          name: cni-net-dir
      dnsPolicy: ClusterFirst
      hostNetwork: true
      initContainers:
      - image: docker.io/calico/pod2daemon-flexvol:v3.26.1
        imagePullPolicy: IfNotPresent
        name: flexvol-driver
        resources: {}
        securityContext:
          allowPrivilegeEscalation: true
          capabilities:
            drop:
            - ALL
          privileged: true
          runAsGroup: 0
          runAsNonRoot: false
          runAsUser: 0
          seccompProfile:
            type: RuntimeDefault
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
        volumeMounts:
        - mountPath: /host/driver
          name: flexvol-driver-host
      - command:
        - /opt/cni/bin/install
        env:
        - name: CNI_CONF_NAME
          value: 10-calico.conflist
        - name: SLEEP
          value: "false"
        - name: CNI_NET_DIR
          value: /etc/cni/net.d
        - name: CNI_NETWORK_CONFIG
          valueFrom:
            configMapKeyRef:
              key: config
              name: cni-config
        - name: KUBERNETES_SERVICE_HOST
          value: 10.96.0.1
        - name: KUBERNETES_SERVICE_PORT
          value: "443"
        image: docker.io/calico/cni:v3.26.1
        imagePullPolicy: IfNotPresent
        name: install-cni
        resources: {}
        securityContext:
          allowPrivilegeEscalation: true
          capabilities:
            drop:
            - ALL
          privileged: true
          runAsGroup: 0
          runAsNonRoot: false
          runAsUser: 0
          seccompProfile:
            type: RuntimeDefault
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
        volumeMounts:
        - mountPath: /host/opt/cni/bin
          name: cni-bin-dir
        - mountPath: /host/etc/cni/net.d
          name: cni-net-dir
      nodeSelector:
        kubernetes.io/os: linux
      priorityClassName: system-node-critical
      restartPolicy: Always
      schedulerName: default-scheduler
      securityContext: {}
      serviceAccount: calico-node
      serviceAccountName: calico-node
      terminationGracePeriodSeconds: 5
      tolerations:
      - key: CriticalAddonsOnly
        operator: Exists
      - effect: NoSchedule
        operator: Exists
      - effect: NoExecute
        operator: Exists
      volumes:
      - hostPath:
          path: /lib/modules
          type: ""
        name: lib-modules
      - hostPath:
          path: /run/xtables.lock
          type: FileOrCreate
        name: xtables-lock
      - hostPath:
          path: /var/run/nodeagent
          type: DirectoryOrCreate
        name: policysync
      - configMap:
          defaultMode: 420
          name: tigera-ca-bundle
        name: tigera-ca-bundle
      - name: node-certs
        secret:
          defaultMode: 420
          secretName: node-certs
      - hostPath:
          path: /var/run/calico
          type: ""
        name: var-run-calico
      - hostPath:
          path: /var/lib/calico
          type: ""
        name: var-lib-calico
      - hostPath:
          path: /opt/cni/bin
          type: ""
        name: cni-bin-dir
      - hostPath:
          path: /etc/cni/net.d
          type: ""
        name: cni-net-dir
      - hostPath:
          path: /var/log/calico/cni
          type: ""
        name: cni-log-dir
      - hostPath:
          path: /usr/libexec/kubernetes/kubelet-plugins/volume/exec/nodeagent~uds
          type: DirectoryOrCreate
        name: flexvol-driver-host
  updateStrategy:
    rollingUpdate:
      maxSurge: 0
      maxUnavailable: 1
    type: RollingUpdate
status:
  currentNumberScheduled: 1
  desiredNumberScheduled: 1
  numberAvailable: 1
  numberMisscheduled: 0
  numberReady: 1
  observedGeneration: 1
  updatedNumberScheduled: 1
```

> initContainers - 将 `Calico` 的文件（10-calico.conflist）拷贝到`主机`上的 CNI 目录（/etc/cni/net.d）
> 然后 Container Runtime 就能读到 CNI 插件对应的文件

> 即 CRI 使用 CNI 的可执行文件和配置文件，那 CNI 的某个 initContainer 先将这些文件拷贝到主机上

### VXLAN

> 封包解包

![image-20230729153724848](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230729153724848.png)

> 类似与 Flannel 的 `flannelId`

```
$ ip a
...
2: ens160: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 00:0c:29:62:da:29 brd ff:ff:ff:ff:ff:ff
    inet 192.168.191.153/24 brd 192.168.191.255 scope global dynamic ens160
       valid_lft 1563sec preferred_lft 1563sec
    inet6 fe80::20c:29ff:fe62:da29/64 scope link
       valid_lft forever preferred_lft forever
...
10: vxlan.calico: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UNKNOWN group default qlen 1000
    link/ether 66:9e:7d:ae:1b:ec brd ff:ff:ff:ff:ff:ff
    inet 192.168.185.0/32 scope global vxlan.calico
       valid_lft forever preferred_lft forever
    inet6 fe80::649e:7dff:feae:1bec/64 scope link
       valid_lft forever preferred_lft forever
...
```

### CRD

```
$ k get crd
NAME                                                  CREATED AT
apiservers.operator.tigera.io                         2022-07-23T11:57:17Z
bgpconfigurations.crd.projectcalico.org               2022-07-23T11:57:17Z
bgpfilters.crd.projectcalico.org                      2022-07-23T11:57:17Z
bgppeers.crd.projectcalico.org                        2022-07-23T11:57:17Z
blockaffinities.crd.projectcalico.org                 2022-07-23T11:57:17Z
caliconodestatuses.crd.projectcalico.org              2022-07-23T11:57:17Z
clusterinformations.crd.projectcalico.org             2022-07-23T11:57:17Z
felixconfigurations.crd.projectcalico.org             2022-07-23T11:57:17Z
globalnetworkpolicies.crd.projectcalico.org           2022-07-23T11:57:17Z
globalnetworksets.crd.projectcalico.org               2022-07-23T11:57:17Z
hostendpoints.crd.projectcalico.org                   2022-07-23T11:57:17Z
imagesets.operator.tigera.io                          2022-07-23T11:57:17Z
installations.operator.tigera.io                      2022-07-23T11:57:17Z
ipamblocks.crd.projectcalico.org                      2022-07-23T11:57:17Z
ipamconfigs.crd.projectcalico.org                     2022-07-23T11:57:17Z
ipamhandles.crd.projectcalico.org                     2022-07-23T11:57:17Z
ippools.crd.projectcalico.org                         2022-07-23T11:57:17Z
ipreservations.crd.projectcalico.org                  2022-07-23T11:57:17Z
kubecontrollersconfigurations.crd.projectcalico.org   2022-07-23T11:57:17Z
networkpolicies.crd.projectcalico.org                 2022-07-23T11:57:17Z
networksets.crd.projectcalico.org                     2022-07-23T11:57:17Z
tigerastatuses.operator.tigera.io                     2022-07-23T11:57:17Z
```

### IPPool

> 定义一个集群的预定义 IP 段

```
$ k get ippools.projectcalico.org
NAME                  CREATED AT
default-ipv4-ippool   2022-07-23T12:04:44Z
```

> `ipipMode: Never` - 没有开启 `IPinIP`

> 1. `blockSize: 26` - 每个 `Node` 可以分配多大的 IP 段
> 2. `2^(26-16) ≈ 1024` 个 `Node`，每个 Node 上可分配 `2^(32 - 26) ≈ 64` 个 `IP`

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  creationTimestamp: "2022-07-23T12:04:44Z"
  name: default-ipv4-ippool
  resourceVersion: "1600"
  uid: ea36eb56-7eed-473f-97c8-4d6c8f77c963
spec:
  allowedUses:
  - Workload
  - Tunnel
  blockSize: 26
  cidr: 192.168.0.0/16
  ipipMode: Never
  natOutgoing: true
  nodeSelector: all()
  vxlanMode: CrossSubnet
```

### IPAMBlock

> 定义每个 Node 预分配的 IP 段

```
$ k get ipamblocks.crd.projectcalico.org
NAME               AGE
192-168-185-0-26   3d5h
```

```yaml
apiVersion: crd.projectcalico.org/v1
kind: IPAMBlock
metadata:
  annotations:
    projectcalico.org/metadata: '{"creationTimestamp":null}'
  creationTimestamp: "2022-07-23T12:04:44Z"
  generation: 25
  name: 192-168-185-0-26
  resourceVersion: "6531"
  uid: fcb98ac4-8ff2-49c3-9832-c0d3e7a656d3
spec:
  affinity: host:mac-k8s
  allocations:
  - 0
  - 1
  - null
  - null
  - null
  - null
  - null
  - null
  - 2
  - 3
  - 4
  - 5
  - 6
  - 7
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  - null
  attributes:
  - handle_id: vxlan-tunnel-addr-mac-k8s
    secondary:
      node: mac-k8s
      type: vxlanTunnelAddress
  - handle_id: k8s-pod-network.4bcae222a79b7ef46f048e435d5ab62d41e3a343d00a13da40e931a3e9df1aaa
    secondary:
      namespace: calico-system
      node: mac-k8s
      pod: csi-node-driver-j62g7
      timestamp: 2022-07-23 12:04:45.262852871 +0000 UTC
  - handle_id: k8s-pod-network.ecddecbd8bb0be0bbadc17c37b4ea684badc89bf88daae1920ffbbbd3363ec21
    secondary:
      namespace: calico-apiserver
      node: mac-k8s
      pod: calico-apiserver-5bc5cf4559-9d6dq
      timestamp: 2022-07-26 17:15:08.73997821 +0000 UTC
  - handle_id: k8s-pod-network.7d6e14cf214eb0436a77a72f94030819255bdce7abb177549a078fa436d6e899
    secondary:
      namespace: calico-system
      node: mac-k8s
      pod: csi-node-driver-j62g7
      timestamp: 2022-07-26 17:15:09.429526008 +0000 UTC
  - handle_id: k8s-pod-network.14994dea79206eef6dca3caf2528e786aed6c882b1e03acdbac1d551c67f8909
    secondary:
      namespace: kube-system
      node: mac-k8s
      pod: coredns-7f6cbbb7b8-rr9dr
      timestamp: 2022-07-26 17:15:10.43794577 +0000 UTC
  - handle_id: k8s-pod-network.704b36894705f2aabb5d3802c2071e4ea14cc2963006bd3426f1b7ce6e8b0cde
    secondary:
      namespace: calico-system
      node: mac-k8s
      pod: calico-kube-controllers-6f6579ddff-sq7hz
      timestamp: 2022-07-26 17:15:11.43459441 +0000 UTC
  - handle_id: k8s-pod-network.a31bfee878b49c68c28b36ff9fe4a7e5510639337bdff0c830dc5d37f6b87377
    secondary:
      namespace: kube-system
      node: mac-k8s
      pod: coredns-7f6cbbb7b8-78bwt
      timestamp: 2022-07-26 17:15:13.461429435 +0000 UTC
  - handle_id: k8s-pod-network.6cdce974ca5b8f5c2abc51b7cc2880df73192d440d52a964906c5437ca7eabb0
    secondary:
      namespace: calico-apiserver
      node: mac-k8s
      pod: calico-apiserver-5bc5cf4559-l7m8r
      timestamp: 2022-07-26 17:15:18.491248056 +0000 UTC
  cidr: 192.168.185.0/26
  deleted: false
  sequenceNumber: 1690113884806720496
  sequenceNumberForAllocation:
    "0": 1690113884806720472
    "1": 1690113884806720473
    "7": 1690113884806720479
    "8": 1690113884806720481
    "9": 1690113884806720482
    "10": 1690113884806720483
    "11": 1690113884806720484
    "12": 1690113884806720485
    "13": 1690113884806720486
    "14": 1690113884806720487
    "15": 1690113884806720488
  strictAffinity: false
  unallocated:
  - 16
  - 17
  - 18
  - 19
  - 20
  - 21
  - 22
  - 23
  - 24
  - 25
  - 26
  - 27
  - 28
  - 29
  - 30
  - 31
  - 32
  - 33
  - 34
  - 35
  - 36
  - 37
  - 38
  - 39
  - 40
  - 41
  - 42
  - 43
  - 44
  - 45
  - 46
  - 47
  - 48
  - 49
  - 50
  - 51
  - 52
  - 53
  - 54
  - 55
  - 56
  - 57
  - 58
  - 59
  - 60
  - 61
  - 62
  - 63
  - 7
  - 14
  - 15
  - 5
  - 2
  - 3
  - 6
  - 4
```

### IPAMHandle

> 记录 IP 分配的具体细节

```
$ k run --image=nginx nginx
pod/nginx created

$ k get ipamhandles.crd.projectcalico.org
NAME                                                                               AGE
k8s-pod-network.14994dea79206eef6dca3caf2528e786aed6c882b1e03acdbac1d551c67f8909   22m
k8s-pod-network.6cdce974ca5b8f5c2abc51b7cc2880df73192d440d52a964906c5437ca7eabb0   22m
k8s-pod-network.704b36894705f2aabb5d3802c2071e4ea14cc2963006bd3426f1b7ce6e8b0cde   22m
k8s-pod-network.7d6e14cf214eb0436a77a72f94030819255bdce7abb177549a078fa436d6e899   22m
k8s-pod-network.a31bfee878b49c68c28b36ff9fe4a7e5510639337bdff0c830dc5d37f6b87377   22m
k8s-pod-network.cb07c78e242382171ac035d9b888454f71bb393e788f7feaa7ee13d4ead5cb34   2m10s
k8s-pod-network.ecddecbd8bb0be0bbadc17c37b4ea684badc89bf88daae1920ffbbbd3363ec21   22m
vxlan-tunnel-addr-mac-k8s                                                          3d5h

$ k get po -owide
NAME    READY   STATUS    RESTARTS   AGE   IP               NODE      NOMINATED NODE   READINESS GATES
nginx   1/1     Running   0          79s   192.168.185.16   mac-k8s   <none>           <none>
```

```yaml
apiVersion: crd.projectcalico.org/v1
kind: IPAMHandle
metadata:
  annotations:
    projectcalico.org/metadata: '{"creationTimestamp":null}'
  creationTimestamp: "2022-07-26T17:35:23Z"
  generation: 1
  name: k8s-pod-network.cb07c78e242382171ac035d9b888454f71bb393e788f7feaa7ee13d4ead5cb34
  resourceVersion: "6651"
  uid: 2932b06f-5e97-4d01-a86f-4956a4bfcec7
spec:
  block:
    192.168.185.0/26: 1
  deleted: false
  handleID: k8s-pod-network.cb07c78e242382171ac035d9b888454f71bb393e788f7feaa7ee13d4ead5cb34
```

> 新增记录

```yaml
apiVersion: v1
items:
- apiVersion: crd.projectcalico.org/v1
  kind: IPAMBlock
  metadata:
    annotations:
      projectcalico.org/metadata: '{"creationTimestamp":null}'
    creationTimestamp: "2022-07-23T12:04:44Z"
    generation: 27
    name: 192-168-185-0-26
    resourceVersion: "6653"
    uid: fcb98ac4-8ff2-49c3-9832-c0d3e7a656d3
  spec:
    affinity: host:mac-k8s
    allocations:
    - 0
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - 1
    - 2
    - 3
    - 4
    - 5
    - 6
    - null
    - null
    - 7
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    - null
    attributes:
    - handle_id: vxlan-tunnel-addr-mac-k8s
      secondary:
        node: mac-k8s
        type: vxlanTunnelAddress
    - handle_id: k8s-pod-network.ecddecbd8bb0be0bbadc17c37b4ea684badc89bf88daae1920ffbbbd3363ec21
      secondary:
        namespace: calico-apiserver
        node: mac-k8s
        pod: calico-apiserver-5bc5cf4559-9d6dq
        timestamp: 2022-07-26 17:15:08.73997821 +0000 UTC
    - handle_id: k8s-pod-network.7d6e14cf214eb0436a77a72f94030819255bdce7abb177549a078fa436d6e899
      secondary:
        namespace: calico-system
        node: mac-k8s
        pod: csi-node-driver-j62g7
        timestamp: 2022-07-26 17:15:09.429526008 +0000 UTC
    - handle_id: k8s-pod-network.14994dea79206eef6dca3caf2528e786aed6c882b1e03acdbac1d551c67f8909
      secondary:
        namespace: kube-system
        node: mac-k8s
        pod: coredns-7f6cbbb7b8-rr9dr
        timestamp: 2022-07-26 17:15:10.43794577 +0000 UTC
    - handle_id: k8s-pod-network.704b36894705f2aabb5d3802c2071e4ea14cc2963006bd3426f1b7ce6e8b0cde
      secondary:
        namespace: calico-system
        node: mac-k8s
        pod: calico-kube-controllers-6f6579ddff-sq7hz
        timestamp: 2022-07-26 17:15:11.43459441 +0000 UTC
    - handle_id: k8s-pod-network.a31bfee878b49c68c28b36ff9fe4a7e5510639337bdff0c830dc5d37f6b87377
      secondary:
        namespace: kube-system
        node: mac-k8s
        pod: coredns-7f6cbbb7b8-78bwt
        timestamp: 2022-07-26 17:15:13.461429435 +0000 UTC
    - handle_id: k8s-pod-network.6cdce974ca5b8f5c2abc51b7cc2880df73192d440d52a964906c5437ca7eabb0
      secondary:
        namespace: calico-apiserver
        node: mac-k8s
        pod: calico-apiserver-5bc5cf4559-l7m8r
        timestamp: 2022-07-26 17:15:18.491248056 +0000 UTC
    - handle_id: k8s-pod-network.cb07c78e242382171ac035d9b888454f71bb393e788f7feaa7ee13d4ead5cb34
      secondary:
        namespace: default
        node: mac-k8s
        pod: nginx
        timestamp: 2022-07-26 17:35:23.756365378 +0000 UTC
    cidr: 192.168.185.0/26
    deleted: false
    sequenceNumber: 1690113884806720498
    sequenceNumberForAllocation:
      "0": 1690113884806720472
      "7": 1690113884806720479
      "8": 1690113884806720481
      "9": 1690113884806720482
      "10": 1690113884806720483
      "11": 1690113884806720484
      "12": 1690113884806720485
      "13": 1690113884806720486
      "14": 1690113884806720487
      "15": 1690113884806720488
      "16": 1690113884806720496
    strictAffinity: false
    unallocated:
    - 17
    - 18
    - 19
    - 20
    - 21
    - 22
    - 23
    - 24
    - 25
    - 26
    - 27
    - 28
    - 29
    - 30
    - 31
    - 32
    - 33
    - 34
    - 35
    - 36
    - 37
    - 38
    - 39
    - 40
    - 41
    - 42
    - 43
    - 44
    - 45
    - 46
    - 47
    - 48
    - 49
    - 50
    - 51
    - 52
    - 53
    - 54
    - 55
    - 56
    - 57
    - 58
    - 59
    - 60
    - 61
    - 62
    - 63
    - 7
    - 14
    - 15
    - 5
    - 2
    - 3
    - 6
    - 4
    - 1
kind: List
metadata:
  resourceVersion: ""
  selfLink: ""
```

### 网络连通

```yaml centos.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    run: centos
  name: centos
spec:
  replicas: 1
  selector:
    matchLabels:
      run: centos
  template:
    metadata:
      labels:
        run: centos
    spec:
      containers:
      - command:
        - tail
        - -f
        - /dev/null
        image: centos
        name: centos
```

```
$ k apply -f centos.yaml
deployment.apps/centos created

$ k get po -owide
NAME                      READY   STATUS    RESTARTS   AGE     IP               NODE      NOMINATED NODE   READINESS GATES
centos-67dd9d8678-bxxdv   1/1     Running   0          91s     192.168.185.20   mac-k8s   <none>           <none>
nginx                     1/1     Running   0          2d14h   192.168.185.16   mac-k8s   <none>           <none>
```

> 容器内执行，数据包会到 Mac 地址 `EE:EE:EE:EE:EE:EE`

```
$ k exec -it centos-67dd9d8678-bxxdv -- bash
[root@centos-67dd9d8678-bxxdv /]# ping -c1 192.168.185.16
PING 192.168.185.16 (192.168.185.16) 56(84) bytes of data.
64 bytes from 192.168.185.16: icmp_seq=1 ttl=63 time=0.057 ms

--- 192.168.185.16 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 0.057/0.057/0.057/0.000 ms
[root@centos-67dd9d8678-bxxdv /]#
[root@centos-67dd9d8678-bxxdv /]# ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
3: eth0@if32: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UP group default qlen 1000
    link/ether a6:86:ba:01:06:53 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 192.168.185.20/32 scope global eth0
       valid_lft forever preferred_lft forever
    inet6 fe80::a486:baff:fe01:653/64 scope link
       valid_lft forever preferred_lft forever
[root@centos-67dd9d8678-bxxdv /]#
[root@centos-67dd9d8678-bxxdv /]# ip r
default via 169.254.1.1 dev eth0
169.254.1.1 dev eth0 scope link
[root@centos-67dd9d8678-bxxdv /]# arping 169.254.1.1
ARPING 169.254.1.1 from 192.168.185.20 eth0
Unicast reply from 169.254.1.1 [EE:EE:EE:EE:EE:EE]  0.556ms
Unicast reply from 169.254.1.1 [EE:EE:EE:EE:EE:EE]  0.534ms
^CSent 2 probes (1 broadcast(s))
Received 2 response(s)
[root@centos-67dd9d8678-bxxdv /]#
```

> 宿主上 veth 对应的 Mac 地址也为 `ee:ee:ee:ee:ee:ee`

> 宿主上发现 `192.168.185.16` 对应的是本机上的 `calic440f455693` veth

```
$ ip a
...
32: calica4914fdab0@if3: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UP group default qlen 1000
    link/ether ee:ee:ee:ee:ee:ee brd ff:ff:ff:ff:ff:ff link-netns cni-4fd4e0b7-863d-e095-8460-124c23d7a176
    inet6 fe80::ecee:eeff:feee:eeee/64 scope link
       valid_lft forever preferred_lft forever
       
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
192.168.191.0/24 dev ens160 proto kernel scope link src 192.168.191.153
192.168.191.2 dev ens160 proto dhcp scope link src 192.168.191.153 metric 100

$ ip a
...
26: calic440f455693@if3: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UP group default qlen 1000
    link/ether ee:ee:ee:ee:ee:ee brd ff:ff:ff:ff:ff:ff link-netns cni-02d7ba4f-f888-aa95-479c-b3c2eb0c05b8
    inet6 fe80::ecee:eeff:feee:eeee/64 scope link
       valid_lft forever preferred_lft forever
...
```

> 进入另一个 Pod 确认

```
$ sudo crictl ps
CONTAINER           IMAGE               CREATED             STATE               NAME                        ATTEMPT             POD ID              POD
e422f11ca3b74       e6a0117ec169e       54 minutes ago      Running             centos                      0                   68a89759992ad       centos-67dd9d8678-bxxdv
61a0ff5acdc68       d5dd9023bb474       54 minutes ago      Running             calico-node                 0                   869afd4133b4f       calico-node-2z92v
7d6ad449ae76b       ff78c7a65ec2b       2 days ago          Running             nginx                       0                   cb07c78e24238       nginx
....
```

> sudo crictl inspect 7d6ad449ae76b

```json
{
  "status": {
    "id": "7d6ad449ae76b3166d44ccb50db26fca776353225381820a16dbad3dbbe5861b",
    "metadata": {
      "attempt": 0,
      "name": "nginx"
    },
    "state": "CONTAINER_RUNNING",
    "createdAt": "2022-07-26T17:36:12.783406623Z",
    "startedAt": "2022-07-26T17:36:12.846397022Z",
    "finishedAt": "0001-01-01T00:00:00Z",
    "exitCode": 0,
    "image": {
      "annotations": {},
      "image": "docker.io/library/nginx:latest"
    },
    "imageRef": "docker.io/library/nginx@sha256:67f9a4f10d147a6e04629340e6493c9703300ca23a2f7f3aa56fe615d75d31ca",
    "reason": "",
    "message": "",
    "labels": {
      "io.kubernetes.container.name": "nginx",
      "io.kubernetes.pod.name": "nginx",
      "io.kubernetes.pod.namespace": "default",
      "io.kubernetes.pod.uid": "25fae09f-aef9-4b5a-950f-80ea16cf5e1e"
    },
    "annotations": {
      "io.kubernetes.container.hash": "9624f5a5",
      "io.kubernetes.container.restartCount": "0",
      "io.kubernetes.container.terminationMessagePath": "/dev/termination-log",
      "io.kubernetes.container.terminationMessagePolicy": "File",
      "io.kubernetes.pod.terminationGracePeriod": "30"
    },
    "mounts": [
      {
        "containerPath": "/var/run/secrets/kubernetes.io/serviceaccount",
        "hostPath": "/var/lib/kubelet/pods/25fae09f-aef9-4b5a-950f-80ea16cf5e1e/volumes/kubernetes.io~projected/kube-api-access-75rfs",
        "propagation": "PROPAGATION_PRIVATE",
        "readonly": true,
        "selinuxRelabel": false
      },
      {
        "containerPath": "/etc/hosts",
        "hostPath": "/var/lib/kubelet/pods/25fae09f-aef9-4b5a-950f-80ea16cf5e1e/etc-hosts",
        "propagation": "PROPAGATION_PRIVATE",
        "readonly": false,
        "selinuxRelabel": false
      },
      {
        "containerPath": "/dev/termination-log",
        "hostPath": "/var/lib/kubelet/pods/25fae09f-aef9-4b5a-950f-80ea16cf5e1e/containers/nginx/1616e6f2",
        "propagation": "PROPAGATION_PRIVATE",
        "readonly": false,
        "selinuxRelabel": false
      }
    ],
    "logPath": "/var/log/pods/default_nginx_25fae09f-aef9-4b5a-950f-80ea16cf5e1e/nginx/0.log",
    "resources": {
      "linux": {
        "cpuPeriod": "100000",
        "cpuQuota": "0",
        "cpuShares": "2",
        "cpusetCpus": "",
        "cpusetMems": "",
        "hugepageLimits": [],
        "memoryLimitInBytes": "0",
        "memorySwapLimitInBytes": "0",
        "oomScoreAdj": "1000",
        "unified": {}
      },
      "windows": null
    }
  },
  "info": {
    "sandboxID": "cb07c78e242382171ac035d9b888454f71bb393e788f7feaa7ee13d4ead5cb34",
    "pid": 106728,
    "removing": false,
    "snapshotKey": "7d6ad449ae76b3166d44ccb50db26fca776353225381820a16dbad3dbbe5861b",
    "snapshotter": "overlayfs",
    "runtimeType": "io.containerd.runc.v2",
    "runtimeOptions": {
      "systemd_cgroup": true
    },
    "config": {
      "metadata": {
        "name": "nginx"
      },
      "image": {
        "image": "sha256:ff78c7a65ec2b1fb09f58b27b0dd022ac1f4e16b9bcfe1cbdc18c36f2e0e1842"
      },
      "envs": [
        {
          "key": "KUBERNETES_PORT_443_TCP_PROTO",
          "value": "tcp"
        },
        {
          "key": "KUBERNETES_PORT_443_TCP_PORT",
          "value": "443"
        },
        {
          "key": "KUBERNETES_PORT_443_TCP_ADDR",
          "value": "10.96.0.1"
        },
        {
          "key": "KUBERNETES_SERVICE_HOST",
          "value": "10.96.0.1"
        },
        {
          "key": "KUBERNETES_SERVICE_PORT",
          "value": "443"
        },
        {
          "key": "KUBERNETES_SERVICE_PORT_HTTPS",
          "value": "443"
        },
        {
          "key": "KUBERNETES_PORT",
          "value": "tcp://10.96.0.1:443"
        },
        {
          "key": "KUBERNETES_PORT_443_TCP",
          "value": "tcp://10.96.0.1:443"
        }
      ],
      "mounts": [
        {
          "container_path": "/var/run/secrets/kubernetes.io/serviceaccount",
          "host_path": "/var/lib/kubelet/pods/25fae09f-aef9-4b5a-950f-80ea16cf5e1e/volumes/kubernetes.io~projected/kube-api-access-75rfs",
          "readonly": true
        },
        {
          "container_path": "/etc/hosts",
          "host_path": "/var/lib/kubelet/pods/25fae09f-aef9-4b5a-950f-80ea16cf5e1e/etc-hosts"
        },
        {
          "container_path": "/dev/termination-log",
          "host_path": "/var/lib/kubelet/pods/25fae09f-aef9-4b5a-950f-80ea16cf5e1e/containers/nginx/1616e6f2"
        }
      ],
      "labels": {
        "io.kubernetes.container.name": "nginx",
        "io.kubernetes.pod.name": "nginx",
        "io.kubernetes.pod.namespace": "default",
        "io.kubernetes.pod.uid": "25fae09f-aef9-4b5a-950f-80ea16cf5e1e"
      },
      "annotations": {
        "io.kubernetes.container.hash": "9624f5a5",
        "io.kubernetes.container.restartCount": "0",
        "io.kubernetes.container.terminationMessagePath": "/dev/termination-log",
        "io.kubernetes.container.terminationMessagePolicy": "File",
        "io.kubernetes.pod.terminationGracePeriod": "30"
      },
      "log_path": "nginx/0.log",
      "linux": {
        "resources": {
          "cpu_period": 100000,
          "cpu_shares": 2,
          "oom_score_adj": 1000,
          "hugepage_limits": [
            {
              "page_size": "2MB"
            },
            {
              "page_size": "32MB"
            },
            {
              "page_size": "64KB"
            },
            {
              "page_size": "1GB"
            }
          ]
        },
        "security_context": {
          "namespace_options": {
            "pid": 1
          },
          "run_as_user": {},
          "masked_paths": [
            "/proc/acpi",
            "/proc/kcore",
            "/proc/keys",
            "/proc/latency_stats",
            "/proc/timer_list",
            "/proc/timer_stats",
            "/proc/sched_debug",
            "/proc/scsi",
            "/sys/firmware"
          ],
          "readonly_paths": [
            "/proc/asound",
            "/proc/bus",
            "/proc/fs",
            "/proc/irq",
            "/proc/sys",
            "/proc/sysrq-trigger"
          ],
          "seccomp": {
            "profile_type": 1
          }
        }
      }
    },
    "runtimeSpec": {
      "ociVersion": "1.0.2-dev",
      "process": {
        "user": {
          "uid": 0,
          "gid": 0,
          "additionalGids": [
            0
          ]
        },
        "args": [
          "/docker-entrypoint.sh",
          "nginx",
          "-g",
          "daemon off;"
        ],
        "env": [
          "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
          "HOSTNAME=nginx",
          "NGINX_VERSION=1.25.1",
          "NJS_VERSION=0.7.12",
          "PKG_RELEASE=1~bookworm",
          "KUBERNETES_PORT_443_TCP_PROTO=tcp",
          "KUBERNETES_PORT_443_TCP_PORT=443",
          "KUBERNETES_PORT_443_TCP_ADDR=10.96.0.1",
          "KUBERNETES_SERVICE_HOST=10.96.0.1",
          "KUBERNETES_SERVICE_PORT=443",
          "KUBERNETES_SERVICE_PORT_HTTPS=443",
          "KUBERNETES_PORT=tcp://10.96.0.1:443",
          "KUBERNETES_PORT_443_TCP=tcp://10.96.0.1:443"
        ],
        "cwd": "/",
        "capabilities": {
          "bounding": [
            "CAP_CHOWN",
            "CAP_DAC_OVERRIDE",
            "CAP_FSETID",
            "CAP_FOWNER",
            "CAP_MKNOD",
            "CAP_NET_RAW",
            "CAP_SETGID",
            "CAP_SETUID",
            "CAP_SETFCAP",
            "CAP_SETPCAP",
            "CAP_NET_BIND_SERVICE",
            "CAP_SYS_CHROOT",
            "CAP_KILL",
            "CAP_AUDIT_WRITE"
          ],
          "effective": [
            "CAP_CHOWN",
            "CAP_DAC_OVERRIDE",
            "CAP_FSETID",
            "CAP_FOWNER",
            "CAP_MKNOD",
            "CAP_NET_RAW",
            "CAP_SETGID",
            "CAP_SETUID",
            "CAP_SETFCAP",
            "CAP_SETPCAP",
            "CAP_NET_BIND_SERVICE",
            "CAP_SYS_CHROOT",
            "CAP_KILL",
            "CAP_AUDIT_WRITE"
          ],
          "permitted": [
            "CAP_CHOWN",
            "CAP_DAC_OVERRIDE",
            "CAP_FSETID",
            "CAP_FOWNER",
            "CAP_MKNOD",
            "CAP_NET_RAW",
            "CAP_SETGID",
            "CAP_SETUID",
            "CAP_SETFCAP",
            "CAP_SETPCAP",
            "CAP_NET_BIND_SERVICE",
            "CAP_SYS_CHROOT",
            "CAP_KILL",
            "CAP_AUDIT_WRITE"
          ]
        },
        "apparmorProfile": "cri-containerd.apparmor.d",
        "oomScoreAdj": 1000
      },
      "root": {
        "path": "rootfs"
      },
      "mounts": [
        {
          "destination": "/proc",
          "type": "proc",
          "source": "proc",
          "options": [
            "nosuid",
            "noexec",
            "nodev"
          ]
        },
        {
          "destination": "/dev",
          "type": "tmpfs",
          "source": "tmpfs",
          "options": [
            "nosuid",
            "strictatime",
            "mode=755",
            "size=65536k"
          ]
        },
        {
          "destination": "/dev/pts",
          "type": "devpts",
          "source": "devpts",
          "options": [
            "nosuid",
            "noexec",
            "newinstance",
            "ptmxmode=0666",
            "mode=0620",
            "gid=5"
          ]
        },
        {
          "destination": "/dev/mqueue",
          "type": "mqueue",
          "source": "mqueue",
          "options": [
            "nosuid",
            "noexec",
            "nodev"
          ]
        },
        {
          "destination": "/sys",
          "type": "sysfs",
          "source": "sysfs",
          "options": [
            "nosuid",
            "noexec",
            "nodev",
            "ro"
          ]
        },
        {
          "destination": "/sys/fs/cgroup",
          "type": "cgroup",
          "source": "cgroup",
          "options": [
            "nosuid",
            "noexec",
            "nodev",
            "relatime",
            "ro"
          ]
        },
        {
          "destination": "/etc/hosts",
          "type": "bind",
          "source": "/var/lib/kubelet/pods/25fae09f-aef9-4b5a-950f-80ea16cf5e1e/etc-hosts",
          "options": [
            "rbind",
            "rprivate",
            "rw"
          ]
        },
        {
          "destination": "/dev/termination-log",
          "type": "bind",
          "source": "/var/lib/kubelet/pods/25fae09f-aef9-4b5a-950f-80ea16cf5e1e/containers/nginx/1616e6f2",
          "options": [
            "rbind",
            "rprivate",
            "rw"
          ]
        },
        {
          "destination": "/etc/hostname",
          "type": "bind",
          "source": "/var/lib/containerd/io.containerd.grpc.v1.cri/sandboxes/cb07c78e242382171ac035d9b888454f71bb393e788f7feaa7ee13d4ead5cb34/hostname",
          "options": [
            "rbind",
            "rprivate",
            "rw"
          ]
        },
        {
          "destination": "/etc/resolv.conf",
          "type": "bind",
          "source": "/var/lib/containerd/io.containerd.grpc.v1.cri/sandboxes/cb07c78e242382171ac035d9b888454f71bb393e788f7feaa7ee13d4ead5cb34/resolv.conf",
          "options": [
            "rbind",
            "rprivate",
            "rw"
          ]
        },
        {
          "destination": "/dev/shm",
          "type": "bind",
          "source": "/run/containerd/io.containerd.grpc.v1.cri/sandboxes/cb07c78e242382171ac035d9b888454f71bb393e788f7feaa7ee13d4ead5cb34/shm",
          "options": [
            "rbind",
            "rprivate",
            "rw"
          ]
        },
        {
          "destination": "/var/run/secrets/kubernetes.io/serviceaccount",
          "type": "bind",
          "source": "/var/lib/kubelet/pods/25fae09f-aef9-4b5a-950f-80ea16cf5e1e/volumes/kubernetes.io~projected/kube-api-access-75rfs",
          "options": [
            "rbind",
            "rprivate",
            "ro"
          ]
        }
      ],
      "annotations": {
        "io.kubernetes.cri.container-name": "nginx",
        "io.kubernetes.cri.container-type": "container",
        "io.kubernetes.cri.image-name": "docker.io/library/nginx:latest",
        "io.kubernetes.cri.sandbox-id": "cb07c78e242382171ac035d9b888454f71bb393e788f7feaa7ee13d4ead5cb34",
        "io.kubernetes.cri.sandbox-name": "nginx",
        "io.kubernetes.cri.sandbox-namespace": "default",
        "io.kubernetes.cri.sandbox-uid": "25fae09f-aef9-4b5a-950f-80ea16cf5e1e"
      },
      "linux": {
        "resources": {
          "devices": [
            {
              "allow": false,
              "access": "rwm"
            }
          ],
          "memory": {},
          "cpu": {
            "shares": 2,
            "period": 100000
          }
        },
        "cgroupsPath": "kubepods-besteffort-pod25fae09f_aef9_4b5a_950f_80ea16cf5e1e.slice:cri-containerd:7d6ad449ae76b3166d44ccb50db26fca776353225381820a16dbad3dbbe5861b",
        "namespaces": [
          {
            "type": "pid"
          },
          {
            "type": "ipc",
            "path": "/proc/105758/ns/ipc"
          },
          {
            "type": "uts",
            "path": "/proc/105758/ns/uts"
          },
          {
            "type": "mount"
          },
          {
            "type": "network",
            "path": "/proc/105758/ns/net"
          }
        ],
        "maskedPaths": [
          "/proc/acpi",
          "/proc/kcore",
          "/proc/keys",
          "/proc/latency_stats",
          "/proc/timer_list",
          "/proc/timer_stats",
          "/proc/sched_debug",
          "/proc/scsi",
          "/sys/firmware"
        ],
        "readonlyPaths": [
          "/proc/asound",
          "/proc/bus",
          "/proc/fs",
          "/proc/irq",
          "/proc/sys",
          "/proc/sysrq-trigger"
        ]
      }
    }
  }
}
```

```
$ sudo nsenter -t 106728 -n ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
3: eth0@if26: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UP group default qlen 1000
    link/ether 4a:86:d5:a8:f4:f5 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 192.168.185.16/32 scope global eth0
       valid_lft forever preferred_lft forever
    inet6 fe80::4886:d5ff:fea8:f4f5/64 scope link
       valid_lft forever preferred_lft forever
       
$ sudo nsenter -t 106728 -n ip r
default via 169.254.1.1 dev eth0
169.254.1.1 dev eth0 scope link

$ sudo nsenter -t 106728 -n arp
Address                  HWtype  HWaddress           Flags Mask            Iface
169.254.1.1              ether   ee:ee:ee:ee:ee:ee   C                     eth0

$ ip link
...
26: calic440f455693@if3: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UP mode DEFAULT group default qlen 1000
    link/ether ee:ee:ee:ee:ee:ee brd ff:ff:ff:ff:ff:ff link-netns cni-02d7ba4f-f888-aa95-479c-b3c2eb0c05b8
...
```

### 跨主机路由

> IDC -> Node

1. 每个 `Node` 会运行一个 `bird` Deamon
2. 不同的 Node 上的 bird 会保持一个`长连接`，然后`交换路由信息`（将 Node 模拟成一个`路由器`）

## 对比

> 生产：`Calico` / `Cilium`

|          | 网络策略 | IPV6 | 网络层级                    | 部署方式    | 命令行    |
| -------- | -------- | ---- | --------------------------- | ----------- | --------- |
| Flannel  | N        | N    | L2 - `VXLAN`                | `DaemonSet` |           |
| Weave    | Y        | Y    | L2 - VXLAN                  | DaemonSet   |           |
| `Calico` | `Y`      | Y    | L3 - `IPinIP / VXLAN / BGP` | `DaemonSet` | calicoctl |
| `Cilium` | Y        | Y    | L3/L4 + L7(filtering)       | DaemonSet   | cilium    |
