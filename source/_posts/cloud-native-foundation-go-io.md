---
title: Cloud Native Foundation - Go IO
mathjax: false
date: 2022-10-11 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/d3a039afd1ba2d00298f26b62c2a3624.webp
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go
tags:
  - Cloud Native
  - Go
  - Network
---

# 阻塞 IO

> 阻塞：`等待数据就绪`

> `阻塞 + 同步`

![image-20230519232001708](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20230519232001708.png)

<!-- more -->

# 非阻塞 IO

> 非阻塞：`等待数据就绪`

> `轮询`：效率不高

> `非阻塞 + 同步`

![image-20230519232211458](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20230519232211458.png)

# IO 多路复用

> `（集中线程）阻塞 + 同步`

> 当数据就绪后，集中线程会`唤醒`其他线程，`阻塞的仅仅只是一个线程`

![image-20230519232455469](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20230519232455469.png)

## select / poll

> 通过`传参`的形式来`轮询` fd 列表，长度有上限（`1024`）

## epoll

> 通过 `mmap` 将`用户态的内存`和`内核态的内存`进行`共享`，不再需要`传参`，解决了 fd 长度受限的问题

> 基于`事件侦听`，而非`轮询`
> wq: `wait queue`, rdlist: `ready list`, rbr: `red black tree`

![image-20230519233500841](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20230519233500841.png)

> Go HTTP：`goroutine 与 fd 绑定`

![image-20230519234217394](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20230519234217394.png)

# 异步 IO

> `非阻塞 + 异步`

> 异步：`拷贝`数据（`Socket 缓冲区` -> `应用缓冲区`）的过程也是由 `Kernel` 来完成

![image-20230519233231945](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/go/image-20230519233231945.png)

