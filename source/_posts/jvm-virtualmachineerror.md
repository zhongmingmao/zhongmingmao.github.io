---
title: VirtualMachineError实例
date: 2016-06-25 00:06:25
categories:
    - JVM
tags:
    - JVM
---

{% note info %}
`VirtualMachineError`有两个常见的实现类：`StackOverflowError`、`OutOfMemoryError`，本文将用代码分析几种情况的`VirtualMachineError`
{% endnote %}

<!-- more -->

# JVM参数

| 内存区域 | 虚拟机栈<br/>VM Stack | 堆<br/>Heap | 方法区<br/>Method Area |
| --- | --- | --- | --- |
| 共享/隔离 | 线程隔离 | 线程共享 | 线程共享 |
| 存放的数据 | 栈帧 Stack Frame | 对象实例/数组 | 类信息、常量、静态变量等数据 |
| 异常情况 | StackOverflowError<br/>OutOfMemoryError | OutOfMemoryError | OutOfMemoryError |
| JVM参数 | -Xss | -Xms<br/>-Xmx | -XX:PermSize<br/>-XX:MaxPermSize<br/>-XX:MetaspaceSize<br/>-XX:MaxMetaspaceSize |

{% note warning %}
注：在JDK8之前，`Hotspot JVM`采用永生代（`Permanent Generation`）来实现方法区（`Method Area`），从`JDK8`开始，已经移除了永生代，使用`Metaspace`进行替代，相关连接请参考：
1. http://blog.csdn.net/zhushuai1221/article/details/52122880
2. http://openjdk.java.net/jeps/122
3. https://stackoverflow.com/questions/18339707/permgen-elimination-in-jdk-8
{% endnote %}


# 实例


## VM Stack - StackOverflowError

### 代码
```java
public class VMStackSOF {
    private int stackDepth = 0;

    public void stackLeak() {
        ++stackDepth;
        stackLeak();
    }

    @Override
    public String toString() {
        return String.format("stackDepth:%s", stackDepth);
    }

    // JDK ➔ 7
    // JVM Args ➔ -Xss256k
    // -Xss ➔ VM Stack大小
    public static void main(String[] args) {
        VMStackSOF sof = new VMStackSOF();
        try {
            sof.stackLeak();
        } catch (Throwable e) {
            System.out.println(e.getClass().getCanonicalName());
            System.out.println(sof);
        }
    }
}
```

### 运行结果
```
java.lang.StackOverflowError
stackDepth:1890
```

### 分析
1. `VM Stack`是`线程私有`，当线程执行一个方法时，会在`VM Stack`上创建一个`Stack Frame`，`VM Stack`类似于`Stack`（FILO）的数据结构，`最上层的Stack Frame`即`当前线程执行的方法`
2. 方法`从调用到执行完成`，对应着`Stack Frame`在`VM Stack`中`从入栈到出栈`的过程
3. 由于`VM Stack`的空间有限，当递归调用的深度过大，有可能会抛出`StackOverflowError`

## Heap - OutOfMemoryError

### 代码
```java
public class HeapOOM {
    static class OOMObject {
        private static final int _1_MB = 1 * 1024 * 1024;
        private final byte[] body = new byte[_1_MB];
    }

    // JDK ➔ 7
    // JVM Args ➔ -Xms10M -Xmx10M -XX:+HeapDumpOnOutOfMemoryError -verbose:gc -XX:+PrintGCDetails -XX:+UseSerialGC
    // -Xms ➔ 初始堆内存大小
    // -Xmx ➔ 最大堆内存大小
    // -XX:+HeapDumpOnOutOfMemoryError ➔ 当发生OutOfMemoryError，生成Heap Dump文件，便于MAT等工具进分析
    // -XX:+PrintGCDetails ➔ 打印GC日志
    // -XX:+UseSerialGC ➔ 新生代采用Serial收集器，老年代采用Serial Old收集器
    public static void main(String[] args) {
        List<OOMObject> list = new ArrayList<>();
        while (true) {
            list.add(new OOMObject());
        }
    }
}
```

### 运行结果
```
[GC[DefNew: 2542K->320K(3072K), 0.0030860 secs] 2542K->1392K(9920K), 0.0031220 secs] [Times: user=0.00 sys=0.01, real=0.01 secs]
[GC[DefNew: 2520K->0K(3072K), 0.0036840 secs] 3593K->3440K(9920K), 0.0037070 secs] [Times: user=0.00 sys=0.00, real=0.00 secs]
[GC[DefNew: 2094K->0K(3072K), 0.0024930 secs] 5534K->5489K(9920K), 0.0025120 secs] [Times: user=0.00 sys=0.00, real=0.01 secs]
[GC[DefNew: 2078K->2078K(3072K), 0.0000150 secs][Tenured: 5488K->6512K(6848K), 0.0062400 secs] 7567K->7537K(9920K), [Perm : 2973K->2973K(21248K)], 0.0062960 secs] [Times: user=0.01 sys=0.00, real=0.00 secs]
[Full GC[Tenured: 6512K->6512K(6848K), 0.0043250 secs] 8569K->8562K(9920K), [Perm : 2982K->2982K(21248K)], 0.0043490 secs] [Times: user=0.01 sys=0.00, real=0.01 secs]
[Full GC[Tenured: 6512K->6475K(6848K), 0.0054820 secs] 8562K->8525K(9920K), [Perm : 2982K->2981K(21248K)], 0.0055010 secs] [Times: user=0.00 sys=0.00, real=0.00 secs]
java.lang.OutOfMemoryError: Java heap space
Dumping heap to java_pid96337.hprof ...
Heap dump file created [9431959 bytes in 0.064 secs]
Exception in thread "main" java.lang.OutOfMemoryError: Java heap space

Heap
 def new generation   total 3072K, used 2214K [0x00000007fa400000, 0x00000007fa750000, 0x00000007fa750000)
  eden space 2752K,  80% used [0x00000007fa400000, 0x00000007fa629bc8, 0x00000007fa6b0000)
  from space 320K,   0% used [0x00000007fa700000, 0x00000007fa700000, 0x00000007fa750000)
  to   space 320K,   0% used [0x00000007fa6b0000, 0x00000007fa6b0000, 0x00000007fa700000)
 tenured generation   total 6848K, used 6475K [0x00000007fa750000, 0x00000007fae00000, 0x00000007fae00000)
   the space 6848K,  94% used [0x00000007fa750000, 0x00000007fada2da0, 0x00000007fada2e00, 0x00000007fae00000)
 compacting perm gen  total 21248K, used 3124K [0x00000007fae00000, 0x00000007fc2c0000, 0x0000000800000000)
   the space 21248K,  14% used [0x00000007fae00000, 0x00000007fb10d130, 0x00000007fb10d200, 0x00000007fc2c0000)
No shared spaces configured.
```

### MAT分析
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/mat_oom_serialgc.png" width="500">
1. 当线程运行main方法时，list是在的`VM Stack`的`Current Stack Frame`定义的`强引用(Strong Reference)`，且为`GC ROOT`，哪怕JVM堆内存不足的时候，触发`Full GC`，也不会将其回收，最后导致`OutOfMemoryError`
2. 由GC日志可以看出，`新生代的Eden区`存有`2`个OOMObject对象，`老年代`存有`6`个OOMObject对象，已经无法再容纳新的OOMObject对象，抛出`OutOfMemoryError`

## Interned Strings
`Interned Strings`（字面量）在`JDK6`会存储在`PermGen`，从`JDK7`开始存储在`Java Heap`，减少`OOM`和`性能问题`

### JDK6 - PermGen

#### 代码
```java
// JDK ➔ 6
// JVM Args ➔ -Xms60m -Xmx60m -XX:PermSize=50m -XX:MaxPermSize=50m -verbose:gc -XX:+PrintGCDetails -XX:+UseSerialGC
// -XX:PermSize ➔ PermGen的初始大小
// -XX:MaxPermSize ➔ PermGen的最大值
public static void main(String[] args) throws Throwable {

   BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
   System.out.println("waiting for input...");
   reader.readLine();
   int i = 0;
   List<String> strings = new ArrayList<String>();
   while (true) {
       // 当前线程保持强引用，阻止被GC回收
       strings.add(String.valueOf(i++).intern());
   }
}
```

#### 运行结果
```
[GC [DefNew: 17587K->784K(18432K), 0.0078576 secs] 17587K->1928K(59392K), 0.0078864 secs] [Times: user=0.01 sys=0.00, real=0.01 secs]
[GC [DefNew: 17168K->1764K(18432K), 0.0065362 secs] 18312K->2909K(59392K), 0.0065645 secs] [Times: user=0.00 sys=0.00, real=0.01 secs]
[GC [DefNew: 18148K->12K(18432K), 0.0087651 secs] 19293K->3794K(59392K), 0.0087963 secs] [Times: user=0.00 sys=0.00, real=0.01 secs]
[Full GC [Tenured: 3781K->3783K(40960K), 0.1019995 secs] 7657K->3783K(59392K), [Perm : 51199K->51199K(51200K)], 0.1033236 secs] [Times: user=0.10 sys=0.00, real=0.10 secs]
[Full GC [Tenured: 3783K->3783K(40960K), 0.1647300 secs] 3783K->3783K(59392K), [Perm : 51199K->51199K(51200K)], 0.1659092 secs] [Times: user=0.16 sys=0.00, real=0.17 secs]
[Full GC [Tenured: 3783K->1152K(40960K), 0.0483188 secs] 4020K->1152K(59392K), [Perm : 51199K->13270K(51200K)], 0.0497827 secs] [Times: user=0.05 sys=0.00, real=0.05 secs]
Exception in thread "main" java.lang.OutOfMemoryError: PermGen space
```
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/StringInternJDK6.png" width="500">

#### 分析
1. `String.valueOf(i++).intern()`会在`Heap`（`valueOf`）和`PermGen`（`intern`）中分配存储空间，并返回引用到`strings`进行保存（强引用，不会被GC回收）
2. 从GC日志可以看出，`Full GC`时，`PermGen`接近填满（`[Perm : 51199K->51199K(51200K)]`）

### JDK8 - Heap

#### 代码
```java
// JDK ➔ 8
// JVM Args ➔ -Xms600m -Xmx600m -XX:MetaspaceSize=50m -XX:MaxMetaspaceSize=50m -verbose:gc -XX:+PrintGCDetails -XX:+UseSerialGC
// -XX:MetaspaceSize ➔ Metaspace的初始大小，在JDK8开始，PermGen已经被移除，采用Metaspace来替代
// -XX:MaxMetaspaceSize ➔ Metaspace的最大值
public static void main(String[] args) throws Throwable {

   BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
   System.out.println("waiting for input...");
   reader.readLine();
   int i = 0;
   List<String> strings = new ArrayList<String>();
   while (true) {
       // 当前线程保持强引用，阻止被GC回收
       strings.add(String.valueOf(i++).intern());
   }
}
```

#### 运行结果
```
[GC (Allocation Failure) [DefNew: 161762K->20480K(184320K), 0.4081917 secs] 161762K->108735K(593920K), 0.4082377 secs] [Times: user=0.31 sys=0.06, real=0.41 secs]
[GC (Allocation Failure) [DefNew: 180388K->20480K(184320K), 0.5512956 secs] 268644K->242289K(593920K), 0.5513318 secs] [Times: user=0.44 sys=0.08, real=0.55 secs]
[GC (Allocation Failure) [DefNew: 163946K->20480K(184320K), 0.5983332 secs] 385755K->362517K(593920K), 0.5983566 secs] [Times: user=0.46 sys=0.07, real=0.60 secs]
[GC (Allocation Failure) [DefNew: 184320K->184320K(184320K), 0.0000114 secs][Tenured: 342037K->409599K(409600K), 2.0193780 secs] 526357K->497464K(593920K), [Metaspace: 9048K->9048K(1058816K)], 2.0194333 secs] [Times: user=1.89 sys=0.08, real=2.02 secs]
[Full GC (Allocation Failure) [Tenured: 409599K->409599K(409600K), 2.0671005 secs] 546537K->542781K(593920K), [Metaspace: 9065K->9065K(1058816K)], 2.0671389 secs] [Times: user=1.95 sys=0.03, real=2.07 secs]
[Full GC (Allocation Failure) [Tenured: 409599K->409599K(409600K), 2.1368935 secs] 542781K->542354K(593920K), [Metaspace: 9065K->9065K(1058816K)], 2.1370422 secs] [Times: user=2.08 sys=0.02, real=2.14 secs]
Exception in thread "main" java.lang.OutOfMemoryError: Java heap space
```
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/StringInternJDK8.png" width="500">

#### 分析
1. `String.valueOf(i++).intern()`会在`Heap`（`valueOf`）中分配存储空间，并返回引用到`strings`进行保存（强引用，不会被GC回收）
2. 从GC日志可以看出，`Full GC`时，`Old Gen`接近填满（`Tenured: 409599K->409599K(409600K)`）


<!-- indicate-the-source -->
