---
title: Go -- 字符串
mathjax: false
date: 2019-06-13 08:57:33
categories:
    - Go
tags:
    - Go
---

## string
1. string是数据类型，**不是引用或指针类型**
2. string是**只读的byte slice**，len()返回它所包含的**byte数**（并不等同于**字符数**）
3. string的byte数组可以存放**任何数据**

```go
func TestStringBasic(t *testing.T) {
    var s string
    t.Log(s) // 初始化为默认零值“”

    s = "hello"
    t.Log(len(s)) // 5

    // string是不可变的byte slice
    // s[1] = '3' // cannot assign to s[1]

    // 可以存储任何二进制数据
    s = "\xE4\xB8\xAD"
    t.Log(s) // 中
}
```

<!-- more -->

## 编码与存储
Unicode是一种**字符集**（code point，字符编码），UTF-8是Unicode的**存储实现**（转换为**字节序列**的规则）
```go
func TestStringEncode(t *testing.T) {
    s := "中"
	t.Log(len(s)) // 3，byte数

	// rune：取出string中的Unicode
	c := []rune(s)
	t.Log(len(c))                    // 1
	t.Log(unsafe.Sizeof(c[0]))       // 4
	t.Logf("%s Unicode %X", s, c[0]) // 中 Unicode 4E2D
	t.Logf("%s UTF-8 %X", s, s)      // 中 UTF-8 E4B8AD
}

func TestStringToRune(t *testing.T) {
    s := "中山市"
    // range遍历，迭代输出的是rune，而不是byte
    for _, c := range s {
    	// [1]表示都格式化第1个参数
    	t.Logf("%[1]c %[1]X", c)
    	// 中 4E2D
    	// 山 5C71
    	// 市 5E02
    }
}
```

| 字符 | "中" |
| ---- | ---- |
| Unicode | 0x4E2D |
| UTF-8 | 0xE4B8AD |
| string/[]byte | [0xE4,0xB8,0xAD] |

## 字符串函数
常用的字符串函数包：strings和strconv
```go
import (
    "strconv"
    "strings"
    "testing"
)

func TestStrings(t *testing.T) {
    s := "A,B,C"
    // 分割
    parts := strings.Split(s, ",")
    for _, part := range parts {
    	t.Log(part)
    }
    // 连接
    t.Log(strings.Join(parts, "-")) // A-B-C
}

func TestStringConvert(t *testing.T) {
    s := strconv.Itoa(10)
    t.Log("str" + s) // str10，Go不支持隐式转换，证明10是字符串
    if i, err := strconv.Atoi("10"); err == nil {
    	t.Log(10 + i) // 20
    }
}
```
