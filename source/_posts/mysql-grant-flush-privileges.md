---
title: MySQL -- 权限
date: 2019-03-17 14:30:42
categories:
    - Storage
    - MySQL
tags:
    - Storage
    - MySQL
---

## 创建用户
```sql
CREATE USER 'ua'@'%' IDENTIFIED BY 'pa';
```
1. 用户名+地址才表示一个用户，`ua@ip1`和`ua@ip2`代表的是两个不同的用户
2. 在磁盘上，往`mysql.user`表里插入一行，由于没有指定权限，所有表示权限的字段都是N
3. 在内存里，往数组`acl_users`里插入一个`acl_user`对象，该对象的`access`字段的值为0

<!-- more -->

```sql
mysql> SELECT * FROM mysql.user WHERE user = 'ua'\G;
*************************** 1. row ***************************
                  Host: %
                  User: ua
           Select_priv: N
           Insert_priv: N
           Update_priv: N
           Delete_priv: N
           Create_priv: N
             Drop_priv: N
           Reload_priv: N
         Shutdown_priv: N
          Process_priv: N
             File_priv: N
            Grant_priv: N
       References_priv: N
            Index_priv: N
            Alter_priv: N
          Show_db_priv: N
            Super_priv: N
 Create_tmp_table_priv: N
      Lock_tables_priv: N
          Execute_priv: N
       Repl_slave_priv: N
      Repl_client_priv: N
      Create_view_priv: N
        Show_view_priv: N
   Create_routine_priv: N
    Alter_routine_priv: N
      Create_user_priv: N
            Event_priv: N
          Trigger_priv: N
Create_tablespace_priv: N
              ssl_type:
            ssl_cipher:
           x509_issuer:
          x509_subject:
         max_questions: 0
           max_updates: 0
       max_connections: 0
  max_user_connections: 0
                plugin: caching_sha2_password
      password_expired: N
 password_last_changed: 2019-03-17 14:33:56
     password_lifetime: NULL
        account_locked: N
      Create_role_priv: N
        Drop_role_priv: N
Password_reuse_history: NULL
   Password_reuse_time: NULL
```

## 权限范围

### 全局权限
作用于整个MySQL实例，权限信息保存在`mysql.user`，要给用户ua赋一个最高权限的语句如下
```sql
GRANT ALL PRIVILEGES ON *.* to 'ua'@'%' WITH GRANT OPTION;
```
1. 在磁盘上，将`mysql.user`表里的用户`'ua'@'%'`这一行中所有表示权限的字段都修改为Y
2. 在内存里，从数组`acl_users`中找到这个用户对应的对象，将`access`值（**权限位**）修改为二进制的全1
3. 这个`GRANT`命令执行完成后，如果有新的客户端使用用户ua登录成功
    - MySQL会为**新连接**维护一个**线程对象**
    - 然后从`acl_users`数组里查到用户ua的权限，并**将权限值拷贝到这个线程对象**中
    - 之后在这个连接中执行的语句，所有关于全局权限的判断，都直接使用线程对象内部保存的权限位
4. `GRANT`命令对于全局权限，同时更新了磁盘和内存，命令完成后**即时生效**
    - 接下来新创建的连接会使用新的权限
    - 对于一个**已经存在的连接**，它的**全局权限不受影响**（因为判断时采用的是线程对象内部的权限值）

#### 回收权限
```sql
REVOKE ALL PRIVILEGES ON *.* FROM 'ua'@'%';
```
1. 在磁盘上，将`mysql.user`表里的用户`'ua'@'%'`这一行中所有表示权限的字段都修改为N
2. 在内存里，从数组`acl_users`中找到这个用户对应的`acl_user`对象，将`access`的值修改为0

### DB权限
让用户`'ua'@'%'`拥有库db1的所有权限
```sql
GRANT ALL PRIVILEGES ON db1.* to 'ua'@'%' WITH GRANT OPTION;
```
1. 基于库的权限记录保存在`mysql.db`中，在内存里则保存在数组`acl_dbs`中
2. 在磁盘上，往`mysql.db`表中插入一行记录，所有权限位的字段设置为Y
3. 在内存中，增加一个对象到数组`acl_dbs`，该对象的权限位为全1
4. 每次需要判断一个用户对一个数据库读写权限的时候，都需要遍历一遍`acl_dbs`数组（多线程共享）
    - 根据`user`、`host`和`db`找到匹配的对象，然后根据对象的权限位来判断
5. `GRANT`命令对于**已经存在的连接**的影响，全局权限和基于DB的权限是不一样的
    - 全局权限：**线程私有**
    - 基于DB的权限：**线程共享**

```sql
mysql> SELECT * FROM mysql.db WHERE user = 'ua'\G;
*************************** 1. row ***************************
                 Host: %
                   Db: db1
                 User: ua
          Select_priv: Y
          Insert_priv: Y
          Update_priv: Y
          Delete_priv: Y
          Create_priv: Y
            Drop_priv: Y
           Grant_priv: Y
      References_priv: Y
           Index_priv: Y
           Alter_priv: Y
Create_tmp_table_priv: Y
     Lock_tables_priv: Y
     Create_view_priv: Y
       Show_view_priv: Y
  Create_routine_priv: Y
   Alter_routine_priv: Y
         Execute_priv: Y
           Event_priv: Y
         Trigger_priv: Y
```

#### 操作序列
| 时刻 | session A | session B | session C |
| ---- | ---- | ---- | ---- |
| T1 | CONNECT(root,root);<br/>CREATE DATABASE db1;<br>CREATE USER 'ua'@'%' IDENTIFIED BY 'pa';<br/>GRANT SUPER ON \*.\* TO 'ua'@'%';<br/>GRANT ALL PRIVILEGES ON db1.\* TO 'ua'@'%'; | | |
| T2 | | CONNECT(ua,pa)<br/>SET GLOBAL sync_binlog=1;<br/>(Query OK)<br/>CREATE TABLE db1.t(c INT);<br>(Query OK) | CONNECT(ua,pa)<br/>USE db1; |
| T3 | REVOKE SUPER ON \*.\* FROM 'ua'@'%'; | | |
| T4 | | SET GLOBAL sync_binlog=1;<br/>(Query OK)<br/>ALTER TABLE db1.t ENGINE=InnoDB;<br>(Query OK) | ALTER TABLE t ENGINE=InnoDB;<br/>(Query OK) |
| T5 | REVOKE ALL PRIVILEGES ON db1.\* FROM 'ua'@'%'; | | |
| T6 | | SET GLOBAL sync_binlog=1;<br/>(Query OK)<br/>ALTER TABLE db1.t ENGINE=InnoDB;<br/>(ALTER command denied) | ALTER TABLE t ENGINE=InnoDB;(Query OK) |

1. `SET GLOBAL sync_binlog=1;`这个操作需要`SUPER`权限
2. 虽然用户ua的`SUPER`权限在T3时刻被回收了，但在T4时刻执行`SET GLOBAL`的时候，权限验证还是通过了
    - 这是因为`SUPER`是全局权限，这个信息在**线程对象**中，而`REVOKE`操作影响不了线程对象
3. 在T4时刻去掉用户ua对db1库的所有权限后，session B在T6时刻再操作db1的表时，就会报**权限不足**
    - 这是因为`acl_dbs`是一个**全局数组**，所有线程判断db权限都会用该数组
    - 因此`REVOKE`操作会立马影响到session
4. 特殊逻辑
    - 如果当前会话已经在某个db里面，之前use这个db时拿到的库权限就会保存在**会话变量**中
    - session C在T2执行了`USE db1`，拿到这个库的权限，在切换出db1之前，一直对db1有权限


### 表权限和列权限
```sql
CREATE TABLE db1.t1(id INT, a INT);
GRANT ALL PRIVILEGES ON db1.t1 TO 'ua'@'%' WITH GRANT OPTION;
GRANT SELECT(id), INSERT(id,a) ON db1.t1 TO 'ua'@'%' WITH GRANT OPTION;
```
1. 表权限定义在表`mysql.tables_priv`，列权限定义在表`mysql.columns_priv`
    - 这两类权限组合起来存放在**内存的hash结构**：`column_priv_hash`
2. 跟DB权限类似，这两个权限在每次`GRANT`的时候都会修改数据表，也会同步修改内存的hash结构
3. 因此这两类权限的操作，也会立马影响到**已经存在的连接**

## FLUSH PRIVILEGES
1. `FLUSH PRIVILEGES`命令会清空`acl_users`数组（_**全局权限**_）
    - 然后从`mysql.user`表中读取数据重新加载，重新构造一个`acl_users`数组
    - 以数据表中的数据为准，会将**全局权限**的内存数组重新加载一遍
2. 同样的，对于**DB权限**、**表权限和列权限**，MySQL也做了同样的处理
3. 如果**内存的权限数据**和**磁盘数据表的权限数据**相同的话，不需要执行`FLUSH PRIVILEGES`
    - 如果都是用`GRANT/REVOKE`语句执行的话，内存和数据表的数据应该保持**同步更新**的
    - 正常情况下，在执行`GRANT`命令之后，没有必要跟着执行`FLUSH PRIVILEGES`命令

### 使用场景
1. 当数据表的权限数据与内存中的权限数据**不一致**，通过`FLUSH PRIVILEGES`来**重建内存数据**，达到一致状态
2. 这种不一致的状态往往由于**不规范的操作**导致的，例如直接用DML语句操作系统权限表

### 不规范操作1
| 时刻 | client A | client B |
| ---- | ---- | ---- |
| T1 | CONNECT(root,root)<br/>CREATE USER 'ua'@'%' IDENTIFIED BY 'pa'; | |
| T2 | | CONNECT(ua,pa)<br/>(Connect OK)<br>DISCONNECT |
| T3 | DELETE FROM mysql.user WHERE user='ua'; | |
| T4 | | CONNECT(ua,pa)<br/>(Connect OK)<br>DISCONNECT |
| T5 | FLUSH PRIVILEGES; | |
| T6 | | CONNECT(ua,pa)<br/>(Access Denied) |

1. T3时刻虽然使用了`DELETE`语句删除了用户ua，但在T4时刻，仍然可以用用户ua连接成功
    - 因为内存中`acl_users`数组中还有这个用户，系统判断时认为用户还正常存在的
2. T5时刻执行过`FLUSH PRIVILEGES`命令后，内存更新，T6时刻就会报`Access Denied`错误
3. 直接操作系统权限表是很不规范的操作

### 不规范操作2
| 时刻 | client A |
| ---- | ---- |
| T1 | CONNECT(root,root)<br/>CREATE USER 'ua'@'%' IDENTIFIED BY 'pa'; |
| T2 | DELETE FROM mysql.user WHERE user='ua'; |
| T3 | GRANT SUPER ON \*.\* TO 'ua'@'%' WITH GRANT OPTION;<br/>(ERROR 1133 (42000): Can't find any matching row in the user table) |
| T4 | CREATE USER 'ua'@'%' IDENTIFIED BY 'pa';<br/>(ERROR 1396 (HY000): Operation CREATE USER failed for 'ua'@'%') |

1. 在T2时刻直接删除了数据表的记录，而内存的数据还存在
2. T3时刻给用户ua赋权限失败，因为`mysql.user`表找不到这行记录
3. T4时刻也无法重新创建用户ua，因为在内存判断的时候，会认为这个用户还存在

## 参考资料
《MySQL实战45讲》

<!-- indicate-the-source -->
