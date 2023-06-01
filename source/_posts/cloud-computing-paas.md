---
title: Cloud Computing - PaaS
mathjax: false
date: 2022-10-17 00:06:25
cover: https://cloud-computing-1253868755.cos.ap-guangzhou.myqcloud.com/PAAS-cover-min.webp
categories:
  - Cloud Computing
  - PaaS
tags:
  - Cloud Computing
  - PaaS
---

# 概述

> PaaS 在 IaaS 的基础上，构建了很多`关键抽象`和`可复用的单元`，让用户更`聚焦业务`

<!-- more -->

# 优势

1. PaaS 更符合云的初衷，代表了一种`完全托管`的理想主义，代表对`研发生产力`的极致追求
2. 核心优势：`生产力`（搭建 + 运维）

# 维度

1. PaaS 服务是否带有`内生`的`运行环境`（Web 服务带有`编程语言运行时`、数据库服务带有 `SQL 执行引擎`）
2. PaaS 存在的`位置`和`范围`，以及开放给用户的`控制粒度` -- `Region` / `Availability zone` / `VPC`
3. PaaS 服务是否`有状态`（数据属性）
4. PaaS 服务的`虚拟机`是否`对外暴露`
   - `暴露`虚拟机的 PaaS 服务，拥有更高的`开放程度`，与 `IaaS` 的结合也更加紧密，`成本更低`
   - `不暴露`虚拟机的 PaaS 服务，拥有更好的`独立性`和`封装性` -- 数据库服务

# 权衡

> PaaS 的核心理念在于`封装`：封装提升了`效率`，但牺牲了`灵活性`

