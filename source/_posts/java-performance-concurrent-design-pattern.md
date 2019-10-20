---
title: Java性能 -- 并发设计模式
mathjax: false
date: 2019-09-21 11:48:34
categories:
    - Java
    - Performance
tags:
    - Java
    - Java Performance
    - Design Pattern
---

## 线程上下文模式
1. 线程上下文指的是**贯穿线程整个生命周期**的对象中的一些**全局**信息，如Spring中的**ApplicationContext**
2. 可以使用`ThreadLocal`实现上下文
    - ThreadLocal是**线程本地变量**，可以实现**多线程的数据隔离**，每个线程只能访问各自内部的副本变量

<!-- more -->

## Thread-Per-Message模式
1. **一个消息一个线程**
    - 在Socket通信中，一个线程监听IO事件，每当监听到一个IO事件，就交给另一个处理线程执行IO操作
2. 如果遇到高并发，就会出现**严重的性能问题**，因为线程在操作系统中也是昂贵的资源，不能无限制地创建
    - 如果针对每个IO请求都创建一个线程来处理，在有大量请求同时进来时，就会创建大量线程
    - 每次请求都需要**创建**和**销毁**线程，性能开销很大
3. 可以使用**线程池**来代替线程的创建和销毁

### ServerHandler
```java
@AllArgsConstructor
public class ServerHandler implements Runnable {
    private Socket socket;

    @Override
    public void run() {
        BufferedReader in = null;
        PrintWriter out = null;
        String msg;
        try {
            in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            out = new PrintWriter(socket.getOutputStream(), true);
            while ((msg = in.readLine()) != null && msg.length() != 0) {
                System.out.println("server received : " + msg);
                out.print("received~\n");
                out.flush();
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            try {
                in.close();
            } catch (IOException e) {
                e.printStackTrace();
            }
            try {
                out.close();
            } catch (Exception e) {
                e.printStackTrace();
            }
            try {
                socket.close();
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }
}
```

### Server
```java
public class Server {
    private static final int DEFAULT_PORT = 12345;
    private static ServerSocket server;

    public static void start() throws IOException {
        start(DEFAULT_PORT);
    }

    public static void start(int port) throws IOException {
        if (server != null) {
            return;
        }

        try {
            server = new ServerSocket(port);
            while (true) {
                Socket socket = server.accept();
                new Thread(new ServerHandler(socket)).start();
            }
        } finally {
            if (server != null) {
                server.close();
            }
        }
    }

    public static void main(String[] args) {
        new Thread(() -> {
            try {
                Server.start();
            } catch (IOException e) {
                e.printStackTrace();
            }
        }).start();
    }
}
```

## Worker-Thread模式
1. Worker是**工人**的意思，代表在Worker-Thread模式中，会有一些工人不断轮流处理过来的工作
    - 当没有工作时，工人会处于**等待**状态，直到有新的工作进来
    - 除了**工人**角色，Worker-Thread模式还包括了**流水线**和**产品**
2. 相比于Thread-Per-Message模式
    - 可以减少频繁创建、销毁线程所带来的性能开销
    - 也能避免无限制创建线程所带来的内存溢出风险

### Package
```java
@Data
public class Package {
    private String name;
    private String address;

    public void execute() {
        System.out.println(Thread.currentThread().getName() + " executed " + this);
    }
}
```

### Worker
```java
public class Worker extends Thread {
    private static final Random RANDOM = new Random(System.currentTimeMillis());
    private final PackageChannel channel;

    public Worker(String name, PackageChannel channel) {
        super(name);
        this.channel = channel;
    }

    @Override
    public void run() {
        while (true) {
            channel.take().execute();
            try {
                Thread.sleep(RANDOM.nextInt(1000));
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }
}
```

### PackageChannel
```java
public class PackageChannel {
    private final static int MAX_PACKAGE_NUM = 100;

    private final Package[] packageQueue;
    private final Worker[] workerPool;
    private int head;
    private int tail;
    private int count;

    public PackageChannel(int workers) {
        this.packageQueue = new Package[MAX_PACKAGE_NUM];
        this.head = 0;
        this.tail = 0;
        this.count = 0;
        this.workerPool = new Worker[workers];
        this.init();
    }

    private void init() {
        for (int i = 0; i < workerPool.length; i++) {
            workerPool[i] = new Worker("Worker-" + i, this);
        }
    }

    /**
     * push switch to start all of worker to work
     */
    public void startWorker() {
        Arrays.asList(workerPool).forEach(Worker::start);
    }

    public synchronized void put(Package packageReq) {
        while (count >= packageQueue.length) {
            try {
                this.wait();
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
        this.packageQueue[tail] = packageReq;
        this.tail = (tail + 1) % packageQueue.length;
        this.count++;
        this.notifyAll();
    }

    public synchronized Package take() {
        while (count <= 0) {
            try {
                this.wait();
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
        Package request = this.packageQueue[head];
        this.head = (this.head + 1) % this.packageQueue.length;
        this.count--;
        this.notifyAll();
        return request;
    }
}
```

### Test
```java
public class Test {
    public static void main(String[] args) {
        // 新建8个工人
        final PackageChannel channel = new PackageChannel(8);
        // 开始工作
        channel.startWorker();
        // 为流水线添加包裹
        for (int i = 0; i < 100; i++) {
            Package packageReq = new Package();
            packageReq.setAddress("test");
            packageReq.setName("test");
            channel.put(packageReq);
        }
    }
}
```