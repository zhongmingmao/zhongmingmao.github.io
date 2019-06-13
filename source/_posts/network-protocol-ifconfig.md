---
title: 网络协议 -- ifconfig
date: 2019-05-28 10:09:40
categories:
    - Network
    - Network Protocol
tags:
    - Network
    - Network Protocol
---

## 安装命令：ifconfig + ip
```sh
# 安装ifconfig命令
$ apt-get install net-tools

# 安装ip命令
$ apt-get install iproute2
```

<!-- more -->

## ip a
```sh
$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: ens32: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 00:0c:29:e3:05:05 brd ff:ff:ff:ff:ff:ff
    inet 172.16.36.129/24 brd 172.16.36.255 scope global dynamic ens32
       valid_lft 1507sec preferred_lft 1507sec
    inet6 fe80::20c:29ff:fee3:505/64 scope link
       valid_lft forever preferred_lft forever
```
1. 该命令显示了机器上的所有**网卡**，大部分网卡都会有一个IP地址
2. IP地址是一个网卡在网络世界里的通信地址
3. 网卡ens32的IP地址为172.16.36.129，总共32位
    - IPV6的地址为fe80::20c:29ff:fee3:505，总共**128**位

## IP地址分类
<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-ifconfig-ip-classification.png" width=800/>


| 类别 | IP地址范围 | 最大主机数 | 私有IP地址范围 |
| ---- | ---- | ---- | ---- |
| A | 0.0.0.0 ~ 127.255.255.255 | 2^24-2 | 10.0.0.0 ~ 10.255.255.255 |
| B | 128.0.0.0 ~ 191.255.255.255 | 2^16-2 | 172.16.0.0 ~ 172.31.255.255 |
| C | 192.0.0.0 ~ 223.255.255.255 | 2^8-2 | 192.168.0.0 ~ 192.168.255.255 |

C类地址能包含的最大主机数太少了，而B类地址能包含的最大主机数又太多了，由此催生了**CIDR**

## CIDR
1. CIDR（Classless Inter-Domain Routing）：**无类型域间选路**
2. 将32位的IP地址一分为二，前面是**网络号**，后面是**主机号**
3. 172.16.36.129/24，就是CIDR的表示方式，网络号为172.16.36，主机号为129
4. 伴随CIDR存在的，一个是**广播地址**，一个是**子网掩码**，以172.16.36.129/24为例
    - 广播地址为：172.16.36.255，如果发送消息到这个地址，所有172.16.36网段内的机器都可以收到
    - 子网掩码：255.255.255.0
        - 将**IP地址**和**子网掩码**进行**按位与**操作，可以得到**网络号**
        - 172.16.36.129 & 255.255.255.0 = 172.16.36
5. 实际工作中，几乎不划分A类、B类和C类地址，主要使用CIDR

### 16.158.165.91/22
1. 165 = <10100101>
2. 16.158.165.91/22 == 16.158.<101001,01>.91/22
3. 网络号：16.158.<101001,00> == 16.158.164
4. 子网掩码：255.255.<111111,00>.0 == 255.255.252.0
5. 网络的第一个地址：16.158.<101001,00>.1 == 16.158.164.1
6. 网络的广播地址：16.158.<101001,11>.255 == 16.158.167.255

## 私有IP地址
1. 192.168.0.X/24是最常用的私有IP地址，例如家里的Wi-Fi，一般上网设备不会超过254个，因此/24足够了
    - 192.168.0是网络号，X是主机号
2. 网段内的**第一个**IP地址192.168.0.1，往往是私有网络的出口地址（**网关**）
3. 网段内的**最后一个**IP地址192.168.0.255，就是**广播地址**

## scope
1. 对于网卡ens32，IPV4的scope为**global**，说明这张网卡可以对外的，接收来自各个地方的数据包
2. 对于网络lo，IPV4的scope为**host**，说明这张网卡仅供本机相互通信
    - lo全称为loopback，又称环回接口，往往被分配IP地址127.0.0.1/8
    - 该地址用于本机通信，经过内核处理后直接返回，不会在任何网络中出现

## Mac地址
1. Mac地址（6 Bytes）：link/ether 00:0c:29:e3:05:05 brd ff:ff:ff:ff:ff:ff
2. Mac地址**全局唯一**，不会有两个网卡有相同的Mac地址
3. 一个网络包从A传到B，除了要有确定的地址（Mac地址），还需要有**远程定位功能**（IP地址）
4. Mac地址更像一个身份证，是唯一的标识
    - Mac地址的唯一性设计是为了在组网的时候，不同的网卡在同一个网络中不会发生冲突
    - Mac地址的通信范围很小（在**子网**内），而IP地址的通信范围大很多（可以跨子网）
        - 192.168.0.2/24访问192.168.0.3/24，使用Mac地址即可
        - 192.168.0.2/24访问192.168.1.2/24，只能通过IP地址

## 网络设备的状态标识
1. <BROADCAST,MULTICAST,UP,LOWER_UP>
    - UP：网卡处于启动状态
    - BROADCAST：该网卡有广播地址，可以发送广播包
    - MULTICAST：该网卡可以发送多播包
    - LOWER_UP：L1是启动的，即网线是插着的
2. mtu 1500
    - MTU：Maximum Transmission Unit，1500是**以太网**的默认值，MTU是二层**MAC层**的概念
    - 以太网规定：连MAC头带正文（包含IP头/TCP头/HTTP头等）合起来，不允许超过1500个字节
        - 否则需要**分片**传输
3. qdisc fq_codel
    - qdisc：queueing discipline，即**排队规则**
    - 内核如果需要通过某个网络接口**发送**数据包，都需要为这个网络接口配置qdisc，把数据包加入队列
    - 最简单的qdisc是pfifo，该规则不对进入的数据包做任何处理，数据包采用先进先出的方式通过队列

<!-- indicate-the-source -->
