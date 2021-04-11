---
title: Go -- Map
mathjax: false
date: 2019-06-11 09:28:22
categories:
    - Go
tags:
    - Go
---

## 声明
```go
func TestInitMap(t *testing.T) {
    m1 := map[int]int{1: 1, 2: 4, 3: 9}
    t.Log(m1[2])   // 4
    t.Log(len(m1)) // 3

    m2 := map[int]int{}
    m2[4] = 16
    t.Log(len(m2)) // 1

    // 10为cap，没有使用len，因为len会初始化为“0”值，但map没法预设“0”值
    m3 := make(map[int]int, 10)
    t.Log(len(m3)) // 0
    //t.Log(cap(m3)) // invalid argument m3 (type map[int]int) for cap
}
```

<!-- more -->

## 元素访问
```go
func TestAccessNotExistingKey(t *testing.T) {
    m1 := map[int]int{}
    // 不存在，返回0，避免了其他语言中的空指针异常
    t.Log(m1[1]) // 0
    m1[2] = 0
    // 存在0，返回0，无法区分
    t.Log(m1[2]) // 0

    if v, ok := m1[3]; ok {
    	t.Log("Key exists, value=", v)
    } else {
    	t.Log("Key not exists ")
    }
}
```

## 遍历
```go
func TestTravelMap(t *testing.T) {
    m := map[int]int{1: 1, 2: 4, 3: 9}
    for k, v := range m {
    	t.Log(k, v)
    	// 1 1
    	// 2 4
    	// 3 9
    }
}
```

## 工厂模式
1. Map的value可以是一个**方法**
2. 与Go的**Dock type**接口方式一起，可以方便地实现**单一方法对象的工厂模式**
3. 在Go语言，_**函数是一等公民**_

```go
func TestMapWithFunValue(t *testing.T) {
    m := map[int]func(op int) int{}
    m[1] = func(op int) int { return op }
    m[2] = func(op int) int { return op * op }
    m[3] = func(op int) int { return op * op * op }
    t.Log(m[1](2), m[2](2), m[3](2)) // 2 4 8
}
```

## 实现Set
1. **Go的内置集合没有Set实现**，可以使用**map[type]bool**
2. 元素的**唯一性**
3. 基本操作：添加元素、判断元素是否存在、删除元素、元素个数

```go
func TestMapForSet(t *testing.T) {
    mySet := map[int]bool{}
    n := 1
    mySet[n] = true
    if mySet[n] {
    	t.Logf("%d is exists", n) // 1 is exists
    } else {
    	t.Logf("%d is not exists", n)
    }

    mySet[2] = true
    t.Log(len(mySet)) // 2

    delete(mySet, 1)
    if mySet[n] {
    	t.Logf("%d is exists", n)
    } else {
    	t.Logf("%d is not exists", n) // 1 is not exists
    }
}
```
