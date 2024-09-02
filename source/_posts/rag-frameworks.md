---
title: RAG - Frameworks
mathjax: true
date: 2024-08-08 00:06:25
cover: https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/rag-frameworks.png
categories:
  - AI
  - RAG
tags:
  - AI
  - RAG
  - LLM
---

# Overview

1. Retrieval-Augmented Generation (RAG) is an AI framework that enhances the capabilities of large language models (LLMs) by **incorporating external knowledge sources**.
2. It helps overcome limitations such as knowledge **cutoff dates** and reduces the risk of **hallucinations** in LLM outputs.
3. RAG works by **retrieving relevant information** from a **knowledge base** and using it to **augment the LLM’s input**, allowing the model to generate more **accurate**, **up-to-date**, and **contextually relevant** responses.

<!-- more -->

![star-history-rag-frameworks](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/star-history-rag-frameworks.png)

# Haystack

1. Haystack is an **end-to-end** LLM framework that allows you to build applications powered by **LLMs**, **Transformer models**, **vector search** and more.
2. Whether you want to perform **RAG**, **document search**, **question answering** or **answer generation**, Haystack can orchestrate state-of-the-art **embedding models** and **LLMs** into **pipelines** to build **end-to-end** NLP applications and solve your use case.
3. Haystack supports multiple installation methods including **Docker images**. You can simply get Haystack via **pip**.

![image-20240831180409584](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240831180409584.png)

# RAGFlow

1. RAGFlow offers a **streamlined RAG workflow** for businesses of any scale, combining LLM (Large Language Models) to provide truthful question-answering capabilities, backed by well-founded citations from various complex formatted data.
2. It features "**Quality in, quality out**", **template-based chunking**, **grounded citations with reduced hallucinations**, **compatibility with heterogeneous data sources**, and **automated** and **effortless** RAG **workflow**.

![image-20240831181008264](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240831181008264.png)

> Prerequisites

| Component      | Desc        |
| -------------- | ----------- |
| CPU            | \>= 4 cores |
| RAM            | \>= 16 GB   |
| Disk           | \>= 50 GB   |
| Docker         | \>= 24.0.0  |
| Docker Compose | \>= v2.26.1 |

# STORM

1. STORM is a LLM system that **writes Wikipedia-like articles** from scratch based on **Internet search**.
2. It breaks down generating long articles with citations into two steps
   - **Pre-writing** stage and **Writing** stage
   - and identifies the core of automating the research process as automatically **coming up with good questions** to ask.
3. To improve the **depth** and **breadth** of the questions, STORM adopts two strategies
   - **Perspective-Guided Question Asking** and **Simulated Conversation**.
4. Based on the separation of the two stages, STORM is implemented in a **highly modular way** using **dspy**.
   - DSPy: Programming—not prompting—Foundation Models

![two_stages](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/two_stages.jpg)

# FlashRAG

1. FlashRAG is a Python toolkit for the **reproduction** and **development** of RAG research including **32** pre-processed benchmark RAG **datasets** and **14** state-of-the-art RAG **algorithms**.
2. With FlashRAG and provided resources, you can **reproduce** existing **SOTA** works in the RAG domain or implement your custom RAG processes and components.
3. FlashRAG features **Extensive** and **Customizable** Framework, **Comprehensive Benchmark Datasets**, **Pre-implemented Advanced RAG Algorithms**, **Efficient Preprocessing Stage**, and **Optimized Execution**. It's still under development and more good functions are to be uncovered.

![flashrag](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/flashrag.webp)

# Canopy

1. Canopy is an open-source RAG framework and context engine built on top of the **Pinecone** vector database enabling you to quickly and easily experiment with and build applications using RAG.
2. Just start **chatting** with **your documents or text data** with a few simple commands.
3. Canopy **takes on the heavy lifting** for **building** RAG applications
   - from **chunking** and **embedding** your text data to chat history management, **query optimization**, **context retrieval** (including prompt engineering), and **augmented generation**.
4. It provides a **configurable built-in server** so you can effortlessly deploy a **RAG-powered chat application** to your **existing chat UI** or **interface**. Or you can build your own, custom RAG application using the Canopy library.
5. It lets you evaluate your RAG workflow with a CLI based chat tool as well.
6. With a simple command in the Canopy CLI you can interactively chat with your text data and compare RAG vs. non-RAG workflows side-by-side.

![canopy](https://rag-1253868755.cos.ap-guangzhou.myqcloud.com/canopy.webp)
