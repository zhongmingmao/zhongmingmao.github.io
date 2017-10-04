---
title: 并发 - volatile的可见性
date: 2016-08-04 00:06:25
categories:
    - Concurrent
tags:
    - Netease
    - Concurrent
---

{% note info %}
本文主要介绍关键字`volatile`在实际开发中最为重要的特性：**`可见性`**
代码托管在https://github.com/zhongmingmao/concurrent_demo
{% endnote %}

<!-- more -->

# JMM 基础
`JMM`即`Java Memory Model`，`Java内存模型`

## 主内存 + 工作内存
![jmm.png](http://otr5jjzeu.bkt.clouddn.com/jmm.png)
1. `JMM`定义程序中`可被共享变量`的访问规则，即在虚拟机中将变量存储在内存和从内存中取出变量这样的底层细节
2. 共享变量包括：`实例字段`、`静态字段`和`构成数组对象的元素`
3. 线程私有数据包括：`局部变量`、`方法参数`等
4. `所有变量`存储在`主内存`中，线程拥有自己的`工作内存`，工作内存保存了`该线程使用的变量的主内存副本拷贝`
5. **`线程对变量的所有操作都必须在工作内存中进行`**，不能直接读取`主内存`中的变量，不同的线程之间也无法直接访问对方`工作内存`中的变量

## 交互协议（原子操作）
1. `lock`：作用于`主内存`的变量，把一个变量标识为一条`线程独占`的状态
2. `unlock`：作用于`主内存`的变量，把一个处于`锁定状态`的变量释放出来，释放后的变量才可以被其他线程锁定
3. `read`：作用于`主内存`的变量，把一个变量的值从主内存`传输`到线程的工作内存中，以便随后的load动作使用
4. `load`：作用于`工作内存`的变量，把`read`操作从主内存得到的变量放入工作内存的`变量副本`中
5. `use`：作用于`工作内存`的变量，把工作内存中一个`变量的值传递给执行引擎`；每当虚拟机遇到一个需要使用到变量的值的字节码指令时会执行这个操作
6. `assign`：作用于`工作内存`的变量，把一个`从执行引擎接收到的值赋给工作内存的变量`；每当虚拟机遇到一个给变量赋值的字节码指令时执行这个操作
7. `store`：作用于`工作内存`的变量，把工作内存中一个变量的值`传送`到主内存中，以便随后的write动作使用
8. `write`：作用于`主内存`的变量，把`store`操作从工作内存中得到的变量值放入`主内存的变量`中

### 规则
阅读时可跳过，不影响全文理解
1. read和load、store和write必须成对、按顺序（不要求连续）出现
2. 不允许一个线程丢弃它最近的assign操作，变量在工作内存中改变之后必须把该变化同步回主内存
3. 不允许一个没发生过assign操作的线程把数据从工作内存同步回主内存中
4. 一个新的变量只能在主内存中诞生，不允许在工作内存中直接使用一个未被初始化（load或assign）的变量
5. 一个变量可以被同一线程lock多次，但必须执行一样次数的unlock，变量才会被解锁
6. 对一个变量来说，lock和unlock只能由同一个线程执行
7. 如果对一个变量执行lock操作，那将会清空工作内存中此变量的值，在执行引擎使用该变量前，需要重新执行load或assign操作初始化变量的值
8. 对一个变量执行unlock操作之前，必须先把此变量同步回主内存中

## 原子性、可见性、有序性
1. `原子性`：一个操作是`不可中断`的；能够实现原子性的关键词：`synchronized`
2. `可见性`：当一个线程修改了某一个共享变量的值，其他线程是否能够**`立即知道`**这个修改；能够实现可见性的关键词：`synchronized`、`volatile`、`final`
3. `有序性`（理解有待加深）：如果在`本线程内观察`，所有操作都是`有序`的；如果`在一个线程中观察另一个线程`，所有操作都是`无序`的。前半句是指`线程内表现为串行语义`，后半句是指`指令重排序`现象和`工作内存中主内存同步延迟`现象；能实现有序性的关键字：`synchronized`、`volatile`

| 特性 | 关键字 |
| --- | --- |
| 原子性 | `synchronized` |
| 可见性 | `synchronized`、`volatile`、`final` |
| 有序性 | `synchronized`、`volatile` |

## 先行发生原则（happen-before）

### 先行发生
操作A`先行发生`于操作B：**`发生操作B之前，操作A产生的影响能被操作B观察到`**

### 作用
判断数据是`否存在竞争`、`线程是否安全`的主要依据
`先行发生`主要用于阐述**`操作之间的内存可见性`**

### 规则
1. **`程序次序规则`**：在一个线程内，按照控制流顺序执行
2. **`管程锁定规则 — synchronized`**：一个unlock操作先行发生于后面（时间先后顺序）对同一个锁的lock操作
3. **`volatile变量规则 — volatile`**：对一个volatile变量的写操作先行发生于后面（时间先后顺序）对这个变量的读操作
4. `线程启动规则`：Thread对象的start()方法先行发生于此线程的每一个动作
5. `线程终止规则`：线程的所有操作都先行发生于对此线程的终止检测（Thread.join()方法结束、Thread.isAlive()的返回值）
6. `线程中断规则`：对线程interrupt()方法的调用先行发生于被中断线程的代码检测到中断事件的发生（Thread.interrupted()）
7. `对象终结规则`：一个对象的初始化（构造函数执行结束）完成先行发生于它的finalize()方法的开始
8. **`传递性`**：如果操作A先行发生于操作B，操作B先行发生于操作C ➜ 操作A先行发生于操作C


# volatile的特性

## 开销
1. `volatile`是**`最轻量级的同步机制`**
2. volatile变量`读操作的性能消耗与普通变量没什么差别，写操作可能会慢一些`
3. 大多数场景下，`volatile的总开销仍然比锁低`
4. 如果`volatile的语义能满足使用的场景，尽量使用volatile`



## 可见性

### 交互动作

1. 线程T对`volatile变量V的use动作`，必须与`read`、`load`动作相关联，必须连续一起出现；**`在工作内存中，每次使用V之前都必须从主内存刷新最新的值`**，用于保证能看见其他线程对变量V所做的修改后的值
2. 线程T对`volatile变量V的assign动作`，必须与`store`、`write`动作相关联，必须连续一起出现；**`在工作内存中，每次修改V后都必须立刻同步回到主内存中`**，用于保证其他线程可以看到自己对变量V所做的修改

### 代码
```java
/**
 * 结合happens-before说明volatile的可见性
 * @author zhongmingmao zhongmingmao0625@gmail.com
 */
public class VolatileVisibility {
    static class A {
        private int x = 0;
        private volatile int y = 0; // 如果y不声明为volatile，程序将无法结束

        private void write() {
            x = 5;
            y = 1;
            System.out.println("update x = 5");
        }

        private void read() {
            while (y < Integer.MAX_VALUE && x != 5) {
            }
            System.out.println("read x = 5");
        }
    }

    public static void main(String[] args) throws Exception {
        A a = new A();
        Thread writeThread = new Thread(() -> a.write());
        Thread readThread = new Thread(() -> a.read());

        readThread.start();
        Thread.sleep(100); // 休眠一段时间，确保readThread已经在运行，验证volatile的可见性
        writeThread.start();
    }
}
```

### 分析
依据`先行发生原则`分析
1. `程序次序规则`：`x = 5`happen-before`y = 1`，`y < Integer.MAX_VALUE`happen-before`x != 5`
2. `volatile变量规则`：`y = 1`happen-before`y < Integer.MAX_VALUE`
3. `传递性`：依据1、2 ➜ **`x = 5`happen-before`x != 5`** ➜ `可见性`
`volatile变量y`能让线程`readThread`看到线程`writeThread`对`普通变量x`的修改

## 不保证并发安全

### 代码
```java
/**
 * volatile能保证可见性，但不保证并发安全
 */
public class ConcurrentNotSafe {
    private static final int POOL_SIZE = 4;

    private static volatile int i = 0;
    private static CountDownLatch countDownLatch = new CountDownLatch(1000 * 1000);

    private static void increase() {
        while (countDownLatch.getCount() > 0) {
            ++i;
            countDownLatch.countDown();
        }
    }

    public static void main(String[] args) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(POOL_SIZE);
        IntStream.range(0, POOL_SIZE).forEach(value -> pool.submit(ConcurrentNotSafe::increase));
        pool.shutdown();
        countDownLatch.await();
        System.out.println(i); // 890672 < 1000 * 1000
    }
}
```

### 运行结果
```
890672
```
`volatile`能`保证可见性`，但`不保证并发安全`，并非`预期结果`1000 * 1000

### 字节码
```
# javap -v -p
private static void increase();
    descriptor: ()V
    flags: ACC_PRIVATE, ACC_STATIC
    Code:
        stack=4, locals=0, args_size=0
            0: getstatic        #2 // Field countDownLatch:Ljava/util/concurrent/CountDownLatch;
            3: invokevirtual    #3 // Method java/util/concurrent/CountDownLatch.getCount:()J
            6: lconst_0
            7: lcmp
            8: ifle          28
            11: getstatic       #4  // Field i:I
            14: iconst_1
            15: iadd
            16: putstatic       #4  // Field i:I
            19: getstatic       #2  // Field countDownLatch:Ljava/util/concurrent/CountDownLatch;
            22: invokevirtual   #5  // Method java/util/concurrent/CountDownLatch.countDown:()V
            25: goto          0
            28: return
```
`++i`对应的`4个字节码`：`11:getstatic`、`14:iconst_1`、`15:iadd`和`16:putstatic`，因此`算术符++不具有原子性`，从而`不能保证并发安全`

{% note info %}
volatile内存语义的实现主要依赖于`内存屏障（Memory Barrier）`来禁用`特定的的指令重排序`，相关内容请参考[深入理解Java内存模型（四）- volatile](http://ifeve.com/java-memory-model-4/)，不在赘述
{% endnote %}

# 参考资料
[深入理解Java虚拟机（第2版）](https://book.douban.com/subject/24722612/)




<!-- indicate-the-source -->
