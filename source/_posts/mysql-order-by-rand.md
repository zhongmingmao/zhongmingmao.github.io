---
title: MySQL -- order by rand
date: 2019-02-10 17:49:12
categories:
    - Storage
    - MySQL
tags:
    - Storage
    - MySQL
---

## 单词表
目的：随机选择3个单词
```sql
CREATE TABLE `words` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `word` VARCHAR(64) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

DELIMITER ;;
CREATE PROCEDURE wdata()
BEGIN
    DECLARE i INT;
    SET i=0;
    WHILE i<10000 DO
        INSERT INTO words(word) VALUES (CONCAT(CHAR(97+(i DIV 1000)), CHAR(97+(i % 1000 DIV 100)), CHAR(97+(i % 100 DIV 10)), CHAR(97+(i % 10))));
        SET i=i+1;
    END WHILE;
END;;
DELIMITER ;

CALL wdata();
```

### 查询语句
```sql
SELECT word FROM words ORDER BY RAND() LIMIT 3;
```

<!-- more -->

## 内存临时表

### explain
```sql
mysql> EXPLAIN SELECT word FROM words ORDER BY RAND() LIMIT 3\G;
*************************** 1. row ***************************
           id: 1
  select_type: SIMPLE
        table: words
   partitions: NULL
         type: ALL
possible_keys: NULL
          key: NULL
      key_len: NULL
          ref: NULL
         rows: 9980
     filtered: 100.00
        Extra: Using temporary; Using filesort
```
1. `Using temporary;`：表示需要使用到**临时表**
    - 如果采用的是**内存临时表**，存储引擎可以选择**TempTable**（默认）或**MEMORY**
    - 如果采用的是**磁盘临时表**，存储引擎可以选择**InnoDB**（默认）或**MyISAM**
2. `Using filesort`：表示需要执行**排序**操作
3. 综合起来：需要**在临时表上排序**，该操作往往**执行代价比较大**，尽量避免

```sql
-- internal_tmp_mem_storage_engine introduced 8.0.2
mysql> SHOW VARIABLES LIKE '%storage_engine%';
+----------------------------------+--------+
| Variable_name                    | Value  |
+----------------------------------+--------+
| default_storage_engine           | InnoDB |
| default_tmp_storage_engine       | InnoDB |
| disabled_storage_engines         |        |
| internal_tmp_disk_storage_engine | InnoDB |
| internal_tmp_mem_storage_engine  | MEMORY |
+----------------------------------+--------+
```

#### 排序算法
1. 对于**磁盘临时表**而言，会优先选择**全字段排序**，因为可以**减少磁盘访问**
2. 对于**内存临时表**而言，会优先选择**rowid排序**，因为不需要磁盘操作，**回表的开销很低**

### rowid
1. 每个存储引擎用来**唯一标识一行数据的字段**
2. InnoDB
    - InnoDB采用的是索引组织表，必然有“主键”（显式声明或隐式自动生成）
    - 如有**有显式**声明**主键**或**唯一主键**，rowid就是**主键**（主键优先）或**唯一主键**
    - 如果**没有显式**声明**主键**和**唯一主键**，rowid是由**系统自动生成**（6 Bytes）的
3. MEMORY
    - MEMORY采用的不是**索引组织表**，可以简单理解为一个**数组**，rowid就是**数组的下标**
    - 下面执行过程中讲到的**位置信息**（**pos**），其实就是**MEMORY引擎的rowid**（**数组下标**），即`rowid = pos`

### tmp_table_size
1. 当临时表需要的空间**小于**`tmp_table_size`（默认16MB），临时表将采用内存临时表
2. 内存临时表存放两个字段：R（**8** Bytes）和W（**64*3** Bytes，按UTF8最大占用空间计算）
3. 最大占用空间：`(8+64*3)*10000=2,000,000 < 16,777,216`，因此可以采用**内存临时表**

```sql
-- 16777216 Bytes = 16 MB
-- 线上配置为128 MB
mysql> SHOW VARIABLES LIKE '%tmp_table_size%';
+----------------+----------+
| Variable_name  | Value    |
+----------------+----------+
| tmp_table_size | 16777216 |
+----------------+----------+
```

### sort_buffer_size
```sql
-- 262144 Bytes = 256 KB
mysql> SHOW VARIABLES LIKE 'sort_buffer_size';
+------------------+--------+
| Variable_name    | Value  |
+------------------+--------+
| sort_buffer_size | 262144 |
+------------------+--------+
```
1. 对于使用**内存临时表**而言，由于**回表开销很低**（都在**内存**中），优先选择**rowid排序**
2. 而对`sort buffer`按R进行排序时，在空间充足的情况下，会优先现在**优先级队列排序**（MySQL 5.6引入）
3. `262144 / size(R)+size(pos) = 262144/14 = 18724 > 3`，因此会选择**优先级队列排序**

### 执行过程
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-order-by-rand-process.png" width=600/>

1. 创建一个采用**MEMORY**引擎的**内存临时表**（_**数组**_，_**没有索引**_），表内有两个字段：**R**和**W**
    - R：**double类型**，用于存放**随机小数**
    - W：**VARCHAR(64)类型**，用于存放**原表的word字段**
2. 从**原表**中，按**主键顺序**依次取出**所有的word值**
    - 对于每一个word值，调用`rand()`函数生成一个`(0,1)`之间的**随机小数**
    - 将生成的随机小数和word值分别存入内存临时表的R和W字段
    - 此时，行扫描行数为10000
3. 内存临时表已经有10000行数据，下面需要在**没有索引的内存临时表**上，**按照字段R排序**
    - 后续操作就没有原表什么事情了，_内存临时表相当于下一阶段的原表_
4. 初始化`sort buffer`，确定放入两个字段：一个是**double**类型的R字段，一个是**整型类型**的pos
    - R：用于存放**内存临时表的R字段**
    - pos：用于存放**内存临时表的rowid字段**
    - 类似于**rowid排序**，但实际可能会优化为**优先级队列排序**
5. 从**内存临时表**中一行一行地取出**R**和**pos**，分别存入`sort buffer`的两个字段
    - 此时，行扫描行数为20000
6. 在`sort buffer`中根据字段**R排序**（如果优化为**优先级队列排序**，跳过）
    - 该过程**不涉及表操作**，**不会增加扫描行数**
7. 排序完成后，取出前3个结果的**pos**，依据pos依次到**内存临时表**中取出word值，返回客户端
    - 此时，行扫描行数为**20003**

### 观察指标

#### 慢查询日志
`Rows_examined`为20003，与上面分析结论一致
```sql
# Time: 2019-02-11T09:27:42.472723Z
# User@Host: root[root] @ localhost []  Id:    13
# Query_time: 0.007515  Lock_time: 0.000179 Rows_sent: 3  Rows_examined: 20003
SET timestamp=1549877262;
SELECT word FROM words ORDER BY RAND() LIMIT 3;
```

#### OPTIMIZER_TRACE
```json
"filesort_information": [
    {
        "direction": "asc",
        "table": "intermediate_tmp_table",
        "field": "tmp_field_0"
    }
],
"filesort_priority_queue_optimization": {
    "limit": 3,
    "chosen": true
},
...
"filesort_summary": {
    "memory_available": 262144,
    "key_size": 24,
    "row_size": 24,
    "max_rows_per_buffer": 4,
    "num_rows_estimate": 10010,
    "num_rows_found": 4,
    "num_examined_rows": 10000,
    "num_initial_chunks_spilled_to_disk": 0,
    "peak_memory_used": 128,
    "sort_algorithm": "std::sort",
    "unpacked_addon_fields": "using_priority_queue",
    "sort_mode": "<fixed_sort_key, rowid>"
}
```
1. `filesort_priority_queue_optimization.chosen=true`和`unpacked_addon_fields=using_priority_queue`
    - 表示使用了**优先级队列排序**
2. `peak_memory_used < memory_available`和`num_initial_chunks_spilled_to_disk=0`
    - 表示排序过程中没有使用**磁盘临时文件**，完全在`sort buffer`中进行，峰值内存才为**128 Bytes**
3. `num_examined_rows`：参与排序的有10000行，这些行需要从**内存临时表**中读取，扫描行数+10000
4. `sort_mode`中有`rowid`关键字：表示采用的是**rowid排序**

### 优先级队列排序
1. 需要取回R值**最小**的3个rowid，如果使用**归并排序**，结束后，10000行数据都是有序的，这样会**浪费**很多计算量
2. 而采用优先级队列排序，可以**精确**地只得到3个最小的值

#### 构建最大堆
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-order-by-rand-build-heap.png" width=500/>

1. 在内存临时表中，有10000个准备参与排序的行，一行为`(R,rowid)`，先取前3行放入`sort buffer`，构造成一个**堆**
2. 取下一行`(R',rowid')`，与当前堆中最大的`R`比较
    - 如果`R'`小于`R`，则把这个`(R,rowid)`从堆中去掉，替换成`(R',rowid')`
3. 重复上述步骤，直到第10000行比较完成

#### 回表返回
1. 构造**最大堆**（在`sort buffer`中）完成后，堆里面存放的是10000行中R值**最小**的3行
2. 依次取出对应的rowid，然后**回表**（内存临时表）取出word字段，返回给客户端

## 磁盘临时表
当临时表需要的空间**大于**`tmp_table_size`（默认16MB），内存临时表就会转成**磁盘临时表**（默认InnoDB存储引擎）

### 优先级队列排序

#### 执行过程
```sql
-- 构造使用磁盘临时表的场景，最小为1024
SET tmp_table_size=1024;

-- 构造使用磁盘临时文件的场景，最小为32768
-- 如果内存空间不能满足优先级队列排序，会降级为归并排序（需要使用磁盘临时文件）
SET sort_buffer_size=32768;

-- 打开optimizer_trace，只对本线程有效
SET optimizer_trace='enabled=on';

-- 执行语句
SELECT word FROM words ORDER BY RAND() LIMIT 3;

-- 查看OPTIMIZER_TRACE输出
SELECT * FROM `information_schema`.`OPTIMIZER_TRACE`\G
```

#### 观察指标

##### 慢查询日志
```sql
# Time: 2019-02-11T10:32:49.301884Z
# User@Host: root[root] @ localhost []  Id:    13
# Query_time: 0.013087  Lock_time: 0.000124 Rows_sent: 3  Rows_examined: 20003
SET timestamp=1549881169;
SELECT word FROM words ORDER BY RAND() LIMIT 3;
```

##### OPTIMIZER_TRACE
```json
"filesort_information": [
    {
        "direction": "asc",
        "table": "intermediate_tmp_table",
        "field": "tmp_field_0"
    }
],
"filesort_priority_queue_optimization": {
    "limit": 3,
    "chosen": true
},
...
"filesort_summary": {
    "memory_available": 32768,
    "key_size": 8,
    "row_size": 210,
    "max_rows_per_buffer": 4,
    "num_rows_estimate": 1170,
    "num_rows_found": 4,
    "num_examined_rows": 10000,
    "num_initial_chunks_spilled_to_disk": 0,
    "peak_memory_used": 872,
    "sort_algorithm": "std::sort",
    "unpacked_addon_fields": "using_priority_queue",
    "sort_mode": "<fixed_sort_key, additional_fields>"
}
```
1. 临时表需要占用的最小空间：`(8+4*1)*10000=120,000 > 32,768=tmp_table_size`，因此采用的是**磁盘临时表**
2. 采用**磁盘临时表**，那就必须考虑**回表开销**了，优先选择**全字段排序**
3. 磁盘临时表包含三个字段：**rowid（6 Bytes）**、**R（8 Bytes）**、**word（4\*1~64\*3 Bytes）**
    - 单行最大长度为`6+8+64*3=206 < 4096=max_length_for_sort_data`，依然采用**全字段排序**
4. `sort_mode`中有`additional_fields`关键字：表示采用的是**全字段排序**
5. `sort_buffer_size / row_max_size = 32768/206 = 159 > 3`，因此可以选择**优先级队列排序**，佐证如下：
    - `peak_memory_used=872 < memory_available`
    - `filesort_priority_queue_optimization.chosen=true`
    - `unpacked_addon_fields=using_priority_queue`
    - `num_initial_chunks_spilled_to_disk=0`

### 归并排序

#### 执行过程
```sql
SELECT word FROM words ORDER BY RAND() LIMIT 3000;
```

#### 慢查询日志
```sql
# Time: 2019-02-11T11:07:01.812796Z
# User@Host: root[root] @ localhost []  Id:    13
# Query_time: 0.018456  Lock_time: 0.000113 Rows_sent: 3000  Rows_examined: 23000
SET timestamp=1549883221;
SELECT word FROM words ORDER BY RAND() LIMIT 3000;
```

#### OPTIMIZER_TRACE
```json
"filesort_information": [
    {
        "direction": "asc",
        "table": "intermediate_tmp_table",
        "field": "tmp_field_0"
    }
],
"filesort_priority_queue_optimization": {
    "limit": 3000,
    "strip_additional_fields": {
        "row_size": 22,
        "chosen": false,
        "cause": "not_enough_space"
    }
},
...
"filesort_summary": {
    "memory_available": 32768,
    "key_size": 8,
    "row_size": 212,
    "max_rows_per_buffer": 154,
    "num_rows_estimate": 1170,
    "num_rows_found": 10000,
    "num_examined_rows": 10000,
    "num_initial_chunks_spilled_to_disk": 8,
    "peak_memory_used": 47968,
    "sort_algorithm": "std::stable_sort",
    "sort_mode": "<fixed_sort_key, packed_additional_fields>"
}
```
1. `sort_mode`中含有`packed_additional_fields`关键字
    - 采用**全字段排序**，并且对字段有做**紧凑**处理（word为VARCHAR类型）
    - 佐证：`filesort_priority_queue_optimization.strip_additional_fields`
2. `filesort_priority_queue_optimization..chosen=false`
    - `row_size=22`，而`sort_buffer_size / row_size = 32768/22 = 1489 < 3000`
    - 因此`sort buffer`不足以满足采用**优先级队列排序**，降级为**归并排序**（外部排序）
    - 佐证：`cause=not_enough_space`和`num_initial_chunks_spilled_to_disk=8`

## 随机排序
1. 无论采用**内存临时表**还是**磁盘临时表**，`order by rand`都会让**计算过程很复杂**，需要**扫描大量行**，**资源消耗严重**
2. 解决思路：**数据库只负责读写数据**（**职责尽量单一**），随机排序的逻辑交由**业务层**实现

### 随机算法1
简化问题：随机选择1个word
```sql
SELECT MAX(id),MIN(id) INTO @M,@N FROM words;
SET @X=FLOOR(@N+(@M-@N+1)*RAND());
SELECT * FROM words WHERE id >= @X LIMIT 1;
```
1. MAX和MIN都**不需要将索引遍历一遍**，**效率很高**
2. 第3步可以利用**索引**快速定位
3. 但算法本身并**非严格随机**，因为ID中间可能存在**空洞**，因此选择不同行的概率是不一样的

### 随机算法2
```sql
SELECT COUNT(*) INTO @C FROM words;
SET @Y = FLOOR(@C*RAND());
SET @sql = CONCAT("SELECT * FROM words LIMIT ", @Y, ",1");
PREPARE stmt from @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```
1. 优点：**严格随机**
2. `LIMIT Y,1`：按顺序一个个读出，丢掉前面Y个，然后把第**Y+1**个记录返回，因此该过程需要扫描Y+1行
3. 整个过程的扫描行数：**C+Y+1**
    - 执行代价比随机算法1要高
    - 但相对于`order by rand`，执行代价还是很小的
        - 因为随机算法2是**直接根据主键**排序获取的
        - 而`order by rand`很繁琐：**生成临时表**，**按R字段排序**，**获取rowid后回查临时表**（如果是rowid排序）

### 随机算法3
恢复到取3个word，整个过程的扫描行数：**C+(Y1+1)+(Y2+1)+(Y3+1)**
```sql
SELECT COUNT(*) INTO @C FROM words;
SET @Y1 = FLOOR(@C * RAND());
SET @Y2 = FLOOR(@C * RAND());
SET @Y3 = FLOOR(@C * RAND());
-- 在应用代码里面取Y1、Y2、Y3，拼出SQL后执行
SELECT * FROM words LIMIT @Y1,1;
SELECT * FROM words LIMIT @Y2,1;
SELECT * FROM words LIMIT @Y3,1;
```

### 随机算法4
整个过程的扫描行数：**C+MAX(Y1,Y2,Y3)+1+3**
```sql
SELECT COUNT(*) INTO @C FROM words;
SET @Y1 = FLOOR(@C * RAND());
SET @Y2 = FLOOR(@C * RAND());
SET @Y3 = FLOOR(@C * RAND());
SET @M = MAX(@Y1,@Y2,@Y3);
SET @N = MIN(@Y1,@Y2,@Y3);
SELECT id FROM words LIMIT N,M-N+1;
-- 业务代码随机选择ID1、ID2、ID3
SELECT * FROM words WHERE id IN (ID1,ID2,ID3);
```

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
