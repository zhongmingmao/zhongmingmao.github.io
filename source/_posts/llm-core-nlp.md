---
title: LLM Core - NLP
mathjax: true
date: 2024-07-05 00:06:25
cover: https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/nlp.webp
categories:
  - AI
  - LLM
tags:
  - AI
  - LLM
  - NLP
---

# 基础

> NLP 的研究目的是让计算机能够**理解**、**解释**和**生成**人类语言，一般包含 4 个步骤

| Step       | Desc                                                         |
| ---------- | ------------------------------------------------------------ |
| 文本预处理 | 将**原始文本**转换成**机器容易理解**的格式<br />**分词**（单词或短语）、**去除停用词**、**词干提取**、**词性标注**等 |
| 特征提取   | 从处理过的文本中提取特征，以便用于机器学习模型<br />将**文本**转换成**数值**形式 - **向量化** - **词袋模型** or **<u>词嵌入</u>** |
| 模型训练   | 使用提取到的**特征**和相应的**机器学习算法**来训练模型<br />分类器、回归模型、聚类算法等 |
| 评估与应用 | 评估模型的**性能**，并在实际应用中使用模型来**解释**、**生成**或**翻译**文本 |

> 应用场景 - 搜索引擎 / 语音转换 / 文本翻译 / 系统问答

<!-- more -->

# ML vs NLP

| Scope    | Desc                                                 |
| -------- | ---------------------------------------------------- |
| ML       | 让计算机通过查看**大量的例子**来**学习**如何完成任务 |
| NLP      | 教会计算机**理解**和**使用**人类语言                 |
| ML + NLP | 用机器学习的技术来让计算机学习如何处理和理解语言     |

# 文本预处理

> 将**原始文本**转换成**易于机器理解和处理**的格式

## 文本清洗

> 去除**噪音**（对分析无关紧要的部分）及**标准化**文本

```python
import re


def remove_noise(text):
    # 去除HTML标签
    text = re.sub(r'<.*?>', '', text)
    # 去除标点符号和特殊字符
    text = re.sub(r'[^\w\s]', '', text)
    return text


text = "<p>Hello, World! Here's a <a href='https://example.com'>link</a>.</p>"
clean_text = remove_noise(text)
print(clean_text)

# 全部标准化成小写
tokens_normalized = [token.lower() for token in clean_text]
print(tokens_normalized)
```

> 输出

```
Hello World Heres a link
['h', 'e', 'l', 'l', 'o', ' ', 'w', 'o', 'r', 'l', 'd', ' ', 'h', 'e', 'r', 'e', 's', ' ', 'a', ' ', 'l', 'i', 'n', 'k']
```

## 分词

> 将**文本**分解成**词汇**、**句子**等

```python
from nltk.tokenize import word_tokenize

text = "Natural language processing (NLP) is a field of computer science."
tokens = word_tokenize(text)
print(tokens)
```

> 输出

```
['Natural', 'language', 'processing', '(', 'NLP', ')', 'is', 'a', 'field', 'of', 'computer', 'science', '.']
```

## 去除停用词

> 停用词 - 文本中**频繁出现**但**对分析意义不大**的词，如 is 和 and 等
> 去除停用词 - 提高**处理效率**和**分析效果** + 使得**数据集变小**

```python
import nltk
from nltk.corpus import stopwords
import re


def remove_noise(text):
    # 去除HTML标签
    text = re.sub(r'<.*?>', '', text)
    # 去除标点符号和特殊字符
    text = re.sub(r'[^\w\s]', '', text)
    return text


# 从停用词库中取出英文相关的停用词
stop_words = set(stopwords.words('english'))
# {"shan't", 'own', "she's", 'at', 'through', 'shan', 'didn', 'herself', 'their', 'has', 'was', 'had', "you'd", 'each', "don't", 'some', "weren't", 're', "couldn't", 'yourself', 'he', 'himself', 'his', 'now', 'same', 'don', 'where', 'is', "you'll", 'against', 'after', 'shouldn', 'from', 'ours', 'ourselves', 'yours', 'o', 'of', 'have', 'you', 'weren', 'him', 's', 'most', 'theirs', 'if', 'or', 'an', 'been', 'then', 'here', 'more', 'were', 'between', "you're", 'again', 'who', 'being', 'which', 'do', 'themselves', 'y', 'm', 'doesn', 'during', 'mustn', 'but', 'how', 'so', 'such', 't', 'just', "needn't", "mightn't", 'than', "won't", 'too', "wouldn't", 'did', 'does', 'few', "haven't", 'all', 'it', 'that', 'when', 'both', 'until', 'on', 'its', 'the', "doesn't", 'our', 'she', "hasn't", 'they', 'to', 'whom', 'below', 'isn', 'there', 'we', 'very', 'about', 'other', 'her', 'wouldn', 'with', 'couldn', 'over', 'off', 'should', 'for', 'haven', 'while', 'in', 'ain', 'll', 've', 'a', 'won', 'having', 'further', 'aren', 'hasn', 'as', "should've", 'wasn', 'and', 'these', 'no', 'mightn', 'will', "you've", 'up', 'this', 'once', "it's", 'd', 'am', 'nor', 'into', "didn't", "that'll", 'them', 'myself', 'be', 'ma', 'before', "wasn't", 'only', "hadn't", 'why', "mustn't", 'because', "isn't", 'i', 'itself', 'doing', 'not', 'can', 'by', "shouldn't", 'under', 'what', 'my', 'your', 'are', 'hadn', 'above', "aren't", 'down', 'needn', 'hers', 'yourselves', 'those', 'out', 'me', 'any'}
print(stop_words)

text = "<p>Hello, World! Here's a <a href='https://example.com'>link</a>.</p>"
clean_text = remove_noise(text)
print(clean_text)

tokens_normalized = [token.lower() for token in clean_text]
print(tokens_normalized)

# 把标准化后文本中的停用词去掉
filtered_tokens = [word for word in tokens_normalized if word not in stop_words]
print(filtered_tokens)
```

## 词干提取

1. 去除单词的**词缀**（前缀 or 后缀），以便于找到单词的**词干**或**根形式**
2. 该过程是**启发式**的，可能返回的**不是真实的单词**，而是单词的一个**截断形式**
   - running / runs / runner -> run
3. 可以减少**词形变化**的影响，使**相关的单词**能够在分析时被**归纳为相同的形式**
4. **简化**文本数据 + 提高文本任务的**处理性能**

```python
import nltk
from nltk.stem import PorterStemmer
from nltk.tokenize import word_tokenize

nltk.download('punkt')

# 初始化词干提取器
stemmer = PorterStemmer()

# 示例文本
text = "The leaves on the trees are falling quickly in the autumn season."

# 分词
tokens = word_tokenize(text)

# 词干提取
stemmed_tokens = [stemmer.stem(token) for token in tokens]
print("原始文本:")
print(tokens)
print("\n词干提取后:")
print(stemmed_tokens)
```

> 输出

```
原始文本:
['The', 'leaves', 'on', 'the', 'trees', 'are', 'falling', 'quickly', 'in', 'the', 'autumn', 'season', '.']

词干提取后:
['the', 'leav', 'on', 'the', 'tree', 'are', 'fall', 'quickli', 'in', 'the', 'autumn', 'season', '.']
```

## 词形还原

1. 将单词还原到它的**词典形式**，即词条的**基本形式**或者**词元形式**
2. 与**词干提取**相比，**词形还原**考虑了单词的**词性**，并尝试更加**精确**的转换 - **真实单词**
   - am / are / is -> be
3. 词性还原能够将单词还原到其**标准形式**，有助于**保持语义的准确性**
4. 适用于需要**精确**理解和分析文本意义的场合 - **语义分析**

```python
from nltk.stem import WordNetLemmatizer
import nltk
from nltk.tokenize import word_tokenize

nltk.download('wordnet')

text = "The leaves on the trees are falling quickly in the autumn season."

# 分词
tokens = word_tokenize(text)

# 初始化词形还原器
lemmatizer = WordNetLemmatizer()

# 词形还原（默认为名词）
lemmatized_tokens = [lemmatizer.lemmatize(token) for token in tokens]
print("原始文本:")
print(tokens)
print("\n词形还原:")
print(lemmatized_tokens)
```

> 输出

```
原始文本:
['The', 'leaves', 'on', 'the', 'trees', 'are', 'falling', 'quickly', 'in', 'the', 'autumn', 'season', '.']

词形还原:
['The', 'leaf', 'on', 'the', 'tree', 'are', 'falling', 'quickly', 'in', 'the', 'autumn', 'season', '.']
```

## 词性标注

1. 将文本中的每个**单词**或**符号**标注为相应的**词性** - <u>名词/动词/形容词</u>
2. 可以揭示单词在句子或语言结构中的**作用**和**意义**

## 命名实体识别

1. 识别文本中具有**特定意义**的实体 - 人名、地点、组织、日期、时间等
2. 旨在识别出文本中的实体，并将它们**归类**为**预定义的类别**

```python
import spacy

# 加载英文模型
nlp = spacy.load("en_core_web_sm")

# 示例文本
text = "Apple is looking at buying U.K. startup for $1 billion."

# 处理文本
doc = nlp(text)

# 词性标注
print("POS Tagging:")
for token in doc:
    print((token.text, token.pos_))

# 命名实体识别
print("\nNamed Entity Recognition:")
for ent in doc.ents:
    print((ent.text, ent.label_))
```

> 词性标注

```
POS Tagging:
('Apple', 'PROPN')
('is', 'AUX')
('looking', 'VERB')
('at', 'ADP')
('buying', 'VERB')
('U.K.', 'PROPN')
('startup', 'NOUN')
('for', 'ADP')
('$', 'SYM')
('1', 'NUM')
('billion', 'NUM')
('.', 'PUNCT')
```

> 命名实体识别

```
Named Entity Recognition:
('Apple', 'ORG')
('U.K.', 'GPE')
('$1 billion', 'MONEY')
```

# 特征提取

> 从**原始文本**中挑选出**主要信息**，然后用**计算机能理解**的方式进行表达

1. 将**原始文本**转换成可以被机器学习模型**理解**和**处理**的**数值**形式
2. 在文本数据中，挑选出**反映文本特征**的信息，将其转换成一种**结构化**的**数值**表示
3. 机器学习算法通常无法直接处理原始文本数据，有助于**提高模型性能**

## 词袋模型

> Bag of Words - BoW

1. 忽略文本中单词的**顺序**，仅关注每个单词出现的**次数**
   - **部分失真**，对原文语义的**理解不足**
2. 每个**文档**被转换成一个**长向量**
   - **向量的长度** = **词汇表**中的**单词的数量**
   - **每个单词**分配一个**固定的索引**
   - 向量中的每个**元素**是该单词在文档中**出现的次数**

```python
from sklearn.feature_extraction.text import CountVectorizer

corpus = [
    'Text analysis is fun',
    'Text analysis with Python',
    'Data Science is fun',
    'Python is great for text analysis'
]

vectorizer = CountVectorizer()
X = vectorizer.fit_transform(corpus)

# 所有文档中至少出现过 1 次的唯一单词 - 词汇表
# CountVectorizer 按字母顺序排序这些单词，并为每个单词分配一个特定的索引位置
print(vectorizer.get_feature_names_out())

# 文档的向量表示， 为一个 4 x 10 的矩阵，有 4 个文档和 10 个唯一单词
# 每一行代表一个文档，每一列代表词汇表中的一个单词
print(X.toarray())
```

> 词汇表

```
['analysis' 'data' 'for' 'fun' 'great' 'is' 'python' 'science' 'text'
 'with']
```

> 向量表示

```
[[1 0 0 1 0 1 0 0 1 0]
 [1 0 0 0 0 0 1 0 1 1]
 [0 1 0 1 0 1 0 1 0 0]
 [1 0 1 0 1 1 1 0 1 0]]
```

## 词嵌入

> Word Embeddings

1. 基于词嵌入产生的检索是**真是意义的相似**
2. 将词汇**映射**到**实际向量空间**中，同时可以**捕获语义关系**

```python
from gensim.models import Word2Vec
from nltk.tokenize import word_tokenize

# 定义训练语料
sentences = [
    "The cat sat on the mat.",
    "Dogs and cats are enemies.",
    "The dog chased the cat."
]

# 使用NLTK进行分词
tokenized_sentences = [word_tokenize(sentence.lower()) for sentence in sentences]
print(tokenized_sentences)

# 训练Word2Vec模型
model = Word2Vec(sentences=tokenized_sentences, vector_size=100, window=5, min_count=1, workers=4)

# 获取单词“cat”的向量
cat_vector = model.wv['cat']
print("cat的向量表示:", cat_vector)

# 找到与“cat”最相似的单词
similar_words = model.wv.most_similar('cat', topn=5)
print("和cat相似的单词是:", similar_words)
```

> 通过 gensim 库训练出来一个 **Word2Vec** 模型，设置 **100 维向量** - 单词

```
[['the', 'cat', 'sat', 'on', 'the', 'mat', '.'], ['dogs', 'and', 'cats', 'are', 'enemies', '.'], ['the', 'dog', 'chased', 'the', 'cat', '.']]
cat的向量表示: [ 9.4563962e-05  3.0773198e-03 -6.8126451e-03 -1.3754654e-03
  7.6685809e-03  7.3464094e-03 -3.6732971e-03  2.6427018e-03
 -8.3171297e-03  6.2054861e-03 -4.6373224e-03 -3.1641065e-03
  9.3113566e-03  8.7338570e-04  7.4907029e-03 -6.0740625e-03
  5.1605068e-03  9.9228229e-03 -8.4573915e-03 -5.1356913e-03
 -7.0648370e-03 -4.8626517e-03 -3.7785638e-03 -8.5361991e-03
  7.9556061e-03 -4.8439382e-03  8.4236134e-03  5.2625705e-03
 -6.5500261e-03  3.9578713e-03  5.4701497e-03 -7.4265362e-03
 -7.4057197e-03 -2.4752307e-03 -8.6257253e-03 -1.5815723e-03
 -4.0343284e-04  3.2996845e-03  1.4418805e-03 -8.8142155e-04
 -5.5940580e-03  1.7303658e-03 -8.9737179e-04  6.7936908e-03
  3.9735902e-03  4.5294715e-03  1.4343059e-03 -2.6998555e-03
 -4.3668128e-03 -1.0320747e-03  1.4370275e-03 -2.6460087e-03
 -7.0737829e-03 -7.8053069e-03 -9.1217868e-03 -5.9351693e-03
 -1.8474245e-03 -4.3238713e-03 -6.4606704e-03 -3.7173224e-03
  4.2891586e-03 -3.7390434e-03  8.3781751e-03  1.5339935e-03
 -7.2423196e-03  9.4337985e-03  7.6312125e-03  5.4932819e-03
 -6.8488456e-03  5.8226790e-03  4.0090932e-03  5.1853694e-03
  4.2559016e-03  1.9397545e-03 -3.1701624e-03  8.3538452e-03
  9.6121803e-03  3.7926030e-03 -2.8369951e-03  7.1275235e-06
  1.2188185e-03 -8.4583247e-03 -8.2239453e-03 -2.3101569e-04
  1.2372875e-03 -5.7433806e-03 -4.7252737e-03 -7.3460746e-03
  8.3286157e-03  1.2129784e-04 -4.5093987e-03  5.7017053e-03
  9.1800150e-03 -4.0998720e-03  7.9646818e-03  5.3754342e-03
  5.8791232e-03  5.1259040e-04  8.2130842e-03 -7.0190406e-03]
和cat相似的单词是: [('and', 0.19912061095237732), ('on', 0.17272791266441345), ('dog', 0.17018885910511017), ('are', 0.14595399796962738), ('enemies', 0.0640898048877716)]
```

> 解释

| 方式 | 描述                                                       |
| ---- | ---------------------------------------------------------- |
| 数学 | 单词用 **100 维向量**来表示，是在 **100 维空间**的表示方式 |
| 语义 | 单词有 **100 个属性**                                      |

# 模型训练

1. 丢给计算机包含了大量例子（包含**正确答案**）的**数据集**
2. 计算机通过数据集尝试学习，一开始会犯很多错误
3. 随着不断地**尝试**和**学习**，开始识别数据中的**模式**和**规律**
4. 会用一些计算机**没见过**的新例子来检测计算机学到了多少
5. 在训练过程中，不断调整计算机学习的方式，即**算法参数**
6. 最后，当计算机能够**准确快速**地解决问题时，说明模型已经训练好了

# 评估与应用

1. 当模型训练好后，需要进行**测试**与**评估**
2. 评估的目的 - 衡量模型的**性能**和**准确性** - 确保它能够**可靠**地完成既定任务
3. 实现方式 - 将模型的**预测结果**与**实际结果**进行**比较**
4. 性能指标（取决于任务的性质） - **准确率**、**精确率**、**召回率**、**F1 分数**等
5. 如果模型经过评估**满足标准**，则可以放到**实际应用**去解决问题
6. 在模型**部署**后，依然需要**持续监控**其**性能**
   - 确保随着时间的推移和数据变化，模型依然有效
   - 必要时，模型需要基于**新数据**或**反馈**进行**重新训练**和**更新**
