---
title: Go - error
mathjax: false
date: 2023-01-06 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-error.jpeg
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

<!-- more -->

# C vs Go

> Go 语言的错误处理机制是在 C 语言错误处理机制基础上的`再创新`

1. 通常使用类型为`整型`的函数返回值作为`错误状态标识`，函数调用者会基于`值比较`的方式来处理错误
   - 返回值为 0，代表函数调用成功，否则函数调用出现错误
2. 优点
   - 要求开发者必须`显式`地`关注`和`处理`每个错误
   - 错误一般为`普通值`，不需要`额外的语言机制`来处理，让代码更容易调试
   - C 语言错误处理机制具有`简单`和`显式`结合的特征，非常符合 Go 的`设计哲学`
     - 因此 Go 继承了 C 的错误处理机制
3. 缺点
   - C 语言中的函数`最多仅支持一个返回值`
   - `一值多用`
     - 承载函数要返回给调用者的信息
     - 承载函数调用的最终错误状态
   - 当返回值为其它类型，如字符串，很难将`数据`与`错误`融合在一起
     - 做法不一，很难形成统一的错误处理策略
   - 因此 Go 函数新增了`多返回值机制`，用于支持`数据`与`错误`（返回值列表的`末尾`）的`分离`

```go fmt/print.go
// Fprintf formats according to a format specifier and writes to w.
// It returns the number of bytes written and any write error encountered.
func Fprintf(w io.Writer, format string, a ...interface{}) (n int, err error) {
	p := newPrinter()
	p.doPrintf(format, a)
	n, err = w.Write(p.buf)
	p.free()
	return
}
```

```go builtin/builtin.go
// The error built-in interface type is the conventional interface for
// representing an error condition, with the nil value representing no error.
type error interface {
	Error() string
}
```

# error

## 常用

> 只能提供`字符串`形式的`错误上下文`

```go
e1 := errors.New("this is an error")
e2 := fmt.Errorf("index %d is out of bounds", 10)
```

```go errors/errors.go
// New returns an error that formats as the given text.
// Each call to New returns a distinct error value even if the text is identical.
func New(text string) error {
	return &errorString{text}
}

// errorString is a trivial implementation of error.
type errorString struct {
	s string
}

func (e *errorString) Error() string {
	return e.s
}
```

## 自定义

```go net/net.go
type OpError struct {
	Op string
	Net string
	Source Addr
	Addr Addr
	Err error
}
```

> 利用`类型断言`（Type Assertion，判断`接口类型`的`动态类型`），判断 err 的`动态类型`

```go net/http/server.go
func isCommonNetReadError(err error) bool {
	if err == io.EOF {
		return true
	}
	if neterr, ok := err.(net.Error); ok && neterr.Timeout() {
		return true
	}
	if oe, ok := err.(*net.OpError); ok && oe.Op == "read" {
		return true
	}
	return false
}
```

## 优点

1. `统一`了错误类型
2. 错误是`值`
3. `易扩展`，支持`自定义`的错误上下文

> `error` 接口是`契约`，具体的错误上下文与 error 接口`解耦`，体现 Go `组合`设计哲学中的`正交`理念

# 策略

> `透明` > `行为` > `哨兵/类型`（耦合）

## 透明

> `完全不关心`返回错误值携带的具体上下文信息 - `最常见`（> 80%）+ `解耦`

```go
func foo() error {
	return errors.New("some error occurred")
}

func bar() error {
	err := foo()
	if err != nil {
		return err
	}
	return nil
}
```

## 哨兵

> `反模式`：错误处理方以`透明错误值`所能提供的`唯一`上下文信息（`字符串`），作为错误处理路径选择的依据

```go
func foo() error {
	return errors.New("some error occurred")
}

func bar() error {
	err := foo()
	if err != nil {
		switch err.Error() {
		case "some error occurred":
			return errors.New("some other error occurred")
		case "some other error occurred":
			return errors.New("some other other error occurred")
		default:
			return err
		}
	}
	return nil
}
```

> 造成严重的`隐式耦合`，可以通过`导出哨兵错误值`的方式来`辅助`错误处理方检视错误值并做出错误处理分支的决策

```go bufio/bufio.go
var (
	// 哨兵错误值
	ErrInvalidUnreadByte = errors.New("bufio: invalid use of UnreadByte")
	ErrInvalidUnreadRune = errors.New("bufio: invalid use of UnreadRune")
	ErrBufferFull        = errors.New("bufio: buffer full")
	ErrNegativeCount     = errors.New("bufio: negative count")
)
```

```go
package main

import (
	"bufio"
)

func main() {
	reader := bufio.Reader{}
	_, err := reader.Peek(1)
	if err != nil {
		switch err {
		case bufio.ErrBufferFull:
			return
		case bufio.ErrNegativeCount:
			return
		default:
			return
		}
	}
}
```

> 从 Go `1.13` 开始，`errors.Is` 函数用于错误处理方对错误值的检视

1. 如果 error 类型变量的`底层错误值`是一个`包装错误`（Wrapped Error）
2. `errors.Is` 函数会沿着该`包装错误`所在的`错误链`（Error Chain）
   - 与链上所有被包装的错误进行比较，直到找到一个匹配的错误为止

```go
var ErrUnderlying = errors.New("underlying error")

func main() {
	err1 := fmt.Errorf("wrap underlying: %w", ErrUnderlying) // Error Chain: err1 -> ErrUnderlying
	err2 := fmt.Errorf("wrap err1: %w", err1)                // Error Chain：err2 -> err1 -> ErrUnderlying

	println(err1 == ErrUnderlying) // false
	println(err2 == err1)          // false
	println(err2 == ErrUnderlying) // false

	println(errors.Is(err1, ErrUnderlying)) // true
	println(errors.Is(err2, err1))          // true
	println(errors.Is(err2, ErrUnderlying)) // true
}
```

## 类型

> 通过自定义错误类型和构造错误值的方式，来提供更多的`错误上下文`

> 错误值都是通过 `error` 接口变量`统一`呈现
> 因此要依赖 Go 的`类型断言`机制（`Type Assertion`）和`类型选择`机制（`Type Switch`）

```go encoding/json/decode.go
type UnmarshalTypeError struct {
	Value  string
	Type   reflect.Type
	Offset int64
	Struct string
	Field  string
}

func (d *decodeState) addErrorContext(err error) error {
	if d.errorContext.Struct != nil || len(d.errorContext.FieldStack) > 0 {
    switch err := err.(type) { // 获得 err 接口变量所代表的动态类型和值
		case *UnmarshalTypeError:
			err.Struct = d.errorContext.Struct.Name()
			err.Field = strings.Join(d.errorContext.FieldStack, ".")
			return err
		}
	}
	return err
}
```

> 从 Go `1.13` 开始，`errors.As` 函数用于错误处理方对错误值的检视

1. `errors.As` 函数类似于通过`类型断言`判断一个 error 类型变量是否为特定的`自定义错误类型`
2. 如果 error 类型变量的`动态错误值`是一个`包装错误`，`errors.As` 函数会沿着该包装错误所在的错误链
   - 与链上所有被包装的错误的类型进行比较，直到找到一个匹配的错误类型

```go
type MyErr struct {
	e string
}

func (m *MyErr) Error() string {
	return m.e
}

func main() {
	var myErr = &MyErr{"my myErr"}
	err1 := fmt.Errorf("wrap myErr: %w", myErr) // Error Chain: err1 -> myErr
	err2 := fmt.Errorf("wrap err1: %w", err1)   // Error Chain: err2 -> err1 -> myErr

	var e *MyErr

	if errors.As(err1, &e) {
		println(e == myErr)                  // true
		fmt.Printf("%p, %T\n", myErr, myErr) // 0x14000110220, *main.MyErr
		fmt.Printf("%p, %T\n", e, e)         // 0x14000110220, *main.MyErr
	}

	if errors.As(err2, &e) {
		println(e == myErr)                  // true
		fmt.Printf("%p, %T\n", myErr, myErr) // 0x14000110220, *main.MyErr
		fmt.Printf("%p, %T\n", e, e)         // 0x14000110220, *main.MyErr
	}
}
```

## 行为

> 如何降低`错误处理方`和`错误构造方`的耦合？（`解耦` - 透明；`耦合` - 哨兵、类型）

> 将某个包中错误类型`归类`，统一提取`公共`的`错误行为特征`，并将这些错误行为特征放在一个`公开`的`接口类型`中

```go net/net.go
// An Error represents a network error.
type Error interface {
	error
	Timeout() bool   // Is the error a timeout?
	Temporary() bool // Is the error temporary?
}
```

> 错误处理方只需要依赖该`公共接口`

```go net/http/server.go
	ctx := context.WithValue(baseCtx, ServerContextKey, srv)
	for {
		rw, err := l.Accept()
		if err != nil {
			select {
			case <-srv.getDoneChan():
				return ErrServerClosed
			default:
			}
			if ne, ok := err.(net.Error); ok && ne.Temporary() {
				if tempDelay == 0 {
					tempDelay = 5 * time.Millisecond
				} else {
					tempDelay *= 2
				}
				if max := 1 * time.Second; tempDelay > max {
					tempDelay = max
				}
				srv.logf("http: Accept error: %v; retrying in %v", err, tempDelay)
				time.Sleep(tempDelay)
				continue
			}
			return err
		}
		connCtx := ctx
		if cc := srv.ConnContext; cc != nil {
			connCtx = cc(connCtx, rw)
			if connCtx == nil {
				panic("ConnContext returned nil")
			}
		}
		tempDelay = 0
		c := srv.newConn(rw)
		c.setState(c.rwc, StateNew, runHooks) // before Serve can return
		go c.serve(connCtx)
	}
```

> Accept 实际返回的错误类型为 `*OpError`

```go net/net.go
type OpError struct {
	Op string
	Net string
	Source Addr
	Addr Addr
	Err error
}

type temporary interface {
	Temporary() bool
}

func (e *OpError) Temporary() bool {
	if e.Op == "accept" && isConnError(e.Err) {
		return true
	}

	if ne, ok := e.Err.(*os.SyscallError); ok {
		t, ok := ne.Err.(temporary)
		return ok && t.Temporary()
	}
	t, ok := e.Err.(temporary)
	return ok && t.Temporary()
}
```
