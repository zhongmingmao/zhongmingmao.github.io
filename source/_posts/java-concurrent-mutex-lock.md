---
title: Java并发 -- 互斥锁
date: 2019-04-17 12:46:35
categories:
    - Java Concurrent
tags:
    - Java Concurrent
---

## 解决什么问题
互斥锁解决了并发程序中的**原子性**问题

<!-- more -->

## 禁止CPU中断
1. 原子性：一个或多个操作在CPU执行的过程中**不被中断**的特性
2. 原子性问题点源头是**线程切换**，而操作系统依赖**CPU中断**来实现线程切换的
3. 单核时代，禁止CPU中断就能禁止线程切换
    - **同一时刻，只有一个线程执行**，禁止CPU中断，意味着操作系统不会重新调度线程，也就禁止了线程切换
    - 获得CPU使用权的线程可以**不间断**地执行
4. 多核时代
    - 同一时刻，有可能有两个线程同时在执行，一个线程执行在CPU1上，一个线程执行在CPU2上
    - 此时禁止CPU中断，只能保证CPU上的线程不间断执行，**但并不能保证同一时刻只有一个线程执行**
5. _**互斥：同一时刻只有一个线程执行**_
    - 如果能保证对**共享变量**的修改是**互斥**的，无论是单核CPU还是多核CPU，都能保证原子性

## 简易锁模型
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-atomic-simple-lock-model.png" width=1000/>
1. 临界区：一段需要**互斥**执行的代码
2. 线程在进入临界区之前，首先尝试加锁lock()
    - 如果成功，则进入临界区，此时该线程只有锁
    - 如果不成功就等待，直到持有锁的线程解锁
3. 持有锁的线程执行完临界区的代码后，执行解锁unlock()

## 锁和资源
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-atomic-improved-lock-model.png" width=1000/>

## synchronized
```java
public class X {
    // 修饰非静态方法
    synchronized void foo() {
        // 临界区
    }

    // 修饰静态方法
    synchronized static void bar() {
        // 临界区
    }

    // 修饰代码块
    Object obj = new Object();

    void baz() {
        synchronized (obj) {
            // 临界区
        }
    }
}
```
1. 锁是一种通用的技术方案，Java语言提供的锁实现：`synchronized`
2. Java编译器会在synchronized修饰的方法或代码块前后自动加上lock()和unlock()
    - lock()和unlock()一定是成对出现的
3. 当synchronized修饰**静态方法**时，锁定的是_**当前类的Class对象**_
4. 当synchronized修饰**实例方法**时，锁定的是_**当前实例对象this**_

## count += 1
```java
public class SafeCalc {
    private long value = 0L;

    public long get() {
        return value;
    }

    public synchronized void addOne() {
        value += 1;
    }
}
```
1. 原子性
    - synchronized修饰的临界区是**互斥**的
    - 因此无论是单核CPU还是多核CPU，只有一个线程能够执行addOne，能保证原子性
2. 可见性
    - 管程中锁的规则：对一个锁的**解锁**Happens-Before于后续对这个锁的**加锁**
    - 结合Happens-Before的**传递性**原则，易得下面的结论
    - _前一线程在临界区修改的共享变量（该操作在解锁之前），对后续进入临界区（该操作在加锁之后）的线程是**可见**的_
    - 因此，多个线程同时执行addOne，可以**保证可见性**，即假如有N个线程并发调用addOne，最终结果一定是N
3. get
    - 执行addOne方法后，value的值对get方法的可见性是**无法保证**的
    - 解决方案：get方法也用synchronized修饰

### 锁模型
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-atomic-improved-lock-model-count.png" width=1000/>
1. get()和addOne()都需要访问资源value，而资源value是用this这把锁来保护的
2. 线程要进入临界区get()和addOne()，必须先获得this这把锁，因此get()和addOne()也是**互斥**的

## 锁与受保护资源
受保护资源和锁之间**合理**的关联关系应该是`N:1`的关系

### 不同的锁
```java
public class SafeCalc {
    private static long value = 0L;

    public long get() {
        return value;
    }

    public synchronized static void addOne() {
        value += 1;
    }
}
```
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-atomic-count-two-lock.png" width=1000/>
1. 用两个锁（this和SafeCalc.class）保护同一个资源value（静态变量）
2. 临界区get()和addOne()是用两个锁来保护的，因此两个临界区没有**互斥**关系
3. 临界区addOne()对value的修改对临界区get()也没有**可见性**保证，因此会导致并发问题

### 多个资源
_**可以用同一把锁保护多个资源，但不能用多把锁保护一个资源**_

#### 无关联资源
1. 无关联资源
    - 针对账户**余额**（余额是一种资源）的取款操作
    - 针对账户**密码**（密码是一种资源）的更改操作
2. 可以为账户余额和账户密码分配**不同的锁**来解决并发问题，不同的资源用不同的锁来保护
    - 也可以用**同一把锁**保护多个资源，例如可以用this这把锁保护账户余额和账户密码，但这样**性能太差**
3. 用不同的锁对受保护资源进行**精细化管理**，能够**提升性能**，这种锁称为**细粒度锁**

```java
public class Account {
    // 锁：保护账户余额
    private final Object balLock = new Object();
    // 锁：保护账户密码
    private final Object pwLock = new Object();
    // 账户余额
    private Integer balance;
    // 账户密码
    private String password;

    // 取款
    public void withdraw(Integer amt) {
        synchronized (balLock) {
            if (balance > amt) {
                balance -= amt;
            }
        }
    }

    // 查看余额
    public Integer getBalance() {
        synchronized (balLock) {
            return balance;
        }
    }

    // 更改密码
    public void updatePassword(String pw) {
        synchronized (pwLock) {
            password = pw;
        }
    }

    // 查看密码
    public String getPassword() {
        synchronized (pwLock) {
            return password;
        }
    }
}
```

#### 有关联资源
账户A的余额和账户B的余额是有**关联关系**的，需要保证转账操作没有并发问题
```java
public class Account {
    // 账户余额
    private int balance;

    // 转账
    public void transfer(Account target, int amt) {
        if (balance > amt) {
            balance -= amt;
            target.balance += amt;
        }
    }
}
```

##### synchronized this
```java
public class Account {
    // 账户余额
    private int balance;

    // 转账
    public synchronized void transfer(Account target, int amt) {
        if (balance > amt) {
            balance -= amt;
            target.balance += amt;
        }
    }
}
```
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-atomic-account-error-synchronized.png" width=1000/>
1. 上述代码中，临界区内有**两个资源**，分别是`this.balance`和`target.balance`
2. this这把锁可以保护自己的余额`this.balance`，但无法保护他人的余额`target.balance`
3. 场景
    - 假设有A、B、C三个账户，余额都是200
    - 用两个线程分别执行两个转账操作：线程1执行账户A给账户B转账100，线程2执行账户B给账户C转账100
    - 预期结果：账户A余额为100，账户B余额为200，账户C余额为300
4. 假设线程1和线程2分别在**两颗CPU上同时执行**，实际上两个线程**并不互斥**
    - 线程1锁定的是账户A的实例A.this，线程2锁定的是账户B的实例B.this，因此，两个线程可以**同时进入临界区**transfer
    - 线程1和线程2刚开始执行时都有可能读到账户B的余额是200，导致账户B最终的余额是300或100，**但绝不会是200**
        - 300：线程2写B.balance -> 线程1写B.balance
        - 100：线程1写B.balance -> 线程2写B.balance

##### 同一把锁
1. 条件：_**锁能覆盖所有受保护的资源（粒度更大）**_
2. 方案1：让所有对象都**持有一个唯一性的对象**，该对象在**创建**Account时传入
    - 很难保证传入共享的lock，_**缺乏实践的可行性**_
3. 方案2：Class对象作为共享的锁
    - Account.class是所有Account实例共享的，并且Class对象时JVM在加载类时创建的，能保证**唯一性**，代码也更简单

```java
// 方案1
public class Account {
    private Object lock;
    private int balance;

    // 默认构造函数为private
    private Account() {
    }

    // 传入相同lock，所有Account实例共享
    public Account(Object lock) {
        this.lock = lock;
    }

    // 转账
    public void transfer(Account target, int amt) {
        synchronized (lock) {
            if (balance > amt) {
                balance -= amt;
                target.balance += amt;
            }
        }
    }
}

// 方案2
public class Account {
    private int balance;

    // 转账
    public void transfer(Account target, int amt) {
        synchronized (Account.class) {
            if (balance > amt) {
                balance -= amt;
                target.balance += amt;
            }
        }
    }
}
```
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-atomic-solution-class.png" width=1000/>


## 原子性的本质
1. 原子性的**外在表现**：**不可分割**
2. 原子性的**本质**：_**多个资源之间有一致性的要求，操作的中间状态对外不可见**_
    - 中间状态：例如在32位机器上写long型变量，转账操作（账户A减少100，但账户B还未增加100）

<!-- indicate-the-source -->
