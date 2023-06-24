---
title: Kubernetes - Ingress
mathjax: false
date: 2022-10-28 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/617fae2d495f2526b09ce6fd_k8s-ingress-01-100841247-large.jpg
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Kubernetes
---

# 概述

## Service

> `Service` 本质上是一个由 `kube-proxy` 控制的`四层负载均衡`，在 `TCP/IP` 协议栈转发流量

1. 四层负载均衡，在`功能上非常受限`，只能依据 IP 地址和端口号做一些简单的判断和组合
2. Service 适合代理`集群内`的服务，如果要将服务暴露到集群外部，需要使用 `NodePort` 或者 `LoadBalancer`

## Ingress

1. 负责`七层负载均衡`

2. 流量的总入口（`南北向`）：`扇入`流量 + `扇出`流量

3. 语义：集群`内外边界`上的入口

<!-- more -->

![image-20230624181257933](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230624181257933.png)

## Ingress Controller

> 类比

| -    | -                         | -                  |
| ---- | ------------------------- | ------------------ |
| 四层 | `Service - iptables 规则` | kube-proxy         |
| 七层 | `Ingress - HTTP 路由规则` | Ingress Controller |

1. `Service` 本身没有服务能力，只是一些 `iptables 规则`
   - 真正配置和应用这些 iptables 规则的是 Node 上的 `kube-proxy` 组件
2. `Ingress` 也只是 `HTTP 路由规则`的集合，相当于是一份`静态描述文件`
   - 真正使得规则在集群中运行，需要 `Ingress Controller`，相当于 Service 的 `kube-proxy`
   - 读取和应用 Ingress 规则，并处理和调度流量
3. Ingress Controller 与`上层业务`紧密联系，Kubernetes 将 Ingress Controller 的实现开放给`社区` - 百花齐放

> Nginx Ingress Controller

![NGINX-Plus-Ingress-Controller-1-7-0_ecosystem](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/NGINX-Plus-Ingress-Controller-1-7-0_ecosystem.png)

## Ingress Class

> 只有 Ingress 和 Ingress Controller 的问题

1. Kubernetes 不允许同一个集群内引入不同的 Ingress Controller
2. Ingress 规则太多，Ingress Controller 不堪重负
3. 多个 Ingress 对象没有很好地逻辑分组，管理和维护成本很高
4. 集群内不同租户对 Ingress 的需求可能发生冲突，无法部署在同一个 Ingress Controller 上

> 解决方案：`Ingress Class` 作为`协调人`，解除了 Ingress 和 Ingress Controller 的`强绑定`关系

1. 使用 Ingress Class 来定义不同的`逻辑分组`，简化 Ingress 规则的复杂度
2. 不同组的 Ingress 和 Ingress Controller `彼此独立`，不会发生冲突
3. `应当使用 Ingress Class 来管理 Ingress 规则`

![image-20230624184226498](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230624184226498.png)

# YAML

> `Ingress` 和 `Ingress Class` 都只是`描述文件`，而 `Ingress Controller` 是实际运行的`实体`

```
$ k api-resources --api-group="networking.k8s.io"
NAME              SHORTNAMES   APIVERSION             NAMESPACED   KIND
ingressclasses                 networking.k8s.io/v1   false        IngressClass
ingresses         ing          networking.k8s.io/v1   true         Ingress
networkpolicies   netpol       networking.k8s.io/v1   true         NetworkPolicy
```

## Ingress

> 参数

1. `--class`
   - 指定 Ingress `从属`的 Ingress Class 对象
2. `--rule`
   - 路由规则，基本形式为：`URI=Service`
   - 语义：访问 HTTP 路径，转发到对应的 Service 对象，再由 Service 对象转发到后端的 Pod

> pathType: Exact / Prefix

```
$ k create ingress nginx-ingress --class=nginx-ingressclass --rule="nginx.test/=nginx-svc:80" --dry-run=client -oyaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  creationTimestamp: null
  name: nginx-ingress
spec:
  ingressClassName: nginx-ingressclass
  rules:
  - host: nginx.test
    http:
      paths:
      - backend:
          service:
            name: nginx-svc
            port:
              number: 80
        path: /
        pathType: Exact
status:
  loadBalancer: {}
```

## Ingress Class

> Ingress Class 并无实际作用，只是`关联`了 Ingress 和 Ingress Controller

> `spec.controller` 表示要使用哪个 Ingress Controller

```yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: nginx-ingressclass
spec:
  controller: nginx.org/ingress-controller
```

![image-20230624190518340](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230624190518340.png)

# 使用

## Ingress + Ingress Class

```yaml nginx-ing.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx-ing
spec:
  ingressClassName: nginx-inc
  rules:
    - host: nginx.local
      http:
        paths:
          - path: /
            pathType: Exact
            backend:
              service:
                name: nginx-svc
                port:
                  number: 80

---
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: nginx-inc
spec:
  controller: nginx.org/ingress-controller
```

```
$ k apply -f nginx-ing.yaml
ingress.networking.k8s.io/nginx-ing created
ingressclass.networking.k8s.io/nginx-inc created

$ k get ingress
NAME        CLASS       HOSTS         ADDRESS   PORTS   AGE
nginx-ing   nginx-inc   nginx.local             80      13s

$ k get ingressclasses
NAME        CONTROLLER                     PARAMETERS   AGE
nginx-inc   nginx.org/ingress-controller   <none>       36s
```

> `Default backend` - 当找不到路由时，用来提供一个默认的后端服务，一般`可忽略`

```
$ k get endpoints nginx-svc -owide
NAME        ENDPOINTS                     AGE
nginx-svc   10.10.1.45:80,10.10.1.46:80   3m21s

$ k describe ingress nginx-ing
Name:             nginx-ing
Labels:           <none>
Namespace:        default
Address:
Default backend:  default-http-backend:80 (<error: endpoints "default-http-backend" not found>)
Rules:
  Host         Path  Backends
  ----         ----  --------
  nginx.local
               /   nginx-svc:80 (10.10.1.45:80,10.10.1.46:80)
Annotations:   <none>
Events:        <none>
```

## Ingress Controller

> Nginx Ingress Controller 以 `Pod` 的形式运行，同时支持 `Deployment` 和 `DaemonSet` 两种部署方式
> 参照：https://github.com/chronolaw/k8s_study/tree/master/ingress

> 使用 Deployment 的方式部署 Ingress Controller，`-ingress-class` 让 Ingress Controller 管理 Ingress

```yaml nginx-ing-ctl.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-ing-ctl
  namespace: nginx-ingress

spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx-ing-ctl
  template:
    metadata:
      labels:
        app: nginx-ing-ctl
    spec:
      containers:
      - name: app
        image: nginx/nginx-ingress:2.2-alpine
        args:
        - -ingress-class=nginx-inc
```

```
$ k apply -f nginx-ing-ctl.yaml
deployment.apps/nginx-ing-ctl created

$ k get deploy -n nginx-ingress
NAME            READY   UP-TO-DATE   AVAILABLE   AGE
nginx-ing-ctl   1/1     1            1           61s

$ k get po -n nginx-ingress
NAME                             READY   STATUS    RESTARTS   AGE
nginx-ing-ctl-5dd8dc657c-v6cdh   1/1     Running   0          69s
```

![image-20230624210232511](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230624210232511.png)

> Ingress Controller 本身也是一个 Pod，监听 80 端口

```
$ k exec -n nginx-ingress nginx-ing-ctl-5dd8dc657c-v6cdh -- netstat -tunpl
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name
tcp        0      0 0.0.0.0:8080            0.0.0.0:*               LISTEN      -
tcp        0      0 0.0.0.0:443             0.0.0.0:*               LISTEN      -
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      -
tcp        0      0 :::8081                 :::*                    LISTEN      1/nginx-ingress
tcp        0      0 :::8080                 :::*                    LISTEN      -
tcp        0      0 :::443                  :::*                    LISTEN      -
tcp        0      0 :::80                   :::*                    LISTEN      -
netstat: showing only processes with your user ID

$ k exec -n nginx-ingress nginx-ing-ctl-5dd8dc657c-v6cdh -- curl -s --resolve nginx.local:80:127.0.0.1 http://nginx.local
srv : 10.10.1.46:80
host: nginx-deployment-756d6b7586-hfg7z
uri : GET nginx.local /
date: 2022-06-24T14:00:54+00:00

$ k exec -n nginx-ingress nginx-ing-ctl-5dd8dc657c-v6cdh -- curl -s --resolve nginx.local:80:127.0.0.1 http://nginx.local
srv : 10.10.1.45:80
host: nginx-deployment-756d6b7586-nq76w
uri : GET nginx.local /
date: 2022-06-24T14:01:17+00:00
```

> 如果想要向外提供服务，需要依赖 `Service` 对象（`NodePort` / `loadBalancer`）

```
$ k expose deployment -n nginx-ingress nginx-ing-ctl --type=NodePort --port=80 --dry-run=client -oyaml
apiVersion: v1
kind: Service
metadata:
  creationTimestamp: null
  name: nginx-ing-ctl
  namespace: nginx-ingress
spec:
  ports:
  - port: 80
    protocol: TCP
    targetPort: 80
  selector:
    app: nginx-ing-ctl
  type: NodePort
status:
  loadBalancer: {}
```

```yaml nginx-ing-ctl-svc.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-ing-ctl-svc
  namespace: nginx-ingress

spec:
  ports:
  - port: 80
    protocol: TCP
    targetPort: 80
  selector:
    app: nginx-ing-ctl
  type: NodePort
```

```
$ k apply -f  nginx-ing-ctl-svc.yaml
service/nginx-ing-ctl-svc created

$ k get svc -n nginx-ingress
NAME                TYPE       CLUSTER-IP       EXTERNAL-IP   PORT(S)        AGE
nginx-ing-ctl-svc   NodePort   10.103.123.163   <none>        80:30563/TCP   20s

$ k get no -owide
NAME         STATUS   ROLES                  AGE    VERSION   INTERNAL-IP       EXTERNAL-IP   OS-IMAGE             KERNEL-VERSION      CONTAINER-RUNTIME
mac-master   Ready    control-plane,master   7d5h   v1.23.3   192.168.191.144   <none>        Ubuntu 22.04.2 LTS   5.15.0-75-generic   docker://20.10.24
mac-worker   Ready    <none>                 7d4h   v1.23.3   192.168.191.146   <none>        Ubuntu 22.04.2 LTS   5.15.0-75-generic   docker://20.10.24

$ curl --resolve nginx.local:30563:192.168.191.146 http://nginx.local:30563
srv : 10.10.1.46:80
host: nginx-deployment-756d6b7586-hfg7z
uri : GET nginx.local /
date: 2022-06-24T14:08:48+00:00

$ curl --resolve nginx.local:30563:192.168.191.146 http://nginx.local:30563
srv : 10.10.1.45:80
host: nginx-deployment-756d6b7586-nq76w
uri : GET nginx.local /
date: 2022-06-24T14:08:52+00:00
```

