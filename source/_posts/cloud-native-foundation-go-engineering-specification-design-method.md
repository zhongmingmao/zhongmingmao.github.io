---
title: Go Engineering - Specification - Design Method
mathjax: false
date: 2022-04-16 00:06:25
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
---

# Go 项目

> Go 项目是一个偏**工程化**的概念，包含 Go 应用

![b051da025c897996473df44693ea4ecc](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/b051da025c897996473df44693ea4ecc.webp)

<!-- more -->

# Go 应用

![2392d94feb95d3d64d765abe7d6e5e69](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/2392d94feb95d3d64d765abe7d6e5e69.webp)

## 代码结构

### 按层拆分

> 最大的问题：相同功能可能在不同层被使用，而这些功能又分散在不同的层中，容易造成**循环引用**

![ed0c3dfyy52ac82539cb602eec9f0146](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/ed0c3dfyy52ac82539cb602eec9f0146.webp)

```
├── controllers
│   ├── billing
│   ├── order
│   └── user
├── models
│   ├── billing.go
│   ├── order.go
│   └── user.go
└── views
    └── layouts
```

### 按功能拆分

> Go 项目**最常用**的拆分方法
>
> 1. 不同模块，功能单一，可以实现**高内聚低耦合**的设计哲学
> 2. 所有功能只实现一遍，**引用逻辑清晰**，大大减少循环引用的概率

![0d65eb1363bf8055e209bc24d1d99ca5](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/0d65eb1363bf8055e209bc24d1d99ca5.webp)

```
pkg
├── billing
├── order
│   └── order.go
└── user
```

## 代码规范

### 编码规范

1. [Uber Go 语言编码规范](https://github.com/xxjwxc/uber_go_guide_cn)
2. 静态代码检查工具：[golangci-lint](https://github.com/golangci/golangci-lint)

### 最佳实践

1. [Effective Go](https://go.dev/doc/effective_go)
2. [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments)
3. [Style guideline for Go packages](https://rakyll.org/style-packages/)

## 代码质量

### 编写可测试的代码

> 可测试：如果函数的**所有代码**均能在**单元测试环境**下**按预期被执行**

![0cef423ec1a4f06f6f4715bd0b9f4497](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/0cef423ec1a4f06f6f4715bd0b9f4497.webp)

> ListPosts 函数不可测试，因为依赖于一个 gRPC 连接

```go
package post

import "google.golang.org/grpc"

type Post struct {
	Name    string
	Address string
}

func ListPosts(client *grpc.ClientConn) ([]*Post, error) {
	// use client to do something
	return nil, nil
}
```

> 可测试的代码，将**函数入参**改为 Service **接口类型**，只需要传入一个实现了 Service 接口的实例，函数便可执行成功

```go main.go
package main

type Post struct {
	Name    string
	Address string
}

type Service interface {
	ListPosts() ([]*Post, error)
}

func ListPosts(service Service) ([]*Post, error) {
	return service.ListPosts()
}
```

```go main_test.go
package main

import "testing"

type fakeService struct {
}

// Duck Typing
func (s *fakeService) ListPosts() ([]*Post, error) {
	posts := make([]*Post, 0)
	posts = append(posts, &Post{
		Name:    "colin",
		Address: "Shenzhen",
	})
	posts = append(posts, &Post{
		Name:    "alex",
		Address: "Beijing",
	})
	return posts, nil
}

func TestListPosts(t *testing.T) {
	if _, err := ListPosts(&fakeService{}); err != nil {
		t.Fatal("list posts failed")
	}
}
```

```
=== RUN   TestListPosts
--- PASS: TestListPosts (0.00s)
PASS
```

| Mock 工具                                            | 描述                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| [golang/mock](https://github.com/golang/mock)        | **官方**，最常用，与 **testing** 集成很好，**实现了基于 interface 的 Mock 功能** |
| [go-sqlmock](https://github.com/DATA-DOG/go-sqlmock) | Mock 数据库连接                                              |
| [httpmock](https://github.com/jarcoal/httpmock)      | Mock HTTP请求                                                |
| [bouk/monkey](https://github.com/bouk/monkey)        | 能够通过**替换函数指针**的方式来修改**任意函数**的实现，**最终解决方案** |

### 高单元测试覆盖率

1. 使用 gotests 或者 GoLand **自动生成**单元测试代码
2. 定期检查单元测试的覆盖率

```
$ gotests -all -w -i main.go 
Generated TestListPosts

$ go test -race -cover -coverprofile=./coverage.out -timeout=10m -short -v ./...
=== RUN   TestListPosts
--- PASS: TestListPosts (0.00s)
PASS
coverage: 0.0% of statements
ok      github.com/zhongmingmao/utest   0.021s  coverage: 0.0% of statements

$ go tool cover -func ./coverage.out
github.com/zhongmingmao/utest/main.go:12:       ListPosts       0.0%
total:                                          (statements)    0.0%
```

### Code Review

1. GitHub / GitLab

## 编程哲学

### 面向接口编程

1. Go 接口是**方法的集合**
2. **Duck Typing**：任何类型只要实现了接口中的方法集，则实现了该接口
3. 接口的作用：为不同层级的模块提供一个定义好的**中间层**，可以对上下游进行**解耦**

```go
package main

import "fmt"

type Bird interface {
	Fly()
	Type() string
}

type Canary struct {
	Name string
}

func (receiver *Canary) Fly() {
	fmt.Printf("Canary[%v] is Flying\n", receiver.Name)
}

func (receiver *Canary) Type() string {
	return fmt.Sprintf("Canary[%v]", receiver.Name)
}

type Crow struct {
	Name string
}

func (receiver *Crow) Fly() {
	fmt.Printf("Crow[%v] is Flying\n", receiver.Name)
}

func (receiver *Crow) Type() string {
	return fmt.Sprintf("Crow[%v]", receiver.Name)
}

func LetItFly(bird Bird) {
	fmt.Printf("Let %s Fly\n", (bird).Type())
	bird.Fly()
}

func main() {
	LetItFly(&Canary{"A"})
	LetItFly(&Crow{"B"})
	// Let Canary[A] Fly
	// Canary[A] is Flying
	// Let Crow[B] Fly
	// Crow[B] is Flying
}
```

### 面向对象编程

1. 在**必要**时（接近于**自然**的思考方式），Go 应用也应该采用 OOP
2. **Go 不支持 OOP**，可以通过语言级的特性来实现**类似**的效果
   - 结构体：类、抽象、封装
   - 结构体变量：实例
   - 继承通过**组合**来实现
     - 组合：**结构体的嵌套**
   - 接口：多态

![27c84757b1f4626e84535d994ca70eb8](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/27c84757b1f4626e84535d994ca70eb8.webp)

```go
package main

import "fmt"

type Bird struct {
	Type string
}

func (receiver *Bird) Class() string {
	return receiver.Type
}

type Birds interface {
	Class() string
	Name() string
}

type Canary struct {
	Bird // 通过匿名字段实现继承：Bird 为 Canary 的父类，Canary 继承了 Bird 的属性和方法
	name string
}

func (receiver *Canary) Name() string {
	return receiver.name
}

type Crow struct {
	Bird
	name string
}

func (receiver *Crow) Name() string {
	return receiver.name
}

func NewCanary(name string) *Canary {
	return &Canary{
		Bird: Bird{Type: "Canary"},
		name: name,
	}
}

func NewCrow(name string) *Crow {
	return &Crow{
		Bird: Bird{Type: "Crow"},
		name: name,
	}
}

// BirdInfo 通过接口类型作为入参来实现多态
func BirdInfo(birds Birds) {
	fmt.Printf("I'm %s, I belong to %s bird class!\n", birds.Name(), birds.Class())
}

func main() {
	BirdInfo(NewCanary("A"))
	BirdInfo(NewCrow("B"))
	// I'm A, I belong to Canary bird class!
	// I'm B, I belong to Crow bird class!
}
```

## 软件设计方法

### 设计模式

> 针对一些**特定场景**总结出来的最佳实现方式，比较**具体**，相对简单

![1440f4bbcda682c8f5e7a599c8c51f9c](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/1440f4bbcda682c8f5e7a599c8c51f9c.webp)

### SOLID 原则

> 更侧重于**设计原则**，是设计代码时的**指导方针**

![19b697bbbe31450d6cc8f222491d3e3b](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/19b697bbbe31450d6cc8f222491d3e3b.webp)

# 项目管理

> 高效的开发流程（敏捷模型） + Makefile 管理项目 + 项目管理自动化（自动生成代码、借助工具、对接 CICD 等）

## Makefile

```
build              Build source code for host platform.
build.multiarch    Build source code for multiple platforms. See option PLATFORMS.
image              Build docker images for host arch.
image.multiarch    Build docker images for multiple platforms. See option PLATFORMS.
push               Build docker images for host arch and push images to registry.
push.multiarch     Build docker images for multiple platforms and push images to registry.
deploy             Deploy updated components to development env.
clean              Remove all files that are created by building.
lint               Check syntax and styling of go sources.
test               Run unit test.
cover              Run unit test and get test coverage.
release            Release iam
format             Gofmt (reformat) package sources (exclude vendor dir if existed).
verify-copyright   Verify the boilerplate headers for all files.
add-copyright      Ensures source code files have copyright license headers.
gen                Generate all necessary files, such as error code files.
ca                 Generate CA files for all iam components.
install            Install iam system with all its components.
swagger            Generate swagger document.
serve-swagger      Serve swagger spec and docs.
dependencies       Install necessary dependencies.
tools              install dependent tools.
check-updates      Check outdated dependencies of the go projects.
help               Show this help info.
```

## 借助工具

![90ca527c2863fe642f9ab3d5b90fe980](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/90ca527c2863fe642f9ab3d5b90fe980.webp)
