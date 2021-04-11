---
title: 网络协议 -- Socket
mathjax: false
date: 2019-07-20 22:03:19
categories:
    - Network
    - Protocol
tags:
    - Network
    - Network Protocol
    - Socket
---

## 概述
1. Socket编程进行的是**端到端**的通信，并不清楚中间的网络情况，能够设置的参数，只能是**网络层**和**传输层**
2. 在**网络层**，Socket函数需要指定是**IPV4**还是**IPV6**，分别设置为**AF_INET**和**AF_INET6**
3. 在**传输层**，Socket函数需要指定是**TCP**还是**UDP**
    - TCP协议是基于**数据流**的，设置为**SOCK_STREAM**
    - UDP协议是基于**数据报**的，设置为**SOCKet_DGRAM**

<!-- more -->

## 基于TCP协议

### 函数调用
1. TCP的服务端需要先**监听**一个端口，一般是调用**bind**函数，给Socket赋予一个**IP地址**和**端口**
    - 端口：当一个网络包到达的时候，内核要通过TCP头里面的端口来查找应用程序，并把网络包交给它
    - IP地址：一台机器可能有多个网卡，也就有多个IP地址，只有发送给某个网卡的地址才会被处理
2. 当服务端有了IP地址和端口号，就可以调用**listen**函数进行监听，服务端进入**listen**状态，此时客户端可以发起连接
3. 在内核中，为每个Socket维护两个队列
    - 一个是**已经建立了连接**的队列，已经完成三次握手，处于**established**状态
    - 一个是**还没有完成建立连接**的队列，此时三次握手还未完成，处于**syn_rcvd**状态
4. 服务端调用**accept**函数，拿出一个**已经完成的连接**进行处理
5. 在服务端等待的时候，客户端可以通过**connect**函数发起连接，在参数中指明要连接的IP地址和端口号，然后发起三次握手
    - 内核会给客户端分配一个**临时端口**，一旦握手成功，服务端的accept函数就会返回**另一个Socket**
6. 监听的Socket和真正用来传输数据的Socket是两个，一个称为**监听Socket**，一个称为**已连接Socket**
7. 连接建立成功之后，双方通过**read**和**write**函数来读写数据，跟往一个**文件流**写数据一样

<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-socket-tcp.png" width=500/>

### 数据结构
1. Socket在Linux中是以**文件**的形式存在的，也存在**文件描述符**，写入和读出都是通过文件描述符
2. 每个**进程**都有一个数据结构task_struct，里面指向一个**文件描述符数组**（fds），列出这个进程**打开**的所有文件的文件描述符
3. 文件描述符是一个**整数**，是这个数组（fds）的**下标**，数组的内容是一个**指针**，指向**内核中所有打开的文件列表**（File List）
4. 文件都有inode，Socket对应的inode会保存在**内存**中，而真正的文件系统上文件的indo会保存在**硬盘**上
    - 在**innode**中，指向了Socket在**内核中的Socket结构**
    - 在Socket结构中，主要有两个队列，一个是**发送队列**，一个是**接收队列**
        - 队列里面保存的是**缓存sk_buff**，sk_buff里面能看到**完整的包结构**

<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-socket-tcp-task-struct.png" width=1000/>

## 基于UDP协议

### 函数调用
1. UDP是**面向无连接**，所以**不需要三次握手**，也不需要调用**listen**和**connect**函数
    - 但依然需要调用**bind**函数来绑定IP地址和端口号
2. UDP是**没有维护连接状态**的，因此不需要为每对连接都建立一组Socket，而只需**一个Socket**，就能够和**多个客户端**进行通信
    - 每次通信，都调用**sendto**和**recvfrom**，都可以传入IP地址和端口

<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-socket-udp.png" width=500/>

## TCP连接数

### 最大连接数
1. 用一个**四元组**来标识一个**TCP连接**，`<本机IP,本机端口,对端IP,对端端口>`
2. 服务端通常固定在某个本地端口上监听，等待客户端的连接请求，因此服务端TCP连接的四元组只有**对端IP**和**对端端口**
    - 最大TCP连接数 = 客户端IP数 * 客户端端口数 = 2^32 * 2^16 = **2^48**
3. 服务端最大并发TCP连接数**远远达不到理论上限**
    - 首先是**文件描述符限制**，Socket是文件，可以通过**ulimit**配置文件描述符的数目
    - 其次是**内存限制**，每个TCP连接都要占用一定的内存

### 多进程方式
1. 监听请求，建立连接后，对应一个**已连接的Socket**，创建一个**子进程**，然后将基于已连接Socket的交互交给子进程来处理
2. 在Linux下，使用**fork**函数来创建子进程，在父进程的基础上**完全拷贝**一个子进程
3. 在Linux内核中，会复制以下内容
    - _**文件描述符列表**_
    - **内存空间**
    - 记录**当前执行到哪一行**代码
4. 调用fork函数，复制完毕后，父进程和子进程都会**记录当前刚刚执行完fork函数**
    - 父子进程**几乎一模一样**，只是根据fork的返回值来区分到底是父进程，还是子进程
    - 如果返回值是**0**，则是**子进程**，如果返回值是**其他整数**，就是**父进程**
5. 因为复制了**文件描述符列表**，而文件描述符都是指向**整个内核统一打开的文件列表**
    - 父进程刚才因为accept创建的**已连接Socket**也是一个**文件描述符**，同样也会被**子进程**获得
    - 子进程可以通过这个已连接Socket和客户端进行通信，当通信完毕后，就可以退出子进程
        - 调用fork函数时，会给父进程返回一个整数，即子进程的ID，父进程可以通过这个ID查看子进程是否需要退出

进程复制过程
<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-socket-multi-progress.png" width=1000/>

### 多线程方式
1. **线程比进程轻量很多**
2. 在Linux下，通过**pthread_create**创建一个线程，也是调用do_fork，但很多资源是**共享的**
    - 例如**文件描述符**、**进程空间**，只不过多了一个**引用**而已
3. 新的线程也可以通过**已连接的Socket**来处理请求，从而达到**并发处理**的目的

<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-socket-multi-thread.png" width=1000/>

### C10K问题
1. 上面基于进程或者线程的模型，依然存在问题，因为新到来一个TCP连接，就需要分配一个进程或者线程
2. **一台机器无法创建很多进程或者线程**
    - C10K，即一台机器如果要维护1W个TCP连接，就要创建1W个进程或线程，这是操作系统无法承受的

### IO多路复用
IO多路复用，即**一个线程维护多个Socket**

#### select
1. Socket是**文件描述符**，因而某个线程关注的所有Socket都可以放在一个**文件描述符集合fd_set**
2. 然后调用**select**函数来监听fd_set是否变化，一旦变化，就会依次查看每个文件描述符
    - 发生变化的文件描述符在fd_set对应的位都设为**1**，表示Socket可读或者可写，从而进行读写操作
3. 然后再调用select函数，监听**下一轮**的变化

#### epoll
1. select函数也存在问题，每次Socket所在的文件描述符集合fd_set中有Socket发生变化的时候，都是通过**轮询**的方式
    - 即**遍历**文件描述符集合fd_se中**所有**的Socket，**效率不高**
    - 另外使用select，fd_set的大小受限于**FD_SETSIZE**
2. epoll函数是通过**事件通知**的方式，效率高很多
    - epoll函数在内核中的实现方式是**注册callback函数**，当某个文件描述符发生变化时，就会主动通知
3. 假设进程打开Socket m,n,x等多个文件描述符，现在需要通过epoll来监听这些Socket是否都有事件发生
    - 其中**epoll_create**创建一个epoll对象（epoll fd），也是一个文件，对应一个**文件描述符**，对应打开文件列表中的一项
    - 在这项里有一个**红黑树**，在该红黑树里要保存这个**epoll需要监听的所有Socket**
    - 当epoll_ctl添加一个Socket时，其实是加入这个红黑树，同时红黑树中的**节点**指向一个结构
        - 该结构在**被监听的Socket的事件列表**中
        - 当Socket来了一个事件后，可以从这个列表中得到epoll对象，并调用call back通知它
4. 这种**通知方式**使得监听的Socket数据增加的时候，**效率不会大幅度降低**，能够**同时监听非常多的Socket**
    - 上限就是系统定义的进程可以打开的最大文件描述符个数（**ulimit**）
5. _**epoll是解决C10K问题的利器**_

<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-socket-epoll.png" width=1000/>
