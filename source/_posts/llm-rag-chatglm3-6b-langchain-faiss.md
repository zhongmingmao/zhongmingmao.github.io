---
title: LLM RAG - ChatGLM3-6B + LangChain + Faiss
mathjax: false
date: 2024-06-30 00:06:25
cover: https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/rag.jpg
categories:
  - AI
  - LLM
tags:
  - AI
  - LLM
  - NLP
  - LangChain
  - AI Agent
  - RAG
  - Faiss
---

# RAG

> 使用**知识库**，用来增强 LLM **信息检索**的能力

1. **知识准确**
   - 先把**知识**进行**向量化**，存储到**向量数据库**中
   - 使用的时候通过**向量检索**从向量数据库中将知识检索出来，确保知识的准确性
2. **更新频率快**
   - 当发现知识库里面的**知识不全**时，可以**随时补充**
   - 不需要像**微调**一样，重新跑**微调**任务、**验证**结果、重新**部署**等

<!-- more -->

# 应用场景

> ChatOps

1. **知识库模式**适用于**相对固定**的场景做**推理**
2. 如企业内部使用的**员工小助手**，不需要太多的**逻辑推理**
3. 使用知识库模式**检索精度高**，且可以**随时更新**
4. **LLM 基础能力 + Agent** 进行**堆叠**，可以产生**智能化**的效果

# LangChain-Chatchat

## 组成模块

| 模块           | 作用                                       | 支持列表                          |
| -------------- | ------------------------------------------ | --------------------------------- |
| 大语言模型     | 智能体**核心引擎**                         | ChatGLM / Qwen / Baichuan / LLaMa |
| Embedding 模型 | **文本向量化**                             | m3e-* / bge-*                     |
| 分词器         | 按照规则将**句子**分成**短句**或者**单词** | LangChain Text Splitter           |
| 向量数据库     | 向量化数据存储                             | Faiss / Milvus                    |
| Agent Tools    | 调用第三方**接口**                         | 天气查询 / 搜索引擎查询           |
| API            | 智能体对外暴露的 API                       | FastAPI                           |
| WebUI          | 操作界面                                   |                                   |

## 核心流程

> 1~7 - 完成**文档向量化存储**的过程
> 8~15 - 完成**知识检索**的过程

![langchain+chatglm](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/langchain+chatglm.png)

# 系统部署

## 安装依赖

```
$ git clone https://github.com/chatchat-space/Langchain-Chatchat.git
$ git checkout v0.2.10

$ pip3 install -r requirements.txt
$ pip3 install -r requirements_api.txt
$ pip3 install -r requirements_webui.txt

$ pip3 install faiss-gpu
```

## 下载模型

> 下载 Embedding 模型 - bge-large-zh-v1.5

```
$ git clone https://www.modelscope.cn/AI-ModelScope/bge-large-zh-v1.5.git

$ du -sh *
4.9G	bge-large-zh-v1.5
47G	ChatGLM3
201M	Langchain-Chatchat
```

## 参数配置

> 将配置文件复制到 config 目录

```
$ python3 copy_config_example.py

$ tree configs/
configs/
├── basic_config.py
├── basic_config.py.example
├── __init__.py
├── kb_config.py
├── kb_config.py.example
├── model_config.py
├── model_config.py.example
├── prompt_config.py
├── prompt_config.py.example
├── server_config.py
└── server_config.py.example
```

| 配置文件         | 作用                                         |
| ---------------- | -------------------------------------------- |
| basic_config.py  | 记录**日志**的格式和存储路径，一般不需要修改 |
| kb_config.py     | **分词器**、**向量库**的配置                 |
| model_config.py  | **模型**的配置                               |
| prompt_config.py | 不同种类的问答提示词设置                     |
| server_config.py | 服务器 IP、端口、模型名称等                  |

> 大部分不需要修改，在 model_config.py 中指定 **LLM** 模型和 **Embedding** 模型的路径即可

```python
MODEL_PATH = {
    "embed_model": {
        ...
        "bge-large-zh-v1.5": "/home/ubuntu/bge-large-zh-v1.5",
        ...
    },

    "llm_model": {
        ...
        "chatglm3-6b": "/home/ubuntu/ChatGLM3/model",
        ...
    },
}
```

## 向量数据

> 初始化向量数据库 - 加载示例数据

```
$ python3 init_database.py --recreate-vs
```

> 一键启动

```
$ python3 startup.py -a
```

![image-20240817143753893](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240817143753893.png)

> Web UI

![image-20240817144100229](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240817144100229.png)

# 知识管理

## 新建知识库

![image-20240817144215482](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240817144215482.png)

## 上传知识文件

> 将文档存入**向量库**内，供**对话时检索**

![image-20240817144337500](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240817144337500.png)

## Open API

> 可以通过 **API** 进行**知识库管理**、**对话**以及**查看服务器信息**等操作

![image-20240817113448837](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240817113448837.png)

## GPU

![image-20240817151034198](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240817151034198.png)

## 效果观测

### LLM

![image-20240817151134141](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240817151134141.png)

### 知识库

> 即获得了 **LLM** 的输出，也获得了**知识库**的输出
> 可以把从知识库中**检索**到的信息输入到 **LLM**， LLM 会进行**上下文理解**，然后**整理**后输出

![image-20240817152033179](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240817152033179.png)

## Tools

> 天气查询 - configs/kb_config.py - SENIVERSE_API_KEY

![image-20240817153840507](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240817153840507.png)

1. 这是一个典型的 RAG 案例，通过 **API** 调用第三方服务，扩大**信息检索范围**
2. 可以将企业的内部数据或者产品数据通过 API 喂给大模型，为产品增加 AI 能力，提升竞争力

# 向量数据库

## 向量

1. 向量是由一系列**数字**组成的**数组**
2. 这些数字可以**表示任何东西**

## 相似度计算

1. 电影推荐 - 计算**用户喜好向量**和**电影评分向量**之间的**相似度**
2. 在**向量空间**中，通常是计算向量之间的**距离**，如**欧氏距离**或者**余弦相似度**
3. 距离**越小**，相似度**越高**

> 余弦相似度

```python
import numpy as np


# 定义计算余弦相似度的函数
def calculate_similarity(vector1, vector2):
    # 使用numpy库来计算余弦相似度
    dot_product = np.dot(vector1, vector2)
    norm_vector1 = np.linalg.norm(vector1)
    norm_vector2 = np.linalg.norm(vector2)
    similarity = dot_product / (norm_vector1 * norm_vector2)
    return similarity


# 假设我们有一个向量代表用户偏好
user_preference = np.array([10, 5, 10, 4])
# 我们有一系列电影向量
movie_vectors = np.array([
    [8, 7, 9, 6],  # 电影A
    [9, 6, 8, 7],  # 电影B
    [10, 5, 7, 8]  # 电影C
])

# 计算并打印每部电影与用户偏好之间的相似度
for i, movie_vector in enumerate(movie_vectors):
    similarity = calculate_similarity(user_preference, movie_vector)
    print(f"电影{chr(65 + i)}与用户偏好的相似度为: {similarity:.2f}")
```

```
电影A与用户偏好的相似度为: 0.97
电影B与用户偏好的相似度为: 0.97
电影C与用户偏好的相似度为: 0.95
```

## 文本向量

1. 在 NLP 中，一个词的**向量值**是通过在**大量文本**上**训练得到**的
2. 一个词的向量值取决于它是**如何被训练**的，以及**训练数据的性质**
   - 在不同的 **Word2Vec** 模型中，即使是**相同的词**，**向量值**也可能**完全不同**
   - 因为可能基于**不同的文本集**或者使用**不同的参数训练**

## Word2Vec

> 常见的 **Word2Vec** 模型会生成**几百维**的向量

```python
import numpy as np
from gensim.models import KeyedVectors

model = KeyedVectors.load_word2vec_format('word2vec-google-news-negative-300-bin/GoogleNews-vectors-negative300.bin',
                                          binary=True)


def cosine_similarity(vec_a, vec_b):
    # 计算两个向量的点积
    dot_product = np.dot(vec_a, vec_b)
    # 计算每个向量的欧几里得长度
    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)
    # 计算余弦相似度
    return dot_product / (norm_a * norm_b)


# 获取man和boy两个词的向量
man_vector = model['man']
boy_vector = model['boy']

# 打印出这两个向量的前10个元素
print(man_vector[:10])
print(boy_vector[:10])
similarity_man_boy = cosine_similarity(man_vector, boy_vector)
print(f"男人和男孩的相似度: {similarity_man_boy}")
```

> 程序输出

```python
[ 0.32617188  0.13085938  0.03466797 -0.08300781  0.08984375 -0.04125977
 -0.19824219  0.00689697  0.14355469  0.0019455 ]
[ 0.23535156  0.16503906  0.09326172 -0.12890625  0.01599121  0.03613281
 -0.11669922 -0.07324219  0.13867188  0.01153564]
男人和男孩的相似度: 0.6824870705604553
```

1. 不同的**模型**、不同的**训练数据集**、不同的**训练参数**，都会产生不同的**词向量**
2. 在进行**信息检索**的时候
   - **传统数据库**通过 **like** 去检索相似的内容
   - **向量数据库**通过**向量相似度**去检索相似的内容 - **多维度比较**

## 向量存储

1. 存储向量数据有专门的向量数据库 - **Faiss / Milvus**
2. 向量数据库专门被设计用于存储和检索向量数据
   - 适用 - 处理**词向量**、**图片特征向量**或者任何其它形式的**高维数据**
3. 当**数据量非常大**的时候，同样会遇到**性能**和**稳定性**的问题
4. 对于向量数据库，主要挑战为**多维度**的存储
   - 随着**数据维度的增加**，向量之间的**距离**变得**难以区分**
   - 让寻找**最近邻居**变得更加困难和耗时，也会增加**存储**和**搜索**时所需要的资源

> 安装 Faiss 依赖

```
$ pip3 install faiss-cpu
```

```python
print(len(man_vector))  # 300
print(len(boy_vector))  # 300

dimension = 300  # 向量维度
word_vectors = np.array([
    man_vector,  # 'man'的向量
    boy_vector,  # 'boy'的向量
]).astype('float32')  # Faiss要求使用float32

# 创建一个用于存储向量的索引
# 这里使用的是L2距离（欧氏距离），如果你需要使用余弦相似度，需要先规范化向量
index = faiss.IndexFlatL2(dimension)

# 添加向量到索引
index.add(word_vectors)

# 假设我们想找到与'new_man'（新向量）最相似的5个向量
new_man = np.array([man_vector]).astype('float32')  # 新的查询向量
k = 5  # 返回最相似的5个向量
D, I = index.search(new_man, k)  # D是距离的数组，I是索引的数组

# 打印出最相似的向量的索引
print(I)
```

> 程序输出

```
300
300
[[ 0  1 -1 -1 -1]]
```
