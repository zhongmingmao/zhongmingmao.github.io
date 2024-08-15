---
title: LLM - ChatGLM3-6B
mathjax: false
date: 2024-06-28 00:06:25
cover: https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/chatglm3-6b.png
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

# LLM 选择

## 核心玩家

> 厂家很多，但没多少真正在研究技术 - 成本 - 不少厂商是基于 **LLaMA** 套壳

![image-20240815080217105](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240815080217105.png)

<!-- more -->

## ChatGLM-6B

1. **ChatGLM-6B** 和 **LLaMA2** 是比较热门的开源项目，**国产** LLM 是首选
2. 企业布局 LLM
   - 选择 **MaaS** 服务，调用大厂 LLM API，但会面临**数据安全**问题
   - 选择**开源 LLM**，自己**微调**、**部署**、为上层应用提供服务
3. 企业一般会选择**私有化部署** + **公有云 MaaS** 的混合架构
4. 在**国产**厂商中，从**技术**角度来看，**智谱 AI** 是国内 LLM **研发水平最高**的厂商
5. 6B 的参数规模为 **62 亿**，单张 **3090** 显卡就可以进行**微调**和**推理**
6. 企业预算充足（**百万**以上，**GPU 费用** + **商业授权**）
   - 可以尝试 **GLM-130B**，**千亿**参数规模，**推理**能力更强
   - GLM-130B **轻量化**后，可以在 **3090 × 4** 上进行**推理**
   - 训练 GLM-130B 大概需要 96 台 A100（320G），历时两个多月

![image-20240815081907748](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240815081907748.png)

# 计算资源

1. 适合 CPU 计算的 LLM 不多
   - 有些 LLM 可以在 **CPU** 上进行**推理**，但需要使用**低精度轻量化**的 LLM
   - 但在低精度下，LLM 会**失真**，效果较差
2. 要真正体验并应用到实际项目，需要 **GPU**

# ChatGLM3-6B

## 简介

1. ChatGLM-6B 目前已经发展到**第 3 代** ChatGLM3-6B - **中英文推理** + **数学** + **代码**等推理能力
2. 在<u>语义、数学、推理、代码、知识</u>等不同角度的数据集上测评
   - **ChatGLM3-6B-Base** 在 **10B 以下**的**基础模型**中是**性能最强**的
3. 除此之外，还具有 **8K、32K、128K** 等多个**长文本**理解能力版本

## 环境

| Key          | Value                  |
| ------------ | ---------------------- |
| OS           | Ubuntu / CentOS        |
| Python       | 3.10～3.11             |
| Transformers | 4.36.2                 |
| Torch        | ≥ 2.0 - 最佳的推理性能 |

> 算力

| Key        | Value                       |
| ---------- | --------------------------- |
| CPU 运行   | 内存 ≥ 32GB - 很慢，不推荐  |
| 低精度运行 | 内存 ≥ 8GB 显存 ≥ **5GB**   |
| 高精度运行 | 内存 ≥ 16GB 显存 ≥ **13GB** |

## 代码

```
$ git clone https://github.com/THUDM/ChatGLM3
```

## 依赖

```
$ cd ChatGLM3
$ pip install -r requirements.txt
```

![image-20240815233929736](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240815233929736.png)

## Git

> Git Large File Storage

```
$ sudo apt-get install git-lfs
$ git lfs install
```

## 模型

```
$ git clone https://huggingface.co/THUDM/chatglm3-6b
$ du -sh chatglm3-6b/
47G     chatglm3-6b/
```

## 启动

### 命令行

> 修改 basic_demo/cli_demo.py

```python
MODEL_PATH = os.environ.get('MODEL_PATH', '../chatglm3-6b')
```

```
$ cd basic_demo/
$ python3 cli_demo.py
```

![image-20240816012418015](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240816012418015.png)

### Web Console

> 修改 basic_demo/web_demo_gradio.py

```python
MODEL_PATH = os.environ.get('MODEL_PATH', '../chatglm3-6b')
...
demo.launch(server_name="172.19.0.5", server_port=7870, inbrowser=True, share=True)
```

> python3 web_demo_gradio.py

![image-20240816013110982](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240816013110982.png)

![image-20240816013236394](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240816013236394.png)

### Composite

> 支持 **Chat、Tool、Code Interpreter**

```
$ cd composite_demo
$ pip install -r requirements.txt
$ export MODEL_PATH=../chatglm3-6b

$ streamlit run main.py
Collecting usage statistics. To deactivate, set browser.gatherUsageStats to false.

  You can now view your Streamlit app in your browser.

  Local URL: http://localhost:8501
  Network URL: http://172.19.0.5:8501
  External URL: http://43.129.218.160:8501
```

![image-20240816015253345](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240816015253345.png)

## 精度

1. 默认情况下，模型以 **FP16** 精度加载，大概需要 **13GB 显存**
2. 也可以通过 **CPU** 启动，大概需要 **32GB 内存**
3. 如果显存不足，可以在 **4-bit** 量化下运行，大概需要 **6GB 显存**

![image-20240816013525197](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240816013525197.png)

## 超参数

1. 超参数用来控制模型的**推理准确度**
2. LLM 推理每次给的回答可能都不一样，因此 LLM 不能用于处理**精确度要求很高**的任务

> ChatGLM3-6B

| Parameter   | Value                                                        |
| ----------- | ------------------------------------------------------------ |
| max_length  | 模型的总 Token 限制 - 输入和输出                             |
| temperature | 模型的温度 - 调整**单词的概率分布**<br />在**较低温度**下，模型**更具有确定性** - <u>数字越小，给出的答案越精确</u> |
| top_p       | 模型**采样策略**参数<br />每一步只从**累计概率**超过某个阈值 p 的最小单词集合中进行**随机**采样<br />不考虑其它**低概率**的词，只关注分布的**核心**部分，忽略**尾部** |

![image-20240816020235518](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240816020235518.png)

## Prompt

> 在对话场景中，有且仅有三种角色

| Role      | Desc                                                     |
| --------- | -------------------------------------------------------- |
| system    | 系统信息，出现在消息的最前面，可以**指定回答问题的角色** |
| user      | 我们提出的问题                                           |
| assistant | LLM 给出的回复                                           |

> 在代码场景中，有且仅有 user、assistant、system、observation 四种角色

1. observation 是**外部返回的结果** - 调用外部 API、代码执行逻辑等返回结果
2. <u>observation 必须放在 assistant 之后</u>

```
<|system|>
Answer the following questions as best as you can. You have access to the following tools:
[
    {
        "name": "get_current_weather",
        "description": "Get the current weather in a given location",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "The city and state, e.g. San Francisco, CA",
                },
                "unit": {"type": "string"},
            },
            "required": ["location"],
        },
    }
]
<|user|>
今天北京的天气怎么样？
<|assistant|>
好的，让我们来查看今天的天气
<|assistant|>get_current_weather


```python
tool_call(location="beijing", unit="celsius")

<|observation|>
{"temperature": 22}
<|assistant|>
根据查询结果，今天北京的气温为 22 摄氏度。
```

1. 当前阶段的 LLM 经过训练后，都可以**遵循系统消息**
2. **系统消息**不算用户对话的一部分，**与用户隔离**
3. **系统消息**可以控制 **LLM** 与**用户**的**交互范围**
   - 在 system 角色指定模型充当 Java 技术专家
   - 则可以指导 LLM 的输出**偏向**于 Java 技术范围
4. 可以**防止**用户进行**输入注入攻击**
   - 在进行多轮对话时，每次新的对话都会把**历史对话**带进去
   - 如果在前面的对话中，告诉 LLM **错误的提示**
     - 那么这些错误的提示会在后续的对话中被当成**正确的上下文**带进去
   - 基于**自回归**的模型，会根据**上下文**进行**内容推理**，因此可能会生成**错误内容**
   - 角色可以<u>使内容更加容易区分</u>，**增加注入攻击的复杂度**
   - **只能尽量减少，无法完全避免**

