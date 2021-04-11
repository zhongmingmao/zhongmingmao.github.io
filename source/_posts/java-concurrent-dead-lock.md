---
title: Java并发 -- 死锁
date: 2019-04-21 10:09:39
categories:
    - Java
    - Concurrent
tags:
    - Java
    - Java Concurrent
---

## Account.class
1. 在《Java并发 -- 互斥锁》中，使用了Account.class作为**互斥锁**来解决银行业务的转账问题
2. 虽然不存在并发问题，但所有账户的转账操作都是**串行**的，**性能太差**
    - 例如账户A给账户B转账，账户C给账户D转账，在现实世界中是可以并行的，但该方案中只能串行

<!-- more -->

## 账户和账本
1. 每个账户都对应一个**账本**，账本统一存放在**文件架**上
2. 银行柜员进行转账操作时，需要到文件架上取出转出账本和转入账本，然后转账操作，会遇到三种情况
    - 如果文件架上有转出账本和转入账本，都同时拿走
    - 如果文件架上只有转出账本或只有转入账本，那需要等待那个缺失的账本
    - 如果文件架上没有转出账本和转入账本，那需要等待两个账本

## 两把锁
```java
public class Account {
    // 账户余额
    private int balance;

    // 转账
    public void transfer(Account target, int amt) {
        // 锁定转出账户
        synchronized (this) { // 1
            // 锁定转入账户
            synchronized (target) { // 2
                if (balance > amt) {
                    balance -= amt;
                    target.balance += amt;
                }
            }
        }
    }
}
```
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-deadlock-two-lock.png" width=1000/>


### 死锁
1. 两把锁是**细粒度锁**的方案，使用细粒度锁可以**提高并发度**，是**性能优化**的一个重要手段，但可能会导致**死锁**
2. 死锁：_**一组相互竞争资源的线程因互相等待，导致永久阻塞的现象**_
3. 场景
    - 假设线程T1执行账户A给账户B转账的操作，同时线程T2执行账户B给账户A转账的操作
        - 即A.transfer(B)，B.transfer(A)
    - 当T1和T2同时执行完1处的代码，此时，T1获得了账户A的锁，T2获得了账户B的锁
    - 之后T1和T2在执行2处的代码时
        - T1试图获取账户B的锁，发现账户B已经被锁定，T1等待
        - T2试图获取账户A的锁，发现账户A已经被锁定，T2等待
        - T1和T2会无限期地等待，形成死锁

### 规避死锁
1. 并发程序一旦死锁，一般只能**重启应用**，解决死锁问题最好的办法是_**规避死锁**_
2. 死锁发生的条件
    - **互斥**：共享资源X和共享资源Y只能被一个线程占用
    - **占有且等待**：线程T1占有共享资源X，在等待共享资源Y的时候，不会释放共享资源X
    - **不可抢占**：其他线程不能强行抢占线程已经占有的共享资源
    - **循环等待**：线程T1等待线程T2占有的资源，线程T2等待线程T1占有的资源
3. 规避死锁的思路：破坏死锁发生的条件
    - **互斥**：无法破坏，因为用锁的目的就是为了互斥
    - **占有且等待**：一次性申请**所有**的共享资源，不存在等待
    - **不可抢占**：占有部分共享资源的线程进一步申请其他共享资源时，如果申请不到，可以**主动释放**它所占用的共享资源
    - **循环等待**：按序申请共享资源（共享资源是有**线性顺序**的）

#### 破坏 -- 占有且等待

##### Allocator
```java
public class Allocator {

    private static class Holder {
        private static Allocator allocator = new Allocator();
    }

    public static Allocator getInstance() {
        return Holder.allocator;
    }

    private Allocator() {
    }

    private List<Object> als = new ArrayList<>();

    // 一次性申请所有资源
    public synchronized boolean apply(Object from, Object to) {
        if (als.contains(from) || als.contains(to)) {
            return false;
        } else {
            als.add(from);
            als.add(to);
            return true;
        }
    }

    // 归还资源
    public synchronized void free(Object from, Object to) {
        als.remove(from);
        als.remove(to);
    }
}
```

##### Account
```java
public class Account {
    // 必须是单例，因为要分配和释放资源
    private Allocator allocator = Allocator.getInstance();
    // 账户余额
    private int balance;

    // 转账
    public void transfer(Account target, int amt) {
        // 一次性申请转出账户和转入账户，直至成功
        while (!allocator.apply(this, target)) {
        }

        try {
            // 锁定转出账户
            synchronized (this) {
                // 锁定转入账户
                synchronized (target) {
                    if (balance > amt) {
                        balance -= amt;
                        target.balance += amt;
                    }
                }
            }
        } finally {
            allocator.free(this, target);
        }
    }
}
```

#### 破坏 -- 不可抢占
1. 破坏不可抢占条件的核心是**主动释放**它所占有的共享资源，这一点synchronized是做不到的
2. synchronized在申请资源的时候，如果申请不到，线程直接进入**阻塞**状态，并不会释放已占有的共享资源
3. Java在语言层次并没有解决该问题，但在**SDK层面**解决了（JUC提供的LOCK）

#### 破坏 -- 循环等待
比破坏占有且等待条件的成本低
```java
public class Account {
    // 资源有线性顺序
    private int id;
    // 账户余额
    private int balance;

    // 转账
    public void transfer(Account target, int amt) {
        Account left = this;
        Account right = target;
        if (this.id > target.id) {
            left = target;
            right = this;
        }

        // 锁定序号小的账号
        synchronized (left) {
            // 锁定序号大的账号
            synchronized (right) {
                if (balance > amt) {
                    balance -= amt;
                    target.balance += amt;
                }
            }
        }
    }
}
```

<!-- indicate-the-source -->

## 参考资料
[Java并发编程实战](https://time.geekbang.org/column/intro/100023901)