---
title: JVM基础 -- 字节码
date: 2019-01-03 23:15:14
categories:
    - JVM
tags:
    - JVM
---

## 操作数栈
1. JVM是**基于栈的计算模型**
2. 在**解析过程**中，每当为**Java方法**分配**栈帧**时
    - 执行每条执行之前，JVM要求该指令的操作数已被压入操作数栈中
    - 在执行指令时，JVM会将该指令所需要的操作数**弹出**，并将该指令的结果重新**压入**栈中

<!-- more -->

### iadd
1. 执行iadd之前，栈顶的元素为int值1和int值2
2. 执行iadd指令会将弹出这两个int，并将求得的和int值3压入栈中
3. iadd只消耗栈顶的两个元素，iadd并不关心更远的元素，也不会对它们进行修改
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/basic/jvm-basic-bytecode-iadd-0.png" width=400/>
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/basic/jvm-basic-bytecode-iadd-1.png" width=400/>

### dup + pop
1. dup和pop只能处理非long和非double类型的值
2. long类型和double类型需要占据两个栈单元，对应使用dup2和pop2

#### dup
1. dup：**复制栈顶元素**
2. dup指令常用于复制new指令生成的**未经初始化**的引用

```
public void dup() {
    Object o = new Object();
}

// 对应的字节码
public void dup();
  descriptor: ()V
  flags: ACC_PUBLIC
  Code:
    stack=2, locals=2, args_size=1
       0: new               // class java/lang/Object
       3: dup
       4: invokespecial     // Method java/lang/Object."<init>":()V
       7: astore_1
       8: return
```

1. 执行new指令时，JVM将指向一块**已分配的但未初始化**的内存引用压入操作数栈
2. invokespecial指令将要以这个引用为调用者，调用其构造器
    - 该指令将**消耗**操作数栈上的元素，作为它的调用者和参数
3. 因此，在这之前利用dup**指令**复制一份new指令的结果，并用来调用构造器

#### pop
1. pop：**舍弃栈顶元素**
2. pop指令常用于**舍弃调用指令的返回结果**

```
public static boolean judge() {
    return false;
}

public void pop() {
    judge();
}

// 对应的字节码
public void pop();
  descriptor: ()V
  flags: ACC_PUBLIC
  Code:
    stack=1, locals=1, args_size=1
       0: invokestatic      // Method judge:()Z
       3: pop
       4: return
```

1. invokestatic指令依然会将返回值压入pop方法的操作数栈
2. 因此JVM需要执行额外的pop指令，将返回值舍弃


### 加载常量
1. iconst指令加载-1和5之间的int值
2. bipush（sipush）指令加载一个字节（两个字节）所能代表的int值
3. ldc指令加载常量池中的常量值

| 类型 | 常数指令 | 范围 |
| ---- | ---- | ---- |
| int/short/char/byte/boolean   | iconst  |  [-1,5]  |
|   | bipush  | [-128,127]  |
|   | sipush  | [-32768,32767]  |
|   | ldc  | any int value  |
| long  | lconst  | 0,1  |
|   | ldc  | any long value  |
| float   | fconst  | 0,1,2  |
|   | ldc  | any float value |
| double  | dconst  | 0,1  |
|   | ldc  | any double value |
| reference   | aconst  | null  |
|   | ldc  | String literal,Class literal |

### 异常
1. 正常情况下，操作数栈的压入弹出都是**一条条**指令完成的
2. 在抛出异常时，JVM会**清空**操作数栈上到所有内容，而后将异常实例的引用压入操作数栈

## 局部变量表
1. Java方法**栈帧**的组成：**操作数栈+局部变量表**
2. 字节码程序将计算的结果**缓存**在局部变量表
3. 局部变量表类似于一个**数组**，依次存放
    - **this指针（针对实例方法）**
    - **所传入的参数**
    - **字节码中的局部变量**
4. 与操作数栈一样，long类型和double类型将占据两个存储单元

```
public void locals(long l, float f) {
    {
        int i = 0;
    }
    {
        String s = "Hello Word";
    }
}

// 对应的字节码
public void locals(long, float);
  descriptor: (JF)V
  flags: ACC_PUBLIC
  Code:
    stack=1, locals=5, args_size=3
       0: iconst_0
       1: istore        4
       3: ldc               // String Hello Word
       5: astore        4
       7: return
```

<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/basic/jvm-basic-bytecode-locals.png" width=400/>
1. locals是一个实例方法，局部变量表的第0个单元存放this指针
2. 第一个参数为long类型，占用局部变量表的第1、2个单元
3. 第二个参数为int类型，占用局部变量表的第3个单元
4. 方法体内的两个代码块中，分别定义了局部变量i和s，两者的生命周期没有重合
    - Java编译器将它们编排至同一单元，即局部变量表的第4个单元
    - `istore 4`和`astore 4`
5. Java编译器在编译时就已经能确定操作数栈、局部变量表的大小以及参数个数
    - `stack=1, locals=5, args_size=3`

### 加载 + 存储
1. 存储在局部变量表中的值，通常需要加载至操作数栈中，才能进行计算
2. 得到的计算结果后再存储至局部变量表中
3. 局部变量表的**加载**和**存储**指令都需要指明所加载单元的**下标**
4. 唯一直接作用于局部变量表的指令：iinc M N
    - 将局部变量表的第M个单元中的int值增加N
    - 常用于for循环中的自增量的更新

| 类型 | 加载指令 | 存储指令 |
| ---- | ---- | ---- |
| int/short/char/byte/boolean | iload | istore |
| long | lload | lstore |
| float | fload | fstore |
| double | dload | dstore |
| reference | aload | astore |

```
public void innc() {
    for (int i = 0; i < 100; i++) {
    }
}

// 对应的字节码
public void innc();
  descriptor: ()V
  flags: ACC_PUBLIC
  Code:
    stack=2, locals=2, args_size=1
       0: iconst_0
       1: istore_1
       2: iload_1
       3: bipush        100
       5: if_icmpge     14
       8: iinc          1, 1 // i++
      11: goto          2
      14: return
```

## 其他字节码

### Java相关
1. new：后跟目标类，生成该类**未初始化**的对象引用
2. instanceof：后跟目标类，判断**栈顶元素**是否为目标类（接口）的实例，**是则压入1，否则压入0**
3. checkcast：后跟目标类，判断**栈顶元素**是否为目标类（接口）的实例，如果不是则**抛出异常**
4. athrow：将**栈顶异常**抛出
5. monitorenter：为**栈顶对象**加锁
6. monitorexit：为**栈顶对象**解锁
7. getstatic/putstatic/getfield/putfield
    - **附带用于定位目标字段的信息，但消耗的操作数栈元素个各不相同**
    - 如下图，将值v存储至对象obj的目标字段中
8. invokestatic/invokespecial/invokevirtual/invokeinterface
    - 这四个方法调用指令所消耗的操作数栈元素是根据**调用类型**以及**目标方法描述符**来确定的
    - **在进行方法调用之前，需要依次压入调用者（invokestatic不需要）以及各个参数**

#### putfiled
```
public class PutField {
    private Object obj;

    public void putFiled() {
        obj = new Object();
    }
}

// 对应的字节码
public void putFiled();
  descriptor: ()V
  flags: ACC_PUBLIC
  Code:
    stack=3, locals=1, args_size=1
       0: aload_0
       1: new               // class java/lang/Object
       4: dup
       5: invokespecial     // Method java/lang/Object."<init>":()V
       8: putfield          // Field obj:Ljava/lang/Object;
      11: return
```

<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/basic/jvm-basic-bytecode-putfield.png" width=400/>

#### invokevirtual
```
public int neg(int i) {
    return -i;
}

public int foo(int i) {
    return neg(neg(i));
}

// 对应的字节码
public int foo(int);
  descriptor: (I)I
  flags: ACC_PUBLIC
  Code:
    stack=3, locals=2, args_size=2
       0: aload_0
       1: aload_0
       2: iload_1
       3: invokevirtual     // Method neg:(I)I
       6: invokevirtual     // Method neg:(I)I
       9: ireturn
```

foo(2)的执行过程
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/basic/jvm-basic-bytecode-invoke.png" width=300/>

### 数组相关
1. newarray：新建**基本类型**的数组
2. anewarray：新建**引用类型**的数组
3. multianewarray：生成**多维数组**
4. arraylegth：求**数组长度**
5. 数组的**加载**和**存储**指令（区分类型）

```
public void array() {
    int[] a = new int[10];
    Object[] b = new Object[10];
    int[][] c = new int[10][10];
    int l = a.length;
}

// 对应的字节码
public void array();
  descriptor: ()V
  flags: ACC_PUBLIC
  Code:
    stack=2, locals=5, args_size=1
       0: bipush        10
       2: newarray       int
       4: astore_1
       5: bipush        10
       7: anewarray     #2      // class java/lang/Object
      10: astore_2
      11: bipush        10
      13: bipush        10
      15: multianewarray #3,  2 // class "[[I"
      19: astore_3
      20: aload_1
      21: arraylength
      22: istore        4
      24: return
```

| 数组类型 | 加载指令 | 存储指令 |
| ----- | ---- | ---- |
| byte/boolean | baload | bastore |
| char | caload | castore |
| short | saload | sastore |
| int | iaload | iastore |
| long | laload | lastore |
| float | faload | fastore |
| double | daload | dastore |
| reference | aaload | aastore |

### 控制流
1. goto：无条件跳转
2. tableswitch/lookupswitch：密集case/稀疏case
3. 返回指令
4. 除了返回指令外，其他控制流指令均附带一个或多个字节码偏移量，代表需要跳转到的位置

| 返回类型 | 返回指令 |
| ---- | ---- |
| void | return |
| int/short/char/byte/boolean | ireturn |
| long | lreturn |
| float | freturn |
| double | dreturn |
| reference | areturn |

<!-- indicate-the-source -->
