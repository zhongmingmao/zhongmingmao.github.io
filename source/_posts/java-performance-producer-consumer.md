---
title: Java性能 -- 生产者消费者模式 + 装饰器模式
mathjax: false
date: 2019-09-22 15:31:44
categories:
    - Java
    - Performance
tags:
    - Java
    - Java Performance
    - Design Pattern
---

## 生产者消费者模式

### 实现方式

#### Object的wait/notify/notifyAll
1. 基于Object的wait/notify/notifyAll与对象监视器（**Monitor**）实现**线程间的等待和通知**
2. 这种方式实现的生产者消费者模式是基于**内核**实现的，可能会导致大量的**上下文切换**，性能不是最理想的

<!-- more -->

#### Lock中Condition的await/signal/signalAll
1. 相对于Object的wait/notify/notifyAll，更推荐JUC包提供的Lock && Condition实现的生产者消费者模式
2. Lock && Condition实现的生产者消费者模式，是基于**Java代码层**实现的，在**性能**和**扩展性**方面更有优势

#### BlockingQueue
1. 简单明了

### 限流算法
**漏桶算法**通过**限制容量池大小**来控制流量，而**令牌桶算法**则通过**限制发放令牌的速率**来控制流量

#### 漏桶算法
1. 请求如果要进入业务层，就必须经过漏桶，而**漏桶出口的请求速率是均衡的**
2. 如果漏桶已经满了，请求将会溢出，不会因为入口的请求量突然增加而导致系统崩溃

#### 令牌桶算法
1. 系统以一个**恒定的速度**在一个桶中放入令牌，一个请求如果要进入业务层，必须要拿到一个令牌
2. 当桶里没有令牌可以取时，那么请求会被拒绝
3. Guava中的**RateLimiter**是基于令牌桶算法实现的

## 装饰器模式
1. 装饰器模式能够为对象**动态添加新功能**，从一个对象的**外部**给对象添加功能，具有非常**灵活的扩展性**
2. 装饰器模式还能够实现对象的**动态组合**

### URL
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-decorator.png" width=1000/>

### IDecorator
```java
public interface IDecorator {
    void decorate();
}
```

### Decorator
```java
public class Decorator implements IDecorator {

    @Override
    public void decorate() {
        System.out.println("Decorator");
    }
}
```

### BaseDecorator
```java
@AllArgsConstructor
public class BaseDecorator implements IDecorator {
    private IDecorator decorator;

    @Override
    public void decorate() {
        if (decorator != null) {
            decorator.decorate();
        }
    }
}
```

### ADecorator
```java
public class ADecorator extends BaseDecorator {

    public ADecorator(IDecorator decorator) {
        super(decorator);
    }

    @Override
    public void decorate() {
        System.out.println("ADecorator");
        super.decorate();
    }
}
```

### BDecorator
```java
public class BDecorator extends BaseDecorator {

    public BDecorator(IDecorator decorator) {
        super(decorator);
    }

    @Override
    public void decorate() {
        System.out.println("BDecorator");
        super.decorate();
    }

    public static void main(String[] args) {
        new BDecorator(new ADecorator(new Decorator())).decorate();
        // BDecorator
        // ADecorator
        // Decorator
    }
}
```