---
title: Security - OPA Operation
mathjax: false
date: 2022-12-27 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/opa/opa-ops.jpeg
categories:
  - Cloud Native
  - Cloud Native Foundation
  - OPA
tags:
  - Cloud Native
  - Cloud Native Foundation
  - OPA
---

# Configuration

## Example

```
$ opa run -s -c config.yaml
```

```
$ opa run --server \
--log-format=json-pretty \
--set=decision_logs.console=true \

--set=services.A.url=http://my-bundles:8080/api/opa/bundle/ \
--set=bundles.A.service=A \
--set=bundles.A.polling.long_polling_timeout_seconds=45 \
--set=bundles.A.resource=A.tar.gz \

--set=services.B.url=http://my-bundles:8080/api/opa/bundle/ \
--set=bundles.B.service=B \
--set=bundles.B.polling.long_polling_timeout_seconds=45 \
--set=bundles.B.resource=B.tar.gz \
```

<!-- more -->

```yaml config.yaml
services:
  acmecorp:
    url: https://example.com/control-plane-api/v1
    response_header_timeout_seconds: 5
    credentials:
      bearer:
        token: "bGFza2RqZmxha3NkamZsa2Fqc2Rsa2ZqYWtsc2RqZmtramRmYWxkc2tm"

labels:
  app: myapp
  region: west
  environment: production

bundles:
  authz:
    service: acmecorp
    resource: bundles/http/example/authz.tar.gz
    persist: true
    polling:
      min_delay_seconds: 60
      max_delay_seconds: 120
    signing:
      keyid: global_key
      scope: write

decision_logs:
  service: acmecorp
  reporting:
    min_delay_seconds: 300
    max_delay_seconds: 600

status:
  service: acmecorp

default_decision: /http/example/authz/allow

persistence_directory: /var/opa

keys:
  global_key:
    algorithm: RS256
    key: <PEM_encoded_public_key>
    scope: read

caching:
  inter_query_builtin_cache:
    max_size_bytes: 10000000

distributed_tracing:
  type: grpc
  address: localhost:4317
  service_name: opa
  sample_percentage: 50
  encryption: "off"

server:
  encoding:
    gzip:
        min_length: 1024,
        compression_level: 9
```

## Environment Variable Substitution

> Only supported with the OPA runtime (`opa run`).
> Environment variables referenced with the `${...}` notation within the configuration will be replaced with the value of the environment variable.

```yaml
services:
  acmecorp:
    url: "${BASE_URL}"
    credentials:
      bearer:
        token: "${BEARER_TOKEN}"

discovery:
  resource: /configuration/example/discovery
  decision: example
```

> The environment variables `BASE_URL` and `BEARER_TOKEN` will be *substituted* in when the config file is loaded by the *OPA runtime*.
> If the variable is *undefined* then an *empty string* (`""`) is substituted. It will **not** raise an error.

## CLI Runtime Overrides

> Only supported with the OPA runtime (`opa run`).

1. Using `opa run` there are CLI options to *explicitly* set config values. These will *override* any values set in the config file.
2. There are two options to use: `--set` and `--set-file`
   - Both options take in a *key=value* format where the key is a *selector* for the yaml config structure
3. *Multiple values* can be specified with *comma* separators (`key1=value,key2=value2,..`). Or with additional `--set` parameters.

```
$ opa run \
  --set "default_decision=/http/example/authz/allow" \
  --set "services.acmecorp.url=https://test-env/control-plane-api/v1" \
  --set "services.acmecorp.credentials.bearer.token=\${TOKEN}"
  --set "labels.app=myapp,labels.region=west"
```

> This is equivalent to a YAML config file that looks like

```yaml
services:
  acmecorp:
    url: https://test-env/control-plane-api/v1
    credentials:
      bearer:
        token: ${TOKEN}

labels:
  app: myapp
  region: west

default_decision: /http/example/authz/allow
```

> The `--set-file` option is *expecting* a file path for the value. 
> This allows *keeping secrets in files* and loading them into the config at run time. 

> With a file `/var/run/secrets/bearer_token.txt`

```
bGFza2RqZmxha3NkamZsa2Fqc2Rsa2ZqYWtsc2RqZmtramRmYWxkc2tm
```

> Then using the `--set-file` flag for OPA
> It will *read the contents of the file* and set the config value with the token.

```
$ opa run --set-file "services.acmecorp.credentials.bearer.token=/var/run/secrets/bearer_token.txt"
```

### Override Limitations

#### Lists

> If using *arrays/lists* in the configuration the `--set` and `--set-file` overrides will not be able to *patch sub-objects of the list*.
> They will *overwrite* the *entire index* with the *new object*.

> For example, a `config.yaml` file with contents:

```yaml
services:
  - name: acmecorp
    url: https://test-env/control-plane-api/v1
    credentials:
      bearer:
        token: ""
```

> Used with overrides:

```
$ opa run \
  --config-file config.yaml
  --set-file "services[0].credentials.bearer.token=/var/run/secrets/bearer_token.txt"
```

> Will result in configuration like:

```yaml
services:
  - credentials:
      bearer:
        token: bGFza2RqZmxha3NkamZsa2Fqc2Rsa2ZqYWtsc2RqZmtramRmYWxkc2tm
```

> Because the *entire* `0` index was *overwritten*.

> It is highly recommended to use *objects/maps* instead of *lists* for configuration for this reason.

### Remote Bundles Override Shorthand

> When running the server to quickly try *a remote public bundle*, you may find it convenient to provide the URL of the bundle directly, rather than via repeated `--set` flags

```
$ opa run -s https://example.com/bundles/bundle.tar.gz
```

> The above shorthand command is *identical* to:

```
$ opa run -s --set "services.cli1.url=https://example.com" \
           --set "bundles.cli1.service=cli1" \
           --set "bundles.cli1.resource=/bundles/bundle.tar.gz" \
           --set "bundles.cli1.persist=true"
```

### Empty objects

> If you need to set an empty object with the CLI overrides, for example with plugin configuration like:

```yaml
decision_logs:
  plugin: my_plugin

plugins:
  my_plugin:
    # empty
```

> You can do this by setting the value with `null`. For example:

```
$ opa run --set "decision_logs.plugin=my_plugin" --set "plugins.my_plugin=null"
```

### Keys with Special Characters

> If you have a *key* which contains a special character (`=`, `[`, `,`, `.`), like `opa.example.com`,
> and want to use the `--set` or `--set-file` options you will need to *escape* the character with a backslash (`\`).

> For example a config section like:

```yaml
services:
  opa.example.com:
    url: https://opa.example.com
```

> Could be specified with something like:

```
--set services.opa\.example\.com.url=https://opa.example.com
```

> Note that when using it in a *shell* you may need to put it in *quotes* or escape the `\` character too. For example:

```
--set services."opa\.example\.com".url=https://opa.example.com
```

*or*

```
--set services.opa\\.example\\.com.url=https://opa.example.com
```

## Services

> Services represent *endpoints* that implement one or more *control plane APIs* such as the *Bundle* or *Status* APIs.
> OPA configuration files may contain *multiple services*.

| Field                                         | Type   | Required              | Description                                                  |
| --------------------------------------------- | ------ | --------------------- | ------------------------------------------------------------ |
| `services[_].name`                            | string | Yes                   | *Unique name* for the service. *Referred to by plugins*.     |
| `services[_].url`                             | string | Yes                   | *Base URL* to contact the service with.                      |
| `services[_].response_header_timeout_seconds` | int64  | No (default: 10)      | Amount of time to *wait for a server’s response headers* after *fully writing the request*.<br />This time *does not include the time to read the response body*. |
| `services[_].headers`                         | object | No                    | HTTP headers to include in requests to the service.          |
| `services[_].tls.ca_cert`                     | string | No                    | The path to the *root CA certificate*.<br />If not provided, this defaults to TLS using the *host’s root CA set*. |
| `services[_].tls.system_ca_required`          | bool   | No (default: `false`) | Require *system certificate* appended with *root CA certificate*. |
| `services[_].allow_insecure_tls`              | bool   | No                    | Allow insecure TLS.                                          |
| `services[_].type`                            | string | No (default: empty)   | Optional parameter that allows to use an “OCI” service type.<br />This will allow bundle and discovery plugins to download bundles from an *OCI registry*. |

> Services can be defined as an *array* or *object*. When defined as an *object*, the *object keys* override the `services[_].name` fields. For example:

```yaml
services:
  s1:
    url: https://s1/example/
  s2:
    url: https://s2/
```

> Is equivalent to

```yaml
services:
  - name: s1
    url: https://s1/example/
  - name: s2
    url: https://s2/
```

> Each service may optionally specify a *credential mechanism* by which OPA will *authenticate itself to the service*.

## Credential

### Bearer Token

1. OPA will authenticate using the specified bearer token and schema
2. to enable bearer token authentication, either the *token* or the *path to the token* must be specified.
   - If the latter is provided, on *each request* OPA will *re-read the token from the file* and use that token for authentication.

### Client TLS Certificate

1. OPA will present the *specified TLS certificate* to authenticate.
2. The paths to the *client certificate* and the *private key* are required;
   - the *passphrase* for the *private key* is only required if the private key is *encrypted*.

### OAuth2 Client Credentials

1. OPA will authenticate using a *bearer token* obtained through the *OAuth2 client credentials flow*.
2. Following *successful authentication* at the *token endpoint* the *returned token* will be *cached* for *subsequent requests* for the duration of its lifetime.
3. Note that as per the *OAuth2 standard*, only the *HTTPS* scheme is supported for the *token endpoint* URL.

### OAuth2 Client Credentials JWT authentication

1. OPA will authenticate using a *bearer token* obtained through the *OAuth2 client credentials flow*.
2. Rather than providing a client secret along with the request for an *access token*, the *client asserts its identity in the form of a signed JWT*.
3. Following *successful authentication* at the *token endpoint* the *returned token* will be *cached* for *subsequent requests* for the duration of its lifetime.
4. Note that as per the *OAuth2 standard*, only the *HTTPS* scheme is supported for the *token endpoint* URL.

### OAuth2 JWT Bearer Grant Type

1. OPA will authenticate using a *bearer token* obtained through the *OAuth2 JWT authorization grant flow*.
2. Rather than providing a client secret along with the request for an *access token*, the *client asserts its identity in the form of a signed JWT*.
3. Following *successful authentication* at the *token endpoint* the *returned token* will be *cached* for *subsequent requests* for the duration of its lifetime.
4. Note that as per the *OAuth2 standard*, only the *HTTPS* scheme is supported for the *token endpoint* URL.

## Miscellaneous

| Field                            | Type    | Required                            | Description                                                  |
| -------------------------------- | ------- | ----------------------------------- | ------------------------------------------------------------ |
| `labels`                         | object  | Yes                                 | Set of *key-value* pairs that uniquely identify the *OPA instance*.<br />Labels are included when OPA *uploads decision logs and status information*. |
| `default_decision`               | string  | No (default: `/system/main`)        | Set path of *default policy decision* used to serve queries against OPA’s *base URL*. |
| `default_authorization_decision` | string  | No (default: `/system/authz/allow`) | Set path of *default authorization decision* for OPA’s API.  |
| `persistence_directory`          | string  | No (default `$PWD/.opa`)            | Set directory to use for persistence with options like `bundles[_].persist`. |
| `plugins`                        | object  | No (default: `{}`)                  | Location for *custom plugin* configuration.                  |
| `nd_builtin_cache`               | boolean | No (default: `false`)               | Enable the non-deterministic builtins caching system during policy evaluation, and include the contents of the cache in decision logs.<br />Note that decision logs that are larger than `upload_size_limit_bytes` will drop the `nd_builtin_cache` key from the log entry before uploading. |

## Caching

> Caching represents the configuration of the *inter-query cache* that *built-in functions* can utilize.

| Field                                              | Type  | Required | Description                                                  |
| -------------------------------------------------- | ----- | -------- | ------------------------------------------------------------ |
| `caching.inter_query_builtin_cache.max_size_bytes` | int64 | No       | *Inter-query cache size limit in bytes*.<br />OPA will *drop old items* from the cache if this limit is exceeded.<br />By default, *no limit* is set. |

## Bundles

1. Bundles are defined with a *key* that is the `name` of the bundle.
   - This `name` is used in the *status* API, *decision logs*, server provenance, etc.
2. Each bundle can be configured to *verify* a bundle *signature* using the `keyid` and `scope` fields.
   - The `keyid` is the *name* of one of the keys listed under the *keys* entry.
3. *Signature verification fails* if the `bundles[_].signing` field is configured on a bundle but no `.signatures.json` file is included in the actual bundle gzipped tarball.

| Field                                             | Type                           | Required                       | Description                                                  |
| ------------------------------------------------- | ------------------------------ | ------------------------------ | ------------------------------------------------------------ |
| `bundles[_].resource`                             | string                         | No (default: `bundles/<name>`) | Resource path to use to *download* bundle from configured service. |
| `bundles[_].service`                              | string                         | Yes                            | Name of service to use to contact remote server.             |
| `bundles[_].polling.min_delay_seconds`            | int64                          | No (default: `60`)             | Minimum amount of time to wait *between bundle downloads*.   |
| `bundles[_].polling.max_delay_seconds`            | int64                          | No (default: `120`)            | Maximum amount of time to wait *between bundle downloads*.   |
| `bundles[_].trigger`                              | `string` (default: `periodic`) | No                             | Controls *how* bundle is downloaded from the remote server.<br />Allowed values are `periodic` and `manual`. |
| `bundles[_].polling.long_polling_timeout_seconds` | int64                          | No                             | Maximum amount of time the server should wait before issuing a *timeout* if there’s *no update available*. |
| `bundles[_].persist`                              | bool                           | No                             | Persist activated bundles to *disk*.                         |
| `bundles[_].signing.keyid`                        | string                         | No                             | *Name* of the *key* to use for *bundle signature verification*. |
| `bundles[_].signing.scope`                        | string                         | No                             | *Scope* to *use* for *bundle signature verification*.        |
| `bundles[_].signing.exclude_files`                | array                          | No                             | Files in the bundle to *exclude during verification*.        |
| `bundles[_].size_limit_bytes`                     | int64                          | No (default: `1073741824`)     | Size limit for *individual files* contained in the bundle.   |

## Status

| Field                   | Type                           | Required              | Description                                                  |
| ----------------------- | ------------------------------ | --------------------- | ------------------------------------------------------------ |
| `status.service`        | string                         | Yes                   | Name of service to use to contact remote server.             |
| `status.partition_name` | string                         | No                    | *Path segment* to include in *status updates*.               |
| `status.console`        | boolean                        | No (default: `false`) | Log the status updates *locally* to the console.<br />When enabled alongside a remote status update API the `service` must be configured, the default `service` selection will be *disabled*. |
| `status.prometheus`     | boolean                        | No (default: `false`) | Export the status (*bundle* and *plugin*) metrics to prometheus.<br />When enabled alongside a remote status update API the `service` must be configured, the default `service` selection will be *disabled*. |
| `status.plugin`         | string                         | No                    | Use the *named plugin* for *status updates*.<br />If this field exists, the other configuration fields are not required. |
| `status.trigger`        | `string` (default: `periodic`) | No                    | Controls *how* status updates are reported to the remote server.<br />Allowed values are `periodic` and `manual`. |

## Decision Logs

| Field                                              | Type    | Required                         | Description                                                  |
| -------------------------------------------------- | ------- | -------------------------------- | ------------------------------------------------------------ |
| `decision_logs.service`                            | string  | No                               | Name of the service to use to contact remote server.<br />If *no plugin is specified*, and *console logging is disabled*, this will default to the *first service name defined* in the Services configuration. |
| `decision_logs.partition_name`                     | string  | No                               | ~~Deprecated: Use `resource` instead. Path segment to include in status updates.~~ |
| `decision_logs.resource`                           | string  | No (default: `/logs`)            | *Full path* to use for sending decision logs to a remote server. |
| `decision_logs.reporting.buffer_size_limit_bytes`  | int64   | No                               | *Decision log buffer size limit in bytes*.<br />OPA will *drop old events* from the log if this limit is exceeded.<br />By default, *no limit* is set.<br />Only one of `buffer_size_limit_bytes`, `max_decisions_per_second` may be set. |
| `decision_logs.reporting.max_decisions_per_second` | float64 | No                               | *Maximum number of decision log events to buffer per second*.<br />OPA will *drop events* if the rate limit is exceeded.<br />Only one of `buffer_size_limit_bytes`, `max_decisions_per_second` may be set. |
| `decision_logs.reporting.upload_size_limit_bytes`  | int64   | No (default: `32768`)            | *Decision log upload size limit in bytes*.<br />OPA will *chunk uploads* to *cap message body to this limit*. |
| `decision_logs.reporting.min_delay_seconds`        | int64   | No (default: `300`)              | Minimum amount of time to wait *between uploads*.            |
| `decision_logs.reporting.max_delay_seconds`        | int64   | No (default: `600`)              | Maximum amount of time to wait *between uploads*.            |
| `decision_logs.reporting.trigger`                  | string  | No (default: `periodic`)         | Controls *how* decision logs are reported to the remote server.<br />Allowed values are `periodic` and `manual`. |
| `decision_logs.mask_decision`                      | string  | No (default: `/system/log/mask`) | Set path of masking decision.                                |
| `decision_logs.drop_decision`                      | string  | No (default: `/system/log/drop`) | Set path of drop decision.                                   |
| `decision_logs.plugin`                             | string  | No                               | Use the *named plugin* for decision logging.<br />If this field exists, the other configuration fields are not required. |
| `decision_logs.console`                            | boolean | No (default: `false`)            | Log the decisions *locally* to the console.<br />When enabled alongside a remote decision logging API the `service` must be configured, the default `service` selection will be *disabled*. |

## Server

> The `server` configuration sets the *gzip compression* settings for `/v0/data`, `/v1/data` and `/v1/compile` HTTP `POST` endpoints The gzip compression settings are used when the client sends `Accept-Encoding: gzip`

| Field                                    | Type | Required            | Description                                                  |
| ---------------------------------------- | ---- | ------------------- | ------------------------------------------------------------ |
| `server.encoding.gzip.min_length`        | int  | No, (default: 1024) | Specifies the *minimum length of the response* to compress   |
| `server.encoding.gzip.compression_level` | int  | No, (default: 9)    | Specifies the compression level.<br />Accepted values:<br />a value of either *0* (*no compression*), *1* (*best speed, lowest compression*) or *9* (*slowest, best compression*). |

