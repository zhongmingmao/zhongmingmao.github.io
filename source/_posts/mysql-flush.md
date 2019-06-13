---
title: MySQL -- flush
date: 2019-01-31 09:47:39
categories:
    - MySQL
tags:
    - MySQL
---

## 脏页 + 干净页
1. 脏页：内存数据页与磁盘数据页内容**不一致**
2. 干净页：内存数据页与磁盘数据页内容**一致**
3. flush：**将内存中的脏页写入磁盘**
4. _**flush -- 刷脏页；purge -- 清undolog；merge -- 应用change buffer**_

<!-- more -->

## flush过程
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-flush-procedure.jpeg" width=400/>


## 触发flush

### redolog写满
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-flush-redolog.jpeg" width=400/>

1. 当InnoDB的redolog写满，系统会**停止所有的更新操作**，推进`checkpoint`
2. 把`checkpoint`从CP推进到CP'，需要将两点之间的日志（绿色），所**对应的所有脏页**都flush到磁盘上
3. 然后`write pos`到CP'之间（红色+绿色）可以再写入redolog

#### 性能影响
InnoDB应该**尽量避免**，此时所有更新都会被**堵住**，更新数（**写性能**）跌为0

### 内存不足
1. 当需要新的内存页，而内存不够用时，就需要**淘汰**一些内存数据页（**LRU**）
2. 如果淘汰的是**脏页**，就需要**先将脏页flush到磁盘**
    - 该过程不会动redolog，因为redolog在重放的时候
    - 如果一个数据页已经flush过，会识别出来并跳过

#### 性能影响
1. 这种情况是**常态**，InnoDB使用`buffer pool`管理内存
2. `buffer pool`中内存页有3种状态
    - 没有被使用
    - 已被使用且为**干净页**
    - 已被使用且为**脏页**
3. InnoDB的策略是**尽量使用内存**，对于一个**长期运行**的库来说，未被使用的内存页很少
4. 当要读入的数据页没有在内存中，必须到`buffer pool`中申请一个内存页，采用**LRU**策略淘汰内存页
    - 如果淘汰的是**干净页**，**直接释放并复用**
    - 如果淘汰的是**脏页**，必须先将脏页**flush**到磁盘上，变成干净页后才能复用
4. 如果一个查询**要淘汰的脏页太多**，会导致查询的**响应时间明显变长**

### 其他情况
1. **系统空闲**
2. **正常关闭**

## 脏页控制策略

### 主机IO能力
1. 需要配置主机的**IO能力**，InnoDB才知道**全力刷脏页**时，可以刷多快
2. 控制参数`innodb_io_capacity`，建议设置为磁盘的`IOPS`（可以通过`fio`测试）
3. 如果该值设置**过小**，InnoDB会认为主机的IO能力很差，从而**控制刷脏页的速度**，甚至低于脏页的生成速度
    - 造成**脏页累积**，**影响查询和更新性能**

```sql
mysql> SHOW VARIABLES LIKE '%innodb_io_capacity%';
+------------------------+-------+
| Variable_name          | Value |
+------------------------+-------+
| innodb_io_capacity     | 2000  |
| innodb_io_capacity_max | 4000  |
+------------------------+-------+
```
```
$ fio -filename=fio.txt -direct=1 -iodepth 1 -thread -rw=randrw -ioengine=psync -bs=16k -size=2048M -numjobs=10 -runtime=10 -group_reporting -name=mytest
...
Jobs: 10 (f=10): [m(10)][90.9%][r=155MiB/s,w=155MiB/s][r=9907,w=9896 IOPS][eta 00m:01s]
mytest: (groupid=0, jobs=10): err= 0: pid=4867: Thu Jan 31 11:26:20 2019
   read: IOPS=11.2k, BW=175MiB/s (184MB/s)(1754MiB/10002msec)
   ...
   bw (  KiB/s): min=14285, max=24256, per=10.01%, avg=17978.35, stdev=2020.97, samples=190
   iops        : min=  892, max= 1516, avg=1123.32, stdev=126.33, samples=190
  write: IOPS=11.2k, BW=176MiB/s (184MB/s)(1756MiB/10002msec)
    ...
   bw (  KiB/s): min=14211, max=24480, per=10.01%, avg=17990.18, stdev=2278.29, samples=190
   iops        : min=  888, max= 1530, avg=1124.08, stdev=142.44, samples=190

Run status group 0 (all jobs):
   READ: bw=175MiB/s (184MB/s), 175MiB/s-175MiB/s (184MB/s-184MB/s), io=1754MiB (1839MB), run=10002-10002msec
  WRITE: bw=176MiB/s (184MB/s), 176MiB/s-176MiB/s (184MB/s-184MB/s), io=1756MiB (1841MB), run=10002-10002msec
```

### flush speed
1. 刷脏页速度**慢**的后果
    - **内存脏页太多**
    - **redolog写满**
2. 因素：_**脏页比例**_ + _**redolog写盘速度**_
3. 控制参数`innodb_max_dirty_pages_pct`：脏页比例上限
4. `F1(M)`：InnoDB会根据**当前的脏页比例M**，计算出一个`[0,100]`的值，伪代码如下所示
5. `F2(N)`：**N越大，F2越大**
    - InnoDB每次写入的日志都有一个序号
    - N：`write pos`对应的序号与`checkpoint`对应的序号之间的**差值**
6. 算法
    - **`R = max(F1(M) , F2(N))`**
    - **`flush speed = innodb_io_capacity * R%`**

```sql
mysql> SHOW VARIABLES LIKE '%innodb_max_dirty_pages_pct%';
+--------------------------------+-------+
| Variable_name                  | Value |
+--------------------------------+-------+
| innodb_max_dirty_pages_pct     | 75    |
| innodb_max_dirty_pages_pct_lwm | 0     |
+--------------------------------+-------+
```
```c
F1(M){
    if M>=innodb_max_dirty_pages_pct then
        return 100;
    return M/innodb_max_dirty_pages_pct * 100;
}
```

<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-flush-speed.png" width=400/>


### 脏页比例
1. 平时要多关注**脏页比例**：`Innodb_buffer_pool_pages_dirty/Innodb_buffer_pool_pages_total`
2. 不要经常接近`innodb_max_dirty_pages_pct`

```sql
mysql> SHOW GLOBAL STATUS LIKE '%Innodb_buffer_pool_pages_%';
+----------------------------------+------------+
| Variable_name                    | Value      |
+----------------------------------+------------+
| Innodb_buffer_pool_pages_data    | 633395     |
| Innodb_buffer_pool_pages_dirty   | 99         |
| Innodb_buffer_pool_pages_flushed | 1286891803 |
| Innodb_buffer_pool_pages_free    | 8191       |
| Innodb_buffer_pool_pages_misc    | 13774      |
| Innodb_buffer_pool_pages_total   | 655360     |
+----------------------------------+------------+

# 1. Innodb_buffer_pool_pages_data
#   The number of pages in the InnoDB buffer pool containing data. The number includes both dirty and clean pages.
# 2. Innodb_buffer_pool_pages_dirty
#   The current number of dirty pages in the InnoDB buffer pool.
# 3. Innodb_buffer_pool_pages_flushed
#   The number of requests to flush pages from the InnoDB buffer pool.
# 4. Innodb_buffer_pool_pages_free
#   The number of free pages in the InnoDB buffer pool.
# 5. Innodb_buffer_pool_pages_misc
#   The number of pages in the InnoDB buffer pool that are busy because they have been allocated for administrative overhead, such as row locks or the adaptive hash index.
#   Innodb_buffer_pool_pages_misc = Innodb_buffer_pool_pages_total − Innodb_buffer_pool_pages_free − Innodb_buffer_pool_pages_data.
#   13774 = 655360 - 8191 - 633395
# 6. Innodb_buffer_pool_pages_total
#   The total size of the InnoDB buffer pool.

# Innodb_buffer_pool_pages_dirty/Innodb_buffer_pool_pages_total = 0.015%
```

### flush neighbor

```sql
mysql> SHOW VARIABLES LIKE '%innodb_flush_neighbors%';
+------------------------+-------+
| Variable_name          | Value |
+------------------------+-------+
| innodb_flush_neighbors | 0     |
+------------------------+-------+
```
1. 在准备刷一个脏页的时候，如果这个数据页的**邻居**恰好也是脏页，也会一起flush，可能会**蔓延**
2. 在**HDD**（**IOPS为几百**）时代，能**减少很多随机IO**
3. 对于**SDD**，IOPS不再是瓶颈，可以将`innodb_flush_neighbors`设置为0，只刷新自己，MySQL 8.0默认

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
