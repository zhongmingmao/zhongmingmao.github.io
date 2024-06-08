---
title: Go Engineering - Elegant Project
mathjax: false
date: 2023-05-01 00:06:25
cover: https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/go-engineering-elegant-project.gif
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
---

# 优雅项目

![image-20240608182301105](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240608182301105.png)

<!-- more -->

# Go 应用

![image-20240608182336067](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240608182336067.png)

## 代码结构

> 按`功能`拆分 - Kubernetes / Docker / Helm / Prometheus

## 代码规范

1. 编码规范 - https://github.com/xxjwxc/uber_go_guide_cn
2. 静态代码检查 - https://github.com/golangci/golangci-lint
3. 最佳实践
   - https://go.dev/doc/effective_go
   - https://go.dev/wiki/CodeReviewComments
   - https://rakyll.org/style-packages/

## 代码质量

1. 单元测试
   - 可测试
     - 将依赖的数据库等抽象成`接口`，在被测代码中调用接口的方法，在测试时传入 `Mock` 类型
     - 尽量减少 function 中的依赖 + 依赖是容易 Mock 的
   - 高覆盖率
2. Code Review

![image-20240608210144983](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240608210144983.png)

### Mock 工具

1. https://github.com/golang/mock
   - 官方 Mock 框架，与 Golang 内置的 testing 包集成，最常用
   - 实现基于 `interface` 的 Mock 功能
2. https://github.com/DATA-DOG/go-sqlmock
   - 模拟数据库连接
3. https://github.com/jarcoal/httpmock
   - 模拟 HTTP 请求
4. https://github.com/bouk/monkey
   - 通过`替换函数指针`的方式来修改任意函数的实现

### 高覆盖率

1. 使用 `gotests` 自动生成单元测试代码
2. 定期检查单元测试覆盖率

```
$ go test -race -cover  -coverprofile=./coverage.out -timeout=10m -short -v ./...
$ go tool cover -func ./coverage.out
```

![image-20240608212421572](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240608212421572.png)

## 编程哲学

1. 面向`接口`编程
   - 接口的作用：为不同层级的模块提供一个定义好的`中间层`
2. 面向`对象`编程
   - Go `不支持` OOP，但可以利用自身特性实现类似效果

![image-20240608225947444](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240608225947444.png)

## 软件设计方法

### 设计模式

> 针对`特定场景`的最佳实现方式，同样适用于 Go

![image-20240608231655789](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240608231655789.png)

### SOLID 原则

> 偏重设计原则 - https://github.com/marmotedu/geekbang-go/blob/master/SOLID原则介绍.md

![image-20240608231811398](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240608231811398.png)

# 项目管理

![image-20240608233257049](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240608233257049.png)

## 工具

![image-20240608233757584](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240608233757584.png)
