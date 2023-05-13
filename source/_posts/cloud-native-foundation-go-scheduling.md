---
title: Cloud Native Foundation - Go Scheduling
mathjax: false
date: 2022-10-08 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/go-dispatching.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go
tags:
  - Cloud Native
  - Go
---

# 线程加锁

> 线程安全

![image-20230513143140031](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20230513143140031.png)

```go
// fatal error: concurrent map writes
func unsafeWrite() {
	conflictMap := map[int]int{}
	for i := 0; i < 1<<10; i++ {
		go func(i int) {
			conflictMap[0] = i
		}(i)
	}
}
```

<!-- more -->

## 锁

> Go 不仅支持基于 `CSP` 的通信模型，也支持基于`共享内存`的多线程数据访问

> `Sync` 包提供了`锁`的`基本原语`

| 原语             | 描述                                      |
| ---------------- | ----------------------------------------- |
| sync.`Mutex`     | 互斥锁                                    |
| sync.`RWMutex`   | 读写分离锁                                |
| sync.`WaitGroup` | 等待一组 `goroutine` 返回                 |
| sync.`Once`      | 保证某段代码只执行 1 次                   |
| sync.`Cond`      | 让一组 `goroutine` 在满足特定条件时被唤醒 |

### Mutex

```go
type SafeMap struct {
	sync.Mutex
	safeMap map[int]int
}

func (m *SafeMap) Write(k, v int) {
	m.Lock()
	defer m.Unlock()

	m.safeMap[k] = v
}

func safeWrite() {
	m := SafeMap{
		Mutex:   sync.Mutex{},
		safeMap: map[int]int{},
	}

	for i := 0; i < 1<<10; i++ {
		go func(i int) {
			m.Write(0, i)
		}(i)
	}
}
```

### RWMutex

```go
func main() {
	go rLock()
	go wLock()
	time.Sleep(time.Second)
}

// rLock 0
// rLock 1
// rLock 2
// rLock 3
func rLock() {
	mutex := sync.RWMutex{}
	for i := 0; i < 1<<2; i++ {
		mutex.RLock() // 读不阻塞读
		defer mutex.RUnlock()
		fmt.Println("rLock", i)
	}
}

// wLock 0
func wLock() {
	mutex := sync.RWMutex{}
	for i := 0; i < 1<<2; i++ {
		mutex.Lock()
		defer mutex.Unlock()
		fmt.Println("wLock", i)
	}
}
```

### WaitGroup

```go
func waitByChannel(n int) {
	ch := make(chan int, n)

	for i := 0; i < n; i++ {
		go func(i int) {
			ch <- i
		}(i)
	}

	for i := 0; i < n; i++ {
		<-ch
	}
}
```

```go
func waitByWG(n int) {
	wg := sync.WaitGroup{}
	wg.Add(n)

	for i := 0; i < n; i++ {
		go func(i int) {
			wg.Done()
		}(i)
	}

	wg.Wait()
}
```

### Cond

> 生产者消费者模型

```go
type Queue struct {
	queue []interface{}
	cond  *sync.Cond
}

func (q *Queue) Enqueue(item interface{}) {
	q.cond.L.Lock()
	defer q.cond.L.Unlock()

	q.queue = append(q.queue, item)
	q.cond.Broadcast()
	fmt.Println("enqueue and broadcast")
}

func (q *Queue) Dequeue() (item interface{}) {
	q.cond.L.Lock()
	defer q.cond.L.Unlock()

	if len(q.queue) == 0 {
		fmt.Println("no data and wait")
		q.cond.Wait()
	}

	item = q.queue[0]
	q.queue = q.queue[1:]
	return item
}

func main() {
	q := Queue{
		queue: []interface{}{},
		cond:  &sync.Cond{L: &sync.Mutex{}},
	}

	go func() {
		for {
			q.Enqueue("a")
			time.Sleep(time.Second * 1 << 1)
		}
	}()

	go func() {
		for {
			q.Dequeue()
			time.Sleep(time.Second)
		}
	}()

	time.Sleep(time.Second * 1 << 4)
}
```

### Once

```go
type SliceNum []int

func (s *SliceNum) Add(item int) *SliceNum {
	*s = append(*s, item)
	fmt.Println("add", item)
	return s
}

func NewSlice() SliceNum {
	return make(SliceNum, 0)
}

func main() {
	once := sync.Once{}
	slice := NewSlice()

	// add 16
	for i := 0; i < 1<<2; i++ {
		once.Do(func() {
			slice.Add(1 << 4)
		})
	}
}
```

# 线程调度

> `进程`是`资源分配`的基本单位，`线程`是`调度`的基本单位

> 在 `Kernel` 视角，进程和线程`本质无差别`，都是以 `task_struct` 来描述

![image-20230513161805353](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20230513161805353.png)

## 内存使用

> `页表`：虚拟地址与物理地址的`映射`关系

![image-20230513163531175](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20230513163531175.png)

```go
package main

func main(){
}
```

```bash
$ go build

$ size go-demo
   text	   data	    bss	    dec	    hex	filename
 758966	  13328	 227280	 999574	  f4096	go-demo

$ objdump -x go-demo | grep bss | grep runtime | head -n 1
00000000000e3420 l     O .bss	0000000000000000 runtime.bss
```

```bash
$ getconf PAGE_SIZE
4096
```

## 访问内存

1. CPU 上有一个 `MMU`（MemoryManagementUnit）
2. CPU 将`虚拟地址`给到 `MMU`，而 MMU 去`物理内存`中查找`页面`，得到实际的`物理地址`
3. CPU 维护一份 `TLB`（Translation `Lookaside` Buffer）：`缓存`虚拟地址和物理地址的`映射`关系
   - TLB 在 CPU 中，`比 L1 Cache 快`

![image-20230513175146835](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20230513175146835.png)

## 切换开销

### 内核进程

> 进程切换的`开销很大`

> 直接开销

1. 切换 `PGD`
2. 刷新 `TLB`
3. 切换`内核态堆栈` - 系统调用
4. 切换`硬件上下文`
5. `系统调度器`的代码执行

> 间接开销

1. `CPU 缓存失效`：导致进程需要`直接访问内存`

### 内核线程

> 共享`虚拟空间地址`

1. 线程本质上是一组`共享资源`的进程，线程切换本质上依然需要`内核进行进程切换`（`系统调用`）
2. 一个进程内的所有线程共享`虚拟地址空间`，主要节省：`虚拟空间的切换`（PGD、TLB 等）

> 虽然内核线程的切换`不需要切换虚拟地址空间`，但内核线程本质上还是内核进程，切换依然需要`系统调用`

### 用户线程

> `无需内核帮助`，应用程序在`用户空间`创建的`可执行单元`，创建和销毁完全在`用户态`完成

![image-20230513181521194](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20230513181521194.png)

> 在 `Kernel` ，多个用户线程本质上是`同一个内核线程`，同一个内核线程内的用户线程之间的切换是`不需要系统调用`的

> `Goroutine` 是`用户线程`的一种实现

## Goroutine

> Go 基于 `GMP` 模型实现`用户线程`

| Key                            | Desc                                                         |
| ------------------------------ | ------------------------------------------------------------ |
| G = `Goroutine`                | 每个 goroutine 有自己的`栈空间`（初始大小为 `2k` 左右）和`定时器` |
| M = `Machine`<br /> = 内核线程 | 记录内核线程栈信息，当 goroutine `调度`到内核线程时，`使用 goroutine 自己的栈信息`<br />数量一般与 `CPU 数` 相同，`一个 CPU 一般对应一个 M` |
| P = `Process`<br /> = 调度器   | 负责调度 goroutine<br />维护一个`本地 goroutine 队列`，M 从 P上获得 goroutine 并执行 |



![image-20230513182516371](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20230513182516371.png)

> 虚线代表`关系不稳定`

![image-20230513184411605](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20230513184411605.png)

> GMP 模型

![image-20230513184657347](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20230513184657347.png)

