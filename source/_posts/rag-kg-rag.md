---
title: RAG - KG-RAG
mathjax: true
date: 2024-08-11 00:06:25
cover: https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/kg_rag.png
categories:
  - AI
  - RAG
tags:
  - AI
  - LLM
  - RAG
  - KG-RAG
---

# Knowledge Graph

1. 知识图谱也称为**语义网络**，表示现实世界**实体**的网络，并说明它们之间的关系
2. 信息通常存储在**图形数据库**中，并以图形结构直观呈现
3. 知识图谱由三部分组成 - **节点** + **边** + **标签**

<!-- more -->

![kg](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/kg.png)

# Why

> **降噪** + **提召** + **提准**

1. 传统 RAG 中的 Chunking 方式会召回一些**噪音**的 Chunk
   - 引入 **KG**，可以通过**实体层级**特征来**增强相关性**
2. 传统 RAG 中的 Chunk 之间是**彼此孤立**的，缺乏**关联**，在**跨文档**回答任务上表现不太好
   - 引入 **KG**，增强 Chunk 之间的**关联**，并提升召回的**相关性**
3. 假设已有 KG 数据存在，可以将 **KG** 作为一路**召回信息源**，补充**上下文**信息
4. Chunk 之间形成的 KG，可以提供 **Graph** 视角的 **Embedding**，来补充**召回特征**

> 构建一个**高质量**、**灵活更新**、**计算简单**的**大规模**图谱的**代价很高** - RAG 会很慢

1. https://hub.baai.ac.cn/view/30017
2. https://hub.baai.ac.cn/view/33147
3. https://hub.baai.ac.cn/view/33390
4. https://hub.baai.ac.cn/view/33265
5. https://mp.weixin.qq.com/s?__biz=MzAxMjc3MjkyMg==&mid=2648406891&idx=1&sn=b0143b6ad701171bd11dcf5a33dc2724

# How

## Idea A

> 在线 - 使用知识图谱增强 LLM 的问答效果

![image-20240903170738512](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240903170738512.png)

| 阶段     | 动作        | 描述                                               |
| -------- | ----------- | -------------------------------------------------- |
| Pre RAG  | 意图识别    | 用知识图谱进行**实体别称补全**和**实体上下位推理** |
| In RAG   | Prompt 组装 | 从知识图谱中查询**背景知识**放入**上下文**         |
| Post RAG | 结果封装    | 用知识图谱进行**知识修正**和**知识溯源**           |

## Idea B

> 利用 KG 作为一路**召回源**

![image-20240903173517505](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240903173517505.png)

> https://medium.com/@amodwrites/the-future-of-genai-with-kg-enhanced-rag-systems-c34928427453

![1_pES0UE24Ichw-R_QVvt23w](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/1_pES0UE24Ichw-R_QVvt23w.webp)

> GraphRAG 思想

1. 对 **Query** 提取**实体**，然后构造**子图**形成**上下文**，最后送入到 **LLM** 完成生成
2. 可以直接使用 **Text2Cypher** 的方式进行生成

> 实现

1. 使用 LLM 从 **Query** 中提取**关键实体**
2. 根据实体**检索子图**，深入到一定**深度**（例如 2 度）
3. 根据获取到的上下文，利用 LLM 产生答案

## Idea C

> 利用 KG 来**组织 Chunk** 来**提升相关性**

1. 在 **Document Parsing** 阶段，利用**文档解析结果**，对 **Chunk 之间**的**层级信息**进行存储
2. 在 **Document ReRanking** 阶段，引入**实体**作为**特征**，对 **Query** 与**文档**之间的**实体相关性**进行**过滤**
3. 在长文本的场景中，引入 **KG** 进行**摘要聚类**，层层索引，提升效果
