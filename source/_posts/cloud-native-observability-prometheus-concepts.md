---
title: Observability - Prometheus Concepts
mathjax: true
date: 2025-01-23 00:06:25
cover: https://observability-1253868755.cos.ap-guangzhou.myqcloud.com/prometheus-concepts.jpg
categories:
  - Cloud Native
  - Observability
tags:
  - Cloud Native
  - Observability
---

# Data model

1. Prometheus fundamentally stores **all data** as **time series**
   - **streams** of **timestamped values** belonging to the **same metric** and the **same set of labeled dimensions**.
2. Besides **stored time series**, Prometheus may generate **temporary derived time series** as the **result** of **queries**.

<!-- more -->

## Metric names and labels

Every **time series** is **uniquely identified** by its **metric name** and **optional key-value pairs** called **labels**.

### Metric names

1. Metric names **SHOULD** specify the **general feature** of a system that is measured
   - e.g. **http_requests_total** - the total number of HTTP requests received
2. Metric names **MAY** use any **UTF-8** characters.
3. Metric names **SHOULD** match the regex `[a-zA-Z_:][a-zA-Z0-9_:]*` for the **best experience and compatibility** (see the warning below).
   - Metric names **outside of that set** will require **quoting** e.g. when used in **PromQL**

> Colons ('**:**') are **reserved** for **user-defined recording rules**. They **SHOULD NOT** be used by **exporters** or **direct instrumentation**.

### Metric labels

1. Labels let you capture **different instances** of the **same metric name**.
   - For example: all HTTP requests that used the method POST to the **/api/tracks** handler.
2. We refer to this as Prometheus's "**dimensional data model**".
3. The **query language** allows **filtering** and **aggregation** based on these **dimensions**.
4. The **change** of **any label's value**, including **adding or removing labels**, will **create a new time series**.
   - Label names **MAY** use any **UTF-8** characters.
   - Label names **beginning** with `__` (two underscores) MUST be **reserved** for **internal Prometheus use**.
   - Label names **SHOULD** match the regex `[a-zA-Z_][a-zA-Z0-9_]*` for the **best experience and compatibility** (see the warning below).
     - Label names **outside of that regex** will require **quoting** e.g. when used in **PromQL**
   - Label values **MAY** contain any **UTF-8** characters.
   - Labels with an **empty label value** are considered **equivalent** to labels that **do not exist**.

> WARNING

1. The **UTF-8 support** for **metric and label names** was added relatively recently in **Prometheus v3.0.0**.
2. It might **take time** for the **wider ecosystem** to adopt **new quoting mechanisms**, <u>relaxed validation</u> etc.
   - downstream PromQL compatible projects and vendors, tooling, third-party instrumentation, collectors, etc.
3. For the **best compatibility** it's recommended to **stick** to the **recommended** ("**SHOULD**") character set.

```
  指标名称 (Metric Names)

  基本规则

  - 目的: 指定系统测量的通用特征（如 http_requests_total - HTTP请求总数）
  - 字符: 可使用任何UTF-8字符
  - 推荐格式: 应匹配正则表达式 [a-zA-Z_:][a-zA-Z0-9_:]*
  - ⚠️ 重要限制:
    - 冒号 (:) 保留给用户定义的记录规则
    - 导出器或直接仪表化不应使用冒号

  标签 (Labels)

  标签名称规则

  - 作用: 捕获同一指标名称的不同实例（如POST方法、/api/tracks处理器的HTTP请求）
  - 字符: 可使用任何UTF-8字符
  - 内部保留: 以 __ 开头的标签名称保留给Prometheus内部使用
  - 推荐格式: 应匹配正则表达式 [a-zA-Z_][a-zA-Z0-9_]*

  标签值规则

  - 字符: 可包含任何UTF-8字符
  - 空值处理: 空标签值等同于标签不存在
  - 时间序列: 任何标签值的变更（包括添加/删除标签）都会创建新的时间序列

  维度数据模型

  Prometheus的"维度数据模型"允许查询语言基于这些维度进行过滤和聚合。

  兼容性警告

  - UTF-8支持: 在Prometheus v3.0.0中新增
  - 生态兼容: 整个生态系统（PromQL兼容项目、工具、第三方仪表化等）采用新引用机制需要时间
  - 最佳实践: 为最佳兼容性，建议遵循推荐的字符集

  这些规则确保了Prometheus指标的一致性和可维护性，同时支持复杂的监控需求。
```

## Samples

> Samples form the **actual time series data**. Each sample consists of:

1. a **float64** or **native histogram** value
2. a **millisecond-precision timestamp**]

```
  Float64 vs Native Histogram

  Float64 样本

  value: 123.45 (单个数值)
  timestamp: 1695912345678 (毫秒时间戳)

  Native Histogram 样本

  value: {
    count: 1000 (观察次数)
    sum: 12345.67 (所有观察值的总和)
    zero_threshold: 0.001 (零值阈值)
    zero_count: 50 (零值或接近零值的数量)
    schema: 1 (增长因子模式)
    positive_buckets: [
      {upper_bound: 0.1, count: 100},
      {upper_bound: 1.0, count: 200},
      {upper_bound: 10.0, count: 300}
    ]
    negative_buckets: [...] (负值桶)
  }
  timestamp: 1695912345678

  为什么引入 Native Histogram？

  1. 存储效率提升

  传统方案 (多个指标):
  http_request_duration_seconds_bucket{le="0.1"} 100
  http_request_duration_seconds_bucket{le="0.5"} 200
  http_request_duration_seconds_bucket{le="1.0"} 350
  http_request_duration_seconds_bucket{le="5.0"} 450
  http_request_duration_seconds_bucket{le="+Inf"} 500
  http_request_duration_seconds_sum 1234.56
  http_request_duration_seconds_count 500

  Native Histogram (单个指标):
  http_request_duration_seconds{...} {包含所有桶信息的一个样本}

  2. 性能优势

  | 方面   | 传统 Histogram | Native Histogram |
  |------|--------------|------------------|
  | 存储空间 | 多个时间序列       | 单个时间序列           |
  | 查询性能 | 需要关联多个指标     | 单次查询获取所有信息       |
  | 压缩效率 | 较低           | 更高               |
  | 网络传输 | 多个样本         | 单个样本             |

  3. 精度和灵活性

  动态桶边界:
  - Native histogram 可以动态调整桶的边界
  - 基于观察到的数据分布优化桶的设置
  - 减少预定义桶边界的猜测工作

  更高精度:
  // 示例：观察延迟分布
  histogram.Observe(0.123)  // 自动分配到合适的桶
  histogram.Observe(45.678) // 根据数据分布动态调整

  使用场景对比

  Float64 适用场景

  # 简单的计数器、仪表盘
  cpu_usage_percent 75.5
  memory_available_bytes 2147483648
  active_connections 150

  Native Histogram 适用场景

  # 延迟分布、请求大小、响应时间等
  http_request_duration_seconds{quantile="0.95"} 2.5
  grpc_request_size_bytes{quantile="0.50"} 1024

  迁移示例

  之前 (传统方式):
  // Go 客户端传统 histogram
  hist := prometheus.NewHistogram(prometheus.HistogramOpts{
      Name:    "http_request_duration_seconds",
      Help:    "HTTP request latency.",
      Buckets: prometheus.DefBuckets, // [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
  })

  现在 (Native Histogram):
  // Go 客户端 native histogram
  hist := prometheus.NewNativeHistogram(prometheus.NativeHistogramOpts{
      Name:    "http_request_duration_seconds",
      Help:    "HTTP request latency.",
      // 无需预定义桶，自动优化
  })

  查询语法变化

  传统查询:
  # 计算 95th 百分位
  histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

  Native Histogram 查询:
  # 直接查询百分位数
  histogram_quantile(0.95, rate(http_request_duration_seconds[5m]))

  总结

  引入 Native Histogram 的主要动机：

  1. 存储效率: 将多个相关的时间序列合并为一个
  2. 性能提升: 减少查询时的数据关联操作
  3. 精度改进: 动态桶分配提供更精确的数据分布
  4. 简化配置: 无需预定义桶边界
  5. 网络优化: 减少传输的数据量

  这是 Prometheus 在 v2.40 版本引入的重大改进，为大规模监控提供了更好的性能和效率。
```

## Notation

Given **a metric name** and **a set of labels**, time series are frequently identified using this notation:

```
<metric name>{<label name>="<label value>", ...}
```

For example, a time series with the metric name <u>api_http_requests_total</u> and the labels <u>method="POST"</u> and <u>handler="/messages"</u> could be written like this:

```
api_http_requests_total{method="POST", handler="/messages"}
```

This is the **same notation** that **OpenTSDB** uses.

Names with **UTF-8** characters **outside the recommended** set must be **quoted**, using this **notation**:

```
{"<metric name>", <label name>="<label value>", ...}
```

Since **metric name** are **internally represented** as a **label pair** with a **special label name** (`__name__="<metric name>"`) one could also use the following notation:

```
{__name__="<metric name>", <label name>="<label value>", ...}
```

# Metric types

1. The Prometheus **client libraries** offer **four** core metric types.
2. These are currently **only differentiated in the client libraries** (to enable **APIs tailored** to the **usage** of the **specific types**) and in the **wire protocol**.
3. The **Prometheus server** does **not yet** make use of the **type information** and **flattens all data** into **untyped time series**. This may change in the future.

```
  核心含义

  目前，这些指标类型仅在客户端库和传输协议中有区分，而在 Prometheus 服务器内部，所有类型都以相同的方式存储和处理。

  具体分析

  1. 客户端库的差异化处理

  // Go 客户端库示例
  // Counter - 计数器
  counter := prometheus.NewCounter(prometheus.CounterOpts{
      Name: "http_requests_total",
      Help: "Total number of HTTP requests",
  })
  counter.Inc()  // 只能增加，不能减少

  // Gauge - 仪表盘
  gauge := prometheus.NewGauge(prometheus.GaugeOpts{
      Name: "memory_usage_bytes",
      Help: "Current memory usage",
  })
  gauge.Set(1024)  // 可以任意设置值
  gauge.Dec()      // 可以减少

  // Histogram - 直方图
  histogram := prometheus.NewHistogram(prometheus.HistogramOpts{
      Name: "request_duration_seconds",
      Help: "Request latency",
  })
  histogram.Observe(0.5)  // 观察值

  2. 传输协议中的类型标识

  # Wire Protocol 示例
  # Counter 类型
  http_requests_total{method="GET"} 1234 1695912345678

  # Gauge 类型
  memory_usage_bytes{instance="host1"} 1073741824 1695912345678

  # Histogram 类型
  request_duration_seconds_bucket{le="1.0"} 100 1695912345678
  request_duration_seconds_sum 50.5 1695912345678
  request_duration_seconds_count 100 1695912345678

  3. 服务器内部统一处理

  在 Prometheus 服务器内部：
  // 内部数据结构 - 所有类型都是时间序列
  type Sample struct {
      Value     float64    // 存储数值
      Timestamp int64      // 时间戳
  }

  type TimeSeries struct {
      Labels  Labels       // 标签
      Samples []Sample     // 样本序列
  }

  4. API 层面的类型化接口

  # Python 客户端库
  from prometheus_client import Counter, Gauge, Histogram

  # 不同类型有不同的 API
  requests_total = Counter('http_requests_total', 'Total requests')
  memory_usage = Gauge('memory_usage_bytes', 'Memory usage')
  request_duration = Histogram('request_duration_seconds', 'Request duration')

  # 类型特定的方法
  requests_total.inc()              # Counter API
  memory_usage.set(1000)            # Gauge API
  request_duration.observe(0.5)     # Histogram API

  实际影响

  ✅ 客户端层面的优势

  - 类型安全: 防止误用（如对 Counter 进行递减操作）
  - 语义清晰: API 体现指标语义
  - 使用便利: 提供针对性的方法

  ⚠️ 服务器层面的限制

  - 统一存储: 服务器不区分类型，都作为时间序列存储
  - 查询时依赖约定: 用户需要知道指标的语义来正确查询
  - 类型检查缺失: 服务器端不会验证指标使用是否符合类型约定

  设计哲学

  这种设计体现了 Prometheus 的哲学：
  1. 简化: 服务器专注于存储和查询
  2. 灵活性: 客户端可以自由选择最适合的指标类型
  3. 可扩展性: 新的指标类型可以在客户端实现，无需修改服务器

  示例对比

  // 客户端：有类型区分
  counter.Add(1)    // 只能增加
  gauge.Set(100)    // 可设置任意值
  histogram.Observe(0.5) // 观察值并分布

  // 服务器：统一处理
  // 所有数据都是: labelSet -> timestamp -> value 的映射
  // 类型信息仅在客户端维护

  这种分离设计让 Prometheus 既保持了服务器的简洁性，又为客户端提供了丰富的类型化API。
```

## Counter

1. A counter is a **cumulative metric** that represents a **single monotonically increasing** counter
   - whose value can **only increase** or be **reset to zero** on **restart**.
2. For example, you can use a counter to represent the number of **requests served**, **tasks completed**, or **errors**.
3. Do not use a counter to expose a value that can **decrease**.
   - For example, do not use a counter for the number of currently running processes; instead use a **gauge**.
4. Client library usage documentation for counters: <u>Go Java Python Ruby .Net Rust</u>

## Gauge

1. A gauge is a metric that represents a **single numerical value** that can arbitrarily go **up** and **down**.
2. Gauges are typically used for measured values like **temperatures** or **current memory usage**
   - but also "counts" that can go up and down, like the number of concurrent requests.
3. Client library usage documentation for gauges: <u>Go Java Python Ruby .Net Rust</u>

## Histogram

1. A histogram samples **observations** (usually things like **request durations** or **response sizes**) and **counts** them in **configurable buckets**.
2. It also provides a **sum** of **all observed values**.
3. A histogram with a **base metric name** of `<basename>` exposes **multiple time series** during **a scrape**:
   - **cumulative counters** for the **observation buckets**, exposed as `<basename>_bucket{le="<upper inclusive bound>"}`
   - the total **sum** of **all observed values**, exposed as `<basename>_sum`
   - the **count** of **events** that have been observed, exposed as `<basename>_count` (identical to `<basename>_bucket{le="+Inf"`} above)
4. Use the **histogram_quantile()** function to **calculate quantiles** from **histograms** or even **aggregations** of **histograms**.
   - A histogram is also **suitable** to calculate an **Apdex score**
   - When operating on buckets, remember that the **histogram** is **cumulative**

> Apdex score

```
  Apdex 基础概念

  Apdex 是一个衡量应用性能的标准化指标，范围从 0 到 1，其中：
  - 1.0 = 所有用户都满意
  - 0.0 = 所有用户都不满意

  三个性能区域

  满意区域 (Satisfied)    [0, T]           用户满意的响应时间
  容忍区域 (Tolerated)    (T, 4T]         用户可容忍的响应时间
  不满意区域 (Frustrated)  (4T, ∞)         用户不满意的响应时间

  T = 目标响应时间阈值（如 0.5 秒）

  详细计算公式

  基本公式

  Apdex = (Satisfied + Tolerated/2) / Total

  其中：
  - Satisfied: 满意请求数量
  - Tolerated: 容忍请求数量
  - Total: 总请求数量

  使用 Prometheus Histogram 计算

  假设我们设置：
  - T = 0.5 秒（满意阈值）
  - 4T = 2.0 秒（不满意阈值）

  # 步骤 1: 计算各区域的请求率
  # 满意请求 (≤ 0.5s)
  satisfied_rate = sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m]))

  # 总请求 (所有桶，包括 +Inf)
  total_rate = sum(rate(http_request_duration_seconds_bucket{le="+Inf"}[5m]))

  # 容忍请求 (> 0.5s 且 ≤ 2.0s)
  tolerated_rate = sum(rate(http_request_duration_seconds_bucket{le="2.0"}[5m])) - satisfied_rate

  # 步骤 2: 计算 Apdex 分数
  apdex_score = (satisfied_rate + tolerated_rate/2) / total_rate

  完整的 Apdex 查询

  # 方法 1: 直接计算
  (
    sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) +
    (sum(rate(http_request_duration_seconds_bucket{le="2.0"}[5m])) -
     sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m]))) / 2
  ) /
  sum(rate(http_request_duration_seconds_bucket{le="+Inf"}[5m]))

  # 方法 2: 使用子查询更清晰
  (
    sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m]))
    + (sum(rate(http_request_duration_seconds_bucket{le="2.0"}[5m])) -
       sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) * 0.5
  )
  /
  sum(rate(http_request_duration_seconds_bucket{le="+Inf"}[5m]))

  # 方法 3: 多维度 Apdex（按服务分组）
  (
    sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) by (service) +
    (sum(rate(http_request_duration_seconds_bucket{le="2.0"}[5m])) by (service) -
     sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) by (service)) * 0.5
  ) /
  sum(rate(http_request_duration_seconds_bucket{le="+Inf"}[5m])) by (service)

  实际数值示例

  假设某服务 5 分钟内的请求分布：
  - ≤0.5s: 800 个请求
  - ≤2.0s: 150 个请求（新增）
  2.0s: 50 个请求

  计算过程：

  # 查询结果示例
  # 满意请求率
  sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m]))
  # 结果: 800/300 = 2.67 requests/second

  # 容忍请求率
  sum(rate(http_request_duration_seconds_bucket{le="2.0"}[5m])) - sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m]))
  # 结果: 150/300 = 0.5 requests/second

  # 总请求率
  sum(rate(http_request_duration_seconds_bucket{le="+Inf"}[5m]))
  # 结果: 1000/300 = 3.33 requests/second

  # Apdex 分数
  apdex_score = (800 + 150/2) / 1000 = (800 + 75) / 1000 = 0.875

  Apdex 等级标准

  | Apdex 分数  | 性能等级 | 描述     |
  |-----------|------|--------|
  | 0.94-1.00 | 优秀   | 用户非常满意 |
  | 0.85-0.93 | 良好   | 用户满意   |
  | 0.70-0.84 | 一般   | 基本可接受  |
  | 0.50-0.69 | 较差   | 用户开始不满 |
  | 0.00-0.49 | 很差   | 用户体验差  |

  不同应用场景的阈值建议

  # Web 应用 - T = 0.5s
  web_apdex = (
    sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) +
    (sum(rate(http_request_duration_seconds_bucket{le="2.0"}[5m])) -
     sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) * 0.5
  ) / sum(rate(http_request_duration_seconds_bucket{le="+Inf"}[5m]))

  # API 服务 - T = 0.2s
  api_apdex = (
    sum(rate(http_request_duration_seconds_bucket{le="0.2"}[5m])) +
    (sum(rate(http_request_duration_seconds_bucket{le="0.8"}[5m])) -
     sum(rate(http_request_duration_seconds_bucket{le="0.2"}[5m])) * 0.5
  ) / sum(rate(http_request_duration_seconds_bucket{le="+Inf"}[5m]))

  # 数据库查询 - T = 0.1s
  db_apdex = (
    sum(rate(db_query_duration_seconds_bucket{le="0.1"}[5m])) +
    (sum(rate(db_query_duration_seconds_bucket{le="0.4"}[5m])) -
     sum(rate(db_query_duration_seconds_bucket{le="0.1"}[5m])) * 0.5
  ) / sum(rate(db_query_duration_seconds_bucket{le="+Inf"}[5m]))

  仪表盘展示

  # 单个服务 Apdex 趋势
  label_replace(
    (
      sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) +
      (sum(rate(http_request_duration_seconds_bucket{le="2.0"}[5m])) -
       sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) * 0.5
    ) / sum(rate(http_request_duration_seconds_bucket{le="+Inf"}[5m])),
    "service", "web-api", "job", ".*"
  )

  # 多服务 Apdex 对比
  (
    sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) by (service) +
    (sum(rate(http_request_duration_seconds_bucket{le="2.0"}[5m])) by (service) -
     sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) by (service)) * 0.5
  ) / sum(rate(http_request_duration_seconds_bucket{le="+Inf"}[5m])) by (service)

  SLO 基于Apdex

  # SLO: 95% 的时间内 Apdex ≥ 0.85
  avg_over_time(
    (
      sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) +
      (sum(rate(http_request_duration_seconds_bucket{le="2.0"}[5m])) -
       sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) * 0.5
    ) / sum(rate(http_request_duration_seconds_bucket{le="+Inf"}[5m]))
    [30d:1d]
  ) >= 0.85

  通过这种方式，Apdex 将复杂的性能数据简化为单一、直观的分数，便于业务团队理解和决策。
```

```
  1. histogram_quantile() 函数使用

  基本用法

  # 计算 95% 请求的分位数
  histogram_quantile(0.95, http_request_duration_seconds_bucket)

  # 计算 50% (中位数)
  histogram_quantile(0.50, http_request_duration_seconds_bucket)

  # 计算 99%
  histogram_quantile(0.99, http_request_duration_seconds_bucket)

  聚合分位数计算

  # 跨多个实例聚合后计算分位数
  histogram_quantile(0.95,
      sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
  )

  # 多服务统一的分位数计算
  histogram_quantile(0.99,
      sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
  )

  2. Apdex 分数计算

  Apdex (Application Performance Index) 是应用性能指标，基于用户满意度。

  Apdex 计算示例

  # 设定阈值：T=0.5s (满意), 4T=2.0s (不满意边界)

  # 计算 Apdex 分数
  (
    # 满意请求 (≤0.5s)
    sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) +
    # 容忍请求 (>0.5s 但 ≤2.0s) 的一半权重
    (sum(rate(http_request_duration_seconds_bucket{le="2.0"}[5m])) -
     sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) * 0.5
  ) /
  # 总请求数
  sum(rate(http_request_duration_seconds_bucket{le="+Inf"}[5m]))

  Apdex 分数含义

  - 1.0 = 所有用户都满意
  - 0.875 = 87.5% 的用户满意，其余部分满意
  - 0.0 = 所有用户都不满意

  3. 累积性 (Cumulative) 特性

  这是 Histogram 最重要的特性！

  累积性解释

  示例：响应时间分布
  le="0.1"  : 10 个请求   (≤ 0.1s 的请求)
  le="0.5"  : 30 个请求   (≤ 0.5s 的请求，包含前面的10个)
  le="1.0"  : 80 个请求   (≤ 1.0s 的请求，包含前面的30个)
  le="2.0"  : 95 个请求   (≤ 2.0s 的请求，包含前面的80个)
  le="+Inf" : 100 个请求 (所有请求)

  实际数据结构

  http_request_duration_seconds_bucket{le="0.1"} 10
  http_request_duration_seconds_bucket{le="0.5"} 30  # 累积值，不是增量
  http_request_duration_seconds_bucket{le="1.0"} 80
  http_request_duration_seconds_bucket{le="2.0"} 95
  http_request_duration_seconds_bucket{le="+Inf"} 100

  4. 累积性的重要性

  正确的理解方式

  # 计算在 0.1s-0.5s 范围内的请求数
  range_0_1_to_0_5 = sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) -
                     sum(rate(http_request_duration_seconds_bucket{le="0.1"}[5m]))
  # 结果: 30 - 10 = 20 个请求

  常见错误理解

  # ❌ 错误：认为 le="0.5" 只包含 0.5s 的请求
  # ✅ 正确：le="0.5" 包含所有 ≤0.5s 的请求

  5. 实际应用示例

  性能监控仪表盘

  # 1. 分位数监控
  P50 = histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))
  P95 = histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
  P99 = histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

  # 2. Apdex 分数监控
  Apdex = (
    sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) +
    (sum(rate(http_request_duration_seconds_bucket{le="2.0"}[5m])) -
     sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) * 0.5
  ) / sum(rate(http_request_duration_seconds_bucket{le="+Inf"}[5m]))

  # 3. 平均响应时间
  avg_duration = rate(http_request_duration_seconds_sum[5m]) /
                 rate(http_request_duration_seconds_count[5m])

  6. Histogram vs Summary 的对比

  | 特性    | Histogram                 | Summary  |
  |-------|---------------------------|----------|
  | 分位数计算 | 服务器端 histogram_quantile() | 客户端预计算   |
  | 聚合能力  | ✅ 可跨实例聚合                  | ❌ 无法聚合   |
  | 灵活性   | 查询时计算任意分位数                | 预定义固定分位数 |
  | 存储开销  | 多个桶 + count + sum         | 较少时间序列   |
  | 使用场景  | 大规模分布式系统                  | 简单体应用    |

  7. 最佳实践

  # 1. 总是使用 rate() 处理直方图数据
  histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

  # 2. 聚合时保留桶标签
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service, instance)

  # 3. 结合 count 和 sum 计算其他指标
  request_rate = rate(http_request_duration_seconds_count[5m])
  avg_response = rate(http_request_duration_seconds_sum[5m]) / request_rate

  总结

  这段话的核心要点：

  1. histogram_quantile() 是计算分位数的主要方法
  2. Apdex 可以基于 Histogram 计算用户满意度
  3. 累积性 是 Histogram 的关键特性，理解这一点对于正确计算至关重要
  4. 聚合优势 使得 Histogram 适合分布式系统的性能监控

  理解这些概念对于有效使用 Prometheus 进行性能监控和 SLO 跟踪至关重要。
```

> 总是使用 **rate()** 处理直方图数据

```
  核心原因

  1. Counter 类型的本质

  Histogram 的桶数据本质上是 Counter 类型，它们只会递增，不会减少。

  时间戳1: http_request_duration_seconds_bucket{le="1.0"}  100
  时间戳2: http_request_duration_seconds_bucket{le="1.0"}  150  (增加了50)
  时间戳3: http_request_duration_seconds_bucket{le="1.0"}  200  (增加了50)

  2. 避免累积值误用

  如果直接使用累积值，会产生误导性的结果：

  # ❌ 错误：直接使用累积值
  sum(http_request_duration_seconds_bucket{le="1.0"})
  # 结果：200 (这是从开始到现在的总累积值)

  # ✅ 正确：使用 rate() 计算变化率
  sum(rate(http_request_duration_seconds_bucket{le="1.0"}[5m]))
  # 结果：约0.167 requests/second (每秒新增的请求数)

  详细分析

  3. 时间窗口的重要性

  rate() 函数计算的是指定时间窗口内的平均变化率：

  rate(metric[5m])  # 计算过去5分钟内的平均每秒增长率

  4. 实际数值对比

  假设一个 Web 服务的响应时间分布：

  时间点1 (10:00): http_request_duration_seconds_bucket{le="0.5"}  1000
  时间点2 (10:01): http_request_duration_seconds_bucket{le="0.5"}  1200  (新增200)
  时间点3 (10:02): http_request_duration_seconds_bucket{le="0.5"}  1400  (新增200)
  时间点4 (10:03): http_request_duration_seconds_bucket{le="0.5"}  1600  (新增200)

  不使用 rate() 的问题：

  # ❌ 直接查询累积值
  sum(http_request_duration_seconds_bucket{le="0.5"})
  # 结果：1600 (这个数字本身没有实际意义)

  # 计算分位数会得到错误结果
  histogram_quantile(0.95, http_request_duration_seconds_bucket)
  # 基于累积值计算，无法反映当前性能状况

  使用 rate() 的正确方式：

  # ✅ 计算过去5分钟内的请求率
  sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m]))
  # 结果：约3.33 requests/second (200/60秒)

  # 正确计算分位数
  histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
  # 基于变化率计算，反映当前真实的性能分布

  具体示例

  5. 分位数计算的差异

  # 数据：响应时间桶的累积值
  le="0.1": 1000
  le="0.5": 1500
  le="1.0": 1800
  le="2.0": 1950
  le="+Inf": 2000

  # ❌ 不使用 rate() - 错误的分位数计算
  histogram_quantile(0.95, http_request_duration_seconds_bucket)
  # 结果：基于累积值计算，可能得到 1.8s 的错误分位数

  # ✅ 使用 rate() - 正确的分位数计算
  histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
  # 结果：基于实际请求分布计算，得到真实的 95% 分位数

  6. 仪表盘对比

  # 错误的仪表盘配置（显示累积值）
  - title: "满意请求数"
    expr: sum(http_request_duration_seconds_bucket{le="0.5"})
    # 显示：从开始累积的总数，数值只会增长

  # 正确的仪表盘配置（显示实时性能）
  - title: "满意请求率"
    expr: sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m]))
    # 显示：每秒满意的请求数，反映当前性能状况

  - title: "95% 响应时间"
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
    # 显示：当前95%请求的响应时间

  特殊情况

  7. 什么时候不使用 rate()？

  # 1. 查询当前累积总数（如总请求数）
  sum(http_request_duration_seconds_count)

  # 2. 计算平均值时，rate() 可以抵消
  # avg = sum / count
  rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])
  # 两个 rate() 可以抵消，简化为：
  http_request_duration_seconds_sum / http_request_duration_seconds_count

  # 3. 实时状态监控（非趋势分析）
  # 但这种情况较少，通常还是用 rate() 更有意义

  8. increase() 替代方案

  # 也可以使用 increase() 计算时间窗口内的总增量
  increase(http_request_duration_seconds_bucket{le="0.5"}[5m])
  # 结果：过去5分钟内的总增量

  # 等价于：
  rate(http_request_duration_seconds_bucket{le="0.5"}[5m]) * 300 (5分钟*60秒)

  最佳实践总结

  # ✅ 推荐的查询模式

  # 1. 分位数监控
  histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

  # 2. Apdex 分数
  (
    sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) +
    (sum(rate(http_request_duration_seconds_bucket{le="2.0"}[5m])) -
     sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) * 0.5
  ) / sum(rate(http_request_duration_seconds_bucket{le="+Inf"}[5m]))

  # 3. 请求速率监控
  sum(rate(http_request_duration_seconds_count[5m]))

  # 4. 平均响应时间
  rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

  总结

  使用 rate() 的核心原因：

  1. 避免累积值误导 - Counter 类型的数据是累积的，直接使用没有意义
  2. 反映实时性能 - rate() 显示当前的性能趋势，而不是历史累积
  3. 正确的分位数计算 - histogram_quantile() 需要基于实际请求分布，不是累积值
  4. 有意义的监控 - 只有变化率才能反映系统的实时运行状况

  这是 Prometheus 监控最佳实践的核心原则之一！
```

> NOTE

1. Beginning with **Prometheus v2.40**, there is **experimental support** for **native histograms**.
2. A **native histogram** requires **only one time series**, which includes a **dynamic number of buckets** in addition to the **sum** and **count** of observations.
3. Native histograms allow **much higher resolution** at a **fraction** of the **cost**.
4. **Detailed documentation** will follow once native histograms are **closer** to becoming a **stable feature**.

```
  Native Histograms 的稳定状态

  🎯 正式稳定版本

  - Prometheus v3.8.0 及以上版本中，Native Histograms 已成为 stable feature
  - 不再需要启用 --enable-feature=native-histograms 标志

  📅 发展时间线

  - v2.40.0 (2022年): 首次引入实验性支持，需要启用特性标志
  - v3.0.0 (2024年): 改进实验性支持，但仍需标志
  - v3.8.0 (2025年): 正式成为稳定功能

  🔍 关键信息来源

  根据 Prometheus 官方文档：
  "Starting with v3.8.0, native histograms are supported as a stable feature."

  Grafana Labs 博客也确认：
  "Last week, during PromCon EU 2025, the Prometheus developers announced that native histograms are now stable, after three years of intense testing and improvements."

  生态系统的支持情况

  ✅ 已支持 Native Histograms 的组件

  1. Prometheus Server - v3.8.0+ 稳定支持
  2. Grafana Mimir - 已支持（作为 Prometheus 下游项目）
  3. Grafana Cloud - 已集成，提供专门的可视化支持
  4. OpenTelemetry - 兼容性支持
  5. 客户端库 - Go、Java 等官方客户端已支持

  🔄 向后兼容性

  - 现有的经典直方图继续工作
  - 两种格式可以并存
  - 渐进式迁移路径

  使用建议

  🚀 现在可以安全使用

  # 在 Prometheus v3.8.0+ 中，可以直接使用
  # 无需特殊配置或特性标志

  # 查询示例
  histogram_quantile(0.95, rate(http_request_duration_seconds[5m]))

  📊 迁移考虑

  - 新项目可以直接使用 Native Histograms
  - 现有项目可以逐步迁移
  - 考虑客户端库的兼容性

  💡 优势确认

  经过3年测试，Native Histograms 的优势得到验证：
  - 存储效率: 单一时间序列替代多个桶
  - 精度提升: 动态桶边界
  - 性能优化: 减少网络传输和存储开销
  - 简化配置: 无需预定义桶边界

  总结

  是的，Native Histograms 现在是 Prometheus 的稳定功能，可以在生产环境中安全使用。这是一个重大的里程碑，标志着 Prometheus 监控技术的重大进步。
```

> NOTE

Beginning with **Prometheus v3.0**, the **values** of the **le label** of **classic histograms** are **normalized** during **ingestion** to follow the **format** of **OpenMetrics Canonical Numbers**

```
  什么是 OpenMetrics Canonical Numbers？

  Canonical Numbers 格式

  OpenMetrics 规范要求数值标签遵循特定的规范格式：
  - 整数: 直接使用，如 le="1"
  - 小数: 使用最精确的表示，如 le="0.1" 而不是 le="0.10"
  - 科学计数法: 对于极大或极小的数，如 le="1e-6"

  Prometheus v3.0 的变更

  🔄 规范化处理 (Normalization)

  当 Prometheus 采集经典直方图时，会对 le 标签的值进行规范化：

  # 采集前的原始值
  http_request_duration_seconds_bucket{le="0.100"} 100
  http_request_duration_seconds_bucket{le="0.500"} 200
  http_request_duration_seconds_bucket{le="1.000"} 350

  # 规范化后的存储值
  http_request_duration_seconds_bucket{le="0.1"} 100
  http_request_duration_seconds_bucket{le="0.5"} 200
  http_request_duration_seconds_bucket{le="1"} 350

  📝 具体规范化规则

  // 规范化示例
  "0.100"   → "0.1"     // 移除尾随零
  "1.0"     → "1"       // 整数形式
  "0.010"   → "0.01"    // 移除不必要的零
  "1000.0"  → "1000"    // 整数形式
  "1e-3"    → "0.001"   // 转换为小数形式（在某些情况下）

  为什么要进行规范化？

  1. 标准化兼容性

  # 不同客户端可能发送相同值的不同表示
  客户端A: le="0.500"
  客户端B: le="0.5"
  客户端C: le="5e-1"

  # 规范化后统一为
  le="0.5"

  2. 查询一致性

  # 规范化前，可能需要查询多个变体
  sum(rate(http_request_duration_seconds_bucket{le=~"0.5|0.500|0.50"}[5m]))

  # 规范化后，查询更简单
  sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m]))

  3. OpenMetrics 合规性

  # 符合 OpenMetrics 1.0 规范
  # 确保与其他监控系统的互操作性

  实际影响示例

  📊 监控配置影响

  之前 (v2.x):
  # 可能需要处理多种格式
  - record: http_request_duration_95th
    expr: histogram_quantile(0.95,
      rate(http_request_duration_seconds_bucket{le=~"0\\.5|0\\.500"}[5m]))

  现在 (v3.0+):
  # 格式标准化，查询更简单
  - record: http_request_duration_95th
    expr: histogram_quantile(0.95,
      rate(http_request_duration_seconds_bucket{le="0.5"}[5m]))

  🔧 客户端库影响

  // Go 客户端示例
  hist := prometheus.NewHistogram(prometheus.HistogramOpts{
      Name:    "http_request_duration_seconds",
      Help:    "HTTP request latency",
      Buckets: []float64{0.1, 0.5, 1.0, 5.0},  // 这些值在存储时会被规范化
  })

  ⚠️ 注意事项

  1. 查询兼容性: 现有的查询可能需要更新
  2. 仪表盘: Grafana 仪表盘中的查询可能需要调整
  3. 告警规则: 基于 le 标签的告警规则可能需要修改

  迁移指南

  🔄 查询更新示例

  # 旧查询（可能不兼容）
  histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{le="0.500"}[5m]))

  # 新查询（推荐）
  histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{le="0.5"}[5m]))

  📈 向后兼容性

  Prometheus v3.0 在处理时会自动规范化，但建议：
  1. 检查现有的查询和告警规则
  2. 更新硬编码的 le 值
  3. 测试仪表盘的兼容性

  总结

  这个变更的主要目的是：

  1. 标准化: 统一数值表示格式
  2. 兼容性: 与 OpenMetrics 标准对齐
  3. 简化: 让查询和配置更加一致
  4. 互操作性: 提升与其他监控系统的集成能力

  这是 Prometheus 向 OpenMetrics 标准靠拢的重要一步，为整个监控生态的标准化做出了贡献。
```

Client library usage documentation for histograms: <u>Go Java Python Ruby .Net Rust</u>

## Summary

1. Similar to a histogram, a summary **samples observations** (usually things like **request durations** and **response sizes**).
2. While it also provides a total **count** of **observations** and a **sum** of all **observed values**, it calculates **configurable quantiles** over a **sliding** time window.
3. A summary with a **base metric name** of `<basename>` exposes **multiple time series** during a **scrape**:
   - streaming **φ-quantiles** (0 ≤ φ ≤ 1) of observed events, exposed as `<basename>{quantile="<φ>"}`
   - the **total sum** of all observed values, exposed as `<basename>_sum`
   - the **count** of events that have been observed, exposed as `<basename>_count`

> NOTE

Beginning with **Prometheus v3.0**, the **values** of the **quantile label** are **normalized** during **ingestion** to follow the format of **OpenMetrics Canonical Numbers**

Client library usage documentation for summaries: <u>Go Java Python Ruby .Net</u>

# Jobs and instances

1. In Prometheus terms, an **endpoint** you can **scrape** is called an **instance**, usually corresponding to **a single process**.
2. A **collection** of **instances** with the **same purpose**, a process **replicated** for **scalability** or **reliability** for example, is called a **job**.
3. For example, an API server job with four replicated instances:
   - job: `api-server`
     - instance 1: `1.2.3.4:5670`
     - instance 2: `1.2.3.4:5671`
     - instance 3: `5.6.7.8:5670`
     - instance 4: `5.6.7.8:5671`

## Automatically generated labels and time series

1. When Prometheus **scrapes** a **target**, it **attaches some labels automatically** to the **scraped time series** which serve to **identify** the scraped **target**:
   - **job**: The **configured job name** that the target belongs to.
   - **instance**: The `<host>:<port>` part of the **target's URL** that was **scraped**.
2. If either of these labels are already present in the scraped data, the behavior depends on the **honor_labels** configuration option.

>   honor_labels 配置解决了 Prometheus 采集过程中的**标签冲突**问题：
>
>   - false (默认): **Prometheus 标签优先**，适合标准化环境
>   - true: 目标标签优先，适合自定义标签体系

```
  正确的行为模式

  1. honor_labels: false (默认值)

  行为: Prometheus 的标签优先，目标数据中的冲突标签会被重命名，而不是忽略

  # Prometheus 配置
  scrape_configs:
    - job_name: 'myapp'  # 这个 job 名称是 Prometheus 使用的
      static_configs:
        - targets: ['localhost:8080']
      honor_labels: false

  正确的处理过程:

  # 目标数据返回
  http_requests_total{job="myapp", instance="localhost:8080"} 1000

  # Prometheus 存储结果
  # Prometheus 的标签优先，目标数据的冲突标签被重命名
  http_requests_total{job="myapp", instance="localhost:8080", exported_job="myapp", exported_instance="localhost:8080"} 1000

  2. honor_labels: true

  行为: 目标数据的标签优先，Prometheus 的冲突标签会被丢弃

  # 目标数据返回
  http_requests_total{job="myapp", instance="localhost:8080"} 1000

  # Prometheus 存储结果
  # 目标标签优先，保持原样
  http_requests_total{job="myapp", instance="localhost:8080"} 1000

  更详细的正确示例

  honor_labels: false 的详细行为

  # Prometheus 配置
  scrape_configs:
    - job_name: 'prometheus-job'
      static_configs:
        - targets: ['target.example.com:8080']
      honor_labels: false

  处理过程:
  # 1. Prometheus 会自动添加标签
  # job="prometheus-job" (来自配置)
  # instance="target.example.com:8080" (来自目标地址)

  # 2. 目标返回数据
  http_requests_total{job="target-job", instance="target-instance"} 1000

  # 3. 存储结果（冲突标签被重命名）
  http_requests_total{
    job="prometheus-job",           # Prometheus 的标签
    instance="target.example.com:8080",  # Prometheus 的标签
    exported_job="target-job",      # 重命名后的目标标签
    exported_instance="target-instance"   # 重命名后的目标标签
  } 1000

  honor_labels: true 的详细行为

  # Prometheus 配置
  scrape_configs:
    - job_name: 'prometheus-job'
      static_configs:
        - targets: ['target.example.com:8080']
      honor_labels: true

  处理过程:
  # 1. 目标返回数据
  http_requests_total{job="target-job", instance="target-instance"} 1000

  # 2. 存储结果（保持目标标签，丢弃 Prometheus 的自动标签）
  http_requests_total{
    job="target-job",        # 目标的标签
    instance="target-instance"  # 目标的标签
  } 1000

  实际验证

  查询验证

  # 当 honor_labels: false 时，可以看到重命名的标签
  http_requests_total{exported_job="target-job"}

  # 当 honor_labels: true 时，直接查询原始标签
  http_requests_total{job="target-job"}

  总结修正

  感谢指出错误！正确的行为是：

  - honor_labels: false: Prometheus 标签优先，冲突的目标标签会被重命名（添加 exported_ 前缀）
  - honor_labels: true: 目标标签优先，Prometheus 的冲突标签会被丢弃

  关键是要理解两个标签体系会同时存在，而不是简单地"忽略"某一方的标签。
```

> For each **instance** scrape, Prometheus stores a **sample** in the following time series:

1. `up{job="<job-name>", instance="<instance-id>"}`
   - **1** if the instance is **healthy**, i.e. **reachable** or **0** if the **scrape failed**.
2. `scrape_duration_seconds{job="<job-name>", instance="<instance-id>"}`
   - **duration** of the scrape.
3. `scrape_samples_post_metric_relabeling{job="<job-name>", instance="<instance-id>"}`
   - the number of **samples remaining** after **metric relabeling** was applied.
4. `scrape_samples_scraped{job="<job-name>", instance="<instance-id>"}`
   - the number of **samples** the target **exposed**.
5. `scrape_series_added{job="<job-name>", instance="<instance-id>"}`
   - the **approximate** number of **new series** in this scrape. New in **v2.10**

> scrape_samples_post_metric_relabeling

```
  指标含义

  📊 scrape_samples_post_metric_relabeling 指标

  scrape_samples_post_metric_relabeling{job="myapp", instance="localhost:8080"} 1500

  含义: 在对 "myapp" 任务的 "localhost:8080" 实例进行抓取后，经过 metric relabeling 处理，最终保留了 1500 个样本。

  Metric Relabeling 流程

  🔄 完整的抓取流程

  1. [目标端点] → 原始指标数据
     ↓
  2. [抓取] → 获取所有原始样本
     ↓
  3. [Metric Relabeling] → 过滤、修改、添加标签
     ↓
  4. [存储] → 最终存储的样本

  scrape_samples_post_metric_relabeling 测量的是第3步之后剩余的样本数

  配置示例

  📝 Metric Relabeling 配置

  scrape_configs:
    - job_name: 'myapp'
      static_configs:
        - targets: ['localhost:8080']
      metric_relabel_configs:
        # 1. 过滤掉不需要的指标
        - source_labels: [__name__]
          regex: 'go_.*'
          action: drop

        # 2. 只保留特定的指标
        - source_labels: [__name__]
          regex: 'http_.*|process_.*'
          action: keep

        # 3. 修改标签
        - source_labels: [service]
          target_label: application
          regex: '(.*)'
          replacement: 'myapp-${1}'

        # 4. 添加新标签
        - target_label: environment
          replacement: 'production'

        # 5. 删除标签
        - regex: 'temp_.*'
          action: labeldrop

  实际应用示例

  🎯 场景1: 过滤高基数指标

  # 配置：过滤掉 go_* 指标以减少存储
  metric_relabel_configs:
    - source_labels: [__name__]
      regex: 'go_.*'
      action: drop

  # 结果：
  # 原始抓取: 5000 个样本
  # 过滤后: 3000 个样本
  # 指标显示: scrape_samples_post_metric_relabeling{job="myapp"} 3000

  🎯 场景2: 环境标签标准化

  # 配置：为所有指标添加环境标签
  metric_relabel_configs:
    - target_label: env
      replacement: 'prod'

  # 结果：
  # 所有样本都获得了 env="prod" 标签
  # 样本数量不变，但标签结构改变
  scrape_samples_post_metric_relabeling{job="myapp"} 3000

  🎯 场景3: 高级过滤逻辑

  # 配置：复杂的过滤和转换逻辑
  metric_relabel_configs:
    # 只保留 HTTP 相关指标
    - source_labels: [__name__]
      regex: 'http_.*'
      action: keep

    # 添加服务标签
    - source_labels: [__meta_kubernetes_pod_label_app]
      target_label: service
      regex: '(.*)'
      replacement: '${1}'

    # 删除临时标签
    - regex: '__meta_kubernetes_.*'
      action: labeldrop

  相关指标对比

  📈 完整的抓取指标体系

  # 1. 抓取的原始样本数
  scrape_samples_scraped{job="myapp", instance="localhost:8080"}

  # 2. Metric relabeling 后的样本数
  scrape_samples_post_metric_relabeling{job="myapp", instance="localhost:8080"}

  # 3. 实际存储的样本数（可能因其他原因被丢弃）
  prometheus_tsdb_head_samples_appended{job="myapp", instance="localhost:8080"}

  📊 过滤效率计算

  # 计算 metric relabeling 的过滤效率
  (
    scrape_samples_scraped - scrape_samples_post_metric_relabeling
  ) / scrape_samples_scraped * 100

  # 示例：计算过滤掉的样本百分比
  (5000 - 3000) / 5000 * 100 = 40%  # 过滤掉了 40% 的样本

  监控和告警

  🚨 基于此指标的告警

  # 告警：metric relabeling 后样本数为 0
  - alert: ScrapeNoSamplesAfterRelabeling
    expr: scrape_samples_post_metric_relabeling == 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "No samples after metric relabeling for {{ $labels.job }}/{{ $labels.instance }}"
      description: "Target {{ $labels.instance }} in job {{ $labels.job }} has no samples after metric relabeling."

  # 告警：样本数异常低
  - alert: ScrapeLowSamplesAfterRelabeling
    expr: scrape_samples_post_metric_relabeling < 10
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Low sample count after metric relabeling"
      description: "Only {{ $value }} samples remaining after relabeling for {{ $labels.job }}/{{ $labels.instance }}"

  📈 仪表盘查询

  # 1. 各任务的样本数趋势
  sum(scrape_samples_post_metric_relabeling) by (job)

  # 2. 各实例的样本数分布
  sum(scrape_samples_post_metric_relabeling) by (instance, job)

  # 3. 过滤效率分析
  (sum(scrape_samples_scraped) - sum(scrape_samples_post_metric_relabeling)) / sum(scrape_samples_scraped) * 100

  # 4. 样本数变化率
  rate(scrape_samples_post_metric_relabeling[5m])

  故障排查

  🔍 问题诊断流程

  # 1. 检查原始抓取数据
  curl http://localhost:8080/metrics | wc -l

  # 2. 检查 Prometheus 中的指标
  curl "http://prometheus:9090/api/v1/query?query=scrape_samples_post_metric_relabeling"

  # 3. 检查 relabeling 配置
  curl "http://prometheus:9090/api/v1/targets" | jq '.data.activeTargets[] | {job, instance, scrapeUrl, lastError}'

  🛠️ 常见问题解决

  # 问题：过滤规则过于严格，导致样本数为 0
  # 解决：检查 relabeling 规则
  metric_relabel_configs:
    - source_labels: [__name__]
      regex: 'too_strict_pattern'  # 可能过于严格
      action: drop  # 考虑放宽规则

  总结

  scrape_samples_post_metric_relabeling 指标是 Prometheus 监控体系中的重要组成部分，它：

  1. 跟踪过滤效果: 监控 metric relabeling 规则的实际效果
  2. 优化存储使用: 帮助优化指标存储和查询性能
  3. 故障排查: 用于诊断数据丢失和配置问题
  4. 容量规划: 评估存储需求和性能影响

  理解这个指标对于有效管理 Prometheus 的指标收集和存储策略至关重要。
```

The **up** time series is useful for **instance availability monitoring**.

With the **extra-scrape-metrics** feature flag several **additional metrics** are available:

1. `scrape_timeout_seconds{job="<job-name>", instance="<instance-id>"}`
   - The **configured scrape_timeout** for a target. **10**
2. `scrape_sample_limit{job="<job-name>", instance="<instance-id>"}`
   - The **configured sample_limit** for a target. Returns **zero** if there is **no limit configured**. **0**
3. `scrape_body_size_bytes{job="<job-name>", instance="<instance-id>"}`
   - The **uncompressed size** of the **most recent scrape response**, if successful.
   - **Scrapes failing** because **body_size_limit** is **exceeded** report **-1**, <u>other scrape failures</u> report **0**.



