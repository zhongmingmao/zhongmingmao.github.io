---
title: Kubernetes - etcd
mathjax: false
date: 2022-12-02 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/etcd-5874937.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
  - etcd
  - raft
---

# 概述

> `CoreOS` 基于 `Raft` 开发的分布式 `KV` 存储，可用于`服务发现`、`共享配置`和`一致性保障`（Leader 选举、分布式锁）

> A distributed, reliable key-value store for the most `critical data` of a `distributed system`

| Key        | Desc                                                         |
| ---------- | ------------------------------------------------------------ |
| `KV` 存储  | 将数据存储在`分层组织`的目录中，类似于标准的`文件系统`       |
| `监测变更` | 监测特定的 Key 或者目录以进行变更，并对值的更改做出反应      |
| 简单       | curl: HTTP + JSON                                            |
| 安全       | TLS 客户端证书认证，有一套完备的授权认证体系，但 Kubernetes 并没有使用 |
| 快速       | `单实例：1000 TPS、2000 QPS`                                 |
| 可靠       | 使用 `Raft` 算法保证`分布式一致性`                           |

<!-- more -->

> 主要功能

1. 基本的 `KV` 存储 - Kubernetes 使用最多
2. `监听`机制
3. Key 的`过期`和`续约`机制，用于`监控`和`服务发现`
4. 原生支持 `Compare And Swap` 和 `Compare And Delete`，用于 `Leader 选举`和`分布式锁`

> `KV` 存储

1. KV 存储，一般都会比关系型数据库`快`
2. 支持`动态`存储（`内存`，用于`索引`，基于 `B Tree`）和`静态`存储（`磁盘`，基于 `B+ Tree`）
3. `分布式存储`，可构成`多节点集群`
   - 高可用的 Kubernetes 集群，依赖于`高可用的 etcd 集群`
4. 存储方式：类似`目录结构`（`B+ Tree`）
   - 只有`叶子节点`才能真正`存储数据`，相当于`文件`
   - `非叶子节点`是`目录`（不能存储数据）

> 服务注册与发现

1. `强一致性`、`高可用`的服务存储目录
   - 基于 `Raft` 算法
2. 服务`注册` + 服务`健康监控`
   - 在 etcd 中注册服务，并对注册的服务配置 `Key TTL`，保持`心跳`以完成 Key 的`续约`

> 消息发布与订阅：`List & Watch`

1. 应用在启动时，主动从 etcd 获取一次配置信息，同时在 etcd 节点上注册一个 `Watcher` 并等待
2. 后续配置变更，etcd 会`实时通知`订阅者

# 安装

> 下载解压

```
ETCD_VER=v3.4.26
DOWNLOAD_URL=https://github.com/etcd-io/etcd/releases/download
rm -f /tmp/etcd-${ETCD_VER}-linux-arm64.tar.gz
rm -rf /tmp/etcd-download-test && mkdir -p /tmp/etcd-download-test
curl -L ${DOWNLOAD_URL}/${ETCD_VER}/etcd-${ETCD_VER}-linux-arm64.tar.gz -o /tmp/etcd-${ETCD_VER}-linux-arm64.tar.gz
tar xzvf /tmp/etcd-${ETCD_VER}-linux-arm64.tar.gz -C /tmp/etcd-download-test --strip-components=1
rm -f /tmp/etcd-${ETCD_VER}-linux-arm64.tar.gz
```

```
export ETCD_UNSUPPORTED_ARCH=arm64

$ /tmp/etcd-download-test/etcd --version
WARNING: Package "github.com/golang/protobuf/protoc-gen-go/generator" is deprecated.
	A future release of golang/protobuf will delete this package,
	which has long been excluded from the compatibility promise.

running etcd on unsupported architecture "arm64" since ETCD_UNSUPPORTED_ARCH is set
etcd Version: 3.4.26
Git SHA: a603c0798
Go Version: go1.19.9
Go OS/Arch: linux/arm64

$ /tmp/etcd-download-test/etcdctl version
etcdctl version: 3.4.26
API version: 3.4
```

> 本地启动

1. `listen-client-urls` and `listen-peer-urls`
   - specify the local addresses etcd server binds to for `accepting incoming connections`.

2. `advertise-client-urls` and `initial-advertise-peer-urls`
   - specify the addresses `etcd clients` or other `etcd members` should use to contact the `etcd server`.
   - The `advertise addresses` must be `reachable` from the `remote machines`.

```
$ /tmp/etcd-download-test/etcd \
 --listen-client-urls 'http://localhost:12379' \
 --advertise-client-urls 'http://localhost:12379' \
 --listen-peer-urls 'http://localhost:12380' \
 --initial-advertise-peer-urls 'http://localhost:12380' \
 --initial-cluster 'default=http://localhost:12380'
```

> 简单使用

```
$ /tmp/etcd-download-test/etcdctl --endpoints=localhost:12379 member list --write-out=table
+------------------+---------+---------+------------------------+------------------------+------------+
|        ID        | STATUS  |  NAME   |       PEER ADDRS       |      CLIENT ADDRS      | IS LEARNER |
+------------------+---------+---------+------------------------+------------------------+------------+
| c9ac9fc89eae9cf7 | started | default | http://localhost:12380 | http://localhost:12379 |      false |
+------------------+---------+---------+------------------------+------------------------+------------+

$ /tmp/etcd-download-test/etcdctl --endpoints=localhost:12379 put /k1 v1
OK

$ /tmp/etcd-download-test/etcdctl --endpoints=localhost:12379 put /k2 v2
OK

$ /tmp/etcd-download-test/etcdctl --endpoints=localhost:12379 get --prefix /
/k1
v1
/k2
v2

$ /tmp/etcd-download-test/etcdctl --endpoints=localhost:12379 get --prefix / --keys-only
/k1

/k2


$ /tmp/etcd-download-test/etcdctl --endpoints=localhost:12379 get /k1 --write-out=json | jq
{
  "header": {
    "cluster_id": 17478742799590500000,
    "member_id": 14532165781622268000,
    "revision": 3,
    "raft_term": 2
  },
  "kvs": [
    {
      "key": "L2sx",
      "create_revision": 2,
      "mod_revision": 2,
      "version": 1,
      "value": "djE="
    }
  ],
  "count": 1
}

$ echo -n 'L2sx' | base64 -d
/k1

$ echo -n 'djE=' | base64 -d
v1

$ /tmp/etcd-download-test/etcdctl --endpoints=localhost:12379 watch --prefix /
PUT
/k1
v1.1
```

```
$ /tmp/etcd-download-test/etcdctl --endpoints=localhost:12379 put /k v1
OK

$ /tmp/etcd-download-test/etcdctl --endpoints=localhost:12379 put /k v2
OK

$ /tmp/etcd-download-test/etcdctl --endpoints=localhost:12379 put /k v3
OK

$ /tmp/etcd-download-test/etcdctl --endpoints=localhost:12379 put /k v4
OK

$ /tmp/etcd-download-test/etcdctl --endpoints=localhost:12379 get /k -wjson | jq
{
  "header": {
    "cluster_id": 17478742799590500000,
    "member_id": 14532165781622268000,
    "revision": 8,
    "raft_term": 2
  },
  "kvs": [
    {
      "key": "L2s=",
      "create_revision": 5,
      "mod_revision": 8,
      "version": 4,
      "value": "djQ="
    }
  ],
  "count": 1
}

$ /tmp/etcd-download-test/etcdctl --endpoints=localhost:12379 watch --prefix / --rev 4
PUT
/k1
v1.1
PUT
/k
v1
PUT
/k
v2
PUT
/k
v3
PUT
/k
v4
```

> `etcdctl --debug` 类似于 `kubectl -v 9`

```
$ /tmp/etcd-download-test/etcdctl --endpoints=localhost:12379 get --prefix / --keys-only --debug
ETCDCTL_CACERT=
ETCDCTL_CERT=
ETCDCTL_COMMAND_TIMEOUT=5s
ETCDCTL_DEBUG=true
ETCDCTL_DIAL_TIMEOUT=2s
ETCDCTL_DISCOVERY_SRV=
ETCDCTL_DISCOVERY_SRV_NAME=
ETCDCTL_ENDPOINTS=[localhost:12379]
ETCDCTL_HEX=false
ETCDCTL_INSECURE_DISCOVERY=true
ETCDCTL_INSECURE_SKIP_TLS_VERIFY=false
ETCDCTL_INSECURE_TRANSPORT=true
ETCDCTL_KEEPALIVE_TIME=2s
ETCDCTL_KEEPALIVE_TIMEOUT=6s
ETCDCTL_KEY=
ETCDCTL_PASSWORD=
ETCDCTL_USER=
ETCDCTL_WRITE_OUT=simple
WARNING: 2022/06/10 02:34:55 Adjusting keepalive ping interval to minimum period of 10s
WARNING: 2022/06/10 02:34:55 Adjusting keepalive ping interval to minimum period of 10s
INFO: 2022/06/10 02:34:55 parsed scheme: "endpoint"
INFO: 2022/06/10 02:34:55 ccResolverWrapper: sending new addresses to cc: [{localhost:12379  <nil> 0 <nil>}]
/k

/k1

/k2
```

> Kubernetes 使用 etcd：/api/v1/namespaces/default 在 etcd 中的 Key 是`一致`的，Value 为 API 对象的 `Protobuf` 值

```
$ k get ns default -v 9
I0530 02:24:43.050391   90886 loader.go:372] Config loaded from file:  /home/zhongmingmao/.kube/config
I0530 02:24:43.057041   90886 round_trippers.go:435] curl -v -XGET  -H "Accept: application/json;as=Table;v=v1;g=meta.k8s.io,application/json;as=Table;v=v1beta1;g=meta.k8s.io,application/json" -H "User-Agent: kubectl/v1.22.2 (linux/arm64) kubernetes/8b5a191" 'https://192.168.191.138:6443/api/v1/namespaces/default'
I0530 02:24:43.063279   90886 round_trippers.go:454] GET https://192.168.191.138:6443/api/v1/namespaces/default 200 OK in 6 milliseconds
I0530 02:24:43.063301   90886 round_trippers.go:460] Response Headers:
I0530 02:24:43.063305   90886 round_trippers.go:463]     Content-Type: application/json
I0530 02:24:43.063308   90886 round_trippers.go:463]     X-Kubernetes-Pf-Flowschema-Uid: 2f005305-d15e-4252-bad1-edba0045f54d
I0530 02:24:43.063310   90886 round_trippers.go:463]     X-Kubernetes-Pf-Prioritylevel-Uid: e2605faa-93d6-4d86-9ed5-dfd861e777f6
I0530 02:24:43.063313   90886 round_trippers.go:463]     Content-Length: 1658
I0530 02:24:43.063315   90886 round_trippers.go:463]     Date: Tue, 30 May 2022 02:24:43 GMT
I0530 02:24:43.063318   90886 round_trippers.go:463]     Audit-Id: a5648a40-0205-44aa-a386-5b8e0775b8c9
I0530 02:24:43.063320   90886 round_trippers.go:463]     Cache-Control: no-cache, private
I0530 02:24:43.063452   90886 request.go:1181] Response Body: {"kind":"Table","apiVersion":"meta.k8s.io/v1","metadata":{"resourceVersion":"192"},"columnDefinitions":[{"name":"Name","type":"string","format":"name","description":"Name must be unique within a namespace. Is required when creating resources, although some resources may allow a client to request the generation of an appropriate name automatically. Name is primarily intended for creation idempotence and configuration definition. Cannot be updated. More info: http://kubernetes.io/docs/user-guide/identifiers#names","priority":0},{"name":"Status","type":"string","format":"","description":"The status of the namespace","priority":0},{"name":"Age","type":"string","format":"","description":"CreationTimestamp is a timestamp representing the server time when this object was created. It is not guaranteed to be set in happens-before order across separate operations. Clients may not set this value. It is represented in RFC3339 form and is in UTC.\n\nPopulated by the system. Read-only. Null for lists. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata","priority":0}],"rows":[{"cells":["default","Active","35m"],"object":{"kind":"PartialObjectMetadata","apiVersion":"meta.k8s.io/v1","metadata":{"name":"default","uid":"c3b0eddd-c1de-4ea6-87ac-079b96ea14a5","resourceVersion":"192","creationTimestamp":"2022-05-30T01:48:56Z","labels":{"kubernetes.io/metadata.name":"default"},"managedFields":[{"manager":"kube-apiserver","operation":"Update","apiVersion":"v1","time":"2022-05-30T01:48:56Z","fieldsType":"FieldsV1","fieldsV1":{"f:metadata":{"f:labels":{".":{},"f:kubernetes.io/metadata.name":{}}}}}]}}}]}
NAME      STATUS   AGE
default   Active   35m
```

> 双向 TLS 认证

| Options                         | Value                                               |
| ------------------------------- | --------------------------------------------------- |
| `--name`                        | mac-k8s                                             |
| `--initial-cluster`             | mac-k8s=https://192.168.191.138:2380                |
| `--listen-client-urls`          | https://127.0.0.1:2379,https://192.168.191.138:2379 |
| `--listen-peer-urls`            | https://192.168.191.138:2380                        |
| `--advertise-client-urls`       | https://192.168.191.138:2379                        |
| `--initial-advertise-peer-urls` | https://192.168.191.138:2380                        |
| `--cert-file`                   | /etc/kubernetes/pki/etcd/server.crt                 |
| `--key-file`                    | /etc/kubernetes/pki/etcd/server.key                 |
| `--trusted-ca-file`             | /etc/kubernetes/pki/etcd/ca.crt                     |
| `--peer-cert-file`              | /etc/kubernetes/pki/etcd/peer.crt                   |
| `--peer-key-file`               | /etc/kubernetes/pki/etcd/peer.key                   |
| `--peer-trusted-ca-file`        | /etc/kubernetes/pki/etcd/ca.crt                     |
| `--data-dir`                    | /var/lib/etcd                                       |
| `--snapshot-count`              | 10000                                               |

```
$ ps -ef | grep etcd
etcd \
--advertise-client-urls=https://192.168.191.138:2379 \
--cert-file=/etc/kubernetes/pki/etcd/server.crt \
--client-cert-auth=true \
--data-dir=/var/lib/etcd \
--initial-advertise-peer-urls=https://192.168.191.138:2380 \
--initial-cluster=mac-k8s=https://192.168.191.138:2380 \
--key-file=/etc/kubernetes/pki/etcd/server.key \
--listen-client-urls=https://127.0.0.1:2379,https://192.168.191.138:2379 \
--listen-metrics-urls=http://127.0.0.1:2381 \
--listen-peer-urls=https://192.168.191.138:2380 \
--name=mac-k8s \
--peer-cert-file=/etc/kubernetes/pki/etcd/peer.crt \
--peer-client-cert-auth=true \
--peer-key-file=/etc/kubernetes/pki/etcd/peer.key \
--peer-trusted-ca-file=/etc/kubernetes/pki/etcd/ca.crt \
--snapshot-count=10000 \
--trusted-ca-file=/etc/kubernetes/pki/etcd/ca.crt

$ ll /etc/kubernetes/pki/etcd/
total 32
-rw-r--r-- 1 root root 1086 May 30 01:48 ca.crt
-rw------- 1 root root 1679 May 30 01:48 ca.key
-rw-r--r-- 1 root root 1159 May 30 01:48 healthcheck-client.crt
-rw------- 1 root root 1675 May 30 01:48 healthcheck-client.key
-rw-r--r-- 1 root root 1196 May 30 01:48 peer.crt
-rw------- 1 root root 1675 May 30 01:48 peer.key
-rw-r--r-- 1 root root 1196 May 30 01:48 server.crt
-rw------- 1 root root 1679 May 30 01:48 server.key

$ docker ps | grep etcd
250b4938c5a5   2252d5eb703b                                        "etcd --advertise-cl…"   11 days ago   Up 11 days             k8s_etcd_etcd-mac-k8s_kube-system_bd32b743a6c609b1adf9b9de12339239_0
eacf4687ae2b   registry.aliyuncs.com/google_containers/pause:3.5   "/pause"                 11 days ago   Up 11 days             k8s_POD_etcd-mac-k8s_kube-system_bd32b743a6c609b1adf9b9de12339239_0

$ docker inspect --format="{{.State.Pid}}" 250b4938c5a5
8737

$ sudo nsenter -t 8737 -n ls -l /var/lib/etcd/member/
total 8
drwx------ 2 root root 4096 Jun 10 06:31 snap
drwx------ 2 root root 4096 May 30 01:48 wal

$ k get po -n kube-system etcd-mac-k8s -oyaml
...
spec:
  containers:
  ...
    volumeMounts:
    - mountPath: /var/lib/etcd
      name: etcd-data
  volumes:
	....
  - hostPath:
      path: /var/lib/etcd
      type: DirectoryOrCreate
    name: etcd-data

$ sudo ls -l /var/lib/etcd/member
total 8
drwx------ 2 root root 4096 Jun 10 12:06 snap
drwx------ 2 root root 4096 May 30 01:48 wal
```

> `etcd 的数据不能存储在容器中`，因为容器的 `rootfs` 是基于 `Overlay`，本身`性能很低`

| Options    | Desc                                                         |
| ---------- | ------------------------------------------------------------ |
| `--cacert` | verify certificates of TLS-enabled secure servers using this CA bundle |
| `--cert`   | identify secure client using this TLS certificate file       |
| `--key`    | identify secure client using this TLS key file               |

```
$ sudo /tmp/etcd-download-test/etcdctl --endpoints https://192.168.191.138:2379 \
--cacert /etc/kubernetes/pki/etcd/ca.crt \
--cert /etc/kubernetes/pki/etcd/server.crt \
--key /etc/kubernetes/pki/etcd/server.key \
member list -wtable
+------------------+---------+---------+------------------------------+------------------------------+------------+
|        ID        | STATUS  |  NAME   |          PEER ADDRS          |         CLIENT ADDRS         | IS LEARNER |
+------------------+---------+---------+------------------------------+------------------------------+------------+
| 1d6b54ee7ec32989 | started | mac-k8s | https://192.168.191.138:2380 | https://192.168.191.138:2379 |      false |
+------------------+---------+---------+------------------------------+------------------------------+------------+

$ sudo /tmp/etcd-download-test/etcdctl --endpoints https://192.168.191.138:2379 \
--cacert /etc/kubernetes/pki/etcd/ca.crt \
--cert /etc/kubernetes/pki/etcd/server.crt \
--key /etc/kubernetes/pki/etcd/server.key \
get --prefix /registry/namespaces --keys-only
/registry/namespaces/calico-apiserver

/registry/namespaces/calico-system

/registry/namespaces/default

/registry/namespaces/kube-node-lease

/registry/namespaces/kube-public

/registry/namespaces/kube-system

/registry/namespaces/tigera-operator

$ sudo /tmp/etcd-download-test/etcdctl --endpoints https://192.168.191.138:2379 \
--cacert /etc/kubernetes/pki/etcd/ca.crt \
--cert /etc/kubernetes/pki/etcd/server.crt \
--key /etc/kubernetes/pki/etcd/server.key \
get /registry/namespaces/default -wjson | jq
{
  "header": {
    "cluster_id": 12875449911175959000,
    "member_id": 2119881432913619500,
    "revision": 32955,
    "raft_term": 2
  },
  "kvs": [
    {
      "key": "L3JlZ2lzdHJ5L25hbWVzcGFjZXMvZGVmYXVsdA==",
      "create_revision": 192,
      "mod_revision": 192,
      "version": 1,
      "value": "azhzAAoPCgJ2MRIJTmFtZXNwYWNlEogCCu0BCgdkZWZhdWx0EgAaACIAKiRjM2IwZWRkZC1jMWRlLTRlYTYtODdhYy0wNzliOTZlYTE0YTUyADgAQggIiKzVowYQAFomChtrdWJlcm5ldGVzLmlvL21ldGFkYXRhLm5hbWUSB2RlZmF1bHR6AIoBfQoOa3ViZS1hcGlzZXJ2ZXISBlVwZGF0ZRoCdjEiCAiIrNWjBhAAMghGaWVsZHNWMTpJCkd7ImY6bWV0YWRhdGEiOnsiZjpsYWJlbHMiOnsiLiI6e30sImY6a3ViZXJuZXRlcy5pby9tZXRhZGF0YS5uYW1lIjp7fX19fUIAEgwKCmt1YmVybmV0ZXMaCAoGQWN0aXZlGgAiAA=="
    }
  ],
  "count": 1
}

$ echo -n 'azhzAAoPCgJ2MRIJTmFtZXNwYWNlEogCCu0BCgdkZWZhdWx0EgAaACIAKiRjM2IwZWRkZC1jMWRlLTRlYTYtODdhYy0wNzliOTZlYTE0YTUyADgAQggIiKzVowYQAFomChtrdWJlcm5ldGVzLmlvL21ldGFkYXRhLm5hbWUSB2RlZmF1bHR6AIoBfQoOa3ViZS1hcGlzZXJ2ZXISBlVwZGF0ZRoCdjEiCAiIrNWjBhAAMghGaWVsZHNWMTpJCkd7ImY6bWV0YWRhdGEiOnsiZjpsYWJlbHMiOnsiLiI6e30sImY6a3ViZXJuZXRlcy5pby9tZXRhZGF0YS5uYW1lIjp7fX19fUIAEgwKCmt1YmVybmV0ZXMaCAoGQWN0aXZlGgAiAA==' | base64 -d
k8s

v1	Namespace�
�
default"*$c3b0eddd-c1de-4ea6-87ac-079b96ea14a52��գZ&

kube-apiserverUpdatev��գFieldsV1:I
G{"f:metadata":{"f:labels":{".":{},"f:kubernetes.io/metadata.name":{}}}}B


kubernetes
Active"
```

# TTL & CAS

1. `TTL` -- Kubernetes 中用的比较少
   - 常用于`分布式锁`，用于保证锁的`实时有效性`
2. `CAS` -- 由 `CPU` 架构保证`原子性`
   - 在对 Key `赋值`时，`客户端`需要提供一些`条件`，当`条件满足`时，才能赋值成功

> 常用条件

| Key         | Desc               |
| ----------- | ------------------ |
| `prevExist` | Key 当前`是否存在` |
| `prevValue` | Key 当前的`值`     |
| `prevIndex` | Key 当前的 `Index` |

# Raft

> Raft 基于 `Quorum` 机制，即`多数同意原则`，任何的变更都需要`超过半数`的成员确认

> 日志模块一开始将数据记录到本地，尚未确认，一致性模块得到`超过半数`的成员确认后，才会将数据`持久化`到状态机

![image-20230610145751934](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610145751934.png)

## 协议

> http://thesecretlivesofdata.com/raft/

> Raft is a protocol for implementing `distributed consensus`

> 节点可以有 3 种状态：Follower、Candidate、Leader

| State       | Desc               |
| ----------- | ------------------ |
| `Follower`  |                    |
| `Candidate` | 参与`选举`和`投票` |
| `Leader`    |                    |

> 与 `ZAB` 协议类似：`Leader Election` -> `Log Replication`

### An Example

#### Leader Election

> 所有节点的初始状态为 `Follower`，等待 `Leader` 的心跳

![image-20230610164945195](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610164945195.png)

> 节点启动时，设置`随机`的 `Election Timeout`，即处于 Follower 状态的超时时间
> 一旦超过这个时长都没有收到 `Leader` 的心跳，会变成 `Candidate`

![image-20230610164927240](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610164927240.png)

> Follower 变成 Candidate 后，会去向其他节点发起 `拉票`

![image-20230610164846620](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610164846620.png)

> 其他节点此时也没有跟从的 Leader，所以可以`接收拉票`

![image-20230610164810657](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610164810657.png)

> A 想当 Leader，B 和 C 此时没有 Leader，`直接同意`，超过`半数`，A 成为了 Leader

![image-20230610164712434](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610164712434.png)

#### Log Replication

> `选主`完成后，所有的`变更`都需要经过 `Leader`

![image-20230610164640877](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610164640877.png)

> 每个变更都会先在 `Leader` 上新增一个 `Log entry`，但此时的 `Log entry` 是`尚未确认`，所以不会变更`状态机`

> 如果此时 A `宕机`，对应的 Log entry 也会`丢失`

![image-20230610164609144](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610164609144.png)

> 通过`心跳`，将未经确认的 Log entry `传播`到其他 Follower（也是写入到 Log entry）

![image-20230610165100549](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610165100549.png)

> Leader 会等待`超过半数`的成员确认，然后才会`确认`本地的 Log entry，并提交到`状态机`

![image-20230610165352509](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610165352509.png)

![image-20230610165552989](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610165552989.png)

> Leader Commit 后，通过`心跳`通知 Follower 也可以 Commit（从 Log entry 提交到状态机）

![image-20230610165757709](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610165757709.png)

> 此时达成了`分布式共识`

![image-20230610170650303](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610170650303.png)

> 上述过程有点类似于 `Two-stage confirmation`，主要区别
> We use Raft to get `high availability` by replicating the data on multiple servers, where all servers do the same thing.
> This differs from `two-phase commit` in that 2PC `does not help with availability`, and all the `participant` servers here `perform different operations`.

![2pc](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/2pc.png)

### Detail

#### Leader Election

> The election timeout is the amount of time a follower waits until `becoming a candidate`.
> The election timeout is randomized to be between `150ms` and `300ms`.

![image-20230610184909346](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610184909346.png)

> Follower 变成 Candidate 后，首先`给自己投票`

![image-20230610184941889](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610184941889.png)

> 然后请求其它节点给自己投票

![image-20230610185020258](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610185020258.png)

> 如果其它节点在这个 Term 内未投票，会直接给 Candidate 投票

![image-20230610185045622](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610185045622.png)

> 完成投票后，其它节点会重置自身的 election timeout（不会变成 Candidate）

![image-20230610185123440](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610185123440.png)

> 得到超过半数的成员投票后，Candidate 成为了 Leader

![image-20230610185144867](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610185144867.png)

#### Log Replication

> Leader 通过`心跳` （`heartbeat timeout` ）发送它本身的 `Append Entries` 到其它 Follower

![image-20230610185201353](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610185201353.png)

> Follower 会响应每个 `Append Entries` 消息

![image-20230610185226841](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610185226841.png)

> 只要 Follower 能按时收到 Leader 的心跳，就会维持当前的选举周期（认可当前的 Leader），不会变成 Candidate

![image-20230610185305543](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610185305543.png)

> 停掉 Leader 后，会发生重新选举

![image-20230610185345604](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610185345604.png)

> 其它节点因为没有收到 Leader 的心跳，变成了 Candidate，发起新一轮的选举

![image-20230610185427299](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610185427299.png)

> 存活节点超过半数，能成功选举

> Requiring a `majority` of votes `guarantees` that `only one leader` can be elected `per term`.

![image-20230610185904508](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610185904508.png)

> 如果在同一个选举任期内，两个节点同时变成 Candidate，有可能会发生`投票分裂`

![image-20230610190240337](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610190240337.png)

> 票数相等，但没有超过半数，选举失败

![image-20230610190510048](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610190510048.png)

> `随机`等待一段时间后，继续下一轮选举，直到票数超过半数

> 因此选择`奇数`个节点，尽快完成选举，选举成功之前，集群是`不可写`的

![image-20230610190717642](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610190717642.png)

![image-20230610190909297](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610190909297.png)

> Leader 需要将`所有变更`通过`心跳`（Append Entries message）传播到所有 Follower

![image-20230610191445258](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610191445258.png)

> 客户端向 Leader 发送请求，Leader 会记录 Log entry，此时尚未提交到`状态机`（持久化的状态）

![image-20230610191720497](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610191720497.png)

> 在`下一个心跳`，Leader 会将 Log entry 发送给 Follower 

![image-20230610191904403](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610191904403.png)

> 得到超过半数（`包括 Leader 自己`）的成员确认已经写入了日志，Leader 会完成提交（`状态机`）

![image-20230610192027316](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610192027316.png)

> `Leader 完成提交`后，此时可以`响应客户端`
> 等待`下个心跳`，告知 Follower，该 Log entry 已提交，Follower 也可以完成提交了

> 在 etcd 中是一个配置参数（默认是`弱一致性`，能满足绝大部分场景）
> `弱一致性`：只要 `Leader` 提交后，就响应客户端；`强一致性`：等待`超过半数的 Follow` 也提交后，才响应客户端

![image-20230610192146944](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610192146944.png)

> 即便在发生`网络分区`时，Raft 协议依然能保持`一致性`

![image-20230610192729472](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610192729472.png)

> 出现网络分区，原有的 Leader 在一个`少于半数`的分区，另一个`多于半数`的分区完成了`新一轮的选举`（选举任期更大）

![image-20230610193047687](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610193047687.png)

> `少于半数`的分区，`可读不可写`，处于`只读`状态，且`任期更低`

![image-20230610193632516](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610193632516.png)

> `多于半数`的分区，`可读可写`，且`任期更高`，优先级更高

![image-20230610194137472](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610194137472.png)

> 网络分区恢复后，以`高选举任期`的 Leader 为准，低选举任期的 Leader `降级`为 Follower

![image-20230610194212805](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610194212805.png)

> 发生网络分区时`少于半数`的分区，会`放弃`尚未提交的 Log entry，接收并提交新 Leader 的日志，最后集群`恢复一致`

![image-20230610194418407](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610194418407.png)

## Learner

> Raft `4.2.1` 引入 Learner：Learner `只接收数据`，但`不参与投票`，集群的 `Quorum`（大多数） 不会发生变化

> 新启动的节点与 Leader 差异很大，默认以 Learner 身份启动，只有当 Learner `完成数据同步`后，才有可能成为 Follower

![image-20230610194816703](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610194816703.png)

## 安全性

>保证每个节点都执行`相同的序列`

1. `选举安全性`
   - 每个选举任期，只能选举出 1 个 Leader
2. `Leader 日志完整性`
   - 日志在某个任期被提交后，`后续任期`的 Leader 都必须包含该日志
   - 选举阶段：Candidate 本身的`偏移`必须超过半数成员，才能赢得选举
     - Follower 只会投票给（`<Term,Index>`）`不比自己小`的 Candidate，否则拒绝该投票请求

# 实现

## WAL

> Write-`ahead` logging

> WAL 为二进制，可以通过`etcd-dump-logs`工具分析，数据结构为 LogEntry
> 由 4 部分组成：`type`、`term`、`index`、`data`

| Field | Desc                                                         |
| ----- | ------------------------------------------------------------ |
| type  | 0 - `Normal`<br />1 - `ConfChange`：`etcd 本身的配置`发生变更，如有新节点加入 |
| term  | 选举任期                                                     |
| index | `变更序号`，严格`递增`                                       |
| data  | 二进制，为 `protobuf` 格式<br />Raft 本身不关心 data，Raft 关注的只是`分布式一致性` |

## Store V3

> etcd 为 KV 存储，只需要处理好 `Key 的索引` 即可

> 内存：kvindex - `<Key,List<Reversion>>` ；磁盘：boltdb - `<Reversion,Key-Value>`

![image-20230610203339949](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230610203339949.png)

1. Store 分为两部分
   - `kvindex`
     - 在`内存`中的`索引`，基于 `B Tree`，由 Google 开源，用 Go 实现
   - `boltdb`
     - 在`磁盘`上的`存储`，基于 `B+ Tree`，是 `backend` 的一种实现（`backend` 可以对接多种存储实现）
     - boltdb 是一个`单机的支持事务的 KV 存储`，etcd 的事务是基于 boltdb 的事务实现的
       - etcd 在 boltdb 中存储的 `Key` 是 `reversion`，`Value` 为 etcd 自己的 `KV 组合`
         - reversion 组成：`main rev`（事务） + `sub rev`（事务内的操作）
       - etcd 会在 boltdb 中`存储每一个版本`，从而实现`多版本`机制
         - etcd 支持设置 `compact`，用来控制某个 Key 的`历史版本数量`
2. 内存中的 kvindex 保存的是 `Key` 和 `Reversion` 的映射关系，用于加速查询
3. `WatchableStore`：支持`监听`机制；`lessor`：支持 `TTL`

## 写入

> etcd 对 Raft 协议的实现

![](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/etcd-raft-impl.png)

1. 第 3 步，一致性模块接收到 `Propose` 请求后，会放入内存中 raftLog 的 `unstable` 区域
2. 第 4 步，`同时`发生：`WAL` + `RPC`
   - WAL 需要通过周期性的 `fsync` 持久化到磁盘上
   - WAL 无法通过 ectdctl 读取，只能通过 `etcd-dump-logs` 工具获取
   - Follower 接收到请求后，执行的操作也是类似的：`raftLog` + `WAL`
3. 第 5 步，收到超过半数的成员确认
   - 从 raftLog 中的 `unstable` 区域，移动到 `committed` 区域
   - 将 `WAL` 提交到`状态机`（`MVCC` 模块）
   - MVCC - 最终的状态机
     - etcd 是`多读少写`
       - TreeIndex + BoltDB - 加快读
       - Leader + Follower - 支持读
     - `TreeIndex` - `内存 B tree`
       - Key 为用户写入的 `Key`，Value 为 `Reversion`
       - `modified:<4,0>` - 事务 ID 为 4，事务中的第 1 个操作，为当前的 Reversion
       - `generations` - 历史变更记录
     - `BoltDB` - `磁盘 B+Tree`
       - Key 为 `Reversion`，Value 为 `Key-Value`
4. 在 Leader 提交到 MVCC 成功后，会更新 `MatchIndex`
   - 该 MatchIndex 会在`下一次心跳`传播到 Follower ，Follower 也会将 WAL 提交到 MVCC
   - 集群达成了`分布式共识`，时间上差了一个`心跳`

> 数据一致性（多数确认），`MatchIndex`

![image-20230611131420391](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230611131420391.png)

> revision 为`全局变量`

```
$ /tmp/etcd-download-test/etcdctl --endpoints=localhost:12379 put k v1
OK

$ /tmp/etcd-download-test/etcdctl --endpoints=localhost:12379 get k -wjson | jq
{
  "header": {
    "cluster_id": 17478742799590500000,
    "member_id": 14532165781622268000,
    "revision": 2,
    "raft_term": 2
  },
  "kvs": [
    {
      "key": "aw==",
      "create_revision": 2,
      "mod_revision": 2,
      "version": 1,
      "value": "djE="
    }
  ],
  "count": 1
}

$ echo -n 'aw==' | base64 -d
k

$ echo -n 'djE=' | base64 -d
v1

$ /tmp/etcd-download-test/etcdctl --endpoints=localhost:12379 put k v2
OK

$ /tmp/etcd-download-test/etcdctl --endpoints=localhost:12379 get k -wjson | jq
{
  "header": {
    "cluster_id": 17478742799590500000,
    "member_id": 14532165781622268000,
    "revision": 3,
    "raft_term": 2
  },
  "kvs": [
    {
      "key": "aw==",
      "create_revision": 2,
      "mod_revision": 3,
      "version": 2,
      "value": "djI="
    }
  ],
  "count": 1
}

$ /tmp/etcd-download-test/etcdctl --endpoints=localhost:12379 get k --rev=0
k
v2

$ /tmp/etcd-download-test/etcdctl --endpoints=localhost:12379 get k --rev=2
k
v1

$ /tmp/etcd-download-test/etcdctl --endpoints=localhost:12379 get k --rev=3
k
v2
```

> `resourceVersion` 即 etcd 中的 `mod_revision`
> `乐观锁`：多个 `Controller` 修改同一个 API 对象

```
$ k get po -n kube-system etcd-mac-k8s -oyaml | grep resourceVersion
  resourceVersion: "448"

$ sudo /tmp/etcd-download-test/etcdctl --endpoints https://192.168.191.138:2379 \
--cacert /etc/kubernetes/pki/etcd/ca.crt \
--cert /etc/kubernetes/pki/etcd/server.crt \
--key /etc/kubernetes/pki/etcd/server.key \
get --prefix /registry/pods --keys-only | grep etcd
/registry/pods/kube-system/etcd-mac-k8s

$ sudo /tmp/etcd-download-test/etcdctl --endpoints https://192.168.191.138:2379 \
--cacert /etc/kubernetes/pki/etcd/ca.crt \
--cert /etc/kubernetes/pki/etcd/server.crt \
--key /etc/kubernetes/pki/etcd/server.key \
get /registry/pods/kube-system/etcd-mac-k8s -wjson | jq
{
  "header": {
    "cluster_id": 12875449911175959000,
    "member_id": 2119881432913619500,
    "revision": 10746,
    "raft_term": 2
  },
  "kvs": [
    {
      "key": "L3JlZ2lzdHJ5L3BvZHMva3ViZS1zeXN0ZW0vZXRjZC1tYWMtazhz",
      "create_revision": 235,
      "mod_revision": 448,
      "version": 6,
      "value": "xxxx"
    }
  ],
  "count": 1
}
```

## Watch

1. Watcher 分类
   - `KeyWatcher`：监听`固定`的 Key
   - `RangeWatcher`：监听`范围`的 Key
2. WatcherGroup 分类
   - `synced`：Watcher 数据已经完成同步
   - `unsynced`：Watcher 数据同步中
3. etcd 发起请求，携带了 `revision` 参数
   - revision 参数 `>` etcd 当前的 revision
     - 将该 Watcher 放置于 `synced` 的 WatcherGroup
   - revision 参数 `<` etcd 当前的 revision
     - 将该 Watcher 放置于 `unsynced` 的 WatcherGroup
     - 在 etcd 后端启动一个 `goroutine` 从 `BoltDB` 读取数据
       - 完成同步后，将 Watcher 迁移到 `synced` 的 WatcherGroup，并将数据发给客户端

# 灾备

> etcdctl `snapshot save` + etcdctl `snapshot restore`



# 容量

1. 单个对象不超过 `1.5M`
2. 默认容量 `2G`，不超过 `8G` - 因为`内存`有限制
   - 直接访问磁盘上的 `BoltDB` 是非常低效的， 将 `BoltDB` 通过 `mmap` 的方式直接`映射到内存`
   - `TreeIndex` 本身也要占用内存

>设置 ectd 存储大小：`--quota-backend-bytes`

```
$ /tmp/etcd-download-test/etcd --listen-client-urls 'http://localhost:12379' \
 --advertise-client-urls 'http://localhost:12379' \
 --listen-peer-urls 'http://localhost:12380' \
 --initial-advertise-peer-urls 'http://localhost:12380' \
 --initial-cluster 'default=http://localhost:12380' \
 --quota-backend-bytes=$((16*1024*1024))
 
$ /tmp/etcd-download-test/etcdctl --endpoints http://localhost:12379 endpoint status -wtable
+------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------+
|        ENDPOINT        |        ID        | VERSION | DB SIZE | IS LEADER | IS LEARNER | RAFT TERM | RAFT INDEX | RAFT APPLIED INDEX | ERRORS |
+------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------+
| http://localhost:12379 | c9ac9fc89eae9cf7 |  3.4.26 |   20 kB |      true |      false |         2 |          4 |                  4 |        |
+------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------+

$ /tmp/etcd-download-test/etcdctl --endpoints http://localhost:12379 alarm list

$ /tmp/etcd-download-test/etcdctl --endpoints http://localhost:12379 put k v1
OK

$ /tmp/etcd-download-test/etcdctl --endpoints http://localhost:12379 get k
k
v1
```

> 写满 ectd：`etcdserver: mvcc: database space exceeded`

```
$ while [ 1 ]; do dd if=/dev/urandom bs=1024 count=1024 | ETCDCTL_API=3 /tmp/etcd-download-test/etcdctl --endpoints http://localhost:12379 put key || break; done
1024+0 records in
1024+0 records out
1048576 bytes (1.0 MB, 1.0 MiB) copied, 0.0221458 s, 47.3 MB/s
OK
1024+0 records in
1024+0 records out
1048576 bytes (1.0 MB, 1.0 MiB) copied, 0.0178969 s, 58.6 MB/s
OK
1024+0 records in
1024+0 records out
1048576 bytes (1.0 MB, 1.0 MiB) copied, 0.0131086 s, 80.0 MB/s
OK
1024+0 records in
1024+0 records out
1048576 bytes (1.0 MB, 1.0 MiB) copied, 0.0169962 s, 61.7 MB/s
OK
1024+0 records in
1024+0 records out
1048576 bytes (1.0 MB, 1.0 MiB) copied, 0.0102694 s, 102 MB/s
OK
1024+0 records in
1024+0 records out
1048576 bytes (1.0 MB, 1.0 MiB) copied, 0.0127638 s, 82.2 MB/s
OK
1024+0 records in
1024+0 records out
1048576 bytes (1.0 MB, 1.0 MiB) copied, 0.0170057 s, 61.7 MB/s
OK
1024+0 records in
1024+0 records out
1048576 bytes (1.0 MB, 1.0 MiB) copied, 0.0252865 s, 41.5 MB/s
OK
1024+0 records in
1024+0 records out
1048576 bytes (1.0 MB, 1.0 MiB) copied, 0.0158758 s, 66.0 MB/s
OK
1024+0 records in
1024+0 records out
1048576 bytes (1.0 MB, 1.0 MiB) copied, 0.012092 s, 86.7 MB/s
OK
1024+0 records in
1024+0 records out
1048576 bytes (1.0 MB, 1.0 MiB) copied, 0.0134426 s, 78.0 MB/s
OK
1024+0 records in
1024+0 records out
1048576 bytes (1.0 MB, 1.0 MiB) copied, 0.010848 s, 96.7 MB/s
OK
1024+0 records in
1024+0 records out
1048576 bytes (1.0 MB, 1.0 MiB) copied, 0.010219 s, 103 MB/s
OK
1024+0 records in
1024+0 records out
1048576 bytes (1.0 MB, 1.0 MiB) copied, 0.011172 s, 93.9 MB/s
OK
1024+0 records in
1024+0 records out
1048576 bytes (1.0 MB, 1.0 MiB) copied, 0.00987527 s, 106 MB/s
OK
1024+0 records in
1024+0 records out
1048576 bytes (1.0 MB, 1.0 MiB) copied, 0.00964272 s, 109 MB/s
OK
1024+0 records in
1024+0 records out
1048576 bytes (1.0 MB, 1.0 MiB) copied, 0.0196146 s, 53.5 MB/s
{"level":"warn","ts":"2022-06-11T07:08:11.751634Z","caller":"clientv3/retry_interceptor.go:62","msg":"retrying of unary invoker failed","target":"endpoint://client-74c1ff1a-cb7e-45ea-b7dd-2c6523ee0e1b/localhost:12379","attempt":0,"error":"rpc error: code = ResourceExhausted desc = etcdserver: mvcc: database space exceeded"}
Error: etcdserver: mvcc: database space exceeded
```

> `可读不可写`

```
$ /tmp/etcd-download-test/etcdctl --endpoints http://localhost:12379 get k
k
v1

$ /tmp/etcd-download-test/etcdctl --endpoints http://localhost:12379 put k v2
{"level":"warn","ts":"2022-06-11T07:09:56.959955Z","caller":"clientv3/retry_interceptor.go:62","msg":"retrying of unary invoker failed","target":"endpoint://client-d7d9269b-6342-463a-a07d-2bfd6aa216dd/localhost:12379","attempt":0,"error":"rpc error: code = ResourceExhausted desc = etcdserver: mvcc: database space exceeded"}
Error: etcdserver: mvcc: database space exceeded
```

> 告警：`NOSPACE`

```
$ tmp/etcd-download-test/etcdctl --endpoints http://localhost:12379 alarm list
memberID:14532165781622267127 alarm:NOSPACE

$ /tmp/etcd-download-test/etcdctl --endpoints http://localhost:12379 endpoint status -wtable
+------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------------------------------+
|        ENDPOINT        |        ID        | VERSION | DB SIZE | IS LEADER | IS LEARNER | RAFT TERM | RAFT INDEX | RAFT APPLIED INDEX |             ERRORS             |
+------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------------------------------+
| http://localhost:12379 | c9ac9fc89eae9cf7 |  3.4.26 |   22 MB |      true |      false |         2 |         25 |                 25 |  memberID:14532165781622267127 |
|                        |                  |         |         |           |            |           |            |                    |                 alarm:NOSPACE  |
+------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------------------------------+
```

> 清理碎片，依然无法解决

```
$ /tmp/etcd-download-test/etcdctl --endpoints http://localhost:12379 defrag
Finished defragmenting etcd member[http://localhost:12379]

$ /tmp/etcd-download-test/etcdctl --endpoints http://localhost:12379 endpoint status -wtable
+------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------------------------------+
|        ENDPOINT        |        ID        | VERSION | DB SIZE | IS LEADER | IS LEARNER | RAFT TERM | RAFT INDEX | RAFT APPLIED INDEX |             ERRORS             |
+------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------------------------------+
| http://localhost:12379 | c9ac9fc89eae9cf7 |  3.4.26 |   17 MB |      true |      false |         2 |         25 |                 25 |  memberID:14532165781622267127 |
|                        |                  |         |         |           |            |           |            |                    |                 alarm:NOSPACE  |
+------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------------------------------+

$ /tmp/etcd-download-test/etcdctl --endpoints http://localhost:12379 put k v2
{"level":"warn","ts":"2022-06-11T07:18:29.213165Z","caller":"clientv3/retry_interceptor.go:62","msg":"retrying of unary invoker failed","target":"endpoint://client-33c22919-1bd8-4964-bf10-a8b2092e35cb/localhost:12379","attempt":0,"error":"rpc error: code = ResourceExhausted desc = etcdserver: mvcc: database space exceeded"}
Error: etcdserver: mvcc: database space exceeded

$ /tmp/etcd-download-test/etcdctl --endpoints http://localhost:12379 alarm list
memberID:14532165781622267127 alarm:NOSPACE
```

> 压缩历史版本数量

```
$ /tmp/etcd-download-test/etcdctl --endpoints http://localhost:12379 get key -wjson | jq '.header.revision'
18

$ /tmp/etcd-download-test/etcdctl --endpoints http://localhost:12379 compact 18
compacted revision 18

$ /tmp/etcd-download-test/etcdctl --endpoints http://localhost:12379 defrag
Finished defragmenting etcd member[http://localhost:12379]

$ /tmp/etcd-download-test/etcdctl --endpoints http://localhost:12379 endpoint status -wtable
+------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------------------------------+
|        ENDPOINT        |        ID        | VERSION | DB SIZE | IS LEADER | IS LEARNER | RAFT TERM | RAFT INDEX | RAFT APPLIED INDEX |             ERRORS             |
+------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------------------------------+
| http://localhost:12379 | c9ac9fc89eae9cf7 |  3.4.26 |  1.1 MB |      true |      false |         2 |         52 |                 52 |  memberID:14532165781622267127 |
|                        |                  |         |         |           |            |           |            |                    |                 alarm:NOSPACE  |
+------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------------------------------+

$ /tmp/etcd-download-test/etcdctl --endpoints http://localhost:12379 put k v2
{"level":"warn","ts":"2022-06-11T07:24:40.719917Z","caller":"clientv3/retry_interceptor.go:62","msg":"retrying of unary invoker failed","target":"endpoint://client-914df447-c2c2-4fba-9446-71d696ca2ba5/localhost:12379","attempt":0,"error":"rpc error: code = ResourceExhausted desc = etcdserver: mvcc: database space exceeded"}
Error: etcdserver: mvcc: database space exceeded

$ /tmp/etcd-download-test/etcdctl --endpoints http://localhost:12379 alarm disarm
memberID:14532165781622267127 alarm:NOSPACE

$ /tmp/etcd-download-test/etcdctl --endpoints http://localhost:12379 alarm list

$ /tmp/etcd-download-test/etcdctl --endpoints http://localhost:12379 put k v2
OK

$ /tmp/etcd-download-test/etcdctl --endpoints http://localhost:12379 get k -wjson | jq
{
  "header": {
    "cluster_id": 17478742799590500000,
    "member_id": 14532165781622268000,
    "revision": 19,
    "raft_term": 2
  },
  "kvs": [
    {
      "key": "aw==",
      "create_revision": 2,
      "mod_revision": 19,
      "version": 2,
      "value": "djI="
    }
  ],
  "count": 1
}
```

> etcd 启动参数，自动压缩，保存一小时的历史：`--auto-compaction-retention=1`

# 高可用

> 集群 + 备份（容灾）

## 实践

> cfssl

```
$ sudo apt install golang-cfssl
```

> tls certs

```
$ mkdir -p $GOPATH/github.com/etcd-io
$ cd $GOPATH/github.com/etcd-io
```

```
$ git clone https://github.com/etcd-io/etcd.git
$ cd etcd/hack/tls-setup
```

> req-csr.json - `Certificate Signing Requests`

```json
{
  "CN": "etcd",
  "hosts": [
    "localhost",
    "127.0.0.1"
  ],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "O": "autogenerated",
      "OU": "etcd cluster",
      "L": "the internet"
    }
  ]
}
```

> certs

```
$ export infra0=127.0.0.1
$ export infra1=127.0.0.1
$ export infra2=127.0.0.1

$ make

$ ll certs
total 36
-rw------- 1 zhongmingmao zhongmingmao 1679 Jun 11 08:15 127.0.0.1-key.pem
-rw-r--r-- 1 zhongmingmao zhongmingmao 1041 Jun 11 08:15 127.0.0.1.csr
-rw-rw-r-- 1 zhongmingmao zhongmingmao 1513 Jun 11 08:15 127.0.0.1.pem
-rw------- 1 zhongmingmao zhongmingmao 1679 Jun 11 08:15 ca-key.pem
-rw-r--r-- 1 zhongmingmao zhongmingmao 1098 Jun 11 08:15 ca.csr
-rw-rw-r-- 1 zhongmingmao zhongmingmao 1505 Jun 11 08:15 ca.pem
-rw------- 1 zhongmingmao zhongmingmao 1679 Jun 11 08:15 peer-127.0.0.1-key.pem
-rw-r--r-- 1 zhongmingmao zhongmingmao 1041 Jun 11 08:15 peer-127.0.0.1.csr
-rw-rw-r-- 1 zhongmingmao zhongmingmao 1513 Jun 11 08:15 peer-127.0.0.1.pem

$ mkdir /tmp/etcd-certs && mv certs /tmp/etcd-certs
```

> start etcd

```bash start-all.sh
nohup /tmp/etcd-download-test/etcd --name infra0 \
--data-dir=/tmp/etcd/infra0 \
--listen-peer-urls https://127.0.0.1:3380 \
--initial-advertise-peer-urls https://127.0.0.1:3380 \
--listen-client-urls https://127.0.0.1:3379 \
--advertise-client-urls https://127.0.0.1:3379 \
--initial-cluster-token etcd-cluster-1 \
--initial-cluster infra0=https://127.0.0.1:3380,infra1=https://127.0.0.1:4380,infra2=https://127.0.0.1:5380 \
--initial-cluster-state new \
--client-cert-auth --trusted-ca-file=/tmp/etcd-certs/certs/ca.pem \
--cert-file=/tmp/etcd-certs/certs/127.0.0.1.pem \
--key-file=/tmp/etcd-certs/certs/127.0.0.1-key.pem \
--peer-client-cert-auth --peer-trusted-ca-file=/tmp/etcd-certs/certs/ca.pem \
--peer-cert-file=/tmp/etcd-certs/certs/127.0.0.1.pem \
--peer-key-file=/tmp/etcd-certs/certs/127.0.0.1-key.pem 2>&1 > /tmp/log/infra0.log &

nohup /tmp/etcd-download-test/etcd --name infra1 \
--data-dir=/tmp/etcd/infra1 \
--listen-peer-urls https://127.0.0.1:4380 \
--initial-advertise-peer-urls https://127.0.0.1:4380 \
--listen-client-urls https://127.0.0.1:4379 \
--advertise-client-urls https://127.0.0.1:4379 \
--initial-cluster-token etcd-cluster-1 \
--initial-cluster infra0=https://127.0.0.1:3380,infra1=https://127.0.0.1:4380,infra2=https://127.0.0.1:5380 \
--initial-cluster-state new \
--client-cert-auth --trusted-ca-file=/tmp/etcd-certs/certs/ca.pem \
--cert-file=/tmp/etcd-certs/certs/127.0.0.1.pem \
--key-file=/tmp/etcd-certs/certs/127.0.0.1-key.pem \
--peer-client-cert-auth --peer-trusted-ca-file=/tmp/etcd-certs/certs/ca.pem \
--peer-cert-file=/tmp/etcd-certs/certs/127.0.0.1.pem \
--peer-key-file=/tmp/etcd-certs/certs/127.0.0.1-key.pem 2>&1 > /tmp/log/infra1.log &

nohup /tmp/etcd-download-test/etcd --name infra2 \
--data-dir=/tmp/etcd/infra2 \
--listen-peer-urls https://127.0.0.1:5380 \
--initial-advertise-peer-urls https://127.0.0.1:5380 \
--listen-client-urls https://127.0.0.1:5379 \
--advertise-client-urls https://127.0.0.1:5379 \
--initial-cluster-token etcd-cluster-1 \
--initial-cluster infra0=https://127.0.0.1:3380,infra1=https://127.0.0.1:4380,infra2=https://127.0.0.1:5380 \
--initial-cluster-state new \
--client-cert-auth --trusted-ca-file=/tmp/etcd-certs/certs/ca.pem \
--cert-file=/tmp/etcd-certs/certs/127.0.0.1.pem \
--key-file=/tmp/etcd-certs/certs/127.0.0.1-key.pem \
--peer-client-cert-auth --peer-trusted-ca-file=/tmp/etcd-certs/certs/ca.pem \
--peer-cert-file=/tmp/etcd-certs/certs/127.0.0.1.pem \
--peer-key-file=/tmp/etcd-certs/certs/127.0.0.1-key.pem 2>&1 > /tmp/log/infra2.log &
```

```
$ sh start-all.sh

$ ps | grep etcd
  42919 pts/4    00:00:00 etcd
  42920 pts/4    00:00:00 etcd
  42921 pts/4    00:00:00 etcd

$ netstat -tunpl
(Not all processes could be identified, non-owned process info
 will not be shown, you would have to be root to see it all.)
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name
tcp        0      0 127.0.0.53:53           0.0.0.0:*               LISTEN      -
tcp        0      0 127.0.0.1:3379          0.0.0.0:*               LISTEN      42919/etcd
tcp        0      0 127.0.0.1:3380          0.0.0.0:*               LISTEN      42919/etcd
tcp        0      0 127.0.0.1:5379          0.0.0.0:*               LISTEN      42921/etcd
tcp        0      0 127.0.0.1:5380          0.0.0.0:*               LISTEN      42921/etcd
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      -
tcp        0      0 127.0.0.1:4379          0.0.0.0:*               LISTEN      42920/etcd
tcp        0      0 127.0.0.1:4380          0.0.0.0:*               LISTEN      42920/etcd
tcp6       0      0 :::22                   :::*                    LISTEN      -
udp        0      0 127.0.0.53:53           0.0.0.0:*                           -
udp        0      0 192.168.191.140:68      0.0.0.0:*                           -
```

```
$ /tmp/etcd-download-test/etcdctl \
--endpoints https://127.0.0.1:3379 \
--cert /tmp/etcd-certs/certs/127.0.0.1.pem \
--key /tmp/etcd-certs/certs/127.0.0.1-key.pem \
--cacert /tmp/etcd-certs/certs/ca.pem \
member list -wtable
+------------------+---------+--------+------------------------+------------------------+------------+
|        ID        | STATUS  |  NAME  |       PEER ADDRS       |      CLIENT ADDRS      | IS LEARNER |
+------------------+---------+--------+------------------------+------------------------+------------+
| 1701f7e3861531d4 | started | infra0 | https://127.0.0.1:3380 | https://127.0.0.1:3379 |      false |
| 6a58b5afdcebd95d | started | infra1 | https://127.0.0.1:4380 | https://127.0.0.1:4379 |      false |
| 84a1a2f39cda4029 | started | infra2 | https://127.0.0.1:5380 | https://127.0.0.1:5379 |      false |
+------------------+---------+--------+------------------------+------------------------+------------+

$ /tmp/etcd-download-test/etcdctl \
--endpoints https://127.0.0.1:3379 \
--cert /tmp/etcd-certs/certs/127.0.0.1.pem \
--key /tmp/etcd-certs/certs/127.0.0.1-key.pem \
--cacert /tmp/etcd-certs/certs/ca.pem \
put k v1
OK

$ /tmp/etcd-download-test/etcdctl \
--endpoints https://127.0.0.1:3379 \
--cert /tmp/etcd-certs/certs/127.0.0.1.pem \
--key /tmp/etcd-certs/certs/127.0.0.1-key.pem \
--cacert /tmp/etcd-certs/certs/ca.pem \
put k v2
OK

$ /tmp/etcd-download-test/etcdctl \
--endpoints https://127.0.0.1:3379 \
--cert /tmp/etcd-certs/certs/127.0.0.1.pem \
--key /tmp/etcd-certs/certs/127.0.0.1-key.pem \
--cacert /tmp/etcd-certs/certs/ca.pem \
get k -wjson | jq
{
  "header": {
    "cluster_id": 14081100589508862000,
    "member_id": 1657878694428226000,
    "revision": 3,
    "raft_term": 2
  },
  "kvs": [
    {
      "key": "aw==",
      "create_revision": 2,
      "mod_revision": 3,
      "version": 2,
      "value": "djI="
    }
  ],
  "count": 1
}

$ /tmp/etcd-download-test/etcdctl \
--endpoints https://127.0.0.1:3379 \
--cert /tmp/etcd-certs/certs/127.0.0.1.pem \
--key /tmp/etcd-certs/certs/127.0.0.1-key.pem \
--cacert /tmp/etcd-certs/certs/ca.pem \
endpoint status -wtable
+------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------+
|        ENDPOINT        |        ID        | VERSION | DB SIZE | IS LEADER | IS LEARNER | RAFT TERM | RAFT INDEX | RAFT APPLIED INDEX | ERRORS |
+------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------+
| https://127.0.0.1:3379 | 1701f7e3861531d4 |  3.4.26 |   20 kB |     false |      false |         2 |         10 |                 10 |        |
+------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------+
```

> backup，`snapshot` 是`全量`的

```
$ /tmp/etcd-download-test/etcdctl \
--endpoints https://127.0.0.1:3379 \
--cert /tmp/etcd-certs/certs/127.0.0.1.pem \
--key /tmp/etcd-certs/certs/127.0.0.1-key.pem \
--cacert /tmp/etcd-certs/certs/ca.pem \
snapshot save snapshot.db
{"level":"info","ts":1686472830.083478,"caller":"snapshot/v3_snapshot.go:119","msg":"created temporary db file","path":"snapshot.db.part"}
{"level":"info","ts":"2022-06-11T08:40:30.089025Z","caller":"clientv3/maintenance.go:200","msg":"opened snapshot stream; downloading"}
{"level":"info","ts":1686472830.0891407,"caller":"snapshot/v3_snapshot.go:127","msg":"fetching snapshot","endpoint":"https://127.0.0.1:3379"}
{"level":"info","ts":"2022-06-11T08:40:30.090231Z","caller":"clientv3/maintenance.go:208","msg":"completed snapshot read; closing"}
{"level":"info","ts":1686472830.090827,"caller":"snapshot/v3_snapshot.go:142","msg":"fetched snapshot","endpoint":"https://127.0.0.1:3379","size":"20 kB","took":0.007207632}
{"level":"info","ts":1686472830.09087,"caller":"snapshot/v3_snapshot.go:152","msg":"saved","path":"snapshot.db"}
Snapshot saved at snapshot.db
```

> delete data + kill etcd

```
$ rm -rf /tmp/etcd

$ kill process of infra0 infra1 infra2

$ /tmp/etcd-download-test/etcdctl \
--endpoints https://127.0.0.1:3379 \
--cert /tmp/etcd-certs/certs/127.0.0.1.pem \
--key /tmp/etcd-certs/certs/127.0.0.1-key.pem \
--cacert /tmp/etcd-certs/certs/ca.pem \
member list -wtable
{"level":"warn","ts":"2022-06-11T08:54:30.291653Z","caller":"clientv3/retry_interceptor.go:62","msg":"retrying of unary invoker failed","target":"endpoint://client-f61939fb-55dd-4da6-a116-ded49335f594/127.0.0.1:3379","attempt":0,"error":"rpc error: code = DeadlineExceeded desc = latest balancer error: all SubConns are in TransientFailure, latest connection error: connection error: desc = \"transport: Error while dialing dial tcp 127.0.0.1:3379: connect: connection refused\""}
Error: context deadline exceeded
```

> restore

```bash restore.sh
export ETCDCTL_API=3

/tmp/etcd-download-test/etcdctl snapshot restore snapshot.db \
  --name infra0 \
  --data-dir=/tmp/etcd/infra0 \
  --initial-cluster infra0=https://127.0.0.1:3380,infra1=https://127.0.0.1:4380,infra2=https://127.0.0.1:5380 \
  --initial-cluster-token etcd-cluster-1 \
  --initial-advertise-peer-urls https://127.0.0.1:3380

/tmp/etcd-download-test/etcdctl snapshot restore snapshot.db \
    --name infra1 \
    --data-dir=/tmp/etcd/infra1 \
    --initial-cluster infra0=https://127.0.0.1:3380,infra1=https://127.0.0.1:4380,infra2=https://127.0.0.1:5380 \
    --initial-cluster-token etcd-cluster-1 \
    --initial-advertise-peer-urls https://127.0.0.1:4380

/tmp/etcd-download-test/etcdctl snapshot restore snapshot.db \
  --name infra2 \
  --data-dir=/tmp/etcd/infra2 \
  --initial-cluster infra0=https://127.0.0.1:3380,infra1=https://127.0.0.1:4380,infra2=https://127.0.0.1:5380 \
  --initial-cluster-token etcd-cluster-1 \
  --initial-advertise-peer-urls https://127.0.0.1:5380
```

```
$ sh ./restore.sh
{"level":"info","ts":1686474755.4626496,"caller":"snapshot/v3_snapshot.go:296","msg":"restoring snapshot","path":"snapshot.db","wal-dir":"/tmp/etcd/infra0/member/wal","data-dir":"/tmp/etcd/infra0","snap-dir":"/tmp/etcd/infra0/member/snap"}
{"level":"info","ts":1686474755.4671628,"caller":"membership/cluster.go:392","msg":"added member","cluster-id":"c36a1e619c38211b","local-member-id":"0","added-peer-id":"1701f7e3861531d4","added-peer-peer-urls":["https://127.0.0.1:3380"]}
{"level":"info","ts":1686474755.4673116,"caller":"membership/cluster.go:392","msg":"added member","cluster-id":"c36a1e619c38211b","local-member-id":"0","added-peer-id":"6a58b5afdcebd95d","added-peer-peer-urls":["https://127.0.0.1:4380"]}
{"level":"info","ts":1686474755.4673269,"caller":"membership/cluster.go:392","msg":"added member","cluster-id":"c36a1e619c38211b","local-member-id":"0","added-peer-id":"84a1a2f39cda4029","added-peer-peer-urls":["https://127.0.0.1:5380"]}
{"level":"info","ts":1686474755.4704263,"caller":"snapshot/v3_snapshot.go:309","msg":"restored snapshot","path":"snapshot.db","wal-dir":"/tmp/etcd/infra0/member/wal","data-dir":"/tmp/etcd/infra0","snap-dir":"/tmp/etcd/infra0/member/snap"}
{"level":"info","ts":1686474755.4789834,"caller":"snapshot/v3_snapshot.go:296","msg":"restoring snapshot","path":"snapshot.db","wal-dir":"/tmp/etcd/infra1/member/wal","data-dir":"/tmp/etcd/infra1","snap-dir":"/tmp/etcd/infra1/member/snap"}
{"level":"info","ts":1686474755.4806437,"caller":"membership/cluster.go:392","msg":"added member","cluster-id":"c36a1e619c38211b","local-member-id":"0","added-peer-id":"1701f7e3861531d4","added-peer-peer-urls":["https://127.0.0.1:3380"]}
{"level":"info","ts":1686474755.4807384,"caller":"membership/cluster.go:392","msg":"added member","cluster-id":"c36a1e619c38211b","local-member-id":"0","added-peer-id":"6a58b5afdcebd95d","added-peer-peer-urls":["https://127.0.0.1:4380"]}
{"level":"info","ts":1686474755.4807668,"caller":"membership/cluster.go:392","msg":"added member","cluster-id":"c36a1e619c38211b","local-member-id":"0","added-peer-id":"84a1a2f39cda4029","added-peer-peer-urls":["https://127.0.0.1:5380"]}
{"level":"info","ts":1686474755.484783,"caller":"snapshot/v3_snapshot.go:309","msg":"restored snapshot","path":"snapshot.db","wal-dir":"/tmp/etcd/infra1/member/wal","data-dir":"/tmp/etcd/infra1","snap-dir":"/tmp/etcd/infra1/member/snap"}
{"level":"info","ts":1686474755.4969661,"caller":"snapshot/v3_snapshot.go:296","msg":"restoring snapshot","path":"snapshot.db","wal-dir":"/tmp/etcd/infra2/member/wal","data-dir":"/tmp/etcd/infra2","snap-dir":"/tmp/etcd/infra2/member/snap"}
{"level":"info","ts":1686474755.4990554,"caller":"membership/cluster.go:392","msg":"added member","cluster-id":"c36a1e619c38211b","local-member-id":"0","added-peer-id":"1701f7e3861531d4","added-peer-peer-urls":["https://127.0.0.1:3380"]}
{"level":"info","ts":1686474755.4991322,"caller":"membership/cluster.go:392","msg":"added member","cluster-id":"c36a1e619c38211b","local-member-id":"0","added-peer-id":"6a58b5afdcebd95d","added-peer-peer-urls":["https://127.0.0.1:4380"]}
{"level":"info","ts":1686474755.4991415,"caller":"membership/cluster.go:392","msg":"added member","cluster-id":"c36a1e619c38211b","local-member-id":"0","added-peer-id":"84a1a2f39cda4029","added-peer-peer-urls":["https://127.0.0.1:5380"]}
{"level":"info","ts":1686474755.5067184,"caller":"snapshot/v3_snapshot.go:309","msg":"restored snapshot","path":"snapshot.db","wal-dir":"/tmp/etcd/infra2/member/wal","data-dir":"/tmp/etcd/infra2","snap-dir":"/tmp/etcd/infra2/member/snap"}
```

> restart 不需要指定 `--initial-cluster`，在 restore 阶段已指定

```bash restart.sh
nohup /tmp/etcd-download-test/etcd --name infra0 \
--data-dir=/tmp/etcd/infra0 \
--listen-peer-urls https://127.0.0.1:3380 \
--listen-client-urls https://127.0.0.1:3379 \
--advertise-client-urls https://127.0.0.1:3379 \
--client-cert-auth --trusted-ca-file=/tmp/etcd-certs/certs/ca.pem \
--cert-file=/tmp/etcd-certs/certs/127.0.0.1.pem \
--key-file=/tmp/etcd-certs/certs/127.0.0.1-key.pem \
--peer-client-cert-auth --peer-trusted-ca-file=/tmp/etcd-certs/certs/ca.pem \
--peer-cert-file=/tmp/etcd-certs/certs/127.0.0.1.pem \
--peer-key-file=/tmp/etcd-certs/certs/127.0.0.1-key.pem 2>&1 > /tmp/log/infra0.log &

nohup /tmp/etcd-download-test/etcd --name infra1 \
--data-dir=/tmp/etcd/infra1 \
--listen-peer-urls https://127.0.0.1:4380 \
--listen-client-urls https://127.0.0.1:4379 \
--advertise-client-urls https://127.0.0.1:4379 \
--client-cert-auth --trusted-ca-file=/tmp/etcd-certs/certs/ca.pem \
--cert-file=/tmp/etcd-certs/certs/127.0.0.1.pem \
--key-file=/tmp/etcd-certs/certs/127.0.0.1-key.pem \
--peer-client-cert-auth --peer-trusted-ca-file=/tmp/etcd-certs/certs/ca.pem \
--peer-cert-file=/tmp/etcd-certs/certs/127.0.0.1.pem \
--peer-key-file=/tmp/etcd-certs/certs/127.0.0.1-key.pem 2>&1 > /tmp/log/infra1.log &

nohup /tmp/etcd-download-test/etcd --name infra2 \
--data-dir=/tmp/etcd/infra2 \
--listen-peer-urls https://127.0.0.1:5380 \
--listen-client-urls https://127.0.0.1:5379 \
--advertise-client-urls https://127.0.0.1:5379 \
--client-cert-auth --trusted-ca-file=/tmp/etcd-certs/certs/ca.pem \
--cert-file=/tmp/etcd-certs/certs/127.0.0.1.pem \
--key-file=/tmp/etcd-certs/certs/127.0.0.1-key.pem \
--peer-client-cert-auth --peer-trusted-ca-file=/tmp/etcd-certs/certs/ca.pem \
--peer-cert-file=/tmp/etcd-certs/certs/127.0.0.1.pem \
--peer-key-file=/tmp/etcd-certs/certs/127.0.0.1-key.pem 2>&1 > /tmp/log/infra2.log &
```

```
$ sh ./restart.sh

$ /tmp/etcd-download-test/etcdctl \
--endpoints https://127.0.0.1:3379 \
--cert /tmp/etcd-certs/certs/127.0.0.1.pem \
--key /tmp/etcd-certs/certs/127.0.0.1-key.pem \
--cacert /tmp/etcd-certs/certs/ca.pem \
member list -wtable
+------------------+---------+--------+------------------------+------------------------+------------+
|        ID        | STATUS  |  NAME  |       PEER ADDRS       |      CLIENT ADDRS      | IS LEARNER |
+------------------+---------+--------+------------------------+------------------------+------------+
| 1701f7e3861531d4 | started | infra0 | https://127.0.0.1:3380 | https://127.0.0.1:3379 |      false |
| 6a58b5afdcebd95d | started | infra1 | https://127.0.0.1:4380 | https://127.0.0.1:4379 |      false |
| 84a1a2f39cda4029 | started | infra2 | https://127.0.0.1:5380 | https://127.0.0.1:5379 |      false |
+------------------+---------+--------+------------------------+------------------------+------------+

$ /tmp/etcd-download-test/etcdctl \
--endpoints https://127.0.0.1:3379 \
--cert /tmp/etcd-certs/certs/127.0.0.1.pem \
--key /tmp/etcd-certs/certs/127.0.0.1-key.pem \
--cacert /tmp/etcd-certs/certs/ca.pem \
get k -wjson | jq
{
  "header": {
    "cluster_id": 14081100589508862000,
    "member_id": 1657878694428226000,
    "revision": 3,
    "raft_term": 2
  },
  "kvs": [
    {
      "key": "aw==",
      "create_revision": 2,
      "mod_revision": 3,
      "version": 2,
      "value": "djI="
    }
  ],
  "count": 1
}

$ /tmp/etcd-download-test/etcdctl \
--endpoints https://127.0.0.1:3379 \
--cert /tmp/etcd-certs/certs/127.0.0.1.pem \
--key /tmp/etcd-certs/certs/127.0.0.1-key.pem \
--cacert /tmp/etcd-certs/certs/ca.pem \
put k v3
OK
```

## 社区

### etcd operator

> https://github.com/coreos/etcd-operator

![image-20230611175928892](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230611175928892.png)

1. CRD - `etcdCluster` + `etcdRestoreResource`
   - etcd-operator 监听到 `etcdCluster`：`创建` etcd Pod
   - etcd-operator 监听到 `etcdRestoreResource`：`恢复` etcd Pod
2. etcd Pod 包含两个容器：`etcd` + `backup`
   - etcd 要`外挂存储`

```
$ sudo cat /etc/kubernetes/manifests/etcd.yaml
spec:
  containers:
    ...
    volumeMounts:
    - mountPath: /var/lib/etcd
      name: etcd-data
		...
  volumes:
	...
  - hostPath:
      path: /var/lib/etcd
      type: DirectoryOrCreate
    name: etcd-data
```

### Statefulset

> Helm

1. https://bitnami.com/stack/etcd/helm
2. https://github.com/bitnami/charts/tree/main/bitnami/etcd

# Kubernetes

1. etcd 是 Kubernetes 的`后端存储`
2. 对于每一个 `API 对象`，都有对应的 `storage.go` 负责对象的存储操作
3. API Server 在启动脚本中指定 etcd 集群

```
$ sudo cat /etc/kubernetes/manifests/kube-apiserver.yaml
spec:
  containers:
  - command:
    - kube-apiserver
		...
    - --etcd-cafile=/etc/kubernetes/pki/etcd/ca.crt
    - --etcd-certfile=/etc/kubernetes/pki/apiserver-etcd-client.crt
    - --etcd-keyfile=/etc/kubernetes/pki/apiserver-etcd-client.key
    - --etcd-servers=https://127.0.0.1:2379
    ...
```

> API 对象在 etcd 中的存储路径

```
$ ps -ef | grep etcd
root        8737    8625  1 09:11 ?        00:02:06 etcd --advertise-client-urls=https://192.168.191.138:2379 --cert-file=/etc/kubernetes/pki/etcd/server.crt --client-cert-auth=true --data-dir=/var/lib/etcd --initial-advertise-peer-urls=https://192.168.191.138:2380 --initial-cluster=mac-k8s=https://192.168.191.138:2380 --key-file=/etc/kubernetes/pki/etcd/server.key --listen-client-urls=https://127.0.0.1:2379,https://192.168.191.138:2379 --listen-metrics-urls=http://127.0.0.1:2381 --listen-peer-urls=https://192.168.191.138:2380 --name=mac-k8s --peer-cert-file=/etc/kubernetes/pki/etcd/peer.crt --peer-client-cert-auth=true --peer-key-file=/etc/kubernetes/pki/etcd/peer.key --peer-trusted-ca-file=/etc/kubernetes/pki/etcd/ca.crt --snapshot-count=10000 --trusted-ca-file=/etc/kubernetes/pki/etcd/ca.crt

$ sudo /tmp/etcd-download-test/etcdctl --endpoints 192.168.191.138:2379 \                                          ─╯
--cacert /etc/kubernetes/pki/etcd/ca.crt \
--cert /etc/kubernetes/pki/etcd/server.crt \
--key /etc/kubernetes/pki/etcd/server.key \
get --prefix / --keys-only
...
/registry/namespaces/default
/registry/networkpolicies/calico-apiserver/allow-apiserver
/registry/operator.tigera.io/tigerastatuses/apiserver
/registry/pods/calico-apiserver/calico-apiserver-79869b6f4f-8kz9k
/registry/pods/default/nginx-deployment-6799fc88d8-4ppnm
/registry/roles/kube-system/system:controller:token-cleaner
...

$ k -n kube-system get role system:controller:token-cleaner -owide -v 9
I0611 11:21:23.344515  214569 loader.go:372] Config loaded from file:  /home/zhongmingmao/.kube/config
I0611 11:21:23.348602  214569 round_trippers.go:435] curl -v -XGET  -H "Accept: application/json;as=Table;v=v1;g=meta.k8s.io,application/json;as=Table;v=v1beta1;g=meta.k8s.io,application/json" -H "User-Agent: kubectl/v1.22.2 (linux/arm64) kubernetes/8b5a191" 'https://192.168.191.138:6443/apis/rbac.authorization.k8s.io/v1/namespaces/kube-system/roles/system:controller:token-cleaner'
I0611 11:21:23.354558  214569 round_trippers.go:454] GET https://192.168.191.138:6443/apis/rbac.authorization.k8s.io/v1/namespaces/kube-system/roles/system:controller:token-cleaner 200 OK in 5 milliseconds
I0611 11:21:23.354583  214569 round_trippers.go:460] Response Headers:
I0611 11:21:23.354586  214569 round_trippers.go:463]     X-Kubernetes-Pf-Prioritylevel-Uid: e2605faa-93d6-4d86-9ed5-dfd861e777f6
I0611 11:21:23.354588  214569 round_trippers.go:463]     Content-Length: 1832
I0611 11:21:23.354590  214569 round_trippers.go:463]     Date: Sun, 11 Jun 2022 11:21:23 GMT
I0611 11:21:23.354592  214569 round_trippers.go:463]     Audit-Id: b0b8bf59-f305-4d56-ab65-66e6cbc0ac0d
I0611 11:21:23.354594  214569 round_trippers.go:463]     Cache-Control: no-cache, private
I0611 11:21:23.354596  214569 round_trippers.go:463]     Content-Type: application/json
I0611 11:21:23.354598  214569 round_trippers.go:463]     X-Kubernetes-Pf-Flowschema-Uid: 2f005305-d15e-4252-bad1-edba0045f54d
I0611 11:21:23.354624  214569 request.go:1181] Response Body: {"kind":"Table","apiVersion":"meta.k8s.io/v1","metadata":{"resourceVersion":"181"},"columnDefinitions":[{"name":"Name","type":"string","format":"name","description":"Name must be unique within a namespace. Is required when creating resources, although some resources may allow a client to request the generation of an appropriate name automatically. Name is primarily intended for creation idempotence and configuration definition. Cannot be updated. More info: http://kubernetes.io/docs/user-guide/identifiers#names","priority":0},{"name":"Created At","type":"date","format":"","description":"CreationTimestamp is a timestamp representing the server time when this object was created. It is not guaranteed to be set in happens-before order across separate operations. Clients may not set this value. It is represented in RFC3339 form and is in UTC.\n\nPopulated by the system. Read-only. Null for lists. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata","priority":0}],"rows":[{"cells":["system:controller:token-cleaner","2022-05-30T01:48:56Z"],"object":{"kind":"PartialObjectMetadata","apiVersion":"meta.k8s.io/v1","metadata":{"name":"system:controller:token-cleaner","namespace":"kube-system","uid":"b74bf1d2-d5c3-4fce-8e71-7e34ff70b94f","resourceVersion":"181","creationTimestamp":"2022-05-30T01:48:56Z","labels":{"kubernetes.io/bootstrapping":"rbac-defaults"},"annotations":{"rbac.authorization.kubernetes.io/autoupdate":"true"},"managedFields":[{"manager":"kube-apiserver","operation":"Update","apiVersion":"rbac.authorization.k8s.io/v1","time":"2022-05-30T01:48:56Z","fieldsType":"FieldsV1","fieldsV1":{"f:metadata":{"f:annotations":{".":{},"f:rbac.authorization.kubernetes.io/autoupdate":{}},"f:labels":{".":{},"f:kubernetes.io/bootstrapping":{}}},"f:rules":{}}}]}}}]}
NAME                              CREATED AT
system:controller:token-cleaner   2022-05-30T01:48:56Z
```

> 架构

![image-20230611192629014](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230611192629014.png)

> API Server 通过 `--etcd-servers-overrides` 指定`辅助 etcd 集群`，增强`主 etcd 集群`的`稳定性`

```
/usr/local/bin/kube-apiserver \
--etcd_servers=https://localhost:4001 \
--etcd-cafile=/etc/ssl/kubernetes/ca.crt \
--storage-backend=etcd3 \
--etcd-servers-overrides=/events#https://localhost:4002
```

> `堆叠`式 etcd 集群：至少 `3` 个节点

![image-20230611193505001](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230611193505001.png)

> 外部 etcd 集群：至少 `6` 个节点

![image-20230611193633670](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230611193633670.png)

# 经验

> 高可用

1. `5` 个 peer，一般`不需要弹性扩容`，但多 peer 不一定能提升`读性能`
   - API  Server 配置了所有的 etcd peers，但只有在当前连接的 etcd member `异常`时，才会`切换`
2. 高效通信
   - API  Server 和 etcd 部署在同一个节点 - `堆叠`
   - API  Server 和 etcd 之间的通信是基于 `gRPC`，而 `gRPC` 是基于 `HTTP/2`
     - HTTP/2 中的 `Stream` 是`共享 TCP Connection`，并没有解决 TCP `队头阻塞`的问题

> 存储

1. 最佳实践：`Local SSD` + `Local volume`

> 安全

1. peer 之间的通信是`加密`的
2. Kubernetes 的 `Secret` 对象，是对数据`加密后再存入 etcd`

> 事件分离

1. `--etcd-servers-overrides`

> 网络延迟

1. etcd 集群尽量`同 Region 部署`

> 日志大小 - `创建 Snapshot` + `移除 WAL`

1. etcd `周期性创建 Snapshot` 保存系统的当前状态，并`移除 WAL`
2. 指定 `--snapshot-count`（默认 `10,000`），即到一定的`修改次数`，etcd 会创建 Snapshot

> 合理的储存配额（8G）

1. `没有存储配额`，etcd 可以利用`整个磁盘`，性能在大存储空间时`严重下降`，且`耗完`磁盘空间后，`分险不可预测`
2. `存储配额太小`，容易超出配额，使得集群处于`维护`模式（只接收`读`和`删除`请求）

> 自动压缩历史版本

1. 压缩历史版本：`丢弃`某个 Key `在给定版本之前`的所有信息
2. etcd 支持`自动压缩`，单位为`小时`：`--auto-compaction`

> 定期消除碎片

1. `压缩`历史版本：`离散`地抹除 etcd 存储空间中的数据，将会出现`碎片`
2. 碎片：无法被利用，但依然占用存储空间

> 备份与恢复

1. snapshot `save` + snapshot `restore`
2. 对 etcd 的影响
   - 做 snapshot save 时，会`锁住当前数据`
   - `并发的写操作`需要`开辟新空间`进行`增量写`，磁盘会增长

> 增量备份

1. wal - 记录数据变化的过程，提交前，都需要写入到 wal
2. snap - 生成 snap 后，wal 会被`删除`
3. 完整恢复 - `restore snap + replay wal`

![image-20230611203750505](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230611203750505.png)

> Heatbeat Interval + Election Timeout

1. 所有节点的配置都应该一致

> ResourceVersion

1. `单个对象`的 ResourceVersion：对象`最后修改`的 ResourceVersion
2. `List 对象`的 ResourceVersion：`生成 List Response 时`的 ResourceVersion

> List 行为

1. `无 ResourceVersion`，需要 `Most Recent` 数据，请求会`击穿 API Server 缓存`，直接到 etcd
2. API Server 通过 Label 过滤查询对象时，实际的`过滤动作`在 `API Server`，需要向 etcd 发起`全量查询`
