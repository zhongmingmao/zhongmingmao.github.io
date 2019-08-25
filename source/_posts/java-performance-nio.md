---
title: Java性能 -- NIO
mathjax: false
date: 2019-08-12 17:01:50
categories:
    - Java
    - Performance
tags:
    - Java
    - Java Performance
    - BIO
    - NIO
    - AIO
    - Tomcat
    - Select
    - Poll
    - Epoll
    - Zero Copy
    - mmap
    - Reactor
---

## BIO / NIO
1. 在**Tomcat 8.5**之前，默认使用**BIO**线程模型，在高并发的场景下，可以设置为**NIO**线程模型，来提供系统的**网络通信性能**
2. 页面请求用于模拟**多IO读写**操作的请求，Tomcat在IO读写请求比较多的情况下，使用NIO线程模型有明显的优势

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-nio-bio-rt.png" width=1000/>

<!-- more -->

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-nio-bio-tps.png" width=1000/>

## 网络IO模型优化
网络通信中，最底层的是操作系统**内核**中的网络IO模型，分别为**阻塞式IO**、**非阻塞式IO**、**IO复用**、**信号驱动式IO**、**异步IO**

### TCP工作流程
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-nio-bio-tcp.jpg" width=800/>

1. 首先，应用程序通过**系统调用socket**，创建一个套接字，它是系统分配给应用程序的一个**文件描述符**
2. 其次，应用程序通过**系统调用bind**，绑定**地址**和的**端口号**，给套接字**命名**一个名称
3. 然后，**系统调用listen**，创建一个**队列**用于**存放客户端进来的连接**
4. 最后，应用程序通过**系统调用accept**来**监听客户端的连接请求**
5. 当有一个客户端连接到服务端后，服务端会通过**系统调用fork**，创建一个子进程
    - 通过**系统调用read**监听客户端发来的消息，通过**系统调用write**向客户端返回消息

### 阻塞式IO
每一个连接**创建**时，都需要一个**用户线程**来处理，并且在IO操作没有**就绪**或者**结束**时，线程会被挂起，进入**阻塞等待**状态

#### connect阻塞
1. 客户端通过**系统调用connect**发起TCP连接请求，TCP连接的建立需要完成**三次握手**
2. 客户端需要**阻塞等待**服务端返回的ACK和SYN，服务端需要**阻塞等待**客户端的ACK

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-nio-bio-connect.png" width=800/>

#### accept阻塞
服务端通过**系统调用accept**接收客户端请求，如果没有新的客户端连接到达，服务端进程将被挂起，进入**阻塞**状态
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-nio-bio-accept.png" width=800/>

#### read、write阻塞
Socket连接创建成功后，服务端调用fork创建子进程，调用read等待客户端写入数据，如果没有，子进程被挂起，进入**阻塞**状态
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-nio-bio-read.png" width=800/>

### 非阻塞式IO
1. 使用`fcntl`把上面的操作都设置为**非阻塞**，如果没有数据返回，直接返回`EWOULDBLOCK`或`EAGAIN`错误，进程不会被阻塞
2. 最传统的非阻塞IO模型：设置一个**用户线程**对上面的操作进行**轮询检查**

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-nio-not-block-io.png" width=800/>

### IO复用
1. 传统的非阻塞IO模型使用**用户线程**去**轮询检查**一个IO操作的状态，**无法应对大量请求的情况**
2. Linux提供了**IO复用函数**：**select**、**poll**、**epoll**
    - 进程将一个或多个读操作通过**系统调用函数**，阻塞在函数操作上，_**系统内核去侦测多个读操作是否处于就绪状态**_

#### select
1. 在超时时间内，监听**用户感兴趣的文件描述符**上的**可读可写**和**异常**事件的发生
2. Linux内核将所有**外部设备**看做**文件**，对文件的读写操作会调用内核提供的系统命令，返回一个**文件描述符**（fd）
3. select函数监听的文件描述符分为三类：**readset**、**writeset**、**exceptset**（异常事件）
4. 调用select函数后会**阻塞**，直到**有文件描述符就绪**或**超时**，函数返回
5. 当select函数返回后，可以通过**FD_ISSET**函数遍历fdset（readset/writeset/exceptset），来找到**就绪**的文件描述符

```c
int select(int maxfdp1,fd_set *readset,fd_set *writeset,fd_set *exceptset,const struct timeval *timeout)

int FD_ISSET(int fd, fd_set *fdset);    // 检查集合中指定的文件描述符是否可以读写
```

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-nio-select.png" width=800/>

#### poll
1. 每次调用select函数之前，系统需要把fd从**用户态**拷贝到**内核态**（交由内核侦测），带来一定的**性能开销**
2. 单个进程监视的fd数量默认为**1024**（可以**修改宏定义**或者**重新编译内核**）
3. 另外**fd_set**是基于**数组**实现的，在**新增**和**删除**fd时，时间复杂度为`O(n)`（因此fd_set不宜过大）
4. poll的机制与select类似，**本质上差别不大**（轮询），只是**poll没有最大文件描述符数量的限制**
5. poll和select存在相同的缺点
    - 包含大量文件描述符的**数组**被**整体复制**到**用户态**和**内核态**的地址空间，**无论这些文件描述符是否就绪**
    - 系统开销会随着文件描述符的增加而**线性增大**

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-nio-poll.png" width=800/>

#### epoll
1. select/poll是**顺序扫描**fd是否就绪，而且支持的**fd数量不宜过大**
2. Linux 2.6提供了epoll调用，epoll使用**事件驱动**的方式代替轮询扫描fd
3. epoll事先通过`epoll_ctl`来**注册**一个**文件描述符**，将文件描述符存放在**内核**的一个**事件表**中
    - 该事件表是基于**红黑树**实现的，在大量IO请求的场景下，其**插入和删除的性能**比select/poll的**数组**fd_set要好
    - 因此epoll的**性能更好**，而且**没有fd数量的限制**
4. epoll_ctl函数的参数解析
    - epfd：由`epoll_create`函数生成的一个**epoll专用文件描述符**
    - op：操作事件类型
    - fd：关联的文件描述符
    - event：监听的事件类型
5. 一旦某个文件描述符就绪，操作系统**内核**会采用类似**Callback**的回调机制，迅速激活该文件描述符
    - 当进程调用`epoll_wait`时便得到通知，之后进程将完成相关的IO操作

```c
int epoll_ctl(int epfd, int op, int fd, struct epoll_event event)

int epoll_wait(int epfd, struct epoll_event events,int maxevents,int timeout)
```

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-nio-epoll.png" width=800/>

### 信号驱动式IO
1. 信号驱动式IO类似于**观察者模式**，**内核是观察者**，**信号回调是通知**
2. 用户进程发起一个IO请求操作，通过**系统调用sigaction**，给对应的Socket**注册**一个**信号回调**
    - 此时**不阻塞用户进程**，用户进行继续工作
3. 当**内核数据就绪**时，操作系统**内核**为**该进程**生成一个**SIGIO信号**，通过信号回调通知进程进行相关IO操作
4. 相比于前三种IO模型，在**等待数据就绪时进程不被阻塞**，主循环可以继续工作，**性能更佳**
5. 但对于**TCP**来说，信号驱动式IO**几乎没有被使用**
    - 因为SIGIO信号是一种**UNIX信号**，**没有附加信息**
    - 如果一个信号源有多种产生信号的原因，信号接收者无法确定实际发生了什么
    - 而TCP Socket生产的信号事件有**七种**之多，进程收到SIGIO信号后也根本没法处理
6. 而对于**UDP**来说，信号驱动式IO**已经有所应用**，例如NTP服务器
    - 因为UDP**只有一个数据请求事件**
    - 在**正常**情况下，UDP进程只要捕获到SIGIO信号，就调用`recvfrom`读取到达的数据报
    - 在**异常**情况下，就返回一个异常错误

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-nio-sig.png" width=800/>

### 异步IO
1. 虽然信号驱动式IO在等待数据就绪时，不会阻塞进程，但在**被通知后进行的IO操作还是阻塞的**
    - 进程会_**等待数据从内核空间复制到用户空间**_
2. 异步IO实现了**真正的非阻塞IO**
    - 用户进程发起一个IO请求操作，系统会告知内核启动某个操作，并让内核在**整个操作**完成后通知用户进程
    - 整个操作包括：**等待数据就绪**、_**数据从内核空间复制到用户空间**_
3. **Linux不支持异步IO**，Windows支持异步IO，因此生产环境中很少用到异步IO模型

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-nio-aio.png" width=800/>

### Java NIO

#### Selector
Java NIO使用了**IO复用器Selector**实现**非阻塞IO**，Selector使用的是**IO复用模型**，**Selector是select/poll/epoll的外包类**

#### SelectionKey
Socket通信中的connect、accept、read/write是**阻塞**操作，分别对应SelectionKey的四个**监听事件**
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-nio-selectionkey.png" width=800/>

#### 服务端编程
1. 首先，创建**ServerSocketChannel**，用于**监听客户端连接**
2. 然后，创建**Selector**，将ServerSocketChannel**注册**到Selector，应用程序会通过Selector来轮询注册在其上的Channel
    - 当发现有一个或多个Channel处于就绪状态，返回就绪的监听事件，最后进行相关的IO操作
3. 在创建Selector时，应用程序会根据**操作系统版本**选择使用哪种IO复用函数
    - **JDK 1.5 + Linux 2.6 -> epoll**
    - 由于**信号驱动式IO对TCP通信不支持**，以及**Linux不支持异步IO**，因此大部分框架还是基于**IO复用模型**实现网络通信

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-nio-server.jpg" width=800/>

```java
// 功能：向每个接入的客户端发送Hello字符串

// 创建ServerSocketChannel，配置为非阻塞模式
ServerSocketChannel serverSocketChannel = ServerSocketChannel.open();
serverSocketChannel.configureBlocking(false);
// 绑定监听
serverSocketChannel.socket().bind(new InetSocketAddress(8080));
// 创建单独的IO线程，用于轮询多路复用器Selector
Selector selector = Selector.open();
// 创建Selector，将之前创建的serverSocketChannel注册到Selector上，监听OP_ACCEPT
serverSocketChannel.register(selector, SelectionKey.OP_ACCEPT);
// 轮询就绪的Channel
while (true) {
    try {
        selector.select();
        Set<SelectionKey> keys = selector.selectedKeys();
        for (Iterator<SelectionKey> it = keys.iterator(); it.hasNext(); ) {
            SelectionKey key = it.next();
            it.remove();
            try {
                if (key.isAcceptable()) {
                    // 新的客户端接入
                    ServerSocketChannel server = (ServerSocketChannel) key.channel();
                    SocketChannel client = server.accept();
                    client.configureBlocking(false);
                    // 将客户端的Channel注册到Selector上，监听OP_WRITE
                    client.register(selector, SelectionKey.OP_WRITE);
                } else if (key.isWritable()) {
                    SocketChannel client = (SocketChannel) key.channel();
                    ByteBuffer buffer = ByteBuffer.wrap("Hello".getBytes());
                    client.write(buffer);
                    key.cancel();
                }
            } catch (IOException e) {
                key.cancel();
                try {
                    key.channel().close();
                } catch (IOException ignored) {
                }
            }
        }
    } catch (IOException e) {
        break;
    }
}
```

## 零拷贝
1. 在**IO复用模型**中，执行**读写IO**操作依然是**阻塞**的，并且存在多次**内存拷贝**和**上下文切换**，增加**性能开销**
2. 零拷贝是一种**避免多次内存复制**的技术，用来**优化读写IO操作**
3. 在网络编程中，通常由read、write来完成一次IO读写操作，每次IO读写操作都需要完成**4次内存拷贝**
    - 路径：_**IO设备 -> 内核空间 -> 用户空间 -> 内核空间 -> 其他IO设备**_

### Linux mmap
1. Linux内核中的**mmap**函数可以代替read、write的IO读写操作，实现**用户空间和内核空间共享一个缓存数据**
2. mmap将用户空间的一块地址和内核空间的一块地址_**同时映射到相同的一块物理内存地址**_
    - 不管是用户空间还是内核空间都是**虚拟地址**，最终都要映射到**物理内存地址**
3. 这种方式**避免了内核空间与用户空间的数据交换**
4. IO复用的**epoll**函数也是利用了**mmap**函数**减少了内存拷贝**

### Java NIO
1. Java NIO可以使用**Direct Buffer**来实现内存的零拷贝
2. Java直接在**JVM内存之外**开辟一个**物理内存空间**，这样**内核**和**用户进程**都能**共享**一份缓存数据

## 线程模型优化
1. 一方面**内核**对**网络IO模型**做了优化，另一方面**NIO**在**用户层**也做了优化
2. NIO是基于**事件驱动**模型来实现IO操作
3. Reactor模型是**同步IO事件处理**的一种常见模型
    - 将IO事件**注册**到多路复用器上，一旦有IO事件触发，多路复用器会将事件**分发**到**事件处理器**中，执行就绪的IO事件操作

### Reactor模型的组件
1. **事件接收器Acceptor**
    - 主要负责**接收请求连接**
2. **事件分离器Reactor**
    - 接收请求后，会将建立的连接注册到分离器中，依赖于循环监听多路复用器Selector
    - 一旦监听到事件，就会将事件**分发**到事件处理器
3. **事件处理器Handler**
    - 事件处理器主要完成相关的事件处理，比如读写IO操作

### 单线程Reactor
1. 最开始NIO是基于**单线程**实现的，所有的IO操作都在一个NIO线程上完成
2. 由于NIO是**非阻塞IO**，理论上一个线程可以完成所有IO操作
3. 但NIO并**没有真正实现非阻塞IO**，因为**读写IO**操作时用户进程还是处于**阻塞**状态
4. 在高并发场景下会存在**性能瓶颈**，一个NIO线程也无法支撑**C10K**

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-nio-reactor-single-thread.png" width=800/>

### 多线程Reactor
1. 为了解决单线程Reactor在高并发场景下的性能瓶颈，后来采用了**线程池**
2. 在**Tomcat**和**Netty**中都使用了**一个Acceptor线程**来监听连接请求事件
    - 当连接成功后，会将建立的连接注册到多路复用器中，一旦监听到事件，将交给**Worker线程池**来负责处理
    - 在大多数情况下，这种线程模型可以满足性能要求，但如果连接的客户端很多，一个Acceptor线程也会存在性能瓶颈

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-nio-reactor-multi-thread.png" width=800/>

### 主从Reactor
1. 现在主流通信框架中的**NIO通信框架**都是基于**主从Reactor线程模型**来实现的
2. 主从Reactor：Acceptor不再是一个单独的NIO线程，而是一个**线程池**
    - Acceptor接收到客户端的TCP连接请求，建立连接后，后续的IO操作将交给Worker线程处理

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-nio-reactor-master-slave.png" width=800/>

### Tomcat

#### 原理
1. 在Tomcat中，BIO和NIO是基于**主从Reactor线程模型**实现的
2. 在**BIO**中，Tomcat中的Acceptor只负责监听新的连接，一旦连接建立，监听到IO操作，就会交给Worker线程处理
3. 在**NIO**中，Tomcat新增一个**Poller线程池**
    - Acceptor监听到连接后，不是直接使用Worker线程处理请求，而是先将请求发送给**Poller缓冲队列**
    - 在Poller中，维护了一个**Selector对象**，当Poller从缓冲队列中取出连接后，注册到该Selector中
    - 然后，通过遍历Selector，找出其中就绪的IO操作，并交给Worker线程处理

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-nio-tomcat.png" width=800/>

#### 配置参数
1. **acceptorThreadCount**
    - Acceptor的线程数量，默认1
2. **maxThreads**
    - 专门处理IO操作的Worker线程数量，默认200（不一定越大越好）
3. **acceptCount**
    - Acceptor线程负责从**accept队列**中取出连接，然后交给Worker线程处理
    - acceptCount指的是**accept队列的大小**
    - 当HTTP**关闭Keep Alive**，并发量会增大，可以适当调大该值
    - 当HTTP**开启Keep Alive**，而Worker线程数量有限，并且有可能被长时间占用，**连接在accept队列中等待超时**
        - 如果accept队列过大，很容易造成连接浪费
4. **maxConnections**
    - 表示可以有多少个Socket连接到Tomcat上，默认10000
    - 在**BIO**模式中，一个线程只能处理一个连接，一般maxThreads与maxConnections的值相同
    - 在**NIO**模式中，一个线程可以同时处理多个连接，maxThreads应该比maxConnections大很多
