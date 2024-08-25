---
title: LLM Core - Decoder Only
mathjax: true
date: 2024-07-09 00:06:25
cover: https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/transformer-training.png
categories:
  - AI
  - LLM
tags:
  - AI
  - LLM
  - NLP
  - Transformer
---

# 模型架构

> 已经演化出很多 Transformer 变体，用来适应不同的任务和性能需求

| 架构名称              | 特点                               | 主要应用           | 与原始 Transformer 的关系               |
| --------------------- | ---------------------------------- | ------------------ | --------------------------------------- |
| 原始 Transformer      | 编码器-解码器结构                  | 机器翻译、文本摘要 | 基础模型                                |
| **Decoder-only**      | 只包含解码器                       | 文本生成           | 去除了编码器部分                        |
| Encoder-only          | 只包含编码器                       | 文本分类、信息提取 | 去除了解码器部分                        |
| Transformer-XL        | 加入循环机制                       | 长文本处理         | 扩展了处理长序列的能力                  |
| Sparse Transformer    | 引入稀疏注意力机制                 | 长序列处理         | 优化了注意力计算效率                    |
| Universal Transformer | 递归的编码器结构                   | 各种序列处理       | 引入递归机制，多次使用相同的参数        |
| Conformer             | 结合 CNN 和 Transformer 优势       | 音频处理、语音识别 | 引入卷积层处理局部特征                  |
| Vision Transformer    | 应用于视觉领域                     | 图像分类、视觉任务 | 将图像块处理为序列的 Transformer 编码器 |
| Switch Transformer    | 使用稀疏性路由机制                 | 大规模模型训练     | 提高了模型的可扩展性和效率              |
| Performer             | 使用随机特征映射技术近似注意力机制 | 处理非常长的序列   | 降低计算负担，提高处理效率              |

<!-- more -->

> GPT 系列模型，使用的是 Decoder-only 架构，Google 的 Bert 模型使用的是 Encoder-only 架构

1. GPT 是语言模型，根据给定的文本预测下一个单词，而解码器就是用来生成输出序列的
2. Decoder-only 模型采用自回归方式进行训练
   - 在生成一个新词时，都会利用之前所有已生成的词作为上下文
   - 自回归的特定使得 GPT 能够在生成文本时保持内容的连贯性和逻辑性
3. 与编码器-解码器结构相比，Decoder-only 架构简化了模型设计，专注于解码器的能力

# 构建模型

## 模型设计

> 比较复杂

1. 先设计模型大概的结构，如层数、多头注意力头数、隐藏层层数、预估词汇表大小
2. 根据这些参数，可以大概计算出模型的参数量
3. 然后根据 Scaling Law，计算出大概需要的计算量，进而评估训练成本

## Scaling Law

1. Scaling Law - 随着模型大小、数据集大小和用于训练的计算浮点数的增加，模型的性能会提高
2. 为了获得最佳性能，这三个因素必须同时放大
3. 当不受其它两个因素的制约时，模型性能与每个单独的因素都有幂律关系
4. 计算公式 - $C ≈ 6ND$ - 仅针对 Decoder-only 架构
   - 浮点计算量（FLOPS） $C$、模型参数 $N$、训练的 Token 数 $D$​
   - FLOPS - floating-point operations per second

## 参数规模

> 总参数量 = 嵌入层参数量 + 位置编码参数量 + 解码器层参数量 + 线性输出层参数量

### 嵌入层参数量

> vocab_size × embed_size

1. vocab_size 是指词汇表的大小
   - 预训练数据集处理后会转换成词汇表，vocab_size 即该词汇表的大小
2. embed_size 是指词嵌入向量的维度数，即每个词的特征数

### 位置编码参数量

> embed_size

### 解码器层参数量

> （自注意力机制参数量 + 前馈网络参数量） × 层数

#### 自注意力层

> 自注意力机制参数量 = 4 × embed_size × embed_size

| 组件         | 参数量                  |
| ------------ | ----------------------- |
| 查询矩阵 - Q | embed_size × embed_size |
| 键矩阵 - K   | embed_size × embed_size |
| 值矩阵 -V    | embed_size × embed_size |
| 输出线性变换 | embed_size × embed_size |

#### 前馈网络层

> 2 × (embed_size × hidden_dim) - hidden_dim 指的是隐藏层层数

### 线性输出层参数量

> vocab_size × embed_size

### 总参数量

> vocab_size × embed_size + embed_size + (4 × embed_size × embed_size + 2 × (embed_size × hidden_dim)) × 层数 + vocab_size × embed_size

> vocab_size 取决于训练文本大小以及分词方式

# 定义模型

```python
import torch
from torch import nn


# 定义一个仅包含解码器的Transformer模型
class TransformerDecoderModel(nn.Module):
    def __init__(self, vocab_size, embed_size, num_heads, hidden_dim, num_layers):
        super(TransformerDecoderModel, self).__init__()  # 调用基类的初始化函数
        # 创建嵌入层，将词索引转换为嵌入向量
        self.embed = nn.Embedding(vocab_size, embed_size)
        # 初始化位置编码，是一个可学习的参数
        self.positional_encoding = nn.Parameter(torch.randn(embed_size).unsqueeze(0))
        # 定义一个Transformer解码器层
        decoder_layer = nn.TransformerDecoderLayer(d_model=embed_size, nhead=num_heads, dim_feedforward=hidden_dim)
        # 堆叠多个解码器层构成完整的解码器
        self.transformer_decoder = nn.TransformerDecoder(decoder_layer, num_layers=num_layers)
        # 定义输出层，将解码器输出转换回词汇空间
        self.fc = nn.Linear(embed_size, vocab_size)

    def forward(self, src):
        # 嵌入输入并添加位置编码
        src = self.embed(src) + self.positional_encoding
        # 生成源序列的掩码，用于屏蔽未来的信息
        src_mask = self.generate_square_subsequent_mask(src.size(0))
        # 通过解码器传递源数据和掩码
        output = self.transformer_decoder(src, src, src_mask)
        # 应用线性层输出最终的预测结果
        output = self.fc(output)
        return output

    def generate_square_subsequent_mask(self, sz):
        # 生成一个上三角矩阵，用于序列生成中遮蔽未来位置的信息
        mask = (torch.triu(torch.ones(sz, sz)) == 1).transpose(0, 1)
        # 将掩码的非零位置设为无穷大，零位置设为0
        mask = mask.float().masked_fill(mask == 0, float('-inf')).masked_fill(mask == 1, float(0.0))
        return mask
```

| Method                            | Desc                                   |
| --------------------------------- | -------------------------------------- |
| `__init__`                        | 类似于 Java 的构造函数，用来初始化属性 |
| `forward`                         | 前向传播的具体实现                     |
| `generate_square_subsequent_mask` | 用来生成掩码矩阵                       |

# 训练数据

## 文本格式

> 采用自回归训练，不需要使用像翻译模型那样的语料对，直接使用自然语言文本，格式如下

```json
{
  "id":"13",
  "url":"https://zh.wikipedia.org/wiki?curid=13",
  "title":"数学",
  "text":"数学\n\n数学是利用符号语言研究数量、结构、变化以及空间等概念的一门学科，..."
}
```

## 文本预处理

> 只需要保留 text 字段，先进行文本预处理

![image-20240825213134155](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240825213134155.png)

1. 循环遍历子目录，然后分别读取每个文件里的文本
2. 从 JSON 格式的数据中抽取 text 字段对应的数据，保存成 sentence.txt 文件 - 1.2GB

```python
import json
import os


class PrepareData():
    @staticmethod
    def prepare():
        root_dir = 'wiki_zh'
        ds = []
        for dir_path, dir_names, file_names in os.walk(root_dir):
            for file_name in file_names:
                file_path = os.path.join(dir_path, file_name)
                if "." in file_path:
                    continue
                with open(file_path, 'r') as file:
                    for line in file:
                        try:
                            text = json.loads(line)["text"]
                            ds.append(text)
                            if len(ds) % 100000 == 0:
                                print("size: ", len(ds))
                        except json.JSONDecodeError:
                            print("格式不正确")
        print(len(ds))
        with open('sentence.txt', 'w') as file:
            for i in ds:
                file.write(i + '\n')
        return ds


data_set = PrepareData.prepare()
```

# 训练模型

> 训练模型 - 非常复杂 + 最消耗资源

## 数据处理

> 将 sentence.txt 的内容逐行读入，使用 jieba 进行分词，转换成词汇表保存到本地

```python
# 导入必需的库
from torch.utils.data import Dataset
import torch
import jieba
import json


# 定义TextDataset类，该类继承自PyTorch中的Dataset
class TextDataset(Dataset):
    # 初始化函数，filepath为输入文件路径
    def __init__(self, filepath):
        words = []  # 创建一个空列表来存储所有单词

        # 打开文件并读取每一行
        with open(filepath, 'r') as file:
            for line in file:
                # 使用jieba库进行分词，并去除每行的首尾空白字符
                words.extend(list(jieba.cut(line.strip())))

        # 将所有单词转换为一个集合来去除重复，然后再转回列表形式，形成词汇表
        self.vocab = list(set(words))
        self.vocab_size = len(self.vocab)  # 计算词汇表的大小
        print("vocab_size", self.vocab_size)

        # 创建从单词到整数的映射和从整数到单词的映射
        self.word_to_int = {word: i for i, word in enumerate(self.vocab)}
        self.int_to_word = {i: word for i, word in enumerate(self.vocab)}

        # 将映射关系保存为JSON文件
        with open('word_to_int.json', 'w') as f:
            json.dump(self.word_to_int, f, ensure_ascii=False, indent=4)
        with open('int_to_word.json', 'w') as f:
            json.dump(self.int_to_word, f, ensure_ascii=False, indent=4)

        # 将所有单词转换为对应的整数索引，形成数据列表
        self.data = [self.word_to_int[word] for word in words]

    # 返回数据集的长度减1，这通常是因为在机器学习中可能需要使用当前数据点预测下一个数据点
    def __len__(self):
        return len(self.data) - 1

    # 根据索引idx返回数据，这里用于返回模型训练时的输入序列和目标输出
    def __getitem__(self, idx):
        # 从数据中提取最多50个整数索引作为输入序列
        idx = max(50, idx)
        input_seq = torch.tensor(self.data[max(0, idx - 50):idx], dtype=torch.long)
        # 提取目标输出，即索引位置的单词
        target = torch.tensor(self.data[idx], dtype=torch.long)
        return input_seq, target  # 返回一个元组包含输入序列和目标输出
```

> 加载数据集，并处理成 DataLoader
> DataLoader 为数据迭代器，可以便利地进行数据加载、批次划分和数据打乱等操作

```python
batch_size = 32
dataset = TextDataset('sentence.txt')
dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True, drop_last=True)
```

## 初始化模型

```python
# 初始化TransformerDecoderModel，设置特定的参数：
# vocab_size - 数据集中的词汇表大小
# embed_size - 嵌入层的维度（这里是512）
# num_heads - 多头注意力机制中的注意力头数（这里是8）
# hidden_dim - 变换器中前馈网络模型的维度（这里是2048）
# num_layers - 模型中的层数（这里是6）
model = TransformerDecoderModel(vocab_size=dataset.vocab_size, embed_size=512, num_heads=8, hidden_dim=2048,
                                num_layers=6)

# 将模型传送到定义的设备上（例如GPU或CPU），以便进行训练
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print('使用设备：', device)
model.to(device)

# 初始化优化器，这里使用Adam优化器，并设置学习率
# model.parameters() - 从模型中获取参数
# lr - 学习率（这里用变量learning_rate表示）
learning_rate = 1e-3
optimizer = optim.Adam(model.parameters(), lr=learning_rate)

# 初始化损失函数，这里使用交叉熵损失，适用于分类问题
criterion = nn.CrossEntropyLoss()
```

> 总参数量
> vocab_size × embed_size + embed_size + (4 × embed_size × embed_size + 2 × (embed_size × hidden_dim)) × 层数 + vocab_size × embed_size
>
> vocab_size × 512 + 512 + (4 × 512 × 512 + 2 × (512 × 2048)) × 6 + vocab_size × 512
>
> 假设 vocab_size = 100000（几 MB 的训练数据，词汇量就能达到 100000）- 1.2 亿参数
> 100000 × 512 + 512 + (4 × 512 × 512 + 2 × (512 × 2048)) × 6 + 100000 × 512 = 121,274,880
>
> GPT-3 的训练数据大约 570GB，Transformer 层数为 96，按上述计算会超过 1750 亿参数
> 大概率是 embed_size 没有 512，即一个单词不一定需要那么多维度去描述

## 开始训练

> 训练过程太过于消耗资源，为了快速出模型，截取其中一部分训练数据，大约 10M

```python
# 将模型设置为训练模式
model.train()

num_epochs = 1
# 循环遍历所有的训练周期
for epoch in range(num_epochs):
    # 循环遍历数据加载器中的每个批次
    for i, (inputs, targets) in enumerate(dataloader):
        try:
            # 将输入数据转置，以符合模型的期望输入维度
            inputs = inputs.t().to(device)
            targets = targets.to(device)
            # 在每次迭代前清空梯度
            optimizer.zero_grad()
            # 前向传播：计算模型对当前批次的输出
            outputs = model(inputs)
            # 选择输出的最后一个元素进行损失计算
            outputs = outputs[-1]
            # 计算损失值
            loss = criterion(outputs, targets)
            # 反向传播：计算损失的梯度
            loss.backward()
            # 更新模型的参数
            optimizer.step()
            # 每隔100步打印一次当前的训练状态
            if i % 100 == 0:
                print(
                    f'Time [{datetime.now()}], Epoch [{epoch + 1}/{num_epochs}], Step [{i + 1}/{len(dataloader)}], Loss: {loss.item()}')
        except RuntimeError as e:
            print(e)
            continue

model_path = "decoder-only.model"
# 保存模型到指定路径
torch.save(model, model_path)
print('模型已保存到', model_path)
```

# 模型测试

```python
# 导入所需库
import torch
import json
import jieba


def load_model(model_path):
    # 加载模型到CPU
    model = torch.load(model_path, map_location=torch.device('cpu'))
    # 设置为评估模式
    model.eval()
    return model


def load_vocab(json_file):
    """从JSON文件中加载词汇表。"""
    # 读取词汇表文件
    with open(json_file, 'r') as f:
        vocab = json.load(f)
    return vocab


def predict(model, initial_seq, max_len=50):
    # 加载数字到单词的映射
    int_to_word = load_vocab('int_to_word.json')
    # 确保模型处于评估模式
    model.eval()
    # 关闭梯度计算
    with torch.no_grad():
        generated = initial_seq
        # 生成最多max_len个词
        for _ in range(max_len):
            input_tensor = torch.tensor([generated], dtype=torch.long)
            output = model(input_tensor)
            predicted_idx = torch.argmax(output[:, -1], dim=-1).item()
            generated.append(predicted_idx)
            # 如果生成结束标记，则停止生成
            if predicted_idx == len(int_to_word) - 1:
                break
        # 将生成的索引转换为单词
        return [int_to_word[str(idx)] for idx in generated]


def generate(model, input_sentence, max_len=50):
    # 使用结巴分词对输入句子进行分词
    input_words = list(jieba.cut(input_sentence.strip()))
    # 加载单词到数字的映射
    word_to_int = load_vocab('word_to_int.json')
    # 将单词转换为索引
    input_seq = [word_to_int.get(word, len(word_to_int) - 1) for word in input_words]
    # 生成文本
    generated_text = predict(model, input_seq, max_len)
    # 将生成的单词列表合并为字符串
    return "".join(generated_text)


def main():
    # 定义输入提示
    prompt = "hello"
    # 加载模型
    model = load_model('decoder-only.model')
    # 生成文本
    completion = generate(model, prompt)
    # 打印生成的文本
    print("生成文本：", completion)


if __name__ == '__main__':
    # 主函数入口
    main()
```

> 因训练有限，效果惨不忍睹，预料之中

![image-20240826011517543](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240826011517543.png)

# 小结

1. 模型构建本身不复杂，构建过程就是整个深度神经网络的构建过程
2. 难点在于预训练过程 - 吃训练资源 + 考虑训练效果
3. 如何调整参数让训练效果更好是难点

> GPT-3 在不同参数规模下的设置

![5a92e0bc261890b86d8d09c62e16b8be.png](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/5a92e0bc261890b86d8d09c62e16b8be.png.webp)
