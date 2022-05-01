---
title: Go Engineering - Foundation - Error
mathjax: false
date: 2022-05-01 01:06:25
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
---

# 功能需求

1. 支持错误**堆栈**
2. 支持不同的**打印格式**，如`%+v`、`%v`、`%s` 等
3. 支持 **Wrap/Unwrap** 功能：在已有错误的基础上，追加一些新的信息
   - `errors.Wrap(err, "open file failed")`
   - 调用 **Wrap** 时，会生成一个**错误堆栈节点**
4. 支持 **Is** 方法：判断某个 error 是否为指定的 error
   - 无 wrapping error 时
     - `if err == os.ErrNotExist {}`
   - 有 wrapping error 时，不知道 err 是否为 wrapping error，嵌套了几层
     - **`func Is(err, target error) bool`**
       - err 和 target 是同一个
       - err 是 wrapping error 时，target **包含**在这个嵌套 error 链中
5. 支持 **As** 函数：将一个 error 转为另一个 error
   - 无 wrapping error 时，使用 **type assertion**
     - `if perr, ok := err.(*os.PathError); ok {}`
   - 有 wrapping error 时
     - `var perr *os.PathError`
     - `if errors.As(err, &perr) {}`
6. 支持两种错误**创建**方式：**非格式化**创建 + **格式化**创建
   - `errors.New("file not found")`
   - `errors.Errorf("file %s not found", "iam-apiserver")`

<!-- more -->

# 源码解析

## error 定义

```go $GOROOT/src/builtin/builtin.go
// The error built-in interface type is the conventional interface for
// representing an error condition, with the nil value representing no error.
type error interface {
	Error() string
}
```

> 带有业务 Code 码的业务异常

```go
type bizError struct {
	code int
	msg  string
}

func (e *bizError) Error() string {
	return fmt.Sprintf("%s: code %d", e.msg, e.code)
}

func NewBizError(msg string, code int) error {
	return &bizError{
		code: code,
		msg:  msg,
	}
}
```

## 创建 error

### errors.New

```go $GOROOT/src/errors/errors.go
package errors

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

### fmt.Errorf

> 关键：format 是否包含 `%w` 标记

```go $GOROOT/src/fmt/errors.go
package fmt

import "errors"

// Errorf formats according to a format specifier and returns the string as a
// value that satisfies error.
//
// If the format specifier includes a %w verb with an error operand,
// the returned error will implement an Unwrap method returning the operand. It is
// invalid to include more than one %w verb or to supply it with an operand
// that does not implement the error interface. The %w verb is otherwise
// a synonym for %v.
func Errorf(format string, a ...any) error {
	p := newPrinter()
	p.wrapErrs = true
	p.doPrintf(format, a)
	s := string(p.buf)
	var err error
	if p.wrappedErr == nil {
		err = errors.New(s)
	} else {
		err = &wrapError{s, p.wrappedErr}
	}
	p.free()
	return err
}

type wrapError struct {
	msg string
	err error
}

func (e *wrapError) Error() string {
	return e.msg
}

func (e *wrapError) Unwrap() error {
	return e.err
}
```

```go $GOROOT/src/cmd/vendor/golang.org/x/xerrors/wrap.go
package xerrors

// A Wrapper provides context around another error.
type Wrapper interface {
	// Unwrap returns the next error in the error chain.
	// If there is no next error, Unwrap returns nil.
	Unwrap() error
}
```

## 包装 error

> 旧版本 Go，需要依赖第三方包：github.com/pkg/errors

```go
import "github.com/pkg/errors"

if err != nil {
	return errors.Wrap(err, "some biz context") 
} 
```

```go
// Wrap returns an error annotating err with a stack trace
// at the point Wrap is called, and the supplied message.
// If err is nil, Wrap returns nil.
func Wrap(err error, message string) error {
	if err == nil {
		return nil
	}
	err = &withMessage{
		cause: err,
		msg:   message,
	}
	return &withStack{
		err,
		callers(),
	}
}
```

```go
type withMessage struct {
	cause error
	msg   string
}

func (w *withMessage) Error() string { return w.msg + ": " + w.cause.Error() }
func (w *withMessage) Cause() error  { return w.cause }

// Unwrap provides compatibility for Go 1.13 error chains.
func (w *withMessage) Unwrap() error { return w.cause }

func (w *withMessage) Format(s fmt.State, verb rune) {
	switch verb {
	case 'v':
		if s.Flag('+') {
			fmt.Fprintf(s, "%+v\n", w.Cause())
			io.WriteString(s, w.msg)
			return
		}
		fallthrough
	case 's', 'q':
		io.WriteString(s, w.Error())
	}
}
```

```go
type withStack struct {
	error
	*stack
}

func (w *withStack) Cause() error { return w.error }

// Unwrap provides compatibility for Go 1.13 error chains.
func (w *withStack) Unwrap() error { return w.error }

func (w *withStack) Format(s fmt.State, verb rune) {
	switch verb {
	case 'v':
		if s.Flag('+') {
			fmt.Fprintf(s, "%+v", w.Cause())
			w.stack.Format(s, verb)
			return
		}
		fallthrough
	case 's':
		io.WriteString(s, w.Error())
	case 'q':
		fmt.Fprintf(s, "%q", w.Error())
	}
}
```

```go
// stack represents a stack of program counters.
type stack []uintptr
```

```go
func callers() *stack {
	const depth = 32
	var pcs [depth]uintptr
	n := runtime.Callers(3, pcs[:])
	var st stack = pcs[0:n]
	return &st
}
```

> 新版本 Go

```go
import "fmt"  

if err != nil {
	return fmt.Errorf("biz context: %w", err) 
} 
```

![image-20220501172059733](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220501172059733.png)

## Is

```go $GOROOT/src/errors/wrap.go
// Is reports whether any error in err's chain matches target.
//
// The chain consists of err itself followed by the sequence of errors obtained by
// repeatedly calling Unwrap.
//
// An error is considered to match a target if it is equal to that target or if
// it implements a method Is(error) bool such that Is(target) returns true.
//
// An error type might provide an Is method so it can be treated as equivalent
// to an existing error. For example, if MyError defines
//
//	func (m MyError) Is(target error) bool { return target == fs.ErrExist }
//
// then Is(MyError{}, fs.ErrExist) returns true. See syscall.Errno.Is for
// an example in the standard library. An Is method should only shallowly
// compare err and the target and not call Unwrap on either.
func Is(err, target error) bool {
	if target == nil {
		return err == target
	}

	isComparable := reflectlite.TypeOf(target).Comparable()
	for {
		if isComparable && err == target {
			return true
		}
		if x, ok := err.(interface{ Is(error) bool }); ok && x.Is(target) {
			return true
		}
		// TODO: consider supporting target.Is(err). This would allow
		// user-definable predicates, but also may allow for coping with sloppy
		// APIs, thereby making it easier to get away with them.
		if err = Unwrap(err); err == nil {
			return false
		}
	}
}

// Unwrap returns the result of calling the Unwrap method on err, if err's
// type contains an Unwrap method returning error.
// Otherwise, Unwrap returns nil.
func Unwrap(err error) error {
	u, ok := err.(interface {
		Unwrap() error
	})
	if !ok {
		return nil
	}
	return u.Unwrap()
}
```

## As

```go $GOROOT/src/errors/wrap.go
// As finds the first error in err's chain that matches target, and if one is found, sets
// target to that error value and returns true. Otherwise, it returns false.
//
// The chain consists of err itself followed by the sequence of errors obtained by
// repeatedly calling Unwrap.
//
// An error matches target if the error's concrete value is assignable to the value
// pointed to by target, or if the error has a method As(interface{}) bool such that
// As(target) returns true. In the latter case, the As method is responsible for
// setting target.
//
// An error type might provide an As method so it can be treated as if it were a
// different error type.
//
// As panics if target is not a non-nil pointer to either a type that implements
// error, or to any interface type.
func As(err error, target any) bool {
	if target == nil {
		panic("errors: target cannot be nil")
	}
	val := reflectlite.ValueOf(target)
	typ := val.Type()
	if typ.Kind() != reflectlite.Ptr || val.IsNil() {
		panic("errors: target must be a non-nil pointer")
	}
	targetType := typ.Elem()
	if targetType.Kind() != reflectlite.Interface && !targetType.Implements(errorType) {
		panic("errors: *target must be interface or implement error")
	}
	for err != nil {
		if reflectlite.TypeOf(err).AssignableTo(targetType) {
			val.Elem().Set(reflectlite.ValueOf(err))
			return true
		}
		if x, ok := err.(interface{ As(any) bool }); ok && x.As(target) {
			return true
		}
		err = Unwrap(err)
	}
	return false
}
```

