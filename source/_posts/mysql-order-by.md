---
title: MySQL -- order by
date: 2019-02-09 15:34:52
categories:
    - MySQL
tags:
    - MySQL
---

## 市民信息
```sql
CREATE TABLE `t` (
  `id` INT(11) NOT NULL,
  `city` VARCHAR(16) NOT NULL,
  `name` VARCHAR(16) NOT NULL,
  `age` INT(11) NOT NULL,
  `addr` VARCHAR(128) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `city` (`city`)
) ENGINE=InnoDB;
```

### 查询语句
```sql
SELECT city,name,age FROM t WHERE city='杭州' ORDER BY name LIMIT 1000;
```

<!-- more -->

### 存储过程
```sql
DELIMITER ;;
CREATE PROCEDURE idata()
BEGIN
    DECLARE i INT;
    SET i=0;
    WHILE i<4000 DO
        INSERT INTO t VALUES (i,'杭州',concat('zhongmingmao',i),'20','XXX');
        SET i=i+1;
    END WHILE;
END;;
DELIMITER ;

CALL idata();
```

## 全字段排序

### city索引树
满足city='杭州'的行，主键为`ID_X ~ ID_(X+N)`
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-order-by-index-city.png" width=500/>

### sort buffer
```sql
mysql> EXPLAIN SELECT city,name,age FROM t FORCE INDEX(city) WHERE city='杭州' ORDER BY name LIMIT 1000\G;
*************************** 1. row ***************************
           id: 1
  select_type: SIMPLE
        table: t
   partitions: NULL
         type: ref
possible_keys: city
          key: city
      key_len: 50
          ref: const
         rows: 4000
     filtered: 100.00
        Extra: Using index condition; Using filesort
```
1. `rows=4000`：EXPLAIN是**不考虑LIMIT的**，代表**匹配条件的总行数**
2. `Using index condition`：表示使用了**索引下推**
3. `Using filesort`：表示需要**排序**，MySQL会为每个**线程**分配一块内存用于排序，即`sort buffer`

```sql
-- 1048576 Bytes = 1 MB
mysql> SHOW VARIABLES LIKE '%sort_buffer%';
+-------------------------+----------+
| Variable_name           | Value    |
+-------------------------+----------+
| innodb_sort_buffer_size | 67108864 |
| myisam_sort_buffer_size | 8388608  |
| sort_buffer_size        | 1048576  |
+-------------------------+----------+
```

### 执行过程
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-order-by-all-field-sort.jpg" width=500/>
1. 初始化`sort buffer`，确定放入三个字段：**`city`、`name`、`age`**
2. 从**city索引树**找到第一个满足city='杭州'的主键ID，即ID_X
3. 然后拿着ID_X**回表**取出整行，将`city`、`name`、`age`这三个字段的值都存入`sort buffer`
4. 回到**city索引树**取下一条记录，重复上述动作，直至city的值不满足条件为止，即ID_Y
5. 对`sort buffer`中的数据按照`name`字段进行排序
    - 排序过程可能使用**内部排序**（**内存**，**首选**，**快速排序/堆排序**），也可能使用**外部排序**（**磁盘**，**次选**，**归并排序**）
    - 这取决于**排序所需要的内存**是否小于`sort_buffer_size`（默认**1 MB**）
6. 按照排序结果取前1000行返回给客户端

### 观察指标
```sql
-- 打开慢查询日志
SET GLOBAL slow_query_log=ON;
SET long_query_time=0;

-- 查询optimizer_trace时需要用到临时表，internal_tmp_disk_storage_engine默认值为InnoDB
-- 采用默认值时，把数据从临时表取出来的时候，会将Innodb_rows_read+1，因此修改为MyISAM，减少干扰信息
SET GLOBAL internal_tmp_disk_storage_engine=MyISAM;

-- 将sort buffer设置为最小值，这是为了构造外部排序的场景，如果是内部排序则无需执行该语句
SET sort_buffer_size=32768;

-- 打开optimizer_trace，只对本线程有效
SET optimizer_trace='enabled=on';

-- @a 保存Innodb_rows_read的初始值
SELECT VARIABLE_VALUE INTO @a FROM  performance_schema.session_status WHERE variable_name = 'Innodb_rows_read';

-- 执行语句
SELECT city,name,age FROM t FORCE INDEX(city) WHERE city='杭州' ORDER BY name LIMIT 1000;

-- 查看optimizer_trace输出
SELECT * FROM `information_schema`.`OPTIMIZER_TRACE`\G;

-- @b 保存Innodb_rows_read的当前值
SELECT VARIABLE_VALUE INTO @b FROM performance_schema.session_status WHERE variable_name = 'Innodb_rows_read';

-- 计算Innodb_rows_read差值
-- MyISAM为4000，InnoDB为4001
SELECT @b-@a;
```

#### 外部排序

##### 慢查询日志
```sql
# Time: 2019-02-10T07:19:38.347053Z
# User@Host: root[root] @ localhost []  Id:     8
# Query_time: 0.012832  Lock_time: 0.000308 Rows_sent: 1000  Rows_examined: 5000
SET timestamp=1549783178;
SELECT city,name,age FROM t FORCE INDEX(city) WHERE city='杭州' ORDER BY name LIMIT 1000;
```

##### OPTIMIZER_TRACE
```json
"filesort_summary": {
    "memory_available": 32768,
    "key_size": 32,
    "row_size": 140,
    "max_rows_per_buffer": 234,
    "num_rows_estimate": 16912,
    "num_rows_found": 4000,
    "num_examined_rows": 4000,
    "num_initial_chunks_spilled_to_disk": 9,
    "peak_memory_used": 35096,
    "sort_algorithm": "std::stable_sort",
    "sort_mode": "<fixed_sort_key, packed_additional_fields>"
}
```
> In optimizer trace output, `num_tmp_files` did not actually indicate number of files.
It has been **renamed** to `num_initial_chunks_spilled_to_disk` and indicates the **number of chunks before any merging has occurred**.

1. `num_initial_chunks_spilled_to_disk=9`，说明采用了**外部排序**，使用了**磁盘临时文件**
2. `peak_memory_used > memory_available`：**sort buffer空间不足**
3. 如果`sort_buffer_size`越小，`num_initial_chunks_spilled_to_disk`的值就越大
4. 如果`sort_buffer_size`足够大，那么`num_initial_chunks_spilled_to_disk=0`，采用**内部排序**
5. `num_examined_rows=4000`：**参与排序的行数**
6. `sort_mode`含有的`packed_additional_fields`：排序过程中对**字符串**做了**紧凑**处理
    - 字段name为`VARCHAR(16)`，在排序过程中还是按照**实际长度**来分配空间

##### 扫描行数
整个执行过程中总共**扫描**了4000行（如果`internal_tmp_disk_storage_engine=InnoDB`，返回4001）
```sql
mysql> SELECT @b-@a;
+-------+
| @b-@a |
+-------+
|  4000 |
+-------+
```

#### 内部排序

##### 慢查询日志
`Query_time`为0.007517，为采用外部排序的**59%**
```sql
# Time: 2019-02-10T07:36:36.442679Z
# User@Host: root[root] @ localhost []  Id:     8
# Query_time: 0.007517  Lock_time: 0.000242 Rows_sent: 1000  Rows_examined: 5000
SET timestamp=1549784196;
SELECT city,name,age FROM t FORCE INDEX(city) WHERE city='杭州' ORDER BY name LIMIT 1000;
```

##### OPTIMIZER_TRACE
```json
"filesort_information": [
    {
        "direction": "asc",
        "table": "`t` FORCE INDEX (`city`)",
        "field": "name"
    }
],
"filesort_priority_queue_optimization": {
    "limit": 1000,
    "chosen": true
},
...
"filesort_summary": {
    "memory_available": 1048576,
    "key_size": 32,
    "row_size": 138,
    "max_rows_per_buffer": 1001,
    "num_rows_estimate": 16912,
    "num_rows_found": 1001,
    "num_examined_rows": 4000,
    "num_initial_chunks_spilled_to_disk": 0,
    "peak_memory_used": 146146,
    "sort_algorithm": "std::stable_sort",
    "unpacked_addon_fields": "using_priority_queue",
    "sort_mode": "<fixed_sort_key, additional_fields>"
}
```
1. `num_initial_chunks_spilled_to_disk=0`，说明采用了内部排序（**堆排序**），排序直接在`sort buffer`中完成
2. `peak_memory_used < memory_available`：**sort buffer空间充足**
3. `num_examined_rows=4000`：**参与排序的行数**
4. `filesort_priority_queue_optimization`：采用**优先级队列优化**（**堆排序**）

##### 扫描行数
```sql
mysql> SELECT @b-@a;
+-------+
| @b-@a |
+-------+
|  4000 |
+-------+
```

### 性能
1. 全字段排序：对**原表**数据读一遍（覆盖索引的情况除外），其余操作都在`sort buffer`和**临时文件**中进行
2. 如果查询要**返回的字段很多**，那么`sort buffer`中能同时放下的行就会变得很少
3. 这时会分成**很多个临时文件**，**排序性能就会很差**
4. 解决方案：采用_**rowid排序**_
    - 单行的长度**不超过**`max_length_for_sort_data`：**全字段排序**
    - 单行的长度**超过**`max_length_for_sort_data`：**rowid排序**

```sql
mysql> SHOW VARIABLES LIKE '%max_length_for_sort_data%';
+--------------------------+-------+
| Variable_name            | Value |
+--------------------------+-------+
| max_length_for_sort_data | 4096  |
+--------------------------+-------+
```

## rowid排序
`city`、`name`和`age`三个字段的总长度最少为36，执行`SET max_length_for_sort_data=16;`

### 执行过程
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-order-by-rowid-sort.jpg" width=500/>
1. 初始化`sort buffer`，确定放入两个字段：**`name`（需要排序的字段）、`id`（索引组织表，主键）**
2. 从**city索引树**找到第一个满足city='杭州'的主键ID，即ID_X
3. 然后拿着ID_X**回表**取出整行，将`name`和`ID`这两个字段的值存入`sort buffer`
4. 回到**city索引树**取下一条记录，重复上述动作，直至city的值不满足条件为止，即ID_Y
5. 对`sort buffer`中的数据按照`name`字段进行排序（当然也有可能仍然是**外部排序**）
6. 遍历排序结果，取出前1000行，并按照主键id的值**回表**取出`city`，`name`和`age`三个字段返回给客户端
    - 其实，结果集只是一个**逻辑概念**，MySQL服务端在sort buffer排序完成后，不会再耗费内存来存储回表取回的内容
    - 实际上，MySQL服务端从排序后的`sort buffer`中依次取出id，回表取回内容后，**直接返回给客户端**

### 观察指标
```sql
-- 采用外部排序 + rowid排序
SET sort_buffer_size=32768;
SET max_length_for_sort_data=16;
```

#### 慢查询日志
```sql
# Time: 2019-02-10T08:23:59.068672Z
# User@Host: root[root] @ localhost []  Id:     8
# Query_time: 0.012047  Lock_time: 0.000479 Rows_sent: 1000  Rows_examined: 5000
SET timestamp=1549787039;
SELECT city,name,age FROM t FORCE INDEX(city) WHERE city='杭州' ORDER BY name LIMIT 1000;
```

#### OPTIMIZER_TRACE
```json
"filesort_information": [
    {
        "direction": "asc",
        "table": "`t` FORCE INDEX (`city`)",
        "field": "name"
    }
],
"filesort_priority_queue_optimization": {
    "limit": 1000
},
...
"filesort_summary": {
    "memory_available": 32768,
    "key_size": 36,
    "row_size": 36,
    "max_rows_per_buffer": 910,
    "num_rows_estimate": 16912,
    "num_rows_found": 4000,
    "num_examined_rows": 4000,
    "num_initial_chunks_spilled_to_disk": 6,
    "peak_memory_used": 35008,
    "sort_algorithm": "std::stable_sort",
    "unpacked_addon_fields": "max_length_for_sort_data",
    "sort_mode": "<fixed_sort_key, rowid>"
}
```
1. `num_initial_chunks_spilled_to_disk`，9->6，说明外部排序所需要的**临时文件变少**了
2. `sort_mode`含有的`rowid`：采用**rowid排序**
3. `num_examined_rows=4000`：**参与排序的行数**

#### 扫描行数
扫描的行数变成了5000行（多出了1000行是**回表**操作）
```sql
mysql> SELECT @b-@a;
+-------+
| @b-@a |
+-------+
|  5000 |
+-------+
```

## 全字段排序 vs rowid排序
1. MySQL只有在担心由于**sort buffer太小而影响排序效率**的时候，才会考虑使用rowid排序，rowid排序的优缺点如下
    - 优点：排序过程中，**一次排序可以排序更多的行**
    - 缺点：增加**回表**次数，**与LIMIT N成正相关**
2. MySQL如果认为`sort buffer`足够大，会**优先选择全字段排序**
    - 把需要的所有字段都放到`sort buffer`，排序完成后**直接从内存返回查询结果**，**无需回表**
    - 体现了MySQL的一个设**计思路**
        - _**尽量使用内存，减少磁盘访问**_
4. MySQL排序是一个比较**成本较高**的操作，进一步的优化方案：**联合索引**、**覆盖索引**
    - 目的：**移除`Using filesort`**

## 优化方案

### 联合索引
```sql
ALTER TABLE t ADD INDEX city_user(city, name);
```

#### city_user索引树
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-order-by-combine-index.png" width=500/>

#### explain
```sql
mysql> EXPLAIN SELECT city,name,age FROM t FORCE INDEX(city_user) WHERE city='杭州' ORDER BY name LIMIT 1000\G;
*************************** 1. row ***************************
           id: 1
  select_type: SIMPLE
        table: t
   partitions: NULL
         type: ref
possible_keys: city_user
          key: city_user
      key_len: 50
          ref: const
         rows: 4000
     filtered: 100.00
        Extra: Using index condition
```
1. `Extra`里面已经移除了`Using filesort`，说明MySQL**不需要排序**操作了
2. 联合索引`city_user`本身就是**有序**的，因此无需将4000行都扫描一遍，只需要扫描满足条件的前**1000**条记录即可
3. `Using index condition`：表示使用了**索引下推**

#### 执行过程
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-order-by-combine-index-process.jpg" width=500/>
1. 从**city_user索引树**找到第一个满足city='杭州'的主键ID，即ID_X
2. 然后拿着ID_X**回表**取出整行，取`city`、`name`和`age`三个字段的值，作为结果集的一部分**直接返回给客户端**
3. 继续取**city_user索引树**的下一条记录，重复上述步骤，直到查到1000条记录或者不满足city='杭州'时结束循环
4. 这个过程**不需要排序**（当然也不需要外部排序用到的**临时文件**）

#### 观察指标

##### 慢查询日志
`Rows_examined`为1000，`Query_time`为上面全字段排序（内部排序）的情况耗时的**49%**
```sql
278 # Time: 2019-02-10T09:00:28.956622Z
279 # User@Host: root[root] @ localhost []  Id:     8
280 # Query_time: 0.003652  Lock_time: 0.000569 Rows_sent: 1000  Rows_examined: 1000
281 SET timestamp=1549789228;
282 SELECT city,name,age FROM t FORCE INDEX(city_user) WHERE city='杭州' ORDER BY name LIMIT 1000;
```

##### 扫描行数
```sql
mysql> SELECT @b-@a;
+-------+
| @b-@a |
+-------+
|  1000 |
+-------+
```

### 覆盖索引
覆盖索引：索引上的信息**足够满足查询需求**，**无需再回表**，但维护索引是有代价的，需要权衡
```sql
ALTER TABLE t ADD INDEX city_user_age(city, name, age);
```

#### explain
`Using index`：表示使用**覆盖索引**
```sql
mysql> EXPLAIN SELECT city,name,age FROM t FORCE INDEX(city_user_age) WHERE city='杭州' ORDER BY name LIMIT 1000\G;
*************************** 1. row ***************************
           id: 1
  select_type: SIMPLE
        table: t
   partitions: NULL
         type: ref
possible_keys: city_user_age
          key: city_user_age
      key_len: 50
          ref: const
         rows: 4000
     filtered: 100.00
        Extra: Using where; Using index
```

#### 执行过程
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-order-by-coverage-index-process.jpg" width=500/>
1. 从**city_user_age索引树**找到第一个满足city='杭州'的记录
    - 直接取出`city`、`name`和`age`这三个字段的值，作为结果集的一部分**直接返回给客户端**
2. 继续取**city_user_age索引树**的下一条记录，重复上述步骤，直到查到1000条记录或者不满足city='杭州'时结束循环

#### 观察指标

##### 慢查询日志
`Rows_examined`同样为1000，`Query_time`为上面使用联合索引`city_user`耗时的**49%**
```sql
# Time: 2019-02-10T09:16:20.911513Z
# User@Host: root[root] @ localhost []  Id:     8
# Query_time: 0.001800  Lock_time: 0.000366 Rows_sent: 1000  Rows_examined: 1000
SET timestamp=1549790180;
SELECT city,name,age FROM t FORCE INDEX(city_user_age) WHERE city='杭州' ORDER BY name LIMIT 1000;
```

##### 扫描行数
```sql
mysql> SELECT @b-@a;
+-------+
| @b-@a |
+-------+
|  1000 |
+-------+
```

## in语句优化
假设已有联合索引city_user(city,name)，查询语句如下
```sql
SELECT * FROM t WHERE city IN ('杭州','苏州') ORDER BY name LIMIT 100;
```
单个city内部，name是递增的，但在匹配多个city时，name就不能保证是递增的，因此这个SQL语句**需要排序**

### explain
依然有`Using filesort`
```sql
mysql> EXPLAIN SELECT * FROM t FORCE INDEX(city_user) WHERE city IN ('杭州','苏州') ORDER BY name LIMIT 100\G
*************************** 1. row ***************************
           id: 1
  select_type: SIMPLE
        table: t
   partitions: NULL
         type: range
possible_keys: city_user
          key: city_user
      key_len: 50
          ref: NULL
         rows: 4001
     filtered: 100.00
        Extra: Using index condition; Using filesort

mysql> EXPLAIN SELECT * FROM t FORCE INDEX(city_user) WHERE city IN ('杭州') ORDER BY name LIMIT 100\G
*************************** 1. row ***************************
           id: 1
  select_type: SIMPLE
        table: t
   partitions: NULL
         type: ref
possible_keys: city_user
          key: city_user
      key_len: 50
          ref: const
         rows: 4000
     filtered: 100.00
        Extra: Using index condition
```

### 解决方案
1. _**拆分语句，包装在同一个事务**_
2. `SELECT * FROM t WHERE city='杭州' ORDER BY name LIMIT 100;`：不需要排序，客户端用一个**内存数组A**保存结果
3. `SELECT * FROM t WHERE city='苏州' ORDER BY name LIMIT 100;`：不需要排序，客户端用一个**内存数组B**保存结果
4. 内存数组A和内存数组B**均为有序数组**，可以采用**内存中的归并排序**

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
