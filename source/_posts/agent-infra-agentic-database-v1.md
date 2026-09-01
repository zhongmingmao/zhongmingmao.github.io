---
title: Agent Infra - Agentic Database V1
mathjax: false
date: 2026-08-23 00:06:25
cover: https://agent-infra-1253868755.cos.ap-guangzhou.myqcloud.com/agentic-database/image-20260823161936720.png
categories:
  - Agent Infra
  - Agentic Database
tags:
  - Agent Infra
  - Agentic Database
---

# 什么是 PolarDB Agentic Database

1. PolarDB MySQL版面向**海量AI Agent**智能体场景，提供Agentic Database形态
2. Agentic Database基于**敏态Serverless**构建，支持**Scale to Zero**极致弹性、**秒级Branch**分支穿梭、**库内多模融合检索与推理**，以及**MCP/CLI**原生交互，为AI Agent应用提供**极致性价比**的**数据库**服务

<!-- more -->

## 背景

1. 随着以Claude Code、Qoder等为代表的**通用Agent智能体**的快速发展，业务形态正从传统SaaS、微服务体系向AI Agent智能体方向演进
2. 海量Agent场景对数据库提出了新的需求：**极致弹性的资源调度**、**秒级环境隔离与切换**、**库内AI推理能力**，以及**零改造**的Agent接入方式
3. PolarDB MySQL版推出Agentic Database形态，在**敏态Serverless**基础上，进一步提供**Scale to Zero**、**秒级Branch分支**、**沙箱隔离运行时**等核心能力，从**传统关系型数据库**演进为AI-Native的Agentic Database

## 核心特性

### 极致Serverless弹性

Agentic Database基于**敏态Serverless**构建，支持**Scale to Zero**能力，**PCU下限为0**，无负载时**计算资源**驻留**不收费**，接收到请求后，以**0.1 PCU**为粒度**秒级**弹升，**动态匹配**Agent工作负载

1. **Scale to Zero**：PCU下限支持0 PCU，无负载时不收取计算费用，**实例资源驻留**
2. **秒级弹性**：弹性粒度为0.1 PCU，**负载探测时间**缩短至**秒级**，快速响应Agent请求
3. **极速创建**：基于**热池预分配**机制，实例**创建**时间低至**秒级**，适配Agent**按需创建数据库**的使用模式

### Branch分支穿梭

支持**秒级**创建**数据分支**（Branch），提供**实例**、**库**、**表**三个层级的Branch能力。Branch基于**CoW**（Copy-on-Write）**Page多版本**机制，在某一时间点为数据创建**不可变**的**逻辑快照**（**Timeline**），并基于快照**快速派生**独立可写副本（**Fork**），与源数据**结构相同**、**数据初始一致**，写入互不影响。

Branch适用于以下Agent场景：

1. **多Agent并行任务**需要**独立的数据副本**进行**读写**
2. **Agent任务执行失败**时需要**快速回滚**到**指定时间点**
3. **开发测试环境**需要与生产数据保持一致但互不干扰

### 沙箱隔离运行时

Agentic Database提供**沙箱级资源隔离运行时**，面向海量Agent场景支持**单实例单租**和**单实例多租**两种方案，确保不同Agent之间的数据和资源安全隔离。

### 库内推理与多模融合检索

1. Agentic Database支持在数据库内部完成**AI推理闭环**，能够**理解自然语言请求意图**，动态**调用内外部工具**和**模型完成推理任务**
2. 针对**RAG**、**ChatBI**等需要结合**库内数据**进行**推理**的场景，Agentic Database支持融合标量正排、倒排、[向量Vector](https://help.aliyun.com/zh/polardb/polardb-for-mysql/polarvector-vector-search-engine)的**多路检索能力**，并提供**Chunk Parser**、**Embedding**、**Rerank**等**模型流程算子**

### MCP/CLI原生交互

Agentic Database 支持**通用Agent**通过[PolarDB MCP Server](https://github.com/aliyun/alibabacloud-polardb-mcp-server)和CLI完成**数据库交互**，提供**个人Agent OAuth鉴权**和**企业级SSO鉴权**两套方案，Agent接入无需改造，直接使用**MySQL协议**和**MCP协议**

## 形态对比

下表对比了PolarDB**集群版**、**敏态Serverless**和**Agentic Database**三种形态的核心差异

| **维度** | **集群版** | **敏态Serverless** | **Agentic Database** |
| --- | --- | --- | --- |
| 计费形态 | 包年包月或按量付费 | 按PCU实际用量小时计费 | 按**PCU**实际用量小时计费 |
| PCU上下限 | 不适用（固定规格） | 1 PCU起 | **0 PCU ~ 8 PCU** |
| 弹性粒度 | 不适用（固定规格） | 0.25 PCU | **0.1 PCU** |
| 数据分支Branch | 不支持 | 不支持 | **内置CoW三级Branch** |
| 创建速度 | 分钟级 | 分钟级 | **秒级** |
| 负载探测速度 | 不适用（手动升降配） | 分钟级自主探测 | **秒级**活动探测 |
| 高可用 | RPO=0或RPO≈0 | 同集群版 | 内置Standby节点，**默认高可用** |
| 目标负载 | **HTAP混合负载** | **波动型OLTP** | **AI Agent和Agentic应用** |
| Agent接入方式 | MySQL协议 | MySQL协议 | MySQL协议 + **MCP** |

## 计费说明

PolarDB Agentic Database**计算**与**存储**资源采用**Serverless**形式计费，按**PCU**实际用量按小时计价。**无负载**时**计算资源不收费**，**存储空间**按实际**使用量**计费

### 计费项

| **计费项** | **计费规则** |
| --- | --- |
| **计算**节点 | 以PCU（**PolarDB Capacity Unit**）为计费单位，按**每PCU每秒**为单位进行计费，**按小时出账**。PCU上下限为**0~8 PCU**。具体价格请参见[计算节点](https://help.aliyun.com/zh/polardb/polardb-for-mysql/compute-nodes)。 |
| **存储**空间 | 默认使用**ESSD PL1**云盘，按**数据量大小**和**存储时长**计费。具体价格请参见[存储空间](https://help.aliyun.com/zh/polardb/polardb-for-mysql/storage-space)。 |

### 无活动暂停计费策略

> PolarDB Agentic Database支持无活动暂停计费能力，**PCU下限可降至0**。计费策略如下：

1. **闲置时（无请求）**：计算资源不收取计算费用，**实例资源驻留**，存储空间按实际使用量正常计费
2. **接收到请求后**：以**0.25 PCU**为粒度秒级弹升，按实际PCU用量计费 - 2026.09 能优化支持到 0.1 pcu

