---
title: Go Engineering - Foundation - API Doc
mathjax: false
date: 2022-04-30 02:06:25
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
---

# Swagger

1. Swagger 是一套围绕 **OpenAPI** 规范构建的开源工具，可以设计、构建、编写和使用 **REST API**
2. Swagger 工具
   - **Swagger Editor**
     - 基于**浏览器**的编辑器，可以在其中编写 **OpenAPI** 规范，并**实时预览** API 文档
   - **Swagger UI**
     - 将 **OpenAPI** 规范呈现为**交互式的 API 文档**，并可以在**浏览器**中尝试 **API 调用**
   - **Swagger Codegen**
     - 根据 **OpenAPI** 规范，生成**服务器存根**和**客户端代码库**

<!-- more -->

# Swagger vs OpenAPI

1. OpenAPI 是一个 **API 规范**，前身也叫 Swagger 规范
   - 通过定义一种用来描述 API 格式或者 API 定义的**语言**，来**规范** RESTful 服务开发过程
   - 目前最新的 OpenAPI 规范是 **OpenAPI 3.0** （即 **Swagger 2.0**）
2. OpenAPI 规范定义了一个 API 必须包含的**基本信息**
   - 描述、路径和操作、输入输出参数、验证方法等
3. **OpenAPI 是一个 API 规范，而 Swagger 是实现规范的工具**

# go-swagger

## 特性

> 基于**代码注释**自动生成 Swagger 文档，减少编写文档的时间，提高开发效率，并保证文档的**及时性**和**准确性**

1. 对比 swag，支持代码和注释**分开编写**
2. 根据 Swagger 定义文件生成**服务端**代码 -- 不够**优雅**，建议自行实现
3. 根据 Swagger 定义文件生成**客户端**代码 -- 即 **Go SDK**
4. **校验** Swagger 定义文件是否正确
5. 启动一个 **HTTP 服务器**，可以通过浏览器访问 API 文档
6. 根据 Swagger 文档定义的**参数**生成 Go Model **结构体定义**

## 命令行工具

![image-20220430232204334](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220430232204334.png)

## 注释语法

![947262c5175f6f518ff677063af293b3](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/947262c5175f6f518ff677063af293b3.webp)

## 解析注释

> `swagger generate` 找到 `main` 函数，**遍历**所有源码文件解释相关注释，自动生成 `swagger.yaml` 或者 `swagger.json`  

## 实践

### API 接口

> 保持了功能代码的简洁，这里并没有定义文档，而是定义在另一个 Go 包中

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

> Required: true，生成的 Swagger 文档会声明该字段为必须字段

```go api/user.go
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

![image-20220501003822179](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220501003822179.png)

### 编写 API 文档

> 为了保持代码简洁，在另一个 Go 包中（docs）编写带有 **go-swagger 注释**的 API 文档，需要在 main.go 中导入 docs 包

> 通过导入 docs 包，可以使 go-swagger 在**递归**解析 main 包（入口）的依赖包时，可以找到 docs 包，并解析包的注释

```go main.go
_ "github.com/marmotedu/gopractise-demo/swagger/docs"
```

> Package docs 后面的 `awesome.` 为 HTTP 服务名；`Documentation of our awesome API.` 为 API 描述

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

### 生成 Swagger API 文档

```
$ swagger generate spec -o swagger.yaml
```

![image-20220501004514214](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220501004514214.png)

### 启动 HTTP 服务

```
$ swagger serve --no-open -F=swagger --port 36666 swagger.yaml
2022/04/30 23:51:07 serving docs at http://localhost:36666/docs
```

![image-20220501004854354](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220501004854354.png)

![9a9fb7a31d418d8e4dc13b19cefa832c](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/9a9fb7a31d418d8e4dc13b19cefa832c.webp)

### 格式转换

```
$ swagger generate spec -i ./swagger.yaml -o ./swagger.json
```

### 接口文档定义

> swagger:route 后的格式： HTTP 方法、URL、Tag，相同 **Tag** 会被**分组**在一起

```go docs/user.go
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

![image-20220501001350339](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220501001350339.png)

## 其它功能

### 对比 Swagger 文档

```
$ swagger diff -d change.log swagger.new.yaml swagger.old.yaml

$ $ cat change.log

BREAKING CHANGES:
=================
/users:post Request - Body.Body.nickname.address.email.name.Body : User - Deleted property
compatibility test FAILED: 1 breaking changes detected
```

### 生成服务端代码

> 先定义 Swagger 接口文档，再基于 Swagger 文档生成服务端代码

```
$ mkdir go-user
$ cd go-user

$ swagger generate server -f ../swagger.yaml -A go-user

$ ls            
cmd     models  restapi

$ go run cmd/go-user-server/main.go -h
```

### 生成客户端代码

> API 接口的 Go SDK

```
$ swagger generate client -f ../swagger.yaml -A go-user

$ ls            
client  cmd     models  restapi
```

### 校验 Swagger 文档是否合法

```
$ swagger validate swagger.yaml
2022/05/01 00:24:25 
The swagger spec at "swagger.yaml" is valid against swagger specification 2.0
```

### 合并 Swagger 文档

```
$ swagger mixin swagger_part1.yaml swagger_part2.yaml
```
