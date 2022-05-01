---
title: Go Engineering - Foundation - Error - Code
mathjax: false
date: 2022-05-01 00:06:25
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
---

# 设计方式

> 场景：用户账号没有找到

## 200

> HTTP Code 通常代表的是 **HTTP Transport** 层的状态信息；但对**性能**有一定的影响，因为需要解析 **HTTP Body**

```json
{
  "error": {
    "message": "Syntax error \"Field picture specified more than once. This is only possible before version 2.1\" at character 23: id,name,picture,picture",
    "type": "OAuthException",
    "code": 2500,
    "fbtrace_id": "xxxxxxxxxxx"
  }
}
```

<!-- more -->

## 4xx + 简单信息

> 可以让客户端快速感知请求失败，但提供的信息过于简单，**不能准确地定位问题**

```
HTTP/1.1 400 Bad Request
x-connection-hash: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
set-cookie: guest_id=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Date: Thu, 01 Jun 2017 03:04:23 GMT
Content-Length: 62
x-response-time: 5
strict-transport-security: max-age=631138519
Connection: keep-alive
Content-Type: application/json; charset=utf-8
Server: tsa_b

{"errors":[{"code":215,"message":"Bad Authentication data."}]}
```

## 4xx + 详细信息

> **推荐**：快速判断出错 + 准确定位问题

```
HTTP/1.1 400
Date: Thu, 01 Jun 2017 03:40:55 GMT
Content-Length: 276
Connection: keep-alive
Content-Type: application/json; charset=utf-8
Server: Microsoft-IIS/10.0
X-Content-Type-Options: nosniff

{"SearchResponse":{"Version":"2.2","Query":{"SearchTerms":"api error codes"},"Errors":[{"Code":1001,"Message":"Required parameter is missing.","Parameter":"SearchRequest.AppId","HelpUrl":"http\u003a\u002f\u002fmsdn.microsoft.com\u002fen-us\u002flibrary\u002fdd251042.aspx"}]}}
```

# 设计建议

1. 返回的数据格式应该是**固定**的，**规范**的
2. **http status code**
   - 可以通过 http status code **直接感知**到请求出错
3. **业务码**需要有一定的**规则**，可以**快速判断**是哪类错误
   - 返回**详细**信息：**业务 Code**、**错误信息**（简明扼要）、**参考文档（可选）**
   - 返回的错误信息，不能包含**敏感**信息，但要包含**内部**更详细的错误信息，方便 Debug

## 业务 Code 码

1. **方便定位问题**
2. Go 中的 HTTP 服务都是引用 net/http 包，只有 60 个错误码，基本都是与 HTTP 请求相关的错误码，且**业务无相关**
   - 在大型系统中，**完全不够用**
3. 业务开发过程中，可能需要依据错误类型，以便做**定制**的逻辑处理
4. 业务 Code 码：**整数**、**整型字符串**、**字符型字符串**

> 设计规范：**纯数字**表示，不同部分代表不同的服务和模块

100101

| 部分 | 代表                 |
| ---- | -------------------- |
| 10   | 某个服务             |
| 01   | 某个服务下的某个模块 |
| 01   | 模块下的错误码序号   |

## HTTP Status Code

| Code    | Desc                                                       |
| ------- | ---------------------------------------------------------- |
| **1xx** | **指示信息**：请求已接收，**继续处理**                     |
| **2xx** | **请求成功**：成功处理了请求                               |
| **3xx** | **请求被重定向**：要完成请求，需要**进一步**操作           |
| **4xx** | **请求错误**：通常是客户端出错，需要客户端做进一步处理     |
| **5xx** | **服务器错误**：通常是服务器在尝试处理请求时发生的内部错误 |

> 建议：只需要 3 个 HTTP Status Code：**200、400、500**，最多再加 3 个：**401**（**认证**失败）、**403**（**授权**失败）、**404**

# 实践

## 服务 + 模块

![2b1ed2f4333fdfe8e4df1d67083443b1](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/2b1ed2f4333fdfe8e4df1d67083443b1.webp)

## 错误信息规范

1. 对外暴露的错误，统一**大写开头**，结尾没有`.`
2. 对外暴露的错误要**简明扼要**，准确说明问题
3. 对外暴露的错误，应该关注《**该怎么处理**》
4. 对外暴露的错误，不能包含**敏感**信息

## 接口返回值

> 返回结果中存在 **code** 字段，表示调用 API 接口失败

```json http code: 500
{
  "code": 100101,
  "message": "Database error",
  "reference": "https://github.com/marmotedu/iam/tree/master/docs/guide/zh-CN/faq/iam-apiserver"
}
```

