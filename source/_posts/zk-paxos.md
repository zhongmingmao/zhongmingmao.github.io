---
title: Zookeeper - Paxos协议小记
date: 2017-07-05 00:06:25
categories:
    - Zookeeper
tags:
    - Netease
    - Zookeeper
    - Paxos
---

{% note info %}
本文将简要介绍`Paxos`协议
{% endnote %}

<!-- more -->

# 基础概念

## Paxos协议
`Paxos`协议是一种**`通用的分布式一致性协议`**，用于解决**`一致性问题`**

## 一致性问题
`Paxos`协议用来确定一个**`不可变`**变量的取值，取值具有2个特点：
- 取值可以为`任意二进制数据`
- 取值`一旦确定将不可被更改`，并且可以被获取到（`不可变性，可读取性`）

### 系统抽象
设计一个系统，来存储名称为var的变量，满足以下4个条件：
- 系统内部由多个`Acceptor`组成，负责存储和管理var变量
- 系统外部有多个`Proposer`，这些`Proposer`可以`并发`地调用`Acceptor`对外提供的API接口，向系统提交不同的var取值
- var取值为任意二进制数据
- `Acceptor`对外提供的API接口：**`propose(var,V) => <ok,f> or <error>`**，f可能是当前`Proposer`提交成功的`V`，也可能是其他`Proposer`提交成功的`V'`

#### var的一致性
- 如果var取值`没有确定`，则var的取值为`null`
- 一旦var的取值`被确定`，则**`不可被更改`**，并且可以一直获得这个值

#### 系统的容错特性
- 可以容忍**`任意数量`**的`Proposer`出现故障
- 可以容忍**`半数以下`**的`Acceptor`出现故障

# 实现方案

## 互斥访问权

### 适用场景
系统由`单个Acceptor`组成

### 策略
- 通过**`互斥锁`**机制，来管理`Proposer`的`并发`执行
- `Proposer`首先向`Acceptor`申请`互斥锁`，申请成功后才能请求`Acceptor`接受自己的取值
- `Acceptor`向`Proposer`发放`互斥锁`，`Acceptor`只接收持有互斥锁的`Proposer`提交的取值
- 让`Proposer`按照获取`Acceptor`互斥锁的顺序来依次访问`Acceptor`
- 一旦`Acceptor`接收了某个`Proposer`的取值，则认为var的取值被确定，其他`Proposer`无法再更改var的取值

### 实现

#### 基本方法
- Acceptor保存`变量var`和一个`互斥锁Lock`
- `Acceptor::prepare()`：`Proposer`向`Acceptor`请求申请互斥锁
- `Acceptor::release()`：`Proposer`向`Acceptor`请求释放互斥锁
- `Acceptor::accept(var,V)`：如果`Proposer`已经持有互斥锁，并且var没有取值，则设置var为`V`，然后向`Acceptor`请求释放互斥锁

#### propose(var，V)的两阶段实现

##### 第1阶段
`Proposer`通过调用`Acceptor::prepare()`向`Acceptor`请求申请互斥锁
- 申请互斥锁`失败`，返回`<error>`，说明当前互斥锁被其他`Proposer`占用，尚未释放
- 申请互斥锁`成功`并且返回var变量的`当前值f`，然后进入第2阶段


##### 第2阶段
进入第2阶段，说明当前`Proposer`申请互斥锁`成功`并且返回var变量的`当前值f`
- 如果当前var的取值`f不为null`，说明var变量已经被其他`Proposer`设置成功，**`形成了确定性取值`**，那么`Proposer`通过`Acceptor::release()`向`Acceptor`请求释放互斥锁，返回`<ok,f>`
- 如果当前var的取值`f为null`，说明var变量**`尚未形成确定性取值`**，那么`Proposer`通过`Acceptor::accept(var,V)`提交数据V，并且向`Acceptor`请求释放互斥锁，返回`<ok,V>`

### 结论
- 通过`Acceptor`的互斥锁让**`Proposer串行运行`**，可以简单地实现`var取值的一致性`
- 如果`Proposer`在`释放互斥锁之前宕机`，将会导致系统陷入**`死锁`** ➔ 不能容忍**`任意数量`**的`Proposer`出现故障！！

## 抢占式访问权 + 后者认同前者

### 适用场景
系统由`单个Acceptor`组成，引入**`抢占式访问权`**，用于解决互斥访问权的**`死锁`**问题

### 策略

#### 抢占式访问权
- `Acceptor`可以让某个`Proposer`获取到的访问权失效，不再接受该`Proposer`的访问
- `Acceptor`可以将访问权发放给其他`Proposer`，让其他`Proposer`访问`Acceptor`
- `Proposer`向`Acceptor`申请访问权时必须指定编号**`epoch（值越大，代表越新）`**
- `Proposer`在获取到访问权之后，才能向`Acceptor`提交取值
- `Acceptor`采用**`喜新厌旧`**的原则
    - `Acceptor`一旦接收到的`新epoch`（epoch值更大），立马让`旧epoch`的访问权失效，不再接受持有`旧epoch`访问权的`Proposer`提交的取值
    - `Acceptor`给`新epoch`对应的`Proposer`发放访问权，只接收该`Proposer`提交的取值（同样可以被抢占）

#### 保证一致性
为了保证**`一致性`**，不同`epoch`对应的`Proposer`之间采用**`后者认同前者`**的原则
- 在确定**`旧epoch无法形成确定性取值`**时，`新epoch`提交自己的value，不会冲突
- 一旦**`旧epoch形成了确定性取值`**，新的`epoch`肯定可以获得此值，并且会`认同`此值，不会进行更改

### 实现

#### 基本方法

##### Acceptor保存的状态
- 当前var的取值：**`<accepted_epoch,accepted_value>`**，表示变量var在`accepted_epoch`形成了_`确定性取值`_`accepted_value`
- 最新发放访问权的epoch：**`latest_prepared_epoch`**，`Proposer`如果要成功抢占访问权，指定的`新epoch`必须大于`latest_prepared_epoch`

##### Acceptor::prepare(epoch)
`Proposer`向`Acceptor`请求访问权，具有抢占性质
- `Proposer`指定`epoch`
- `Acceptor`只接受`大于latest_prepared_epoch`的`epoch`，并给予`Proposer`关于该`epoch`的访问权
- 更新`latest_prepared_epoch=epoch`，返回var的当前取值（即`<ok,accepted_epoch,accepted_value>`）
- 使其他`Proposer`（之前已经获得过访问权）的访问权失效，不再接受它们的访问

##### Acceptor::accept(var,prepared_epoch,V)
`prepared_epoch`为`Acceptor::prepare(epoch)`指定的`epoch`，验证**`latest_prepared_epoch`**与**`prepared_epoch`**是否相等
- 相等，说明当前`Proposer`持有的epoch访问权`依然有效`，那么设置var的取值，即**`<accepted_epoch,accepted_value>` ➔ `<prepared_epoch,V>`**
- 不相等，说明当前`Proposer`持有的epoch访问权`已经被抢占`，无法继续运行

#### propose(var，V)的两阶段实现

##### 第1阶段
`Proposer`指定`epoch`，并通过调用`Acceptor::prepare(epoch)`向`Acceptor`请求访问权
- 请求访问权`失败`，返回`<error>`，说明当前`Proposer`指定的`epoch`不比`Acceptor`的`latest_prepared_epoch`大
- 请求访问权`成功`并且返回var变量的当前值`<accepted_epoch,accepted_value>`，然后进入第2阶段

##### 第2阶段
采用**`后者认同前者`**的原则执行
- `var取值为<null,null>`，则`旧epoch肯定尚未形成确定性取值`，`Proposer`通过调用`Acceptor::accept(var,prepared_epoch,V)`向`Acceptor`提交取值
    - 提交成功，返回**`<ok,prepared_epoch,V>`**
    - 提交失败，返回`<error>`（`被新epoch抢占`或者`Acceptor发生故障`）
- `var取值不为<null,null>`，则其他`Proposer`设置成功，变量var`已经形成确定性取值`，认同此值不再更改，直接返回**`<ok,accepted_epoch,accepted_value>`**

### 样例
![zk_paxos_2.png](http://ovk7evjd7.bkt.clouddn.com/zk_paxos_2.png)

### 结论
- 让`Proposer`按照`epoch递增的顺序`抢占式地依次运行，采用`后者认同前者`的原则
- 这样可以了`避免Proposer故障带来的死锁问题`，并且仍然`保留var取值的一致性`
- 但仍然存在_**`单点问题`**_，`Acceptor`故障会导致整个系统宕机

## Paxos

### 适用场景
系统内部由`多个Acceptor`组成，避免`单点Acceptor故障`

### 策略
- `Acceptor`的实现与抢占式访问权类似，采用`喜新厌旧`的原则
- `Paxos`采用_**`少数服从多数`**_的思路：一旦某个epoch的取值f被_**`半数以上`**_的`Acceptor`接受，系统则认为此var了形成`确定性取值`，不再更改

`半数以上`
- `5`个`Acceptor`，`半数以上`为：`3、4、5`
- `6`个`Acceptor`，`半数以上`为：`4、5、6`

### 实现

#### propose(var，V)的两阶段实现

##### 第1阶段
`Proposer`指定`epoch`，向所有的`Acceptor`请求该`epoch`的访问权
- `Proposer`获取少于`半数以上`的`Acceptor`关于`epoch`的访问权，`Proposer`结束第1阶段的运行，但无法进入第2阶段
- `Proposer`获取`半数以上`的`Acceptor`关于`epoch`的访问权（并返回var的当前值），进入第2阶段

关键点：_**`半数以上`**_ ➔ 当多个`Proposer`并发地向所有`Acceptor`请求关于`同一个epoch`的访问权，_**`最多只有一个Proposer`**_能获得`半数以上`Acceptor请求关于该`epoch`的访问权并进入到第2阶段！！

##### 第2阶段
采用`后者认同前者`的原则执行
- 如果在第1阶段获取到的var的当前值**`都为null`**，说明var**`尚未形成确定性取值`**，此时`Proposer`努力使**`V`**成为`确定性取值`（对应`<epoch,V>`）
    - `Proposer`向`epoch对应的所有Acceptor`（半数以上的Acceptor，不一定是所有）提交取值`<epoch,V>`
    - 如果收到`半数以上`提交成功，则已经形成确定性取值，返回`<ok,V>`
    - 否则，返回`<error>`（`被新epoch抢占`或者`Acceptor发生故障`）
- 如果第1阶段获取到的var的当前值**`不都为null`**，认同**`最大accepted_epoch对应的取值f`**，努力使得**`f`**成为`确定性取值`（对应`<epoch,f>`）
    - 如果此时f已经被`半数以上`的`Acceptor`接受，则说明f已经是`确定性取值`，直接返回`<ok,f>`
    - 否则，向`epoch对应的所有Acceptor`提交取值`<epoch,f>`

### 样例
![zk_paxos_3_1.png](http://ovk7evjd7.bkt.clouddn.com/zk_paxos_3_1.png)

### 结论
- 在抢占式访问权的基础上引入`多Acceptor`，避免了`Acceptor`的单点问题
- 保证`一个epoch的访问权只能被一个Proposer获取`，`Proposer`是按照epoch递增的顺序依次运行的
- 新的epoch的`Proposer`采用`后者认同前者`的思路运行
- 可以满足容错性要求
    - `半数以下Acceptor`出现故障时，存活的`Acceptor`依然可以形成var的确定性取值
    - 一旦var取值确定，即便出现`半数以下Acceptor`故障，此取值依然可以被获取，并且将不再被更改

# 参考资料
[paxos和分布式系统](http://video.tudou.com/v/XMTc4NjM4Nzc1Mg==.html)

<!-- indicate-the-source -->
