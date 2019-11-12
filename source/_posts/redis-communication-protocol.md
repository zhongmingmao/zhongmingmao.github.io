---
title: Redis -- RESP
mathjax: false
date: 2019-10-08 11:01:30
categories:
    - Storage
    - Redis
tags:
    - Storage
    - Redis
---

## RESP
1. **RESP**（Redis Serialization Protocol），Redis序列化协议，是一种**直观的文本协议**，**实现简单**，**解析性能好**
2. Redis协议将传输的结构数据分为5种最小单元类型，单元**结束**时统一加上换行回车符号**`\r\n`**
    - **单行**字符串：以`+`符号开头
    - **多行**字符串：以`$`符号开头，后跟字符串**长度**
    - **整数值**：以`:`符号开头，后跟整数的**字符串形式**
    - **错误**：以`-`符号开头
    - **数组**：以`*`符号开头，后跟数组的**长度**

<!-- more -->

### 单行字符串
```
+hello world\r\n
```

### 多行字符串
字符串长度为`11`
```
$11\r\nhello world\r\n
```

#### NULL
用**多行**字符串表示，但长度要写成`-1`
```
$-1\r\n
```

#### 空串
用**多行**字符串表示，长度为`0`，两个`\r\n`之间隔的是**空串**
```
$0\r\n\r\n
```

### 整数
```
:1024\r\n
```

### 错误
```
-WRONGTYPE Operation against a key holding the wrong kind of value\r\n
```

### 数组
`[1,2,3]`
```
*3\r\n:1\r\n:2\r\n:3\r\n
```

## 客户端 -> 服务端
客户端向服务器发送的指令只有一种格式，即**多行字符串数组**，`set author zhongmingmao`会被序列化成下面的字符串
```
*3\r\n$3\r\nset\r\n$6\r\nauthor\r\n$12\r\nzhongmingmao\r\n
```

## 服务端 -> 客户端

### 单行字符串
```bash
127.0.0.1:6379> set author zhongmingmao
OK
```
没有使用**双引号**括起来，是**单行**字符串响应
```
+OK\r\n
```

### 多行字符串
```bash
127.0.0.1:6379> get author
"zhongmingmao"
```
使用**双引号**括起来，是**多行**字符串响应
```
$12\r\nzhongmingmao\r\n
```

### 错误
```bash
127.0.0.1:6379> incr author
(error) ERR value is not an integer or out of range
```
```
-ERR value is not an integer or out of range\r\n
```

### 整数
```bash
127.0.0.1:6379> incr books
(integer) 1
```
```
:1\r\n
```

### 数组
```bash
127.0.0.1:6379> hset info name zhongmingmao
(integer) 1
127.0.0.1:6379> hset info age 18
(integer) 1
127.0.0.1:6379> hgetall info
1) "name"
2) "zhongmingmao"
3) "age"
4) "18"
```
```
*4\r\n$4\r\nname\r\n$12\r\nzhongmingmao\r\n$3\r\nage\r\n$2\r\n18\r\n
```

### 嵌套
```bash
127.0.0.1:6379> scan 0
1) "0"
2) 1) "author"
   2) "books"
   3) "info"
```
```
*2\r\n$1\r\n0\r\n*3\r\n$6\r\nauthor\r\n$5\r\nbooks\r\n$4\r\ninfo\r\n
```

## 小结
Redis协议中有**大量冗余的回车换行符**，但依然是**非常受欢迎**的**文本协议**，很多开源项目都使用了RESP协议