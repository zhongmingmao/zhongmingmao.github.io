---
title: MCP - Introduction
mathjax: true
date: 2026-03-02 18:54:32
cover: https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/hero.webp
categories:
  - AI
  - MCP
tags:
  - AI
  - MCP
---

# Background

1. **Generative AI applications** are a great step forward as they often let the user interact with the app using **natural language prompts**.
2. However, as more **time** and **resources** are invested in such apps, you want to make sure you can easily integrate **functionalities** and **resources** in such a way that it's **easy to extend**, that your app can cater to more than one model being used, and **handle various model intricacies**.
3. In short, **building Gen AI apps** is easy to begin with, but as they grow and become more **complex**, you need to start **defining an architecture** and will likely need to rely on a **standard** to ensure your apps are built in a **consistent** way.
4. This is where **MCP** comes in to organize things and provide a standard.

<!-- more -->

# What Is the Model Context Protocol (MCP)?

1. The Model Context Protocol (**MCP**) is an **open, standardized interface** that allows Large Language Models (**LLMs**) to **interact** seamlessly with **external tools**, **APIs**, and **data sources**.
2. It provides a **consistent architecture** to **enhance AI model functionality** beyond their **training data**, enabling **smarter**, **scalable**, and more **responsive** AI systems.

# Why Standardization in AI Matters

1. As **generative AI applications** become more **complex**, it's **essential** to **adopt standards** that ensure **scalability**, **extensibility**, **maintainability**, and **avoiding vendor lock-in**. MCP addresses these needs by:
   - Unifying **model-tool** integrations
   - Reducing brittle, one-off custom solutions
   - Allowing **multiple models** from **different vendors** to **coexist** within **one ecosystem**
2. Note: While MCP **bills itself** as an **open standard**
   - there are no plans to **standardize MCP** through **any existing standards bodies** such as **IEEE**, **IETF**, **W3C**, **ISO**, or any other standards body.

# Learning Objectives

1. Define Model Context Protocol (**MCP**) and its **use cases**
2. Understand how MCP **standardizes model-to-tool communication**
3. Identify the **core components** of **MCP architecture**
4. Explore **real-world applications** of **MCP** in **enterprise** and **development contexts**

# Why the Model Context Protocol (MCP) Is a Game-Changer

## MCP Solves Fragmentation in AI Interactions

> Before MCP, integrating **models** with **tools** required:

1. **Custom** code per **tool-model pair**
2. **Non-standard APIs** for **each vendor**
3. **Frequent breaks** due to **updates**
4. **Poor scalability** with more tools

## Benefits of MCP Standardization

| Benefit                        | Description                                                  |
| ------------------------------ | ------------------------------------------------------------ |
| <u>Interoperability</u>        | **LLMs** work **seamlessly** with **tools across different vendors** |
| <u>Consistency</u>             | **Uniform behavior** across **platforms** and **tools**      |
| <u>Reusability</u>             | **Tools built once** can be used across **projects** and **systems** |
| <u>Accelerated Development</u> | **Reduce dev time** by using **standardized**, **plug-and-play interfaces** |

# High-Level MCP Architecture Overview

> MCP follows a **client-server model**, where:

| Key             | Desc                                               |
| --------------- | -------------------------------------------------- |
| MCP **Hosts**   | run the **AI models**                              |
| MCP **Clients** | initiate **requests**                              |
| MCP **Servers** | serve **context**, **tools**, and **capabilities** |

![mcp-arch](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/mcp-arch.webp)

> Host

  - 职责：**承载和执行 LLM 推理引擎，管理模型访问与凭证**
  - 控制域：模型选择、权限策略、用户授权流、会话协调
  - 典型实例：Claude Desktop、Cursor IDE、自定义 AI 应用

> Client

  - 职责：代表 Host 发起与 Server 的连接，执行**协议握手**与**能力协商**
  - 暴露能力：**Sampling**（LLM 生成）、**Roots**（文件系统边界）
  - 通信模式：**1:1** 映射到**单个 Server**，通过 **stdio** 或 **SSE** 传输

> Server

  - 职责：暴露**外部系统**/**数据源**的**结构化接口**
  - 核心原语：**Resources**（<u>只读上下文</u>）、**Tools**（<u>可执行函数</u>）、**Prompts**（<u>可复用指令模板</u>）
  - 设计模式：**单一职责原则**，每个 Server 封装一个外部系统

## Key Components

| Components         | Desc                                                    |
| ------------------ | ------------------------------------------------------- |
| <u>Resources</u>   | **Static or dynamic data** for models                   |
| <u>Prompts</u>     | **Predefined workflows** for **guided generation**      |
| <u>Tools</u>       | **Executable functions** like search, calculations      |
| <u>Sampling</u>    | **Agentic behavior** via **recursive interactions**     |
| <u>Elicitation</u> | **Server-initiated requests** for **user input**        |
| <u>Roots</u>       | **Filesystem boundaries** for **server access control** |

### Sampling

> Agentic behavior via recursive interactions

![image-20260302212729795](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260302212729795.png)

![image-20260302213012671](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260302213012671.png)

### Elicitation

> Server-initiated requests for user input - Server 主动请求用户输入

![image-20260302213722289](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260302213722289.png)

![image-20260302214205271](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260302214205271.png)

![image-20260302214246321](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260302214246321.png)

![image-20260302214358626](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260302214358626.png)

![image-20260302214520803](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260302214520803.png)

![image-20260302214635361](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260302214635361.png)

### Roots

> Filesystem boundaries for server access control

![image-20260302215303414](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260302215303414.png)

![image-20260302215403629](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260302215403629.png)

![image-20260302215710037](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260302215710037.png)

![image-20260302220012219](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260302220012219.png)

![image-20260302220109400](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260302220109400.png)

![image-20260302220218655](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260302220218655.png)

### Summary

![image-20260302220651764](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260302220651764.png)

![image-20260302220831011](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260302220831011.png)

![image-20260302221106432](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260302221106432.png)

![image-20260302221648487](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260302221648487.png)

![image-20260303094108846](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260303094108846.png)

![image-20260303094139788](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260303094139788.png)

![image-20260303094805966](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260303094805966.png)

## Protocol Architecture

> MCP uses a **two-layer** architecture

| Layer                  | Desc                                                         |
| ---------------------- | ------------------------------------------------------------ |
| <u>Data Layer</u>      | **JSON-RPC 2.0** based communication with **lifecycle management** and **primitives** |
| <u>Transport Layer</u> | **STDIO** (local) and **Streamable HTTP** with **SSE** (remote) communication channels |

# How MCP Servers Work

> How MCP Servers Work

![image-20260303141751054](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260303141751054.png)

## Request Flow

1. A **request** is **initiated** by an **end user** or **software** acting on their behalf.
2. The **MCP Client** sends the **request** to an **MCP Host**, which manages the **AI Model runtime**.
3. The **AI Model** receives the **user prompt** and may **request** access to **external tools or data** via **one or more tool calls**.
4. The **MCP Host**, not the model directly, **communicates** with the **appropriate MCP Server(s)** using the **standardized protocol**.

## MCP Host Functionality

| Functionality             | Desc                                                         |
| ------------------------- | ------------------------------------------------------------ |
| <u>Tool Registry</u>      | **Maintains** a **catalog** of **available tools** and their **capabilities**. |
| <u>Authentication</u>     | Verifies **permissions** for **tool access**.                |
| <u>Request Handler</u>    | **Processes incoming tool requests** from the **model**.     |
| <u>Response Formatter</u> | **Structures tool outputs** in a format the **model** can **understand**. |

## MCP Server Execution

1. The **MCP Host** <u>routes tool calls</u> to **one or more MCP Servers**, each **exposing specialized functions** (e.g., search, calculations, database queries).
2. The **MCP Servers** perform their **respective operations** and return **results** to the **MCP Host** in a **consistent format**.
3. The **MCP Host** <u>formats and relays</u> these results to the **AI Model**.

## Response Completion

1. The **AI Model** <u>incorporates</u> the **tool outputs** into a **final response**.
2. The **MCP Host** sends this **response** back to the **MCP Client**, which delivers it to the **end user** or **calling software**.

# Real-World Use Cases for MCP

> MCP enables a **wide range** of **applications** by **extending AI capabilities**:

| Application                        | Description                                                  |
| ---------------------------------- | ------------------------------------------------------------ |
| <u>Enterprise Data Integration</u> | Connect LLMs to **databases**, **CRMs**, or **internal tools** |
| <u>Agentic AI Systems</u>          | Enable **autonomous agents** with **tool access** and **decision-making workflows** |
| <u>Multi-modal Applications</u>    | Combine **text**, **image**, and **audio** tools within a single unified AI app |
| <u>Real-time Data Integration</u>  | Bring **live data** into AI interactions for more accurate, current outputs |

## MCP = Universal Standard for AI Interactions

1. The **MCP** acts as a **universal standard** for **AI interactions**, much like how **USB-C** standardized **physical connections** for devices.
2. In the world of AI, MCP provides a **consistent interface**
   - allowing **models (clients)** to **integrate seamlessly** with **external tools** and **data providers (servers)**. 
3. This **eliminates** the need for **diverse, custom protocols** for **each API** or **data source**.
4. Under MCP, an **MCP-compatible tool** (referred to as an **MCP server**) follows a **unified standard**.
5. These servers can **list** the **tools** or **actions** they offer and **execute** those **actions** when requested by an **AI agent**.
6. **AI agent platforms** that support **MCP** are **capable** of **discovering available tools** from the **servers** and **invoking** them through this **standard protocol**.

## Facilitates access to knowledge

1. Beyond offering **tools**, MCP also facilitates access to **knowledge**.
2. It enables **applications** to **provide context** to large language models (**LLMs**) by linking them to **various data sources**.
3. For instance, an **MCP server** might represent a **company’s document repository**, allowing **agents** to **retrieve relevant information** on demand.
4. Another server could handle **specific actions** like **sending emails** or **updating records**.
5. From the **agent’s perspective**, these are **simply tools** it can use—some tools **return data (knowledge context)**, while others **perform actions**.
6. MCP **efficiently** manages both.
7. **An agent** connecting to an **MCP server** <u>automatically</u> **learns the server's available capabilities** and **accessible data through a standard format**.
8. This **standardization** enables **dynamic tool** availability.
9. For example, **adding a new MCP server** to an **agent’s system** makes its **functions immediately usable**
   - **without** requiring **further customization** of the **agent's instructions**.
10. This **streamlined integration** aligns with the flow depicted in the following diagram
    - where **servers** provide both **tools** and **knowledge**, ensuring **seamless collaboration across systems**.

## Example: Scalable Agent Solution

![image-20260303141821040](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260303141821040.png)



1. The **Universal Connector** enables **MCP servers** to **communicate and share capabilities** with **each other**
   - allowing **ServerA** to **delegate tasks** to **ServerB** or **access its tools and knowledge**.
2. This **federates** <u>tools</u> and <u>data</u> **across servers**, supporting **scalable** and **modular** <u>agent architectures</u>. 
3. Because MCP **standardizes** <u>tool exposure</u>, **agents** can **dynamically discover and route requests** between **servers** <u>without hardcoded integrations</u>.
4. **Tool and knowledge federation**: Tools and data can be accessed **across servers**, enabling more **scalable** and **modular** agentic architectures.

## Advanced MCP Scenarios with Client-Side LLM Integration

1. Beyond the **basic MCP architecture**
   - there are advanced scenarios where **both client and server contain LLMs**, enabling **more sophisticated interactions**.
2. In the following diagram, **Client App** could be an **IDE** with **a number of MCP tools** available for **user** by the **LLM**:

![image-20260303141918875](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260303141918875.png)

![image-20260303135422642](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260303135422642.png)

# Practical Benefits of MCP

> Here are the **practical benefits** of using MCP

| Benefit                       | Desc                                                         |
| ----------------------------- | ------------------------------------------------------------ |
| <u>Freshness</u>              | Models can access **up-to-date information** beyond their **training data** |
| <u>Capability Extension</u>   | Models can **leverage specialized tools** for tasks they **weren't trained for** |
| <u>Reduced Hallucinations</u> | **External data sources** provide **factual grounding**      |
| <u>Privacy</u>                | **Sensitive data** can stay within **secure environments** instead of being **embedded** in **prompts** |

# Key Takeaways

> The following are key takeaways for using MCP:

1. MCP **standardizes** how **AI models** interact with **tools** and **data**
2. Promotes **extensibility**, **consistency**, and **interoperability**
3. MCP helps **reduce development time**, **improve reliability**, and **extend model capabilities**
4. The **client-server architecture** enables **flexible**, **extensible AI applications**

# Exercise

> Think about an AI application you're interested in building.

1. Which **external tools or data** could **enhance its capabilities**?
2. How might MCP **make integration simpler and more reliable**?
