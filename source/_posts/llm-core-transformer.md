---
title: LLM Core - Transformer
mathjax: true
date: 2024-07-08 00:06:25
cover: https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/llm-transformer.png
categories:
  - AI
  - LLM
tags:
  - AI
  - LLM
  - NLP
  - Transformer
  - Attention
  - Seq2Seq
---

# 背景

1. 不论是 **GRU** 还是 **LSTM** 都面临**梯度消失**和**梯度爆炸**的问题
2. RNN 必须**按照顺序处理**序列中的每个元素，**无法并发处理**
3. RNN 还有**长依赖**问题，虽然可以处理**长序列**，但**实战效果不佳**

> Attention Is All You Need - http://arxiv.org/pdf/1706.03762

<!-- more -->

# 简单介绍

1. Transformer 是一种基于**自注意力机制**的**深度学习模型**，诞生于 **2017** 年
2. 目前**大部分**的语言模型（如 **GPT** 系列、**BERT**系列）都基于 **Transformer** 架构
3. Transformer 摒弃了之前**序列处理任务**中广泛使用的 **RNN**
   - 转而使用**自注意力层**来直接计算**序列内个元素之间的关系**，从而有效捕获**长距离依赖**
4. Transformer 明显提高了**处理速度**
5. Transformer 由于其**并行计算**的特性，大幅度提升了模型在处理**长序列**数据时的**效率**
6. Transformer 由**编码器**和**解码器**组成
   - 每个部分均由**多层重复的模块**构成，其中包括**自注意力层**和**前馈神经网络**

![354a83f2bbf6ee36021475638c0ac329.png](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/354a83f2bbf6ee36021475638c0ac329.png.webp)

# 优势

> Transformer 通过其独特的架构设计，在效率、效果和灵活性方面提供了显著优势
> 使其成为处理复杂序列数据任务的强大工具

1. 并行处理能力
   - 与传统的 RNN 和 LSTM 不同，Transformer 完全依赖于自注意力机制
   - 消除了序列处理中的递归结果，允许模型在处理输入数据时实现高效地并行计算
   - 使得训练过程大大加速 - 使用现代 GPU 和 TPU
   - Position Encoding
     - 为序列添加位置编码，以便在并行处理完成后，进行合并
2. 捕捉长距离依赖
   - Transformer 通过自注意力机制能够捕捉序列中的长距离依赖关系
   - 在 NLP 中
     - 意味着模型可以有效地关联文本中相隔很远的词汇
     - 提高对上下文的理解
3. 灵活的注意力分布
   - 多头注意力机制允许 Transformer 在同一个模型中同时学习数据的不同表示
   - 每个头专注于序列的不同方面
     - 一个头关注语法结构，另一个头关注语义内容
4. 可扩展性
   - Transformer 模型可以很容易地扩展到非常大的数据集和非常深的网络结构
   - 通过模型的简单可堆叠的架构来实现的，在训练非常大的模型时表现出色

# 核心概念

## Attention

1. 在 Transformer 之前，**2014** 年**注意力机制**已经被提出，也被用于 **Seq2Seq**
2. Transformer 还在强调注意力机制
   - Transformer 是一个**完全基于注意力机制**构建的模型 - <u>Attention Is All You Need</u>
   - 与 **RNN** 和 LSTM 不同
     - Transformer 通过**自注意力机制**来处理序列数据
     - 使得每个**输出**元素都能直接与**输入**序列中的**所有元素**相关联
     - 从而**有效**捕获**长距离依赖**关系

## Seq2Seq

> 在**编码**阶段结束后，会产生一个**上下文向量**（**状态向量**、**隐藏状态**）
> **解码器**根据**隐藏状态**来计算**下一个词**的概率

![image-20240825103412308](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240825103412308.png)

> 解码阶段公式 - $C$ 代表隐藏状态，解码器在**不同解码阶段**，仅依赖**同一个**隐藏状态 $C$

$$
y_1=f(C)
$$

$$
y_2=f(C,y_1)
$$

$$
y_3=f(C,y_1,y_2)
$$

## Seq2Seq With Attention

> 加入**注意力机制**后
> 编码器传给解码器**多个**隐藏状态，解码器根据**不同**的隐藏状态计算下一个词的概率
> 每推测一个词之前，都会计算下一个所有**和这个词相关**的概率，即**注意力**

![image-20240825104839375](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240825104839375.png)

```
我 喜欢 学习 机器 学习。
I like studying machine learning
```

1. 在**推测 machine** 的时候，会先计算一下**与 machine 相关**的词的概率 - **分配注意力**
   - 假设 `（我,0.2)(like,0.3)(学习,0.4)(机器,0.6)`
   - 此时模型知道下一个词与`机器`相关，会把注意力集中在机器上

> 解码阶段公式

$$
y_1=f(C_1)
$$

$$
y_2=f(C_2,y_1)
$$

$$
y_3=f(C_3,y_1,y_2)
$$

## 注意力分配

### 向量转换

> 将输入序列中的每个词与目标词转换为 3 种向量表示

| Vector | Desc                                                         |
| ------ | ------------------------------------------------------------ |
| Query  | 代表目标词的向量，用于查询与输入序列中的那些词相关           |
| Key    | 代表输入序列中的每个词的向量，用于被查询匹配                 |
| Value  | 代表输入序列中每个词的向量<br />一旦词的重要性（通过 Query 和 Key 的匹配）被确定，其值向量将被用来计算最终的输出 |

### 计算相似度

1. 模型需要判断目标词（Query）与输入序列中每个词（Key）之间的相关性
2. 判断方式
   - 计算查询向量（Query）与每个键向量（Key）之间的点积
   - 点积越大，表示两个向量越相似，即输入中的词与目标词越相近
   - 词嵌入 - 具有相同意思的词，在同一个向量空间中比较接近
   - 点积衡量两个向量在方向上的一致性，可以用来计算向量的相似度

### 注意力权重

1. 由于点积的结果可能会非常大
2. 为了将其转换为一个合理的概率分布，即每个词的重要性权重
3. 对点积结果应用 Softmax 函数
   - Softmax 能确保所有计算出的权重加起来等于 1，每个权重的值介于 0 和 1 之间
4. 每个输入词的权重就代表了它对于目标词的相对重要性

### 代码模拟

```python
import torch
import torch.nn.functional as F

# 假设我们已经有了每个词的嵌入向量，这里用简单的随机向量代替真实的词嵌入
# 假设嵌入大小为 4
embed_size = 4
# 输入序列 "我 喜欢 学习 机器 学习" 的嵌入表示
inputs = torch.rand((5, embed_size))
# 假设 "machine" 的查询向量
query_machine = torch.rand((1, embed_size))


def attention(query, keys, values):
    # 计算查询和键的点积，除以根号下的嵌入维度来缩放
    scores = torch.matmul(query, keys.transpose(-2, -1)) / (embed_size ** 0.5)
    # 应用softmax获取注意力权重
    attn_weights = F.softmax(scores, dim=-1)
    # 计算加权和
    output = torch.matmul(attn_weights, values)
    return output, attn_weights


output, attn_weights = attention(query_machine, inputs, inputs)
print("Output (Attention applied):", output)
print("Attention Weights:", attn_weights)
```

> 输出
> 最后两个权重 0.2165 和 0.2192 - machine 与结尾的两个词『机器』和『学习』最相似
> 为计算过程赋予了**注意力** - 要注意之后两个词

```
Output (Attention applied): tensor([[0.4447, 0.6016, 0.7582, 0.7434]])
Attention Weights: tensor([[0.1702, 0.2151, 0.1790, 0.2165, 0.2192]])
```

## 多头注意力

> Multi-head Attention

1. 多头注意力是 Transformer 模型的一个**关键创新**
2. 核心思想 - 在**相同的数据**上**并行**地运行**多个注意力机制**，然后将它们的**输出合并**
3. 优点 - 允许模型在**不同的表示子空间**中**捕获信息**，从而提高模型**处理信息**的能力
4. Transformer 默认 **8** 个头

> 工作过程

1. 分割
   - 对于每个输入，多头注意力首先将 Query、Key、Value 矩阵分割成多个头
   - 实现方式
     - 将每个矩阵分割成较小的矩阵来实现
     - 每个较小的矩阵对应一个注意力头
   - 假设原始矩阵的维度为 $d_{model}$，那么每个头的矩阵维度将是 $d_{model}/h$，$h$ 为头数
2. 并行注意力计算
   - 对每个头分别计算注意力
   - 计算是独立的，所以可以并行
   - 每个头都能在不同的表示子空间中捕获输入序列的信息
3. 拼接和线性转换
   - 所有头的输出再被拼接起来，形成一个与原始矩阵维度相同的长矩阵
   - 最后，通过一个线性变换调整维度，得到多头注意力的最终输出

# 架构原理

## 模型结构

![image-20240825113902710](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240825113902710.png)

> 在 Transformer 中，编码器叫做**编码器组**，解码器叫做**解码器组**

![96c6302a46fdb1ff7154eafe70d53d8c](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/96c6302a46fdb1ff7154eafe70d53d8c.png)

> 每个编码器内部又分为两层：**自注意力层** + **前馈神经网络层**

![9585fcf121a0965a234c8f11b691734a](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/9585fcf121a0965a234c8f11b691734a.png)

> 每个解码器内部又分为三层：**自注意力层** + **编码-解码注意力层** + **前馈神经网络层**

![cea5a6e20126aea395beca926d67011d](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/cea5a6e20126aea395beca926d67011d.png)

## 编码器

### 输入层

1. 第一步进行词嵌入处理，在第一个编码器中，将单词向量化
2. 然后进行位置编码，为每个单词添加位置信息
   - 因为 Transformer 不像 RNN 或者 CNN，顺序处理序列
   - 所以需要进入位置编码机制，确保模型能够记住单词的顺序

### 自注意力层

1. 这一层模型会计算每个输入元素与序列中其它元素的关系
   - 使得每个元素的新表示都富含整个序列的上下文信息
2. 通过自注意力机制，模型能够理解每个词
   - 不仅仅在其自身的语义层面上，还包括它与句子中其它词的关系
3. 之后数据经过 `Add & Norm` 操作，进入前馈处理层（`Feed Forward`）

#### Add

1. Add 表示残差连接
   - 是指在自注意力层后把这一层处理过的数据和把这一层的原始输入想加
2. 这种方式允许模型在增加额外处理层的同时，保留输入信息的完整性
   - 从而在不损失重要信息的前提下，学习到输入数据的复杂特征
3. 具体来说
   - 如果某一层的输入为 $x$ ，层的函数表示为 $f(x)$，那么这一层的输出为 $x+f(x)$
4. 主要是为了缓解深层网络中的梯度消失或者梯度爆炸的问题，使深度模型更容易训练
   - 缓解梯度消失问题 - 因为 $x+f(x)$，而不仅仅是 $f(x)$
   - 在反向传播过程中，可以有多条路径，可以减轻连续连乘导致梯度减少到 0 的问题

#### Norm

1. Norm 表示归一化（Normalization）
2. 数据在经过 Add 操作后，对每个样本的所有特征进行标准化
   - 在层内对每个样本的所有特征计算均差和方差，并使用这些统计信息来标准化特征值
3. 有助于避免训练过程中的内部协变量偏移问题
   - 即保证网络的每一层都在相似的数据分布上工作
   - 从而提高模型训练的稳定性和速度

### 前馈层

1. 前馈全连接网络（FFN）对每个位置的表示进行独立的非线性变换，提升模型的表达能力
2. 通过两次线性映射和一个中间的 ReLU 激活函数
3. FFN 引入了必要的非线性处理，使模型能够捕捉更复杂的数据特征
   - 加强了模型对序列内各元素的理解，提升了模型处理各种语言任务的能力

> ReLU

![relu](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/relu.webp)

> 公式

$$
FFN(x)=max(0,xW_1+b_1)W_2+b_2
$$

1. $x$ 为上一层自注意力层的输出，首先通过一个线性变化
   - 即与权重矩阵 $W_1$ 相乘并加上偏置向量 $b_1$，即 $xW_1+b_1$
   - 权重矩阵 $W_1$ 和偏置向量 $b_1$ 是这一层的参数，它们在模型训练过程中学习得到
2. 然后，线性变换的结果通过一个 ReLU 激活函数
   - ReLU 函数的作用是增加非线性，定义为 $max(0,z)$，其中 $z$ 为输入
   - 如果 $z$ 为正，函数输出 $z$，如果 $z$ 为负或者 $0$，函数输出 $0$
   - 这一步可以帮助模型捕捉复杂的特征，防止输出被压缩在线性空间内
3. ReLU 函数的输出再次通过一个线性变换
   - 即与第二个权重矩阵 $W_2$ 相乘并加上第二个偏置向量 $b_2$
   - 即 $max(0,xW_1+b_1)W_2+b_2$，其中输入为 $max(0,xW_1+b_1)$

> 最后，同样经历与自注意力层一样的 Add & Norm 处理，完成归一化输出
> 然后数据进入下一个编码器或者解码器

### 小结

1. 使用位置编码，为了方便处理序列顺序
2. 编码器包括两层 - 自注意力层 + 前馈网络层
3. 每一层进入下一层前都需要进行 `Add & Norm` 操作

## 解码器

> 相比于编码器，解码器多了一层 - Encoder-Decoder Attention

![4d6c6cbaa5a9754c6976ae4a6af62e84](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/4d6c6cbaa5a9754c6976ae4a6af62e84.webp)

### 自注意力层

1. 解码器的自注意力层与编码器的自注意力层不同
2. 解码器的自注意力层需要处理额外的约束
   - 即保证在生成序列的每一步仅依赖于之前的输出，而不是未来的输出
   - 实现方式 - 特定的掩蔽（masking）技术

> 关键点

1. 处理序列依赖关系
   - 自注意力层使每个输出位置可以依赖于到目前位置的目标序列中的所有先前位置
   - 这允许模型在生成每个新词时，综合考虑已生成序列的上下文信息
2. 遮蔽未来信息
   - 为了确保在生成第 $t$ 个词时不会使用到第 $t+N$ 的词的信息
   - 自注意力层使用一个上三角遮蔽矩阵，在实现中通常填充为负无穷或者非常大的负数
   - 这保证了在计算 Softmax 时未来位置的贡献被归 $0$
3. 动态调整注意力焦点
   - 通过学习的注意力权重
   - 模型可以动态地决定在生成每个词时应该更多地关注目标序列中的哪部分

> 代码

```python
import torch
import torch.nn.functional as F


def decoder_self_attention(query, key, value, mask):
    """
    解码器自注意力层，带掩蔽功能。

    参数:
    - query, key, value: 形状为 (batch_size, seq_len, embed_size) 的张量
    - mask: 形状为 (seq_len, seq_len) 的张量，用于防止未来标记的注意力

    返回:
    - attention output: 形状为 (batch_size, seq_len, embed_size) 的张量
    - attention weights: 形状为 (batch_size, seq_len, seq_len) 的张量
    """
    # 计算缩放点积注意力分数
    d_k = query.size(-1)  # 键向量的维度
    scores = torch.matmul(query, key.transpose(-2, -1)) / torch.sqrt(torch.tensor(d_k, dtype=torch.float32))

    # 应用掩蔽（将未来的标记设置为极大的负数以排除它们）
    scores = scores.masked_fill(mask == 0, float('-inf'))

    # 应用softmax获取注意力权重
    attention_weights = F.softmax(scores, dim=-1)

    # 使用注意力权重和值向量乘积得到输出
    attention_output = torch.matmul(attention_weights, value)

    return attention_output, attention_weights


# 示例用法
batch_size = 1
seq_len = 5
embed_size = 64
query = torch.rand(batch_size, seq_len, embed_size)
key = torch.rand(batch_size, seq_len, embed_size)
value = torch.rand(batch_size, seq_len, embed_size)

# 生成掩蔽矩阵以阻止对未来标记的注意（使用上三角矩阵掩蔽）
mask = torch.triu(torch.ones(seq_len, seq_len), diagonal=1).bool()
print("掩蔽矩阵:")
print(mask)

# 调用函数
output, weights = decoder_self_attention(query, key, value, mask)
print("输出形状:", output.shape)
print("注意力权重形状:", weights.shape)
```

> 输出

![image-20240825173233931](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240825173233931.png)

> 解码器中的自注意力层至关重要

1. 不仅提供了处理序列内依赖关系的能力，还确保了生成过程的自回归性质
2. 即在生成当前词的时候，只依赖于之前生成的词
3. 这种机制使得 Transformer 模型非常适合各种序列生成任务 - 机器翻译、文本摘要等

> 产生这种机制的原因

1. 自注意力机制允许当前位置的输出与未来位置的输入产生关联
   - 从而导致数据泄露和信息泄露的问题
2. 而在推理阶段，是不可能读到未来信息的
   - 这样会导致模型在训练和推断阶段的表现不一致，以及模型预测结果的不稳定性

### 编码-解码注意力层

1. 编码-解码注意力层是一种特殊的注意力机制
   - 用于在解码器中对输入序列（编码器的输出）进行注意力计算
2. 编码-解码注意力层有助于解码器在生成输出序列时对输入序列的信息进行有效整合利用
3. 编码-解码注意力层关注的是全局的注意力计算
   - 包括编码器输出的信息序列和解码器内部的自注意力计算

> 与解码器自注意力层的区别

1. 信息来源不同
   - 编码-解码注意力层用在解码器中
     - 将解码器当前位置的查询向量与编码器的输出进行注意力计算
   - 自注意力层用于解码器自身内部
     - 将解码器当前位置的查询向量与解码器之前生成的位置的输出进行注意力计算
2. 计算方式不同
   - 编码-解码注意力层计算当前解码器位置与编码器输出序列中所有位置的注意力分数
     - 意味着解码器在生成每个输出位置时，都可以综合考虑整个输入序列的信息
   - 自注意力层计算当前解码器位置与之前所有解码器位置的输出的注意力分数
     - 使得解码器可以自我关注并利用先前生成的信息来生成当前位置的输出

> 小结

1. 编码-解码注意力层关注整个编码器输出序列
   - 将编码器的信息传递给解码器，用于帮助解码器生成目标序列
2. 自注意力层关注解码器自身先前生成的位置的信息
   - 用于班主解码器维护上下文并生成连贯的输出序列

### 前馈层

1. 前馈处理与编码器中的前馈处理类似
2. 通过两次线性映射和一个中间的 ReLU 激活函数，生成解码器的最终输出

$$
FFN(x)=max(0,xW_1+b_1)W_2+b_2
$$

### Linear

1. 在 Transformer 架构中，Linear 层是线性层的意思
2. Linear 层通常被用于多个子模块，包括编码器和解码器中的不同部分
3. Linear 层的作用是对数据进行线性变换
   - 将输入张量映射到另一个张量空间中
   - 并通过学习参数来实现数据的线性组合和特征变换
4. Linear 无处不在

> 解码器后面的 Linear 的作用

1. 解码器后面的 Linear 层通常用于将经过前馈层处理的特征表示
   - 映射到最终的输出空间，即模型的输出词汇表的维度
2. 将解码器前馈层的输出映射为模型最终的预测结果
   - 例如生成下一个单词的概率分布
   - 实际上进行降维，将前馈层的高维输出转换为词汇表的维度

> 代码

```python
import torch
import torch.nn as nn
import torch.nn.functional as F


class Decoder(nn.Module):
    def __init__(self, d_model, vocab_size):
        super(Decoder, self).__init__()
        self.d_model = d_model
        self.vocab_size = vocab_size

        # 前馈网络（Feed Forward Network）
        self.feedforward = nn.Sequential(
            nn.Linear(d_model, 2048),
            nn.ReLU(),
            nn.Linear(2048, vocab_size)
        )

    def forward(self, x):
        # x: 解码器前馈网络的输出，形状为 [batch_size, seq_len, d_model]

        # 将解码器前馈网络的输出通过线性层进行映射
        output_logits = self.feedforward(x)  # 输出形状为 [batch_size, seq_len, vocab_size]

        # 对输出 logits 进行 softmax 操作，得到预测概率
        output_probs = F.softmax(output_logits, dim=-1)  # 输出形状为 [batch_size, seq_len, vocab_size]

        return output_probs


# 示例用法
d_model = 512  # 解码器特征维度
vocab_size = 10000  # 词汇表大小

# 创建解码器实例
decoder = Decoder(d_model, vocab_size)

# 输入数据，假设解码器前馈网络的输出
input_tensor = torch.randn(2, 10, d_model)  # 示例输入，batch_size=2，序列长度=10

# 解码器前向传播
output_probs = decoder(input_tensor)

# 输出预测概率，形状为 [2, 10, 10000]
print(output_probs.shape)
```

1. 定义了一个简单的解码器，其中包含一个前馈网络
2. 前馈网络由两个线性层和一个 ReLU 激活函数组成
   - $FFN(x)=max(0,xW_1+b_1)W_2+b_2$
   - 将解码器的特征表示 $x$ 映射到词汇表大小的维度上
3. 最后对输出进行 Softmax 操作，得到预测概率

### Softmax

1. Softmax 的核心 - 将一组任意实数转换成一个概率分布
2. Softmax 在 Transformer 模型的多处用到
   - 注意力机制和多头注意力机制，通过 Softmax 函数计算注意力分数
   - 在解码器最后一层，将 Linear 线性层输出的数据，应用 Softmax 函数进行处理

> 问题 1 - 为什么需要通过 Softmax 函数进行计算

1. 将得分转换为概率后，模型能够更加明确地选择哪些输入的部分是最相关的
2. 在神经网络中，直接处理非常大或非常小的数值可能会导致数值不稳定 - 梯度消失爆炸
   - 通过 Softmax 函数处理后，数据将被规范化到一个固定的范围（0 ~ 1）- 缓解问题
3. Softmax 输出的是概率分布，使得模型的行为更加透明
   - 可以直接解释为 - 有多少比例的注意力被分配到特定的输入上
   - 有助于调试和优化模型，以及理解模型的决策过程

> 问题 2 - 将任意实数转化为概率分布，数据的意义发生变化，会不会对效果产生影响？

1. 原始得分只表达了相对大小关系，但不清楚这种差异有多大
2. 通过 Softmax 转换后，可以让模型做出更精准的决策
   - 得到的概率不仅仅反映出哪些得分较高
   - 还具体表达了它们相对于其它选项的重要性
3. 原始得分可能因为范围广泛或分布不均而难以直接操作
   - 而概率形式的输出更标准化、更规则
   - 适合进一步的处理和决策，如分险决策以及风险评估等

> 代码

```python
import numpy as np
import torch
import torch.nn.functional as F

# 假设有一个简单的查询 (Query) 和键 (Key) 矩阵，这里使用随机数生成
np.random.seed(0)  # 设置随机种子以确保结果的可复现性
query = np.random.rand(1, 64)  # 查询向量，维度为1x64
key = np.random.rand(64, 10)  # 键矩阵，维度为64x10

# 将numpy数组转换为torch张量
query = torch.tensor(query, dtype=torch.float32)
key = torch.tensor(key, dtype=torch.float32)

# 计算点积注意力得分
attention_scores = torch.matmul(query, key)  # 结果维度为1x10

# 应用Softmax函数，规范化注意力权重
attention_weights = F.softmax(attention_scores, dim=-1)

print("注意力得分（未规范化）:", attention_scores)
print("注意力权重（Softmax规范化后）:", attention_weights)
```

> 输出

```
注意力得分（未规范化）: tensor([[17.9834, 15.4092, 15.5016, 15.2171, 18.3008, 17.4539, 15.6339, 16.3575,
         14.5159, 15.4736]])
注意力权重（Softmax规范化后）: tensor([[0.2786, 0.0212, 0.0233, 0.0175, 0.3826, 0.1640, 0.0266, 0.0548, 0.0087,
         0.0226]])
```

> 具体实现

$$
Softmax(x_i)=\frac{e^{x_i}}{\sum_{j}{e^{x_j}}}
$$

1. 指数化
   - 对输入向量的每个元素应用指数函数
   - 即每个输入值 $x_i$ 被转换为 $e^{x_i}$，其中 $e$ 为自然对数的底
   - 这一步的作用是将所有输入转化为正数，并放大了输入值之间的差异
2. 归一化
   - 计算所有指数化值的总和 $\sum_{j}{e^{x_j}}$
   - 将每个指数化后的值除以这个总和
     - 得到一组和为 1 的概率值
     - 其中每个概率值都表示原始输入值相对于其它值的重要性或贡献度

> 代码实现

```python
import numpy as np


def softmax(x):
    exp_x = np.exp(x - np.max(x))  # 防止数值溢出
    return exp_x / exp_x.sum()


# 示例输入
x = np.array([1.0, 2.0, 3.0])
print("Softmax输出:", softmax(x))  # Softmax输出: [0.09003057 0.24472847 0.66524096]
```

> 示意图

![softmax](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/softmax.png)
