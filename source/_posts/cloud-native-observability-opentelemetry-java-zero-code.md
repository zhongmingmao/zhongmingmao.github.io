---
title: Observability - OpenTelemetry Java Zero Code
mathjax: true
date: 2025-01-21 00:06:25
cover: https://observability-1253868755.cos.ap-guangzhou.myqcloud.com/otel-java-agent.png
categories:
  - Cloud Native
  - Observability
tags:
  - Cloud Native
  - Observability
  - OpenTelemetry
---

# Java Agent

1. Zero-code instrumentation with Java uses a Java agent JAR attached to any **Java 8+** application.
2. It **dynamically injects bytecode** to **capture telemetry** from many popular **libraries** and **frameworks**.
3. It can be used to capture telemetry data at the “**edges**” of an app or service
   - such as **inbound requests**, **outbound HTTP calls**, **database calls**, and so on.

<!-- more -->

## Getting started

### Setup

1. Download **opentelemetry-javaagent.jar** from Releases of the **opentelemetry-java-instrumentation** repository
   - place the JAR in your **preferred directory**.
   - The JAR file contains the **agent** and **instrumentation libraries**.
2. Add **-javaagent**:path/to/opentelemetry-javaagent.jar and other config to your **JVM startup arguments** and launch your app:

> Directly on the **startup command**:

```
java -javaagent:path/to/opentelemetry-javaagent.jar -Dotel.service.name=your-service-name -jar myapp.jar
```

> Via the **JAVA_TOOL_OPTIONS** and other environment variables:

```shell
export JAVA_TOOL_OPTIONS="-javaagent:path/to/opentelemetry-javaagent.jar"
export OTEL_SERVICE_NAME="your-service-name"
java -jar myapp.jar
```

### Declarative configuration

1. Declarative configuration uses a **YAML file** instead of **environment variables** or **system properties**.
2. This is useful when you have **many configuration options** to set
   - or if you want to use configuration options that are **not available** as **environment variables** or **system properties**.

### Configuring the agent

The agent is **highly configurable**.

> One option is to pass **configuration properties** via the **-D** flag. In this example, a **service name** and **Zipkin exporter** for **traces** are configured:

```
java -javaagent:path/to/opentelemetry-javaagent.jar \
     -Dotel.service.name=your-service-name \
     -Dotel.traces.exporter=zipkin \
     -jar myapp.jar
```

> You can also use **environment variables** to configure the agent:

```shell
OTEL_SERVICE_NAME=your-service-name \
OTEL_TRACES_EXPORTER=zipkin \
java -javaagent:path/to/opentelemetry-javaagent.jar \
     -jar myapp.jar
```

> You can also supply a **Java properties file** and **load configuration values** from there:

```
java -javaagent:path/to/opentelemetry-javaagent.jar \
     -Dotel.javaagent.configuration-file=path/to/properties/file.properties \
     -jar myapp.jar
```

or

```shell
OTEL_JAVAAGENT_CONFIGURATION_FILE=path/to/properties/file.properties \
java -javaagent:path/to/opentelemetry-javaagent.jar \
     -jar myapp.jar
```

### Supported libraries, frameworks, application services, and JVMs

The Java agent ships with **instrumentation libraries** for **many popular components**.

### Troubleshooting

> Set to **true** to see **debug logs**. Note that these are **quite verbose**.

| Key                  | Value                |
| -------------------- | -------------------- |
| System property      | otel.javaagent.debug |
| Environment variable | OTEL_JAVAAGENT_DEBUG |

## Configuration

This page describes the **various ways** in which **configuration** can be **supplied** to the **Java agent**.

### Agent Configuration

> The agent can **consume configuration** from **one or more** of the following **sources** (ordered from **highest to lowest** priority):

1. System properties
2. Environment variables
3. Configuration file
4. Properties provided by the <u>AutoConfigurationCustomizer#addPropertiesSupplier()</u> function; using the **AutoConfigurationCustomizerProvider SPI**

### Configuring with Environment Variables

1. In certain environments, configuring settings through environment variables is often **preferred**.
2. **Any setting** that can be configured using a **system property** can also be set using an **environment variable**. 
3. Use the following steps to determine the **correct name mapping** for the desired system property:
   - Convert the system property name to **uppercase**.
   - Replace all `.` and `-` characters with `_`.
4. For example **otel.instrumentation.common.default-enabled** would convert to **OTEL_INSTRUMENTATION_COMMON_DEFAULT_ENABLED**.

### Configuration file

1. You can provide a path to an **agent configuration file** by setting the following property:
2. Description: Path to a valid **Java properties file** which contains the **agent configuration**.
3. System property: **otel.javaagent.configuration-file**
4. Environment variable: **OTEL_JAVAAGENT_CONFIGURATION_FILE**

### Extensions

1. You can **enable extensions** by setting the following property:
2. Description
   - Path to an **extension jar file** or **folder, containing jar files**.
   - If pointing to a **folder**, every jar file in that folder will be treated as **separate, independent extension**.
3. System property: **otel.javaagent.extensions**
4. Environment variable: **OTEL_JAVAAGENT_EXTENSIONS**

### Java agent logging output

1. The **agent’s logging output** can be configured by setting the following property:
2. System property: **otel.javaagent.logging**
3. Environment variable: **OTEL_JAVAAGENT_LOGGING**
4. Description: The **Java agent logging mode**. The following 3 modes are supported:

| Mode        | Desc                                                         |
| ----------- | ------------------------------------------------------------ |
| simple      | The agent will print out its logs using the **standard error stream**.<br />Only **INFO or higher** logs will be printed. This is the **default Java agent logging mode**. |
| none        | The agent will **not log anything** - not even its own version. |
| application | The agent will attempt to **redirect** its own **logs** to the **instrumented application's slf4j logger**. <br />This works the best for **simple one-jar applications** that do not use **multiple classloaders**; **Spring Boot apps** are supported as well.<br />The Java agent output logs can be further **configured** using the **instrumented application's logging configuration** (e.g. **logback.xml** or **log4j2.xml**).<br />Make sure to **test** that this mode works for your application before running it in a **production environment**. |

### SDK Configuration

1. The **SDK’s autoconfiguration module** is used for **basic configuration** of the agent. 
2. Unlike the **SDK autoconfiguration**
   - versions **2.0+** of the **Java agent** and **OpenTelemetry Spring Boot starter** use **http/protobuf** as the **default protocol**, not **grpc**.

### Enable Resource Providers that are disabled by default

> In addition to the **resource configuration** from the **SDK autoconfiguration**, you can <u>enable additional resource providers</u> that are <u>disabled by default</u>:

| System property                       | Default | Description                         |
| ------------------------------------- | ------- | ----------------------------------- |
| otel.resource.providers.aws.enabled   | false   | Enables the AWS Resource Provider   |
| otel.resource.providers.gcp.enabled   | false   | Enables the GCP Resource Provider   |
| otel.resource.providers.azure.enabled | false   | Enables the Azure Resource Provider |

## Declarative configuration

1. Declarative configuration uses a **YAML file** instead of **environment variables** or **system properties**.
2. This approach is **useful** when:
   - You have **many configuration options** to set
   - You want to use configuration options that are **not available** as **environment variables** or **system properties**
3. Just like **environment variables**, the **configuration syntax** is **language-agnostic**
   - and works for **all OpenTelemetry Java SDKs** that **support declarative configuration**, including the **OpenTelemetry Java agent**.
4. Declarative configuration is **experimental**.

### Supported languages

Java

### Supported versions

Declarative configuration is supported in the OpenTelemetry Java agent version **2.20.0 and later**.

## Suppressing specific instrumentation

### Disabling the agent entirely

1. System property: **otel.javaagent.enabled**
2. Description: Set the value to false to disable the agent entirely.

### Enable only specific instrumentation

1. You can **disable all default auto instrumentation** and **selectively re-enable individual instrumentation**.
2. This may be desirable to **reduce startup overhead** or to have **more control** of which instrumentation is applied.
3. Some instrumentation **relies on other instrumentation** to function properly.
   - When selectively enabling instrumentation, be sure to **enable** the **transitive dependencies** too.
   - This is considered **advanced usage** and is not recommended for most users.

| System property                                    | Description                                                  |
| -------------------------------------------------- | ------------------------------------------------------------ |
| otel.instrumentation.<u>common.default-enabled</u> | Set to **false** to **disable all instrumentation** in the agent. |
| otel.instrumentation.<u>[name].enabled</u>         | Set to **true** to enable **each desired instrumentation individually**. |

### Enable manual instrumentation only

1. You can **suppress all auto instrumentations** but have support for **manual instrumentation** with **@WithSpan** and **normal API interactions** by using
2. -Dotel.instrumentation.**common.default-enabled**=false
3. -Dotel.instrumentation.**opentelemetry-api.enabled**=true
4. -Dotel.instrumentation.**opentelemetry-instrumentation-annotations.enabled**=true

### Suppressing specific agent instrumentation

1. You can suppress agent instrumentation of **specific libraries**.
2. System property: otel.instrumentation.<u>[name].enabled</u>
3. Description: Set to **false** to suppress **agent instrumentation** of **specific libraries**, where [name] is the corresponding **instrumentation name**:

| Library/Framework | Instrumentation name |
| ----------------- | -------------------- |
| Apache Kafka      | kafka                |
| Spring Core       | spring-core          |

1. When using **environment variables**, dashes (`-`) should be converted to underscores (`_`). 
2. For example, to suppress traces from **akka-actor** library, set **OTEL_INSTRUMENTATION_AKKA_ACTOR_ENABLED** to false.

### Suppressing controller and/or view spans

1. Some instrumentations (e.g. **Spring Web MVC** instrumentation) produce **SpanKind.Internal** spans to capture the **controller and/or view execution**.
2. These spans can be suppressed using the configuration settings below
   - without suppressing the **entire instrumentation**
   - which would also disable the instrumentation’s capturing of **http.route** and **associated** span name on the parent **SpanKind.Server** span.

| System property                                              | Default   | Description                                 |
| ------------------------------------------------------------ | --------- | ------------------------------------------- |
| otel.instrumentation.common.experimental.**controller-telemetry**.enabled | **false** | Set to true to enable controller telemetry. |
| otel.instrumentation.common.experimental.**view-telemetry**.enabled | **false** | Set to true to enable view telemetry.       |

### Instrumentation span suppression behavior

1. **Some libraries** that this agent instruments **in turn** use **lower-level libraries**, that are also **instrumented**.
2. This would normally result in **nested spans** containing **duplicate telemetry data**. For example:
   - Spans produced by the <u>Reactor Netty HTTP client instrumentation</u> would have <u>duplicate HTTP client spans</u> produced by the <u>Netty instrumentation</u>;
   - Spans produced by the <u>Tomcat instrumentation</u> would have <u>duplicate HTTP server spans</u> produced by the <u>generic Servlet API instrumentation</u>.
3. The Java agent prevents these situations by **detecting and suppressing nested spans** that **duplicate telemetry data**.
4. The **suppression behavior** can be configured using the following configuration option:
   - System property: otel.instrumentation.experimental.**span-suppression-strategy**
   - Description: The **Java agent span suppression strategy**. The following 3 strategies are supported:

| Strategy  | Desc                                                         |
| --------- | ------------------------------------------------------------ |
| semconv   | The agent will suppress **duplicate semantic conventions**. This is the **default behavior** of the Java agent. |
| span-kind | The agent will suppress spans with the **same kind** (except **INTERNAL**). |
| none      | The agent will **not suppress anything** at all.<br />We do **not recommend** using this option for anything other than **debug purposes**, as it **generates lots of duplicate telemetry data**. |

1. For example, suppose we instrument a **database client** which **internally** uses the **Reactor Netty HTTP client**; which in turn uses **Netty**.
2. Using the **default semconv suppression strategy** would result in **2 nested CLIENT spans**:
   - **CLIENT span** with **database client semantic attributes** emitted by the **database client instrumentation**;
   - **CLIENT span** with **HTTP client semantic attributes** emitted by the **Reactor Netty instrumentation**.
   - The **Netty instrumentation** would be **suppressed**, as it **duplicates** the **Reactor Netty HTTP client instrumentation**.
3. Using the suppression strategy **span-kind** would result in **just one span**:
   - **CLIENT span** with **database client semantic attributes** emitted by the **database client instrumentation**.
   - Both **Reactor Netty** and **Netty instrumentations** would be suppressed, as they also emit **CLIENT spans**.
4. Finally, using the suppression strategy **none** would result in **3 spans**:
   - **CLIENT span** with **database client semantic attributes** emitted by the **database client instrumentation**;
   - **CLIENT span** with **HTTP client semantic attributes** emitted by the **Reactor Netty instrumentation**;
   - **CLIENT span** with **HTTP client semantic attributes** emitted by the **Netty instrumentation**.

## Annotations

1. Using **instrumentation annotations** with a **Java agent**.
2. For **most users**, the **out-of-the-box instrumentation** is **completely sufficient** and **nothing more needs to be done**.
3. Sometimes, however, users wish to **create spans** for their **own custom code** without having to change much code.
4. The **WithSpan** and **SpanAttribute** annotations support those use cases.

### Dependencies

> You’ll need to add a dependency on the **opentelemetry-instrumentation-annotations** library to use the **@WithSpan** annotation.

```java
<dependency>
    <groupId>io.opentelemetry.instrumentation</groupId>
    <artifactId>opentelemetry-instrumentation-annotations</artifactId>
    <version>2.20.1</version>
</dependency>
```

### Creating spans around methods with @WithSpan

> To **create a span** that **instruments** a **particular method**, annotate the **method** with **@WithSpan**.

```java
import io.opentelemetry.instrumentation.annotations.WithSpan;

public class MyClass {
  @WithSpan
  public void myMethod() {
      <...>
  }
}
```

1. Each time the application **invokes** the **annotated method**, it **creates a span** that denotes its **duration** and provides any thrown **exceptions**.
2. By default, the **span name** will be `<className>.<methodName>`, unless a **name** is provided through the **value annotation parameter**.
3. If the **return type** of the **method** annotated by **@WithSpan** is one of the **future-** or **promise-like** types listed below then the **span will not be ended until the future completes**
   - java.util.concurrent.CompletableFuture
   - java.util.concurrent.CompletionStage
   - com.google.common.util.concurrent.ListenableFuture
   - org.reactivestreams.Publisher
   - reactor.core.publisher.Mono
   - reactor.core.publisher.Flux
   - io.reactivex.Completable
   - io.reactivex.Maybe
   - io.reactivex.Single
   - io.reactivex.Observable
   - io.reactivex.Flowable
   - io.reactivex.parallel.ParallelFlowable

#### Parameters

> The **@WithSpan** attribute supports the following **optional parameters** to allow **customization** of **spans**:

| name           | type            | default  | description                                                  |
| -------------- | --------------- | -------- | ------------------------------------------------------------ |
| value          | String          | ""       | The **span name**.<br />If not specified, the default `<className>.<methodName>` is used. |
| kind           | SpanKind (enum) | INTERNAL | The kind of span.                                            |
| inheritContext | boolean         | true     | Since **2.14.0**.<br />Controls whether or not the **new span** will be **parented** in the existing (**current**) context.<br />If **false**, a **new context** is **created**. |

> Example parameter usage:

```java
@WithSpan(kind = SpanKind.CLIENT, inheritContext = false, value = "my span name")
public void myMethod() {
    <...>
}

@WithSpan("my span name")
public void myOtherMethod() {
    <...>
}
```

### Adding attributes to the span with @SpanAttribute

1. When a **span** is **created** for an **annotated method**
   - the **values of the arguments** to the **method** invocation can be **automatically added as attributes** to the **created span**.
2. Simply **annotate the method parameters** with the **@SpanAttribute** annotation:

```java
import io.opentelemetry.instrumentation.annotations.SpanAttribute;
import io.opentelemetry.instrumentation.annotations.WithSpan;

public class MyClass {

    @WithSpan
    public void myMethod(@SpanAttribute("parameter1") String parameter1,
        @SpanAttribute("parameter2") long parameter2) {
        <...>
    }
}
```

Unless **specified** as an **argument** to the **annotation**, the **attribute name** will be **derived from** the **formal parameter names** if they are compiled into the **.class** files by passing the **-parameters** option to the **javac** compiler.

### Suppressing @WithSpan instrumentation

1. Suppressing @WithSpan is useful
   - if you have code that is **over-instrumented** using @WithSpan and you want to suppress some of them **without modifying the code**.
2. System property: otel.instrumentation.**opentelemetry-instrumentation-annotations.exclude-methods**
3. Description: Suppress **@WithSpan instrumentation** for **specific methods**.
   - Format is <u>my.package.MyClass1[method1,method2];my.package.MyClass2[method3]</u>.

### Creating spans around methods with otel.instrumentation.methods.include

1. In cases where you are **unable to modify the code**, you can still configure the **Java agent** to **capture spans** around **specific methods**.
2. System property: otel.instrumentation.**methods.include**
3. Description: **Add instrumentation** for **specific methods** in lieu of **@WithSpan**.
   - Format is <u>my.package.MyClass1[method1,method2];my.package.MyClass2[method3]</u>.
4. If a method is **overloaded** (appears more than once on the **same class** with the **same name** but **different parameters**)
   - **all versions** of the method will be **instrumented**.

## Extending instrumentations with the API

Use the **OpenTelemetry API** in **combination** with the **Java agent** to **extend** the **automatically generated telemetry** with **custom spans and metrics**

### Introduction

1. In addition to the **out-of-the-box instrumentation**
   - you can extend the **Java agent** with **custom manual instrumentation** using the **OpenTelemetry API**
2. This allows you to **create spans and metrics** for your own code without doing too many code changes.

### Dependencies

> Add a dependency on the **opentelemetry-api** library.

```xml
<dependencies>
  <dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-api</artifactId>
    <version>1.54.1</version>
  </dependency>
</dependencies>
```

### OpenTelemetry

1. The Java agent is a special case where **GlobalOpenTelemetry** is set by the **agent**.
2. Simply call **GlobalOpenTelemetry.get()** to access the **OpenTelemetry** instance.

### Span

> For the **most common use cases**, use the **@WithSpan** annotation instead of **manual instrumentation**

```java
import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.trace.Tracer;

Tracer tracer = GlobalOpenTelemetry.getTracer("application");
```

Use the **Tracer** to create a **span** as explained in the Span section.

### Meter

```java
import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.metrics.Meter;

Meter meter = GlobalOpenTelemetry.getMeter("application");
```

Use the **Meter** to create a **counter**, **gauge** or **histogram** as explained in the Meter section.

## Instrumentation configuration

This page describes **common settings** that apply to **multiple instrumentations** at once.

### Peer service name

1. The peer service name is the name of a **remote service** to which a **connection** is made.
2. It corresponds to **service.name** in the **resource** for the **local service**.
3. System property: otel.instrumentation.common.**peer-service-mapping**
4. Description: Used to specify a **mapping** from **host names or IP addresses** to **peer services**, as a **comma-separated list** pairs
   - The **peer service** is **added** as an **attribute** to a **span** whose host or IP address **match** the **mapping**.

> For example, if set to the following:

```
1.2.3.4=cats-service,dogs-abcdef123.serverlessapis.com=dogs-api
```

1. Then, requests to **1.2.3.4** will have a **peer.service attribute** of **cats-service**
2. and requests to **dogs-abcdef123.serverlessapis.com** will have an attribute of **dogs-api**.

> Since Java agent version **1.31.0**, it is possible to provide a **port** and a **path** to define a **peer.service**. For example, if set to the following:

```
1.2.3.4:443=cats-service,dogs-abcdef123.serverlessapis.com:80/api=dogs-api
```

1. Then, requests to **1.2.3.4** will have **no override for peer.service attribute**, while **1.2.3.4:443** will have **peer.service** of **cats-service**
2. and requests to **dogs-abcdef123.serverlessapis.com:80/api/v1** will have an attribute of dogs-api.

### DB statement sanitization

1. The agent **sanitizes all database queries/statements** before setting the **db.statement** semantic attribute.
2. All values (strings, numbers) in the **query string** are replaced with a question mark (**?**).
3. Note: **JDBC bind parameters** are **not captured** in **db.statement**.
4. Examples:
   - SQL query `SELECT a from b where password="secret"` will appear as `SELECT a from b where password=?` in the **exported span**;
   - Redis command `HSET map password "secret"` will appear as `HSET map password ?` in the **exported span**.
5. This behavior is **turned on by default** for **all database instrumentations**. Use the following property to disable it:

| System property                                              | Default | Description                            |
| ------------------------------------------------------------ | ------- | -------------------------------------- |
| otel.instrumentation.common.**db-statement-sanitizer**.enabled | true    | Enables the DB statement sanitization. |

### Capturing consumer message receive telemetry in messaging instrumentations

1. You can configure the agent to **capture** the **consumer message receive telemetry** in **messaging instrumentation**.
2. Note that this will cause the **consumer side** to **start a new trace**, with only a **span link** connecting it to the **producer trace**.
3. The property/environment variable names listed in the table are still **experimental**, and thus are subject to **change**.

| System property                                              | Default | Description                                     |
| ------------------------------------------------------------ | ------- | ----------------------------------------------- |
| otel.instrumentation.messaging.experimental.receive-telemetry.enabled | false   | Enables the consumer message receive telemetry. |

### Capturing enduser attributes

1. You can configure the agent to capture **general identity attributes** (enduser.id, enduser.role, enduser.scope)
   - from **instrumentation libraries** like <u>JavaEE/JakartaEE Servlet</u> and <u>Spring Security</u>.
2. Given the **sensitive nature** of the **data involved**, this feature is **turned off by default** while allowing **selective activation** for **particular attributes**.
   - You must **carefully evaluate** each **attribute’s privacy implications** before enabling the collection of the data.

| System property                                   | Default | Description                                                  |
| ------------------------------------------------- | ------- | ------------------------------------------------------------ |
| otel.instrumentation.common.enduser.id.enabled    | false   | Determines whether to capture **enduser.id** semantic attribute. |
| otel.instrumentation.common.enduser.role.enabled  | false   | Determines whether to capture **enduser.role** semantic attribute. |
| otel.instrumentation.common.enduser.scope.enabled | false   | Determines whether to capture **enduser.scope** semantic attribute. |

#### Spring Security

1. For users of Spring Security who use **custom granted authority prefixes**
2. you can use the following properties to **strip those prefixes** from the **enduser.*** attribute values to **better represent** the **actual role** and **scope** names:

| System property                                              | Default | Description                                                  |
| ------------------------------------------------------------ | ------- | ------------------------------------------------------------ |
| otel.instrumentation.spring-security.enduser.role.granted-authority-prefix | ROLE_   | Prefix of **granted authorities** identifying **roles** to capture in the **enduser.role** semantic attribute. |
| otel.instrumentation.spring-security.enduser.scope.granted-authority-prefix | SCOPE_  | Prefix of **granted authorities** identifying **scopes** to capture in the **enduser.scopes** semantic attribute. |

### HTTP instrumentation configuration

#### Capturing HTTP request and response headers

You can configure the **agent** to capture **predefined HTTP headers** as **span attributes**, according to the semantic convention.

1. otel.instrumentation.http.**client.capture-request-headers**
   - A **comma-separated** list of **HTTP header names**.
   - **HTTP client instrumentations** will capture **HTTP request header values** for all configured header names.
2. otel.instrumentation.http.**client.capture-response-headers**
   - A **comma-separated** list of **HTTP header names**.
   - **HTTP client instrumentations** will capture **HTTP response header values** for all configured header names.
3. otel.instrumentation.http.**server.capture-request-headers**
   - A **comma-separated** list of **HTTP header names**.
   - **HTTP server instrumentations** will capture **HTTP request header values** for all configured header names.
4. otel.instrumentation.http.**server.capture-response-headers**
   - A **comma-separated** list of **HTTP header names**.
   - **HTTP server instrumentations** will capture **HTTP response header values** for all configured header names.

> These configuration options are supported by all **HTTP client and server instrumentations**.

The **property/environment variable names** listed in the table are still **experimental**, and thus are subject to **change**.

#### Capturing servlet request parameters

You can configure the agent to capture **predefined HTTP request parameters** as **span attributes** for requests that are **handled** by the **Servlet API**.

1. otel.instrumentation.**servlet.experimental.capture-request-parameters**
2. A **comma-separated list** of **request parameter names**.

The **property/environment variable names** listed in the table are still **experimental**, and thus are subject to **change**.

#### Configuring known HTTP methods

Configures the **instrumentation** to **recognize** an **alternative set** of **HTTP request methods**. All other methods will be treated as **_OTHER**.

1. System property: otel.instrumentation.**http.known-methods**
2. Default: **CONNECT,DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT,TRACE**
3. Description: A **comma-separated list** of **known HTTP methods**.

#### Enabling experimental HTTP telemetry

You can configure the agent to capture **additional experimental HTTP telemetry data**.

| System property                                              | Default | Description                                         |
| ------------------------------------------------------------ | ------- | --------------------------------------------------- |
| otel.instrumentation.**http.client.emit-experimental-telemetry** | false   | Enables the **experimental HTTP client telemetry**. |
| otel.instrumentation.**http.server.emit-experimental-telemetry** | false   | Enables the **experimental HTTP server telemetry**. |

For **client and server spans**, the following **attributes** are added:

- **http.request.body.size** and **http.response.body.size**: The size of the request and response bodies, respectively.

For **client metrics**, the following metrics are created:

- <u>http.client.request.body.size</u>
- <u>http.client.response.body.size</u>

For **server metrics**, the following metrics are created:

- http.server.active_requests
- http.server.request.body.size
- http.server.response.body.size

## Application server configuration

1. Learn how to **define agent paths** for **Java application servers**
2. When **instrumenting an app** that **runs on a Java application server** with a **Java agent**
   - You must add the **javaagent path** to the **JVM arguments**.
   - The way to do this **differs from server to server**.

## Extensions

> Extensions **add capabilities to the agent** without having to create a **separate distribution**.

### Introduction

1. Extensions are designed to **override** or **customize** the **instrumentation** provided by the **upstream agent**

   - without having to **create a new OpenTelemetry distribution** or **alter the agent code** in any way.
2. Consider an **instrumented database client** that **creates a span per database call**

   - and **extracts data from the database connection** to **provide span attributes**.
3. The following are **sample use cases** for that **scenario** that can be **solved** by **using extensions**:

   - “I don’t want this span at all”:
     - Create an extension to **disable selected instrumentation** by providing new default settings.
   - “I want to edit some attributes that don’t depend on any db connection instance”:
     - Create an extension that provide a custom **SpanProcessor**.
   - “I want to edit some attributes and their values depend on a specific db connection instance”:
     - Create an extension with new instrumentation which **injects its own advice** into the **same method** as the original one.
     - You can use the **order** method to ensure it **runs after** the **original instrumentation** and **augment the current span with new information**.
   - “I want to remove some attributes”:
     - Create an extension with a **custom exporter** or use the **attribute filtering functionality** in the **OpenTelemetry Collector**.
   - “I don’t like the OTel spans. I want to modify them and their lifecycle”:
     - Create an extension that **disables existing instrumentation** and **replace it** with new one that **injects Advice** into the same (or a better) method as the original instrumentation.
     - You can write your **Advice** for this and use the **existing Tracer directly** or **extend** it.
     - As you have your own **Advice**, you can control which **Tracer** you use.


### Extension examples

#### Introduction

Extensions add new **features** and **capabilities** to the **agent** without having to **create a separate distribution**

#### Add extensions

> To add the extension to the **instrumentation agent**:

1. Copy the jar file to a host that is running an application to which you've attached the OpenTelemetry Java instrumentation.
2. Modify the **startup command** to add the **full path** to the **extension file**. For example:

```
java -javaagent:path/to/opentelemetry-javaagent.jar \
     -Dotel.javaagent.extensions=build/libs/opentelemetry-java-instrumentation-extension-demo-1.0-all.jar
     -jar myapp.jar
```

To load **multiple extensions**, you can specify a **comma-separated list** of **extension jars** or **directories** (that contain extension jars) for the **otel.javaagent.extensions** value.

#### Embed extensions in the OpenTelemetry Agent

1. To simplify deployment, you can **embed extensions into the OpenTelemetry Java Agent** to produce a **single jar file**.
2. With an **integrated extension**, you no longer need the **-Dotel.javaagent.extensions** command line option.

#### Extensions examples

1. **ConfigurablePropagatorProvider** and **AutoConfigurationCustomizer** implementations and custom instrumentation (**InstrumentationModule**)
   - need the **correct SPI** (through **@AutoService**) in order to be **loaded** by the agent.
2. Once a **ConfigurablePropagatorProvider** is added, it can be **referenced by name** in the **OTEL_PROPAGATORS** setting.
3. **AutoConfigurationCustomizer** and instrumentation will be **applied automatically**.
4. To apply the **other extension classes** to the **Java Agent**, include an **AutoConfigurationCustomizer** in your extension.

## Performance

1. The OpenTelemetry Java agent instruments your application by **running inside** the **same Java Virtual Machine (JVM)**.
2. Like any other software agent, the Java agent requires **system resources** like **CPU**, **memory**, and **network bandwidth**.
3. The **use** of **resources** by the agent is called **agent overhead** or **performance overhead**.
4. The OpenTelemetry Java agent has **minimal impact** on **system performance** when **instrumenting JVM applications**
   - although the final agent overhead depends on **multiple factors**.
5. Some factors that might **increase agent overhead** are **environmental**
   - such as the <u>physical machine architecture</u>, <u>CPU frequency</u>, <u>amount and speed of memory</u>, <u>system temperature</u>, and <u>resource contention</u>.
6. Other factors include **virtualization** and **containerization**
   - the **operating system** and **its libraries**, the <u>JVM version and vendor</u>, <u>JVM settings</u>
   - the <u>algorithmic design of the software</u> being monitored, and <u>software dependencies</u>.
7. Due to the <u>complexity of modern software</u> and the <u>broad diversity in deployment scenarios</u>
   - it is **impossible** to come up with a **single agent overhead estimate**.
   - To find the overhead of any instrumentation agent in a given deployment, you have to **conduct experiments** and **collect measurements** directly.
   - Therefore, treat all statements about performance as **general information and guidelines** that are subject to **evaluation** in a **specific system**.
8. The following sections describe the **minimum requirements** of the **OpenTelemetry Java agent**
   - as well as **potential constraints impacting performance**, and guidelines to **optimize and troubleshoot the performance** of the agent.

### Guidelines to reduce agent overhead

#### Configure trace sampling

1. The **volume of spans processed** by the **instrumentation** might **impact agent overhead**.
2. You can configure **trace sampling** to adjust the **span volume** and **reduce resource usage**.

#### Turn off specific instrumentations

1. You can further reduce agent overhead by **turning off instrumentations** that **aren’t needed** or are **producing too many spans**.
2. To turn off an instrumentation
   - use `-Dotel.instrumentation.<name>.enabled=false` or the `OTEL_INSTRUMENTATION_<NAME>_ENABLED` environment variable
   - where `<name>` is the name of the instrumentation.
3. For example, the following option turns off the JDBC instrumentation: **-Dotel.instrumentation.jdbc.enabled=false**

#### Allocate more memory for the application

1. Increasing the **maximum heap size** of the JVM using the `-Xmx<size>` option might help in **alleviating** agent overhead issues
2. as instrumentations can generate a **large number** of **short-lived objects** in **memory**.

#### Reduce manual instrumentation to what you need

1. **Too much manual instrumentation** might **introduce inefficiencies** that **increase agent overhead**.
2. For example, using **@WithSpan** on **every method** results in a **high span volume**
   - which in turn **increases noise** in the data and consumes **more system resources**.

#### Provision adequate resources

1. Make sure to **provision enough resources** for your **instrumentation** and for the **Collector**.
2. The amount of resources such as **memory** or **disk** depend on your **application architecture** and needs.
3. For example, a common setup is to run the **instrumented application** on the **same host** as the **OpenTelemetry Collector**.
   - In that case, consider **rightsizing the resources** for the Collector and **optimize its settings**.

### Constraints impacting the performance of the Java agent

1. In general, the **more telemetry** you collect from your application, the **greater the impact** on agent overhead.
2. For example, tracing methods that **aren’t relevant** to your application can still **produce considerable agent overhead**
   - because **tracing such methods** is **computationally more expensive** than **running the method itself**.
3. Similarly, **high cardinality tags** in **metrics** might **increase memory usage**.
   - **Debug logging**, if turned on, also **increases write operations to disk** and **memory usage**.
4. Some instrumentations, for example **JDBC** or **Redis**, produce **high span volumes** that **increase agent overhead**.
5. **Experimental features** of the Java agent might **increase agent overhead** due to the experimental focus on **functionality over performance**.
   - **Stable features** are **safer** in terms of **agent overhead**.

### Troubleshooting agent overhead issues

When troubleshooting agent overhead issues, do the following:

- Check **minimum requirements**.
- Use the **latest compatible version** of the **Java agent**.
- Use the **latest compatible version** of your **JVM**.

Consider taking the following actions to **decrease agent overhead**:

- If your application is **approaching memory limits**, consider giving it **more memory**.
- If your application is **using all the CPU**, you might want to **scale it horizontally**.
- Try **turning off or tuning metrics**.
- Tune **trace sampling** settings to **reduce span volume**.
- **Turn off specific instrumentations**.
- Review **manual instrumentation** for **unnecessary span generation**.

# Spring Boot starter

You can use two options to **instrument Spring Boot applications** with **OpenTelemetry**.

1. The **default choice** for instrumenting Spring Boot applications is the **OpenTelemetry Java agent** with **bytecode instrumentation**:
   - **More out of the box instrumentation** than the **OpenTelemetry starter**
2. The **OpenTelemetry Spring Boot starter** can help you with:
   - **Spring Boot Native image applications** for which the OpenTelemetry Java agent **does not work**
   - **Startup overhead** of the OpenTelemetry Java agent **exceeding your requirements**
   - A **Java monitoring agent** already used because the OpenTelemetry Java agent **might not work with the other agent**
   - **Spring Boot configuration files** (application.properties, application.yml) to **configure the OpenTelemetry**
     - **Spring Boot starter** which doesn’t work with the **OpenTelemetry Java agent**

## Getting started

### Compatibility

The OpenTelemetry Spring Boot starter works with **Spring Boot 2.6+** and **3.1+**, and **Spring Boot native image applications**.

### Dependency management

1. A Bill of Material (**BOM**) ensures that **versions** of **dependencies** (including **transitive** ones) are **aligned**.
2. To ensure **version alignment** across **all OpenTelemetry dependencies**
   - you must import the **opentelemetry-instrumentation-bom** BOM when using the **OpenTelemetry starter**.
3. When using **Maven**, import the OpenTelemetry BOMs **before any other BOMs in your project**.
   - For example, if you import the **spring-boot-dependencies BOM**, you have to declare it **after** the **OpenTelemetry BOMs**.
4. **Gradle** selects the **latest version** of a dependency when **multiple BOMs**, so the order of **BOMs** is **not important**.

> The following example shows how to import the **OpenTelemetry BOMs** using Maven:

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>io.opentelemetry.instrumentation</groupId>
            <artifactId>opentelemetry-instrumentation-bom</artifactId>
            <version>2.20.1</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

### OpenTelemetry Starter dependency

Add the dependency given below to enable the OpenTelemetry starter.

> The OpenTelemetry starter uses **OpenTelemetry Spring Boot autoconfiguration**.

```java
<dependency>
    <groupId>io.opentelemetry.instrumentation</groupId>
    <artifactId>opentelemetry-spring-boot-starter</artifactId>
</dependency>
```

## Extending instrumentations with the API

Use the **OpenTelemetry API** in **combination** with the **Spring Boot starter** to **extend** the <u>automatically generated telemetry</u> with <u>custom spans and metrics</u>

### Introduction

1. In addition to the **out-of-the-box instrumentation**
   - you can **extend** the **Spring starter** with **custom manual instrumentation** using the **OpenTelemetry API**.
2. This allows you to **create spans and metrics** for your own code without doing too many code changes.

### OpenTelemetry

The Spring Boot starter is a special case where **OpenTelemetry** is available as a **Spring bean**. Simply **inject** OpenTelemetry into your **Spring components**.

### Span

> For the **most common use cases**, use the **@WithSpan** annotation instead of **manual instrumentation**.

```java
package otel;

import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.trace.Tracer;
import org.springframework.stereotype.Controller;

@Controller
public class MyController {

  private final Tracer tracer;

  public MyController(OpenTelemetry openTelemetry) {
    this.tracer = openTelemetry.getTracer("application");
  }
}
```

Use the **Tracer** to **create a span** as explained in the Span section.

### Meter

```java
package otel;

import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.metrics.Meter;
import org.springframework.stereotype.Controller;

@Controller
public class MyController {

  private final Meter meter;

  public MyController(OpenTelemetry openTelemetry) {
    this.meter = openTelemetry.getMeter("application");
  }
}
```

Use the **Meter** to create a **counter**, **gauge** or **histogram** as explained in the Meter section.

## SDK configuration

This spring starter supports **configuration metadata**, which means that you can see and **autocomplete** all **available properties** in your **IDE**.

### General configuration

1. The OpenTelemetry Starter supports all the **SDK Autoconfiguration** (since **2.2.0**).
2. You can update the configuration with **properties** in the **application.properties** or the **application.yaml** file, or with **environment variables**.

> **application.properties** example:

```properties
otel.propagators=tracecontext,b3
otel.resource.attributes.deployment.environment=dev
otel.resource.attributes.service.name=cart
otel.resource.attributes.service.namespace=shop
```

> **application.yaml** example:

```yaml
otel:
  propagators:
    - tracecontext
    - b3
  resource:
    attributes:
      deployment.environment: dev
      service:
        name: cart
        namespace: shop
```

> **Environment variables** example:

```shell
export OTEL_PROPAGATORS="tracecontext,b3"
export OTEL_RESOURCE_ATTRIBUTES="deployment.environment=dev,service.name=cart,service.namespace=shop"
```

### Overriding Resource Attributes

1. As usual in Spring Boot, you can **override properties** in the <u>application.properties</u> and <u>application.yaml</u> files with **environment variables**.
2. For example, you can set or override the **deployment.environment** resource attribute (**not changing** <u>service.name</u> or <u>service.namespace</u>)
   - by setting the standard **OTEL_RESOURCE_ATTRIBUTES** environment variable:

```shell
export OTEL_RESOURCE_ATTRIBUTES="deployment.environment=prod"
```

You can use the **OTEL_RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT** environment variable to **set** or **override** a **single resource attribute**:

```shell
export OTEL_RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT="prod"
```

1. The second option supports **SpEL** expressions.
2. Note that **DEPLOYMENT_ENVIRONMENT** gets converted to **deployment.environment** by Spring Boot’s **Relaxed Binding**

### Disable the OpenTelemetry Starter

1. System property: **otel.sdk.disabled**
2. Description: Set the value to true to disable the starter, e.g. for testing purposes.

### Programmatic configuration

1. You can use the **AutoConfigurationCustomizerProvider** for programmatic configuration.
2. Programmatic configuration is **recommended** for **advanced use cases**, which are **not configurable** using **properties**.

#### Exclude actuator endpoints from tracing

> As an example, you can customize the **sampler** to **exclude health check endpoints** from **tracing**:

```xml
<dependencies>
  <dependency>
    <groupId>io.opentelemetry.contrib</groupId>
    <artifactId>opentelemetry-samplers</artifactId>
    <version>1.33.0-alpha</version>
  </dependency>
</dependencies>
```

```java
package otel;

import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.contrib.sampler.RuleBasedRoutingSampler;
import io.opentelemetry.sdk.autoconfigure.spi.AutoConfigurationCustomizerProvider;
import io.opentelemetry.semconv.UrlAttributes;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FilterPaths {

  @Bean
  public AutoConfigurationCustomizerProvider otelCustomizer() {
    return p ->
        p.addSamplerCustomizer(
            (fallback, config) ->
                RuleBasedRoutingSampler.builder(SpanKind.SERVER, fallback)
                    .drop(UrlAttributes.URL_PATH, "^/actuator")
                    .build());
  }
}
```

#### Configure the exporter programmatically

1. You can also configure **OTLP exporters** programmatically.
2. This configuration **replaces** the **default OTLP exporter** and adds a **custom header** to the requests.

```java
package otel;

import io.opentelemetry.exporter.otlp.http.trace.OtlpHttpSpanExporter;
import io.opentelemetry.sdk.autoconfigure.spi.AutoConfigurationCustomizerProvider;
import java.util.Collections;
import java.util.Map;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CustomAuth {

  @Bean
  public AutoConfigurationCustomizerProvider otelCustomizer() {
    return p ->
        p.addSpanExporterCustomizer(
            (exporter, config) -> {
              if (exporter instanceof OtlpHttpSpanExporter) {
                return ((OtlpHttpSpanExporter) exporter)
                    .toBuilder().setHeaders(this::headers).build();
              }
              return exporter;
            });
  }

  private Map<String, String> headers() {
    return Collections.singletonMap("Authorization", "Bearer " + refreshToken());
  }

  private String refreshToken() {
    // e.g. read the token from a kubernetes secret
    return "token";
  }
}
```

### Resource Providers

The **OpenTelemetry Starter** includes the **same resource providers** as the **Java agent**:

- **Common** resource providers - <u>Container / Host / OS / Process / Java Runtime / Platforms</u>
- Resource providers that are **disabled** by default

In addition, the **OpenTelemetry Starter** includes the following **Spring Boot specific resource providers**:

#### Distribution Resource Provider

> FQN: **io.opentelemetry.instrumentation.spring.autoconfigure.resources.DistroVersionResourceProvider**

| Attribute                | Value                             |
| ------------------------ | --------------------------------- |
| telemetry.distro.name    | opentelemetry-spring-boot-starter |
| telemetry.distro.version | version of the starter            |

#### Spring Resource Provider

> FQN: **io.opentelemetry.instrumentation.spring.autoconfigure.resources.SpringResourceProvider**

| Attribute       | Value                                                        |
| --------------- | ------------------------------------------------------------ |
| service.name    | **spring.application.name** or **build.name** from **build-info.properties** |
| service.version | **build.version** from **build-info.properties**             |

### Service name

Using these resource providers, the service name is determined by the following **precedence rules**, in accordance with the **OpenTelemetry specification**:

1. **otel.service.name** spring property or **OTEL_SERVICE_NAME** environment variable (**highest** precedence)
2. **service.name** in **otel.resource.attributes** system/spring property or **OTEL_RESOURCE_ATTRIBUTES** environment variable
3. **spring.application.name** spring property
4. **build-info.properties**
5. **Implementation-Title** from META-INF/MANIFEST.MF
6. The **default value** is **unknown_service:java** (**lowest** precedence)

> Use the following snippet in your pom.xml file to **generate** the **build-info.properties** file:

```xml
<build>
    <finalName>${project.artifactId}</finalName>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
            <executions>
                <execution>
                    <goals>
                        <goal>build-info</goal>
                        <goal>repackage</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

## Out of the box instrumentation

Out of the box instrumentation is available for several frameworks:

| Feature               | Property                                      | Default Value |
| --------------------- | --------------------------------------------- | ------------- |
| JDBC                  | otel.instrumentation.jdbc.enabled             | true          |
| Logback               | otel.instrumentation.logback-appender.enabled | true          |
| Logback MDC           | otel.instrumentation.logback-mdc.enabled      | true          |
| Spring Web            | otel.instrumentation.spring-web.enabled       | true          |
| Spring Web MVC        | otel.instrumentation.spring-webmvc.enabled    | true          |
| Spring WebFlux        | otel.instrumentation.spring-webflux.enabled   | true          |
| Kafka                 | otel.instrumentation.kafka.enabled            | true          |
| MongoDB               | otel.instrumentation.mongo.enabled            | true          |
| Micrometer            | otel.instrumentation.micrometer.enabled       | false         |
| R2DBC (reactive JDBC) | otel.instrumentation.r2dbc.enabled            | true          |

### Turn on instrumentations selectively

1. To use only specific instrumentations
   - **turn off all the instrumentations first** by setting the **otel.instrumentation.common.default-enabled** property to **false**.
   - Then, turn on instrumentations **one by one**.
2. For example, if you want to only enable the JDBC instrumentation, set **otel.instrumentation.jdbc.enabled** to true.

### Common instrumentation configuration

**Common properties** for **all database instrumentations**:

| System property                                              | Type    | Default | Description                            |
| ------------------------------------------------------------ | ------- | ------- | -------------------------------------- |
| otel.instrumentation.common.**db-statement-sanitizer**.enabled | Boolean | true    | Enables the DB statement sanitization. |

### JDBC Instrumentation

| System property                                           | Type    | Default | Description                            |
| --------------------------------------------------------- | ------- | ------- | -------------------------------------- |
| otel.instrumentation.jdbc.**statement-sanitizer**.enabled | Boolean | true    | Enables the DB statement sanitization. |

### Logback

You can enable **experimental features** with **system properties** to **capture attributes** :

| System property                                              | Type    | Default | Description                                                  |
| ------------------------------------------------------------ | ------- | ------- | ------------------------------------------------------------ |
| otel.instrumentation.logback-appender.experimental-**log-attributes** | Boolean | false   | Enable the capture of experimental log attributes **thread.name** and **thread.id**. |
| otel.instrumentation.logback-appender.experimental.**capture-code-attributes** | Boolean | false   | Enable the capture of **source code attributes**.<br />Note that capturing source code attributes at logging sites might add a **performance overhead**. |
| otel.instrumentation.logback-appender.experimental.**capture-marker-attribute** | Boolean | false   | Enable the capture of **Logback markers** as attributes.     |
| otel.instrumentation.logback-appender.experimental.**capture-key-value-pair-attributes** | Boolean | false   | Enable the capture of **Logback key value pairs** as attributes. |
| otel.instrumentation.logback-appender.experimental.**capture-logger-context-attributes** | Boolean | false   | Enable the capture of **Logback logger context properties** as attributes. |
| otel.instrumentation.logback-appender.experimental.**capture-mdc-attributes** | String  |         | Comma separated list of **MDC attributes** to capture.<br />Use the **wildcard** character `*` to capture **all attributes**. |

Alternatively, you can enable these features by adding the **OpenTelemetry Logback appender** in your **logback.xml** or **logback-spring.xml** file:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <appender name="console" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>
                %d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n
            </pattern>
        </encoder>
    </appender>
    <appender name="OpenTelemetry"
              class="io.opentelemetry.instrumentation.logback.appender.v1_0.OpenTelemetryAppender">
        <captureExperimentalAttributes>false</captureExperimentalAttributes>
        <captureCodeAttributes>true</captureCodeAttributes>
        <captureMarkerAttribute>true</captureMarkerAttribute>
        <captureKeyValuePairAttributes>true</captureKeyValuePairAttributes>
        <captureLoggerContext>true</captureLoggerContext>
        <captureMdcAttributes>*</captureMdcAttributes>
    </appender>
    <root level="INFO">
        <appender-ref ref="console"/>
        <appender-ref ref="OpenTelemetry"/>
    </root>
</configuration>
```

### Spring Web Autoconfiguration

1. Provides **autoconfiguration** for the **RestTemplate trace interceptor** defined in **opentelemetry-spring-web-3.1**. 
2. This autoconfiguration instruments **all requests** sent using **Spring RestTemplate beans** by applying a RestTemplate **bean post processor**.
3. This feature is supported for **spring web versions 3.1+**.

> The following ways of creating a **RestTemplate** are **supported**:

```java
package otel;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestTemplateConfig {

  @Bean
  public RestTemplate restTemplate() {
    return new RestTemplate();
  }
}
```

```java
package otel;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

@RestController
public class RestTemplateController {

  private final RestTemplate restTemplate;

  public RestTemplateController(RestTemplateBuilder restTemplateBuilder) {
    restTemplate = restTemplateBuilder.rootUri("http://localhost:8080").build();
  }
}
```

> The following ways of creating a **RestClient** are **supported**:

```java
package otel;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

  @Bean
  public RestClient restClient() {
    return RestClient.create();
  }
}
```

```java
package otel;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

@RestController
public class RestClientController {

  private final RestClient restClient;

  public RestClientController(RestClient.Builder restClientBuilder) {
    restClient = restClientBuilder.baseUrl("http://localhost:8080").build();
  }
}
```

> As it’s possible with the **Java agent**, you can configure the capture of the following entities:

- HTTP request and response headers
- Known HTTP methods
- Experimental HTTP telemetry

### Spring Web MVC Autoconfiguration

1. This feature autoconfigures instrumentation for **Spring WebMVC controllers**
   - by adding a **telemetry** producing **servlet Filter bean** to the **application context**.
2. The filter **decorates** the **request execution** with a **server span**, **propagating** the **incoming tracing context** if received in the HTTP request.

> As it’s possible with the **Java agent**, you can configure the capture of the following entities:

- HTTP request and response headers
- Known HTTP methods
- Experimental HTTP telemetry

### Spring WebFlux Autoconfiguration

1. Provides **autoconfigurations** for the **OpenTelemetry WebClient ExchangeFilter** defined in **opentelemetry-spring-webflux-5.3**
2. This autoconfiguration instruments **all outgoing HTTP requests** sent using **Spring’s WebClient and WebClient Builder beans**
   - by applying a **bean post processor**.

> The following ways of creating a **WebClient** are **supported**:

```java
package otel;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

  @Bean
  public WebClient webClient() {
    return WebClient.create();
  }
}
```

```
package otel;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;

@RestController
public class WebClientController {

  private final WebClient webClient;

  public WebClientController(WebClient.Builder webClientBuilder) {
    webClient = webClientBuilder.baseUrl("http://localhost:8080").build();
  }
}
```

### Kafka Instrumentation

Provides **autoconfiguration** for the **Kafka client instrumentation**.

| System property                                         | Type    | Default | Description                                          |
| ------------------------------------------------------- | ------- | ------- | ---------------------------------------------------- |
| otel.instrumentation.kafka.experimental-span-attributes | Boolean | false   | Enables the capture of experimental span attributes. |

### Micrometer Instrumentation

Provides **autoconfiguration** for the **Micrometer** to OpenTelemetry **bridge**.

### MongoDB Instrumentation

Provides **autoconfiguration** for the **MongoDB client instrumentation**.

| System property                                        | Type    | Default | Description                            |
| ------------------------------------------------------ | ------- | ------- | -------------------------------------- |
| otel.instrumentation.mongo.statement-sanitizer.enabled | Boolean | true    | Enables the DB statement sanitization. |

### R2DBC Instrumentation

Provides **autoconfiguration** for the **OpenTelemetry R2DBC instrumentation**.

| System property                                        | Type    | Default | Description                            |
| ------------------------------------------------------ | ------- | ------- | -------------------------------------- |
| otel.instrumentation.r2dbc.statement-sanitizer.enabled | Boolean | true    | Enables the DB statement sanitization. |

## Annotations

1. For **most users**, the **out-of-the-box instrumentation** is **completely sufficient** and nothing more has to be done.
2. Sometimes, however, users wish to **create spans** for their own **custom code** without needing to make many code changes.
   - If you add the **WithSpan** annotation to a **method**, the method is **wrapped in a span**.
   - The **SpanAttribute** annotation allows you to **capture** the **method arguments** as **attributes**.

```java
package otel;

import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.instrumentation.annotations.SpanAttribute;
import io.opentelemetry.instrumentation.annotations.WithSpan;
import org.springframework.stereotype.Component;

/** Test WithSpan */
@Component
public class TracedClass {

  @WithSpan
  public void tracedMethod() {}

  @WithSpan(value = "span name")
  public void tracedMethodWithName() {
    Span currentSpan = Span.current();
    currentSpan.addEvent("ADD EVENT TO tracedMethodWithName SPAN");
    currentSpan.setAttribute("isTestAttribute", true);
  }

  @WithSpan(kind = SpanKind.CLIENT)
  public void tracedClientSpan() {}

  @WithSpan
  public void tracedMethodWithAttribute(@SpanAttribute("attributeName") String parameter) {}
}
```

1. The **OpenTelemetry annotations** use **Spring AOP** based on **proxies**.
2. These annotations **work only for** the **methods** of the **proxy**.
3. In the following example, the **WithSpan** annotation **won’t do anything** when the GET endpoint is called:

```java
package otel;

import io.opentelemetry.instrumentation.annotations.WithSpan;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MyControllerManagedBySpring {

  @GetMapping("/ping")
  public void aMethod() {
    anotherMethod();
  }

  @WithSpan
  public void anotherMethod() {}
}
```

> To be able to use the **OpenTelemetry annotations**, you have to add the **Spring Boot Starter AOP dependency** to your project:

```xml
<dependencies>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aop</artifactId>
  </dependency>
</dependencies>
```

You can **disable** the **OpenTelemetry annotations** by setting the **otel.instrumentation.annotations.enabled** property to **false**.

> You can **customize** the **span** by using the **elements** of the **WithSpan** annotation:

| Name  | Type     | Description           | Default Value         |
| ----- | -------- | --------------------- | --------------------- |
| value | String   | Span name             | ClassName.Method      |
| kind  | SpanKind | Span kind of the span | **SpanKind.INTERNAL** |

> You can set the **attribute name** from the **value element** of the **SpanAttribute** annotation:

| Name  | Type   | Description    | Default Value         |
| ----- | ------ | -------------- | --------------------- |
| value | String | Attribute name | Method parameter name |

## Additional instrumentation

The OpenTelemetry Spring Boot starter provides out of the box instrumentation that you can augment with **additional instrumentations**.

### Log4j2 Instrumentation

> You have to add the **OpenTelemetry appender** to your **log4j2.xml** file:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Configuration status="WARN" packages="io.opentelemetry.instrumentation.log4j.appender.v2_17">
    <Appenders>
        <OpenTelemetry name="OpenTelemetryAppender"/>
    </Appenders>
    <Loggers>
        <Root>
            <AppenderRef ref="OpenTelemetryAppender" level="All"/>
        </Root>
    </Loggers>
</Configuration>
```

| System property                             | Type    | Default | Description                                                  |
| ------------------------------------------- | ------- | ------- | ------------------------------------------------------------ |
| otel.instrumentation.log4j-appender.enabled | Boolean | true    | Enables the configuration of the **Log4j OpenTelemetry appender** with an **OpenTelemetry instance**. |

## Other Spring autoconfiguration

Instead of using the **OpenTelemetry Spring starter**, you can use the **OpenTelemetry Zipkin starter**.

### Zipkin starter

1. **OpenTelemetry Zipkin Exporter Starter** is a starter package that includes the **opentelemetry-api**, **opentelemetry-sdk**, **opentelemetry-extension-annotations**, **opentelemetry-logging-exporter**, **opentelemetry-spring-boot-autoconfigurations** and **spring framework starters** required to setup distributed tracing.
2. It also provides the **opentelemetry-exporters-zipkin** artifact and corresponding **exporter autoconfiguration**.
3. If an **exporter** is **present in the classpath** during **runtime** and a **spring bean** of the **exporter** is **missing** from the **spring application context**
   - an **exporter bean** is **initialized** and added to a **simple span processor** in the **active tracer provider**. 

```xml
<dependencies>
  <dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-exporter-zipkin</artifactId>
    <version>1.54.1</version>
  </dependency>
</dependencies>
```

| Property                     | Default Value | ConditionalOnClass |
| ---------------------------- | ------------- | ------------------ |
| otel.exporter.zipkin.enabled | true          | ZipkinSpanExporter |









