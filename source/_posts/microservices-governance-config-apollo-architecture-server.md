---
title: Apollo Architecture - Server
mathjax: false
date: 2022-09-24 00:06:25
cover: https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/apollo/apollo-logao.awebp
categories:
  - Microservices Governance
  - Config
  - Apollo
tags:
  - Architecture
  - Cloud Native
  - Microservices
  - Microservices Governance
  - Config
  - Configuration Center
  - Apollo
---

# Architecture

> 逻辑视图，**Software Load Balancer** 即 **Nginx**

![overall-architecture](https://cdn.jsdelivr.net/gh/apolloconfig/apollo@master/doc/images/overall-architecture.png)

<!-- more -->

# Module

| Module             | Desc                                                         | Note                                                  |
| ------------------ | ------------------------------------------------------------ | ----------------------------------------------------- |
| **Config Service** | 服务对象：**Client**<br />**配置获取**接口：**推送 + 拉取**  |                                                       |
| **Admin Service**  | 服务对象：**Portal**<br />**配置管理**接口：**修改 + 发布**  |                                                       |
| **Client**         | 应用获取配置，实时更新<br />通过 Meta Server 获取 Config Service 服务列表<br />**客户端软负载** |                                                       |
| **Portal**         | 配置管理界面<br />通过 Meta Server 获取 Admin Service 服务列表<br />**客户端软负载** |                                                       |
| **Eureka**         | 服务注册与发现<br />Config Service 和 Admin Service 向 Eureka 注册并保持心跳<br />与 **Config Service** 一起部署 |                                                       |
| **Meta Server**    | **Eureka Proxy**<br />**逻辑角色**，与 **Config Service** 一起部署<br />**Client** 通过**域名**访问 **Meta Server** 获取 **Config Service** 服务列表<br />**Portal** 通过**域名**访问 **Meta Server** 获取 **Admin Service** 服务列表 | Eureka 只有 Java 客户端<br />主要是为了支持**多语言** |

> 部署视图，Nginx 需要配置的 upstream：**Meta Server + Portal**

![image-20221120223535438](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/apollo/image-20221120223535438.png)

# Domain Model

![image-20221120224219477](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/apollo/image-20221120224219477.png)

> AppNamespace：应用的 Namespace 的元数据

![image-20221120224538070](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/apollo/image-20221120224538070.png)

# Authority Model

> 基于 **RBAC**

![image-20221120224727281](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/apollo/image-20221120224727281.png)

# Real-time push

> 借助**数据库**实现**异步通知**（Admin Service -> Config Service）

![image-20221120224937601](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/apollo/image-20221120224937601.png)

![image-20221120224947360](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/apollo/image-20221120224947360.png)

# Reference

1. [微服务架构实战 160 讲](https://time.geekbang.org/course/intro/100007001)
