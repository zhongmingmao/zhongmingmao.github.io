---
title: 对象内存布局 - JOL使用教程 2
date: 2016-07-03 00:06:25
categories:
    - 网易这两年
    - JVM
tags:
    - 网易这两年
    - JVM
    - JOL
---

{% note info %}
本文将通过`JOL`分析`Java对象的内存布局`，包括`Throwable`、`Class`、`Object Header`、`HashCode`等内容
代码托管在[https://github.com/zhongmingmao/java_object_layout](https://github.com/zhongmingmao/java_object_layout)
{% endnote %}

<!-- more -->

# Throwable

## 代码
```Java
// JVM Args : -Djol.tryWithSudo=true
public class JOLSample_07_Exceptions {
    
    public static void main(String[] args) throws Exception {
        out.println(VM.current().details());
        out.println(ClassLayout.parseClass(Throwable.class).toPrintable());
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

java.lang.Throwable object internals:
 OFFSET  SIZE                            TYPE DESCRIPTION                               VALUE
      0    12                                 (object header)                           N/A
     12     4                                 (alignment/padding gap)                  
     16     4                java.lang.String Throwable.detailMessage                   N/A
     20     4             java.lang.Throwable Throwable.cause                           N/A
     24     4   java.lang.StackTraceElement[] Throwable.stackTrace                      N/A
     28     4                  java.util.List Throwable.suppressedExceptions            N/A
Instance size: 32 bytes
Space losses: 4 bytes internal + 0 bytes external = 4 bytes total
```

## 分析
1. 在内存中并没有为`Throwable.backtrace`分配空间，这是因为这个实例域用于处理`虚拟机的内部信息`（`VM internal info`），因此**`在任何条件下都不允许用户访问`**
2. 下面尝试用`反射`的机制访问`Throwable.backtrace`

## 反射测试代码
```Java
@Test(expected = NoSuchFieldException.class)
public void backtraceTest() throws NoSuchFieldException {
   try {
       new Throwable().getClass().getDeclaredField("backtrace");
   } catch (NoSuchFieldException e) {
       System.err.println(String.format("无法通过反射获得Throwable的backtrace实例域 ，%s", e));
       throw e;
   }
}
```
在尝试通过`反射`获取`Throwable的backtrace实例域`时，会抛出`NoSuchFieldException`

# Class

## 代码
```Java
// JVM Args : -Djol.tryWithSudo=true
public class JOLSample_08_Class {
    
    public static void main(String[] args) throws Exception {
        out.println(VM.current().details());
        out.println(ClassLayout.parseClass(Class.class).toPrintable());
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

java.lang.Class object internals:
 OFFSET  SIZE                                              TYPE DESCRIPTION                               VALUE
      0    12                                                   (object header)                           N/A
     12     4                     java.lang.reflect.Constructor Class.cachedConstructor                   N/A
     16     4                                   java.lang.Class Class.newInstanceCallerCache              N/A
     20     4                                  java.lang.String Class.name                                N/A
     24     4                                                   (alignment/padding gap)                  
     28     4                       java.lang.ref.SoftReference Class.reflectionData                      N/A
     32     4   sun.reflect.generics.repository.ClassRepository Class.genericInfo                         N/A
     36     4                                java.lang.Object[] Class.enumConstants                       N/A
     40     4                                     java.util.Map Class.enumConstantDirectory               N/A
     44     4                    java.lang.Class.AnnotationData Class.annotationData                      N/A
     48     4             sun.reflect.annotation.AnnotationType Class.annotationType                      N/A
     52     4                java.lang.ClassValue.ClassValueMap Class.classValueMap                       N/A
     56    32                                                   (alignment/padding gap)                  
     88     4                                               int Class.classRedefinedCount                 N/A
     92     4                                                   (loss due to the next object alignment)
Instance size: 96 bytes
Space losses: 36 bytes internal + 4 bytes external = 40 bytes total
```

## 分析
1. 在`56`的位置开始有`32 Bytes`的的内存空间，`JVM`会向该内存区域注入`元数据`（`meta-information`），相关内容请看下来`CPP`代码，暂未弄懂其中原理
2. http://hg.openjdk.java.net/jdk8/jdk8/hotspot/file/tip/src/share/vm/classfile/javaClasses.hpp
3. http://hg.openjdk.java.net/jdk8/jdk8/hotspot/file/tip/src/share/vm/classfile/javaClasses.cpp

# Object Header

## 代码
```Java
// JVM Args : -Djol.tryWithSudo=true
public class JOLSample_11_ClassWord {
    
    public static void main(String[] args) throws Exception {
        out.println(VM.current().details());
        out.println(ClassLayout.parseInstance(new A()).toPrintable());
        out.println(ClassLayout.parseInstance(new B()).toPrintable());
    }
    
    public static class A {
        // no fields
    }
    
    public static class B {
        // no fields
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

me.zhongmingmao.jol.JOLSample_11_ClassWord$A object internals:
 OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
      0     4        (object header)                           01 00 00 00 (00000001 00000000 00000000 00000000) (1)
      4     4        (object header)                           00 00 00 00 (00000000 00000000 00000000 00000000) (0)
      8     4        (object header)                           a2 f0 00 f8 (10100010 11110000 00000000 11111000) (-134156126)
     12     4        (loss due to the next object alignment)
Instance size: 16 bytes
Space losses: 0 bytes internal + 4 bytes external = 4 bytes total

me.zhongmingmao.jol.JOLSample_11_ClassWord$B object internals:
 OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
      0     4        (object header)                           01 00 00 00 (00000001 00000000 00000000 00000000) (1)
      4     4        (object header)                           00 00 00 00 (00000000 00000000 00000000 00000000) (0)
      8     4        (object header)                           32 f2 00 f8 (00110010 11110010 00000000 11111000) (-134155726)
     12     4        (loss due to the next object alignment)
Instance size: 16 bytes
Space losses: 0 bytes internal + 4 bytes external = 4 bytes total
```

## 分析
1. 在`Hotspot JVM`中，对象头（Object Header）由两部分组成`Mark Word`和`Class Word`（即「对象内存布局 - Instrumentation + sa-jdi 实例分析」中的`Klass Ref`）
2. 上述运行结果将对象头的值都打印出来了，方便进行更详细地分析，因为`hashCode`和`锁信息`都存储在`Mark Word`中

# HashCode

## 代码
```Java
// JVM Args : -Djol.tryWithSudo=true
public class JOLSample_15_IdentityHashCode {
    
    public static void main(String[] args) throws Exception {
        out.println(VM.current().details());
        
        final A a = new A();
        
        ClassLayout layout = ClassLayout.parseInstance(a);
        
        out.println("**** Fresh object");
        out.println(layout.toPrintable());
        
        out.println("hashCode: " + Integer.toHexString(a.hashCode()));
        out.println();
        
        out.println("**** After identityHashCode()");
        out.println(layout.toPrintable());
    }
    
    public static class A {
        // no fields
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

**** Fresh object
me.zhongmingmao.jol.JOLSample_15_IdentityHashCode$A object internals:
 OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
      0     4        (object header)                           01 00 00 00 (00000001 00000000 00000000 00000000) (1)
      4     4        (object header)                           00 00 00 00 (00000000 00000000 00000000 00000000) (0)
      8     4        (object header)                           a2 f0 00 f8 (10100010 11110000 00000000 11111000) (-134156126)
     12     4        (loss due to the next object alignment)
Instance size: 16 bytes
Space losses: 0 bytes internal + 4 bytes external = 4 bytes total

hashCode: 36aa7bc2

**** After identityHashCode()
me.zhongmingmao.jol.JOLSample_15_IdentityHashCode$A object internals:
 OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
      0     4        (object header)                           01 c2 7b aa (00000001 11000010 01111011 10101010) (-1434729983)
      4     4        (object header)                           36 00 00 00 (00110110 00000000 00000000 00000000) (54)
      8     4        (object header)                           a2 f0 00 f8 (10100010 11110000 00000000 11111000) (-134156126)
     12     4        (loss due to the next object alignment)
Instance size: 16 bytes
Space losses: 0 bytes internal + 4 bytes external = 4 bytes total
```

## 分析
1. 对象尚未调用`hashCode()`之前，`Mark Word`对应的`hash`全为为`0`
2. 对象尚调用`hashCode()`之后，计算得到的`hash`记录在`Mark Word`中（`08~39`），（Intel是`小端序`，低字节存储在低地址）
3. `Mark Word`的格式请参考[markOop.hpp](http://hg.openjdk.java.net/jdk8/jdk8/hotspot/file/87ee5ee27509/src/share/vm/oops/markOop.hpp)

## 手动计算HashCode
```Java
@Test
public void haseCodeTest() throws NoSuchFieldException, IllegalAccessException {
   ClassLayout layout = ClassLayout.parseClass(Object.class);
   Object object = new Object();
   // 未调用hashCode()，Mark Word没有相应的值
   System.out.println(layout.toPrintable(object));
   
   String realHashCode = Integer.toHexString(object.hashCode());
   System.out.println(String.format("realHashCode : 0x%s\n", realHashCode));
   // 确认HashCode已经添加到Mark Word中
   System.out.println(layout.toPrintable(object));
   
   // 手动计算HashCode
   Field field = Unsafe.class.getDeclaredField("theUnsafe");
   field.setAccessible(true);
   Unsafe unsafe = (Unsafe) field.get(null);
   long hashCode = 0;
   for (long index = 7; index > 0; index--) {
       // 取Mark Word中的每一个Byte进行计算
       hashCode |= (unsafe.getByte(object, index) & 0xFF) << ((index - 1) * 8);
   }
   String manualHashCode = Long.toHexString(hashCode);
   System.out.println(String.format("manualHashCode : 0x%s", manualHashCode));
   assertEquals(realHashCode, manualHashCode);
}
```
在`Hotspot JVM`计算对象的`HashCode`后，通过`Mark Word`可以手动计算`HashCode`，如果哪位大神知道个中原理，麻烦不吝赐教

<!-- indicate-the-source -->


