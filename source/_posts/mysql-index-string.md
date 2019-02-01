---
title: MySQL -- 字符串索引
date: 2019-01-31 21:43:19
categories:
    - MySQL
tags:
    - MySQL
---

## 场景

### 建表
```sql
CREATE TABLE SUser(
    id BIGINT UNSIGNED PRIMARY KEY,
    name VARCHAR(64),
    email VARCHAR(64)
) ENGINE=InnoDB;
```

<!-- more -->

### 查询
```sql
SELECT id,name,email FROM SUser WHERE email='zhangssxyz@xxx.com';
```

## 创建索引
```sql
ALTER TABLE SUser ADD INDEX index1(email);
ALTER TABLE SUser ADD INDEX index2(email(6));
```

### index1
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-index-string-all.jpg" width=500/>
1. 索引长度：**整个字符串**
2. 从index1索引树找到第一个满足索引值为zhangssxyz@xxx.com的记录，取得主键为ID2
    - 到**聚簇索引**上查找值为ID2的行，判断email的值是否正确（**Server层行为**），将该行记录加入结果集
3. 获取index1上的下一条记录，发现不满足email=zhangssxyz@xxx.com，循环结束
4. 整个过程，只需要**回表**1次，系统认为只扫描了1行

### index2
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-index-string-prefix.jpg" width=500/>
1. 索引长度：_**前6个字节**_
2. 索引占用的**空间更小**，增加额外的记录**扫描次数**，（且不支持**覆盖索引**，见后面）
3. 从index2索引树找到第一个满足索引值为`zhangs`的记录，取得主键为ID1
    - 到聚簇索引上查找值为ID1的行，email!=zhangssxyz@xxx.com（**Server层行为**），记录**丢弃**
4. 获取index2上的下一条记录，发现仍然是`zhangs`，取得主键为ID2
    - 到聚簇索引上查找值为ID2的行，email==zhangssxyz@xxx.com，加入结果集
5. 重复上面的步骤，直到index2上取得的值不为`zhangs`为止
6. 整个过程，需要**回表**4次，系统认为扫描了4行
7. 假设index2为`email(7)`，满足前缀`zhangss`只有一个，只需要回表一次
    - 使用前缀索引，如果能**定义好长度**，即能**节省空间**，又**不会增加太多的查询成本**

## 前缀索引的长度
原则：**区分度**。使用前缀索引一般都会**损失区分度**，预设一个**可接受的损失比例**，在该损失比例内，寻找**最短**前缀长度
```
SELECT
    COUNT(DISTINCT email) AS L,
    COUNT(DISTINCT LEFT(email,4)）AS L4,
    COUNT(DISTINCT LEFT(email,5)）AS L5,
    COUNT(DISTINCT LEFT(email,6)）AS L6,
    COUNT(DISTINCT LEFT(email,7)）AS L7
FROM SUser;
```

## 前缀索引与覆盖索引
```sql
SELECT id,email FROM SUser WHERE email='zhangssxyz@xxx.com';
```
1. 如果使用**index1**，可以利用**覆盖索引**，**不需要回表**
2. 如果使用**index2**，就**必须回表**，获得整行记录后再去判断email字段的值
    - 即使index2为`email(18)`（包含了所有信息），还是需要回表
    - 因为系统**不确定前缀索引的定义是否截断了完整信息**
    - 因此，**前缀索引是用不上覆盖索引对查询性能的优化**

## 其他手段
场景：前缀的区分度非常差，例如居民身份证（前6位是地址码）

### 倒序存储
```sql
SELECT field_list FROM t WHERE id_card = REVERSE('input_id_card_string');
```

### 增加hash字段
```sql
ALTER TABLE t ADD id_card_crc INT UNSIGNED, ADD INDEX(id_card_crc);
SELECT field_list FROM t WHERE id_card_crc=CRC32('input_id_card_string') AND id_card='input_id_card_string';
```
1. 每次插入新纪录的时候，都需要使用`CRC32()`函数得到校验码
2. 由于校验码可能会**冲突**，因此查询语句的条件需要加上id_card（**精确匹配**）
3. 索引的长度变为了**4个字节**，比直接用身份证作为索引所占用的空间小很多

### 异同点
1. 都**不支持范围查询**，只支持**等值查询**
2. 空间占用
    - 倒序存储：N个字节的索引
    - 增加hash字段：字段+索引
3. CPU
    - 倒序存储：每次读写都需要额外调用一次`REVERSE`函数，开销比`CRC32`函数略小
    - 增加hash字段：每次读写都需要额外调用一次`CRC32`函数
4. 查询效率
    - 增加**hash**字段方式的查询性能会**更加稳定**一些
        - CRC32虽然会有一定的冲突概率，但概率非常低，可以认为**平均扫描行数接近1**
    - 倒序存储一般会用到**前缀索引**，这会增加**扫描行数**（**无法利用覆盖索引，必须回表**）

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
