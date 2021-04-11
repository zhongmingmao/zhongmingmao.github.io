---
title: 网络协议 -- 物理层 + 数据链路层
date: 2019-06-01 09:52:29
categories:
    - Network
    - Protocol
tags:
    - Network
    - Network Protocol
---

## HUB
1. HUB即集线器，有多个端口，完全工作在**物理层**
2. HUB采用的是**广播**模式，会将自己收到的每一个字节，都**复制**到其他端口
3. 广播模式存在问题，需要解决三个问题（在**数据链路层**解决）
    - 数据包发给谁，由谁接收
        - **MAC地址**
    - 数据包谁先发，谁后发
        - MAC子层，以太网为**随机接入协议**
    - 如果发送时出现错误，应该怎么处理
        - 以太网数据包的最后有**CRC校验**

<!-- more -->

## 数据链路层
1. 数据链路层分成LLC（Logical Link Control）子层和MAC（Media Access Control）子层
    - LLC子层实现数据链路层**与硬件无关**的功能，比如流量控制、差错恢复等
    - MAC子层提供LLC子层和物理层之间的接口
2. MAC地址解决了第一个问题：数据包发给谁，由谁接收
3. MAC子层解决了第二个问题：数据包谁先发，谁后发的问题，学名为**多路访问**
    - 可用方式：信道划分、轮流协议、**随机接入协议**（以太网）
    - 这个与MAC地址没什么关系

### 数据包格式
<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-package-fmt-2nd.png" width=600/>

1. 开头为目标MAC地址和源MAC地址
2. 接下来是类型，大部分的类型是IP数据包（0x0800），IP数据包里面会包含TCP、UDP、HTTP等内容（层层封装）
3. 数据包中有目标MAC地址，数据包在链路上**广播**，目标MAC地址的网卡发现这个包是给它的，就会把数据包接收进来
    - 然后打开数据包，发现是IP数据包，并且IP地址也是自己，再打开TCP包，发现目标端口是80，Nginx在监听80端口
    - 于是将请求提交给Nginx，Nginx会返回一个网页，然后将网页发回请求的机器，经过层层封装，最后到了MAC层
        - 原先的源MAC地址变成了目标MAC地址
4. 对于以太网，数据包的最后是**CRC**（循环冗余校验，采用XOR异或算法）
    - 计算整个数据包在发送过程中是否出现错误，这解决第三个问题

## ARP协议
ARP：Address Resolution Protocol，**已知IP地址，求MAC地址**
<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-arp-1.png" width=700/>

<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-arp-2.png" width=700/>
<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-arp-fmt.png" width=700/>
勘误：0x8086 -> 0x0806

## 交换机
1. 交换机是**二层设备**，工作在**数据链路层**
2. 学习过程
    - 交换机有4个口，分别是A、B、C、D，有两台机器，MAC地址为MAC1和MAC2，MAC1连着A口，MAC2连着B口
    - MAC1机器将数据包发送给MAC2机器，当数据包到达交换机的时候，并不知道MAC2机器连着交换机的哪个端口
        - 因此，只能将该数据包转发给B、C、D口，但是交换机会记住MAC1连着A口
        - 以后有数据包要发送给MAC1，直接转发到A口即可
3. 交换机学习的结果叫**转发表**，有过期时间

<!-- indicate-the-source -->
