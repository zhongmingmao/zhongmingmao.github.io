---
title: 容器编排 -- Job
mathjax: false
date: 2021-06-18 17:43:45
categories:
    - Cloud Native
    - Kubernetes
tags:
    - Cloud Native
    - Kubernetes
---

# 编排对象

1. **在线**业务：Deployment、StatefulSet、DaemonSet
2. **离线**业务：**Job、CronJob**

# Job

## job.yaml

1. Job对象不需要定义**spec.selector**（借助**UUID**）

```yaml job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pi
spec:
  template:
    spec:
      containers:
        - name: pi
          image: resouer/ubuntu-bc
          command:
            - sh
            - '-c'
            - "echo 'scale=10000; 4*a(1)' | bc -l"
      restartPolicy: Never
  backoffLimit: 4
```

<!-- more -->

## 创建Job

```
# kubectl apply -f job.yaml
job.batch/pi created

# kubectl get jobs
NAME   COMPLETIONS   DURATION   AGE
pi     0/1           32s        32s
```

## spec.selector

Job对象创建后，**Pod Template.Labels**与**Job.Selector**匹配（Kubernetes**自动**添加，因此不需要指定**spec.selector**）

```
# kubectl describe jobs/pi
Name:           pi
Namespace:      default
Selector:       controller-uid=429d2dea-e880-4ddb-83f7-0fcbc3156f24
Labels:         controller-uid=429d2dea-e880-4ddb-83f7-0fcbc3156f24
                job-name=pi
Annotations:    <none>
Parallelism:    1
Completions:    1
Start Time:     Fri, 18 Jun 2021 10:26:28 +0000
Pods Statuses:  1 Running / 0 Succeeded / 0 Failed
Pod Template:
  Labels:  controller-uid=429d2dea-e880-4ddb-83f7-0fcbc3156f24
           job-name=pi
  Containers:
   pi:
    Image:      resouer/ubuntu-bc
    Port:       <none>
    Host Port:  <none>
    Command:
      sh
      -c
      echo 'scale=10000; 4*a(1)' | bc -l
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
Events:
  Type    Reason            Age   From            Message
  ----    ------            ----  ----            -------
  Normal  SuccessfulCreate  67s   job-controller  Created pod: pi-b5q6f
```

## 查看运行结果

```
# kubectl get pods
NAME       READY   STATUS      RESTARTS   AGE
pi-b5q6f   0/1     Completed   0          5m19s

# kubectl logs pi-b5q6f
3.141592653589793238462643383279502884197169399375105820974944592307\
81640628620899862803482534211706798214808651328230664709384460955058\
...
```

## restartPolicy

| 编排对象   | restartPolicy | 备注                                                         |
| ---------- | ------------- | ------------------------------------------------------------ |
| Deployment | **Always**    |                                                              |
| Job        | **Never**     | 离线作业失败后，Job控制器会**重建一个新Pod**<br>重试次数为**spec.backoffLimit**，重建间隔10s、20s、40s等 |
|            | **OnFailure** | 离线作业失败后，Job控制器会**重启Pod里的容器**               |

## Deadline

**spec.activeDeadlineSeconds**：最长运行时间，一旦运行超时，Job的**所有Pod**都会被终止

```yaml job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pi
spec:
  template:
    spec:
      containers:
        - name: pi
          image: resouer/ubuntu-bc
          command:
            - sh
            - '-c'
            - "echo 'scale=10000; 4*a(1)' | bc -l"
      restartPolicy: Never
  backoffLimit: 5
  activeDeadlineSeconds: 10
```

```
# kubectl apply -f job.yaml
job.batch/pi created
```

```
# kubectl get jobs
NAME   COMPLETIONS   DURATION   AGE
pi     0/1           48s        49s

# kubectl get pods -w
NAME       READY   STATUS    RESTARTS   AGE
pi-87fwr   0/1     Pending   0          0s
pi-87fwr   0/1     Pending   0          0s
pi-87fwr   0/1     ContainerCreating   0          0s
pi-87fwr   1/1     Running             0          7s
pi-87fwr   1/1     Terminating         0          10s
pi-87fwr   0/1     Terminating         0          40s
pi-87fwr   0/1     Terminating         0          41s
pi-87fwr   0/1     Terminating         0          41s
```

**DeadlineExceeded**：Job was active longer than specified deadline

```
# kubectl describe jobs/pi
Name:                     pi
Namespace:                default
Selector:                 controller-uid=1b9515fb-1327-47e9-9c0b-d2d8395836ad
Labels:                   controller-uid=1b9515fb-1327-47e9-9c0b-d2d8395836ad
                          job-name=pi
Annotations:              <none>
Parallelism:              1
Completions:              1
Start Time:               Fri, 18 Jun 2021 11:05:09 +0000
Active Deadline Seconds:  10s
Pods Statuses:            0 Running / 0 Succeeded / 0 Failed
Pod Template:
  Labels:  controller-uid=1b9515fb-1327-47e9-9c0b-d2d8395836ad
           job-name=pi
  Containers:
   pi:
    Image:      resouer/ubuntu-bc
    Port:       <none>
    Host Port:  <none>
    Command:
      sh
      -c
      echo 'scale=10000; 4*a(1)' | bc -l
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
Events:
  Type     Reason            Age                From            Message
  ----     ------            ----               ----            -------
  Normal   SuccessfulCreate  80s                job-controller  Created pod: pi-87fwr
  Normal   SuccessfulDelete  70s                job-controller  Deleted pod: pi-87fwr
  Warning  DeadlineExceeded  70s (x2 over 70s)  job-controller  Job was active longer than specified deadline
```

## Batch

1. **spec.parallelism**：一个Job在任意时间最多可以启动多少个**Pod同时运行**
2. **spec.completions**：Job至少要完成的Pod数（Job的**最少完成数**）

### batch.yaml

```yaml batch.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pi
spec:
  parallelism: 2
  completions: 4
  template:
    spec:
      containers:
        - name: pi
          image: resouer/ubuntu-bc
          command:
            - sh
            - '-c'
            - echo 'scale=5000; 4*a(1)' | bc -l
      restartPolicy: Never
  backoffLimit: 4
```

### 创建Job

```
# kubectl apply -f batch.yaml
job.batch/pi created
```

### 查看Job

```
# kubectl get jobs -w
NAME   COMPLETIONS   DURATION   AGE
pi     0/4                      0s
pi     0/4           0s         0s
pi     1/4           38s        38s
pi     2/4           42s        42s
pi     3/4           71s        71s
pi     4/4           75s        75s
```

### 查看Pod

1. pi-6c7kc在**38**s完成任务，pi-wsmjs接力，在**71**s（38+33）完成任务
2. pi-9wkrl在**41**s完成任务，pi-wqj9k接力，在**75**s（41+34）完成任务

```
# kubectl get pods -w
NAME       READY   STATUS    RESTARTS   AGE
pi-6c7kc   0/1     Pending   0          0s
pi-6c7kc   0/1     Pending   0          0s
pi-9wkrl   0/1     Pending   0          0s
pi-6c7kc   0/1     ContainerCreating   0          0s
pi-9wkrl   0/1     Pending             0          0s
pi-9wkrl   0/1     ContainerCreating   0          0s
pi-6c7kc   1/1     Running             0          9s
pi-9wkrl   1/1     Running             0          11s
pi-6c7kc   0/1     Completed           0          38s

pi-wsmjs   0/1     Pending             0          0s
pi-wsmjs   0/1     Pending             0          0s
pi-wsmjs   0/1     ContainerCreating   0          0s
pi-9wkrl   0/1     Completed           0          41s

pi-wqj9k   0/1     Pending             0          0s
pi-wqj9k   0/1     Pending             0          0s
pi-wqj9k   0/1     ContainerCreating   0          1s
pi-wsmjs   1/1     Running             0          6s
pi-wqj9k   1/1     Running             0          7s
pi-wsmjs   0/1     Completed           0          33s

pi-wqj9k   0/1     Completed           0          34s
```

# CronJob

1. CronJob是一个专门用来**管理Job对象**的控制器，Cron：**分钟、小时、日、月、星期**
2. **spec.concurrencyPolicy**：某个Job还没执行完，另一个新Job可能已经产生
   - **Allow**（默认）：允许这些Job同时存在
   - **Forbid**：不会创建新Pod，该**创建周期被跳过**
   - **Replace**：新Pod替代旧Pod
3. **spec.startingDeadlineSeconds**
   - 如果某一次**Job创建失败**，这次创建会被标记为**miss**
   - 在过去startingDeadlineSeconds秒里，如果miss次数达到**100**次，那么**这个Job不会被创建执行**

## cron.yaml

```yaml cron.yaml
apiVersion: batch/v1beta1
kind: CronJob
metadata:
  name: hello
spec:
  schedule: '*/1 * * * *'
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: hello
              image: busybox
              args:
                - /bin/sh
                - '-c'
                - date; echo Hello from the Kubernetes cluster
          restartPolicy: OnFailure
```

## 创建CronJob

```
# kubectl apply -f cron.yaml
Warning: batch/v1beta1 CronJob is deprecated in v1.21+, unavailable in v1.25+; use batch/v1 CronJob
cronjob.batch/hello created

# kubectl get cronjobs
NAME    SCHEDULE      SUSPEND   ACTIVE   LAST SCHEDULE   AGE
hello   */1 * * * *   False     0        <none>          18s

# kubectl get jobs
No resources found in default namespace.

# kubectl get pods
No resources found in default namespace.
```

## 查看CronJob

```
# kubectl get cronjobs
NAME    SCHEDULE      SUSPEND   ACTIVE   LAST SCHEDULE   AGE
hello   */1 * * * *   False     0        32s             6m10s
```

```
# kubectl describe cronjob hello
Name:                          hello
Namespace:                     default
Labels:                        <none>
Annotations:                   <none>
Schedule:                      */1 * * * *
Concurrency Policy:            Allow
Suspend:                       False
Successful Job History Limit:  3
Failed Job History Limit:      1
Starting Deadline Seconds:     <unset>
Selector:                      <unset>
Parallelism:                   <unset>
Completions:                   <unset>
Pod Template:
  Labels:  <none>
  Containers:
   hello:
    Image:      busybox
    Port:       <none>
    Host Port:  <none>
    Args:
      /bin/sh
      -c
      date; echo Hello from the Kubernetes cluster
    Environment:     <none>
    Mounts:          <none>
  Volumes:           <none>
Last Schedule Time:  Fri, 18 Jun 2021 12:03:00 +0000
Active Jobs:         <none>
Events:
  Type    Reason            Age    From                Message
  ----    ------            ----   ----                -------
  Normal  SuccessfulCreate  5m37s  cronjob-controller  Created job hello-27066958
  Normal  SawCompletedJob   5m32s  cronjob-controller  Saw completed job: hello-27066958, status: Complete
  Normal  SuccessfulCreate  4m37s  cronjob-controller  Created job hello-27066959
  Normal  SawCompletedJob   4m32s  cronjob-controller  Saw completed job: hello-27066959, status: Complete
  Normal  SuccessfulCreate  3m37s  cronjob-controller  Created job hello-27066960
  Normal  SawCompletedJob   3m29s  cronjob-controller  Saw completed job: hello-27066960, status: Complete
  Normal  SuccessfulCreate  2m37s  cronjob-controller  Created job hello-27066961
  Normal  SuccessfulDelete  2m32s  cronjob-controller  Deleted job hello-27066958
  Normal  SawCompletedJob   2m32s  cronjob-controller  Saw completed job: hello-27066961, status: Complete
  Normal  SuccessfulCreate  97s    cronjob-controller  Created job hello-27066962
  Normal  SawCompletedJob   92s    cronjob-controller  Saw completed job: hello-27066962, status: Complete
  Normal  SuccessfulDelete  91s    cronjob-controller  Deleted job hello-27066959
  Normal  SuccessfulCreate  37s    cronjob-controller  Created job hello-27066963
  Normal  SawCompletedJob   31s    cronjob-controller  Saw completed job: hello-27066963, status: Complete
  Normal  SuccessfulDelete  31s    cronjob-controller  Deleted job hello-27066960
```

## 查看Job

```
# kubectl get jobs
NAME             COMPLETIONS   DURATION   AGE
hello-27066961   1/1           5s         2m44s
hello-27066962   1/1           5s         104s
hello-27066963   1/1           5s         44s
```

```
# kubectl describe job hello-27066963
Name:           hello-27066963
Namespace:      default
Selector:       controller-uid=9dbaca75-b541-4302-8b02-41cdbe4574ab
Labels:         controller-uid=9dbaca75-b541-4302-8b02-41cdbe4574ab
                job-name=hello-27066963
Annotations:    <none>
Controlled By:  CronJob/hello
Parallelism:    1
Completions:    1
Start Time:     Fri, 18 Jun 2021 12:03:00 +0000
Completed At:   Fri, 18 Jun 2021 12:03:05 +0000
Duration:       5s
Pods Statuses:  0 Running / 1 Succeeded / 0 Failed
Pod Template:
  Labels:  controller-uid=9dbaca75-b541-4302-8b02-41cdbe4574ab
           job-name=hello-27066963
  Containers:
   hello:
    Image:      busybox
    Port:       <none>
    Host Port:  <none>
    Args:
      /bin/sh
      -c
      date; echo Hello from the Kubernetes cluster
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
Events:
  Type    Reason            Age   From            Message
  ----    ------            ----  ----            -------
  Normal  SuccessfulCreate  61s   job-controller  Created pod: hello-27066963-bglrb
  Normal  Completed         56s   job-controller  Job completed
```

## 查看Pod

```
# kubectl get pods
NAME                   READY   STATUS      RESTARTS   AGE
hello-27066962-p5kdq   0/1     Completed   0          2m6s
hello-27066963-bglrb   0/1     Completed   0          66s
hello-27066964-jdrlr   0/1     Completed   0          6s
```

```
# kubectl describe pod hello-27066963-bglrb
Name:         hello-27066963-bglrb
Namespace:    default
Priority:     0
Node:         master/172.16.155.10
Start Time:   Fri, 18 Jun 2021 12:03:00 +0000
Labels:       controller-uid=9dbaca75-b541-4302-8b02-41cdbe4574ab
              job-name=hello-27066963
Annotations:  <none>
Status:       Succeeded
IP:           10.32.0.7
IPs:
  IP:           10.32.0.7
Controlled By:  Job/hello-27066963
Containers:
  hello:
    Container ID:  docker://7077911c86e7599ab71077226d2a9418563947119d6122e838661f022b1399d0
    Image:         busybox
    Image ID:      docker-pullable://busybox@sha256:930490f97e5b921535c153e0e7110d251134cc4b72bbb8133c6a5065cc68580d
    Port:          <none>
    Host Port:     <none>
    Args:
      /bin/sh
      -c
      date; echo Hello from the Kubernetes cluster
    State:          Terminated
      Reason:       Completed
      Exit Code:    0
      Started:      Fri, 18 Jun 2021 12:03:05 +0000
      Finished:     Fri, 18 Jun 2021 12:03:05 +0000
    Ready:          False
    Restart Count:  0
    Environment:    <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-nqs4d (ro)
Conditions:
  Type              Status
  Initialized       True
  Ready             False
  ContainersReady   False
  PodScheduled      True
Volumes:
  kube-api-access-nqs4d:
    Type:                    Projected (a volume that contains injected data from multiple sources)
    TokenExpirationSeconds:  3607
    ConfigMapName:           kube-root-ca.crt
    ConfigMapOptional:       <nil>
    DownwardAPI:             true
QoS Class:                   BestEffort
Node-Selectors:              <none>
Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  89s   default-scheduler  Successfully assigned default/hello-27066963-bglrb to master
  Normal  Pulling    88s   kubelet            Pulling image "busybox"
  Normal  Pulled     85s   kubelet            Successfully pulled image "busybox" in 2.967621665s
  Normal  Created    84s   kubelet            Created container hello
  Normal  Started    84s   kubelet            Started container hello
```

# 参考资料

1. [深入剖析Kubernetes](https://time.geekbang.org/column/intro/100015201)