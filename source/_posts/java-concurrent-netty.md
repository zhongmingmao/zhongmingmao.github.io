---
title: Java并发 -- Netty线程模型
date: 2019-05-30 11:28:39
categories:
    - Java Concurrent
tags:
    - Java Concurrent
    - Netty
---

## BIO
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-netty-bio.png" width=800/>

<!-- more -->

1. BIO即**阻塞式IO**，使用BIO模型，一般会**为每个Socket分配一个独立的线程**
    - 为了避免频繁创建和销毁线程，可以采用线程池，但Socket和线程之间的对应关系不会发生变化
2. BIO适用于Socket连接不是很多的场景，但现在上百万的连接是很常见的，而创建上百万个线程是不现实的
    - 因此**BIO线程模型无法解决百万连接的问题**
3. 在互联网场景中，连接虽然很多，但每个连接上的请求并不频繁，因此线程大部分时间都在**等待IO就绪**

## 理想的线程模型
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-netty-ideal.png" width=800/>
1. 用一个线程来处理多个连接，可以提高线程的利用率，降低所需要的线程
2. 使用BIO相关的API是无法实现的，BIO相关的Socket读写操作都是**阻塞式**的
    - 一旦调用了阻塞式的API，在IO就绪前，调用线程会**一直阻塞**，也就无法处理其他的Socket连接
3. 利用NIO相关的API能够实现一个线程处理多个连接，通过**Reactor模式**实现

## Reactor模式
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-netty-reactor.png" width=800/>
1. Handle指的是**IO句柄**，在Java网络编程里，本质上是一个**网络连接**
2. Event Handler是事件处理器，handle_event()处理IO事件，**每个Event Handler处理一个IO Handle**
    - get_handle()方法可以返回这个IO Handle
3. Synchronous Event Demultiplexer相当于操作系统提供的_**IO多路复用API**_
    - 例如POSIX标准里的**select**()以及Linux里的**epoll**()
4.  Reactor是Reactor模式的核心
    - register_handler()和remove_handler()可以注册和删除一个事件处理器
    - handle_events()是核心
        - 通过同步事件多路选择器提供的select()方法_**监听网络事件**_
        - 当有网络事件就绪后，就**遍历事件处理器**来处理该网络事件

```cpp
void Reactor::handle_events(){
    // 通过同步事件多路选择器提供的select()方法监听网络事件
    select(handlers);
    // 处理网络事件
    for(h in handlers){
        h.handle_event();
    }
}
// 在主程序中启动事件循环
while (true) {
    handle_events();
}
```

## Netty的线程模型
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-netty.png" width=800/>
1. Netty参考了Reactor模式，Netty中最核心的概念是**事件循环**（EventLoop），即Reactor模式中的Reactor
    - _**负责监听网络事件并调用事件处理器进行处理**_
2. 在Netty 4.x中，网络连接 : EventLoop : Java线程 = _**N:1:1**_
    - 所以，_**一个网络连接只会对应到一个Java线程**_
    - 优点：对于一个网络连接的事件处理都是**单线程**的，这样能**避免各种并发问题**

### EventLoopGroup
1. EventLoopGroup由一组EventLoop组成
    - 实际使用中，一般会创建两个EventLoopGroup，一个是**bossGroup**，一个是**workerGroup**
2. Socket处理TCP网络连接请求，是在一个独立的Socket中
    - 每当有一个TCP连接成功建立，都会创建一个新的Socket
    - 之后对TCP连接的读写都是由新创建处理的Socket完成的
    - 处理TCP**连接请求**和**读写请求**是通过两个不同的Socket完成的
3. 在Netty中，bossGroup用来处理连接请求的，workerGroup用来处理读写请求的
    - bossGroup处理完连接请求后，会将这个连接提交给workerGroup来处理
    - workerGroup中会有多个EventLoop，通过均衡负载算法（**轮询**）来分配某一个EventLoop

## Echo程序
```java
public class Echo {

    public static void main(String[] args) {
        // 事件处理器
        EchoServerHandler serverHandler = new EchoServerHandler();
        // boss线程组
        EventLoopGroup bossGroup = new NioEventLoopGroup(1);
        // worker线程组
        EventLoopGroup workerGroup = new NioEventLoopGroup(1);

        try {
            ServerBootstrap bootstrap = new ServerBootstrap();
            bootstrap.group(bossGroup, workerGroup)
                    .channel(NioServerSocketChannel.class)
                    .childHandler(new ChannelInitializer<SocketChannel>() {
                        @Override
                        protected void initChannel(SocketChannel socketChannel) throws Exception {
                            socketChannel.pipeline().addLast(serverHandler);
                        }
                    });
            // 绑定端口号
            ChannelFuture future = bootstrap.bind(9090).sync();
            future.channel().closeFuture().sync();
        } catch (InterruptedException e) {
            e.printStackTrace();
        } finally {
            // 终止worker线程组
            workerGroup.shutdownGracefully();
            // 终止boss线程组
            bossGroup.shutdownGracefully();
        }
    }
}

// Socket连接处理器
class EchoServerHandler extends ChannelInboundHandlerAdapter {

    // 处理读事件
    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
        ctx.write(msg);
    }

    // 处理读完成事件
    @Override
    public void channelReadComplete(ChannelHandlerContext ctx) throws Exception {
        ctx.flush();
    }

    // 处理异常事件
    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) throws Exception {
        cause.printStackTrace();
        ctx.close();
    }
}
```

<!-- indicate-the-source -->
