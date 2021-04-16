---
title: JVM基础 -- 异常处理
date: 2018-12-19 20:19:08
categories:
    - Java
    - JVM
    - Baisc
tags:
    - Java
    - JVM
---

## 抛出异常 + 捕获异常

### 抛出异常
1. **显式**抛异常的主体是**应用程序**，使用**throw**关键字
2. **隐式**抛异常的主体是**JVM**，在JVM执行过程中，碰到无法继续执行的异常状态时，自动抛出异常
    - 例如ArrayIndexOutOfBoundsException

### 捕获异常
1. try代码块
    - 标记需要**异常监控**的代码
2. catch代码块
    - 定义了**针对指定类型的异常处理器**
    - 多个catch代码块，JVM会**从上至下**匹配异常处理器
    - 前面catch代码块所捕获的异常类型不能覆盖后边的，否则编译器会报错
3. finally代码块
    - 声明一段**必定运行**的代码
    - 程序正常执行，未抛出异常，try -> finally
    - 程序抛出异常未被捕获，try(throw A) -> finally -> throw A
    - 程序抛出异常并被捕获，try(throw A) -> catch(A) -> finally
    - 程序抛出异常并被捕获，并且catch代码块也抛出异常，try(throw A) -> catch(A, throw B) -> finally -> throw B
    - finally代码块抛出异常，中断finally代码块的执行，往外抛出异常

<!-- more -->

## 基本概念

### 继承关系
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/basic/jvm-basic-exception.png" />

1. 所有异常都是Throwable的子类
2. Error
    - 应用程序不应该捕获的异常
    - 当程序触发Error时，已经无法恢复，需要**终止线程**甚至**终止JVM**
3. Exception
    - 应用程序需要捕获的异常（RuntimeException除外）
4. **RuntimeException和Error属于Java的unchecked exception**，其他异常属于checked exception
    - 所有checked exception都需要显式捕获或在方法声明中用throws关键词标注
    - 通常情况下，**程序自定义的异常应该为checked exception**，以便于最大化利用Java编译器的**编译时检查**
5. **异常实例的构造是非常昂贵的**
    - 在构造异常实例时，JVM需要生成该异常的**栈轨迹（stack trace）**
    - 该操作会**逐一访问当前线程的Java栈帧，并且记录下各种调试信息**
        - 栈帧所指向方法的名字，方法所在的类名、文件名，以及在代码中的第几行触发该异常
    - 在生成stack trace的时候，JVM会忽略掉异常构造器以及填充栈帧的Java方法（Throwable.fillInStackTrace），直接从新建异常位置开始算起
    - JVM还会忽略标记为不可见的方法栈帧
    - 即使代价昂贵，依旧不推荐缓存异常实例，容易误导开发人员

## 捕获异常的机制

### Java代码
```java
try {
    int a = 1;
} catch (RuntimeException e) {
    int b = 2;
} catch (Exception e) {
    int c = 3;
}
```

### 字节码
```
stack=1, locals=3, args_size=1
     0: iconst_1
     1: istore_1
     2: goto          14
     5: astore_1
     6: iconst_2
     7: istore_2
     8: goto          14
    11: astore_1
    12: iconst_3
    13: istore_2
    14: return
  Exception table:
     from    to  target type
         0     2     5   Class java/lang/RuntimeException
         0     2    11   Class java/lang/Exception
```

1. 编译生成的字节码中，**每个方法都附带一个异常表**，异常表中的每一个条目代表一个**异常处理器**
    - 条目组成：from指针、to指针、target指针和所捕获的异常类型
    - 这里的指针的值指的是**字节码索引**，用于定位字节码
    - from指针和to指针（不含）标示了该异常处理器所监控的范围
    - target指针指向异常处理器的起始位置
2. 当程序触发异常时，JVM虚拟机会从上而下遍历异常表中的所有条目
    - 当触发异常的字节码的索引值在某个异常表条目的监控范围内，JVM会判断所抛出的异常与该条目**想要捕获的异常**是否匹配
    - 如果匹配，JVM会将控制流转移到该条目的target指针指向的字节码
    - 如果遍历完所有异常条目，JVM仍未匹配到异常处理器，那么会**弹出当前方法所对应的栈帧**，并且在**调用者**中重复上述操作
    - **最坏情况：JVM需要遍历当前线程Java栈上所有方法的异常表**

### finally代码块
1. 复制finally代码块的内容，分别放在try-catch代码块的**正常执行路径出口**以及**异常执行路径出口**
2. 针对异常执行路径，Java编译器会生成一个或多个异常表条目，**监控整个try-catch代码块**，并且捕获所有种类的异常（any）
    - 这些异常表条目的target指针将指向另一份复制的finally代码块
    - **在这个代码块最后，Java编译器会重新抛出所捕获的异常**

#### Java代码
```java
public class Foo {
    private int tryBlock;
    private int catchBlock;
    private int finallyBlock;
    private int methodExit;

    public void test() {
        try {
            tryBlock = 0;
        } catch (RuntimeException e) {
            catchBlock = 1;
        } finally {
            finallyBlock = 2;
        }
        methodExit = 3;
    }
}
```

#### 字节码
```
stack=2, locals=3, args_size=1
   0: aload_0
   1: iconst_0
   2: putfield      #2                  // Field tryBlock:I
   5: aload_0
   6: iconst_2
   7: putfield      #3                  // Field finallyBlock:I
  10: goto          35
  13: astore_1
  14: aload_0
  15: iconst_1
  16: putfield      #5                  // Field catchBlock:I
  19: aload_0
  20: iconst_2
  21: putfield      #3                  // Field finallyBlock:I
  24: goto          35
  27: astore_2
  28: aload_0
  29: iconst_2
  30: putfield      #3                  // Field finallyBlock:I
  33: aload_2
  34: athrow
  35: aload_0
  36: iconst_3
  37: putfield      #6                  // Field methodExit:I
  40: return
Exception table:
   from    to  target type
       0     5    13   Class java/lang/RuntimeException # 监控try代码块
       0     5    27   any # 监控try代码块
      13    19    27   any # 监控catch代码块
```
1. 编译结果包含三份finallyBlock代码块
    - 前两份分别位于try代码块和catch代码块的正常执行路径出口
    - 最后一份作为异常处理器，监控try代码块和catch代码块，用于捕获两类异常
        - try代码块触发的，未被catch代码块捕获的异常
        - catch代码块触发的异常
2. 如果catch代码块捕获了异常A，并且触发异常B，那么finally捕获并重新抛出的是异常B
    - **原本的异常会被忽略掉**，对于代码调试非常不方便

## Supressed异常+语法糖
1. Java 7引入**Supressed异常**来解决上述问题，允许**将一个异常附于另一个异常之上**
    - 抛出的异常可以附带多个异常的信息
2. 语法糖：**try-with-resources**
    - **在字节码层面自动使用Supressed异常**

### Java代码
```java
@Data
@AllArgsConstructor
public class R implements AutoCloseable {
    private String name;

    @Override
    public void close() throws Exception {
        throw new RuntimeException(name);
    }

    public static void main(String[] args) throws Exception {
        try (R r1 = new R("R1");
             R r2 = new R("R2")) {
            throw new RuntimeException("Init");
        }
    }
}
```

### 输出
```
Exception in thread "main" java.lang.RuntimeException: Init
	at me.zhongmingmao.basic.exception.R.main(R.java:19)
	Suppressed: java.lang.RuntimeException: R2
		at me.zhongmingmao.basic.exception.R.close(R.java:13)
		at me.zhongmingmao.basic.exception.R.main(R.java:20)
	Suppressed: java.lang.RuntimeException: R1
		at me.zhongmingmao.basic.exception.R.close(R.java:13)
		at me.zhongmingmao.basic.exception.R.main(R.java:20)
```

### 字节码
```
103: astore        9
105: aload_2
106: aload         9
// 自动使用Supressed异常
108: invokevirtual #11                 // Method java/lang/Throwable.addSuppressed:(Ljava/lang/Throwable;)V
111: goto          118
114: aload_1
115: invokevirtual #10                 // Method close:()V
118: aload         8
120: athrow
```

## 同时捕获多个异常

### Java代码
```java
public class T {
    public void test() {
        try {
            int a = 1;
        } catch (E2 | E1 e) {
            int b = 2;
        }
    }
}

class E1 extends RuntimeException {
}
class E2 extends RuntimeException {
}
```

### 字节码
```
stack=1, locals=3, args_size=1
   0: iconst_1
   1: istore_1
   2: goto          8
   5: astore_1
   6: iconst_2
   7: istore_2
   8: return
Exception table:
   // 按顺序生成多个异常表条目
   from    to  target type
       0     2     5   Class me/zhongmingmao/basic/exception/E2
       0     2     5   Class me/zhongmingmao/basic/exception/E1
```

## 参考资料
[深入拆解Java虚拟机](https://time.geekbang.org/column/intro/100010301)

<!-- indicate-the-source -->
