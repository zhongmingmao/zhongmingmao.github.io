---
title: Kubernetes -- 容器
mathjax: false
date: 2021-07-07 17:43:46
categories:
	- Cloud Native
	- Kubernetes
	- Alibaba
tags:
	- Cloud Native
	- Kubernetes
	- Alibaba
---

# 容器与镜像

## 容器

容器是一个**资源视图隔离**、**资源可限制**、**独立文件系统**的**进程集合**

![image-20210707174849874](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210707174849874.png)

<!-- more -->

## 镜像

容器镜像：运行容器所需要的所有**文件集合**

![image-20210707175757429](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210707175757429.png)

### 构建镜像

![image-20210707180456837](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210707180456837.png)

### 运行容器

![image-20210707180914147](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210707180914147.png)

# 容器生命周期

![image-20210707201702389](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210707201702389.png)

# Moby 容器引擎架构

containerd-shim： **插件化**、**动态接管**

![image-20210707202341748](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210707202341748.png)

# 容器 vs VM

![image-20210707202942931](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210707202942931.png)

# 参考资料

1. [CNCF × Alibaba 云原生技术公开课](https://edu.aliyun.com/course/1651)