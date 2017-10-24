---
title: 字节码 - 方法重载 + 方法重写
date: 2016-07-07 00:06:25
categories:
    - JVM
tags:
    - Netease
    - JVM
---

{% note info %}
本文将从`JVM字节码`的角度解释`方法重载`与`方法重写`
{% endnote %}

<!-- more -->

# 方法重载

## 代码
```java
package me.zhongmingmao.test;

public class StaticDispatch {
    interface Human {
    }

    static class Man implements Human {
    }

    static class Woman implements Human {
    }

    public static void sayHello(Human human) {
        System.out.println("Hello , I'm a human");
    }

    public static void sayHello(Man man) {
        System.out.println("Hello , I'm a man");
    }

    public static void sayHello(Woman woman) {
        System.out.println("Hello , I'm a woman");
    }

    public static void main(String[] args) {
        Human man = new Man();          // 静态类型是Human，实际类型是Man
        Human woman = new Woman();      // 静态类型是Human，实际类型是Woman

        sayHello(man);                  // 静态类型是Human，实际类型是Man
        sayHello(woman);                // 静态类型是Human，实际类型是Woman
        sayHello((Man) man);            // 静态类型是Man，实际类型是Man
        sayHello((Woman) woman);        // 静态类型是Woman，实际类型是Woman
    }
}
```

## 运行结果
```
Hello , I'm a human
Hello , I'm a human
Hello , I'm a man
Hello , I'm a woman
```

## 分析

### 静态类型 VS 实际类型
1. `静态类型`在`编译期`可知，`实际类型`需要到`运行期`才可确定
2. 例如sayHello(Human human)，编译期只知道传进来的参数是Human类型的实例，但只有到了运行期才知道实际传进来的是Man类型实例还是Woman类型实例（或者其他Human实现类的实例）

### 重载判定
1. `编译期`在`重载`时是通过`参数的静态类型`而不是实际类型作为`判断依据`
2. 因此在`编译期`会依据`参数的静态类型`来决定使用哪一个重载版本

### 字节码
```
# javap -v
public static void main(java.lang.String[]);
    descriptor: ([Ljava/lang/String;)V
    flags: ACC_PUBLIC, ACC_STATIC
    Code:
        stack=2, locals=3, args_size=1
            0: new           #7     // class me/zhongmingmao/test/StaticDispatch$Man
            3: dup
            4: invokespecial #8     // Method me/zhongmingmao/test/StaticDispatch$Man."<init>":()V
            7: astore_1
            8: new           #9     // class me/zhongmingmao/test/StaticDispatch$Woman
            11: dup
            12: invokespecial #10   // Method me/zhongmingmao/test/StaticDispatch$Woman."<init>":()V
            15: astore_2
            16: aload_1
            17: invokestatic  #11   // Method sayHello:(Lme/zhongmingmao/test/StaticDispatch$Human;)V
            20: aload_2
            21: invokestatic  #11   // Method sayHello:(Lme/zhongmingmao/test/StaticDispatch$Human;)V
            24: aload_1
            25: checkcast     #7    // class me/zhongmingmao/test/StaticDispatch$Man
            28: invokestatic  #12   // Method sayHello:(Lme/zhongmingmao/test/StaticDispatch$Man;)V
            31: aload_2
            32: checkcast     #9    // class me/zhongmingmao/test/StaticDispatch$Woman
            35: invokestatic  #13   // Method sayHello:(Lme/zhongmingmao/test/StaticDispatch$Woman;)V
            38: return
        LocalVariableTable:
            Start  Length  Slot  Name   Signature
                0      39     0  args   [Ljava/lang/String;
                8      31     1   man   Lme/zhongmingmao/test/StaticDispatch$Human;
               16      23     2 woman   Lme/zhongmingmao/test/StaticDispatch$Human;
```
其中`4`个调用`sayHello方法`的`JVM字节码指令`
```
17: invokestatic  #11   // Method sayHello:(Lme/zhongmingmao/test/StaticDispatch$Human;)V
21: invokestatic  #11   // Method sayHello:(Lme/zhongmingmao/test/StaticDispatch$Human;)V
28: invokestatic  #12   // Method sayHello:(Lme/zhongmingmao/test/StaticDispatch$Man;)V
35: invokestatic  #13   // Method sayHello:(Lme/zhongmingmao/test/StaticDispatch$Woman;)V
```
从字节码可以看出，在`编译期`，依据按照参数的静态类型已经`明确选择`了调用哪一个重载版本

# 方法重写

## 代码
```java
package me.zhongmingmao.test;

public class DynamicDispatch {

    interface Human {
        default void sayHello() {
            System.out.println("Hello , I'm a human");
        }
    }

    static class Man implements Human {
        @Override
        public void sayHello() {
            System.out.println("Hello , I'm a man");
        }
    }

    static class Woman implements Human {
        @Override
        public void sayHello() {
            System.out.println("Hello , I'm a woman");
        }
    }

    public static void main(String[] args) {
        Human man = new Man();
        Human woman = new Woman();

        man.sayHello();
        woman.sayHello();

        man = new Woman();
        man.sayHello();
    }
}
```

## 运行结果
```
Hello , I'm a man
Hello , I'm a woman
Hello , I'm a woman
```

## 分析

### 字节码
```
public static void main(java.lang.String[]);
    descriptor: ([Ljava/lang/String;)V
    flags: ACC_PUBLIC, ACC_STATIC
    Code:
        stack=2, locals=3, args_size=1
            0: new           #2         // class me/zhongmingmao/test/DynamicDispatch$Man
            3: dup
            4: invokespecial #3         // Method me/zhongmingmao/test/DynamicDispatch$Man."<init>":()V
            7: astore_1
            8: new           #4         // class me/zhongmingmao/test/DynamicDispatch$Woman
            11: dup
            12: invokespecial #5        // Method me/zhongmingmao/test/DynamicDispatch$Woman."<init>":()V
            15: astore_2
            16: aload_1
            17: invokeinterface #6,  1  // InterfaceMethod me/zhongmingmao/test/DynamicDispatch$Human.sayHello:()V
            22: aload_2
            23: invokeinterface #6,  1  // InterfaceMethod me/zhongmingmao/test/DynamicDispatch$Human.sayHello:()V
            28: new           #4        // class me/zhongmingmao/test/DynamicDispatch$Woman
            31: dup
            32: invokespecial #5        // Method me/zhongmingmao/test/DynamicDispatch$Woman."<init>":()V
            35: astore_1
            36: aload_1
            37: invokeinterface #6,  1  // InterfaceMethod me/zhongmingmao/test/DynamicDispatch$Human.sayHello:()V
            42: return
        LocalVariableTable:
            Start  Length  Slot  Name   Signature
                0      43     0  args   [Ljava/lang/String;
                8      35     1   man   Lme/zhongmingmao/test/DynamicDispatch$Human;
               16      27     2 woman   Lme/zhongmingmao/test/DynamicDispatch$Human;
```
关于字节码的执行过程请参考博文「字节码 - JVM字节码执行过程」，下面仅做简略说明

#### 创建对象

指令`0`、`3`、`4`、`7`的主要作用是`创建并初始化`一个Man实例，并存入`局部变量表中偏移为1的slot`中（指令`8`、`11`、`12`、`15`作用类似）

1. `0: new` ：为Man类型`分配内存`，并将引入`压入操作数栈`
2. `3: dup` ：`复制栈顶元素`（即刚刚创建的Man引用），**`再次入栈`**，此时栈有`2个一样的Man引用`，主要是为了后面有`2个出栈操作`
3. `4: invokespecial` ：`弹出栈顶元素`，即Man引用，调用`<init>`方法（即JVM为我们生成的**`合成构造器`**方法）
4. `7: astore_1` ：`弹出栈顶元素`，同样也是Man引用，并将其存入`局部变量表中偏移为1的slot`中
5. `15: astore_2` ：这条指令执行完以后，局部变量表中`偏移为1的slot`中存储的是`man实例的引用`，`偏移为2的slot`中存储的是`woman实例的引用`

#### 多态查找
这里仅分析第一个`man.sayHello();`，其他的都是类似的原理
1. `16: aload_1` ： 将局部变量表中`偏移为1的slot`中的值`压入到操作数栈`中，此时`栈顶元素`为`man实例的引用`
2. `17: invokeinterface` ：弹出栈顶元素，并调用接口方法（中间还有校验等步骤，这里忽略），即调用`Man类型的实现`

`JVM字节码指令的执行`伴随着`操作数栈的出栈和入栈操作`，`多态调用`也是在`运行期`才能确定调用的是哪一个重写版本

<!-- indicate-the-source -->
