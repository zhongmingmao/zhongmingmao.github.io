---
title: Cloud Native Foundation - Go Sync
mathjax: false
date: 2022-02-06 00:06:25
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go
tags:
  - Cloud Native
  - Go
---

# 线程安全

![image-20220206223156450](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20220206223156450.png)

<!-- more -->

# 锁

1. Go 不仅提供了基于 **CSP** 的通讯模型，也支持基于**共享内存**的多线程数据访问
2. `sync` 包提供了**锁**的**基本原语**

| 同步工具         | 用途                                                         |
| ---------------- | ------------------------------------------------------------ |
| `sync.Mutex`     | 互斥锁：Lock加锁，Unlock解锁                                 |
| `sync.RWMutex`   | 读写分离锁：不限制并发读，只限制并发写和并发读写             |
| `sync.WaitGroup` | 等待一组 goroutine 返回，类似于 Java 的 **`CountDownLatch`** |
| `sync.Once`      | 保证某段代码只执行1次，典型场景：**单例模式**                |
| `sync.Cond`      | 让一组 goroutine 在满足特定条件时被唤醒，典型场景：**生产者消费者模型** |

## Mutex

```go
func unsafeWrite() { // fatal error: concurrent map writes
	conflictMap := map[int]int{}
	for i := 0; i < 100; i++ {
		i := i
		go func() {
			conflictMap[1] = i
		}()
	}
}

type SafeMap struct {
	m map[int]int
	sync.Mutex
}

func (s *SafeMap) Read(k int) (int, bool) {
	s.Lock()
	defer s.Unlock()
	result, ok := s.m[k]
	return result, ok
}

func (s *SafeMap) Write(k int, v int) {
	s.Lock()
	defer s.Unlock()
	s.m[k] = v
}

func safeWrite() {
	s := SafeMap{m: map[int]int{}, Mutex: sync.Mutex{}}
	for i := 0; i < 100; i++ {
		i := i
		go func() {
			s.Write(1, i)
		}()
	}
}
```

## RWMutex

```go
func main() {
	go rLock()
	go wLock()
	go lock()
	time.Sleep(time.Second)
	// lock 0
	// rLock 0
	// rLock 1
	// rLock 2
	// wLock 0
}

func lock() {
	lock := sync.Mutex{}
	for i := 0; i < 3; i++ {
		lock.Lock()
		defer lock.Unlock()
		fmt.Println("lock", i)
	}
}

func rLock() {
	lock := sync.RWMutex{}
	for i := 0; i < 3; i++ {
		lock.RLock()
		defer lock.RUnlock()
		fmt.Println("rLock", i)
	}
}

func wLock() {
	lock := sync.RWMutex{}
	for i := 0; i < 3; i++ {
		lock.Lock()
		defer lock.Unlock()
		fmt.Println("wLock", i)
	}
}
```

## WaitGroup

```go
func waitBySleep() {
	for i := 0; i < 100; i++ {
		go fmt.Println(i)
	}
	time.Sleep(time.Second)
}

func waitByChannel() {
	ch := make(chan bool, 100)
	for i := 0; i < 100; i++ {
		go func(i int) {
			fmt.Println(i)
			ch <- true
		}(i)
	}

	for i := 0; i < 100; i++ {
		<-ch
	}
}

func waitByWG() {
	wg := sync.WaitGroup{}
	wg.Add(100)
	for i := 0; i < 100; i++ {
		go func(i int) {
			fmt.Println(i)
			wg.Done() // ≈ Java CountDownLatch#countDown()
		}(i)
	}
	wg.Wait() // ≈ Java CountDownLatch#await()
}
```

## Once

```go
type NumSlice []int

func NewSlice() NumSlice {
	return make(NumSlice, 0)
}

func (s *NumSlice) Add(elem int) *NumSlice {
	*s = append(*s, elem)
	fmt.Println("add", elem)
	fmt.Println("current: ", s)
	return s
}

func main() {
	var once sync.Once
	s := NewSlice()

	wg := sync.WaitGroup{}
	wg.Add(1)
	for i := 0; i < 3; i++ {
		go func() {
			once.Do(func() {
				s.Add(1 << 4)
				wg.Done()
			})
		}()
	}
	wg.Wait()
	// add 16
	// current:  &[16]
}
```

## Cond

```go
type Queue struct {
	queue []string
	cond  *sync.Cond
}

func (q *Queue) Enqueue(item string) {
	q.cond.L.Lock()
	defer q.cond.L.Unlock()

	q.queue = append(q.queue, item)
	fmt.Printf("pitting #{item} to queue, notify all\n")
	q.cond.Broadcast() // ≈ Java Object#notifyAll()
	//q.cond.Signal() ≈ Java Object#notify()
}

func (q *Queue) Dequeue() string {
	q.cond.L.Lock()
	defer q.cond.L.Unlock()

	if len(q.queue) == 0 {
		fmt.Println("no data available, wait")
		q.cond.Wait()
	}
	var item string
	item, q.queue = q.queue[0], q.queue[1:]
	return item
}

func main() {
	q := Queue{queue: []string{}, cond: sync.NewCond(&sync.Mutex{})}

	// producer
	go func() {
		for {
			q.Enqueue("a")
			time.Sleep(time.Second * 2)
		}
	}()

	// consumer
	for {
		q.Dequeue()
		time.Sleep(time.Second)
	}
}
```

