---
title: MySQL -- 普通索引与唯一索引
date: 2019-01-29 10:15:49
categories:
    - MySQL
tags:
    - MySQL
---

## 场景
1. 维护一个市民系统，有一个字段为身份证号
2. 业务代码能保证不会写入两个重复的身份证号（如果业务无法保证，可以依赖数据库的唯一索引来进行约束）
3. 常用SQL查询语句：`SELECT name FROM CUser WHERE id_card = 'XXX'`
4. 建立索引
    - 身份证号比较大，不建议设置为主键
    - 从**性能**角度出发，选择**普通索引**还是**唯一索引**？

<!-- more -->

假设字段k上的值都不重复
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-index-bplustree.png" width=400/>


## 查询过程
1. 查询语句：`SELECT id FROM T WHERE k=5`
2. 查询过程
    - 通过B+树从**树根**开始，**按层搜索到叶子节点**，即上图中右下角的数据页
    - 在**数据页内部**通过**二分法**来定位具体的记录
3. 针对**普通索引**
    - 查找满足条件的第一个记录`(5,500)`，然后查找下一个记录，直到找到第一个不满足`k=5`的记录
4. 针对**唯一索引**
    - 由于索引定义了**唯一性**，查找到第一个满足条件的记录后，就会停止继续查找

### 性能差异
1. 性能差异：**微乎其微**
2. InnoDB的数据是按照**数据页**为单位进行读写的，默认为16KB
3. 当需要读取一条记录时，并不是将这个记录本身从磁盘读出来，而是以数据页为单位进行读取的
4. 当找到k=5的记录时，它所在的数据页都已经在**内存**里了
5. 对于**普通索引**而言，只需要多一次**指针寻找**和多一次**计算** -- CPU消耗很低
    - 如果k=5这个记录恰好是所在数据页的最后一个记录，那么如果要取下一个记录，就需要读取**下一个数据页**
    - **概率很低**：对于**整型字段**索引，一个数据页（16KB，compact格式）可以存放大概745个值

## change buffer
1. 当需要**更新一个数据页**时，如果数据页**在内存中**就**直接更新**
2. 如果这个数据页**不在内存中**，在不影响**数据一致性**的前提下
    - InnoDB会将这些**更新操作**缓存在change buffer
    - **不需要从磁盘读入这个数据页**（**随机读**）
    - 在**下次查询**需要访问这个数据页的时候，**将数据页读入内存**
        - 然后执行change buffer中与这个数据页有关的操作（merge）
3. change buffer是可以**持久化**的数据，在内存中有拷贝，也会被写入到磁盘上
4. 将更新操作先记录在channge buffer，**减少随机读磁盘**，提升语句的执行速度
5. 另外数据页读入内存需要占用buffer pool，使用channge buffer能避免占用内存，**提高内存利用率**
6. change buffer用到是buffer pool里的内存，不能无限增大，控制参数`innodb_change_buffer_max_size`

```sql
# 默认25，最大50
mysql> SHOW VARIABLES LIKE '%innodb_change_buffer_max_size%';
+-------------------------------+-------+
| Variable_name                 | Value |
+-------------------------------+-------+
| innodb_change_buffer_max_size | 25    |
+-------------------------------+-------+
```

### merge
1. merge：将change buffer中的操作**应用**到原数据页
2. merge的执行过程
    - 从磁盘读入数据页到内存（老版本的数据页）
    - 从change buffer里找出这个数据页的change buffer记录（可能多个）
        - 然后**依次执行**，得到**新版本的数据页**
    - 写入redolog，包含内容：**数据页的表更**+**change buffer的变更**
3. merge执行完后，内存中的数据页和change buffer所对应的磁盘页都还没修改，属于**脏页**
    - 通过其他机制，脏页会被刷新到对应的物理磁盘页
4. 触发时机
    - **访问这个数据页**
    - 系统后台线程**定期merge**
    - 数据库**正常关闭**

### 使用条件
1. 对于**唯一索引**来说，所有的更新操作需要先判断这个操作**是否违反唯一性约束**
2. _**唯一索引的更新无法使用change buffer，只有普通索引可以使用change buffer**_
    - **主键也是无法使用change buffer的**
    - 例如要插入`(4,400)`，必须先判断表中是否存在k=4的记录，这个判断的前提是**将数据页读入内存**
    - 既然数据页已经读入到了内存，直接更新内存中的数据页就好，无需再写change buffer

### 使用场景
1. 一个数据页在**merge之前**，change buffer**记录关于这个数据页的变更越多**，**收益越大**
2. 对于**写多读少**的业务，页面在写完后马上被访问的概率极低，此时**change buffer的使用效果最好**
    - 例如账单类、日志类的系统
3. 如果一个业务的更新模式为：**写入之后马上会做查询**
    - 虽然更新操作被记录到change buffer，但之后马上查询，又会**从磁盘读取**数据页，触发merge过程
    - **没有减少随机读，反而增加了维护change buffer的代价**

## 更新过程

### 插入(4,400)

#### 目标页在内存中
1. 对于**唯一索引**来说，找到3~5之间的位置，**判断没有冲突**，插入这个值
2. 对于**普通索引**来说，找到3~5之间的位置，插入这个值
3. 性能差异：**微乎其微**

#### 目标页不在内存中
1. 对于**唯一索引**来说，需要**将数据页读入内存**，**判断没有冲突**，插入这个值
    - **磁盘随机读**，成本很高
2. 对于**普通索引**来说，**将更新操作记录在change buffer**即可
    - **减少了磁盘随机读**，性能提升明显

## 索引选择
1. 普通索引与唯一索引，在查询性能上并没有太大差异，主要考虑的是**更新性能**，**推荐选择普通索引**
2. 建议**关闭change buffer**的场景
    - _**如果所有的更新后面，都伴随着对这个记录的查询**_
    - 控制参数`innodb_change_buffering`

```sql
mysql> SHOW VARIABLES LIKE '%innodb_change_buffering%';
+-------------------------+-------+
| Variable_name           | Value |
+-------------------------+-------+
| innodb_change_buffering | all   |
+-------------------------+-------+

# Valid Values (>= 5.5.4)
none / inserts / deletes / changes / purges / all

# Valid Values (<= 5.5.3)
none / inserts

# change buffer的前身是insert buffer，只能对insert操作进行优化
```

## change buffer + redolog

### 更新过程
当前k树的状态：找到对应的位置后，k1所在的数据页**Page 1在内存中**，k2所在的数据页**Page 2不在内存中**
```sql
INSERT INTO t(id,k) VALUES (id1,k1),(id2,k2);
```
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-innodb-change-buffer-update.png" width=500/>


```
# 内存：buffer pool
# redolog：ib_logfileX
# 数据表空间：t.ibd
# 系统表空间：ibdata1
```
1. Page 1在内存中，直接更新内存
2. Page 2不在内存中，在changer buffer中记录：`add (id2,k2) to Page 2`
3. 上述两个动作计入redolog（**磁盘顺序写**）
4. 至此事务完成，执行更新语句的成本很低
    - 写两次内存+一次磁盘
5. 由于在事务提交时，会把change buffer的操作记录也记录到redolog
    - 因此可以在**崩溃恢复**时，恢复change buffer
6. 虚线为**后台操作**，不影响更新操作的响应时间

### 读过程
假设：读语句发生在更新语句后不久，**内存中的数据都还在**，与系统表空间（ibdata1）和redolog（ib_logfileX）无关
```sql
SELECT * FROM t WHERE k IN (k1,k2);
```
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-innodb-change-buffer-read.png" width=500/>

1. 读Page 1，**直接从内存返回**（此时Page 1有可能还是**脏页**，并未真正落盘）
2. 读Page 2，通过**磁盘随机读**将数据页读入内存，然后应用change buffer里面的操作日志（**merge**）
    - 生成一个正确的版本并返回

### 提升更新性能
1. **redolog**：节省**随机写**磁盘的IO消耗（顺序写）
2. **change buffer**：节省**随机读**磁盘的IO消耗

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
