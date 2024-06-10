---
title: Go Engineering - Doc
mathjax: false
date: 2023-05-07 00:06:25
cover: https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/go-engineering-doc.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
  - Swagger
---

# Swagger

> Swagger 是一套围绕 OpenAPI 规范构建的开源工具

| Component       | Desc                                                         |
| --------------- | ------------------------------------------------------------ |
| Swagger Editor  | 基于浏览器的编辑器，可以编写 OpenAPI 规范，并实时预览        |
| Swagger UI      | 将 OpenAPI 规范呈现为交互式 API 文档                         |
| Swagger Codegen | 根据 OpenAPI 规范，生成`服务器存根`和`客户端代码库`，涵盖 40 多种语言 |

<!-- more -->

# OpenAPI

1. OpenAPI 是一个 `API 规范`，其前身为 `Swagger 规范`
   - 通过定义一种用来描述 API 格式或者 API 定义的 `DSL`，来规范 `RESTful API` 的开发过程
   - `OpenAPI 3.0 ≈ Swagger 2.0`
2. API 基本信息
   - 对 API 的描述，介绍 API 可以实现的功能
   - 每个 API 上可用的 `Path` 和 `Method`
   - 每个 API 的输入和返回参数
   - 验证方法
   - 联系信息、许可证、使用条款和其它信息
3. OpenAPI 是一个 API 规范，而 Swagger 是实现该 API 规范的工具

# go-swagger

## 特性

1. 功能强大、高性能、可以根据`代码注释`生成 `Swagger` API 文档
2. 根据 Swagger 定义文件生成服务端代码 - 如果不够优雅，可自行编写
3. 根据 Swagger 定义文件生成客户端代码 - Go SDK
4. 校验 Swagger 定义文件是否正确
5. 启动一个 HTTP 服务器，通过浏览器访问 API 文档
6. 根据 Swagger 文档定义的参数生成 `Go Model` 结构体定义

## 命令

![image-20240610161030735](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240610161030735.png)

## 注释

| Annotation         | Desc                       |
| ------------------ | -------------------------- |
| swagger:meta       | 定义 API 接口全局基本信息  |
| swagger:route      | 定义路由信息               |
| swagger:parameters | 定义 API 请求参数          |
| swagger:response   | 定义 API 响应参数          |
| swagger:model      | 定义可以复用的 Go 数据结构 |
| swagger:allOf      | `嵌入`其它 Go 结构体       |
| swagger:strfmt     | 定义格式化的字符串         |
| swagger:ignore     | 定义要忽略的结构体         |

## 解析

> 找到 `main` 函数，然后遍历所有源码文件，解析源码中与 Swagger 相关的 Annotation，生成 API  文档

### 业务代码

> go-swagger 能递归解析到 doc 包

```go main.go
package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/marmotedu/gopractise-demo/swagger/api"
	// This line is necessary for go-swagger to find your docs!
	_ "github.com/marmotedu/gopractise-demo/swagger/docs"
)

var users []*api.User

func main() {
	r := gin.Default()
	r.POST("/users", Create)
	r.GET("/users/:name", Get)

	log.Fatal(r.Run(":5555"))
}

// Create create a user in memory.
func Create(c *gin.Context) {
	var user api.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error(), "code": 10001})
		return
	}

	for _, u := range users {
		if u.Name == user.Name {
			c.JSON(http.StatusBadRequest, gin.H{"message": fmt.Sprintf("user %s already exist", user.Name), "code": 10001})
			return
		}
	}

	users = append(users, &user)
	c.JSON(http.StatusOK, user)
}

// Get return the detail information for a user.
func Get(c *gin.Context) {
	username := c.Param("name")
	for _, u := range users {
		if u.Name == username {
			c.JSON(http.StatusOK, u)
			return
		}
	}

	c.JSON(http.StatusBadRequest, gin.H{"message": fmt.Sprintf("user %s not exist", username), "code": 10002})
}
```

> Required: true

```go api/user.go
// Package api defines the user model.
package api

// User represents body of User request and response.
type User struct {
	// User's name.
	// Required: true
	Name string `json:"name"`

	// User's nickname.
	// Required: true
	Nickname string `json:"nickname"`

	// User's address.
	Address string `json:"address"`

	// User's email.
	Email string `json:"email"`
}
```

### 文档代码

> awesome - HTTP 服务名

```go docs/doc.go
// Package docs awesome.
//
// Documentation of our awesome API.
//
//     Schemes: http, https
//     BasePath: /
//     Version: 0.1.0
//     Host: some-url.com
//
//     Consumes:
//     - application/json
//
//     Produces:
//     - application/json
//
//     Security:
//     - basic
//
//    SecurityDefinitions:
//    basic:
//      type: basic
//
// swagger:meta
package docs
```

> swagger:route POST /users user createUserRequest

1. 格式：Method URL Tag ID
2. 可以填写多个 Tag，相同 Tag 的 API 接口在 Swagger 文档会被分为一组
3. ID 为标识符，连接 swagger:route 和 swagger:parameters

```go docs/user.go
package docs

import (
	"github.com/marmotedu/gopractise-demo/swagger/api"
)

// swagger:route POST /users user createUserRequest
// Create a user in memory.
// responses:
//   200: createUserResponse
//   default: errResponse

// swagger:route GET /users/{name} user getUserRequest
// Get a user from memory.
// responses:
//   200: getUserResponse
//   default: errResponse

// swagger:parameters createUserRequest
type userParamsWrapper struct {
	// This text will appear as description of your request body.
	// in:body
	Body api.User
}

// This text will appear as description of your request url path.
// swagger:parameters getUserRequest
type getUserParamsWrapper struct {
	// in:path
	Name string `json:"name"`
}

// This text will appear as description of your response body.
// swagger:response createUserResponse
type createUserResponseWrapper struct {
	// in:body
	Body api.User
}

// This text will appear as description of your response body.
// swagger:response getUserResponse
type getUserResponseWrapper struct {
	// in:body
	Body api.User
}

// This text will appear as description of your error response body.
// swagger:response errResponse
type errResponseWrapper struct {
	// Error code.
	Code int `json:"code"`

	// Error message.
	Message string `json:"message"`
}
```

> 生成 Swagger API 文档，-F 可选 `swagger` 和 `redoc`

```
$ swagger generate spec -o swagger.yaml

$ swagger serve --no-open -F=redoc --port 36666 swagger.yaml
```

![image-20240610164822490](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240610164822490.png)

![image-20240610170145982](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240610170145982.png)

> 格式转换：YAML -> JSON

```
$ swagger generate spec -i ./swagger.yaml -o ./swagger.json
```

## 其它

> 对比 Swagger 文档

```
$ swagger diff -d change.log swagger.new.yaml swagger.old.yaml
```

> 生成服务端代码

```
$ swagger generate server -f ../swagger.yaml -A go-user

$ tree
.
├── cmd
│   └── go-user-server
│       └── main.go
├── models
│   └── user.go
└── restapi
    ├── configure_go_user.go
    ├── doc.go
    ├── embedded_spec.go
    ├── operations
    │   ├── go_user_api.go
    │   └── user
    │       ├── create_user_request.go
    │       ├── create_user_request_parameters.go
    │       ├── create_user_request_responses.go
    │       ├── create_user_request_urlbuilder.go
    │       ├── get_user_request.go
    │       ├── get_user_request_parameters.go
    │       ├── get_user_request_responses.go
    │       └── get_user_request_urlbuilder.go
    └── server.go

$ go run cmd/go-user-server/main.go -h
Usage:
  main [OPTIONS]

Documentation of our awesome API.

Application Options:
      --scheme=            the listeners to enable, this can be repeated and defaults to the schemes in the swagger spec
      --cleanup-timeout=   grace period for which to wait before killing idle connections (default: 10s)
      --graceful-timeout=  grace period for which to wait before shutting down the server (default: 15s)
      --max-header-size=   controls the maximum number of bytes the server will read parsing the request header's keys and values, including the request line. It does not limit the size
                           of the request body. (default: 1MiB)
      --socket-path=       the unix socket to listen on (default: /var/run/go-user.sock)
      --host=              the IP to listen on (default: localhost) [$HOST]
      --port=              the port to listen on for insecure connections, defaults to a random value [$PORT]
      --listen-limit=      limit the number of outstanding requests
      --keep-alive=        sets the TCP keep-alive timeouts on accepted connections. It prunes dead TCP connections ( e.g. closing laptop mid-download) (default: 3m)
      --read-timeout=      maximum duration before timing out read of the request (default: 30s)
      --write-timeout=     maximum duration before timing out write of the response (default: 30s)
      --tls-host=          the IP to listen on for tls, when not specified it's the same as --host [$TLS_HOST]
      --tls-port=          the port to listen on for secure connections, defaults to a random value [$TLS_PORT]
      --tls-certificate=   the certificate to use for secure connections [$TLS_CERTIFICATE]
      --tls-key=           the private key to use for secure connections [$TLS_PRIVATE_KEY]
      --tls-ca=            the certificate authority file to be used with mutual tls auth [$TLS_CA_CERTIFICATE]
      --tls-listen-limit=  limit the number of outstanding requests
      --tls-keep-alive=    sets the TCP keep-alive timeouts on accepted connections. It prunes dead TCP connections ( e.g. closing laptop mid-download)
      --tls-read-timeout=  maximum duration before timing out read of the request
      --tls-write-timeout= maximum duration before timing out write of the response

Help Options:
  -h, --help               Show this help message
```

> 生成客户端代码

```
$ swagger generate client -f ../swagger.yaml -A go-user

$ tree
.
├── client
│   ├── go_user_client.go
│   └── user
│       ├── create_user_request_parameters.go
│       ├── create_user_request_responses.go
│       ├── get_user_request_parameters.go
│       ├── get_user_request_responses.go
│       └── user_client.go
├── cmd
│   └── go-user-server
│       └── main.go
├── go.mod
├── go.sum
├── models
│   └── user.go
└── restapi
    ├── configure_go_user.go
    ├── doc.go
    ├── embedded_spec.go
    ├── operations
    │   ├── go_user_api.go
    │   └── user
    │       ├── create_user_request.go
    │       ├── create_user_request_parameters.go
    │       ├── create_user_request_responses.go
    │       ├── create_user_request_urlbuilder.go
    │       ├── get_user_request.go
    │       ├── get_user_request_parameters.go
    │       ├── get_user_request_responses.go
    │       └── get_user_request_urlbuilder.go
    └── server.go
```

> 验证 Swagger 文档是否合法

```
$ swagger validate swagger.yaml
2023/05/07 17:08:57
The swagger spec at "swagger.yaml" is valid against swagger specification 2.0
```

> 合并 Swagger 文档

```
$ swagger mixin swagger_part1.yaml swagger_part2.yaml
```



