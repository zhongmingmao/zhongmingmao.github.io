---
title: 类加载 - 类初始化
date: 2016-07-15 00:06:25
categories:
    - JVM
tags:
    - Netease
    - JVM
---

{% note info %}
本文主要关注`类加载`过程中的`类初始化`阶段，介绍`clinit`方法、`主动引用`和`被动引用`
{% endnote %}

<!-- more -->

# clinit
`类（接口）初始化`阶段是执行**`clinit`**方法的过程

## 接口 clinit
1. 接口的`clinit`方法主要用于在`接口初始化`时，**`初始化接口的域`**（默认是`public static final`）
2. `编译`后，接口中的`域`，有些会在`Class文件常量池`中，有些在`clinit`方法中进行`初始化`


### 代码
```java
public interface InterfaceClinit {
    class InnerClass {
    }

    InnerClass INNER_CLASS = new InnerClass();
    String NAME = "zhongmingmao";
}
```

### 字节码
```
public static final me.zhongmingmao.class_initialization.InterfaceClinit$InnerClass INNER_CLASS;
    descriptor: Lme/zhongmingmao/class_initialization/InterfaceClinit$InnerClass;
    flags: ACC_PUBLIC, ACC_STATIC, ACC_FINAL

public static final java.lang.String NAME;
    descriptor: Ljava/lang/String;
    flags: ACC_PUBLIC, ACC_STATIC, ACC_FINAL
    ConstantValue: String zhongmingmao

# <clinit>() 方法
static {};
    descriptor: ()V
    flags: ACC_STATIC
    Code:
        stack=2, locals=0, args_size=0
            0: new           #1 // class me/zhongmingmao/class_initialization/InterfaceClinit$InnerClass
            3: dup
            4: invokespecial #2 // Method me/zhongmingmao/class_initialization/InterfaceClinit$InnerClass."<init>":()V
            7: putstatic     #3 // Field INNER_CLASS:Lme/zhongmingmao/class_initialization/InterfaceClinit$InnerClass;
            10: return
```

### 分析
1. `NAME`拥有**`ConstantValue`**属性，存储在**`Class文件常量池`**中（`Constant pool`），不需要在`clinit`方法中进行初始化
2. `INNER_CLASS`需要在`clinit`方法中进行初始化，对应的字节码是实现了`INNER_CLASS = new InnerClass()`，关于那`new`、`dup`、`invokespecial`等指令的具体含义，可参照博文「字节码 - 方法重载 + 方法重写」，这里不再赘述

## 类 clinit
1. `类clinit`与`接口clinit`最大的区别是允许**`static{}`**块
2. `类clinit`由类中的所有**`static变量的赋值动作`**和**`static{}块中的语句`**`合并产生`的
4. `static{}块`只能读取定义在`static{}块`之前的`static变量`，但能为定义在`static{}块`之后的`static变量`赋值

### 代码
```java
public class ClassClinit {
    static class InnerClass {
    }

    static {
        j = 2;
        // System.out.println(i); // 非法前向引用
    }

    static int i = 1;
    static int j;
    static InnerClass INNER_CLASS = new InnerClass();
}
```

### 字节码
```
static int i;
    descriptor: I
    flags: ACC_STATIC

static int j;
    descriptor: I
    flags: ACC_STATIC

static me.zhongmingmao.class_initialization.ClassClinit$InnerClass INNER_CLASS;
    descriptor: Lme/zhongmingmao/class_initialization/ClassClinit$InnerClass;
    flags: ACC_STATIC

# <clinit>() 方法
static {};
    descriptor: ()V
    flags: ACC_STATIC
    Code:
        stack=2, locals=0, args_size=0
        0: iconst_2
        1: putstatic     #2     // Field j:I
        4: iconst_1
        5: putstatic     #3     // Field i:I
        8: new           #4     // class me/zhongmingmao/class_initialization/ClassClinit$InnerClass
        11: dup
        12: invokespecial #5    // Method me/zhongmingmao/class_initialization/ClassClinit$InnerClass."<init>":()V
        15: putstatic     #6    // Field INNER_CLASS:Lme/zhongmingmao/class_initialization/ClassClinit$InnerClass;
        18: return
```

## 空 clinit
`clinit`方法对于`类或接口`来说**`并不是必需`**的，如果一个类中没有`static{}块`，也没有对`static变量的赋值操作`，那么编译器可以不为这个类生成`clinit`方法

### 代码
```java
public class EmptyClassClinit {
    // 字节码中不会有<clinit>()方法
}

interface EmptyInterfaceClinit {
    // 字节码中不会有<clinit>()方法
}
```

## 隐含地并发
1. `JVM`会保证一个`clinit`方法在`多线程`环境中被**`正确地加锁、同步`** ➜ `隐蔽地阻塞`
2. 其他线程被阻塞，但如果执行clinit方法的线程退出clinit方法后，其他线程唤醒之后**`不会再次进入`**clinit方法

### 代码
```java
public class ClinitConcurrencyTest {
    static class A {
        static {
            System.out.println("Class A Initialization");
            BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
            try {
                reader.readLine();
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }

    public static void main(String[] args) {

        Runnable initClassTask = () -> {
            System.out.println(String.format("%s start", Thread.currentThread().getName()));
            new A(); // 隐蔽地同步，不会重复进入
            System.out.println(String.format("%s run over", Thread.currentThread().getName()));
        };

        new Thread(initClassTask, "t1").start();
        new Thread(initClassTask, "t2").start();
    }
}
```

### 运行结果
```
t2 start
t1 start
Class A Initialization
xxxxx # 控制台输入随意字符
t2 run over
t1 run over
```

## 类初始化 vs 接口初始化
1. 当`类初始化`时，要求其`父类`全部都已经`类初始化`过了
2. 当`接口初始化`时，并不要求其父接口全部都完成初始化，只有在`真正使用父接口`的时候（如`引用接口中定义的常量`）才会进行`父接口初始化`
3. `接口的实现类`在进行`类初始化`时，也一样不会进行`父接口初始化`

# 主动引用 - 触发类初始化

## new指令

### 代码
```java
public class NewTest {
    static class A {
        static {
            System.out.println("Class A Initialization");
        }
    }

    public static void main(String[] args) {
        new A(); // 触发类A的初始化
    }
}
```

### 运行结果
```
Class A Initialization
```

### 字节码
```
public static void main(java.lang.String[]);
    descriptor: ([Ljava/lang/String;)V
    flags: ACC_PUBLIC, ACC_STATIC
    Code:
        stack=2, locals=1, args_size=1
            # new指令会触发类A的初始化
            0: new           #2 // class me/zhongmingmao/class_initialization/NewTest$A
            3: dup
            4: invokespecial #3 // Method me/zhongmingmao/class_initialization/NewTest$A."<init>":()V
            7: pop
            8: return
        LocalVariableTable:
            Start  Length  Slot  Name   Signature
                0       9     0  args   [Ljava/lang/String;
```

## putstatic/getstatic指令

### 代码
```java
public class StaticTest {
    static class A {
        static String name;

        static {
            System.out.println("Class A Initialization");
        }
    }

    static class B {
        static String name;

        static {
            System.out.println("Class B Initialization");
        }
    }

    public static void main(String[] args) {
        A.name = "zhongmingmao"; // 触发类A的初始化
        String name = B.name; // 触发类B的初始化
    }
}
```

### 运行结果
```
Class A Initialization
Class B Initialization
```

### 字节码
```
public static void main(java.lang.String[]);
    descriptor: ([Ljava/lang/String;)V
    flags: ACC_PUBLIC, ACC_STATIC
    Code:
        stack=1, locals=2, args_size=1
            0: ldc           #2 // String zhongmingmao
            # putstatic指令会触发类A的初始化
            2: putstatic     #3 // Field me/zhongmingmao/class_initialization/StaticTest$A.name:Ljava/lang/String;
            # getstatic指令会触发类B的初始化
            5: getstatic     #4 // Field me/zhongmingmao/class_initialization/StaticTest$B.name:Ljava/lang/String;
            8: astore_1
            9: return
            LocalVariableTable:
                Start  Length  Slot  Name   Signature
                    0      10     0  args   [Ljava/lang/String;
                    9       1     1  name   Ljava/lang/String;
```
`putstatic`/`getstatic`指令会触发`类的初始化`

## invokestatic指令

### 代码
```java
public class InvokestaticTest {
    static class A {
        static {
            System.out.println("Class A Initialization");
        }

        static void staticMethod() {
        }
    }

    public static void main(String[] args) {
        A.staticMethod(); // 触发类A的初始化
    }
}
```

### 运行结果
```
Class A Initialization
```

### 字节码
```
public static void main(java.lang.String[]);
    descriptor: ([Ljava/lang/String;)V
    flags: ACC_PUBLIC, ACC_STATIC
    Code:
        stack=0, locals=1, args_size=1
            # invokestatic指令会触发类A的初始化
            0: invokestatic  #2 // Method me/zhongmingmao/class_initialization/InvokestaticTest$A.staticMethod:()V
            3: return
        LocalVariableTable:
            Start  Length  Slot  Name   Signature
                0       4     0  args   [Ljava/lang/String;
```

## 反射

### Class.forName
`Class.forName`方法可以通过`参数initialize`来确定是否触发类的初始化

#### 代码
```java
public class ClassForNameTest {
    static class A {

        static {
            System.out.println("Class A Initialization");
        }
    }

    static class B {

        static {
            System.out.println("Class B Initialization");
        }
    }

    public static void main(String[] args) throws ClassNotFoundException, IllegalAccessException,
            InstantiationException {
        ClassLoader classLoader = ClassForNameTest.class.getClassLoader();
        Class.forName(A.class.getName()); // 触发类A的初始化

        Class<?> clazz = Class.forName(B.class.getName(), false, classLoader); // 不会触发类B的初始化
        System.out.println("Load Class B");
        clazz.newInstance(); // 触发类B的初始化
    }
}
```

#### 运行结果
```
Class A Initialization
Load Class B # 说明此时类B尚未初始化
Class B Initialization
```

#### 分析
`Class.forName`实际调用的是`native`方法（对应的CPP代码暂未研究）`forName0`，有一个标志位`initialize`，是否进行`类的初始化`
```java
private static native Class<?> forName0(String name, boolean initialize,
                                       ClassLoader loader,
                                       Class<?> caller) throws ClassNotFoundException;
```

### Class.newInstance
1. `ClassLoader.loadClass`不会触发类的初始化
2. `Class.newInstance`会触发类的初始化

#### 代码
```java
public class LoadClassTest {
    static class A {

        static {
            System.out.println("Class A Initialization");
        }
    }

    public static void main(String[] args) throws ClassNotFoundException, IllegalAccessException,
            InstantiationException {
        ClassLoader classLoader = LoadClassTest.class.getClassLoader();
        Class<?> clazz = classLoader.loadClass(A.class.getName()); // 被动加载类A，不会触发类A的初始化
        System.out.println("Load Class A");
        clazz.newInstance(); // 触发类A的初始化
    }
}
```

#### 运行结果
```
Load Class A
Class A Initialization
```

## 继承
当初始化一个类的时候，如果发现其`父类`还没有进行过初始化，则`首先触发其父类的初始化`

### 代码
```java
public class InheritTest {
    static class Father {

        static {
            System.out.println("Class Father Initialization");
        }
    }

    static class Son extends Father {

        static {
            System.out.println("Class Son Initialization");
        }
    }

    public static void main(String[] args) {
        new Son(); // 首先触发类Father的初始化，再触发类Son的初始化
    }
}
```

### 运行结果
```
Class Father Initialization
Class Son Initialization
```

### 字节码
```
public static void main(java.lang.String[]);
    descriptor: ([Ljava/lang/String;)V
    flags: ACC_PUBLIC, ACC_STATIC
    Code:
        stack=2, locals=1, args_size=1
            # new指令会触发类Son的初始化，由于其直接父类Father尚未初始化，会首先触发直接父类Father的初始化
            0: new           #2 // class me/zhongmingmao/class_initialization/InheritTest$Son
            3: dup
            4: invokespecial #3 // Method me/zhongmingmao/class_initialization/InheritTest$Son."<init>":()V
            7: pop
            8: return
        LocalVariableTable:
            Start  Length  Slot  Name   Signature
                0       9     0  args   [Ljava/lang/String;
```

## 执行主类
当JVM启动时，用户需要指定一个要执行的主类，JVM会先初始化这个主类

### 代码
```java
public class MainClassTest {
    static {
        System.out.println("Class MainClassTest Initialization");
    }

    public static void main(String[] args) {
    }
}
```

### 运行结果
```
Class MainClassTest Initialization
```

# 被动引用 - 不触发类初始化

## static 字段
1. 对于`static字段`，只有**`直接定义这个字段的类才会被初始化`**
2. 通过子类来引用父类中定义的static字段，只会触发父类的初始化而不会触发子类的初始化

### 代码
```java
public class StaticFieldTest {
    static class Father {
        static String FATHER_CLASS_NAME = Father.class.getName();

        static {
            System.out.println("Class Father Initialization");
        }
    }

    static class Son extends Father {
        static String SON_CLASS_NAME = Son.class.getName();

        static {
            System.out.println("Class Son Initialization");
        }
    }

    public static void main(String[] args) {
        String className = Son.FATHER_CLASS_NAME; // 只会触发类Father的初始化，不会触发类Son的初始化
    }
}
```

### 运行结果
```
Class Father Initialization
```

### 字节码
```
public static void main(java.lang.String[]);
    descriptor: ([Ljava/lang/String;)V
    flags: ACC_PUBLIC, ACC_STATIC
    Code:
        stack=1, locals=2, args_size=1
            # getstatic指令会触发类的初始化，FATHER_CLASS_NAME在类Father中定义，因此只会触发类Father（及其父类）的初始化
            0: getstatic     #2 // Field me/zhongmingmao/class_initialization/StaticFieldTest$Son.FATHER_CLASS_NAME:Ljava/lang/String;
            3: astore_1
            4: return
        LocalVariableTable:
            Start  Length  Slot  Name   Signature
                0       5     0  args   [Ljava/lang/String;
                4       1     1 className   Ljava/lang/String;
}
```

## 引用数组
通过`数组`定义来引用类，不会触发类的初始化

### 代码
```java
public class ArrayRefTest {
    static class A {
        static {
            System.out.println("Class A Initialization");
        }
    }

    public static void main(String[] args) {
        A[] as = new A[10]; // 不会触发类A的初始化
    }
}
```

### 字节码
```
public static void main(java.lang.String[]);
    descriptor: ([Ljava/lang/String;)V
    flags: ACC_PUBLIC, ACC_STATIC
    Code:
        stack=1, locals=2, args_size=1
            0: bipush        10
            # anewarray指令并不会触发类A的初始化
            2: anewarray     #2 // class me/zhongmingmao/class_initialization/ArrayRefTest$A
            5: astore_1
            6: return
        LocalVariableTable:
            Start  Length  Slot  Name   Signature
                0       7     0  args   [Ljava/lang/String;
                6       1     1    as   [Lme/zhongmingmao/class_initialization/ArrayRefTest$A;
}
```

## 编译时常量
`常量`在`编译阶段`会存入`Class文件常量池`（`Constant pool`）中，编译时便会**`直接替换`**，本质上并没有直接引用绑定到定义常量的类，不会触发定义常量的类的初始化

### 代码
```java
public class ConstantValueTest {
    static class A {
        static final String NAME = "zhongmingmao";

        static {
            System.out.println("Class A Initialization");
        }
    }

    public static void main(String[] args) {
        String className = A.NAME;// 不会触发类A的初始化
    }
}
```

### 字节码
ConstantValueTest\$A
```
static final java.lang.String NAME;
    descriptor: Ljava/lang/String;
    flags: ACC_STATIC, ACC_FINAL
    ConstantValue: String zhongmingmao # 存储在Class文件常量池，运行时会存放到运行时常量池

# clinit 方法
static {};
    descriptor: ()V
    flags: ACC_STATIC
    Code:
        stack=2, locals=0, args_size=0
            0: getstatic     #2 // Field java/lang/System.out:Ljava/io/PrintStream;
            3: ldc           #3 // String Class A Initialization
            5: invokevirtual #4 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
            8: return
```
ConstantValueTest
```
public static void main(java.lang.String[]);
    descriptor: ([Ljava/lang/String;)V
    flags: ACC_PUBLIC, ACC_STATIC
    Code:
        stack=1, locals=2, args_size=1
            # ldc指令直接将常量直接压入操作数栈，这在编译时已经可以确定了，因此直接替换，因此在运行时也不会触发类A的初始化
            0: ldc       #3 // String zhongmingmao
            2: astore_1
            3: return
        LocalVariableTable:
            Start  Length  Slot  Name   Signature
                0       4     0  args   [Ljava/lang/String;
                3       1     1 className   Ljava/lang/String;
```


<!-- indicate-the-source -->
