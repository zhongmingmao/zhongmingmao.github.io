---
title: LLM - API
mathjax: false
date: 2024-07-01 00:06:25
cover: https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240817181521113.png
categories:
  - AI
  - LLM
tags:
  - AI
  - LLM
  - NLP
  - Python
  - FastAPI
  - Uvicorn
---

# 背景

1. LLM 是没有 **Web API** 的，需要进行一次**封装**
2. 将 LLM 的核心接口封装成 Web API 来为用户提供服务 - **必经之路**

<!-- more -->

# 接口封装

## FastAPI

### 接口封装

> Uvicorn + FastAPI

1. **Uvicorn** 类似于 Tomcat，但比 Tomcat 轻量很多，作为 **Web 服务器**
   - 允许**异步处理** HTTP 请求，非常适合处理**并发请求**
   - 基于 **uvloop** 和 **httptools**，具备非常高的性能
2. **FastAPI** 类似于 SpringBoot，同样比 SpringBoot 轻量很多，作为 **API 框架**
3. 结合 Uvicorn 和 FastAPI
   - 可以构建一个**高性能**的、**易于扩展**的**异步** Web 应用程序
   - Uvicorn 作为**服务器**运行 FastAPI 应用，可以提供优异的**并发**处理能力

### 安装依赖

```
$ pip install fastapi
$ pip install uvicorn
```

### 代码分层

```python
import uvicorn
from fastapi import FastAPI

# 创建API应用
app = FastAPI()


@app.get("/")
async def root():
    return {"message": "Hello World"}


if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8888, log_level="info", workers=1)
```

```json
$ curl -s 127.0.0.1:8888 | jq
{
  "message": "Hello World"
}
```

### 模型定义

> 在 Python 中使用 **Pydantic** 模型来定义数据结构
> Pydantic - **数据验证 + 数据管理** - 类似于 **Java Validation**

```python
import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List

app = FastAPI()


class Message(BaseModel):
    role: str
    content: str


class ChatMessage(BaseModel):
    history: List[Message]
    prompt: str
    max_tokens: int
    temperature: float
    top_p: float = Field(default=1.0)


@app.post("/v1/chat/completions")
async def create_chat_response(message: ChatMessage):
    return {"message": "Hello World"}


if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8888, log_level="info", workers=1)
```

1. BaseModel 为了**数据验证和管理**而设计的
2. 当**继承** BaseModel 后，将自动获得**数据验证**、**序列化**和**反序列化**的功能

### 项目结构

```
project_name/
│
├── app/                         # 主应用目录
│   ├── main.py                  # FastAPI 应用入口
│   └── controller/              # API 特定逻辑
│       └── chat_controller.py
│   └── common/                  # 通用API组件
│       └── errors.py            # 错误处理和自定义异常
│
├── services/                    # 服务层目录
│   ├── chat_service.py          # 聊天服务相关逻辑
│
├── schemas/                     # Pydantic 模型（请求和响应模式）
│   ├── chat_schema.py           # 聊天数据模式
│
├── database/                    # 数据库连接和会话管理
│   ├── session.py               # 数据库会话配置
│   └── engine.py                # 数据库引擎配置
│
├── tools/                       # 工具和实用程序目录
│   ├── data_migration.py        # 数据迁移工具
│
├── tests/                       # 测试目录
│   ├── conftest.py              # 测试配置和夹具
│   ├── test_services/           # 服务层测试
│   │   ├── test_chat_service.py
│   └── test_controller/                
│       ├── test_chat_controller.py
│
├── requirements.txt             # 项目依赖文件
└── setup.py                     # 安装、打包、分发配置文件
```

### 路由集成

> FastAPI 通过 **include_router** 将不同的路由**集成**到主应用中

```
├── app
│   ├── controller
│   │   └── chat_controller.py
│   └── main.py
├── schemas
│   └── chat_schema.py
├── services
│   └── chat_service.py
└── tests
    └── test_controller
        └── test_chat_controller.py
```

#### chat_schema.py

```python
from pydantic import BaseModel, Field


class Message(BaseModel):
    role: str
    content: str


class ChatMessage(BaseModel):
    prompt: str
    max_tokens: int
    temperature: float = Field(default=1.0)
    top_p: float = Field(default=1.0)
```

#### chat_service.py

```python
from schemas.chat_schema import ChatMessage


class ChatService:
    def post_message(self, message: ChatMessage):
        print(message.prompt)
        return {"message": "post message"}

    def get_messages(self):
        return {"message": "get message"}
```

#### chat_controller.py

```python
from fastapi import APIRouter

from schemas.chat_schema import ChatMessage
from services.chat_service import ChatService

chat_router = APIRouter()
chat_service = ChatService()


@chat_router.post("/new/message/")
def post_message(message: ChatMessage):
    return chat_service.post_message(message)


@chat_router.get("/get/messages/")
def get_messages():
    return chat_service.get_messages()
```

#### main.py

```python
import uvicorn as uvicorn
from fastapi import FastAPI
from controller.chat_controller import chat_router as chat_router

app = FastAPI()
app.include_router(chat_router, prefix="/chat", tags=["chat"])

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8888, log_level="info", workers=1)
```

#### test_chat_controller.py

```python
import json
import requests

data = {
    'prompt': 'hello',
    'max_tokens': 1000
}

url1 = 'http://localhost:8888/chat/new/message/'
response = requests.post(url1, data=json.dumps(data))
print(response.text)

url2 = 'http://localhost:8888/chat/get/messages/'
response = requests.get(url2)
print(response.text)
```

## LLM

> 不同的 LLM 对应的**对话接口**不一样

### 懒加载

```python
from transformers import AutoTokenizer, AutoModelForCausalLM


class ModelManager:
    _model = None
    _tokenizer = None

    @classmethod
    def get_model(cls):
        if cls._model is None:
            _model = AutoModelForCausalLM.from_pretrained("chatglm3-6b", trust_remote_code=True).half().cuda().eval()
        return _model

    @classmethod
    def get_tokenizer(cls):
        if cls._tokenizer is None:
            _tokenizer = AutoTokenizer.from_pretrained("chatglm3-6b", trust_remote_code=True)
        return _tokenizer
```

### Chat

> **一次性**输出 LLM 返回的内容

```python
from datetime import datetime

from schemas.chat_schema import ChatMessage
from services.model_service import ModelManager


class ChatService:
    def post_message(self, message: ChatMessage):
        print(message.prompt)
        model = ModelManager.get_model()
        tokenizer = ModelManager.get_tokenizer()
        # model.chat() 是 6B 暴露的对话接口
        response, history = model.chat(
            tokenizer,
            message.prompt,
            history=message.histroy,
            max_length=message.max_tokens,
            top_p=message.top_p,
            temperature=message.temperature
        )
        now = datetime.datetime.now()  # 获取当前时间
        time = now.strftime("%Y-%m-%d %H:%M:%S")  # 格式化时间为字符串
        answer = {
            "response": response,
            "history": history,
            "status": 200,
            "time": time
        }
        log = "[" + time + "] " + '", prompt:"' + message.prompt + '", response:"' + repr(response) + '"'
        print(log)
        return answer

    def get_messages(self):
        return {"message": "get message"}
```

### Stream Chat

> model.stream_chat()

```
我
是
中
国
人
```

```
我
我是
我是中
我是中国
我是中国人
```

> 通过 stream 变量控制是否流式输出

```python
if stream:
    async for token in callback.aiter():
        # Use server-sent-events to stream the response
        yield json.dumps(
            {"text": token, "message_id": message_id},
            ensure_ascii=False)
else:
    answer = ""
    async for token in callback.aiter():
        answer += token
    yield json.dumps(
        {"text": answer, "message_id": message_id},
        ensure_ascii=False)
await task
```

> stream=true

```json
data: {"text": "你", "message_id": "80b2af55c5b7440eaca6b9d510677a75"}
data: {"text": "好", "message_id": "80b2af55c5b7440eaca6b9d510677a75"}
data: {"text": "👋", "message_id": "80b2af55c5b7440eaca6b9d510677a75"}
data: {"text": "！", "message_id": "80b2af55c5b7440eaca6b9d510677a75"}
data: {"text": "我是", "message_id": "80b2af55c5b7440eaca6b9d510677a75"}
data: {"text": "人工智能", "message_id": "80b2af55c5b7440eaca6b9d510677a75"}
data: {"text": "助手", "message_id": "80b2af55c5b7440eaca6b9d510677a75"}
data: {"text": " Chat", "message_id": "80b2af55c5b7440eaca6b9d510677a75"}
data: {"text": "GL", "message_id": "80b2af55c5b7440eaca6b9d510677a75"}
data: {"text": "M", "message_id": "80b2af55c5b7440eaca6b9d510677a75"}
data: {"text": "3", "message_id": "80b2af55c5b7440eaca6b9d510677a75"}
data: {"text": "-", "message_id": "80b2af55c5b7440eaca6b9d510677a75"}
data: {"text": "6", "message_id": "80b2af55c5b7440eaca6b9d510677a75"}
data: {"text": "B", "message_id": "80b2af55c5b7440eaca6b9d510677a75"}
data: {"text": "，", "message_id": "80b2af55c5b7440eaca6b9d510677a75"}
data: {"text": "很高兴", "message_id": "80b2af55c5b7440eaca6b9d510677a75"}
data: {"text": "见到", "message_id": "80b2af55c5b7440eaca6b9d510677a75"}
data: {"text": "你", "message_id": "80b2af55c5b7440eaca6b9d510677a75"}
data: {"text": "，", "message_id": "80b2af55c5b7440eaca6b9d510677a75"}
data: {"text": "欢迎", "message_id": "80b2af55c5b7440eaca6b9d510677a75"}
data: {"text": "问我", "message_id": "80b2af55c5b7440eaca6b9d510677a75"}
data: {"text": "任何", "message_id": "80b2af55c5b7440eaca6b9d510677a75"}
data: {"text": "问题", "message_id": "80b2af55c5b7440eaca6b9d510677a75"}
data: {"text": "。", "message_id": "80b2af55c5b7440eaca6b9d510677a75"}
```

> stream=false

```json
data: {"text": "你好！我是人工智能助手，很高兴为您服务。请问有什么问题我可以帮您解答吗？", "message_id": "741a630ac3d64fd5b1832cc0bae6bb68"}
```

# 接口调用

1. 在工程化实践中，一般会将与 **AI** 相关的逻辑**封装**在 **Python** 应用中
2. **上层应用**一般通过其它语言实现 - **Java / Go**

## Java

> Java -> Python，基于 **OkHttp** 实现 **Server-Sent Events**

![image-20240817215939927](https://llm-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240817215939927.png)

## JavaScript

> JavaScript -> Java，基于 **EventSource** 实现 **Server-Sent Events**

```javascript
<script>
  let eventData = '';
  const eventSource = new EventSource('http://localhost:9999/sendMessage');
  eventSource.onmessage = function(event) {
    // 累加接收到的事件数据
    eventData += event.data;
  };
</script>
```

