---
title: 计算机组成 -- DMP
mathjax: false
date: 2020-02-04 13:15:27
categories:
    - Computer Basics
    - Computer Organization
tags:
    - Computer Basics
    - Computer Organization
---

## DMP系统
1. DMP（Data Management Platform，**数据管理平台**）
2. DMP系统广泛应用在互联网的广告定向，个性化推荐
3. DMP系统会通过处理海量的互联网访问数据以及机器学习算法，给用户**标注**上各种各样的**标签**
   - 然后在做个性化推荐和广告投放的时候，再利用这些标签，去做实际的广告排序、推荐等工作
4. 对于外部使用DMP的系统或者用户来说，可以简单地把DMP看成一个**Key-Value**数据库
5. 对Key-Value系统的预期，以广告系统为案例
   - **低响应时间**
     - 一般的广告系统留给整个广告投放决策的时间大概是**10ms**
     - 因此对于访问DMP系统获取用户数据，预期的响应时间都在**1ms**以内
   - **高可用性**
     - DMP系统常用于广告系统，如果DMP系统出问题，意味着在不可用的时间内，整个广告收入是没有的
     - 因此，对于可用性的追求是没有上限的
   - **高并发**
     - 如果每天要响应100亿次广告请求，**QPS**大概是**12K**
   - **海量数据**
     - 如果有10亿个Key，每个用户有500个标签，标签有对应的分数
     - 标签和分数都用4 Bytes的整数来表示，总共大概需要4TB的数据
   - **低成本**
     - 广告系统的收入通常用**CPM**（Cost Per Mille，**千次曝光成本**）来统计

<!-- more -->

## 生成DMP
关注：蓝色的**数据管道**、绿色的**数据仓库**、**KV数据库**
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-dmp-build.jpg" width=1000/>

### 数据管道 + 数据仓库
1. 对于**数据管道**来说，需要的是**高吞吐率**，并发量和KV数据库差不多，但不需要**低响应时间**（1~2秒也是可以接受的）
   - 数据管道的数据读写都是**顺序读写**，没有大量随机读写的需求
2. **数据仓库**的数据读取的量要比数据管道**大得多**（数据分析）

### 技术选型
| 数据存储 | KV数据库 | 数据管道 | 数据仓库 |
| --- | --- | --- | --- |
| 响应时间 | 1ms | 1-2s | 10分钟~几小时 |
| 并发请求 | 10W~100W | 10W~100W | 100~1W |
| 存储数据量 | 100TB~1PB | 10TB~1PB | 5PB~100PB |
| 读写比例 | 随机读、随机写 | 顺序读、顺序写 | 顺序读、顺序写 |
| 存储成本 | 重要 | 不重要 | 重要 |
| 可用性要求 | 高 | 高 | 低 |
| 易失性要求 | 低 | 高 | 高 |
| MongoDB的缺陷 | 没有针对SSD特性进行设计，无法做到极限的高并发读取 | 没有针对顺序写入和吞吐率进行优化，更多考虑数据库的随机读写 | 没有Scheme导致需要在数据里面保留元信息，会占用更多存储空间 |
| 实际选型 | AeroSpike | Kafka | Hadoop/Hive |
| 选型原因 | 针对SSD设计，并发请求性能好，成本远低于使用内存 | 使用Zero-Copy和DMA，最大化吞吐量 | 使用Avro/Thrift/ProtoBuffer序列化，节约存储空间，使用HDD硬盘支撑海量的顺序读来节约成本 |

## 关系型数据库 -- 随机读写
1. 实现一个最简单的关系型数据库的思路：**CSV**文件格式，文件里面的每一行就是一条记录
2. 要修改里面的某一行，就要遍历整个CSV文件，相当于**扫描全表**，太浪费硬盘的吞吐量，可以考虑加上**索引**（B+树）
3. 索引里面没有一整行的数据，只有一个**映射关系**，这个映射关系可以让行号直接从硬盘的某个位置去读
4. 索引比数据小很多，可以把**索引加载到内存**里面
   - 即使不在内存里面，要找数据时快速遍历一下整个索引，也不需要读太多的数据
5. 索引不仅可以索引**行号**，还可以索引**某个字段**
6. 写入数据
   - 不仅要在数据表里面写入数据，对于所有的索引都需要进行更新
   - 写入一条数据可能就要触发几个**随机写入**的更新
7. 查询操作很灵活，无论是那个字段查询，只要有索引，就可以通过一次**随机读**，很快读到对应的数据
8. 因此这个数据模型决定了操作会伴随大量的**随机读写**请求，而随机读写请求，最终是要落到**硬盘**上的
   - 但HDD的**随机IQPS**只有**100**左右，很难做到**高并发**
9. 随时添加索引，可以根据任意字段进行查询的灵活性，DMP系统是不太需要的
   - KV数据库：**根据主键的随机查询**
     - 如果采用上面的方案，会面临大量的**随机写入**和**随机读取**的挑战
   - 数据管道：只需要**不断追加写入**和**顺序读取**就好
   - 数据仓库：不需要根据字段进行数据筛选，而是**全量扫描**数据进行分析汇总

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-dmp-relational-database.jpg" width=800/>

## Cassandra -- 高并发随机读写

### 数据模型
1. Cassandra的**键**一般被称为**Row Key**，其实是一个**16到36字节的字符串**
   - 每一个Row Key对应的**值**其实是一个**哈希表**，里面可以用**键值对**，再存入其他数据
2. Cassandra本身不像**关系型数据库**那样，有**严格的Schema**，在数据库创建的一开始就定义好有哪些**列**
3. Cassandra设计了一个叫作**列族**（Column Family）的概念，把一些需要经常放在一起使用的字段，放在**同一个列族**里面
   - 保持了**不需要严格的Schema的灵活性**，也保留了可以把常常在一起使用的数据存放在一起的**空间局部性**

### 写操作
1. Cassandra**只有顺序写入，没有随机写入**
2. 写操作包含两个动作
   - 往**磁盘**上写入一条**提交日志**（Commit Log）
   - 提交日志**写成功**后，直接在**内存的数据结构**上更新数据
3. 每台机器上，都有一个**可靠的硬盘**让我们去写入提交日志
4. **写入提交日志**都是**顺序写**，而不是随机写，**最大化写入的吞吐量**
5. 内存的空间比较有限
   - 一旦内存里面的**数据量**或者**条目**超过了一定的限额，Cassandra会把内存里面的数据结构**Dump**（**顺序写**）到硬盘上
   - 除了Dump的数据结构文件，Cassandra还会根据**Row Key**来生成一个**索引**文件，方便后续基于索引来进行**快速查询**
6. 随着硬盘上Dump出来的文件越来越多，Cassandra会在**后台**进行**文件的对比合并**（Compaction）
   - 合并：**顺序读取多个文件，在内存里面完成合并，再Dump出来一个新文件**
   - 整个操作过程，在**硬盘**层面仍然是**顺序读写**

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-dmp-cassandra-write.jpg" width=800/>

### 读操作
1. 读请求会通过**缓存**、**BloomFilter**进行两道过滤，尽可能避免**数据请求命中硬盘**
2. 从Cassandra读数据时，会先从**内存**里面找数据，再从**硬盘**读数据，然后把两部分的数据**合并**成最终结果
3. 硬盘上的文件，在内存里面会有对应的**Cache**，只有在Cache里面找不到，才会去请求硬盘里面的数据
4. 如果不得不访问硬盘，因为硬盘里可能Dump了很多**不同时间点**的内存数据的**快照**，查找顺序：**新 -> 旧**
   - 带来另一个问题：可能要查询很多个Dump文件，才能找到需要的数据
   - Cassandra的优化方案：**布隆过滤器**
     - 为每一个Dump文件里面的**所有Row Key**生成一个**BloomFilter**，然后把这个BloomFilter放在**内存**里面
     - 如果要查询的Row Key不在某个Dump文件里面，那么**99%**以上的情况，会**被BloomFilter过滤掉**，不需要访问硬盘

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-dmp-cassandra-read.jpg" width=800/>

### SSD
1. Cassandra的数据写入都是Commit Log的顺序写入，即不断地往硬盘后面追加内容，而不是去修改现有的文件内容
2. 一旦内存里面的数据超过一定的阈值，Cassandra会完整地Dump一个新文件到文件系统上，同样是一个追加写入
3. 数据的对比和合并，同样是读取现有的多个文件，然后写一个新的文件
4. 写入操作**只追加不修改**的特性，正好天然符合SSD硬盘只能**按块擦除**的特性
   - Cassandra用到的SSD，不需要频繁地进行后台的Compaction，能够最大化SSD的**使用寿命**