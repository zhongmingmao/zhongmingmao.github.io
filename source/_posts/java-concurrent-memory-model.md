---
title: Java并发 -- Java内存模型
date: 2019-04-15 20:48:08
categories:
    - Java
    - Concurrent
tags:
    - Java
    - Java Concurrent
---


## 解决什么问题
Java内存模型解决了并发程序中的**可见性问题**和**有序性问题**

## Java内存模型

### 按需禁用
1. _CPU缓存会导致可见性问题，编译优化会导致有序性问题_
2. 解决可见性和有序性**最直接**的办法：_**禁用CPU缓存和编译优化**_
    - 问题虽然解决了，但程序性能会大大下降
3. 合理的方案：_**按需禁用CPU缓存和编译优化**_
    - 为了解决可见性和有序性的问题，只需要给程序员**提供按需禁用CPU缓存和编译优化的方案**即可

<!-- more -->

### 程序员视角
1. Java内存模型规范了_**JVM如何提供按需禁用CPU缓存和编译优化的方法**_
2. 具体方法包括：`volatile`、`synchronized`和`final`关键字，以及六个`Happens-Before`规则

### volatile
1. volatile关键字不是Java语言的特产，在古老的C语言也有，最原始的意义就是_**禁用CPU缓存**_
2. `volatile int x = 0`：告诉编译器，对这个变量的读写，不能使用CPU缓存，**必须从内存中读取或者写入**

#### Java代码
```java
public class VolatileExample {
    private int x = 0;
    private volatile boolean v = false;

    // 线程A
    public void writer() {
        x = 42;
        v = true;
    }

    // 线程B
    public void reader() {
        if (v) {
            // 这里 x 会是多少呢？
        }
    }
}
```
1. 假设线程A执行writer()，按照volatile语义，会把变量`v=true`写入内存
2. 假设线程B执行reader()，同样按照volatile语义，线程B会从内存读取变量v
3. 如果线程B看到`v==true`
    - 如果Java低于1.5，x可能是42，也可能是0
        - CPU缓存导致的**可见性**问题
    - 如果Java高于等于1.5，x是42
        - JMM在Java 1.5通过**Happens-Before**对volatile语义进行了**增强**

### Happens-Before规则

#### 理解
1. 望文生义的理解：前面一个操作发生在后续操作的前面
2. 正确的理解：_**前面一个操作的结果对后续操作是可见的**_
3. 正式的说法：Happens-Before_**约束了编译器的优化行为**_
    - 虽然允许编译器优化，但要求编译器优化后一定要遵循Happens-Before规则
4. Happens-Before规则是JMM里面比较难理解的内容，与程序员相关的规则有六项，都与**可见性**相关

#### 程序的顺序性规则
在**同一个线程**中，按照程序顺序，前面的操作Happens-Before于后面的任意操作

#### volatile变量规则
1. 对一个volatile变量的**写操作**，Happens-Before于后续对这个volatile变量的**读操作**
2. 对一个volatile变量的写操作相对于后续对这个volatile变量的读操作_**可见**_

#### 传递性规则
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-happens-before-transitive.png" width=800/>

1. 如果A Happens-Before B，并且B Happens-Before C，那么A Happens-Before C
2. 程序的顺序性规则：`x=42`Happens-Before`v=true`
3. volatile变量规则：写变量`v=true`Happens-Before读变量`v=true`
4. 传递性规则：`x=42`Happens-Before读变量`v=true`
    - 如果线程B读到了`v=true`，那么线程A设置的`x=42`对线程B是可见的，即线程B能看到`x==42`
5. 这就是Java 1.5**对volatile语义的增强**，该版本的JUC就是靠**volatile语义**实现**可见性**的

#### 管程中锁的规则
```java
public void fun() {
    synchronized (this) { // 此处自动加锁
        // x 是共享变量, 初始值 =10
        if (this.x < 12) {
            this.x = 12;
        }
    } // 此处自动解锁
}
```
1. 对一个锁的**解锁**Happens-Before于后续对这个锁的**加锁**
2. 管程是一种**通用的同步原语**，Java中的`synchronized`就是Java对**管程的实现**
3. 管程中的锁在Java里是**隐式**实现的
    - 在进入代码块之前，会自动加锁，而在代码块执行完会自动释放锁
    - 加锁和释放锁都是**编译器**帮我们实现的
4. x的初始值是10，线程A执行完代码块后，x的值变成了12（执行完自动释放锁）
5. 线程B进入代码块时，能够看到线程A对x的写操作，即线程B能够看到x==12

#### 线程start()规则
```java
Thread B = new Thread(() -> {
    // 主线程调用 B.start() 之前
    // 所有对共享变量的修改，此处皆可见
    // 此例中，var==77
    System.out.println(var);
});
// 此处对共享变量 var 修改
var = 77;
// 主线程启动子线程
B.start();
```
1. **主线程A启动子线程B后，子线程B能够看到主线程A在启动子线程B之前的操作**
2. 即线程A调用线程B的start()方法，那么该start()方法Happens-Before于B中的任意操作

#### 线程join()规则
```java
Thread B = new Thread(() -> {
    // 此处对共享变量 var 修改
    System.out.println(var); // 77
    var = 66;
});
// 例如此处对共享变量修改，
// 则这个修改结果对线程 B 可见
// 主线程启动子线程
var = 77;
B.start();

B.join();
// 子线程所有对共享变量的修改
// 在主线程调用 B.join() 之后皆可见
// 此例中，var==66
System.out.println(var); // 66
```
1. 主线程A等待子线程B完成（主线程A通过调用子线程B的join()方法来实现）
    - 当子线程B完成后（主线程A中join()方法返回），**主线程A能够看到子线程B的操作**
2. 即如果在线程A中调用线程B的join()并成功返回，那么线程B中的任意操作Happens-Before于该join()方法的**返回**

### final
1. volatile的目的：禁用**CPU缓存**（可见性）和**编译优化**（有序性）
2. final修饰变量时，初衷是告诉编译器，该变量是**一直不变**的，可以**尽量优化**
3. 曾经优化过度，导致异常
    - 例如在利用双重检查创建单例时，构造函数的**错误重排列**会导致线程可能会看到**final变量的值会变化**
    - 在Java 1.5的JMM对final类型变量的**重排**进行了**约束**
        - 只要提供**没有逸出的构造函数**，就不会出现问题

#### 逸出
```java
public class EscapeExample {

    public static Object global_obj;
    final int x;
    final int y;

    // 错误的构造函数，尽量避免
    public EscapeExample() {
        x = 3;
        y = 4;
        // 此处就是将 this 逸出
        // 其他线程通过global_obj读取的x可能是0，不满足x被修饰为final的语义
        global_obj = this;
    }
}
```

## 小结
1. Happens-Before的语义是一种_**因果关系**_
    - 如果事件A是导致B事件的起因，那么事件A一定Happens-Before事件B
2. _**在Java里，Happens-Before的语义本质是一种可见性**_
    - A Happens-Before B意味着A对B来说是可见的，**不论A和B是否发生在同一个线程里**
3. Java内存模型的受众
    - JVM的开发人员
    - 编写并发程序的应用开发人员
        - _**核心：Happens-Before规则**_

<!-- indicate-the-source -->
