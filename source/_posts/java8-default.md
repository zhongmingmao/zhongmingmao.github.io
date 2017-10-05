---
title: Java 8小记 - Default Method
date: 2017-06-02 00:06:25
categories:
    - Java 8
tags:
    - Netease
    - Java 8
---

{% note info %}
本文主要介绍`Java 8`的 `default 方法`的简单使用
{% endnote %}

<!-- more -->

# 简介
1. `default方法`作为`接口的一部分`由实现类`继承`
2. `default方法`的目标用户是类库设计者
    - 以`兼容`的方式解决`类库的演进`问题

![java8-default](http://oqsopcxo1.bkt.clouddn.com/java8-default.png?imageView2/0/q/75|watermark/2/text/QHpob25nbWluZ21hbw==/font/Y291cmllciBuZXc=/fontsize/240/fill/IzAwMDAwMA==/dissolve/100/gravity/SouthEast/dx/11/dy/11|imageslim)

# 冲突解决
一个类可以实现`多个拥有默认方法的接口`，从而实现行为的`多继承`，按照下列步骤解决冲突
1. `类或父类`中声明的方法的优先级高于任何声明为默认方法的优先级
2. `子接口的default方法`优先级高于父接口的default方法
3. `显式`选择使用哪一个default方法

## 类与接口定义
相关代码托管在[java8_demo](https://github.com/zhongmingmao/java8_demo)
```java
interface A {
    default String hello() {
        return "Hello From A";
    }
}

interface B extends A {
    @Override
    default String hello() {
        return "Hello From B";
    }
}

class C implements A {
    @Override
    public String hello() {
        return "Hello From C";
    }
}

class D extends C implements A, B {
}


class E extends D implements A, B {
    @Override
    public String hello() {
        return "Hello From E";
    }
}

class F implements A, B {
}

interface G {
    default String hello() {
        return "Hello From G";
    }
}

class H implements B, G {
    @Override
    public String hello() {
        // A.super.hello() is not ok
        return B.super.hello(); // 显示选择 B 的 default 方法实现
    }
}
```

![java8-default-classes](http://oqsopcxo1.bkt.clouddn.com/java8-default-classes.png?imageView2/0/q/75|watermark/2/text/QHpob25nbWluZ21hbw==/font/Y291cmllciBuZXc=/fontsize/240/fill/IzAwMDAwMA==/dissolve/100/gravity/SouthEast/dx/11/dy/11|imageslim)

## 类或父类中的方法
```java
 @Test
public void fatherTest() {
   Supplier<D> dSupplier = D::new;
   assertEquals("Hello From C", dSupplier.get().hello());
}
    
@Test
public void selfTest() {
   Supplier<E> eSupplier = E::new;
   assertEquals("Hello From E", eSupplier.get().hello());
}
```
1. 类 `D` 继承类 `C`，类 `C` 有自己的重写版本，优先级高于接口的 `default` 方法，选择父类 `C` 的重写版本
2. 类 `E` 有自己的重载版本，优先级高于间接父类`C`的重写版本和接口的 `default` 方法，选择自身的重写版本

## 子接口的default方法
```java
@Test
public void sonInterfaceTest() {
   Supplier<F> fSupplier = F::new;
   assertEquals("Hello From B", fSupplier.get().hello());
}
```
类 `F` 实现接口 `B`和`A`，而`B`有继承 `A`，子接口`B`的优先级更高，选择接口 `B`的 `default` 实现

## 显式选择
```java
@Test
public void explicitTest() {
   Supplier<H> hSupplier = H::new;
   assertEquals("Hello From B", hSupplier.get().hello());
}
```
接口 `B` 和 `G` 没有继承关系，对 类 `H` 来说两者属于平等关系 ，必须重写，重写版本中显示选择了 `B` 的`default` 实现
<!-- indicate-the-source -->


