---
title: Java并发 -- Guarded Suspension模式
date: 2019-05-21 08:38:05
categories:
    - Java Concurrent
tags:
    - Java Concurrent
---

## 概述
1. Guarded Suspension模式是**等待唤醒**机制的**规范实现**
2. Guarded Suspension模式也被称为Guarded Wait 模式、Spin Lock 模式

<!-- more -->

## Web版的文件浏览器
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-file-browsing-mq.png" width=800/>

1. 用户可以在浏览器里查看服务器上的目录和文件
2. 该项目依赖运维部门提供的文件浏览服务，而文件浏览服务仅支持MQ接入
3. 用户通过浏览器发送请求，会被转换成消息发送给MQ，等MQ返回结果后，再将结果返回至浏览器

```java
public class FileBrowser {
    // 发送消息
    private void send(Message message) {
    }

    // MQ消息返回后调用该方法
    public void onMessage(Message message) {
    }

    public Response handleWebReq() {
        Message message = new Message(1L, "123");
        // 发送消息
        send(message);
        // 如何等待MQ返回消息？
        return new Response();
    }
}

@AllArgsConstructor
class Message {
    private Long id;
    private String content;
}

class Response {
}
```

## Guarded Suspension模式
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-guarded-suspension.png" width=800/>

1. Guarded Suspension直译为_**保护性暂停**_
2. 通过onChange方法可以产生一个事件，而这个事件往往能改变前提条件p的计算结果

```java
public class GuardedObject<T> {
    private static final int TIMEOUT = 1;

    // 受保护对象
    private T obj;
    private final Lock lock = new ReentrantLock();
    private final Condition done = lock.newCondition();

    // 获取受保护对象
    public T get(Predicate<T> p) {
        lock.lock();
        try {
            // MESA管程推荐写法
            while (!p.test(obj)) {
                done.await(TIMEOUT, TimeUnit.SECONDS);
            }
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        } finally {
            lock.unlock();
        }
        return obj;
    }

    // 事件通知方法
    public void onChange(T obj) {
        lock.lock();
        try {
            this.obj = obj;
            done.signalAll();
        } finally {
            lock.unlock();
        }
    }
}
```

## 扩展Guarded Suspension模式
```java
public class GuardedObject<T> {
    private static final int TIMEOUT = 1;
    // 保存所有的GuardedObject
    private static final Map<Object, GuardedObject> goMap = new ConcurrentHashMap<>();

    // 受保护对象
    private T obj;
    private final Lock lock = new ReentrantLock();
    private final Condition done = lock.newCondition();

    public static <K> GuardedObject create(K key) {
        GuardedObject go = new GuardedObject();
        goMap.put(key, go);
        return go;
    }

    public static <K, T> void fireEvent(K key, T obj) {
        GuardedObject go = goMap.remove(key);
        if (go != null) {
            go.onChange(obj);
        }
    }

    // 获取受保护对象
    public T get(Predicate<T> p) {
        lock.lock();
        try {
            // MESA管程推荐写法
            while (!p.test(obj)) {
                done.await(TIMEOUT, TimeUnit.SECONDS);
            }
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        } finally {
            lock.unlock();
        }
        return obj;
    }

    // 事件通知方法
    public void onChange(T obj) {
        lock.lock();
        try {
            this.obj = obj;
            done.signalAll();
        } finally {
            lock.unlock();
        }
    }
}
```
```java
public class FileBrowser {
    // 发送消息
    private void send(Message message) {
    }

    // MQ消息返回后调用该方法
    public void onMessage(Message message) {
        // 唤醒等待的线程
        GuardedObject.fireEvent(message.getId(), message);
    }

    public Response handleWebReq() {
        Long id = 1L;
        Message message = new Message(id, "123");
        GuardedObject go = GuardedObject.create(id);
        // 发送消息
        send(message);
        // 等待MQ消息
        go.get(Objects::nonNull);
        return new Response();
    }
}

@Data
@AllArgsConstructor
class Message {
    private Long id;
    private String content;
}

class Response {
}
```

<!-- indicate-the-source -->
