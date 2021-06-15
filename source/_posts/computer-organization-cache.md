---
title: 计算机组成 -- 高速缓存
mathjax: false
date: 2020-01-26 12:53:15
categories:
    - Computer Basics
    - Computer Organization
tags:
    - Computer Basics
    - Computer Organization
---

## 缓存行
```bash
$ sysctl -a | grep -E 'cacheline|cachesize'
hw.cachesize: 17179869184 32768 262144 6291456 0 0 0 0 0 0
hw.cachelinesize: 64 # 64 Bytes
hw.l1icachesize: 32768 # 32 KB
hw.l1dcachesize: 32768 # 32 KB
hw.l2cachesize: 262144 # 256 KB
hw.l3cachesize: 6291456 # 6 MB
```

<!-- more -->

```java
public static void f1() {
    int[] arr = new int[64 * 1024 * 1024];

    long start = System.currentTimeMillis();
    for (int i = 0; i < arr.length; i++) {
        arr[i] *= 3;
    }
    long end = System.currentTimeMillis();

    System.out.println("f1 : " + (end - start));
}

public static void f2() {
    int[] arr = new int[64 * 1024 * 1024];

    long start = System.currentTimeMillis();
    for (int i = 0; i < arr.length; i += 16) {
        arr[i] *= 3;
    }
    long end = System.currentTimeMillis();
    System.out.println("f2 : " + (end - start));
}

// f1 : 36
// f2 : 42
// f2/f1 : 1.17
```

## 高速缓存
1. 按照**摩尔定律**，**CPU**（**寄存器**）的访问速度每**18个月**会翻一翻，相当于**每年**增长**60%**
2. 虽然**内存**的访问速度也在不断增长，但远没有那么快，**每年**只增长**7%**左右
3. 两个增长速度的差异，使得CPU访问性能和内存访问性能的**差异不断拉大**，至今，大概是**120**倍的差异
4. 为了**弥补**两者之间的性能差异，在现代CPU中引入了**高速缓存**（L1 Cache、L2 Cache、L3 Cache）
   - 内存中的**指令**和**数据**会被加载到L1~L3 Cache中，而不是直接由CPU访问内存去读取
   - 在**95%**的情况下，CPU都只需要访问L1~L3 Cache，从里面读取指令和数据，而**无需访问内存**
   - CPU Cache指的是由**SRAM**组成的**物理芯片**
5. 运行程序的时间主要花在了将对应的数据从内存中读取出来，加载到CPU Cache里，该过程是按照**Cache Line**来读取的
   - 日常使用的Intel服务器或者PC，Cache Line的大小通常是_**64字节**_
   - `f2()`每隔16个整型数计算一次，16个整型数正好是64个字节
     - `f1()`和`f2()`需要把**同样数量的Cache Line数据**从内存中读取到CPU Cache中，最终两个程序花费的**时间差不多**

## 类比
1. 现代CPU进行数据读取的时候，无论数据是否已经存储在Cache中，CPU**始终会首先访问Cache**
2. 只有当CPU在Cache中找不到数据的时候，才会去访问内存，并**将读取到的数据写入Cache**中
3. 在各类**基准测试**和**实际应用场景**中，CPU Cache的**命中率**通常能到达**95%**以上

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-cache.png" width=600/>

## Direct Mapped Cache
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-cache-mem-map-cache-line.png" width=1000/>

1. 直接映射Cache策略：确保任何一个**内存块**的地址，**始终**映射（**mod**）到一个**固定**的**CPU Cache Line**地址
2. 假设主内存被分成32块（0~31），一共有8个缓存块，要访问第21号内存块，如果21号内存块在缓存块中，一定在5号缓存块
3. 在实际计算中，通常会把缓存块的数量设置成**2的N次方**，在计算**取模**的时候，可以直接取内存地址的**低N位**
4. 对应的缓存块中，会存储一个**组标记**（Tag），**缓存块本身的地址**表示**访问内存地址的低N位**，对应的组标记记录**剩余的高位**即可
5. 缓存块中还有两个数据，一个是从主内存中加载来的**实际存放的数据**（Data Block），另一个是**有效位**（Valid Bit）
   - 有效位用来标记对应的**缓存块中的数据是否有效**
   - 如果有效位为**0**，无论其中的组标记和Cache Line里的数据内容是什么，CPU都会**直接访问内存**，**重新加载数据**
6. CPU在**读取**数据的时候，并不是要读取一整个Data Block，而是读取一个**所需要的数据片段**（叫作CPU里面的一个**字**（Word））
   - 具体是哪个字，由这个字在整个Data Block里面的位置来决定，该位置称为**偏移量**（Offset）
7. 一个内存的访问地址，最终包括
    - **Tag**：**高位**代表的**组标记**
    - **Index**：**低位**代表的**索引**
    - **Offset**：在对应的**Data Block**中定位对应**字**的**位置偏移量**
8. 如果内存中的数据已经在CPU Cache中，那对一个内存地址的访问，会经历下面4个步骤
   1. 根据**内存地址的低位**，计算在**Cache中的索引**
   2. 判断**有效位**，确认Cache中的数据是否有效
   3. 对比**内存地址的高位**和**Cache中的组标记**
      - 确认Cache中的数据就是要访问的内存数据，从Cache Line中读取对应的Data Block
   4. 根据内存地址的**Offset**位，从Data Block中，读取希望取到的**字**
9. 如果2、3步骤失效，**CPU会访问内存**，并把对应的**Block Data**更新到Cache Line中，同时更新对应的**有效位**和**组标记**的数据

## 迭代性能对比
```java
public static void iterateByRow(int rows, int cols) {
    int[][] arr = new int[rows][cols];

    long start = System.currentTimeMillis();
    for (int row = 0; row < rows; row++) {
        for (int col = 0; col < cols; col++) {
            arr[row][col] *= 3;
        }
    }
    System.out.println("iterateByRow : " + (System.currentTimeMillis() - start));
}

public static void iterateByCol(int rows, int cols) {
    int[][] arr = new int[rows][cols];

    long start = System.currentTimeMillis();
    for (int col = 0; col < cols; col++) {
        for (int row = 0; row < rows; row++) {
            arr[row][col] *= 3;
        }
    }
    System.out.println("iterateByCol : " + (System.currentTimeMillis() - start));
}

public static void main(String[] args) {
    int rows = 4 * 1024;
    int cols = 4 * 1024;
    iterateByRow(rows, cols);
    iterateByCol(rows, cols);
}
```
```
iterateByRow : 30
iterateByCol : 172
```

## volatile
1. 常见误解
   - 把`volatile`当成一种**锁**机制，等同于`sychronized`，不同线程访问特定变量都会去**加锁**
   - 把`volatile`当成一个**原子化**的操作机制，认为加了`volatile`之后，对于一个变量的**自增操作**就会变成**原子性**的
2. `volatile`关键字最核心的知识点，要关系到**Java内存模型**上
   - Java内存模型（**JMM**）是Java虚拟机这个**进程级虚拟机**里的一个**内存模型**
   - **JMM**和计算机组成里的CPU、高速缓存和主内存组合在一起的**硬件体系**非常相似

```java
public class VolatileTest {

    private static volatile int COUNTER = 0;

    public static void main(String[] args) {
        new ChangeListener().start();
        new ChangeMaker().start();
    }

    static class ChangeListener extends Thread {
        @Override
        public void run() {
            int threadValue = COUNTER;
            while (threadValue < 5) {
                if (threadValue != COUNTER) {
                    System.out.println("Got Change for COUNTER : " + COUNTER + "");
                    threadValue = COUNTER;
                }
            }
        }
    }

    static class ChangeMaker extends Thread {
        @Override
        public void run() {
            int threadValue = COUNTER;
            while (COUNTER < 5) {
                try {
                    Thread.sleep(500);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
                System.out.println("Incrementing COUNTER to : " + (threadValue + 1) + "");
                COUNTER = ++threadValue;
            }
        }
    }
}
```
```bash
Incrementing COUNTER to : 1
Got Change for COUNTER : 1
Incrementing COUNTER to : 2
Got Change for COUNTER : 2
Incrementing COUNTER to : 3
Got Change for COUNTER : 3
Incrementing COUNTER to : 4
Got Change for COUNTER : 4
Incrementing COUNTER to : 5
Got Change for COUNTER : 5
```
```java
// 去掉volatile关键字
private static int COUNTER = 0;
```
```bash
# ChangeListener不再工作，在ChangeListener眼里，觉得COUNTER的值一直为0
Incrementing COUNTER to : 1
Incrementing COUNTER to : 2
Incrementing COUNTER to : 3
Incrementing COUNTER to : 4
Incrementing COUNTER to : 5
```
```java
// ChangeListener不再忙等待，稍微sleep 5ms
// 此时COUNTER依然没有volatile关键字修饰
static class ChangeListener extends Thread {
    @Override
    public void run() {
        int threadValue = COUNTER;
        while (threadValue < 5) {
            if (threadValue != COUNTER) {
                System.out.println("Got Change for COUNTER : " + COUNTER + "");
                threadValue = COUNTER;
            }
            try {
                Thread.sleep(5);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }
}
```
```bash
# "恢复正常"
Incrementing COUNTER to : 1
Got Change for COUNTER : 1
Incrementing COUNTER to : 2
Got Change for COUNTER : 2
Incrementing COUNTER to : 3
Got Change for COUNTER : 3
Incrementing COUNTER to : 4
Got Change for COUNTER : 4
Incrementing COUNTER to : 5
Got Change for COUNTER : 5
```
1. `volatile`关键字的含义：确保对于volatile变量的**读取**和**写入**，都**一定会同步到主内存里**，而**不是从Cache里面读取**
2. 样例1
   - 使用`volatile`关键字，所有数据的**读**和**写**都是来自**主内存**，ChangeMaker和ChangeListener看到的COUNTER是**一样**的
3. 样例2
   - 去掉`volatile`关键字，ChangeListener一直**忙等待循环**
   - 尝试不停地获取COUNTER的值，这样就会从**当前线程的『Cache』**里面获取
   - 于是，这个线程**没有时间从主内存里同步更新后的COUNTER值**，一直卡死在COUNTER=0的**死循环**上
4. 样例3
   - `Thread.sleep(5)`给了这个线程**喘息**的机会，就有机会把最新的数据从主内存**同步**到自己的高速缓存中

## CPU vs JMM
1. 现在的Intel CPU，通常都是**多核**的，每个CPU核里面，都有**独立的L1、L2 Cache**，然后有多个CPU核**共用的L3 Cache、主内存**
2. 在Java内存模型里面，每个线程都有**独立的线程栈**
   - 线程在读取COUNTER的数据的时候，其实是从**本地的线程栈的Cache副本**里面读取数据，而不是从**主内存**里面读取数据

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-cache-l123.jpg" width=500/>

## 写入策略

### 写直达 -- Write-Through
1. 每一次数据都要**写入到主内存**里，写入前，会先判断数据是否已经在Cache里
   - 如果是，先把数据写入更新到Cache里，再写入到主内存里
   - 如果否，只更新主内存
2. 缺点：**很慢**！
   - 无论数据是不是在Cache里面，都需要把数据写到**主内存**里面，类似于**`volatile`**关键字

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-cache-write-strategy-through.jpg" width=400/>

### 写回 -- Write-Back
1. 不再是每次都把数据写入到主内存，而是**只写到CPU Cache**里面
   - 只有当CPU Cache里面的数据要被**『替换』**的时候，才把数据写入到主内存里面
2. 如果发现要写入的数据，就在CPU Cache里，那么就只更新CPU Cache里的数据
   - 并且标记CPU Cache里的这个Block是**脏**（Dirty）的
   - 脏：CPU Cache里面的Block的数据和主内存是**不一致**的
3. 如果要写入的数据所对应的Cache Block里，放的是**别的**内存地址的数据，判断那个Cache Block里面的数据是否被标记为脏
   - 如果是**脏**的，就先把这个Cache Block里面的数据，写入到主内存里面
    - 然后在把当前要写入的数据，写入到Cache里，同时把Cache Block标记成脏的
   - 如果不是脏的，直接把数据写入到Cache里，然后再把Cache Block标记成脏的
4. 加载内存数据到Cache里面的时候，也要多出一步**同步脏Cache**的动作
   - 如果加载内存里的数据到Cache的时候，发现Cache Block里面有**脏**标记
   - 需要先把Cache Block里面的数据写回到主内存，才能加载数据覆盖掉Cache
5. 优点：大量的操作，都能**命中缓存**，在大部分时间里，都不需要读写主内存，**性能比写直达要好很多**

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-cache-write-strategy-back.jpg" width=500/>

### 缓存一致性问题
1. 无论是**写直达**还是**写回**，都没有解决**多个线程**或者**多个CPU核心**的**缓存一致性**问题
2. 解决方案：**MESI协议**
   - 应用场景：不仅可以在CPU Cache之间，也可以广泛用于各种需要使用缓存，同时**缓存之间需要同步**的场景

## 参考资料
[深入浅出计算机组成原理](https://time.geekbang.org/column/intro/100026001)