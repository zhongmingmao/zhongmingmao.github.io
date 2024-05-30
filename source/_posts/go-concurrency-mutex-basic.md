---
title: Go Concurrency - Mutex Basic
mathjax: false
date: 2023-04-01 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/go-mutex.webp
categories:
  - Go
tags:
  - Go
  - Concurrency
  - Cloud Native
---

# 基本概念

## 临界区

1. 临界区 - 共享资源
2. 使用互斥锁，限定临界区只能`同时`由`一个线程`持有
   - 当临界区被一个线程持有时，其它线程想进入，只能失败或者等待
   - 直到持有的线程退出临界区后，其它等待的线程才有机会去竞争该临界区
3. 在 Go 标准库中，使用 Mutex 来实现互斥锁 - 使用最为广泛的同步原语
   - 同步原语：解决并发问题的基础数据结构

<!-- more -->

## 同步原语

### 适用场景

1. 共享资源 - Mutex / RWMutex
2. 任务编排 - WaitGroup / Channel
3. 消息传递 - Channel

# 基本用法

## Locker

> Locker 接口定义了锁同步原语的方法集

```go
package sync

// A Locker represents an object that can be locked and unlocked.
type Locker interface {
	Lock()
	Unlock()
}
```

## Mutex

```go
func (m *Mutex) Lock()
func (m *Mutex) Unlock()
```

1. 当一个 goroutine 通过 Lock() 获得这把锁的拥有权后
2. 其它请求这把锁的 goroutine 会阻塞在 Lock() 调用上，直到这把锁被释放并自己能抢到这把锁

## 数据竞争

> `count++` 并非原子操作，存在`竞态条件`

```go
package main

import (
	"fmt"
	"sync"
)

func main() {
	count := 0

	wg := sync.WaitGroup{}
	wg.Add(10)

	for i := 0; i < 10; i++ {
		go func() {
			defer wg.Done()
			for j := 0; j < 100_000; j++ {
				count++
			}
		}()
	}

	wg.Wait()
	fmt.Println(count == 1_000_000) // false
}
```

> `count++` 对应的汇编代码

```assembly
    MOVQ    "".count(SB), AX
    LEAQ    1(AX), CX
    MOVQ    CX, "".count(SB)
```

> 检查 data race 的情况 - race-detector

![image-20240530192901606](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/concurrency/image-20240530192901606.png)

> 使用 Mutex 解决 data race 问题

```go
package main

import (
	"fmt"
	"sync"
)

func main() {
	var mu sync.Mutex // 零值是未加锁的状态

	count := 0

	wg := sync.WaitGroup{}
	wg.Add(10)

	for i := 0; i < 10; i++ {
		go func() {
			defer wg.Done()
			for j := 0; j < 100_000; j++ {
				mu.Lock()
				count++
				mu.Unlock()
			}
		}()
	}

	wg.Wait()
	fmt.Println(count == 1_000_000) // true
}
```

```
$ go run -race counter.go
true
```

# 进阶用法

> 嵌入到其它 struct 中

```go
package main

import (
	"fmt"
	"sync"
)

type Counter struct {
	sync.Mutex // 零值可用
	
	Count uint64
}

func main() {
	var counter Counter

	wg := sync.WaitGroup{}
	wg.Add(10)

	for i := 0; i < 10; i++ {
		go func() {
			defer wg.Done()
			for j := 0; j < 100_000; j++ {
				counter.Lock()
				counter.Count++
				counter.Unlock()
			}
		}()
	}

	wg.Wait()
	fmt.Println(counter.Count == 1_000_000) // true
}
```

> 进一步封装

```go
package main

import (
	"fmt"
	"sync"
)

type Counter struct {
	sync.Mutex // 零值可用

	count uint64
}

func (c *Counter) Incr() {
	defer c.Unlock()

	c.Lock()
	c.count++
}

func (c *Counter) Count() uint64 {
	defer c.Unlock()

	c.Lock()
	return c.count
}

func main() {
	var counter Counter

	wg := sync.WaitGroup{}
	wg.Add(10)

	for i := 0; i < 10; i++ {
		go func() {
			defer wg.Done()
			for j := 0; j < 100_000; j++ {
				counter.Incr()
			}
		}()
	}

	wg.Wait()
	fmt.Println(counter.Count() == 1_000_000) // true
}
```

