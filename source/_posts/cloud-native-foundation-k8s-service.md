---
title: Kubernetes - Service
mathjax: false
date: 2022-10-27 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/58-image-2.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Kubernetes
---

# 概述

1. Service 是`集群内部`的`负载均衡`机制，用于解决`服务发现`的关键问题
2. 工作原理
   - Kubernetes 为 Service 分配一个`静态 IP`，由 Service 自动管理和维护`动态变化`的 Pod 集合
   - 当客户端访问 Service 时，Service 会根据某种`策略`，将流量`转发`到某个 Pod
   - Service 使用了 `iptables`
     - 每个 `Node` 上的 `kube-proxy` 自动维护 `iptables 规则`
     - 负载均衡：Service 会根据 iptables 规则转发请求给它管理的多个 Pod
     - Service 也可以使用其它技术实现负载均衡
       - `性能更差`的 `userspace`
       - `性能更好`的 `ipvs`

<!-- more -->

![image-20230622101822932](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230622101822932.png)

# YAML

> Service 为 Kubernetes 的`核心对象`，不关联业务应用

```
$ k api-resources --api-group=""
NAME                     SHORTNAMES   APIVERSION   NAMESPACED   KIND
bindings                              v1           true         Binding
componentstatuses        cs           v1           false        ComponentStatus
configmaps               cm           v1           true         ConfigMap
endpoints                ep           v1           true         Endpoints
events                   ev           v1           true         Event
limitranges              limits       v1           true         LimitRange
namespaces               ns           v1           false        Namespace
nodes                    no           v1           false        Node
persistentvolumeclaims   pvc          v1           true         PersistentVolumeClaim
persistentvolumes        pv           v1           false        PersistentVolume
pods                     po           v1           true         Pod
podtemplates                          v1           true         PodTemplate
replicationcontrollers   rc           v1           true         ReplicationController
resourcequotas           quota        v1           true         ResourceQuota
secrets                               v1           true         Secret
serviceaccounts          sa           v1           true         ServiceAccount
services                 svc          v1           true         Service
```

> kubectl `expose` 支持从`多种对象`创建 Service，包括 `Pod`、`Deployment` 和 `DaemonSet`

| Options         | Desc                                                         |
| --------------- | ------------------------------------------------------------ |
| `--port`        | The port that the `service` should serve on                  |
| `--target-port` | Name or number for the port on the `container` that the service should direct traffic to |

```
$ k expose deployment nginx-deploy --port=80 --target-port=80 --dry-run=client -oyaml
apiVersion: v1
kind: Service
metadata:
  creationTimestamp: null
  labels:
    app: nginx-deploy
  name: nginx-deploy
spec:
  ports:
  - port: 80
    protocol: TCP
    targetPort: 80
  selector:
    app: nginx-deploy
status:
  loadBalancer: {}
```

> Service 的 spec 只有两个关键字段：`selector` + `ports`

| Field      | Desc                                                         |
| ---------- | ------------------------------------------------------------ |
| `selector` | Route service traffic to `pods` with label keys and values matching this selector |
| `ports`    | `port` 为`外部`端口，`targetPort` 为`内部`端口               |

![image-20230622104349946](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230622104349946.png)

# 使用

## IP

> 使用 `ConfigMap` 存储 Nginx 配置

```yaml nginx-conf.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-conf

data:
  default.conf: |
    server {
      listen 80;
      location / {
        default_type text/plain;
        return 200
          'srv : $server_addr:$server_port\nhost: $hostname\nuri : $request_method $host $request_uri\ndate: $time_iso8601\n';
      }
    }
```

```
$ k apply -f nginx-conf.yaml
configmap/nginx-conf created
```

> 通过 `Volume` 将 ConfigMap 挂载到到容器

```yaml nginx-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment

spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx-deployment
  template:
    metadata:
      labels:
        app: nginx-deployment
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
        - mountPath: /etc/nginx/conf.d
          name: nginx-conf-vol
```

```
$ k apply -f nginx-deployment.yaml
deployment.apps/nginx-deployment created

$ k get po -owide
NAME                                READY   STATUS    RESTARTS   AGE   IP           NODE         NOMINATED NODE   READINESS GATES
nginx-deployment-756d6b7586-7plkf   1/1     Running   0          47s   10.10.1.42   mac-worker   <none>           <none>
nginx-deployment-756d6b7586-jwt5h   1/1     Running   0          47s   10.10.1.43   mac-worker   <none>           <none>

$ curl 10.10.1.42
srv : 10.10.1.42:80
host: nginx-deployment-756d6b7586-7plkf
uri : GET 10.10.1.42 /
date: 2022-06-24T06:22:10+00:00

$ curl 10.10.1.43
srv : 10.10.1.43:80
host: nginx-deployment-756d6b7586-jwt5h
uri : GET 10.10.1.43 /
date: 2022-06-24T06:22:17+00:00
```

> 创建 Service，同样通过 `selector` 选择要代理的 Pod，与 Deployment 和 DaemonSet 类似，`松耦合`关系

```
$ k expose deployment nginx-deployment --dry-run=client -oyaml
apiVersion: v1
kind: Service
metadata:
  creationTimestamp: null
  name: nginx-deployment
spec:
  ports:
  - port: 80
    protocol: TCP
    targetPort: 80
  selector:
    app: nginx-deployment
status:
  loadBalancer: {}
```

```yaml nginx-svc.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-svc

spec:
  ports:
  - port: 80
    protocol: TCP
    targetPort: 80
  selector:
    app: nginx-deployment
```

> Kubernetes 为 Service 自动分配了一个`静态 IP` 地址 `10.101.182.177`（独立于 `Pod` 地址段）

> Service 的 IP 是一个`虚地址`，不存在实体，只能用来`转发流量`（无法 `ping`）

```
$ k get svc
NAME         TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)   AGE
kubernetes   ClusterIP   10.96.0.1        <none>        443/TCP   6d21h
nginx-svc    ClusterIP   10.101.182.177   <none>        80/TCP    65s
```

> Service 管理了 `Endpoint` 对象（Endpoint 对象代表 `IP 地址`，Service 并不会直接管理 Pod）

```
$ k describe service nginx-svc
Name:              nginx-svc
Namespace:         default
Labels:            <none>
Annotations:       <none>
Selector:          app=nginx-deployment
Type:              ClusterIP
IP Family Policy:  SingleStack
IP Families:       IPv4
IP:                10.101.182.177
IPs:               10.101.182.177
Port:              <unset>  80/TCP
TargetPort:        80/TCP
Endpoints:         10.10.1.42:80,10.10.1.43:80
Session Affinity:  None
Events:            <none>

$ k get endpoints -owide
NAME         ENDPOINTS                     AGE
kubernetes   192.168.191.144:6443          6d21h
nginx-svc    10.10.1.42:80,10.10.1.43:80   9m32s

$ k describe endpoints nginx-svc
Name:         nginx-svc
Namespace:    default
Labels:       <none>
Annotations:  endpoints.kubernetes.io/last-change-trigger-time: 2022-06-24T06:34:32Z
Subsets:
  Addresses:          10.10.1.42,10.10.1.43
  NotReadyAddresses:  <none>
  Ports:
    Name     Port  Protocol
    ----     ----  --------
    <unset>  80    TCP

Events:  <none>

$ k get po -owide
NAME                                READY   STATUS    RESTARTS   AGE   IP           NODE         NOMINATED NODE   READINESS GATES
nginx-deployment-756d6b7586-7plkf   1/1     Running   0          22m   10.10.1.42   mac-worker   <none>           <none>
nginx-deployment-756d6b7586-jwt5h   1/1     Running   0          22m   10.10.1.43   mac-worker   <none>           <none>
```

> `服务发现` + `负载均衡`

```
$ k get po
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-756d6b7586-7plkf   1/1     Running   0          30m
nginx-deployment-756d6b7586-jwt5h   1/1     Running   0          30m

$ k exec nginx-deployment-756d6b7586-7plkf -- curl -s 10.101.182.177
srv : 10.10.1.43:80
host: nginx-deployment-756d6b7586-jwt5h
uri : GET 10.101.182.177 /
date: 2022-06-24T06:49:32+00:00

$ k exec nginx-deployment-756d6b7586-7plkf -- curl -s 10.101.182.177
srv : 10.10.1.42:80
host: nginx-deployment-756d6b7586-7plkf
uri : GET 10.101.182.177 /
date: 2022-06-24T06:49:36+00:00
```

```
$ k delete po nginx-deployment-756d6b7586-jwt5h
pod "nginx-deployment-756d6b7586-jwt5h" deleted

$ k get po -owide
NAME                                READY   STATUS    RESTARTS   AGE   IP           NODE         NOMINATED NODE   READINESS GATES
nginx-deployment-756d6b7586-44j7q   1/1     Running   0          29s   10.10.1.44   mac-worker   <none>           <none>
nginx-deployment-756d6b7586-7plkf   1/1     Running   0          31m   10.10.1.42   mac-worker   <none>           <none>

$ k describe service nginx-svc
Name:              nginx-svc
Namespace:         default
Labels:            <none>
Annotations:       <none>
Selector:          app=nginx-deployment
Type:              ClusterIP
IP Family Policy:  SingleStack
IP Families:       IPv4
IP:                10.101.182.177
IPs:               10.101.182.177
Port:              <unset>  80/TCP
TargetPort:        80/TCP
Endpoints:         10.10.1.42:80,10.10.1.44:80
Session Affinity:  None
Events:            <none>

$ k exec nginx-deployment-756d6b7586-7plkf -- curl -s 10.101.182.177
srv : 10.10.1.42:80
host: nginx-deployment-756d6b7586-7plkf
uri : GET 10.101.182.177 /
date: 2022-06-24T06:53:59+00:00

$ k exec nginx-deployment-756d6b7586-7plkf -- curl -s 10.101.182.177
srv : 10.10.1.44:80
host: nginx-deployment-756d6b7586-44j7q
uri : GET 10.101.182.177 /
date: 2022-06-24T06:54:03+00:00

$ k exec nginx-deployment-756d6b7586-7plkf -- ping -c1 10.101.182.177
PING 10.101.182.177 (10.101.182.177): 56 data bytes

--- 10.101.182.177 ping statistics ---
1 packets transmitted, 0 packets received, 100% packet loss
command terminated with exit code 1
```

## DNS

> Service 对象的 IP 地址是`静态`的，Kubernetes 的 `DNS 插件`可以为 `Service` 创建 `DNS 域名`

> Namespace 用来在集群中实现对 `API 对象`的`隔离`，Kubernetes 会将 Namespace 作为 DNS 域名的一部分

```
$ k get ns
NAME              STATUS   AGE
default           Active   6d22h
kube-flannel      Active   6d21h
kube-node-lease   Active   6d22h
kube-public       Active   6d22h
kube-system       Active   6d22h
```

> `<service-name>.<namespace>.svc.cluster.local:<service-port>`

```
$ k exec nginx-deployment-756d6b7586-7plkf -- curl -s nginx-svc.default
srv : 10.10.1.42:80
host: nginx-deployment-756d6b7586-7plkf
uri : GET nginx-svc.default /
date: 2022-06-24T07:10:29+00:00

$ k exec nginx-deployment-756d6b7586-7plkf -- curl -s nginx-svc
srv : 10.10.1.44:80
host: nginx-deployment-756d6b7586-44j7q
uri : GET nginx-svc /
date: 2022-06-24T07:10:31+00:00
```

## NodePort

```
$ k get svc nginx-svc -oyaml
apiVersion: v1
kind: Service
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"v1","kind":"Service","metadata":{"annotations":{},"name":"nginx-svc","namespace":"default"},"spec":{"ports":[{"port":80,"protocol":"TCP","targetPort":80}],"selector":{"app":"nginx-deployment"}}}
  creationTimestamp: "2022-06-24T06:34:32Z"
  name: nginx-svc
  namespace: default
  resourceVersion: "23596"
  uid: 6bc27710-1041-4486-9d06-1f3fec601ce0
spec:
  clusterIP: 10.101.182.177
  clusterIPs:
  - 10.101.182.177
  internalTrafficPolicy: Cluster
  ipFamilies:
  - IPv4
  ipFamilyPolicy: SingleStack
  ports:
  - port: 80
    protocol: TCP
    targetPort: 80
  selector:
    app: nginx-deployment
  sessionAffinity: None
  type: ClusterIP
status:
  loadBalancer: {}
```

> `LoadBalancer` 和 `ExternalName` 一般由云服务商提供

1. `ClusterIP`
   - "ClusterIP" allocates a `cluster-internal IP address` for `load-balancing` to `endpoints`.
   - Endpoints are determined by the `selector` or if that is not specified, by manual construction of an Endpoints object or EndpointSlice objects.
   - If clusterIP is "None", no `virtual IP` is allocated and the endpoints are published as a set of endpoints rather than a virtual IP.
2. `NodePort`
   - "NodePort" `builds on ClusterIP` and allocates `a port on every node` which `routes to the same endpoints` as the clusterIP.
3. `LoadBalancer`
   - "LoadBalancer" `builds on NodePort` and creates an `external load-balancer` (if supported in the current `cloud`) which routes to the same endpoints as the clusterIP.
4. `ExternalName`
   - "ExternalName" aliases this service to the specified externalName.

> `NodePort` - 除了对 `Pod` 做`负载均衡`之外，还会在集群的`每个 Node` 上创建一个独立的端口来对外提供服务

```
$ k expose deployment nginx-deployment --type=NodePort --dry-run=client -oyaml
apiVersion: v1
kind: Service
metadata:
  creationTimestamp: null
  name: nginx-deployment
spec:
  ports:
  - port: 80
    protocol: TCP
    targetPort: 80
  selector:
    app: nginx-deployment
  type: NodePort
status:
  loadBalancer: {}
```

```yaml nginx-svc.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-svc

spec:
  ports:
  - port: 80
    protocol: TCP
    targetPort: 80
  selector:
    app: nginx-deployment
  type: NodePort
```

```
$ k apply -f nginx-svc.yaml
service/nginx-svc configured

$ k get svc nginx-svc -owide
NAME        TYPE       CLUSTER-IP       EXTERNAL-IP   PORT(S)        AGE   SELECTOR
nginx-svc   NodePort   10.101.182.177   <none>        80:30862/TCP   57m   app=nginx-deployment

$ k describe service nginx-svc
Name:                     nginx-svc
Namespace:                default
Labels:                   <none>
Annotations:              <none>
Selector:                 app=nginx-deployment
Type:                     NodePort
IP Family Policy:         SingleStack
IP Families:              IPv4
IP:                       10.101.182.177
IPs:                      10.101.182.177
Port:                     <unset>  80/TCP
TargetPort:               80/TCP
NodePort:                 <unset>  30862/TCP
Endpoints:                10.10.1.42:80,10.10.1.44:80
Session Affinity:         None
External Traffic Policy:  Cluster
Events:                   <none>

$ k get svc nginx-svc -oyaml
apiVersion: v1
kind: Service
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"v1","kind":"Service","metadata":{"annotations":{},"name":"nginx-svc","namespace":"default"},"spec":{"ports":[{"port":80,"protocol":"TCP","targetPort":80}],"selector":{"app":"nginx-deployment"},"type":"NodePort"}}
  creationTimestamp: "2022-06-24T06:34:32Z"
  name: nginx-svc
  namespace: default
  resourceVersion: "28020"
  uid: 6bc27710-1041-4486-9d06-1f3fec601ce0
spec:
  clusterIP: 10.101.182.177
  clusterIPs:
  - 10.101.182.177
  externalTrafficPolicy: Cluster
  internalTrafficPolicy: Cluster
  ipFamilies:
  - IPv4
  ipFamilyPolicy: SingleStack
  ports:
  - nodePort: 30862
    port: 80
    protocol: TCP
    targetPort: 80
  selector:
    app: nginx-deployment
  sessionAffinity: None
  type: NodePort
status:
  loadBalancer: {}

$ k get no -owide
NAME         STATUS   ROLES                  AGE     VERSION   INTERNAL-IP       EXTERNAL-IP   OS-IMAGE             KERNEL-VERSION      CONTAINER-RUNTIME
mac-master   Ready    control-plane,master   6d22h   v1.23.3   192.168.191.144   <none>        Ubuntu 22.04.2 LTS   5.15.0-75-generic   docker://20.10.24
mac-worker   Ready    <none>                 6d21h   v1.23.3   192.168.191.146   <none>        Ubuntu 22.04.2 LTS   5.15.0-75-generic   docker://20.10.24

$ curl 192.168.191.144:30862
srv : 10.10.1.42:80
host: nginx-deployment-756d6b7586-7plkf
uri : GET 192.168.191.144 /
date: 2022-06-24T07:35:39+00:00

$ curl 192.168.191.146:30862
srv : 10.10.1.42:80
host: nginx-deployment-756d6b7586-7plkf
uri : GET 192.168.191.146 /
date: 2022-06-24T07:35:31+00:00
```

![image-20230624153809580](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230624153809580.png)

> NodePort 的缺点

1. NodePort 的`端口非常有限`，默认只有 `2000` 多个（`30000 ~ 32767`）
2. NodePort 会在每个 Node 上都监听端口，然后使用 `kube-proxy` 路由到 `Service`，增加了`网络通信成本`
3. NodePort 需要向外界`暴露 Node IP`，一般还需要配合`反向代理`使用

