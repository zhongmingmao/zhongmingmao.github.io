---
title: 计算机组成 -- SSD
mathjax: false
date: 2020-02-02 20:38:17
categories:
    - Computer Basics
    - Computer Organization
tags:
    - Computer Basics
    - Computer Organization
---

## 对比
| 访问类型 | 机械硬盘（HDD） | 固态硬盘（SSD） |
| --- | --- | --- |
| 随机读 | 慢 | 非常快 |
| 随机写 | 慢 | 快 |
| 顺序写 | 快 | 非常快 |
| 耐用性（重复擦写） | 非常好 | 差 |

<!-- more -->

## 读写原理
1. **CPU Cache**用的**SRAM**是用**一个电容**来存放**一个比特**的数据
   - 对于SSD硬盘，由一个**电容**加上一个**电压计**组合在一起，就可以记录一个或多个比特
2. 分类
   - SLC：**Single**-Level Cell
   - MLC：**Multi**-Level Cell
   - TLC：**Triple**-Level Cell
   - QLC：**Quad**-Level Cell
3. QLC
   - 想要表示15个不同的电压，**充电**和**读取**的时候，对**精度**的要求就会更高，这会导致充电和读取的时候**更慢**
   - QLC的SSD的读写速度要比SLC慢上**好几倍**

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-ssd-slc-tlc-qlc.jpg" width=1000/>

### PE擦写问题
1. **控制电路**
   - 常用的是**SATA**或者**PCI Express**接口，里面有一个很重要的模块：**FTL**（Flash-**Translation** Layer），即**内存转换层**
   - **FTL**是SSD的**核心模块**，SSD性能的好坏很大程度上取决于**FTL的算法**好不好
2. **实际的IO设备**
   - 新的大容量SSD都是**3D封装**的，即由很多**裸片**（Die）叠在一起（跟HDD有点类似）
   - 一个裸片上可以放多个**平面**（Plane），一个平面上的存储容量大概在**GB**级别
   - 一个平面上面，会划分成多个**块**（Block），通常大小在**几百KB**到**几MB**不等（AeroSpike为**128KB**）
   - 一个块里面，还会区分很多个**页**（Page），通常大小为**4KB**
3. 对于SSD，**数据的写入**叫作**Program**
   - 写入不能像HDD那样，通过**覆写**（Overwrite）来进行，而是先进行**擦除**（Erase），然后再写入
4. SSD**读取和写入的基本单位**：**页**（Page，4KB）
5. SSD**擦除的基本单位**：**块**（Block）
   - SSD的**使用寿命**，就是每一**块的擦除次数**
   - SLC：**10W**次；MLC：**1W**次；TLC、QLC：**几K**次

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-ssd-3d-1.jpg" width=600/>
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-ssd-3d-2.jpg" width=1000/>

## 读写的生命周期
1. 颜色
   - 白色：该页**从未写入**过数据
   - **绿色**：写入的是**有效**的数据
   - **红色**：在**操作系统**看来，数据是已经被**删除**了
2. 一开始，所有块的每一页都是**白色**的，随着往里面写数据，某些页变成了**绿色**
3. 然后，删除一些文件，有些页就变成了**红色**，但这些**红色的页并不能再次写入数据**
   - 因为SSD**不能单独擦除一个页**，必须**一次性擦除整个块**
4. 如果某个块的数据**一次性全部标红**，就可以把**整个块擦除**
5. 随着红色页越来越多，已经没有了白色页去写入数据了，就要进行**垃圾回收**了
   - 找一个**红色页最多的块**，把里面**绿色页**挪到另一个块里面，然后把整个块擦除，变成**白色**，就可以重新写入数据了
   - 垃圾回收不能**太主动**和**太频繁**，因为SSD的**擦除次数是有限**的
6. SSD的容量是**无法完全用满**的，因此厂商会**预留**一部分空间，专门用来做垃圾回收的
   - 这部分空间叫作**预留空间**（Over Provisioning），一般SSD的预留空间都在**7%-15%**左右
7. SSD特别适合**读多写少**的应用
   - 适合做**系统盘**，但不适合做**下载盘**和**数据盘**
8. 使用了SSD的系统盘，就不能用**磁盘碎片整理**
   - 一旦主动去运行磁盘碎片整理，就会发生一次**块的擦除**，对应**块的寿命**就减少一些

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-ssd-read-write-lifecycle.jpg" width=1000/>
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-ssd-read-write-lifecycle-2.jpg" width=1000/>

## 磨损均衡
1. 在**操作系统**上，并没有SSD上各个块已经擦写的情况和寿命，因此它**对待SSD和HDD并没有什么区别**
2. **均匀磨损**（Wear-Leveling）：让SSD各个块的**擦除次数**，均匀**分摊**到各个块上，实现方式：**FTL**（即**内存转换层**）
3. 在**FTL**里，存放了**逻辑块地址**（Logical Block Address，**LBA**）到**物理块地址**（Physical Block Address，**PBA**）的映射
4. **操作系统**访问的硬盘地址，其实都是**逻辑地址**，只有通过**FTL**转换后，才会变成实际的**物理地址**，找到对应的块进行访问
   - **操作系统本身不需要去考虑块的磨损程度**，只要和操作HDD一样来读写数据即可
5. 操作系统所有对于SSD的读写请求，都要经过FTL
   - FTL里面有**逻辑块**对应的**物理块**，因此**FTL**能够记录下来，**每个物理块被擦写的次数**
   - 如果一个物理块被擦写的次数多了，FTL就可以将这个物理块，『挪到』一个擦写次数少的物理块上
   - 但**逻辑块不需要变**，**操作系统也不需要知道这个变化**

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-ssd-dev.jpg" width=600/>
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-ssd-ftl.jpg" width=600/>

## TRIM
1. 操作系统不去**关心底层**的硬件是什么，使用SSD时会有一个问题，即**操作系统的逻辑层**和**SSD的逻辑层**的**块状态**是**不匹配**的
2. 在操作系统里面删除一个文件，其实并**没有真的在物理层去删除**这个文件
   - 只是在**文件系统**层面，把对应的**inode**里面的**元信息**清理掉，代表这个inode还可以**继续使用**，可以写入新的数据
   - 此时，实际**物理层**对应的存储空间，在**操作系统**里面被**标记成可以写入**
   - 因此，日常的文件删除，都只是**操作系统层面的逻辑删除**
     - 可以通过各种**恢复软件**，把数据找回来
     - 如果想要把数据删除干净，需要用到『**文件粉碎**』的功能
3. 上述逻辑在**HDD**是没有问题的，因为文件被标记成可以写入，后续的写入可以直接**覆写**这个位置
4. 在使用SSD时，**操作系统对于文件的删除，SSD其实并不知道！！**
   - 导致：为了**磨损均衡**，很多时候都在**搬运很多已经删除了的数据** -- **写入放大**
   - 产生很多**不必要的数据读写和擦除**，既**消耗了SSD性能**，也**缩短了SSD的使用寿命**
5. 为此，**操作系统**（Linux、Windows、MacOS）和**SSD的主控芯片**，都支持**TRIM**命令
   - TRIM命令：在文件被删除的时候，让**操作系统通知SSD**，对应的逻辑块已经被标记成已删除

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-ssd-trim.jpg" width=1000/>

## 写入放大
1. TRIM命令的发明，反映了使用SSD的一个问题：SSD容易**越用越慢**
2. 当SSD的存储空间被占用得越来越多，每一次**写入新数据**，都可能没有足够的空白
   - 不得不去进行**垃圾回收**，**合并**一些块里面的页，然后在**擦除**一些块，才能匀出一些空间来
3. 在**应用层**或者**操作系统**层面来看，可能只是写入一个**4KB**或者**4MB**的数据
   - 但实际通过**FTL**后，可以需要搬运**8MB**、**16MB**甚至更多的数据
4. **写入放大  = 实际内存写入的数据量 / 系统通过FTL写入的数据量**
5. 写入放大的**倍数越多**，意味着实际SSD**性能就会越差**，会远远比不上实际SSD硬盘**标称**的指标
   - 解决方案：在**后台定时**进行**垃圾回收**，在硬盘比较**空闲**的时候，就进行垃圾回收，而不是等待实际数据写入的时候

### AeroSpike
1. AeroSpike是专门针对**SSD特性**设计的**Key-Value**数据库
2. AeroSpike**操作SSD**，并**没有通过操作系统的文件系统**，而是直接操作SSD里面的**块**和**页**
   - 对于KV数据库来说，操作系统里面的**文件系统**，相当于多了一层**间接层**，只会**降低性能**
3. **读写**数据的优化
   - 在**写入**数据的时候，AeroSpike**尽可能去写一个较大的数据块**，而不是频繁地去写很多小的数据块
     - 这样，SSD**不太容易频繁出现磁盘碎片**
     - 另外，一次性写入一个大的数据块，更容易利用好**顺序写入**的**性能优势**
     - AeroSpike写入的数据块，是**128KB**，远比一个页的**4KB**要大得多
   - 在**读取**数据的时候，AeroSpike可以读取**512 Bytes**这样的小数据
     - 因为SSD的**随机读性能很好**，也不像**写入数据**那样有**擦除寿命**的问题
     - 很多时候读取的数据需要在**网络**上传输，如果一次性读出比较大的数据，就可能会导致**网络带宽**不够用
4. AeroSpike是一个对**响应时间要求很高**的**实时**KV数据库，如果出现**严重的写放大效应**，会导致**写入数据的响应时间大幅度变长**
   - **持续**进行**磁盘碎片整理**
     - 采用**高水位**算法：一旦一个物理块里面的数据碎片超过**50%**，就把这个物理块**搬运压缩**，然后进行**数据擦除**
   - AeroSpike给出最佳实践
     - 为了保障数据库的性能，只用到SSD**标定容量的50%**
     - 人为地给SSD预留50%的预留空间，以确保SSD的**写放大效应尽可能小**，不会影响数据库的**访问性能**

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-ssd-aerospike.jpg" width=1000/>

## 参考资料
[深入浅出计算机组成原理](https://time.geekbang.org/column/intro/100026001)