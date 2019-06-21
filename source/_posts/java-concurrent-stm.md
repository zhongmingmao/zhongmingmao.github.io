---
title: Java并发 -- 软件事务内存
mathjax: false
date: 2019-06-06 23:38:37
categories:
    - Java
    - Concurrent
tags:
    - Java
    - Java Concurrent
    - STM
    - MVCC
---

## STM
1. STM：Software Transactional Memory，软件事务内存，借鉴于数据库的事务管理
2. 传统的数据库事务支持**ACID**，即原子性（A）、一致性（C）、隔离性（I）和持久性（D）
3. STM不支持持久化，即只支持ACI

<!-- more -->

## 数据库事务
数据库保证在并发情况下不会发生死锁，而且还能保证ACID
```java
Connection conn = null;
try{
    // 获取数据库连接
    conn = DriverManager.getConnection();
    // 设置手动提交事务
    conn.setAutoCommit(false);
    // 执行转账SQL
    ...
    // 提交事务
    conn.commit();
} catch (Exception e) {
    // 出现异常回滚事务
    conn.rollback();
}
```

## synchronized转账
```java
@AllArgsConstructor
public class UnsafeAccount {
    private long balance;

    // 转账，存在死锁问题
    public void transfer(UnsafeAccount to, long amt) {
        synchronized (this) {
            synchronized (to) {
                if (this.balance > amt) {
                    this.balance -= amt;
                    to.balance += amt;
                }
            }
        }
    }
}
```

## STM转账
Java语言并不支持STM，可以借助第三方类库来Multiverse实现
```java
public class Account {
    // 余额
    private TxnLong balance;

    public Account(long balance) {
        this.balance = StmUtils.newTxnLong(balance);
    }

    // 转账
    public void transfer(Account to, int amt) {
        // 原子化操作
        StmUtils.atomic(() -> {
            if (this.balance.get() > amt) {
                this.balance.decrement(amt);
                to.balance.increment(amt);
            }
        });
    }
}
```

### MVCC
1. MVCC可以简单地理解为数据库事务在开始的时候，给数据库打一个**快照**，以后所有的读写都是基于这个快照
2. 当提交事务的时候，如果所有读写过的数据在该事务执行期间没有发生过变化，那么可以提交
3. 如果发生了变化，说明该事务与其他事务读写的数据冲突了，那就不能提交了
4. 为了记录数据是否发生了变化，可以给每条数据增加一个版本号，每次成功修改数据都会增加版本号的值
5. 不少STM的实现方案都是基于MVCC，例如Clojure STM

## 小结
1. STM借鉴的是数据库的经验，数据库仅仅存储数据，而编程语言除了共享变量之外，还会执行各种IO操作（很难支持回滚）
2. 因此，STM不是万能的，目前支持STM的编程语言主要是**函数式语言**，因为函数式语言里的数据天生具备**不可变性**
