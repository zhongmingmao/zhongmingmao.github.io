---
title: Kubernetes - Security
mathjax: false
date: 2023-02-02 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/k8s-security.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
  - Service Mesh
  - Istio
---

# 层次模型

![image-20240116201612517](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20240116201612517.png)

<!-- more -->

## 开发

![image-20240116202120491](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20240116202120491.png)

## 分发

![image-20240116203416596](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20240116203416596.png)

## 部署

![image-20240116203705633](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20240116203705633.png)

## 运行时

![image-20240116204045301](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20240116204045301.png)

# 容器运行时

## Non-root

> 在 Dockerfile 中通过 `USER` 命令切换成非 root 用户

1. 防止某些镜像窃取`宿主`的 root 权限并造成危害
2. 在某些`容器运行时`，容器内部的 root 用户与宿主上的 root 用户是`同一个`用户
   - 宿主上的重要文件被 mount 到容器内，并被容器修改配置
3. 即使在容器内部也应该`权限隔离`

```dockerfile
FROM ubuntu
RUN user add A
USER A
```

## User namespace

1. 依赖 User namespace，任何容器内部的用户都会`映射`为宿主上的非 root 用户
2. `默认关闭`，因为会引入`配置复杂性`
   - 系统不知道宿主用户与容器用户的映射关系，在 mount 文件时无法设置适当的权限

## Rootless container

1. 容器运行时以非 root 身份启动
2. 即使容器被攻破，在`宿主`层面获得的用户权限也是非 root 用户
3. Docker 和其它容器运行时本身的后台 Daemon 需要以 root 身份运行，其它的`用户容器`才能以 `rootless` 身份运行
4. 某些运行时，如 Podman，没有 Daemon 进程，也就完全不需要 root 身份

# Kubernetes

## 通信安全

> Kubernetes 期望集群中所有的 API 通信在默认情况下都使用 `TLS` 加密
> 大多数安装方法，允许`创建`所需证书并`分发`到集群组件中

![image-20240117213743737](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20240117213743737.png)

## 控制面

> 认证

1. 小型的单用户集群使用简单的证书或者静态承载令牌方法
2. 更大的集群整合现有的 OIDC、LADP 等允许用户分组的服务器
3. 所有 API 客户端（节点、代理、调度器、卷插件）都必须经过身份认证
   - 通常使用`服务账号`或者 `X509 客户端证书`，并在集群启动时自动创建或者作为集群安装的一部分进行设置

> 授权

1. 将团队划分成有更多角色限制的单独命名空间

> 配额

1. 资源配额限制了授予命名空间的资源的数量或容量
2. 常用于限制命名空间可以分配的 CPU、内存、持久磁盘数、Pod 数、Service 数、Volume 数

## NodeRestriction

> 降低获得 kubeconfig 的人能造成的破坏

1. 准入控制器限制了 kubelet 可以修改的 Node 和 Pod 对象
   - kubelet 只可以修改自己的 Node API 对象，只能修改绑定到 Node 本身的 Pod 对象
2. NodeRestriction 准入插件可防止 kubelet 删除 Node API 对象
3. 防止 kubelet 添加/删除/更新带有 `node-restriction.kubernetes.io/` 前缀的标签
4. 未来的版本可能会增加其它限制，以确保 kubelet 具有正常运行所需的`最小权限集`

## 存储加密

> 存储到 etcd 之前，先加密

```yaml
kind: EncryptionConfiguration
apiVersion: apiserver.config.k8s.io/v1
resources:
- resources:
  - events
  providers:
  - identity: {}  # do not encrypt events even though *.* is specified below
- resources:
  - secrets
  - configmaps
  - pandas.awesome.bears.example
  providers:
  - aescbc:
      keys:
      - name: key1
        secret: c2VjcmV0IGlzIHNlY3VyZQ==
- resources:
  - '*.apps'
  providers:
  - aescbc:
      keys:
      - name: key2
        secret: c2VjcmV0IGlzIHNlY3VyZSwgb3IgaXMgaXQ/Cg==
- resources:
  - '*.*'
  providers:
  - aescbc:
      keys:
      - name: key3
        secret: c2VjcmV0IGlzIHNlY3VyZSwgSSB0aGluaw==
```

## Security Context

1. Pod 定义包含了一个安全上下文
   - 允许它请求访问某个节点上的特定 Linux 用户
   - 获得特权或者访问宿主网络
   - 允许它在宿主节点上不受约束地运行其它控件
2. `Pod 安全策略`：限制哪些用户或者服务账号可以提供危险的安全上下文设置
   - 如：限制卷挂载，尤其是 hostpath
3. 大多数应用程序需要限制对`宿主资源`的访问；编写`应用程序`时，应该使用`非 root 用户`运行

> Kubernetes Security Context

| Type                               | Desc                                 |
| ---------------------------------- | ------------------------------------ |
| `Container`-level Security Context | 仅应用到指定的`容器`                 |
| `Pod`-level Security Context       | 应用到 `Pod` 内所有容器以及 Volume   |
| Pod Security `Policies` - PSP      | 应用到`集群`内部所有 Pod 以及 Volume |

### Container-level Security Context

> 仅应用到指定的容器上，并且不会影响到 Volume，如设置容器运行在特权模式

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hello-world
spec:
  containers:
    - name: hello-world-container
      # The container definition
      # ...
      securityContext:
        privileged: true
```

#### Calico

```
$ k get ds -n calico-system
NAME              DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR            AGE
calico-node       1         1         1       1            1           kubernetes.io/os=linux   32d
csi-node-driver   1         1         1       1            1           kubernetes.io/os=linux   32d

$ k get po -n calico-system
NAME                                       READY   STATUS    RESTARTS   AGE
calico-kube-controllers-85dbc7f4dc-czkgv   1/1     Running   0          7h57m
calico-node-nmrtf                          1/1     Running   0          4m58s
calico-typha-fb8bcfcf5-zqm82               1/1     Running   0          7h57m
csi-node-driver-9vbph                      2/2     Running   0          7h57m
```

> k get po -n calico-system calico-node-nmrtf -oyaml

```yaml
...
  containers:
  ...
    image: docker.io/calico/node:v3.26.4
    securityContext:
      allowPrivilegeEscalation: true
      capabilities:
        drop:
        - ALL
      privileged: true
      runAsGroup: 0
      runAsNonRoot: false
      runAsUser: 0
      seccompProfile:
        type: RuntimeDefault
...
  hostNetwork: true
...
  initContainers:
  	...
  - image: docker.io/calico/pod2daemon-flexvol:v3.26.4
    securityContext:
      allowPrivilegeEscalation: true
      capabilities:
        drop:
        - ALL
      privileged: true
      runAsGroup: 0
      runAsNonRoot: false
      runAsUser: 0
      seccompProfile:
        type: RuntimeDefault
...
```

#### Istio

```
$ k get po -n simple
NAME                      READY   STATUS    RESTARTS   AGE
simple-665cbb55bf-ptlct   2/2     Running   0          38s
```

> k get po -n simple simple-665cbb55bf-ptlct -oyaml

```yaml
...
  containers:
    image: docker.io/istio/proxyv2:1.19.3 
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
      privileged: false
      readOnlyRootFilesystem: true
      runAsGroup: 1337
      runAsNonRoot: true
      runAsUser: 1337
...
  initContainers:
    image: docker.io/istio/proxyv2:1.19.3
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        add:
        - NET_ADMIN
        - NET_RAW
        drop:
        - ALL
      privileged: false
      readOnlyRootFilesystem: false
      runAsGroup: 0
      runAsNonRoot: false
      runAsUser: 0
...
```

### Pod-level Security Context

> 应用到 Pod 内的所有容器，并且还会影响到 Volume（包括 fsGroup 和 selinuxOptions）

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hello-world
spec:
  containers:
  # specification of the pod's containers
  # ...
  securityContext:
    fsGroup: 1234 # mount 文件对应的 uid
    supplementalGroups: [5678]
    seLinuxOptions:
      level: "s0:c123,c456"
```

### Pod Security Policies

> 集群级的 Pod 安全策略，自动为集群内的 Pod 和 Volume 设置 Security Context

| Policy                          | Desc                             |
| ------------------------------- | -------------------------------- |
| privileged                      | 运行特权容器                     |
| defaultAddCapabilities          | 可添加到容器的 Capabilities      |
| requiredDropCapabilities        | 会从容器中删除的 Capabilities    |
| allowedCapabilities             | 允许使用的 Capabilities 列表     |
| volumes                         | 控制容器可以使用哪些 volume      |
| hostNetwork                     | 允许使用 host 网络               |
| hostPorts                       | 允许使用的 host 端口列表         |
| hostPID                         | 使用 host PID namespace          |
| hostIPC                         | 使用 host IPC namespace          |
| seLinux                         | SELinux Context                  |
| runAsUser                       | User ID                          |
| supplementalGroups              | 允许的补充用户组                 |
| fsGroup                         | Volume FSGroup                   |
| readOnlyRootFilesystem          | 只读根文件系统                   |
| allowedHostPaths                | 允许 hostPath 插件使用的路径列表 |
| allowedFlexVolumes              | 允许使用的 FlexVolume 插件列表   |
| allowPrivilegeEscalation        | 允许容器进程设置 `no_new_privs`  |
| defaultAllowPrivilegeEscalation | 默认是否允许特权升级             |

```yaml
apiVersion: extensions/v1beta1
kind: PodSecurityPolicy
metadata:
  name: permissive
spec:
  seLinux:
    rule: RunAsAny
  supplementalGroups:
    rule: RunAsAny
  runAsUser:
    rule: RunAsAny
  fsGroup:
    rule: RunAsAny
  hostPorts:
  - min: 8000
    max: 8080
  volumes:
  - '*'
```

> 配置 PSP，让 kubelet 可以继续创建 Mirror Pod

```yaml privileged.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: privileged
  annotations:
    seccomp.security.alpha.kubernetes.io/allowedProfileNames: '*'
spec:
  privileged: true
  allowPrivilegeEscalation: true
  allowedCapabilities:
    - '*'
  volumes:
    - '*'
  hostNetwork: true
  hostPorts:
    - min: 0
      max: 65535
  hostIPC: true
  hostPID: true
  runAsUser:
    rule: 'RunAsAny'
  seLinux:
    rule: 'RunAsAny'
  supplementalGroups:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

```yaml privileged-binding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: privileged-psp
rules:
  - apiGroups:
      - policy
    resourceNames:
      - privileged
    resources:
      - podsecuritypolicies
    verbs:
      - use
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: kube-system-psp
  namespace: kube-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: privileged-psp
subjects:
  - apiGroup: rbac.authorization.k8s.io
    kind: Group
    name: system:nodes
    namespace: kube-system
  - apiGroup: rbac.authorization.k8s.io
    kind: Group
    name: system:serviceaccounts:kube-system
```

```yaml restricted.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted
  annotations:
    seccomp.security.alpha.kubernetes.io/allowedProfileNames: 'docker/default,runtime/default'
    apparmor.security.beta.kubernetes.io/allowedProfileNames: 'runtime/default'
    apparmor.security.beta.kubernetes.io/defaultProfileName:  'runtime/default'
spec:
  privileged: false
  # Required to prevent escalations to root.
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  # Allow core volume types.
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    # Assume that ephemeral CSI drivers & persistentVolumes set up by the cluster admin are safe to use.
    - 'csi'
    - 'persistentVolumeClaim'
    - 'ephemeral'
  hostNetwork: false
  hostIPC: false
  hostPID: false
  runAsUser:
    # Require the container to run without root privileges.
    rule: 'MustRunAsNonRoot'
  seLinux:
    # This policy assumes the nodes are using AppArmor rather than SELinux.
    rule: 'RunAsAny'
  supplementalGroups:
    rule: 'MustRunAs'
    ranges:
      # Forbid adding the root group.
      - min: 1
        max: 65535
  fsGroup:
    rule: 'MustRunAs'
    ranges:
      # Forbid adding the root group.
      - min: 1
        max: 65535
  readOnlyRootFilesystem: false
```

```
$ k apply -f privileged.yaml -f privileged-binding.yaml -f restricted.yaml
Warning: policy/v1beta1 PodSecurityPolicy is deprecated in v1.21+, unavailable in v1.25+
podsecuritypolicy.policy/privileged created
clusterrole.rbac.authorization.k8s.io/privileged-psp created
rolebinding.rbac.authorization.k8s.io/kube-system-psp created
podsecuritypolicy.policy/restricted created
```

> 开启 PSP（准入控制，默认没有启用），/etc/kubernetes/manifests/kube-apiserver.yaml

```
--enable-admission-plugins=NodeRestriction,PodSecurityPolic
```

```
$ k get po -n kube-system kube-apiserver-xxxxxx
NAME                    READY   STATUS    RESTARTS      AGE
kube-apiserver-xxxxxx   1/1     Running   1 (34s ago)   25s
```

> 准备

```
$ k create namespace psp-example
namespace/psp-example created

$ k create serviceaccount -n psp-example fake-user
serviceaccount/fake-user created

$ k create rolebinding -n psp-example fake-editor --clusterrole=edit --serviceaccount=psp-example:fake-user
rolebinding.rbac.authorization.k8s.io/fake-editor created

$ alias kubectl-admin='kubectl -n psp-example'
$ alias kubectl-user='kubectl --as=system:serviceaccount:psp-example:fake-user -n psp-example'
```

```yaml example-psp.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: example
spec:
  privileged: false  # Don't allow privileged pods!
  # The rest fills in some required fields.
  seLinux:
    rule: RunAsAny
  supplementalGroups:
    rule: RunAsAny
  runAsUser:
    rule: RunAsAny
  fsGroup:
    rule: RunAsAny
  volumes:
    - '*'
```

> 普通用户无法创建

```
$ kubectl-admin apply -f example-psp.yaml
Warning: policy/v1beta1 PodSecurityPolicy is deprecated in v1.21+, unavailable in v1.25+
podsecuritypolicy.policy/example created

$ k get podsecuritypolicies.policy
Warning: policy/v1beta1 PodSecurityPolicy is deprecated in v1.21+, unavailable in v1.25+
NAME                      PRIV    CAPS   SELINUX    RUNASUSER          FSGROUP     SUPGROUP    READONLYROOTFS   VOLUMES
calico-apiserver          false          RunAsAny   RunAsAny           MustRunAs   MustRunAs   false            configMap,downwardAPI,emptyDir,persistentVolumeClaim,projected,secret,hostPath
calico-kube-controllers   false          RunAsAny   MustRunAsNonRoot   MustRunAs   MustRunAs   false            configMap,downwardAPI,emptyDir,persistentVolumeClaim,projected,secret
calico-node               true           RunAsAny   RunAsAny           MustRunAs   MustRunAs   false            configMap,downwardAPI,emptyDir,persistentVolumeClaim,projected,secret,hostPath
calico-typha              false          RunAsAny   MustRunAsNonRoot   MustRunAs   MustRunAs   false            configMap,downwardAPI,emptyDir,persistentVolumeClaim,projected,secret
csi-node-driver           true           RunAsAny   RunAsAny           MustRunAs   MustRunAs   false            configMap,downwardAPI,emptyDir,persistentVolumeClaim,projected,secret,hostPath
example                   false          RunAsAny   RunAsAny           RunAsAny    RunAsAny    false            *
privileged                true    *      RunAsAny   RunAsAny           RunAsAny    RunAsAny    false            *
restricted                false          RunAsAny   MustRunAsNonRoot   MustRunAs   MustRunAs   false            configMap,emptyDir,projected,secret,downwardAPI,csi,persistentVolumeClaim,ephemeral

$ kubectl-user create -f- <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: pause
spec:
  containers:
    - name: pause
      image: k8s.gcr.io/pause
EOF
Error from server (Forbidden): error when creating "STDIN": pods "pause" is forbidden: PodSecurityPolicy: unable to admit pod: []

$ kubectl-user auth can-i use podsecuritypolicy/example
Warning: resource 'podsecuritypolicies' is not namespace scoped in group 'policy'
no
```

> 给普通用户授权

```
$ kubectl-admin create role psp:unprivileged \
    --verb=use \
    --resource=podsecuritypolicy \
    --resource-name=example
role.rbac.authorization.k8s.io/psp:unprivileged created

$ kubectl-admin create rolebinding fake-user:psp:unprivileged \
    --role=psp:unprivileged \
    --serviceaccount=psp-example:fake-user
rolebinding.rbac.authorization.k8s.io/fake-user:psp:unprivileged created

$ kubectl-user auth can-i use podsecuritypolicy/example
Warning: resource 'podsecuritypolicies' is not namespace scoped in group 'policy'
yes

$ kubectl-user create -f- <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: pause
spec:
  containers:
    - name: pause
      image: k8s.gcr.io/pause
EOF
pod/pause created

$ kubectl-user get po
NAME    READY   STATUS              RESTARTS   AGE
pause   0/1     ContainerCreating   0          7m46s
```

## Taint

1. 以`租户`为粒度，为不同租户的节点增加 Taint，使得节点彼此隔离
2. 主要作用：租户`独占`节点

## NetworkPolicy

> 只能限制 `Workload` 之间的流量，无法限制宿主上的流量

1. 在 OSI 第 3/4 层控制网络流量，可以为集群中的特定应用使用 NetworkPolicy
2. Pod 可以通信的 Pod 是通过 3 个标识符的组合来辩识的
   - 其它被允许的 Pods
   - 被允许的 Namespace
   - IP CIDR

> NetworkPolicy 是通过 `CNI` 来实现的，通过控制器使得 NetworkPolicy 生效

### 标准

#### 隔离

1. 默认情况下，Pod 是非隔离的，接受任何来源的流量
2. Pod 在被某 NetworkPolicy 选中时进入被隔离状态
3. 一旦 Namespace 中的 NetworkPolicy 选中了特定的 Pod
   - 该 Pod 会拒绝该 NetworkPolicy 所不允许的连接
4. NetworkPolicy 不会发生冲突，它们是`积累`的
   - 如果一个或者多个 NetworkPolicy 选中了同一个 Pod，则受限于这些 NetworkPolicy 的`并集`
5. 允许两个 Pod 之间的网络数据流
   - 源站 Pod 的 Egress 和入站 Pod 的 Ingress 都需要允许该流量

#### 属性

1. spec
   - 包含一个 `Namespace` 中定义 NetworkPolicy 所需的所有信息
2. podSelector
   - 对一组 Pod 进行选择，空的 podSelector 将选择 Namespace 下所有的 Pod
3. policyTypes
   - 每个 NetworkPolicy 都包含一个 policyTypes 列表，其中包含 Ingress / Egress
   - 如果 NetworkPolicy 未指定 policyTypes，则默认情况下始终设置为 Ingress
   - 如果 NetworkPolicy 有任何出口规则，则设置为 Egress
4. Ingress
   - 每个 NetworkPolicy 可包含一个 Ingress 规则的白名单列表
   - 每个规则都允许同时匹配 `from` 和 `ports` 部分的流量
5. Egress
   - 每个 NetworkPolicy 可包含一个 Egress 规则的白名单列表
   - 每个规则都允许同时匹配 `to` 和 `ports` 部分的流量

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: test-network-policy
  namespace: default
spec:
  podSelector:
    matchLabels:
      role: db # 隔离 default 命名空间下 role=db 的 Pod
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from: 
    - ipBlock:
        cidr: 172.17.0.0/16
        except:
        - 172.17.1.0/24
    - namespaceSelector:
        matchLabels:
          project: myproject # 带有 project=myproject 的所有命名空间中的 Pod
    - podSelector:
        matchLabels:
          role: frontend # 当前 default 命名空间下带有 role=frontend 的所有 Pod
    ports:
    - protocol: TCP
      port: 6379
  egress:
  - to:
    - ipBlock:
        cidr: 10.0.0.0/24
    ports:
    - protocol: TCP
      port: 5978
```

> 默认拒绝所有入站流量

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
spec:
  podSelector: {}
  policyTypes:
  - Ingress
```

> 默认允许所有入站流量

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-all-ingress
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - {}
```

> 默认允许所有出站流量

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-all-egress
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - {}
```

> 默认拒绝所有入站和出站流量

```
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

#### 示例

> 创建服务端

```yaml serverpod.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: calico-demo
---
apiVersion: apps/v1
kind: Deployment
metadata:
  namespace: calico-demo
  name: calico-demo
  labels:
    app: calico-demo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: calico-demo
  template:
    metadata:
      labels:
        app: calico-demo
        access: "true"
    spec:
      containers:
        - name: calico-demo
          image: nginx:1.25.3
          ports:
            - containerPort: 80
```

```
$ k apply -f serverpod.yaml
namespace/calico-demo created
deployment.apps/calico-demo created

$ k get pod -n calico-demo -owide
NAME                          READY   STATUS    RESTARTS   AGE     IP                NODE     NOMINATED NODE   READINESS GATES
calico-demo-dd6ddf6c6-kqd4w   1/1     Running   0          4m48s   192.168.216.213   xxxxxx   <none>           <none>

$ ping -c1 192.168.216.213
PING 192.168.216.213 (192.168.216.213) 56(84) bytes of data.
64 bytes from 192.168.216.213: icmp_seq=1 ttl=64 time=0.123 ms

--- 192.168.216.213 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 0.123/0.123/0.123/0.000 ms
```

> 创建客户端

```yaml toolbox.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
#  namespace: default
  name: toolbox
spec:
  replicas: 1
  selector:
    matchLabels:
      app: toolbox
  template:
    metadata:
      labels:
        app: toolbox
        access: "true"
    spec:
      containers:
        - name: toolbox
          image: centos
          command:
            - tail
            - -f
            - /dev/null
```

```
$ k apply -f toolbox.yaml
deployment.apps/toolbox created

$ k get pod
NAME                       READY   STATUS    RESTARTS   AGE
toolbox-68f79dd5f8-4tlbb   1/1     Running   0          89s

$ k exec -it toolbox-68f79dd5f8-4tlbb -- ping -c1 192.168.216.213
PING 192.168.216.213 (192.168.216.213) 56(84) bytes of data.
64 bytes from 192.168.216.213: icmp_seq=1 ttl=63 time=0.053 ms

--- 192.168.216.213 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 0.053/0.053/0.053/0.000 ms
```

> 创建 NetworkPolicy（默认 Ingress + 拒绝）

```yaml networkpolicy.yaml
kind: NetworkPolicy
apiVersion: networking.k8s.io/v1
metadata:
  name: default-deny
  namespace: calico-demo
spec:
  podSelector: {}
```

```
$ k apply -f networkpolicy.yaml
networkpolicy.networking.k8s.io/default-deny created

$ k exec -it toolbox-68f79dd5f8-4tlbb -- ping -c1 192.168.216.213
PING 192.168.216.213 (192.168.216.213) 56(84) bytes of data.

--- 192.168.216.213 ping statistics ---
1 packets transmitted, 0 received, 100% packet loss, time 0ms

command terminated with exit code 1
```

> 宿主上依然是通的，NetworkPolicy 只能用于隔离 Pod 之间的网络

```
$ ping -c1 192.168.216.213
PING 192.168.216.213 (192.168.216.213) 56(84) bytes of data.
64 bytes from 192.168.216.213: icmp_seq=1 ttl=64 time=0.127 ms

--- 192.168.216.213 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 0.127/0.127/0.127/0.000 ms
```

### Calico

> Calico NetworkPolicy 是 `Namespace` 级别的资源，规则应用于与`标签选择器`匹配的 `Endpoint` 集合

```yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
	name: allow-tcp-90
spec:
	selector:app == 'envoy'
endpoint
	types:
		- Ingress
		- Egress
```

```yaml
ingress: # 入口的流量规则
	- action: Allow # 流量的行为
		protocol: ICMP # 流量的协议
		notProtocol: TCP # 匹配流量协议不为值的流量
		source: # 流量的来源src与dst的匹配关系为与,所有的都生效即生效
			nets: # 有效的来源IP
			selector: # 标签选择器
			namespaceSelector: # 名称空间选择器
			ports: # 端口
				- 80 # 单独端口
				- 6040:6050 # 端口范围
			destination: # 流量的目标
egress: #出口的流量规则
	- action: Allow
serviceAccountSelector: # 使用与此规则的serviceAccount
```

```
$ k api-resources| grep networkpolicies
globalnetworkpolicies                                                             crd.projectcalico.org/v1               false        GlobalNetworkPolicy
networkpolicies                                                                   crd.projectcalico.org/v1               true         NetworkPolicy
networkpolicies                   netpol                                          networking.k8s.io/v1                   true         NetworkPolicy
globalnetworkpolicies             gnp,cgnp,calicoglobalnetworkpolicies            projectcalico.org/v3                   false        GlobalNetworkPolicy
networkpolicies                   cnp,caliconetworkpolicy,caliconetworkpolicies   projectcalico.org/v3                   true         NetworkPolicy
```

> GlobalNetworkPolicy 是整个集群级别的资源，在所有 Namespace 生效，并能限制`主机`（HostEndpoint）

```yaml allow-icmp-incluster.yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-ping-in-cluster
spec:
  selector: all()
  types:
    - Ingress
  ingress:
    - action: Allow
      protocol: ICMP
      source:
        selector: all()
      icmp:
        type: 8 # Ping request
    - action: Allow
      protocol: ICMPv6
      source:
        selector: all()
      icmp:
        type: 128 # Ping request
```

> ping ok，curl 超时

```
$ k apply -f  allow-icmp-incluster.yaml
globalnetworkpolicy.projectcalico.org/allow-ping-in-cluster created

$ k exec -it toolbox-68f79dd5f8-4tlbb -- ping -c1 192.168.216.213
PING 192.168.216.213 (192.168.216.213) 56(84) bytes of data.
64 bytes from 192.168.216.213: icmp_seq=1 ttl=63 time=0.054 ms

--- 192.168.216.213 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 0.054/0.054/0.054/0.000 ms

$ k exec -it toolbox-68f79dd5f8-4tlbb -- curl -v -m5 192.168.216.213
* Rebuilt URL to: 192.168.216.213/
*   Trying 192.168.216.213...
* TCP_NODELAY set
* Connection timed out after 5001 milliseconds
* Closing connection 0
curl: (28) Connection timed out after 5001 milliseconds
command terminated with exit code 28
```

> 新增 NetworkPolicy，允许 TCP 80

```yaml access-calico-demo.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-http
  namespace: calico-demo
spec:
  podSelector: {}
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: default
      ports:
        - protocol: TCP
          port: 80
```

```
$ k apply -f  access-calico-demo.yaml
networkpolicy.networking.k8s.io/allow-http created

$ k exec -it toolbox-68f79dd5f8-4tlbb -- curl -sI -m5 192.168.216.213
HTTP/1.1 200 OK
Server: nginx/1.25.3
Date: Fri, 19 Jan 2022 11:50:12 GMT
Content-Type: text/html
Content-Length: 615
Last-Modified: Tue, 22 Oct 2023 13:46:47 GMT
Connection: keep-alive
ETag: "6537cac7-267"
Accept-Ranges: bytes
```

> 原理

```
$ k get po -n calico-system
NAME                                       READY   STATUS    RESTARTS   AGE
calico-kube-controllers-85dbc7f4dc-czkgv   1/1     Running   0          33d
calico-node-bmxrw                          1/1     Running   0          125m
calico-typha-fb8bcfcf5-zqm82               1/1     Running   0          33d
csi-node-driver-9vbph                      2/2     Running   0          33d

$ k get ds -n calico-system
NAME              DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR            AGE
calico-node       1         1         1       1            1           kubernetes.io/os=linux   33d
csi-node-driver   1         1         1       1            1           kubernetes.io/os=linux   33d
```

1. calico-node 为 DaemonSet，提供 `CNI` 的能力
   - 将 CNI 的二进制文件和配置文件，拷贝到宿主上，kubelet 启动时会调用 CNI 来配置网络
2. calico-node 本身还承担`防火墙规则配置`的职责
   - 监听 NetworkPolicy 和 GlobalNetworkPolicy，调用 `iptables` 来实现防火墙隔离

# 零信任

## 传统安全模型

![image-20240119202657441](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20240119202657441.png)

1. 基于`边界`，将网络划分为外网、内网、DMZ 等不同区域，然后在边界上部署`防火墙`、`入侵检测`、`WAF` 等产品
2. 默认内网比外网安全，预设了对内网中的人、设备和系统的信任
3. 传统的认证、边界防护、静态访问控制，均以`网络`为中心

## 零信任架构

> `从不信任、始终验证`

![image-20240119203455575](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20240119203455575.png)

1. 应该始终假设网络充满威胁
2. 外部和内部威胁每时每刻都充斥着网络
3. 不能仅靠网络位置来确认信任关系
4. 所有设备、用户、网络流量都应该被认证和授权
5. 访问控制策略应该动态地基于尽量多的数据源进行计算和评估

# Istio

> 微服务架构下的安全挑战

1. 为了抵御`中间人攻击`，需要`流量加密`
2. 为了提供灵活的服务访问控制，需要`双向 TLS` 和`细粒度的访问策略`
3. `审计`

> Istio 安全保证

![image-20240119205128955](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20240119205128955.png)

> Istio 安全架构（如果启用 mTLS，istiod 会为 Service A 和 Service B `签发并推送`证书，默认 24 小时，自动 renew）

![image-20240119205621121](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20240119205621121.png)

> Istio 身份

1. 身份是任何安全基础架构的基本概念
2. 在工作负载间通信开始时，双方必须交换包含身份信息的凭证来进行双向验证
3. 在客户端，根据安全命名信息检查服务器的标识，以查看它是否是该服务的授权运行程序
4. 在服务端，服务器可以根据授权策略确定客户端可以查看哪些信息，并进行审计
5. Istio 身份模型使用 `service identify` 来确定一个`请求源端`的身份
   - 按照 `SPIFFE` 规范，为应用签发证书
   - Kubernetes - `ServiceAccount`
     - `spiffe://<domain>/ns/<namespace>/sa/<serviceaccount>`

![image-20240119211414338](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20240119211414338.png)

