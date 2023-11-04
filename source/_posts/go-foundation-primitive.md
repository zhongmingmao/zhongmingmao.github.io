---
title: Go - Primitive Type
mathjax: false
date: 2022-12-28 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/gotype.webp
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 数值

## 整型

### 平台无关整型

> 在任何 `CPU 架构`和任何`操作系统`下面，`长度`都是`固定不变`的

![image-20231027081503695](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231027081503695.png)

<!-- more -->

> 有符号整型 vs 无符号整型

![image-20231027081745491](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231027081745491.png)

> Go 采用`补码`作为整型的比特位编码方法：`原码逐位取反后加 1`

![image-20231027082322224](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231027082322224.png)

### 平台相关整型

> `长度`会根据`运行平台`的改变而改变，在编写`移植性`要求的代码时，不要依赖下述类型的长度

![image-20231027082457132](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231027082457132.png)

```go
a, b := int(5), uint(6)
p := 0x12345678

fmt.Println(unsafe.Sizeof(a)) // 8
fmt.Println(unsafe.Sizeof(b)) // 8
fmt.Println(unsafe.Sizeof(p)) // 8
```

### 溢出

```go
var s int8 = 127
s += 1
fmt.Println(s) // -128

var u uint8 = 1
u -= 2
fmt.Println(u) // 255
```

### 字面值

```go
a := 53        // 十进制
b := 0700      // 八进制，以 0 开头
c1 := 0xaabbcc // 十六进制，以 0x 开头
c2 := 0Xddeeff // 十六进制，以 0X 开头

// Go 1.13 新增了二进制和八进制字面量
d1 := 0b100001 // 二进制，以 0b 开头
d2 := 0B100001 // 二进制，以 0B 开头

e1 := 0o700 // 八进制，以 0o 开头
e2 := 0O700 // 八进制，以 0O 开头
```

> 为了增强字面值的可读性，Go 1.13 支持数字分隔符 `_`

> 只在 go.mod 中的 go version 为 Go 1.13 后的版本才会生效，否则编译器会报错
> underscores in numeric literals requires go1.13 or later

```go
a := 5_3_7        // 十进制 537
b := 0b_1000_0111 // 二进制 10000111
c1 := 0_700       // 八进制 700
c2 := 0o_700      // 八进制 700
d1 := 0x_5c_6d    // 十六进制 5c6d
```

### 格式化

```go
var a int8 = 59

fmt.Printf("%b\n", a) // 二进制，111011
fmt.Printf("%o\n", a) // 八进制，73
fmt.Printf("%O\n", a) // 八进制，0o73
fmt.Printf("%d\n", a) // 十进制，59
fmt.Printf("%x\n", a) // 十六进制，3b
fmt.Printf("%X\n", a) // 十六进制，3B
```

## 浮点型

### 二进制

1. `IEEE 754` 是 IEEE 制定的二进制浮点数算术标准，是`最广泛使用`的浮点数运算标准，被许多 CPU 和浮点数运算器采用
2. IEEE 754 标准规定了四种表示浮点数值的方式
   - `单精度（32 bit）`、`双精度（64 bit）`、扩展单精度（43  bit 以上）、扩展双精度（79 bit 以上）
3. Go 提供了 `float32` 和 `float64` 两种浮点类型，分别对应 `IEEE 754` 的`单精度`和`双精度`
4. Go 没有提供 float 类型，Go 提供的浮点数类型都是`平台无关`的
5. `float32` 和 `float64` 的`默认值`都是 `0.0`，但占用的`内存大小`是不一样的，可以表示的浮点数的`范围`和`精度`也是不一样的
   - 日常开发中，使用 `float64` 的情况更多，也是 Go `浮点常量`或者`字面量`的`默认类型`

```go
func main() {
	a := float32(139.8125)
	bits := math.Float32bits(a)
	fmt.Printf("%b\n", bits) // 1000011000010111101000000000000
}
```

> float32 可能会因为`精度不足`，导致输出结果与预期不符合

```go
func main() {
	f1 := float32(16777216.0)
	f2 := float32(16777217.0)

	fmt.Println(f1 == f2) // true
}
```

### 字面值

> 十进制

```go
func main() {
	a := 3.1415
	b := .15 // 省略整数部分
	c := 81.80
	d := 82. // 省略小数部分

	fmt.Println(a, b, c, d) // 3.1415 0.15 81.8 82
}
```

>  科学计数法（十进制，`e/E` 代表幂运算的`底数`为 `10`）

```go
func main() {
	a := 6674.28e-2
	b := .12345e+5
	fmt.Println(a) // 66.742800      = 6674.28 * 10^(-2)
	fmt.Println(b) // 12345.000000   = 0.12345 * 10^5
}
```

>  科学计数法（十六进制，`p/P` 代表幂运算的`底数`为 `2`）
> `整数和小数部分`均采用`十六进制`，而`指数部分`依然采用`十进制`

```go
func main() {
	a := 0x2.p10
	b := 0x1.Fp+0
	fmt.Println(a) // 2048.000000	= 2.0 * 2^10
	fmt.Println(b) // 1.937500		= 1.9375 * 2^0
}
```

### 格式化

> `%f` 输出浮点数最直观的`原值`形式

```go
func main() {
	a := 123.45678
	fmt.Printf("%f\n", a) // 123.456780
}
```

> 输出为科学计数法（`%e` 对应`十进制`的科学计数法，`%x` 对应`十六进制`的科学计数法）

```go
func main() {
	a := 123.45678
	fmt.Printf("%e\n", a) // 1.234568e+02
	fmt.Printf("%x\n", a) // 0x1.edd3be22e5de1p+06
}
```

## 复数类型

> Go 原生支持复数类型，主要用于专业领域，如矢量计算

1. Go 提供 complex64 和 complex128 两种复数类型
   - `complex64` 的实部和虚部都是 `float32` 类型
   - `complex128` 的实部和虚部都是 `float64` 类型
2. 默认的复数类型为 complex128

> 通过`复数字面量`直接初始化一个复数类型变量

```go
func main() {
	a := 5 + 6i
	b := 0o123 + .12345e+5i

	fmt.Println(a) // (5+6i)
	fmt.Println(b) // (83+12345i)
}
```

> 通过 `complex` 函数，创建 `complex128` 类型变量

```go
func main() {
	a := complex(5, 6)
	b := complex(0o123, .12345e+5)

	fmt.Println(a) // (5+6i)
	fmt.Println(b) // (83+12345i)
}
```

> 通过 `real` 函数和 `imag` 函数，获取复数的实部和虚部，返回一个浮点类型

```go
func main() {
	a := complex(5, 6)
	r := real(a)
	l := imag(a)

	fmt.Println(r) // 5.000000
	fmt.Println(l) // 6.000000
}
```

> 由于复数类型的实部和虚部都是`浮点数`，因此可以直接采用浮点型的格式化输出方式

```go
func main() {
	c := complex(5, 6)
	r := real(c)
	l := imag(c)

	fmt.Printf("%T\n", c) // complex128
	fmt.Printf("%T\n", r) // float64
	fmt.Printf("%T\n", l) // float64

	fmt.Printf("%f\n", c) // (5.000000+6.000000i)
	fmt.Printf("%e\n", c) // (5.000000e+00+6.000000e+00i)
	fmt.Printf("%x\n", c) // (0x1.4p+02+0x1.8p+02i)
}
```

## 自定义

### 类型定义

> 通过 `type` 关键字基于`原生数值类型`来声明一个`新类型`

```go
type MyInt int32
```

1. MyInt 类型的`底层类型`是 int32，其`数值性质`与 int32 `完全相同`，但是`完全不同的类型`
2. 基于 Go 的`类型安全`规则，`无法`让 MyInt 和 int32 `相互赋值`，否则编译器会报错

```go
func main() {
	var m int = 5
	var n int32 = 6
	var a MyInt = m // cannot use m (variable of type int) as MyInt value in variable declaration
	var b MyInt = n // cannot use n (variable of type int32) as MyInt value in variable declaration
}
```

> 可通过`显式转型`来避免

```go
func main() {
	var m int = 5
	var n int32 = 6
	var a MyInt = MyInt(m) // ok
	var b MyInt = MyInt(n) // ok
}
```

### 类型别名

> 通过类型别名（`Type Alias`）语法来定义的新类型`与原类型完全一样`，可以`相互替代`（不需要显式转换）

```go
type MyInt = int32

func main() {
	var n int32 = 6
	var _ MyInt = n // ok
}
```

# 字符串

## 原生支持

> C 语言没有提供对字符串类型的原生支持，字符串需要通过`字符串字面值`或者以`\0`结尾的`字符类型数组`来呈现

```c
#include <stdio.h>

#define GO_SLOGAN "less is more"
const char *s1 = "hello, gopher";
char s2[] = "hello, go";

int main() {
    printf("%s\n", GO_SLOGAN);
    printf("%s\n", s1);
    printf("%s\n", s2);
    return 0;
}
```

1. 不是原生类型，`编译器`不会对它进行`类型校验`，导致`类型安全性差`
2. 字符串操作时需要时刻考虑结尾的 `\0`，防止`缓存区溢出`
3. 以`字符数组`形式定义的字符串，值是`可变`的，在并发场景中需要考虑`同步`问题
4. 获取一个字符串的`长度`，通常为 `O(n)` 的时间复杂度
5. C 语言没有内置对`非 ASCII 字符集` 的支持

> 在 Go 中，字符串类型为 `string`：字符串`常量`、字符串`变量`、字符串`字面值`

```go
package main

import "fmt"

const (
	GO_SLOGAN = "less is more"
	s1        = "hello, gopher"
)

var (
	s2 = "hello, go"
)

func main() {
	fmt.Println(GO_SLOGAN)
	fmt.Println(s1)
	fmt.Println(s2)
}
```

## 优势

> string 类型的数据是`不可变`的，与 Java 类似，提高了`并发安全性`和`存储利用率`

1. string 类型的`值`在它的`生命周期`内是`不可变`的，但 string 变量是可以`再次赋值`的
   - 开发者不用再担心字符串的`并发安全`问题，字符串可以被多个 goroutine 共享
2. 由于字符串的不可变性，针对`同一个字符串值`，Go 的`编译器`都只需要为其分配`同一块存储`

```go
func main() {
	s := "hello world"
	// s[0] = 'k' // cannot assign to s[0] (neither addressable nor a map index expression)
	s = "hello go"
	fmt.Println(s) // hello go
}
```

> 没有结尾 `\0`，获取字符串长度的时间复杂度为`0(1)`

1. 在 C 语言中，通过标准库的 `strlen` 函数获取一个字符串的长度
   - 实现原理：`遍历`字符串中的每个字符并计数，直到遇到 `\0`，时间复杂度为 `O(N)`
2. Go 中没有 `\0`，获取字符串长度的时间复杂度为 `O(1)`

```c
#include <stdio.h>
#include <string.h>

const char *s1 = "hello, gopher";

int main() {
    printf("%lu\n", strlen(s1));
    return 0;
}
```

> 通过`反引号`实现所见即所得（`Raw String`），降低构造`多行字符串`的心智负担

```go
func main() {
	s := `a\\t
	\\nb`
	fmt.Println(s)
}
```

> 支持非 ASCII 字符

1. Go 源文件默认采用 `Unicode 字符集`
2. Go 字符串中的每个字符都是一个 Unicode 字符，并且以 `UTF-8` 编码格式存储在内存当中

## 内部组成

### 字节视角

> `字符串值`是一个`可空`的`字节序列`，字节序列中的`字节个数`称为该`字符串的长度`

```go
func main() {
	s := "中国人"
	fmt.Println(len(s)) // 9

	for i := 0; i < len(s); i++ {
		fmt.Printf("0x%x ", s[i]) // 0xe4 0xb8 0xad 0xe5 0x9b 0xbd 0xe4 0xba 0xba
	}
	fmt.Println()
}
```

### 字符视角

> 字符串是由一个`可空`的`字符序列`构成的

```go
func main() {
	s := "中国人"
	fmt.Println(utf8.RuneCountInString(s)) // 3

	for _, c := range s {
		fmt.Printf("0x%x ", c) // 0x4e2d 0x56fd 0x4eba
	}
	fmt.Println()
}
```

1. Go 采用 `Unicode 字符集`，每个字符都是一个 `Unicode 字符`
2. `Unicode 码点`：在 Unicode 字符集中的每个字符，都被分配了统一且唯一的`字符编号`
   - 一个 Unicode 码点唯一对应一个字符

## rune

>  `rune` 表示一个 `Unicode 码点`，本质上是 `int32` 类型的类型别名（`Type alias`），与 int32 `完全等价`

```go
// rune is an alias for int32 and is equivalent to int32 in all ways. It is
// used, by convention, to distinguish character values from integer values.
type rune = int32
```

1. 一个 `rune 实例`就是一个 `Unicode 字符`；一个 `Go 字符串`也可被视为 `rune 实例的集合`
2. 可以通过`字符字面值`来初始化一个 `rune 变量`

> 字符字面值 - 单引号

```go
func main() {
	r1 := 'a'  // ASCII 字符
	r2 := '中'  // Unicode 字符
	r3 := '\n' // 换行字符
	r4 := '\'' // 单引号字符

	fmt.Printf("%T, %T, %T, %T\n", r1, r2, r3, r4)         // int32, int32, int32, int32
	fmt.Printf("0x%x, 0x%x, 0x%x, 0x%x\n", r1, r2, r3, r4) // 0x61, 0x4e2d, 0xa, 0x27
}
```

> 字符字面量 - 使用 Unicode 专用的转义字符 `\u` 或者 `\U` 作为前缀，来表示一个 Unicode 字符

> `\u` 后接 `2` 个十六进制数，`\U` 后接 `4` 个十六进制数

```go
func main() {
	r1 := '\u4e2d'
	r2 := '\U00004e2d'

	fmt.Printf("%c \n", r1) // 中
	fmt.Printf("%c \n", r2) // 中
}
```

> rune 本质上是一个`整型数`，可以用`整型值`来直接作为`字符字面值`给 rune 变量赋值

```go
func main() {
	r1 := '\x27' // 16进制
	r2 := '\047' // 8进制

	fmt.Printf("%c \n", r1) // '
	fmt.Printf("%c \n", r2) // '
}
```

## 字面值

```go
func main() {
	fmt.Println("abc\n")
	fmt.Println("中国人")
	fmt.Println("\u4e2d\u56fd\u4eba")                   // 中国人
	fmt.Println("\U00004e2d\U000056fd\U00004eba")       // 中国人
	fmt.Println("中\U000056fd\u4eba")                    // 中国人
	fmt.Println("\xe4\xb8\xad\xe5\x9b\xbd\xe4\xba\xba") // 中国人
}
```

## UTF-8

> UTF-8 编码解决的是 Unicode 码点值在计算机如何`存储`和`表示`的问题

1. `UTF-32` 编码：`固定`使用 `4 Bytes` 表示每个 Unicode 码点，编解码比较简单
2. 缺点
   - 使用 4 Bytes `存储`和`传输`一个整型数的时候，需要考虑不同平台的`字节序`问题（大端、小端）
   - 与采用 `1 Bytes` 编码的 `ASCII` 字符集`无法兼容`
   - 所有 Unicode 码点都是用 4 Bytes 编码，`空间利用率很差`
3. Go 之父 Rob Pike 发明了 UTF-8 编码方案
   - UTF-8 使用`变长度字节`，对 Unicode 字符的码点进行编码
   - 编码采用的`字节数量`与 Unicode 字符对应的`码点大小`有关
     - 码点`小`的字符使用的字节数量`少`，码点`大`的字符使用字节数量`多`
   - UTF -8 编码使用 `1 ~ 4 Bytes`
     - 前 `128` 个与 ASCII 字符重合的码点（`U+0000 ~ U+007F`）使用 `1 Byets` 表示
     - 带变音符号的拉丁文、希腊文、阿拉伯文等使用 `2 Bytes` 表示
     - `东亚文字`使用 `3 Bytes` 表示
     - 极少使用的语言字符使用 `4 Bytes` 表示
4. UTF-8 优势
   - `兼容` ASCII 字符的内存表示，无需任何改变
   - UTF-8 的`编码单元`为 `1 Bytes`（即`一次编解码一个 Bytes`），因此无需像 UTF-32 那样需要考虑`字节序`问题
   - 相对于 UTF-32，UTF-8 的`空间利用率`也很高
5. UTF-8 编码方案已经成为 `Unicode 字符编码方案`的`事实标准`

```go
// rune -> []byte
func encodeRune() {
	var r rune = 0x4E2D
	fmt.Printf("%c\n", r) // 中

	buffer := make([]byte, 3)
	written := utf8.EncodeRune(buffer, r)
	fmt.Println(written)         // 3
	fmt.Printf("0x%X\n", buffer) // 0xE4B8AD
}
```

```go
// []byte -> rune
func decodeRune() {
	var buffer = []byte{0xE4, 0xB8, 0xAD, 0xE4, 0xB8, 0xAD}
	// DecodeRune unpacks the first UTF-8 encoding in buffer and returns the rune and its width in bytes.
	r, width := utf8.DecodeRune(buffer)
	fmt.Printf("%c %d\n", r, width) // 中 3
}
```

## 内部表示

> string 类型是一个描述符，本身并`不真正存储字符串数据`，而仅是由一个`指向底层存储的指针`和`字符串的长度字段`组成
> 由于有 Len 字段，因此获取字符串长度的时间复杂度为 `O(1)`

```go
// StringHeader is the runtime representation of a string.
// It cannot be used safely or portably and its representation may
// change in a later release.
// Moreover, the Data field is not sufficient to guarantee the data
// it references will not be garbage collected, so programs must keep
// a separate, correctly typed pointer to the underlying data.
//
// Deprecated: Use unsafe.String or unsafe.StringData instead.
type StringHeader struct {
	Data uintptr
	Len  int
}
```

![image-20231104111403296](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231104111403296.png)

1. Go `编译器`将源码中的 string 类型映射为`运行时`的一个`二元组`（Data + Len）
2. 真实的`字符串值数据`存储在一个被 Data 指向的`底层数组`中

> 利用 `unsafe.Pointer` 的`通用指针转型`能力，按照内存布局，顺藤摸瓜，输出底层数组的内容

```go
func dumpBytesArray(bytes []byte) {
	fmt.Print("[")
	for _, b := range bytes {
		fmt.Printf("%c ", b)
	}
	fmt.Println("]")
}

func main() {
	s := "hello"

	// 将 string 类型变量地址显式转型为 reflect.StringHeader
	hdr := (*reflect.StringHeader)(unsafe.Pointer(&s))
	fmt.Printf("0x%x\n", hdr.Data) // 0x1045fcd78

	// 获取 Data 字段指向的数组的指针
	p := (*[5]byte)(unsafe.Pointer(hdr.Data))
	dumpBytesArray(p[:]) // [h e l l o ]
}
```

> 即便直接将 string 类型变量作为`函数参数`，其`传递的开销`也是`恒定`的，不会随着字符串大小的变化而变化

## 常见操作

### 下标

> 字符串的下标操作本质上等价于`底层数组`的下标操作，获取的是字符串特定下标上的`字节`，而不是`字符`

```go
func main() {
	s := "abc"
	fmt.Printf("0x%x\n", s[0]) // 0x61，UTF-8 编码中的第一个字节
}
```

### 迭代

> `for` 为`字节`视角；而 `for range` 为`字符`视角

```go
func main() {
	s := "中国人"

	for i := 0; i < len(s); i++ {
		fmt.Printf("index: %d, value: 0x%X\n", i, s[i])
	}
}

// Output:
//	index: 0, value: 0xE4
//	index: 1, value: 0xB8
//	index: 2, value: 0xAD
//	index: 3, value: 0xE5
//	index: 4, value: 0x9B
//	index: 5, value: 0xBD
//	index: 6, value: 0xE4
//	index: 7, value: 0xBA
//	index: 8, value: 0xBA
```

> 字符串 Unicode 字符的`码点值`，以及该字符在字符串对应`底层数组`中的`偏移量`

> 相当于将 `s[0,3]` 的字节数组`解码`成一个 `rune`

```go
func main() {
	s := "中国人"

	for i, v := range s {
		fmt.Printf("index: %d, type: %T, value: %X\n", i, v, v)
	}
}

// Output:
//	index: 0, type: int32, value: 4E2D
//	index: 3, type: int32, value: 56FD
//	index: 6, type: int32, value: 4EBA
```

### 长度

```go
func main() {
	s := "中国人"

	fmt.Printf("bytes: %d\n", len(s))                    // 9
	fmt.Printf("chars: %d\n", utf8.RuneCountInString(s)) // 3
}
```

### 连接

> 追求`性能更优`的话，应该使用 `strings.Builder`，`strings.Join`，`fmt.Sprintf` 等函数

```go
func main() {
	s := "A "
	s = s + "B "
	s += "C"
	fmt.Println(s) // A B C
}
```

### 比较

> 采用`字典序`的比较策略，分别从每个字符串的起始处，开始`逐个字节`对比两个字符串，直到遇到`第一个不相同`的元素
> 如果两个字符串长度不同，长度较小的字符串会用`空元素补齐`，空元素比非空元素`小`

```go
func main() {
	s1 := "hello go"
	s2 := strings.Join([]string{"hello", "go"}, " ")
	fmt.Println(s1 == s2) // true

	s1 = "-12345"
	s2 = "-123"
	fmt.Println(s1 > s2) // true
}
```

### 转换

> Go 支持字符串与`字节切片`，字符串和 `rune 切片`的双向`显式`转换

```go
func main() {
	s := "中国人"

	// string to []rune
	rs := []rune(s)
	fmt.Printf("%X\n", rs) // [4E2D 56FD 4EBA]

	// string to []byte
	bs := []byte(s)
	fmt.Printf("%X\n", bs) // E4B8ADE59BBDE4BABA

	// []rune to string
	s1 := string(rs)
	fmt.Println(s1) // 中国人

	// []byte to string
	s2 := string(bs)
	fmt.Println(s2) // 中国人
}
```

> 有一定`开销`，根源在于 string 的不可变性，`运行时`要为转换后的类型`分配新内存`

> string 有两个维度上的表示，`[]rune`（字符） 和 `[]byte`（字节）



