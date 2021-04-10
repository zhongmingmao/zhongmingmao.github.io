---
title: Redis -- Scan
mathjax: false
date: 2019-10-05 20:01:22
categories:
    - Storage
    - Redis
tags:
    - Storage
    - Redis
---

## keys的缺点
1. 没有`offset`和`limit`参数，可能会一下子匹配到**大量**数据
2. 复杂度为**`O(n)`**，如果实例中有千万级别的Key，该指令会导致Redis服务**卡顿**
    - 所有读写Redis的其它指令都会被**延后**甚至会**超时**报错，因为Redis是**单线程**架构，**顺序执行**所有指令
3. 为了解决这些问题，Redis在2.8版本引入了`scan`

<!-- more -->

## scan的特点
1. 复杂度也是**`O(n)`**，但是它是通过**游标**分步进行，**不会阻塞线程**
2. 提供`limit`参数，可以控制每次返回结果的最大条数
3. 和`keys`一样，也提供**模式匹配**功能
4. **服务器不需要维护游标状态**，游标的唯一状态就是`scan`返回给客户端的**游标整数**
5. 返回的结果可能会**重复**，需要客户端**去重**
6. 遍历过程中如果有数据修改，**改动后的数据不一定能够遍历到**
7. _**单次返回的结果为空并不意味着遍历结束，而是要看返回的游标值是否为0**_

## 基础使用
往Redis插入10000条数据
```python
import redis

client = redis.Redis(host='localhost', port=16379)
for i in range(10000):
    client.set("key%d" % i, i)
```
`scan`指令有三个参数：`cursor`、`key_pattern`、`limit`，第一次遍历时`cursor`为0
`limit`不是限定返回结果的数量，而是限定服务器**单次遍历的字典槽位数量**（约等于）
```bash
127.0.0.1:6379> scan 0 match key99* count 1000
1) "1624" # next cursor
2) 1) "key9956"
   2) "key9963"
   3) "key9927"
   4) "key9937"
   5) "key9962"
   6) "key9993"
127.0.0.1:6379> scan 1624 match key99* count 1000
1) "12332"
2)  1) "key9922"
    2) "key9985"
    3) "key9910"
    4) "key9952"
    5) "key9920"
    6) "key993"
    7) "key9987"
    8) "key9958"
    9) "key9996"
   10) "key9946"
   11) "key9981"
   12) "key9971"
   13) "key9982"
   14) "key9908"
...
127.0.0.1:6379> scan 4199 match key99* count 1000
1) "0" # no more result
2)  1) "key9951"
    2) "key995"
    3) "key9909"
    4) "key9949"
    5) "key9934"
    6) "key9942"
    7) "key9994"
    8) "key9959"
    9) "key9938"
   10) "key9995"
   11) "key9904"
```

## 字典结构
1. Redis中所有的Key都存储在一个很大的字典中，该字典与Java的**HashMap**类似，都是**一维数组+二维链表**结构
2. 第一维数组的大小总是`2^n`，扩容一次数组大小空间**加倍**
3. `scan`指令返回的**游标**是第一维数组的**位置索引**，将该位置索引称为**槽**（`slot`）
4. `limit`参数表示**需要遍历的槽位数**，并不是所有的槽位上都会挂接链表
    - 每次遍历都会将limit数量的槽位上挂接的所有链表元素进行模式匹配过滤后，一次性返回给客户端

<img src="https://redis-1253868755.cos.ap-guangzhou.myqcloud.com/redis-scan-hashmap.png" width=1000/>

## 遍历顺序
1. 并不是从第一维数组的第0位一直遍历到末尾，而是采用**高位进位加法**来遍历
2. 这主要时考虑到字典的**扩容**和**缩容**时**避免槽位的遍历重复和遗漏**

<img src="https://redis-1253868755.cos.ap-guangzhou.myqcloud.com/redis-scan-high-carry.gif" width=600/>

## 字典扩容
1. 数组长度为`2^n`次方，所以**取模运算**等价于**位与**操作，`a mod 8 = a & (8-1) = a & 7`，7称为字典的**mask**值
2. 假设当前的字典的数组长度由8位扩容到16位，那么3号槽位011将会被**rehash**到**3**号槽位和**11**号槽位
    - 假设开始槽位的二进制数为**xxx**，那么该槽位中的元素将被rehash到**0xxx**和**1xxx**

<img src="https://redis-1253868755.cos.ap-guangzhou.myqcloud.com/redis-scan-rehash.png" width=600/>

## 扩缩容前后的遍历顺序
<img src="https://redis-1253868755.cos.ap-guangzhou.myqcloud.com/redis-scan-cap-change.png" width=1000/>

1. 采用**高位进位加法**的遍历顺序，_**rehash后的槽位在遍历顺序是相邻的！！**_
2. 扩容
    - 假设当前要**即将**遍历**`110`**这个位置，扩容后，当前槽位上所有的元素对应的新槽位是**`0110`**和**`1110`**
    - 此时可以直接从0110这个槽位开始往后继续遍历，0110槽位之前的所有槽位都已经遍历过了
    - 这样可以**避**免扩容后对已经遍历过的槽位进行**重复遍历**
2. **缩容**
    - 假设当前**即将**遍历**`110`**这个位置，缩容后，当前槽位所有的元素对应的新槽位是**`10`**
    - 此时可以直接从10这个槽位开始往后继续遍历，10槽位之前的所有槽位都已经遍历过了，这样能**避免**缩容的**重复遍历**
    - 但是这会对010这个槽位上的元素进行重复遍历！！

## 渐进式rehash
1. Redis采用渐进式rehash，需要同时保留**旧数组**和**新数组**
    - 然后在**定时任务**中以及后续对hash的指令操作中渐渐地将旧数组中挂接的元素迁移到新数组上
2. 意味着如果要操作**处于rehash中**的字典，需要**同时访问**新旧两个数组结构
    - scan处于rehash中的字典，需要同时扫描新旧槽位，然后将结果融合后返回给客户端

## 大Key扫描
1. 大Key的缺点
    - 在集群环境中，如果一个Key太大，会导致**数据迁移卡顿**
    - 在**内存分配**方面，如果一个Key太大，那么当它需要扩容时，会**一次性申请**更大的内存，导致卡顿
        - 如果这个大Key被删除，内存会**一次性回收**，导致卡顿
2. 在平时的业务开发中，**要尽量避免大Key的产生！！**
3. 定位大Key的方法：`–-bigkeys`

```bash
$ docker exec -it my_redis redis-cli --bigkeys

# Scanning the entire keyspace to find biggest keys as well as
# average sizes per key type.  You can use -i 0.1 to sleep 0.1 sec
# per 100 SCAN commands (not usually needed).

[00.00%] Biggest string found so far 'key7974' with 4 bytes

-------- summary -------

Sampled 10000 keys in the keyspace!
Total key length in bytes is 68890 (avg len 6.89)

Biggest string found 'key7974' has 4 bytes

0 lists with 0 items (00.00% of keys, avg size 0.00)
0 hashs with 0 fields (00.00% of keys, avg size 0.00)
10000 strings with 38890 bytes (100.00% of keys, avg size 3.89)
0 streams with 0 entries (00.00% of keys, avg size 0.00)
0 sets with 0 members (00.00% of keys, avg size 0.00)
0 zsets with 0 members (00.00% of keys, avg size 0.00)
```