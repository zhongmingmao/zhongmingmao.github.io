---
title: Infrastructure - Authentication - LDAP
mathjax: false
date: 2022-03-26 01:06:25
categories:
    - Infrastructure
    - Authentication
tags:
    - Infrastructure
    - Authentication
    - JWT
---

# What is LDAP

<iframe width="560" height="315" src="https://www.youtube.com/embed/SK8Yw-CiRHk" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

<!-- more -->

# 目录服务

1. 目录 ≈ **树状结构的数据库**
2. 目录服务 ≈ 以树状结构的目录数据库为基础，外加各种访问协议的**信息查询服务**
3. 目录数据库 vs 关系型数据库：**读取性能极高，写入性能非常差（不支持事务），不适合频繁修改数据**
4. 用途：**具有层次性且不需要频繁修改**的数据，例如企业员工信息、企业设备信息等

# LDAP

1. DAP = Directory Access Protocol
2. **X.500** 是一套**目录服务的标准**（协议族）
   - 通过 X.500 可以将**局部的目录服务**连接起来，构建基于 Internet 的**分布在全球的目录服务系统**
3. DAP 是 X.500 的核心组成之一，但非常**复杂**，因此诞生了 LDAP
   - LDAP 是基于 X.500 的 DAP 发展而来，目前是第 3 版
4. LDAP 特点
   - 基于 **TCP/IP**
   - 以**树状结构**存储数据
   - **读取速度快，写入速度慢**
   - **服务端用于存放数据，客户端用于操作数据**
   - **跨平台**，维护简单
   - 支持 **SSL/TLS** 加密
   - 协议是**开放**的

# 样例

![image-20220327180136057](https://infrastructure-1253868755.cos.ap-guangzhou.myqcloud.com/authentication/image-20220327180136057.png)

![image-20220327180258154](https://infrastructure-1253868755.cos.ap-guangzhou.myqcloud.com/authentication/image-20220327180258154.png)

![image-20220327180241908](https://infrastructure-1253868755.cos.ap-guangzhou.myqcloud.com/authentication/image-20220327180241908.png)
