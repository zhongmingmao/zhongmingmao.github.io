---
title: 对象内存布局 - JOL使用教程 1
date: 2016-07-02 00:06:25
categories:
    - 网易这两年
    - JVM
tags:
    - 网易这两年
    - JVM
    - JOL
---

{% note info %}
本文将通过`JOL`分析`Java对象的内存布局`，包括`基本使用`、`字节对齐`、`实例域重排序`、`继承`、`继承栅栏`、`继承对齐`等内容
代码托管在[https://github.com/zhongmingmao/java_object_layout](https://github.com/zhongmingmao/java_object_layout)
{% endnote %}

<!-- more -->

# Maven依赖
```xml
<dependency>
  <groupId>org.openjdk.jol</groupId>
  <artifactId>jol-core</artifactId>
  <version>0.8</version>
</dependency>
```

# 基本使用

## 代码
```Java
// JVM Args : -Djol.tryWithSudo=true
public class JOLSample_01_Basic {
    
    public static void main(String[] args) throws Exception {
        out.println(VM.current().details());
        out.println(ClassLayout.parseClass(A.class).toPrintable());
    }
    
    public static class A {
        boolean f;
    }
}
```

## 运行结果
```
# Running 64-bit HotSpot VM.
# Using compressed oop with 3-bit shift.
# Using compressed klass with 3-bit shift.
# Objects are 8 bytes aligned.
# Field sizes by type: 4, 1, 1, 2, 2, 4, 4, 8, 8 [bytes]
# Array element sizes: 4, 1, 1, 2, 2, 4, 4, 8, 8 [bytes]

me.zhongmingmao.jol.JOLSample_01_Basic$A object internals:
 OFFSET  SIZE      TYPE DESCRIPTION                               VALUE
      0    12           (object header)                           N/A
     12     1   boolean A.f                                       N/A
     13     3           (loss due to the next object alignment)
Instance size: 16 bytes
Space losses: 0 bytes internal + 3 bytes external = 3 bytes total
```

## 对象布局
![jol_basic_1.png](http://ot85c3jox.bkt.clouddn.com/jol_basic_1.png)

## 分析
1. `64-bit HotSpot JVM`默认开启`指针压缩`，`Mark Word`占用`8 Bytes`，`Klass Ref`占用`4 Bytes`，`对象头`总共占据了`12 Bytes`（如果是`数组对象`，对象头还会包括`4 Bytes`的`Array Length`，总共占据`16 Bytes`）
2. `64-bit HotSpot JVM`是`8 Bytes对齐`，因此有`3 Byte`的字节填充（`Padding`）

# 字节对齐

## 代码
```Java
// JVM Args : -Djol.tryWithSudo=true
public class JOLSample_02_Alignment {
    
    public static void main(String[] args) throws Exception {
        out.println(VM.current().details());
        out.println(ClassLayout.parseClass(A.class).toPrintable());
    }
    
    public static class A {
        long f;
    }
}
```

## 运行结果
```
# Running 64-bit HotSpot VM.
# Using compressed oop with 3-bit shift.
# Using compressed klass with 3-bit shift.
# Objects are 8 bytes aligned.
# Field sizes by type: 4, 1, 1, 2, 2, 4, 4, 8, 8 [bytes]
# Array element sizes: 4, 1, 1, 2, 2, 4, 4, 8, 8 [bytes]

me.zhongmingmao.jol.JOLSample_02_Alignment$A object internals:
 OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
      0    12        (object header)                           N/A
     12     4        (alignment/padding gap)                  
     16     8   long A.f                                       N/A
Instance size: 24 bytes
Space losses: 4 bytes internal + 0 bytes external = 4 bytes total
```

## 对象布局
![jol_alignment.png](http://ot85c3jox.bkt.clouddn.com/jol_alignment.png)

## 分析
1. `a.f`是`long类型`，占用`8 Bytes`，由于`8 Bytes字节对齐`的限制，无法放入`12~15`的位置，因此`12~15`只能是`Padding`
2. `a.f`顺延到`16~23`的位置

# 实例域重排序

## 代码
```Java
// JVM Args : -Djol.tryWithSudo=true
public class JOLSample_03_Packing {
    
    public static void main(String[] args) throws Exception {
        out.println(VM.current().details());
        out.println(ClassLayout.parseClass(A.class).toPrintable());
    }
    
    public static class A {
        boolean bo1, bo2;
        byte b1, b2;
        char c1, c2;
        double d1, d2;
        float f1, f2;
        int i1, i2;
        long l1, l2;
        short s1, s2;
    }  
}
```

## 运行结果
```
# Running 64-bit HotSpot VM.
# Using compressed oop with 3-bit shift.
# Using compressed klass with 3-bit shift.
# Objects are 8 bytes aligned.
# Field sizes by type: 4, 1, 1, 2, 2, 4, 4, 8, 8 [bytes]
# Array element sizes: 4, 1, 1, 2, 2, 4, 4, 8, 8 [bytes]

me.zhongmingmao.jol.JOLSample_03_Packing$A object internals:
 OFFSET  SIZE      TYPE DESCRIPTION                               VALUE
      0    12           (object header)                           N/A
     12     4     float A.f1                                      N/A
     16     8    double A.d1                                      N/A
     24     8    double A.d2                                      N/A
     32     8      long A.l1                                      N/A
     40     8      long A.l2                                      N/A
     48     4     float A.f2                                      N/A
     52     4       int A.i1                                      N/A
     56     4       int A.i2                                      N/A
     60     2      char A.c1                                      N/A
     62     2      char A.c2                                      N/A
     64     2     short A.s1                                      N/A
     66     2     short A.s2                                      N/A
     68     1   boolean A.bo1                                     N/A
     69     1   boolean A.bo2                                     N/A
     70     1      byte A.b1                                      N/A
     71     1      byte A.b2                                      N/A
Instance size: 72 bytes
Space losses: 0 bytes internal + 0 bytes external = 0 bytes total
```

## 对象布局
![jol_packing.png](http://ot85c3jox.bkt.clouddn.com/jol_packing.png)

## 分析
1. 「对象内存布局 - Instrumentation + sa-jdi 实例分析」也存在类似的实例
2. `实例域重排序`是为了让`内存更紧凑`
3. 重排序规则：按照`域占用空间大小来倒排`，`8->4->2->1`，即`double/long`->`int/float`->`short/char`->`boolean/byte`->`reference`
4. 如果间隙能容纳`占用空间更小的实例域`，则将该间隙分配给该实例域，因此`A.f1`会排在了`A.d1`前面
5. 由上面左右图对比可知，进行了实例域重排序后，节省了`8 Bytes`的内存空间
6. 由于实例域重排序，也导致了实例域在`内存中的顺序`和`声明的顺序`往往是`不一致`的

# 继承

## 代码
```Java
// JVM Args : -Djol.tryWithSudo=true
public class JOLSample_04_Inheritance {
    
    public static void main(String[] args) throws Exception {
        out.println(VM.current().details());
        out.println(ClassLayout.parseClass(C.class).toPrintable());
    }
    
    public static class A {
        int a;
    }
    
    public static class B extends A {
        int b;
    }
    
    public static class C extends B {
        int c;
    } 
}
```

## 运行结果
```
# Running 64-bit HotSpot VM.
# Using compressed oop with 3-bit shift.
# Using compressed klass with 3-bit shift.
# Objects are 8 bytes aligned.
# Field sizes by type: 4, 1, 1, 2, 2, 4, 4, 8, 8 [bytes]
# Array element sizes: 4, 1, 1, 2, 2, 4, 4, 8, 8 [bytes]

me.zhongmingmao.jol.JOLSample_04_Inheritance$C object internals:
 OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
      0    12        (object header)                           N/A
     12     4    int A.a                                       N/A
     16     4    int B.b                                       N/A
     20     4    int C.c                                       N/A
Instance size: 24 bytes
Space losses: 0 bytes internal + 0 bytes external = 0 bytes total
```

## 对象布局
![jol_inheritance.png](http://ot85c3jox.bkt.clouddn.com/jol_inheritance.png)

## 分析
1. 在继承关系`C->B->A`中，`父类的实例域`必然排在`子类的实例域`之前

# 继承栅栏

## 代码
```Java
// -Djol.tryWithSudo=true
public class JOLSample_05_InheritanceBarrier {
    
    public static void main(String[] args) throws Exception {
        out.println(VM.current().details());
        out.println(ClassLayout.parseClass(C.class).toPrintable());
    }
    
    public static class A {
        long a;
    }
    
    public static class B extends A {
        int b;
    }
    
    public static class C extends B {
        int c;
        long d;
    }
}
```

## 运行结果
```
# Running 64-bit HotSpot VM.
# Using compressed oop with 3-bit shift.
# Using compressed klass with 3-bit shift.
# Objects are 8 bytes aligned.
# Field sizes by type: 4, 1, 1, 2, 2, 4, 4, 8, 8 [bytes]
# Array element sizes: 4, 1, 1, 2, 2, 4, 4, 8, 8 [bytes]

me.zhongmingmao.jol.JOLSample_05_InheritanceBarrier$C object internals:
 OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
      0    12        (object header)                           N/A
     12     4        (alignment/padding gap)                  
     16     8   long A.a                                       N/A
     24     8   long B.b                                       N/A
     32     8   long C.c                                       N/A
     40     4    int C.d                                       N/A
     44     4        (loss due to the next object alignment)
Instance size: 48 bytes
Space losses: 4 bytes internal + 4 bytes external = 8 bytes total
```

## 对象布局
![jol_inheritance_barrier.png](http://ot85c3jox.bkt.clouddn.com/jol_inheritance_barrier.png)

## 分析
1. 继承栅栏（`inheritance barrier`）通俗点就是在继承关系中，分配当前类的实例域时，`Hotspot JVM`不会考虑在之前可能存在的`内存间隙`，`实例域的重排序仅限于当前类`，因此`父类的实例域`必然排在`子类的实例域`之前
2. 因此`C.d`不会被提升到`12`的位置

# 继承对齐
继承对齐只是我个人的表述，指的是在继承关系中，`Hotspot JVM`会通过`Padding`的的方式将`每个类自身定义的实例域总空间`填充为`引用大小(4 Bytes/8 Bytes)的整数倍`

## 代码
```Java
// -Djol.tryWithSudo=true
public class JOLSample_06_Gaps {
    
    public static void main(String[] args) throws Exception {
        out.println(VM.current().details());
        out.println(ClassLayout.parseClass(C.class).toPrintable());
    }
    
    public static class A {
        boolean a;
    }
    
    public static class B extends A {
        boolean b;
    }
    
    public static class C extends B {
        boolean c;
    }
}
```

## 运行结果
```
# Running 64-bit HotSpot VM.
# Using compressed oop with 3-bit shift.
# Using compressed klass with 3-bit shift.
# Objects are 8 bytes aligned.
# Field sizes by type: 4, 1, 1, 2, 2, 4, 4, 8, 8 [bytes]
# Array element sizes: 4, 1, 1, 2, 2, 4, 4, 8, 8 [bytes]

me.zhongmingmao.jol.JOLSample_06_Gaps$C object internals:
 OFFSET  SIZE      TYPE DESCRIPTION                               VALUE
      0    12           (object header)                           N/A
     12     1   boolean A.a                                       N/A
     13     3           (alignment/padding gap)                  
     16     1   boolean B.b                                       N/A
     17     3           (alignment/padding gap)                  
     20     1   boolean C.c                                       N/A
     21     3           (loss due to the next object alignment)
Instance size: 24 bytes
Space losses: 6 bytes internal + 3 bytes external = 9 bytes total
```

## 对象布局
![jol_inheritance_gap.png](http://ot85c3jox.bkt.clouddn.com/jol_inheritance_gap.png)

## 分析
1. `64-bit Hotspot JVM`默认是开启`指针压缩`，因为引用大小为`4 Bytes`
2. 由于`继承补全`的限制，因此在`B.b`没有存放在`13`的位置，而是等A继承对齐后，存放在`16`的位置

<!-- indicate-the-source -->


