---
title: Kubernetes - An example
mathjax: false
date: 2022-10-23 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/1604578891313.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Kubernetes
---

# 架构

![image-20230617093443053](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230617093443053.png)

<!-- more -->

# 常见 API 对象

> `ConfigMap` 和 `Secret` 只接受`字符串`类型

![image-20230617093120511](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230617093120511.png)

# 部署

![image-20230617093534478](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230617093534478.png)

## MariaDB

```yaml maria-cm.yml
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

> `envFrom` - 更简洁

```yaml maria-pod.yml
apiVersion: v1
kind: Pod
metadata:
  name: maria-pod
  labels:
    app: wordpress
    role: database

spec:
  containers:
  - name: maria
    image: mariadb:10
    imagePullPolicy: IfNotPresent
    ports:
    - containerPort: 3306
    envFrom:
    - prefix: 'MARIADB_'
      configMapRef:
        name: maria-cm
```

> Pod IP 为 172.17.0.3

```
$ k apply -f maria-cm.yml
configmap/maria-cm created

$ k apply -f maria-pod.yml
pod/maria-pod created

$ k get po -owide
NAME        READY   STATUS    RESTARTS   AGE   IP           NODE       NOMINATED NODE   READINESS GATES
maria-pod   1/1     Running   0          67s   172.17.0.3   minikube   <none>           <none>
```

## WordPress

```yaml wp-cm.yml
apiVersion: v1
kind: ConfigMap
metadata:
  name: wp-cm

data:
  HOST: '172.17.0.3'
  USER: 'wp'
  PASSWORD: '123'
  NAME: 'db'
```

```yaml wp-pod.yml
apiVersion: v1
kind: Pod
metadata:
  name: wp-pod
  labels:
    app: wordpress
    role: website

spec:
  containers:
  - name: wp-pod
    image: wordpress:5
    imagePullPolicy: IfNotPresent
    ports:
    - containerPort: 80
    envFrom:
    - prefix: 'WORDPRESS_DB_'
      configMapRef:
        name: wp-cm
```

```
$ k apply -f wp-cm.yml
configmap/wp-cm created

$ k apply -f wp-pod.yml
pod/wp-pod created

$ k get po -owide
NAME        READY   STATUS    RESTARTS   AGE     IP           NODE       NOMINATED NODE   READINESS GATES
maria-pod   1/1     Running   0          2m55s   172.17.0.3   minikube   <none>           <none>
wp-pod      1/1     Running   0          15s     172.17.0.4   minikube   <none>           <none>
```

> 端口转发，通过 kubectl 将本机端口映射到 Pod 端口

```
$ k port-forward wp-pod 8080:80
Forwarding from 127.0.0.1:8080 -> 80
Forwarding from [::1]:8080 -> 80

$ curl -sI 127.1:8080
HTTP/1.1 302 Found
Date: Sat, 17 Jun 2022 01:41:34 GMT
Server: Apache/2.4.53 (Debian)
X-Powered-By: PHP/7.4.29
Expires: Wed, 11 Jan 1984 05:00:00 GMT
Cache-Control: no-cache, must-revalidate, max-age=0
X-Redirect-By: WordPress
Location: http://127.0.0.1:8080/wp-admin/install.php
Content-Type: text/html; charset=UTF-8
```

## Nginx

> 将 `127.0.0.1:8080` 设置为 Upstream

```nginx proxy.conf
server {
    listen 80;
    default_type text/html;

    location / {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_pass http://127.0.0.1:8080;
    }
}
```

```
$ docker run \
-d --rm --network=host \
-v /home/zhongmingmao/wp/proxy.conf:/etc/nginx/conf.d/default.conf \
nginx:alpine
2b364a65a7c9b3545fdb4f46a68724398dbe2f5ca801055be87b1b76ba2f6e79

$ ip a | grep 192
    inet 192.168.191.143/24 metric 100 brd 192.168.191.255 scope global dynamic ens160
    inet 192.168.49.1/24 brd 192.168.49.255 scope global br-e02b41b6031c
```

![image-20230617094839098](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230617094839098.png)
