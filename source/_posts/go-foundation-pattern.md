---
title: Go - Pattern
mathjax: false
date: 2023-01-14 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231119210747019.png
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 前置原则

> 在实际真正需要的时候才对程序进行`抽象`

1. 不要为了抽象而抽象
2. 不要为了使用接口而使用接口

> `解耦`或者`抽象`是有`成本`的

1. 造成`运行效率`的下降
2. 影响代码的`可读性`

<!-- more -->

# 组合

1. 如果 `C++` 和 `Java` 是关于`类型层次结构`和`类型分类`的语言，那么 `Go` 是关于`组合`的语言
2. `组合`是 Go 的重要`设计哲学`之一，而`正交性`则为组合哲学的`落地`提供了方便的条件

## 正交

1. 在计算机技术中，正交性用于表示某种`不相依赖性`或者`解耦性`
2. 编程语言中的`语法元素`和`语言特性`也存在正交的情况，通过将这些`正交`的特性`组合`起来，可以实现更为高级的特性

> Go 在语言设计层面提供的正交的语法元素

| Key                          | Value                                                    |
| ---------------------------- | -------------------------------------------------------- |
| `类型定义`是正交的           | 无类型体系，没有`父子类`的概念                           |
| `方法`和`类型`是正交的       | 方法的本质只是将 receiver 参数作为第一个参数的`函数`而已 |
| `接口`与其它语言元素是正交的 | 接口与它的实现者之间没有`显式关联`                       |

## 方式

![image-20231119224234141](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231119224234141.png)

### 垂直组合

> 用在将多个类型通过`类型嵌入`的方式实现新类型的`定义`

1. 传统的 `OOP` 编程语言大多是通过`继承`的方式构建出类型体系
2. Go 没有类型体系的概念，Go 通过`类型的组合`而不是继承让单一类型承载更多的功能 - `垂直组合`
3. 通过垂直组合定义的新类型与被嵌入的类型之间没有所谓的`父子`关系
   - 没有 `Type Casting`
   - 被嵌入的类型也不知道`外部类型`的存在
4. 调用方法时，方法的匹配取决于`方法名`，而非`类型`
5. `垂直组合`更多应用于`类型定义`，本质是一种`类型组合`，属于类型之间的耦合方式

> 通过嵌入`接口`构建`接口`

```go io/io.go
// 实现接口行为聚合
type ReadWriter interface {
	Reader
	Writer
}
```

> 通过嵌入`接口`构建`结构体`

```go
// 用于快速构建满足某一接口的结构体类型，常用于单元测试
type MyReader struct {
	io.Reader

	N int64
}
```

> 通过嵌入`结构体`构建`结构体`

```go
type A struct {
}

type B struct {
	A

	N int64
}
```

1. 在`结构体`中嵌入接口或者其它结构体，都是`委派模式`（delegate）的一种应用
2. 对新结构体类型的方法调用，可能会被`委派`给该结构体内部嵌入的结构体实例

### 水平组合

> 依赖接口，而非依赖实现

```go
func Save(w io.Writer, data []byte) error {
	_, err := w.Write(data)
	if err != nil {
		return err
	}
	return nil
}
```

```go
func TestSave(t *testing.T) {
	b := make([]byte, 0, 128)
	buf := bytes.NewBuffer(b)

	data := []byte("hello world")
	err := Save(buf, data)
	if err != nil {
		t.Errorf("want nil, actual %s", err.Error())
	}

	saved := buf.Bytes()
	if !reflect.DeepEqual(saved, data) {
		t.Errorf("want %s, actual %s", string(data), string(saved))
	}
}
```

# 模式

## 基本模式

> 接受`接口类型参数`的`函数`或者`方法`

```go
type YourInterfaceType interface {
	M1()
	M2()
}
```

![image-20231122234344323](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231122234344323.png)

## 创建模式

> 接受接口，返回结构体 - `accept interfaces, return structs`

> `NewXXX` - 大多数包含`接口类型字段`的结构体的实例化，都可以使用创建模式实现

### Case 1

```go sync/cond.go
type Cond struct {
	noCopy noCopy

	// L is held while observing or changing the condition
	L Locker

	notify  notifyList
	checker copyChecker
}

func NewCond(l Locker) *Cond {
	return &Cond{L: l}
}
```

```go sync/mutex.go
type Locker interface {
	Lock()
	Unlock()
}
```

### Case 2

```go log/log.go
type Logger struct {
	mu     sync.Mutex // ensures atomic writes; protects the following fields
	prefix string     // prefix on each line to identify the logger (but see Lmsgprefix)
	flag   int        // properties
	out    io.Writer  // destination for output
	buf    []byte     // for accumulating text to write
}

// 接受 io.Writer，返回 *Logger
func New(out io.Writer, prefix string, flag int) *Logger {
	return &Logger{out: out, prefix: prefix, flag: flag}
}
```

```go io/io.go
type Writer interface {
	Write(p []byte) (n int, err error)
}
```

## 包装器模式

> `返回值类型`与`参数类型`相同

```go
func YourWrapperFunc(param YourInterfaceType) YourInterfaceType
```

> 实现对输入参数的类型的包装
> 在`不改变`被包装类型的`定义`的情况下，返回具备`新功能`特性、实现`相同接口`类型的新类型

```go io/io.go
func LimitReader(r Reader, n int64) Reader { return &LimitedReader{r, n} }

type LimitedReader struct {
	R Reader // underlying reader
	N int64  // max bytes remaining
}

func (l *LimitedReader) Read(p []byte) (n int, err error) {
	if l.N <= 0 {
		return 0, EOF
	}
	if int64(len(p)) > l.N {
		p = p[0:l.N]
	}
	n, err = l.R.Read(p)
	l.N -= int64(n)
	return
}
```

```go
func main() {
	r := strings.NewReader("hello, go!")
	lr := io.LimitReader(r, 1<<2)
	_, err := io.Copy(os.Stdout, lr)
	if err != nil {
		log.Fatal(err) // hell
	}
}
```

> 支持`链式`调用

```go
type CapitalizedReader struct {
	r io.Reader
}

func (cr *CapitalizedReader) Read(p []byte) (int, error) {
	n, err := cr.r.Read(p)
	if err != nil {
		return 0, err
	}

	for i, v := range bytes.ToUpper(p) {
		p[i] = v
	}
	return n, err
}

func CapReader(r io.Reader) io.Reader {
	return &CapitalizedReader{r: r}
}

func main() {
	r := strings.NewReader("hello, go!")
	cr := CapReader(io.LimitReader(r, 1<<2))
	_, err := io.Copy(os.Stdout, cr)
	if err != nil {
		log.Fatal(err) // HELL
	}
}
```

## 适配器模式

> 核心为`适配器函数类型`（Adaptor Function Type），它是一个`工具类型`

> 将一个满足特定`函数签名`的`普通函数`，显式转换成自身类型的`实例`，转换后的实例同时也是某个`接口类型`的`实现者`

```go
// greetings 的类型为 func(http.ResponseWriter, *http.Request)
func greetings(w http.ResponseWriter, r *http.Request) {
	_, _ = fmt.Fprintf(w, "Hello World!")
}

// HandlerFunc 是一个类型
// HandlerFunc 的底层类型与 greetings 的类型一致，因此可以进行强制转换
// 而且 HandlerFunc 实现了 Handler 接口
func main() {
	_ = http.ListenAndServe(":8080", http.HandlerFunc(greetings))
}
```

```go net/http/server.go
type HandlerFunc func(ResponseWriter, *Request)

func (f HandlerFunc) ServeHTTP(w ResponseWriter, r *Request) {
	f(w, r)
}
```

```go net/http/server.go
func ListenAndServe(addr string, handler Handler) error {
	server := &Server{Addr: addr, Handler: handler}
	return server.ListenAndServe()
}

type Handler interface {
	ServeHTTP(ResponseWriter, *Request)
}
```

> 适配器函数类型（http.HandlerFunc）将一个`普通函数`转型为`实现`了 http.Handler 接口的类型的`实例`

## 中间件模式

> 在 Go Web 中，中间件常指实现了 `http.Handler` 接口的 `http.HandlerFunc` 类型`实例`

> 中间件模式结合了`包装器模式`和`适配器模式`

```go
func validateAuth(s string) error {
	if s != "12345" {
		return fmt.Errorf("%s", "bad auth token")
	}
	return nil
}

func greetings(w http.ResponseWriter, r *http.Request) {
	_, _ = fmt.Fprintf(w, "Hello World!")
}

func logHandler(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t := time.Now()
		log.Printf("[%s] %q %v\n", r.Method, r.URL.String(), t)

		h.ServeHTTP(w, r)
	})
}

func authHandler(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		err := validateAuth(r.Header.Get("auth"))
		if err != nil {
			http.Error(w, "bad auth param", http.StatusUnauthorized)
			return
		}

		h.ServeHTTP(w, r)
	})
}

func main() {
	_ = http.ListenAndServe(":7777", logHandler(authHandler(http.HandlerFunc(greetings))))
}
```

> 所谓中间件，本质为一个`包装函数`，最里面利用了`适配器函数类型`（http.HandlerFunc）

```
$ curl 127.1:7777
bad auth param

$ curl -H 'auth:12345' 127.1:7777
Hello World!
```

# 空接口

> 尽量避免使用`空接口`作为`函数参数类型`

1. 空接口`不提供任何信息`
2. 虽然 Go `无需显式 implement 接口`，但必须`声明接口`
   - 可以让种类繁多的类型与接口匹配，包括无法编辑的`库代码`
   - 兼顾`安全性`和`灵活性`，而`安全性`由 Go `编译器`来保证（需要`接口类型的定义`）

```go io/io.go
type Reader interface {
	Read(p []byte) (n int, err error)
}
```

1. Go 编译器通过`解析接口定义`，得到接口的`名字`以及`方法集合`
   - 在为该接口类型参数`赋值`时，编译器会根据这些信息对`实参`进行`检查`
2. 如果`函数`或者`方法`的参数类型为空接口（`interface{}`）
   - 此时并没有为`编译器`提供关于传入`实参`数据的任何信息
   - 从而失去`静态类型语言类型安全检查`的`保护屏障` - 可能会到`运行时`才能发现错误
3. 因此，尽量`抽象`出带有一定行为契约的接口，并将其作为函数或者方法的参数类型
4. 使用空接口作为函数或者方法的参数类型的场景
   - 面对`未知类型`的数据，借用了具有『泛型能力』的 `interface{}`
   - Go 泛型落地后，`interface{}` 可以被慢慢替代，正如 Java 中很少直接使用 Object 一样

