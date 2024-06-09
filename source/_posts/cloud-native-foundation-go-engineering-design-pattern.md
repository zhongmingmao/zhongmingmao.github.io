---
title: Go Engineering - Design Pattern
mathjax: false
date: 2023-05-02 00:06:25
cover: https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/go-engineering-design-pattern.jpeg
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
---

# 设计模式

![image-20240609132845458](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240609132845458.png)

<!-- more -->

![image-20240609155641104](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240609155641104.png)

# 创建型模式

> 提供了一种在创建对象的同时`隐藏创建逻辑`的方式

## 单例模式

### 饿汉方式

> 在`包`被`加载`时创建

```go
package singleton

type Singleton struct {
}

var instance *Singleton = &Singleton{}

func GetInstance() *Singleton {
	return instance
}
```

### 懒汉方式

> 在第一次使用时创建 - 使用最多，但`非并发安全`，需要加锁

#### 不加锁

```go
package singleton

type Singleton struct {
}

var instance *Singleton

// GetInstance is not thread-safe
func GetInstance() *Singleton {
	if instance == nil {
		instance = &Singleton{}
	}
	return instance
}
```

#### Mutex

> double check

```go
package singleton

import "sync"

type Singleton struct {
}

var instance *Singleton
var mutex sync.Mutex

func GetInstance() *Singleton {
	if instance == nil {
		mutex.Lock()
		if instance == nil { // This is a double check
			instance = &Singleton{}
		}
		mutex.Unlock()
	}
	return instance
}
```

### Once

```go
package singleton

import "sync"

type Singleton struct {
}

var instance *Singleton
var once sync.Once

func GetInstance() *Singleton {
	once.Do(func() {
		instance = &Singleton{}
	})
	return instance
}
```

## 工厂模式

> 建议返回`非指针`的实例 - 意图为创建实例并调用其提供的方法，并非对实例进行更改

### 简单工厂模式

> 最常用

```go
package factory

type Person struct {
	Name string
	Age  int
}

func NewPerson(name string, age int) *Person {
	return &Person{
		Name: name,
		Age:  age,
	}
}
```

### 抽象工厂模式

> 与简单工厂模式的唯一区别：返回的是`接口`而不是结构体

```go
package factory

import "fmt"

// Human exported interface
type Human interface {
	Greet()
}

// man unexported struct
type man struct {
	Name string
	Age  int
}

func (m man) Greet() {
	fmt.Printf("My name is %s\n", m.Name)
}

func NewHuman(name string, age int) Human {
	return man{
		Name: name,
		Age:  age,
	}
}
```

> 通过返回接口，实现多个工厂函数，返回不同的接口实现

```go
package factory

import (
	"net/http"
	"net/http/httptest"
)

type Doer interface {
	Do(req *http.Request) (*http.Response, error)
}

func NewHTTPClient() Doer {
	return &http.Client{}
}

type mockHTTPClient struct {
}

func (m *mockHTTPClient) Do(req *http.Request) (*http.Response, error) {
	recorder := httptest.NewRecorder()
	return recorder.Result(), nil
}

func NewMockHTTPClient() Doer {
	return &mockHTTPClient{}
}
```

> 便于单元测试

```go
func QueryUser(doer Doer) error {
	request, err := http.NewRequest("Gte", "http://localhost:8080", nil)
	if err != nil {
		return err
	}

	_, err = doer.Do(request)
	if err != nil {
		return err
	}
	return nil
}

func TestQueryUser(t *testing.T) {
	doer := NewMockHTTPClient()
	if err := QueryUser(doer); err != nil {
		t.Errorf("Error: %s", err)
	}
}
```

### 工厂方法模式

> 简单工厂模式 - 依赖于唯一的工厂对象，如果新增一个工厂对象，需要修改工厂中的函数，`耦合度很高`

1. 依赖于`工厂函数`，通过实现工厂函数来创建多种工厂
2. 由一群`子类`来负责具体类的实例化，`解耦`

```go
package factory

type Person struct {
	name string
	age  int
}

func NewPersonFactory(age int) func(name string) Person {
	return func(name string) Person {
		return Person{
			name: name,
			age:  age, // closure
		}
	}
}

func test() {
	newBaby := NewPersonFactory(1)
	baby := newBaby("John")

	newAdult := NewPersonFactory(18)
	adult := newAdult("Jane")
}
```

# 结构型模式

> 关注类和对象的组合

## 策略模式

> 定义一组算法，将每个算法都`封装`起来，并且它们之间可以`互换`，最常见的场景 - `排序算法`

```go
package main

import "fmt"

type IStrategy interface {
	do(int, int) int
}

type add struct {
}

func (*add) do(a int, b int) int {
	return a + b
}

type reduce struct {
}

func (*reduce) do(a int, b int) int {
	return a - b
}

type Operator struct {
	strategy IStrategy
}

func (o *Operator) setStrategy(s IStrategy) {
	o.strategy = s
}

func (o *Operator) calculate(a, b int) int {
	return o.strategy.do(a, b)
}

func main() {
	operator := Operator{}

	operator.setStrategy(&add{})
	result := operator.calculate(1, 2)
	fmt.Println(result) // 3

	operator.setStrategy(&reduce{})
	result = operator.calculate(1, 2)
	fmt.Println(result) // -1
}
```

## 模板模式

> 定义一个操作中的`算法骨架`，然后将一些步骤`延迟`到子类中

1. 将一个类中能够`公共使用`的方法放置在`抽象类`中实现
2. 将不能公共使用的方法作为抽象方法，`强制`子类去实现

```go
package main

import "fmt"

type Cooker interface {
	fire()
	cooke()
	outFire()
}

func doCook(cooker Cooker) {
	cooker.fire()
	cooker.cooke()
	cooker.outFire()
}

// CommonCook abstract class
type CommonCook struct {
}

func (CommonCook) fire() {
	fmt.Println("fire")
}

func (CommonCook) cooke() {
	// abstract method
}

func (CommonCook) outFire() {
	fmt.Println("out fire")
}

type CookFish struct {
	CommonCook
}

func (CookFish) cooke() {
	fmt.Println("cook fish")
}

type CookMeat struct {
	CommonCook
}

func (CookMeat) cooke() {
	fmt.Println("cook meat")
}

func main() {
	doCook(CookFish{})
	doCook(CookMeat{})
}
```

# 行为型模式

> 关注`对象`之间的通信

## 代理模式

> 代理类中`持有`被代理类的对象，并且两者`实现同一接口`

```go
type Seller interface {
	sell(name string)
}

type Station struct {
	stock int
}

func (s *Station) sell(name string) {
	if s.stock > 0 {
		s.stock--
	}
}

type StationProxy struct {
	station *Station
}

func (s *StationProxy) sell(name string) {
	if s.station.stock > 0 {
		s.station.sell(name)
	}
}
```

## 选项模式

> 创建一个带有`默认值`的 struct 变量，并`选择性`地修改其中一些参数的值，Go 函数形参`不支持`默认值

1. 支持传递`多个参数`
2. 支持`任意顺序`传递参数
3. 支持`默认值`
4. 符合 `OCP`，扩展性强

> 适用场景：结构体参数很多 or 结构体参数经常变动

```go
import "time"

const (
	defaultTimeout = 10
	defaultCaching = false
)

type options struct {
	caching bool
	timeout time.Duration
}

// Option overrides the default values of the Connection struct
type Option interface {
	apply(*options)
}

type optionFunc func(*options)

func (f optionFunc) apply(o *options) {
	f(o)
}

// WithTimeout sets the timeout value for the Connection struct
func WithTimeout(t time.Duration) Option {
	return optionFunc(func(o *options) {
		o.timeout = t
	})
}

// WithCaching sets the caching value for the Connection struct
func WithCaching(c bool) Option {
	return optionFunc(func(o *options) {
		o.caching = c
	})
}

type Connection struct {
	addr    string
	caching bool
	timeout time.Duration
}

func NewConnection(addr string, opts ...Option) *Connection {
	o := options{
		caching: defaultCaching,
		timeout: defaultTimeout,
	}

	for _, option := range opts {
		option.apply(&o)
	}

	return &Connection{
		addr:    addr,
		caching: o.caching,
		timeout: o.timeout,
	}
}
```



