---
title: Java性能 -- 单例模式
mathjax: false
date: 2019-09-17 13:04:13
categories:
    - Java
    - Performance
tags:
    - Java
    - Java Performance
---

## 饿汉模式
```java
// 饿汉模式
public final class Singleton {
    private static Singleton instance = new Singleton();

    private Singleton() {
    }

    public static Singleton getInstance() {
        return instance;
    }
}
```

<!-- more -->

1. 使用了`static`修饰了成员变量instance，所以该变量会在**类初始化**的过程中被收集进_**类构造器`<clinit>`**_
2. 在**多线程**场景下，**JVM**会保证只有一个线程能够执行该类的`<clinit>`方法，其它线程将会被**阻塞等待**
    - 等到唯一的一次`<clinit>`方法执行完成后，其它线程将不会再执行`<clinit>`方法，转而执行自己的代码
    - 因此，static修饰的成员变量instance，在**多线程**的情况下能保证**只实例化一次**
3. 在**类初始化**阶段就已经在堆内存中开辟了一块内存，用于存放实例化对象，所以也称为**饿汉模式**
    - 可以保证**多线程**情况下实例的唯一性，而且getInstance直接返回唯一实例，**性能很高**
    - 在类成员变量比较多，或者变量比较大的情况下，这种模式可能会在没有使用类对象的情况下，**一直占用堆内存**
    - 第三方框架一般不会采用饿汉模式来实现单例模式

## 懒汉模式

### Double-Check
```java
// 懒汉模式
public final class Singleton {
    private static Singleton instance = null;

    private Singleton() {
    }

    public static Singleton getInstance() {
        if (null == instance) {
            instance = new Singleton();
        }
        return instance;
    }
}
```
1. 懒汉模式是为了**避免加载类对象时提前创建对象**的一种单例模式
2. 懒汉模式使用了**懒加载**方式，只有当系统使用到类对象时，才会将实例加载到堆内存中
3. 上面的代码在**多线程**环境下，可能会出现**实例化多个类对象**的情况
    - 当线程A进入到if判断条件后，开始实例化对象，此时instance依然为null
    - 又有线程B进入到if判断条件，之后也会通过判断条件，进入到方法又创建一个实例
    - 可以**对方法进行加锁**，保证多线程下仅创建一个实例

```java
// 懒汉模式 + synchronized同步锁
public final class Singleton {
    private static Singleton instance = null;

    private Singleton() {
    }

    public static synchronized Singleton getInstance() {
        if (null == instance) {
            instance = new Singleton();
        }
        return instance;
    }
}
```
1. **同步锁**会增加**锁竞争**，带来系统**性能开销**，从而导致系统性能下降，因此这种方式也会**降低单例模式的性能**
2. 可以考虑将同步锁放在if条件里面，**减少锁粒度**，进而**减少同步锁的资源竞争**

```java
// 懒汉模式 + synchronized同步锁
public final class Singleton {
    private static Singleton instance = null;

    private Singleton() {
    }

    public static Singleton getInstance() {
        if (null == instance) {
            synchronized (Singleton.class) {
                instance = new Singleton();
            }
        }
        return instance;
    }
}
```
1. 上述代码依然会**创建多个实例**，因为在**多线程**并发情况下，可以同时通过if判断条件
2. 因此需要在同步锁里面再加一个判断条件，即`Double-Check`

```java
// 懒汉模式 + synchronized同步锁 + Double-Check
public final class Singleton {
    private static Singleton instance = null;
    public List<String> list;

    private Singleton() {
        list = new ArrayList<>();
    }

    public static Singleton getInstance() {
        if (null == instance) {
            synchronized (Singleton.class) {
                if (null == instance) {
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}
```
1. 在JVM中，**重排序**是非常重要的一环，尤其在并发编程中，JVM可能会进行任意排序以**提高程序性能**
2. 上面代码`instance = new Singleton()`的执行过程
    1. 给Singleton分配内存
    2. 调用Singleton的构造函数来初始化成员变量（即list）
    3. 将Singleton对象指向分配的内存空间（执行完之后instance为**非null**）
3. 如果JVM发生重排序优化，上面的步骤3可能会发生在步骤2之前
    - 如果初始化线程A刚好完成步骤3，而步骤2没有进行时，又有另一个线程B到了**第一次判断**
    - 线程B判断instance为非null，直接返回对象（**未完成构造**）使用，可能会导致**异常**
4. _**synchronized只能保证可见性、原子性，但无法保证同步块内执行的顺序!!**_
5. **volatile**可以保证线程间变量的可见性，同时还可以阻止**局部重排序**的发生，代码如下

```java
// 懒汉模式 + synchronized同步锁 + Double-Check
public final class Singleton {
    private volatile static Singleton instance = null;
    public List<String> list;
    
    private Singleton() {
        list = new ArrayList<>();
    }

    public static Singleton getInstance() {
        if (null == instance) {
            synchronized (Singleton.class) {
                if (null == instance) {
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}
```

### 内部类
```java
// 懒汉模式 + 内部类实现
public final class Singleton {
    public List<String> list;

    private Singleton() {
        list = new ArrayList<>();
    }

    public static class InnerSingleton {
        private static Singleton instance = new Singleton();
    }

    public static Singleton getInstance() {
        return InnerSingleton.instance;
    }
}
```