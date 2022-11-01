---
title: Oauth2 - Overview
mathjax: false
date: 2022-09-12 00:06:25
cover: https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2.png
categories:
  - Microservices Governance
  - Security
  - Oauth2
tags:
  - Microservices Governance
  - Microservices
  - Security
  - Oauth2
  - Architecture
  - Cloud Native
---

# 问题域

> 开放系统间**授权**

![image-20221028082756181](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/image-20221028082756181.png)

<!-- more -->

## 账号密码

> 不安全

![image-20221028084641231](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/image-20221028084641231.png)

## 万能钥匙

> 适用于公司内部

![image-20221028084824009](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/image-20221028084824009.png)

## 特殊令牌

> 核心挑战是**令牌的生命周期管理**

![image-20221028084935348](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/image-20221028084935348.png)

# 微服务安全

> 核心是 **Token**

![image-20221028085231664](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/image-20221028085231664.png)

# OAuth2

## 最简向导

![image-20221101230926646](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221101230926646.png)

## 正式定义

> Token 是核心，可类比为**仆从钥匙**（给应用授予**有限的访问权限**，让应用代表用户去访问用户数据）

![image-20221101231259317](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221101231259317.png)

## 优劣

### 主要优势

> OAuth2 使用**代理授权**的方式解决**密码共享**的**反模式**问题

![image-20221101232655960](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221101232655960.png)

### 主要劣势

> _**OAuth2 不是认证协议，而是一个代理授权框架**_

> OAuth2 提供一个**宽泛**的协议框架，具体安全场景需要**定制**

![image-20221101232901537](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221101232901537.png)

## 主要角色

![image-20221101233232518](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221101233232518.png)

## 主要术语

![image-20221101233407232](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221101233407232.png)

![image-20221101233546772](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221101233546772.png)

## Token 类型

![image-20221101235646089](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221101235646089.png)

## 常见误区

![image-20221101235819650](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221101235819650.png)

## 典型 Flow

> https://www.rfc-editor.org/rfc/rfc6749

### Authorization Code Flow

> _**最复杂 + 最安全 + 应用最广泛**_

![image-20221102000540824](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221102000540824.png)

### Implicit Grant Flow

> 减少了**授权码兑换**的过程（**通过 Script 解析 Access Token**），适用于**单页应用**（无后端）

![image-20221102001550406](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221102001550406.png)

### Resource Owner Password Credentials Flow

> 适用于公司内部应用等**风险可控**的场景

![image-20221102001311093](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221102001311093.png)

### Client Credentials Flow

> 连资源所有者都没有，适用于**服务器之间**的场景

![image-20221102002252924](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221102002252924.png)

## 刷新令牌

![image-20221102002451225](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221102002451225.png)

## Flow 选型

### 授权流程渠道

> **前端**渠道：**资源服务器**不参与的交互过程
> **后端**渠道：**资源拥有者**不参与的交互过程

![image-20221102003325354](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221102003325354.png)

### 客户应用类型

![image-20221102003757461](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221102003757461.png)

### 适用场景

![image-20221102004111201](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221102004111201.png)

### 选型流程

> 第一方：内部应用

![image-20221102004642403](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221102004642403.png)

# 参考

1. [微服务架构实战 160 讲](https://time.geekbang.org/course/intro/100007001)
