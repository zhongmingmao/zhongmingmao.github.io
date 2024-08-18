---
title: LLM Core - RNN
mathjax: true
date: 2024-07-04 00:06:25
cover: https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/rnn.jpeg
categories:
  - AI
  - LLM
tags:
  - AI
  - LLM
  - NLP
  - Machine Learning
  - RNN
---

# 背景

1. RNN 主要用来处理**序列数据**，目前大部分 **LLM** 都是基于 **Transformer**
3. 通过学习 RNN，有助于理解 Transformer
   - 有助于理解**神经网络**如何处理**序列中的依赖关系**、**记忆过去的信息**，并在此基础上**生成预测**
   - 有助于理解关键问题 - **梯度消失** / **梯度爆炸**

<!-- more -->

# RNN

> Recurrent neural network - **循环**神经网络

1. RNN 是一类用于处理**序列数据**的神经网络，RNN 能够处理**序列长度变化**的数据 - **文本 / 语音**
2. RNN 的特点是在模型中引入了**循环**，使得网络能够保持某种**状态**，表现出更好的**性能**

![image-20240818215624681](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240818215624681.png)

1. 左边
   - $x$ 为输入层，$o$ 为输出层，中间的 $s$ 为隐藏层，在 $s$ 层进行一个循环 $W$
2. 右边（展开循环）
   - 与时间 $t$ 相关的状态变化
   - 神经网络在处理数据时，能看到前后时刻的状态，即**上下文**
   - RNN 因为**隐藏层**有**时序状态**，那么在**推理**的时候，可以借助**上下文**，从而**理解语义**更加准确

# 优劣

## 优势

1. RNN 具有**记忆**能力，通过**隐藏层的循环结构**来捕捉序列的**长期依赖关系**
2. 特别适用于**文本生成**、**语音识别**等领域

## 局限

1. 存在**梯度消失**和**梯度爆炸**的问题，可以通过引入 **LSTM** 来**缓解**

# 反向传播

1. 在**深度学习**中，训练神经网络涉及到两个主要的传播阶段 - **前向传播 + 反向传播**
2. **前向传播** - 根据**当前**的网络参数、权重和偏置等得到**预测输出**
   - 输入数据从网络的**输入层**开始，**逐层**向前传递至**输出层**
   - 每层都会对其输入进行**计算** - 如**加权求和**，然后**应用激活函数**等
   - 并将计算结果**传递**给下一层，直到最终产生输出
3. **反向传播**
   - 一旦输出层得到了**预测输出**，就会**<u>计算损失函数</u>**
     - 即**预测输出**与**实际目标输出**之间的**差异（损失）**
   - 然后，这个**损失**会被用来计算**损失函数**相对于**网络中每个参数**的**梯度**
     - 这些**梯度**的内涵 - 为了**减少损失**，各个**参数**需要**如何调整**
   - **链式法则** - 从**输出层**开始，沿着网络**向后**（向**输入层**方向），**逐层**进行
   - 最后这些**梯度**会用来**更新网络的参数** - 通过**梯度下降**或者其变体算法实现
   - 在反向传播过程中，每到达一层，都会**触发激活函数**
     - tanh 函数可能会导致**梯度消失**

# 结构原理

## 数学

> RNN 的核心在于**隐藏层** - 随着时间的变化**更新**隐藏状态

$$
h_t=f(W_{xh}x_t+W_{hh}x_{t-1}+b_h)
$$

1. $h_t$ 是当前时间步的**隐藏状态**，$x_t$ 是当前时间步的**输入**，$h_{t-1}$ 是前一个时间步的**隐藏状态**
2. $W_{xh}$ 和 $W_{hh}$ 为**权重矩阵**，$b_h$ 是**偏置项**，$f$​​ 是**激活函数**（如 **tanh** 函数）

## 过程

> 任务 - 假设字符集只有 A B C，给定序列 AB，预测下一个字符

1. 在**输入**层，将**字符串**转换为**数值**形式 - **Embedding**
   - 可以采用 **One-hot** 编码，A=[1,0,0] B=[0,1,0] C=[0,0,1]
   - 序列 AB，表示为两个向量 [1,0,0] 和 [0,1,0]
2. 在**隐藏**层，假设只有一个隐藏层（实际应用可能会有多个），使用 **tanh** 作为**激活函数**
   - 时间步 1 - 处理 A
     - 输入 [1,0,0]
     - 假设 $W_{xh}$ 和 $W_{hh}$ 的值均为 1，初始隐藏状态 $h_0=0$ 
     - 计算新的隐藏状态 $h_1=tanh(1*[1,0,0]+1*0)=tanh(1)≈0.76$​
   - 时间步 2 - 处理 B
     - 输入 [0,1,0]
     - 使用上一时间步的隐藏状态 $h_1≈0.76$
     - 计算新的隐藏状态 $h_2=tanh(1*[0,1,0]+1*0.76)=tanh(0.76)≈0.64$

> 每个时间步的隐藏状态 $h_t$ 基于当前的输入 $x_t$ 和上一时间步的隐藏状态 $h_{t-1}$ 计算得到的

> RNN 能够**记住之前的输入**，并使用这些信息**影响后续的处理**，如预测下一个字符，使得模型具备了**记忆功能**

## One-hot

![image-20240818223729923](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240818223729923.png)

## tanh

> 压缩器

![tan](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/tan.png)

![tanh](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/tanh.png)

# 关键挑战

1. RNN 通过**当前的隐藏状态**来记住**序列之前的信息**
2. 这种记忆一般是**短期**的，随着**时间步的增加**，**早期输入**对当前状态的**影响会逐步减弱**
3. 在**标准 RNN** 中，可能会遇到**梯度消失**的问题，导致几乎**无法更新权重**

| 挑战     | 影响                   |
| -------- | ---------------------- |
| 梯度消失 | **权重无法更新**       |
| 梯度爆炸 | **无法收敛，甚至发散** |

## 梯度消失

> **无法更新权重**

### 概述

1. **梯度**是指**函数**在某一点上的**斜率** - 导数
2. 在**深度学习**中，该函数一般指具有多个变量（**模型参数**）的**损失函数**
3. 寻找损失函数最小值的方法 - **梯度下降**
   - 梯度下降 - 需要不断**调整模型参数**，使得**损失函数降到最小**
   - 梯度的语义 - 告知**如何调整**参数

### 原因

1. **深层网络**中的**连乘效应**

   - 在深层网络中，**梯度**是通过**链式法则**进行**反向传播**的

   - 如果**每一层的梯度都小于 1**，随着**层数的叠加**，导致**最终的梯度会非常小**

2. **激活函数**的选择 - **反向传播**会调用激活函数

   - 使用某些激活函数，如 **tanh**，函数的取值范围在 **-1 ~ 1**

   - **小于 1** 的数进行**连乘**，会快速降低梯度值

### 方案

1. 长短期记忆（**LSTM**）和门控循环单元（**GRU**） - 专门为了**避免梯度消失**问题而设计

   - 通过引入**门控机制**来**调节信息的流动**，保留**长期依赖信息**

   - 从而避免梯度在反向传播过程中消失

2. 使用 **ReLU** 及其变体激活函数 - 在**正区间**的**梯度**保持**恒定**

   - 不会随着**输入的增加**而减少到 0，有助于**减轻**梯度消失的问题

> ReLU 函数

![relu](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/relu-3994488.png)

## 梯度爆炸

> **模型无法收敛，甚至发散**

### 概述

1. 当模型的梯度在**反向传播**过程中变得**非常大**
2. 以至于**更新后**的权重**<u>偏离最优解</u>**，导致模型**无法收敛**，甚至**发散**

### 原因

1. **深层网络**的**连乘效应**

   - 在深层网络中，梯度是通过**链式法则**进行**反向传播**的

   - 如果**每一层的梯度都大于 1**，随着**层数的增加**，会导致**梯度非常大**

2. **权重初始化不当**

   - 如果网络的权重初始化得太大

   - 在**前向传播**的过程中，**信号大小**会迅速增加

   - 同样，**反向传播**时**梯度**也会迅速增加

3. 使用不恰当的**激活函数**

   - 某些激活函数（如 **ReLU**）在**正区间**的**梯度**为**常数**

   - 如果网络**架构设计不当**，使用这些激活函数也可能会导致梯度爆炸

### 方案

1. 使用长短期记忆（**LSTM**）和门控循环单元（**GRU**）来**调整**网络
2. 替换**激活函数**
3. 进行**梯度裁剪**
   - 在训练过程中，通过**限制梯度的最小最大值**来防止**梯度消失爆炸**问题，间接保持**梯度的稳定性**

# 长短期记忆

> Long Short-Term Memory - **LSTM** - <u>记住该记住的，忘记该忘记的</u> - **优化记忆的效率**

## 概述

1. LSTM 是具有类似**大脑记忆功能**的模块
2. LSTM 在处理数据（如文本、时间序列数据时） - 能**记住**对当前任务**重要**的信息，而**忘记不重要**的信息

## 机制

![lstm](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/lstm.png)

| Mechanism         | 描述                                                         |
| ----------------- | ------------------------------------------------------------ |
| **遗忘门** - 移除 | 决定哪些**存量信息**是过时的，不重要的，应该从模型的记忆中**移除** |
| **输入门** - 添加 | 决定哪些**新信息**是重要的，应该被**添加**到模型的记忆中     |
| **输出门** - 相关 | 决定在**当前时刻**，哪些记忆是**相关**的，应该要被用来生成输出 |

## 效果

1. LSTM 能够在处理序列数据时，**<u>有效地保留长期的依赖信息</u>**，避免了**标准 RNN** 中常见的**梯度消失**问题
2. LSTM 特别适用于需要**理解整个序列背景**的任务
   - **语言翻译** - 需要理解整个句子的含义
   - **股票价格预测** - 需要考虑长期的价格变化趋势

# 文本生产

> 通过学习大量的文本数据，RNN 能够生成具有**相似风格**的文本

```python
import torch
import torch.nn as nn
import torch.optim as optim
from torch.nn.utils.rnn import pad_sequence
from torch.utils.data import DataLoader, Dataset

# 数据预处理
text = "Here is some sample text to demonstrate text generation with RNN. This is a simple example."
tokens = text.lower().split()
tokenizer = {word: i + 1 for i, word in enumerate(set(tokens))}
total_words = len(tokenizer) + 1

# 创建输入序列
sequences = []
for line in text.split('.'):
    token_list = [tokenizer[word] for word in line.lower().split() if word in tokenizer]
    for i in range(1, len(token_list)):
        n_gram_sequence = token_list[:i + 1]
        sequences.append(n_gram_sequence)
max_sequence_len = max([len(x) for x in sequences])
sequences = [torch.tensor(seq) for seq in sequences]
sequences = pad_sequence(sequences, batch_first=True, padding_value=0)


class TextDataset(Dataset):
    def __init__(self, sequences):
        self.x = sequences[:, :-1]
        self.y = sequences[:, -1]

    def __len__(self):
        return len(self.x)

    def __getitem__(self, idx):
        return self.x[idx], self.y[idx]


dataset = TextDataset(sequences)
dataloader = DataLoader(dataset, batch_size=2, shuffle=True)


# 构建模型
class RNNModel(nn.Module):
    def __init__(self, vocab_size, embed_size, hidden_size):
        super(RNNModel, self).__init__()
        self.embedding = nn.Embedding(vocab_size, embed_size)
        self.lstm = nn.LSTM(embed_size, hidden_size, batch_first=True)
        self.fc = nn.Linear(hidden_size, vocab_size)

    def forward(self, x):
        x = self.embedding(x)
        x, _ = self.lstm(x)
        x = self.fc(x[:, -1, :])
        return x


model = RNNModel(total_words, 64, 20)
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)

# 模型训练
for epoch in range(100):
    for x_batch, y_batch in dataloader:
        optimizer.zero_grad()
        output = model(x_batch)
        loss = criterion(output, y_batch)
        loss.backward()
        optimizer.step()
    if epoch % 10 == 0:
        print(f'Epoch {epoch + 1}, Loss: {loss.item()}')


# 文本生成
def generate_text(seed_text, next_words, model, max_sequence_len):
    model.eval()
    for _ in range(next_words):
        token_list = [tokenizer[word] for word in seed_text.lower().split() if word in tokenizer]
        token_list = torch.tensor(token_list).unsqueeze(0)
        token_list = nn.functional.pad(token_list, (max_sequence_len - 1 - token_list.size(1), 0), 'constant', 0)
        with torch.no_grad():
            predicted = model(token_list)
            predicted = torch.argmax(predicted, dim=-1).item()
        output_word = ""
        for word, index in tokenizer.items():
            if index == predicted:
                output_word = word
                break
        seed_text += " " + output_word
    return seed_text


print(generate_text("Here is", 4, model, max_sequence_len))
```

