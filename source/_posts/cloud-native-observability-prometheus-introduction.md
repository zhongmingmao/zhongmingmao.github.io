---
title: Observability - Prometheus Introduction
mathjax: true
date: 2025-01-22 00:06:25
cover: https://observability-1253868755.cos.ap-guangzhou.myqcloud.com/prometheus.png
categories:
  - Cloud Native
  - Observability
tags:
  - Cloud Native
  - Observability
---

# Summary

1. Open source **metrics** and **monitoring** for your systems and services.
2. Monitor your **applications**, **systems**, and **services** with the leading open source monitoring solution.
   - **Instrument**, **collect**, **store**, and **query** your metrics for **alerting**, **dashboarding**, and other use cases.

| Feature                       | Desc                                                         |
| ----------------------------- | ------------------------------------------------------------ |
| **Dimensional** data model    | Prometheus models **time series** in a flexible **dimensional** data model.<br />**Time series** are identified by a **metric name** and a set of **key-value pairs**. |
| Powerful **queries**          | The **PromQL** query language allows you to **query**, **correlate**, and **transform** your time series data in powerful ways<br />for **visualizations**, **alerts**, and more. |
| Precise **alerting**          | **Alerting rules** are based on **PromQL** and make full use of the **dimensional** data model. <br />A separate **Alertmanager** component handles **notifications** and **silencing**. |
| Simple **operation**          | Prometheus servers **operate independently** and only rely on **local storage.**<br />Developed in **Go**, the **statically linked binaries** are easy to deploy across various environments. |
| **Instrumentation** libraries | Prometheus provides a large number of **official** and **community-contributed** metrics instrumentation libraries<br />that cover most major languages. |
| Ubiquitous **integrations**   | Prometheus comes with hundreds of **official** and **community-contributed** integrations that allow you to<br />easily **extract metrics** from existing systems. |

<!-- more -->

> **Modern monitoring**

1. Monitoring for the **cloud native world**
2. Designed for the cloud native world, Prometheus integrates with **Kubernetes** and other **cloud** and **container managers**
   - to continuously **discover** and **monitor** your services.
   - It is the **second project** to graduate from the **CNCF** after **Kubernetes**.

> Open Source

1. Prometheus is **100% open source** and **community-driven**.
2. All components are available under the **Apache 2 License** on GitHub.

> Open **Governance**

1. Prometheus is a Cloud Native Computing Foundation graduated project.

# Introduction

## Overview

### What is Prometheus?

1. Prometheus is an open-source systems **monitoring** and **alerting** toolkit originally built at **SoundCloud**. 
2. Since its inception in **2012**, many **companies** and **organizations** have **adopted** Prometheus
   - and the project has a very active **developer** and user **community**.
3. It is now a **standalone open source project** and **maintained independently** of any company.
4. To emphasize this, and to clarify the project's **governance structure**
   - Prometheus joined the **Cloud Native Computing Foundation** in **2016** as the **second** hosted project, after **Kubernetes**
5. Prometheus **collects** and **stores** its **metrics** as **time series data**, i.e.
   - metrics information is stored with the **timestamp** at which it was **recorded**, alongside optional **key-value pairs** called **labels**.

#### Features

> Prometheus's main features are:

1. a **multi-dimensional** data model with **time series** data identified by **metric name** and **key/value pairs**
2. **PromQL**, a **flexible** query language to **leverage** this **dimensionality**
3. **no reliance** on **distributed storage**; single server nodes are autonomous
4. time series **collection** happens via a **pull model** over **HTTP**
5. **pushing** time series is supported via an **intermediary gateway**
6. targets are **discovered** via **service discovery** or **static configuration**
7. **multiple modes** of **graphing** and **dashboarding** support

#### What are metrics?

1. Metrics are **numerical measurements** in layperson terms.
2. The **term time series** refers to the **recording of changes over time**.
3. What users want to measure **differs** from application to application.
   - For a **web server**, it could be **request times**;
   - for a **database**, it could be the number of **active connections** or **active queries**, and so on.
4. Metrics play an important role in **understanding** why your application is working in a certain way.
5. Let's assume you are running a web application and discover that it is slow.
   - To learn what is happening with your application, you will need some information.
   - For example, when the number of requests is high, the application may become slow.
   - If you have the request count metric, you can determine the cause and increase the number of servers to handle the load.

#### Components

> The Prometheus ecosystem consists of multiple components, many of which are optional:

1. the main **Prometheus server** which **scrapes** and **stores** time series data
2. **client libraries** for **instrumenting** application code
3. a **push gateway** for supporting **short-lived jobs**
4. **special-purpose exporters** for services like HAProxy, StatsD, Graphite, etc.
5. an **alertmanager** to handle alerts
6. various support tools

Most Prometheus components are written in **Go**, making them easy to **build** and **deploy** as **static binaries**.

#### Architecture

> This diagram illustrates the architecture of Prometheus and some of its ecosystem components:

![prometheus-architecture](https://observability-1253868755.cos.ap-guangzhou.myqcloud.com/prometheus-architecture.svg)

1. Prometheus **scrapes metrics** from **instrumented jobs**, either **directly** or via an **intermediary push gateway** for short-lived jobs.
2. It **stores** all **scraped samples locally**
   - and **runs rules** over this data to either **aggregate** and **record new time series** from existing data or **generate alerts**.
3. **Grafana** or other **API consumers** can be used to **visualize** the **collected data**.

#### When does it fit?

1. Prometheus works well for recording any **purely numeric time series**.
2. It fits both **machine-centric** monitoring as well as monitoring of **highly dynamic service-oriented** architectures.
3. In a world of **microservices**, its support for **multi-dimensional** data **collection** and **querying** is a particular strength.
4. Prometheus is designed for **reliability**, to be the system you go to during an **outage** to allow you to **quickly diagnose problems**.
5. **Each Prometheus server** is **standalone**, not depending on **network storage** or other **remote services**.
6. You can rely on it when other parts of your infrastructure are broken, and you do **not need** to setup **extensive infrastructure** to use it.

#### When does it not fit?

1. Prometheus values **reliability**. You can always view what **statistics** are **available** about your system, even under **failure conditions**.
2. If you need **100% accuracy**, such as for per-request billing
   - Prometheus is not a good choice as the collected data will likely **not** be **detailed** and **complete** enough.
3. In such a case you would be best off using some other system to collect and analyze the data for billing, and Prometheus for the rest of your monitoring.

## First steps with Prometheus

1. Prometheus is a **monitoring platform** that **collects metrics** from **monitored targets** by **scraping metrics HTTP endpoints** on these targets.
2. This guide will show you how to **install**, **configure** and **monitor** our first resource with Prometheus. You'll download, install and run Prometheus.
3. You'll also download and install an **exporter**, tools that **expose time series data** on **hosts** and **services**.
4. Our first exporter will be Prometheus itself, which provides a wide variety of **host-level metrics** about **memory usage**, **garbage collection**, and more.

### Downloading Prometheus

Download the latest release of Prometheus for your platform, then extract it:

```
tar xvfz prometheus-*.tar.gz
cd prometheus-*
```

The Prometheus server is a **single binary** called **prometheus**，We can run the binary and see help on its options by passing the `--help` flag.

```
./prometheus --help
usage: prometheus [<flags>]

The Prometheus monitoring server
...
```

### Configuring Prometheus

1. Prometheus configuration is **YAML**.
2. The Prometheus download comes with a **sample configuration** in a file called **prometheus.yml** that is a good place to get started.

We've stripped out most of the comments in the example file to make it more succinct

```
global:
  scrape_interval:     15s
  evaluation_interval: 15s

rule_files:
  # - "first.rules"
  # - "second.rules"

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets: ['localhost:9090']
```

```
  全局配置 (Global Config)

  global:
    scrape_interval: 15s    # 每15秒收集一次指标（默认1分钟）
    evaluation_interval: 15s # 每15秒评估一次告警规则（默认1分钟）

  告警管理器配置 (Alertmanager)

  alerting:
    alertmanagers:
      - static_configs:
          - targets:
            # - alertmanager:9093  # 目前被注释掉，未启用
  - 定义告警管理器的地址，用于发送告警通知
  - 当前配置被注释，意味着没有配置告警通知

  规则文件 (Rule Files)

  rule_files:
    # - "first_rules.yml"
    # - "second_rules.yml"
  - 指定告警规则文件的位置
  - 当前没有启用任何规则文件

  抓取配置 (Scrape Configs)

  scrape_configs:
    - job_name: "prometheus"
      static_configs:
        - targets: ["localhost:9090"]
          labels:
            app: "prometheus"

  抓取配置详解：

  - job_name: "prometheus" - 定义作业名称，会作为标签添加到所有指标
  - targets: ["localhost:9090"] - 指定要监控的目标地址
  - labels: app: "prometheus" - 为所有来自此目标的指标添加额外标签

  当前配置状态

  这个配置文件当前只监控 Prometheus 自身（通过
  localhost:9090），这是一个基础的自监控设置。要完整使用
  Prometheus，通常需要：

  1. 添加更多监控目标（如应用服务、数据库等）
  2. 启用告警管理器配置
  3. 定义告警规则
  4. 添加更多的抓取作业
```

1. There are three blocks of configuration in the example configuration file: **global**, **rule_files**, and **scrape_configs**.
2. The **global** block controls the Prometheus server's global configuration. 
   - We have two options present. The first, **scrape_interval**, controls how **often** Prometheus will **scrape targets**.
     - You can **override** this for **individual targets**.
     - In this case the global setting is to scrape every 15 seconds.
   - The **evaluation_interval** option controls how often Prometheus will **evaluate rules**.
     - Prometheus uses **rules** to **create new time series** and to **generate alerts**.
3. The **rule_files** block specifies the location of any rules we want the Prometheus server to **load**. For now we've got no rules.
4. The last block, **scrape_configs**, controls what **resources** Prometheus **monitors**.
   - Since Prometheus also exposes data about itself as an **HTTP endpoint** it can **scrape** and **monitor** its own health.
   - In the default configuration there is a **single job**, called **prometheus**
     - which scrapes the **time series data** exposed by the **Prometheus server**.
   - The job contains a **single, statically configured, target**, the **localhost** on port **9090**.
   - **Prometheus** expects metrics to be available on targets on a path of **/metrics**.
     - So this default job is scraping via the URL: http://localhost:9090/metrics.
5. The **time series data** returned will **detail** the **state** and **performance** of the **Prometheus server**.

### Starting Prometheus

To start Prometheus with our newly created configuration file, change to the directory containing the Prometheus binary and run:

```
./prometheus --config.file=prometheus.yml
```

1. Prometheus should start up. You should also be able to browse to a status page about itself at http://localhost:9090.
2. Give it about 30 seconds to collect data about itself from its own HTTP metrics endpoint.
3. You can also verify that Prometheus is serving metrics about itself
   - by navigating to its own metrics endpoint: http://localhost:9090/metrics.

### Using the expression browser

1. Let us try looking at some data that Prometheus has collected about itself.
2. To use Prometheus's **built-in expression browser**
   - navigate to http://localhost:9090/graph and choose the "**Table**" view within the "**Graph**" tab.
3. As you can gather from http://localhost:9090/metrics,
   - one metric that Prometheus exports about itself is called `promhttp_metric_handler_requests_total`
   - the total number of **/metrics** requests the Prometheus server has served.
4. Go ahead and enter this into the **expression console**:

```
promhttp_metric_handler_requests_total
```

This should return a number of **different time series** (along with the **latest value recorded** for each), all with the **metric name** promhttp_metric_handler_requests_total, but with **different labels**. These labels designate **different requests statuses**.

If we were only interested in requests that resulted in HTTP code **200**, we could use this query to retrieve that information:

```
promhttp_metric_handler_requests_total{code="200"}
```

To count the **number** of returned **time series**, you could write:

```
count(promhttp_metric_handler_requests_total)
```

### Using the graphing interface

To graph expressions, navigate to http://localhost:9090/graph and use the "**Graph**" tab.

For example, enter the following expression to graph the **per-second HTTP request rate** returning status code 200 happening in the self-scraped Prometheus:

```
rate(promhttp_metric_handler_requests_total{code="200"}[1m])
```

```
这个 PromQL 查询语句计算的是 promhttp_metric_handler_requests_total
  指标在过去1分钟内，状态码为200的请求的速率（rate）。

  让我详细解释一下：

  指标解析

  - promhttp_metric_handler_requests_total - 这是 Prometheus HTTP
  指标处理器收到的请求总数（计数器类型）
  - {code="200"} - 过滤条件，只关注HTTP状态码为200的成功请求
  - [1m] - 时间窗口，查看过去1分钟的数据
  - rate() - 计算函数，计算时间序列在指定窗口内的平均每秒增长率

  计算逻辑

  rate(promhttp_metric_handler_requests_total{code="200"}[1m])

  这个查询会：
  1. 获取过去1分钟内所有状态码为200的请求样本点
  2. 计算这些样本点的线性回归斜率
  3. 返回平均每秒的请求增长率

  实际含义

  - 结果值表示每秒处理的200状态码请求数
  - 例如：结果为 5.2 表示平均每秒处理5.2个成功请求
  - 适用于监控 Prometheus HTTP 端点的负载情况

  使用场景

  - 监控 Prometheus 自身的 HTTP 请求处理性能
  - 评估指标查询的频率和负载
  - 设置告警阈值，如速率异常增高可能表示存在异常查询行为
```

### Monitoring other targets

1. Collecting metrics from Prometheus alone isn't a great **representation** of Prometheus' **capabilities**.
2. To get a better sense of what Prometheus can do, we recommend exploring documentation about other **exporters**. 

## Frequently asked questions

### General

> What is Prometheus?

1. Prometheus is an **open-source** systems **monitoring** and **alerting** toolkit with an **active ecosystem**.
2. It is the only system **directly supported** by **Kubernetes** and the **de facto standard** across the **cloud native ecosystem**.

> What dependencies does Prometheus have?

The main **Prometheus server** runs **standalone** as a **single monolithic binary** and has **no external dependencies**.

> Is this cloud native? - **Yes.**

1. Cloud native is a **flexible operating model**, breaking up **old service boundaries** to allow for more **flexible** and **scalable** deployments.
2. Prometheus's **service discovery** integrates with most **tools** and **clouds**.
   - Its **dimensional data model** and scale into the **tens of millions**（数千万） of **active series** allows it to monitor **large cloud-native deployments**.
   - There are always **trade-offs** to make when running services, and Prometheus values reliably **getting alerts out to humans** above all else.

> Can Prometheus be made **highly available**?

1. **Yes**, run identical Prometheus servers on two or more **separate machines**.
   - **Identical alerts** will be **deduplicated** by the **Alertmanager**
2. Alertmanager supports high availability by **interconnecting multiple Alertmanager instances** to build an **Alertmanager cluster**.
   - **Instances** of a cluster **communicate** using a **gossip** protocol managed via HashiCorp's Memberlist library.

> I was told Prometheus “doesn't scale”.

1. This is often more of a **marketing claim** than anything else.
2. A **single instance** of Prometheus can be **more performant** than some systems positioning themselves as **long term storage solution** for Prometheus.
   - You can run Prometheus **reliably** with **tens of millions** of **active series**.

> What language is Prometheus written in?

Most Prometheus components are written in **Go**. Some are also written in **Java**, **Python**, and **Ruby**.

> How **stable** are Prometheus **features**, **storage formats**, and **APIs**?

1. **All** repositories in the Prometheus GitHub organization that have reached version **1.0.0** broadly follow **semantic versioning**.
   - **Breaking changes** are indicated by increments of the **major version**.
   - Exceptions are possible for **experimental components**, which are clearly marked as such in announcements.
2. Even repositories that have not yet reached version **1.0.0** are, in general, **quite stable**.
   - We aim for a **proper release process** and an **eventual 1.0.0 release** for **each repository**.
   - In any case, **breaking changes** will be pointed out in **release notes** (marked by [**CHANGE**]) or **communicated clearly** for components that do **not have formal releases yet**.

> Why do you **pull** rather than push?

1. **Pulling** over HTTP offers a number of **advantages**:
   - You can start **extra monitoring instances** as needed, e.g. on your laptop when developing changes.
   - You can more **easily** and **reliably** tell if a target is **down**.
   - You can manually go to a target and **inspect its health** with a **web browser**.
2. Overall, we believe that **pulling** is **slightly better** than **pushing**, but it should **not** be considered a **major point** when considering a **monitoring system**.
3. For cases where you must **push**, we offer the **Pushgateway**.

> How to feed **logs** into Prometheus?

1. Short answer: **Don't!** Use something like **Grafana Loki** or **OpenSearch** instead.
2. Longer answer: Prometheus is a system to collect and process **metrics**, not an **event logging system**.
3. If you want to **extract Prometheus metrics** from application logs, **Grafana Loki** is designed for just that.

> Who wrote Prometheus?

1. Prometheus was **initially started** privately by <u>Matt T. Proud</u> and <u>Julius Volz</u>. The majority of its **initial development** was sponsored by **SoundCloud**
2. It's now **maintained** and **extended** by a wide range of **companies** and **individuals**.

> What license is Prometheus released under?

Prometheus is released under the **Apache 2.0** license.

> What is the plural of Prometheus?

1. After extensive research, it has been determined that the correct plural of 'Prometheus' is '**Prometheis**'.
2. If you can not remember this, "**Prometheus instances**" is a good workaround.

> Can I reload Prometheus's configuration?

1. Yes, sending **SIGHUP** to the Prometheus process or an HTTP POST request to the `/-/reload` endpoint will reload and apply the configuration file.
2. The **various components** attempt to **handle failing changes gracefully**.

> Can I send alerts?

1. Yes, with the Alertmanager
2. We support sending alerts through **email**, **various native integrations**, and a **webhook system** anyone can add integrations to.

> Can I create dashboards?

Yes, we recommend **Grafana** for production usage. There are also **Console templates**.

> Can I change the timezone? Why is everything in **UTC**?

1. To avoid any kind of **timezone confusion**, especially when the so-called **daylight saving time** is involved
   - we decided to **exclusively** use **Unix time internally** and **UTC** for **display purposes** in **all components** of Prometheus.
2. A carefully done **timezone selection** could be **introduced** into the **UI**. - Grafana

### Instrumentation

> Which languages have instrumentation libraries?

1. There are a number of **client libraries** for **instrumenting** your **services** with **Prometheus metrics**.
2. If you are interested in contributing a client library for a new language, see the exposition formats.

> Can I monitor machines?

Yes, the **Node Exporter** exposes an extensive set of **machine-level metrics** on **Linux** and other **Unix** systems such as CPU usage, memory, disk utilization, filesystem fullness, and network bandwidth.

> Can I monitor **network devices**?

Yes, the **SNMP Exporter** allows monitoring of devices that support SNMP. For **industrial networks**, there's also a **Modbus exporter**.

> Can I monitor batch jobs?

Yes, using the **Pushgateway**. See also the best practices for monitoring batch jobs.

> Can I monitor JVM applications via JMX?

Yes, for applications that you **cannot instrument directly** with the **Java client**, you can use the **JMX Exporter** either **standalone** or as a **Java Agent**.

> What is the performance impact of instrumentation?

1. Performance across client libraries and languages may **vary**.
2. For Java, **benchmarks** indicate that **incrementing a counter/gauge** with the Java client will take **12-17ns**, depending on **contention**.
3. This is **negligible** for all but the most **latency-critical** code.

### Implementation

> Why are all sample values **64-bit floats**?

1. We restrained ourselves to **64-bit floats** to **simplify the design**.
2. The **IEEE 754 double-precision binary floating-point format** supports **integer precision** for values up to **2^53**.
   - Supporting **native 64 bit integers** would (only) help if you need integer precision above **2^53** but below **2^63**.
3. In principle, support for **different sample value types** (including some kind of **big integer**, supporting even **more than 64 bit**) could be implemented, but it is **not a priority right now**.
4. A counter, even if incremented **one million times per second**（一百万次每秒）, will only run into **precision issues** after over **285 years**.

## Glossary

### Alert

An alert is the **outcome** of an **alerting rule** in Prometheus that is **actively firing**. Alerts are sent from **Prometheus** to the **Alertmanager**.

### Alertmanager

The Alertmanager takes in alerts, **aggregates** them into groups, **de-duplicates**, applies **silences**, **throttles**, and then sends out **notifications** to email, Pagerduty, Slack etc.

### Bridge

1. A bridge is a **component** that **takes samples** from a **client library** and **exposes** them to a **non-Prometheus monitoring system**.
2. For example, the Python, Go, and Java clients can export metrics to **Graphite**.
   - Prometheus -> Graphite

### Client library

1. A client library is a library in some language (e.g. **Go**, **Java**, **Python**, **Ruby**) that makes it easy to **directly instrument** your code
2. write **custom collectors** to **pull metrics** from other systems and **expose** the metrics to **Prometheus**.

### Collector

1. A collector is a part of an **exporter** that **represents** a **set of metrics**.
2. It may be a **single metric** if it is part of **direct instrumentation**, or **many metrics** if it is **pulling metrics** from another system.

```
根据文档中的定义和 Prometheus 的工作原理，Collector 是 Prometheus 监控体系中的一个核心概念。让我来详细解释：

  Collector 的本质

  Collector 是指标的收集者，它负责从各种源头获取指标数据并将其转换为 Prometheus 可以理解的格式。

  两种主要的 Collector 类型

  1. 直接嵌入式 Collector

  // Go 示例：直接在应用代码中嵌入
  httpRequestsTotal := prometheus.NewCounterVec(
      prometheus.CounterOpts{
          Name: "http_requests_total",
          Help: "Total number of HTTP requests",
      },
      []string{"method", "endpoint"},
  )
  - 单一指标或相关指标组
  - 直接嵌入在你的应用程序代码中
  - 实时收集应用程序内部的状态
  - 例如：HTTP 请求数、数据库连接数、内存使用情况

  2. 拉取式 Collector（Exporter 中）

  # Python 示例：从外部系统拉取
  class DatabaseCollector:
      def collect(self):
          # 从 MySQL 拉取指标
          metrics = self.query_mysql_metrics()
          yield from self.convert_to_prometheus_format(metrics)
  - 多个指标的集合
  - 从外部系统（数据库、消息队列等）拉取数据
  - 将外部系统的指标转换为 Prometheus 格式
  - 例如：MySQL Exporter、Redis Exporter

  Collector 的工作流程

  外部系统/应用程序
          ↓
      Collector 收集指标
          ↓
      转换为 Prometheus 格式
          ↓
      暴露给 Prometheus Server
          ↓
      Prometheus 定期拉取

  实际应用场景

  场景1：Web 应用中的 Collector

  // Java Spring Boot 应用
  @Component
  public class RequestCollector {
      private final Counter requestCounter = Counter.build()
          .name("http_requests_total")
          .help("Total HTTP requests")
          .labelNames("method", "status")
          .register();

      public void recordRequest(String method, int status) {
          requestCounter.labels(method, String.valueOf(status)).inc();
      }
  }

  场景2：MySQL Exporter 中的 Collector

  // MySQL Exporter 示例
  type MySQLCollector struct {
      db *sql.DB
  }

  func (c *MySQLCollector) Collect(ch chan<- prometheus.Metric) {
      // 收集连接数
      ch <- c.collectConnections()

      // 收集查询统计
      ch <- c.collectQueries()

      // 收集 InnoDB 状态
      ch <- c.collectInnoDBStats()
  }

  关键特点

  1. 抽象层：隐藏了指标来源的复杂性
  2. 转换器：将各种格式的数据统一为 Prometheus 格式
  3. 集合体：一个 Collector 可以包含多个相关指标
  4. 可扩展：支持自定义业务指标和系统指标

  理解要点

  - Collector 不是单一指标，而是指标的收集者
  - 它可以是单个指标（如简单的计数器），也可以是指标集合（如数据库的所有性能指标）
  - 直接嵌入的 Collector 通常更简单，拉取式的 Collector 通常更复杂
  - 所有最终都会通过 HTTP /metrics 端点暴露给 Prometheus

  这样理解的话，Collector 就是连接你的监控系统（Prometheus）和数据源（应用程序、数据库等）之间的桥梁。
```

### Direct instrumentation

Direct instrumentation is **instrumentation** added **inline** as **part** of the **source code** of a program, using a client library.

### Endpoint

A **source** of metrics that can be **scraped**, usually corresponding to a **single process**.

### Exporter

1. An exporter is a **binary** running **alongside** the **application** you want to obtain metrics from.
2. The exporter exposes Prometheus metrics
   - commonly by **converting** metrics that are exposed in a **non-Prometheus format** into a format that Prometheus supports.

### Instance

An instance is a **label** that **uniquely identifies** a **target** in a job.

### Job

A **collection** of **targets** with the **same purpose**, for example monitoring a **group** of **like processes replicated for scalability or reliability**, is called a job.

### Notification

A notification represents a group of one or more alerts, and is sent by the **Alertmanager** to **email**, **Pagerduty**, **Slack** etc.

### Promdash

Promdash was a **native dashboard builder** for Prometheus. It has been **deprecated** and replaced by **Grafana**.

### Prometheus

Prometheus usually refers to the **core binary** of the Prometheus system. It may also refer to the **Prometheus monitoring system** as a whole.

### PromQL

1. PromQL is the **Prometheus Query Language**.
2. It allows for a **wide range of operations** including **aggregation**, **slicing** and **dicing**, **prediction** and **joins**.

### Pushgateway

1. The Pushgateway **persists** the **most recent push** of **metrics** from **batch jobs**.
2. This allows Prometheus to **scrape** their metrics **after** they have **terminated**.

### Recording Rules

Recording rules **precompute** <u>frequently needed</u> or <u>computationally expensive expressions</u> and save their **results** as a **new set of time series**.

### Remote Read

Remote read is a **Prometheus feature** that allows **transparent reading** of **time series** from other systems (such as **long term storage**) as part of **queries**.

### Remote Read Adapter

1. Not all systems **directly support** remote read.
2. A remote read adapter sits between **Prometheus** and **another system**, converting **time series requests and responses** between them.

### Remote Read Endpoint

A remote read endpoint is what Prometheus talks to when doing a remote read.

### Remote Write

Remote write is a **Prometheus feature** that allows sending **ingested samples** on the fly to other systems, such as **long term storage**.

### Remote Write Adapter

1. Not all systems **directly support** remote write.
2. A remote write adapter sits between **Prometheus** and **another system**
   - **converting** the **samples** in the remote write into a format the other system can **understand**.

### Remote Write Endpoint

A remote write endpoint is what Prometheus talks to when doing a remote write.

### Sample

> a float64 value + a millisecond-precision timestamp

1. A sample is a **single value** at a **point** in **time** in **a time series**.
2. In Prometheus, each sample consists of **a float64 value** and **a millisecond-precision timestamp**.

### Silence

A silence in the Alertmanager **prevents alerts**, with **labels matching** the silence, **from being included in notifications**.

### Target

1. A target is the definition of **an object to scrape**.
2. For example, what **labels** to apply, any **authentication** required to connect, or other information that defines **how the scrape** will occur.

### Time Series

> same metric + same set of labeled dimensions

1. The Prometheus time series are **streams** of **timestamped values** belonging to the **same metric** and the **same set of labeled dimensions**.
2. Prometheus stores **all data** as **time series**.





