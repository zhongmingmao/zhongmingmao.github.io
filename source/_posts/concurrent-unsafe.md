---
title: 并发 - Unsafe类的简单使用
date: 2016-08-05 00:06:25
categories:
    - Concurrent
tags:
    - Concurrent
---

{% note info %}
本文主要介绍`sun.misc.Unsafe`类的简单使用
代码托管在https://github.com/zhongmingmao/concurrent_demo
关于`JOL`的内容请参考「对象内存布局 - JOL使用教程 1」,本文不再赘述
{% endnote %}

<!-- more -->

# 概述
1. `sun.misc.Unsafe`类提供底层（`low-level`）的，不安全（`unsafe`）的方法
2. 提供与`并发`相关的**`CAS`**、**`park/unpark`**等操作


# 获取源码
`Oracle JDK 8`仅有`Unsafe.class`文件，`反编译的代码`是没法看到`JavaDoc`、`代码注释`和`实际方法参数名`等信息的，可以借助[OpenJDK 8](http://download.java.net/openjdk/jdk8)来解决这个问题

## 下载并打包
```
$ wget http://www.java.net/download/openjdk/jdk8/promoted/b132/openjdk-8-src-b132-03_mar_2014.zip

$ unzip openjdk-8-src-b132-03_mar_2014.zip

$ find . -name "Unsafe.java"
./openjdk/jdk/src/share/classes/sun/misc/Unsafe.java

$ cd ./openjdk/jdk/src/share/classes/

# 将sun下面的源码打包
$ zip -r sun.zip sun

# 放置在Java_HOME或任意目录
$ sudo cp sun.zip /Library/Java/JavaVirtualMachines/jdk1.8.0_121.jdk/Contents/Home/sun.zip
```
## IDEA配置
<img src="https://concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/unsafe_idea.png" width="500">

# 获取Unsafe实例

## Unsafe.getUnsafe()
```java
@CallerSensitive
public static Unsafe getUnsafe() {
   Class<?> caller = Reflection.getCallerClass();
   if (!VM.isSystemDomainLoader(caller.getClassLoader()))
       throw new SecurityException("Unsafe");
   return theUnsafe;
}
```
1. `Unsafe.getUnsafe()`方法仅提供给`Bootstrap类`加载器使用，直接调用会抛出`SecurityException`异常
2. [Stack Overflow](https://stackoverflow.com/questions/10829281/is-it-possible-to-use-java-unsafe-in-user-code)提供了两种解决方法，下面将采用`反射`的方式来实例化`sun.misc.Unsafe`类

## 反射
```java
/**
 * Unsafe工具类
 */
public class UnsafeUtil {
    /**
     * 通过反射获得sun.misc.Unsafe实例<br/>
     * see https://stackoverflow.com/questions/10829281/is-it-possible-to-use-java-unsafe-in-user-code
     */
    public static Unsafe getUnsafe() {
        try {
            // 通过反射得到theUnsafe对应的Field对象
            Field f = Unsafe.class.getDeclaredField("theUnsafe");
            f.setAccessible(true);
            // theUnsafe是static，因此传入null即可
            return (Unsafe) f.get(null);
        } catch (Exception e) {
            throw new SecurityException("Unsafe");
        }
    }

    public static void main(String[] args) {
        System.out.println(getUnsafe()); // sun.misc.Unsafe@2626b418
    }
}
```

# 内存管理

## Unsafe方法
```java
// 操作系统的内存页大小
public native int pageSize();

// 分配内存指定大小的内存
public native long allocateMemory(long bytes);
// 根据给定的内存地址address设置重新分配指定大小的内存
public native long reallocateMemory(long address, long bytes);
// 用于释放allocateMemory和reallocateMemory申请的内存
public native void freeMemory(long address);
// 将指定对象的给定offset偏移量内存块中的所有字节设置为固定值
public native void setMemory(Object o, long offset, long bytes, byte value);

// 设置给定内存地址的long值
public native void putLong(long address, long x);
// 获取指定内存地址的long值
public native long getLong(long address);
```

## 测试代码
```java
public class UnsafeMemory {
    public static void main(String[] args) {
        Unsafe unsafe = UnsafeUtil.getUnsafe();
        System.out.println(unsafe.pageSize()); // 4096

        long address = unsafe.allocateMemory(1024);
        System.out.println(address);
        unsafe.putLong(address, 1024);
        System.out.println(unsafe.getLong(address)); // 1024
        unsafe.freeMemory(address);
    }
}
```

# 对象管理

## Unsafe方法
```java
// 传入一个Class对象并创建该实例对象，但不会调用构造方法
public native Object allocateInstance(Class<?> cls) throws InstantiationException;

// 获取字段f在实例对象中的偏移量
public native long objectFieldOffset(Field f);

// 返回值就是f.getDeclaringClass()
public native Object staticFieldBase(Field f);
// 静态属性的偏移量，用于在对应的Class对象中读写静态属性
public native long staticFieldOffset(Field f);

// 获得给定对象偏移量上的int值，所谓的偏移量可以简单理解为指针指向该变量；的内存地址，
// 通过偏移量便可得到该对象的变量，进行各种操作
public native int getInt(Object o, long offset);
// 设置给定对象上偏移量的int值
public native void putInt(Object o, long offset, int x);

// 获得给定对象偏移量上的引用类型的值
public native Object getObject(Object o, long offset);
// 设置给定对象偏移量上的引用类型的值
public native void putObject(Object o, long offset, Object x););

// 设置给定对象的int值，使用volatile语义，即设置后立马更新到内存对其他线程可见
public native void putIntVolatile(Object o, long offset, int x);
// 获得给定对象的指定偏移量offset的int值，使用volatile语义，总能获取到最新的int值。
public native int getIntVolatile(Object o, long offset);

// 与putIntVolatile一样，但要求被操作字段必须有volatile修饰
public native void putOrderedInt(Object o, long offset, int x);
```

## 测试代码
```java
// JVM Args : -Djol.tryWithSudo=true
public class UnsafeObject {
    @AllArgsConstructor
    @ToString(of = {"name", "age", "location"})
    static class User {
        private String name;
        private int age;
        private static String location = "ZhongShan";
    }

    public static void main(String[] args) throws InstantiationException, NoSuchFieldException {
        Unsafe unsafe = UnsafeUtil.getUnsafe();

        //通过allocateInstance直接创建对象，但未运行任何构造函数
        User user = (User) unsafe.allocateInstance(User.class);
        System.out.println(user); // UnsafeObject.User(name=null, age=0, location=ZhongShan)

        // 通过JOL打印对象内存布局
        /*
        me.zhongmingmao.unsafe.UnsafeObject$User object internals:
         OFFSET  SIZE               TYPE DESCRIPTION                               VALUE
              0     4                    (object header)                           01 00 00 00 (00000001 00000000 00000000 00000000) (1)
              4     4                    (object header)                           00 00 00 00 (00000000 00000000 00000000 00000000) (0)
              8     4                    (object header)                           81 c1 00 f8 (10000001 11000001 00000000 11111000) (-134168191)
             12     4                int User.age                                  0
             16     4   java.lang.String User.name                                 null
             20     4                    (loss due to the next object alignment)
        Instance size: 24 bytes
        Space losses: 0 bytes internal + 4 bytes external = 4 bytes total
         */
        System.out.println(ClassLayout.parseInstance(user).toPrintable());

        // Class && Field
        Class<? extends User> userClass = user.getClass();
        Field name = userClass.getDeclaredField("name");
        Field age = userClass.getDeclaredField("age");
        Field location = userClass.getDeclaredField("location");

        // 获取实例域name和age在对象内存中的偏移量并设置值
        System.out.println(unsafe.objectFieldOffset(name)); // 16
        unsafe.putObject(user, unsafe.objectFieldOffset(name), "zhongmingmao");
        System.out.println(unsafe.objectFieldOffset(age)); // 12
        unsafe.putInt(user, unsafe.objectFieldOffset(age), 99);
        System.out.println(user); // UnsafeObject.User(name=zhongmingmao, age=99, location=ZhongShan)

        // 获取定义location字段的类
        Object staticFieldBase = unsafe.staticFieldBase(location);
        System.out.println(staticFieldBase); // class me.zhongmingmao.unsafe.UnsafeObject$User

        // 获取static变量location的偏移量
        long staticFieldOffset = unsafe.staticFieldOffset(location);
        // 获取static变量location的值
        System.out.println(unsafe.getObject(staticFieldBase, staticFieldOffset)); // ZhongShan
        // 设置static变量location的值
        unsafe.putObject(staticFieldBase, staticFieldOffset, "GuangZhou");
        System.out.println(user); // UnsafeObject.User(name=zhongmingmao, age=99, location=GuangZhou)
    }
}
```

# 数组

## Unsafe方法
```java
// 获取数组第一个元素的偏移地址
public native int arrayBaseOffset(Class<?> arrayClass);
// 数组中一个元素占据的内存空间,arrayBaseOffset与arrayIndexScale配合使用，可定位数组中每个元素在内存中的位置
public native int arrayIndexScale(Class<?> arrayClass);
```

## 测试代码
```java
// JVM Args : -Djol.tryWithSudo=true
public class UnsafeArray {
    @Data
    @AllArgsConstructor
    static class User {
        private String name;
        private int age;
    }

    public static void main(String[] args) {
        Unsafe unsafe = UnsafeUtil.getUnsafe();

        // 通过JOL打印虚拟机信息
        /*
        # Running 64-bit HotSpot VM.
        # Using compressed oop with 3-bit shift.
        # Using compressed klass with 3-bit shift.
        # Objects are 8 bytes aligned.
        # Field sizes by type: 4, 1, 1, 2, 2, 4, 4, 8, 8 [bytes]
        # Array element sizes: 4, 1, 1, 2, 2, 4, 4, 8, 8 [bytes]
         */
        System.out.println(VM.current().details());

        // 实例化User[]
        User[] users = new User[3];
        IntStream.range(0, users.length).forEach(i ->
                users[i] = new User(String.format("zhongmingmao_%s", i), i));

        // 通过JOL打印users的内存布局
        /*
        [Lme.zhongmingmao.unsafe.UnsafeArray$User; object internals:
         OFFSET  SIZE                                      TYPE DESCRIPTION                               VALUE
              0     4                                           (object header)                           01 00 00 00 (00000001 00000000 00000000 00000000) (1)
              4     4                                           (object header)                           00 00 00 00 (00000000 00000000 00000000 00000000) (0)
              8     4                                           (object header)                           24 f1 00 f8 (00100100 11110001 00000000 11111000) (-134155996)
             12     4                                           (object header)                           03 00 00 00 (00000011 00000000 00000000 00000000) (3)
             16    12   me.zhongmingmao.unsafe.UnsafeArray$User UnsafeArray$User;.<elements>              N/A
             28     4                                           (loss due to the next object alignment)
        Instance size: 32 bytes
        Space losses: 0 bytes internal + 4 bytes external = 4 bytes total
         */
        System.out.println(ClassLayout.parseInstance(users).toPrintable());

        // users[0]的偏移
        int baseOffset = unsafe.arrayBaseOffset(User[].class);
        System.out.println(baseOffset); // 16
        int indexScale = unsafe.arrayIndexScale(User[].class);
        System.out.println(indexScale); // 4

        // users[1]
        Object object = unsafe.getObject(users, baseOffset + indexScale + 0L);
        System.out.println(object); // UnsafeArray.User(name=zhongmingmao_1, age=1)
    }
}
```

# CAS

## Unsafe方法
```java
// 第一个参数o为给定对象，offset为对象内存的偏移量，通过这个偏移量迅速定位字段并设置或获取该字段的值，
// expected表示期望值，x表示要设置的值，下面3个方法都通过CAS原子指令执行操作。
public final native boolean compareAndSwapObject(Object o, long offset, Object expected, Object x);
public final native boolean compareAndSwapInt(Object o, long offset, int expected,int x);
public final native boolean compareAndSwapLong(Object o, long offset, long expected,long x);
```
```java
// 1.8新增，给定对象o，根据获取内存偏移量指向的字段，将其增加delta，
// 这是一个CAS操作过程，直到设置成功方能退出循环，返回旧值
public final int getAndAddInt(Object o, long offset, int delta) {
   int v;
   do {
       v = getIntVolatile(o, offset);
   } while (!compareAndSwapInt(o, offset, v, v + delta));
   return v;
}

// 1.8新增，方法作用同上，只不过这里操作的long类型数据
public final long getAndAddLong(Object o, long offset, long delta) {
   long v;
   do {
       v = getLongVolatile(o, offset);
   } while (!compareAndSwapLong(o, offset, v, v + delta));
   return v;
}

// 1.8新增，给定对象o，根据获取内存偏移量对于字段，将其 设置为新值newValue，
// 这是一个CAS操作过程，直到设置成功方能退出循环，返回旧值
public final int getAndSetInt(Object o, long offset, int newValue) {
   int v;
   do {
       v = getIntVolatile(o, offset);
   } while (!compareAndSwapInt(o, offset, v, newValue));
   return v;
}

// 1.8新增，同上，操作的是long类型
public final long getAndSetLong(Object o, long offset, long newValue) {
   long v;
   do {
       v = getLongVolatile(o, offset);
   } while (!compareAndSwapLong(o, offset, v, newValue));
   return v;
}

// 1.8新增，同上，操作的是引用类型数据
public final Object getAndSetObject(Object o, long offset, Object newValue) {
   Object v;
   do {
       v = getObjectVolatile(o, offset);
   } while (!compareAndSwapObject(o, offset, v, newValue));
   return v;
}
```

## 测试代码
```java
public class UnsafeCAS {

    private static final int THREAD_COUNT = 4;
    private static final long TASK_COUNT = 500 * 1000 * 1000;

    @Data
    @AllArgsConstructor
    static class Counter {
        private long count;
    }

    public static void main(String[] args) throws NoSuchFieldException, InterruptedException {
        Unsafe unsafe = UnsafeUtil.getUnsafe();
        Field count = Counter.class.getDeclaredField("count");
        long offset = unsafe.objectFieldOffset(count);
        Counter counter = new Counter(0);
        ExecutorService pool = Executors.newFixedThreadPool(THREAD_COUNT);

        IntStream.range(0, THREAD_COUNT).forEach(i ->
                pool.submit(() -> LongStream.range(0, TASK_COUNT)
                        .forEach(j -> unsafe.getAndAddInt(counter, offset, 1))));
        pool.shutdown();
        pool.awaitTermination(10, TimeUnit.MINUTES);

        // CAS实现并发安全
        System.out.println(counter.getCount()); // 2,000,000,000 = THREAD_COUNT * TASK_COUNT
    }
}
```

# park/unpark

## Unsafe方法
```java
// 线程调用该方法，线程将一直阻塞直到超时，或者是中断条件出现。
public native void park(boolean isAbsolute, long time);
// 终止挂起的线程，恢复正常.java.util.concurrent包中挂起操作都是在LockSupport类实现的，其底层正是使用这两个方法，
public native void unpark(Object thread);
```

## 测试代码
```java
public class UnsafePark {
    private static Thread mainThread;

    public static void main(String[] args) {
        Unsafe unsafe = UnsafeUtil.getUnsafe();
        mainThread = Thread.currentThread();

        System.out.println(String.format("park %s", mainThread.getName())); // park main
        unsafe.park(false, TimeUnit.SECONDS.toNanos(1));

        new Thread(() -> {
            System.out.println(String.format("%s unpark %s",
                    Thread.currentThread().getName(),
                    mainThread.getName())); // Thread-0 unpark main
            unsafe.unpark(mainThread);
        }).start();
    }
}
```

<!-- indicate-the-source -->
