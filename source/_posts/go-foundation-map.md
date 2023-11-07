---
title: Go - Map
mathjax: false
date: 2022-12-31 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/gomap.png
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 定义

> map 表示一组`无序`的`键值对`，map 中每个 `Key` 都是`唯一`的

![image-20231106211534783](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231106211534783.png)

<!-- more -->

> Key 和 Value 的类型不要求相同，如果 Key 类型和 Value 类型都相同，map 类型才是`等价`的

```go
m1 := map[string]string{}
m2 := make(map[int]string)

fmt.Printf("%T\n", m1) // map[string]string
fmt.Printf("%T\n", m2) // map[int]string
```

> 对 `Value` 类型`没有限制`，但对 `Key` 类型有`严格限制`
> 因为 map 类型要保证 Key 类型的`唯一性`，因此，`Key` 类型必须支持 `==` 和 `!=` 两种`比较`操作

> 在 Go 中， `slice`、`map`、`func`都只支持与 `nil` 比较，并不支持`同类型变量比较`，因此不能作为 map 类型的 Key

```go
s1 := make([]int, 1)
s2 := make([]int, 1)
fmt.Println(s1 == s2) // invalid operation: s1 == s2 (slice can only be compared to nil)

m1 := make(map[string]int)
m2 := make(map[string]int)
fmt.Println(m1 == m2) // invalid operation: m1 == m2 (map can only be compared to nil)

f1 := func() {}
f2 := func() {}
fmt.Println(f1 == f2) // invalid operation: f1 == f2 (func can only be compared to nil)
```

```go
m1 := make(map[[]int]int)          // invalid map key type []int
m2 := make(map[map[string]int]int) // invalid map key type map[string]int
m3 := make(map[func()]string)      // invalid map key type func()
```

# 声明

> 如果`没有显式赋值`，则 `map` 和 `slice` 的默认值都为 `nil`

```go
var arr [4]int       // not nil
var sl []int         // nil
var m map[string]int // nil

fmt.Printf("arr: %#v, type: %T\n", arr, arr)              // arr: [4]int{0, 0, 0, 0}, type: [4]int
fmt.Printf("slice is nil: %v, type: %T\n", sl == nil, sl) // slice is nil: true, type: []int
fmt.Printf("map is nil: %v, type: %T\n", m == nil, m)     // map is nil: true, type: map[string]int
```

> `slice` 支持`零值可用`，但 `map` 由于其内部实现的`复杂性`，不支持`零值可用`

```go
var sl []int         // nil
var m map[string]int // nil

sl = append(sl, 1)
fmt.Printf("%#v\n", sl) // []int{1}

m["one"] = 1 // panic: assignment to entry in nil map
```

> 由于 `map 不支持零值可用`，因此必须对 `map` 类型变量进行`显式初始化`后才能使用

# 初始化

## 复合字面量

```go
m := map[int]string{}
fmt.Printf("%#v\n", m)        // map[int]string{}
fmt.Printf("%#v\n", m == nil) // false
m[1] = "A"                    // ok
```

> 语法糖：允许省略`字面值`中`元素类型`
> 因为 map 类型`声明`时已经指定了 `Key` 类型和 `Value` 类型，Go `编译器`有足够的信息进行`类型推导`

```go
m := map[int][]string{
  1: []string{"a", "b", "c"},
  2: []string{"d", "e", "f"},
  3: []string{"g", "h", "i"},
}

// 语法糖
m := map[int][]string{
  1: {"a", "b", "c"},
  2: {"d", "e", "f"},
  3: {"g", "h", "i"},
}
```

```go
type Position struct {
	x float64
	y float64
}

var m = map[Position]string{
	Position{1, 2}: "hello",
	Position{3, 4}: "world",
	Position{5, 6}: "!",
}

// 语法糖
var m = map[Position]string{
	{1, 2}: "hello",
	{3, 4}: "world",
	{5, 6}: "!",
}
```

## make

> 为 map 类型变量指定键值对的`初始容量`，但无法进行具体的键值对赋值

> 当 map 中的键值对数量超过初始容量后，`Go Runtime` 会对 map 进行`自动扩容`

```go
//m1 := make(map[string]int)
m2 := make(map[string]int, 1<<0) // 初始容量为1

m2["a"] = 1
fmt.Printf("%v\n", len(m2)) // 1

m2["b"] = 2
fmt.Printf("%v\n", len(m2)) // 2

m2["c"] = 3
fmt.Printf("%v\n", len(m2)) // 3

m2["d"] = 4
fmt.Printf("%v\n", len(m2)) // 4
```

# 基本操作

## 插入

> 对于一个`非 nil` 的 map 类型变量，可以插入`符合定义`的任意新键值对
> Go 会保证`插入总是成功`的，`Go Runtime`会负责 map 变量内部的`内存管理`

```go
m := make(map[int]string)
m[1] = "hello"
m[2] = "world"
```

> 如果 key 已经存在，则`覆盖`

```go
m := map[int]string{
  1: "a",
  2: "b",
}
m[1] = "aa"

fmt.Printf("%#v\n", m) // map[int]string{1:"aa", 2:"b"}
```

## 数量

> 通过 `len` 函数，获取当前变量已经存储的`键值对数量`

```go
m := map[int]string{
  1: "a",
  2: "b",
}
fmt.Println(len(m)) // 2

m[3] = "c"
fmt.Println(len(m)) // 3
```

> map 不支持 `cap` 函数

## 索引

> 查找 map 中`不存在的 key`，会返回对应的`类型零值`

```go
m := make(map[string]int)
v := m["key"]
fmt.Println(v) // 0
```

> `comma ok`

```go
m := make(map[string]int)
if v, ok := m["key"]; ok {
  fmt.Println(v)
} else {
  fmt.Printf("%T\n", ok)       // bool
  fmt.Println("key not found") // key not found
}

m["key"] = 1
if v, ok := m["key"]; ok {
  fmt.Println(v) // 1
}
```

## 删除

>  `delete` 函数是从 map 中删除数据的`唯一`方法（即便 map 不存在，也不会 `panic`）

```go
m := map[string]int{
  "one": 1,
  "two": 2,
}

fmt.Printf("%#v\n", m) // map[string]int{"one":1, "two":2}
delete(m, "one")
fmt.Printf("%#v\n", m) // map[string]int{"two":2}

m = nil
delete(m, "one")
fmt.Printf("%#v\n", m) // map[string]int(nil)
```

## 遍历

> 只有`一种`遍历方式：`for range`

```go
func main() {
	m := map[int]int{
		1: 1,
		2: 4,
		3: 9,
	}

	fmt.Printf("{ ")
	for k, v := range m {
		fmt.Printf("[%d, %d] ", k, v)
	}
	fmt.Printf("}\n")
}

// Output:
// 	{ [1, 1] [2, 4] [3, 9] }
```

> 遍历 map，key 是`无序`的

```go
func iteration(m map[int]int) {
	fmt.Printf("{ ")
	for k, v := range m {
		fmt.Printf("[%d, %d] ", k, v)
	}
	fmt.Printf("}\n")
}

func main() {
	m := map[int]int{
		1: 1,
		2: 4,
		3: 9,
	}

	for i := 0; i < 1<<2; i++ {
		iteration(m)
	}
}

// Output:
//	{ [1, 1] [2, 4] [3, 9] }
//	{ [1, 1] [2, 4] [3, 9] }
//	{ [1, 1] [2, 4] [3, 9] }
//	{ [3, 9] [1, 1] [2, 4] }
```

# 传递开销

> 与 `slice` 一样，`map` 也是`引用类型`，实际传递的并非整个 map 的数据拷贝，因此传递开销是`固定`，并且是`很小`的

> 当 map 被传递到`函数`或者`方法`内部后，后续对 map 的修改，在函数或者方法外部是`可见`的

```go
func f(m map[string]int) {
	m["a"] = 11
	m["c"] = 3
}

func main() {
	m := map[string]int{
		"a": 1,
		"b": 2,
	}

	fmt.Printf("%#v\n", m) // map[string]int{"a":1, "b":2}
	f(m)
	fmt.Printf("%#v\n", m) // map[string]int{"a":11, "b":2, "c":3}
}
```

# 内部实现

> `Go Runtime` 使用一张`哈希表`来实现`抽象的 map 类型`，实现了 map 类型操作的`所有功能`

## 对应关系

> 在`编译阶段`，Go 编译器会将`语法层面`的 map 操作，重写成 `Runtime` 对应的`函数调用`

```go
// go
m := make(map[keyType]valType, capacityhint)

// runtime
m := runtime.makemap(maptype, capacityhint, m)
```

```go
// go
m["key"] = ["value"]

// runtime
v := runtime.mapassign(maptype, m, "key") // v 用于存储后续的 value
```

```go
// go
v := m["key"]
v, ok := m["key"]

// runtime
v := runtime.mapaccess1(maptype, m, "key")
v := runtime.mapaccess2(maptype, m, "key")
```

```go
// go
delete(m, "key")

// runtime
runtime.mapdelete(maptype, m, "key")
```

## Runtime

![image-20231106232005631](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231106232005631.png)

# 实现原理

> 与 `slice` 类似，`map` 由`编译器`和`运行时`联合实现
>
> 1. 编译器在编译阶段将语法层面的 map 操作，`重写`为运行时对应的函数调用
> 2. 运行时则采用了高效的算法实现了 map 类型的各类操作
>
> 其实这是简化了用户的使用门槛，用户本可以像 Java 那边直接感知到各种 map 的实现

## 初始

### hmap

> 与语法层面 `map` 类型变量对应的 `runtime.hmap` 的实例

> `hmap` 类型是 `map` 类型的`头部结构`，即变量传递时的`描述符`（实际的`传递开销`）

| Field      | Desc                                                         |
| ---------- | ------------------------------------------------------------ |
| count      | 当前 map 中的`元素个数`，使用 `len` 函数，返回 `count` 值    |
| flags      | 当前 map 所处的`状态标志`<br />`iterator`、`oldlterator`、`hashWriting`、`sameSizeGrow` |
| B          | `2 ^ B` = bucket 数量                                        |
| noverflow  | `overflow bucket` 的`大约`数量                               |
| hash0      | 哈希函数的`种子`                                             |
| buckets    | 指向 bucket 数组的`指针`                                     |
| oldbuckets | 在 map `扩容`阶段指向`前一个` bucket 数组的`指针`            |
| nevacuate  | 在 map 扩容阶段的`扩容进度计数器`<br />所有下标`小于` nevacuate 的 bucket 都已经完成了数据`排空`和`迁移`操作 |
| extra      | 如果存在 `overflow bucket`，且 Key 和 Value 都因`不包含指针`而被`内联`的情况下，<br />该字段将存储所有指向 overflow bucket 的指针，保证 overflow bucket 不会被 `GC` 掉 |

```go
// A header for a Go map.
type hmap struct {
	// Note: the format of the hmap is also encoded in cmd/compile/internal/gc/reflect.go.
	// Make sure this stays in sync with the compiler's definition.
	count     int // # live cells == size of map.  Must be first (used by len() builtin)
	flags     uint8
	B         uint8  // log_2 of # of buckets (can hold up to loadFactor * 2^B items)
	noverflow uint16 // approximate number of overflow buckets; see incrnoverflow for details
	hash0     uint32 // hash seed

	buckets    unsafe.Pointer // array of 2^B Buckets. may be nil if count==0.
	oldbuckets unsafe.Pointer // previous bucket array of half the size, non-nil only when growing
	nevacuate  uintptr        // progress counter for evacuation (buckets less than this have been evacuated)

	extra *mapextra // optional fields
}
```

```go
// mapextra holds fields that are not present on all maps.
type mapextra struct {
	// If both key and elem do not contain pointers and are inline, then we mark bucket
	// type as containing no pointers. This avoids scanning such maps.
	// However, bmap.overflow is a pointer. In order to keep overflow buckets
	// alive, we store pointers to all overflow buckets in hmap.extra.overflow and hmap.extra.oldoverflow.
	// overflow and oldoverflow are only used if key and elem do not contain pointers.
	// overflow contains overflow buckets for hmap.buckets.
	// oldoverflow contains overflow buckets for hmap.oldbuckets.
	// The indirection allows to store a pointer to the slice in hiter.
	overflow    *[]*bmap
	oldoverflow *[]*bmap

	// nextOverflow holds a pointer to a free overflow bucket.
	nextOverflow *bmap
}
```

### bucket

> 真正`存储`键值对数据的是 bucket

> 每个 bucket 中存储的是 Hash 值`低 bit 位`数值相同的元素，默认的元素个数为 `BUCKETSIZE` - 8 = 2^3

```go cmd/compile/internal/gc/reflect.go
const (
	BUCKETSIZE  = 8
	MAXKEYSIZE  = 128
	MAXELEMSIZE = 128
)
```

```go runtime/map.go
const (
	// Maximum number of key/elem pairs a bucket can hold.
	bucketCntBits = 3
	bucketCnt     = 1 << bucketCntBits

	// Maximum average load of a bucket that triggers growth is 6.5.
	// Represent as loadFactorNum/loadFactorDen, to allow integer math.
	loadFactorNum = 13
	loadFactorDen = 2

	// Maximum key or elem size to keep inline (instead of mallocing per element).
	// Must fit in a uint8.
	// Fast versions cannot handle big elems - the cutoff size for
	// fast versions in cmd/compile/internal/gc/walk.go must be at most this elem.
	maxKeySize  = 128
	maxElemSize = 128
)
```

1. 当某个 bucket 的 `8` 个 slot 都`填满`了，且 map 尚未达到`扩容`的条件，`Runtime` 会建立 `overflow bucket`
2. 并将这个 `overflow bucket` 挂在上面 bucket 末尾的 `overflow 指针`上
3. 这样多个 bucket 就形成了一个`链表`，直到下一次 map `扩容`

#### tophash

1. 向 map 插入数据或者从 map 按 key 查询数据
   - `Runtime` 都会使用`哈希函数`对 key 做哈希运算，并得到一个 `hashcode`
2. `hashcode` 的`低位区`用于选定 `bucket`，而 `hashcode` 的`高位区`用于在某个 bucket 中确定 key 的`位置`
3. 每个 bucket 的 tophash 用来`快速定位 key 的位置`，避免`逐个` key 比较（代价很大） - `以空间换时间`

![image-20231107234030169](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231107234030169.png)

#### key

1. 存储这个 bucket 承载的所有 key 数据
2. `Runtime` 在`分配 bucket 时`需要知道 `key size`

> 当`声明`一个 map 类型变量
> `Runtime` 会为这个变量对应的特定 map 类型，生成一个 `runtime.maptype` 实例（已存在则`复用`）
> 该 `runtime.maptype` 实例包含了该 map 类型中所有`元数据`

```go
type maptype struct {
	typ    _type
	key    *_type
	elem   *_type
	bucket *_type // internal type representing a hash bucket
	// function for hashing keys (ptr to key, seed) -> hash
	hasher     func(unsafe.Pointer, uintptr) uintptr
	keysize    uint8  // size of key slot
	elemsize   uint8  // size of elem slot
	bucketsize uint16 // size of bucket
	flags      uint32
}
```

> `Runtime` 通过 `runtime.maptype` 实例确定 `Key 的类型和大小`

> `runtime.maptype` 使得所有 map 类型都`共享`一套 runtime map 的操作函数

#### value

1. 存储 key 对应的 value
2. 与 key 一样，该区域的创建也借助了 `runtime.maptype` 中的信息

> Runtime 将 Key 和 Value `分开存储`，而不是采用 `kv-kv` 的`紧邻`方式存储

1. 增加了`算法复杂性`
2. 减少因`内存对齐`带来的`内存浪费`

> Go Runtime 的内存利用率很高

![image-20231107004235126](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231107004235126.png)

> 如果 Key 或者 Value 的数据长度超过了 `128`，那么 `Runtime` 不会在 bucket 中直接存储数据，而是`存储数据的指针`

```go runtime/map.go
const (	
    // Maximum key or elem size to keep inline (instead of mallocing per element).
    // Must fit in a uint8.
    // Fast versions cannot handle big elems - the cutoff size for
    // fast versions in cmd/compile/internal/gc/walk.go must be at most this elem.
    maxKeySize  = 128
    maxElemSize = 128
)
```

## 扩容

> 当 `count > LoadFactor * 2 ^ B` 或者 `overflow bucket` 过多时，`Runtime` 会对 map 进行`自动扩容`

> 6.5 / 8 = `0.8125`

```go runtime/map.go
const (
	// Maximum average load of a bucket that triggers growth is 6.5.
	// Represent as loadFactorNum/loadFactorDen, to allow integer math.
	loadFactorNum = 13
	loadFactorDen = 2
)

// Like mapaccess, but allocates a slot for the key if it is not present in the map.
func mapassign(t *maptype, h *hmap, key unsafe.Pointer) unsafe.Pointer {
  ...
	// If we hit the max load factor or we have too many overflow buckets,
	// and we're not already in the middle of growing, start growing.
	if !h.growing() && (overLoadFactor(h.count+1, h.B) || tooManyOverflowBuckets(h.noverflow, h.B)) {
		hashGrow(t, h)
		goto again // Growing the table invalidates everything, so try again
	}
  ...
}
```

> 由于 `overflow bucket` 过多导致的扩容 - `分配不均`

1. Runtime 会新建一个与现有规模`一样`的 bucket 数组
2. 然后在 `assign` 和 `delete` 时做排空和迁移

> 由于当前数据量超过 `LoadFactor` 指定`水位`而导致的扩容 - `容量不足`

1. Runtime 会新建一个`两倍`于现有规模的 bucket 数组
2. 但真正的排空和迁移工作，也是在 `assign` 和 `delete` 时`逐步`进行
3. 原 bucket 数组会挂在 `hmap` 的 `oldbuckets` 指针下
   - 直到原 bucket 数组中所有的数据都迁移到新数组，原 bucket 数组才会被释放

![image-20231107010304708](https://go-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20231107010304708.png)

> map 可以自动扩容，`value 的位置`可能会发生变化，因此不允许获取 `map value` 的地址，`编译`阶段就会报错

```go
m := make(map[string]int)
p := &m["a"] // cannot take the address of m["a"]
fmt.Println(p)
```

## 并发

1. 充当 map 描述符的 hmap 实例本身是`有状态的`（`hmap.flags`），而且`对状态的读写`是`没有并发保护`
2. 即 map 实例并`不是并发安全`的，也`不支持并发读写`

> 并发读写

```go
func read(m map[int]int) {
	for k, v := range m {
		_ = fmt.Sprintf("[%d %d]", k, v)
	}
}

func write(m map[int]int) {
	for k, v := range m {
		m[k] = v + 1
	}
}

// fatal error: concurrent map iteration and map write
func main() {
	m := map[int]int{1: 1, 2: 4, 3: 9}

	go func() {
		for i := 0; i < 1<<10; i++ {
			read(m)
		}
	}()

	go func() {
		for i := 0; i < 1<<10; i++ {
			write(m)
		}
	}()

	time.Sleep((1 << 2) * time.Second)
}
```

> 只是并发读

```go
func read(m map[int]int) {
	for k, v := range m {
		_ = fmt.Sprintf("[%d %d]", k, v)
	}
}

// ok
func main() {
	m := map[int]int{1: 1, 2: 4, 3: 9}

	go func() {
		for i := 0; i < 1<<10; i++ {
			read(m)
		}
	}()

	go func() {
		for i := 0; i < 1<<10; i++ {
			read(m)
		}
	}()

	time.Sleep((1 << 2) * time.Second)
}
```

