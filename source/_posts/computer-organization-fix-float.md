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
      - 8bit表示的整数空间，为`0~255`，**`1~254`**映射到**`-126~127`**这254个有正有负的数上
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

### 0.5
1. **$0.5 = (-1)^0 \times 1.0 \times 2^{-1}$**
2. **$s=0, f=0, e=-1$**
  - **$e$**表示从`-126~127`个，而-1是其中**第126个**
3. 如果不考虑符号，浮点数能够表示的最小的数和最大的数，差不多是**$1.17 \times 10^{-38}$**和**$3.40 \times 10^{38}$**
  - 比**BSD**编码能表示的范围**大很多**
4. 浮点数是**没法精确表示0.3和0.6的**，而0.5是能够被精确地表示成二进制浮点数的
  - 浮点数无论是**表示**还是**计算**其实都是**近似计算**

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