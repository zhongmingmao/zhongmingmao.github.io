---
title: Observability - OpenTelemetry Doc V2
mathjax: true
date: 2025-01-02 00:06:25
cover: https://observability-1253868755.cos.ap-guangzhou.myqcloud.com/otel-beelines.jpg
categories:
  - Cloud Native
  - Observability
tags:
  - Cloud Native
  - Observability
  - OpenTelemetry
---

# Language APIs & SDKs

> OpenTelemetry code instrumentation is supported for many popular programming languages

<!-- more -->

1. OpenTelemetry **code instrumentation** is supported for the languages listed in the Statuses and Releases table below.
2. For **Go**, **.NET**, **PHP**, **Python**, **Java** and **JavaScript** you can use **zero-code solutions** to add instrumentation to your application **without code changes**.
3. If you are using **Kubernetes**, you can use the **OpenTelemetry Operator for Kubernetes** to **inject these zero-code solutions** into your application.

> Status and Releases

| Language   | Traces | Metrics | Logs            |
| ---------- | ------ | ------- | --------------- |
| C++        | Stable | Stable  | Stable          |
| C#/.NET    | Stable | Stable  | Stable          |
| Go         | Stable | Stable  | **Beta**        |
| Java       | Stable | Stable  | Stable          |
| JavaScript | Stable | Stable  | **Development** |
| Python     | Stable | Stable  | **Development** |

## SDK Configuration

1. OpenTelemetry SDKs support configuration in each language and with **environment variables**.
2. Values set with **environment variables** override equivalent configuration in code using **SDK APIs**.

### General

> Support for **environment variables** is **optional**.

#### OTEL_SERVICE_NAME

1. Sets the value of the **service.name** resource attribute.
2. Default value - **unknown_service**
3. If **service.name** is also provided in **OTEL_RESOURCE_ATTRIBUTES**, then **OTEL_SERVICE_NAME** takes **precedence**.
4. export OTEL_SERVICE_NAME="your-service-name"

#### OTEL_RESOURCE_ATTRIBUTES

1. **Key-value pairs** to be used as **resource attributes**. See Resource SDK for more details.
2. Default value - **Empty**
3. export OTEL_RESOURCE_ATTRIBUTES="key1=value1,key2=value2"

#### OTEL_TRACES_SAMPLER

1. Specifies the **Sampler** used to **sample traces** by the **SDK**.
2. Default value - **parentbased_always_on**
3. export OTEL_TRACES_SAMPLER="traceidratio"

> Accepted values for OTEL_TRACES_SAMPLER are:

| Sampler                   | Desc                                         |
| ------------------------- | -------------------------------------------- |
| always_on                 | AlwaysOnSampler                              |
| always_off                | AlwaysOffSampler                             |
| traceidratio              | TraceIdRatioBased                            |
| parentbased_always_on     | ParentBased(root=AlwaysOnSampler)            |
| parentbased_always_off    | ParentBased(root=AlwaysOffSampler)           |
| parentbased_traceidratio  | ParentBased(root=TraceIdRatioBased)          |
| parentbased_jaeger_remote | ParentBased(root=JaegerRemoteSampler)        |
| jaeger_remote             | JaegerRemoteSampler                          |
| xray                      | AWS X-Ray Centralized Sampling (third party) |

#### OTEL_TRACES_SAMPLER_ARG

1. Specifies arguments, if applicable, to the sampler defined in by **OTEL_TRACES_SAMPLER**. 
2. The specified value will only be used if OTEL_TRACES_SAMPLER is set.
3. Each **Sampler** type defines **its own expected input**, if any.
4. Invalid or unrecognized input is logged as an **error**.
5. Default value - **Empty**

```
export OTEL_TRACES_SAMPLER="traceidratio"
export OTEL_TRACES_SAMPLER_ARG="0.5"
```

> Depending on the value of **OTEL_TRACES_SAMPLER**, **OTEL_TRACES_SAMPLER_ARG** may be set as follows:

1. For **traceidratio** and **parentbased_traceidratio** samplers: **Sampling probability**, a number in the **[0..1]** range, e.g. “0.25”. - Default is **1.0** if unset.

#### OTEL_PROPAGATORS

1. Specifies **Propagators** to be used in a **comma-separated** list.
2. Default value - **tracecontext,baggage**
3. export OTEL_PROPAGATORS="b3"

> Accepted values for **OTEL_PROPAGATORS** are:

| Propagator   | Desc                                    |
| ------------ | --------------------------------------- |
| tracecontext | W3C Trace Context                       |
| baggage      | W3C Baggage                             |
| b3           | B3 Single                               |
| b3multi      | B3 Multi                                |
| jaeger       | Jaeger                                  |
| xray         | AWS X-Ray                               |
| ottrace      | OT Trace                                |
| none         | No automatically configured propagator. |

#### OTEL_TRACES_EXPORTER

1. Specifies which **exporter** is used for **traces**. Depending on the implementation it may be a comma-separated list.
2. Default value - **otlp**
3. export OTEL_TRACES_EXPORTER="jaeger"

> Accepted values for are:

| Exporter | Desc                                             |
| -------- | ------------------------------------------------ |
| otlp     | OTLP                                             |
| jaeger   | export in Jaeger data model                      |
| zipkin   | Zipkin                                           |
| console  | Standard Output                                  |
| none     | No automatically configured exporter for traces. |

#### OTEL_METRICS_EXPORTER

1. Specifies which **exporter** is used for **metrics**. Depending on the implementation it may be a comma-separated list.
2. Default value - otlp
3. export OTEL_METRICS_EXPORTER="prometheus"

> Accepted values for OTEL_METRICS_EXPORTER are:

| Exporter   | Desc                                              |
| ---------- | ------------------------------------------------- |
| otlp       | OTLP                                              |
| prometheus | Prometheus                                        |
| console    | Standard Output                                   |
| none       | No automatically configured exporter for metrics. |

#### OTEL_LOGS_EXPORTER

1. Specifies which **exporter** is used for **logs**. Depending on the implementation it may be a comma-separated list.
2. Default value - **otlp**
3. export OTEL_LOGS_EXPORTER="otlp"

> Accepted values for OTEL_LOGS_EXPORTER are:

| Exporter | Desc                                           |
| -------- | ---------------------------------------------- |
| otlp     | OTLP                                           |
| console  | Standard Output                                |
| none     | No automatically configured exporter for logs. |

### OTLP Exporter

#### Endpoint Configuration

> The following environment variables let you configure an **OTLP/gRPC** or **OTLP/HTTP** endpoint for your **traces**, **metrics**, and **logs**.

##### OTEL_EXPORTER_OTLP_ENDPOINT

1. A **base endpoint URL** for **any signal type**, with an **optionally-specified port number**.

2. Helpful for when you’re sending **more than one signal** to the **same endpoint** and want one environment variable to control the endpoint.

3. Default value

   - gRPC - http://localhost:4317
   - HTTP - http://localhost:4318

4. Example

   - gRPC - export OTEL_EXPORTER_OTLP_ENDPOINT="https://my-api-endpoint:443"
   - HTTP - export OTEL_EXPORTER_OTLP_ENDPOINT="http://my-api-endpoint/"

5. For **OTLP/HTTP**, exporters in the **SDK** construct **signal-specific URLs** when this environment variable is set.

   - This means that if you’re sending **traces**, **metrics**, and **logs**, the following URLs are constructed from the example above:

     - **Traces** - "http://my-api-endpoint**/v1/traces**"

     - **Metrics** - "http://my-api-endpoint**/v1/metrics**"

     - **Logs** - "http://my-api-endpoint**/v1/logs**"

##### OTEL_EXPORTER_OTLP_TRACES_ENDPOINT

1. Endpoint URL for **trace data** only, with an **optionally-specified port number**. Typically ends with **v1/traces** when using **OTLP/HTTP**.
2. Default value
   - gRPC - "http://localhost:4317"
   - **HTTP** - "http://localhost:4318**/v1/traces**"
3. Example
   - gRPC - export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="https://my-api-endpoint:443"
   - **HTTP** - export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="http://my-api-endpoint**/v1/traces**"

##### OTEL_EXPORTER_OTLP_METRICS_ENDPOINT

1. Endpoint URL for **metric data** only, with an **optionally-specified port number**. Typically ends with **v1/metrics** when using **OTLP/HTTP**.
2. Default value
   - gRPC - "http://localhost:4317"
   - **HTTP** - "http://localhost:4318/**v1/metrics**"
3. Example
   - gRPC - export OTEL_EXPORTER_OTLP_METRICS_ENDPOINT="https://my-api-endpoint:443"
   - **HTTP** - export OTEL_EXPORTER_OTLP_METRICS_ENDPOINT="http://my-api-endpoint/**v1/metrics**"

##### OTEL_EXPORTER_OTLP_LOGS_ENDPOINT

1. Endpoint URL for **log data** only, with an **optionally-specified port number**. Typically ends with **v1/logs** when using **OTLP/HTTP**.
2. Default value
   - gRPC - "http://localhost:4317"
   - HTTP - "http://localhost:4318/**v1/logs**"
3. Example
   - gRPC - export OTEL_EXPORTER_OTLP_LOGS_ENDPOINT="https://my-api-endpoint:443"
   - **HTTP** - export OTEL_EXPORTER_OTLP_LOGS_ENDPOINT="http://my-api-endpoint/**v1/logs**"

#### Header configuration

> The following environment variables let you configure **additional headers** as a list of **key-value pairs** to add in **outgoing gRPC or HTTP requests**.

##### OTEL_EXPORTER_OTLP_HEADERS

1. A list of **headers** to apply to all **outgoing** data (**traces**, **metrics**, and **logs**).
2. Default value - N/A
3. export OTEL_EXPORTER_OTLP_HEADERS="api-key=key,other-config-value=value"

##### OTEL_EXPORTER_OTLP_TRACES_HEADERS

1. A list of **headers** to apply to all **outgoing traces**.
2. Default value - N/A
3. export OTEL_EXPORTER_OTLP_TRACES_HEADERS="api-key=key,other-config-value=value"

##### OTEL_EXPORTER_OTLP_METRICS_HEADERS

1. A list of **headers** to apply to all **outgoing metrics**.
2. Default value - N/A
3. export OTEL_EXPORTER_OTLP_METRICS_HEADERS="api-key=key,other-config-value=value"

##### OTEL_EXPORTER_OTLP_LOGS_HEADERS

1. A list of **headers** to apply to all **outgoing logs**.
2. Default value - N/A
3. export OTEL_EXPORTER_OTLP_LOGS_HEADERS="api-key=key,other-config-value=value"

#### Timeout Configuration

> configure the maximum time (in **milliseconds**) an **OTLP Exporter** will **wait** before **transmitting** the **net batch of data**.

##### OTEL_EXPORTER_OTLP_TIMEOUT

1. The timeout value for all **outgoing** data (**traces**, **metrics**, and **logs**) in **milliseconds**.
2. Default value - 10000 - 10s
3. export OTEL_EXPORTER_OTLP_TIMEOUT=500

##### OTEL_EXPORTER_OTLP_TRACES_TIMEOUT

1. The timeout value for all **outgoing traces** in **milliseconds**.
2. Default value - 10000 - 10s
3. export OTEL_EXPORTER_OTLP_TRACES_TIMEOUT=500

##### OTEL_EXPORTER_OTLP_METRICS_TIMEOUT

1. The timeout value for all **outgoing metrics** in **milliseconds**.
2. Default value - 10000 - 10s
3. export OTEL_EXPORTER_OTLP_METRICS_TIMEOUT=500

##### OTEL_EXPORTER_OTLP_LOGS_TIMEOUT

1. The timeout value for all **outgoing logs** in **milliseconds**.
2. Default value - 10000 - 10s
3. export OTEL_EXPORTER_OTLP_LOGS_TIMEOUT=500

#### Protocol configuration

> The following environment variables configure the **OTLP transport protocol** an OTLP exporter uses.

##### OTEL_EXPORTER_OTLP_PROTOCOL

1. Specifies the **OTLP transport protocol** to be used for **all telemetry data**.
2. Default value - **SDK-dependent**, but will typically be either **http/protobuf** or **grpc**.
3. export OTEL_EXPORTER_OTLP_PROTOCOL=grpc

> Valid values are:

| Transport protocol | Desc                 |
| ------------------ | -------------------- |
| grpc               | OTLP/gRPC            |
| http/protobuf      | OTLP/HTTP + protobuf |
| http/json          | OTLP/HTTP + JSON     |

##### OTEL_EXPORTER_OTLP_TRACES_PROTOCOL

> Specifies the **OTLP transport protocol** to be used for **trace data**.

##### OTEL_EXPORTER_OTLP_METRICS_PROTOCOL

> Specifies the **OTLP transport protocol** to be used for **metrics data**.

##### OTEL_EXPORTER_OTLP_LOGS_PROTOCOL

> Specifies the **OTLP transport protocol** to be used for **log data**.
