---
title: Java并发 -- CSP模型
mathjax: false
date: 2019-06-12 14:46:47
categories:
    - Java
    - Concurrent
tags:
    - Java
    - Java Concurrent
    - Go
    - CSP
---

## Go
1. Go是一门号称从**语言层面支持并发**的编程语言，支持并发也是Go非常重要的特性之一
2. Go支持**协程**，协程可以类比Java中的线程，解决并发问题的难点在于线程（协程）之间的**协作**
3. Go提供了两种方案
    - 支持协程之间以**共享内存**的方式通信，Go提供了**管程**和**原子类**来对协程进行同步控制，该方案与Java类似
    - 支持协程之间以**消息传递**的方式通信，本质上是要**避免共享**，该方案是基于**CSP模型**实现的，Go推荐该方案

<!-- more -->

## CSP模型
1. CSP：Communicating Sequential Processes
2. _**Do not communicate by sharing memory; instead, share memory by communicating.**_

### 累加器
```go
package main

import (
    "fmt"
    "time"
)

func main() {
    singleCoroutine()
    multiCoroutine()
}

// 单协程，只能用到CPU的一个核
func singleCoroutine() {
    var result, i uint64
    start := time.Now()
    for i = 1; i <= 10000000000; i++ {
    	result += i
    }
    elapsed := time.Since(start)
    fmt.Println(elapsed, result) // 4.330357206s 13106511857580896768
}

// 多协程
func multiCoroutine() {
    var result uint64
    start := time.Now()
    ch1 := calc(1, 2500000000)
    ch2 := calc(2500000001, 5000000000)
    ch3 := calc(5000000001, 7500000000)
    ch4 := calc(7500000001, 10000000000)
    // 主协程需要与子协程通信，Go中协程之间的通信推荐使用channel
    result = <-ch1 + <-ch2 + <-ch3 + <-ch4
    // ch1只能读取数据，如果通过ch1写入数据，编译时会报错
    // ch1 <- 7 // invalid operation: ch1 <- 7 (send to receive-only type <-chan uint64)
    elapsed := time.Since(start)
    fmt.Println(elapsed, result) // 1.830920702s 13106511857580896768
}

// 返回一个只能接收数据的channel
// 方法创建的子协程会把计算结果发送到这个channel，而主协程会通过channel把计算结果取出来
func calc(from uint64, to uint64) <-chan uint64 {
    // channel用于协程间的通信，这是一个无缓冲的channel
    channel := make(chan uint64)
    go func() {
    	result := from
    	for i := from + 1; i <= to; i++ {
    		result += i
    	}
    	// 将结果写入channel
    	channel <- result
    }()
    // 返回用于通信的channel
    return channel
}
```

### 生产者-消费者模式
1. 可以把Go实现的CSP模式类比成**生产者-消费者模式**，而channel类比成生产者-消费者模式中的**阻塞队列**
2. Go中channel的容量可以为0，容量为0的channel被称为**无缓冲的channel**，容量大于0的channel被称为**有缓冲的channel**
3. 无缓冲的channel类似于Java中提供的**SynchronousQueue**，主要用途是在两个协程之间做**数据交换**
4. Go中的channel是**语言层面**支持的，使用左向箭头`<-`完成**向channel发送数据**和**读取数据**的任务
5. Go中的channel是支持**双向传输**的，即一个协程既可以通过它**发送数据**，也可以通过它**接收数据**
6. Go中的双向channel可以变成一个**单向channel**
    - calc中创建了一个双向channel，但是返回的是一个只能接收数据的单向channel
    - 所以在主协程中，只能通过该channel接收数据，而不能通过它发送数据

```go
// 创建一个容量为4的channel
channel := make(chan int, 4)

// 创建4个协程，作为生产者
for i := 0; i < 4; i++ {
    go func() {
        channel <- 7
    }()
}

// 创建4个协程，作为消费者
for i := 0; i < 4; i++ {
    go func() {
        o := <-channel
        fmt.Println("received : ", o)
    }()
}
```

### Actor模式
1. Go实现的CSP模式和Actor模式都是通过**消息传递**的方式来**避免共享**，主要有以下三个区别
2. **Actor模型中没有channel**，Actor模型中的Mailbox与channel非常类似，看起来都是FIFO队列，但本质区别很大
    - Actor模型
        - Mailbox对程序员是**透明**的，Mailbox明确归属于某一个特定的Actor，是Actor模型的**内部机制**
        - Actor之间可以**直接通信**，不需要通信媒介
    - CSP模型
        - channel对于程序员来说是**可见**的
        - channel是**通信媒介**，传递的消息都直接发送到channel中
3. Actor模型中发送消息是**非阻塞**的，而CSP模型中是**阻塞**的
    - Go实现的CSP模型，channel是一个**阻塞队列**
    - 当阻塞队列已满的时候，向channel发送数据，会导致发送消息的协程阻塞
4. Actor模型理论上不保证消息百分比送达，而Go实现的CSP模型中，是能保证**消息百分百送达**的（代价：可能导致**死锁**）

```go
func main() {
    // 无缓冲的channel
    channel := make(chan int)
    // fatal error: all goroutines are asleep - deadlock!
    // 主协程会阻塞在此处，发生死锁
    <-channel
}
```

## 小结
1. CSP模型是Tony Hoare在1978年提出的，该模型一直都在发展，**其理论远比Go实现的复杂得多**
    - Tony Hoare在并发领域还有另一项重要成就，即**霍尔管程模型**，这是**Java**解决并发问题的**理论基础**
2. Java可以借助第三方类库**JCSP**来支持CSP模型，相比Go的实现，**JCSP更接近理论模型**
    - JCSP并没有经过广泛的生产环境检验，因此**不推荐在生产环境使用**

## 参考资料
[Java并发编程实战](https://time.geekbang.org/column/intro/100023901)