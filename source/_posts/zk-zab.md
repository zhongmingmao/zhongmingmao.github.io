---
title: Zookeeper - ZAB协议小记
date: 2017-07-09 00:06:25
categories:
    - Zookeeper
tags:
    - Netease
    - Zookeeper
    - ZAB
---

{% note info %}
本文将简要介绍`Zookeeper`的`ZAB`协议
{% endnote %}

<!-- more -->

# 基本概念

## ZAB VS Base-Paxos
- `Base-Paxos`是**`通用的分布式一致性算法`**
- `ZAB协议`不是`Base-Paxos`的典型实现，而是特别为`Zookeeper`设计的一种**`支持崩溃恢复的原子广播协议`**
- 相对于`ZAB协议`，`Base-Paxos`主要存在2个问题：**`活锁问题`**+**`全序问题`**
    - `活锁问题`是指在`Base-Paxos`算法中，由于并不存在`Leader`角色，**`新轮次可以不断抢占旧轮次`**，如此循环往复，产生`活锁`
    - `全序问题`是指如果消息a在消息b之前发送，则所有Server应该看到`相同的结果`，但`Base-Paxos`并不保证这一点
- `ZAB`的解决方案
    - 为了解决`活锁问题`，`ZAB协议`引入了`Leader`角色，所有的`事务请求`只能由`Leader`处理，但是`单Leader`会存在`单点问题`，`ZAB协议`进而引入`崩溃恢复模式`
    - 为了解决`全序问题`，`ZAB协议`引入了`ZXID`（全局单调递增的唯一ID）和利用`TCP的FIFO特性`

## 服务器角色
`Zookeeper`中服务器有三种角色：**`Leader`**、**`Follower`**和**`Observer`**，其中`Observer`与`ZAB`协议本身无关
- `Leader`的工作职责
    - **`事务请求`**的唯一调度者和处理者，保证集群事务处理的`顺序性`
    - 调度集群内部其他服务器（`Follower`和`Observer`）
- `Follower`的工作职责
    - 处理**`非事务请求`**
    - 转发`事务请求`给`Leader`服务器
    - 参与`事务Proposal的投票`
    - 参与`Leader选举投票`
- `Observer`的工作职责
    - 用于`观察并同步`集群的最新状态变化
    - `Observer`在工作原理上与`Follower`基本一致，与`Follower`的主要区别
        - `Observer`只提供非事务服务
        - `Observer`不参与任何形式的投票
    - 通常用于在`不影响集群事务处理能力`的前提下`提升集群的非事务处理能力`

## 主备模式架构
Zookeeper实现了一种`主备模式`的系统架构来保持集群中`各副本之间的数据一致性`，Zookeeper使用`单一的主进程`（`Leader`）来接收并处理客户端的所有**`事务请求`**，并采用**`ZAB协议`**，将服务器数据的状态变更以`事务Proposal`的形式**`广播`**到所有副本进程（`Follower`和`Observer`）

### 事务请求
- 所有事务请求必须由一个`全局唯一`的服务器来协调处理，这样的服务器被称为`Leader`，而其他服务器则被称为`Follower`（`ZAB`协议不考虑`Observer`）
- `Leader`负责将一个客户端的**`事务请求`**转换成为一个**`事务Proposal`**，并将该`事务Proposal`分发给集群中所有的`Follower`
- `Leader`等待所有的`Follower`关于`事务Proposal`的反馈，一旦_**`半数或以上`**_的`Follower`进行了正确地反馈，那么`Leader`会再次向所有的`Follower`分发`Commit`消息，要求其将`事务Proposal`进行`Commit`（类似于`2PC`，但移除了`事务回滚`，容易导致数据不一致，需要`崩溃恢复模式`的支持）

#### 半数以上（Follower + Leader）
_**`半数以上`**_的服务器能够正常相互通信，保证了不会因网络分区等原因而导致同时出现两组集群服务，因为两个 _**`半数以上`**_必然有`交集`！！

#### 半数或以上（Follower）
`半数或以上（Follower）`是为了保证`半数以上（Follower + Leader）`
假若有`n-1`个`Follower`，S = sum(`半数或以上的Follower` + `Leader`) >= `ceil[(n-1)/2]+1`
- 如果n为偶数，即`n=2k`，S >= `ceil[(n-1)/2]+1` = `ceil[(2k-1)/2]+1` = `k+1` ，剩下`k-1 < k+1`
- 如果n为奇数，即`n=2k+1`，S >= `ceil[(n-1)/2]+1` = `ceil[(2k)/2]+1` = `k+1` ，剩下`k < k+1`
- 假若有`2个Follower`，`半数或以上的Follower`为`1、2`；假若有`3个Follower`，`半数或以上的Follower`为`2、3`

## 两种模式
ZAB协议运行过程中，存在两种模式：**`崩溃恢复模式`**+**`消息广播模式`**，模式切换图如下
![zk_zab_mode.png](http://ovk7evjd7.bkt.clouddn.com/zk_zab_mode.png)

### 消息广播模式

#### 示意图
![zk_zab_mode_crash_recovery.png](http://ovk7evjd7.bkt.clouddn.com/zk_zab_mode_crash_recovery.png)

#### 具体过程（类2PC）
- 针对客户端的`事务请求`，`Leader`会为其生成对应的`事务Proposal`，`Leader`会为每个`事务Proposal`分配一个`全局单调递增的唯一ID`，即_**`ZXID`**_
- 消息广播过程中，`Leader`会为每一个`Follower`都各自分配一个**`单独的队列`**，然后将需要广播的`事务Proposal`依次放入到这些队列中去，并根据**`FIFO`**策略进行消息发送
- 每一个`Follower`在接收到`事务Proposal`之后，都会首先将其以_**`事务日志`**_的形式写入到`本地磁盘`中，并且在成功写入后向`Leader`反馈`ACK`
- 当`Leader`接收到_**`半数或以上`**_的`Follower`反馈的`ACK`后，就会广播一个`Commit`消息给所有的`Follower`以通知其进行`事务提交`，同时`Leader`自身也会完成`事务提交`
- 每一个`Follower`接收到`Commit`消息后，也会完成`事务提交`

### 崩溃恢复模式
- 恢复过程结束后需要`选举新Leader`，`ZAB协议`需要一个高效且可靠的`Leader选举算法`，在选举出`准Leader`后，需要进行`数据同步`，同步完成后，_**`准Leader`**_成为_**`正式Leader`**_
- 崩溃恢复阶段需要处理2种特殊情况
    - 提交已被Leader Commit的事务
    - 丢弃只被Leader Propose的事务

# 进阶理解

## 分布式系统模型

### 进程组 ∏
分布式系统由一组进程构成：`∏ = {P1,P2,...,Pn}`，各个进程之间通过相互通信来实现消息的传递

### 进程子集 Quorum
每个进程随时都可能崩溃退出，正常工作的进程处于`UP`状态，否则处于`DOWN`状态，_**`半数以上`**_处于`UP`状态的进程构成`进程子集Q`，`Q`满足两个条件：`∀Q，Q⊆∏`，`∀Q1和Q2，Q1∩Q2≠∅`

### 网络通信 Cij
`Cij`表示进程`Pi`和`Pj`之间的网络通信，其中`Pi∈∏，Pj∈∏`，`Cij`满足`完整性`和`前置性`

#### 完整性
如果进程`Pj`收到来自进程`Pi`的`消息m`，那么进程`Pi`一定确实发送了`消息m`

#### 前置性
如果进程`Pj`收到了`消息m`，那么存在`消息m'`：如果`消息m'`是`消息m`的**`前置消息`**，那么`Pj`务必先接收`消息m'`，然后再接收`消息m`，记为`m≺m'`

## 问题描述
使用`Zookeeper`的分布式系统，通常存在`大量的客户端进程`，依赖`Zookeeper`来完成类似配置存储等分布式协调工作，因此`Zookeeper`必须具备以下特性
- `高吞吐`和`低延时`
- 在`高并发`的情况下完成`分布式数据的一致性处理`
- 同时能够`优雅地处理运行时故障`，具备快速从故障中恢复的能力

### 主进程周期
`ZAB`协议是`Zookeeper`框架的核心，任何时候都需要保证只有一个主进程负责消息广播，如果主进程崩溃了，需要选举出新的主进程，随着时间的推移，形成主进程序列：`P1,P2...Pe，∀Pe∈∏`，`e`称为**`主进程周期`**，如果`e`小于`e'`，那么`Pe`是`Pe'`之前的主进程，表示为`Pe≺Pe'`，进程可能会崩溃重启，因此`Pe`和`Pe'`本质上可能是`同一个进程`，只是处于`不同的主进程周期`而已。为了保证主进程每次广播出来的`事务Proposal`都是一致的，只有在 _**`充分完成崩溃恢复阶段`**_之后，新的主进程才可以开始生成`新的事务Proposal`并进行`消息广播`

### 广播事务Proposal
`transactions(v,z)`：实现事务Proposal的`广播`
- `v`为事务Proposal的`内容`
- `z`为事务Proposal的`标识`，`z=<e,c>`
    - `e`为`主进程周期`，`e=epoch(z)`
    - `c`为`当前主进程周期内的事务计数`，`c=counter(z)`
    - 如果`z'`优先于`z`，记为`z≺z'`，有2种情况
        - `epoch(z)<epoch(z')`：主进程周期不同
        - `epoch(z)==epoch(z') && counter(z)<counter(z')`：主进程周期相同

## 算法描述
- 整个ZAB协议主要包括`消息广播`和`崩溃恢复`两个过程，进一步可以细分为**`发现（Discovery）`**、**`同步（Synchronization）`**和**`广播（Broadcast）`**三个阶段，每一个分布式进程会`循环执行`这三个阶段
- **`崩溃恢复` = `发现`+ `同步` = （`选举准Leader` + `生成新主进程周期`） + `同步`**

### 术语

| 术语   | 说明                                                                     |
| ------ | ------------------------------------------------------------------------ |
| F.p    | Follower f处理过的`最后一个`事务Proposal                                 |
| F.zxid | Follower f处理过的历史事务Proposal中`最后一个`事务Proposal的事务标识ZXID |
| hf     | Follower f`已经处理过的事务Proposal序列`                                 |
| Ie     | `准Leader`完成发现阶段后的初始化历史记录                                 |

### 发现：选举准Leader + 生成新主进程周期
发现过程就是`Leader选举`过程，首先选举`准Leader`，然后完成`epoch`的更新（新的主进程周期）和`Ie`的初始化

#### 选举准Leader
进入`Leader选举`流程，即机器进入`LOOKING`状态，有3种情况
- 机器初始化启动，机器进入`LOOKING`状态
- `Follower`运行期间无法与`Leader`保持连接，`Follower`进入`LOOKING`状态
- `Leader`无法收到_**`半数或以上`**_ Follower的心跳检测，`Leader`进入`LOOKING`状态

当一个机器进入`Leader选举`流程时，当前集群可能处在两个状态：`存在（准）Leader`+`不存在（准）Leader`

##### 术语

| 术语   | 说明                                                                                       |
| ------ | ------------------------------------------------------------------------------------------ |
| SID    | Server ID，用来唯一标识一台Zookeeper集群中的机器，全局唯一，与myid一致                     |
| ZXID   | 事务ID，用来唯一标识一次服务器状态的变更，在同一时刻，集群中每一台机器的ZXID不一定完全一致 |
| Vote   | 当集群中的机器发现自己无法检测到Leader机器的时候，就会尝试开始投票                         |
| Quorum | `半数以上`机器，`quorum >= (n/2+1)`                                                        |

##### 集群存在（准）Leader
当该机器试图去选举`准Leader`的时候，会被告知当前集群的`（准）Leader`信息，对于该机器来说，仅仅需要与`（准）Leader`机器建立连接，并完成`数据状态同步`既可

##### 集群不存在（准）Leader
集群中的所有机器都处于一种试图选举出一个`准Leader`的状态，我们把这种状态称为`LOOKING`，处于`LOOKING`状态的机器会向集群中的所有其他机器发送消息，这个消息就是**`投票`**，投票消息组成：所推举的服务器`SID`和`ZXID`，**`(SID，ZXID)`**

###### 第1次投票
第1次投票，由于无法检测到集群中其他机器的状态信息，因此每台机器都**`将自己作为被推举的对象`**进行投票

###### 变更投票
集群中的每台机器发出自己的投票后，也会接收到来自集群中其他机器的投票，并依据一定的规则，来处理收到的其他机器的投票，并决定是否需要变更自己的投票

| 术语 | 说明 |
| --- | --- |
| vote_sid | 接收到的投票中所推举Leader服务器的SID |
| vote_zxid | 接收到的投票中所推举Leader服务器的ZXID |
| self_sid | 当前服务器自己的SID |
| self_zxid | 当前服务器自己的ZXID |

变更规则：
- `vote_zxid > self_zxid` ：认可当前收到的选票，并再次将该投票发送出去
- `vote_zxid < self_zxid` ：坚持自己的投票，不做任何变更
- `vote_zxid == self_zxid && vote_sid > self_sid` ：认可当前收到的选票，并再次将该投票发送出去
- `vote_zxid == self_zxid && vote_sid < self_sid` ：坚持自己的投票，不做任何变更

###### 统计投票
如果一台机器收到_**`半数以上`**_的相同的投票（包括自身投票），那么这个投票对应的`SID`即为**`准Leader`**

###### 示例
![zk_zab_election.png](http://ovk7evjd7.bkt.clouddn.com/zk_zab_election.png)

#### 生成新主进程周期
`e'`：表示新的主进程周期，`Ie'`：`e'`对应的初始化历史记录，`准Leader L`与`Follower F`的工作流程
- `Follower F`将自己最后接受的事务Proposal的epoch值**`CEPOCH(F.p)`**发送给`准Leader L`
- 当`准Leader L`接收来自_**`半数或以上`**_ Follower的`CEPOCH(F.p)`消息后，从这些`CEPOCH(F.p)`消息中选取出**`最大的epoch`**值，然后`加1`，即为`e'`，最后生成**`NEWEPOCH(e')`**消息并发送给这些_**`半数或以上`**_ Follower
- 当`Follower`接收到来自`准Leader L`的`NEWEPOCH(e')`消息后，检查当前的`CEPOCH(F.p)是否小于e'`，如果是，则将`CEPOCH(F.p)`更新为`e'`，同时向`准Leader L`发送**`ACK-E`**消息（包含当前`Follower`的epoch值`CEPOCH(F.p)`以及该`Follower`已经处理过的事务Proposal序列 _**`hf`**_）
- 当`准Leader L`接收到来自_**`半数或以上`**_的`Follower`的`ACK-E`消息后，`准Leader L`会从这_**`半数或以上`**_的`Follower`中选取一个`Follower F`，并将其 _**`hf`**_作为初始化历史记录`Ie'`，假若选取`F`，那么`∀F'∈Q`，满足下面的其中1个条件
    - `CEPOCH(F'.p)<CEPOCH(F.p)`
    - `CEPOCH(F'.p)==CEPOCH(F.p) && (F'.zxid≺F.zxid || F'.zxid==F.zxid )`

### 同步：准Leader ➔ 正式Leader
`准Leader L`与与`Follower F`的工作流程
- `准Leader L`向`Quorum`中的`Follower`发送**`NEWLEADER(e',Ie')`**消息
- 当`Follower F`接收到`准Leader L`的`NEWLEADER(e',Ie')`消息后
    - 如果`Follower F`的`CEPOCH(F.p)≠e'`，不参与本轮的同步，直接进入**`发现阶段`**
    - 如果`CEPOCH(F.p)=e'`，那么`Follower`会执行`事务应用操作`，即`∀<v,z>∈Ie'`，`Follower`都会接受`<e',<v,z>>`，最后`Followe`会向`准Leader L`发送**`ACK-LD`**消息，表示已经接受并处理`Ie'`中所有的`事务Proposal`
- 当`准Leader L`接收到_**`半数或以上`**_的`Follower`的`ACK-LD`消息后，向**`所有`**的`Follower`发送**`Commit-LD`**消息，此时`准Leader L`完成`同步`阶段，成为 _**`正式Leader`**_
- 当`Follower`接收到`Commit-LD`消息后，就会依次提交所有`Ie'`中**`尚未处理`**的`事务Proposal`

### 广播
广播阶段类似于`2PC`，`ZAB协议`移除了2PC的`事务回滚`，因此`Follower`只能`回复ACK`或者`不回复`，`Leader`主要收到_**`半数或以上`**_的`ACK`，就可以发送`Commit`，这样的设计很容易带来`数据不一致性`，因此才需要`崩溃恢复模式`（Leader选举+数据同步）

#### 工作流程
- `Leader L`接收到客户端新的`事务请求`后，会生成对应的事务`Proposal<e',<v,z>>`，并根据`ZXID的顺序`向所有`Follower`发送**`Propose<e',<v,z>>`**，其中`epoch(z)=e'`
- `Follower`根据消息接收的先后顺序来处理这些来自`Leader`的`事务Proposal`，并将它们`追加到hf`，之后给`Leader`反馈**`ACK`**消息
- 当`Leader`接收到来自_**`半数或以上`**_ Follower针对`Propose<e',<v,z>>`的`ACK`消息后，就会向所有`Follower`发送**`Commit<e',<v,z>>`**消息
- 当`Follower`接收到来自`Leader`的`Commit<e',<v,z>>`消息后，就会开始提交事务`Proposal<e',<v,z>>`，此时必定已经提交了事务`Proposal<e',<v',z'>>`，其中`<v',z'> ∈ hf，z'≺z`

#### 两种特殊情况

##### 提交已被Leader Commit的事务

###### 发生场景
`Leader`发送`Propose`请求，`Follower F1`和`Follower F2`都向`Leader`回复了`ACK`，`Leader`向所有的`Follower`发送`Commit`请求并`Commit自身`，此时`Leader`宕机，**`Leader已经Commit`**，但**`Follower尚未Commit`**，数据不一致

###### 处理方式
选举`F.zxid`最大的`Follower`成为`新的准Leader`，由于`旧Leader`宕机前，_**`半数或以上`**_的Follower曾经发送`ACK`消息，`新的准Leader`必然是这`半数或以上Follower`的一员；`新的准Leader`会发现自身存在**`已经Propose但尚未Commit的事务Proposal`**，`新的准Leader`会向所有的`Follower`先发送`Propose`请求，再发送`Commit`请求

##### 丢弃只被Leader Propose的事务

###### 发生场景
`Leader`收到了`事务请求`，将其包装成了`事务Proposal`，此时`Leader`宕机，`Follower`并没有收到`Propose`请求，`Follower`进入选举阶段，选举产生`新Leader`，`旧的Leader重启`，以`Follower`的角色加入集群，此时`旧Leader`上有一个`多余的事务Proposal`，数据不一致

###### 处理方式
`新的准Leader`会根据自己服务器上`最后被提交的事务Proposal`和`Follower的事务Proposal`进行对比，然后`新的准Leader`要求`Follower`执行一个**`回退操作`**，回退到一个`已经被集群半数以上机器提交的最新的事务Proposal`

### 三阶段示意图
![zk_zab_3_phase.png](http://ovk7evjd7.bkt.clouddn.com/zk_zab_3_phase_1.png)
在正常运行时，ZAB协议一直运行在**`广播阶段`**，如果出现Leader宕机或其他原因导致的Leader缺失，此时ZAB协议会进入**`发现阶段`**

## 运行分析
运行状态切换
![zk_zab_state_switch.png](http://ovk7evjd7.bkt.clouddn.com/zk_zab_state_switch.png)
- 组成`ZAB协议`的所有进程`启动`的时候，初始状态为`LOOKING`
- 如果进程发现`已经存在新的（准）Leader`，马上切换到`FOLLOWING`状态，并开始和（准）Leader保持同步
- 处于`LOOKING`状态的进程称为`Follower`，处于`LEADING`状态的进程称为`Leader`
- 当检测到`Leader`崩溃或放弃领导地位，其余`Follower`会切换到`LOOKING`状态，并开始新一轮的选举
- 在`ZAB协议`运行过程中，每个进程的状态都会在`LOOKING`、`FOLLOWING`和`LEADING`之间不断地转换
- 完成`Leader选举`阶段，进程成为`准Leader`，完成`数据同步`阶段，`准Leader成为正式Leader`
    - `准Leader`接收来自`半数或以上`的Follower进程针对`Le'`的`NEWLEADER(e',Ie')`的`ACK-LD`消息，那么`Le'`正式成为了周期`e'`的`Leader`
    - 在`原子广播`阶段，`Leader`会为每一个与自己保持同步的`Follower`创建一个`操作队列`，`Leader`与所有的`Follower`之间需要通过`心跳检测`机制来感知彼此。如果在指定的超时时间内`Leader`无法从`半数或以上`的Follower那里接收到`心跳检测`或者`TCP连接断开`，`Leader`和所有的`Follower`都会切换到`LOOKING`状态

# 参考资料
[从Paxos到Zookeeper](https://book.douban.com/subject/26292004/)

<!-- indicate-the-source -->
