---
title: Java并发 -- 面向对象
date: 2019-05-01 11:17:55
categories:
    - Java
    - Concurrent
tags:
    - Java
    - Java Concurrent
---

## 封装共享变量
1. 面向对象思想里面有一个很重要的特性：_**封装**_
2. 封装：将**属性**和**实现细节**封装在**对象内部**，外部对象只能通过目标对象的**公共方法**来**间接访问**目标对象的内部属性
3. 利用**面向对象**思想写**并发程序**的思路：将**共享变量**作为**对象属性**封装在内部，对**所有公共方法**制定_**并发访问策略**_

<!-- more -->

### Counter
value为**共享变量**，作为Counter的**实例属性**，将get()和addOne()声明为**synchronized方法**，Counter就是一个**线程安全**的类
```java
public class Counter {
    private long value;

    public synchronized long get() {
        return value;
    }

    public synchronized long addOne() {
        return ++value;
    }
}
```

### 不可变的共享变量
1. 实际场景中，会有很多共享变量，如银行账户有卡号、姓名、身份证、信用额度等，其中卡号、姓名和身份证是不会变的
2. 对于**不可变的共享变量**，可以使用**final**关键字修饰，从而_**避免并发问题**_

## 识别共享变量间的约束条件
1. 共享变量间的**约束条件**决定了_**并发访问策略**_
2. 场景：库存管理中有个**合理库存**的概念，即库存有一个**上限**和一个**下限**

### 忽略约束条件
下面代码忽略了约束条件：即库存下限要**小于**库存上限
```java
public class SafeWM {
    // 库存下限
    private final AtomicLong lower = new AtomicLong(0);
    // 库存上限
    private final AtomicLong upper = new AtomicLong(0);

    // 设置库存下限
    public void setLower(long v) {
        lower.set(v);
    }

    // 设置库存上限
    public void setUpper(long v) {
        upper.set(v);
    }
}
```

### 存在竟态条件
```java
public class SafeWM {
    // 库存下限
    private final AtomicLong lower = new AtomicLong(0);
    // 库存上限
    private final AtomicLong upper = new AtomicLong(0);

    // 设置库存下限
    public void setLower(long v) {
        // 检验参数合法性
        if (v > upper.get()) {
            throw new IllegalArgumentException();
        }
        lower.set(v);
    }

    // 设置库存上限
    public void setUpper(long v) {
        // 检验参数合法性
        if (v < lower.get()) {
            throw new IllegalArgumentException();
        }
        upper.set(v);
    }
}
```
1. 上述代码存在_**竟态条件**_
2. 假设库存的下限和上限分别为2和10，线程A调用setUpper(5)，线程B调用setLower(7)
3. 线程A和线程B并发执行的结果可能是(7,5)，**不符合约束条件**

### 使用管程
```java
public class SafeWM {
    // 库存下限
    private final AtomicLong lower = new AtomicLong(0);
    // 库存上限
    private final AtomicLong upper = new AtomicLong(0);

    // 设置库存下限
    public synchronized void setLower(long v) {
        // 检验参数合法性
        if (v > upper.get()) {
            throw new IllegalArgumentException();
        }
        lower.set(v);
    }

    // 设置库存上限
    public synchronized void setUpper(long v) {
        // 检验参数合法性
        if (v < lower.get()) {
            throw new IllegalArgumentException();
        }
        upper.set(v);
    }
}
```

## 制定并发访问策略
1. **避免共享**：ThreadLocal + 为每个任务分配独立的线程
2. **不变模式**：Java领域应用得很少
3. **管程和其它同步工具**：管程是万能解决方案，但针对特定场景，使用JUC提供的读写锁、并发容器等同步工具性能会更好

### 宏观原则
1. **优先使用成熟的工具类**（JUC）
2. **尽量少使用低级的同步原语**（synchronized、Lock、Semaphore）
3. **避免过早优化**

<!-- indicate-the-source -->
