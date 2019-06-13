---
title: MySQL -- 数据恢复
date: 2019-03-04 19:08:34
categories:
    - MySQL
tags:
    - MySQL
---

## DELETE
1. 使用`DELETE`语句误删除了**数据行**，可以使用`Flashback`通过闪回把数据恢复
2. `Flashback`恢复数据的原理：修改`binlog`的内容，然后拿到**原库重放**
    - 前提：`binlog_format=ROW`和`binlog_row_image=FULL`
3. 针对单个事务
    - 对于`INSERT`语句，将`Write_rows event`改成`Delete_rows event`
    - 对于`DELETE`语句，将`Delete_rows event`改成`Write_rows event`
    - 对于`UPDATE`语句，`binlog`里面记录了数据行修改前和修改后的值，**对调两行的位置即可**
4. 针对多个事务
    - 误操作
        - (A)DELETE
        - (B)INSERT
        - (C)UPDTAE
    - Flashback
        - (REVERSE C)UPDATE
        - (REVERSE B)DELETE
        - (REVERSE A)INSERT
5. 不推荐直接在**主库**上执行上述操作，避免造成**二次破坏**
    - 比较安全的做法是先恢复出一个备份或找一个从库作为**临时库**
    - 在临时库上执行上述操作，然后再将**确认过**的临时库的数据，恢复到主库
6. 预防措施
    - `sql_safe_updates=ON`，下列情况会报错
        - 没有`WHERE`条件的`DELETE`或`UPDATE`语句
        - `WHERE`条件里面**没有包含索引字段的值**
    - 上线前，必须进行**SQL审计**
7. 删全表的性能
    - `DELETE`全表**很慢**，因为需要生成`undolog`、写`redolog`和写`binlog`
    - 优先考虑使用`DROP TABLE`或`TRUNCATE TABLE`

<!-- more -->

## DROP / TRUNCATE
1. `DROP TABLE`、`TRUNCATE TABLE`和`DROP DATABASE`，是无法通过`Flashback`来恢复的
    - 即使配置了`binlog_format=ROW`，执行上面3个命令，`binlog`里面记录的依然是`STATEMENT`格式
    - `binlog`里面只有一个`TRUNCATE/DROP`语句，这些信息是无法恢复数据的
2. 这种情况如果想要恢复数据，需要使用**全量备份**和**增量日志**的方式
    - 要求线上**定期全量备份**，并且**实时备份`binlog`**

### mysqlbinlog
假设有人中午12点删除了一个库，恢复数据的流程
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-data-recovery-mysqlbinlog.png" width=500/>

1. 取最近一次全量备份，假设一天一备，即当天0点的全量备份
2. 用全量备份恢复出一个临时库
3. 从`binlog`备份里，取出凌晨0点以后的日志
4. 把这些日志，**除误删数据的语句外**，全部应用到临时库
5. 为了**加快数据恢复**，如果临时库上有多个数据库，可以加上`--database`参数，指定应用某个库的日志
6. 跳过12点误操作语句的`binlog`
    - 如果原实例没有使用`GTID`模式，只能在应用到包含12点的`binlog`文件的时候
        - 先用`--stop-position`参数执行到**误操作之前**的日志
        - 再用`--start-position`从**误操作之后**的日志继续执行
    - 如果原实例使用`GTID`模式，假设误操作命令的`GTID`为`gtid1`
        - 只需执行`SET gtid_next=gtid1;BEGIN;COMMIT;`
        - 把`gtid1`加入到临时库的`GTID`集合，之后按顺序执行`binlog`时，会**自动跳过**误操作的语句
7. 使用`mysqlbinlog`的方法恢复数据的速度**还是不够快**，主要原因
    - 如果**误删表**，最好是**只重放这张表的操作**，但`mysqlbinlog`并不能指定只解析一个表的日志
    - 用`mysqlbinlog`解析出日志来应用，应用日志的过程只能是**单线程**的
8. 另外一个加速的方法：`Master-Slave`

### Master-Slave
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-data-recovery-master-slave.png" width=500/>

1. 在`START SLAVE`之前，先通过执行`CHANGE REPLICATION FILTER REPLICATE_DO_TABLE=(tbl_name)`
    - 让临时库**只同步误操作的表**，利用**并行复制**技术，来加速整个数据恢复过程
2. `binlog`备份到线上备库之间是一条**虚线**
    - 虚线指的是如果由于时间太久，线上备库有可能已经删除了临时实例所需要的`binlog`
        - 可以从`binlog`备份系统中找到需要的`binlog`，再放到备库中
    - 举例说明
        - 例如当前临时实例需要的`binlog`是从`master.000005`开始
        - 但在线上备库上执行`SHOW BINARY LOGS`显示最小的`binlog`文件是`master.000007`
        - 意味着少了两个`binlog`文件
        - 这时需要到`binlog`备份系统找到这两个文件，把之前删掉的`binlog`放回备库执行以下步骤
        - 从备份系统下载`master.000005`和`master.000006`，放到备库的日志目录下
        - 打开`master.index`，在文件头加入两行：`./master.000005`和`./master.000006`
        - 重启备库，目的是为了让备库**重新识别**这两个日志文件
        - 现在备库上就有了临时实例所需要的所有`binlog`，建立主备关系，就可以正常同步了

### 延迟复制备库
1. 上面`Master-Slave`的方案利用了**并行复制**来加速数据恢复的过程，但**恢复时间不可控**
    - 如果一个库特别大，或者误操作的时间距离上一个全量备份的时间较长（一周一备）
2. 针对核心业务，**不允许太长的恢复时间**，可以搭建**延迟复制的备库**（MySQL 5.6引入）
3. 延迟复制的备库是一种特殊的备库
    - 通过`CHANGE MASTER TO MASTER_DELAY=N`命令来指定备库持续与主库有N秒的延迟
    - 假设N=3600，如果能在一小时内发现误删除命令，这个误删除的命令尚未在延迟复制的备库上执行
    - 这时在这个备库上执行`STOP SLAVE`，再通过前面的方法，跳过误删除命令，就可以恢复数据
    - 这样，可以得到一个恢复时间可控（最多1小时）的备库

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
