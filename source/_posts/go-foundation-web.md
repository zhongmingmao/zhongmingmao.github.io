---
title: Go - Web
mathjax: false
date: 2022-12-21 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/gohttp.png
categories:
  - Go
tags:
  - Go
  - Cloud Native
---

# API

![image-20231011092118552](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231011092118552.png)

<!-- more -->

# 项目结构

```
$ tree
.
├── cmd
│   └── bookstore
│       └── main.go
├── go.mod
├── internal
│   └── store
│       └── memstore.go
├── server
│   ├── middleware
│   │   └── middleware.go
│   └── server.go
└── store
    ├── factory
    │   └── factory.go
    └── store.go
```

# 逻辑结构

![image-20231011092311295](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231011092311295.png)

# 具体实现

## store

> 定义 Domain 和 Action

```go store/store.go
package store

type Book struct {
	Id      string   `json:"id"`
	Name    string   `json:"name"`
	Authors []string `json:"authors"`
	Press   string   `json:"press"`
}

type Store interface {
	Create(*Book) error
	Update(*Book) error
	Get(string) (Book, error)
	GetAll() ([]Book, error)
	Delete(string) error
}
```

> Go 风格的工厂模式 - `注册模式`

```go store/factory/factory.go
package factory

import (
	"fmt"
	"github.com/zhongmingmao/bookstore/store"
	"sync"
)

var (
	providersMu sync.RWMutex
	providers   = make(map[string]store.Store)
)

func Register(name string, p store.Store) {
	providersMu.Lock()
	defer providersMu.Unlock()

	if p == nil {
		panic("store: Register provider is nil")
	}
	if _, dup := providers[name]; dup {
		panic("store: Register called twice for provider " + name)
	}

	providers[name] = p
}

func New(providerName string) (store.Store, error) {
	providersMu.RLock()
	p, ok := providers[providerName]
	providersMu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("store: unknown provider %q", providerName)
	}

	return p, nil
}
```

```go internal/store/memstore.go
package store

import (
	"github.com/zhongmingmao/bookstore/store"
	"github.com/zhongmingmao/bookstore/store/factory"
	"sync"
)

func init() {
	factory.Register("mem", &MemStore{
		books: make(map[string]*store.Book),
	})
}

type MemStore struct {
	sync.RWMutex
	books map[string]*store.Book
}
```

## server

> middleware 处理一些通用逻辑，类似于 Java 的切面

```go
package middleware

import (
	"log"
	"mime"
	"net/http"
)

func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("recv a %s request from %s\n", r.Method, r.RemoteAddr)
		next.ServeHTTP(w, r)
	})
}

func Validating(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		contentType := r.Header.Get("Content-Type")
		mediaType, _, err := mime.ParseMediaType(contentType)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if mediaType != "application/json" {
			http.Error(w, "Content-Type must be application/json", http.StatusBadRequest)
			return
		}

		next.ServeHTTP(w, r)
	})
}
```

```go server/server.go
package server

import (
	"github.com/gorilla/mux"
	"github.com/zhongmingmao/bookstore/server/middleware"
	"github.com/zhongmingmao/bookstore/store"
	"net/http"
	"time"
)

type BookStoreServer struct {
	s   store.Store
	srv *http.Server
}

func NewBookStoreServer(addr string, s store.Store) *BookStoreServer {
	srv := &BookStoreServer{
		s: s,
		srv: &http.Server{
			Addr: addr,
		},
	}

	router := mux.NewRouter()
	router.HandleFunc("/book", srv.createBookHandler).Methods("POST")
	router.HandleFunc("/book/{id}", srv.updateBookHandler).Methods("POST")
	router.HandleFunc("/book/{id}", srv.getBookHandler).Methods("GET")
	router.HandleFunc("/book", srv.getAllBookHandler).Methods("GET")
	router.HandleFunc("/book/{id}", srv.deleteBookHandler).Methods("DELETE")

	srv.srv.Handler = middleware.Logging(middleware.Validating(router))
	return srv
}

func (bs *BookStoreServer) ListenAndServe() (<-chan error, error) {
	var err error
	errChan := make(chan error)

	go func() {
		// http 会阻塞，需要放入一个 goroutine，通过 channel+select 来反馈运行状态
		err = bs.srv.ListenAndServe()
		errChan <- err
	}()

	select {
	case err := <-errChan:
		return nil, err
	case <-time.After(time.Second):
		return errChan, nil
	}
}

func (bs *BookStoreServer) Shutdown(ctx Context) error {
	return bs.srv.Shutdown(ctx)
}
```

## main

```go main.go
func main() {
	s, err := factory.New("mem")
	if err != nil {
		panic(err)
	}

	srv := server.NewBookStoreServer(":8081", s)

	errChan, err := srv.ListenAndServe()
	if err != nil {
		log.Println("web server start failed:", err)
		return
	}
	log.Println("web server start success")

	c := make(chan os.Signal, 1)
	signal.Notify(c, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-errChan: // 监控 http server 的运行状态
		log.Println("web server run failed:", err)
		return
	case <-c: // 监控系统信号
		log.Println("web server shutdown")
		ctx, cf := context.WithTimeout(context.Background(), time.Second)
		defer cf()
		err = srv.Shutdown(ctx) // 优雅关闭 http server
	}

	if err != nil {
		log.Println("web server shutdown failed:", err)
		return
	}
	log.Println("web server shutdown success")
}
```

