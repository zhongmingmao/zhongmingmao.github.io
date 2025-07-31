---
title: Observability - OpenTelemetry Python
mathjax: true
date: 2025-01-05 00:06:25
cover: https://observability-1253868755.cos.ap-guangzhou.myqcloud.com/otel-python-instrumentation.jpg
categories:
  - Cloud Native
  - Observability
tags:
  - Cloud Native
  - Observability
  - OpenTelemetry
---

# Overview

## Status and Releases

| Traces | Metrics | Logs        |
| ------ | ------- | ----------- |
| Stable | Stable  | Development |

## Version support

OpenTelemetry-Python supports Python **3.9** and higher.

<!-- more -->

## Installation

> The API and SDK packages are available on PyPI, and can be installed via pip:

```
pip install opentelemetry-api
pip install opentelemetry-sdk
```

> In addition, there are several extension packages which can be installed separately as:

```
pip install opentelemetry-exporter-{exporter}
pip install opentelemetry-instrumentation-{instrumentation}
```

1. These are for **exporter** and **instrumentation** libraries respectively.
2. The **Jaeger**, **Zipkin**, **Prometheus**, **OTLP** and **OpenCensus** Exporters can be found in the exporter directory of the repository.
3. **Instrumentations** and **additional exporters** can be found in the **contrib repository** instrumentation and exporter directories.

# Getting Started

## Example Application

1. The following example uses a basic **Flask** application.
2. You can use OpenTelemetry Python with other web frameworks as well, such as **Django** and **FastAPI**.

## Installation

> To begin, set up an environment in a new directory:

```
mkdir otel-getting-started
cd otel-getting-started
python3 -m venv venv
source ./venv/bin/activate
```

> Now install Flask:

```
pip install flask
```

### Create and launch an HTTP Server

> Create a file `app.py` and add the following code to it:

```pyton
from random import randint
from flask import Flask, request
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.route("/rolldice")
def roll_dice():
    player = request.args.get('player', default=None, type=str)
    result = str(roll())
    if player:
        logger.warning("%s is rolling the dice: %s", player, result)
    else:
        logger.warning("Anonymous player is rolling the dice: %s", result)
    return result


def roll():
    return randint(1, 6)
```

> Run the application with the following command and open http://localhost:8080/rolldice in your web browser to ensure it is working.

```
flask run -p 8080
```

## Instrumentation

1. Zero-code instrumentation will **generate telemetry data** on your behalf.
2. There are several options you can take, Here we’ll use the **opentelemetry-instrument** agent.
3. Install the **opentelemetry-distro** package
   - which contains the OpenTelemetry **API**, **SDK** and also the tools **opentelemetry-bootstrap** and **opentelemetry-instrument** you will use below.

```
pip install opentelemetry-distro
```

> Run the `opentelemetry-bootstrap` command:

```
opentelemetry-bootstrap -a install
```

> This will install **Flask instrumentation**.

## Run the instrumented app

> You can now run your instrumented app with **opentelemetry-instrument** and have it print to the console for now:

```
export OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true
opentelemetry-instrument \
    --traces_exporter console \
    --metrics_exporter console \
    --logs_exporter console \
    --service_name dice-server \
    flask run -p 8080
```

> Open http://localhost:8080/rolldice in your web browser and reload the page a few times.
> After a while you should see the **spans** printed in the console, such as the following:

```json
{
    "name": "GET /rolldice",
    "context": {
        "trace_id": "0x830764002fc7a5dea65898ae9a6e99f3",
        "span_id": "0x6374fc33cf0505e9",
        "trace_state": "[]"
    },
    "kind": "SpanKind.SERVER",
    "parent_id": null,
    "start_time": "2025-07-31T13:43:04.764170Z",
    "end_time": "2025-07-31T13:43:04.764971Z",
    "status": {
        "status_code": "UNSET"
    },
    "attributes": {
        "http.method": "GET",
        "http.server_name": "127.0.0.1",
        "http.scheme": "http",
        "net.host.name": "localhost:8080",
        "http.host": "localhost:8080",
        "net.host.port": 8080,
        "http.target": "/rolldice",
        "net.peer.ip": "127.0.0.1",
        "net.peer.port": 63562,
        "http.user_agent": "curl/8.7.1",
        "http.flavor": "1.1",
        "http.route": "/rolldice",
        "http.status_code": 200
    },
    "events": [],
    "links": [],
    "resource": {
        "attributes": {
            "telemetry.sdk.language": "python",
            "telemetry.sdk.name": "opentelemetry",
            "telemetry.sdk.version": "1.36.0",
            "service.name": "dice-server",
            "telemetry.auto.version": "0.57b0"
        },
        "schema_url": ""
    }
}
```

1. The generated span tracks the **lifetime** of a **request** to the `/rolldice` route.
2. The log line emitted during the request contains the same **trace ID** and **span ID** and is exported to the **console** via the log exporter.
3. Send a few more requests to the endpoint, and then either wait for a little bit or terminate the app and you’ll see **metrics** in the console output

```json
                        {
                            "name": "arms_python_process_runtime_cpython_context_switches",
                            "description": "Runtime context switches",
                            "unit": "switches",
                            "data": {
                                "data_points": [
                                    {
                                        "attributes": {
                                            "type": "involuntary"
                                        },
                                        "start_time_unix_nano": 1753969441098665000,
                                        "time_unix_nano": 1753969621342108000,
                                        "value": 0,
                                        "exemplars": []
                                    },
                                    {
                                        "attributes": {
                                            "type": "voluntary"
                                        },
                                        "start_time_unix_nano": 1753969441098683000,
                                        "time_unix_nano": 1753969621342108000,
                                        "value": 1748,
                                        "exemplars": []
                                    }
                                ],
                                "aggregation_temporality": 2,
                                "is_monotonic": true
                            }
                        }
```

## Add manual instrumentation to automatic instrumentation

1. **Automatic instrumentation** captures **telemetry** at the **edges** of your systems
   - such as **inbound** and **outbound** HTTP requests, but it doesn’t capture what’s going on **in** your application.
2. For that you’ll need to write some **manual instrumentation**.

### Traces

> First, modify `app.py` to include code that initializes a **tracer** and uses it to **create a trace** that’s a **child** of the one that’s **automatically generated**:

```python
from random import randint
from flask import Flask

from opentelemetry import trace

# Acquire a tracer
tracer = trace.get_tracer("diceroller.tracer")

app = Flask(__name__)


@app.route("/rolldice")
def roll_dice():
    return str(roll())


def roll():
    # This creates a new span that's the child of the current one
    with tracer.start_as_current_span("roll") as rollspan:
        res = randint(1, 6)
        rollspan.set_attribute("roll.value", res)
        return res
```

> Now run the app again:

```
pip install opentelemetry-exporter-otlp opentelemetry-exporter-otlp-proto-grpc
```

```
export OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true
opentelemetry-instrument \
    --traces_exporter console \
    --metrics_exporter console \
    --logs_exporter console \
    --service_name dice-server \
    flask run -p 8080
```

> When you send a request to the server, you’ll see **two spans** in the trace emitted to the console
> and the one called `roll` registers its parent as the automatically created one:

```json
{
    "name": "roll",
    "context": {
        "trace_id": "0xe5ce795920be73e103e6a87eb783a1e0",
        "span_id": "0x40ed371e8ea05a37",
        "trace_state": "[]"
    },
    "kind": "SpanKind.INTERNAL",
    "parent_id": "0x13203181a224a866",
    "start_time": "2025-07-31T14:06:12.732153Z",
    "end_time": "2025-07-31T14:06:12.732172Z",
    "status": {
        "status_code": "UNSET"
    },
    "attributes": {
        "roll.value": 2
    },
    "events": [],
    "links": [],
    "resource": {
        "attributes": {
            "telemetry.sdk.language": "python",
            "telemetry.sdk.name": "opentelemetry",
            "telemetry.sdk.version": "1.36.0",
            "service.name": "dice-server",
            "telemetry.auto.version": "0.57b0"
        },
        "schema_url": ""
    }
}
{
    "name": "GET /rolldice",
    "context": {
        "trace_id": "0xe5ce795920be73e103e6a87eb783a1e0",
        "span_id": "0x13203181a224a866",
        "trace_state": "[]"
    },
    "kind": "SpanKind.SERVER",
    "parent_id": null,
    "start_time": "2025-07-31T14:06:12.731589Z",
    "end_time": "2025-07-31T14:06:12.732397Z",
    "status": {
        "status_code": "UNSET"
    },
    "attributes": {
        "http.method": "GET",
        "http.server_name": "127.0.0.1",
        "http.scheme": "http",
        "net.host.name": "localhost:8080",
        "http.host": "localhost:8080",
        "net.host.port": 8080,
        "http.target": "/rolldice",
        "net.peer.ip": "127.0.0.1",
        "net.peer.port": 64172,
        "http.user_agent": "curl/8.7.1",
        "http.flavor": "1.1",
        "http.route": "/rolldice",
        "http.status_code": 200
    },
    "events": [],
    "links": [],
    "resource": {
        "attributes": {
            "telemetry.sdk.language": "python",
            "telemetry.sdk.name": "opentelemetry",
            "telemetry.sdk.version": "1.36.0",
            "service.name": "dice-server",
            "telemetry.auto.version": "0.57b0"
        },
        "schema_url": ""
    }
}
```

> The **parent_id** of roll is the same as the **span_id** for /rolldice, indicating a **parent-child relationship**!

### Metrics

> Now modify app.py to include code that initializes a **meter** and uses it to **create a counter** instrument which counts the number of rolls for each possible roll value:

```python
# These are the necessary import declarations
from opentelemetry import trace
from opentelemetry import metrics

from random import randint
from flask import Flask, request
import logging

# Acquire a tracer
tracer = trace.get_tracer("diceroller.tracer")
# Acquire a meter.
meter = metrics.get_meter("diceroller.meter")

# Now create a counter instrument to make measurements with
roll_counter = meter.create_counter(
    "dice.rolls",
    description="The number of rolls by roll value",
)

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.route("/rolldice")
def roll_dice():
    # This creates a new span that's the child of the current one
    with tracer.start_as_current_span("roll") as roll_span:
        player = request.args.get('player', default=None, type=str)
        result = str(roll())
        roll_span.set_attribute("roll.value", result)
        # This adds 1 to the counter for the given roll value
        roll_counter.add(1, {"roll.value": result})
        if player:
            logger.warn("%s is rolling the dice: %s", player, result)
        else:
            logger.warn("Anonymous player is rolling the dice: %s", result)
        return result


def roll():
    return randint(1, 6)
```

> Now run the app again:

```
export OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true
opentelemetry-instrument \
    --traces_exporter console \
    --metrics_exporter console \
    --logs_exporter console \
    --service_name dice-server \
    flask run -p 8080
```

## Send telemetry to an OpenTelemetry Collector

1. The **OpenTelemetry Collector** is a **critical component** of most **production** deployments.
2. Some examples of when it’s beneficial to use a collector
   - **A single telemetry sink** shared by **multiple services**, to reduce **overhead** of **switching exporters**
   - **Aggregating traces** across **multiple services**, running on **multiple hosts**
   - A central place to **process traces** prior to **exporting** them to a **backend**
3. Unless you have just a **single service** or are **experimenting**, you’ll want to use a collector in production deployments.

### Configure and run a local collector

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
exporters:
  # NOTE: Prior to v0.86.0 use `logging` instead of `debug`.
  debug:
    verbosity: detailed
processors:
  batch:
service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [debug]
      processors: [batch]
    metrics:
      receivers: [otlp]
      exporters: [debug]
      processors: [batch]
    logs:
      receivers: [otlp]
      exporters: [debug]
      processors: [batch]
```

> Then run the docker command to acquire and run the collector based on this configuration:

```
docker run -p 4317:4317 \
    -v ./otel-collector-config.yaml:/etc/otel-collector-config.yaml \
    otel/opentelemetry-collector:0.131.0 \
    --config=/etc/otel-collector-config.yaml
```

> You will now have an **collector instance** running locally, listening on port 4317.

### Modify the command to export spans and metrics via OTLP

1. The next step is to modify the command to send **spans** and **metrics** to the **collector** via **OTLP** instead of the console.
2. To do this, install the **OTLP exporter** package:

```
pip install opentelemetry-exporter-otlp
```

> The **opentelemetry-instrument** agent will **detect the package** you just installed and **default** to **OTLP export** when it’s run next.

### Run the application

> Run the application like before, but don’t export to the console:

```
export OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true
opentelemetry-instrument --logs_exporter otlp flask run -p 8080
```

1. By default, **opentelemetry-instrument** exports **traces** and **metrics** over **OTLP/gRPC** and will send them to localhost:4317
2. which is what the **collector** is listening on.

# Propagation

## Automatic context propagation

1. Instrumentation libraries for popular Python frameworks and libraries
   - such as **Jinja2**, **Flask**, **Django**, and Celery.propagate context across services for you.
2. Use **instrumentation libraries** to propagate context.
   - Although it is possible to propagate context **manually**
   - the Python **auto-instrumentation** and **instrumentation libraries** are **well-tested** and easier to use.

# Distro

1. In order to make using **OpenTelemetry** and **auto-instrumentation** as quick as possible **without sacrificing flexibility**
   - OpenTelemetry distros provide a mechanism to **automatically configure** some of the more common options for users.
2. By harnessing their power, users of OpenTelemetry can **configure the components as they need**.
3. The **opentelemetry-distro** package provides some **defaults** to users looking to get started, it configures:
   - the SDK **TracerProvider**
   - a **BatchSpanProcessor**
   - the **OTLP SpanExporter** to send data to an OpenTelemetry Collector
4. The package also provides a **starting point** for anyone interested in **producing** an **alternative distro**.
5. The **interfaces** implemented by the package are **loaded** by the **auto-instrumentation**
   - via the **opentelemetry_distro** and **opentelemetry_configurator** entry points to **configure the application** before **any other code** is executed.
6. In order to **automatically export data** from OpenTelemetry to the OpenTelemetry collector, installing the package will set up all the required entry points.

```
pip install opentelemetry-distro[otlp] opentelemetry-instrumentation
```

# Zero-code Instrumentation

## Overview

1. **Automatic instrumentation** with Python uses a **Python agent** that can be **attached** to **any Python application**.
2. This agent primarily uses **monkey patching** to **modify library functions at runtime**
   - allowing for the **capture** of **telemetry data** from many **popular libraries and frameworks**.

### Setup

> Run the following commands to install the appropriate packages.

```
pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap -a install
```

1. The `opentelemetry-distro` package installs the **API**, **SDK**, and the `opentelemetry-bootstrap` and `opentelemetry-instrument` tools.
2. You must install a **distro package** to get **auto instrumentation** working.
   - The **opentelemetry-distro** package contains the **default distro** to **automatically configure** some of the **common options** for users.
3. The **opentelemetry-bootstrap -a install** command
   - **reads** through the **list of packages installed** in your active **site-packages** folder, 
   - and **installs** the **corresponding instrumentation libraries** for these **packages**, if applicable.
   - For example, if you already installed the **flask** package
     - running **opentelemetry-bootstrap -a install** will install **opentelemetry-instrumentation-flask** for you.
   - The **OpenTelemetry Python agent** will use **monkey patching** to **modify functions** in these libraries at **runtime**.
4. Running **opentelemetry-bootstrap without arguments** lists the **recommended instrumentation libraries** to be installed.

### Configuring the agent

1. The agent is **highly configurable**.
2. One option is to configure the agent by way of configuration properties from the **CLI**:

```
opentelemetry-instrument \
    --traces_exporter console,otlp \
    --metrics_exporter console \
    --service_name your-service-name \
    --exporter_otlp_endpoint 0.0.0.0:4317 \
    python myapp.py
```

> Alternatively, you can use **environment variables** to configure the agent:

```
OTEL_SERVICE_NAME=your-service-name \
OTEL_TRACES_EXPORTER=console,otlp \
OTEL_METRICS_EXPORTER=console \
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=0.0.0.0:4317
opentelemetry-instrument \
    python myapp.py
```

### Supported libraries and frameworks

> A number of popular Python libraries are **auto-instrumented**, including **Flask** and **Django**.

## Configuration

### Configuration properties

> Here’s an example of agent configuration via **configuration properties**:

```
opentelemetry-instrument \
    --traces_exporter console,otlp \
    --metrics_exporter console \
    --service_name your-service-name \
    --exporter_otlp_endpoint 0.0.0.0:4317 \
    python myapp.py
```

> Here’s an explanation of what each configuration does:

1. traces_exporter
   - specifies which traces exporter to use.
   - In this case, traces are being exported to **console** (stdout) and with **otlp**.
   - The **otlp** option tells **opentelemetry-instrument** to send the **traces** to an **endpoint** that **accepts OTLP via gRPC**.
   - In order to use **HTTP** instead of **gRPC**, add **--exporter_otlp_protocol http/protobuf**. 
2. metrics_exporter
   - specifies which metrics exporter to use.
   - In this case, metrics are being exported to **console** (stdout).
   - It is currently required for your to specify a metrics exporter.
   - If you **aren’t exporting metrics**, specify **none** as the value instead.
3. service_name
   - sets the name of the service associated with your **telemetry**, and is sent to your **Observability backend**.
4. exporter_otlp_endpoint
   - sets the endpoint where telemetry is exported to.
   - If **omitted**, the **default Collector endpoint** will be used, which is **0.0.0.0:4317 for gRPC** and **0.0.0.0:4318 for HTTP**.
5. exporter_otlp_headers
   - is required depending on your chosen **Observability backend**.

### Environment Variables

1. In some cases, configuring via **environment variables** is **more preferred**.
   - **Any** setting configurable with a command-line argument can also be configured with an Environment Variable.
2. You can apply the following steps to **determine** the **correct name mapping** of the **desired configuration property**:
   - Convert the **configuration property** to **uppercase**.
   - **Prefix** environment variable with `OTEL_`
   - For example, `exporter_otlp_endpoint` would convert to `OTEL_EXPORTER_OTLP_ENDPOINT`.

### Python-specific Configuration

> There are some Python specific configuration options you can set by prefixing environment variables with `OTEL_PYTHON_`.

#### Excluded URLs

1. **Comma-separated regular expressions** representing which URLs to exclude across all instrumentations:
   - `OTEL_PYTHON_EXCLUDED_URLS`
2. You can also exclude URLs for **specific instrumentations** by using a variable `OTEL_PYTHON_<library>_EXCLUDED_URLS`
   - where library is the **uppercase** version of one of the following:
   - **Django**, Falcon, **FastAPI**, **Flask**, Pyramid, Requests, Starlette, Tornado, urllib, urllib3.

> Examples

```
export OTEL_PYTHON_EXCLUDED_URLS="client/.*/info,healthcheck"
export OTEL_PYTHON_URLLIB3_EXCLUDED_URLS="client/.*/info"
export OTEL_PYTHON_REQUESTS_EXCLUDED_URLS="healthcheck"
```

#### Request Attribute Names

> **Comma-separated** list of names that will be extracted from the request object and set as **attributes** on **spans**.

1. OTEL_PYTHON_DJANGO_TRACED_REQUEST_ATTRS
2. OTEL_PYTHON_FALCON_TRACED_REQUEST_ATTRS
3. OTEL_PYTHON_TORNADO_TRACED_REQUEST_ATTRS

> Examples

```
export OTEL_PYTHON_DJANGO_TRACED_REQUEST_ATTRS='path_info,content_type'
export OTEL_PYTHON_FALCON_TRACED_REQUEST_ATTRS='query_string,uri_template'
export OTEL_PYTHON_TORNADO_TRACED_REQUEST_ATTRS='uri,query'
```

#### Logging

> There are some configuration options used to control the logs that are outputted.

| Key                                              | Value                                                        |
| ------------------------------------------------ | ------------------------------------------------------------ |
| OTEL_PYTHON_LOG_CORRELATION                      | to enable **trace context injection** into logs (true, false) |
| OTEL_PYTHON_LOG_FORMAT                           | to instruct the instrumentation to use a **custom logging format** |
| OTEL_PYTHON_LOG_LEVEL                            | to set a **custom log level** (info, error, debug, warning)  |
| OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED | to enable **auto-instrumentation** of **logs**.<br />Attaches **OTLP handler** to **Python root logger**. |

> Examples

```
export OTEL_PYTHON_LOG_CORRELATION=true
export OTEL_PYTHON_LOG_FORMAT="%(msg)s [span_id=%(span_id)s]"
export OTEL_PYTHON_LOG_LEVEL=debug
export OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true
```

#### Other

> There are some more configuration options that can be set that don’t fall into a specific category.

| Key                                        | Value                                                        |
| ------------------------------------------ | ------------------------------------------------------------ |
| OTEL_PYTHON_DJANGO_INSTRUMENT              | set to `false` to disable the default enabled state for the Django instrumentation |
| OTEL_PYTHON_ELASTICSEARCH_NAME_PREFIX      | changes the default prefixes for Elasticsearch operation names from “Elasticsearch” to whatever is used here |
| OTEL_PYTHON_GRPC_EXCLUDED_SERVICES         | comma-separated list of specific services to exclude for the gRPC instrumentation |
| OTEL_PYTHON_ID_GENERATOR                   | to specify which IDs generator to use for the global Tracer Provider |
| OTEL_PYTHON_INSTRUMENTATION_SANITIZE_REDIS | to enable query sanitization                                 |

> Examples

```
export OTEL_PYTHON_DJANGO_INSTRUMENT=false
export OTEL_PYTHON_ELASTICSEARCH_NAME_PREFIX=my-custom-prefix
export OTEL_PYTHON_GRPC_EXCLUDED_SERVICES="GRPCTestServer,GRPCHealthServer"
export OTEL_PYTHON_ID_GENERATOR=xray
export OTEL_PYTHON_INSTRUMENTATION_SANITIZE_REDIS=true
```

### Disabling Specific Instrumentations

1. The **Python agent** by default will **detect a Python program’s packages** and **instrument any packages** it can.
   - This makes instrumentation **easy**, but can result in **too much** or **unwanted** data.
2. You can **omit** specific packages from **instrumentation** by using the **OTEL_PYTHON_DISABLED_INSTRUMENTATIONS** environment variable.
3. The environment variable can be set to a **comma-separated list** of **instrumentations entry point names** to **exclude** from instrumentation.
4. Most of the time the **entry point name** is the same as the **package name** and it is set in 
   - the **project.entry-points.opentelemetry_instrumentor** table in the package **pyproject.toml** file.
5. For example, if your Python program uses the `redis`,`kafka-python` and `grpc` packages
   - by default the agent will use the `opentelemetry-instrumentation-redis`, `opentelemetry-instrumentation-kafka-python` and `opentelemetry-instrumentation-grpc` packages to instrument them.
   - To disable this, you can set `OTEL_PYTHON_DISABLED_INSTRUMENTATIONS=redis,kafka,grpc_client`.



