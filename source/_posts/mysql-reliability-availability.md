---
title: MySQL -- 主从复制的可靠性与可用性
date: 2019-02-24 14:44:52
categories:
    - MySQL
tags:
    - MySQL
---

## Master-Master 主从切换
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-master-master-switch.png" width=500/>


<!-- more -->

## 同步延时
1. 主库A执行完成一个事务，**写入binlog**，记为`T1`
2. 然后传给从库B，从库B**接收该binlog**，记为`T2`
3. 从库B执行完成这个事务，记为`T3`
4. 同步延时：`T3-T1`
    - 同一个事务，在**从库执行完成的时间**和**主库执行完成的时间**之间的差值
    - `SHOW SLAVE STATUS`中的`Seconds_Behind_Master`

<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-ha-sbm.png" width=1000/>


### Seconds_Behind_Master
1. 计算方法
    - 每个事务的`binlog`里面都有一个**时间字段**，用于记录该`binlog`在**主库**上的写入时间
    - 从库取出当前正在执行的事务的时间字段的值，计算它与当前系统时间点差值，得到`Seconds_Behind_Master`
    - 即`T3-T1`
2. 如果主库与从库的时间不一致，`Seconds_Behind_Master`会不会有误差？
    - **一般不会**
    - 在**从库连接到主库**时，会通过`SELECT UNIX_TIMESTAMP()`获取**当前主库的系统时间**
    - 如果**从库**发现**当前主库的系统时间**与自己的不一致，在计算`Seconds_Behind_Master`会**自动扣除**这部分差值
    - 但建立连接后，主库或从库又修改了系统时间，依然会不准确
3. 在**网络正常**的情况下，`T2-T1`通常会非常小，此时同步延时的主要来源是**`T3-T2`**
    - _**从库消费`relaylog`的速度跟不上主库生成`binlog`的速度**_

### 延时来源
1. 从库所在**机器的性能**要弱于主库所在的机器
    - **更新请求对于IPOS的压力**，在**主库**和**从库**上是**无差别**的
2. **非对称部署**：20个主库放在4个机器上，但所有从库放在一个机器上
    - 主从之间可能会**随时切换**，现在一般都会采用**相同规格的机器**+**对称部署**
3. **从库压力大**
    - 常见场景：管理后台的查询语句
    - 从库上的查询耗费大量的**CPU资源**和**IO资源**，影响了同步速度，造成了**同步延时**
    - 解决方案
        - **一主多从**，分担读压力，一般都会采用
        - 通过`binlog`输出到**外部系统**，例如Hadoop
4. **大事务**
    - 主库上必须等待**事务执行完成**后才会写入`binlog`，再传给从库
    - 常见场景1：**一次性删除太多数据**（如归档的历史数据）
        - 解决方案：控制每个事务删除的数据量，分多次删除
    - 常见场景2：**大表DDL**
        - 解决方案：`gh-ost`
5. 从库的**并行复制能力**（后续展开）

## 切换策略

### 可靠性优先
切换过程一般由专门的`HA`系统完成，存在**不可用时间**（主库A和从库B都处于**只读**状态）
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-ha-reliability-first.png" width=500/>

1. 判断**从库B**的`Seconds_Behind_Master`值，当**小于**某个值（例如5）才继续下一步
2. 把**主库A**改为**只读**状态（`readonly=true`）
3. 等待**从库B**的`Seconds_Behind_Master`值降为`0`
4. 把**从库B**改为**可读写**状态（`readonly=false`）
5. 把**业务请求**切换至**从库B**

### 可用性优先
不等主从同步完成，**直接把业务请求切换至从库B**，并且让**从库B可读写**，这样几乎不存在不可用时间，但可能会**数据不一致**

#### 表初始化
```sql
CREATE TABLE `t` (
  `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `c` INT(11) UNSIGNED DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

INSERT INTO t (c) VALUES (1),(2),(3);
```

#### 插入数据
```sql
INSERT INTO t (c) VALUES (4);
-- 主库上的其它表有大量的更新，导致同步延时为5S，插入c=4后发起了主从切换
INSERT INTO t (c) VALUES (5);
```

#### MIXED
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-ha-availability-first-mixed.png" width=800/>

1. 主库A执行完`INSERT c=4`，得到`(4,4)`，然后开始执行**主从切换**
2. 主从之间有5S的同步延迟，从库B会先执行`INSERT c=5`，得到`(4,5)`，并且会把这个`binlog`发给主库A
3. 从库B执行主库A传过来的`INSERT c=4`，得到`(5,4)`
4. 主库A执行从库B传过来的`INSERT c=5`，得到`(5,5)`
5. 此时主库A和从库B会有**两行**不一致的数据

#### ROW
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-ha-availability-first-row.png" width=800/>

1. 采用`ROW`格式的`binlog`时，会记录新插入行的**所有字段的值**，所以最后只会有**一行**数据不一致
2. 主库A和从库B的同步线程都会**报错并停止**：`duplicate key error`

### 小结
1. 使用`ROW`格式的`binlog`，数据不一致的问题**更容易发现**，采用`MIXED`或`STATEMENT`格式的`binlog`，数据可能悄悄地不一致
2. 主从切换采用**可用性优先**策略，可能会导致**数据不一致**，大多数情况下，优先选择**可靠性优先**策略
3. 在满足**数据可靠性**的前提下，MySQL的**可用性**依赖于**同步延时**的大小（**同步延时越小**，**可用性越高**）

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
