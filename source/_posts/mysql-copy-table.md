---
title: MySQL -- 拷贝表
date: 2019-03-16 09:28:06
categories:
    - MySQL
tags:
    - MySQL
---

## 初始化
```sql
CREATE DATABASE db1;
USE db1;

CREATE TABLE t(id INT PRIMARY KEY, a INT, b INT, INDEX(a)) ENGINE=InnoDB;
DELIMITER ;;
CREATE PROCEDURE idata()
BEGIN
    DECLARE i INT;
    SET i=1;
    WHILE (i <= 1000) DO
        INSERT INTO t VALUES (i,i,i);
        SET i=i+1;
    END WHILE;
END;;
DELIMITER ;
CALL idata();

CREATE DATABASE db2;
CREATE TABLE db2.t LIKE db1.t;

-- 目标：把db1.t里面a>900的数据导出来，插入到db2.t
```

<!-- more -->

## mysqldump
```
$ mysqldump -uroot --add-locks=0 --no-create-info --single-transaction  --set-gtid-purged=OFF db1 t --where="a>900" --result-file=/tmp/t.sql

# 部分结果
$ cat /tmp/t.sql
INSERT INTO `t` VALUES (901,901,901),(902,902,902),(903,903,903)...(999,999,999),(1000,1000,1000);
```
1. mysqldump命令将数据导出成一组`INSERT`语句，把结果输出到**客户端**的临时文件
2. `--single-transaction`
    - 导出数据时不需要对表db1.t加**表锁**
    - 采用的是`START TRANSACTION WITH CONSISTENT SNAPSHOT`
3. `--add-locks=0`
    - 表示在输出到文件结果里，不增加`LOCK TABLES t WRITE`
4. `--no-create-info`
    - 不需要导出表结构
5. `--set-gtid-purged=OFF`
    - 不输出跟GTID相关的信息
6. `--result-file`
    - 执行**客户端**上输出文件的路径
7. 输出结果中的`INSERT`语句会包含多个value对，为了后续如果使用这个文件写入数据，执行会更快
    - 如果要一个`INSERT`语句只插入一行数据的话，增加参数`--skip-extended-insert`

### 应用到db2
```sql
$ mysql -h$host -P$port -u$user db2 -e "source /client_tmp/t.sql"
```
1. `source`是一个客户端命令，打开文件，默认以**分号**结尾读取一条条的SQL语句
2. 将SQL语句发送到服务端执行，`slowlog`和`binlog`都会记录这些语句

## 导出CSV
```sql
mysql> SYSTEM cat cat /usr/local/etc/my.cnf
cat: cat: No such file or directory
# Default Homebrew MySQL server config
[mysqld]
# Only allow connections from localhost
bind-address = 127.0.0.1
slow_query_log = 1
long_query_time = 0
secure-file-priv = "/tmp"

mysql> SELECT @@secure_file_priv;
+--------------------+
| @@secure_file_priv |
+--------------------+
| /tmp/              |
+--------------------+

mysql> SELECT * FROM db1.t WHERE a>900 INTO OUTFILE '/tmp/t.csv';
Query OK, 100 rows affected (0.01 sec)

mysql> SYSTEM du -sh /tmp/t.csv
4.0K	/tmp/t.csv
```
1. secure-file-priv
    - `secure-file-priv=""`，表示不限制文件生成的位置，不安全
    - `secure-file-priv="/XXX"`，要求生成的文件只能存放在指定的目录或其子目录
    - `secure-file-priv=NULL`，表示禁止在这个MySQL实例上执行`SELECT...INTO OUTFILE`
2. `SELECT...INTO OUTFILE`语句
    - 将结果保存在**服务端**
    - **不会覆盖文件**
    - 原则上一个数据行对应文本文件的一行
    - **不会生成表结构文件**
        - mysqldump提供`--tab`参数，可以同时导出**表结构定义文件**和**csv数据文件**

### LOAD DATA
```sql
LOAD DATA INFILE '/tmp/t.csv' INTO TABLE db2.t;
```
1. 打开文件`/tmp/t.csv`
    - 以制表符`\t`作为**字段间的分隔符**，以换行符`\n`作为**记录间的分隔符**，进行数据读取
2. 启动事务
3. 判断每一行的**字段数**和`db.t`是否相同
    - 如果不相同，则直接报错，**回滚事务**
    - 如果相同，则构造这一行，调用InnoDB引擎的接口，写入到表中
4. 重复步骤3，直到`/tmp/t.csv`整个文件读入完成，**提交事务**

#### 主备同步
`binlog_format=STATEMENT`
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-load-data-replication.jpg" width=800/>

1. 主库执行完成后，将`/tmp/t.csv`文件的内容都**直接写到binlog文件**中
2. 往binlog文件写入
    - `LOAD DATA LOCAL INFILE '/tmp/SQL_LOAD_MB-1-0' INTO TABLE db2.t;`
3. 把binlog传到备库
4. 备库的应用日志线程在执行这个事务日志时
    - 先把binlog中的t.csv文件的内容读出来，写到本地临时目录`/tmp/SQL_LOAD_MB-1-0`
    - 再执行`LOAD DATA LOCAL`语句，往备库的db2.t插入跟主库相同的数据
        - `LOCAL`，表示执行这条命令的**客户端**本地文件（这里的客户端即备库本身）

#### LOCAL
1. `LOAD DATA`
    - 读取的是**服务端**文件，文件必须在`secure_file_priv`指定的目录或其子目录
2. `LOAD DATA LOCAL`
    - 读取的是**客户端**文件，只需要MySQL客户端有**访问这个文件的权限**即可
    - 此时，MySQL客户端会**先把本地文件传给服务端**，然后再执行流程

## 物理拷贝
1. 直接把db1.t的frm文件和ibd文件拷贝到db2目录下，是不行的
    - 因为一个InnoDB表，除了包含这两个物理文件外，还需要**在数据字典中注册**
2. MySQL 5.6引入了**可传输表空间**，可以通过导出+导入表空间的方式，实现物理拷贝表

### 执行步骤
<img src="https://mysql-1253868755.cos.ap-guangzhou.myqcloud.com/mysql-table-physical-copy.jpg" width=800/>

1. 假设在db1库下，复制一个跟表t相同的表r
2. 执行`CREATE TABLE r LIKE t;`，创建一个**相同表结构**的空表
3. 执行`ALTER TABLE r DISCARD TABLESPACE;`，此时`r.ibd`文件会被删除
4. 执行`FLUSH TABLE t FOR EXPORT;`
    - 此时在db1目录下会生成`t.cfg`文件
    - 整个`db1.t`处于**只读**状态，直到执行`UNLOCK TABLES`
5. 在db1目录下执行`cp t.cfg r.cfg`和`cp t.ibd r.ibd`
6. 执行`UNLOCK TABLES;`，此时`t.cfg`文件会被删除
7. 执行`ALTER TABLE r IMPORT TABLESPACE;`
    - 将这个`r.ibd`文件作为表r新的表空间
    - 由于这个文件的内容与`t.ibd`是相同的，因此表r中数据与表t相同
    - 为了让文件里的表空间id和数据字典中的一致，会修改`r.ibd`的表空间id
        - 而**表空间id**存在于**每一个数据页**
        - 如果是一个很大的文件，每个数据页都需要修改，`IMPORT`语句会需要点时间
        - 但相对于逻辑拷贝的方法，`IMPORT`语句的耗时还是非常短的

```sql
mysql> CREATE TABLE r LIKE t;
Query OK, 0 rows affected (0.41 sec)

mysql> SYSTEM ls /usr/local/var/mysql/db1
r.ibd	t.ibd

-- 删除r.ibd
mysql> ALTER TABLE r DISCARD TABLESPACE;
mysql> SYSTEM ls /usr/local/var/mysql/db1
t.ibd

-- 生成t.cfg，t处于只读状态
mysql> FLUSH TABLE t FOR EXPORT;
mysql> SYSTEM ls /usr/local/var/mysql/db1
t.cfg	t.ibd

mysql> UNLOCK TABLES;
Query OK, 0 rows affected (0.00 sec)

mysql> ALTER TABLE r IMPORT TABLESPACE;
Query OK, 0 rows affected (0.23 sec)

mysql> SELECT COUNT(*) from r;
+----------+
| COUNT(*) |
+----------+
|     1000 |
+----------+
```

## 小结
1. **物理拷贝速度最快**，尤其对于大表来说
    - 必须**全表拷贝**
    - 需要**到服务器上拷贝数据**
    - **不支持跨引擎使用**，源表和目标表都是使用InnoDB引擎
2. mysqldump生成包含`INSERT`语句的方法，加上`where`过滤，可以只导出**部分数据**
    - 不支持类似join等复杂的写法
    - 逻辑拷贝，支持**跨引擎**使用
3. `SELECT...INTO OUTFILE`最灵活，支持**所有的SQL语法**
    - **每次只能导出一张表的数据，而且表结构需要另外的语句单独备份**
    - 逻辑拷贝，支持**跨引擎**使用

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
