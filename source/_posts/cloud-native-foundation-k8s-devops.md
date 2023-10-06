---
title: Kubernetes - DevOps
mathjax: false
date: 2022-12-15 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/devops.jpeg
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
---

# 基本概念

## 流程概览

> 实现`自动化`，最核心的投入为`编写测试用例`

![image-20231005184017220](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231005184017220.png)

<!-- more -->

## 分支管理

> 提交 `PR` 时会触发 `CI Pipeline`；生产系统版本不能直接使用 master 分支（最新代码），而是要基于 Release 分支

![image-20231005184442311](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231005184442311.png)

## CICD

![image-20231005204444088](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231005204444088.png)

### CI

![image-20231005185250488](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231005185250488.png)

### CD

![image-20231005185623993](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231005185623993.png)

## GitOps

> 一切皆代码，通过 Git 来触发 Ops

![image-20231005185807790](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231005185807790.png)

# Jenkins

> Jenkins 不是云原生

## Container CI

> 需要保证 CI 构建环境和开发环境的统一

![image-20231005204740506](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231005204740506.png)

1. 使用`容器`作为标准的`构建环境`，将`代码库`作为 `Volume` 挂载进容器
2. 需要在构建容器中执行 `docker build` 命令，即 `Docker in Docker` = DIND

## Kubernetes CI

> Jenkins 可以被容器化（on Kubernetes），并支持 Cloud Provider，通过`插件`的方式支持 Kubernetes

> https://github.com/jenkinsci/kubernetes-plugin
> Jenkins plugin to run dynamic agents in a Kubernetes/Docker environment

![image-20231005205443613](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231005205443613.png)

## Docker in Docker

> `挂载`宿主上的 docker socket 文件，`Docker Daemon` 本质上是一个 `Unix Socket`，但存在一定的`安全风险`

```
$ docker run -v /var/run/docker.sock:/var/run/docker.sock
```

> Google `kaniko` - Build Container Images In Kubernetes - `Tekton`

## Hello Jenkins

> https://github.com/jenkinsci/docker-inbound-agent
> Docker image for a Jenkins agent which can connect to Jenkins using TCP or Websocket protocols

> 部署 Jenkins

```
$ k get po -owide
NAME        READY   STATUS    RESTARTS   AGE   IP               NODE      NOMINATED NODE   READINESS GATES
jenkins-0   1/1     Running   0          73s   192.168.185.14   mac-k8s   <none>           <none>

$ k exec -it jenkins-0 -- cat /var/jenkins_home/secrets/initialAdminPassword
2d489d1ff87e4579a15368a5b2a9e094

$ k get svc -owide
NAME         TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)                        AGE     SELECTOR
jenkins      NodePort    10.100.49.21   <none>        80:31195/TCP,50000:31903/TCP   2m17s   name=jenkins
kubernetes   ClusterIP   10.96.0.1      <none>        443/TCP                        38d     <none>
```

![image-20231006094323779](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231006094323779.png)

> 安装 Kubernetes 插件

![image-20231006094726371](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231006094726371.png)

> 配置 Cloud Provider - Kubernetes，使得 Jenkins Master 可以通过 Kubernetes 执行作业（通过 Jenkins Slave）

![image-20231006095631362](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231006095631362.png)

> 告知 Jenkins Master 如何连接 Kubernetes API Server，然后创建 Jenkins Slave Pod

![image-20231006100442600](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231006100442600.png)

![image-20231006101146559](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231006101146559.png)

> Pod Templates - Jenkins Slave

![image-20231006101633681](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231006101633681.png)

> Docker in Docker

![image-20231006101720113](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231006101720113.png)

> 创建 Job

![image-20231006101942554](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231006101942554.png)

> 通过 Label 选择运行环境（Kubernetes）

![image-20231006102245974](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231006102245974.png)

![image-20231006102418262](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231006102418262.png)

# Tekton

> *Cloud Native CI/CD*

> Jenkins 等工具的流水线作业通常基于大量不可复用的脚本，`代码复用率很低`（抽象能力不足），且`代码调试困难`
> Jenkins Master 能支撑的 Jenkins Slave 也是有上限的

## 声明式 API

| Key    | Desc                                                         |
| ------ | ------------------------------------------------------------ |
| 自定义 | Tekton 对象是`高度可定义`的，`扩展性极强`<br />预定义`可重用模块`以详细的`模块目录`提供，可以在其它项目中`直接引用` |
| 可重用 | 组件只需`一次定义`，便可在任何流水线复用                     |
| 可扩展 | `Tekton Catalog` 是一个`社区驱动`的 `Tekton 组件`的存储仓库  |
| 标准化 | Tekton 作为 `Kubernetes 的扩展`安装和运行<br />使用 Kubernetes 的资源模型<br />以 Kubernetes 容器运行 |
| 规模化 | 增加 Kubernetes Node，便可增强作业处理能力<br />无需重新定义资源分配需求或者重新定义流水线 |

## 核心组件

![image-20231006111427461](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231006111427461.png)

| Component | Desc                                                         |
| --------- | ------------------------------------------------------------ |
| Pipeline  | 一个 Pipeline 对象由一个或多个 Task 对象组成，支持 `DAG`     |
| Task      | 一个`可独立运行`的任务<br />当 Pipeline 运行时，Kubernetes 会为每个 `Task` 创建一个 `Pod`<br />一个 Task 由多个 `Step` 组成，Step 对应 Pod 中的一个 `Container` |

## 安装

```
$ k get po -n tekton-pipelines -owide
NAME                                                 READY   STATUS    RESTARTS   AGE    IP               NODE      NOMINATED NODE   READINESS GATES
tekton-dashboard-5bc7dd8b6c-z86bc                    1/1     Running   0          15m    192.168.185.14   mac-k8s   <none>           <none>
tekton-pipelines-controller-55487dcfb8-4f9kz         1/1     Running   0          27h    192.168.185.13   mac-k8s   <none>           <none>
tekton-pipelines-webhook-794864555f-fjwxq            1/1     Running   0          27h    192.168.185.12   mac-k8s   <none>           <none>
tekton-triggers-controller-785b57c4b9-tv2hx          1/1     Running   0          3m9s   192.168.185.19   mac-k8s   <none>           <none>
tekton-triggers-core-interceptors-5c4594b846-ckntt   1/1     Running   0          3m1s   192.168.185.20   mac-k8s   <none>           <none>
tekton-triggers-webhook-7fdf56d956-mpbc5             1/1     Running   0          3m9s   192.168.185.18   mac-k8s   <none>           <none>

$ k get svc -n tekton-pipelines
NAME                                TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)                              AGE
tekton-dashboard                    ClusterIP   10.107.0.117     <none>        9097/TCP                             17m
tekton-pipelines-controller         ClusterIP   10.100.49.21     <none>        9090/TCP,8008/TCP,8080/TCP           27h
tekton-pipelines-webhook            ClusterIP   10.98.161.143    <none>        9090/TCP,8008/TCP,443/TCP,8080/TCP   27h
tekton-triggers-controller          ClusterIP   10.103.237.253   <none>        9000/TCP                             5m3s
tekton-triggers-core-interceptors   ClusterIP   10.110.33.242    <none>        80/TCP                               4m55s
tekton-triggers-webhook             ClusterIP   10.101.223.125   <none>        443/TCP                              5m3s
```

```
$ k get crd | grep tekton
clusterinterceptors.triggers.tekton.dev               2022-10-06T05:47:45Z
clustertasks.tekton.dev                               2022-10-05T02:34:45Z
clustertriggerbindings.triggers.tekton.dev            2022-10-06T05:47:45Z
conditions.tekton.dev                                 2022-10-05T02:34:45Z
eventlisteners.triggers.tekton.dev                    2022-10-06T05:47:45Z
extensions.dashboard.tekton.dev                       2022-10-06T05:35:29Z
pipelineresources.tekton.dev                          2022-10-05T02:34:45Z
pipelineruns.tekton.dev                               2022-10-05T02:34:45Z
pipelines.tekton.dev                                  2022-10-05T02:34:45Z
resolutionrequests.resolution.tekton.dev              2022-10-05T02:34:45Z
runs.tekton.dev                                       2022-10-05T02:34:45Z
taskruns.tekton.dev                                   2022-10-05T02:34:45Z
tasks.tekton.dev                                      2022-10-05T02:34:45Z
triggerbindings.triggers.tekton.dev                   2022-10-06T05:47:45Z
triggers.triggers.tekton.dev                          2022-10-06T05:47:45Z
triggertemplates.triggers.tekton.dev                  2022-10-06T05:47:45Z
```

```
$ k api-resources | grep 'tekton'
extensions                        ext,exts                                        dashboard.tekton.dev/v1alpha1          true         Extension
resolutionrequests                                                                resolution.tekton.dev/v1alpha1         true         ResolutionRequest
clustertasks                                                                      tekton.dev/v1beta1                     false        ClusterTask
conditions                                                                        tekton.dev/v1alpha1                    true         Condition
pipelineresources                                                                 tekton.dev/v1alpha1                    true         PipelineResource
pipelineruns                      pr,prs                                          tekton.dev/v1beta1                     true         PipelineRun
pipelines                                                                         tekton.dev/v1beta1                     true         Pipeline
runs                                                                              tekton.dev/v1alpha1                    true         Run
taskruns                          tr,trs                                          tekton.dev/v1beta1                     true         TaskRun
tasks                                                                             tekton.dev/v1beta1                     true         Task
clusterinterceptors               ci                                              triggers.tekton.dev/v1alpha1           false        ClusterInterceptor
clustertriggerbindings            ctb                                             triggers.tekton.dev/v1beta1            false        ClusterTriggerBinding
eventlisteners                    el                                              triggers.tekton.dev/v1beta1            true         EventListener
triggerbindings                   tb                                              triggers.tekton.dev/v1beta1            true         TriggerBinding
triggers                          tri                                             triggers.tekton.dev/v1beta1            true         Trigger
triggertemplates                  tt                                              triggers.tekton.dev/v1beta1            true         TriggerTemplate
```

## Hello Tekton

> Task

```yaml task-hello.yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: hello
spec:
  steps:
    - name: hello
      image: ubuntu:jammy
      command:
        - echo
      args:
        - "Hello $(params.username)!"
  params:
  - name: username
    type: string
```

```
$ k apply -f task-hello.yaml
task.tekton.dev/hello created

$ k get task -A
NAMESPACE   NAME    AGE
default     hello   47s
```

> TaskRun

```yaml taskrun-hello.yaml
apiVersion: tekton.dev/v1beta1
kind: TaskRun
metadata:
  generateName: hello-run-
spec:
  taskRef:
    name: hello
  params:
  - name: "username"
    value: "zhongmingmao"
```

```
$ k create -f taskrun-hello.yaml
taskrun.tekton.dev/hello-run-rj8z2 created

$ k get po
NAME                  READY   STATUS     RESTARTS   AGE
hello-run-rj8z2-pod   0/1     Init:0/2   0          12s

$ k get po -owide
NAME                  READY   STATUS      RESTARTS   AGE   IP               NODE      NOMINATED NODE   READINESS GATES
hello-run-rj8z2-pod   0/1     Completed   0          34s   192.168.185.21   mac-k8s   <none>           <none>

$ k logs hello-run-rj8z2-pod
Hello zhongmingmao!
```

```
$ k get taskruns.tekton.dev -A -owide
NAMESPACE   NAME              SUCCEEDED   REASON      STARTTIME   COMPLETIONTIME
default     hello-run-rj8z2   True        Succeeded   2m5s        92s

$ k describe taskruns.tekton.dev hello-run-rj8z2
Name:         hello-run-rj8z2
Namespace:    default
Labels:       app.kubernetes.io/managed-by=tekton-pipelines
              tekton.dev/task=hello
Annotations:  pipeline.tekton.dev/release: 68f2a66
API Version:  tekton.dev/v1beta1
Kind:         TaskRun
Metadata:
  Creation Timestamp:  2022-10-06T06:04:43Z
  Generate Name:       hello-run-
  Generation:          1
  Managed Fields:
    API Version:  tekton.dev/v1beta1
    Fields Type:  FieldsV1
    fieldsV1:
      f:metadata:
        f:annotations:
          .:
          f:kubectl.kubernetes.io/last-applied-configuration:
          f:pipeline.tekton.dev/release:
        f:labels:
          f:tekton.dev/task:
    Manager:      Go-http-client
    Operation:    Update
    Time:         2022-10-06T06:04:43Z
    API Version:  tekton.dev/v1beta1
    Fields Type:  FieldsV1
    fieldsV1:
      f:metadata:
        f:generateName:
      f:spec:
        .:
        f:params:
        f:taskRef:
          .:
          f:name:
    Manager:      kubectl-create
    Operation:    Update
    Time:         2022-10-06T06:04:43Z
    API Version:  tekton.dev/v1beta1
    Fields Type:  FieldsV1
    fieldsV1:
      f:status:
        .:
        f:completionTime:
        f:conditions:
        f:podName:
        f:startTime:
        f:steps:
        f:taskSpec:
          .:
          f:params:
          f:steps:
    Manager:         Go-http-client
    Operation:       Update
    Subresource:     status
    Time:            2022-10-06T06:05:16Z
  Resource Version:  17098
  UID:               96e92b1b-c6d0-4735-b1cf-f1be6a7a9856
Spec:
  Params:
    Name:                username
    Value:               zhongmingmao
  Service Account Name:  default
  Task Ref:
    Kind:   Task
    Name:   hello
  Timeout:  1h0m0s
Status:
  Completion Time:  2022-10-06T06:05:16Z
  Conditions:
    Last Transition Time:  2022-10-06T06:05:16Z
    Message:               All Steps have completed executing
    Reason:                Succeeded
    Status:                True
    Type:                  Succeeded
  Pod Name:                hello-run-rj8z2-pod
  Start Time:              2022-10-06T06:04:43Z
  Steps:
    Container:  step-hello
    Image ID:   docker-pullable://ubuntu@sha256:f154feaf13b51d16e2b4b5575d69abc808da40c4b80e3a5055aaa4bcc5099d5b
    Name:       hello
    Terminated:
      Container ID:  docker://11a23916c51de7746ce4d141d92fd8c189987035822268738428fe0ca0e9d6a2
      Exit Code:     0
      Finished At:   2022-10-06T06:05:15Z
      Reason:        Completed
      Started At:    2022-10-06T06:05:15Z
  Task Spec:
    Params:
      Name:  username
      Type:  string
    Steps:
      Args:
        Hello $(params.username)!
      Command:
        echo
      Image:  ubuntu:jammy
      Name:   hello
      Resources:
Events:
  Type    Reason     Age                    From     Message
  ----    ------     ----                   ----     -------
  Normal  Started    2m31s                  TaskRun
  Normal  Pending    2m31s                  TaskRun  Pending
  Normal  Pending    2m31s (x2 over 2m31s)  TaskRun  pod status "Initialized":"False"; message: "containers with incomplete status: [place-tools step-init]"
  Normal  Pending    2m4s                   TaskRun  pod status "Initialized":"False"; message: "containers with incomplete status: [step-init]"
  Normal  Pending    2m2s                   TaskRun  pod status "Ready":"False"; message: "containers with unready status: [step-hello]"
  Normal  Running    2m1s (x2 over 2m1s)    TaskRun  Not all Steps in the Task have finished executing
  Normal  Succeeded  118s                   TaskRun  All Steps have completed executing
```

> 通过 Tekton `InitContainer` 将 Task 中定义的任务`编码`成主 Container 的 entrypoint

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    cni.projectcalico.org/containerID: 67e61d1b9ca3c3fcd045fe653a37ecc7314c258090b3a8eee8f752cd842814ba
    cni.projectcalico.org/podIP: ""
    cni.projectcalico.org/podIPs: ""
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"tekton.dev/v1beta1","kind":"Task","metadata":{"annotations":{},"name":"hello","namespace":"default"},"spec":{"params":[{"name":"username","type":"string"}],"steps":[{"args":["Hello $(params.username)!"],"command":["echo"],"image":"ubuntu:jammy","name":"hello"}]}}
    pipeline.tekton.dev/release: 68f2a66
    tekton.dev/ready: READY
  creationTimestamp: "2022-10-06T06:04:43Z"
  labels:
    app.kubernetes.io/managed-by: tekton-pipelines
    tekton.dev/task: hello
    tekton.dev/taskRun: hello-run-rj8z2
  name: hello-run-rj8z2-pod
  namespace: default
  ownerReferences:
  - apiVersion: tekton.dev/v1beta1
    blockOwnerDeletion: true
    controller: true
    kind: TaskRun
    name: hello-run-rj8z2
    uid: 96e92b1b-c6d0-4735-b1cf-f1be6a7a9856
  resourceVersion: "17099"
  uid: 9049f67a-94a1-4db5-9752-1c92a8ad9bb5
spec:
  activeDeadlineSeconds: 5400
  containers:
  - args:
    - -wait_file
    - /tekton/downward/ready
    - -wait_file_content
    - -post_file
    - /tekton/run/0/out
    - -termination_path
    - /tekton/termination
    - -step_metadata_dir
    - /tekton/run/0/status
    - -entrypoint
    - echo
    - --
    - Hello zhongmingmao!
    command:
    - /tekton/bin/entrypoint
    image: ubuntu:jammy
    imagePullPolicy: IfNotPresent
    name: step-hello
    resources: {}
    terminationMessagePath: /tekton/termination
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /tekton/downward
      name: tekton-internal-downward
      readOnly: true
    - mountPath: /tekton/creds
      name: tekton-creds-init-home-0
    - mountPath: /tekton/run/0
      name: tekton-internal-run-0
    - mountPath: /tekton/bin
      name: tekton-internal-bin
      readOnly: true
    - mountPath: /workspace
      name: tekton-internal-workspace
    - mountPath: /tekton/home
      name: tekton-internal-home
    - mountPath: /tekton/results
      name: tekton-internal-results
    - mountPath: /tekton/steps
      name: tekton-internal-steps
      readOnly: true
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-6xz8x
      readOnly: true
  dnsPolicy: ClusterFirst
  enableServiceLinks: true
  initContainers:
  - command:
    - /ko-app/entrypoint
    - cp
    - /ko-app/entrypoint
    - /tekton/bin/entrypoint
    image: gcr.io/tekton-releases/github.com/tektoncd/pipeline/cmd/entrypoint:v0.35.0@sha256:5730032a7daf7526fae6b586badf849ffe4539e16fd8be927ec7e320564486be
    imagePullPolicy: IfNotPresent
    name: place-tools
    resources: {}
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /tekton/bin
      name: tekton-internal-bin
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-6xz8x
      readOnly: true
    workingDir: /
  - command:
    - /ko-app/entrypoint
    - step-init
    - step-hello
    image: gcr.io/tekton-releases/github.com/tektoncd/pipeline/cmd/entrypoint:v0.35.0@sha256:5730032a7daf7526fae6b586badf849ffe4539e16fd8be927ec7e320564486be
    imagePullPolicy: IfNotPresent
    name: step-init
    resources: {}
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /tekton/steps
      name: tekton-internal-steps
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-6xz8x
      readOnly: true
    workingDir: /
  nodeName: mac-k8s
  preemptionPolicy: PreemptLowerPriority
  priority: 0
  restartPolicy: Never
  schedulerName: default-scheduler
  securityContext: {}
  serviceAccount: default
  serviceAccountName: default
  terminationGracePeriodSeconds: 30
  tolerations:
  - effect: NoExecute
    key: node.kubernetes.io/not-ready
    operator: Exists
    tolerationSeconds: 300
  - effect: NoExecute
    key: node.kubernetes.io/unreachable
    operator: Exists
    tolerationSeconds: 300
  volumes:
  - emptyDir: {}
    name: tekton-internal-workspace
  - emptyDir: {}
    name: tekton-internal-home
  - emptyDir: {}
    name: tekton-internal-results
  - emptyDir: {}
    name: tekton-internal-steps
  - emptyDir: {}
    name: tekton-internal-bin
  - downwardAPI:
      defaultMode: 420
      items:
      - fieldRef:
          apiVersion: v1
          fieldPath: metadata.annotations['tekton.dev/ready']
        path: ready
    name: tekton-internal-downward
  - emptyDir:
      medium: Memory
    name: tekton-creds-init-home-0
  - emptyDir: {}
    name: tekton-internal-run-0
  - name: kube-api-access-6xz8x
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
status:
  conditions:
  - lastProbeTime: null
    lastTransitionTime: "2022-10-06T06:05:12Z"
    reason: PodCompleted
    status: "True"
    type: Initialized
  - lastProbeTime: null
    lastTransitionTime: "2022-10-06T06:05:16Z"
    reason: PodCompleted
    status: "False"
    type: Ready
  - lastProbeTime: null
    lastTransitionTime: "2022-10-06T06:05:16Z"
    reason: PodCompleted
    status: "False"
    type: ContainersReady
  - lastProbeTime: null
    lastTransitionTime: "2022-10-06T06:04:43Z"
    status: "True"
    type: PodScheduled
  containerStatuses:
  - containerID: docker://11a23916c51de7746ce4d141d92fd8c189987035822268738428fe0ca0e9d6a2
    image: ubuntu:jammy
    imageID: docker-pullable://ubuntu@sha256:f154feaf13b51d16e2b4b5575d69abc808da40c4b80e3a5055aaa4bcc5099d5b
    lastState: {}
    name: step-hello
    ready: false
    restartCount: 0
    started: false
    state:
      terminated:
        containerID: docker://11a23916c51de7746ce4d141d92fd8c189987035822268738428fe0ca0e9d6a2
        exitCode: 0
        finishedAt: "2022-10-06T06:05:15Z"
        message: '[{"key":"StartedAt","value":"2022-10-06T06:05:15.175Z","type":3}]'
        reason: Completed
        startedAt: "2022-10-06T06:05:12Z"
  hostIP: 192.168.191.153
  initContainerStatuses:
  - containerID: docker://646212197ab5a7cb96967a0d8c55e40a46c71613ebd33b1908db5615f40c27cd
    image: gcr.io/tekton-releases/github.com/tektoncd/pipeline/cmd/entrypoint@sha256:5730032a7daf7526fae6b586badf849ffe4539e16fd8be927ec7e320564486be
    imageID: docker-pullable://gcr.io/tekton-releases/github.com/tektoncd/pipeline/cmd/entrypoint@sha256:5730032a7daf7526fae6b586badf849ffe4539e16fd8be927ec7e320564486be
    lastState: {}
    name: place-tools
    ready: true
    restartCount: 0
    state:
      terminated:
        containerID: docker://646212197ab5a7cb96967a0d8c55e40a46c71613ebd33b1908db5615f40c27cd
        exitCode: 0
        finishedAt: "2022-10-06T06:05:10Z"
        reason: Completed
        startedAt: "2022-10-06T06:05:10Z"
  - containerID: docker://3eae85cc2959220ed60cf700ae121ef04a3e4feb8ccd5adabfc35b334a954843
    image: sha256:c3b6785b31c97a221efd0d4fa03d32a084c8f320736b133cfe8c910886139f94
    imageID: docker-pullable://gcr.io/tekton-releases/github.com/tektoncd/pipeline/cmd/entrypoint@sha256:5730032a7daf7526fae6b586badf849ffe4539e16fd8be927ec7e320564486be
    lastState: {}
    name: step-init
    ready: true
    restartCount: 0
    state:
      terminated:
        containerID: docker://3eae85cc2959220ed60cf700ae121ef04a3e4feb8ccd5adabfc35b334a954843
        exitCode: 0
        finishedAt: "2022-10-06T06:05:11Z"
        reason: Completed
        startedAt: "2022-10-06T06:05:11Z"
  phase: Succeeded
  podIP: 192.168.185.21
  podIPs:
  - ip: 192.168.185.21
  qosClass: BestEffort
  startTime: "2022-10-06T06:04:43Z"
```

## 输入输出

> Pipeline 和 Task 可以接收 Git Repository、PR 等作为 Input，将 Image、Storage、CloudEvent 作为 Output

![image-20231006145645282](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231006145645282.png)

## 事件驱动

![image-20231006151726272](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231006151726272.png)

> EventListener

1. EventListener 的核心属性为 `Interceptor`

   - 可以监听多种类型的事件，如监听来自 GitLab 的 Push 事件
2. 当 EventListener 被创建后

   - `Tekton Trigger Controller` 会为 EventListener 创建 `Pod` 和 `Service`

   - 并启动一个 `HTTP` 服务来监听 Push 事件，类似与 `kube-proxy`
3. 在 GitLab 中设置对应的 webhook 后，后续的事件都会被 EventListener 捕获，进而触发一个 PipelineRun

# Argo CD

> *Declarative GitOps CD for Kubernetes*

## 架构

![argocd_architecture](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/argocd_architecture.webp)

1. Argo CD 被实现为 Kubernetes `Controller`
   - 该 Controller `监听`正在运行的应用，将当前的活动状态和所需的`目标状态`（From `Git Repository`）进行比较
2. 如果应用的当前的活动状态`偏离`目标状态，会被标记为 `OutOfSync`
3. Argo CD `报告并可视化差异`，同时提供自动或手动将当前状态`同步`回所需目标状态的功能
4. 在 Git Repository 中对所需目标状态所做的任何修改都可以`自动应用并反映`在指定的目标环境中

## 适用场景

1. `低成本`地实现 GitOps
2. 支持`多集群`管理

## Hello Argo CD

### 部署

```
$ k get po -n argocd
NAME                                                READY   STATUS    RESTARTS   AGE
argocd-application-controller-0                     1/1     Running   0          8m17s
argocd-applicationset-controller-6b5b54d544-xxpvs   1/1     Running   0          8m17s
argocd-dex-server-7656cd55f4-brq5g                  1/1     Running   0          8m17s
argocd-notifications-controller-746457787-nfbxk     1/1     Running   0          8m17s
argocd-redis-774dbf45f8-sj8ds                       1/1     Running   0          8m17s
argocd-repo-server-76d7968f94-8jfpx                 1/1     Running   0          8m17s
argocd-server-5db7487c98-pjq9r                      1/1     Running   0          8m17s

$ k get svc -n argocd
NAME                                      TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)                      AGE
argocd-applicationset-controller          ClusterIP   10.100.49.21     <none>        7000/TCP,8080/TCP            10m
argocd-dex-server                         ClusterIP   10.98.161.143    <none>        5556/TCP,5557/TCP,5558/TCP   10m
argocd-metrics                            ClusterIP   10.107.0.117     <none>        8082/TCP                     10m
argocd-notifications-controller-metrics   ClusterIP   10.104.103.27    <none>        9001/TCP                     10m
argocd-redis                              ClusterIP   10.106.237.84    <none>        6379/TCP                     10m
argocd-repo-server                        ClusterIP   10.101.101.122   <none>        8081/TCP,8084/TCP            10m
argocd-server                             NodePort    10.103.237.253   <none>        80:31195/TCP,443:31903/TCP   10m
argocd-server-metrics                     ClusterIP   10.101.223.125   <none>        8083/TCP                     10m
```

```
$ apiVersion: v1
data:
  password: R2p1NVZKVmhKTzRhSnllNw==
kind: Secret
metadata:
  creationTimestamp: "2022-10-06T08:18:04Z"
  name: argocd-initial-admin-secret
  namespace: argocd
  resourceVersion: "10830"
  uid: 15667c74-f92b-4aa3-a92a-0713bb65a79d
type: Opaque
```

```
$ echo -n 'R2p1NVZKVmhKTzRhSnllNw==' | base64 -d
Gju5VJVhJO4aJye7
```

![image-20231006162601165](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231006162601165.png)
