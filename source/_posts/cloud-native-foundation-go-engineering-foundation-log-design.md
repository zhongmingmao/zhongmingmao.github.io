---
title: Go Engineering - Foundation - Log - Design
mathjax: false
date: 2022-05-01 02:06:25
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
---

# 功能需求

## 基础功能

1. 支持基本的日志信息：**时间戳**、**文件名**、**行号**、**日志级别**、**日志内容**
2. 支持不同的日志级别：**Trace**（可选）、**Debug**、**Info**、**Warn**、**Error**、**Panic**（可选）、**Fatal**
   - **期望**级别：`glog.Info("This is info message")`
   - **开关**级别：`glog -v=4`，只有日志级别**高于等于** 4 的日志才会被打印
3. 支持**自定义配置**：不同的运行环境，需要不同的日志输出配置，在**不重新编译**代码的情况下，改变记录日志的行为
4. 支持输出到**标准输出**（实时读取）和**本地文件**（采集索引）

![bb1356bd3cf332ddeb30d3aef8fc8d2b](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/bb1356bd3cf332ddeb30d3aef8fc8d2b.webp)

<!-- more -->

## 高级功能

1. 支持多种日志格式：**TEXT**、**JSON**
2. 按日志级别**分类**输出：至少 **Error** 级别的日志输出到**独立**的文件中
3. 支持**结构化**日志：使用 JSON 或者其它**编码**方式使日志结构化
4. 支持日志**轮转**：借助 **Linux Logrotate** 来完成，不在日志包中实现
5. 具备 **Hook** 能力
   - 例如：当 Error 级别的日志产生时，发送邮件或者调用告警接口进行告警
   - 日志告警的最佳方案：通过**旁路**功能，将日志采集到第三方组件（如 ES），日志包功能应尽量**内聚**

```go
package main

import (
        "time"

        "go.uber.org/zap"
)

func main() {
        logger, _ := zap.NewProduction()
        defer logger.Sync() // flushes buffer, if any
        url := "http://marmotedu.com"
        // 结构化日志打印
        logger.Sugar().Infow("failed to fetch URL", "url", url, "attempt", 3, "backoff", time.Second)

        // 非结构化日志打印
        logger.Sugar().Infof("failed to fetch URL: %s", url)
}
```

```json
{"level":"info","ts":1651416552.427618,"caller":"log/zap.go:14","msg":"failed to fetch URL","url":"http://marmotedu.com","attempt":3,"backoff":1}
{"level":"info","ts":1651416552.4277399,"caller":"log/zap.go:17","msg":"failed to fetch URL: http://marmotedu.com"}
```

## 可选功能

> 非核心功能，主要为了增强日志包的**易用性**

1. 支持**颜色**输出：开发测试环境开启，生产关闭（提高**性能**）
2. **兼容标准库** log 包
3. 支持**输出到不同的位置**：ES、Kafka 等下游组件
   - 或者通过 Filebeat 或者 Fluentd 采集磁盘上的日志文件，进而投递到下游组件

> 总是将日志记录到**本地**文件，为了与日志中心**解耦**

# 设计要点

1. **高性能**：被频繁调用，不能成为应用的**性能瓶颈**
2. **并发安全**：并发记录日志
3. **插件化**：自定义输出格式、自定义存储位置、自定义错误发生时的行为
4. 日志**参数**控制：**初始化**配置（Init 函数） + **运行时**配置（SetOptions、SetLevel 等函数，支持**动态 Debug** 开关）

# 日志记录

> 日志包只是**工具**，日志记录才是**灵魂**

## 何处打印日志

> 日志主要是用来**定位问题**的

1. **分支**语句
2. **写**操作（**必须**）
3. 循环语句：循环内记录要点 + **循环外打印总结**
4. 在错误产生的**最原始位置**打印日志，方便追踪到日志的**根源**
   - 在上层**追加**一些必要的信息，有助于了解错误产生的**影响**
   - 直接返回下层日志，可以减少重复的日志打印

```go
package main

import (
        "flag"
        "fmt"

        "github.com/golang/glog"
)

func main() {
        flag.Parse()
        defer glog.Flush()

        if err := loadConfig(); err != nil {
                glog.Error(err)
        }
}

func loadConfig() error {
        return decodeConfig() // 直接返回
}

func decodeConfig() error {
        if err := readConfig(); err != nil {
                return fmt.Errorf("could not decode configuration data for user %s: %v", "colin", err) // 添加必要的信息，用户名称
        }

        return nil
}

func readConfig() error {
        glog.Errorf("read: end of input.") // 错误的最原始位置
        return fmt.Errorf("read: end of input")
}
```

```
E0501 23:18:51.066465   27194 log_where.go:32] read: end of input.
E0501 23:18:51.067256   27194 log_where.go:15] could not decode configuration data for user colin: read: end of input
```

> 调用第三方包的函数出错时，打印错误信息

```go
if err := os.Chdir("/root"); err != nil {
    log.Errorf("change dir failed: %v", err)
}
```

## 打印日志级别

| Level | Desc                                                         |
| ----- | ------------------------------------------------------------ |
| Debug | 打印大量日志，拖累应用性能，上线时必须禁止                   |
| Info  | 不是越多越好，也不是越少越好，以满足需求为主要目的，现网的日志级别一般为 Info 级别 |
| Warn  | 一般是**业务级**的警告日志，需要关注起来                     |
| Error | 记录每一个 Error 级别的日志                                  |
| Panic | 很少使用，场景：**需要错误堆栈** 或者 **defer 处理错误**     |
| Fatal | 很少使用，通常是**系统级**的错误                             |

![75e8c71a791f279a68c35734f2451035](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/75e8c71a791f279a68c35734f2451035.webp)

## 记录日志内容

1. 不记录**敏感**信息
2. commit 前，删除**临时的 Debug 日志**
3. **小写开头，`.`结尾**
4. 为了提高**性能**，使用**明确的类型**
   - 推荐：`log.Warnf("init datastore: %s", err.Error())`
   - 不推荐：`log.Warnf("init datastore: %v", err)`
5. 包含**通用**字段：**Trace Id（Span Id）+ 用户行为**
6. 日志级别要正确

# EFK

> **Filebeat** 相比于 Logstash，**更轻量级**，占用资源更少

![5daabdfea213c05fc0387aa735e54ec8](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/5daabdfea213c05fc0387aa735e54ec8.webp)

> 常见的 Shipper：Logstash Shipper、Flume、Fluentd、Filebeat

> Logstash 包括 Logstash Shipper 和 Logstash indexer

