---
title: Kubernetes - ConfigMap + Secret
mathjax: false
date: 2022-10-22 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/liwxn86e6gpynt9jk6fy.webp
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Kubernetes
---

# 定义

## ConfigMap

> 明文配置

```
$ k create cm info --from-literal=name=zhongmingmao --dry-run=client -oyaml
apiVersion: v1
data:
  name: zhongmingmao
kind: ConfigMap
metadata:
  creationTimestamp: null
  name: info
```

> ConfigMap 没有 `spec`，因为 ConfigMap 存储的是配置数据，`并不是容器`，因此没有`运行时规格`

<!-- more -->

> ConfigMap 里的数据都是 `Key-Value` 结构

```yaml cm.yml
apiVersion: v1
kind: ConfigMap
metadata:
  name: info

data:
  name: zhongmingmao
  city: guangzhou
  greeting: |
    hello kubernetes!
```

```
$ k apply -f cm.yml
configmap/info created

$ k get cm
NAME               DATA   AGE
info               3      81s

$ k describe cm info
Name:         info
Namespace:    default
Labels:       <none>
Annotations:  <none>

Data
====
city:
----
guangzhou
greeting:
----
hello kubernetes!

name:
----
zhongmingmao

BinaryData
====

Events:  <none>
```

## Secret

> 机密配置，有多种分类

1. 访问`私有镜像仓库`的认证信息
2. `身份识别`的凭证信息
3. `HTTPS 通信`的证书和私钥
4. `一般`的机密信息

> Base64 编码

```
$ k create secret generic user --from-literal=password=1234 --dry-run=client -oyaml
apiVersion: v1
data:
  password: MTIzNA==
kind: Secret
metadata:
  creationTimestamp: null
  name: user

$ echo -n 'MTIzNA==' | base64 -d
1234
```

```yaml secret.yml
apiVersion: v1
kind: Secret
metadata:
  name: user

data:
  city: Z3Vhbmd6aG91
  password: MTIzNA==
```

> 通过 describe 无法直接查看内容

```
$ k apply -f secret.yml
secret/user created

$ k get secrets
NAME                  TYPE                                  DATA   AGE
user                  Opaque                                2      3m52s

$ k describe secrets user
Name:         user
Namespace:    default
Labels:       <none>
Annotations:  <none>

Type:  Opaque

Data
====
city:      9 bytes
password:  4 bytes

$ k get secrets user -oyaml
apiVersion: v1
data:
  city: Z3Vhbmd6aG91
  password: MTIzNA==
kind: Secret
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"v1","data":{"city":"Z3Vhbmd6aG91","password":"MTIzNA=="},"kind":"Secret","metadata":{"annotations":{},"name":"user","namespace":"default"}}
  creationTimestamp: "2022-06-16T14:19:36Z"
  name: user
  namespace: default
  resourceVersion: "7418"
  uid: 42accd15-acbd-4041-9270-3344726277a9
type: Opaque
```

# 使用

> ConfigMap 和 Secret 只是存储在 etcd 中的字符串，需要`注入`到 Pod

## Environment variable

> `valueFrom` - 指定了环境变量值的来源

```
$ k explain pod.spec.containers.env.valueFrom
KIND:     Pod
VERSION:  v1

RESOURCE: valueFrom <Object>

DESCRIPTION:
     Source for the environment variable's value. Cannot be used if value is not
     empty.

     EnvVarSource represents a source for the value of an EnvVar.

FIELDS:
   configMapKeyRef	<Object>
     Selects a key of a ConfigMap.

   fieldRef	<Object>
     Selects a field of the pod: supports metadata.name, metadata.namespace,
     `metadata.labels['<KEY>']`, `metadata.annotations['<KEY>']`, spec.nodeName,
     spec.serviceAccountName, status.hostIP, status.podIP, status.podIPs.

   resourceFieldRef	<Object>
     Selects a resource of the container: only resources limits and requests
     (limits.cpu, limits.memory, limits.ephemeral-storage, requests.cpu,
     requests.memory and requests.ephemeral-storage) are currently supported.

   secretKeyRef	<Object>
     Selects a key of a secret in the pod's namespace
```

```yaml env-pod.yml
apiVersion: v1
kind: Pod
metadata:
  name: env-pod

spec:
  containers:
  - name: busy
    image: busybox
    imagePullPolicy: IfNotPresent
    command: ["/bin/sleep", "300"]
    env:
     - name: NAME
       valueFrom:
         configMapKeyRef:
           name: info
           key: name
     - name: CITY
       valueFrom:
         configMapKeyRef:
           name: info
           key: city
     - name: GREETING
       valueFrom:
         configMapKeyRef:
           name: info
           key: greeting
     - name: USER_CITY
       valueFrom:
         secretKeyRef:
           name: user
           key: city
     - name: PASSWORD
       valueFrom:
         secretKeyRef:
           name: user
           key: password
```

```
$ k apply -f pod.yml
pod/env-pod created

$  k get pod
NAME      READY   STATUS    RESTARTS   AGE
env-pod   1/1     Running   0          19s

$ k exec -it env-pod -- env
...
NAME=zhongmingmao
CITY=guangzhou
GREETING=hello kubernetes!

USER_CITY=guangzhou
PASSWORD=1234
...
```

> 解耦

![image-20230616225220865](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230616225220865.png)

### Volume

> `Volume 属于 Pod`，不属于某个容器，因此 volumes 与 containers `同级`

> 使用 Volume `统一抽象`了所有存储（临时卷、持久卷、动态卷、快照卷等），`扩展性`非常好

```yaml volume-pod.yml
apiVersion: v1
kind: Pod
metadata:
  name: volume-pod

spec:
  containers:
  - name: busy
    image: busybox
    imagePullPolicy: IfNotPresent
    command: ["/bin/sleep", "300"]
    volumeMounts:
    - mountPath: /tmp/cm-items
      name: cm-vol
    - mountPath: /tmp/secret-items
      name: secret-vol
  volumes:
  - name: cm-vol
    configMap:
      name: info
  - name: secret-vol
    secret:
      secretName: user
```

> ConfigMap 和 Secret 都成了`目录`的形式，`Key-Value` 变成了`文件`，Key 为文件名

```
$ k apply -f volume-pod.yml
pod/volume-pod created

$ k get pod
NAME         READY   STATUS    RESTARTS   AGE
volume-pod   1/1     Running   0          14s

$ k exec -it volume-pod -- sh
/ # ls /tmp/cm-items
city      greeting  name
/ #
/ # cat /tmp/cm-items/greeting
hello kubernetes!
/ #
/ # ls /tmp/secret-items/
city      password
/ #
/ # cat /tmp/secret-items/password
1234/ #
/ #
/ # df -h | grep /tmp/
                         10.2G      6.7G      3.0G  69% /tmp/cm-items
tmpfs                     3.8G      8.0K      3.8G   0% /tmp/secret-items
/ #
/ # exit
```

![image-20230616231352227](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230616231352227.png)

