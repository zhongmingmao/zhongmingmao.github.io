---
title: 对象内存布局 - Instrumentation + sa-jdi 实例分析
date: 2016-06-29 00:06:25
categories:
    - JVM
tags:
    - Netease
    - JVM
---

{% note info %}
本文将通过`Instrumentation` + `sa-jdi`来分析几个实例的内存对象布局
{% endnote %}

<!-- more -->

# 关键概念

1. Java对象的内存布局：对象头(`Header`) + 实例数据（`Instance Data`） + 对其填充（`Padding`）
2. `Header`具体内容
    - `Mark Word`：存储对象hashCode、锁信息等
    - `Class MetaData Address`：存储对象类型数据的指针
    - `Array Length`：数组的长度（如果当前对象是数组，否则没有这一内容）
3. HotSpot JVM中对象的对齐方式：`8字节对齐`
4. `实例域重排序`：为了`节省内存空间`，实例域将按（`double/long`，`int/float`，`short/char`，`boolean/byte`，`reference`）进行重排序
5. `非静态内部类`：有一个`隐藏的对外部类的引用`
6. `指针压缩`：影响对象的内存布局，JVM参数：`-XX:+UseCompressedOops`

指针压缩的影响

| 是否开启压缩 | Mark Word | Class MetaData Address | Reference |
| --- | --- | --- | --- |
| 否 | 8 | 8 | 8 |
| 是 | 8 | 4 | 4 |

# 指针压缩

## 代码
```java
public class CompressedOopsTestClass {

    int intValue;
    Integer integerRef;
    Integer[] integerArrayRef = new Integer[3];
}
```

## 开启压缩

### 运行结果
```
me.zhongmingmao.create.classes.CompressedOopsTestClass : shallow size = 24 Bytes , retained size= 56 Bytes
```

### 内存映像
```
Oop for me/zhongmingmao/create/classes/CompressedOopsTestClass @ 0x00000007bffe4e78 (object size = 24)
 - _mark:    {0} :392050833673
 - _metadata._compressed_klass:  {8} :InstanceKlass for me/zhongmingmao/create/classes/CompressedOopsTestClass
 - intValue:     {12} :0
 - integerRef:   {16} :null
 - integerArrayRef:  {20} :ObjArray @ 0x00000007bffe4e90

ObjArray @ 0x00000007bffe4e90 (object size = 32)
 - _mark:    {0} :490473115401
 - _metadata._compressed_klass:  {8} :ObjArrayKlass for InstanceKlass for java/lang/Integer
 - 0:    {16} :null
 - 1:    {20} :null
 - 2:    {24} :null
```

### 对象布局
![compressed.png](http://ot85c3jox.bkt.clouddn.com/compressed.png)

## 关闭压缩

### 运行结果
```
me.zhongmingmao.create.classes.CompressedOopsTestClass : shallow size = 40 Bytes , retained size= 88 Bytes
```

### 内存映像
```
Oop for me/zhongmingmao/create/classes/CompressedOopsTestClass @ 0x000000011602d7f8 (object size = 40)
 - _mark:    {0} :392050833665
 - _metadata._klass:     {8} :InstanceKlass for me/zhongmingmao/create/classes/CompressedOopsTestClass
 - intValue:     {16} :0
 - integerRef:   {24} :null
 - integerArrayRef:  {32} :ObjArray @ 0x000000011602da20

ObjArray @ 0x000000011602da20 (object size = 48)
 - _mark:    {0} :490473115393
 - _metadata._klass:     {8} :ObjArrayKlass for InstanceKlass for java/lang/Integer
 - 0:    {24} :null
 - 1:    {32} :null
 - 2:    {40} :null
```

### 对象布局
![uncompressed.png](http://ot85c3jox.bkt.clouddn.com/uncompressed.png)

# 实例域重排序

## 代码
```java
public class ReorderingTestClass {
    Object   objectRef;
    Integer integerRef;
    int intValue_1;
    int intValue_2;
    byte byteValue_1;
    byte byteValue_2;
    byte byteValue_3;
    short shortValue_1;
    long longValue_1;
    Long[] longArrayRef;
}
```

## 运行结果
```
# 默认进行指针压缩
me.zhongmingmao.create.classes.ReorderingTestClass : shallow size = 48 Bytes , retained size= 48 Bytes
```

## 内存映像
```
Oop for me/zhongmingmao/create/classes/ReorderingTestClass @ 0x00000007bfe2c750 (object size = 48)
 - _mark:    {0} :40809812993
 - _metadata._compressed_klass:  {8} :InstanceKlass for me/zhongmingmao/create/classes/ReorderingTestClass
 - objectRef:    {36} :null
 - integerRef:   {40} :null
 - intValue_1:   {12} :0
 - intValue_2:   {24} :0
 - byteValue_1:  {30} :0
 - byteValue_2:  {31} :0
 - byteValue_3:  {32} :0
 - shortValue_1:     {28} :0
 - longValue_1:  {16} :0
 - longArrayRef:     {44} :null
```

## 对象布局
![reordering_1.png](http://ot85c3jox.bkt.clouddn.com/reordering_1.png)
1. 实例域重排序的主要目的是为了`让内存更为紧凑`，因为`Hotspot JVM`在内存中是`8Byte对齐`，必然会出现上面左图那样的内存浪费
2. 大致原则上是按照`double/long`，`int/float`，`short/char`，`boolean/byte`，`reference`的优先级进行重排序，但还有进一步优化，如果有比自身优先级低的但能填充自己无法填充的区域，则让优先级低的进行填充（表述有点拗口）
    - 如右图中，`12`的位置原本尝试填充`longValue_1`，但由于`long需要8 Bytes`和`字节对齐`，无法填充，而`intValue_1`恰好能填充这原本会被浪费的空间，让内存更为紧凑
3. 从上图可知，进行实例域重排序能更有效的利用内存

# 内部类

## 代码
```java
public class OuterClass {
    InnerClass innerClassRef;

    public OuterClass() {
        this.innerClassRef = new InnerClass();
    }

    class InnerClass {
        Integer integerRef;
    }
}
```

## 运行结果
```
me.zhongmingmao.create.classes.OuterClass : shallow size = 16 Bytes , retained size= 40 Bytes
```

## 内存映像
```
Oop for me/zhongmingmao/create/classes/OuterClass @ 0x00000007bfe30b40 (object size = 16)
 - _mark:    {0} :128250200577
 - _metadata._compressed_klass:  {8} :InstanceKlass for me/zhongmingmao/create/classes/OuterClass
 - innerClassRef:    {12} :Oop for me/zhongmingmao/create/classes/OuterClass$InnerClass @ 0x00000007bfe30b50

Oop for me/zhongmingmao/create/classes/OuterClass$InnerClass @ 0x00000007bfe30b50 (object size = 24)
 - _mark:    {0} :47710727425
 - _metadata._compressed_klass:  {8} :InstanceKlass for me/zhongmingmao/create/classes/OuterClass$InnerClass
 - integerRef:   {12} :null
 - this$0:   {16} :Oop for me/zhongmingmao/create/classes/OuterClass @ 0x00000007bfe30b40
```

## 对象布局
![innerclass.png](http://ot85c3jox.bkt.clouddn.com/innerclass.png)
`非静态内部类`隐藏有一个的对`外部类的引用`（`this$0`）

# 继承

## 代码
```java
public class Father {

    int intValue;
    Integer integerRef;

    public Father() {
        integerRef = new Integer(1 << 10);
    }

}
```
```java
public class Son extends Father {

    byte byteValue;
    short shortValue;
    Integer[] integerArrayRef = new Integer[3];
}
```
```java
public class GranSon extends Son {

    boolean booleanValue;
    Father[] fatherArrayRef = new Father[3];

    public GranSon() {
        for (int i = 0; i < fatherArrayRef.length; ++i) {
            fatherArrayRef[i] = new Father();
        }
    }

}
```

## 运行结果
```
me.zhongmingmao.create.classes.Father : shallow size = 24 Bytes , retained size= 40 Bytes
me.zhongmingmao.create.classes.Son : shallow size = 32 Bytes , retained size= 80 Bytes
me.zhongmingmao.create.classes.GranSon : shallow size = 40 Bytes , retained size= 240 Bytes
```

## 内存映像
```
# 只摘录了GranSon对象的完整记录，对于Son和Father的分析也是类似的
Oop for me/zhongmingmao/create/classes/GranSon @ 0x00000007bfe364e8 (object size = 40)
 - _mark:    {0} :116709573121
 - _metadata._compressed_klass:  {8} :InstanceKlass for me/zhongmingmao/create/classes/GranSon
 - intValue:     {12} :0
 - integerRef:   {16} :Oop for java/lang/Integer @ 0x00000007bfe36510
 - byteValue:    {22} :0
 - shortValue:   {20} :0
 - integerArrayRef:  {24} :ObjArray @ 0x00000007bfe36520
 - booleanValue:     {28} :false
 - fatherArrayRef:   {32} :ObjArray @ 0x00000007bfe365a8

# integerRef
Oop for java/lang/Integer @ 0x00000007bfe36510 (object size = 16)
 - _mark:    {0} :1
 - _metadata._compressed_klass:  {8} :InstanceKlass for java/lang/Integer
 - value:    {12} :1024

# integerArrayRef
ObjArray @ 0x00000007bfe36520 (object size = 32)
 - _mark:    {0} :440814568449
 - _metadata._compressed_klass:  {8} :ObjArrayKlass for InstanceKlass for java/lang/Integer
 - 0:    {16} :null
 - 1:    {20} :null
 - 2:    {24} :null

# fatherArrayRef
ObjArray @ 0x00000007bfe365a8 (object size = 32)
 - _mark:    {0} :131009079297
 - _metadata._compressed_klass:  {8} :ObjArrayKlass for InstanceKlass for me/zhongmingmao/create/classes/Father
 - 0:    {16} :Oop for me/zhongmingmao/create/classes/Father @ 0x00000007bfe365c8
 - 1:    {20} :Oop for me/zhongmingmao/create/classes/Father @ 0x00000007bfe365f0
 - 2:    {24} :Oop for me/zhongmingmao/create/classes/Father @ 0x00000007bfe36618

# fatherArrayRef[0]
Oop for me/zhongmingmao/create/classes/Father @ 0x00000007bfe365c8 (object size = 24)
 - _mark:    {0} :306715851521
 - _metadata._compressed_klass:  {8} :InstanceKlass for me/zhongmingmao/create/classes/Father
 - intValue:     {12} :0
 - integerRef:   {16} :Oop for java/lang/Integer @ 0x00000007bfe365e0

Oop for java/lang/Integer @ 0x00000007bfe365e0 (object size = 16)
 - _mark:    {0} :1
 - _metadata._compressed_klass:  {8} :InstanceKlass for java/lang/Integer
 - value:    {12} :1024

# fatherArrayRef[1]
Oop for me/zhongmingmao/create/classes/Father @ 0x00000007bfe365f0 (object size = 24)
 - _mark:    {0} :54816361729
 - _metadata._compressed_klass:  {8} :InstanceKlass for me/zhongmingmao/create/classes/Father
 - intValue:     {12} :0
 - integerRef:   {16} :Oop for java/lang/Integer @ 0x00000007bfe36608

Oop for java/lang/Integer @ 0x00000007bfe36608 (object size = 16)
 - _mark:    {0} :1
 - _metadata._compressed_klass:  {8} :InstanceKlass for java/lang/Integer
 - value:    {12} :1024

# fatherArrayRef[2]
Oop for me/zhongmingmao/create/classes/Father @ 0x00000007bfe36618 (object size = 24)
 - _mark:    {0} :101599592961
 - _metadata._compressed_klass:  {8} :InstanceKlass for me/zhongmingmao/create/classes/Father
 - intValue:     {12} :0
 - integerRef:   {16} :Oop for java/lang/Integer @ 0x00000007bfe36630

Oop for java/lang/Integer @ 0x00000007bfe36630 (object size = 16)
 - _mark:    {0} :1
 - _metadata._compressed_klass:  {8} :InstanceKlass for java/lang/Integer
 - value:    {12} :1024
```

## 对象布局
![inherit_1.png](http://ot85c3jox.bkt.clouddn.com/inherit_1.png)
1. `父类实例字段在子类实例字段前面`，只有`类自身定义的实例域`才会进行`重排序`，不会跨域到父类或子类
    - 例如在GranSon的`23`的位置其实可以存放`booleanValue`，但由于来自Son的实例域还有`integerArrayRef`没有填充完，因此只能是`padding`
    - 因此，`子类实例域不会插入到父类实例域的空隙中`
2. retained size= 240 Bytes
    - 240 = (24 + 16) * 3 + 32 + 32 +16 + 40

<!-- indicate-the-source -->
