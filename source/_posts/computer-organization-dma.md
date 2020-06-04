---
title: 计算机组成 -- DMA
mathjax: false
date: 2020-02-03 22:09:15
categories:
    - Computer Basics
    - Computer Organization
tags:
    - Computer Basics
    - Computer Organization
---

## 背景
1. 无论IO速度如何提升，比起CPU，还是太**慢**，SSD的IOPS可以达到**2W**，但CPU的主频有**2GHz**
   - 对于IO操作，都是由CPU发出对应的指令，然后等待IO设备完成操作后返回，CPU有大量的时间都是在**等待**IO设备完成操作
2. 在很多时候，CPU的等待是没有太多的实际意义的
   - 对于IO设备的大量操作，其实都只是把**内存**里面的数据，传输到**IO设备**而已，此时CPU只是在**傻等**
   - 当传输的数据量比较大的时候，如**大文件复制**，如果所有数据都要经过CPU，实在有点太**浪费时间**
3. 因此发明了**DMA**技术，即**直接内存访问**（Direct Memory Access），来**减少CPU等待的时间**

<!-- more -->

## 协处理器
1. 本质上，**DMA**技术就是在**主板**上一块**独立的芯片**
2. 在进行**内存**和**IO设备**的数据传输的时候，不再通过CPU来传输数据
   - 而直接通过**DMA控制器**（DMA Controller，**DMAC**），其实是一个**协处理器**（Co-Processor）
3. DMAC最有价值的地方：当要**传输的数据特别大，速度特别快**，或者**传输的数据特别小、速度特别慢**的时候
   - 用**千兆网卡**或者**硬盘**传输大量数据的时候，如果都用CPU来搬运的话，肯定忙不过来，可以选择DMAC
   - 当**数据传输很慢**的时候，DMAC可以**等数据到齐**后，再**发送信号**，给到CPU去处理，而不是让CPU忙等待
4. DMAC是在**协助CPU**，完成对应的**数据传输**工作，在DMAC**控制数据传输**的过程中，还是需要**CPU**介入的

## 主设备 + 从设备
1. DMAC其实是一个**特殊的IO设备**，通过连接到**总线**上来进行实际的数据传输
2. 总线上的设备，有两种类型，一种称之为**主设备**（Master），另一种，称之为**从设备**（Slave）
3. 想要**主动发起**数据传输，必须是一个**主设备**才可以，**CPU是一个主设备**
4. **从设备**（如**硬盘**）只能**接受数据传输**
5. 因此，如果通过CPU来传输数据，要么CPU从IO设备读数据，要么是CPU向IO设备写数据
6. IO设备只能向CPU发送**控制信号**，告诉CPU有数据要传输给他，实际数据是CPU去读取的，而不是IO设备推给CPU的
7. DMAC即是一个主设备，也是一个从设备
   - 对于**CPU**来说，它是一个**从设备**
   - 对于**硬盘**来说，它是一个**主设备**

## 数据传输过程
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-dma-data-transmission.jpg" width=1000/>

1. CPU作为一个**主设备**，通过**总线**，向DMAC设备（此时作为一个**从设备**）发起请求
   - 该请求的作用：在DMAC里面修改**配置寄存器**
2. CPU修改DMAC配置
   - **源地址的初始值** + **传输时的地址递减方式**
     - 源地址是数据要**从哪里传输过来**
     - 如果要从内存里面写入数据到硬盘上，那就是要读取的数据在内存里面的地址
     - 如果要从硬盘读取数据到内存里，那就是硬盘的IO接口的地址
       - IO的地址可以是一个**内存地址**，也可以是一个**端口地址**
     - 地址递减方式：数据是从**大**的地址向**小**的地址传输，还是从**小**的地址向**大**的地址传输
   - **目标地址初始值** + **传输时的地址递减方式**
     - 与源地址对应
   - 要传输的**数据长度**
3. CPU设置完这些信息后，**DMAC**就会变成一个**空闲**（Idle）的状态
4. 如果要从**硬盘**上往**内存**里面加载数据，此时，**硬盘**就会向**DMAC**发起一个**数据传输请求**
   - 该请求并不是通过总线，而是通过一个**额外的连线**
5. DMAC需要再通过一个**额外的连线**来**响应**这个申请
6. DMAC（此时是**主设备**）向硬盘接口（**从设备**）发起要**总线读**的传输请求
   - 数据就从**硬盘**里面读到**DMAC的控制器**里面
7. 然后，DMAC（**主设备**）再向内存（**从设备**）发起**总线写**的数据传输请求，把数据写入到内存里
8. DMAC会重复6、7步，直到DMAC的寄存器里面设置的**数据长度**传输完成
9. 数据传输完成后，DMAC重新回到**空闲**状态

## 设备独立的DMAC
1. 最早的计算机里面是没有DMAC的，所有数据都是由CPU来搬运的
2. 随着对于**数据传输**的需求越来越多，先是出现在**主板**上独立的DMAC控制器
3. 现在各个设备里面都有自己**独立的的DMAC芯片**了

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-dma-dmac.jpg" width=600/>

## Kafka的实现原理
1. Kafka是一个用来处理实时数据的管道，常用来做一个消息队列，或者用来收集和落地海量日志
   - 作为一个处理实时数据和日志的管道，瓶颈自然在**IO**层面
2. Kafka里面会有两种常见的海量数据传输的情况
   - 一种是从网络中接收上游的数据，然后需要落地到本地的磁盘上，确保数据不丢失
   - 一种是从本地磁盘读取出来，通过网络发送出去

### 4次传输
```
File.read(fileDesc, buf, len);
Socket.send(socket, buf, len);
```
1. 第一次传输
   - 通过**DMA**搬运：**硬盘** -> 操作系统**内核**的**读缓冲区**
2. 第二次传输
   - 通过**CPU**搬运：**内核的读缓冲区** -> **应用的内存**
3. 第三次传输
   - 通过**CPU**搬运：**应用的内存** -> 操作系统**内核**的**Socket缓冲区**
4. 第四次传输
   - 通过**DMA**搬运：**内核的Socket缓冲区** -> **网卡的缓冲区**

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-dma-4-times.jpg" width=1000/>

### 2次传输
```java
@Override
public long transferFrom(FileChannel fileChannel, long position, long count) throws IOException {
   return fileChannel.transferTo(position, count, socketChannel);
}
```
1. Kafka的代码调用了Java NIO库（`FileChannel#transferTo`）
2. 数据并没有复制到中间的应用内存里面，而是**直接**通过**`Channel`**，写入到对应的**网络设备**里
3. 对于Socket的操作，也不是写入到**Socket缓冲区**里面，而是直接根据**Socket描述符**（Descriptor）写入到**网卡的缓冲区**里
4. 具体过程
   - 通过**DMA**搬运：**硬盘** -> 操作系统**内核**的**读缓冲区**
   - 通过**DMA**搬运：根据**Socket的描述符信息**，直接从**内核的读缓冲区**里面，写入到**网卡的缓冲区**里面
5. 只有两次传输，只有**DMA**来进行**数据搬运**，并不需要**CPU**
6. 没有在**内存层面**进行**数据复制** -> **零拷贝**
7. 吞吐率提升：**300%**

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-dma-2-times.jpg" width=1000/>