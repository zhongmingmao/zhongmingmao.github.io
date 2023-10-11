---
title: Go - Block + Scope
mathjax: false
date: 2022-12-23 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/goscope.webp
categories:
  - Go
tags:
  - Go
  - Cloud Native
---

# Variable Shadowing

```go
package main

import "fmt"

var a = 11

func foo(n int) {
  // 局部变量遮蔽了同名的包级变量
	a := 1
	a += n
}

func main() {
	fmt.Println(a) // 11
	foo(5)
	fmt.Println(a) // 11
}
```

<!-- more -->

# Block

## Explicit Block

> 大括号包裹

```go
func foo() { // Block 1
	{ // Block 2
		{ // Block 3
			{ // Block 4
			}
		}
	}
}
```

1. Explicit Block 是包裹在`大括号`内部的声明和语句序列
2. 如果一对大括号内没有任何声明和其它语句，为`空 Block`
3. Block 支持`嵌套`

## Implicit Block

> 无法通过大括号识别

![image-20231011220321917](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231011220321917.png)

| Implicit Block                           | Desc                                                         |
| ---------------------------------------- | ------------------------------------------------------------ |
| Universe Block                           | `所有的 Go 源码`都在这个隐式代码块中                         |
| Package Block                            | 每个 `Go 包`都对应一个隐式包代码块<br />这个包代码块包含了该包中所有的 Go 源码（分散在多个源文件中） |
| File Block                               | 每个 `Go 源文件`都对应着一个文件代码块<br />如果 Go 包有多个源文件，就会对应多个文件代码块 |
| Control statement（if / for / switch）   | 每个控制语句都在自己的隐式代码块中<br />`控制语句的隐式代码块在其显式代码块的外面` |
| switch 或者 select 的 case/default 子s句 | 每个子句都是一个隐式代码块                                   |

# Scope

1. `作用域`是针对`标识符`的，不局限于`变量`
2. 每个`标识符`都有`作用域`
   - 即一个标识符在被`声明后`可以`被有效使用`的`源码区域`
3. 作用域是一个`编译期`的概念
   - 编译器在编译过程中会对每个标识符的作用域进行检查
   - 如果在标识符作用域外使用该标识符，编译报错
4. 可以使用`代码块`的概念来划定`标识符`的`作用域`
   - 原则：声明在外层代码块中的标识符，其作用域包括`所有内层代码块`
   - 同时适用于`Explicit Block`和`Implicit Block`

## Universe Block

> 开发者并不能声明 Universe Block 的标识符，因为这一区域是 `Go` 用于`预定义标识符`

![image-20231011222446605](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231011222446605.png)

> `预定义标识符`并不是`关键字`，可以在`内层代码块`中声明`同名`的标识符

```go
package main

var make = 1

func main() {
	_ = make(map[string]string)
}
```

```
$ go build
# github.com/zhongmingmao/go101
./main.go:6:10: cannot call non-function make (type int), declared at ./main.go:3:5
./main.go:6:11: type map[string]string is not an expression
```

## Package Block

1. `包顶层`声明的`常量`、`变量`、`类型`、`函数（不包括方法）`对应的标识符的作用域是包代码块
2. 当 A 包导入 B 包后，A 包仅可以使用 B 包的导出标识符（Exported Identifier）
3. Exported Identifier
   - 标识符声明在包代码块中，或者是一个`字段名`或者`函数名`
   - 第一个字符是`大写的 Unicode 字符`

## File Block

> `导入的包名` 属于 File Block - 如果 A 包有两个源码文件，都依赖了 B 包的标识符，那么两个源码文件都需要导入 B 包

## Control statement

### if

```go
func main() {
	if a := 1; false {
	} else if b := 2; false {
	} else if c := 3; false {
	} else {
		println(a, b, c) // 1 2 3
	}
}
```

> 将 Implicit Block 等价转换为 Explicit Block

```go
func main() {
	{ // 等价于第1个 if 的隐式代码块
		a := 1 // 变量 a 的作用域开始于此
		if false {

		} else {
			{ // 等价于第2个 if 的隐式代码块
				b := 2 // 变量 b 的作用域开始于此
				if false {

				} else {
					{ // 等价于第3个 if 的隐式代码块
						c := 3 // 变量 c 的作用域开始于此
						if false {

						} else {
							println(a, b, c)
						}
						// 变量 c 的作用域结束于此
					}
				}
				// 变量 b 的作用域结束于此
			}
		}
		// 变量 a 的作用域结束于此
	}
}
```

> 变量是标识符的一种，因此`标识符的作用域规则`同样适用于`变量`

# 规避遮蔽

> 内层变量遮蔽外层同名变量

```go main.go
package main

import (
	"errors"
	"fmt"
)

var year = 2020

func checkYear() error {
	err := errors.New("wrong year")

	switch year, err := getYear(); year { // 遮蔽包级变量 year + 遮蔽局部变量 err
	case 2020:
		fmt.Println("it is", year, err)
	case 2021:
		fmt.Println("it is", year)
		err = nil
	}

	fmt.Println("after check, it is", year)
	return err
}

type new int // 遮蔽预定义标识符 new

func getYear() (new, error) {
	year := int16(2021)
	return new(year), nil
}

func main() {
	err := checkYear()
	if err != nil {
		fmt.Println("call checkYear error:", err)
		return
	}

	fmt.Println("call checkYear ok")
}
```

```
$ go run main.go
it is 2021
after check, it is 2020
call checkYear error: wrong year
```

> 静态检查（`辅助`检测）

1. `go vet` 可以对 Go 源码进行一系列的`静态检查`
2. `Go 1.14 之前`，默认支持`变量遮蔽检查`，在 Go 1.14 之后，需要`单独安装插件`来进行

