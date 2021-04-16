---
title: JVM进阶 -- JDK命令
date: 2019-01-08 20:54:58
categories:
    - Java
    - JVM
    - Advanced
tags:
    - Java
    - JVM
---

## jps
Lists the instrumented Java Virtual Machines (JVMs) on the target system.
如果Java进程关闭了默认开启的UsePerfData参数（**-XX:-UsePerfData**），那么**jps/jstat**将**无法探知**到该Java进程
```
$ jps
1408 Jps
19 LiveCoverMain
```
| 参数 | 备注 |
| ---- | ---- |
| m | Displays the arguments passed to the **main method**. The output may be null for embedded JVMs. |
| l | Displays the **full package name** for the application's main class or the **full path name** to the application's JAR file. |
| v | Displays the arguments passed to the **JVM**. |

<!-- more -->

## jstat
Monitors Java Virtual Machine (JVM) statistics.
```
➜  ~ jstat -options
-class
-compiler
-gc
-gccapacity
-gccause
-gcmetacapacity
-gcnew
-gcnewcapacity
-gcold
-gcoldcapacity
-gcutil
-printcompilation
```

### class
Displays statistics about the behavior of the **class loader**.
```
$ jstat -class 19
Loaded  Bytes  Unloaded  Bytes     Time   
 15375 27526.8       54    74.3      68.95
```
| 参数 | 备注 |
| ---- | ---- |
| Loaded | Number of classes loaded. |
| Bytes | Number of **kBs** loaded. |
| Unloaded | Number of classes unloaded. |
| Bytes | Number of **Kbytes** unloaded. |
| Time | Time spent performing class loading and unloading operations. |

### compiler
Displays statistics about the behavior of the Java HotSpot VM **Just-in-Time** compiler.
```
$ jstat -compiler 19
Compiled Failed Invalid   Time   FailedType FailedMethod
   17421      1       0   122.19          1 org/apache/skywalking/apm/dependencies/net/bytebuddy/pool/TypePool$Default$WithLazyResolution doResolve
```
| 参数 | 备注 |
| ---- | ---- |
| Compiled | Number of compilation tasks performed. |
| Failed | Number of compilations tasks failed. |
| Invalid | Number of compilation tasks that were invalidated. |
| Time | Time spent performing compilation tasks. |
| FailedType | Compile type of the **last** failed compilation. |
| FailedMethod | Class name and method of the **last** failed compilation. |

### printcompilation
Displays Java HotSpot VM **compilation method** statistics.
```
$ jstat -printcompilation 19
Compiled  Size  Type Method
   17423    204    1 io/netty/util/internal/MpscLinkedQueue offer
```
| 参数 | 备注 |
| ---- | ---- |
| Compiled | Number of compilation tasks performed by the **most recently** compiled method. |
| Size | Number of **bytes of byte code** of the **most recently** compiled method. |
| Type | Compilation type of the **most recently** compiled method. |
| Method | Class name and method name identifying the **most recently** compiled method. |

### gc
Displays statistics about the behavior of the garbage collected heap.
```
jstat -gc 19
 S0C    S1C    S0U    S1U      EC       EU        OC         OU       MC     MU    CCSC   CCSU   YGC     YGCT    FGC    FGCT     GCT   
43648.0 43648.0  0.0   356.5  43776.0  17636.4  1835008.0   407774.3  91668.0 82097.8 12108.0 10130.4  33313  553.212   6      0.128  553.340
```
| 参数 | 备注 |
| ---- | ---- |
| S0C | Current survivor space 0 capacity (kB). |
| S1C | Current survivor space 1 capacity (kB). |
| S0U | Survivor space 0 utilization (kB). |
| S1U | Survivor space 1 utilization (kB). |
| EC | Current eden space capacity (kB). |
| EU | Eden space utilization (kB). |
| OC | Current old space capacity (kB). |
| OU | Old space utilization (kB). |
| MC | 1. Metaspace capacity (kB).<br/>2. Klass Metaspace以及NoKlass Metaspace两者总共**committed**的内存大小 |
| MU | 1. Metacspace utilization (kB).<br/>2. Klass Metaspace以及NoKlass Metaspace两者已经使用了的内存大小 |
| CCSC | 1. Compressed class space capacity (kB).<br/>2. Klass Metaspace的已经committed的内存大小 |
| CCSU | 1. Compressed class space used (kB).<br/>2. Klass Metaspace的已经被使用的内存大小 |
| YGC | Number of young generation garbage collection events. |
| YGCT | Young generation garbage collection time. |
| FGC | Number of full GC events. |
| FGCT | Full garbage collection time. |
| GCT | Total garbage collection time. |

Metaspace相关内容可参考：[JVM源码分析之Metaspace解密](https://www.jianshu.com/p/92a5fbb33764)

#### G1
```
$ jstat -gc -t 13903
Timestamp        S0C    S1C    S0U    S1U      EC       EU        OC         OU       PC     PU    YGC     YGCT    FGC    FGCT     GCT
       554652.2  0.0   8192.0  0.0   8192.0 5275648.0 4276224.0 3104768.0   755520.9  131072.0 61178.3   8219  169.021   0      0.000  169.021
```
1. S0C和S0U始终为0，这是因为使用G1 GC时，JVM不再设置Eden区、Survivor区和Old区的**内存边界**，而是将堆划分为若干个**等长**内存区域
2. 每个内存区域都可以作为Eden区、Survivor区和Old区，并且可以在不同区域类型之间来回切换
3. 因此，**逻辑上只有一个Survivor区**，当需要迁移Survivor区中的数据（Copying），只需要申请一个或多个内存区域，作为新的Survivor区
4. 当发生垃圾回收时，JVM可能出现Survivor内存区域内的对象**全被回收**或者**全被晋升**的现象
    - 此时，JVM会将这块内存区域回收，并标记为**可分配**
    - 结果堆中可能**完全没有Survivor内存区域**，S1C和S1U均为0
5. 554652s = 6.4day

### gcnew
Displays statistics of the behavior of the **new generation**.
```
$ jstat -gcnew 19
 S0C    S1C    S0U    S1U   TT MTT  DSS      EC       EU     YGC     YGCT  
43648.0 43648.0  315.7    0.0 15  15 21824.0  43776.0  16609.9  34072  566.323
```
| 参数 | 备注 | 样例 |
| ---- | ---- | ---- |
| S0C | Current survivor space 0 capacity (kB). | |
| S1C | Current survivor space 1 capacity (kB). | |
| S0U | Survivor space 0 utilization (kB). | |
| S1U | Survivor space 1 utilization (kB). | |
| TT | **Tenuring threshold**. | 15 |
| MTT | **Maximum tenuring threshold**. | 15 |
| DSS | Desired survivor size (kB). | 1. -XX:TargetSurvivorRatio=50<br/>2. Desired percentage of survivor space used after scavenge.<br/>3. 21824KB == 0.5 * S0C |
| EC | Current eden space capacity (kB). | |
| EU | Eden space utilization (kB). | |
| YGC | Number of young generation GC events. | |
| YGCT | Young generation garbage collection time. | |

### gcold
Displays statistics about the behavior of the **old generation** and **metaspace** statistics.
```
$ jstat -gcold 19
   MC       MU      CCSC     CCSU       OC          OU       YGC    FGC    FGCT     GCT   
 92564.0  82773.0  12236.0  10223.6   1835008.0    423476.6  34693     6    0.128  575.369
```
| 参数 | 备注 |
| ---- | ---- |
| MC | Metaspace capacity (kB). |
| MU | Metaspace utilization (kB). |
| CCSC | Compressed class space capacity (kB). |
| CCSU | Compressed class space used (kB). |
| OC | Current old space capacity (kB). |
| OU | Old space utilization (kB). |
| YGC | Number of young generation GC events. |
| FGC | Number of full GC events. |
| FGCT | Full garbage collection time. |
| GCT | Total garbage collection time. |

### gccapacity
Displays statistics about the capacities of the generations and their corresponding spaces.
```
$ jstat -gccapacity 19
 NGCMN    NGCMX     NGC     S0C   S1C       EC      OGCMN      OGCMX       OGC         OC       MCMN     MCMX      MC     CCSMN    CCSMX     CCSC    YGC    FGC
131072.0 131072.0 131072.0 43648.0 43648.0  43776.0  1835008.0  1835008.0  1835008.0  1835008.0      0.0 1128448.0  91668.0      0.0 1048576.0  12108.0  33477     6
```
| 参数 | 备注 | 样例 |
| ---- | ---- | ---- |
| NGCMN | Minimum new generation capacity (kB). | |
| NGCMX | Maximum new generation capacity (kB). | |
| NGC | Current new generation capacity (kB). | |
| S0C | Current survivor space 0 capacity (kB). | |
| S1C | Current survivor space 1 capacity (kB). | |
| EC | Current eden space capacity (kB). | |
| OGCMN | Minimum old generation capacity (kB). | |
| OGCMX | Maximum old generation capacity (kB). | |
| OGC | Current old generation capacity (kB). | |
| OC | Current old space capacity (kB). | |
| MCMN | Minimum metaspace capacity (kB). | 0 |
| MCMX | Maximum metaspace capacity (kB). | 1. Klass Metaspace以及NoKlass Metaspace两者总共的**reserved**的内存大小<br/>2. 默认情况下Klass Metaspace是通过**CompressedClassSpaceSize**这个参数来reserved 1G的内存<br/>3. NoKlass Metaspace默认reserved的内存大小是**2*InitialBootClassLoaderMetaspaceSize**<br/>4. 1128448KB == 1.076GB |
| MC | Metaspace capacity (kB). | 1. Klass Metaspace以及NoKlass Metaspace两者总共**committed**的内存大小<br/>2. 91668KB == 89.5MB |
| CCSMN | Compressed class space minimum capacity (kB). | 0 |
| CCSMX | Compressed class space maximum capacity (kB). | 1. Klass Metaspace reserved的内存大小<br/>2. 1048576KB == 1GB |
| CCSC | Compressed class space capacity (kB). | 1. Klass Metaspace的已committed的内存大小<br/>2. 12108KB == 11.8MB |
| YGC | Number of young generation GC events. | |
| FGC | Number of full GC events. | |

### gcnewcapacity
Displays statistics about the sizes of the new generations and its corresponding spaces.
```
$ jstat -gcnewcapacity 19
  NGCMN      NGCMX       NGC      S0CMX     S0C     S1CMX     S1C       ECMX        EC      YGC   FGC
  131072.0   131072.0   131072.0  43648.0  43648.0  43648.0  43648.0    43776.0    43776.0 34383     6
```
| 参数 | 备注 |
| ---- | ---- |
| NGCMN | Minimum new generation capacity (kB). |
| NGCMX | Maximum new generation capacity (kB). |
| NGC | Current new generation capacity (kB). |
| S0CMX | Maximum survivor space 0 capacity (kB). |
| S0C | Current survivor space 0 capacity (kB). |
| S1CMX | Maximum survivor space 1 capacity (kB). |
| S1C | Current survivor space 1 capacity (kB). |
| ECMX | Maximum eden space capacity (kB). |
| EC | Current eden space capacity (kB). |
| YGC | Number of young generation GC events. |
| FGC | Number of full GC events. |

### gcoldcapacity
Displays statistics about the sizes of the old generation.
```
$ jstat -gcoldcapacity 19
   OGCMN       OGCMX        OGC         OC       YGC   FGC    FGCT     GCT   
  1835008.0   1835008.0   1835008.0   1835008.0 34478     6    0.128  572.454
```
| 参数 | 备注 |
| ---- | ---- |
| OGCMN | Minimum old generation capacity (kB). |
| OGCMX | Maximum old generation capacity (kB). |
| OGC | Current old generation capacity (kB). |
| OC | Current old space capacity (kB). |
| YGC | Number of young generation GC events. |
| FGC | Number of full GC events. |
| FGCT | Full garbage collection time. |
| GCT | Total garbage collection time. |

### gcmetacapacity
Displays statistics about the sizes of the metaspace.
```
$ jstat -gcmetacapacity 19
   MCMN       MCMX        MC       CCSMN      CCSMX       CCSC     YGC   FGC    FGCT     GCT   
       0.0  1130496.0    92564.0        0.0  1048576.0    12236.0 34593     6    0.128  574.271
```
| 参数 | 备注 |
| ---- | ---- |
| MCMN | Minimum metaspace capacity (kB). |
| MCMX | Maximum metaspace capacity (kB). |
| MC | Metaspace capacity (kB). |
| CCSMN | Compressed class space minimum capacity (kB). |
| CCSMX | Compressed class space maximum capacity (kB). |
| YGC | Number of young generation GC events. |
| FGC | Number of full GC events. |
| FGCT | Full garbage collection time. |
| GCT | Total garbage collection time. |

### gcutil
Displays a summary about garbage collection statistics.
```
$ jstat -gcutil 19
  S0     S1     E      O      M     CCS    YGC     YGCT    FGC    FGCT     GCT   
  0.16   0.00  14.11  23.02  89.37  83.50  34596  574.184     6    0.128  574.312
```
| 参数 | 备注 | 样例 |
| ---- | ---- | ---- |
| S0 | Survivor space 0 utilization as a percentage of the space's current capacity. | |
| S1 | Survivor space 1 utilization as a percentage of the space's current capacity. | |
| E | Eden space utilization as a percentage of the space's current capacity. | |
| O | Old space utilization as a percentage of the space's current capacity. | |
| M | Metaspace utilization as a percentage of the space's current capacity. | 1. Klass Metaspace以及NoKlass Metaspace两者总共的使用率<br/>2. MC=92564.0, MU=82773.0, CCSC=12236.0, CCSU=10223.6<br/>3. M = MU/MC = 89.4<br/>4. 有时候M达到90%以上，不一定说明metaspace使用了很多，因为内存是慢慢commit的 |
| CCS | Compressed class space utilization as a percentage. | 1. NoKlass Metaspace的使用率<br/>2. MC=92564.0, MU=82773.0, CCSC=12236.0, CCSU=10223.6<br/>3. CCS = CCSU/CCSC = 83.5 |
| YGC | Number of young generation GC events. | |
| YGCT | Young generation garbage collection time. | |
| FGC | Number of full GC events. | |
| FGCT | Full garbage collection time. | |
| GCT | Total garbage collection time. | |

### gccause
Displays a summary about garbage collection statistics (same as -gcutil), with the cause of the **last** and **current** (when
applicable) garbage collection events.
```
$ jstat -gccause 19
  S0     S1     E      O      M     CCS    YGC     YGCT    FGC    FGCT     GCT    LGCC                 GCC                 
  0.00   0.83   2.23  22.60  89.67  84.02  33919  563.393     6    0.128  563.521 Allocation Failure   No GC
```
| 参数 | 备注 | 样例 |
| ---- | ---- | ---- |
| LGCC | Cause of **last** garbage collection | Allocation Failure |
| GCC | Cause of **current** garbage collection | No GC |

## jmap
1. Prints shared object memory maps or heap memory details for a process, core file, or remote debug server.
2. 由于jmap将访问**堆中的所有对象**，为了保证次此过程不被应用线程干扰
    - jmap需要借助**安全点机制**，让所有线程停留在不改变堆中数据的状态
3. 因此，**jmap导出的堆快照必定是安全点位置的**，可能导致基于该堆快照的分析结果存在**偏差**
    - 例如编译生成的机器码中，某些对象的生命周期在两个安全点之间，那么:live选项将无法探知到这些对象
4. 如果某个线程长时间无法跑到安全点，jmap将一直等待下去
    - 垃圾回收器会主动将jstat所需要的摘要数据保存至**固定位置**
    - 因此jstat只需要直接读取即可
5. **jps/jmap/jinfo/jstack/jcmd**，均依赖于JVM的**Attach API**，因此**只能监控本地Java进程**
6. 如果开启`-XX:+DisableAttachMechanism`，那么基于**Attach API**的命令也将无法执行

### clstats
Prints class loader wise statistics of Java heap. For each class loader, its name, how active it is, address, parent class loader, and the number and size of classes it has loaded are printed.
```
$ jmap -clstats 19
Attaching to process ID 19, please wait...
Debugger attached successfully.
Server compiler detected.
JVM version is 25.131-b11
finding class loader instances ..done.
computing per loader stat ..done.
please wait.. computing liveness.liveness analysis may be inaccurate ...
class_loader    classes bytes   parent_loader   alive?  type

<bootstrap>     2508    4508619   null          live    <internal>
0x000000009388bb88      1       1473      null          dead    sun/reflect/DelegatingClassLoader@0x0000000100009df8
0x0000000090bcccb8      1       1472    0x0000000090024a50      dead    sun/reflect/DelegatingClassLoader@0x0000000100009df8
...
total = 634     12693   20378456            N/A         alive=1, dead=633           N/A
```

### finalizerinfo
Prints information about objects that are awaiting finalization.
```
$ jmap -finalizerinfo 19
Attaching to process ID 19, please wait...
Debugger attached successfully.
Server compiler detected.
JVM version is 25.131-b11
Number of objects pending for finalization: 0
```

### heap
Prints a heap summary of the garbage collection used, the head configuration, and generation-wise heap usage. In addition, the number and size of interned Strings are printed.
```
$ jmap -heap 19
Attaching to process ID 19, please wait...
Debugger attached successfully.
Server compiler detected.
JVM version is 25.131-b11

using parallel threads in the new generation.
using thread-local object allocation.
Concurrent Mark-Sweep GC

Heap Configuration:
   MinHeapFreeRatio         = 40
   MaxHeapFreeRatio         = 70
   MaxHeapSize              = 2013265920 (1920.0MB)
   NewSize                  = 134217728 (128.0MB)
   MaxNewSize               = 134217728 (128.0MB)
   OldSize                  = 1879048192 (1792.0MB)
   NewRatio                 = 2
   SurvivorRatio            = 1
   MetaspaceSize            = 21807104 (20.796875MB)
   CompressedClassSpaceSize = 1073741824 (1024.0MB)
   MaxMetaspaceSize         = 17592186044415 MB
   G1HeapRegionSize         = 0 (0.0MB)

Heap Usage:
New Generation (Eden + 1 Survivor Space):
   capacity = 89522176 (85.375MB)
   used     = 32297224 (30.80103302001953MB)
   free     = 57224952 (54.57396697998047MB)
   36.07734467937866% used
Eden Space:
   capacity = 44826624 (42.75MB)
   used     = 31529392 (30.068771362304688MB)
   free     = 13297232 (12.681228637695312MB)
   70.33630728024488% used
From Space:
   capacity = 44695552 (42.625MB)
   used     = 767832 (0.7322616577148438MB)
   free     = 43927720 (41.892738342285156MB)
   1.7179159125274928% used
To Space:
   capacity = 44695552 (42.625MB)
   used     = 0 (0.0MB)
   free     = 44695552 (42.625MB)
   0.0% used
concurrent mark-sweep generation:
   capacity = 1879048192 (1792.0MB)
   used     = 33776136 (32.21143341064453MB)
   free     = 1845272056 (1759.7885665893555MB)
   1.7975130251475744% used

21703 interned Strings occupying 2142592 bytes.
```

### histo[:live]
Prints a histogram of the heap. For each Java class, the number of objects, memory size in bytes, and the fully qualified class names are printed. The JVM internal class names are printed with an asterisk (\*) prefix. If the live suboption is specified, then only active objects are counted.
```
$ jmap -histo:live 19
num     #instances         #bytes  class name
----------------------------------------------
   1:         72102        6440744  [C
   2:          5996        4159456  [B
   3:         19079        1783760  [Ljava.lang.Object;
   4:         71213        1709112  java.lang.String
...
Total        529634       28005336
```
### dump:[live,] format=b, file=filename
Dumps the Java heap in **hprof** binary format to filename. The live suboption is optional, but when specified, only the active objects in the heap are dumped.
相关的JVM参数：`-XX:+HeapDumpAfterFullGC`，`-XX:+HeapDumpOnOutOfMemoryError`
```
$ jmap -dump:live,format=b,file=/tmp/cover.hprof 19
Dumping heap to /tmp/cover.hprof ...
Heap dump file created
```

## jinfo
Generates configuration information
```
$ jinfo 19
Attaching to process ID 19, please wait...
Debugger attached successfully.
Server compiler detected.
JVM version is 25.131-b11
Java System Properties:

java.runtime.name = Java(TM) SE Runtime Environment
java.vm.version = 25.131-b11
...
conf.key = lz_live_cover
...
VM Flags:
Non-default VM flags: -XX:CICompilerCount=2 -XX:+CMSClassUnloadingEnabled
....
Command line:  -Dconf.key=lz_live_cover -Dconf.env=pre
```

### sysprops
Prints Java system properties as name-value pairs.
```
$ jinfo -sysprops 19
Attaching to process ID 19, please wait...
Debugger attached successfully.
Server compiler detected.
JVM version is 25.131-b11
java.runtime.name = Java(TM) SE Runtime Environment
java.vm.version = 25.131-b11
...
java.vm.vendor = Oracle Corporation
conf.key = lz_live_cover
...
java.vm.name = Java HotSpot(TM) 64-Bit Server VM
sun.java.launcher = SUN_STANDARD
...
```

### flags
```
$ jinfo -flags 19
Attaching to process ID 19, please wait...
Debugger attached successfully.
Server compiler detected.
JVM version is 25.131-b11
Non-default VM flags: -XX:CICompilerCount=2 -XX:+CMSClassUnloadingEnabled
...
Command line:  -Dconf.key=lz_live_cover -Dconf.env=pre
...
```

### manageable参数
```
$ java -XX:+PrintFlagsFinal -version | grep manageable
     intx CMSAbortablePrecleanWaitMillis            = 100                                 {manageable}
     intx CMSTriggerInterval                        = -1                                  {manageable}
     intx CMSWaitDuration                           = 2000                                {manageable}
     bool HeapDumpAfterFullGC                       = false                               {manageable}
     bool HeapDumpBeforeFullGC                      = false                               {manageable}
     bool HeapDumpOnOutOfMemoryError                = false                               {manageable}
    ccstr HeapDumpPath                              =                                     {manageable}
    uintx MaxHeapFreeRatio                          = 100                                 {manageable}
    uintx MinHeapFreeRatio                          = 0                                   {manageable}
     bool PrintClassHistogram                       = false                               {manageable}
     bool PrintClassHistogramAfterFullGC            = false                               {manageable}
     bool PrintClassHistogramBeforeFullGC           = false                               {manageable}
     bool PrintConcurrentLocks                      = false                               {manageable}
     bool PrintGC                                   = false                               {manageable}
     bool PrintGCDateStamps                         = false                               {manageable}
     bool PrintGCDetails                            = false                               {manageable}
     bool PrintGCID                                 = false                               {manageable}
     bool PrintGCTimeStamps                         = false                               {manageable}
java version "1.8.0_131"
Java(TM) SE Runtime Environment (build 1.8.0_131-b11)
Java HotSpot(TM) 64-Bit Server VM (build 25.131-b11, mixed mode)
```

### flag
Prints the name and value of the specified command-line flag.
```
$ jinfo -flag HeapDumpAfterFullGC 19
-XX:-HeapDumpAfterFullGC
```

### flag [+|-]name
Enables or disables the specified Boolean command-line flag.
```
$ jinfo -flag +HeapDumpAfterFullGC 19

$ jinfo -flag HeapDumpAfterFullGC 19
-XX:+HeapDumpAfterFullGC
```

### flag name=value
Sets the specified command-line flag to the specified value.
```
$ jinfo -flag CMSWaitDuration=1999 19

$ jinfo -flag CMSWaitDuration 19
-XX:CMSWaitDuration=1999
```

## jstack
Prints Java thread stack traces for a Java process, core file, or remote debug server.
jstack的一个常用应用场景为**死锁检测**
```
$ jstack 19120
2019-01-10 09:53:21
Full thread dump Java HotSpot(TM) 64-Bit Server VM (25.181-b13 mixed mode):

...

"t3" #12 prio=5 os_prio=31 tid=0x00007faa948b4800 nid=0xf07 waiting for monitor entry [0x00007000043c8000]
   java.lang.Thread.State: BLOCKED (on object monitor)
	at me.zhongmingmao.advanced.command.SyncThread.run(ThreadDeadlock.java:39)
	- waiting to lock <0x0000000795700530> (a java.lang.Object)
	- locked <0x0000000795700550> (a java.lang.Object)
	at java.lang.Thread.run(Thread.java:748)

"t2" #11 prio=5 os_prio=31 tid=0x00007faa948b4000 nid=0x3c03 waiting for monitor entry [0x0000700005581000]
   java.lang.Thread.State: BLOCKED (on object monitor)
	at me.zhongmingmao.advanced.command.SyncThread.run(ThreadDeadlock.java:39)
	- waiting to lock <0x0000000795700550> (a java.lang.Object)
	- locked <0x0000000795700540> (a java.lang.Object)
	at java.lang.Thread.run(Thread.java:748)

"t1" #10 prio=5 os_prio=31 tid=0x00007faa948b3000 nid=0x4203 waiting for monitor entry [0x000070000547e000]
   java.lang.Thread.State: BLOCKED (on object monitor)
	at me.zhongmingmao.advanced.command.SyncThread.run(ThreadDeadlock.java:39)
	- waiting to lock <0x0000000795700540> (a java.lang.Object)
	- locked <0x0000000795700530> (a java.lang.Object)
	at java.lang.Thread.run(Thread.java:748)

...

Found one Java-level deadlock:
=============================
"t3":
  waiting to lock monitor 0x00007faa94811b58 (object 0x0000000795700530, a java.lang.Object),
  which is held by "t1"
"t1":
  waiting to lock monitor 0x00007faa9480da08 (object 0x0000000795700540, a java.lang.Object),
  which is held by "t2"
"t2":
  waiting to lock monitor 0x00007faa94811aa8 (object 0x0000000795700550, a java.lang.Object),
  which is held by "t3"

...

Found 1 deadlock.
```

## jcmd
Sends diagnostic command requests to a running Java Virtual Machine (JVM).
**jcmd可以替代上面除了jstat之外的所有命令，并没有保留jstat的输出格式**

### 查看进程
```
$ jcmd -l
19 fm.lizhi.live.cover.LiveCoverMain lz-live-cover-pre-deployment-5f45b6955d-f4xjj
3241 sun.tools.jcmd.JCmd -l
```

### 查看性能统计
```
$ jcmd 19 PerfCounter.print
java.ci.totalTime=445938928367
java.cls.loadedClasses=20317
...
java.threads.daemon=121
java.threads.live=124
java.threads.livePeak=125
java.threads.started=2458
...
```

### 可执行的操作
```
$ jcmd 19 help
19:
The following commands are available:
JFR.stop
JFR.start
JFR.dump
JFR.check
VM.native_memory
VM.check_commercial_features
VM.unlock_commercial_features
ManagementAgent.stop
ManagementAgent.start_local
ManagementAgent.start
GC.rotate_log
Thread.print
GC.class_stats
GC.class_histogram
GC.heap_dump
GC.run_finalization
GC.run
VM.uptime
VM.flags
VM.system_properties
VM.command_line
VM.version
help
```

#### VM.uptime
```
$ jcmd 19 VM.uptime
19:
87089.850 s
```

#### GC.run
```
$ jcmd 19 GC.run
19:
Command executed successfully
```

#### Thread.print
```
$ jcmd 3721 Thread.print
Found one Java-level deadlock:
=============================
"t3":
  waiting to lock monitor 0x00007fd53105ff58 (object 0x0000000795700530, a java.lang.Object),
  which is held by "t1"
"t1":
  waiting to lock monitor 0x00007fd53105be08 (object 0x0000000795700540, a java.lang.Object),
  which is held by "t2"
"t2":
  waiting to lock monitor 0x00007fd53105fea8 (object 0x0000000795700550, a java.lang.Object),
  which is held by "t3"
```

#### JFR
```
$ jcmd 3721 JFR.check
3721:
Java Flight Recorder not enabled.
Use VM.unlock_commercial_features to enable.

$ jcmd 3721 VM.unlock_commercial_features
3721:
Commercial Features now unlocked.

$ jcmd 3721 JFR.check
3721:
No available recordings.
Use JFR.start to start a recording.
```
```
$ jcmd 3721 JFR.start name=abc,duration=120s
3721:
Started recording 1. No limit (duration/maxsize/maxage) in use.
Use JFR.dump name=abc,duration=120s filename=FILEPATH to copy recording data to file.

$ jcmd 3721 JFR.check
3721:
Recording: recording=1 name="abc,duration=120s" (running)
```
```
$ cmd 3721 JFR.dump name=abc,duration=120s filename=abc.jfr
3721:
Dumped recording "abc,duration=120s", 391.4 kB written to:
/Users/zhongmingmao/Documents/source_code/github/jvm_demo/abc.jfr
```
```
$ jcmd 3721 JFR.stop name=abc,duration=120s
3721:
Stopped recording "abc,duration=120s".
```

## 参考资料
[深入拆解Java虚拟机](https://time.geekbang.org/column/intro/100010301)

<!-- indicate-the-source -->
