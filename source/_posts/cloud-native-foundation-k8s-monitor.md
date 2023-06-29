---
title: Kubernetes - Monitor
mathjax: false
date: 2022-11-05 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/Server-Monitoring-using-Prometheus.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Kubernetes
---

# Metrics Server

> 用来收集 Kubernetes `核心资源`的指标，定时从所有 Node 的 `kubelet` 采集信息
> 对集群的整体性能影响极小，`性价比很高`，每个 Node 大约只会占用 `1m vCPU` 和 `2MB 内存`

> Metrics Server 调用 kubelet 的 API，获取到 Node 和 Pod 的指标，再将这些信息交给 API Server
> kubectl 和 HPA 可以通过 API Server 来读取指标

> Metrics Server 早期的数据来源是 `cAdvisor`，原先是一个`独立`的应用程序，后来被集成进 `kubelet`

![image-20230629221855298](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230629221855298.png)

<!-- more -->

> https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

> `--kubelet-insecure-tls`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    k8s-app: metrics-server
  name: metrics-server
  namespace: kube-system
spec:
	...
  template:
    metadata:
      labels:
        k8s-app: metrics-server
    spec:
      containers:
      - args:
        - --kubelet-insecure-tls
```

```
$ k apply -f components.yaml
serviceaccount/metrics-server created
clusterrole.rbac.authorization.k8s.io/system:aggregated-metrics-reader created
clusterrole.rbac.authorization.k8s.io/system:metrics-server created
rolebinding.rbac.authorization.k8s.io/metrics-server-auth-reader created
clusterrolebinding.rbac.authorization.k8s.io/metrics-server:system:auth-delegator created
clusterrolebinding.rbac.authorization.k8s.io/system:metrics-server created
service/metrics-server created
deployment.apps/metrics-server created
apiservice.apiregistration.k8s.io/v1beta1.metrics.k8s.io created

$ k get po -n kube-system -owide
NAME                                      READY   STATUS    RESTARTS        AGE     IP                NODE         NOMINATED NODE   READINESS GATES
coredns-64897985d-7mxbc                   1/1     Running   2 (3d6h ago)    12d     10.10.0.9         mac-master   <none>           <none>
coredns-64897985d-8kk4g                   1/1     Running   2 (3d6h ago)    12d     10.10.0.8         mac-master   <none>           <none>
etcd-mac-master                           1/1     Running   2 (3d6h ago)    12d     192.168.191.144   mac-master   <none>           <none>
kube-apiserver-mac-master                 1/1     Running   2 (3d6h ago)    12d     192.168.191.144   mac-master   <none>           <none>
kube-controller-manager-mac-master        1/1     Running   4 (3d6h ago)    12d     192.168.191.144   mac-master   <none>           <none>
kube-proxy-2jvg2                          1/1     Running   3 (4d23h ago)   12d     192.168.191.146   mac-worker   <none>           <none>
kube-proxy-j2qrp                          1/1     Running   2 (3d6h ago)    12d     192.168.191.144   mac-master   <none>           <none>
kube-scheduler-mac-master                 1/1     Running   4 (3d6h ago)    12d     192.168.191.144   mac-master   <none>           <none>
metrics-server-6bdb98f7d6-s92ff           0/1     Running   0               19s     10.10.1.115       mac-worker   <none>           <none>
nfs-client-provisioner-5bf9b668b7-4xstd   1/1     Running   0               2d21h   10.10.1.59        mac-worker   <none>           <none>
```

```
$ k top no
NAME         CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
mac-master   212m         10%    2469Mi          64%
mac-worker   61m          6%     734Mi           85%

$ k top po -n kube-system
NAME                                      CPU(cores)   MEMORY(bytes)
coredns-64897985d-7mxbc                   2m           11Mi
coredns-64897985d-8kk4g                   4m           11Mi
etcd-mac-master                           18m          49Mi
kube-apiserver-mac-master                 62m          273Mi
kube-controller-manager-mac-master        19m          48Mi
kube-proxy-2jvg2                          1m           16Mi
kube-proxy-j2qrp                          1m           10Mi
kube-scheduler-mac-master                 5m           18Mi
metrics-server-6bdb98f7d6-s92ff           5m           13Mi
nfs-client-provisioner-5bf9b668b7-4xstd   3m           12Mi
```

# HorizontalPodAutoscaler

> 基于 `Metrics Server`（主要是 CPU 使用率），自动伸缩 `Pod` 数量，适用于 `Deployment` 和 `StatefulSet`

```
$ k api-resources --api-group='autoscaling'
NAME                       SHORTNAMES   APIVERSION       NAMESPACED   KIND
horizontalpodautoscalers   hpa          autoscaling/v2   true         HorizontalPodAutoscaler
```

> Deployment，需要明确 `resources`，否则 `HPA` 无法获取 Pod 指标，也无法实现自动扩缩容

```yaml nginx-hpa-deploy.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-hpa-deploy

spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx-hpa-deploy
  template:
    metadata:
      labels:
        app: nginx-hpa-deploy
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 50m
            memory: 10Mi
          limits:
            cpu: 100m
            memory: 20Mi
```

```
$ k apply -f nginx-hpa-deploy.yaml
deployment.apps/nginx-hpa-deploy created

$ k get po -owide
NAME                               READY   STATUS    RESTARTS   AGE   IP            NODE         NOMINATED NODE   READINESS GATES
nginx-hpa-deploy-866f5b85d-nzjxf   1/1     Running   0          29s   10.10.1.116   mac-worker   <none>           <none>
```

> Service

```
$ k expose deployment nginx-hpa-deploy --name=nginx-hpa-svc --port=80 --dry-run=client -oyaml
apiVersion: v1
kind: Service
metadata:
  creationTimestamp: null
  name: nginx-hpa-svc
spec:
  ports:
  - port: 80
    protocol: TCP
    targetPort: 80
  selector:
    app: nginx-hpa-deploy
status:
  loadBalancer: {}
```

```yaml nginx-hpa-svc.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-hpa-svc

spec:
  ports:
  - port: 80
    protocol: TCP
    targetPort: 80
  selector:
    app: nginx-hpa-deploy
```

```
$ k apply -f  nginx-hpa-svc.yaml
service/nginx-hpa-svc created

$ k get svc -owide
NAME            TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE   SELECTOR
kubernetes      ClusterIP   10.96.0.1      <none>        443/TCP   12d   <none>
nginx-hpa-svc   ClusterIP   10.111.245.5   <none>        80/TCP    35s   app=nginx-hpa-deploy

$ k describe svc nginx-hpa-svc
Name:              nginx-hpa-svc
Namespace:         default
Labels:            <none>
Annotations:       <none>
Selector:          app=nginx-hpa-deploy
Type:              ClusterIP
IP Family Policy:  SingleStack
IP Families:       IPv4
IP:                10.111.245.5
IPs:               10.111.245.5
Port:              <unset>  80/TCP
TargetPort:        80/TCP
Endpoints:         10.10.1.116:80
Session Affinity:  None
Events:            <none>
```

> HorizontalPodAutoscaler，CPU 大于 `--cpu-percent` 时扩容，小于时缩容

```
$ k autoscale deployment nginx-hpa-deploy --name=nginx-hpa --min=2 --max=10 --cpu-percent=5 --dry-run=client -oyaml
apiVersion: autoscaling/v1
kind: HorizontalPodAutoscaler
metadata:
  creationTimestamp: null
  name: nginx-hpa
spec:
  maxReplicas: 10
  minReplicas: 2
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nginx-hpa-deploy
  targetCPUUtilizationPercentage: 5
status:
  currentReplicas: 0
  desiredReplicas: 0
```

```yaml nginx-hpa.yaml
apiVersion: autoscaling/v1
kind: HorizontalPodAutoscaler
metadata:
  name: nginx-hpa

spec:
  minReplicas: 2
  maxReplicas: 10
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nginx-hpa-deploy
  targetCPUUtilizationPercentage: 5
```

```
$ k apply -f nginx-hpa.yaml
horizontalpodautoscaler.autoscaling/nginx-hpa created

$ k get hpa -owide
NAME        REFERENCE                     TARGETS   MINPODS   MAXPODS   REPLICAS   AGE
nginx-hpa   Deployment/nginx-hpa-deploy   0%/5%     2         10        2          3m18s

$ k describe hpa nginx-hpa
Warning: autoscaling/v2beta2 HorizontalPodAutoscaler is deprecated in v1.23+, unavailable in v1.26+; use autoscaling/v2 HorizontalPodAutoscaler
Name:                                                  nginx-hpa
Namespace:                                             default
Labels:                                                <none>
Annotations:                                           <none>
CreationTimestamp:                                     Thu, 29 Jun 2022 14:59:41 +0000
Reference:                                             Deployment/nginx-hpa-deploy
Metrics:                                               ( current / target )
  resource cpu on pods  (as a percentage of request):  0% (0) / 5%
Min replicas:                                          2
Max replicas:                                          10
Deployment pods:                                       2 current / 2 desired
Conditions:
  Type            Status  Reason               Message
  ----            ------  ------               -------
  AbleToScale     True    ScaleDownStabilized  recent recommendations were higher than current one, applying the highest recent recommendation
  ScalingActive   True    ValidMetricFound     the HPA was able to successfully calculate a replica count from cpu resource utilization (percentage of request)
  ScalingLimited  False   DesiredWithinRange   the desired count is within the acceptable range
Events:
  Type    Reason             Age    From                       Message
  ----    ------             ----   ----                       -------
  Normal  SuccessfulRescale  4m33s  horizontal-pod-autoscaler  New size: 2; reason: Current number of replicas below Spec.MinReplicas

$ k get deployments.apps nginx-hpa-deploy
NAME               READY   UP-TO-DATE   AVAILABLE   AGE
nginx-hpa-deploy   2/2     2            2           14m

$ k describe deployments.apps nginx-hpa-deploy
Name:                   nginx-hpa-deploy
Namespace:              default
CreationTimestamp:      Thu, 29 Jun 2022 14:45:46 +0000
Labels:                 <none>
Annotations:            deployment.kubernetes.io/revision: 1
Selector:               app=nginx-hpa-deploy
Replicas:               2 desired | 2 updated | 2 total | 2 available | 0 unavailable
StrategyType:           RollingUpdate
MinReadySeconds:        0
RollingUpdateStrategy:  25% max unavailable, 25% max surge
Pod Template:
  Labels:  app=nginx-hpa-deploy
  Containers:
   nginx:
    Image:      nginx:alpine
    Port:       80/TCP
    Host Port:  0/TCP
    Limits:
      cpu:     100m
      memory:  20Mi
    Requests:
      cpu:        50m
      memory:     10Mi
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
Conditions:
  Type           Status  Reason
  ----           ------  ------
  Progressing    True    NewReplicaSetAvailable
  Available      True    MinimumReplicasAvailable
OldReplicaSets:  <none>
NewReplicaSet:   nginx-hpa-deploy-866f5b85d (2/2 replicas created)
Events:
  Type    Reason             Age   From                   Message
  ----    ------             ----  ----                   -------
  Normal  ScalingReplicaSet  15m   deployment-controller  Scaled up replica set nginx-hpa-deploy-866f5b85d to 1
  Normal  ScalingReplicaSet  67s   deployment-controller  Scaled up replica set nginx-hpa-deploy-866f5b85d to 2
```

> 增加压力

```
$ k run ab -it --rm --image=httpd:alpine -- sh
If you don't see a command prompt, try pressing enter.
/usr/local/apache2 #
/usr/local/apache2 # ab -V
This is ApacheBench, Version 2.3 <$Revision: 1903618 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
Licensed to The Apache Software Foundation, http://www.apache.org/

/usr/local/apache2 #
/usr/local/apache2 # ab -c 10 -t 60 -n 1000000 'http://nginx-hpa-svc/'
This is ApacheBench, Version 2.3 <$Revision: 1903618 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
Licensed to The Apache Software Foundation, http://www.apache.org/

Benchmarking nginx-hpa-svc (be patient)
Completed 100000 requests
Completed 200000 requests
Completed 300000 requests
Completed 400000 requests
Completed 500000 requests
Finished 571159 requests


Server Software:        nginx/1.25.1
Server Hostname:        nginx-hpa-svc
Server Port:            80

Document Path:          /
Document Length:        615 bytes

Concurrency Level:      10
Time taken for tests:   60.000 seconds
Complete requests:      571159
Failed requests:        0
Total transferred:      484342832 bytes
HTML transferred:       351262785 bytes
Requests per second:    9519.29 [#/sec] (mean)
Time per request:       1.050 [ms] (mean)
Time per request:       0.105 [ms] (mean, across all concurrent requests)
Transfer rate:          7883.16 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:        0    0   0.5      0      85
Processing:     0    1   2.7      1      92
Waiting:        0    1   2.5      0      73
Total:          0    1   2.8      1      95

Percentage of the requests served within a certain time (ms)
  50%      1
  66%      1
  75%      1
  80%      1
  90%      1
  95%      1
  98%      2
  99%      4
 100%     95 (longest request)
/usr/local/apache2 # exit
Session ended, resume using 'kubectl attach ab -c ab -i -t' command when the pod is running
pod "ab" deleted
```

> 每 `15` 秒采集一次数据，`HPA` 发现目标的 `CPU 使用率`超过了阈值，会`指数扩容`（基为 `2`），直到`上限`

```
$ k get hpa nginx-hpa -w
NAME        REFERENCE                     TARGETS   MINPODS   MAXPODS   REPLICAS   AGE
nginx-hpa   Deployment/nginx-hpa-deploy   0%/5%     2         10        2          11m
nginx-hpa   Deployment/nginx-hpa-deploy   72%/5%    2         10        2          16m
nginx-hpa   Deployment/nginx-hpa-deploy   191%/5%   2         10        4          16m
nginx-hpa   Deployment/nginx-hpa-deploy   179%/5%   2         10        8          16m
nginx-hpa   Deployment/nginx-hpa-deploy   98%/5%    2         10        10         17m
nginx-hpa   Deployment/nginx-hpa-deploy   61%/5%    2         10        10         17m
nginx-hpa   Deployment/nginx-hpa-deploy   13%/5%    2         10        10         17m
nginx-hpa   Deployment/nginx-hpa-deploy   0%/5%     2         10        10         17m
nginx-hpa   Deployment/nginx-hpa-deploy   0%/5%     2         10        10         22m
nginx-hpa   Deployment/nginx-hpa-deploy   0%/5%     2         10        2          22m

$ k describe hpa nginx-hpa
Warning: autoscaling/v2beta2 HorizontalPodAutoscaler is deprecated in v1.23+, unavailable in v1.26+; use autoscaling/v2 HorizontalPodAutoscaler
Name:                                                  nginx-hpa
Namespace:                                             default
Labels:                                                <none>
Annotations:                                           <none>
CreationTimestamp:                                     Thu, 29 Jun 2022 14:59:41 +0000
Reference:                                             Deployment/nginx-hpa-deploy
Metrics:                                               ( current / target )
  resource cpu on pods  (as a percentage of request):  0% (0) / 5%
Min replicas:                                          2
Max replicas:                                          10
Deployment pods:                                       2 current / 2 desired
Conditions:
  Type            Status  Reason            Message
  ----            ------  ------            -------
  AbleToScale     True    ReadyForNewScale  recommended size matches current size
  ScalingActive   True    ValidMetricFound  the HPA was able to successfully calculate a replica count from cpu resource utilization (percentage of request)
  ScalingLimited  True    TooFewReplicas    the desired replica count is less than the minimum replica count
Events:
  Type    Reason             Age    From                       Message
  ----    ------             ----   ----                       -------
  Normal  SuccessfulRescale  23m    horizontal-pod-autoscaler  New size: 2; reason: Current number of replicas below Spec.MinReplicas
  Normal  SuccessfulRescale  7m54s  horizontal-pod-autoscaler  New size: 4; reason: cpu resource utilization (percentage of request) above target
  Normal  SuccessfulRescale  7m39s  horizontal-pod-autoscaler  New size: 8; reason: cpu resource utilization (percentage of request) above target
  Normal  SuccessfulRescale  7m24s  horizontal-pod-autoscaler  New size: 10; reason: cpu resource utilization (percentage of request) above target
  Normal  SuccessfulRescale  98s    horizontal-pod-autoscaler  New size: 2; reason: All metrics below target

$ k describe deployments.apps nginx-hpa-deploy
Name:                   nginx-hpa-deploy
Namespace:              default
CreationTimestamp:      Thu, 29 Jun 2022 14:45:46 +0000
Labels:                 <none>
Annotations:            deployment.kubernetes.io/revision: 1
Selector:               app=nginx-hpa-deploy
Replicas:               2 desired | 2 updated | 2 total | 2 available | 0 unavailable
StrategyType:           RollingUpdate
MinReadySeconds:        0
RollingUpdateStrategy:  25% max unavailable, 25% max surge
Pod Template:
  Labels:  app=nginx-hpa-deploy
  Containers:
   nginx:
    Image:      nginx:alpine
    Port:       80/TCP
    Host Port:  0/TCP
    Limits:
      cpu:     100m
      memory:  20Mi
    Requests:
      cpu:        50m
      memory:     10Mi
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
Conditions:
  Type           Status  Reason
  ----           ------  ------
  Progressing    True    NewReplicaSetAvailable
  Available      True    MinimumReplicasAvailable
OldReplicaSets:  <none>
NewReplicaSet:   nginx-hpa-deploy-866f5b85d (2/2 replicas created)
Events:
  Type    Reason             Age    From                   Message
  ----    ------             ----   ----                   -------
  Normal  ScalingReplicaSet  37m    deployment-controller  Scaled up replica set nginx-hpa-deploy-866f5b85d to 1
  Normal  ScalingReplicaSet  23m    deployment-controller  Scaled up replica set nginx-hpa-deploy-866f5b85d to 2
  Normal  ScalingReplicaSet  7m11s  deployment-controller  Scaled up replica set nginx-hpa-deploy-866f5b85d to 4
  Normal  ScalingReplicaSet  6m56s  deployment-controller  Scaled up replica set nginx-hpa-deploy-866f5b85d to 8
  Normal  ScalingReplicaSet  6m41s  deployment-controller  Scaled up replica set nginx-hpa-deploy-866f5b85d to 10
  Normal  ScalingReplicaSet  55s    deployment-controller  Scaled down replica set nginx-hpa-deploy-866f5b85d to 2
```

# Prometheus

> 架构

![image-20230629232954376](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230629232954376.png)

> https://github.com/prometheus-operator/kube-prometheus

```yaml prometheus-service.yaml
apiVersion: v1
kind: Service
metadata:
	...
  name: prometheus-k8s
  namespace: monitoring
spec:
  ports:
  - name: web
    port: 9090
    targetPort: web
  - name: reloader-web
    port: 8080
    targetPort: reloader-web
  selector:
		...
  sessionAffinity: ClientIP
  type: NodePort
```

```yaml grafana-service.yaml
apiVersion: v1
kind: Service
metadata:
  labels:
		...
  name: grafana
  namespace: monitoring
spec:
  ports:
  - name: http
    port: 3000
    targetPort: http
  selector:
		...
  type: NodePort
```

```
$ k create -f manifests/setup
$ k create -f manifests

$ k get po -n monitoring -owide
NAME                                  READY   STATUS    RESTARTS   AGE     IP                NODE         NOMINATED NODE   READINESS GATES
alertmanager-main-0                   2/2     Running   0          4m1s    10.10.0.15        mac-master   <none>           <none>
alertmanager-main-1                   2/2     Running   0          4m1s    10.10.0.13        mac-master   <none>           <none>
alertmanager-main-2                   2/2     Running   0          4m1s    10.10.0.14        mac-master   <none>           <none>
blackbox-exporter-746c64fd88-9rfz2    3/3     Running   0          7m26s   10.10.1.130       mac-worker   <none>           <none>
grafana-5fc7f9f55d-lsn6p              1/1     Running   0          7m26s   10.10.1.131       mac-worker   <none>           <none>
kube-state-metrics-6c8846558c-pxgpp   3/3     Running   0          7m26s   10.10.1.132       mac-worker   <none>           <none>
node-exporter-9cx5w                   2/2     Running   0          7m26s   192.168.191.144   mac-master   <none>           <none>
node-exporter-pldcg                   2/2     Running   0          7m26s   192.168.191.146   mac-worker   <none>           <none>
prometheus-adapter-6455646bdc-2nqh7   1/1     Running   0          7m25s   10.10.0.10        mac-master   <none>           <none>
prometheus-adapter-6455646bdc-nzx2p   1/1     Running   0          7m25s   10.10.0.11        mac-master   <none>           <none>
prometheus-k8s-0                      2/2     Running   0          4m      10.10.0.16        mac-master   <none>           <none>
prometheus-k8s-1                      2/2     Running   0          4m      10.10.0.17        mac-master   <none>           <none>
prometheus-operator-f59c8b954-xd55g   2/2     Running   0          7m25s   10.10.0.12        mac-master   <none>           <none>

$ k get svc -n monitoring
NAME                    TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)                         AGE
alertmanager-main       ClusterIP   10.100.169.204   <none>        9093/TCP,8080/TCP               8m2s
alertmanager-operated   ClusterIP   None             <none>        9093/TCP,9094/TCP,9094/UDP      4m37s
blackbox-exporter       ClusterIP   10.107.9.208     <none>        9115/TCP,19115/TCP              8m2s
grafana                 NodePort    10.111.220.66    <none>        3000:30987/TCP                  8m2s
kube-state-metrics      ClusterIP   None             <none>        8443/TCP,9443/TCP               8m2s
node-exporter           ClusterIP   None             <none>        9100/TCP                        8m2s
prometheus-adapter      ClusterIP   10.110.141.119   <none>        443/TCP                         8m1s
prometheus-k8s          NodePort    10.106.187.47    <none>        9090:30413/TCP,8080:30172/TCP   8m1s
prometheus-operated     ClusterIP   None             <none>        9090/TCP                        4m36s
prometheus-operator     ClusterIP   None             <none>        8443/TCP                        8m1s

$ k get no -owide
NAME         STATUS   ROLES                  AGE   VERSION   INTERNAL-IP       EXTERNAL-IP   OS-IMAGE             KERNEL-VERSION      CONTAINER-RUNTIME
mac-master   Ready    control-plane,master   12d   v1.23.3   192.168.191.144   <none>        Ubuntu 22.04.2 LTS   5.15.0-75-generic   docker://24.0.2
mac-worker   Ready    <none>                 12d   v1.23.3   192.168.191.146   <none>        Ubuntu 22.04.2 LTS   5.15.0-75-generic   docker://20.10.24
```

![image-20230630001731070](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230630001731070.png)

![image-20230630002042557](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230630002042557.png)
