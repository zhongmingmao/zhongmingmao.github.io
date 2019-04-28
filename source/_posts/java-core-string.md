---
title: Java核心 -- 字符串
date: 2019-04-27 12:31:19
categories:
    - Java Core
tags:
    - Java Core
---

## String
1. String是Java语言非常**基础**和**重要**的类，提供了构造和管理字符串的各种基本逻辑，是典型的**Immutable**类
    - String是Immutable类的典型实现，原生的保证了**基础线程安全**，因为无法对它内部数据进行任何修改
2. 被声明为final class，由于String的**不可变**性，类似拼接、裁剪字符串等动作，都会**产生新的String对象**
3. 由于字符串操作的普遍性，所以相关操作的效率往往对**应用性能**有明显影响

<!-- more -->

## StringBuffer
1. StringBuffer是为了解决拼接产生太多中间对象的问题而提供的一个类
2. StringBuffer本质是一个**线程安全**的可修改字符串序列，保证了线程安全，但也带来了额外的**性能开销**
3. StringBuffer的线程安全是通过把各种修改数据的方法都加上synchronized关键字实现的
    - 这种方式非常适合常见的线程安全类的实现，不必纠结于synchronized的性能
    - **过早的优化是万恶之源**，可靠性、正确性和代码可读性才是大多数应用开发的首要考虑因素

## StringBuilder
1. StringBuilder在能力上和StringBuffer没有本质区别，但去掉了线程安全的部分，有效减小了开销
2. StringBuffer和StringBuilder底层都是利用可修改的数组（Java 8为char[]，Java 9为byte[]），都继承AbstractStringBuilder
    - 区别仅在于最终的方法是否有synchronized关键字
3. 内部数组初始大小为初始字符串长度+16
    - 如果确定拼接会发生多次，并且是可预计的，最好指定**合适的初始大小**，避免多次**扩容的开销**（arraycopy）

## 字符串拼接
```java
public class StringConcat {
    public static void main(String[] args) {
        String str = "aa" + "bb" + "cc" + "dd";
        System.out.println("str : " + str);
    }
}
```
先用**javac**编译，再用**javap**反编译

### Java 8
```
public static void main(java.lang.String[]);
  descriptor: ([Ljava/lang/String;)V
  flags: ACC_PUBLIC, ACC_STATIC
  Code:
    stack=3, locals=2, args_size=1
       0: ldc           #2                  // String aabbccdd
       2: astore_1
       3: getstatic     #3                  // Field java/lang/System.out:Ljava/io/PrintStream;
       6: new           #4                  // class java/lang/StringBuilder
       9: dup
      10: invokespecial #5                  // Method java/lang/StringBuilder."<init>":()V
      13: ldc           #6                  // String str :
      15: invokevirtual #7                  // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
      18: aload_1
      19: invokevirtual #7                  // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
      22: invokevirtual #8                  // Method java/lang/StringBuilder.toString:()Ljava/lang/String;
      25: invokevirtual #9                  // Method java/io/PrintStream.println:(Ljava/lang/String;)V
      28: return
```
1. "aa" + "bb" + "cc" + "dd"会被当成常量"aabbccdd"
2. 字符串的拼接操作会自动被javac转换成StringBuilder操作

### Java 11
```
public static void main(java.lang.String[]);
  descriptor: ([Ljava/lang/String;)V
  flags: ACC_PUBLIC, ACC_STATIC
  Code:
    stack=2, locals=2, args_size=1
       0: ldc           #2                  // String aabbccdd
       2: astore_1
       3: getstatic     #3                  // Field java/lang/System.out:Ljava/io/PrintStream;
       6: aload_1
       7: invokedynamic #4,  0              // InvokeDynamic #0:makeConcatWithConstants:(Ljava/lang/String;)Ljava/lang/String;
      12: invokevirtual #5                  // Method java/io/PrintStream.println:(Ljava/lang/String;)V
      15: return
```
1. "aa" + "bb" + "cc" + "dd"同样会被当成常量"aabbccdd"
2. Java 11为了更加统一字符串操作优化，提供了StringConcatFactory，作为一个统一的入口
3. javac自动生成的代码，未必是最优的，但针对普通场景已经足够了

## 字符串缓存
1. 把常见应用进行Heap Dump，然后分析对象组成，大约25%的对象是字符串，并且其中约50%是**重复**的
    - 如果能避免创建重复字符串，可以有效降低**内存消耗**和**对象创建开销**
2. String在Java 6提供了intern()，目的是提示JVM把相应的字符串缓存起来
    - 创建String对象并且调用intern()，如果已经有缓存的字符串，就会返回缓存里的实例，否则将其缓存起来
    - 被缓存的字符串会存储在**PermGen**（永久代），PermGen的**空间非常有限**，只有**FullGC**会处理PermGen
    - 所以，如果使用不当，会触发OOM
    - 另外，intern()是一种**显式**地排重机制，但这也是一种_**代码污染**_
3. 在后续的Java版本中，字符串缓存被放置在**堆**中，极大的避免了PermGen占满的问题
    - 在Java 8中被**MetaSpace**（元数据区）取代了
4. 默认缓存大小也在不断地扩大，可以通过`-XX:+PrintStringTableStatistics`查看
    - 也可以通过`-XX:StringTableSize=N`调整大小，但绝大部分情况下不需要调整
5. 在Oracle JDK 8u20出现了G1 GC的字符串排重，通过**将相同数据的字符串指向同一份数据**来实现的
    - 这是JVM底层的改变，并不需要Java类库做修改
    - 该功能目前是默认关闭的，启动参数`-XX:+UseStringDeduplication`

```java
$ java -XX:+PrintStringTableStatistics -version
java version "1.8.0_191"
Java(TM) SE Runtime Environment (build 1.8.0_191-b12)
Java HotSpot(TM) 64-Bit Server VM (build 25.191-b12, mixed mode)
SymbolTable statistics:
Number of buckets       :     20011 =    160088 bytes, avg   8.000
Number of entries       :      9616 =    230784 bytes, avg  24.000
Number of literals      :      9616 =    380296 bytes, avg  39.548
Total footprint         :           =    771168 bytes
Average bucket size     :     0.481
Variance of bucket size :     0.483
Std. dev. of bucket size:     0.695
Maximum bucket size     :         5
StringTable statistics:
Number of buckets       :     60013 =    480104 bytes, avg   8.000
Number of entries       :       672 =     16128 bytes, avg  24.000
Number of literals      :       672 =     45472 bytes, avg  67.667
Total footprint         :           =    541704 bytes
Average bucket size     :     0.011
Variance of bucket size :     0.011
Std. dev. of bucket size:     0.106
Maximum bucket size     :         2
```

## Intrinsic
1. 在运行时，字符串的一些基础操作会直接利用JVM内部的**Intrinsic机制**
    - 往往运行的是**特殊优化的本地代码**，而不是Java代码生成的字节码
2. Intrinsic：是一种**利用native方式hard-coded**的逻辑，算是一种特殊的内联，很多优化还需要使用**特定的CPU指令**
3. 通过`-XX:+PrintCompilation -XX:+UnlockDiagnosticVMOptions -XX:+PrintInlining`查看

```java
$ java -XX:+PrintCompilation -XX:+UnlockDiagnosticVMOptions -XX:+PrintInlining -version
    64    1       3       java.lang.String::hashCode (55 bytes)
    66    2       3       java.lang.String::charAt (29 bytes)
                             @ 18  java/lang/StringIndexOutOfBoundsException::<init> (not loaded)   not inlineable
    67    3       3       java.lang.String::length (6 bytes)
    68    4     n 0       java.lang.System::arraycopy (native)   (static)
    68    5       3       java.lang.String::equals (81 bytes)
    java version "1.8.0_191"
    Java(TM) SE Runtime Environment (build 1.8.0_191-b12)
    Java HotSpot(TM) 64-Bit Server VM (build 25.191-b12, mixed mode)
```

## 字符串压缩
1. 在Java的历史版本中，使用了char[]来存储数据
2. 但char占用**2个byte**，而拉丁语系语言的字符，不需要太宽的char，这会造成一定的浪费
3. 在Java 9中引入了**Compact Strings**的设计
    - 将存储方式从char[]数组改变为一个byte[]加上一个标识编码的coder
    - 并且将相关字符串操作类都进行了修改，所有相关的Intrinsic都进行了重写，保证没有任何性能损失
    - 该特性对绝大部分应用来说是**透明**的

<!-- indicate-the-source -->
