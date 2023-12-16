---
title: Go Paradigm - Pipeline
mathjax: false
date: 2022-02-01 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/paradigm/go-pipeline.webp
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# HTTP

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

<!-- more -->

# Channel

## func

### echo

```go
func echo(nums []int) <-chan int {
	out := make(chan int)
	go func() {
		for _, n := range nums {
			out <- n
		}
		close(out)
	}()
	return out
}
```

### square

```go
func square(in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		for n := range in {
			out <- n * n
		}
		close(out)
	}()
	return out
}
```

### odd

```go
func odd(in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		for n := range in {
			if n%2 == 1 {
				out <- n
			}
		}
		close(out)
	}()
	return out
}
```

### sum

```go
func sum(in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		sum := 0
		for n := range in {
			sum += n
		}
		out <- sum
		close(out)
	}()
	return out
}
```

## MapReduce

```go
var nums = []int{1, 2, 3, 4, 5}
for n := range sum(square(odd(echo(nums)))) {
  fmt.Println(n)
}
```

## Pipeline

```go
type EchoFunc func([]int) <-chan int
type PipeFunc func(<-chan int) <-chan int

func pipeline(nums []int, echo EchoFunc, pipelines ...PipeFunc) <-chan int {
	ch := echo(nums)
	for _, pipe := range pipelines {
		ch = pipe(ch)
	}
	return ch
}

func main() {
	var nums = []int{1, 2, 3, 4, 5}
	for n := range pipeline(nums, echo, odd, square, sum) {
		fmt.Println(n)
	}
}
```

# Fan in/out

```go
func makeSlice(min, max int) []int {
	sl := make([]int, max-min+1)
	for i := range sl {
		sl[i] = min + i
	}
	return sl
}

func echo(nums []int) <-chan int {
	out := make(chan int)
	go func() {
		for _, n := range nums {
			out <- n
		}
		close(out)
	}()
	return out
}

func compete(in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		for n := range in { // compete for input
			out <- n
		}
		close(out)
	}()
	return out
}

func sum(in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		sum := 0
		for n := range in {
			sum += n
		}
		out <- sum
		close(out)
	}()
	return out
}

func merge(cs []<-chan int) <-chan int {
	var wg sync.WaitGroup
	wg.Add(len(cs))

	out := make(chan int)
	for _, c := range cs {
		go func(c <-chan int) {
			defer wg.Done()

			for n := range c {
				out <- n
			}
		}(c)
	}

	go func() {
		defer close(out)
		wg.Wait()
	}()

	return out
}

func main() {
	nums := makeSlice(1, 100)
	in := echo(nums)

	var chs [1 << 4]<-chan int
	for i := range chs {
		chs[i] = sum(compete(in))
	}

	for n := range sum(merge(chs[:])) {
		fmt.Println(n) // 5050
	}
}
```

