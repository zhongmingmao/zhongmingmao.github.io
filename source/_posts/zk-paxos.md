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
Paxos协议是`分布式一致性协议`，用于解决`一致性问题`

## 一致性问题
Paxos协议用来**`确定一个不可变变量的取值`**，具有两个特点：取值可以为`任意二进制数据`；`一旦确定将不再更改`，并且可以被获取到（不可变性，可读取性）

### 系统抽象
设计一个系统，来存储名称为var的变量，满足以下条件：
- 系统内部由多个`Acceptor`组成，负责存储和管理var变量
- 外部有多个`Proposer`任意`并发`调用API，向系统提交不同的var取值
- var取值为任意二进制数据
- 系统对外的API接口：`propose(var,V) => <ok,f> or <error>`，f可能是`V`，也可能是其他Proposer提交成功的结果`V'`

#### var的一致性
如果var取值`没有确定`，则var的取值为`null`
一旦var的取值`被确定`，则`不可被更改`，并且可以一直获得这个值

#### 系统的容错特性
可以容忍`任意Proposer`机器出现故障
可以容忍`半数以下Acceptor`出现故障

# 实现方案

## 互斥访问权

### 适用场景
系统由`单个Acceptor`组成

### 策略
通过`互斥锁`机制，来管理`Proposer`的`并发`执行
`Proposer`首先向`Acceptor`申请互斥锁，才能请求`Acceptor`接受自己的取值
`Acceptor`给`Proposer`发放互斥锁，谁申请到互斥锁，就接收谁提交的新值
让`Proposer`按照获取`Acceptor`互斥锁的顺序依次访问`Acceptor`
一旦`Acceptor`接收了某个`Proposer`的取值，则认为var取值被确定，其他`Proposer`不再更改

### 实现

#### 基本方法
Acceptor保存`变量var`和一个`互斥锁Lock`
`Acceptor::prepare()`：请求互斥锁，并返回var的`当前取值f`
`Acceptor::release()`：释放互斥锁
`Acceptor::accept(var,V)`：如果已经加锁，并且var没有取值，则设置var为`V`，然后释放锁

#### propose(var，V)的两阶段实现

##### 第1阶段
通过`Acceptor::prepare()`获取互斥锁和var变量的`当前取值f`，如果获取失败，返回`<error>`，说明互斥锁被其他`Proposer`占用了

##### 第2阶段
如果当前var的取值`f不为null`，则通过`Acceptor::release()`释放互斥锁，返回`<ok,f>`
如果当前var的取值`f为null`，则通过`Acceptor::accept(var,V)`提交数据V，返回`<ok,V>`

### 结论
通过`Acceptor`的互斥锁让`Proposer`序列运行，可以简单地实现`var取值的一致性`
如果`Proposer`在`释放互斥锁之前宕机`，将会导致系统陷入**`死锁`** ➔ `不能容忍任意Proposer发生故障`

## 抢占式访问权 + 后者认同前者

### 适用场景
系统由`单个Acceptor`组成，引入**`抢占式访问权`**，用于解决互斥访问权的`死锁`问题

### 策略

#### 抢占式访问权
`Acceptor`可以让某个`Proposer`获取到的访问权失效，不再接受它的访问
之后可以将访问权发放给其他`Proposer`，让其他`Proposer`访问`Acceptor`
`Proposer`向`Acceptor`申请访问权时指定编号**`epoch（越大的epoch越新）`**，获取到访问权之后，才能向`Acceptor`提交取值
`Acceptor`采用**`喜新厌旧`**的原则：一旦收到更大的新`epoch`的申请，马上让旧`epoch`的访问权失效，不再接受他们提交的取值；然后给新`epoch`发放访问权，只接收新`epoch`提交的取值
新的`epoch`可以抢占旧`epoch`，让旧`epoch`的访问权失效，旧`epoch`的`Proposer`将无法运行，新`epoch`的`Proposer`将开始运行

#### 保证一致性
为了保证**`一致性`**，`不同epoch的Proposer`之间采用**`后者认同前者`**的原则
在确定旧`epoch`无法生成确定性取值时，新的`epoch`提交自己的value，不会冲突
一旦旧`epoch`形成确定性取值，新的`epoch`肯定可以获得此值，并且会认同此值，不会进行修改

### 实现

#### 基本方法

##### Acceptor保存的状态
当前var的取值`<accepted_epoch,accepted_value>`
最新发放访问权的epoch(`latest_prepared_epoch`)

##### Acceptor::prepare(epoch)
需要`Proposer`指定`epoch`
只接受`比latest_prepared_epoch更大`的epoch，并给予访问权
记录`latest_prepared_epoch=epoch`，返回当前var的取值（即`<ok,accepted_epoch,accepted_value>`）
使其他`Proposer`（之前已经获得过访问权）的访问权失效

##### Acceptor::accept(var,prepared_epoch,V)
验证`latest_prepared_epoch == prepared_epoch`
是，设置var的取值，即`<accepted_epoch,accepted_value>` ➔ `<prepared_epoch,V>`
否，说明有个更大的epoch（`latest_prepared_epoch > prepared_epoch`）获取到访问权，`prepared_epoch`对应的访问权已经`被抢占`，无法继续运行

#### propose(var，V)的两阶段实现

##### 第1阶段
获取`epoch的访问权`和`当前var取值`，epoch可以简单选取当前时间戳，如果不能获取，返回`<error>`，说明有`相同的或者更大`的epoch的访问权被其他`Proposer`获取

##### 第2阶段
采用`后者认同前者`的原则执行
如果`var取值为null`，则旧epoch肯定无法生成确定性取值，则通过`Acceptor::accept(var,prepared_epoch,V)`提交数据，成功后返回`<ok,prepared_epoch,V>`，如果accept失败，返回<error>（`被新epoch抢占`或者`Acceptor故障`）
如果`var值存在`，则此取值肯定是`确定性取值`，此时`认同`它，不再更改，直接返回`<ok,accepted_epoch,accepted_value>`

### 样例
![zk_paxos_2.png](http://ovk7evjd7.bkt.clouddn.com/zk_paxos_2.png)

### 结论
让`Proposer`按照`epoch递增的顺序`抢占式的依次运行，`后者认同前者`
可以`避免Proposer故障带来的死锁问题`，并且仍然`保留var取值的一致性`
但仍然存在`单点问题`，`Acceptor`故障会导致整个系统宕机

## Paxos

### 适用场景
系统由`多个Acceptor`组成，避免`单点Acceptor故障`

### 策略
`Acceptor`的实现与抢占式访问权类似，采用`喜新厌旧`的原则
Paxos采用**`少数服从多数`**的思路：一旦某个epoch的取值f被`半数以上`Acceptor接受，则认为此var了形成`确定性取值`，不再更改

### 实现

#### propose(var，V)的两阶段实现

##### 第1阶段
选定epoch，获取`epoch的访问权`和`当前var取值`
获取`半数以上Acceptor的访问权`和对应的`一组var取值` ➔ 一个epoch`最多只能由一个Proposer获取得到访问权`，

##### 第2阶段
采用`后者认同前者`的原则执行
如果在`第1阶段获取到的var值都为空`，则epoch尚未形成`确定性取值`，此时努力使**`<epoch,V>`**成为`确定性取值`：向`epoch对应的所有Acceptor`提交取值`<epoch,V>`；如果收到`半数以上`成功，则返回`<ok,V>`；否则，则返回`<error>`（`被新epoch抢占`或者`Acceptor故障`）
如果`var的取值存在`，认同`最大accepted_epoch对应的取值f`，努力使得**`<epoch,f>`**成为`确定性取值`：如果f已经出现了`半数以上`，则说明f已经是`确定性取值`，直接返回`<ok,f>`；否则，向`epoch对应的所有Acceptor`提交取值`<epoch,f>`

### 样例
![zk_paxos_3_1.png](http://ovk7evjd7.bkt.clouddn.com/zk_paxos_3_1.png)

### 结论
在抢占式访问权的基础上引入`多Acceptor`
保证`一个epoch的访问权只能被一个Proposer获取`，`Proposer`是按照epoch递增的顺序依次运行的
新的epoch的`Proposer`采用`后者认同前者`的思路运行
可以满足容错性要求：`半数以下Acceptor`出现故障时，存活的`Acceptor`依然可以生成var的确定性取值；一旦var取值确定，即便出现半数以下`Acceptor`故障，此取值依然可以被获取，并且将不再被更改

<!-- indicate-the-source -->


