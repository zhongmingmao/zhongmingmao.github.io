---
title: Kubernetes - Rollout
mathjax: false
date: 2022-11-02 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/kubernetes-deployment-strategies.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Kubernetes
---

# 版本

> 使用 `Pod Template Hash` 作为版本号

```
$ k get deployments.apps -owide
NAME               READY   UP-TO-DATE   AVAILABLE   AGE   CONTAINERS   IMAGES         SELECTOR
nginx-deployment   2/2     2            2           57s   nginx        nginx:alpine   app=nginx-deployment

$ k get rs -owide
NAME                          DESIRED   CURRENT   READY   AGE    CONTAINERS   IMAGES         SELECTOR
nginx-deployment-756d6b7586   2         2         2       114s   nginx        nginx:alpine   app=nginx-deployment,pod-template-hash=756d6b7586

$ k get po -owide
NAME                                READY   STATUS    RESTARTS   AGE   IP           NODE         NOMINATED NODE   READINESS GATES
nginx-deployment-756d6b7586-dcbnz   1/1     Running   0          19s   10.10.1.73   mac-worker   <none>           <none>
nginx-deployment-756d6b7586-l9cwt   1/1     Running   0          19s   10.10.1.74   mac-worker   <none>           <none>
```

<!-- more -->

> Deployment

```
$ k describe deployments.apps nginx-deployment
Name:                   nginx-deployment
Namespace:              default
CreationTimestamp:      Wed, 28 Jun 2022 00:28:43 +0000
Labels:                 <none>
Annotations:            deployment.kubernetes.io/revision: 1
Selector:               app=nginx-deployment
Replicas:               2 desired | 2 updated | 2 total | 2 available | 0 unavailable
StrategyType:           RollingUpdate
MinReadySeconds:        0
RollingUpdateStrategy:  25% max unavailable, 25% max surge
Pod Template:
  Labels:  app=nginx-deployment
  Containers:
   nginx:
    Image:        nginx:alpine
    Port:         80/TCP
    Host Port:    0/TCP
    Environment:  <none>
    Mounts:
      /etc/nginx/conf.d from nginx-conf-vol (rw)
  Volumes:
   nginx-conf-vol:
    Type:      ConfigMap (a volume populated by a ConfigMap)
    Name:      nginx-conf
    Optional:  false
Conditions:
  Type           Status  Reason
  ----           ------  ------
  Available      True    MinimumReplicasAvailable
  Progressing    True    NewReplicaSetAvailable
OldReplicaSets:  <none>
NewReplicaSet:   nginx-deployment-756d6b7586 (2/2 replicas created)
Events:
  Type    Reason             Age    From                   Message
  ----    ------             ----   ----                   -------
  Normal  ScalingReplicaSet  2m53s  deployment-controller  Scaled up replica set nginx-deployment-756d6b7586 to 2
```

> ReplicaSet - `Controlled By:  Deployment/nginx-deployment`

```
$ k describe rs nginx-deployment-756d6b7586
Name:           nginx-deployment-756d6b7586
Namespace:      default
Selector:       app=nginx-deployment,pod-template-hash=756d6b7586
Labels:         app=nginx-deployment
                pod-template-hash=756d6b7586
Annotations:    deployment.kubernetes.io/desired-replicas: 2
                deployment.kubernetes.io/max-replicas: 3
                deployment.kubernetes.io/revision: 1
Controlled By:  Deployment/nginx-deployment
Replicas:       2 current / 2 desired
Pods Status:    2 Running / 0 Waiting / 0 Succeeded / 0 Failed
Pod Template:
  Labels:  app=nginx-deployment
           pod-template-hash=756d6b7586
  Containers:
   nginx:
    Image:        nginx:alpine
    Port:         80/TCP
    Host Port:    0/TCP
    Environment:  <none>
    Mounts:
      /etc/nginx/conf.d from nginx-conf-vol (rw)
  Volumes:
   nginx-conf-vol:
    Type:      ConfigMap (a volume populated by a ConfigMap)
    Name:      nginx-conf
    Optional:  false
Events:
  Type    Reason            Age    From                   Message
  ----    ------            ----   ----                   -------
  Normal  SuccessfulCreate  4m18s  replicaset-controller  Created pod: nginx-deployment-756d6b7586-dcbnz
  Normal  SuccessfulCreate  4m18s  replicaset-controller  Created pod: nginx-deployment-756d6b7586-l9cwt
```

> Pod - `Controlled By:  ReplicaSet/nginx-deployment-756d6b7586`

```
$ k describe po nginx-deployment-756d6b7586-dcbnz
Name:         nginx-deployment-756d6b7586-dcbnz
Namespace:    default
Priority:     0
Node:         mac-worker/192.168.191.146
Start Time:   Wed, 28 Jun 2022 00:28:43 +0000
Labels:       app=nginx-deployment
              pod-template-hash=756d6b7586
Annotations:  <none>
Status:       Running
IP:           10.10.1.73
IPs:
  IP:           10.10.1.73
Controlled By:  ReplicaSet/nginx-deployment-756d6b7586
Containers:
  nginx:
    Container ID:   docker://7174df06b5181472a9f96043221a404faa1e7112da8f4298a5dd29ab79bb7376
    Image:          nginx:alpine
    Image ID:       docker-pullable://nginx@sha256:2d194184b067db3598771b4cf326cfe6ad5051937ba1132b8b7d4b0184e0d0a6
    Port:           80/TCP
    Host Port:      0/TCP
    State:          Running
      Started:      Wed, 28 Jun 2022 00:28:43 +0000
    Ready:          True
    Restart Count:  0
    Environment:    <none>
    Mounts:
      /etc/nginx/conf.d from nginx-conf-vol (rw)
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-csdrr (ro)
Conditions:
  Type              Status
  Initialized       True
  Ready             True
  ContainersReady   True
  PodScheduled      True
Volumes:
  nginx-conf-vol:
    Type:      ConfigMap (a volume populated by a ConfigMap)
    Name:      nginx-conf
    Optional:  false
  kube-api-access-csdrr:
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
  Type    Reason     Age    From               Message
  ----    ------     ----   ----               -------
  Normal  Scheduled  6m28s  default-scheduler  Successfully assigned default/nginx-deployment-756d6b7586-dcbnz to mac-worker
  Normal  Pulled     6m29s  kubelet            Container image "nginx:alpine" already present on machine
  Normal  Created    6m29s  kubelet            Created container nginx
  Normal  Started    6m29s  kubelet            Started container nginx
```

# 滚动更新

> ConfigMap

```yaml nginx-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-conf

data:
  default.conf: |
    server {
      listen 80;
      location / {
        default_type text/plain;
        return 200
          'ver: $nginx_version\nsrv: $server_addr:$server_port\nhost: $hostname\n';
      }
    }
```

```
$ k apply -f nginx-cm.yaml
configmap/nginx-conf created
```

> Deployment V1 - `image: nginx:1.21-alpine`

```yaml nginx-deploy-v1.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deploy

spec:
  replicas: 4
  selector:
    matchLabels:
      app: nginx-deploy
  template:
    metadata:
      labels:
        app: nginx-deploy
    spec:
      volumes:
      - name: nginx-conf-vol
        configMap:
          name: nginx-conf
      containers:
      - name: nginx
        image: nginx:1.21-alpine
        ports:
        - containerPort: 80
        volumeMounts:
        - mountPath: /etc/nginx/conf.d
          name: nginx-conf-vol
```

```
$ k apply -f nginx-deploy-v1.yaml
deployment.apps/nginx-deploy created

$ k get deployments.apps -owide
NAME           READY   UP-TO-DATE   AVAILABLE   AGE   CONTAINERS   IMAGES              SELECTOR
nginx-deploy   4/4     4            4           22s   nginx        nginx:1.21-alpine   app=nginx-deploy

$ k get replicasets.apps -owide
NAME                     DESIRED   CURRENT   READY   AGE   CONTAINERS   IMAGES              SELECTOR
nginx-deploy-96dd47d99   4         4         4       39s   nginx        nginx:1.21-alpine   app=nginx-deploy,pod-template-hash=96dd47d99

$ k get po -owide
NAME                           READY   STATUS    RESTARTS   AGE   IP           NODE         NOMINATED NODE   READINESS GATES
nginx-deploy-96dd47d99-cb6pk   1/1     Running   0          54s   10.10.1.87   mac-worker   <none>           <none>
nginx-deploy-96dd47d99-l4jvp   1/1     Running   0          54s   10.10.1.85   mac-worker   <none>           <none>
nginx-deploy-96dd47d99-pqk55   1/1     Running   0          54s   10.10.1.86   mac-worker   <none>           <none>
nginx-deploy-96dd47d99-wmgnv   1/1     Running   0          54s   10.10.1.88   mac-worker   <none>           <none>

$ k exec -it nginx-deploy-96dd47d99-cb6pk -- curl 127.1
ver: 1.21.6
srv: 127.0.0.1:80
host: nginx-deploy-96dd47d99-cb6pk
```

> Deployment V2 - `image: nginx:1.22-alpine`

```yaml nginx-deploy-v2.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deploy

spec:
  minReadySeconds: 16
  replicas: 4
  selector:
    matchLabels:
      app: nginx-deploy
  template:
    metadata:
      labels:
        app: nginx-deploy
    spec:
      volumes:
      - name: nginx-conf-vol
        configMap:
          name: nginx-conf
      containers:
      - name: nginx
        image: nginx:1.22-alpine
        ports:
        - containerPort: 80
        volumeMounts:
        - mountPath: /etc/nginx/conf.d
          name: nginx-conf-vol
```

```
$ k apply -f nginx-deploy-v2.yaml
deployment.apps/nginx-deploy configured

$ k rollout status deployment nginx-deploy
Waiting for deployment "nginx-deploy" rollout to finish: 2 out of 4 new replicas have been updated...
Waiting for deployment "nginx-deploy" rollout to finish: 2 out of 4 new replicas have been updated...
Waiting for deployment "nginx-deploy" rollout to finish: 3 old replicas are pending termination...
Waiting for deployment "nginx-deploy" rollout to finish: 1 old replicas are pending termination...
Waiting for deployment "nginx-deploy" rollout to finish: 1 old replicas are pending termination...
Waiting for deployment "nginx-deploy" rollout to finish: 1 old replicas are pending termination...
Waiting for deployment "nginx-deploy" rollout to finish: 1 old replicas are pending termination...
deployment "nginx-deploy" successfully rolled out

$ k get deployments.apps -owide
NAME           READY   UP-TO-DATE   AVAILABLE   AGE   CONTAINERS   IMAGES              SELECTOR
nginx-deploy   4/4     4            4           10m   nginx        nginx:1.22-alpine   app=nginx-deploy

$ k get replicasets.apps -owide
NAME                      DESIRED   CURRENT   READY   AGE     CONTAINERS   IMAGES              SELECTOR
nginx-deploy-5b545d7468   4         4         4       3m43s   nginx        nginx:1.22-alpine   app=nginx-deploy,pod-template-hash=5b545d7468
nginx-deploy-96dd47d99    0         0         0       10m     nginx        nginx:1.21-alpine   app=nginx-deploy,pod-template-hash=96dd47d99

$ k get po -owide
NAME                            READY   STATUS    RESTARTS   AGE     IP           NODE         NOMINATED NODE   READINESS GATES
nginx-deploy-5b545d7468-69qlj   1/1     Running   0          4m1s    10.10.1.89   mac-worker   <none>           <none>
nginx-deploy-5b545d7468-gvqvp   1/1     Running   0          3m43s   10.10.1.91   mac-worker   <none>           <none>
nginx-deploy-5b545d7468-jt4lx   1/1     Running   0          4m      10.10.1.90   mac-worker   <none>           <none>
nginx-deploy-5b545d7468-nqblh   1/1     Running   0          3m43s   10.10.1.92   mac-worker   <none>           <none>

$ k exec -it nginx-deploy-5b545d7468-69qlj -- curl 127.1
ver: 1.22.1
srv: 127.0.0.1:80
host: nginx-deploy-5b545d7468-69qlj
```

> Deployment

```
$ k describe deployments.apps nginx-deploy
Name:                   nginx-deploy
Namespace:              default
CreationTimestamp:      Wed, 28 Jun 2022 00:54:35 +0000
Labels:                 <none>
Annotations:            deployment.kubernetes.io/revision: 2
Selector:               app=nginx-deploy
Replicas:               4 desired | 4 updated | 4 total | 4 available | 0 unavailable
StrategyType:           RollingUpdate
MinReadySeconds:        16
RollingUpdateStrategy:  25% max unavailable, 25% max surge
Pod Template:
  Labels:  app=nginx-deploy
  Containers:
   nginx:
    Image:        nginx:1.22-alpine
    Port:         80/TCP
    Host Port:    0/TCP
    Environment:  <none>
    Mounts:
      /etc/nginx/conf.d from nginx-conf-vol (rw)
  Volumes:
   nginx-conf-vol:
    Type:      ConfigMap (a volume populated by a ConfigMap)
    Name:      nginx-conf
    Optional:  false
Conditions:
  Type           Status  Reason
  ----           ------  ------
  Available      True    MinimumReplicasAvailable
  Progressing    True    NewReplicaSetAvailable
OldReplicaSets:  <none>
NewReplicaSet:   nginx-deploy-5b545d7468 (4/4 replicas created)
Events:
  Type    Reason             Age    From                   Message
  ----    ------             ----   ----                   -------
  Normal  ScalingReplicaSet  11m    deployment-controller  Scaled up replica set nginx-deploy-96dd47d99 to 4
  Normal  ScalingReplicaSet  5m9s   deployment-controller  Scaled up replica set nginx-deploy-5b545d7468 to 1
  Normal  ScalingReplicaSet  5m9s   deployment-controller  Scaled down replica set nginx-deploy-96dd47d99 to 3
  Normal  ScalingReplicaSet  5m8s   deployment-controller  Scaled up replica set nginx-deploy-5b545d7468 to 2
  Normal  ScalingReplicaSet  4m51s  deployment-controller  Scaled down replica set nginx-deploy-96dd47d99 to 1
  Normal  ScalingReplicaSet  4m51s  deployment-controller  Scaled up replica set nginx-deploy-5b545d7468 to 4
  Normal  ScalingReplicaSet  4m34s  deployment-controller  Scaled down replica set nginx-deploy-96dd47d99 to 0
```

> ReplicaSet

```
$ k describe replicasets.apps nginx-deploy-5b545d7468
Name:           nginx-deploy-5b545d7468
Namespace:      default
Selector:       app=nginx-deploy,pod-template-hash=5b545d7468
Labels:         app=nginx-deploy
                pod-template-hash=5b545d7468
Annotations:    deployment.kubernetes.io/desired-replicas: 4
                deployment.kubernetes.io/max-replicas: 5
                deployment.kubernetes.io/revision: 2
Controlled By:  Deployment/nginx-deploy
Replicas:       4 current / 4 desired
Pods Status:    4 Running / 0 Waiting / 0 Succeeded / 0 Failed
Pod Template:
  Labels:  app=nginx-deploy
           pod-template-hash=5b545d7468
  Containers:
   nginx:
    Image:        nginx:1.22-alpine
    Port:         80/TCP
    Host Port:    0/TCP
    Environment:  <none>
    Mounts:
      /etc/nginx/conf.d from nginx-conf-vol (rw)
  Volumes:
   nginx-conf-vol:
    Type:      ConfigMap (a volume populated by a ConfigMap)
    Name:      nginx-conf
    Optional:  false
Events:
  Type    Reason            Age    From                   Message
  ----    ------            ----   ----                   -------
  Normal  SuccessfulCreate  7m     replicaset-controller  Created pod: nginx-deploy-5b545d7468-69qlj
  Normal  SuccessfulCreate  6m59s  replicaset-controller  Created pod: nginx-deploy-5b545d7468-jt4lx
  Normal  SuccessfulCreate  6m42s  replicaset-controller  Created pod: nginx-deploy-5b545d7468-nqblh
  Normal  SuccessfulCreate  6m42s  replicaset-controller  Created pod: nginx-deploy-5b545d7468-gvqvp

$ k describe replicasets.apps nginx-deploy-96dd47d99
Name:           nginx-deploy-96dd47d99
Namespace:      default
Selector:       app=nginx-deploy,pod-template-hash=96dd47d99
Labels:         app=nginx-deploy
                pod-template-hash=96dd47d99
Annotations:    deployment.kubernetes.io/desired-replicas: 4
                deployment.kubernetes.io/max-replicas: 5
                deployment.kubernetes.io/revision: 1
Controlled By:  Deployment/nginx-deploy
Replicas:       0 current / 0 desired
Pods Status:    0 Running / 0 Waiting / 0 Succeeded / 0 Failed
Pod Template:
  Labels:  app=nginx-deploy
           pod-template-hash=96dd47d99
  Containers:
   nginx:
    Image:        nginx:1.21-alpine
    Port:         80/TCP
    Host Port:    0/TCP
    Environment:  <none>
    Mounts:
      /etc/nginx/conf.d from nginx-conf-vol (rw)
  Volumes:
   nginx-conf-vol:
    Type:      ConfigMap (a volume populated by a ConfigMap)
    Name:      nginx-conf
    Optional:  false
Events:
  Type    Reason            Age    From                   Message
  ----    ------            ----   ----                   -------
  Normal  SuccessfulCreate  14m    replicaset-controller  Created pod: nginx-deploy-96dd47d99-l4jvp
  Normal  SuccessfulCreate  14m    replicaset-controller  Created pod: nginx-deploy-96dd47d99-pqk55
  Normal  SuccessfulCreate  14m    replicaset-controller  Created pod: nginx-deploy-96dd47d99-cb6pk
  Normal  SuccessfulCreate  14m    replicaset-controller  Created pod: nginx-deploy-96dd47d99-wmgnv
  Normal  SuccessfulDelete  7m40s  replicaset-controller  Deleted pod: nginx-deploy-96dd47d99-l4jvp
  Normal  SuccessfulDelete  7m22s  replicaset-controller  Deleted pod: nginx-deploy-96dd47d99-pqk55
  Normal  SuccessfulDelete  7m22s  replicaset-controller  Deleted pod: nginx-deploy-96dd47d99-wmgnv
  Normal  SuccessfulDelete  7m5s   replicaset-controller  Deleted pod: nginx-deploy-96dd47d99-cb6pk
```

![image-20230628091147351](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230628091147351.png)

# 更新管理

> 支持 `Deployment` 和 `StatefulSet` 的`暂停`和`恢复`

```
kubectl rollout pause
kubectl rollout resume
```

> 回滚

```
$ k rollout history deployment nginx-deploy
deployment.apps/nginx-deploy
REVISION  CHANGE-CAUSE
1         <none>
2         <none>

$ k rollout history deployment nginx-deploy --revision=2
deployment.apps/nginx-deploy with revision #2
Pod Template:
  Labels:	app=nginx-deploy
	pod-template-hash=5b545d7468
  Containers:
   nginx:
    Image:	nginx:1.22-alpine
    Port:	80/TCP
    Host Port:	0/TCP
    Environment:	<none>
    Mounts:
      /etc/nginx/conf.d from nginx-conf-vol (rw)
  Volumes:
   nginx-conf-vol:
    Type:	ConfigMap (a volume populated by a ConfigMap)
    Name:	nginx-conf
    Optional:	false
```

> 使用旧的 Pod 模板，但 Revision 会递增为 3

```
$ k rollout undo deployment nginx-deploy --to-revision=1
deployment.apps/nginx-deploy rolled back

$ k rollout status deployment nginx-deploy
Waiting for deployment "nginx-deploy" rollout to finish: 2 out of 4 new replicas have been updated...
Waiting for deployment "nginx-deploy" rollout to finish: 2 out of 4 new replicas have been updated...
Waiting for deployment "nginx-deploy" rollout to finish: 3 old replicas are pending termination...
Waiting for deployment "nginx-deploy" rollout to finish: 1 old replicas are pending termination...
Waiting for deployment "nginx-deploy" rollout to finish: 1 old replicas are pending termination...
Waiting for deployment "nginx-deploy" rollout to finish: 1 old replicas are pending termination...
Waiting for deployment "nginx-deploy" rollout to finish: 1 old replicas are pending termination...
deployment "nginx-deploy" successfully rolled out

$ k get replicasets.apps -owide
NAME                      DESIRED   CURRENT   READY   AGE   CONTAINERS   IMAGES              SELECTOR
nginx-deploy-5b545d7468   0         0         0       23m   nginx        nginx:1.22-alpine   app=nginx-deploy,pod-template-hash=5b545d7468
nginx-deploy-96dd47d99    4         4         4       30m   nginx        nginx:1.21-alpine   app=nginx-deploy,pod-template-hash=96dd47d99

$ k describe deployments.apps nginx-deploy
...
Annotations:            deployment.kubernetes.io/revision: 3
....
Events:
  Type    Reason             Age                  From                   Message
  ----    ------             ----                 ----                   -------
  Normal  ScalingReplicaSet  23m                  deployment-controller  Scaled up replica set nginx-deploy-5b545d7468 to 1
  Normal  ScalingReplicaSet  23m                  deployment-controller  Scaled down replica set nginx-deploy-96dd47d99 to 3
  Normal  ScalingReplicaSet  23m                  deployment-controller  Scaled up replica set nginx-deploy-5b545d7468 to 2
  Normal  ScalingReplicaSet  23m                  deployment-controller  Scaled down replica set nginx-deploy-96dd47d99 to 1
  Normal  ScalingReplicaSet  23m                  deployment-controller  Scaled up replica set nginx-deploy-5b545d7468 to 4
  Normal  ScalingReplicaSet  22m                  deployment-controller  Scaled down replica set nginx-deploy-96dd47d99 to 0
  Normal  ScalingReplicaSet  3m15s                deployment-controller  Scaled up replica set nginx-deploy-96dd47d99 to 1
  Normal  ScalingReplicaSet  3m15s                deployment-controller  Scaled down replica set nginx-deploy-5b545d7468 to 3
  Normal  ScalingReplicaSet  3m15s                deployment-controller  Scaled up replica set nginx-deploy-96dd47d99 to 2
  Normal  ScalingReplicaSet  2m58s (x2 over 30m)  deployment-controller  Scaled up replica set nginx-deploy-96dd47d99 to 4
  Normal  ScalingReplicaSet  2m58s                deployment-controller  Scaled down replica set nginx-deploy-5b545d7468 to 1
  Normal  ScalingReplicaSet  2m40s                deployment-controller  Scaled down replica set nginx-deploy-5b545d7468 to 0

$ k rollout history deployment nginx-deploy
deployment.apps/nginx-deploy
REVISION  CHANGE-CAUSE
2         <none>
3         <none>

$ k rollout history deployment nginx-deploy --revision=3
deployment.apps/nginx-deploy with revision #3
Pod Template:
  Labels:	app=nginx-deploy
	pod-template-hash=96dd47d99
  Containers:
   nginx:
    Image:	nginx:1.21-alpine
    Port:	80/TCP
    Host Port:	0/TCP
    Environment:	<none>
    Mounts:
      /etc/nginx/conf.d from nginx-conf-vol (rw)
  Volumes:
   nginx-conf-vol:
    Type:	ConfigMap (a volume populated by a ConfigMap)
    Name:	nginx-conf
    Optional:	false
```

![image-20230628092829792](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230628092829792.png)

# Annotation

> Kubernetes 会`自动忽略`不理解的 Annotation

```yaml nginx-deploy-v1.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deploy
  annotations:
    kubernetes.io/change-cause: v1, nginx=1.21
...
```

```yaml nginx-deploy-v2.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deploy
  annotations:
    kubernetes.io/change-cause: v2, nginx=1.22
...
```

```
$ k apply -f nginx-cm.yaml -f nginx-deploy-v1.yaml
configmap/nginx-conf created
deployment.apps/nginx-deploy created

$ k rollout history deployment nginx-deploy
deployment.apps/nginx-deploy
REVISION  CHANGE-CAUSE
1         v1, nginx=1.21

$ k apply -f nginx-deploy-v2.yaml
deployment.apps/nginx-deploy configured

$ k rollout status deployment nginx-deploy
Waiting for deployment "nginx-deploy" rollout to finish: 2 out of 4 new replicas have been updated...
Waiting for deployment "nginx-deploy" rollout to finish: 2 out of 4 new replicas have been updated...
Waiting for deployment "nginx-deploy" rollout to finish: 2 out of 4 new replicas have been updated...
Waiting for deployment "nginx-deploy" rollout to finish: 1 old replicas are pending termination...
Waiting for deployment "nginx-deploy" rollout to finish: 1 old replicas are pending termination...
Waiting for deployment "nginx-deploy" rollout to finish: 1 old replicas are pending termination...
Waiting for deployment "nginx-deploy" rollout to finish: 1 old replicas are pending termination...
deployment "nginx-deploy" successfully rolled out

$ k rollout history deployment nginx-deploy
deployment.apps/nginx-deploy
REVISION  CHANGE-CAUSE
1         v1, nginx=1.21
2         v2, nginx=1.22
```

