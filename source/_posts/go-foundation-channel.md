---
title: Go - Channel
mathjax: false
date: 2023-01-17 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-chan.png
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 一等公民

1. Go 在语法层面将 channel 作为`一等公民`对待
2. 可以像使用`普通变量`那样使用 channel
   - 定义 channel 类型`变量`、给 channel 变量`赋值`
   - 将 channel 作为`参数`传递给函数或者方法
   - 将 channel 作为`返回值`从函数或者方法中返回
   - 将 channel 发送到其它 channel

<!-- more -->

# 基本用法

## make

> 与 slice、struct、map 一样，channel 是`复合`数据类型，即`声明` channel 类型变量时，必须给出具体的`元素类型`
> channel 类型变量在声明时，如果没有被赋予初值，默认值为 `nil`，即 `nil channel`（读写`都阻塞`）

```go
// 声明一个元素为 int 类型的 channel 类型变量
var ch chan int
```

> slice、struct、map 都支持使用`复合类型字面值`作为变量初始值，`channel` 类型变量`赋初值`的唯一方法是 `make`

```go
ch1 := make(chan int)    // 无缓冲
ch2 := make(chan int, 5) // 有缓冲，缓冲大小为 5
```

## send / receive

> channel 用于 `goroutine 间通信`，绝大多数对 channel 的读写都分别放在`不同的 goroutine` 中

### 无缓冲

> goroutine 对无缓冲 channel 的`接收`和`发送`操作都是`同步`的

> 只有对它进行接收操作的 goroutine 和对它进行发送操作的 goroutine `都存在`的情况下，通信才能进行
> `单方面`的操作会让 goroutine 陷入`挂起`状态

```go
func main() {
	ch := make(chan int) // 对 ch 的读写都在 main goroutine
	ch <- 13             // fatal error: all goroutines are asleep - deadlock!
	println(<-ch)
}
```

> 将`接收`操作或者`发送`操作放到`另一个` goroutine

```go
func main() {
	ch := make(chan int)

	go func() {
		ch <- 13
	}()

	println(<-ch) // 13
}
```

```go
func main() {
	ch := make(chan int)

	go func() {
		println(<-ch) // 13
	}()

	ch <- 13
}
```

> 对`无缓冲` channel 类型的`发送`和`接收`操作，一定要放在`不同`的 goroutine 中进行，否则会导致 `deadlock`

### 有缓冲

> 对带缓冲 channel 的`发送`操作在缓冲区`未满`和`接收`操作在缓冲区`非空`的情况下都是`异步`（无需`阻塞`等待）的
>
> 1. 在缓冲区`满`的情况下，对它进行`发送`操作的 goroutine 会`阻塞挂起`
> 2. 在缓冲区`空`的情况下，对它进行`接收`操作的 goroutine 会`阻塞挂起`

```go
ch := make(chan int, 1)
n := <-ch // 此时缓冲区空，对其进行接收操作会导致 goroutine 阻塞挂起
```

```go
ch := make(chan int, 1)
ch <- 17 // ok
ch <- 27 // 此时缓冲区满，对其进行发送操作会导致 goroutine 阻塞挂起
```

## send-only / receive-only

```go
ch1 := make(chan<- int) // send-only
ch2 := make(<-chan int) // receive-only

<-ch1     // invalid operation: <-ch1 (receive from send-only type chan<- int)
ch2 <- 13 // invalid operation: ch2 <- 13 (send to receive-only type <-chan int)
```

> 常用于函数的`参数`或者`返回值`，用于`限制`对 channel 内的操作

```go
func produce(ch chan<- int) {
	for i := 0; i < 10; i++ {
		ch <- i
		time.Sleep(time.Second)
	}
	close(ch) // 关闭 channel 后，所有等待从该 channel 接收数据的操作都将返回
}

func consume(ch <-chan int) {
	// 阻塞在对 channel 的接收操作上，直到 channel 中有数据或者 channel 被关闭（终止循环）
	for v := range ch {
		println(v)
	}
}

func main() {
	ch := make(chan int, 5)

	var wg sync.WaitGroup
	wg.Add(2)

	go func() {
		produce(ch)
		wg.Done()
	}()

	go func() {
		consume(ch)
		wg.Done()
	}()

	wg.Wait()
}

// Output:
//	0
//	1
//	2
//	3
//	4
//	5
//	6
//	7
//	8
//	9
```

## close

> `发送端`负责关闭 channel，`接收端`可以安全判断出 channel `是否被关闭`

```go
ch := make(chan int, 1)

n := <-ch           // 当 ch 被关闭后，n 将被赋值为 ch 元素类型的零值
m, ok := <-ch       // 当 ch 被关闭后，m 将被赋值为 ch 元素类型的零值，ok 将被赋值为 false
for v := range ch { // 当 ch 被关闭后，循环会自动结束
}
```

> 向一个`已经关闭`的 channel 执行`发送`操作，会引发 `panic`

```go
ch := make(chan int, 1)

close(ch)
ch <- 1 // panic: send on closed channel
```

> 但从一个`已经关闭`的 channel 执行`接收`操作，不会发生 panic，但会得到一个`类型零值`

## select

> 同时在`多个` channel 上进行`发送`或者`接收`操作

```go
	select {
	case x := <-ch1: // 从 ch1 接收数据，即便 ch1 已经关闭，此时会得到一个类型零值
		...
	case y, ok := <-ch2: // 从 ch2 接收数据，并根据 ok 判断是否关闭
		...
	case ch3 <- z: // 将 z 发送到 ch3
    ...
	default:
    ...
	}
```

> 当 select 语句`没有 default 分支`，并且所有 case 中的 channel 操作都阻塞时，整个 select 语句被`阻塞`

# 常用范式

## 无缓冲

> 无缓冲 channel 兼具`通信`和`同步`特性

### 信号

#### 单播

> 1 - 1

```go
type signal struct{}

func worker() {
	println("worker is working")
	time.Sleep(1 * time.Second)
}

// 返回 channel，用于承载新 goroutine 退出的通知信号
// 用于通知 main goroutine
func spawn(f func()) <-chan signal {
	ch := make(chan signal)

	go func() {
		println("spawn: worker start to work")
		f()
		ch <- signal{}
	}()

	return ch
}

func main() {
	println("main: start a worker")
	c := spawn(worker)
	<-c // 等待 worker goroutine 的退出通知
	println("main: worker is done")
}

// Output:
//	main: start a worker
//	spawn: worker start to work
//	worker is working
//	main: worker is done
```

#### 广播

> 1 -n：协调多个 goroutine 一起工作，借助 `close`

```go
type signal struct{}

func worker(i int) {
	fmt.Printf("worker %d: is working\n", i)
	time.Sleep(1 * time.Second)
	fmt.Printf("worker %d: works done\n", i)
}

func spawnGroup(f func(i int), num int, groupSignal <-chan signal) <-chan signal {
	c := make(chan signal)
	var wg sync.WaitGroup

	for i := 0; i < num; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()

			if v, ok := <-groupSignal; !ok { // 阻塞在 groupSignal，等待关闭信号
				fmt.Printf("spawnGroup: worker %d: group signal is closed, v: %v\n", i, v)
			}

			fmt.Printf("spawnGroup: worker %d: start to work\n", i)
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
	fmt.Println("main: start a group of workers")
	groupSignal := make(chan signal)
	c := spawnGroup(worker, 5, groupSignal)
	time.Sleep(5 * time.Second)

	fmt.Println("main: the group of workers start to work")
	close(groupSignal) // 向所有 worker goroutine 广播关闭信号
	<-c
	fmt.Println("main: the group of workers works done")
}

// Output:
//	main: start a group of workers
//	main: the group of workers start to work
//	spawnGroup: worker 1: group signal is closed, v: {}
//	spawnGroup: worker 1: start to work
//	worker 1: is working
//	spawnGroup: worker 2: group signal is closed, v: {}
//	spawnGroup: worker 2: start to work
//	worker 2: is working
//	spawnGroup: worker 3: group signal is closed, v: {}
//	spawnGroup: worker 3: start to work
//	worker 3: is working
//	spawnGroup: worker 4: group signal is closed, v: {}
//	spawnGroup: worker 4: start to work
//	worker 4: is working
//	spawnGroup: worker 0: group signal is closed, v: {}
//	spawnGroup: worker 0: start to work
//	worker 0: is working
//	worker 2: works done
//	worker 3: works done
//	worker 4: works done
//	worker 1: works done
//	worker 0: works done
//	main: the group of workers works done
```

### 替代锁

> 无缓冲 channel 具有`同步`特性，可以在某些场合`替代锁`

#### 共享内存 + 互斥锁

```go
type counter struct {
	sync.Mutex // type embedding
	i          int
}

var c counter

func Increase() int {
	defer c.Unlock()

	c.Lock()
	c.i++
	return c.i
}

func main() {
	var wg sync.WaitGroup

	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()

			v := Increase()
			fmt.Printf("goroutine %d, counter: %d\n", i, v)
		}(i)
	}

	wg.Wait()
}

// Output:
//	goroutine 0, counter: 1
//	goroutine 9, counter: 2
//	goroutine 3, counter: 5
//	goroutine 6, counter: 6
//	goroutine 8, counter: 7
//	goroutine 2, counter: 4
//	goroutine 1, counter: 3
//	goroutine 5, counter: 9
//	goroutine 4, counter: 8
//	goroutine 7, counter: 10
```

#### 无缓冲 channel

> `通信 -> 共享内存`：不要通过`共享内存`来`通信`，而是通过`通信`来`共享内存`

```go
type Counter struct {
	i  int
	ch chan int
}

func NewCounter() *Counter {
	c := &Counter{
		ch: make(chan int), // 无缓冲 channel
	}

	go func() { // 委托给一个独立的 goroutine 去处理
		for {
			c.i++
			c.ch <- c.i // 利用无缓冲 channel 的同步阻塞特性
		}
	}()

	return c
}

func (c *Counter) Increase() int {
	return <-c.ch // 转换为无缓冲 channel 的一次接收动作，对应一次自增操作
}

func main() {
	c := NewCounter()
	var wg sync.WaitGroup

	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()

			v := c.Increase()
			fmt.Printf("goroutine %d, counter: %d\n", i, v)
		}(i)
	}

	wg.Wait()
}

// Output:
//	goroutine 2, counter: 1
//	goroutine 9, counter: 8
//	goroutine 8, counter: 7
//	goroutine 3, counter: 5
//	goroutine 0, counter: 2
//	goroutine 7, counter: 3
//	goroutine 4, counter: 6
//	goroutine 6, counter: 4
//	goroutine 5, counter: 9
//	goroutine 1, counter: 10
```

## 有缓冲

> 有缓冲与无缓冲的最大区别是它的`异步性`
> 带缓冲在`数据收发`的`性能`上要`明显优于`无缓冲

### 消息队列

> 场景：生产者-消费者

1. 对于带缓冲 channel，发送和接收的 `goroutine 数量越多`，收发性能会`有所下降`
2. 对于带缓冲 channel，选择`适当容量`会在一定程度上`提升收发性能`

### 信号量

1. 带缓冲 channel 中的`当前元素个数`代表`当前同时处于活动状态`的 `goroutine` 数量
2. 带缓冲 channel 的`容量`，代表允许`同时处于活动状态`的 goroutine 的`最大数量`

> 向带缓冲 channel 的一个`发送`操作表示`获得`一个信号量，而从 channel 的一个`接收`操作表示`释放`一个信号量

```go
var active = make(chan struct{}, 3)
var jobs = make(chan int, 10)

func main() {
	go func() {
		for i := 0; i < 10; i++ {
			jobs <- i
		}
		close(jobs)
	}()

	var wg sync.WaitGroup

	for j := range jobs {
		wg.Add(1)
		go func(j int) {
			defer wg.Done()

			active <- struct{}{} // 申请信号量
			fmt.Printf("%v: handling job %d\n", time.Now(), j)
			time.Sleep(4 * time.Second)
			<-active // 释放信号量
		}(j)
	}

	wg.Wait()
}

// Output:
//	17:37:32.708664 +0800 CST m=+0.000122751: handling job 9
//	17:37:32.708664 +0800 CST m=+0.000122335: handling job 0
//	17:37:32.708665 +0800 CST m=+0.000123376: handling job 4
//	17:37:36.709951 +0800 CST m=+4.001399626: handling job 1
//	17:37:36.709964 +0800 CST m=+4.001411793: handling job 2
//	17:37:36.710087 +0800 CST m=+4.001535293: handling job 3
//	17:37:40.712294 +0800 CST m=+8.003731793: handling job 5
//	17:37:40.712585 +0800 CST m=+8.004023001: handling job 7
//	17:37:40.712709 +0800 CST m=+8.004147043: handling job 8
//	17:37:44.715223 +0800 CST m=+12.006650085: handling job 6
```

### len -> select

1. 当 ch 为`无缓冲` channel 时，len(ch) 总是返回 `0`
2. 当 ch 为`有缓冲` channel 时，len(ch) 返回当前`尚未被读取`的元素个数

> channel 用于多个 goroutine 间的`通信`
> 一旦多个 goroutine 对 channel 进行收发操作，len 就会在多个 goroutine 间形成`竞态`

![image-20231126174746682](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231126174746682.png)

> 为了`不阻塞`在 channel 上，通过 `select` 实现`事务`，场景：`判空 + 读取`、`判满 + 写入`

> select 的 `default` 分支语义
> 当 channel 为`空`时，tryReceive 也`不会阻塞`；当 channel `满`时，trySend 也`不会阻塞`

```go
func trySend(c chan<- int, i int) bool {
	select {
	case c <- i:
		return true
	default: // channel 满
		return false
	}
}

func tryReceive(c <-chan int) (int, bool) {
	select {
	case i := <-c:
		return i, true
	default: // channel 空
		return 0, false
	}
}

func producer(c chan<- int) {
	i := 1
	for {
		time.Sleep((1 << 1) * time.Second)
		if ok := trySend(c, i); ok {
			fmt.Printf("producer: send %d to channel\n", i)
			i++
			continue
		}
		fmt.Printf("producer: try to send %d to channel, but channel is full\n", i)
	}
}

func consumer(c <-chan int) {
	for {
		i, ok := tryReceive(c)
		if !ok {
			fmt.Printf("consumer: try to receive from channel, but channel is empty\n")
			time.Sleep(1 * time.Second)
			continue
		}

		fmt.Printf("consumer: receive %d from channel\n", i)
		if i >= 3 {
			fmt.Printf("consumer: exit\n")
			return
		}
	}
}

func main() {
	var wg sync.WaitGroup

	c := make(chan int, 3)
	wg.Add(2)

	go func() {
		defer wg.Done()
		producer(c)
	}()

	go func() {
		defer wg.Done()
		consumer(c)
	}()

	wg.Wait()
}

// Output:
//	consumer: try to receive from channel, but channel is empty
//	consumer: try to receive from channel, but channel is empty
//	consumer: try to receive from channel, but channel is empty
//	producer: send 1 to channel
//	consumer: receive 1 from channel
//	consumer: try to receive from channel, but channel is empty
//	producer: send 2 to channel
//	consumer: receive 2 from channel
//	consumer: try to receive from channel, but channel is empty
//	consumer: try to receive from channel, but channel is empty
//	producer: send 3 to channel
//	consumer: receive 3 from channel
//	consumer: exit
//	producer: send 4 to channel
//	producer: send 5 to channel
//	producer: send 6 to channel
//	producer: try to send 7 to channel, but channel is full
//	producer: try to send 7 to channel, but channel is full
//	producer: try to send 7 to channel, but channel is full
//	producer: try to send 7 to channel, but channel is full
//	producer: try to send 7 to channel, but channel is full
//	producer: try to send 7 to channel, but channel is full
```

> 约束：只有在 `channel 状态`发生`变化`时，才能`探测`到

> 特定场景下（`单向无竞争`），可以利用 len 来实现

![image-20231126181134330](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231126181134330.png)

## nil channel

> 如果一个 channel 类型变量的`值`为 nil，即 nil channel，对其的`读写`都会`阻塞`

```go
func main() {
	var c chan int
	println(c)        // 0x0
	println(c == nil) // true

	<-c // fatal error: all goroutines are asleep - deadlock!
}
```

```go
func main() {
	var c chan int
	println(c)        // 0x0
	println(c == nil) // true

	c <- 1 // fatal error: all goroutines are asleep - deadlock!
}
```

> 从一个`已经关闭`的 channel `接收`数据`永远不会阻塞`，而是会立即返回一个`类型零值`

```go
// 前 5s，select 一直处于阻塞状态
// 第 5s，ch1 返回一个 5 后被 close，重新 select
// ch1 已经被关闭，从一个已经关闭的 channel 接收数据永远不会阻塞，而是会立即返回一个类型零值，即 0
// 第 7s，ch2 返回一个 7 后被 close，退出循环
func main() {
	ch1, ch2 := make(chan int), make(chan int)

	go func() {
		time.Sleep(5 * time.Second)
		ch1 <- 5
		close(ch1)
	}()

	go func() {
		time.Sleep(7 * time.Second)
		ch2 <- 7
		close(ch2)
	}()

	var ok1, ok2 bool
	for {
		select {
		case v := <-ch1:
			ok1 = true
			fmt.Println(v)
		case v := <-ch2:
			ok2 = true
			fmt.Println(v)
		}

		if ok1 && ok2 {
			break
		}
	}
	fmt.Println("Done")
}

// Output:
// 5
// 0
// 0
// ... // 循环输出 0
// 0
// 7
// Done
```

> 将已经`关闭`的 channel `重置为 nil`，而 `nil channel` 的特性为`读写都阻塞`，不会再被 select 选中

```go
func main() {
	ch1, ch2 := make(chan int), make(chan int)

	go func() {
		time.Sleep(5 * time.Second)
		ch1 <- 5
		close(ch1)
	}()

	go func() {
		time.Sleep(7 * time.Second)
		ch2 <- 7
		close(ch2)
	}()

	for {
		select {
		case v, ok := <-ch1:
			if ok {
				fmt.Println(v)
			} else {
				ch1 = nil // 探测到 channel 被关闭，将其置为 nil，读写都会阻塞，下次 select 时将不会再选中该 case
			}
		case v, ok := <-ch2:
			if ok {
				fmt.Println(v)
			} else {
				ch2 = nil
			}
		}

		if ch1 == nil && ch2 == nil {
			break
		}

	}
	fmt.Println("Done")
}

// Output:
// 5
// 7
// Done
```

## select

### default

1. 参照上述 `trySend` 和 `tryReceive`
2. 无论是`无缓冲` channel 还是`带缓冲` channel 都`适用`

```go time/sleep.go
func sendTime(c interface{}, seq uintptr) {
	// 无阻塞地向 c 发送当前时间
	select {
	case c.(chan Time) <- Now():
	default:
	}
}
```

### 超时

```go
var c chan int

func worker() {
	select {
	case <-c:
		// do something
	case <-time.After(30 * time.Second):
		return
	}
}
```

```go time/sleep.go
func After(d Duration) <-chan Time {
	return NewTimer(d).C
}
```

1. `timer` 是由 `Go Runtime` 维护的，而不是`操作系统级`的定时器资源，`使用代价`要低很多
2. 避免因为使用 Timer 而给 `Go Runtime` 和 `Go GC` 带来压力，要及时调用 Timer 的 `Stop` 方法来`回收` Timer 资源

```go
var c chan int

func worker() {
	timer := time.NewTimer(10 * time.Second)
	defer timer.Stop()

	select {
	case <-c:
		// do something
	case <-timer.C:
		return
	}
}
```

### 心跳

> 记得 `Stop`，避免心跳事件在 Ticker 的 channel 中`持续产生`

```go
var c chan int

func worker() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-c:
			// do something
		case <-ticker.C:
			// do heartbeat stuff
		}
	}
}
```

> 按照一定的`时间间隔`持续产生事件

```go time/tick.go
type Ticker struct {
	C <-chan Time // The channel on which the ticks are delivered.
	r runtimeTimer
}
```



