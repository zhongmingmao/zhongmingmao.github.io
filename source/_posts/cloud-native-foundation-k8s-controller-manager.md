---
title: Kubernetes - Controller Manager
mathjax: false
date: 2022-12-05 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/kdpv.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
---

# 工作流程

> `Informer Framework` 和 `Lister Framework` 可以借助代码生成器生成

> Lister 维护了一份 API Server 的`缓存`数据（减少对 API Server 的访问压力）

> Informer 会通过 Indexer 为对象计算一个 Key，然后入队，Worker 会消费队列，并从 Lister 查询缓存数据

![image-20230724232036784](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230724232036784.png)

<!-- more -->

![image-20230724233633038](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230724233633038.png)

# 核心 Controller

> Controller Manager 是 Controller 的集合

| Controller                | Desc                                                       | API                     |
| ------------------------- | ---------------------------------------------------------- | ----------------------- |
| Job Controller            | 处理 Job                                                   |                         |
| Cronjob Controller        | 处理 Cronjob                                               |                         |
| Pod AutoScaler            | 处理 Pod 的自动扩缩容                                      | HorizontalPodAutoscaler |
| RelicaSet                 | 依据 RelicaSet Spec 创建 Pod                               |                         |
| Service Controller        | 依据 Service 的 LoadBalancer Type 创建 LB VIP              |                         |
| ServiceAccount Controller | 确保 ServiceAccount 在当前 Namespace 存在                  |                         |
| StatefulSet Controller    | 处理 StatefulSet 中的 Pod                                  |                         |
| Volume Controller         | 依据 PV Spec 创建 Volume                                   |                         |
| Resource Quota Controller | 在用户使用资源之后，更新状态                               |                         |
| Namespace Controller      | 保证 Namespace 删除时，该 Namespace 下的所有资源都先被删除 |                         |
| Replication Controller    | 创建 Replication Controller 后，负责创建 Pod               |                         |
| Node Controller           | 维护 Node 状态，处理 Evict 请求等                          |                         |
| DaemonSet Controller      | 依据 DaemonSet 创建 Pod                                    |                         |
| Deployment Controller     | 依据 Deployment Spec 创建 RelicaSet                        |                         |
| Endpoint Controller       | 依据 Service Spec 创建 Endpoint，依据 Pod IP 更新 Endpoint |                         |
| Garbage Collector         | 处理级联删除                                               |                         |

```
$ k exec -it -n kube-system kube-controller-manager-mac-k8s -- kube-controller-manager --help
...
      --controllers strings
                A list of controllers to enable. '*' enables all on-by-default controllers, 'foo' enables the controller named 'foo', '-foo' disables the controller named 'foo'.
                All controllers: attachdetach, bootstrapsigner, cloud-node-lifecycle, clusterrole-aggregation, cronjob, csrapproving, csrcleaner, csrsigning, daemonset, deployment, disruption, endpoint, endpointslice,
                endpointslicemirroring, ephemeral-volume, garbagecollector, horizontalpodautoscaling, job, namespace, nodeipam, nodelifecycle, persistentvolume-binder, persistentvolume-expander, podgc, pv-protection, pvc-protection,
                replicaset, replicationcontroller, resourcequota, root-ca-cert-publisher, route, service, serviceaccount, serviceaccount-token, statefulset, tokencleaner, ttl, ttl-after-finished
                Disabled-by-default controllers: bootstrapsigner, tokencleaner (default [*])
...
```

## Job Controller

> kubelet 会关注 restartPolicy

```yaml job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pi
spec:
  parallelism: 2
  completions: 5
  template:
    spec:
      containers:
        - name: pi
          image: perl
          command: ["perl",  "-Mbignum=bpi", "-wle", "print bpi(2000)"]
      restartPolicy: OnFailure
```

> Completed - 不再占用 CPU 和 Memory 等资源，只保留 Pod 的 manifest，调度器也不会考虑已经 Completed 的 Pod

```
$ k apply -f job.yaml
job.batch/pi created

$ k get job -owide
NAME   COMPLETIONS   DURATION   AGE    CONTAINERS   IMAGES   SELECTOR
pi     5/5           21s        102s   pi           perl     controller-uid=b89bbfc4-a2fc-410a-ab5e-859e83c4aef6

$ k get po -owide
NAME          READY   STATUS      RESTARTS   AGE   IP               NODE      NOMINATED NODE   READINESS GATES
pi--1-4fdfd   0/1     Completed   0          29s   192.168.185.19   mac-k8s   <none>           <none>
pi--1-76mmd   0/1     Completed   0          44s   192.168.185.15   mac-k8s   <none>           <none>
pi--1-cxgrn   0/1     Completed   0          38s   192.168.185.17   mac-k8s   <none>           <none>
pi--1-d4n7b   0/1     Completed   0          44s   192.168.185.16   mac-k8s   <none>           <none>
pi--1-fgxbs   0/1     Completed   0          36s   192.168.185.18   mac-k8s   <none>           <none>

$ k logs pi--1-4fdfd
3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865132823066470938446095505822317253594081284811174502841027019385211055596446229489549303819644288109756659334461284756482337867831652712019091456485669234603486104543266482133936072602491412737245870066063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094330572703657595919530921861173819326117931051185480744623799627495673518857527248912279381830119491298336733624406566430860213949463952247371907021798609437027705392171762931767523846748184676694051320005681271452635608277857713427577896091736371787214684409012249534301465495853710507922796892589235420199561121290219608640344181598136297747713099605187072113499999983729780499510597317328160963185950244594553469083026425223082533446850352619311881710100031378387528865875332083814206171776691473035982534904287554687311595628638823537875937519577818577805321712268066130019278766111959092164201989380952572010654858632788659361533818279682303019520353018529689957736225994138912497217752834791315155748572424541506959508295331168617278558890750983817546374649393192550604009277016711390098488240128583616035637076601047101819429555961989467678374494482553797747268471040475346462080466842590694912933136770289891521047521620569660240580381501935112533824300355876402474964732639141992726042699227967823547816360093417216412199245863150302861829745557067498385054945885869269956909272107975093029553211653449872027559602364806654991198818347977535663698074265425278625518184175746728909777727938000816470600161452491921732172147723501414419735685481613611573525521334757418494684385233239073941433345477624168625189835694855620992192221842725502542568876717904946016534668049886272327917860857843838279679766814541009538837863609506800642251252051173929848960841284886269456042419652850222106611863067442786220391949450471237137869609563643719172874677646575739624138908658326459958133904780275901
```

> Job - `k get job pi -oyaml`

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"batch/v1","kind":"Job","metadata":{"annotations":{},"name":"pi","namespace":"default"},"spec":{"completions":5,"parallelism":2,"template":{"spec":{"containers":[{"command":["perl","-Mbignum=bpi","-wle","print bpi(2000)"],"image":"perl","name":"pi"}],"restartPolicy":"OnFailure"}}}}
  creationTimestamp: "2022-07-24T16:46:40Z"
  generation: 1
  labels:
    controller-uid: b89bbfc4-a2fc-410a-ab5e-859e83c4aef6
    job-name: pi
  name: pi
  namespace: default
  resourceVersion: "27704"
  uid: b89bbfc4-a2fc-410a-ab5e-859e83c4aef6
spec:
  backoffLimit: 6
  completionMode: NonIndexed
  completions: 5
  parallelism: 2
  selector:
    matchLabels:
      controller-uid: b89bbfc4-a2fc-410a-ab5e-859e83c4aef6
  suspend: false
  template:
    metadata:
      creationTimestamp: null
      labels:
        controller-uid: b89bbfc4-a2fc-410a-ab5e-859e83c4aef6
        job-name: pi
    spec:
      containers:
      - command:
        - perl
        - -Mbignum=bpi
        - -wle
        - print bpi(2000)
        image: perl
        imagePullPolicy: Always
        name: pi
        resources: {}
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
      dnsPolicy: ClusterFirst
      restartPolicy: OnFailure
      schedulerName: default-scheduler
      securityContext: {}
      terminationGracePeriodSeconds: 30
status:
  completionTime: "2022-07-24T16:47:01Z"
  conditions:
  - lastProbeTime: "2022-07-24T16:47:01Z"
    lastTransitionTime: "2022-07-24T16:47:01Z"
    status: "True"
    type: Complete
  startTime: "2022-07-24T16:46:40Z"
  succeeded: 5
```

## StatefulSet Controller

> `clusterIP: None` -- `Headless Service` -- 不需要`负载均衡`，需要直达每个 Pod

```yaml statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: nginx-sts
spec:
  serviceName: nginx-sts
  replicas: 1
  selector:
    matchLabels:
      app: nginx-sts
  template:
    metadata:
      labels:
        app: nginx-sts
    spec:
      containers:
        - name: nginx
          image: nginx
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-sts
  labels:
    app: nginx-sts
spec:
  ports:
    - port: 80
  clusterIP: None
  selector:
    app: nginx-sts
```

```
$ k create -f statefulset.yaml
statefulset.apps/nginx-sts created
service/nginx-sts created

$ k get sts -owide
NAME        READY   AGE    CONTAINERS   IMAGES
nginx-sts   1/1     2m1s   nginx        nginx

$ k get svc -owide
NAME         TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE    SELECTOR
kubernetes   ClusterIP   10.96.0.1    <none>        443/TCP   2d2h   <none>
nginx-sts    ClusterIP   None         <none>        80/TCP    33s    app=nginx-sts

$ k get po -owide
NAME          READY   STATUS    RESTARTS   AGE   IP              NODE      NOMINATED NODE   READINESS GATES
nginx-sts-0   1/1     Running   0          17s   192.168.185.8   mac-k8s   <none>           <none>

$ k scale sts nginx-sts --replicas=2
statefulset.apps/nginx-sts scaled

$ k get po -owide
NAME          READY   STATUS    RESTARTS   AGE   IP              NODE      NOMINATED NODE   READINESS GATES
nginx-sts-0   1/1     Running   0          14m   192.168.185.8   mac-k8s   <none>           <none>
nginx-sts-1   1/1     Running   0          14s   192.168.185.9   mac-k8s   <none>           <none>
```

> Pod - `k get po nginx-sts-0 -oyaml` - `controller-revision-hash`

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    cni.projectcalico.org/containerID: 27244d8a2b0b1b8ba46fc2fd5cf5fb3280fe91feb83939652895da47d6414f0d
    cni.projectcalico.org/podIP: 192.168.185.8/32
    cni.projectcalico.org/podIPs: 192.168.185.8/32
  creationTimestamp: "2022-07-25T14:05:48Z"
  generateName: nginx-sts-
  labels:
    app: nginx-sts
    controller-revision-hash: nginx-sts-6798d68dcd
    statefulset.kubernetes.io/pod-name: nginx-sts-0
  name: nginx-sts-0
  namespace: default
  ownerReferences:
  - apiVersion: apps/v1
    blockOwnerDeletion: true
    controller: true
    kind: StatefulSet
    name: nginx-sts
    uid: 5eeb9341-f0f7-40eb-9885-130557e64e78
  resourceVersion: "4752"
  uid: a3a88fee-d31d-4363-b026-4e3110c16db5
spec:
  containers:
  - image: nginx
    imagePullPolicy: Always
    name: nginx
    resources: {}
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-45cfx
      readOnly: true
  dnsPolicy: ClusterFirst
  enableServiceLinks: true
  hostname: nginx-sts-0
  nodeName: mac-k8s
  preemptionPolicy: PreemptLowerPriority
  priority: 0
  restartPolicy: Always
  schedulerName: default-scheduler
  securityContext: {}
  serviceAccount: default
  serviceAccountName: default
  subdomain: nginx-sts
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
  - name: kube-api-access-45cfx
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
    lastTransitionTime: "2022-07-25T14:05:48Z"
    status: "True"
    type: Initialized
  - lastProbeTime: null
    lastTransitionTime: "2022-07-25T14:05:52Z"
    status: "True"
    type: Ready
  - lastProbeTime: null
    lastTransitionTime: "2022-07-25T14:05:52Z"
    status: "True"
    type: ContainersReady
  - lastProbeTime: null
    lastTransitionTime: "2022-07-25T14:05:48Z"
    status: "True"
    type: PodScheduled
  containerStatuses:
  - containerID: docker://d41d2f9a90ebd09689cda7c788baf0356abd5131cc8eb17646f9f727bc526896
    image: nginx:latest
    imageID: docker-pullable://nginx@sha256:08bc36ad52474e528cc1ea3426b5e3f4bad8a130318e3140d6cfe29c8892c7ef
    lastState: {}
    name: nginx
    ready: true
    restartCount: 0
    started: true
    state:
      running:
        startedAt: "2022-07-25T14:05:51Z"
  hostIP: 192.168.191.153
  phase: Running
  podIP: 192.168.185.8
  podIPs:
  - ip: 192.168.185.8
  qosClass: BestEffort
  startTime: "2022-07-25T14:05:48Z"
```

> `hostname` + `subdomain` - CodeDNS 会新增 DNS A 记录

> 1. nginx-sts-1.nginx-sts
> 2. nginx-sts-1.nginx-sts.default
> 3. nginx-sts-1.nginx-sts.default.svc.cluster.local

```
$ k get po -owide
NAME          READY   STATUS    RESTARTS   AGE   IP              NODE      NOMINATED NODE   READINESS GATES
nginx-sts-0   1/1     Running   0          29m   192.168.185.8   mac-k8s   <none>           <none>
nginx-sts-1   1/1     Running   0          14m   192.168.185.9   mac-k8s   <none>           <none>

$ k exec nginx-sts-0 -- curl -vsI nginx-sts-1.nginx-sts:80
*   Trying 192.168.185.9:80...
* Connected to nginx-sts-1.nginx-sts (192.168.185.9) port 80 (#0)
> HEAD / HTTP/1.1
> Host: nginx-sts-1.nginx-sts
> User-Agent: curl/7.88.1
> Accept: */*
>
< HTTP/1.1 200 OK
< Server: nginx/1.25.1
< Date: Tue, 25 Jul 2023 14:34:59 GMT
< Content-Type: text/html
< Content-Length: 615
< Last-Modified: Tue, 13 Jun 2023 15:08:10 GMT
< Connection: keep-alive
< ETag: "6488865a-267"
< Accept-Ranges: bytes
<
* Connection #0 to host nginx-sts-1.nginx-sts left intact
HTTP/1.1 200 OK
Server: nginx/1.25.1
Date: Tue, 25 Jul 2023 14:34:59 GMT
Content-Type: text/html
Content-Length: 615
Last-Modified: Tue, 13 Jun 2023 15:08:10 GMT
Connection: keep-alive
ETag: "6488865a-267"
Accept-Ranges: bytes

$ k exec nginx-sts-0 -- curl -vsI nginx-sts-1.nginx-sts.default:80
*   Trying 192.168.185.9:80...
* Connected to nginx-sts-1.nginx-sts.default (192.168.185.9) port 80 (#0)
> HEAD / HTTP/1.1
> Host: nginx-sts-1.nginx-sts.default
> User-Agent: curl/7.88.1
> Accept: */*
>
< HTTP/1.1 200 OK
< Server: nginx/1.25.1
< Date: Tue, 25 Jul 2023 14:35:55 GMT
< Content-Type: text/html
< Content-Length: 615
< Last-Modified: Tue, 13 Jun 2023 15:08:10 GMT
< Connection: keep-alive
< ETag: "6488865a-267"
< Accept-Ranges: bytes
<
* Connection #0 to host nginx-sts-1.nginx-sts.default left intact
HTTP/1.1 200 OK
Server: nginx/1.25.1
Date: Tue, 25 Jul 2023 14:35:55 GMT
Content-Type: text/html
Content-Length: 615
Last-Modified: Tue, 13 Jun 2023 15:08:10 GMT
Connection: keep-alive
ETag: "6488865a-267"
Accept-Ranges: bytes

$ k exec nginx-sts-0 -- curl -vsI nginx-sts-1.nginx-sts.default.svc.cluster.local:80
*   Trying 192.168.185.9:80...
* Connected to nginx-sts-1.nginx-sts.default.svc.cluster.local (192.168.185.9) port 80 (#0)
> HEAD / HTTP/1.1
> Host: nginx-sts-1.nginx-sts.default.svc.cluster.local
> User-Agent: curl/7.88.1
> Accept: */*
>
< HTTP/1.1 200 OK
< Server: nginx/1.25.1
< Date: Tue, 25 Jul 2023 14:36:11 GMT
< Content-Type: text/html
< Content-Length: 615
< Last-Modified: Tue, 13 Jun 2023 15:08:10 GMT
< Connection: keep-alive
< ETag: "6488865a-267"
< Accept-Ranges: bytes
<
* HTTP/1.1 200 OK
Server: nginx/1.25.1
Date: Tue, 25 Jul 2023 14:36:11 GMT
Content-Type: text/html
Content-Length: 615
Last-Modified: Tue, 13 Jun 2023 15:08:10 GMT
Connection: keep-alive
ETag: "6488865a-267"
Accept-Ranges: bytes
```

> StatefulSet - `k get sts nginx-sts -oyaml`

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  creationTimestamp: "2022-07-25T14:05:48Z"
  generation: 2
  name: nginx-sts
  namespace: default
  resourceVersion: "6240"
  uid: 5eeb9341-f0f7-40eb-9885-130557e64e78
spec:
  podManagementPolicy: OrderedReady
  replicas: 2
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      app: nginx-sts
  serviceName: nginx-sts
  template:
    metadata:
      creationTimestamp: null
      labels:
        app: nginx-sts
    spec:
      containers:
      - image: nginx
        imagePullPolicy: Always
        name: nginx
        resources: {}
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
      dnsPolicy: ClusterFirst
      restartPolicy: Always
      schedulerName: default-scheduler
      securityContext: {}
      terminationGracePeriodSeconds: 30
  updateStrategy:
    rollingUpdate:
      partition: 0
    type: RollingUpdate
status:
  availableReplicas: 2
  collisionCount: 0
  currentReplicas: 2
  currentRevision: nginx-sts-6798d68dcd
  observedGeneration: 2
  readyReplicas: 2
  replicas: 2
  updateRevision: nginx-sts-6798d68dcd
  updatedReplicas: 2
```

> 滚动发布策略与 `Deployment` 有差异

```yaml
  updateStrategy:
    rollingUpdate:
      partition: 0
    type: RollingUpdate
```

> StatefulSet 支持 `volumeClaimTemplates`

## Namespace Controller

> Namespace 与 Namespace 下的其它对象是`松耦合`

> 初始化工作队列（指数退让）

```go namespace_controller.go
// NewNamespaceController creates a new NamespaceController
func NewNamespaceController(
	ctx context.Context,
	kubeClient clientset.Interface,
	metadataClient metadata.Interface,
	discoverResourcesFn func() ([]*metav1.APIResourceList, error),
	namespaceInformer coreinformers.NamespaceInformer,
	resyncPeriod time.Duration,
	finalizerToken v1.FinalizerName) *NamespaceController {

	// create the controller so we can inject the enqueue function
	namespaceController := &NamespaceController{
		queue:                      workqueue.NewNamedRateLimitingQueue(nsControllerRateLimiter(), "namespace"),
		namespacedResourcesDeleter: deletion.NewNamespacedResourcesDeleter(ctx, kubeClient.CoreV1().Namespaces(), metadataClient, kubeClient.CoreV1(), discoverResourcesFn, finalizerToken),
	}

	// configure the namespace informer event handlers
	namespaceInformer.Informer().AddEventHandlerWithResyncPeriod(
		cache.ResourceEventHandlerFuncs{
			AddFunc: func(obj interface{}) {
				namespace := obj.(*v1.Namespace)
				namespaceController.enqueueNamespace(namespace)
			},
			UpdateFunc: func(oldObj, newObj interface{}) {
				namespace := newObj.(*v1.Namespace)
				namespaceController.enqueueNamespace(namespace)
			},
		},
		resyncPeriod,
	)
	namespaceController.lister = namespaceInformer.Lister()
	namespaceController.listerSynced = namespaceInformer.Informer().HasSynced

	return namespaceController
}
```

> 生产者 -- AddFunc 和 UpdateFunc 都会执行 enqueue

```go namespace_controller.go
// enqueueNamespace adds an object to the controller work queue
// obj could be an *v1.Namespace, or a DeletionFinalStateUnknown item.
func (nm *NamespaceController) enqueueNamespace(obj interface{}) {
	key, err := controller.KeyFunc(obj)
	if err != nil {
		utilruntime.HandleError(fmt.Errorf("Couldn't get key for object %+v: %v", obj, err))
		return
	}

	namespace := obj.(*v1.Namespace)
	// don't queue if we aren't deleted
	if namespace.DeletionTimestamp == nil || namespace.DeletionTimestamp.IsZero() {
		return
	}

	// delay processing namespace events to allow HA api servers to observe namespace deletion,
	// and HA etcd servers to observe last minute object creations inside the namespace
	nm.queue.AddAfter(key, namespaceDeletionGracePeriod)
}
```

> 消费者 - syncNamespaceFromKey

```go namespace_controller.go
// worker processes the queue of namespace objects.
// Each namespace can be in the queue at most once.
// The system ensures that no two workers can process
// the same namespace at the same time.
func (nm *NamespaceController) worker(ctx context.Context) {
	workFunc := func(ctx context.Context) bool {
		key, quit := nm.queue.Get()
		if quit {
			return true
		}
		defer nm.queue.Done(key)

		err := nm.syncNamespaceFromKey(ctx, key.(string))
		if err == nil {
			// no error, forget this entry and return
			nm.queue.Forget(key)
			return false
		}

		if estimate, ok := err.(*deletion.ResourcesRemainingError); ok {
			t := estimate.Estimate/2 + 1
			klog.FromContext(ctx).V(4).Info("Content remaining in namespace", "namespace", key, "waitSeconds", t)
			nm.queue.AddAfter(key, time.Duration(t)*time.Second)
		} else {
			// rather than wait for a full resync, re-add the namespace to the queue to be processed
			nm.queue.AddRateLimited(key)
			utilruntime.HandleError(fmt.Errorf("deletion of namespace %v failed: %v", key, err))
		}
		return false
	}
	for {
		quit := workFunc(ctx)

		if quit {
			return
		}
	}
}
```

```go namespace_controller.go
// syncNamespaceFromKey looks for a namespace with the specified key in its store and synchronizes it
func (nm *NamespaceController) syncNamespaceFromKey(ctx context.Context, key string) (err error) {
	startTime := time.Now()
	logger := klog.FromContext(ctx)
	defer func() {
		logger.V(4).Info("Finished syncing namespace", "namespace", key, "duration", time.Since(startTime))
	}()

	namespace, err := nm.lister.Get(key)
	if errors.IsNotFound(err) {
		logger.Info("Namespace has been deleted", "namespace", key)
		return nil
	}
	if err != nil {
		utilruntime.HandleError(fmt.Errorf("Unable to retrieve namespace %v from store: %v", key, err))
		return err
	}
	return nm.namespacedResourcesDeleter.Delete(ctx, namespace.Name)
}
```

```go namespace_controller.go
// Run starts observing the system with the specified number of workers.
func (nm *NamespaceController) Run(ctx context.Context, workers int) {
	defer utilruntime.HandleCrash()
	defer nm.queue.ShutDown()
	logger := klog.FromContext(ctx)
	logger.Info("Starting namespace controller")
	defer logger.Info("Shutting down namespace controller")

	if !cache.WaitForNamedCacheSync("namespace", ctx.Done(), nm.listerSynced) {
		return
	}

	logger.V(5).Info("Starting workers of namespace controller")
	for i := 0; i < workers; i++ {
		go wait.UntilWithContext(ctx, nm.worker, time.Second)
	}
	<-ctx.Done()
}
```

> namespacedResourcesDeleter - discoverResourcesFn

> 等价于执行 `k api-resources` 后执行过滤

```go core.go
discoverResourcesFn := namespaceKubeClient.Discovery().ServerPreferredNamespacedResources
```

```go discovery_client.go
// ServerPreferredNamespacedResources uses the provided discovery interface to look up preferred namespaced resources
func ServerPreferredNamespacedResources(d DiscoveryInterface) ([]*metav1.APIResourceList, error) {
	all, err := ServerPreferredResources(d)
	return FilteredBy(ResourcePredicateFunc(func(groupVersion string, r *metav1.APIResource) bool {
		return r.Namespaced
	}), all), err
}
```

```go namespaced_resources_deleter.go
// Delete deletes all resources in the given namespace.
// Before deleting resources:
//   - It ensures that deletion timestamp is set on the
//     namespace (does nothing if deletion timestamp is missing).
//   - Verifies that the namespace is in the "terminating" phase
//     (updates the namespace phase if it is not yet marked terminating)
//
// After deleting the resources:
// * It removes finalizer token from the given namespace.
//
// Returns an error if any of those steps fail.
// Returns ResourcesRemainingError if it deleted some resources but needs
// to wait for them to go away.
// Caller is expected to keep calling this until it succeeds.
func (d *namespacedResourcesDeleter) Delete(ctx context.Context, nsName string) error {
	// Multiple controllers may edit a namespace during termination
	// first get the latest state of the namespace before proceeding
	// if the namespace was deleted already, don't do anything
	namespace, err := d.nsClient.Get(context.TODO(), nsName, metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			return nil
		}
		return err
	}
	if namespace.DeletionTimestamp == nil {
		return nil
	}

	klog.FromContext(ctx).V(5).Info("Namespace controller - syncNamespace", "namespace", namespace.Name, "finalizerToken", d.finalizerToken)

	// ensure that the status is up to date on the namespace
	// if we get a not found error, we assume the namespace is truly gone
	namespace, err = d.retryOnConflictError(namespace, d.updateNamespaceStatusFunc)
	if err != nil {
		if errors.IsNotFound(err) {
			return nil
		}
		return err
	}

	// the latest view of the namespace asserts that namespace is no longer deleting..
	if namespace.DeletionTimestamp.IsZero() {
		return nil
	}

	// return if it is already finalized.
	if finalized(namespace) {
		return nil
	}

	// there may still be content for us to remove
	estimate, err := d.deleteAllContent(ctx, namespace)
	if err != nil {
		return err
	}
	if estimate > 0 {
		return &ResourcesRemainingError{estimate}
	}

	// we have removed content, so mark it finalized by us
	_, err = d.retryOnConflictError(namespace, d.finalizeNamespace)
	if err != nil {
		// in normal practice, this should not be possible, but if a deployment is running
		// two controllers to do namespace deletion that share a common finalizer token it's
		// possible that a not found could occur since the other controller would have finished the delete.
		if errors.IsNotFound(err) {
			return nil
		}
		return err
	}
	return nil
}
```

## Replication Controller

> RelicaSet 的前身，因为对象采用了控制器的命名方式，容易混淆（`Replication Controller Controller` ?）

## Node Controller

> node_lifecycle_controller.go

> 主要关注两类事件：`NodeUpdate` 和 `PodUpdate`，关注变更后的 Pod 和 Node 的`匹配`情况，决定是否需要`驱逐`

## DaemonSet Controller

> DaemonSet 一般用于基础组件

```
$ k get ds -A
NAMESPACE       NAME              DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR            AGE
calico-system   calico-node       1         1         1       1            1           kubernetes.io/os=linux   2d3h
calico-system   csi-node-driver   1         1         1       1            1           kubernetes.io/os=linux   2d3h
default         nginx-ds          1         1         1       1            1           <none>                   7m49s
kube-system     kube-proxy        1         1         1       1            1           kubernetes.io/os=linux   2d3h
```

> 与 Deployment 相比，缺少 RelicaSet，而采用 `ControllerRevision`

```yaml daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: nginx-ds
spec:
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx
```

```
$ k apply -f daemonset.yaml
daemonset.apps/nginx-ds created

$ k get ds -owide
NAME       DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE   CONTAINERS   IMAGES   SELECTOR
nginx-ds   1         1         1       1            1           <none>          15s   nginx        nginx    app=nginx

$ k describe ds nginx-ds
Name:           nginx-ds
Selector:       app=nginx
Node-Selector:  <none>
Labels:         <none>
Annotations:    deprecated.daemonset.template.generation: 1
Desired Number of Nodes Scheduled: 1
Current Number of Nodes Scheduled: 1
Number of Nodes Scheduled with Up-to-date Pods: 1
Number of Nodes Scheduled with Available Pods: 1
Number of Nodes Misscheduled: 0
Pods Status:  1 Running / 0 Waiting / 0 Succeeded / 0 Failed
Pod Template:
  Labels:  app=nginx
  Containers:
   nginx:
    Image:        nginx
    Port:         <none>
    Host Port:    <none>
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
Events:
  Type    Reason            Age   From                  Message
  ----    ------            ----  ----                  -------
  Normal  SuccessfulCreate  62s   daemonset-controller  Created pod: nginx-ds-8frrn

$ k get po -owide
NAME             READY   STATUS    RESTARTS   AGE   IP               NODE      NOMINATED NODE   READINESS GATES
nginx-ds-8frrn   1/1     Running   0          30s   192.168.185.10   mac-k8s   <none>           <none>
```

> Pod - `k get po nginx-ds-8frrn -oyaml` - `controller-revision-hash`

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    cni.projectcalico.org/containerID: 2566845ec5e604a625b3373bc5beaa2e5292caac73cc933894891b3006bb7f52
    cni.projectcalico.org/podIP: 192.168.185.10/32
    cni.projectcalico.org/podIPs: 192.168.185.10/32
  creationTimestamp: "2022-07-25T15:18:32Z"
  generateName: nginx-ds-
  labels:
    app: nginx
    controller-revision-hash: 6799fc88d8
    pod-template-generation: "1"
  name: nginx-ds-8frrn
  namespace: default
  ownerReferences:
  - apiVersion: apps/v1
    blockOwnerDeletion: true
    controller: true
    kind: DaemonSet
    name: nginx-ds
    uid: 843909c4-2260-4709-8bcb-5855c5d06601
  resourceVersion: "12202"
  uid: 0eb4c50d-1d9a-42b4-a444-93540673afdc
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchFields:
          - key: metadata.name
            operator: In
            values:
            - mac-k8s
  containers:
  - image: nginx
    imagePullPolicy: Always
    name: nginx
    resources: {}
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-jjxs6
      readOnly: true
  dnsPolicy: ClusterFirst
  enableServiceLinks: true
  nodeName: mac-k8s
  preemptionPolicy: PreemptLowerPriority
  priority: 0
  restartPolicy: Always
  schedulerName: default-scheduler
  securityContext: {}
  serviceAccount: default
  serviceAccountName: default
  terminationGracePeriodSeconds: 30
  tolerations:
  - effect: NoExecute
    key: node.kubernetes.io/not-ready
    operator: Exists
  - effect: NoExecute
    key: node.kubernetes.io/unreachable
    operator: Exists
  - effect: NoSchedule
    key: node.kubernetes.io/disk-pressure
    operator: Exists
  - effect: NoSchedule
    key: node.kubernetes.io/memory-pressure
    operator: Exists
  - effect: NoSchedule
    key: node.kubernetes.io/pid-pressure
    operator: Exists
  - effect: NoSchedule
    key: node.kubernetes.io/unschedulable
    operator: Exists
  volumes:
  - name: kube-api-access-jjxs6
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
    lastTransitionTime: "2022-07-25T15:18:32Z"
    status: "True"
    type: Initialized
  - lastProbeTime: null
    lastTransitionTime: "2022-07-25T15:18:36Z"
    status: "True"
    type: Ready
  - lastProbeTime: null
    lastTransitionTime: "2022-07-25T15:18:36Z"
    status: "True"
    type: ContainersReady
  - lastProbeTime: null
    lastTransitionTime: "2022-07-25T15:18:32Z"
    status: "True"
    type: PodScheduled
  containerStatuses:
  - containerID: docker://caa0d4eed2a55d5cdf5a02d8ef034c1d9eae656a5707220715145fcd2e6bbcca
    image: nginx:latest
    imageID: docker-pullable://nginx@sha256:08bc36ad52474e528cc1ea3426b5e3f4bad8a130318e3140d6cfe29c8892c7ef
    lastState: {}
    name: nginx
    ready: true
    restartCount: 0
    started: true
    state:
      running:
        startedAt: "2022-07-25T15:18:35Z"
  hostIP: 192.168.191.153
  phase: Running
  podIP: 192.168.185.10
  podIPs:
  - ip: 192.168.185.10
  qosClass: BestEffort
  startTime: "2022-07-25T15:18:32Z"
```

> 亲和性

```yaml
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchFields:
          - key: metadata.name
            operator: In
            values:
            - mac-k8s
```

> 容忍度比 `Deployment` 高（没有指定 `tolerationSeconds`，即不会被驱逐）

```yaml
  tolerations:
  - effect: NoExecute
    key: node.kubernetes.io/not-ready
    operator: Exists
  - effect: NoExecute
    key: node.kubernetes.io/unreachable
    operator: Exists
  - effect: NoSchedule
    key: node.kubernetes.io/disk-pressure
    operator: Exists
  - effect: NoSchedule
    key: node.kubernetes.io/memory-pressure
    operator: Exists
  - effect: NoSchedule
    key: node.kubernetes.io/pid-pressure
    operator: Exists
  - effect: NoSchedule
    key: node.kubernetes.io/unschedulable
    operator: Exists
```

> DaemonSet - `k get ds nginx-ds -oyaml`

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  annotations:
    deprecated.daemonset.template.generation: "1"
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"apps/v1","kind":"DaemonSet","metadata":{"annotations":{},"name":"nginx-ds","namespace":"default"},"spec":{"selector":{"matchLabels":{"app":"nginx"}},"template":{"metadata":{"labels":{"app":"nginx"}},"spec":{"containers":[{"image":"nginx","name":"nginx"}]}}}}
  creationTimestamp: "2022-07-25T15:18:32Z"
  generation: 1
  name: nginx-ds
  namespace: default
  resourceVersion: "12203"
  uid: 843909c4-2260-4709-8bcb-5855c5d06601
spec:
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      creationTimestamp: null
      labels:
        app: nginx
    spec:
      containers:
      - image: nginx
        imagePullPolicy: Always
        name: nginx
        resources: {}
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
      dnsPolicy: ClusterFirst
      restartPolicy: Always
      schedulerName: default-scheduler
      securityContext: {}
      terminationGracePeriodSeconds: 30
  updateStrategy:
    rollingUpdate:
      maxSurge: 0
      maxUnavailable: 1
    type: RollingUpdate
status:
  currentNumberScheduled: 1
  desiredNumberScheduled: 1
  numberAvailable: 1
  numberMisscheduled: 0
  numberReady: 1
  observedGeneration: 1
  updatedNumberScheduled: 1
```

> `Deployment -> RelicaSet -> Pod` 来实现 `RollingUpdate`

> 新对象实现 `RollingUpdate` 不再依赖于 `RelicaSet` 的 `Hash`，而是通过 `ControllerRevision` 对象

```yaml
  updateStrategy:
    rollingUpdate:
      maxSurge: 0
      maxUnavailable: 1
    type: RollingUpdate
```

```
$ k api-resources --api-group='apps'
NAME                  SHORTNAMES   APIVERSION   NAMESPACED   KIND
controllerrevisions                apps/v1      true         ControllerRevision
daemonsets            ds           apps/v1      true         DaemonSet
deployments           deploy       apps/v1      true         Deployment
replicasets           rs           apps/v1      true         ReplicaSet
statefulsets          sts          apps/v1      true         StatefulSet

$ k get controllerrevisions.apps
NAME                   CONTROLLER                   REVISION   AGE
nginx-ds-6799fc88d8    daemonset.apps/nginx-ds      1          19m
nginx-sts-6798d68dcd   statefulset.apps/nginx-sts   1          13s
```

> ControllerRevision -- 将版本进行了`抽象`和`统一`

```yaml nginx-ds-6799fc88d8
apiVersion: apps/v1
data:
  spec:
    template:
      $patch: replace
      metadata:
        creationTimestamp: null
        labels:
          app: nginx
      spec:
        containers:
        - image: nginx
          imagePullPolicy: Always
          name: nginx
          resources: {}
          terminationMessagePath: /dev/termination-log
          terminationMessagePolicy: File
        dnsPolicy: ClusterFirst
        restartPolicy: Always
        schedulerName: default-scheduler
        securityContext: {}
        terminationGracePeriodSeconds: 30
kind: ControllerRevision
metadata:
  annotations:
    deprecated.daemonset.template.generation: "1"
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"apps/v1","kind":"DaemonSet","metadata":{"annotations":{},"name":"nginx-ds","namespace":"default"},"spec":{"selector":{"matchLabels":{"app":"nginx"}},"template":{"metadata":{"labels":{"app":"nginx"}},"spec":{"containers":[{"image":"nginx","name":"nginx"}]}}}}
  creationTimestamp: "2022-07-25T15:18:32Z"
  labels:
    app: nginx
    controller-revision-hash: 6799fc88d8
  name: nginx-ds-6799fc88d8
  namespace: default
  ownerReferences:
  - apiVersion: apps/v1
    blockOwnerDeletion: true
    controller: true
    kind: DaemonSet
    name: nginx-ds
    uid: 843909c4-2260-4709-8bcb-5855c5d06601
  resourceVersion: "12181"
  uid: 1ce9809e-7fd5-4609-8b60-78b0305172c0
revision: 1
```

```yaml nginx-sts-6798d68dcd
apiVersion: apps/v1
data:
  spec:
    template:
      $patch: replace
      metadata:
        creationTimestamp: null
        labels:
          app: nginx-sts
      spec:
        containers:
        - image: nginx
          imagePullPolicy: Always
          name: nginx
          resources: {}
          terminationMessagePath: /dev/termination-log
          terminationMessagePolicy: File
        dnsPolicy: ClusterFirst
        restartPolicy: Always
        schedulerName: default-scheduler
        securityContext: {}
        terminationGracePeriodSeconds: 30
kind: ControllerRevision
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"apps/v1","kind":"StatefulSet","metadata":{"annotations":{},"name":"nginx-sts","namespace":"default"},"spec":{"replicas":1,"selector":{"matchLabels":{"app":"nginx-sts"}},"serviceName":"nginx-sts","template":{"metadata":{"labels":{"app":"nginx-sts"}},"spec":{"containers":[{"image":"nginx","name":"nginx"}]}}}}
  creationTimestamp: "2022-07-25T15:38:12Z"
  labels:
    app: nginx-sts
    controller.kubernetes.io/hash: 6798d68dcd
  name: nginx-sts-6798d68dcd
  namespace: default
  ownerReferences:
  - apiVersion: apps/v1
    blockOwnerDeletion: true
    controller: true
    kind: StatefulSet
    name: nginx-sts
    uid: f5cc619c-364a-4099-b144-8783d6274713
  resourceVersion: "14192"
  uid: 2d10d7c2-0ad3-41d8-9c38-0c8100a537e9
revision: 1
```

## Garbage Collector

> Pod - `k get po nginx-sts-0 -oyaml`

```yaml
  labels:
    app: nginx-sts
    controller-revision-hash: nginx-sts-6798d68dcd
    statefulset.kubernetes.io/pod-name: nginx-sts-0
  name: nginx-sts-0
  namespace: default
  ownerReferences:
  - apiVersion: apps/v1
    blockOwnerDeletion: true
    controller: true
    kind: StatefulSet
    name: nginx-sts
    uid: 2621fb32-1ca4-4289-bd1c-a75b8ae170a1
```

> Garbage Collector 会 `Watch 所有对象`，而 `Graph Builder` 根据 `ownerReferences` 生成一个`依赖图`
> 当某个对象被删除时，可以做 `GC`

```
$ k get statefulsets.apps
NAME        READY   AGE
nginx-sts   1/1     5m22s

$ k get controllerrevisions.apps
NAME                   CONTROLLER                   REVISION   AGE
nginx-sts-6798d68dcd   statefulset.apps/nginx-sts   1          5m31s

$ k get po
NAME          READY   STATUS    RESTARTS   AGE
nginx-sts-0   1/1     Running   0          5m35s

$ k delete statefulsets.apps nginx-sts
statefulset.apps "nginx-sts" deleted

$ k get controllerrevisions.apps
No resources found in default namespace.

$ k get po
No resources found in default namespace.
```

> `--cascade=orphan`

```
$ k apply -f daemonset.yaml
daemonset.apps/nginx-ds created

$ k get daemonsets.apps
NAME       DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
nginx-ds   1         1         1       1            1           <none>          13s

$ k get controllerrevisions.apps
NAME                  CONTROLLER                REVISION   AGE
nginx-ds-6799fc88d8   daemonset.apps/nginx-ds   1          25s

$ k get po
NAME             READY   STATUS    RESTARTS   AGE
nginx-ds-ctrjz   1/1     Running   0          36s

$ k delete daemonsets.apps nginx-ds --cascade=orphan
daemonset.apps "nginx-ds" deleted

$ k get controllerrevisions.apps
NAME                  CONTROLLER   REVISION   AGE
nginx-ds-6799fc88d8   <none>       1          112s

$ k get po
NAME             READY   STATUS    RESTARTS   AGE
nginx-ds-ctrjz   1/1     Running   0          2m13s
```

# Leader Election

> 高可用

1. kubernetes 提供基于 `ConfigMap` 和 `Endpoint` 的 `Leader Election` 类库
2. kubernetes 采用 Leader Election 模式启动组件后
   - 会创建对应的 `Endpoint`，并将当前的 Leader 信息 `Annotate` 到 Endpoint 上

> 后来使用专用对象 `Lease` 来实现 `Leader Election` -- holderIdentity（需要不断续约）

```
$ k api-resources --api-group='coordination.k8s.io'
NAME     SHORTNAMES   APIVERSION               NAMESPACED   KIND
leases                coordination.k8s.io/v1   true         Lease

$ k get leases.coordination.k8s.io -A
NAMESPACE         NAME                      HOLDER                                         AGE
kube-node-lease   mac-k8s                   mac-k8s                                        2d4h
kube-system       kube-controller-manager   mac-k8s_9cf04af5-7c44-4873-83b5-695cc4f42263   2d4h
kube-system       kube-scheduler            mac-k8s_085b5652-9b3f-49d5-bde2-02932851bbd7   2d4h
tigera-operator   operator-lock             mac-k8s_16ca74c2-4970-455f-9d35-2ef722aecf48   2d4h
```

```yaml kube-scheduler
apiVersion: coordination.k8s.io/v1
kind: Lease
metadata:
  creationTimestamp: "2022-07-23T11:55:38Z"
  name: kube-scheduler
  namespace: kube-system
  resourceVersion: "21081"
  uid: 28786f53-ba4f-4eaa-89f3-eaba246f883a
spec:
  acquireTime: "2022-07-23T12:04:22.265025Z"
  holderIdentity: mac-k8s_085b5652-9b3f-49d5-bde2-02932851bbd7
  leaseDurationSeconds: 15
  leaseTransitions: 2
  renewTime: "2022-07-25T16:44:48.465776Z"
```

```yaml kube-controller-manager
apiVersion: coordination.k8s.io/v1
kind: Lease
metadata:
  creationTimestamp: "2022-07-23T11:55:35Z"
  name: kube-controller-manager
  namespace: kube-system
  resourceVersion: "21219"
  uid: 954233bb-348e-4bc1-9fb6-80c7ef5a7bd3
spec:
  acquireTime: "2022-07-23T12:04:21.226855Z"
  holderIdentity: mac-k8s_9cf04af5-7c44-4873-83b5-695cc4f42263
  leaseDurationSeconds: 15
  leaseTransitions: 2
  renewTime: "2022-07-25T16:46:09.464182Z"
```

![image-20230726004951872](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230726004951872.png)
