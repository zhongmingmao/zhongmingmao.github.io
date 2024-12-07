---
title: Observability - OpenTelemetry
mathjax: true
date: 2024-10-14 00:06:25
cover: https://observability-1253868755.cos.ap-guangzhou.myqcloud.com/cloud-native-observability-opentelemetry.png
categories:
  - Cloud Native
  - Observability
tags:
  - Cloud Native
  - Observability
---

# 简介

1. OpenTelemetry 简称 OTel，是 CNCF 的一个可观测性项目
2. OpenTelemetry 旨在提供**可观测性领域**的**标准化方案**
   - 解决**遥测数据**的**数据建模**、**采集**、**处理**和**导出**等标准化问题，并能将数据发送到**后端** - 避免**厂商锁定**

<!-- more -->

# 历史

1. 在 OpenTelemetry 之前，已经出现过 **OpenTracing** 和 **OpenCensus** 两套标准
2. 在 **APM** 领域，有 Jaeger、Pinpoint、Zipkin 等多个开源产品，都有独立的**数据采集标准**和 **SDK**
3. **OpenTracing** 制订了一套与**平台**和**厂商**无关的协议标准，能够方便地添加或者更换**底层 APM 实现**
   - 2016 年 11 月，CNCF 接受 **OpenTracing** 成为第三个项目 - **Kubernetes** + **Prometheus**
4. **OpenCensus** 由**谷歌**发起，包括 **Metrics**，而**微软**也加入了 OpenCensus
5. 在**功能**和**特性**上，OpenTracing 和 OpenCensus 差不多，都想统一对方，此时 **OpenTelemetry** 横空出世
6. OpenTelemetry
   - 同时**兼容** OpenTracing 和 OpenCensus
   - 支持各种**语言**和**后端** - OpenTelemetry **本身不提供后端**
   - 支持**厂商中立** - 在不改变现有工具的情况下捕获遥测数据并将其传输到后端

# 架构

> Specification + API / SDK + Collector

## 跨语言规范

1. 跨语言规范描述了所有实现的**跨语言要求**和**数据模型**
   - 遥测客户端**内部实现**所需要的**标准**和**定义** + 与外部**通信**时需要实现的**协议规范**
2. 主要包含
   - API - 定义用于生成和关联 Tracing、Metrics 和 Logs 的**数据类型**和**操作**
   - SDK - 定义 API **特定语言**实现的要求，同时还定义配置、数据处理和导出等概念
   - 数据 - 定义**遥测后端**可以支持的 OpenTelemetry **协议**和与**厂商无关**的语义约定
3. OTLP - OpenTelemetry Protocol
   - **OTLP** 是 OpenTelemetry **原生**的**遥测信号传递协议**
   - OpenTelemetry 项目组件支持 **Zipkin V2** 或 **Jaeger Thrift** 协议格式的实现 - **第三方贡献库**
   - OTLP 的**数据模型定义**是基于 **ProtoBuf** 完成的

## API + SDK

1. **API** 可以让开发者对应用程序代码进行 **Instrument**，而 **SDK** 是 API 的**具体实现**，与**开发语言**是相关的
2. **Instrument** 是将**系统状态数据**（遥测数据-Telemetry）发送到**后端**，遥测数据包括 - Metrics + Logs + Tracing
   - 遥测数据记录了处理特定请求时的**代码行为**，可以对应用系统的状态进行分析
3. Instrument 的方式 - **手动**增加代码生成遥测数据 + 以**探针**的方式**自动**收集数据
4. OpenTelemetry 为每种语言提供了**基础**的监控客户端 **API** 和 **SDK**

## Collector

1. Collector - **接收**、**转换**和**导出**遥测数据 - OpenTelemetry 中最重要的部分
2. Collector 针对如何**接收**、**处理**和**导出**遥测数据提供了与**厂商无关**的实现 - 避免**厂商锁定**
3. Collector 支持将**开源可观测数据格式**（如 **Jaeger**、**Prometheus** 等）发送到**一个或多个**开源或商业后端
4. 在 Collector 内部，有一套负责接收、处理和导出数据的 **Pipeline**
   - **Receiver**
     - 负责按照对应的**协议格式**监听和接收遥测数据，并将数据转给一个或多个 Processor
   - Processor
     - 负责加工处理遥测数据，并把数据传递给下一个 Processor 或者一个或多个 Exporter
   - Exporter
     - 负责把数据发送给下一个接收端（一般是后端），例如将指标数据存储到 Prometheus 中

![image-20241207215647292](https://observability-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241207215647292.png)

> 部署模式

1. **Agent** 模式
   - 把 Collector 部署在应用程序所在的主机内（Kubernetes **DaemonSet** or Kubernetes **Sidecar**）
2. **Gateway** 模式
   - 把 Collector 当作一个**独立的中间件**，应用把采集到的遥测数据发往到该中间件

# 实现方案

## 开源工具

> OpenTelemetry 在 Logs 方面还不稳定

![image-20241207220324398](https://observability-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241207220324398.png)

## Grafana

![image-20241207220845370](https://observability-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241207220845370.png)

1. Grafana Tempo
   - Grafana Tempo 是一个**开源**、**易于使用**且**大规模**的**分布式追踪后端**
   - Tempo 具有**成本**效益，只需要**对象存储**即可运行，可以和 Grafana、Prometheus 和 Loki 深度集成
   - Tempo 可以与**任何开源 Tracing 协议**一起使用 - Jaeger、Zipkin、OpenTelemetry
2. Grafana Loki - Like **Prometheus**, but for logs
   - Grafana Loki 是一个**水平可扩展**、**高可用性**、**多租户**的**日志聚合系统**
   - Grafana Loki 的设计非常**经济高效**且易于操作，不会为**日志内容**编制**索引**，而是为每个**日志流**编制**一组标签**
   - OpenTelemetry 为对应的**日志**打上 **TraceId** 和 **SpanId** 等标签
   - Grafana Loki 并不能**高效分析和处理**大型生产系统的日志

