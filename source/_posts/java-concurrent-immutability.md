---
title: Java并发 -- Immutability模式
date: 2019-05-18 08:07:33
categories:
    - Java
    - Concurrent
tags:
    - Java
    - Java Concurrent
---

## Immutability模式
Immutability模式：对象一旦被创建之后，状态就不再发生变化

## 不可变类
1. 将一个类**所有的属性**都设置成**final**，并且只允许存在**只读**方法
2. 将**类**也设置成**final**的，因为子类可以重写父类的方法，有可能改变不可变性

<!-- more -->

## 包装类
1. String、Integer、Long和Double等基础类型的包装类都具备不可变性
2. 这些对象的线程安全都是靠不可变性来保证的
3. 严格遵守：_**类和属性都是final的，所有方法均是只读的**_
4. 如果具备不可变性的类，需要提供**修改**的功能，那会**创建一个新的不可变对象**
    - 这会浪费内存空间，可以通过**享元模式**来优化

```java
private final char value[];

public String replace(char oldChar, char newChar) {
    if (oldChar != newChar) {
        int len = value.length;
        int i = -1;
        char[] val = value; /* avoid getfield opcode */

        while (++i < len) {
            if (val[i] == oldChar) {
                break;
            }
        }
        if (i < len) {
            char buf[] = new char[len];
            for (int j = 0; j < i; j++) {
                buf[j] = val[j];
            }
            while (i < len) {
                char c = val[i];
                buf[i] = (c == oldChar) ? newChar : c;
                i++;
            }
            // 创建一个新的String对象，原String对象不会发生变化
            return new String(buf, true);
        }
    }
    return this;
}
```

## 享元模式
1. 享元模式本质上是一个_**对象池**_
2. Long内部维护了一个静态的对象池，仅缓存[-128,127]（利用率最高）之间的数字

```java
public static Long valueOf(long l) {
    final int offset = 128;
    if (l >= -128 && l <= 127) { // will cache
        return LongCache.cache[(int)l + offset];
    }
    return new Long(l);
}

// 缓存，等价于对象池
private static class LongCache {
    private LongCache(){}

    static final Long cache[] = new Long[-(-128) + 127 + 1];

    static {
        for(int i = 0; i < cache.length; i++)
            cache[i] = new Long(i - 128);
    }
}
```

### 锁
基本上所有基础类型的包装类都不适合做锁，因为它们内部用到了享元模式
```java
// al和bl是同一个对象
class A {
    private Long al = Long.valueOf(1);

    public void set() {
        synchronized (al) {
        }
    }
}

class B {
    private Long bl = Long.valueOf(1);

    public void set() {
        synchronized (bl) {
        }
    }
}
```

## 注意事项

### 不可变性的边界
1. 对象的所有属性都是final，也并不能保证不可变性
2. 需要明确不可变性的**边界**，是否要求属性对象也具有不可变性

```java
@Data
class Foo {
    private int age = 0;
    private String name = "abc";
}

final class Bar {
    private final Foo foo = new Foo();

    public void setAge(int age) {
        // 属性foo虽然是final，但依然可以通过setAge修改foo的属性age
        foo.setAge(age);
    }
}
```

### 正确发布
不可变对象是线程安全的，但并不意味着引用这些不可变对象的对象也是线程安全的
```java
// C 线程安全
@Data
final class C {
    final int age = 0;
    final String name = "abc";
}

// D 线程不安全
class D {
    private C c;

    // 在多线程环境下，并不能保证可见性和原子性
    // 如果仅需保证可见性，无需保证原子性，可以用volatile修饰c
    // 如果需要保证原子性，可以通过原子类来实现
    public void setC(C c) {
        this.c = c;
    }
}
```

## 无状态
1. 具备**不可变性**的对象，**只有一种状态**，这个状态由对象内部所有的不可变属性共同决定的
2. 还有一种更简单的不可变对象，即**无状态**，无状态对象内部**没有属性**，只有方法
3. 无状态的核心优势是**性能**
    - 在多线程领域，无状态对象没有线程安全问题，无需同步处理
    - 在分布式领域，无状态服务可以无限地水平扩展

<!-- indicate-the-source -->

## 参考资料
[Java并发编程实战](https://time.geekbang.org/column/intro/100023901)