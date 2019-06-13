---
title: Java并发 -- Copy-on-Write模式
date: 2019-05-19 12:26:03
categories:
    - Java Concurrent
tags:
    - Java Concurrent
---

## fork
1. 类Unix操作系统调用fork()，会创建父进程的一个**完整副本**，很**耗时**
2. Linux调用fork()，创建子进程时并不会复制整个进程的地址空间，而是让父子进程共享同一个地址空间
    - 只有在父进程或者子进程需要写入时才会**复制**地址空间，从而使父子进程拥有各自**独立**的地址空间
3. 本质上来说，父子进程的地址空间和数据都是要隔离的，使用Copy-on-Write更多体现的是一种**延时策略**
4. Copy-on-Write还支持**按需复制**，因此在操作系统领域能够**提升性能**
5. Java提供的Copy-on-Write容器，会复制**整个容器**，所以在**提升读操作性能**的同时，是以**内存复制**为代价的
    - CopyOnWriteArrayList / CopyOnWriteArraySet

<!-- more -->

## RPC框架
<img src="https://java-concurrent-1253868755.cos.ap-guangzhou.myqcloud.com/java-concurrent-copy-on-write-route-table.png" width=500/>

1. 服务提供方是**多实例分布式**部署的，服务的客户端在调用RPC时，会选定一个服务实例来调用
2. 这个过程的本质是**负载均衡**，而做负载均衡的前提是客户端要有**全部的路由信息**
3. 一个核心任务就是**维护服务的路由关系**，当服务提供方上线或者下线的时候，需要更新客户端的路由表信息
4. RPC调用需要通过负载均衡器来计算目标服务的IP和端口号，负载均衡器通过路由表获取所有路由信息
    - 访问路由表这个操作对**性能**的要求很高，但路由表对**数据一致性**要求不高

```java
// 采用Immutability模式，每次上线、下线都创建新的Router对象或删除对应的Router对象
@Data
@AllArgsConstructor
public class Router {
    private final String ip;
    private final Integer port;
    private final String iFace;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Router router = (Router) o;
        return Objects.equals(ip, router.ip) &&
                Objects.equals(port, router.port) &&
                Objects.equals(iFace, router.iFace);
    }

    @Override
    public int hashCode() {
        return Objects.hash(ip, port, iFace);
    }
}

class RouterTable {
    // <接口名 , 路由集合>
    private ConcurrentHashMap<String, CopyOnWriteArraySet<Router>> routingTable = new ConcurrentHashMap<>();

    // 获取路由
    public Set<Router> get(String iFace) {
        return routingTable.get(iFace);
    }

    // 增加路由
    public void add(Router router) {
        CopyOnWriteArraySet<Router> set = routingTable.computeIfAbsent(router.getIFace(),
                iFace -> new CopyOnWriteArraySet<>());
        set.add(router);
    }

    // 删除路由
    public void remove(Router router) {
        CopyOnWriteArraySet<Router> set = routingTable.get(router.getIFace());
        if (set != null) {
            set.remove(router);
        }
    }
}
```


<!-- indicate-the-source -->
