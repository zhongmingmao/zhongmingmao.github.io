---
title: DevOps - Feature Flag-Driven Development
mathjax: false
date: 2022-09-22 00:06:25
cover: https://devops-1253868755.cos.ap-guangzhou.myqcloud.com/feature-flag-driven-development.png
categories:
  - DevOps
tags:
  - Architecture
  - Cloud Native
  - Microservices
  - DevOps
---

# Feature Flag-Driven Development

> DevOps 最佳实践

![image-20221120150054348](https://devops-1253868755.cos.ap-guangzhou.myqcloud.com/image-20221120150054348.png)

<!-- more -->

# Continuous Delivery

> **Feature flag-driven** 比 **Agile & test-driven** 的反馈周期更短，**交付效率更高**

![](https://devops-1253868755.cos.ap-guangzhou.myqcloud.com/cicd-feature-flag-driven-development.avif)

# Long Lived Branch

> **Merge Hell**

![image-20221120151246154](https://devops-1253868755.cos.ap-guangzhou.myqcloud.com/image-20221120151246154.png)

> TBD: **Trunk** based Development
> 不能随意开分支

![image-20221120151621210](https://devops-1253868755.cos.ap-guangzhou.myqcloud.com/image-20221120151621210.png)

> Branch by **Abstraction** 重构 -- **抽象接口 + 配置中心**

![image-20221120154711234](https://devops-1253868755.cos.ap-guangzhou.myqcloud.com/image-20221120154711234.png)

> 案例：**Feature flag-driven** Development + **Trunk based** Development -- 依赖于**配置中心**

![image-20221120152441336](https://devops-1253868755.cos.ap-guangzhou.myqcloud.com/image-20221120152441336.png)

> Re-planning -- 业务功能**回退方便**，非常**灵活**

![image-20221120153135533](https://devops-1253868755.cos.ap-guangzhou.myqcloud.com/image-20221120153135533.png)

# Comparison

| 优势                                                   | 劣势                                  |
| ------------------------------------------------------ | ------------------------------------- |
| **降低发布风险**：通过开关，实现新功能和代码发布的分离 | **代码侵入，有技术债** - 个人不能接受 |
| **迭代速度快**                                         | 需要配置中心支持                      |
| 投入成本低：无需开发和维护复杂的发布系统               | 需要 DevOps 文化和流程配合            |
| **减少 Merge hell 问题**                               |                                       |

# Reference

1. [微服务架构实战 160 讲](https://time.geekbang.org/course/intro/100007001)
