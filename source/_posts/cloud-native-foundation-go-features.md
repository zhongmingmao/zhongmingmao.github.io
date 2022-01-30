---
title: Cloud Native Foundation - Go Features
mathjax: false
date: 2022-01-31 00:06:25
categories:

  - Cloud Native
  - Cloud Native Foundation
  - GO
tags:
  - Cloud Native
  - GO
---

# 特点

> 可以**高效编译**、支持**高并发**、面向**垃圾回收**

1. **秒级**完成大型程序的单节点编译
2. 依赖管理清晰
3. **不支持继承**
4. 支持**垃圾回收**、支持**并发执行**、支持**多线程通讯**
5. 对**多核**计算机支持友好

<!-- more -->

# 特性来源

![image-20220129135408349](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20220129135408349.png)

# 环境变量

| Env        | Desc                                                                                                                                                                                                                                                                                                                      | Value                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| GOARCH     | The architecture, or processor, for which to compile code.                                                                                                                                                                                                                                                                | amd64                                                     |
| GOBIN      | The directory where 'go install' will install a command.                                                                                                                                                                                                                                                                  |                                                           |
| GOCACHE    | The directory where the go command will store cached information for reuse in future builds.                                                                                                                                                                                                                              | ~/Library/Caches/go-build                                 |
| GOMODCACHE | The directory where the go command will store downloaded modules.                                                                                                                                                                                                                                                         | ~/go/pkg/mod                                              |
| GOENV      | The location of the Go environment configuration file.                                                                                                                                                                                                                                                                    | ~/Library/Application Support/go/env                      |
| GOOS       | The operating system for which to compile code.                                                                                                                                                                                                                                                                           | darwin                                                    |
| GOPATH     | The Go path is used to resolve import statements.<br />The GOPATH environment variable lists places to look for Go code.<br />The **src** directory holds **source code**.<br />The **pkg** directory holds **installed package objects**. -- pkg/**GOOS_GOARCH**<br />The **bin** directory holds **compiled commands**. | ~/go                                                      |
| GOPROXY    | URL of Go module proxy.                                                                                                                                                                                                                                                                                                   | https://proxy.golang.org,direct                           |
| GOSUMDB    | The name of checksum database to use and optionally its public key and URL.                                                                                                                                                                                                                                               | sum.golang.org                                            |
| GOROOT     | The root of the go tree.                                                                                                                                                                                                                                                                                                  | /usr/local/Cellar/go/1.17.6/libexec                       |
| GOTMPDIR   | The directory where the go command will write temporary source files, packages, and binaries.                                                                                                                                                                                                                             |                                                           |
| GOVCS      | Lists version control commands that may be used with matching servers.                                                                                                                                                                                                                                                    |                                                           |
| GOEXE      | The executable file name suffix (".exe" on Windows, "" on other systems).                                                                                                                                                                                                                                                 |                                                           |
| GOHOSTARCH | The architecture (GOARCH) of the Go toolchain binaries.                                                                                                                                                                                                                                                                   | amd64                                                     |
| GOHOSTOS   | The operating system (GOOS) of the Go toolchain binaries.                                                                                                                                                                                                                                                                 | darwin                                                    |
| GOTOOLDIR  | The directory where the go tools (compile, cover, doc, etc...) are installed.                                                                                                                                                                                                                                             | /usr/local/Cellar/go/1.17.6/libexec/pkg/tool/darwin_amd64 |
| GOVERSION  | The version of the installed Go tree, as reported by runtime.Version.                                                                                                                                                                                                                                                     | go1.17.6                                                  |

# 基本命令

| Command  | Desc                                                |
| -------- | --------------------------------------------------- |
| bug      | start a bug report                                  |
| build    | compile packages and dependencies                   |
| clean    | remove object files and cached files                |
| doc      | show documentation for package or symbol            |
| env      | print Go environment information                    |
| fix      | update packages to use new APIs                     |
| fmt      | gofmt (reformat) package sources                    |
| generate | generate Go files by processing source              |
| get      | add dependencies to current module and install them |
| install  | compile and install packages and dependencies       |
| list     | list packages or modules                            |
| mod      | module maintenance                                  |
| run      | compile and run Go program                          |
| test     | test packages                                       |
| tool     | run specified go tool                               |
| version  | print Go version                                    |
| vet      | report likely mistakes in packages                  |

## build

> Go 不支持**动态链接**，编译时会将**所有依赖**编译进同一个二进制文件
> Go 支持**交叉编译**

```
$ GOOS=linux GOARCH=amd64 go build
```

## test

> Go 原生自带测试
> go test 会扫描所有`*_test.go`为结尾的文件，惯例：将测试代码与正式代码放在**同一目录**

```go
package main

import "testing"

func TestAdd(t *testing.T) {
    t.Log("Start Test")
}
```

```
$ go test -v simple_test.go 
=== RUN   TestAdd
    simple_test.go:6: Start Test
--- PASS: TestAdd (0.00s)
PASS
ok      command-line-arguments  0.122s
```

# 常用数据结构

## 常量 & 变量

> 函数外的每个语句都必须以关键字开始(var, func 等等)，因此 `:=` 结构不能在函数外使用

```go
const identifier type
var identifier type
```

```go
// a := 1 // non-declaration statement outside function body
var a = 1

func main() {
    fmt.Println(a)
}
```

## Make & New

1. New 返回**指针地址**
2. Make 返回**第一个元素**，可**预设内存空间**，避免未来的内存拷贝

```go
fmt.Printf("%T\n", new([]int))          // *[]int
fmt.Printf("%T\n", make([]int, 0))      // []int
fmt.Printf("%T\n", make([]int, 10))     // []int
fmt.Printf("%T\n", make([]int, 10, 20)) // []int
```

## 切片的常见问题

> 切片是对数组一个连续片段的**引用**
> 切片是**连续内存**并且可以**动态扩展**

```go
func main() {
    a := [5]int{1, 2, 3, 4, 5}
    fmt.Println(a[1:3])              // [2 3]
    fmt.Println(a[:])                // [1 2 3 4 5]
    fmt.Println(deleteItem(a[:], 1)) // [1 3 4 5]
}

func deleteItem(s []int, index int) []int {
    // ...操作符：解压缩切片
    return append(s[:index], s[index+1:]...)
}
```

### append

```go
func main() {
    var a []int
    printSlice(a)

    b := []int{1, 2, 3}
    printSlice(b)

    c := a
    printSlice(c)

    fmt.Println("=====")
    // a与c指向的内存地址不一样
    a = append(b, 4)
    printSlice(a)
    printSlice(c)
}

func printSlice(slice []int) {
    fmt.Printf("%p %d %d\n", slice, len(slice), cap(slice))
}
```

```
0x0 0 0
0xc0000160a8 3 3
0x0 0 0
=====
0xc00001a180 4 6
0x0 0 0
```

最佳实践

```go
x = append(x, ...)
```

### 修改切片值

> Go是**值传递**

```go
slice := []int{10, 20, 30, 40, 50}

for _, v := range slice {
  // v是临时变量，值传递
  v *= 2
}
fmt.Println(slice) // [10 20 30 40 50]

for index := range slice {
  slice[index] *= 2
}
fmt.Println(slice) // [20 40 60 80 100]
```

## Map

```go
myMap := make(map[string]string, 10)
myMap["name"] = "zhongmingmao"

myFuncMap := map[string]func() string{
  "getName": func() string { return "zhongmingmao" },
}
fmt.Println(myFuncMap) // map[getName:0x108a820]
getName := myFuncMap["getName"]
fmt.Println(getName()) // zhongmingmao

if v, exists := myMap["name"]; exists {
  fmt.Println(v) // zhongmingmao
}
for k, v := range myMap {
  fmt.Println(k, v) // name zhongmingmao
}
```

## Interface & Struct & Pointer

1. Go 支持指针，但**不支持指针运算**
2. 指针变量的值为**内存地址**，未赋值的指针为**nil**
3. **interface**只能包含**行为**，**struct**只能包含**属性**
4. struct 无需显式声明实现interface，只需直接实现方法 -- Duck Type
5. struct 除实现 interface 定义的接口外，还可以有额外的方法
6. 一个类型可以实现多个接口（**多重继承**）
7. interface 可以嵌套其他 interface
8. **interface 可能为 nil**，针对 interface的使用要判空；struct 初始化意味着**空间分配**，对struct的引用**不会出现空指针**

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

// Duck Type
func (h *Human) getName() string {
    return h.firstName + "," + h.lastName
}

func (c *Car) getName() string {
    return c.factory + "-" + c.model
}

func main() {
    interfaces := []IF{}

    h := new(Human) // new返回指针
    h.firstName = "zhongming"
    h.lastName = "mao"
    interfaces = append(interfaces, h)

    c := new(Car)
    c.factory = "benz"
    c.model = "s"
    interfaces = append(interfaces, c)
    for _, v := range interfaces {
        fmt.Println(v.getName())
    }

    // zhongming,mao
    // benz-s
}
```

## Struct Tag

> 使用场景：Kubernetes APIServer对所有资源的定义都用 json tag 和 protoBuff tag
> 借助反射机制：**Kubernetes YAML -> JSON -> Go Struct**

```go
type MyType struct {
    Name string `json:"name"`
}

func main() {
    mt := MyType{Name: "zhongmingmao"}
    myType := reflect.TypeOf(mt)
    name := myType.Field(0)
    tag := name.Tag.Get("json")
    print(tag) // name
}
```

## 类型别名

```go
type ServiceType string

const (
    ServiceTypeClusterIP ServiceType = "ClusterIP"
    ServiceTypeNodePort ServiceType = "NodePort"
    ServiceTypeLoadBalancer ServiceType = "LoadBalancer"
    ServiceTypeExternalName ServiceType = "ExternalName" 
)
```

# 函数

## Main 函数

> 每个 Go 程序都应该有一个 **main package**
> main package 里的 **main 函数**是 GO 程序入口

```go
package main

func main() {
    println("Hello World")
}
```

## 参数解析

### os.Args

```go
package main

import (
    "fmt"
    "os"
)

func main() {
    // [/private/var/folders/74/cz6f8rf54xx0z41vg1bw4g280000gn/T/GoLand/___go_build_cnf]
    fmt.Println(os.Args)
}
```

### flag

```go
var name = flag.String("name", "zhongmingmao", "Input Your Name")
var age int
flag.IntVar(&age, "age", 0, "Input Your Age")
flag.Parse()
fmt.Println(*name, age)
```

```
$ go run main.go -name=z -age=1
z 1
```

## Init 函数

> Init 函数：在**包初始化**时运行
> 谨慎使用 Init 函数：当多个项目引用同一项目，且被引用的项目的初始化在 Init 函数中完成，并且**不可重复运行**时，会导致启动错误

```go
var a = 0

func init() {
	a = 1
}

func main() {
	fmt.Println(a) // 1
}
```

## 返回值

> 多值返回：函数可以返回任意数量的返回值
> 命名返回值：返回值可被命名，会被视为**定义在函数顶部的变量**，使用没有参数的 return 语句
> 调用者可以**忽略**部分返回值

```go
func split(sum int) (x, y int) {
	x = sum * 4 / 9
	y = sum - x
	// return 语句没有参数，返回命名返回值
	return
}

func main() {
	// 忽略部分返回值
	x, _ := split(17)
	fmt.Println(x) // 7
}
```

## 变长参数

```go
func append(slice []Type, elems ...Type) []Type
```

```go
s := []string{}
s = append(s, "a", "b", "c")
```

## 内置函数

| 函数名              | 作用                               |
| ------------------- | ---------------------------------- |
| close               | 关闭管道                           |
| len, cap            | 返回数组、切片、Map 的长度或者容量 |
| new, make           | 内存分配                           |
| copy, append        | 操作切片                           |
| panic, recover      | 错误处理                           |
| print, println      | 打印                               |
| complex, real, imag | 操作复数                           |

## 回调函数

> **函数作为参数**传入其他函数，并在其它函数内部进行调用

```go
strings.IndexFunc("", unicode.IsSpace)
```

## 闭包

1. 闭包的能力：可以在一个**内层**函数中访问到其**外层**函数的作用域
2. 匿名函数
   - 不能独立存在
   - 可以**赋值给其它变量**：`x := func() {}`
   - 可以**直接调用**: `func(x, y int) { println(x + y) }(1, 2)`
   - 可以作为**函数返回值**

```go
func main() {
	println(increase()(1)) // 4
}

// 函数作为函数返回值
func increase() func(x int) int {
	delta := 3
	return func(x int) int {
		// 访问外层delta
		return x + delta
	}
}
```

## 方法

1. 方法：**作用在接收者上的函数** -- **Duck Type**
2. 使用场景
   - 函数需要的上下文可以保存在 receiver 的属性中，通过定义 **receiver 的方法**，该方法可以直接访问 receiver 的属性，减少参数传递需求

```go
type Server struct {
	URL string
}

// Duck Type
func (receiver *Server) StartTLS() {
	if receiver.URL != "" {
		panic("Server already started!")
	}
}

func main() {
	server := Server{URL: "zhongmingmao.me"}
	server.StartTLS()
}
```

# 值 VS 指针

1. Go 只有一种规则：**值**
2. 函数内修改参数的值不会影响函数外原始变量的值
3. 可以传递指针参数将**变量地址**传递给调用函数
   - Go 会复制该指针作为函数内的地址，但**指向同一地址**

# 反射机制

1. `reflect.TypeOf()`：返回被检查对象的类型
2. `reflect.ValueOf()`：返回被检查对象的值

```go
m := make(map[string]string, 10)
m["name"] = "zhongmingmao"
t := reflect.TypeOf(m)
fmt.Printf("%s\n", t) // map[string]string
v := reflect.ValueOf(m)
fmt.Printf("%s\n", v) // map[name:zhongmingmao]
```

```go
type student struct {
	name string
	age  int
}

func (receiver student) GetName() string {
	return receiver.name
}

func (receiver student) GetAge() int {
	return receiver.age
}

func main() {
	s := student{name: "A", age: 1}

	v := reflect.ValueOf(s)
	for i := 0; i < v.NumField(); i++ {
		fmt.Printf("Field[%d]: %v\n", i, v.Field(i))
	}

	// Field[0]: A
	// Field[1]: 1

	t := reflect.TypeOf(s)
	for i := 0; i < t.NumMethod(); i++ {
		method := t.Method(i)
		fmt.Printf("Method[%d]: %v\n", i, method.Name)
	}

	// Method[0]: GetAge
	// Method[1]: GetName
}
```

# OOP

1. 可见性控制
   - **public** - 常量、变量、类型、接口、结构等名称**大写**
   - **private** - 非大写只能在**包内**使用
2. 继承
   - 通过**组合**实现，内嵌一个或多个 struct
3. 多态
   - 通过**接口**实现，通过接口定义方法集，编写多套实现 -- **Duck Type**

# JSON

```go
type Human struct {
	name string
	age  int
}

func marshal(h Human) string {
	h.name = "zhongmingmao"
	h.age = 1
	bytes, err := json.Marshal(&h)
	if err != nil {
		println(err)
	}
	return string(bytes)
}

func unmarshal(str string) Human {
	human := Human{}
	err := json.Unmarshal([]byte(str), &human)
	if err != nil {
		println(err)
	}
	return human
}
```

# 常用语法

## 错误处理

1. Go **无内置 exception 机制**，只提供 **error 接口**定义错误
2. 可以通过 `errors.New` 或者 `fmt.Errorf` 创建新的 Error
3. 通常应用程序对 error 的处理：**判空**
   - 如需对 error 归类，通常交给应用程序**自定义**

```go
type error interface {
	Error() string
}
```

```go
e1 := errors.New("NotFound")
e2 := fmt.Errorf("error_%d", 1)
println(e1.Error(), e2.Error()) // NotFound error_1
```

## defer

1. 作用：函数返回前执行某个语句或者函数，等同于 Java 的 **finally**
2. 使用场景：**关闭打开的资源**

## Panic & Recover

1. panic
   - 在系统出现**不可恢复错误**时**主动调用 panic**，使**当前线程直接 Crash**
2. defer
   - **保证执行**并把控制权交还给接收到 panic 的函数调用者
3. recover
   - 函数从 panic 或者错误场景中恢复

```go
func main() {
	defer func() {
		fmt.Println("defer func is called")
		if err := recover(); err != nil {
			fmt.Println(err)
		}
	}()

	panic("a panic is triggered")

	// defer func is called
	// a panic is triggered
}
```

# 多线程

## 协程

1. 进程
   - **分配系统资源**（CPU 时间、内存等）的基本单位
   - 有独立的内存空间、切换开销大
2. 线程：进程的一个**执行流**，是 **CPU 调度**并能**独立运行**的基本单位
   - 同一进程中的多线程**共享内存空间**，线程切换代价小
   - 多线程通信方便
   - 从内核层面来看，线程其实也是一种**特殊的进程**
     - 与**父进程**共享了打开的**文件**和**文件系统信息**，共享了**地址空间**和**信号处理函数**
3. 协程
   - Go 中的**轻量级线程**实现
   - Go 在 **Runtime**、**系统调用**等多方面对 goroutine 调度进行了封装和处理，从**语言层面**支持了协程
     - 当遇到长时间执行或者系统调用时，会主动把当前 goroutine 的 CPU 转让出去，让其他 goroutine能被调度 并执行

## Communicating Sequential Process

1. CSP
   - 描述**两个独立的并发实体**通过**共享的通讯 channel** 进行通信的**并发模型**
2. goroutine
   - 轻量级线程，并非 OS 的线程，而是将 OS 的线程**分段使用**，通过**调度器**实现**协作式调度**
   - 是一种**绿色线程**，微线程，能够在发现阻塞后启动新的微线程
3. channel
   - 类似于 Unix 的 **Pipe**，用于**协程之间的通讯和同步**
   - 协程之间虽然解耦，但它们与 channel 有耦合

## Thread & Routine

1. 每个 goroutine 默认**占用内存**比 Java、C 的线程少
   - goroutine：**2KB**
   - 线程：8MB
2. goroutine的**切换开销**远比线程小
   - 线程：涉及模式切换（内核态、用户态），16个寄存器的刷新
   - goroutine：只涉及3个寄存器的值修改
3. GOMAXPROC
   - 控制**并行线程数量**

## 协程示例

```go
for i := 0; i < 10; i++ {
  go fmt.Println(i) // 启动新协程
}
time.Sleep(time.Second)
```

## channel -- 多协程通信

1. Channel 是多个协程之间通讯的管道
   - 一端发送数据，一端接收数据
   - **同一时间只有一个协程可以访问数据**，避免了**共享内存**模式可能出现的**内存竞争**
   - **协调协程的执行顺序**
2. 声明方式
   - `var identifier chan datatype`
   - 操作符：`<-`

```go
ch := make(chan int)
go func() {
  ch <- 0 // 数据写入channel
}()

println(<-ch) // 从chanel中读取数据
```

## 通道缓冲

1. 基于 Channel 的通信是**同步**的
2. 当缓冲区满时，数据的发送是**阻塞**的
3. 当 make 关键字创建通道时可以定义定义缓冲区容量，默认缓冲区容量为0
   - If zero, or the size is omitted, the channel is **unbuffered**.
   - 类似于 Java 的 `SynchronousQueue`

## 遍历通道缓冲区

```go
ch := make(chan int, 10)

go func() {
  for i := 0; i < 10; i++ {
    rand.Seed(time.Now().UnixNano())
    ch <- rand.Intn(10)
  }
  close(ch)
}()

for v := range ch {
  fmt.Println(v)
}
```

## 单向通道

1. 只写通道：`var writeOnly chan<- int`
2. 只读通道：`var readOnly <-chan int`

```go
func main() {
	ch := make(chan int)
	go produce(ch)
	go consume(ch)
}

func produce(ch chan<- int) {
	for {
		ch <- 1
	}
}

func consume(ch <-chan int) {
	for {
		<-ch
	}
}
```

## 关闭通道

1. **通道无需每次关闭**
2. 作用：告诉接收者该通道**再无新数据发送**
3. 只有**发送方**需要关闭通道

```go
ch := make(chan int, 1)
defer func() {
  close(ch)
}()

ch <- 1
if v, notClosed := <-ch; notClosed {
  println(v)
}
```

## select

1. 当多个协程同时运行，可通过 select 轮询多个通道
   - 如果所有通道都阻塞则**等待**，如果定义了 **default** 则执行 default
   - 如果多个通道就绪则**随机**选择

```go
ch1 := make(chan int, 1)
ch2 := make(chan string, 1)
ch1 <- 1
ch2 <- "a"

select {
  case v := <-ch1:
  fmt.Printf("select from ch1, v: %v\n", v)
  case v := <-ch2:
  fmt.Printf("select from ch2, v: %v\n", v)
  default:
  fmt.Println("select default")
}
```

## Timer

1. time.Ticker以指定的时间间隔重复地向通道 C 发送时间值
2. 使用场景：为协程设定超时时间

```go
ch := make(chan int)
timer := time.NewTimer(time.Second)
select {
  case <-ch:
  fmt.Println("received from ch")
  case <-timer.C: // When the Timer expires, the current time will be sent on C, C is (<-chan Time)
  fmt.Println("timeout waiting from channel ch")
}
```

## 停止子协程

```go
done := make(chan bool)

go func() {
  for {
    select {
      case v, notClosed := <-done:
      fmt.Printf("v=%v, notClosed=%v\n", v, notClosed)
      return
    }
  }
}()

close(done)
```
