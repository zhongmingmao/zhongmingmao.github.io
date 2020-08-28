---
title: Netty -- 三种Reactor -- 源码剖析
mathjax: false
date: 2020-02-11 20:55:50
categories:
    - Network
    - Netty
tags:
    - Network
    - Netty
---

## 三种Reactor
![network-netty-3-reactor-compressed](https://network-netty-1253868755.cos.ap-guangzhou.myqcloud.com/network-netty-3-reactor-compressed.png)

<!-- more -->

## Netty如何支持主从Reactor模式？

### 使用样例
```java
// Server
EventLoopGroup bossGroup = new NioEventLoopGroup();
EventLoopGroup workerGroup = new NioEventLoopGroup();
ServerBootstrap bootstrap = new ServerBootstrap();
bootstrap.group(bossGroup, workerGroup);
```
```java
// Client
EventLoopGroup workerGroup = new NioEventLoopGroup();
Bootstrap bootstrap = new Bootstrap();
bootstrap.group(workerGroup)
```

### bootstrap包的类图
![network-netty-bootstrap-code](https://network-netty-1253868755.cos.ap-guangzhou.myqcloud.com/network-netty-bootstrap-code.png)

### AbstractBootstrapConfig
```java AbstractBootstrapConfig
protected final B bootstrap;

public final EventLoopGroup group() {
    return bootstrap.group();
}
```

### AbstractBootstrap
```java AbstractBootstrap
volatile EventLoopGroup group;

public B group(EventLoopGroup group) {
    ObjectUtil.checkNotNull(group, "group");
    if (this.group != null) {
        throw new IllegalStateException("group set already");
    }
    this.group = group;
    return self();
}

@Deprecated
public final EventLoopGroup group() {
    return group;
}

final ChannelFuture initAndRegister() {
    Channel channel = null; // ServerSocketChannel
    try {
        channel = channelFactory.newChannel();
        init(channel);
    } catch (Throwable t) {
        ...
    }

    // 1. 将ServerSocketChannel绑定到bossGroup
    // 2. ServerSocketChannel可以创建子SocketChannel
    // 3. 将子SocketChannel绑定到workerGroup上
    ChannelFuture regFuture = config().group().register(channel);
    ...
}
```

### ServerBootstrap
```java ServerBootstrap
private volatile EventLoopGroup childGroup;

public ServerBootstrap group(EventLoopGroup parentGroup, EventLoopGroup childGroup) {
    super.group(parentGroup);
    if (this.childGroup != null) {
        throw new IllegalStateException("childGroup set already");
    }
    this.childGroup = ObjectUtil.checkNotNull(childGroup, "childGroup");
    return this;
}

void init(Channel channel) {
    ...
    final EventLoopGroup currentChildGroup = childGroup;
    ...
    p.addLast(new ChannelInitializer<Channel>() {
        @Override
        public void initChannel(final Channel ch) {
            ...
            ch.eventLoop().execute(new Runnable() {
                @Override
                public void run() {
                    pipeline.addLast(new ServerBootstrapAcceptor(
                            ch, currentChildGroup, currentChildHandler, currentChildOptions, currentChildAttrs));
                }
            });
        }
    });
    ...
}
```

### ServerBootstrap$ServerBootstrapAcceptor
```java ServerBootstrap$ServerBootstrapAcceptor
public void channelRead(ChannelHandlerContext ctx, Object msg) {
    // SocketChannel
    final Channel child = (Channel) msg;
    ...

    try {
        // SocketChannel绑定到workerGroup
        childGroup.register(child).addListener(new ChannelFutureListener() {
            @Override
            public void operationComplete(ChannelFuture future) throws Exception {
                if (!future.isSuccess()) {
                    forceClose(child, future.cause());
                }
            }
        });
    } catch (Throwable t) {
        forceClose(child, t);
    }
}
```

## 为什么Netty的Main Reactor大多并不能用到整一个线程组，而只能用到线程组里面的一个？
服务端只能绑定一个`SocketAddress`
![network-netty-3-reactor-boss-group](https://network-netty-1253868755.cos.ap-guangzhou.myqcloud.com/network-netty-3-reactor-boss-group.png)

## Netty给Channel分配NIO Event Loop的规则是什么？
```java ServerBootstrap$ServerBootstrapAcceptor
public void channelRead(ChannelHandlerContext ctx, Object msg) {
    // SocketChannel
    final Channel child = (Channel) msg;
    ...

    try {
        // SocketChannel绑定到workerGroup
        // childGroup如何选择EventLoop，来注册SocketChannel？
        childGroup.register(child).addListener(new ChannelFutureListener() {
            @Override
            public void operationComplete(ChannelFuture future) throws Exception {
                if (!future.isSuccess()) {
                    forceClose(child, future.cause());
                }
            }
        });
    } catch (Throwable t) {
        forceClose(child, t);
    }
}
```

### MultithreadEventLoopGroup
![network-netty-3-reactor-EventLoopGroup-register](https://network-netty-1253868755.cos.ap-guangzhou.myqcloud.com/network-netty-3-reactor-EventLoopGroup-register.png)
```java MultithreadEventLoopGroup
@Override
public abstract class MultithreadEventLoopGroup extends MultithreadEventExecutorGroup implements EventLoopGroup {
    @Override
    public ChannelFuture register(Channel channel) {
        return next().register(channel);
    }

    @Override
    public EventLoop next() {
        return (EventLoop) super.next();
    }
}
```

### MultithreadEventExecutorGroup
```java MultithreadEventExecutorGroup
private final EventExecutorChooserFactory.EventExecutorChooser chooser;

@Override
public EventExecutor next() {
    return chooser.next();
}
```

### EventExecutorChooserFactory
```java EventExecutorChooserFactory
@UnstableApi
public interface EventExecutorChooserFactory {

    EventExecutorChooser newChooser(EventExecutor[] executors);

    @UnstableApi
    interface EventExecutorChooser {
        EventExecutor next();
    }
}
```

### DefaultEventExecutorChooserFactory
```java DefaultEventExecutorChooserFactory
@SuppressWarnings("unchecked")
@Override
public EventExecutorChooser newChooser(EventExecutor[] executors) {
    if (isPowerOfTwo(executors.length)) {
        return new PowerOfTwoEventExecutorChooser(executors);
    } else {
        return new GenericEventExecutorChooser(executors);
    }
}
```

#### GenericEventExecutorChooser
```java GenericEventExecutorChooser
private static final class GenericEventExecutorChooser implements EventExecutorChooser {
    private final AtomicInteger idx = new AtomicInteger();
    private final EventExecutor[] executors;

    GenericEventExecutorChooser(EventExecutor[] executors) {
        this.executors = executors;
    }

    @Override
    public EventExecutor next() {
        return executors[Math.abs(idx.getAndIncrement() % executors.length)];
    }
}
```

#### PowerOfTwoEventExecutorChooser
```java PowerOfTwoEventExecutorChooser
private static final class PowerOfTwoEventExecutorChooser implements EventExecutorChooser {
    private final AtomicInteger idx = new AtomicInteger();
    private final EventExecutor[] executors;

    PowerOfTwoEventExecutorChooser(EventExecutor[] executors) {
        this.executors = executors;
    }

    @Override
    public EventExecutor next() {
        // 位运算比除法运算的效率更高
        return executors[idx.getAndIncrement() & executors.length - 1];
    }
}
```

## 通用模式的NIO实现多路复用器是怎么跨平台的？

### NioEventLoopGroup
```java NioEventLoopGroup
public class NioEventLoopGroup extends MultithreadEventLoopGroup {
    public NioEventLoopGroup(int nThreads, Executor executor) {
        this(nThreads, executor, SelectorProvider.provider());
    }
}
```

### SelectorProvider
```java SelectorProvider
public static SelectorProvider provider() {
    synchronized (lock) {
        if (provider != null)
            return provider;
        return AccessController.doPrivileged(
            new PrivilegedAction<SelectorProvider>() {
                public SelectorProvider run() {
                        if (loadProviderFromProperty())
                            return provider;
                        if (loadProviderAsService())
                            return provider;
                        provider = sun.nio.ch.DefaultSelectorProvider.create(); // JDK rt.jar 跨平台实现的关键
                        return provider;
                    }
                });
    }
}
```

### DefaultSelectorProvider
```java DefaultSelectorProvider
public static SelectorProvider create() {
    //  MacOS/BSD
    return new KQueueSelectorProvider(); // JDK rt.jar
}
```