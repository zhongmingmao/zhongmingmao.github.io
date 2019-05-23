---
title: Java并发 -- ThreadLocal模式
date: 2019-05-20 09:44:23
categories:
    - Java Concurrent
tags:
    - Java Concurrent
---

## 并发问题
1. 多个线程同时读写同一个共享变量会存在并发问题
2. Immutability模式和Copy-on-Write模式，突破的是**写**
3. ThreadLocal模式，突破的是**共享变量**

<!-- more -->

## ThreadLocal的使用

### 线程ID
```java
public class ThreadLocalId {
    private static final AtomicLong nextId = new AtomicLong(0);
    private static final ThreadLocal<Long> TL = ThreadLocal.withInitial(
            () -> nextId.getAndIncrement());

    // 为每个线程分配一个唯一的ID
    private static long get() {
        return TL.get();
    }
}
```

### SimpleDateFormat
```java
public class SafeDateFormat {
    private static final ThreadLocal<DateFormat> TL = ThreadLocal.withInitial(
            () -> new SimpleDateFormat("yyyy-MM-dd HH:mm:ss"));

    private static DateFormat get() {
        return TL.get();
    }
}
```

## ThreadLocal的工作原理
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-thread-local.png" width=800/>
```java
public class Thread implements Runnable {
    // 线程内部持有ThreadLocalMap
    ThreadLocal.ThreadLocalMap threadLocals = null;
}

public class ThreadLocal<T> {
    public T get() {
        // 获取当前线程持有的ThreadLocalMap
        Thread t = Thread.currentThread();
        ThreadLocalMap map = getMap(t);
        if (map != null) {
            // 在ThreadLocalMap中查找变量
            ThreadLocalMap.Entry e = map.getEntry(this);
            if (e != null) {
                @SuppressWarnings("unchecked")
                T result = (T)e.value;
                return result;
            }
        }
        return setInitialValue();
    }

    ThreadLocalMap getMap(Thread t) {
        return t.threadLocals;
    }

    static class ThreadLocalMap {
        // 内部是数组而不是Map
        private Entry[] table;
        // 根据ThreadLocal查找Entry
        private Entry getEntry(ThreadLocal<?> key) {
        }

        static class Entry extends WeakReference<ThreadLocal<?>> {
            Object value;
        }
    }
}
```
1. ThreadLocal仅仅是一个代理工具类，内部并不持有任何与线程相关的数据（存储在Thread里面）
2. 不容易产生**内存泄露**，Thread持有ThreadLocalMap，而ThreadLocalMap对ThreadLocal的引用是**弱引用**
    - 只要Thread被回收，那么ThreadLocalMap就能被回收
3. 在**线程池**中使用ThreadLocal也有可能会导致内存泄露
    - 因为线程池中线程的存活时间太长了，往往与程序同生共死
    - 意味着Thread持有的ThreadLocalMap一直都不会被回收
    - 可以通过try/finally手动释放

```java
private static final ExecutorService pool = Executors.newFixedThreadPool(1);
private static final ThreadLocal<Object> TL = ThreadLocal.withInitial(() -> new Object());

public static void main(String[] args) {

    pool.execute(() -> {
        try {
            TL.set(new Object());
        } finally {
            // 手动清理ThreadLocal
            TL.remove();
        }
    });
}
```

## InheritableThreadLocal
1. 通过ThreadLocal创建的线程变量，其子线程是无法继承的，如果需要继承，则采用InheritableThreadLocal
2. 不建议在线程池中使用InheritableThreadLocal
    - 一方面，InheritableThreadLocal具有和ThreadLocal相同的缺点，可能会导致内存泄露
    - 另一方面，线程池中的线程创建是动态的，容易导致**继承关系错乱**
        - 如果业务逻辑依赖InheritableThreadLocal，有可能导致业务逻辑计算错误，比内存泄露更致命

<!-- indicate-the-source -->
