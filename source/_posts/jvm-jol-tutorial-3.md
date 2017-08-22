---
title: 对象内存布局 - JOL使用教程 3
date: 2016-07-04 00:06:25
categories:
    - JVM
tags:
    - Netease
    - JVM
    - JOL
    - Concurrent
---

{% note info %}
本文将通过`JOL`分析`Java对象的内存布局`，包括`伪共享`、`DataModel`、`Externals`、`数组对齐`等内容
代码托管在[https://github.com/zhongmingmao/java_object_layout](https://github.com/zhongmingmao/java_object_layout)
{% endnote %}

<!-- more -->

# 伪共享
`Java8`引入`@sun.misc.Contended`注解，自动进行`缓存行填充`，`原始支持`解决`伪共享问题`，实现高效并发，关于`伪共享`，网上已经很多资料，请参考下列连接：
1. https://yq.aliyun.com/articles/62865
2. http://www.cnblogs.com/Binhua-Liu/p/5620339.html
3. http://blog.csdn.net/zero__007/article/details/54951584
4. http://blog.csdn.net/aigoogle/article/details/41517213
5. http://hg.openjdk.java.net/jdk8u/jdk8u/jdk/file/tip/src/share/classes/sun/misc/Contended.java

## 代码
```Java
// JVM Args : -Djol.tryWithSudo=true  -XX:-RestrictContended
public class JOLSample_09_Contended {
    
    public static void main(String[] args) throws Exception {
        out.println(VM.current().details());
        out.println(ClassLayout.parseClass(A.class).toPrintable());
    }
    
    @sun.misc.Contended
    public static class A {
        int a;
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

me.zhongmingmao.jol.JOLSample_09_Contended$A object internals:
 OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
      0    12        (object header)                           N/A
     12   128        (alignment/padding gap)                  
    140     4    int A.a                                       N/A
Instance size: 144 bytes
Space losses: 128 bytes internal + 0 bytes external = 128 bytes total
```

## 分析
1. 本机CPU采用的`Intel I5 Broadwell`，`Cache Line Size`为`64 Bytes`，相关链接[Broadwell](https://en.wikichip.org/wiki/intel/microarchitectures/broadwell#Memory_Hierarchy)
2. 在对象头部后插入了`128 Bytes`的`Padding`，这样保证了`同一缓存行`中，不可能同时容纳`2`个`JOLSample_09_Contended$A`实例，避免了`伪共享`的问题
3. `@Contended`注解的相关概念请查看代码[Contended.java](http://hg.openjdk.java.net/jdk8u/jdk8u/jdk/file/tip/src/share/classes/sun/misc/Contended.java)

## 性能对比代码
```Java
// JVM Args : -Djol.tryWithSudo=true  -XX:-RestrictContended
public class FalseSharingTest {
    
    public final static int THREAD_COUNT = 4;
    
    @Ignore("take too long")
    @Test
    public void falseSharingTest() throws InterruptedException {
        long commonDuration = duration(CommonLong.class); // 29.189s
        long contendedDuration = duration(ContendedLong.class); // 11.047s
        assertTrue(commonDuration / (contendedDuration + 0.0) > 1); // 29.189/11.047 ≈ 2.64，性能提升很明显
    }
    
    private long duration(Class<? extends VolatileLong> clazz) throws InterruptedException {
        out.println(ClassLayout.parseClass(clazz).toPrintable());
        VolatileLong[] longs = new VolatileLong[THREAD_COUNT];
        IntStream.range(0, longs.length).forEach(value -> {
            try {
                longs[value] = clazz.newInstance();
            } catch (InstantiationException | IllegalAccessException e) {
                e.printStackTrace();
            }
        });
        
        ExecutorService pool = Executors.newFixedThreadPool(THREAD_COUNT);
        IntStream.range(0, THREAD_COUNT).forEach(value -> pool.submit(new Task(value, longs)));
        pool.shutdown();
        LocalDateTime start = LocalDateTime.now();
        while (!pool.awaitTermination(100, TimeUnit.MILLISECONDS)) {
        }
        Duration duration = Duration.between(start, LocalDateTime.now());
        out.println(String.format("%s , duration : %s\n", clazz.getSimpleName(), duration));
        return duration.toNanos();
    }
    
    
    @AllArgsConstructor
    private class Task implements Runnable {
        public static final long ITERATIONS = 500L * 1000L * 1000L;
        private final int index;
        private final VolatileLong[] longs;
        
        @Override
        public void run() {
            LongStream.range(0, ITERATIONS).forEach(longs[index]::setValue);
        }
    }
    
    private interface VolatileLong {
        void setValue(long value);
    }
    
    @Data
    private static class CommonLong implements VolatileLong {
        public volatile long value = 0L; // 暴露因缓存行而导致的伪共享问题
    }
    
    @Data
    @sun.misc.Contended
    private static class ContendedLong implements VolatileLong {
        public volatile long value = 0L;
    }
}
```
## 性能对比结果
```
me.zhongmingmao.jol.FalseSharingTest$CommonLong object internals:
 OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
      0    12        (object header)                           N/A
     12     4        (alignment/padding gap)                  
     16     8   long CommonLong.value                          N/A
Instance size: 24 bytes
Space losses: 4 bytes internal + 0 bytes external = 4 bytes total

CommonLong , duration : PT29.189S

me.zhongmingmao.jol.FalseSharingTest$ContendedLong object internals:
 OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
      0    12        (object header)                           N/A
     12   132        (alignment/padding gap)                  
    144     8   long ContendedLong.value                       N/A
Instance size: 152 bytes
Space losses: 132 bytes internal + 0 bytes external = 132 bytes total

ContendedLong , duration : PT11.047S
```

# DataModel

## 代码
```Java
// JVM Args : -Djol.tryWithSudo=true
public class JOLSample_10_DataModels {
    
    public static void main(String[] args) throws Exception {
        Layouter layouter;
        
        layouter = new CurrentLayouter();
        System.out.println("***** " + layouter);
        System.out.println(ClassLayout.parseClass(A.class, layouter).toPrintable());
        
        layouter = new HotSpotLayouter(new X86_32_DataModel());
        System.out.println("***** " + layouter);
        System.out.println(ClassLayout.parseClass(A.class, layouter).toPrintable());
        
        layouter = new HotSpotLayouter(new X86_64_DataModel());
        System.out.println("***** " + layouter);
        System.out.println(ClassLayout.parseClass(A.class, layouter).toPrintable());
        
        layouter = new HotSpotLayouter(new X86_64_COOPS_DataModel());
        System.out.println("***** " + layouter);
        System.out.println(ClassLayout.parseClass(A.class, layouter).toPrintable());
    }
    
    public static class A {
        Object a;
        Object b;
    }
}
```

## 运行结果
```
***** Current VM Layout
me.zhongmingmao.jol.JOLSample_10_DataModels$A object internals:
 OFFSET  SIZE               TYPE DESCRIPTION                               VALUE
      0    12                    (object header)                           N/A
     12     4   java.lang.Object A.a                                       N/A
     16     4   java.lang.Object A.b                                       N/A
     20     4                    (loss due to the next object alignment)
Instance size: 24 bytes
Space losses: 0 bytes internal + 4 bytes external = 4 bytes total

***** VM Layout Simulation (X32 model, 8-byte aligned, compact fields, field allocation style: 1)
me.zhongmingmao.jol.JOLSample_10_DataModels$A object internals:
 OFFSET  SIZE               TYPE DESCRIPTION                               VALUE
      0     8                    (object header)                           N/A
      8     4   java.lang.Object A.a                                       N/A
     12     4   java.lang.Object A.b                                       N/A
Instance size: 16 bytes
Space losses: 0 bytes internal + 0 bytes external = 0 bytes total

***** VM Layout Simulation (X64 model, 8-byte aligned, compact fields, field allocation style: 1)
me.zhongmingmao.jol.JOLSample_10_DataModels$A object internals:
 OFFSET  SIZE               TYPE DESCRIPTION                               VALUE
      0    16                    (object header)                           N/A
     16     8   java.lang.Object A.a                                       N/A
     24     8   java.lang.Object A.b                                       N/A
Instance size: 32 bytes
Space losses: 0 bytes internal + 0 bytes external = 0 bytes total

***** VM Layout Simulation (X64 model (compressed oops), 8-byte aligned, compact fields, field allocation style: 1)
me.zhongmingmao.jol.JOLSample_10_DataModels$A object internals:
 OFFSET  SIZE               TYPE DESCRIPTION                               VALUE
      0    12                    (object header)                           N/A
     12     4   java.lang.Object A.a                                       N/A
     16     4   java.lang.Object A.b                                       N/A
     20     4                    (loss due to the next object alignment)
Instance size: 24 bytes
Space losses: 0 bytes internal + 4 bytes external = 4 bytes total
```

## 分析
1. `CurrentLayouter`是`真实`的内存布局，`HotSpotLayouter`是`模拟`的内存布局
2. 通过`parseInstance(Object instance, Layouter layouter)`能够观察在不同`DataModel`下`synchronized锁升级`的过程

# Externals
之前显示的都是`internals size`（即`shallow size`），这里展示`externals size`（`retained size`=`internals size`+`externals size`）

## 代码
```Java
// JVM Args : -Djol.tryWithSudo=true
public class JOLSample_16_AL_LL {
    
    public static void main(String[] args) throws Exception {
        out.println(VM.current().details());
        PrintWriter pw = new PrintWriter(out);
        
        int objectCount = 4;
        Object[] objects = new Object[objectCount];
        for (int i = 0; i < objectCount; i++) {
            if (new Random().nextInt() % 2 == 0) {
                objects[i] = new A(i);
            } else {
                objects[i] = new B(i);
            }
        }
        
        pw.println(GraphLayout.parseInstance(objects).toFootprint());
        pw.close();
    }
    
    @AllArgsConstructor
    public static class A {
        int a;
    }
    
    @AllArgsConstructor
    public static class B {
        long b;
    }
}
```

## 运行结果
```
me.zhongmingmao.jol.JOLSample_16_AL_LL$A@7de26db8d, me.zhongmingmao.jol.JOLSample_16_AL_LL$B@1175e2dbd, me.zhongmingmao.jol.JOLSample_16_AL_LL$B@36aa7bc2d, me.zhongmingmao.jol.JOLSample_16_AL_LL$B@76ccd017d footprint:
     COUNT       AVG       SUM   DESCRIPTION
         1        16        16   me.zhongmingmao.jol.JOLSample_16_AL_LL$A
         3        24        72   me.zhongmingmao.jol.JOLSample_16_AL_LL$B
         4                  88   (total)
```

## 分析
遍历数组`objects`相连的外部对象，并做了统计

# 数组对齐

## 代码
```Java
// JVM Args : -Djol.tryWithSudo=true
public class JOLSample_26_ArrayAlignment {
    
    public static void main(String[] args) throws Exception {
        out.println(VM.current().details());
        out.println(ClassLayout.parseInstance(new short[0]).toPrintable());
        for (int size = 1; size <= 5; size += 2) {
            out.println(ClassLayout.parseInstance(new short[size]).toPrintable());
        }
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

[S object internals:
 OFFSET  SIZE    TYPE DESCRIPTION                               VALUE
      0     4         (object header)                           01 00 00 00 (00000001 00000000 00000000 00000000) (1)
      4     4         (object header)                           00 00 00 00 (00000000 00000000 00000000 00000000) (0)
      8     4         (object header)                           31 01 00 f8 (00110001 00000001 00000000 11111000) (-134217423)
     12     4         (object header)                           00 00 00 00 (00000000 00000000 00000000 00000000) (0)
     16     0   short [S.<elements>                             N/A
Instance size: 16 bytes
Space losses: 0 bytes internal + 0 bytes external = 0 bytes total

[S object internals:
 OFFSET  SIZE    TYPE DESCRIPTION                               VALUE
      0     4         (object header)                           01 00 00 00 (00000001 00000000 00000000 00000000) (1)
      4     4         (object header)                           00 00 00 00 (00000000 00000000 00000000 00000000) (0)
      8     4         (object header)                           31 01 00 f8 (00110001 00000001 00000000 11111000) (-134217423)
     12     4         (object header)                           01 00 00 00 (00000001 00000000 00000000 00000000) (1)
     16     2   short [S.<elements>                             N/A
     18     6         (loss due to the next object alignment)
Instance size: 24 bytes
Space losses: 0 bytes internal + 6 bytes external = 6 bytes total

[S object internals:
 OFFSET  SIZE    TYPE DESCRIPTION                               VALUE
      0     4         (object header)                           01 00 00 00 (00000001 00000000 00000000 00000000) (1)
      4     4         (object header)                           00 00 00 00 (00000000 00000000 00000000 00000000) (0)
      8     4         (object header)                           31 01 00 f8 (00110001 00000001 00000000 11111000) (-134217423)
     12     4         (object header)                           03 00 00 00 (00000011 00000000 00000000 00000000) (3)
     16     6   short [S.<elements>                             N/A
     22     2         (loss due to the next object alignment)
Instance size: 24 bytes
Space losses: 0 bytes internal + 2 bytes external = 2 bytes total

[S object internals:
 OFFSET  SIZE    TYPE DESCRIPTION                               VALUE
      0     4         (object header)                           01 00 00 00 (00000001 00000000 00000000 00000000) (1)
      4     4         (object header)                           00 00 00 00 (00000000 00000000 00000000 00000000) (0)
      8     4         (object header)                           31 01 00 f8 (00110001 00000001 00000000 11111000) (-134217423)
     12     4         (object header)                           05 00 00 00 (00000101 00000000 00000000 00000000) (5)
     16    10   short [S.<elements>                             N/A
     26     6         (loss due to the next object alignment)
Instance size: 32 bytes
Space losses: 0 bytes internal + 6 bytes external = 6 bytes total
```

## 对象布局
![jol_arrayAlignment.png](http://ot85c3jox.bkt.clouddn.com/jol_arrayAlignment.png)

## 分析
`数组对齐`与前面`字节对齐`的例子类似，在`64-bit Hotspot JVM`按`8 Bytes`对齐


<!-- indicate-the-source -->


