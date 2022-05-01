---
title: Go Engineering - Foundation - Error - Package
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
2. 支持不同的**打印格式**，例如 `%+v`、`%v`、`%s` 等
3. 支持 **Wrap/Unwrap** 功能：在已有 error 的基础上，追加一些新的信息
   - `errors.Wrap(err, "open file failed")`
   - 调用 **Wrap** 时，会生成一个**错误堆栈节点**
4. 支持 **Is** 方法：判断某个 error 是否为指定的 error
   - **Go 1.13** 之前，并没有 **wrapping error**
     - `if err == os.ErrNotExist {}`
   - 有 wrapping error 后，直接用 `==` 判断会有问题，因为可能是 wrapping error
     - **`func Is(err, target error) bool`**
       - err 和 target 是**同一个**
       - 当 err 是 wrapping error 时，target **包含**在这个**嵌套 error 链**中
5. 支持 **As** 函数
   - **Go 1.13** 之前，并没有 **wrapping error**，可以使用 **type assertion** 或者 **type switch**
     - `if perr, ok := err.(*os.PathError); ok {}`
   - 有 wrapping error 时
     - `var perr *os.PathError`
     - `if errors.As(err, &perr) {}`
6. 支持两种错误**创建**方式
   - `errors.New("file not found")`
   - `errors.Errorf("file %s not found", "iam-apiserver")`

<!-- more -->

# 使用样例

> 生产环境使用 **JSON** 格式打印日志，便于后续**日志系统**的解析，即 `%#-v` 或 `%#+v`

![18a93313e017d4f3b21370099d011c5c](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/18a93313e017d4f3b21370099d011c5c.webp)

```go
package main

import (
	"fmt"

	"github.com/marmotedu/errors"
	code "github.com/marmotedu/sample-code"
)

func main() {
	if err := bindUser(); err != nil {
		// %s: Returns the user-safe error string mapped to the error code or the error message if none is specified.
		fmt.Println("====================> %s <====================")
		fmt.Printf("%s\n\n", err)

		// %v: Alias for %s.
		fmt.Println("====================> %v <====================")
		fmt.Printf("%v\n\n", err)

		// %-v: Output caller details, useful for troubleshooting.
		fmt.Println("====================> %-v <====================")
		fmt.Printf("%-v\n\n", err)

		// %+v: Output full error stack details, useful for debugging.
		fmt.Println("====================> %+v <====================")
		fmt.Printf("%+v\n\n", err)

		// %#-v: Output caller details, useful for troubleshooting with JSON formatted output.
		fmt.Println("====================> %#-v <====================")
		fmt.Printf("%#-v\n\n", err)

		// %#+v: Output full error stack details, useful for debugging with JSON formatted output.
		fmt.Println("====================> %#+v <====================")
		fmt.Printf("%#+v\n\n", err)

		// do some business process based on the error type
		if errors.IsCode(err, code.ErrEncodingFailed) {
			fmt.Println("this is a ErrEncodingFailed error")
		}

		if errors.IsCode(err, code.ErrDatabase) {
			fmt.Println("this is a ErrDatabase error")
		}

		// we can also find the cause error
		fmt.Println(errors.Cause(err))
	}
}

func bindUser() error {
	if err := getUser(); err != nil {
		// Step3: Wrap the error with a new error message and a new error code if needed.
		return errors.WrapC(err, code.ErrEncodingFailed, "encoding user 'Lingfei Kong' failed.")
	}

	return nil
}

func getUser() error {
	if err := queryDatabase(); err != nil {
		// Step2: Wrap the error with a new error message.
		return errors.Wrap(err, "get user failed.")
	}

	return nil
}

func queryDatabase() error {
	// Step1. Create error with specified error code.
	return errors.WithCode(code.ErrDatabase, "user 'Lingfei Kong' not found.")
}
```

![image-20220501201732321](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220501201732321.png)

```json
[
  {
    "caller": "#2 /Users/zhongmingmao/workspace/go/src/github.com/marmotedu/errors/main/main.go:53 (main.bindUser)",
    "code": 100301,
    "error": "encoding user \u0027Lingfei Kong\u0027 failed.",
    "message": "Encoding failed due to an error with the data"
  },
  {
    "caller": "#1 /Users/zhongmingmao/workspace/go/src/github.com/marmotedu/errors/main/main.go:62 (main.getUser)",
    "code": 100101,
    "error": "get user failed.",
    "message": "Database error"
  },
  {
    "caller": "#0 /Users/zhongmingmao/workspace/go/src/github.com/marmotedu/errors/main/main.go:70 (main.queryDatabase)",
    "code": 100101,
    "error": "user \u0027Lingfei Kong\u0027 not found.",
    "message": "Database error"
  }
]
```

# 代码实现

## withCode

```go
type withCode struct {
	err   error
	code  int
	cause error
	*stack
}

// stack represents a stack of program counters.
type stack []uintptr

// Error return the externally-safe error message.
func (w *withCode) Error() string { return fmt.Sprintf("%v", w) }

// Cause return the cause of the withCode error.
func (w *withCode) Cause() error { return w.cause }

// Unwrap provides compatibility for Go 1.13 error chains.
func (w *withCode) Unwrap() error { return w.cause }

// Format implements fmt.Formatter. https://golang.org/pkg/fmt/#hdr-Printing
//
// Verbs:
//     %s  - Returns the user-safe error string mapped to the error code or
//       ┊   the error message if none is specified.
//     %v      Alias for %s
//
// Flags:
//      #      JSON formatted output, useful for logging
//      -      Output caller details, useful for troubleshooting
//      +      Output full error stack details, useful for debugging
func (w *withCode) Format(state fmt.State, verb rune) {
  ...
}
```

## WrapC

```go
func WrapC(err error, code int, format string, args ...interface{}) error {
	if err == nil {
		return nil
	}

	return &withCode{
		err:   fmt.Errorf(format, args...),
		code:  code,
		cause: err,
		stack: callers(),
	}
}
```

## init

![go-init](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/go-init.png)

![image-20220501204150242](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220501204150242.png)

![image-20220501204307135](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220501204307135.png)

> **Must** 是一种 Go 代码设计技巧，在不满足某种情况时会 **panic**，建议使用

```go
// codes contains a map of error codes to metadata.
var codes = map[int]Coder{}
var codeMux = &sync.Mutex{}

// Register register a user define error code.
// It will overrid the exist code.
func Register(coder Coder) {
	if coder.Code() == 0 {
		panic("code `0` is reserved by `github.com/marmotedu/errors` as unknownCode error code")
	}

	codeMux.Lock()
	defer codeMux.Unlock()

	codes[coder.Code()] = coder
}

// MustRegister register a user define error code.
// It will panic when the same Code already exist.
func MustRegister(coder Coder) {
	if coder.Code() == 0 {
		panic("code '0' is reserved by 'github.com/marmotedu/errors' as ErrUnknown error code")
	}

	codeMux.Lock()
	defer codeMux.Unlock()

	if _, ok := codes[coder.Code()]; ok {
		panic(fmt.Sprintf("code: %d already exist", coder.Code()))
	}

	codes[coder.Code()] = coder
}
```

```go
// Coder defines an interface for an error code detail information.
type Coder interface {
	// HTTP status that should be used for the associated error code.
	HTTPStatus() int

	// External (user) facing error text.
	String() string

	// Reference returns the detail documents for user.
	Reference() string

	// Code returns the code of the coder
	Code() int
}
```

```go
// ErrCode implements `github.com/marmotedu/errors`.Coder interface.
type ErrCode struct {
	// C refers to the code of the ErrCode.
	C int

	// HTTP status that should be used for the associated error code.
	HTTP int

	// External (user) facing error text.
	Ext string

	// Ref specify the reference document.
	Ref string
}

// Code returns the integer code of ErrCode.
func (coder ErrCode) Code() int {
	return coder.C
}

// String implements stringer. String returns the external error message,
// if any.
func (coder ErrCode) String() string {
	return coder.Ext
}

// Reference returns the reference document.
func (coder ErrCode) Reference() string {
	return coder.Ref
}

// HTTPStatus returns the associated HTTP status code, if any. Otherwise,
// returns 200.
func (coder ErrCode) HTTPStatus() int {
	if coder.HTTP == 0 {
		return 500
	}
	return coder.HTTP
}
```

## Is + As + Unwrap

```go
// +build go1.13

package errors

import (
	stderrors "errors"
)

// Is reports whether any error in err's chain matches target.
//
// The chain consists of err itself followed by the sequence of errors obtained by
// repeatedly calling Unwrap.
//
// An error is considered to match a target if it is equal to that target or if
// it implements a method Is(error) bool such that Is(target) returns true.
func Is(err, target error) bool { return stderrors.Is(err, target) }

// As finds the first error in err's chain that matches target, and if so, sets
// target to that error value and returns true.
//
// The chain consists of err itself followed by the sequence of errors obtained by
// repeatedly calling Unwrap.
//
// An error matches target if the error's concrete value is assignable to the value
// pointed to by target, or if the error has a method As(interface{}) bool such that
// As(target) returns true. In the latter case, the As method is responsible for
// setting target.
//
// As will panic if target is not a non-nil pointer to either a type that implements
// error, or to any interface type. As returns false if err is nil.
func As(err error, target interface{}) bool { return stderrors.As(err, target) }

// Unwrap returns the result of calling the Unwrap method on err, if err's
// type contains an Unwrap method returning error.
// Otherwise, Unwrap returns nil.
func Unwrap(err error) error {
	return stderrors.Unwrap(err)
}
```

## IsCode

```go
// IsCode reports whether any error in err's chain contains the given error code.
func IsCode(err error, code int) bool {
	if v, ok := err.(*withCode); ok {
		if v.code == code {
			return true
		}

		if v.cause != nil {
			return IsCode(v.cause, code)
		}

		return false
	}

	return false
}
```

## ParseCoder

```go
// ParseCoder parse any error into *withCode.
// nil error will return nil direct.
// None withStack error will be parsed as ErrUnknown.
func ParseCoder(err error) Coder {
	if err == nil {
		return nil
	}

	if v, ok := err.(*withCode); ok {
		if coder, ok := codes[v.code]; ok {
			return coder
		}
	}

	return unknownCoder
}
```

# 记录错误

## 利用堆栈

> 使用样例如上

## 原始位置

> 仅在错误产生的**最原始位置**调用**日志包**记录函数，打印错误信息，其他位置**直接返回**

```go errortrack_log.go
package main

import (
	"fmt"

	"github.com/marmotedu/errors"
	"github.com/marmotedu/log"

	code "github.com/marmotedu/sample-code"
)

func main() {
	if err := getUser(); err != nil {
		fmt.Printf("%v\n", err)
	}
}

func getUser() error {
	if err := queryDatabase(); err != nil {
		return err
	}

	return nil
}

func queryDatabase() error {
	opts := &log.Options{
		Level:            "info",
		Format:           "console",
		EnableColor:      true,
		EnableCaller:     true,
		OutputPaths:      []string{"test.log", "stdout"},
		ErrorOutputPaths: []string{},
	}

	log.Init(opts)
	defer log.Flush()

	err := errors.WithCode(code.ErrDatabase, "user 'Lingfei Kong' not found.")
	if err != nil {
		log.Errorf("%v", err)
	}
	return err
}
```

```
$ go run errortrack_log.go 
2022-05-01 21:11:08.171 ERROR   log/errortrack_log.go:41        Database error
Database error

$ cat test.log 
2022-05-01 21:11:08.171 ERROR   log/errortrack_log.go:41        Database error
```

> 这种情况，一般不需要再对错误进行**封装**

# 错误码

## 通用错误码

```go base.go
package code

//go:generate codegen -type=int
//go:generate codegen -type=int -doc -output ./error_code_generated.md

// 通用: 基本错误
// Code must start with 1xxxxx
const (
	// ErrSuccess - 200: OK.
	ErrSuccess int = iota + 100001

	// ErrUnknown - 500: Internal server error.
	ErrUnknown

	// ErrBind - 400: Error occurred while binding the request body to the struct.
	ErrBind

	// ErrValidation - 400: Validation failed.
	ErrValidation

	// ErrTokenInvalid - 401: Token invalid.
	ErrTokenInvalid
)
```

> codegen 可以生成 sample_code_generated.go 和 error_code_generated.md

```
$ make tools.install.codegen
===========> Installing codegen

$ cd ../sample-code
$ go generate
```

> 实际开发过程中，将错误码包独立成一个包，放在 `internal/pkg/code/` 目录下，方便整个应用调用

## 业务错误码

```
$ ls internal/pkg/code   
apiserver.go      authzserver.go    base.go           code.go           code_generated.go doc.go
```

> 同一服务不同模块的错误码，使用不同的 **const 代码块**区分

```go
// iam-apiserver: user errors.
const (
	// ErrUserNotFound - 404: User not found.
	ErrUserNotFound int = iota + 110001

	// ErrUserAlreadyExist - 400: User already exist.
	ErrUserAlreadyExist
)

// iam-apiserver: secret errors.
const (
	// ErrEncrypt - 400: Secret reach the max count.
	ErrReachMaxCount int = iota + 110101

	//  ErrSecretNotFound - 404: Secret not found.
	ErrSecretNotFound
)
```

# 集成使用

```go
// Response defines project response format which in marmotedu organization.
type Response struct {
    Code      errors.Code `json:"code,omitempty"`
    Message   string      `json:"message,omitempty"`
    Reference string      `json:"reference,omitempty"`
    Data      interface{} `json:"data,omitempty"`
}

// WriteResponse used to write an error and JSON data into response.
func WriteResponse(c *gin.Context, err error, data interface{}) {
    if err != nil {
        coder := errors.ParseCoder(err)

        c.JSON(coder.HTTPStatus(), Response{
            Code:      coder.Code(),
            Message:   coder.String(),
            Reference: coder.Reference(),
            Data:      data,
        })
    }

    c.JSON(http.StatusOK, Response{Data: data})
}

func GetUser(c *gin.Context) {
    log.Info("get user function called.", "X-Request-Id", requestid.Get(c))
    // Get the user by the `username` from the database.
    user, err := store.Client().Users().Get(c.Param("username"), metav1.GetOptions{})
    if err != nil {
        core.WriteResponse(c, code.ErrUserNotFound.Error(), nil)
        return
    }

    core.WriteResponse(c, nil, user)
}
```

