---
title: RAG - LangChain
mathjax: true
date: 2024-08-04 00:06:25
cover: https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/rag-agent.webp
categories:
  - AI
  - RAG
tags:
  - AI
  - RAG
  - LLM
  - LangChain
---

# Practice

<!-- more -->

1. LangChain RAG
   - https://github.com/langchain-ai/rag-from-scratch
2. RAG 如何随着长期 LLM 而改变
   - Is RAG Really Dead?
     - https://www.youtube.com/watch?v=SsHUNfhF32s
3. 自适应 RAG
   - 根据复杂程度动态地将查询路由到不同的 RAG 方法 - **Command-R** @ **LangGraph**
   - Adaptive RAG
     - https://www.youtube.com/watch?v=04ighIjMcAI
   - Code
     - https://github.com/langchain-ai/langgraph/blob/main/examples/rag/langgraph_adaptive_rag_cohere.ipynb
   - Paper
     - https://arxiv.org/abs/2403.14403
4. Adaptive RAG
   - 在**循环单元测试**中**自我纠正检索错误**，以确定**文档相关性**并返回到**网络搜索**
   - 在 **LangGraph** 中实现 **Mistral 7B + Ollama**，以便在**本地**运行
   - Local CRAG + LangGraph
     - https://www.youtube.com/watch?v=E2shqsYwxck
   - Code
     - https://github.com/langchain-ai/langgraph/blob/main/examples/rag/langgraph_crag.ipynb
   - Paper
     - https://arxiv.org/pdf/2401.15884.pdf
5. Self-RAG
   - Self-RAG and CRAG
     - https://www.youtube.com/watch?v=pbAd8O1Lvm4
   - Code
     - https://github.com/langchain-ai/langgraph/blob/main/examples/rag/langgraph_self_rag.ipynb
     - https://github.com/langchain-ai/langgraph/blob/main/examples/rag/langgraph_self_rag_local.ipynb
   - Paper
     - https://arxiv.org/abs/2310.11511
6. 查询路由
   - 将问题引导至正确数据源的各种方法（如逻辑、语义等）
   - Routing
     - https://www.youtube.com/watch?v=pfpIndq7Fi8
   - Code
     - https://github.com/langchain-ai/rag-from-scratch/blob/main/rag_from_scratch_10_and_11.ipynb
7. 查询结构
   - 使用 LLM 将自然语言转换为 DSL（如 SQL 等）
   - Query Structuring
     - https://www.youtube.com/watch?v=kl6NwWYxvbM
   - Code
     - https://github.com/langchain-ai/rag-from-scratch/blob/main/rag_from_scratch_10_and_11.ipynb
   - Blog
     - https://blog.langchain.dev/query-construction/
     - https://blog.langchain.dev/enhancing-rag-based-applications-accuracy-by-constructing-and-leveraging-knowledge-graphs/
     - https://python.langchain.com/v0.1/docs/use_cases/query_analysis/techniques/structuring/
     - https://python.langchain.com/v0.1/docs/modules/data_connection/retrievers/self_query/
8. 多表示索引
   - 使用 LLM 生成针对检索进行优化的文档摘要（命题）
   - 嵌入这些摘要以进行相似性搜索，但将完整文档返回给 LLM 进行生成
   - Multi-Representation Indexing
     - https://www.youtube.com/watch?v=gTCU9I6QqCE
   - Code
     - https://github.com/langchain-ai/rag-from-scratch/blob/main/rag_from_scratch_12_to_14.ipynb
   - Paper
     - https://arxiv.org/pdf/2312.06648
9. RAPTOR
   - 将语料库中的文档聚类，并递归地总结相似的文档
   - 将它们全部编入索引，生成较低级别的文档和摘要
   - 可以检索这些文档和摘要来回答更高级别的问题
   - RAPTOR
     - https://www.youtube.com/watch?v=z_6EeA2LDSw
   - Code
     - https://github.com/langchain-ai/langchain/blob/master/cookbook/RAPTOR.ipynb
   - Paper
     - https://arxiv.org/pdf/2401.18059
10. ColBERT Token 级检索
    - 使用受上下文影响的嵌入来提高文档和查询中每个 Token 的嵌入粒度
    - ColBERT
      - https://www.youtube.com/watch?v=cN6S0Ehm7_8
    - Code
      - https://github.com/langchain-ai/rag-from-scratch/blob/main/rag_from_scratch_12_to_14.ipynb
    - Paper
      - https://arxiv.org/abs/2004.12832
11. 多次查询
    - 从多个角度重写用户问题，为每个重写的问题检索文档，返回所有查询的唯一文档
    - Query Translation -- Multi Query
      - https://www.youtube.com/watch?v=JChPi0CRnDY
    - Code
      - https://github.com/langchain-ai/rag-from-scratch/blob/main/rag_from_scratch_5_to_9.ipynb
    - Paper
      - https://arxiv.org/pdf/2305.14283
12. RAG 融合
    - 从多个角度重写用户问题，检索每个重写问题的文档
    - 并组合成多个搜索结果列表的排名，以使用倒数排名融合生成单一统一的排名
    - Query Translation -- RAG Fusion
      - https://www.youtube.com/watch?v=77qELPbNgxA
    - Code
      - https://github.com/langchain-ai/rag-from-scratch/blob/main/rag_from_scratch_5_to_9.ipynb
    - Project
      - https://github.com/Raudaschl/rag-fusion
13. 问题分解
    - 将问题分解成一组子问题
    - 可以按串行解决（使用第一个问题的答案和检索来回答第二个问题）
    - 也可以并行解决（将每个答案合并为最终答案）
    - 各种工作，如从最少到最多提示和 IRCoT 提出了可以利用的想法
    - Query Translation -- Decomposition
      - https://www.youtube.com/watch?v=h0OPWlEOank
    - Paper
      - https://arxiv.org/pdf/2205.10625
      - https://arxiv.org/pdf/2212.10509
14. 回退提示
    - 首先提示 LLM 提出一个关于高级概念或原则的通用后退问题，并检索相关事实
    - 使用此基础来帮助回答用户问题
    - Query Translation -- Step Back
      - https://www.youtube.com/watch?v=xn1jEjRyJ2U
    - Code
      - https://github.com/langchain-ai/rag-from-scratch/blob/main/rag_from_scratch_5_to_9.ipynb
    - Paper
      - https://arxiv.org/pdf/2310.06117
15. HyDE 混合匹配
    - LLM 将问题转换为回答问题的假设文档，使用嵌入的假设文档检索真实文档
    - 前提是 doc-doc 相似性搜索可以产生更多相关匹配
    - Query Translation -- HyDE
      - https://www.youtube.com/watch?v=SaDzIVkYqyY
    - Code
      - https://github.com/langchain-ai/rag-from-scratch/blob/main/rag_from_scratch_5_to_9.ipynb
    - Paper
      - https://arxiv.org/abs/2212.10496

# Query Translation

> Query Translation - 侧重于重写或者修改问题以便于检索

## Multi Query

> https://python.langchain.com/v0.1/docs/modules/data_connection/retrievers/MultiQueryRetriever/

![image-20240829214748213](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240829214748213.png)

1. 从多个角度重写用户问题，为每个重写的问题检索文档，返回所有查询的唯一文档
2. 在实现上，将一个查询变成多个查询
3. 本质上是用 LLM 生成 Query

## RAG Fusion

![image-20240829215802032](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240829215802032.png)

1. 从多个角度重写用户问题，检索每个重写问题的文档，并组合多个搜索结果列表的排名
2. 以使用倒数排名融合（**RRF**）生成单一统一的排名
3. 核心思想 - 将多个召回查询的结果进行合并
4. https://github.com/langchain-ai/langchain/blob/master/cookbook/rag_fusion.ipynb
5. https://towardsdatascience.com/forget-rag-the-future-is-rag-fusion-1147298d8ad1

## Decomposition

1. 将一个复杂问题分解成多个子问题
2. 可以串行解决 - 使用前一个问题的答案和检索来回答第二个问题
3. 可以并行解决 - 将每个答案合并为最终答案
4. Decomposition 是向下分解，与 Multi Query 不同

> 串行 - 迭代式回答 - 在问题分解的基础上，逐步迭代出答案
> https://arxiv.org/pdf/2205.10625
> https://arxiv.org/pdf/2212.10509

![image-20240829221026283](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240829221026283.png)

> 并行 - 让每个 SubQuery 分别进行处理，然后得到答案，再拼接成一个 **QA Pairs Prompt** 最终形成答案

![image-20240829221229712](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240829221229712.png)

## Step Back

![image-20240829221654689](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240829221654689.png)

1. 首先提示 LLM 提出一个关于**高级**概念或原则的通用后退问题，并检索有关它们的相关事实
2. 使用此基础来帮助回答用户问题
3. 构成上包括**抽象**（**Abstraction**）和**推理**（**Reasoning**）两步
   - 给定一个问题，提示 LLM，找到回答该问题的一个**前置**问题
   - 得到前置问题及其答案后，再将其整体和当前问题进行**合并**，最后送入 LLM 进行问答，得到最终答案
4. https://arxiv.org/pdf/2310.06117

## HyDE

![image-20240829223153087](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240829223153087.png)

1. LLM 将问题转换为回答问题的**假设文档**（很容易引入**幻觉**），使用嵌入的假设文档检索**真实文档**
2. 前提是 **Doc-Doc** 相似性搜索可以产生**更多相关匹配**
3. 由于 Query 和 Doc 之间是**不对称检索**
   - 先根据 Query 生成一个 Doc，然后根据该 Doc 生成对应的 Embedding
   - 再跟原先的 Docs 进行检索
4. https://arxiv.org/abs/2212.10496
5. https://github.com/langchain-ai/langchain/blob/master/cookbook/hypothetical_document_embeddings.ipynb

![image-20240829224327060](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240829224327060.png)

1. 每个 query 都有对应的 instruction
2. 通过 ChatGPT 生成 generated document，然后以此进行召回，最后生成 real document

## Routing

![image-20240829225010521](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240829225010521.png)

![image-20240829225117769](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240829225117769.png)

1. 从获取 query 之后，所需要执行的问题**意图分类**的问题，处理的是**问题域选择**问题
2. 可用方案 1 - **Logical** and **Semantic** routing - 基于**逻辑**和**语义**的路由分发
   - https://python.langchain.com/v0.1/docs/use_cases/query_analysis/techniques/routing/#routing-to-multiple-indexes
3. 可用方案 2 - **Semantic** routing - 基于**语义**来实现分发

![image-20240829230351685](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240829230351685.png)

## Query Structuring

![image-20240829232333633](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240829232333633.png)

![image-20240829232352441](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240829232352441.png)

1. 不同的检索知识库，如 MySQL、GraphDB、VectorDB 的**查询转换**
2. 使用 LLM 将**自然语言**转换为其中一种 **DSL** - 借助 **Text to SQL** 模型
3. https://blog.langchain.dev/query-construction/
4. https://blog.langchain.dev/enhancing-rag-based-applications-accuracy-by-constructing-and-leveraging-knowledge-graphs/
5. 可用方案 - query structuring for metadata filter - 基于元数据过滤器的问题构建
   1. 许多**向量化存储**都包含**元数据**字段，可以根据元数据过滤特定的数据 Chunk
   2. https://python.langchain.com/v0.1/docs/use_cases/query_analysis/techniques/structuring/

## Indexing

![image-20240829232418483](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240829232418483.png)

> 先生成摘要，再索引

![image-20240829232436647](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240829232436647.png)

1. https://blog.langchain.dev/semi-structured-multi-modal-rag/
2. https://python.langchain.com/v0.1/docs/modules/data_connection/retrievers/multi_vector/
3. https://arxiv.org/abs/2312.06648
4. https://python.langchain.com/v0.1/docs/modules/data_connection/retrievers/parent_document_retriever/

![image-20240829232854378](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240829232854378.png)

> 层级性索引 - https://arxiv.org/pdf/2401.18059
> https://github.com/langchain-ai/langchain/blob/master/cookbook/RAPTOR.ipynb

![image-20240829234146776](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240829234146776.png)

1. 对文档进行生成聚类摘要，然后设计成层级性
2. 具体实现，将语料库中的文档聚类，并递归地总结相似的文档
3. 将它们全部编入索引，生成低级别的文档和摘要
4. 可以索引这些文档和摘要来回答从详细到更高级别的问题

> ColBERT - 做到 Token 级别 - 类似于**关键词**的召回
> https://hackernoon.com/how-colbert-helps-developers-overcome-the-limits-of-rag

1. 为段落中的每个 **Token** 生成一个**受上下文影响**的**向量**
2. ColBERT 同样为 Query 中的每个 Token 生成向量
3. 然后，每个文档的得分是 Query 嵌入与任意文档嵌入的最大相似度之和

## Retrieval

![image-20240830002051143](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240830002051143.png)

![image-20240830002105203](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240830002105203.png)

1. https://python.langchain.com/v0.2/docs/integrations/retrievers/cohere-reranker/#doing-reranking-with-coherererank
2. https://cohere.com/blog/rerank
3. Ranking / Refinement / Active Retrieval
4. 做 RAG 的时候，尽量不要去动原始的 Embedding 模型，而是动 **Rerank** 模型（很小，几百兆）

![image-20240830002623978](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240830002623978.png)

![image-20240830002658589](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240830002658589.png)

> CRAG（Corrective RAG），本质也是一种 **Adaptive RAG**
> 为在循环单元测试中自我纠正检索错误，以确定文档相关性并返回到网络搜索
> 对检索文档的自我反思和自我评分
>
> **AI 搜索**
> 如果至少有一个文档超过了**相关性阈值**，则进入生成阶段
> 在生成之前，进行知识细化，将文档化为条带，对每个知识条进行分级，过滤不相关的知识条
> 如果所有文档都低于相关性阈值，或者分级者不确定，那么框架会寻找额外的数据源，使用网络补充搜索

![image-20240830003933737](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240830003933737.png)

## Self-RAG

> 使用循环单元测试自我纠正 RAG 错误，以检查文档相关性、答案幻觉和答案质量

![image-20240830004226151](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240830004226151.png)
