---
title: JVM基础 -- 类加载
date: 2018-12-16 15:26:05
categories:
    - Java
    - JVM
    - Baisc
tags:
    - Java
    - JVM
---

## 引用类型
1. 类（字节流）
2. 接口（字节流）
3. 数组类（由JVM直接生成）
4. 泛型参数（类型擦除，伪泛型）

## 类加载过程

### 加载
1. 加载：**查找字节流，并且据此创建类的过程**
2. 对于**数组类**，没有对应的字节流，而是由JVM直接生成的
    - 对于其他类而言，JVM需要借助**类加载器**来完成查找字节流的过程

<!-- more -->

#### 类加载器
1. 启动类加载器（boot class loader）：由C++实现，没有对应的Java对象，在Java中只能用null来指代
2. 除了启动类加载器外，其他的类加载器都是**java.lang.ClassLoader**的子类，有对应的Java对象
    - 这些类加载器需要先由另一个类加载器（如启动类加载器），加载至Java虚拟机中，方能执行类加载
3. **双亲委派模型**
    - 每当一个类加载器接收到加载请求时，会先将请求转发给父类加载器
    - 在父类加载器没有找到所请求的类的情况下，该类加载器才会尝试自己加载
4. Before Java9
    - 启动类加载器（boot class loader）：负责加载**最基础、最重要**的类（-Xbootclasspath）
    - 扩展类加载器（extension class loader）：父类加载器为**启动类加载器**，负责加载**相对次要、但又通用**的类（java.ext.dirs）
    - 应用类加载器（application class loader）：父类加载器为**扩展类加载器**，负责加载应用程序路径下的类
        - -cp
        - -classpath
        - 系统变量java.class.path
        - 环境变量CLASSPATH
5. Since Java9
    - 引入模块系统
    - 扩展类加载器改名为**平台类加载器**(platform class loader)
    - Java SE中除了少数几个关键模块（java.base）是由启动类加载器加载之外，其他的模块均由平台类加载器所加载
6. 自定义类加载
    - 例如对class文件进行加密，加载时再利用自定义的类加载器对其解密

#### 命名空间+唯一性
类的唯一性：**类加载实例 + 类的全名**

### 链接
1. 链接：将创建的类**合并**至JVM，使之**能够执行**的过程
2. 链接过程：**验证**、**准备**和**解析**

#### 验证
1. 确保被加载到类能够**满足JVM的约束条件**
2. Java编译器生成的类文件必然满足JVM的约束条件

#### 准备
1. **为被加载类的静态字段分配内存**
2. Java代码中对静态字段的**具体初始化**，会在**初始化阶段**进行
3. 构造其他与类层次相关的数据结构，例如用来**实现虚方法的动态绑定的方法表**

#### 解析（可选）
1. 解析：将**符号引用**解析成为**实际引用**
2. 在class文件被加载至JVM之前，这个类是无法知道其他类及其方法、字段所对应的具体地址，甚至不知道自己方法、字段的地址
    - 因此每当需要引用这些成员时，**Java编译器**都会生成一个**符号引用**
    - 在**运行阶段**，这个符号引用一般都能够无歧义地定位到**具体目标**上
3. 如果**符号引用**指向一个**未被加载的类**或者**未被加载到类的字段或方法**，那么解析将会**触发这个类的加载**（未必触发这个类的链接和初始化）
4. Java虚拟机规范**并没有要求在链接过程中要完成解析**
    - **如果某些字节码使用了符号引用，那么在执行这些字节码之前，需要完成对这些符号引用的解析**

### 初始化
1. 初始化：**为标记为常量值的字段赋值** + **执行<clinit>方法**
2. 如果要初始化一个静态字段，可以在声明时直接赋值，也可以在静态代码块中对其赋值
3. 如果**直接赋值**的静态字段被**final**所修饰，并且它的类型是**基本类型**或**字符串**时，那么该字段便会被**Java编译器**标记为**常量值**（ConstantValue）,**其初始化直接由JVM完成**
4. 除此之外的直接赋值操作以及所有静态代码块中的代码，则会被Java编译器置于同一方法中，既**<clinit\>**
5. JVM会通过**加锁**来保证类的**<clinit\>** 仅被执行一次
6. 只有当初始化完成后，类才正式开始成为可执行的状态

#### 触发时机
1. new指令
2. putstatic/getstatic指令
3. invokestatic指令
4. 反射
    - Class.forName
    - Class.newInstance
5. 子类的初始化会触发父类的初始化
6. 执行主类
7. 如果接口定义了default方法，那么直接实现或者间接实现该接口的类进行初始化，会触发该接口初始化

详情请访问[类加载 - 类初始化](http://zhongmingmao.me/2016/07/15/jvm-class-initialization/)

```java
// JVM参数：-verbose:class
public class Singleton {
    private Singleton() {
    }

    private static class LazyHolder {
        static final Singleton INSTANCE = new Singleton();

        static {
            System.out.println("LazyHolder.<clinit>");
        }
    }

    private static Object getInstance(boolean flag) {
        if (flag) {
            // Loaded xxx.Singleton$LazyHolder from file:XXX
            // 新建数组知会导致加载，但不会导致初始化
            return new LazyHolder[2];
        }
        // LazyHolder.<clinit>
        // getstatic指令触发类的初始化
        return LazyHolder.INSTANCE;
    }

    public static void main(String[] args) {
        getInstance(true);
        System.out.println("----");
        getInstance(false);
    }
}
```

## 新建数组
新建数组**只会触发加载阶段**，而**不会触发链接和初始化阶段**
```
$ java -cp ./asmtools.jar org.openjdk.asmtools.jdis.Main Singleton\$LazyHolder.class > Singleton\$LazyHolder.jasm.bak

# 将字节码修改为不符合JVM规范，在类加载-链接阶段会报错（从而验证有没有执行到链接阶段）
$ awk 'NR==1,/stack 1/{sub(/stack 1/, "stack 0")} 1' Singleton\$LazyHolder.jasm.bak > Singleton\$LazyHolder.jasm

$ java -cp ./asmtools.jar org.openjdk.asmtools.jasm.Main Singleton\$LazyHolder.jasm

$ java -verbose:class Singleton
[Loaded Singleton$LazyHolder from file:/Users/zhongmingmao/Downloads/asmtools-7.0-build/dist/asmtools-7.0/lib/]
----
[Loaded java.lang.VerifyError from /Users/zhongmingmao/.sdkman/candidates/java/8.0.181-oracle/jre/lib/rt.jar]
Exception in thread "main" [Loaded java.lang.Throwable$PrintStreamOrWriter from /Users/zhongmingmao/.sdkman/candidates/java/8.0.181-oracle/jre/lib/rt.jar]
[Loaded java.lang.Throwable$WrappedPrintStream from /Users/zhongmingmao/.sdkman/candidates/java/8.0.181-oracle/jre/lib/rt.jar]
[Loaded java.util.IdentityHashMap from /Users/zhongmingmao/.sdkman/candidates/java/8.0.181-oracle/jre/lib/rt.jar]
[Loaded java.util.IdentityHashMap$KeySet from /Users/zhongmingmao/.sdkman/candidates/java/8.0.181-oracle/jre/lib/rt.jar]
java.lang.VerifyError: Operand stack overflow
Exception Details:
  Location:
    Singleton$LazyHolder.<init>()V @0: aload_0
  Reason:
    Exceeded max stack size.
  Current Frame:
    bci: @0
    flags: { flagThisUninit }
    locals: { uninitializedThis }
    stack: { }
  Bytecode:
    0x0000000: 2ab7 0007 b1

	at Singleton.getInstance(Singleton.java:22)
	at Singleton.main(Singleton.java:28)
```

## 参考资料
[深入拆解Java虚拟机](https://time.geekbang.org/column/intro/100010301)


<!-- indicate-the-source -->
