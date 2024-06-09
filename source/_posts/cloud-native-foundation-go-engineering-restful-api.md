---
title: Go Engineering - RESTful API
mathjax: false
date: 2023-05-03 00:06:25
cover: https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/go-engineering-restful-api.jpeg
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
---

# 概念

> Representational State Transfer

1. REST 只是一种`软件架构风格`
2. REST 有一系列规范，满足这些规范的 API 称为 RESTful API
3. REST 规范将所有内容都视为资源，REST 架构对资源的操作对应 HTTP 协议提供的方法
4. REST 风格适用于很多`传输协议`，并且 REST 天生与 HTTP 协议相辅相成
   - HTTP 协议成为了实现 RESTful API 的`事实标准`

<!-- more -->

![image-20240609161833740](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240609161833740.png)

> REST 是一种`规范`，而 RESTful API 是满足 REST 规范的 API 接口

> RESTful API 的核心是`规范`

# 特点

1. 以资源为中心，所有东西都抽象成资源，所有行为都应该在资源上的 CRUD 操作
   - 资源对应 OOP 中的对象
   - 资源使用 `URI` 标识，每个资源实例都有唯一的 URI 标识
2. 资源是`有状态`的，使用 JSON/XML 等在 HTTP  Body 里表征资源的状态
3. 客户端通过 `HTTP 动词`，对服务端资源进行操作，实现 Representational State Transfer
4. 操作是`无状态`的，每个 RESTful API 请求都包含了所有足够完成本次操作的信息，服务端无需保持 `session`

# 设计原则

## URI 设计

> 资源都使用 URI 标识

1. 资源名使用`名词复数`
   - Collection - `/users`
   - Member - `/users/admin`
2. 结尾不应该包含 `/`
3. 不能出现 `_`，统一采用 `-`
4. 路径采用`小写`
5. `层级`不宜过深，可以考虑将资源转化为 `?` 参数
   - 不推荐 - `/schools/tsinghua/classes/rooma/students/zhang`
   - 推荐 - `/students?school=qinghua&class=rooma`
6. 如果操作不好映射为一个 REST 资源
   - 将一个操作变成资源的一个`属性`
     - /users/zhangsan?active=false
   - 将操作当作一个资源的`嵌套资源`
     - PUT /gists/:id/star
     - DELETE /gists/:id/star
   - 打破规范，操作直接当成个资源
     - /login

## 方法映射

> _POST - Create / PUT - Replace or Updata_

![image-20240609164202018](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240609164202018.png)

> 安全（只读） + 幂等

![image-20240609164504542](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240609164504542.png)

1. GET 返回的结果，能在 PUT / POST 中`复用`
2. 对资源进行状态/属性`变更`，要用 `PUT` 方法；`POST` 仅用于`创建`或者`批量创建`
3. 批量删除 - `DELETE /users?ids=1,2,3`

## 返回格式

1. 保持一致

## 版本管理

| Carrier | Example                                       |
| ------- | --------------------------------------------- |
| Path    | /v1/users                                     |
| Header  | Accept: vnd.example-com.foo+json; version=1.0 |
| Query   | /users?version=v1                             |

## 命名方式

| Naming | Example        |
| ------ | -------------- |
| 驼峰   | serverAddress  |
| 蛇形   | server_address |
| 脊柱   | server-address |

## 分页/过滤/排序/搜索

| Function        | Example                              |
| --------------- | ------------------------------------ |
| 分页            | /users?offset=0&limit=20             |
| 过滤 - 资源属性 | /users?fields=email,username,address |
| 排序            | /users?sort=age,desc                 |
| 搜索 - 模糊匹配 |                                      |

## 域名

1. storage.api.zhongmingmao.top
2. network.api.zhongmingmao.top
3. ...
