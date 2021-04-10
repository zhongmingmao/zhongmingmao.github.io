---
title: 计算机组成 -- 定点数 + 浮点数
mathjax: true
date: 2020-01-15 09:01:45
categories:
    - Computer Basics
    - Computer Organization
tags:
    - Computer Basics
    - Computer Organization
---

## 浮点数的不精确性
```
>>> 0.3 + 0.6
0.8999999999999999
```
1. 32bit是无法表达所有实数的，只能表达`2^32`次方不同的数字，差不多**40亿**
2. 40亿个数字比起无限多的实数集合只是沧海一粟，应该让这40亿个数映射到实数集合上的哪些数字，在实际应用中才最划算

<!-- more -->

## 定点数
1. 用**4个bit**表示`0~9`的整数，那么32个bit就可以表示8个这样的整数
2. 然后把**最右边的2个**`0~9`的整数，当成**小数**部分；把**最左边6个**`0~9`的整数，当成**整数**部分
3. 这样用32bit可以表示`0.00~999999.99`这**1亿**个实数
4. 这种用**二进制表示十进制**的编码方式，称为**BCD编码**（**Binary-Coded Decimal**）
5. 应用非常广泛：超市、银行
6. 缺点
   - **浪费**
     - 本来32bit可以表示40亿个不同的数字，但在**BCD编码**下，只能表示1亿个数
     - 如果**精确到分**，能够表达的**最大金额**为**100W**，非常有限
   - 无法同时表示**很大的数字**和**很小的数字**

## 浮点数
1. 浮点数的**科学计数法**的表示，有一个**IEEE**的标准，定义了两个基本的格式
    - 一个是用**32bit**表示**单精度**的浮点数，即**float**
    - 一个是用**64bit**表示**双精度**的浮点数，即**double**
2. float
    - **符号位s -- 1bit**
      - 用来表示正数还是负数，所有浮点数都是有符号的
    - **指数位e -- 8bit**
      - 8bit表示的整数空间，为`0~255`，**`1~254`**映射到**`-126~127`**这254个有正有负的数上（差值为**127**）
      - `0`和`255`是**标志位**，主要用于表示**0**和一些**特殊的数**
    - **有效数位f -- 23bit**
    - **$(-1)^s \times 1.f \times 2^e$**
      - 没办法表示0，需要借助指数位e

| 格式 | s=符号位 | e=指数位 | f=有效数位 |
| --- | --- | --- | --- |
| float | 1 bit | 8 bit | 23 bit |

| s | e | f | 浮点数 | 备注 |
| --- | --- | --- | --- | --- |
| 0 or 1 | 0 | 0 | 0 | |
| 0 | 255 | 0 | 无穷大 | |
| 1 | 255 | 0 | 无穷小 | |
| 0 or 1 | 255 | != 0 | NAN | |
| 0 or 1 | 0 | != 0 | 0.f | **暂未消化** |

### 特殊数的Java实现
```java java.lang.Float
/**
  * A constant holding the positive infinity of type
  * {@code float}. It is equal to the value returned by
  * {@code Float.intBitsToFloat(0x7f800000)}.
  */
public static final float POSITIVE_INFINITY = 1.0f / 0.0f;

/**
  * A constant holding the negative infinity of type
  * {@code float}. It is equal to the value returned by
  * {@code Float.intBitsToFloat(0xff800000)}.
  */
public static final float NEGATIVE_INFINITY = -1.0f / 0.0f;

/**
  * A constant holding a Not-a-Number (NaN) value of type
  * {@code float}.  It is equivalent to the value returned by
  * {@code Float.intBitsToFloat(0x7fc00000)}.
  */
public static final float NaN = 0.0f / 0.0f;
```
```java
private static String getFloatBinaryString(float f) {
    StringBuilder builder = new StringBuilder(Integer.toBinaryString(Float.floatToIntBits(f)));
    int length = builder.length();
    if (length < 32) {
        for (int i = 0; i < 32 - length; i++) {
            builder.insert(0, "0");
        }
    }
    String s = builder.toString();
    return s.substring(0, 1) + "-" + s.substring(1, 9) + "-" + s.substring(9, 32) + " -> " + f;
}

public static void main(String[] args) {
    System.out.println(getFloatBinaryString(0.0F));
    System.out.println(getFloatBinaryString(-0.0F));
    System.out.println(getFloatBinaryString(-0.0F));

    System.out.println(getFloatBinaryString(Float.POSITIVE_INFINITY));
    System.out.println(getFloatBinaryString(-Float.POSITIVE_INFINITY));
    System.out.println(getFloatBinaryString(Float.NEGATIVE_INFINITY));
    System.out.println(getFloatBinaryString(-Float.NEGATIVE_INFINITY));

    System.out.println(getFloatBinaryString(Float.NaN));
    System.out.println(getFloatBinaryString(-Float.NaN));
}
```
```
0-00000000-00000000000000000000000 -> 0.0
1-00000000-00000000000000000000000 -> -0.0
0-11111111-00000000000000000000000 -> Infinity
1-11111111-00000000000000000000000 -> -Infinity
1-11111111-00000000000000000000000 -> -Infinity
0-11111111-00000000000000000000000 -> Infinity
0-11111111-10000000000000000000000 -> NaN
0-11111111-10000000000000000000000 -> NaN
```

### 表示

#### 0.5
1. **$0.5 = (-1)^0 \times 1.0 \times 2^{-1}$**
2. **$s=0, f=0, e=-1$**
  - **$e$**表示从`-126~127`个，而-1是其中**第126个**
3. 如果不考虑符号，浮点数能够表示的最小的数和最大的数，差不多是**$1.17 \times 10^{-38}$**和**$3.40 \times 10^{38}$**
  - 比**BSD**编码能表示的范围**大很多**
4. 浮点数是**没法精确表示0.3和0.6的**，而0.5是能够被精确地表示成二进制浮点数的
  - 浮点数无论是**表示**还是**计算（如加法）**其实都是**近似计算**

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-fix-float-0.5.jpg" width=1000/>

```java
public static void main(String[] args) {
    System.out.println(getFloatBinaryString(0.5F));
    System.out.println(getFloatBinaryString(-0.5F));
}
```
```
0-01111110-00000000000000000000000 -> 0.5
1-01111110-00000000000000000000000 -> -0.5
```

#### 9.1
1. 输入一个任意的**十进制浮点数**，背后都会对应一个**二进制表示**
2. 首先把**整数**部分转换成一个二进制，9对应为`1001`
3. 把对应的**小数**部分也换成二进制
  - 二进制小数`0.1001`：**$1 \times 2^{-1} + 0 \times 2^{-2} + 0 \times 2^{-3} + 1 \times 2^{-4} = 0.5625$**
  - **十进制小数** -> **二进制小数**
    - **× 2，然后看是否超过1，如果超过1，就记为1，并把结果减去1，进一步循环操作**
    - 参照下表，0.1的二进制小数为`0.000110011...`
4. 把整数部分和小数部分**拼接**在一起，9.1的二进制表示为`1001.000110011...`
  - 二进制的科学计数法：**$1.001000110011... \times 2^{3}$**
  - 此时可以对应到浮点数的格式，**$s=0, e=3+127=130=0b10000010, f=00100011001100110011001$**
    - f最长只有23位，无限循环二进制小数会被**截断**（只能用近似值**表示**的**根本原因**）
    - 指数位有正有负，映射到浮点数格式，需要加上**偏移量127**
  - 浮点数9.1的二进制表示`0-10000010-00100011001100110011001`
    - 再换算成十进制为`9.09999942779541015625 ≈ 9.1`，只是一个**近似值**

| 行号 | 算式 | 是否超过1 | 二进制位 | 剩余差值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.1 × 2 = 0.2 | 否 | 0 | 0.2 |  |
| 2 | 0.2 × 2 = 0.4 | 否 | 0 | 0.4 |  |
| 3 | 0.4 × 2 = 0.8 | 否 | 0 | 0.8 |  |
| 4 | 0.8 × 2 = 1.6 | 是 | 1 | 0.6 |  |
| 5 | 0.6 × 2 = 1.2 | 是 | 1 | 0.2 |  |
| 6 | 0.2 × 2 = 0.4 | 否 | 0 | 0.4 | 开始重复，第2~4行 |

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-fix-float-9.1.jpg" width=1000/>

### 运算（加法）
1. 原则：**先对齐、再计算**
2. 两个浮点数的指数位可能是不一样的，需要先把两个**指数位变成一样**的，然后**只去计算有效位的加法**

#### 0.5 + 0.125
1. **0.5**对应的指数位是`-1`，有效位是`00...`（前面默认有个1）
2. **0.125**对应的指数位为`-3`，有效位是`00...`（前面默认有个1）
  - 先**对齐**，把指数位统一成`-1`，对应的有效位`1.00...`要对应的**右移**两位，变成`0.01...`
3. 计算两者相加的有效位`1.f`，变成了`1.01`，而指数位为`-1`
4. 实现这样一个加法，**只需要位移**，在**电路层面**，并**没有引入太多新的复杂性**

| | 符号位s | 指数位e | 有效位1.f |
| --- | --- | --- | --- |
| 0.5 | 0 | -1 | 1.00... |
| 0.125 | 0 | -3 | 1.00... |
| 0.125：**对齐指数位** + **有效位右移** | 0 | -1 | 0.01... |
| 0.5+0.125 | 0 | -1 | 1.01... |

```java
public static void main(String[] args) {
    System.out.println(getFloatBinaryString(0.5F));
    System.out.println(getFloatBinaryString(0.125F));
    System.out.println(getFloatBinaryString(0.5F + 0.125F));
}
```
```
0-01111110-00000000000000000000000 -> 0.5
0-01111100-00000000000000000000000 -> 0.125
0-01111110-01000000000000000000000 -> 0.625
```

#### 精度丢失
1. 在上面浮点数的加法过程中，**指数位较小**的数，需要进行**有效位的右移**，最右侧的有效位就会被**丢弃**
2. 两个相加数的**指数位相差得越大**，位移的位数就越大，**可能丢失的精度就越大**
3. 32位浮点数的有效位长度一共只有**23**位，如果两个数的指数位相差超过23位，较小的数右移24位之后，所有的有效位**都丢失**了
4. 解决方案（**软件层面算法**）：[Kahan summation algorithm](https://en.wikipedia.org/wiki/Kahan_summation_algorithm)

```java
float a = 1 << 24;
float b = 1.0f;
System.out.println(getFloatBinaryString(a));

float c = a + b;
System.out.println(getFloatBinaryString(c));
float d = c - a;
System.out.println(getFloatBinaryString(d));
```
```
0-10010111-00000000000000000000000 -> 1.6777216E7
0-10010111-00000000000000000000000 -> 1.6777216E7
0-00000000-00000000000000000000000 -> 0.0
```
```java
float a = 1 << 24;
System.out.println(a); // 1.6777216E7

float sum = 0.0f;
for (int i = 0; i < 20_000_000; i++) {
    float x = 1.0f;
    sum += x;
}
// 精度丢失，积少成多会导致误差很大
System.out.println("sum is " + sum); // 1.6777216E7
```

## 小结
1. 一般情况下，在实际应用中，如果需要**精确数值**（如银行存款、电商交易），一般会使用**定点数**或者**整数**
2. 浮点数适用情况：**不需要非常精确**的计算结果

## 参考资料
[深入浅出计算机组成原理](https://time.geekbang.org/column/intro/100026001)