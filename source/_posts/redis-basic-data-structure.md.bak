---
title: Redis -- 基础数据结构
mathjax: false
date: 2019-10-01 18:51:46
categories:
    - Storage
    - Redis
tags:
    - Storage
    - Redis
---

## 数据结构
Redis所有的数据结构都是以**唯一的key字符串**作为名称，然后通过该唯一key值来获取相应的value值

### string
1. Redis的字符串是**动态**字符串，是**可以修改**的字符串，内部结构实现上类似与Java的**ArrayList**
    - 采用**预分配冗余空间**的方式来减少内存的频繁分配
2. 当字符串长度**小于1M**时，扩容都是**加倍**现有的空间，如果**超过1M**，扩容时一次只会**多扩1M**的空间
    - 字符串最大长度为**512M**

<!-- more -->

<img src="https://redis-1253868755.cos.ap-guangzhou.myqcloud.com/redis-data-structure-string.png" width=1000/>
<img src="https://redis-1253868755.cos.ap-guangzhou.myqcloud.com/redis-data-structure-string.gif" width=1000/>

#### 键值对
```bash
> set name zhongmingmao
OK
> get name
"zhongmingmao"
> exists name
(integer) 1
> del name
(integer) 1
> get name
(nil)
```

#### 批量键值对
批量对多个字符串进行读写，**节省网络开销**
```bash
> set name1 zhongmingmao
OK
> set name2 zhongmingwu
OK
> mget name1 name2 name3
1) "zhongmingmao"
2) "zhongmingwu"
3) (nil)
> mset name1 a name2 b name3 unknown
OK
> mget name1 name2 name3
1) "a"
2) "b"
3) "unknown"
```

#### 过期和set命令扩展
```bash
> set name zhongmingmao
OK
> get name
"zhongmingmao"
> expire name 5
(integer) 1
> get name # 等5S后
(nil)
> setex name 5 zhongmingmao
OK
> get name
"zhongmingmao"
> get name # 等5S后
(nil)
> setnx name zhongmingmao
(integer) 1
> get name
"zhongmingmao"
> setnx name zhongmingwu
(integer) 0 # name已存在，set失败
> get name
"zhongmingmao" # 结果不变
```

#### 计数
如果value是一个**整数**，可以对其进行**自增**操作，自增是有范围的，即**signed long**的最大值和最小值
```bash
> set age 30
OK
> incr age
(integer) 31
> incrby age 5
(integer) 36
> incrby age -5
(integer) 31
> set age 9223372036854775807 # Long.Max
OK
> incr age
(error) ERR increment or decrement would overflow
```

### list
1. Redis的列表相当于Java的**LinkedList**，**插入**和**删除**的时间复杂度为`O(1)`，但**索引定位**的时间复杂度为`O(n)`
2. 当列表弹出**最后一个**元素后，该数据结构**自动被删除，内存被回收**

<img src="https://redis-1253868755.cos.ap-guangzhou.myqcloud.com/redis-data-structure-list.gif" width=1000/>

#### 队列
```bash
> rpush books python java golang
(integer) 3
> llen books
(integer) 3
> lpop books
"python"
> lpop books
"java"
> lpop books
"golang"
> lpop books
(nil)
```

#### 栈
```bash
> rpush books python java golang
(integer) 3
> rpop books
"golang"
> rpop books
"java"
> rpop books
"python"
> rpop books
(nil)
```

#### 慢操作
1. **index**相当于Java链表的`get(int index)`方法，需要对链表进行**遍历**，性能随着参数index增大而变差
    - index可以是**负数**，`index=-1`表示**倒数第一**个元素
2. **ltrim start_index end_index**定义了一个区间，在这个区间内的值要保留

```bash
> rpush books python java golang
(integer) 3
> lindex books 1 # O(n)
"java"
> lrange books 0 -1 # O(n)
1) "python"
2) "java"
3) "golang"
> ltrim books 1 -1 # O(n)
OK
> lrange books 0 -1
1) "java"
2) "golang"
> ltrim books 1 0 # 清空整个列表，因为区间范围长度为负
OK
> llen books
(integer) 0
```

#### 快速列表
1. 在**列表元素较少**的情况下会使用一块**连续的内存存储**，该结构称为`ziplist`，即**压缩列表**
2. 到**数据比较多**的时候，才会改成`quicklist`
3. 这是因为普通的链表需要的**附加指针空间太大**，会比较**浪费空间**，而且会**加重内存的碎片**
4. Redis将**链表**和`ziplist`结合起来组成`quicklist`
    - 将多个`ziplist`使用**双向指针**串联，这样即能满足**快速的插入删除性能**，又**不会出现太大的空间冗余**

<img src="https://redis-1253868755.cos.ap-guangzhou.myqcloud.com/redis-data-structure-quick-list.png" width=1000/>

### hash
1. Redis中的字典相当于Java中**HashMap**，是**无序**字典，同样使用**数组+链表**实现
2. 但Redis的字典的**值只能是字符串**，**rehash**的方式也不一样
    - Java的HashMap在字典很大时，rehash**非常耗时**，因为需要**一次性全部rehash**
    - Redis为了**高性能**，不阻塞服务，采用**渐进式rehash策略**

<img src="https://redis-1253868755.cos.ap-guangzhou.myqcloud.com/redis-data-structure-hash.png" width=1000/>

```bash
> hset books java 'think in java'
(integer) 1
> hset books golang 'concurrency in go'
(integer) 1
> hset books python 'python cookbook'
(integer) 1
> hgetall books
1) "java"
2) "think in java"
3) "golang"
4) "concurrency in go"
5) "python"
6) "python cookbook"
> hlen books
(integer) 3
> hget books java
"think in java"
> hset books golang 'learning go programming' # 因为是更新操作，所以返回0
(integer) 0
> hget books golang
"learning go programming"
> hmset books java 'effective java' python 'learning python' golang 'modern golang programming' # 批量set
OK
> hincrby zhongmingmao age 18
(integer) 18
> hget zhongmingmao age
"18"
```

#### 渐进式rehash
1. 渐进式rehash会在rehash的同时，**保留新旧两个hash结构**，查询时会**同时查询两个hash结构**
2. 在后续的**定时任务**中以及hash操作指令中，**循序渐进**地将旧hash的内容迁移到新的hash结构中
3. 当搬迁完成后，就会使用新的hash结构，当hash移除**最后一个**元素后，该数据结构会被**自动删除**，内存被**回收**

<img src="https://redis-1253868755.cos.ap-guangzhou.myqcloud.com/redis-data-structure-hash-rehash.png" width=1000/>

### set
1. Redis的集合相当于Java的**HashSet**，内部的键值对是**无序且唯一**的
2. 内部实现相当于一个**特殊的字典**，字典中所有的value都是一个值**`NULL`**
3. 当集合中**最后一个**元素被移除后，数据结构自动**删除**，内存被**回收**

<img src="https://redis-1253868755.cos.ap-guangzhou.myqcloud.com/redis-data-structure-set.gif" width=1000/>

```bash
> sadd books python
(integer) 1
> sadd books python
(integer) 0 # 重复
> sadd books java golang
(integer) 2
> smembers books # 无序
1) "golang"
2) "java"
3) "python"
> sismember books java # contains
(integer) 1
> sismember books rust
(integer) 0
> scard books # count
(integer) 3
> spop books
"golang"
```

### zset
1. Redis的有序集合类似于Java的**SortedSet**和**HashMap**的结合体
    - 一方面zset是一个set，保证内部value的**唯一性**
    - 另一方面zset给每个value赋予了一个**score**，代表value的**排序权重**
2. zset中**最后一个**value被移除后，数据结构**自动删除**，内存被**回收**

```bash
> zadd books 9.0 'think in java'
(integer) 1
> zadd books 8.9 'java concurrency'
(integer) 1
> zadd books 8.6 'java cookbook'
(integer) 1
> zrange books 0 -1
1) "java cookbook"
2) "java concurrency"
3) "think in java"
> zrevrange books 0 -1
1) "think in java"
2) "java concurrency"
3) "java cookbook"
> zcard books # count
(integer) 3
> zscore books 'java concurrency'
"8.9000000000000004" # double存储，存在精度问题
> zrank books 'java concurrency'
(integer) 1
> zrangebyscore books 0 8.91
1) "java cookbook"
2) "java concurrency"
> zrangebyscore books -inf 8.91 withscores
1) "java cookbook"
2) "8.5999999999999996"
3) "java concurrency"
4) "8.9000000000000004"
> zrem books 'java concurrency'
(integer) 1
> zrange books 0 -1
1) "java cookbook"
2) "think in java"
```

#### 跳跃表
1. zset内部的**排序功能**是通过**跳跃表**来实现的
2. 跳跃表之所以跳跃，是因为内部的元素可能**身兼数职**
    - 下图中间的元素，同时处于L0、L1和L2层，可以快速在**不同层次**之间进行跳跃
3. **定位插入点**时，先在**顶层**进行定位，然后下潜到**下一层**定位，一直下潜到**最底层**找到合适的位置，将新元素插进去
4. 跳跃表采用**随机策略**来决定新元素可以兼职到第几层
    - L0层为100%的概率，L1层为50%的概率，L2层为25%的概率，L3层为12.5%的概率，一直随机到最顶层**L31**层

<img src="https://redis-1253868755.cos.ap-guangzhou.myqcloud.com/redis-data-structure-zset-skip-list.png" width=1000/>

## 通用规则
1. **list/hash/set/zset**都是**容器型**数据结构，有两条通用规则
2. _**create if not exists !!**_
3. _**drop if no elements !!**_

## 过期时间
1. 过期是以**对象**为单位的，如一个hash结构的过期是**整个**hash对象的过期，而不是其中的某个子key过期
2. 如果一个**字符串**已经设置了过期时间，然后再调用**set**方法修改了它，那么它的**过期时间会消失**

```bash
> set name zhongmingmao
OK
> expire name 600
(integer) 1
> ttl name
(integer) 597
> set name zhongmingwu
OK
> ttl name
(integer) -1
```