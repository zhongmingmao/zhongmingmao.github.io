---
title: Go Engineering - Foundation - API - RPC
mathjax: false
date: 2022-04-16 03:06:25
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
  - RPC
  - gRPC
---

# RPC

![984yy094616b9b24193b22a1f2f2271d](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/984yy094616b9b24193b22a1f2f2271d.webp)

<!-- more -->

1. Client 通过本地调用，调用 Client Stub
2. **Client Stub 将参数打包（Marshalling）成一个消息**，然后发送这个消息
3. Client 所在的 OS 将消息发送给 Server
4. Server 接收到消息后，将消息传递给 Server Stub（或者 **Server Skeleton**）
5. **Server Stub 将消息解包（Unmarshalling）后得到消息**
6. Server Stub 调用服务端的子程序，处理完成后，将最终结果按照相反的步骤返回给 Client

![image-20210331181307179](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/rpc/image-20210331181307179.png)

# gRPC

## 概述

1. gRPC：**google** Remote Procedure Call
2. gRPC 是由 Google 开发的**高性能**、开源、**跨语言**的**通用 RPC 框架**，基于 **HTTP 2.0**，默认使用 **Protocol Buffers** 序列化
3. gRPC 的特点
   - 支持**多语言**
   - 基于 **IDL**（Interface Definition Language）文件**定义服务**
     - 通过 proto3 生成指定语言的**数据结构**、**服务端接口**和**客户端 Stub**
   - 通信协议基于标准的 **HTTP/2**，支持特性：**双向流**、**消息头压缩**、**单 TCP 的多路复用**、**服务端推送**等
   - 支持的序列化方式：**Protobuf**、**JSON**
     - Protobuf 是**语言无关**的**高性能**序列化框架，可以**减少网络传输流量**、提高通信效率

![01ac424c7c1d64f678e1218827bc0109](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/01ac424c7c1d64f678e1218827bc0109.webp)

## Protocol Buffers

1. Protocol Buffers 是由 Google 开发的**序列化**方法，可用作数据**通信**协议和数据**存储**格式，非常**灵活高效**
2. Protocol Buffers 的**传输性能非常优秀**，常用于对数据传输性能要求比较高的系统中，作为数据传输格式
3. Protocol Buffers 的特点
   - **更快的传输速度**：二进制序列化，与 JSON 和 XML 等**文本序列化**方式相比，可以节省大量 IO
   - **跨平台多语言**：protoc 基于 protobuf 定义文件，**编译**出不同语言的客户端或者服务端
   - **非常好的扩展性和兼容性**：可以更新已有的数据结构，而不会破坏和影响原有的程序
   - **基于 IDL 文件定义服务**：通过 proto3 生成指定语言的数据结构、服务端和客户端接口
4. Protocol Buffers 在 **gRPC** 框架中发挥的作用
   - 定义**数据结构**
   - 定义**服务接口**
   - 通过 protobuf 进行**序列化**和**反序列化**，提升**传输效率**

# 示例

## 定义服务

> gRPC 支持定义 4 种类型的**服务方法**

1. **Simple RPC**
   - 客户端发起一次请求，服务端响应一个数据
   - `rpc SayHello (HelloRequest) returns (HelloReply) {}`
2. **Server-side streaming RPC**
   - 客户端发送一个请求，服务端返回数据流响应，客户端从流中读取数据直到为空
   - `rpc SayHello (HelloRequest) returns (stream HelloReply) {}`
3. **Client-side streaming RPC**
   - 客户端将消息以流的方式发送给服务器，服务器全部处理完成后返回一次响应
   - `rpc SayHello (stream HelloRequest) returns (HelloReply) {}`
4. **Bidirectional streaming RPC**
   - 客户端和服务端都可以向对方发送**数据流**，双方的数据可以**同时互相发送**
   - `rpc SayHello (stream HelloRequest) returns (stream HelloReply) {}`

```protobuf helloworld.proto
syntax = "proto3";

// go_package 是必须的，定义包导入的路径
option go_package = "github.com/zhongmingmao/grpc/helloworld";

// package 指定生成的 .pb.go 文件所在的包名
package helloworld;

message HelloRequest {
  string name = 1;
}

message HelloReply {
  string message = 1;
}

service Greeter {
  rpc SayHello (HelloRequest) returns (HelloReply) {}
}
```

## 生成代码

```
❯ ls
helloworld.proto

❯ protoc -I. --go_out=plugins=grpc:$GOPATH/src helloworld.proto

❯ ls
helloworld.pb.go helloworld.proto
```

![image-20220417230421181](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220417230421181.png)

```go helloworld.pb.go
type HelloRequest struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Name string `protobuf:"bytes,1,opt,name=name,proto3" json:"name,omitempty"`
}

type HelloReply struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Message string `protobuf:"bytes,1,opt,name=message,proto3" json:"message,omitempty"`
}

// GreeterServer is the server API for Greeter service.
type GreeterServer interface {
	SayHello(context.Context, *HelloRequest) (*HelloReply, error)
}

// GreeterClient is the client API for Greeter service.
//
// For semantics around ctx use and closing/ending streaming RPCs, please refer to https://godoc.org/google.golang.org/grpc#ClientConn.NewStream.
type GreeterClient interface {
	SayHello(ctx context.Context, in *HelloRequest, opts ...grpc.CallOption) (*HelloReply, error)
}
```

## 实现 Server

```go server.go
package main

import (
	"context"
	pb "github.com/zhongmingmao/grpc/helloworld"
	"google.golang.org/grpc"
	"log"
	"net"
)

const (
	port = ":50505"
)

// server is used to implement helloworld.GreeterServer.
type server struct {
	pb.UnimplementedGreeterServer
}

// SayHello implements helloworld.GreeterServer
func (s *server) SayHello(ctx context.Context, in *pb.HelloRequest) (*pb.HelloReply, error) {
	log.Printf("Received: %v", in.GetName())
	return &pb.HelloReply{Message: "Hello " + in.GetName()}, nil
}

func main() {
	listen, err := net.Listen("tcp", port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	// 创建一个 gRPC Server 实例
	s := grpc.NewServer()
	// 注册服务到 gRPC 框架中
	pb.RegisterGreeterServer(s, &server{})
	// 启动 gRPC 服务
	if err := s.Serve(listen); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
```

```
❯ go run server.go
```

## 实现 Client

> **屏蔽**了底层的网络通信细节（调用方便） + 入参和出参都是 **Go 结构体**（不需要打包和解包）

```go client.go
package main

import (
	"context"
	pb "github.com/zhongmingmao/grpc/helloworld"
	"google.golang.org/grpc"
	"log"
	"os"
	"time"
)

const (
	address     = "localhost:50505"
	defaultName = "grpc"
)

func main() {
	// Set up a connection to the server.
	conn, err := grpc.Dial(address, grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		log.Fatalf("did not connect: %v", err)
	}
	defer conn.Close()
	c := pb.NewGreeterClient(conn)

	name := defaultName
	if len(os.Args) > 1 {
		name = os.Args[1]
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	r, err := c.SayHello(ctx, &pb.HelloRequest{Name: name})
	if err != nil {
		log.Fatalf("could not greet: %v", err)
	}
	log.Printf("Greeting: %s", r.Message)
}
```

```
❯ go run client.go
2022/04/16 15:32:15 Greeting: Hello grpc

❯ go run server.go
2022/04/16 15:32:15 Received: grpc
```

# optional + nil

```protobuf user.proto
syntax = "proto3";

package proto;
option go_package = "github.com/zhongmingmao/grpc/user";

message GetUserRequest {
  string class = 1;
  optional string username = 2; // 可选字段
  optional string user_id = 3;
}

message GetUserResponse {
  string class = 1;
  string user_id = 2;
  string username = 3;
  string address = 4;
  string sex = 5;
  string phone = 6;
}

service User {
  rpc GetUser (GetUserRequest) returns (GetUserResponse) {}
}
```

> experimental_allow_proto3_optional：将 **optional** 字段编译成**指针类型**

```
❯ protoc --experimental_allow_proto3_optional --go_out=plugins=grpc:$GOPATH/src user.proto
```

```go
type GetUserRequest struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Class    string  `protobuf:"bytes,1,opt,name=class,proto3" json:"class,omitempty"`
	Username *string `protobuf:"bytes,2,opt,name=username,proto3,oneof" json:"username,omitempty"` // 可选字段
	UserId   *string `protobuf:"bytes,3,opt,name=user_id,json=userId,proto3,oneof" json:"user_id,omitempty"`
}
```

```go user.go
package user

import "context"

type User struct {
}

func (receiver *User) GetUser(ctx context.Context, in *GetUserRequest) (*GetUserResponse, error) {
	// Username 的类型为 *string，可以先判断是否为 nil，而 string 的零值是空字符串，并非 nil
	if in.Username != nil {
		return nil, nil
	}
	return nil, nil
}
```

# RESTful vs gRPC

![e6ae61fc4b0fc821f94d257239f332ab](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/e6ae61fc4b0fc821f94d257239f332ab.webp)

> RESTful API 和 gRPC API 是合作关系，**对内业务**使用 **gRPC** API，**对外业务**使用 **RESTful** API

![471ac923d2eaeca8fe13cb74731c1318](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/471ac923d2eaeca8fe13cb74731c1318.webp)

