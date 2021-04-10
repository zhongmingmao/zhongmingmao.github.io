---
title: Java性能 -- 优化RPC网络通信
mathjax: false
date: 2019-08-07 10:50:00
categories:
    - Java
    - Performance
tags:
    - Java
    - Java Performance
    - RPC
    - Network
---

## 服务框架的核心
1. 大型服务框架的核心：**RPC通信**
2. 微服务的核心是**远程通信**和**服务治理**
    - 远程通信提供了**服务之间通信的桥梁**，服务治理提供了**服务的后勤保障**
3. 服务的拆分增加了**通信的成本**，因此**远程通信**很容易成为**系统瓶颈**
    - 在满足一定的服务治理需求的前提下，对**远程通信的性能**需求是技术选型的**主要影响因素**
4. 很多**微服务框架**中的服务通信是基于**RPC通信**实现的
    - 在没有进行组件扩展的前提下，Spring Cloud是基于Feign组件实现RPC通信（基于**HTTP+JSON**序列化）
    - Dubbo是基于**SPI**扩展了很多RPC通信框架，包括RMI、Dubbo、Hessian等（默认为**Dubbo+Hessian**序列化）

<!-- more -->

### 性能测试
基于Dubbo:2.6.4，**单一TCP长连接+Protobuf**（响应时间和吞吐量更优），**短连接的HTTP+JSON序列化**
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-rpc-benchmark-rt.jpg" width=1000/>
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-rpc-benchmark-tps.jpg" width=1000/>

## RPC通信

### 架构演化
无论是微服务、SOA、还是RPC架构，都是**分布式服务架构**，都需要实现**服务之间的互相通信**，通常把这种通信统称为**RPC通信**
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-rpc-architecture-evolution.jpg" width=1000/>

### 概念
1. RPC：Remote Process Call，**远程服务调用**，通过网络请求远程计算机程序服务的通信技术
2. RPC框架封装了**底层网络通信**和**序列化**等技术
    - 只需要在项目中引入**各个服务的接口包**，就可以在代码中调用RPC服务（如同调用**本地方法**一样）

### RMI
1. RMI：Remote Method Invocation
2. RMI是**JDK自带**的RPC通信框架，已经成熟地应用于**EJB**和**Spring**，是**纯Java**网络分布式应用系统的核心解决方案
3. RMI实现了一台虚拟机应用对远程方法的调用可以同对本地方法调用一样，RMI封装好了远程通信的具体细节

#### 实现原理
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-rpc-rmi-principle.jpg" width=1000/>

1. RMI**远程代理对象**是RMI中**最核心**的组件，除了对象本身所在的虚拟机，其他虚拟机也可以调用此对象的方法
2. 这些虚拟机可以分布在**不同的主机**上，通过远程代理对象，远程应用可以用网络协议和服务进行通信

#### 高并发下的性能瓶颈
1. **Java默认序列化**
    - RMI的序列化方式采用的是Java默认序列化，**性能不好**，而且**不支持跨语言**
2. **TCP短连接**
    - RMI是基于**TCP短连接**实现的，在高并发情况下，大量请求会带来大量TCP连接的**创建**和**销毁**，**非常消耗性能**
3. **阻塞式网络IO**
    - Socket编程中使用**传统的IO模型**，在高并发场景下基于**短连接**实现的网络通信就很容易产生**IO阻塞**，**性能将大打折扣**

### 优化路径

#### TCP / UDP
1. 网络传输协议有**TCP**和**UDP**，两个协议都是基于Socket编程
2. 基于TCP协议实现的Socket通信是**有连接**的
    - 传输数据要通过**三次握手**来实现数据传输的**可靠性**，而传输数据是**没有边界**的，采用的是**字节流**模式
3. 基于UDP协议实现的Socket通信，客户端不需要建立连接，只需要创建一个套接字发送数据给服务端
    - 基于UDP协议实现的Socket通信具有**不可靠性**
    - UDP发送的数据采用的是**数据报**模式，每个UDP的数据报都有一个长度，该长度与数据一起发送到服务端
4. 为了保证**数据传输的可靠性**，通常情况下会采用**TCP协议**
    - 在局域网且对数据传输的可靠性没有要求的情况下，可以考虑使用UDP协议，UDP协议的效率比TCP协议高

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-rpc-tcp-udp.jpg" width=1000/>

#### 长连接
1. 服务之间的通信不同于客户端与服务端之间的通信
2. 由于客户端数量众多，基于**短连接**实现请求，可以避免长时间地占用连接，导致系统资源浪费
3. 服务之间的通信，连接的消费端不会像客户端那么多，但消费端向服务端请求的数量却一样多
    - 基于**长连接**实现，可以省去大量建立TCP连接和关闭TCP连接的操作，从而**减少系统的性能消耗**，节省时间

#### 优化Socket通信
1. 传统的Socket通信主要存在**IO阻塞，线程模型缺陷以及内存拷贝**等问题，Netty4对Socket通信编程做了很多方面的优化
2. 实现**非阻塞IO**：多路复用器**Selector**实现了非阻塞IO通信
3. 高效的**Reactor线程模型**
    - Netty使用了**主从Reactor多线程模型**
    - **主线程**：用于客户端的**连接**请求操作，一旦连接建立成功，将会**监听IO事件**，监听到事件后会创建一个**链路请求**
    - 链路请求将会注册到负责IO操作的**IO工作线程**上，由IO工作线程负责后续的IO操作
    - Reactor线程模型解决了在**高并发**的情况下，由于单个NIO线程无法监听海量客户端和满足大量IO操作造成的问题
4. **串行设计**
    - 服务端在接收消息之后，存在着编码、解码、读取和发送等**链路**操作
    - 如果这些操作基于**并行**实现，无疑会导致**严重的锁竞争**，进而导致系统的**性能下降**
    - 为了提升性能，Netty采用**串行无锁化**完成链路操作，提供了**Pipeline**，实现链路的各个操作在运行期间**不会切换线程**
5. **零拷贝**
    - 数据从**内存**发到**网络**中，存在**两次拷贝**，先是从**用户空间**拷贝到**内核空间**，再从**内核空间**拷贝到**网络IO**
    - NIO提供的ByteBuffer可以使用**Direct Buffer**模式
        - 直接开辟一个**非堆物理内存**，不需要进行字节缓冲区的二次拷贝，可以**直接将数据写入到内核空间**
6. 优化**TCP参数**配置，提高**网络吞吐量**，Netty可以基于ChannelOption来设置
    - **TCP_NODELAY**：用于控制是否开启**Nagle算法**
        - Nagle算法通过**缓存**的方式将小的数据包组成一个大的数据包，从而**避免大量发送小的数据包**，导致**网络阻塞**
        - 在对**时延敏感**的应用场景，可以选择**关闭**该算法
    - **SO_RCVBUF** / **SO_SNDBUF**：Socket**接收缓冲区**和**发送缓冲区**的大小
    - **SO_BACKLOG**：指定**客户端连接请求缓冲队列的大小**
        - 服务端处理客户端**连接请求**是**按顺序**处理的，_**同一时间只能处理一个客户端连接**_
        - 当有多个客户端进来的时候，服务端将不能处理的客户端连接请求放在队列中等待处理
    - **SO_KEEPALIVE**
        - 连接会检查**长时间没有发送数据的客户端的连接状态**，检测到客户端断开连接后，服务端将**回收**该连接
        - 将该值设置得小一些，可以提高回收连接的效率

#### 定制报文格式
1. 设计一套报文，用于描述具体的校验、操作、传输数据等内容
2. 为了提高传输效率，可以根据实际情况来设计，尽量实现**报体小，满足功能，易解析**等特性

| 字段 | 长度（字节） | 备注 |
| ---- | ---- | ---- |
| 魔数 | 4 | **协议的标识**，类似于字节码的魔数，通常为固定数字 |
| 版本号 | 1 | |
| 序列化算法 | 1 | Protobuf / Thrift |
| 指令 | 1 | 类似于HTTP中的增删改查 |
| 数据长度 | 4 | |
| 数据 | N | |

#### 编解码
1. 实现一个通信协议，需要**兼容优秀的序列化框架**
2. 如果只是单纯的数据对象传输，可以选择性能相对较好的**Protobuf序列化**，有利于提高网络通信的性能

#### Linux的TCP参数设置
三次握手
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-rpc-3-way-handshake.jpg" width=600/>

四次挥手
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-rpc-4-way-handshake.jpg" width=600/>

| 配置项 | 备注 |
| ---- | ---- |
| fs.file-max = 194448 / ulimit | Linux默认**单个进程**可以打开的文件数量上限为1024，Socket也是文件  |
| net.ipv4.tcp_keepalive_time | 与Netty的**SO_KEEPALIVE**配置项的作用一致 |
| net.ipv4.tcp_max_syn_backlog | **SYN队列的长度**，加大队列长度，可以容纳更多**等待连接**的网络连接数 |
| net.ipv4.ip_local_port_range | 客户端连接服务器时，需要动态分配源端口号，该配置项表示**向外连接的端口范围** |
| net.ipv4.tcp_max_tw_buckets | 1. 当一个连接关闭时，TCP会通过**四次挥手**来完成一次关闭连接操作，在请求量比较大的情况下，消费端会有大量**TIME_WAIT**状态的连接<br/>2. 该参数可以限制TIME_WAIT状态的连接数量，如果TIME_WAIT的连接数量超过该值，TIME_WAIT将会立即被清除掉并打印警告信息 |
| net.ipv4.tcp_tw_reuse | 1. 客户端每次连接服务器时，都会获得一个**新的源端口**以实现**连接的唯一性**，在TIME_WAIT状态的连接数量过大的情况下，会增加端口号的占用时间<br/>2. 由于处于TIME_WAIT状态的连接属于**关闭**连接，所以新创建的连接可以**复用**该端口号 |

## 参考资料
[Java性能调优实战](https://time.geekbang.org/column/intro/100028001)
