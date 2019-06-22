---
title: Java并发 -- 协程
mathjax: false
date: 2019-06-08 18:11:51
categories:
    - Java
    - Concurrent
tags:
    - Java
    - Java Concurrent
    - Coroutine
---

## 协程
1. 协程可以理解为一种**轻量级的线程**
2. 从操作系统的角度来看，线程是在**内核态**中调度的，而**协程**是在**用户态**调度的，协程的切换成本更低
3. 协程栈比线程栈要小得多，典型的线程栈在1M左右，而协程栈一般在几K或者几十K左右
4. 因此无论在时间维度还是在空间维度，协程都比线程轻量很多
5. 支持协程的语言：Go、Python、Lua、Kotlin
    - Java OpenSDK的Loom项目的目标是为了支持协程

<!-- more -->

## Go中的协程
```go
func hello(msg string) {
    fmt.Println("Hello " + msg)
}

func TestCoroutine(t *testing.T) {
    // 在新的协程中执行hello方法
    go hello("Go")
    // 等待100毫秒让协程执行结束
    time.Sleep(100 * time.Millisecond)
}
```
1. Java中的线程是一个重量级对象，因此无法很好地实现Thread-Per-Message模式，而协程可以
2. Thread-Per-Message模式非常简单，模式越简单，功能就越稳定，可理解性也越好

### echo程序
```go
import (
    "log"
    "net"
)

// 使用Thread-Per-Message模式，为每个成功建立连接的Socket分配一个协程
// 相对于Java线程池的实现方案，Go协程的方案更简单
func main() {
    // 监听本地9090端口
    socket, err := net.Listen("tcp", "127.0.0.1:9090")
    if err != nil {
    	log.Panicln(err)
    }
    defer socket.Close()
    for {
    	// 处理连接请求
    	conn, err := socket.Accept()
    	if err != nil {
            log.Panicln(err)
    	}
    	// 处理已经成功连接的请求
    	go handleRqeust(conn)
    }
}

// 处理已经成功连接的请求
func handleRqeust(conn net.Conn) {
    defer conn.Close()
    for {
    	buf := make([]byte, 1024)
    	// 读取请求数据
    	size, err := conn.Read(buf)
    	if err != nil {
            return
    	}
    	// 回写读取到的数据
    	_, _ = conn.Write(buf[:size])
    }
}
```
