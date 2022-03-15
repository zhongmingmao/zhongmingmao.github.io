---
title: Go Engineering - IAM
mathjax: false
date: 2022-03-14 00:06:25
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
---

# 概述

1. IAM：Identity and Access Management
2. 用途：**在特定条件下，用户能够对哪些资源做哪些操作**

# 工作流程

> 3 种平台资源：**User**、**Secret**、**Policy**

![image-20220316000752071](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220316000752071.png)

<!-- more -->

# 系统架构

![image-20220316002441921](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220316002441921.png)

![image-20220316002740848](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220316002740848.png)

![image-20220316002753176](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220316002753176.png)

# 核心功能

1. **创建平台资源**
   - 用户通过 iam-webconsole 或者 iamctl 请求 iam-apiserver，完成 User、Secret、Policy 的 CRUD
   - iam-apiserver 将这些资源持久化到 MySQL 中
2. 请求 API 完成**资源授权**
   - 用户通过 iam-authz-server 的 /v1/authz 接口进行资源授权
     - 请求 /v1/authz 接口需要通过密钥**认证**，认证通过后会查询**授权策略**，从而决定资源是否被允许
   - 为了提高 /v1/authz 接口的性能，iam-authz-server 将密钥和策略缓存在内存中
     - iam-authz-server 通过 gRPC 调用 iam-apiserver，将密钥和策略缓存到内存中
     - 为了保证数据的一致性，借助 Redis Channel
       - 当 iam-apiserver 中有密钥或者策略被更新时，iam-apiserver 往特定的 Redis Channel 发送消息
       - iam-authz-server 订阅 Redis Channel，监听到新消息时，重新调用 gRPC 获取密钥和策略并更新到内存
3. 授权日志**数据分析**
   - iam-authz-server 将授权日志上报到 Redis 中，然后 iam-pump 会异步消费这些授权日志，进而转发到 MongoDB
4. 运营平台**数据展示**
   - iam-operating-system 通过查询 MongoDB 来展示运营数据
   - iam-operating-system 调用 iam-apiserver 来做运营管理工作

# 软件架构模式

## 前后分离

> 通信方式：RESTful API

![image-20220316005906137](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220316005906137.png)

## MVC

> 适用场景：运营系统功能比较少的情况
> 核心价值：通过 Controller 层将 View 层和 Model 层**解耦**，增强**易维护性**和**扩展性**（View 层经常变动）

![image-20220316010247044](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220316010247044.png)

