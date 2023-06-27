---
title: Kubernetes - StatefulSet
mathjax: false
date: 2022-11-01 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/0a05a-1pwhryw1i1mrrawguzkinwq.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Kubernetes
---

# Stateful

1. `任何应用`都是`有状态`的
   - `无状态应用`：应用的状态信息`不重要`，即便不恢复也能正常运行，如 `Nginx`
   - `有状态应用`：应用的状态信息很重要，如 `Redis`、`MySQL` 等，其状态即在内存、磁盘上产生的数据
2. Kubernetes 认为`状态`不仅仅是`数据持久化`，还包括多实例的`启动顺序`、`依赖关系`和`网络标识`等
   - `Stateless - Deployment`：多个实例之间无关，启动顺序不固定，Pod 的名称、IP 地址也是完全随机
   - `Stateful - StatefulSet`：多个实例之间存在`依赖`关系

<!-- more -->

# 使用

```
$ k api-resources --api-group='apps'
NAME                  SHORTNAMES   APIVERSION   NAMESPACED   KIND
controllerrevisions                apps/v1      true         ControllerRevision
daemonsets            ds           apps/v1      true         DaemonSet
deployments           deploy       apps/v1      true         Deployment
replicasets           rs           apps/v1      true         ReplicaSet
statefulsets          sts          apps/v1      true         StatefulSet
```

## YAML

```yaml redis-sts.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-sts

spec:
  serviceName: redis-svc
  replicas: 2
  selector:
    matchLabels:
      app: redis-sts
  template:
    metadata:
      labels:
        app: redis-sts
    spec:
      containers:
      - name: redis
        image: redis:5-alpine
        ports:
        - containerPort: 6379
```

## 启动顺序

> StatefulSet 管理的 Pod 有`编号`，按照顺序依次启动

```
$ k apply -f redis-sts.yaml
statefulset.apps/redis-sts created

$ k get sts -owide
NAME        READY   AGE   CONTAINERS   IMAGES
redis-sts   2/2     73s   redis        redis:5-alpine

$ k get po -owide
NAME          READY   STATUS    RESTARTS   AGE   IP           NODE         NOMINATED NODE   READINESS GATES
redis-sts-0   1/1     Running   0          30s   10.10.1.62   mac-worker   <none>           <none>
redis-sts-1   1/1     Running   0          29s   10.10.1.63   mac-worker   <none>           <none>
```

## 依赖关系

> 使用 `hostname` 来进行`身份标识`，进而确定相互之间的`依赖关系`（应用自行决定）

```
$ k exec -it redis-sts-0 -- sh
/data # echo $HOSTNAME
redis-sts-0
/data # hostname
redis-sts-0
/data # exit
```

## 网络标识

> 借助 `Service` 实现`网络标识`
> StatefulSet 用不到 Service 的`负载均衡`功能，可以使用 `Headless Service`（减少资源占用）

> `Service` 的 `metadata.name` 必须要和 `StatefulSet` 的 `spec.serviceName` 相同，`selector` 也需要一致

```yaml redis-sts-svc.yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-svc

spec:
  selector:
    app: redis-sts
  ports:
  - port: 6379
    protocol: TCP
    targetPort: 6379
```

```
$ k apply -f redis-sts-svc.yaml
service/redis-svc created

$ k get svc -owide
NAME         TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE   SELECTOR
kubernetes   ClusterIP   10.96.0.1        <none>        443/TCP    10d   <none>
redis-svc    ClusterIP   10.105.163.175   <none>        6379/TCP   18s   app=redis-sts

$ k get po -owide
NAME          READY   STATUS    RESTARTS   AGE   IP           NODE         NOMINATED NODE   READINESS GATES
redis-sts-0   1/1     Running   0          15m   10.10.1.62   mac-worker   <none>           <none>
redis-sts-1   1/1     Running   0          15m   10.10.1.63   mac-worker   <none>           <none>

$ k describe svc redis-svc
Name:              redis-svc
Namespace:         default
Labels:            <none>
Annotations:       <none>
Selector:          app=redis-sts
Type:              ClusterIP
IP Family Policy:  SingleStack
IP Families:       IPv4
IP:                10.105.163.175
IPs:               10.105.163.175
Port:              <unset>  6379/TCP
TargetPort:        6379/TCP
Endpoints:         10.10.1.62:6379,10.10.1.63:6379
Session Affinity:  None
Events:            <none>
```

> 使用 StatefulSet 对应的 Service 域名：`<pod-name>.<service-name>.<namespace>`

```
$ k exec -it redis-sts-0 -- sh
/data # ping redis-sts-0.redis-svc.default -c1
PING redis-sts-0.redis-svc.default (10.10.1.62): 56 data bytes
64 bytes from 10.10.1.62: seq=0 ttl=64 time=0.041 ms

--- redis-sts-0.redis-svc.default ping statistics ---
1 packets transmitted, 1 packets received, 0% packet loss
round-trip min/avg/max = 0.041/0.041/0.041 ms
/data #
/data # ping redis-sts-0.redis-svc -c1
PING redis-sts-0.redis-svc (10.10.1.62): 56 data bytes
64 bytes from 10.10.1.62: seq=0 ttl=64 time=0.030 ms

--- redis-sts-0.redis-svc ping statistics ---
1 packets transmitted, 1 packets received, 0% packet loss
round-trip min/avg/max = 0.030/0.030/0.030 ms
/data #
/data #
/data # ping redis-sts-1.redis-svc -c1
PING redis-sts-1.redis-svc (10.10.1.63): 56 data bytes
64 bytes from 10.10.1.63: seq=0 ttl=64 time=0.102 ms

--- redis-sts-1.redis-svc ping statistics ---
1 packets transmitted, 1 packets received, 0% packet loss
round-trip min/avg/max = 0.102/0.102/0.102 ms
/data #
/data # exit
```

> 基于 `Service` 维护的`网络标识`是`稳定不变`的

> redis-sts-1 先被重启

```
$ k rollout restart statefulset redis-sts
statefulset.apps/redis-sts restarted

$ k get po -owide
NAME          READY   STATUS    RESTARTS   AGE   IP           NODE         NOMINATED NODE   READINESS GATES
redis-sts-0   1/1     Running   0          27s   10.10.1.65   mac-worker   <none>           <none>
redis-sts-1   1/1     Running   0          29s   10.10.1.64   mac-worker   <none>           <none>

$ k describe svc redis-svc
Name:              redis-svc
Namespace:         default
Labels:            <none>
Annotations:       <none>
Selector:          app=redis-sts
Type:              ClusterIP
IP Family Policy:  SingleStack
IP Families:       IPv4
IP:                10.105.163.175
IPs:               10.105.163.175
Port:              <unset>  6379/TCP
TargetPort:        6379/TCP
Endpoints:         10.10.1.64:6379,10.10.1.65:6379
Session Affinity:  None
Events:            <none>

$ k exec -it redis-sts-0 -- sh
/data # ping redis-sts-0.redis-svc.default -c1
PING redis-sts-0.redis-svc.default (10.10.1.65): 56 data bytes
64 bytes from 10.10.1.65: seq=0 ttl=64 time=0.161 ms

--- redis-sts-0.redis-svc.default ping statistics ---
1 packets transmitted, 1 packets received, 0% packet loss
round-trip min/avg/max = 0.161/0.161/0.161 ms
/data #
/data # ping redis-sts-1.redis-svc -c1
PING redis-sts-1.redis-svc (10.10.1.64): 56 data bytes
64 bytes from 10.10.1.64: seq=0 ttl=64 time=0.785 ms

--- redis-sts-1.redis-svc ping statistics ---
1 packets transmitted, 1 packets received, 0% packet loss
round-trip min/avg/max = 0.785/0.785/0.785 ms
/data #
/data # exit
```

![image-20230627234235517](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230627234235517.png)

## 持久化

```
$ k get sc -owide
NAME         PROVISIONER                                   RECLAIMPOLICY   VOLUMEBINDINGMODE   ALLOWVOLUMEEXPANSION   AGE
nfs-client   k8s-sigs.io/nfs-subdir-external-provisioner   Delete          Immediate           false                  22h
```

> `volumeClaimTemplates` 将 PVC 的定义嵌入到 StatefulSet 中，使得创建 StatefulSet Pod 的同时，`自动创建 PVC`

```yaml redis-pv-sts.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-pv-sts

spec:
  serviceName: redis-pv-sts-svc

  volumeClaimTemplates:
  - metadata:
      name: redis-100m-pvc
    spec:
      storageClassName: nfs-client
      accessModes:
      - ReadWriteMany
      resources:
        requests:
          storage: 100Mi

  replicas: 2
  selector:
    matchLabels:
      app: redis-pv-sts
  template:
    metadata:
      labels:
        app: redis-pv-sts
    spec:
      containers:
      - name: redis
        image: redis:5-alpine
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: redis-100m-pvc
          mountPath: /data
```

```
$ k apply -f redis-pv-sts.yaml
statefulset.apps/redis-pv-sts created

$ k get pvc -owide
NAME                            STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE     VOLUMEMODE
redis-100m-pvc-redis-pv-sts-0   Bound    pvc-bd1c0f8e-bda2-49e0-9c46-1057761af2ed   100Mi      RWX            nfs-client     3m53s   Filesystem
redis-100m-pvc-redis-pv-sts-1   Bound    pvc-e55b18f1-87e7-41d9-bc77-4e922373511e   100Mi      RWX            nfs-client     3m50s   Filesystem

$ k get pv -owide
NAME                                       CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                                   STORAGECLASS   REASON   AGE     VOLUMEMODE
pvc-bd1c0f8e-bda2-49e0-9c46-1057761af2ed   100Mi      RWX            Delete           Bound    default/redis-100m-pvc-redis-pv-sts-0   nfs-client              4m20s   Filesystem
pvc-e55b18f1-87e7-41d9-bc77-4e922373511e   100Mi      RWX            Delete           Bound    default/redis-100m-pvc-redis-pv-sts-1   nfs-client              4m17s   Filesystem

$ k get po -owide
NAME             READY   STATUS    RESTARTS   AGE   IP           NODE         NOMINATED NODE   READINESS GATES
redis-pv-sts-0   1/1     Running   0          87s   10.10.1.70   mac-worker   <none>           <none>
redis-pv-sts-1   1/1     Running   0          86s   10.10.1.71   mac-worker   <none>           <none>

$ k describe po redis-pv-sts-0
Name:         redis-pv-sts-0
Namespace:    default
Priority:     0
Node:         mac-worker/192.168.191.146
Start Time:   Tue, 27 Jun 2022 16:00:06 +0000
Labels:       app=redis-pv-sts
              controller-revision-hash=redis-pv-sts-97766b5f9
              statefulset.kubernetes.io/pod-name=redis-pv-sts-0
Annotations:  <none>
Status:       Running
IP:           10.10.1.70
IPs:
  IP:           10.10.1.70
Controlled By:  StatefulSet/redis-pv-sts
Containers:
  redis:
    Container ID:   docker://c47a95d01acece95670508721e6a6ac67d9a063f6ed6606b45aac4c328561618
    Image:          redis:5-alpine
    Image ID:       docker-pullable://redis@sha256:1a3c609295332f1ce603948142a132656c92a08149d7096e203058533c415b8c
    Port:           6379/TCP
    Host Port:      0/TCP
    State:          Running
      Started:      Tue, 27 Jun 2022 16:00:07 +0000
    Ready:          True
    Restart Count:  0
    Environment:    <none>
    Mounts:
      /data from redis-100m-pvc (rw)
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-wfh6b (ro)
Conditions:
  Type              Status
  Initialized       True
  Ready             True
  ContainersReady   True
  PodScheduled      True
Volumes:
  redis-100m-pvc:
    Type:       PersistentVolumeClaim (a reference to a PersistentVolumeClaim in the same namespace)
    ClaimName:  redis-100m-pvc-redis-pv-sts-0
    ReadOnly:   false
  kube-api-access-wfh6b:
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
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  118s  default-scheduler  Successfully assigned default/redis-pv-sts-0 to mac-worker
  Normal  Pulled     118s  kubelet            Container image "redis:5-alpine" already present on machine
  Normal  Created    118s  kubelet            Created container redis
  Normal  Started    118s  kubelet            Started container redis
  
$ k exec -it redis-pv-sts-0 -- ls -ld /data
drwxrwxrwx    2 redis    root          4096 Jun 27 15:57 /data
```

> StatefulSet 并没有用到 Service 的`负载均衡`功能，所以 Kubernetes 不必为其分配 IP，也被称为 `Headless Service`

```yaml redis-pv-sts-svc.yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-pv-sts-svc

spec:
  clusterIP: None
  selector:
    app: redis-pv-sts
  ports:
  - port: 6379
    protocol: TCP
    targetPort: 6379
```

```
$ k apply -f redis-pv-sts-svc.yaml
service/redis-pv-sts-svc created

$ k get svc -owide
NAME               TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)    AGE     SELECTOR
kubernetes         ClusterIP   10.96.0.1    <none>        443/TCP    10d     <none>
redis-pv-sts-svc   ClusterIP   None         <none>        6379/TCP   2m13s   app=redis-pv-sts

$ k get po -owide
NAME             READY   STATUS    RESTARTS   AGE   IP           NODE         NOMINATED NODE   READINESS GATES
redis-pv-sts-0   1/1     Running   0          15m   10.10.1.70   mac-worker   <none>           <none>
redis-pv-sts-1   1/1     Running   0          15m   10.10.1.71   mac-worker   <none>           <none>

$ k describe svc redis-pv-sts-svc
Name:              redis-pv-sts-svc
Namespace:         default
Labels:            <none>
Annotations:       <none>
Selector:          app=redis-pv-sts
Type:              ClusterIP
IP Family Policy:  SingleStack
IP Families:       IPv4
IP:                None
IPs:               None
Port:              <unset>  6379/TCP
TargetPort:        6379/TCP
Endpoints:         10.10.1.70:6379,10.10.1.71:6379
Session Affinity:  None
Events:            <none>

$ k exec -it redis-pv-sts-0 -- sh
/data # ping redis-pv-sts-0.redis-pv-sts-svc -c1
PING redis-pv-sts-0.redis-pv-sts-svc (10.10.1.70): 56 data bytes
64 bytes from 10.10.1.70: seq=0 ttl=64 time=0.068 ms

--- redis-pv-sts-0.redis-pv-sts-svc ping statistics ---
1 packets transmitted, 1 packets received, 0% packet loss
round-trip min/avg/max = 0.068/0.068/0.068 ms
/data #
/data # ping redis-pv-sts-1.redis-pv-sts-svc -c1
PING redis-pv-sts-1.redis-pv-sts-svc (10.10.1.71): 56 data bytes
64 bytes from 10.10.1.71: seq=0 ttl=64 time=0.076 ms

--- redis-pv-sts-1.redis-pv-sts-svc ping statistics ---
1 packets transmitted, 1 packets received, 0% packet loss
round-trip min/avg/max = 0.076/0.076/0.076 ms
/data #
/data # exit
```

> 数据持久化（Redis 会定期把数据落盘到 /data 目录）

```
$ k exec -it redis-pv-sts-0 -- redis-cli
127.0.0.1:6379> set name zhongmingmao
OK
127.0.0.1:6379> keys *
1) "name"
127.0.0.1:6379>
127.0.0.1:6379> quit

$ k delete po redis-pv-sts-0
pod "redis-pv-sts-0" deleted

$ k get po -owide
NAME             READY   STATUS    RESTARTS   AGE   IP           NODE         NOMINATED NODE   READINESS GATES
redis-pv-sts-0   1/1     Running   0          5s    10.10.1.72   mac-worker   <none>           <none>
redis-pv-sts-1   1/1     Running   0          20m   10.10.1.71   mac-worker   <none>           <none>

$ k describe po redis-pv-sts-0
Name:         redis-pv-sts-0
Namespace:    default
Priority:     0
Node:         mac-worker/192.168.191.146
Start Time:   Tue, 27 Jun 2022 16:20:30 +0000
Labels:       app=redis-pv-sts
              controller-revision-hash=redis-pv-sts-97766b5f9
              statefulset.kubernetes.io/pod-name=redis-pv-sts-0
Annotations:  <none>
Status:       Running
IP:           10.10.1.72
IPs:
  IP:           10.10.1.72
Controlled By:  StatefulSet/redis-pv-sts
Containers:
  redis:
    Container ID:   docker://c3fcbc8c53e64ef1e7c9ee02cbeba8a1e582718b548c4babc4e27716e63a372e
    Image:          redis:5-alpine
    Image ID:       docker-pullable://redis@sha256:1a3c609295332f1ce603948142a132656c92a08149d7096e203058533c415b8c
    Port:           6379/TCP
    Host Port:      0/TCP
    State:          Running
      Started:      Tue, 27 Jun 2022 16:20:31 +0000
    Ready:          True
    Restart Count:  0
    Environment:    <none>
    Mounts:
      /data from redis-100m-pvc (rw)
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-8vkg5 (ro)
Conditions:
  Type              Status
  Initialized       True
  Ready             True
  ContainersReady   True
  PodScheduled      True
Volumes:
  redis-100m-pvc:
    Type:       PersistentVolumeClaim (a reference to a PersistentVolumeClaim in the same namespace)
    ClaimName:  redis-100m-pvc-redis-pv-sts-0
    ReadOnly:   false
  kube-api-access-8vkg5:
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
  Normal  Scheduled  2m27s  default-scheduler  Successfully assigned default/redis-pv-sts-0 to mac-worker
  Normal  Pulled     2m27s  kubelet            Container image "redis:5-alpine" already present on machine
  Normal  Created    2m27s  kubelet            Created container redis
  Normal  Started    2m27s  kubelet            Started container redis

$ k exec -it redis-pv-sts-0 -- redis-cli
127.0.0.1:6379> get name
"zhongmingmao"
127.0.0.1:6379> keys *
1) "name"
127.0.0.1:6379> quit
```

![image-20230627235842806](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230627235842806.png)

> Stateful App 非常难以管理，在 `StatefulSet` 后又推出了 `Operator`
