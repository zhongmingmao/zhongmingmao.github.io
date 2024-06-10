---
title: Go Engineering - Error Code
mathjax: false
date: 2023-05-08 00:06:25
cover: https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/go-engineering-error-handling.jpeg
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
---

# 预期功能

1. 有业务 Code 码标识 - HTTP Code 码有限
2. 安全 - 对内对外展示不同的错误信息

<!-- more -->

# 设计方式

1. 无论请求成功与否，都返回 `200`，在 HTTP Body 中包含错误信息
   - HTTP Code 通常代表 HTTP Transport 层的状态信息
   - 缺点：性能不佳（需解析 Body） + 对客户端不友好
2. 返回 `4xx` or `5xx`，并在 Body 中返回`简单`的错误信息
3. 返回 `4xx` or `5xx`，并在 Body 中返回`详细`的错误信息 - 推荐

# 设计思路

1. 区别于 http status code，业务码需要有一定的`规则`，可以通过业务码判断出是哪类错误
2. 请求出错时，可以通过 http status code，直接感知到请求出错
3. 需要在请求出错时，返回详细的信息：`Code` + `Message` + `Reference`（Optional）
4. 返回的错误信息，需要是可以直接展示给用户的`安全信息`，不能包含`敏感信息`
   - 但同时也要有内部更详细的错误信息，方便 Debug
5. 返回的数据格式应该是固定的，规范的
6. 错误信息要保持简洁，并提供有用的信息

## Biz Code

> 纯数字表示，不同部位代表不同的服务，不同的模块

## HTTP Code

> net/http - 60

| Code | Short        | Desc                               |
| ---- | ------------ | ---------------------------------- |
| 1xx  | 指示信息     | 表示请求`已接收`，继续处理         |
| 2xx  | 请求成功     | 表示成功处理了请求                 |
| 3xx  | 请求被重定向 | 表示要完成请求，需要进一步操作     |
| 4xx  | 请求错误     | 代表请求可能出错，通常是客户端出错 |
| 5xx  | 服务端错误   | 服务器在尝试处理请求时发生错误     |

> 不建议 http status code 太多

1. 200 - 表示请求成功执行
2. 400 - 表示客户端出错
3. 500 - 表示服务端出错

> 最多再加 3 个 Code

1. 401 - 表示认证失败
2. 403 - 表示授权失败
3. 404 - 表示资源找不到

## Error Message

1. 对外暴露的错误，统一`大写开头`，结尾不需要 `.`
2. 对外暴露的错误要简洁，并能`准确说明问题`
3. 对外暴露的错误说明，应该是`怎么做`，而不是`哪里错`

> 如果返回结果中存在 code 字段，表示调用 API 接口失败

```json
{
  "code": 100101,
  "message": "Database error",
  "reference": "http://xxx"
}
```

> Mapping

```go
func init() {
	register(ErrUserNotFound, 404, "User not found")
	register(ErrUserAlreadyExist, 400, "User already exist")
	register(ErrReachMaxCount, 400, "Secret reach the max count")
	register(ErrSecretNotFound, 404, "Secret not found")
	register(ErrPolicyNotFound, 404, "Policy not found")
	register(ErrSuccess, 200, "OK")
	register(ErrUnknown, 500, "Internal server error")
	register(ErrBind, 400, "Error occurred while binding the request body to the struct")
	register(ErrValidation, 400, "Validation failed")
	register(ErrTokenInvalid, 401, "Token invalid")
	register(ErrPageNotFound, 404, "Page not found")
	register(ErrDatabase, 500, "Database error")
	register(ErrEncrypt, 401, "Error occurred while encrypting the user password")
	register(ErrSignatureInvalid, 401, "Signature is invalid")
	register(ErrExpired, 401, "Token expired")
	register(ErrInvalidAuthHeader, 401, "Invalid authorization header")
	register(ErrMissingHeader, 401, "The `Authorization` header was empty")
	register(ErrPasswordIncorrect, 401, "Password was incorrect")
	register(ErrPermissionDenied, 403, "Permission denied")
	register(ErrEncodingFailed, 500, "Encoding failed due to an error with the data")
	register(ErrDecodingFailed, 500, "Decoding failed due to an error with the data")
	register(ErrInvalidJSON, 500, "Data is not valid JSON")
	register(ErrEncodingJSON, 500, "JSON data could not be encoded")
	register(ErrDecodingJSON, 500, "JSON data could not be decoded")
	register(ErrInvalidYaml, 500, "Data is not valid Yaml")
	register(ErrEncodingYaml, 500, "Yaml data could not be encoded")
	register(ErrDecodingYaml, 500, "Yaml data could not be decoded")
}
```

