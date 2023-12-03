---
title: Go - GC
mathjax: false
date: 2023-01-23 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-gc-1533114.webp
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 逃逸分析

1. 在传统的不带 GC 的编程语言中，需要关注对象的分配位置，是分配在`堆`上还是`栈`上
2. Go 集成了`逃逸分析`功能来`自动判断`对象是应该分配在堆上还是栈上
   - 只有在`代码优化`时，才需要研究具体的逃逸分析规则

```go escape.go
package main

func main() {
	var m = make([]int, 10240)
	println(m[0])
}
```

<!-- more -->

```
$  go build -gcflags='-m' escape.go
# command-line-arguments
./escape.go:3:6: can inline main
./escape.go:4:14: make([]int, 10240) escapes to heap
```

1. `较大的对象`会被放在`堆`上
2. 如果对象分配在`栈`上，其`管理成本`比较`低`，只需要挪动`栈顶寄存器`就可以实现对象的`分配`和`释放`
3. 如果对象分配在`堆`上，需要经过层层的`内存申请`过程

> `逃逸分析`和`垃圾回收`结合，可以极大地降低开发者的心智负担，无需再担心内存的分配和释放

# 抽象成本

> Rust - `零成本抽象`

1. 一切`抽象`皆有`成本`，要么花在`编译期`，要么花在`运行期`
2. GC 是选择在`运行期`来解决问题，在极端场景下，GC 可能会占用`大量的 CPU 资源`

# 内存管理

## 主要角色

### mutator

1. 一般指`应用`，即 Application
2. 可以将`堆`上的对象看作一张图，应用被称为 mutator 的主要原因
   - 应用在不停地`修改`堆对象的`指向关系`

### allocator

1. 即`内存分配器`，应用需要向 allocator 申请内存
2. allocator 要维护`内存分配`的数据结构，并考虑在`高并发`的场景下，降低`锁冲突`

### garbage collector

1. 即`垃圾回收器`
2. `死掉的堆对象`和`不用的堆内存`都由 garbage collector 回收，并归还给 `OS`
3. 过程简述
   - 当 GC `扫描`流程开始执行时，garbage collector 需要扫描内存中`存活`的堆对象
   - 扫描完成后，未被扫描到的对象就是`无法访问`的堆上垃圾，需要回收其占用内存

## 交互过程

![image-20231203135206049](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231203135206049.png)

1. 内存分配
   - mutator 需要在`堆`上申请内存时，会由`编译器`自动调用 `runtime.newobject`
   - 此时 allocator 使用 `mmap` 系统调用从 `OS` 申请内存
   - 如果 allocator 发现之前申请的内存还有富余
     - 会从本地`预先分配`的数据结构中划分出一块内存，并以`指针`的形式返回给应用
   - 在内存分配的过程中，allocator 负责维护内存管理对应的数据结构
2. 垃圾回收
   - garbage collector 扫描由 allocator 管理的数据结构
   - 将应用不再使用的内存，通过 `madvise` 系统调用归回给 `OS`

# 内存分配

## 分配视角

> `mmap` 返回的是`连续`的内存空间，`mutator` 以`应用视角`来`申请内存`，需要 `allocator` 进行`映射转换`

> `应用视角`：需要初始化的 a 是一个 1024000 长度的切片
> `内存管理视角`：需要管理的只是 start + offset 的一段内存

![image-20231203143746664](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231203143746664.png)

## 分配效率

1. 应用运行期间会不断地创建和销毁`小对象`，如果每次对象的分配和释放都需要与 `OS` 交互，`成本极高`
2. 应该在`应用层`设计好内存分配的`多级缓存`，尽量减少小对象`高频`创建和销毁时的`锁竞争`
   - 如 C/C++ 的 `tcmalloc`，而 Go 的内存分配器基本`1:1`搬运了 tcmalloc
3. tcmalloc 通过维护一套`多级缓存`结构
   - 降低了应用内存分配过程中对`全局锁`的使用频率，使得`小对象`的内存分配尽量做到`无锁`

![image-20231203144700778](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231203144700778.png)

> 在 Go 中，根据对象中是否有`指针`以及对象的`大小`，将内存分配过程分为 3 类

| Type  | Cond                                                       |
| ----- | ---------------------------------------------------------- |
| tiny  | size < `16 bytes` && has no pointer(noscan)                |
| small | has pointer(scan) \|\| (size >= 16 bytes && size <= 32 KB) |
| large | size > `32 KB`                                             |

### tiny

> 可以将内存分配的路径与 CPU 的多级缓存作类比，`mcache` 是`本地`的，而 `mheap` 为`全局`的
> `L4` 是以`页`为单位将内存向下派发，由 `pageAlloc` 来管理 `arena` 中的空闲内存
> 如果 `L4` 依然`无法满足`内存分配需求，则需要向 OS 申请内存

| L1          | L2             | L3            | L4           |
| ----------- | -------------- | ------------- | ------------ |
| mcache.tiny | mcache.alloc[] | mheap.central | mheap.arenas |

### small

> 与 tiny 的分配路径相比，缺少 `mcache.tiny`

| L1             | L2            | L3           |
| -------------- | ------------- | ------------ |
| mcache.alloc[] | mheap.central | mheap.arenas |

### large

1. 直接从 `mheap.arenas` 申请内存，直接走 `pageAlloc` 页分配器
2. `pageAlloc` 页分配器在 Go 中迭代了多个版本，查找时间复杂度从 `O(N) -> O(log(n)) -> O(1)`
   - 在 `O(1)` 的时间复杂度便可确定`能否满足`内存分配需求
   - 如果不满足，则需要对 arena 继续进行`切分`，或者向 `OS` 申请更多的 arena

## 数据结构

1. `arena` 是 Go 向 OS 申请内存的`最小单位 `，每个 arena 的大小为 `64 MB`，是一个`部分连续`但`整体稀疏`的内存结构
2. 单个 arena 会被切成以 `8KB` 为单位的 `page`，由 `page allocator` 管理
3. 一个或者多个 `page` 可以组成一个 `mspan`，每个 mspan 可以按照 `sizeclass` 再`划分`成多个 `element`
4. 同样大小的 mspan 又分为 `scan` 和 `noscan` 两种，分别对应`内部`有指针的对象和内部没有指针的对象

![image-20231203153715629](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231203153715629.png)

> 每个 `mspan` 都有一个 `allocBits` 结构
> 从 mspan 里面`分配`  element 时，只需要将 mspan 对应的 element 位置的 bit 设为 `1` 即可

![image-20231203154326756](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231203154326756.png)

# 垃圾回收

## 回收算法

1. Go 使用的 GC 算法：`并发标记清除`
   - 将内存中`正在使用`的对象进行`标记`，然后`清除`那些`未被标记`的对象
2. 并发：GC 的`标记`和`清扫`过程，能够与`应用代码`并发执行，不要与程序设计的`并发设计`混淆
3. `并发标记清除`算法有个无法解决的缺陷：即`内存碎片`
   - 在 JVM 的 `CMS`，会有`内存压缩整理`的过程
   - 而 Go 的内存管理是基于 `tcmalloc`，本身基于`多级缓存`，能在一定程度上`缓解`内存碎片的问题

## 垃圾分类

### 语义垃圾

> semantic garbage，也称`内存泄露`，从`语法`上`可达`的对象，但从`语义`上，这些对象为垃圾，GC `无法回收`语义垃圾

![image-20231203160052649](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231203160052649.png)

> slice 缩容后，底层数组的后两个元素已经无法再访问了，但其关联的堆上内存依然`无法被释放`
> 因此在 slice 缩容前，应该先将底层数组元素置为 `nil`

![image-20231203160119449](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231203160119449.png)

### 语法垃圾

> syntactic garbage，从`语法`上已经`不可达`的对象，这才是 GC 的`回收目标`

```go alloc_on_heap.go
package main

func allocOnHeap() {
	var a = make([]int, 10240)
	println(a)
}

func main() {
	allocOnHeap() // allocOnHeap 返回后，堆上的 a 无法访问，成为了语法垃圾
}
```

```
$  go run -gcflags="-m" alloc_on_heap.go
# command-line-arguments
./alloc_on_heap.go:3:6: can inline allocOnHeap
./alloc_on_heap.go:8:6: can inline main
./alloc_on_heap.go:9:13: inlining call to allocOnHeap
./alloc_on_heap.go:4:14: make([]int, 10240) escapes to heap
./alloc_on_heap.go:9:13: make([]int, 10240) escapes to heap
[10240/10240]0x14000102000
```

## 回收流程

### 关键流程

> `stw` 可以使用 `pprof` 的 `pauseNs` 来观测，也可以直接采集到监控系统，官方宣称达到 `亚毫秒`级

![image-20231203161331508](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231203161331508.png)

### 标记

#### 三色抽象

> Go 使用`三色`抽象，主要为了让 GC 和应用能`并发`执行

| Color | Desc                                                         |
| ----- | ------------------------------------------------------------ |
| 黑    | 本节点已经扫描完毕，子节点扫描完毕（gcmarkbits = 1，且在`队列外`） |
| 灰    | 本节点已经扫描完毕，子节点尚未扫描完毕（gcmarkbits = 1，且在`队列内`） |
| 白    | 本节点未扫描，garbage collector 不知道任何相关信息           |

![image-20231203162712896](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231203162712896.png)

> GC 扫描的起点是`根对象`（从 `.bss`、`.data`、`goroutine` 的`栈`开始扫描，最后遍历整个`堆`上的对象树）

![image-20231203162909970](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231203162909970.png)

> `广度`优先遍历

![go-gc-mark](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-gc-mark.gif)

> gc mark worker 会一边从 gcw 弹出对象，一边把其子对象压入 gcw，如果 gcw 满，压入全局队列

![go-gc-scanobjects](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-gc-scanobjects.gif)

> `堆`上对象的本质为`图`，在标记过程中，会有简单的`剪枝`逻辑，防止`重复标记`，浪费计算资源

![image-20231203164935884](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231203164935884.png)

```go runtime/mgcmark.go
		// If marked we have nothing to do.
		if mbits.isMarked() {
			return
		}
		mbits.setMarked()
```

>多个 gc mark worker 可能会产生竞态条件，通过 `atomic.Or8` 来保证`并发安全`

```go runtime/mbitmap.go
// setMarked sets the marked bit in the markbits, atomically.
func (m markBits) setMarked() {
	// Might be racing with other updates, so use atomic update always.
	// We used to be clever here and use a non-atomic update in certain
	// cases, but it's not worth the risk.
	atomic.Or8(m.bytep, m.mask)
}
```

#### 协助标记

1. 当应用`分配内存过快`时，后台的 gc mark worker `无法及时完成`标记工作
2. 此时应用在进行`堆内存分配`时，会判断是否需要协助 GC 的标记过程，防止应用 `OOM`
   - 相当于让应用线程`让出部分算力`给 GC 线程
   - 但协助标记会对`应用的响应延迟`产生影响
3. Go 内部通过一套`记账还账`系统来实现协助标记流程

#### 对象丢失

> 在`并发标记`期间，应用还会不断地修改堆上对象的引用关系，可能会导致对象丢失问题

> 漏标 B，导致 B 被错误回收，如果堆上的对象引用关系满足`三色不变性`，便能解决对象丢失问题

![go-gc-lostobj](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/go-gc-lostobj.gif)

> `强三色不变性`：禁止黑色对象指向白色对象
> 基于的假设：黑色已经处于`终态`了，GC 不会再关注

![image-20231203170938921](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231203170938921.png)

> `弱三色不变性`：黑色对象可以指向白色对象，但指向的白色对象，必须有能从灰色对象`可达`的路径
> 基于的假设：虽然黑色已经处于`终态`了，但灰色还在`处理中`，还能`补救`

![image-20231203171140648](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231203171140648.png)

> 无论在`并发标记`期间，应用如何修改对象的关系，只要能保证在修改后，堆上的对象能满足`三色一致性`即可

> `三色一致性`的实现依赖于`屏障`技术，在 Go 中，即`写屏障`（Go 只有 `write barrier`，没有 read barrier）

### 回收

> 进程启动时会有两个特殊的 goroutine

| goroutine | desc                                     |
| --------- | ---------------------------------------- |
| sweep.g   | 主要负责清扫死对象，`合并`相关的`空闲页` |
| scvg.g    | 主要负责向 `OS` 归还内存                 |

1. 当 GC 的标记流程结束后，sweep.g 会被唤醒，进行清扫工作
2. 针对每个 `mspan`，sweep.g 将并发标记期间生成的 bitmap `替换`掉分配时使用的 bitmap

![image-20231203174210918](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231203174210918.png)

> 根据 mspan 中`槽位情况`来决定 mspan 的未来

1. 如果 mspan 中存活对象数为 0，即所有 element 都是垃圾
   - 执行 `freeSpan`，归还组成该 mspan 所使用的 page，并更新全局的页分配器的摘要信息
2. 如果 mspan 中没有空槽，说明所有对象都是存活的，将其放入 `fullSwept` 队列中
3. 如果 mspan 中有空槽，说明此 mspan 还可以用来做内存分配，将其放入 `partialSweep` 队列中

> 然后 scvg.g 被唤醒，将`页`内存归还给 `OS`
