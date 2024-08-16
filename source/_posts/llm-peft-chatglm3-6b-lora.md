---
title: LLM PEFT - ChatGLM3-6B + LoRA
mathjax: false
date: 2024-06-29 00:06:25
cover: https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/lora.jpg
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
  - LoRA
  - PEFT
---

# 通用 LLM

> 千亿大模型（130B、ChatGPT）和小规模的大模型（6B、LLaMA2）都是通用 LLM

1. **通用 LLM** 都是通过**常识**进行**预训练**的
2. 在实际使用过程中，需要 LLM 具备某一特定**领域知识**的能力 - 对 LLM 的能力进行**增强**

<!-- more -->

# 增强方式

| Method | Desc                                                         |
| ------ | ------------------------------------------------------------ |
| 微调   | 让预先训练好的 LLM **适应**特定任务或数据集的方案，**成本相对低**<br />LLM 学会训练者提供的微调数据，并具备一定的**理解**能力 |
| 知识库 | 使用**向量数据库**或者其它数据库存储数据，为 LLM 提供**信息来源外挂** |
| API    | 与知识库类似，为 LLM 提供**信息来源外挂**                    |

> **互不冲突**，可以**同时使用**几种方案来优化 LLM，提升内容输出能力

> LoRA / QLoRA / 知识库 / API

![image-20240816163919085](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240816163919085.png)

> LLM Performance = **推理效果**

# 落地过程

| Method | Pipeline                                                 |
| ------ | -------------------------------------------------------- |
| 微调   | 准备数据 -> 微调 -> 验证 -> 提供服务                     |
| 知识库 | 准备数据 -> 构建**向量库** -> 构建**智能体** -> 提供服务 |
| API    | 准备数据 -> 开发**接口** -> 构建**智能体** -> 提供服务   |

# 需求分析

> 法律小助手用来解决日常生活中遇到的法律问题，以**问答**的方式进行 - **知识库 or 微调**

## 知识库

> 一旦数据集不足，可以**随时补充**，**即时生效**

1. 将数据集**拆分**成一条一条的**知识**，放入到**向量库**
2. 然后通过 **Agent** 从向量库**检索**，在**输入**给 LLM

## 微调

1. 法律知识有时候需要一定的**逻辑能力**，不是纯文本检索
2. 微调 - 通过在一定量的数据集上的训练，**增加** LLM 法律相关的**常识及思维**，从而进行**推理**

# 准备数据

## 原始数据

> https://github.com/SophonPlus/ChineseNlpCorpus/blob/master/datasets/lawzhidao/intro.ipynb

| 字段 | 说明 |
| ---- | ---- |
| title | 问题的标题 |
| question | 问题内容（可为空） |
| reply| 回复内容 |
| is_best| 是否为页面上显示的最佳回答 |

## 微调数据

```json
{
  "conversations": [
    {
      "role": "user",
      "content": "类型#裙*裙长#半身裙"
    },
    {
      "role": "assistant",
      "content": "这款百搭时尚的仙女半身裙，整体设计非常的飘逸随性，穿上之后每个女孩子都能瞬间变成小仙女啦。料子非常的轻盈，透气性也很好，穿到夏天也很舒适。"
    }
  ]
}
```

> 让 ChatGPT 生成转换代码

```
原始数据是CSV格式，包含4列：title、question、reply、is_best，需要通过Python语言处理该CSV文件，来构建大语言模型的微调数据集，目标数据集格式是JSON的，单条数据格式为：{"conversations":[{"role":"user","content":"value1"},{"role":"assistant","content":"value2"}]}，需要将原始CSV文件里的title列填充到目标JSON文件里的value1处，原始CSV文件里的reply填充到目标JSON文件里的value1处，请注意：最终生成的不是JSON数组，而是每个JSON对象生成一行，出示示例代码。
```

![image-20240816183045914](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240816183045914.png)

# 微调

## 依赖

```
$ sudo apt install libopenmpi-dev

$ ChatGLM3/finetune_demo/
$ pip3 install -r requirements.txt

$ pip3 install nltk
$ pip3 install typer
$ pip3 install sentencepiece
$ pip3 install deepspeed==0.14.4
```

![image-20240816224024027](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240816224024027.png)

## 数据

1. 训练需要至少准备两个数据集，一个用来**训练**，一个用来**验证**
2. train.json 与 dev.json 格式相同
3. 当 LLM 在训练过程中，会自动进行测试验证，输出**微调效果**

```
$ tree data/
data/
├── dev.json
└── train.json

$ du -sh data/*
64K	data/dev.json
29M	data/train.json
```

## 配置

> configs/lora.yaml

```yaml
data_config:
  train_file: /home/ubuntu/peft/ChatGLM3/finetune_demo/data/train.json
  val_file: /home/ubuntu/peft/ChatGLM3/finetune_demo/data/dev.json
  test_file: /home/ubuntu/peft/ChatGLM3/finetune_demo/data/dev.json
training_args:
  output_dir: /home/ubuntu/peft/ChatGLM3/finetune_demo/output
  max_steps: 3000 # 最大训练轮数
  save_steps: 500 # 每训练多少轮保存权重
```

![image-20240816225750003](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240816225750003.png)

## 微调

| Parameter            | Desc              |
| -------------------- | ----------------- |
| 训练数据集所在的目录 | data              |
| 模型所在目录         | ../model          |
| 微调配置             | configs/lora.yaml |

```
$ python3 finetune_hf.py data ../model/ configs/lora.yaml
```

> trainable params 为 **1.9M**，整个参数量为 **6B**，训练比为 **3%**

![image-20240817001459446](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240817001459446.png)

1. **trainable params** 指的是在模型训练过程中可以被**优化**或**更新**的参数数量
2. 在**深度学习**模型中，这些参数通常是**网络**的**权重**和**偏置**
3. 它们是**可训练**的
   - 因为在训练过程中，通过**反向传播算法**，这些**参数**会根据**损失函数**的**梯度**不断**更新**
   - 以减少**模型输出**与真**实标签**之间的**差异**
4. 通过调整 lora.yaml 中的 peft_config 的 **r** 参数来改变**可训练参数的数量**
   - **r** 越大，**trainable params** 就越大
   - r - **LoRA 矩阵的秩**

![image-20240817001802203](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240817001802203.png)

![image-20240817003456160](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240817003456160.png)

### loss

1. **损失函数**衡量**模型预测的输出**与**实际数据**之间的**差异**
2. 在训练过程中，目标是**最小化**该**损失值**，从而**提高**模型的**准确性**

### grad_norm

> 梯度范数 - 参数更新幅度

1. 在训练**深度学习**模型时，通过**反向传播**算法计算**参数的梯度**，以便更新这些参数
2. **梯度范数**是这些**梯度向量**的**大小**或者**长度**，提供了关于**参数更新幅度**的信息
3. 如果梯度范数**非常大**，可能表示模型在训练过程中遇到了**梯度爆炸**问题
4. 如果梯度范数**太小**，可能表示**梯度消失**问题

### learning_rate

> 学习率 - 控制**参数更新幅度**的**超参数**

1. 在优化算法中，学习率决定了在**反向传播**期间**参数更新**的**步长**大小
2. 学习率**太高**，会导致训练过程**不稳定**
3. 学习率**太低**，会导致训练**进展缓慢**或者陷入**局部最小值**

### epoch

1. epoch - **训练算法**在**整个训练数据集**上的一次**完整遍历**
2. 通常需要**多个 epochs** 来训练模型，以确保模型能够**充分学习**数据**集中**的模式
3. 每个 epoch 后，通常会**评估**模型在**验证集**上的表现，以**监控**和**调整**训练过程

![image-20240817004644007](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240817004644007.png)

## 验证

### 加载

> output/checkpoint-3000 - 新生成的**权重**
> 模型启动时，会将**原模型**和**新权重**全部加载，然后进行**推理**

```
$ python3 inference_hf.py output/checkpoint-3000/ --prompt "xxxxxxxxxxxx"
```

![image-20240817005053174](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240817005053174.png)

### 微调前

![image-20240817005425390](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240817005425390.png)

### 微调后

> 微调数据集中有对应内容，微调**效果明显**

![image-20240817005718296](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240817005718296.png)

# 服务

> **微调**完成后，即**验证**后得知**整体效果**满足一定的**百分比**，可以**对外服务**
> 通过 **API 组件**将模型的输入输出封装成接口对外提供服务

1. 模型的**推理性能** - 效果
2. 模型的**推理吞吐量**
3. 服务的**限流**，适当保护 LLM 集群
4. 当 LLM 服务不可用时，服务**降级**，开关控制
