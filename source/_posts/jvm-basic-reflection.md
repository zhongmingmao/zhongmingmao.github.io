---
title: JVM基础 -- 浅谈反射
date: 2018-12-20 22:37:41
categories:
    - Java
    - JVM
    - Baisc
tags:
    - Java
    - JVM
---

## 反射API

### 获取Class对象
1. Class.forName()
2. object.getClass()
3. 类名.class
    - Integer.TYPE指向int.class
4. 数组类型：**类名[].class**

```java
public static final Class<Integer>  TYPE = (Class<Integer>) Class.getPrimitiveClass("int");
```

<!-- more -->

### 常规用法
1. newInstance()
    - 生成该类实例
    - 需要**无参构造器**
2. isInstance(Object)
    - 判断一个对象是否为该类的实例
    - **语法上等同于instanceOf，在JIT优化时会有所差别**
3. Array.newInstance(Class<?>, int)
    - 构造该类型的数组
4. getFields()/getConstructors()/ getMethods()
    - 访问类成员
    - 带**Declared**的方法**不会返回父类成员，但会返回私有成员**；不带**Declared**的方法恰好相反

### 获取类成员后
1. Field/Constructor/Method setAccessible(true)
    - 绕开Java语言的限制
2. Field.get/set(Object)
    - 访问字段的值
3. Constructor.newInstance(Object[])
    - 生成该类实例
4. Method.invoke(Object, Object[])
    - 调用方法

## 方法的反射调用

```java
public final class Method extends Executable {
    public Object invoke(Object obj, Object... args) throws ... {
        ... // 权限检查
        MethodAccessor ma = methodAccessor;
        if (ma == null) {
            ma = acquireMethodAccessor();
        }
        // 委派给MethodAccessor来处理
        return ma.invoke(obj, args);
    }
}

public interface MethodAccessor {
    Object invoke(Object var1, Object[] var2) throws IllegalArgumentException, InvocationTargetException;
}
```

<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/basic/jvm-basic-reflect-method-accessor.png" />

每个Method实例的**第一次反射调用**都会生成一个**委派实现**，它**所委派的具体实现**便是一个**本地实现**
- **本地实现**：进入JVM内部后，便拥有了Method实例所指向方法的**具体地址**
- 此时，反射调用无非就是准备好入参，然后调用进入目标方法

### 本地实现

```java
public class V0 {
    public static void target(int i) {
        new Exception("#" + i).printStackTrace();
    }

    public static void main(String[] args) throws Exception {
        Class<?> klass = Class.forName(V0.class.getName());
        Method method = klass.getMethod("target", int.class);
        method.invoke(null, 0);
    }
}
```

```
// 本地实现
// Method.invoke -> DelegatingMethodAccessorImpl.invoke
// -> NativeMethodAccessorImpl.invoke -> NativeMethodAccessorImpl.invoke0
java.lang.Exception: #0
	at me.zhongmingmao.basic.reflect.V0.target(V0.java:7) -- Java
	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method) -- C++
	at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.lang.reflect.Method.invoke(Method.java:498) -- Java
	at me.zhongmingmao.basic.reflect.V0.main(V0.java:13)
```

1. 反射调用的顺序
    - Method.invoke（反射调用）
    - DelegatingMethodAccessorImpl.invoke（委派实现）
    - NativeMethodAccessorImpl.invoke（本地实现）
    - NativeMethodAccessorImpl.invoke0（目标方法）
2. 采用**委派实现**作为**中间层**的原因
    - 因为Java的反射调用机制还设立了另一种**动态生成字节码**的实现（**动态实现**），直接使用invoke指令来调用目标方法
    - **Method.invoke -> DelegatingMethodAccessorImpl.invoke -> GeneratedMethodAccessor1.invoke**
    - 因此采用委派实现，是为了能够在**本地实现**以及**动态实现**之间切换
3. **动态实现与本地实现相比，动态实现的运行效率能快上20倍**
    - 这是因为动态实现无需经过Java到C++再到Java的切换
4. **但生成字节码十分耗时，仅调用一次的话，反而本地实现要快上3~4倍**
    - 许多反射调用仅会执行一次，阈值：**sun.reflect.inflationThreshold=15**
    - < 15，采用本地实现
    - \>= 15，采用动态实现，将委派实现的委派对象切换至动态实现，该过程称之为**Inflation**
    - **-Dsun.reflect.noInflation=true**，关闭**Inflation**机制，反射调用在**一开始便会直接使用动态实现**，而不会使用委派实现或者本地实现

```java
// 动态实现的伪代码
package jdk.internal.reflect;

public class GeneratedMethodAccessor1 extends ... {
    @Overrides    
    public Object invoke(Object obj, Object[] args) throws ... {
        V0.target((int) args[0]);
        return null;
    }
}
```

### 动态实现
```java
// -verbose:class
public class V1 {
    public static void target(int i) {
        new Exception("#" + i).printStackTrace();
    }

    public static void main(String[] args) throws Exception {
        Class<?> klass = Class.forName(V1.class.getName());
        Method method = klass.getMethod("target", int.class);
        for (int i = 0; i < 20; i++) {
            method.invoke(null, i);
        }
    }
}
```

```
// 第15次反射调用时，触发了动态实现的生成，JVM额外加载其他类
java.lang.Exception: #14
	at me.zhongmingmao.basic.reflect.V1.target(V1.java:7)
	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.lang.reflect.Method.invoke(Method.java:498)
	at me.zhongmingmao.basic.reflect.V1.main(V1.java:14)
...
// 加载自动生成的字节码
[Loaded sun.reflect.GeneratedMethodAccessor1 from __JVM_DefineClass__]
java.lang.Exception: #15
	at me.zhongmingmao.basic.reflect.V1.target(V1.java:7)
	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.lang.reflect.Method.invoke(Method.java:498)
	at me.zhongmingmao.basic.reflect.V1.main(V1.java:14)
// 切换至刚刚生成的动态实现
java.lang.Exception: #16
	at me.zhongmingmao.basic.reflect.V1.target(V1.java:7)
	at sun.reflect.GeneratedMethodAccessor1.invoke(Unknown Source)
	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.lang.reflect.Method.invoke(Method.java:498)
	at me.zhongmingmao.basic.reflect.V1.main(V1.java:14)
```

## 反射调用的开销

### Class.forName + Class.getMethod
1. Class.forName会调用本地方法
2. Class.getMethod则会遍历**该类的公有方法**，如果没有匹配到，还将匹配**父类的公有方法**
    - 返回查找得到结果的一份**拷贝**
    - 避免在热点代码中使用返回**Method数组**的Class.getMethods()方法和Class.getDeclaredMethods()方法，减少不必要的堆空间消耗
3. 尽量在应用程序中缓存Class.forName和Class.getMethod的结果

### Method.invoke

#### 直接调用

##### Java代码
```java
public class V2 {
    public static void target(int i) {
    }

    private static void directCall() {
        long current = System.currentTimeMillis();
        for (int i = 1; i <= 2_000_000_000; i++) {
            if (i % 100_000_000 == 0) {
                long temp = System.currentTimeMillis();
                System.out.println(temp - current);
                current = temp;
            }

            V2.target(128);
        }
    }

    public static void main(String[] args) {
        directCall();
    }
}
```

1. 取最后5个值，作为预热后的峰值性能，大约为111.6ms；**与不调用的时间基本一致**
    - 因为这是**热循环**，触发**JIT**，将V2.target的调用**内联**进来，从而**消除了调用的开销**
2. **性能基准：111.6ms**

#### 反射调用

##### Java代码
```java
// -XX:+PrintGC
public class V3 {
    public static void target(int i) {
    }

    private static void reflectCall() throws Exception {
        Class<?> klass = Class.forName("me.zhongmingmao.basic.reflect.V3");
        Method method = klass.getMethod("target", int.class);

        long current = System.currentTimeMillis();
        for (int i = 1; i <= 2_000_000_000; i++) {
            if (i % 100_000_000 == 0) {
                long temp = System.currentTimeMillis();
                System.out.println(temp - current);
                current = temp;
            }

            method.invoke(null, 128);
        }
    }

    public static void main(String[] args) throws Exception {
        reflectCall();
    }
}
```

峰值性能：457.4ms，为基准耗时的4.1倍

##### 字节码
```
63: aload_1                         // 加载Method对象
64: aconst_null                     // 静态方法，反射调用的第一个参数为null
65: iconst_1
66: anewarray                       // 生成一个长度为1的Object数组
69: dup
70: iconst_0
71: sipush        128
74: invokestatic Integer.valueOf    // 将128自动装箱成Integer
77: aastore                         // 存入Object数组
78: invokevirtual Method.invoke     // 反射调用
```
反射调用前的两个动作
- Method.invoke是一个**变长参数**方法，**最后一个参数**在**字节码层面**会是**Object数组**
    - Java编译器会在方法调用处生成一个**长度为入参数量的Object数组**，并将入参一一存储进该数组
- Object数组不能存储基本类型，Java编译器会对传入的基本类型进行**自动装箱**
- 上述两个步骤会带来**性能开销**和**GC**

#### 减少装箱
1. V3的代码增加启动JVM参数：**-Djava.lang.Integer.IntegerCache.high=128**
2. 峰值性能：280.4ms，为基准耗时的2.5倍

#### 减少自动生成Object数组

##### Java代码
```java
// -XX:+PrintGC
public class V4 {
    public static void target(int i) {
    }

    public static void main(String[] args) throws Exception {
        Class<?> klass = Class.forName("me.zhongmingmao.basic.reflect.V4");
        Method method = klass.getMethod("target", int.class);

        // 在循环外构造参数数组
        Object[] arg = new Object[1];
        arg[0] = 128;

        long current = System.currentTimeMillis();
        for (int i = 1; i <= 2_000_000_000; i++) {
            if (i % 100_000_000 == 0) {
                long temp = System.currentTimeMillis();
                System.out.println(temp - current);
                current = temp;
            }

            method.invoke(null, arg);
        }
    }
}
```

```
80: aload_2                         // 加载Method对象
81: aconst_null                     // 静态方法，反射调用的第一个参数为null
82: aload_3
83: invokevirtual Method.invoke     // 反射调用，无anewarray指令
```

1. 峰值性能：312.4ms，为基准耗时的2.8倍
2. V4**不会触发GC**，因为**反射调用被内联**了
    - 即时编译器中的**逃逸分析**会**将原本新建的Object数组判定为不逃逸的对象**
    - 如果一个对象被判定为**不逃逸**，那么即时编译器会选择**栈分配**或者**虚拟分配**，**不占用堆空间**
    - 在循环外新建数组，即时编译器无法确定这个数组会不会被中途修改，从而无法优化掉访问数组的操作

#### 关闭Inflation机制
1. 关闭Inflation机制，取消委派实现，并且**直接使用动态实现**
2. 关闭权限校验：每次反射调用都会**检查目标方法的权限**

##### Java代码
```java
// -Djava.lang.Integer.IntegerCache.high=128
// -Dsun.reflect.noInflation=true
public class V5 {
    public static void target(int i) {
    }

    public static void main(String[] args) throws Exception {
        Class<?> klass = Class.forName("me.zhongmingmao.basic.reflect.V5");
        Method method = klass.getMethod("target", int.class);
        // 关闭权限检查
        method.setAccessible(true);

        long current = System.currentTimeMillis();
        for (int i = 1; i <= 2_000_000_000; i++) {
            if (i % 100_000_000 == 0) {
                long temp = System.currentTimeMillis();
                System.out.println(temp - current);
                current = temp;
            }

            method.invoke(null, 128);
        }
    }
}
```

峰值性能：186.2ms，为基准耗时的1.7倍


#### 方法内联的瓶颈
1. V5的反射调用能如此快，主要是**即时编译器中的方法内联**
2. 在关闭了Inflation机制后，方法内联的瓶颈在于Method.invoke方法中对MethodAccessor.invoke方法的调用
3. 在生成环境中，通常有多个不同的反射调用，对应多个GeneratedMethodAccessor，也就是动态实现
4. JVM关于上述调用点的类型profile无法同时记录多个类，造成所测试的**反射调用没有被内联**的情况
    - 类型profile：对于invokevirtual或invokeinterface，JVM会记录下**调用者的具体类型**

<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/basic/jvm-basic-reflect-method-invoke.png" />

##### Java代码
```java
public class V6 {
    public static void target(int i) {
    }

    public static void target1(int i) {
    }

    public static void target2(int i) {
    }

    public static void polluteProfile() throws Exception {
        // 误扰Method.invoke()的类型profile
        Method method1 = V6.class.getMethod("target1", int.class);
        Method method2 = V6.class.getMethod("target2", int.class);
        for (int i = 0; i < 2000; i++) {
            method1.invoke(null, 0);
            method2.invoke(null, 0);
        }
    }

    public static void main(String[] args) throws Exception {
        Class<?> klass = Class.forName("me.zhongmingmao.basic.reflect.V6");
        Method method = klass.getMethod("target", int.class);
        // 关闭权限检查
        method.setAccessible(true);
        polluteProfile();

        long current = System.currentTimeMillis();
        for (int i = 1; i <= 2_000_000_000; i++) {
            if (i % 100_000_000 == 0) {
                long temp = System.currentTimeMillis();
                System.out.println(temp - current);
                current = temp;
            }

            method.invoke(null, 128);
        }
    }
}
```

1. 峰值性能：1565.6ms，为基准耗时的14倍
2. 原因
    - 方法没有内联
    - 逃逸分析不再起效（解决方案：循环外构造数组，峰值性能：892.4ms，为基准耗时的8倍）
    - 每个调用能够记录的类型数目太少，默认2（-XX:TypeProfileWidth=5，峰值性能：1456.2ms，为基准耗时的13倍）



<!-- indicate-the-source -->
