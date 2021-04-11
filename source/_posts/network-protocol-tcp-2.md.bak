---
title: 网络协议 -- TCP下
mathjax: false
date: 2019-07-17 15:14:56
categories:
    - Network
    - Protocol
tags:
    - Network
    - Network Protocol
    - TCP
---

## 累计应答
1. 为了保证**顺序性**，每一个包都有一个**ID**（序号），在建立连接的时候，会商定起始的ID是多少，然后按照ID一个个发送
2. 为了保证不丢包，对应发送的包都要进行应答，但不是一个个应答，而是会**应答某个之前的ID**，该模式称为**累计应答**

<!-- more -->

## 缓存
为了记录所有发送的包和接收的包，TCP需要发送端和接收端分别用**缓存**来保存这些记录

### 发送端
<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-tcp-sender-cache.png" width=1000/>

1. 发送端的缓存是按照包的ID一个个排列的，根据处理的情况分为四部分
    - **已经发送 + 已经确认**
    - **已经发送 + 等待确认**
    - **可以发送 + 等待发送**
    - **不能发送**
2. 在TCP里，接收端会给发送端报一个**窗口**的大小，称为**Advertised window**
    - Advertised window的大小应该等于上面第2部分+第3部分
    - **Advertised window表征接收端的处理能力**，超过该窗口大小，接收端处理不过来
3. 分界线
    - LastByteAcked：第1部分和第2部分的分界线
    - LastByteSent：第2部分和第3部分的分界线
    - **LastByteAcked + AdvertisedWindow**：第3部分和第4部分的分界线

### 接收端
<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-tcp-receiver-cache.png" width=1000/>

1. 根据处理情况分为三部分
    - **已经接收 + 已经确认**
    - **等待接收 + 尚未确认**
    - **不能接收**
2. 常用计算
    - MaxRcvBuffer：最大缓存的量
    - LastByteRead之后：已经接收，但还没有被应用层读取
    - NextByteExpected：第1部分和第2部分的分界线
    - _**AdvertisedWindow = MaxRcvBuffer - (NextByteExpected - LastByteRead)**_
    - _**NextByteExpected + AdvertisedWindow = LastByteRead + MaxRcvBuffer**_ ：第2部分和第3部分的分界线
3. 在第2部分，由于收到的包可能是**乱序**的，会出现空隙，只有**和第1部分连续**的，才能马上进行回复
    - 中间空着的部分需要**等待**，哪怕后面的包已经来了

## 顺序 + 丢包
1. 发送端缓存
    - 1、2、3：已经发送并确认
    - 4、5、6、7、8、9：都是发送了未确认
    - 10、11、12：还未发送出去
    - 13、14、15：接收端没有空间，不准备发送
2. 接收端缓存
    - 1、2、3、4、5：已经完成ACK，但没有读取
    - 6、7：等待接收
    - 8、9：已经接收，但没有ACK
3. 当前状态
    - 1、2、3：没有问题，双方达成一致
    - 4、5：接收端ACK，发送端还没收到，有可能是丢了，也有可能在路上
    - 6、7、8、9：发送端都已经发送，到接收端只收到了8、9，而6、7还没到，出现了**乱序**，虽然缓存了8、9但没法ACK
    - 可见，顺序问题和丢包问题都有可能发生，因此需要考虑**确认**和**重传**机制
        - 如果4的ACK到了，5的ACK丢了，怎么处理？
        - 如果6、7的数据包丢了，怎么处理？


### 超时重传
1. 对每一个**已经发送但尚未确认**的包，都有一个**定时器**，超过一定时间，就重新尝试
    - 不宜过长，这样超时时间会变长，访问变慢
    - 不宜过短，必须**大于**往返时间**RTT**，否则会引起**不必要的重传**
        - TCP通过**采样RTT**，然后进行加权平均，该值是**动态变化**的
        - 除了采样RTT，还要采样RTT的**波动范围**，计算出一个估计的超时时间
        - 由于重传时间是动态变化的，因此也称为_**自适应重传算法**_
2. 如果过段时间后，5、6、7都超时了，就会重新发送，接收端发现5原来接收过，直接丢弃
    - 6到了，发送ACK，要求下一个是7，但7又丢失了，当7再次超时，需要重传的时候，TCP的策略是_**超时间隔加倍**_
3. 每当遇到一次超时重传的时候，都会将下一次超时重传间隔设置为先前值的_**两倍**_
    - 两次超时，说明网络环境很差，不宜频繁反复发送
4. 超时间隔加倍的策略存在的问题：**超时周期可能相对较长**，需要一个补充机制：_**快速重传**_
5. **快速重传**
    - 当接收端**收到一个序号大于下一个所预期的报文段**时，就检测到数据流中的**空隙**，于是发送**3个冗余的ACK**
    - 客户端收到后，会在定时器**过期之前**，重传丢失的报文段
    - 例如接收端发现6、8、9都已经收到了，但是所预期的7却没有来，明显是丢失了
        - 于是发送3个6的ACK，要求下一个是7，客户端收到后，不等定时器超时，**马上重发**

## 流量控制
**在对数据包的ACK中，同时会携带一个窗口的大小**，假设窗口大小不变，依然为9，4的ACK到达，会右移一位，13也可以发送了
<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-tcp-flow-control-1.png" width=1000/>

如果此时发送端发送很快，会将10、11、12、13全部发送完毕，之后就停止发送了，因为可发送的部分为0
<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-tcp-flow-control-2.png" width=1000/>

当5的ACK到达时，在客户端相当于窗口再向右滑动一格，14可以发送了
<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-tcp-flow-control-3.png" width=1000/>

如果接收端处理太慢，导致缓存中没有空间，可以通过ACK携带**修改窗口大小**的信息，可以设置为0，那么发送端将停止发送
例如接收端的应用一直不读取缓存中的数据，当6确认后，窗口大小需要缩小为8
<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-tcp-flow-control-4.png" width=1000/>

新的窗口大小8通过6的ACK到达发送端的时候，不会平行右移，而是仅仅右移左面的边，把窗口大小从9改为8
<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-tcp-flow-control-5.png" width=1000/>

如果接收端还是一直不处理数据，随着确认包越来越多，窗口越来越小，直到为0
<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-tcp-flow-control-6.png" width=1000/>

新的窗口大小0通过14的ACK到达发送端，发送端也将窗口调整为0，停止发送
<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-tcp-flow-control-7.png" width=1000/>

这种情况下，发送端会定时发送窗口**探测数据包**，看是否有机会调整窗口的大小
当接收方比较慢时，要防止**低能窗口综合征**：不要空出一个字节就立马告诉发送端，然后马上又被填满了
当窗口太小的时候，不更新窗口，直到达到一定大小，或者缓冲区一半为空，才更新窗口

## 拥塞控制
1. **rwnd**（Receiver Window）：**滑动窗口**，担心发送方把接收方缓存塞满
2. **cwnd**（Congestion Window）：**拥塞窗口**，担心把网络塞满
3. 通过滑动窗口和拥塞窗口共同**控制发送的速度**
    - _**LastByteSent - LastByteAcked <= min {cwnd, rwnd}**_
4. 对于TCP协议来说，它压根不知道整个网络都经历了什么，**网络对于TCP来说是一个黑盒**
5. _**TCP拥塞控制就是在不堵塞、不丢包的情况下，尽量发挥带宽**_
6. 在网络上，**通道的容量 = 带宽 * 往返时间**

设置**发送窗口**，使得**发送但未确认**的包为**通道的容量**，就能**撑满**整个通道
假设往返时间为8秒，每秒发送一个包，每个包的大小为1KB
已经过去8秒，8个包都已经发出去，前4个包到达接收端，但ACK还没有返回，后4个包还在路上，还没被接收
<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-tcp-congestion-control-1.png" width=600/>

如果**调大窗口**，使得单位时间内可以发送更多的包
原来发送一个包，从一端到达另一端，假设一共经过4个设备，每个设备处理一个包需要耗时1S，所以到达另一端需要耗费4S
如果发送加快，则单位时间内会有更多的包到达这些中间设备，如果这些设备还只能每秒处理一个包的话，多出来的包会被**丢弃**
如果中间设备增加**缓存**，处理不过来的包会**排队**，这样包就不会丢失了，但缺点是会**增加时延**，时延到达一定程度，就会**超时重传**
所以，拥塞控制主要避免两种现象：**包丢失**、**超时重传**，一旦出现这些现象，说明发送速度太快

### 慢启动
1. 一条TCP连接开始，cwnd设置为1，一次只能发送一个
2. 当这一个的确认到来的时候，每个确认cwnd加1，此时一次能够发送2个
3. 当这两个的确认到来的时候，每个确认cwnd加1，两个确认cwnd加2，此时一次能够发送4个
4. 当这四个的确认到来的时候，每个确认cwnd加1，四个确认cwnd加4，此时一次能够发送8个，**指数型增长**
    - ssthresh=65535 Byte，当超过**ssthresh**，每收到一个确认，cwnd增加**1/cwnd**
5. 当这八个的确认到来的时候，每个确认cwnd加1/8，八个确认cwnd加1，此时一次能够发送9个，变成了**线性增长**
6. 线性增长还是会增长，还是有可能会出现网络拥塞，拥塞的一种表现形式就是**丢包**，需要**超时重传**
    - 此时**将ssthresh设为cwnd/2，将cwnd设为1，重新开始慢启动**
    - 一旦超时重传，马上回到解放前，过于**激进**，会造成**网络卡顿**

### 快速重传算法
1. 当接收端发现丢了一个**中间包**的时候，会发送3次前一个包的ACK，于是发送端会**快速的重传**，不必等待超时再重传
2. TCP认为这种情况**不严重**，因为**大部分没丢**，只丢了中间一部分，将**cwnd减半为cwnd/2，然后ssthresh=cwnd**
    - 当3个包返回的时候，cwnd=ssthresh+3，也就是还在**比较高**的值，呈**线性增长**

<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-tcp-congestion-control-2.png" width=1000/>

### BBR拥塞算法
1. TCP拥塞控制主要用来避免**丢包**和**超时重传**，但这两个现象都是有问题的
    - **丢包并不能代表通道是满的**，例如公网上**带宽不满也会丢包**，此时不能认为网络拥塞并且退缩
    - TCP的拥塞控制要等到**中间设备的缓存**都被填充满了，才会发生丢包，从而降低速度
        - 其实TCP**只要填满网络通道**即可，不需要等到把所有的中间设备的缓存都填满
4. 为了优化上面的两个问题，诞生了**TCP BBR拥塞算法**
    - 它企图找到一个**平衡点**，通过不断的加快发送速度，将通道填满，但不填满中间设备的缓存（这样会增加时延）
    - 这个平衡点可以很好地达到**高带宽**和**低延时**的平衡

<img src="https://network-protocol-1253868755.cos.ap-guangzhou.myqcloud.com/network-protocol-tcp-congestion-control-bbr.png" width=1000/>

## 小结
1. **滑动窗口**（rwnd）解决的问题：**顺序问题、丢包问题、流量控制**
2. **拥塞窗口**（cwnd）解决的问题：**拥塞控制**
