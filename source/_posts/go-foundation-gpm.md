---
title: Go - GPM
mathjax: false
date: 2023-01-16 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-concurrency.png
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# CPU

1. 一个 Go 程序对于操作系统来说只是一个`用户层程序`，操作系统眼中只有`线程`
2. goroutine 的`调度`由 `Go Runtime` 来完成：『`公平`』竞争『`CPU`』
   - Go Runtime 如何将众多的 goroutine 按照一定的算法调度到『CPU』上运行
3. `goroutine` 要`竞争`的『CPU』是`操作系统线程`
   - 将 `goroutine` 按照一定`算法`放到不同的`操作系统线程`上执行

<!-- more -->

# 演进

1. `G-M` -> `G-P-M`
2. 不支持抢占 -> 支持`协作式`抢占 -> 支持基于`信号`的`异步`抢占

## G-M

> 2012.03.28 Go 1.0

1. 抽象
   - 每个 `goroutine` 对应于`运行时`的一个抽象结构 `G`
   - 被视作『CPU』的`操作系统线程`，则对应另一个抽象结构 `M`（machine）
2. 工作
   - 将 G `调度`到 M 上去运行
3. `GOMAXPROCS`
   - 调度器可见的最大 M 数

> 缺陷：限制 Go 并发程序的`伸缩性`，尤其对于有`高吞吐`或`并行计算`的服务程序

1. 由于`单一全局互斥锁`和`集中状态存储`的存在，导致所有 goroutine 相关操作，都需要`上锁`
2. M 之间经常`传递`可运行的 goroutine，导致`调用延迟`增大，增加额外的性能开销
3. 每个 M 都做`内存缓存`，导致`内存占用过高`，数据局部性较差
4. 由于`系统调用`而形成的频繁的工作线程`阻塞`和`解除阻塞`，导致额外的性能损耗

## G-P-M

> Go `1.2` - 计算机领域的任何问题都可以增加一个`间接的中间层`来解决

> 在 G-M 模型中增加一个 P，让调度器具有很好的`伸缩性`

![image-20231125152819676](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231125152819676.png)

1. `P` 是一个`逻辑 Processor`，每个 G 要真正运行，需要首先被`分配`一个 P，即进入 P 的`本地队列`
2. 对 G 来说，P 就是运行 G 的『CPU』，即 `G 只能看见 P`
3. 对 Go 调度器来说，真正的『CPU』是 `M`，只有将 P 和 M `绑定`，才能让 P 的本地队列中 G 真正运行起来

> 但此时，调度器依然不支持`抢占式调度`

1. 一旦某个 G 出现`死循环`，那么 G 将`永久占用`分配给它的 P 和 M
2. 而位于`同一个` P 中的其它 G 将`得不到调度`，出现`饿死`的情况
3. 如果只有一个 P（`GOMAXPROCS=1`）时，`整个 Go 程序`中的其它 G 都将被`饿死`

## 基于协作的抢占式调度

> Go  `1.2`

1. 编译器在每个`函数`或者`方法`的`入口`，加上一段`额外的代码`
   - 让`运行时`有机会在这段代码中检查`是否需要抢占式调度`
2. 只能`局部解决`饿死问题，因为只在`函数调用`的地方才能插入`抢占代码埋点`
   - 对于没有函数调用而是`纯算法循环计算`的 G，调度器`依然无法抢占`
3. 后果
   - GC 在等待所有 goroutine 停止时的等待时间过长（类似于 JVM 的`安全点`）
   - 从而导致 `GC 延迟`，内存占用`瞬间冲高`

## 基于系统信号的抢占式调度

> Go `1.14`

1. 通过向线程`发送信号`的方式来抢占正在运行的 goroutine

## 小优化

> 通过 `IO poller` 减少 `M` 的`阻塞等待`

1. `运行时`已经实现了 `netpoller`
   - 即便 G 发起`网络 IO 操作`，也不会导致 M 被阻塞（`只阻塞 G`），也不会导致大量线程 M 被`创建`出来
2. 对于`文件 IO 操作`，一旦阻塞，那么线程 M 将进入`挂起`状态，等待 IO 返回后`唤醒`
   - 此时 P 将与`挂起`的 M `解绑`，再选择一个处于`空闲状态`的 M
   - 如果此时没有空闲的 M，就会`新创建`一个 M（线程）
   - 在这种情况下，`大量 IO 操作`仍然会导致`大量线程`被创建
3. Go `1.9 `，在 G 操作`支持监听`的 `FD` 时，`仅会阻塞 G`，而不会阻塞 M
   - 但依然对`常规文件`无效，因为常规文件是`不支持监听`的

# G-P-M

> `G-M` 模型已经废弃，`NUMA` 模型尚未实现

## 语义

1. `G` - 代表 `goroutine`
   - 存储 goroutine 的`执行栈信息`、`状态`、`任务函数`等
   - G 对象是`可重用`的
2. `P` - 代表`逻辑 Processor`
   - P 的数量决定了系统内`最大可并行`的 `G` 的数量
   - P 拥有各种 `G 对象队列`、链表、一些缓存和状态
3. `M` - 代表`真正的执行计算资源`
   - 在 M `绑定`有效的 P 后，进入`调度循环`
     - 从 P 的`本地队列`以及`全局队列`中获取 `G`，并切换到 G 的`执行栈`上并执行 G 的函数
     - 调用 `goexit` 做清理工作并回到 M，如此反复
   - `M 并不保留 G 状态`，因此 G 可以`跨 M 调度`

## 调度

> 调度器的目标：公平合理地将 `G` 调度到 `P` 上运行

### 抢占调度

> 场景：G 没有进行`系统调用`、没有进行 `IO 操作`、没有`阻塞`在一个 `channel` 操作上

1. Go 程序`启动`时，`Go Runtime` 会去启动一个名为 `sysmon` 的 `M`（`监控线程`）
2. 该 M `不需要绑定` P 就可以运行（以 `g0` 的形式）

```go
// The main goroutine.
func main() {
  	...
		systemstack(func() {
			newm(sysmon, nil, -1)
		})
		...
}

// Always runs without a P, so write barriers are not allowed.
//
//go:nowritebarrierrec
func sysmon() {
  ...
	for {
		if idle == 0 { // start with 20us sleep...
			delay = 20
		} else if idle > 50 { // start doubling the sleep after 1ms...
			delay *= 2
		}
		if delay > 10*1000 { // up to 10ms
			delay = 10 * 1000
		}
		...
		// retake P's blocked in syscalls
		// and preempt long running G's
		if retake(now) != 0 {
			idle = 0
		} else {
			idle++
		}
  ...
}
```

> `sysmon` 每 `20us ~ 10ms` 启动一次

1. 释放闲置超过 5 分钟的 `span` 内存
2. 如果超过 `2 分钟`没有执行 `GC`，强制执行
3. 将长时间未处理的 netpoll 结果添加到任务队列中
4. 向`长时间运行`的 G 任务发起`抢占式调度` - retake
5. 回收因`系统调用`而 `长时间阻塞`的 `P`

```go runtime/proc.go
// forcePreemptNS is the time slice given to a G before it is
// preempted.
const forcePreemptNS = 10 * 1000 * 1000 // 10ms

func retake(now int64) uint32 {
...
			// Preempt G if it's running for too long.
			t := int64(_p_.schedtick)
			if int64(pd.schedtick) != t {
				pd.schedtick = uint32(t)
				pd.schedwhen = now
			} else if pd.schedwhen+forcePreemptNS <= now {
				preemptone(_p_)
				// In case of syscall, preemptone() doesn't
				// work, because there is no M wired to P.
				sysretake = true
			}
...
}

func preemptone(_p_ *p) bool {
	mp := _p_.m.ptr()
	if mp == nil || mp == getg().m {
		return false
	}
	gp := mp.curg
	if gp == nil || gp == mp.g0 {
		return false
	}

	gp.preempt = true // 设置被抢占标志

	// Every call in a go routine checks for stack overflow by
	// comparing the current stack pointer to gp->stackguard0.
	// Setting gp->stackguard0 to StackPreempt folds
	// preemption into the normal stack overflow check.
	gp.stackguard0 = stackPreempt

	// Request an async preemption of this P.
	if preemptMSupported && debug.asyncpreemptoff == 0 {
		_p_.preempt = true
		preemptM(mp)
	}

	return true
}
```

1. 如果一个 G 任务运行 `10 ms`，sysmon 会认为其运行时间太久而发起`抢占式调度`的请求
2. 一旦 G 的`抢占标志位`被设为 `true`，等到 G 的`下一次调用函数或者方法`时（Go Runtime 注入埋点）
   - `Go Runtime` 可以将 G 抢占并`移除运行状态`，然后放入队列中，等待下一次调度

### channel / 网络 IO

> `不阻塞 M`，避免大量创建 M 导致的开销

1. 如果 G 被`阻塞`在某个 channel 操作或者网络 IO 操作时
   -  G 会被放置在某个`等待队列`中，M 会尝试运行 P 的`下一个`可运行 G
2. 如果此时 P 没有可运行的 G 供 M 运行，那么 M 将`解绑` P，并进入`挂起`状态
3. 当 IO 操作完成或者  channel 操作完成
   - 在`等待队列`中的 G 会被`唤醒`，标记为可运行（`Runnable`），并放入到某 P 的`队列`中

### 系统调用

> `阻塞 M`，但在阻塞前会与 P `解绑`，P 会尝试与其它 M 绑定继续运行其它 G

> 如果没有现成的 M，Go Runtime 会新建 M，因此`系统调用`可能会导致`系统线程数增加`

1. 如果 G 被阻塞在某个系统调用上，那么不光 G 会阻塞，执行这个 G  的 M 也会`解绑` P，并与 G 一起进入`挂起`状态

   - 如果此时有空闲的 M，那么 P 会和它绑定，并继续执行其它 G

   - 如果此时没有空闲的 M，但仍然有其他 G 要执行，那么 Go Runtime 会`创建`一个新 M 线程

2. 当系统调用返回后，阻塞在这个系统调用上的 G 会尝试获取一个`可用的 P`

   - 如果没有可用的 P，那么 G 会被标记为 `Runnable`，之前的那个挂起的 M 将再次进入`挂起`状态
   - 因为 G 和 M 需要通过一个 P 来`桥接`
