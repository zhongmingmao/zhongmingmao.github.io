---
title: 数据结构与算法 -- 复杂度分析
mathjax: true
date: 2019-07-21 13:07:46
categories:
    - Data Structure & Algorithm
tags:
    - Data Structure
    - Algorithm
---

## 大O复杂度表示法

### 累加和
```java
public int cal(int n) {
    int sum = 0;
    int i = 1;
    for (; i <= n; ++i) {
        sum = sum + i;
    }
    return sum;
}
```

<!-- more -->

1. 假设每行代码执行的时间都一样，为$U$
2. 第2、3行分别需要1个$U$的执行时间，第4、5行都运行了n遍，需要$2n \times U$的执行时间
3. 这段代码总共需要$(2n+2) \times U$的执行时间，所有整段代码的总执行时间$T(n)$与每行代码的执行次数成正比

```java
public int cal(int n) {
    int sum = 0;
    int i = 1;
    int j;
    for (; i <= n; ++i) {
        j = 1;
        for (; j <= n; ++j) {
            sum = sum + i * j;
        }
    }
    return sum;
}
```

1. 第2、3、4行分别需要1个$U$的执行时间
2. 第5、6行循环执行了$n$遍，需要$2n \times U$的执行时间、
3. 第7、8行循环执行了$n^2$遍，需要$2n^2 \times U$的执行时间
4. 所有整段代码的总执行时间$T(n) = (2n^2 + 2n + 3) \times U$

### 大O
$$
T(n) = O(f(n))
$$

$T(n)$代表代码的**总执行时间**，n表示数据规模的大小，$f(n)$表示每行代码执行的**次数总和**，**$O$表示$T(n)$和$f(n)$成正比**
大O时间复杂度并不具体表示代码真正的执行时间，而是**代码执行时间随数据规模增长的变化趋势**，称为**渐进时间复杂度**
公式中的低阶、常量、系数这三部分并不左右增长趋势，只需记录**最大的量级**即可，$T(n) = O(2n^2 + 2n + 3) = O(n^2)$

## 时间复杂度分析

### 量级最大
只关注循环执行次数最多的一段代码
```java
public int cal(int n) {
    int sum = 0;            // O(1)
    int i = 1;              // O(1)
    for (; i <= n; ++i) {   // O(n)
        sum = sum + i;      // O(n)
    }
    return sum;
}
```

### 加法法则
总复杂度等于**量级最大**的那段代码的复杂度
```java
public int cal(int n) {
    // 执行了100次，与n的规模无关，0(1)
    int sum_1 = 0;
    int p = 1;
    for (; p < 100; ++p) {
        sum_1 = sum_1 + p;
    }

    // O(n)
    int sum_2 = 0;
    int q = 1;
    for (; q < n; ++q) {
        sum_2 = sum_2 + q;
    }

    // O(n^2)
    int sum_3 = 0;
    int i = 1;
    int j = 1;
    for (; i < n; ++i) {
        j = 1;
        for (; j <= n; ++j) {
            sum_3 = sum_3 + i * j;
        }
    }

    // O(1) + O(n) + O(n^2) = O(n^2)
    return sum_1 + sum_2 + sum_3;
}
```

### 乘法法则
嵌套代码的复杂度等于嵌套内外代码复杂度的乘积
```java
// O(n^2)
public int cal(int n) {
    int ret = 0;
    int i = 1;
    for (; i < n; ++i) {
        ret = ret + f(i);
    }
    return ret;
}

// O(n)
public int f(int n) {
    int sum = 0;
    int i = 1;
    for (; i < n; ++i) {
        sum = sum + i;
    }
    return sum;
}
```

### 常见的时间复杂度

#### 多项式量级
1. 常数阶 $O(1)$
2. 对数阶 $O(\log_{}n)$
3. 线性阶 $O(n)$
4. 线性对数阶 $O(n\log_{}n)$
5. 平方阶 $O(n^2)$、立方阶 $O(n^3)$、k次方阶 $O(n^k)$

#### 非多项式量级
当数据规模越来越大，非多项式量级的执行时间会**急剧增加**，**效率非常低**

1. 指数阶 $O(2^n)$
2. 阶乘阶 $O(n!)$

#### $O(1)$
1. $O(1)$是**常量级**时间复杂度的一种表示方法，并不是指只执行一行代码
2. 只要代码的执行时间不随n的增大而增大，记为$O(1)$

#### $O(\log_{}n)$、$O(n\log_{}n)$
```java
int i = 1;
while (i <= n) {
    i = i * 2;
}
```
$T(n) = O(\log_{2}n) =  O(\log_{}n)$

#### $O(m+n)$、$O(m \times n)$
```java
// O(m+n)
public int cal(int m, int n) {
    int sum_1 = 0;
    for (int i = 1; i <= m; i++) {
        sum_1 = sum_1 + i;
    }

    int sum_2 = 0;
    for (int i = 1; i <= n; i++) {
        sum_2 = sum_2 + i;
    }
    return sum_1 + sum_2;
}
```

## 空间复杂度分析
空间复杂度全称为**渐进空间复杂度**，表示算法的**存储空间**与**数据规模**之间的增长关系
常见的空间复杂度：$O(1)$、$O(n)$、$O(n^2)$

```java
// 空间复杂度 O(n)
public void print(int n) {
    int[] a = new int[n];
    for (int i = 0; i < n; ++i) {
        a[i] = i * i;
    }
    for (int i = n - 1; i >= 0; --i) {
        System.out.println(a[i]);
    }
}
```

## 最好（坏）时间复杂度
```java
public int find(int[] array, int n, int x) {
    int pos = -1;
    for (int i = 0; i < n; i++) {
        if (array[i] == x) {
            pos = i;
            break;
        }
    }
    return pos;
}
```
最好时间复杂度：$O(1)$，最坏时间复杂度：$O(n)$

## 平均时间复杂度
上面代码有n+1种情况，在数组0~n-1位置和不在数组中，假设每种情况出现的**概率相同**，$\frac{1}{n+1}$
大部分情况下，并不需要区分最好、最坏、平均时间复杂度，只有同一代码在不同情况下，时间复杂度有**量级的差距**，才需要区分

$$
O(\frac{\sum_{i=1}^{n}i+n}{n+1}) = O(\frac{n(n+3)}{2(n+1)}) = O(n)
$$

### 加权平均
变量x出现在数组中的概率为$\frac{1}{2}$，出现在数组中特定某个位置的概率为$\frac{1}{2n}$

$$
O(\sum_{i=1}^{n}{\frac{i}{2n}} + \frac{n}{2}) = O(\frac{3n+1}{4}) = O(n)
$$

## 均摊时间复杂度
```java
private int n = 10;
private int[] array = new int[n];
private int count = 0;

public void insert(int val) {
    if (count == array.length) {
        int sum = 0;
        for (int i = 0; i < array.length; i++) {
            sum = sum + array[i];
        }
        // 清空数组，将求和之后的sum值放入到数组的第一个位置
        array[0] = sum;
        count = 1;
    }
    array[count] = val;
    ++count;
}
```
最好时间复杂度：$O(1)$，最坏时间复杂度：$O(n)$，平均时间复杂度：$O(1)$
假设每种情况出现的概率相同，$\frac{1}{n+1}$

$$
O(\sum_{i=1}^{n}{\frac{1}{n+1}} + \frac{n}{n+1}) = O(\frac{2n}{n+1}) = O(1)
$$

摊还分析：每一次$O(n)$的插入操作，都会跟着$n-1$次$O(1)$的插入操作，均摊下来，一组连续操作的均摊时间复杂度为$O(1)$
均摊时间复杂度和摊还分析的应用场景比较特殊，不会经常用到，一般**均摊时间复杂度**就等于**最好时间复杂度**
均摊时间复杂度可以理解为一种特殊的平均时间复杂度，无需区分
