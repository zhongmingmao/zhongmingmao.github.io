---
title: RAG - Vector Stores
mathjax: true
date: 2024-08-12 00:06:25
cover: https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/vector_stores.webp
categories:
  - AI
  - RAG
tags:
  - AI
  - LLM
  - RAG
  - Vector
---

# Embedding

![image-20241016102402609](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241016102402609.png)

# Vector Store

## 概述

1. 在 AI 时代，**文字**、**图像**、**语音**、**视频**等**多模态**数据的**复杂性**显著增加
2. 多模态数据具有**非结构化**和**多维**特征
   - **向量**表示能够有效表示语义和**捕捉潜在的语义关系**
   - 促使**向量数据库**成为存储、检索和分析**高维向量**的关键工具

> Qdrant / Milvus

![image-20241016105046214](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241016105046214.png)

## 优势

![image-20241016105836730](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241016105836730.png)

> SQL vs NoSQL

1. 传统数据库通常分为关系型（**SQL**）数据库和非关系型（**NoSQL**）数据库
2. 存储**复杂**、**非结构化**或**半结构化**信息的需求，主要依赖于 **NoSQL** 的能力

| Store     | Desc                                                         | Note                 |
| --------- | ------------------------------------------------------------ | -------------------- |
| Key-Value | 用于简单的数据存储，通过 Key 来快速访问数据                  | 精准定位信息         |
| Document  | 用于存储**文档结构**的数据，如 **JSON** 格式                 | 复杂的**结构化**信息 |
| Graph     | 用于表示和存储复杂的**关系**数据，常用于**社交网络**、**推荐**等场景 | 复杂的**关系**数据   |
| Vector    | 用于存储和检索基于**向量**表示的数据，用于 **AI 模型**的高维度和复杂的**嵌入向量** | **语义**最相关的数据 |

1. 向量数据库的核心在于能够基于向量之间的**相似性**，能够**快速**、**精确**地**定位**和**检索**数据
2. 向量数据库不仅为**嵌入向量**提供了优化的**存储**和**查询**性能
   - 同时也继承了**传统数据库**的诸多优势 - **性能**、**可扩展性**、**灵活性** - 充分利用**大规模数据**
3. 传统的基于**标量**的数据库
   - 无法应对**数据复杂性**和**规模化处理**的挑战，难以有效**提取洞察**并实现**实时分析**

> 主要优势

1. 数据管理
   - 向量数据库提供易于使用的**数据存储**功能 - 插入 + 删除 + 更新
   - **Faiss** 是独立的**向量索引工具**，需要**额外的工作**才能与**存储解决方案**集成
2. 元数据存储和筛选
   - 向量数据库能够存储与**每个向量**条目**关联**的元数据
   - 基于元数据，可以进行**更细粒度**的查询，从而提升查询的**精确度**和**灵活性**
3. 可扩展性
   - 向量数据库支持**分布式**和**并行**处理
   - 并通过**无服务器架构**优化大规模场景下**成本**
4. 实时更新
   - 向量数据库支持**实时数据更新**
   - 允许**动态修改**数据以确保检索结果的**时效性**和**准确性**
5. 备份与恢复
   - 向量数据库具备**完善**的备份机制，确保数据的**安全性**和**持久性**
6. 生态系统集成
   - 向量数据库能够与**数据处理**生态系统中的其它组件轻松集成 - **Spark**
   - 还能无缝集成 AI 相关工具 - LangChain / LlamaIndex / Cohere
7. 数据安全与访问控制
   - 向量数据库提供内置的**数据安全功能**和**访问控制机制**，以保护**敏感**信息
   - 通过**命名空间**实现**多租户**管理，允许对**索引**进行完全**分区**

> 应用场景

1. 向量数据库广泛应用于 LLM RAG 系统、推荐系统等多种 AI 产品中
2. 向量数据库是一类专门为**生产**场景下的**嵌入向量**管理而构建的数据库
   - 与传统基于**标量**的数据库以及独立的**向量索引工具**相比
   - 向量数据库在**性能**、**可扩展性**、**安全性**和**生态系统集成**等方面展现了显著的优势

## 原理

1. 向量数据库是一种专门用于存储和检索**多维向量**的数据库类型
   - 与传统的基于**行列结构**的数据库不同，向量数据库主要处理**高维空间**中的**数据点**
   - 传统数据库通常处理**字符串**、**数字**等**标量**，并通过**精确匹配**来查询数据
   - 向量数据库的操作逻辑是基于**相似性搜索**
     - 在查询时，应用特定的**相似性度量**（余弦相似度、欧几里得距离等）来查找与**查询向量**最**相似**的向量
2. 向量数据库的核心在于其高效的**索引**和**搜索**机制
   - 为了优化**查询性能**，采用**哈希**（LSH）、**量化**（PQ）和**基于图形**（HNSW）的多种算法
   - 构建层次化可导航小世界（**HNSW**）、产品量化（**PQ**）和位置敏感哈希（**LSH**）等**索引结构**，提升**查询性能**
   - 搜索过程并非追求**绝对精确**
     - 通过近似最近邻算法（**ANN**）在**速度**和**准确性**之间进行**权衡**
     - **ANN** 算法允许一定程度的**误差** - 显著**提升搜索速度** + 找到与查询**相似度较高**的向量

> 向量数据库的**索引结构**相当于一种**预处理**步骤

| Index structure | Desc                                                         |
| --------------- | ------------------------------------------------------------ |
| HNSW            | 通过在**多层**结构中将**相似向量**连接在一起，快速**缩小搜索范围** |
| PQ              | 通过**压缩**高维向量，**减少内存占用**并**加速检索**         |
| LSH             | 通过**哈希函数**将**相似向量**聚集在一起，便于**快速定位**   |

## 流程

![image-20241016170031508](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241016170031508.png)

1. 数据处理 + 向量化
   - 原始数据首先被处理并转化为**嵌入向量**
   - 通过**嵌入模型**实现，利用**深度学习**算法提取数据的**语义特征**，生成适合后续处理的**高维向量**表示
2. 向量存储
   - 将转化后的**嵌入向量**存储到**向量数据库**中
   - 数据**高效检索** + 以优化的方式管理和维护**存储资源**（适应不同**规模**和**复杂度**的应用需求）
3. 向量索引
   - 存储的**嵌入向量**经过**索引处理**，便于在后续**查询**中**快速定位**相关数据
   - 索引过程通过构建**特定结构**，使得数据库能够在**大规模数据集**上实现**高效的查询响应**
4. 向量搜索
   - 在收到**查询向量**后，向量数据库通过已建立的**索引结构**执行**相似性搜索** - 与查询向量**最接近**的**数据点**
   - 平衡**搜索速度**和**准确性** - 在**大数据**环境下提供**快速**且**相关**的查询结果
   - 相似度度量
     - **余弦相似度** - 用于**文件处理**和**信息检索** - 关注向量之间的**角度**，捕捉**语义相似性**
     - **欧几里得距离** - 测量向量之间的**实际距离** - 适用于**密集特征集**的**聚类**和**分类**
     - **曼哈顿距离** - 计算笛卡尔坐标中**绝对差值之和**，适用于**稀疏**数据的处理
     - **点积**
5. 数据检索
   - 向量数据库从匹配的向量中检索出**对应**的**原始数据**，并按需处理
   - 确保最终结果能够准确反映用户的**查询意图**，并提供有意义的输出

## RAG

![image-20241016175937752](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241016175937752.png)

1. 在 RAG 系统中，向量数据库的主要功能在于**索引过程**中，建立高效的**向量索引结构**
2. 在**查询**阶段，系统将输入的提示转化为**向量**表示形式
   - 从向量数据库中检索出与之**最相关**的**向量**及其对应的**分块**数据
3. 通过索引和检索，检索到的向量为 LLM 提供了必要的**上下文**信息
   - LLM 能够依据当前的语义上下文生成更加**精确**和相关的响应

## 选型

![image-20241016181814194](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241016181814194.png)

| 场景                                 | 选型                             |
| ------------------------------------ | -------------------------------- |
| 快速开发 + 轻量化部署                | Chroma / **Qdrant**              |
| 高性能 + 可扩展性                    | **Milvus** / Zilliz              |
| 极致性能 + 无需持久化 + 无需数据管理 | FAISS                            |
| 多模态数据                           | Weaviate / LanceDB               |
| 集成现有数据库                       | PGVector / Elasticsearch / Redis |
| 全托管                               | Pinecone                         |

# Chroma

1. Chroma 是一种**简单**且易于**持久化**的向量数据库，以**轻量级**、**开箱即用**的特性著称
2. Chroma 支持**内存**中操作和**磁盘持久化**，能够高效地**管理**和**查询**向量数据，非常适合**快速集成和开发**

## Client + Collection

```python
    # 创建ChromaDB本地存储实例和collection
    client = chromadb.PersistentClient(chroma_db_path)
    collection = client.get_or_create_collection(name="documents")
    embedding_model = load_embedding_model()
```

## Indexing 

```python
def indexing_process(folder_path, embedding_model, collection):
    all_chunks = []
    all_ids = []

    for filename in os.listdir(folder_path):
        file_path = os.path.join(folder_path, filename)

        if os.path.isfile(file_path):
            document_text = load_document(file_path)
            if document_text:
                print(f"文档 {filename} 的总字符数: {len(document_text)}")

                text_splitter = RecursiveCharacterTextSplitter(chunk_size=512, chunk_overlap=128)
                chunks = text_splitter.split_text(document_text)
                print(f"文档 {filename} 分割的文本Chunk数量: {len(chunks)}")

                all_chunks.extend(chunks)
                # 生成每个文本块对应的唯一ID
                all_ids.extend([str(uuid.uuid4()) for _ in range(len(chunks))])

    embeddings = [embedding_model.encode(chunk, normalize_embeddings=True).tolist() for chunk in all_chunks]

    # 将文本块的ID、嵌入向量和原始文本块内容添加到ChromaDB的collection中
    collection.add(ids=all_ids, embeddings=embeddings, documents=all_chunks)
    print("嵌入生成完成，向量数据库存储完成.")
    print("索引过程完成.")
    print("********************************************************")
```

## Retrieval

```python
def retrieval_process(query, collection, embedding_model=None, top_k=6):
    query_embedding = embedding_model.encode(query, normalize_embeddings=True).tolist()

    # 使用向量数据库检索与query最相似的top_k个文本块
    results = collection.query(query_embeddings=[query_embedding], n_results=top_k)

    print(f"查询语句: {query}")
    print(f"最相似的前{top_k}个文本块:")

    retrieved_chunks = []
    # 打印检索到的文本块ID、相似度和文本块信息
    for doc_id, doc, score in zip(results['ids'][0], results['documents'][0], results['distances'][0]):
        print(f"文本块ID: {doc_id}")
        print(f"相似度: {score}")
        print(f"文本块信息:\n{doc}\n")
        retrieved_chunks.append(doc)

    print("检索过程完成.")
    print("********************************************************")
    return retrieved_chunks
```

## Persistence

![image-20241016223236449](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241016223236449.png)
