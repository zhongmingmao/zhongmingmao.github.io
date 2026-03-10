---
title: MCP Docs - Architecture
mathjax: true
date: 2026-03-03 01:06:25
cover: https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/mcp-doc-arch.png
categories:
  - AI
  - MCP
tags:
  - AI
  - MCP
---

# Overview

1. This overview of the Model Context Protocol (MCP) discusses its **scope** and **core concepts**, and provides an example demonstrating each core concept.
2. Because **MCP SDKs** <u>abstract away many concerns</u>, most developers will likely find the **data layer protocol** section to be the most useful.
   - It discusses how **MCP servers** can provide **context** to an **AI application**.

<!-- more -->

# Scope

> MCP focuses on **context exchange**

1. **MCP Specification**
   - A **specification** of MCP that **outlines** the **implementation requirements** for **clients** and **servers**.
2. **MCP SDKs**
   - SDKs for **different programming languages** that **implement MCP**.
3. **MCP Development Tools**
   - Tools for developing MCP **servers** and **clients**, including the **MCP Inspector**.
4. **MCP Reference Server Implementations**
   - Reference implementations of MCP servers.

> **MCP** focuses solely on the **protocol** for **context exchange** - it does not dictate how **AI applications** <u>use LLMs</u> or **manage the provided context**.

# Concepts of MCP

## Participants

1. MCP follows a **client-server architecture** where an **MCP host** — an **AI application** like **Claude Code** or **Claude Desktop**
   - establishes **connections** to **one** or **more** MCP servers.
2. The **MCP host** accomplishes this by **creating one MCP client** for **each MCP server**.
3. **Each MCP client** maintains a **dedicated connection** with its **corresponding MCP server**.
4. **Local MCP servers** that use the **STDIO transport** typically serve a **single MCP client**
   - whereas **remote MCP servers** that use the **Streamable HTTP transport** will typically **serve many MCP clients**.

![image-20260306140016359](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260306140016359.png)

> The **key participants** in the MCP architecture are:

| Participant       | Desc                                                         |
| ----------------- | ------------------------------------------------------------ |
| <u>MCP Host</u>   | The **AI application** that <u>coordinates and manages</u> **one or multiple MCP clients** |
| <u>MCP Client</u> | A component that **maintains** a **connection** to an **MCP server** and **obtains context** from an **MCP server** for the **MCP host** to use |
| <u>MCP Server</u> | A **program** that **provides context** to **MCP clients**   |

> For example: **Visual Studio Code** acts as an **MCP host**.

1. When Visual Studio Code **establishes a connection** to an **MCP server**, such as the Sentry MCP server
   - the Visual Studio Code <u>runtime</u> **instantiates an MCP client object** that **maintains** the **connection** to the Sentry MCP server.
2. When Visual Studio Code **subsequently** connects to **another** MCP server, such as the local filesystem server
   - the Visual Studio Code runtime instantiates an **additional** MCP client object to maintain this connection.

![image-20260306140946787](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260306140946787.png)

1. Note that **MCP server** refers to the **program** that **serves context data**, regardless of **where** it runs. MCP servers can execute **locally** or **remotely**.
2. For example, when Claude Desktop launches the **filesystem server**, the server runs **locally** on the same machine because it uses the **STDIO** transport.
   - This is commonly referred to as a “**local**” MCP server.
3. The official Sentry MCP server runs on the **Sentry platform**, and uses the **Streamable HTTP** transport.
   - This is commonly referred to as a “**remote**” MCP server.

## Layers

> **Conceptually** the **data layer** is the **inner layer**, while the **transport layer** is the **outer layer**.

1. **Data** layer
   - Defines the **JSON-RPC based protocol** for **client-server communication**
   - including **lifecycle management**, and **core primitives**, such as <u>tools</u>, <u>resources</u>, <u>prompts</u> and <u>notifications</u>.
2. **Transport** layer
   - Defines the **communication mechanisms and channels** that enable **data exchange** between **clients** and **servers**
   - including <u>transport-specific connection establishment</u>, <u>message framing</u>, and <u>authorization</u>

> JSON-RPC

![image-20260306142409063](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260306142409063.png)

> Transport layer

![image-20260306143204366](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260306143204366.png)

### Data layer

> The data layer implements a **JSON-RPC 2.0** based **exchange protocol** that defines the **message structure** and **semantics**. This layer includes:

| Component                   | Desc                                                         |
| --------------------------- | ------------------------------------------------------------ |
| <u>Lifecycle management</u> | Handles **connection initialization**, **capability negotiation**, and **connection termination** between **clients** and **servers** |
| <u>Server features</u>      | Enables **servers** to provide **core functionality**<br />including **tools** for <u>AI actions</u>, **resources** for <u>context data</u>, and **prompts** for <u>interaction templates</u> from and to the client |
| <u>Client features</u>      | Enables servers to ask the client to **sample** from the host LLM, **elicit input** from the user, and **log messages** to the client |
| <u>Utility features</u>     | Supports additional capabilities like **notifications** for <u>real-time updates</u> and **progress tracking** for <u>long-running operations</u> |

![image-20260306145157444](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260306145157444.png)

### Transport layer

1. The transport layer manages **communication channels and authentication** between **clients** and **servers**.
2. It handles **connection establishment**, **message framing**, and **secure communication** between **MCP participants**.
3. The transport layer **abstracts communication details** from the protocol layer
   - enabling the **same JSON-RPC 2.0 message format** across **all transport mechanisms**.

![image-20260306151113257](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260306151113257.png)

#### Stdio

1. Uses **standard input/output streams** for **direct process communication** between **local processes** on the **same machine**
2. providing **optimal performance** with **no network overhead**.

#### Streamable HTTP

1. Uses **HTTP POST** for **client-to-server messages** with **optional Server-Sent Events** for **streaming capabilities**.
2. This transport enables **remote server communication** and supports **standard HTTP authentication methods**
   - including **bearer tokens**, **API keys**, and **custom headers**.
3. **MCP** recommends using **OAuth** to obtain **authentication tokens**.

## Data Layer Protocol

1. A **core part** of **MCP** is defining the **schema** and **semantics** between **MCP clients** and **MCP servers**.
2. Developers will likely find the **data layer** — in particular, the **set of primitives** — to be the **most interesting part** of MCP.
3. It is the part of **MCP** that defines the ways developers can **share context** from **MCP servers** to **MCP clients**.
4. MCP uses **JSON-RPC 2.0** as its **underlying RPC protocol**.
   - Client and servers send requests to each other and respond accordingly.
   - **Notifications** can be used when **no response** is required.

### Lifecycle management

1. MCP is a **stateful protocol** that requires lifecycle management.
   - A **subset of MCP** can be made **stateless** using the **Streamable HTTP** transport
2. The purpose of lifecycle management is to **negotiate** the **capabilities** that **both client and server support**.
   - Capabilities - Features and operations that a client or server supports, such as **tools**, **resources**, or **prompts**

![image-20260306153930804](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260306153930804.png)

![image-20260306154251058](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260306154251058.png)

### Primitives

1. MCP primitives are the **most important concept** within MCP.
2. They define what **clients** and **servers** can **offer each other**.
3. These primitives specify the **types** of **contextual information** that can be **shared** with **AI applications** and the range of **actions** that can be **performed**.

> MCP defines **three core primitives** that **servers** can expose:

| Primitives       | Desc                                                         |
| ---------------- | ------------------------------------------------------------ |
| <u>Tools</u>     | **Executable functions** that **AI applications** can **invoke** to **perform actions** (e.g., <u>file operations</u>, <u>API calls</u>, <u>database queries</u>) |
| <u>Resources</u> | **Data sources** that **provide contextual information** to **AI applications** (e.g., <u>file contents</u>, <u>database records</u>, <u>API responses</u>) |
| <u>Prompts</u>   | **Reusable templates** that help **structure interactions** with **language models** (e.g., <u>system prompts</u>, <u>few-shot examples</u>) |

1. Each primitive type has associated methods for **discovery** (`*/list`), **retrieval** (`*/get`), and in some cases, **execution** (`tools/call`). 
2. MCP clients will use the `*/list` methods to **discover available primitives**.
   - For example, a client can first list all available tools (**tools/list**) and then **execute** them.
   - This design allows **listings** to be **dynamic**.

![image-20260306190541751](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260306190541751.png)

> As a **concrete example**, consider an **MCP server** that provides **context** about a **database**.

1. It can expose **tools** for **querying the database**
2. a **resource** that contains the **schema of the database**
3. and a **prompt** that includes **few-shot examples** for **interacting** with the **tools**.

![image-20260306190603764](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260306190603764.png)

> MCP also defines primitives that **clients** can expose. These primitives allow **MCP server** authors to build **richer interactions**.

1. **Sampling**
   - Allows **servers** to request **language model completions** from the **client’s AI application**.
   - This is useful when **server** authors want **access** to a **language model**
     - but want to **stay model-independent** and **not include** a **language model SDK** in their **MCP server**.
   - They can use the `sampling/complete` method to request a **language model completion** from the **client’s AI application**.
2. **Elicitation**
   - Allows **servers** to request **additional information** from **users**.
   - This is useful when **server** authors want to **get more information** from the **user**, or **ask for confirmation** of an **action**.
   - They can use the `elicitation/request` method to request **additional information** from the **user**.
3. **Logging**
   - Enables **servers** to **send log messages** to **clients** for **debugging** and **monitoring** purposes.

![image-20260306185318584](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260306185318584.png)

> Besides **server** and **client** primitives, the protocol offers **cross-cutting** utility primitives that <u>augment how requests are executed</u>:

1. **Tasks (Experimental)**
   - **Durable execution wrappers** that enable **deferred result retrieval** and **status tracking** for **MCP requests**
   - (e.g., <u>expensive computations</u>, <u>workflow automation</u>, <u>batch processing</u>, <u>multi-step operations</u>)

![image-20260306185851785](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260306185851785.png)

### Notifications

1. The protocol supports **real-time notifications** to enable **dynamic updates** between **servers** and **clients**.

2. For example, when a server’s **available tools change**

   - such as when **new functionality** becomes **available** or **existing tools** are **modified**

   - the **server** can send **tool update notifications** to **inform connected clients** about these changes.

3. **Notifications** are sent as **JSON-RPC 2.0 notification messages** (without expecting a **response**)

   - and enable **MCP servers** to provide **real-time updates** to **connected clients**.

# Example

1. This section provides a **step-by-step** walkthrough of an **MCP client-server interaction**, focusing on the **data layer protocol**.
2. We’ll demonstrate the <u>lifecycle sequence</u>, <u>tool operations</u>, and <u>notifications</u> using **JSON-RPC 2.0 messages**.

## Initialization (Lifecycle Management)

1. MCP begins with **lifecycle management** through a **capability negotiation handshake**.
2. the **client** sends an `initialize` request to **establish** the **connection** and **negotiate supported features**.

### Initialize Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-06-18",
    "capabilities": {
      "elicitation": {}
    },
    "clientInfo": {
      "name": "example-client",
      "version": "1.0.0"
    }
  }
}
```

### Initialize Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2025-06-18",
    "capabilities": {
      "tools": {
        "listChanged": true
      },
      "resources": {}
    },
    "serverInfo": {
      "name": "example-server",
      "version": "1.0.0"
    }
  }
}
```

![image-20260310102437850](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310102437850.png)

![image-20260310102704391](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310102704391.png)

![image-20260310102823125](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310102823125.png)

![image-20260310102941529](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310102941529.png)

![image-20260310103018357](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310103018357.png)

### Understanding the Initialization Exchange

> The **initialization process** is a key part of MCP’s lifecycle management and serves several **critical purposes**:

#### Protocol Version Negotiation

1. The `protocolVersion` field (e.g., “2025-06-18”) ensures both **client** and **server** are using **compatible** protocol versions.
2. This prevents **communication errors** that could occur when **different versions** attempt to **interact**.
3. If a **mutually compatible version** is **not negotiated**, the **connection** should be **terminated**.

![image-20260310105254566](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310105254566.png)

![image-20260310105348316](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310105348316.png)

#### Capability Discovery

1. The **capabilities** object allows **each party** to **declare** what **features** they support
   - including which **primitives** they can handle (<u>tools</u>, <u>resources</u>, <u>prompts</u>) and whether they support **features** like <u>notifications</u>. 
2. This **enables efficient communication** by **avoiding unsupported operations**.

> In this example, the **capability negotiation** demonstrates how **MCP primitives** are **declared**:

##### Client Capabilities

- `"elicitation": {}` - The **client** declares it can work with **user interaction requests** (can receive `elicitation/create` method calls)

##### Server Capabilities

- `"tools": {"listChanged": true}` - The **server** supports the **tools primitive** AND can send `tools/list_changed` **notifications** when its <u>tool list changes</u>
- `"resources": {}` - The **server** also supports the **resources primitive** (can handle `resources/list` and `resources/read` methods)

#### Identity Exchange

1. The `clientInfo` and `serverInfo` objects provide **identification** and **versioning** information for **debugging** and **compatibility** purposes.

### Initialized

> After **successful initialization**, the **client** sends a **notification** to **indicate** it’s **ready**:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized"
}
```

### How This Works in AI Applications

1. **During initialization**
   - the AI application’s MCP client manager **establishes connections** to **configured servers**
   - and **stores** their **capabilities** for **later use**.
2. The **AI application** uses this **information** to **determine** which **servers**
   - can **provide specific types of functionality** (<u>tools</u>, <u>resources</u>, <u>prompts</u>) and whether they support **real-time updates**.

> Pseudo-code for AI application initialization

```python
# Pseudo Code
async with stdio_client(server_config) as (read, write):
    async with ClientSession(read, write) as session:
        init_response = await session.initialize()
        if init_response.capabilities.tools:
            app.register_mcp_server(session, supports_tools=True)
        app.set_server_ready(session)
```

## Tool Discovery (Primitives)

1. Now that the **connection** is **established**, the **client** can **discover available tools** by sending a `tools/list` request.
2. This request is **fundamental** to **MCP’s tool discovery mechanism**
   - it allows **clients** to **understand** what **tools** are **available** on the **server** before attempting to **use** them.

### Tools List Request

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

### Tools List Response

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "calculator_arithmetic",
        "title": "Calculator",
        "description": "Perform mathematical calculations including basic arithmetic, trigonometric functions, and algebraic operations",
        "inputSchema": {
          "type": "object",
          "properties": {
            "expression": {
              "type": "string",
              "description": "Mathematical expression to evaluate (e.g., '2 + 3 * 4', 'sin(30)', 'sqrt(16)')"
            }
          },
          "required": ["expression"]
        }
      },
      {
        "name": "weather_current",
        "title": "Weather Information",
        "description": "Get current weather information for any location worldwide",
        "inputSchema": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "City name, address, or coordinates (latitude,longitude)"
            },
            "units": {
              "type": "string",
              "enum": ["metric", "imperial", "kelvin"],
              "description": "Temperature units to use in response",
              "default": "metric"
            }
          },
          "required": ["location"]
        }
      }
    ]
  }
}
```

![image-20260310111350727](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310111350727.png)

![image-20260310111547724](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310111547724.png)

![image-20260310111817715](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310111817715.png)

### Understanding the Tool Discovery Request

1. The `tools/list` request is simple, containing **no parameters**.

### Understanding the Tool Discovery Response

1. The response contains a `tools` **array** that provides **comprehensive metadata** about **each available tool**.
2. This **array-based structure** allows **servers** to **expose multiple tools simultaneously**
   - while **maintaining clear boundaries** between **different functionalities**.

> Each **tool** object in the response includes several key **fields**:

#### name

1. A **unique identifier** for the **tool** within the **server’s namespace**.
2. This serves as the **primary key** for **tool execution** and should follow a **clear naming pattern**
   - (e.g., `calculator_arithmetic` rather than just `calculate`)

#### title

1. A **human-readable display name** for the **tool** that **clients** can **show to users**

#### description

1. **Detailed explanation** of **what the tool does** and **when to use it**

#### inputSchema

1. A **JSON Schema** that defines the **expected input parameters**
2. enabling **type validation** and providing **clear documentation** about **required and optional parameters**

###  How This Works in AI Applications

1. The AI application **fetches available tools** from **all connected MCP servers**
   - and **combines** them into a **unified tool registry** that the **language model** can **access**.
2. This **allows** the **LLM** to **understand what actions it can perform**
   - and **automatically generates** the **appropriate tool calls** <u>during conversations</u>.

```python
# Pseudo-code using MCP Python SDK patterns
available_tools = []
for session in app.mcp_server_sessions():
    tools_response = await session.list_tools()
    available_tools.extend(tools_response.tools)
conversation.register_available_tools(available_tools)
```

![image-20260310113101616](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310113101616.png)

## Tool Execution (Primitives)

1. The **client** can now **execute a tool** using the `tools/call` method.
2. This demonstrates how **MCP primitives** are **used** in practice
   - after **discovering available tools**, the **client** can **invoke** them with **appropriate arguments**.

###  Understanding the Tool Execution Request

1. The `tools/call` request follows **a structured format**
   - that ensures **type safety** and **clear communication** between **client** and **server**. 
2. Note that we’re using the **proper tool name** from the **discovery response** (`weather_current`) rather than a <u>simplified name</u>

#### Tool Call Request

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "weather_current",
    "arguments": {
      "location": "San Francisco",
      "units": "imperial"
    }
  }
}
```

![image-20260310114012811](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310114012811.png)

#### Tool Call Response

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Current weather in San Francisco: 68°F, partly cloudy with light winds from the west at 8 mph. Humidity: 65%"
      }
    ]
  }
}
```

![image-20260310114152934](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310114152934.png)

![image-20260310114252396](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310114252396.png)

![image-20260310114328025](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310114328025.png)

![image-20260310114353877](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310114353877.png)

### Key Elements of Tool Execution

> The **request structure** includes **several important components**:

#### name

1. **Must match exactly** the **tool name** from the **discovery response** (`weather_current`).
2. This ensures the **server** can **correctly identify** which **tool** to execute.

#### arguments

1. Contains the **input parameters** as defined by the tool’s `inputSchema`.
2. In this example:
   - `location`: “San Francisco” (**required** parameter)
   - `units`: “imperial” (**optional** parameter, **defaults** to “metric” if not specified)

#### JSON-RPC Structure

1. Uses **standard JSON-RPC 2.0 format** with unique `id` for **request-response correlation**.

### Understanding the Tool Execution Response

> The response demonstrates MCP’s **flexible content system**:

1. This **execution pattern** allows **AI applications** to **dynamically invoke server functionality**
2. and **receive structured responses** that can be **integrated into conversations** with **language models**.

#### content Array

1. Tool responses return an array of **content objects**, allowing for **rich**, **multi-format** responses (**text**, **images**, **resources**, etc.)

#### Content Types

1. Each content object has a `type` field.
2. In this example, `"type": "text"` indicates **plain text content**
   - but **MCP** supports **various content types** for **different use cases**.

#### Structured Output

1. The **response** provides **actionable information** that the **AI application** can use as **context** for **language model interactions**.

### How This Works in AI Applications

1. When the **language model** decides to **use a tool** during a conversation
   - the **AI application** <u>intercepts the tool call</u>
   - **routes** it to the **appropriate MCP server**
     - **executes** it, and returns the **results** back to the **LLM** as part of the **conversation flow**.
2. This enables the **LLM** to **access real-time data** and **perform actions** in the **external world**.

```python
# Pseudo-code for AI application tool execution
async def handle_tool_call(conversation, tool_name, arguments):
    session = app.find_mcp_session_for_tool(tool_name)
    result = await session.call_tool(tool_name, arguments)
    conversation.add_tool_result(result.content)
```

![image-20260310121010294](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310121010294.png)

![image-20260310121301934](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310121301934.png)

![image-20260310121354187](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310121354187.png)

![image-20260310121733466](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310121733466.png)

![image-20260310122038865](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310122038865.png)

> 核心机制 - **LLM 决策 + AI 应用执行 + MCP Server 执行结果回传**

![image-20260310122137702](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310122137702.png)

## Real-time Updates (Notifications)

1. MCP supports **real-time notifications** that enable **servers** to **inform clients** about **changes** <u>without being explicitly requested</u>.
2. This demonstrates the **notification system**, a key feature that keeps MCP connections **synchronized** and **responsive**.

### Understanding Tool List Change Notifications

1. When the server’s **available tools** change，such as when
   - **new functionality** becomes **available**
   - **existing tools** are **modified**
   - or **tools** become **temporarily unavailable**
2. The **server** can **proactively notify connected clients**

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/tools/list_changed"
}
```

![image-20260310140508347](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310140508347.png)

![image-20260310140603294](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310140603294.png)

![image-20260310140644250](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310140644250.png)

![image-20260310140804434](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310140804434.png)

![image-20260310141040486](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310141040486.png)

![image-20260310141154736](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310141154736.png)

![image-20260310140851186](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310140851186.png)

### Key Features of MCP Notifications

#### No Response Required

1. Notice there’s no `id` field in the notification.
2. This follows **JSON-RPC 2.0 notification semantics** where **no response** is **expected** or **sent**.

#### Capability-Based

1. This **notification** is **only sent by servers** that declared `"listChanged": true` in their **tools capability** during **initialization**

#### Event-Driven

1. The **server** decides **when to send notifications** based on **internal state changes**
2. making MCP connections **dynamic** and **responsive**.

### Client Response to Notifications

1. Upon **receiving** this **notification**, the **client** typically reacts by **requesting** the **updated tool list**.
2. This creates a **refresh cycle** that **keeps** the **client’s understanding** of **available tools current**.

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/list"
}
```

### Why Notifications Matter

> This **notification system** is **crucial** for several reasons:

| Reason                         | Desc                                                         |
| ------------------------------ | ------------------------------------------------------------ |
| <u>Dynamic Environments</u>    | **Tools** may **come and go** based on <u>server state</u>, <u>external dependencies</u>, or <u>user permissions</u> |
| <u>Efficiency</u>              | **Clients** don’t need to **poll** for changes; they’re **notified** when **updates occur** |
| <u>Consistency</u>             | Ensures **clients** always have **accurate information** about **available server capabilities** |
| <u>Real-time Collaboration</u> | Enables **responsive AI applications** that can **adapt** to **changing contexts** |

1. This **notification pattern** extends **beyond tools** to other **MCP primitives**
2. enabling **comprehensive real-time synchronization** between **clients** and **servers**.

### How This Works in AI Applications

1. When the **AI application** receives a **notification** about **changed tools**
   - it **immediately refreshes** its **tool registry** and **updates** the **LLM’s available capabilities**.
2. This ensures that **ongoing conversations** always have **access** to the **most current set of tools**
   - and the **LLM** can **dynamically adapt** to **new functionality** as it becomes **available**.

```python
# Pseudo-code for AI application notification handling
async def handle_tools_changed_notification(session):
    tools_response = await session.list_tools()
    app.update_available_tools(session, tools_response.tools)
    if app.conversation.is_active():
        app.conversation.notify_llm_of_new_capabilities()
```

![image-20260310143200367](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310143200367.png)

![image-20260310143227636](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310143227636.png)

![image-20260310143448291](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310143448291.png)

![image-20260310143530239](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310143530239.png)

![image-20260310143619606](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310143619606.png)
