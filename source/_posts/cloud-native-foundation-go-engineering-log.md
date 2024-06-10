---
title: Go Engineering - Log
mathjax: false
date: 2023-05-09 00:06:25
cover: https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/go-engineering-log.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
---

# 功能设计

## 基础功能

1. 支持基本的日志信息 - 时间戳、文件名、行号、日志级别、日志信息
2. 支持不同的日志级别 - Debug / Info / Warn / Error / Panic / Fatal
   - logrus 支持 Trace 日志级别，Trace 不是必须的
   - Trace 和 Panic 是可选的级别
3. 支持自定义配置 - 不同的环境采用不同的配置
   -  开发环境的日志级别为 Debug，而生产环境的日志级别为 Info
   - 通过配置，可以在`不重新编译代码`的情况下，改变记录日志的行为
4. 支持输出到标准输出和文件

<!-- more -->

> 至少实现 6 个日志级别

![image-20240610234820261](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240610234820261.png)

> 日志调用时的属性

1. `输出级别`
   - glog.Info("This is info message")
2. `开关级别`
   - 启动程序时，期望哪些输出级别的日志会被打印
   - `glog -v=L` - 只有输出级别 `≥L` 的日志才会被打印

![image-20240611000036079](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240611000036079.png)

## 高级功能

1. 支持多种日志格式 - TEXT / JSON / ...
   - 开发环境采用 TEXT 格式，生产环境采用 JSON 格式
2. 按日志级别分类输出 - Error 级别日志可以输出到独立的文件中
3. 支持`结构化`日志 - 便于后续与其它组件集成
4. 支持日志轮转 - 大小 / 时间
   - go
     - lumberjack - 支持按大小和日志归档日志
     - file-rotatelogs - 支持按小时进行日志切割
   - 不建议在日志包中添加日志轮转功能，会增加日志包的复杂度
     - Linux Logrotate
5. 具备 `Hook` 能力

## 可选功能

1. 支持颜色输出 - 开发环境
2. 兼容标准库的 log 包 - 早期 Go 项目大量使用了标准库 log 包
3. 支持输出到不同的位置

> 兼容标准库 log 包

```go
import (
	log "github.com/sirupsen/logrus"
)
```

> 直接投递到不同的下游组件

![image-20240611002702516](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240611002702516.png)

# 实现要点

1. 高性能
2. 并发安全 - 并发记录日志
3. 插件化能力 - 非必需
   - 自定义输出格式
   - 自定义存储位置
   - 自定义错误发生时的行为
4. 日志参数控制
   - 能够灵活地进行配置
   - 初始化时配置（Init 函数） or 运行时配置（SetOptions / SetLevel / ...）
5. 支持`动态开关` Debug 日志
   - 在请求中通过 `debug=true` 动态控制`某次请求`是否开启 Debug 日志

# 记录日志

> 在何处打印日志

1. 在`分支语句`处打印日志
2. `写操作`必须打日志
3. 在`循环`中`谨慎`打日志 - 循环外总结
4. 在`错误产生`的`最原始位置`打印日志

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
		return fmt.Errorf("could not decode configuration data for user %s: %v", "zhongmingmao", err) // 添加必要的信息，用户名称
	}

	return nil
}

func readConfig() error {
	glog.Errorf("read: end of input.") // 错误产生的最原始位置
	return fmt.Errorf("read: end of input")
}
```

> 选择日志级别

![image-20240611004500484](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240611004500484.png)

> 日志内容

1. 在记录日志时，不要输出`敏感`信息
2. 日志内容应该`小写`开头，`.`结尾 - log.Info("update user function called.")
3. 为了`提高性能`，应尽可能使用`明确类型`
   - OK
     - log.Warnf("init datastore: %s", err.Error())
   - Bad
     - log.Warnf("init datastore: %v", err)
4. 最好包含 - RequestID + 用户行为
5. 选择正确的日志级别



