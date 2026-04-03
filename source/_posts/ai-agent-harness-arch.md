---
title: Agentic Harness - Architecture
mathjax: true
date: 2026-04-01 06:25:00
cover: https://harness-1253868755.cos.ap-guangzhou.myqcloud.com/agent-harness.jpeg
categories:
  - AI
  - Agent
  - Agentic Harness
tags:
  - AI
  - Agent
  - Agentic Harness
---

# Anthropic

> Agentic Harness: LLM to Coding Agent

1. **Claude Code** serves as the **agentic harness** around **Claude**
2. It provides the **tools**, **context management**, and **execution environment** that turn a **language model** into a **capable coding agent**.

<!-- more -->

# 增强模型能力

> 模型本身只会<u>生成文本</u>，**Harness** 赋予了模型各种能力：读文件、写代码、搜索代码库、在终端执行命令

![5c73e5d6313819828d739eeb2bfca72b](https://harness-1253868755.cos.ap-guangzhou.myqcloud.com/5c73e5d6313819828d739eeb2bfca72b.webp)

> 业界对 Agentic Harness 的**核心共识**

| 组件                 | 职责                                                         |
| -------------------- | ------------------------------------------------------------ |
| <u>Agent Harness</u> | 包裹 **LLM** 的**运行时基础设施**，管理**工具调度**、**上下文工程**、**安全执行**、**状态持久化**和**会话连续性** |
| <u>LLM</u>           | 只负责**推理决策**                                           |

![9697d298c3132c33e94c6b2eac1e1eaf](https://harness-1253868755.cos.ap-guangzhou.myqcloud.com/9697d298c3132c33e94c6b2eac1e1eaf.webp)

# Harness 组件

> **Model** 本身只是一个**推理引擎**，不能**独立行动**，Model 要变成 Agent，需要五个 Harness 组件

## Tools

> 模型的**手脚**

1. Read、Write、Edit、Bash、Grep 等工具赋予模型与**文件系统**、**终端**、**网络交互**的能力
2. 如果没有工具，模型**只能推理**，<u>不能执行</u>

## Context

> 模型的**记忆加载器**

1. 上下文：**CLAUDE.md**、**系统提示词**、**对话历史**、**工具定义**
2. 上下文在**每一轮循环**中被**注入模型**，决定模型能<u>看到</u>什么、<u>知道</u>什么
3. 上下文管理：不仅是**被动的信息传递**，还包括**主动的压缩**和**重注入策略**

## Memory

> 模型的**长期存储**

1. **跨会话**的**记忆持久化** - 模型能记住**用户偏好**、**项目规则**以及**历史决策**等
2. 记忆分类 - <u>显式</u> or <u>隐式</u>
   - `CLAUDE.md` 是**显式记忆**
   - 自动记忆 `~/.claude/memory/` 是**隐式记忆**
3. 如果没有记忆，每次对话都是<u>从零开始</u>

## Hooks

> 模型的**神经反射**

1. **事件驱动**的**自动化机制**，在**工具执行前后**触发<u>自定义逻辑</u>
   - 每次**保存文件前**自动**格式化**
   - 每次**提交前**自动运行 **lint**
2. 不需要<u>模型主动决策</u>，**行为自动发生**

## Permissions

> 模型的**安全围栏**

1. 哪些工具可以**自由使用**、哪些需要**人工审批**、哪些**完全禁止**
2. 权限系统是 Harness 的**安全底线**
3. 解决的**核心矛盾**：希望 Agent **足够自主**以**提高效率**，但又不希望自主到**失控**

# 逻辑架构

1. **模型不直接接触外部世界**，所有**交互**都**通过 Harness 组件中转**
2. **Harness** 是**模型**和**现实**之间的**唯一接口**
3. 5 个 Harness 组件也不是孤立的 - **协调运转**
   - **Tools 的执行结果**变成 **Context 的一部分**
   - **Hooks** 在 **Tools 执行前后**触发
   - **Permissions** 决定哪些 **Tools** 可以**被调用**
   - **Memory** 用于**跨会话**保留 **Context** 中的**关键信息**

![image-20260403114527944](https://harness-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260403114527944.png)

# 核心能力

## Agentic Loop

> Harness 的**心脏**

如果 **Harness** 是一台机器，**Agentic Loop** 是 Harness 的**发动机**，整个 Claude Code 的运转，本质是一个**循环**

![image-20260403115302994](https://harness-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260403115302994.png)

模型并不是**一次性**给出**最终答案**的，在**步骤 2** 和**步骤 4** 之间**循环** -- 一个**复杂任务**可能跑几十轮循环

| 循环结束条件        | 描述                                                         |
| ------------------- | ------------------------------------------------------------ |
| <u>模型主动停止</u> | **Claude 模型认为任务完成**、生成**纯文本回复**，不再请求工具调用，API 返回：`stop_reason: "end_turn"` |
| <u>达到最大轮次</u> | Harness 设置了 `--max-turns` 限制，防止**无限循环**          |

> 修复 Bug 过程：**反复**观察、假设、验证，这种过程**无法预先编程**，而是 Agentic Loop 的循环结构**涌现**出来的

## 内置工具

> Harness 的**手脚**，如果 Agentic Loop 是发动机，而 Tools 就是车轮，Claude Code 提供了多个工具，覆盖软件工程的 5 个**原子操作**

| 原子操作 | 对应工具                            | 说明                                           |
| -------- | ----------------------------------- | ---------------------------------------------- |
| 读       | Read、Glob、Grep                    | 读文件内容、**按模式找文件**、按内容搜索       |
| 写       | Write、Edit                         | 创建新文件、**精确替换现有文件片段**           |
| 执行     | Bash                                | 运行任意 Shell 命令                            |
| 联网     | WebFetch、WebSearch                 | 抓取网页、搜索互联网                           |
| **编排** | **Agent**、**TodoWrite**、**Skill** | **委派子代理**、**管理任务列表**、**触发技能** |

1. **工具设计**背后有一个深刻的哲学 - **少而精** - 也是 **Linux** 设计哲学 - **<u>Keep It Simple, Stupid</u>**
2. Claude Code 没有内置的<u>重构工具</u>、<u>测试工具</u>、<u>部署工具</u>，而是只提供了**最基础的原语**
   - **重构** - <u>Read + Edit + Bash</u> 的组合涌现
   - **测试** - <u>Bash + Read</u> 的组合涌现
   - **部署** - <u>Bash</u>
3. **计算机**只需要**几条指令**就能**图灵完备**
   - **Harness** 不需要为**每个场景**构造**一个工具**，只需要确保**<u>基础工具的组合空间</u>**足够大即可
4. **Bash** 工具是一个**图灵完备**的**逃逸舱**
   - 通过 Bash，Claude 可以执行**任何 Shell 命令**，即 Claude Code 的能力上限，理论上等于**操作系统**的能力上限
   - 因此，Harness 需要**权限控制**

## 上下文管理

> 在讨论 Agent 框架时，容易只关注**工具**和**循环**，而 **Harness 最精巧**的部分，其实是**上下文管理**

1. Claude 的**上下文窗口**是有限的 - **200K tokens**
2. 一个**真实的编码任务**，产生的历史对话会迅速膨胀，容易**撑爆上下文窗口**

> Claude Code 的解决方案是**自动压缩**，当**对话历史**接近上下文窗口的 **83%** 时，Harness 会触发一次压缩操作

```
对话历史（166K tokens）
    │
    ▼ 压缩触发
┌────────────────────────────┐
│ 保留：最近的消息（完整）      │
│ 压缩：早期消息 → 摘要        │
│ 重注入：CLAUDE.md 内容       │
│ 重注入：系统提示词            │
│ 重注入：工具定义              │
└────────────────────────────┘
    │
    ▼
压缩后对话历史（~80K tokens）
    │
    ▼ 继续工作
```

1. **CLAUDE.md** + **系统提示词** + **工具定义**，在**每次压缩后**都会**重新注入**
2. 即便对话历史被截断了，模型仍然知道项目的规则、有哪些工具可用、应该遵循什么约定等

> 上下文管理是 Harness **最容易被低估**的能力

1. 很多开源 Agent 框架只关心**工具调用**和**循环**，但在**长任务**上容易翻车，并非模型能力不行，而是 Agent 框架的上下文管理太粗糙
2. 没有智能压缩
   - 全部历史 - 导致**模型注意力涣散**
   - 简单截断 - **模型忘记关键上下文**
3. Claude Code - **压缩 + 重注入**

# Claude Agent SDK

> **可编程**的 Harness

1. **Claude Code CLI** 本身不开源，但 Anthropic 在 2025 年发布了 **Claude Agent SDK** - 一套**可编程**的 **Harness 接口**
   - 核心 Harness 代码以**编译后的 npm 包**分发，Claude Agent SDK 提供**可编程**的 **Harness 接口**
2. Claude Agent SDK 提供了与 Claude Code CLI <u>完全相同</u>的 **Agentic Loop**、**内置工具**、**上下文管理**、**权限系统**、**Hooks**、**Sub-Agent 支持** 和 **MCP 集成**

```python
from claude_agent_sdk import AgentClient

client = AgentClient(api_key="...")

# 创建一个有工具能力的 Agent
result = client.run(
    prompt="审查这个 PR 的安全问题",
    tools=["Read", "Grep", "Glob", "Bash"],
    max_turns=20,
    allowed_tools={"Bash": ["npm test", "npm run lint"]}
)

print(result.text)
```

> 商业策略 - <u>开放编排能力</u> + <u>锁定模型消费</u>

1. **开源 CLI** 会侵蚀 Anthropic 的 API 调用收入，开源 CLI 后，任何人都可以接入其它模型
2. Claude Agent SDK 的核心价值是绑定在 Claude 模型上，用 Claude Agent SDK 意味着用 Claude API
3. Claude Agent SDK **开放编排能力**，但**锁定模型消费**

# 第三方 Harness

1. Claude Code - **模型 + Harness = 10 倍生产力**
2. **OpenCode** 是最成功的第三方 Harness
   - 用 **Client-Server 架构**解决了 Claude Code 的单表面局限
   - **TUI**、**桌面 APP**、**IDE 插件**、**Slack 机器人**共享**同一个后端**
3. 2026 年 1 月，Anthropic 封堵了第三方工具通过**消费者 OAuth Token** 调用 Claude API 的通道 - 必须购买**独立的 API Key**
4. **模型提供商**希望控制 **Harness 层**，因为 Harness 决定了 **API 调用量**和**用户体验**
5. **第三方 Harness** 希望**模型层**是**可替换的商品**，建立**独立的价值**

# Harness 生态

| Harness          | 定位               | 模型绑定                   | 开源           |
| ---------------- | ------------------ | -------------------------- | -------------- |
| Claude Code CLI  | Anthropic 官方 CLI | 仅 Claude - GLM 等进行适配 | 否             |
| Claude Agent SDK | Anthropic 编程库   | 仅 Claude                  | 否（商业许可） |
| OpenCode         | 第三方多模型 Agent | 多模型                     | MIT            |
| Cursor           | IDE 内置 Agent     | 多模型                     | 否             |
| Windsurf         | IDE 内置 Agent     | 多模型                     | 否             |
| Aider            | 终端 Agent         | 多模型                     | Apache 2.0     |

# 2026

> 2025 - **Agent**，2026 - **Agentic Harness**

1. **模型**本身正在**商品化** - Claude、GPT、Gemini、DeepSeek 的**能力差距**在**缩小**
2. 同一模型在不同的 Harness 中的表现差距，**远大于**不同模型在同一个 Harness 中的差距 - **<u>Harness 比模型更重要</u>**
3. Anthropic 收购了 **Bun**（JavaScript 运行时），用于加强 Claude Code 的**基础设施**
   - 收购一个运行时来加强一个  Harness - Anthropic 将 **Harness** 视为**战略级资产**
4. **理解 Harness** 比**理解模型**更重要
   - 模型能力由 Anthropic/OpenAI 决定，而 **Harness 配置**是**可控**的

