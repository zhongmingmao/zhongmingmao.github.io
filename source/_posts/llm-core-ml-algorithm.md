---
title: LLM Core - Machine Learning Algorithm
mathjax: true
date: 2024-07-03 00:06:25
cover: https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/ml-algorithm-3947367.png
categories:
  - AI
  - LLM
tags:
  - AI
  - LLM
  - NLP
  - Machine Learning
  - SVM
---

# 线性回归

## 概述

1. 线性回归是一种**预测分析**技术，用于研究两个或者多个变量之间的关系
2. 尝试用一条**直线**（二维）或者一个**平面**（三维）的去**拟合**数据点
3. 这条**直线**或者**平面**，可以用来**预测**或者估计一个变量基于另一个变量的值

<!-- more -->

## 数学

1. 假设有一个**因变量 y** 和一个**自变量 x**
2. 线性回归会尝试找到一条直线 **y=ax+b**
   - **a** 为**斜率**，而 **b** 为**截距**
   - 以便这条直线**尽可能**地**接近**所有数据点

$$
y=ax+b
$$

## sklearn

> 房价预测 - 房价是因变量 y，而房屋面积是自变量 x

```python
import matplotlib.pyplot as plt
import numpy as np
from sklearn.linear_model import LinearRegression

# 定义数据
X = np.array([35, 45, 40, 60, 65]).reshape(-1, 1)  # 面积
y = np.array([30, 40, 35, 60, 65])  # 价格

# 创建并拟合模型
model = LinearRegression()
model.fit(X, y)

# 预测面积为50平方米的房屋价格
predict_area = np.array([50]).reshape(-1, 1)
predicted_price = model.predict(predict_area)

print(f"预测的房价为：{predicted_price[0]:.2f}万美元")  # 预测的房价为：47.20万美元

# 绘制数据点和拟合直线
plt.scatter(X, y, color='blue')
plt.plot(X, model.predict(X), color='red')
plt.title('House price forecast')
plt.xlabel('Area')
plt.ylabel('Price')
plt.show()
```

![linear-regression](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/linear-regression.png)

1. **蓝色的点**代表用于训练模型的**实际数据点**
2. **红色的线**用于展示**模型拟合的结果**
3. **拟合** - 直线尝试穿过所有的数据点

# 逻辑回归

## 概述

1. 逻辑回归主要用于处理**分类**问题，尤其是**二分类**问题
2. 目的 - 预测一个事件的**发生概率**，并将这个概率转化为**二元结果** - **0/1**

## 数学

> 逻辑回归通过使用 **Sigmoid** 函数将**线性回归模型的输出**映射到 **0 和 1 之间**的概率值上

$$
\sigma(z)=\frac{1}{1+e^{-z}}
$$

![sigmoid](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/sigmoid.png)

1. $z$​ 为**线性回归**模型的**输出**
2. $z=\beta_{0}+\beta_{1}x_{1}+...+\beta_{n}x_{n}$，其中 $x_{n}$ 为**特征变量**，而 $\beta_{n}$ 为**模型参数**
3. 要取得**模型参数**的值，需要用到**似然函数** - 基于**观测**，通过结果**反推**模型参数
4. 在某些特定场景下，得出了 $\sigma$，并且到了 $x_{n}$ 的值
   - 可以推测出使得 $\sigma$ **取得（准确率）最大**的 $\beta_{n}$ 的值
   - 使用这个 $\beta_{n}$ 的值作为**模型参数**，从而进行**概率推导**

## sklearn

> 基于学习时间，预测学生是否会通过考试，分为两类：通过为 1，未通过为 0

```python
from sklearn.linear_model import LogisticRegression
import numpy as np

# 准备数据
X = np.array([[10], [20], [30], [40], [50]])  # 学习时间
y = np.array([0, 0, 1, 1, 1])  # 通过考试与否

# 创建逻辑回归模型并训练
model = LogisticRegression()
model.fit(X, y)

# 预测学习时间为25小时的学生通过考试的概率
prediction_probability = model.predict_proba([[25]])
prediction = model.predict([[25]])
print(f"通过考试的概率为：{prediction_probability[0][1]:.2f}")  # 通过考试的概率为：0.50
print(f"预测分类：{'通过' if prediction[0] == 1 else '未通过'}")  # 预测分类：通过
```

# 决策树

## 概述

1. 决策树主要用于**分类**和**回归**任务
2. 从数据中学习**决策规则**来预测**目标变量的值**
3. 场景 - 猜谜游戏 - **客户分类 / 信用评分 / 医疗诊断**
   - 每次只能问 1 个问题，对方只能回答是或否
   - 目标 - 用**最少的问题**才出答案 - **高效决策**

## sklearn

> 根据天气情况、温度和风速来决定进行什么活动

```python
from sklearn.tree import DecisionTreeClassifier, plot_tree
import matplotlib.pyplot as plt
import numpy as np

# 创建数据集
X = np.array([
    [0, 2, 0],  # 晴天，高温，无风
    [1, 1, 1],  # 阴天，中温，微风
    [2, 0, 2],  # 雨天，低温，强风
    # ... 添加更多样本以增加模型的准确性
])
y = np.array([0, 1, 2])  # 分别对应去野餐、去博物馆、在家看书

# 初始化决策树模型，设置最大深度为5
clf = DecisionTreeClassifier(max_depth=5, random_state=42)

# 训练模型
clf.fit(X, y)

# 可视化决策树
plt.figure(figsize=(20, 10))
plot_tree(clf, filled=True,
          feature_names=["weather", "temperature", "wind"],  # 分别对应天气、温度、风力
          class_names=["picnic", "museum", "reading"],
          rounded=True, fontsize=12)
plt.show()
```

![decision-tree](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/decision-tree.png)

### 指标

1. **gini** 指数 - <u>纯度</u>
   - 衡量**节点纯度**的指标，用于**分类**问题
   - 一个节点的 gini 指数**越低**，表示这个节点**包含的样本**越倾向于**同一个类别**
   - **0** 表示**所有样本**都属于**同一类别**，即**完全纯净**
2. **samples** - <u>样本总数</u>
   - 表示**到达**这个节点的样本数量
   - 提供了关于**树的分支**如何**基于数据集**进行**分割**的直观理解
   - 可以用于帮助**评估**决策树各个部分的**数据覆盖范围**
3. **value** - <u>样本分布</u>
   - 表示这个节点**每个类别**的**样本数量**
   - 该**数组**提供了**分类分布**的具体信息
   - 有助于了解每个决策节点处**数据**是如何被**分割**的
4. **class** - <u>主要类别/预测类别</u>
   - 代表在当前节点样本中**占多数的类别**
   - 如果一个节点是**叶子节点**，那么该类别就是这个节点的**预测类别**
   - 如果一个节点是**非叶子节点**，那么该类别就是这个节点的**主要类别**

### 作用

1. 可以理解决策树是**如何根据特征分割数据**
2. 还可以评估**树的深度**、每个节点的**决策质量**、模型是否可能出现**过拟合**
   - **过拟合** - 某些**叶子节点**上只有**很少的样本**
3. **指标**是**调整模型参数**来**优化模型性能**的重要**依据**
   - **树**的**最大深度**
   - 进行**节点分割**的**最少样本数**

# 随机森林

## 概述

1. 随机森林属于**集成学习**家族
2. 随机森林可以通过**构建多个决策树**来进行**预测**
3. 基本思想 - **集体智慧** - 多个模型**集合**起来可以作出**更好的判断**
4. 随机森林的关键 - **随机性**

| 随机性         | 描述                                                         |
| -------------- | ------------------------------------------------------------ |
| **样本**随机性 | **每棵树**训练的数据通过从**原始数据**中进行**随机抽样**得到 - **自助采样** |
| **特征**随机性 | 在**分裂决策树节点**时，从所有特征中**随机选取**一部分**特征**<br />然后只在这些**随机选取的特征**中寻找**最优分裂特征** |

> 随机森林的**随机性**，使得模型具有**很高的准确性**，同时能**防止模型过拟合**
> **过拟合** - 因为**训练数据**或者**模型参数**导致模型**缺乏泛化能力**

1. **泛化**能力 ≈ **通用**能力
2. **训练模型**的目的是希望模型**解决通用问题**
3. 场景 - 训练一个模型，用来识别一个照片中有没有狗
   - 训练完成后，只能识别**直尾巴**的狗，因为有一个参数是描述尾巴是直的还是弯的
   - 该**参数**的存在使得模型**额外识别**了狗的**另一个（不重要的）特征**，失去了**泛化**能力 - **过拟合**

## 决策树

> **决策树**会出现**过拟合** - 不**通用**，缺少**泛化**能力

1. 如果一个**决策条件**中有一个**非常不通用**的条件，分类后的分支节点**只有一个样本**
2. 说明该决策没有**通用**性（缺少**泛化**能力），那么这个**决策树**模型存在**过拟合**的问题

## 工作原理

> 随机森林可以解决**决策树过拟合**的问题

1. **训练** - <u>随机</u>
   - 从**原始数据集**中**随机抽样**选取**多个子集**
   - 每个**子集**训练一个**决策树**
2. **决策** - <u>独立 + 投票</u>
   - 每棵树**独立**进行**预测**
   - 最终预测结果是**所有**的树预测结果的**投票**或者**平均**

## sklearn

```python
import matplotlib.pyplot as plt
from sklearn.tree import plot_tree
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import load_iris

# 加载数据集
# The iris dataset is a classic and very easy multi-class classification dataset.
iris = load_iris()
X, y = iris.data, iris.target

# 训练随机森林模型
rf = RandomForestClassifier(n_estimators=3, random_state=42)  # 使用3棵树以便于可视化
rf.fit(X, y)

# 绘制随机森林中的决策树
fig, axes = plt.subplots(nrows=1, ncols=3, figsize=(20, 5), dpi=100)
for index in range(0, 3):
    plot_tree(rf.estimators_[index],
              feature_names=iris.feature_names,
              class_names=iris.target_names,
              filled=True,
              ax=axes[index])

    axes[index].set_title(f'Tree {index + 1}')

plt.tight_layout()
plt.show()
```

![random-forest](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/random-forest.png)

> 决策步骤

| 步骤         | 操作                                                         |
| ------------ | ------------------------------------------------------------ |
| **独立预测** | 对于每个输入样本，随机森林中的每棵树都会**独立**作出**预测** |
| **投票计数** | 收集到所有树对每个样本的预测结果，并对这些结果进行**计数**   |
| **决定决策** | 对于每个样本，**被预测次数最多**的类别将成为随机深林的**最终预测结果** |

> 在实际应用中，可以构造**更多的决策树**来进行**预测**，使得模型**更准确更稳定**

# 支持向量机

> Support Vector Machine - SVM

## 概述

> 寻找不同类别间的**很粗且清晰**的界线，该界线由**距离最近**的几个点（**支持向量**）决定

### 优势

1. 在**分类决策**时，不仅仅依赖数据的分布
2. 并且具有很好的**泛化**能力，能够应对**未见过**的新数据

### 核心思想

1. 支持向量机是一种**强大**的**分类**算法，在**数据科学**和**机器学习**领域广泛应用
2. 核心思想
   - 找到一个**最优**的**决策边界** - 即**超平面**
   - 超平面能够以**最大的间隔**将**不同类别**的数据分开

### 超平面

1. 在**二维**空间中，边界为一条**线**

2. 在**三维**空间中，边界为一个**平面**

3. 在**高维**空间中，边界为**超平面**

4. 边界的目的 - 尽可能**准确**地**分隔**开**不同类别**的**数据点**

### 最大间隔

1. SVM 寻找的是能够以**最大间隔**分开数据的边界
2. **间隔** - 是**不同类别**中的**数据点**到这个边界的**最小距离**
3. SVM 试图使得该**最小距离尽可能大**
4. 目的 - 更能**抵抗**数据中的小变动，**提高**模型的**泛化**能力

### 支持向量

1. 支持向量 - 决定**最优超平面位置**的几个**关键数据点**
2. 这些关键数据点**不同类别**中是**最靠近决策边界**的数据点
3. **最大间隔的边界**就是通过这些关键数据点来确定的

### 核技巧

> **升维 -> 线性可分**

1. 当数据不是**线性可分**时 - 即无法通过一条**直线**或者一个**平面**来**分隔**

2. SVM 可以利用**核技巧**将数据**映射**到一个**更高维**的空间 - 数据**可能**会线性可分

3. 核技巧使得 SVM 在处理**非线性数据**时非常强大

## sklearn

```python
from sklearn import datasets
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split
import matplotlib.pyplot as plt
import numpy as np

# 生成模拟数据
X, y = datasets.make_blobs(n_samples=50, centers=2, random_state=6)

# 划分训练集和测试集
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

# 创建 SVM 模型
model = SVC(kernel='linear')  # 线性核
model.fit(X_train, y_train)

# 绘制数据点和分类边界
plt.figure(figsize=(8, 6))
plt.scatter(X[:, 0], X[:, 1], c=y, s=50, cmap='autumn')

# 绘制决策边界
ax = plt.gca()
xlim = ax.get_xlim()
ylim = ax.get_ylim()

# 创建网格点
xx = np.linspace(xlim[0], xlim[1], 30)
yy = np.linspace(ylim[0], ylim[1], 30)
YY, XX = np.meshgrid(yy, xx)
xy = np.vstack([XX.ravel(), YY.ravel()]).T
Z = model.decision_function(xy).reshape(XX.shape)

# 绘制决策边界和间隔
ax.contour(XX, YY, Z, colors='k', levels=[-1, 0, 1], alpha=0.5, linestyles=['--', '-', '--'])
plt.scatter(model.support_vectors_[:, 0], model.support_vectors_[:, 1], s=100, linewidth=1, facecolors='none',
            edgecolors='k')
plt.title("SVM Classification")
plt.xlabel("Feature A")
plt.ylabel("Feature B")
plt.show()
```

![svm](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/svm.png)

1. 使用**线性核**的 SVM 模型来**分类**模拟生成的数据点 - 橙色和黄色代表不同的类别
2. **黑色实线** - **决策边界** - 即 SVM 找到的**最优超平面** - 用于将两类数据分开
3. **虚线** - **决策边界的边缘** - **最大间隔的边界** - 这些**边缘之间的区域**就是**模型的间隔**
4. **黑色圆圈** - **支持向量** - 不同**类别**中**离决策边界最近**的几个点 - 用于确定决策边界

> **核函数 - 升维 - 线性可分**

1. 上述例子可以通过**直线**完成分类 - **线性可分** - 无需升维
2. 如果数据无法通过**直线**进行分类，则需要进行**升维**
   - 在**三维**空间，通过一个**平面**进行分类
3. SVM 可以选择**不同的核函数**来处理**更复杂的数据集**

# 神经网络

## 概述

1. 现在大部分的**主流 LLM** 都是基于**深度神经网络**
2. 设计思路
   - **模仿大脑**，由许多小的、处理信息的单位组成 - **神经元**
   - 各个神经元之间**彼此连接**，每个神经元可以向其它神经元**发送**和**接收**信号
3. 神经网络能够执行各种**复杂**的计算任务 - **图像识别 / 语音识别 / 自然语言处理**等

## 结构

> 输入层 + 隐藏层（多层） + 输出层

| Layer  | Desc                                                         |
| ------ | ------------------------------------------------------------ |
| 输入层 | 接收**原始数据**输入 - 图片的像素值 / 一段文本的编码         |
| 隐藏层 | 处理输入数据，可以有一个或多个隐藏层<br />隐藏层的神经元会对输入数据进行**加权和**，应用**激活函数**<br />可以捕捉输入数据中的**复杂模式和关系** |
| 输出层 | 根据隐藏层的处理结果，输出一个值或者一组值 - **最终预测结果** |

## 优势

> **非线性** -> 处理**复杂**任务

1. 神经网络是**非线性**的，可以理解**非常复杂**的**逻辑关系**
2. 在**深层神经网络**中，**不同的层**可以学习到**不同的特征**
   - **较低的层**可能学习**简单的特征**
   - **较高的层**可以学习到**更复杂的概念**
3. **从简单到复杂**的学习过程使得神经网络非常适合处理**复杂的数据结构**

## 组件

| Component | Desc                                                         |
| --------- | ------------------------------------------------------------ |
| 激活函数  | 赋予不同的**特性**                                           |
| 前向传播  | **逐层处理**输入数据，通过各种操作和**激活函数**的作用<br />逐渐**提取并组合**数据的**特征**，最终得到输出结果 |
| 训练过程  | 通过**反向传播**算法来**调整网络参数**<br />使得网络的输出**尽可能接近**真实标签，达到**最佳预测效果** |
| 反向传播  | 通过计算**模型输出**与**真实标签**之间的差距（**损失函数**）<br />并利用**链式**法则**逆向传播**这个**误差**，调整**每一层**的参数，使得网络的输出**更接近**真实标签 |
| 梯度下降  | 是一种优化算法，通过不断沿着**梯度的反方向**调整参数<br />逐步**降低损失函数**，使得网络的**预测效果逐渐提升**，达到**最优的训练效果** |
| 损失函数  | 衡量**模型输出**与**真实标签**之间**差距**，即模型的**预测效果**<br />**损失函数越小**表示模型的**预测越接近真实标签** |

## sklearn

```python
import matplotlib.pyplot as plt


# 创建一个简单的神经网络图，并调整文字标签的位置
def plot_neural_network_adjusted():
    fig, ax = plt.subplots(figsize=(10, 6))  # 创建绘图对象

    # 输入层、隐藏层、输出层的神经元数量
    input_neurons = 3
    hidden_neurons = 4
    output_neurons = 2

    # 绘制神经元
    layer_names = ['Input Layer', 'Hidden Layer', 'Output Layer']
    for layer, neurons in enumerate([input_neurons, hidden_neurons, output_neurons]):
        for neuron in range(neurons):
            circle = plt.Circle((layer * 2, neuron * 1.5 - neurons * 0.75 + 0.75), 0.5, color='skyblue', ec='black',
                                lw=1.5, zorder=4)
            ax.add_artist(circle)

    # 绘制连接线
    for input_neuron in range(input_neurons):
        for hidden_neuron in range(hidden_neurons):
            line = plt.Line2D([0 * 2, 1 * 2], [input_neuron * 1.5 - input_neurons * 0.75 + 0.75,
                                               hidden_neuron * 1.5 - hidden_neurons * 0.75 + 0.75], c='gray', lw=1,
                              zorder=1)
            ax.add_artist(line)
    for hidden_neuron in range(hidden_neurons):
        for output_neuron in range(output_neurons):
            line = plt.Line2D([1 * 2, 2 * 2], [hidden_neuron * 1.5 - hidden_neurons * 0.75 + 0.75,
                                               output_neuron * 1.5 - output_neurons * 0.75 + 0.75], c='gray', lw=1,
                              zorder=1)
            ax.add_artist(line)

    # 设置图参数
    ax.set_xlim(-1, 5)
    ax.set_ylim(-2, max(input_neurons, hidden_neurons, output_neurons) * 1.5)
    plt.axis('off')  # 不显示坐标轴

    # 调整层名称的绘制位置，确保不被遮挡
    for i, name in enumerate(layer_names):
        plt.text(i * 2, max(input_neurons, hidden_neurons, output_neurons) * 0.75 + 1, name,
                 horizontalalignment='center', fontsize=14, zorder=5)

    plt.title("Neural Network", fontsize=16)
    return fig


fig = plot_neural_network_adjusted()
plt.show()
```

![neural-network](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/neural-network.png)
