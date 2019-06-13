---
title: Java核心 -- 动态代理
date: 2019-05-03 21:08:18
categories:
    - Java
    - Core
tags:
    - Java
    - Java Core
---

## 编程语言分类
1. 动态类型和静态类型：语言类型是**运行时**检查，还是**编译期**检查
2. 强类型和弱类型：为**不同类型**的变量赋值时，是否需要进行**显式的类型转换**
3. Java是**静态的强类型语言**，但提供了类似**反射**等机制，因此也具备了**部分**动态类型语言的能力

<!-- more -->

## 反射
1. 反射机制是Java语言提供的一种基础功能，赋予程序**在运行时自省**的能力
2. 通过反射可以**直接操作类或者对象**
    - 获取某个对象的类定义
    - 获取类声明的属性和方法
    - 调用方法或者构造函数
    - 运行时修改类定义

### setAccessible
1. AccessibleObject.setAccessible(boolean flag)：可以在**运行时**修改成员的**访问限制**
2. setAccessible的应用遍布在日常开发、测试、依赖注入等框架中
    - 在O/R Mapping框架中，为一个Java实体对象，运行时自动生成getter/setter方法
    - 绕过API的访问控制，来调用内部API

## 动态代理
1. 动态代理是一种方便**运行时动态构建代理、动态处理代理方法调用**的机制
2. 很多场景都是利用类似的机制来实现的，例如用来**包装RPC调用**和**AOP**
3. 实现动态代理的方式
    - JDK自身提供的动态代理，主要利用**反射**机制
    - **字节码操作机制**，类似ASM、cglib（基于ASM）和Javassist

### 解决的问题
1. 动态代理是一种**代理**机制，代理可以看作对调用目标的**包装**，对目标代码的调用是通过代理完成的
2. 通过代理可以让**调用者和实现者解耦**，例如RPC调用，框架内部的寻址、序列化、反序列化等，对调用者没什么意义

### 发展历程
1. 静态代理 -> 动态代理
2. 静态代理：需要引入**额外的工作**，而这些工作与实际的业务逻辑没有关系
    - 古董技术RMI，需要rmic之类的工具生成静态stub等文件，增加了很多繁琐的准备工作
3. 动态代理：相应的stub等类，可以在运行时生成，对应的调用操作也是动态生成的，极大地提高生产力

### JDK Proxy + cglib
```java
public class MyDynamicProxy {
    public static void main(String[] args) {
        Hello hello = new HelloImpl();
        MyInvocationHandler handler = new MyInvocationHandler(hello);
        // 构造代理实例
        Hello proxyHello = (Hello) Proxy.newProxyInstance(Hello.class.getClassLoader(), hello.getClass().getInterfaces(), handler);
        // 调用代理方法
        proxyHello.sayHello();

        // 输出
        //  MyInvocationHandler Invoking HelloImpl#sayHello
        //  HelloImpl : Hello World
    }
}

interface Hello {
    void sayHello();
}

class HelloImpl implements Hello {
    @Override
    public void sayHello() {
        System.out.println(getClass().getSimpleName() + " : Hello World");
    }
}

@AllArgsConstructor
class MyInvocationHandler implements InvocationHandler {
    private Object target;

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        System.out.println(getClass().getSimpleName() + " Invoking " + target.getClass().getSimpleName() + "#" + method.getName());
        Object result = method.invoke(target, args);
        return result;
    }
}
```
1. 实现InvocationHandler，添加**额外**逻辑
2. 以Hello接口为纽带，为被调用目标构建**代理对象**，可以使用代理对象**间接**运行调用目标的逻辑
3. 以**接口**为中心，相当于添加了一种**对被调用者没有太大意义的限制**
4. 另外实例化的是**Proxy对象**，而不是真正的被调用类型，可能会带来各种不变和能力退化
5. 如果**被调用者没有实现接口**，可以通过**cglib**来实现动态代理（克服了对接口的依赖）
    - cglib动态代理的方式：创建目标类的**子类**，可以达到**近似使用被调用者本身**的效果

### 优势对比

#### JDK Proxy
1. **最小化依赖关系**，简化开发和维护，JDK本身的支持
2. **JDK平滑升级**，而字节码类库通常需要进行**更新**以保证在新版Java上能够使用
3. **代码实现简单**

#### cglib
1. **侵入性更小**，JDK Proxy是基于**接口**的，而**限定被调用者实现特定接口**是有侵入性的实践
2. **只需操作关心的类**，而不必为其它相关类增加工作量
3. **高性能**

### 性能对比
1. 在**主流**的JDK版本中，JDK Proxy在**典型场景**可以提供**对等的性能水平**，在数量级的差距并不是广泛存在的
2. 反射机制的性能在**现代**JDK中，已经得到了**极大的改进和优化**，同时JDK的很多功能同样使用了**ASM**进行字节码操作
3. 在选型时，性能并不是唯一考量，而**可靠性、可维护性和编程工作量**才是更主要的考虑因素

<!-- indicate-the-source -->
