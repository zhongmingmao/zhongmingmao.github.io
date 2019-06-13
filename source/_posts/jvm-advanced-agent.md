---
title: JVM进阶 -- 浅谈Java Agent
date: 2019-01-12 18:40:27
categories:
    - Java
    - JVM
    - Advanced
tags:
    - Java
    - JVM
---

## Java Agent的运行方式
1. JVM并**不会限制Java Agent的数量**
    - 可以在JVM参数中包含多个-javaagent参数
    - 也可以远程attach多个Java Agent
2. JVM会按照参数的顺序或者attach的顺序，逐个执行Java Agent
3. JRebal/Btrace/arthas等工具都是基于Java Agent实现的

### premain
以**JVM参数**（-javaagent）的方式启动，在Java程序的main方法执行之前执行

<!-- more -->

#### MyAgent
```java
package me.zhongmingmao;

public class MyAgent {
    // JVM能识别的premain方法接收的是字符串类型的参数，并非类似main方法的字符串数组
    public static void premain(String args) {
        System.out.println("premain");
    }
}
```

#### manifest.txt
```
# 写入两行数据，最后一行为空行
$ echo 'Premain-Class: me.zhongmingmao.MyAgent
' > manifest.txt

$ tree
.
├── manifest.txt
└── me
    └── zhongmingmao
        └── MyAgent.java
```

#### 编译打包
```
$ javac me/zhongmingmao/MyAgent.java

$ jar cvmf manifest.txt myagent.jar me/
已添加清单
正在添加: me/(输入 = 0) (输出 = 0)(存储了 0%)
正在添加: me/zhongmingmao/(输入 = 0) (输出 = 0)(存储了 0%)
正在添加: me/zhongmingmao/MyAgent.class(输入 = 399) (输出 = 285)(压缩了 28%)
正在添加: me/zhongmingmao/MyAgent.java(输入 = 142) (输出 = 114)(压缩了 19%)
```

#### HelloWorld
```java
package helloworld;

import java.util.concurrent.TimeUnit;

public class HelloWorld {
    public static void main(String[] args) throws InterruptedException {
        System.out.println("Hello World");
        TimeUnit.MINUTES.sleep(1);
    }
}
```

#### 编译运行
```
$ javac helloworld/HelloWorld.java

$ java -javaagent:myagent.jar helloworld.HelloWorld
premain
Hello World
```

### agentmain
1. 以**Attach**的方式启动，在Java程序启动后运行，利用VirtualMachine的**Attach API**
2. Attach API其实是**Java进程之间**的沟通桥梁，底层通过**Socket**进行通信
3. jps/jmap/jinfo/jstack/jcmd均依赖于Attach API

#### MyAgent
```java
package me.zhongmingmao;

public class MyAgent {
    public static void agentmain(String args) {
        System.out.println("agentmain");
    }
}
```

#### manifest.txt
```
# 改为Agent-Class
$ echo 'Agent-Class: me.zhongmingmao.MyAgent
' > manifest.txt

$ tree
.
├── manifest.txt
└── me
    └── zhongmingmao
        └── MyAgent.java
```

#### 编译打包
```
$ javac me/zhongmingmao/MyAgent.java

$ jar cvmf manifest.txt myagent.jar me/
已添加清单
正在添加: me/(输入 = 0) (输出 = 0)(存储了 0%)
正在添加: me/zhongmingmao/(输入 = 0) (输出 = 0)(存储了 0%)
正在添加: me/zhongmingmao/MyAgent.class(输入 = 401) (输出 = 285)(压缩了 28%)
正在添加: me/zhongmingmao/MyAgent.java(输入 = 146) (输出 = 115)(压缩了 21%)
```

#### AttachTest
```java
import com.sun.tools.attach.VirtualMachine;

public class AttachTest {
    public static void main(String[] args) throws Exception {
        if (args.length <= 1) {
            System.out.println("Usage: java AttachTest <PID> /PATH/TO/AGENT.jar");
            return;
        }
        String pid = args[0];
        String agent = args[1];
        // Attach API
        VirtualMachine vm = VirtualMachine.attach(pid);
        vm.loadAgent(agent);
    }
}
```
编译AttachTest
```
# 指定classpath
$ javac -cp ~/.sdkman/candidates/java/current/lib/tools.jar AttachTest.java
```

#### 运行HelloWorld
```
$ java helloworld.HelloWorld

$ jps
23386 HelloWorld
23387 Jps
```

#### 运行AttachTest
```
$ java -cp ~/.sdkman/candidates/java/current/lib/tools.jar:. AttachTest 23386 PATH_TO_AGENT/myagent.jar
```
```
# HelloWorld进程继续输出agentmain
Hello World
agentmain
```

## Java Agent的功能
1. ClassFileTransformer用于拦截**类加载**事件，需要注册到Instrumentation
2. Instrumentation.**redefineClasses**
    - 针对**已加载**的类，**舍弃原本的字节码**，替换为由用户提供的byte数组
    - 功能比较**危险**，一般用于修复出错的字节码
3. Instrumentation.**retransformClasses**
    - 针对**已加载**的类，重新调用**所有已注册**的ClassFileTransformer的transform方法，两个场景
    - 在执行premain和agentmain方法前，JVM**已经加载了不少类**
        - 而这些类的加载事件并没有被拦截并执行相关的注入逻辑
    - 定义了多个Java Agent，多个注入的情况，可能需要**移除其中的部分注入**
        - 调用**Instrumentation.removeTransformer**去除某个注入类后，可以调用retransformClasses
        - 重新从**原始byte**数组开始进行注入
4. Java Agent的功能是通过**JVMTI** Agent（C Agent），JVMTI是一个**事件驱动**的工具实现接口
    - 通常会在C Agent加载后的方法入口Agent_OnLoad处注册各种事件的钩子方法
    - 当JVM触发这些事件时，便会调用对应的钩子方法
    - 例如可以为JVMTI中的**ClassFileLoadHook**事件设置钩子，从而在C层面**拦截所有的类加载事件**

### 获取魔数

#### MyAgent
```java
package me.zhongmingmao;

import java.lang.instrument.ClassFileTransformer;
import java.lang.instrument.IllegalClassFormatException;
import java.lang.instrument.Instrumentation;
import java.security.ProtectionDomain;

public class MyAgent {
    public static void premain(String args, Instrumentation instrumentation) {
        // 通过instrumentation来注册类加载事件的拦截器（实现ClassFileTransformer.transform）
        instrumentation.addTransformer(new MyTransformer());
    }

    static class MyTransformer implements ClassFileTransformer {
        @Override
        public byte[] transform(ClassLoader loader, String className, Class<?> classBeingRedefined,
                                ProtectionDomain protectionDomain, byte[] classfileBuffer) throws IllegalClassFormatException {
            // 返回的byte数组，代表更新后的字节码
            // 当transform方法返回时，JVM会使用返回的byte数组来完成接下来的类加载工作
            // 如果transform方法返回null或者抛出异常，JVM将使用原来的byte数组来完成类加载工作
            // 基于类加载事件的拦截功能，可以实现字节码注入（Bytecode instrumentation），往正在被加载的类插入额外的字节码
            System.out.printf("Loaded %s: 0x%X%X%X%X\n", className,
                    classfileBuffer[0], classfileBuffer[1], classfileBuffer[2], classfileBuffer[3]);
            return null;
        }
    }
}
```

#### 编译运行
```
$ java -javaagent:myagent.jar helloworld.HelloWorld
...
Loaded helloworld/HelloWorld: 0xCAFEBABE
Hello World
...
Loaded java/lang/Shutdown: 0xCAFEBABE
Loaded java/lang/Shutdown$Lock: 0xCAFEBABE
```

### ASM注入字节码
通过ASM注入字节码可参考[Instrumenting Java Bytecode with ASM](http://web.cs.ucla.edu/~msb/cs239-tutorial/)

#### MyAgent
```java
package me.zhongmingmao;

import org.objectweb.asm.ClassReader;
import org.objectweb.asm.ClassWriter;
import org.objectweb.asm.Opcodes;
import org.objectweb.asm.tree.*;

import java.lang.instrument.ClassFileTransformer;
import java.lang.instrument.IllegalClassFormatException;
import java.lang.instrument.Instrumentation;
import java.security.ProtectionDomain;

public class MyAgent {
    public static void premain(String args, Instrumentation instrumentation) {
        instrumentation.addTransformer(new MyTransformer());
    }

    static class MyTransformer implements ClassFileTransformer, Opcodes {
        @Override
        public byte[] transform(ClassLoader loader, String className, Class<?> classBeingRedefined,
                                ProtectionDomain protectionDomain, byte[] classfileBuffer) throws IllegalClassFormatException {
            // 将classfileBuffer转换为ClassNode
            ClassReader classReader = new ClassReader(classfileBuffer);
            ClassNode classNode = new ClassNode(ASM7);
            classReader.accept(classNode, ClassReader.SKIP_FRAMES);

            // 遍历ClassNode的MethodNode节点，即构造器和方法
            for (MethodNode methodNode : classNode.methods) {
                // 在main方法入口处注入System.out.println("Hello Instrumentation");
                if ("main".equals(methodNode.name)) {
                    InsnList instrumentation = new InsnList();
                    instrumentation.add(new FieldInsnNode(GETSTATIC, "java/lang/System", "out", "Ljava/io/PrintStream;"));
                    instrumentation.add(new LdcInsnNode("Hello, Instrumentation!"));
                    instrumentation.add(new MethodInsnNode(INVOKEVIRTUAL, "java/io/PrintStream", "println", "(Ljava/lang/String;)V", false));
                    methodNode.instructions.insert(instrumentation);
                }
            }

            ClassWriter classWriter = new ClassWriter(ClassWriter.COMPUTE_FRAMES | ClassWriter.COMPUTE_MAXS);
            classNode.accept(classWriter);
            return classWriter.toByteArray();
        }
    }
}
```
编译MyAgent
```
$ javac -cp PATH_TO_ASM/asm-7.0.jar:PATH_TO_ASM_TREE/asm-tree-7.0.jar me/zhongmingmao/MyAgent.java
```

#### 运行
```
$ java -javaagent:myagent.jar -cp PATH_TO_ASM/asm-7.0.jar:PATH_TO_ASM_TREE/asm-tree-7.0.jar:. helloworld.HelloWorld
Hello, Instrumentation!
Hello World
```

## 基于字节码注入的profiler

### 统计新建实例数量

#### MyProfiler
```java
package me.zhongmingmao;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

public class MyProfiler {
    // 统计每个类所新建实例的数目
    public static ConcurrentHashMap<Class<?>, AtomicInteger> data = new ConcurrentHashMap<>();

    public static void fireAllocationEvent(Class<?> klass) {
        data.computeIfAbsent(klass, kls -> new AtomicInteger()).incrementAndGet();
    }

    public static void dump() {
        data.forEach((kls, counter) -> System.err.printf("%s: %d\n", kls.getName(), counter.get()));
    }

    static {
        Runtime.getRuntime().addShutdownHook(new Thread(MyProfiler::dump));
    }
}
```

#### MyAgent
```java
package me.zhongmingmao;

import org.objectweb.asm.ClassReader;
import org.objectweb.asm.ClassWriter;
import org.objectweb.asm.Opcodes;
import org.objectweb.asm.Type;
import org.objectweb.asm.tree.*;

import java.lang.instrument.ClassFileTransformer;
import java.lang.instrument.IllegalClassFormatException;
import java.lang.instrument.Instrumentation;
import java.security.ProtectionDomain;

public class MyAgent {
    public static void premain(String args, Instrumentation instrumentation) {
        instrumentation.addTransformer(new MyTransformer());
    }

    static class MyTransformer implements ClassFileTransformer, Opcodes {
        @Override
        public byte[] transform(ClassLoader loader, String className, Class<?> classBeingRedefined, ProtectionDomain protectionDomain, byte[] classfileBuffer) throws IllegalClassFormatException {
            if (className.startsWith("java") ||
                    className.startsWith("javax") ||
                    className.startsWith("jdk") ||
                    className.startsWith("sun") ||
                    className.startsWith("com/sun") ||
                    className.startsWith("me/zhongmingmao")) {
                // Skip JDK classes and profiler classes
                // 避免循环引用，从而导致StackOverflowException
                return null;
            }

            ClassReader classReader = new ClassReader(classfileBuffer);
            ClassNode classNode = new ClassNode(ASM7);
            classReader.accept(classNode, ClassReader.SKIP_FRAMES);

            for (MethodNode methodNode : classNode.methods) {
                // 遍历方法内的指令
                for (AbstractInsnNode node : methodNode.instructions.toArray()) {
                    if (node.getOpcode() == NEW) {
                        // 在每条new指令后插入对fireAllocationEvent方法的调用
                        TypeInsnNode typeInsnNode = (TypeInsnNode) node;
                        InsnList instrumentation = new InsnList();
                        instrumentation.add(new LdcInsnNode(Type.getObjectType(typeInsnNode.desc)));
                        instrumentation.add(new MethodInsnNode(INVOKESTATIC, "me/zhongmingmao/MyProfiler", "fireAllocationEvent", "(Ljava/lang/Class;)V", false));
                        methodNode.instructions.insert(node, instrumentation);
                    }
                }
            }

            ClassWriter classWriter = new ClassWriter(ClassWriter.COMPUTE_FRAMES | ClassWriter.COMPUTE_MAXS);
            classNode.accept(classWriter);
            return classWriter.toByteArray();
        }
    }
}
```

#### ProfilerMain
```java
public class ProfilerMain {
    public static void main(String[] args) {
        String s = "";
        for (int i = 0; i < 10; i++) {
            s = new String("" + i);
        }
        Integer i = 0;
        for (int j = 0; j < 20; j++) {
            i = new Integer(j);
        }
    }
}
```

#### 运行
```
$ java -javaagent:myagent.jar -cp PATH_TO_ASM/asm-7.0.jar:PATH_TO_ASM_TREE/asm-tree-7.0.jar:. ProfilerMain
java.lang.StringBuilder: 10
java.lang.String: 10
java.lang.Integer: 20
```

### 命名空间
1. 不少应用程序都依赖于ASM工程，当注入逻辑依赖于ASM时
    - 可能会出现注入使用最新版的ASM，而应用程序本身使用的是较低版本的ASM
2. JDK本身也使用了ASM库，例如用来生成Lambda表达式的适配器，JDK的做法是**重命名**整个ASM库
    - 为所有类的包名添加**jdk.internal**前缀
3. 还有另外一个方法是借助**自定义类加载器**来隔离命名空间

### 观察者效应
1. 例如字节码注入收集每个方法的运行时间
    - 假设某个方法调用了另一个方法，而这个两个方法都被注入了
    - 那么统计被调用者运行时间点注入代码所耗费的时间，将不可避免地被计入至调用者方法的运行时间之中
2. 统计新建对象数量
    - 即时编译器的逃逸分析可能会优化掉新建对象操作，但它并不会消除相关的统计操作
    - 因此会统计到**实际没有发生**的新建对象操作
3. 因此当使用字节码注入开发profiler，**仅能表示在被注入的情况下程序的执行状态**

<!-- indicate-the-source -->
