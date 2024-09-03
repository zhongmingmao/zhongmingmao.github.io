---
title: RAG - Chunking + Embedding
mathjax: true
date: 2024-08-09 00:06:25
cover: https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/vector_chunking_text.png
categories:
  - AI
  - RAG
tags:
  - AI
  - LLM
  - RAG
---
# 概述

> Chunking

1. Documents 经过解析后，通过 **Chunking** 将信息内容划分为适当大小的 **Chunks** - 能够**高效处理**和**精准检索**
1. Chunk 的本质在于依据一定的**逻辑**和**语义原则**，将**长文本**拆解为**更小的单元**
1. Chunking 有多种**策略**，各有**侧重**，选择**适合特定场景**的 Chunking 策略，有助于**提升 RAG 召回率**

<!-- more -->

> Embedding

1. **Embedding Model** 负责将**文本数据**映射到**高维向量空间**，将输入的**文档片段**转换为对应的**嵌入向量**
2. **嵌入向量**捕捉了文本的**语义**信息，并存储到**向量库**中，以便于后续**检索**
3. **Query** 同样通过 **Embedding Model** 的处理生成 **Query 的嵌入向量**，在**向量库**中通过**向量检索**匹配**最相似**的文档片段
4. 根据不同的场景，**评估**并选择最优的 **Embedding Model**，以确保 RAG 的**检索性能**符合要求

![image-20240902232040001](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240902232040001.png)

# Chunking

## 影响

1. Documents 包含**丰富的上下文信息**和**复杂的语义结构**
   - 通过 Chunking，模型可以更有效地**提取关键信息**，并减少不相关内容的**干扰**
2. Chunking 的目标
   - 确保每个片段在**保留核心语义**的同时，具备**相对独立的语义完整性**
   - 使得模型在处理时**不必依赖**广泛的上下文信息，增强**检索召回**的**准确性**
3. Chunking **直接影响** RAG 系统的**生成质量**
   - 能够确保检索到片段**与 Query 高度匹配**，避免信息**冗余**或者**丢失**
   - 有助于提升**生成内容的连贯性**，精心设计的**独立语义片段**可以降低模型**对上下文的依赖**
   - 影响系统的**响应速度**和**效率**

## 尺寸

1. Chunking 最大的挑战是**确定 Chunk 大小**
2. Chunk **过大** - 可能导致向量**无法精确捕捉**内容的特定细节并且**增加计算成本**
3. Chunk **过小** - 可能**丢失上下文**，导致**句子碎片化**和**语义不连贯**
4. 适合的场景
   - **小 Chunk** - 需要**细粒度分析**的任务 - **情感分析**
   - **大 Chunk** - 需要**保留更广泛上下文**的场景 - **文档摘要** or **主题检测**
5. 取舍
   - Chunk 大小的确定必须在**计算效率**和**上下文**之间取得平衡

## 策略

1. 最佳的 **Chunking 策略**取决于具体的**应用场景** - 业界**无统一标准**
2. 选择最合适目标场景的 Chunking 策略，确保 RAG 系统中 **LLM** 能够**更精确**地处理和检索数据

> Chunking 策略的组成

| Part | Desc                                                         |
| ---- | ------------------------------------------------------------ |
| 大小 | 每个 Chunk 所允许的**最大字符数**                            |
| 重叠 | 在相邻 Chunk 之间，**重叠字符**的数量                        |
| 拆分 | 通过**段落边界**、**分隔符**、**标记**、**语义边界**来确定 **Chunk 边界**的位置 |

![63b052c1b1639bfa66c23342cf28d9ef.jpg](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/63b052c1b1639bfa66c23342cf28d9ef.png)

> https://chunkviz.up.railway.app/

### Fixed Size

> 固定大小分块

#### 概述

1. 将文档按**固定大小**进行分块，作为 Chunking 策略的**基准线**

![image-20240903001840753](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240903001840753.png)

#### 场景

1. 作为 Chunking 策略的**基准线**
2. 对**大型数据集**进行**初步分析**
3. 实现简单 + **可预测性高**，Chunk **便于管理**
4. 适用于**格式**和**大小**相似的**同质数据集** - 新闻 or 博客

#### 问题

1. 不考虑内容**上下文**，可能在句子或者段落**中断内容**，导致**无意义**的 Chunk
2. 缺乏**灵活性**，无法适应**文本**的**自然结构**

### Overlap

> 重叠分块

#### 概述

1. 通过**滑动窗口**技术切分 Chunk，使新 Chunk 与前一个 Chunk 的内容**部分重叠**
2. 保留 **Chunk 边界**处的重要**上下文**信息，增强系统的**语义相关性**
3. 增加了**存储**需求和**冗余**信息，有效避免了 Chunk 之间**丢失**关键**语义**或**句法**结构

![image-20240903003257672](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240903003257672.png)

#### 场景

1. 需要**深入理解语义**并**保持完整上下文**的文档 - 法律文档 / **技术手册** / 科研论文
2. 提升 Chunk 的**内容连贯性**，以提高**分析质量**

#### 问题

1. 增加**计算复杂度**，降低**处理效率**
2. 需要存储和管理**冗余信息**

### Recursive

> 递归分块

#### 概述

1. 通过**预定义**的文本分隔符**迭代**地将文本分解为更小的 Chunk - **段大小的均匀性** + **语义的完整性**
2. 过程 - 按**较大**的逻辑单元分割，然后**逐步递归**到**较小**的逻辑单元
3. 确保在 Chunk 大小内，**保留最强的语义片段**

![image-20240903005751718](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240903005751718.png)

#### 场景

1. 需要**逐层分析**的文档，或者需要分解成**长片段**、长段落的长文档  - 研究报告 / 法律文档

#### 问题

1. 可能在 **Chunk 边界**处**模糊语义**，容易将**完整的语义**单元**切分**开

### Document Specific

> 文档特定分块

#### 概述

1. 根据**文档格式**（Markdown、Code 等）进行**定制化分割**
2. 确保 Chunk 能够**准确反映**文档的特点 - 优化保留了**完整语义**的单元，提升后续处理和分析的效果

![image-20240903010758462](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240903010758462.png)

#### 场景

1. 根据**特定**的文档结构，进行**准确**的语义内容切分

#### 问题

1. **依赖性强**，不同格式之间的 Chunking 策略**不通用**
2. 无法处理**格式不规范**和**混合多种格式**的情况

### Semantic

> 语义分块

#### 概述

1. 基于文本的**自然语言边界**（句子、段落等）进行分段
2. 需要使用 **NLP** 技术根据语义**分词分句**，旨在确保每个 Chunk 都包含**语义连贯**的信息单元
3. 保留了较高的**上下文**信息，并确保每个 Chunk 都包含**连贯**的信息，但需要更多的**计算资源**
4. 常用 NLP 库
   - **spaCy** - 需要**高效**、**精准**语义切分的**大规模**文本处理
   - **NLTK** - 适合**教学**、**研究**和需要**灵活自定义**的语义切分任务

![95687f417dyy2f92ab7c9ca374619acf.png](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/95687f417dyy2f92ab7c9ca374619acf.png.webp)

#### 场景

1. 确保每个 Chunk 的**信息完整**且**语义连贯**
2. 提高**检索结果**的**相关性**和**准确性**
3. 适用于**复杂文档**和**上下文敏感**的**精细化分析**

#### 问题

1. 需要额外的**高计算资源** - 动态或者大型的文档数据
2. 降低**处理效率**

### Mix

> 混合分块

#### 概述

1. 综合利用不同 Chunking 技术的优势，提高 Chunking 的**精确性**和**处理效率**
2. **初始阶段**使用**固定长度**分块**快速**处理大量文档，在**后续阶段**使用**语义分块**进行**更精细**的分类和主题提取

#### 场景

1. **多层次**的**精细化** Chunking 场景
2. 数据集**动态变化**，包含**多种格式和结构**
3. 平衡**处理速度**与**准确性**的场景

#### 问题

1. 实现**复杂度**高
2. **调优**难度高
3. 增加**资源消耗**

## 实践

### LangChain

> langchain_text_splitters

| Chunking          | LangChain Text Splitter                                      |
| ----------------- | ------------------------------------------------------------ |
| Fixed Size        | CharacterTextSplitter                                        |
| Overlap           | CharacterTextSplitter                                        |
| Recursive         | RecursiveCharacterTextSplitter                               |
| Document Specific | MarkdownTextSplitter<br />PythonCodeTextSplitter<br />LatexTextSplitter |
| Semantic          | SpacyTextSplitter<br />NLTKTextSplitter                      |

![image-20240903014314872](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240903014314872.png)

### Dependency

```
$ pip install spacy nltk
$ python -m spacy download zh_core_web_sm
$ python -m spacy download en_core_web_sm
```

### TextSplitter

> SpacyTextSplitter

```python
            # 配置SpacyTextSplitter分割文本块库
            text_splitter = SpacyTextSplitter(
                chunk_size=512, chunk_overlap=128, pipeline="zh_core_web_sm"
            )

            # 配置RecursiveCharacterTextSplitter分割文本块
            # 可以更换为CharacterTextSplitter、MarkdownTextSplitter、PythonCodeTextSplitter、LatexTextSplitter、NLTKTextSplitter等
            # text_splitter = RecursiveCharacterTextSplitter(
            #     chunk_size=512, chunk_overlap=128)
```

# Embedding

## 概述

1. 将**文本**、**图像**、**音频**、**视频**等形式的信息映射到**高维空间**中的**密集向量**表示
2. **嵌入向量**在**语义空间**中起到**坐标**的作用，用于捕捉对象之间的**语义关系**和**隐含意义**
3. 通过在**向量空间**中进行**计算**（如**余弦相似度**），可以量化和衡量对象之间的**语义相似性**
4. **嵌入向量**的**每个维度**通常对应文本的**某种特征**，通过**多维度**的数值表示，计算机能够**理解**并**解析**文本的**复杂语义结构**
5. **向量**是一组在**高维空间**中定义点的**数值数组**，而**嵌入**是将**信息**转化为某种**向量表示**的过程
   - **嵌入向量**能够捕捉数据的**语义**及其它**重要特征**
   - 使得**语义相近**的对象在向量空间中**相距较近**，而**语义相异**的对象则**相距较远**
6. **向量检索**
   - 通过计算 **Query 向量**与 **Chunk 向量**的**相似度**来识别**最相关**的文本数据
   - 非常**高效**，能够在**大规模数据集**中**快速**、**准确**地找到与 Query 最相关的内容 - **向量蕴含丰富语义**

![image-20240903084318722](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240903084318722.png)

## 模型

1. 早期 **word2vec**、**GloVe**、**fastText** 等嵌入模型通过分析大量文本数据，学习得出单词的**嵌入向量**
2. 从 **Transformer** 后，Embedding 发展非常快
   - **BERT**、**RoBERTa**、**ELECTRA** 等模型将 Embedding 推进到**上下文敏感**的阶段
   - **同一个单词**在**不同语境**下的**嵌入向量**是**不同**的，提升了模型**理解复杂语言结构**的能力

## RAG

1. **Embedding Model** 将 **Chunks** 和 **Query** 转换为 **Vectors**
2. **Vectors** 捕捉了文本的**语义信息**，可以在**向量空间**中与其它嵌入向量进行**比较**

![image-20240903085807853](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240903085807853.png)

## 评估

1. 评估维度 - 特定**领域**、检索**精度**、支持**语言**、文本块**长度**、模型**大小**、检索**效率**
2. 评估标准 - 涵盖**分类**、**聚类**、**语义文本相似性**、**重排序**、**检索**等多个数据集的评测
   - **MTEB** - Massive Text Embedding Benchmark
   - **C-MTEB** - Chinese Massive Text Embedding Benchmark
3. 根据不同任务的**需求**，评估并选择**最优**的 Embedding Model，以获得在**特定场景**中的**最佳性能**

![image-20240903091131548](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240903091131548.png)

> https://huggingface.co/spaces/mteb/leaderboard
> RAG 是**检索**任务，按照 **Retrieval Average** 倒排 - 需**实际实验**各种高得分的模型

![image-20240903091617395](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240903091617395.png)

| Metrics              | Desc                                                         |
| -------------------- | ------------------------------------------------------------ |
| Retrieval Average    | 检索平均值                                                   |
| Model Size           | 模型大小（**GB**）<br />模型越大，**检索性能**越好，但**延迟**也越大 |
| Max Tokens           | 最大 Token 数，可**压缩**到**单个 Chunk** 中的最大 Token 数，经验值 **512** |
| Embedding Dimensions | 嵌入向量的维度<br />更少的嵌入维度提供**更快的推理速度**和**更高的存储效率**<br />更多的维度可以捕获数据中的**细微特征** |

## 实践

1. **SentenceTransformer** 模块可以用于**训练和推理 Embedding Model**，可以在 RAG 系统中**计算嵌入向量**
2. 支持的模型列表 - https://www.sbert.net/docs/sentence_transformer/pretrained_models.html
   - Original models - 124
     - https://huggingface.co/models?library=sentence-transformers&author=sentence-transformers
   - Community models - 8557
     - https://huggingface.co/models?library=sentence-transformers
3. 在**中文**领域，**BAAI** 的 **BGE** 系列模型是比较知名的，在 **C-MTEB** 上表现出色
   - https://huggingface.co/collections/BAAI/bge-66797a74476eb1f085c7446d

![image-20240903095158210](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240903095158210.png)

> 加载 Embedding Model

```python
    # 绝对路径：SentenceTransformer读取绝对路径下的bge-small-zh-v1.5模型，如需使用其他模型，下载其他模型，并且更换绝对路径即可
    embedding_model = SentenceTransformer(os.path.abspath('data/model/embedding/bge-large-zh-v1.5'))

    # 自动下载：SentenceTransformer库自动下载BAAI/bge-large-zh-v1.5模型，如需下载其他模型，输入其他模型名称即可
    # embedding_model = SentenceTransformer('BAAI/bge-large-zh-v1.5')
```

> 将 Chunks 转化为 Embeddings

```python
    # 文本块转化为嵌入向量列表，normalize_embeddings表示对嵌入向量进行归一化，用于准确计算相似度
    embeddings = []
    for chunk in all_chunks:
        embedding = embedding_model.encode(chunk, normalize_embeddings=True)
        embeddings.append(embedding)
```

