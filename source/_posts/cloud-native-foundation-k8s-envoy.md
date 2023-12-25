---
title: Kubernetes - Envoy
mathjax: false
date: 2023-01-30 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/go-envoy.jpeg
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
---

# Kubernetes

> Kubernetes 主要基于 `Kernel` 技术栈，缺少`精细化`的高级流量治理

1. Kubernetes 已有的流量治理能力：Service + Ingress
2. Service 在 L4，基于 Kernel 技术栈，无法实现精细化的高级流量管理
3. Ingress 在 L7，主要针对入站流量

<!-- more -->

# 架构演进

## 单体

![image-20231224195440988](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231224195440988.png)

> 访问服务

<img src="https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231224200011254.png" alt="image-20231224200011254" style="zoom:50%;" />

## 微服务

![image-20231224195758269](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231224195758269.png)

> 业务代码一般会集成统一的 SDK，耦合了很多平台侧的能力

![image-20231224201102775](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231224201102775.png)

# Service Mesh

## Sidecar

> Service Instance 与 Sidecar Proxy 在同一个 `Network Namespace`，相当于一个 loopback，可以明文传输

![image-20231224202001305](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231224202001305.png)

## 能力下沉

> 通过 `Sidecar` 来实现`微服务治理`，业务部门更聚焦于业务逻辑

![image-20231224202615772](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231224202615772.png)

![service-mesh](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/service-mesh.png)

# Istio

## 特性

1. `HTTP`、`gRPC`、`WebSocket`、`TCP` 的自动负载均衡
2. 通过丰富的`路由规则`实现`重试`、`故障转移`、`故障注入`，可以对流量行为进行`细粒度控制`
3. `可插入`的`策略层`和`配置 API`，支持访问控制、速率限制和配额
4. 对出入集群`入口`和`出口`中的所有流量的自动度量指标、日志记录和跟踪
5. 通过强大的`基于身份`的验证和授权，在集群中实现`安全`的服务间通信

## 功能

> 一套模型统一：入站流量 + 东西向流量 + 出站流量

![image-20231224211155795](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231224211155795.png)

> Istio 同时支持 Kubernetes 的 `Ingress` 和 `Service API`
> 如果将 `IngressClass` 设置为 Istio，则 Istio 将充当 `Ingress Controller` 的角色

### 流量

1. 连接
   - 通过简单的规则配置和流量路由，可以控制服务之间的流量和 API 调用
   - 简化了`断路器`、`超时`、`重试`等服务级别属性的配置
   - 可以轻松设置 A/B 测试、金丝雀部署、基于百分比的流量分割等任务
2. 控制
   - 通过更好地了解流量和`开箱即用`的`故障恢复`功能，可以在问题出现之前先发现问题，使调用更可靠
   - 如支持`熔断`和`降级`

### 安全

1. Istio 提供`底层`安全通信信道，并大规模管理服务通信的`认证`、`授权`和`加密`
2. 在 Istio 中，服务通信在默认情况下都是安全的，允许`跨多种协议和运行时`实施`一致的安全策略`
3. Istio 与 `Kubernetes 网络策略`结合，在`网络层`和`应用层`保护 `Pod 间`或者`服务间`的通信
   - `Kubernetes 网络策略`在 `L4`，基于 Kernel 技术栈
   - `Istio` 在 `L7`，实现更精细的流量控制

### 可观测性

> 监控服务的 `SLO`（Service Level Objective）

1. `Metrics`
   - Istio 基于`延迟`、`流量`、`错误`、`饱和`生成一系列的服务指标
   - Istio 为`网格控制平面`提供更详细的指标，以及基于这些指标的仪表盘
2. `Traces`
   - 为每个服务生成分布式追踪 `Span`
3. `Logs`
   - 当流量进入网格中的服务时，Istio 可以生成每个请求的完整记录

## 架构

> 因`过度设计`而导致运维（`问题排查` + `版本升级`）负担重，从微服务架构`回归`单体架构

![image-20231224214123941](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231224214123941.png)

| Plane         | Desc                                                         |
| ------------- | ------------------------------------------------------------ |
| Data plane    | 由一组以 `Sidecar` 方式部署的`代理`组成<br />代理可以调节和控制`微服务之间`以及`微服务与 Mixer 之间`所有的网络通信 |
| Control plane | 配置`代理`来`路由流量`<br />配置 `Mixer` 来`实施策略`和`收集遥测数据` |

1. Istio 的数据面为 Envoy
2. Istio 监听 API Server，主要关注 Kubernetes Service Endpoint 和 Istio CRD
   - 将配置信息（`Istio CRD`）和状态信息（`Kubernetes Service Endpoint`）整合成 Envoy 配置
   - 然后`下发`给 Envoy
3. Envoy 是类似于 Nginx 的`反向代理`
   - 加载配置文件后，监听在某个端口，接收并转发请求

## 设计目标

> 最大化透明度

1. Istio 将自身`自动注入`到服务间`所有`的网络路径中
2. Istio 使用 `Sidecar` 来`捕获流量`，并且尽可能地`自动编程网络层`来路由流量，对应用`无侵入`
3. 在 Kubernetes 中，`代理`被注入到 `Pod` 中，通过编写 `iptables` 来捕获流量
4. 所有组件和 API 在设计时必须考虑`性能`和`规模`

> 增量

1. 只推送`增量策略`
2. 预计最大的需求为`扩展策略系统`
   - `集成`其它策略和控制来源
   - 将网格行为信息`传播`到其它系统进行分析
3. `策略运行时`支持`标准扩展机制`以便`插入`到其它服务中

> 可移植性

1. 基于 Istio 的服务的移植成本很低
2. 使用 Istio 将同一个服务同时部署到多个环境中

> 策略一致性

1. 通过一套模型`统一`所有流量
2. `策略系统`作为`独立服务`，具有自身的 API，并非将其放到 Sidecar 中

# Envoy

## L7 Proxy

> 计算选型：能力 -> 性能 -> 稳定性

|                     | Envoy                                                        | Nginx                                                        | HA Proxy                         |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | -------------------------------- |
| HTTP/2              | `完整支持` HTTP/2<br />同时支持 upstream 和 downstream HTTP/2 | 从 1.9.5 开始有限支持 HTTP/2<br />支持 upstream HTTP/2<br />仅支持 downstream HTTP/1.1 | -                                |
| Rate Limit          | 通过`插件`支持                                               | 支持基于`配置`的限流<br />只支持基于源 IP 的限流             |                                  |
| ACL                 | 基于`插件`实现 `L4` ACL                                      | 基于`源/目标地址`实现 ACL                                    |                                  |
| Connection Draining | 支持 `hot reload`<br />通过 `share memory` 实现 connection draining | Nginx Plus 收费版本支持                                      | 支持热启动<br />不保证连接不丢失 |

1. 当反向代理重启时，已经存在的连接是不能丢弃的
2. 新 Envoy 进程启动时，老 Envoy 进程依然存活
   - 新接收的请求会通过 `Socket 复制`，让新 Envoy 进程去处理
   - 本身还在处理的旧请求，会争取在限定时间内处理完
3. 当老的 Envoy 进程退出后，新的 Envoy 进程会继续监听端口

> `配置变更`后，反向代理一般都需要`重启`才能使得配置生效
> 而 `Nginx` 和 `HA Proxy` 都不保证 `Connection Draining`

## 优势

1. `性能`
   - 在具备`大量特性`的同时，Envoy 提供了`极高的吞吐量`和`低尾部延迟差异`，而 CPU 和 Memory `消耗`相对较少
2. `可扩展性`
   - 在 `L4` 和 `L7` 都同时提供了丰富的`可插拔`过滤器的能力
3. `API 可配置性` - 核心竞争力（监听端口，接收配置，`配置热加载`，无需重启）
   - Envoy 提供了一组可以通过`控制平面`服务实现的`管理 API`
   - 如果控制平面实现所有的管理 API，则可以使用`通用引导`配置在整个基础架构上运行 Envoy
   - `配置更改`可以通过`管理服务器`以无缝方式`动态传送`，因此 Envoy `不需要重新启动`
   - 所以 Envoy 可以成为`通用数据平面`，当其与一个`足够复杂`的`控制平面`相结合时，会极大地降低整体运维的`复杂性`

## 线程模式

1. Envoy 采用`单进程多线程`模型
   - `主线程`负责`协调`
   - `子线程`负责`监听过滤和转发`
2. 当某个连接被监听器`接受`，那么该连接的`全部生命周期`会与某线程`绑定`
   - 例如`长连接`的情况，绑定的好处就是可以实现`无锁`操作
3. Envoy 基于`同步非阻塞`模式（`epoll`）
4. 建议 Envoy 配置的 `Worker 数`与 Envoy 所在的`硬件线程数`一致

## 架构

![image-20231225005740812](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231225005740812.png)

1. XDS API 基于 `gRPC` 协议

2. Envoy 启动时会基于一个静态配置文件，表明需要哪些管理服务器来管理 Envoy 的配置

   - Envoy 会尝试连接管理服务器，连接建立后，管理服务器会通过 XDS API 下发 Envoy 配置

3. Envoy 配置 - 即常规反向代理的配置 - 都有对应的`发现`机制 - 配置从哪里来

   - ListenerManager - `LDS`
     - 明确监听端口
   - RouteConfigProvider - `RDS`
     - 提供路由信息或者转发规则，路径 A 对应 SVC_A，而 `SVC` 在 Envoy 中为 `Cluster`

   - ClusterManager - `CDS`
     - 记录 host / ip / endpoint 信息 - 来自于 SVC，相当于一个 VIP

4. TLS - Thread Local Slot

   - Worker 线程的 TLS 来自于主线程的 TLS
   - 当处理新请求时，Worker 线程将采用由主线程`最新推送`下来的 TLS 数据

5. ConnectionHandler 实际处理网络数据，libevent 是基于 epoll 的框架

## 发现机制

> `Istio 配置信息`：监听某个端口，且有对应的路由规则列表，`Route 匹配 Cluster`

```yaml
- Listener Discovery Service
	- Route Discovery Service
```

> `Kubernetes 状态信息`：Cluster 可以简单对应为 Kubernetes `Service`

```yaml
- Cluster Discovery Service
	- Endpoint Discovery Service
```

1. Secret Discovery Service
   - 如果监听端口走 HTTPS 协议，通过 SDS 获取密钥对
   - Istio 默认去 Kubernetes Service 发现
2. Health Discovery Service - Istio 未使用
   - 反向代理一般需要对 upstream 进行探活，如果反向代理副本数很多，探活可能会给应用带来很大压力
   - 可以`委托`其中一个反向代理实例去执行探活，其余实例基于 HDS 获取探活结果
3. Aggregated Discovery Service
   - 其它 XDS 之间是有`依赖`关系的，因此可以聚合好才一起下发
   - 一般是除了 EDS（变更频繁，增量），其余的 XDS 聚合在一起，通过 ADS 下发

## 过滤器模式

> `不支持正则`

![image-20231225012815811](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231225012815811.png)

1. TLSInspector - TLS server name `indication`
   - 一个 Envoy Pod 监听在某个端口，但可能承载了很多域名，不同的域名签出的证书是不一样的
   - 客户端在做 TLS 握手的时候，需要携带 `FQDN`，TLSInspector 再去匹配对应域名的证书
2. HTTP Filter
   - Mixer - 限流
   - Router - 路由转发
     - VirtualHost - 域名匹配
     - 路由匹配成功后，会转发到对应的 Cluster，即 SVC，进而对应不同的 Endpoint

## 实践

### Upstream

```yaml simple.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: simple
spec:
  replicas: 1
  selector:
    matchLabels:
      app: simple
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "80"
      labels:
        app: simple
    spec:
      containers:
        - name: simple
          imagePullPolicy: Always
          image: nginx:1.25.3
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: simple
spec:
  ports:
    - name: http
      port: 80
      protocol: TCP
      targetPort: 80
  selector:
    app: simple
```

### Envoy

> Config

```yaml envoy.yaml
admin:
  address:
    socket_address: { address: 127.0.0.1, port_value: 9901 }

static_resources:
  listeners:
    - name: listener_0
      address:
        socket_address: { address: 0.0.0.0, port_value: 10000 }
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: ingress_http
                codec_type: AUTO
                route_config:
                  name: local_route
                  virtual_hosts:
                    - name: local_service
                      domains: ["*"]
                      routes:
                        - match: { prefix: "/" }
                          route: { cluster: some_service }
                http_filters:
                  - name: envoy.filters.http.router
  clusters:
    - name: some_service
      connect_timeout: 0.25s
      type: LOGICAL_DNS
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: some_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: simple
                      port_value: 80
```

1. admin 部分为 Envoy 的标准配置，代表管理端口
2. static_resources 与 XDS 发现机制无关，属于静态配置
3. listeners 与 clusters 位于同一层级
4. listeners.address.socket_address 代表监听的端口地址
5. listeners.filter_chains.filters.typed_config.route_config 为具体的路由配置
   - 匹配任何域名，前缀为 `/` 时，路由到 some_service
6. some_service 基于 LOGICAL_DNS，即会解析 Kubernetes Service，实际的 Endpoint 为 simple:80

> Proxy

```yaml envoy-deploy.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    run: envoy
  name: envoy
spec:
  replicas: 1
  selector:
    matchLabels:
      run: envoy
  template:
    metadata:
      labels:
        run: envoy
    spec:
      containers:
        - image: envoyproxy/envoy-dev
          name: envoy
          volumeMounts:
            - name: envoy
              mountPath: "/etc/envoy"
              readOnly: true
      volumes:
        - name: envoy
          configMap:
            name: envoy
```

