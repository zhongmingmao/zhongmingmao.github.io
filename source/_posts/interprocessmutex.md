---
title: 分布式互斥锁InterProcessMutex代码剖析
date: 2017-07-14 00:06:25
categories:
    - 网易这两年
    - Zookeeper
tags:
    - 网易这两年
    - Zookeeper
    - 分布式锁
---

{% note info %}
`Curator`是一个`ZooKeeper`客户端框架，其中封装了`分布式锁`的实现，最为常用的是`InterProcessMutex`，本文将对其进行代码剖析
{% endnote %}

<!-- more -->

# 简介
`InterProcessMutex`基于`Zookeeper`实现了**`分布式的公平可重入互斥锁`**，类似于单个JVM进程内d`ReentrantLock(fair=true)`

# 构造过程
```Java
// 最常用
public InterProcessMutex(CuratorFramework client, String path){
    this(client, path, new StandardLockInternalsDriver());
}

public InterProcessMutex(CuratorFramework client, String path, LockInternalsDriver driver){
    // maxLeases=1，表示可以获得锁的线程数量（跨JVM）
    this(client, path, LOCK_NAME, 1, driver);
}

InterProcessMutex(CuratorFramework client, String path, String lockName, int maxLeases, LockInternalsDriver driver){
    basePath = PathUtils.validatePath(path);
    // LockInternals是申请锁与释放锁的核心实现
    internals = new LockInternals(client, driver, path, lockName, maxLeases);
}
```

# 获取锁

## InterProcessMutex.acquire
```Java
// 无限等待
public void acquire() throws Exception{
    if ( !internalLock(-1, null) ){
        throw new IOException("Lost connection while trying to acquire lock: " + basePath);
    }
}

// 限时等待
public boolean acquire(long time, TimeUnit unit) throws Exception{
    return internalLock(time, unit);
}
```

## InterProcessMutex.internalLock
```Java
private boolean internalLock(long time, TimeUnit unit) throws Exception{
    Thread currentThread = Thread.currentThread();
    LockData lockData = threadData.get(currentThread);
    if ( lockData != null ){
        // 实现可重入
        // 同一线程再次acquire，首先判断当前的映射表内（threadData）是否有锁信息，有则原子+1，然后返回
        lockData.lockCount.incrementAndGet();
        return true;
    }
    
    // 映射表内没有对应的锁信息，尝试通过LockInternals获取锁
    String lockPath = internals.attemptLock(time, unit, getLockNodeBytes());
    if ( lockPath != null ){
        // 成功获取锁，记录信息到映射表，以实现锁的可重入
        LockData newLockData = new LockData(currentThread, lockPath);
        threadData.put(currentThread, newLockData);
        return true;
    }
    return false;
}
```
```Java
// 映射表
// 记录线程与锁信息的映射关系
private final ConcurrentMap<Thread, LockData> threadData = Maps.newConcurrentMap();
```
```Java
// 锁信息
// Zookeeper中一个临时顺序节点对应一个“锁”，但让锁生效激活需要排队，下面会继续分析
private static class LockData{
    final Thread owningThread;
    final String lockPath;
    final AtomicInteger lockCount = new AtomicInteger(1);
    
    private LockData(Thread owningThread, String lockPath){
        this.owningThread = owningThread;
        this.lockPath = lockPath;
    }
}
```

## LockInternals.attemptLock
```Java
String attemptLock(long time, TimeUnit unit, byte[] lockNodeBytes) throws Exception{
    final long      startMillis = System.currentTimeMillis();
    // 无限等待时，millisToWait为null
    final Long      millisToWait = (unit != null) ? unit.toMillis(time) : null;
    // 创建ZNode节点时的数据内容，无关紧要，这里为null，采用默认值（IP地址）
    final byte[]    localLockNodeBytes = (revocable.get() != null) ? new byte[0] : lockNodeBytes;
    // 当前已经重试次数，与CuratorFramework的重试策略有关
    int             retryCount = 0;
    // 在Zookeeper中创建的临时顺序节点的路径，相当于一把待激活的锁（激活条件：同级目录子节点，名称排序最小，后续继续分析）
    String          ourPath = null;
    // 是否已经持有锁
    boolean         hasTheLock = false;
    // 是否已经完成尝试获取锁的操作
    boolean         isDone = false;
    while ( !isDone ){
        isDone = true;
        try{
            // 从InterProcessMutex的构造函数可知实际driver为StandardLockInternalsDriver的实例
            // 在Zookeeper中创建临时顺序节点
            ourPath = driver.createsTheLock(client, path, localLockNodeBytes);
            // 循环等待来激活锁，实现锁的公平性，后续继续分析
            hasTheLock = internalLockLoop(startMillis, millisToWait, ourPath);
        } catch ( KeeperException.NoNodeException e ) {
            // 容错处理，不影响主逻辑的理解，可跳过
            // 因为会话过期等原因，StandardLockInternalsDriver因为无法找到创建的临时顺序节点而抛出NoNodeException异常
            if ( client.getZookeeperClient().getRetryPolicy().allowRetry(retryCount++,
                    System.currentTimeMillis() - startMillis, RetryLoop.getDefaultRetrySleeper()) ){
                // 满足重试策略尝试重新获取锁
                isDone = false;
            } else {
                // 不满足重试策略则继续抛出NoNodeException
                throw e;
            }
        }
    }
    if ( hasTheLock ){
        // 成功获得锁，返回临时顺序节点，上层将其封装成锁信息记录在映射表，方便锁重入
        return ourPath;
    }
    // 获取锁失败，返回null
    return null;
}
```
```Java
// Class:StandardLockInternalsDriver
public String createsTheLock(CuratorFramework client, String path, byte[] lockNodeBytes) throws Exception{
    String ourPath;
    // lockNodeBytes不为null则作为数据节点内容，否则采用默认内容（IP地址）
    if ( lockNodeBytes != null ){
        // 下面对CuratorFramework的一些细节做解释，不影响锁主逻辑的解释，可跳过
        // creatingParentContainersIfNeeded：用于创建父节点，如果不支持CreateMode.CONTAINER
        // 那么将采用CreateMode.PERSISTENT
        // withProtection：临时子节点会添加GUID前缀
        ourPath = client.create().creatingParentContainersIfNeeded()
            // CreateMode.EPHEMERAL_SEQUENTIAL：临时顺序节点，Zookeeper能保证在节点产生的顺序性
            // 依据顺序来激活锁，从而也实现了锁的公平性，后续继续分析
            .withProtection().withMode(CreateMode.EPHEMERAL_SEQUENTIAL).forPath(path, lockNodeBytes);
    } else {
        ourPath = client.create().creatingParentContainersIfNeeded()
            .withProtection().withMode(CreateMode.EPHEMERAL_SEQUENTIAL).forPath(path);
    }
    return ourPath;
}
```

## LockInternals.internalLockLoop
```Java
private boolean internalLockLoop(long startMillis, Long millisToWait, String ourPath) throws Exception {
    // 是否已经持有锁
    boolean haveTheLock = false;
    // 是否需要删除子节点
    boolean doDelete = false;
    try {
        if (revocable.get() != null) {
            client.getData().usingWatcher(revocableWatcher).forPath(ourPath);
        }
        
        while ((client.getState() == CuratorFrameworkState.STARTED) && !haveTheLock) {
            // 获取排序后的子节点列表
            List<String> children = getSortedChildren();
            // 获取前面自己创建的临时子节点名称
            String sequenceNodeName = ourPath.substring(basePath.length() + 1); // +1 to include the slash
            // 实现锁的公平性的核心逻辑，看下面的分析
            PredicateResults predicateResults = driver.getsTheLock(client,
                                                        children,sequenceNodeName,maxLeases);
            if (predicateResults.getsTheLock()) {
                // 获得了锁，中断循环，继续返回上层
                haveTheLock = true;
            } else {
                // 没有获得到锁，监听上一临时顺序节点
                String previousSequencePath = basePath + "/" + predicateResults.getPathToWatch();
                synchronized (this) {
                    try {
                        // 源代码注释，可跳过
                        // 使用getData()代替exists()来避免因留下不需要的监听器（Watcher）
                        // 一种导致资源泄漏（resource leak）
                        client.getData().usingWatcher(watcher).forPath(previousSequencePath);
                        if (millisToWait != null) {
                            millisToWait -= (System.currentTimeMillis() - startMillis);
                            startMillis = System.currentTimeMillis();
                            if (millisToWait <= 0) {
                                doDelete = true; // 获取锁超时，标记删除之前创建的临时顺序节点
                                break;
                            }
                            wait(millisToWait); // 等待被唤醒，限时等待
                        } else {
                            wait(); // 等待被唤醒，无限等待
                        }
                    } catch (KeeperException.NoNodeException e) {
                    // 容错处理，逻辑稍微有点绕，可跳过，不影响主逻辑的理解
                    // client.getData()可能调用时抛出NoNodeException，原因可能是锁被释放或会话过期（连接丢失）等
                    // 这里并没有做任何处理，因为外层是while循环，再次执行driver.getsTheLock时会调用validateOurIndex
                    // 此时会抛出NoNodeException，从而进入下面的catch和finally逻辑，重新抛出上层尝试重试获取锁并删除临时顺序节点
                    }
                }
            }
        }
    } catch (Exception e) {
        ThreadUtils.checkInterrupted(e);
        // 标记删除，在finally删除之前创建的临时顺序节点（后台不断尝试）
        doDelete = true;
        // 重新抛出，尝试重新获取锁
        throw e;
    } finally {
        if (doDelete) {
            deleteOurPath(ourPath);
        }
    }
    return haveTheLock;
}
```
```Java
// Class:StandardLockInternalsDriver
public PredicateResults getsTheLock(CuratorFramework client, List<String> children, String sequenceNodeName, int maxLeases) throws Exception{
// 之前创建的临时顺序节点在排序后的子节点列表中的索引
int             ourIndex = children.indexOf(sequenceNodeName);
// 校验之前创建的临时顺序节点是否有效
validateOurIndex(sequenceNodeName, ourIndex);
// 锁公平性的核心逻辑
// 由InterProcessMutex的构造函数可知，maxLeases为1，即ourIndex为0，才能持有锁，或者说该线程创建的临时顺序节点激活了锁
// Zookeeper的临时顺序节点特性能保证跨多个JVM的线程并发创建节点时的顺序性，越早创建临时顺序节点成功的线程会更早地激活锁或获得锁
boolean         getsTheLock = ourIndex < maxLeases;
// 如果已经获得了锁，则无需监听任何节点，否则需要监听上一顺序节点（ourIndex-1）
// 因为锁是公平的，因此无需监听除了（ourIndex-1）以外的所有节点，非常巧妙的设计
String          pathToWatch = getsTheLock ? null : children.get(ourIndex - maxLeases);
// 返回获取锁的结果，交由上层继续处理（添加监听等操作）
return new PredicateResults(pathToWatch, getsTheLock);
}

static void validateOurIndex(String sequenceNodeName, int ourIndex) throws KeeperException{
    if ( ourIndex < 0 ){
        // 容错处理，可跳过
        // 由于会话过期或连接丢失等原因，该线程创建的临时顺序节点被Zookeeper服务端删除，往外抛出NoNodeException
        // 如果在重试策略允许范围内，则进行重新尝试获取锁，这会重新重新生成临时顺序节点
        // 佩服Curator的作者将边界条件考虑得如此周到！
        throw new KeeperException.NoNodeException("Sequential path not found: " + sequenceNodeName);
    }
}
```
```Java
// Class:LockInternals
private final Watcher watcher = new Watcher(){
    @Override
    public void process(WatchedEvent event){
        notifyFromWatcher();
    }
};
private synchronized void notifyFromWatcher(){
   notifyAll(); // 唤醒所有等待LockInternals实例的线程
}
```
```Java
// Class:LockInternals
private void deleteOurPath(String ourPath) throws Exception{
    try{
        // 后台不断尝试删除
        client.delete().guaranteed().forPath(ourPath);
    } catch ( KeeperException.NoNodeException e ) {
        // 已经删除(可能会话过期导致)，不做处理
        // 实际使用Curator-2.12.0时，并不会抛出该异常
    }
}
```

# 释放锁
弄明白了获取锁的原理，释放锁的逻辑就很清晰了

## InterProcessMutex.release
```Java
public void release() throws Exception{
    Thread currentThread = Thread.currentThread();
    LockData lockData = threadData.get(currentThread);
    if ( lockData == null ){
        // 无法从映射表中获取锁信息，不持有锁
        throw new IllegalMonitorStateException("You do not own the lock: " + basePath);
    }
    
    int newLockCount = lockData.lockCount.decrementAndGet();
    if ( newLockCount > 0 ){
        // 锁是可重入的，初始值为1，原子-1到0，锁才释放
        return;
    }
    if ( newLockCount < 0 ){
        // 理论上无法执行该路径
        throw new IllegalMonitorStateException("Lock count has gone negative for lock: " + basePath);
    }
    try{
        // lockData != null && newLockCount == 0，释放锁资源
        internals.releaseLock(lockData.lockPath);
    } finally {
        // 最后从映射表中移除当前线程的锁信息
        threadData.remove(currentThread);
    }
}
```

## LockInternals.releaseLock
```Java
void releaseLock(String lockPath) throws Exception{
   revocable.set(null);
   // 删除临时顺序节点，只会触发后一顺序节点去获取锁，理论上不存在竞争，只排队，非抢占，公平锁，先到先得
   deleteOurPath(lockPath);
}
```
```Java
// Class:LockInternals
private void deleteOurPath(String ourPath) throws Exception{
    try{
        // 后台不断尝试删除
        client.delete().guaranteed().forPath(ourPath);
    } catch ( KeeperException.NoNodeException e ) {
        // 已经删除(可能会话过期导致)，不做处理
        // 实际使用Curator-2.12.0时，并不会抛出该异常
    }
}
```

# 总结

`InterProcessMutex`的特性

1. 分布式锁（基于`Zookeeper`）
2. 互斥锁
3. 公平锁（监听上一临时顺序节点 + `wait() / notifyAll()`）
4. 可重入 

<!-- indicate-the-source -->


