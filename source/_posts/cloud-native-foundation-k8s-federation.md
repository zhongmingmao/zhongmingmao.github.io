---
title: Kubernetes - Federation
mathjax: false
date: 2023-02-01 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/federation.jpg
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
  - Service Mesh
  - Istio
---

# 跨地域

> 使用`单一集群`，可以管控多个地域的机器，`底层网络`需要打通

![image-20240113132816218](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20240113132816218.png)

> Service 优先级：zone > region > other

<!-- more -->

# 集群联邦

## 必要性

1. 单一`集群`的`管理规模`有上限
   - `数据库存储`
     - etcd 作为 Kubernetes 集群的后端存储数据库，对`空间大小`（8G）的要求比较苛刻
   - `内存占用`
     - Kubernetes 的 `API Server` 作为 API 网关，会`缓存`该集群的`所有对象`
     - 其它的 `Kubernetes Controller` 也需要对`监听的对象`构建`客户端缓存`
   - `控制器复杂度`
     - Kubernetes 的一个业务流程由多个`对象`和`控制器`联动完成
     - 随着对象数量的增长，控制器的`处理耗时`也会增长
2. 单一`计算节点`的`资源`有上限
   - 可量化资源：CPU、Memory 等
   - 不可量化资源：端口数量（限制 Service NodePort）、进程数量等
3. 故障域控制
   - 集群规模越大，`控制面组件`出现故障时的影响范围越大
   - 方案：将大规模的数据中心切成多个规模相对较小的集群，每个集群控制在一定规模
4. 应用 HA
   - `多数据中心部署`来保障`跨地域高可用`
5. 混合云
   - 私有云 + 公有云

## 职责

1. 跨集群`同步资源`
   - 可以将资源`同步`到多个集群并`协调`资源的分配
   - 如：保证一个应用的 Deployment 被部署到多个集群中，并同时能够满足全局的调度策略
2. 跨集群`服务发现`
   - 汇总各个集群的 `Service` 和 `Ingress`，并暴露到`全局 DNS 服务`中
3. `HA`
   - 动态调整每个集群的应用实例，并`隐藏`具体的集群信息
4. 避免`厂商锁定`
   - 每个集群都是部署在真实的硬件或者云供应商提供的硬件之上
   - 如果需要更换供应商，只需要在新供商提供的硬件上部署新集群，并加入联邦即可

## 集群联邦

> 集群联邦的 etcd 是跨数据中心的，里面存储的是`联邦对象`，对`延迟`没有应用对象（`数据面`）那么敏感

![image-20240113142134034](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20240113142134034.png)

1. 集群联邦是将多个 Kubernetes 集群注册到统一控制平面，为用户提供统一 API 入口的多集群解决方案
2. 核心设计
   - 提供在`全局层面`对`应用`的描述能力
   - 将`联邦对象`实例化为 `Kubernetes 对象`，分发到联邦下辖的各个成员集群中

> 应用高可用部署（不同集群之间网络无需打通）

![image-20240113143501504](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20240113143501504.png)

## 核心架构

![image-20240114123656733](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20240114123656733.png)

1. etcd 作为分布式存储后端存储所有对象
2. API Server 作为 API 网关，接收所有来自于用户以及控制平面组件的请求
3. 不同的控制器对联邦层面的对象进行管理和协调
4. 调度控制器在联邦层面对应用进行调度和分配
5. 集群联邦支持灵活的对象扩展
   - 允许将`基本 Kubernetes 对象`扩展为`集群联邦对象`，并通过统一的联邦控制器推送和收集状态

## 联邦对象

1. `成员集群`是联邦的`基本管理单元`，所有待管理集群都需要`注册`到集群联邦
2. 集群联邦 V2 提供了统一的工具集（`kubefedctl`），基于基本 Kubernetes 对象，创建集群联邦对象

|                      | Kubernetes 集群 | Kubernetes 集群联邦 |
| -------------------- | --------------- | ------------------- |
| 计算资源             | Node            | Cluster             |
| 部署                 | Deployment      | FederatedDeployment |
| 配置                 | Configmap       | FederatedConfigmap  |
| 密钥                 | Secret          | FederatedSecret     |
| 其它 Kubernetes 对象 | Xxx             | FederatedXxx        |

## 注册中心

1. `集群注册中心`提供了所有联邦下辖的集群清单，以及每个集群的`认证信息`、`状态信息`等
2. 集群联邦本身`不提供算力`，只是承担多集群的`协调`工作，所有被管理的集群都应`注册`到集群联邦中
3. 集群联邦使用了单独的 `KubeFedCluster` 对象来管理集群注册信息
   - KubeFedCluster 对象，不仅包含集群的`注册信息`，还包含集群的`认证信息`
   - KubeFedCluster 对象还包含各个集群的`健康状态`、`域名`等
   - 当控制器行为出现异常时，直接通过`集群状态信息`即可获知`控制器异常`的原因

## 集群类型

| Type     | Desc                                                         |
| -------- | ------------------------------------------------------------ |
| `Host`   | 用于提供 KubeFed API 与控制面的集群，即`集群联邦控制面`      |
| `Member` | 通过 KubeFed API `注册`的集群<br />提供相关身份凭证让 KubeFed Controller 能存取集群<br />Host 集群也可以作为 Member 被加入 |

## KubeFedCluster

![image-20240114144228672](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20240114144228672.png)

1. 用来定义哪些 Kubernetes 集群要被联邦
2. 通过 `kubefedctl join/unjoin` 来加入或者删除集群
   - 当成功加入后，会建立一个 KubeFedCluster 组件来存储集群信息（`API Endpoint`、`CA Bundle` 等）
3. KubeFed Controller 将使用被联邦的集群信息来管理不同 Kubernetes 集群上的 API 资源

## 核心对象

| API Group             | Desc                         |
| --------------------- | ---------------------------- |
| core.kubefed.io       | -                            |
| types.kubefed.io      | 被联邦的 Kubernetes API 资源 |
| scheduling.kubefed.io | `副本编排`策略               |

## Type Configuration

1. 定义哪些 Kubernetes API 资源要被用于联邦管理
2. 如果要新增 Federated API，需要执行 `kubefedctl enable <res>`（支持任意对象）
3. 将 ConfigMap 通过联邦机制建立在不同的集群
   1. 先在 Federation `Host` 集群中，通过 CRD 建立新资源 `FederatedConfigMap`
   2. 再建立名为 `configmaps` 的 Type Configuration - `FederatedTypeConfig`
      - 描述 ConfigMap 要被 FederatedConfigMap 所管理
   3. 此时 KubeFed Controller 知道如何建立 Federated 资源

```
$ k get crd federatedconfigmaps.types.kubefed.io
NAME                                   CREATED AT
federatedconfigmaps.types.kubefed.io   2022-01-14T05:47:48Z

$ k get federatedtypeconfigs.core.kubefed.io -n kube-federation-system
NAME                                     AGE
clusterroles.rbac.authorization.k8s.io   88m
configmaps                               88m
deployments.apps                         88m
ingresses.networking.k8s.io              88m
jobs.batch                               88m
namespaces                               88m
replicasets.apps                         88m
secrets                                  88m
serviceaccounts                          88m
services                                 88m
```

> k get federatedtypeconfigs.core.kubefed.io -n kube-federation-system configmaps -oyaml

```yaml
apiVersion: core.kubefed.io/v1beta1
kind: FederatedTypeConfig
metadata:
  annotations:
    meta.helm.sh/release-name: kubefed
    meta.helm.sh/release-namespace: kube-federation-system
  creationTimestamp: "2022-01-14T05:47:53Z"
  finalizers:
  - core.kubefed.io/federated-type-config
  generation: 1
  labels:
    app.kubernetes.io/managed-by: Helm
  name: configmaps
  namespace: kube-federation-system
  resourceVersion: "1384"
  uid: ecb22740-69f5-499b-be1b-21e349232e15
spec:
  federatedType:
    group: types.kubefed.io
    kind: FederatedConfigMap
    pluralName: federatedconfigmaps
    scope: Namespaced
    version: v1beta1
  propagation: Enabled
  targetType:
    kind: ConfigMap
    pluralName: configmaps
    scope: Namespaced
    version: v1
status:
  observedGeneration: 1
  propagationController: Running
  statusController: NotRunning
```

## 联邦对象

![image-20240114152152579](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20240114152152579.png)

| Component   | Desc                                                 |
| ----------- | ---------------------------------------------------- |
| `Template`  | 定义 Kubernetes 对象的模板                           |
| `Placement` | 定义联邦对象需要被同步的目标集群                     |
| `Overrides` | 不同的目标集群中，对 Kubernetes 对象模板的本地化属性 |

## 联邦调度

> KubeFed 提供了一种自动化机制来将工作负载实例分散到不同的集群中

![image-20240114152945903](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20240114152945903.png)

## 实践示例

```
$ git clone https://github.com/kubernetes-retired/kubefed
$ cd kubefed/
$ ./scripts/deploy-kubefed-latest.sh

$ k get po -A
NAMESPACE                NAME                                         READY   STATUS    RESTARTS      AGE
kube-federation-system   kubefed-admission-webhook-5c6bb47f8b-drpcm   1/1     Running   0             2m58s
kube-federation-system   kubefed-controller-manager-8cf4bf4dd-hz7lq   1/1     Running   0             47s
kube-federation-system   kubefed-controller-manager-8cf4bf4dd-jb6z9   1/1     Running   0             40s
kube-system              coredns-78fcd69978-k4m75                     1/1     Running   0             19m
kube-system              etcd-minikube                                1/1     Running   0             19m
kube-system              kube-apiserver-minikube                      1/1     Running   0             19m
kube-system              kube-controller-manager-minikube             1/1     Running   0             19m
kube-system              kube-proxy-248sw                             1/1     Running   0             19m
kube-system              kube-scheduler-minikube                      1/1     Running   0             19m
kube-system              storage-provisioner                          1/1     Running   1 (19m ago)   19m

$ k get kubefedclusters -n kube-federation-system -owide
NAME       AGE     READY   KUBERNETES-VERSION
minikube   3m12s   True    v1.22.2

$ docker ps
CONTAINER ID   IMAGE                                 COMMAND                  CREATED          STATUS          PORTS                                                                                                                                  NAMES
45c54d207b84   gcr.io/k8s-minikube/kicbase:v0.0.32   "/usr/local/bin/entr…"   31 minutes ago   Up 31 minutes   127.0.0.1:32777->22/tcp, 127.0.0.1:32776->2376/tcp, 127.0.0.1:32775->5000/tcp, 127.0.0.1:32774->8443/tcp, 127.0.0.1:32773->32443/tcp   minikube

$ k get all -n kube-federation-system
NAME                                             READY   STATUS    RESTARTS   AGE
pod/kubefed-admission-webhook-5c6bb47f8b-drpcm   1/1     Running   0          17m
pod/kubefed-controller-manager-8cf4bf4dd-hz7lq   1/1     Running   0          15m
pod/kubefed-controller-manager-8cf4bf4dd-jb6z9   1/1     Running   0          15m

NAME                                                 TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
service/kubefed-admission-webhook                    ClusterIP   10.103.9.204    <none>        443/TCP    17m
service/kubefed-controller-manager-metrics-service   ClusterIP   10.99.130.130   <none>        9090/TCP   17m

NAME                                         READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/kubefed-admission-webhook    1/1     1            1           17m
deployment.apps/kubefed-controller-manager   2/2     2            2           17m

NAME                                                    DESIRED   CURRENT   READY   AGE
replicaset.apps/kubefed-admission-webhook-5c6bb47f8b    1         1         1       17m
replicaset.apps/kubefed-controller-manager-7d876c99d8   0         0         0       17m
replicaset.apps/kubefed-controller-manager-8cf4bf4dd    2         2         2       15m

$ k get crd
NAME                                                 CREATED AT
clusterpropagatedversions.core.kubefed.io            2022-01-14T05:47:48Z
federatedclusterroles.types.kubefed.io               2022-01-14T05:47:48Z
federatedconfigmaps.types.kubefed.io                 2022-01-14T05:47:48Z
federateddeployments.types.kubefed.io                2022-01-14T05:47:48Z
federatedingresses.types.kubefed.io                  2022-01-14T05:47:48Z
federatedjobs.types.kubefed.io                       2022-01-14T05:47:48Z
federatednamespaces.types.kubefed.io                 2022-01-14T05:47:48Z
federatedreplicasets.types.kubefed.io                2022-01-14T05:47:48Z
federatedsecrets.types.kubefed.io                    2022-01-14T05:47:48Z
federatedserviceaccounts.types.kubefed.io            2022-01-14T05:47:48Z
federatedservices.types.kubefed.io                   2022-01-14T05:47:48Z
federatedservicestatuses.core.kubefed.io             2022-01-14T05:47:48Z
federatedtypeconfigs.core.kubefed.io                 2022-01-14T05:47:48Z
kubefedclusters.core.kubefed.io                      2022-01-14T05:47:48Z
kubefedconfigs.core.kubefed.io                       2022-01-14T05:47:48Z
propagatedversions.core.kubefed.io                   2022-01-14T05:47:48Z
replicaschedulingpreferences.scheduling.kubefed.io   2022-01-14T05:47:48Z
```

> k get kubefedclusters -n kube-federation-system minikube -oyaml
> apiEndpoint - 集群联邦控制面要连接 Kubernetes 集群的 API Server 地址

```yaml
apiVersion: core.kubefed.io/v1beta1
kind: KubeFedCluster
metadata:
  creationTimestamp: "2022-01-14T05:50:07Z"
  generation: 1
  name: minikube
  namespace: kube-federation-system
  resourceVersion: "1903"
  uid: b0df6700-d1b2-42c2-b49f-8b5694b01125
spec:
  apiEndpoint: https://192.168.49.2:8443
  caBundle: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCakNDQWU2Z0F3SUJBZ0lCQVRBTkJna3Foa2lHOXcwQkFRc0ZBREFWTVJNd0VRWURWUVFERXdwdGFXNXAKYTNWaVpVTkJNQjRYRFRJek1USXlNakEwTURBeE1Gb1hEVE16TVRJeU1EQTBNREF4TUZvd0ZURVRNQkVHQTFVRQpBeE1LYldsdWFXdDFZbVZEUVRDQ0FTSXdEUVlKS29aSWh2Y05BUUVCQlFBRGdnRVBBRENDQVFvQ2dnRUJBTW10CmZtTlg5NnU1eUp4a2dNWnY4Y0RBUlZzMHRXTW1Vc3JOcTAzL2t0K2E1Y0JMcGhrNlM1czVSTDNRS1hPME9XNkQKd0ZZQ05KNWZEUzR5aTluMjA3VmNrdW1RNlNYZnJobUFBakNkY0JIQ2VpMzhjUG5LN3dTbDE4THVycVhwSEt5dgpQSVRiNG8wTjVXZDhrZlF1WlpZaW9yMFNjNjN5TjFBYXpCN1diZEx0cTN5dE9qallHaytRYVdnMkpVYnVTT0FqCmN0MkowTDc5TVptclE1VFNhMHV6eXNrUS9vQU00eGJRWFFMd0JmNGdNVEY0Y0FqQmVLU01xOS8yVFl4aEVsWkEKWHQzUkVMVVNGSVZQQW1TMHRGZmYyaTI3WFdERWRxTXBuTjJTRFlSdzNxcUxpcnhsT0Y3VGsweXJLeHJrRnZEWApuWmROdkMzdnVYbnRSNWZDQ3JVQ0F3RUFBYU5oTUY4d0RnWURWUjBQQVFIL0JBUURBZ0trTUIwR0ExVWRKUVFXCk1CUUdDQ3NHQVFVRkJ3TUNCZ2dyQmdFRkJRY0RBVEFQQmdOVkhSTUJBZjhFQlRBREFRSC9NQjBHQTFVZERnUVcKQkJRTlVIdG90cll1enNJN25JSTZwalhnNGgzMjdEQU5CZ2txaGtpRzl3MEJBUXNGQUFPQ0FRRUFLRnB6WDFlUgp4OTdkNHQrb1poSzhFekZ0SjNMM1Y1YnIrUHQ2dHkwdDdNdkwxZG0yS0pQbHNjY3dhSC9CS1NzMmJHd255TnBzCkFTUmZMZGhmWkN0UHVXay9janVLZDh3N3JGenRHMnM4cGFweGJER1RiY3lJa0hEU01iZ1ROdHpRU0FxNTdydjIKZmJIUVc5RnZhcVZCNm5jb1ZVQ2wrZkMrNUhYeWVSWlg3VklpM1B5T1ppRjU0OHU0QlJQNkZUMnE0NU9nVTdDVApDZ2NpazdVR28xMUJsVExUSElpQ2NtS3ZUdTV2WUZ3TGF1SzJYMHRJV2NSbGlYNHNUL2dVcWkydGhJaVhFM1h1ClpNaEFmZUlUaG5WUSttMUtEOXpTaXQvUld4L01jcWhPSXluc1NxYnpRQko3cFlLQkFycm9zdWJKUVZWcTQvUUMKM3NIaVZ1RUlJUDBPT0E9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
  proxyURL: ""
  secretRef:
    name: minikube-b5hdz
status:
  conditions:
  - lastProbeTime: "2022-01-14T05:55:51Z"
    lastTransitionTime: "2022-01-14T05:50:33Z"
    message: /healthz responded with ok
    reason: ClusterReady
    status: "True"
    type: Ready
  kubernetesVersion: v1.22.2
```

> k get secrets -n kube-federation-system minikube-b5hdz -oyaml

```yaml
apiVersion: v1
data:
  token: ZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNklucG9SRTExVm5SamIyZDRSa3hOVEhock5sbHBOR1ZIZWtoS2JXUkJUMWRXZEVwM2JHNXZZMmRvV2xraWZRLmV5SnBjM01pT2lKcmRXSmxjbTVsZEdWekwzTmxjblpwWTJWaFkyTnZkVzUwSWl3aWEzVmlaWEp1WlhSbGN5NXBieTl6WlhKMmFXTmxZV05qYjNWdWRDOXVZVzFsYzNCaFkyVWlPaUpyZFdKbExXWmxaR1Z5WVhScGIyNHRjM2x6ZEdWdElpd2lhM1ZpWlhKdVpYUmxjeTVwYnk5elpYSjJhV05sWVdOamIzVnVkQzl6WldOeVpYUXVibUZ0WlNJNkltMXBibWxyZFdKbExXMXBibWxyZFdKbElpd2lhM1ZpWlhKdVpYUmxjeTVwYnk5elpYSjJhV05sWVdOamIzVnVkQzl6WlhKMmFXTmxMV0ZqWTI5MWJuUXVibUZ0WlNJNkltMXBibWxyZFdKbExXMXBibWxyZFdKbElpd2lhM1ZpWlhKdVpYUmxjeTVwYnk5elpYSjJhV05sWVdOamIzVnVkQzl6WlhKMmFXTmxMV0ZqWTI5MWJuUXVkV2xrSWpvaU9EaGxOV00xT1dFdFpXSTROUzAwT1dZMUxUa3hNbU10T1RWaU1HVmpOVFV4WWpFeElpd2ljM1ZpSWpvaWMzbHpkR1Z0T25ObGNuWnBZMlZoWTJOdmRXNTBPbXQxWW1VdFptVmtaWEpoZEdsdmJpMXplWE4wWlcwNmJXbHVhV3QxWW1VdGJXbHVhV3QxWW1VaWZRLlZNb3NOanlkYXhqRnlhWUhac3F1WmxjVXlzRE9Pd0Q1a1lXekVxLUl6MmF3aHJ5UGY3NGtOWnc3ZWJuU2dqcVJUVFJfT1lnbEtXQzNjNy1adDR5YkN1ZzNDeEY0M1I1cG1LcEpQTzk4dXVxUGpiNS0zcjUyRGdmQVFsemdjQUU4X1ZxNnBzZi1vWVdoemVmVzg3OW5KMEdDSml5YkdsZFEwanhVVXFxY3hfcmZkeE9PaktwTF9scnRwSTRjYlBHUXNmajJlbTBvNFpWUzJLSklBdTRUOXp5aVhJSXNrSldpRzRBV0FKNXVNOS03a2tnLXZUYnZDeWxxTVh3bkp4d1ZmempDeGlRampZbHk3YkRCMW9lVkJpcGo5WHB3WHpKSHU2em5sV0JRT2o3aWhtQlp2dmx5akF2dHh1bTVKRldDZFhrZ1N0RXZjTHkya3RtZWFKMm1CQQ==
kind: Secret
metadata:
  creationTimestamp: "2022-01-14T05:50:07Z"
  generateName: minikube-
  name: minikube-b5hdz
  namespace: kube-federation-system
  resourceVersion: "1513"
  uid: 60fb2605-df2f-4b1a-8525-45a4fe34c345
type: Opaque
```

> `集群联邦`连接 `Kubernetes API Server` 的 `JWT Token`

```
$ echo ZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNklucG9SRTExVm5SamIyZDRSa3hOVEhock5sbHBOR1ZIZWtoS2JXUkJUMWRXZEVwM2JHNXZZMmRvV2xraWZRLmV5SnBjM01pT2lKcmRXSmxjbTVsZEdWekwzTmxjblpwWTJWaFkyTnZkVzUwSWl3aWEzVmlaWEp1WlhSbGN5NXBieTl6WlhKMmFXTmxZV05qYjNWdWRDOXVZVzFsYzNCaFkyVWlPaUpyZFdKbExXWmxaR1Z5WVhScGIyNHRjM2x6ZEdWdElpd2lhM1ZpWlhKdVpYUmxjeTVwYnk5elpYSjJhV05sWVdOamIzVnVkQzl6WldOeVpYUXVibUZ0WlNJNkltMXBibWxyZFdKbExXMXBibWxyZFdKbElpd2lhM1ZpWlhKdVpYUmxjeTVwYnk5elpYSjJhV05sWVdOamIzVnVkQzl6WlhKMmFXTmxMV0ZqWTI5MWJuUXVibUZ0WlNJNkltMXBibWxyZFdKbExXMXBibWxyZFdKbElpd2lhM1ZpWlhKdVpYUmxjeTVwYnk5elpYSjJhV05sWVdOamIzVnVkQzl6WlhKMmFXTmxMV0ZqWTI5MWJuUXVkV2xrSWpvaU9EaGxOV00xT1dFdFpXSTROUzAwT1dZMUxUa3hNbU10T1RWaU1HVmpOVFV4WWpFeElpd2ljM1ZpSWpvaWMzbHpkR1Z0T25ObGNuWnBZMlZoWTJOdmRXNTBPbXQxWW1VdFptVmtaWEpoZEdsdmJpMXplWE4wWlcwNmJXbHVhV3QxWW1VdGJXbHVhV3QxWW1VaWZRLlZNb3NOanlkYXhqRnlhWUhac3F1WmxjVXlzRE9Pd0Q1a1lXekVxLUl6MmF3aHJ5UGY3NGtOWnc3ZWJuU2dqcVJUVFJfT1lnbEtXQzNjNy1adDR5YkN1ZzNDeEY0M1I1cG1LcEpQTzk4dXVxUGpiNS0zcjUyRGdmQVFsemdjQUU4X1ZxNnBzZi1vWVdoemVmVzg3OW5KMEdDSml5YkdsZFEwanhVVXFxY3hfcmZkeE9PaktwTF9scnRwSTRjYlBHUXNmajJlbTBvNFpWUzJLSklBdTRUOXp5aVhJSXNrSldpRzRBV0FKNXVNOS03a2tnLXZUYnZDeWxxTVh3bkp4d1ZmempDeGlRampZbHk3YkRCMW9lVkJpcGo5WHB3WHpKSHU2em5sV0JRT2o3aWhtQlp2dmx5akF2dHh1bTVKRldDZFhrZ1N0RXZjTHkya3RtZWFKMm1CQQ== | base64 -d
eyJhbGciOiJSUzI1NiIsImtpZCI6InpoRE11VnRjb2d4RkxNTHhrNllpNGVHekhKbWRBT1dWdEp3bG5vY2doWlkifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJrdWJlLWZlZGVyYXRpb24tc3lzdGVtIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZWNyZXQubmFtZSI6Im1pbmlrdWJlLW1pbmlrdWJlIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQubmFtZSI6Im1pbmlrdWJlLW1pbmlrdWJlIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQudWlkIjoiODhlNWM1OWEtZWI4NS00OWY1LTkxMmMtOTViMGVjNTUxYjExIiwic3ViIjoic3lzdGVtOnNlcnZpY2VhY2NvdW50Omt1YmUtZmVkZXJhdGlvbi1zeXN0ZW06bWluaWt1YmUtbWluaWt1YmUifQ.VMosNjydaxjFyaYHZsquZlcUysDOOwD5kYWzEq-Iz2awhryPf74kNZw7ebnSgjqRTTR_OYglKWC3c7-Zt4ybCug3CxF43R5pmKpJPO98uuqPjb5-3r52DgfAQlzgcAE8_Vq6psf-oYWhzefW879nJ0GCJiybGldQ0jxUUqqcx_rfdxOOjKpL_lrtpI4cbPGQsfj2em0o4ZVS2KJIAu4T9zyiXIIskJWiG4AWAJ5uM9-7kkg-vTbvCylqMXwnJxwVfzjCxiQjjYly7bDB1oeVBipj9XpwXzJHu6znlWBQOj7ihmBZvvlyjAvtxum5JFWCdXkgStEvcLy2ktmeaJ2mBA
```

> 将 namespace 设置为联邦对象

```
$ k create ns federate-me
namespace/federate-me created

$ ./bin/kubefedctl federate ns federate-me
I0114 14:07:58.379027   43901 federate.go:473] Resource to federate is a namespace. Given namespace will itself be the container for the federated namespace
I0114 14:07:58.383261   43901 federate.go:502] Successfully created FederatedNamespace "federate-me/federate-me" from Namespace
```

> 创建 FederatedDeployment

```yaml test-deployment.yaml
apiVersion: types.kubefed.io/v1beta1
kind: FederatedDeployment
metadata:
  name: test-deployment
spec:
  template: # Kubernetes 标准 Deployment
    metadata:
      name: mynginx
    spec:
      replicas: 3
      selector:
        matchLabels:
          run: mynginx
      template:
        metadata:
          labels:
            run: mynginx
        spec:
          containers:
          - image: nginx:latest
            imagePullPolicy: IfNotPresent
            name: nginx
  placement: # 目标 Kubernetes 集群
    clusters:
    - name: minikube
```

```
$ k apply -f test-deployment.yaml -n federate-me
federateddeployment.types.kubefed.io/test-deployment created

$ k get federateddeployments -n federate-me
NAME              AGE
test-deployment   2m50s

$ k get deployments -n federate-me
NAME              READY   UP-TO-DATE   AVAILABLE   AGE
test-deployment   3/3     3            3           7m22s

$ k get deployment test-deployment -n federate-me -owide
NAME              READY   UP-TO-DATE   AVAILABLE   AGE   CONTAINERS   IMAGES         SELECTOR
test-deployment   3/3     3            3           38s   nginx        nginx:latest   run=mynginx
```

> k get federateddeployments -n federate-me -oyaml

```yaml
apiVersion: v1
items:
- apiVersion: types.kubefed.io/v1beta1
  kind: FederatedDeployment
  metadata:
    annotations:
      kubectl.kubernetes.io/last-applied-configuration: |
        {"apiVersion":"types.kubefed.io/v1beta1","kind":"FederatedDeployment","metadata":{"annotations":{},"name":"test-deployment","namespace":"federate-me"},"spec":{"placement":{"clusters":[{"name":"minikube"}]},"template":{"metadata":{"name":"mynginx"},"spec":{"replicas":3,"selector":{"matchLabels":{"run":"mynginx"}},"template":{"metadata":{"labels":{"run":"mynginx"}},"spec":{"containers":[{"image":"nginx:latest","imagePullPolicy":"IfNotPresent","name":"nginx"}]}}}}}}
    creationTimestamp: "2022-01-14T06:12:49Z"
    finalizers:
    - kubefed.io/sync-controller
    generation: 1
    name: test-deployment
    namespace: federate-me
    resourceVersion: "2927"
    uid: f9eb8e3e-53ec-4792-b721-afccfad18a45
  spec:
    placement:
      clusters:
      - name: minikube
    template:
      metadata:
        name: mynginx
      spec:
        replicas: 3
        selector:
          matchLabels:
            run: mynginx
        template:
          metadata:
            labels:
              run: mynginx
          spec:
            containers:
            - image: nginx:latest
              imagePullPolicy: IfNotPresent
              name: nginx
  status:
    clusters:
    - name: minikube
    conditions:
    - lastTransitionTime: "2022-01-14T06:12:49Z"
      lastUpdateTime: "2022-01-14T06:12:49Z"
      status: "True"
      type: Propagation
    observedGeneration: 1
kind: List
metadata:
  resourceVersion: ""
  selfLink: ""
```

> 创建 ReplicaSchedulingPreference 对象

```yaml test-deployment-rsp.yaml
apiVersion: scheduling.kubefed.io/v1alpha1
kind: ReplicaSchedulingPreference
metadata:
  name: test-deployment
spec:
  targetKind: FederatedDeployment
  totalReplicas: 3 # 总副本数为 3
  clusters:
    minikube: # 覆盖在特定 Kubernetes 集群的配置
      minReplicas: 1
      maxReplicas: 1
      weight: 1
```

```
$ k apply -f test-deployment-rsp.yaml -n federate-me
replicaschedulingpreference.scheduling.kubefed.io/test-deployment created

$ k get deployments -n federate-me
NAME              READY   UP-TO-DATE   AVAILABLE   AGE
test-deployment   1/1     1            1           11m
```

> k get federateddeployments -n federate-me -oyaml

```yaml
apiVersion: v1
items:
- apiVersion: types.kubefed.io/v1beta1
  kind: FederatedDeployment
  metadata:
    annotations:
      kubectl.kubernetes.io/last-applied-configuration: |
        {"apiVersion":"types.kubefed.io/v1beta1","kind":"FederatedDeployment","metadata":{"annotations":{},"name":"test-deployment","namespace":"federate-me"},"spec":{"placement":{"clusters":[{"name":"minikube"}]},"template":{"metadata":{"name":"mynginx"},"spec":{"replicas":3,"selector":{"matchLabels":{"run":"mynginx"}},"template":{"metadata":{"labels":{"run":"mynginx"}},"spec":{"containers":[{"image":"nginx:latest","imagePullPolicy":"IfNotPresent","name":"nginx"}]}}}}}}
    creationTimestamp: "2022-01-14T06:12:49Z"
    finalizers:
    - kubefed.io/sync-controller
    generation: 2
    name: test-deployment
    namespace: federate-me
    resourceVersion: "3633"
    uid: f9eb8e3e-53ec-4792-b721-afccfad18a45
  spec:
    overrides: # 覆盖配置
    - clusterName: minikube
      clusterOverrides:
      - path: /spec/replicas # 属性配置的路径
        value: 1
    placement:
      clusters:
      - name: minikube
    template:
      metadata:
        name: mynginx
      spec:
        replicas: 3
        selector:
          matchLabels:
            run: mynginx
        template:
          metadata:
            labels:
              run: mynginx
          spec:
            containers:
            - image: nginx:latest
              imagePullPolicy: IfNotPresent
              name: nginx
  status:
    clusters:
    - name: minikube
    conditions:
    - lastTransitionTime: "2022-01-14T06:12:49Z"
      lastUpdateTime: "2022-01-14T06:12:49Z"
      status: "True"
      type: Propagation
    observedGeneration: 2
kind: List
metadata:
  resourceVersion: ""
  selfLink: ""
```

# Clusternet

## 简介

> Clusternet is an open source add-on that helps you manage thousands of millions of Kubernetes clusters as easily as visiting the Internet.

> Clusternet helps setup network `tunnels` in a configurable way and lets you manage/visit them all as if they were running locally.

> Clusternet can also help `deploy and coordinate applications` to multiple clusters from a single set of APIs in a hosting cluster.

![clusternet](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/clusternet.png)

1. Clusternet 支持分发 CRD / HelmChart（核心场景：`应用分发`），集群联邦不支持
2. 集群联邦与集群本身的控制面比较割裂，而 Clusternet 提供一致的纳管能力，没有额外的学习成本

## 核心架构

![clusternet-arch](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/clusternet-arch.png)

1. `轻量化`架构
2. 一站式连接各类集群
3. 支持 `Pull` 和 `Push` 模式（集群联邦仅支持 Push 模式）
4. `跨集群`路由访问（基于 Websocket 连接）
5. 支持子集群 `RBAC` 访问
6. 提供一致的集群访问体验（exec、logs）
7. 支持原生 `Kubernetes API`
8. 低接入成本，`kubectl plugin` / `client-go`

## 访问集群

1. Clusternet 支持通过 Bootstrap Token、Service Token、TLS 证书等 `RBAC` 的方式访问子集群
   - Clusternet `Parent` Cluster 不存储子集群的 credential
2. 可以通过 kubectl 对子集群进行集群资源访问（集群联邦不支持）

## 应用分发

![image-20240114163632408](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20240114163632408.png)

