---
title: Go Engineering - RPC API
mathjax: false
date: 2023-05-04 00:06:25
cover: https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/go-engineering-grpc-7924583.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
  - gRPC
---

# RPC

> Client _Stub_ / Server _Skeleton_

![image-20240609173654289](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240609173654289.png)

<!-- more -->

1. Client 通过本地调用，调用 Client Stub
2. Client Stub 将参数打包（`Marshalling`）成一个消息，并发送这个消息
3. Client 所在的 OS 将消息发送给 Server
4. Server 端接收到消息后，将消息传递给 Server Stub
5. Server Stub 将消息解包（`Unmarshalling`）得到参数
6. Server Stub 调用服务端子函数，处理完毕后，将最终结果按相反步骤返回给 Client

# gRPC

> `Google` Remote Procedure Call

## 简介

1. 由 Google 开发的高性能、开源、`跨语言`的`通用` RPC 框架
   - 基于 `HTTP 2.0` 协议 + 默认采用 `Protocol Buffers` 数据序列化协议
2. 特征
   - 支持`多语言` - Go、Java、C++、Node.js、Python 等
   - 基于 `IDL` - Interface Definition Language 文件定义服务
     - 通过 proto3 工具生成指定语言的数据结构、`Server API` 以及 `Client Stub`
   - 通信协议基于标准的 `HTTP/2`
     - 支持`双向流`、`消息头压缩`、`单 TCP 的多路复用`、`服务端推送`等特征
   - 支持 `Protobuf` 和 `JSON` 序列化数据格式
     - Protobuf 是一种`语言无关`的`高性能`序列化框架，可以减少网络传输流量，提高通信效率

## 调用过程

![image-20240609175325664](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240609175325664.png)

## Protocol Buffers

1. 由 Google 开发的一套对`数据结构`进行序列化的方法，可用作`通信协议`、`数据存储格式`等，与 `XML`、`JSON` 类似
2. Protocol Buffers 的`传输性能`非常好，常用在一些对数据传输性能要求比较高的系统
3. 主要特征
   - 更快的`数据传输速度`
     - 在传输时，会将数据序列化为`二进制数据`，节省大量的 IO 操作
   - `跨平台多语言`
     - 基于 IDL 文件定义服务，通过 proto3 工具生成指定语言的数据结构、服务端和客户端接口
   - `扩展性` + `兼容性`
     - 可以`更新已有的数据结构`，而不破坏和影响原有的程序
4. Protocol Buffers 在 gRPC 中的作用
   - 定义`数据结构`
   - 定义`服务接口`
   - 通过 Protocol Buffers `序列化`和`反序列化`，提高`传输效率`

# 示例

## 服务定义

```protobuf
syntax = "proto3";

option go_package = "github.com/zhongmingmao/hello-grpc/helloworld";

package helloworld;

message HelloRequest {
  string name = 1;
}

message HelloResponse {
  string message = 1;
}

service Greeter {
  rpc SayHello(HelloRequest) returns (HelloResponse) {}
}
```

> 支持的服务方法

| Type                        | Desc                                                         |
| --------------------------- | ------------------------------------------------------------ |
| Simple RPC                  | 客户端发起一次请求，服务端响应一个数据<br />rpc SayHello (HelloRequest) returns (HelloResponse) {} |
| Server-side streaming RPC   | 客户端发送一个请求，服务端返回`数据流`响应<br />客户端从流中读取数据直到为空<br />rpc SayHello (HelloRequest) returns (stream HelloResponse) {} |
| Client-side streaming RPC   | 客户端将消息以流的方式发送给服务器<br />服务器`全部处理`完成后返回一次响应<br />rpc SayHello (stream HelloRequest) returns (HelloResponse) {} |
| Bidirectional streaming RPC | 客户端和服务端都可以向对方发送数据流<br />双方的数据流可以`同时互相发送`，实时交互<br />rpc SayHello (stream HelloRequest) returns (stream HelloResponse) {} |

## 生成代码

```
$ protoc -I. --go_out=plugins=grpc:$GOPATH/src helloworld.proto

$ tree
.
└── helloworld
    ├── helloworld.pb.go
    └── helloworld.proto
```

## 实现 gRPC 服务端

```go
package main

import (
	"context"
	"log"
	"net"

	pb "github.com/zhongmingmao/hello-grpc/helloworld"
	"google.golang.org/grpc"
)

const (
	port = ":50051"
)

// server is used to implement helloworld.GreeterServer.
type server struct {
	pb.UnimplementedGreeterServer
}

// SayHello implements helloworld.GreeterServer
func (s *server) SayHello(ctx context.Context, in *pb.HelloRequest) (*pb.HelloResponse, error) {
	log.Printf("Received: %v", in.GetName())
	return &pb.HelloResponse{Message: "hello " + in.GetName()}, nil
}

func main() {
	lis, err := net.Listen("tcp", port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	s := grpc.NewServer()
	pb.RegisterGreeterServer(s, &server{})
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
```

## 实现 gRPC 客户端

```go
package main

import (
	"context"
	"log"
	"os"
	"time"

	pb "github.com/zhongmingmao/hello-grpc/helloworld"
	"google.golang.org/grpc"
)

const (
	address     = "localhost:50051"
	defaultName = "go"
)

func main() {
	// Set up a connection to the server.
	conn, err := grpc.Dial(address, grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		log.Fatalf("did not connect: %v", err)
	}

	defer conn.Close()
	c := pb.NewGreeterClient(conn) // Client Stub

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

> Server

```
$ go run server.go
2023/05/04 20:00:06 Received: go
```

> Client

```
$ go run client.go
2023/05/04 20:00:06 Greeting: hello go
```

# 类型零值

> 通过`指针`判断

1. 场景：定义一个接口，接口会通过判断`是否传入`某个参数，决定接口行为
2. 如果客户端没有传入某个参数，Go 会默认赋值为`类型零值`

```protobuf
syntax = "proto3";

package proto;
option go_package="github.com/zhongmingmao/hello-grpc/user";

message GetUserRequest {
    string class = 1;
    optional string username = 2;
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
    rpc GetUser(GetUserRequest) returns (GetUserResponse) {}
}
```

> experimental_allow_proto3_optional - 打开 optional 选项

```
$ protoc --experimental_allow_proto3_optional --go_out=plugins=grpc:$GOPATH/src user.proto
```

> user.pb.go - GetUserRequest.Username - 指针类型

```go
type GetUserRequest struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Class    string  `protobuf:"bytes,1,opt,name=class,proto3" json:"class,omitempty"`
	Username *string `protobuf:"bytes,2,opt,name=username,proto3,oneof" json:"username,omitempty"`
	UserId   *string `protobuf:"bytes,3,opt,name=user_id,json=userId,proto3,oneof" json:"user_id,omitempty"`
}
```

# RESTful vs gRPC

![image-20240609201726778](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240609201726778.png)

> `对内`业务使用 `gRPC` API，`对外`业务使用 `RESTful` API

![image-20240609202413726](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240609202413726.png)
