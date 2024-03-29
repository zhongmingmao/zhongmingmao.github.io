---
title: Kubernetes - API Server
mathjax: false
date: 2022-12-03 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/Screen-Shot-2022-01-22-at-10.52.54-AM.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
---

# 概述

> API Server

1. 提供`集群管理`的 `REST API`
2. 提供其它模块之间数据交互和通信的`枢纽`
   - 其它模块通过 API Server 查询或者修改数据，只有 API Server 才能直接操作 `etcd`

<!-- more -->

> 访问控制：`认证` + `鉴权` + `准入`

> `Mutating Admission` 可以修改对象，而 `Validating Admission` 不可以修改对象

![image-20230703213421651](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230703213421651.png)

![image-20230703213444656](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230703213444656.png)

# 认证

1. 开启 `TLS` 时，`所有请求`都需要首先`认证`
2. Kubernetes 支持多种认证机制，并支持`同时开启`多个认证插件（只需要有 `1` 个认证通过即可）
3. 如果认证成功，进入鉴权模块，如果认证失败，则返回 401

> 认证插件

1. X509 证书
   - 在 API Server `启动`时配置 `--client-ca-file`
   - `CN 域`（CommonName）用作`用户名`，而`O 域`（Organization）则用作 `Group 名`
2. 静态 Token 文件
   - 在 API Server `启动`时配置 `--token-auth-file`
   - 采用 `csv` 格式：`token,user,uid,[group...]`
3. 引导 Token
   - 目的：为了支持`平滑`地`启动引导新集群`
   - 以 `Secret` 的形式保存在 `kube-system` 命名空间中，可以被`动态`管理和创建
   - `TokenCleaner` 能够在引导 Token `过期`时将其删除
   - 使用 kubeadm 部署 Kubernetes 时，可通过 `kubeadm token list` 查询
4. 静态密码文件
   - 在 API Server `启动`时配置 `--basic-auth-file`
   - 采用 `csv` 格式：`password,user,uid,[group...]`
5. ServiceAccount
   - ServiceAccount 是由 Kubernetes `自动生成`的
   - `自动挂载`在容器的 `/var/run/secrets/kubernetes.io/serviceaccount` 目录
6. OpenID
   - OAuth 2.0 的认证机制
7. Webhook
   - `--authentication-token-webhook-config-file`
     - 描述如何访问远程的 Webhook 服务
   - `--authentication-token-webhook-cache-ttl`
     - 设定认证的缓存时间，默认为 2 分钟
8. 匿名请求（一般禁止）
   - `--anonymous-auth`

## X509

> API Server 本身是一个 `CA`（颁发证书，双向认证）

```
$ tree /etc/kubernetes/pki/
/etc/kubernetes/pki/
|-- apiserver.crt
|-- apiserver-etcd-client.crt
|-- apiserver-etcd-client.key
|-- apiserver.key
|-- apiserver-kubelet-client.crt
|-- apiserver-kubelet-client.key
|-- ca.crt
|-- ca.key
|-- etcd
|   |-- ca.crt
|   |-- ca.key
|   |-- healthcheck-client.crt
|   |-- healthcheck-client.key
|   |-- peer.crt
|   |-- peer.key
|   |-- server.crt
|   `-- server.key
|-- front-proxy-ca.crt
|-- front-proxy-ca.key
|-- front-proxy-client.crt
|-- front-proxy-client.key
|-- sa.key
`-- sa.pub
```

> 生成私钥和 CSR

```
$ openssl genrsa -out zhongmingmao.key 2048
Generating RSA private key, 2048 bit long modulus (2 primes)
..............................+++++
..+++++
e is 65537 (0x010001)

$ openssl req -new -key zhongmingmao.key -out zhongmingmao.csr
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) [AU]:CN
State or Province Name (full name) [Some-State]:GuangDong
Locality Name (eg, city) []:ZhongShan
Organization Name (eg, company) [Internet Widgits Pty Ltd]:Wechat
Organizational Unit Name (eg, section) []:IT
Common Name (e.g. server FQDN or YOUR name) []:zhongmingmao
Email Address []:zhongmingmao@163.com

Please enter the following 'extra' attributes
to be sent with your certificate request
A challenge password []:
An optional company name []:
```

> 编码 CSR

```
$ cat zhongmingmao.csr | base64 | tr -d "\n"
LS0tLS1CRUdJTiBDRVJUSUZJQ0FURSBSRVFVRVNULS0tLS0KTUlJQzFUQ0NBYjBDQVFBd2dZOHhDekFKQmdOVkJBWVRBa05PTVJJd0VBWURWUVFJREFsSGRXRnVaMFJ2Ym1jeApFakFRQmdOVkJBY01DVnBvYjI1blUyaGhiakVQTUEwR0ExVUVDZ3dHVjJWamFHRjBNUXN3Q1FZRFZRUUxEQUpKClZERVZNQk1HQTFVRUF3d01lbWh2Ym1kdGFXNW5iV0Z2TVNNd0lRWUpLb1pJaHZjTkFRa0JGaFI2YUc5dVoyMXAKYm1kdFlXOUFNVFl6TG1OdmJUQ0NBU0l3RFFZSktvWklodmNOQVFFQkJRQURnZ0VQQURDQ0FRb0NnZ0VCQU9OVgpHaWZvKzBwMTJ5Z2RNQ2dnREFIVW5SN2JGTG01Mkp6Qnd3Mkp0YXNSUkNnMm1qZTRSamRzMVdhN1JvdHZKQ0l0CmlLeXMzRlNES1ZmZ0pvcWdsbXJhaVVJeDl0YVgyODU0S1h4Q3RBakdpUDRURzhjdVBEMWxtNFA0bW5VelBnVWoKRGw3N0R0NzU4MTA0Sjl0S1k4WWM0TGV0ellZYmJlSTRFUGJNUzAwdmVLS1Y2UytKNjhack1BOU9mb1lid01RYgp0dmlXam1nUjhMUVBGUWo1VWIrMVdYeFBGOERWUWVOZEZacjJQMVI3WG83d2FlLzI5WlJzLzFVRUpORW9tbnpCClgrbnJxQlVSOUxjbjdxN2s4b1greHhCeEFVUW13a1BQZGMzL1R0VCtnNVF3K1dHcWt2ZG9RVy96aGFsY2pwbEoKYjJRc3hKZW1rcDJoVm1tZzZGTUNBd0VBQWFBQU1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRQ1JsNXU1QjE3TwpFZ2Rxbk84NnVxVWNCcVJGSjhUTE9MVW9PQm1RMHdIWDR0RHo3WEhIdzVwTXZpTWo4WDdkczlQSkRHWEdJYjFsCmQ4Z3pzd00wVlZCdFFUUXdzTXRwaXJnSXhZWG1FckV1NzJPYmJONjBJK250YjZSKzV2czBLd0grQWN6YytWZE8KTHN6MHluaDBUSVNjaW5mQmFuckgwOE9aWWdISGlZQjdMeks4VGQyUWJQR1FMR204UUxLeHh4UGpPc2tZajJjbApLWm9JYlJ5QTNxd3ppZE5qdTg0dmxGeDdTVkZDNXU2YXhmdVVDMGJlRkErNEVpRVBqMlFkSlBIcmJJajdNVkQxClRVbm1OZ0hzRmdNUUhPekora3A2cDM3Z2pwQVp6RUQ3RVd2UVE1QnFtNDRMWGdoYS81ODFIbGFSeGFwVjIxSmEKU1NOS1NFUDdiWmliCi0tLS0tRU5EIENFUlRJRklDQVRFIFJFUVVFU1QtLS0tLQo=
```

> 向 API Server 提交 CSR

```
$ cat <<EOF | kubectl apply -f -
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: zhongmingmao
spec:
  request: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURSBSRVFVRVNULS0tLS0KTUlJQzFUQ0NBYjBDQVFBd2dZOHhDekFKQmdOVkJBWVRBa05PTVJJd0VBWURWUVFJREFsSGRXRnVaMFJ2Ym1jeApFakFRQmdOVkJBY01DVnBvYjI1blUyaGhiakVQTUEwR0ExVUVDZ3dHVjJWamFHRjBNUXN3Q1FZRFZRUUxEQUpKClZERVZNQk1HQTFVRUF3d01lbWh2Ym1kdGFXNW5iV0Z2TVNNd0lRWUpLb1pJaHZjTkFRa0JGaFI2YUc5dVoyMXAKYm1kdFlXOUFNVFl6TG1OdmJUQ0NBU0l3RFFZSktvWklodmNOQVFFQkJRQURnZ0VQQURDQ0FRb0NnZ0VCQU9OVgpHaWZvKzBwMTJ5Z2RNQ2dnREFIVW5SN2JGTG01Mkp6Qnd3Mkp0YXNSUkNnMm1qZTRSamRzMVdhN1JvdHZKQ0l0CmlLeXMzRlNES1ZmZ0pvcWdsbXJhaVVJeDl0YVgyODU0S1h4Q3RBakdpUDRURzhjdVBEMWxtNFA0bW5VelBnVWoKRGw3N0R0NzU4MTA0Sjl0S1k4WWM0TGV0ellZYmJlSTRFUGJNUzAwdmVLS1Y2UytKNjhack1BOU9mb1lid01RYgp0dmlXam1nUjhMUVBGUWo1VWIrMVdYeFBGOERWUWVOZEZacjJQMVI3WG83d2FlLzI5WlJzLzFVRUpORW9tbnpCClgrbnJxQlVSOUxjbjdxN2s4b1greHhCeEFVUW13a1BQZGMzL1R0VCtnNVF3K1dHcWt2ZG9RVy96aGFsY2pwbEoKYjJRc3hKZW1rcDJoVm1tZzZGTUNBd0VBQWFBQU1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRQ1JsNXU1QjE3TwpFZ2Rxbk84NnVxVWNCcVJGSjhUTE9MVW9PQm1RMHdIWDR0RHo3WEhIdzVwTXZpTWo4WDdkczlQSkRHWEdJYjFsCmQ4Z3pzd00wVlZCdFFUUXdzTXRwaXJnSXhZWG1FckV1NzJPYmJONjBJK250YjZSKzV2czBLd0grQWN6YytWZE8KTHN6MHluaDBUSVNjaW5mQmFuckgwOE9aWWdISGlZQjdMeks4VGQyUWJQR1FMR204UUxLeHh4UGpPc2tZajJjbApLWm9JYlJ5QTNxd3ppZE5qdTg0dmxGeDdTVkZDNXU2YXhmdVVDMGJlRkErNEVpRVBqMlFkSlBIcmJJajdNVkQxClRVbm1OZ0hzRmdNUUhPekora3A2cDM3Z2pwQVp6RUQ3RVd2UVE1QnFtNDRMWGdoYS81ODFIbGFSeGFwVjIxSmEKU1NOS1NFUDdiWmliCi0tLS0tRU5EIENFUlRJRklDQVRFIFJFUVVFU1QtLS0tLQo=
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: 8640000
  usages:
  - client auth
EOF
certificatesigningrequest.certificates.k8s.io/zhongmingmao created

$ k get csr
NAME           AGE   SIGNERNAME                                    REQUESTOR             REQUESTEDDURATION   CONDITION
csr-fr7gf      48m   kubernetes.io/kube-apiserver-client-kubelet   system:node:mac-k8s   <none>              Approved,Issued
zhongmingmao   39s   kubernetes.io/kube-apiserver-client           kubernetes-admin      100d                Pending
```

> 审批 CSR

```
$ k certificate approve zhongmingmao
certificatesigningrequest.certificates.k8s.io/zhongmingmao approved

$ k get csr
NAME           AGE   SIGNERNAME                                    REQUESTOR             REQUESTEDDURATION   CONDITION
csr-fr7gf      49m   kubernetes.io/kube-apiserver-client-kubelet   system:node:mac-k8s   <none>              Approved,Issued
zhongmingmao   89s   kubernetes.io/kube-apiserver-client           kubernetes-admin      100d                Approved,Issued
```

> API Server 已颁发证书：`status.certificate`

```
$ k get csr zhongmingmao -oyaml
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"certificates.k8s.io/v1","kind":"CertificateSigningRequest","metadata":{"annotations":{},"name":"zhongmingmao"},"spec":{"expirationSeconds":8640000,"request":"LS0tLS1CRUdJTiBDRVJUSUZJQ0FURSBSRVFVRVNULS0tLS0KTUlJQzFUQ0NBYjBDQVFBd2dZOHhDekFKQmdOVkJBWVRBa05PTVJJd0VBWURWUVFJREFsSGRXRnVaMFJ2Ym1jeApFakFRQmdOVkJBY01DVnBvYjI1blUyaGhiakVQTUEwR0ExVUVDZ3dHVjJWamFHRjBNUXN3Q1FZRFZRUUxEQUpKClZERVZNQk1HQTFVRUF3d01lbWh2Ym1kdGFXNW5iV0Z2TVNNd0lRWUpLb1pJaHZjTkFRa0JGaFI2YUc5dVoyMXAKYm1kdFlXOUFNVFl6TG1OdmJUQ0NBU0l3RFFZSktvWklodmNOQVFFQkJRQURnZ0VQQURDQ0FRb0NnZ0VCQU9OVgpHaWZvKzBwMTJ5Z2RNQ2dnREFIVW5SN2JGTG01Mkp6Qnd3Mkp0YXNSUkNnMm1qZTRSamRzMVdhN1JvdHZKQ0l0CmlLeXMzRlNES1ZmZ0pvcWdsbXJhaVVJeDl0YVgyODU0S1h4Q3RBakdpUDRURzhjdVBEMWxtNFA0bW5VelBnVWoKRGw3N0R0NzU4MTA0Sjl0S1k4WWM0TGV0ellZYmJlSTRFUGJNUzAwdmVLS1Y2UytKNjhack1BOU9mb1lid01RYgp0dmlXam1nUjhMUVBGUWo1VWIrMVdYeFBGOERWUWVOZEZacjJQMVI3WG83d2FlLzI5WlJzLzFVRUpORW9tbnpCClgrbnJxQlVSOUxjbjdxN2s4b1greHhCeEFVUW13a1BQZGMzL1R0VCtnNVF3K1dHcWt2ZG9RVy96aGFsY2pwbEoKYjJRc3hKZW1rcDJoVm1tZzZGTUNBd0VBQWFBQU1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRQ1JsNXU1QjE3TwpFZ2Rxbk84NnVxVWNCcVJGSjhUTE9MVW9PQm1RMHdIWDR0RHo3WEhIdzVwTXZpTWo4WDdkczlQSkRHWEdJYjFsCmQ4Z3pzd00wVlZCdFFUUXdzTXRwaXJnSXhZWG1FckV1NzJPYmJONjBJK250YjZSKzV2czBLd0grQWN6YytWZE8KTHN6MHluaDBUSVNjaW5mQmFuckgwOE9aWWdISGlZQjdMeks4VGQyUWJQR1FMR204UUxLeHh4UGpPc2tZajJjbApLWm9JYlJ5QTNxd3ppZE5qdTg0dmxGeDdTVkZDNXU2YXhmdVVDMGJlRkErNEVpRVBqMlFkSlBIcmJJajdNVkQxClRVbm1OZ0hzRmdNUUhPekora3A2cDM3Z2pwQVp6RUQ3RVd2UVE1QnFtNDRMWGdoYS81ODFIbGFSeGFwVjIxSmEKU1NOS1NFUDdiWmliCi0tLS0tRU5EIENFUlRJRklDQVRFIFJFUVVFU1QtLS0tLQo=","signerName":"kubernetes.io/kube-apiserver-client","usages":["client auth"]}}
  creationTimestamp: "2022-05-30T02:36:47Z"
  name: zhongmingmao
  resourceVersion: "5832"
  uid: 88626338-2881-4f98-8570-64b3e47404e2
spec:
  expirationSeconds: 8640000
  groups:
  - system:masters
  - system:authenticated
  request: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURSBSRVFVRVNULS0tLS0KTUlJQzFUQ0NBYjBDQVFBd2dZOHhDekFKQmdOVkJBWVRBa05PTVJJd0VBWURWUVFJREFsSGRXRnVaMFJ2Ym1jeApFakFRQmdOVkJBY01DVnBvYjI1blUyaGhiakVQTUEwR0ExVUVDZ3dHVjJWamFHRjBNUXN3Q1FZRFZRUUxEQUpKClZERVZNQk1HQTFVRUF3d01lbWh2Ym1kdGFXNW5iV0Z2TVNNd0lRWUpLb1pJaHZjTkFRa0JGaFI2YUc5dVoyMXAKYm1kdFlXOUFNVFl6TG1OdmJUQ0NBU0l3RFFZSktvWklodmNOQVFFQkJRQURnZ0VQQURDQ0FRb0NnZ0VCQU9OVgpHaWZvKzBwMTJ5Z2RNQ2dnREFIVW5SN2JGTG01Mkp6Qnd3Mkp0YXNSUkNnMm1qZTRSamRzMVdhN1JvdHZKQ0l0CmlLeXMzRlNES1ZmZ0pvcWdsbXJhaVVJeDl0YVgyODU0S1h4Q3RBakdpUDRURzhjdVBEMWxtNFA0bW5VelBnVWoKRGw3N0R0NzU4MTA0Sjl0S1k4WWM0TGV0ellZYmJlSTRFUGJNUzAwdmVLS1Y2UytKNjhack1BOU9mb1lid01RYgp0dmlXam1nUjhMUVBGUWo1VWIrMVdYeFBGOERWUWVOZEZacjJQMVI3WG83d2FlLzI5WlJzLzFVRUpORW9tbnpCClgrbnJxQlVSOUxjbjdxN2s4b1greHhCeEFVUW13a1BQZGMzL1R0VCtnNVF3K1dHcWt2ZG9RVy96aGFsY2pwbEoKYjJRc3hKZW1rcDJoVm1tZzZGTUNBd0VBQWFBQU1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRQ1JsNXU1QjE3TwpFZ2Rxbk84NnVxVWNCcVJGSjhUTE9MVW9PQm1RMHdIWDR0RHo3WEhIdzVwTXZpTWo4WDdkczlQSkRHWEdJYjFsCmQ4Z3pzd00wVlZCdFFUUXdzTXRwaXJnSXhZWG1FckV1NzJPYmJONjBJK250YjZSKzV2czBLd0grQWN6YytWZE8KTHN6MHluaDBUSVNjaW5mQmFuckgwOE9aWWdISGlZQjdMeks4VGQyUWJQR1FMR204UUxLeHh4UGpPc2tZajJjbApLWm9JYlJ5QTNxd3ppZE5qdTg0dmxGeDdTVkZDNXU2YXhmdVVDMGJlRkErNEVpRVBqMlFkSlBIcmJJajdNVkQxClRVbm1OZ0hzRmdNUUhPekora3A2cDM3Z2pwQVp6RUQ3RVd2UVE1QnFtNDRMWGdoYS81ODFIbGFSeGFwVjIxSmEKU1NOS1NFUDdiWmliCi0tLS0tRU5EIENFUlRJRklDQVRFIFJFUVVFU1QtLS0tLQo=
  signerName: kubernetes.io/kube-apiserver-client
  usages:
  - client auth
  username: kubernetes-admin
status:
  certificate: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURVRENDQWppZ0F3SUJBZ0lSQVBOVmpTczBzaFFyL3YzQjZRa21GWkF3RFFZSktvWklodmNOQVFFTEJRQXcKRlRFVE1CRUdBMVVFQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TXpBMU16QXdNak16TURaYUZ3MHlNekE1TURjdwpNak16TURaYU1Hb3hDekFKQmdOVkJBWVRBa05PTVJJd0VBWURWUVFJRXdsSGRXRnVaMFJ2Ym1jeEVqQVFCZ05WCkJBY1RDVnBvYjI1blUyaGhiakVQTUEwR0ExVUVDaE1HVjJWamFHRjBNUXN3Q1FZRFZRUUxFd0pKVkRFVk1CTUcKQTFVRUF4TU1lbWh2Ym1kdGFXNW5iV0Z2TUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQwpBUUVBNDFVYUorajdTblhiS0Iwd0tDQU1BZFNkSHRzVXViblluTUhERFltMXF4RkVLRGFhTjdoR04yelZacnRHCmkyOGtJaTJJckt6Y1ZJTXBWK0FtaXFDV2F0cUpRakgyMXBmYnpuZ3BmRUswQ01hSS9oTWJ4eTQ4UFdXYmcvaWEKZFRNK0JTTU9YdnNPM3ZuelhUZ24yMHBqeGh6Z3Q2M05oaHR0NGpnUTlzeExUUzk0b3BYcEw0bnJ4bXN3RDA1KwpoaHZBeEJ1MitKYU9hQkh3dEE4VkNQbFJ2N1ZaZkU4WHdOVkI0MTBWbXZZL1ZIdGVqdkJwNy9iMWxHei9WUVFrCjBTaWFmTUZmNmV1b0ZSSDB0eWZ1cnVUeWhmN0hFSEVCUkNiQ1E4OTF6ZjlPMVA2RGxERDVZYXFTOTJoQmIvT0YKcVZ5T21VbHZaQ3pFbDZhU25hRldhYURvVXdJREFRQUJvMFl3UkRBVEJnTlZIU1VFRERBS0JnZ3JCZ0VGQlFjRApBakFNQmdOVkhSTUJBZjhFQWpBQU1COEdBMVVkSXdRWU1CYUFGRGUraDNqKzdQQ3JGV0g2Y1JxOUFRRnB6bzE2Ck1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRQUJzL1R2dUhOQ0RNNDNqL21LQmlVSUNDWDhIdmYyejdYKzJyUW4KQjJjTmFSK0VHd091aTdVK3VlbDJacFgxZk1xcDB5bUg5RE43bmhrNnpEdThUVVp2YTdVT3lxQmpKejUxQnptMApBRmp0RVhxVkt1QnhtdVdpbSs4WnY5T2IwTnd6TWpKZm9qL1l5eU5aM1BhN0NrVTJuMFdYb2lxZTJRdU9rWmtqCjMrdXg5MFJjeDdxb2R1MnVKa3Q5QmJyS285UEk3cjRWQ0oxRVJVbXNUV01ydGoxWDF5V3g5RWRoTGdVbW51REQKMHFkTVVBa3cyTnNQeXRscytjY1dtZGxVMEdJRjJvNXozaEZkSHA1SE16aGM4aVhmSGRkSDFmelVuNkFTL3FIWgpaVXV0R0UrbWRzR2FNNzNlTk1yNXU3ZFVwWEpwdFhCLzJrb3NRczNWeSswaUpTVTkKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=
  conditions:
  - lastTransitionTime: "2022-05-30T02:38:06Z"
    lastUpdateTime: "2022-05-30T02:38:06Z"
    message: This CSR was approved by kubectl certificate approve.
    reason: KubectlApprove
    status: "True"
    type: Approved
```

> 提取证书

```
$ k get csr zhongmingmao -o jsonpath='{.status.certificate}' | base64 -d > zhongmingmao.crt

$ cat zhongmingmao.crt
-----BEGIN CERTIFICATE-----
MIIDUDCCAjigAwIBAgIRAPNVjSs0shQr/v3B6QkmFZAwDQYJKoZIhvcNAQELBQAw
FTETMBEGA1UEAxMKa3ViZXJuZXRlczAeFw0yMzA1MzAwMjMzMDZaFw0yMzA5MDcw
MjMzMDZaMGoxCzAJBgNVBAYTAkNOMRIwEAYDVQQIEwlHdWFuZ0RvbmcxEjAQBgNV
BAcTCVpob25nU2hhbjEPMA0GA1UEChMGV2VjaGF0MQswCQYDVQQLEwJJVDEVMBMG
A1UEAxMMemhvbmdtaW5nbWFvMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKC
AQEA41UaJ+j7SnXbKB0wKCAMAdSdHtsUubnYnMHDDYm1qxFEKDaaN7hGN2zVZrtG
i28kIi2IrKzcVIMpV+AmiqCWatqJQjH21pfbzngpfEK0CMaI/hMbxy48PWWbg/ia
dTM+BSMOXvsO3vnzXTgn20pjxhzgt63Nhhtt4jgQ9sxLTS94opXpL4nrxmswD05+
hhvAxBu2+JaOaBHwtA8VCPlRv7VZfE8XwNVB410VmvY/VHtejvBp7/b1lGz/VQQk
0SiafMFf6euoFRH0tyfuruTyhf7HEHEBRCbCQ891zf9O1P6DlDD5YaqS92hBb/OF
qVyOmUlvZCzEl6aSnaFWaaDoUwIDAQABo0YwRDATBgNVHSUEDDAKBggrBgEFBQcD
AjAMBgNVHRMBAf8EAjAAMB8GA1UdIwQYMBaAFDe+h3j+7PCrFWH6cRq9AQFpzo16
MA0GCSqGSIb3DQEBCwUAA4IBAQABs/TvuHNCDM43j/mKBiUICCX8Hvf2z7X+2rQn
B2cNaR+EGwOui7U+uel2ZpX1fMqp0ymH9DN7nhk6zDu8TUZva7UOyqBjJz51Bzm0
AFjtEXqVKuBxmuWim+8Zv9Ob0NwzMjJfoj/YyyNZ3Pa7CkU2n0WXoiqe2QuOkZkj
3+ux90Rcx7qodu2uJkt9BbrKo9PI7r4VCJ1ERUmsTWMrtj1X1yWx9EdhLgUmnuDD
0qdMUAkw2NsPytls+ccWmdlU0GIF2o5z3hFdHp5HMzhc8iXfHddH1fzUn6AS/qHZ
ZUutGE+mdsGaM73eNMr5u7dUpXJptXB/2kosQs3Vy+0iJSU9
-----END CERTIFICATE-----
```

> 设置 Credential

```
$ k config set-credentials zhongmingmao --client-key=zhongmingmao.key --client-certificate=zhongmingmao.crt --embed-certs=true
User "zhongmingmao" set.
```

```yaml ~/.kube/config
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUMvakNDQWVhZ0F3SUJBZ0lCQURBTkJna3Foa2lHOXcwQkFRc0ZBREFWTVJNd0VRWURWUVFERXdwcmRXSmwKY201bGRHVnpNQjRYRFRJek1EVXpNREF4TkRnME9Wb1hEVE16TURVeU56QXhORGcwT1Zvd0ZURVRNQkVHQTFVRQpBeE1LYTNWaVpYSnVaWFJsY3pDQ0FTSXdEUVlKS29aSWh2Y05BUUVCQlFBRGdnRVBBRENDQVFvQ2dnRUJBTnRrCjIvRERGSXpuNmhoOVl6RFVmRzJDcXRlSzBzbTVGVkIyK0lXaXpCWk5ZVnNQbFpuN3NLL0NVYm4wdGJpUGpmUEoKUUJpUkxJZ3FCS1AydWRJanhjbUhqQ0hlSVFnOGswT3RnYXRCUTNzOEkwVVdhWW1QSXNQZWxwMllrZlkxK3Q3KwpQdUVsaHl1cE13eHJlSGFLQThTMG9Dd2NRT2g1L3piN290aXNrTDFlZzNZTWZaWjU1MWJKenBsc3hRdGdsdGp3CnBmcUU3UDBoQ2VTQkpwVmNGb1BXd3RNd2wvOVRvc1lKSC9TWU9kNnV0ZUllWFlEa1F6U3czZ2lkMHBkTitoS2EKemE2MEcvN2Q2a01aamUrQmRLMVFjenZpcE9zZWUvSHVDZklUNERtLzRiOFZuS1EwVU94QWZHRVg3UUdHcUlEMApOR0xSbXhXbVU4SnUraXFaaDkwQ0F3RUFBYU5aTUZjd0RnWURWUjBQQVFIL0JBUURBZ0trTUE4R0ExVWRFd0VCCi93UUZNQU1CQWY4d0hRWURWUjBPQkJZRUZEZStoM2orN1BDckZXSDZjUnE5QVFGcHpvMTZNQlVHQTFVZEVRUU8KTUF5Q0NtdDFZbVZ5Ym1WMFpYTXdEUVlKS29aSWh2Y05BUUVMQlFBRGdnRUJBRXZsWEJGRHRpQzJyK2VqSFBERgozeUxzbjA4Sjd1bENnN0xwMGJRaUxPZzIzZStjTTRzRnN0UVJadnFNYW1MU3l0U2hlZHAvVExFMnR0RlZOYnAvCkJlNVJiRGtuNWRFdFg5ejRva09IVTJ3ekFlaWZ5NnhCZEloYUdGZC9WT3B1SldBZ040aU9DVkRUQTA1OWNuTDMKSmJvVHJCNkRBdUo0a2JWNis5NGZkK001RXY1TVhiWXA2L2ExYTliMmVpWnNxbjM3djUvOWZlWU51Q3JYS0xGagprKzhvUWV0UGNEbW5TdkRrdUlteUZ0TGxjRjN1MGw1RmdwU2FQQnlWekJUckZQb25jTlcyV1ZkWWxLZ3ArWWFqCithT3JkRFNzbEVTY055R0hxTEkyS0RsTHIwWlBDQWtYSjFyRDcrenI5cFVEZC9LL1B5VFBlM3JaVWd3cjh2NjIKdFlJPQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    server: https://192.168.191.138:6443
  name: kubernetes
contexts:
- context:
    cluster: kubernetes
    user: kubernetes-admin
  name: kubernetes-admin@kubernetes
current-context: kubernetes-admin@kubernetes
kind: Config
preferences: {}
users:
- name: kubernetes-admin
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURJVENDQWdtZ0F3SUJBZ0lJVWVlRlYzZjRCdjR3RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TXpBMU16QXdNVFE0TkRsYUZ3MHlOREExTWprd01UUTROVEZhTURReApGekFWQmdOVkJBb1REbk41YzNSbGJUcHRZWE4wWlhKek1Sa3dGd1lEVlFRREV4QnJkV0psY201bGRHVnpMV0ZrCmJXbHVNSUlCSWpBTkJna3Foa2lHOXcwQkFRRUZBQU9DQVE4QU1JSUJDZ0tDQVFFQXZQOVpSS09yMWE5YjhKV2wKeWVtVzNKZVp6MGtKTXc1ZjN6UFN5dkdzbDZod3FLaDNKNXNKTTJrWXJMWUtKK25vbldmTjBCekwwclF5QTdScQpPSkJFKytsa0E2d3B4bzhOSnVITyttRHBwMnhhdHFmTWpFSEhseGV4UnlmTUUveDlDZmZsVHhPV1BUcFRqbGllCkZDQlhROTBPZmZwV3RENnM2Z2JVZXZMQzJTMStyMFJyMmhRWmE2bkxpQW9RdWhmZnJtTGJ2ZVJmblp0ZDVlS08KOUQ5SXAybmhjRE5PeWlIQWNoRlU3OW5id3JzRS9XRks5SVVtL3g1cU52WUFjS2pSUmpKSFJseUNENVdFTzBldgpYUGJjSXRZcnlHSDBBTWNkcXU5ZTc0WEFCTUNYa3VjbGs0UndkUEl1UHBMTHFJNnFTQWwvek0vdFJyQm1kL1V1ClRKbXE2d0lEQVFBQm8xWXdWREFPQmdOVkhROEJBZjhFQkFNQ0JhQXdFd1lEVlIwbEJBd3dDZ1lJS3dZQkJRVUgKQXdJd0RBWURWUjBUQVFIL0JBSXdBREFmQmdOVkhTTUVHREFXZ0JRM3ZvZDQvdXp3cXhWaCtuRWF2UUVCYWM2TgplakFOQmdrcWhraUc5dzBCQVFzRkFBT0NBUUVBdm1zQ3VXcWJ1ZlI2UHVFTUlrRXg5TDZFeU1zY2NhZzlqWER2CmNTY1hXNUVUSkllcW5ISmtzRVY4NEdCdDhlcGx0aGhUM1pFVUZvSURvR3FHNk1CVDFJdG5jaVlKRG5NUHZ5djAKWFBpVno4MFM3RFZhQjhwVjJvK3JjaFRmMHdSYVUvQWF4dWdtUWwzZHVUcEtYbU1DTThGQ3FpTVJYbm1veGJVUgpqTklsTGcwbjJzMXF0Tk1LVGRCSlB3dUVqdFJZMWVpU09GRGgwclFhYmZUc2dHa25SOGxCcHdDd28rWVdaMGs0CmlZaWtrT21ERnZsakZ6Z1VpcWpTRGdjRnNnUjlFWXZ1TGdtSHlJVnpxZG1NZURMandwL2NWM1VubGNoa3hsZEsKVDcyYWs5cnhzTGwrUFVGajlFZE92Y2tKanI0VFhZcWFJR2FwNWhyTDg1bEdNcTgyVXc9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    client-key-data: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFcEFJQkFBS0NBUUVBdlA5WlJLT3IxYTliOEpXbHllbVczSmVaejBrSk13NWYzelBTeXZHc2w2aHdxS2gzCko1c0pNMmtZckxZS0orbm9uV2ZOMEJ6TDByUXlBN1JxT0pCRSsrbGtBNndweG84Tkp1SE8rbURwcDJ4YXRxZk0KakVISGx4ZXhSeWZNRS94OUNmZmxUeE9XUFRwVGpsaWVGQ0JYUTkwT2ZmcFd0RDZzNmdiVWV2TEMyUzErcjBScgoyaFFaYTZuTGlBb1F1aGZmcm1MYnZlUmZuWnRkNWVLTzlEOUlwMm5oY0ROT3lpSEFjaEZVNzluYndyc0UvV0ZLCjlJVW0veDVxTnZZQWNLalJSakpIUmx5Q0Q1V0VPMGV2WFBiY0l0WXJ5R0gwQU1jZHF1OWU3NFhBQk1DWGt1Y2wKazRSd2RQSXVQcExMcUk2cVNBbC96TS90UnJCbWQvVXVUSm1xNndJREFRQUJBb0lCQURGR3BrQ21KOFFqMzJXLwpycVVST1JzMGo0Nmk3VG9aa2xlQWpJSUxOc09uMEErNU5LL24xU05KVUh5ZlRkQ1FST3pkUnFUdkRSbFhqLzYxClNFaU5ITjlOUDUxUmd1YlpIMFcyOUI4RnE0WFNVMmh5SVh1a0h1Uys4YUtxdHFPelhlcCticFFLZUU1b2FhYWcKWmo2N0crVit1aXVRWEpETUVvdEYwcHBudHZPbVhEUXBueE9EVHhwNkhmREdodERtdEkxb0FlSng3aXJlNFQ5Rwp3MWR1SHJDZWpuQWp5QTkwbmtnVEhNWWVSZHoxcmE4bVZqNzE5VnpYbWxyRFFYTkhDZzJFMFZ5b29GNGc4R29CCm1rTldLVTh6NUxqN05sVFEwbElsazlrbVZTZTE2V2g0MWR6dkRIbGxtdFZyVHdPWXZjNjdWY3UzVFE4Ly84bDcKbldwME9CRUNnWUVBKzlEL09nSmxoSnoyNnBTNG5mbWt3YTVUZ3NHVWJhSEttV1ZDeVBwUFNGZzRSeXNDc2U3NwpnaXV4UkxVK2F4aU9MTm5Jc1pmb1hZUzlVbXpacWFQRzRhVHhiT2RXY2RMUTdweThHZmJranVHcmlKb0FqRDZDCmFWYXRGN3k4VU5SNXg4eXZNcjgxWGRTYmdONUFuSUJ6QkZQVzFOV3VDcjVtQnE3c2tEUVpBZmtDZ1lFQXdDTXQKQW9xMmYyTGFtdWtYNUpnK3FHc3NoMG5rZzVrZ213ODVYSEJzcHFGT3B2TWhIa0RhWUtuZHBXTkVubXF3REY2UQp4Yi9aNVBWU3hGMElFS1ZhTVZ6N1N1ekk4MnBXeVlEWnNrelpwUU80d2x4a1F5Q0lwWHQzL1R4UUV3aGd6Y3A0ClJ1SDFmUVhiUURkSVpQV0FnSVY2U2lLTWwxUW0yZFp2eVVJZERRTUNnWUVBdGxxejZPdEJYdFpZVEtua1E2bzcKOEhId1Vka2pSbjBLZlNrQ1F3NVpDWmV4TVlCcEZEZHU5T1gxR2o5eDh4WTJKeTZURW1CaVNnN05GdnB5YVZHTAp2VzIzMDFoM2xqZkhTM1EvRjBKZVkwWHk5Um9vMldhUEEvOWJtN3YyVjBaMjVnUkl2eVFPWG1PUE5MUTk3OWRvCjh6SlBlWk0vMU5IcWlsNTBPejB1K3VrQ2dZQjVKM1VoVGpDSG9PRHhuNXVtVkczbUt6WjMxSnRZYy8xQWFWZ2wKTnVyOEkya0NFdnRHSldUT1lTNVhOSUkzVmxUT1orN29FdktsMGgrdm5HNFNlUUduY05jd1JxRHNCSmpYRlAydwoxWTdENDlYa0VQaFQ3N2JhaWtGK0dFTHh6VzJsTmsramVxWWVnTXZnOFRzZ0ZrSkNTR2gxU05YWU1vTVJCNHVUCm43SEwyd0tCZ1FDQlhCUWRlbWhhMmxMbDhhbEZ5Umd1dmJyOHJsbmVIc29RUEdOeEgwSVZNVVZPaWNnM1Y5bEoKZUNGdVl0dGxpRm5yRXppeHBsRTBzU1JZMzYxdkJtMzN3eXU5RXlmN2hBTy9TUTlsYWpUdDVMR0FZdkx3TDNvcgpGeFNEaFd1cVVTZGhqSGRLb0JTWXpjOEFXUkd2S2xrU0UyTjV0M2JRSFNZL2NBOUtsSDdSbEE9PQotLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLQo=
- name: zhongmingmao
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURVRENDQWppZ0F3SUJBZ0lSQVBOVmpTczBzaFFyL3YzQjZRa21GWkF3RFFZSktvWklodmNOQVFFTEJRQXcKRlRFVE1CRUdBMVVFQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TXpBMU16QXdNak16TURaYUZ3MHlNekE1TURjdwpNak16TURaYU1Hb3hDekFKQmdOVkJBWVRBa05PTVJJd0VBWURWUVFJRXdsSGRXRnVaMFJ2Ym1jeEVqQVFCZ05WCkJBY1RDVnBvYjI1blUyaGhiakVQTUEwR0ExVUVDaE1HVjJWamFHRjBNUXN3Q1FZRFZRUUxFd0pKVkRFVk1CTUcKQTFVRUF4TU1lbWh2Ym1kdGFXNW5iV0Z2TUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQwpBUUVBNDFVYUorajdTblhiS0Iwd0tDQU1BZFNkSHRzVXViblluTUhERFltMXF4RkVLRGFhTjdoR04yelZacnRHCmkyOGtJaTJJckt6Y1ZJTXBWK0FtaXFDV2F0cUpRakgyMXBmYnpuZ3BmRUswQ01hSS9oTWJ4eTQ4UFdXYmcvaWEKZFRNK0JTTU9YdnNPM3ZuelhUZ24yMHBqeGh6Z3Q2M05oaHR0NGpnUTlzeExUUzk0b3BYcEw0bnJ4bXN3RDA1KwpoaHZBeEJ1MitKYU9hQkh3dEE4VkNQbFJ2N1ZaZkU4WHdOVkI0MTBWbXZZL1ZIdGVqdkJwNy9iMWxHei9WUVFrCjBTaWFmTUZmNmV1b0ZSSDB0eWZ1cnVUeWhmN0hFSEVCUkNiQ1E4OTF6ZjlPMVA2RGxERDVZYXFTOTJoQmIvT0YKcVZ5T21VbHZaQ3pFbDZhU25hRldhYURvVXdJREFRQUJvMFl3UkRBVEJnTlZIU1VFRERBS0JnZ3JCZ0VGQlFjRApBakFNQmdOVkhSTUJBZjhFQWpBQU1COEdBMVVkSXdRWU1CYUFGRGUraDNqKzdQQ3JGV0g2Y1JxOUFRRnB6bzE2Ck1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRQUJzL1R2dUhOQ0RNNDNqL21LQmlVSUNDWDhIdmYyejdYKzJyUW4KQjJjTmFSK0VHd091aTdVK3VlbDJacFgxZk1xcDB5bUg5RE43bmhrNnpEdThUVVp2YTdVT3lxQmpKejUxQnptMApBRmp0RVhxVkt1QnhtdVdpbSs4WnY5T2IwTnd6TWpKZm9qL1l5eU5aM1BhN0NrVTJuMFdYb2lxZTJRdU9rWmtqCjMrdXg5MFJjeDdxb2R1MnVKa3Q5QmJyS285UEk3cjRWQ0oxRVJVbXNUV01ydGoxWDF5V3g5RWRoTGdVbW51REQKMHFkTVVBa3cyTnNQeXRscytjY1dtZGxVMEdJRjJvNXozaEZkSHA1SE16aGM4aVhmSGRkSDFmelVuNkFTL3FIWgpaVXV0R0UrbWRzR2FNNzNlTk1yNXU3ZFVwWEpwdFhCLzJrb3NRczNWeSswaUpTVTkKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=
    client-key-data: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFb3dJQkFBS0NBUUVBNDFVYUorajdTblhiS0Iwd0tDQU1BZFNkSHRzVXViblluTUhERFltMXF4RkVLRGFhCk43aEdOMnpWWnJ0R2kyOGtJaTJJckt6Y1ZJTXBWK0FtaXFDV2F0cUpRakgyMXBmYnpuZ3BmRUswQ01hSS9oTWIKeHk0OFBXV2JnL2lhZFRNK0JTTU9YdnNPM3ZuelhUZ24yMHBqeGh6Z3Q2M05oaHR0NGpnUTlzeExUUzk0b3BYcApMNG5yeG1zd0QwNStoaHZBeEJ1MitKYU9hQkh3dEE4VkNQbFJ2N1ZaZkU4WHdOVkI0MTBWbXZZL1ZIdGVqdkJwCjcvYjFsR3ovVlFRazBTaWFmTUZmNmV1b0ZSSDB0eWZ1cnVUeWhmN0hFSEVCUkNiQ1E4OTF6ZjlPMVA2RGxERDUKWWFxUzkyaEJiL09GcVZ5T21VbHZaQ3pFbDZhU25hRldhYURvVXdJREFRQUJBb0lCQVFEQlY0MnBSOU1BM3YrSApQRnZLcEliUnY3dnBsRFlxUjA5YzhzWXJhMldnbWt5M1Rza1dmcGpwWnB5UWhOSllvQ3ZCRGF6aC94cGNuamk1ClRpQTVZcDdMUGhYaXdJL0lydHI0M09XYmt6ZC9CeXRYdTNTeWtEWVhtYVVNTnBGWEFEL05LcVY4VGxXMWVpdHEKcXVucTdYZXg5TG1DUGtVL3UzQlhKNHYxK29aSW0yN0tXNk5vYmlqTmF6bkdWSmMrdUZSdUE4T25pbHdCc1d0dAoxa2Z1RCtSbmM3Rm1EL29jTER4OVNPN3NzaHJrekNRa2ZxR1kxeXdlOW1HTVhNUjNWdlM4MUg1TE5IbmhEK2xpCkt0QWxCVVZLR3ZIRTF1b21RLy9jM09vSlI0WTIvU0dJY01QYVVaaUFCUitFUy9vWXdvMlZnUXNZcGl0U3V0QU8KWC9qWmhXc1JBb0dCQVBJVWtPekNrNGtwS1M0Nld4ekhLMHRlWEFjZW9PZnBtWjJYd3Qwc3YyaHZXSkI4Ti8yeApGQndyT1A4UjJtcGNrNTR1SXJQZjdpeThZYnFEUURZTW16ZGxJbStiQUViQVkwRnIxdGx2SFoxdlZLRW9raUt4CldWaTVKNXdlZjRTMTVmK2p3Wjg2SVBGcGt0bnpBVDhGaUxKYldiNld2RUJWR01nRTVpeFVLSVB0QW9HQkFQQm4KY2ptY3RsOW1zL3JBYU5WMmhTZFErRE1ld3V0SlYzK2VpNFRUcUJvOW5Sd1JxQXRXQVpMZ2MzaVdQVjhMc2l6bAppMk9ZT3FqQjF1ejBGMlF3bHV2dlF3ZCtwVUFrL1pPN043Z3dMd3hXNzlVVyswa3R4cUh0ODNJVDMvTDhwSWhjCkM2ODg0MVlPdEJJc051UnVTaUJZYno0TG1DQkcrTDBLdzVCVmJoVS9Bb0dBT3FoUkZZMXdRbVArM255MVp4dTcKbWQrYlhQNUc3dXJqbGhRWDI0L2tNV0lKaTdrTnVDTVlSRnNVekhsKyt4YkRqaWlQc0JZcW1CeHRjY3dyMnV6agpEMkVxSHZEbitEelYwQnhaU3dacG5xUkRWV21IUDNESnZYM2Y0eXhncWIrSm81QUNjcHFiTU9QcitYT3djWnpkCnFwb0gvTzU1WHYwL3EvZkQ3aW5XUjJFQ2dZQWYvWlFNcUpiNE1RR0lQNnh6bzNicW1YSzkwcjBiZEVJSmdINk8KYVYvNFJmU3ZOSVpKSStQSHVNaUU1bkU2UWFNdktFaVpNenV6RTBCWGZjL1RERWc1RXppM09ab2g1QW8rYTI1cAp1emUzaTZZVWxCOVNTSjRqRkRnT0dTajIrN21sVDZKYWFsN1NKOWk4aGxlenBCMkhHbDJMUXgyMlJkdDV4SUhyCnBnS2xId0tCZ0ZLaXhhdlBJL0dQeXN1bFcxd0ZoYnZ3Z1hxTDQwQXllK2hJNytRNmUzUC9PZldDOHBBQUJuYmoKU09ZRFhRVmYrM09VM2MzTkJEZDYrTCt5b3Uzdk10WWpJdkExT281UEhVQVpSdkZKQVBIK3dxWmNLYlJTb3FFVQoxR1JxOXNVMnJoYmZpSDRkVFZkVFR3T2pSdmFJU0ZqSE1kT20wdmVzVGc3K1lUbDBDWWVRCi0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0tCg==
```

> 授权

```
$ k create role developer --verb=create --verb=get --verb=list --verb=update --verb=delete --resource=pods
role.rbac.authorization.k8s.io/developer created

$ k create rolebinding developer-binding-zhongmingmao --role=developer --user=zhongmingmao
rolebinding.rbac.authorization.k8s.io/developer-binding-zhongmingmao created
```

```
$ k get po --user zhongmingmao
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-6799fc88d8-4ppnm   1/1     Running   0          40d
nginx-deployment-6799fc88d8-j5rnt   1/1     Running   0          40d
nginx-deployment-6799fc88d8-ltc2g   1/1     Running   0          40d
```

## 静态 Token 文件

> static-token.csv

 ```
 bob-token,bob,1000,"group1,group2,group3"
 ```

> 备份 API Server

```
$ cp /etc/kubernetes/manifests/kube-apiserver.yaml ~/kube-apiserver.yaml
```

> 修改 kube-apiserver.yaml

```yaml kube-apiserver-static-token.yaml
apiVersion: v1
kind: Pod
metadata:
  ...
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - command:
    ...
    - --token-auth-file=/etc/kubernetes/auth/static-token.csv
    image: registry.aliyuncs.com/google_containers/kube-apiserver:v1.22.2
    ...
    volumeMounts:
    ...
    - mountPath: /etc/kubernetes/auth
      name: auth-files
      readOnly: true
  ...
  volumes:
  ...
  - hostPath:
      path: /home/zhongmingmao/api-server/basic-auth/static-token
      type: DirectoryOrCreate
    name: auth-files
```

> API Server 重新启动

```
$ sudo cp ~/kube-apiserver-static-token.yaml /etc/kubernetes/manifests/kube-apiserver.yaml

$ k get po -n kube-system -owide
NAME                              READY   STATUS    RESTARTS        AGE   IP                NODE      NOMINATED NODE   READINESS GATES
...
kube-apiserver-mac-k8s            1/1     Running   0               31s   192.168.191.138   mac-k8s   <none>           <none>
...
```

> HTTP 请求，认证成功，但鉴权失败

```
$ k get ns -v 9
I0709 14:48:36.258397  190678 loader.go:372] Config loaded from file:  /home/zhongmingmao/.kube/config
I0709 14:48:36.261775  190678 round_trippers.go:435] curl -v -XGET  -H "Accept: application/json;as=Table;v=v1;g=meta.k8s.io,application/json;as=Table;v=v1beta1;g=meta.k8s.io,application/json" -H "User-Agent: kubectl/v1.22.2 (linux/arm64) kubernetes/8b5a191" 'https://192.168.191.138:6443/api/v1/namespaces?limit=500'
I0709 14:48:36.268819  190678 round_trippers.go:454] GET https://192.168.191.138:6443/api/v1/namespaces?limit=500 200 OK in 7 milliseconds
I0709 14:48:36.268840  190678 round_trippers.go:460] Response Headers:
I0709 14:48:36.268844  190678 round_trippers.go:463]     Audit-Id: f1f1160e-abf2-4a53-ab29-c90afc02bd41
I0709 14:48:36.268848  190678 round_trippers.go:463]     Cache-Control: no-cache, private
I0709 14:48:36.268850  190678 round_trippers.go:463]     Content-Type: application/json
I0709 14:48:36.268852  190678 round_trippers.go:463]     X-Kubernetes-Pf-Flowschema-Uid: 2f005305-d15e-4252-bad1-edba0045f54d
I0709 14:48:36.268855  190678 round_trippers.go:463]     X-Kubernetes-Pf-Prioritylevel-Uid: e2605faa-93d6-4d86-9ed5-dfd861e777f6
I0709 14:48:36.268857  190678 round_trippers.go:463]     Date: Sun, 09 Jul 2022 14:48:36 GMT
I0709 14:48:36.268909  190678 request.go:1181] Response Body: {"kind":"Table","apiVersion":"meta.k8s.io/v1","metadata":{"resourceVersion":"11118"},"columnDefinitions":[{"name":"Name","type":"string","format":"name","description":"Name must be unique within a namespace. Is required when creating resources, although some resources may allow a client to request the generation of an appropriate name automatically. Name is primarily intended for creation idempotence and configuration definition. Cannot be updated. More info: http://kubernetes.io/docs/user-guide/identifiers#names","priority":0},{"name":"Status","type":"string","format":"","description":"The status of the namespace","priority":0},{"name":"Age","type":"string","format":"","description":"CreationTimestamp is a timestamp representing the server time when this object was created. It is not guaranteed to be set in happens-before order across separate operations. Clients may not set this value. It is represented in RFC3339 form and is in UTC.\n\nPopulated by the system. Read-only. Null for lists. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata","priority":0}],"rows":[{"cells":["calico-apiserver","Active","40d"],"object":{"kind":"PartialObjectMetadata","apiVersion":"meta.k8s.io/v1","metadata":{"name":"calico-apiserver","uid":"33a910d7-092f-4e78-9e1f-c50b68859197","resourceVersion":"1714","creationTimestamp":"2022-05-30T01:58:40Z","labels":{"kubernetes.io/metadata.name":"calico-apiserver","name":"calico-apiserver","pod-security.kubernetes.io/enforce":"privileged","pod-security.kubernetes.io/enforce-version":"latest"},"ownerReferences":[{"apiVersion":"operator.tigera.io/v1","kind":"APIServer","name":"default","uid":"c76efece-7a9b-4a53-a6cd-84e4ca42a86b","controller":true,"blockOwnerDeletion":true}],"managedFields":[{"manager":"operator","operation":"Update","apiVersion":"v1","time":"2022-05-30T01:58:40Z","fieldsType":"FieldsV1","fieldsV1":{"f:metadata":{"f:labels":{".":{},"f:kubernetes.io/metadata.name":{},"f:name":{},"f:pod-security.kubernetes.io/enforce":{},"f:pod-security.kubernetes.io/enforce-version":{}},"f:ownerReferences":{".":{},"k:{\"uid\":\"c76efece-7a9b-4a53-a6cd-84e4ca42a86b\"}":{}}}}}]}}},{"cells":["calico-system","Active","40d"],"object":{"kind":"PartialObjectMetadata","apiVersion":"meta.k8s.io/v1","metadata":{"name":"calico-system","uid":"02b13986-afdf-479e-8feb-476f57aee42b","resourceVersion":"606","creationTimestamp":"2022-05-30T01:50:02Z","labels":{"kubernetes.io/metadata.name":"calico-system","name":"calico-system","pod-security.kubernetes.io/enforce":"privileged","pod-security.kubernetes.io/enforce-version":"latest"},"ownerReferences":[{"apiVersion":"operator.tigera.io/v1","kind":"Installation","name":"default","uid":"0d76a67f-5bf6-4a8e-8964-0ac1e31aa4b9","controller":true,"blockOwnerDeletion":true}],"managedFields":[{"manager":"operator","operation":"Update","apiVersion":"v1","time":"2022-05-30T01:50:02Z","fieldsType":"FieldsV1","fieldsV1":{"f:metadata":{"f:labels":{".":{},"f:kubernetes.io/metadata.name":{},"f:name":{},"f:pod-security.kubernetes.io/enforce":{},"f:pod-security.kubernetes.io/enforce-version":{}},"f:ownerReferences":{".":{},"k:{\"uid\":\"0d76a67f-5bf6-4a8e-8964-0ac1e31aa4b9\"}":{}}}}}]}}},{"cells":["default","Active","40d"],"object":{"kind":"PartialObjectMetadata","apiVersion":"meta.k8s.io/v1","metadata":{"name":"default","uid":"c3b0eddd-c1de-4ea6-87ac-079b96ea14a5","resourceVersion":"192","creationTimestamp":"2022-05-30T01:48:56Z","labels":{"kubernetes.io/metadata.name":"default"},"managedFields":[{"manager":"kube-apiserver","operation":"Update","apiVersion":"v1","time":"2022-05-30T01:48:56Z","fieldsType":"FieldsV1","fieldsV1":{"f:metadata":{"f:labels":{".":{},"f:kubernetes.io/metadata.name":{}}}}}]}}},{"cells":["kube-node-lease","Active","40d"],"object":{"kind":"PartialObjectMetadata","apiVersion":"meta.k8s.io/v1","metadata":{"name":"kube-node-lease","uid":"c803e423-a003-466d-a55f-9e6d6e0e2218","resourceVersion":"12","creationTimestamp":"2022-05-30T01:48:55Z","labels":{"kubernetes.io/metadata.name":"kube-node-lease"},"managedFields":[{"manager":"kube-apiserver","operation":"Update","apiVersion":"v1","time":"2022-05-30T01:48:55Z","fieldsType":"FieldsV1","fieldsV1":{"f:metadata":{"f:labels":{".":{},"f:kubernetes.io/metadata.name":{}}}}}]}}},{"cells":["kube-public","Active","40d"],"object":{"kind":"PartialObjectMetadata","apiVersion":"meta.k8s.io/v1","metadata":{"name":"kube-public","uid":"864f84bb-b97a-4a75-9204-09e3b023bd45","resourceVersion":"10","creationTimestamp":"2022-05-30T01:48:55Z","labels":{"kubernetes.io/metadata.name":"kube-public"},"managedFields":[{"manager":"kube-apiserver","operation":"Update","apiVersion":"v1","time":"2022-05-30T01:48:55Z","fieldsType":"FieldsV1","fieldsV1":{"f:metadata":{"f:labels":{".":{},"f:kubernetes.io/metadata.name":{}}}}}]}}},{"cells":["kube-system","Active","40d"],"object":{"kind":"PartialObjectMetadata","apiVersion":"meta.k8s.io/v1","metadata":{"name":"kube-system","uid":"fbc10fd8-1985-4be0-9684-2ddca0ae3e27","resourceVersion":"8","creationTimestamp":"2022-05-30T01:48:54Z","labels":{"kubernetes.io/metadata.name":"kube-system"},"managedFields":[{"manager":"kube-apiserver","operation":"Update","apiVersion":"v1","time":"2022-05-30T01:48:54Z","fieldsType":"FieldsV1","fieldsV1":{"f:metadata":{"f:labels":{".":{},"f:kubernetes.io/metadata.name":{}}}}}]}}},{"cells":["tigera-operator","Active","40d"],"object":{"kind":"PartialObjectMetadata","apiVersion":"meta.k8s.io/v1","metadata":{"name":"tigera-operator","uid":"5353e7cf-440d-493c-893d-1bea5eba3fdc","resourceVersion":"455","creationTimestamp":"2022-05-30T01:49:22Z","labels":{"kubernetes.io/metadata.name":"tigera-operator","name":"tigera-operator"},"managedFields":[{"manager":"kubectl-create","operation":"Update","apiVersion":"v1","time":"2022-05-30T01:49:22Z","fieldsType":"FieldsV1","fieldsV1":{"f:metadata":{"f:labels":{".":{},"f:kubernetes.io/metadata.name":{},"f:name":{}}}}}]}}}]}
NAME               STATUS   AGE
calico-apiserver   Active   40d
calico-system      Active   40d
default            Active   40d
kube-node-lease    Active   40d
kube-public        Active   40d
kube-system        Active   40d
tigera-operator    Active   40d

$ curl -k -XGET -H 'Authorization: Bearer bob-token' 'https://192.168.191.138:6443/api/v1/namespaces?limit=500'
{
  "kind": "Status",
  "apiVersion": "v1",
  "metadata": {

  },
  "status": "Failure",
  "message": "namespaces is forbidden: User \"bob\" cannot list resource \"namespaces\" in API group \"\" at the cluster scope",
  "reason": "Forbidden",
  "details": {
    "kind": "namespaces"
  },
  "code": 403
}
```

> kubeconfig

```yaml ~/.kube/config
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUMvakNDQWVhZ0F3SUJBZ0lCQURBTkJna3Foa2lHOXcwQkFRc0ZBREFWTVJNd0VRWURWUVFERXdwcmRXSmwKY201bGRHVnpNQjRYRFRJek1EVXpNREF4TkRnME9Wb1hEVE16TURVeU56QXhORGcwT1Zvd0ZURVRNQkVHQTFVRQpBeE1LYTNWaVpYSnVaWFJsY3pDQ0FTSXdEUVlKS29aSWh2Y05BUUVCQlFBRGdnRVBBRENDQVFvQ2dnRUJBTnRrCjIvRERGSXpuNmhoOVl6RFVmRzJDcXRlSzBzbTVGVkIyK0lXaXpCWk5ZVnNQbFpuN3NLL0NVYm4wdGJpUGpmUEoKUUJpUkxJZ3FCS1AydWRJanhjbUhqQ0hlSVFnOGswT3RnYXRCUTNzOEkwVVdhWW1QSXNQZWxwMllrZlkxK3Q3KwpQdUVsaHl1cE13eHJlSGFLQThTMG9Dd2NRT2g1L3piN290aXNrTDFlZzNZTWZaWjU1MWJKenBsc3hRdGdsdGp3CnBmcUU3UDBoQ2VTQkpwVmNGb1BXd3RNd2wvOVRvc1lKSC9TWU9kNnV0ZUllWFlEa1F6U3czZ2lkMHBkTitoS2EKemE2MEcvN2Q2a01aamUrQmRLMVFjenZpcE9zZWUvSHVDZklUNERtLzRiOFZuS1EwVU94QWZHRVg3UUdHcUlEMApOR0xSbXhXbVU4SnUraXFaaDkwQ0F3RUFBYU5aTUZjd0RnWURWUjBQQVFIL0JBUURBZ0trTUE4R0ExVWRFd0VCCi93UUZNQU1CQWY4d0hRWURWUjBPQkJZRUZEZStoM2orN1BDckZXSDZjUnE5QVFGcHpvMTZNQlVHQTFVZEVRUU8KTUF5Q0NtdDFZbVZ5Ym1WMFpYTXdEUVlKS29aSWh2Y05BUUVMQlFBRGdnRUJBRXZsWEJGRHRpQzJyK2VqSFBERgozeUxzbjA4Sjd1bENnN0xwMGJRaUxPZzIzZStjTTRzRnN0UVJadnFNYW1MU3l0U2hlZHAvVExFMnR0RlZOYnAvCkJlNVJiRGtuNWRFdFg5ejRva09IVTJ3ekFlaWZ5NnhCZEloYUdGZC9WT3B1SldBZ040aU9DVkRUQTA1OWNuTDMKSmJvVHJCNkRBdUo0a2JWNis5NGZkK001RXY1TVhiWXA2L2ExYTliMmVpWnNxbjM3djUvOWZlWU51Q3JYS0xGagprKzhvUWV0UGNEbW5TdkRrdUlteUZ0TGxjRjN1MGw1RmdwU2FQQnlWekJUckZQb25jTlcyV1ZkWWxLZ3ArWWFqCithT3JkRFNzbEVTY055R0hxTEkyS0RsTHIwWlBDQWtYSjFyRDcrenI5cFVEZC9LL1B5VFBlM3JaVWd3cjh2NjIKdFlJPQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    server: https://192.168.191.138:6443
  name: kubernetes
contexts:
- context:
    cluster: kubernetes
    user: kubernetes-admin
  name: kubernetes-admin@kubernetes
- context:
    cluster: kubernetes
    user: zhongmingmao
  name: zhongmingmao@kubernetes
- context:
    cluster: kubernetes
    user: bob
  name: bob@kubernetes
current-context: kubernetes-admin@kubernetes
kind: Config
preferences: {}
users:
- name: kubernetes-admin
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURJVENDQWdtZ0F3SUJBZ0lJVWVlRlYzZjRCdjR3RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TXpBMU16QXdNVFE0TkRsYUZ3MHlOREExTWprd01UUTROVEZhTURReApGekFWQmdOVkJBb1REbk41YzNSbGJUcHRZWE4wWlhKek1Sa3dGd1lEVlFRREV4QnJkV0psY201bGRHVnpMV0ZrCmJXbHVNSUlCSWpBTkJna3Foa2lHOXcwQkFRRUZBQU9DQVE4QU1JSUJDZ0tDQVFFQXZQOVpSS09yMWE5YjhKV2wKeWVtVzNKZVp6MGtKTXc1ZjN6UFN5dkdzbDZod3FLaDNKNXNKTTJrWXJMWUtKK25vbldmTjBCekwwclF5QTdScQpPSkJFKytsa0E2d3B4bzhOSnVITyttRHBwMnhhdHFmTWpFSEhseGV4UnlmTUUveDlDZmZsVHhPV1BUcFRqbGllCkZDQlhROTBPZmZwV3RENnM2Z2JVZXZMQzJTMStyMFJyMmhRWmE2bkxpQW9RdWhmZnJtTGJ2ZVJmblp0ZDVlS08KOUQ5SXAybmhjRE5PeWlIQWNoRlU3OW5id3JzRS9XRks5SVVtL3g1cU52WUFjS2pSUmpKSFJseUNENVdFTzBldgpYUGJjSXRZcnlHSDBBTWNkcXU5ZTc0WEFCTUNYa3VjbGs0UndkUEl1UHBMTHFJNnFTQWwvek0vdFJyQm1kL1V1ClRKbXE2d0lEQVFBQm8xWXdWREFPQmdOVkhROEJBZjhFQkFNQ0JhQXdFd1lEVlIwbEJBd3dDZ1lJS3dZQkJRVUgKQXdJd0RBWURWUjBUQVFIL0JBSXdBREFmQmdOVkhTTUVHREFXZ0JRM3ZvZDQvdXp3cXhWaCtuRWF2UUVCYWM2TgplakFOQmdrcWhraUc5dzBCQVFzRkFBT0NBUUVBdm1zQ3VXcWJ1ZlI2UHVFTUlrRXg5TDZFeU1zY2NhZzlqWER2CmNTY1hXNUVUSkllcW5ISmtzRVY4NEdCdDhlcGx0aGhUM1pFVUZvSURvR3FHNk1CVDFJdG5jaVlKRG5NUHZ5djAKWFBpVno4MFM3RFZhQjhwVjJvK3JjaFRmMHdSYVUvQWF4dWdtUWwzZHVUcEtYbU1DTThGQ3FpTVJYbm1veGJVUgpqTklsTGcwbjJzMXF0Tk1LVGRCSlB3dUVqdFJZMWVpU09GRGgwclFhYmZUc2dHa25SOGxCcHdDd28rWVdaMGs0CmlZaWtrT21ERnZsakZ6Z1VpcWpTRGdjRnNnUjlFWXZ1TGdtSHlJVnpxZG1NZURMandwL2NWM1VubGNoa3hsZEsKVDcyYWs5cnhzTGwrUFVGajlFZE92Y2tKanI0VFhZcWFJR2FwNWhyTDg1bEdNcTgyVXc9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    client-key-data: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFcEFJQkFBS0NBUUVBdlA5WlJLT3IxYTliOEpXbHllbVczSmVaejBrSk13NWYzelBTeXZHc2w2aHdxS2gzCko1c0pNMmtZckxZS0orbm9uV2ZOMEJ6TDByUXlBN1JxT0pCRSsrbGtBNndweG84Tkp1SE8rbURwcDJ4YXRxZk0KakVISGx4ZXhSeWZNRS94OUNmZmxUeE9XUFRwVGpsaWVGQ0JYUTkwT2ZmcFd0RDZzNmdiVWV2TEMyUzErcjBScgoyaFFaYTZuTGlBb1F1aGZmcm1MYnZlUmZuWnRkNWVLTzlEOUlwMm5oY0ROT3lpSEFjaEZVNzluYndyc0UvV0ZLCjlJVW0veDVxTnZZQWNLalJSakpIUmx5Q0Q1V0VPMGV2WFBiY0l0WXJ5R0gwQU1jZHF1OWU3NFhBQk1DWGt1Y2wKazRSd2RQSXVQcExMcUk2cVNBbC96TS90UnJCbWQvVXVUSm1xNndJREFRQUJBb0lCQURGR3BrQ21KOFFqMzJXLwpycVVST1JzMGo0Nmk3VG9aa2xlQWpJSUxOc09uMEErNU5LL24xU05KVUh5ZlRkQ1FST3pkUnFUdkRSbFhqLzYxClNFaU5ITjlOUDUxUmd1YlpIMFcyOUI4RnE0WFNVMmh5SVh1a0h1Uys4YUtxdHFPelhlcCticFFLZUU1b2FhYWcKWmo2N0crVit1aXVRWEpETUVvdEYwcHBudHZPbVhEUXBueE9EVHhwNkhmREdodERtdEkxb0FlSng3aXJlNFQ5Rwp3MWR1SHJDZWpuQWp5QTkwbmtnVEhNWWVSZHoxcmE4bVZqNzE5VnpYbWxyRFFYTkhDZzJFMFZ5b29GNGc4R29CCm1rTldLVTh6NUxqN05sVFEwbElsazlrbVZTZTE2V2g0MWR6dkRIbGxtdFZyVHdPWXZjNjdWY3UzVFE4Ly84bDcKbldwME9CRUNnWUVBKzlEL09nSmxoSnoyNnBTNG5mbWt3YTVUZ3NHVWJhSEttV1ZDeVBwUFNGZzRSeXNDc2U3NwpnaXV4UkxVK2F4aU9MTm5Jc1pmb1hZUzlVbXpacWFQRzRhVHhiT2RXY2RMUTdweThHZmJranVHcmlKb0FqRDZDCmFWYXRGN3k4VU5SNXg4eXZNcjgxWGRTYmdONUFuSUJ6QkZQVzFOV3VDcjVtQnE3c2tEUVpBZmtDZ1lFQXdDTXQKQW9xMmYyTGFtdWtYNUpnK3FHc3NoMG5rZzVrZ213ODVYSEJzcHFGT3B2TWhIa0RhWUtuZHBXTkVubXF3REY2UQp4Yi9aNVBWU3hGMElFS1ZhTVZ6N1N1ekk4MnBXeVlEWnNrelpwUU80d2x4a1F5Q0lwWHQzL1R4UUV3aGd6Y3A0ClJ1SDFmUVhiUURkSVpQV0FnSVY2U2lLTWwxUW0yZFp2eVVJZERRTUNnWUVBdGxxejZPdEJYdFpZVEtua1E2bzcKOEhId1Vka2pSbjBLZlNrQ1F3NVpDWmV4TVlCcEZEZHU5T1gxR2o5eDh4WTJKeTZURW1CaVNnN05GdnB5YVZHTAp2VzIzMDFoM2xqZkhTM1EvRjBKZVkwWHk5Um9vMldhUEEvOWJtN3YyVjBaMjVnUkl2eVFPWG1PUE5MUTk3OWRvCjh6SlBlWk0vMU5IcWlsNTBPejB1K3VrQ2dZQjVKM1VoVGpDSG9PRHhuNXVtVkczbUt6WjMxSnRZYy8xQWFWZ2wKTnVyOEkya0NFdnRHSldUT1lTNVhOSUkzVmxUT1orN29FdktsMGgrdm5HNFNlUUduY05jd1JxRHNCSmpYRlAydwoxWTdENDlYa0VQaFQ3N2JhaWtGK0dFTHh6VzJsTmsramVxWWVnTXZnOFRzZ0ZrSkNTR2gxU05YWU1vTVJCNHVUCm43SEwyd0tCZ1FDQlhCUWRlbWhhMmxMbDhhbEZ5Umd1dmJyOHJsbmVIc29RUEdOeEgwSVZNVVZPaWNnM1Y5bEoKZUNGdVl0dGxpRm5yRXppeHBsRTBzU1JZMzYxdkJtMzN3eXU5RXlmN2hBTy9TUTlsYWpUdDVMR0FZdkx3TDNvcgpGeFNEaFd1cVVTZGhqSGRLb0JTWXpjOEFXUkd2S2xrU0UyTjV0M2JRSFNZL2NBOUtsSDdSbEE9PQotLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLQo=
- name: zhongmingmao
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURSekNDQWkrZ0F3SUJBZ0lSQUp4QWk4UkwvLzhWb0FVdVphUHpmcXN3RFFZSktvWklodmNOQVFFTEJRQXcKRlRFVE1CRUdBMVVFQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TXpBMU16QXdNak0zTkRKYUZ3MHlNekEyTURrdwpNak0zTkRKYU1HRXhDekFKQmdOVkJBWVRBa05PTVJJd0VBWURWUVFJRXdsSGRXRnVaMFJ2Ym1jeEVqQVFCZ05WCkJBY1RDVWQxWVc1bldtaHZkVEVQTUEwR0ExVUVDaE1HVjJWamFHRjBNUXN3Q1FZRFZRUUxFd0pKVkRFTU1Bb0cKQTFVRUF4TURTemhUTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUE4akJ1eU5ZTApBdHlzMStzM3N4TWxWSXpTVWFkZkhvY1poSVRXbE1rTGNpbnpWTjdmNThzRGwxays5ZmIyTHVXU3A5U0xSWDBoCko5KzAyVDNLYlRDTmcycVQ3bzRoZkJzTzBISGdVUXZDck95ZlhNQTAwOExNU0d5QVNvR3RiczEzQ3NLbWV3eXQKMFdnbHJCVFRudUJuS25JYzZTeldOcXVmREhrdlZ0K3lTWS9GTmtkZzZaK1ViQWhzcHhramsrRE5IRmxGZndQdApYQ3N6Q1prUmJIeTFyVU5RMmlPQzEwSzZPY2puSEQ1cWhSN3B3N1pvRHQ4cjNHUlFTeXFFajVjWUlqS2lYYk1ZCkl4MWNLb3pvTGw4djJ3Tms2QzB0UHZZS3Zoa0VxYnl1Lzl1Qmc5Y2ZTWjJOZkcrZG9rb3l1QTRXdlNXTnZ5algKVXlPVkYyaGdsOVF5aXdJREFRQUJvMFl3UkRBVEJnTlZIU1VFRERBS0JnZ3JCZ0VGQlFjREFqQU1CZ05WSFJNQgpBZjhFQWpBQU1COEdBMVVkSXdRWU1CYUFGRGUraDNqKzdQQ3JGV0g2Y1JxOUFRRnB6bzE2TUEwR0NTcUdTSWIzCkRRRUJDd1VBQTRJQkFRQ2tjUnhIZFQ4TTIxcmsvN1EyM1AraUZzSG9OeGdBSlROV29ZUUJZK3lyeFBWT2dOR1kKZkE2anlreVRUQ0cxN2gxbnEwYmw5L1BkM041VEo1OWRhN0hHc0I5TDBCaVBTclhpbHhuejZyVFZQZmJNS0svTQpocFVmbnY1eWUvR1AvWG1uQnN0SkFKYW1qb25pd0V6Ymk4N0g5dFZ6SEtNRGVFMmc2QWh4bzlzOVA0MW51bDY1ClQrdEw3UFJXbmdBTmIwMkFhZE5TanBpK1BWNHdkVkVUeG9vdVlBT1RGTFVXMzV0WTExbkpOY1FhQjFUVEQ4SGYKRS85aGppRFpuM3cwVFQ5M01MMmdoWXU0UzRibjVhOXdWVW9jU2pwbUdFMkVoL3UxOGJpWjNRSERhMmZSdzM2VQpBVGtEOWs2aGhudHZ1cXhSZUx6eFRBbGYyaVRSN0NWOGx6M1QKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=
    client-key-data: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFcEFJQkFBS0NBUUVBOGpCdXlOWUxBdHlzMStzM3N4TWxWSXpTVWFkZkhvY1poSVRXbE1rTGNpbnpWTjdmCjU4c0RsMWsrOWZiMkx1V1NwOVNMUlgwaEo5KzAyVDNLYlRDTmcycVQ3bzRoZkJzTzBISGdVUXZDck95ZlhNQTAKMDhMTVNHeUFTb0d0YnMxM0NzS21ld3l0MFdnbHJCVFRudUJuS25JYzZTeldOcXVmREhrdlZ0K3lTWS9GTmtkZwo2WitVYkFoc3B4a2prK0ROSEZsRmZ3UHRYQ3N6Q1prUmJIeTFyVU5RMmlPQzEwSzZPY2puSEQ1cWhSN3B3N1pvCkR0OHIzR1JRU3lxRWo1Y1lJaktpWGJNWUl4MWNLb3pvTGw4djJ3Tms2QzB0UHZZS3Zoa0VxYnl1Lzl1Qmc5Y2YKU1oyTmZHK2Rva295dUE0V3ZTV052eWpYVXlPVkYyaGdsOVF5aXdJREFRQUJBb0lCQUZ5TG0xbk5TTW5nTDRBVwpsdU1yOXNEWFN1cit6UDhxV3RyanMrZUk1NEhKZS8wN2FVMzJxcm1qMWNaQmg1TW1FS05uT1l6bElzMU0wNXVMCjNCVmJUMGdmYXNYbXMrN3JtLzZVOVVXaSs5SCtYV3NnMjA3c0Nnbkd4RU0wU0dTbHlNNW8wUnNHSGtsOXhaOTcKR2Q2Rkc0Y0JzZ0I4TEtNWmM1NWRsSFJhNkpMb3lmNFZQSnhtWXNBSVpDL0I0N2pWNTVpZ0ZJc1lQQ3BkRkRMaQo5WmZNQUl3aW1IYk1jR0dBbnhCemlaTCswWFZFenFxV1ZIM3NDc2cvTnM3S2thZUJKYlpGdUZBTW1UVjdOMk8yCm1YZDJwN3h0TWJqWmJoOVcwZFBrcmZ4aWdQTEo5WmRVWVFnamVPUk1SQXlJcjlseDAwWGdzR3VKUDA1eWxKQ3gKYnlyT05oa0NnWUVBL1BBNjZ6YVZadS9aVHJkWmR3eWZPTFdUZXBXWFkxUk92djcxbDVKVzNtNFJIUzBhZVhvUQp3SVhPSlFldXU2cW9pdXVKTHhXOStPdEZCWWsvMndSR1AzSXpab2lzRGlOWFBobmhwVzc5bm00dlEzcGxUclEwCjFOOFFTTG43SDd5RmJTN0FPelhmQnRTTzY4bGhWUUpRQjA5b0trdGFhbDRPZEhSaVk1N0JPSGNDZ1lFQTlSN2sKKytIdUZiNk9oOTZ5YTdpVlNXSkp6WjUwZlZRT2VkNWlWWFo3dnhtZ2s5QlFXS2p4ZkpIWE9ZaTI3clpBZW9NeQpub0tHRTZzbVd1dEliWTd0SlIzQUxRV3Y1b2xuZUNxTllQYmpPaWZPdmVuRVVvbkRoTnpmTzNzaVBXWWZ3NHFxCldIbDQrNHFPNXMvTFAyOVZiOHhtVjNCUVRaUGc4NzlVU3hjWDc0MENnWUVBamxKdUZLT2w5VUhJT0s2YVBJNXgKbU9zeWpLdFhmNkNVbm91L2pRWGVzMUdqZDVORmJrenMyQ2R5RXd2N21jVXhDTm4zV3ZNVTdkY1VBMFZ6RkwyVworV1E4MzlqUFZ6VXpoZEh5VWEvZUxTTTZuUEZseDU5R2l2RG9yTU5aTmtaUm5Wbk0rSVFiZGpCc0t1Z3BTRGdBCjU5d2FkSkhwMGlnU1loeUtzQnRJQllrQ2dZQmRuQUxPdnFWeDRHZ0dNMkhvQ1lIWm1KT2UxdGlkMURBREVvNXoKSE9COVJvZ3dhdW1FTW1DbXRmdC9tVnBqSjI3UVdySkdIb3Fka0VzQmhjRVBOZm9TcHAzeGs2NXRXQ1FQbkJDSgo2ejh6d21nTjF1eUdxTjNtSzRPRTc2MVB6V1JzQk5TeEhSSzYzVnRkZ2hXWWtDZ01uZjZuZmRqdEI0QnRGYkJYClRPWnpNUUtCZ1FDY2x3Szc2Q1FNd0dnMUI5QThtVzF3T0JkL0thZnFwVjM3ZmJTWnpTclNEWS9JL1dVVUY2cEEKUlYxZW9QZGJXWkhFbGJDa1I1WUFmZ0NtMGlDU2k5cVo1Qk9GYXZSR2pZUjV2TmpncVYrOTFPNXJrNS9ZaDdQego4RDg3bFYrSXgxZDJGYzRWQUhwbmFKYU8vNUpPbDc4VHRZTUxlSXF3WHFaMndOQUxjbENUL1E9PQotLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLQo=
- name: bob
  user:
    token: bob-token
```

```
$ k --context bob@kubernetes get ns -v 9
I0709 14:57:16.719670  200344 loader.go:372] Config loaded from file:  /home/zhongmingmao/.kube/config
I0709 14:57:16.724036  200344 round_trippers.go:435] curl -v -XGET  -H "User-Agent: kubectl/v1.22.2 (linux/arm64) kubernetes/8b5a191" -H "Authorization: Bearer <masked>" -H "Accept: application/json;as=Table;v=v1;g=meta.k8s.io,application/json;as=Table;v=v1beta1;g=meta.k8s.io,application/json" 'https://192.168.191.138:6443/api/v1/namespaces?limit=500'
I0709 14:57:16.733048  200344 round_trippers.go:454] GET https://192.168.191.138:6443/api/v1/namespaces?limit=500 403 Forbidden in 8 milliseconds
I0709 14:57:16.733063  200344 round_trippers.go:460] Response Headers:
I0709 14:57:16.733067  200344 round_trippers.go:463]     Cache-Control: no-cache, private
I0709 14:57:16.733069  200344 round_trippers.go:463]     Content-Type: application/json
I0709 14:57:16.733071  200344 round_trippers.go:463]     X-Content-Type-Options: nosniff
I0709 14:57:16.733076  200344 round_trippers.go:463]     X-Kubernetes-Pf-Flowschema-Uid: 84f57e61-82e8-4f42-8861-47bb3567f5a5
I0709 14:57:16.733078  200344 round_trippers.go:463]     X-Kubernetes-Pf-Prioritylevel-Uid: 1cbf0b91-b742-402a-bcac-abf19ff1ed1a
I0709 14:57:16.733080  200344 round_trippers.go:463]     Content-Length: 258
I0709 14:57:16.733085  200344 round_trippers.go:463]     Date: Sun, 09 Jul 2022 14:57:16 GMT
I0709 14:57:16.733087  200344 round_trippers.go:463]     Audit-Id: 737c4916-1c0e-456a-a91c-1e8b0a69fe31
I0709 14:57:16.733103  200344 request.go:1181] Response Body: {"kind":"Status","apiVersion":"v1","metadata":{},"status":"Failure","message":"namespaces is forbidden: User \"bob\" cannot list resource \"namespaces\" in API group \"\" at the cluster scope","reason":"Forbidden","details":{"kind":"namespaces"},"code":403}
I0709 14:57:16.733298  200344 helpers.go:217] server response object: [{
  "kind": "Status",
  "apiVersion": "v1",
  "metadata": {},
  "status": "Failure",
  "message": "namespaces is forbidden: User \"bob\" cannot list resource \"namespaces\" in API group \"\" at the cluster scope",
  "reason": "Forbidden",
  "details": {
    "kind": "namespaces"
  },
  "code": 403
}]
F0709 14:57:16.733324  200344 helpers.go:116] Error from server (Forbidden): namespaces is forbidden: User "bob" cannot list resource "namespaces" in API group "" at the cluster scope
...
```

## ServiceAccount

```
$ k get serviceaccounts -owide
NAME      SECRETS   AGE
default   1         40d

$ k describe serviceaccounts default
Name:                default
Namespace:           default
Labels:              <none>
Annotations:         <none>
Image pull secrets:  <none>
Mountable secrets:   default-token-tcwxj
Tokens:              default-token-tcwxj
Events:              <none>

$ k get secrets
NAME                  TYPE                                  DATA   AGE
default-token-tcwxj   kubernetes.io/service-account-token   3      40d

$ k get secrets default-token-tcwxj -oyaml
apiVersion: v1
data:
  ca.crt: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUMvakNDQWVhZ0F3SUJBZ0lCQURBTkJna3Foa2lHOXcwQkFRc0ZBREFWTVJNd0VRWURWUVFERXdwcmRXSmwKY201bGRHVnpNQjRYRFRJek1EVXpNREF4TkRnME9Wb1hEVE16TURVeU56QXhORGcwT1Zvd0ZURVRNQkVHQTFVRQpBeE1LYTNWaVpYSnVaWFJsY3pDQ0FTSXdEUVlKS29aSWh2Y05BUUVCQlFBRGdnRVBBRENDQVFvQ2dnRUJBTnRrCjIvRERGSXpuNmhoOVl6RFVmRzJDcXRlSzBzbTVGVkIyK0lXaXpCWk5ZVnNQbFpuN3NLL0NVYm4wdGJpUGpmUEoKUUJpUkxJZ3FCS1AydWRJanhjbUhqQ0hlSVFnOGswT3RnYXRCUTNzOEkwVVdhWW1QSXNQZWxwMllrZlkxK3Q3KwpQdUVsaHl1cE13eHJlSGFLQThTMG9Dd2NRT2g1L3piN290aXNrTDFlZzNZTWZaWjU1MWJKenBsc3hRdGdsdGp3CnBmcUU3UDBoQ2VTQkpwVmNGb1BXd3RNd2wvOVRvc1lKSC9TWU9kNnV0ZUllWFlEa1F6U3czZ2lkMHBkTitoS2EKemE2MEcvN2Q2a01aamUrQmRLMVFjenZpcE9zZWUvSHVDZklUNERtLzRiOFZuS1EwVU94QWZHRVg3UUdHcUlEMApOR0xSbXhXbVU4SnUraXFaaDkwQ0F3RUFBYU5aTUZjd0RnWURWUjBQQVFIL0JBUURBZ0trTUE4R0ExVWRFd0VCCi93UUZNQU1CQWY4d0hRWURWUjBPQkJZRUZEZStoM2orN1BDckZXSDZjUnE5QVFGcHpvMTZNQlVHQTFVZEVRUU8KTUF5Q0NtdDFZbVZ5Ym1WMFpYTXdEUVlKS29aSWh2Y05BUUVMQlFBRGdnRUJBRXZsWEJGRHRpQzJyK2VqSFBERgozeUxzbjA4Sjd1bENnN0xwMGJRaUxPZzIzZStjTTRzRnN0UVJadnFNYW1MU3l0U2hlZHAvVExFMnR0RlZOYnAvCkJlNVJiRGtuNWRFdFg5ejRva09IVTJ3ekFlaWZ5NnhCZEloYUdGZC9WT3B1SldBZ040aU9DVkRUQTA1OWNuTDMKSmJvVHJCNkRBdUo0a2JWNis5NGZkK001RXY1TVhiWXA2L2ExYTliMmVpWnNxbjM3djUvOWZlWU51Q3JYS0xGagprKzhvUWV0UGNEbW5TdkRrdUlteUZ0TGxjRjN1MGw1RmdwU2FQQnlWekJUckZQb25jTlcyV1ZkWWxLZ3ArWWFqCithT3JkRFNzbEVTY055R0hxTEkyS0RsTHIwWlBDQWtYSjFyRDcrenI5cFVEZC9LL1B5VFBlM3JaVWd3cjh2NjIKdFlJPQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
  namespace: ZGVmYXVsdA==
  token: ZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNkluSjNTRXcwUm1GUlExSXlVVVZFWjFKa1VqZFJkelYyV1hCU1h6VjFWVTFyVTFaVWNtVTBkblJQVGtVaWZRLmV5SnBjM01pT2lKcmRXSmxjbTVsZEdWekwzTmxjblpwWTJWaFkyTnZkVzUwSWl3aWEzVmlaWEp1WlhSbGN5NXBieTl6WlhKMmFXTmxZV05qYjNWdWRDOXVZVzFsYzNCaFkyVWlPaUprWldaaGRXeDBJaXdpYTNWaVpYSnVaWFJsY3k1cGJ5OXpaWEoyYVdObFlXTmpiM1Z1ZEM5elpXTnlaWFF1Ym1GdFpTSTZJbVJsWm1GMWJIUXRkRzlyWlc0dGRHTjNlR29pTENKcmRXSmxjbTVsZEdWekxtbHZMM05sY25acFkyVmhZMk52ZFc1MEwzTmxjblpwWTJVdFlXTmpiM1Z1ZEM1dVlXMWxJam9pWkdWbVlYVnNkQ0lzSW10MVltVnlibVYwWlhNdWFXOHZjMlZ5ZG1salpXRmpZMjkxYm5RdmMyVnlkbWxqWlMxaFkyTnZkVzUwTG5WcFpDSTZJbU15TWpobU1tTXdMVFpsTjJFdE5HVmtNQzA1WkdSakxUQTROR05tWVRaalpqUm1ZaUlzSW5OMVlpSTZJbk41YzNSbGJUcHpaWEoyYVdObFlXTmpiM1Z1ZERwa1pXWmhkV3gwT21SbFptRjFiSFFpZlEuZzJwX2xYVURHYTNPOGxPenNRb19OTS1GN0FtREtrQ1A2bG96TDAyR081QzR1R1RoM0UyMTZLRExNZWZpUzVlV3p6b2lKZGs3LVZrczdyUFBvN0RjQkp5VUxJOEVqVko3UTlyZEl6MV83WU1tTkZSWUFjZkJWYks2RnhpME5yZlR6a0FMSWlaeTNQSS1KTVg3OGpNMFFoQktOTDh0YWdPY3YwRkJLR2R0ZnV4QlZIa3VpdW51b3NFNHprVml1anFxOG52WDNEaXJwZ1EtT2lQREZLckZCaHkzcDhhelE2ZUpaSUlFZjRQUm84cUdOaVp6WERNOGw3VEtYUmhCUU5hR2pERFJ2LXRjQ3dFelpMd3ZzcFVJeVR6WWZKZWZWaHU2d3VLN0NXR0FuY2hadHhfOGp0LVpUbzh3V2lmWG85UzUyLXlSY2d2QlNWb2g3dFpJUmlaZFJn
kind: Secret
metadata:
  annotations:
    kubernetes.io/service-account.name: default
    kubernetes.io/service-account.uid: c228f2c0-6e7a-4ed0-9ddc-084cfa6cf4fb
  creationTimestamp: "2022-05-30T01:49:12Z"
  name: default-token-tcwxj
  namespace: default
  resourceVersion: "409"
  uid: d08bd61f-4cbb-4060-bbec-9f3c902e9890
type: kubernetes.io/service-account-token

$ echo ZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNkluSjNTRXcwUm1GUlExSXlVVVZFWjFKa1VqZFJkelYyV1hCU1h6VjFWVTFyVTFaVWNtVTBkblJQVGtVaWZRLmV5SnBjM01pT2lKcmRXSmxjbTVsZEdWekwzTmxjblpwWTJWaFkyTnZkVzUwSWl3aWEzVmlaWEp1WlhSbGN5NXBieTl6WlhKMmFXTmxZV05qYjNWdWRDOXVZVzFsYzNCaFkyVWlPaUprWldaaGRXeDBJaXdpYTNWaVpYSnVaWFJsY3k1cGJ5OXpaWEoyYVdObFlXTmpiM1Z1ZEM5elpXTnlaWFF1Ym1GdFpTSTZJbVJsWm1GMWJIUXRkRzlyWlc0dGRHTjNlR29pTENKcmRXSmxjbTVsZEdWekxtbHZMM05sY25acFkyVmhZMk52ZFc1MEwzTmxjblpwWTJVdFlXTmpiM1Z1ZEM1dVlXMWxJam9pWkdWbVlYVnNkQ0lzSW10MVltVnlibVYwWlhNdWFXOHZjMlZ5ZG1salpXRmpZMjkxYm5RdmMyVnlkbWxqWlMxaFkyTnZkVzUwTG5WcFpDSTZJbU15TWpobU1tTXdMVFpsTjJFdE5HVmtNQzA1WkdSakxUQTROR05tWVRaalpqUm1ZaUlzSW5OMVlpSTZJbk41YzNSbGJUcHpaWEoyYVdObFlXTmpiM1Z1ZERwa1pXWmhkV3gwT21SbFptRjFiSFFpZlEuZzJwX2xYVURHYTNPOGxPenNRb19OTS1GN0FtREtrQ1A2bG96TDAyR081QzR1R1RoM0UyMTZLRExNZWZpUzVlV3p6b2lKZGs3LVZrczdyUFBvN0RjQkp5VUxJOEVqVko3UTlyZEl6MV83WU1tTkZSWUFjZkJWYks2RnhpME5yZlR6a0FMSWlaeTNQSS1KTVg3OGpNMFFoQktOTDh0YWdPY3YwRkJLR2R0ZnV4QlZIa3VpdW51b3NFNHprVml1anFxOG52WDNEaXJwZ1EtT2lQREZLckZCaHkzcDhhelE2ZUpaSUlFZjRQUm84cUdOaVp6WERNOGw3VEtYUmhCUU5hR2pERFJ2LXRjQ3dFelpMd3ZzcFVJeVR6WWZKZWZWaHU2d3VLN0NXR0FuY2hadHhfOGp0LVpUbzh3V2lmWG85UzUyLXlSY2d2QlNWb2g3dFpJUmlaZFJn | base64 -d
eyJhbGciOiJSUzI1NiIsImtpZCI6InJ3SEw0RmFRQ1IyUUVEZ1JkUjdRdzV2WXBSXzV1VU1rU1ZUcmU0dnRPTkUifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJkZWZhdWx0Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZWNyZXQubmFtZSI6ImRlZmF1bHQtdG9rZW4tdGN3eGoiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC5uYW1lIjoiZGVmYXVsdCIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VydmljZS1hY2NvdW50LnVpZCI6ImMyMjhmMmMwLTZlN2EtNGVkMC05ZGRjLTA4NGNmYTZjZjRmYiIsInN1YiI6InN5c3RlbTpzZXJ2aWNlYWNjb3VudDpkZWZhdWx0OmRlZmF1bHQifQ.g2p_lXUDGa3O8lOzsQo_NM-F7AmDKkCP6lozL02GO5C4uGTh3E216KDLMefiS5eWzzoiJdk7-Vks7rPPo7DcBJyULI8EjVJ7Q9rdIz1_7YMmNFRYAcfBVbK6Fxi0NrfTzkALIiZy3PI-JMX78jM0QhBKNL8tagOcv0FBKGdtfuxBVHkuiunuosE4zkViujqq8nvX3DirpgQ-OiPDFKrFBhy3p8azQ6eJZIIEf4PRo8qGNiZzXDM8l7TKXRhBQNaGjDDRv-tcCwEzZLwvspUIyTzYfJefVhu6wuK7CWGAnchZtx_8jt-ZTo8wWifXo9S52-yRcgvBSVoh7tZIRiZdRg
```

> 该 Token 由 Kubernetes 颁发，Kubernetes 本身能`验签`，即可以识别身份

> JWT 对应的 Header

```json
{
  "alg": "RS256",
  "kid": "rwHL4FaQCR2QEDgRdR7Qw5vYpR_5uUMkSVTre4vtONE"
}
```

> JWT 对应的 Payload

```json
{
  "iss": "kubernetes/serviceaccount",
  "kubernetes.io/serviceaccount/namespace": "default",
  "kubernetes.io/serviceaccount/secret.name": "default-token-tcwxj",
  "kubernetes.io/serviceaccount/service-account.name": "default",
  "kubernetes.io/serviceaccount/service-account.uid": "c228f2c0-6e7a-4ed0-9ddc-084cfa6cf4fb",
  "sub": "system:serviceaccount:default:default"
}
```

```
$ k get po nginx-deployment-6799fc88d8-4ppnm -oyaml
apiVersion: v1
kind: Pod
metadata:
  ...
  name: nginx-deployment-6799fc88d8-4ppnm
  namespace: default
  ...
spec:
  containers:
  - image: nginx
    imagePullPolicy: Always
    name: nginx
    ...
    volumeMounts:
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-b47dm
      readOnly: true
  ...
  volumes:
  - name: kube-api-access-b47dm
    projected:
      defaultMode: 420
      sources:
      - serviceAccountToken:
          expirationSeconds: 3607
          path: token
      - configMap:
          items:
          - key: ca.crt
            path: ca.crt
          name: kube-root-ca.crt
      - downwardAPI:
          items:
          - fieldRef:
              apiVersion: v1
              fieldPath: metadata.namespace
            path: namespace

$ k exec -it nginx-deployment-6799fc88d8-4ppnm -- ls /var/run/secrets/kubernetes.io/serviceaccount
ca.crt	namespace  token

$ k exec -it nginx-deployment-6799fc88d8-4ppnm -- cat /var/run/secrets/kubernetes.io/serviceaccount/token
eyJhbGciOiJSUzI1NiIsImtpZCI6InJ3SEw0RmFRQ1IyUUVEZ1JkUjdRdzV2WXBSXzV1VU1rU1ZUcmU0dnRPTkUifQ.eyJhdWQiOlsiaHR0cHM6Ly9rdWJlcm5ldGVzLmRlZmF1bHQuc3ZjLmNsdXN0ZXIubG9jYWwiXSwiZXhwIjoxNzIwNDQyMTY1LCJpYXQiOjE2ODg5MDYxNjUsImlzcyI6Imh0dHBzOi8va3ViZXJuZXRlcy5kZWZhdWx0LnN2Yy5jbHVzdGVyLmxvY2FsIiwia3ViZXJuZXRlcy5pbyI6eyJuYW1lc3BhY2UiOiJkZWZhdWx0IiwicG9kIjp7Im5hbWUiOiJuZ2lueC1kZXBsb3ltZW50LTY3OTlmYzg4ZDgtNHBwbm0iLCJ1aWQiOiI3MjY3N2NiZC1lMmUxLTQ5MWItODllNS1iMzliYThjMTY0NjQifSwic2VydmljZWFjY291bnQiOnsibmFtZSI6ImRlZmF1bHQiLCJ1aWQiOiJjMjI4ZjJjMC02ZTdhLTRlZDAtOWRkYy0wODRjZmE2Y2Y0ZmIifSwid2FybmFmdGVyIjoxNjg4OTA5NzcyfSwibmJmIjoxNjg4OTA2MTY1LCJzdWIiOiJzeXN0ZW06c2VydmljZWFjY291bnQ6ZGVmYXVsdDpkZWZhdWx0In0.hnH_AhovNOL7nOppNowTebOkmsCFXITfZvwhvTjoSL9tPuRNMUTfJrMmfOjLevs18pKNR_bDSRJrXNFTaNtzqVclLkPPC1m21_p6lsAXlOufVHuqANP97nEOfNGs8B7iL0_EIkQPsy0H1yh0850meAdNJqyoy0HpwxeKGC1-GhXYwTWIACbKUdb7yZ5o9sautdykkNU0zbTwWagdtjBjXZE1TI68KsoZrd-RGbRxBz_el6C4cbZ1z3S63Id8wB7k06IV7QRjxvG0jBip79yV32qvshdUvo4c4atHhT4tXO10kzualTPUh-dvYs0CwDuGswD6Ms1JVGiJ4donOhdggQ
```

## Webhook

> 构建认证服务，用于认证 `TokenReview` Request

> Input - spec

```json
{
  "apiVersion": "authentication.k8s.io/v1",
  "kind": "TokenReview",
  "spec": {
    "token": "(BEARERTOKEN)"
  }
}
```

> Output - status

```json
{
  "apiVersion": "authentication.k8s.io/v1",
  "kind": "TokenReview",
  "status": {
    "authenticated": true,
    "user": {
      "username": "xxx@qq.com",
      "uid": "1",
      "groups": [
        "developer",
        "qa"
      ]
    }
  }
}
```

> webhook

```go
package main

import (
	"context"
	"encoding/json"
	"github.com/google/go-github/github"
	"golang.org/x/oauth2"
	"log"
	"net/http"

	authentication "k8s.io/api/authentication/v1beta1"
)

func main() {
	http.HandleFunc("/authenticate", func(w http.ResponseWriter, r *http.Request) {
		// decoder fail
		decoder := json.NewDecoder(r.Body)
		var tr authentication.TokenReview
		err := decoder.Decode(&tr)
		if err != nil {
			log.Println("[Error]", err.Error())
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"apiVersion": "authentication.k8s.io/v1beta1",
				"kind":       "TokenReview",
				"status": authentication.TokenReviewStatus{
					Authenticated: false,
				},
			})
			return
		}
		log.Print("receiving request")

		// oauth2 fail
		client := github.NewClient(
			oauth2.NewClient(context.Background(),
				oauth2.StaticTokenSource(&oauth2.Token{
					AccessToken: tr.Spec.Token,
				})))
		user, _, err := client.Users.Get(context.Background(), "")
		if err != nil {
			log.Println("[Error]", err.Error())
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"apiVersion": "authentication.k8s.io/v1beta1",
				"kind":       "TokenReview",
				"status": authentication.TokenReviewStatus{
					Authenticated: false,
				},
			})
			return
		}

		// oauth2 success
		log.Printf("[Success] login as %s", *user.Login)
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"apiVersion": "authentication.k8s.io/v1beta1",
			"kind":       "TokenReview",
			"status": authentication.TokenReviewStatus{
				Authenticated: true,
				User: authentication.UserInfo{
					Username: *user.Login,
					UID:      *user.Login,
				},
			},
		})
	})
	log.Println(http.ListenAndServe(":3000", nil))
}
```

```makefile
build:
	echo "building authn-webhook"
	mkdir -p "bin/arm64"
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o bin/arm64 .
```

```
$ curl -s http://127.1:3000/authenticate | jq
{
  "apiVersion": "authentication.k8s.io/v1",
  "kind": "TokenReview",
  "status": {
    "user": {}
  }
}
```

> webhook-config.json

```json webhook-config.json
{
  "kind": "Config",
  "apiVersion": "v1",
  "preferences": {},
  "clusters": [
    {
      "name": "github-authn",
      "cluster": {
        "server": "http://192.168.191.138:3000/authenticate"
      }
    }
  ],
  "users": [
    {
      "name": "authn-apiserver",
      "user": {
        "token": "secret"
      }
    }
  ],
  "contexts": [
    {
      "name": "webhook",
      "context": {
        "cluster": "github-authn",
        "user": "authn-apiserver"
      }
    }
  ],
  "current-context": "webhook"
}
```

> kube-apiserver.yaml - `--authentication-token-webhook-config-file`

```yaml /etc/kubernetes/manifests/kube-apiserver.yaml
apiVersion: v1
kind: Pod
metadata:
  ...
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - command:
    ...
    - --authentication-token-webhook-config-file=/etc/config/webhook-config.json
    ...
    volumeMounts:
    ...
    - mountPath: /etc/config
      name: authn-webhook
      readOnly: true
  ...
  volumes:
  ...
  - hostPath:
      path: /home/zhongmingmao/apiserver/auth/webhook
      type: DirectoryOrCreate
    name: authn-webhook
```

```
k get po -n kube-system
NAME                              READY   STATUS    RESTARTS       AGE
...
kube-apiserver-mac-k8s            1/1     Running   0              59s
```

> ~/.kube/config

```yaml ~/.kube/config
- name: github_token
  user:
    token: xxx
```

```
$ k get po --user github_token
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-6799fc88d8-4ppnm   1/1     Running   0          41d
nginx-deployment-6799fc88d8-j5rnt   1/1     Running   0          41d
nginx-deployment-6799fc88d8-ltc2g   1/1     Running   0          41d
```

```
$ ./bin/arm64/authn-webhook
2022/07/10 16:09:48 receiving request
2022/07/10 16:09:49 [Success] login as zhongmingmao
```

# 鉴权

1. 授权主要用于对`集群资源`的`访问控制`
2. 检查请求包含的相关`属性值`，与相对应的`访问策略`相比较，API 请求必须满足某些策略才能被处理
3. Kubernetes 支持`同时开启`多个授权插件，只要有 `1` 个验证通过即可
4. 授权成功，则请求进入`准入模块`做进一步的请求验证，否则返回 HTTP 403
5. 支持的授权插件：ABAC、`RBAC`、Webhook、Node

## RBAC

1. RBAC 的授权策略可以利用 `kubectl` 或者 `Kubernetes API` 直接进行配置
2. RBAC 可以授权给用户，让用户有权进行`授权管理`
3. RBAC 在 Kubernetes 中被映射为 `API` 资源和操作

> RBAC

![image-20230711224415204](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230711224415204.png)

> Kubernetes - `RoleBinding` 可以绑定 `ClusterRole`

![k8s-rbac](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/k8s-rbac.png)

```
$ k api-resources --api-group="rbac.authorization.k8s.io"
NAME                  SHORTNAMES   APIVERSION                     NAMESPACED   KIND
clusterrolebindings                rbac.authorization.k8s.io/v1   false        ClusterRoleBinding
clusterroles                       rbac.authorization.k8s.io/v1   false        ClusterRole
rolebindings                       rbac.authorization.k8s.io/v1   true         RoleBinding
roles                              rbac.authorization.k8s.io/v1   true         Role
```

> Role 是`权限集合`，Role 只能用来给某个特定的 `Namespace` 中的资源做鉴权

```yaml role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "watch", "list"]
```

> ClusterRole 适用于`多 Namespace 的资源`、`集群级别的资源`、`非资源类的 API`

```yaml cluster-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: secret-reader
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "watch", "list"]
```

> Binding - RoleBinding 是与 Namespace 挂钩的，因此用户只有 default 下的权限

```yaml role-binding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  namespace: default
  name: read-secrets

subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: User
  name: bob

roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: secret-reader
```

![image-20230712001210433](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230712001210433.png)

> Group

![image-20230712001835088](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230712001835088.png)

1. 与`外部认证系统`对接时，用户信息（`UserInfo`）可以包含 `Group` 信息，授权可以针对`用户群组`
2. 对 `ServiceAccount` 授权时，Group 代表某个 `Namespace` 下的所有 ServiceAccount

```yaml cluster-role-binding-user.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: read-secrets-golobal-user

subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: Group
  name: manager # User

roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: secret-reader
```

```yaml cluster-role-binding-sa.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: read-secrets-global-sa

subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: Group
  name: system:serviceaccounts:default # ServiceAccount

roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: secret-reader
```

## 多租户

> 规划系统角色

1. User
   - 管理员
     - 所有资源的所有权限？ - `应用的 Secret` 不应该被管理员访问
   - 普通用户
     - 是否有该用户创建的 Namespace 下所有的 Object 的操作权限？
     - 对其它用户的 Namespace 资源是否可读？是否可写？
2. SystemAccount
   - SystemAccount 是开发者创建应用后，应用与 `API Server` 进行`通信`所需要的`身份`
   - Kubernetes 会为每个 Namespace 创建 `Default SystemAccount`
     - Default SystemAccount 需要授予给定权限后才能对 API Server 进行写操作

> 实现方案（自动化）：用户创建了某个 Namespace，则该用户拥有了该 Namespace 的所有权限

1. 在创建 Cluster 时，创建了一个 ClusterRole（名为 namespace-creator），该 ClusterRole 拥有集群的所有权限
2. 创建自定义的 namespace `admission webhook`
   - 当 `Namespace 创建请求`被处理时，获取`当前用户信息`并 `annotate` 到 namespace -- `mutating admission`
   - `Admission` 在 `Authentication` 和 `Authorization` 之后，所以能获取到创建者的信息
3. 创建 RBAC Controller
   - 监听 Namespace 的创建事件
   - 获取当前 Namespace 的创建者信息 -- 从上面 `mutating admission` 注入的 `Annotation` 来获取
   - 在当前 Namespace 创建 `RoleBinding`，并将 namespace-creator 与创建者绑定
     - 创建者拥有了该 Namespace 的所有权限

> 最佳实践

1. ClusterRole 是针对`整个集群`生效的
2. 创建一个`管理员角色`，并且绑定给`开发运营团队`成员
3. `ThirdPartyResource` 和 `CustomResourceDefinition` 是`全局资源 `
   - `普通用户`创建 ThirdPartyResource 后，需要管理员授权后才能真正操作该对象
4. 创建 `spec`，用`源码驱动`来进行`角色管理`
5. 权限是可以`传递`的
   - 用户 A 可以将其对某对象的某操作，抽取成一个权限，然后赋给用户 B
6. 防止`海量`的 Role 和 RoleBinding 对象，否则会导致`鉴权效率低下`，造成 API Server 的负担
7. ServiceAccount 也需要授权

> POST vs PUT vs PATCH

```yaml quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: object-counts
  namespace: default

spec:
  hard:
    configmaps: "1"
```

> create - POST

```
$ k create -f quota.yaml -v 9
I0715 13:19:57.134787  450767 loader.go:372] Config loaded from file:  /home/zhongmingmao/.kube/config
I0715 13:19:57.135531  450767 round_trippers.go:435] curl -v -XGET  -H "Accept: application/com.github.proto-openapi.spec.v2@v1.0+protobuf" -H "User-Agent: kubectl/v1.22.2 (linux/arm64) kubernetes/8b5a191" 'https://192.168.191.138:6443/openapi/v2?timeout=32s'
I0715 13:19:57.154717  450767 round_trippers.go:454] GET https://192.168.191.138:6443/openapi/v2?timeout=32s 200 OK in 19 milliseconds
I0715 13:19:57.154736  450767 round_trippers.go:460] Response Headers:
I0715 13:19:57.154739  450767 round_trippers.go:463]     Last-Modified: Tue, 30 May 2022 02:00:47 GMT
I0715 13:19:57.154741  450767 round_trippers.go:463]     X-Kubernetes-Pf-Prioritylevel-Uid: e2605faa-93d6-4d86-9ed5-dfd861e777f6
I0715 13:19:57.154743  450767 round_trippers.go:463]     Audit-Id: edc1e0fc-2f1f-427f-af08-95d9b8b5ce20
I0715 13:19:57.154745  450767 round_trippers.go:463]     Date: Sat, 15 Jul 2022 13:19:57 GMT
I0715 13:19:57.154747  450767 round_trippers.go:463]     X-Kubernetes-Pf-Flowschema-Uid: 2f005305-d15e-4252-bad1-edba0045f54d
I0715 13:19:57.154749  450767 round_trippers.go:463]     Etag: "16EDF837BE1F7591619543929575D12CB44EF9CA045DD612D1C78212BD9DD25D2E838683496297E3C87779ED322106670C9D598130BA223857EB7BD925CB8D61"
I0715 13:19:57.154755  450767 round_trippers.go:463]     Vary: Accept-Encoding
I0715 13:19:57.154757  450767 round_trippers.go:463]     Vary: Accept
I0715 13:19:57.154761  450767 round_trippers.go:463]     X-Varied-Accept: application/com.github.proto-openapi.spec.v2@v1.0+protobuf
I0715 13:19:57.154763  450767 round_trippers.go:463]     Accept-Ranges: bytes
I0715 13:19:57.154767  450767 round_trippers.go:463]     Cache-Control: no-cache, private
I0715 13:19:57.154769  450767 round_trippers.go:463]     Content-Type: application/octet-stream
I0715 13:19:57.154773  450767 round_trippers.go:463]     X-From-Cache: 1
I0715 13:19:57.222672  450767 request.go:1179] Response Body:
00000000  0a 03 32 2e 30 12 15 0a  0a 4b 75 62 65 72 6e 65  |..2.0....Kuberne|
00000010  74 65 73 12 07 76 31 2e  32 32 2e 32 42 95 f8 b3  |tes..v1.22.2B...|
00000020  01 12 8c 02 0a 22 2f 2e  77 65 6c 6c 2d 6b 6e 6f  |....."/.well-kno|
00000030  77 6e 2f 6f 70 65 6e 69  64 2d 63 6f 6e 66 69 67  |wn/openid-config|
00000040  75 72 61 74 69 6f 6e 2f  12 e5 01 12 e2 01 0a 09  |uration/........|
00000050  57 65 6c 6c 4b 6e 6f 77  6e 1a 57 67 65 74 20 73  |WellKnown.Wget s|
00000060  65 72 76 69 63 65 20 61  63 63 6f 75 6e 74 20 69  |ervice account i|
00000070  73 73 75 65 72 20 4f 70  65 6e 49 44 20 63 6f 6e  |ssuer OpenID con|
00000080  66 69 67 75 72 61 74 69  6f 6e 2c 20 61 6c 73 6f  |figuration, also|
00000090  20 6b 6e 6f 77 6e 20 61  73 20 74 68 65 20 27 4f  | known as the 'O|
000000a0  49 44 43 20 64 69 73 63  6f 76 65 72 79 20 64 6f  |IDC discovery do|
000000b0  63 27 2a 2a 67 65 74 53  65 72 76 69 63 65 41 63  |c'**getServiceAc|
000000c0  63 6f 75 6e 74 49 73 73  75 65 72 4f 70 65 6e 49  |countIssuerOpenI|
000000d0  44 43 6f 6e 66 69 67 75  72 61 74 69 6f 6e 32 10  |DConfiguration2.|
000000e0  61 70 70 6c 69 63 61 74  69 6f 6e 2f 6a 73 6f 6e  |application/json|
000000f0  4a 37 0a 1c 0a 03 32 30  30 12 15 0a 13 0a 02 4f  |J7....200......O|
00000100  4b 12 0d 0a 0b b2 01 08  0a 06 73 74 72 69 6e 67  |K.........string|
00000110  0a 17 0a 03 34 30 31 12  10 0a 0e 0a 0c 55 6e 61  |....401......Una|
00000120  75 74 68 6f 72 69 7a 65  64 52 05 68 74 74 70 73  |uthorizedR.https|
00000130  12 ca 02 0a 05 2f 61 70  69 2f 12 c0 02 12 bd 02  |...../api/......|
00000140  0a 04 63 6f 72 65 1a 1a  67 65 74 20 61 76 61 69  |..core..get avai|
00000150  6c 61 62 6c 65 20 41 50  49 20 76 65 72 73 69 6f  |lable API versio|
00000160  6e 73 2a 12 67 65 74 43  6f 72 65 41 50 49 56 65  |ns*.getCoreAPIVe|
00000170  72 73 69 6f 6e 73 32 10  61 70 70 6c 69 63 61 74  |rsions2.applicat|
00000180  69 6f 6e 2f 6a 73 6f 6e  32 10 61 70 70 6c 69 63  |ion/json2.applic|
00000190  61 74 69 6f 6e 2f 79 61  6d 6c 32 23 61 70 70 6c  |ation/yaml2#appl|
000001a0  69 63 61 74 69 6f 6e 2f  76 6e 64 2e 6b 75 62 65  |ication/vnd.kube|
000001b0  72 6e 65 74 65 73 2e 70  72 6f 74 6f 62 75 66 3a  |rnetes.protobuf:|
000001c0  10 61 70 70 6c 69 63 61  74 69 6f 6e 2f 6a 73 6f  |.application/jso|
000001d0  6e 3a 10 61 70 70 6c 69  63 61 74 69 6f 6e 2f 79  |n:.application/y|
000001e0  61 6d 6c 3a 23 61 70 70  6c 69 63 61 74 69 6f 6e  |aml:#application|
000001f0  2f 76 6e 64 2e 6b 75 62  65 72 6e 65 74 65 73 2e  |/vnd.kubernetes.|
00000200  70 72 6f 74 6f 62 75 66  4a 6c 0a 51 0a 03 32 30  |protobufJl.Q..20|
00000210  30 12 4a 0a 48 0a 02 4f  4b 12 42 0a 40 0a 3e 23  |0.J.H..OK.B.@.>#|
00000220  2f 64 65 66 69 6e 69 74  69 6f 6e 73 2f 69 6f 2e  |/definitions/io.|
00000230  6b 38 73 2e 61 70 69 6d  61 63 68 69 6e 65 72 79  |k8s.apimachinery|
00000240  2e 70 6b 67 2e 61 70 69  73 2e 6d 65 74 61 2e 76  |.pkg.apis.meta.v|
00000250  31 2e 41 50 49 56 65 72  73 69 6f 6e 73 0a 17 0a  |1.APIVersions...|
00000260  03 34 30 31 12 10 0a 0e  0a 0c 55 6e 61 75 74 68  |.401......Unauth|
00000270  6f 72 69 7a 65 64 52 05  68 74 74 70 73 12 d4 02  |orizedR.https...|
00000280  0a 08 2f 61 70 69 2f 76  31 2f 12 c7 02 12 c4 02  |../api/v1/......|
00000290  0a 07 63 6f 72 65 5f 76  31 1a 17 67 65 74 20 61  |..core_v1..get a|
000002a0  76 61 69 6c 61 62 6c 65  20 72 65 73 6f 75 72 63  |vailable resourc|
000002b0  65 73 2a 15 67 65 74 43  6f 72 65 56 31 41 50 49  |es*.getCoreV1API|
000002c0  52 65 73 6f 75 72 63 65  73 32 10 61 70 70 6c 69  |Resources2.appli|
000002d0  63 61 74 69 6f 6e 2f 6a  73 6f 6e 32 10 61 70 70  |cation/json2.app|
000002e0  6c 69 63 61 74 69 6f 6e  2f 79 61 6d 6c 32 23 61  |lication/yaml2#a|
000002f0  70 70 6c 69 63 61 74 69  6f 6e 2f 76 6e 64 2e 6b  |pplication/vnd.k|
00000300  75 62 65 72 6e 65 74 65  73 2e 70 72 6f 74 6f 62  |ubernetes.protob|
00000310  75 66 3a 10 61 70 70 6c  69 63 61 74 69 6f 6e 2f  |uf:.application/|
00000320  6a 73 6f 6e 3a 10 61 70  70 6c 69 63 61 74 69 6f  |json:.applicatio|
00000330  6e 2f 79 61 6d 6c 3a 23  61 70 70 6c 69 63 61 74  |n/yaml:#applicat|
00000340  69 6f 6e 2f 76 6e 64 2e  6b 75 62 65 72 6e 65 74  |ion/vnd.kubernet|
00000350  65 73 2e 70 72 6f 74 6f  62 75 66 4a 70 0a 55 0a  |es.protobufJp.U.|
00000360  03 32 30 30 12 4e 0a 4c  0a 02 4f 4b 12 46 0a 44  |.200.N.L..OK.F.D|
00000370  0a 42 23 2f 64 65 66 69  6e 69 74 69 6f 6e 73 2f  |.B#/definitions/|
00000380  69 6f 2e 6b 38 73 2e 61  70 69 6d 61 63 68 69 6e  |io.k8s.apimachin|
00000390  65 72 79 2e 70 6b 67 2e  61 70 69 73 2e 6d 65 74  |ery.pkg.apis.met|
000003a0  61 2e 76 31 2e 41 50 49  52 65 73 6f 75 72 63 65  |a.v1.APIResource|
000003b0  4c 69 73 74 0a 17 0a 03  34 30 31 12 10 0a 0e 0a  |List....401.....|
000003c0  0c 55 6e 61 75 74 68 6f  72 69 7a 65 64 52 05 68  |.UnauthorizedR.h|
000003d0  74 74 70 73 12 9a 26 0a  19 2f 61 70 69 2f 76 31  |ttps..&../api/v1|
000003e0  2f 63 6f 6d 70 6f 6e 65  6e 74 73 74 61 74 75 73  |/componentstatus|
000003f0  65 73 12 fc 25 12 c7 03  0a 07 63 6f 72 65 5f 76  |es..%.....core_v|
00000400  31 1a 24 6c 69 73 74 20  6f 62 6a 65 63 74 73 20  |1.$list objects |
00000410  6f 66 20 6b 69 6e 64 20  43 6f 6d 70 6f 6e 65 6e  |of kind Componen|
00000420  74 53 74 61 74 75 73 2a  19 6c 69 73 74 43 6f 72  |tStatus*.listCor|
00000430  65 56 31 43 6f 6d 70 6f  6e 65 6e 74 53 74 61 74  |eV1ComponentStat|
00000440  75 73 32 10 61 70 70 6c  69 63 61 74 69 6f 6e 2f  |us2.application/|
00000450  6a 73 6f 6e 32 10 61 70  70 6c 69 63 61 74 69 6f  |json2.applicatio|
00000460  6e 2f 79 61 6d 6c 32 23  61 70 70 6c 69 63 61 74  |n/yaml2#applicat|
00000470  69 6f 6e 2f 76 6e 64 2e  6b 75 62 65 72 6e 65 74  |ion/vnd.kubernet|
00000480  65 73 2e 70 72 6f 74 6f  62 75 66 32 1d 61 70 70  |es.protobuf2.app|
00000490  6c 69 63 61 74 69 6f 6e  2f 6a 73 6f 6e 3b 73 74  |lication/json;st|
000004a0  72 65 61 6d 3d 77 61 74  63 68 32 30 61 70 70 6c  |ream=watch20appl|
000004b0  69 63 61 74 69 6f 6e 2f  76 6e 64 2e 6b 75 62 65  |ication/vnd.kube|
000004c0  72 6e 65 74 65 73 2e 70  72 6f 74 6f 62 75 66 3b  |rnetes.protobuf;|
000004d0  73 74 72 65 61 6d 3d 77  61 74 63 68 3a 03 2a 2f  |stream=watch:.*/|
000004e0  2a 4a 62 0a 47 0a 03 32  30 30 12 40 0a 3e 0a 02  |*Jb.G..200.@.>..|
000004f0  4f 4b 12 38 0a 36 0a 34  23 2f 64 65 66 69 6e 69  |OK.8.6.4#/defini|
00000500  74 69 6f 6e 73 2f 69 6f  2e 6b 38 73 2e 61 70 69  |tions/io.k8s.api|
00000510  2e 63 6f 72 65 2e 76 31  2e 43 6f 6d 70 6f 6e 65  |.core.v1.Compone|
00000520  6e 74 53 74 61 74 75 73  4c 69 73 74 0a 17 0a 03  |ntStatusList....|
00000530  34 30 31 12 10 0a 0e 0a  0c 55 6e 61 75 74 68 6f  |401......Unautho|
00000540  72 69 7a 65 64 52 05 68  74 74 70 73 6a 1e 0a 13  |rizedR.httpsj...|
00000550  78 2d 6b 75 62 65 72 6e  65 74 65 73 2d 61 63 74  |x-kubernetes-act|
00000560  69 6f 6e 12 07 12 05 6c  69 73 74 0a 6a 51 0a 1f  |ion....list.jQ..|
00000570  78 2d 6b 75 62 65 72 6e  65 74 65 73 2d 67 72 6f  |x-kubernetes-gro|
00000580  75 70 2d 76 65 72 73 69  6f 6e 2d 6b 69 6e 64 12  |up-version-kind.|
00000590  2e 12 2c 67 72 6f 75 70  3a 20 22 22 0a 6b 69 6e  |..,group: "".kin|
000005a0  64 3a 20 43 6f 6d 70 6f  6e 65 6e 74 53 74 61 74  |d: ComponentStat|
000005b0  75 73 0a 76 65 72 73 69  6f 6e 3a 20 76 31 0a 4a  |us.version: v1.J|
000005c0  ab 03 0a a8 03 12 a5 03  1a a2 03 12 05 71 75 65  |.............que|
000005d0  72 79 1a f7 02 61 6c 6c  6f 77 57 61 74 63 68 42  |ry...allowWatchB|
000005e0  6f 6f 6b 6d 61 72 6b 73  20 72 65 71 75 65 73 74  |ookmarks request|
000005f0  73 20 77 61 74 63 68 20  65 76 65 6e 74 73 20 77  |s watch events w|
00000600  69 74 68 20 74 79 70 65  20 22 42 4f 4f 4b 4d 41  |ith type "BOOKMA|
00000610  52 4b 22 2e 20 53 65 72  76 65 72 73 20 74 68 61  |RK". Servers tha|
00000620  74 20 64 6f 20 6e 6f 74  20 69 6d 70 6c 65 6d 65  |t do not impleme|
00000630  6e 74 20 62 6f 6f 6b 6d  61 72 6b 73 20 6d 61 79  |nt bookmarks may|
00000640  20 69 67 6e 6f 72 65 20  74 68 69 73 20 66 6c 61  | ignore this fla|
00000650  67 20 61 6e 64 20 62 6f  6f 6b 6d 61 72 6b 73 20  |g and bookmarks |
00000660  61 72 65 20 73 65 6e 74  20 61 74 20 74 68 65 20  |are sent at the |
00000670  73 65 72 76 65 72 27 73  20 64 69 73 63 72 65 74  |server's discret|
00000680  69 6f 6e 2e 20 43 6c 69  65 6e 74 73 20 73 68 6f  |ion. Clients sho|
00000690  75 6c 64 20 6e 6f 74 20  61 73 73 75 6d 65 20 62  |uld not assume b|
000006a0  6f 6f 6b 6d 61 72 6b 73  20 61 72 65 20 72 65 74  |ookmarks are ret|
000006b0  75 72 6e 65 64 20 61 74  20 61 6e 79 20 73 70 65  |urned at any spe|
000006c0  63 69 66 69 63 20 69 6e  74 65 72 76 61 6c 2c 20  |cific interval, |
000006d0  6e 6f 72 20 6d 61 79 20  74 68 65 79 20 61 73 73  |nor may they ass|
000006e0  75 6d 65 20 74 68 65 20  73 65 72 76 65 72 20 77  |ume the server w|
000006f0  69 6c 6c 20 73 65 6e 64  20 61 6e 79 20 42 4f 4f  |ill send any BOO|
00000700  4b 4d 41 52 4b 20 65 76  65 6e 74 20 64 75 72 69  |KMARK event duri|
00000710  6e 67 20 61 20 73 65 73  73 69 6f 6e 2e 20 49 66  |ng a session. If|
00000720  20 74 68 69 73 20 69 73  20 6e 6f 74 20 61 20 77  | this is not a w|
00000730  61 74 63 68 2c 20 74 68  69 73 20 66 69 65 6c 64  |atch, this field|
00000740  20 69 73 20 69 67 6e 6f  72 65 64 2e 22 13 61 6c  | is ignored.".al|
00000750  6c 6f 77 57 61 74 63 68  42 6f 6f 6b 6d 61 72 6b  |lowWatchBookmark|
00000760  73 32 07 62 6f 6f 6c 65  61 6e a0 01 01 4a ef 09  |s2.boolean...J..|
00000770  0a ec 09 12 e9 09 1a e6  09 12 05 71 75 65 72 79  |...........query|
00000780  1a c7 09 54 68 65 20 63  6f 6e 74 69 6e 75 65 20  |...The continue |
00000790  6f 70 74 69 6f 6e 20 73  68 6f 75 6c 64 20 62 65  |option should be|
000007a0  20 73 65 74 20 77 68 65  6e 20 72 65 74 72 69 65  | set when retrie|
000007b0  76 69 6e 67 20 6d 6f 72  65 20 72 65 73 75 6c 74  |ving more result|
000007c0  73 20 66 72 6f 6d 20 74  68 65 20 73 65 72 76 65  |s from the serve|
000007d0  72 2e 20 53 69 6e 63 65  20 74 68 69 73 20 76 61  |r. Since this va|
000007e0  6c 75 65 20 69 73 20 73  65 72 76 65 72 20 64 65  |lue is server de|
000007f0  66 69 6e 65 64 2c 20 63  6c 69 65 6e 74 73 20 6d  |fined, clients m|
00000800  61 79 20 6f 6e 6c 79 20  75 73 65 20 74 68 65 20  |ay only use the |
00000810  63 6f 6e 74 69 6e 75 65  20 76 61 6c 75 [truncated 20865904 chars]
I0715 13:19:57.253243  450767 request.go:1181] Request Body: {"apiVersion":"v1","kind":"ResourceQuota","metadata":{"name":"object-counts","namespace":"default"},"spec":{"hard":{"configmaps":"1"}}}
I0715 13:19:57.253294  450767 round_trippers.go:435] curl -v -XPOST  -H "Accept: application/json" -H "Content-Type: application/json" -H "User-Agent: kubectl/v1.22.2 (linux/arm64) kubernetes/8b5a191" 'https://192.168.191.138:6443/api/v1/namespaces/default/resourcequotas?fieldManager=kubectl-create'
I0715 13:19:57.256150  450767 round_trippers.go:454] POST https://192.168.191.138:6443/api/v1/namespaces/default/resourcequotas?fieldManager=kubectl-create 201 Created in 2 milliseconds
I0715 13:19:57.256168  450767 round_trippers.go:460] Response Headers:
I0715 13:19:57.256171  450767 round_trippers.go:463]     X-Kubernetes-Pf-Prioritylevel-Uid: e2605faa-93d6-4d86-9ed5-dfd861e777f6
I0715 13:19:57.256173  450767 round_trippers.go:463]     Content-Length: 462
I0715 13:19:57.256175  450767 round_trippers.go:463]     Date: Sat, 15 Jul 2022 13:19:57 GMT
I0715 13:19:57.256177  450767 round_trippers.go:463]     Audit-Id: e8031f78-e9dd-409f-9a1e-6b3b9efed506
I0715 13:19:57.256239  450767 round_trippers.go:463]     Cache-Control: no-cache, private
I0715 13:19:57.256241  450767 round_trippers.go:463]     Content-Type: application/json
I0715 13:19:57.256243  450767 round_trippers.go:463]     X-Kubernetes-Pf-Flowschema-Uid: 2f005305-d15e-4252-bad1-edba0045f54d
I0715 13:19:57.256260  450767 request.go:1181] Response Body: {"kind":"ResourceQuota","apiVersion":"v1","metadata":{"name":"object-counts","namespace":"default","uid":"4cf2c318-6287-4836-b4ff-aa656a9e7a83","resourceVersion":"34451","creationTimestamp":"2022-07-15T13:19:57Z","managedFields":[{"manager":"kubectl-create","operation":"Update","apiVersion":"v1","time":"2022-07-15T13:19:57Z","fieldsType":"FieldsV1","fieldsV1":{"f:spec":{"f:hard":{".":{},"f:configmaps":{}}}}}]},"spec":{"hard":{"configmaps":"1"}},"status":{}}
resourcequota/object-counts created
```

> replace - PUT -All

```
$ k replace -f quota.yaml -v 9
I0715 13:22:49.205898  453970 loader.go:372] Config loaded from file:  /home/zhongmingmao/.kube/config
I0715 13:22:49.207053  453970 round_trippers.go:435] curl -v -XGET  -H "User-Agent: kubectl/v1.22.2 (linux/arm64) kubernetes/8b5a191" -H "Accept: application/com.github.proto-openapi.spec.v2@v1.0+protobuf" 'https://192.168.191.138:6443/openapi/v2?timeout=32s'
I0715 13:22:49.224987  453970 round_trippers.go:454] GET https://192.168.191.138:6443/openapi/v2?timeout=32s 200 OK in 17 milliseconds
I0715 13:22:49.225007  453970 round_trippers.go:460] Response Headers:
I0715 13:22:49.225010  453970 round_trippers.go:463]     Content-Type: application/octet-stream
I0715 13:22:49.225013  453970 round_trippers.go:463]     X-Varied-Accept: application/com.github.proto-openapi.spec.v2@v1.0+protobuf
I0715 13:22:49.225015  453970 round_trippers.go:463]     Accept-Ranges: bytes
I0715 13:22:49.225017  453970 round_trippers.go:463]     Vary: Accept-Encoding
I0715 13:22:49.225019  453970 round_trippers.go:463]     Vary: Accept
I0715 13:22:49.225021  453970 round_trippers.go:463]     X-From-Cache: 1
I0715 13:22:49.225027  453970 round_trippers.go:463]     X-Kubernetes-Pf-Prioritylevel-Uid: e2605faa-93d6-4d86-9ed5-dfd861e777f6
I0715 13:22:49.225032  453970 round_trippers.go:463]     Date: Sat, 15 Jul 2022 13:22:49 GMT
I0715 13:22:49.225034  453970 round_trippers.go:463]     X-Kubernetes-Pf-Flowschema-Uid: 2f005305-d15e-4252-bad1-edba0045f54d
I0715 13:22:49.225039  453970 round_trippers.go:463]     Audit-Id: 3d83bf57-b770-469c-a6dd-1c6e6ed16c94
I0715 13:22:49.225044  453970 round_trippers.go:463]     Cache-Control: no-cache, private
I0715 13:22:49.225047  453970 round_trippers.go:463]     Etag: "16EDF837BE1F7591619543929575D12CB44EF9CA045DD612D1C78212BD9DD25D2E838683496297E3C87779ED322106670C9D598130BA223857EB7BD925CB8D61"
I0715 13:22:49.225049  453970 round_trippers.go:463]     Last-Modified: Tue, 30 May 2022 02:00:47 GMT
I0715 13:22:49.289318  453970 request.go:1179] Response Body:
00000000  0a 03 32 2e 30 12 15 0a  0a 4b 75 62 65 72 6e 65  |..2.0....Kuberne|
00000010  74 65 73 12 07 76 31 2e  32 32 2e 32 42 95 f8 b3  |tes..v1.22.2B...|
00000020  01 12 8c 02 0a 22 2f 2e  77 65 6c 6c 2d 6b 6e 6f  |....."/.well-kno|
00000030  77 6e 2f 6f 70 65 6e 69  64 2d 63 6f 6e 66 69 67  |wn/openid-config|
00000040  75 72 61 74 69 6f 6e 2f  12 e5 01 12 e2 01 0a 09  |uration/........|
00000050  57 65 6c 6c 4b 6e 6f 77  6e 1a 57 67 65 74 20 73  |WellKnown.Wget s|
00000060  65 72 76 69 63 65 20 61  63 63 6f 75 6e 74 20 69  |ervice account i|
00000070  73 73 75 65 72 20 4f 70  65 6e 49 44 20 63 6f 6e  |ssuer OpenID con|
00000080  66 69 67 75 72 61 74 69  6f 6e 2c 20 61 6c 73 6f  |figuration, also|
00000090  20 6b 6e 6f 77 6e 20 61  73 20 74 68 65 20 27 4f  | known as the 'O|
000000a0  49 44 43 20 64 69 73 63  6f 76 65 72 79 20 64 6f  |IDC discovery do|
000000b0  63 27 2a 2a 67 65 74 53  65 72 76 69 63 65 41 63  |c'**getServiceAc|
000000c0  63 6f 75 6e 74 49 73 73  75 65 72 4f 70 65 6e 49  |countIssuerOpenI|
000000d0  44 43 6f 6e 66 69 67 75  72 61 74 69 6f 6e 32 10  |DConfiguration2.|
000000e0  61 70 70 6c 69 63 61 74  69 6f 6e 2f 6a 73 6f 6e  |application/json|
000000f0  4a 37 0a 1c 0a 03 32 30  30 12 15 0a 13 0a 02 4f  |J7....200......O|
00000100  4b 12 0d 0a 0b b2 01 08  0a 06 73 74 72 69 6e 67  |K.........string|
00000110  0a 17 0a 03 34 30 31 12  10 0a 0e 0a 0c 55 6e 61  |....401......Una|
00000120  75 74 68 6f 72 69 7a 65  64 52 05 68 74 74 70 73  |uthorizedR.https|
00000130  12 ca 02 0a 05 2f 61 70  69 2f 12 c0 02 12 bd 02  |...../api/......|
00000140  0a 04 63 6f 72 65 1a 1a  67 65 74 20 61 76 61 69  |..core..get avai|
00000150  6c 61 62 6c 65 20 41 50  49 20 76 65 72 73 69 6f  |lable API versio|
00000160  6e 73 2a 12 67 65 74 43  6f 72 65 41 50 49 56 65  |ns*.getCoreAPIVe|
00000170  72 73 69 6f 6e 73 32 10  61 70 70 6c 69 63 61 74  |rsions2.applicat|
00000180  69 6f 6e 2f 6a 73 6f 6e  32 10 61 70 70 6c 69 63  |ion/json2.applic|
00000190  61 74 69 6f 6e 2f 79 61  6d 6c 32 23 61 70 70 6c  |ation/yaml2#appl|
000001a0  69 63 61 74 69 6f 6e 2f  76 6e 64 2e 6b 75 62 65  |ication/vnd.kube|
000001b0  72 6e 65 74 65 73 2e 70  72 6f 74 6f 62 75 66 3a  |rnetes.protobuf:|
000001c0  10 61 70 70 6c 69 63 61  74 69 6f 6e 2f 6a 73 6f  |.application/jso|
000001d0  6e 3a 10 61 70 70 6c 69  63 61 74 69 6f 6e 2f 79  |n:.application/y|
000001e0  61 6d 6c 3a 23 61 70 70  6c 69 63 61 74 69 6f 6e  |aml:#application|
000001f0  2f 76 6e 64 2e 6b 75 62  65 72 6e 65 74 65 73 2e  |/vnd.kubernetes.|
00000200  70 72 6f 74 6f 62 75 66  4a 6c 0a 51 0a 03 32 30  |protobufJl.Q..20|
00000210  30 12 4a 0a 48 0a 02 4f  4b 12 42 0a 40 0a 3e 23  |0.J.H..OK.B.@.>#|
00000220  2f 64 65 66 69 6e 69 74  69 6f 6e 73 2f 69 6f 2e  |/definitions/io.|
00000230  6b 38 73 2e 61 70 69 6d  61 63 68 69 6e 65 72 79  |k8s.apimachinery|
00000240  2e 70 6b 67 2e 61 70 69  73 2e 6d 65 74 61 2e 76  |.pkg.apis.meta.v|
00000250  31 2e 41 50 49 56 65 72  73 69 6f 6e 73 0a 17 0a  |1.APIVersions...|
00000260  03 34 30 31 12 10 0a 0e  0a 0c 55 6e 61 75 74 68  |.401......Unauth|
00000270  6f 72 69 7a 65 64 52 05  68 74 74 70 73 12 d4 02  |orizedR.https...|
00000280  0a 08 2f 61 70 69 2f 76  31 2f 12 c7 02 12 c4 02  |../api/v1/......|
00000290  0a 07 63 6f 72 65 5f 76  31 1a 17 67 65 74 20 61  |..core_v1..get a|
000002a0  76 61 69 6c 61 62 6c 65  20 72 65 73 6f 75 72 63  |vailable resourc|
000002b0  65 73 2a 15 67 65 74 43  6f 72 65 56 31 41 50 49  |es*.getCoreV1API|
000002c0  52 65 73 6f 75 72 63 65  73 32 10 61 70 70 6c 69  |Resources2.appli|
000002d0  63 61 74 69 6f 6e 2f 6a  73 6f 6e 32 10 61 70 70  |cation/json2.app|
000002e0  6c 69 63 61 74 69 6f 6e  2f 79 61 6d 6c 32 23 61  |lication/yaml2#a|
000002f0  70 70 6c 69 63 61 74 69  6f 6e 2f 76 6e 64 2e 6b  |pplication/vnd.k|
00000300  75 62 65 72 6e 65 74 65  73 2e 70 72 6f 74 6f 62  |ubernetes.protob|
00000310  75 66 3a 10 61 70 70 6c  69 63 61 74 69 6f 6e 2f  |uf:.application/|
00000320  6a 73 6f 6e 3a 10 61 70  70 6c 69 63 61 74 69 6f  |json:.applicatio|
00000330  6e 2f 79 61 6d 6c 3a 23  61 70 70 6c 69 63 61 74  |n/yaml:#applicat|
00000340  69 6f 6e 2f 76 6e 64 2e  6b 75 62 65 72 6e 65 74  |ion/vnd.kubernet|
00000350  65 73 2e 70 72 6f 74 6f  62 75 66 4a 70 0a 55 0a  |es.protobufJp.U.|
00000360  03 32 30 30 12 4e 0a 4c  0a 02 4f 4b 12 46 0a 44  |.200.N.L..OK.F.D|
00000370  0a 42 23 2f 64 65 66 69  6e 69 74 69 6f 6e 73 2f  |.B#/definitions/|
00000380  69 6f 2e 6b 38 73 2e 61  70 69 6d 61 63 68 69 6e  |io.k8s.apimachin|
00000390  65 72 79 2e 70 6b 67 2e  61 70 69 73 2e 6d 65 74  |ery.pkg.apis.met|
000003a0  61 2e 76 31 2e 41 50 49  52 65 73 6f 75 72 63 65  |a.v1.APIResource|
000003b0  4c 69 73 74 0a 17 0a 03  34 30 31 12 10 0a 0e 0a  |List....401.....|
000003c0  0c 55 6e 61 75 74 68 6f  72 69 7a 65 64 52 05 68  |.UnauthorizedR.h|
000003d0  74 74 70 73 12 9a 26 0a  19 2f 61 70 69 2f 76 31  |ttps..&../api/v1|
000003e0  2f 63 6f 6d 70 6f 6e 65  6e 74 73 74 61 74 75 73  |/componentstatus|
000003f0  65 73 12 fc 25 12 c7 03  0a 07 63 6f 72 65 5f 76  |es..%.....core_v|
00000400  31 1a 24 6c 69 73 74 20  6f 62 6a 65 63 74 73 20  |1.$list objects |
00000410  6f 66 20 6b 69 6e 64 20  43 6f 6d 70 6f 6e 65 6e  |of kind Componen|
00000420  74 53 74 61 74 75 73 2a  19 6c 69 73 74 43 6f 72  |tStatus*.listCor|
00000430  65 56 31 43 6f 6d 70 6f  6e 65 6e 74 53 74 61 74  |eV1ComponentStat|
00000440  75 73 32 10 61 70 70 6c  69 63 61 74 69 6f 6e 2f  |us2.application/|
00000450  6a 73 6f 6e 32 10 61 70  70 6c 69 63 61 74 69 6f  |json2.applicatio|
00000460  6e 2f 79 61 6d 6c 32 23  61 70 70 6c 69 63 61 74  |n/yaml2#applicat|
00000470  69 6f 6e 2f 76 6e 64 2e  6b 75 62 65 72 6e 65 74  |ion/vnd.kubernet|
00000480  65 73 2e 70 72 6f 74 6f  62 75 66 32 1d 61 70 70  |es.protobuf2.app|
00000490  6c 69 63 61 74 69 6f 6e  2f 6a 73 6f 6e 3b 73 74  |lication/json;st|
000004a0  72 65 61 6d 3d 77 61 74  63 68 32 30 61 70 70 6c  |ream=watch20appl|
000004b0  69 63 61 74 69 6f 6e 2f  76 6e 64 2e 6b 75 62 65  |ication/vnd.kube|
000004c0  72 6e 65 74 65 73 2e 70  72 6f 74 6f 62 75 66 3b  |rnetes.protobuf;|
000004d0  73 74 72 65 61 6d 3d 77  61 74 63 68 3a 03 2a 2f  |stream=watch:.*/|
000004e0  2a 4a 62 0a 47 0a 03 32  30 30 12 40 0a 3e 0a 02  |*Jb.G..200.@.>..|
000004f0  4f 4b 12 38 0a 36 0a 34  23 2f 64 65 66 69 6e 69  |OK.8.6.4#/defini|
00000500  74 69 6f 6e 73 2f 69 6f  2e 6b 38 73 2e 61 70 69  |tions/io.k8s.api|
00000510  2e 63 6f 72 65 2e 76 31  2e 43 6f 6d 70 6f 6e 65  |.core.v1.Compone|
00000520  6e 74 53 74 61 74 75 73  4c 69 73 74 0a 17 0a 03  |ntStatusList....|
00000530  34 30 31 12 10 0a 0e 0a  0c 55 6e 61 75 74 68 6f  |401......Unautho|
00000540  72 69 7a 65 64 52 05 68  74 74 70 73 6a 1e 0a 13  |rizedR.httpsj...|
00000550  78 2d 6b 75 62 65 72 6e  65 74 65 73 2d 61 63 74  |x-kubernetes-act|
00000560  69 6f 6e 12 07 12 05 6c  69 73 74 0a 6a 51 0a 1f  |ion....list.jQ..|
00000570  78 2d 6b 75 62 65 72 6e  65 74 65 73 2d 67 72 6f  |x-kubernetes-gro|
00000580  75 70 2d 76 65 72 73 69  6f 6e 2d 6b 69 6e 64 12  |up-version-kind.|
00000590  2e 12 2c 67 72 6f 75 70  3a 20 22 22 0a 6b 69 6e  |..,group: "".kin|
000005a0  64 3a 20 43 6f 6d 70 6f  6e 65 6e 74 53 74 61 74  |d: ComponentStat|
000005b0  75 73 0a 76 65 72 73 69  6f 6e 3a 20 76 31 0a 4a  |us.version: v1.J|
000005c0  ab 03 0a a8 03 12 a5 03  1a a2 03 12 05 71 75 65  |.............que|
000005d0  72 79 1a f7 02 61 6c 6c  6f 77 57 61 74 63 68 42  |ry...allowWatchB|
000005e0  6f 6f 6b 6d 61 72 6b 73  20 72 65 71 75 65 73 74  |ookmarks request|
000005f0  73 20 77 61 74 63 68 20  65 76 65 6e 74 73 20 77  |s watch events w|
00000600  69 74 68 20 74 79 70 65  20 22 42 4f 4f 4b 4d 41  |ith type "BOOKMA|
00000610  52 4b 22 2e 20 53 65 72  76 65 72 73 20 74 68 61  |RK". Servers tha|
00000620  74 20 64 6f 20 6e 6f 74  20 69 6d 70 6c 65 6d 65  |t do not impleme|
00000630  6e 74 20 62 6f 6f 6b 6d  61 72 6b 73 20 6d 61 79  |nt bookmarks may|
00000640  20 69 67 6e 6f 72 65 20  74 68 69 73 20 66 6c 61  | ignore this fla|
00000650  67 20 61 6e 64 20 62 6f  6f 6b 6d 61 72 6b 73 20  |g and bookmarks |
00000660  61 72 65 20 73 65 6e 74  20 61 74 20 74 68 65 20  |are sent at the |
00000670  73 65 72 76 65 72 27 73  20 64 69 73 63 72 65 74  |server's discret|
00000680  69 6f 6e 2e 20 43 6c 69  65 6e 74 73 20 73 68 6f  |ion. Clients sho|
00000690  75 6c 64 20 6e 6f 74 20  61 73 73 75 6d 65 20 62  |uld not assume b|
000006a0  6f 6f 6b 6d 61 72 6b 73  20 61 72 65 20 72 65 74  |ookmarks are ret|
000006b0  75 72 6e 65 64 20 61 74  20 61 6e 79 20 73 70 65  |urned at any spe|
000006c0  63 69 66 69 63 20 69 6e  74 65 72 76 61 6c 2c 20  |cific interval, |
000006d0  6e 6f 72 20 6d 61 79 20  74 68 65 79 20 61 73 73  |nor may they ass|
000006e0  75 6d 65 20 74 68 65 20  73 65 72 76 65 72 20 77  |ume the server w|
000006f0  69 6c 6c 20 73 65 6e 64  20 61 6e 79 20 42 4f 4f  |ill send any BOO|
00000700  4b 4d 41 52 4b 20 65 76  65 6e 74 20 64 75 72 69  |KMARK event duri|
00000710  6e 67 20 61 20 73 65 73  73 69 6f 6e 2e 20 49 66  |ng a session. If|
00000720  20 74 68 69 73 20 69 73  20 6e 6f 74 20 61 20 77  | this is not a w|
00000730  61 74 63 68 2c 20 74 68  69 73 20 66 69 65 6c 64  |atch, this field|
00000740  20 69 73 20 69 67 6e 6f  72 65 64 2e 22 13 61 6c  | is ignored.".al|
00000750  6c 6f 77 57 61 74 63 68  42 6f 6f 6b 6d 61 72 6b  |lowWatchBookmark|
00000760  73 32 07 62 6f 6f 6c 65  61 6e a0 01 01 4a ef 09  |s2.boolean...J..|
00000770  0a ec 09 12 e9 09 1a e6  09 12 05 71 75 65 72 79  |...........query|
00000780  1a c7 09 54 68 65 20 63  6f 6e 74 69 6e 75 65 20  |...The continue |
00000790  6f 70 74 69 6f 6e 20 73  68 6f 75 6c 64 20 62 65  |option should be|
000007a0  20 73 65 74 20 77 68 65  6e 20 72 65 74 72 69 65  | set when retrie|
000007b0  76 69 6e 67 20 6d 6f 72  65 20 72 65 73 75 6c 74  |ving more result|
000007c0  73 20 66 72 6f 6d 20 74  68 65 20 73 65 72 76 65  |s from the serve|
000007d0  72 2e 20 53 69 6e 63 65  20 74 68 69 73 20 76 61  |r. Since this va|
000007e0  6c 75 65 20 69 73 20 73  65 72 76 65 72 20 64 65  |lue is server de|
000007f0  66 69 6e 65 64 2c 20 63  6c 69 65 6e 74 73 20 6d  |fined, clients m|
00000800  61 79 20 6f 6e 6c 79 20  75 73 65 20 74 68 65 20  |ay only use the |
00000810  63 6f 6e 74 69 6e 75 65  20 76 61 6c 75 [truncated 20865904 chars]
I0715 13:22:49.323719  453970 round_trippers.go:435] curl -v -XGET  -H "User-Agent: kubectl/v1.22.2 (linux/arm64) kubernetes/8b5a191" -H "Accept: application/json" 'https://192.168.191.138:6443/api/v1/namespaces/default/resourcequotas/object-counts'
I0715 13:22:49.325046  453970 round_trippers.go:454] GET https://192.168.191.138:6443/api/v1/namespaces/default/resourcequotas/object-counts 200 OK in 1 milliseconds
I0715 13:22:49.325087  453970 round_trippers.go:460] Response Headers:
I0715 13:22:49.325094  453970 round_trippers.go:463]     Audit-Id: 6e820860-b22a-4d73-99c9-286e6992378b
I0715 13:22:49.325098  453970 round_trippers.go:463]     Cache-Control: no-cache, private
I0715 13:22:49.325101  453970 round_trippers.go:463]     Content-Type: application/json
I0715 13:22:49.325104  453970 round_trippers.go:463]     X-Kubernetes-Pf-Flowschema-Uid: 2f005305-d15e-4252-bad1-edba0045f54d
I0715 13:22:49.325109  453970 round_trippers.go:463]     X-Kubernetes-Pf-Prioritylevel-Uid: e2605faa-93d6-4d86-9ed5-dfd861e777f6
I0715 13:22:49.325112  453970 round_trippers.go:463]     Content-Length: 765
I0715 13:22:49.325115  453970 round_trippers.go:463]     Date: Sat, 15 Jul 2022 13:22:49 GMT
I0715 13:22:49.325131  453970 request.go:1181] Response Body: {"kind":"ResourceQuota","apiVersion":"v1","metadata":{"name":"object-counts","namespace":"default","uid":"1ea31ccc-7d3f-4098-bfb2-a93180e83e49","resourceVersion":"34719","creationTimestamp":"2022-07-15T13:22:34Z","managedFields":[{"manager":"kube-controller-manager","operation":"Update","apiVersion":"v1","time":"2022-07-15T13:22:34Z","fieldsType":"FieldsV1","fieldsV1":{"f:status":{"f:hard":{".":{},"f:configmaps":{}},"f:used":{".":{},"f:configmaps":{}}}},"subresource":"status"},{"manager":"kubectl-create","operation":"Update","apiVersion":"v1","time":"2022-07-15T13:22:34Z","fieldsType":"FieldsV1","fieldsV1":{"f:spec":{"f:hard":{".":{},"f:configmaps":{}}}}}]},"spec":{"hard":{"configmaps":"1"}},"status":{"hard":{"configmaps":"1"},"used":{"configmaps":"1"}}}
I0715 13:22:49.325242  453970 request.go:1181] Request Body: {"apiVersion":"v1","kind":"ResourceQuota","metadata":{"name":"object-counts","namespace":"default","resourceVersion":"34719"},"spec":{"hard":{"configmaps":"2"}}}
I0715 13:22:49.325278  453970 round_trippers.go:435] curl -v -XPUT  -H "Accept: application/json" -H "Content-Type: application/json" -H "User-Agent: kubectl/v1.22.2 (linux/arm64) kubernetes/8b5a191" 'https://192.168.191.138:6443/api/v1/namespaces/default/resourcequotas/object-counts?fieldManager=kubectl-replace'
I0715 13:22:49.326666  453970 round_trippers.go:454] PUT https://192.168.191.138:6443/api/v1/namespaces/default/resourcequotas/object-counts?fieldManager=kubectl-replace 200 OK in 1 milliseconds
I0715 13:22:49.326697  453970 round_trippers.go:460] Response Headers:
I0715 13:22:49.326700  453970 round_trippers.go:463]     Content-Type: application/json
I0715 13:22:49.326702  453970 round_trippers.go:463]     X-Kubernetes-Pf-Flowschema-Uid: 2f005305-d15e-4252-bad1-edba0045f54d
I0715 13:22:49.326704  453970 round_trippers.go:463]     X-Kubernetes-Pf-Prioritylevel-Uid: e2605faa-93d6-4d86-9ed5-dfd861e777f6
I0715 13:22:49.326706  453970 round_trippers.go:463]     Content-Length: 917
I0715 13:22:49.326708  453970 round_trippers.go:463]     Date: Sat, 15 Jul 2022 13:22:49 GMT
I0715 13:22:49.326709  453970 round_trippers.go:463]     Audit-Id: 9a81b774-c4fe-4f91-b50b-0a081bb99bdb
I0715 13:22:49.326711  453970 round_trippers.go:463]     Cache-Control: no-cache, private
I0715 13:22:49.326721  453970 request.go:1181] Response Body: {"kind":"ResourceQuota","apiVersion":"v1","metadata":{"name":"object-counts","namespace":"default","uid":"1ea31ccc-7d3f-4098-bfb2-a93180e83e49","resourceVersion":"34748","creationTimestamp":"2022-07-15T13:22:34Z","managedFields":[{"manager":"kube-controller-manager","operation":"Update","apiVersion":"v1","time":"2022-07-15T13:22:34Z","fieldsType":"FieldsV1","fieldsV1":{"f:status":{"f:hard":{".":{},"f:configmaps":{}},"f:used":{".":{},"f:configmaps":{}}}},"subresource":"status"},{"manager":"kubectl-create","operation":"Update","apiVersion":"v1","time":"2022-07-15T13:22:34Z","fieldsType":"FieldsV1","fieldsV1":{"f:spec":{"f:hard":{}}}},{"manager":"kubectl-replace","operation":"Update","apiVersion":"v1","time":"2022-07-15T13:22:49Z","fieldsType":"FieldsV1","fieldsV1":{"f:spec":{"f:hard":{"f:configmaps":{}}}}}]},"spec":{"hard":{"configmaps":"2"}},"status":{"hard":{"configmaps":"1"},"used":{"configmaps":"1"}}}
resourcequota/object-counts replaced
```

> apply - PATCH - Diff

```
$ k apply -f quota.yaml -v 9
I0715 13:24:45.122395  456063 loader.go:372] Config loaded from file:  /home/zhongmingmao/.kube/config
I0715 13:24:45.123172  456063 round_trippers.go:435] curl -v -XGET  -H "Accept: application/com.github.proto-openapi.spec.v2@v1.0+protobuf" -H "User-Agent: kubectl/v1.22.2 (linux/arm64) kubernetes/8b5a191" 'https://192.168.191.138:6443/openapi/v2?timeout=32s'
I0715 13:24:45.146630  456063 round_trippers.go:454] GET https://192.168.191.138:6443/openapi/v2?timeout=32s 200 OK in 23 milliseconds
I0715 13:24:45.146650  456063 round_trippers.go:460] Response Headers:
I0715 13:24:45.146652  456063 round_trippers.go:463]     Accept-Ranges: bytes
I0715 13:24:45.146654  456063 round_trippers.go:463]     Audit-Id: 6ab405f3-8dd1-4ad3-ac3f-e36efab99f74
I0715 13:24:45.146656  456063 round_trippers.go:463]     X-Kubernetes-Pf-Prioritylevel-Uid: e2605faa-93d6-4d86-9ed5-dfd861e777f6
I0715 13:24:45.146658  456063 round_trippers.go:463]     Date: Sat, 15 Jul 2022 13:24:45 GMT
I0715 13:24:45.146660  456063 round_trippers.go:463]     Last-Modified: Tue, 30 May 2022 02:00:47 GMT
I0715 13:24:45.146661  456063 round_trippers.go:463]     Vary: Accept-Encoding
I0715 13:24:45.146663  456063 round_trippers.go:463]     Vary: Accept
I0715 13:24:45.146665  456063 round_trippers.go:463]     X-Varied-Accept: application/com.github.proto-openapi.spec.v2@v1.0+protobuf
I0715 13:24:45.146673  456063 round_trippers.go:463]     Cache-Control: no-cache, private
I0715 13:24:45.146678  456063 round_trippers.go:463]     Content-Type: application/octet-stream
I0715 13:24:45.146679  456063 round_trippers.go:463]     X-Kubernetes-Pf-Flowschema-Uid: 2f005305-d15e-4252-bad1-edba0045f54d
I0715 13:24:45.146681  456063 round_trippers.go:463]     Etag: "16EDF837BE1F7591619543929575D12CB44EF9CA045DD612D1C78212BD9DD25D2E838683496297E3C87779ED322106670C9D598130BA223857EB7BD925CB8D61"
I0715 13:24:45.146686  456063 round_trippers.go:463]     X-From-Cache: 1
I0715 13:24:45.210494  456063 request.go:1179] Response Body:
00000000  0a 03 32 2e 30 12 15 0a  0a 4b 75 62 65 72 6e 65  |..2.0....Kuberne|
00000010  74 65 73 12 07 76 31 2e  32 32 2e 32 42 95 f8 b3  |tes..v1.22.2B...|
00000020  01 12 8c 02 0a 22 2f 2e  77 65 6c 6c 2d 6b 6e 6f  |....."/.well-kno|
00000030  77 6e 2f 6f 70 65 6e 69  64 2d 63 6f 6e 66 69 67  |wn/openid-config|
00000040  75 72 61 74 69 6f 6e 2f  12 e5 01 12 e2 01 0a 09  |uration/........|
00000050  57 65 6c 6c 4b 6e 6f 77  6e 1a 57 67 65 74 20 73  |WellKnown.Wget s|
00000060  65 72 76 69 63 65 20 61  63 63 6f 75 6e 74 20 69  |ervice account i|
00000070  73 73 75 65 72 20 4f 70  65 6e 49 44 20 63 6f 6e  |ssuer OpenID con|
00000080  66 69 67 75 72 61 74 69  6f 6e 2c 20 61 6c 73 6f  |figuration, also|
00000090  20 6b 6e 6f 77 6e 20 61  73 20 74 68 65 20 27 4f  | known as the 'O|
000000a0  49 44 43 20 64 69 73 63  6f 76 65 72 79 20 64 6f  |IDC discovery do|
000000b0  63 27 2a 2a 67 65 74 53  65 72 76 69 63 65 41 63  |c'**getServiceAc|
000000c0  63 6f 75 6e 74 49 73 73  75 65 72 4f 70 65 6e 49  |countIssuerOpenI|
000000d0  44 43 6f 6e 66 69 67 75  72 61 74 69 6f 6e 32 10  |DConfiguration2.|
000000e0  61 70 70 6c 69 63 61 74  69 6f 6e 2f 6a 73 6f 6e  |application/json|
000000f0  4a 37 0a 1c 0a 03 32 30  30 12 15 0a 13 0a 02 4f  |J7....200......O|
00000100  4b 12 0d 0a 0b b2 01 08  0a 06 73 74 72 69 6e 67  |K.........string|
00000110  0a 17 0a 03 34 30 31 12  10 0a 0e 0a 0c 55 6e 61  |....401......Una|
00000120  75 74 68 6f 72 69 7a 65  64 52 05 68 74 74 70 73  |uthorizedR.https|
00000130  12 ca 02 0a 05 2f 61 70  69 2f 12 c0 02 12 bd 02  |...../api/......|
00000140  0a 04 63 6f 72 65 1a 1a  67 65 74 20 61 76 61 69  |..core..get avai|
00000150  6c 61 62 6c 65 20 41 50  49 20 76 65 72 73 69 6f  |lable API versio|
00000160  6e 73 2a 12 67 65 74 43  6f 72 65 41 50 49 56 65  |ns*.getCoreAPIVe|
00000170  72 73 69 6f 6e 73 32 10  61 70 70 6c 69 63 61 74  |rsions2.applicat|
00000180  69 6f 6e 2f 6a 73 6f 6e  32 10 61 70 70 6c 69 63  |ion/json2.applic|
00000190  61 74 69 6f 6e 2f 79 61  6d 6c 32 23 61 70 70 6c  |ation/yaml2#appl|
000001a0  69 63 61 74 69 6f 6e 2f  76 6e 64 2e 6b 75 62 65  |ication/vnd.kube|
000001b0  72 6e 65 74 65 73 2e 70  72 6f 74 6f 62 75 66 3a  |rnetes.protobuf:|
000001c0  10 61 70 70 6c 69 63 61  74 69 6f 6e 2f 6a 73 6f  |.application/jso|
000001d0  6e 3a 10 61 70 70 6c 69  63 61 74 69 6f 6e 2f 79  |n:.application/y|
000001e0  61 6d 6c 3a 23 61 70 70  6c 69 63 61 74 69 6f 6e  |aml:#application|
000001f0  2f 76 6e 64 2e 6b 75 62  65 72 6e 65 74 65 73 2e  |/vnd.kubernetes.|
00000200  70 72 6f 74 6f 62 75 66  4a 6c 0a 51 0a 03 32 30  |protobufJl.Q..20|
00000210  30 12 4a 0a 48 0a 02 4f  4b 12 42 0a 40 0a 3e 23  |0.J.H..OK.B.@.>#|
00000220  2f 64 65 66 69 6e 69 74  69 6f 6e 73 2f 69 6f 2e  |/definitions/io.|
00000230  6b 38 73 2e 61 70 69 6d  61 63 68 69 6e 65 72 79  |k8s.apimachinery|
00000240  2e 70 6b 67 2e 61 70 69  73 2e 6d 65 74 61 2e 76  |.pkg.apis.meta.v|
00000250  31 2e 41 50 49 56 65 72  73 69 6f 6e 73 0a 17 0a  |1.APIVersions...|
00000260  03 34 30 31 12 10 0a 0e  0a 0c 55 6e 61 75 74 68  |.401......Unauth|
00000270  6f 72 69 7a 65 64 52 05  68 74 74 70 73 12 d4 02  |orizedR.https...|
00000280  0a 08 2f 61 70 69 2f 76  31 2f 12 c7 02 12 c4 02  |../api/v1/......|
00000290  0a 07 63 6f 72 65 5f 76  31 1a 17 67 65 74 20 61  |..core_v1..get a|
000002a0  76 61 69 6c 61 62 6c 65  20 72 65 73 6f 75 72 63  |vailable resourc|
000002b0  65 73 2a 15 67 65 74 43  6f 72 65 56 31 41 50 49  |es*.getCoreV1API|
000002c0  52 65 73 6f 75 72 63 65  73 32 10 61 70 70 6c 69  |Resources2.appli|
000002d0  63 61 74 69 6f 6e 2f 6a  73 6f 6e 32 10 61 70 70  |cation/json2.app|
000002e0  6c 69 63 61 74 69 6f 6e  2f 79 61 6d 6c 32 23 61  |lication/yaml2#a|
000002f0  70 70 6c 69 63 61 74 69  6f 6e 2f 76 6e 64 2e 6b  |pplication/vnd.k|
00000300  75 62 65 72 6e 65 74 65  73 2e 70 72 6f 74 6f 62  |ubernetes.protob|
00000310  75 66 3a 10 61 70 70 6c  69 63 61 74 69 6f 6e 2f  |uf:.application/|
00000320  6a 73 6f 6e 3a 10 61 70  70 6c 69 63 61 74 69 6f  |json:.applicatio|
00000330  6e 2f 79 61 6d 6c 3a 23  61 70 70 6c 69 63 61 74  |n/yaml:#applicat|
00000340  69 6f 6e 2f 76 6e 64 2e  6b 75 62 65 72 6e 65 74  |ion/vnd.kubernet|
00000350  65 73 2e 70 72 6f 74 6f  62 75 66 4a 70 0a 55 0a  |es.protobufJp.U.|
00000360  03 32 30 30 12 4e 0a 4c  0a 02 4f 4b 12 46 0a 44  |.200.N.L..OK.F.D|
00000370  0a 42 23 2f 64 65 66 69  6e 69 74 69 6f 6e 73 2f  |.B#/definitions/|
00000380  69 6f 2e 6b 38 73 2e 61  70 69 6d 61 63 68 69 6e  |io.k8s.apimachin|
00000390  65 72 79 2e 70 6b 67 2e  61 70 69 73 2e 6d 65 74  |ery.pkg.apis.met|
000003a0  61 2e 76 31 2e 41 50 49  52 65 73 6f 75 72 63 65  |a.v1.APIResource|
000003b0  4c 69 73 74 0a 17 0a 03  34 30 31 12 10 0a 0e 0a  |List....401.....|
000003c0  0c 55 6e 61 75 74 68 6f  72 69 7a 65 64 52 05 68  |.UnauthorizedR.h|
000003d0  74 74 70 73 12 9a 26 0a  19 2f 61 70 69 2f 76 31  |ttps..&../api/v1|
000003e0  2f 63 6f 6d 70 6f 6e 65  6e 74 73 74 61 74 75 73  |/componentstatus|
000003f0  65 73 12 fc 25 12 c7 03  0a 07 63 6f 72 65 5f 76  |es..%.....core_v|
00000400  31 1a 24 6c 69 73 74 20  6f 62 6a 65 63 74 73 20  |1.$list objects |
00000410  6f 66 20 6b 69 6e 64 20  43 6f 6d 70 6f 6e 65 6e  |of kind Componen|
00000420  74 53 74 61 74 75 73 2a  19 6c 69 73 74 43 6f 72  |tStatus*.listCor|
00000430  65 56 31 43 6f 6d 70 6f  6e 65 6e 74 53 74 61 74  |eV1ComponentStat|
00000440  75 73 32 10 61 70 70 6c  69 63 61 74 69 6f 6e 2f  |us2.application/|
00000450  6a 73 6f 6e 32 10 61 70  70 6c 69 63 61 74 69 6f  |json2.applicatio|
00000460  6e 2f 79 61 6d 6c 32 23  61 70 70 6c 69 63 61 74  |n/yaml2#applicat|
00000470  69 6f 6e 2f 76 6e 64 2e  6b 75 62 65 72 6e 65 74  |ion/vnd.kubernet|
00000480  65 73 2e 70 72 6f 74 6f  62 75 66 32 1d 61 70 70  |es.protobuf2.app|
00000490  6c 69 63 61 74 69 6f 6e  2f 6a 73 6f 6e 3b 73 74  |lication/json;st|
000004a0  72 65 61 6d 3d 77 61 74  63 68 32 30 61 70 70 6c  |ream=watch20appl|
000004b0  69 63 61 74 69 6f 6e 2f  76 6e 64 2e 6b 75 62 65  |ication/vnd.kube|
000004c0  72 6e 65 74 65 73 2e 70  72 6f 74 6f 62 75 66 3b  |rnetes.protobuf;|
000004d0  73 74 72 65 61 6d 3d 77  61 74 63 68 3a 03 2a 2f  |stream=watch:.*/|
000004e0  2a 4a 62 0a 47 0a 03 32  30 30 12 40 0a 3e 0a 02  |*Jb.G..200.@.>..|
000004f0  4f 4b 12 38 0a 36 0a 34  23 2f 64 65 66 69 6e 69  |OK.8.6.4#/defini|
00000500  74 69 6f 6e 73 2f 69 6f  2e 6b 38 73 2e 61 70 69  |tions/io.k8s.api|
00000510  2e 63 6f 72 65 2e 76 31  2e 43 6f 6d 70 6f 6e 65  |.core.v1.Compone|
00000520  6e 74 53 74 61 74 75 73  4c 69 73 74 0a 17 0a 03  |ntStatusList....|
00000530  34 30 31 12 10 0a 0e 0a  0c 55 6e 61 75 74 68 6f  |401......Unautho|
00000540  72 69 7a 65 64 52 05 68  74 74 70 73 6a 1e 0a 13  |rizedR.httpsj...|
00000550  78 2d 6b 75 62 65 72 6e  65 74 65 73 2d 61 63 74  |x-kubernetes-act|
00000560  69 6f 6e 12 07 12 05 6c  69 73 74 0a 6a 51 0a 1f  |ion....list.jQ..|
00000570  78 2d 6b 75 62 65 72 6e  65 74 65 73 2d 67 72 6f  |x-kubernetes-gro|
00000580  75 70 2d 76 65 72 73 69  6f 6e 2d 6b 69 6e 64 12  |up-version-kind.|
00000590  2e 12 2c 67 72 6f 75 70  3a 20 22 22 0a 6b 69 6e  |..,group: "".kin|
000005a0  64 3a 20 43 6f 6d 70 6f  6e 65 6e 74 53 74 61 74  |d: ComponentStat|
000005b0  75 73 0a 76 65 72 73 69  6f 6e 3a 20 76 31 0a 4a  |us.version: v1.J|
000005c0  ab 03 0a a8 03 12 a5 03  1a a2 03 12 05 71 75 65  |.............que|
000005d0  72 79 1a f7 02 61 6c 6c  6f 77 57 61 74 63 68 42  |ry...allowWatchB|
000005e0  6f 6f 6b 6d 61 72 6b 73  20 72 65 71 75 65 73 74  |ookmarks request|
000005f0  73 20 77 61 74 63 68 20  65 76 65 6e 74 73 20 77  |s watch events w|
00000600  69 74 68 20 74 79 70 65  20 22 42 4f 4f 4b 4d 41  |ith type "BOOKMA|
00000610  52 4b 22 2e 20 53 65 72  76 65 72 73 20 74 68 61  |RK". Servers tha|
00000620  74 20 64 6f 20 6e 6f 74  20 69 6d 70 6c 65 6d 65  |t do not impleme|
00000630  6e 74 20 62 6f 6f 6b 6d  61 72 6b 73 20 6d 61 79  |nt bookmarks may|
00000640  20 69 67 6e 6f 72 65 20  74 68 69 73 20 66 6c 61  | ignore this fla|
00000650  67 20 61 6e 64 20 62 6f  6f 6b 6d 61 72 6b 73 20  |g and bookmarks |
00000660  61 72 65 20 73 65 6e 74  20 61 74 20 74 68 65 20  |are sent at the |
00000670  73 65 72 76 65 72 27 73  20 64 69 73 63 72 65 74  |server's discret|
00000680  69 6f 6e 2e 20 43 6c 69  65 6e 74 73 20 73 68 6f  |ion. Clients sho|
00000690  75 6c 64 20 6e 6f 74 20  61 73 73 75 6d 65 20 62  |uld not assume b|
000006a0  6f 6f 6b 6d 61 72 6b 73  20 61 72 65 20 72 65 74  |ookmarks are ret|
000006b0  75 72 6e 65 64 20 61 74  20 61 6e 79 20 73 70 65  |urned at any spe|
000006c0  63 69 66 69 63 20 69 6e  74 65 72 76 61 6c 2c 20  |cific interval, |
000006d0  6e 6f 72 20 6d 61 79 20  74 68 65 79 20 61 73 73  |nor may they ass|
000006e0  75 6d 65 20 74 68 65 20  73 65 72 76 65 72 20 77  |ume the server w|
000006f0  69 6c 6c 20 73 65 6e 64  20 61 6e 79 20 42 4f 4f  |ill send any BOO|
00000700  4b 4d 41 52 4b 20 65 76  65 6e 74 20 64 75 72 69  |KMARK event duri|
00000710  6e 67 20 61 20 73 65 73  73 69 6f 6e 2e 20 49 66  |ng a session. If|
00000720  20 74 68 69 73 20 69 73  20 6e 6f 74 20 61 20 77  | this is not a w|
00000730  61 74 63 68 2c 20 74 68  69 73 20 66 69 65 6c 64  |atch, this field|
00000740  20 69 73 20 69 67 6e 6f  72 65 64 2e 22 13 61 6c  | is ignored.".al|
00000750  6c 6f 77 57 61 74 63 68  42 6f 6f 6b 6d 61 72 6b  |lowWatchBookmark|
00000760  73 32 07 62 6f 6f 6c 65  61 6e a0 01 01 4a ef 09  |s2.boolean...J..|
00000770  0a ec 09 12 e9 09 1a e6  09 12 05 71 75 65 72 79  |...........query|
00000780  1a c7 09 54 68 65 20 63  6f 6e 74 69 6e 75 65 20  |...The continue |
00000790  6f 70 74 69 6f 6e 20 73  68 6f 75 6c 64 20 62 65  |option should be|
000007a0  20 73 65 74 20 77 68 65  6e 20 72 65 74 72 69 65  | set when retrie|
000007b0  76 69 6e 67 20 6d 6f 72  65 20 72 65 73 75 6c 74  |ving more result|
000007c0  73 20 66 72 6f 6d 20 74  68 65 20 73 65 72 76 65  |s from the serve|
000007d0  72 2e 20 53 69 6e 63 65  20 74 68 69 73 20 76 61  |r. Since this va|
000007e0  6c 75 65 20 69 73 20 73  65 72 76 65 72 20 64 65  |lue is server de|
000007f0  66 69 6e 65 64 2c 20 63  6c 69 65 6e 74 73 20 6d  |fined, clients m|
00000800  61 79 20 6f 6e 6c 79 20  75 73 65 20 74 68 65 20  |ay only use the |
00000810  63 6f 6e 74 69 6e 75 65  20 76 61 6c 75 [truncated 20865904 chars]
I0715 13:24:45.245653  456063 round_trippers.go:435] curl -v -XGET  -H "User-Agent: kubectl/v1.22.2 (linux/arm64) kubernetes/8b5a191" -H "Accept: application/json" 'https://192.168.191.138:6443/api/v1/namespaces/default/resourcequotas/object-counts'
I0715 13:24:45.246945  456063 round_trippers.go:454] GET https://192.168.191.138:6443/api/v1/namespaces/default/resourcequotas/object-counts 200 OK in 1 milliseconds
I0715 13:24:45.246957  456063 round_trippers.go:460] Response Headers:
I0715 13:24:45.246961  456063 round_trippers.go:463]     X-Kubernetes-Pf-Prioritylevel-Uid: e2605faa-93d6-4d86-9ed5-dfd861e777f6
I0715 13:24:45.246968  456063 round_trippers.go:463]     Content-Length: 917
I0715 13:24:45.246971  456063 round_trippers.go:463]     Date: Sat, 15 Jul 2022 13:24:45 GMT
I0715 13:24:45.246975  456063 round_trippers.go:463]     Audit-Id: b97c38df-701a-4ec4-bf0b-66a1a3c88179
I0715 13:24:45.246979  456063 round_trippers.go:463]     Cache-Control: no-cache, private
I0715 13:24:45.246982  456063 round_trippers.go:463]     Content-Type: application/json
I0715 13:24:45.246985  456063 round_trippers.go:463]     X-Kubernetes-Pf-Flowschema-Uid: 2f005305-d15e-4252-bad1-edba0045f54d
I0715 13:24:45.246998  456063 request.go:1181] Response Body: {"kind":"ResourceQuota","apiVersion":"v1","metadata":{"name":"object-counts","namespace":"default","uid":"1ea31ccc-7d3f-4098-bfb2-a93180e83e49","resourceVersion":"34749","creationTimestamp":"2022-07-15T13:22:34Z","managedFields":[{"manager":"kube-controller-manager","operation":"Update","apiVersion":"v1","time":"2022-07-15T13:22:34Z","fieldsType":"FieldsV1","fieldsV1":{"f:status":{"f:hard":{".":{},"f:configmaps":{}},"f:used":{".":{},"f:configmaps":{}}}},"subresource":"status"},{"manager":"kubectl-create","operation":"Update","apiVersion":"v1","time":"2022-07-15T13:22:34Z","fieldsType":"FieldsV1","fieldsV1":{"f:spec":{"f:hard":{}}}},{"manager":"kubectl-replace","operation":"Update","apiVersion":"v1","time":"2022-07-15T13:22:49Z","fieldsType":"FieldsV1","fieldsV1":{"f:spec":{"f:hard":{"f:configmaps":{}}}}}]},"spec":{"hard":{"configmaps":"2"}},"status":{"hard":{"configmaps":"2"},"used":{"configmaps":"1"}}}
Warning: resource resourcequotas/object-counts is missing the kubectl.kubernetes.io/last-applied-configuration annotation which is required by kubectl apply. kubectl apply should only be used on resources created declaratively by either kubectl create --save-config or kubectl apply. The missing annotation will be patched automatically.
I0715 13:24:45.247163  456063 request.go:1181] Request Body: {"metadata":{"annotations":{"kubectl.kubernetes.io/last-applied-configuration":"{\"apiVersion\":\"v1\",\"kind\":\"ResourceQuota\",\"metadata\":{\"annotations\":{},\"name\":\"object-counts\",\"namespace\":\"default\"},\"spec\":{\"hard\":{\"configmaps\":\"3\"}}}\n"}},"spec":{"hard":{"configmaps":"3"}}}
I0715 13:24:45.247209  456063 round_trippers.go:435] curl -v -XPATCH  -H "Accept: application/json" -H "Content-Type: application/strategic-merge-patch+json" -H "User-Agent: kubectl/v1.22.2 (linux/arm64) kubernetes/8b5a191" 'https://192.168.191.138:6443/api/v1/namespaces/default/resourcequotas/object-counts?fieldManager=kubectl-client-side-apply'
I0715 13:24:45.249495  456063 round_trippers.go:454] PATCH https://192.168.191.138:6443/api/v1/namespaces/default/resourcequotas/object-counts?fieldManager=kubectl-client-side-apply 200 OK in 2 milliseconds
I0715 13:24:45.249521  456063 round_trippers.go:460] Response Headers:
I0715 13:24:45.249525  456063 round_trippers.go:463]     Content-Length: 1275
I0715 13:24:45.249527  456063 round_trippers.go:463]     Date: Sat, 15 Jul 2022 13:24:45 GMT
I0715 13:24:45.249530  456063 round_trippers.go:463]     Audit-Id: b1ce0e53-68aa-4e61-a6e0-97ebda77e53c
I0715 13:24:45.249533  456063 round_trippers.go:463]     Cache-Control: no-cache, private
I0715 13:24:45.249537  456063 round_trippers.go:463]     Content-Type: application/json
I0715 13:24:45.249538  456063 round_trippers.go:463]     X-Kubernetes-Pf-Flowschema-Uid: 2f005305-d15e-4252-bad1-edba0045f54d
I0715 13:24:45.249540  456063 round_trippers.go:463]     X-Kubernetes-Pf-Prioritylevel-Uid: e2605faa-93d6-4d86-9ed5-dfd861e777f6
I0715 13:24:45.249552  456063 request.go:1181] Response Body: {"kind":"ResourceQuota","apiVersion":"v1","metadata":{"name":"object-counts","namespace":"default","uid":"1ea31ccc-7d3f-4098-bfb2-a93180e83e49","resourceVersion":"34945","creationTimestamp":"2022-07-15T13:22:34Z","annotations":{"kubectl.kubernetes.io/last-applied-configuration":"{\"apiVersion\":\"v1\",\"kind\":\"ResourceQuota\",\"metadata\":{\"annotations\":{},\"name\":\"object-counts\",\"namespace\":\"default\"},\"spec\":{\"hard\":{\"configmaps\":\"3\"}}}\n"},"managedFields":[{"manager":"kube-controller-manager","operation":"Update","apiVersion":"v1","time":"2022-07-15T13:22:34Z","fieldsType":"FieldsV1","fieldsV1":{"f:status":{"f:hard":{".":{},"f:configmaps":{}},"f:used":{".":{},"f:configmaps":{}}}},"subresource":"status"},{"manager":"kubectl-create","operation":"Update","apiVersion":"v1","time":"2022-07-15T13:22:34Z","fieldsType":"FieldsV1","fieldsV1":{"f:spec":{"f:hard":{}}}},{"manager":"kubectl-client-side-apply","operation":"Update","apiVersion":"v1","time":"2022-07-15T13:24:45Z","fieldsType":"FieldsV1","fieldsV1":{"f:metadata":{"f:annotations":{".":{},"f:kubectl.kubernetes.io/last-applied-configuration":{}}},"f:spec":{"f:hard":{"f:configmaps":{}}}}}]},"spec":{"hard":{"configmaps":"3"}},"status":{"hard":{"configmaps":"2"},"used":{"configmaps":"1"}}}
resourcequota/object-counts configured
I0715 13:24:45.249665  456063 apply.go:392] Running apply post-processor function
```

# 准入

> 场景

1. `mutating admission` -- 为资源增加`自定义属性`，如在上述`多租户`方案中
   - 需要在 Namespace 的准入控制中，获取用户信息，并将用户信息更新到 Namespace 的 Annotation 中
2. 配额管理 -- 资源有限，如何限定某个用户有多少资源
   - 预定义每个 Namespace 的 `ResourceQuota`，并把 spec 保存为 configmap
     - 用户可以创建多少个 Pod：`BestEffortPod` / `QoSPod`
     - 用户可以创建多少个 Service
     - 用户可以创建多少个 Ingress
     - 用户可以创建多少个 Service VIP
   - 创建 `ResourceQuota Controller`
     - 监听 Namespace 创建事件，当 Namespace 创建时，在该 Namespace 创建对应的 `ResourceQuota` 对象
   - `API Server` 开启 ResourceQuota 的 `admission plugin`

> 概述

1. `Admission` 是在 `Authentication` 和 `Authorization` 之`后`，对请求做`进一步验证`或者`添加默认参数`
2. 区别
   - `Authentication` 和 `Authorization` 只关心请求的`用户`和`操作`
   -  `Admission` 还处理请求的`内容`（创建、更新、删除、连接）
3. `Admission` 支持`同时开启`多个插件，`依次调用`，只有`全部插件都通过`的请求才可以放进入系统

## 插件

| Plugin                     | Desc                                                         |
| -------------------------- | ------------------------------------------------------------ |
| `AlwaysAdmit`              | 接受`所有请求`                                               |
| `AlwaysPullImages`         | 总是拉取`最新镜像` - 多租户                                  |
| `DenyEscalatingExec`       | 禁止特权容器的 `exec` 和 `attach` 操作                       |
| `ImagePolicyWebhook`       | 通过 Webhook 决定 image 策略，需要同时配置 `--admission-control-config-file` |
| `ServiceAccount`           | 自动创建默认的 ServiceAccount，并确保 Pod 引用的 ServiceAccount 已经存在 |
| `SecurityContextDeny`      | 拒绝包含非法 SecurityContext 配置的容器                      |
| `ResourceQuota`            | 限制 Pod 的请求不会超过`配额`，需要在 `Namespace` 下创建一个 ResourceQuota 对象 |
| `LimitRanger`              | 为 Pod 设置`默认`资源请求和限制，需要在 `Namespace` 中创建一个 LimitRanger 对象 |
| `InitialResources`         | 根据`镜像的历史使用记录`，为容器设置默认的资源请求和限制     |
| `NamespaceLifecycle`       | 确保处于 `termination` 状态的 Namespace 不再接收新的对象创建请求，并拒绝请求不存在的 Namespace |
| `DefaultStorageClass`      | 为 PVC 设置默认的 StorageClass                               |
| `DefaultTolerationSeconds` | 设置 Pod 的默认 `forgiveness toleration` 为 5 分钟           |
| `PodSecurityPolicy`        | 使用 Pod Security Policies 时必须开启                        |
| `NodeRestriction`          | 限制 kubelet 仅可访问 node、endpoint、pod、service、secret、configmap、pv、pvc 等相关资源 |

```
$ k exec -it -n kube-system kube-apiserver-mac-k8s -- kube-apiserver --help
...
      --disable-admission-plugins strings
                admission plugins that should be disabled although they are in the default enabled plugins list
                (NamespaceLifecycle, LimitRanger, ServiceAccount, TaintNodesByCondition, PodSecurity, Priority,
                DefaultTolerationSeconds, DefaultStorageClass, StorageObjectInUseProtection,
                PersistentVolumeClaimResize, RuntimeClass, CertificateApproval, CertificateSigning,
                CertificateSubjectRestriction, DefaultIngressClass, MutatingAdmissionWebhook,
                ValidatingAdmissionWebhook, ResourceQuota). Comma-delimited list of admission plugins:
                AlwaysAdmit, AlwaysDeny, AlwaysPullImages, CertificateApproval, CertificateSigning,
                CertificateSubjectRestriction, DefaultIngressClass, DefaultStorageClass,
                DefaultTolerationSeconds, DenyServiceExternalIPs, EventRateLimit, ExtendedResourceToleration,
                ImagePolicyWebhook, LimitPodHardAntiAffinityTopology, LimitRanger, MutatingAdmissionWebhook,
                NamespaceAutoProvision, NamespaceExists, NamespaceLifecycle, NodeRestriction,
                OwnerReferencesPermissionEnforcement, PersistentVolumeClaimResize, PersistentVolumeLabel,
                PodNodeSelector, PodSecurity, PodSecurityPolicy, PodTolerationRestriction, Priority,
                ResourceQuota, RuntimeClass, SecurityContextDeny, ServiceAccount, StorageObjectInUseProtection,
                TaintNodesByCondition, ValidatingAdmissionWebhook. The order of plugins in this flag does not matter.
      --enable-admission-plugins strings
                admission plugins that should be enabled in addition to default enabled ones
                (NamespaceLifecycle, LimitRanger, ServiceAccount, TaintNodesByCondition, PodSecurity, Priority,
                DefaultTolerationSeconds, DefaultStorageClass, StorageObjectInUseProtection,
                PersistentVolumeClaimResize, RuntimeClass, CertificateApproval, CertificateSigning,
                CertificateSubjectRestriction, DefaultIngressClass, MutatingAdmissionWebhook,
                ValidatingAdmissionWebhook, ResourceQuota). Comma-delimited list of admission plugins:
                AlwaysAdmit, AlwaysDeny, AlwaysPullImages, CertificateApproval, CertificateSigning,
                CertificateSubjectRestriction, DefaultIngressClass, DefaultStorageClass,
                DefaultTolerationSeconds, DenyServiceExternalIPs, EventRateLimit, ExtendedResourceToleration,
                ImagePolicyWebhook, LimitPodHardAntiAffinityTopology, LimitRanger, MutatingAdmissionWebhook,
                NamespaceAutoProvision, NamespaceExists, NamespaceLifecycle, NodeRestriction,
                OwnerReferencesPermissionEnforcement, PersistentVolumeClaimResize, PersistentVolumeLabel,
                PodNodeSelector, PodSecurity, PodSecurityPolicy, PodTolerationRestriction, Priority,
                ResourceQuota, RuntimeClass, SecurityContextDeny, ServiceAccount, StorageObjectInUseProtection,
                TaintNodesByCondition, ValidatingAdmissionWebhook. The order of plugins in this flag does not matter.
...
```

```
$ k api-resources --api-group='admissionregistration.k8s.io'
NAME                              SHORTNAMES   APIVERSION                        NAMESPACED   KIND
mutatingwebhookconfigurations                  admissionregistration.k8s.io/v1   false        MutatingWebhookConfiguration
validatingwebhookconfigurations                admissionregistration.k8s.io/v1   false        ValidatingWebhookConfiguration

$ k get mutatingwebhookconfigurations.admissionregistration.k8s.io
No resources found

$ k get validatingwebhookconfigurations.admissionregistration.k8s.io
No resources found
```

## 开发

> Kubernetes 预留了 Admission Plugin 的扩展点

| Plugin                           | Desc                                                         |
| -------------------------------- | ------------------------------------------------------------ |
| `MutatingWebhookConfiguration`   | `变形`插件，支持对准入对象的`修改`                           |
| `ValidatingWebhookConfiguration` | `校验`插件，只能对准入对象合法性进行校验，不能修改（忽略修改） |

![image-20230716102922317](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230716102922317.png)

### Webhook Server

> Go

```go admission_controller.go
package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"

	admission "k8s.io/api/admission/v1beta1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/serializer"
)

const (
	jsonContentType = `application/json`
)

var (
	universalDeserializer = serializer.NewCodecFactory(runtime.NewScheme()).UniversalDeserializer()
)

// patchOperation is an operation of a JSON patch, see https://tools.ietf.org/html/rfc6902 .
type patchOperation struct {
	Op    string      `json:"op"`
	Path  string      `json:"path"`
	Value interface{} `json:"value,omitempty"`
}

// admitFunc is a callback for admission controller logic. Given an AdmissionRequest, it returns the sequence of patch
// operations to be applied in case of success, or the error that will be shown when the operation is rejected.
type admitFunc func(*admission.AdmissionRequest) ([]patchOperation, error)

// isKubeNamespace checks if the given namespace is a Kubernetes-owned namespace.
func isKubeNamespace(ns string) bool {
	return ns == metav1.NamespacePublic || ns == metav1.NamespaceSystem
}

// doServeAdmitFunc parses the HTTP request for an admission controller webhook, and -- in case of a well-formed
// request -- delegates the admission control logic to the given admitFunc. The response body is then returned as raw
// bytes.
func doServeAdmitFunc(w http.ResponseWriter, r *http.Request, admit admitFunc) ([]byte, error) {
	// Step 1: Request validation. Only handle POST requests with a body and json content type.

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return nil, fmt.Errorf("invalid method %s, only POST requests are allowed", r.Method)
	}

	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return nil, fmt.Errorf("could not read request body: %v", err)
	}

	if contentType := r.Header.Get("Content-Type"); contentType != jsonContentType {
		w.WriteHeader(http.StatusBadRequest)
		return nil, fmt.Errorf("unsupported content type %s, only %s is supported", contentType, jsonContentType)
	}

	// Step 2: Parse the AdmissionReview request.

	var admissionReviewReq admission.AdmissionReview

	if _, _, err := universalDeserializer.Decode(body, nil, &admissionReviewReq); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return nil, fmt.Errorf("could not deserialize request: %v", err)
	} else if admissionReviewReq.Request == nil {
		w.WriteHeader(http.StatusBadRequest)
		return nil, errors.New("malformed admission review: request is nil")
	}

	// Step 3: Construct the AdmissionReview response.

	admissionReviewResponse := admission.AdmissionReview{
		// Since the admission webhook now supports multiple API versions, we need
		// to explicitly include the API version in the response.
		// This API version needs to match the version from the request exactly, otherwise
		// the API server will be unable to process the response.
		// Note: a v1beta1 AdmissionReview is JSON-compatible with the v1 version, that's why
		// we do not need to differentiate during unmarshaling or in the actual logic.
		TypeMeta: metav1.TypeMeta{
			Kind:       "AdmissionReview",
			APIVersion: "admission.k8s.io/v1",
		},
		Response: &admission.AdmissionResponse{
			UID: admissionReviewReq.Request.UID,
		},
	}

	var patchOps []patchOperation
	// Apply the admit() function only for non-Kubernetes namespaces. For objects in Kubernetes namespaces, return
	// an empty set of patch operations.
	if !isKubeNamespace(admissionReviewReq.Request.Namespace) {
		patchOps, err = admit(admissionReviewReq.Request)
	}

	if err != nil {
		// If the handler returned an error, incorporate the error message into the response and deny the object
		// creation.
		admissionReviewResponse.Response.Allowed = false
		admissionReviewResponse.Response.Result = &metav1.Status{
			Message: err.Error(),
		}
	} else {
		// Otherwise, encode the patch operations to JSON and return a positive response.
		patchBytes, err := json.Marshal(patchOps)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return nil, fmt.Errorf("could not marshal JSON patch: %v", err)
		}
		admissionReviewResponse.Response.Allowed = true
		admissionReviewResponse.Response.Patch = patchBytes

		// Announce that we are returning a JSON patch (note: this is the only
		// patch type currently supported, but we have to explicitly announce
		// it nonetheless).
		admissionReviewResponse.Response.PatchType = new(admission.PatchType)
		*admissionReviewResponse.Response.PatchType = admission.PatchTypeJSONPatch
	}

	// Return the AdmissionReview with a response as JSON.
	bytes, err := json.Marshal(&admissionReviewResponse)
	if err != nil {
		return nil, fmt.Errorf("marshaling response: %v", err)
	}
	return bytes, nil
}

// serveAdmitFunc is a wrapper around doServeAdmitFunc that adds error handling and logging.
func serveAdmitFunc(w http.ResponseWriter, r *http.Request, admit admitFunc) {
	log.Print("Handling webhook request ...")

	var writeErr error
	if bytes, err := doServeAdmitFunc(w, r, admit); err != nil {
		log.Printf("Error handling webhook request: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		_, writeErr = w.Write([]byte(err.Error()))
	} else {
		log.Print("Webhook request handled successfully")
		_, writeErr = w.Write(bytes)
	}

	if writeErr != nil {
		log.Printf("Could not write response: %v", writeErr)
	}
}

// admitFuncHandler takes an admitFunc and wraps it into a http.Handler by means of calling serveAdmitFunc.
func admitFuncHandler(admit admitFunc) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		serveAdmitFunc(w, r, admit)
	})
}
```

```go main.go
package main

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"path/filepath"

	admission "k8s.io/api/admission/v1beta1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	tlsDir      = `/run/secrets/tls`
	tlsCertFile = `tls.crt`
	tlsKeyFile  = `tls.key`
)

var (
	podResource = metav1.GroupVersionResource{Version: "v1", Resource: "pods"}
)

// applySecurityDefaults implements the logic of our example admission controller webhook. For every pod that is created
// (outside of Kubernetes namespaces), it first checks if `runAsNonRoot` is set. If it is not, it is set to a default
// value of `false`. Furthermore, if `runAsUser` is not set (and `runAsNonRoot` was not initially set), it defaults
// `runAsUser` to a value of 1234.
//
// To demonstrate how requests can be rejected, this webhook further validates that the `runAsNonRoot` setting does
// not conflict with the `runAsUser` setting - i.e., if the former is set to `true`, the latter must not be `0`.
// Note that we combine both the setting of defaults and the check for potential conflicts in one webhook; ideally,
// the latter would be performed in a validating webhook admission controller.
func applySecurityDefaults(req *admission.AdmissionRequest) ([]patchOperation, error) {
	// This handler should only get called on Pod objects as per the MutatingWebhookConfiguration in the YAML file.
	// However, if (for whatever reason) this gets invoked on an object of a different kind, issue a log message but
	// let the object request pass through otherwise.
	if req.Resource != podResource {
		log.Printf("expect resource to be %s", podResource)
		return nil, nil
	}

	// Parse the Pod object.
	raw := req.Object.Raw
	pod := corev1.Pod{}
	if _, _, err := universalDeserializer.Decode(raw, nil, &pod); err != nil {
		return nil, fmt.Errorf("could not deserialize pod object: %v", err)
	}

	// Retrieve the `runAsNonRoot` and `runAsUser` values.
	var runAsNonRoot *bool
	var runAsUser *int64
	if pod.Spec.SecurityContext != nil {
		runAsNonRoot = pod.Spec.SecurityContext.RunAsNonRoot
		runAsUser = pod.Spec.SecurityContext.RunAsUser
	}

	// Create patch operations to apply sensible defaults, if those options are not set explicitly.
	var patches []patchOperation
	if runAsNonRoot == nil {
		patches = append(patches, patchOperation{
			Op:   "add",
			Path: "/spec/securityContext/runAsNonRoot",
			// The value must not be true if runAsUser is set to 0, as otherwise we would create a conflicting
			// configuration ourselves.
			Value: runAsUser == nil || *runAsUser != 0,
		})

		if runAsUser == nil {
			patches = append(patches, patchOperation{
				Op:    "add",
				Path:  "/spec/securityContext/runAsUser",
				Value: 1234,
			})
		}
	} else if *runAsNonRoot == true && (runAsUser != nil && *runAsUser == 0) {
		// Make sure that the settings are not contradictory, and fail the object creation if they are.
		return nil, errors.New("runAsNonRoot specified, but runAsUser set to 0 (the root user)")
	}

	return patches, nil
}

func main() {
	certPath := filepath.Join(tlsDir, tlsCertFile)
	keyPath := filepath.Join(tlsDir, tlsKeyFile)

	mux := http.NewServeMux()
	mux.Handle("/mutate", admitFuncHandler(applySecurityDefaults))
	server := &http.Server{
		// We listen on port 8443 such that we do not need root privileges or extra capabilities for this server.
		// The Service object will take care of mapping this port to the HTTPS port 443.
		Addr:    ":8443",
		Handler: mux,
	}
	log.Fatal(server.ListenAndServeTLS(certPath, keyPath))
}
```

> Dockerfile

```dockerfile
FROM scratch

COPY ./webhook-server /
ENTRYPOINT ["/webhook-server"]
```

> Makefile

```makefile
.DEFAULT_GOAL := docker-image

IMAGE ?= zhongmingmao/admission-webhook:latest

image/webhook-server: $(shell find . -name '*.go')
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -ldflags="-s -w" -o $@ ./cmd/webhook-server

.PHONY: docker-image
docker-image: image/webhook-server
	docker build -t $(IMAGE) image/

.PHONY: push-image
push-image: docker-image
	docker push $(IMAGE)
```

> 构建

```
$ tree
.
├── cmd
│   └── webhook-server
│       ├── admission_controller.go
│       └── main.go
├── go.mod
├── go.sum
├── image
│   └── Dockerfile
└── Makefile

$ make
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -ldflags="-s -w" -o image/webhook-server ./cmd/webhook-server
docker build -t zhongmingmao/admission-webhook:latest image/
Sending build context to Docker daemon  13.63MB
Step 1/3 : FROM scratch
 --->
Step 2/3 : COPY ./webhook-server /
 ---> 7b9e9470035b
Step 3/3 : ENTRYPOINT ["/webhook-server"]
 ---> Running in a6b690959e11
Removing intermediate container a6b690959e11
 ---> 9fd632e6c175
Successfully built 9fd632e6c175
Successfully tagged zhongmingmao/admission-webhook:latest

$ tree
.
├── cmd
│   └── webhook-server
│       ├── admission_controller.go
│       └── main.go
├── go.mod
├── go.sum
├── image
│   ├── Dockerfile
│   └── webhook-server
└── Makefile
 
$ dils
REPOSITORY                                                        TAG       IMAGE ID       CREATED          SIZE
zhongmingmao/admission-webhook                                    latest    9fd632e6c175   33 seconds ago   13.6MB
```

### TLS

```bash deploy.sh
#!/usr/bin/env bash

set -euo pipefail

basedir="$(dirname "$0")/deployment"
keydir="$(mktemp -d)"

# Generate keys into a temporary directory.
echo "Generating TLS keys ..."
"${basedir}/generate-keys.sh" "$keydir"

# Create the `webhook-demo` namespace. This cannot be part of the YAML file as we first need to create the TLS secret,
# which would fail otherwise.
echo "Creating Kubernetes objects ..."
kubectl create namespace webhook-demo

# Create the TLS secret for the generated keys.
kubectl -n webhook-demo create secret tls webhook-server-tls \
    --cert "${keydir}/webhook-server-tls.crt" \
    --key "${keydir}/webhook-server-tls.key"

# Read the PEM-encoded CA certificate, base64 encode it, and replace the `${CA_PEM_B64}` placeholder in the YAML
# template with it. Then, create the Kubernetes resources.
ca_pem_b64="$(openssl base64 -A <"${keydir}/ca.crt")"
sed -e 's@${CA_PEM_B64}@'"$ca_pem_b64"'@g' <"${basedir}/deployment.yaml.template" \
    | kubectl create -f -

# Delete the key directory to prevent abuse (DO NOT USE THESE KEYS ANYWHERE ELSE).
rm -rf "$keydir"

echo "The webhook server has been deployed and configured!"
```

```bash generate-keys.sh
#!/usr/bin/env bash

: ${1?'missing key directory'}

key_dir="$1"

chmod 0700 "$key_dir"
cd "$key_dir"

cat >server.conf <<EOF
[req]
req_extensions = v3_req
distinguished_name = req_distinguished_name
prompt = no
[req_distinguished_name]
CN = webhook-server.webhook-demo.svc
[ v3_req ]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth, serverAuth
subjectAltName = @alt_names
[alt_names]
DNS.1 = webhook-server.webhook-demo.svc
EOF


# Generate the CA cert and private key
openssl req -nodes -new -x509 -keyout ca.key -out ca.crt -subj "/CN=Admission Webhook CA"
# Generate the private key for the webhook server
openssl genrsa -out webhook-server-tls.key 2048
# Generate a Certificate Signing Request (CSR) for the private key, and sign it with the private key of the CA.
openssl req -new -key webhook-server-tls.key -subj "/CN=webhook-server.webhook-demo.svc" -config server.conf \
    | openssl x509 -req -CA ca.crt -CAkey ca.key -CAcreateserial -out webhook-server-tls.crt -extensions v3_req -extfile server.conf
```

```yaml deployment.yaml.template
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webhook-server
  namespace: webhook-demo
  labels:
    app: webhook-server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: webhook-server
  template:
    metadata:
      labels:
        app: webhook-server
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1234
      containers:
      - name: server
        image: zhongmingmao/admission-webhook:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 8443
          name: webhook-api
        volumeMounts:
        - name: webhook-tls-certs
          mountPath: /run/secrets/tls
          readOnly: true
      volumes:
      - name: webhook-tls-certs
        secret:
          secretName: webhook-server-tls
---
apiVersion: v1
kind: Service
metadata:
  name: webhook-server
  namespace: webhook-demo
spec:
  selector:
    app: webhook-server
  ports:
    - port: 443
      targetPort: webhook-api
---
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: admission-webhook
webhooks:
  - name: webhook-server.webhook-demo.svc
    sideEffects: None
    admissionReviewVersions: ["v1", "v1beta1"]
    clientConfig:
      service:
        name: webhook-server
        namespace: webhook-demo
        path: "/mutate"
      caBundle: ${CA_PEM_B64}
    rules:
      - operations: [ "CREATE" ]
        apiGroups: [""]
        apiVersions: ["v1"]
        resources: ["pods"]
```

> `caBundle` 是为了让 API Server 信任 Webhook Server 的自签证书

```
$ tree
.
├── deployment
│   ├── deployment.yaml.template
│   └── generate-keys.sh
└── deploy.sh

$ ./deploy.sh
Generating TLS keys ...
.........+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*.......+.....+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*....+.+......+.....+..........+..+............+.....................+....+.....................+...+..............+.+...............+..+.......+...+...+......+.....+...+.+..+...+.+.....+......+...+.+.....................+..+.......+.....+......+.............+.........+.....+.....................+......+...+...+.............+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
......+......+...+........+.........+.+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*.+........+.+......+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*.........+..+.+............+.........+........+..........+..+.+........+.+...+......+.....+......+...+.+..+.......+..+...+.+..+...................+...+..+...+.+.....+......+.........+.+...+........+...+.......+..............+.+...+..+.......+..+.............+.....................+.....+.......+.....+....+........+......+....+........+..............................+...+.........+.......+...+.....+............+.+...+..+...+............+...+..........+..............+...+.........+..........+......+...+.........+..+.........+.+........+.......+...+...+..+.............+.....+..........+..+.+..+.............+.....+.+........+...............+.+.....+.+........+...+..........+.........+...+...+.....+.........+......+............+.+..+...+.+...+...+.....+...+.+........+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
-----
Certificate request self-signature ok
subject=CN = webhook-server.webhook-demo.svc
Creating Kubernetes objects ...
namespace/webhook-demo created
secret/webhook-server-tls created
deployment.apps/webhook-server created
service/webhook-server created
mutatingwebhookconfiguration.admissionregistration.k8s.io/admission-webhook created
The webhook server has been deployed and configured!

$ k get mutatingwebhookconfigurations.admissionregistration.k8s.io
NAME                WEBHOOKS   AGE
admission-webhook   1          19s

$ k get mutatingwebhookconfigurations.admissionregistration.k8s.io admission-webhook -oyaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  creationTimestamp: "2022-07-16T10:41:49Z"
  generation: 1
  name: admission-webhook
  resourceVersion: "5981"
  uid: 73f11fce-be11-4324-aada-7775dcc1c3d9
webhooks:
- admissionReviewVersions:
  - v1
  - v1beta1
  clientConfig:
    caBundle: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURIekNDQWdlZ0F3SUJBZ0lVTnFyNWFTaGhHTzI1SUlGbWFwS1BkL2tVcTJvd0RRWUpLb1pJaHZjTkFRRUwKQlFBd0h6RWRNQnNHQTFVRUF3d1VRV1J0YVhOemFXOXVJRmRsWW1odmIyc2dRMEV3SGhjTk1qTXdOekUyTVRBMApNVFE0V2hjTk1qTXdPREUxTVRBME1UUTRXakFmTVIwd0d3WURWUVFEREJSQlpHMXBjM05wYjI0Z1YyVmlhRzl2CmF5QkRRVENDQVNJd0RRWUpLb1pJaHZjTkFRRUJCUUFEZ2dFUEFEQ0NBUW9DZ2dFQkFNTGdpTWRLcnJDVzJWaEoKd0t0WEtDKzJIRXprT2tGbnpqMFp3aWcwRnJlVmxyeFdQYnpyS2Z4RytRT1paTHorakdINmZqb25McjY4MDZYagpZRTBQbU5kUlBXdUluaVp6Qm4xVitRb3pocDhJUGtsZVBGcktNTnVPNEgzc3hwbXIwZVhyWFhqbmhuRVNheDZTCkFXS1ZUWEhlYkxxa0REZnkyMHFCYlFKUEszVExEQmpSL0VTOE1WRzZ0UWRVMTFENGZaZERMMThTallzd050dEQKRS9sTEhlTy9nSVBORjZ2bXlIb1ptQnlCbnhSbkZPMytUQzA4RVRGcmE5SElqcFRKQVZkMXhOT3pGRGVVejFXWQpxaERCRjhmL1VzZ0NlZVNia1hzVzF4a3BIckdML1hLeHBnenFpRjRHRSsxUTNPSHNzVjc3aDVON0FKOE5IS1VoCjlRZVlnN1VDQXdFQUFhTlRNRkV3SFFZRFZSME9CQllFRktCVmVlTzBsdmlZZVVoM3NPWWVDWGpCcmc1WU1COEcKQTFVZEl3UVlNQmFBRktCVmVlTzBsdmlZZVVoM3NPWWVDWGpCcmc1WU1BOEdBMVVkRXdFQi93UUZNQU1CQWY4dwpEUVlKS29aSWh2Y05BUUVMQlFBRGdnRUJBTFJ3NktCL1A5QWdOV0l4Qk1CV1N6WUlrQWVqZUxkb2s2K1pmRWg3Ci9TWVljSk5PbzN2eVZ4ai9DMmg0RkkxQVZoVXpZTk5hbmFWdVIydUp2R1pFWHk5dzFYYlFKYXB0U2ZZdytaTVUKbkFnWDFUcEpCK0FuQUZZUndXZEVNR2tzRkZJRkt2dmRaMUpHWU5jeUF6V0VJbUpJUG5rWXpHNVN0Y29NU291RwpLVHR3SmYyOVZ4ekhkRVlwRks4VWRvb1lwZE10bDc1dU1KMytMYXNDWk9KU0VwUWdHNVB6bWV1UFNDVHdFZEtXCnBsK0VXL3VTaEZORG1NRVRNcFZxRExKSUpvSGw0aFBYT1NvbnVtWXlEbkpGcTE3VHJEK04walBpVG44S1pxSXAKdlN1Uk9yWm5aWTZTSE5ER3RjU0c5L3A2SE14aFUrV0YzaEcyaUtZNzh0SnpXdlE9Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K
    service:
      name: webhook-server
      namespace: webhook-demo
      path: /mutate
      port: 443
  failurePolicy: Fail
  matchPolicy: Equivalent
  name: webhook-server.webhook-demo.svc
  namespaceSelector: {}
  objectSelector: {}
  reinvocationPolicy: Never
  rules:
  - apiGroups:
    - ""
    apiVersions:
    - v1
    operations:
    - CREATE
    resources:
    - pods
    scope: '*'
  sideEffects: None
  timeoutSeconds: 10
```

```
$ k get deployments.apps -n webhook-demo -owide
NAME             READY   UP-TO-DATE   AVAILABLE   AGE   CONTAINERS   IMAGES                                  SELECTOR
webhook-server   1/1     1            1           10m   server       zhongmingmao/admission-webhook:latest   app=webhook-server

$ k get po -n webhook-demo -owide
NAME                              READY   STATUS    RESTARTS   AGE   IP              NODE      NOMINATED NODE   READINESS GATES
webhook-server-554576df6f-w5l9k   1/1     Running   0          80s   192.168.185.9   mac-k8s   <none>           <none>
```

```
$ k run --image=nginx nginx
pod/nginx created

$ k get po -owide
NAME    READY   STATUS             RESTARTS     AGE   IP               NODE      NOMINATED NODE   READINESS GATES
nginx   0/1     CrashLoopBackOff   1 (3s ago)   7s    192.168.185.11   mac-k8s   <none>           <none>

$ k logs nginx
/docker-entrypoint.sh: /docker-entrypoint.d/ is not empty, will attempt to perform configuration
/docker-entrypoint.sh: Looking for shell scripts in /docker-entrypoint.d/
/docker-entrypoint.sh: Launching /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh
10-listen-on-ipv6-by-default.sh: info: can not modify /etc/nginx/conf.d/default.conf (read-only file system?)
/docker-entrypoint.sh: Sourcing /docker-entrypoint.d/15-local-resolvers.envsh
/docker-entrypoint.sh: Launching /docker-entrypoint.d/20-envsubst-on-templates.sh
/docker-entrypoint.sh: Launching /docker-entrypoint.d/30-tune-worker-processes.sh
/docker-entrypoint.sh: Configuration complete; ready for start up
2022/07/16 10:56:16 [warn] 1#1: the "user" directive makes sense only if the master process runs with super-user privileges, ignored in /etc/nginx/nginx.conf:2
nginx: [warn] the "user" directive makes sense only if the master process runs with super-user privileges, ignored in /etc/nginx/nginx.conf:2
2022/07/16 10:56:16 [emerg] 1#1: mkdir() "/var/cache/nginx/client_temp" failed (13: Permission denied)
nginx: [emerg] mkdir() "/var/cache/nginx/client_temp" failed (13: Permission denied)

$ k logs -n webhook-demo webhook-server-554576df6f-w5l9k
2023/07/16 10:55:55 Handling webhook request ...
2023/07/16 10:55:55 Webhook request handled successfully

$ k get po nginx -oyaml
apiVersion: v1
kind: Pod
metadata:
  ...
  name: nginx
  namespace: default
spec:
  containers:
  - image: nginx
    ...
  ...
  securityContext:
    runAsNonRoot: true
    runAsUser: 1234
  ...
```

# 限流

## 传统算法

### 计数器 + 固定窗口

> 突发流量的上限为窗口阈值的 `2 倍`

![image-20230716163122310](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230716163122310.png)

### 计数器 + 滑动窗口

> 相对于固定窗口，更平滑

![image-20230716175724319](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230716175724319.png)

### 漏桶

> 恒定的输出速度，不适合突发流量

![image-20230716180913686](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230716180913686.png)

### 令牌桶

> 恒定的令牌产生速度，支持一定的突发流量

![image-20230716181535708](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230716181535708.png)

## API Server

| Parameter                        | Desc                                       | Default |
| -------------------------------- | ------------------------------------------ | ------- |
| `max-requests-inflight`          | 在给定时间内最大的 `non-mutating` 的请求数 | 400     |
| `max-mutating-requests-inflight` | 在给定时间内最大的 `mutating` 的请求数     | 200     |

> 传统限流算法的局限性

| Disadvantage | Desc                                           |
| ------------ | ---------------------------------------------- |
| `粗粒度`     | 无法为不同用户、不同场景设置不同的限流         |
| `单队列`     | 共享限流窗口、可能会引起系统阻塞               |
| `不公平`     | 正常用户的请求会被排在队尾，无法及时处理而饿死 |
| `无优先级`   | 重要的系统指令会被一并限流，系统故障难以恢复   |

## APF

> API `Priority` and `Fairness`

1. 以`更细粒度`对请求进行`分类`和`隔离`
2. 引入了`空间有限`的排队机制，在非常`短暂`的`突发`情况下，API Server `不会拒绝`任何请求
3. 使用`公平排队`技术从队列中分发请求，即便一个行为不佳的控制器也不会饿死其他控制器
4. 核心思想：`多等级` + `多队列`

![image-20230716191502545](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230716191502545.png)

> 实现原理

1. APF 的实现依赖于两个重要的资源：`FlowSchema` 和 `PriorityLevelConfiguration`
2. APF 对请求进行更细粒度的`分类`，每一个`请求分类`对应一个 `FlowSchema`
3. FlowSchema 内的请求会根据 `distinguisher` 进一步划分为不同的 Flow
4. `FlowSchema` 会设置一个 `Priority Level`，不同 `Priority Level` 的`并发资源`是`隔离`的
5. `一个 Priority Level` 对应`多个 FlowSchema`（一个 FlowSchema 又对应多个 Flow）
   - `Priority Level` 中维护一个 `QueueSet`，用于`缓存`不能及时处理的请求
   - 请求不会因为超出 Priority Level 的并发限制而被丢弃
6. FlowSchema 的每个 `Flow` 通过 `shuffle sharding` 算法从 QueueSet 中`选取`特定的 Queues 缓存请求
7. 每次从 QueueSet 中取请求执行时
   - 会先应用 `fair queuing` 算法从 QueueSet 中选择一个 `Queue`，然后从这个 Queue 中取出 `oldest` 请求执行

> FlowSchema 匹配一些入站请求，并将它们分配给 Priority Level

> 每个`入站请求`都会`按照 matchingPrecedence 从小到大`对所有的 FlowSchema 测试是否匹配，直到`首个匹配`出现

> `FlowSchema + Distinguisher ==> Flow`

| Key                        | Value                      |
| -------------------------- | -------------------------- |
| distinguisherMethod        | Distinguisher              |
| matchingPrecedence         | 规则优先级                 |
| priorityLevelConfiguration | PriorityLevelConfiguration |

```
$ k api-resources --api-group='flowcontrol.apiserver.k8s.io'
NAME                          SHORTNAMES   APIVERSION                             NAMESPACED   KIND
flowschemas                                flowcontrol.apiserver.k8s.io/v1beta1   false        FlowSchema
prioritylevelconfigurations                flowcontrol.apiserver.k8s.io/v1beta1   false        PriorityLevelConfiguration

$ k get flowschemas.flowcontrol.apiserver.k8s.io
NAME                           PRIORITYLEVEL     MATCHINGPRECEDENCE   DISTINGUISHERMETHOD   AGE    MISSINGPL
exempt                         exempt            1                    <none>                106m   False
probes                         exempt            2                    <none>                106m   False
system-leader-election         leader-election   100                  ByUser                106m   False
workload-leader-election       leader-election   200                  ByUser                106m   False
system-node-high               node-high         400                  ByUser                106m   False
system-nodes                   system            500                  ByUser                106m   False
kube-controller-manager        workload-high     800                  ByNamespace           106m   False
kube-scheduler                 workload-high     800                  ByNamespace           106m   False
kube-system-service-accounts   workload-high     900                  ByNamespace           106m   False
service-accounts               workload-low      9000                 ByUser                106m   False
global-default                 global-default    9900                 ByUser                106m   False
catch-all                      catch-all         10000                ByUser                106m   False

$ k get flowschemas.flowcontrol.apiserver.k8s.io service-accounts -oyaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta1
kind: FlowSchema
metadata:
  annotations:
    apf.kubernetes.io/autoupdate-spec: "true"
  creationTimestamp: "2022-07-16T09:51:21Z"
  generation: 1
  name: service-accounts
  resourceVersion: "73"
  uid: da4cb058-17cf-4ed7-a1a2-38d2dca035d5
spec:
  distinguisherMethod:
    type: ByUser
  matchingPrecedence: 9000
  priorityLevelConfiguration:
    name: workload-low
  rules:
  - nonResourceRules:
    - nonResourceURLs:
      - '*'
      verbs:
      - '*'
    resourceRules:
    - apiGroups:
      - '*'
      clusterScope: true
      namespaces:
      - '*'
      resources:
      - '*'
      verbs:
      - '*'
    subjects:
    - group:
        name: system:serviceaccounts
      kind: Group
status:
  conditions:
  - lastTransitionTime: "2022-07-16T09:51:21Z"
    message: This FlowSchema references the PriorityLevelConfiguration object named
      "workload-low" and it exists
    reason: Found
    status: "False"
    type: Dangling
```

> nonResourceURL - /api/v1/namespaces

```
$ k get ns default -v 9
I0716 11:43:39.587424  113402 loader.go:372] Config loaded from file:  /home/zhongmingmao/.kube/config
I0716 11:43:39.591060  113402 round_trippers.go:435] curl -v -XGET  -H "Accept: application/json;as=Table;v=v1;g=meta.k8s.io,application/json;as=Table;v=v1beta1;g=meta.k8s.io,application/json" -H "User-Agent: kubectl/v1.22.2 (linux/arm64) kubernetes/8b5a191" 'https://192.168.191.153:6443/api/v1/namespaces/default'
I0716 11:43:39.597307  113402 round_trippers.go:454] GET https://192.168.191.153:6443/api/v1/namespaces/default 200 OK in 6 milliseconds
I0716 11:43:39.597324  113402 round_trippers.go:460] Response Headers:
I0716 11:43:39.597327  113402 round_trippers.go:463]     Audit-Id: 994464d1-7b35-414e-819d-9f4a96618024
I0716 11:43:39.597329  113402 round_trippers.go:463]     Cache-Control: no-cache, private
I0716 11:43:39.597331  113402 round_trippers.go:463]     Content-Type: application/json
I0716 11:43:39.597333  113402 round_trippers.go:463]     X-Kubernetes-Pf-Flowschema-Uid: 4957b2cd-8c3d-4284-af18-011105e6d997
I0716 11:43:39.597335  113402 round_trippers.go:463]     X-Kubernetes-Pf-Prioritylevel-Uid: f07b49a7-f33b-4415-932b-276e640f8407
I0716 11:43:39.597337  113402 round_trippers.go:463]     Content-Length: 1659
I0716 11:43:39.597339  113402 round_trippers.go:463]     Date: Sun, 16 Jul 2022 11:43:39 GMT
I0716 11:43:39.597360  113402 request.go:1181] Response Body: {"kind":"Table","apiVersion":"meta.k8s.io/v1","metadata":{"resourceVersion":"204"},"columnDefinitions":[{"name":"Name","type":"string","format":"name","description":"Name must be unique within a namespace. Is required when creating resources, although some resources may allow a client to request the generation of an appropriate name automatically. Name is primarily intended for creation idempotence and configuration definition. Cannot be updated. More info: http://kubernetes.io/docs/user-guide/identifiers#names","priority":0},{"name":"Status","type":"string","format":"","description":"The status of the namespace","priority":0},{"name":"Age","type":"string","format":"","description":"CreationTimestamp is a timestamp representing the server time when this object was created. It is not guaranteed to be set in happens-before order across separate operations. Clients may not set this value. It is represented in RFC3339 form and is in UTC.\n\nPopulated by the system. Read-only. Null for lists. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata","priority":0}],"rows":[{"cells":["default","Active","112m"],"object":{"kind":"PartialObjectMetadata","apiVersion":"meta.k8s.io/v1","metadata":{"name":"default","uid":"2287c1e6-4dec-4772-9b21-730f7c537ea9","resourceVersion":"204","creationTimestamp":"2022-07-16T09:51:22Z","labels":{"kubernetes.io/metadata.name":"default"},"managedFields":[{"manager":"kube-apiserver","operation":"Update","apiVersion":"v1","time":"2022-07-16T09:51:22Z","fieldsType":"FieldsV1","fieldsV1":{"f:metadata":{"f:labels":{".":{},"f:kubernetes.io/metadata.name":{}}}}}]}}}]}
NAME      STATUS   AGE
default   Active   112m
```

> PriorityLevelConfiguration 表示单个`隔离类型`
> 限制`未完成的请求数`（assuredConcurrencyShares）和`排队中的请求数`（Queue）

| Key                        | Value                                                        |
| -------------------------- | ------------------------------------------------------------ |
| `assuredConcurrencyShares` | 允许的并发请求 - `Flow` 的维度 - `限制某个 Flow 占用过多资`  |
| queues                     | 当前 Priority Level 的队列总数                               |
| queueLengthLimit           | 每个队列中的对象数量                                         |
| `handSize`                 | `shuffle sharding` 的配置<br />每个 `flowschema + distinguisher` 的请求会被 `enqueue` 到多少个队列 |

```
$ k get prioritylevelconfigurations.flowcontrol.apiserver.k8s.io
NAME              TYPE      ASSUREDCONCURRENCYSHARES   QUEUES   HANDSIZE   QUEUELENGTHLIMIT   AGE
catch-all         Limited   5                          <none>   <none>     <none>             117m
exempt            Exempt    <none>                     <none>   <none>     <none>             117m
global-default    Limited   20                         128      6          50                 117m
leader-election   Limited   10                         16       4          50                 117m
node-high         Limited   40                         64       6          50                 117m
system            Limited   30                         64       6          50                 117m
workload-high     Limited   40                         128      6          50                 117m
workload-low      Limited   100                        128      6          50                 117m

$ k get prioritylevelconfigurations.flowcontrol.apiserver.k8s.io workload-low -oyaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta1
kind: PriorityLevelConfiguration
metadata:
  annotations:
    apf.kubernetes.io/autoupdate-spec: "true"
  creationTimestamp: "2022-07-16T09:51:21Z"
  generation: 1
  name: workload-low
  resourceVersion: "66"
  uid: 8f6fa0cb-a367-4664-b0d9-2327c3b29539
spec:
  limited:
    assuredConcurrencyShares: 100
    limitResponse:
      queuing:
        handSize: 6
        queueLengthLimit: 50
        queues: 128
      type: Queue
  type: Limited
status: {}
```

> 概念：`FlowSchema - 分类规则` + `PriorityLevel - 并发规则`

1. 传入的请求通过 FlowSchema 按照其属性`分类`，并分配`优先级`
2. 每个`优先级`维护自定义的`并发规则`，不同优先级的请求，不会相互饿死
3. 在同一个优先级内，`公平排队`算法可以防止来自不同 Flow 的请求相互饿死
4. 将请求排队，通过排队机制，防止在平均负载较低时，因通信量徒增而导致请求失败

> 优先级

1. 如果未启用 APF
   - API Server 的整体并发量将受到 `max-requests-inflight` 和 `max-mutating-requests-inflight` 的限制
2. 如果启用了 APF
   - 将 `max-requests-inflight` 和 `max-mutating-requests-inflight` 求和
   - 将总和`分配`到`一组`可配置的`优先级`中，每个传入的请求都会分配一个优先级
3. 每个优先级都有各自的配置，设定分发的并发请求数

> 排队

1. 在过载情况下，防止一个 Flow 饿死其它 Flow 是非常有价值的
2. 每个请求被分配到某个 `Flow` 中，该 `Flow` 由对应的 `FlowSchema` 和 `Distinguisher` 来标识确定
3. 系统尝试为具有`相同 PriorityLevel` 的`不同 Flow` 中的请求赋予`近似相等的权重`
4. 将请求分配到 `Flow` 之后，通过 `shuffle sharding` 将请求分配到 `Priority Level` 的 `Queue` 中
   - `shuffle sharding` - 可以`相对有效`地`隔离`低强度 Flow 和高强度 Flow
5. 排队算法的细节可以针对每个 `Priority Level` 进行调整

>  豁免请求（Exempt）

1. 某些特别重要的请求`不受制`于此特性施加的任何限制
2. 可以防止不当的流控配置`完全禁用` API Server

> 默认配置

```
$ k get flowschemas.flowcontrol.apiserver.k8s.io
NAME                           PRIORITYLEVEL     MATCHINGPRECEDENCE   DISTINGUISHERMETHOD   AGE    MISSINGPL
exempt                         exempt            1                    <none>                173m   False
probes                         exempt            2                    <none>                173m   False
system-leader-election         leader-election   100                  ByUser                173m   False
workload-leader-election       leader-election   200                  ByUser                173m   False
system-node-high               node-high         400                  ByUser                173m   False
system-nodes                   system            500                  ByUser                173m   False
kube-controller-manager        workload-high     800                  ByNamespace           173m   False
kube-scheduler                 workload-high     800                  ByNamespace           173m   False
kube-system-service-accounts   workload-high     900                  ByNamespace           173m   False
service-accounts               workload-low      9000                 ByUser                173m   False
global-default                 global-default    9900                 ByUser                173m   False
catch-all                      catch-all         10000                ByUser                173m   False

$ k get prioritylevelconfigurations.flowcontrol.apiserver.k8s.io
NAME              TYPE      ASSUREDCONCURRENCYSHARES   QUEUES   HANDSIZE   QUEUELENGTHLIMIT   AGE
catch-all         Limited   5                          <none>   <none>     <none>             173m
exempt            Exempt    <none>                     <none>   <none>     <none>             173m
global-default    Limited   20                         128      6          50                 173m
leader-election   Limited   10                         16       4          50                 173m
node-high         Limited   40                         64       6          50                 173m
system            Limited   30                         64       6          50                 173m
workload-high     Limited   40                         128      6          50                 173m
workload-low      Limited   100                        128      6          50                 173m
```

| Priority Level  | Desc                                                         |
| --------------- | ------------------------------------------------------------ |
| exempt          | 请求`完全不受流控限制`，总是被`立即分发`，将 `system:masters` 组的所有请求都纳入该 Priority Level |
| system          | 用于 `system:nodes` 的请求（即 `kubelets`）<br />kubelets 必须要连上 API Server，以便工作负载能调度到到其上 |
| leader-election | 用于`内置控制器`的选举请求（`system:kube-controller-manager` + `system:kube-scheduler`） |
| workload-high   | 用于`内置控制器`的请求                                       |
| workload-low    | 用于来自于任何 `ServiceAccount` 的请求（包括来自于 `Pod` 中运行的`控制器`的所有请求） |
| global-default  | 所有其它流量，如`非特权用户`运行的交互式 `kubectl` 命令      |
| catch-all       | 确保每个请求都有分类，`一般不依赖`默认的 catch-all 配置<br />仅与 catch-all FlowSchema 匹配的流量`更容易被拒绝`（HTTP 429） |

> exempt

```
$ k get flowschemas.flowcontrol.apiserver.k8s.io exempt -oyaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta1
kind: FlowSchema
metadata:
  annotations:
    apf.kubernetes.io/autoupdate-spec: "true"
  creationTimestamp: "2022-07-16T09:51:21Z"
  generation: 1
  name: exempt
  resourceVersion: "79"
  uid: 4957b2cd-8c3d-4284-af18-011105e6d997
spec:
  matchingPrecedence: 1
  priorityLevelConfiguration:
    name: exempt
  rules:
  - nonResourceRules:
    - nonResourceURLs:
      - '*'
      verbs:
      - '*'
    resourceRules:
    - apiGroups:
      - '*'
      clusterScope: true
      namespaces:
      - '*'
      resources:
      - '*'
      verbs:
      - '*'
    subjects:
    - group:
        name: system:masters
      kind: Group
status:
  conditions:
  - lastTransitionTime: "2022-07-16T09:51:21Z"
    message: This FlowSchema references the PriorityLevelConfiguration object named
      "exempt" and it exists
    reason: Found
    status: "False"
    type: Dangling

$ k get prioritylevelconfigurations.flowcontrol.apiserver.k8s.io exempt -oyaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta1
kind: PriorityLevelConfiguration
metadata:
  annotations:
    apf.kubernetes.io/autoupdate-spec: "true"
  creationTimestamp: "2022-07-16T09:51:21Z"
  generation: 1
  name: exempt
  resourceVersion: "77"
  uid: f07b49a7-f33b-4415-932b-276e640f8407
spec:
  type: Exempt
status: {}
```

> probes

```
$ k get flowschemas.flowcontrol.apiserver.k8s.io probes -oyaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta1
kind: FlowSchema
metadata:
  annotations:
    apf.kubernetes.io/autoupdate-spec: "true"
  creationTimestamp: "2022-07-16T09:51:21Z"
  generation: 1
  name: probes
  resourceVersion: "80"
  uid: 5620074f-ddb8-4cb9-9d76-6e6b7206cdc1
spec:
  matchingPrecedence: 2
  priorityLevelConfiguration:
    name: exempt
  rules:
  - nonResourceRules:
    - nonResourceURLs:
      - /healthz
      - /readyz
      - /livez
      verbs:
      - get
    subjects:
    - group:
        name: system:unauthenticated
      kind: Group
    - group:
        name: system:authenticated
      kind: Group
status:
  conditions:
  - lastTransitionTime: "2022-07-16T09:51:21Z"
    message: This FlowSchema references the PriorityLevelConfiguration object named
      "exempt" and it exists
    reason: Found
    status: "False"
    type: Dangling
```

> system-leader-election

```
$ k get flowschemas.flowcontrol.apiserver.k8s.io system-leader-election -oyaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta1
kind: FlowSchema
metadata:
  annotations:
    apf.kubernetes.io/autoupdate-spec: "true"
  creationTimestamp: "2022-07-16T09:51:21Z"
  generation: 1
  name: system-leader-election
  resourceVersion: "63"
  uid: c4152002-0863-41b9-90af-a86617e27289
spec:
  distinguisherMethod:
    type: ByUser
  matchingPrecedence: 100
  priorityLevelConfiguration:
    name: leader-election
  rules:
  - resourceRules:
    - apiGroups:
      - ""
      namespaces:
      - kube-system
      resources:
      - endpoints
      - configmaps
      verbs:
      - get
      - create
      - update
    - apiGroups:
      - coordination.k8s.io
      namespaces:
      - '*'
      resources:
      - leases
      verbs:
      - get
      - create
      - update
    subjects:
    - kind: User
      user:
        name: system:kube-controller-manager
    - kind: User
      user:
        name: system:kube-scheduler
    - kind: ServiceAccount
      serviceAccount:
        name: '*'
        namespace: kube-system
status:
  conditions:
  - lastTransitionTime: "2022-07-16T09:51:21Z"
    message: This FlowSchema references the PriorityLevelConfiguration object named
      "leader-election" and it exists
    reason: Found
    status: "False"
    type: Dangling
    
$ k get prioritylevelconfigurations.flowcontrol.apiserver.k8s.io leader-election -oyaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta1
kind: PriorityLevelConfiguration
metadata:
  annotations:
    apf.kubernetes.io/autoupdate-spec: "true"
  creationTimestamp: "2022-07-16T09:51:21Z"
  generation: 1
  name: leader-election
  resourceVersion: "62"
  uid: 6cf63c57-6199-4511-bc3e-336b8776e373
spec:
  limited:
    assuredConcurrencyShares: 10
    limitResponse:
      queuing:
        handSize: 4
        queueLengthLimit: 50
        queues: 16
      type: Queue
  type: Limited
status: {}
```

> 调试

| URI                   | Desc                               |
| --------------------- | ---------------------------------- |
| /dump_priority_levels | 所有 `Priority Level` 及其当前状态 |
| /dump_queues          | 所有 `Queue` 及其当前状态          |
| /dump_requests        | 当前`正在队列中等待`的所有`请求`   |

```
$ k get --raw /debug/api_priority_and_fairness/dump_priority_levels
PriorityLevelName, ActiveQueues, IsIdle, IsQuiescing, WaitingRequests, ExecutingRequests
global-default,    0,            true,   false,       0,               0
catch-all,         0,            true,   false,       0,               0
exempt,            <none>,       <none>, <none>,      <none>,          <none>
system,            0,            true,   false,       0,               0
node-high,         0,            true,   false,       0,               0
leader-election,   0,            true,   false,       0,               0
workload-high,     0,            false,  false,       0,               17
workload-low,      0,            true,   false,       0,               0

$ k get --raw /debug/api_priority_and_fairness/dump_queues | grep 'workload-high' | sort -k4 -nr | head -n 10
PriorityLevelName, Index,  PendingRequests, ExecutingRequests, VirtualStart
workload-high,     57,     0,               17,                147156.7636
workload-high,     99,     0,               0,                 0.0000
workload-high,     98,     0,               0,                 0.0000
workload-high,     97,     0,               0,                 0.0000
workload-high,     96,     0,               0,                 11.4672
workload-high,     95,     0,               0,                 0.0000
workload-high,     94,     0,               0,                 0.5345
workload-high,     93,     0,               0,                 0.0000
workload-high,     92,     0,               0,                 11.7450
workload-high,     91,     0,               0,                 0.0000

$ k get --raw /debug/api_priority_and_fairness/dump_requests
PriorityLevelName, FlowSchemaName, QueueIndex, RequestIndexInQueue, FlowDistingsher, ArriveTime
```

# 高可用

> 无状态 + 多副本

1. API Server 是`无状态`的 Rest Server，方便执行 `Scale Up/down`
2. 负载均衡
   - 在多个 API Server 实例之上，配置负载均衡（如 `haproxy`）
   - `证书`可能需要加上 `Loadbalancer VIP` 重新生成

> CPU + Memory

1. 随着集群中 Node 不断增多，API Server 对 CPU 和 Memory 的开销会不断增大
2. 过少的 CPU 资源会降低其处理效率，过少的内存资源会导致 Pod 被 OOMKilled

> RateLimit

1. `max-requests-inflight` + `max-mutating-requests-inflight`
2. `APF`

> Cache

1. `API Server` 与 `etcd` 之间是基于 `gRPC` 协议进行通信的（gRPC 协议保证了在`大规模集群`中的`数据高速传输`）
   - gRPC 是基于`连接复用`的 `HTTP/2`
     - 针对`相同分组`的对象，API Server 和 etcd 之间共享`相同的 TCP 连接`，不同请求使用不同的 Stream
   - 一个 `HTTP/2 连接`是有 `Stream 配额`的，配额大小会限制其能支持的`并发请求`
2. API Server 提供了`集群对象`的`缓存`机制
   - 当客户端发起查询请求时
     - API Server 默认会将其`缓存`直接返回给客户端，缓存区大小由参数 `--watch-cache-sizes` 控制
   - 针对访问比较多的对象，设置适当大小的缓存，可以极大降低对 etcd 的访问频率，降低对 etcd 集群的读写压力
   - API Server 也允许客户端`忽略缓存`，API Server 直接从 etcd 中拉取最新数据返回给客户端

> 长连接

1. 当查询请求的返回`数据量`比较大且此类请求`并发量`较大时，容易引起 TCP 链路的阻塞，导致其它查询的操作超时
2. 客户端应尽量通过`长连接`来 `List & Watch`，避免`全量`从 API Server 获取数据，降低 API Server 的压力

> 访问方式

1. `外部用户`，永远只通过 `Loadbalancer VIP` 访问
2. 只有当`负载均衡`（一般为 Service）出现故障时，管理员才切换到 `apiserver IP` 进行管理
3. `内部组件`，应使用`统一的入口`访问 API Server，确保看到`一致视图`

| Client type | 外部 LB VIP | Service Cluster IP | apiserver IP |
| ----------- | ----------- | ------------------ | ------------ |
| Internal    | Y           | Y                  | Y            |
| External    | Y           | N                  | N            |

```
$ k get svc -owide
NAME         TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE     SELECTOR
kubernetes   ClusterIP   10.96.0.1    <none>        443/TCP   4h32m   <none>

$ k get svc kubernetes -oyaml
apiVersion: v1
kind: Service
metadata:
  creationTimestamp: "2022-07-16T09:51:22Z"
  labels:
    component: apiserver
    provider: kubernetes
  name: kubernetes
  namespace: default
  resourceVersion: "206"
  uid: 5b0d88ce-3736-44e8-b06f-395d0ab457ad
spec:
  clusterIP: 10.96.0.1
  clusterIPs:
  - 10.96.0.1
  internalTrafficPolicy: Cluster
  ipFamilies:
  - IPv4
  ipFamilyPolicy: SingleStack
  ports:
  - name: https
    port: 443
    protocol: TCP
    targetPort: 6443
  sessionAffinity: None
  type: ClusterIP
status:
  loadBalancer: {}
  
$ curl -k https://10.96.0.1
{
  "kind": "Status",
  "apiVersion": "v1",
  "metadata": {

  },
  "status": "Failure",
  "message": "forbidden: User \"system:anonymous\" cannot get path \"/\"",
  "reason": "Forbidden",
  "details": {

  },
  "code": 403
}
```

# 对象

## APIService

> 任何`对象`都有对应的 `APIService`（对象应该由哪个 `API Server` 来处理，`kube-aggregator`）

```
$ k api-resources --api-group='apiregistration.k8s.io'
NAME          SHORTNAMES   APIVERSION                  NAMESPACED   KIND
apiservices                apiregistration.k8s.io/v1   false        APIService

$ k get apiservices.apiregistration.k8s.io
NAME                                   SERVICE                       AVAILABLE   AGE
v1.                                    Local                         True        4h46m
v1.admissionregistration.k8s.io        Local                         True        4h46m
v1.apiextensions.k8s.io                Local                         True        4h46m
v1.apps                                Local                         True        4h46m
v1.authentication.k8s.io               Local                         True        4h46m
v1.authorization.k8s.io                Local                         True        4h46m
v1.autoscaling                         Local                         True        4h46m
v1.batch                               Local                         True        4h46m
v1.certificates.k8s.io                 Local                         True        4h46m
v1.coordination.k8s.io                 Local                         True        4h46m
v1.crd.projectcalico.org               Local                         True        4h44m
v1.discovery.k8s.io                    Local                         True        4h46m
v1.events.k8s.io                       Local                         True        4h46m
v1.networking.k8s.io                   Local                         True        4h46m
v1.node.k8s.io                         Local                         True        4h46m
v1.operator.tigera.io                  Local                         True        4h44m
v1.policy                              Local                         True        4h46m
v1.rbac.authorization.k8s.io           Local                         True        4h46m
v1.scheduling.k8s.io                   Local                         True        4h46m
v1.storage.k8s.io                      Local                         True        4h46m
v1beta1.batch                          Local                         True        4h46m
v1beta1.discovery.k8s.io               Local                         True        4h46m
v1beta1.events.k8s.io                  Local                         True        4h46m
v1beta1.flowcontrol.apiserver.k8s.io   Local                         True        4h46m
v1beta1.node.k8s.io                    Local                         True        4h46m
v1beta1.policy                         Local                         True        4h46m
v1beta1.storage.k8s.io                 Local                         True        4h46m
v2beta1.autoscaling                    Local                         True        4h46m
v2beta2.autoscaling                    Local                         True        4h46m
v3.projectcalico.org                   calico-apiserver/calico-api   True        4h38m

$ k get apiservices.apiregistration.k8s.io v1. -oyaml
apiVersion: apiregistration.k8s.io/v1
kind: APIService
metadata:
  creationTimestamp: "2022-07-16T09:51:21Z"
  labels:
    kube-aggregator.kubernetes.io/automanaged: onstart
  name: v1.
  resourceVersion: "7"
  uid: b2e42b10-1da8-46ba-81d1-7262c4fbfb6e
spec:
  groupPriorityMinimum: 18000
  version: v1
  versionPriority: 1
status:
  conditions:
  - lastTransitionTime: "2022-07-16T09:51:21Z"
    message: Local APIServices are always available
    reason: Local
    status: "True"
    type: Available
```

## apimachinery

> Scheme, typing, encoding, decoding, and conversion packages for Kubernetes and Kubernetes-like API objects.

### GKV

| Version          | Desc     |
| ---------------- | -------- |
| External version | 面向用户 |
| Internel version | 内部版本 |
| Storage version  | etcd     |

### Group

> pkg/apis/core/register.go

> 定义 GroupVersion

```go
// SchemeGroupVersion is group version used to register these objects
var SchemeGroupVersion = schema.GroupVersion{Group: GroupName, Version: runtime.APIVersionInternal}
```

> 定义 SchemeBuilder

```go
var (
	// SchemeBuilder object to register various known types
	SchemeBuilder = runtime.NewSchemeBuilder(addKnownTypes)

	// AddToScheme represents a func that can be used to apply all the registered
	// funcs in a scheme
	AddToScheme = SchemeBuilder.AddToScheme
)
```

> 将对象加入 SchemeBuilder

```go
func addKnownTypes(scheme *runtime.Scheme) error {
	if err := scheme.AddIgnoredConversionType(&metav1.TypeMeta{}, &metav1.TypeMeta{}); err != nil {
		return err
	}
	scheme.AddKnownTypes(SchemeGroupVersion,
		&Pod{},
		&PodList{},
		&PodStatusResult{},
		&PodTemplate{},
		&PodTemplateList{},
		&ReplicationControllerList{},
		&ReplicationController{},
		&ServiceList{},
		&Service{},
		&ServiceProxyOptions{},
		&NodeList{},
		&Node{},
		&NodeProxyOptions{},
		&Endpoints{},
		&EndpointsList{},
		&Binding{},
		&Event{},
		&EventList{},
		&List{},
		&LimitRange{},
		&LimitRangeList{},
		&ResourceQuota{},
		&ResourceQuotaList{},
		&Namespace{},
		&NamespaceList{},
		&ServiceAccount{},
		&ServiceAccountList{},
		&Secret{},
		&SecretList{},
		&PersistentVolume{},
		&PersistentVolumeList{},
		&PersistentVolumeClaim{},
		&PersistentVolumeClaimList{},
		&PodAttachOptions{},
		&PodLogOptions{},
		&PodExecOptions{},
		&PodPortForwardOptions{},
		&PodProxyOptions{},
		&ComponentStatus{},
		&ComponentStatusList{},
		&SerializedReference{},
		&RangeAllocation{},
		&ConfigMap{},
		&ConfigMapList{},
	)

	return nil
}
```

### 对象定义

> 单一对象的数据结构：`TypeMeta`、`ObjectMeta`、`Spec`、`Status`

> Internel version

![image-20230717004738888](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230717004738888.png)

![image-20230717004842094](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230717004842094.png)

```go
// Pod is a collection of containers, used as either input (create, update) or as output (list, get).
type Pod struct {
	metav1.TypeMeta
	// +optional
	metav1.ObjectMeta

	// Spec defines the behavior of a pod.
	// +optional
	Spec PodSpec

	// Status represents the current information about a pod. This data may not be up
	// to date.
	// +optional
	Status PodStatus
}

// TypeMeta describes an individual object in an API response or request
// with strings representing the type of the object and its API schema version.
// Structures that are versioned or persisted should inline TypeMeta.
//
// +k8s:deepcopy-gen=false
type TypeMeta struct {
	// Kind is a string value representing the REST resource this object represents.
	// Servers may infer this from the endpoint the client submits requests to.
	// Cannot be updated.
	// In CamelCase.
	// More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds
	// +optional
	Kind string `json:"kind,omitempty" protobuf:"bytes,1,opt,name=kind"`

	// APIVersion defines the versioned schema of this representation of an object.
	// Servers should convert recognized schemas to the latest internal value, and
	// may reject unrecognized values.
	// More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources
	// +optional
	APIVersion string `json:"apiVersion,omitempty" protobuf:"bytes,2,opt,name=apiVersion"`
}
```

> External version - 多了一些 `json tag`

![image-20230717005023530](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230717005023530.png)

### 代码生成

> https://github.com/kubernetes/code-generator

| Tags          | Desc                             |
| ------------- | -------------------------------- |
| `Global Tags` | 定义在 `doc.go`                  |
| `Local Tags`  | 定义在 `types.go` 中的每个对象里 |

> Global Tags

![image-20230717010256614](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230717010256614.png)

> Local Tags

![image-20230717010549365](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230717010549365.png)

![image-20230717010805823](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230717010805823.png)

| Tags            | Desc                                                         |
| --------------- | ------------------------------------------------------------ |
| `deepcopy-gen`  | 为对象生成 DeepCopy 方法，用于创建对象副本                   |
| `client-gen`    | 创建 Clientset，用于操作对象的 CRUD                          |
| `informer-gen`  | 为对象创建 `Informer` 框架，用于`监听对象变化`               |
| `lister-gen`    | 为对象构建 `Lister` 框架，用于为 `Get` 和 `List` 操作，构建`客户端缓存` |
| `coversion-gen` | 为对象构建 `Conversion` 方法，用于`内外版本转换`以及`不同版本号的转换` |

### etcd storage

![image-20230717011032867](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230717011032867.png)

> Strategy - PrepareForCreate、PrepareForUpdate 等都属于 API Server 的框架层

![image-20230717011313999](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230717011313999.png)

### subresource

> `内嵌`在 Kubernetes 对象中，有`独立的操作逻辑`的属性集合，如 `PodStatus` 是 Pod 的 subresource

![image-20230717012609744](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230717012609744.png)

> 要更新 Pod Status 时，请求（New）里面的 Pod Spec、Pod OwnerReferences 都会被 `etcd` 里面（Old）的版本`覆盖`

> 即当更新 Status 时，所有请求里面的非 Status 信息都会丢掉，采用与 etcd 一致的版本，反之，更新 Spec 亦然

> 背景：Status 的更新`非常频繁`

![image-20230717012242569](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230717012242569.png)

### APIGroup

> 定义 Storage

```
configMapStorage, err := configmapstore.NewREST(restOptionsGetter)
```

> 定义对象的 StorageMap

```
storage := map[string]rest.Storage{}

...
if resource := "configmaps"; apiResourceConfigSource.ResourceEnabled(corev1.SchemeGroupVersion.WithResource(resource)) {
  storage[resource] = configMapStorage
}
```

> 将对象注册到 API Server（即挂载 Handler）

```go
if len(groupName) == 0 {
  // the legacy group for core APIs is special that it is installed into /api via this special install method.
  if err := m.GenericAPIServer.InstallLegacyAPIGroup(genericapiserver.DefaultLegacyAPIPrefix, &apiGroupInfo); err != nil {
    return fmt.Errorf("error in registering legacy API: %w", err)
  }
} else {
  // everything else goes to /apis
  nonLegacy = append(nonLegacy, &apiGroupInfo)
}
```

# Static Pod

> kubelet 在创建完 `Static Pod` 后，会在 `API Server` 补一个 Pod 对象，称为 `Mirror Pod`

 
