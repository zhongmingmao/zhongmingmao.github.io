---
title: LLM Core - Seq2Seq
mathjax: true
date: 2024-07-07 00:06:25
cover: https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/seq2seq-4492942.png
categories:
  - AI
  - LLM
tags:
  - AI
  - LLM
  - NLP
  - Seq2Seq
---

# 简单介绍

1. **Word2Vec** 的主要能力是将**词汇**放在**多维空间**中，**相似的词汇**会被放在**邻近的位置**
2. Seq2Seq 不仅能**理解词汇**，还能将词汇**串联**成完整的**句子**
3. Seq2Seq 即**从一个序列到另一个序列的转换**
   - 不仅仅能**理解单词之间的关系**，还能把整个句子的意思**打包**，并**解压**成另一种形式的表达
4. Seq2Seq 的核心角色 - **编码器**（Encoder） + **解码器**（Decoder）

| Role        | Desc                                                      |
| ----------- | --------------------------------------------------------- |
| **Encoder** | **理解和压缩信息** - 把一封长信函整理成一个精简的**摘要** |
| **Decoder** | 将**摘要**打开，并翻译成另一种语言或形式的**完整信息**    |

<!-- more -->

# 优缺点

## Seq2Seq

> 固定长度上下文 + 逐步输入（长序列） + 参数规模小

1. Seq2Seq 是一种比较**高级**的神经网络模型，适用于**语言翻译**，甚至是**基本的问答系统**
2. Seq2Seq 使用**固定**的**上下文长度**，因此**长距离依赖**的能力比较弱
3. Seq2Seq 的**训练**和**推理**通常需要**逐步处理**输入和输出序列，在处理**长序列**会**受限**
4. Seq2Seq 的**参数量通常较少**，在面对**复杂场景**时，**模型性能**可能会**受限**

## Word2Vec

![image-20240825002026176](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240825002026176.png)

# 基本概念

> Seq2Seq 是一种神经网络架构，模型的核心组成 - **编码器**（Encoder） + **解码器**（Decoder）

![seq2seq-arch](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/seq2seq-arch.webp)

## 编码器

1. 编码器的任务是**读取并理解序列**，然后将它**转换**成一个**固定长度**的**上下文向量**，即**状态向量**
2. **状态向量**是**输入序列**的一种**内部表示**，捕捉了序列的**关键信息**
3. 编码器通常是一个 **RNN** 或其变体 - 如 **LSTM** 或者 **GRU**
   - 能够处理**不同长度**的输入序列，并且记住序列中**长期依赖关系**

![seq2seq-encoder](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/seq2seq-encoder.webp)

## 解码器

1. 解码器的任务是接收**编码器**生成的**状态向量**，并基于该向量**生成目标序列**

2. 解码过程是**逐步进行**的

   - **每一步**生成的目标序列中的**一个元素**（**词**或**字符**）

   - 直到生成特殊的**结束符号**，代表输出序列的结束

3. 解码器通常也是一个 **RNN**、**LSTM**、**GRU**

   - 不仅仅依赖**编码器生成的状态向量**，还可能依赖**解码器之前的输出**，来生成一个输出元素

![seq2seq-decoder](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/seq2seq-decoder.webp)

## 注意力机制

1. 在编码器和解码器之间，会有一个注意力机制
2. 注意力机制使**解码器**能够在生成每个输出元素时**关注输入序列中的不同部分**
3. 注意力机制可以提高模型**处理长序列**和**捕捉依赖关系**的能力

![ef925bd2yyec5f51836262527e5fa03b](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/ef925bd2yyec5f51836262527e5fa03b.gif)

# 工作原理

> 场景为**中英文翻译**，训练数据为**中英文数据对**

## 数据集

1. AI Challenger 2017 - https://github.com/AIChallenger/AI_Challenger_2017
2. 该数据集有 1000 万对中英文数据，从中选取 **10000** 条英文数据和中文数据进行训练

```python
cn_sentences = []
zh_file_path = "train_1w.zh"
# 使用Python的文件操作逐行读取文件，并将每一行的内容添加到列表中
with open(zh_file_path, "r", encoding="utf-8") as file:
    for line in file:
        # 去除行末的换行符并添加到列表中
        cn_sentences.append(line.strip())

en_sentences = []
en_file_path = "train_1w.en"
# 使用Python的文件操作逐行读取文件，并将每一行的内容添加到列表中
with open(en_file_path, "r", encoding="utf-8") as file:
    for line in file:
        # 去除行末的换行符并添加到列表中
        en_sentences.append(line.strip())
```

## 训练模型

### 构建词汇

> 基于**训练数据集**构建中文和英文的**词汇表**，将**每个词**映射到一个**唯一索引（integer）**

```python
# cn_sentences 和 en_sentences 分别包含了所有的中文和英文句子
cn_vocab = build_vocab(cn_sentences, tokenize_cn, max_size=10000, min_freq=2)
en_vocab = build_vocab(en_sentences, tokenize_en, max_size=10000, min_freq=2)
```

> 构建词汇 - 读入所有句子，**循环分词**，放入字典（≥ min_freq）

```python
def build_vocab(sentences, tokenizer, max_size, min_freq):
    token_freqs = Counter()
    for sentence in sentences:
        tokens = tokenizer(sentence)
        token_freqs.update(tokens)
    vocab = {token: idx + 4 for idx, (token, freq) in enumerate(token_freqs.items()) if freq >= min_freq}
    vocab['<unk>'] = 0
    vocab['<pad>'] = 1
    vocab['<sos>'] = 2
    vocab['<eos>'] = 3
    return vocab
```

> 输出结果

![image-20240824223450755](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240824223450755.png)

> 重要部分

| Part    | Desc                                                         |
| ------- | ------------------------------------------------------------ |
| `<unk>` | **未知**单词，表示在训练数据中没有出现过的单词<br />当模型在处理输入文本时遇到未知单词时，会用 `<unk>` 来标记 |
| `<pad>` | **填充**单词，用于将**不同长度**的序列**填充**到**相同长度**<br />在处理**批次数据**时，不同序列的长度可能不同<br />使用 `<pad>` 把短序列填充到**最长序列**相同的长度，以便进行批次处理 |
| `<sos>` | **句子起始**标记，表示**句子的开始位置**<br />通常会在**目标句子开头**添加 `<sos>` 标识，以**指示解码器开始生成输出** |
| `<eos>` | **句子结束**标记，表示**句子的结束位置**<br />通常会在**目标句子末尾**添加 `<eos>` 标识，以**指示解码器生成结束** |

### 创建训练集

> 将数据处理成**方便训练**的格式 - **语言序列**

```python
# cn_vocab 和 en_vocab 是已经创建的词汇表
dataset = TranslationDataset(cn_sentences, en_sentences, cn_vocab, en_vocab, tokenize_cn, tokenize_en)
train_loader = DataLoader(dataset, batch_size=32, collate_fn=collate_fn)
```

### 检测设备

```python
# 检查是否有可用的GPU，如果没有，则使用CPU
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("训练设备为：", device)
```

### 创建模型

```python
# 定义一些超参数
INPUT_DIM = 10000  # 输入语言的词汇量
OUTPUT_DIM = 10000  # 输出语言的词汇量
ENC_EMB_DIM = 256  # 编码器嵌入层大小，即编码器词向量维度
DEC_EMB_DIM = 256  # 解码器嵌入层大小，即解码器词向量维度
HID_DIM = 512  # 隐藏层维度
N_LAYERS = 2  # RNN层的数量
ENC_DROPOUT = 0.5  # 编码器中dropout的比例，编码器神经元输出的数据有 50% 会被随机丢掉
DEC_DROPOUT = 0.5  # 解码器同上

enc = Encoder(INPUT_DIM, ENC_EMB_DIM, HID_DIM, N_LAYERS, ENC_DROPOUT)
dec = Decoder(OUTPUT_DIM, DEC_EMB_DIM, HID_DIM, N_LAYERS, DEC_DROPOUT)

model = Seq2Seq(enc, dec, device).to(device)
# 假定模型已经被实例化并移到了正确的设备上
model.to(device)
# 定义优化器和损失函数
optimizer = optim.Adam(model.parameters())
criterion = nn.CrossEntropyLoss(ignore_index=en_vocab['<pad>'])  # 忽略<pad>标记的损失
```

### 训练过程

```python
num_epochs = 10  # 训练轮数
for epoch in range(num_epochs):
    model.train()
    total_loss = 0
    for src, trg in train_loader:
        src, trg = src.to(device), trg.to(device)
        optimizer.zero_grad()  # 清空梯度
        output = model(src, trg[:-1])  # 输入给模型的是除了最后一个词的目标句子
        # Reshape输出以匹配损失函数期望的输入
        output_dim = output.shape[-1]
        output = output.view(-1, output_dim)
        trg = trg[1:].view(-1)  # 从第一个词开始的目标句子
        loss = criterion(output, trg)  # 计算模型输出和实际目标序列之间的损失
        loss.backward()  # 通过反向传播计算损失相对于模型参数的梯度
        optimizer.step()  # 根据梯度更新模型参数，这是优化器的一个步骤
        total_loss += loss.item()
    avg_loss = total_loss / len(train_loader)
    print(f'Epoch {epoch + 1}/{num_epochs}, Average Loss: {avg_loss}')
    # 可以在这里添加验证步骤
```

```
我 喜欢 学习 机器 学习。
I like studying machine learning
```

1. 在开始训练之前，先将**原文本**转化成对应**词汇表**里的**语言序列**
   - 在中文词汇表中，`我 喜欢 学习 机器 学习` 分别对应的是 `1,2,3,4,5`
   - 那么转换成的语言序列为 `1,2,3,4,5`，即 **train_loader** 中的格式
2. **编码器**接收到**语言序列**，经过神经网络 **GRU** 后，生成一个**状态向量**，作为**解码器**的**初始状态**
3. **解码器**接收到**状态向量**作为**输入**，并根据**当前上下文**以及**已经生成的部分目标语言序列**
   - 计算**目标词汇表**中**每个单词**的**概率分布**
   - 假设在第一个时间步，解码器生成的概率分布
     - `"I": 0.3, "like": 0.1, "studying": 0.5, "machine": 0.05, "learning": 0.05`
   - 根据**解码器**生成的**概率分布**，选择**概率最高**的词（`studying`），作为**当前时间步**的**输出**
4. 模型将**解码器生成的输出词汇**与**目标语言句子**中**当前时间步对应的词汇**（`I`）进行对比
   - `I like studying machine learning.`
   - 解码器输出的是 `studying`，与目标语言句子中的 `I`，存在**很大差别**
5. 根据解码器输出 `studying` 和目标语言句子中真实词汇 `I` **计算损失**，并通过**反向传播**算法**计算梯度**
   - **损失值**是一个衡量**模型预测输出**与**真实目标**之间**差异**的指标
   - 根据**损失值**更新**模型参数**，使模型能够**更准确地预测**下一个词汇
6. 重复以上步骤，直到模型达到**指定的训练轮数**或者满足其它**停止训练的条件**
   - 在每次训练迭代中，模型都在尝试**调整参数**，以使其预测输出**更接近真实**的目标语言序列

> **训练轮数**非常关键，**不能太少**，也**不能太多**

## 验证模型

> 推理与训练的区别 - **训练过程**中模型会**记住参数**，而**推理过程**直接**根据参数计算**下一个词的概率即可

```python
def translate_sentence(sentence, src_vocab, trg_vocab, model, device, max_len=50):
    # 将输入句子进行分词并转换为索引序列
    src_tokens = ['<sos>'] + tokenize_cn(sentence) + ['<eos>']
    src_indices = [src_vocab[token] if token in src_vocab else src_vocab['<unk>'] for token in src_tokens]
    # 将输入句子转换为张量并移动到设备上
    src_tensor = torch.LongTensor(src_indices).unsqueeze(1).to(device)
    # 将输入句子传递给编码器以获取上下文张量
    with torch.no_grad():
        encoder_hidden = model.encoder(src_tensor)
    # 初始化解码器输入为<sos>
    trg_token = '<sos>'
    trg_index = trg_vocab[trg_token]
    # 存储翻译结果
    translation = []
    # 解码过程
    for _ in range(max_len):
        # 将解码器输入传递给解码器，并获取输出和隐藏状态
        with torch.no_grad():
            trg_tensor = torch.LongTensor([trg_index]).to(device)
            output, encoder_hidden = model.decoder(trg_tensor, encoder_hidden)
        # 获取解码器输出中概率最高的单词的索引
        pred_token_index = output.argmax(dim=1).item()
        # 如果预测的单词是句子结束符，则停止解码
        if pred_token_index == trg_vocab['<eos>']:
            break
        # 否则，将预测的单词添加到翻译结果中
        pred_token = list(trg_vocab.keys())[list(trg_vocab.values()).index(pred_token_index)]
        translation.append(pred_token)
        # 更新解码器输入为当前预测的单词
        trg_index = pred_token_index
    # 将翻译结果转换为字符串并返回
    translation = ' '.join(translation)
    return translation


sentence = "我喜欢学习机器学习。"
translation = translate_sentence(sentence, cn_vocab, en_vocab, model, device)
print(f"Chinese: {sentence}")
print(f"Translation: {translation}")
```

> 输出 - 因训练数据太少，效果不佳

```
Chinese: 我喜欢学习机器学习。
Translation: a <unk> <unk> <unk> . . . .
```

