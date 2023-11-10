---
title: Go - if
mathjax: false
date: 2023-01-02 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/golang-if-else.png
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 概述

> if 语句是 Go 语言中提供的一种`分支控制`结构，根据`布尔表达式`的值，在两个分支中选择一个执行

```go
if boolean_expression {
	// 新分支
}

// 原分支
```

<!-- more -->

> 二分支结构

```go
if boolean_expression {
	// 分支 1
} else {
	// 分支 2
}
```

> 多分支结构

```go
if boolean_expression1 {
	// 分支 1
} else if boolean_expression2 {
	// 分支 2
} else if boolean_expression3 {
	// 分支 3
} else {
	// 分支 4
}
```

```go
if boolean_expression1 {
	// 分支 1
} else {
  if boolean_expression2 {
  	// 分支 2
  } else {
    if boolean_expression3 {
      // 分支 3
    } else {
      // 分支 4
    }
  }
}
```

# 特点

1. 与 `Go 函数`一样，if 语句的分支代码的`左大括号`与 if 关键字在`同一行` - Go 代码风格的统一要求
2. if 语句的布尔表达式整体`不需要用括号包括`
3. if 关键字后面的条件判断表达式的`求值结果`必须是`布尔类型`（true or false）

```go
if runtime.GOOS == "darwin" {
  println("Hello macOS!")
}
```

> 如果判断的条件比较多，可以用多个`逻辑操作符`连接多个`条件判断表达式`

```go
if runtime.GOOS == "darwin" || runtime.GOOS == "linux" {
  println("Hello, Unix!")
}
```

# 自用变量

> 自用变量为在 if 后的`布尔表达式之前`声明的变量，只能在 if 语句的`代码块`范围内使用

> a、b、c 位于各级 if 的`隐式代码块`中
> `作用域`始于其`声明`所在的代码块，并一直`扩展`至嵌入到这个代码块的`所有内层代码块`中

```go
func f() int {
	return 1
}

func h() int {
	return 2
}

func main() {
	if a, c := f(), h(); a > 0 {
		println(a)
	} else if b := f(); b > 0 {
		println(a, b)
	} else {
		println(a, b, c)
	}
}
```

> 容易导致`变量遮蔽`

```go
x := 1
if x := 2; true {
  println(x) // 2
}
println(x) // 1
```

# 最佳实践

> 快乐路径 - `Happy Path`

1. 仅使用`单分支`控制结构
2. 当出现`错误`时，在单分支中`快速返回`
3. `正常逻辑`的代码，布局上始终`靠左`
4. 函数执行到`最后一行`代表`成功`









