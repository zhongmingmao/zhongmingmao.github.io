---
title: Kubernetes - Daemonset
mathjax: false
date: 2022-10-26 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/DaemonSets.webp
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Kubernetes
---

# YAML

> 与 Deployment 非常类似，但缺少 `replicas`，因为 Daemonset 的意图是在每个 `Node` 上部署一个 Pod

```yaml redis-ds.yml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: redis-ds
  labels:
    app: redis-ds

spec:
  selector:
    matchLabels:
      name: redis-ds
  template:
    metadata:
      labels:
        name: redis-ds
    spec:
      containers:
      - name: redis
        image: redis:5-alpine
        ports:
        - containerPort: 6379
```

<!-- more -->

![image-20230618000949588](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230618000949588.png)

# 使用

```
$ k apply -f redis-ds.yml
daemonset.apps/redis-ds created

$ k get ds -owide
NAME       DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE   CONTAINERS   IMAGES           SELECTOR
redis-ds   1         1         1       1            1           <none>          48s   redis        redis:5-alpine   name=redis-ds

$ k get po -owide
NAME             READY   STATUS    RESTARTS   AGE   IP           NODE         NOMINATED NODE   READINESS GATES
redis-ds-l5rhj   1/1     Running   0          68s   10.10.1.38   mac-worker   <none>           <none>
```

# Taint + Toleration

> `Node` 的 Taint，`Pod` 的 Toleration

```
$ k describe no mac-master
Name:               mac-master
Roles:              control-plane,master
...
Taints:             node-role.kubernetes.io/master:NoSchedule
...

$ k describe no mac-worker
Name:               mac-worker
Roles:              <none>
...
Taints:             <none>
...

$ k describe po redis-ds-l5rhj
...
Tolerations:                 node.kubernetes.io/disk-pressure:NoSchedule op=Exists
                             node.kubernetes.io/memory-pressure:NoSchedule op=Exists
                             node.kubernetes.io/not-ready:NoExecute op=Exists
                             node.kubernetes.io/pid-pressure:NoSchedule op=Exists
                             node.kubernetes.io/unreachable:NoExecute op=Exists
                             node.kubernetes.io/unschedulable:NoSchedule op=Exists
...
```

> 移除 Master 的 Taint

```
$ k taint node mac-master node-role.kubernetes.io/master:NoSchedule-
node/mac-master untainted

$ k describe no mac-master
Name:               mac-master
Roles:              control-plane,master
...
Taints:             <none>
...

$ k get ds -owide
NAME       DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE   CONTAINERS   IMAGES           SELECTOR
redis-ds   2         2         2       2            2           <none>          16m   redis        redis:5-alpine   name=redis-ds

$ k get po -owide
NAME             READY   STATUS    RESTARTS   AGE    IP           NODE         NOMINATED NODE   READINESS GATES
redis-ds-ctj4l   1/1     Running   0          113s   10.10.0.4    mac-master   <none>           <none>
redis-ds-l5rhj   1/1     Running   0          16m    10.10.1.38   mac-worker   <none>           <none>
```

> Master 再次添加 Taint，`不会驱逐` Pod

```
$ k taint node mac-master node-role.kubernetes.io/master:NoSchedule
node/mac-master tainted

$ k describe no mac-master
Name:               mac-master
Roles:              control-plane,master
...
Taints:             node-role.kubernetes.io/master:NoSchedule
...

$ k get ds -owide
NAME       DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE   CONTAINERS   IMAGES           SELECTOR
redis-ds   1         1         1       1            1           <none>          18m   redis        redis:5-alpine   name=redis-ds

$ k get po -owide
NAME             READY   STATUS    RESTARTS   AGE     IP           NODE         NOMINATED NODE   READINESS GATES
redis-ds-ctj4l   1/1     Running   0          4m20s   10.10.0.4    mac-master   <none>           <none>
redis-ds-l5rhj   1/1     Running   0          19m     10.10.1.38   mac-worker   <none>           <none>

$ k delete po redis-ds-ctj4l
pod "redis-ds-ctj4l" deleted
```

> 为 Pod 添加 Toleration

```yaml redis-ds.yml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: redis-ds
  labels:
    app: redis-ds

spec:
  selector:
    matchLabels:
      name: redis-ds
  template:
    metadata:
      labels:
        name: redis-ds
    spec:
      containers:
      - name: redis
        image: redis:5-alpine
        ports:
        - containerPort: 6379
      tolerations:
      - key: node-role.kubernetes.io/master
        effect: NoSchedule
        operator: Exists
```

```
$ k apply -f redis-ds.yml
daemonset.apps/redis-ds configured

$ k get ds -owide
NAME       DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE   CONTAINERS   IMAGES           SELECTOR
redis-ds   2         2         2       2            2           <none>          49m   redis        redis:5-alpine   name=redis-ds

$ k get po -owide
NAME             READY   STATUS    RESTARTS   AGE   IP           NODE         NOMINATED NODE   READINESS GATES
redis-ds-58spk   1/1     Running   0          41s   10.10.1.39   mac-worker   <none>           <none>
redis-ds-ct9sq   1/1     Running   0          43s   10.10.0.5    mac-master   <none>           <none>
```

# Static Pod

> Static Pod `不受 Kubernetes 管控`，不与 `apiserver`、`scheduler` 发生关系，只受 `kubelet` 管控

```
$ cat /var/lib/kubelet/config.yaml
...
staticPodPath: /etc/kubernetes/manifests
...

$ ll /etc/kubernetes/manifests
total 16
-rw------- 1 root root 2235 Jun 17 08:56 etcd.yaml
-rw------- 1 root root 4019 Jun 17 08:56 kube-apiserver.yaml
-rw------- 1 root root 3514 Jun 17 08:56 kube-controller-manager.yaml
-rw------- 1 root root 1435 Jun 17 08:56 kube-scheduler.yaml
```

> kubelet 会`定期`检查 `staticPodPath` 中的文件，发现变化时会调用 `CRI` 创建或者删除 `Static Pod`









