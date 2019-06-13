---
title: Java并发 -- Balking模式
date: 2019-05-22 11:56:39
categories:
    - Java
    - Concurrent
tags:
    - Java
    - Java Concurrent
---

## 关于Guarded Suspension模式
可以用“多线程版本的if”来理解Guarded Suspension模式，必须等到条件为真，但很多场景需要**快速放弃**

<!-- more -->

## 自动保存
```java
public class AutoSaveEditor {
    // 文件是否被修改
    // 非线程安全，对共享变量change的读写没有使用同步
    private boolean changed = false;
    // 定时任务线程池
    private ScheduledExecutorService service = Executors.newSingleThreadScheduledExecutor();

    @PostConstruct
    public void startAutoSave() {
        service.scheduleWithFixedDelay(() -> autoSave(), 5, 5, TimeUnit.SECONDS);
    }

    // 编辑操作
    public void edit() {
        changed = true;
    }

    // 自动保存
    private void autoSave() {
        // 没有修改，快速放弃
        if (!changed) {
            return;
        }
        changed = false;
        save();
    }

    private void save() {
    }
}
```

## synchronized
```java
// 编辑操作
public void edit() {
    synchronized (this) {
        changed = true;
    }
}

// 自动保存
private void autoSave() {
    synchronized (this) {
        // 没有修改，快速放弃
        if (!changed) {
            return;
        }
        changed = false;
    }
    save();
}
```
1. 共享变量changed是一个状态变量，业务逻辑依赖于这个状态变量的状态，本质上是if
2. 在多线程领域，就是一种“多线程版本的if”，总结成一种设计模式，就是_**Balking模式**_

## Balking模式
Balking模式本质上是一种**规范化**地解决“多线程版本的if”的方案
```java
// 编辑操作
public void edit() {
    // 仅仅将对共享变量changed的赋值操作抽取到change()
    // 将并发处理逻辑和业务逻辑分开
    change();
}

// 改变状态
private void change() {
    synchronized (this) {
        changed = true;
    }
}

// 自动保存
private void autoSave() {
    synchronized (this) {
        // 没有修改，快速放弃
        if (!changed) {
            return;
        }
        changed = false;
    }
    save();
}
```

## volatile + Balking模式
1. 上面用synchronized实现Balking模式的方式最为**稳妥**，建议在实际工作中采用
2. 如果**对原子性没有要求**，可以使用volatile（仅能保证**可见性**）来实现Balking模式

```java
// 能够用volatile实现Balking模式，是因为changed和rt的写操作不存在原子性要求
public class RouterTable {
    // <Key, Value> = <接口名，路由集合>
    private Map<String, CopyOnWriteArraySet<Router>> rt = new ConcurrentHashMap<>();
    // 路由表是否发生变化
    private volatile boolean changed;
    // 将路由表写入本地文件的线程池
    private ScheduledExecutorService service = Executors.newSingleThreadScheduledExecutor();

    @PostConstruct
    public void startLocalSaver() {
        service.scheduleWithFixedDelay(this::autoSave, 1, 1, TimeUnit.MINUTES);
    }

    // 保存路由表到本地文件
    private void autoSave() {
        // 没有修改，快速放弃
        if (!changed) {
            return;
        }
        changed = false;
        save2Local();
    }

    private void save2Local() {
    }

    // 增加路由
    public void add(Router router) {
        CopyOnWriteArraySet<Router> routers = rt.computeIfAbsent(router.getIFace(), iFace -> new CopyOnWriteArraySet<>());
        routers.add(router);
        changed = true;
    }

    // 删除路由
    public void remove(Router router) {
        Set<Router> routers = rt.get(router.getIFace());
        if (routers != null) {
            routers.remove(router);
            // 路由表发生变化
            changed = true;
        }
    }
}
```

## 单次初始化
Balking模式有一个非常典型的应用场景就是**单次初始化**
```java
public class SingleInit {
    private boolean inited = false;

    public synchronized void init() {
        if (inited) {
            return;
        }
        doInit();
        inited = true;
    }

    private void doInit() {
    }
}
```

### 单例模式
线程安全的单例模式本质上也是单次初始化，可以用Balking模式实现线程安全的单例模式
```java
public class Singleton {
    private static Singleton singleton;

    // 私有构造函数
    private Singleton() {
    }

    // 获取实例（单例），性能很差
    public synchronized static Singleton getInstance() {
        if (singleton == null) {
            singleton = new Singleton();
        }
        return singleton;
    }
}
```

### 双重检查
```java
public class Singleton {
    // volatile保证可见性
    private static volatile Singleton singleton;

    // 私有构造函数
    private Singleton() {
    }

    // 获取实例（单例）
    public static Singleton getInstance() {
        // 第一次检查
        if (singleton == null) {
            synchronized (Singleton.class) {
                // 第二次检查
                if (singleton == null) {
                    singleton = new Singleton();
                }
            }
        }
        return singleton;
    }
}
```

## Guarded Suspension + Balking
1. Balking模式只需要**互斥锁**就能实现，而Guarded Suspension模式则需要用到**管程**（高级并发原语）
2. 从应用角度来看，两者都是为了解决“线程安全的if”
    - _**Guarded Suspension模式会等待if条件为真（利用管程模型来实现），而Balking模式不会等待**_

<!-- indicate-the-source -->
