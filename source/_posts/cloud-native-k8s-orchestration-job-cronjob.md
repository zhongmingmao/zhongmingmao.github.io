---
title: 应用编排与管理 -- Job + CronJob
mathjax: false
date: 2021-07-12 02:53:01
categories:
	- Cloud Native
	- Kubernetes
	- Alibaba
tags:
	- Cloud Native
	- Kubernetes
	- Alibaba
---

# Job

## 作用

1. 创建一个或多个 Pod 来确保指定数量的 Pod 可以成功地运行终止
2. 跟踪 Pod 状态，根据配置及时重试失败的 Pod
3. 确定依赖关系，保证上一个任务运行完毕后再运行下一个任务
4. 控制任务并行度，并根据配置确保 Pod 队列大小

<!-- more -->

## 实践

## YAML 文件

```yaml job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pi
spec:
  backoffLimit: 4 # 重试次数
  template:       # Pod Selector
    spec:
      containers:
        - name: pi
          image: perl
          ports: null
          command:
            - perl
            - '-Mbignum=bpi'
            - '-wle'
            - print bpi(2000)
      restartPolicy: Never # 重启策略：Never / OnFailure / Always
```

```yaml paral-job.yml
apiVersion: batch/v1
kind: Job
metadata:
  name: parallel-job
spec:
  completions: 8
  parallelism: 2
  template:
    spec:
      containers:
        - name: show-date
          image: ubuntu
          command:
            - /bin/sh
          args:
            - '-c'
            - sleep 30; date
      restartPolicy: OnFailure
```

## 启动 minikube

```
$ minikube start --vm-driver=virtualbox --kubernetes-version=1.15.5 --image-mirror-country='cn'
😄  minikube v1.18.1 on Darwin 10.12.6
✨  Using the virtualbox driver based on user configuration
✅  Using image repository registry.cn-hangzhou.aliyuncs.com/google_containers
👍  Starting control plane node minikube in cluster minikube
🔥  Creating virtualbox VM (CPUs=2, Memory=4000MB, Disk=20000MB) ...
🐳  Preparing Kubernetes v1.15.5 on Docker 20.10.3 ...
    ▪ Generating certificates and keys ...
    ▪ Booting up control plane ...
    ▪ Configuring RBAC rules ...
🔎  Verifying Kubernetes components...
    ▪ Using image registry.cn-hangzhou.aliyuncs.com/google_containers/storage-provisioner:v4 (global image repository)
🌟  Enabled addons: storage-provisioner, default-storageclass
🏄  Done! kubectl is now configured to use "minikube" cluster and "default" namespace by default
```

## 查看 Job

自动添加 Label：**controller-uid: 9efacda0-f0a1-41e4-9a5c-de287690ecae**

```
$ kubectl apply -f job.yaml
job.batch/pi created

$ kubectl get jobs
NAME   COMPLETIONS   DURATION   AGE
pi     1/1           10s        15s

$ kubectl get jobs pi -o yaml | head -n 15
apiVersion: batch/v1
kind: Job
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"batch/v1","kind":"Job","metadata":{"annotations":{},"name":"pi","namespace":"default"},"spec":{"backoffLimit":4,"template":{"spec":{"containers":[{"command":["perl","-Mbignum=bpi","-wle","print bpi(2000)"],"image":"perl","name":"pi","ports":null}],"restartPolicy":"Never"}}}}
  creationTimestamp: "2021-07-12T00:45:44Z"
  labels:
    controller-uid: 9efacda0-f0a1-41e4-9a5c-de287690ecae
    job-name: pi
  name: pi
  namespace: default
  resourceVersion: "5330"
  selfLink: /apis/batch/v1/namespaces/default/jobs/pi
  uid: 9efacda0-f0a1-41e4-9a5c-de287690ecae
```

| COMPLETIONS   | DURATION             | AGE          |
| ------------- | -------------------- | ------------ |
| 完成 Pod 数量 | Job 实际业务运行时长 | Job 创建时长 |

## 查看 Pod

Pod 名称：**`${job-name}-${random-suffix}`**，Pod OwnerReference 为 Job

```
$  kubectl get pods
NAME       READY   STATUS      RESTARTS   AGE
pi-q5b9h   0/1     Completed   0          82s

$ kubectl get pod pi-q5b9h -o yaml | head -n 17
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: "2021-07-12T00:45:44Z"
  generateName: pi-
  labels:
    controller-uid: 9efacda0-f0a1-41e4-9a5c-de287690ecae
    job-name: pi
  name: pi-q5b9h
  namespace: default
  ownerReferences:
  - apiVersion: batch/v1
    blockOwnerDeletion: true
    controller: true
    kind: Job
    name: pi
    uid: 9efacda0-f0a1-41e4-9a5c-de287690ecae
    
$ kubectl logs pi-vjzt4
3.14159265358979323846264338327950288419716939937510582097494459230781640628620899862803482534211706798214808651...
```

## 并行运行

| Key         | Value                                  |
| ----------- | -------------------------------------- |
| completions | Job 可以运行的总次数                   |
| parallelism | 并行执行的个数（管道或缓冲队列的大小） |

```
$ kubectl apply -f parallel-job.yml
job.batch/parallel-job created

$ kubectl get pods
NAME                 READY   STATUS      RESTARTS   AGE
parallel-job-4md9g   0/1     Completed   0          53s
parallel-job-4pdvc   0/1     Completed   0          2m58s
parallel-job-d5mdr   0/1     Completed   0          57s
parallel-job-grwdp   0/1     Completed   0          2m7s
parallel-job-h2shl   0/1     Completed   0          92s
parallel-job-qxfmp   0/1     Completed   0          88s
parallel-job-rjkfc   0/1     Completed   0          2m58s
parallel-job-vcv8l   0/1     Completed   0          2m4s
```

## 架构设计

### 管理模式

![image-20210712082830228](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210712082830228.png)

### Job Controller

![image-20210712083006743](https://cloud-native-alibaba-1253868755.cos.ap-guangzhou.myqcloud.com/kubernetes/image-20210712083006743.png)



# CronJob

## YAML 文件

**CronJob -> Job -> Pod**

```yaml cronjob.yaml
apiVersion: batch/v1beta1
kind: CronJob
metadata:
  name: cron-job
spec:
  schedule: '*/3 * * * *'       # Linux Crontab
  startingDeadlineSeconds: 10   # Job 最长启动时间
  concurrencyPolicy: Allow      # 是否允许并行
  successfulJobsHistoryLimit: 3 # 允许保留历史 Job 个数
  jobTemplate:                  # Job Template
    spec:
      template:                 # Pod Template
        spec:
          containers:
            - name: hello
              image: busybox
              command:
                - /bin/sh
              args:
                - '-c'
                - date; echo Hello from the minikube
          restartPolicy: OnFailure
```

## 查看 CronJob

```
$ kubectl apply -f cronjob.yml
cronjob.batch/cron-job created

$ kubectl get cronjobs
NAME       SCHEDULE      SUSPEND   ACTIVE   LAST SCHEDULE   AGE
cron-job   */3 * * * *   False     1        7s              2m52s

$ kubectl get cronjobs cron-job -o yaml | head -n 12
apiVersion: batch/v1beta1
kind: CronJob
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"batch/v1beta1","kind":"CronJob","metadata":{"annotations":{},"name":"cron-job","namespace":"default"},"spec":{"concurrencyPolicy":"Allow","jobTemplate":{"spec":{"template":{"spec":{"containers":[{"args":["-c","date; echo Hello from the minikube"],"command":["/bin/sh"],"image":"busybox","name":"hello"}],"restartPolicy":"OnFailure"}}}},"schedule":"*/3 * * * *","startingDeadlineSeconds":10,"successfulJobsHistoryLimit":3}}
  creationTimestamp: "2021-07-12T00:21:15Z"
  name: cron-job
  namespace: default
  resourceVersion: "4084"
  selfLink: /apis/batch/v1beta1/namespaces/default/cronjobs/cron-job
  uid: cee590cc-3341-4fea-a2bd-d56337c6d6ca
```

## 查看 Job

**Job 的 OwnerReferences 为 CronJob**

```
$ kubectl get jobs
NAME                  COMPLETIONS   DURATION   AGE
cron-job-1626049440   1/1           4s         22s

$ kubectl get jobs cron-job-1626049440 -o yaml | head -n 19
apiVersion: batch/v1
kind: Job
metadata:
  creationTimestamp: "2021-07-12T00:24:05Z"
  labels:
    controller-uid: e871c373-06ff-4ae7-a6c3-333a5fdd20ed
    job-name: cron-job-1626049440
  name: cron-job-1626049440
  namespace: default
  ownerReferences:
  - apiVersion: batch/v1beta1
    blockOwnerDeletion: true
    controller: true
    kind: CronJob
    name: cron-job
    uid: cee590cc-3341-4fea-a2bd-d56337c6d6ca
  resourceVersion: "4223"
  selfLink: /apis/batch/v1/namespaces/default/jobs/cron-job-1626049440
  uid: e871c373-06ff-4ae7-a6c3-333a5fdd20ed
```

## 查看 Pod

**Pod 的 OwnerReferences 为 Job**

```
$ kubectl get pods
NAME                        READY   STATUS      RESTARTS   AGE
cron-job-1626049440-vfcb8   0/1     Completed   0          60s

$ kubectl logs cron-job-1626049440-vfcb8
Mon Jul 12 00:24:09 UTC 2021
Hello from the minikube

$ kubectl get pods cron-job-1626049440-vfcb8 -o yaml | head -n 20
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: "2021-07-12T00:24:05Z"
  generateName: cron-job-1626049440-
  labels:
    controller-uid: e871c373-06ff-4ae7-a6c3-333a5fdd20ed
    job-name: cron-job-1626049440
  name: cron-job-1626049440-vfcb8
  namespace: default
  ownerReferences:
  - apiVersion: batch/v1
    blockOwnerDeletion: true
    controller: true
    kind: Job
    name: cron-job-1626049440
    uid: e871c373-06ff-4ae7-a6c3-333a5fdd20ed
  resourceVersion: "4222"
  selfLink: /api/v1/namespaces/default/pods/cron-job-1626049440-vfcb8
  uid: 5dd30c4c-2fac-4bd0-80e4-9d1fc92d79b9
```

# 参考资料

1. [CNCF × Alibaba 云原生技术公开课](https://edu.aliyun.com/course/1651)