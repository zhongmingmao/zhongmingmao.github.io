---
title: Go - Sync + Atomic
mathjax: false
date: 2023-01-18 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-sync-atomic.webp
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 并发模型

> Do not communicate by sharing memory; instead, `share memory by communicating`.

1. Go 应用`并发设计`的主流风格：使用 `channel` 进行不同 goroutine 间的通信
2. `sync`：提供基于`共享内存`并发模型的`低级同步原语`，如互斥锁、读写锁、条件变量等
3. `atomic`：提供`原子操作原语`

<!-- more -->

# Sync

## 场景

> 需要`高性能`的`临界区同步机制`场景 - `critical section`

1. `channel` 是一种`高级同步原语`，其自身的实现是构建在`低级同步原语`的基础上
2. 因此，channel 自身的`性能`要`略逊于`低级同步原语，`开销更大`

```go
var cs = 0 // critical section
var mu sync.Mutex
var c = make(chan struct{}, 1)

func criticalSectionSyncByMutex() {
	mu.Lock()
	cs++
	mu.Unlock()
}

func criticalSectionSyncByChannel() {
	c <- struct{}{}
	cs++
	<-c
}

func BenchmarkCriticalSectionSyncByMutex(b *testing.B) {
	for i := 0; i < b.N; i++ {
		criticalSectionSyncByMutex()
	}
}

func BenchmarkCriticalSectionSyncByChannel(b *testing.B) {
	for i := 0; i < b.N; i++ {
		criticalSectionSyncByChannel()
	}
}

func BenchmarkCriticalSectionSyncByMutexParallel(b *testing.B) {
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			criticalSectionSyncByMutex()
		}
	})
}

func BenchmarkCriticalSectionSyncByChannelParallel(b *testing.B) {
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			criticalSectionSyncByChannel()
		}
	})
}
```

```go
$ go version
go version go1.17.13 darwin/arm64

$ go test -bench .
goos: darwin
goarch: arm64
pkg: github.com/zhongmingmao/go101
BenchmarkCriticalSectionSyncByMutex-10                  86978316                13.45 ns/op
BenchmarkCriticalSectionSyncByChannel-10                45155361                26.48 ns/op
BenchmarkCriticalSectionSyncByMutexParallel-10           9727924               122.0 ns/op
BenchmarkCriticalSectionSyncByChannelParallel-10         7976410               150.0 ns/op
PASS
ok      github.com/zhongmingmao/go101   5.075s
```

> `不想转移`结构体对象的`所有权`，但又要保证结构体`内部状态数据`的`同步访问`的场景

1. 基于 `channel` 的并发设计，在 goroutine 间通过 channel `转移`数据对象的`所有权`
2. 只有拥有数据对象的所有权（`从 channel 接收到该数据`）的 goroutine 才可以对该数据对象进行状态变更

## 注意事项

```go sync/mutex.go
// Values containing the types defined in this package should not be copied.

// A Mutex must not be copied after first use.
```

```go sync/rwmutex.go
// A RWMutex must not be copied after first use.
```

```go sync/cond.go
// A Cond must not be copied after first use.
```

```go sync/mutex.go
// A Mutex is a mutual exclusion lock.
// The zero value for a Mutex is an unlocked mutex.
//
// A Mutex must not be copied after first use.
type Mutex struct {
	state int32		// 表示当前互斥锁的状态
	sema  uint32	// 用于控制锁状态的信号量
}
```

1. 初始状态下，Mutex 实例处于 `Unlocked` 状态（state 和 sema 均为 0）
2. 对 Mutex 实例的复制，即对 state 和 sema 的复制
   - 一旦发生复制，原变量和副本就是两个`单独的内存块`，彼此`没有关联`

```go
func main() {
	var wg sync.WaitGroup
	i := 0
	var mu sync.Mutex

	wg.Add(1)
	go func(m sync.Mutex) { // 锁复制，竞争的不是同一把锁
		defer wg.Done()
		defer m.Unlock()

		m.Lock() // 首先加锁成功
		fmt.Printf("%v : g1 lock success\n", time.Now())
		i = 10
		fmt.Printf("%v : g1: i = %d\n", time.Now(), i)
		time.Sleep(10 * time.Second)
		// 虽然一开始加锁成功，将 i 修改为 10，但因为竞争的不是同一把锁，所以 g0 可以把 i 修改为 1
		fmt.Printf("%v : g1: i = %d\n", time.Now(), i)
	}(mu)

	time.Sleep(time.Second)

	mu.Lock() // 同样可以加锁成功，此时 g1 还持有锁，说明 g0 和 g1 竞争的不是同一把锁
	fmt.Printf("%v : g0 lock success\n", time.Now())
	i = 1
	fmt.Printf("%v : g0: i = %d\n", time.Now(), i)
	mu.Unlock()

	wg.Wait()
}

// Output:
//	22:27:58.470524 +0800 CST m=+0.000175667 : g1 lock success
//	22:27:58.470729 +0800 CST m=+0.000380042 : g1: i = 10
//	22:27:59.471581 +0800 CST m=+1.001241417 : g0 lock success
//	22:27:59.471749 +0800 CST m=+1.001409584 : g0: i = 1
//	22:28:08.471818 +0800 CST m=+10.001557459 : g1: i = 1
```

> 一旦 Mutex 类型变量被`拷贝`，原副本和变量就`各自发挥作用`了，互相`没有关联`了

1. 如果对使用过的，`sync` 包中类型的实例进行`复制`，并使用复制后的副本，可能会导致`不可预测`的结果
2. 使用 `sync` 包类型，推荐使用`闭包`或者传递类型实例的`地址`（指针）

## 同步原语

### Mutex / RWMutex

> 都可用于`临界区同步`，且都是`零值可用`（无需`显式初始化`）

#### Mutex

> 临界区同步原语的`首选`，使用最为`广泛`，常用于对结构体对象的`内部状态`、缓存等进行保护

```go
var mu sync.Mutex
defer mu.Unlock()

mu.Lock()
// do something
```

1. 一旦某个 goroutine 调用 Mutex 执行 Lock 操作成功，该 goroutine 将成功持有这个 Mutex
2. 此时，其它 goroutine 执行 Lock 操作，将会被`阻塞`在该 Mutex 上
   - 直到持有该 Mutex 的 goroutine 调用 Unlock 释放 Mutex
3. 然后，其它 goroutine 才有机会去`竞争` Mutex 的`所有权`并进入临界区

> 使用 Mutex 的原则

1. 尽量`降低锁粒度`，减少其它 goroutine `阻塞`而带来的`性能损耗`
2. 记得 `Unlock`，避免`死锁`，可以借助 `defer`

#### RWMutex

> `读读不互斥`

```go
var rwmu sync.RWMutex

rwmu.RLock()
// read something
rwmu.RUnlock()

rwmu.Lock()
// write something
rwmu.Unlock()
```

> 适用于具有`一定的并发量`且`读多写少`的场景（随着并发量增大，RWMutex `写锁性能`会有`下降`趋势）

### Cond

1. `sync.Cond` 是传统的`条件变量原语`概念在 Go 中的实现
2. Cond 相当于一个容器
   - 该容器中存放着一组`等待某个条件成立`的 goroutine
   - 当`条件成立`时，处于等待状态的 goroutine 将会得到通知，并被`唤醒`继续进行后续工作
3. 如果没有 Cond，可以在 goroutine 中以`轮询`的方式，探测条件是否为真
   - 轮询非常`消耗资源`，该过程 goroutine 处于`活动状态`

> 轮询

```go
type signal struct{}

var ready bool

func worker(i int) {
	fmt.Printf("worker %d: is working\n", i)
	time.Sleep(time.Second)
	fmt.Printf("worker %d: is done\n", i)
}

func spawnGroup(f func(i int), num int, mu *sync.Mutex) <-chan signal {
	c := make(chan signal)
	var wg sync.WaitGroup

	for i := 0; i < num; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()

			for {
				mu.Lock()
				if !ready {
					mu.Unlock()
					time.Sleep(time.Millisecond * 100)
					continue
				}
				mu.Unlock()
				fmt.Printf("worker %d: start to work\n", i)
				f(i)
				break
			}
		}(i)
	}

	go func() {
		wg.Wait()
		c <- signal{}
	}()

	return c
}

func main() {
	fmt.Println("start a group of workers")
	mu := &sync.Mutex{}
	c := spawnGroup(worker, 10, mu)

	time.Sleep(time.Second * 5)
	fmt.Println("ready to work")

	go func() {
		mu.Lock()
		ready = true
		mu.Unlock()
	}()

	<-c
	fmt.Println("all workers are done")
}

// Output:
//	start a group of workers
//	ready to work
//	worker 6: start to work
//	worker 6: is working
//	worker 0: start to work
//	worker 0: is working
//	worker 2: start to work
//	worker 2: is working
//	worker 9: start to work
//	worker 9: is working
//	worker 8: start to work
//	worker 8: is working
//	worker 1: start to work
//	worker 1: is working
//	worker 3: start to work
//	worker 3: is working
//	worker 4: start to work
//	worker 4: is working
//	worker 7: start to work
//	worker 7: is working
//	worker 5: start to work
//	worker 5: is working
//	worker 1: is done
//	worker 6: is done
//	worker 0: is done
//	worker 2: is done
//	worker 9: is done
//	worker 8: is done
//	worker 5: is done
//	worker 3: is done
//	worker 4: is done
//	worker 7: is done
//	all workers are done
```

> Cond - 资源消耗更小、使用体验更佳

```go
type signal struct{}

var ready bool

func worker(i int) {
	fmt.Printf("worker %d: is working\n", i)
	time.Sleep(time.Second)
	fmt.Printf("worker %d: is done\n", i)
}

func spawnGroup(f func(i int), num int, groupSignal *sync.Cond) <-chan signal {
	c := make(chan signal)
	var wg sync.WaitGroup

	for i := 0; i < num; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()

			groupSignal.L.Lock()
			if !ready {
				groupSignal.Wait() // 进入等待状态，等待 Broadcast 信号，在 goroutine 挂起前会进行 Unlock 操作
			}
			groupSignal.L.Unlock()

			fmt.Printf("worker %d: start to work\n", i)
			f(i)
		}(i)
	}

	go func() {
		wg.Wait()
		c <- signal{}
	}()

	return c
}

func main() {
	fmt.Println("start a group of workers")
	// 需要一个满足 sync.Locker 接口的类型实例，通常为 sync.Mutex
	// Cond 需要这个互斥锁来同步临界区，保护用作条件的数据
	groupSignal := sync.NewCond(&sync.Mutex{})
	c := spawnGroup(worker, 10, groupSignal)

	time.Sleep(time.Second * 5)
	fmt.Println("ready to work")

	go func() {
		groupSignal.L.Lock()
		ready = true
		// 各个阻塞的 goroutine 将被唤醒，从 Wait 返回，返回前会再次加锁让 goroutine 进入临界区
		// 然后再次对条件数据进行判定
		//	1. 如果条件成立，会进行解锁并进入下一个工作阶段
		// 	2. 如果条件不成立，会再次调用 Wait 方法挂起等待
		groupSignal.Broadcast()
		groupSignal.L.Unlock()
	}()

	<-c
	fmt.Println("all workers are done")
}

// Output:
//	start a group of workers
//	ready to work
//	worker 6: start to work
//	worker 6: is working
//	worker 0: start to work
//	worker 0: is working
//	worker 2: start to work
//	worker 2: is working
//	worker 9: start to work
//	worker 9: is working
//	worker 8: start to work
//	worker 8: is working
//	worker 1: start to work
//	worker 1: is working
//	worker 3: start to work
//	worker 3: is working
//	worker 4: start to work
//	worker 4: is working
//	worker 7: start to work
//	worker 7: is working
//	worker 5: start to work
//	worker 5: is working
//	worker 1: is done
//	worker 6: is done
//	worker 0: is done
//	worker 2: is done
//	worker 9: is done
//	worker 8: is done
//	worker 5: is done
//	worker 3: is done
//	worker 4: is done
//	worker 7: is done
//	all workers are done
```

# Atomic

```go
var a int
a++
```

> 需要 3 条普通机器指令来完成，在执行过程中`可被中断`

1. `LOAD`：将变量从内存加载到 CPU 寄存器
2. `ADD`：执行加法指令
3. `STORE`：将结果存储回原内存地址

> `原子操作`的指令是`不可中断`的，相当于一个`事务`

1. 原子操作由`底层硬件`直接提供支持，是一种硬件实现的`指令级事务`
   - 相对于`操作系统`层面和 `Go Runtime` 层面提供的同步技术而言，更为`原始`
2. `atomic` 包`封装`了 `CPU` 实现的部分原子操作指令，为用户层提供`体验良好`的原子操作函数
   - `atomic` 包中提供的原语更接近`硬件底层`，也更为`低级`
   - 常用于实现更为`高级`的`并发同步`技术，如 `channel` 和 `sync` 包中的同步原语

> channel -> sync -> atomic

```go
var n int64

func addSyncByAtomic(delta int64) int64 {
	return atomic.AddInt64(&n, delta)
}

func readSyncByAtomic() int64 {
	return atomic.LoadInt64(&n)
}
```

1. 随着并发量提升，使用 atomic 实现的`共享变量`的`并发读写性能`更为`稳定`
2. `原子读`，相对于 `RWMutex` 的`读`，具有更好的`伸缩性`和`高性能`

> 适用于对`性能十分敏感`，并发量较大且读多写少的场景

> 限制：只能同步一个`整型`或者`自定义类型`变量
> 如果需要对`复杂的临界区数据`进行`同步`，首先依然是 `sync` 包中的原语

