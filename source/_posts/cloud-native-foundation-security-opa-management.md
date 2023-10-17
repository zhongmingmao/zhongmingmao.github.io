---
title: Security - OPA Management
mathjax: false
date: 2022-12-26 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/opa/opa-management-7474053.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - OPA
tags:
  - Cloud Native
  - Cloud Native Foundation
  - OPA
---

# Overview & Architecture

1. OPA exposes a set of APIs that enable *unified, logically centralized policy management*.
2. Read this page if you are interested in how to build a *control plane* around OPA that enables *policy distribution* and *collection of important telemetry data* like *decision logs*.

<!-- more -->

> OPA enables *low-latency*, *highly-available* policy enforcement by providing a *lightweight engine* for distributed architectures.
> By default, all of the *policy* and *data* that OPA uses to make decisions is kept *in-memory*.

> Host-local Architecture

![image-20231017101619626](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/opa/image-20231017101619626.png)

1. OPA is designed to enable *distributed* policy enforcement.
   - You can run OPA *next to* each and every service that needs to *offload policy decision-making*.
2. By colocating OPA with the services that require decision-making, you ensure that policy decisions are rendered *as fast as possible* and *in a highly-available manner*.

> Distributed Enforcement

![image-20231017102021625](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/opa/image-20231017102021625.png)

> To *control* and *observe* a set of OPAs, *each OPA* can be configured to connect to *management APIs* that enable

| Management API | Desc                        |
| -------------- | --------------------------- |
| Bundles        | Policy distribution         |
| Decision Logs  | Decision telemetry          |
| Status         | Agent telemetry             |
| Discovery      | Dynamic agent configuration |

> By configuring and implementing these management APIs you can unify *control* and *visibility* over OPAs in your environments.
> OPA *does not* provide a *control plane* service *out-of-the-box* today.

> Control Plane

![image-20231017102614050](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/opa/image-20231017102614050.png)

# Bundles

1. OPA can *periodically* download bundles of *policy* and *data* from *remote HTTP servers*.
   - The policies and data are *loaded on the fly* without requiring a *restart* of OPA.
   - Once the policies and data have been loaded, they are enforced *immediately*.
     - Policies and data loaded from bundles are accessible via the standard OPA REST API.
2. Bundles provide an alternative to *pushing* policies into OPA via the REST APIs.

3. By default, the OPA REST APIs will prevent you from *modifying policy and data loaded via bundles*.

## Bundle build

> The bundle will be named by default `bundle.tar.gz`.

```
$ ls foo
example.rego

$ opa build -b foo

$ ls
bundle.tar.gz  foo

$ opa inspect bundle.tar.gz
NAMESPACES:
+--------------------+-------------------+
|     NAMESPACE      |       FILE        |
+--------------------+-------------------+
| data               | /data.json        |
| data.httpapi.authz | /foo/example.rego |
+--------------------+-------------------+
```

> More, you can *optimize* the bundle by specifying the `--optimize` or `-O` flag.

```
$ opa build -b foo --optimize=1
error: bundle optimizations require at least one entrypoint
```

> Finally, you can also *sign* your bundle with `opa build`.

```
$ opa build --verification-key /path/to/public_key.pem --signing-key /path/to/private_key.pem --bundle foo/
```

## Bundle Service API

> OPA expects the service to *expose an API endpoint* that *serves bundles*.
> The bundle API should allow clients to *download bundles* at an *arbitrary* URL.

```
GET /<service path>/<resource> HTTP/1.1
```

> If the *bundle exists*, the server should respond with an *HTTP 200 OK* status followed by a *gzipped tarball* in the message body.

```
HTTP/1.1 200 OK
Content-Type: application/gzip
```

> Enable *bundle downloading* via configuration.

```yaml
services:
  - name: acmecorp
    url: https://example.com/service/v1
    credentials:
      bearer:
        token: "bGFza2RqZmxha3NkamZsa2Fqc2Rsa2ZqYWtsc2RqZmtramRmYWxkc2tm"

bundles:
  authz:
    service: acmecorp
    resource: somedir/bundle.tar.gz
    persist: true
    polling:
      min_delay_seconds: 10
      max_delay_seconds: 20
    signing:
      keyid: my_global_key
      scope: read
```

> OPA will fetch bundles from `https://example.com/service/v1/somedir/bundle.tar.gz`.

```
https://example.com/service/v1/somedir/bundle.tar.gz
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ ^^^^^^^^^^^^^^^^^^^^^^^^^^^
services[0].url                resource
```

> If the `bundles[_].resource` field is *not defined*, the value defaults to `bundles/<name>` where the `name` is the *key* value in the configuration.
> For the example above this is `authz` and would default to `bundles/authz`.

> *Bundle names* can have any valid YAML characters in them, including `/`. 
> This can be useful when relying on default `resource` behavior with a name like `authz/bundle.tar.gz` which results in a `resource` of `bundles/authz/bundle.tar.gz`.

> OPA can optionally *persist activated bundles to disk* for *recovery* purposes.

1. To enable persistence, set the `bundles[_].persist` field to `true`.
2. When bundle persistence is enabled, OPA will attempt to *read the bundle from disk on startup*.
3. This allows OPA to *start with the most recently activated bundle* in case *OPA* cannot communicate with the *bundle server*.
   - OPA will try to *load and activate persisted bundles* on a best-effort basis.
   - Any *errors* encountered during the process will be surfaced in the *bundle’s status update*.
4. When communication between *OPA* and the *bundle server* is *restored*, the *latest bundle* is *downloaded*, *activated*, and *persisted*.
5. By default, bundles are persisted under the *current working directory* of the OPA process
   - (e.g., `./.opa/bundles/<bundle-name>/bundle.tar.gz`).
6. The optional `bundles[_].signing` field can be used to specify the `keyid` and `scope` that should be used for *verifying the signature of the bundle*.

### Caching

1. Services implementing the *Bundle Service API* should set the HTTP `Etag` header in bundle responses to identify the *revision of the bundle*.
2. OPA will include the `Etag` value in the `If-None-Match` header of bundle requests.
3. Services can check the `If-None-Match` header and reply with HTTP `304 Not Modified` if the *bundle has not changed* since the last update.

### HTTP Long Polling

> short polling

1. With the *periodic bundle downloading* (ie. `short polling`) technique, OPA sends *regular requests* to the remote HTTP server to pull any available bundle. 
2. If there is *no new bundle*, the server responds with a `304 Not Modified` response.
3. The *polling frequency* depends on the *latency* that the client can *tolerate* in retrieving updated information from the server.
4. A *drawback* of this method is that if the *acceptable latency* is *low*, then the polling frequency could *add unnecessary burden* on the server and/or network.

> long polling

1. HTTP Long Polling helps to *minimize server/network resource usage* and also *reduces the delay in delivery of updates to the client*.
2. When OPA sends a *long poll request* to the server, it *defers its response* until *an update is available* or *timeout has occurred*.
   - In case of a timeout, the server responds with a `304 Not Modified` response.

```yaml
services:
  - name: acmecorp
    url: https://example.com/service/v1
    credentials:
      bearer:
        token: "bGFza2RqZmxha3NkamZsa2Fqc2Rsa2ZqYWtsc2RqZmtramRmYWxkc2tm"

bundles:
  authz:
    service: acmecorp
    resource: somedir/bundle.tar.gz
    persist: true
    polling:
      long_polling_timeout_seconds: 10
    signing:
      keyid: my_global_key
      scope: read
```

1. With the above configuration, OPA sends a *long poll request* to the server with a timeout set to `10` seconds.
2. If the server supports `long polling`, OPA expects the server to set the `Content-Type` header to `application/vnd.openpolicyagent.bundles`. 
3. If the server does not support `long polling`, OPA will *fallback* to the *regular periodic polling*.

## Bundle File Format

> Bundle files are *gzipped tarballs* that contain *policies* and *data*.
> The *data files* in the bundle must be *organized hierarchically into directories* inside the tarball.
> The hierarchical organization indicates to OPA where to load the data files into the the *data* Document.

> You can list the content of a bundle with tar.

```
$ tar tzf bundle.tar.gz
.manifest
roles
roles/bindings
roles/bindings/data.json
roles/permissions
roles/permissions/data.json
http
http/example
http/example/authz
http/example/authz/authz.rego
```

1. The bundle contains *one policy file* (`authz.rego`) and *two data files* (`roles/bindings/data.json` and `roles/permissions/data.json`).
2. Bundle files may contain an optional `.manifest` file that stores bundle *metadata*.

> Some important details for bundle files

1. OPA will only load data files named `data.json` or `data.yaml` (which contain JSON or YAML respectively). Other JSON and YAML files will be *ignored*.
2. The `*.rego` policy files must be *valid Modules*

> *YAML data* loaded into OPA is *converted to JSON*.
> Since *JSON is a subset of YAML*, you are *not allowed* to use *binary* or *null keys* in *objects* and *boolean* and *number keys* are converted to *strings*.
> Also, YAML !!*binary tags* are *not supported*.

## Multiple Sources of Policy and Data

1. By default, when OPA is configured to download *policy* and *data* from a *bundle service*, the *entire content* of OPA’s policy and data *cache* is defined by the bundle.
2. However, if you need to load OPA with policy and data from *multiple sources*
   - you can implement your bundle service to *generate bundles* that are *scoped* to a *subset* of OPA’s policy and data cache.

> We recommend that whenever possible, you implement policy and data aggregation *centrally*, however, in some cases that’s not possible (e.g., due to latency requirements.).
> When using *multiple sources* there are *no ordering guarantees* for *which bundle loads first and takes over some root*.
> If multiple bundles *conflict*, but are *loaded at different times*, OPA may go into an *error state*.
> It is highly recommended to use the *health check* and *include bundle state*

1. To scope *bundles* to a *subset* of OPA’s policy and data cache
2. include a top-level `roots` key in the *bundle* that defines the *roots* of the `data` namespace that are *owned by the bundle*.

> For example, the following *manifest* would declare two roots (`acmecorp/policy` and `acmecorp/oncall`):

```json
{
    "roots": ["acmecorp/policy", "acmecorp/oncall"]
}
```

1. If OPA was loaded with a bundle containing this *manifest* it would *only erase and overwrite* policy and data *under* these roots.
2. Policy and data loaded *under other roots* is *left intact*.

> When OPA loads *scoped bundles*, it *validates* that

1. The *roots* are *not overlapping* (e.g., `a/b/c` and `a/b` are overlapped and will result in an error.)
   - Note: This is *not* enforced *across multiple bundles*. Only *within the same bundle manifest*.
2. The policies in the bundle are *contained under the roots*.
   - This is determined by inspecting the `package` statement in each of the *policy* files.
   - For example, given the *manifest* above
     - it would be an error to include a policy file containing `package acmecorp.other` because `acmecorp.other` is not contained in either of the roots.
3. The *data* in the bundle is *contained under the roots*.

> If *bundle validation fails*, OPA will report the *validation error* via the *Status API*.

## Debugging Your Bundles

> When you run OPA, you can provide bundle files over the command line.
> This allows you to *manually check* that your bundles include all of the files that you intended and that they are *structured correctly*.

```shell foo/example.rego
package httpapi.authz

# bob is alice's manager, and betty is charlie's.
subordinates := {"alice": [], "charlie": [], "bob": ["alice"], "betty": ["charlie"]}

default allow := false

# Allow users to get their own salaries.
allow {
    input.method == "GET"
    input.path == ["finance", "salary", input.user]
}

# Allow managers to get their subordinates' salaries.
allow {
    some username
    input.method == "GET"
    input.path = ["finance", "salary", username]
    subordinates[input.user][_] == username
}
```

```
$ ls foo
example.rego

$ opa build -b foo

$ tree
.
├── bundle.tar.gz
└── foo
    └── example.rego
    
$ opa run bundle.tar.gz
> input
undefined
>
> data
{
  "httpapi": {
    "authz": {
      "allow": false,
      "subordinates": {
        "alice": [],
        "betty": [
          "charlie"
        ],
        "bob": [
          "alice"
        ],
        "charlie": []
      }
    }
  }
}
>
> exit
```

## Signing

1. To ensure the *integrity* of *policies* (ie. the policies are coming from a *trusted source*)
   - policy bundles may be *digitally signed* so that industry-standard cryptographic primitives can *verify* their *authenticity*.
2. OPA supports *digital signatures* for *policy bundles*.
   - Specifically, a *signed bundle* is a normal OPA bundle that includes a file named `.signatures.json` that dictates *which files should be included in the bundle*, what their *SHA* hashes are, and of course is *cryptographically secure*.
3. When *OPA receives a new bundle*, it checks that it has been *properly signed* using *a (public) key* that OPA has been configured with *out-of-band*.
   - Only if that *verification succeeds* does OPA *activate* the *new bundle*
   - otherwise, OPA *continues using its existing bundle* and reports an *activation failure* via the *status API* and *error logging*.

> `opa run` performs *bundle signature verification* only when the `-b`/`--bundle` flag is given or when *Bundle downloading is enabled*.
> Sub-commands primarily used in *development* and *debug* environments (such as `opa eval`, `opa test`, etc.) *DO NOT verify bundle signatures* at this point in time.

## Delta Bundles

> *Snapshot* bundle

1. A regular *snapshot* bundle represents the *entirety* of OPA’s policy and data cache.
2. When a new *snapshot* bundle is *downloaded*, OPA will *erase and overwrite all the policy and data* in its cache before *activating the new bundle*.
3. We can optionally scope the *bundle* to *a subset of OPA’s policy and data cache* by defining the `roots` in the bundle’s `.manifest` file.

> retransmission

1. Although OPA *caches snapshot bundles* to *avoid unnecessary retransmission*, servers must still *retransmit the entire snapshot* when *any change occurs*.
2. If you need to *propagate small changes to bundles* without waiting for polling delays, consider using *delta bundles* in conjunction with *HTTP Long Polling*.

> *Delta* bundles

1. *Delta* bundles provide a *more efficient way* to make data changes by *containing patches to data* instead of *complete snapshots*.
2. *Delta* bundles are *structured differently* from *snapshot* bundles. 
   - A delta bundle contains a single `patch.json` file at the *root* of the bundle which includes a *JSON Patch* (i.e., an array of one or more JSON objects).
   - The *operations* in the *JSON Patch* will be applied to OPA’s *in-memory* store *in order*.

> *Delta* bundles currently *support updates to data only and not policies*.

## Implementations

> The Bundle API is simple. Most *HTTP servers* capable of *serving static files* will do.
> While *not strictly required* in all deployments, it is also good if the implementation supports

1. HTTP caching using the `ETag` header.
   - This keeps *OPA* from having to download a bundle unless the bundle’s content *have changes*.
2. Authentication
   - When exposing a bundle at a *remote endpoint*, it is often desirable to *protect the data* by requiring all requests to the endpoint to be authenticated.

# Decision Logs

1. OPA can *periodically* report decision logs to *remote HTTP servers*, using *custom plugins*, or to the *console output*; or any combination thereof.
2. The decision logs contain *events* that *describe policy queries*.
3. Each event includes the *policy* that was queried, the *input* to the query, *bundle metadata*, and other information that enables *auditing* and *offline debugging* of policy decisions.
4. When *decision logging* is enabled the OPA server will include a `decision_id` field in API calls that *return policy decisions*.

## Decision Log Service API

> OPA expects the service to *expose an API endpoint* that will *receive decision logs*.

```
POST /[<decision_logs.resource>] HTTP/1.1
Content-Encoding: gzip
Content-Type: application/json
```

1. The *resource* field is an *optional* configuration that can be used to *route logs to a specific endpoint* in the service by defining the *full path*.
   - If the resource path is not configured on the agent, updates will be sent to `/logs`.
2. The message body contains a *gzip compressed JSON array*.
   - Each *array element* (*event*) represents a *policy decision* returned by OPA.

```json
[
  {
    "labels": {
      "app": "my-example-app",
      "id": "1780d507-aea2-45cc-ae50-fa153c8e4a5a",
      "version": "v0.57.0"
    },
    "decision_id": "4ca636c1-55e4-417a-b1d8-4aceb67960d1",
    "bundles": {
      "authz": {
        "revision": "W3sibCI6InN5cy9jYXRhbG9nIiwicyI6NDA3MX1d"
      }
    },
    "path": "http/example/authz/allow",
    "input": {
      "method": "GET",
      "path": "/salary/bob"
    },
    "result": "true",
    "requested_by": "[::1]:59943",
    "timestamp": "2018-01-01T00:00:00.000000Z"
  }
]
```

> Decision log updates contain the following fields

| Field                     | Type          | Description                                                  |
| ------------------------- | ------------- | ------------------------------------------------------------ |
| `[_].labels`              | object        | Set of *key-value* pairs that uniquely identify the *OPA instance*. |
| `[_].decision_id`         | string        | Unique identifier generated for *each decision* for *traceability*. |
| `[_].trace_id`            | string        | Unique identifier of a trace generated for *each incoming request* for *traceability*.<br />This is a *hex* string representation compliant with the W3C trace-context specification. |
| `[_].span_id`             | string        | Unique identifier of a span in a trace to assist *traceability*.<br />This is a *hex* string representation compliant with the W3C trace-context specification. |
| `[_].bundles`             | object        | Set of *key-value* pairs describing the bundles which *contained policy* used to *produce the decision*. |
| `[_].bundles[_].revision` | string        | Revision of the bundle at the time of evaluation.            |
| `[_].path`                | string        | *Hierarchical policy decision path*, e.g., `/http/example/authz/allow`.<br />Receivers should tolerate *slash-prefixed* paths. |
| `[_].query`               | string        | Ad-hoc *Rego query* received by Query API.                   |
| `[_].input`               | any           | Input data provided in the `policy query`.                   |
| `[_].result`              | any           | *Policy decision* returned to the client, e.g., `true` or `false`. |
| `[_].requested_by`        | string        | Identifier for client that executed policy query, e.g., the client address. |
| `[_].timestamp`           | string        | RFC3999 timestamp of policy decision.                        |
| `[_].metrics`             | object        | *Key-value* pairs of *performance metrics*.                  |
| `[_].erased`              | array[string] | Set of *JSON Pointers* specifying fields in the event that were *erased*. |
| `[_].masked`              | array[string] | Set of *JSON Pointers* specifying fields in the event that were *masked*. |
| `[_].nd_builtin_cache`    | object        | Key-value pairs of non-deterministic builtin names, paired with objects specifying the input/output mappings for each unique invocation of that builtin during policy evaluation.<br />Intended for use in *debugging* and *decision replay*.<br />Receivers will need to decode the JSON using Rego’s JSON decoders. |
| `[_].req_id`              | number        | *Incremental* request identifier, and *unique* only to the *OPA instance*, for the request that started the policy query.<br />The attribute value is the *same* as the value present in others logs (*request*, *response*, and *print*) and could be used to *correlate* them all.<br />This attribute will be included just when OPA runtime is initialized in *server mode* and the log level is *equal to or greater than info*. |

1. If the decision log was *successfully uploaded to the remote service*, it should respond with an HTTP *2xx* status.
2. If the service responds with a *non-2xx* status, OPA will *requeue the last chunk containing decision log events* and upload it during the *next upload event*.
3. *OPA* also performs an *exponential backoff* to calculate the delay in *uploading the next chunk* when the remote service responds with a *non-2xx* status.
4. OPA *periodically* uploads decision logs to the remote service.
   - In order to conserve *network* and *memory* resources
     - OPA attempts to *fill up each upload chunk* with *as many events as possible* while respecting the user-specified `upload_size_limit_bytes` config option. 
   - OPA defines an *adaptive* (`soft`) *limit* that acts as a measure for *encoding as many decisions into each chunk as possible*.

## Local Decision Logs

> Local console logging of decisions can be enabled via the `console` config option. This does not require any remote server.

```yaml
decision_logs:
    console: true
```

> This will dump *all decisions* to the console.

## Masking Sensitive Data

> Policy queries may contain sensitive information in the `input` document that must be *removed* or *modified* before decision logs are uploaded to the remote API (e.g., usernames, passwords, etc.) Similarly, parts of the *policy decision itself* may be considered sensitive.

1. By default, OPA queries the `data.system.log.mask` path *prior to* encoding and uploading decision logs or calling custom decision log plugins.
2. OPA provides the *decision log event* as *input* to the policy query and expects the query to return a set of *JSON Pointers* that refer to *fields in the decision log event* to either **erase** or **modify**.

## Drop Decision Logs

> *Drop rules* filters all *decisions from logging* where the rule evaluates to `true`.

## Rate Limiting Decision Logs

1. There are scenarios where OPA may be *uploading* decisions *faster* than what the remote service is able to *consume*.
2. Although *OPA* provides a user-specified *buffer size limit* in bytes
   - it may be *difficult to determine* the ideal buffer size that will allow the service to consume logs without being overwhelmed.
3. The `max_decisions_per_second` config option allows users to set the *maximum number of decision log events* to buffer per *second*.
   - OPA will *drop events* if the rate limit is exceeded.
4. This option provides users more control over *how OPA buffers log events* and is an effective mechanism to make sure the service can successfully process incoming log events.

# Status

1. OPA can *periodically* report *status updates* to *remote HTTP servers*.
   - The updates contain status information for *OPA itself* as well as the *Bundles that have been downloaded and activated*.
2. OPA *sends status reports* whenever one of the following happens
   - *Bundles* are *downloaded* and *activated*
     - If the bundle *download* or *activation fails* for any reason, the status update will include error information describing the *failure*. This includes *Discovery bundles*.
   - A *plugin state* has changed
     - *All plugin status* is reported, and an update to *any plugin* will trigger a Status API report which contains the *latest state*.
3. The status updates will include a set of *labels* that uniquely identify the *OPA instance*.
   - OPA automatically includes an `id` value in the *label set* that provides a *globally unique identifier* or the running OPA instance and a `version` value that provides the version of OPA.

## Status Service API

> OPA expects the service to *expose an API endpoint* that will *receive status updates*.

```
POST /status[/<partition_name>] HTTP/1.1
Content-Type: application/json
```

1. The *partition name* is an *optional* path segment that can be used to *route status updates to different backends*.
2. If the partition name is not configured on the agent, updates will be sent to `/status`.

> Status updates contain the following fields:

| Field                                   | Type   | Description                                                  |
| --------------------------------------- | ------ | ------------------------------------------------------------ |
| `labels`                                | object | Set of *key-value* pairs that uniquely identify the *OPA instance*. |
| `bundles`                               | object | Set of objects describing the *status* for each bundle configured with OPA. |
| `bundles[_].name`                       | string | Name of bundle that the OPA instance is configured to download. |
| `bundles[_].active_revision`            | string | Opaque revision identifier of the *last successful activation*. |
| `bundles[_].last_request`               | string | RFC3339 timestamp of *last bundle request*.<br />This timestamp should be >= to the *successful request timestamp* in normal operation. |
| `bundles[_].last_successful_request`    | string | RFC3339 timestamp of *last successful bundle request*.<br />This timestamp should be >= to the *successful download timestamp* in normal operation. |
| `bundles[_].last_successful_download`   | string | RFC3339 timestamp of *last successful bundle download*.      |
| `bundles[_].last_successful_activation` | string | RFC3339 timestamp of *last successful bundle activation*.    |
| `bundles[_].metrics`                    | object | *Metrics from the last update of the bundle*.                |
| `bundles[_].code`                       | string | If present, indicates *error*(s) occurred *activating* this bundle. |
| `bundles[_].message`                    | string | Human readable messages describing the *error*(s).           |
| `bundles[_].http_code`                  | number | If present, indicates an *erroneous HTTP status code* that OPA received *downloading* this bundle. |
| `bundles[_].errors`                     | array  | Collection of detailed *parse* or *compile* errors that occurred during *activation* of this bundle. |
| `bundles[_].size`                       | number | Bundle size, in bytes                                        |
| `bundles[_].type`                       | string | Bundle type, either `snapshot` or `delta`                    |
| `discovery.name`                        | string | Name of *discovery bundle* that the OPA instance is configured to *download*. |
| `discovery.active_revision`             | string | Opaque revision identifier of the *last successful discovery activation*. |
| `discovery.last_request`                | string | RFC3339 timestamp of *last discovery bundle request*.<br />This timestamp should be >= to the *successful request timestamp* in normal operation. |
| `discovery.last_successful_request`     | string | RFC3339 timestamp of *last successful discovery bundle request*.<br />This timestamp should be >= to the *successful download timestamp* in normal operation. |
| `discovery.last_successful_download`    | string | RFC3339 timestamp of *last successful discovery bundle download*. |
| `discovery.last_successful_activation`  | string | RFC3339 timestamp of *last successful discovery bundle activation*. |
| `decision_logs.code`                    | string | If present, indicates *error*(s) occurred during *decision log upload event*. |
| `decision_logs.message`                 | string | Human readable messages describing the *error*(s).           |
| `decision_logs.http_code`               | number | If present, indicates an *erroneous HTTP status code* that OPA received during *a decision log upload event*. |
| `decision_logs.metrics`                 | object | *Metrics from the last decision log upload event*.           |
| `plugins`                               | object | A set of objects describing the state of *configured plugins* in OPA’s runtime. |
| `plugins[_].state`                      | string | The state of each plugin.                                    |
| `metrics.prometheus`                    | object | *Global performance metrics for the OPA instance*.           |

> If the *discovery bundle download or activation failed*, the status update will contain the following additional fields.

| Field               | Type   | Description                                                  |
| ------------------- | ------ | ------------------------------------------------------------ |
| `discovery.code`    | string | If present, indicates *error*(s) occurred.                   |
| `discovery.message` | string | Human readable messages describing the *error*(s).           |
| `discovery.errors`  | array  | Collection of detailed *parse* or *compile* errors that occurred during *activation*. |

> Services should reply with a `2xx` HTTP status if the status update is *processed successfully*.

## Local Status Logs

> Local console logging of *status updates* can be enabled via the `console` config option. This does not require any *remote server*.

```yaml
status:
    console: true
```

> This will dump all *status updates* to the console.

> Warning: Status update messages are somewhat infrequent but can be *very verbose*!
> The `metrics.prometheus` portion of the *status update* in particular can create *a considerable amount of log text at info level*.

## Prometheus Status Metrics

> Prometheus status metrics can be enabled via the prometheus config option.

```yaml
status:
    prometheus: true
```

# Discovery

1. OPA can be configured to *download bundles of policy and data*, *report status*, and *upload decision logs* to *remote endpoints*.
   - The discovery feature helps you *centrally* manage the OPA configuration for these features.
   - You should use the discovery feature if you want to avoid managing OPA configuration updates in a number of different locations.
2. When the discovery feature is enabled, OPA will *periodically* download a *discovery bundle*.
   - Like regular bundles, the *discovery bundle* may contain *JSON* and *Rego files*.
   - OPA will evaluate the data and policies contained in the *discovery bundle* to *generate the rest of the configuration*.
3. There are two main ways to *structure* the discovery bundle
   - Include *static JSON configuration files* that *define* the OPA configuration.
   - Include *Rego files* that can be evaluated to *produce* the OPA configuration.
     - If you need OPA to select which policy to *download dynamically* (e.g., based on environment variables like the region where OPA is running), use the second option.
4. If discovery is enabled, other features like *bundle downloading* and *status reporting* **cannot** be configured *manually*.
   - Similarly, *discovered configuration* cannot *override* the *original discovery settings* in the configuration file that OPA was booted with.
