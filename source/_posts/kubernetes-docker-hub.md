---
title: Kubernetes - Docker Hub
mathjax: false
date: 2022-09-26 00:06:25
cover: https://kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/docker/docker-hub.jpeg
categories:
  - Kubernetes
  - Docker
tags:
  - Architecture
  - Cloud Native
  - Kubernetes
  - Container
  - Docker
---

# Registry

> **Registry** -> **Repository**

![](https://docs.docker.com/engine/images/architecture.svg)

<!-- more -->

# Docker Hub

> **默认 Registry**

![image-20221121113227868](https://kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20221121113227868.png)

# Image

## Official

> Docker
> https://hub.docker.com/u/library

![image-20221121113704529](https://kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20221121113704529.png)

## Verified

> Bitnami / Rancher / Ubuntu

![image-20221121113927576](https://kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20221121113927576.png)

## Unofficial

### 半官方

> 开通 Verified publisher，需要付费

![image-20221121114245306](https://kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20221121114245306.png)

### 民间

> 个人镜像

# Naming

> **user/app:tag**
> tag = **version + os**
> **slim / fat**

| OS              | Example    |
| --------------- | ---------- |
| Alpine / CentOS | alpine3.15 |
| Ubuntu 18.04    | bionic     |
| Ubuntu 20.04    | focal      |
| Debian 9        | stretch    |
| Debian 10       | buster     |
| Debian 11       | bullseye   |

# Flow

## Online

```shell
$ docker login -u zhongmingmao
Password:
WARNING! Your password will be stored unencrypted in /home/zhongmingmao/.docker/config.json.
Configure a credential helper to remove this warning. See
https://docs.docker.com/engine/reference/commandline/login/#credentials-store

Login Succeeded
```

```shell
$ docker tag bitnami/nginx zhongmingmao/nginx:0.0.1

$ docker images
REPOSITORY           TAG       IMAGE ID       CREATED        SIZE
bitnami/nginx        latest    2f8cd4fa21bb   4 hours ago    95.5MB
zhongmingmao/nginx   0.0.1     2f8cd4fa21bb   4 hours ago    95.5MB
```

```shell
$ docker push zhongmingmao/nginx:0.0.1
The push refers to repository [docker.io/zhongmingmao/nginx]
5e229842bf7f: Mounted from bitnami/nginx
58861e9c7a9b: Mounted from bitnami/nginx
0.0.1: digest: sha256:a13a99b81152f5274c8fdcd621d47f441b230ea4dea45acd48f23877949230de size: 740
```

![image-20221121140450620](https://kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20221121140450620.png)

## Offline

> Harbor

```shell
$ docker images
REPOSITORY           TAG       IMAGE ID       CREATED        SIZE
zhongmingmao/nginx   0.0.1     2f8cd4fa21bb   5 hours ago    95.5MB
```

```shell
$ docker save zhongmingmao/nginx:0.0.1 -o zhongmingmao-nginx-0.0.1.tar
```

```shell
$ docker rmi zhongmingmao/nginx:0.0.1
Untagged: zhongmingmao/nginx:0.0.1
Untagged: zhongmingmao/nginx@sha256:a13a99b81152f5274c8fdcd621d47f441b230ea4dea45acd48f23877949230de
```

```shell
$ docker load -i zhongmingmao-nginx-0.0.1.tar
Loaded image: zhongmingmao/nginx:0.0.1
```

```shell
$ docker images
REPOSITORY           TAG       IMAGE ID       CREATED        SIZE
zhongmingmao/nginx   0.0.1     2f8cd4fa21bb   5 hours ago    95.5MB
```
