---
title: Kubernetes - Health
mathjax: false
date: 2022-11-03 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/google-kubernetes-probe-readiness6ktf.gif
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Kubernetes
---

# Resources

> 基于 `cgroup` 技术

> `内存`使用 `Ki`、`Mi`、`Gi` 来表示 KB、MB、GB；Kubernetes 里 `vCPU` 的最小使用单位为 `0.001`，即 `m`

```yaml nginx-pod-resources.yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod-resources

spec:
  containers:
  - name: nginx
    image: nginx:alpine
    resources:
      requests:
        cpu: 10m
        memory: 100Mi
      limits:
        cpu: 20m
        memory: 200Mi
```

<!-- more -->

```
$ k apply -f nginx-pod-resources.yaml
pod/nginx-pod-resources created

$ k describe po nginx-pod-resources
Name:         nginx-pod-resources
Namespace:    default
Priority:     0
Node:         mac-worker/192.168.191.146
Start Time:   Wed, 28 Jun 2022 14:19:14 +0000
Labels:       <none>
Annotations:  <none>
Status:       Running
IP:           10.10.1.106
IPs:
  IP:  10.10.1.106
Containers:
  nginx:
    Container ID:   docker://6dbe4067dc64c5ae23cbf65878982eaed500d4baa55eebad3c6a3f0da81e0bed
    Image:          nginx:alpine
    Image ID:       docker-pullable://nginx@sha256:2d194184b067db3598771b4cf326cfe6ad5051937ba1132b8b7d4b0184e0d0a6
    Port:           <none>
    Host Port:      <none>
    State:          Running
      Started:      Wed, 28 Jun 2022 14:19:16 +0000
    Ready:          True
    Restart Count:  0
    Limits:
      cpu:     20m
      memory:  200Mi
    Requests:
      cpu:        10m
      memory:     100Mi
    Environment:  <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-xh2rj (ro)
Conditions:
  Type              Status
  Initialized       True
  Ready             True
  ContainersReady   True
  PodScheduled      True
Volumes:
  kube-api-access-xh2rj:
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
  Normal  Scheduled  26s   default-scheduler  Successfully assigned default/nginx-pod-resources to mac-worker
  Normal  Pulled     24s   kubelet            Container image "nginx:alpine" already present on machine
  Normal  Created    24s   kubelet            Created container nginx
  Normal  Started    24s   kubelet            Started container nginx
```

> Kubernetes 根据 Pod 的资源需求，尽量把 Node 塞满，充分利用每个 Node 的资源，让集群的`效益最大化`

![k8s-resources](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/k8s-resources.gif)

> 如果不指定 `resources`，Kubernetes 会将 Pod 调度到`任意 Node`，Pod 后续运行可以`无限制`地使用 CPU 和 内存

> 当资源无法满足时，Pod `无法被调度`，处于 `Pending` 状态

```
$ k apply -f nginx-pod-resources.yaml
pod/nginx-pod-resources created

$ k get po -owide
NAME                  READY   STATUS    RESTARTS   AGE   IP       NODE     NOMINATED NODE   READINESS GATES
nginx-pod-resources   0/1     Pending   0          17s   <none>   <none>   <none>           <none>

$ k describe po nginx-pod-resources
Name:         nginx-pod-resources
Namespace:    default
Priority:     0
Node:         <none>
Labels:       <none>
Annotations:  <none>
Status:       Pending
IP:
IPs:          <none>
Containers:
  nginx:
    Image:      nginx:alpine
    Port:       <none>
    Host Port:  <none>
    Limits:
      cpu:     20
      memory:  200Mi
    Requests:
      cpu:        10
      memory:     100Mi
    Environment:  <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-j8clh (ro)
Conditions:
  Type           Status
  PodScheduled   False
Volumes:
  kube-api-access-j8clh:
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
  Warning  FailedScheduling  50s   default-scheduler  0/2 nodes are available: 1 Insufficient cpu, 1 node(s) had taint {node-role.kubernetes.io/master: }, that the pod didn't tolerate.
```

# Probe

> Startup -> Liveness -> Readiness

| Probe       | Desc               |
| ----------- | ------------------ |
| `Startup`   | 是否`启动成功`     |
| `Liveness`  | 是否`正常运行`     |
| `Readiness` | 是否可以`接收流量` |

![image-20230628223816480](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230628223816480.png)

> 检查机制

1. 如果 `Startup` 探针失败，Kubernetes 会认为容器没有正常启动，尝试`重启` 容器
   - 此时，`Liveness` 和 `Readiness` 探针不会启动
2. 如果 `Liveness` 探针失败，Kubernetes 会认为容器发生了异常，尝试`重启` 容器
3. 如果 `Readiness` 探针失败，Kubernetes 会认为容器虽然在运行，但不能正常提供服务
   - 将 Pod 从 `Service` 对象的`负载均衡`集合中排除，不会为其分配`流量`

> `startupProbe` 和 `livenessProbe` 探测`失败`后的动作由 `restartPolicy` 决定
> 默认为 `On-Failure`，即`重启容器`

![image-20230628224539925](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230628224539925.png)

> 探针字段

| Field                 | Desc                                                         |
| --------------------- | ------------------------------------------------------------ |
| `initialDelaySeconds` | 容器`启动`多久后才执行探测动作，默认为 `0 秒`                |
| `periodSeconds`       | 执行探测动作的`时间间隔`，默认为 `10 秒`                     |
| `timeoutSeconds`      | 探测动作的`超时时间`，如果超时则认为`探测失败`，默认为 `1 秒` |
| `successThreshold`    | `连续多少次探测成功`认为是`正常`的，`startupProbe` 和 `livenessProbe` 都是 `1` |
| `failureThreshold`    | `连续多少次探测失败`认为是`异常`的，默认是 `3`               |

> 探测方式

| Type       | Config      |
| ---------- | ----------- |
| Shell      | `exec`      |
| TCP Socket | `tcpSocket` |
| HTTP GET   | `httpGet`   |

```yaml nginx-probe-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-conf

data:
  default.conf: |
    server {
      listen 80;
      location = /ready {
        return 200 'I am ready';
      }
    }
```

```yaml nginx-pod-probe.yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod-probe

spec:
  volumes:
  - name: nginx-conf-vol
    configMap:
      name: nginx-conf
  containers:
  - name: nginx
    image: nginx:alpine
    ports:
    - containerPort: 80
    volumeMounts:
    - name: nginx-conf-vol
      mountPath: /etc/nginx/conf.d

    startupProbe:
      periodSeconds: 1
      exec:
        command: ['cat', '/var/run/nginx.pid']
    livenessProbe:
      periodSeconds: 10
      tcpSocket:
        port: 80
    readinessProbe:
      periodSeconds: 5
      httpGet:
        port: 80
        path: /ready
```

```
$ k apply -f nginx-probe-cm.yaml -f nginx-pod-probe.yaml
configmap/nginx-conf created
pod/nginx-pod-probe created

$ k get po -owide
NAME              READY   STATUS    RESTARTS   AGE   IP            NODE         NOMINATED NODE   READINESS GATES
nginx-pod-probe   1/1     Running   0          21s   10.10.1.108   mac-worker   <none>           <none>

$ k logs --tail=10 nginx-pod-probe
10.10.1.1 - - [28/Jun/2022:15:04:47 +0000] "GET /ready HTTP/1.1" 200 10 "-" "kube-probe/1.23" "-"
10.10.1.1 - - [28/Jun/2022:15:04:52 +0000] "GET /ready HTTP/1.1" 200 10 "-" "kube-probe/1.23" "-"
10.10.1.1 - - [28/Jun/2022:15:04:57 +0000] "GET /ready HTTP/1.1" 200 10 "-" "kube-probe/1.23" "-"
10.10.1.1 - - [28/Jun/2022:15:05:02 +0000] "GET /ready HTTP/1.1" 200 10 "-" "kube-probe/1.23" "-"
10.10.1.1 - - [28/Jun/2022:15:05:07 +0000] "GET /ready HTTP/1.1" 200 10 "-" "kube-probe/1.23" "-"
10.10.1.1 - - [28/Jun/2022:15:05:12 +0000] "GET /ready HTTP/1.1" 200 10 "-" "kube-probe/1.23" "-"
10.10.1.1 - - [28/Jun/2022:15:05:17 +0000] "GET /ready HTTP/1.1" 200 10 "-" "kube-probe/1.23" "-"
10.10.1.1 - - [28/Jun/2022:15:05:22 +0000] "GET /ready HTTP/1.1" 200 10 "-" "kube-probe/1.23" "-"
10.10.1.1 - - [28/Jun/2022:15:05:27 +0000] "GET /ready HTTP/1.1" 200 10 "-" "kube-probe/1.23" "-"
10.10.1.1 - - [28/Jun/2022:15:05:32 +0000] "GET /ready HTTP/1.1" 200 10 "-" "kube-probe/1.23" "-"

$ k describe po nginx-pod-probe
Name:         nginx-pod-probe
Namespace:    default
Priority:     0
Node:         mac-worker/192.168.191.146
Start Time:   Wed, 28 Jun 2022 15:04:17 +0000
Labels:       <none>
Annotations:  <none>
Status:       Running
IP:           10.10.1.108
IPs:
  IP:  10.10.1.108
Containers:
  nginx:
    Container ID:   docker://0e35e8da6b8285c150cab9c1d185c8af6036f2ef8b278a4e8c5b5624301820e9
    Image:          nginx:alpine
    Image ID:       docker-pullable://nginx@sha256:2d194184b067db3598771b4cf326cfe6ad5051937ba1132b8b7d4b0184e0d0a6
    Port:           80/TCP
    Host Port:      0/TCP
    State:          Running
      Started:      Wed, 28 Jun 2022 15:04:17 +0000
    Ready:          True
    Restart Count:  0
    Liveness:       tcp-socket :80 delay=0s timeout=1s period=10s #success=1 #failure=3
    Readiness:      http-get http://:80/ready delay=0s timeout=1s period=5s #success=1 #failure=3
    Startup:        exec [cat /var/run/nginx.pid] delay=0s timeout=1s period=1s #success=1 #failure=3
    Environment:    <none>
    Mounts:
      /etc/nginx/conf.d from nginx-conf-vol (rw)
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-q92rp (ro)
Conditions:
  Type              Status
  Initialized       True
  Ready             True
  ContainersReady   True
  PodScheduled      True
Volumes:
  nginx-conf-vol:
    Type:      ConfigMap (a volume populated by a ConfigMap)
    Name:      nginx-conf
    Optional:  false
  kube-api-access-q92rp:
    Type:                    Projected (a volume that contains injected data from multiple sources)
    TokenExpirationSeconds:  3607
    ConfigMapName:           kube-root-ca.crt
    ConfigMapOptional:       <nil>
    DownwardAPI:             true
QoS Class:                   BestEffort
Node-Selectors:              <none>
Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:
  Type    Reason     Age    From               Message
  ----    ------     ----   ----               -------
  Normal  Scheduled  4m35s  default-scheduler  Successfully assigned default/nginx-pod-probe to mac-worker
  Normal  Pulled     4m35s  kubelet            Container image "nginx:alpine" already present on machine
  Normal  Created    4m35s  kubelet            Created container nginx
  Normal  Started    4m35s  kubelet            Started container nginx
```

> 使用错误的 startupProbe

```
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod-probe

spec:
	...
  containers:
  - name: nginx
    image: nginx:alpine
		...
    startupProbe:
      periodSeconds: 1
      exec:
        command: ['cat', '/var/run/nginx.pidx']
		...
```

```
$ k apply -f nginx-probe-cm.yaml -f nginx-pod-probe.yaml
configmap/nginx-conf created
pod/nginx-pod-probe created

$ k get po -owide
NAME              READY   STATUS             RESTARTS      AGE   IP            NODE         NOMINATED NODE   READINESS GATES
nginx-pod-probe   0/1     CrashLoopBackOff   2 (16s ago)   28s   10.10.1.109   mac-worker   <none>           <none>

$ k describe po nginx-pod-probe
Name:         nginx-pod-probe
Namespace:    default
Priority:     0
Node:         mac-worker/192.168.191.146
Start Time:   Wed, 28 Jun 2022 15:12:27 +0000
Labels:       <none>
Annotations:  <none>
Status:       Running
IP:           10.10.1.109
IPs:
  IP:  10.10.1.109
Containers:
  nginx:
    Container ID:   docker://fcd440ac3a08810df51f12e2ddb0bad4a40922bdb3f9a6d94009c2404dcc7a13
    Image:          nginx:alpine
    Image ID:       docker-pullable://nginx@sha256:2d194184b067db3598771b4cf326cfe6ad5051937ba1132b8b7d4b0184e0d0a6
    Port:           80/TCP
    Host Port:      0/TCP
    State:          Waiting
      Reason:       CrashLoopBackOff
    Last State:     Terminated
      Reason:       Completed
      Exit Code:    0
      Started:      Wed, 28 Jun 2022 15:13:56 +0000
      Finished:     Wed, 28 Jun 2022 15:14:00 +0000
    Ready:          False
    Restart Count:  5
    Liveness:       tcp-socket :80 delay=0s timeout=1s period=10s #success=1 #failure=3
    Readiness:      http-get http://:80/ready delay=0s timeout=1s period=5s #success=1 #failure=3
    Startup:        exec [cat /var/run/nginx.pidx] delay=0s timeout=1s period=1s #success=1 #failure=3
    Environment:    <none>
    Mounts:
      /etc/nginx/conf.d from nginx-conf-vol (rw)
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-n957g (ro)
Conditions:
  Type              Status
  Initialized       True
  Ready             False
  ContainersReady   False
  PodScheduled      True
Volumes:
  nginx-conf-vol:
    Type:      ConfigMap (a volume populated by a ConfigMap)
    Name:      nginx-conf
    Optional:  false
  kube-api-access-n957g:
    Type:                    Projected (a volume that contains injected data from multiple sources)
    TokenExpirationSeconds:  3607
    ConfigMapName:           kube-root-ca.crt
    ConfigMapOptional:       <nil>
    DownwardAPI:             true
QoS Class:                   BestEffort
Node-Selectors:              <none>
Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:
  Type     Reason     Age                From               Message
  ----     ------     ----               ----               -------
  Normal   Scheduled  99s                default-scheduler  Successfully assigned default/nginx-pod-probe to mac-worker
  Normal   Pulled     92s (x3 over 99s)  kubelet            Container image "nginx:alpine" already present on machine
  Normal   Created    92s (x3 over 99s)  kubelet            Created container nginx
  Normal   Started    92s (x3 over 99s)  kubelet            Started container nginx
  Warning  Unhealthy  89s (x9 over 99s)  kubelet            Startup probe failed: cat: can't open '/var/run/nginx.pidx': No such file or directory
  Normal   Killing    88s (x3 over 96s)  kubelet            Container nginx failed startup probe, will be restarted
  Warning  BackOff    80s (x4 over 88s)  kubelet            Back-off restarting failed container
```
