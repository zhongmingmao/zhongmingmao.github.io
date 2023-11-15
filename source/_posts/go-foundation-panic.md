---
title: Go - panic
mathjax: false
date: 2023-01-07 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231112164749815.png
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 原则

1. 不要相信任何`外部输入`的参数
   - 函数需要对所有输入的参数进行`合法性`的检查
   - 一旦发现问题，`立即终止`函数的执行，返回预设的错误值
2. 不要忽略任何一个`错误`
   - `显式检查`这些函数调用返回的错误值
   - 一旦发现错误，要及时终止函数执行，防止错误继续传播
3. 不要假定`异常`不会发生
   - `异常不是错误`
     - 错误是`可预期`的，也会经常发生，有对应的公开错误码和错误处理方案
     - 异常是`不可预期`的，通常指的是硬件异常、操作系统异常、语言运行时异常、代码 Bug（数组越界访问）等
   - 异常是`小概率`事件，但不能假定异常不会发生
     - 根据函数的角色和使用场景，考虑是否要在函数内设置`异常捕获`和`恢复`的环节

<!-- more -->

# panic

> 在 Go 中，由 `panic` 来表达`异常`的概念

1. panic 指的是 Go 程序在`运行时`出现的一个异常情况
   - 如果异常出现了，但没有被`捕获`并`恢复`，则 Go 程序的执行会被`终止`
   - 即便出现异常的位置不在`主 goroutine`
2. panic 来源：`Go 运行时` / 开发者通过 `panic` 函数`主动触发`
3. 当 panic 被触发，后续的执行过程称为 `panicking`

> 手动调用 `panic` 函数，主动触发 `panicking`

1. 当函数 F 调用 panic 函数，函数 F 的执行将`停止`
2. 函数 F 中已进行求值的 `deferred` 函数都会得到`正常执行`
3. 执行完所有 `deferred` 函数后，函数 F 才会把`控制权`返回给其`调用者`
4. 函数 F 的调用者
   - 函数 F 之后的行为就如同调用者`自己调用 panic 函数`一样 - `递归`
5. 该 `panicking` 过程将继续在`栈上`进行，直到`当前 goroutine` 中的`所有函数`都返回为止
6. 最后 Go 程序`崩溃退出`

```go
package main

func foo() { // 同样没有捕获 panic
	println("call foo")
	bar() // bar 触发 panic 后，但没有捕获，会传递到 foo，就如同 foo 自身触发 panic，foo 函数会停止执行

	println("exit foo")
}

func bar() { // 没有捕获 panic，panic 会沿着函数调用栈向上冒泡，直到被 recover() 捕获或者程序退出
	println("call bar")
	panic("panic in bar") // panicking 开始，函数执行到此后停止

	zoo()               // Unreachable code
	println("exit bar") // Unreachable code
}

func zoo() {
	println("call zoo")
	println("exit zoo")
}

func main() {
	println("call main")
	foo()

	println("exit main")
}

// Output:
//	call main
//	call foo
//	call bar
//	panic: panic in bar
//
//	goroutine 1 [running]:
//	main.bar(...)
//		/Users/zhongmingmao/workspace/go/src/github.com/zhongmingmao/go101/main.go:11
//	main.foo(...)
//		/Users/zhongmingmao/workspace/go/src/github.com/zhongmingmao/go101/main.go:5
//	main.main()
//	/Users/zhongmingmao/workspace/go/src/github.com/zhongmingmao/go101/main.go:23 +0xa0
```

# recover

> recover 是 Go 内置的专门用于`恢复 panic` 的函数，必须被放在一个 `defer` 函数中`才能生效`

```go
package main

import "fmt"

func foo() {
	println("call foo")
	bar()
	println("exit foo")
}

func bar() {
	defer func() { // 匿名函数
		if err := recover(); err != nil {
			// 如果 panic 被 recover 捕获，那么 panic 引发的 panicking 过程就会停止
			fmt.Printf("recover in bar: %v\n", err)
		}
	}()

	println("call bar")
	panic("panic in bar") // 函数执行同样会被中断，先到已经成功设置的 defer 匿名函数

	defer func() { // Unreachable code
		println("will not be executed")
	}()

	zoo()               // Unreachable code
	println("exit bar") // Unreachable code
}

func zoo() {
	println("call zoo")
	println("exit zoo")
}

func main() {
	println("call main")
	foo()
	println("exit main")
}

// Output:
//	call main
//	call foo
//	call bar
//	recover in bar: panic in bar
//	exit foo
//	exit main
```

> `defer` 函数类似于 `function close hook`

> 每个函数都 defer + recover：`心智负担` + `性能开销`

# 经验

> 评估程序对 panic 的`忍受度`，对于`关键系统`，需要在特定位置`捕获`并`恢复` panic，以保证服务整体的健壮性

1. Go http server，每个`客户端连接`都使用一个`单独的 goroutine` 进行处理的并发处理模型
2. 客户端一旦与 http server 连接成功，http server 就会为这个连接新建一个 goroutine
   - 并在该 goroutine 中执行对应连接的 serve 方法，来处理这条连接上客户端请求
3. panic 危害
   - 无论哪个 goroutine 中发生`未被恢复`的 panic，`整个 Go 程序`都将`崩溃退出`
4. 需要保证某一客户端连接的 goroutine 出现 panic 时，不影响 http server `主 goroutine` 的运行
   - serve 方法在一开始就设置了 defer 匿名函数，在 defer 匿名函数中`捕获`并`恢复`了可能出现的 panic
5. `并发`程序的异常处理策略：`局部不影响整体`

```go net/http/server.go
// Serve a new connection.
func (c *conn) serve(ctx context.Context) {
	c.remoteAddr = c.rwc.RemoteAddr().String()
	ctx = context.WithValue(ctx, LocalAddrContextKey, c.rwc.LocalAddr())
	defer func() {
		if err := recover(); err != nil && err != ErrAbortHandler {
			const size = 64 << 10
			buf := make([]byte, size)
			buf = buf[:runtime.Stack(buf, false)]
			c.server.logf("http: panic serving %v: %v\n%s", c.remoteAddr, err, buf)
		}
		if !c.hijacked() {
			c.close()
			c.setState(c.rwc, StateClosed, runHooks)
		}
	}()
  ...
}
```

> 提示`潜在的 Bug` - 触发了`非预期`的执行路径
> 在 Go `标准库`中，大多数 `panic` 的使用都是充当类似`断言`的作用

```go encoding/json/decode.go
// phasePanicMsg is used as a panic message when we end up with something that
// shouldn't happen. It can indicate a bug in the JSON decoder, or that
// something is editing the data slice while the decoder executes.
const phasePanicMsg = "JSON decoder out of sync - data changing underfoot?"

func (d *decodeState) init(data []byte) *decodeState {
	d.data = data
	d.off = 0
	d.savedError = nil
	d.errorContext.Struct = nil

	// Reuse the allocated space for the FieldStack slice.
	d.errorContext.FieldStack = d.errorContext.FieldStack[:0]
	return d
}

func (d *decodeState) valueQuoted() interface{} {
	switch d.opcode {
	default:
		// 如果程序执行流进入 default 分支，会触发 panic，提示开发人员，这可能是个 Bug
		panic(phasePanicMsg)

	case scanBeginArray, scanBeginObject:
		d.skip()
		d.scanNext()

	case scanBeginLiteral:
		v := d.literalInterface()
		switch v.(type) {
		case nil, string:
			return v
		}
	}
	return unquotedValue{}
}
```

```go encoding/json/encode.go
func (w *reflectWithString) resolve() error {
	if w.v.Kind() == reflect.String {
		w.s = w.v.String()
		return nil
	}
	if tm, ok := w.v.Interface().(encoding.TextMarshaler); ok {
		if w.v.Kind() == reflect.Ptr && w.v.IsNil() {
			return nil
		}
		buf, err := tm.MarshalText()
		w.s = string(buf)
		return err
	}
	switch w.v.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		w.s = strconv.FormatInt(w.v.Int(), 10)
		return nil
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64, reflect.Uintptr:
		w.s = strconv.FormatUint(w.v.Uint(), 10)
		return nil
	}
	panic("unexpected map key type") // 相当于断言：代码不应该执行到这里，可能是个潜在的 Bug
}
```

> 不要混淆`异常`和`错误`

1. 在 Java 标准类库中的 `checked exception`，类似于 Go 的`哨兵错误值`
   - 都是`预定义`的，代表`特定场景`下的错误状态
2. Java checked exception 用于一些`可预见`的，经常发生的错误场景
   - 针对 checked exception 所谓的异常处理，本质上是针对这些场景的`错误处理预案`
   - 即对 checked exception 的定义、使用、捕获等行为都是`有意而为之`
   - 必须要被`上层代码`处理：捕获 or 重新抛给上层
3. 在 Go 中，通常会引入大量第三方包，而`无法确定`这些第三方 API 包中是否会引发 `panic`
   - API 的使用者不会逐一了解 API 是否会引发 panic，也没有义务去处理引发的 panic
   - 一旦 API 的作者`将异常当成错误`，但又不强制 API 使用者处理，会引入麻烦
   - 因此，不要将 `panic` 当成 `error` 返回给 API 的调用者，大部分应该返回 `error`，即 Java checked exception

| Java                       | Go      |
| -------------------------- | ------- |
| `Checked Exception`        | `error` |
| `RuntimeException / Error` | `panic` |

> Java 发生 RuntimeException，JVM 只会停止对应的线程；而 Go 发生 panic，会整个程序崩溃