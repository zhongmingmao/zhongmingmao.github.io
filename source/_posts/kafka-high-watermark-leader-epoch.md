---
title: Kafka -- 高水位 + Leader Epoch
mathjax: false
date: 2019-09-20 10:22:43
categories:
    - Middleware
    - MQ
    - Kafka
tags:
    - Middleware
    - MQ
    - Kafka
    - Stream
---

## 高水位

### 水位的定义
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-watermark.png" width=1000/>

<!-- more -->

1. 经典教科书
    - 在时刻T，任意创建时间（**Event Time**）为`T'`，且`T'<=T`的所有事件都已经到达，那么T就被定义为水位
2. 《Streaming System》
    - 水位是一个**单调增加**且表征**最早未完成工作的时间戳**
3. 上图中标注为`Completed`的蓝色部分代表**已经完成**的工作，标注为`In-Flight`的红色部分代表**正在进行中**的工作
    - 两者的**边界**就是水位线
4. 在**Kafka**中，水位不是时间戳，而是与位置信息绑定的，即用**消息位移**来表征水位
    - Kafka中也有**低水位**（Low Watermark），是与Kafka**删除消息**相关联的概念

### 高水位的作用
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-high-watermark.png" width=800/>

1. 两个作用
    - 定义**消息可见性**，即用来标识分区下的哪些消息可以被消费者消费的
    - 帮助Kafka完成**副本同步**
2. 上图是某个分区**Leader副本**的高水位图，在**分区高水位以下**的消息被认为是**已提交消息**，反之为未提交消息
    - **消费者只能消费已提交消息**，即位移小于8的所有消息
    - 暂不讨论Kafka事务，Kafka的**事务**机制会影响消费者所能看到的消息的范围，不只是简单依赖高水位来判断
        - 而是依靠**LSO**（Log **Stable** Offset）的位移值来判断事务型消费者的可见性
    - **位移值等于高水位的消息也属于未提交消息**，即高水位上的消息是不能被消费者消费的
    - 图中还有一个**日志末端位移**（Log **End** Offset，**LEO**）的概念，表示**副本写入下一条消息的位移值**
        - LEO为15，方框是虚线，表示当前副本只有15条消息，位移从0到14，下一条新消息的位移为15
    - `[高水位,LEO)`的消息属于**未提交消息**，在同一个副本对象，**高水位值不会大于LEO值**
    - **高水位**和**LEO**是副本对象的两个重要属性
        - Kafka**所有副本对象**都有对应的高水位和LEO，而Kafka使用**Leader副本的高水位**来定义**所在分区的高水位**

### 高水位的更新机制

#### 远程副本
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-high-watermark-update.png" width=600/>

1. 每个副本对象都保存了一组高水位和LEO值，**Leader副本所在的Broker**还保存了_**其它Follower副本的LEO值**_
2. Kafka把Broker 0上保存的Follower副本又称为**远程副本**（**Remote** Replica）
3. Kafka**副本机制**在运行过程中
    - 会更新
        - Broker 1上Follower副本的高水位和LEO值
        - Broker 0上Leader副本的高水位和LEO以及**所有远程副本的LEO**
    - 不会更新
        - Broker 0**所有远程副本的高水位值**，即图中标记为**灰色**的部分
4. Broker 0保存远程副本的作用
    - **帮助**Leader副本**确定**其**高水位**，即**分区高水位**

#### 更新时机
| 更新对象 | 更新时机 |
| --- | --- |
| Broker 0上Leader副本的LEO | Leader副本**接收**到生产者发送的消息，**写入到本地磁盘**后，会更新其LEO值 |
| Broker 1上Follower副本的LEO | Follower副本从Leader副本**拉取**消息，**写入本地磁盘**后，会更新其LEO值 |
| Broker 0上远程副本的LEO | Follower副本从Leader副本**拉取**消息时，会告诉Leader副本**从哪个位移开始拉取**，<br/>Leader副本会使用这个位移值来更新远程副本的LEO |
| Broker 0上Leader副本的高水位 | 两个更新时机：一个是Leader副本更新其LEO之后，一个是更新完远程副本LEO之后<br/>具体算法：取Leader副本和所有与Leader**同步**的远程副本LEO中的**最小值** |
| Broker 1上Follower副本的高水位 | Follower副本成功更新完LEO后，会比较其LEO与**Leader副本发来的高水位值**，<br/>并用两者的**较小值**去更新自己的高水位 |

1. 与Leader副本保持同步，需要满足两个条件
    - 该远程Follower副本在**ISR**中
    - 该远程Follower副本LEO值**落后**Leader副本LEO值的时间**不超过**参数`replica.lag.time.max.ms`（**10秒**）
2. 某个副本能否进入ISR是由第二个条件判断的
    - 2个条件判断是为了应对意外情况：**Follower副本已经追上Leader，却不在ISR中**
    - 假设Kafka只判断第1个条件，副本F刚刚重启，并且已经具备进入ISR的资格，但此时尚未进入到ISR
        - 由于缺少了副本F的判断，**分区高水位有可能超过真正ISR中的副本LEO**，而**高水位>LEO**是**不允许**的

#### Leader副本
1. **处理生产者请求**
    - 写入消息到本地磁盘，更新**LEO**
    - 更新**分区高水位**值
        - 获取Leader副本所在Broker端保存的所有远程副本LEO值`{LEO-1, LEO-2,... LEO-n}`
        - 获取Leader副本的LEO值：`currentLEO`
        - 更新**`currentHW = min(currentLEO, LEO-1, LEO-2,... LEO-n)`**
2. **处理Follower副本拉取消息**
    - 读取**磁盘**（或**页缓存**）中的消息数据
    - 使用Follower副本发送请求中的位移值来更新远程副本的**LEO**值
    - 更新**分区高水位**值（与上面一致）

#### Follower副本
1. **从Leader拉取消息**
    - 写入消息到本地磁盘
    - 更新**LEO**
    - 更新**高水位**值
        - 获取**Leader发送**的高水位值：`currentHW`
        - 获取步骤2中更新的LEO值：`currentLEO`
        - 更新高水位**`min(currentHW, currentLEO)`**

### 副本同步样例
主题是**单分区两副本**，首先是初始状态，所有值都是0
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-high-watermark-example-1.png" width=1000/>

当生产者向主题分区发送一条消息后，状态变更为
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-high-watermark-example-2.png" width=1000/>

此时，Leader副本成功将消息写入到**本地磁盘**，将**LEO**值更新为1（更新高水位值为0，并把结果发送给Follower副本）
Follower再次尝试从Leader拉取消息，此时有消息可以拉取，Follower副本也成功更新**LEO**为1（并将高水位更新为0）
此时，Leader副本和Follower副本的**LEO**都是1，但各自的**高水位依然是0**，需要等到**下一轮**的拉取中被更新
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-high-watermark-example-3.png" width=1000/>

在新一轮的拉取请求中，由于位移值为0的消息已经拉取成功，因此Follower副本这次拉取请求的位移值为**1**
Leader副本接收到此请求后，更新**远程副本LEO**为**1**，然后更新**Leader高水位**值为**1**
最后，**Leader副本**会将**当前更新过的高水位**值1发送给**Follower副本**，Follower副本接收到后，也会将自己的高水位值更新为**1**
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-high-watermark-example-4.png" width=1000/>

## Leader Epoch

### 基本概念
1. 上面的副本同步过程中，Follower副本的**高水位更新**需要**一轮额外的拉取请求**才能实现
    - 如果扩展到**多个Follower副本**，可能需要**多轮拉取请求**
    - 即**Leader副本高水位更新**和**Follower副本高水位更新**在**时间**上存在**错配**
        - 这种错配是很多**数据丢失**或**数据不一致**问题的根源
        - 因此，社区在**0.11**版本正式引入了`Leader Epoch`概念，来规避**高水位更新错配**导致的各种**不一致**问题
2. Leader Epoch可以大致认为是**Leader版本**，由两部分数据组成
    - **Epoch**
        - 一个**单调递增**的版本号
        - 每当**副本领导权发生变更**时，都会增加该版本号
        - 小版本号的Leader被认为是**过期Leader**，不能再行使Leader权利
    - **起始位移**（Start Offset）
        - **Leader副本**在该Epoch值上写入的**首条消息**的位移
3. 两个Leader Epoch，`<0,0>`和`<1,120>`
    - `<0,0>`表示版本号为0，该版本的Leader从位移0开始保存消息，一共保存了120条消息
    - 之后Leader发生了**变更**，版本号增加到1，新版本的起始位移是120
4. Broker在**内存**中为每个**分区**都缓存`Leader Epoch`数据，同时还会**定期**地将这些数据**持久化**到一个`checkpoint`文件中
    - 当**Leader副本写入消息到磁盘**时，Broker会尝试更新这部分缓存
    - 如果Leader是**首次**写入消息，那么Broker会向缓存中**增加Leader Epoch条目**，否则不做更新
    - 这样每次有Leader变更时，新的Leader副本会查询这部分缓存，取出对应的Leader Epoch的起始位移
        - 然后进行相关的逻辑判断，避免**数据丢失**和**数据不一致**的情况

### 数据丢失
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-leader-epoch-example-1.png" width=1000/>

1. 开始时，副本A和副本B都处于正常状态，A是Leader副本
2. 某个的生产者（**默认acks设置**）向A发送了两条消息，A全部写入成功，Kafka会通知生产者说两条消息全部发送成功
3. 假设Leader和Follower都写入了这两条消息，而且Leader副本的高水位也更新了，但_**Follower副本的高水位还未更新**_
4. 此时副本B所在的Broker**宕机**，当它**重启**回来后，副本B会执行_**日志截断!!**_
    - **将LEO值调整为之前的高水位值!!**，也就是1
    - 位移值为1的那条消息被副本B**从磁盘中删除**，此时副本B的**底层磁盘文件**中只保留1条消息，即位移为0的消息
5. 副本B执行完日志截断操作后，开始从A拉取消息，此时恰好副本A所在的Broker也宕机了，副本B自然成为新的Leader
    - 当A回来后，需要执行相同的**日志截断**操作，但**不能超过新Leader**，即**将高水位调整与B相同的值**，也就是1
    - 操作完成后，位移值为1的那条消息就从两个副本中被**永远抹掉**，造成了**数据丢失**

### Leader Epoch规避数据丢失
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/geek-time/kafka-leader-epoch-example-2.png" width=1000/>

1. Follower副本B重启后，需要向A发送一个特殊的请求去获取**Leader的LEO值**，该值为2
2. 当获知Leader LEO后，B发现该LEO值**大于等于**自己的LEO，而且缓存中也**没有保存任何起始位移值>2的Epoch条目**
    - **B无需执行任何日志截断操作**
    - 明显改进：_**副本是否执行日志截断不再依赖于高水位进行判断**_
3. A宕机，B成为Leader，当A重启回来后，执行与B相同的逻辑判断，发现同样**不需要执行日志截断**
    - 至此位移值为1的那条消息在两个副本中**均得到保留**
    - 后面生产者向B**写入新消息**后，副本B所在的Broker缓存中会生成新的Leader Epoch条目：**`[Epoch=1, Offset=2]`**

## 小结
1. **高水位**在界定**Kafka消息对外可见性**以及实现**副本机制**方面起到非常重要的作用
    - 但设计上的缺陷给Kafka留下了很多**数据丢失**或**数据不一致**的潜在风险
2. 为此，社区引入了**`Leader Epoch`**机制，尝试规避这类风险，并且效果不错

## 参考资料
[Kafka核心技术与实战](https://time.geekbang.org/column/intro/100029201)