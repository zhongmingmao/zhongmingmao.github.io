---
title: 网络编程 -- TCP三次握手
mathjax: false
date: 2019-08-28 14:47:08
categories:
    - Network
    - Programming
tags:
    - Network
    - Network Programming
    - TCP
---

## 服务端准备连接

### 创建套接字
```c
int socket(int domain, int type, int protocol)
```
1. domain指的是**PF_INET、PF_INET6、PF_LOCAL**等，表示什么样的套接字
2. type
    - **SOCK_STREAM**：表示**字节流**，对应**TCP**
    - **SOCK_DGRAM**：表示**数据报**，对应**UDP**
    - **SOCK_RAW**：表示**原始套接字**
3. protocol原本用来指定通信协议，但现在基本废弃，一般写成**0**即可

<!-- more -->

### bind
```c
bind(int fd, sockaddr * addr, socklen_t len)
```
1. 调用bind函数把**套接字**（fd）和**套接字地址**（addr）绑定
2. 第二个参数为**通用地址格式**`sockaddr * addr`，实际传入的参数可能为**IPv4、IPv6或者本地套接字格式**
    - bind函数会根据len字段（表示传入的地址长度）判断传入的addr参数该怎么解析

#### 使用者 / 实现者
对于**使用者**来说，每次需要将IPv4、IPv6或者本地套接字格式转化为**通用套接字格式**
```c
struct sockaddr_in name;
bind (sock, (struct sockaddr *) &name, sizeof (name))
```

对于**实现者**来说，可以根据该地址结构的**前两个字节**判断出是那种地址，为了处理可变长度的结构，需要借助**len**字段

#### 地址 / 端口
1. 可以把地址设置为**本机IP地址**
    - 告诉操作系统内核，仅仅对目标IP是本机IP地址的IP包进行处理，但并不能提前预知应用会被部署到哪台机器上
2. **通配地址**：一台机器有两块网卡，向这两块网卡发送的IP包都会被处理
    - IPv4：**INADDR_ANY**；IPv6：**IN6ADDR_ANY**
3. 如果将端口设置为**0**，相当于把**端口的选择权**交给操作系统**内核**（根据一定的算法选择一个**空闲**的端口），**在服务端不常用**

初始化IPv4 TCP套接字（socket + bind）
```java
#include <stdio.h>
#include <stdlib.h>
#include <sys/socket.h>
#include <netinet/in.h>

int make_socket (uint16_t port)
{
  int sock;
  struct sockaddr_in name;

  /* 创建字节流类型的IPV4 socket */
  sock = socket (PF_INET, SOCK_STREAM, 0);
  if (sock < 0)
    {
      perror ("socket");
      exit (EXIT_FAILURE);
    }

  /* 绑定到port和ip */
  name.sin_family = AF_INET; /* IPV4 */
  name.sin_port = htons (port);  /* 指定端口 */
  name.sin_addr.s_addr = htonl (INADDR_ANY); /* 通配地址 */
  /* 把IPV4地址转换成通用地址格式，同时传递长度 */
  if (bind (sock, (struct sockaddr *) &name, sizeof (name)) < 0)
    {
      perror ("bind");
      exit (EXIT_FAILURE);
    }

  return sock
}
```

### listen
1. 初始化创建的套接字，是一个**主动**套接字，目的是之后**主动发起请求**（调用**connect**函数）
2. 通过调用**listen**函数，将原来的**主动**套接字转换为**被动**套接字，目的是之后用来**等待用户请求**

```c
// socketfd：套接字描述符
// backlog：未完成连接队列的大小，决定了可以接收的并发数目，参数过大会占用过多的系统资源，Linux不允许修改该参数
// 返回值为listen套接字
int listen (int socketfd, int backlog)
```

### accept
1. 当客户端的连接请求到达时，服务端应答成功，连接建立
    - 此时操作系统**内核**需要把这个事件**通知**到应用程序，并让应用程序感知到这个连接
2. accept函数的作用：_**连接建立后，操作系统内核和应用程序之间的桥梁**_
3. **listen套接字一直存在**，要为成千上万的客户服务，直到这个listen套接字关闭
    - 一旦一个客户与服务器连接成功，**完成TCP三次握手**，操作系统就会为这个客户**生成一个已连接套接字**
    - 服务器使用这个已连接套接字和客户进行通信处理
    - 如果服务器完成了对客户的服务，就会**关闭已连接套接字**，这样就完成了**TCP连接的释放**

```c
// listensockfd：listen套接字，经过socket、bind、listen操作后得到的套接字
// 函数的返回值有两部分
//  1. cliaddr：通过指针方式获取的客户端地址；addrlen：客户端地址的大小
//  2. 函数的返回值，是一个全新的描述字，代表了与客户端的连接
int accept(int listensockfd, struct sockaddr *cliaddr, socklen_t *addrlen)
```

## 客户端发起连接
第一步和服务端一样，创建一个套接字（可以不bind）

### connect
1. 客户端和服务器建立连接，是通过**connect**函数完成的
2. 客户端在**调用函数connect前可以不调用bind函数**
    - 如果调用，内核会确定**源IP地址**，并按照一定的算法选择一个**临时端口**作为**源端口**
3. 如果是TCP套接字，那么调用connect函数会激发TCP的三次握手，仅在**连接成功建立或出错**时返回
    - 三次握手无法建立，客户端发出的**SYN**包没有任何响应，返回**TIMEOUT**错误
        - 常见场景：服务器**IP**写错
    - 客户端收到了**RST**（复位）应答，此时客户端会返回**CONNECTION REFUSED**错误
        - 常见场景：服务器**端口**写错
        - RST是TCP在发生错误时发送的一种**TCP分节**
        - 产生RST的条件
            - 目的地为某端口的SYN到达，然而并没有监听该端口的服务
            - TCP想取消一个已有连接
            - TCP接收到一个根本不存在的连接上的分节
    - 客户端发出的**SYN**包在网络上引起**destination unreachable**，即**目标不可达**错误
        - 场景场景：客户端与服务端**路由不通**

```c
// sockfd：连接套接字，通过前面的socket函数创建
// servaddr：指向套接字地址结构（包含服务器的IP和端口）的指针
int connect(int sockfd, const struct sockaddr *servaddr, socklen_t addrlen)
```

## TCP三次握手
1. 服务器端通过socket、bind和listen完成了**被动套接字**的准备工作，然后调用accept，就会**阻塞等待**客户端的连接
2. 客户端通过调用socket和connect函数后，也会**阻塞等待**
3. 接下来的过程由操作系统内核的**网络协议栈**完成

### 网络协议栈
1. 客户端的网络协议栈向服务器端发送**SYN**包，告诉服务器端当前发送序列号为j，客户端进入**SYNC_SENT**状态
2. 服务器端的网络协议栈收到这个SYN包后，和客户端进行**ACK**应答，应答值为j+1，表示对SYN包的确认
    - 同时服务器也发送一个**SYN**包，告诉客户端当前服务器端的发送序列号为k，服务器端进入**SYNC_RCVD**状态
3. 客户端的网络协议栈收到**ACK**包后，使得应用程序_**从connect阻塞调用返回**_
    - 表示**客户端到服务端的单向连接建立成功**，客户端的状态为**ESTABLISHED**
    - 同时客户端的网络协议栈也会对服务器端的SYN包进行ACK应答，应答值为k+1
4. ACK包到达服务器端后，服务器端的网络协议栈使得应用程序_**从accept阻塞调用返回**_
    - 表示**服务器端到客户端的单向连接也建立成功**，服务器端也进入了**ESTABLISHED**状态
