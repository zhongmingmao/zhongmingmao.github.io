---
title: JVM基础 -- 桥接方法
date: 2018-12-18 20:07:14
categories:
    - JVM
tags:
    - JVM
---

## 背景
Java语言的重写与JVM的重写并不一致，当在Java语言中为重写而在JVM中为非重写，编译器会通过生成**桥接方法**来实现Java中的重写语义

## 桥接方法 -- 返回类型

### Java代码
```java
@Slf4j
public class Father {
    public Number work() {
        return 1.0;
    }

    public static void main(String[] args) {
        Father father = new Son();
        // 实际调用的是桥接方法
        Number work = father.work();
        log.info("{}", work);
    }
}

class Son extends Father {
    @Override
    public Double work() {
        return 2.0;
    }
}
```

<!-- more -->

### 字节码
```
$ javap -v -c Son
public java.lang.Double work();
  descriptor: ()Ljava/lang/Double;
  flags: ACC_PUBLIC
  Code:
    stack=2, locals=1, args_size=1
       0: ldc2_w        #2                  // double 2.0d
       3: invokestatic  #4                  // Method java/lang/Double.valueOf:(D)Ljava/lang/Double;
       6: areturn
    LineNumberTable:
      line 21: 0
    LocalVariableTable:
      Start  Length  Slot  Name   Signature
          0       7     0  this   Lme/zhongmingmao/basic/bridge/return_type/Son;

// 桥接办法
public java.lang.Number work();
  descriptor: ()Ljava/lang/Number;
  // ACC_BRIDGE：桥接方法；ACC_SYNTHETIC：编译器自动生成
  flags: ACC_PUBLIC, ACC_BRIDGE, ACC_SYNTHETIC
  Code:
    stack=1, locals=1, args_size=1
       0: aload_0
       // 调用Son本身重写的方法
       1: invokevirtual #5                  // Method work:()Ljava/lang/Double;
       4: areturn
    LineNumberTable:
      line 18: 0
    LocalVariableTable:
      Start  Length  Slot  Name   Signature
          0       5     0  this   Lme/zhongmingmao/basic/bridge/return_type/Son;
```

1. 如果没有桥接办法，对于Java语言是重写的，但对于JVM来说却不是重写的
    - 只有当两个方法的**参数类型**和**返回类型**一致，JVM才会判定为重写
    - Java编译器会在Son的字节码中**自动生成一个桥接方法**来保证重写语义

#### 翻译桥接方法
```java
public Number work() {
    return this.work();
}
```

### 调用桥接办法
1. 编译器通过插入**桥接办法**来保证重写的语义
2. JVM通过**方法描述符**（参数类型+返回类型）定位到具体的方法

```java
Father father = new Son();
// 实际调用的是桥接方法
Number work = father.work();
log.info("{}", work);
```

## 桥接方法 -- 泛型

### Java代码
```java
public interface Father {
    void work();

    static void main(String[] args) {
        Job job = new Doctor();
        // 调用实际的方法
        job.work(new Son());
        // 调用桥接方法，有checkcast指令，抛出ClassCastException
        job.work(new Daughter());
    }
}

class Son implements Father {
    @Override
    public void work() {
    }
}

class Daughter implements Father {
    @Override
    public void work() {
    }
}

abstract class Job<T extends Father> {
    protected void work(T father) {
        father.work();
    }
}

class Doctor extends Job<Son> {
    @Override
    public void work(Son son) {
        super.work(son);
    }
}

class Nurse extends Job<Daughter> {
    @Override
    public void work(Daughter daughter) {
        super.work(daughter);
    }
}
```

### 字节码
```
$ javap -v -c Job
protected void work(T);
  // Java是伪泛型，会进行类型擦除
  // 因此泛型T被换成Father，方法签名为protected void work(Father father)
  descriptor: (Lme/zhongmingmao/basic/bridge/generic/Father;)V
  flags: ACC_PROTECTED
  Code:
    stack=1, locals=2, args_size=2
       0: aload_1
       // 调用接口方法
       1: invokeinterface #2,  1            // InterfaceMethod me/zhongmingmao/basic/bridge/generic/Father.work:()V
       6: return
    LineNumberTable:
      line 27: 0
      line 28: 6
    LocalVariableTable:
      Start  Length  Slot  Name   Signature
          0       7     0  this   Lme/zhongmingmao/basic/bridge/generic/Job;
          0       7     1 father   Lme/zhongmingmao/basic/bridge/generic/Father;
    LocalVariableTypeTable:
      Start  Length  Slot  Name   Signature
          0       7     0  this   Lme/zhongmingmao/basic/bridge/generic/Job<TT;>;
          0       7     1 father   TT;
  Signature: #20                          // (TT;)V
```


```
$ javap -v -c Doctor
public void work(me.zhongmingmao.basic.bridge.generic.Son);
  descriptor: (Lme/zhongmingmao/basic/bridge/generic/Son;)V
  flags: ACC_PUBLIC
  Code:
    stack=2, locals=2, args_size=2
       0: aload_0
       1: aload_1
       2: invokespecial #2                  // Method me/zhongmingmao/basic/bridge/generic/Job.work:(Lme/zhongmingmao/basic/bridge/generic/Father;)V
       5: return
    LineNumberTable:
      line 34: 0
      line 35: 5
    LocalVariableTable:
      Start  Length  Slot  Name   Signature
          0       6     0  this   Lme/zhongmingmao/basic/bridge/generic/Doctor;
          0       6     1   son   Lme/zhongmingmao/basic/bridge/generic/Son;

// 桥接方法
public void work(me.zhongmingmao.basic.bridge.generic.Father);
  descriptor: (Lme/zhongmingmao/basic/bridge/generic/Father;)V
  flags: ACC_PUBLIC, ACC_BRIDGE, ACC_SYNTHETIC
  Code:
    stack=2, locals=2, args_size=2
       0: aload_0
       1: aload_1
       // 类型校验，必须为Son类型
       2: checkcast     #3                  // class me/zhongmingmao/basic/bridge/generic/Son
       // 调用Doctor本身重写的方法（非私有实例方法）
       5: invokevirtual #4                  // Method work:(Lme/zhongmingmao/basic/bridge/generic/Son;)V
       8: return
    LineNumberTable:
      line 31: 0
    LocalVariableTable:
      Start  Length  Slot  Name   Signature
          0       9     0  this   Lme/zhongmingmao/basic/bridge/generic/Doctor;
```

#### 翻译桥接办法
```java
public void work(Father father){
    // 强制类型转换
    super.work((Son) father);
}
```

### 调用桥接办法
```java
Job job = new Doctor();
// 调用实际的方法
job.work(new Son());
// 调用桥接方法，有checkcast指令，抛出ClassCastException
job.work(new Daughter());
```


<!-- indicate-the-source -->
