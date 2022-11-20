---
title: Apollo - Core Concept
mathjax: false
date: 2022-09-23 00:06:25
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

# Application

> 应用的**唯一标识**

> **classpath:/META-INF/app.properties -> appid**

# Environment

> DEV / UAT / PRO

> **/opt/settings/server.properties -> env**

![image-20221120195817508](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/apollo/image-20221120195817508.png)

<!-- more -->

 # Cluster - Instance Group - default

> 一个应用下**不同实例的分组**（是**实例的逻辑分组**，并非物理集群），不同的 Cluster，可以有不同的配置 --> 灰度单元组

> **/opt/settings/server.properties -> idc**

> 默认 Cluster：**default**

![image-20221120200349321](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/apollo/image-20221120200349321.png)

# Namespace - Item Group - application

> 一个应用下**不同配置的逻辑分组**：数据库配置、服务框架配置等
> 也可以**关联**公共的 Namespace -- 可覆盖

> 默认 Namespace：**application**

| Type        | Note                                       |
| ----------- | ------------------------------------------ |
| **Private** | 只能被所属应用获取                         |
| **Public**  | 场景：**共享配置**、**中间件客户端的配置** |
|             | 必须**全局唯一**                           |
| **Extend**  | 可**覆盖**                                 |

![image-20221120201654439](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/apollo/image-20221120201654439.png)

# Item

> **可配置项**，支持格式：**properties**、**json**、**xml**，定位方式如下

| Private                                        | Public                                   |
| ---------------------------------------------- | ---------------------------------------- |
| **env + app + cluster + namespace + item_key** | **env + cluster + namespace + item_key** |

# Authority

| Authority                    | Note                                                         |
| ---------------------------- | ------------------------------------------------------------ |
| **系统管理员**（superAdmin） | 拥有所有权限                                                 |
| **创建者**                   | 代为创建项目，创建项目时，可以指定**应用负责人**（一般为创建者本人）和**项目管理员** |
| **项目管理员**               | 可以创建 **Cluster** 和 **Namespace**，以及管理项目和 Namespace 权限 |
| **编辑权限**                 | 只能编辑，不能发布                                           |
| **发布权限**                 | 只能发布，不能编辑                                           |
| **查看权限**                 | 只能查看                                                     |

![image-20221120203632484](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/apollo/image-20221120203632484.png)

![image-20221120203123720](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/apollo/image-20221120203123720.png)

# Reference

1. [微服务架构实战 160 讲](https://time.geekbang.org/course/intro/100007001)