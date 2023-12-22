---
title: Kubernetes - Helm
mathjax: false
date: 2023-01-28 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/k8s-helm.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
---

# 特性

1. `Helm Chart` 是创建一个应用实例的必要的配置组，即 `Spec 集合`
2. 配置信息被归类为`模板`和`值`，经过`渲染`后生成最终的对象
3. 所有配置可以被`打包`进一个可以`发布`的对象中
4. `Release` 为一个特定配置的 `Chart` 的`实例`

<!-- more -->

# 组件

> 只有`客户端`，没有服务端

## Client

1. 本地 Chart 开发
2. 管理 Repository
3. 管理 Release
4. 与 Library 交互
   - 发送需要安装的 Chart
   - 请求升级或者卸载存在的 Release

## Library

> 负责与 `API Server` 交互

1. 基于 `Chart` 和 `Configuration` 创建一个 `Release`
2. 把 Chart 安装到 Kubernetes，并提供相应的 Release 对象
3. 升级 + 卸载
4. 采用 Kubernetes 存储所有配置信息 - 无需服务端

# 实践

> 开发

```
$ h create myapp
Creating myapp

$ tree myapp
myapp
├── Chart.yaml
├── charts
├── templates
│   ├── NOTES.txt
│   ├── _helpers.tpl
│   ├── deployment.yaml
│   ├── hpa.yaml
│   ├── ingress.yaml
│   ├── service.yaml
│   ├── serviceaccount.yaml
│   └── tests
│       └── test-connection.yaml
└── values.yaml
```

> 安装

```
$ h install myapp ./myapp
NAME: myapp
LAST DEPLOYED: Fri Dec 22 22:24:06 2022
NAMESPACE: default
STATUS: deployed
REVISION: 1
NOTES:
1. Get the application URL by running these commands:
  export POD_NAME=$(kubectl get pods --namespace default -l "app.kubernetes.io/name=myapp,app.kubernetes.io/instance=myapp" -o jsonpath="{.items[0].metadata.name}")
  export CONTAINER_PORT=$(kubectl get pod --namespace default $POD_NAME -o jsonpath="{.spec.containers[0].ports[0].containerPort}")
  echo "Visit http://127.0.0.1:8080 to use your application"
  kubectl --namespace default port-forward $POD_NAME 8080:$CONTAINER_PORT
  
$ h list
NAME 	NAMESPACE	REVISION	UPDATED                            	STATUS  	CHART      	APP VERSION
myapp	default  	1       	2022-12-22 22:24:06.82969 +0800 CST	deployed	myapp-0.1.0	1.16.0

$ k get secrets
NAME                          TYPE                                  DATA   AGE
default-token-gspdr           kubernetes.io/service-account-token   3      5d8h
myapp-token-dnf98             kubernetes.io/service-account-token   3      7m46s
sh.helm.release.v1.myapp.v1   helm.sh/release.v1                    1      7m46s

$ k get po
NAME                     READY   STATUS    RESTARTS   AGE
myapp-567b668757-p5n5j   1/1     Running   0          4m27s
```

> 复用

```
$ h repo list
Error: no repositories to show

$ helm repo add grafana https://grafana.github.io/helm-charts
"grafana" has been added to your repositories

$ h repo list
NAME   	URL
grafana	https://grafana.github.io/helm-charts

$ h repo update
Hang tight while we grab the latest from your chart repositories...
...Successfully got an update from the "grafana" chart repository
Update Complete. ⎈Happy Helming!⎈

$ h search repo grafana
NAME                                	CHART VERSION	APP VERSION      	DESCRIPTION
grafana/grafana                     	7.0.19       	10.2.2           	The leading tool for querying and visualizing t...
...
grafana/loki-stack                  	2.9.11       	v2.6.1           	Loki: like Prometheus, but for logs.
...

$ h upgrade --install loki grafana/loki-stack
Release "loki" does not exist. Installing it now.
W1222 22:37:29.710846  596885 warnings.go:70] policy/v1beta1 PodSecurityPolicy is deprecated in v1.21+, unavailable in v1.25+
W1222 22:37:29.727440  596885 warnings.go:70] policy/v1beta1 PodSecurityPolicy is deprecated in v1.21+, unavailable in v1.25+
NAME: loki
LAST DEPLOYED: Fri Dec 22 22:37:29 2022
NAMESPACE: default
STATUS: deployed
REVISION: 1
NOTES:
The Loki stack has been deployed to your cluster. Loki can now be added as a datasource in Grafana.

See http://docs.grafana.org/features/datasources/loki/ for more detail.

$ h list
NAME 	NAMESPACE	REVISION	UPDATED                                	STATUS  	CHART            	APP VERSION
loki 	default  	1       	2022-12-22 22:37:29.502337258 +0800 CST	deployed	loki-stack-2.9.11	v2.6.1
myapp	default  	1       	2022-12-22 22:24:06.82969 +0800 CST    	deployed	myapp-0.1.0      	1.16.0

$ k get po
NAME                     READY   STATUS              RESTARTS   AGE
loki-0                   0/1     ContainerCreating   0          101s
loki-promtail-4tlbb      0/1     ContainerCreating   0          101s
myapp-567b668757-p5n5j   1/1     Running             0          15m
```

