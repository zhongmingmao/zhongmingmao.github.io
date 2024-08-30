---
title: RAG - Document Parsing
mathjax: true
date: 2024-08-05 00:06:25
cover: https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240830092249777.png
categories:
  - AI
  - RAG
tags:
  - AI
  - RAG
  - LLM
---

# 文档解析

1. 文档解析的本质 - 将**格式各异**、**版本多样**、**元素多种**的文档数据，转化为**阅读顺序正确**的**字符串**信息
2. **Quality in, Quality out** 是 LLM 的典型特征
   - **高质量**的文档解析能够从各种**复杂格式**的**非结构化**数据中提取出**高精度信息**
   - 对 RAG 系统的**最终效果**起到**决定性**作用
3. RAG 系统的应用场景主要集中在**专业领域**和**企业场景**
   - 除了**数据库**，更多的数据以 PDF、Word 等**多种格式**存储
   - **PDF** 文件有统一的排版和多样化的结构形式，是**最为常见**的文档数据格式和交换格式

<!-- more -->

> Quality in, Quality out

![image-20240830100414954](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240830100414954.png)

# LangChain

## Document Loaders

1. LangChain 提供了一套功能强大的**文档加载器**（Document Loaders）
2. LangChain 定义了 BaseLoader 类和 Document 类
   - BaseLoader - 定义如何从不同**数据源**加载文档
   - Document - 统一描述不同文档类型的**元数据**
3. 开发者可以基于 BaseLoader 为特定数据源创建自定义加载器，将其内容加载为 Document 对象
4. Document Loader 模块是封装好的各种文档解析库**集成 SDK**，需要**安装**对应的**文档解析库**
5. 在实际研发场景中，需要根据具体的业务需求编写自定义的文档**后处理**逻辑

| Type  | Document Loader                | Library                  | App         |
| ----- | ------------------------------ | ------------------------ | ----------- |
| .pdf  | PDFPlumberLoader               | pdfplumber               |             |
| .txt  | TextLoader                     | -                        |             |
| .doc  | UnstructuredWordDocumentLoader | unstructured python-docx | libreoffice |
| .docx | UnstructuredWordDocumentLoader | unstructured python-docx |             |
| .ppt  | UnstructuredPowerPointLoader   | unstructured python-pptx |             |
| .pptx | UnstructuredPowerPointLoader   | unstructured python-pptx |             |
| .xlsx | UnstructuredExcelLoader        | unstructured openpyx     |             |
| .csv  | CSVLoader                      | pandas                   |             |
| .md   | UnstructuredMarkdownLoader     | unstructured markdown    |             |
| .xml  | UnstructuredXMLLoader          | unstructured Ixml        |             |
| .html | UnstructuredHTMLLoader         | unstructured Ixml        |             |

> Library

```
$ pip install unstructured pdfplumber python-docx python-pptx markdown openpyxl pandas
```

> App

```
$ sudo apt install libreoffice
$ brew install libreoffice
```

## LangChain Community

1. LangChain Community 是 LangChain 与常用第三方库集成的拓展库
2. langchain_community.document_loaders
   - 各类开源库和企业库基于 BaseLoader 扩展了**不同文档类型**的加载器
   - 覆盖了本地文件、云端文件、数据库、互联网平台、Web 服务等多种数据源

![2a85d51a7cf45dedf05fafc4488bb712.png](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/2a85d51a7cf45dedf05fafc4488bb712.png.webp)

# 加载文档

```python
from langchain_community.document_loaders import (
    PDFPlumberLoader,
    TextLoader,
    UnstructuredWordDocumentLoader,
    UnstructuredPowerPointLoader,
    UnstructuredExcelLoader,
    CSVLoader,
    UnstructuredMarkdownLoader,
    UnstructuredXMLLoader,
    UnstructuredHTMLLoader,
)  # 从 langchain_community.document_loaders 模块中导入各种文档加载器类

# 定义文档解析加载器字典，根据文档类型选择对应的文档解析加载器类和输入参数
DOCUMENT_LOADER_MAPPING = {
    ".pdf": (PDFPlumberLoader, {}),
    ".txt": (TextLoader, {"encoding": "utf8"}),
    ".doc": (UnstructuredWordDocumentLoader, {}),
    ".docx": (UnstructuredWordDocumentLoader, {}),
    ".ppt": (UnstructuredPowerPointLoader, {}),
    ".pptx": (UnstructuredPowerPointLoader, {}),
    ".xlsx": (UnstructuredExcelLoader, {}),
    ".csv": (CSVLoader, {}),
    ".md": (UnstructuredMarkdownLoader, {}),
    ".xml": (UnstructuredXMLLoader, {}),
    ".html": (UnstructuredHTMLLoader, {}),
}


def load_document(file_path):
    """
    解析多种文档格式的文件，返回文档内容字符串
    :param file_path: 文档文件路径
    :return: 返回文档内容的字符串
    """
    ext = os.path.splitext(file_path)[1]  # 获取文件扩展名，确定文档类型
    loader_tuple = DOCUMENT_LOADER_MAPPING.get(ext)  # 获取文档对应的文档解析加载器类和参数元组

    if loader_tuple:  # 判断文档格式是否在加载器支持范围
        loader_class, loader_args = loader_tuple  # 解包元组，获取文档解析加载器类和参数
        loader = loader_class(file_path, **loader_args)  # 创建文档解析加载器实例，并传入文档文件路径
        documents = loader.load()  # 加载文档
        content = "\n".join([doc.page_content for doc in documents])  # 多页文档内容组合为字符串
        print(f"文档 {file_path} 的部分内容为: {content[:100]}...")  # 仅用来展示文档内容前100个字符
        return content  # 返回文档内容的字符串

    print(file_path + f"，不支持的文档类型: '{ext}'")
    return ""
```

1. 解析多种文档格式并返回文档内容的字符串
2. 检查文件的扩展名 ext，并**动态选择**合适的 Document Loader
   - **实例化**对应的 Document Loader，并调用对应**文档解析库**读取文档内容
3. 将文档内容加载为**字符串** - 合并多页文档

# PDF

## PDF vs MarkDown

1. PDF
   - 显示效果不受设备、软件和系统的影响
   - 一系列**显示打印指令**的集合，**非数据结构化**格式，存储的信息无法被计算机直接理解
   - 在 **LLM** 的**训练数据**中**不包含**直接的 PDF 文件，**无法直接理解**
2. MarkDown
   - 关注**内容**而非打印格式，能够表示多种**文档元素**
   - PDF 转换为 MarkDown 最为合适，能够被 LLM 理解

## 电子版 vs 扫描版

> 电子版

1. 电子版可以通过**规则**解析 - 提取出**文本**、**表格**等文档元素
2. 开源库 - pyPDF2 / PyMuPDF / **pdfminer** / **pdfplumber** / papermage / ...
   - **pdfplumber** - 对**中文**支持**良好**，但**表格**解析效果**较弱**
   - **pyPDF2** - 对**英文**支持**较好**，但**中文**支持**较差**
   - **papermage** - 集成了 **pdfminer** 和其它工具，适合于处理**论文**场景

![2ce37e8a03fa9170abd06f7673d3878f](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/2ce37e8a03fa9170abd06f7673d3878f.png)

> 扫描版

1. 需要经过**文本识别**和**表格识别**，才能提取出文档中各类元素

## 文档解析

### Deep Learning

1. 要实现**真正**的文档解析，还需要进行**版面分析**和**还原阅读顺序**
2. 将内容解析为一个**包含所有文档元素**并具有**正确阅读顺序**的 MarkDown 文件
3. 只依赖**规则**解析无法实现这一点 - 基于**深度学习**的开源库
   - Layout-parser / PP-StructureV2 / PDF-Extract-Kit / pix2text / MinerU / marker / Gptpdf /...
   - 由于**深度学习模型**的**部署复杂性**以及**算力要求**，尚未集成在 LangChain Community 中 - 独立部署

| Model           | Desc                                                         | Starts | Link                                           |
| --------------- | ------------------------------------------------------------ | ------ | ---------------------------------------------- |
| LayoutParser    | 版面分析工具包<br />布局检测、OCR 识别、布局分析             | 4.7K   | https://github.com/Layout-Parser/layout-parser |
| PP-StructureV2  | 百度开源项目<br />文字识别、表格识别、版面还原               | 42.2K  | https://github.com/PaddlePaddle/PaddleOCR      |
| PDF-Extract-Kit | LayoutLMv3 - 布局检测<br />YOLOv8 - 公式检测<br />UniMERNet - 公式识别<br />PaddleOCR - 文字识别 | 4.5K   | https://github.com/opendatalab/PDF-Extract-Kit |
| pix2text        | 数学公式检测能力很突出，Mathpix 平替                         | 1.7K   | https://github.com/breezedeus/Pix2Text         |
| MinerU          | 上海人工智能实验室<br />支持多格式、高精度解析、支持多种语言 | 10.3K  | https://github.com/opendatalab/MinerU          |
| marker          | 对书籍和科学论文进行了优化                                   | 16K    | https://github.com/VikParuchuri/marker         |
| Gptpdf          | 基于 GPT-4o，每页解析成本为 $0.013                           | 2.7K   | https://github.com/CosmosShadow/gptpdf         |

### Paid

> 风险 - 信息泄露

1. 由于 PDF 文档解析流程用到了多个 **Deep Learning 模型组合**，在生产场景中会遇到**效率**问题
2. 商业闭源库部署在云端，可以做到**并行处理**和**工程效率优化**，在**精度**和**效率**上可以做到**生产级别**
   - https://www.textin.com/
   - https://doc2x.noedgeai.com/
   - https://mathpix.com/
   - https://pdflux.com/
   - https://cloud.tencent.com/product/documentocr

## 多模态

1. 需要进一步探索 PDF 中的**图像内容理解**
2. 不仅限于**文字**模态，还包括对图片中**非文字**内容的解析，也可能包含重要内容
   - 将这些内容转换为**文字**形式并嵌入到 **MarkDown** 文件中
   - 通常依赖于**端到端**的**多模态 LLM** - **GPT-4o / Gemini** - **成本 / 效率**
