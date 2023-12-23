---
title: Kubernetes - Scaling
mathjax: false
date: 2023-01-29 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231223144041516.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
---

# Aggregated APIServer

![image-20231222224857367](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231222224857367.png)

<!-- more -->

```
$ k get apiservices.apiregistration.k8s.io
NAME                                   SERVICE                      AVAILABLE   AGE
v1.                                    Local                        True        36d
v1.admissionregistration.k8s.io        Local                        True        36d
v1.apiextensions.k8s.io                Local                        True        36d
v1.apps                                Local                        True        36d
v1.authentication.k8s.io               Local                        True        36d
v1.authorization.k8s.io                Local                        True        36d
v1.autoscaling                         Local                        True        36d
v1.batch                               Local                        True        36d
v1.certificates.k8s.io                 Local                        True        36d
v1.coordination.k8s.io                 Local                        True        36d
v1.discovery.k8s.io                    Local                        True        36d
v1.events.k8s.io                       Local                        True        36d
v1.networking.k8s.io                   Local                        True        36d
v1.node.k8s.io                         Local                        True        36d
v1.policy                              Local                        True        36d
v1.rbac.authorization.k8s.io           Local                        True        36d
v1.scheduling.k8s.io                   Local                        True        36d
v1.storage.k8s.io                      Local                        True        36d
v1beta1.metrics.k8s.io                 kube-system/metrics-server   True        36d
v1beta2.flowcontrol.apiserver.k8s.io   Local                        True        36d
v1beta3.flowcontrol.apiserver.k8s.io   Local                        True        36d
v2.autoscaling                         Local                        True        36d
```

# Metrics-Server

> Metrics-Server 遵循 API Server 的标准，并以 `Aggregated APIServer` 的形式工作

1. `Metrics-Server` 是 Kubernetes `监控体系`中的`核心组件`之一
   - 负责从 `kubelet` 收集资源指标，然后对这些指标监控数据进行`聚合`（kube-aggregator）
   - 并在 `API Server` 中通过 `Metrics API`（/apis/metrics.k8s.io/） 暴露
2. Metrics-Server 只存储`最新`的指标数据（`CPU` / `Memory`） 
3. 几点注意
   - API Server 能访问 Metrics-Server
   - 需要在 API Server 启用`聚合层`
   - 组件要有`认证配置`并且绑定到 Metrics-Server
   - Pod / Node 指标需要由 `Summary API ` 通过 `kubelet` 公开

> k get apiservices.apiregistration.k8s.io v1beta1.metrics.k8s.io -oyaml

```yaml
apiVersion: apiregistration.k8s.io/v1
kind: APIService
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"apiregistration.k8s.io/v1","kind":"APIService","metadata":{"annotations":{},"labels":{"addonmanager.kubernetes.io/mode":"Reconcile","k8s-app":"metrics-server","kubernetes.io/minikube-addons":"metrics-server"},"name":"v1beta1.metrics.k8s.io"},"spec":{"group":"metrics.k8s.io","groupPriorityMinimum":100,"insecureSkipTLSVerify":true,"service":{"name":"metrics-server","namespace":"kube-system"},"version":"v1beta1","versionPriority":100}}
  creationTimestamp: "2022-11-16T08:58:21Z"
  labels:
    addonmanager.kubernetes.io/mode: Reconcile
    k8s-app: metrics-server
    kubernetes.io/minikube-addons: metrics-server
  name: v1beta1.metrics.k8s.io
  resourceVersion: "2119"
  uid: 454afcb7-be1d-488c-908e-633c5b750856
spec:
  group: metrics.k8s.io
  groupPriorityMinimum: 100
  insecureSkipTLSVerify: true
  service:
    name: metrics-server
    namespace: kube-system
    port: 443
  version: v1beta1
  versionPriority: 100
status:
  conditions:
  - lastTransitionTime: "2022-11-16T09:12:52Z"
    message: all checks passed
    reason: Passed
    status: "True"
    type: Available
```

> 如果访问 `v1beta1.metrics.k8s.io`，则转交给 `kube-system/metrics-server` 来处理

```
$ k get svc -n kube-system
NAME             TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)                  AGE
kube-dns         ClusterIP   10.96.0.10     <none>        53/UDP,53/TCP,9153/TCP   36d
metrics-server   ClusterIP   10.99.176.16   <none>        443/TCP                  36d

$ k get po -n kube-system
NAME                               READY   STATUS    RESTARTS      AGE
coredns-5dd5756b68-8x9tl           1/1     Running   1 (36d ago)   36d
etcd-minikube                      1/1     Running   1 (36d ago)   36d
kube-apiserver-minikube            1/1     Running   1 (36d ago)   36d
kube-controller-manager-minikube   1/1     Running   1 (36d ago)   36d
kube-proxy-9g86n                   1/1     Running   1 (36d ago)   36d
kube-scheduler-minikube            1/1     Running   1 (36d ago)   36d
metrics-server-7c66d45ddc-f64bm    1/1     Running   2 (36d ago)   36d
storage-provisioner                1/1     Running   3 (36d ago)   36d
```

> top

```
$ k top pod -n kube-system
NAME                               CPU(cores)   MEMORY(bytes)
coredns-5dd5756b68-8x9tl           3m           12Mi
etcd-minikube                      25m          51Mi
kube-apiserver-minikube            60m          212Mi
kube-controller-manager-minikube   18m          40Mi
kube-proxy-9g86n                   1m           29Mi
kube-scheduler-minikube            4m           14Mi
metrics-server-7c66d45ddc-f64bm    5m           14Mi
storage-provisioner                3m           7Mi

$ k top node -v 9
...
I1223 11:21:19.407717   94955 round_trippers.go:553] GET https://192.168.49.2:8443/apis/metrics.k8s.io/v1beta1/nodes 200 OK in 1 milliseconds
...
NAME       CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
minikube   204m         10%    655Mi           16%
```

> k get --raw "/api/v1/nodes/minikube/proxy/metrics/resource"
>
> 1. *kubelet* 和 *cAdvisor* 已经暴露了当前节点上的资源用量
> 2. *metrics-server* 执行 *top* 命令无非就是请求对应节点上的资源用量，然后`内存`中做`聚合排序`

```
# HELP container_cpu_usage_seconds_total [ALPHA] Cumulative cpu time consumed by the container in core-seconds
# TYPE container_cpu_usage_seconds_total counter
container_cpu_usage_seconds_total{container="coredns",namespace="kube-system",pod="coredns-5dd5756b68-8x9tl"} 2.49133 1703301518127
container_cpu_usage_seconds_total{container="dashboard-metrics-scraper",namespace="kubernetes-dashboard",pod="dashboard-metrics-scraper-7fd5cb4ddc-h758w"} 0.256141 1703301518133
container_cpu_usage_seconds_total{container="etcd",namespace="kube-system",pod="etcd-minikube"} 21.902979 1703301518125
container_cpu_usage_seconds_total{container="kube-apiserver",namespace="kube-system",pod="kube-apiserver-minikube"} 54.53667 1703301518141
container_cpu_usage_seconds_total{container="kube-controller-manager",namespace="kube-system",pod="kube-controller-manager-minikube"} 16.396995 1703301518130
container_cpu_usage_seconds_total{container="kube-proxy",namespace="kube-system",pod="kube-proxy-9g86n"} 0.609678 1703301518139
container_cpu_usage_seconds_total{container="kube-scheduler",namespace="kube-system",pod="kube-scheduler-minikube"} 3.515458 1703301518141
container_cpu_usage_seconds_total{container="kubernetes-dashboard",namespace="kubernetes-dashboard",pod="kubernetes-dashboard-8694d4445c-pktvn"} 0.397913 1703301518125
container_cpu_usage_seconds_total{container="metrics-server",namespace="kube-system",pod="metrics-server-7c66d45ddc-f64bm"} 4.291658 1703301518127
container_cpu_usage_seconds_total{container="storage-provisioner",namespace="kube-system",pod="storage-provisioner"} 2.001395 1703301518126
# HELP container_memory_working_set_bytes [ALPHA] Current working set of the container in bytes
# TYPE container_memory_working_set_bytes gauge
container_memory_working_set_bytes{container="coredns",namespace="kube-system",pod="coredns-5dd5756b68-8x9tl"} 1.3225984e+07 1703301518127
container_memory_working_set_bytes{container="dashboard-metrics-scraper",namespace="kubernetes-dashboard",pod="dashboard-metrics-scraper-7fd5cb4ddc-h758w"} 7.294976e+06 1703301518133
container_memory_working_set_bytes{container="etcd",namespace="kube-system",pod="etcd-minikube"} 5.41696e+07 1703301518125
container_memory_working_set_bytes{container="kube-apiserver",namespace="kube-system",pod="kube-apiserver-minikube"} 2.23248384e+08 1703301518141
container_memory_working_set_bytes{container="kube-controller-manager",namespace="kube-system",pod="kube-controller-manager-minikube"} 4.2729472e+07 1703301518130
container_memory_working_set_bytes{container="kube-proxy",namespace="kube-system",pod="kube-proxy-9g86n"} 3.11296e+07 1703301518139
container_memory_working_set_bytes{container="kube-scheduler",namespace="kube-system",pod="kube-scheduler-minikube"} 1.5532032e+07 1703301518141
container_memory_working_set_bytes{container="kubernetes-dashboard",namespace="kubernetes-dashboard",pod="kubernetes-dashboard-8694d4445c-pktvn"} 8.445952e+06 1703301518125
container_memory_working_set_bytes{container="metrics-server",namespace="kube-system",pod="metrics-server-7c66d45ddc-f64bm"} 1.5220736e+07 1703301518127
container_memory_working_set_bytes{container="storage-provisioner",namespace="kube-system",pod="storage-provisioner"} 8.392704e+06 1703301518126
# HELP container_start_time_seconds [ALPHA] Start time of the container since unix epoch in seconds
# TYPE container_start_time_seconds gauge
container_start_time_seconds{container="coredns",namespace="kube-system",pod="coredns-5dd5756b68-8x9tl"} 1.70012594e+09 1700125940000
container_start_time_seconds{container="dashboard-metrics-scraper",namespace="kubernetes-dashboard",pod="dashboard-metrics-scraper-7fd5cb4ddc-h758w"} 1.70012594e+09 1700125940000
container_start_time_seconds{container="etcd",namespace="kube-system",pod="etcd-minikube"} 1.700125936e+09 1700125936000
container_start_time_seconds{container="kube-apiserver",namespace="kube-system",pod="kube-apiserver-minikube"} 1.700125936e+09 1700125936000
container_start_time_seconds{container="kube-controller-manager",namespace="kube-system",pod="kube-controller-manager-minikube"} 1.700125936e+09 1700125936000
container_start_time_seconds{container="kube-proxy",namespace="kube-system",pod="kube-proxy-9g86n"} 1.70012594e+09 1700125940000
container_start_time_seconds{container="kube-scheduler",namespace="kube-system",pod="kube-scheduler-minikube"} 1.700125936e+09 1700125936000
container_start_time_seconds{container="kubernetes-dashboard",namespace="kubernetes-dashboard",pod="kubernetes-dashboard-8694d4445c-pktvn"} 1.700125987e+09 1700125987000
container_start_time_seconds{container="metrics-server",namespace="kube-system",pod="metrics-server-7c66d45ddc-f64bm"} 1.700125971e+09 1700125971000
container_start_time_seconds{container="storage-provisioner",namespace="kube-system",pod="storage-provisioner"} 1.700125987e+09 1700125987000
# HELP node_cpu_usage_seconds_total [ALPHA] Cumulative cpu time consumed by the node in core-seconds
# TYPE node_cpu_usage_seconds_total counter
node_cpu_usage_seconds_total 197.853363 1703301509002
# HELP node_memory_working_set_bytes [ALPHA] Current working set of the node in bytes
# TYPE node_memory_working_set_bytes gauge
node_memory_working_set_bytes 6.86260224e+08 1703301509002
# HELP pod_cpu_usage_seconds_total [ALPHA] Cumulative cpu time consumed by the pod in core-seconds
# TYPE pod_cpu_usage_seconds_total counter
pod_cpu_usage_seconds_total{namespace="kube-system",pod="coredns-5dd5756b68-8x9tl"} 2.496484 1703301516290
pod_cpu_usage_seconds_total{namespace="kube-system",pod="etcd-minikube"} 21.712656 1703301509664
pod_cpu_usage_seconds_total{namespace="kube-system",pod="kube-apiserver-minikube"} 53.779318 1703301504671
pod_cpu_usage_seconds_total{namespace="kube-system",pod="kube-controller-manager-minikube"} 16.38995 1703301517184
pod_cpu_usage_seconds_total{namespace="kube-system",pod="kube-proxy-9g86n"} 0.611623 1703301513067
pod_cpu_usage_seconds_total{namespace="kube-system",pod="kube-scheduler-minikube"} 3.487537 1703301505945
pod_cpu_usage_seconds_total{namespace="kube-system",pod="metrics-server-7c66d45ddc-f64bm"} 4.437347 1703301503427
pod_cpu_usage_seconds_total{namespace="kube-system",pod="storage-provisioner"} 2.02609 1703301514682
pod_cpu_usage_seconds_total{namespace="kubernetes-dashboard",pod="dashboard-metrics-scraper-7fd5cb4ddc-h758w"} 0.265589 1703301516565
pod_cpu_usage_seconds_total{namespace="kubernetes-dashboard",pod="kubernetes-dashboard-8694d4445c-pktvn"} 0.432995 1703301499879
# HELP pod_memory_working_set_bytes [ALPHA] Current working set of the pod in bytes
# TYPE pod_memory_working_set_bytes gauge
pod_memory_working_set_bytes{namespace="kube-system",pod="coredns-5dd5756b68-8x9tl"} 1.335296e+07 1703301516290
pod_memory_working_set_bytes{namespace="kube-system",pod="etcd-minikube"} 4.050944e+07 1703301509664
pod_memory_working_set_bytes{namespace="kube-system",pod="kube-apiserver-minikube"} 2.2339584e+08 1703301504671
pod_memory_working_set_bytes{namespace="kube-system",pod="kube-controller-manager-minikube"} 4.1885696e+07 1703301517184
pod_memory_working_set_bytes{namespace="kube-system",pod="kube-proxy-9g86n"} 2.3207936e+07 1703301513067
pod_memory_working_set_bytes{namespace="kube-system",pod="kube-scheduler-minikube"} 1.544192e+07 1703301505945
pod_memory_working_set_bytes{namespace="kube-system",pod="metrics-server-7c66d45ddc-f64bm"} 1.5495168e+07 1703301503427
pod_memory_working_set_bytes{namespace="kube-system",pod="storage-provisioner"} 8.413184e+06 1703301514682
pod_memory_working_set_bytes{namespace="kubernetes-dashboard",pod="dashboard-metrics-scraper-7fd5cb4ddc-h758w"} 7.376896e+06 1703301516565
pod_memory_working_set_bytes{namespace="kubernetes-dashboard",pod="kubernetes-dashboard-8694d4445c-pktvn"} 8.699904e+06 1703301499879
# HELP scrape_error [ALPHA] 1 if there was an error while getting container metrics, 0 otherwise
# TYPE scrape_error gauge
scrape_error 0
```

> 运行机制

![image-20231222230008037](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231222230008037.png)

> HPA 和 VPA 依赖于 Metrics Server

# Scaling

| Scaling  | Desc                 |
| -------- | -------------------- |
| 横向伸缩 | 增加应用实例数量     |
| 纵向伸缩 | 增加单个应用实例资源 |

![image-20231223144832948](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231223144832948.png)

> `Cluster Autoscaler` 需要与`云厂商`集成，很难形成`统一`的生产化方案

## HPA

### 概述

> HorizontalPodAutoscaler

1. HPA 是 Kubernetes 的一种资源对象
   - 能够根据`特定指标`对在 StatefulSet、ReplicaSet、Deployment 等集合中的 Pod 数量进行`横向动态伸缩`
2. 当 `Node 计算资源固定`，且 Pod 调度完成并运行后，动态调整计算资源比较困难，因此 HPA 是 Scaling 的第一选择
3. 多个`冲突`的 HPA `同时应用`到同一个应用时，可能会发生`无法预期`的行为
4. HPA 依赖于 `Metrics-Server`

### 版本

> HPA v1，处于毕业状态，但扩展性较弱（只支持 CPU 和 Memory），衍生出了 v2

```yaml
apiVersion: autoscaling/v1
kind: HorizontalPodAutoscaler
metadata:
  name: nginx-hpa
  namespace: default
spec:
  maxReplicas: 10
  minReplicas: 1
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nginx
  targetCPUUtilizationPercentage: 50
```

> HPA v2

```yaml
apiVersion: autoscaling/v2beta2
kind: HorizontalPodAutoscaler
metadata:
  name: nginx-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nginx
  minReplicas: 1
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 50
```

### 指标

1. 按 Pod 统计的 `Resource 指标`（如 CPU）
   - 控制器从资源指标 API 获取每个 HPA 指定的 Pod 的`度量值`
   - 如果设置了`目标使用率`，控制器获取每个 Pod 中的容器资源使用情况，并计算资源使用率
   - 如果设置了`目标值`，则直接使用原始数据
2. 使用 Pod 的`自定义指标`，只使用`原始值`

#### Resource

```yaml
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization # Resource 指标类型支持 Utilization 和 AverageValue 类型的目标值
          averageUtilization: 50
```

> httpd

```yaml httpd.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpd
spec:
  selector:
    matchLabels:
      run: httpd
  replicas: 1
  template:
    metadata:
      labels:
        run: httpd
    spec:
      containers:
      - name: httpd
        image: httpd:2.4.58
        ports:
        - containerPort: 80
        resources:
          limits:
            cpu: 50m
          requests:
            cpu: 20m
---
apiVersion: v1
kind: Service
metadata:
  name: httpd
  labels:
    run: httpd
spec:
  ports:
  - port: 80
  selector:
    run: httpd
```

```
$ k apply -f httpd.yaml
deployment.apps/httpd created
service/httpd created

$ k get po
NAME                    READY   STATUS    RESTARTS   AGE
httpd-6f87455fc-wwrpz   1/1     Running   0          11s

$ k get svc
NAME         TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
httpd        ClusterIP   10.102.219.57   <none>        80/TCP    23s
kubernetes   ClusterIP   10.96.0.1       <none>        443/TCP   37d
```

> hpa

```yaml hpa-httpd.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: httpd
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: httpd
  minReplicas: 1
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 10
```

```
$ k apply -f hpa-httpd.yaml
horizontalpodautoscaler.autoscaling/httpd created

$ k top pod
NAME                    CPU(cores)   MEMORY(bytes)
httpd-6f87455fc-wwrpz   1m           5Mi

$ k get hpa
NAME    REFERENCE          TARGETS         MINPODS   MAXPODS   REPLICAS   AGE
httpd   Deployment/httpd   <unknown>/10%   1         10        1          50s
```

> load

```
$ kubectl run -i --tty load-generator --rm --image=busybox --restart=Never -- /bin/sh -c "while sleep 0.001; do wget -q -O- http://httpd; done"
```

> scaling

```
$ k get hpa
NAME    REFERENCE          TARGETS   MINPODS   MAXPODS   REPLICAS   AGE
httpd   Deployment/httpd   35%/10%   1         10        10         4m35s

$ k describe horizontalpodautoscalers.autoscaling httpd
...
  Normal   SuccessfulRescale             2m34s                  horizontal-pod-autoscaler  New size: 4; reason: cpu resource utilization (percentage of request) above target
  Normal   SuccessfulRescale             2m19s                  horizontal-pod-autoscaler  New size: 8; reason: cpu resource utilization (percentage of request) above target
  Normal   SuccessfulRescale             34s                    horizontal-pod-autoscaler  New size: 10; reason: cpu resource utilization (percentage of request) above target

$ k top pods
NAME                    CPU(cores)   MEMORY(bytes)
httpd-6f87455fc-5nbp4   6m           6Mi
httpd-6f87455fc-9fpzf   6m           6Mi
httpd-6f87455fc-9l65t   6m           6Mi
httpd-6f87455fc-9rkn7   6m           6Mi
httpd-6f87455fc-fngnn   6m           8Mi
httpd-6f87455fc-pjdww   6m           6Mi
httpd-6f87455fc-wq875   6m           6Mi
httpd-6f87455fc-wwrpz   6m           8Mi
httpd-6f87455fc-xcsxf   6m           6Mi
httpd-6f87455fc-zn5qs   6m           6Mi
load-generator          397m         1Mi

$ k get po
NAME                    READY   STATUS    RESTARTS   AGE
httpd-6f87455fc-5nbp4   1/1     Running   0          85s
httpd-6f87455fc-9fpzf   1/1     Running   0          3m10s
httpd-6f87455fc-9l65t   1/1     Running   0          3m10s
httpd-6f87455fc-9rkn7   1/1     Running   0          3m25s
httpd-6f87455fc-fngnn   1/1     Running   0          3m25s
httpd-6f87455fc-pjdww   1/1     Running   0          85s
httpd-6f87455fc-wq875   1/1     Running   0          3m10s
httpd-6f87455fc-wwrpz   1/1     Running   0          6m30s
httpd-6f87455fc-xcsxf   1/1     Running   0          3m25s
httpd-6f87455fc-zn5qs   1/1     Running   0          3m10s
load-generator          1/1     Running   0          3m59s
```

> 关闭压力后，Pod 会慢慢回收

```
$ k get hpa
NAME    REFERENCE          TARGETS   MINPODS   MAXPODS   REPLICAS   AGE
httpd   Deployment/httpd   5%/10%    1         10        5          16m

$ k get po
NAME                    READY   STATUS    RESTARTS   AGE
httpd-6f87455fc-9l65t   1/1     Running   0          14m
httpd-6f87455fc-9rkn7   1/1     Running   0          14m
httpd-6f87455fc-fngnn   1/1     Running   0          14m
httpd-6f87455fc-wwrpz   1/1     Running   0          17m
httpd-6f87455fc-xcsxf   1/1     Running   0          14m
```

```
$ k get hpa
NAME    REFERENCE          TARGETS   MINPODS   MAXPODS   REPLICAS   AGE
httpd   Deployment/httpd   5%/10%    1         10        1          48m

$ k get po
NAME                    READY   STATUS    RESTARTS   AGE
httpd-6f87455fc-wwrpz   1/1     Running   0          49m
```

#### 自定义

> Metrics-Server `默认不收集`，需要通过 `Aggregated APIServer` 实现 Metrics-Server 类似的能力

```yaml
  metrics:
    - type: Pods
      pods:
        metric:
        	name: packets-per-second
        target:
          type: AverageValue # Pods 指标类型只支持 AverageValue 类型的目标值
          averageValue: 1k
```

#### 外部

> TBD，Metrics-Server 同样默认不收集

### 算法

> 期望副本数 = ceil[ 当前副本数 × (当前指标 / 期望指标) ]

1. 目标设定值为 100m
   - 当前度量值为 200m，那么因子为 2
   - 当前度量值为 50m，那么因子为 0.5
2. 当因子`接近` 1.0，则`放弃`本身 Scaling
   - 由参数 `--horizontal-pod-autoscaler-cpu-initialization-period` 控制，默认为 `0.1`

### Deployment

1. 为每个 Deployment 配置一个 HPA
2. HPA 管理的是 Deployment 的 `replicas` 字段 - `职责清晰`

### 防抖

1. 抖动：因为指标动态变化而造成副本数量的频繁变化
2. `--horizontal-pod-autoscaler-downscale-stabilization` - 缩容`冷却`时间窗口长度，默认为 `5 分钟`

### 策略

> 当指定`多个策略`时，默认选择允许`变更最多`的策略

```yaml
behavior:
	scaleDown:
		policies:
  		- type: Pods
    		value: 4
    		periodSeconds: 60
  		- type: Percent
    		value: 10
    		periodSeconds: 60
```

### 问题

> `突发`流量，还未完成弹性扩容，现有服务实例已经被流量`击垮`

1. 由于弹性控制器的`操作链路过长`，基于`指标`的弹性有`滞后`效应
2. 时间差：应用负载超过阈值 -> HPA 完成扩容
   - 应用指标数据超过阈值
   - HPA `定期`执行`指标收集`
   - HPA 控制 `Deployment` 进行`扩容`的时间
   - `Pod 调度`，运行时启动挂载存储和网络的时间
   - `应用启动`到`服务就绪`的时间

## VPA

> 尚未`生产就绪`

### 概述

1. 根据`容器资源使用率`自动设置 CPU 和 Memory 的 `requests`
2. 可以缩小过度请求资源的容器，也可以根据使用情况随时提升容器的资源容量
3. 意义
   - Pod 资源`用其所需`，提升集群`节点使用效率`
   - 不需要通过`基准测试`来确定 CPU 和 Memory 的 `requests` 合适值
   - 可以`自动调整` CPU 和 Memory 的 `requests`，减少运维时间

### 架构

> 同样需要`驱逐 Pod`，并非原地调整，属于`破环性`操作

![image-20231223195212692](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231223195212692.png)

### 组件

> VPA 模式：`Off` / `Auto`

1. VPA 引入新的 API 资源 `VerticalPodAutoscaler`
2. History Storage
   - 持久化来自于 `API Server` 的 `Pod 利用率`和 `OOM` 事件 - 后续提供信息给 `Recommender`
3. VPA `Recommender`
   - 监视所有的 Pod，不断为它们计算新的`推荐资源`，并将值存储在 `VPA 对象`中
   - 数据源：来自于 Metrics-Server 的 `Pod 利用率`和 `OOM` 事件（`实时` + `历史`）
4. VPA `Updater`
   - 负责 Pod 的实时更新，在 VPA 的 `Auto 模式`下，Updater 可以决定使用`推荐资源`对 Pod 进行更新
5. 所有 `Pod 创建请求`都需要通过 `VPA Admission Controller`，将 Pod Spec `重写`为推荐资源

### 原理![image-20231223201252980](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231223201252980.png)

### 模型

> 假设 CPU 和 Memory 利用率是`独立随机变量`，其分布为过去 N=8 天观察到的变量，依据`直方图百分位`给推荐

1. CPU
   - 以历史数据的 `95%` 分位给建议
   - CPU 使用率：在短时间间隔内测量的平均使用率，最小合理分辨率为 `1/min`，推荐为 `1/sec`
2. Memory
   - 24 小时内有 `99%`的时间，内存请求不会超过阈值
   - 窗口必须很长（>= 24h），确保 `OOM` 引起的`驱逐`不会明显影响推荐结果

> 流程：`CheckPoints` 为内存中的`直方图`数据结构，History Storage 可能会 `Crash`

![image-20231223203739864](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231223203739864.png)

> 半衰指数：`时间越近`的数据，`权重越大`，24 小时为一个半衰期

![image-20231223204206976](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231223204206976.png)

> 按`指数`划分的直方图，数据落到不同的 bucket，且数据本身依据时间远近有不同的`权重`，最后计算`百分位`

| Resource | MinBucket  | MaxBucket  | Rate |
| -------- | ---------- | ---------- | ---- |
| CPU      | 0.01 cores | 1000 cores | 5%   |
| Memory   | 10 MB      | 1 TB       | 5%   |

### 实践

> 安装 VPA

```
$ git clone https://github.com/kubernetes/autoscaler.git

$ cd autoscaler/vertical-pod-autoscaler/
$ ./hack/vpa-up.sh

$ k api-resources --api-group="autoscaling.k8s.io"
NAME                               SHORTNAMES      APIVERSION              NAMESPACED   KIND
verticalpodautoscalercheckpoints   vpacheckpoint   autoscaling.k8s.io/v1   true         VerticalPodAutoscalerCheckpoint
verticalpodautoscalers             vpa             autoscaling.k8s.io/v1   true         VerticalPodAutoscaler

$ k get po -A | grep vpa
kube-system            vpa-admission-controller-7467db745-h78w9     1/1     Running   0             8m53s
kube-system            vpa-recommender-597b7c765d-qp9nn             1/1     Running   0             8m53s
kube-system            vpa-updater-884d4d7d9-b764h                  1/1     Running   0             8m53s
```

> vpa

```yaml vpa.yaml
# This config creates a deployment with two pods, each requesting 100 millicores
# and trying to utilize slightly above 500 millicores (repeatedly using CPU for
# 0.5s and sleeping 0.5s).
# It also creates a corresponding Vertical Pod Autoscaler that adjusts the
# requests.
# Note that the update mode is left unset, so it defaults to "Auto" mode.
---
apiVersion: "autoscaling.k8s.io/v1"
kind: VerticalPodAutoscaler
metadata:
  name: hamster-vpa
spec:
  # recommenders field can be unset when using the default recommender.
  # When using an alternative recommender, the alternative recommender's name
  # can be specified as the following in a list.
  # recommenders:
  #   - name: 'alternative'
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: hamster
  resourcePolicy:
    containerPolicies:
      - containerName: '*'
        minAllowed:
          cpu: 100m
          memory: 50Mi
        maxAllowed:
          cpu: 1
          memory: 500Mi
        controlledResources: ["cpu", "memory"]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hamster
spec:
  selector:
    matchLabels:
      app: hamster
  replicas: 2
  template:
    metadata:
      labels:
        app: hamster
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 65534 # nobody
      containers:
        - name: hamster
          image: ubuntu:jammy
          resources:
            requests:
              cpu: 100m
              memory: 50Mi
          command: ["/bin/sh"]
          args:
            - "-c"
            - "while true; do timeout 0.5s yes >/dev/null; sleep 0.5s; done"
```

```
$ k apply -f  vpa.yaml
verticalpodautoscaler.autoscaling.k8s.io/hamster-vpa created
deployment.apps/hamster created

$ k top pods
NAME                       CPU(cores)   MEMORY(bytes)
hamster-547cf6bd4b-ckbbk   481m         0Mi
hamster-547cf6bd4b-dtplx   462m         0Mi

$ k get vpa hamster-vpa
NAME          MODE   CPU    MEM       PROVIDED   AGE
hamster-vpa   Auto   587m   262144k   True       2m52s
```

> k get vpa hamster-vpa -oyaml

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"autoscaling.k8s.io/v1","kind":"VerticalPodAutoscaler","metadata":{"annotations":{},"name":"hamster-vpa","namespace":"default"},"spec":{"resourcePolicy":{"containerPolicies":[{"containerName":"*","controlledResources":["cpu","memory"],"maxAllowed":{"cpu":1,"memory":"500Mi"},"minAllowed":{"cpu":"100m","memory":"50Mi"}}]},"targetRef":{"apiVersion":"apps/v1","kind":"Deployment","name":"hamster"}}}
  creationTimestamp: "2022-12-23T13:22:22Z"
  generation: 1
  name: hamster-vpa
  namespace: default
  resourceVersion: "32813"
  uid: 44a69efb-5b7d-470e-9567-168a9f32e330
spec:
  resourcePolicy:
    containerPolicies:
    - containerName: '*'
      controlledResources:
      - cpu
      - memory
      maxAllowed:
        cpu: 1
        memory: 500Mi
      minAllowed:
        cpu: 100m
        memory: 50Mi
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: hamster
  updatePolicy:
    updateMode: Auto
status:
  conditions:
  - lastTransitionTime: "2022-12-23T13:23:59Z"
    status: "True"
    type: RecommendationProvided
  recommendation:
    containerRecommendations:
    - containerName: hamster
      lowerBound:
        cpu: 100m
        memory: 262144k
      target:
        cpu: 587m
        memory: 262144k
      uncappedTarget:
        cpu: 587m
        memory: 262144k
      upperBound:
        cpu: "1"
        memory: 500Mi
```

> Updater 看到了 Recommender 给出的建议，`重建` Pod

```
$ k get po -w
NAME                       READY   STATUS    RESTARTS   AGE
hamster-547cf6bd4b-ckbbk   1/1     Running   0          104s
hamster-547cf6bd4b-dtplx   1/1     Running   0          104s
hamster-547cf6bd4b-ckbbk   1/1     Running   0          118s
hamster-547cf6bd4b-ckbbk   1/1     Terminating   0          118s
hamster-547cf6bd4b-ckbbk   1/1     Terminating   0          118s
hamster-547cf6bd4b-pghkm   0/1     Pending       0          0s
hamster-547cf6bd4b-pghkm   0/1     Pending       0          0s
hamster-547cf6bd4b-pghkm   0/1     ContainerCreating   0          0s
hamster-547cf6bd4b-pghkm   1/1     Running             0          1s
hamster-547cf6bd4b-ckbbk   0/1     Terminating         0          2m28s
hamster-547cf6bd4b-ckbbk   0/1     Terminating         0          2m29s
hamster-547cf6bd4b-ckbbk   0/1     Terminating         0          2m29s
hamster-547cf6bd4b-dtplx   1/1     Running             0          2m58s
hamster-547cf6bd4b-dtplx   1/1     Terminating         0          2m58s
hamster-547cf6bd4b-dtplx   1/1     Terminating         0          2m58s
hamster-547cf6bd4b-rhttf   0/1     Pending             0          0s
hamster-547cf6bd4b-rhttf   0/1     Pending             0          0s
hamster-547cf6bd4b-dtplx   0/1     Terminating         0          3m28s
hamster-547cf6bd4b-dtplx   0/1     Terminating         0          3m28s
hamster-547cf6bd4b-dtplx   0/1     Terminating         0          3m28s
hamster-547cf6bd4b-dtplx   0/1     Terminating         0          3m28s
```

> VPA Admission Controller `重写`了 Pod Spec
> 但超过了 VPA 的 `maxAllowed = 1 < 587m + 587m` ，其中一个 Pod 处于 `Pending` 状态

```
$ Name:             hamster-547cf6bd4b-rhttf
Namespace:        default
Priority:         0
Service Account:  default
Node:             <none>
Labels:           app=hamster
                  pod-template-hash=547cf6bd4b
Annotations:      vpaObservedContainers: hamster
                  vpaUpdates: Pod resources updated by hamster-vpa: container 0: cpu request, memory request
Status:           Pending
IP:
IPs:              <none>
Controlled By:    ReplicaSet/hamster-547cf6bd4b
Containers:
  hamster:
    Image:      ubuntu:jammy
    Port:       <none>
    Host Port:  <none>
    Command:
      /bin/sh
    Args:
      -c
      while true; do timeout 0.5s yes >/dev/null; sleep 0.5s; done
    Requests:
      cpu:        587m
      memory:     262144k
    Environment:  <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-9j22s (ro)
Conditions:
  Type           Status
  PodScheduled   False
Volumes:
  kube-api-access-9j22s:
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
  Type     Reason            Age    From               Message
  ----     ------            ----   ----               -------
  Warning  FailedScheduling  4m18s  default-scheduler  0/1 nodes are available: 1 Insufficient cpu. preemption: 0/1 nodes are available: 1 No preemption victims found for incoming pod..
  Warning  FailedScheduling  3m48s  default-scheduler  0/1 nodes are available: 1 Insufficient cpu. preemption: 0/1 nodes are available: 1 No preemption victims found for incoming pod..
```

### 问题

1. 更新正在运行的 Pod 资源配置，会导致 `Pod 重建`，并且可能会被`调度`到其它节点上
2. VPA 不会驱逐没有在`副本控制器`管理下的 Pod
3. VPA 不能与监控 `CPU` 和 `Memory` 度量的 `HPA` 同时运行，除非 HPA `只`监控其它`自定义`或者`外部`的资源度量
4. 需要确保其它的 `Admission Webhook` 不会与 VPA Admission Controller 发生`冲突`
   - Admission Webhook 的`执行顺序`定义在 `API Server` 的`配置参数`中
5. VPA 可以处理出现的绝大部分 OOM 事件，但不能保证所有场景都有效
6. VPA 尚未有在`大规模集群落地`的案例
7. VPA 对 Pod 资源 requests 的修改，可能会`超过`实际的资源上限（节点资源上限、空闲资源、资源配额等）
   - 导致 Pod 处于 `Pending` 状态`无法被调度`，可以结合集群的 `Cluster AutoScaler` 一起解决
8. 多个 VPA `同时匹配`到同一个 Pod 会造成`未定义的行为`



