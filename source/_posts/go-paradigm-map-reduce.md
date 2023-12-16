---
title: Go Paradigm - MapReduce
mathjax: false
date: 2022-01-29 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/paradigm/image-20231212232811125.png
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# Introduction

## Map

```go
func MapStrToStr(arr []string, fn func(s string) string) []string {
	var sl []string
	for _, s := range arr {
		sl = append(sl, fn(s))
	}
	return sl
}

func MapStrToInt(arr []string, fn func(s string) int) []int {
	var sl []int
	for _, s := range arr {
		sl = append(sl, fn(s))
	}
	return sl
}

func main() {
	list := []string{"hello", "world"}

	x := MapStrToStr(list, func(s string) string {
		return strings.ToUpper(s)
	})
	fmt.Printf("%v\n", x) // [HELLO WORLD]

	y := MapStrToInt(list, func(s string) int {
		return len(s)
	})
	fmt.Printf("%v\n", y) // [5 5]
}
```

<!-- more -->

## Reduce

```go
func Reduce(arr []string, fn func(s string) int) int {
	sum := 0
	for _, s := range arr {
		sum += fn(s)
	}
	return sum
}

func main() {
	list := []string{"hello", "world"}
	x := Reduce(list, func(s string) int {
		return len(s)
	})
	println(x) // 10
}
```

## Filter

```go
func Filter(arr []int, fn func(n int) bool) []int {
	var sl []int
	for _, n := range arr {
		if fn(n) {
			sl = append(sl, n)
		}
	}
	return sl
}

func main() {
	sl := []int{0, 1, 2, 3, 4, 5, 6, 7, 8, 9}

	even := Filter(sl, func(n int) bool {
		return n%2 == 0
	})
	fmt.Printf("%v\n", even) // [0 2 4 6 8]

	odd := Filter(sl, func(n int) bool {
		return n%2 != 0
	})
	fmt.Printf("%v\n", odd) // [1 3 5 7 9]
}
```

# Generic

```go
func GenericMap[T, U any](arr []T, fn func(T) U) []U {
	var sl []U
	for _, s := range arr {
		sl = append(sl, fn(s))
	}
	return sl
}

func main() {
	list := []string{"hello", "world"}

	x := GenericMap(list, func(s string) string {
		return strings.ToUpper(s)
	})
	fmt.Printf("%v\n", x) // [HELLO WORLD]

	y := GenericMap(list, func(s string) int {
		return len(s)
	})
	fmt.Printf("%v\n", y) // [5 5]
}
```

