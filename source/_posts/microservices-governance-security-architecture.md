---
title: Microservices - Security Architecture
mathjax: false
date: 2022-09-21 00:06:25
cover: https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/security-architecture.svg
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
  - Spring
  - Spring Security
  - Spring Security OAuth2
---

# Option 1

> Access Token 为**透明**令牌，API 网关需要去授权服务器**集中校验并兑换**成 JWT（自校验），然后再传递到后续的微服务
> 缺点：授权服务器压力比较大

![image-20221119222913389](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221119222913389.png)

<!-- more -->

# Option 2

> **全链路无状态**，API 网关与授权服务器约定**一致的 secret**，API 网关可以**直接解密** JWT（对称/非对称）
> 缺点：缺少集中校验 Token 的环节，无法通过授权服务器及时吊销，**只能等 Token 自然过期**

![image-20221119223436946](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221119223436946.png)

# Option 3

> **生产环境最为常用**：原理与 Option 1 类似，只是增加了 Redis 缓存

![image-20221119223959705](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221119223959705.png)

# Reference

1. [微服务架构实战 160 讲](https://time.geekbang.org/course/intro/100007001)

