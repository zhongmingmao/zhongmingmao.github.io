---
title: Go -- 函数
mathjax: false
date: 2019-06-15 21:31:32
categories:
    - Go
tags:
    - Go
---

## Go函数
1. 可以有**多个返回值**
2. 所有参数都是**值传递**：slice、map、channel会有传引用的错觉
3. 一等公民
    - 函数可以作为**变量的值**
    - 函数可以作为**参数**和**返回值**

<!-- more -->

## 多返回值
```go
func returnMultiValues() (int, int) {
    return rand.Intn(10), rand.Intn(20)
}

func TestReturnMultiValues(t *testing.T) {
    a, b := returnMultiValues()
    t.Log(a, b) // 1 7
}
```

## 一等公民
函数可以作为**参数**和**返回值**
```go
// 入参：func(op int) int
// 出参：func(op int) int
func timeSpent(inner func(op int) int) func(op int) int {
    // 函数式编程
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
    // f是通过函数式编程封装后的函数，增强了原有函数的功能
    f := timeSpent(slowFunc)
    t.Log(f(10))

    // 输出：
    // time spent :  1.004157729
    // 10
}
```

## 可变参数
```go
func sum(ops ...int) int {
    ret := 0
    for _, op := range ops {
    	ret += op
    }
    return ret
}

func TestVarParam(t *testing.T) {
    t.Log(sum(1, 2, 3, 4)) // 10
}
```

## defer
延迟运行，类似于Java中的**finally**，主要用于释放某些资源
```go
func TestDefer(t *testing.T) {
    defer clear()
    fmt.Println("Start")
    panic("Fatal Error") // 依然会执行clear()
    fmt.Println("End")   // 不可达

    //	Start
    //	Clear Resources.
    //	--- FAIL: TestDefer (0.00s)
    //	panic: Fatal Error [recovered]
    //	panic: Fatal Error
}
```
