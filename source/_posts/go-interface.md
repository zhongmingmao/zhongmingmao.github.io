---
title: Go -- 接口
mathjax: false
date: 2019-06-17 21:10:05
categories:
    - Go
tags:
    - Go
---

## Duck Type式接口
```go
type Programmer interface {
    writeHelloWorld() string
}

// 不需要关键字：implements
type GoProgrammer struct {
}

// Duck Type式接口，与Programmer里面的方法签名完全一致
func (p *GoProgrammer) writeHelloWorld() string {
    return "fmt.Println(\"Hello World\")"
}

func TestInterface(t *testing.T) {
    var p Programmer
    p = new(GoProgrammer)
    t.Log(p.writeHelloWorld()) // fmt.Println("Hello World")
}
```

<!-- more -->

1. _**接口为非侵入性，实现不依赖于接口定义**_
2. 接口的定义可以包含在接口使用者包内
    - 即GoProgrammer在一个单独的包，使用的时候再定义接口Programmer，也是没问题的，因为是**Duck Type**

## 接口变量
```go
func TestInterfaceVar(t *testing.T) {
    var programmer Programmer = &GoProgrammer{}
    t.Logf("%T", programmer) // *interface_test.GoProgrammer
}
```

<img src="https://go-1253868755.cos.ap-guangzhou.myqcloud.com/go-interface-var.png" width=800/>

## 自定义类型
```go
// 自定义类型（别名）
type IntConvert func(op int) int

func timeSpent(inner IntConvert) IntConvert {
    return func(op int) int {
    	start := time.Now()
    	ret := inner(op)
    	fmt.Println("time spent : ", time.Since(start).Seconds())
    	return ret
    }
}

func slowFunc(op int) int {
    time.Sleep(time.Second * 1)
    return op
}

func TestFuncAsParam(t *testing.T) {
    f := timeSpent(slowFunc)
    t.Log(f(10))
}
```
