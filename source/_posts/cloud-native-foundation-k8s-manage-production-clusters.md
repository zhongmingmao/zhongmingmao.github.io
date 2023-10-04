---
title: Kubernetes - Manage Production Clusters
mathjax: false
date: 2022-12-13 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/2bc58949d451b7e5f8f8759c44d962d01b2ed48d-1108x1108.webp
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
---



# 操作系统

> 通用操作系统 - 成熟

1. Ubuntu
2. CentOS
3. Fedora

<!-- more -->

> 专为容器优化的操作系统 - 最小化主机操作系统

1. CoreOS
   - 最早的容器化操作系统，已被收购
2. `RedHat Atomic`
   - 将 `RPM Repository` 转换成 `ostree`，可以被 `bootloader` 直接加载
3. Snappy Ubuntu Core
   - Canonical 出品，最初为`移动设备`设计
4. RancherOS
   - 相对较新，RancherOS 中运行的所有服务都是 `Docker` 容器

> 评估选型的标准

1. 是否有生态系统
2. 成熟度
3. 内核版本
4. 对运行时的支持
5. Init System
6. 包管理和系统升级
7. 安全

> 不可变基础设施

1. 不可变的`容器镜像`
2. 不可变的`主机操作系统`

> Atomic - 打包成一个经过`裁剪`后的操作系统

1. 由 Red Hat 支持的`软件包安装系统`
2. 多种发行版：Fedora / CentOS / RHEL
3. 优势
   - `不可变操作系统`，面向`容器`优化的基础设施
     - 只有 `/etc` 和 `/var` 可以修改，其它目录均为`只读`
   - 基于 `rpm-ostree` 管理系统包
     - `IaC`：输入 `rpm 源`，生成一个 `ostree`，ostree 可以被 `bootloader` 加载为一个 `OS`
     - 支持操作系统升级和回滚的`原子`操作

> 最小化主机操作系统

1. 只安装`必要`（支持系统运行的最小工具集）的工具
   - 任何`调试工具`（性能排查、网络排查工具），均可以后期以`容器`形式运行
2. 优势：`性能` / `稳定性` / `安全保障`

> 操作系统的构建流程

> rpm-ostree 构建最小化主机系统，buildah 构建调试工具（K8S Node 按需拉取）

![build-os](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/build-os.png)

> 提供将 `ostree` 部署进 `bootloader` 的机制
> https://github.com/ostreedev/ostree/blob/main/src/boot/dracut/module-setup.sh

```sh
install() {
    dracut_install /usr/lib/ostree/ostree-prepare-root
    for r in /usr/lib /etc; do
        if test -f "$r/ostree/prepare-root.conf"; then
            inst_simple "$r/ostree/prepare-root.conf"
        fi
    done
    if test -f "/etc/ostree/initramfs-root-binding.key"; then
        inst_simple "/etc/ostree/initramfs-root-binding.key"
    fi
    inst_simple "${systemdsystemunitdir}/ostree-prepare-root.service"
    mkdir -p "${initdir}${systemdsystemconfdir}/initrd-root-fs.target.wants"
    ln_r "${systemdsystemunitdir}/ostree-prepare-root.service" \
        "${systemdsystemconfdir}/initrd-root-fs.target.wants/ostree-prepare-root.service"
}
```

> 根据 `treefile` 构建 `ostree` - 类似于 docker 根据 Dockerfile 构建 image	

![image-20231002141928497](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231002141928497.png)

```
$ rpm-ostree compose tree --unified-core --cachedir=cache --repo=./build-repo/path/to/treefile.json
```

> bootloader 加载 ostree

![image-20231002142557498](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231002142557498.png)

1. 初始化项目
   - ostree admin os-init centos-atomic-host
2. 导入 ostree repo - 见上图
   - ostree remote add atomic http://ostree.svr/ostree
3. 拉取 ostree
   - ostree pull atomic centos-atomic-host/8/x86_64/standard
4. 部署 OS
   - ostree admin deploy --os=centos-atomic-host centos-atomic-host/8/x86_64/standard --karg='root=/dev/atomicos/root'

> 操作系统加载

1. 物理机
   - 物理机通常需要通过 `foreman` 启动，foreman 通过 `pxe boot` 并加载 `kickstart`
   - `kickstart` 通过 `ostree deploy` 即可完成操作系统的部署
2. 虚拟机
   - 需要通过镜像工具将 ostree 构建成对应格式

# 节点资源

## NUMA

> `Non-Uniform Memory Access` 是一种内存访问方式，是为多处理器计算机设计的内存架构

> `FSB` - Front Side Bus; `QPI` - QuickPath Interconnect

![image-20231002151509749](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231002151509749.png)

## 状态上报

> kubelet 周期性地向 `API Server` 进行汇报，并更新 `Node` 的`健康`和`资源`使用信息

1. Node 基础信息
   - IP 地址、操作系统、内核、CRI、kubelet、kube-proxy 版本信息
2. Node 资源信息
   - CPU、内存、HugePage、临时存储、GPU 等，以及这些资源中可以分配给容器使用的部分
3. `kube-scheduler` 在为 Pod 选择 Node 时会将 Node 的状态信息作为依据

| Status               | Desc                      |
| -------------------- | ------------------------- |
| `Ready`              | Node 是否健康             |
| `MemoryPressure`     | Node 是否存在内存压力     |
| `PIDPressure`        | Node 是否存在比较多的进程 |
| `DiskPressure`       | Node 是否存在磁盘压力     |
| `NetworkUnavailable` | Node 网络配置是否正确     |

```yaml
apiVersion: v1
kind: Node
metadata:
  annotations:
    csi.volume.kubernetes.io/nodeid: '{"csi.tigera.io":"mac-k8s"}'
    kubeadm.alpha.kubernetes.io/cri-socket: /var/run/dockershim.sock
    node.alpha.kubernetes.io/ttl: "0"
    projectcalico.org/IPv4Address: 192.168.191.153/24
    projectcalico.org/IPv4VXLANTunnelAddr: 192.168.185.0
    volumes.kubernetes.io/controller-managed-attach-detach: "true"
  creationTimestamp: "2022-08-28T06:45:49Z"
  labels:
    beta.kubernetes.io/arch: arm64
    beta.kubernetes.io/os: linux
    kubernetes.io/arch: arm64
    kubernetes.io/hostname: mac-k8s
    kubernetes.io/os: linux
    node-role.kubernetes.io/control-plane: ""
    node-role.kubernetes.io/master: ""
    node.kubernetes.io/exclude-from-external-load-balancers: ""
  name: mac-k8s
  resourceVersion: "6775"
  uid: b5720267-7927-4b62-8184-d3371f7c76ff
spec:
  podCIDR: 192.168.0.0/24
  podCIDRs:
  - 192.168.0.0/24
status:
  addresses:
  - address: 192.168.191.153
    type: InternalIP
  - address: mac-k8s
    type: Hostname
  allocatable:
    cpu: "4"
    ephemeral-storage: "28819139742"
    hugepages-1Gi: "0"
    hugepages-2Mi: "0"
    hugepages-32Mi: "0"
    hugepages-64Ki: "0"
    memory: 12134168Ki
    pods: "110"
  capacity:
    cpu: "4"
    ephemeral-storage: 31270768Ki
    hugepages-1Gi: "0"
    hugepages-2Mi: "0"
    hugepages-32Mi: "0"
    hugepages-64Ki: "0"
    memory: 12236568Ki
    pods: "110"
  conditions:
  - lastHeartbeatTime: "2022-08-29T00:53:17Z"
    lastTransitionTime: "2022-08-29T00:53:17Z"
    message: Calico is running on this node
    reason: CalicoIsUp
    status: "False"
    type: NetworkUnavailable
  - lastHeartbeatTime: "2022-08-29T00:51:36Z"
    lastTransitionTime: "2022-08-28T06:45:47Z"
    message: kubelet has sufficient memory available
    reason: KubeletHasSufficientMemory
    status: "False"
    type: MemoryPressure
  - lastHeartbeatTime: "2022-08-29T00:51:36Z"
    lastTransitionTime: "2022-08-28T06:45:47Z"
    message: kubelet has no disk pressure
    reason: KubeletHasNoDiskPressure
    status: "False"
    type: DiskPressure
  - lastHeartbeatTime: "2022-08-29T00:51:36Z"
    lastTransitionTime: "2022-08-28T06:45:47Z"
    message: kubelet has sufficient PID available
    reason: KubeletHasSufficientPID
    status: "False"
    type: PIDPressure
  - lastHeartbeatTime: "2022-08-29T00:51:36Z"
    lastTransitionTime: "2022-08-28T06:49:06Z"
    message: kubelet is posting ready status. AppArmor enabled
    reason: KubeletReady
    status: "True"
    type: Ready
  daemonEndpoints:
    kubeletEndpoint:
      Port: 10250
  images:
  - names:
    - centos@sha256:a27fd8080b517143cbbbab9dfb7c8571c40d67d534bbdee55bd6c473f432b177
    - centos:latest
    sizeBytes: 271506418
  - names:
    - calico/node@sha256:8e34517775f319917a0be516ed3a373dbfca650d1ee8e72158087c24356f47fb
    - calico/node:v3.26.1
    sizeBytes: 257943189
  - names:
    - calico/cni@sha256:3be3c67ddba17004c292eafec98cc49368ac273b40b27c8a6621be4471d348d6
    - calico/cni:v3.26.1
    sizeBytes: 199481277
  - names:
    - nginx@sha256:104c7c5c54f2685f0f46f3be607ce60da7085da3eaa5ad22d3d9f01594295e9c
    - nginx:1.25.2
    sizeBytes: 192063326
  - names:
    - registry.aliyuncs.com/google_containers/kube-apiserver@sha256:b8eba88862bab7d3d7cdddad669ff1ece006baa10d3a3df119683434497a0949
    - registry.aliyuncs.com/google_containers/kube-apiserver:v1.23.3
    sizeBytes: 132450723
  - names:
    - registry.aliyuncs.com/google_containers/etcd@sha256:64b9ea357325d5db9f8a723dcf503b5a449177b17ac87d69481e126bb724c263
    - registry.aliyuncs.com/google_containers/etcd:3.5.1-0
    sizeBytes: 132115484
  - names:
    - registry.aliyuncs.com/google_containers/kube-controller-manager@sha256:b721871d9a9c55836cbcbb2bf375e02696260628f73620b267be9a9a50c97f5a
    - registry.aliyuncs.com/google_containers/kube-controller-manager:v1.23.3
    sizeBytes: 122423990
  - names:
    - registry.aliyuncs.com/google_containers/kube-proxy@sha256:def87f007b49d50693aed83d4703d0e56c69ae286154b1c7a20cd1b3a320cf7c
    - registry.aliyuncs.com/google_containers/kube-proxy:v1.23.3
    sizeBytes: 109183127
  - names:
    - calico/apiserver@sha256:8040d37d7038ec4a24b5d670526c7a1da432f825e6aad1cb4ea1fc24cb13fc1e
    - calico/apiserver:v3.26.1
    sizeBytes: 87865689
  - names:
    - calico/kube-controllers@sha256:01ce29ea8f2b34b6cef904f526baed98db4c0581102f194e36f2cd97943f77aa
    - calico/kube-controllers:v3.26.1
    sizeBytes: 68842373
  - names:
    - quay.io/tigera/operator@sha256:780eeab342e62bd200e533a960b548216b23b8bde7a672c4527f29eec9ce2d79
    - quay.io/tigera/operator:v1.30.4
    sizeBytes: 64946658
  - names:
    - calico/typha@sha256:54ec33e1e6a6f2a7694b29e7101934ba75752e0c4543ee988a4015ce0caa7b99
    - calico/typha:v3.26.1
    sizeBytes: 61869924
  - names:
    - registry.aliyuncs.com/google_containers/kube-scheduler@sha256:32308abe86f7415611ca86ee79dd0a73e74ebecb2f9e3eb85fc3a8e62f03d0e7
    - registry.aliyuncs.com/google_containers/kube-scheduler:v1.23.3
    sizeBytes: 52955871
  - names:
    - registry.aliyuncs.com/google_containers/coredns@sha256:5b6ec0d6de9baaf3e92d0f66cd96a25b9edbce8716f5f15dcd1a616b3abd590e
    - registry.aliyuncs.com/google_containers/coredns:v1.8.6
    sizeBytes: 46808803
  - names:
    - calico/node-driver-registrar@sha256:fb4dc4863c20b7fe1e9dd5e52dcf004b74e1af07d783860a08ddc5c50560f753
    - calico/node-driver-registrar:v3.26.1
    sizeBytes: 23206723
  - names:
    - calico/csi@sha256:4e05036f8ad1c884ab52cae0f1874839c27c407beaa8f008d7a28d113ad9e5ed
    - calico/csi:v3.26.1
    sizeBytes: 18731350
  - names:
    - calico/pod2daemon-flexvol@sha256:2aefd77a4f8289c88cfe24c0db38822de3132292d1ea4ac9192abc9583e4b54c
    - calico/pod2daemon-flexvol:v3.26.1
    sizeBytes: 10707389
  - names:
    - registry.aliyuncs.com/google_containers/pause@sha256:3d380ca8864549e74af4b29c10f9cb0956236dfb01c40ca076fb6c37253234db
    - registry.aliyuncs.com/google_containers/pause:3.6
    sizeBytes: 483864
  nodeInfo:
    architecture: arm64
    bootID: 99afea12-0e3a-44a8-b226-085479b8ab7f
    containerRuntimeVersion: docker://20.10.24
    kernelVersion: 5.4.0-156-generic
    kubeProxyVersion: v1.23.3
    kubeletVersion: v1.23.3
    machineID: 3bbd7f943eb34ff39f80a87bfa2037de
    operatingSystem: linux
    osImage: Ubuntu 20.04.5 LTS
    systemUUID: 598a4d56-54c5-9aff-c38f-732f7662da29
```

### Lease - 心跳

> `分离`健康信息和资源信息，两者`变更频率`不一样，降低 `API Server` 和 `etcd` 的访问压力

> Lease 主要用于 `Leader Election`

1. 早期的 kubelet 的状态上报会包含`健康信息`和`资源信息`
   - 直接更新 Node 对象，`传输的数据包较大`，给 API Server 和 etcd 造成压力
2. 后来引入 `Lease` 对象来保存`健康信息`
   - 在 `leaseDurationSeconds` （40 秒）周期内，如果 Lease 对象没有被更新，则对应的 Node 会被判定为`不健康`

```
$ k get leases.coordination.k8s.io -A
NAMESPACE         NAME                      HOLDER                                         AGE
kube-node-lease   mac-k8s                   mac-k8s                                        35d
kube-system       kube-controller-manager   mac-k8s_99a2c279-255d-4852-9726-df6765860ee3   35d
kube-system       kube-scheduler            mac-k8s_f0363af9-296c-413a-9f8f-a109c7514424   35d
tigera-operator   operator-lock             mac-k8s_70e03794-d7bb-4aef-8a09-da07a5e233be   35d
```

```yaml
apiVersion: coordination.k8s.io/v1
kind: Lease
metadata:
  creationTimestamp: "2022-08-28T06:45:52Z"
  name: mac-k8s
  namespace: kube-node-lease
  ownerReferences:
  - apiVersion: v1
    kind: Node
    name: mac-k8s
    uid: b5720267-7927-4b62-8184-d3371f7c76ff
  resourceVersion: "8703"
  uid: 4b7e1699-c3bb-4a91-a549-d53cb08720aa
spec:
  holderIdentity: mac-k8s
  leaseDurationSeconds: 40
  renewTime: "2022-10-02T07:53:01.455032Z"
```

## 资源预留

1. Node 除了用户容器外，还存在很多支撑系统运行的基础服务（未被容器化），需要为这些基础服务预留资源
   - 如 systemd、journald、sshd、dockerd、containerd、kubelet 等
2. kubelet 可以通过启动参数为系统预留 `CPU`、`内存`、`PID` 等资源，如 `SystemdReserved` / `KubeReserved` 等

### Capacity / Allocatable

> capacity = kube-reserved + systemd-reserved + `eviction-threshold` + allocatable

1. Capacity - `kubelet` 获取的 Node 当前的资源信息
2. Allocatable - Pod 可用的资源

> The proc filesystem is a `pseudo-filesystem` which provides an interface to `kernel data structures`.

| Capacity            | Desc                                          |
| ------------------- | --------------------------------------------- |
| `cpu`               | 从 `/proc/cpuinfo` 文件中获取的 Node CPU 核数 |
| `memory`            | 从 `/proc/meminfo` 文件中获取的 Node 内存大小 |
| `ephemeral-storage` | Node `根分区`的大小                           |

> cpu - 4

```
$ cat /proc/cpuinfo
processor	: 0
BogoMIPS	: 48.00
Features	: fp asimd evtstrm aes pmull sha1 sha2 crc32 atomics fphp asimdhp cpuid asimdrdm jscvt fcma lrcpc dcpop sha3 asimddp sha512 asimdfhm dit uscat ilrcpc flagm ssbs sb paca pacg dcpodp flagm2 frint
CPU implementer	: 0x61
CPU architecture: 8
CPU variant	: 0x0
CPU part	: 0x000
CPU revision	: 0

processor	: 1
BogoMIPS	: 48.00
Features	: fp asimd evtstrm aes pmull sha1 sha2 crc32 atomics fphp asimdhp cpuid asimdrdm jscvt fcma lrcpc dcpop sha3 asimddp sha512 asimdfhm dit uscat ilrcpc flagm ssbs sb paca pacg dcpodp flagm2 frint
CPU implementer	: 0x61
CPU architecture: 8
CPU variant	: 0x0
CPU part	: 0x000
CPU revision	: 0

processor	: 2
BogoMIPS	: 48.00
Features	: fp asimd evtstrm aes pmull sha1 sha2 crc32 atomics fphp asimdhp cpuid asimdrdm jscvt fcma lrcpc dcpop sha3 asimddp sha512 asimdfhm dit uscat ilrcpc flagm ssbs sb paca pacg dcpodp flagm2 frint
CPU implementer	: 0x61
CPU architecture: 8
CPU variant	: 0x0
CPU part	: 0x000
CPU revision	: 0

processor	: 3
BogoMIPS	: 48.00
Features	: fp asimd evtstrm aes pmull sha1 sha2 crc32 atomics fphp asimdhp cpuid asimdrdm jscvt fcma lrcpc dcpop sha3 asimddp sha512 asimdfhm dit uscat ilrcpc flagm ssbs sb paca pacg dcpodp flagm2 frint
CPU implementer	: 0x61
CPU architecture: 8
CPU variant	: 0x0
CPU part	: 0x000
CPU revision	: 0
```

> memory - 12236568 KB

```
$ cat /proc/meminfo
MemTotal:       12236568 kB
MemFree:         6943060 kB
MemAvailable:   10735672 kB
Buffers:          120596 kB
Cached:          3660396 kB
SwapCached:            0 kB
Active:          2161224 kB
Inactive:        2646200 kB
Active(anon):    1024828 kB
Inactive(anon):     1396 kB
Active(file):    1136396 kB
Inactive(file):  2644804 kB
Unevictable:       16860 kB
Mlocked:           16860 kB
SwapTotal:             0 kB
SwapFree:              0 kB
Dirty:               308 kB
Writeback:             0 kB
AnonPages:       1021448 kB
Mapped:           714368 kB
Shmem:              4096 kB
KReclaimable:     234800 kB
Slab:             395716 kB
SReclaimable:     234800 kB
SUnreclaim:       160916 kB
KernelStack:       15360 kB
PageTables:        12640 kB
NFS_Unstable:          0 kB
Bounce:                0 kB
WritebackTmp:          0 kB
CommitLimit:     6118284 kB
Committed_AS:    4699004 kB
VmallocTotal:   135290159040 kB
VmallocUsed:       27128 kB
VmallocChunk:          0 kB
Percpu:             4880 kB
HardwareCorrupted:     0 kB
AnonHugePages:     30720 kB
ShmemHugePages:        0 kB
ShmemPmdMapped:        0 kB
FileHugePages:         0 kB
FilePmdMapped:         0 kB
CmaTotal:          32768 kB
CmaFree:           29552 kB
HugePages_Total:       0
HugePages_Free:        0
HugePages_Rsvd:        0
HugePages_Surp:        0
Hugepagesize:       2048 kB
Hugetlb:               0 kB
```

> ephemeral-storage - 31270768 KB

```
$ df
Filesystem                        1K-blocks     Used Available Use% Mounted on
udev                                6056668        0   6056668   0% /dev
tmpfs                               1223660     3928   1219732   1% /run
/dev/mapper/ubuntu--vg-ubuntu--lv  31270768 10061512  19595228  34% /
tmpfs                               6118284        0   6118284   0% /dev/shm
tmpfs                                  5120        0      5120   0% /run/lock
tmpfs                               6118284        0   6118284   0% /sys/fs/cgroup
/dev/nvme0n1p2                      1992552   109200   1762112   6% /boot
/dev/nvme0n1p1                      1098632     6452   1092180   1% /boot/efi
/dev/loop0                            59264    59264         0 100% /snap/core20/1614
/dev/loop1                            62592    62592         0 100% /snap/lxd/22761
/dev/loop3                            94208    94208         0 100% /snap/lxd/24065
/dev/loop2                            41728    41728         0 100% /snap/snapd/16299
tmpfs                               1223656        0   1223656   0% /run/user/1000
/dev/loop4                            60800    60800         0 100% /snap/core20/2019
```

> Kubernetes 认为 CPU 是`可压缩`资源，`无需预留`

```yaml
status:
  allocatable:
    cpu: "4"
    ephemeral-storage: "28819139742"
    hugepages-1Gi: "0"
    hugepages-2Mi: "0"
    hugepages-32Mi: "0"
    hugepages-64Ki: "0"
    memory: 12134168Ki
    pods: "110"
  capacity:
    cpu: "4"
    ephemeral-storage: 31270768Ki
    hugepages-1Gi: "0"
    hugepages-2Mi: "0"
    hugepages-32Mi: "0"
    hugepages-64Ki: "0"
    memory: 12236568Ki
    pods: "110"
```

## 磁盘管理

| Type                                                         | Desc                        |
| ------------------------------------------------------------ | --------------------------- |
| `nodefs`<br />系统分区（Pod DataDir）                        | `工作目录` + `容器日志`     |
| `imagefs`<br />容器运行时分区（可选，取决于 CRI 实现，可以合并到 nodefs ） | `镜像只读层` + `容器可写层` |

> nodefs - Pod DataDir - `/var/lib/kubelet/pods`

```
$ k get po -owide
NAME    READY   STATUS    RESTARTS   AGE     IP               NODE      NOMINATED NODE   READINESS GATES
nginx   1/1     Running   0          4m44s   192.168.185.13   mac-k8s   <none>           <none>

$ docker ps -a | grep nginx
9b4c6b0c1f95   ab73c7fd6723                                        "/docker-entrypoint.…"   5 minutes ago   Up 5 minutes                         k8s_nginx_nginx_default_1fb6d802-64a8-41a4-b1a2-83f12578a097_0
e2b0bace9857   registry.aliyuncs.com/google_containers/pause:3.6   "/pause"                 5 minutes ago   Up 5 minutes                         k8s_POD_nginx_default_1fb6d802-64a8-41a4-b1a2-83f12578a097_0

$ docker inspect 9b4c6b0c1f95
...
        "HostsPath": "/var/lib/kubelet/pods/1fb6d802-64a8-41a4-b1a2-83f12578a097/etc-hosts",
...
        "HostConfig": {
            "Binds": [
                "/var/lib/kubelet/pods/1fb6d802-64a8-41a4-b1a2-83f12578a097/volumes/kubernetes.io~projected/kube-api-access-htqj4:/var/run/secrets/kubernetes.io/serviceaccount:ro",
                "/var/lib/kubelet/pods/1fb6d802-64a8-41a4-b1a2-83f12578a097/etc-hosts:/etc/hosts",
                "/var/lib/kubelet/pods/1fb6d802-64a8-41a4-b1a2-83f12578a097/containers/nginx/807edcc4:/dev/termination-log"
            ],
...
        "Mounts": [
            {
                "Type": "bind",
                "Source": "/var/lib/kubelet/pods/1fb6d802-64a8-41a4-b1a2-83f12578a097/volumes/kubernetes.io~projected/kube-api-access-htqj4",
                "Destination": "/var/run/secrets/kubernetes.io/serviceaccount",
                "Mode": "ro",
                "RW": false,
                "Propagation": "rprivate"
            },
            {
                "Type": "bind",
                "Source": "/var/lib/kubelet/pods/1fb6d802-64a8-41a4-b1a2-83f12578a097/etc-hosts",
                "Destination": "/etc/hosts",
                "Mode": "",
                "RW": true,
                "Propagation": "rprivate"
            },
            {
                "Type": "bind",
                "Source": "/var/lib/kubelet/pods/1fb6d802-64a8-41a4-b1a2-83f12578a097/containers/nginx/807edcc4",
                "Destination": "/dev/termination-log",
                "Mode": "",
                "RW": true,
                "Propagation": "rprivate"
            }
        ],         
...

$ tree /var/lib/kubelet/pods/1fb6d802-64a8-41a4-b1a2-83f12578a097
/var/lib/kubelet/pods/1fb6d802-64a8-41a4-b1a2-83f12578a097
├── containers
│   └── nginx
│       └── 807edcc4
├── etc-hosts
├── plugins
│   └── kubernetes.io~empty-dir
│       └── wrapped_kube-api-access-htqj4
│           └── ready
└── volumes
    └── kubernetes.io~projected
        └── kube-api-access-htqj4
            ├── ca.crt -> ..data/ca.crt
            ├── namespace -> ..data/namespace
            └── token -> ..data/token
```

> imagefs(CRI) - `/var/lib/docker/overlay2`

```
$ docker inspect nginx:1.25.2
...
        "GraphDriver": {
            "Data": {
                "LowerDir": "/var/lib/docker/overlay2/2b3338c595a735d306d5a3d6ef526b785d61242d6e6601e4ba1eb91fea212ae4/diff:/var/lib/docker/overlay2/6f583281737256bda0ab291b2e16243458e09d76c234b6044fac442cf37e949c/diff:/var/lib/docker/overlay2/0bab1cfc61d232958d69e9eb5623421d5869b8085060c4f9d33e32323c8d1c96/diff:/var/lib/docker/overlay2/ceb0576a280c2350f4359bba9687991e7a1e6afc8fe3b212269e2591e1e213f5/diff:/var/lib/docker/overlay2/b1dfbb1cbfda3b344da3a15c74522e46465a0e67b7220cea4a4d1aa1cd5144c2/diff:/var/lib/docker/overlay2/af1748caeab3243da786f13878790cd3a0a10f25e97898adb7af19de55dde62b/diff",
                "MergedDir": "/var/lib/docker/overlay2/53b48d720d0899c1da2ab07d970b2a633b04cba0f56cfbfc9ba71d4427b57da8/merged",
                "UpperDir": "/var/lib/docker/overlay2/53b48d720d0899c1da2ab07d970b2a633b04cba0f56cfbfc9ba71d4427b57da8/diff",
                "WorkDir": "/var/lib/docker/overlay2/53b48d720d0899c1da2ab07d970b2a633b04cba0f56cfbfc9ba71d4427b57da8/work"
            },
            "Name": "overlay2"
        },
...

$ sudo ls /var/lib/docker/overlay2/53b48d720d0899c1da2ab07d970b2a633b04cba0f56cfbfc9ba71d4427b57da8
committed  diff  link  lower  work
```

> `容器可写层`依然是基于 `Overlay2`，性能较差

```
$ k get po
NAME    READY   STATUS    RESTARTS   AGE
nginx   1/1     Running   0          13m

$ k exec -it nginx -- sh
# pwd
/
#
# touch a.txt
#

$ docker ps -a | grep nginx
9b4c6b0c1f95   ab73c7fd6723                                        "/docker-entrypoint.…"   16 minutes ago   Up 16 minutes                         k8s_nginx_nginx_default_1fb6d802-64a8-41a4-b1a2-83f12578a097_0
e2b0bace9857   registry.aliyuncs.com/google_containers/pause:3.6   "/pause"                 16 minutes ago   Up 16 minutes                         k8s_POD_nginx_default_1fb6d802-64a8-41a4-b1a2-83f12578a097_0

$ docker inspect 9b4c6b0c1f95
...
        "GraphDriver": {
            "Data": {
                "LowerDir": "/var/lib/docker/overlay2/00cbfdd33b861e0d380de1ec5533ec5990cf93144fd7dd53f27b1160d93d8065-init/diff:/var/lib/docker/overlay2/53b48d720d0899c1da2ab07d970b2a633b04cba0f56cfbfc9ba71d4427b57da8/diff:/var/lib/docker/overlay2/2b3338c595a735d306d5a3d6ef526b785d61242d6e6601e4ba1eb91fea212ae4/diff:/var/lib/docker/overlay2/6f583281737256bda0ab291b2e16243458e09d76c234b6044fac442cf37e949c/diff:/var/lib/docker/overlay2/0bab1cfc61d232958d69e9eb5623421d5869b8085060c4f9d33e32323c8d1c96/diff:/var/lib/docker/overlay2/ceb0576a280c2350f4359bba9687991e7a1e6afc8fe3b212269e2591e1e213f5/diff:/var/lib/docker/overlay2/b1dfbb1cbfda3b344da3a15c74522e46465a0e67b7220cea4a4d1aa1cd5144c2/diff:/var/lib/docker/overlay2/af1748caeab3243da786f13878790cd3a0a10f25e97898adb7af19de55dde62b/diff",
                "MergedDir": "/var/lib/docker/overlay2/00cbfdd33b861e0d380de1ec5533ec5990cf93144fd7dd53f27b1160d93d8065/merged",
                "UpperDir": "/var/lib/docker/overlay2/00cbfdd33b861e0d380de1ec5533ec5990cf93144fd7dd53f27b1160d93d8065/diff",
                "WorkDir": "/var/lib/docker/overlay2/00cbfdd33b861e0d380de1ec5533ec5990cf93144fd7dd53f27b1160d93d8065/work"
            },
            "Name": "overlay2"
        },
...

$ find /var/lib/docker/overlay2/00cbfdd33b861e0d380de1ec5533ec5990cf93144fd7dd53f27b1160d93d8065 -name 'a.txt'
/var/lib/docker/overlay2/00cbfdd33b861e0d380de1ec5533ec5990cf93144fd7dd53f27b1160d93d8065/diff/a.txt
/var/lib/docker/overlay2/00cbfdd33b861e0d380de1ec5533ec5990cf93144fd7dd53f27b1160d93d8065/merged/a.txt

$ tree /var/lib/docker/overlay2/00cbfdd33b861e0d380de1ec5533ec5990cf93144fd7dd53f27b1160d93d8065-init
/var/lib/docker/overlay2/00cbfdd33b861e0d380de1ec5533ec5990cf93144fd7dd53f27b1160d93d8065-init
├── committed
├── diff
│   ├── dev
│   │   ├── console
│   │   ├── pts
│   │   └── shm
│   └── etc
│       ├── hostname
│       ├── hosts
│       ├── mtab -> /proc/mounts
│       └── resolv.conf
├── link
├── lower
└── work
    └── work
```

## 驱逐管理

1. kubelet 会在`系统资源不够`时终止一些容器进程，来空出一些系统资源，保证 Node 的稳定性
2. 由 `kubelet` 发起的驱逐`只停止 Pod 的所有容器进程`，并`不会删除 Pod` -- 保留部分`现场`信息，`不占用系统资源`

| Pod Status | Value          |
| ---------- | -------------- |
| phase      | `Failed`       |
| reason     | `Evicted`      |
| message    | Evicted Reason |

## 资源监控

> 新版本的 `kubelet` 将不再依赖 `cAdvisor`

1. kubelet 依赖内嵌的开源软件 `cAdvisor`，周期性地检查资源使用情况
   - Analyzes `resource usage` and `performance characteristics` of `running containers`.
   - Metrics from `cgroups`
2. `CPU`  为`可压缩资源`，根据不同进程分配时间配额和权重，CPU 可被多个进程竞相使用
   - 因此，Pod 不会因为使用过多的 CPU 而被 kubelet 驱逐
3. `驱逐策略`是基于`不可压缩资源`进行的，即`内存`和`磁盘`

> Node 如果没有运行时分区，不会有相应的资源监控

| Metrics            | Desc                                     |
| ------------------ | ---------------------------------------- |
| memory.available   | Node 当前的可用内存                      |
| nodefs.available   | Node `根分区`的可使用磁盘大小            |
| nodefs.inodesFree  | Node `根分区`的可使用 inode              |
| imagefs.available  | Node `运行时（CRI）分区`的可使用磁盘大小 |
| imagefs.inodesFree | Node `运行时（CRI）分区`的可使用 inode   |

## 驱逐策略

1. kubelet 获得 Node 的`可用资源信息`后，会结合 Node 的 `Capacity` 来判断当前 Node 运行的 Pod 是否满足驱逐条件
2. 当监控资源的`可用额`少于设定的`绝对值`或者`百分比`，kubelet 会发起`驱逐`操作
3. kubelet 可以设置  `evictionMinimumReclaim` 来限制`每次回收资源的最小值`，以防止小资源的多次回收

> evictionSoft - 优雅终止

| kubelet 参数 | 分类   | 驱逐方式                                                     |
| ------------ | ------ | ------------------------------------------------------------ |
| evictionSoft | 软驱逐 | 当检测到当前资源达到软驱逐的阈值时，不会立马驱逐，而是等待一个`宽限期`<br /> `min(EvictionSoftGracePeriod, Pod.TerminationGracePeriodSeconds)` |
| evictionHard | 硬驱逐 | 一旦检测到满足硬驱逐的条件，`直接终止`容器进程来释放资源     |

> `严重性：磁盘承压 > 内存承压`

|          | 内存承压         | 磁盘承压   |
| -------- | ---------------- | ---------- |
| 不会调度 | `BestEffort` Pod | `任何` Pod |
| 不会驱逐 | `Guaranteed` Pod | -          |

### 内存承压

> 内存承压时，不会调度 `BestEffort` Pod，不会驱逐 `Guaranteed` Pod

1. kubelet 默认设置了 `memory.available < 100Mi` 的`硬驱逐`条件
2. 当 kubelet 检测到当前 Node 的可用内存资源紧张并满足驱逐条件时
   - `kubelet` 会将 Node 的 `MemoryPressure` 设置为 `True`
   - `kube-scheduler` 会阻止 `BestEffort Pod` 调度到内存承压的 Node
     - 因为 BestEffort Pod 是会被`首先驱逐`的，所以调度到内存承压的 Node 意义不大
3. kubelet 启动对内存承压的驱逐时，会按下列`顺序`选取目标 Pod（`PriorityClass -> Diff`）
   - 判断 Pod 的`所有容器的内存使用量总和`是否`超出请求的内存量`，超出请求资源的 Pod 将成为`备选 Pod`
     - 只能是 `BestEffort` or `Burstable`
     - 而 `Guaranteed` 的 Used 不可能大于 Request = Limit，因此 `不会被驱逐`
   - 查询 Pod 的`调度优先级`，优先驱逐低优 Pod
   - 计算 Pod 所有容器的内存使用量和 Pod 请求的内存量的差值（`Used-Request`），`差值越大，越容易被驱逐`

### 磁盘承压

> 磁盘承压时，不会调度`任何` Pod，可能会驱逐`任何` Pod（驱逐前会先尝试`清理磁盘空间`）

1. kubelet 将 Node 的 `DiskPressure` 设置为 True，kube-scheduler 不会再调度`任何 Pod` 到该 Node 上
   - 任何一项满足驱逐条件即可 - nodefs.available / nodefs.inodesFree / imagefs.available / imagefs.inodesFree
2. 驱逐行为
   - 有`容器运行时（CRI）分区`
     - `nodefs` 达到驱逐阈值，kubelet 删除`已经退出的容器`
     - `imagefs` 达到驱逐阈值，kubelet 删除所有`未使用的镜像`
   - 无容器运行时（CRI）分区
     - kubelet `同时删除`已经退出的容器和未使用的镜像
3. 回收已经退出的容器和未使用的镜像后，如果 Node 依然满足驱逐条件，kubelet 会开始`驱逐正在运行的 Pod`
   - 判断 Pod 的`磁盘使用量`是否查过了请求的大小，如果超过请求资源的 Pod 将会成为`备选目标`
     - 不管是否为 `Guaranteed` Pod
   - 查询 Pod 的`调度优先级`，优先驱逐低优 Pod
   - 根据磁盘使用超过请求的数量进行排序，`差值越大，越容易被驱逐`

## 资源配置

### CPU

> 针对不同的 `QoS` Class 的 Pod，Kubernetes 按照继承组织 cgroup 中的 CPU 子系统

![image-20231002190956993](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231002190956993.png)

> CPU CGroup 配置

> `cpu.shares - request`; `cpu.cfs_quota_us - limit`

> `BestEffort` - 竞争`权重很低`，但`没有上限`，能抢到多少就是多少

![image-20231002195948833](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231002195948833.png)

> 暂时没有 Guaranteed Pod

```
$ ls /sys/fs/cgroup/cpu/kubepods.slice
cgroup.clone_children  cpu.cfs_quota_us  cpu.uclamp.max  cpuacct.usage         cpuacct.usage_percpu_sys   cpuacct.usage_user         notify_on_release
cgroup.procs           cpu.shares        cpu.uclamp.min  cpuacct.usage_all     cpuacct.usage_percpu_user  kubepods-besteffort.slice  tasks
cpu.cfs_period_us      cpu.stat          cpuacct.stat    cpuacct.usage_percpu  cpuacct.usage_sys          kubepods-burstable.slice
```

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
          image: nginx:1.25.2
          resources:
            limits:
              memory: 200Mi
              cpu: 100m
            requests:
              memory: 200Mi
              cpu: 100m
```

```
$ k apply -f 1.nginx-with-resource.yaml
deployment.apps/nginx-deployment created

$ ls /sys/fs/cgroup/cpu/kubepods.slice
cgroup.clone_children  cpu.shares      cpuacct.stat          cpuacct.usage_percpu_sys   kubepods-besteffort.slice                               tasks
cgroup.procs           cpu.stat        cpuacct.usage         cpuacct.usage_percpu_user  kubepods-burstable.slice
cpu.cfs_period_us      cpu.uclamp.max  cpuacct.usage_all     cpuacct.usage_sys          kubepods-podcae7c6e1_1551_4cea_a630_6e2ba31d7be1.slice
cpu.cfs_quota_us       cpu.uclamp.min  cpuacct.usage_percpu  cpuacct.usage_user         notify_on_release

$ k get po
NAME                               READY   STATUS    RESTARTS   AGE
nginx-deployment-76fcddd6b-brq5g   1/1     Running   0          49s
```

```
$ docker ps | grep nginx
de7df277bcda   2a4fbb36e966                                        "/docker-entrypoint.…"   2 minutes ago    Up 2 minutes              k8s_nginx_nginx-deployment-76fcddd6b-brq5g_default_cae7c6e1-1551-4cea-a630-6e2ba31d7be1_0
974d0b774670   registry.aliyuncs.com/google_containers/pause:3.6   "/pause"                 2 minutes ago    Up 2 minutes              k8s_POD_nginx-deployment-76fcddd6b-brq5g_default_cae7c6e1-1551-4cea-a630-6e2ba31d7be1_0

$ tree -L 1 /sys/fs/cgroup/cpu/kubepods.slice/kubepods-podcae7c6e1_1551_4cea_a630_6e2ba31d7be1.slice
/sys/fs/cgroup/cpu/kubepods.slice/kubepods-podcae7c6e1_1551_4cea_a630_6e2ba31d7be1.slice
|-- cgroup.clone_children
|-- cgroup.procs
|-- cpuacct.stat
|-- cpuacct.usage
|-- cpuacct.usage_all
|-- cpuacct.usage_percpu
|-- cpuacct.usage_percpu_sys
|-- cpuacct.usage_percpu_user
|-- cpuacct.usage_sys
|-- cpuacct.usage_user
|-- cpu.cfs_period_us
|-- cpu.cfs_quota_us
|-- cpu.shares
|-- cpu.stat
|-- cpu.uclamp.max
|-- cpu.uclamp.min
|-- docker-974d0b7746709fb86d2a33a6c85b0946d25b84e3f68b86043b447723f2960eaa.scope
|-- docker-de7df277bcda5901461338198f57726ecb4577f3e02c196939c7ce69abc9ce78.scope
|-- notify_on_release
`-- tasks
```

> Pod

```
$ cat /sys/fs/cgroup/cpu/kubepods.slice/kubepods-podcae7c6e1_1551_4cea_a630_6e2ba31d7be1.slice/cpu.shares
102

$ cat /sys/fs/cgroup/cpu/kubepods.slice/kubepods-podcae7c6e1_1551_4cea_a630_6e2ba31d7be1.slice/cpu.cfs_period_us
100000

$ cat /sys/fs/cgroup/cpu/kubepods.slice/kubepods-podcae7c6e1_1551_4cea_a630_6e2ba31d7be1.slice/cpu.cfs_quota_us
10000
```

> Container

```
$ cat /sys/fs/cgroup/cpu/kubepods.slice/kubepods-podcae7c6e1_1551_4cea_a630_6e2ba31d7be1.slice/docker-de7df277bcda5901461338198f57726ecb4577f3e02c196939c7ce69abc9ce78.scope/cpu.shares
102

$ cat /sys/fs/cgroup/cpu/kubepods.slice/kubepods-podcae7c6e1_1551_4cea_a630_6e2ba31d7be1.slice/docker-de7df277bcda5901461338198f57726ecb4577f3e02c196939c7ce69abc9ce78.scope/cpu.cfs_period_us
100000

$ cat /sys/fs/cgroup/cpu/kubepods.slice/kubepods-podcae7c6e1_1551_4cea_a630_6e2ba31d7be1.slice/docker-de7df277bcda5901461338198f57726ecb4577f3e02c196939c7ce69abc9ce78.scope/cpu.cfs_quota_us
10000
```

### Memory

> 针对不同的 `QoS` Class 的 Pod，Kubernetes 按照继承组织 cgroup 中的 Memory 子系统

![image-20231002192701162](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231002192701162.png)

![image-20231002195847783](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231002195847783.png)

> Pod

```
$ cat /sys/fs/cgroup/memory/kubepods.slice/kubepods-podcae7c6e1_1551_4cea_a630_6e2ba31d7be1.slice/memory.limit_in_bytes
209715200
```

> Container

```
$ cat /sys/fs/cgroup/memory/kubepods.slice/kubepods-podcae7c6e1_1551_4cea_a630_6e2ba31d7be1.slice/docker-de7df277bcda5901461338198f57726ecb4577f3e02c196939c7ce69abc9ce78.scope/memory.limit_in_bytes
209715200
```

## OOM Killer

1. 操作系统根据 `oom_score` 来进行优先级排序，选择待终止的进程，`oom_score 越高，越容易被终止`
2. 进程的 oom_score 根据当前进程使用的内存`占 Node 总内存的比例 × 10`，再加上 `oom_score_adj` 得到
3. 容器进程的 `oom_score_adj` 由 `kubelet` 进行设置的

> BestEffort > Burstable > Guaranteed 

| Pod QoS                  | oom_score_adj                                                |
| :----------------------- | ------------------------------------------------------------ |
| `Guaranteed`<br />＜3    | `-997`<br />即便使用 99.9 % 的内存，oom_score 为 999 - 997 = 2 依然很小，`基本不是被 Kill` |
| `Burstable`<br />[2,999] | min(max(2,1000-(1000x`memoryRequestBytes`)/`machineMemoryCapacityBytes`), 999)<br />`申请少，但使用多`的 Pod 会`优先被 Kill` |
| `BestEffort`<br />> 1000 | `1000`<br />即便使用 1% 的内存，oom_score 为 1 + 1000 = 1001，依然很大，`优先被Kill` |

```
$ docker ps | grep nginx
de7df277bcda   2a4fbb36e966                                        "/docker-entrypoint.…"   41 minutes ago      Up 41 minutes                k8s_nginx_nginx-deployment-76fcddd6b-brq5g_default_cae7c6e1-1551-4cea-a630-6e2ba31d7be1_0
974d0b774670   registry.aliyuncs.com/google_containers/pause:3.6   "/pause"                 41 minutes ago      Up 41 minutes                k8s_POD_nginx-deployment-76fcddd6b-brq5g_default_cae7c6e1-1551-4cea-a630-6e2ba31d7be1_0

$ docker inspect --format='{{.State.Pid}}' de7df277bcda
360332

$ cat /proc/360332/oom_score
2

$ cat /proc/360332/oom_score_adj
-997
```

## 日志管理

> Node 上需要运行 `logrotate` 的定时任务对系统服务日志进行 `rotate` 清理

> `Docker` - 自带日志功能，`写入前检查`
> `Containerd` - 依赖 `kubelet 定时执行 du`

1. logrotate 的`执行周期不能过长`，防止日志短时间内大量增长
2. 配置日志的 rotate 条件，在日志不占用太多空间的情况下，保证有足够的日志可供查看
3. Docker
   - Docker 有 `Log Driver`，将`容器的标准输出`转存到`文件`
   - 除了基于系统 logrotate 管理日志
     - 还可以依赖 Docker自带的日志管理功能来设置`容器日志的数量`和`每个日志文件的大小`
   - `Docker 写入数据之前`会对日志大小进行`检查`和 `rotate` 操作，确保日志文件不会超过配置的`数量`和`大小`
4. Containerd
   - 日志的管理是通过 `kubelet` 定期（10 秒）执行 `du` 命令，来检查容器日志的`数量`和文件的`大小`
   - 可以通过 `kubelet` 的配置参数进行调整：`container-log-max-size` / `container-log-max-files`

## Docker 卷管理

> 不建议使用 Docker Volume

1. 在构建容器镜像时，可以在 `Dockerfile` 中通过 `VOLUME` 指令声明一个`存储卷`
   - 目前 Kubernetes 尚未将其纳入管控范围，`不建议使用`
2. 如果容器进程（取决于 CRI 实现）在`容器可写层`或者 `emptyDir` 卷进行大量读写操作，会导致`磁盘 IO 过高`
   - `容器可写层` - 使用 `imagefs`，基于 `OverlayFS`，性能很差
   - `emptyDir` - 使用 `nodefs`，`共享`同一块磁盘，相互影响
3. `Docker` 和 `Containerd` 运行时都是基于 `CGroup V1`
   - 对`块设备`，只支持对 `Direct IO` 限速，而对于 `Buffer IO` 还不具备有效的支持
   - 因此，针对`设备限速`的问题，目前还没有完美的解决方案，对于有特殊 IO 需求的容器，建议使用`独立的磁盘空间`
   - 寄希望于 CGroup V2

## 网络资源

> 由`网络插件`（如CNI 社区提供的 bandwidth ）通过 `Linux Traffic Control` 为 Pod 限制带宽

> 每个容器有对应的虚拟网卡，但`共享物理网卡`

```yaml
apiVersion: v1
kind: Pod
metadata:
	annotations:
		kubernetes.io/ingress-bandwidth: 10MB
		kubernetes.io/egress-bandwidth: 10MB
```

## 进程数

> kubelet `默认不限制` Pod 可以创建的`子进程数量`
> 可以通过启动参数 `podPidsLimit` 开启限制，可以通过 `reserved` 参数为`系统进程`预留进程数

1. `kubelet` 通过`系统调用`周期性地获取当前系统的 PID 的使用量
   - 并读取 `/proc/sys/kernel/pid_max` 获取系统支持的 PID 上限（`2^22`）
2. 当前的可用进程数少于设定阈值，kubelet 会将 Node 对象的 `PIDPressure` 标记为 True
3. kube-scheduler 在进行调度时，会从备选节点中对处于 `NodeUnderPIDPressure` 状态的 Node 进行`过滤`

```
$ cat /proc/sys/kernel/pid_max
4194304
```

# 节点检测

> Kubernetes 不会感知所有问题，会导致 Pod 仍然会被调度到有问题的 Node 上

1. 基础架构守护程序问题：NTP 服务关闭
2. 硬件问题：CPU、内存、磁盘损坏
3. 内核问题：内核死锁、文件系统损坏
4. 容器运行时问题：运行时守护程序无响应

> 引入守护进程 `node-problem-detector`，从`各个守护进程`收集 Node 问题，并`主动上报`给 Kubernetes

> Kubernetes Node 诊断

1. Container Runtime 无响应
2. Linux Kernel 无响应
3. 网络异常
4. 文件描述符异常
5. 硬件问题：CPU、内存、磁盘等

## 故障分类 

| Problem Types       | NodeCondition                                                | Desc                                             | Configs                        |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------------ | ------------------------------ |
| `系统日志监控`      | KernelDeadlock<br />ReadonlyFilesystem<br />FrequentKubeletRestart<br />FrequentDockerRestart<br />FrequentContainerdRestart | 通过监控系统日志来汇报问题并输出系统指标数据     | filelog<br />kmsg<br />systemd |
| CustomPluginMonitor | 按需定义                                                     | 允许用户自定义监控脚本，并运行这些脚本来进行监控 | -                              |
| `HealthChecker`     | KubeletUnhealthy<br />ContainerRuntimeUnhealthy              | 针对 `kubelet` 和`容器运行时`的检查              | kubelet docker                 |

## 汇报方式

> NPD 通过`设置 NodeCondition` 或者`创建 Event 对象`来汇报问题

| Method          | Desc                                                        |
| --------------- | ----------------------------------------------------------- |
| `NodeCondition` | 针对`永久性故障`，会通过设置 NodeCondition 来改变 Node 状态 |
| `Event`         | `临时故障`可以通过 Event 来提醒相关对象                     |

```
$ helm repo add deliveryhero https://charts.deliveryhero.io/ 

$ helm install npd deliveryhero/node-problem-detector --set image.repository=kubeoperator/node-problem-detector --set image.tag=v0.8.1

$ k get po -owide
NAME                              READY   STATUS    RESTARTS   AGE     IP               NODE      NOMINATED NODE   READINESS GATES
npd-node-problem-detector-982xh   1/1     Running   0          2m19s   192.168.185.13   mac-k8s   <none>           <none>

$ k get ds -owide
NAME                        DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE     CONTAINERS              IMAGES                                      SELECTOR
npd-node-problem-detector   1         1         1       1            1           <none>          2m37s   node-problem-detector   kubeoperator/node-problem-detector:v0.8.1   app=node-problem-detector,app.kubernetes.io/instance=npd,app.kubernetes.io/name=node-problem-detector
```

> KernelDeadlock / ReadonlyFilesystem / CorruptDockerOverlay2 / KubeletReady

```yaml
apiVersion: v1
kind: Node
metadata:
  annotations:
    csi.volume.kubernetes.io/nodeid: '{"csi.tigera.io":"mac-k8s"}'
    kubeadm.alpha.kubernetes.io/cri-socket: /var/run/dockershim.sock
    node.alpha.kubernetes.io/ttl: "0"
    projectcalico.org/IPv4Address: 192.168.191.153/24
    projectcalico.org/IPv4VXLANTunnelAddr: 192.168.185.0
    volumes.kubernetes.io/controller-managed-attach-detach: "true"
  creationTimestamp: "2022-08-28T06:45:49Z"
  labels:
    beta.kubernetes.io/arch: arm64
    beta.kubernetes.io/os: linux
    kubernetes.io/arch: arm64
    kubernetes.io/hostname: mac-k8s
    kubernetes.io/os: linux
    node-role.kubernetes.io/control-plane: ""
    node-role.kubernetes.io/master: ""
    node.kubernetes.io/exclude-from-external-load-balancers: ""
  name: mac-k8s
  resourceVersion: "8843"
  uid: b5720267-7927-4b62-8184-d3371f7c76ff
spec:
  podCIDR: 192.168.0.0/24
  podCIDRs:
  - 192.168.0.0/24
status:
  addresses:
  - address: 192.168.191.153
    type: InternalIP
  - address: mac-k8s
    type: Hostname
  allocatable:
    cpu: "4"
    ephemeral-storage: "28819139742"
    hugepages-1Gi: "0"
    hugepages-2Mi: "0"
    hugepages-32Mi: "0"
    hugepages-64Ki: "0"
    memory: 12134168Ki
    pods: "110"
  capacity:
    cpu: "4"
    ephemeral-storage: 31270768Ki
    hugepages-1Gi: "0"
    hugepages-2Mi: "0"
    hugepages-32Mi: "0"
    hugepages-64Ki: "0"
    memory: 12236568Ki
    pods: "110"
  conditions:
  - lastHeartbeatTime: "2022-10-02T14:27:06Z"
    lastTransitionTime: "2022-10-02T14:22:04Z"
    message: kernel has no deadlock
    reason: KernelHasNoDeadlock
    status: "False"
    type: KernelDeadlock
  - lastHeartbeatTime: "2022-10-02T14:27:06Z"
    lastTransitionTime: "2022-10-02T14:22:04Z"
    message: Filesystem is not read-only
    reason: FilesystemIsNotReadOnly
    status: "False"
    type: ReadonlyFilesystem
  - lastHeartbeatTime: "2022-10-02T14:27:06Z"
    lastTransitionTime: "2022-10-02T14:22:04Z"
    message: docker overlay2 is functioning properly
    reason: NoCorruptDockerOverlay2
    status: "False"
    type: CorruptDockerOverlay2
  - lastHeartbeatTime: "2022-10-02T14:21:53Z"
    lastTransitionTime: "2022-10-02T14:21:53Z"
    message: Calico is running on this node
    reason: CalicoIsUp
    status: "False"
    type: NetworkUnavailable
  - lastHeartbeatTime: "2022-10-02T14:26:24Z"
    lastTransitionTime: "2022-08-28T06:45:47Z"
    message: kubelet has sufficient memory available
    reason: KubeletHasSufficientMemory
    status: "False"
    type: MemoryPressure
  - lastHeartbeatTime: "2022-10-02T14:26:24Z"
    lastTransitionTime: "2022-08-28T06:45:47Z"
    message: kubelet has no disk pressure
    reason: KubeletHasNoDiskPressure
    status: "False"
    type: DiskPressure
  - lastHeartbeatTime: "2022-10-02T14:26:24Z"
    lastTransitionTime: "2022-08-28T06:45:47Z"
    message: kubelet has sufficient PID available
    reason: KubeletHasSufficientPID
    status: "False"
    type: PIDPressure
  - lastHeartbeatTime: "2022-10-02T14:26:24Z"
    lastTransitionTime: "2022-08-28T06:49:06Z"
    message: kubelet is posting ready status. AppArmor enabled
    reason: KubeletReady
    status: "True"
    type: Ready
  daemonEndpoints:
    kubeletEndpoint:
      Port: 10250
  images:
  - names:
    - centos@sha256:a27fd8080b517143cbbbab9dfb7c8571c40d67d534bbdee55bd6c473f432b177
    - centos:latest
    sizeBytes: 271506418
  - names:
    - calico/node@sha256:8e34517775f319917a0be516ed3a373dbfca650d1ee8e72158087c24356f47fb
    - calico/node:v3.26.1
    sizeBytes: 257943189
  - names:
    - calico/cni@sha256:3be3c67ddba17004c292eafec98cc49368ac273b40b27c8a6621be4471d348d6
    - calico/cni:v3.26.1
    sizeBytes: 199481277
  - names:
    - nginx@sha256:104c7c5c54f2685f0f46f3be607ce60da7085da3eaa5ad22d3d9f01594295e9c
    - nginx:1.25.2
    sizeBytes: 192063326
  - names:
    - registry.aliyuncs.com/google_containers/kube-apiserver@sha256:b8eba88862bab7d3d7cdddad669ff1ece006baa10d3a3df119683434497a0949
    - registry.aliyuncs.com/google_containers/kube-apiserver:v1.23.3
    sizeBytes: 132450723
  - names:
    - registry.aliyuncs.com/google_containers/etcd@sha256:64b9ea357325d5db9f8a723dcf503b5a449177b17ac87d69481e126bb724c263
    - registry.aliyuncs.com/google_containers/etcd:3.5.1-0
    sizeBytes: 132115484
  - names:
    - registry.aliyuncs.com/google_containers/kube-controller-manager@sha256:b721871d9a9c55836cbcbb2bf375e02696260628f73620b267be9a9a50c97f5a
    - registry.aliyuncs.com/google_containers/kube-controller-manager:v1.23.3
    sizeBytes: 122423990
  - names:
    - registry.aliyuncs.com/google_containers/kube-proxy@sha256:def87f007b49d50693aed83d4703d0e56c69ae286154b1c7a20cd1b3a320cf7c
    - registry.aliyuncs.com/google_containers/kube-proxy:v1.23.3
    sizeBytes: 109183127
  - names:
    - kubeoperator/node-problem-detector@sha256:aa214dca443915fba3d2f97a35fee078b588de17021c01c011f7247ab056f439
    - kubeoperator/node-problem-detector:v0.8.1
    sizeBytes: 104273686
  - names:
    - calico/apiserver@sha256:8040d37d7038ec4a24b5d670526c7a1da432f825e6aad1cb4ea1fc24cb13fc1e
    - calico/apiserver:v3.26.1
    sizeBytes: 87865689
  - names:
    - calico/kube-controllers@sha256:01ce29ea8f2b34b6cef904f526baed98db4c0581102f194e36f2cd97943f77aa
    - calico/kube-controllers:v3.26.1
    sizeBytes: 68842373
  - names:
    - quay.io/tigera/operator@sha256:780eeab342e62bd200e533a960b548216b23b8bde7a672c4527f29eec9ce2d79
    - quay.io/tigera/operator:v1.30.4
    sizeBytes: 64946658
  - names:
    - calico/typha@sha256:54ec33e1e6a6f2a7694b29e7101934ba75752e0c4543ee988a4015ce0caa7b99
    - calico/typha:v3.26.1
    sizeBytes: 61869924
  - names:
    - registry.aliyuncs.com/google_containers/kube-scheduler@sha256:32308abe86f7415611ca86ee79dd0a73e74ebecb2f9e3eb85fc3a8e62f03d0e7
    - registry.aliyuncs.com/google_containers/kube-scheduler:v1.23.3
    sizeBytes: 52955871
  - names:
    - registry.aliyuncs.com/google_containers/coredns@sha256:5b6ec0d6de9baaf3e92d0f66cd96a25b9edbce8716f5f15dcd1a616b3abd590e
    - registry.aliyuncs.com/google_containers/coredns:v1.8.6
    sizeBytes: 46808803
  - names:
    - calico/node-driver-registrar@sha256:fb4dc4863c20b7fe1e9dd5e52dcf004b74e1af07d783860a08ddc5c50560f753
    - calico/node-driver-registrar:v3.26.1
    sizeBytes: 23206723
  - names:
    - calico/csi@sha256:4e05036f8ad1c884ab52cae0f1874839c27c407beaa8f008d7a28d113ad9e5ed
    - calico/csi:v3.26.1
    sizeBytes: 18731350
  - names:
    - calico/pod2daemon-flexvol@sha256:2aefd77a4f8289c88cfe24c0db38822de3132292d1ea4ac9192abc9583e4b54c
    - calico/pod2daemon-flexvol:v3.26.1
    sizeBytes: 10707389
  - names:
    - registry.aliyuncs.com/google_containers/pause@sha256:3d380ca8864549e74af4b29c10f9cb0956236dfb01c40ca076fb6c37253234db
    - registry.aliyuncs.com/google_containers/pause:3.6
    sizeBytes: 483864
  nodeInfo:
    architecture: arm64
    bootID: 99afea12-0e3a-44a8-b226-085479b8ab7f
    containerRuntimeVersion: docker://20.10.24
    kernelVersion: 5.4.0-156-generic
    kubeProxyVersion: v1.23.3
    kubeletVersion: v1.23.3
    machineID: 3bbd7f943eb34ff39f80a87bfa2037de
    operatingSystem: linux
    osImage: Ubuntu 20.04.5 LTS
    systemUUID: 598a4d56-54c5-9aff-c38f-732f7662da29
```

## Addon

> 在控制平面的 `Node` 上保存配置到插件 Pod 的目录：`/etc/kubernetes/addons/node-problem-detector`

## 异常处理

> 可以结合 `Cluster API` 的 `MachineHealthCheck` 一起使用

1. NPD 只负责获取异常事件，并修改 NodeCondition，`不会对 Node 状态和调度产生影响`
2. 需要`自定义控制器`，监听 NPD 汇报的 NodeCondition，给 Node 打上 `Taint`，阻止 Pod 调度到故障 Node 上
3. 问题修复后，`重启 NPD Pod` 来清理错误事件 - 因为一般无恢复事件，需要人肉操作

# 诊断方式

## SSH

1. 直接 SSH 到 Node
2. 创建一个支持 SSH 的 Pod，并通过负载均衡转发 SSH 请求到该 Pod
3. kubectl exec pod

## 查看日志

> 针对使用 `systemd` 拉起的服务，使用 `journalctl`

```
$ journalctl -help
...
  -u --unit=UNIT             Show logs from the specified unit
  -f --follow                Follow the journal
  -a --all                   Show all fields, including long and unprintable
...

$ journalctl -afu kubelet.service
-- Logs begin at Sun 2022-08-27 22:17:42 CST. --
Oct 02 22:22:04 mac-k8s kubelet[16022]: 2022-10-02 22:22:04.237 [INFO][109529] k8s.go 411: Added Mac, interface name, and active container ID to endpoint ContainerID="101095b6a9fe9d9c809ae5b0ab1476e16017ed08be831f8800310d78c7e73f5c" Namespace="default" Pod="npd-node-problem-detector-982xh" WorkloadEndpoint="mac--k8s-k8s-npd--node--problem--detector--982xh-eth0" endpoint=&v3.WorkloadEndpoint{TypeMeta:v1.TypeMeta{Kind:"WorkloadEndpoint", APIVersion:"projectcalico.org/v3"}, ObjectMeta:v1.ObjectMeta{Name:"mac--k8s-k8s-npd--node--problem--detector--982xh-eth0", GenerateName:"npd-node-problem-detector-", Namespace:"default", SelfLink:"", UID:"b073d98e-01dd-41c5-950f-a8e50da9ec9e", ResourceVersion:"8323", Generation:0, CreationTimestamp:time.Date(2022, time.October, 2, 22, 21, 25, 0, time.Local), DeletionTimestamp:<nil>, DeletionGracePeriodSeconds:(*int64)(nil), Labels:map[string]string{"app":"node-problem-detector", "app.kubernetes.io/instance":"npd", "app.kubernetes.io/name":"node-problem-detector", "controller-revision-hash":"6b889c5f4d", "pod-template-generation":"1", "projectcalico.org/namespace":"default", "projectcalico.org/orchestrator":"k8s", "projectcalico.org/serviceaccount":"npd-node-problem-detector"}, Annotations:map[string]string(nil), OwnerReferences:[]v1.OwnerReference(nil), Finalizers:[]string(nil), ManagedFields:[]v1.ManagedFieldsEntry(nil)}, Spec:v3.WorkloadEndpointSpec{Orchestrator:"k8s", Workload:"", Node:"mac-k8s", ContainerID:"101095b6a9fe9d9c809ae5b0ab1476e16017ed08be831f8800310d78c7e73f5c", Pod:"npd-node-problem-detector-982xh", Endpoint:"eth0", ServiceAccountName:"npd-node-problem-detector", IPNetworks:[]string{"192.168.185.13/32"}, IPNATs:[]v3.IPNAT(nil), IPv4Gateway:"", IPv6Gateway:"", Profiles:[]string{"kns.default", "ksa.default.npd-node-problem-detector"}, InterfaceName:"cali4285310fc49", MAC:"7a:42:d7:66:27:cc", Ports:[]v3.WorkloadEndpointPort{v3.WorkloadEndpointPort{Name:"exporter", Protocol:numorstring.Protocol{Type:1, NumVal:0x0, StrVal:"TCP"}, Port:0x4f21, HostPort:0x0, HostIP:""}}, AllowSpoofedSourcePrefixes:[]string(nil)}}
Oct 02 22:22:04 mac-k8s kubelet[16022]: 2022-10-02 22:22:04.246 [INFO][109529] k8s.go 489: Wrote updated endpoint to datastore ContainerID="101095b6a9fe9d9c809ae5b0ab1476e16017ed08be831f8800310d78c7e73f5c" Namespace="default" Pod="npd-node-problem-detector-982xh" WorkloadEndpoint="mac--k8s-k8s-npd--node--problem--detector--982xh-eth0"
Oct 02 22:26:18 mac-k8s kubelet[16022]: W1002 22:26:18.023886   16022 machine.go:65] Cannot read vendor id correctly, set empty.
Oct 02 22:31:18 mac-k8s kubelet[16022]: W1002 22:31:18.024072   16022 machine.go:65] Cannot read vendor id correctly, set empty.
Oct 02 22:36:18 mac-k8s kubelet[16022]: W1002 22:36:18.024740   16022 machine.go:65] Cannot read vendor id correctly, set empty.
Oct 02 22:41:18 mac-k8s kubelet[16022]: W1002 22:41:18.029467   16022 machine.go:65] Cannot read vendor id correctly, set empty.
Oct 02 22:46:18 mac-k8s kubelet[16022]: W1002 22:46:18.027979   16022 machine.go:65] Cannot read vendor id correctly, set empty.
Oct 02 22:51:18 mac-k8s kubelet[16022]: W1002 22:51:18.025850   16022 machine.go:65] Cannot read vendor id correctly, set empty.
Oct 02 22:56:18 mac-k8s kubelet[16022]: W1002 22:56:18.024433   16022 machine.go:65] Cannot read vendor id correctly, set empty.
Oct 02 23:01:18 mac-k8s kubelet[16022]: W1002 23:01:18.026880   16022 machine.go:65] Cannot read vendor id correctly, set empty.
```

> 针对标准的容器日志

```
$ kubectl logs -f -c <container_name> <pod_name>
$ kubectl logs -f --all-containers <pod_name>
$ kubectl logs -f <pod_name> --previous
```

```
$ k get po -A
NAMESPACE          NAME                                       READY   STATUS    RESTARTS      AGE
calico-apiserver   calico-apiserver-68c95b9ff6-jfbl9          1/1     Running   0             35d
calico-apiserver   calico-apiserver-68c95b9ff6-tn6nm          1/1     Running   0             35d
calico-system      calico-kube-controllers-7f768b4484-tnzph   1/1     Running   0             35d
calico-system      calico-node-htqj4                          1/1     Running   0             47m
calico-system      calico-typha-f9d9fdd6c-xql5f               1/1     Running   0             35d
calico-system      csi-node-driver-v644v                      2/2     Running   0             35d
default            npd-node-problem-detector-982xh            1/1     Running   0             47m
kube-system        coredns-6d8c4cb4d-jmk8s                    1/1     Running   0             35d
kube-system        coredns-6d8c4cb4d-vxcs8                    1/1     Running   0             35d
kube-system        etcd-mac-k8s                               1/1     Running   0             35d
kube-system        kube-apiserver-mac-k8s                     1/1     Running   0             35d
kube-system        kube-controller-manager-mac-k8s            1/1     Running   2 (34d ago)   35d
kube-system        kube-proxy-vz9p8                           1/1     Running   0             35d
kube-system        kube-scheduler-mac-k8s                     1/1     Running   2 (34d ago)   35d
tigera-operator    tigera-operator-59b69c49dc-flrrb           1/1     Running   2 (34d ago)   35d

$ k logs -n kube-system kube-controller-manager-mac-k8s --previous --tail=5
	/workspace/src/k8s.io/kubernetes/_output/dockerized/go/src/k8s.io/kubernetes/vendor/k8s.io/client-go/rest/watch/decoder.go:49 +0x60
k8s.io/kubernetes/vendor/k8s.io/apimachinery/pkg/watch.(*StreamWatcher).receive(0x40025dd880)
	/workspace/src/k8s.io/kubernetes/_output/dockerized/go/src/k8s.io/kubernetes/vendor/k8s.io/apimachinery/pkg/watch/streamwatcher.go:105 +0xb4
created by k8s.io/kubernetes/vendor/k8s.io/apimachinery/pkg/watch.NewStreamWatcher
	/workspace/src/k8s.io/kubernetes/_output/dockerized/go/src/k8s.io/kubernetes/vendor/k8s.io/apimachinery/pkg/watch/streamwatcher.go:76 +0x110
```

> 如果容器日志被转存到文件

```
$ kubectl exec -it xxx -- tail -f /path/to/log
```

# 扩展资源

1. 扩展资源是 `kubernetes.io` 域名之外的标准资源名称
   - 使得集群管理员能够颁布`非 Kubernetes 内置资源`，而用户可以使用它们
2. 自定义扩展资源无法使用 kubernetes.io 作为资源域名
3. 管理
   - `Node` 级扩展资源 - 绑定到 Node 上
   - `设备插件`管理的资源 - 发布在各 Node 上由设备插件所管理的资源，如 GPU

## 配置资源

1. 集群管理员向 `API Server` 提交 `PATCH` HTTP 请求，在集群 Node 的 `status.capacity` 中为其配置可用数量
   - 完成该操作后，Node 的 `status.capacity` 会包含新资源
   - `kubelet` 会`异步`地对 `status.allocatable` 执行`自动更新`操作，包含新资源
2. `kube-scheduler` 在评估 Pod 是否适合在某个 Node 上执行时会使用 Node 的 `status.allocatable` 值
   - 在更新 `status.capacity` 之后和请求该资源的第一个 Pod 被调度到该 Node 之间，可能会有`短暂的延迟`
   - 因为 `status.allocatable` 是被 `kubelet 异步更新`的

```yaml ~/.kube/config
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUMvakNDQWVhZ0F3SUJBZ0lCQURBTkJna3Foa2lHOXcwQkFRc0ZBREFWTVJNd0VRWURWUVFERXdwcmRXSmwKY201bGRHVnpNQjRYRFRJek1EZ3lPREEyTkRVME5Gb1hEVE16TURneU5UQTJORFUwTkZvd0ZURVRNQkVHQTFVRQpBeE1LYTNWaVpYSnVaWFJsY3pDQ0FTSXdEUVlKS29aSWh2Y05BUUVCQlFBRGdnRVBBRENDQVFvQ2dnRUJBTDNaCndHQldmN0VkWUF5bzc4anp4YXpwUm1BZ3c3Mi9XbnhpdWppSlBndDBrb3kvbHdjMnROc0FLM1ZjM3AvVThhd3MKVDhjRnJCMk56bUJBcW03QjNIK3hCajhWelVwc3dtT0pTeE1uNmRmQmZENXhKa3FzeDdEYVQ1MjVBbmwxbkh6Sgp6VXlNQ2h0NkFTdmJ0ZE9SZGU0aHpKblBCaVpxenpEcmJYK0EvRXB6R0RPT2xTc3RoRm9BVlJJSVhIcUJCV1lwClZPK2VITUI5ZW5TNGw2T2tOQzVSaU11Q1VtSlloV0NjVkVNdDVVNzJKaUVaMko2bWFjOTlvUkVZejhWd1dMUEUKS25iU0FXTDFlem1EVStJUlh0bXZjVDZ2NERzS1huNjJvSjRzZnpEaXd2L2k3dkczeG1YUTAxQktKWk0vSWF5dgpocVlOQWZJQVJQL2ZkaDZkc08wQ0F3RUFBYU5aTUZjd0RnWURWUjBQQVFIL0JBUURBZ0trTUE4R0ExVWRFd0VCCi93UUZNQU1CQWY4d0hRWURWUjBPQkJZRUZPLzdtOW9SNUdrd0FmWjFEVW9OUythNEJvN0RNQlVHQTFVZEVRUU8KTUF5Q0NtdDFZbVZ5Ym1WMFpYTXdEUVlKS29aSWh2Y05BUUVMQlFBRGdnRUJBQjRHd1hVam9Rb2RSWS9nbmV3SApJQWxGTkpFOU5ka015WFl2dVN4Tnl5akd6SUJGTmY3d0FacXJVaGlack5qTGRGUGNuckJTSC9IQWVJV0hYeGJBCmVXSHV3bGk0dC85ekNockYybEtHUkszaW5WSnlpZGFldXFPTUF5R1JhK3d4Y0dNR1JKM001WXBMUXE0TjJlQU0KS3BJQmZ3aHlJL2tDSFQ2VDVRbEJlQ0VpaGNCVTk5cU55eDQ4NCtydzNBcGRWM2FrQ0lrOXhxVGhjM0hubDJkYQpmU2ZIcXYzSmMzUTQ1bVJNenVqQTZacWY3emcrekFFemM4SWg3bTVXdFdtdG1valBtQ3QveURFRkVkYWRpWGRLCjIyVzh4elc5VDJUbFFubUhNM2Z6aVNlQVFFQ3ZtU0NUTlNnYmxhRkkvTzBveGRNOWdyRWJPaW03VUZkblRyYm4KRWtrPQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    server: https://192.168.191.153:6443
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
    client-certificate-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURJVENDQWdtZ0F3SUJBZ0lJRzV1c0M3ZitQeUF3RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TXpBNE1qZ3dOalExTkRSYUZ3MHlOREE0TWpjd05qUTFORFZhTURReApGekFWQmdOVkJBb1REbk41YzNSbGJUcHRZWE4wWlhKek1Sa3dGd1lEVlFRREV4QnJkV0psY201bGRHVnpMV0ZrCmJXbHVNSUlCSWpBTkJna3Foa2lHOXcwQkFRRUZBQU9DQVE4QU1JSUJDZ0tDQVFFQThlc1c2U3VicXRrcW5mcHMKdjBzeEdteEdJTGZjaFhuWU5pWkhIR0t1OFN2aGZUUDByOUhtNXM2MFptYUVCQXcySzJvV1RqZXg3ZEhHeXg0MAowdWZYbTZOcG5PU2orMzBHOWRSMk1FZGZGbmdPNWMxNmRWV0ZRS210cmpmUW1pS3RoVWQwUE5oWmhUcHgwZWliCmpnTW01OHNUMHNtcjlvazdqTVdUZVI2cUlLQ3RjeEg1S2QwYTVzVk95TWNPVXBZNDRlZk5qSXZCanpDdmFCZmkKOWtpL1dkMEdnT2hLVUh2R3pmZ1VSMVBKYjE0dWdiZDdYMnNTWmh0Tlgzb0ZQWGNUMHNkNUp0eGtUVjhnTUxOZQpkeWNQWDZESFBSNzBiemNxaG1iTW44TnFkNnNGQVRLSU5LSmRiL1pZM0tGZy92WG1aM1JNNW1vVS9STnVrQ2sxCjZXWFNkUUlEQVFBQm8xWXdWREFPQmdOVkhROEJBZjhFQkFNQ0JhQXdFd1lEVlIwbEJBd3dDZ1lJS3dZQkJRVUgKQXdJd0RBWURWUjBUQVFIL0JBSXdBREFmQmdOVkhTTUVHREFXZ0JUdis1dmFFZVJwTUFIMmRRMUtEVXZtdUFhTwp3ekFOQmdrcWhraUc5dzBCQVFzRkFBT0NBUUVBbEpUR0RkZlhvU3dyTTgxSjR4RWNTTE5QVUFsQ1V0b014eWZhCnpsMlRMeUxnc1ZOMGVjK0hKWml1SXhHZHBYZnBzR3BSNUk0N1V6TEVxTmc0ZjE1WWVqaXpuMGRmeVBmVkt3bmcKSm80amFrOGlZR2JqYUlwUy9nM2ZXcmRGdTF0MTdwZEVRc0dQbmR3blQyTHBFR2xjOXZ6b21Xc3NhRG1oRXMrdQprQThiejNFZE9lektmS3N3VXBzSWNLVU0xRUdaVmZpQXBRSnBvQmtkU2lwWDgyN3F2a3pYdks5NTZaQitDYksyCjJJWDZZbzJDVDE1Und4enFBeEphOE5VZGhFdStGY3lQNnRqWXV3QWxCaTJpOG5tTkpVVjk1clF5REJIRTdJOUIKNE45SnA0aVVoakdVTkFJcHIzV1FjYzlDRVVJL1ByTGVSUHlZc2c5NWcrYTRkTTFld1E9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    client-key-data: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFb3dJQkFBS0NBUUVBOGVzVzZTdWJxdGtxbmZwc3Ywc3hHbXhHSUxmY2hYbllOaVpISEdLdThTdmhmVFAwCnI5SG01czYwWm1hRUJBdzJLMm9XVGpleDdkSEd5eDQwMHVmWG02TnBuT1NqKzMwRzlkUjJNRWRmRm5nTzVjMTYKZFZXRlFLbXRyamZRbWlLdGhVZDBQTmhaaFRweDBlaWJqZ01tNThzVDBzbXI5b2s3ak1XVGVSNnFJS0N0Y3hINQpLZDBhNXNWT3lNY09VcFk0NGVmTmpJdkJqekN2YUJmaTlraS9XZDBHZ09oS1VIdkd6ZmdVUjFQSmIxNHVnYmQ3Clgyc1NaaHROWDNvRlBYY1Qwc2Q1SnR4a1RWOGdNTE5lZHljUFg2REhQUjcwYnpjcWhtYk1uOE5xZDZzRkFUS0kKTktKZGIvWlkzS0ZnL3ZYbVozUk01bW9VL1JOdWtDazE2V1hTZFFJREFRQUJBb0lCQUdZem9rYzVwQmNtamVtVgp6WEYzYTdRMC85OThyWTQ2TG95WjJUcjF1ZUNyWUNUTDJWaVovY21PbEFvYXp6VUNqN1FCcXBDNjJOR1c2VHdRCmM5S1NIYlZqOFE5V1RLekhZalJpNE5kK24zNVhsRHVqZGxPeG9Jeno0aXNTNjI3aXJabjcyUENIbWpJOXdhNGoKYmV3dUNyYXNSYUNza0ppajIyT2FhTFluclVvQXBWMER0ZzI2dzlJaTl0aEltRzJwZlJFUndFZ010WEZnUXd5MwpYb3ZMRHRtZGx3VFNsZ1VCekZCZ3U3NXZJM09hdk9FQlhIY0ZZY3RDOHhEN21zU0xoMG5temF0V0NTQTdSRE01Cnc5QjhCaDVmbENHcms3RjRpOGtjbzNlbmpFdTRzYzNNUU1yYnB1Y25EUzhqYVVUN2RWclBTMm5TNjZyN2JnRTEKUGJQZ1oyRUNnWUVBKzljZDh0bGxlQkpUUkM1YnpxaWxtZkZ2bWhQQTJhSjNXME8wbmlhUStLV1dHVnlFakk1UwovaXhTQUYwNktLL3BmY0hyN2hkeFRiU3cwV0tMWEhzYnMraFRFTjkzOERaRlUzaU13azMzQ0lMcWFkZWVFVUdyCkE3cHo0M2hndDNVRWsxQS9DT05ndjVPZTBxUTFWcU5tYVhudjIzK25mTTMybzVSNnphS0w0aGtDZ1lFQTllb0UKc2VrcE9SbXNnOEVMcWZsMVNiK3dMS1psSU5mNENyVjV2Qk9zQncwNHVqOUZveFBlckIxT3BQb1BaeFRqbk9HbgpEWDZ5T1FxZDJCSmIyWi9EbTlybTE2ME9xYTNJWWZ4WGpNTjliampSRk93Zk1FTmdKWHlqNE1QTFhleVd1dHg0CitzRGRBR1BrVURZa1YyNDBFVXBFOXpQS3VnSHhuUG93dTh2MzFyMENnWUVBMCtCQ3lRclBqSHBXWlhsZk1mbS8KQVVvWDY1Z00yczBOLzlGeGh0REpqUGU2MVhGNTdzcmExZzZ4bXE3VWZHQ3JYMnNrTkRheTAzNWVlSHFnNXRpSQpFUTgzdTIxVytkaWU4TC91SkpiMWE4ckFydldCZmVFeW9MdGdQcE1MUTYyR2dPMjFhcVBweEtQTXJra0t1dTVUCi9nOWhsZGpMTDN3VXNjRDhwRDdKMHhrQ2dZQlJrRW40WEhaZ3l3UXVPeFJNVDBJNHNNeVZNcWR1S2xQSjhZRXMKQVhaWWJHazVWUTBhMXRkUFRQVXR3UWJrME1maDIvSlZob1ZFYUNJTWJhSnJYeE01R1hUaGFqUG4wWTBaK3VGcQovZGdYZTk3VlNxL1ppUzlWbjY2WE9UbTFzR2dhR0ZCRUV6MzZDQ2ZNOXZnOHkzK1hrSU9wWGxOS09LVFR4U1B1CjFlc2hIUUtCZ0E2Mk5HcFlCVkdMakdvWWVReWw5NEVEL1pEb1BBdHBDK2VXTFJMMkdaVjZRbGhLVnR3TnZsTmEKR0x0MG5FQVNCa3RSc3pIanZmT0U5RitMbWo1ZC9KZ29hTFo3SU1xQTZHVHZ2R09LcURDZ0pmc1VlMUF2MFhCNQpKL0FVVFoxVHNMeGQvN2N5aEQxZ3A0SVFHYThnVEFqdkhzWHJVaUp3YTVaR0ZqY3FaMmIvCi0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0tCg==
```

```
$ echo LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURJVENDQWdtZ0F3SUJBZ0lJRzV1c0M3ZitQeUF3RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TXpBNE1qZ3dOalExTkRSYUZ3MHlOREE0TWpjd05qUTFORFZhTURReApGekFWQmdOVkJBb1REbk41YzNSbGJUcHRZWE4wWlhKek1Sa3dGd1lEVlFRREV4QnJkV0psY201bGRHVnpMV0ZrCmJXbHVNSUlCSWpBTkJna3Foa2lHOXcwQkFRRUZBQU9DQVE4QU1JSUJDZ0tDQVFFQThlc1c2U3VicXRrcW5mcHMKdjBzeEdteEdJTGZjaFhuWU5pWkhIR0t1OFN2aGZUUDByOUhtNXM2MFptYUVCQXcySzJvV1RqZXg3ZEhHeXg0MAowdWZYbTZOcG5PU2orMzBHOWRSMk1FZGZGbmdPNWMxNmRWV0ZRS210cmpmUW1pS3RoVWQwUE5oWmhUcHgwZWliCmpnTW01OHNUMHNtcjlvazdqTVdUZVI2cUlLQ3RjeEg1S2QwYTVzVk95TWNPVXBZNDRlZk5qSXZCanpDdmFCZmkKOWtpL1dkMEdnT2hLVUh2R3pmZ1VSMVBKYjE0dWdiZDdYMnNTWmh0Tlgzb0ZQWGNUMHNkNUp0eGtUVjhnTUxOZQpkeWNQWDZESFBSNzBiemNxaG1iTW44TnFkNnNGQVRLSU5LSmRiL1pZM0tGZy92WG1aM1JNNW1vVS9STnVrQ2sxCjZXWFNkUUlEQVFBQm8xWXdWREFPQmdOVkhROEJBZjhFQkFNQ0JhQXdFd1lEVlIwbEJBd3dDZ1lJS3dZQkJRVUgKQXdJd0RBWURWUjBUQVFIL0JBSXdBREFmQmdOVkhTTUVHREFXZ0JUdis1dmFFZVJwTUFIMmRRMUtEVXZtdUFhTwp3ekFOQmdrcWhraUc5dzBCQVFzRkFBT0NBUUVBbEpUR0RkZlhvU3dyTTgxSjR4RWNTTE5QVUFsQ1V0b014eWZhCnpsMlRMeUxnc1ZOMGVjK0hKWml1SXhHZHBYZnBzR3BSNUk0N1V6TEVxTmc0ZjE1WWVqaXpuMGRmeVBmVkt3bmcKSm80amFrOGlZR2JqYUlwUy9nM2ZXcmRGdTF0MTdwZEVRc0dQbmR3blQyTHBFR2xjOXZ6b21Xc3NhRG1oRXMrdQprQThiejNFZE9lektmS3N3VXBzSWNLVU0xRUdaVmZpQXBRSnBvQmtkU2lwWDgyN3F2a3pYdks5NTZaQitDYksyCjJJWDZZbzJDVDE1Und4enFBeEphOE5VZGhFdStGY3lQNnRqWXV3QWxCaTJpOG5tTkpVVjk1clF5REJIRTdJOUIKNE45SnA0aVVoakdVTkFJcHIzV1FjYzlDRVVJL1ByTGVSUHlZc2c5NWcrYTRkTTFld1E9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg== | base64 -d > admin.crt

$ cat admin.crt
-----BEGIN CERTIFICATE-----
MIIDITCCAgmgAwIBAgIIG5usC7f+PyAwDQYJKoZIhvcNAQELBQAwFTETMBEGA1UE
AxMKa3ViZXJuZXRlczAeFw0yMzA4MjgwNjQ1NDRaFw0yNDA4MjcwNjQ1NDVaMDQx
FzAVBgNVBAoTDnN5c3RlbTptYXN0ZXJzMRkwFwYDVQQDExBrdWJlcm5ldGVzLWFk
bWluMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA8esW6Subqtkqnfps
v0sxGmxGILfchXnYNiZHHGKu8SvhfTP0r9Hm5s60ZmaEBAw2K2oWTjex7dHGyx40
0ufXm6NpnOSj+30G9dR2MEdfFngO5c16dVWFQKmtrjfQmiKthUd0PNhZhTpx0eib
jgMm58sT0smr9ok7jMWTeR6qIKCtcxH5Kd0a5sVOyMcOUpY44efNjIvBjzCvaBfi
9ki/Wd0GgOhKUHvGzfgUR1PJb14ugbd7X2sSZhtNX3oFPXcT0sd5JtxkTV8gMLNe
dycPX6DHPR70bzcqhmbMn8Nqd6sFATKINKJdb/ZY3KFg/vXmZ3RM5moU/RNukCk1
6WXSdQIDAQABo1YwVDAOBgNVHQ8BAf8EBAMCBaAwEwYDVR0lBAwwCgYIKwYBBQUH
AwIwDAYDVR0TAQH/BAIwADAfBgNVHSMEGDAWgBTv+5vaEeRpMAH2dQ1KDUvmuAaO
wzANBgkqhkiG9w0BAQsFAAOCAQEAlJTGDdfXoSwrM81J4xEcSLNPUAlCUtoMxyfa
zl2TLyLgsVN0ec+HJZiuIxGdpXfpsGpR5I47UzLEqNg4f15Yejizn0dfyPfVKwng
Jo4jak8iYGbjaIpS/g3fWrdFu1t17pdEQsGPndwnT2LpEGlc9vzomWssaDmhEs+u
kA8bz3EdOezKfKswUpsIcKUM1EGZVfiApQJpoBkdSipX827qvkzXvK956ZB+CbK2
2IX6Yo2CT15RwxzqAxJa8NUdhEu+FcyP6tjYuwAlBi2i8nmNJUV95rQyDBHE7I9B
4N9Jp4iUhjGUNAIpr3WQcc9CEUI/PrLeRPyYsg95g+a4dM1ewQ==
-----END CERTIFICATE-----

$ echo LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFb3dJQkFBS0NBUUVBOGVzVzZTdWJxdGtxbmZwc3Ywc3hHbXhHSUxmY2hYbllOaVpISEdLdThTdmhmVFAwCnI5SG01czYwWm1hRUJBdzJLMm9XVGpleDdkSEd5eDQwMHVmWG02TnBuT1NqKzMwRzlkUjJNRWRmRm5nTzVjMTYKZFZXRlFLbXRyamZRbWlLdGhVZDBQTmhaaFRweDBlaWJqZ01tNThzVDBzbXI5b2s3ak1XVGVSNnFJS0N0Y3hINQpLZDBhNXNWT3lNY09VcFk0NGVmTmpJdkJqekN2YUJmaTlraS9XZDBHZ09oS1VIdkd6ZmdVUjFQSmIxNHVnYmQ3Clgyc1NaaHROWDNvRlBYY1Qwc2Q1SnR4a1RWOGdNTE5lZHljUFg2REhQUjcwYnpjcWhtYk1uOE5xZDZzRkFUS0kKTktKZGIvWlkzS0ZnL3ZYbVozUk01bW9VL1JOdWtDazE2V1hTZFFJREFRQUJBb0lCQUdZem9rYzVwQmNtamVtVgp6WEYzYTdRMC85OThyWTQ2TG95WjJUcjF1ZUNyWUNUTDJWaVovY21PbEFvYXp6VUNqN1FCcXBDNjJOR1c2VHdRCmM5S1NIYlZqOFE5V1RLekhZalJpNE5kK24zNVhsRHVqZGxPeG9Jeno0aXNTNjI3aXJabjcyUENIbWpJOXdhNGoKYmV3dUNyYXNSYUNza0ppajIyT2FhTFluclVvQXBWMER0ZzI2dzlJaTl0aEltRzJwZlJFUndFZ010WEZnUXd5MwpYb3ZMRHRtZGx3VFNsZ1VCekZCZ3U3NXZJM09hdk9FQlhIY0ZZY3RDOHhEN21zU0xoMG5temF0V0NTQTdSRE01Cnc5QjhCaDVmbENHcms3RjRpOGtjbzNlbmpFdTRzYzNNUU1yYnB1Y25EUzhqYVVUN2RWclBTMm5TNjZyN2JnRTEKUGJQZ1oyRUNnWUVBKzljZDh0bGxlQkpUUkM1YnpxaWxtZkZ2bWhQQTJhSjNXME8wbmlhUStLV1dHVnlFakk1UwovaXhTQUYwNktLL3BmY0hyN2hkeFRiU3cwV0tMWEhzYnMraFRFTjkzOERaRlUzaU13azMzQ0lMcWFkZWVFVUdyCkE3cHo0M2hndDNVRWsxQS9DT05ndjVPZTBxUTFWcU5tYVhudjIzK25mTTMybzVSNnphS0w0aGtDZ1lFQTllb0UKc2VrcE9SbXNnOEVMcWZsMVNiK3dMS1psSU5mNENyVjV2Qk9zQncwNHVqOUZveFBlckIxT3BQb1BaeFRqbk9HbgpEWDZ5T1FxZDJCSmIyWi9EbTlybTE2ME9xYTNJWWZ4WGpNTjliampSRk93Zk1FTmdKWHlqNE1QTFhleVd1dHg0CitzRGRBR1BrVURZa1YyNDBFVXBFOXpQS3VnSHhuUG93dTh2MzFyMENnWUVBMCtCQ3lRclBqSHBXWlhsZk1mbS8KQVVvWDY1Z00yczBOLzlGeGh0REpqUGU2MVhGNTdzcmExZzZ4bXE3VWZHQ3JYMnNrTkRheTAzNWVlSHFnNXRpSQpFUTgzdTIxVytkaWU4TC91SkpiMWE4ckFydldCZmVFeW9MdGdQcE1MUTYyR2dPMjFhcVBweEtQTXJra0t1dTVUCi9nOWhsZGpMTDN3VXNjRDhwRDdKMHhrQ2dZQlJrRW40WEhaZ3l3UXVPeFJNVDBJNHNNeVZNcWR1S2xQSjhZRXMKQVhaWWJHazVWUTBhMXRkUFRQVXR3UWJrME1maDIvSlZob1ZFYUNJTWJhSnJYeE01R1hUaGFqUG4wWTBaK3VGcQovZGdYZTk3VlNxL1ppUzlWbjY2WE9UbTFzR2dhR0ZCRUV6MzZDQ2ZNOXZnOHkzK1hrSU9wWGxOS09LVFR4U1B1CjFlc2hIUUtCZ0E2Mk5HcFlCVkdMakdvWWVReWw5NEVEL1pEb1BBdHBDK2VXTFJMMkdaVjZRbGhLVnR3TnZsTmEKR0x0MG5FQVNCa3RSc3pIanZmT0U5RitMbWo1ZC9KZ29hTFo3SU1xQTZHVHZ2R09LcURDZ0pmc1VlMUF2MFhCNQpKL0FVVFoxVHNMeGQvN2N5aEQxZ3A0SVFHYThnVEFqdkhzWHJVaUp3YTVaR0ZqY3FaMmIvCi0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0tCg== | base64 -d > admin.key

$ cat admin.key
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA8esW6Subqtkqnfpsv0sxGmxGILfchXnYNiZHHGKu8SvhfTP0
r9Hm5s60ZmaEBAw2K2oWTjex7dHGyx400ufXm6NpnOSj+30G9dR2MEdfFngO5c16
dVWFQKmtrjfQmiKthUd0PNhZhTpx0eibjgMm58sT0smr9ok7jMWTeR6qIKCtcxH5
Kd0a5sVOyMcOUpY44efNjIvBjzCvaBfi9ki/Wd0GgOhKUHvGzfgUR1PJb14ugbd7
X2sSZhtNX3oFPXcT0sd5JtxkTV8gMLNedycPX6DHPR70bzcqhmbMn8Nqd6sFATKI
NKJdb/ZY3KFg/vXmZ3RM5moU/RNukCk16WXSdQIDAQABAoIBAGYzokc5pBcmjemV
zXF3a7Q0/998rY46LoyZ2Tr1ueCrYCTL2ViZ/cmOlAoazzUCj7QBqpC62NGW6TwQ
c9KSHbVj8Q9WTKzHYjRi4Nd+n35XlDujdlOxoIzz4isS627irZn72PCHmjI9wa4j
bewuCrasRaCskJij22OaaLYnrUoApV0Dtg26w9Ii9thImG2pfRERwEgMtXFgQwy3
XovLDtmdlwTSlgUBzFBgu75vI3OavOEBXHcFYctC8xD7msSLh0nmzatWCSA7RDM5
w9B8Bh5flCGrk7F4i8kco3enjEu4sc3MQMrbpucnDS8jaUT7dVrPS2nS66r7bgE1
PbPgZ2ECgYEA+9cd8tlleBJTRC5bzqilmfFvmhPA2aJ3W0O0niaQ+KWWGVyEjI5S
/ixSAF06KK/pfcHr7hdxTbSw0WKLXHsbs+hTEN938DZFU3iMwk33CILqadeeEUGr
A7pz43hgt3UEk1A/CONgv5Oe0qQ1VqNmaXnv23+nfM32o5R6zaKL4hkCgYEA9eoE
sekpORmsg8ELqfl1Sb+wLKZlINf4CrV5vBOsBw04uj9FoxPerB1OpPoPZxTjnOGn
DX6yOQqd2BJb2Z/Dm9rm160Oqa3IYfxXjMN9bjjRFOwfMENgJXyj4MPLXeyWutx4
+sDdAGPkUDYkV240EUpE9zPKugHxnPowu8v31r0CgYEA0+BCyQrPjHpWZXlfMfm/
AUoX65gM2s0N/9FxhtDJjPe61XF57sra1g6xmq7UfGCrX2skNDay035eeHqg5tiI
EQ83u21W+die8L/uJJb1a8rArvWBfeEyoLtgPpMLQ62GgO21aqPpxKPMrkkKuu5T
/g9hldjLL3wUscD8pD7J0xkCgYBRkEn4XHZgywQuOxRMT0I4sMyVMqduKlPJ8YEs
AXZYbGk5VQ0a1tdPTPUtwQbk0Mfh2/JVhoVEaCIMbaJrXxM5GXThajPn0Y0Z+uFq
/dgXe97VSq/ZiS9Vn66XOTm1sGgaGFBEEz36CCfM9vg8y3+XkIOpXlNKOKTTxSPu
1eshHQKBgA62NGpYBVGLjGoYeQyl94ED/ZDoPAtpC+eWLRL2GZV6QlhKVtwNvlNa
GLt0nEASBktRszHjvfOE9F+Lmj5d/JgoaLZ7IMqA6GTvvGOKqDCgJfsUe1Av0XB5
J/AUTZ1TsLxd/7cyhD1gp4IQGa8gTAjvHsXrUiJwa5ZGFjcqZ2b/
-----END RSA PRIVATE KEY-----
```

```
$ curl --key admin.key --cert admin.crt --header "Content-Type: application/json-patch+json" \
--request PATCH -k \
--data '[{"op": "add", "path": "/status/capacity/blog.zhongmingmao.top~1reclaimed-cpu", "value": "2"}]' \
https://192.168.191.153:6443/api/v1/nodes/mac-k8s/status
...
  "status": {
    "capacity": {
      "blog.zhongmingmao.top/reclaimed-cpu": "2",
      "cpu": "4",
      "ephemeral-storage": "31270768Ki",
      "hugepages-1Gi": "0",
      "hugepages-2Mi": "0",
      "hugepages-32Mi": "0",
      "hugepages-64Ki": "0",
      "memory": "12236568Ki",
      "pods": "110"
    },
...
```

```yaml
apiVersion: v1
kind: Node
...
status:
  ...
  allocatable:
    blog.zhongmingmao.top/reclaimed-cpu: "2"
    cpu: "4"
    ephemeral-storage: "28819139742"
    hugepages-1Gi: "0"
    hugepages-2Mi: "0"
    hugepages-32Mi: "0"
    hugepages-64Ki: "0"
    memory: 12134168Ki
    pods: "110"
  capacity:
    blog.zhongmingmao.top/reclaimed-cpu: "2"
    cpu: "4"
    ephemeral-storage: 31270768Ki
    hugepages-1Gi: "0"
    hugepages-2Mi: "0"
    hugepages-32Mi: "0"
    hugepages-64Ki: "0"
    memory: 12236568Ki
    pods: "110"
...
```

## 使用资源

> `requests` 必须等于 `limits`，因为 Kubernetes 无法处理扩展资源的`超售`

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
          image: nginx:1.25.2
          resources:
            limits:
              blog.zhongmingmao.top/reclaimed-cpu: 3
            requests:
              blog.zhongmingmao.top/reclaimed-cpu: 3
```

```
$ k get po
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-55fc4589c4-tmpl8   0/1     Pending   0          12s

$ k describe po nginx-deployment-55fc4589c4-tmpl8
...
Events:
  Type     Reason            Age   From               Message
  ----     ------            ----  ----               -------
  Warning  FailedScheduling  29s   default-scheduler  0/1 nodes are available: 1 Insufficient blog.zhongmingmao.top/reclaimed-cpu.
```

> 将 requests 和 limits 修改为 2

```
$ k get po
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-7dc5566646-nfbxk   1/1     Running   0          25s
```

> 扩展资源的`扣除`需要对应的 `Runtime` 来支持，目前暂时没有实现
> 因此  `blog.zhongmingmao.top/reclaimed-cpu` 依然为 2

```yaml
status:
  allocatable:
    blog.zhongmingmao.top/reclaimed-cpu: "2"
    cpu: "4"
    ephemeral-storage: "28819139742"
    hugepages-1Gi: "0"
    hugepages-2Mi: "0"
    hugepages-32Mi: "0"
    hugepages-64Ki: "0"
    memory: 12134168Ki
    pods: "110"
  capacity:
    blog.zhongmingmao.top/reclaimed-cpu: "2"
    cpu: "4"
    ephemeral-storage: 31270768Ki
    hugepages-1Gi: "0"
    hugepages-2Mi: "0"
    hugepages-32Mi: "0"
    hugepages-64Ki: "0"
    memory: 12236568Ki
    pods: "110"
```

## 集群

1. 可以选择由`默认调度器`来管理资源
   - `Request 和 Limit 必须一致`，因为 Kubernetes 无法确保扩展资源的`超售`
2. 更常见的场景是使用调度器扩展程序（`Scheduler Extenders`）管理，这些程序处理资源消耗和资源配额

> 修改调度器策略，配置 `ignoredByScheduler` 可配置调度器`不要检查自定义资源`

```json
{
  "kind": "Policy",
  "apiVersion": "v1",
  "extenders": [
    {
      "urlPrefix": "<extender-endpoint>",
      "bindVerb": "bind",
      "managedResources": [
        {
          "name": "blog.zhongmingmao.top/reclaimed-cpu",
          "ignoredByScheduler": true
        }
      ]
    }
  ]
}
```

# 高可用集群

## 高可用层级

> 核心组件（Static Pod）：etcd / api-server / scheduler / controller-manager / kubelet / kube-proxy
> 插件（用户 Pod）：CNI / CoreDNS

> 镜像仓库：Docker Hub 会限流或者不可用

![image-20231003102132552](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231003102132552.png)

## IDC

> `跨可用区`的硬件迁移属于`物理迁移`，需要一定的时间

1. 多地部署（私有云 / 公有云）
2. 每个 IDC 需要划分成具有`独立`供电、制冷、网络设备的`高可用区`
3. 每个高可用区管理`独立的硬件资产`（机架、计算节点、存储、负载均衡、防火墙等）

## Node Lifecycle

> `集群搭建`和`集群扩缩容`，核心都是 `Node 的生命周期管理`

1. Onboard
   - 物理资产上架
   - 操作系统安装
   - 网络配置
   - Kubernetes 组件安装
   - 创建 Node 对象
2. 故障处理
   - 临时故障 - 重启
   - 永久故障 - 下架
3. Offboard
   - 删除 Node 对象
   - 物理资产下架，送修 / 报废

## 主机管理

> 社区推崇`不可变基础设施`，即`完全替换`，而非 OTA

1. 选定`内核版本`、`发行版`、安装的`工具集`、规划`主机网络`
2. 日常的`主机镜像升级`可能会导致服务不可用
   - 可以通过 `A/B`  系统 OTA 的升级方式
   - 分别使用 A 和 B 两个存储空间，`共享一份用户数据`
   - 在升级过程中，OTA 更新即`往其中一个存储空间写入升级包，同时保证另一个系统可以正常运行`，而不会打断用户
   - 如果 OTA 失败，那么设备启动到 OTA 之前的磁盘分区，仍然可以使用

## 控制平面

1. 针对大规模的集群，应该为控制平面组件划分`单独节点`，减少业务容器对控制平面容器或守护进程的干扰和资源抢占
2. 控制平面所在的节点，应确保在`不同机架`上
   - 防止因为某些机架的交换机或者电源出问题，造成所有的控制平面的节点都无法工作
3. 保证控制平面的每个组件有足够的 `CPU`、`内存`和`磁盘`资源，过于严苛的资源限制会降低`集群可用性`
4. 尽可能地减少或者消除外部依赖
5. 尽可能地将`控制平面和数据平面解耦`，确保控制平面出现故障时，将业务影响降到最低
6. Kubernetes 还有些`核心插件`，以`普通 Pod` 的形式加载运行，可能会被调度到`任意工作节点`，与普通应用竞争资源
   - 这些插件是否正常运行也决定了集群的可用性

## 高可用集群

![image-20231003133943024](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231003133943024.png)

## 集群安装

> Kubeadm = 关注`控制平面`
> Kubespray = Kubeadm + 通过 `Ansible Playbook` 实现操作系统配置自动化
> `kOps` ≈ Kubespray + `声明式 API`

| 安装工具                | 方法                                                         | 优点                                                         | 缺点                                                         |
| ----------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| 二进制                  | 下载二进制文件，并通过 `systemd` 来管理                      | 灵活度高                                                     | 复杂，需要关心每个组件的配置<br />对系统服务的依赖性过多     |
| Kubeadm<br />半自动化   | 搭建集群的`命令行工具`<br />管理节点通过 kubeadm init 初始化<br />计算节点通过 kubeadm join 加入 | 封装`控制平面组件`的安装和配置<br />管理集群的生命周期（升级、证书） | `操作系统`层面的配置没有自动化<br />运行时安装配置依然复杂<br />CNI 插件等需要手工安装 |
| Kubespray<br />全自动化 | 通过 `Ansible Playbook` 完成集群搭建                         | 自动完成`操作系统`层面的配置<br />利用 `kubeadm` 作为集群管理工具 | 只是一个集群安装工具<br /> 缺少 `声明式 API`                 |
| kOps<br />全自动化      | 基于`声明式 API` 的`集群管理`工具                            | 基于 `Cluster API` 集群管理<br />                            | 与云环境`深度集成`<br />灵活性差                             |

### Kubespray

> 只是一个集群安装工具，并非集群`持续运维`工具

![image-20231003142220404](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231003142220404.png)

### Cluster API

> 集群搭建只是 Day 0 的事项，`集群管理`应该建立在`声明式 API` 的基础上，使得集群`可持续运维`

1. 集群搭建
2. 集群扩缩容
3. 节点健康检查和自动修复
4. Kubernetes 升级
5. 操作系统升级

> 社区主流 - Kubernetes on Kubernetes

![image-20231003155051688](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231003155051688.png)

#### 角色

| Role                    | Desc                                                         |
| ----------------------- | ------------------------------------------------------------ |
| 管理集群                | 管理 Workload 集群的集群，用来存放 Cluster API 的地方        |
| Workload 集群           | 真正开放给用户用来运行应用的集群，由管理集群管理             |
| Infrastructure Provider | 提供不同云的基础架构管理，包括计算节点、网络等<br />目前流行的公有云都与 Cluster API 完成了集成 |
| Control Plane Provider  | 通过什么方式安装 Kubernetes 的控制面组件                     |
| Bootstrap Provider      | 证书生成<br />控制面组件的安装和初始化，监听 Machine 的创建事件<br />将 Master 节点和 Worker 节点加入集群 |

#### 模型

> 由 `Infrastructure Provider`  来提供 `Machine`

| Model                | Desc                                                         |
| -------------------- | ------------------------------------------------------------ |
| Machine              | 计算节点，用来描述可以运行 Kubernetes 组件的机器对象<br />一个 Machine 被创建后，Infrastructure Provider 会创建一个计算节点并安装好操作系统<br />一个 Machine 被删除后，Infrastructure Provider 会删除掉该计算节点并回收计算资源<br />当 Machine 属性被变更后，Infrastructure Provider 会`删除`旧计算节点并创建新计算节点 |
| Machine Immutability | 不可变基础架构（`Replace`）                                  |
| MachineSet           | 维护一个稳定的机器集合，类似于 Kubernetes ReplicaSet         |
| MachineDeployment    | 提供 Machine 和 MachineSet 的声明式更新，类似于 Kubernetes Deployment |
| MachineHealthCheck   | 定义应该被标记为不可用的条件                                 |

> `MachineHealthCheck` 可以结合 `NPD` 一起使用

![image-20231004144342140](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231004144342140.png)

#### Kind

> 启动管理集群

```yaml kind.conf
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  extraMounts:
    - hostPath: /var/run/docker.sock
      containerPath: /var/run/docker.sock
```

```
$ env KIND_EXPERIMENTAL_DOCKER_NETWORK=bridge

$ kind create cluster --config ./kind.conf
Creating cluster "kind" ...
 ✓ Ensuring node image (kindest/node:v1.27.3) 🖼
 ✓ Preparing nodes 📦
 ✓ Writing configuration 📜
 ✓ Starting control-plane 🕹️
 ✓ Installing CNI 🔌
 ✓ Installing StorageClass 💾
Set kubectl context to "kind-kind"
You can now use your cluster with:

kubectl cluster-info --context kind-kind

$ docker ps -a
CONTAINER ID   IMAGE                  COMMAND                  CREATED          STATUS          PORTS                       NAMES
f5ffa0c472eb   kindest/node:v1.27.3   "/usr/local/bin/entr…"   15 minutes ago   Up 15 minutes   127.0.0.1:49383->6443/tcp   kind-control-plane

$ k get po -A
NAMESPACE            NAME                                         READY   STATUS    RESTARTS   AGE
kube-system          coredns-5d78c9869d-482md                     1/1     Running   0          37s
kube-system          coredns-5d78c9869d-w64mb                     1/1     Running   0          37s
kube-system          etcd-kind-control-plane                      1/1     Running   0          51s
kube-system          kindnet-ng9n6                                1/1     Running   0          37s
kube-system          kube-apiserver-kind-control-plane            1/1     Running   0          51s
kube-system          kube-controller-manager-kind-control-plane   1/1     Running   0          51s
kube-system          kube-proxy-zdffj                             1/1     Running   0          37s
kube-system          kube-scheduler-kind-control-plane            1/1     Running   0          51s
local-path-storage   local-path-provisioner-6bc4bddd6b-wxwvm      1/1     Running   0          37s

$ kubecm l
+------------+--------------+--------------+--------------+----------------------------+--------------+
|   CURRENT  |     NAME     |    CLUSTER   |     USER     |           SERVER           |   Namespace  |
+============+==============+==============+==============+============================+==============+
|      *     |   kind-kind  |   kind-kind  |   kind-kind  |   https://127.0.0.1:49383  |    default   |
+------------+--------------+--------------+--------------+----------------------------+--------------+

Cluster check succeeded!
Kubernetes version v1.27.3
Kubernetes master is running at https://127.0.0.1:49383
[Summary] Namespace: 5 Node: 1 Pod: 9
```

> 在管理集群上安装 `Cluster API`，并使用 `Docker` 作为 `Infrastructure Provider`

```
$ clusterctl init --infrastructure docker --config dockercluster.yaml
Fetching providers
Installing cert-manager Version="v1.13.0"
Waiting for cert-manager to be available...
Installing Provider="cluster-api" Version="v1.5.2" TargetNamespace="capi-system"
Installing Provider="bootstrap-kubeadm" Version="v1.5.2" TargetNamespace="capi-kubeadm-bootstrap-system"
Installing Provider="control-plane-kubeadm" Version="v1.5.2" TargetNamespace="capi-kubeadm-control-plane-system"
Installing Provider="infrastructure-docker" Version="v1.5.2" TargetNamespace="capd-system"

Your management cluster has been initialized successfully!

You can now create your first workload cluster by running the following:

  clusterctl generate cluster [name] --kubernetes-version [version] | kubectl apply -f -
```

> `Bootstrap Provider` 和 `Control Plane Provider` 均通过 `Kubeadm` 来实现

```
$ k get ns
NAME                                STATUS   AGE
capd-system                         Active   6m56s
capi-kubeadm-bootstrap-system       Active   6m57s
capi-kubeadm-control-plane-system   Active   6m57s
capi-system                         Active   6m58s
cert-manager                        Active   8m24s
default                             Active   11m
kube-node-lease                     Active   11m
kube-public                         Active   11m
kube-system                         Active   11m
local-path-storage                  Active   11m

$ k get po -A
NAMESPACE                           NAME                                                             READY   STATUS    RESTARTS   AGE
capd-system                         capd-controller-manager-987df6999-9qmq7                          1/1     Running   0          7m14s
capi-kubeadm-bootstrap-system       capi-kubeadm-bootstrap-controller-manager-565c858799-q69vx       1/1     Running   0          7m15s
capi-kubeadm-control-plane-system   capi-kubeadm-control-plane-controller-manager-857f6cc8f4-jf77m   1/1     Running   0          7m14s
capi-system                         capi-controller-manager-56846fbb5b-zvt2g                         1/1     Running   0          7m15s
cert-manager                        cert-manager-5f9cb7f4c9-x2nv8                                    1/1     Running   0          8m42s
cert-manager                        cert-manager-cainjector-cbdcd8858-slhxl                          1/1     Running   0          8m42s
cert-manager                        cert-manager-webhook-bb9f4dd8-drqfk                              1/1     Running   0          8m42s
kube-system                         coredns-5d78c9869d-482md                                         1/1     Running   0          11m
kube-system                         coredns-5d78c9869d-w64mb                                         1/1     Running   0          11m
kube-system                         etcd-kind-control-plane                                          1/1     Running   0          11m
kube-system                         kindnet-ng9n6                                                    1/1     Running   0          11m
kube-system                         kube-apiserver-kind-control-plane                                1/1     Running   0          11m
kube-system                         kube-controller-manager-kind-control-plane                       1/1     Running   0          11m
kube-system                         kube-proxy-zdffj                                                 1/1     Running   0          11m
kube-system                         kube-scheduler-kind-control-plane                                1/1     Running   0          11m
local-path-storage                  local-path-provisioner-6bc4bddd6b-wxwvm                          1/1     Running   0          11m
```

```
$ k get crd
NAME                                                         CREATED AT
certificaterequests.cert-manager.io                          2022-10-04T04:56:05Z
certificates.cert-manager.io                                 2022-10-04T04:56:05Z
challenges.acme.cert-manager.io                              2022-10-04T04:56:05Z
clusterclasses.cluster.x-k8s.io                              2022-10-04T04:57:31Z
clusterissuers.cert-manager.io                               2022-10-04T04:56:05Z
clusterresourcesetbindings.addons.cluster.x-k8s.io           2022-10-04T04:57:31Z
clusterresourcesets.addons.cluster.x-k8s.io                  2022-10-04T04:57:31Z
clusters.cluster.x-k8s.io                                    2022-10-04T04:57:32Z
dockerclusters.infrastructure.cluster.x-k8s.io               2022-10-04T04:57:33Z
dockerclustertemplates.infrastructure.cluster.x-k8s.io       2022-10-04T04:57:33Z
dockermachinepools.infrastructure.cluster.x-k8s.io           2022-10-04T04:57:33Z
dockermachines.infrastructure.cluster.x-k8s.io               2022-10-04T04:57:33Z
dockermachinetemplates.infrastructure.cluster.x-k8s.io       2022-10-04T04:57:33Z
extensionconfigs.runtime.cluster.x-k8s.io                    2022-10-04T04:57:32Z
ipaddressclaims.ipam.cluster.x-k8s.io                        2022-10-04T04:57:32Z
ipaddresses.ipam.cluster.x-k8s.io                            2022-10-04T04:57:32Z
issuers.cert-manager.io                                      2022-10-04T04:56:05Z
kubeadmconfigs.bootstrap.cluster.x-k8s.io                    2022-10-04T04:57:32Z
kubeadmconfigtemplates.bootstrap.cluster.x-k8s.io            2022-10-04T04:57:32Z
kubeadmcontrolplanes.controlplane.cluster.x-k8s.io           2022-10-04T04:57:32Z
kubeadmcontrolplanetemplates.controlplane.cluster.x-k8s.io   2022-10-04T04:57:33Z
machinedeployments.cluster.x-k8s.io                          2022-10-04T04:57:32Z
machinehealthchecks.cluster.x-k8s.io                         2022-10-04T04:57:32Z
machinepools.cluster.x-k8s.io                                2022-10-04T04:57:32Z
machines.cluster.x-k8s.io                                    2022-10-04T04:57:32Z
machinesets.cluster.x-k8s.io                                 2022-10-04T04:57:32Z
orders.acme.cert-manager.io                                  2022-10-04T04:56:05Z
providers.clusterctl.cluster.x-k8s.io                        2022-10-04T04:55:56Z
```

```
$ k api-resources | grep 'cluster.x-k8s.io/v1beta1'
clusterresourcesetbindings                     addons.cluster.x-k8s.io/v1beta1           true         ClusterResourceSetBinding
clusterresourcesets                            addons.cluster.x-k8s.io/v1beta1           true         ClusterResourceSet
kubeadmconfigs                                 bootstrap.cluster.x-k8s.io/v1beta1        true         KubeadmConfig
kubeadmconfigtemplates                         bootstrap.cluster.x-k8s.io/v1beta1        true         KubeadmConfigTemplate
clusterclasses                    cc           cluster.x-k8s.io/v1beta1                  true         ClusterClass
clusters                          cl           cluster.x-k8s.io/v1beta1                  true         Cluster
machinedeployments                md           cluster.x-k8s.io/v1beta1                  true         MachineDeployment
machinehealthchecks               mhc,mhcs     cluster.x-k8s.io/v1beta1                  true         MachineHealthCheck
machinepools                      mp           cluster.x-k8s.io/v1beta1                  true         MachinePool
machines                          ma           cluster.x-k8s.io/v1beta1                  true         Machine
machinesets                       ms           cluster.x-k8s.io/v1beta1                  true         MachineSet
kubeadmcontrolplanes              kcp          controlplane.cluster.x-k8s.io/v1beta1     true         KubeadmControlPlane
kubeadmcontrolplanetemplates                   controlplane.cluster.x-k8s.io/v1beta1     true         KubeadmControlPlaneTemplate
dockerclusters                                 infrastructure.cluster.x-k8s.io/v1beta1   true         DockerCluster
dockerclustertemplates                         infrastructure.cluster.x-k8s.io/v1beta1   true         DockerClusterTemplate
dockermachinepools                             infrastructure.cluster.x-k8s.io/v1beta1   true         DockerMachinePool
dockermachines                                 infrastructure.cluster.x-k8s.io/v1beta1   true         DockerMachine
dockermachinetemplates                         infrastructure.cluster.x-k8s.io/v1beta1   true         DockerMachineTemplate
```

> 生成Workload 集群的配置

```
$ clusterctl generate cluster capi-first --flavor development \
  --kubernetes-version v1.22.2 \
  --control-plane-machine-count=1 \
  --worker-machine-count=1 \
  > capi-first.yaml
```

> 使用 `Kubeadm` 搭建`控制面`，使用 `Docker` 作为 `Infrastructure Provider`

> `KubeadmControlPlane` 为 `Master` 节点，指定了 kubeadm 配置以及 Infrastructure 的配置
> `MachineDeployment` 为 `Worker` 节点，指定了 bootstrap 逻辑（即如何 kubeadm join）和 Infrastructure 的配置

```yaml capi-first.yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: Cluster
metadata:
  name: capi-first
  namespace: default
spec:
  clusterNetwork:
    pods:
      cidrBlocks:
      - 192.168.0.0/16
    serviceDomain: cluster.local
    services:
      cidrBlocks:
      - 10.128.0.0/12
  controlPlaneRef:
    apiVersion: controlplane.cluster.x-k8s.io/v1beta1
    kind: KubeadmControlPlane
    name: capi-first-control-plane
    namespace: default
  infrastructureRef:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
    kind: DockerCluster
    name: capi-first
    namespace: default
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: DockerCluster
metadata:
  name: capi-first
  namespace: default
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: DockerMachineTemplate
metadata:
  name: capi-first-control-plane
  namespace: default
spec:
  template:
    spec:
      extraMounts:
      - containerPath: /var/run/docker.sock
        hostPath: /var/run/docker.sock
---
apiVersion: controlplane.cluster.x-k8s.io/v1beta1
kind: KubeadmControlPlane
metadata:
  name: capi-first-control-plane
  namespace: default
spec:
  kubeadmConfigSpec:
    clusterConfiguration:
      apiServer:
        certSANs:
        - localhost
        - 127.0.0.1
      controllerManager:
        extraArgs:
          enable-hostpath-provisioner: "true"
    initConfiguration:
      nodeRegistration:
        criSocket: /var/run/docker.sock
        kubeletExtraArgs:
          cgroup-driver: cgroupfs
          eviction-hard: nodefs.available<0%,nodefs.inodesFree<0%,imagefs.available<0%
    joinConfiguration:
      nodeRegistration:
        criSocket: /var/run/docker.sock
        kubeletExtraArgs:
          cgroup-driver: cgroupfs
          eviction-hard: nodefs.available<0%,nodefs.inodesFree<0%,imagefs.available<0%
  machineTemplate:
    infrastructureRef:
      apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
      kind: DockerMachineTemplate
      name: capi-first-control-plane
      namespace: default
  replicas: 1
  version: v1.22.2
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: DockerMachineTemplate
metadata:
  name: capi-first-md-0
  namespace: default
spec:
  template:
    spec: {}
---
apiVersion: bootstrap.cluster.x-k8s.io/v1beta1
kind: KubeadmConfigTemplate
metadata:
  name: capi-first-md-0
  namespace: default
spec:
  template:
    spec:
      joinConfiguration:
        nodeRegistration:
          kubeletExtraArgs:
            cgroup-driver: cgroupfs
            eviction-hard: nodefs.available<0%,nodefs.inodesFree<0%,imagefs.available<0%
---
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineDeployment
metadata:
  name: capi-first-md-0
  namespace: default
spec:
  clusterName: capi-first
  replicas: 1
  selector:
    matchLabels: null
  template:
    spec:
      bootstrap:
        configRef:
          apiVersion: bootstrap.cluster.x-k8s.io/v1beta1
          kind: KubeadmConfigTemplate
          name: capi-first-md-0
          namespace: default
      clusterName: capi-first
      infrastructureRef:
        apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
        kind: DockerMachineTemplate
        name: capi-first-md-0
        namespace: default
      version: v1.22.2
```

> 应用Workload 集群的配置

```
$ k apply -f capi-first.yaml
cluster.cluster.x-k8s.io/capi-first created
dockercluster.infrastructure.cluster.x-k8s.io/capi-first created
dockermachinetemplate.infrastructure.cluster.x-k8s.io/capi-first-control-plane created
kubeadmcontrolplane.controlplane.cluster.x-k8s.io/capi-first-control-plane created
dockermachinetemplate.infrastructure.cluster.x-k8s.io/capi-first-md-0 created
kubeadmconfigtemplate.bootstrap.cluster.x-k8s.io/capi-first-md-0 created
machinedeployment.cluster.x-k8s.io/capi-first-md-0 created

$ docker ps -a
CONTAINER ID   IMAGE                                COMMAND                  CREATED             STATUS             PORTS                              NAMES
4ef170681e3c   kindest/node:v1.22.2                 "/usr/local/bin/entr…"   27 minutes ago      Up 27 minutes      0/tcp, 127.0.0.1:32769->6443/tcp   capi-first-control-plane-jcgts
25e97478c24e   kindest/haproxy:v20230510-486859a6   "haproxy -W -db -f /…"   30 minutes ago      Up 30 minutes      0/tcp, 0.0.0.0:32768->6443/tcp     capi-first-lb
f5ffa0c472eb   kindest/node:v1.27.3                 "/usr/local/bin/entr…"   About an hour ago   Up About an hour   127.0.0.1:49383->6443/tcp          kind-control-plane

$ k get cluster -A
NAMESPACE   NAME         PHASE         AGE   VERSION
default     capi-first   Provisioned   32s
```

> k get cluster capi-first -oyaml

```yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: Cluster
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"cluster.x-k8s.io/v1beta1","kind":"Cluster","metadata":{"annotations":{},"name":"capi-first","namespace":"default"},"spec":{"clusterNetwork":{"pods":{"cidrBlocks":["192.168.0.0/16"]},"serviceDomain":"cluster.local","services":{"cidrBlocks":["10.128.0.0/12"]}},"controlPlaneRef":{"apiVersion":"controlplane.cluster.x-k8s.io/v1beta1","kind":"KubeadmControlPlane","name":"capi-first-control-plane","namespace":"default"},"infrastructureRef":{"apiVersion":"infrastructure.cluster.x-k8s.io/v1beta1","kind":"DockerCluster","name":"capi-first","namespace":"default"}}}
  creationTimestamp: "2022-10-04T05:36:42Z"
  finalizers:
  - cluster.cluster.x-k8s.io
  generation: 2
  name: capi-first
  namespace: default
  resourceVersion: "8666"
  uid: 6bcadc49-13ec-4fff-b0b2-cc64d3515ec0
spec:
  clusterNetwork:
    pods:
      cidrBlocks:
      - 192.168.0.0/16
    serviceDomain: cluster.local
    services:
      cidrBlocks:
      - 10.128.0.0/12
  controlPlaneEndpoint:
    host: 172.18.0.3
    port: 6443
  controlPlaneRef:
    apiVersion: controlplane.cluster.x-k8s.io/v1beta1
    kind: KubeadmControlPlane
    name: capi-first-control-plane
    namespace: default
  infrastructureRef:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
    kind: DockerCluster
    name: capi-first
    namespace: default
status:
  conditions:
  - lastTransitionTime: "2022-10-04T05:36:42Z"
    message: Scaling up control plane to 1 replicas (actual 0)
    reason: ScalingUp
    severity: Warning
    status: "False"
    type: Ready
  - lastTransitionTime: "2022-10-04T05:36:42Z"
    message: Waiting for control plane provider to indicate the control plane has
      been initialized
    reason: WaitingForControlPlaneProviderInitialized
    severity: Info
    status: "False"
    type: ControlPlaneInitialized
  - lastTransitionTime: "2022-10-04T05:36:42Z"
    message: Scaling up control plane to 1 replicas (actual 0)
    reason: ScalingUp
    severity: Warning
    status: "False"
    type: ControlPlaneReady
  - lastTransitionTime: "2022-10-04T05:36:59Z"
    status: "True"
    type: InfrastructureReady
  infrastructureReady: true
  observedGeneration: 2
  phase: Provisioned
```

```
$ k get kubeadmcontrolplanes.controlplane.cluster.x-k8s.io -owide
NAME                       CLUSTER      INITIALIZED   API SERVER AVAILABLE   DESIRED   REPLICAS   READY   UPDATED   UNAVAILABLE   AGE   VERSION
capi-first-control-plane   capi-first                                        1         1                  1         1             36m   v1.22.2

$ k get machinedeployments.cluster.x-k8s.io -owide
NAME              CLUSTER      DESIRED   REPLICAS   READY   UPDATED   UNAVAILABLE   PHASE       AGE   VERSION
capi-first-md-0   capi-first   1         1                  1         1             ScalingUp   35m   v1.22.2

$ k get machinesets.cluster.x-k8s.io -owide
NAME                    CLUSTER      DESIRED   REPLICAS   READY   AVAILABLE   AGE   VERSION
capi-first-md-0-v8fnv   capi-first   1         1                              35m   v1.22.2

$ k get machines.cluster.x-k8s.io -owide
NAME                             CLUSTER      NODENAME   PROVIDERID   PHASE          AGE   VERSION
capi-first-control-plane-jcgts   capi-first                           Provisioning   35m   v1.22.2
capi-first-md-0-v8fnv-d5pxc      capi-first                           Pending        36m   v1.22.2
```

> 获取 Workload 集群的 kubeconfig

```
$ clusterctl get kubeconfig capi-first > ~/.kube/capi-first
```

> 扩容 Worker 节点

```
$ k scale machinedeployments.cluster.x-k8s.io capi-first-md-0 --replicas=2
machinedeployment.cluster.x-k8s.io/capi-first-md-0 scaled

$ k get machinedeployments.cluster.x-k8s.io -owide
NAME              CLUSTER      DESIRED   REPLICAS   READY   UPDATED   UNAVAILABLE   PHASE       AGE   VERSION
capi-first-md-0   capi-first   2         2                  2         2             ScalingUp   46m   v1.22.2

$ k get machinesets.cluster.x-k8s.io -owide
NAME                    CLUSTER      DESIRED   REPLICAS   READY   AVAILABLE   AGE   VERSION
capi-first-md-0-v8fnv   capi-first   2         2                              46m   v1.22.2

$ k get machines.cluster.x-k8s.io -owide
NAME                             CLUSTER      NODENAME   PROVIDERID   PHASE          AGE   VERSION
capi-first-control-plane-jcgts   capi-first                           Provisioning   46m   v1.22.2
capi-first-md-0-v8fnv-d5pxc      capi-first                           Pending        46m   v1.22.2
capi-first-md-0-v8fnv-z4d24      capi-first                           Pending        75s   v1.22.2
```

# Cluster Autoscaler

> `CA` 针对 `Node`，而 `HPA` 和 `VPA` 针对的是 `Pod`

## 工作机制

> `Pending` 必须是由于`资源不足`造成的，才会`扩容`

| Action | Desc                                                         |
| ------ | ------------------------------------------------------------ |
| 扩容   | 由于`资源不足`，Pod 调度失败，即 `Pod` 一直处于 `Pending` 状态 |
| 缩容   | Node 的`资源利用率较低`，持续 10 分钟低于 50 %<br />且此 Node 上`存在的 Pod 都能被重新调度`到其它 Node 上运行 |

## 架构

> `Estimator` 关注`弹出`怎样的 Node，`Simulator` 关注如何将 Pod `调度`到其它 Node

| Module           | Role                                                         |
| ---------------- | ------------------------------------------------------------ |
| `Autoscaler`     | 核心模块，负责整体扩缩容功能                                 |
| `Estimator`      | 负责`评估`计算`扩容节点`（需要扣除 `DaemonSet` 占用的资源）  |
| `Simulator`      | 负责模拟`调度`，计算`缩容节点`                               |
| `Cloud-Provider` | 与云交互进行节点的增删操作，每个支持 CA 的主流厂商都实现自己的 Plugin 实现动态缩放 |

![image-20231004150335712](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231004150335712.png)

## 扩展机制

1. 为了`自动创建和初始化 Node`，Cluster Autoscaler 要求 Node `必须属于`某个 `Node Group`（每个云厂商实现不一）
2. 当集群中有`多个 Node Group`，可以通过 `--expander` 来配置选择 Node Group 的策略

| Expander      | Strategy                                      |
| ------------- | --------------------------------------------- |
| `random`      | 随机选择                                      |
| `most-pods`   | 选择容量最大（可以创建最多 Pod）的 Node Group |
| `least-waste` | 以最少浪费原则选择                            |
| `price`       | 选择最便宜的 Node Group                       |

