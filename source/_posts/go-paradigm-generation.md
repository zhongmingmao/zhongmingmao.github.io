---
title: Go Paradigm - Generation
mathjax: false
date: 2023-01-30 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/paradigm/go-generation.webp
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 代码生成

1. Go 的`代码生成`主要用来解决`泛型编程`的问题
2. 泛型编程：`类型`与`算法`解耦

<!-- more -->

# 类型检查

> Go 在支持`泛型`之前，只能用 `interface{}`，必然涉及到`类型检查`

## Type Assertion

```go
type Container []interface{}

func (c *Container) Put(elem interface{}) {
	*c = append(*c, elem)
}

func (c *Container) Get() interface{} {
	elem := (*c)[0]
	*c = (*c)[1:]
	return elem
}

func main() {
	c := &Container{}
	c.Put(1)
	c.Put("hello")

	elem, ok := c.Get().(int) // type assertion
	if !ok {
		panic("assertion error")
	}
	fmt.Printf("elem = %d\n", elem)
}
```

## Reflection

```go
type Container struct {
	sl reflect.Value
}

func NewContainer(t reflect.Type, size int) *Container {
	if size <= 0 {
		size = 1 << 8
	}
	return &Container{
		sl: reflect.MakeSlice(reflect.SliceOf(t), 0, size),
	}
}

func (c *Container) Put(val interface{}) error {
	if reflect.ValueOf(val).Type() != c.sl.Type().Elem() {
		return fmt.Errorf("cannot put a %T into a slice of %sl", val, c.sl.Type().Elem())
	}
	c.sl = reflect.Append(c.sl, reflect.ValueOf(val))
	return nil
}

func (c *Container) Get(refVal interface{}) error {
	if reflect.ValueOf(refVal).Kind() != reflect.Ptr ||
		reflect.ValueOf(refVal).Elem().Type() != c.sl.Type().Elem() {
		return fmt.Errorf("needs *%sl but got %T", c.sl.Type().Elem(), refVal)
	}
	reflect.ValueOf(refVal).Elem().Set(c.sl.Index(0))
	c.sl = c.sl.Slice(1, c.sl.Len())
	return nil
}

func main() {
	f1 := 3.1415926
	f2 := 1.41421356237

	c := NewContainer(reflect.TypeOf(f1), 1<<4)

	if err := c.Put(f1); err != nil {
		panic(err)
	}
	if err := c.Put(f2); err != nil {
		panic(err)
	}

	g := 0.0
	if err := c.Get(&g); err != nil {
		panic(err)
	}
	fmt.Printf("%v (%T)\n", g, g) // 3.1415926 (float64)
	fmt.Println(c.sl.Index(0))    // 1.41421356237
}
```

# C++ Template

> `模板具体化`：在`编译`期间，根据不同的`变量类型`来`自动化生成`相关类型的函数或者类

```c++
#include <iostream>

using namespace std;

template<class T>
T GetMax(T a, T b) {
    T result;
    result = (a > b) ? a : b;
    return result;
}

int main() {
    int i = 5, j = 6, k;
    k = GetMax<int>(i, j); // 生成 int 类型的函数
    cout << k << endl; // 6

    long l = 10, m = 5, n;
    n = GetMax<long>(l, m); // 生成 long 类型的函数
    cout << n << endl; // 10
}

```

# Go Generator

> 在 Go 1.18 支持泛型之前，编译器本身不会做类似 C++ 模板具体化的动作

```
$ tree
.
├── gen.go
├── gen.sh
├── go.mod
├── go.sum
└── template
    └── container.tmp.go
```

## 函数模板

> 设置好相应的`占位符`

```go template/container.tmp.go
package PACKAGE_NAME

type GENERIC_NAMEContainer struct {
	s []GENERIC_TYPE
}

func NewGENERIC_NAMEContainer() *GENERIC_NAMEContainer {
	return &GENERIC_NAMEContainer{s: []GENERIC_TYPE{}}
}
func (c *GENERIC_NAMEContainer) Put(val GENERIC_TYPE) {
	c.s = append(c.s, val)
}
func (c *GENERIC_NAMEContainer) Get() GENERIC_TYPE {
	r := c.s[0]
	c.s = c.s[1:]
	return r
}
```

## 脚本

> 按规则`替换文本`并生成新代码

```bash gen.sh
#!/bin/bash

set -e

SRC_FILE=${1}
PACKAGE=${2}
TYPE=${3}
DES=${4}
#uppcase the first char
PREFIX="$(tr '[:lower:]' '[:upper:]' <<< ${TYPE:0:1})${TYPE:1}"

DES_FILE=$(echo ${TYPE}| tr '[:upper:]' '[:lower:]')_${DES}.go

sed 's/PACKAGE_NAME/'"${PACKAGE}"'/g' ${SRC_FILE} | \
    sed 's/GENERIC_TYPE/'"${TYPE}"'/g' | \
    sed 's/GENERIC_NAME/'"${PREFIX}"'/g' > ${DES_FILE}
```

## 注释代码

```go gen.go
package gen

import "fmt"

//go:generate ./gen.sh ./template/container.tmp.go gen uint32 container
func generateUint32Example() {
	var u uint32 = 42
	c := NewUint32Container()
	c.Put(u)
	v := c.Get()
	fmt.Printf("generateExample: %d (%T)\n", v, v)
}

//go:generate ./gen.sh ./template/container.tmp.go gen string container
func generateStringExample() {
	var s string = "Hello"
	c := NewStringContainer()
	c.Put(s)
	v := c.Get()
	fmt.Printf("generateExample: %s (%T)\n", v, v)
}
```

```
$ go generate

$ tree
.
├── gen.go
├── gen.sh
├── go.mod
├── go.sum
├── string_container.go
├── template
│   └── container.tmp.go
└── uint32_container.go

$ go build
```

