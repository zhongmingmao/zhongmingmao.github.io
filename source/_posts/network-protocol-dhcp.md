---
title: 网络协议 -- DHCP
date: 2019-05-29 09:42:22
categories:
    - Network
    - Network Protocol
tags:
    - Network
    - Network Protocol
---

## 手动配置IP
```sh
# ifconfig - net-tools
$ sudo ifconfig eth1 172.16.36.131/24
$ sudo ifconfig eth1 up

# ip - iproute2
$ sudo ip addr add 172.16.36.131/24 dev eth1
$ sudo ip link set up eth1
```

<!-- more -->

## DHCP
DHCP（Dynamic Host Configuration Protocol）：动态主机配置协议

### DHCP Discover
<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-dhcp-discover.png" width=500/>
1. 当一台新设备加入到一个网络时，只知道自己的Mac地址
2. 使用IP地址**0.0.0.0**发送一个**广播包**，目的IP地址为**255.255.255.255**
3. 广播包封装在**UDP**里，UDP封装在**BOOTP**里，其实DHCP是BOOTP的增强版

### DHCP Offer
<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-dhcp-offer.png" width=500/>
1. 如果网络里配置了DHCP Server，只要Mac地址唯一，DHCP Server就会为新设备**分配并保留**一个IP地址
2. DHCP Server仍然使用**广播地址**作为目标地址，因为此时新设备还没有自己的IP地址

### DHCP Request
<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-dhcp-request.png" width=500/>
1. 新设备会收到多个DHCP Server的Offer，选择**最先到达**的那个，并向网络发送一个**DHCP Request广播包**
2. 告诉所有的DHCP Server，该新设备将接受哪一台DHCP Server的Offer
    - 告知其他DHCP Server撤销它们提供的Offer，以便提供给下一个新设备
3. 此时还没有得到DHCP Server的确认，还是使用源IP地址0.0.0.0，目标IP地址255.255.255.255，进行广播

### DHCP Ack
<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-dhcp-ack.png" width=500/>
1. 当DHCP Server接收到DHCP Request后，会**广播**返回一个DHCP Ack
2. 把IP地址的合法租用信息和其他配置信息都放入该广播包，发送给新设备

<!-- indicate-the-source -->
