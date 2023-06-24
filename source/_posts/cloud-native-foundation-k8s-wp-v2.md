---
title: Kubernetes - Another example
mathjax: false
date: 2022-10-29 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/wordpress.gif
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Kubernetes
---

# 架构

![image-20230625000747932](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230625000747932.png)

<!-- more -->

# MariaDB

> ConfigMap

```yaml maria-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: maria-cm

data:
  DATABASE: 'db'
  USER: 'wp'
  PASSWORD: '123'
  ROOT_PASSWORD: '123'
```

```
$ k apply -f maria-cm.yaml
configmap/maria-cm created
```

> Deployment

```yaml maria-deploy.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: maria-deploy
  labels:
    app: maria-deploy

spec:
  replicas: 1
  selector:
    matchLabels:
      app: maria-deploy
  template:
    metadata:
      labels:
        app: maria-deploy
    spec:
      containers:
      - name: maria
        image: mariadb:10
        ports:
        - containerPort: 3306
        envFrom:
        - prefix: 'MARIADB_'
          configMapRef:
            name: maria-cm
```

```
$ k apply -f maria-deploy.yaml
deployment.apps/maria-deploy created

$ k get po
NAME                                READY   STATUS    RESTARTS   AGE
maria-deploy-c789dc655-jgzrr        1/1     Running   0          68s

$ k get deployments.apps
NAME               READY   UP-TO-DATE   AVAILABLE   AGE
maria-deploy       1/1     1            1           5m4s
```

> Service

```
$ k apply -f maria-svc.yaml
service/maria-svc created

$ k get svc -owide
NAME         TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)        AGE    SELECTOR
kubernetes   ClusterIP   10.96.0.1        <none>        443/TCP        7d7h   <none>
maria-svc    ClusterIP   10.108.191.249   <none>        3306/TCP       81s    app=maria-deploy
```

# WordPress

> ConfigMap

```yaml wp-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: wp-cm

data:
  HOST: 'maria-svc'
  USER: 'wp'
  PASSWORD: '123'
  NAME: 'db'
```

```
$ k apply -f wp-cm.yaml
configmap/wp-cm created
```

> Deployment

```yaml wp-deploy.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wp-deploy
  labels:
    app: wp-deploy

spec:
  replicas: 2
  selector:
    matchLabels:
      app: wp-deploy
  template:
    metadata:
      labels:
        app: wp-deploy
    spec:
      containers:
      - name: wp
        image: wordpress:5
        ports:
        - containerPort: 80
        envFrom:
        - prefix: 'WORDPRESS_DB_'
          configMapRef:
            name: wp-cm
```

```
$ k apply -f wp-deploy.yaml
deployment.apps/wp-deploy created

$ k get deployment
NAME               READY   UP-TO-DATE   AVAILABLE   AGE
maria-deploy       1/1     1            1           150m
wp-deploy          2/2     2            2           30m

$ k get po -owide
NAME                                READY   STATUS    RESTARTS   AGE    IP           NODE         NOMINATED NODE   READINESS GATES
maria-deploy-c789dc655-jgzrr        1/1     Running   0          151m   10.10.1.52   mac-worker   <none>           <none>
wp-deploy-6bdb6f69bf-g7wgg          1/1     Running   0          31m    10.10.1.54   mac-worker   <none>           <none>
wp-deploy-6bdb6f69bf-xwbsk          1/1     Running   0          31m    10.10.1.53   mac-worker   <none>           <none>
```

> Service

```yaml wp-svc.yaml
apiVersion: v1
kind: Service
metadata:
  name: wp-svc
  labels:
    app: wp-deploy

spec:
  ports:
  - name: http80
    port: 80
    protocol: TCP
    targetPort: 80
    nodePort: 30088
  selector:
    app: wp-deploy
  type: NodePort
```

```
$ k apply -f  wp-svc.yaml
service/wp-svc created

$ k get svc -owide
NAME         TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)        AGE     SELECTOR
kubernetes   ClusterIP   10.96.0.1        <none>        443/TCP        7d9h    <none>
maria-svc    ClusterIP   10.108.191.249   <none>        3306/TCP       148m    app=maria-deploy
wp-svc       NodePort    10.104.91.244    <none>        80:30088/TCP   2m11s   app=wp-deploy

$ k get no -owide
NAME         STATUS   ROLES                  AGE    VERSION   INTERNAL-IP       EXTERNAL-IP   OS-IMAGE             KERNEL-VERSION      CONTAINER-RUNTIME
mac-master   Ready    control-plane,master   7d9h   v1.23.3   192.168.191.144   <none>        Ubuntu 22.04.2 LTS   5.15.0-75-generic   docker://20.10.24
mac-worker   Ready    <none>                 7d9h   v1.23.3   192.168.191.146   <none>        Ubuntu 22.04.2 LTS   5.15.0-75-generic   docker://20.10.24
```

![image-20230625025348515](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230625025348515.png)

# Nginx Ingress Controller

> Ingress Class

```yaml wp-ink.yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: wp-ink

spec:
  controller: nginx.org/ingress-controller
```

```
$ k apply -f wp-ink.yaml
ingressclass.networking.k8s.io/wp-ink created
```

> Ingress

```
$ k create ingress wp-ing --class='wp-ink' --rule='wp.test/=wp-svc:80' --dry-run=client -oyaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  creationTimestamp: null
  name: wp-ing
spec:
  ingressClassName: wp-ink
  rules:
  - host: wp.test
    http:
      paths:
      - backend:
          service:
            name: wp-svc
            port:
              number: 80
        path: /
        pathType: Exact
status:
  loadBalancer: {}
```

```yaml wp-ing.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: wp-ing

spec:
  ingressClassName: wp-ink
  rules:
  - host: wp.test
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: wp-svc
            port:
              number: 80
```

```
$ k apply -f wp-ing.yaml
ingress.networking.k8s.io/wp-ing created

$ k get ingress
NAME        CLASS       HOSTS         ADDRESS   PORTS   AGE
wp-ing      wp-ink      wp.test                 80      16s
```

> Nginx Ingress Controller，`hostNetwork: true` 使得 Pod 能够使用`宿主网络`

```yaml wp-ing-ctl.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wp-ing-ctl
  namespace: nginx-ingress

spec:
  replicas: 1
  selector:
    matchLabels:
      app: wp-ing-ctl
  template:
    metadata:
      labels:
        app: wp-ing-ctl
    spec:
      serviceAccountName: nginx-ingress
      hostNetwork: true
      containers:
      - name: ctl
        image: nginx/nginx-ingress:2.2-alpine
        args:
        - -ingress-class=wp-ink
```

> wp-ing-ctl 的 `Pod IP`  与 `Node IP` 一致

```
$ k apply -f wp-ing-ctl.yaml
deployment.apps/wp-ing-ctl created

$ k get po -n nginx-ingress -owide
NAME                             READY   STATUS    RESTARTS   AGE     IP                NODE         NOMINATED NODE   READINESS GATES
nginx-ing-ctl-5dd8dc657c-v6cdh   1/1     Running   0          5h36m   10.10.1.47        mac-worker   <none>           <none>
wp-ing-ctl-56cf95f74-pz68h       1/1     Running   0          27s     192.168.191.146   mac-worker   <none>           <none>

$ curl -v --resolve wp.test:80:192.168.191.146 http://wp.test:80
* Added wp.test:80:192.168.191.146 to DNS cache
* Hostname wp.test was found in DNS cache
*   Trying 192.168.191.146:80...
* Connected to wp.test (192.168.191.146) port 80 (#0)
> GET / HTTP/1.1
> Host: wp.test
> User-Agent: curl/7.88.1
> Accept: */*
>
< HTTP/1.1 302 Found
< Server: nginx/1.21.6
< Date: Sat, 24 Jun 2023 19:41:51 GMT
< Content-Type: text/html; charset=UTF-8
< Content-Length: 0
< Connection: keep-alive
< X-Powered-By: PHP/7.4.29
< Expires: Wed, 11 Jan 1984 05:00:00 GMT
< Cache-Control: no-cache, must-revalidate, max-age=0
< X-Redirect-By: WordPress
< Location: http://wp.test/wp-admin/install.php
<
* Connection #0 to host wp.test left intact
```

> DNS 解析，`/etc/hosts`

```
192.168.191.146 wp.test
```

![image-20230625034039231](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230625034039231.png)

