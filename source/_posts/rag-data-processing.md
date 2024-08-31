---
title: RAG - Data Processing
mathjax: true
date: 2024-08-07 00:06:25
cover: https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/rag-data-processing.png
categories:
  - AI
  - RAG
tags:
  - AI
  - RAG
  - LLM
---

# 数据存储

1. LLM 变成**生产力**，有两个制约因素 - 交互过程中的**长文本** + 内容的**实时更新**
2. 在**传统**的应用开发中，数据存储在**数据库**中，保留了应用的**全部记忆**
3. 在 AI 时代，**向量数据库**充当了这一角色
   - 在 RAG 系统中，数据被转换为**高维向量**形式，使得语言模型能够进行高效的**语义相似度**计算和检索
4. 在向量数据库中，查找变成了**计算**每条记录的**向量近似度**，然后按照**分值**倒序返回结果
5. RAG 就**如何存储向量**的方法论，根据不同的**实现策略**，衍生出了不同的 RAG 技术
   - 利用**图结构**表示和检索知识的 **GraphRAG**
   - 结合知识图谱增强生成能力的 **KG-RAG** - Knowledge Graph Augmented Generation
6. AI 应用的**数据建模**强调的是数据的**语义表示和关联**，以支持更灵活的**查询**和**推理**
7. **高质量的数据处理**，不仅影响**检索的准确性**，还直接决定了 LLM **生成内容的质量和可靠性**

<!-- more -->

# Embedding

1. 将所有内容转成**文本** + **额外数据**（用来关联数据）
2. 选择一个 **Embedding** 模型，把**文本**转成**向量**，并存储到**向量数据库**中

| 厂商   | LLM      | Embedding                                                    | 国产 |
| ------ | -------- | ------------------------------------------------------------ | ---- |
| 百度   | 文心一言 | Embedding-V1<br />bge-large-zh<br />bge-large-en<br />tao-8k |      |
| 阿里   | 通义千问 | text-embedding-v1<br />text-embedding-async-v1<br />text-embedding-v2<br />text-embedding-async-v2 | Y    |
| 智谱   | ChatGLM  | Embedding-3<br />Embedding-2                                 | Y    |
| OpenAI | GPT 系列 | text-embedding-3-small<br />text-embedding-3-large<br />text-embedding-ada-002 | N    |
| Cohere | Cohere   | embed-english-v3.0<br />embed-multilingual-v3.0<br />embed-english-light-v3.0<br />embed-multilingual-light-v3.0 | N    |

# 向量数据库

| 名称         | 开源 | 分布式部署 | 语言              | 特性                                                         |
| ------------ | ---- | ---------- | ----------------- | ------------------------------------------------------------ |
| Pinecone     | 否   | 是         | Python / Go       | 托管服务，专注高效相似性搜索<br />支持实时查询和扩展         |
| **Faiss**    | 是   | 是         | C++ / Python      | A library for efficient similarity search and clustering of dense vectors. |
| **Milvus**   | 是   | 是         | C++ / Go / Python | 开源 + 支持**大规模**向量搜索<br />支持**混合搜索**和**组件级扩展** |
| **Qdrant**   | 是   | 是         | **Rust**          | **高效**语义搜索 + **实时更新**<br />丰富的过滤支持          |
| **Weaviate** | 是   | 是         | Go                | **云原生** + 支持 **AI 搜索**<br />**GraphQL** 接口 + 灵活的模式管理 |
| **Chroma**   | 是   | 是         | Python            | **AI 应用优化**，灵活 API 支持<br />数据管理简便             |

![star-history-vector-db](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/star-history-vector-db.png)

![vector](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/vector.webp)

1. 向量数据库是一种专门为存储、管理和查询**高维向量**数据而设计的数据库
2. 向量数据库，在数据库里存一个**固定长度**的向量，每个**元素**都是**小数**
3. 查询参数也是一个向量，执行查询时，计算两个向量的**距离**，然后按照距离倒排，找到最近的记录

# Qdrant

## 概述

> **Vector Search Engine** for the next generation of **AI applications**

1. **Qdrant** (read: *quadrant*) is a **vector similarity search engine** and **vector database**.
2. It provides a **production-ready** service with a **convenient API** to **store**, **search**, and **manage** points—vectors with an **additional payload**
3. Qdrant is tailored to **extended filtering** support.
4. It makes it useful for all sorts of **neural-network** or **semantic-based matching**, faceted search, and other applications.
5. Qdrant is written in **Rust** 🦀, which makes it **fast** and **reliable** even under high load.
6. With Qdrant, **embeddings** or **neural network encoders** can be turned into **full-fledged applications** for **matching**, **searching**, **recommending**, and much more!
7. API - **REST** / **gRPC**

## 距离

| Algorithm  | Desc                                                         |
| ---------- | ------------------------------------------------------------ |
| 余弦相似度 | 适用于**比较**向量的**方向**，不考虑向量的**大小** - 文本相似度、信息检索 |
| 欧式距离   | 适用于**度量**两点之间的**直线距离**，考虑向量的**大小**和**方向** - 几何计算、图像处理等 |
| 点积       | 适用于**度量**向量的**相对位置和方向** - 线性代数和信号处理等**离散数据计算** |
| 曼哈顿距离 | 适用于**度量**两点之间的**网格距离**，适合**网格状**或**离散空间** - 路径规划、特征工程等 |

## 架构

![qdrant_overview_high_level](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/qdrant_overview_high_level.png)

### 数据处理

1. 开发者针对文档等资料进行整理和分割，通过 **Embedding 模型**计算出 **Chunk 向量**
2. 然后将**向量**和向量关联的数据（**Playload**）写入到 Qdrant

### 数据查询

1. 应用通过 SDK 或者接口访问 Qdrant
2. 通过查询参数（向量+字段），在向量数据库中找到向量**距离最近**的记录
3. 按照距离**排序**后，返回给应用，应用拿到对应记录，通过 Playload 继续后续的操作

### 基本概念

1. **Collections**
   - 类似于 MySQL 中的**表**，里面存储实际的记录
2. **Points**
   - 类似于 MySQL 中的**记录**，由 3 部分组成
   - idx - 唯一 ID
   - vector - 固定长度的向量，在创建 Collection 时，已经确定
   - playload - JSON 对象，核心数据
3. **Storage**
   - vector 和 playload 会**分开存储**，通过 **payload 索引**进行关联
     - 为了保证**数据完整**，Qdrant 使用 **WAL 两阶段提交** - Write-Ahead Logging
   - vector 存储
     - **InMemory** - 所有数据都会被加载到内存，超高性能，只有在需要持久化时才会写入磁盘
     - **Memmap** - 内存映射文件，创建一个文件关联到**虚拟内存地址**
   - playload 存储
     - **InMemory**
     - **OnDisk** - 直接存储到内置的 **RocksDB** 中

## 实践经验

1. 向量数据库处于**高速发展**阶段，需要持续关注
2. 向量是没办法修改的，在测试阶段，不要全量写入，**节省 Embedding 费用**
   - 如果文本的**切片规则**发生变动的话，也会涉及到**全量** Collection 更新 - **高成本**
3. **Collection** 的向量维度要与 **Embedding 模型**保持一致
4. **Payload** 中可以**自定义数据**
   - 但不要在 Payload 中存储**长文本**，只存放**关键**的 ID 数据，**确定性**的信息使用**传统数据库**
5. Qdrant # **write_consistency_factor**
   - 副本数量 - 需要平衡**一致性**和**性能** - 类似于 **Kafka**
6. 为了**通用性**，传入的**长文本**，统一抽象为 **document**，而文档**拆分**后的块统一抽象为 **node**
7. 数据**自动更新** + 质量监控（**剔除低效数据**）

