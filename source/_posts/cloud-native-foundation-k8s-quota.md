---
title: Kubernetes -  ResourceQuota
mathjax: false
date: 2022-11-04 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/k8s-quota.webp
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Kubernetes
---

# Namespace

> Namespace 是一个 `API 对象`，但并不是一个`实体对象`，只是一个`逻辑`上的概念

```
$ k create ns test-ns
namespace/test-ns created

$ k get ns test-ns -owide
NAME      STATUS   AGE
test-ns   Active   8s
```

<!-- more -->

```yaml nginx-pod-ns.yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  namespace: test-ns

spec:
  containers:
  - name: nginx
    image: nginx:alpine
```

```
$ k apply -f nginx-pod-ns.yaml
pod/nginx created

$ k get po -ntest-ns -owide
NAME    READY   STATUS    RESTARTS   AGE   IP            NODE         NOMINATED NODE   READINESS GATES
nginx   1/1     Running   0          24s   10.10.1.110   mac-worker   <none>           <none>

$ k delete ns test-ns
namespace "test-ns" deleted

$ k get po -ntest-ns -owide
No resources found in test-ns namespace.
```

# ResourceQuota

> ResourceQuota 必须依附于某个 `Namespace`

```
$ k api-resources --api-group=''
NAME                     SHORTNAMES   APIVERSION   NAMESPACED   KIND
...
limitranges              limits       v1           true         LimitRange
...
resourcequotas           quota        v1           true         ResourceQuota
...

$ k get quota -A -owide
No resources found

$ k create quota dev-qt --dry-run=client -oyaml
apiVersion: v1
kind: ResourceQuota
metadata:
  creationTimestamp: null
  name: dev-qt
spec: {}
status: {}
```

| 限制      | 使用                                                         |
| --------- | ------------------------------------------------------------ |
| CPU、内存 | `request.*`、`limits.*`                                      |
| 存储      | `requests.storage` 限制 `PVC` 的`存储总量`<br />`persistentvolumeclaims` 限制 `PVC` 的`个数` |
| 核心对象  | `pods`、`configmaps`、`secrets`、`services`                  |
| 其它对象  | `count/jobs.batch`、`count/deployments.apps`                 |

> 硬性全局限制

```yaml quota-hard.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dev-ns

---

apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-qt
  namespace: dev-ns

spec:
  hard:
    requests.cpu: 10
    requests.memory: 10Gi
    limits.cpu: 10
    limits.memory: 20Gi

    requests.storage: 100Gi
    persistentvolumeclaims: 100

    pods: 100
    configmaps: 100
    secrets: 100
    services: 10

    count/jobs.batch: 1
    count/cronjobs.batch: 1
    count/deployments.apps: 1
```

```
$ k apply -f quota-hard.yaml
namespace/dev-ns created
resourcequota/dev-qt created

$ k get quota -n dev-ns -owide
NAME     AGE   REQUEST                                                                                                                                                                                                                                                LIMIT
dev-qt   53s   configmaps: 1/100, count/cronjobs.batch: 0/1, count/deployments.apps: 0/1, count/jobs.batch: 0/1, persistentvolumeclaims: 0/100, pods: 0/100, requests.cpu: 0/10, requests.memory: 0/10Gi, requests.storage: 0/100Gi, secrets: 0/100, services: 0/10   limits.cpu: 0/10, limits.memory: 0/20Gi

$ k describe quota dev-qt -n dev-ns
Name:                   dev-qt
Namespace:              dev-ns
Resource                Used  Hard
--------                ----  ----
configmaps              1     100
count/cronjobs.batch    0     1
count/deployments.apps  0     1
count/jobs.batch        0     1
limits.cpu              0     10
limits.memory           0     20Gi
persistentvolumeclaims  0     100
pods                    0     100
requests.cpu            0     10
requests.memory         0     10Gi
requests.storage        0     100Gi
secrets                 0     100
services                0     10
```

> 运行 2 个 Job

```
$ k create job echo1 -n dev-ns --image=busybox -- echo hello
job.batch/echo1 created

$ k create job echo2 -n dev-ns --image=busybox -- echo hello
error: failed to create job: jobs.batch "echo2" is forbidden: exceeded quota: dev-qt, requested: count/jobs.batch=1, used: count/jobs.batch=1, limited: count/jobs.batch=1

$ k describe quota dev-qt -n dev-ns
Name:                   dev-qt
Namespace:              dev-ns
Resource                Used  Hard
--------                ----  ----
configmaps              1     100
count/cronjobs.batch    0     1
count/deployments.apps  0     1
count/jobs.batch        1     1
limits.cpu              0     10
limits.memory           0     20Gi
persistentvolumeclaims  0     100
pods                    0     100
requests.cpu            0     10
requests.memory         0     10Gi
requests.storage        0     100Gi
secrets                 0     100
services                0     10

$ k delete jobs.batch -n dev-ns echo1
job.batch "echo1" deleted

$ k describe quota dev-qt -n dev-ns
Name:                   dev-qt
Namespace:              dev-ns
Resource                Used  Hard
--------                ----  ----
configmaps              1     100
count/cronjobs.batch    0     1
count/deployments.apps  0     1
count/jobs.batch        0     1
limits.cpu              0     10
limits.memory           0     20Gi
persistentvolumeclaims  0     100
pods                    0     100
requests.cpu            0     10
requests.memory         0     10Gi
requests.storage        0     100Gi
secrets                 1     100
services                0     10

$ k create job echo2 -n dev-ns --image=busybox -- echo hello
job.batch/echo2 created
```

> Namespace 设置了 ResourceQuota 后，要求所有 `Pod` 都必须带有 `resources` 来声明资源需求

> Pod 默认没有 `resources` 字段，可以`无限制`地使用 CPU 和 内存，语义上与 ResourceQuota 冲突

```
$ k run nginx --image=nginx:alpine -n dev-ns
Error from server (Forbidden): pods "nginx" is forbidden: failed quota: dev-qt: must specify limits.cpu,limits.memory,requests.cpu,requests.memory
```

> `LimitRange` - 为 API 对象添加`默认的 resources`

>  `spec.limits.defaultRequest` 和 `spec.limits.default`  只适用于 `Container`

| Field                        | Desc                                                         |
| ---------------------------- | ------------------------------------------------------------ |
| `spec.limits.type`           | Type of resource that this limit applies to - `Container`、`Pod`、PersistentVolumeClaim |
| `spec.limits.defaultRequest` | DefaultRequest is the default resource requirement `request value` by resource name if resource request is omitted |
| `spec.limits.default`        | Default resource requirement `limit value` by resource name if resource limit is omitted |
| `spec.limits.max`            | Max usage constraints on this kind by resource name          |
| `spec.limits.min`            | Min usage constraints on this kind by resource name          |

```yaml quota-limits.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: dev-limits
  namespace: dev-ns

spec:
  limits:
  - type: Container
    defaultRequest:
      cpu: 200m
      memory: 50Mi
    default:
      cpu: 500m
      memory: 100Mi
  - type: Pod
    max:
      cpu: 800m
      memory: 200Mi
```

```
$ k apply -f quota-limits.yaml
limitrange/dev-limits created

$ k describe limitranges -n dev-ns
Name:       dev-limits
Namespace:  dev-ns
Type        Resource  Min  Max    Default Request  Default Limit  Max Limit/Request Ratio
----        --------  ---  ---    ---------------  -------------  -----------------------
Container   cpu       -    -      200m             500m           -
Container   memory    -    -      50Mi             100Mi          -
Pod         cpu       -    800m   -                -              -
Pod         memory    -    200Mi  -                -              -

$ k run nginx --image=nginx:alpine -n dev-ns
pod/nginx created

$ k describe po -n dev-ns nginx
Name:         nginx
Namespace:    dev-ns
Priority:     0
Node:         mac-worker/192.168.191.146
Start Time:   Wed, 28 Jun 2022 17:14:15 +0000
Labels:       run=nginx
Annotations:  kubernetes.io/limit-ranger: LimitRanger plugin set: cpu, memory request for container nginx; cpu, memory limit for container nginx
Status:       Running
IP:           10.10.1.111
IPs:
  IP:  10.10.1.111
Containers:
  nginx:
    Container ID:   docker://7cda42734e496754f0f8c3a45e59367647e427ee1764ac3afc826f0cd5184aca
    Image:          nginx:alpine
    Image ID:       docker-pullable://nginx@sha256:2d194184b067db3598771b4cf326cfe6ad5051937ba1132b8b7d4b0184e0d0a6
    Port:           <none>
    Host Port:      <none>
    State:          Running
      Started:      Wed, 28 Jun 2022 17:14:15 +0000
    Ready:          True
    Restart Count:  0
    Limits:
      cpu:     500m
      memory:  100Mi
    Requests:
      cpu:        200m
      memory:     50Mi
    Environment:  <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-g4kvp (ro)
Conditions:
  Type              Status
  Initialized       True
  Ready             True
  ContainersReady   True
  PodScheduled      True
Volumes:
  kube-api-access-g4kvp:
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
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  38s   default-scheduler  Successfully assigned dev-ns/nginx to mac-worker
  Normal  Pulled     38s   kubelet            Container image "nginx:alpine" already present on machine
  Normal  Created    38s   kubelet            Created container nginx
  Normal  Started    38s   kubelet            Started container nginx
```
