---
title: JVM基础 -- Java语法糖
date: 2019-01-01 18:01:07
categories:
    - JVM
tags:
    - JVM
---

## 自动装拆箱

### Java代码
```java
public int foo() {
    List<Integer> list = new ArrayList<>();
    list.add(0);
    return list.get(0);
}
```

<!-- more -->

### 字节码
```
public int foo();
  descriptor: ()I
  flags: ACC_PUBLIC
  Code:
    stack=2, locals=2, args_size=1
       0: new               // class java/util/ArrayList
       3: dup
       4: invokespecial     // Method java/util/ArrayList."<init>":()V
       7: astore_1
       8: aload_1
       9: iconst_0
       // 自动装箱
      10: invokestatic      // Method java/lang/Integer.valueOf:(I)Ljava/lang/Integer;
       // 伪泛型
      13: invokeinterface   // InterfaceMethod java/util/List.add:(Ljava/lang/Object;)Z
      18: pop
      19: aload_1
      20: iconst_0
       // 伪泛型
      21: invokeinterface   // InterfaceMethod java/util/List.get:(I)Ljava/lang/Object;
       // 类型转换
      26: checkcast         // class java/lang/Integer
       // 自动拆箱
      29: invokevirtual     // Method java/lang/Integer.intValue:()I
      32: ireturn
```

#### 自动装箱
```java
// 字节码中的方法描述符：java/lang/Integer.valueOf:(I)Ljava/lang/Integer
// -Djava.lang.Integer.IntegerCache.high=128
// -XX:+AggressiveOpts会让AutoBoxCacheMax到达20_000
// Java暂不支持IntegerCache.low的更改
public static Integer valueOf(int i) {
    if (i >= IntegerCache.low && i <= IntegerCache.high)
        return IntegerCache.cache[i + (-IntegerCache.low)];
    return new Integer(i);
}
```

#### 自动拆箱
```java
// 字节码中的方法描述符：java/lang/Integer.intValue:()I
public int intValue() {
    return value;
}
```

## 泛型与类型擦除
截取上面关键的字节码
```
// 伪泛型，add(Object):Z
13: invokeinterface   // InterfaceMethod java/util/List.add:(Ljava/lang/Object;)Z
// 伪泛型，get(I):Object
21: invokeinterface   // InterfaceMethod java/util/List.get:(I)Ljava/lang/Object;
// 类型转换，方便后续的自动拆箱
26: checkcast         // class java/lang/Integer
```

1. **Java程序里面的泛型信息，在JVM里面全部丢失**
    - 主要是为了**兼容**引入泛型之前的代码
2. Java编译器会选取该泛型能指代的所有类中**层次最高**的那个，作为替换泛型的类
    - 对于**限定了继承类**的泛型参数，类型擦除后，所有的类型参数都会变成所限定的继承类
    - 否则，将**默认限定了继承自Object**

### Java代码
```java
public class Generic<T extends Number> {
    T func(T t) {
        return t;
    }
}
```

### 字节码
```
T func(T);
  descriptor: (Ljava/lang/Number;)Ljava/lang/Number;
  flags:
  Code:
    stack=1, locals=2, args_size=2
       0: aload_1
       1: areturn
    LineNumberTable:
      line 5: 0
    LocalVariableTable:
      Start  Length  Slot  Name   Signature
          0       2     0  this   Lme/zhongmingmao/basic/sugar/Generic;
          0       2     1     t   Ljava/lang/Number;
    LocalVariableTypeTable:
      Start  Length  Slot  Name   Signature
          0       2     0  this   Lme/zhongmingmao/basic/sugar/Generic<TT;>;
          0       2     1     t   TT;
  Signature: #19                          // (TT;)TT;
```

1. 方法描述符的接收参数类型以及返回参数类型都是Number
2. 字节码仍然存在泛型参数的信息，例如`T func(T);`和方法签名`(TT;)TT;`
    - 这类信息主要在Java编译器**编译其他类**时使用

## foreach

### 数组
```java
public void funa(int[] array) {
    for (int item : array) {
    }
}

// 等同于
public void funb(int[] array) {
    int[] tmpArray = array;
    int length = tmpArray.length;
    for (int i = 0; i < length; i++) {
        int item = tmpArray[i];
    }
}
```

### Iterable对象
```java
public void func(List<Iterable> list) {
    for (Iterable item : list) {
    }
}

// 等同于
public void fund(List<Iterable> list) {
    Iterator<Iterable> iterator = list.iterator();
    while (iterator.hasNext()) {
        Iterable item = iterator.next();
    }
}
```

## switch

### Java代码
```java
public void func(String s) {
    switch (s) {
        case "A":
            break;
        case "B":
            break;
        default:
            break;
    }
}
```

### 字节码
```
public void func(java.lang.String);
  descriptor: (Ljava/lang/String;)V
  flags: ACC_PUBLIC
  Code:
    stack=2, locals=4, args_size=2
       0: aload_1
       1: astore_2
       2: iconst_m1
       3: istore_3
       4: aload_2
       // 取字符串的hashCode
       5: invokevirtual         // Method java/lang/String.hashCode:()I
       8: lookupswitch  {
                    65: 36      // 65 -> "A"
                    66: 50      // 66 -> "B"
               default: 61
          }
      36: aload_2
      37: ldc                   // String A
      39: invokevirtual         // Method java/lang/String.equals:(Ljava/lang/Object;)Z
      42: ifeq          61
      45: iconst_0
      46: istore_3
      47: goto          61
      50: aload_2
      51: ldc                   // String B
      53: invokevirtual         // Method java/lang/String.equals:(Ljava/lang/Object;)Z
      56: ifeq          61
      59: iconst_1
      60: istore_3
      61: iload_3
      62: lookupswitch  {
                     0: 88
                     1: 91
               default: 94
          }
      88: goto          94
      91: goto          94
      94: return
```

1. 每个case截获的字符串都是一个**常量值**，取其**hashCode**，当成**int值的switch**
2. 由于hashCode有可能发生**碰撞**，因此还需要借助`String.equals`逐个比较发生了碰撞的字符串

<!-- indicate-the-source -->
