---
title: Go -- 基本程序结构
mathjax: false
date: 2019-06-12 09:21:23
categories:
    - Go
tags:
    - Go
---

## 单元测试
1. 源代码以_test结尾：xxx_test.go
2. 测试方法名以Test开头：`func TestXxx(t *testing.T) {}`，大写的方法表示**包外**可以访问

```go
// first_test.go
package try_test

import "testing"

func TestFirstTry(t *testing.T) {
    t.Log("My First try!")
}
```

<!-- more -->

## 变量 + 常量

### 变量
```go
// fib_test.go
package fib

import (
    "fmt"
    "testing"
)

// var一般用于全局变量或者外部变量
var g = 1

func TestFibList(t *testing.T) {
    g = 2

    // 第1种方式
    //var a int = 1
    //var b int = 1

    // 第2种方式，具有一定的类型推断能力
    //var a = 1
    //var b = 2

    // 第3种方式
    //var (
    //	a = 1
    //	b = 2
    //)

    // 第4种方式
    a := 1
    b := 2

    t.Log(a)
    for i := 0; i < 5; i++ {
    	t.Log(b)
    	tmp := a
    	a = b
    	b = tmp + a
    }
    fmt.Println()
}

func TestExchange(t *testing.T) {
    a := 1
    b := 2
    // 同时赋值
    a, b = b, a
    t.Log(a, b)
}
```
1. 赋值可以进行**自动类型推断**
2. 在一个赋值语句中可以对多个变量进行**同时赋值**

### 常量
```go
// constant_test.go
package constant

import "testing"

// 快速设置连续值
const (
    // const iota int = 0
    Monday = iota + 1
    Tuesday
    Wednesday
    Thursday
    Friday
    Saturday
    Sunday
)

const (
    Readable   = 1 << iota // 0001
    Writable               // 0010
    Executable             // 0100
)

func TestConstant1(t *testing.T) {
    t.Log(Monday, Tuesday) // 1,2
}

func TestConstant2(t *testing.T) {
    a := 1 // 0001
    // & 按位与
    t.Log(a&Readable == Readable, a&Writable == Writable, a&Executable == Executable) // true,false,false
}
```

## 数据类型

### 基本数据类型
1. bool
2. string
3. int int8 int16 int32 int64
4. uint uint8 uint16 uint32 uint64 uintptr
5. byte // alias for uint8
6. rune // alias for uint32, represents a Unicode code point
7. float32 float64
8. complex64 complex128

### 类型转换
1. Go语言_**不允许隐式类型转换**_
2. 别名和原有类型也不能进行隐式类型转换

```go
// 别名
type MyInt int64

func TestImplicit1(t *testing.T) {
    var a1 int = 1 // 64位机器，int占用64位
    var a2 int32 = 1
    var b int64
    b = a1 // cannot use a1 (type int) as type int64 in assignment
    b = a2 // cannot use a2 (type int32) as type int64 in assignment
}

func TestImplicit2(t *testing.T) {
    var a int32 = 1
    var b int64
    b = int64(a) // 显式类型转换
    var c MyInt
    c = b        // cannot use b (type int64) as type MyInt in assignment
    c = MyInt(b) // 显式类型转换
    t.Log(a, b, c)
}
```

### 类型的预定义值
1. math.MaxInt64
2. math.MaxFloat64
3. math.MaxUint32

### 指针类型
GO语言_**不支持指针运算**_
```go
func TestPoint(t *testing.T) {
    a := 1
    aPtr := &a
    t.Log(a, aPtr)           // 1 0xc00001a210
    t.Logf("%T %T", a, aPtr) // int *int
    aPtr = aPtr + 1          // invalid operation: aPtr + 1 (mismatched types *int and int)
}
```

### 字符串
1. 在大多数编程语言中（例如Java），字符串是**引用类型**或**指针类型**
2. 而在Go语言中，string是**值类型**，默认的初始化值为**空字符串**，而不是nil

```go
func TestString(t *testing.T) {
    var s string
    t.Log("*" + s + "*") // **
    t.Log(len(s))        // 0
    t.Log(s == "")       // true
}
```

## 运算符

### 算术运算符
A=10,B=20，Go语言没有前置的++，\-\-

| 运算符 | 描述 | 实例 |
| ---- | ---- | ---- |
| + | 相加 | A+B => 30 |
| - | 相减 | A-B => -20 |
| * | 相乘 | A*B => 200 |
| / | 相除 | A/B => 2 |
| % | 求余 | A%B => 0 |
| ++ | 自增 | A++ => 11 |
| \-\- | 自减 | A\-\- => 9 |

### 比较运算符
A=10,B=20

| 运算符 | 描述 | 实例 |
| ---- | ---- | ---- |
| == | 检查左边值是否**等于**右边值，若是返回True，否则返回False | (A == B) => False |
| != | 检查左边值是否**不等于**右边值，若是返回True，否则返回False | (A != B) => True |
| > | 检查左边值是否**大于**右边值，若是返回True，否则返回False | (A > B) => False |
| < | 检查左边值是否**小于**右边值，若是返回True，否则返回False | (A < B) => True |
| >= | 检查左边值是否**大于等于**右边值，若是返回True，否则返回False | (A >= B) => False |
| <= | 检查左边值是否**小于等于**右边值，若是返回True，否则返回False | (A <= B) => True |

#### 数组
1. 相同维数且含有相同个数元素的数组才可以比较
2. 每个元素都相同才相等

```go
func TestCompareArray(t *testing.T) {
    a := [...]int{1, 2, 3, 4}
    b := [...]int{1, 4, 2, 3}
    c := [...]int{1, 2, 3, 4, 5}
    d := [...]int{1, 2, 3, 4}
    t.Log(a == b) // false
    t.Log(a == c) // invalid operation: a == c (mismatched types [4]int and [5]int)
    t.Log(a == d) // true
}
```

### 逻辑运算符
A=true,B=false

| 运算符 | 描述 | 实例 |
| ---- | ---- | ---- |
| && | 逻辑AND运算符 | (A && B) => False |
| \|\| | 逻辑OR运算符 | (A \|\| B) => True |
| ! | 逻辑NOT运算符 | !(A && B) => True |

### 位运算符

| 运算符 | 描述 |
| ---- | ---- |
| & | 按位与运算符 |
| \| | 按位或运算符 |
| ^ | 按位异或运算符 |
| << | 左移运算符 |
| >> | 右移运算符 |

#### 按位置零&^
1. &^：右边操作数的二进制为1的位会把左边操作数的对应的二进制位**重置为0**
2. 在其他编程语言中（如Java），需要组合多个位运算符才能完成

```go
const (
    Readable   = 1 << iota // 0001
    Writable               // 0010
    Executable             // 0100
)

func TestBitClear(t *testing.T) {
    a := 7                                                                            // 0111 = Readable + Writable + Executable
    t.Log(a&Readable == Readable, a&Writable == Writable, a&Executable == Executable) // true true true
    a = a &^ Readable                                                                 // 清空Readable
    t.Log(a&Readable == Readable)                                                     // false
    a = a &^ Writable                                                                 // 清空Writable
    t.Log(a&Writable == Writable)                                                     // false
    a = a &^ Executable                                                               // 清空Executable
    t.Log(a&Executable == Executable)                                                 // false
}
```

## 循环 + 条件

### 循环
Go语言仅支持循环关键字for
```go
func TestWhileLoop(t *testing.T) {
    n := 0
    // while(n<5)
    for n < 5 {
    	t.Log(n)
    	n++
    }

    // while(true)
    for {
    	t.Log(n)
    	n++
    }
}
```

### 条件

#### if
1. condition表达式结果必须为布尔值
2. 支持**变量赋值**

```go
func TestIfMultiSec(t *testing.T) {
    if a := 1 == 1; a {
    	t.Log("1==1")
    }
}
```

#### switch
1. 条件表达式不限制为**常量**或者**整数**
2. 单个case中，可以出现**多个结果选项**，使用逗号分隔
3. 与C语言等规则相反，Go语言不需要用**break**来明确退出一个case
4. 可以不设定switch之后的条件表达式，此时整个switch结构与多个if/else的逻辑作用等同

```go
func TestSwitchMultiCase(t *testing.T) {
    for i := 0; i < 5; i++ {
    	switch i {
    	case 0, 2: // 多个结果选项
            t.Log("Even")
    	case 1, 3:
            t.Log("Odd")
    	default:
            t.Log("Not 0~3")
    	}
    }
}

func TestSwitchCondition(t *testing.T) {
    for i := 0; i < 5; i++ {
    	switch {
    	case i%2 == 0:
            t.Log("Even")
    	case i%2 == 1:
            t.Log("Odd")
    	default:
            t.Log("Unknown")
    	}
    }
}
```
