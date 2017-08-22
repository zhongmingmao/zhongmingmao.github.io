---
title: 垃圾回收 - 晋升规则
date: 2016-07-10 00:06:25
categories:
    - JVM
tags:
    - Netease
    - JVM
    - GC
---

{% note info %}
本文将通过最`基本`的垃圾收集器（`Serial` + `Serial Old`），简单地讲述JVM`内存分配和回收过程`中的`3`个基本的晋升规则：`大对象直接晋升`、`对象年龄晋升`、`动态晋升`
代码托管在：[https://github.com/zhongmingmao/jvm_demo](https://github.com/zhongmingmao/jvm_demo)
{% endnote %}

<!-- more -->

# -XX:+UseSerialGC
1. `新生代`采用`Serial`垃圾收集器（`Copying`算法，`单线程`，`Stop The World`） 
2. `老年代`采用`Serial Old`垃圾收集器（`Mark-Compact`算法，`单线程`，`Stop The World`）

# Minor GC + Major GC

## Minor GC
1. 发生在`新生代`，当`Eden`区域没有足够空间进行分配
2. Java对象大多具有`短命`的特性
3. `Minor GC`非常`频繁`，速度也比较`快`

## Major GC
1. 也叫`Full GC`，发生在`老年代`
2. 出现`Major GC`，经常伴随`至少一次Minor GC`
3. 速度比较`慢`，`SpeedOf(Minor GC) ≈ 10 * SpeedOf(Major GC)`

# 大对象直接晋升

## 代码
```Java
// JVM Args : -Xms20m -Xmx20m -Xmn10m -XX:SurvivorRatio=8 -XX:+UseSerialGC -XX:+PrintGCDetails
// 堆大小：20M
// 新生代大小：10M
// Eden区大小：8M
// Survivor区大小：1M
// 老年代大小：10M
public class MinorGCAndFullGC {
    private static final int _1MB = 1024 * 1024;
 
    public static void main(String[] args) {
        System.gc();
        byte[] b1 = new byte[5 * _1MB];
        byte[] b2 = new byte[5 * _1MB];// 1次Minor GC
        byte[] b3 = new byte[5 * _1MB];// 1次Minor GC + 1次Full GC ⇒ OOM
    }
}
```

## 运行结果
```
[Full GC (System.gc()) [Tenured: 0K->467K(10240K), 0.0037172 secs] 2217K->467K(19456K), [Metaspace: 3177K->3177K(1056768K)], 0.0037645 secs] [Times: user=0.00 sys=0.00, real=0.00 secs] 
[GC (Allocation Failure) [DefNew: 5447K->4K(9216K), 0.0036997 secs] 5915K->5592K(19456K), 0.0037186 secs] [Times: user=0.00 sys=0.00, real=0.00 secs] 
[GC (Allocation Failure) [DefNew: 5209K->5209K(9216K), 0.0000165 secs][Tenured: 5587K->5587K(10240K), 0.0029173 secs] 10796K->10713K(19456K), [Metaspace: 3270K->3270K(1056768K)], 0.0029714 secs] [Times: user=0.00 sys=0.00, real=0.00 secs] 
[Full GC (Allocation Failure) [Tenured: 5587K->5527K(10240K), 0.0036178 secs] 10713K->10653K(19456K), [Metaspace: 3270K->3270K(1056768K)], 0.0036448 secs] [Times: user=0.01 sys=0.00, real=0.01 secs] 
Heap
 def new generation   total 9216K, used 5508K [0x00000007bec00000, 0x00000007bf600000, 0x00000007bf600000)
  eden space 8192K,  67% used [0x00000007bec00000, 0x00000007bf161370, 0x00000007bf400000)
  from space 1024K,   0% used [0x00000007bf500000, 0x00000007bf500000, 0x00000007bf600000)
  to   space 1024K,   0% used [0x00000007bf400000, 0x00000007bf400000, 0x00000007bf500000)
 tenured generation   total 10240K, used 5527K [0x00000007bf600000, 0x00000007c0000000, 0x00000007c0000000)
   the space 10240K,  53% used [0x00000007bf600000, 0x00000007bfb65f68, 0x00000007bfb66000, 0x00000007c0000000)
 Metaspace       used 3330K, capacity 4496K, committed 4864K, reserved 1056768K
  class space    used 370K, capacity 388K, committed 512K, reserved 1048576K
Exception in thread "main" java.lang.OutOfMemoryError: Java heap space
```

## 运行过程

### System.gc()
对应的GC日志
```
[Full GC (System.gc()) [Tenured: 0K->467K(10240K), 0.0037172 secs] 2217K->467K(19456K), [Metaspace: 3177K->3177K(1056768K)], 0.0037645 secs] [Times: user=0.00 sys=0.00, real=0.00 secs] 
```
1. 进行`Full GC`的原因是代码调用`System.gc()`
2. `堆`总大小为`19456K` ≈ `20M`
3. `老年代`（`Tenured Generation`）总大小为`10240K` = `10M`，目前占用`467K`，可忽略
4. `新生代`（`Def New Generation`）目前占用`467K-467K=0K`，总大小 = 堆大小 - 老年代大小 ≈ `10M`，`SurvivorRatio=8`，因此`Eden`区大小为`8M`，`Survivor`区大小为`1M`

![gc_1_system_gc.png](http://ot85c3jox.bkt.clouddn.com/gc_1_system_gc.png)

### byte[] b1 = new byte[5 * _1MB]
`Eden区`有`8M`空闲空间，能完全容纳`b1`，不会进行`GC`
![gc_1_b1.png](http://ot85c3jox.bkt.clouddn.com/gc_1_b1.png)

### byte[] b2 = new byte[5 * _1MB]
对应的GC日志
```
[GC (Allocation Failure) [DefNew: 5447K->4K(9216K), 0.0036997 secs] 5915K->5592K(19456K), 0.0037186 secs] [Times: user=0.00 sys=0.00, real=0.00 secs] 
```
![gc_1_b2.png](http://ot85c3jox.bkt.clouddn.com/gc_1_b2.png)
1. `Eden`区只有`8M`，此时已经分配了`b1`，最多只剩下`3M`的可用空间，`Serial`采集器采用`Copying`算法，不足以容纳`b2`，触发`Minor GC`
2. 进行`Minor GC`的原因是`Allocation Failure`，即内存分配失败，与上面分析一致
3. 进行`Minor GC`，首先尝试将`Eden`区和`Survivor 0`区中的`存活对象`一起移到`Survivor 1`区，`b1`是强引用，依旧存活，但由于`Survivor 1`区只有`1M`，无法容纳`b1`，尝试将`b1`直接晋升到`Tenured`区
4. 此时`Tenured`有`10M`的可用空间，能容纳`b1`，可以将`b1`晋升到`Tenured`区，并释放`b1`原本在`Eden`区占用的内存空间
5. `Minor GC`结束后，`b2`便能顺利地在`Eden`区进行分配

### byte[] b3 = new byte[5 * _1MB]
对应的GC日志
```
[GC (Allocation Failure) [DefNew: 5209K->5209K(9216K), 0.0000165 secs][Tenured: 5587K->5587K(10240K), 0.0029173 secs] 10796K->10713K(19456K), [Metaspace: 3270K->3270K(1056768K)], 0.0029714 secs] [Times: user=0.00 sys=0.00, real=0.00 secs] 
[Full GC (Allocation Failure) [Tenured: 5587K->5527K(10240K), 0.0036178 secs] 10713K->10653K(19456K), [Metaspace: 3270K->3270K(1056768K)], 0.0036448 secs] [Times: user=0.01 sys=0.00, real=0.01 secs]
```
1. 由于`Eden`区此时最多有`3M`的可用空间，要分配`b3`，首先触发一次`Minor GC`
2. 由于内存空间（`Eden`、`Survivor 0`、`Tenured`）不足，`Minor GC`也会失败，进而触发`Full GC`
3. `Tenured`区采用`Serial Old`收集器，`Full GC`时会尝试采用`Mark-Compact`算法进行GC，但依旧会失败，进而导致抛出`OutOfMemoryError`

## 小结
尽量避免使用**`需要连续内存空间的短命大对象`**，例如`长字符串`和`基本类型的大数组`，因为这会导致`Minor GC`的时候，这些短命大对象有可能会`直接晋升`到老年代，进而`加大Full GC的频率`

# 对象年龄晋升
对象每经历一次`Minor GC`，年龄就会增加`1`，到了一定的阈值(`-XX:MaxTenuringThreshold`，默认是`15`)，就会`晋升`到老年代

## 代码
```Java
/**
 * 校验JVM参数 -XX:MaxTenuringThreshold
 *
 * @author zhongmingmao zhongmingmao0625@gmail.com
 */
public class TenuringThreshold {

    private static final int _10MB = 10 * 1024 * 1024;
    private static Pattern BIN_PATTERN = Pattern.compile("\\(((\\d{8}\\s?){4})\\)");
    
    // JVM Args : -Xms200m -Xmx200m -Xmn100m -XX:SurvivorRatio=8 -XX:MaxTenuringThreshold=3
    // -XX:+UseSerialGC -XX:+PrintGCDetails  -Djol.tryWithSudo=true
    public static void main(String[] args) {
        
        System.gc();
        byte[] b = new byte[_10MB / 4];
        System.out.println(String.format("Init Address : %s\n", VM.current().addressOf(b)));
        
        for (int i = 0; i < 6; ++i) {
            // 从i=1开始，每分配一次bytes，就会触发一次Minor GC
            // 当对象b的GCAge < MaxTenuringThreshold -> 在两个Survivor区之间来回移动
            // 当对象b的GCAge >= MaxTenuringThreshold -> 晋升到Tenured区
            byte[] bytes = new byte[5 * _10MB];
            System.out.println(String.format("Address[%s] : %s , GC Age : %s", i,
                    VM.current().addressOf(b),
                    getObjectGCAge(b)));
            System.out.println();
        }
    }
    
    /**
     * 获取对象的GC年龄<br/>
     * Java对象头结构 See http://hg.openjdk.java.net/jdk8/jdk8/hotspot/file/87ee5ee27509/src/share/vm/oops/markOop.hpp
     */
    private static int getObjectGCAge(Object object) {
        /*
        ClassLayout.parseInstance(object).toPrintable()的完整格式
        [B object internals:
         OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
              0     4        (object header)                           19 00 00 00 (00011001 00000000 00000000
              00000000) (25)
              4     4        (object header)                           00 00 00 00 (00000000 00000000 00000000
              00000000) (0)
              8     4        (object header)                           f5 00 00 f8 (11110101 00000000 00000000
              11111000) (-134217483)
             12     4        (object header)                           00 00 28 00 (00000000 00000000 00101000
             00000000) (2621440)
             16 2621440   byte [B.<elements>                             N/A
        Instance size: 2621456 bytes
        Space losses: 0 bytes internal + 0 bytes external = 0 bytes total
        * */
        String line = ClassLayout.parseInstance(object).toPrintable().split("\n")[2];
        Matcher matcher = BIN_PATTERN.matcher(line);
        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1).split("\\s")[0].substring(1, 5), 2);
        }
        return -1;
    }
}
```

## 运行结果
```
[Full GC (System.gc()) [Tenured: 0K->452K(102400K), 0.0032760 secs] 6555K->452K(194560K), [Metaspace: 3198K->3198K(1056768K)], 0.0033038 secs] [Times: user=0.00 sys=0.00, real=0.00 secs] 
Init Address : 33076281344

Address[0] : 33076281344 , GC Age : 0

[GC (Allocation Failure) [DefNew: 70169K->3565K(92160K), 0.0051274 secs] 70622K->4017K(194560K), 0.0051485 secs] [Times: user=0.01 sys=0.00, real=0.00 secs] 
Address[1] : 33170780832 , GC Age : 1

[GC (Allocation Failure) [DefNew: 57128K->3417K(92160K), 0.0075981 secs] 57580K->3869K(194560K), 0.0076253 secs] [Times: user=0.01 sys=0.01, real=0.00 secs] 
Address[2] : 33160295048 , GC Age : 2

[GC (Allocation Failure) [DefNew: 56715K->3417K(92160K), 0.0020149 secs] 57168K->3869K(194560K), 0.0020339 secs] [Times: user=0.00 sys=0.00, real=0.00 secs] 
Address[3] : 33170780808 , GC Age : 3

[GC (Allocation Failure) [DefNew: 56533K->0K(92160K), 0.0052362 secs] 56985K->3870K(194560K), 0.0052590 secs] [Times: user=0.00 sys=0.00, real=0.01 secs] 
Address[4] : 33181729784 , GC Age : 3

[GC (Allocation Failure) [DefNew: 52773K->0K(92160K), 0.0004461 secs] 56643K->3870K(194560K), 0.0004610 secs] [Times: user=0.01 sys=0.00, real=0.00 secs] 
Address[5] : 33181729784 , GC Age : 3

Heap
 def new generation   total 92160K, used 53599K [0x00000007b3800000, 0x00000007b9c00000, 0x00000007b9c00000)
  eden space 81920K,  65% used [0x00000007b3800000, 0x00000007b6c57cd8, 0x00000007b8800000)
  from space 10240K,   0% used [0x00000007b9200000, 0x00000007b92000f0, 0x00000007b9c00000)
  to   space 10240K,   0% used [0x00000007b8800000, 0x00000007b8800000, 0x00000007b9200000)
 tenured generation   total 102400K, used 3869K [0x00000007b9c00000, 0x00000007c0000000, 0x00000007c0000000)
   the space 102400K,   3% used [0x00000007b9c00000, 0x00000007b9fc7710, 0x00000007b9fc7800, 0x00000007c0000000)
 Metaspace       used 6569K, capacity 6832K, committed 7040K, reserved 1056768K
  class space    used 765K, capacity 843K, committed 896K, reserved 1048576K
```

### byte[] b = new byte[_10MB / 4]
```
Init Address : 33076281344
```
尝试分配`对象b`到**`Eden`**区，内存空间充足，初始内存地址为`33076281344`，`GC年龄`为`0`

### 循环`i=0`
```
Address[0] : 33076281344 , GC Age : 0
```
尝试在`Eden`区分配`5*_10MB`的内存空间，内存空间充足，不需要触发`Minor GC`，`对象b`的内存地址`不变`，依旧是`33076281344`，在**`Eden`**区，`GC年龄`为`0`

### 循环`i=1`
```
[GC (Allocation Failure) [DefNew: 70169K->3565K(92160K), 0.0051274 secs] 70622K->4017K(194560K), 0.0051485 secs] [Times: user=0.01 sys=0.00, real=0.00 secs] 
Address[1] : 33170780832 , GC Age : 1
```
尝试在`Eden`区再分配`5*_10MB`的内存空间，内存空间不足，触发`Minor GC`，循环`i=0`分配的`5*_10MB`的内存空间被回收，`对象b`被移动到了**`Survivor 0`**区，内存地址变成了`33170780832`，`GC年龄`为`1`

### 循环`i=2`
```
[GC (Allocation Failure) [DefNew: 57128K->3417K(92160K), 0.0075981 secs] 57580K->3869K(194560K), 0.0076253 secs] [Times: user=0.01 sys=0.01, real=0.00 secs] 
Address[2] : 33160295048 , GC Age : 2
```
尝试在`Eden`区再分配`5*_10MB`的内存空间，内存空间不足，触发`Minor GC`，循环`i=1`分配的`5*_10MB`的内存空间被回收，`对象b`被移动到了**`Survivor 1`**区，内存地址变成了`33160295048`，`GC年龄`为`2`

### 循环`i=3`
```
[GC (Allocation Failure) [DefNew: 56715K->3417K(92160K), 0.0020149 secs] 57168K->3869K(194560K), 0.0020339 secs] [Times: user=0.00 sys=0.00, real=0.00 secs] 
Address[3] : 33170780808 , GC Age : 3
```
尝试在`Eden`区再分配`5*_10MB`的内存空间，内存空间不足，触发`Minor GC`，循环`i=2`分配的`5*_10MB`的内存空间被回收，`对象b`**`再次`**被移动到了**`Survivor 0`**区，内存地址变成了`33170780808`，`GC年龄`为`3`

### 循环`i=4`
```
[GC (Allocation Failure) [DefNew: 56533K->0K(92160K), 0.0052362 secs] 56985K->3870K(194560K), 0.0052590 secs] [Times: user=0.00 sys=0.00, real=0.01 secs] 
Address[4] : 33181729784 , GC Age : 3
```
尝试在`Eden`区再分配`5*_10MB`的内存空间，内存空间不足，触发`Minor GC`，循环`i=3`分配的`5*_10MB`的内存空间被回收，`对象b`的`GC年龄`已经达到了`MaxTenuringThreshold`，可以直接晋升到`Tenured`区，内存地址变成了`33181729784`，`GC年龄`依旧为`3`,不会再增加

### 循环`i=5`
```
[GC (Allocation Failure) [DefNew: 52773K->0K(92160K), 0.0004461 secs] 56643K->3870K(194560K), 0.0004610 secs] [Times: user=0.01 sys=0.00, real=0.00 secs] 
Address[5] : 33181729784 , GC Age : 3
```
尝试在`Eden`区再分配`5*_10MB`的内存空间，内存空间不足，触发`Minor GC`，循环`i=4`分配的`5*_10MB`的内存空间被回收，`对象b`已经在`Tenured`区，此时并不是`Full GC`，内存地址不会改变，依旧是`33181729784`，`GC年龄`也依旧是`3`


# 动态晋升
在`Minor GC`时，如果在`Survivor`中**`相同年龄的所有对象大小之和`** ≧ `0.5 * sizeof(Survivor)` ⇒ **`大于或等于`**该年龄的对象**`直接晋升`**到老年代，无须考虑`MaxTenuringThreshold`

## 代码
```Java
/**
 * 验证动态晋升<br/>
 *
 * @author zhongmingmao zhongmingmao@0625@gmail.com
 */
public class DynamicGCAge {
    
    private static final int _10MB = 10 * 1024 * 1024;
    private static Pattern BIN_PATTERN = Pattern.compile("\\(((\\d{8}\\s?){4})\\)");
    
    // JVM Args : -Xms200m -Xmx200m -Xmn100m -XX:SurvivorRatio=8 -XX:+UseSerialGC
    // -XX:+PrintGCDetails -Djol.tryWithSudo=true
    public static void main(String[] args) {
        System.gc();
        byte[] b0 = new byte[_10MB / 8];
        byte[] b1 = null;
        byte[] b2 = null;
        byte[] b3 = null;
        byte[] b4 = null;
        System.out.println(getObjectInfo("b0", b0));
        System.out.println();
        for (int i = 0; i < 5; ++i) {
            // i=2才实例化b1~b4,b1的GC年龄比b1~b4大，且b1~b4的总大小等于Survivor区的一半，下次Minor GC，能直接晋升
            if (i == 2) {
                b1 = new byte[_10MB / 8];
                b2 = new byte[_10MB / 8];
                b3 = new byte[_10MB / 8];
                b4 = new byte[_10MB / 8];
            }
            byte[] bytes = new byte[5 * _10MB];
            
            System.out.println(getObjectInfo("b0", b0));
            System.out.println(getObjectInfo("b1", b1));
            System.out.println(getObjectInfo("b2", b2));
            System.out.println(getObjectInfo("b3", b3));
            System.out.println(getObjectInfo("b4", b4));
            System.out.println();
        }
    }
    
    private static int getObjectGCAge(Object object) {
        if (null == object) {
            return -1;
        }
        String line = ClassLayout.parseInstance(object).toPrintable().split("\n")[2];
        Matcher matcher = BIN_PATTERN.matcher(line);
        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1).split("\\s")[0].substring(1, 5), 2);
        }
        return 0;
    }
    
    private static long getObjectAddress(Object object) {
        return null == object ? -1 : VM.current().addressOf(object);
    }
    
    private static String getObjectInfo(String name, Object object) {
        return String.format("Obj[%s] , Address:[%s] , GCAge:[%s]",
                name,
                getObjectAddress(object),
                getObjectGCAge(object));
    }
}
```

## 运行结果
```
[Full GC (System.gc()) [Tenured: 0K->484K(102400K), 0.0046554 secs] 6555K->484K(194560K), [Metaspace: 3346K->3346K(1056768K)], 0.0047017 secs] [Times: user=0.01 sys=0.00, real=0.00 secs] 
Obj[b0] , Address:[33076281344] , GCAge:[0]

Obj[b0] , Address:[33076281344] , GCAge:[0]
Obj[b1] , Address:[-1] , GCAge:[-1]
Obj[b2] , Address:[-1] , GCAge:[-1]
Obj[b3] , Address:[-1] , GCAge:[-1]
Obj[b4] , Address:[-1] , GCAge:[-1]

[GC (Allocation Failure) [DefNew: 67248K->2254K(92160K), 0.0069139 secs] 67732K->2738K(194560K), 0.0069444 secs] [Times: user=0.00 sys=0.01, real=0.01 secs] 
Obj[b0] , Address:[33170752344] , GCAge:[1]
Obj[b1] , Address:[-1] , GCAge:[-1]
Obj[b2] , Address:[-1] , GCAge:[-1]
Obj[b3] , Address:[-1] , GCAge:[-1]
Obj[b4] , Address:[-1] , GCAge:[-1]

[GC (Allocation Failure) [DefNew: 59673K->7226K(92160K), 0.0059408 secs] 60157K->7710K(194560K), 0.0059641 secs] [Times: user=0.00 sys=0.00, real=0.01 secs] 
Obj[b0] , Address:[33160266584] , GCAge:[2]
Obj[b1] , Address:[33161577320] , GCAge:[1]
Obj[b2] , Address:[33162888056] , GCAge:[1]
Obj[b3] , Address:[33164198792] , GCAge:[1]
Obj[b4] , Address:[33165509528] , GCAge:[1]

[GC (Allocation Failure) [DefNew: 60004K->0K(92160K), 0.0086877 secs] 60488K->7710K(194560K), 0.0087102 secs] [Times: user=0.00 sys=0.01, real=0.00 secs] 
Obj[b0] , Address:[33181733760] , GCAge:[2]
Obj[b1] , Address:[33183044496] , GCAge:[1]
Obj[b2] , Address:[33184355232] , GCAge:[1]
Obj[b3] , Address:[33185665968] , GCAge:[1]
Obj[b4] , Address:[33186976704] , GCAge:[1]

[GC (Allocation Failure) [DefNew: 53328K->0K(92160K), 0.0009302 secs] 61039K->7710K(194560K), 0.0009761 secs] [Times: user=0.00 sys=0.00, real=0.00 secs] 
Obj[b0] , Address:[33181733760] , GCAge:[2]
Obj[b1] , Address:[33183044496] , GCAge:[1]
Obj[b2] , Address:[33184355232] , GCAge:[1]
Obj[b3] , Address:[33185665968] , GCAge:[1]
Obj[b4] , Address:[33186976704] , GCAge:[1]

Heap
 def new generation   total 92160K, used 53610K [0x00000007b3800000, 0x00000007b9c00000, 0x00000007b9c00000)
  eden space 81920K,  65% used [0x00000007b3800000, 0x00000007b6c5aa18, 0x00000007b8800000)
  from space 10240K,   0% used [0x00000007b8800000, 0x00000007b8800050, 0x00000007b9200000)
  to   space 10240K,   0% used [0x00000007b9200000, 0x00000007b9200000, 0x00000007b9c00000)
 tenured generation   total 102400K, used 7710K [0x00000007b9c00000, 0x00000007c0000000, 0x00000007c0000000)
   the space 102400K,   7% used [0x00000007b9c00000, 0x00000007ba387ae8, 0x00000007ba387c00, 0x00000007c0000000)
 Metaspace       used 6608K, capacity 6832K, committed 7040K, reserved 1056768K
  class space    used 765K, capacity 843K, committed 896K, reserved 1048576K
```

### byte[] b0 = new byte[_10MB / 8]
```
Obj[b0] , Address:[33076281344] , GCAge:[0]
```
尝试分配`对象b0`到**`Eden`**区，内存空间充足，初始内存地址为`33076281344`，`GC年龄`为`0`

### 循环`i=0`
```
Obj[b0] , Address:[33076281344] , GCAge:[0]
Obj[b1] , Address:[-1] , GCAge:[-1]
Obj[b2] , Address:[-1] , GCAge:[-1]
Obj[b3] , Address:[-1] , GCAge:[-1]
Obj[b4] , Address:[-1] , GCAge:[-1]
```
1. 尝试在`Eden`区分配`5*_10MB`的内存空间，内存空间充足，不需要触发`Minor GC`，`对象b0`的内存地址`不变`，依旧是`33076281344`，在**`Eden`**区，`GC年龄`为`0`
2. `b1~b4`尚未实例化

### 循环`i=1`
```
[GC (Allocation Failure) [DefNew: 67248K->2254K(92160K), 0.0069139 secs] 67732K->2738K(194560K), 0.0069444 secs] [Times: user=0.00 sys=0.01, real=0.01 secs] 
Obj[b0] , Address:[33170752344] , GCAge:[1]
Obj[b1] , Address:[-1] , GCAge:[-1]
Obj[b2] , Address:[-1] , GCAge:[-1]
Obj[b3] , Address:[-1] , GCAge:[-1]
Obj[b4] , Address:[-1] , GCAge:[-1]
```
1. 尝试在`Eden`区再分配`5*_10MB`的内存空间，内存空间不足，触发`Minor GC`，循环`i=0`分配的`5*_10MB`的内存空间被回收，`对象b0`被移动到了**`Survivor 0`**区，内存地址变成了`33170752344`，`GC年龄`为`1`
2. `b1~b4`尚未实例化

### 循环`i=2`
```
[GC (Allocation Failure) [DefNew: 59673K->7226K(92160K), 0.0059408 secs] 60157K->7710K(194560K), 0.0059641 secs] [Times: user=0.00 sys=0.00, real=0.01 secs] 
Obj[b0] , Address:[33160266584] , GCAge:[2]
Obj[b1] , Address:[33161577320] , GCAge:[1]
Obj[b2] , Address:[33162888056] , GCAge:[1]
Obj[b3] , Address:[33164198792] , GCAge:[1]
Obj[b4] , Address:[33165509528] , GCAge:[1]
```
1. 尝试在`Eden`区再分配`b1~b4`的内存空间，内存空间充足，不会触发`Minor GC`
2. 尝试在`Eden`区再分配`5*_10MB`的内存空间，内存空间不足，触发`Minor GC`，循环`i=1`分配的`5*_10MB`的内存空间被回收，`对象b0`被移动到了**`Survivor 1`**区，内存地址变成了`33160266584`，`GC年龄`为`2`
3. 另外这次`Minor GC`也把`b1~b4`移动到了**`Survivor 1`**区，具体信息GC日志所示

### 循环`i=3`
```
[GC (Allocation Failure) [DefNew: 60004K->0K(92160K), 0.0086877 secs] 60488K->7710K(194560K), 0.0087102 secs] [Times: user=0.00 sys=0.01, real=0.00 secs] 
Obj[b0] , Address:[33181733760] , GCAge:[2]
Obj[b1] , Address:[33183044496] , GCAge:[1]
Obj[b2] , Address:[33184355232] , GCAge:[1]
Obj[b3] , Address:[33185665968] , GCAge:[1]
Obj[b4] , Address:[33186976704] , GCAge:[1]
```
尝试在`Eden`区再分配`5*_10MB`的内存空间，内存空间不足，触发`Minor GC`，循环`i=2`分配的`5*_10MB`的内存空间被回收，此时**`Survivor 1`**区中`b1~b4`具有`相同的GC年龄`，`总大小 = 5M = 0.5 * sizeof(Survivor)`，可以进行**`动态晋升`**，所有GC年龄大于等于1的对象都可以直接晋升到老年代，因此`b0~b4`直接晋升，具体信息GC日志所示

### 循环`i=4`
```
[GC (Allocation Failure) [DefNew: 53328K->0K(92160K), 0.0009302 secs] 61039K->7710K(194560K), 0.0009761 secs] [Times: user=0.00 sys=0.00, real=0.00 secs] 
Obj[b0] , Address:[33181733760] , GCAge:[2]
Obj[b1] , Address:[33183044496] , GCAge:[1]
Obj[b2] , Address:[33184355232] , GCAge:[1]
Obj[b3] , Address:[33185665968] , GCAge:[1]
Obj[b4] , Address:[33186976704] , GCAge:[1]
```
尝试在`Eden`区再分配`5*_10MB`的内存空间，内存空间不足，触发`Minor GC`，循环`i=3`分配的`5*_10MB`的内存空间被回收，此时`b0~b4`都已经在老年代中了，此时只是`Minor GC`，内存地址和GC年龄都不会改变

<!-- indicate-the-source -->


