---
title: Go - switch
mathjax: false
date: 2023-01-04 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-switch.webp
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 语法

```go
switch initStmt; expr {
  case expr1:
  	// 分支 1
  case expr2_1, expr2_2:
  	// 分支 2
  case exprN:
  	// 分支 N
  default:
  	// 默认分支
}
```

<!-- more -->

# 顺序

> 按照定义顺序（从上到下，从左到右），`先到先得`，匹配后中断

```go
package main

func case1() int {
	println("eval case1")
	return 1
}

func case2_1() int {
	println("eval case2_1")
	return 0
}

func case2_2() int {
	println("eval case2_2")
	return 2
}

func case3() int {
	println("eval case3")
	return 3
}

func switchexpr() int {
	println("eval switchexpr")
	return 2
}

func main() {
	switch switchexpr() {
	case case1():
		println("exec case1")
	default: // 无论出现在什么位置，都只会在所有 case 都不匹配的时候执行
		println("exec default")
	case case2_2(), case2_1():
		println("exec case2")
	case case3():
		println("exec case3")
	}
}

// Output:
//	eval switchexpr
//	eval case1
//	eval case2_2
//	exec case2
```

> 将`匹配成功率高`的 case 排在`前面`（上/左），有助于提升 switch 语句的`执行效率`

# 创新

> C

1. switch 语句对`表达式类型`有限制，只能是 `int` 或者`枚举`类型
2. 每个 `case` 语句只可以有`一个表达式`
3. 除非显式使用 `break` 跳出，程序默认总是执行`下一个` case 语句

## 类型

> 只要类型支持`比较`操作，都可以作为 switch 语句中的表达式类型

```go
package main

type person struct {
	name string
	age  int
}

func main() {
	p := person{name: "John", age: 20}
	switch p {
	case person{name: "John", age: 20}:
		println("John 20") // John 20
	case person{name: "John", age: 30}:
		println("John 30")
	case person{name: "John", age: 40}:
		println("John 40")
	default:
		println("No match")
	}
}
```

> 当 switch 表达式的类型为`布尔类型`时，且求值结果`始终`为 `true` 时，可以`省略` switch 后面的表达式

```go
switch a, b, c := 1, 2, 3; true {
case true:
  println("true", a) // true 1
case false:
  println("false", b)
default:
  println("default", c)
}
```

```go
switch a, b, c := 1, 2, 3; { // 省略
case true:
  println("true", a) // true 1
case false:
  println("false", b)
default:
  println("default", c)
}
```

```go
switch { // 省略 initStmt
case true:
  println("true") // true
case false:
  println("false")
default:
  println("default")
}
```

## 临时变量

> 与 if 和 for 一样，switch 支持 initStmt 来`声明`只在这个 switch 隐式代码块中使用的变量

```go
switch a, b, c := 1, 2, 3; a + b + c {
case 6:
  fmt.Printf("%d+%d+%d = %d\n", a, b, c, a+b+c) // 1+2+3 = 6
default:
  println("default")
}
```

## 表达式列表

> case 语句支持表达式列表

```c
void check_work_day(int a) {
    switch (a) { // switch 支持 int 类型
        case 1: // 没有显式 break，继续执行下一个 case
        case 2:
        case 3:
        case 4:
        case 5:
            printf("Work day\n");
            break;
        case 6:
        case 7:
            printf("Weekend\n");
            break;
        default:
            printf("Invalid day\n");
    }
}
```

```go
func check_work_day(a int) {
	switch a {
	case 1, 2, 3, 4, 5:
		fmt.Println("work day")
	case 6, 7:
		fmt.Println("weekend")
	default:
		fmt.Println("invalid day")
	}
}
```

## fallthrough

> 取消默认执行下一个 case 的代码逻辑的语义，除非显式使用 `fallthrough`

```go
package main

func case1() int {
	println("eval case1")
	return 1
}

func case2() int {
	println("eval case2")
	return 2
}

func switchexpr() int {
	println("eval switchexpr")
	return 1
}

func main() {
	switch switchexpr() {
	case case1():
		println("exec case1")
		fallthrough
	case case2(): // case2() is not evaluated
		println("exec case2")
		fallthrough
	default:
		println("exec default")
		// fallthrough // cannot fallthrough final case in switch
	}
}

// Output:
//	eval switchexpr
//	eval case1
//	exec case1
//	exec case2
//	exec default

```

> fallthrough 会`跳过`下一个 case 表达式的`求值`，而是`直接进入`对应分支

# type switch

> switch 语句支持求值结果为`类型信息`的表达式

```go
var x interface{} = 13

switch x.(type) { // x 的静态类型为 interface{}，动态类型为 int
case nil: // 具体的类型信息
  println("nil")
case int:
  println("int") // int
case float64:
  println("float64")
case string:
  println("string")
case bool:
  println("bool")
default:
  println("unknown")
}
```

> `x.(type)` 为 switch 语句`专有`的，其中 `x` 必须为`接口类型变量`，求值结果为对应的`动态类型`

```go
switch v := x.(type) { // v 为动态类型对应的值信息
case nil, int, float64, string, bool:
  fmt.Printf("%T, %v\n", v, v) // int, 13
default:
  fmt.Printf("%v\n", v)
}
```

> Go 中`所有类型`都实现了 `interface{}` 类型

> `接口类型变量`才能使用 `type switch`，并且所有 case 语句中的类型必须`实现` switch 关键字后面变量的接口类型

```go
package main

type Human interface {
	Run()
}

type Man struct {
}

func (m Man) Run() {
}

func main() {
	var man Man
	var human Human = man

	switch human.(type) {
	case Man: // ok
		println("man")
	// case int: // impossible type switch case: human (type Human) cannot have dynamic type int (missing Run method)
		// println("int")
	default:
		println("default")
	}
}
```

# break

> 不带 `label` 的 break 中断执行并跳出的，是同一函数内 break 语句所在的`最内层`的 `for`、`switch`、`select`

```go
package main

func main() {
	sl := []int{5, 19, 6, 3, 8, 12}
	firstEven := -1

	for _, v := range sl {
		switch v % 2 {
		case 0:
			firstEven = v
			break // break out of the switch statement
		case 1:
			// do nothing
		}
	}

	println(firstEven) // 12
}
```

> label

```go
package main

func main() {
	sl := []int{5, 19, 6, 3, 8, 12}
	firstEven := -1

loop:
	for _, v := range sl {
		switch v % 2 {
		case 0:
			firstEven = v
			break loop
		case 1:
			// do nothing
		}
	}

	println(firstEven) // 6
}
```

