---
title: Java性能 -- JVM内存模型
mathjax: false
date: 2019-09-07 19:51:47
categories:
    - Java
    - Performance
tags:
    - Java
    - Java Performance
    - JVM
---

## JVM内存模型
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-jvm-memory-model.jpg" width=800>

<!-- more -->

### 堆
1. 堆是JVM内存中**最大**的一块内存空间，被所有**线程共享**，**几乎所有对象和数组**都被分配到堆内存中
2. 堆被划分为**新生代**和**老年代**，新生代又被划分为**Eden**区和**Survivor**区（**From** Survivor + **To** Survivor）
3. **永久代**
    - 在Java **6**中，永久代在**非堆**内存中
    - 在Java **7**中，永久代的**静态变量**和**运行时常量池**被**合并到堆**中
    - 在Java **8**中，永久代被**元空间**取代

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-jvm-heap.png" width=800>

### 程序计数器
1. 程序计数器是一块**很小**的内存空间，主要用来记录各个**线程**执行的字节码的地址
2. Java是**多线程语言**，当执行的线程数量**超过**CPU数量时，线程之间会根据时间片**轮询争夺CPU资源**
    - 当一个线程的时间片用完了，或者其他原因导致该线程的CPU资源被提前抢夺
    - 那么**退出的线程**需要**单独的程序计数器**来记录**下一条运行的指令**

### 方法区
1. **方法区 != 永久代**
2. **HotSpot VM使用了永久代来实现方法区**，但在其他VM（**Oracle JRockit**、**IBM J9**）不存在永久代一说
3. **方法区只是JVM规范的一部分**，在HotSpot VM中，使用了永久代来实现JVM规范的方法区
4. 方法区主要用来存放**已被虚拟机加载的类相关信息**
    - **类信息**（类的版本、字段、方法、接口和父类等信息）、**运行时常量池**、**字符串常量池**
5. JVM在执行某个类的时候，必须经过**加载**、**连接**（验证、准备、解析）、**初始化**
    - 加载类时，JVM会先加载class文件，在**class文件**除了有类的版本、字段、方法、接口等描述信息外，还有**常量池**
        - 常量池（**Constant Pool Table**），用于存放**编译期**生成的各种**字面量**和**符号引用**
        - 字面量：**字符串**（`String a="b"`），**基本类型的常量**（final修饰）
        - 符号引用：**类和方法的全限定名**、**字段的名称和描述符**、**方法的名称和描述符**
    - 当类加载到内存中后，JVM会将**class文件常量池中的内容**存放到**运行时常量池**中
    - 在解析阶段，JVM会把**符号引用**替换为**直接引用**（对象的索引值）
6. **运行时常量池**是**全局共享**的，多个类共用一个运行时常量池
    - class文件中的常量池多个相同的字符串在运行时常量池**只会存在一份**
7. 方法区和堆类似，都是一个**共享内存区**，所以方法区是**线程共享**的
    - 假设两个线程都试图访问方法区中同一个类信息，而这个类还没有装入JVM
    - 那么此时只允许一个线程去加载该类，另一个线程必须等待
8. HotSpot VM
    - 在Java 7中，已经将永久代的**静态变量**和**运行时常量池**转移到**堆**中，其余部分则存储在JVM的**非堆**内存中
    - 在Java 8中，已经用**元空间**代替永久代来实现**方法区**，并且元空间的存储位置是**本地内存**
        - 之前永久代中**类的元数据**存储在**元空间**，永久代的**静态变量**和**运行时常量池**与Java 7一样，转移到**堆**中
    - 移除永久代，使用元空间的好处
        - 移除永久代是为了**融合HotSpot VM和JRockit VM**
        - 永久代内存经常不够用或者发生**内存溢出**（java.lang.OutOfMemoryError: PermGen）
        - 为永久代分配多大的空间很难确定，依赖很多因素
9. JVM的内存模型只是一个规范，**方法区**也是一个**规范**，一个**逻辑分区**，并不是一个物理分区

### 虚拟机栈
1. Java虚拟机栈是**线程私有**的内存空间，和Java线程一起创建
2. 当创建一个线程时，会在虚拟机栈中申请一个**线程栈**
    - 用来保存方法的局部变量、操作数栈、动态链接方法和返回地址等信息，并参与方法的调用和返回
3. 每一个**方法的调用**都伴随着栈帧的**入栈**操作，每一个**方法的返回**都伴随着栈帧的**出栈**操作

### 本地方法栈
1. 本地方法栈跟Java虚拟机栈的**功能类似**
2. Java虚拟机栈用来管理**Java函数的调用**，而本地方法栈用来管理**本地方法（C语言实现）的调用**

## JVM运行原理
```java
public class JVMCase {
    // 常量
    private final static String MAN_SEX_TYPE = "man";
    // 静态变量
    public static String WOMAN_SEX_TYPE = "woman";

    public static void main(String[] args) {
        Student student = new Student();
        student.setName("nick");
        student.setSexType(MAN_SEX_TYPE);
        student.setAge(20);

        JVMCase jvmCase = new JVMCase();
        // 调用非静态方法
        jvmCase.sayHello(student);
        // 调用静态方法
        print(student);
    }
    
    // 非静态方法
    private void sayHello(Student student) {
        System.out.println(student.getName() + " say: hello");
    }

    // 常规静态方法
    private static void print(Student student) {
        System.out.println(student);
    }
}

@Data
class Student {
    private String name;
    private String sexType;
    private int age;
}
```

1. JVM**向操作系统申请内存**
    - JVM第一步是通过配置参数或者默认配置参数向操作系统申请内存空间，根据内存大小找到具体的**内存分配表**
    - 然后把内存段的**起始地址**和**终止地址**分配给JVM，最后JVM进行**内部分配**
2. JVM获得内存空间后，会根据配置参数分配**堆**、**栈**以及**方法区**的内存大小
3. class文件**加载**、**验证**、**准备**和**解析**
    - 其中**准备**阶段会为**类的静态成员（字段和方法）**分配内存，初始化为系统初始值
4. **初始化**
    - JVM首先会执行构造器`<clinit>`方法，编译器会在.java文件被**编译**成.class文件，收集所有类的**初始化代码**
    - 初始化代码：**静态变量赋值语句**，**静态代码块**、**静态方法**
5. 执行方法
    - 启动main线程，执行main方法，执行第一行代码
    - 在**堆**内存中会创建一个**Student对象**，**对象引用student**存放在**栈**中
    - 再创建一个JVMCase对象，并调用sayHello非静态方法
        - sayHello方法属于对象jvmCase，此时sayHello方法**入栈**，并调用栈中Student引用调用堆中的Studentd对象
    - 调用静态方法print
        - print方法属于JVMCase类，从静态方法中获取后放入到栈中，通过Student引用调用堆中的Studentd对象

准备阶段
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-jvm-memory-model-example-1.jpg" width=800>

初始化阶段
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-jvm-memory-model-example-2.jpg" width=800>

创建一个Student对象
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-jvm-memory-model-example-3.jpg" width=800>

创建一个JVMCase对象，并调用sayHello非静态方法和print静态方法
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-jvm-memory-model-example-4.jpg" width=800>