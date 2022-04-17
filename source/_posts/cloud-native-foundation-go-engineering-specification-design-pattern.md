---
title: Go Engineering - Specification - Design Pattern
mathjax: false
date: 2022-04-16 01:06:25
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
---

# GoF

![98fb0ecb8ba65bc83f25bb2504e51d20](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/98fb0ecb8ba65bc83f25bb2504e51d20.webp)

<!-- more -->

# 创建型模式

> 提供一种**在创建对象的同时隐藏创建逻辑**的方式，而不是直接使用 new 运算符直接实例化对象

## 单例模式

> 分为**饿汉**方式（包被**加载**时创建）和**懒汉**方式（第一次**使用**时创建）

### 饿汉方式

```go
package hunger

type singleton struct {
}

// 实例是在包被导入时被初始化的
var ins *singleton = &singleton{}

func GetIns() *singleton {
	return ins
}
```

### 懒汉方式

> **非并发安全**，需要**加锁**

```go
package singleton

import "sync"

type singleton struct {
}

var ins *singleton
var lock sync.Mutex

func GetIns() *singleton {
	if ins == nil {
		lock.Lock()
		defer lock.Unlock()
		if ins == nil {
			ins = &singleton{}
		}
	}
	return ins
}
```

### once

```go
package singleton

import "sync"

type singleton struct {
}

var ins *singleton
var once sync.Once

func GetIns() *singleton {
	once.Do(func() {
		ins = &singleton{}
	})
	return ins
}
```

## 工厂模式

### 简单工厂模式

> 接受参数，然后返回实例（**结构体**）

```go
package factory

import "fmt"

type Person struct {
	Name string
	Age  int
}

func (p Person) Greet() {
	fmt.Printf("Hi! My name is %s\n", p.Name)
}

func NewPerson(name string, age int) *Person {
	return &Person{
		Name: name,
		Age:  age,
	}
}
```

## 抽象工厂模式

> 与简单工厂模式的区别：返回的是**接口**（不必公开内部实现细节），而不是结构体

```go
package factory

import (
	"fmt"
)

type Person interface {
	Greet()
}

type person struct {
	name string
	age  int
}

func (receiver *person) Greet() {
	fmt.Printf("Hi! My name is %s\n", receiver.name)
}

// NewPerson returns an interface, and not the person struct itself
func NewPerson(name string, age int) Person {
	return &person{
		name: name,
		age:  age,
	}
}
```

## 工厂方法模式

> 在简单工厂模式，依赖于**唯一的工厂对象**；在工厂模式中，依赖于**工厂接口**（通过**子工厂**来**解耦**）

```go
package main

import "fmt"

type Person struct {
	name string
	age  int
}

// 闭包
func NewPersonFactory(age int) func(name string) *Person {
	return func(name string) *Person {
		return &Person{
			name: name,
			age:  age,
		}
	}
}

func main() {
	babyFactory := NewPersonFactory(1)
	baby := babyFactory("john")
	fmt.Println(baby)

	teenagerFactory := NewPersonFactory(16)
	teenager := teenagerFactory("jill")
	fmt.Println(teenager)
}
```

# 结构性模式

> 关注**类和对象的组合**

## 策略模式

> 定义了一组算法，并将每个算法都封装起来，并且使它们之间可以**互换**

```go
package strategy

type Strategy interface {
	do(int, int) int
}

type add struct {
}

func (receiver *add) do(a, b int) int {
	return a + b
}

type reduce struct {
}

func (receiver *reduce) do(a, b int) int {
	return a - b
}

type Operator struct {
	strategy Strategy
}

func (receiver *Operator) setStrategy(strategy Strategy) {
	receiver.strategy = strategy
}

func (receiver *Operator) calculate(a, b int) int {
	return receiver.strategy.do(a, b)
}
```

```go
package strategy

import (
	"fmt"
	"testing"
)

func TestStrategy(t *testing.T) {
	operator := Operator{}

	operator.setStrategy(&add{})
	add := operator.calculate(1, 2)
	fmt.Println("add: ", add)

	operator.setStrategy(&reduce{})
	reduce := operator.calculate(1, 2)
	fmt.Println("reduce: ", reduce)
}
```

## 模板模式

> 定义了算法的**骨架**，然后将一些**步骤**延迟到**子类**

```go
package template

import "fmt"

// Template
func programming(programmer Programmer) {
	programmer.coding()
	programmer.compile()
	programmer.run()
}

type Programmer interface {
	coding()
	compile()
	run()
}

type AbstractProgrammer struct {
}

func (AbstractProgrammer) compile() {
	fmt.Println("compile")
}

func (AbstractProgrammer) run() {
	fmt.Println("run")
}

type JavaProgrammer struct {
	AbstractProgrammer // 通过匿名字段实现继承（类似）
}

func (*JavaProgrammer) coding() {
	fmt.Println("coding java")
}

type GoProgrammer struct {
	AbstractProgrammer
}

func (GoProgrammer) coding() {
	fmt.Println("coding go")
}
```

```go
package template

import "testing"

func TestTemplate(t *testing.T) {
	javaProgrammer := &JavaProgrammer{}
	programming(javaProgrammer)

	goProgrammer := &GoProgrammer{}
	programming(goProgrammer)
}
```

# 行为型模式

> 关注**对象之间的通信**

## 代理模式

> 为另一个对象提供**替身**，以**控制**对这个对象的访问；代理类中持有被代理类对象，并且与被代理类对象实现**同一接口**

```go
package proxy

import "fmt"

type Seller interface {
	sell()
}

type Station struct {
}

func (*Station) sell() {
	fmt.Println("Station sell")
}

type StationProxy struct {
	station *Station
}

func (proxy *StationProxy) sell() {
	proxy.station.sell()
}
```

## 选项模式

> 创建一个带有**默认值**的 **struct** 变量，并**选择性地修改**其中一些参数的值 -- **Go 不支持参数默认值**

```go
package option

import "time"

const (
	defaultCaching = false
	defaultTimeout = 10
)

type Connection struct {
	addr    string
	cache   bool
	timeout time.Duration
}

type options struct {
	caching bool
	timeout time.Duration
}

// 实现很巧妙！
type Option interface {
	apply(*options)
}

type optionFunc func(*options)

func (f optionFunc) apply(opts *options) {
	f(opts)
}

func WithCaching(cache bool) Option {
	return optionFunc(func(o *options) {
		o.caching = cache
	})
}

func WithTimeout(t time.Duration) Option {
	return optionFunc(func(o *options) {
		o.timeout = t
	})
}

func Connect(addr string, opts ...Option) (*Connection, error) {
	options := options{
		caching: defaultCaching,
		timeout: defaultTimeout,
	}

	// 动态修改 options
	for _, option := range opts {
		option.apply(&options)
	}

	return &Connection{
		addr:    addr,
		cache:   options.caching,
		timeout: options.timeout,
	}, nil
}
```







