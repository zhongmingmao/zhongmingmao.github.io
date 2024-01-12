---
title: Kubernetes - Istio
mathjax: false
date: 2023-01-31 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/k8s-istio.webp
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

# CRD

> 核心为 `networking`

```
$ istioctl version
client version: 1.19.3
control plane version: 1.19.3
data plane version: 1.19.3 (2 proxies)

$ k get crd
NAME                                       CREATED AT
authorizationpolicies.security.istio.io    2022-12-27T02:58:37Z
destinationrules.networking.istio.io       2022-12-27T02:58:37Z
envoyfilters.networking.istio.io           2022-12-27T02:58:37Z
gateways.networking.istio.io               2022-12-27T02:58:37Z
istiooperators.install.istio.io            2022-12-27T02:58:37Z
peerauthentications.security.istio.io      2022-12-27T02:58:37Z
proxyconfigs.networking.istio.io           2022-12-27T02:58:37Z
requestauthentications.security.istio.io   2022-12-27T02:58:37Z
serviceentries.networking.istio.io         2022-12-27T02:58:37Z
sidecars.networking.istio.io               2022-12-27T02:58:37Z
telemetries.telemetry.istio.io             2022-12-27T02:58:37Z
virtualservices.networking.istio.io        2022-12-27T02:58:37Z
wasmplugins.extensions.istio.io            2022-12-27T02:58:37Z
workloadentries.networking.istio.io        2022-12-27T02:58:37Z
workloadgroups.networking.istio.io         2022-12-27T02:58:37Z
```

<!-- more -->

# Sidecar

> 创建 namespace

```
$ k create ns sidecar
namespace/sidecar created
```

> 为新建的 namespace 打上 label，该 namespace 下的 Pod 需要自动插入 sidecar

```
$ k label ns sidecar istio-injection=enabled
namespace/sidecar labeled

$ k get mutatingwebhookconfigurations.admissionregistration.k8s.io
NAME                         WEBHOOKS   AGE
istio-revision-tag-default   4          5d8h
istio-sidecar-injector       4          5d8h
```

> k get mutatingwebhookconfigurations.admissionregistration.k8s.io istio-sidecar-injector -oyaml
> 监听到 `Pod` 的`创建事件`后，调用 `istio-system.istiod:443/inject`

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  creationTimestamp: "2022-12-27T02:58:37Z"
  generation: 3
  labels:
    app: sidecar-injector
    install.operator.istio.io/owning-resource: installed-state
    install.operator.istio.io/owning-resource-namespace: istio-system
    istio.io/rev: default
    operator.istio.io/component: Pilot
    operator.istio.io/managed: Reconcile
    operator.istio.io/version: 1.19.3
    release: istio
  name: istio-sidecar-injector
  resourceVersion: "1785"
  uid: fddd28a2-5961-498e-8f40-179b9007b0db
webhooks:
- admissionReviewVersions:
  - v1beta1
  - v1
  clientConfig:
    caBundle: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUMvRENDQWVTZ0F3SUJBZ0lRYmhJa3NCZVNoY3lnTzZpK0hMc0RsREFOQmdrcWhraUc5dzBCQVFzRkFEQVkKTVJZd0ZBWURWUVFLRXcxamJIVnpkR1Z5TG14dlkyRnNNQjRYRFRJek1USXlOekF6TURBek5Gb1hEVE16TVRJeQpOREF6TURBek5Gb3dHREVXTUJRR0ExVUVDaE1OWTJ4MWMzUmxjaTVzYjJOaGJEQ0NBU0l3RFFZSktvWklodmNOCkFRRUJCUUFEZ2dFUEFEQ0NBUW9DZ2dFQkFMczVVZGg5K285c1FUUndwRUdBd2ZCNlRmQWZMUTFFbnVPK0U5QWkKK0dMd3p2dXhyZGFBcmRkUXYzY0ZMc2pwWjJlVGZWRUw5Vm9mRGowTXlMSUZNUEgrV0c5OU1hQ0dkVnJSVlZFdApWWHdKa3V1bVB3bEQxdmdIQXdQUUgrSXJPTlZpU2hkeXVwUUtmMzFpb3ZrWStaMkpXK2pnZ0NqSEJWdk5uQnB4CmJKUTd1Q1NJZEpiYmQxaDg3V2x0NVZ4TFAwc0p4RUxGQlo4NFp4RWJHYVQzSXV1UWRWbFdoVElFN2Q5ZjZucDQKcnNzSmZXd3RqZmsyNmxlQktaelJtSmZzeGV2MTFQWjZYNzkyWUtlRHJ6ZU8rSDREem5IeUpNT01qTHJsb0hkUwpRWi9NNkI1bW9TdklTZkZIbG1NSTU2OTE4bWFDZkF2SW12c0NoMVY1YWlKMzUwOENBd0VBQWFOQ01FQXdEZ1lEClZSMFBBUUgvQkFRREFnSUVNQThHQTFVZEV3RUIvd1FGTUFNQkFmOHdIUVlEVlIwT0JCWUVGSUlidVY3VTI0cUsKYjVVOG9HSVFlYXU4Y0JNZE1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRQXVva2p5TmxySU5pNWhwNDYvWkR2UApaakd0aW5sM21VR2NtUTljOE1teE5FZUxWa2hvaXppc1NPK2tkNEZVMDBtcEsxWmJyMXpyeE9oWVBHL1dlS3k4CkVKbmFpRm95QUFveEptUlhNUTUxaE1FaDFEc2VKM3NTTmZtUzE3U0lPSDIraGMrcHBsWE1sdFgrY1p3Z3RwNEMKMFdDVVB1WERJcktBbEQxZi9OTGtxSDZudnZUTnNwOGlYWndLblF2ZHE0M2lBclgvSkptdGR4cGFQTmZsSUFwdgozdy9QM1J3R3E2L0tKWDNSTUYzZjRxYlFVZExCMVBxeUhHT0hBR2xWZzV4SFNqZmw3bzlnYlhVWDBXOUpQWmtQCjFrREtYN0xYcllINXErVXBSRmlKcGhSK3ovM25LaFRpVGdyemEvSm1zR1pteEt4Vkk4Q1h5Wm5UckZJdlR3QVkKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=
    service:
      name: istiod
      namespace: istio-system
      path: /inject
      port: 443
  failurePolicy: Fail
  matchPolicy: Equivalent
  name: rev.namespace.sidecar-injector.istio.io
  namespaceSelector:
    matchLabels:
      istio.io/deactivated: never-match
  objectSelector:
    matchLabels:
      istio.io/deactivated: never-match
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
- admissionReviewVersions:
  - v1beta1
  - v1
  clientConfig:
    caBundle: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUMvRENDQWVTZ0F3SUJBZ0lRYmhJa3NCZVNoY3lnTzZpK0hMc0RsREFOQmdrcWhraUc5dzBCQVFzRkFEQVkKTVJZd0ZBWURWUVFLRXcxamJIVnpkR1Z5TG14dlkyRnNNQjRYRFRJek1USXlOekF6TURBek5Gb1hEVE16TVRJeQpOREF6TURBek5Gb3dHREVXTUJRR0ExVUVDaE1OWTJ4MWMzUmxjaTVzYjJOaGJEQ0NBU0l3RFFZSktvWklodmNOCkFRRUJCUUFEZ2dFUEFEQ0NBUW9DZ2dFQkFMczVVZGg5K285c1FUUndwRUdBd2ZCNlRmQWZMUTFFbnVPK0U5QWkKK0dMd3p2dXhyZGFBcmRkUXYzY0ZMc2pwWjJlVGZWRUw5Vm9mRGowTXlMSUZNUEgrV0c5OU1hQ0dkVnJSVlZFdApWWHdKa3V1bVB3bEQxdmdIQXdQUUgrSXJPTlZpU2hkeXVwUUtmMzFpb3ZrWStaMkpXK2pnZ0NqSEJWdk5uQnB4CmJKUTd1Q1NJZEpiYmQxaDg3V2x0NVZ4TFAwc0p4RUxGQlo4NFp4RWJHYVQzSXV1UWRWbFdoVElFN2Q5ZjZucDQKcnNzSmZXd3RqZmsyNmxlQktaelJtSmZzeGV2MTFQWjZYNzkyWUtlRHJ6ZU8rSDREem5IeUpNT01qTHJsb0hkUwpRWi9NNkI1bW9TdklTZkZIbG1NSTU2OTE4bWFDZkF2SW12c0NoMVY1YWlKMzUwOENBd0VBQWFOQ01FQXdEZ1lEClZSMFBBUUgvQkFRREFnSUVNQThHQTFVZEV3RUIvd1FGTUFNQkFmOHdIUVlEVlIwT0JCWUVGSUlidVY3VTI0cUsKYjVVOG9HSVFlYXU4Y0JNZE1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRQXVva2p5TmxySU5pNWhwNDYvWkR2UApaakd0aW5sM21VR2NtUTljOE1teE5FZUxWa2hvaXppc1NPK2tkNEZVMDBtcEsxWmJyMXpyeE9oWVBHL1dlS3k4CkVKbmFpRm95QUFveEptUlhNUTUxaE1FaDFEc2VKM3NTTmZtUzE3U0lPSDIraGMrcHBsWE1sdFgrY1p3Z3RwNEMKMFdDVVB1WERJcktBbEQxZi9OTGtxSDZudnZUTnNwOGlYWndLblF2ZHE0M2lBclgvSkptdGR4cGFQTmZsSUFwdgozdy9QM1J3R3E2L0tKWDNSTUYzZjRxYlFVZExCMVBxeUhHT0hBR2xWZzV4SFNqZmw3bzlnYlhVWDBXOUpQWmtQCjFrREtYN0xYcllINXErVXBSRmlKcGhSK3ovM25LaFRpVGdyemEvSm1zR1pteEt4Vkk4Q1h5Wm5UckZJdlR3QVkKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=
    service:
      name: istiod
      namespace: istio-system
      path: /inject
      port: 443
  failurePolicy: Fail
  matchPolicy: Equivalent
  name: rev.object.sidecar-injector.istio.io
  namespaceSelector:
    matchLabels:
      istio.io/deactivated: never-match
  objectSelector:
    matchLabels:
      istio.io/deactivated: never-match
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
- admissionReviewVersions:
  - v1beta1
  - v1
  clientConfig:
    caBundle: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUMvRENDQWVTZ0F3SUJBZ0lRYmhJa3NCZVNoY3lnTzZpK0hMc0RsREFOQmdrcWhraUc5dzBCQVFzRkFEQVkKTVJZd0ZBWURWUVFLRXcxamJIVnpkR1Z5TG14dlkyRnNNQjRYRFRJek1USXlOekF6TURBek5Gb1hEVE16TVRJeQpOREF6TURBek5Gb3dHREVXTUJRR0ExVUVDaE1OWTJ4MWMzUmxjaTVzYjJOaGJEQ0NBU0l3RFFZSktvWklodmNOCkFRRUJCUUFEZ2dFUEFEQ0NBUW9DZ2dFQkFMczVVZGg5K285c1FUUndwRUdBd2ZCNlRmQWZMUTFFbnVPK0U5QWkKK0dMd3p2dXhyZGFBcmRkUXYzY0ZMc2pwWjJlVGZWRUw5Vm9mRGowTXlMSUZNUEgrV0c5OU1hQ0dkVnJSVlZFdApWWHdKa3V1bVB3bEQxdmdIQXdQUUgrSXJPTlZpU2hkeXVwUUtmMzFpb3ZrWStaMkpXK2pnZ0NqSEJWdk5uQnB4CmJKUTd1Q1NJZEpiYmQxaDg3V2x0NVZ4TFAwc0p4RUxGQlo4NFp4RWJHYVQzSXV1UWRWbFdoVElFN2Q5ZjZucDQKcnNzSmZXd3RqZmsyNmxlQktaelJtSmZzeGV2MTFQWjZYNzkyWUtlRHJ6ZU8rSDREem5IeUpNT01qTHJsb0hkUwpRWi9NNkI1bW9TdklTZkZIbG1NSTU2OTE4bWFDZkF2SW12c0NoMVY1YWlKMzUwOENBd0VBQWFOQ01FQXdEZ1lEClZSMFBBUUgvQkFRREFnSUVNQThHQTFVZEV3RUIvd1FGTUFNQkFmOHdIUVlEVlIwT0JCWUVGSUlidVY3VTI0cUsKYjVVOG9HSVFlYXU4Y0JNZE1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRQXVva2p5TmxySU5pNWhwNDYvWkR2UApaakd0aW5sM21VR2NtUTljOE1teE5FZUxWa2hvaXppc1NPK2tkNEZVMDBtcEsxWmJyMXpyeE9oWVBHL1dlS3k4CkVKbmFpRm95QUFveEptUlhNUTUxaE1FaDFEc2VKM3NTTmZtUzE3U0lPSDIraGMrcHBsWE1sdFgrY1p3Z3RwNEMKMFdDVVB1WERJcktBbEQxZi9OTGtxSDZudnZUTnNwOGlYWndLblF2ZHE0M2lBclgvSkptdGR4cGFQTmZsSUFwdgozdy9QM1J3R3E2L0tKWDNSTUYzZjRxYlFVZExCMVBxeUhHT0hBR2xWZzV4SFNqZmw3bzlnYlhVWDBXOUpQWmtQCjFrREtYN0xYcllINXErVXBSRmlKcGhSK3ovM25LaFRpVGdyemEvSm1zR1pteEt4Vkk4Q1h5Wm5UckZJdlR3QVkKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=
    service:
      name: istiod
      namespace: istio-system
      path: /inject
      port: 443
  failurePolicy: Fail
  matchPolicy: Equivalent
  name: namespace.sidecar-injector.istio.io
  namespaceSelector:
    matchLabels:
      istio.io/deactivated: never-match
  objectSelector:
    matchLabels:
      istio.io/deactivated: never-match
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
- admissionReviewVersions:
  - v1beta1
  - v1
  clientConfig:
    caBundle: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUMvRENDQWVTZ0F3SUJBZ0lRYmhJa3NCZVNoY3lnTzZpK0hMc0RsREFOQmdrcWhraUc5dzBCQVFzRkFEQVkKTVJZd0ZBWURWUVFLRXcxamJIVnpkR1Z5TG14dlkyRnNNQjRYRFRJek1USXlOekF6TURBek5Gb1hEVE16TVRJeQpOREF6TURBek5Gb3dHREVXTUJRR0ExVUVDaE1OWTJ4MWMzUmxjaTVzYjJOaGJEQ0NBU0l3RFFZSktvWklodmNOCkFRRUJCUUFEZ2dFUEFEQ0NBUW9DZ2dFQkFMczVVZGg5K285c1FUUndwRUdBd2ZCNlRmQWZMUTFFbnVPK0U5QWkKK0dMd3p2dXhyZGFBcmRkUXYzY0ZMc2pwWjJlVGZWRUw5Vm9mRGowTXlMSUZNUEgrV0c5OU1hQ0dkVnJSVlZFdApWWHdKa3V1bVB3bEQxdmdIQXdQUUgrSXJPTlZpU2hkeXVwUUtmMzFpb3ZrWStaMkpXK2pnZ0NqSEJWdk5uQnB4CmJKUTd1Q1NJZEpiYmQxaDg3V2x0NVZ4TFAwc0p4RUxGQlo4NFp4RWJHYVQzSXV1UWRWbFdoVElFN2Q5ZjZucDQKcnNzSmZXd3RqZmsyNmxlQktaelJtSmZzeGV2MTFQWjZYNzkyWUtlRHJ6ZU8rSDREem5IeUpNT01qTHJsb0hkUwpRWi9NNkI1bW9TdklTZkZIbG1NSTU2OTE4bWFDZkF2SW12c0NoMVY1YWlKMzUwOENBd0VBQWFOQ01FQXdEZ1lEClZSMFBBUUgvQkFRREFnSUVNQThHQTFVZEV3RUIvd1FGTUFNQkFmOHdIUVlEVlIwT0JCWUVGSUlidVY3VTI0cUsKYjVVOG9HSVFlYXU4Y0JNZE1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRQXVva2p5TmxySU5pNWhwNDYvWkR2UApaakd0aW5sM21VR2NtUTljOE1teE5FZUxWa2hvaXppc1NPK2tkNEZVMDBtcEsxWmJyMXpyeE9oWVBHL1dlS3k4CkVKbmFpRm95QUFveEptUlhNUTUxaE1FaDFEc2VKM3NTTmZtUzE3U0lPSDIraGMrcHBsWE1sdFgrY1p3Z3RwNEMKMFdDVVB1WERJcktBbEQxZi9OTGtxSDZudnZUTnNwOGlYWndLblF2ZHE0M2lBclgvSkptdGR4cGFQTmZsSUFwdgozdy9QM1J3R3E2L0tKWDNSTUYzZjRxYlFVZExCMVBxeUhHT0hBR2xWZzV4SFNqZmw3bzlnYlhVWDBXOUpQWmtQCjFrREtYN0xYcllINXErVXBSRmlKcGhSK3ovM25LaFRpVGdyemEvSm1zR1pteEt4Vkk4Q1h5Wm5UckZJdlR3QVkKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=
    service:
      name: istiod
      namespace: istio-system
      path: /inject
      port: 443
  failurePolicy: Fail
  matchPolicy: Equivalent
  name: object.sidecar-injector.istio.io
  namespaceSelector:
    matchLabels:
      istio.io/deactivated: never-match
  objectSelector:
    matchLabels:
      istio.io/deactivated: never-match
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

> 服务端：Deployment + Service

```yaml nginx.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 1
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
          image: nginx:1.25.3
---
apiVersion: v1
kind: Service
metadata:
  name: nginx
spec:
  ports:
    - name: http
      port: 80
      protocol: TCP
      targetPort: 80
  selector:
    app: nginx
```

> 部署服务端，Pod 中注入了 Sidecar，总共 2 个容器

```
$ k apply -f nginx.yaml -n sidecar
deployment.apps/nginx-deployment created
service/nginx created

$ k get po -n sidecar
NAME                               READY   STATUS    RESTARTS   AGE
nginx-deployment-7fc7f5758-46mzh   2/2     Running   0          4m57s
```

> k get po -n sidecar nginx-deployment-7fc7f5758-46mzh -oyaml
>
> 1. `istio/proxyv2` 本质上是一个 `Envoy` Sidecar
> 2. 还插入了一个 `initContainer`，执行 `istio-iptables` 命令，修改了`容器内部`的 `iptables` 规则

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    istio.io/rev: default
    kubectl.kubernetes.io/default-container: nginx
    kubectl.kubernetes.io/default-logs-container: nginx
    prometheus.io/path: /stats/prometheus
    prometheus.io/port: "15020"
    prometheus.io/scrape: "true"
    sidecar.istio.io/status: '{"initContainers":["istio-init"],"containers":["istio-proxy"],"volumes":["workload-socket","credential-socket","workload-certs","istio-envoy","istio-data","istio-podinfo","istio-token","istiod-ca-cert"],"imagePullSecrets":null,"revision":"default"}'
  creationTimestamp: "2022-01-01T11:40:31Z"
  generateName: nginx-deployment-7fc7f5758-
  labels:
    app: nginx
    pod-template-hash: 7fc7f5758
    security.istio.io/tlsMode: istio
    service.istio.io/canonical-name: nginx
    service.istio.io/canonical-revision: latest
  name: nginx-deployment-7fc7f5758-46mzh
  namespace: sidecar
  ownerReferences:
  - apiVersion: apps/v1
    blockOwnerDeletion: true
    controller: true
    kind: ReplicaSet
    name: nginx-deployment-7fc7f5758
    uid: 9277a14d-cb83-4d2e-92d9-1f9694ec9a5d
  resourceVersion: "4841"
  uid: 1d4c7d67-b162-4138-a781-7f8a472c9b34
spec:
  containers:
  - image: nginx:1.25.3
    imagePullPolicy: IfNotPresent
    name: nginx
    resources: {}
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-4wmmn
      readOnly: true
  - args:
    - proxy
    - sidecar
    - --domain
    - $(POD_NAMESPACE).svc.cluster.local
    - --proxyLogLevel=warning
    - --proxyComponentLogLevel=misc:error
    - --log_output_level=default:info
    env:
    - name: JWT_POLICY
      value: third-party-jwt
    - name: PILOT_CERT_PROVIDER
      value: istiod
    - name: CA_ADDR
      value: istiod.istio-system.svc:15012
    - name: POD_NAME
      valueFrom:
        fieldRef:
          apiVersion: v1
          fieldPath: metadata.name
    - name: POD_NAMESPACE
      valueFrom:
        fieldRef:
          apiVersion: v1
          fieldPath: metadata.namespace
    - name: INSTANCE_IP
      valueFrom:
        fieldRef:
          apiVersion: v1
          fieldPath: status.podIP
    - name: SERVICE_ACCOUNT
      valueFrom:
        fieldRef:
          apiVersion: v1
          fieldPath: spec.serviceAccountName
    - name: HOST_IP
      valueFrom:
        fieldRef:
          apiVersion: v1
          fieldPath: status.hostIP
    - name: ISTIO_CPU_LIMIT
      valueFrom:
        resourceFieldRef:
          divisor: "0"
          resource: limits.cpu
    - name: PROXY_CONFIG
      value: |
        {}
    - name: ISTIO_META_POD_PORTS
      value: |-
        [
        ]
    - name: ISTIO_META_APP_CONTAINERS
      value: nginx
    - name: GOMEMLIMIT
      valueFrom:
        resourceFieldRef:
          divisor: "0"
          resource: limits.memory
    - name: GOMAXPROCS
      valueFrom:
        resourceFieldRef:
          divisor: "0"
          resource: limits.cpu
    - name: ISTIO_META_CLUSTER_ID
      value: Kubernetes
    - name: ISTIO_META_NODE_NAME
      valueFrom:
        fieldRef:
          apiVersion: v1
          fieldPath: spec.nodeName
    - name: ISTIO_META_INTERCEPTION_MODE
      value: REDIRECT
    - name: ISTIO_META_WORKLOAD_NAME
      value: nginx-deployment
    - name: ISTIO_META_OWNER
      value: kubernetes://apis/apps/v1/namespaces/sidecar/deployments/nginx-deployment
    - name: ISTIO_META_MESH_ID
      value: cluster.local
    - name: TRUST_DOMAIN
      value: cluster.local
    image: docker.io/istio/proxyv2:1.19.3
    imagePullPolicy: IfNotPresent
    name: istio-proxy
    ports:
    - containerPort: 15090
      name: http-envoy-prom
      protocol: TCP
    readinessProbe:
      failureThreshold: 30
      httpGet:
        path: /healthz/ready
        port: 15021
        scheme: HTTP
      initialDelaySeconds: 1
      periodSeconds: 2
      successThreshold: 1
      timeoutSeconds: 3
    resources:
      limits:
        cpu: "2"
        memory: 1Gi
      requests:
        cpu: 10m
        memory: 40Mi
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
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /var/run/secrets/workload-spiffe-uds
      name: workload-socket
    - mountPath: /var/run/secrets/credential-uds
      name: credential-socket
    - mountPath: /var/run/secrets/workload-spiffe-credentials
      name: workload-certs
    - mountPath: /var/run/secrets/istio
      name: istiod-ca-cert
    - mountPath: /var/lib/istio/data
      name: istio-data
    - mountPath: /etc/istio/proxy
      name: istio-envoy
    - mountPath: /var/run/secrets/tokens
      name: istio-token
    - mountPath: /etc/istio/pod
      name: istio-podinfo
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-4wmmn
      readOnly: true
  dnsPolicy: ClusterFirst
  enableServiceLinks: true
  initContainers:
  - args:
    - istio-iptables
    - -p
    - "15001"
    - -z
    - "15006"
    - -u
    - "1337"
    - -m
    - REDIRECT
    - -i
    - '*'
    - -x
    - ""
    - -b
    - '*'
    - -d
    - 15090,15021,15020
    - --log_output_level=default:info
    image: docker.io/istio/proxyv2:1.19.3
    imagePullPolicy: IfNotPresent
    name: istio-init
    resources:
      limits:
        cpu: "2"
        memory: 1Gi
      requests:
        cpu: 10m
        memory: 40Mi
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
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-4wmmn
      readOnly: true
  nodeName: minikube
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
    tolerationSeconds: 300
  - effect: NoExecute
    key: node.kubernetes.io/unreachable
    operator: Exists
    tolerationSeconds: 300
  volumes:
  - emptyDir: {}
    name: workload-socket
  - emptyDir: {}
    name: credential-socket
  - emptyDir: {}
    name: workload-certs
  - emptyDir:
      medium: Memory
    name: istio-envoy
  - emptyDir: {}
    name: istio-data
  - downwardAPI:
      defaultMode: 420
      items:
      - fieldRef:
          apiVersion: v1
          fieldPath: metadata.labels
        path: labels
      - fieldRef:
          apiVersion: v1
          fieldPath: metadata.annotations
        path: annotations
    name: istio-podinfo
  - name: istio-token
    projected:
      defaultMode: 420
      sources:
      - serviceAccountToken:
          audience: istio-ca
          expirationSeconds: 43200
          path: istio-token
  - configMap:
      defaultMode: 420
      name: istio-ca-root-cert
    name: istiod-ca-cert
  - name: kube-api-access-4wmmn
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
    lastTransitionTime: "2022-01-01T11:40:33Z"
    status: "True"
    type: Initialized
  - lastProbeTime: null
    lastTransitionTime: "2022-01-01T11:43:10Z"
    status: "True"
    type: Ready
  - lastProbeTime: null
    lastTransitionTime: "2022-01-01T11:43:10Z"
    status: "True"
    type: ContainersReady
  - lastProbeTime: null
    lastTransitionTime: "2022-01-01T11:40:31Z"
    status: "True"
    type: PodScheduled
  containerStatuses:
  - containerID: docker://0f7fe83cc80e801f9d1eb3e695f699eecc1a64ce00a1a606a8849626973a37e5
    image: istio/proxyv2:1.19.3
    imageID: docker-pullable://istio/proxyv2@sha256:47b08c6d59b97e69c43387df40e6b969a2c1979af29665e85698c178fceda0a4
    lastState: {}
    name: istio-proxy
    ready: true
    restartCount: 0
    started: true
    state:
      running:
        startedAt: "2022-01-01T11:42:56Z"
  - containerID: docker://5c801e6a40f1715485e86f11901f1382c7e11f8c75de95bb4696ec1fd196f3b4
    image: nginx:1.25.3
    imageID: docker-pullable://nginx@sha256:2bdc49f2f8ae8d8dc50ed00f2ee56d00385c6f8bc8a8b320d0a294d9e3b49026
    lastState: {}
    name: nginx
    ready: true
    restartCount: 0
    started: true
    state:
      running:
        startedAt: "2022-01-01T11:42:56Z"
  hostIP: 192.168.49.2
  initContainerStatuses:
  - containerID: docker://b4586714d4a41cef9bc0ea6fee2fc1d267e129add845c87ae2432f237a34790c
    image: istio/proxyv2:1.19.3
    imageID: docker-pullable://istio/proxyv2@sha256:47b08c6d59b97e69c43387df40e6b969a2c1979af29665e85698c178fceda0a4
    lastState: {}
    name: istio-init
    ready: true
    restartCount: 0
    started: false
    state:
      terminated:
        containerID: docker://b4586714d4a41cef9bc0ea6fee2fc1d267e129add845c87ae2432f237a34790c
        exitCode: 0
        finishedAt: "2022-01-01T11:40:32Z"
        reason: Completed
        startedAt: "2022-01-01T11:40:32Z"
  phase: Running
  podIP: 10.244.0.6
  podIPs:
  - ip: 10.244.0.6
  qosClass: Burstable
  startTime: "2022-01-01T11:40:31Z"
```

> istio-proxy - sidecar; istio-init - initContainer
> 同一个 Pod 中的所有容器是`共用`网络 Namespace，所以 initContainer 能修改 iptables 规则并生效

```
$ docker ps -a | grep nginx
0f7fe83cc80e   ef821b2a218f                                                    "/usr/local/bin/pilo…"   3 hours ago   Up 3 hours                           k8s_istio-proxy_nginx-deployment-7fc7f5758-46mzh_sidecar_1d4c7d67-b162-4138-a781-7f8a472c9b34_0
5c801e6a40f1   nginx                                                           "/docker-entrypoint.…"   3 hours ago   Up 3 hours                           k8s_nginx_nginx-deployment-7fc7f5758-46mzh_sidecar_1d4c7d67-b162-4138-a781-7f8a472c9b34_0
b4586714d4a4   ef821b2a218f                                                    "/usr/local/bin/pilo…"   3 hours ago   Exited (0) 3 hours ago               k8s_istio-init_nginx-deployment-7fc7f5758-46mzh_sidecar_1d4c7d67-b162-4138-a781-7f8a472c9b34_0
7b46f9b6cd22   registry.cn-hangzhou.aliyuncs.com/google_containers/pause:3.9   "/pause"                 3 hours ago   Up 3 hours                           k8s_POD_nginx-deployment-7fc7f5758-46mzh_sidecar_1d4c7d67-b162-4138-a781-7f8a472c9b34_0
```

> 客户端

```yaml toolbox.yaml
kind: Deployment
metadata:
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
          image: centos:7.9.2009
          command:
            - tail
            - -f
            - /dev/null
```

> 部署客户端，同样注入了 Sidecar

> 在没有 Sidecar 时的数据链路：
>
> 1. 先对 `Service` 做域名解析，`CoreDNS` 告知 `ClusterIP`
> 2. 请求被发送到 `ClusterIP`，到达宿主后，会有 `iptables/ipvs` 规则，通过 `DNAT` 指向 `PodIP`

```
$ k apply -f toolbox.yaml -n sidecar
deployment.apps/toolbox created

$ k get po -n sidecar
NAME                               READY   STATUS    RESTARTS   AGE
nginx-deployment-7fc7f5758-46mzh   2/2     Running   0          28m
toolbox-97948fc8-ptlct             2/2     Running   0          4m

$ k get svc -n sidecar
NAME    TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
nginx   ClusterIP   10.100.93.113   <none>        80/TCP    29m

$ k exec -it -n sidecar toolbox-97948fc8-ptlct -- curl -sI nginx
HTTP/1.1 200 OK
server: envoy
date: Mon, 01 Jan 2022 12:11:37 GMT
content-type: text/html
content-length: 615
last-modified: Tue, 24 Oct 2023 13:46:47 GMT
etag: "6537cac7-267"
accept-ranges: bytes
x-envoy-upstream-service-time: 2
```

> 在有 Sidecar 时的数据链路

> 客户端，`iptables` 被修改，流量被`劫持`

```
$ docker ps | grep toolbox
e5bd83d25a6e   ef821b2a218f                                                    "/usr/local/bin/pilo…"   12 minutes ago   Up 12 minutes             k8s_istio-proxy_toolbox-97948fc8-ptlct_sidecar_b187a8cb-dde2-4cb6-821b-023700674256_0
aa143b711dec   centos                                                          "tail -f /dev/null"      12 minutes ago   Up 12 minutes             k8s_toolbox_toolbox-97948fc8-ptlct_sidecar_b187a8cb-dde2-4cb6-821b-023700674256_0
ca6c94829035   registry.cn-hangzhou.aliyuncs.com/google_containers/pause:3.9   "/pause"                 15 minutes ago   Up 15 minutes             k8s_POD_toolbox-97948fc8-ptlct_sidecar_b187a8cb-dde2-4cb6-821b-023700674256_0

$ docker inspect aa143b711dec | grep Pid
            "Pid": 70532,
            "PidMode": "",
            "PidsLimit": null,
            
$ sudo nsenter -t 70532 -n ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: eth0@if9: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether f6:76:88:cf:ba:dd brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 10.244.0.7/16 brd 10.244.255.255 scope global eth0
       valid_lft forever preferred_lft forever
       
$ sudo nsenter -t 70532 -n iptables-legacy-save -t nat
# Generated by iptables-save v1.8.7 on Mon Jan  1 12:25:06 2022
*nat
:PREROUTING ACCEPT [509:30540]
:INPUT ACCEPT [509:30540]
:OUTPUT ACCEPT [52:4460]
:POSTROUTING ACCEPT [55:4640]
:ISTIO_INBOUND - [0:0]
:ISTIO_IN_REDIRECT - [0:0]
:ISTIO_OUTPUT - [0:0]
:ISTIO_REDIRECT - [0:0]
-A PREROUTING -p tcp -j ISTIO_INBOUND
-A OUTPUT -p tcp -j ISTIO_OUTPUT
-A ISTIO_INBOUND -p tcp -m tcp --dport 15008 -j RETURN
-A ISTIO_INBOUND -p tcp -m tcp --dport 15090 -j RETURN
-A ISTIO_INBOUND -p tcp -m tcp --dport 15021 -j RETURN
-A ISTIO_INBOUND -p tcp -m tcp --dport 15020 -j RETURN
-A ISTIO_INBOUND -p tcp -j ISTIO_IN_REDIRECT
-A ISTIO_IN_REDIRECT -p tcp -j REDIRECT --to-ports 15006
-A ISTIO_OUTPUT -s 127.0.0.6/32 -o lo -j RETURN
-A ISTIO_OUTPUT ! -d 127.0.0.1/32 -o lo -p tcp -m tcp ! --dport 15008 -m owner --uid-owner 1337 -j ISTIO_IN_REDIRECT
-A ISTIO_OUTPUT -o lo -m owner ! --uid-owner 1337 -j RETURN
-A ISTIO_OUTPUT -m owner --uid-owner 1337 -j RETURN
-A ISTIO_OUTPUT ! -d 127.0.0.1/32 -o lo -p tcp -m tcp ! --dport 15008 -m owner --gid-owner 1337 -j ISTIO_IN_REDIRECT
-A ISTIO_OUTPUT -o lo -m owner ! --gid-owner 1337 -j RETURN
-A ISTIO_OUTPUT -m owner --gid-owner 1337 -j RETURN
-A ISTIO_OUTPUT -d 127.0.0.1/32 -j RETURN
-A ISTIO_OUTPUT -j ISTIO_REDIRECT
-A ISTIO_REDIRECT -p tcp -j REDIRECT --to-ports 15001
COMMIT
# Completed on Mon Jan  1 12:25:06 2022
```

> 往外走的流量，首先经过 `OUTPUT` Chain
> 效果：任何往外走的 `TCP` 流量，都会转发到 `15001` 端口（即 Envoy 监听）

1. -A OUTPUT -p tcp -j ISTIO_OUTPUT
   - 是 TCP 协议则走 `ISTIO_OUTPUT`
2. ISTIO_OUTPUT 前面的规则都不匹配，直接到 `ISTIO_REDIRECT`
3. ISTIO_REDIRECT 转发到 `15001` 端口

> listener

```
$ istioctl --help
Istio configuration command line utility for service operators to
debug and diagnose their Istio mesh.

Usage:
  istioctl [command]

Available Commands:
  admin                Manage control plane (istiod) configuration
  analyze              Analyze Istio configuration and print validation messages
  authz                (authz is experimental. Use `istioctl experimental authz`)
  bug-report           Cluster information and log capture support tool.
  completion           Generate the autocompletion script for the specified shell
  create-remote-secret Create a secret with credentials to allow Istio to access remote Kubernetes apiservers
  dashboard            Access to Istio web UIs
  experimental         Experimental commands that may be modified or deprecated
  help                 Help about any command
  install              Applies an Istio manifest, installing or reconfiguring Istio on a cluster.
  kube-inject          Inject Istio sidecar into Kubernetes pod resources
  manifest             Commands related to Istio manifests
  operator             Commands related to Istio operator controller.
  profile              Commands related to Istio configuration profiles
  proxy-config         Retrieve information about proxy configuration from Envoy [kube only]
  proxy-status         Retrieves the synchronization status of each Envoy in the mesh [kube only]
  remote-clusters      Lists the remote clusters each istiod instance is connected to.
  tag                  Command group used to interact with revision tags
  uninstall            Uninstall Istio from a cluster
  upgrade              Upgrade Istio control plane in-place
  validate             Validate Istio policy and rules files
  verify-install       Verifies Istio Installation Status
  version              Prints out build version information

Flags:
      --context string          Kubernetes configuration context
  -h, --help                    help for istioctl
  -i, --istioNamespace string   Istio system namespace (default "istio-system")
  -c, --kubeconfig string       Kubernetes configuration file
  -n, --namespace string        Kubernetes namespace
      --vklog Level             number for the log level verbosity. Like -v flag. ex: --vklog=9

Additional help topics:
  istioctl options              Displays istioctl global options

Use "istioctl [command] --help" for more information about a command.

$ istioctl proxy-status
NAME                                                   CLUSTER        CDS        LDS        EDS        RDS          ECDS         ISTIOD                      VERSION
istio-egressgateway-84776fd7f6-dfn6m.istio-system      Kubernetes     SYNCED     SYNCED     SYNCED     NOT SENT     NOT SENT     istiod-566dc66cff-d9chq     1.19.3
istio-ingressgateway-779c475c44-j4tds.istio-system     Kubernetes     SYNCED     SYNCED     SYNCED     NOT SENT     NOT SENT     istiod-566dc66cff-d9chq     1.19.3
nginx-deployment-7fc7f5758-46mzh.sidecar               Kubernetes     SYNCED     SYNCED     SYNCED     SYNCED       NOT SENT     istiod-566dc66cff-d9chq     1.19.3
toolbox-97948fc8-ptlct.sidecar                         Kubernetes     SYNCED     SYNCED     SYNCED     SYNCED       NOT SENT     istiod-566dc66cff-d9chq     1.19.3

$ istioctl proxy-config -n sidecar listener toolbox-97948fc8-ptlct
ADDRESSES      PORT  MATCH                                                                                         DESTINATION
10.96.0.10     53    ALL                                                                                           Cluster: outbound|53||kube-dns.kube-system.svc.cluster.local
0.0.0.0        80    Trans: raw_buffer; App: http/1.1,h2c                                                          Route: 80
0.0.0.0        80    ALL                                                                                           PassthroughCluster
10.101.85.142  443   ALL                                                                                           Cluster: outbound|443||istio-egressgateway.istio-system.svc.cluster.local
10.107.180.168 443   ALL                                                                                           Cluster: outbound|443||istiod.istio-system.svc.cluster.local
10.108.4.104   443   ALL                                                                                           Cluster: outbound|443||istio-ingressgateway.istio-system.svc.cluster.local
10.96.0.1      443   ALL                                                                                           Cluster: outbound|443||kubernetes.default.svc.cluster.local
10.96.0.10     9153  Trans: raw_buffer; App: http/1.1,h2c                                                          Route: kube-dns.kube-system.svc.cluster.local:9153
10.96.0.10     9153  ALL                                                                                           Cluster: outbound|9153||kube-dns.kube-system.svc.cluster.local
0.0.0.0        15001 ALL                                                                                           PassthroughCluster
0.0.0.0        15001 Addr: *:15001                                                                                 Non-HTTP/Non-TCP
0.0.0.0        15006 Addr: *:15006                                                                                 Non-HTTP/Non-TCP
0.0.0.0        15006 Trans: tls; App: istio-http/1.0,istio-http/1.1,istio-h2; Addr: 0.0.0.0/0                      InboundPassthroughClusterIpv4
0.0.0.0        15006 Trans: raw_buffer; App: http/1.1,h2c; Addr: 0.0.0.0/0                                         InboundPassthroughClusterIpv4
0.0.0.0        15006 Trans: tls; App: TCP TLS; Addr: 0.0.0.0/0                                                     InboundPassthroughClusterIpv4
0.0.0.0        15006 Trans: raw_buffer; Addr: 0.0.0.0/0                                                            InboundPassthroughClusterIpv4
0.0.0.0        15006 Trans: tls; Addr: 0.0.0.0/0                                                                   InboundPassthroughClusterIpv4
0.0.0.0        15006 Trans: tls; App: istio,istio-peer-exchange,istio-http/1.0,istio-http/1.1,istio-h2; Addr: *:80 Cluster: inbound|80||
0.0.0.0        15006 Trans: raw_buffer; Addr: *:80                                                                 Cluster: inbound|80||
0.0.0.0        15010 Trans: raw_buffer; App: http/1.1,h2c                                                          Route: 15010
0.0.0.0        15010 ALL                                                                                           PassthroughCluster
10.107.180.168 15012 ALL                                                                                           Cluster: outbound|15012||istiod.istio-system.svc.cluster.local
0.0.0.0        15014 Trans: raw_buffer; App: http/1.1,h2c                                                          Route: 15014
0.0.0.0        15014 ALL                                                                                           PassthroughCluster
0.0.0.0        15021 ALL                                                                                           Inline Route: /healthz/ready*
10.108.4.104   15021 Trans: raw_buffer; App: http/1.1,h2c                                                          Route: istio-ingressgateway.istio-system.svc.cluster.local:15021
10.108.4.104   15021 ALL                                                                                           Cluster: outbound|15021||istio-ingressgateway.istio-system.svc.cluster.local
0.0.0.0        15090 ALL                                                                                           Inline Route: /stats/prometheus*
10.108.4.104   15443 ALL                                                                                           Cluster: outbound|15443||istio-ingressgateway.istio-system.svc.cluster.local
10.108.4.104   31400 ALL                                                                                           Cluster: outbound|31400||istio-ingressgateway.istio-system.svc.cluster.local
```

> istioctl proxy-config -n sidecar listener toolbox-97948fc8-ptlct -ojson
> `routeConfigName` - 80

```json
...
        "name": "0.0.0.0_80",
        "address": {
            "socketAddress": {
                "address": "0.0.0.0",
                "portValue": 80
            }
        },
        "filterChains": [
            {
								...
                "filters": [
                    {
                        "name": "envoy.filters.network.http_connection_manager",
                        "typedConfig": {
														...
                            "rds": {
																...
                                "routeConfigName": "80"
...
        "name": "virtualOutbound",
        "address": {
            "socketAddress": {
                "address": "0.0.0.0",
                "portValue": 15001
            }
        },
...
```

> route

```
$ istioctl proxy-config -n sidecar route toolbox-97948fc8-ptlct
NAME                                                          VHOST NAME                                                    DOMAINS                                             MATCH                  VIRTUAL SERVICE
istio-ingressgateway.istio-system.svc.cluster.local:15021     istio-ingressgateway.istio-system.svc.cluster.local:15021     *                                                   /*
80                                                            istio-egressgateway.istio-system.svc.cluster.local:80         istio-egressgateway.istio-system, 10.101.85.142     /*
80                                                            istio-ingressgateway.istio-system.svc.cluster.local:80        istio-ingressgateway.istio-system, 10.108.4.104     /*
80                                                            nginx.sidecar.svc.cluster.local:80                            nginx, nginx.sidecar + 1 more...                    /*
15014                                                         istiod.istio-system.svc.cluster.local:15014                   istiod.istio-system, 10.107.180.168                 /*
kube-dns.kube-system.svc.cluster.local:9153                   kube-dns.kube-system.svc.cluster.local:9153                   *                                                   /*
15010                                                         istiod.istio-system.svc.cluster.local:15010                   istiod.istio-system, 10.107.180.168                 /*
                                                              backend                                                       *                                                   /healthz/ready*
InboundPassthroughClusterIpv4                                 inbound|http|0                                                *                                                   /*
                                                              backend                                                       *                                                   /stats/prometheus*
InboundPassthroughClusterIpv4                                 inbound|http|0                                                *                                                   /*
inbound|80||                                                  inbound|http|80                                               *                                                   /*
inbound|80||                                                  inbound|http|80                                               *                                                   /*
```

> istioctl proxy-config -n sidecar route toolbox-97948fc8-ptlct --name=80 -ojson
> `cluster` - outbound|80||nginx.sidecar.svc.cluster.local

```json
[
    {
        "name": "80",
        "virtualHosts": [
						...
            {
                "name": "nginx.sidecar.svc.cluster.local:80",
                "domains": [
                    "nginx.sidecar.svc.cluster.local",
                    "nginx",
                    "nginx.sidecar.svc",
                    "nginx.sidecar",
                    "10.100.93.113"
                ],
                "routes": [
                    {
                        "name": "default",
                        "match": {
                            "prefix": "/"
                        },
                        "route": {
                            "cluster": "outbound|80||nginx.sidecar.svc.cluster.local",
                            "timeout": "0s",
                            "retryPolicy": {
															...
                            },
                            "maxGrpcTimeout": "0s"
                        },
                        "decorator": {
                            "operation": "nginx.sidecar.svc.cluster.local:80/*"
                        }
                    }
                ],
                "includeRequestAttemptCount": true
            },
          	...
        ],
        "validateClusters": false,
        "maxDirectResponseBodySizeBytes": 1048576,
        "ignorePortInHostMatching": true
    }
]
```

> cluster

```
$ istioctl proxy-config -n sidecar cluster toolbox-97948fc8-ptlct
SERVICE FQDN                                            PORT      SUBSET     DIRECTION     TYPE             DESTINATION RULE
                                                        80        -          inbound       ORIGINAL_DST
BlackHoleCluster                                        -         -          -             STATIC
InboundPassthroughClusterIpv4                           -         -          -             ORIGINAL_DST
PassthroughCluster                                      -         -          -             ORIGINAL_DST
agent                                                   -         -          -             STATIC
istio-egressgateway.istio-system.svc.cluster.local      80        -          outbound      EDS
istio-egressgateway.istio-system.svc.cluster.local      443       -          outbound      EDS
istio-ingressgateway.istio-system.svc.cluster.local     80        -          outbound      EDS
istio-ingressgateway.istio-system.svc.cluster.local     443       -          outbound      EDS
istio-ingressgateway.istio-system.svc.cluster.local     15021     -          outbound      EDS
istio-ingressgateway.istio-system.svc.cluster.local     15443     -          outbound      EDS
istio-ingressgateway.istio-system.svc.cluster.local     31400     -          outbound      EDS
istiod.istio-system.svc.cluster.local                   443       -          outbound      EDS
istiod.istio-system.svc.cluster.local                   15010     -          outbound      EDS
istiod.istio-system.svc.cluster.local                   15012     -          outbound      EDS
istiod.istio-system.svc.cluster.local                   15014     -          outbound      EDS
kube-dns.kube-system.svc.cluster.local                  53        -          outbound      EDS
kube-dns.kube-system.svc.cluster.local                  9153      -          outbound      EDS
kubernetes.default.svc.cluster.local                    443       -          outbound      EDS
nginx.sidecar.svc.cluster.local                         80        -          outbound      EDS
prometheus_stats                                        -         -          -             STATIC
sds-grpc                                                -         -          -             STATIC
xds-grpc                                                -         -          -             STATIC
zipkin                                                  -         -          -             STRICT_DNS
```

> endpoint

```
$ istioctl proxy-config -n sidecar endpoint toolbox-97948fc8-ptlct --cluster="outbound|80||nginx.sidecar.svc.cluster.local"
ENDPOINT          STATUS      OUTLIER CHECK     CLUSTER
10.244.0.6:80     HEALTHY     OK                outbound|80||nginx.sidecar.svc.cluster.local

$ k get po -n sidecar -owide
NAME                               READY   STATUS    RESTARTS   AGE    IP           NODE       NOMINATED NODE   READINESS GATES
nginx-deployment-7fc7f5758-46mzh   2/2     Running   0          115m   10.244.0.6   minikube   <none>           <none>
toolbox-97948fc8-ptlct             2/2     Running   0          90m    10.244.0.7   minikube   <none>           <none>
```

> Envoy Sidecar 会`服务发现`当前 Kubernetes 集群的 `Service` 和 `Endpoint` 信息，并将其组装成 `Envoy` 配置
> 基于 Envoy Sidecar 的数据链路，不再依赖于宿主上的 `iptables/ipvs`，在 Envoy Sidecar 中已经做好了`路由判决`

> 此时的流量要往 Nginx Pod 转发，同样要经过 iptables OUTPUT
> useradd -m --uid `1337`
> 表明这是来自于 Envoy Sidecar 的 OUTPUT 流量，不会再进入到 ISTIO_REDIRECT，而是直接 RETURN，避免死循环

```
$ docker images | grep istio/proxyv2
istio/proxyv2                                                                 1.19.3     ef821b2a218f   2 months ago    242MB

$ docker history ef821b2a218f
IMAGE          CREATED        CREATED BY                                      SIZE      COMMENT
ef821b2a218f   2 months ago   ENTRYPOINT ["/usr/local/bin/pilot-agent"]       0B        buildkit.dockerfile.v0
<missing>      2 months ago   COPY arm64/pilot-agent /usr/local/bin/pilot-…   43.1MB    buildkit.dockerfile.v0
<missing>      2 months ago   ARG TARGETARCH                                  0B        buildkit.dockerfile.v0
<missing>      2 months ago   ENV ISTIO_META_ISTIO_PROXY_SHA=a1ff538a63890…   0B        buildkit.dockerfile.v0
<missing>      2 months ago   COPY arm64/envoy /usr/local/bin/envoy # buil…   112MB     buildkit.dockerfile.v0
<missing>      2 months ago   ARG TARGETARCH                                  0B        buildkit.dockerfile.v0
<missing>      2 months ago   COPY gcp_envoy_bootstrap.json /var/lib/istio…   8.94kB    buildkit.dockerfile.v0
<missing>      2 months ago   COPY envoy_bootstrap.json /var/lib/istio/env…   22kB      buildkit.dockerfile.v0
<missing>      2 months ago   ARG SIDECAR=envoy                               0B        buildkit.dockerfile.v0
<missing>      2 months ago   ARG proxy_version                               0B        buildkit.dockerfile.v0
<missing>      2 months ago   WORKDIR /                                       0B        buildkit.dockerfile.v0
<missing>      5 months ago   RUN /bin/sh -c useradd -m --uid 1337 istio-p…   10.4kB    buildkit.dockerfile.v0
<missing>      5 months ago   RUN /bin/sh -c apt-get update &&   apt-get i…   17.6MB    buildkit.dockerfile.v0
<missing>      5 months ago   ENV DEBIAN_FRONTEND=noninteractive              0B        buildkit.dockerfile.v0
<missing>      6 months ago   /bin/sh -c #(nop)  CMD ["/bin/bash"]            0B
<missing>      6 months ago   /bin/sh -c #(nop) ADD file:262490f82459c1463…   69.2MB
<missing>      6 months ago   /bin/sh -c #(nop)  LABEL org.opencontainers.…   0B
<missing>      6 months ago   /bin/sh -c #(nop)  LABEL org.opencontainers.…   0B
<missing>      6 months ago   /bin/sh -c #(nop)  ARG LAUNCHPAD_BUILD_ARCH     0B
<missing>      6 months ago   /bin/sh -c #(nop)  ARG RELEASE                  0B
```

> 入站流量，先通过 PREROUTING

```
$ docker ps | grep nginx
0f7fe83cc80e   ef821b2a218f                                                    "/usr/local/bin/pilo…"   2 hours ago   Up 2 hours             k8s_istio-proxy_nginx-deployment-7fc7f5758-46mzh_sidecar_1d4c7d67-b162-4138-a781-7f8a472c9b34_0
5c801e6a40f1   nginx                                                           "/docker-entrypoint.…"   2 hours ago   Up 2 hours             k8s_nginx_nginx-deployment-7fc7f5758-46mzh_sidecar_1d4c7d67-b162-4138-a781-7f8a472c9b34_0
7b46f9b6cd22   registry.cn-hangzhou.aliyuncs.com/google_containers/pause:3.9   "/pause"                 2 hours ago   Up 2 hours             k8s_POD_nginx-deployment-7fc7f5758-46mzh_sidecar_1d4c7d67-b162-4138-a781-7f8a472c9b34_0

$ docker inspect 0f7fe83cc80e | grep Pid
            "Pid": 47974,
            "PidMode": "",
            "PidsLimit": null,

$ sudo nsenter -t 47974 -n iptables-legacy-save -t nat
# Generated by iptables-save v1.8.7 on Mon Jan  1 14:10:21 2022
*nat
:PREROUTING ACCEPT [4423:265380]
:INPUT ACCEPT [4425:265500]
:OUTPUT ACCEPT [263:23779]
:POSTROUTING ACCEPT [263:23779]
:ISTIO_INBOUND - [0:0]
:ISTIO_IN_REDIRECT - [0:0]
:ISTIO_OUTPUT - [0:0]
:ISTIO_REDIRECT - [0:0]
-A PREROUTING -p tcp -j ISTIO_INBOUND
-A OUTPUT -p tcp -j ISTIO_OUTPUT
-A ISTIO_INBOUND -p tcp -m tcp --dport 15008 -j RETURN
-A ISTIO_INBOUND -p tcp -m tcp --dport 15090 -j RETURN
-A ISTIO_INBOUND -p tcp -m tcp --dport 15021 -j RETURN
-A ISTIO_INBOUND -p tcp -m tcp --dport 15020 -j RETURN
-A ISTIO_INBOUND -p tcp -j ISTIO_IN_REDIRECT
-A ISTIO_IN_REDIRECT -p tcp -j REDIRECT --to-ports 15006
-A ISTIO_OUTPUT -s 127.0.0.6/32 -o lo -j RETURN
-A ISTIO_OUTPUT ! -d 127.0.0.1/32 -o lo -p tcp -m tcp ! --dport 15008 -m owner --uid-owner 1337 -j ISTIO_IN_REDIRECT
-A ISTIO_OUTPUT -o lo -m owner ! --uid-owner 1337 -j RETURN
-A ISTIO_OUTPUT -m owner --uid-owner 1337 -j RETURN
-A ISTIO_OUTPUT ! -d 127.0.0.1/32 -o lo -p tcp -m tcp ! --dport 15008 -m owner --gid-owner 1337 -j ISTIO_IN_REDIRECT
-A ISTIO_OUTPUT -o lo -m owner ! --gid-owner 1337 -j RETURN
-A ISTIO_OUTPUT -m owner --gid-owner 1337 -j RETURN
-A ISTIO_OUTPUT -d 127.0.0.1/32 -j RETURN
-A ISTIO_OUTPUT -j ISTIO_REDIRECT
-A ISTIO_REDIRECT -p tcp -j REDIRECT --to-ports 15001
COMMIT
# Completed on Mon Jan  1 14:10:21 2022
```

> 效果：非特殊端口的 TCP 流量，转发到 15006 端口

1. -A PREROUTING -p tcp -j ISTIO_INBOUND
   - 任何 TCP 流量都会跳转到 ISTIO_INBOUND
2. ISTIO_INBOUND 针对特定端口（15008、15090、15021、15020）不处理
3. 80 端口会跳转到 ISTIO_IN_REDIRECT，进而转发到 15006 端口

> listener

```
$ istioctl proxy-config -n sidecar listener nginx-deployment-7fc7f5758-46mzh --port=15006
ADDRESSES PORT  MATCH                                                                                         DESTINATION
0.0.0.0   15006 Addr: *:15006                                                                                 Non-HTTP/Non-TCP
0.0.0.0   15006 Trans: tls; App: istio-http/1.0,istio-http/1.1,istio-h2; Addr: 0.0.0.0/0                      InboundPassthroughClusterIpv4
0.0.0.0   15006 Trans: raw_buffer; App: http/1.1,h2c; Addr: 0.0.0.0/0                                         InboundPassthroughClusterIpv4
0.0.0.0   15006 Trans: tls; App: TCP TLS; Addr: 0.0.0.0/0                                                     InboundPassthroughClusterIpv4
0.0.0.0   15006 Trans: raw_buffer; Addr: 0.0.0.0/0                                                            InboundPassthroughClusterIpv4
0.0.0.0   15006 Trans: tls; Addr: 0.0.0.0/0                                                                   InboundPassthroughClusterIpv4
0.0.0.0   15006 Trans: tls; App: istio,istio-peer-exchange,istio-http/1.0,istio-http/1.1,istio-h2; Addr: *:80 Cluster: inbound|80||
0.0.0.0   15006 Trans: raw_buffer; Addr: *:80                                                                 Cluster: inbound|80||
```

> istioctl proxy-config -n sidecar listener nginx-deployment-7fc7f5758-46mzh -ojson
> route - `inbound|80||`

```json
...
                        "typedConfig": {
                            "@type": "type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager",
                            "statPrefix": "inbound_0.0.0.0_80",
                            "routeConfig": {
                                "name": "inbound|80||",
                                "virtualHosts": [
                                    {
                                        "name": "inbound|http|80",
                                        "domains": [
                                            "*"
                                        ],
                                        "routes": [
                                            {
                                                "name": "default",
                                                "match": {
                                                    "prefix": "/"
                                                },
                                                "route": {
                                                    "cluster": "inbound|80||",
                                                    "timeout": "0s",
                                                    "maxStreamDuration": {
                                                        "maxStreamDuration": "0s",
                                                        "grpcTimeoutHeaderMax": "0s"
                                                    }
                                                },
                                                "decorator": {
                                                    "operation": "nginx.sidecar.svc.cluster.local:80/*"
                                                }
                                            }
                                        ]
                                    }
                                ],
                                "validateClusters": false
                            },
...
        "name": "virtualInbound",
        "address": {
            "socketAddress": {
                "address": "0.0.0.0",
                "portValue": 15006
            }
        },
...
```

> istioctl proxy-config -n sidecar route nginx-deployment-7fc7f5758-46mzh --name=80 -ojson
> cluster - `outbound|80||nginx.sidecar.svc.cluster.local`

```json
[
    {
        "name": "80",
        "virtualHosts": [
          	...
            {
                "name": "nginx.sidecar.svc.cluster.local:80",
                "domains": [
                    "nginx.sidecar.svc.cluster.local",
                    "nginx",
                    "nginx.sidecar.svc",
                    "nginx.sidecar",
                    "10.100.93.113"
                ],
                "routes": [
                    {
                        "name": "default",
                        "match": {
                            "prefix": "/"
                        },
                        "route": {
                            "cluster": "outbound|80||nginx.sidecar.svc.cluster.local",
                            "timeout": "0s",
                            "retryPolicy": {
															...
                            },
                            "maxGrpcTimeout": "0s"
                        },
                        "decorator": {
                            "operation": "nginx.sidecar.svc.cluster.local:80/*"
                        }
                    }
                ],
                "includeRequestAttemptCount": true
            },
						...
        ],
        "validateClusters": false,
        "maxDirectResponseBodySizeBytes": 1048576,
        "ignorePortInHostMatching": true
    }
]
```

> istioctl proxy-config -n sidecar endpoint  nginx-deployment-7fc7f5758-46mzh --cluster="outbound|80||nginx.sidecar.svc.cluster.local" -ojson

```json
[
    {
        "name": "outbound|80||nginx.sidecar.svc.cluster.local",
        "addedViaApi": true,
        "hostStatuses": [
            {
                "address": {
                    "socketAddress": {
                        "address": "10.244.0.6",
                        "portValue": 80
                    }
                },
                "stats": [
                    {
                        "name": "cx_connect_fail"
                    },
                    {
                        "name": "cx_total"
                    },
                    {
                        "name": "rq_error"
                    },
                    {
                        "name": "rq_success"
                    },
                    {
                        "name": "rq_timeout"
                    },
                    {
                        "name": "rq_total"
                    },
                    {
                        "type": "GAUGE",
                        "name": "cx_active"
                    },
                    {
                        "type": "GAUGE",
                        "name": "rq_active"
                    }
                ],
                "healthStatus": {
                    "edsHealthStatus": "HEALTHY"
                },
                "weight": 1,
                "locality": {}
            }
        ],
        "circuitBreakers": {
            "thresholds": [
                {
                    "maxConnections": 4294967295,
                    "maxPendingRequests": 4294967295,
                    "maxRequests": 4294967295,
                    "maxRetries": 4294967295
                },
                {
                    "priority": "HIGH",
                    "maxConnections": 1024,
                    "maxPendingRequests": 1024,
                    "maxRequests": 1024,
                    "maxRetries": 3
                }
            ]
        },
        "observabilityName": "outbound|80||nginx.sidecar.svc.cluster.local",
        "edsServiceName": "outbound|80||nginx.sidecar.svc.cluster.local"
    }
]
```

> 此时 Envoy Sidecar 准备执行 OUTPUT，与客户端类似，能标识为 Envoy Sidecar 的流量，最终到达实际的 Nginx 容器

> 获取 Envoy Config（非常大），Istio 默认会服务发现`所有`的 Service 和 Endpoint，对于大集群，存在`性能隐患`

```
$  k exec -it -n sidecar toolbox-97948fc8-ptlct -- bash
[root@toolbox-97948fc8-ptlct /]# curl 127.1:15000/config_dump
...

[root@toolbox-97948fc8-ptlct /]# curl -sI 127.1:15000/config_dump
HTTP/1.1 200 OK
content-type: application/json
cache-control: no-cache, max-age=0
x-content-type-options: nosniff
date: Mon, 01 Jan 2022 15:08:54 GMT
server: envoy
transfer-encoding: chunked
```

> Envoy 只监听了 `15001` 和 `15006`，其内部配置的其余端口，并`没有实际绑定 Socket`

# 主要能力

## 流量管理

![image-20240102222731576](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20240102222731576.png)

## 服务通信

1. 客户端不知道服务端不同版本之间的差异
   - 客户端使用服务端的主机名或者 IP 继续访问服务端
   - Envoy Sidecar `拦截并转发`客户端与服务端之间的`所有`请求和相应
2. Istio 为同一服务版本的多个实例提供`流量负载均衡`
3. Istio `不提供 DNS`，应用程序尝试使 Kubernetes 的 DNS 服务来解析 FQDN

## Ingress / Egress

> Istio 假设进入和离开服务网格的`所有流量`都会通过 Envoy 代理进行传输

![image-20240102224106525](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20240102224106525.png)

1. 将 Envoy 部署在服务之前，可以进行 A/B 测试、金丝雀部署
2. 使用 Envoy 将流量路由到外部 Web 服务，并为这些服务添加超时控制、重试、断路器等功能，并获得各种指标

> Ingress 本身并非成熟模型，无法完成`高级流量管理`，Istio 通过一套模型`统一`：入站流量、东西向流量、出站流量

## 服务发现 / 负载均衡

1. Istio 负载均衡服务网格中`实例`之间的通信
2. Istio 假设存在`服务注册表`，用来跟踪服务的 `Pod/VM`
   - 假设服务的新实例`自动注册`到服务注册表，并且不健康的实例将会被`自动删除`
3. Pilot 使用`服务注册表`的信息，并提供与平台无关的`服务发现`接口
   - 服务网格中的 `Envoy` 实例执行`服务发现`，并相应地更新其`负载均衡池`
4. 服务网格中的服务使用 `FQDN` 来访问其它服务
   - 服务的`所有 HTTP 流量`都会通过 `Envoy` 自动`重新路由`
   - Envoy 在`负载均衡池`中的实例之间分发流量
5. Envoy 支持复杂的负载均衡算法，但 Istio 仅支持：`轮询`、`随机`、`带权重的最少请求`
6. Envoy 还会`定期检查`负载均衡池中每个实例的运行状况
   - Envoy 遵循`熔断器`风格模式，根据健康检查 API 调用的`失败率`将实例分为不健康和健康
     - 当实例的健康检查`失败次数`超过阈值，将被从负载均衡池中`弹出`
     - 当实例的健康检查`成功次数`超过阈值，将被`添加`到负载均衡池
   - 如果实例响应 `HTTP 503`，将`立即弹出`

## 故障处理

1. `超时`处理
2. 基于超时预算的`重试`机制
3. 基于并发连接和请求的`流量控制`
4. 对负载均衡器成员的`健康检查`
5. 细粒度的`熔断`机制

## 配置微调

1. Istio 可以为每个服务设置`全局默认值`
2. 客户端可以通过特殊的 HTTP 头`覆盖`超时和重试的默认值
   - x-envoy-upstream-rq-timeout-ms
   - x-envoy-max-retries

## 故障注入

1. Istio 允许在`网络层`按`协议`注入错误
2. 注入的错误可以`基于特定的条件`，也可以设置`出现错误的比例`
   - `Delay` - 提高网络延迟
   - `Aborts` - 直接返回特定的错误码

# 规则配置

| Key               | Value                                                        |
| ----------------- | ------------------------------------------------------------ |
| `VirtualService`  | 在 Istio 中定义`路由规则`，控制如何路由到服务上              |
| `DestinationRule` | VirtualService 路由生效后，配置应用与请求的策略集            |
| `ServiceEntry`    | 在 Istio `之外`启用对服务的请求                              |
| `Gateway`         | 为 HTTP/TCP 流量配置负载均衡器<br />常在服务网格边缘，启用应用程序的入口流量 |

# Ingress

> 创建 namespace

```
$ k create ns simple
namespace/simple created
```

> Deployment + Service

```yaml simple.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: simple
spec:
  replicas: 1
  selector:
    matchLabels:
      app: simple
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "80"
      labels:
        app: simple
    spec:
      containers:
        - name: simple
          imagePullPolicy: Always
          image: nginx:1.25.3
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: simple
spec:
  ports:
    - name: http
      port: 80
      protocol: TCP
      targetPort: 80
  selector:
    app: simple
```

```
$ k apply -f simple.yaml -n simple
deployment.apps/simple created
service/simple created

$ k get po -n simple
NAME                      READY   STATUS    RESTARTS   AGE
simple-665cbb55bf-rq6ln   1/1     Running   0          44s

$ k get svc -n simple
NAME     TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
simple   ClusterIP   10.100.93.113   <none>        80/TCP    57s
```

> 通过 Gateway 将服务发布到集群外

```yaml istio-specs.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: simple
spec:
  gateways:
    - simple
  hosts:
    - simple.zhongmingmao.io
  http:
    - match:
        - port: 80
      route:
        - destination:
            host: simple.simple.svc.cluster.local
            port:
              number: 80
---
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: simple
spec:
  selector:
    istio: ingressgateway
  servers:
    - hosts:
        - simple.zhongmingmao.io
      port:
        name: http-simple
        number: 80
        protocol: HTTP
```

1. `VirtualService` - 对应 `Envoy Route`
   - host 为 simple.zhongmingmao.io 且端口为 80 的请求，将被转发到 simple.simple.svc.cluster.local:80
   - gateways - simple，与 Gateway 产生关联
2. `Gateway` - 对应 `Envoy Listener`
   - `istio: ingressgateway` 实际选中的是 istio-ingressgateway-779c475c44-j4tds
   - 语义：往 istio-ingressgateway 的 Pod 插入一些规则
     - 在 ingressgateway 上监听 http://simple.zhongmingmao.io:80

> istio-ingressgateway-779c475c44-j4tds 带有 `istio=ingressgateway`，本质也是一个 Envoy

```
$ k get po -n istio-system --show-labels
NAME                                    READY   STATUS    RESTARTS   AGE     LABELS
istio-egressgateway-84776fd7f6-dfn6m    1/1     Running   0          6d13h   app=istio-egressgateway,chart=gateways,heritage=Tiller,install.operator.istio.io/owning-resource=unknown,istio.io/rev=default,istio=egressgateway,operator.istio.io/component=EgressGateways,pod-template-hash=84776fd7f6,release=istio,service.istio.io/canonical-name=istio-egressgateway,service.istio.io/canonical-revision=latest,sidecar.istio.io/inject=false
istio-ingressgateway-779c475c44-j4tds   1/1     Running   0          6d13h   app=istio-ingressgateway,chart=gateways,heritage=Tiller,install.operator.istio.io/owning-resource=unknown,istio.io/rev=default,istio=ingressgateway,operator.istio.io/component=IngressGateways,pod-template-hash=779c475c44,release=istio,service.istio.io/canonical-name=istio-ingressgateway,service.istio.io/canonical-revision=latest,sidecar.istio.io/inject=false
istiod-566dc66cff-d9chq                 1/1     Running   0          6d13h   app=istiod,install.operator.istio.io/owning-resource=unknown,istio.io/rev=default,istio=pilot,operator.istio.io/component=Pilot,pod-template-hash=566dc66cff,sidecar.istio.io/inject=false
```

> 应用 VirtualService 和 Gateway

```
$ k apply -f istio-specs.yaml -n simple
virtualservice.networking.istio.io/simple created
gateway.networking.istio.io/simple created

$ k get svc -n istio-system
NAME                   TYPE           CLUSTER-IP       EXTERNAL-IP   PORT(S)                                                                      AGE
istio-egressgateway    ClusterIP      10.101.85.142    <none>        80/TCP,443/TCP                                                               6d13h
istio-ingressgateway   LoadBalancer   10.108.4.104     <pending>     15021:32339/TCP,80:30634/TCP,443:30831/TCP,31400:32121/TCP,15443:31001/TCP   6d13h
istiod                 ClusterIP      10.107.180.168   <none>        15010/TCP,15012/TCP,443/TCP,15014/TCP                                        6d13h

$ k describe svc -n istio-system istio-ingressgateway
...
Endpoints:                10.244.0.4:15443
...

$ k get po -n istio-system -owide
NAME                                    READY   STATUS    RESTARTS   AGE     IP           NODE       NOMINATED NODE   READINESS GATES
istio-egressgateway-84776fd7f6-dfn6m    1/1     Running   0          6d13h   10.244.0.5   minikube   <none>           <none>
istio-ingressgateway-779c475c44-j4tds   1/1     Running   0          6d13h   10.244.0.4   minikube   <none>           <none>
istiod-566dc66cff-d9chq                 1/1     Running   0          6d13h   10.244.0.3   minikube   <none>           <none>

$ curl -sI 10.108.4.104
HTTP/1.1 404 Not Found
date: Tue, 02 Jan 2022 16:20:30 GMT
server: istio-envoy
transfer-encoding: chunked

$ curl -sI -H 'host: simple.zhongmingmao.io' 10.108.4.104
HTTP/1.1 200 OK
server: istio-envoy
date: Tue, 02 Jan 2022 16:20:54 GMT
content-type: text/html
content-length: 615
last-modified: Tue, 24 Oct 2023 13:46:47 GMT
etag: "6537cac7-267"
accept-ranges: bytes
x-envoy-upstream-service-time: 2
```

![image-20240103000723604](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20240103000723604.png)

> 细化七层路由规则

```yaml istio-specs.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: simple
spec:
  gateways:
    - simple
  hosts:
    - simple.zhongmingmao.io
  http:
    - match:
        - uri:
            prefix: "/nginx"
      rewrite:
        uri: "/"
      route:
        - destination:
            host: simple.simple.svc.cluster.local
            port:
              number: 80
---
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: simple
spec:
  selector:
    istio: ingressgateway
  servers:
    - hosts:
        - simple.zhongmingmao.io
      port:
        name: http-simple
        number: 80
        protocol: HTTP
```

```
$ k apply -f istio-specs.yaml -n simple
virtualservice.networking.istio.io/simple configured
gateway.networking.istio.io/simple unchanged

$ curl -sI -H 'host: simple.zhongmingmao.io' 10.108.4.104
HTTP/1.1 404 Not Found
date: Tue, 02 Jan 2022 16:29:57 GMT
server: istio-envoy
transfer-encoding: chunked

$ curl -sI -H 'host: simple.zhongmingmao.io' 10.108.4.104/nginx
HTTP/1.1 200 OK
server: istio-envoy
date: Tue, 02 Jan 2022 16:30:18 GMT
content-type: text/html
content-length: 615
last-modified: Tue, 24 Oct 2023 13:46:47 GMT
etag: "6537cac7-267"
accept-ranges: bytes
x-envoy-upstream-service-time: 0
```

# HTTPS

> 创建 namespace

```
$ k create ns securesvc
namespace/securesvc created
```

> Deployment + Service

```yaml httpserver.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpserver
spec:
  replicas: 1
  selector:
    matchLabels:
      app: httpserver
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "80"
      labels:
        app: httpserver
    spec:
      containers:
        - name: httpserver
          imagePullPolicy: Always
          image: nginx:1.25.3
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: httpserver
spec:
  ports:
    - name: http
      port: 80
      protocol: TCP
      targetPort: 80
  selector:
    app: httpserver
```

```
$ k create -f httpserver.yaml -n securesvc
deployment.apps/httpserver created
service/httpserver created

$ k get po -n securesvc
NAME                          READY   STATUS    RESTARTS   AGE
httpserver-84bf965f9c-rq6ln   1/1     Running   0          36s

$ k get svc -n securesvc
NAME         TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
httpserver   ClusterIP   10.100.93.113   <none>        80/TCP    78s

$ k exec -it -n securesvc httpserver-84bf965f9c-rq6ln -- curl -sI httpserver.securesvc.svc
HTTP/1.1 200 OK
Server: nginx/1.25.3
Date: Tue, 02 Jan 2022 17:12:29 GMT
Content-Type: text/html
Content-Length: 615
Last-Modified: Tue, 24 Oct 2021 13:46:47 GMT
Connection: keep-alive
ETag: "6537cac7-267"
Accept-Ranges: bytes
```

> 生成证书，需要放到 `istio-system` 下，Istio 监听 443 的时候需要 TLS

```
$ openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -subj '/O=zhongmingmao Inc./CN=*.zhongmingmao.io' -keyout zhongmingmao.io.key -out zhongmingmao.io.crt

$ k create -n istio-system secret tls zhongmingmao-credential --key=zhongmingmao.io.key --cert=zhongmingmao.io.crt
secret/zhongmingmao-credential created
```

> VirtualService + Gateway

```yaml istio-specs.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: httpsserver
spec:
  gateways:
    - httpsserver
  hosts:
    - httpsserver.zhongmingmao.io
  http:
    - match:
        - port: 443
      route:
        - destination:
            host: httpserver.securesvc.svc
            port:
              number: 80
---
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: httpsserver
spec:
  selector:
    istio: ingressgateway
  servers:
    - hosts:
        - httpsserver.zhongmingmao.io
      port:
        name: https-default
        number: 443
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: zhongmingmao-credential
```

```
$ k apply -f istio-specs.yaml -n securesvc
virtualservice.networking.istio.io/httpsserver created
gateway.networking.istio.io/httpsserver created

$ k get svc -n istio-system
NAME                   TYPE           CLUSTER-IP       EXTERNAL-IP   PORT(S)                                                                      AGE
istio-egressgateway    ClusterIP      10.101.85.142    <none>        80/TCP,443/TCP                                                               6d14h
istio-ingressgateway   LoadBalancer   10.108.4.104     <pending>     15021:32339/TCP,80:30634/TCP,443:30831/TCP,31400:32121/TCP,15443:31001/TCP   6d14h
istiod                 ClusterIP      10.107.180.168   <none>        15010/TCP,15012/TCP,443/TCP,15014/TCP                                        6d14h
```

> 对于 HTTPS，一个 443 端口，可能支持了很多域名，需要绑定很多证书
> 请求借助 Server Name Indication 机制（--resolve，新增 DNS 缓存，相当于修改 /etc/hosts）

```
$ curl --resolve httpsserver.zhongmingmao.io:443:10.108.4.104 https://httpsserver.zhongmingmao.io -v -k
* Added httpsserver.zhongmingmao.io:443:10.108.4.104 to DNS cache
* Hostname httpsserver.zhongmingmao.io was found in DNS cache
*   Trying 10.108.4.104:443...
* Connected to httpsserver.zhongmingmao.io (10.108.4.104) port 443 (#0)
* ALPN, offering h2
* ALPN, offering http/1.1
* TLSv1.0 (OUT), TLS header, Certificate Status (22):
* TLSv1.3 (OUT), TLS handshake, Client hello (1):
* TLSv1.2 (IN), TLS header, Certificate Status (22):
* TLSv1.3 (IN), TLS handshake, Server hello (2):
* TLSv1.2 (IN), TLS header, Finished (20):
* TLSv1.2 (IN), TLS header, Supplemental data (23):
* TLSv1.3 (IN), TLS handshake, Encrypted Extensions (8):
* TLSv1.3 (IN), TLS handshake, Certificate (11):
* TLSv1.3 (IN), TLS handshake, CERT verify (15):
* TLSv1.3 (IN), TLS handshake, Finished (20):
* TLSv1.2 (OUT), TLS header, Finished (20):
* TLSv1.3 (OUT), TLS change cipher, Change cipher spec (1):
* TLSv1.2 (OUT), TLS header, Supplemental data (23):
* TLSv1.3 (OUT), TLS handshake, Finished (20):
* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384
* ALPN, server accepted to use h2
* Server certificate:
*  subject: O=zhongmingmao Inc.; CN=*.zhongmingmao.io
*  start date: Jan  2 16:43:50 2022 GMT
*  expire date: Jan  1 16:43:50 2025 GMT
*  issuer: O=zhongmingmao Inc.; CN=*.zhongmingmao.io
*  SSL certificate verify result: self-signed certificate (18), continuing anyway.
* Using HTTP2, server supports multiplexing
* Connection state changed (HTTP/2 confirmed)
* Copying HTTP/2 data in stream buffer to connection buffer after upgrade: len=0
* TLSv1.2 (OUT), TLS header, Supplemental data (23):
* TLSv1.2 (OUT), TLS header, Supplemental data (23):
* TLSv1.2 (OUT), TLS header, Supplemental data (23):
* Using Stream ID: 1 (easy handle 0xaaab0761aca0)
* TLSv1.2 (OUT), TLS header, Supplemental data (23):
> GET / HTTP/2
> Host: httpsserver.zhongmingmao.io
> user-agent: curl/7.81.0
> accept: */*
>
* TLSv1.2 (IN), TLS header, Supplemental data (23):
* TLSv1.3 (IN), TLS handshake, Newsession Ticket (4):
* TLSv1.3 (IN), TLS handshake, Newsession Ticket (4):
* old SSL session ID is stale, removing
* TLSv1.2 (IN), TLS header, Supplemental data (23):
* Connection state changed (MAX_CONCURRENT_STREAMS == 2147483647)!
* TLSv1.2 (OUT), TLS header, Supplemental data (23):
* TLSv1.2 (IN), TLS header, Supplemental data (23):
* TLSv1.2 (IN), TLS header, Supplemental data (23):
< HTTP/2 503
< content-length: 95
< content-type: text/plain
< date: Tue, 02 Jan 2022 16:50:41 GMT
< server: istio-envoy
```

# Canary

> 创建 namespace

```
$ k create ns canary
namespace/canary created

$ k label ns canary istio-injection=enabled
namespace/canary labeled
```

> Canary V1

```yaml canary-v1.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: canary-v1
spec:
  replicas: 1
  selector:
    matchLabels:
      app: canary
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "80"
      labels:
        app: canary
        version: v1
    spec:
      containers:
        - name: canary
          imagePullPolicy: Always
          image: nginx:1.25.3
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: canary
spec:
  ports:
    - name: http
      port: 80
      protocol: TCP
      targetPort: 80
  selector:
    app: canary
```

```
$ k apply -f canary-v1.yaml -n canary
deployment.apps/canary-v1 created
service/canary created

$ k get svc -n canary
NAME     TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
canary   ClusterIP   10.100.93.113   <none>        80/TCP    2m9s

$ k get ep -n canary
NAME     ENDPOINTS       AGE
canary   10.244.0.6:80   86s

$ k get po -n canary -owide
NAME                         READY   STATUS    RESTARTS   AGE    IP           NODE       NOMINATED NODE   READINESS GATES
canary-v1-69ddb8864b-rq6ln   2/2     Running   0          105s   10.244.0.6   minikube   <none>           <none>
```

> Client

```yaml toolbox.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
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
          image: centos:7.9.2009
          command:
            - tail
            - -f
            - /dev/null
```

```
$ k apply -f toolbox.yaml -n canary
deployment.apps/toolbox created

$ k get po -n canary
NAME                         READY   STATUS    RESTARTS   AGE
canary-v1-69ddb8864b-rq6ln   2/2     Running   0          3m55s
toolbox-97948fc8-ptlct       2/2     Running   0          76s

$ k exec -n canary toolbox-97948fc8-ptlct -- curl -sI canary
HTTP/1.1 200 OK
server: envoy
date: Wed, 03 Jan 2022 14:59:56 GMT
content-type: text/html
content-length: 615
last-modified: Tue, 24 Oct 2021 13:46:47 GMT
etag: "6537cac7-267"
accept-ranges: bytes
x-envoy-upstream-service-time: 4

$ k logs -n canary --tail=1 canary-v1-69ddb8864b-rq6ln
127.0.0.6 - - [03/Jan/2022:14:59:56 +0000] "HEAD / HTTP/1.1" 200 0 "-" "curl/7.29.0" "-"
```

> Canary V2

```yaml canary-v2.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: canary-v2
spec:
  replicas: 1
  selector:
    matchLabels:
      app: canary
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "80"
      labels:
        app: canary
        version: v2
    spec:
      containers:
        - name: canary
          imagePullPolicy: Always
          image: nginx:1.25.3
          ports:
            - containerPort: 80
```

```
$ k apply -f canary-v2.yaml -n canary
deployment.apps/canary-v2 created

$ k get svc -n canary -owide
NAME     TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE   SELECTOR
canary   ClusterIP   10.100.93.113   <none>        80/TCP    12m   app=canary

$ k get po -n canary -owide -l app=canary --show-labels
NAME                         READY   STATUS    RESTARTS   AGE    IP           NODE       NOMINATED NODE   READINESS GATES   LABELS
canary-v1-69ddb8864b-rq6ln   2/2     Running   0          11m    10.244.0.6   minikube   <none>           <none>            app=canary,pod-template-hash=69ddb8864b,security.istio.io/tlsMode=istio,service.istio.io/canonical-name=canary,service.istio.io/canonical-revision=v1,version=v1
canary-v2-69b48c89b7-h87vk   2/2     Running   0          3m2s   10.244.0.8   minikube   <none>           <none>            app=canary,pod-template-hash=69b48c89b7,security.istio.io/tlsMode=istio,service.istio.io/canonical-name=canary,service.istio.io/canonical-revision=v2,version=v2

$ k get ep -n canary
NAME     ENDPOINTS                     AGE
canary   10.244.0.6:80,10.244.0.8:80   9m17s
```

> VirtualService + DestinationRule

```yaml istio-specs.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: canary
spec:
  hosts:
    - canary
  http:
    - match:
        - headers:
            user:
              exact: zhongmingmao
      route: # 如果 curl -H 'user: zhongmingmao' 则到 v2 Destination
        - destination:
            host: canary
            subset: v2
    - route: # 默认 Destination
      - destination:
          host: canary
          subset: v1
---
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: canary
spec:
  host: canary
  trafficPolicy:
    loadBalancer:
      simple: RANDOM # 默认的负载均衡策略
  subsets: # 流量切分
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
      trafficPolicy: # 覆盖默认的负载均衡策略
        loadBalancer:
          simple: ROUND_ROBIN
```

> 访问 Canary V2

```
$ k apply -f istio-specs.yaml -n canary
virtualservice.networking.istio.io/canary created
destinationrule.networking.istio.io/canary created

$ k exec -n canary toolbox-97948fc8-ptlct -- curl -sI -H 'user: zhongmingmao' canary
HTTP/1.1 200 OK
server: envoy
date: Wed, 03 Jan 2022 15:16:52 GMT
content-type: text/html
content-length: 615
last-modified: Tue, 24 Oct 2021 13:46:47 GMT
etag: "6537cac7-267"
accept-ranges: bytes
x-envoy-upstream-service-time: 4

$ k logs -n canary --tail=1 canary-v1-69ddb8864b-rq6ln
127.0.0.6 - - [03/Jan/2022:14:59:56 +0000] "HEAD / HTTP/1.1" 200 0 "-" "curl/7.29.0" "-"

$ k logs -n canary --tail=1 canary-v2-69b48c89b7-h87vk
127.0.0.6 - - [03/Jan/2022:15:16:52 +0000] "HEAD / HTTP/1.1" 200 0 "-" "curl/7.29.0" "-"
```

> 访问 Canary V1

```
$ k exec -n canary toolbox-97948fc8-ptlct -- curl -sI canary
HTTP/1.1 200 OK
server: envoy
date: Wed, 03 Jan 2022 15:18:11 GMT
content-type: text/html
content-length: 615
last-modified: Tue, 24 Oct 2021 13:46:47 GMT
etag: "6537cac7-267"
accept-ranges: bytes
x-envoy-upstream-service-time: 25

$ k logs -n canary --tail=1 canary-v1-69ddb8864b-rq6ln
127.0.0.6 - - [03/Jan/2022:15:18:11 +0000] "HEAD / HTTP/1.1" 200 0 "-" "curl/7.29.0" "-"

$ k logs -n canary --tail=1 canary-v2-69b48c89b7-h87vk
127.0.0.6 - - [03/Jan/2022:15:16:52 +0000] "HEAD / HTTP/1.1" 200 0 "-" "curl/7.29.0" "-"
```

# 故障注入

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: canary
spec:
  hosts:
    - canary
  http:
    - match:
        - headers:
            user:
              exact: zhongmingmao
      route: # 如果 curl -H 'user: zhongmingmao' 则到 v2 Destination
        - destination:
            host: canary
            subset: v2
      retries: # upstream 返回 500 时重试
        attempts: 3
        perTryTimeout: 2s
    - route: # 默认 Destination
      - destination:
          host: canary
          subset: v1
      fault:
        abort:
          httpStatus: 500
          percentage:
            value: 80 # 80% 的概率返回 500
---
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: canary
spec:
  host: canary
  trafficPolicy:
    loadBalancer:
      simple: RANDOM # 默认的负载均衡策略
  subsets: # 流量切分
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
      trafficPolicy: # 覆盖默认的负载均衡策略
        loadBalancer:
          simple: ROUND_ROBIN
```

> 5.755 s ≈ 6 s

```
$ k apply -f istio-specs.yaml -n canary
virtualservice.networking.istio.io/canary configured
destinationrule.networking.istio.io/canary unchanged

$ time k exec -n canary toolbox-97948fc8-ptlct -- curl -sI -H 'user: zhongmingmao' canary
HTTP/1.1 200 OK
server: envoy
date: Wed, 03 Jan 2022 15:47:07 GMT
content-type: text/html
content-length: 615
last-modified: Tue, 24 Oct 2021 13:46:47 GMT
etag: "6537cac7-267"
accept-ranges: bytes
x-envoy-upstream-service-time: 3

kubectl exec -n canary toolbox-97948fc8-ptlct -- curl -sI -H  canary  0.14s user 0.05s system 3% cpu 5.755 total
```

# 网络栈

> iptables/ipvs 基于 netfilter 框架（内核协议栈），优化空间很小

![image-20240105214246226](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20240105214246226.png)

> Cilium 基于 eBPF

![image-20240105214535638](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20240105214535638.png)

1. 新版 Linux Kernel 提供了很多的 Hook，允许插入自定义程序（并非规则）
   - 对 Linux Kernel 非常熟悉，编写 C 代码，编译成符合 eBPF 要求的机器码后
   - 最后通过 eBPF 的用户态程序加载到 Linux Kernel
2. Cilium 充分利用了 Hook
   - 建立 TCP 连接依然会走内核协议栈，依然有开销
   - 但`数据拷贝`，可以直接在`用户态`进行 Socket 对拷，不需要再经过内核协议栈
