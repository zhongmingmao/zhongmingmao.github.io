---
title: LLM - LangChain + RAG
mathjax: false
date: 2024-06-27 00:06:25
cover: https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/rag.webp
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
---

# 局限

> 大模型的核心能力 - **意图理解** + **文本生成**

| 局限                         | 描述                                                         |
| ---------------------------- | ------------------------------------------------------------ |
| 数据的**及时性**             | 大部分 AI 大模型都是**预训练**的，如果要问一些最新的消息，大模型是不知道的 |
| **复杂任务**处理             | AI 大模型在**问答**方面表现出色，但不总是能够处理复杂任务<br />AI 大模型主要是基于**文本**的交互（**多模态**除外） |
| **代码**生成与下载           | 根据需求描述生成对应的代码，并提供下载链接 - 暂时不支持      |
| 与**企业应用**场景的**集成** | 读取关系型数据库里面的数据，并根据提示进行任务处理 - 暂时不支持 |

1. 在实际应用过程中，输入数据和输出数据，不仅仅是纯文本
2. **AI Agent** - 需要**解析**用户的输入输出

<!-- more -->

# AI Agent

> AI Agent 是以 LLM 为**核心控制器**的一套**代理**系统

![b6651abc9df589fe238fe79e33677a36.png](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/b6651abc9df589fe238fe79e33677a36.png.webp)

1. 控制端处于**核心**地位，承担**记忆**、**思考**以及**决策**等基础工作
2. 感知模块负责**接收**和**处理**来自于外部环境的多样化信息 - 文字、声音、图片、位置等
3. 行动模块通过生成文本、API 调用、使用工具等方式来**执行任务**以及**改变环境**

> LangChain - **开源** + 提供一整套围绕 LLM 的 **Agent 工具**

1. AI Agent 很有可能在未来一段时间内成为 AI 发展的一个重要方向
2. **LLM** 是**大厂的游戏** - 除非能开发出能够**低成本训练和推理**的 LLM
3. **AI Agent** 是**普通玩家**可以入局的

# LangChain

1. 一开始，LangChain 只是一个**技术框架**，可以快速开发 AI 应用
   - 不需要储备太多算法知识，只需要知道如何与 LLM 进行交互即可 - API 接口和参数
2. 至今，LangChain 成为了一个 **AI 应用开发平台**，包含 4 大组件

![star-history-2024814](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/star-history-2024814.png)

## 核心组件

> LangChain 是当下**最火**的 AI Agent 技术框架，使用 **MIT** 开源协议

| Component | Desc                                                         | ≈                        |
| --------- | ------------------------------------------------------------ | ------------------------ |
| LangChain | LLM **应用开发框架**                                         | SpringCloud              |
| LangSmith | 统一的 **DevOps** 平台<br />也是一套 **Agent DevOps 规范**，可以应用于其它框架 | K8S + GitLab CI/CD + ... |
| LangServe | 用于**部署** LangChain 应用程序，并提供 **API 管理能力**     | APISIX                   |
| LangGraph | 用于使用 LLM 构建**有状态**、**多参与者**应用程序的库        | Nacos                    |

## 技术架构

| Module              | Desc                                     |
| ------------------- | ---------------------------------------- |
| LangChain-Core      | 基础抽象 + LangChain 表达式语言          |
| LangChain-Community | 第三方集成                               |
| LangChain           | 构成应用程序认知架构的链、代理、检索策略 |

![image-20240814150218300](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240814150218300.png)

### Model I/O

> 主要与 **LLM** 打交道

![image-20240814150744886](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240814150744886.png)

1. 主要组成部分：**Format + Predict + Parse**
2. LLM 可以理解为只接受**文本输入**和**文本输出**的模型
3. LangChain 中的 LLM 是**纯文本补全**模型，不包含**多模态**模型

#### Format

1. 在把数据输入到 LLM 之前，无论数据来自于搜索引擎、**向量数据库**还是接口
2. 都必须先对数据进行格式化，转换成 LLM 能**理解**的格式

#### Predict

1. LangChain **原生支持**的丰富 **API**，可以实现对各个 LLM 的调用

#### Parse

1. 对 LLM 返回的文本内容进行解析
2. 随着**多模态**模型的日益成熟，未来会实现对多模态模型输出结构的解析

### Retrieval

> 从各种数据源中**抓取数据**，进行**词向量化**、**向量数据存储**、**向量数据检索**

![image-20240814153637472](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240814153637472.png)

### Agents

1. Agents 是指实现**具体任务**的模块，如从某个第三方接口获取数据，用作 LLM 的输入
2. LangChain **原生支持**多种类型的 Agents，可以根据实际需要进行**自定义**

### Chains

1. Chains 为**顺序调用**，类似于 **Linux Pipelines** - 文件处理链条、SQL 查询链条、搜索链条
2. LangChain Chains **主要**通过 **LangChain 表达式**实现 - **LCEL** - LangChain Expression Language
3. 一些底层的 Chains 并没有通过 LCEL 实现，而是通过 **LegacyChain**

### Memory

![image-20240814192502410](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240814192502410.png)

1. Memory 指 LLM 的一些输入和输出，包含**历史**对话信息，可以放入**缓存**，提升**性能**
2. 使用流程
   - 在执行核心逻辑之前先查询缓存，如果查询到则直接使用
   - 在执行完核心逻辑，返回给用户前，将内容写入缓存，方便后面使用

### Callbacks

> LangChain 针对各个**组件**提供**回调**机制 - 链条、模型、代理、工具等

| Callback         | Desc                                   |
| ---------------- | -------------------------------------- |
| **构造函数**回调 | 只适用于**对象本身**                   |
| **请求**回调     | 适用于**对象本身**以及其**所有子对象** |

### LCEL

> LCEL 用于**构建 Chains**

```python
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

prompt = ChatPromptTemplate.from_template("tell me a short joke about {topic}")
model = ChatOpenAI(model="gpt-4")
output_parser = StrOutputParser()

chain = prompt | model | output_parser

chain.invoke({"topic": "ice cream"})
```

1. Chains 与 Linux Pipelines 类似，通过 `|` 来连接不同组件，构成复杂 Chains，以实现特定功能
2. 每个组件的输出会作为下一个组件的输入，直到最后一个组件执行完

> 可以通过 LCEL 将多个 Chains 关联在一起

```python
chain1 = prompt1 | model | StrOutputParser()
chain2 = (
    {"city": chain1, "language": itemgetter("language")}
    | prompt2
    | model
    | StrOutputParser()
)
chain2.invoke({"person": "obama", "language": "spanish"})
```

## 核心思想

1. **LLM** 是**核心控制器**，所有的操作都是围绕 LLM 的输入和输出在进行
2. **Chains** 可以将一系列组件串起来进行功能叠加 - **逻辑抽象** + **组件复用**

# RAG

## 知识滞后

1. LLM 是基于**预训练**的，一般 LLM 的训练周期为 1~3 个月
2. 因为**成本**过高，所以 LLM 注定不可能频繁更新知识 - **知识滞后** - GPT-4 为 2023.12
3. 如果想 LLM 能够**理解**数据，或者将数据喂给 LLM 做**推理**时，必须进行 **RAG**

## 技术流程

> 通过 RAG 让 LLM 支持**最新**的知识索引 - 使用最新的知识进行**推理**

![image-20240814194840237](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240814194840237.png)

1. 任务 1
   - 通过网络爬虫，爬取大量信息
   - 与搜索引擎的数据爬取过程一样，但不涉及 Page Rank
   - 只是纯粹的**知识爬取**，并**向量化存储** - 最新数据
2. 任务 2
   - 用户提问时，先将**问题向量化**
   - 然后在**向量库**里检索，将检索到的信息构建成**提示**，喂给 LLM，LLM 处理完后进行输出

> 也可以**实时调用**搜索引擎的接口，获取最新数据，然后**向量化**后喂给 LLM

### 向量化

1. 向量化 - 将**语言**通过**数学**的方式进行表达
2. 生成的**向量数据**取决于使用的 **Embedding** 模型

### 向量存储

1. 将向量化后的数据存储在向量数据库中
2. 常见的向量数据库 - **Faiss + Milvus**
