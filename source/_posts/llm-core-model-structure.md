---
title: LLM Core - Model Structure
mathjax: true
date: 2024-07-10 00:06:25
cover: https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/llm.jpeg
categories:
  - AI
  - LLM
tags:
  - AI
  - LLM
  - NLP
---

# 模型文件

1. 模型文件，也叫**模型权重**，里面大部分空间存放的是**模型参数** - 即**权重**（Weights）和**偏置**（Biases）
2. 还有其它信息，如**优化器状态**和**元数据**等
3. 文件格式
   - 使用 **PyTorch**，后缀为 `.pth`
   - 使用 **TensorFlow** 或者 **Hugging Face Transformers**，后缀为 `.bin`
4. 在模型**预训练**后，可以保存模型，在**生产**环境，**不建议保存模型架构**
   - 与 **Python 版本**和**模型定义的代码**紧密相关，可能存在**兼容性**问题

<!-- more -->

> 模型权重 - 推荐

```python
torch.save(model.state_dict(), 'model_weights.pth')
```

> 模型权重 + **模型架构** - 可能存在**兼容性**问题

```python
torch.save(model, model_path)
```

# 权重 + 偏置

1. 权重 - 最重要的参数之一
   - 在**前向传播**过程中，**输入**会与**权重**相乘，这是神经网络**学习特征和模式**的基本方式
   - 权重决定了输入**如何影响**输出
2. 偏置 - 调整输出
   - 允许模型输出在**没有输入**或者**所有输入都为 0** 的时候，调整到某个**基线值**
3. $y=kx+b$
   - $k$ 为权重，$b$ 为偏置
   - 在**神经网络**中，**权重** $k$ 决定了**每个输入特征**对于**输出**的**重要性**和**影响力**
   - 偏置 $b$ 是个**常数项**，提供除了输入特征之外的**额外输入**
     - 允许模型输出可以在**没有任何输入**或者**所有输入都为 0** 的时候，**调整**到某个**基线**或**阈值**
4. 在**复杂的神经网络**中，每个**神经元**都有**权重**和**偏置**
   - 从**前一层**接收**多个输入信号**，对这些输入信号**加权求和**后**加上偏置**
   - 然后通过一个**非线性激活函数**（<u>tanh</u> or <u>ReLU</u>）来生成**输出信号** - 传递到**下一层**
   - 每一层的权重和偏置都是模型**需要学习的参数**，根据**训练数据**进行**调整**，以**最小化**模型的**预测误差**

# 模型可视化

## Netron - 整体结构

> 6 层 Transformer Decoder-only 架构

![image-20240827191733137](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240827191733137.png)

### Embedding

![image-20240827192038385](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240827192038385.png)

1. `weight(168283×512)`
   - 代表 168283×512 的矩阵，**每一行**对应一个特定的**词向量**
   - 对于**词汇表**中一个**词**或者**标记**，该矩阵提供了一个 **512 维的嵌入向量**
2. `tensor: float32[168283,512]`
   - 表明这是一个 **FP32 精度**的变量，168283 表明训练时使用了 168283 个词汇

### TransformerDecoderLayer

> 具体的实现类 - torch.nn.modules.transformer.TransformerDecoderLayer

![image-20240827193020818](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240827193020818.png)

> 包含组件

```
torch.nn.modules.activation.MultiheadAttention
torch.nn.modules.activation.MultiheadAttention
torch.nn.modules.linear.Linear
torch.nn.modules.dropout.Dropout
torch.nn.modules.linear.Linear
torch.nn.modules.normalization.LayerNorm
torch.nn.modules.normalization.LayerNorm
torch.nn.modules.normalization.LayerNorm
torch.nn.modules.dropout.Dropout
torch.nn.modules.dropout.Dropout
torch.nn.modules.dropout.Dropout
```

## torchviz - 具体节点

```python
x = torch.randint(10000, (50,))  # 假设一个序列长度为10的输入
y = model(x)
dot = torchviz.make_dot(y.mean(), params=dict(model.named_parameters()), show_attrs=True, show_saved=True)
dot.render(filename="net", format='png')
```

> 整个网络结构的顺序图

![image-20240827200018832](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240827200018832.png)

> **训练**

1. 模型的**训练过程**就是不断**调整权重**的过程
2. 调整权重的依据就是根据**损失函数**计算损失，通过**反向传播**不断**调整权重**使得**损失最小**
3. 达到**理想损失值**后，把权重**记录**下来**保存**

> **推理**

1. 数据到达节点（**神经元**）后，先从**输入层**到**隐藏层**，再从隐藏层到**输出层**
2. 每一层都执行 $y_1=k_1x_1+b_1$，然后应用**非线性**的**激活函数**，比如 $x_2=ReLU(y_1)$，最后将 $x_2$ 继续传递**下一层**
3. 下一层的权重 $k_2$ 和偏置 $b_2$ 是已知的，继续计算得到 $y_2$​
4. 基本都是**张量相乘**，而不是简单的整数小数相乘

> 机器学习框架（PyTorch）可以根据**描述文件**，将模型**重构**出来，进行**训练**和**推理**

# 模型容量

## 存储大小

> 755M

## 总参数量

> vocab_size × embed_size + embed_size + (4 × embed_size × embed_size + 2 × (embed_size × hidden_dim)) × 层数 + vocab_size × embed_size
>
> vocab_size × 512 + 512 + (4 × 512 × 512 + 2 × (512 × 2048)) × 6 + vocab_size × 512
>
> vocab_size = 168283
> 168283 × 512 + 512 + (4 × 512 × 512 + 2 × (512 × 2048)) × 6 + 168283 × 512 = 191,196,672 = **1.9 亿**

1. 模型的**精度**为 **float32**，即每个参数需要 **4 字节**的存储空间
2. 纯参数方面大约需要 **729M** 的空间（191,196,672×4/1024/1024），占比 **96.5%**，剩余 **26M** 的空间可能存放的是**模型结构**、**元数据**等

## Embedding 层

> Embedding 层在整个模型中的作用非常大，占比 40%

1. 权重是 `tensor: float32[168283,512]`
2. 在 Embedding 层参数量为 168283×512 = **86,160,896**，存储≈ **328M**
   - **参数占比** = 86,160,896 / 191,196,672 ≈ **0.45**
   - **存储占比** = 328 / 755 ≈ **0.43**

# 模型参数

![0512aee8bd58e69d07a6c51943cd4f73.png](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/0512aee8bd58e69d07a6c51943cd4f73.png.webp)

1. 具有 **50 个参数**的矩阵，每个参数表示**词向量**在**特定维度**上的**权重**或**特征**
2. 每一行表示某个词在 10 个不同的**特征维度**上的数值表示
3. 假设 Embedding 层是**可训练**的
   - 在**模型训练**的过程中，会根据**损失**计算，**反向传播**后**更新**某个参数
   - 使得模型可以**更好地表示**某个词，来达到训练的目的
4. 在最终的**推理**过程中，**词向量**会被**传播**下去，作为**下一层**神经网络的**输入**，参与到后续的计算过程中

# 小结

> 类比 - 通过 Java 字节码文件反推 Java 编码过程

1. 模型里存放的是**各个层**的**权重**和**偏置**，类似于 $y=kx+b$ 里面的 $k$ 和 $b$
2. 机器学习框架（PyTorch）可以**识别**模型文件，并且把模型结构**重构**出来进行**训练**和**推理**
3. 模型**训练**过程 - 不断**前向传播**、**损失计算**、**反向传播**、**参数更新**的过程
4. 模型**推理**过程 - 根据**训练好的参数**，进行**前向传播**的过程
5. 模型可视化工具 - Netron + torchviz

