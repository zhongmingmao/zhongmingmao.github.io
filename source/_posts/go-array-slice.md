---
title: Go -- 数组 + 切片
mathjax: false
date: 2019-06-10 11:04:27
categories:
    - Go
tags:
    - Go
---

## 数组

### 声明
```go
func TestArrayInit(t *testing.T) {
    var a [3]int // 声明并初始化为默认零值
    t.Log(a)     // [0 0 0]
    a[0] = 1
    t.Log(a) // [1 0 0]

    b := [3]int{1, 2, 3}           // 声明并初始化
    c := [2][2]int{{1, 2}, {3, 4}} // 多维数组初始化
    t.Log(a, b, c)                 // [1 0 0] [1 2 3] [[1 2] [3 4]]

    d := [...]int{1, 2, 3, 4, 5} // 使用...，不用指定初始化数组的长度
    t.Log(len(d), d[2])          // 5 3
}
```

<!-- more -->

### 遍历
```go
func TestArrayTravel(t *testing.T) {
    a := [...]int{1, 2, 3, 4, 5}

    // 不推荐
    for i := 0; i < len(a); i++ {
    	t.Log(a[i])
    }

    // foreach
    for index, item := range a {
    	// index为索引，item为元素值
    	t.Log(index, item)
    }

    // foreach
    for _, item := range a {
    	// Go是有严格编程约束的语言，_是占位符，表示不关心这个值
    	t.Log(item)
    }
}
```

### 截取
```go
func TestArraySection(t *testing.T) {
    // [包含，不包含]
    // 不支持负数索引
    a := [...]int{1, 2, 3, 4, 5}
    a_sec := a[:3]      // [1 2 3]
    a_sec = a[3:]       // [4 5]
    a_sec = a[2:len(a)] // [3 4 5]
    //a_sec = a[-1]       // invalid array index -1 (index must be non-negative)
    t.Log(a_sec)
}
```

## 切片

### 内部结构
<img src="https://go-1253868755.cos.ap-guangzhou.myqcloud.com/go-slice-internal-structure.png" width=1000/>

### 初始化
```go
func TestSliceInit(t *testing.T) {
    // 与数组声明非常类似，但没有指定长度，切片是可变长的
    var s0 []int
    t.Log(len(s0), cap(s0)) // 0 0

    s0 = append(s0, 1)
    t.Log(len(s0), cap(s0)) // 1 1

    s1 := []int{1, 2, 3, 4}
    t.Log(len(s1), cap(s1)) // 4 4

    s2 := make([]int, 3, 5)
    t.Log(len(s2), cap(s2))    // 3 5
    t.Log(s2[0], s2[1], s2[2]) // 0 0 0
    //t.Log(s2[0], s2[1], s2[2], s2[3]) // panic: runtime error: index out of range
    s2 = append(s2, 1)
    t.Log(s2[0], s2[1], s2[2], s2[3]) // 0 0 0 1
    t.Log(len(s2), cap(s2))           // 4 5
}
```

### 增长
```go
func TestSliceGrowing(t *testing.T) {
    s := []int{}
    for i := 0; i < 10; i++ {
    	s = append(s, i)
    	t.Log(len(s), cap(s))
    	// 1 1
    	// 2 2
    	// 3 4
    	// 4 4
    	// 5 8
    	// 6 8
    	// 7 8
    	// 8 8
    	// 9 16
    	// 10 16
    }
}
```

### 共享存储结构
<img src="https://go-1253868755.cos.ap-guangzhou.myqcloud.com/go-slice-share-structure.png" width=800/>

```go
func TestSliceShareMemory(t *testing.T) {
    months := []string{"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}

    Q2 := months[3:6]
    t.Log(Q2, len(Q2), cap(Q2)) // [Apr May Jun] 3 9

    summer := months[5:8]
    t.Log(len(summer), cap(summer)) // 3 7
    summer[0] = "unknown"
    t.Log(Q2)     // [Apr May unknown]
    t.Log(months) // [Jan Feb Mar Apr May unknown Jul Aug Sep Oct Nov Dec]
}
```

## 对比
1. 容量是否**可伸缩**，切片是可伸缩的
2. 是否可以进行**比较**，数组可以用==比较

```go
func TestSliceComparing(t *testing.T) {
    s1 := []int{1, 2, 3, 4}
    s2 := []int{1, 2, 3, 4}
    t.Log(s1 == s2) // invalid operation: s1 == s2 (slice can only be compared to nil)
}
```
