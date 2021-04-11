---
title: 网络协议 -- HTTP
mathjax: false
date: 2019-07-26 22:52:53
categories:
    - Network
    - Protocol
tags:
    - Network
    - Network Protocol
    - TCP
    - UDP
    - HTTP
    - HTTP 1.1
    - HTTP 2.0
    - QUIC
---

## 准备
1. 浏览器将域名发送给**DNS**服务器，解析成IP地址
2. HTTP是基于**TCP**协议的，目前使用的HTTP协议版本大部分都是1.1
    - HTTP 1.1默认开启了**Keep Alive**机制，这样建立的TCP连接，可以在多次请求中复用

<!-- more -->

## HTTP 1.1

### 请求构建
HTTP请求的报文分为三大部分：**请求行**、**首部**、**实体**
<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-http-request-fmt.png" width=800/>

```
GET / HTTP/1.1
Host: www.163.com
Connection: close
User-Agent: Paw/3.1.7 (Macintosh; OS X/10.14.6) GCDHTTPRequest
```

#### 方法
| 方法 | 用途 |
| ---- | ---- |
| GET | 获取资源 |
| POST | **创建资源** |
| PUT | **修改资源** |
| DELETE | 删除资源 |

#### 首部字段
1. 首部是Key-Value，通过**冒号**分隔
2. **Accept-Charset**：表示**客户端可以接受的字符集**
3. **Content-Type**：正文的格式

##### 缓存
高并发系统中，在真正的业务逻辑之前，都需要有个**接入层**（Nginx），将这些静态资源的请求拦截在最外面
<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-http-architecture.png" width=500/>

1. 对于静态资源，有**Varnish**缓存层，当缓存过期的时候，才会真正访问Tomcat应用集群
2. **Cache-Control**
    - 当客户端发送的请求中包含**max-age**指令时
        - 如果判定缓存层中，资源的缓存时间数值比指定的**max-age**小，那么客户端可以接受缓存的资源
    - 当指定**max-age**值为0，那么缓存层需要将请求转发给**应用集群**
3. **If-Modified-Since**
    - 如果服务器的资源在某个时间之后更新了，那么客户端就应该下载最新的资源
    - 如果没有更新，服务端会返回`304 Not Modified`的响应，那么客户端无需下载，**节省带宽**

### 请求发送
1. HTTP协议是基于**TCP协议**的，使用**面向连接**的方式发送请求，通过**stream二进制流**的方式传给对方
2. 到了**TCP层**，会把二进制流变成一个个的**报文段**发送给服务器
3. 发送的每个报文段，都需要对方返回一个**ACK**，来保证报文可靠地到达了对方
    - 如果没有返回ACK，TCP层会进行**重传**，保证可达
    - 同一个包有可能被传了很多次，HTTP层是**无感知**的，只是TCP层在埋头苦干
4. TCP发送每个报文段时，都需要加上**源地址**和**目标地址**，并将这两个信息放到**IP头**，交给**IP层**进行传输
5. IP层检查**目标地址**与自己是否在同一个**局域网**
    - 如果**是**，通过**ARP协议**来请求这个目标地址对应的Mac地址，然后将**源Mac地址**和**目标Mac地址**放入**Mac头**，发送出去
    - 如果**不是**，需要发送到**网关**，还是需要发送**ARP协议**来获取网关的MAC地址
        - 网关收到包后发现MAC地址符合，取出**目标IP地址**，根据**路由协议**找到下一跳路由器的MAC地址，发送出去
        - 路由器一跳一跳终于到达了**目标局域网**，最后一跳的路由器发现**目标IP地址**在自己的某个出口的局域网上
        - 在这个局域网上发送**ARP协议**，获得目标IP地址的MAC地址，将包发出去
6. 目标机器发现MAC地址符合，将包收起来，发现IP地址符合，解析IP头，发现是TCP协议
    - 解析TCP头，里面有**序号**，检查该序号是否需要，如果需要就放入**缓存**中，然后返回一个**ACK**，不需要就丢弃
7. TCP头里有**端口号**，HTTP服务器正在监听该端口号，目标机器将该包发送给HTTP服务器处理

### 响应构建
HTTP响应的报文分为三大部分：**状态行**、**首部**、**实体**
<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-http-response-fmt.png" width=800/>

```
HTTP/1.1 200 OK
Date: Sat, 10 Aug 2019 07:59:10 GMT
Content-Type: text/html; charset=GBK
Transfer-Encoding: chunked
Connection: close
Expires: Sat, 10 Aug 2019 08:00:30 GMT
Server: nginx
Vary: Accept-Encoding
Vary: Accept-Encoding
Cache-Control: max-age=80
Vary: User-Agent
Vary: Accept
X-Ser: BC41_dx-lt-yd-shandong-jinan-5-cache-6, BC41_dx-lt-yd-shandong-jinan-5-cache-6, BC14_lt-guangdong-jiangmen-1-cache-1
cdn-user-ip: 112.94.5.72
cdn-ip: 157.122.98.14
X-Cache-Remote: MISS
cdn-source: baishan

$body$
```

1. 状态行会返回HTTP请求的结果
2. 首部的**Content-Type**，表示返回正文的类型

### 响应返回
1. 构造好HTTP返回报文，交给**TCP层**，让TCP层将返回的HTML分成一个个报文段，并保证每个报文段都可靠到达
2. 这些报文段加上**TCP头**后会交给**IP层**，然后把刚才请求发送的过程反向走一遍
3. 客户端发现**MAC地址**和**IP地址**符合，就会上交给**TCP层**处理
4. TCP层根据**序号**判断是否是自己需要的，如果是，就会根据TCP头中的**端口号**，发送给相应的进程（**浏览器**）
5. 浏览器作为客户端会监听某个端口，当浏览器拿到HTTP报文后，会进行渲染

## HTTP 2.0
1. HTTP 1.1在应用层以**纯文本**的形式进行通信，每次通信都要带**完整的HTTP头部**，这样在**实时性**和**并发性**上都会存在问题
2. 为了解决这些问题，HTTP 2.0会对HTTP的**头部**进行一定的**压缩**
    - 将原来每次都要携带的大量Key-Value在两端都建立一个**索引表**，对**相同**的Key-Value只发送索引表中的**索引**
3. **流** + **帧**
    - HTTP 2.0协议**将一个TCP连接切分成多个流**
        - 每个流都有**ID**标识
        - 流是**双向**的，可以是客户端发往服务端，也可以是服务端发往客户端
        - 流只是一个**虚拟的通道**
        - 流具有**优先级**
    - HTTP 2.0协议将所有的传输信息**分割为更小的消息和帧**，并对它们采用**二进制格式编码**
        - 常用的帧有**Header帧**和**Data帧**
        - Header帧：用户传输**Header**，并且会**开启一个新的流**
        - Data帧：用来传输**Body**，_**多个Data帧属于同一个流**_
    - 通过**流+帧**这两种机制
        - HTTP 2.0的客户端可以**将多个请求分到不同的流**中，然后**将请求内容拆分成帧**，进行**二进制传输**
        - 帧可以**打散乱序发送**，然后**根据每个帧首部的流标识符重新组装**，并且根据**优先级**，决定优先处理哪个流的数据

### 实例
1. 假设一个页面要发送三个**独立**的请求，分别获取css、js和jpg，如果使用HTTP 1.1就是**串行**的
2. 如果使用HTTP 2.0，可以在**一个TCP连接**里**客户端**和**服务端**都可以**同时发送多个请求**
    - HTTP 2.0其实是_**将三个请求变成三个流，将数据分成帧，乱序发送到同一个TCP连接中**_
3. HTTP 2.0成功解决了HTTP 1.1的_**队首阻塞问题**_
    - HTTP 1.1：只能**严格串行地返回响应**，不允许一个TCP连接上的多个响应数据交错到达
4. HTTP 2.0采用**流+帧**的机制来实现**并行**请求和响应
    - HTTP 1.1：需要借助**Pipeline机制**（**多条TCP连接**）
5. HTTP 2.0减少了**TCP连接数**对**服务器性能**的影响，同时**将页面的多个HTTP请求通过一个TCP连接进行传输**，加快页面渲染

<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-http-v2-example-1.png" width=600/>
<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-http-v2-example-2.png" width=1000/>

## QUIC
1. HTTP 2.0虽然大大**增加了并发性**，但依然是**基于TCP协议**，而TCP协议处理包时是有**严格顺序**的
    - 当其中一个数据包出现问题，TCP连接需要等待这个数据包**完成重传**后才能继续进行
2. HTTP 2.0通过**流+帧**的机制实现了**逻辑上的并行**，但实际还是会**受限于TCP协议**
    - 样例：一前一后（序号），前面Stream 2的帧没有收到，后面Stream 1的帧也会因此**阻塞**
    - 即_**多个Stream之间是有依赖关系的**_
3. 基于这个背景催生了Google的**QUIC**协议（Quick **UDP** Internet Connections），应用场景：**Gmail**
    - 可参考[HTTP-over-QUIC to be renamed HTTP/3](https://www.zdnet.com/article/http-over-quic-to-be-renamed-http3/)
    - QUIC协议通过**基于UDP**来自定义**类似TCP**的连接、重传、多路复用、流量控制技术，进一步提高性能

### 自定义连接机制
1. 标识TCP连接：<源IP，源端口，目标IP、目标端口>，一旦一个元素发生变化，就需要**断开重连**（**三次握手，有一定时延**）
2. 基于**UDP**的QUIC协议，不再以四元组标识一个连接，而是采用**64位的随机数**（ID）
    - UDP是**无连接**的，当IP或者端口变化时，只要ID不变，就不需要重新建立连接

### 自定义重传机制
1. TCP为了保证**可靠性**，通过**序号**和**应答**机制，来解决**顺序**问题和**丢包**问题
    - 任何一个序号的包发出去，都要在一定的时间内得到应答，否则一旦超时，就会重发该序号的包
    - 超时时间是通过**采样往返时间RTT**不断调整的（即**自适应重传算法**），但存在**采样不准确**的问题
        - 样例：发送一个序号为100的包，发现没有返回，于是**重传**，然后收到ACK101，此时怎么计算RTT？
2. QUIC也有**序列号**，是**递增**的，任何一个序列号的包_**只发送一次**_
    - 发送一个包，序号为100，发现没有返回，于是重传，序号变成了101
    - 如果收到ACK100，就是对第1个包的响应，如果收到ACK101，就是对第2个包的响应，因此RTT的计算**相对准确**
    - 如何知道包100和包101发送的内容是一样的，QUIC定义了**offset**的概念
3. **QUIC是面向连接的**，跟TCP一样，是一个**数据流**，发送的数据在这个数据流里面是有**偏移量offset**的

<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-http-quic-rtt.png" width=900/>

### 无阻塞的多路复用
1. 有了自定义的**连接**和**重传**机制，就可以解决HTTP 2.0的**多路复用问题**（**阻塞**）
2. 与HTTP 2.0一样，**同一条QUIC连接上可以创建多个Stream，来发送多个HTTP请求**
3. QUIC是基于**UDP**的，一个QUIC连接上的_**多个Stream之间是没有依赖关系的**_
    - 假如前面Stream 2丢了一个UDP包，后面跟着Stream 3的一个UDP包
    - 虽然Stream 2丢失的那个UDP需要重传，但Stream 3的UDP包可以直接发送给用户，**不会被阻塞**

### 自定义流量控制
1. TCP的流量控制是通过**滑动窗口协议**
2. QUIC的流量控制也是通过**window_update**，来告诉发送端它可以接受的**字节数**
    - QUIC的窗口是**适应自己的多路复用机制的**：不仅在一个**连接**上控制窗口，还在每个**Stream**上控制窗口
3. 在TCP协议中，**接收端窗口的起始点**：_**下一个要接收并且ACK的包**_
    - TCP的ACK机制是**基于序列号的累计应答**：_**哪怕后面的包先到，并且已经放在缓存里，窗口也不能右移**_
    - 这样就会导致后面的包虽然到了，但由于不能ACK，也有可能**超时重传**，**浪费带宽**
4. QUIC的ACK是**基于offset**的
    - 每个offset的包来了，放进了缓存，就可以ACK了，ACK后对应的包就不会重发，中间的空档会等待到来或者重发即可
    - 窗口的起始位置为**当前收到的最大offset**，从该offset到**当前Stream所能容纳的最大缓存**，为**真正的窗口大小**
    - 显然，这种方式**更加准确**
5. 而**整个连接**的窗口，需要**统计**所有的Stream的窗口

<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-http-quic-flow-control.png" width=800/>
