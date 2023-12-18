---
title: Kubernetes - Operator
mathjax: false
date: 2023-01-27 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/k8s-operators.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
---

# 应用接入

## 应用容器化

### 开销风险

1. Log Driver
   - Blocking mode
   - Non-Blocking mode
2. 共享 Kernel
   - 共享系统参数配置
   - 进程数共享
   - fd 数共享
   - 主机磁盘共享

<!-- more -->

### 资源监控

#### 应用视角

> 容器中看到的资源是`主机资源`

1. top
2. Java Runtime.availableProcessors()
3. cat /proc/cpuinfo
4. cat /proc/meminfo
5. df -k

#### 影响应用

> Java

1. Concurrent GC Thread
2. Heap Size
3. 线程数不可控

#### 判断规则

> 查询 `/proc/1/cgroup` 是否包含 `kubepods` 关键字 

```
$ cat /proc/1/cgroup
12:cpuset:/
11:devices:/init.scope
10:blkio:/init.scope
9:freezer:/
8:net_cls,net_prio:/
7:pids:/init.scope
6:perf_event:/
5:memory:/init.scope
4:rdma:/
3:cpu,cpuacct:/init.scope
2:hugetlb:/
1:name=systemd:/init.scope
0::/init.scope

$ k get po
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-59d675bcb5-c2hv5   1/1     Running   0          41s
nginx-deployment-59d675bcb5-j8mct   1/1     Running   0          42s

$ k exec -it nginx-deployment-59d675bcb5-c2hv5 -- sh -c "cat /proc/1/cgroup"
12:cpuset:/kubepods.slice/kubepods-pod7f282c81_59bd_4373_a196_3a1f7e0a526a.slice/docker-ee82e2aba6a09214a9f0e766b6c0bcb3647cc922ee2e95d552314b117bfe7a5e.scope
11:devices:/kubepods.slice/kubepods-pod7f282c81_59bd_4373_a196_3a1f7e0a526a.slice/docker-ee82e2aba6a09214a9f0e766b6c0bcb3647cc922ee2e95d552314b117bfe7a5e.scope
10:blkio:/kubepods.slice/kubepods-pod7f282c81_59bd_4373_a196_3a1f7e0a526a.slice/docker-ee82e2aba6a09214a9f0e766b6c0bcb3647cc922ee2e95d552314b117bfe7a5e.scope
9:freezer:/kubepods.slice/kubepods-pod7f282c81_59bd_4373_a196_3a1f7e0a526a.slice/docker-ee82e2aba6a09214a9f0e766b6c0bcb3647cc922ee2e95d552314b117bfe7a5e.scope
8:net_cls,net_prio:/kubepods.slice/kubepods-pod7f282c81_59bd_4373_a196_3a1f7e0a526a.slice/docker-ee82e2aba6a09214a9f0e766b6c0bcb3647cc922ee2e95d552314b117bfe7a5e.scope
7:pids:/kubepods.slice/kubepods-pod7f282c81_59bd_4373_a196_3a1f7e0a526a.slice/docker-ee82e2aba6a09214a9f0e766b6c0bcb3647cc922ee2e95d552314b117bfe7a5e.scope
6:perf_event:/kubepods.slice/kubepods-pod7f282c81_59bd_4373_a196_3a1f7e0a526a.slice/docker-ee82e2aba6a09214a9f0e766b6c0bcb3647cc922ee2e95d552314b117bfe7a5e.scope
5:memory:/kubepods.slice/kubepods-pod7f282c81_59bd_4373_a196_3a1f7e0a526a.slice/docker-ee82e2aba6a09214a9f0e766b6c0bcb3647cc922ee2e95d552314b117bfe7a5e.scope
4:rdma:/kubepods.slice/kubepods-pod7f282c81_59bd_4373_a196_3a1f7e0a526a.slice/docker-ee82e2aba6a09214a9f0e766b6c0bcb3647cc922ee2e95d552314b117bfe7a5e.scope
3:cpu,cpuacct:/kubepods.slice/kubepods-pod7f282c81_59bd_4373_a196_3a1f7e0a526a.slice/docker-ee82e2aba6a09214a9f0e766b6c0bcb3647cc922ee2e95d552314b117bfe7a5e.scope
2:hugetlb:/kubepods.slice/kubepods-pod7f282c81_59bd_4373_a196_3a1f7e0a526a.slice/docker-ee82e2aba6a09214a9f0e766b6c0bcb3647cc922ee2e95d552314b117bfe7a5e.scope
1:name=systemd:/kubepods.slice/kubepods-pod7f282c81_59bd_4373_a196_3a1f7e0a526a.slice/docker-ee82e2aba6a09214a9f0e766b6c0bcb3647cc922ee2e95d552314b117bfe7a5e.scope
0::/kubepods.slice/kubepods-pod7f282c81_59bd_4373_a196_3a1f7e0a526a.slice/docker-ee82e2aba6a09214a9f0e766b6c0bcb3647cc922ee2e95d552314b117bfe7a5e.scope
```

#### CPU

> 宿主 - 4C

```
$ cat /proc/cpuinfo | grep processor
processor	: 0
processor	: 1
processor	: 2
processor	: 3
```

> 容器

```
$ k get po nginx-deployment-59d675bcb5-c2hv5 -oyaml
...
    resources:
      limits:
        cpu: 250m
        memory: 1Gi
      requests:
        cpu: 250m
        memory: 1Gi
...
```

> 配额 - 0.25C

```
$ k exec -it nginx-deployment-59d675bcb5-c2hv5 -- sh -c "cat /sys/fs/cgroup/cpu/cpu.cfs_period_us"
100000

$ k exec -it nginx-deployment-59d675bcb5-c2hv5 -- sh -c "cat /sys/fs/cgroup/cpu/cpu.cfs_quota_us"
25000
```

> 用量

```
$ k exec -it nginx-deployment-59d675bcb5-c2hv5 -- sh -c "cat /sys/fs/cgroup/cpuacct/cpuacct.usage_percpu"
13780426 9142250 29424126 10507041

$ k exec -it nginx-deployment-59d675bcb5-c2hv5 -- sh -c "cat /sys/fs/cgroup/cpuacct/cpuacct.usage"
65110467
```

#### Memory

> 宿主 - 12G

```
$ cat /proc/meminfo | grep MemTotal
MemTotal:       12234472 kB
```

> 配额 - 1G

```
$ k exec -it nginx-deployment-59d675bcb5-c2hv5 -- sh -c "cat /sys/fs/cgroup/memory/memory.limit_in_bytes"
1073741824
```

> 用量

```
$ k exec -it nginx-deployment-59d675bcb5-c2hv5 -- sh -c "cat /sys/fs/cgroup/memory/memory.usage_in_bytes"
5840896
```

## PID 泄露

![image-20231217155237873](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231217155237873.png)

1. 通过 `EntryPoint` fork 出来 probe，而 probe 会做网络调用，可能会`超时`
2. 一旦超时，`kubelet` 会强制将 probe 杀死，此时要求 `EntryPoint` 有`清理子进程`的能力
   - EntryPoint 负责`优雅终止`，需要将 `SIGTERM` 信号`传递`到`子进程`
   - EntryPoint 必须负责`清理` fork 出来的所有子进程
3. 建议采用 `HTTPCheck` 作为 Probe，为 `ExecProbe` 设置合理的`超时时间`

> 开源方案：采用 `tini` 作为容器的初始化进程（PID=1），容器中的僵尸进程的父进程会被设置为 1

![image-20231217160638665](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231217160638665.png)

## PodDisruptionBudget

> pdb 在`自主中断`（如节点故障等）时保障应用的`高可用`

| App                    | Goal                     | Solution                                                     |
| ---------------------- | ------------------------ | ------------------------------------------------------------ |
| 无状态应用             | 至少 60% 的副本可用      | 创建 pdb，设置 minAvailable 为 60%，或者 maxUnAvailable 为 40% |
| 单实例<br />有状态应用 | 客户同意后才能终止该实例 | 创建 pdb，设置 maxUnAvailable 为 0%                          |
| 多实例<br />有状态应用 | 最少可用实例为 N         | 创建 pdb，设置 minAvailable 为 N，或者 maxUnAvailable 为 1   |

> 运维移除一个 Node

1. 将 node 设置为不可调度：`k cordon <node>`
2. 将 node 排空：`k drain <node>`

> 业务设置 pdb，保证应用不会被意外中断

```yaml
apiVersion: policy/v1beta1
kind: PodDisruptionBudget
metadata:
  name: zk-pdb
  spec:
    minAvailable: 2
    selector:
      matchLabels:
        app: zookeeper
```

### 示例

```yaml nginx-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 3
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
          image: nginx:stable-alpine3.17
```

```yaml pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: nginx-deployment
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: nginx
```

```
$ k apply -f nginx-deployment.yaml
deployment.apps/nginx-deployment created

$ k get po -l app=nginx
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-7f8c49f5b4-98fr6   1/1     Running   0          3m15s
nginx-deployment-7f8c49f5b4-bp9pq   1/1     Running   0          3m15s
nginx-deployment-7f8c49f5b4-pj5v8   1/1     Running   0          3m15s

$ k apply -f pdb.yaml
poddisruptionbudget.policy/nginx-deployment created

$ k get pdb
NAME               MIN AVAILABLE   MAX UNAVAILABLE   ALLOWED DISRUPTIONS   AGE
nginx-deployment   1               N/A               2                     43s
```

> k get pdb nginx-deployment -oyaml

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"policy/v1","kind":"PodDisruptionBudget","metadata":{"annotations":{},"name":"nginx-deployment","namespace":"default"},"spec":{"minAvailable":1,"selector":{"matchLabels":{"app":"nginx"}}}}
  creationTimestamp: "2022-12-17T09:06:33Z"
  generation: 1
  name: nginx-deployment
  namespace: default
  resourceVersion: "18673"
  uid: 3955cb69-7dea-4d39-84b0-40a7bf38c868
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: nginx
status:
  conditions:
  - lastTransitionTime: "2022-12-17T09:06:33Z"
    message: ""
    observedGeneration: 1
    reason: SufficientPods
    status: "True"
    type: DisruptionAllowed
  currentHealthy: 3
  desiredHealthy: 1
  disruptionsAllowed: 2
  expectedPods: 3
  observedGeneration: 1
```

> 副本缩小为 1

```
$ k scale deployment nginx-deployment --replicas=1
deployment.apps/nginx-deployment scaled

$ k get po -l app=nginx
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-7f8c49f5b4-pj5v8   1/1     Running   0          4m38s

$ k get pdb
NAME               MIN AVAILABLE   MAX UNAVAILABLE   ALLOWED DISRUPTIONS   AGE
nginx-deployment   1               N/A               0                     4m32s
```

> 如果此时尝试`驱逐` Pod（没有对应的 kubectl 命令），但因为受限于 pdb 而失败，保证了应用的`可用性`

# 应用管理

## 无状态

1. ReplicaSet
2. Deployment - 描述`部署过程`
   - `版本管理`
     - metadata.annotations.deployment.kubernetes.io/revision = "1"
     - spec.revisionHistoryLimit = 10
   - `滚动升级策略`
     - spec.strategy.type = RollingUpdate
     - spec.strategy.rollingUpdate.maxSurge = 25%
     - spec.strategy.rollingUpdate.maxUnavailable = 25%

## 有状态

### StatefulSet

1. spec.serviceName
   - Pod 新增两个属性，`CodeDNS` 为该 Pod 创建一个 `A 记录`
     - PodName -> `hostname`
     - serviceName -> `subdomain`
2. spec.volumeClaimTemplates
   - 正是因为有状态，rollout restart 时，StatefulSet 需要先关闭（`解除状态占用`）再重启

### Operator

> 创建 `Operator` 的关键是 `CRD` 的设计，`Operator = CRD + Controller`

#### 使用 CRD

> 用户向 Kubernetes API 注册一个带有 `schema` 的资源，并定义相关 `API`

1. `注册`一系列该资源的`实例`
2. 在 Kubernetes 的其它资源对象中`引用`这个新注册资源的对象实例
3. 用户自定义的 `Controller` 需要保证让新资源对象达到`预期状态`

#### 开发 CRD

1. 借助 Kubernetes `RBAC` 和 `Authentication` 机制
   - 来保证 CRD 的 security、access control、authentication 和 multi-tenancy
2. 将 CRD 的数据存储到 Kubernetes `etcd` 集群
3. 借助 Kubernetes 提供的 `Controller` 模式开发框架，实现新的 Controller
   - 并借助 `API Server` 监听 etcd 关于该资源的状态并定义状态变化的处理逻辑
4. 自定义的 Controller 与 Kubernetes 原生组件一样，Operator 直接使用 `Kubernetes API` 进行开发

> Controller 模式

![image-20231217192520532](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231217192520532.png)

# Operator

## 生成 CRD

> kubebuilder

```
$ kubebuilder version
Version: main.version{KubeBuilderVersion:"3.4.0", KubernetesVendor:"1.23.5", GitCommit:"75241ab9ff9457de77e902645792cee41ba29fed", BuildDate:"2022-04-28T17:09:31Z", GoOs:"darwin", GoArch:"arm64"}
```

> 脚手架

```
$ mkdir my-operator
$ cd my-operator/

$ kubebuilder init --domain zhongmingmao.io
Writing kustomize manifests for you to edit...
Writing scaffold for you to edit...
Get controller runtime:
$ go get sigs.k8s.io/controller-runtime@v0.11.2
go: downloading sigs.k8s.io/controller-runtime v0.11.2
go: downloading k8s.io/client-go v0.23.5
go: downloading k8s.io/apimachinery v0.23.5
go: downloading k8s.io/utils v0.0.0-20211116205334-6203023598ed
go: downloading github.com/go-logr/logr v1.2.0
go: downloading github.com/prometheus/client_golang v1.11.0
go: downloading github.com/google/gofuzz v1.1.0
go: downloading k8s.io/component-base v0.23.5
go: downloading sigs.k8s.io/structured-merge-diff/v4 v4.2.1
go: downloading k8s.io/api v0.23.5
go: downloading k8s.io/apiextensions-apiserver v0.23.5
go: downloading github.com/google/go-cmp v0.5.5
go: downloading golang.org/x/term v0.0.0-20210615171337-6886f2dfbf5b
go: downloading golang.org/x/net v0.0.0-20211209124913-491a49abca63
go: downloading github.com/google/uuid v1.1.2
go: downloading github.com/prometheus/common v0.28.0
go: downloading github.com/fsnotify/fsnotify v1.5.1
go: downloading github.com/cespare/xxhash/v2 v2.1.1
go: downloading github.com/prometheus/procfs v0.6.0
go: downloading golang.org/x/sys v0.0.0-20211029165221-6e7872819dc8
go: downloading golang.org/x/oauth2 v0.0.0-20210819190943-2bc19b11175f
go: downloading google.golang.org/protobuf v1.27.1
go: downloading gopkg.in/yaml.v3 v3.0.0-20210107192922-496545a6307b
go: downloading golang.org/x/text v0.3.7
Update dependencies:
$ go mod tidy
go: downloading github.com/stretchr/testify v1.7.0
go: downloading github.com/Azure/go-autorest/autorest v0.11.18
go: downloading github.com/Azure/go-autorest/autorest/adal v0.9.13
go: downloading cloud.google.com/go v0.81.0
go: downloading gopkg.in/check.v1 v1.0.0-20200227125254-8fa46927fb4f
go: downloading github.com/niemeyer/pretty v0.0.0-20200227124842-a10e7caefd8e
go: downloading github.com/Azure/go-autorest v14.2.0+incompatible
go: downloading github.com/Azure/go-autorest/tracing v0.6.0
go: downloading golang.org/x/crypto v0.0.0-20210817164053-32db794688a5
go: downloading github.com/Azure/go-autorest/autorest/mocks v0.4.1
go: downloading github.com/Azure/go-autorest/logger v0.2.1
go: downloading github.com/Azure/go-autorest/autorest/date v0.3.0
go: downloading github.com/form3tech-oss/jwt-go v3.2.3+incompatible
go: downloading github.com/cespare/xxhash v1.1.0
Next: define a resource with:
$ kubebuilder create api

$ cat PROJECT
domain: zhongmingmao.io
layout:
- go.kubebuilder.io/v3
projectName: my-operator
repo: github.com/zhongmingmao/my-operator
version: "3"
```

> 生成 CRD

```
$ kubebuilder create api --group apps --version v1beta1 --kind MyDaemonSet
Create Resource [y/n]
y
Create Controller [y/n]
y
Writing kustomize manifests for you to edit...
Writing scaffold for you to edit...
api/v1beta1/mydaemonset_types.go
controllers/mydaemonset_controller.go
Update dependencies:
$ go mod tidy
Running make:
$ make generate
mkdir -p /Users/zhongmingmao/workspace/go/src/github.com/zhongmingmao/my-operator/bin
GOBIN=/Users/zhongmingmao/workspace/go/src/github.com/zhongmingmao/my-operator/bin go install sigs.k8s.io/controller-tools/cmd/controller-gen@v0.8.0
go: downloading sigs.k8s.io/controller-tools v0.8.0
go: downloading github.com/spf13/cobra v1.2.1
go: downloading github.com/fatih/color v1.12.0
go: downloading golang.org/x/tools v0.1.6-0.20210820212750-d4cc65f0b2ff
go: downloading github.com/gobuffalo/flect v0.2.3
go: downloading github.com/mattn/go-colorable v0.1.8
go: downloading github.com/mattn/go-isatty v0.0.12
go: downloading sigs.k8s.io/structured-merge-diff/v4 v4.1.2
go: downloading github.com/google/go-cmp v0.5.6
go: downloading golang.org/x/net v0.0.0-20210825183410-e898025ed96a
go: downloading golang.org/x/sys v0.0.0-20210831042530-f4d43177bf5e
go: downloading golang.org/x/mod v0.4.2
/Users/zhongmingmao/workspace/go/src/github.com/zhongmingmao/my-operator/bin/controller-gen object:headerFile="hack/boilerplate.go.txt" paths="./..."
Next: implement your new API and generate the manifests (e.g. CRDs,CRs) with:
$ make manifests
```

![image-20231217210153870](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231217210153870.png)

> groupversion_info.go

![image-20231217205510682](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231217205510682.png)

> mydaemonset_types.go

![image-20231217205620304](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231217205620304.png)

> make

```
$ make help

Usage:
  make <target>

General
  help             Display this help.

Development
  manifests        Generate WebhookConfiguration, ClusterRole and CustomResourceDefinition objects.
  generate         Generate code containing DeepCopy, DeepCopyInto, and DeepCopyObject method implementations.
  fmt              Run go fmt against code.
  vet              Run go vet against code.
  test             Run tests.

Build
  build            Build manager binary.
  run              Run a controller from your host.
  docker-build     Build docker image with the manager.
  docker-push      Push docker image with the manager.

Deployment
  install          Install CRDs into the K8s cluster specified in ~/.kube/config.
  uninstall        Uninstall CRDs from the K8s cluster specified in ~/.kube/config. Call with ignore-not-found=true to ignore resource not found errors during deletion.
  deploy           Deploy controller to the K8s cluster specified in ~/.kube/config.
  undeploy         Undeploy controller from the K8s cluster specified in ~/.kube/config. Call with ignore-not-found=true to ignore resource not found errors during deletion.

Build Dependencies
  kustomize        Download kustomize locally if necessary.
  controller-gen   Download controller-gen locally if necessary.
  envtest          Download envtest-setup locally if necessary.
```

## 修改 CRD

> 为 Spec 定义字段 Image

```go
// MyDaemonSetSpec defines the desired state of MyDaemonSet
type MyDaemonSetSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "make" to regenerate code after modifying this file

	// Foo is an example field of MyDaemonSet. Edit mydaemonset_types.go to remove/update
	Image string `json:"image,omitempty"`
}
```

```go
// MyDaemonSetStatus defines the observed state of MyDaemonSet
type MyDaemonSetStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
	AvailableReplicas int `json:"availableReplicas,omitempty"`
}
```

> 重新生成

```
$ make generate
/Users/zhongmingmao/workspace/go/src/github.com/zhongmingmao/my-operator/bin/controller-gen object:headerFile="hack/boilerplate.go.txt" paths="./..."
```

```
$ make manifests
/Users/zhongmingmao/workspace/go/src/github.com/zhongmingmao/my-operator/bin/controller-gen rbac:roleName=manager-role crd webhook paths="./..." output:crd:artifacts:config=config/crd/bases
```

![image-20231217211020667](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231217211020667.png)

```yaml apps.zhongmingmao.io_mydaemonsets.yaml
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.8.0
  creationTimestamp: null
  name: mydaemonsets.apps.zhongmingmao.io
spec:
  group: apps.zhongmingmao.io
  names:
    kind: MyDaemonSet
    listKind: MyDaemonSetList
    plural: mydaemonsets
    singular: mydaemonset
  scope: Namespaced
  versions:
  - name: v1beta1
    schema:
      openAPIV3Schema:
        description: MyDaemonSet is the Schema for the mydaemonsets API
        properties:
          apiVersion:
            description: 'APIVersion defines the versioned schema of this representation
              of an object. Servers should convert recognized schemas to the latest
              internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources'
            type: string
          kind:
            description: 'Kind is a string value representing the REST resource this
              object represents. Servers may infer this from the endpoint the client
              submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds'
            type: string
          metadata:
            type: object
          spec:
            description: MyDaemonSetSpec defines the desired state of MyDaemonSet
            properties:
              image:
                description: Foo is an example field of MyDaemonSet. Edit mydaemonset_types.go
                  to remove/update
                type: string
            type: object
          status:
            description: MyDaemonSetStatus defines the observed state of MyDaemonSet
            properties:
              availableReplicas:
                description: 'INSERT ADDITIONAL STATUS FIELD - define observed state
                  of cluster Important: Run "make" to regenerate code after modifying
                  this file'
                type: integer
            type: object
        type: object
    served: true
    storage: true
    subresources:
      status: {}
status:
  acceptedNames:
    kind: ""
    plural: ""
  conditions: []
  storedVersions: []
```

## 编写 Controller

### 编码

![image-20231217211522013](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231217211522013.png)

> SetupWithManager - 监听 MyDaemonSet 对象

![image-20231217211902290](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231217211902290.png)

> Reconcile - Worker 处理实际逻辑

```go
func (r *MyDaemonSetReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	_ = log.FromContext(ctx)

	// TODO(user): your logic here

	ds := appsv1beta1.MyDaemonSet{}
	if err := r.Get(ctx, req.NamespacedName, &ds); err != nil {
		return ctrl.Result{}, err
	}
	if ds.Spec.Image == "" {
		return ctrl.Result{}, nil
	}

	var nodes = v1.NodeList{}
	if err := r.Client.List(ctx, &nodes); err != nil {
		return ctrl.Result{}, err
	}

	for _, node := range nodes.Items {
		pod := v1.Pod{
			TypeMeta: metav1.TypeMeta{
				APIVersion: "v1",
				Kind:       "Pod",
			},
			ObjectMeta: metav1.ObjectMeta{
				Namespace:    ds.Namespace,
				GenerateName: fmt.Sprintf("%s-", node.Name),
			},
			Spec: v1.PodSpec{
				Containers: []v1.Container{
					{
						Name:  "app",
						Image: ds.Spec.Image,
					},
				},
				NodeName: node.Name,
			},
		}

		if err := r.Client.Create(ctx, &pod); err != nil {
			return ctrl.Result{}, err
		}
	}

	return ctrl.Result{}, nil
}
```

### 构建

```
$ make build
/Users/zhongmingmao/workspace/go/src/github.com/zhongmingmao/my-operator/bin/controller-gen object:headerFile="hack/boilerplate.go.txt" paths="./..."
go fmt ./...
go vet ./...
go build -o bin/manager main.go
```

## 安装 CRD

```
$ make install
GOBIN=/Users/zhongmingmao/workspace/go/src/github.com/zhongmingmao/my-operator/bin go install sigs.k8s.io/controller-tools/cmd/controller-gen@v0.8.0
/Users/zhongmingmao/workspace/go/src/github.com/zhongmingmao/my-operator/bin/controller-gen rbac:roleName=manager-role crd webhook paths="./..." output:crd:artifacts:config=config/crd/bases
curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash -s -- 3.8.7 /Users/zhongmingmao/workspace/go/src/github.com/zhongmingmao/my-operator/bin
Version v3.8.7 does not exist for darwin/arm64, trying darwin/amd64 instead.
{Version:kustomize/v3.8.7 GitCommit:ad092cc7a91c07fdf63a2e4b7f13fa588a39af4f BuildDate:2020-11-11T23:19:38Z GoOs:darwin GoArch:amd64}
kustomize installed to /Users/zhongmingmao/workspace/go/src/github.com/zhongmingmao/my-operator/bin/kustomize
/Users/zhongmingmao/workspace/go/src/github.com/zhongmingmao/my-operator/bin/kustomize build config/crd | kubectl apply -f -
customresourcedefinition.apiextensions.k8s.io/mydaemonsets.apps.zhongmingmao.io created

$ k api-resources| grep my
mydaemonsets                                                                      apps.zhongmingmao.io/v1beta1           true         MyDaemonSet

$ k get crd -owide | grep my
mydaemonsets.apps.zhongmingmao.io                     2022-12-17T13:46:34Z

$ k get mydaemonsets -A
No resources found
```

## 运行 Controller

```
$ make run
GOBIN=/Users/zhongmingmao/workspace/go/src/github.com/zhongmingmao/my-operator/bin go install sigs.k8s.io/controller-tools/cmd/controller-gen@v0.8.0
/Users/zhongmingmao/workspace/go/src/github.com/zhongmingmao/my-operator/bin/controller-gen rbac:roleName=manager-role crd webhook paths="./..." output:crd:artifacts:config=config/crd/bases
/Users/zhongmingmao/workspace/go/src/github.com/zhongmingmao/my-operator/bin/controller-gen object:headerFile="hack/boilerplate.go.txt" paths="./..."
go fmt ./...
go vet ./...
go run ./main.go
1.7028209916749592e+09	INFO	controller-runtime.metrics	Metrics server is starting to listen	{"addr": ":8080"}
1.702820991675578e+09	INFO	setup	starting manager
1.70282099167606e+09	INFO	Starting server	{"kind": "health probe", "addr": "[::]:8081"}
1.70282099167611e+09	INFO	Starting server	{"path": "/metrics", "kind": "metrics", "addr": "[::]:8080"}
1.7028209916764538e+09	INFO	controller.mydaemonset	Starting EventSource	{"reconciler group": "apps.zhongmingmao.io", "reconciler kind": "MyDaemonSet", "source": "kind source: *v1beta1.MyDaemonSet"}
1.702820991676507e+09	INFO	controller.mydaemonset	Starting Controller	{"reconciler group": "apps.zhongmingmao.io", "reconciler kind": "MyDaemonSet"}
1.7028209917778409e+09	INFO	controller.mydaemonset	Starting workers	{"reconciler group": "apps.zhongmingmao.io", "reconciler kind": "MyDaemonSet", "worker count": 1}
```

## 测试

```
$ tree config/samples
config/samples
└── apps_v1beta1_mydaemonset.yaml
```

```yaml apps_v1beta1_mydaemonset.yaml
apiVersion: apps.zhongmingmao.io/v1beta1
kind: MyDaemonSet
metadata:
  name: mydaemonset-sample
spec:
  image: nginx:stable-alpine3.17
```

```
$ k apply -f config/samples/apps_v1beta1_mydaemonset.yaml
mydaemonset.apps.zhongmingmao.io/mydaemonset-sample created

$ k get mydaemonsets -A
NAMESPACE   NAME                 AGE
default     mydaemonset-sample   22s

$ k get po -owide
NAME           READY   STATUS    RESTARTS   AGE     IP                NODE     NOMINATED NODE   READINESS GATES
zhongmingmao-b8kzg   1/1     Running   0          2m12s   192.168.216.211   zhongmingmao   <none>           <none>
```

> k get po zhongmingmao-b8kzg -oyaml

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    cni.projectcalico.org/containerID: 40860da765849549606348d9ba20a2bd963515c3522b1244d40f71b2f31b4bfa
    cni.projectcalico.org/podIP: 192.168.216.211/32
    cni.projectcalico.org/podIPs: 192.168.216.211/32
  creationTimestamp: "2022-12-17T13:53:06Z"
  generateName: zhongmingmao-
  name: zhongmingmao-b8kzg
  namespace: default
  resourceVersion: "47820"
  uid: 256211d1-bc1a-43dd-b961-956d8a1f0fdf
spec:
  containers:
  - image: nginx:stable-alpine3.17
    imagePullPolicy: IfNotPresent
    name: app
    resources: {}
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-2vsk6
      readOnly: true
  dnsPolicy: ClusterFirst
  enableServiceLinks: true
  nodeName: zhongmingmao
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
  - name: kube-api-access-2vsk6
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
    lastTransitionTime: "2022-12-17T13:53:06Z"
    status: "True"
    type: Initialized
  - lastProbeTime: null
    lastTransitionTime: "2022-12-17T13:53:07Z"
    status: "True"
    type: Ready
  - lastProbeTime: null
    lastTransitionTime: "2022-12-17T13:53:07Z"
    status: "True"
    type: ContainersReady
  - lastProbeTime: null
    lastTransitionTime: "2022-12-17T13:53:06Z"
    status: "True"
    type: PodScheduled
  containerStatuses:
  - containerID: docker://e425f12f3f92b19ebd2b2cf12aea2545080bb8e6f5a8ce20f94095219097d3e8
    image: nginx:stable-alpine3.17
    imageID: docker-pullable://nginx@sha256:0571deea2fbe77c6779607b66ee64e270922bb289849f764d9edc15645d132f5
    lastState: {}
    name: app
    ready: true
    restartCount: 0
    started: true
    state:
      running:
        startedAt: "2022-12-17T13:53:07Z"
  hostIP: 192.168.191.167
  phase: Running
  podIP: 192.168.216.211
  podIPs:
  - ip: 192.168.216.211
  qosClass: BestEffort
  startTime: "2022-12-17T13:53:06Z"
```

## 生成 webhook

```
$ kubebuilder create webhook --group apps --version v1beta1 --kind MyDaemonSet --defaulting --programmatic-validation
Writing kustomize manifests for you to edit...
Writing scaffold for you to edit...
api/v1beta1/mydaemonset_webhook.go
Update dependencies:
$ go mod tidy
Running make:
$ make generate
/Users/zhongmingmao/workspace/go/src/github.com/zhongmingmao/my-operator/bin/controller-gen object:headerFile="hack/boilerplate.go.txt" paths="./..."
Next: implement your new Webhook and generate the manifests with:
$ make manifests
```

![image-20231218224955108](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231218224955108.png)

```go
// ValidateCreate implements webhook.Validator so a webhook will be registered for the type
func (r *MyDaemonSet) ValidateCreate() error {
	mydaemonsetlog.Info("validate create", "name", r.Name)

	// TODO(user): fill in your validation logic upon object creation.
	if r.Spec.Image == "" {
		return fmt.Errorf("image is required")
	}

	return nil
}
```

```
$ make manifests
/Users/zhongmingmao/workspace/go/src/github.com/zhongmingmao/my-operator/bin/controller-gen rbac:roleName=manager-role crd webhook paths="./..." output:crd:artifacts:config=config/crd/bases
```

![image-20231218225257085](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231218225257085.png)

```
$ make docker-build
$ make docker-push

$ make deploy
GOBIN=/Users/zhongmingmao/workspace/go/src/github.com/zhongmingmao/my-operator/bin go install sigs.k8s.io/controller-tools/cmd/controller-gen@v0.8.0
/Users/zhongmingmao/workspace/go/src/github.com/zhongmingmao/my-operator/bin/controller-gen rbac:roleName=manager-role crd webhook paths="./..." output:crd:artifacts:config=config/crd/bases
cd config/manager && /Users/zhongmingmao/workspace/go/src/github.com/zhongmingmao/my-operator/bin/kustomize edit set image controller=zhongmingmao/controller:0.0.1
/Users/zhongmingmao/workspace/go/src/github.com/zhongmingmao/my-operator/bin/kustomize build config/default | kubectl apply -f -
namespace/my-operator-system created
customresourcedefinition.apiextensions.k8s.io/mydaemonsets.apps.zhongmingmao.io configured
serviceaccount/my-operator-controller-manager created
role.rbac.authorization.k8s.io/my-operator-leader-election-role created
clusterrole.rbac.authorization.k8s.io/my-operator-manager-role created
clusterrole.rbac.authorization.k8s.io/my-operator-metrics-reader created
clusterrole.rbac.authorization.k8s.io/my-operator-proxy-role created
rolebinding.rbac.authorization.k8s.io/my-operator-leader-election-rolebinding created
clusterrolebinding.rbac.authorization.k8s.io/my-operator-manager-rolebinding created
clusterrolebinding.rbac.authorization.k8s.io/my-operator-proxy-rolebinding created
configmap/my-operator-manager-config created
service/my-operator-controller-manager-metrics-service created
service/my-operator-webhook-service created
deployment.apps/my-operator-controller-manager created
mutatingwebhookconfiguration.admissionregistration.k8s.io/my-operator-mutating-webhook-configuration created
validatingwebhookconfiguration.admissionregistration.k8s.io/my-operator-validating-webhook-configuration created
```

```
$ k get all -n my-operator-system
NAME                                                 READY   STATUS              RESTARTS   AGE
pod/my-operator-controller-manager-57f4b55f6-nh9bq   0/2     ContainerCreating   0          4m20s

NAME                                                     TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
service/my-operator-controller-manager-metrics-service   ClusterIP   10.109.32.208   <none>        8443/TCP   4m20s
service/my-operator-webhook-service                      ClusterIP   10.99.60.181    <none>        443/TCP    4m20s

NAME                                             READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/my-operator-controller-manager   0/1     1            0           4m20s

NAME                                                       DESIRED   CURRENT   READY   AGE
replicaset.apps/my-operator-controller-manager-57f4b55f6   1         1         0       4m20s
```

> k get po -n my-operator-system my-operator-controller-manager-57f4b55f6-nh9bq -oyaml

```yaml
...
    volumeMounts:
    - mountPath: /tmp/k8s-webhook-server/serving-certs
      name: cert
      readOnly: true
...
  volumes:
  - name: cert
    secret:
      defaultMode: 420
      secretName: webhook-server-cert
...
```

```
$ k get validatingwebhookconfigurations.admissionregistration.k8s.io
NAME                                           WEBHOOKS   AGE
my-operator-validating-webhook-configuration   1          9m36s
```

> k get validatingwebhookconfigurations.admissionregistration.k8s.io my-operator-validating-webhook-configuration -oyaml

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  annotations:
    cert-manager.io/inject-ca-from: my-operator-system/my-operator-serving-cert
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"admissionregistration.k8s.io/v1","kind":"ValidatingWebhookConfiguration","metadata":{"annotations":{"cert-manager.io/inject-ca-from":"my-operator-system/my-operator-serving-cert"},"name":"my-operator-validating-webhook-configuration"},"webhooks":[{"admissionReviewVersions":["v1"],"clientConfig":{"service":{"name":"my-operator-webhook-service","namespace":"my-operator-system","path":"/validate-apps-zhongmingmao-io-v1beta1-mydaemonset"}},"failurePolicy":"Fail","name":"vmydaemonset.kb.io","rules":[{"apiGroups":["apps.zhongmingmao.io"],"apiVersions":["v1beta1"],"operations":["CREATE","UPDATE"],"resources":["mydaemonsets"]}],"sideEffects":"None"}]}
  creationTimestamp: "2023-12-18T15:37:36Z"
  generation: 1
  name: my-operator-validating-webhook-configuration
  resourceVersion: "61873"
  uid: 22c5221f-9fe1-42df-871b-df1463d4fb26
webhooks:
- admissionReviewVersions:
  - v1
  clientConfig:
    service:
      name: my-operator-webhook-service
      namespace: my-operator-system
      path: /validate-apps-zhongmingmao-io-v1beta1-mydaemonset
      port: 443
  failurePolicy: Fail
  matchPolicy: Equivalent
  name: vmydaemonset.kb.io
  namespaceSelector: {}
  objectSelector: {}
  rules:
  - apiGroups:
    - apps.zhongmingmao.io
    apiVersions:
    - v1beta1
    operations:
    - CREATE
    - UPDATE
    resources:
    - mydaemonsets
    scope: '*'
  sideEffects: None
  timeoutSeconds: 10
```

