---
title: Apollo - HA + Monitoring
mathjax: false
date: 2022-09-25 00:06:25
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

![image-20221120223535438](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/apollo/image-20221120223535438.png)

<!-- more -->

# HA

| Scene                        | Influence               | Downgrade                                        | Reason                |
| ---------------------------- | ----------------------- | ------------------------------------------------ | --------------------- |
| 某台 Config Service 下线     | 无影响                  |                                                  | Config Service 无状态 |
| **所有 Config Service 下线** | Client 无法获取最新配置 | Client **重启**可获取**本地缓存配置**            |                       |
| 某台 Admin Service 下线      | 无影响                  |                                                  | Admin Service 无状态  |
| 所有 Admin Service 下线      | 用户无法管理配置        |                                                  |                       |
| 某台 Portal 下线             | 无影响                  |                                                  | Portal 无状态         |
| 所有 Portal 下线             | 用户无法管理配置        |                                                  |                       |
| **数据库宕机**               | 用户无法管理配置        | **Config Service 开启缓存**<br />Client 不受影响 |                       |

# Monitoring

> **CAT + Prometheus**

![image-20221120234847387](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/apollo/image-20221120234847387.png)

# Reference

1. [微服务架构实战 160 讲](https://time.geekbang.org/course/intro/100007001)