---
title: 应用配置管理
mathjax: false
date: 2021-07-12 14:07:26
categories:
	- Cloud Native
	- Kubernetes
	- Alibaba
tags:
	- Cloud Native
	- Kubernetes
	- Alibaba
---

# Pod 配置管理

![image-20210712145623420](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210712145623420.png)

| Key          | Value           |
| ------------ | --------------- |
| **独立资源** | ConfigMap       |
|              | Secret          |
|              | ServiceAccount  |
| **Pod.spec** | Resources       |
|              | SecurityContext |
|              | InitContainers  |

<!-- more -->

# ConfigMap

## 用途

1. 管理容器**运行时**所需要的配置文件、环境变量、命令行参数等可变配置
2. 用于**解耦容器镜像和可变配置**，从而保证**工作负载（Pod）**的**可移植性**

## 创建

### 指定键值对

```
$ kubectl create configmap special-config --from-literal=special.how=very --from-literal=special.type=charm
configmap/special-config created

$ kubectl get configmaps special-config -o yaml
apiVersion: v1
data:
  special.how: very
  special.type: charm
kind: ConfigMap
metadata:
  creationTimestamp: "2021-07-12T07:37:10Z"
  name: special-config
  namespace: default
  resourceVersion: "15441"
  selfLink: /api/v1/namespaces/default/configmaps/special-config
  uid: 03b63c92-9103-4eac-8d93-5cf69adfd594
```

### 指定文件

```json info.json
{
    "name": "zhongmingmao",
    "other": {
        "location": "Guang Zhou"
    }
}
```

```
$ kubectl create configmap info-config --from-file=info.json
configmap/info-config created

$ kubectl get configmaps info-config -o yaml
apiVersion: v1
data:
  info.json: |-
    {
        "name": "zhongmingmao",
        "other": {
            "location": "Guang Zhou"
        }
    }
kind: ConfigMap
metadata:
  creationTimestamp: "2021-07-12T07:40:54Z"
  name: info-config
  namespace: default
  resourceVersion: "15602"
  selfLink: /api/v1/namespaces/default/configmaps/info-config
  uid: 5d0ac44b-69fb-4dbf-9c61-d26024f3c12b
```

## 使用

### 环境变量

```yaml cm-env-test.yml
apiVersion: v1
kind: Pod
metadata:
  name: cm-env-test
spec:
  containers:
    - name: test-container
      image: busybox
      command:
        - /bin/sh
        - '-c'
        - env
      env:
        - name: SPECIAL_LEVEL_KEY
          valueFrom:
            configMapKeyRef:
              name: special-config
              key: special.how
  restartPolicy: Never
```

```
$ kubectl apply -f cm-env-test.yaml
pod/cm-env-test created

$ kubectl get pods
NAME          READY   STATUS      RESTARTS   AGE
cm-env-test   0/1     Completed   0          16s

$ kubectl logs cm-env-test
KUBERNETES_SERVICE_PORT=443
KUBERNETES_PORT=tcp://10.96.0.1:443
HOSTNAME=cm-env-test
SHLVL=1
HOME=/root
KUBERNETES_PORT_443_TCP_ADDR=10.96.0.1
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
KUBERNETES_PORT_443_TCP_PORT=443
KUBERNETES_PORT_443_TCP_PROTO=tcp
SPECIAL_LEVEL_KEY=very
KUBERNETES_SERVICE_PORT_HTTPS=443
KUBERNETES_PORT_443_TCP=tcp://10.96.0.1:443
KUBERNETES_SERVICE_HOST=10.96.0.1
PWD=/
```

### 命令行参数

```yaml cm-cmd-test.yaml
apiVersion: v1
kind: Pod
metadata:
  name: cm-cmd-test
spec:
  containers:
    - name: test-container
      image: busybox
      command:
        - /bin/sh
        - '-c'
        - echo $(SPECIAL_LEVEL_KEY)
      env:
        - name: SPECIAL_LEVEL_KEY
          valueFrom:
            configMapKeyRef:
              name: special-config
              key: special.how
  restartPolicy: Never
```

```
$ kubectl apply -f cm-cmd-test.yaml
pod/cm-cmd-test created

$ kubectl get pods
NAME          READY   STATUS      RESTARTS   AGE
cm-cmd-test   0/1     Completed   0          6s

$ kubectl logs cm-cmd-test
very
```

### 挂载 Volume

```yaml cm-volume-test.yaml
apiVersion: v1
kind: Pod
metadata:
  name: cm-volume-test
spec:
  containers:
    - name: test-container
      image: busybox
      command:
        - /bin/sh
        - '-c'
        - ls /etc/config
      volumeMounts:
        - name: config-volume
          mountPath: /etc/config
  volumes:
    - name: config-volume
      configMap:
        name: special-config
  restartPolicy: Never
```

ConfigMap中指定的内容以**文件的形式**挂载到容器中

```
$ kubectl apply -f cm-volume-test.yaml
pod/cm-volume-test created

$ kubectl get pods
NAME             READY   STATUS      RESTARTS   AGE
cm-volume-test   0/1     Completed   0          6s

$  kubectl logs cm-volume-test
special.how
special.type
```

## 注意事项

1. ConfigMap 文件大小的限制：**1MB**（Etcd）
2. Pod 只能引用**相同 Namespce** 中的 ConfigMap
3. Pod 引用的 ConfigMap 不存在时，Pod 无法创建成功
4. 使用 valueFrom 从 ConfigMap 来配置环境变量时
   - ConfigMap 中某些 Key 被认为无效，该环境变量不会被注入容器，但 Pod 可以正常创建
5. 只有通过 Kubernetes API 创建的 Pod 才能使用 ConfigMap

# Secret

## 用途

1. 在集群中，用于存储**密码**、**Token** 等敏感信息
2. 敏感数据采用 **Base64** 编码（编码 != 加密）
3. 类型
   - Opaque：普通的 **Secret** 文件
   - service-account-token：用于 **Service Account 身份认证**的 Secret
   - dockerconfigjson：用于**拉取私有仓库镜像**的 Secret
   - bootstrap.token：用于**节点接入集群**校验用的 Secret

## 创建

Secret 可以**用户自己创建**，或者**系统自动创建**

```
$ kubectl create secret generic my-secret --from-literal=username=zhongmingmao --from-literal=password=123
secret/my-secret created

$ kubectl get secrets
NAME                  TYPE                                  DATA   AGE
default-token-c9smw   kubernetes.io/service-account-token   3      16h
my-secret             Opaque                                2      12s

$ kubectl get secrets my-secret -o yaml
apiVersion: v1
data:
  password: MTIz
  username: emhvbmdtaW5nbWFv
kind: Secret
metadata:
  creationTimestamp: "2021-07-12T08:27:51Z"
  name: my-secret
  namespace: default
  resourceVersion: "17716"
  selfLink: /api/v1/namespaces/default/secrets/my-secret
  uid: b99400ef-5375-4ca2-9e73-183afb7e732b
type: Opaque
```

## 使用

Secret 主要被 **Pod** 使用，一般是通过**挂载 Volume** 的方式

### 用户定义 Secret

```yaml my-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  containers:
    - name: my-pod
      image: busybox
      command:
        - /bin/sh
        - '-c'
        - ls /etc/secret/ && cat /etc/secret/*
      volumeMounts:
        - name: secret-volume
          mountPath: /etc/secret
          readOnly: true
  volumes:
    - name: secret-volume
      secret:
        secretName: my-secret
  restartPolicy: Never
```

```
$ kubectl apply -f my-pod.yaml
pod/my-pod created

$ kubectl get pods
NAME     READY   STATUS      RESTARTS   AGE
my-pod   0/1     Completed   0          31s

$ kubectl logs my-pod
password
username
123zhongmingmao
```

### 系统定义 Secret

```
$ kubectl get secrets
NAME                  TYPE                                  DATA   AGE
default-token-c9smw   kubernetes.io/service-account-token   3      16h
my-secret             Opaque                                2      25m

$ kubectl describe secrets default-token-c9smw
Name:         default-token-c9smw
Namespace:    default
Labels:       <none>
Annotations:  kubernetes.io/service-account.name: default
              kubernetes.io/service-account.uid: 17de15bb-32c1-48be-9daf-0277d1a1fc05

Type:  kubernetes.io/service-account-token

Data
====
ca.crt:     1111 bytes
namespace:  7 bytes
token:      eyJhbGciOiJSUzI1NiIsImtpZCI6IiJ9.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJkZWZhdWx0Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZWNyZXQubmFtZSI6ImRlZmF1bHQtdG9rZW4tYzlzbXciLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC5uYW1lIjoiZGVmYXVsdCIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VydmljZS1hY2NvdW50LnVpZCI6IjE3ZGUxNWJiLTMyYzEtNDhiZS05ZGFmLTAyNzdkMWExZmMwNSIsInN1YiI6InN5c3RlbTpzZXJ2aWNlYWNjb3VudDpkZWZhdWx0OmRlZmF1bHQifQ.fw6HUYI6GAjd7P_uuSQZxa3cAOsxoAtdjExMOM_OWtXZu7sFqDd2jUsEJdY41eFhA19Zl9ASlsby_pE-3brVV-TceMknZhriF1XgWDVLozyJSoOO_ias04ed8XFNYB5MsxpcyKEmkgeOAXlJwSE73sPF-YNUKvMfhK55qDMzIylDD0KIH2LGaIpuH5TdbcHwDlMZmUCe0JtSUlYurltcb5ZJSZ-36Vuquy9oc_5xivdpi8505uXRb7Y00ieBiYgQ0O18aIOM8w-WV7ppS83vjo5GciOsGSssEzvix9Fh2W5BOZGXsq1I1zoHxtUefJ3B8aUq9wTRmy1BLRIKVYPTwg

$ kubectl get serviceaccounts
NAME      SECRETS   AGE
default   1         16h

$ kubectl get serviceaccounts default -o yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  creationTimestamp: "2021-07-11T16:02:40Z"
  name: default
  namespace: default
  resourceVersion: "359"
  selfLink: /api/v1/namespaces/default/serviceaccounts/default
  uid: 17de15bb-32c1-48be-9daf-0277d1a1fc05
secrets:
- name: default-token-c9smw
```

```yaml my-pod-for-service-account-token.yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-pod-for-service-account-token
spec:
  containers:
    - name: my-pod-for-service-account-token
      image: busybox
      command:
        - /bin/sh
        - '-c'
        - ls /etc/secret/
      volumeMounts:
        - name: default-token-c9smw
          mountPath: /etc/secret
          readOnly: true
  volumes:
    - name: default-token-c9smw
      secret:
        secretName: default-token-c9smw
  restartPolicy: Never
```

```
$ kubectl apply -f my-pod-for-service-account-token.yaml
pod/my-pod-for-service-account-token created

$ kubectl logs my-pod-for-service-account-token
ca.crt
namespace
token
```

## 注意事项

1. Secret 文件大小限制：**1MB**
2. Secret 采用 **Base64** 编码（编码 != 加密，可选方案：Kubernetes + Vault）
3. 由于 List/Watch 会获取 Namespace 下所有的 Secret，建议使用 **Get**

# ServiceAccount

## 用途

1. 用于解决 Pod 在集群中的**身份认证**问题
2. 认证使用的授权信息，通过Secret（kubernetes.io/service-account-token）进行管理

## 实践

1. ServiceAccount.secrets：指定 ServiceAccount 使用哪个 Secret，由 Kubernetes **自动添加**
2. ca.crt：用于**校验服务端**的证书信息
3. token：用于 **Pod 的身份认证**
4. service-account.uid：Secret 关联的 ServiceAccount

```
$ kubectl get serviceaccounts
NAME      SECRETS   AGE
default   1         16h

$ kubectl get serviceaccounts default -o yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  creationTimestamp: "2021-07-11T16:02:40Z"
  name: default
  namespace: default
  resourceVersion: "359"
  selfLink: /api/v1/namespaces/default/serviceaccounts/default
  uid: 17de15bb-32c1-48be-9daf-0277d1a1fc05
secrets:
- name: default-token-c9smw

$ kubectl get secrets default-token-c9smw -o yaml
apiVersion: v1
data:
  ca.crt: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCakNDQWU2Z0F3SUJBZ0lCQVRBTkJna3Foa2lHOXcwQkFRc0ZBREFWTVJNd0VRWURWUVFERXdwdGFXNXAKYTNWaVpVTkJNQjRYRFRJeE1EY3dOakUwTWpnd05Wb1hEVE14TURjd05URTBNamd3TlZvd0ZURVRNQkVHQTFVRQpBeE1LYldsdWFXdDFZbVZEUVRDQ0FTSXdEUVlKS29aSWh2Y05BUUVCQlFBRGdnRVBBRENDQVFvQ2dnRUJBUHpDCjR1eWpiV3FLa2UyaDVuQVZlYlV0cjFLT2Frd1ZPamRDS3NUeFlwemduYWpXT3JNaVhOdkZWakVzT2pDa0pLeHMKSGkveHlicURvMEFaK0NZTW9LTFN2Nkk1amF0NnlPUTU1OW9MUEpKcVlobThySUtnVndVK1d0WHNSM0lMeU13Vgp4bDdjaVFqMFRIV01NSGNLS3lLZlI0SDltTzdsY2hNS3FkRUhNelBUOExZUkllTlpuaTN1RHYvSlVrVmdtSnlSClNRYllhUFdodWNkbkpVWW53UVR6d1Rtamd0ZEtQd2JkV05hOXFkY2t1blEzV0NJeHRPMHhuM3Jld3RLMkNqekwKaXc0dWhLWmg3TWJCSGhXNzJDdU1MbEkwYlVEaHRLd1pHdTRUN0ttWDc1L0hVVmNnUUM4dWp4WnBpa0JYdXJBRwpUNGw4a0VGVXpjQlJzYkZaajdjQ0F3RUFBYU5oTUY4d0RnWURWUjBQQVFIL0JBUURBZ0trTUIwR0ExVWRKUVFXCk1CUUdDQ3NHQVFVRkJ3TUNCZ2dyQmdFRkJRY0RBVEFQQmdOVkhSTUJBZjhFQlRBREFRSC9NQjBHQTFVZERnUVcKQkJSQm9RdytFVWNxc3l6VXFVbXRvZENpTnBHOUFEQU5CZ2txaGtpRzl3MEJBUXNGQUFPQ0FRRUFqR2E5R2xDQwpWRVFpc2lpajdicHY1VmxCb2Z2QW00U0lTNXlPOFVlTENJTDN2MVg4cHdKWDN6S1hNY2hYSTNiMTlrOExHdStiCjUwWWR3cEhjNUg5VmplTkhWcTVOdGZRZzlNcE5zclB6OC9Cb1BOV08wRE1yTXhUN1JmVXBQMDViZWFjOVZZRDAKTzA3TnowRDRWK0t1cUdXaXdjam53Qld6b0I1cmE5VS9Cb2g4L1FHdEplb3BxdjJWb1pQYmlXM3RBTGdwb0hKawpoL1NrYXo2OU9ERS9iZmRNeWlTc0xYUDZpSlZoOFdTdHlxelZXMFhWVlVBRjdGR2p0ek11SlZZQ2t0RVhxNURPCkIra3Y0N0V1VmFHZHpnQ2VPRG5xNkF3WFlMUTYwQ2J4NjBDRW9EeE40TmRTWjRuYmpxV0xWL1d0cG9sc2ZlQ0EKWXNLRFJmWWd1TDhnd1E9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
  namespace: ZGVmYXVsdA==
  token: ZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNklpSjkuZXlKcGMzTWlPaUpyZFdKbGNtNWxkR1Z6TDNObGNuWnBZMlZoWTJOdmRXNTBJaXdpYTNWaVpYSnVaWFJsY3k1cGJ5OXpaWEoyYVdObFlXTmpiM1Z1ZEM5dVlXMWxjM0JoWTJVaU9pSmtaV1poZFd4MElpd2lhM1ZpWlhKdVpYUmxjeTVwYnk5elpYSjJhV05sWVdOamIzVnVkQzl6WldOeVpYUXVibUZ0WlNJNkltUmxabUYxYkhRdGRHOXJaVzR0WXpsemJYY2lMQ0pyZFdKbGNtNWxkR1Z6TG1sdkwzTmxjblpwWTJWaFkyTnZkVzUwTDNObGNuWnBZMlV0WVdOamIzVnVkQzV1WVcxbElqb2laR1ZtWVhWc2RDSXNJbXQxWW1WeWJtVjBaWE11YVc4dmMyVnlkbWxqWldGalkyOTFiblF2YzJWeWRtbGpaUzFoWTJOdmRXNTBMblZwWkNJNklqRTNaR1V4TldKaUxUTXlZekV0TkRoaVpTMDVaR0ZtTFRBeU56ZGtNV0V4Wm1Nd05TSXNJbk4xWWlJNkluTjVjM1JsYlRwelpYSjJhV05sWVdOamIzVnVkRHBrWldaaGRXeDBPbVJsWm1GMWJIUWlmUS5mdzZIVVlJNkdBamQ3UF91dVNRWnhhM2NBT3N4b0F0ZGpFeE1PTV9PV3RYWnU3c0ZxRGQyalVzRUpkWTQxZUZoQTE5Wmw5QVNsc2J5X3BFLTNiclZWLVRjZU1rblpocmlGMVhnV0RWTG96eUpTb09PX2lhczA0ZWQ4WEZOWUI1TXN4cGN5S0Vta2dlT0FYbEp3U0U3M3NQRi1ZTlVLdk1maEs1NXFETXpJeWxERDBLSUgyTEdhSXB1SDVUZGJjSHdEbE1abVVDZTBKdFNVbFl1cmx0Y2I1WkpTWi0zNlZ1cXV5OW9jXzV4aXZkcGk4NTA1dVhSYjdZMDBpZUJpWWdRME8xOGFJT004dy1XVjdwcFM4M3ZqbzVHY2lPc0dTc3NFenZpeDlGaDJXNUJPWkdYc3ExSTF6b0h4dFVlZkozQjhhVXE5d1RSbXkxQkxSSUtWWVBUd2c=
kind: Secret
metadata:
  annotations:
    kubernetes.io/service-account.name: default
    kubernetes.io/service-account.uid: 17de15bb-32c1-48be-9daf-0277d1a1fc05
  creationTimestamp: "2021-07-11T16:02:40Z"
  name: default-token-c9smw
  namespace: default
  resourceVersion: "355"
  selfLink: /api/v1/namespaces/default/secrets/default-token-c9smw
  uid: a467ae46-fa55-405e-b836-e383f98e103b
type: kubernetes.io/service-account-token
```

## Pod 访问 Kubernetes 集群

1. Pod 创建时 Admission Controller 会根据**指定的 ServiceAccount**（默认是 **default**） 把**对应的 Secret** 挂载到容器中的**固定目录**（**/var/run/secrets/kubernetes.io/serviceaccount**）
2. 当 Pod 访问集群时，默认利用 Secret 中的 **token** 来认证 Pod 身份（ca.art 用于校验服务端）
3. Pod 通过身份认证后，其权限需要通过 **RBAC** 来配置，默认是 **GET** 权限

# Resource

## spec.containers[].resources

1. 内部支持的资源类型（配置时，指定的数量必须是**整数**）
   - CPU：单位 **millicore**（1 core = **1000** millicore）
   - 内存：单位 **Byte**
   - 临时存储：单位 **Byte**
2. requests：申明**需要**的资源
3. limits： 申明需要资源的**边界**

## Qos

1. 分类
   - Guaranteed
     - Pod 里的**每个容器**都必须有**内存和 CPU 的 requests 和 limits**，且**必须一样**
   - Burstable（可爆）
     - Pod 里**至少有一个容器**有**内存或 CPU 的 requests**
   - BestEffort
     - **!Guaranteed && !BestEffort**
2. 当节点上资源不足时，驱逐 Pod 的优先级顺序：**BestEffort、Burstable、Guaranteed**

# SecurityContext

1. 主要用于**限制容器行为**，从而保障系统和其他容器的安全
   - 不是 Kubernetes 或者 Container Runtime 本身的能力，而是依赖于**内核机制**
2. 级别
   - **容器级别**的SecurityContext：仅对指定容器生效
   - **Pod 级别**的SecurityContext：对指定 Pod 中的所有容器生效
   - **Pod Security Policies**：对集群内所有 Pod 生效

# InitContainer

1. InitContainer vs 普通 Container
   - InitContainer 会先于普通 Container 启动执行，直到所有 InitContainer 执行成功后，普通 Container 才会被启动
   - Pod 中多个 InitContainer 之间按**顺序**启动，而 Pod 中多个普通 Container 是**并行**启动
   - InitContainer 执行成功后就结束退出，而普通 Container 会一直执行或者重启（restartPolicy != Never）
2. 用途
   - 一般用于普通 Container启动前的**初始化**或者**前置条件检验**

# 参考资料

1. [CNCF × Alibaba 云原生技术公开课](https://edu.aliyun.com/course/1651)