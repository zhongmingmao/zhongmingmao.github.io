---
title: Redis -- 位图
mathjax: false
date: 2019-10-04 20:06:54
categories:
    - Storage
    - Redis
tags:
    - Storage
    - Redis
---

## 概述
1. 位图不是特殊的数据结构，而是**普通的字符串**，即**byte数组**
2. 可以使用普通的`get/set`来直接获取或设置**整个位图**的内容
    - 也可以使用位图操作`getbit/setbit`将byte数组看成**位数组**来处理

<!-- more -->

## setbit / getbit
Redis的位数组是**自动扩展**的，如果设置了某个偏移位置超出了现有的内容范围，就会自动将位数组进行**零扩充**

### ASCII码
```python
>>> bin(ord('h'))
'0b1101000' # 高位 -> 低位
>>> bin(ord('e'))
'0b1100101'
>>> bin(ord('l'))
'0b1101100'
>>> bin(ord('o'))
'0b1101111'
```

<img src="https://redis-1253868755.cos.ap-guangzhou.myqcloud.com/redis-bitmap-ascii.gif" width=1000/>

### 零存整取
位数组的顺序和字符的位顺序是**相反**的，设置h时，只需要设置位数组的第1/2/4位
```bash
127.0.0.1:6379> setbit s 1 1
(integer) 0
127.0.0.1:6379> setbit s 2 1
(integer) 0
127.0.0.1:6379> setbit s 4 1
(integer) 0
127.0.0.1:6379> setbit s 9 1
(integer) 0
127.0.0.1:6379> setbit s 10 1
(integer) 0
127.0.0.1:6379> setbit s 13 1
(integer) 0
127.0.0.1:6379> setbit s 15 1
(integer) 0
127.0.0.1:6379> get s
"he"
```

### 零存零取
```bash
127.0.0.1:6379> setbit w 1 1
(integer) 0
127.0.0.1:6379> setbit w 2 1
(integer) 0
127.0.0.1:6379> setbit w 4 1
(integer) 0
127.0.0.1:6379> getbit w 1 # 获取具体位置上的值 0/1
(integer) 1
127.0.0.1:6379> getbit w 2
(integer) 1
127.0.0.1:6379> getbit w 4
(integer) 1
127.0.0.1:6379> getbit w 5
(integer) 0
```

### 整存零取
```bash
127.0.0.1:6379> set w h # 整存
OK
127.0.0.1:6379> getbit w 1
(integer) 1
127.0.0.1:6379> getbit w 2
(integer) 1
127.0.0.1:6379> getbit w 4
(integer) 1
127.0.0.1:6379> getbit w 5
(integer) 0
```

### 不可打印字符
如果对应位的字节是**不可打印字符**，redis-cli会显示该字符的**16进制**形式
```bash
127.0.0.1:6379> setbit x 0 1
(integer) 0
127.0.0.1:6379> setbit x 1 1
(integer) 0
127.0.0.1:6379> get x
"\xc0"
```

## bitcount / bitpos
1. **bitcount**：统计**指定范围内1的个数**
2. **bitpos**：查找**指定范围**内出现的**第一个**0或1
3. 指定的**位范围**必须是**8的倍数**，不能任意指定

```
h        e        l        l        o
01101000 01100101 01101100 01101100 01101111
```

```bash
127.0.0.1:6379> set w hello # 01101000 01100101 01101100 01101100 01101111
OK
127.0.0.1:6379> bitcount w # 所有字符中1的位数
(integer) 21
127.0.0.1:6379> bitcount w 0 0 # 第一个字符中1的位数
(integer) 3
127.0.0.1:6379> bitcount w 0 1 # 迁两个字符中1的位数
(integer) 7
127.0.0.1:6379> bitpos w 0 # 第一个0位
(integer) 0
127.0.0.1:6379> bitpos w 1 # 第一个1位
(integer) 1
127.0.0.1:6379> bitpos w 1 1 1 # 从第二个字符开始，第一个1位
(integer) 9
127.0.0.1:6379> bitpos w 1 2 2 # 从第三个字符开始，第一个1位
(integer) 17
```

## bitfield
bitfield有三个子指令（`get/set/incrby`），最多只能处理**64个连续的位**
```bash
127.0.0.1:6379> set w hello # 01101000 01100101 01101100 01101100 01101111
OK
127.0.0.1:6379> bitfield w get u4 0 # 从第一位开始取4位，结果是无符号数
1) (integer) 6 # 0110
127.0.0.1:6379> bitfield w get u3 2 # 从第三位开始取3位，结果是无符号数
1) (integer) 5 # 101
127.0.0.1:6379> bitfield w get i4 0 # 从第一位开始取4位，结果是有符号数
1) (integer) 6 # 0110
127.0.0.1:6379> bitfield w get i3 2 # 从第三位开始取3位，结果是有符号数
1) (integer) -3 # 101
```

一次性执行多个子指令
```bash
127.0.0.1:6379> bitfield w get u4 0 get u3 2 get i4 0 get i3 2
1) (integer) 6
2) (integer) 5
3) (integer) 6
4) (integer) -3
```

`hello` -> `hallo`，`a`的ASCII码为97
```bash
127.0.0.1:6379> bitfield w set u8 8 97 # 从第9位开始，将接下来的8位用无符号数97替代
1) (integer) 101
127.0.0.1:6379> get w
"hallo"
```

`incrby`溢出时，Redis默认的处理是**折返**，8位无符号数255，加1溢出变为0，8位有符号数127，加1溢出变成-128
```bash
127.0.0.1:6379> set w hello # 01101000 01100101 01101100 01101100 01101111
OK
127.0.0.1:6379> bitfield w incrby u4 2 1 # 从第3位开始，对接下来的4位无符号数+1
1) (integer) 11
127.0.0.1:6379> bitfield w incrby u4 2 4
1) (integer) 15
127.0.0.1:6379> bitfield w incrby u4 2 1 # 溢出折返
1) (integer) 0
```

`bitfield`提供了**溢出策略**子指令`overflow`，默认是折返（`wrap`），`fail`策略是**报错不执行**，`sat`策略是**饱和截断**
`overflow`子指令**只会影响下一条指令A**，指令A执行完之后，溢出策略会恢复为默认值`wrap`

`sat`策略
```bash
127.0.0.1:6379> set w hello
OK
127.0.0.1:6379> bitfield w overflow sat incrby u4 2 1
1) (integer) 11
127.0.0.1:6379> bitfield w overflow sat incrby u4 2 4
1) (integer) 15
127.0.0.1:6379> bitfield w overflow sat incrby u4 2 1 # 保持最大值
1) (integer) 15
```

`fail`策略
```bash
127.0.0.1:6379> set w hello
OK
127.0.0.1:6379> bitfield w overflow fail incrby u4 2 1
1) (integer) 11
127.0.0.1:6379> bitfield w overflow fail incrby u4 2 4
1) (integer) 15
127.0.0.1:6379> bitfield w overflow fail incrby u4 2 1 # 不执行
1) (nil)
127.0.0.1:6379> bitfield w get u4 2
1) (integer) 15
```