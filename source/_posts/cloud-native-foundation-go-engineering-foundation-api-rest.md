---
title: Go Engineering - Foundation - API - RESTful
mathjax: false
date: 2022-04-16 02:06:25
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

1. REST：**Representational state transfer**
2. REST 只是一种**软件架构风格**，是一组架构约束条件和原则，而不是技术框架
3. REST 有一系列**规范**，满足这些规范的 API 均可称为 **RESTful API**
4. REST 规范把所有内容都视为**资源**，对资源的**操作**对应 HTTP 协议提供的 **GET**、**POST**、**PUT** 和 **DELETE** 方法
5. 由于 REST 与 HTTP 协议**相辅相成**，因此 **HTTP** 协议已经成为 RESTful API 的**事实标准**

![409164157ce4cde3131f0236d660e092](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/409164157ce4cde3131f0236d660e092.webp)

<!-- more -->

# 特点

1. **以资源为中心**，一切都可以**抽象**成资源，所有行为都是对资源的 **CRUD**
   - **资源**对应着面向对象范式里面的**对象**
   - 资源使用 **URI** 标识，每个资源实例都有一个**唯一**的 URI 标识
2. **资源是有状态的**，使用 JSON/XML 等在 **HTTP Body** 里表征资源的状态
3. 客户端通过 **HTTP Method** 对资源进行**操作**，实现 REST
4. **无状态**：每个 RESTful API 请求都包含了所有**足够**完成本次操作的信息，服务器**无需保持 Session**
   - 无状态对于**服务端的弹性扩容**是很重要的

# 设计原则

> RESTful API 的核心是**规范**

## URI 设计

1. 资源名使用**名词复数**，资源分为 Collection 和 Member 两种
   - **Collection**：一堆资源的集合，如 `https://iam.api.marmotedu.com/users`
   - **Member**：单个特定资源，如 `https://iam.api.marmotedu/users/admin`
2. URI 结尾不应该包含 `/`
3. URI 中不能出现 `_`，统一使用 `-` -- **脊柱命名法**
4. URI 路径使用**小写**
5. 避免**层级过深**的 URI，如果超过 **2** 级，建议将其他资源转化为 `?` 参数
   - 不推荐：`/schools/tsinghua/classes/rooma/students/zhang`
   - 推荐：`/students?school=qinghua&class=rooma`
6. 某些情况，不好将操作映射为一个 REST 资源，可参考
   - 将一个操作变成资源的**属性**，如 `/users/zhangsan?active=false`
   - 将一个操作当作资源的**嵌套资源**，如 `PUT /gists/:id/star` 和 `DELETE /gists/:id/star`
   - 最后实在不行，可以不遵守这类规范，如 `/login`

## CRUD -> HTTP Method

> 使用 HTTP 协议原生的 GET、PUT（**修改**）、POST（**新建**） 和 DELETE 来标识对资源的 **CRUD** 操作

![d970bcd53d2827b7f2096e639d5fa82d](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/d970bcd53d2827b7f2096e639d5fa82d.webp)

> **安全性**：不会改变资源状态，即**只读**；**幂等性**：执行 1 次和执行 N 次，对资源状态改变的效果是**等价**的

![b746421291654e4d2e51509b885c4ee1](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/b746421291654e4d2e51509b885c4ee1.webp)

1. GET 返回的结果，要尽量可用于 PUT、POST 操作，保证信息的**一致性**
2. 对资源进行状态或者属性的**变更**，要用 **PUT** 方法，**POST** 方法用于**新建**
3. **批量删除**，推荐使用 `DELETE /users?ids=1,2,3`

## 统一的返回格式

> 降低用户的心智负担：每个 RESTful API 的返回格式、错误和正确消息的返回格式，都应该保持**一致**

## API 版本管理

| 位置   | 样例                                            | 备注 |
| ------ | ----------------------------------------------- | ---- |
| URL    | **`/v1/users`**                                 | 推荐 |
| Header | `Accept: vnd.example-com.foo+json; version=1.0` |      |
| Form   | `/users?version=v1`                             |      |

## API 命名

| 命名方式       | 样例               | 备注 |
| -------------- | ------------------ | ---- |
| **驼峰**命名法 | serverAddress      |      |
| **蛇形**命名法 | server_address     |      |
| **脊柱**命名法 | **server-address** | 推荐 |

## 统一：分页、过滤、排序、搜索

> REST 资源的查询接口，都需要实现分页、过滤、排序、搜索功能，可实现为**公共**的 API 组件

| 功能 | 备注                                   |
| ---- | -------------------------------------- |
| 分页 | `/users?offset=0&limit=20`             |
| 过滤 | `/users?fields=email,username,address` |
| 排序 | `/users?sort=age,desc`                 |
| 搜索 | 模糊匹配，等同于**垂直过滤**           |

## 域名

| 命名方式                      | 适用场景                                                     |
| ----------------------------- | ------------------------------------------------------------ |
| https://marmotedu.com/api     | API 将来不会有进一步的扩展                                   |
| https://iam.api.marmotedu.com | 使用**专用的 API 域名**，**便于扩展**，如 `storage.api.marmotedu.com` |





