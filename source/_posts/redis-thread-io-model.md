---
title: Redis -- 线程IO模型
mathjax: false
date: 2019-10-07 09:57:41
categories:
    - Storage
    - Redis
tags:
    - Storage
    - Redis
---

## 非阻塞IO
1. 当调用套接字的读写方法，默认都是**阻塞**的
    - `read(n)`表示最多读取n个字节后再返回，如果一个字节都没有，那么线程会阻塞，直到有新的数据到来或者连接关闭
    - `write`一般不会阻塞，除非内核为套接字分配的写缓冲区已经**满**了才会阻塞，直到缓冲区有空闲空间挪出来
2. 非阻塞IO在套接字对象上提供了一个选项**`Non_Blocking`**（读写方法**不会阻塞**，能读多少读多少，能写多少写多少）
    - 能读多少取决于内核为套接字分配的**读缓冲区**内部的数据字节数
    - 能写多少取决于内核为套接字分配的**写缓冲区**的空闲空间字节数
    - 读方法和写方法都会通过**返回值**告知程序**实际读写了多少字节**

<!-- more -->

<img src="https://redis-1253868755.cos.ap-guangzhou.myqcloud.com/redis-thread-io-model-server-client.png" width=1000/>

## 事件轮询/多路复用
1. 非阻塞IO存在的问题是**没有通知机制**，可以通过**事件轮询API**来解决这个问题
2. 最简单的事件轮询API是`select`函数，这是**操作系统**提供给用户程序的API
    - 输入是**读写描述符列表**`read_fds & write_fds`，输出的是与之对应的**可读可写事件**
    - 同时还提供一个`timeout`参数，如果没有任何事件到来，那么最多等待`timeout`时间，线程处于**阻塞**状态
    - 期间有任何事件到来，就立即返回，时间过了之后，还没有任何事件到来，也会立即返回
    - 拿到事件后，线程可以继续挨个处理相应的事件，事件处理完之后继续过来轮询
    - 这样线程进入一个死循环，称为**事件循环**
3. 通过`select`系统调用**同时处理多个**通道描述符的读写事件，因此将这类系统调用称为**多路复用API**
4. 现代操作系统的多路复用API已经不再使用`select`系统调用，而是使用**`epoll(linux)`**和**`kqueue(freebsd & macosx)`**
    - 这是因为`select`系统调用的**性能**在**描述符很多**时会非常差
5. 服务端套接字`serversocket`对象的读操作是指调用`accept`接受**客户端新连接**
    - 何时有新连接到来，也是可以通过`select`系统调用的读事件来得到通知
6. _**事件轮询API**就是Java语言层面的**NIO**_

```python
read_events, write_events = select(read_fds, write_fds, timeout)
for event in read_events:
    handle_read(event.fd)
for event in write_events:
    handle_write(event.fd)
handle_others()  # 处理其它事情，如定时任务等
```

<img src="https://redis-1253868755.cos.ap-guangzhou.myqcloud.com/redis-thread-io-model-select.png" width=1000/>

## 指令队列
1. Redis会将每个**客户端套接字**都关联一个**指令队列**，客户端的指令通过**队列**来排队进行**顺序**处理，**先到先服务**

## 响应队列
1. Redis同样会为每个**客户端套接字**关联一个**响应队列**
2. Redis服务器通过响应队列来将**指令的返回结果**回复给客户端
3. 如果队列为空，那么意味着连接暂时处于空闲状态，不需要去获取写事件，可以将当前的客户端描述符从`write_fds`移除
    - 等响应队列里面有值了，再将描述符放进去
    - 避免`select`系统调用立即返回写事件，结果发现什么数据都没有，这样会导致**CPU飙升**

## 定时任务
1. 服务器处理要响应IO事件外，还需要处理其它事情，例如定时任务
    - 如果线程阻塞在select系统调用上，定时任务将无法得到准确调度
2. Redis的定时任务会记录在一个**最小堆**中，在该堆中，最快要执行的任务排在堆的最上方
    - 在每个循环周期，Redis都会将最小堆里面已经到点的任务立即进行处理
    - 处理完毕后，将最快要执行的任务还需要的时间记录下来，该时间就是`select`系统调用的`timeout`参数
    - Redis知道未来的`timeout`时间内，没有其它定时任务要执行，所以可以安心休眠`timeout`时间