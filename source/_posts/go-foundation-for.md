---
title: Go - for
mathjax: false
date: 2023-01-03 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-for-loop.png
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 经典

## C

```c
#include <stdio.h>

int main() {
    int i;
    int sum = 0;
    for (i = 0; i < 10; i++) {
        sum += i;
    }
    printf("%d\n", sum);
}

```

<!-- more -->

## Go

> i 为循环变量，作用域仅限于 for 语句的隐式代码块范围内

```go
package main

func main() {
	var sum int
	for i := 0; i < 10; i++ {
		sum += i
	}
	println(sum)
}
```

![image-20231111081418915](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231111081418915.png)

# 多变量

```go
package main

func main() {
	var sum int
	for i, j, k := 0, 1, 2; (i < 10) && (j < 20) && (k < 20); i, j, k = i+1, j+5, k+8 {
		sum += i + j + k
	}
	println(sum)
}
```

# 省略

> 省略`循环后置语句`

```go
for i := 0; i < 10; {
  i++
}
```

> 省略`循环前置语句`

```go
i := 0
for ; i < 10; i++ {
}
```

> 前后都省略，可以省略 `;`，仅保留`循环判断条件表达式`

```go
i := 0
for i < 10 {
  i++
}
```

> 全部省略

```go
// 推荐
for {
}
```

```go
for true {
}
```

```go
for ;; {
}
```

# for range

> for range 针对不同的复合类型进行循环操作时，所声明的`循环变量`的`语义`是`不一样`的

## slice

```go
sl := []int{1, 2, 3, 4, 5}
for i := 0; i < len(sl); i++ {
  println(sl[i])
}
```

> 语法糖：for range

```go
sl := []int{1, 2, 3, 4, 5}
for i, v := range sl {
  println(i, v)
}
```

> 不关心`元素值`

```go
sl := []int{1, 2, 3, 4, 5}
for i, _ := range sl {
  println(i)
}
```

```go
sl := []int{1, 2, 3, 4, 5}
for i := range sl {
  println(i)
}
```

> 不关心`元素下标`

```go
sl := []int{1, 2, 3, 4, 5}
for _, v := range sl {
  println(v)
}
```

> 都不关心

```go
sl := []int{1, 2, 3, 4, 5}
for _, _ = range sl {
}
```

```go
// 优雅
sl := []int{1, 2, 3, 4, 5}
for range sl {
}
```

## string

> for range 对于 string 来说，将采用`字符视角`

> 1. `v` 为 `Unicode 码点`，即 `rune` 类型值，而非一个字节
> 2. `i` 为该 `Unicode 码点`在内存编码（`UTF-8`）的`第一个字节`在字符串`内存序列`中的位置

```go
package main

import "fmt"

func main() {
	s := "中国人"
	for i, v := range s {
		fmt.Printf("%d %c %s %T,0x%x\n", i, v, string(v), v, v)
	}
}

// Output:
//	0 中 中 int32,0x4e2d
//	3 国 国 int32,0x56fd
//	6 人 人 int32,0x4eba
```

```go builtin/builtin.go
// rune is an alias for int32 and is equivalent to int32 in all ways. It is
// used, by convention, to distinguish character values from integer values.
type rune = int32
```

## map

> for range 是循环 map 的`唯一方法`

```go
m := map[string]int{
  "one":   1,
  "two":   2,
  "three": 3,
}

for k, v := range m {
  println(k, v)
}
```

## channel

> channel 是 Go 提供的`并发原语`，用于多个 `goroutine` 之间的通信

```go
c := make(chan int)
for v := range c {
  println(v)
}
```

1. 当 channel 中`没有数据可读`的时候，for range 会`阻塞`在对 channel 的`读`操作上
2. 直到 channel `关闭`，for range 才会`结束`

# continue

```go
sum := 0
sl := []int{1, 2, 3, 4, 5, 6}
for _, v := range sl {
  if v%2 == 0 {
    continue
  }
  sum += v
}
println(sum) // 9
```

## label

> `标记`跳转的目标，常用于`嵌套循环语句`，被用于跳转到`外层循环`并继续执行外层循环语句的下一次迭代

```go
package main

func main() {
	sum := 0
	sl := []int{1, 2, 3, 4, 5, 6}

loop:
	for _, v := range sl {
		if v%2 == 0 {
			continue loop
		}
		sum += v
	}
	println(sum) // 9
}
```

```go
package main

import "fmt"

func main() {
	sl := [][]int{
		{1, 2, 3},
		{4, 5, 6, 5},
		{7, 8, 9},
		{5},
	}

outerLoop:
	for i := 0; i < len(sl); i++ {
		for j := 0; j < len(sl[i]); j++ {
			if sl[i][j] == 5 {
				fmt.Printf("found 5 at (%d, %d)\n", i, j)
				continue outerLoop // 直接中断（break）内层循环，回到外层循环继续执行
			}
		}
	}
}

// Output:
// 	found 5 at (1, 1)
// 	found 5 at (3, 0)
```

> 类 c 的实现方式，比较繁琐

```go
package main

import "fmt"

func main() {
	sl := [][]int{
		{1, 2, 3},
		{4, 5, 6, 5},
		{7, 8, 9},
		{5},
	}

	for i := 0; i < len(sl); i++ {
		found := false
		for j := 0; j < len(sl[i]); j++ {
			if sl[i][j] == 5 {
				fmt.Printf("found 5 at (%d, %d)\n", i, j)
				found = true
				break
			}
		}
		if found {
			continue
		}
	}
}

// Output:
// 	found 5 at (1, 1)
// 	found 5 at (3, 0)
```

# goto

> 无限循环

```go
package main

import "fmt"

func main() {
	sl := [][]int{
		{1, 2, 3},
		{4, 5, 6, 5},
		{7, 8, 9},
		{5},
	}

outerLoop:
	for i := 0; i < len(sl); i++ {
		for j := 0; j < len(sl[i]); j++ {
			if sl[i][j] == 5 {
				fmt.Printf("found 5 at (%d, %d)\n", i, j)
				goto outerLoop // break 内层循环和外层循环，重新开始，无限循环
			}
		}
	}
}

// Output:
//	found 5 at (1, 1)
//	found 5 at (1, 1)
// 	....
// 	....
```

> `不推荐使用 goto`，难以驾驭、可读性差、代码难以维护

# break

```go
sl := []int{5, 19, 6, 3, 8, 12}
firstEven := -1

for _, v := range sl {
  if v%2 == 0 {
    firstEven = v
    break
  }
}

println(firstEven) // 6
```

## label

> 不带 label 的 break 仅能跳出其所在的`最内层循环`

```go
package main

import "fmt"

func main() {
	sl := [][]int{
		{1, 2, 3},
		{4, 5, 6, 5},
		{7, 8, 9},
		{5},
	}

outerLoop:
	for i := 0; i < len(sl); i++ {
		for j := 0; j < len(sl[i]); j++ {
			if sl[i][j] == 5 {
				fmt.Printf("found 5 at (%d, %d)\n", i, j)
				break outerLoop
			}
		}
	}
}

// Output:
//	found 5 at (1, 1)
```

# 几点注意

## 循环变量

> 循环变量在 for range 中`仅会被声明1次`，且在`每次迭代`中都会被`重用`

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	m := []int{1, 2, 3, 4, 5}

	for i, v := range m {
		go func() {
			time.Sleep(time.Second * 3)
			fmt.Println(i, v) // Loop variables captured by 'func' literals in 'go' statements might have unexpected values
		}()
	}

	time.Sleep(time.Second * 10)
}

// Output:
//	4 5
//	4 5
//	4 5
//	4 5
//	4 5
```

> 等价转换

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	m := []int{1, 2, 3, 4, 5}

	i, v := 0, 0
	for i, v = range m {
		go func() {
			time.Sleep(time.Second * 3)
			fmt.Println(i, v) // 新启动的 goroutine 会共享当前 goroutine 的变量 i 和 v
		}()
	}

	time.Sleep(time.Second * 10)
}

// Output:
//	4 5
//	4 5
//	4 5
//	4 5
//	4 5
```

> 为`闭包函数`增加`参数`

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	m := []int{1, 2, 3, 4, 5}

	for i, v := range m {
		go func(i, v int) {
			time.Sleep(time.Second * 3)
			fmt.Println(i, v)
		}(i, v)
	}

	time.Sleep(time.Second * 10)
}

// Output:
//	0 1
//	2 3
//	3 4
//	4 5
//	1 2
```

## 副本

> 参与循环的是 range 表达式的`副本` - `值拷贝`

```go
package main

import "fmt"

func main() {
	a := [5]int{1, 2, 3, 4, 5}
	var r [5]int

	fmt.Println(a) // [1 2 3 4 5]

	for i, v := range a { // 真正参与循环的是 a 的副本，即 a 的值拷贝（临时分配的内存空间）
		if i < len(a)-1 {
			a[i+1] += 10
		}
		r[i] = v
	}

	fmt.Println(a) // [1 12 13 14 15]
	fmt.Println(r) // [1 2 3 4 5]
}
```

> 使用切片

```go
package main

import "fmt"

func main() {
	a := [5]int{1, 2, 3, 4, 5}
	var r [5]int

	fmt.Println(a) // [1 2 3 4 5]

	for i, v := range a[:] { // 切片为底层数组的描述符，对切片进行值拷贝，实际操作的还是同一个底层数组
		if i < len(a)-1 {
			a[i+1] += 10
		}
		r[i] = v
	}

	fmt.Println(a) // [1 12 13 14 15]
	fmt.Println(r) // [1 12 13 14 15]
}
```

## map

> 遍历 `map` 中的元素具有随机性

1. 当 map 类型变量作为 range 表达式时，通过`值拷贝`得到的 map 变量指向`同一个` map
2. 在循环的过程中，对 map 进行`修改`，修改的结果`不一定`会影响后续的迭代

### 删除

```go
m := map[string]int{
  "tony": 21,
  "tom":  22,
  "jim":  23,
}

counter := 0
for k, v := range m {
  if counter == 0 {
    delete(m, "tony")
  }
  counter++
  fmt.Println(k, v)
}

fmt.Println(counter)
```

> 当 tony 作为第 1 个迭代的元素

```
tony 21
tom 22
jim 23
3

```

> 否则

```
jim 23
tom 22
2
```

### 新增

> 为 map 新增元素，在后续的迭代中，可能出现，也可能不出现

```go
package main

import "fmt"

func main() {
	m := map[string]int{
		"tony": 21,
		"tom":  22,
		"jim":  23,
	}

	counter := 0
	for k, v := range m {
		if counter == 0 {
			m["lucy"] = 24
		}
		counter++
		fmt.Println(k, v)
	}

	fmt.Println(counter)
}
```

> 出现

```
jim 23
lucy 24
tony 21
tom 22
4
```

> 不出现

```
tony 21
tom 22
jim 23
3
```

