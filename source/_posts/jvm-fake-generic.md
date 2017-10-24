---
title: 字节码 - 伪泛型
date: 2016-07-08 00:06:25
categories:
    - JVM
tags:
    - Netease
    - JVM
---

{% note info %}
本文将从`JVM字节码`的角度解释一下Java为什么是`伪泛型`
{% endnote %}

<!-- more -->

# 伪泛型
1. Java是`伪泛型`的，泛型在Java中只是`语法糖`，是通过`类型擦除`和`强制转换`来实现的
2. 在`运行期`，`ArrayList<Integer>`与`ArrayList<String>`就是`同一个类`，在Java中并不存在类似与`ArrayList<Integer>`这种`泛型类型`

# 代码
```java
public class FakeGeneric {

    static class Father {
    }

    static class Son extends Father {
    }
    
    private static void checkFather(Father father) {
    }

    public static void main(String[] args) {
        Map<Father, Father> map = new HashMap<>(); // Map<K,V> , HashMap<K,V>
        Father father = new Father();
        Father son = new Son();

        map.put(father, son); // V put(K key, V value);
        checkFather(map.get(father)); // V get(Object key);
    }
}
```

# 字节码
```
public static void main(java.lang.String[]);
    descriptor: ([Ljava/lang/String;)V
    flags: ACC_PUBLIC, ACC_STATIC
    Code:
        stack=3, locals=4, args_size=1
            0: new           #2         // class java/util/HashMap
            3: dup
            4: invokespecial #3         // Method java/util/HashMap."<init>":()V
            7: astore_1
            8: new           #4         // class me/zhongmingmao/test/FakeGeneric$Father
            11: dup
            12: invokespecial #5        // Method me/zhongmingmao/test/FakeGeneric$Father."<init>":()V
            15: astore_2
            16: new           #6        // class me/zhongmingmao/test/FakeGeneric$Son
            19: dup
            20: invokespecial #7        // Method me/zhongmingmao/test/FakeGeneric$Son."<init>":()V
            23: astore_3
            24: aload_1
            25: aload_2
            26: aload_3
            27: invokeinterface #8,3    // InterfaceMethod java/util/Map.put:(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;
            32: pop
            33: aload_1
            34: aload_2
            35: invokeinterface #9,2    // InterfaceMethod java/util/Map.get:(Ljava/lang/Object;)Ljava/lang/Object;
            40: checkcast     #4        // class me/zhongmingmao/test/FakeGeneric$Father
            43: invokestatic  #10       // Method checkFather:(Lme/zhongmingmao/test/FakeGeneric$Father;)V
            46: return
        LocalVariableTable:
            Start  Length  Slot  Name   Signature
                0      47     0  args   [Ljava/lang/String;
                8      39     1   map   Ljava/util/Map;
               16      31     2 father   Lme/zhongmingmao/test/FakeGeneric$Father;
               24      23     3   son   Lme/zhongmingmao/test/FakeGeneric$Father;
        LocalVariableTypeTable:
            Start  Length  Slot  Name   Signature
                8      39     1   map   Ljava/util/Map<Lme/zhongmingmao/test/FakeGeneric$Father;Lme/zhongmingmao/test/FakeGeneric$Father;>;
}
```

## new HashMap<>()
在Java代码中，创建map时是带有泛型信息的
```java
Map<Father, Father> map = new HashMap<>();
```
对应的JVM字节码
```
0: new           #2 // class java/util/HashMap
3: dup
4: invokespecial #3 // Method java/util/HashMap."<init>":()V
7: astore_1
```
在map的创建过程中并`没有任何泛型信息`，已经可以初步判断，Java并不存在`HashMap<Father,Father>`这样的`泛型类型`，是**`伪泛型`**
关于那4个指令的具体含义，可参照博文「字节码 - 方法重载 + 方法重写」，这里不再赘述

## map.put(father, son)
在Java代码中，Map接口的`put`方法签名也是带有泛型信息的
```java
V put(K key, V value);
```
对应的JVM字节码
```
27: invokeinterface #8,3    // InterfaceMethod java/util/Map.put:(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;
```
在`put`操作中也是`没有任何泛型信息`，只是简单地处理为`java.lang.Object`，这也是我们常说的**`类型擦除`**

## map.get(father)
在Java代码中，Map接口的`get`方法签名也是带有泛型信息的
```
V get(Object key);
```
对应的JVM字节码
```
35: invokeinterface #9,2    // InterfaceMethod java/util/Map.get:(Ljava/lang/Object;)Ljava/lang/Object;
```
在`get`操作中也是`没有任何泛型信息`，只是简单地处理为`java.lang.Object`，与`put`操作类似

## checkFather(Father father)
Java代码
```
checkFather(map.get(father));
```
对应的字节码（排除`get`操作的字节码，前面已经提及过）
```
40: checkcast     #4        // class me/zhongmingmao/test/FakeGeneric$Father
43: invokestatic  #10       // Method checkFather:(Lme/zhongmingmao/test/FakeGeneric$Father;)V
```
1. 非常值得注意的是在调用`checkFather`方法之前有一个**`checkcast`**指令，这就是将之前的`get`操作得到的对象进行**`强制转换`**，由`Object`转换成`Father`
2. 那么JVM在执行`checkcast`的时候`怎么知道要转换成什么类型`呢？前面分析字节码操作都是没有附带任何泛型信息的
3. 答案就是在字节码文件中的**`LocalVariableTypeTable`**属性，因为Java是`伪泛型`的，因此需要这么一个属性详细记录的泛型信息，才能进行强制转换


# 伴随的问题
Java的伪泛型会带来一些语法上的`尴尬`，例如重载
```java
public static void method(List<String> list){
}

public static void method(List<Integer> list){
}
```
1. `List<String> list`与`List<Integer> list`在`Java语法层面`是`不同的参数类型`，应该`属于重载`
2. `List<String> list`与`List<Integer> list`在`JVM层面`，会进行所谓的`类型擦除`（其实只是伪泛型的一层`伪装`），是`同一参数类型`，方法具有`相同的特征签名`（`signature`）


<!-- indicate-the-source -->
