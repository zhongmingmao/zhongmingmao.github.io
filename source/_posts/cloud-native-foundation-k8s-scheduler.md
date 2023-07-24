---
title: Kubernetes - Scheduler
mathjax: false
date: 2022-12-04 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/rebalancing-8_qgh6ro.webp
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
---

# 概述

> `kube-scheduler` 负责分配调度 `Pod` 到集群内的 `Node` 上

> 监听 `kube-apiserver`，查询还`未分配 Node` 的 Pod，然后根据`调度策略`为这些 Pod 分配 Node

```
$ k get po -n kube-system coredns-7f6cbbb7b8-njp2w -oyaml
apiVersion: v1
kind: Pod
metadata:
  ...
spec:
  ...
  nodeName: mac-k8s
  ...
```

<!-- more -->

> 阶段

| Stage       | Desc                                |
| ----------- | ----------------------------------- |
| `predicate` | `过滤`不符合条件的 Node             |
| `priority`  | `优先级排序`，选择优先级最高的 Node |

# Predicates

> 过滤

## Strategy

| Strategy                  | Desc                                                |
| ------------------------- | --------------------------------------------------- |
| `PodFitsHostPorts`        | 检查是否有 Host Ports 冲突                          |
| `PodFitsPorts`            | 与 PodFitsHostPorts 一致                            |
| `PodFitsResources`        | 检查 Node 的资源是否充足                            |
| `HostName`                | 检查`候选 Node` 与 `pod.Spec.NodeName` 是否一致     |
| `MatchNodeSelector`       | 检查`候选 Node` 与 `pod.Spec.NodeSelector` 是否匹配 |
| `NoVolumeZoneConflict`    | 检查 Volume Zone 是否冲突                           |
| `MatchInterPodAffinity`   | 检查是否匹配 Pod 的亲和性要求                       |
| `NoDiskConflict`          | 检查是否存在 Volume 冲突                            |
| `PodToleratesNodeTaints`  | 检查 Pod 是否容忍 Node Taints                       |
| `CheckNodeMemoryPressure` | 检查 Pod 是否可以调度到 MemoryPressure 的 Node 上   |
| `CheckNodeDiskPressure`   | 检查 Pod 是否可以调度到 DiskPressure 的 Node 上     |
| `NoVolumeNodeConflict`    | 检查 Node 是否满足 Pod 所引用的 Volume 的条件       |

## Plugin

> 逐层过滤

![image-20230723151404704](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230723151404704.png)

# Priorities

> 每个 Plugin 都会`打分`，并且每个 Plugin 都有一个`权重`，最终的分数为所有启用的 Plugin 的`加权总分`

## Strategy

> 采用默认值即可，基本无需调整

| Strategy                     | Desc                                                         | Default |
| ---------------------------- | ------------------------------------------------------------ | ------- |
| `SelectorSpreadPriority`     | 优先`减少` Node 上属于`同一个` Service 或者 Replication Controller 的 Pod 的数量 |         |
| `InterPodAffinityPriority`   | 优先将 Pod 调度到`相同的拓扑`上（如同一个 `Node`、`Rack`、`Zone` 等） |         |
| `LeastRequestedPriority`     | 优先调度到`请求资源少`的 Node 上 - 适用于 `批次作业`，负载不平均 |         |
| `BalancedResourceAllocation` | 优先平衡各 Node 的资源使用 - 适用于`在线业务`，保证 QoS      |         |
| `NodeAffinityPriority`       | 优先调度到匹配 `NodeAffinity` 的 Node 上                     |         |
| `TaintTolerationPriority`    | 优先调度到匹配 `TaintToleration` 的 Node 上                  |         |
| `ServiceSpreadingPriority`   | 尽量将同一个 Service 的 Pod 分布到不同的 Node 上<br />已被 `SelectorSpreadPriority` 取代 | Disable |
| `EqualPriority`              | 将所有 Node 的优先级设置为 1                                 | Disable |
| `ImageLocalityPriority`      | 尽量将使用大镜像的容器调度到已经有该镜像的 Node 上           | Disable |
| `MostRequestedPriority`      | 尽量调度到`已经使用过`的 Node 上                             | Disable |

# 资源

## CPU + Memory

> CPU - 可压缩资源

1. requests
   - Kubernetes 在调度 Pod 时，会判断当前 Node `正在运行`的 Pod 的 `CPU Request` 的总和
   - 再加上当前调度的 Pod 的 CPU Request，计算其是否超过了 Node 的 CPU 的`可分配资源`
2. limits
   - 通过配置 `Cgroups` 来限制资源上限

> Memory - 不可压缩资源

1. requests
   - 判断 Node 的`剩余内存`是否满足 Pod 的内存请求量，以确定是否可以将 Pod 调度到该 Node
2. limits
   - 通过配置 `Cgroups` 来限制资源上限

> 指定 resources

```yaml nginx-with-resource.yaml
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
          resources:
            limits:
              memory: 1Gi
              cpu: 1
            requests:
              memory: 256Mi
              cpu: 100m
```

```
$ k apply -f nginx-with-resource.yaml
deployment.apps/nginx-deployment created

$ k get po -owide
NAME                               READY   STATUS    RESTARTS   AGE   IP              NODE      NOMINATED NODE   READINESS GATES
nginx-deployment-d7cb576db-hnc4t   1/1     Running   0          20s   192.168.185.8   mac-k8s   <none>           <none>
```

> Pod - `k get po nginx-deployment-d7cb576db-hnc4t -oyaml`

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    cni.projectcalico.org/containerID: 7c388502c8578f0d7ff9318b173c580ec5a36f3bcca6535fdb11cba3bd973370
    cni.projectcalico.org/podIP: 192.168.185.8/32
    cni.projectcalico.org/podIPs: 192.168.185.8/32
  creationTimestamp: "2022-07-23T12:35:48Z"
  generateName: nginx-deployment-d7cb576db-
  labels:
    app: nginx
    pod-template-hash: d7cb576db
  name: nginx-deployment-d7cb576db-hnc4t
  namespace: default
  ownerReferences:
  - apiVersion: apps/v1
    blockOwnerDeletion: true
    controller: true
    kind: ReplicaSet
    name: nginx-deployment-d7cb576db
    uid: 55062032-7303-4c81-9254-cfabd4572dad
  resourceVersion: "4983"
  uid: 0a6fd4ac-29a5-4cad-b894-026f274daa6f
spec:
  containers:
  - image: nginx
    imagePullPolicy: Always
    name: nginx
    resources:
      limits:
        cpu: "1"
        memory: 1Gi
      requests:
        cpu: 100m
        memory: 256Mi
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-7mcf4
      readOnly: true
  dnsPolicy: ClusterFirst
  enableServiceLinks: true
  nodeName: mac-k8s
  preemptionPolicy: PreemptLowerPriority
  priority: 0
  restartPolicy: Always
  schedulerName: default-scheduler
  securityContext: {}
  serviceAccount: default
  serviceAccountName: default
  terminationGracePeriodSeconds: 30
  tolerations:
  - effect: NoExecute
    key: node.kubernetes.io/not-ready
    operator: Exists
    tolerationSeconds: 300
  - effect: NoExecute
    key: node.kubernetes.io/unreachable
    operator: Exists
    tolerationSeconds: 300
  volumes:
  - name: kube-api-access-7mcf4
    projected:
      defaultMode: 420
      sources:
      - serviceAccountToken:
          expirationSeconds: 3607
          path: token
      - configMap:
          items:
          - key: ca.crt
            path: ca.crt
          name: kube-root-ca.crt
      - downwardAPI:
          items:
          - fieldRef:
              apiVersion: v1
              fieldPath: metadata.namespace
            path: namespace
status:
  conditions:
  - lastProbeTime: null
    lastTransitionTime: "2022-07-23T12:35:48Z"
    status: "True"
    type: Initialized
  - lastProbeTime: null
    lastTransitionTime: "2022-07-23T12:35:51Z"
    status: "True"
    type: Ready
  - lastProbeTime: null
    lastTransitionTime: "2022-07-23T12:35:51Z"
    status: "True"
    type: ContainersReady
  - lastProbeTime: null
    lastTransitionTime: "2022-07-23T12:35:48Z"
    status: "True"
    type: PodScheduled
  containerStatuses:
  - containerID: docker://622568a11abaa24bbdc1172c278dc5a0943148ef9adef02071b6cdf50dc041f1
    image: nginx:latest
    imageID: docker-pullable://nginx@sha256:08bc36ad52474e528cc1ea3426b5e3f4bad8a130318e3140d6cfe29c8892c7ef
    lastState: {}
    name: nginx
    ready: true
    restartCount: 0
    started: true
    state:
      running:
        startedAt: "2022-07-23T12:35:51Z"
  hostIP: 192.168.191.153
  phase: Running
  podIP: 192.168.185.8
  podIPs:
  - ip: 192.168.185.8
  qosClass: Burstable
  startTime: "2022-07-23T12:35:48Z"
```

| Qos          | Desc                                            |
| ------------ | ----------------------------------------------- |
| `Guaranteed` | Pod 内`所有容器`都满足 `Request == Limit`       |
| `Burstable`  | Pod 内`至少有 1 个容器`满足 `Request < Limit`   |
| `BestEffort` | Pod 内`所有容器`都`没有设置` Request 或者 Limit |

> Node - `k get nodes mac-k8s -oyaml`

> `allocatable` + `capacity` - `kubelet` 可以预留部分资源

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
  creationTimestamp: "2022-07-23T11:55:38Z"
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
  resourceVersion: "5343"
  uid: a9391c00-948f-4ae1-9c0f-75b6d3a99643
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
    memory: 12132136Ki
    pods: "110"
  capacity:
    cpu: "4"
    ephemeral-storage: 31270768Ki
    hugepages-1Gi: "0"
    hugepages-2Mi: "0"
    hugepages-32Mi: "0"
    hugepages-64Ki: "0"
    memory: 12234536Ki
    pods: "110"
  conditions:
  - lastHeartbeatTime: "2022-07-23T12:04:44Z"
    lastTransitionTime: "2022-07-23T12:04:44Z"
    message: Calico is running on this node
    reason: CalicoIsUp
    status: "False"
    type: NetworkUnavailable
  - lastHeartbeatTime: "2022-07-23T12:39:23Z"
    lastTransitionTime: "2022-07-23T11:55:38Z"
    message: kubelet has sufficient memory available
    reason: KubeletHasSufficientMemory
    status: "False"
    type: MemoryPressure
  - lastHeartbeatTime: "2022-07-23T12:39:23Z"
    lastTransitionTime: "2022-07-23T11:55:38Z"
    message: kubelet has no disk pressure
    reason: KubeletHasNoDiskPressure
    status: "False"
    type: DiskPressure
  - lastHeartbeatTime: "2022-07-23T12:39:23Z"
    lastTransitionTime: "2022-07-23T11:55:38Z"
    message: kubelet has sufficient PID available
    reason: KubeletHasSufficientPID
    status: "False"
    type: PIDPressure
  - lastHeartbeatTime: "2022-07-23T12:39:23Z"
    lastTransitionTime: "2022-07-23T12:02:58Z"
    message: kubelet is posting ready status. AppArmor enabled
    reason: KubeletReady
    status: "True"
    type: Ready
  daemonEndpoints:
    kubeletEndpoint:
      Port: 10250
  images:
  - names:
    - registry.aliyuncs.com/google_containers/etcd@sha256:9ce33ba33d8e738a5b85ed50b5080ac746deceed4a7496c550927a7a19ca3b6d
    - registry.aliyuncs.com/google_containers/etcd:3.5.0-0
    sizeBytes: 363630426
  - names:
    - calico/node@sha256:8e34517775f319917a0be516ed3a373dbfca650d1ee8e72158087c24356f47fb
    - calico/node:v3.26.1
    sizeBytes: 257943189
  - names:
    - calico/cni@sha256:3be3c67ddba17004c292eafec98cc49368ac273b40b27c8a6621be4471d348d6
    - calico/cni:v3.26.1
    sizeBytes: 199481277
  - names:
    - nginx@sha256:08bc36ad52474e528cc1ea3426b5e3f4bad8a130318e3140d6cfe29c8892c7ef
    - nginx:latest
    sizeBytes: 192299033
  - names:
    - registry.aliyuncs.com/google_containers/kube-apiserver@sha256:eb4fae890583e8d4449c1e18b097aec5574c25c8f0323369a2df871ffa146f41
    - registry.aliyuncs.com/google_containers/kube-apiserver:v1.22.2
    sizeBytes: 119456157
  - names:
    - registry.aliyuncs.com/google_containers/kube-controller-manager@sha256:91ccb477199cdb4c63fb0c8fcc39517a186505daf4ed52229904e6f9d09fd6f9
    - registry.aliyuncs.com/google_containers/kube-controller-manager:v1.22.2
    sizeBytes: 113492654
  - names:
    - registry.aliyuncs.com/google_containers/kube-proxy@sha256:561d6cb95c32333db13ea847396167e903d97cf6e08dd937906c3dd0108580b7
    - registry.aliyuncs.com/google_containers/kube-proxy:v1.22.2
    sizeBytes: 97439916
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
    - registry.aliyuncs.com/google_containers/kube-scheduler@sha256:c76cb73debd5e37fe7ad42cea9a67e0bfdd51dd56be7b90bdc50dd1bc03c018b
    - registry.aliyuncs.com/google_containers/kube-scheduler:v1.22.2
    sizeBytes: 49332910
  - names:
    - registry.aliyuncs.com/google_containers/coredns@sha256:6e5a02c21641597998b4be7cb5eb1e7b02c0d8d23cce4dd09f4682d463798890
    - registry.aliyuncs.com/google_containers/coredns:v1.8.4
    sizeBytes: 44383971
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
    - registry.aliyuncs.com/google_containers/pause@sha256:1ff6c18fbef2045af6b9c16bf034cc421a29027b800e4f9b68ae9b1cb3e9ae07
    - registry.aliyuncs.com/google_containers/pause:3.5
    sizeBytes: 483864
  nodeInfo:
    architecture: arm64
    bootID: b91fc490-c825-4dc8-857a-f843682a386a
    containerRuntimeVersion: docker://20.10.24
    kernelVersion: 5.4.0-153-generic
    kubeProxyVersion: v1.22.2
    kubeletVersion: v1.22.2
    machineID: ffb89787d1fe4d8dbac0652d35f3d1cc
    operatingSystem: linux
    osImage: Ubuntu 20.04.5 LTS
    systemUUID: 598a4d56-54c5-9aff-c38f-732f7662da29
```

> Cgroups

> CPU `Request`
> cpu.`shares` - `1024 / 10` - 当作业`竞争` CPU 时，按照 `shares` 的`比例`来分配 CPU 时间片，是一个`相对值`

> CPU `Limit`
> cpu.`cfs_period_us` + cpu.`cfs_quota_us` - `绝对值`

> `shares` 按一个相对值去竞争 CPU 时间片，`quota / period ` 做实际限制

```
$ docker ps | grep 'nginx-deployment-d7cb576db-hnc4t'
622568a11aba   nginx                                               "/docker-entrypoint.…"   7 minutes ago    Up 7 minutes              k8s_nginx_nginx-deployment-d7cb576db-hnc4t_default_0a6fd4ac-29a5-4cad-b894-026f274daa6f_0
7c388502c857   registry.aliyuncs.com/google_containers/pause:3.5   "/pause"                 7 minutes ago    Up 7 minutes              k8s_POD_nginx-deployment-d7cb576db-hnc4t_default_0a6fd4ac-29a5-4cad-b894-026f274daa6f_0

$ docker inspect --format='{{.HostConfig.CgroupParent}}' 622568a11aba
kubepods-burstable-pod0a6fd4ac_29a5_4cad_b894_026f274daa6f.slice

$ cd /sys/fs/cgroup/cpu/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod0a6fd4ac_29a5_4cad_b894_026f274daa6f.slice

$ ls
cgroup.clone_children  cpuacct.stat   cpuacct.usage_all     cpuacct.usage_percpu_sys   cpuacct.usage_sys   cpu.cfs_period_us  cpu.shares  cpu.uclamp.max  docker-622568a11abaa24bbdc1172c278dc5a0943148ef9adef02071b6cdf50dc041f1.scope  notify_on_release
cgroup.procs           cpuacct.usage  cpuacct.usage_percpu  cpuacct.usage_percpu_user  cpuacct.usage_user  cpu.cfs_quota_us   cpu.stat    cpu.uclamp.min  docker-7c388502c8578f0d7ff9318b173c580ec5a36f3bcca6535fdb11cba3bd973370.scope  tasks

$ cat cgroup.procs

$ cat tasks

$ cat cpu.shares
102

$ cat cpu.cfs_period_us
100000

$ cat cpu.cfs_quota_us
100000
```

```
$ docker inspect --format='{{.State.Pid}}' 622568a11aba
78085

$ cd docker-622568a11abaa24bbdc1172c278dc5a0943148ef9adef02071b6cdf50dc041f1.scope/

$ cat cgroup.procs
78085
78126
78127
78128
78129

$ cat tasks
78085
78126
78127
78128
78129

$ cat cpu.shares
102

$ cat cpu.cfs_period_us
100000

$ cat cpu.cfs_quota_us
100000
```

> CPU Request - 5

```
$ k apply -f nginx-with-resource.yaml
deployment.apps/nginx-deployment created

$ k get po
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-6775645c87-kf7kv   0/1     Pending   0          21s

$ k describe po nginx-deployment-6775645c87-kf7kv
Name:           nginx-deployment-6775645c87-kf7kv
Namespace:      default
Priority:       0
Node:           <none>
Labels:         app=nginx
                pod-template-hash=6775645c87
Annotations:    <none>
Status:         Pending
IP:
IPs:            <none>
Controlled By:  ReplicaSet/nginx-deployment-6775645c87
Containers:
  nginx:
    Image:      nginx
    Port:       <none>
    Host Port:  <none>
    Limits:
      cpu:     5
      memory:  1Gi
    Requests:
      cpu:        5
      memory:     256Mi
    Environment:  <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-45cfx (ro)
Conditions:
  Type           Status
  PodScheduled   False
Volumes:
  kube-api-access-45cfx:
    Type:                    Projected (a volume that contains injected data from multiple sources)
    TokenExpirationSeconds:  3607
    ConfigMapName:           kube-root-ca.crt
    ConfigMapOptional:       <nil>
    DownwardAPI:             true
QoS Class:                   Burstable
Node-Selectors:              <none>
Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:
  Type     Reason            Age   From               Message
  ----     ------            ----  ----               -------
  Warning  FailedScheduling  40s   default-scheduler  0/1 nodes are available: 1 Insufficient cpu.
```

> `LimitRange` - 默认的 Request 和 Limit - 不常用（作用于`所有 Container`）

```yaml limit-range.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: mem-limit-range
spec:
  limits:
    - default:
        memory: 512Mi
      defaultRequest:
        memory: 256Mi
      type: Container
```

```yaml nginx-without-resource.yaml
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
```

```
$ k apply -f limit-range.yaml
limitrange/mem-limit-range created

$ k apply -f nginx-without-resource.yaml
deployment.apps/nginx-deployment created

$ k get po
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-6799fc88d8-jjxs6   1/1     Running   0          14s
```

> Pod - `k get po nginx-deployment-6799fc88d8-jjxs6 -oyaml`

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    cni.projectcalico.org/containerID: 9c761f9652c55ddffea91669fc41b49c79c7184fcfc75d5da5d0a1dbd9dee0b1
    cni.projectcalico.org/podIP: 192.168.185.9/32
    cni.projectcalico.org/podIPs: 192.168.185.9/32
    kubernetes.io/limit-ranger: 'LimitRanger plugin set: memory request for container
      nginx; memory limit for container nginx'
  creationTimestamp: "2022-07-23T15:01:12Z"
  generateName: nginx-deployment-6799fc88d8-
  labels:
    app: nginx
    pod-template-hash: 6799fc88d8
  name: nginx-deployment-6799fc88d8-jjxs6
  namespace: default
  ownerReferences:
  - apiVersion: apps/v1
    blockOwnerDeletion: true
    controller: true
    kind: ReplicaSet
    name: nginx-deployment-6799fc88d8
    uid: bf09bf58-8a4c-4c9a-a8b1-0ac236af37ef
  resourceVersion: "17165"
  uid: 80699bcb-3558-40e5-9d66-5860b07207a8
spec:
  containers:
  - image: nginx
    imagePullPolicy: Always
    name: nginx
    resources:
      limits:
        memory: 512Mi
      requests:
        memory: 256Mi
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-ldbvp
      readOnly: true
  dnsPolicy: ClusterFirst
  enableServiceLinks: true
  nodeName: mac-k8s
  preemptionPolicy: PreemptLowerPriority
  priority: 0
  restartPolicy: Always
  schedulerName: default-scheduler
  securityContext: {}
  serviceAccount: default
  serviceAccountName: default
  terminationGracePeriodSeconds: 30
  tolerations:
  - effect: NoExecute
    key: node.kubernetes.io/not-ready
    operator: Exists
    tolerationSeconds: 300
  - effect: NoExecute
    key: node.kubernetes.io/unreachable
    operator: Exists
    tolerationSeconds: 300
  volumes:
  - name: kube-api-access-ldbvp
    projected:
      defaultMode: 420
      sources:
      - serviceAccountToken:
          expirationSeconds: 3607
          path: token
      - configMap:
          items:
          - key: ca.crt
            path: ca.crt
          name: kube-root-ca.crt
      - downwardAPI:
          items:
          - fieldRef:
              apiVersion: v1
              fieldPath: metadata.namespace
            path: namespace
status:
  conditions:
  - lastProbeTime: null
    lastTransitionTime: "2022-07-23T15:01:12Z"
    status: "True"
    type: Initialized
  - lastProbeTime: null
    lastTransitionTime: "2022-07-23T15:01:16Z"
    status: "True"
    type: Ready
  - lastProbeTime: null
    lastTransitionTime: "2022-07-23T15:01:16Z"
    status: "True"
    type: ContainersReady
  - lastProbeTime: null
    lastTransitionTime: "2022-07-23T15:01:12Z"
    status: "True"
    type: PodScheduled
  containerStatuses:
  - containerID: docker://7ba5807833f18bbd7ab82405920b3ad471d082ea31a80ec581618612a4a4673d
    image: nginx:latest
    imageID: docker-pullable://nginx@sha256:08bc36ad52474e528cc1ea3426b5e3f4bad8a130318e3140d6cfe29c8892c7ef
    lastState: {}
    name: nginx
    ready: true
    restartCount: 0
    started: true
    state:
      running:
        startedAt: "2022-07-23T15:01:16Z"
  hostIP: 192.168.191.153
  phase: Running
  podIP: 192.168.185.9
  podIPs:
  - ip: 192.168.185.9
  qosClass: Burstable
  startTime: "2022-07-23T15:01:12Z"
```

## Disk

1. `容器临时存储`（ephemeral storage）包含`日志`和`可写层数据`
   - 可以通过 `limits.ephemeral-storage` 和 `requests.ephemeral-storage` 来申请
2. 在 Pod 完成调度后，Node 对容器临时存储的限制`并非基于 Cgroups`
   - 而是`由 kubelet 定时获取`容器的日志和容器可写层的`磁盘使用情况`，如果超过限制，则会对 Pod 进行驱逐

## Init Container

> Init Container 按`定义的顺序`运行，`所有` Init Container 运行完毕后，才会运行主 Container（`无序`）

1. 当 kube-scheduler 调度带有多个 Init Container 的 Pod 时，只计算 `CPU Request 最多`的 Init Container
   -  `顺序运行` + `完成退出 `
2. kube-scheduler 在计算 Node 上被占用的资源时，`Init Container 的资源会被纳入计算`
   - 因为 Pod 可能会`重建`

```yaml init-container.yaml
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
      initContainers:
        - name: init-myservice
          image: busybox:1.28
          command: ['sh', '-c', 'echo The app is running! && sleep 10']
      containers:
        - name: nginx
          image: nginx
```

```
$ k apply -f limit-range.yaml
limitrange/mem-limit-range created

$ k apply -f init-container.yaml
deployment.apps/nginx-deployment created

$ k get po -owide
NAME                                READY   STATUS     RESTARTS   AGE   IP               NODE      NOMINATED NODE   READINESS GATES
nginx-deployment-69b5555f5d-sztxk   0/1     Init:0/1   0          8s    192.168.185.11   mac-k8s   <none>           <none>
```

> Pod - `k get po nginx-deployment-69b5555f5d-sztxk -oyaml`

> `LimitRange` 将同时作用于 `Init Container` 和 `主 Container`

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    cni.projectcalico.org/containerID: 0052434d535ad25748ef5b1ac3f75901ddc21709d231c9c00ecca7860c87b2f3
    cni.projectcalico.org/podIP: 192.168.185.11/32
    cni.projectcalico.org/podIPs: 192.168.185.11/32
    kubernetes.io/limit-ranger: 'LimitRanger plugin set: memory request for container
      nginx; memory limit for container nginx; memory request for init container init-myservice;
      memory limit for init container init-myservice'
  creationTimestamp: "2022-07-23T15:12:24Z"
  generateName: nginx-deployment-69b5555f5d-
  labels:
    app: nginx
    pod-template-hash: 69b5555f5d
  name: nginx-deployment-69b5555f5d-sztxk
  namespace: default
  ownerReferences:
  - apiVersion: apps/v1
    blockOwnerDeletion: true
    controller: true
    kind: ReplicaSet
    name: nginx-deployment-69b5555f5d
    uid: 8ad90f33-7bad-4a8f-b160-aedc4ee7c867
  resourceVersion: "18392"
  uid: a650dd33-66dc-4673-9ea6-669f7af9e4c0
spec:
  containers:
  - image: nginx
    imagePullPolicy: Always
    name: nginx
    resources:
      limits:
        memory: 512Mi
      requests:
        memory: 256Mi
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-cpzz7
      readOnly: true
  dnsPolicy: ClusterFirst
  enableServiceLinks: true
  initContainers:
  - command:
    - sh
    - -c
    - echo The app is running! && sleep 10
    image: busybox:1.28
    imagePullPolicy: IfNotPresent
    name: init-myservice
    resources:
      limits:
        memory: 512Mi
      requests:
        memory: 256Mi
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-cpzz7
      readOnly: true
  nodeName: mac-k8s
  preemptionPolicy: PreemptLowerPriority
  priority: 0
  restartPolicy: Always
  schedulerName: default-scheduler
  securityContext: {}
  serviceAccount: default
  serviceAccountName: default
  terminationGracePeriodSeconds: 30
  tolerations:
  - effect: NoExecute
    key: node.kubernetes.io/not-ready
    operator: Exists
    tolerationSeconds: 300
  - effect: NoExecute
    key: node.kubernetes.io/unreachable
    operator: Exists
    tolerationSeconds: 300
  volumes:
  - name: kube-api-access-cpzz7
    projected:
      defaultMode: 420
      sources:
      - serviceAccountToken:
          expirationSeconds: 3607
          path: token
      - configMap:
          items:
          - key: ca.crt
            path: ca.crt
          name: kube-root-ca.crt
      - downwardAPI:
          items:
          - fieldRef:
              apiVersion: v1
              fieldPath: metadata.namespace
            path: namespace
status:
  conditions:
  - lastProbeTime: null
    lastTransitionTime: "2022-07-23T15:12:35Z"
    status: "True"
    type: Initialized
  - lastProbeTime: null
    lastTransitionTime: "2022-07-23T15:12:38Z"
    status: "True"
    type: Ready
  - lastProbeTime: null
    lastTransitionTime: "2022-07-23T15:12:38Z"
    status: "True"
    type: ContainersReady
  - lastProbeTime: null
    lastTransitionTime: "2022-07-23T15:12:24Z"
    status: "True"
    type: PodScheduled
  containerStatuses:
  - containerID: docker://2d563297dbe0930853b11e0a0e368966b826fef10baf66b9e358b58819f27510
    image: nginx:latest
    imageID: docker-pullable://nginx@sha256:08bc36ad52474e528cc1ea3426b5e3f4bad8a130318e3140d6cfe29c8892c7ef
    lastState: {}
    name: nginx
    ready: true
    restartCount: 0
    started: true
    state:
      running:
        startedAt: "2022-07-23T15:12:37Z"
  hostIP: 192.168.191.153
  initContainerStatuses:
  - containerID: docker://5bbb30dac46eec8976f9dfb8710b85fd09b1bba57ac147f31698662afe1c7394
    image: busybox:1.28
    imageID: docker-pullable://busybox@sha256:141c253bc4c3fd0a201d32dc1f493bcf3fff003b6df416dea4f41046e0f37d47
    lastState: {}
    name: init-myservice
    ready: true
    restartCount: 0
    state:
      terminated:
        containerID: docker://5bbb30dac46eec8976f9dfb8710b85fd09b1bba57ac147f31698662afe1c7394
        exitCode: 0
        finishedAt: "2022-07-23T15:12:34Z"
        reason: Completed
        startedAt: "2022-07-23T15:12:24Z"
  phase: Running
  podIP: 192.168.185.11
  podIPs:
  - ip: 192.168.185.11
  qosClass: Burstable
  startTime: "2022-07-23T15:12:24Z"
```

# 调度

> NodeName / NodeSelector / NodeAffinity / PodAffinity / Taints + Tolerations

## NodeSelector

```yaml node-selector.yaml
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
      nodeSelector:
        disktype: ssd
```

```
$ k get no --show-labels
NAME      STATUS   ROLES                  AGE    VERSION   LABELS
mac-k8s   Ready    control-plane,master   4h4m   v1.22.2   beta.kubernetes.io/arch=arm64,beta.kubernetes.io/os=linux,kubernetes.io/arch=arm64,kubernetes.io/hostname=mac-k8s,kubernetes.io/os=linux,node-role.kubernetes.io/control-plane=,node-role.kubernetes.io/master=,node.kubernetes.io/exclude-from-external-load-balancers=

$ k get no -l disktype=ssd
No resources found

$ k apply -f node-selector.yaml
deployment.apps/nginx-deployment created

$  k get po
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-58b94cf894-hnc4t   0/1     Pending   0          13s
```

> Pod - `k get po nginx-deployment-58b94cf894-hnc4t -oyaml`

```yaml
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: "2022-07-23T16:01:20Z"
  generateName: nginx-deployment-58b94cf894-
  labels:
    app: nginx
    pod-template-hash: 58b94cf894
  name: nginx-deployment-58b94cf894-hnc4t
  namespace: default
  ownerReferences:
  - apiVersion: apps/v1
    blockOwnerDeletion: true
    controller: true
    kind: ReplicaSet
    name: nginx-deployment-58b94cf894
    uid: 84b49331-711f-48d0-bd4a-a64deb06d702
  resourceVersion: "3502"
  uid: f7ee1caa-ea0c-4dc6-977a-cb3b6ab11089
spec:
  containers:
  - image: nginx
    imagePullPolicy: Always
    name: nginx
    resources: {}
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-7mcf4
      readOnly: true
  dnsPolicy: ClusterFirst
  enableServiceLinks: true
  nodeSelector:
    disktype: ssd
  preemptionPolicy: PreemptLowerPriority
  priority: 0
  restartPolicy: Always
  schedulerName: default-scheduler
  securityContext: {}
  serviceAccount: default
  serviceAccountName: default
  terminationGracePeriodSeconds: 30
  tolerations:
  - effect: NoExecute
    key: node.kubernetes.io/not-ready
    operator: Exists
    tolerationSeconds: 300
  - effect: NoExecute
    key: node.kubernetes.io/unreachable
    operator: Exists
    tolerationSeconds: 300
  volumes:
  - name: kube-api-access-7mcf4
    projected:
      defaultMode: 420
      sources:
      - serviceAccountToken:
          expirationSeconds: 3607
          path: token
      - configMap:
          items:
          - key: ca.crt
            path: ca.crt
          name: kube-root-ca.crt
      - downwardAPI:
          items:
          - fieldRef:
              apiVersion: v1
              fieldPath: metadata.namespace
            path: namespace
status:
  conditions:
  - lastProbeTime: null
    lastTransitionTime: "2022-07-23T16:01:20Z"
    message: '0/1 nodes are available: 1 node(s) didn''t match Pod''s node affinity/selector.'
    reason: Unschedulable
    status: "False"
    type: PodScheduled
  phase: Pending
  qosClass: BestEffort
```

```
$ k label nodes mac-k8s disktype=ssd
node/mac-k8s labeled

$ k get no -l disktype=ssd
NAME      STATUS   ROLES                  AGE    VERSION
mac-k8s   Ready    control-plane,master   4h9m   v1.22.2

$ k get po nginx-deployment-58b94cf894-hnc4t -owide
NAME                                READY   STATUS    RESTARTS   AGE     IP              NODE      NOMINATED NODE   READINESS GATES
nginx-deployment-58b94cf894-hnc4t   1/1     Running   0          3m15s   192.168.185.8   mac-k8s   <none>           <none>

$ k describe po nginx-deployment-58b94cf894-hnc4t
...
Events:
  Type     Reason            Age    From               Message
  ----     ------            ----   ----               -------
  Warning  FailedScheduling  4m52s  default-scheduler  0/1 nodes are available: 1 node(s) didn't match Pod's node affinity/selector.
  Warning  FailedScheduling  3m43s  default-scheduler  0/1 nodes are available: 1 node(s) didn't match Pod's node affinity/selector.
  Normal   Scheduled         113s   default-scheduler  Successfully assigned default/nginx-deployment-58b94cf894-hnc4t to mac-k8s
  Normal   Pulling           113s   kubelet            Pulling image "nginx"
  Normal   Pulled            111s   kubelet            Successfully pulled image "nginx" in 2.132889903s
  Normal   Created           111s   kubelet            Created container nginx
  Normal   Started           111s   kubelet            Started container nginx
```

## NodeAffinity

| Key                                               | Value      | Scheduling Stage   |
| ------------------------------------------------- | ---------- | ------------------ |
| `required`DuringSchedulingIgnoredDuringExecution  | `必须`满足 | `Predicate` - 过滤 |
| `preferred`DuringSchedulingIgnoredDuringExecution | `最好`满足 | `Priority` - 打分  |

> required

```yaml hard-node-affinity.yaml
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
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: disktype
                    operator: In
                    values:
                      - ssd
      containers:
        - name: nginx
          image: nginx
```

```
$ k label nodes mac-k8s disktype-
node/mac-k8s labeled

$ k get no -l disktype=ssd
No resources found

$ k apply -f hard-node-affinity.yaml
deployment.apps/nginx-deployment created

$ k get po
NAME                               READY   STATUS    RESTARTS   AGE
nginx-deployment-db98cdbd6-kf7kv   0/1     Pending   0          20s

$ k describe po nginx-deployment-db98cdbd6-kf7kv
...
Events:
  Type     Reason            Age   From               Message
  ----     ------            ----  ----               -------
  Warning  FailedScheduling  32s   default-scheduler  0/1 nodes are available: 1 node(s) didn't match Pod's node affinity/selector.
  
$ k label nodes mac-k8s disktype=ssd
node/mac-k8s labeled

$ k get no -l disktype=ssd
NAME      STATUS   ROLES                  AGE     VERSION
mac-k8s   Ready    control-plane,master   4h26m   v1.22.2

$ k get po -owide
NAME                               READY   STATUS    RESTARTS   AGE   IP              NODE      NOMINATED NODE   READINESS GATES
nginx-deployment-db98cdbd6-kf7kv   1/1     Running   0          81s   192.168.185.9   mac-k8s   <none>           <none>

$ k describe po nginx-deployment-db98cdbd6-kf7kv
...
Events:
  Type     Reason            Age   From               Message
  ----     ------            ----  ----               -------
  Warning  FailedScheduling  100s  default-scheduler  0/1 nodes are available: 1 node(s) didn't match Pod's node affinity/selector.
  Normal   Scheduled         45s   default-scheduler  Successfully assigned default/nginx-deployment-db98cdbd6-kf7kv to mac-k8s
  Normal   Pulling           44s   kubelet            Pulling image "nginx"
  Normal   Pulled            42s   kubelet            Successfully pulled image "nginx" in 1.771120129s
  Normal   Created           42s   kubelet            Created container nginx
  Normal   Started           42s   kubelet            Started container nginx
```

> preferred

```yaml soft-node-affinity.yaml
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
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 1
            preference:
              matchExpressions:
                - key: disktype
                  operator: In
                  values:
                    - ssd
      containers:
        - name: nginx
          image: nginx
```

```
$ k label nodes mac-k8s disktype-
node/mac-k8s labeled

$ k get no -l disktype=ssd
No resources found

$ k apply -f soft-node-affinity.yaml
deployment.apps/nginx-deployment created

$ k get po -owide
NAME                                READY   STATUS    RESTARTS   AGE   IP               NODE      NOMINATED NODE   READINESS GATES
nginx-deployment-854f4d7b69-jjxs6   1/1     Running   0          12s   192.168.185.10   mac-k8s   <none>           <none>

$ k describe po nginx-deployment-854f4d7b69-jjxs
...
Events:
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  30s   default-scheduler  Successfully assigned default/nginx-deployment-854f4d7b69-jjxs6 to mac-k8s
  Normal  Pulling    30s   kubelet            Pulling image "nginx"
  Normal  Pulled     26s   kubelet            Successfully pulled image "nginx" in 3.541140847s
  Normal  Created    26s   kubelet            Created container nginx
  Normal  Started    26s   kubelet            Started container nginx
```

## PodAffinity

> PodAffinity 基于 `Pod Label` 来选择 Node，仅调度到满足条件 Pod 所在的 Node 上

> 在 Node 上有 `a=b` 的 Pod 才能调度过去，而有 `app=anti-nginx` 的 Pod 不能调度过去

> `topologyKey: kubernetes.io/hostname` -- 表示为`同一个 Node`

```yaml a.pod-anti-affinity.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-anti
spec:
  replicas: 2
  selector:
    matchLabels:
      app: anti-nginx
  template:
    metadata:
      labels:
        app: anti-nginx
    spec:
      affinity:
        podAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
                - key: a
                  operator: In
                  values:
                    - b
            topologyKey: kubernetes.io/hostname
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
                - key: app
                  operator: In
                  values:
                    - anti-nginx
            topologyKey: kubernetes.io/hostname
      containers:
        - name: with-pod-affinity
          image: nginx
```

```
$ k get po --show-labels
NAME                                READY   STATUS    RESTARTS   AGE   LABELS
nginx-deployment-854f4d7b69-n54hh   1/1     Running   0          13s   app=nginx,pod-template-hash=854f4d7b69

$ k apply -f a.pod-anti-affinity.yaml
deployment.apps/nginx-anti created

$ k get po -owide
NAME                                READY   STATUS    RESTARTS   AGE   IP               NODE      NOMINATED NODE   READINESS GATES
nginx-anti-5477588d7c-8df2h         0/1     Pending   0          21s   <none>           <none>    <none>           <none>
nginx-anti-5477588d7c-sztxk         0/1     Pending   0          21s   <none>           <none>    <none>           <none>
nginx-deployment-854f4d7b69-n54hh   1/1     Running   0          71s   192.168.185.11   mac-k8s   <none>           <none>

$ k describe po nginx-anti-5477588d7c-sztxk
...
Events:
  Type     Reason            Age   From               Message
  ----     ------            ----  ----               -------
  Warning  FailedScheduling  50s   default-scheduler  0/1 nodes are available: 1 node(s) didn't match pod affinity rules.
  
$ k label pod nginx-deployment-854f4d7b69-n54hh a=b
pod/nginx-deployment-854f4d7b69-n54hh labeled

$ k get po --show-labels -owide
NAME                                READY   STATUS    RESTARTS   AGE     IP               NODE      NOMINATED NODE   READINESS GATES   LABELS
nginx-anti-5477588d7c-8df2h         0/1     Pending   0          2m26s   <none>           <none>    <none>           <none>            app=anti-nginx,pod-template-hash=5477588d7c
nginx-anti-5477588d7c-sztxk         1/1     Running   0          2m26s   192.168.185.12   mac-k8s   <none>           <none>            app=anti-nginx,pod-template-hash=5477588d7c
nginx-deployment-854f4d7b69-n54hh   1/1     Running   0          3m16s   192.168.185.11   mac-k8s   <none>           <none>            a=b,app=nginx,pod-template-hash=854f4d7b69

$ k describe po nginx-anti-5477588d7c-sztxk
...
Events:
  Type     Reason            Age    From               Message
  ----     ------            ----   ----               -------
  Warning  FailedScheduling  3m12s  default-scheduler  0/1 nodes are available: 1 node(s) didn't match pod affinity rules.
  Warning  FailedScheduling  2m6s   default-scheduler  0/1 nodes are available: 1 node(s) didn't match pod affinity rules.
  Normal   Scheduled         78s    default-scheduler  Successfully assigned default/nginx-anti-5477588d7c-sztxk to mac-k8s
  Normal   Pulling           78s    kubelet            Pulling image "nginx"
  Normal   Pulled            76s    kubelet            Successfully pulled image "nginx" in 1.961318061s
  Normal   Created           76s    kubelet            Created container with-pod-affinity
  Normal   Started           76s    kubelet            Started container with-pod-affinity
  
$ k describe po nginx-anti-5477588d7c-8df2h
...
Events:
  Type     Reason            Age    From               Message
  ----     ------            ----   ----               -------
  Warning  FailedScheduling  3m34s  default-scheduler  0/1 nodes are available: 1 node(s) didn't match pod affinity rules.
  Warning  FailedScheduling  2m27s  default-scheduler  0/1 nodes are available: 1 node(s) didn't match pod affinity rules.
  Warning  FailedScheduling  27s    default-scheduler  0/1 nodes are available: 1 node(s) didn't match pod anti-affinity rules.
```

## Taints + Tolerations

> 用来保证 Pod 不被调度到不合适的 Node 上，`Taint` 应用于 `Node`，而 `Toleration` 应用于 `Pod`

> 当 Pod `容忍` Node 的`所有 Taints`，才调度到该 Node 上

| Taint              | Desc                                                         |
| ------------------ | ------------------------------------------------------------ |
| `NoSchedule`       | 新 Pod `不调度`到该 Node 上，`不影响`正在运行的 Pod          |
| `PreferNoSchedule` | 新 Pod `尽量不调度`到该 Node 上，`不影响`正在运行的 Pod      |
| `NoExecute`        | 新 Pod `不调度`到该 Node 上，并且`驱逐`正在运行的 Pod（Pod 可以`容忍`一段时间） |

```
$ k taint node mac-k8s for-special-user=zhongmingmao:NoSchedule
node/mac-k8s tainted
```

```yaml nginx-without-taint.yaml
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
```

```
$ k apply -f nginx-without-taint.yaml
deployment.apps/nginx-deployment created

$  k get po -owide
NAME                                READY   STATUS    RESTARTS   AGE   IP       NODE     NOMINATED NODE   READINESS GATES
nginx-deployment-6799fc88d8-76mmd   0/1     Pending   0          25s   <none>   <none>   <none>           <none>

$ k describe po nginx-deployment-6799fc88d8-76mmd
...
Events:
  Type     Reason            Age   From               Message
  ----     ------            ----  ----               -------
  Warning  FailedScheduling  40s   default-scheduler  0/1 nodes are available: 1 node(s) had taint {for-special-user: zhongmingmao}, that the pod didn't tolerate.
  
$ k delete -f nginx-without-taint.yaml
deployment.apps "nginx-deployment" deleted
```

```yaml nginx-with-taint.yaml
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
      tolerations:
        - key: "for-special-user"
          operator: "Equal"
          value: "zhongmingmao"
          effect: "NoSchedule"
```

```
$ k apply -f nginx-with-taint.yaml
deployment.apps/nginx-deployment created

$ k get po -owide
NAME                               READY   STATUS    RESTARTS   AGE   IP               NODE      NOMINATED NODE   READINESS GATES
nginx-deployment-6d7dbfd66-fgxbs   1/1     Running   0          11s   192.168.185.16   mac-k8s   <none>           <none>
```

> Pod - `k get po nginx-deployment-6d7dbfd66-fgxbs -oyaml`

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    cni.projectcalico.org/containerID: 73ffe9b820a144e391bd619af03575f4d113a132e45f35df75e20b1a03536bb7
    cni.projectcalico.org/podIP: 192.168.185.16/32
    cni.projectcalico.org/podIPs: 192.168.185.16/32
  creationTimestamp: "2022-07-23T17:14:31Z"
  generateName: nginx-deployment-6d7dbfd66-
  labels:
    app: nginx
    pod-template-hash: 6d7dbfd66
  name: nginx-deployment-6d7dbfd66-fgxbs
  namespace: default
  ownerReferences:
  - apiVersion: apps/v1
    blockOwnerDeletion: true
    controller: true
    kind: ReplicaSet
    name: nginx-deployment-6d7dbfd66
    uid: ad2422f0-dce1-4197-a5b2-3eaa5f7e7deb
  resourceVersion: "11262"
  uid: 931ca30a-681e-408d-ab49-933fb85e603d
spec:
  containers:
  - image: nginx
    imagePullPolicy: Always
    name: nginx
    resources: {}
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-p8wfz
      readOnly: true
  dnsPolicy: ClusterFirst
  enableServiceLinks: true
  nodeName: mac-k8s
  preemptionPolicy: PreemptLowerPriority
  priority: 0
  restartPolicy: Always
  schedulerName: default-scheduler
  securityContext: {}
  serviceAccount: default
  serviceAccountName: default
  terminationGracePeriodSeconds: 30
  tolerations:
  - effect: NoSchedule
    key: for-special-user
    operator: Equal
    value: zhongmingmao
  - effect: NoExecute
    key: node.kubernetes.io/not-ready
    operator: Exists
    tolerationSeconds: 300
  - effect: NoExecute
    key: node.kubernetes.io/unreachable
    operator: Exists
    tolerationSeconds: 300
  volumes:
  - name: kube-api-access-p8wfz
    projected:
      defaultMode: 420
      sources:
      - serviceAccountToken:
          expirationSeconds: 3607
          path: token
      - configMap:
          items:
          - key: ca.crt
            path: ca.crt
          name: kube-root-ca.crt
      - downwardAPI:
          items:
          - fieldRef:
              apiVersion: v1
              fieldPath: metadata.namespace
            path: namespace
status:
  conditions:
  - lastProbeTime: null
    lastTransitionTime: "2022-07-23T17:14:31Z"
    status: "True"
    type: Initialized
  - lastProbeTime: null
    lastTransitionTime: "2022-07-23T17:14:34Z"
    status: "True"
    type: Ready
  - lastProbeTime: null
    lastTransitionTime: "2022-07-23T17:14:34Z"
    status: "True"
    type: ContainersReady
  - lastProbeTime: null
    lastTransitionTime: "2022-07-23T17:14:31Z"
    status: "True"
    type: PodScheduled
  containerStatuses:
  - containerID: docker://ea1ffba4c0b2ed1102c016f1c01b4d179b1fd7e5750c73777af41c6b3e6b2aa4
    image: nginx:latest
    imageID: docker-pullable://nginx@sha256:08bc36ad52474e528cc1ea3426b5e3f4bad8a130318e3140d6cfe29c8892c7ef
    lastState: {}
    name: nginx
    ready: true
    restartCount: 0
    started: true
    state:
      running:
        startedAt: "2022-07-23T17:14:33Z"
  hostIP: 192.168.191.153
  phase: Running
  podIP: 192.168.185.16
  podIPs:
  - ip: 192.168.185.16
  qosClass: BestEffort
  startTime: "2022-07-23T17:14:31Z"
```

```yaml
  tolerations:
  - effect: NoSchedule
    key: for-special-user
    operator: Equal
    value: zhongmingmao
  - effect: NoExecute
    key: node.kubernetes.io/not-ready
    operator: Exists
    tolerationSeconds: 300
  - effect: NoExecute
    key: node.kubernetes.io/unreachable
    operator: Exists
    tolerationSeconds: 300
```

> Pod - `k get po -n kube-system coredns-7f6cbbb7b8-78bwt -oyaml`

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    cni.projectcalico.org/containerID: 95497822214c5d0ce68a1cd1f65df4420bd7e846bd79bd1f5c10e00a73fa002e
    cni.projectcalico.org/podIP: 192.168.185.4/32
    cni.projectcalico.org/podIPs: 192.168.185.4/32
  creationTimestamp: "2022-07-23T11:55:49Z"
  generateName: coredns-7f6cbbb7b8-
  labels:
    k8s-app: kube-dns
    pod-template-hash: 7f6cbbb7b8
  name: coredns-7f6cbbb7b8-78bwt
  namespace: kube-system
  ownerReferences:
  - apiVersion: apps/v1
    blockOwnerDeletion: true
    controller: true
    kind: ReplicaSet
    name: coredns-7f6cbbb7b8
    uid: 5535cd0d-ef81-4753-afdb-92d4623176b6
  resourceVersion: "1633"
  uid: dd1e1d46-5fa4-4121-bc3f-894a8fb6c603
spec:
  containers:
  - args:
    - -conf
    - /etc/coredns/Corefile
    image: registry.aliyuncs.com/google_containers/coredns:v1.8.4
    imagePullPolicy: IfNotPresent
    livenessProbe:
      failureThreshold: 5
      httpGet:
        path: /health
        port: 8080
        scheme: HTTP
      initialDelaySeconds: 60
      periodSeconds: 10
      successThreshold: 1
      timeoutSeconds: 5
    name: coredns
    ports:
    - containerPort: 53
      name: dns
      protocol: UDP
    - containerPort: 53
      name: dns-tcp
      protocol: TCP
    - containerPort: 9153
      name: metrics
      protocol: TCP
    readinessProbe:
      failureThreshold: 3
      httpGet:
        path: /ready
        port: 8181
        scheme: HTTP
      periodSeconds: 10
      successThreshold: 1
      timeoutSeconds: 1
    resources:
      limits:
        memory: 170Mi
      requests:
        cpu: 100m
        memory: 70Mi
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        add:
        - NET_BIND_SERVICE
        drop:
        - all
      readOnlyRootFilesystem: true
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /etc/coredns
      name: config-volume
      readOnly: true
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-2s8zj
      readOnly: true
  dnsPolicy: Default
  enableServiceLinks: true
  nodeName: mac-k8s
  nodeSelector:
    kubernetes.io/os: linux
  preemptionPolicy: PreemptLowerPriority
  priority: 2000000000
  priorityClassName: system-cluster-critical
  restartPolicy: Always
  schedulerName: default-scheduler
  securityContext: {}
  serviceAccount: coredns
  serviceAccountName: coredns
  terminationGracePeriodSeconds: 30
  tolerations:
  - key: CriticalAddonsOnly
    operator: Exists
  - effect: NoSchedule
    key: node-role.kubernetes.io/master
  - effect: NoSchedule
    key: node-role.kubernetes.io/control-plane
  - effect: NoExecute
    key: node.kubernetes.io/not-ready
    operator: Exists
    tolerationSeconds: 300
  - effect: NoExecute
    key: node.kubernetes.io/unreachable
    operator: Exists
    tolerationSeconds: 300
  volumes:
  - configMap:
      defaultMode: 420
      items:
      - key: Corefile
        path: Corefile
      name: coredns
    name: config-volume
  - name: kube-api-access-2s8zj
    projected:
      defaultMode: 420
      sources:
      - serviceAccountToken:
          expirationSeconds: 3607
          path: token
      - configMap:
          items:
          - key: ca.crt
            path: ca.crt
          name: kube-root-ca.crt
      - downwardAPI:
          items:
          - fieldRef:
              apiVersion: v1
              fieldPath: metadata.namespace
            path: namespace
status:
  conditions:
  - lastProbeTime: null
    lastTransitionTime: "2022-07-23T12:02:58Z"
    status: "True"
    type: Initialized
  - lastProbeTime: null
    lastTransitionTime: "2022-07-23T12:04:46Z"
    status: "True"
    type: Ready
  - lastProbeTime: null
    lastTransitionTime: "2022-07-23T12:04:46Z"
    status: "True"
    type: ContainersReady
  - lastProbeTime: null
    lastTransitionTime: "2022-07-23T12:02:58Z"
    status: "True"
    type: PodScheduled
  containerStatuses:
  - containerID: docker://796b62a614c1b139c53e51c8f33c9f6bb6aef733cfb08a3de2929fe0a2fbae1a
    image: registry.aliyuncs.com/google_containers/coredns:v1.8.4
    imageID: docker-pullable://registry.aliyuncs.com/google_containers/coredns@sha256:6e5a02c21641597998b4be7cb5eb1e7b02c0d8d23cce4dd09f4682d463798890
    lastState: {}
    name: coredns
    ready: true
    restartCount: 0
    started: true
    state:
      running:
        startedAt: "2022-07-23T12:04:45Z"
  hostIP: 192.168.191.153
  phase: Running
  podIP: 192.168.185.4
  podIPs:
  - ip: 192.168.185.4
  qosClass: Burstable
  startTime: "2022-07-23T12:02:58Z"
```

```yaml
  tolerations:
  - key: CriticalAddonsOnly
    operator: Exists
  - effect: NoSchedule
    key: node-role.kubernetes.io/master
  - effect: NoSchedule
    key: node-role.kubernetes.io/control-plane
  - effect: NoExecute
    key: node.kubernetes.io/not-ready
    operator: Exists
    tolerationSeconds: 300
  - effect: NoExecute
    key: node.kubernetes.io/unreachable
    operator: Exists
    tolerationSeconds: 300
```

> CoreDNS 的容忍度更高，可以调度到关键节点：Master 和 Control Plane

> 一个 Node 可能 not-ready 或者 unreachable，而 Pod 一般会`默认`打上对应的 Tolerations
> 即一个 Pod 最多容忍一个 Node 处于 not-ready 或者 unreachable 状态 300 秒
> 超过该时间，则会被 `Eviction Controller` 驱逐

> 资源隔离：为 `Node` 打上 `Taints`，然后为 `Pod` 创建对应的 `Tolerations`

# PriorityClass

> kube-scheduler 支持定义 `Pod 的优先级`，保证高优先级的 Pod `优先调度`（可能会`驱逐`低优先级的 Pod）

```
$ k api-resources --api-group='scheduling.k8s.io'
NAME              SHORTNAMES   APIVERSION             NAMESPACED   KIND
priorityclasses   pc           scheduling.k8s.io/v1   false        PriorityClass

$ k get pc
NAME                      VALUE        GLOBAL-DEFAULT   AGE
system-cluster-critical   2000000000   false            5h47m
system-node-critical      2000001000   false            5h47m
```

> PriorityClass - `k get pc system-node-critical -oyaml`

```yaml
apiVersion: scheduling.k8s.io/v1
description: Used for system critical pods that must not be moved from their current
  node.
kind: PriorityClass
metadata:
  creationTimestamp: "2022-07-23T11:55:34Z"
  generation: 1
  name: system-node-critical
  resourceVersion: "68"
  uid: 1b833e06-920f-4882-83a1-686275443e8c
preemptionPolicy: PreemptLowerPriority
value: 2000001000
```

```
$ k explain 'pod.spec.priorityClassName'
KIND:     Pod
VERSION:  v1

FIELD:    priorityClassName <string>

DESCRIPTION:
     If specified, indicates the pod's priority. "system-node-critical" and
     "system-cluster-critical" are two special keywords which indicate the
     highest priorities with the former being the highest priority. Any other
     name must be defined by creating a PriorityClass object with that name. If
     not specified, the pod priority will be default or zero if there is no
     default.
```

# 多调度器

> 默认为 `default-scheduler`

```
$ k run --image nginx nginx
pod/nginx created
```

> Pod - `k get po nginx -oyaml`

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    cni.projectcalico.org/containerID: 9f366348f81fbec8354eb5372683623e6205a4e1b2b6548e957ff4930c75ee6c
    cni.projectcalico.org/podIP: 192.168.185.9/32
    cni.projectcalico.org/podIPs: 192.168.185.9/32
  creationTimestamp: "2022-07-24T12:58:53Z"
  labels:
    run: nginx
  name: nginx
  namespace: default
  resourceVersion: "4395"
  uid: 3e5ef267-b9f2-4813-a322-20cc67097853
spec:
  containers:
  - image: nginx
    imagePullPolicy: Always
    name: nginx
    resources: {}
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-kf7kv
      readOnly: true
  dnsPolicy: ClusterFirst
  enableServiceLinks: true
  nodeName: mac-k8s
  preemptionPolicy: PreemptLowerPriority
  priority: 0
  restartPolicy: Always
  schedulerName: default-scheduler
  securityContext: {}
  serviceAccount: default
  serviceAccountName: default
  terminationGracePeriodSeconds: 30
  tolerations:
  - effect: NoExecute
    key: node.kubernetes.io/not-ready
    operator: Exists
    tolerationSeconds: 300
  - effect: NoExecute
    key: node.kubernetes.io/unreachable
    operator: Exists
    tolerationSeconds: 300
  volumes:
  - name: kube-api-access-kf7kv
    projected:
      defaultMode: 420
      sources:
      - serviceAccountToken:
          expirationSeconds: 3607
          path: token
      - configMap:
          items:
          - key: ca.crt
            path: ca.crt
          name: kube-root-ca.crt
      - downwardAPI:
          items:
          - fieldRef:
              apiVersion: v1
              fieldPath: metadata.namespace
            path: namespace
status:
  conditions:
  - lastProbeTime: null
    lastTransitionTime: "2022-07-24T12:58:53Z"
    status: "True"
    type: Initialized
  - lastProbeTime: null
    lastTransitionTime: "2022-07-24T12:58:56Z"
    status: "True"
    type: Ready
  - lastProbeTime: null
    lastTransitionTime: "2022-07-24T12:58:56Z"
    status: "True"
    type: ContainersReady
  - lastProbeTime: null
    lastTransitionTime: "2022-07-24T12:58:53Z"
    status: "True"
    type: PodScheduled
  containerStatuses:
  - containerID: docker://c2c0220ba3ce9e0d9e6ab65b3e4a93a302dd1cdc8821d37e3e2d473096aa938c
    image: nginx:latest
    imageID: docker-pullable://nginx@sha256:08bc36ad52474e528cc1ea3426b5e3f4bad8a130318e3140d6cfe29c8892c7ef
    lastState: {}
    name: nginx
    ready: true
    restartCount: 0
    started: true
    state:
      running:
        startedAt: "2022-07-24T12:58:55Z"
  hostIP: 192.168.191.153
  phase: Running
  podIP: 192.168.185.9
  podIPs:
  - ip: 192.168.185.9
  qosClass: BestEffort
  startTime: "2022-07-24T12:58:53Z"
```

> Kubernetes 支持`同时运行`多个调度器实例，可以通过 `PodSpec.schedulerName` 来指定调度器

> default-scheduler 主要用于支撑`在线作业`（基于 `Event`，分钟级别），`调度效率相对较弱`，不适合`大数据`等场景

> `100 个 Node`，并发创建 `8000 个 Pod` 的最大调度耗时大概为 `2 分钟`

> 调度器功能比较单一，`稳定性很好`





