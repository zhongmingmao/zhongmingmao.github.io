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

<!-- more -->

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

### 类比
1. 现代CPU进行数据读取的时候，无论数据是否已经存储在Cache中，CPU**始终会首先访问Cache**
2. 只有当CPU在Cache中找不到数据的时候，才会去访问内存，并**将读取到的数据写入Cache**中
3. 在各类**基准测试**和**实际应用场景**中，CPU Cache的**命中率**通常能到达**95%**以上

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-cache.png" width=600/>

### Direct Mapped Cache
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-cache-mem-map-cache-line.png" width=1000/>

1. 直接映射Cache策略：确保任何一个**内存块**的地址，**始终**映射（**mod**）到一个**固定**的**CPU Cache Line**地址
2. 假设主内存被分成32块（0~31），一共有8个缓存块，要访问第21号内存块，如果21号内存块在缓存块中，一定在5号缓存块
3. 在实际计算中，通常会把缓存块的数量设置成**2的N次方**，在计算**取模**的时候，可以直接取内存地址的**低N位**
4. 对应的缓存块中，会存储一个**组标记**（Tag），**缓存块本身的地址**表示**访问内存地址的低N位**，对应的组标记记录**剩余的高位**即可
5. 除了组标记信息之外，缓存块中还会有两个数据，一个是从主内存中加载来的**实际存放的数据**，另一个是**有效位**（valid bit）
   - 有效位用来标记对应的**缓存块中的数据是否有效**
   - 如果有效位为**0**，无论其中的组标记和Cache Line里的数据内容是什么，CPU都会**直接访问内存**，**重新加载数据**
6. CPU在**读取**数据的时候，并不是要读取一整个Data Block，而是读取一个**所需要的数据片段**（叫作CPU里面的一个**字**（Word））
   - 具体是哪个字，用这个字在整个Data Block里面的位置来决定，该位置称为**偏移量**（Offset）
7. 一个内存的访问地址，最终包括
    - **Tag**：**高位**代表的**组标记**
    - **Index**：**低位**代表的**索引**
    - **Offset**：在对应的**Data Block**中定位对应**字**的**位置偏移量**
8. 如果内存中的数据已经在CPU Cache中，那对一个内存地址的访问，会经历下面4个步骤
   1. 根据**内存地址的低位**，计算在**Cache中的索引**
   2. 判断**有效位**，确认Cache中的数据是否有效
   3. 对比**内存地址的高位**和**Cache中的组标记**
      - 确认Cache中的数据就是要访问的内存数据，从Cache Line中读取对应的Data Block
   1. 根据内存地址的**Offset**位，从Data Block中，读取希望取到的**字**
1. 如果2、3步骤失效，**CPU会访问内存**，并把对应的**Block Data**更新到Cache Line中，同时更新对应的**有效位**和**组标记**的数据