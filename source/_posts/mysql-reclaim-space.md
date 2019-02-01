---
title: MySQL -- 空间回收
date: 2019-02-01 15:03:51
categories:
    - MySQL
tags:
    - MySQL
---

## InnoDB的物理存储
1. InnoDB表的组成：**表结构（frm）**+**数据（ibd）**
    - MySQL 8.0开始，允许将**表结构定义**（**占用空间很小**）放在**系统数据表**中
2. 控制参数`innodb_file_per_table`
    - ON：每个InnoDB表数据存储在一个以**.ibd**为后缀的文件中，**推荐**
        - 更容易管理，`DROP TABLE`会直接删除这个文件
    - OFF：InnoDB表数据存储在**共享表空间**
        - `DROP TABLE`，空间也是不会回收的

<!-- more -->

```sql
mysql> SHOW VARIABLES LIKE '%innodb_file_per_table%';
+-----------------------+-------+
| Variable_name         | Value |
+-----------------------+-------+
| innodb_file_per_table | ON    |
+-----------------------+-------+
```

## 文件空洞
空洞：**可以被复用但没有被使用的空间**，经过大量**增删改**的表，都会存在空洞

### 删除
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-reclaim-index.png" width=500/>
1. 如果删掉`R4`，InnoDB只会将`R4`**标记为删除**，如果再插入**300~600**的记录时，可能会**复用**这个位置，但磁盘文件不会缩小
    - **记录的复用**，仅限于**符合范围**条件的数据
2. 如果删除了**一个数据页上的所有记录**，那么**整个数据页**都可以被**复用**的
    - 当**整个页**从B+树里摘除后，可以被复用到**任何位置**
    - 如果将`page A`上的所有记录删除后，`page A`会被**标记为可复用**
        - 当插入ID=50的记录时，需要**申请新页**时`page A`可以被复用
3. 如果**相邻**的两个数据页**利用率**都很小
    - 系统会把这两个数据页上的数据**合并**到其中一个页上，另一个数据页就会被标记为**可复用**
4. 如果通过`DELETE`命令**删除整个表**，那么**所有的数据页**都会被**标记为可复用**，但磁盘上的文件同样不会变小
5. **`TRUNCATE` = `DROP` + `CREATE`**

### 插入
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-reclaim-insert.png" width=500/>
1. 如果数据是**随机插入**的，就有可能造成**索引的数据页分裂**
2. `page A`已满，如果再插入ID=550的数据，就必须申请一个新的页面`page B`来保存数据，导致**页分裂**，留下了空洞

### 更新
更新**索引**上的值，等同于**先逻辑删除旧值后再插入新值**，同样也会造成**空洞**

## 重建表

### 逻辑过程
1. 新建一个与表A**结构相同**的表B
2. 按照**主键递增**的顺序，把表A中的数据一行一行读出，然后再插入表B
    - 表B的主键索引更**紧凑**，数据页的**利用率**也更高
3. 表B作为**临时表**，数据从表A导入到表B，然后用表B替换A

### 重建命令
```sql
ALTER TABLE A ENGINE=InnoDB;
```
`ALTER TABLE`默认会**提交前面的事务**

#### Before MySQL 5.5
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-reclaim-alter-before-5_5.png" width=500/>
1. 与上述的逻辑过程类似，MySQL**自动完成**转存数据，交换表名和删除旧表等操作
2. 时间消耗最多的是往**临时表**（**Server层**）插入数据的过程，在这个过程中，如果**新数据**要写入表A，就会造成**数据丢失**
3. 因此整个DDL过程中，表A是不能执行DML的，即不是**Online**的
4. MySQL 5.6引入**Online DDL**

#### Since MySQL 5.6
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-reclaim-alter-online-ddl.png" width=500/>
1. 建立一个**临时文件**（**InnoDB内部**），扫描表A主键的所有数据页
2. 用数据页中表A的记录生成B+树，存储到临时文件
3. state 2（**日志**）：生成临时文件的过程中，将所有对A的**操作**记录在一个**日志文件**（**row log**）中
4. state 3（**重放**）：临时文件生成后，将日志文件的操作**应用到临时文件**，得到一个**逻辑数据**上与表A相同的数据文件
5. 用最新的临时文件替换表A的数据文件

##### MDL锁
1. `ALTER`语句在**启动**时需要获取**MDL写锁**，但会在**真正拷贝数据之前退化为MDL读锁**
    - MDL读锁**不会阻塞**其他线程对这个表的**DML**，同时又能**阻塞**其他线程对这个表的**DDL**
2. 对一个大表来说，`Online DDL`最耗时的过程是**拷贝数据到临时表**的过程，期间是可以接受DML
    - 相对于整个DDL过程来说，**锁的时间非常短**，对**业务**来说，可以认为是`Online`

### 性能消耗
1. 重建表会**扫描原表数据**和**构建临时文件（或临时表）**
2. 对于大表来说，重建表会**非常消耗IO和CPU资源**
3. 推荐工具：`gh-ost`

## Online + Inplace
1. `tmp_table`是一个**临时表**，在**Server**层创建的
2. `tmp_file`是**临时文件**，在**InnoDB**内部创建的，**整个DDL过程都在InnoDB内部完成**
    - 对于**Server**层来说，并没有把数据挪动到**临时表**，是个原地操作（**Inplace**）
3. **DDL过程如果是Online的，那一定是Inplace的，反之不成立**
    - `ALTER TABLE t ADD FULLTEXT(field_name);`是**Inplace**的，但会阻塞DML（**非Online**）

```sql
ALTER TABLE A ENGINE=InnoDB;
等同于
mysql> ALTER TABLE t ENGINE=InnoDB, ALGORITHM=INPLACE;
Query OK, 0 rows affected (0.68 sec)
Records: 0  Duplicates: 0  Warnings: 0
```
与**Inplace**对应的是**Copy**，强制拷贝表到**Server**层
```sql
mysql> ALTER TABLE t ENGINE=InnoDB, ALGORITHM=COPY;
Query OK, 100000 rows affected (1.46 sec)
Records: 100000  Duplicates: 0  Warnings: 0
```

## ALTER + ANALYZE + OPTIMIZE
1. `ALTER TABLE t ENGINE=InnoDB`：**重建表**
2. `ANALYZE TABLE t`：触发**表索引信息的重新采样统计**
3. `OPTIMIZE TABLE t`：`ALTER` + `ANALYZE`

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
