---
title: Go Engineering - Foundation - Log - Package
mathjax: false
date: 2022-05-02 00:06:25
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
---

# 开源日志包

## 标准库 log 包

> 标准库自带，无需安装

1. 只提供 **Print**、**Panic**、**Fatal** 函数用于日志输出
2. Go 标准库大量使用了该 log 包

## glog

> **Kubernetes** 使用的 **klog** 是基于 glog 进行封装

1. **Google** 推出的**轻量级**日志包
2. 特性
   - 支持 **4** 种日志级别： **Info**、**Warning**、**Error**、**Fatal**
   - 支持**命令行**选项
   - 支持根据文件大小**切割**日志文件
   - 支持日志**按级别分类输出**
   - 支持 **V level** -- 开发者**自定义日志级别**
   - 支持 **vmodule** -- 开发者对**不同的文件**使用**不同的日志级别**
   - 支持 **traceLocation** -- 打印**指定位置的栈信息**

<!-- more -->

## logrus

> Github star 数量最多的日志包，**Docker** 和 **Prometheus** 也在使用 logrus

1. 支持常用的日志级别
2. **可扩展**：允许使用者通过 **Hook** 的方式，将日志分**发到任意地方**
3. 支持**自定义的日志格式**：内置支持 **JSON** 和 **TEXT**
4. **结构化**日志记录：**Field 机制**允许使用者**自定义字段**
5. **预设**日志字段：**Default Field 机制**，可以给一部分或者全部日志统一添加共同的日志字段
6. **Fatal handlers**：允许注册一个或多个 Handler，当产生 Fatal 级别的日志时调用，常用于**优雅关闭**

## zap

> **Uber**  开源，以**高性能**著称，子包 zapcore 提供很多底层的日志接口，适合**二次封装**

1. 支持常用的日志级别
2. **性能非常高**
3. 支持针对**特定的日志级别**，输出**调用堆栈**
4. 与 logrus 类似：结构化日志、预设日志字段、支持 Hook

# 设计实现

> 源码：https://github.com/marmotedu/gopractise-demo/tree/master/log/cuslog

## 功能需求

1. 支持**自定义配置**
2. 支持**文件名**和**行号**
3. 支持**日志级别**：Debug、Info、Warn、Error、Panic、Fatal
4. 支持输出到**本地文件**和**标准输出**
5. 支持 **JSON** 和 **TEXT** 的日志输出，支持**自定义日志格式**
6. 支持**选项模式**

## 级别 + 选项

> 为了**方便比较**，几乎所有的日志包都用常量计数器 **iota** 来定义日志级别

```go options.go
type Level uint8

const (
	DebugLevel Level = iota
	InfoLevel
	WarnLevel
	ErrorLevel
	PanicLevel
	FatalLevel
)

var LevelNameMapping = map[Level]string{
	DebugLevel: "DEBUG",
	InfoLevel:  "INFO",
	WarnLevel:  "WARN",
	ErrorLevel: "ERROR",
	PanicLevel: "PANIC",
	FatalLevel: "FATAL",
}
```

> 常见的日志选项：**日志级别**、**输出位置**（标准输出 or 文件）、**输出格式**（JSON or Text）、是否开启**文件名**和**行号**

```go options.go
type options struct {
	output        io.Writer
	level         Level
	stdLevel      Level
	formatter     Formatter
	disableCaller bool
}
```

```go formatter.go
type Formatter interface {
	Format(entry *Entry) error
}
```

> 通过**选项**模式，可以**灵活**地设置日志选项

```go options.go
type Option func(*options)

func initOptions(opts ...Option) (o *options) {
	o = &options{}
	for _, opt := range opts {
		opt(o)
	}

	if o.output == nil {
		o.output = os.Stderr
	}

	if o.formatter == nil {
		o.formatter = &TextFormatter{}
	}

	return
}

func WithLevel(level Level) Option {
	return func(o *options) {
		o.level = level
	}
}

func WithDisableCaller(caller bool) Option {
	return func(o *options) {
		o.disableCaller = caller
	}
}
```

```go logger.go
func SetOptions(opts ...Option) {
	std.SetOptions(opts...)
}

func (l *logger) SetOptions(opts ...Option) {
	l.mu.Lock()
	defer l.mu.Unlock()

	for _, opt := range opts {
		opt(l.opt)
	}
}
```

> 具有选项模式的日志包，可以**动态**地修改日志选项

```go main.go
cuslog.SetOptions(cuslog.WithLevel(cuslog.DebugLevel), cuslog.WithDisableCaller(true))
```

## Logger + 打印

> 创建 Logger，日志包都会有一个默认的全局 Logger

```go logger.go
var std = New()

type logger struct {
	opt       *options
	mu        sync.Mutex
	entryPool *sync.Pool
}

func New(opts ...Option) *logger {
	logger := &logger{opt: initOptions(opts...)}
	logger.entryPool = &sync.Pool{New: func() interface{} { return entry(logger) }}
	return logger
}
```

> 非格式化打印 + 格式化打印

```go logger.go
func (l *logger) Debug(args ...interface{}) {
	l.entry().write(DebugLevel, FmtEmptySeparate, args...)
}

func (l *logger) Debugf(format string, args ...interface{}) {
	l.entry().write(DebugLevel, format, args...)
}
```

> Panic、Panicf 要调用 **`panic()`** 函数；Fatal、Fatalf 要调用 **`os.Exit(1)`** 函数

## 写入输出

> Entry 用来保存所有的日志信息：**日志配置** + **日志内容**

```go entry.go
type Entry struct {
	logger *logger
	Buffer *bytes.Buffer
	Map    map[string]interface{}
	Level  Level
	Time   time.Time
	File   string
	Line   int
	Func   string
	Format string
	Args   []interface{}
}

func (e *Entry) write(level Level, format string, args ...interface{}) {
	if e.logger.opt.level > level {
		return
	}
	e.Time = time.Now()
	e.Level = level
	e.Format = format
	e.Args = args
	if !e.logger.opt.disableCaller {
		if pc, file, line, ok := runtime.Caller(2); !ok {
			e.File = "???"
			e.Func = "???"
		} else {
			e.File, e.Line, e.Func = file, line, runtime.FuncForPC(pc).Name()
			e.Func = e.Func[strings.LastIndex(e.Func, "/")+1:]
		}
	}
	e.format()
	e.writer()
	e.release()
}

func (e *Entry) format() {
	_ = e.logger.opt.formatter.Format(e)
}

func (e *Entry) writer() {
	e.logger.mu.Lock()
	_, _ = e.logger.opt.output.Write(e.Buffer.Bytes())
	e.logger.mu.Unlock()
}

func (e *Entry) release() {
	e.Args, e.Line, e.File, e.Format, e.Func = nil, 0, "", "", ""
	e.Buffer.Reset()
	e.logger.entryPool.Put(e)
}
```

```go io.go
type Writer interface {
	Write(p []byte) (n int, err error)
}
```

## 自定义输出格式

![image-20220502203406325](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220502203406325.png)

## 测试

```go example.go
package main

import (
	"log"
	"os"

	"github.com/marmotedu/gopractise-demo/log/cuslog"
)

func main() {
	cuslog.Info("std log")
	cuslog.SetOptions(cuslog.WithLevel(cuslog.DebugLevel))
	cuslog.Debug("change std log to debug level")
	cuslog.SetOptions(cuslog.WithFormatter(&cuslog.JsonFormatter{IgnoreBasicFields: false}))
	cuslog.Debug("log in json format")
	cuslog.Info("another log in json format")

	// 输出到文件
	fd, err := os.OpenFile("test.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Fatalln("create file test.log failed")
	}
	defer fd.Close()

	l := cuslog.New(cuslog.WithLevel(cuslog.InfoLevel),
		cuslog.WithOutput(fd),
		cuslog.WithFormatter(&cuslog.JsonFormatter{IgnoreBasicFields: false}),
	)
	l.Info("custom log with json formatter")
}
```

```
$ go run example.go        
2022-05-02T20:38:54+08:00 INFO example.go:11 std log
2022-05-02T20:38:54+08:00 DEBUG example.go:13 change std log to debug level
{"message":"log in json format","level":"DEBUG","time":"2022-05-02T20:38:54+08:00","file":"/Users/zhongmingmao/workspace/go/src/github.com/marmotedu/gopractise-demo/log/cuslog/example/example.go:15","func":"main.main"}
{"file":"/Users/zhongmingmao/workspace/go/src/github.com/marmotedu/gopractise-demo/log/cuslog/example/example.go:16","func":"main.main","message":"another log in json format","level":"INFO","time":"2022-05-02T20:38:54+08:00"}
```

