---
title: Go - Design Philosophy
mathjax: false
date: 2022-12-11 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-1.png
categories:
  - Go
tags:
  - Go
  - Cloud Native
---

# 简单

> 语言特性始终保持`少且足够`的水平，不走`语言融合`的道路，简单的设计哲学是 Go `生产力`的源泉

1. 仅有 25 个关键字，主流编程语言最少
2. 内置 GC，降低开发人员内存管理的心智负担
3. 首字母大小写决定可见性，无需通过额外关键字修饰
4. 变量初始为`类型零值`，避免以随机值作为初值的问题
5. 内置数组边界检查，极大减少越界访问带来的安全隐患
6. 内置并发支持，简化并发程序设计
7. 内置`接口`类型，为`组合`的设计哲学奠定基础
8. 原生提供完善的工具链，开箱即用

<!-- more -->

# 显式

> Go - 程序员应该明确知道在做什么；C - 信任程序员

1. Go 不允许不同类型的变量进行混合计算，也不会进行`隐式自动转换`
2. Go 采用基于`值比较`的错误处理方案
   - 函数或方法的错误会通过 `return` 语句`显式`地返回，并且调用者`通常不能忽略`对返回的错误的处理

# 组合

> 组合是构建 Go 程序骨架的主要方式，可以大幅度降低程序元素间的`耦合`，提高程序的`可扩展性`和`灵活性`

1. 在 Go 中，找不到经典的 `OOP 语法元素`、`类型体系`和`继承机制`，Go 推崇的是`组合`的设计哲学
2. 提供`正交`的语法元素，以供后续`组合`使用
   - `包`之间相对独立，没有`子包`的概念
   - 没有`类型层次`体系，各类型之间`互相独立`，没有`子类型`的概念
   - 每个类型都可以有自己的方法集合，`类型定义`和`方法实现`是`正交独立`的
   - 实现某个`接口`时，无需像 Java 那样采用特殊的关键字修饰 - `Duck Typing`
3. 组合 - 将各个没有关联的孤岛以最恰当的方式建立关联，并形成一个整体

> `类型嵌入`为类型提供了`垂直扩展`的能力，而`接口`是`水平组合`的关键

## 垂直组合 - Inherit

> 本质上是`能力继承`，采用嵌入方式定义的新类型继承了嵌入类型的能力

> `Type Embedding` - Go 为了支撑`组合`的设计，提供了`类型嵌入`（Type Embedding） - `语法糖`
> 通过 Type Embedding，将`已经实现的功能`嵌入到`新类型`中，以快速满足新类型的功能需求

1. 被嵌入的类型和新类型之间`没有任何关系`
2. 通过新类型调用方法时，`方法匹配`主要取决于`方法名字`，而不是类型
   - 通过 Type Embedding，快速让一个新类型`复用`其他类型已经实现的能力，实现功能的`垂直扩展`

```go
type Mutex struct {
}

func (receiver *Mutex) Lock() {
	fmt.Println("Mutex Lock")
}

func (receiver *Mutex) UnLock() {
	fmt.Println("Mutex UnLock")
}

type Pool struct {
	Mutex
}

func main() {
	pool := Pool{}
	pool.Lock()   // Mutex Lock
	pool.UnLock() // Mutex UnLock
}
```

## 水平组合 - Delegate

> 本质是`能力委托` - 通过`嵌入接口类型`的方式实现接口行为的`聚合`

```go
// ReadWriter is the interface that groups the basic Read and Write methods.
type ReadWriter interface {
	Reader
	Writer
}

type Reader interface {
	Read(p []byte) (n int, err error)
}

type Writer interface {
	Write(p []byte) (n int, err error)
}
```

> Go 接口是一个创新设计

1. 在 Go 中，接口只是`方法集合`，与`实现`之间的关系`无需`通过`显式`关键字修饰
2. 让程序内部各部分之间的`耦合`降低到`最低`，也是连接程序各部分之间的纽带

> 其他水平组合的模式 - 通过接受`接口类型参数`的`普通函数`进行组合

```go
type Reader interface {
	Read(p []byte) (n int, err error)
}

func ReadAll(r io.Reader) ([]byte, error) {
	return io.ReadAll(r)
}
```

# 并发

1. Go 放弃了基于`操作系统线程`的并发模型（Java），而采用了`用户层轻量级线程`，即 goroutine
2. goroutine 占用的资源非常少，Go Runtime 默认为每个 goroutine 分配的`栈空间`为 `2KB`
3. goroutine 调度的切换也不用`陷入`操作系统内核完成，代价很低
4. 在语言层面内置了辅助并发设计的`原语` - channel + select
   - 通过 channel 传递消息或者实现同步
   - 通过 select 实现多路 channel 的并发控制
5. 并发和组合的哲学是一脉相承的，并发是一个更大的组合的概念
   - goroutines 各自执行特定的工作，通过 channel + select 将 goroutines 组合连接起来
   - 并发的存在鼓励程序员在程序设计时进行`独立计算`的`分解`

# 面向工程

1. 重新设计编译单元和目标文件格式，实现 Go 源码快速构建
   - 让大工程的构建时间缩短到类似动态语言的交互式解析的编译速度
2. 如果源文件导入它`不使用`的包，则程序无法编译，进而充分保证 Go 程序的`依赖树`是`精确`的
   - 保证在构建程序时不会编译`额外`的代码，从而最大限度地缩短编译时间
3. 去除包的`循环依赖`
   - 循环依赖会在大规模的代码中引发问题，因为它们要求编译器同时处理更大的源文件集，这会减慢`增量构建`
4. `包路径`是`唯一`的，而`包名`是`不唯一`的
   - 导入路径`必须唯一标识`要导入的包
   - 名称只是包的使用者如何`引用`其内容的`约定`
5. 故意`不支持默认函数参数`
   - 如果函数拥有太多的参数，会降低代码的清晰度和可读性
6. 增加`类型别名`（Type alias），支持大规模代码库的`重构`
7. Go 在`标准库`中提供了各类`高质量`且`性能优良`的功能包
8. Go 提供了完善的`工具链`
   - 编译构建、代码格式化（gofmt）、包依赖管理、静态代码检查
   - 单元测试、文档生成与查看、性能剖析、语言服务器、运行时程序跟踪

