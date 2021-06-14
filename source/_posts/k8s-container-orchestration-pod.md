---
title: 容器编排 -- Pod
mathjax: false
date: 2021-06-14 15:49:34
categories:
    - Cloud Native
    - Kubernetes
tags:
    - Cloud Native
    - Kubernetes
---

# 基本概念

1. 在Kubernetes中，Pod是**一等公民**
2. Pod是Kubernetes的**原子调度单位**，Kubernetes统一按照Pod（而非容器）的资源需求进行计算
3. 容器的本质是**进程**
4. 容器的**单进程模型**
   - 并不是指容器里只能运行一个进程，而是指**容器没有管理多个进程的能力**
   - 原因
     - 容器里PID=1的进程是应用本身，其它进程都是PID=1进程的子进程
     - 用户编写的应用，并不能像正常OS里面的**init**进程或者**systemd**进程那样拥有**进程管理**的功能
5. 容器间具有『**超亲密关系**』的典型特征
   - 互相之间会发生**直接的文件交换**
   - 使用**localhost**或者**Socket**文件进行**本地通信**
   - 会发生**非常频繁的远程调用**
   - 需要**共享**某些**Linux Namespace**
6. 并不是所有有关系的容器都属于同一个Pod，如Java应用容器和MySQL更适合做成两个Pod
7. Pod在Kubernetes中的重要意义 -- **容器设计模式**

<!-- more -->

# 实现原理

1. Pod只是一个**逻辑概念**
   - Kubernetes真正处理的，还是宿主机上**Linux容器的Namespace和Cgroups**，并不存在所谓的Pod的边界或者隔离环境
2. **Pod里的所有容器，共享的是同一个Network Namespace，并且可以声明共享同一个Volume**
3. Pod的实现会使用一个**中间容器**，称为**Infra容器**
   - Infra容器永远都是**第一个被创建**的容器，其它用户定义的容器，则通过**Join Network Namespace**，与Infra容器关联
   - Infra容器**占用极少的资源**，镜像为`k8s.gcr.io/pause`（**汇编**语言编写，永远处于『**暂停**』状态）
     - Infra容器**Hold**住Network Namespace后，用户容器可以加入到Infra容器的Network Namespace中
4. Pod中的容器A和容器B
   - 可以直接使用**localhost**进行通信
   - 看到的**网络设备**与Infra容器看到的完全一样
   - **一个Pod只有一个IP地址**，即该Pod的Network Namespace对应的IP地址
   - 其它网络资源，一个Pod一份，可以**被Pod中的所有容器共享**
   - **Pod的生命周期只跟Infra容器一致**，与容器A和容器B无关
5. 对于同一个Pod里面的所有用户容器来说，他们的**进出流量**，可以认为都是通过**Infra**容器完成的
   - 网络插件：不必关心用户容器启动与否，重点关注如何配置Pod（Infra容器）的Network Namespace
6. Volume：只要把所有Volume的定义都设计在**Pod层级**即可
   - 一个Volume对应的宿主机目录对于Pod来说就只有一个
   - Pod里的容器只需要声明挂载该Volume，就可以**共享**该Volume对应的宿主机目录

![](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210610175811545.png)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: two-containers
spec:
  restartPolicy: Never
  volumes:
    - name: shared-data
      hostPath:
        path: /data
  containers:
    - name: nginx-container
      image: nginx
      volumeMounts:
        - name: shared-data
          mountPath: /usr/share/nginx/html
    - name: debian-container
      image: debian
      volumeMounts:
        - name: shared-data
          mountPath: /pod-data
      command:
        - /bin/sh
      args:
        - '-c'
        - echo Hello from the debian container > /pod-data/index.html
```

# Sidecar

> Sidecar是容器设计模式里**最常用**的模式
> Sidecar：在一个Pod中，启动一个**辅助容器**，来完成一些独立于**主容器（进程）**之外的工作

1. 所有**Init Container**都会比spec.containers定义的用户容器**先启动**，并且**有序**，直到都**启动并且退出**后，用户容器才会启动
2. 跟进程**页表**（虚拟内存->物理内存）的原理比较类似

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: javaweb-2
spec:
  initContainers:
    - image: 'geektime/sample:v2'
      name: war
      command:
        - cp
        - /sample.war
        - /app
      volumeMounts:
        - mountPath: /app
          name: app-volume
  containers:
    - image: 'geektime/tomcat:7.0'
      name: tomcat
      command:
        - sh
        - '-c'
        - /root/apache-tomcat-7.0.42-v2/bin/start.sh
      volumeMounts:
        - mountPath: /root/apache-tomcat-7.0.42-v2/webapps
          name: app-volume
      ports:
        - containerPort: 8080
          hostPort: 8001
  volumes:
    - name: app-volume
      emptyDir: {}
```

# Pod的本质

1. 虚拟机 vs 容器
   - 运行在虚拟机里的应用，都是被systemd或者supervisord管理的**一组进程**
   - 容器的本质是**进程**
2. Pod的本质 -- **机器**
   - **Pod相当于虚拟机，容器相当于在虚拟机里运行的程序**
   - 因此，凡事**调度**、**网络**、**存储**、**安全**、**容器的Linux Namespace**相关的属性，都是**Pod级别**的

# Pod对象

## 基本概念

### NodeSelector

Pod永远只能运行在携带`disktype: ssd`标签（Label）的节点上，否则调度失败

```yaml
apiVersion: v1
kind: Pod
...
spec:
 nodeSelector:
   disktype: ssd
```

### NodeName

1. 一旦Pod对象的NodeName被赋值，Kubernetes会认为该Pod**已经经过调度**，调度的结果为赋值的节点名字
2. 该字段一般由**调度器**负责设置

### HostAliases

定义Pod的hosts文件

```yaml
apiVersion: v1
kind: Pod
...
spec:
  hostAliases:
  - ip: "10.1.2.3"
    hostnames:
    - "foo.remote"
    - "bar.remote"
...
```

```
cat /etc/hosts
# Kubernetes-managed hosts file.
127.0.0.1 localhost
...
10.244.135.10 hostaliases-pod
10.1.2.3 foo.remote
10.1.2.3 bar.remote
```

### Linux Namespace

#### PID Namespace

1. `shareProcessNamespace=true`：Pod里的容器要共享PID Namespace
2. `tty+stdin`等同于`docker run -it`
   - tty：Linux给用户提供的常驻小程序，用于接收用户的标准输入，返回操作系统的标准输出
   - stdin：在tty中输入信息

```yaml nginx.yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  shareProcessNamespace: true
  containers:
    - name: nginx
      image: nginx
    - name: shell
      image: busybox
      stdin: true
      tty: true
```

```
# kubectl apply -f nginx.yaml
pod/nginx created

# kubectl get pods
NAME    READY   STATUS    RESTARTS   AGE
nginx   2/2     Running   0          39s
```

连接到shell容器的tty上，可以看到nginx容器的进程、Infra容器的/pause进程

```
# kubectl attach -it nginx -c shell
/ # ps ax
PID   USER     TIME  COMMAND
    1 root      0:00 /pause
    9 root      0:00 nginx: master process nginx -g daemon off;
   39 101       0:00 nginx: worker process
   40 101       0:00 nginx: worker process
   41 root      0:00 sh
   47 root      0:00 ps ax

# kubectl delete -f nginx.yaml
pod "nginx" deleted
```

#### 共享宿主机的Namespace

Pod里的所有容器共享宿主机的Network、IPC、和PID Namespace

```yaml host.yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  hostNetwork: true
  hostIPC: true
  hostPID: true
  containers:
    - name: nginx
      image: nginx
    - name: shell
      image: busybox
      stdin: true
      tty: true
```

```
# kubectl apply -f host.yaml
pod/nginx created

# kubectl get pods
NAME    READY   STATUS    RESTARTS   AGE
nginx   2/2     Running   0          10s

# kubectl attach -it nginx -c shell
/ # hostname
worker

# kubectl delete -f host.yaml
pod "nginx" deleted
```

### Containers

> Kubernetes对Container的定义，与Docker相比并没有太大区别
> 常用：**image、command、workingDir、ports、volumeMounts**

#### ImagePullPolicy

1. **Always**（默认值）：每次**创建Pod**都重新拉取一次镜像，当镜像为**nginx**或者**nginx:latest**，ImagePullPolicy会被认为Always
2. **Never/IfNotPresent**：Pod不会主动拉取镜像，只有在宿主机上不存在该镜像时才拉取

#### Lifecycle

> 定义Container Lifecycle Hooks

1. **postStart**
   - 容器启动后，**立即执行**一个指定的操作
   - **postStart启动时，ENTRYPOINT可能还没结束**
   - 如果postStart执行**超时**或者**错误**，Pod的**Events**会记录相关错误信息，Pod也处于**失败**的状态
2. **preStop** -- 同步
   - 时机：容器被杀死之前（如收到**SIGKILL**信号）
   - **优雅退出**：preStop的执行是**同步**的，阻塞当前容器的杀死流程，直到Hook执行完成后，才允许容器被杀死

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: lifecycle-demo
spec:
  containers:
    - name: lifecycle-demo-container
      image: nginx
      lifecycle:
        postStart:
          exec:
            command:
              - /bin/sh
              - '-c'
              - echo Hello from the postStart handler > /usr/share/message
        preStop:
          exec:
            command:
              - /usr/sbin/nginx
              - '-s'
              - quit
```

##### Pod的生命周期

> **pod.status.phase**
> Pod对象的Status字段，可以细分出一组Conditions（PodScheduled、Ready、Initialized、Unschedulable）
> Conditions主要用于描述造成当前Status的**具体原因**，如**Status=Pending，Condition=Unschedulable**
> Ready：Pod已经正常启动（Running），并且已经可以对外提供服务

1. **Pending**
   - Pod的**YAML文件已经提交**给Kubernetes，**API Object已经被创建并保存在Etcd中**
   - 但由于Pod里**有些容器由于某种原因不能被顺利创建**（如调度失败）
2. **Running**
   - Pod已经**调度成功**，跟一个具体的节点绑定
   - Pod所包含的容器都已经创建成功，并且至少有一个正在运行中
3. **Succeeded**
   - Pod里**所有容器都正常运行完毕**，并且**已经退出**
   - 在运行**一次性**任务时最为常见
4. **Failed**
   - Pod里至少有一个容器以不正常（**非0返回码**）退出
   - 此时需要Debug，查看Pod的**Events**和日志
5. **Unknown**
   - 异常状态，Pod的状态不能持续地被kubelet**汇报**给kube-apiserver
   - 最有可能的原因：**主从节点间的通信出现了问题**

## 使用进阶

### Projected Volume

> 作用：为容器提供**预先定义好的数据**，在容器看来，这些Volume里的信息就是被Kubernetes**投射**（Project）进容器的

#### Secret

> 将Pod要访问的**加密数据**存放到**Etcd**中，然后通过在Pod的容器里**挂载Volume**的方式来访问Secret里保存的信息
> 典型使用场景：存放**数据库**的**Credential**信息

##### secret.yaml

```yaml secret.yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-projected-volume
spec:
  containers:
    - name: test-secret-volume
      image: busybox
      args:
        - sleep
        - '86400'
      volumeMounts:
        - name: mysql-cred
          mountPath: /projected-volume
          readOnly: true
  volumes:
    - name: mysql-cred
      projected:
        sources:
          - secret:
              name: user
          - secret:
              name: pass
```

##### 创建Secret

###### 命令行

```
# cat username.txt
admin

# cat password.txt
c1oudc0w!
```

```
# kubectl get secrets
NAME                  TYPE                                  DATA   AGE
default-token-6nzkh   kubernetes.io/service-account-token   3      4d19h

# kubectl create secret generic user --from-file=./username.txt
secret/user created

# kubectl create secret generic pass --from-file=./password.txt
secret/pass created

# kubectl get secrets
NAME                  TYPE                                  DATA   AGE
default-token-6nzkh   kubernetes.io/service-account-token   3      4d19h
pass                  Opaque                                1      5s
user                  Opaque                                1      10s
```

###### YAML

通过YAML文件创建的Secret对象只有一个，但在data字段可以用**KV格式**保存两份Secret数据（**Base64编码，编码 != 加密**）

```
# echo -n 'admin' | base64
YWRtaW4=

# echo -n '1f2d1e2e67df' | base64
MWYyZDFlMmU2N2Rm
```

```yaml mysecret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysecret
type: Opaque
data:
  user: YWRtaW4=
  pass: MWYyZDFlMmU2N2Rm
```

```
# kubectl apply -f mysecret.yaml
secret/mysecret created

# kubectl get secrets
NAME                  TYPE                                  DATA   AGE
default-token-6nzkh   kubernetes.io/service-account-token   3      4d19h
mysecret              Opaque                                2      5s
pass                  Opaque                                1      60s
user                  Opaque                                1      65s
```

##### 创建Pod

通过**挂载**方式进入容器的Secret，一旦对应的**Etcd**里的数据被更新，这些**Volume**里的文件内容，同样会被更新 -- **kubelet**维护

```
# kubectl create -f secret.yaml
pod/test-projected-volume created

# kubectl get pods
NAME                    READY   STATUS    RESTARTS   AGE
test-projected-volume   1/1     Running   0          8s

# kubectl exec -it test-projected-volume -- /bin/sh
/ # ls /projected-volume/
password.txt  username.txt
/ # cat /projected-volume/username.txt
admin
/ # cat /projected-volume/password.txt
c1oudc0w!
```

#### ConfigMap

> 与Secret类似，保存的是**不需要加密**的、**应用所需**的配置信息，用法与Secret完全相同

##### ui.properties

```properties ui.properties
color.good=purple
color.bad=yellow
allow.textmode=true
how.nice.to.look=fairlyNice
```

##### 创建ConfigMap

```
# kubectl create configmap ui-config --from-file=ui.properties
configmap/ui-config created
```

##### 查看ConfigMap

```
# kubectl get configmaps ui-config -o yaml
apiVersion: v1
data:
  ui.properties: |
    color.good=purple
    color.bad=yellow
    allow.textmode=true
    how.nice.to.look=fairlyNice
kind: ConfigMap
metadata:
  creationTimestamp: "2021-06-14T09:34:18Z"
  name: ui-config
  namespace: default
  resourceVersion: "155630"
  uid: 83119647-5db5-4611-b7f7-71a414ab10fe
```

#### Downward API

> 让**Pod里的容器**能够直接获取到这个**Pod API对象本身的信息**
> Downward API能获取到的信息，一定是Pod里的**容器进程启动之前**就能确定下来的信息

Pod的Labels字段的值，被Kubernetes自动挂载成为容器里**`/etc/podinfo/labels`**文件

```yaml downward_api.yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-downwardapi-volume
  labels:
    zone: us-est-coast
    cluster: test-cluster1
    rack: rack-22
spec:
  containers:
    - name: client-container
      image: k8s.gcr.io/busybox
      command:
        - sh
        - '-c'
      args:
        - >-
          while true; do if [[ -e /etc/podinfo/labels ]]; then echo -en '\n\n';
          cat /etc/podinfo/labels; fi; sleep 5; done;
      volumeMounts:
        - name: podinfo
          mountPath: /etc/podinfo
          readOnly: false
  volumes:
    - name: podinfo
      projected:
        sources:
          - downwardAPI:
              items:
                - path: labels
                  fieldRef:
                    fieldPath: metadata.labels
```

```
# kubectl apply -f downward_api.yaml
pod/test-downwardapi-volume created

# kubectl logs test-downwardapi-volume
cluster="test-cluster1"
rack="rack-22"
zone="us-est-coast"
```

支持的字段

```
1. 使用 fieldRef 可以声明使用:
spec.nodeName - 宿主机名字
status.hostIP - 宿主机 IP
metadata.name - Pod 的名字
metadata.namespace - Pod 的 Namespace
status.podIP - Pod 的 IP
spec.serviceAccountName - Pod 的 Service Account 的名字
metadata.uid - Pod 的 UID
metadata.labels['<KEY>'] - 指定 <KEY> 的 Label 值
metadata.annotations['<KEY>'] - 指定 <KEY> 的 Annotation 值
metadata.labels - Pod 的所有 Label
metadata.annotations - Pod 的所有 Annotation

2. 使用 resourceFieldRef 可以声明使用:
容器的 CPU limit
容器的 CPU request
容器的 memory limit
容器的 memory request
```

#### ServiceAccountToken

> 作用：Kubernetes内置的一种**服务账号**，Service Account是Kubernetes进行**权限分配**的对象
> 样例：Service Account A只允许对Kubernetes API进行GET操作，Service Account B有Kubernetes API所有操作的权限
> Service Account的**授权信息和文件**，实际上保存在它所**绑定的特殊的Secret对象**里，称为**ServiceAccountToken**
> **ServiceAccountToken是一种特殊的Secret**

1. 任何运行在Kubernetes集群上的应用，都必须使用ServiceAccountToken里保存的授权信息，才能合法地访问API Server
2. 为了方便使用，Kubernetes提供默认的服务账号（**Default Service Account**），**Pod可以直接使用**，无需显式声明挂载
4. **InClusterConfig**（推荐）：Kubernetes客户端以**容器**的方式运行在集群里，然后使用Default Service Account**自动授权**
5. 默认的ServiceAccountToken存在潜在风险，可以设置默认不为Pod里的容器自动挂载这个Volume

```
# kubectl get pods
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-75f76dcfd9-29d8t   1/1     Running   0          8s
nginx-deployment-75f76dcfd9-6xv8q   1/1     Running   0          8s
nginx-deployment-75f76dcfd9-cn4j9   1/1     Running   0          8s
nginx-deployment-75f76dcfd9-xnv5m   1/1     Running   0          8s

# kubectl describe pod nginx-deployment-75f76dcfd9-29d8t
...
Containers:
  nginx:
    ...
    Mounts:
      /usr/share/nginx/html from nginx-vol (rw)
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-gnrc9 (ro)
...
Volumes:
	...
  kube-api-access-gnrc9:
    Type:                    Projected (a volume that contains injected data from multiple sources)
    TokenExpirationSeconds:  3607
    ConfigMapName:           kube-root-ca.crt
    ConfigMapOptional:       <nil>
    DownwardAPI:             true
...

# kubectl exec -it nginx-deployment-75f76dcfd9-29d8t -- /bin/sh
# ls /var/run/secrets/kubernetes.io/serviceaccount
ca.crt	namespace  token
# cat ls /var/run/secrets/kubernetes.io/serviceaccount/token
cat: ls: No such file or directory
eyJhbGciOiJSUzI1NiIsImtpZCI6Ik1LUW9LbmI5dGh2djdfS29JNElKLXl0MzZHbTR5azRTOHdxZ3dxZk5qV3cifQ.eyJhdWQiOlsiaHR0cHM6Ly9rdWJlcm5ldGVzLmRlZmF1bHQuc3ZjLmNsdXN0ZXIubG9jYWwiXSwiZXhwIjoxNjU1MjA2ODQ2LCJpYXQiOjE2MjM2NzA4NDYsImlzcyI6Imh0dHBzOi8va3ViZXJuZXRlcy5kZWZhdWx0LnN2Yy5jbHVzdGVyLmxvY2FsIiwia3ViZXJuZXRlcy5pbyI6eyJuYW1lc3BhY2UiOiJkZWZhdWx0IiwicG9kIjp7Im5hbWUiOiJuZ2lueC1kZXBsb3ltZW50LTc1Zjc2ZGNmZDktMjlkOHQiLCJ1aWQiOiIzMmM3ZjViYS0zY2JkLTQyOTktYTdiOC01ZTUwNGNmMzI1YTcifSwic2VydmljZWFjY291bnQiOnsibmFtZSI6ImRlZmF1bHQiLCJ1aWQiOiIwMWUxZDljMy1hMjkzLTQzOWItODkwMC05YzFjNjZlOWUzM2IifSwid2FybmFmdGVyIjoxNjIzNjc0NDUzfSwibmJmIjoxNjIzNjcwODQ2LCJzdWIiOiJzeXN0ZW06c2VydmljZWFjY291bnQ6ZGVmYXVsdDpkZWZhdWx0In0.Bjt3hILB6kxh5mF7TA8QN1TVMbg4PQqEmtOio3osBzVnP97Xrquf-LohVVK2vPa9RrnECiv-hKOvu-U5uFihj2_-7xBRIAOGDsdEOnVaDbmE3iB75zsNOHG5i9dbHMYyuA6eOCdkJLA9mewDNDJQHwTfrKQRevFNIVzRYfHozlRmAyeuz8iA9SOwPfsRl19rb18qb4RA4_-chEk4aGHJxbC8HMMjB-rVQRtvhoxe95r0bQP9XE9BTjlstXk-wFTGPivDcXaTrE3UPRzSD_mLOB9qRV3JtsnfMqQ7YFMDHH2pAq_hFERPx6sz8XS3D4R5gJWxql42YeLX3YTbonay3Q
```

### Liveness

> 在Kubernetes中，可以为Pod里的容器定义一个**健康检查的Probe**，kubelet会根据该Probe的返回值决定容器的状态

#### liveness.yaml

```yaml liveness.yaml
apiVersion: v1
kind: Pod
metadata:
  labels:
    test: liveness
  name: test-liveness-exec
spec:
  containers:
    - name: liveness
      image: busybox
      args:
        - /bin/sh
        - '-c'
        - touch /tmp/healthy; sleep 30; rm -rf /tmp/healthy; sleep 600
      livenessProbe:
        exec:
          command:
            - cat
            - /tmp/healthy
        initialDelaySeconds: 5
        periodSeconds: 5
```

#### 创建Pod

```
# kubectl apply -f liveness.yaml
pod/test-liveness-exec created

# kubectl get pods
NAME                 READY   STATUS    RESTARTS   AGE
test-liveness-exec   1/1     Running   0          12s
```

#### 查看Pod的Events

容器刚启动的时候，报告容器为**`Unhealthy`**（由于Liveness probe failed）

```
# kubectl describe pod test-liveness-exec
...
Events:
  Type     Reason     Age                 From               Message
  ----     ------     ----                ----               -------
  Normal   Scheduled  2m                  default-scheduler  Successfully assigned default/test-liveness-exec to worker
  Normal   Pulled     114s                kubelet            Successfully pulled image "busybox" in 5.71826124s
  Normal   Killing    70s                 kubelet            Container liveness failed liveness probe, will be restarted
  Normal   Pulling    40s (x2 over 119s)  kubelet            Pulling image "busybox"
  Normal   Pulled     37s                 kubelet            Successfully pulled image "busybox" in 3.755658619s
  Normal   Created    36s (x2 over 113s)  kubelet            Created container liveness
  Normal   Started    36s (x2 over 113s)  kubelet            Started container liveness
  Warning  Unhealthy  0s (x5 over 80s)    kubelet            Liveness probe failed: cat: can't open '/tmp/healthy': No such file or directory
```

#### 查看Pod的状态

1. Pod的状态为**Running**，而非Failed，RESTARTS为3说明了已经被Kubernetes**重启**了，该过程**Pod保持Running状态不变**
2. Kubernetes中**没有Docker的Stop语义**，重启代表着**重新创建容器**，该功能称为Kubernetes的**RestartPolicy**（Pod**恢复**机制）
3. Pod的**READY**字段：表示Pod里**正常容器**的个数
```
# kubectl get pod test-liveness-exec
NAME                 READY   STATUS    RESTARTS   AGE
test-liveness-exec   1/1     Running   3          4m23s
```

#### RestartPolicy
1. **pod.spec.restartPolicy**（标准字段）
  - **Always**（默认值）：在任何情况下，只要容器**不在运行状态**，就自动重启容器
  - **OnFailure**：只在容器**异常**时才自动重启容器
  - **Never**：从来不重启容器
2. 基本的设计原理
  - 只要restartPolicy**允许重启异常的容器**（Always+OnFailure），那么这个Pod会**保持Running状态**（否则进入Failed状态）
  - 包含**多个容器**的Pod，只有里面**所有的容器都进入异常状态**后，Pod才会进入**Failed状态**（在此之前，都是Running状态）

#### Pod & Node
1. Pod的恢复过程，**永远发生在当前Node上**，不会跑到别的Node上
2. 一旦一个Pod与一个Node**绑定**，除非绑定发生变化，否则永远不会离开该Node，哪怕**Node宕机**，该**Pod也不会主动迁移**
3. 如果想让Pod出现在其它Node上，必须**使用Deployment来管理Pod**（哪怕只需要一个Pod副本）

#### Liveness Probe

> 除了可以在容器中执行命令外，livenessProbe还可以定义为发起**HTTP**或者**TCP**请求的方式（Web服务类）

```yaml
...
  livenessProbe:
    httpGet:
      path: /healthz
      port: 8080
      httpHeaders:
        - name: X-Custom-Header
          value: Awesome
      initialDelaySeconds: 3
      periodSeconds: 3
```

```yaml
...
  livenessProbe:
    tcpSocket:
      port: 8080
    initialDelaySeconds: 15
    periodSeconds: 20
```

#### readinessProbe vs livenessProbe

> readinessProbe检查结果的成功与否，决定该Pod是不是能**被通过Service的方式访问到**，并不影响Pod的生命周期

### PodPreset

> PodPreset定义的内容，只会**在Pod API对象被创建之前**追加在这个对象本身，**不会影响任何Pod控制器的定义**
> 例如：**Deployment对象本身永远不会被PodPreset改变，被修改的只是这个Deployment创建出来的所有Pod**
> 如果定义了同时作用于同一个Pod对象的多个PodPreset，Kubernetes会**尝试合并修改，冲突字段不会被修改**

#### pod.yaml

```yaml pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: website
  labels:
    app: website
    role: frontend
spec:
  containers:
    - name: website
      image: nginx
      ports:
        - containerPort: 80
```

#### preset.yaml

追加的定义只会作用在带有`role: frontend`标签的Pod对象

```yaml preset.yaml
apiVersion: settings.k8s.io/v1alpha1
kind: PodPreset
metadata:
  name: allow-database
spec:
  selector:
    matchLabels:
      role: frontend
  env:
    - name: DB_PORT
      value: '6379'
  volumeMounts:
    - mountPath: /cache
      name: cache-volume
  volumes:
    - name: cache-volume
      emptyDir: {}
```

#### 创建PodPreset和Pod

自动添加annotation，表示该Pod对象被PodPreset改动过

```
# kubectl apply -f preset.yaml
# kubectl apply -f pod.yaml

# kubectl get pod website -o yaml
apiVersion: v1
kind: Pod
metadata:
  name: website
  labels:
    app: website
    role: frontend
  annotations:
    podpreset.admission.kubernetes.io/podpreset-allow-database: resource version
spec:
  containers:
    - name: website
      image: nginx
      volumeMounts:
        - mountPath: /cache
          name: cache-volume
      ports:
        - containerPort: 80
      env:
        - name: DB_PORT
          value: '6379'
  volumes:
    - name: cache-volume
      emptyDir: {}
```





# 参考资料

1. [深入剖析Kubernetes](https://time.geekbang.org/column/intro/100015201)
