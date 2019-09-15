---
title: 网络编程 -- Socket + Address
mathjax: false
date: 2019-08-23 12:53:22
categories:
    - Network
    - Programming
tags:
    - Network
    - Network Programming
    - Socket
---

## Socket通信
<img src="https://network-programming-1253868755.cos.ap-guangzhou.myqcloud.com/network-programming-socket.jpg" width=1000/>

<!-- more -->

1. 在客户端发起连接请求之前，服务器端需要先完成**初始化**
2. 服务器端初始化过程
    - 初始化socket
    - 然后执行**bind**函数，将服务器端的服务能力绑定到地址和端口上
    - 然后执行**listen**函数，将原先的socket转换为服务器端socket
    - 服务器端最后阻塞在**accept**上等待客户端请求的到来
3. 客户端初始化socket，再执行**connect**向服务器端的地址和端口发起连接请求，即**TCP三次握手**
4. 一旦TCP三次握手完成，客户端和服务器端建立连接，进入**数据传输**过程
    - 客户端进程向操作系统内核发起**write**字节流写操作，内核协议栈将字节流通过网络设备传输到服务器端
    - 服务器端从内核得到信息，将字节流从内核读入到进程中，并开始业务逻辑的处理
    - 处理完之后，服务器端再将处理结果以同样的方式写给客户端
    - 一旦连接建立，数据的传输是**双向**的
5. 当客户端完成与服务器端的交互后，需要和服务器端断开连接时，会执行**close**函数
    - 操作系统内核此时会通过原先的连接链路向服务器端发送一个**FIN**包，服务器端收到之后执行**被动关闭**
    - 此时整个链路处于**半关闭状态**，此后，服务器端也会执行**close**函数，整个链路才会**真正关闭**
    - 在**半关闭**状态下，发起close请求的一方在没有收到对方FIN包之前都认为连接是**正常**的
    - 在**全关闭**状态下，双方都感知到连接已经关闭
6. socket是**建立连接、传输数据**的**唯一途径**

## Socket地址格式

### 通用Socket地址格式
```java
/* POSIX.1g 规范规定了地址族为2字节的值. */
typedef unsigned short int sa_family_t;

/* 描述通用套接字地址 */
struct sockaddr {
    sa_family_t sa_family;  /* 地址族. 16-bit */
    char sa_data[14];   /* 具体的地址值. 112-bit */
};
```
1. 第一个字段为**地址族**，表示使用什么样的方式对地址进行解释和保存
2. 常用地址族（AF：Address Family，PF：Protocol Family）
    - **AF_LOCAL**
        - **本地地址**，对应的是UNIX套接字，一般用于本地socket通信，很多情况下可以写成AF_UNIX、AF_FILE
    - **AF_INET**
        - IPv4地址
    - **AF_INET6**
        - IPv6地址

### IPv4 Socket地址格式
```java
/* IPV4套接字地址，32bit值. */
typedef uint32_t in_addr_t;
struct in_addr {
    in_addr_t s_addr;
};

/* 描述IPV4的套接字地址格式  */
struct sockaddr_in {
    sa_family_t sin_family; /* 16-bit */
    in_port_t sin_port;     /* 端口号 16-bit */
    struct in_addr sin_addr;    /* Internet address. 32-bit */

    /* 这里仅仅用作占位符，不做实际用处 */
    unsigned char sin_zero[8];
};
```
1. 与sockaddr一样，都有一个16bit的sin_family，对应于IPv4，该值为**AF_INET**
2. 端口号最多为16bit，即65536，所以**支持寻址的端口号**最多为**65535**
    - 5000以下有可能是**保留端口**
3. 实际的IPv4是一个32bit的字段，最多支持的地址数为**42亿**

glibc定义的保留端口
```java
/* Standard well-known ports.  */
enum
  {
    IPPORT_ECHO = 7,		/* Echo service.  */
    IPPORT_DISCARD = 9,		/* Discard transmissions service.  */
    IPPORT_SYSTAT = 11,		/* System status service.  */
    IPPORT_DAYTIME = 13,	/* Time of day service.  */
    IPPORT_NETSTAT = 15,	/* Network status service.  */
    IPPORT_FTP = 21,		/* File Transfer Protocol.  */
    IPPORT_TELNET = 23,		/* Telnet protocol.  */
    IPPORT_SMTP = 25,		/* Simple Mail Transfer Protocol.  */
    IPPORT_TIMESERVER = 37,	/* Timeserver service.  */
    IPPORT_NAMESERVER = 42,	/* Domain Name Service.  */
    IPPORT_WHOIS = 43,		/* Internet Whois service.  */
    IPPORT_MTP = 57,

    IPPORT_TFTP = 69,		/* Trivial File Transfer Protocol.  */
    IPPORT_RJE = 77,
    IPPORT_FINGER = 79,		/* Finger service.  */
    IPPORT_TTYLINK = 87,
    IPPORT_SUPDUP = 95,		/* SUPDUP protocol.  */


    IPPORT_EXECSERVER = 512,	/* execd service.  */
    IPPORT_LOGINSERVER = 513,	/* rlogind service.  */
    IPPORT_CMDSERVER = 514,
    IPPORT_EFSSERVER = 520,

    /* UDP ports.  */
    IPPORT_BIFFUDP = 512,
    IPPORT_WHOSERVER = 513,
    IPPORT_ROUTESERVER = 520,

    /* Ports less than this value are reserved for privileged processes.  */
    IPPORT_RESERVED = 1024,

    /* Ports greater this value are reserved for (non-privileged) servers.  */
    IPPORT_USERRESERVED = 5000
  };
```

### IPv6 Socket地址格式
```java
struct sockaddr_in6 {
    sa_family_t sin6_family; /* 16-bit */
    in_port_t sin6_port;  /* 传输端口号 # 16-bit */
    uint32_t sin6_flowinfo; /* IPv6流控信息 32-bit*/
    struct in6_addr sin6_addr;  /* IPv6地址 128-bit */
    uint32_t sin6_scope_id; /* IPv6域ID 32-bit */
};
```
1. 先忽略sin6_flowinfo和sin6_scope_id，一个没在glibc的官网出现过，一个是当前未使用的字段
2. sin6_family的值为**AF_INET6**，端口与IPv4一样，都是16bit，而sin6_addr为128bit，解决了**寻址数字不够**的问题

### 本地Socket地址格式
本地Socket主要用于**本地进程间的通信**
```java
struct sockaddr_un {
    unsigned short sun_family; /* 固定为 AF_LOCAL */
    char sun_path[108];   /* 路径名 */
};
```

### 对比
IPv4 Socket和IPv6 Socket地址结构的长度是固定的，而本地Socket地址结构的长度是**可变**的
<img src="https://network-programming-1253868755.cos.ap-guangzhou.myqcloud.com/network-programming-socket-address-vs.png" width=1000/>
