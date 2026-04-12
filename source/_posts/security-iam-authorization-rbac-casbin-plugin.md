---
title: Authorization - Casbin Plugin
mathjax: true
date: 2026-04-12 22:29:24
cover: https://cn-security-1253868755.cos.ap-guangzhou.myqcloud.com/iam/authorization/rbac/casbin/security-iam-authorization-rbac-casbin.webp
categories:
  - Security
  - IAM
  - Authorization
  - RBAC
tags:
  - Security
  - IAM
  - Authorization
  - RBAC
  - Casbin
---

# Overview

> Casbin 的**核心**只负责**策略执行逻辑（model + policy）**，而**插件负责连接外部世界** - 数据库、消息队列、Web 框架等

| 类别          | 中文名     | 作用                                             |
| ------------- | ---------- | ------------------------------------------------ |
| Enforcers     | 专用执行器 | 针对特定**环境**或**场景**定制的执行器           |
| Adapters      | 存储适配器 | 对接**数据库/文件/云存储**，读写 model 和 policy |
| Watchers      | 变更监听器 | **多实例之间同步 policy 变更**                   |
| Dispatchers   | 分发协调器 | 分布式部署下**协调策略更新**                     |
| Role Managers | 角色管理器 | 自定义**角色继承/层级**逻辑                      |
| Middlewares   | 框架中间件 | 集成 Gin、Nest.js、GraphQL、Kong 等              |

<!-- more -->

> Adapters（最常用）

1. 解决"**policy 存哪**"的问题
2. 支持 **MySQL**、**PostgreSQL**、**Redis**、**MongoDB**、**文件**等
3. Casbin 核心本身只内置了**文件 Adapter**

> Watchers（分布式关键）

1. 解决"**多个 Casbin 实例间 policy 如何保持一致**"的问题
2. 典型实现：**Redis Pub/Sub**、Etcd
3. **一个实例更新 policy → watcher 广播 → 其他实例重载**

> Dispatchers（**更强一致性**）

1. 比 Watcher 更进一步，**协调分布式下的写操作**
2. 适用于需要**强一致性**的场景

> Role Managers

1. 解决"**角色继承逻辑如何定制**"的问题
2. 默认内置一个**内存 role manager**，插件可替换为**图数据库**等

> 使用流程

选择**插件类别** → **安装对应包** → **创建 Enforcer 时注入** → 按插件文档**配置高级选项**

# Enforcers

> Casbin 提供了**多种 Enforcer 变体**，满足**不同部署场景**的需求

| Enforcer             | 核心特性                                         | 适用场景                |
| -------------------- | ------------------------------------------------ | ----------------------- |
| Enforcer             | 基础实现，核心 API                               | 单节点、简单场景        |
| CachedEnforcer       | 内存缓存鉴权结果，可配置过期时间，读写锁线程安全 | 高频鉴权、性能敏感      |
| SyncedEnforcer       | 全 API 加**同步锁**                              | **多线程并发写**        |
| SyncedCachedEnforcer | 缓存 + 同步锁，两者结合                          | 多线程 + 高频鉴权       |
| DistributedEnforcer  | 包装 SyncedEnforcer，配合 Dispatcher 工作        | 多节点分布式部署        |
| ContextEnforcer      | 支持 Context 参数的 Adapter 操作                 | 需要超时/取消控制的场景 |

> 关键区别

| 系列        | 描述                                                         |
| ----------- | ------------------------------------------------------------ |
| Cached 系列 | 缓存的是**鉴权结果**（Enforce() 的返回值），减少重复计算开销 |
| Synced 系列 | 对**所有操作**加锁，保证并发安全                             |
| Distributed | 依赖 **Dispatcher** 实现**跨节点策略广播**，是**真正的分布式方案** |
| Context     | 为 Adapter 操作注入 context.Context，便于与**链路追踪**、**超时控制**集成 |

# Adapters

> Casbin Adapter 是**策略持久化**的**核心扩展点**

## 核心概念

> Adapter 的职责：**Enforcer** 通过 **Adapter** 调用 **LoadPolicy()** 加载规则、**SavePolicy()** 持久化规则，Adapter 把 **Casbin 与具体存储解耦**

## Adapter 分类

| 类型          | 代表                                 | 说明                                  |
| ------------- | ------------------------------------ | ------------------------------------- |
| File          | **内置 File Adapter**                | CSV 文件，最简单，**不支持 AutoSave** |
| SQL           | SQL Adapter, Filtered PostgreSQL     | 直接用 database/sql                   |
| ORM           | GORM/Xorm/Ent/Beego                  | 主流 ORM 封装，**大多支持 AutoSave**  |
| NoSQL         | MongoDB/RethinkDB/Cassandra/DynamoDB | 文档/列式数据库                       |
| KV store      | Redis/Etcd/BoltDB/BadgerDB           | 键值存储                              |
| Cloud         | S3/Firestore/DynamoDB/CosmosDB       | 云原生存储                            |
| String/Stream | JSON/Protobuf/String                 | 内存/序列化场景                       |

## 四个接口层次

```
Adapter（必须）
├── LoadPolicy()    — 全量加载
└── SavePolicy()    — 全量保存（覆盖写）
```

```
Auto-Save（可选，单条增量操作）
├── AddPolicy()
├── RemovePolicy()
└── RemoveFilteredPolicy()
```

```
UpdateAdapter（可选，更新操作）
├── UpdatePolicy()          — 更新单条
├── UpdatePolicies()        — 批量更新
└── UpdateFilteredPolicies()— 按过滤条件更新
```

```
ContextAdapter（可选，注入 context）
└── 所有操作的 Ctx 变体（超时控制、链路追踪）
```

## AutoSave vs SavePolicy()

| 维度     | SavePolicy()            | AutoSave       |
| -------- | ----------------------- | -------------- |
| 操作方式 | **清空全表 + 全量重写** | **单条增量写** |
| 性能     | 策略量大时慢            | 高效           |
| 原子性   | **全量替换**            | **单条操作**   |
| 适用场景 | 策略迁移、初始化        | 日常增删改     |

> 通过 **e.EnableAutoSave(false) 可关闭 AutoSave**，此时 **AddPolicy()** 等 API **只更新内存**，需**手动调用 SavePolicy() 落盘**

## 策略迁移方法

```go
e.SetAdapter(A); e.LoadPolicy()    // 从 A 加载
e.SetAdapter(B); e.SavePolicy()    // 写入 B
```

## 自定义 Adapter 要点

1. 表名默认 **casbin_rule**，字段 **ptype, v0~v5**，唯一索引建在 (**ptype,v0,v1,v2,v3,v4,v5**)
2. **不支持 AutoSave 时**，三个可选方法返回 **errors.New("not implemented")**，Casbin 会**自动忽略**该错误
3. 约定：Adapter 应**自动创建 casbin 数据库**（如不存在）
4. 事务支持：实现 **TransactionalAdapter** 接口，配合 **casbin.NewTransactionalEnforcer** 使用

# Watchers

> Watcher 的职责：在**多节点部署**中保持**策略同步**。某个 **Enforcer 实例更新策略后**，通过**消息总线**通知**其他实例重载策略**，避免**负载均衡**后各**节点策略不一致**

## 两种接口

> Watcher vs WatcherEx 对比 - 注：**WatcherEx 目前没有官方实现**，官方推荐用 **Dispatcher** 实现**增量同步**

| 维度       | Watcher                    | WatcherEx                      |
| ---------- | -------------------------- | ------------------------------ |
| 通知粒度   | 仅信号（"**有变更**"）     | **操作类型 + 具体规则**        |
| 接收端处理 | **全量 LoadPolicy() 重载** | 可**增量更新**对应规则         |
| 一致性     | **最终一致**               | 最终一致，但延迟更低           |
| 实现复杂度 | 低                         | 高                             |
| 官方建议   | 简单场景                   | 官方建议用 **Dispatcher** 替代 |

### Watcher（基础接口）

> 工作模式：只传递"**有策略变更**"的信号，**不携带变更内容**。收到通知的节点**全量 LoadPolicy() 重载**

```
SetUpdateCallback()  — 注册收到通知后的回调（通常是 enforcer.LoadPolicy()）
Update()             — 发送通知给其他实例
Close()              — 关闭 Watcher
```

### WatcherEx（扩展接口，继承 Watcher）

> 在基础接口上新增了 **按操作类型区分** 的通知方法

| API                             | 触发时机                                                     |
| ------------------------------- | ------------------------------------------------------------ |
| UpdateForAddPolicy()            | AddPolicy / AddNamedPolicy / AddGroupingPolicy               |
| UpdateForRemovePolicy()         | RemovePolicy / RemoveNamedPolicy / RemoveGroupingPolicy      |
| UpdateForRemoveFilteredPolicy() | RemoveFilteredPolicy / RemoveFilteredNamedPolicy             |
| UpdateForSavePolicy()           | SavePolicy                                                   |
| UpdateForAddPolicies()          | AddPolicies / AddNamedPolicies / AddGroupingPolicies         |
| UpdateForRemovePolicies()       | RemovePolicies / RemoveNamedPolicies / RemoveGroupingPolicies |

> 优势：接收端可根据**操作类型**做**增量更新**，而非全量 LoadPolicy()，**性能更好**

## 支持的后端

| 类型     | 代表                                                         |
| -------- | ------------------------------------------------------------ |
| KV store | **Redis**、Redis WatcherEx、Etcd、TiKV                       |
| 消息系统 | **Kafka**、NATS、RabbitMQ、ZooKeeper、**RocketMQ**、GCP Pub/Sub、AWS SNS/SQS |
| 数据库   | PostgreSQL WatcherEx                                         |

# Dispatchers

> Dispatcher 的职责：在**多节点集群**中，通过**共识协议**（如 **Raft**）**传播增量策略变更**，保证**所有 Enforcer 实例最终看到相同的策略**

## 与 Watcher 的本质区别

| 维度       | Watcher                                    | Dispatcher                                     |
| ---------- | ------------------------------------------ | ---------------------------------------------- |
| 同步协议   | **Pub/Sub（消息广播，无确认）**            | **Raft 共识（强一致，有日志）**                |
| 一致性保证 | **最终一致**（**消息可能丢失**）           | **强一致**（**Raft** 保证多数派提交）          |
| 初始状态   | **各节点独立加载初始策略**                 | **要求所有节点初始策略相同**                   |
| 增量同步   | **WatcherEx 携带规则，Self* 更新内存**     | Dispatcher 实现 Casbin 内部钩子，**统一分发**  |
| 网络分区   | 分区期间**各节点独立运行**，**可能不一致** | Raft **在分区时阻塞写入**（<u>保护一致性</u>） |
| 实现复杂度 | 低（Pub/Sub 即可）                         | 高（需维护 Raft 集群）                         |

## 关键约束

1. Dispatcher 只同步初始化之后的变更，**不修复已有的不一致**
2. 用 Dispatcher 前，必须保证**所有节点从相同的数据源**（同一个 DB 快照）**加载初始策略**

## DistributedEnforcer

> 专为 **Dispatcher** 场景设计的 **Enforcer 变体**

```
DistributedEnforcer
  └─ 包装 SyncedEnforcer（线程安全）
       └─ 通过 Dispatcher 钩子，将 AddPolicy/RemovePolicy 等操作
          广播给集群其他节点，而非本地独立执行
```

> 用法：

```go
e, _ := casbin.NewDistributedEnforcer("examples/basic_model.conf", "examples/basic_policy.csv")
```

# Role Managers

> Role Manager 的职责：管理 RBAC 中"**谁拥有哪个角色、角色如何继承**"的层级关系。它是 **g(user, role)** 规则的**执行引擎**

## 两类 Role Manager

| 类型         | 数据来源                      | 代表                  |
| ------------ | ----------------------------- | --------------------- |
| 内置（默认） | Casbin policy（g 规则，内存） | Default Role Manager  |
| 外部集成     | LDAP / IdP 系统               | Okta、Auth0、Azure AD |

## 内置 Default Role Manager

1. 从 policy 中的 `g = _, _` 规则构建**内存角色图**
2. 支持**角色继承**（g, alice, admin、g, admin, superadmin）
3. **所有操作在内存中完成**，速度最快

## Session Role Manager

1. 在**默认 Role Manager** 基础上扩展，支持**基于时间范围的会话**
2. 即：**某用户在某时间段内才拥有某角色**（临时授权场景）

## 外部 Role Manager（Okta / Auth0）

1. **直接查询 IdP 的角色/组数据**，不依赖 Casbin policy 中的 **g 规则**
2. 合企业已有统一身份系统、不想在 Casbin 维护一份**重复角色数据**的场景

# Middleware

> Middleware 的职责：将 **enforcer.Enforce(sub, obj, act) 调用**嵌入 **Web 框架**的**请求处理链**，免去每个 **handler** 手写鉴权样板代码

> Go 生态覆盖范围 - 几乎所有主流 Go Web 框架都有对应插件

| 类型      | 代表框架                | Casbin 插件                         |
| --------- | ----------------------- | ----------------------------------- |
| 通用 HTTP | Gin                     | gin-authz / gin-casbin              |
| 全栈框架  | Beego、Revel、GoFrame   | 内置 plugins/authz                  |
| 微服务    | Go kit、Kratos、go-zero | plugins/authz / tx7do/kratos-casbin |
| 高性能    | Fiber、FastHTTP、Hertz  | casbin in gofiber/contrib           |
| API 网关  | Traefik、Caddy、Tyk     | casbin-forward-auth / caddy-authz   |
| 轻量路由  | Chi、Negroni、Echo      | chi-authz / echo-authz              |



