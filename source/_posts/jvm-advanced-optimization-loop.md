---
title: JVM进阶 -- 浅谈循环优化
date: 2019-01-06 16:16:48
categories:
    - JVM
tags:
    - JVM
---

## 循环无关代码外提

### 外提无关代码
1. 循环无关代码：**循环中值不变的表达式**
2. 在不改变程序语义的情况下，将循环无关代码提出循环外
    - 那么程序将避免重复执行这些表达式，从而达到性能提升的效果

```java
int foo(int x, int y, int[] a) {
    int sum = 0;
    for (int i = 0; i < a.length; i++) {
        sum += x * y + a[i];
    }
    return sum;
}
```

<!-- more -->

```
// 对应的字节码
int foo(int, int, int[]);
  Code:
     0: iconst_0
     1: istore 4
     3: iconst_0
     4: istore 5
     6: goto 25
// 循环体开始
     9: iload 4        // load sum
    11: iload_1        // load x
    12: iload_2        // load y
    13: imul           // x*y
    14: aload_3        // load a
    15: iload 5        // load i
    17: iaload         // a[i]
    18: iadd           // x*y + a[i]
    19: iadd           // sum + (x*y + a[i])
    20: istore 4       // sum = sum + (x*y + a[i])
    22: iinc 5, 1      // i++
    25: iload 5        // load i
    27: aload_3        // load a
    28: arraylength    // a.length
    29: if_icmplt 9    // i < a.length
// 循环体结束
    32: iload 4
    34: ireturn
```

1. 循环体中的表达式`x*y`和循环判断条件中的`a.length`均属于循环不变代码
2. `x*y`是整数乘法运算，`a.length`是内存访问操作，读取数组对象a的长度
    - 数组的长度存放在数组对象的**对象头**中，通过`arraylength`指令来访问

理想情况下，经过循环无关代码外提后，等同于下面的手工优化版本
```java
int fooManualOpt(int x, int y, int[] a) {
    int sum = 0;
    int t0 = x * y;
    int t1 = a.length;
    for (int i = 0; i < t1; i++) {
        sum += t0 + a[i];
    }
    return sum;
}
```
即时编译器除了将`x*y`和`a.length`外提，还提供int数组加载指令`iaload`所暗含的`null check`和`range check`，伪代码如下
```java
int iaload(int[] arrayRef, int index) {
    if (arrayRef == null) { // null check
        throw new NullPointerException();
    }
    if (index < 0 || index >= arrayRef.length) { // range check
        throw new ArrayIndexOutOfBoundsException();
    }
    return arrayRef[index];
}
```

### 外提null check
foo方法中的`null check`属于**循环无关**代码，即与第几次循环无关，将iaload伪代码展开，得到
```java
int foo(int[] a) {
    int sum = 0;
    for (int i = 0; i < a.length; i++) {
        if (a == null) { // null check
            throw new NullPointerException();
        }
        if (i < 0 || i >= a.length) { // range check
            throw new ArrayIndexOutOfBoundsException();
        }
        sum += a[i];
    }
    return sum;
}
```
在C2中，`null check`的外提是通过**额外的编译优化**（_即**循环预测**_，-XX:+UseLoopPredicate）来实现的
该优化的实际做法就是在**循环之前**插入**同样**的检测代码，并在命中的时候进行**去优化**
```java
int foo(int[] a) {
    int sum = 0;
    if (a == null) {
        deoptimize(); // never returns
    }
    for (int i = 0; i < a.length; i++) {
        if (a == null) { // now evluate to false
            throw new NullPointerException();
        }
        if (i < 0 || i >= a.length) { // range check
            throw new ArrayIndexOutOfBoundsException();
        }
        sum += a[i];
    }
    return sum;
}
```

### 外提range check
由于如果外提`range check`之后，将无法再引用到循环变量，因此即时编译器需要**转换检测条件**
```java
for (int i = INIT; i < LIMIT; i += STRIDE) {
    if (i < 0 || i >= a.length) { // range check
        throw new ArrayIndexOutOfBoundsException();
    }
    sum += a[i];
}
----------
// 经过range check外提之后
if (INIT < 0 || IMAX >= a.length) {
    // IMAX是i所能达到的最大值，不一定是LIMIT-1
    detopimize(); // never returns
}
for (int i = INIT; i < LIMIT; i += STRIDE) {
    sum += a[i]; // 不再包含range check
}
```

## 循环展开
循环展开：**在循环体中重复多次循环迭代**，并**减少循环次数**的编译优化，是一种以**空间换时间**的优化方式
```java
int foo(int[] a) {
    int sum = 0;
    for (int i = 0; i < 64; i++) {
        sum += (i % 2 == 0) ? a[i] : -a[i];
    }
    return sum;
}
```
经过一次**循环展开**后
```java
int foo(int[] a) {
    int sum = 0;
    for (int i = 0; i < 64; i += 2) { // 步长为2
        sum += (i % 2 == 0) ? a[i] : -a[i];
        sum += ((i + 1) % 2 == 0) ? a[i + 1] : -a[i + 1];
    }
    return sum;
}
```

### 计数循环
在**C2**中，只有**计数循环**才能被展开，计数循环需要满足以下条件
1. 维护一个循环计数器，并且**基于计数器的循环出口只有一个**
    - 但可以有基于其他判断条件的出口
2. 循环计数器的**类型**只能为**int/short/char**
3. 每个迭代循环计数器的**增量为常数**
4. 循环计数器的**上限和下限是与循环无关的数值**

```java
for (int i = START; i < LIMIT; i += STRIDE) { .. }
// 等价于
int i = START;
while (i < LIMIT) {
    ..
    i += STRIDE;
}
// 只要LIMIT是与循环无关的数值，STRIDE是常数，而且循环中除了i < LIMIT之外没有其他基于循环变量i的循环出口
// 那么C2便会将该循环标识为计数循环
```

### 优缺点
循环展开的缺点：**增加了代码的冗余度**，导致所**生成机器码的长度大幅上涨**
但随着循环体的增大，优化机会也会不断地增加，一旦循环展开能触发**进一步的优化**，总体的代码复杂度也将降低
```java
int foo(int[] a) {
    int sum = 0;
    for (int i = 0; i < 64; i += 2) {
        sum += a[i];
        sum += -a[i + 1];
    }
    return sum;
}
```

### 完全展开
完全展开：当循环的数量是**固定**值而且**非常小**，即时编译器将循环完全展开
原本循环中的循环判断语句将不复存在，变成了若干**顺序执行**的循环体
```java
int foo(int[] a) {
    int sum = 0;
    for (int i = 0; i < 4; i++) {
    sum += a[i];
    }
    return sum;
}
```
完全展开
```java
int foo(int[] a) {
    int sum = 0;
    sum += a[0];
    sum += a[1];
    sum += a[2];
    sum += a[3];
    return sum;
}
```
即时编译器会在**循环体的大小**与**循环展开次数**之间作出**权衡**

## 循环判断外提
循环判断外提：**将循环中的if语句外提到循环之前，并且在该if语句的两个分支中分别放置一份循环代码**
```java
int foo(int[] a) {
    int sum = 0;
    for (int i = 0; i < a.length; i++) {
        if (a.length > 4) {
            sum += a[i];
        }
    }
    return sum;
}
```
```java
// 循环判断外提
int foo(int[] a) {
    int sum = 0;
    if (a.length > 4) {
        for (int i = 0; i < a.length; i++) {
            sum += a[i];
        }
    } else {
        for (int i = 0; i < a.length; i++) {
        }
    }
    return sum;
}
// 进一步优化
int foo(int[] a) {
    int sum = 0;
    if (a.length > 4) {
        for (int i = 0; i < a.length; i++) {
            sum += a[i];
        }
    }
    return sum;
}
```
循环**判断外提**与循环**无关检测外提**所针对的代码模式比较类似，都是循环中的**if语句**
循环**无关检测外提**在检查失败时会**抛出异常**，**中止当前的正常执行路径**
循环**判断外提**针对更**常见的情况**，即通过if语句的不同分支执行不同的代码逻辑

## 循环剥离
循环剥离：将循环的**前几个迭代**或者**后几个迭代**剥离出循环的优化方式
通过将这几个特殊的迭代剥离出去，使得原本的循环体的**规律性更加明显**，从而**触发进一步优化**
```java
int foo(int[] a) {
    int j = 0;
    int sum = 0;
    for (int i = 0; i < a.length; i++) {
        sum += a[j];
        j = i;
    }
    return sum;
}
```
剥离第一个迭代
```java
int foo(int[] a) {
    int sum = 0;
    if (0 < a.length) {
        sum += a[0];
        for (int i = 1; i < a.length; i++) {
            sum += a[i - 1];
        }
    }
    return sum;
}
```

<!-- indicate-the-source -->
