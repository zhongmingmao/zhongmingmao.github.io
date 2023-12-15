---
title: Go Paradigm - Decorator
mathjax: false
date: 2023-01-31 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/paradigm/go-decorator.webp
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 示例

## 示例 1

```go
func decorator(f func(s string)) func(s string) {
	return func(s string) {
		fmt.Println("Started")
		f(s)
		fmt.Println("Done")
	}
}

func Hello(s string) {
	fmt.Println(s)
}

func main() {
	decorator(Hello)("Hello, World!")
}

// output:
// 	Started
// 	Hello, World!
// 	Done
```

<!-- more -->

## 示例 2

```go
type SumFunc func(int64, int64) int64

func getFunctionName(i any) string {
	return runtime.FuncForPC(reflect.ValueOf(i).Pointer()).Name()
}

func timedSumFunc(f SumFunc) SumFunc {
	return func(start int64, end int64) int64 {
		defer func(t time.Time) {
			fmt.Printf("--- Time Elapsed (%s): %v ---\n", getFunctionName(f), time.Since(t))
		}(time.Now())

		return f(start, end)
	}
}

func sum(start int64, end int64) int64 {
	var sum int64
	for i := start; i <= end; i++ {
		sum += i
	}
	return sum
}

func main() {
	timedSumFunc(sum)(1, 1000000000) // --- Time Elapsed (main.sum): 317.173167ms ---
}
```

## 示例 3

```go
func WithServerHeader(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Println("--->WithServerHeader")
		w.Header().Set("Server", "HelloServer v0.0.1")
		h(w, r)
	}
}

func hello(w http.ResponseWriter, r *http.Request) {
	log.Printf("Recieved Request %s from %s\n", r.URL.Path, r.RemoteAddr)
	_, _ = fmt.Fprintf(w, "Hello, World! "+r.URL.Path)
}

func main() {
	http.Handle("/v1/hello", WithServerHeader(hello)) // decorate the handler function with WithServerHeader
	err := http.ListenAndServe(":8000", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
```

```
$ curl -v 127.1:8000/v1/hello
*   Trying 127.0.0.1:8000...
* Connected to 127.0.0.1 (127.0.0.1) port 8000 (#0)
> GET /v1/hello HTTP/1.1
> Host: 127.0.0.1:8000
> User-Agent: curl/7.88.1
> Accept: */*
>
< HTTP/1.1 200 OK
< Server: HelloServer v0.0.1
< Date: Fri, 15 Dec 2022 14:11:31 GMT
< Content-Length: 23
< Content-Type: text/plain; charset=utf-8
<
* Connection #0 to host 127.0.0.1 left intact
Hello, World! /v1/hello
```

# Pipeline

```go
type HttpHandlerDecorator func(http.HandlerFunc) http.HandlerFunc

func Handler(h http.HandlerFunc, decors ...HttpHandlerDecorator) http.HandlerFunc {
	for i := range decors {
		h = decors[len(decors)-1-i](h)
	}
	return h
}

func WithServerHeader(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Println("--->WithServerHeader")
		w.Header().Set("Server", "HelloServer v0.0.1")
		h(w, r)
	}
}

func WithAuthCookie(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Println("--->WithAuthCookie")
		cookie := http.Cookie{Name: "Auth", Value: "SimpleAuth"}
		http.SetCookie(w, &cookie)
		h(w, r)
	}
}

func hello(w http.ResponseWriter, r *http.Request) {
	log.Printf("Recieved Request %s from %s\n", r.URL.Path, r.RemoteAddr)
	_, _ = fmt.Fprintf(w, "Hello, World! "+r.URL.Path)
}

func main() {
	http.Handle("/v1/hello", Handler(hello, WithServerHeader, WithAuthCookie))
	err := http.ListenAndServe(":8000", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
```

```
$ curl -v 127.1:8000/v1/hello
*   Trying 127.0.0.1:8000...
* Connected to 127.0.0.1 (127.0.0.1) port 8000 (#0)
> GET /v1/hello HTTP/1.1
> Host: 127.0.0.1:8000
> User-Agent: curl/7.88.1
> Accept: */*
>
< HTTP/1.1 200 OK
< Server: HelloServer v0.0.1
< Set-Cookie: Auth=SimpleAuth
< Date: Fri, 15 Dec 2022 14:18:21 GMT
< Content-Length: 23
< Content-Type: text/plain; charset=utf-8
<
* Connection #0 to host 127.0.0.1 left intact
Hello, World! /v1/hello
```



