---
title: Go Paradigm - Functional Options
mathjax: false
date: 2022-01-27 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/paradigm/functional-options-in-go.png
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 配置问题

```go
type Server struct {
    Addr     string
    Port     int
    Protocol string
    Timeout  time.Duration
    MaxConns int
    TLS      *tls.Config
}
```

<!-- more -->

> Go 不支持`函数重载`，需要使用`不同的函数名`来应对不同的配置选项

```go
func NewDefaultServer(addr string, port int) (*Server, error) {
  return &Server{addr, port, "tcp", 30 * time.Second, 100, nil}, nil
}

func NewTLSServer(addr string, port int, tls *tls.Config) (*Server, error) {
  return &Server{addr, port, "tcp", 30 * time.Second, 100, tls}, nil
}

func NewServerWithTimeout(addr string, port int, timeout time.Duration) (*Server, error) {
  return &Server{addr, port, "tcp", timeout, 100, nil}, nil
}

func NewTLSServerWithMaxConnAndTimeout(addr string, port int, maxconns int, timeout time.Duration, tls *tls.Config) (*Server, error) {
  return &Server{addr, port, "tcp", 30 * time.Second, maxconns, tls}, nil
}
```

# Config

```go
type Config struct {
    Protocol string
    Timeout  time.Duration
    Maxconns int
    TLS      *tls.Config
}
```

> 将`非必需的选项`放入 Config

```go
type Server struct {
    Addr string
    Port int
    Conf *Config
}
```

> 只需要一个 NewServer 函数

```go
func NewServer(addr string, port int, conf *Config) (*Server, error) {
    //...
}

//Using the default configuratrion
srv1, _ := NewServer("localhost", 9000, nil) 

conf := ServerConfig{Protocol:"tcp", Timeout: 60*time.Duration}
srv2, _ := NewServer("locahost", 9000, &conf)
```

> Config 并非必需的，需要判断为 `nil` 还是 `Config{}`

# Builder

```go
type ServerBuilder struct {
  Server
}

func (sb *ServerBuilder) Create(addr string, port int) *ServerBuilder {
  sb.Server.Addr = addr
  sb.Server.Port = port
  return sb
}

func (sb *ServerBuilder) WithProtocol(protocol string) *ServerBuilder {
  sb.Server.Protocol = protocol 
  return sb
}

func (sb *ServerBuilder) WithMaxConn( maxconn int) *ServerBuilder {
  sb.Server.MaxConns = maxconn
  return sb
}

func (sb *ServerBuilder) WithTimeOut( timeout time.Duration) *ServerBuilder {
  sb.Server.Timeout = timeout
  return sb
}

func (sb *ServerBuilder) WithTLS( tls *tls.Config) *ServerBuilder {
  sb.Server.TLS = tls
  return sb
}

func (sb *ServerBuilder) Build() (Server) {
  return  sb.Server
}
```

```go
sb := ServerBuilder{}
server, err := sb.Create("127.0.0.1", 8080).
  WithProtocol("udp").
  WithMaxConn(1024).
  WithTimeOut(30*time.Second).
  Build()
```

# Functional Options

> `函数式编程`，类似与 Java 的 `java.util.function.Consumer`

```go
package main

import (
	"crypto/tls"
	"time"
)

// 类似与 Java 的 Consumer
type Option func(server *Server)

type Server struct {
	Addr     string
	Port     int
	Protocol string
	Timeout  time.Duration
	MaxConns int
	TLS      *tls.Config
}

func Protocol(p string) Option {
	return func(s *Server) {
		s.Protocol = p
	}
}

func Timeout(t time.Duration) Option {
	return func(s *Server) {
		s.Timeout = t
	}
}

func MaxConns(n int) Option {
	return func(s *Server) {
		s.MaxConns = n
	}
}

func TLS(t *tls.Config) Option {
	return func(s *Server) {
		s.TLS = t
	}
}

func NewServer(addr string, port int, options ...Option) (*Server, error) {
	srv := Server{
		Addr:     addr,
		Port:     port,
		Protocol: "tcp",
		Timeout:  30 * time.Second,
		MaxConns: 1000,
		TLS:      nil,
	}

	for _, option := range options {
		option(&srv)
	}

	return &srv, nil
}

func main() {
	s1, _ := NewServer("localhost", 1024)
	s2, _ := NewServer("localhost", 2048, Protocol("udp"))
	s3, _ := NewServer("0.0.0.0", 8080, Timeout(300*time.Second), MaxConns(1000))

	_ = s1
	_ = s2
	_ = s3
}
```

```java
package java.util.function;

@FunctionalInterface
public interface Consumer<T> {
  void accept(T t);
}
```



