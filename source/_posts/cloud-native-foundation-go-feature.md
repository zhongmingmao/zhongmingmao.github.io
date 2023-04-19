---
title: Cloud Native Foundation - Go Feature
mathjax: false
date: 2022-10-02 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/go-music.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go
tags:
  - Cloud Native
  - Go
---

# 函数

## Main 函数

1. 每个 Go 程序都应该有个`main package`
2. `main package` 里的 main 函数是 Go 程序的入口

<!-- more -->

## Init 函数

1. init 函数会在**包初始化**时运行，**仅运行一次**
2. `谨慎使用`

> 样例：A 依次依赖 B 和 C ，但 B 也会依赖 C，初始化顺序：`C -> B -> A`

## 返回值

1. 支持`多值返回`
2. 支持`命名返回值`：被视为定义在函数顶部的**变量**
3. 调用者可以**忽略**部分返回值

## 回调函数

> 函数作为`参数`传入其它函数，并在其它函数内部`调用执行`

```go
func main() {
	DoOperation(1, increase)
	DoOperation(1, decrease)
}

func DoOperation(x int, f func(a, b int)) {
	f(x, 1)
}

func increase(a, b int) {
	fmt.Println(a + b)
}

func decrease(a, b int) {
	fmt.Println(a - b)
}
```

## 闭包

> 闭包为`匿名函数`，一般没有`复用`需求

1. **不能独立存在**
2. 可以**赋值给其它变量**
   - `x := func() {}`
3. 可以**直接调用**
   - `func(a, b int) { fmt.Println(a + b) }(1, 2)`
4. 可以**作为函数返回值**
   - `Add() func(x int) int`

```go
	defer func() {
		if r := recover(); r != nil {
			fmt.Println("recovered!")
		}
	}()
```

> 至此，函数可以作为：`参数`、`返回值`、`变量`

## 方法

> 作用在`接收者`上的函数

> 将`上下文`保存在 receiver 属性，方法可以直接访问 receiver 属性，进而`减少参数的传递`

```go
type Human struct {
	firstName, lastName string
}

func (h *Human) GetName() string {
	return h.firstName + "," + h.lastName
}

func main() {
	h := new(Human)
	h.firstName = "Java"
	h.lastName = "Go"
	fmt.Println(h.GetName())
}
```

## 值传递

> 与 Java 类似

1. Go 只有一种规则：`值传递`
2. 函数内修改参数的值不会影响函数外原始变量的值
3. 可以传递`指针参数`将变量地址传递给调用函数
   - Go 会复制该指针作为函数内的地址，但`指向同一地址`

```go
aStr := "new string value"
pointer := &aStr
bStr := *pointer
fmt.Println(aStr)    // new string value
fmt.Println(pointer) // 0x14000010260
fmt.Println(bStr)    // new string value

aStr = "changed string value"
fmt.Println(aStr)    // changed string value
fmt.Println(pointer) // 0x14000010260
fmt.Println(bStr)    // new string value
```

```go
type Human struct {
	name string
}

func changeHumanSuccess(h *Human, name string) {
	h.name = name
}

func changeHumanFail(h Human, name string) {
	h.name = name
}

func main() {
	h := Human{name: "Java"}
	fmt.Println(h) // {Java}

	changeHumanSuccess(&h, "Go")
	fmt.Println(h) // {Go}

	changeHumanFail(h, "Node.js")
	fmt.Println(h) // {Go}
}
```

# 接口

> 接口定义了一组`方法集合`

1.  `duck typing`：struct 无需显式声明实现 interface
2. 一个struct 可以`实现多个 interface`
3. interface 中`不能定义属性`
4. interface 可以`嵌套`其它 interface
5. struct 除了实现 interface 定义的接口外，还可以有额外的方法

> `interface 可能为 nil`，使用 interface 需要先判空，否则可能会触发 `nil panic`

> `struct 初始化意味着空间分配`，对 struct 的引用不会触发 `nil panic`

```go
type IF interface {
	getName() string
}

type Human struct {
	firstName, lastName string
}

type Car struct {
	factory, model string
}

func (h *Human) getName() string {
	return h.firstName + "," + h.lastName
}

func (c *Car) getName() string {
	return c.factory + "," + c.model
}

func main() {
	var ifs []IF

	h := new(Human)
	h.firstName = "Java"
	h.lastName = "Go"
	ifs = append(ifs, h)

	c := new(Car)
	c.factory = "xp"
	c.model = "p7"
	ifs = append(ifs, c)

	for _, i := range ifs {
		fmt.Println(i.getName())
	}
}
```

# 反射

> `reflect.TypeOf`：返回被检查对象的`类型`
> `reflect.ValueOf`：返回被检查对象的`值`

```go
m := make(map[string]string, 10)
m["a"] = "b"
t := reflect.TypeOf(m)
fmt.Println(t) // map[string]string
v := reflect.ValueOf(m)
fmt.Println(v) // map[a:b]
```

```go
type T struct {
	A string
}

func (t T) GetA() string {
	return t.A
}

func (t *T) Append(s string) {
	t.A = t.A + s
}

func main() {
	t := T{A: "a"}
	v := reflect.ValueOf(t)
	for i := 0; i < v.NumField(); i++ {
		fmt.Printf("%d: %v\n", i, v.Field(i)) // 0: a
	}

	// 0: 0x1005719e0 -> <func() string Value>
	for i := 0; i < v.NumMethod(); i++ {
		fmt.Printf("%d: %v -> %v\n", i, v.Method(i), v.Method(i).String())
	}

	result := v.Method(0).Call(nil)
	fmt.Println(result) // [a]

	// 0: {Append  func(*main.T, string) <func(*main.T, string) Value> 0}
	// 1: {GetA  func(*main.T) string <func(*main.T) string Value> 1}
	p := reflect.TypeOf(&t)
	for i := 0; i < p.NumMethod(); i++ {
		fmt.Printf("%d: %v\n", i, p.Method(i))
	}
}
```

# OOP

| Key        | Value                                                       |
| ---------- | ----------------------------------------------------------- |
| 可见性控制 | public - 大写 - `跨包使用`<br />private - 小写 - `包内使用` |
| 继承       | 通过`组合`实现，内嵌一个或多个 struct                       |
| 多态       | 通过`接口`实现                                              |

# JSON

```go
type Human struct {
	Name string
}

func main() {
	human := Human{Name: "zhongmingmao"}

	marshal := Marshal(&human)
	fmt.Println(marshal) // {"Name":"zhongmingmao"}

	unmarshal := Unmarshal(marshal)
	fmt.Println(unmarshal) // {zhongmingmao}
}

func Marshal(human *Human) string {
	bytes, err := json.Marshal(human)
	if err != nil {
		println(err)
		return ""
	}
	return string(bytes)
}

func Unmarshal(marshal string) Human {
	human := Human{}
	err := json.Unmarshal([]byte(marshal), &human)
	if err != nil {
		println(err)
	}
	return human
}
```

> `json` 使用 `map[string]interface{}` 和 `[]interface{}` 保存任意类型

```go
func main() {
	m := map[string]interface{}{}
	m["name"] = "bom"
	m["height"] = 183

	// {"height":183,"name":"bom"}
	marshal := Marshal(&m)
	fmt.Println(marshal)

	// type of height is float64, value is 183
	// type of name is string, value is bom
	Unmarshal(marshal)
}

func Marshal(obj *map[string]interface{}) string {
	bytes, err := json.Marshal(obj)
	if err != nil {
		println(err)
		return ""
	}
	return string(bytes)
}

func Unmarshal(s string) {
	var obj interface{}

	// []byte(s) - 类型转换
	err := json.Unmarshal([]byte(s), &obj)
	if err != nil {
		println(err)
		return
	}

	// obj.(map[string]interface{}) - 类型断言
	if m, ok := obj.(map[string]interface{}); ok {
		for k, v := range m {
			switch value := v.(type) {
			case string:
				fmt.Printf("type of %s is string, value is %v\n", k, value)
			case float64:
				fmt.Printf("type of %s is float64, value is %v\n", k, value)
			case interface{}:
				fmt.Printf("type of %s is interface{}, value is %v\n", k, value)
			default:
				fmt.Printf("type of %s is wrong, value is %v\n", k, value)
			}
		}
	}
}
```

# error

> Go 没有内置的 Exception 机制，只提供了 `error` 接口

```go
type error interface {
	Error() string
}
```

> `error` 为 `interface`，处理时需要判断是否为 `nil`

```go
// 创建新的 error
e1 := errors.New("Not Found")
e2 := fmt.Errorf("code %d", 404)
```

> 借助 `struct` 实现自定义的 error 归类

```go
type HttpError struct {
	Code Code
}

type Code struct {
	Message string
}

// HttpError implements Error interface
func (e *HttpError) Error() string {
	return e.Code.Message
}

func main() {
	var es []error
	es = append(es, &HttpError{Code: Code{Message: "Not Found"}})
}
```

# defer

> 函数`返回之前`执行某个语句或者函数，等同于 Java 的 `finally`，一般是用来`关闭资源`（防止`资源泄露`）

```go
defer file.Close()
defer mu.Unlock()
```

> defer 的执行顺序类似于一个`栈`

```go
// main completed
// Rust Go Java
func main() {
	defer fmt.Printf("Java ")
	defer fmt.Printf("Go ")
	defer fmt.Printf("Rust ")
	time.Sleep(time.Second)
	fmt.Println("main completed")
}
```

> 死锁：`fatal error: all goroutines are asleep - deadlock!`

```go
func deadLock() {
	mutex := sync.Mutex{}
	for i := 0; i < 3; i++ {
		mutex.Lock()         // Go Mutex 是不可重入的
		defer mutex.Unlock() // defer 会压栈，需要等待 deadLock 执行完成
		fmt.Println(i)
	}
}
```

> 解决方法：`闭包`（`defer` 是在一个`函数退出`的时候`弹栈`执行的）

```go
mutex := sync.Mutex{}
for i := 0; i < 10; i++ {
  go func(i int) {
    mutex.Lock()
    defer mutex.Unlock() // defer 会在闭包退出前弹栈执行
    fmt.Println(i)
  }(i)
}
time.Sleep(time.Second)
```

# panic + recover

> panic：可在系统出现`不可恢复错误`时主动调用 panic，让`当前线程`直接 `crash`
> defer：`保证执行`，并把`控制权`交还给`接收到 panic 的函数调用者`
> recover：`函数从 panic 中恢复`

```go
// defer func is called
// a panic is triggered
// main completed
func main() {
	panicFunc()
	fmt.Println("main completed")
}

func panicFunc() {
	// 声明 defer（主要用于处理潜在的资源泄露和 panic）
	defer func() {
		// 抢救一下
		fmt.Println("defer func is called")
		// 抢救成功，从 panic 中恢复
		if err := recover(); err != nil {
			fmt.Println(err)
		}
	}()

	panic("a panic is triggered")
}
```

# 多线程

## 并发 vs 并行

> `并发`（`concurrency`）：多个事件`间隔发生`

![image-20230418235406286](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20230418235406286.png)

> `并行`（`parallellism`）：多个事件`同时发生`

![image-20230418235507698](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20230418235507698.png)

## 协程

### 对比

#### 进程

1. `分配系统资源`（CPU 时间、内存）的基本单位
2. 有`独立的内存空间`，切换开销大

#### 线程

1. 线程为进程的一个`执行流`，是 `CPU 调度`并能独立运行的基本单位
2. 同一进程中的多线程`共享内存空间`，切换开销小
3. 多线程通信相对方便
4. 从 `Kernel` 视角来看，`线程本质上是一种特殊的进程`
   - 线程与父进程共享：`打开的文件`、`文件系统信息`、`地址空间`、`信号处理函数`

#### 协程

1. Go 中`轻量级线程`实现
2. Go 在`语言层面`支持了协程

### CSP

> `Communicating Sequential Process`

1. CSP
   - 两个`并发实体`通过`共享的 channel` 进行通信的并发模型
2. goroutine
   - goroutine 为`轻量级线程`，并不对应 OS 的线程 -- Java
     - 将 OS 线程`分段使用`，通过`调度器`实现协作式调度
   - goroutine 是一种`微线程`，能够在发现`阻塞`后启动新的微线程
3. channel
   -  类似于 Unix 的 Pipe，`用于 goroutine 之间的通信和同步`
   - `goroutine 之间解耦，但 goroutine 与 channel 耦合`

### Goroutine vs Thread

1. `默认内存占用少`
   - goroutine - 2KB
   - thread - 8MB
2. `切换开销小`
   - goroutine - 3 个寄存器
   - thread - `模式切换`（用户态、内核态）、16 个寄存器
3. `并行数量`
   - goroutine - GOMAXPROCS
   - thread - 受限于 OS

### 样例

```go
for i := 0; i < 3; i++ {
  go func(i int) {
    fmt.Println(i)
  }(i)
}
time.Sleep(time.Second)
```

## channel

> channel 是多个 goroutine 之间`通讯`的管道

> Java 中的线程间通信是基于`共享内存`

1. 一端发送数据，一端接收数据
2. `同一时间只有一个 goroutine 可以访问数据`
   - 没有因为`内存共享`而导致的`内存竞争`
3. 协调 goroutine 的执行顺序

```go
ch := make(chan int)

go func() {
  ch <- 1 << 4 // 数据写入 channel
}()

i := <-ch // 从 channel 中读取数据
fmt.Println(i)
```

### 缓冲区

1. 基于 channel 的通信是`同步`的
2. 当缓冲区满时，数据的发送是`阻塞`的
3. 通过 `make` 关键字创建 channel 时可以定义缓冲区容量（默认为 `0`）
   - 默认容量为 `0`，类似于 Java 的 `SynchronousQueue`

> 读阻塞写

```go
ch := make(chan int)

go func() {
  time.Sleep(time.Second)
  fmt.Println("read start")
  _ = <-ch
}()

ch <- 1 << 4
fmt.Println("write end")

// read start
// write end
```

> 写阻塞读

```go
ch := make(chan int)

go func() {
  _ = <-ch
  fmt.Println("read end")
}()

time.Sleep(time.Second)
fmt.Println("write start")
ch <- 1 << 4

time.Sleep(time.Second)

// write start
// read end
```

### 遍历缓冲区

```go
c := 1 << 2
ch := make(chan int, c)

go func() {
  for i := 0; i < c; i++ {
    rand.Seed(time.Now().UnixNano())
    n := rand.Intn(c)
    fmt.Println("put:", n)
    ch <- n
  }
  close(ch) // 不再发送，只有发送方需要关闭 channel
}()

for v := range ch {
  fmt.Println("receive:", v)
}
```

### 单向

> 双向 -> 单向

>只写 channel：`var writeOnly chan<- int`
>只读 channel：`var readOnly <-chan int`

```go
func main() {
	ch := make(chan int)

	go produce(ch)
	go consume(ch)

	time.Sleep(time.Second)
}

func produce(ch chan<- int) {
	for {
		ch <- 0
	}
}

func consume(ch <-chan int) {
	for {
		<-ch
	}
}
```

### 关闭

1. channel `无需每次关闭`
2. 关闭的作用：告诉接收者该 channel 再`无新数据`发送
3. 只有`发送者`需要关闭 channel

```go
ch := make(chan int)
defer close(ch)

go func() {
  ch <- 0
}()

go func() {
  if v, opened := <-ch; opened {
    fmt.Println(v)
  }
}()
```

### select

> 如果所有 channel 都`阻塞`，则`等待`或者执行 `default`，或者`随机选择`

```go
// receive one
// receive two
func main() {
	ch1 := make(chan string)
	ch2 := make(chan string)

	go func() {
		time.Sleep(time.Second)
		ch1 <- "one"
	}()

	go func() {
		time.Sleep(1 << 1 * time.Second)
		ch2 <- "two"
	}()

	for i := 0; i < 2; i++ {
		select {
		case msg1 := <-ch1:
			fmt.Println("receive", msg1)
		case msg2 := <-ch2:
			fmt.Println("receive", msg2)
		}
	}
}
```

### timer

> `time.Ticker` 以固定的时间间隔重复地向 `channel C` 发送时间值
> 使用场景：为 goroutine 设定超时时间

```go
// timeout waiting from ch
func main() {
	ch := make(chan int)
	timer := time.NewTimer(time.Second)

	go func() {
		time.Sleep(1 << 1 * time.Second)
		ch <- 0
	}()

	select {
	case <-ch:
		fmt.Println("receive from ch")
	case <-timer.C:
		fmt.Println("timeout waiting from ch")
	}
}
```

### context

> Context 是设置`截止日期`、`同步信号`、`传递请求相关值`的结构体

> Context 是 Go 对 `goroutine` 和 `timer` 的封装

```go
type Context interface {
  Deadline() (deadline time.Time, ok bool)
  Done() <-chan struct{}
  Err() error
  Value(key any) any
}
```

| Func                   | Desc                                                         |
| ---------------------- | ------------------------------------------------------------ |
| context.`Background`   | It is typically used by the main function, initialization, and tests, and as the top-level Context for incoming requests. |
| context.`TODO`         | 不确定使用什么 context                                       |
| context.`WithDeadline` | 超时时间                                                     |
| context.`WithValue`    | 向 context 添加键值对                                        |
| context.`WithCancel`   | 创建一个可取消的 context                                     |

> 通过`关闭 channel` 来传递信号，并停止子协程

```go
// receive message: 0
// receive message: 1
// receive message: 2
// receive message: 3
// child process interrupt...
// main process exit
func main() {
	messages := make(chan int, 10)
	defer close(messages)

	// producer goroutine
	go func() {
		for i := 0; i < 10; i++ {
			messages <- i
		}
	}()

	done := make(chan bool)
	// consumer goroutine
	go func() {
		ticker := time.NewTicker(time.Second)
		for range ticker.C {
			select {
			case <-done:
				fmt.Println("child process interrupt...")
				return // exit goroutine
			default:
				fmt.Printf("receive message: %d\n", <-messages)
			}
		}
	}()

	// main goroutine
	time.Sleep(1 << 2 * time.Second)
	close(done) // 传递信号
	time.Sleep(time.Second)
	fmt.Println("main process exit")
}
```

> 通过 context 关闭子协程

```go
func main() {
	background := context.Background()
	ctx := context.WithValue(background, "name", "zhongmingmao")

	// Value
	go func(c context.Context) {
		fmt.Println(c.Value("name"))
	}(ctx)

	// Timeout
	timeout, cancelFunc := context.WithTimeout(background, time.Second)
	defer cancelFunc()

	go func(c context.Context) {
		for range time.NewTicker(time.Second).C {
			select {
			case <-c.Done():
				fmt.Println("child process interrupt...")
				return
			default:
				fmt.Println("enter default")
			}
		}
	}(timeout)

	select {
	case <-timeout.Done():
		time.Sleep(time.Second)
		fmt.Println("main process exit")
	}
}
```

