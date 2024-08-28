---
title: RAG - In Action
mathjax: true
date: 2024-08-03 00:06:25
cover: https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/rag-in-action.webp
categories:
  - AI
  - RAG
tags:
  - AI
  - RAG
  - LLM
---

# 技术选型

## LangChain

1. LangChain 是专门为开发基于 **LLM** 应用而设计的**全面框架**
2. LangChain 的核心目标是**简化**开发者的**构建流程**，使其能够高效地创建 LLM 驱动的应用

<!-- more -->

## 索引

### 文档解析

1. pypdf 专门用于处理 PDF 文档
2. pypdf 支持 PDF 文档的**创建**、**读取**、**编辑**和**转换**，能够有效地提取和处理**文本**、**图像**及**页面**内容

### 文档分块

1. **RecursiveCharacterTextSplitter** 是 **LangChain** 默认的文本分割器
2. RecursiveCharacterTextSplitter 通过**层次化**的分隔符（从**双换行符**到**单字符**）拆分文本
   - 旨在保持文本的**结构**和**连贯性**，优先考虑**自然边界**（如段落和句子）

## 索引 + 检索

### 向量化模型

1. **bge-small-zh-v1.5** 是由北京**智源**人工智能研究院（**BAAI**）开发的**开源**向量模型
2. bge-small-zh-v1.5 的模型**体积较小**，但仍能提供**高精度**和**高效**的**中文**向量检索
3. bge-small-zh-v1.5 的**向量维度**为 **512**，**最大输入长度**同样为 512

### 向量库

1. Faiss - Facebook AI **Similarity Search**
2. Faiss 由 Facebook AI Research **开源**的向量库，非常**稳定**和**高效**

## 生成

### LLM

1. Qwen 是阿里云推出的一款**超大规模**语言模型
2. Qwen 支持**多轮对话**、**文案创造**、**逻辑推理**、**多模态理解**和**语言处理**
3. Qwen 在**模型性能**和**工程应用**中表现出色
4. Qwen 支持**云端 API 服务**

## RAG

![65a9694a63bdb6108504f9586c0a05c0](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/65a9694a63bdb6108504f9586c0a05c0.png)

1. **LangChain**
   - 提供用于构建 **LLM RAG** 的**应用程序框架**
2. 索引流程
   - 使用 **pypdf** 对文档进行**解析**并**提取**信息
   - 采用 **RecursiveCharacterTextSplitter** 对文档内容进行**分块**（**Chunk**）
   - 使用 **bge-small-zh-v1.5** 将 **Chunk** 进行**向量化**处理，并将生成的向量存储到 **Faiss 向量库**中
3. 检索流程
   - 使用 **bge-small-zh-v1.5** 对 **Query** 进行**向量化**处理
   - 通过 **Faiss 向量库**对 **Query 向量**和 **Chunk 向量**进行**相似度匹配**
   - 从而检索出与 **Query** 最相似的 **Top K** 个 **Chunk**
4. 生成流程
   - 设定**提示模板**（**Prompt**）
   - 将 **Query** 与 **Chunk** 填充到**提示模板**，生成**增强提示**，输入到 **Qwen LLM**，生成最终的 RAG 回答

# 开发环境

## 虚拟环境

```
$ python3 -m venv rag_env
$ source rag_env/bin/activate
```

## 安装依赖

```
$ pip install --upgrade pip
$ pip install langchain langchain_community pypdf sentence-transformers faiss-cpu dashscope
```

## 向量化模型

> bge-small-zh-v1.5 - 95.8MB - pytorch_model.bin

```
$ git clone https://huggingface.co/BAAI/bge-small-zh-v1.5

$ du -sh *
367M	bge-small-zh-v1.5
332K	corpus.pdf
4.0K	LICENSE
1.1G	rag_env
4.0K	README.md
```

# 核心代码

## 依赖

```python
from langchain_community.document_loaders import PyPDFLoader  # PDF文档提取
from langchain_text_splitters import RecursiveCharacterTextSplitter  # 文档拆分chunk
from sentence_transformers import SentenceTransformer  # 加载和使用Embedding模型
import faiss  # Faiss向量库
import numpy as np  # 处理嵌入向量数据，用于Faiss向量检索
import dashscope  # 调用Qwen大模型
from http import HTTPStatus  # 检查与Qwen模型HTTP请求状态

import os

# 不使用分词并行化操作, 避免多线程或多进程环境中运行多个模型引发冲突或死锁
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# 设置Qwen系列具体模型及对应的调用API密钥，从阿里云百炼大模型服务平台获得
qwen_model = "qwen-turbo"
qwen_api_key = "your_api_key"
```

![image-20240828141919941](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240828141919941.png)

## 索引

### Embedding

> SentenceTransformer - map **sentences / text** to **embeddings**

```python
def load_embedding_model():
    """
    加载bge-small-zh-v1.5模型
    :return: 返回加载的bge-small-zh-v1.5模型
    """
    print(f"加载Embedding模型中")
    # SentenceTransformer读取绝对路径下的bge-small-zh-v1.5模型，非下载
    embedding_model = SentenceTransformer(os.path.abspath('bge-small-zh-v1.5'))
    print(f"bge-small-zh-v1.5模型最大输入长度: {embedding_model.max_seq_length}")  # 512
    return embedding_model
```

### Indexing

> chunk_size + chunk_overlap

1. **chunk_size**
   - 对输入文本序列进行**切分**的**最大长度**
   - GPT-3 的最大输入长度为 **2048** 个 **Token**
2. **chunk_overlap**
   - 相邻的两个 Chunk 之间的**重叠 Token 数量**
   - 为了保证**文本语义**的**连贯性**，相邻 Chunk 会有一定的重叠
3. chunk_size = 1024，chunk_overlap = 128，对于长度为 2560 **Token** 的文本序列，会切分成 3 个 Chunk
   - **1 ~ 1024** = 1024
   -  **897~1920** = 1024
   - **1793~2560** = 768

> 索引

```python
def indexing_process(pdf_file, embedding_model):
    """
    索引流程：加载PDF文件，并将其内容分割成小块，计算这些小块的嵌入向量并将其存储在FAISS向量数据库中。
    :param pdf_file: PDF文件路径
    :param embedding_model: 预加载的嵌入模型
    :return: 返回FAISS嵌入向量索引和分割后的文本块原始内容列表
    """
    # PyPDFLoader加载PDF文件，忽略图片提取
    pdf_loader = PyPDFLoader(pdf_file, extract_images=False)
    # 配置RecursiveCharacterTextSplitter分割文本块库参数
    # 每个文本块的大小为512字符（非token），相邻文本块之间的重叠128字符（非token）
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=512, chunk_overlap=128)

    # 加载PDF文档,提取所有页的文本内容
    pdf_content_list = pdf_loader.load()
    # 将每页的文本内容用换行符连接，合并为PDF文档的完整文本
    pdf_text = "\n".join([page.page_content for page in pdf_content_list])
    print(f"PDF文档的总字符数: {len(pdf_text)}")  # 9135

    # 将PDF文档文本分割成文本块Chunk
    chunks = text_splitter.split_text(pdf_text)
    print(f"分割的文本Chunk数量: {len(chunks)}")  # 24 ≈ 9135 / (512-128)

    # 文本块转化为嵌入向量列表，normalize_embeddings表示对嵌入向量进行归一化，用于准确计算相似度
    embeddings = []
    for chunk in chunks:
        embedding = embedding_model.encode(chunk, normalize_embeddings=True)
        embeddings.append(embedding)

    print("文本块Chunk转化为嵌入向量完成")

    # 将嵌入向量列表转化为numpy数组，FAISS索引操作需要numpy数组输入
    embeddings_np = np.array(embeddings)

    # 获取嵌入向量的维度（每个向量的长度）
    dimension = embeddings_np.shape[1]  # 512

    # 使用余弦相似度创建FAISS索引
    index = faiss.IndexFlatIP(dimension)
    # 将所有的嵌入向量添加到FAISS索引中，后续可以用来进行相似性检索
    index.add(embeddings_np)

    print("索引过程完成.")

    return index, chunks
```

1. 使用 PyPDFLoader 加载并预处理 PDF 文档，将其内容提取并合并为**完整文本**
2. 利用 RecursiveCharacterTextSplitter 将文本分割为每块 512 字符（非 Token）、重叠 128 字符（非 Token）的**文本块**
3. 通过预加载的 bge-small-zh-v1.5 嵌入模型将**文本块**转化为**归一化**的**嵌入向量**
4. 将**嵌入向量**存储在基于**余弦相似度**的 **Faiss 向量库**中，以支持后续的**相似性检索**和**生成**任务

> 余弦相似度 - Cosine Similarity - 在 N 维空间中，两个 N 维向量之间角度的余弦 - **值越大越相似**

$$
Similarity(A,B) = \frac{A\cdot{B}}{\|A\|\times\|B\|} = \frac{\sum_{i=1}^n(A_i\times{B_i})}{\sqrt{\sum_{i=1}^n{A_i^2}}\times\sqrt{\sum_{i=1}^n{B_i^2}}}
$$

> 待优化项

1. **多文档**处理
2. **嵌入模型**的**效率优化**与**并行处理**
3. **Faiss** 采用**持久化**存储 - 目前仅在**内存**中存储

## 检索

```python
def retrieval_process(query, index, chunks, embedding_model, top_k=3):
    """
    检索流程：将用户查询Query转化为嵌入向量，并在Faiss索引中检索最相似的前k个文本块。
    :param query: 用户查询语句
    :param index: 已建立的Faiss向量索引
    :param chunks: 原始文本块内容列表
    :param embedding_model: 预加载的嵌入模型
    :param top_k: 返回最相似的前K个结果
    :return: 返回最相似的文本块及其相似度得分
    """
    # 将查询转化为嵌入向量，normalize_embeddings表示对嵌入向量进行归一化
    query_embedding = embedding_model.encode(query, normalize_embeddings=True)
    # 将嵌入向量转化为numpy数组，Faiss索引操作需要numpy数组输入
    query_embedding = np.array([query_embedding])

    # 在 Faiss 索引中使用 query_embedding 进行搜索，检索出最相似的前 top_k 个结果。
    # 返回查询向量与每个返回结果之间的相似度得分（在使用余弦相似度时，值越大越相似）
    # 排名列表distances，最相似的 top_k 个文本块在原始 chunks 列表中的索引indices。
    distances, indices = index.search(query_embedding, top_k)

    print(f"查询语句: {query}")
    print(f"最相似的前{top_k}个文本块:")

    # 输出查询出的top_k个文本块及其相似度得分
    results = []
    for i in range(top_k):
        # 获取相似文本块的原始内容
        result_chunk = chunks[indices[0][i]]
        print(f"文本块 {i}:\n{result_chunk}")

        # 获取相似文本块的相似度得分
        result_distance = distances[0][i]
        print(f"相似度得分: {result_distance}\n")

        # 将相似文本块存储在结果列表中
        results.append(result_chunk)

    print("检索过程完成.")
    return results
```

1. Query 被预加载的 bge-small-zh-v1.5 嵌入模型转化为归一化的**嵌入向量**
   - 进一步转换为 **numpy 数组**以适配 Faiss 向量库的输入格式
2. 利用 Faiss 向量库中的**向量检索**功能
   - 计算 Query 与存储向量之间**余弦相似度**，从而筛选出与 Query **最相似**的 **Top K** 个文本块
3. 相似文本块存储在结果列表中，供后续**生成**过程使用

## 生成

```python
def generate_process(query, chunks):
    """
    生成流程：调用Qwen大模型云端API，根据查询和文本块生成最终回复。
    :param query: 用户查询语句
    :param chunks: 从检索过程中获得的相关文本块上下文chunks
    :return: 返回生成的响应内容
    """
    # 设置Qwen系列具体模型及对应的调用API密钥，从阿里云大模型服务平台百炼获得
    llm_model = qwen_model
    dashscope.api_key = qwen_api_key

    # 构建参考文档内容，格式为“参考文档1: \n 参考文档2: \n ...”等
    context = ""
    for i, chunk in enumerate(chunks):
        context += f"参考文档{i + 1}: \n{chunk}\n\n"

    # 构建生成模型所需的Prompt，包含用户查询和检索到的上下文
    prompt = f"根据参考文档回答问题：{query}\n\n{context}"
    print(f"生成模型的Prompt: {prompt}")

    # 准备请求消息，将prompt作为输入
    messages = [{'role': 'user', 'content': prompt}]

    # 调用大模型API云服务生成响应
    try:
        responses = dashscope.Generation.call(
            model=llm_model,
            messages=messages,
            result_format='message',  # 设置返回格式为"message"
            stream=True,  # 启用流式输出
            incremental_output=True  # 获取流式增量输出
        )
        # 初始化变量以存储生成的响应内容
        generated_response = ""
        print("生成过程开始:")
        # 逐步获取和处理模型的增量输出
        for response in responses:
            if response.status_code == HTTPStatus.OK:
                content = response.output.choices[0]['message']['content']
                generated_response += content
                print(content, end='')  # 实时输出模型生成的内容
            else:
                print(f"请求失败: {response.status_code} - {response.message}")
                return None  # 请求失败时返回 None
        print("\n生成过程完成.")
        return generated_response
    except Exception as e:
        print(f"大模型生成过程中发生错误: {e}")
        return None
```

1. 结合 Query 与检索到的文本块组织成 **LLM Prompt**
2. 调用 Qwen 云端 API，将 Prompt 发送给 LLM
3. 利用**流式**输出的方式逐步获取 LLM 生成的响应内容，**实时**输出并汇总成最终的生成结果

> 输出

```
生成过程开始:
参考文档中涉及的案例及其面临的挑战如下：

1. **金融业**：
   - **挑战**：银行面临的主要挑战包括客户服务模式过时（主要依赖实体网点，服务效率低、客户体验差），金融科技企业的竞争压力（凭借创新技术和便捷服务吸引大量客户，尤其是年轻一代），以及数据孤岛和风险管理滞后（各业务部门缺乏数据共享机制，信息无法整合，风险管理效率低）。

2. **制造业**：
   - **挑战**：制造业面临的主要挑战包括生产效率低、易出错，供应链管理复杂（涉及多个国家和地区，信息传递不及时，造成库存管理困难，甚至存在供应链断裂的风险），以及无法满足市场对个性化定制产品的需求（传统大规模生产方式无法适应）。

3. **零售业**：
   - **挑战**：零售业面临的主要挑战是线上线下渠道割裂（导致库存管理不统一、客户体验不一致，难以提供无缝购物体验），以及数据利用率低（尽管拥有大量消费者和销售数据，但缺乏先进的数据分析工具，未能转化为可操作的商业洞察）。

对于每个行业，数字化转型解决方案通常包括：
- **金融业**：构建数字化银行平台，推出移动银行应用、在线服务、虚拟客服和智能理财顾问，同时引入人工智能和大数据分析技术以提升服务便捷性、客户满意度和风险管理能力。
- **制造业**：引入工业4.0技术（如物联网、人工智能、大数据分析和机器人自动化）以优化生产线，构建基于云计算的智能供应链管理系统实现供应链的端到端可视化管理。
- **零售业**：构建全渠道零售平台实现线上与线下购物渠道的无缝整合，引入大数据和人工智能驱动的分析平台以精准预测需求、优化库存，并提供个性化产品推荐和营销活动。
生成过程完成.
```

